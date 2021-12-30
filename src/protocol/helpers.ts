import { BinaryReader } from "google-protobuf"
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
  m.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_STREAM_MESSAGE)
  m.setMessageId(messageId)
  m.setSequenceId(sequenceId)
  m.setPortId(portId)
  m.setAck(false)
  m.setClosed(true)
  return m.serializeBinary()
}

export function streamMessage(messageId: number, sequenceId: number, portId: number, payload: Uint8Array): Uint8Array {
  const m = new StreamMessage()
  m.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_STREAM_MESSAGE)
  m.setMessageId(messageId)
  m.setSequenceId(sequenceId)
  m.setPortId(portId)
  m.setAck(false)
  m.setClosed(false)
  m.setPayload(payload)
  return m.serializeBinary()
}

export function streamAckMessage(messageId: number, sequenceId: number, portId: number): Uint8Array {
  const m = new StreamMessage()
  m.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_STREAM_ACK)
  m.setMessageId(messageId)
  m.setSequenceId(sequenceId)
  m.setPortId(portId)
  m.setAck(true)
  m.setClosed(false)
  return m.serializeBinary()
}

export function getMessageType(reader: BinaryReader): number | null {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      return null
    }
    var field = reader.getFieldNumber()
    switch (field) {
      case 1 /* message_type */:
        var value = /** @type {number} */ reader.readInt32()
        return value
      default:
        reader.skipField()
        break
    }
  }
  return null
}

export function getMessageId(reader: BinaryReader): number | null {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      return null
    }
    var field = reader.getFieldNumber()
    switch (field) {
      case 2 /* message_id */:
        var value = /** @type {number} */ reader.readInt32()
        return value
      default:
        reader.skipField()
        break
    }
  }
  return null
}

export function parseProtocolMessage(reader: BinaryReader) {
  const messageType = getMessageType(reader)
  reader.reset()

  switch (messageType) {
    case RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT_RESPONSE:
      return CreatePortResponse.deserializeBinaryFromReader(new CreatePortResponse(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_RESPONSE:
      return Response.deserializeBinaryFromReader(new Response(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE_RESPONSE:
      return RequestModuleResponse.deserializeBinaryFromReader(new RequestModuleResponse(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_STREAM_MESSAGE:
      return StreamMessage.deserializeBinaryFromReader(new StreamMessage(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_SERVER_READY:
      return null
    case RpcMessageTypes.RPCMESSAGETYPES_REMOTE_ERROR_RESPONSE:
      return RemoteError.deserializeBinaryFromReader(new RemoteError(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST:
      return Request.deserializeBinaryFromReader(new Request(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT:
      return CreatePort.deserializeBinaryFromReader(new CreatePort(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_STREAM_ACK:
      return StreamMessage.deserializeBinaryFromReader(new StreamMessage(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE:
      return RequestModule.deserializeBinaryFromReader(new RequestModule(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_DESTROY_PORT:
      return DestroyPort.deserializeBinaryFromReader(new DestroyPort(), reader)
  }

  debugger

  return null
}
