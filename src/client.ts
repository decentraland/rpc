import { CallableProcedureClient, ClientModuleDefinition, RpcClient, RpcClientPort, RpcPortEvents } from "."
import { Transport } from "./types"
import mitt from "mitt"
import {
  CreatePortResponse,
  RemoteError,
  Request,
  RequestModuleResponse,
  Response,
  RpcMessageTypes,
  StreamMessage,
  writeCreatePort,
  writeDestroyPort,
  writeRequest,
  writeRequestModule,
} from "./protocol/wire-protocol"
import { MessageDispatcher, messageNumberHandler } from "./message-number-handler"
import { pushableChannel } from "./push-channel"
import {
  calculateMessageIdentifier,
  closeStreamMessage,
  parseProtocolMessage,
  streamAckMessage,
} from "./protocol/helpers"
import { BinaryWriter } from "google-protobuf"
import { createEncoder, toUint8Array } from "./encdec/encoding"

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
      const bb = createEncoder()
      writeDestroyPort(bb, {
        messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.DESTROY_PORT, 0),
        portId,
      })

      dispatcher.transport.sendMessage(toUint8Array(bb))
      events.emit("close", {})
    },
    async loadModule(moduleName: string) {
      const ret = await dispatcher.request((bb, messageNumber) => {
        writeRequestModule(bb, {
          messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.REQUEST_MODULE, messageNumber),
          moduleName,
          portId,
        })
      })
      const parsedMessage = parseProtocolMessage(ret)
      if (parsedMessage) {
        const [messageType, message] = parsedMessage
        if (messageType == RpcMessageTypes.REQUEST_MODULE_RESPONSE) {
          const ret: ClientModuleDefinition = {}

          for (let procedure of (message as RequestModuleResponse).procedures) {
            ret[procedure.procedureName] = createProcedure(portId, procedure.procedureId, dispatcher)
          }

          return ret
        } else if (messageType == RpcMessageTypes.REMOTE_ERROR_RESPONSE) {
          throwIfRemoteError(message)
        }
      }
      throw new Error("Unknown response received from server.")
    },
  }
}

function throwIfRemoteError(parsedMessage: RemoteError) {
  throw new Error("RemoteError: " + parsedMessage.errorMessage)
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
      dispatcher.transport.sendMessage(closeStreamMessage(messageNumber, lastReceivedSequenceId, streamMessage.portId))
    }
    dispatcher.removeListener(messageNumber)
  }

  function processMessage(message: StreamMessage, messageNumber: number) {
    lastReceivedSequenceId = message.sequenceId

    if (message.closed) {
      isRemoteClosed = true
      channel.close()
    } else {
      const payload = message.payload
      const portId = message.portId
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
      const [messageType, message, messageNumber] = ret
      if (messageType == RpcMessageTypes.STREAM_MESSAGE) {
        processMessage(message, messageNumber)
      } else if (messageType == RpcMessageTypes.REMOTE_ERROR_RESPONSE) {
        isRemoteClosed = true
        channel.failAndClose(
          new Error("RemoteError: " + ((message as RemoteError).errorMessage || "Unknown remote error"))
        )
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
  const callProcedurePacket: Request = {
    portId,
    messageIdentifier: 0,
    payload: EMPTY_U8,
    procedureId,
  }

  return async function (data) {
    if (data) {
      callProcedurePacket.payload = data
    } else {
      callProcedurePacket.payload = EMPTY_U8
    }
    const ret = parseProtocolMessage(
      await dispatcher.request((bb, messageNumber) => {
        callProcedurePacket.messageIdentifier = calculateMessageIdentifier(RpcMessageTypes.REQUEST, messageNumber)
        writeRequest(bb, callProcedurePacket)
      })
    )

    if (ret) {
      const [messageType, message, messageNumber] = ret
      if (messageType == RpcMessageTypes.RESPONSE) {
        const u8 = (message as Response).payload
        if (u8.length) {
          return u8
        } else {
          return undefined
        }
      } else if (messageType == RpcMessageTypes.STREAM_MESSAGE) {
        return streamFromDispatcher(dispatcher, message, messageNumber)
      } else if (messageType == RpcMessageTypes.REMOTE_ERROR_RESPONSE) {
        throwIfRemoteError(message)
        debugger
      }
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
    const ret = await dispatcher.request((bb, messageNumber) => {
      writeCreatePort(bb, {
        messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.CREATE_PORT, messageNumber),
        portName,
      })
    })

    const parsedMessage = parseProtocolMessage(ret)

    if (parsedMessage) {
      const [messageType, message] = parsedMessage

      if (messageType == RpcMessageTypes.CREATE_PORT_RESPONSE) {
        const portId = (message as CreatePortResponse).portId
        return createPort(portId, portName, dispatcher)
      } else if (messageType == RpcMessageTypes.REMOTE_ERROR_RESPONSE) {
        throwIfRemoteError(message)
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
