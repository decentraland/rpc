import { BinaryConstants, BinaryReader, Message } from "google-protobuf"
import {
  CreatePort,
  CreatePortResponse,
  DestroyPort,
  RemoteError,
  Request,
  RequestModule,
  RequestModuleResponse,
  Response,
  RpcMessageTypes,
  StreamMessage,
} from "./index_pb"

export function closeStreamMessage(messageId: number, sequenceId: number, portId: number): Uint8Array {
  const m = new StreamMessage()
  m.setMessageIdentifier(calculateMessageIdentifier(RpcMessageTypes.RPCMESSAGETYPES_STREAM_MESSAGE, messageId))
  m.setSequenceId(sequenceId)
  m.setPortId(portId)
  m.setAck(false)
  m.setClosed(true)
  return m.serializeBinary()
}

export function streamMessage(
  messageNumber: number,
  sequenceId: number,
  portId: number,
  payload: Uint8Array
): Uint8Array {
  const m = new StreamMessage()
  m.setMessageIdentifier(calculateMessageIdentifier(RpcMessageTypes.RPCMESSAGETYPES_STREAM_MESSAGE, messageNumber))
  m.setSequenceId(sequenceId)
  m.setPortId(portId)
  m.setAck(false)
  m.setClosed(false)
  m.setPayload(payload)
  return m.serializeBinary()
}

export function streamAckMessage(messageId: number, sequenceId: number, portId: number): Uint8Array {
  const m = new StreamMessage()
  m.setMessageIdentifier(calculateMessageIdentifier(RpcMessageTypes.RPCMESSAGETYPES_STREAM_ACK, messageId))
  m.setSequenceId(sequenceId)
  m.setPortId(portId)
  m.setAck(true)
  m.setClosed(false)
  return m.serializeBinary()
}

// @internal
export function parseMessageIdentifier(value: number): [number, number] {
  return [(value >> 27) & 0xf, value & 0x07ffffff]
}

// @internal
export function calculateMessageIdentifier(messageType: number, messageNumber: number): number {
  return ((messageType & 0xf) << 27) | (messageNumber & 0x07ffffff)
}

export function getMessageIdentifier(reader: BinaryReader): [number, number] {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      return [0, 0]
    }
    const field = reader.getFieldNumber()
    switch (field) {
      case 1 /* message_identifier */:
        if (reader.getWireType() != 5) return [0, 0]
        const value = /** @type {number} */ reader.readFixed32()
        return parseMessageIdentifier(value)
      default:
        reader.skipField()
        break
    }
  }
  return [0, 0]
}

export function parseProtocolMessage(reader: BinaryReader): [Message, number] | null {
  const [messageType, messageNumber] = getMessageIdentifier(reader)
  reader.reset()

  switch (messageType) {
    case RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT_RESPONSE:
      return [CreatePortResponse.deserializeBinaryFromReader(new CreatePortResponse(), reader), messageNumber]
    case RpcMessageTypes.RPCMESSAGETYPES_RESPONSE:
      return [Response.deserializeBinaryFromReader(new Response(), reader), messageNumber]
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE_RESPONSE:
      return [RequestModuleResponse.deserializeBinaryFromReader(new RequestModuleResponse(), reader), messageNumber]
    case RpcMessageTypes.RPCMESSAGETYPES_STREAM_MESSAGE:
      return [StreamMessage.deserializeBinaryFromReader(new StreamMessage(), reader), messageNumber]
    case RpcMessageTypes.RPCMESSAGETYPES_SERVER_READY:
      return null
    case RpcMessageTypes.RPCMESSAGETYPES_REMOTE_ERROR_RESPONSE:
      return [RemoteError.deserializeBinaryFromReader(new RemoteError(), reader), messageNumber]
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST:
      return [Request.deserializeBinaryFromReader(new Request(), reader), messageNumber]
    case RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT:
      return [CreatePort.deserializeBinaryFromReader(new CreatePort(), reader), messageNumber]
    case RpcMessageTypes.RPCMESSAGETYPES_STREAM_ACK:
      return [StreamMessage.deserializeBinaryFromReader(new StreamMessage(), reader), messageNumber]
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE:
      return [RequestModule.deserializeBinaryFromReader(new RequestModule(), reader), messageNumber]
    case RpcMessageTypes.RPCMESSAGETYPES_DESTROY_PORT:
      return [DestroyPort.deserializeBinaryFromReader(new DestroyPort(), reader), messageNumber]
  }

  return null
}
