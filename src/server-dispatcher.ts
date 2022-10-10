import { Transport } from "./types"
import { StreamMessage } from "./protocol"
import { AckDispatcher, createAckHelper } from "./ack-helper"

export type ServerDispatcher = {
  addStreamListener(messageNumber: number, fn: (msg: StreamMessage) => void): void
  emitStream(messageNumber: number, streamMessage: StreamMessage): void
} & AckDispatcher

export function createServerDispatcher(transport: Transport): ServerDispatcher {
  const streams = new Map<number, (msg: StreamMessage) => void>()

  const ackHelper = createAckHelper(transport)

  return {
    receiveAck: ackHelper.receiveAck,
    sendStreamMessage: ackHelper.sendStreamMessage,
    addStreamListener(messageNumber: number, fn: (msg: StreamMessage) => void) {
      streams.set(messageNumber, fn)
    },
    emitStream(messageNumber: number, streamMessage: StreamMessage) {
      const stream = streams.get(messageNumber)
      if (stream) {
        stream(streamMessage)
      }
    }
  }
}