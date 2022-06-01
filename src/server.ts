import {
  CallableProcedureServer,
  ModuleGeneratorFunction,
  RpcServer,
  RpcServerEvents,
  RpcServerHandler,
  RpcServerPort,
  ServerModuleDefinition,
  Transport,
} from "./types"
import mitt from "mitt"
import { Writer, Reader } from "protobufjs/minimal"
import { AsyncProcedureResultServer, RpcPortEvents, ServerModuleDeclaration } from "."
import { AckDispatcher, createAckHelper } from "./ack-helper"
import { calculateMessageIdentifier, closeStreamMessage, parseProtocolMessage } from "./protocol/helpers"
import {
  CreatePort,
  CreatePortResponse,
  DestroyPort,
  RemoteError,
  Request,
  RequestModule,
  RequestModuleResponse,
  Response,
  RpcMessageHeader,
  RpcMessageTypes,
  StreamMessage,
} from "./protocol"
import { ILoggerComponent } from "@well-known-components/interfaces"

let lastPortId = 0

type RpcServerState = {
  transports: Set<Transport>
  ports: Map<number, RpcServerPort<any>>
  portsByTransport: Map<Transport, Map<number, RpcServerPort<any>>>
}

const EMPTY_U8A = Uint8Array.from([])

/**
 * @public
 */
export type CreateRpcServerOptions<Context> = {
  logger?: ILoggerComponent.ILogger
}

// only use this writer in synchronous operations. It exists to prevent allocations
const unsafeSyncWriter = new Writer()

function getServerReadyMessage() {
  unsafeSyncWriter.reset()
  RpcMessageHeader.encode(
    {
      messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_SERVER_READY, 0),
    },
    unsafeSyncWriter
  )
  return unsafeSyncWriter.finish()
}

const transportStartMessageSerialized = getServerReadyMessage()

function moduleProcedures<Context>(module: ServerModuleDefinition<Context>) {
  return Array.from(Object.entries(module)).filter(([name, value]) => typeof value == "function")
}

/**
 * @internal
 */
export function createServerPort<Context>(portId: number, portName: string): RpcServerPort<Context> {
  const events = mitt<RpcPortEvents>()
  const loadedModules = new Map<string, Promise<ServerModuleDeclaration<Context>>>()
  const procedures = new Map<number, CallableProcedureServer<Context>>()
  const registeredModules = new Map<string, ModuleGeneratorFunction<Context>>()

  const port: RpcServerPort<Context> = {
    get portId() {
      return portId
    },
    get portName() {
      return portName
    },
    ...events,
    registerModule,
    loadModule,
    close,
    callProcedure,
  }

  async function close() {
    loadedModules.clear()
    procedures.clear()
    registeredModules.clear()
    events.emit("close", {})
  }

  async function registerModule(moduleName: string, generator: ModuleGeneratorFunction<Context>) {
    if (registeredModules.has(moduleName)) {
      throw new Error(`module ${moduleName} is already registered for port ${portName} (${portId}))`)
    }
    registeredModules.set(moduleName, generator)
  }

  async function loadModuleFromGenerator(
    moduleFuture: Promise<ServerModuleDefinition<Context>>
  ): Promise<ServerModuleDeclaration<Context>> {
    const module = await moduleFuture

    const ret: ServerModuleDeclaration<Context> = {
      procedures: [],
    }

    for (const [procedureName, callable] of moduleProcedures(module)) {
      const procedureId = procedures.size + 1
      procedures.set(procedureId, callable)
      ret.procedures.push({
        procedureName,
        callable,
        procedureId,
      })
    }

    return ret
  }

  function loadModule(moduleName: string): Promise<ServerModuleDeclaration<Context>> {
    if (loadedModules.has(moduleName)) {
      return loadedModules.get(moduleName)!
    }

    const moduleGenerator = registeredModules.get(moduleName)
    if (!moduleGenerator) {
      throw new Error(`Module ${moduleName} is not available for port ${portName} (${portId}))`)
    }

    const moduleFuture = loadModuleFromGenerator(moduleGenerator(port))
    loadedModules.set(moduleName, moduleFuture)

    return moduleFuture
  }

  function callProcedure(procedureId: number, payload: Uint8Array, context: Context): AsyncProcedureResultServer {
    const procedure = procedures.get(procedureId)!
    if (!procedure) {
      throw new Error(`procedureId ${procedureId} is missing in ${portName} (${portId}))`)
    }
    return procedure(payload, context)
  }

  return port
}

