import { BinaryReader } from "google-protobuf"
import { createRpcClient, createRpcServer, CreateRpcServerOptions, parseClientMessage, parseServerMessage, RpcClient } from "../src"
import { log } from "./logger"
import { MemoryTransport } from "../src/transports/Memory"

export function createSimpleTestEnvironment(options: CreateRpcServerOptions) {
  const { client, server } = MemoryTransport()
  let rpcClient: RpcClient

  client.on("message", (data) => {
    try {
      log("  (wire server->client): " + JSON.stringify(parseServerMessage(new BinaryReader(data))?.toObject()))
    } catch (err) {
      console.error(err)
    }
  })

  server.on("message", (data) => {
    try {
      log("  (wire client->server): " + JSON.stringify(parseClientMessage(new BinaryReader(data))?.toObject()))
    } catch (err) {
      console.error(err)
    }
  })

  const rpcServer = createRpcServer(options)

  it("starts the rpc client", async () => {
    log("> Creating RPC Client")
    setImmediate(() => rpcServer.attachTransport(server))
    rpcClient = await createRpcClient(client)
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
  }
}
