import { Transport } from "."
import { createDecoder, Decoder } from "./encdec/decoding"
import { Encoder, toUint8Array } from "./encdec/encoding"
import { parseMessageIdentifier } from "./protocol/helpers"
import { readRpcMessageHeader } from "./protocol/wire-protocol"
let globalMessageNumber = 0

export type SendableMessage = {
  messageIdentifier: number
}

export type MessageDispatcher = {
  transport: Transport
  request(cb: (bb: Encoder, messageNumber: number) => void): Promise<Decoder>
  addListener(messageId: number, handler: (reader: Decoder) => void): void
  removeListener(messageId: number): void
}

export function messageNumberHandler(transport: Transport): MessageDispatcher {
  // message_number -> future
  type ReaderCallback = (reader: Decoder) => void
  const oneTimeCallbacks = new Map<number, ReaderCallback>()
  const listeners = new Map<number, (reader: Decoder) => void>()

  transport.on("message", (message) => {
    const reader = createDecoder(message)
    const header = readRpcMessageHeader(reader)
    const [_, messageNumber] = parseMessageIdentifier(header.messageIdentifier)

    if (messageNumber > 0) {
      const fut = oneTimeCallbacks.get(messageNumber)
      if (fut) {
        reader.pos = 0
        fut(reader)
        oneTimeCallbacks.delete(messageNumber)
      }
      const handler = listeners.get(messageNumber)
      if (handler) {
        reader.pos = 0
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
    async request(cb: (bb: Encoder, messageNumber: number) => void): Promise<Decoder> {
      const messageNumber = ++globalMessageNumber
      if (globalMessageNumber > 0x01000000) globalMessageNumber = 0
      return new Promise<Decoder>((resolve) => {
        oneTimeCallbacks.set(messageNumber, resolve)
        const bb = new Encoder()
        cb(bb, messageNumber)
        transport.sendMessage(toUint8Array(bb))
      })
    },
  }
}
