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
import { getMessageType } from "./proto-helpers"
import { AsyncProcedureResultServer, RpcPortEvents, ServerModuleDeclaration } from "."
import { AckDispatcher, createAckHelper } from "./ack-helper"

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
const reusedStreamMessage = new StreamMessage()
reusedStreamMessage.setMessageType(RpcMessageTypes.RPCMESSAGETYPES_STREAM_MESSAGE)
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
    throw new Error("close() not implemented")
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

// @internal
export function parseClientMessage(reader: BinaryReader) {
  const messageType = getMessageType(reader)
  reader.reset()

  switch (messageType) {
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST:
      return Request.deserializeBinaryFromReader(new Request(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT:
      return CreatePort.deserializeBinaryFromReader(new CreatePort(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_STREAM_ACK:
      return StreamMessage.deserializeBinaryFromReader(new StreamMessage(), reader)
    case RpcMessageTypes.RPCMESSAGETYPES_REQUEST_MODULE:
      return RequestModule.deserializeBinaryFromReader(new RequestModule(), reader)
  }
}

/**
 * @public
 */
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

  async function handleCreatePort(transport: Transport, createPortMessage: CreatePort) {
    lastPortId++

    const port = createServerPort(lastPortId, createPortMessage.getPortName())

    const byTransport = portsByTransport.get(transport) || new Map()
    byTransport.set(port.portId, port)
    portsByTransport.set(transport, byTransport)
    ports.set(port.portId, port)

    await options.initializePort(port, transport)

    reusedCreatePortResponse.setMessageId(createPortMessage.getMessageId())
    reusedCreatePortResponse.setCreatedPortId(port.portId)
    transport.sendMessage(reusedCreatePortResponse.serializeBinary())
  }

  async function handleRequestModule(transport: Transport, requestModule: RequestModule) {
    const port = portsByTransport.get(transport)?.get(requestModule.getPortId())

    if (!port) {
      throw new Error(`Cannot find port ${requestModule.getPortId()}`)
    }

    const loadedModule = await port.loadModule(requestModule.getModuleName())

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
    transport.sendMessage(reusedRequestModuleResponse.serializeBinary())
  }

  async function handleRequest(ackDispatcher: AckDispatcher, request: Request) {
    const port = portsByTransport.get(ackDispatcher.transport)?.get(request.getPortId())

    if (!port) {
      reusedRemoteError.setMessageId(request.getMessageId())
      reusedRemoteError.setErrorMessage("invalid portId")
      ackDispatcher.transport.sendMessage(reusedRemoteError.serializeBinary())
      return
    }

    const result = await port.callProcedure(request.getProcedureId(), request.getPayload_asU8())

    if (result instanceof Uint8Array) {
      reusedResponse.setMessageId(request.getMessageId())
      reusedResponse.setPayload(result)
      ackDispatcher.transport.sendMessage(reusedResponse.serializeBinary())
    } else if (result && Symbol.asyncIterator in result) {
      const iter: AsyncGenerator<Uint8Array> = (result as any)[Symbol.asyncIterator]()
      let sequenceNumber = -1
      for await (const elem of iter) {
        sequenceNumber++
        reusedStreamMessage.setSequenceId(sequenceNumber)
        reusedStreamMessage.setMessageId(request.getMessageId())
        reusedStreamMessage.setPayload(elem)
        reusedStreamMessage.setPortId(request.getPortId())
        const ret = await ackDispatcher.sendWithAck(reusedStreamMessage)

        if (ret.getAck()) {
          continue
        } else if (ret.getClosed()) {
          break
        }
      }

      reusedStreamMessage.setSequenceId(sequenceNumber)
      reusedStreamMessage.setMessageId(request.getMessageId())
      reusedStreamMessage.setPortId(request.getPortId())
      reusedStreamMessage.clearPayload()
      reusedStreamMessage.setClosed(true)
      ackDispatcher.transport.sendMessage(reusedStreamMessage.serializeBinary())
    } else {
      reusedResponse.setMessageId(request.getMessageId())
      reusedResponse.setPayload("")
      ackDispatcher.transport.sendMessage(reusedResponse.serializeBinary())
    }
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

  return {
    ...events,
    attachTransport(newTransport: Transport) {
      transports.add(newTransport)
      const ackHelper = createAckHelper(newTransport)
      newTransport.on("message", (message) => {
        const reader = new BinaryReader(message)
        const parsedMessage = parseClientMessage(reader)
        if (parsedMessage instanceof Request) {
          handleWithErrorMessage(handleRequest(ackHelper, parsedMessage), parsedMessage, newTransport)
        } else if (parsedMessage instanceof RequestModule) {
          handleWithErrorMessage(handleRequestModule(newTransport, parsedMessage), parsedMessage, newTransport)
        } else if (parsedMessage instanceof CreatePort) {
          handleWithErrorMessage(handleCreatePort(newTransport, parsedMessage), parsedMessage, newTransport)
        } else if (parsedMessage instanceof StreamMessage) {
          // noop
        } else {
          handleTransportError(
            newTransport,
            new Error(`Unknown message ${JSON.stringify((parsedMessage as any)?.toObject())}`)
          )
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
