import { BinaryReader } from "google-protobuf"
import { Transport } from "."
import { getMessageType } from "./proto-helpers"
import { RpcMessageTypes, StreamMessage } from "./protocol/index_pb"

export type AckDispatcher = {
  transport: Transport
  sendWithAck(data: StreamMessage): Promise<StreamMessage>
}

export function createAckHelper(transport: Transport): AckDispatcher {
  const oneTimeCallbacks = new Map<string, (msg: StreamMessage) => void>()

  transport.on("message", (message) => {
    const reader = new BinaryReader(message)
    const messageType = getMessageType(reader)
    if (messageType == RpcMessageTypes.RPCMESSAGETYPES_STREAM_ACK) {
      reader.reset()
      const data = StreamMessage.deserializeBinaryFromReader(new StreamMessage(), reader)
      const key = `${data.getMessageId()},${data.getSequenceId()}`
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
        oneTimeCallbacks.set(`${data.getMessageId()},${data.getSequenceId()}`, ret)
        transport.sendMessage(data.serializeBinary())
      })
    },
  }
}
