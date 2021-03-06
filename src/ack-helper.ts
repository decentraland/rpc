import { Writer } from "protobufjs/minimal"
import { Transport } from "./types"
import { parseMessageIdentifier } from "./protocol/helpers"
import { StreamMessage } from "./protocol"

export type AckDispatcher = {
  sendWithAck(data: StreamMessage): Promise<StreamMessage>
  receiveAck(data: StreamMessage, messageNumber: number): void
}

export function createAckHelper(transport: Transport): AckDispatcher {
  const oneTimeCallbacks = new Map<string, [(msg: StreamMessage) => void, (err: Error) => void]>()

  const bb = new Writer()

  function closeAll() {
    const err = new Error("Transport closed while waiting the ACK")
    oneTimeCallbacks.forEach(([, reject]) => reject(err))
    oneTimeCallbacks.clear()
  }

  transport.on("close", closeAll)
  transport.on("error", err => {
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
        throw new Error('Received a message for an inexistent handler ' + key)
      }
    },
    async sendWithAck(data: StreamMessage): Promise<StreamMessage> {
      const [_, messageNumber] = parseMessageIdentifier(data.messageIdentifier)
      const key = `${messageNumber},${data.sequenceId}`

      const ret = new Promise<StreamMessage>(function ackPromise(ret, rej) {
        oneTimeCallbacks.set(key, [ret, rej])
      })

      bb.reset()
      StreamMessage.encode(data, bb)
      transport.sendMessage(bb.finish())

      return ret
    },
  }
}
