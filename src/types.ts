import { Emitter } from "mitt"

export type TransportEvents = {
  /**
   * The connect event is emited when the transport gets connected.
   *
   * The RpcServer is in charge to send the notification (bytes[1]{0x0})
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

export type Transport = Emitter<TransportEvents> & {
  /** sendMessage is used to send a message through the transport */
  sendMessage(message: Uint8Array): void
  close(): void
}

export type AsyncProcedureResult = Promise<Uint8Array | AsyncGenerator<Uint8Array> | void>
export type CallableProcedure = (payload: Uint8Array) => AsyncProcedureResult

export type ServerModuleProcedure = {
  procedureName: string
  procedureId: number
  callable: CallableProcedure
}

export type ServerModuleDefinition = {
  procedures: ServerModuleProcedure[]
}

export type ClientModuleDefinition = Record<string, CallableProcedure>

export type SendableMessage = {
  setMessageId(number: number): void
  serializeBinary(): Uint8Array
}

////////////////////////////////////////////////////////////////////////
////////////////////////////// Rpc Client //////////////////////////////
////////////////////////////////////////////////////////////////////////

export type RpcPortEvents = {
  close: {}
}

export type RpcClientPort = Emitter<RpcPortEvents> & {
  readonly portId: number
  readonly portName: string
  loadModule(moduleName: string): Promise<unknown>
  close(): void
}

export type RpcClient = {
  createPort(portName: string): Promise<RpcClientPort>
}

////////////////////////////////////////////////////////////////////////
////////////////////////////// Rpc Server //////////////////////////////
////////////////////////////////////////////////////////////////////////

export type ModuleGeneratorFunction = (port: RpcServerPort) => Promise<ClientModuleDefinition>

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
  loadModule(moduleName: string): Promise<ServerModuleDefinition>
  callProcedure(procedureId: number, argument: Uint8Array): AsyncProcedureResult
  close(): void
}

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
 */
export type RpcServer = Emitter<RpcServerEvents> & {
  attachTransport(transport: Transport): void
}
