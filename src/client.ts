import { CallableProcedureClient, ClientModuleDefinition, RpcClient, RpcClientPort, RpcPortEvents } from "."
import { Transport } from "./types"
import mitt from "mitt"
import future, { IFuture } from "fp-future"
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
import { MessageDispatcher, messageDispatcher } from "./message-dispatcher"
import { AsyncQueue } from "./push-channel"
import {
  calculateMessageIdentifier,
  closeStreamMessage,
  parseProtocolMessage,
  streamAckMessage,
  streamMessage,
} from "./protocol/helpers"
import { ClientRequestDispatcher, createClientRequestDispatcher } from "./client-request-dispatcher"
import { sendStreamThroughTransport } from "./stream-protocol"

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
 * If a StreamMessage is received, then it means we have the POSSIBILITY to
 * consume a remote generator. The client must answer every ACK with the next
 * inteded action, could be: next(), close(). Both actions are serialized in the
 * StreamMessage. The server MUST NOT generate any new element of the generator
 * if the client doesn't ask for it.
 *
 * The whole protocol is designed to be SLOW AND SECURE, that means, ACKs (slow)
 * will block the generation and consumption of iterators (secure).
 *
 * That exist to save the memory of the servers and to generate the much needed
 * backpressure.
 *
 * If throughput is what you are looking for, you may better use bigger messages
 * containing serialized lists. Effectively reducing the number of messages
 * and increasing their size.
 *
 * @internal
 */
export function streamFromDispatcher(
  dispatcher: MessageDispatcher,
  portId: number,
  messageNumber: number
): { generator: AsyncGenerator<Uint8Array>; closeIfNotOpened(): void } {
  let lastReceivedSequenceId = 0
  let isRemoteClosed = false
  let wasOpen = false

  const channel = new AsyncQueue<Uint8Array>(sendServerSignals)

  dispatcher.transport.on("close", () => {
    channel.close(new Error("RPC Transport closed"))
  })

  dispatcher.transport.on("error", () => {
    channel.close(new Error("RPC Transport failed"))
  })

  // This function is called at two moments
  // 1. When the channel is closed or fails -> an ACK closing the stream is sent to the server
  // 2. When the channel.next() is called   -> an ACK requesting the next elem is sent to the server
  function sendServerSignals(_channel: AsyncQueue<Uint8Array>, action: "close" | "next") {
    if (action == "close") {
      dispatcher.removeListener(messageNumber)
    }
    if (!isRemoteClosed) {
      if (action == "close") {
        dispatcher.transport.sendMessage(closeStreamMessage(messageNumber, lastReceivedSequenceId, portId))
      } else if (action == "next") {
        // mark the stream as opened
        wasOpen = true
        // if (streamMessage.requireAck) {
        dispatcher.transport.sendMessage(streamAckMessage(messageNumber, lastReceivedSequenceId, portId))
        // }
      }
    }
  }

  // receive a message from the server and send it to the iterable channel
  function processMessage(message: StreamMessage) {
    lastReceivedSequenceId = message.sequenceId

    if (message.closed) {
      // when the server CLOSES the stream, then we raise the flag isRemoteClosed
      // to prevent sending an extra closeStreamMessage to the server after closing
      // our channel.
      // IMPORTANT: If the server closes the connection, then we DONT send the ACK
      //            back to the server because it is redundant information.
      isRemoteClosed = true
      channel.close()
    } else {
      channel.enqueue(message.payload)
    }
  }

  dispatcher.addListener(messageNumber, (reader, messageType, messageNumber, message) => {
    if (messageType == RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE) {
      processMessage(message)
    } else if (messageType == RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE) {
      isRemoteClosed = true
      channel.close(new Error("RemoteError: " + ((message as RemoteError).errorMessage || "Unknown remote error")))
    } else {
      channel.close(new Error("RemoteError: Protocol error"))
    }
  })

  return {
    generator: channel,
    closeIfNotOpened() {
      if (!wasOpen) {
        debugger
        channel.close()
      }
    },
  }
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
        callProcedurePacket.clientStream = requestDispatcher.nextMessageNumber()
        callProcedurePacket.payload = EMPTY_U8

        requestDispatcher.dispatcher.addOneTimeListener(
          callProcedurePacket.clientStream,
          (reader, messageType, messageNumber, ret: StreamMessage) => {
            if (ret.closed) return
            if (!ret.ack) throw new Error("Error in logic, ACK must be true")

            sendStreamThroughTransport(
              requestDispatcher.dispatcher,
              requestDispatcher.dispatcher.transport,
              data as any,
              portId,
              messageNumber
            ).catch((error) => {
              debugger
              requestDispatcher.dispatcher.transport.emit("error", error)
            })
          }
        )
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
        const { generator } = streamFromDispatcher(requestDispatcher.dispatcher, openStreamMessage.portId, messageNumber)
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
