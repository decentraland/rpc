// THIS FILE IS AUTOGENERATED
import * as e from '../encdec/encoding'
import * as d from '../encdec/decoding'
export type fixed32 = number

function _readArray<T>($: d.Decoder, reader: ($: d.Decoder) => T): Array<T> {
  const len = d.readUint32($); const ret: T[] = [];
  for(let i = 0; i < len; i++) ret.push(reader($));
  return ret;
}
function _readString($: d.Decoder) {
  return d.readVarString($);
}
function _readBytes($: d.Decoder): Uint8Array {
  return d.readVarUint8Array($);
}
function _writeArray<T>($: e.Encoder, writer: ($: e.Encoder, value: T) => void, array: T[]) {
  e.writeUint32($, array.length);
  for(let element of array) writer($, element);
}
function _writeString($: e.Encoder, value: string) {
  e.writeVarString($, value);
}
function _writeBytes($: e.Encoder, value: Uint8Array) {
  e.writeVarUint8Array($, value);
}
export type RpcMessageHeader = {
  messageIdentifier: fixed32
}

export function writeRpcMessageHeader($: e.Encoder, value: RpcMessageHeader) {
  e.writeUint32($, value["messageIdentifier"]);
}

export function readRpcMessageHeader($: d.Decoder): RpcMessageHeader {
  return {
    messageIdentifier: d.readUint32($),
  }
}

export const enum RpcMessageTypes {
  EMPTY = 0,
  REQUEST = 1,
  RESPONSE = 2,
  STREAM_MESSAGE = 3,
  STREAM_ACK = 4,
  CREATE_PORT = 5,
  CREATE_PORT_RESPONSE = 6,
  REQUEST_MODULE = 7,
  REQUEST_MODULE_RESPONSE = 8,
  REMOTE_ERROR_RESPONSE = 9,
  DESTROY_PORT = 10,
  SERVER_READY = 11,
}

export type CreatePort = {
  messageIdentifier: fixed32
  portName: string
}

export function writeCreatePort($: e.Encoder, value: CreatePort) {
  e.writeUint32($, value["messageIdentifier"]);
  _writeString($, value["portName"]);
}

export function readCreatePort($: d.Decoder): CreatePort {
  return {
    messageIdentifier: d.readUint32($),
    portName: _readString($),
  }
}

export type CreatePortResponse = {
  messageIdentifier: fixed32
  portId: fixed32
}

export function writeCreatePortResponse($: e.Encoder, value: CreatePortResponse) {
  e.writeUint32($, value["messageIdentifier"]);
  e.writeUint32($, value["portId"]);
}

export function readCreatePortResponse($: d.Decoder): CreatePortResponse {
  return {
    messageIdentifier: d.readUint32($),
    portId: d.readUint32($),
  }
}

export type RequestModule = {
  messageIdentifier: fixed32
  portId: fixed32
  moduleName: string
}

export function writeRequestModule($: e.Encoder, value: RequestModule) {
  e.writeUint32($, value["messageIdentifier"]);
  e.writeUint32($, value["portId"]);
  _writeString($, value["moduleName"]);
}

export function readRequestModule($: d.Decoder): RequestModule {
  return {
    messageIdentifier: d.readUint32($),
    portId: d.readUint32($),
    moduleName: _readString($),
  }
}

export type RequestModuleResponse = {
  messageIdentifier: fixed32
  portId: fixed32
  procedures: Array<ModuleProcedure>
}

export function writeRequestModuleResponse($: e.Encoder, value: RequestModuleResponse) {
  e.writeUint32($, value["messageIdentifier"]);
  e.writeUint32($, value["portId"]);
  _writeArray($, ($, elem) => writeModuleProcedure($, elem), value["procedures"]);
}

export function readRequestModuleResponse($: d.Decoder): RequestModuleResponse {
  return {
    messageIdentifier: d.readUint32($),
    portId: d.readUint32($),
    procedures: _readArray($, ($) => readModuleProcedure($)),
  }
}

export type DestroyPort = {
  messageIdentifier: fixed32
  portId: fixed32
}

export function writeDestroyPort($: e.Encoder, value: DestroyPort) {
  e.writeUint32($, value["messageIdentifier"]);
  e.writeUint32($, value["portId"]);
}

export function readDestroyPort($: d.Decoder): DestroyPort {
  return {
    messageIdentifier: d.readUint32($),
    portId: d.readUint32($),
  }
}

export type ModuleProcedure = {
  procedureId: fixed32
  procedureName: string
}

export function writeModuleProcedure($: e.Encoder, value: ModuleProcedure) {
  e.writeUint32($, value["procedureId"]);
  _writeString($, value["procedureName"]);
}

export function readModuleProcedure($: d.Decoder): ModuleProcedure {
  return {
    procedureId: d.readUint32($),
    procedureName: _readString($),
  }
}

export type Request = {
  messageIdentifier: fixed32
  portId: fixed32
  procedureId: fixed32
  payload: Uint8Array
}

export function writeRequest($: e.Encoder, value: Request) {
  e.writeUint32($, value["messageIdentifier"]);
  e.writeUint32($, value["portId"]);
  e.writeUint32($, value["procedureId"]);
  _writeBytes($, value["payload"]);
}

export function readRequest($: d.Decoder): Request {
  return {
    messageIdentifier: d.readUint32($),
    portId: d.readUint32($),
    procedureId: d.readUint32($),
    payload: _readBytes($),
  }
}

export type RemoteError = {
  messageIdentifier: fixed32
  errorCode: fixed32
  errorMessage: string
}

export function writeRemoteError($: e.Encoder, value: RemoteError) {
  e.writeUint32($, value["messageIdentifier"]);
  e.writeUint32($, value["errorCode"]);
  _writeString($, value["errorMessage"]);
}

export function readRemoteError($: d.Decoder): RemoteError {
  return {
    messageIdentifier: d.readUint32($),
    errorCode: d.readUint32($),
    errorMessage: _readString($),
  }
}

export type Response = {
  messageIdentifier: fixed32
  payload: Uint8Array
}

export function writeResponse($: e.Encoder, value: Response) {
  e.writeUint32($, value["messageIdentifier"]);
  _writeBytes($, value["payload"]);
}

export function readResponse($: d.Decoder): Response {
  return {
    messageIdentifier: d.readUint32($),
    payload: _readBytes($),
  }
}

export type StreamMessage = {
  messageIdentifier: fixed32
  portId: fixed32
  sequenceId: fixed32
  payload: Uint8Array
  closed: boolean
  ack: boolean
}

export function writeStreamMessage($: e.Encoder, value: StreamMessage) {
  e.writeUint32($, value["messageIdentifier"]);
  e.writeUint32($, value["portId"]);
  e.writeUint32($, value["sequenceId"]);
  _writeBytes($, value["payload"]);
  e.writeUint8($, value["closed"] ? 1 : 0);
  e.writeUint8($, value["ack"] ? 1 : 0);
}

export function readStreamMessage($: d.Decoder): StreamMessage {
  return {
    messageIdentifier: d.readUint32($),
    portId: d.readUint32($),
    sequenceId: d.readUint32($),
    payload: _readBytes($),
    closed: d.readUint8($) != 0,
    ack: d.readUint8($) != 0,
  }
}
