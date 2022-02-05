import { CallableProcedureClient, ClientModuleDefinition, RpcClient, RpcClientPort, RpcPortEvents } from "."
import { Transport } from "./types"
import mitt from "mitt"
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
} from "./protocol/index_pb"
import { Message } from "google-protobuf"
import { MessageDispatcher, messageNumberHandler } from "./message-number-handler"
import { pushableChannel } from "./push-channel"
import {
  calculateMessageIdentifier,
  closeStreamMessage,
  parseMessageIdentifier,
  parseProtocolMessage,
  streamAckMessage,
} from "./protocol/helpers"

const EMPTY_U8 = new Uint8Array(0)

// @internal
export function createPort(portId: number, portName: string, dispatcher: MessageDispatcher): RpcClientPort {
  const events = mitt<RpcPortEvents>()

  let state: "open" | "closed" = "open"
  events.on("close", () => (state = "closed"))

  return {
    ...events,
    portName,
    portId,
    get state() {
      return state
    },
    close() {
      const m = new DestroyPort()
      m.setPortId(portId)
      m.setMessageIdentifier(calculateMessageIdentifier(RpcMessageTypes.RPCMESSAGETYPES_DESTROY_PORT, 0))
      dispatcher.transport.sendMessage(m.serializeBinary())
      events.emit("close", {})
    },
    async loadModule(moduleName: string) {
      const requestModuleMessage = new RequestModule()
      requestModuleMessage.setModuleName(moduleName)
      requestModuleMessage.setPortId(portId)
      const ret = await dispatcher.request(requestModuleMessage, RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE)
      const parsedMessage = parseProtocolMessage(ret)
      if (parsedMessage) {
        const [message] = parsedMessage
        if (message instanceof RequestModuleResponse) {
          const ret: ClientModuleDefinition = {}

          for (let procedure of message.getProceduresList()) {
            ret[procedure.getProcedureName()] = createProcedure(portId, procedure.getProcedureId(), dispatcher)
          }

          return ret
        } else if (message instanceof RemoteError) {
          throwIfRemoteError(message)
        }
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
  streamMessage: StreamMessage,
  messageNumber: number
): AsyncGenerator<Uint8Array> {
  const channel = pushableChannel<Uint8Array>(localIteratorClosed)

  let lastReceivedSequenceId = 0
  let isRemoteClosed = false

  dispatcher.transport.on("close", () => {
    if (!channel.isClosed()) {
      channel.failAndClose(new Error("RPC Transport closed"))
    }
  })

  dispatcher.transport.on("error", () => {
    if (!channel.isClosed()) {
      channel.failAndClose(new Error("RPC Transport failed"))
    }
  })

  function localIteratorClosed() {
    if (!isRemoteClosed) {
      dispatcher.transport.sendMessage(
        closeStreamMessage(messageNumber, lastReceivedSequenceId, streamMessage.getPortId())
      )
    }
    dispatcher.removeListener(messageNumber)
  }

  function processMessage(message: StreamMessage, messageNumber: number) {
    lastReceivedSequenceId = message.getSequenceId()

    if (message.getClosed()) {
      isRemoteClosed = true
      channel.close()
    } else {
      const payload = message.getPayload_asU8()
      const portId = message.getPortId()
      channel
        .push(payload)
        .then(() => {
          const closed = channel.isClosed()
          if (!closed && !isRemoteClosed) {
            dispatcher.transport.sendMessage(streamAckMessage(messageNumber, lastReceivedSequenceId, portId))
          }
        })
        .catch(channel.failAndClose)
    }
  }

  dispatcher.addListener(messageNumber, (reader) => {
    const ret = parseProtocolMessage(reader)

    if (ret) {
      const [message, messageNumber] = ret
      if (message instanceof StreamMessage) {
        processMessage(message, messageNumber)
      } else if (message instanceof RemoteError) {
        isRemoteClosed = true
        channel.failAndClose(new Error("RemoteError: " + (message.getErrorMessage() || "Unknown remote error")))
      } else {
        channel.failAndClose(new Error("RemoteError: Protocol error"))
      }
    } else {
      channel.failAndClose(new Error("RemoteError: Protocol error"))
    }
  })

  processMessage(streamMessage, messageNumber)

  return channel.iterable
}

// @internal
function createProcedure(portId: number, procedureId: number, dispatcher: MessageDispatcher): CallableProcedureClient {
  const callProcedurePacket = new Request()
  callProcedurePacket.setPortId(portId)
  callProcedurePacket.setProcedureId(procedureId)

  return async function (data) {
    if (data) {
      callProcedurePacket.setPayload(data)
    } else {
      callProcedurePacket.setPayload(EMPTY_U8)
    }
    const ret = parseProtocolMessage(
      await dispatcher.request(callProcedurePacket, RpcMessageTypes.RPCMESSAGETYPES_REQUEST)
    )

    if (ret) {
      const [message, messageNumber] = ret
      if (message instanceof Response) {
        const u8 = message.getPayload_asU8()
        if (u8.length) {
          return u8
        } else {
          return undefined
        }
      } else if (message instanceof StreamMessage) {
        return streamFromDispatcher(dispatcher, message, messageNumber)
      } else {
        throwIfRemoteError(message)
        debugger
      }
    } else {
      throwIfRemoteError(null)
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
    createPortMessage.setPortName(portName)
    const ret = await dispatcher.request(createPortMessage, RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT)
    const parsedMessage = parseProtocolMessage(ret)

    if (parsedMessage) {
      const [message] = parsedMessage
      throwIfRemoteError(message)

      if (message instanceof CreatePortResponse) {
        const portId = message.getPortId()
        return createPort(portId, portName, dispatcher)
      }
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
      const portFuture = internalCreatePort(portName)
      clientPortByName.set(portName, portFuture)

      const port = await portFuture

      port.on("close", () => {
        if (clientPortByName.get(portName) === portFuture) {
          clientPortByName.delete(portName)
        }
      })

      return port
    },
  }
}
