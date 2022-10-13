import { Writer, Reader } from "protobufjs/minimal"
import {
  RpcMessageTypes,
  RpcMessageHeader,
  CreatePortResponse,
  Response,
  RequestModuleResponse,
  StreamMessage,
  RemoteError,
  Request,
  CreatePort,
  RequestModule,
  DestroyPort,
} from "./index"

const bb = new Writer()
const EMPTY_U8A = Uint8Array.of()

export function closeStreamMessage(messageNumber: number, sequenceId: number, portId: number): Uint8Array {
  bb.reset()
  StreamMessage.encode(
    {
      messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE, messageNumber),
      sequenceId,
      portId,
      ack: false,
      closed: true,
      payload: EMPTY_U8A,
    },
    bb
  )
  return bb.finish()
}

export function streamMessage(
  messageNumber: number,
  sequenceId: number,
  portId: number,
  payload: Uint8Array
): Uint8Array {
  bb.reset()
  StreamMessage.encode(
    {
      messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE, messageNumber),
      sequenceId,
      portId,
      ack: false,
      closed: false,
      payload
    },
    bb
  )
  return bb.finish()
}

export function streamAckMessage(messageNumber: number, sequenceId: number, portId: number): Uint8Array {
  bb.reset()
  StreamMessage.encode(
    {
      messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_STREAM_ACK, messageNumber),
      sequenceId,
      portId,
      ack: true,
      closed: false,
      payload: EMPTY_U8A
    },
    bb
  )
  return bb.finish()
}

// @internal
export function parseMessageIdentifier(value: number): [number, number] {
  return [(value >> 27) & 0xf, value & 0x07ffffff]
}

// @internal
export function calculateMessageIdentifier(messageType: number, messageNumber: number): number {
  return ((messageType & 0xf) << 27) | (messageNumber & 0x07ffffff)
}

export function parseProtocolMessage(reader: Reader): [number, any, number] | null {
  const originalPos = reader.pos
  const [messageType, messageNumber] = parseMessageIdentifier(RpcMessageHeader.decode(reader).messageIdentifier)
  reader.pos = originalPos

  switch (messageType) {
    case RpcMessageTypes.RpcMessageTypes_CREATE_PORT_RESPONSE:
      return [messageType, CreatePortResponse.decode(reader), messageNumber]
    case RpcMessageTypes.RpcMessageTypes_RESPONSE:
      return [messageType, Response.decode(reader), messageNumber]
    case RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE_RESPONSE:
      return [messageType, RequestModuleResponse.decode(reader), messageNumber]
    case RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE:
      return [messageType, StreamMessage.decode(reader), messageNumber]
    case RpcMessageTypes.RpcMessageTypes_SERVER_READY:
      return [messageType, null, messageNumber]
    case RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE:
      return [messageType, RemoteError.decode(reader), messageNumber]
    case RpcMessageTypes.RpcMessageTypes_REQUEST:
      return [messageType, Request.decode(reader), messageNumber]
    case RpcMessageTypes.RpcMessageTypes_CREATE_PORT:
      return [messageType, CreatePort.decode(reader), messageNumber]
    case RpcMessageTypes.RpcMessageTypes_STREAM_ACK:
      return [messageType, StreamMessage.decode(reader), messageNumber]
    case RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE:
      return [messageType, RequestModule.decode(reader), messageNumber]
    case RpcMessageTypes.RpcMessageTypes_DESTROY_PORT:
      return [messageType, DestroyPort.decode(reader), messageNumber]
  }

  return null
}
