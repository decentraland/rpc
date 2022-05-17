import { WebSocket, WebSocketServer } from "ws"
import { createRpcClient, createRpcServer, RpcClient, RpcClientPort, RpcServer, RpcServerPort } from "../src"
import { WebSocketTransport } from "../src/transports/WebSocket"
import { instrumentTransport } from "./helpers"
import { log } from "./logger"
import { configureTestPortServer, testPort } from "./sanity.spec"

describe("WebSocket test", () => {
  let sv: WebSocketServer

  let server: RpcServer
  let serverPort: RpcServerPort

  it("creates a server", () => {
    server = createRpcServer({
      async initializePort(port) {
        serverPort = port
        await configureTestPortServer(port)
      },
    })
  })

  afterAll(() => sv?.close())

  it("starts the server", async () => {
    sv = new WebSocketServer({ port: 8999 })

    sv.addListener("connection", (ws) => {
      log("Got server connection:")
      const serverTransport = WebSocketTransport(ws)
      instrumentTransport(serverTransport, "serverTransport")
      server.attachTransport(serverTransport)
    })
  })

  let port: RpcClientPort
  let ws: WebSocket
  let client: RpcClient

  it("creates a client and works", async () => {
    ws = new WebSocket(`ws://0.0.0.0:8999`)
    const clientTransport = WebSocketTransport(ws)
    instrumentTransport(clientTransport, "ws-client")
    client = await createRpcClient(clientTransport)
  })
  it("creates a port out of the client", async () => {
    port = await testPort(client, ws.url)
  })
  it("closing the socket closes the port", async () => {
    expect(ws?.readyState).toEqual(WebSocket.OPEN)

    const promClient = new Promise((resolve) => ws.addEventListener("close", resolve))
    const promServer = new Promise((resolve) => serverPort.on("close", resolve))

    ws?.close()

    await promClient
    await promServer

    expect(port?.state).toEqual("closed")
  })
})
