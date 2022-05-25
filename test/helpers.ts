import {
  createRpcClient,
  createRpcServer,
  CreateRpcServerOptions,
  RpcClient,
  RpcServerHandler,
  Transport,
} from "../src"
import { log } from "./logger"
import { inspect } from "util"
import { MemoryTransport, MemoryTransportOptions } from "../src/transports/Memory"
import { parseProtocolMessage } from "../src/protocol/helpers"
import { Reader } from "protobufjs/minimal"

// async Array.from(generator*) with support for max elements
export async function takeAsync<T>(iter: AsyncGenerator<T>, max?: number) {
  let r: T[] = []
  let counter = 0
  for await (const $ of iter) {
    r.push($)
    counter++
    if (typeof max == "number" && counter == max) break
  }
  return r
}

function serialize(data: Uint8Array) {
  const ret = parseProtocolMessage(Reader.create(data))
  if (!ret) return inspect(data)
  return ret[1]
}

export function instrumentTransport(transport: Transport, name: string) {
  if (typeof it == "function") {
    transport.on("close", (data) => {
      log(`  (${name}): closed`)
    })
    transport.on("error", (data) => {
      log(`  (${name} error): ${data}`)
    })
    transport.on("message", (data) => {
      try {
        log(`  (message->${name}): ${JSON.stringify(serialize(data))}`)
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

export function createSimpleTestEnvironment<Context = void>(
  handler: RpcServerHandler<Context>,
  options: CreateRpcServerOptions<Context> = {}
) {
  async function start(context: Context, transportOptions?: MemoryTransportOptions) {
    const memoryTransport = MemoryTransport(transportOptions)
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
    start,
  }
}

export function delay(ms: number) {
  return new Promise((ret) => setTimeout(ret, ms))
}
