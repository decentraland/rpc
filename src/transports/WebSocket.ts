import { Transport, TransportEvents } from "../types"
import mitt from "mitt"

export interface IWebSocketEventMap {
  close: any
  error: any
  message: { data: any }
  open: any
}

export const defer = Promise.prototype.then.bind(Promise.resolve())

/**
 * This interface should be compatible with the Browsers interface
 * and npm ws package for servers
 */
export interface IWebSocket {
  CONNECTING: number
  OPEN: number
  CLOSING: number
  CLOSED: number

  readyState: number

  close(code?: number, data?: string): void

  send(data: any, cb?: (err: Error) => void): void
  send(data: any, options: any, cb?: (err: Error) => void): void

  terminate?(): void

  addEventListener<K extends keyof IWebSocketEventMap>(
    type: K,
    listener: (ev: IWebSocketEventMap[K]) => any,
    options?: any
  ): void
}

export function WebSocketTransport(socket: IWebSocket): Transport {
  const queue: Uint8Array[] = []

  ;(socket as any).binaryType = "arraybuffer"

  socket.addEventListener("open", function () {
    flush()
  })

  function flush() {
    if (socket.readyState === socket.OPEN) {
      for (let $ of queue) {
        send($)
      }
      queue.length = 0
    }
  }

  function send(msg: string | Uint8Array | ArrayBuffer | SharedArrayBuffer) {
    if (msg instanceof Uint8Array || msg instanceof ArrayBuffer || msg instanceof SharedArrayBuffer) {
      socket.send(msg, { binary: true })
    } else throw new Error(`WebSocketTransport only accepts Uint8Array`)
  }

  const events = mitt<TransportEvents>()

  socket.addEventListener("close", () => events.emit("close", {}), { once: true })

  if (socket.readyState == socket.OPEN) {
    defer(() => events.emit("connect", {}))
  } else {
    socket.addEventListener("open", () => events.emit("connect", {}), { once: true })
  }

  socket.addEventListener("error", (err: any) => {
    if (err.error) {
      events.emit("error", err.error)
    } else if (err.message) {
      events.emit(
        "error",
        Object.assign(new Error(err.message), {
          colno: err.colno,
          error: err.error,
          filename: err.filename,
          lineno: err.lineno,
          message: err.message,
        })
      )
    }
  })
  socket.addEventListener("message", (message: { data: any }) => {
    if (message.data instanceof ArrayBuffer) {
      events.emit("message", new Uint8Array(message.data))
    } else {
      throw new Error(`WebSocketTransport: Received unknown type of message, expecting Uint8Array`)
    }
  })


  const api: Transport = {
    ...events,
    get isConnected() {
      return socket.readyState === socket.OPEN
    },
    sendMessage(message: any) {
      if (message instanceof Uint8Array) {
        if (socket.readyState === socket.OPEN) {
          send(message)
        } else {
          queue.push(message)
        }
      } else {
        throw new Error(`WebSocketTransport: Received unknown type of message, expecting Uint8Array`)
      }
    },
    close() {
      socket.close()
    },
  }

  return api
}
