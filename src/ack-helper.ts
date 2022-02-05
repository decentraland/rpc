import { BinaryReader } from "google-protobuf"
import { Transport } from "./types"
import { RpcMessageTypes, StreamMessage } from "./protocol/index_pb"
import { getMessageIdentifier, parseMessageIdentifier } from "./protocol/helpers"

export type AckDispatcher = {
  transport: Transport
  sendWithAck(data: StreamMessage): Promise<StreamMessage>
}

export function createAckHelper(transport: Transport): AckDispatcher {
  const oneTimeCallbacks = new Map<string, (msg: StreamMessage) => void>()

  transport.on("message", (message) => {
    const reader = new BinaryReader(message)
    const [messageType, messageNumber] = getMessageIdentifier(reader)
    if (messageType == RpcMessageTypes.RPCMESSAGETYPES_STREAM_ACK) {
      reader.reset()
      const data = StreamMessage.deserializeBinaryFromReader(new StreamMessage(), reader)
      const key = `${messageNumber},${data.getSequenceId()}`
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
        const [_, messageNumber] = parseMessageIdentifier(data.getMessageIdentifier())
        oneTimeCallbacks.set(`${messageNumber},${data.getSequenceId()}`, ret)
        transport.sendMessage(data.serializeBinary())
      })
    },
  }
}
