import { Emitter } from "mitt"

/**
 * @public
 */
export type TransportEvents = {
  /**
   * The connect event is emited when the transport gets connected.
   *
   * The RpcServer is in charge to send the notification (bytes[1]\{0x0\})
   * to signal the client transport that it is connected.
   */
  connect: {}

  /** the onMessage callback is called when the transport receives a message */
  message: Uint8Array

  /** the error event is emited when the transport triggers an error */
  error: Error

  /** the close function will be called when it is decided to end the communication */
  close: {}
}

/**
 * @public
 */
export type Transport = Emitter<TransportEvents> & {
  /** sendMessage is used to send a message through the transport */
  sendMessage(message: Uint8Array): void
  close(): void
}
/**
 * @public
 */
export type AsyncProcedureResultServer = Promise<Uint8Array | void> | AsyncGenerator<Uint8Array>
/**
 * @public
 */
export type AsyncProcedureResultClient = Promise<Uint8Array | AsyncGenerator<Uint8Array> | void>
/**
 * @public
 */
export type CallableProcedureServer = (payload: Uint8Array) => AsyncProcedureResultServer
/**
 * @public
 */
export type CallableProcedureClient = (payload: Uint8Array) => AsyncProcedureResultClient
/**
 * @public
 */
export type ServerModuleProcedure = {
  procedureName: string
  procedureId: number
  callable: CallableProcedureServer
}
/**
 * @public
 */
export type ServerModuleDeclaration = {
  procedures: ServerModuleProcedure[]
}
/**
 * @public
 */
export type ServerModuleDefinition = Record<string, CallableProcedureServer>
/**
 * @public
 */
export type ClientModuleDefinition = Record<string, CallableProcedureClient>
/**
 * @public
 */
export type SendableMessage = {
  setMessageId(number: number): void
  serializeBinary(): Uint8Array
}

////////////////////////////////////////////////////////////////////////
////////////////////////////// Rpc Client //////////////////////////////
////////////////////////////////////////////////////////////////////////

/**
 * @public
 */
export type RpcPortEvents = {
  close: {}
}

/**
 * @public
 */
export type RpcClientPort = Emitter<RpcPortEvents> & {
  readonly portId: number
  readonly portName: string
  loadModule(moduleName: string): Promise<unknown>
  close(): void
}

/**
 * @public
 */
export type RpcClient = {
  createPort(portName: string): Promise<RpcClientPort>
}

////////////////////////////////////////////////////////////////////////
////////////////////////////// Rpc Server //////////////////////////////
////////////////////////////////////////////////////////////////////////

/**
 * @public
 */
export type ModuleGeneratorFunction = (port: RpcServerPort) => Promise<ServerModuleDefinition>

/**
 * @public
 */
export type RpcServerPort = Emitter<RpcPortEvents> & {
  readonly portId: number
  readonly portName: string
  /**
   * Used to register the available APIs for the specified port
   */
  registerModule(moduleName: string, moduleDefinition: ModuleGeneratorFunction): void
  /**
   * Used to load modules based on their definition and availability.
   */
  loadModule(moduleName: string): Promise<ServerModuleDeclaration>
  callProcedure(procedureId: number, argument: Uint8Array): AsyncProcedureResultServer
  close(): void
}

/**
 * @public
 */
export type RpcServerEvents = {
  portCreated: { port: RpcServerPort }
  portClosed: { port: RpcServerPort }
  transportClosed: { transport: Transport }
  transportError: { transport: Transport; error: Error }
}

/**
 * Once a transport is created and ready to be used, it must be
 * attached to the server to wire the business logic that creates the
 * modules. Servers are only helper functions that maps ports to
 * their implementation of functions.
 *
 * Once transports are closed, all the ports belonging to the transport
 * are closed.
 *
 * The RpcServer also generates the portIds.
 * @public
 */
export type RpcServer = Emitter<RpcServerEvents> & {
  attachTransport(transport: Transport): void
}
