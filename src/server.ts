import {
  CallableProcedureServer,
  ModuleGeneratorFunction,
  RpcServer,
  RpcServerEvents,
  RpcServerPort,
  ServerModuleDefinition,
  Transport,
} from "./types"
import mitt from "mitt"
import { Writer, Reader } from "protobufjs"
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
} from "./protocol/pbjs"

let lastPortId = 0

type RpcServerState = {
  transports: Set<Transport>
  ports: Map<number, RpcServerPort>
  portsByTransport: Map<Transport, Map<number, RpcServerPort>>
}

/**
 * @public
 */
export type CreateRpcServerOptions = {
  initializePort: (serverPort: RpcServerPort, transport: Transport) => Promise<void>
}

function getServerReadyMessage() {
  const bb = new Writer()
  RpcMessageHeader.encode(
    {
      messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_SERVER_READY, 0),
    },
    bb
  )
  return bb.finish()
}

const transportStartMessageSerialized = getServerReadyMessage()

function moduleProcedures(module: ServerModuleDefinition) {
  return Array.from(Object.entries(module)).filter(([name, value]) => typeof value == "function")
}

/**
 * @internal
 */
export function createServerPort(portId: number, portName: string): RpcServerPort {
  const events = mitt<RpcPortEvents>()
  const loadedModules = new Map<string, Promise<ServerModuleDeclaration>>()
  const procedures = new Map<number, CallableProcedureServer>()
  const registeredModules = new Map<string, ModuleGeneratorFunction>()

  const port: RpcServerPort = {
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

  async function registerModule(moduleName: string, generator: ModuleGeneratorFunction) {
    if (registeredModules.has(moduleName)) {
      throw new Error(`module ${moduleName} is already registered for port ${portName} (${portId}))`)
    }
    registeredModules.set(moduleName, generator)
  }

  async function loadModuleFromGenerator(
    moduleFuture: Promise<ServerModuleDefinition>
  ): Promise<ServerModuleDeclaration> {
    const module = await moduleFuture

    const ret: ServerModuleDeclaration = {
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

  function loadModule(moduleName: string): Promise<ServerModuleDeclaration> {
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

  function callProcedure(procedureId: number, payload: Uint8Array): AsyncProcedureResultServer {
    const procedure = procedures.get(procedureId)!
    if (!procedure) {
      throw new Error(`procedureId ${procedureId} is missing in ${portName} (${portId}))`)
    }
    return procedure(payload)
  }

  return port
}

function getPortFromState(portId: number, transport: Transport, state: RpcServerState) {
  return state.portsByTransport.get(transport)?.get(portId)
}

// @internal
export async function handleCreatePort(
  transport: Transport,
  createPortMessage: CreatePort,
  messageNumber: number,
  options: CreateRpcServerOptions,
  state: RpcServerState
) {
  lastPortId++

  const port = createServerPort(lastPortId, createPortMessage.portName)

  const byTransport = state.portsByTransport.get(transport) || new Map()
  byTransport.set(port.portId, port)
  state.ports.set(port.portId, port)
  state.portsByTransport.set(transport, byTransport)

  await options.initializePort(port, transport)

  const bb = new Writer()
  CreatePortResponse.encode(
    {
      messageIdentifier: calculateMessageIdentifier(
        RpcMessageTypes.RpcMessageTypes_CREATE_PORT_RESPONSE,
        messageNumber
      ),
      portId: port.portId,
    },
    bb
  )
  transport.sendMessage(bb.finish())

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

  const bb = new Writer()
  RequestModuleResponse.encode(
    {
      procedures: loadedModule.procedures,
      messageIdentifier: calculateMessageIdentifier(
        RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE_RESPONSE,
        messageNumber
      ),
      portId: port.portId,
    },
    bb
  )
  transport.sendMessage(bb.finish())
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
export async function handleRequest(
  ackDispatcher: AckDispatcher,
  request: Request,
  messageNumber: number,
  state: RpcServerState,
  transport: Transport
) {
  const port = getPortFromState(request.portId, transport, state)

  if (!port) {
    const bb = new Writer()
    RemoteError.encode(
      {
        messageIdentifier: calculateMessageIdentifier(
          RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE,
          messageNumber
        ),
        errorCode: 0,
        errorMessage: "invalid portId",
      },
      bb
    )
    transport.sendMessage(bb.finish())
    return
  }

  const result = await port.callProcedure(request.procedureId, request.payload)
  const response = Response.create({
    messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_RESPONSE, messageNumber),
    payload: Uint8Array.from([]),
  })

  if (result instanceof Uint8Array) {
    response.payload = result
    const bb = new Writer()
    Response.encode(response, bb)
    transport.sendMessage(bb.finish())
  } else if (result && Symbol.asyncIterator in result) {
    const iter: AsyncGenerator<Uint8Array> = await (result as any)[Symbol.asyncIterator]()
    let sequenceNumber = -1

    const reusedStreamMessage: StreamMessage = StreamMessage.create({
      closed: false,
      ack: false,
      sequenceId: 0,
      messageIdentifier: 0,
      payload: Uint8Array.of(),
      portId: request.portId,
    })

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
      // we use Promise.race to react to the transport close events
      const ret = await Promise.race([
        ackDispatcher.sendWithAck(reusedStreamMessage),
        new Promise<StreamMessage>((_, reject) =>
          transport.on("close", () => reject(new Error("Transport closed while sending stream")))
        ),
      ])

      if (ret.ack) {
        continue
      } else if (ret.closed) {
        // if it was closed remotely, then we end the stream right away
        return
      }
    }
    transport.sendMessage(closeStreamMessage(messageNumber, sequenceNumber, request.portId))
  } else {
    const bb = new Writer()
    Response.encode(response, bb)
    transport.sendMessage(bb.finish())
  }
}

/**
 * @public
 */
export function createRpcServer(options: CreateRpcServerOptions): RpcServer {
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

  async function handleMessage(
    messageType: number,
    parsedMessage: any,
    messageNumber: number,
    transport: Transport,
    ackHelper: AckDispatcher
  ) {
    if (messageType == RpcMessageTypes.RpcMessageTypes_REQUEST) {
      await handleRequest(ackHelper, parsedMessage, messageNumber, state, transport)
    } else if (messageType == RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE) {
      await handleRequestModule(transport, parsedMessage, messageNumber, state)
    } else if (messageType == RpcMessageTypes.RpcMessageTypes_CREATE_PORT) {
      const port = await handleCreatePort(transport, parsedMessage, messageNumber, options, state)
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
    attachTransport(newTransport: Transport) {
      state.transports.add(newTransport)
      const ackHelper = createAckHelper(newTransport)
      newTransport.on("message", async (message) => {
        try {
          const reader = Reader.create(message)
          const parsedMessage = parseProtocolMessage(reader)
          if (parsedMessage) {
            const [messageType, message, messageNumber] = parsedMessage
            try {
              await handleMessage(messageType, message, messageNumber, newTransport, ackHelper)
            } catch (err: any) {
              const bb = new Writer()
              RemoteError.encode(
                {
                  messageIdentifier: calculateMessageIdentifier(
                    RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE,
                    messageNumber
                  ),
                  errorMessage: err.message || "Error processing the request",
                  errorCode: 0,
                },
                bb
              )
              newTransport.sendMessage(bb.finish())
            }
          } else {
            newTransport.emit("error", new Error(`Unknown message ${message}`))
          }
        } catch (err: any) {
          newTransport.emit("error", err)
        }
      })

      newTransport.on("close", () => {
        removeTransport(newTransport)
      })

      newTransport.on("error", (error) => {
        handleTransportError(newTransport, error)
      })

      // send the signal to the transport
      newTransport.sendMessage(transportStartMessageSerialized)
    },
  }
}
