import { BinaryReader } from "google-protobuf"
import { Transport } from "."
import { getMessageId } from "./proto-helpers"
import future, { IFuture } from "fp-future"
let globalMessageNumber = 0

export type SendableMessage = {
  setMessageId(number: number): void
  serializeBinary(): Uint8Array
  toObject(): any
}

export type MessageDispatcher = {
  transport: Transport
  request(data: SendableMessage): Promise<BinaryReader>
  addListener(messageId: number, handler: (reader: BinaryReader) => void): void
  removeListener(messageId: number): void
}

export function messageNumberHandler(transport: Transport): MessageDispatcher {
  // message_number -> future
  const oneTimeCallbacks = new Map<number, IFuture<BinaryReader>>()
  const listeners = new Map<number, (reader: BinaryReader) => void>()

  transport.on("message", (message) => {
    const reader = new BinaryReader(message)
    const messageId = getMessageId(reader)
    if (messageId !== null) {
      const fut = oneTimeCallbacks.get(messageId)
      if (fut) {
        reader.reset()
        fut.resolve(reader)
        oneTimeCallbacks.delete(messageId)
      }
      const handler = listeners.get(messageId)
      if (handler) {
        handler(new BinaryReader(message))
      }
    }
  })

  return {
    transport,
    addListener(messageId: number, handler) {
      if (listeners.has(messageId)) throw new Error("There is already a handler for messageId " + messageId)
      listeners.set(messageId, handler)
    },
    removeListener(messageId) {
      if (!listeners.has(messageId)) throw new Error("A handler is missing for messageId " + messageId)
      listeners.delete(messageId)
    },
    async request(data: SendableMessage): Promise<BinaryReader> {
      const messageId = ++globalMessageNumber
      const ret = future<BinaryReader>()
      data.setMessageId(messageId)
      oneTimeCallbacks.set(messageId, ret)
      transport.sendMessage(data.serializeBinary())
      return ret
    },
  }
}
