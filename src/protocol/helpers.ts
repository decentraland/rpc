import { Decoder } from "../encdec/decoding"
import { createEncoder, toUint8Array } from "../encdec/encoding"
import {
  RpcMessageTypes,
  readRpcMessageHeader,
  readCreatePortResponse,
  readResponse,
  readRequestModuleResponse,
  readStreamMessage,
  readRemoteError,
  readRequest,
  readCreatePort,
  readRequestModule,
  readDestroyPort,
  writeStreamMessage,
} from "./wire-protocol"

export function closeStreamMessage(messageNumber: number, sequenceId: number, portId: number): Uint8Array {
  const bb = createEncoder()
  writeStreamMessage(bb, {
    messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.STREAM_MESSAGE, messageNumber),
    sequenceId,
    portId,
    ack: false,
    closed: true,
    payload: Uint8Array.of(),
  })
  return toUint8Array(bb)
}

export function streamMessage(
  messageNumber: number,
  sequenceId: number,
  portId: number,
  payload: Uint8Array
): Uint8Array {
  const bb = createEncoder()
  writeStreamMessage(bb, {
    messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.STREAM_MESSAGE, messageNumber),
    sequenceId,
    portId,
    ack: false,
    closed: false,
    payload,
  })
  return toUint8Array(bb)
}

export function streamAckMessage(messageNumber: number, sequenceId: number, portId: number): Uint8Array {
  const bb = createEncoder()
  writeStreamMessage(bb, {
    messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.STREAM_ACK, messageNumber),
    sequenceId,
    portId,
    ack: true,
    closed: false,
    payload: Uint8Array.of(),
  })
  return toUint8Array(bb)
}

// @internal
export function parseMessageIdentifier(value: number): [number, number] {
  return [(value >> 27) & 0xf, value & 0x07ffffff]
}

// @internal
export function calculateMessageIdentifier(messageType: number, messageNumber: number): number {
  return ((messageType & 0xf) << 27) | (messageNumber & 0x07ffffff)
}

export function parseProtocolMessage(reader: Decoder): [number, any, number] | null {
  const originalPos = reader.pos
  const [messageType, messageNumber] = parseMessageIdentifier(readRpcMessageHeader(reader).messageIdentifier)
  reader.pos = originalPos

  switch (messageType) {
    case RpcMessageTypes.CREATE_PORT_RESPONSE:
      return [messageType, readCreatePortResponse(reader), messageNumber]
    case RpcMessageTypes.RESPONSE:
      return [messageType, readResponse(reader), messageNumber]
    case RpcMessageTypes.REQUEST_MODULE_RESPONSE:
      return [messageType, readRequestModuleResponse(reader), messageNumber]
    case RpcMessageTypes.STREAM_MESSAGE:
      return [messageType, readStreamMessage(reader), messageNumber]
    case RpcMessageTypes.SERVER_READY:
      return null
    case RpcMessageTypes.REMOTE_ERROR_RESPONSE:
      return [messageType, readRemoteError(reader), messageNumber]
    case RpcMessageTypes.REQUEST:
      return [messageType, readRequest(reader), messageNumber]
    case RpcMessageTypes.CREATE_PORT:
      return [messageType, readCreatePort(reader), messageNumber]
    case RpcMessageTypes.STREAM_ACK:
      return [messageType, readStreamMessage(reader), messageNumber]
    case RpcMessageTypes.REQUEST_MODULE:
      return [messageType, readRequestModule(reader), messageNumber]
    case RpcMessageTypes.DESTROY_PORT:
      return [messageType, readDestroyPort(reader), messageNumber]
  }

  return null
}
