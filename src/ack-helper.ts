import { Writer } from "protobufjs"
import { Transport } from "./types"
import { parseMessageIdentifier } from "./protocol/helpers"
import { StreamMessage } from "./protocol/pbjs"

export type AckDispatcher = {
  sendWithAck(data: StreamMessage): Promise<StreamMessage>
  receiveAck(data: StreamMessage, messageNumber: number): void
}

export function createAckHelper(transport: Transport): AckDispatcher {
  const oneTimeCallbacks = new Map<string, (msg: StreamMessage) => void>()

  const bb = new Writer()

  return {
    receiveAck(data: StreamMessage, messageNumber: number) {
      const key = `${messageNumber},${data.sequenceId}`
      const fut = oneTimeCallbacks.get(key)
      if (fut) {
        fut(data)
        oneTimeCallbacks.delete(key)
      }
    },
    async sendWithAck(data: StreamMessage): Promise<StreamMessage> {
      return new Promise<StreamMessage>((ret) => {
        const [_, messageNumber] = parseMessageIdentifier(data.messageIdentifier)
        oneTimeCallbacks.set(`${messageNumber},${data.sequenceId}`, ret)

        bb.reset()
        StreamMessage.encode(data, bb)
        transport.sendMessage(bb.finish())
      })
    },
  }
}
