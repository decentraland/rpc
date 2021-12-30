import { streamFromDispatcher } from "../src/client"
import { messageNumberHandler } from "../src/message-number-handler"
import { closeStreamMessage, streamMessage } from "../src/protocol/helpers"
import { StreamMessage } from "../src/protocol/index_pb"
import { MemoryTransport } from "../src/transports/Memory"
import { instrumentTransport, takeAsync } from "./helpers"

describe("streamFromDispatcher", () => {
  it("a CloseMessage from the server closes the iterator in the client", async () => {
    let seq = 0
    const MESSAGE_ID = 1
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.deserializeBinary(streamMessage(MESSAGE_ID, seq++, 0, new Uint8Array()))
    )

    setTimeout(() => transport.server.sendMessage(closeStreamMessage(MESSAGE_ID, seq++, 0)), 10)

    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([new Uint8Array()])
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_ID)
  })

  it("a CloseMessage from the server closes the iterator in the client after yielding data SYNC", async () => {
    let seq = 0
    const MESSAGE_ID = 2
    const PAYLOAD = Uint8Array.from([0xde, 0xad])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")
    const addListenerSpy = jest.spyOn(dispatcher, "addListener")
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.deserializeBinary(streamMessage(MESSAGE_ID, seq++, 0, new Uint8Array()))
    )

    expect(addListenerSpy).toHaveBeenCalledWith(MESSAGE_ID, expect.anything())

    transport.server.sendMessage(streamMessage(MESSAGE_ID, seq++, 0, PAYLOAD))
    transport.server.sendMessage(closeStreamMessage(MESSAGE_ID, seq++, 0))
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_ID)

    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([new Uint8Array(), PAYLOAD])
  })

  it("a CloseMessage from the server closes the iterator in the client after yielding data", async () => {
    let seq = 0
    const MESSAGE_ID = 2
    const PAYLOAD = Uint8Array.from([0xde, 0xad])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.deserializeBinary(streamMessage(MESSAGE_ID, seq++, 0, new Uint8Array()))
    )

    setTimeout(() => {
      transport.server.sendMessage(streamMessage(MESSAGE_ID, seq++, 0, PAYLOAD))
      transport.server.sendMessage(closeStreamMessage(MESSAGE_ID, seq++, 0))
    }, 10)

    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([new Uint8Array(), PAYLOAD])
  })

  it("a StreamMessage with payload yields its result concurrently", async () => {
    const MESSAGE_ID = 3
    const PAYLOAD = Uint8Array.from([132])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.deserializeBinary(streamMessage(MESSAGE_ID, 0, 0, PAYLOAD))
    )

    const [_, allMessages] = await Promise.all([
      transport.server.sendMessage(closeStreamMessage(MESSAGE_ID, 0, 0)),
      takeAsync(stream),
    ])

    expect(allMessages).toEqual([PAYLOAD])
  })

  it("a StreamMessage with payload yields its result", async () => {
    let seq = 0
    const MESSAGE_ID = 3
    const PAYLOAD = Uint8Array.from([133])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.deserializeBinary(streamMessage(MESSAGE_ID, seq++, 0, PAYLOAD))
    )

    setTimeout(() => transport.server.sendMessage(closeStreamMessage(MESSAGE_ID, seq++, 0)), 10)

    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([PAYLOAD])
  })

  it("a StreamMessage with payload yields its result with closeMessage received before consuming stream", async () => {
    let seq = 0
    const MESSAGE_ID = 3
    const PAYLOAD = Uint8Array.from([133])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.deserializeBinary(streamMessage(MESSAGE_ID, seq++, 0, PAYLOAD))
    )
    transport.server.sendMessage(closeStreamMessage(MESSAGE_ID, seq++, 0))
    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([PAYLOAD])
  })

  it("Consume complete stream", async () => {
    let seq = 0
    const MESSAGE_ID = 4
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.deserializeBinary(streamMessage(MESSAGE_ID, seq++, 0, Uint8Array.from([1])))
    )

    transport.server.sendMessage(streamMessage(MESSAGE_ID, seq++, 0, Uint8Array.from([2])))
    transport.server.sendMessage(streamMessage(MESSAGE_ID, seq++, 0, Uint8Array.from([3])))
    transport.server.sendMessage(streamMessage(MESSAGE_ID, seq++, 0, Uint8Array.from([4])))
    transport.server.sendMessage(closeStreamMessage(MESSAGE_ID, seq++, 0))

    const values = await takeAsync(stream)

    expect(values).toEqual([Uint8Array.from([1]), Uint8Array.from([2]), Uint8Array.from([3]), Uint8Array.from([4])])
  })

  it("Consume partial stream", async () => {
    let seq = 0
    const MESSAGE_ID = 4
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.deserializeBinary(streamMessage(MESSAGE_ID, seq++, 0, Uint8Array.from([1])))
    )

    transport.server.sendMessage(streamMessage(MESSAGE_ID, seq++, 0, Uint8Array.from([2])))
    transport.server.sendMessage(streamMessage(MESSAGE_ID, seq++, 0, Uint8Array.from([3])))
    transport.server.sendMessage(streamMessage(MESSAGE_ID, seq++, 0, Uint8Array.from([4])))

    expect(removeListenerSpy).not.toHaveBeenCalledWith(MESSAGE_ID)
    const values = await takeAsync(stream, 2)
    expect(values).toEqual([Uint8Array.from([1]), Uint8Array.from([2])])
    // the listener should have ended because we finished the stream at two
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_ID)



    // rest of the stream can be consumed beacuse we have it in memory
    const rest = await takeAsync(stream, 2)
    expect(rest).toEqual([Uint8Array.from([3]), Uint8Array.from([4])])
  })
})
