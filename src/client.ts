import { CallableProcedureClient, ClientModuleDefinition, RpcClient, RpcClientPort, RpcPortEvents } from "."
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
import { Message } from "google-protobuf"
import { MessageDispatcher, messageNumberHandler } from "./message-number-handler"
import { pushableChannel } from "./push-channel"
import { closeStreamMessage, parseProtocolMessage, streamAckMessage } from "./protocol/helpers"

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
      const ret = await dispatcher.request(requestModuleMessage)
      const parsedMessage = parseProtocolMessage(ret)
      if (parsedMessage instanceof RequestModuleResponse) {
        const ret: ClientModuleDefinition = {}

        for (let procedure of parsedMessage.getProceduresList()) {
          ret[procedure.getProcedureName()] = createProcedure(portId, procedure.getProcedureId(), dispatcher)
        }

        return ret
      } else if (parsedMessage instanceof RemoteError) {
        throwIfRemoteError(parsedMessage)
      }
      throw new Error("Unknown response received from server.")
    },
  }
}

function throwIfRemoteError(parsedMessage: Message | null) {
  if (parsedMessage instanceof RemoteError) {
    throw new Error("RemoteError: " + parsedMessage.getErrorMessage())
  }
}

// @internal
export function streamFromDispatcher(
  dispatcher: MessageDispatcher,
  streamMessage: StreamMessage
): AsyncGenerator<Uint8Array> {
  const { iterable, push, close, failAndClose, isClosed } = pushableChannel<Uint8Array>(localIteratorClosed)

  let lastReceivedSequenceId = 0
  let isRemoteClosed = false

  dispatcher.transport.on("close", () => {
    if (!isClosed()) {
      failAndClose(new Error("RPC Transport closed"))
    }
  })

  dispatcher.transport.on("error", () => {
    if (!isClosed()) {
      failAndClose(new Error("RPC Transport failed"))
    }
  })

  function localIteratorClosed() {
    if (!isRemoteClosed) {
      dispatcher.transport.sendMessage(
        closeStreamMessage(streamMessage.getMessageId(), lastReceivedSequenceId, streamMessage.getPortId())
      )
    }
    dispatcher.removeListener(streamMessage.getMessageId())
  }

  function processMessage(message: StreamMessage) {
    lastReceivedSequenceId = message.getSequenceId()
    if (message.getClosed()) {
      isRemoteClosed = true
      close()
    } else {
      const payload = message.getPayload_asU8()

      push(payload)
        .then(() => {
          const closed = isClosed()
          if (!closed && !isRemoteClosed) {
            dispatcher.transport.sendMessage(
              streamAckMessage(message.getMessageId(), lastReceivedSequenceId, message.getPortId())
            )
          }
        })
        .catch(failAndClose)
    }
  }

  dispatcher.addListener(streamMessage.getMessageId(), (reader) => {
    const message = parseProtocolMessage(reader)

    if (message instanceof StreamMessage) {
      processMessage(message)
    } else if (message instanceof RemoteError) {
      isRemoteClosed = true
      failAndClose(new Error("RemoteError: " + (message.getErrorMessage() || "Unknown remote error")))
    } else {
      throw new Error("????")
    }
  })

  processMessage(streamMessage)

  return iterable
}

// @internal
function createProcedure(portId: number, procedureId: number, dispatcher: MessageDispatcher): CallableProcedureClient {
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
    const ret = parseProtocolMessage(await dispatcher.request(callProcedurePacket))

    if (ret instanceof Response) {
      const u8 = ret.getPayload_asU8()
      if (u8.length) {
        return u8
      } else {
        return undefined
      }
    } else if (ret instanceof StreamMessage) {
      return streamFromDispatcher(dispatcher, ret)
    } else {
      throwIfRemoteError(ret)
      debugger
    }
  }
}

/**
 * @public
 */
export async function createRpcClient(transport: Transport): Promise<RpcClient> {
  const clientPortByName = new Map<string, Promise<RpcClientPort>>()

  const dispatcher = messageNumberHandler(transport)

  async function internalCreatePort(portName: string): Promise<RpcClientPort> {
    const createPortMessage = new CreatePort()
    createPortMessage.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT)
    createPortMessage.setPortName(portName)
    const ret = await dispatcher.request(createPortMessage)
    const parsedMessage = parseProtocolMessage(ret)

    throwIfRemoteError(parsedMessage)

    if (parsedMessage instanceof CreatePortResponse) {
      const portId = parsedMessage.getPortId()
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
