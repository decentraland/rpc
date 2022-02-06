import { Transport, TransportEvents } from "../types"
import mitt, { Emitter } from "mitt"

export function MemoryTransport() {
  const clientEd = mitt<TransportEvents>()
  const serverEd = mitt<TransportEvents>()

  function configureMemoryTransport(receiver: Emitter<TransportEvents>, sender: Emitter<TransportEvents>): Transport {
    let isClosed = false
    return {
      ...sender,
      sendMessage(message) {
        receiver.emit("message", new Uint8Array(message))
      },
      close() {
        if (!isClosed) {
          isClosed = true
          sender.emit("close", {})
        }
      },
    }
  }

  const client = configureMemoryTransport(clientEd, serverEd)
  const server = configureMemoryTransport(serverEd, clientEd)

  let connected = false
  client.on("message", (message) => {
    if (!connected) {
      connected = true
      client.emit("connect", {})
    }
  })

  server.on("close", () => client.close())
  client.on("close", () => server.close())

  return {
    client,
    server,
  }
}