function getPortFromState(portId: number, transport: Transport, state: RpcServerState) {
  return state.portsByTransport.get(transport)?.get(portId)
}

// @internal
export async function handleCreatePort<Context>(
  transport: Transport,
  createPortMessage: CreatePort,
  messageNumber: number,
  options: CreateRpcServerOptions<Context>,
  handler: RpcServerHandler<Context>,
  state: RpcServerState,
  context: Context
) {
  lastPortId++

  const port = createServerPort(lastPortId, createPortMessage.portName)

  const byTransport = state.portsByTransport.get(transport) || new Map()
  byTransport.set(port.portId, port)
  state.ports.set(port.portId, port)
  state.portsByTransport.set(transport, byTransport)

  await handler(port, transport, context)

  unsafeSyncWriter.reset()
  CreatePortResponse.encode(
    {
      messageIdentifier: calculateMessageIdentifier(
        RpcMessageTypes.RpcMessageTypes_CREATE_PORT_RESPONSE,
        messageNumber
      ),
      portId: port.portId,
    },
    unsafeSyncWriter
  )
  transport.sendMessage(unsafeSyncWriter.finish())

  return port
}

// @internal
export async function handleRequestModule(
  transport: Transport,
  requestModule: RequestModule,
  messageNumber: number,
  state: RpcServerState
) {
  const port = getPortFromState(requestModule.portId, transport, state)

  if (!port) {
    throw new Error(`Cannot find port ${requestModule.portId}`)
  }

  const loadedModule = await port.loadModule(requestModule.moduleName)

  unsafeSyncWriter.reset()
  RequestModuleResponse.encode(
    {
      procedures: loadedModule.procedures,
      messageIdentifier: calculateMessageIdentifier(
        RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE_RESPONSE,
        messageNumber
      ),
      portId: port.portId,
    },
    unsafeSyncWriter
  )
  transport.sendMessage(unsafeSyncWriter.finish())
}

// @internal
export async function handleDestroyPort(
  transport: Transport,
  request: DestroyPort,
  _messageNumber: number,
  state: RpcServerState
) {
  const port = getPortFromState(request.portId, transport, state)

  if (port) {
    port.emit("close", {})
  }
}

// @internal
export async function handleRequest<Context>(
  ackDispatcher: AckDispatcher,
  request: Request,
  messageNumber: number,
  state: RpcServerState,
  transport: Transport,
  context: Context
) {
  const port = getPortFromState(request.portId, transport, state)

  if (!port) {
    unsafeSyncWriter.reset()
    RemoteError.encode(
      {
        messageIdentifier: calculateMessageIdentifier(
          RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE,
          messageNumber
        ),
        errorCode: 0,
        errorMessage: "invalid portId",
      },
      unsafeSyncWriter
    )
    transport.sendMessage(unsafeSyncWriter.finish())
    return
  }

  const result = await port.callProcedure(request.procedureId, request.payload, context)
  const response = Response.fromJSON({
    messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_RESPONSE, messageNumber),
    payload: EMPTY_U8A,
  })

  if (result instanceof Uint8Array) {
    response.payload = result
    unsafeSyncWriter.reset()
    Response.encode(response, unsafeSyncWriter)
    transport.sendMessage(unsafeSyncWriter.finish())
  } else if (result && Symbol.asyncIterator in result) {
    const iter: AsyncGenerator<Uint8Array> = await (result as any)[Symbol.asyncIterator]()
    let sequenceNumber = -1

    const reusedStreamMessage: StreamMessage = StreamMessage.fromJSON({
      closed: false,
      ack: false,
      sequenceId: 0,
      messageIdentifier: 0,
      payload: EMPTY_U8A,
      portId: request.portId,
    })
    try {
      for await (const elem of iter) {
        sequenceNumber++
        reusedStreamMessage.closed = false
        reusedStreamMessage.ack = false
        reusedStreamMessage.sequenceId = sequenceNumber
        reusedStreamMessage.messageIdentifier = calculateMessageIdentifier(
          RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE,
          messageNumber
        )
        reusedStreamMessage.payload = elem
        reusedStreamMessage.portId = request.portId

        // sendWithAck may fail if the transport is closed, effectively
        // ending this iterator.
        const ret = await ackDispatcher.sendWithAck(reusedStreamMessage)

        if (ret.ack) {
          continue
        } else if (ret.closed) {
          // if it was closed remotely, then we end the stream right away
          return
        }
      }
    } finally {
      transport.sendMessage(closeStreamMessage(messageNumber, sequenceNumber, request.portId))
    }
  } else {
    unsafeSyncWriter.reset()
    Response.encode(response, unsafeSyncWriter)
    transport.sendMessage(unsafeSyncWriter.finish())
  }
}

