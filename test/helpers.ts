import { createRpcClient, createRpcServer, CreateRpcServerOptions, RpcClient } from "../src"
import { log } from "./logger"
import { inspect } from "util"
import { MemoryTransport } from "../src/transports/Memory"
import { parseProtocolMessage } from "../src/protocol/helpers"
import { Reader } from "protobufjs"

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

export function instrumentTransport(memoryTransport: ReturnType<typeof MemoryTransport>) {
  const { client, server } = memoryTransport

  log("> Creating memory transport")

  function serialize(data: Uint8Array) {
    const ret = parseProtocolMessage(Reader.create(data))
    if (!ret) return inspect(data)
    return ret[1]
  }

  // only instrument while running tests
  if (typeof it == "function") {
    client.on("close", (data) => {
      log("  (client): closed")
    })
    client.on("error", (data) => {
      log("  (client error): " + data)
    })
    client.on("message", (data) => {
      try {
        log("  (wire server->client): " + JSON.stringify(serialize(data)))
      } catch (err) {
        console.error(err)
      }
    })

    server.on("close", (data) => {
      log("  (server): closed")
    })
    server.on("error", (data) => {
      log("  (server error): " + data)
    })

    server.on("message", (data) => {
      try {
        log("  (wire client->server): " + JSON.stringify(serialize(data)))
      } catch (err) {
        console.error(err)
      }
    })
  }

  return memoryTransport
}

export function createSimpleTestEnvironment(options: CreateRpcServerOptions) {
  async function start() {
    const memoryTransport = MemoryTransport()
    let rpcClient: RpcClient
    instrumentTransport(memoryTransport)

    const rpcServer = createRpcServer(options)

    let clientClosed = false
    let serverClosed = false
    memoryTransport.client.on("close", () => (clientClosed = true))
    memoryTransport.server.on("close", () => (serverClosed = true))

    rpcServer.on("transportError", (data) => {
      log("  (server transportError): " + inspect(data))
    })

    if (serverClosed) throw new Error("This server is already closed. Use a new testing environment")
    log("> Creating RPC Client")
    setImmediate(() => rpcServer.attachTransport(memoryTransport.server))
    rpcClient = await createRpcClient(memoryTransport.client)
    clientClosed = false

    return { rpcClient, rpcServer, transportClient: memoryTransport.client, transportServer: memoryTransport.server }
  }

  return {
    start,
  }
}
