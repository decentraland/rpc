import { Transport } from "./types"
import { parseMessageIdentifier } from "./protocol/helpers"
import {
  readRpcMessageHeader,
  readStreamMessage,
  RpcMessageTypes,
  StreamMessage,
  writeStreamMessage,
} from "./protocol/wire-protocol"
import { createEncoder, toUint8Array } from "./encdec/encoding"
import { createDecoder } from "./encdec/decoding"

export type AckDispatcher = {
  transport: Transport
  sendWithAck(data: StreamMessage): Promise<StreamMessage>
}

export function createAckHelper(transport: Transport): AckDispatcher {
  const oneTimeCallbacks = new Map<string, (msg: StreamMessage) => void>()

  transport.on("message", (message) => {
    const reader = createDecoder(message)
    const header = readRpcMessageHeader(reader)
    reader.pos = 0
    const [messageType, messageNumber] = parseMessageIdentifier(header.messageIdentifier)
    if (messageType == RpcMessageTypes.STREAM_ACK) {
      reader.pos = 0
      const data = readStreamMessage(reader)
      const key = `${messageNumber},${data.sequenceId}`
      const fut = oneTimeCallbacks.get(key)
      if (fut) {
        fut(data)
        oneTimeCallbacks.delete(key)
      }
    }
  })

  return {
    transport,
    async sendWithAck(data: StreamMessage): Promise<StreamMessage> {
      return new Promise<StreamMessage>((ret) => {
        const [_, messageNumber] = parseMessageIdentifier(data.messageIdentifier)
        oneTimeCallbacks.set(`${messageNumber},${data.sequenceId}`, ret)
        const bb = createEncoder()
        writeStreamMessage(bb, data)
        transport.sendMessage(toUint8Array(bb))
      })
    },
  }
}