/**
 * @public
 */
export function createRpcServer<Context = {}>(options: CreateRpcServerOptions<Context>): RpcServer<Context> {
  const events = mitt<RpcServerEvents>()
  const state: RpcServerState = {
    ports: new Map(),
    portsByTransport: new Map(),
    transports: new Set(),
  }

  function removeTransport(transport: Transport) {
    const transportPorts = state.portsByTransport.get(transport)
    state.portsByTransport.delete(transport)

    if (transportPorts && transportPorts.size) {
      transportPorts.forEach(($) => $.close())
    }

    if (state.transports.delete(transport)) {
      events.emit("transportClosed", { transport })
    }
  }

  events.on("portClosed", (evt) => {
    const { port } = evt
    state.ports.delete(port.portId)
  })

  function handleTransportError(transport: Transport, error: Error) {
    events.emit("transportError", { transport, error })
    transport.close()
    removeTransport(transport)
  }

  let handler: RpcServerHandler<Context>

  async function handleMessage(
    messageType: number,
    parsedMessage: any,
    messageNumber: number,
    transport: Transport,
    ackHelper: AckDispatcher,
    context: Context
  ) {
    if (messageType == RpcMessageTypes.RpcMessageTypes_REQUEST) {
      await handleRequest(ackHelper, parsedMessage, messageNumber, state, transport, context)
    } else if (messageType == RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE) {
      await handleRequestModule(transport, parsedMessage, messageNumber, state)
    } else if (messageType == RpcMessageTypes.RpcMessageTypes_CREATE_PORT) {
      const port = await handleCreatePort(transport, parsedMessage, messageNumber, options, handler, state, context)
      port.on("close", () => events.emit("portClosed", { port }))
    } else if (messageType == RpcMessageTypes.RpcMessageTypes_DESTROY_PORT) {
      await handleDestroyPort(transport, parsedMessage, messageNumber, state)
    } else if (
      messageType == RpcMessageTypes.RpcMessageTypes_STREAM_ACK ||
      messageType == RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE
    ) {
      await ackHelper.receiveAck(parsedMessage, messageNumber)
    } else {
      transport.emit(
        "error",
        new Error(`Unknown message from client ${JSON.stringify([messageType, parsedMessage, messageNumber])}`)
      )
    }
  }
  return {
    ...events,
    setHandler(_handler) {
      handler = _handler
    },
    attachTransport(newTransport: Transport, context: Context) {
      if (!handler) {
        throw new Error("A handler was not set for this RpcServer")
      }
      state.transports.add(newTransport)
      const ackHelper = createAckHelper(newTransport)
      newTransport.on("message", async (message) => {
        try {
          const reader = Reader.create(message)
          const parsedMessage = parseProtocolMessage(reader)
          if (parsedMessage) {
            const [messageType, message, messageNumber] = parsedMessage
            try {
              await handleMessage(messageType, message, messageNumber, newTransport, ackHelper, context!)
            } catch (err: any) {
              options.logger?.error("Error handling remote request", {
                message: err.message,
                name: err.name,
                stack: err.stack as any,
              })
              unsafeSyncWriter.reset()
              RemoteError.encode(
                {
                  messageIdentifier: calculateMessageIdentifier(
                    RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE,
                    messageNumber
                  ),
                  errorMessage: err.message || "Error processing the request",
                  errorCode: 0,
                },
                unsafeSyncWriter
              )
              newTransport.sendMessage(unsafeSyncWriter.finish())
            }
          } else {
            newTransport.emit("error", new Error(`Transport received unknown message: ${message}`))
          }
        } catch (err: any) {
          newTransport.emit("error", err)
        }
      })

      newTransport.on("close", () => {
        removeTransport(newTransport)
      })

      newTransport.on("error", (error) => {
        options.logger?.error("Error in transport", {
          message: error.message,
          name: error.name,
          stack: error.stack as any,
        })
        handleTransportError(newTransport, error)
      })

      // send the signal to the transport
      newTransport.sendMessage(transportStartMessageSerialized)
    },
  }
}
