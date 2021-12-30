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
import {
  CreatePort,
  CreatePortResponse,
  ModuleProcedure,
  RemoteError,
  Request,
  RequestModule,
  RequestModuleResponse,
  Response,
  RpcMessageHeader,
  RpcMessageTypes,
  StreamMessage,
} from "./protocol/index_pb"
import { BinaryReader } from "google-protobuf"
import { AsyncProcedureResultServer, RpcPortEvents, ServerModuleDeclaration } from "."
import { AckDispatcher, createAckHelper } from "./ack-helper"
import { closeStreamMessage, getMessageType, parseProtocolMessage } from "./protocol/helpers"

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
  const transportStartMessage = new RpcMessageHeader()
  transportStartMessage.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_SERVER_READY)
  return transportStartMessage.serializeBinary()
}

const transportStartMessageSerialized = getServerReadyMessage()

const reusedCreatePortResponse = new CreatePortResponse()
reusedCreatePortResponse.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT_RESPONSE)
const reusedRequestModuleResponse = new RequestModuleResponse()
reusedRequestModuleResponse.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE_RESPONSE)
const reusedResponse = new Response()
reusedResponse.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_RESPONSE)

const reusedRemoteError = new RemoteError()
reusedRemoteError.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_REMOTE_ERROR_RESPONSE)

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
  options: CreateRpcServerOptions,
  state: RpcServerState
) {
  lastPortId++

  const port = createServerPort(lastPortId, createPortMessage.getPortName())

  const byTransport = state.portsByTransport.get(transport) || new Map()
  byTransport.set(port.portId, port)
  state.ports.set(port.portId, port)
  state.portsByTransport.set(transport, byTransport)

  await options.initializePort(port, transport)

  reusedCreatePortResponse.setMessageId(createPortMessage.getMessageId())
  reusedCreatePortResponse.setPortId(port.portId)
  transport.sendMessage(reusedCreatePortResponse.serializeBinary())
}

// @internal
export async function handleRequestModule(transport: Transport, requestModule: RequestModule, state: RpcServerState) {
  const port = getPortFromState(requestModule.getPortId(), transport, state)

  if (!port) {
    throw new Error(`Cannot find port ${requestModule.getPortId()}`)
  }

  const loadedModule = await port.loadModule(requestModule.getModuleName())

  reusedRequestModuleResponse.setMessageId(requestModule.getMessageId())
  reusedRequestModuleResponse.setPortId(port.portId)
  reusedRequestModuleResponse.setProceduresList([])
  for (const procedure of loadedModule.procedures) {
    const n = new ModuleProcedure()
    n.setProcedureId(procedure.procedureId)
    n.setProcedureName(procedure.procedureName)
    reusedRequestModuleResponse.addProcedures(n)
  }
  transport.sendMessage(reusedRequestModuleResponse.serializeBinary())
}

// @internal
export async function handleRequest(ackDispatcher: AckDispatcher, request: Request, state: RpcServerState) {
  const port = getPortFromState(request.getPortId(), ackDispatcher.transport, state)

  if (!port) {
    reusedRemoteError.setMessageId(request.getMessageId())
    reusedRemoteError.setErrorMessage("invalid portId")
    ackDispatcher.transport.sendMessage(reusedRemoteError.serializeBinary())
    return
  }

  const result = await port.callProcedure(request.getProcedureId(), request.getPayload_asU8())
  reusedResponse.setMessageId(request.getMessageId())
  reusedResponse.setPayload("")

  if (result instanceof Uint8Array) {
    reusedResponse.setPayload(result)
    ackDispatcher.transport.sendMessage(reusedResponse.serializeBinary())
  } else if (result && Symbol.asyncIterator in result) {
    const iter: AsyncGenerator<Uint8Array> = await (result as any)[Symbol.asyncIterator]()
    let sequenceNumber = -1

    const reusedStreamMessage = new StreamMessage()
    reusedStreamMessage.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_STREAM_MESSAGE)

    const transportClosedRejection = new Promise<StreamMessage>((_, reject) =>
      ackDispatcher.transport.on("close", reject)
    )

    for await (const elem of iter) {
      sequenceNumber++
      reusedStreamMessage.setClosed(false)
      reusedStreamMessage.setAck(false)
      reusedStreamMessage.setSequenceId(sequenceNumber)
      reusedStreamMessage.setMessageId(request.getMessageId())
      reusedStreamMessage.setPayload(elem)
      reusedStreamMessage.setPortId(request.getPortId())
      // we use Promise.race to react to the transport close events
      const ret = await Promise.race([ackDispatcher.sendWithAck(reusedStreamMessage), transportClosedRejection])

      if (ret.getAck()) {
        continue
      } else if (ret.getClosed()) {
        // if it was closed remotely, then we end the stream right away
        return
      }
    }
    ackDispatcher.transport.sendMessage(closeStreamMessage(request.getMessageId(), sequenceNumber, request.getPortId()))
  } else {
    ackDispatcher.transport.sendMessage(reusedResponse.serializeBinary())
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

  function closePort(port: RpcServerPort) {
    port.close()
    events.emit("portClosed", { port })
  }

  function removeTransport(transport: Transport) {
    const transportPorts = state.portsByTransport.get(transport)
    state.portsByTransport.delete(transport)

    if (transportPorts && transportPorts.size) {
      transportPorts.forEach(closePort)
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

  function handleWithErrorMessage(
    promise: Promise<any>,
    parsedMessage: { getMessageId(): number },
    transport: Transport
  ) {
    promise.catch((err) => {
      reusedRemoteError.setMessageId(parsedMessage.getMessageId())
      reusedRemoteError.setErrorMessage(err.message)
      transport.sendMessage(reusedRemoteError.serializeBinary())
    })
  }

  async function handleMessage(parsedMessage: any, transport: Transport, ackHelper: AckDispatcher) {
    if (parsedMessage instanceof Request) {
      await handleRequest(ackHelper, parsedMessage, state)
    } else if (parsedMessage instanceof RequestModule) {
      await handleRequestModule(transport, parsedMessage, state)
    } else if (parsedMessage instanceof CreatePort) {
      await handleCreatePort(transport, parsedMessage, options, state)
    } else if (parsedMessage instanceof StreamMessage) {
      // noop
    } else {
      transport.emit("error", new Error(`Unknown message ${JSON.stringify((parsedMessage as any)?.toObject())}`))
    }
  }

  return {
    ...events,
    attachTransport(newTransport: Transport) {
      state.transports.add(newTransport)
      const ackHelper = createAckHelper(newTransport)
      newTransport.on("message", (message) => {
        const reader = new BinaryReader(message)
        const parsedMessage = parseProtocolMessage(reader)
        if (parsedMessage) {
          handleWithErrorMessage(handleMessage(parsedMessage, newTransport, ackHelper), parsedMessage, newTransport)
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
