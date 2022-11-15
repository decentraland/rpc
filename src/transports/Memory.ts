import { Transport, TransportEvents } from "../types"
import mitt, { Emitter } from "mitt"

export type MemoryTransportOptions = {
  decouplingFunction?: (cb: () => void) => void
}

export function MemoryTransport(options?: MemoryTransportOptions) {
  const clientEd = mitt<TransportEvents>()
  const serverEd = mitt<TransportEvents>()

  const decouple = options?.decouplingFunction ?? ((cb) => cb())
  let connected = false

  function configureMemoryTransport(receiver: Emitter<TransportEvents>, sender: Emitter<TransportEvents>): Transport {
    let isClosed = false

    return {
      ...sender,
      isConnected: connected,
      sendMessage(message) {
        decouple(() => {
          receiver.emit("message", message)
        })
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
