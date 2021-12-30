import { BinaryReader } from "google-protobuf"
import { createRpcClient, createRpcServer, CreateRpcServerOptions, RpcClient } from "../src"
import { log } from "./logger"
import { MemoryTransport } from "../src/transports/Memory"
import { parseProtocolMessage } from "../src/protocol/helpers"

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
    const t = parseProtocolMessage(new BinaryReader(data))?.toObject()
    if (!t) debugger
    return t
  }

  client.on("message", (data) => {
    try {
      log("  (wire server->client): " + JSON.stringify(serialize(data)))
    } catch (err) {
      console.error(err)
    }
  })

  server.on("message", (data) => {
    try {
      log("  (wire client->server): " + JSON.stringify(serialize(data)))
    } catch (err) {
      console.error(err)
    }
  })

  return memoryTransport
}

export function createSimpleTestEnvironment(options: CreateRpcServerOptions) {
  const memoryTransport = MemoryTransport()
  let rpcClient: RpcClient
  instrumentTransport(memoryTransport)

  const rpcServer = createRpcServer(options)

  beforeAll(async () => {
    log("> Creating RPC Client")
    setImmediate(() => rpcServer.attachTransport(memoryTransport.server))
    rpcClient = await createRpcClient(memoryTransport.client)
  })

  return {
    get rpcServer() {
      if (!rpcServer) throw new Error("Must se the rpcServer only inside a `it`")
      return rpcServer
    },
    get rpcClient() {
      if (!rpcClient) throw new Error("Must se the rpcClient only inside a `it`")
      return rpcClient
    },
    transportClient: memoryTransport.client,
    transportServer: memoryTransport.server,
  }
}
