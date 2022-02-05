import { BinaryReader } from "google-protobuf"
import { Transport } from "."
import { calculateMessageIdentifier, getMessageIdentifier } from "./protocol/helpers"
let globalMessageNumber = 0

export type SendableMessage = {
  setMessageIdentifier(number: number): void
  serializeBinary(): Uint8Array
  toObject(): any
}

export type MessageDispatcher = {
  transport: Transport
  request(data: SendableMessage, messageType: number): Promise<BinaryReader>
  addListener(messageId: number, handler: (reader: BinaryReader) => void): void
  removeListener(messageId: number): void
}

export function messageNumberHandler(transport: Transport): MessageDispatcher {
  // message_number -> future
  type ReaderCallback = (reader: BinaryReader) => void
  const oneTimeCallbacks = new Map<number, ReaderCallback>()
  const listeners = new Map<number, (reader: BinaryReader) => void>()

  transport.on("message", (message) => {
    const reader = new BinaryReader(message)
    const [_, messageId] = getMessageIdentifier(reader)
    if (messageId > 0) {
      const fut = oneTimeCallbacks.get(messageId)
      if (fut) {
        reader.reset()
        fut(reader)
        oneTimeCallbacks.delete(messageId)
      }
      const handler = listeners.get(messageId)
      if (handler) {
        reader.reset()
        handler(reader)
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
    async request(data: SendableMessage, messageType: number): Promise<BinaryReader> {
      const messageId = ++globalMessageNumber
      if (globalMessageNumber > 0x01000000) globalMessageNumber = 0
      return new Promise<BinaryReader>((resolve) => {
        data.setMessageIdentifier(calculateMessageIdentifier(messageType, messageId))
        oneTimeCallbacks.set(messageId, resolve)
        transport.sendMessage(data.serializeBinary())
      })
    },
  }
}
