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
export type Transport = Pick<Emitter<TransportEvents>, "on" | "emit"> & {
  /** sendMessage is used to send a message through the transport */
  sendMessage(message: Uint8Array): void
  close(): void
  readonly isConnected: boolean
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
export type CallableProcedureServer<Context> = (payload: Uint8Array | AsyncIterable<Uint8Array>, context: Context) => AsyncProcedureResultServer
/**
 * @public
 */
export type CallableProcedureClient = (payload: Uint8Array | AsyncIterable<Uint8Array>) => AsyncProcedureResultClient
/**
 * @public
 */
export type ServerModuleProcedure<Context> = {
  procedureName: string
  procedureId: number
  callable: CallableProcedureServer<Context>
}
/**
 * @public
 */
export type ServerModuleDeclaration<Context> = {
  procedures: ServerModuleProcedure<Context>[]
}
/**
 * @public
 */
export type ServerModuleDefinition<Context> = Record<string, CallableProcedureServer<Context>>
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
export type RpcClientPort = Pick<Emitter<RpcPortEvents>, "on" | "all"> & {
  readonly portId: number
  readonly portName: string
  loadModule(moduleName: string): Promise<unknown>
  close(): void
  readonly state: "open" | "closed"
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
export type ModuleGeneratorFunction<Context> = (
  port: RpcServerPort<Context>,
  context: Context
) => Promise<ServerModuleDefinition<Context>>

/**
 * @public
 */
export type RpcServerPort<Context> = Pick<Emitter<RpcPortEvents>, "on" | "emit"> & {
  readonly portId: number
  readonly portName: string
  /**
   * Used to register the available APIs for the specified port
   */
  registerModule(moduleName: string, moduleDefinition: ModuleGeneratorFunction<Context>): void
  /**
   * Used to load modules based on their definition and availability.
   */
  loadModule(moduleName: string): Promise<ServerModuleDeclaration<any>>
  callProcedure(procedureId: number, argument: Uint8Array | AsyncIterable<Uint8Array>, context: Context): AsyncProcedureResultServer
  close(): void
}

/**
 * @public
 */
export type RpcServerEvents = {
  portCreated: { port: RpcServerPort<any> }
  portClosed: { port: RpcServerPort<any>; transport: Transport }
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
export type RpcServer<Context = {}> = Pick<Emitter<RpcServerEvents>, "on" | "emit"> & {
  attachTransport(transport: Transport, context: Context): void
  setHandler(handler: RpcServerHandler<Context>): void
}

/**
 * @public
 */
export type RpcServerHandler<Context> = (
  serverPort: RpcServerPort<Context>,
  transport: Transport,
  context: Context
) => Promise<void>
