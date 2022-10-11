import { MessageDispatcher } from "./message-dispatcher"
import { RpcMessageTypes, StreamMessage } from "./protocol"
import { calculateMessageIdentifier, closeStreamMessage } from "./protocol/helpers"
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
