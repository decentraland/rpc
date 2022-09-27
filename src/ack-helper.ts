import { Writer } from "protobufjs/minimal"
import { Transport } from "./types"
import { parseMessageIdentifier } from "./protocol/helpers"
import { StreamMessage } from "./protocol"

export type SubsetMessage = Pick<StreamMessage, "closed" | "ack">

export type AckDispatcher = {
  sendWithAck(data: StreamMessage): Promise<SubsetMessage>
  receiveAck(data: StreamMessage, messageNumber: number): void
  addStreamListener(messageNumber: number, fn: (msg: StreamMessage) => void): void
  emitStream(messageNumber: number, streamMessage: StreamMessage): void
}

export function createAckHelper(transport: Transport): AckDispatcher {
  const oneTimeCallbacks = new Map<string, [(msg: SubsetMessage) => void, (err: Error) => void]>()
  const streams = new Map<number, (msg: StreamMessage) => void>()
  const bb = new Writer()

  function closeAll() {
    oneTimeCallbacks.forEach(([resolve]) => resolve({ closed: true, ack: false }))
    oneTimeCallbacks.clear()
  }

  transport.on("close", closeAll)
  transport.on("error", (err) => {
    oneTimeCallbacks.forEach(([, reject]) => reject(err))
    oneTimeCallbacks.clear()
  })

  return {
    receiveAck(data: StreamMessage, messageNumber: number) {
      const key = `${messageNumber},${data.sequenceId}`
      const fut = oneTimeCallbacks.get(key)
      if (fut) {
        oneTimeCallbacks.delete(key)
        fut[0](data)
      } else {
        throw new Error("Received a message for an inexistent handler " + key)
      }
    },
    async sendWithAck(data: StreamMessage): Promise<SubsetMessage> {
      const [_, messageNumber] = parseMessageIdentifier(data.messageIdentifier)
      const key = `${messageNumber},${data.sequenceId}`

      const ret = new Promise<SubsetMessage>(function ackPromise(ret, rej) {
        oneTimeCallbacks.set(key, [ret, rej])
      })

      bb.reset()
      StreamMessage.encode(data, bb)
      transport.sendMessage(bb.finish())

      return ret
    },
    addStreamListener(messageNumber: number, fn: (msg: StreamMessage) => void) {
      streams.set(messageNumber, fn)
    },
    emitStream(messageNumber: number, streamMessage: StreamMessage) {
      const stream = streams.get(messageNumber)
      if (stream) {
        stream(streamMessage)
      }
    }
  }
}
