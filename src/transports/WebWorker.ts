import { Transport, TransportEvents } from "../types"
import mitt from "mitt"

export interface IWorker {
  terminate?(): void
  close?(): void
  postMessage(message: any): void
  addEventListener(type: "message" | "error", listener: Function, options?: any): void
}

export function WebWorkerTransport(worker: IWorker): Transport {
  const events = mitt<TransportEvents>()

  let didConnect = false
  events.on('connect', () => {
    didConnect = true
  })

  worker.addEventListener("message", () => events.emit("connect", {}), { once: true })
  worker.addEventListener("error", (err: any) => {
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

  worker.addEventListener("message", (message: any) => {
    if (message.data instanceof ArrayBuffer || message.data instanceof Uint8Array) {
      events.emit("message", message.data)
    } else {
      throw new Error(`WebWorkerTransport: Received unknown type of message, expecting Uint8Array`)
    }
  })

  const api: Transport = {
    ...events,
    get isConnected() {
      return true
    },
    sendMessage(message) {
      if (message instanceof ArrayBuffer || message instanceof Uint8Array) {
        worker.postMessage(message)
      } else {
        throw new Error(`WebWorkerTransport: Received unknown type of message, expecting Uint8Array`)
      }
    },
    close() {
      if ("terminate" in worker) {
        // tslint:disable-next-line:semicolon
        ;(worker as any).terminate()
      } else if ("close" in worker) {
        // tslint:disable-next-line:semicolon
        ;(worker as any).close()
      }
      events.emit('close', {})
    },
  }

  return api
}
