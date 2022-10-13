import { Transport } from "./types"
import { Writer, Reader } from "protobufjs/minimal"
import { parseMessageIdentifier, parseProtocolMessage } from "./protocol/helpers"
import { RpcMessageTypes, StreamMessage } from "./protocol"

export type SubsetMessage = Pick<StreamMessage, "closed" | "ack">
export type SendableMessage = {
  messageIdentifier: number
}
type ReaderCallback = (reader: Reader, messageType: number, messageNumber: number, message: any) => void
type OneTimeListener = { reader: Reader; messageType: number; messageNumber: number; message: any }

export type MessageDispatcher = {
  transport: Transport
  sendStreamMessage(data: StreamMessage): Promise<SubsetMessage>
  addListener(messageNumber: number, handler: ReaderCallback): void
  addOneTimeListener(messageNumber: number): Promise<OneTimeListener>
  removeListener(messageNumber: number): void
  setGlobalHandler(globalHandler: GlobalHandlerFunction): void
}

export type GlobalHandlerFunction = (messageType: number, parsedMessage: any, messageNumber: number) => void

export function messageDispatcher(transport: Transport): MessageDispatcher {
  // message_number -> future
  const oneTimeCallbacks = new Map<number, [(value: OneTimeListener) => void, (err: Error) => void]>()
  const listeners = new Map<number, ReaderCallback>()

  let globalHandlerFunction: GlobalHandlerFunction | undefined

  transport.on("message", (message) => {
    try {
      const reader = Reader.create(message)
      const parsedMessage = parseProtocolMessage(reader)
      if (parsedMessage) {
        const [messageType, message, messageNumber] = parsedMessage

        if (globalHandlerFunction) globalHandlerFunction(messageType, message, messageNumber)

        if (messageNumber > 0) {
          const fut = oneTimeCallbacks.get(messageNumber)
          try {
            if (fut) {
              const [resolve] = fut
              reader.pos = 0
              resolve({ reader, messageType, messageNumber, message })
              oneTimeCallbacks.delete(messageNumber)
            }
            const handler = listeners.get(messageNumber)
            if (handler) {
              reader.pos = 0
              handler(reader, messageType, messageNumber, message)
            }
            if (
              messageType == RpcMessageTypes.RpcMessageTypes_STREAM_ACK ||
              messageType == RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE
            ) {
              receiveAck(message, messageNumber)
            }
          } catch (err: any) {
            transport.emit("error", err)
          }
        }
      } else {
        transport.emit("error", new Error(`Transport received unknown message: ${message}`))
      }
    } catch (err: any) {
      transport.emit("error", err)
    }
  })

  const ackCallbacks = new Map<string, [(msg: SubsetMessage) => void, (err: Error) => void]>()

  const bb = new Writer()

  function closeAll() {
    ackCallbacks.forEach(([resolve]) => resolve({ closed: true, ack: false }))
    oneTimeCallbacks.forEach(([, reject]) => reject(new Error('RPC Transport closed')))
    ackCallbacks.clear()
  }

  transport.on("close", closeAll)
  transport.on("error", (err) => {
    ackCallbacks.forEach(([, reject]) => reject(err))
    oneTimeCallbacks.forEach(([, reject]) => reject(err))
    ackCallbacks.clear()
  })

  function receiveAck(data: StreamMessage, messageNumber: number) {
    const key = `${messageNumber},${data.sequenceId}`
    const fut = ackCallbacks.get(key)
    if (fut) {
      ackCallbacks.delete(key)
      fut[0](data)
    // TODO: https://github.com/decentraland/rpc/issues/116
    //} else {
    //  throw new Error("Received an ACK message for an inexistent handler " + key)
    }
  }

  return {
    transport,
    setGlobalHandler(handler: GlobalHandlerFunction) {
      globalHandlerFunction = handler
    },
    addOneTimeListener(messageId: number) {
      return new Promise<OneTimeListener>((res, rej) => {
        oneTimeCallbacks.set(messageId, [res, rej])
      })
    },
    addListener(messageId: number, handler) {
      if (listeners.has(messageId)) throw new Error("There is already a handler for messageId " + messageId)
      listeners.set(messageId, handler)
    },
    removeListener(messageId) {
      if (!listeners.has(messageId)) throw new Error("A handler is missing for messageId " + messageId)
      listeners.delete(messageId)
    },

    async sendStreamMessage(data: StreamMessage): Promise<SubsetMessage> {
      const [_, messageNumber] = parseMessageIdentifier(data.messageIdentifier)
      const key = `${messageNumber},${data.sequenceId}`

      const ret = new Promise<SubsetMessage>(function ackPromise(ret, rej) {
        ackCallbacks.set(key, [ret, rej])
      })

      bb.reset()
      StreamMessage.encode(data, bb)
      transport.sendMessage(bb.finish())

      return ret
    },
  }
}
