import { CallableProcedureClient, ClientModuleDefinition, RpcClient, RpcClientPort, RpcPortEvents } from "."
import { Transport } from "./types"
import mitt from "mitt"
import { Writer } from "protobufjs/minimal"
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
} from "./protocol"
import { messageDispatcher } from "./message-dispatcher"
import { calculateMessageIdentifier, parseProtocolMessage } from "./protocol/helpers"
import { ClientRequestDispatcher, createClientRequestDispatcher } from "./client-request-dispatcher"
import { sendStreamThroughTransport, streamFromDispatcher } from "./stream-protocol"

const EMPTY_U8 = new Uint8Array(0)

// @internal
export function createPort(
  portId: number,
  portName: string,
  requestDispatcher: ClientRequestDispatcher
): RpcClientPort {
  const events = mitt<RpcPortEvents>()

  let state: "open" | "closed" = "open"
  events.on("close", () => {
    state = "closed"
  })

  return {
    ...events,
    portName,
    portId,
    get state() {
      return state
    },
    close() {
      const bb = new Writer()
      DestroyPort.encode(
        {
          messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_DESTROY_PORT, 0),
          portId,
        },
        bb
      )
      requestDispatcher.dispatcher.transport.sendMessage(bb.finish())
      events.emit("close", {})
    },
    async loadModule(moduleName: string) {
      const ret = await requestDispatcher.request((bb, messageNumber) => {
        RequestModule.encode(
          {
            messageIdentifier: calculateMessageIdentifier(
              RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE,
              messageNumber
            ),
            moduleName,
            portId,
          },
          bb
        )
      })
      const parsedMessage = parseProtocolMessage(ret)
      if (parsedMessage) {
        const [messageType, message] = parsedMessage
        if (messageType == RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE_RESPONSE) {
          const ret: ClientModuleDefinition = {}

          for (let procedure of (message as RequestModuleResponse).procedures) {
            ret[procedure.procedureName] = createProcedure(portId, procedure.procedureId, requestDispatcher)
          }

          return ret
        } else if (messageType == RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE) {
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

/**
 * This function is called client side, to generate an adapter for the protocol.
 * The client must accept an U8 or AsyncIterable<U8> as parameter.
 * And must return whatever the server decides, either it be an U8 or AsyncIterable<U8>
 * @internal
 */
function createProcedure(
  portId: number,
  procedureId: number,
  requestDispatcher: ClientRequestDispatcher
): CallableProcedureClient {
  const callProcedurePacket: Request = {
    portId,
    messageIdentifier: 0,
    payload: EMPTY_U8,
    procedureId,
    clientStream: 0,
  }

  return async function (data) {
    // TODO: Move to a function helper
    if (data) {
      if (Symbol.asyncIterator in data) {
        // if we are going to generate a client stream, it will be handled with a new
        // message ID
        const messageNumber = requestDispatcher.nextMessageNumber()
        callProcedurePacket.clientStream = messageNumber
        callProcedurePacket.payload = EMPTY_U8

        requestDispatcher.dispatcher
          .addOneTimeListener(messageNumber)
          .then(($) => {
            const message = $.message as StreamMessage

            if (message.closed) return
            if (!message.ack) throw new Error("Error in logic, ACK must be true")

            sendStreamThroughTransport(
              requestDispatcher.dispatcher,
              requestDispatcher.dispatcher.transport,
              data as any,
              portId,
              messageNumber
            )
          })
          .catch((error) => {
            requestDispatcher.dispatcher.transport.emit("error", error)
          })
      } else {
        callProcedurePacket.payload = data as Uint8Array
      }
    } else {
      callProcedurePacket.payload = EMPTY_U8
    }

    const ret = parseProtocolMessage(
      await requestDispatcher.request((bb, messageNumber) => {
        callProcedurePacket.messageIdentifier = calculateMessageIdentifier(
          RpcMessageTypes.RpcMessageTypes_REQUEST,
          messageNumber
        )
        Request.encode(callProcedurePacket, bb)
      })
    )

    if (ret) {
      const [messageType, message, messageNumber] = ret
      if (messageType == RpcMessageTypes.RpcMessageTypes_RESPONSE) {
        const u8 = (message as Response).payload
        if (u8.length) {
          return u8
        } else {
          return undefined
        }
      } else if (messageType == RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE) {
        // If a OpenStream is received with an serverStream, then it means we have the POSSIBILITY
        // to consume a remote generator. Look into the streamFromDispatcher functions
        // for more information.
        const openStreamMessage = message as StreamMessage
        const { generator } = streamFromDispatcher(
          requestDispatcher.dispatcher,
          openStreamMessage.portId,
          messageNumber
        )
        return generator
      } else if (messageType == RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE) {
        throwIfRemoteError(message)
      }
    }
  }
}

/**
 * @public
 */
export async function createRpcClient(transport: Transport): Promise<RpcClient> {
  const clientPortByName = new Map<string, Promise<RpcClientPort>>()

  const dispatcher = messageDispatcher(transport)
  const requestDispatcher = createClientRequestDispatcher(dispatcher)

  async function internalCreatePort(portName: string): Promise<RpcClientPort> {
    const ret = await requestDispatcher.request((bb, messageNumber) => {
      CreatePort.encode(
        {
          messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_CREATE_PORT, messageNumber),
          portName,
        },
        bb
      )
    })

    const parsedMessage = parseProtocolMessage(ret)

    if (parsedMessage) {
      const [messageType, message] = parsedMessage

      if (messageType == RpcMessageTypes.RpcMessageTypes_CREATE_PORT_RESPONSE) {
        const portId = (message as CreatePortResponse).portId
        return createPort(portId, portName, requestDispatcher)
      } else if (messageType == RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE) {
        throwIfRemoteError(message)
      }
    }

    throw new Error("Unknown response received from server.")
  }

  // wait for transport to be connected
  if (!transport.isConnected) {
    await new Promise<any>((resolve, reject) => {
      transport.on("connect", resolve)
      transport.on("error", reject)
    })
  }

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

      transport.on("close", () => {
        port.close()
      })

      port.on("close", () => {
        if (clientPortByName.get(portName) === portFuture) {
          clientPortByName.delete(portName)
        }
      })

      return port
    },
  }
}
