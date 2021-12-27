import { CallableProcedure, ClientModuleDefinition, RpcClient, RpcClientPort, RpcPortEvents } from "."
import { Transport } from "./types"
import mitt from "mitt"

import {
  CreatePort,
  CreatePortResponse,
  RemoteError,
  Request,
  RequestModule,
  RequestModuleResponse,
  Response,
  RpcMessageTypes,
  StreamMessage,
} from "./protocol/index_pb"
import { BinaryReader } from "google-protobuf"
import { getMessageType } from "./proto-helpers"
import { MessageDispatcher, messageNumberHandler } from "./message-number-handler"
import { pushableChannel } from "./push-channel"
import { log } from "./logger"


const EMPTY_U8 = new Uint8Array(0)

// @internal
export function createPort(portId: number, portName: string, dispatcher: MessageDispatcher): RpcClientPort {
  const events = mitt<RpcPortEvents>()

  return {
    ...events,
    portName,
    portId,
    close() {
      throw new Error("close() not implemented yet")
    },
    async loadModule(moduleName: string) {
      const requestModuleMessage = new RequestModule()
      requestModuleMessage.setModuleName(moduleName)
      requestModuleMessage.setPortId(portId)
      requestModuleMessage.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE)
      log(`! Sending to server ${JSON.stringify(requestModuleMessage.toObject())}`)
      const ret = await dispatcher.request(requestModuleMessage)
      log(`! Sent ${JSON.stringify(requestModuleMessage.toObject())}`)
      const parsedMessage = parseServerMessage(ret)
      log(`! Receiving answer ${JSON.stringify(parsedMessage?.toObject())}`)
      if (parsedMessage instanceof RequestModuleResponse) {
        const ret: ClientModuleDefinition = {}

        for (let procedure of parsedMessage.getProceduresList()) {
          ret[procedure.getProcedureName()] = createProcedure(portId, procedure.getProcedureId(), dispatcher)
        }

        return ret
      }
      throw new Error("Unknown response received from server.")
    },
  }
}

function streamFromDispatcher(dispatcher: MessageDispatcher, messageId: number): AsyncGenerator<Uint8Array> {
  const { iterable, push, close, fail } = pushableChannel<Uint8Array>()
  let wasClosed = false

  dispatcher.transport.on("close", () => {
    if (!wasClosed) {
      fail(new Error("RPC Transport closed"))
    }
  })

  dispatcher.transport.on("error", () => {
    if (!wasClosed) {
      fail(new Error("RPC Transport failed"))
    }
  })

  dispatcher.addListener(messageId, (reader) => {
    const message = parseServerMessage(reader)

    if (message instanceof StreamMessage) {
      if (message.getClosed()) {
        wasClosed = true
        close()
      } else {
        const payload = message.getPayload_asU8()
        if (payload && payload.length) {
          push(payload)
        }
      }
    } else if (message instanceof RemoteError) {
      wasClosed = true
      fail(new Error(message.getErrorMessage() || "Unknown remote error"))
    }
  })

  return iterable
}

// @internal
function createProcedure(portId: number, procedureId: number, dispatcher: MessageDispatcher): CallableProcedure {
  const callProcedurePacket = new Request()
  callProcedurePacket.setPortId(portId)
  callProcedurePacket.setProcedureId(procedureId)
  callProcedurePacket.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_REQUEST)

  return async function (data) {
    if (data) {
      callProcedurePacket.setPayload(data)
    } else {
      callProcedurePacket.setPayload(EMPTY_U8)
    }
    const ret = parseServerMessage(await dispatcher.request(callProcedurePacket))
    if (ret instanceof Response) {
      if (ret.getIsStream()) {
        return streamFromDispatcher(dispatcher, ret.getMessageId())
      }
      return ret.getPayload_asU8()
    }
  }
}

function parseServerMessage(reader: BinaryReader) {
  const messageType = getMessageType(reader)
  reader.reset()

  switch (messageType) {
    case RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT_RESPONSE:
      return CreatePortResponse.deserializeBinaryFromReader(new CreatePortResponse(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_RESPONSE:
      return Response.deserializeBinaryFromReader(new Response(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE_RESPONSE:
      return RequestModuleResponse.deserializeBinaryFromReader(new RequestModuleResponse(), reader)
    default:
      throw new Error(`Unknown message from RPC server: ${messageType}`)
      return null
  }
}

export async function createRpcClient(transport: Transport): Promise<RpcClient> {
  const clientPortByName = new Map<string, Promise<RpcClientPort>>()

  const dispatcher = messageNumberHandler(transport)

  async function internalCreatePort(portName: string): Promise<RpcClientPort> {
    const createPortMessage = new CreatePort()
    createPortMessage.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT)
    createPortMessage.setPortName(portName)
    const ret = await dispatcher.request(createPortMessage)
    const parsedMessage = parseServerMessage(ret)
    if (parsedMessage instanceof CreatePortResponse) {
      const portId = parsedMessage.getCreatedPortId()
      return createPort(portId, portName, dispatcher)
    }
    throw new Error("Unknown response received from server.")
  }

  // wait for transport to be connected
  await new Promise<any>((resolve, reject) => {
    transport.on("connect", resolve)
    transport.on("error", reject)
  })

  return {
    // the only objective of this function is to deduplicate asynchronous calls
    // and produce an idempotent module load
    async createPort(portName: string): Promise<RpcClientPort> {
      if (clientPortByName.has(portName)) {
        return clientPortByName.get(portName)!
      }
      const port = internalCreatePort(portName)
      clientPortByName.set(portName, port)
      return port
    },
  }
}
