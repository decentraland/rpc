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
import { MessageDispatcher, messageNumberHandler } from "./message-number-handler"
import { AsyncQueue, linkedList, pushableChannel } from "./push-channel"
import {
  calculateMessageIdentifier,
  closeStreamMessage,
  parseProtocolMessage,
  streamAckMessage,
} from "./protocol/helpers"

const EMPTY_U8 = new Uint8Array(0)

// @internal
export function createPort(portId: number, portName: string, dispatcher: MessageDispatcher): RpcClientPort {
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
      dispatcher.transport.sendMessage(bb.finish())
      events.emit("close", {})
    },
    async loadModule(moduleName: string) {
      const ret = await dispatcher.request((bb, messageNumber) => {
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
            ret[procedure.procedureName] = createProcedure(portId, procedure.procedureId, dispatcher)
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
  streamMessage: StreamMessage,
  messageNumber: number
): AsyncGenerator<Uint8Array> {
  let lastReceivedSequenceId = 0
  let isRemoteClosed = false

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
        dispatcher.transport.sendMessage(closeStreamMessage(messageNumber, lastReceivedSequenceId, streamMessage.portId))
      } else if (action == "next") {
        dispatcher.transport.sendMessage(streamAckMessage(messageNumber, lastReceivedSequenceId, streamMessage.portId))
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

  dispatcher.addListener(messageNumber, (reader) => {
    const ret = parseProtocolMessage(reader)

    if (ret) {
      const [messageType, message] = ret
      if (messageType == RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE) {
        processMessage(message)
      } else if (messageType == RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE) {
        isRemoteClosed = true
        channel.close(
          new Error("RemoteError: " + ((message as RemoteError).errorMessage || "Unknown remote error"))
        )
      } else {
        channel.close(new Error("RemoteError: Protocol error"))
      }
    } else {
      channel.close(new Error("RemoteError: Protocol error"))
    }
  })

  return channel
}

// @internal
function createProcedure(portId: number, procedureId: number, dispatcher: MessageDispatcher): CallableProcedureClient {
  const callProcedurePacket = {
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
        // If a StreamMessage is received, then it means we have the POSSIBILITY
        // to consume a remote generator. Look into the streamFromDispatcher functions
        // for more information.
        return streamFromDispatcher(dispatcher, message, messageNumber)
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

  const dispatcher = messageNumberHandler(transport)

  async function internalCreatePort(portName: string): Promise<RpcClientPort> {
    const ret = await dispatcher.request((bb, messageNumber) => {
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
        return createPort(portId, portName, dispatcher)
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
