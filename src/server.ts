import {
  CallableProcedure,
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
  RemoteError,
  Request,
  RequestModule,
  RequestModuleResponse,
  Response,
  RpcMessageHeader,
  RpcMessageTypes,
  StreamAck,
} from "./protocol/index_pb"
import { BinaryReader } from "google-protobuf"
import { getMessageType } from "./proto-helpers"
import { AsyncProcedureResult, ClientModuleDefinition, RpcPortEvents } from "."
import { log } from "./logger"

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

function moduleProcedures(module: ClientModuleDefinition) {
  return Array.from(Object.entries(module)).filter(([name, value]) => typeof value == "function")
}

/**
 * @internal
 */
export function createServerPort(portId: number, portName: string): RpcServerPort {
  const events = mitt<RpcPortEvents>()
  const loadedModules = new Map<string, Promise<ServerModuleDefinition>>()
  const procedures = new Map<number, CallableProcedure>()
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
    throw new Error("close() not implemented")
  }

  async function registerModule(moduleName: string, generator: ModuleGeneratorFunction) {
    if (registeredModules.has(moduleName)) {
      throw new Error(`module ${moduleName} is already registered for port ${portName} (${portId}))`)
    }
    registeredModules.set(moduleName, generator)
  }

  async function loadModuleFromGenerator(
    moduleFuture: Promise<ClientModuleDefinition>
  ): Promise<ServerModuleDefinition> {
    const module = await moduleFuture

    const ret: ServerModuleDefinition = {
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

  function loadModule(moduleName: string): Promise<ServerModuleDefinition> {
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

  async function callProcedure(procedureId: number, payload: Uint8Array): AsyncProcedureResult {
    const procedure = procedures.get(procedureId)!
    if (!procedure) {
      throw new Error(`procedureId ${procedureId} is missing in ${portName} (${portId}))`)
    }
    return procedure(payload)
  }

  return port
}

function parseClientMessage(reader: BinaryReader) {
  const messageType = getMessageType(reader)
  reader.reset()

  switch (messageType) {
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST:
      return Request.deserializeBinaryFromReader(new Request(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT:
      return CreatePort.deserializeBinaryFromReader(new CreatePort(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_STREAM_ACK:
      return StreamAck.deserializeBinaryFromReader(new StreamAck(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE:
      return RequestModule.deserializeBinaryFromReader(new RequestModule(), reader)
    default:
      throw new Error(`Unknown message from RPC server: ${messageType}`)
  }
}

export function createRpcServer(options: CreateRpcServerOptions): RpcServer {
  const events = mitt<RpcServerEvents>()
  const transports = new Set<Transport>()
  const ports = new Map<number, RpcServerPort>()
  const portsByTransport = new Map<Transport, Map<number, RpcServerPort>>()
  let lastPortId = 0

  function closePort(port: RpcServerPort) {
    port.close()
    events.emit("portClosed", { port })
  }

  function removeTransport(transport: Transport) {
    const transportPorts = portsByTransport.get(transport)
    portsByTransport.delete(transport)

    if (transportPorts && transportPorts.size) {
      transportPorts.forEach(closePort)
    }

    if (transports.delete(transport)) {
      events.emit("transportClosed", { transport })
    }
  }

  events.on("portClosed", (evt) => {
    const { port } = evt
    ports.delete(port.portId)
  })

  function handleTransportError(transport: Transport, error: Error) {
    events.emit("transportError", { transport, error })
    transport.close()
    removeTransport(transport)
  }

  function handleCreatePort(transport: Transport, createPortMessage: CreatePort) {
    lastPortId++

    const port = createServerPort(lastPortId, createPortMessage.getPortName())

    const byTransport = portsByTransport.get(transport) || new Map()
    byTransport.set(port.portId, port)
    portsByTransport.set(transport, byTransport)
    ports.set(port.portId, port)

    options
      .initializePort(port, transport)
      .then(() => {
        log(`! Port created ${port.portId} ${port.portName}`)
        reusedCreatePortResponse.setMessageId(createPortMessage.getMessageId())
        reusedCreatePortResponse.setCreatedPortId(port.portId)
        transport.sendMessage(reusedCreatePortResponse.serializeBinary())
      })
      .catch((err) => {
        reusedRemoteError.setMessageId(createPortMessage.getMessageId())
        reusedRemoteError.setErrorMessage(err.message)
        transport.sendMessage(reusedRemoteError.serializeBinary())
        events.emit("portClosed", { port })
      })
  }

  function handleRequestModule(transport: Transport, requestModule: RequestModule) {
    const port = portsByTransport.get(transport)?.get(requestModule.getPortId())

    if (!port) {
      throw new Error(`Cannot find port ${requestModule.getPortId()}`)
    }

    port
      .loadModule(requestModule.getModuleName())
      .then((loadedModule) => {
        reusedRequestModuleResponse.setMessageId(requestModule.getMessageId())
        reusedRequestModuleResponse.setPortId(port.portId)
        reusedRequestModuleResponse.setModuleName(requestModule.getModuleName())
        reusedRequestModuleResponse.setProceduresList([])
        for (const procedure of loadedModule.procedures) {
          const n = new RequestModuleResponse.ModuleProcedure()
          n.setProcedureId(procedure.procedureId)
          n.setProcedureName(procedure.procedureName)
          reusedRequestModuleResponse.addProcedures(n)
        }
        log(`! Sending to client ${JSON.stringify(reusedRequestModuleResponse.toObject())}`)
        transport.sendMessage(reusedRequestModuleResponse.serializeBinary())
      })
      .catch((err) => {
        reusedRemoteError.setMessageId(requestModule.getMessageId())
        reusedRemoteError.setErrorMessage(err.message)
        transport.sendMessage(reusedRemoteError.serializeBinary())
        events.emit("portClosed", { port })
      })
  }
  
  function handleRequest(transport: Transport, request: Request) {
    const port = portsByTransport.get(transport)?.get(request.getPortId())

    if (!port) {
      reusedRemoteError.setMessageId(request.getMessageId())
      reusedRemoteError.setErrorMessage('invalid portId')
      transport.sendMessage(reusedRemoteError.serializeBinary())
      return
    }

    port
      .callProcedure(request.getProcedureId(), request.getPayload_asU8())
      .then((result) => {
        reusedResponse.setMessageId(request.getMessageId())
        if(result instanceof Uint8Array) {
          reusedResponse.setPayload(result)
        } else if(!result) {
          reusedResponse.clearPayload()
        }
        transport.sendMessage(reusedResponse.serializeBinary())
      })
      .catch((err) => {
        reusedRemoteError.setMessageId(request.getMessageId())
        reusedRemoteError.setErrorMessage(err.message)
        transport.sendMessage(reusedRemoteError.serializeBinary())
        events.emit("portClosed", { port })
      })
  }

  return {
    ...events,
    attachTransport(newTransport: Transport) {
      transports.add(newTransport)
      newTransport.on("message", (message) => {
        const reader = new BinaryReader(message)
        const parsedMessage = parseClientMessage(reader)
        if (parsedMessage) {
          log(`Server received #${parsedMessage.getMessageId()}: ${JSON.stringify(parsedMessage.toObject())}`)
        }
        if (parsedMessage instanceof Request) {
          handleRequest(newTransport, parsedMessage)
        } else if (parsedMessage instanceof RequestModule) {
          handleRequestModule(newTransport, parsedMessage)
        } else if (parsedMessage instanceof CreatePort) {
          handleCreatePort(newTransport, parsedMessage)
        } else {
          log(`UNKNOWN MESSAGE #${parsedMessage?.getMessageId()}: ${JSON.stringify(parsedMessage?.toObject())}`)
          handleTransportError(newTransport, new Error(`Unknown message ${JSON.stringify(parsedMessage?.toObject())}`))
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
