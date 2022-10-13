import {
  createRpcClient,
  createRpcServer,
  CreateRpcServerOptions,
  RpcServerHandler,
  Transport,
} from "../src"
import { log } from "./logger"
import { inspect } from "util"
import { MemoryTransport, MemoryTransportOptions } from "../src/transports/Memory"
import { parseMessageIdentifier, parseProtocolMessage } from "../src/protocol/helpers"
import { Reader } from "protobufjs/minimal"
import { RpcMessageTypes } from "../src/protocol"

// async Array.from(generator*) with support for max elements
export async function takeAsync<T>(iter: AsyncIterable<T>, max?: number) {
  let r: T[] = []
  let counter = 0
  for await (const $ of iter) {
    r.push($)
    counter++
    if (counter === max) break
  }
  return r
}

function serialize(data: Uint8Array) {
  const ret = parseProtocolMessage(Reader.create(data))
  if (!ret) return inspect(data)
  return ret[1]
}

function rpcMessageTypeToString(messageType: RpcMessageTypes) {
  switch (messageType) {
    case RpcMessageTypes.RpcMessageTypes_EMPTY: return 'EMPTY'
    case RpcMessageTypes.RpcMessageTypes_REQUEST: return 'REQUEST'
    case RpcMessageTypes.RpcMessageTypes_RESPONSE: return 'RESPONSE'
    case RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE: return 'STREAM_MESSAGE'
    case RpcMessageTypes.RpcMessageTypes_STREAM_ACK: return 'STREAM_ACK'
    case RpcMessageTypes.RpcMessageTypes_CREATE_PORT: return 'CREATE_PORT'
    case RpcMessageTypes.RpcMessageTypes_CREATE_PORT_RESPONSE: return 'CREATE_PORT_RESPONSE'
    case RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE: return 'REQUEST_MODULE'
    case RpcMessageTypes.RpcMessageTypes_REQUEST_MODULE_RESPONSE: return 'REQUEST_MODULE_RESPONSE'
    case RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE: return 'REMOTE_ERROR_RESPONSE'
    case RpcMessageTypes.RpcMessageTypes_DESTROY_PORT: return 'DESTROY_PORT'
    case RpcMessageTypes.RpcMessageTypes_SERVER_READY: return 'SERVER_READY'
    case RpcMessageTypes.UNRECOGNIZED: return 'UNRECOGNIZED'
  }
}

export function instrumentTransport(transport: Transport, name: string) {
  if (typeof it == "function" && process.env.INSTRUMENT_TRANSPORT) {
    transport.on("close", (data) => {
      log(`  (${name}): closed`)
    })
    transport.on("error", (data) => {
      log(`  (${name} error): ${data}`)
    })
    transport.on("message", (data) => {
      try {
        const message = serialize(data)
        const [messageType, messageNumber] = message ? parseMessageIdentifier(serialize(data).messageIdentifier) : [0, 0]
        log(`  (message->${name}): ${rpcMessageTypeToString(messageType)} ${messageNumber} ${JSON.stringify(serialize(data))}`)
      } catch (err) {
        console.error(err)
      }
    })
  }
}

export function instrumentMemoryTransports(memoryTransport: ReturnType<typeof MemoryTransport>) {
  const { client, server } = memoryTransport

  log("> Creating memory transport")

  // only instrument while running tests
  instrumentTransport(client, "client")
  instrumentTransport(server, "server")

  return memoryTransport
}

export function createSimpleTestEnvironment<Context>(
  handler: RpcServerHandler<Context>,
  options: CreateRpcServerOptions<Context> = {}
) {
  async function start(context: Context, transportOptions?: MemoryTransportOptions) {
    const memoryTransport = MemoryTransport({
      decouplingFunction: (cb) => {
        if (process.env.SIMMULATE_JITTER === 'true') {
          setTimeout(cb, Math.random() * 10)
        } else {
          cb()
        }
      },
      ...transportOptions
    })
    instrumentMemoryTransports(memoryTransport)

    const rpcServer = createRpcServer(options)
    rpcServer.setHandler(handler)

    let clientClosed = false
    let serverClosed = false
    memoryTransport.client.on("close", () => (clientClosed = true))
    memoryTransport.server.on("close", () => (serverClosed = true))

    rpcServer.on("transportError", (data) => {
      log("  (server transportError): " + inspect(data))
    })

    if (serverClosed) throw new Error("This server is already closed. Use a new testing environment")
    log("> Creating RPC Client")
    setImmediate(() => rpcServer.attachTransport(memoryTransport.server, context))
    const rpcClient = await createRpcClient(memoryTransport.client)
    clientClosed = false

    return { rpcClient, rpcServer, transportClient: memoryTransport.client, transportServer: memoryTransport.server }
  }

  return {
    start
  }
}

export function delay(ms: number) {
  return new Promise((ret) => setTimeout(ret, ms))
}
