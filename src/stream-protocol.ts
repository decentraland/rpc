import { MessageDispatcher } from "./message-dispatcher"
import { RemoteError, RpcMessageTypes, StreamMessage } from "./protocol"
import { calculateMessageIdentifier, closeStreamMessage, streamAckMessage } from "./protocol/helpers"
import { AsyncQueue } from "./push-channel"
import { Transport } from "./types"

export async function sendStreamThroughTransport(
  dispatcher: MessageDispatcher,
  transport: Transport,
  stream: AsyncIterable<Uint8Array>,
  portId: number,
  messageNumber: number
) {
  const reusedStreamMessage: StreamMessage = StreamMessage.fromJSON({
    closed: false,
    ack: false,
    sequenceId: 0,
    messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE, messageNumber),
    payload: Uint8Array.of(),
    portId: portId,
  })
  let sequenceNumber = 0

  // If this point is reached, then the client WANTS to consume an element of the
  // generator
  for await (const elem of stream) {
    sequenceNumber++
    reusedStreamMessage.sequenceId = sequenceNumber
    reusedStreamMessage.payload = elem

    // sendWithAck may fail if the transport is closed, effectively ending this
    // iterator and the underlying generator. (by exiting this for-await-of)
    // Aditionally, the ack message is used to know WHETHER the client wants to
    // generate another element or cancel the iterator by setting closed=true
    const ret = await dispatcher.sendStreamMessage(reusedStreamMessage, true)

    // we first check for ACK because it is the hot-code-path
    if (ret.ack) {
      continue
    } else if (ret.closed) {
      // if it was closed remotely, then we end the stream right away
      return
    }
  }

  transport.sendMessage(closeStreamMessage(messageNumber, sequenceNumber, portId))
}


/**
 * If a StreamMessage is received, then it means we have the POSSIBILITY to
 * consume a remote generator. The client must answer every ACK with the next
 * inteded action, could be: next(), close(). Both actions are serialized in the
 * StreamMessage. The server MUST NOT generate any new element of the generator
 * if the client doesn't ask for it.
 *
 * The whole protocol is designed to be SLOW AND SECURE, that means, ACKs (slow)
 * will block the generation and consumption of iterators (secure).
 *
 * That exist to save the memory of the servers and to generate the much needed
 * backpressure.
 *
 * If throughput is what you are looking for, you may better use bigger messages
 * containing serialized lists. Effectively reducing the number of messages
 * and increasing their size.
 *
 * @internal
 */
 export function streamFromDispatcher(
  dispatcher: MessageDispatcher,
  portId: number,
  messageNumber: number
): { generator: AsyncGenerator<Uint8Array>; closeIfNotOpened(): void } {
  let lastReceivedSequenceId = 0
  let isRemoteClosed = false
  let wasOpen = false

  const channel = new AsyncQueue<Uint8Array>(sendServerSignals)

  dispatcher.transport.on("close", () => {
    channel.close(new Error("RPC Transport closed"))
  })

  dispatcher.transport.on("error", () => {
    channel.close(new Error("RPC Transport failed"))
  })

  // This function is called at two moments
  // 1. When the channel is closed or fails -> an ACK closing the stream is sent to the server
  // 2. When the channel.next() is called   -> an ACK requesting the next elem is sent to the server
  function sendServerSignals(_channel: AsyncQueue<Uint8Array>, action: "close" | "next") {
    if (action == "close") {
      dispatcher.removeListener(messageNumber)
    }
    if (!isRemoteClosed) {
      if (action == "close") {
        dispatcher.transport.sendMessage(closeStreamMessage(messageNumber, lastReceivedSequenceId, portId))
      } else if (action == "next") {
        // mark the stream as opened
        wasOpen = true
        // if (streamMessage.requireAck) {
        dispatcher.transport.sendMessage(streamAckMessage(messageNumber, lastReceivedSequenceId, portId))
        // }
      }
    }
  }

  // receive a message from the server and send it to the iterable channel
  function processMessage(message: StreamMessage) {
    lastReceivedSequenceId = message.sequenceId

    if (message.closed) {
      // when the server CLOSES the stream, then we raise the flag isRemoteClosed
      // to prevent sending an extra closeStreamMessage to the server after closing
      // our channel.
      // IMPORTANT: If the server closes the connection, then we DONT send the ACK
      //            back to the server because it is redundant information.
      isRemoteClosed = true
      channel.close()
    } else {
      channel.enqueue(message.payload)
    }
  }

  dispatcher.addListener(messageNumber, (reader, messageType, messageNumber, message) => {
    if (messageType == RpcMessageTypes.RpcMessageTypes_STREAM_MESSAGE) {
      processMessage(message)
    } else if (messageType == RpcMessageTypes.RpcMessageTypes_REMOTE_ERROR_RESPONSE) {
      isRemoteClosed = true
      channel.close(new Error("RemoteError: " + ((message as RemoteError).errorMessage || "Unknown remote error")))
    } else {
      channel.close(new Error("RemoteError: Protocol error, unkown message"))
    }
  })

  return {
    generator: channel,
    closeIfNotOpened() {
      if (!wasOpen) {
        debugger
        channel.close()
      }
    },
  }
}