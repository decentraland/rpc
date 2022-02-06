import { streamFromDispatcher } from "../src/client"
import { Reader } from "protobufjs"
import { messageNumberHandler } from "../src/message-number-handler"
import { closeStreamMessage, streamMessage } from "../src/protocol/helpers"
import { MemoryTransport } from "../src/transports/Memory"
import { instrumentTransport, takeAsync } from "./helpers"
import { StreamMessage } from "../src/protocol/pbjs"

describe("streamFromDispatcher", () => {
  it("a CloseMessage from the server closes the iterator in the client", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 1
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.decode(streamMessage(MESSAGE_NUMBER, seq++, 0, new Uint8Array())),
      MESSAGE_NUMBER
    )

    setTimeout(() => transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, 0)), 10)

    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([new Uint8Array()])
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER)
  })

  it("a CloseMessage from the server closes the iterator in the client after yielding data SYNC", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 2
    const PAYLOAD = Uint8Array.from([0xde, 0xad])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")
    const addListenerSpy = jest.spyOn(dispatcher, "addListener")
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.decode(streamMessage(MESSAGE_NUMBER, seq++, 0, new Uint8Array())),
      MESSAGE_NUMBER
    )

    expect(addListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER, expect.anything())

    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, PAYLOAD))
    transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, 0))
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER)

    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([new Uint8Array(), PAYLOAD])
  })

  it("a CloseMessage from the server closes the iterator in the client after yielding data", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 2
    const PAYLOAD = Uint8Array.from([0xde, 0xad])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.decode(streamMessage(MESSAGE_NUMBER, seq++, 0, new Uint8Array())),
      MESSAGE_NUMBER
    )

    setTimeout(() => {
      transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, PAYLOAD))
      transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, 0))
    }, 10)

    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([new Uint8Array(), PAYLOAD])
  })

  it("a StreamMessage with payload yields its result concurrently", async () => {
    const MESSAGE_NUMBER = 3
    const PAYLOAD = Uint8Array.from([132])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.decode(streamMessage(MESSAGE_NUMBER, 0, 0, PAYLOAD)),
      MESSAGE_NUMBER
    )

    const [_, allMessages] = await Promise.all([
      transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, 0, 0)),
      takeAsync(stream),
    ])

    expect(allMessages).toEqual([PAYLOAD])
  })

  it("a StreamMessage with payload yields its result", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 3
    const PAYLOAD = Uint8Array.from([133])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.decode(streamMessage(MESSAGE_NUMBER, seq++, 0, PAYLOAD)),
      MESSAGE_NUMBER
    )

    setTimeout(() => transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, 0)), 10)

    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([PAYLOAD])
  })

  it("a StreamMessage with payload yields its result with closeMessage received before consuming stream", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 3
    const PAYLOAD = Uint8Array.from([133])
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.decode(streamMessage(MESSAGE_NUMBER, seq++, 0, PAYLOAD)),
      MESSAGE_NUMBER
    )
    transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, 0))
    const allMessages = await takeAsync(stream)
    expect(allMessages).toEqual([PAYLOAD])
  })

  it("Consume complete stream", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 4
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.decode(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([1]))),
      MESSAGE_NUMBER
    )

    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([2])))
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([3])))
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([4])))
    transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, 0))

    const values = await takeAsync(stream)

    expect(values).toEqual([Uint8Array.from([1]), Uint8Array.from([2]), Uint8Array.from([3]), Uint8Array.from([4])])
  })

  it("Consume partial stream", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 4
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.decode(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([1]))),
      MESSAGE_NUMBER
    )

    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([2])))
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([3])))
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([4])))

    expect(removeListenerSpy).not.toHaveBeenCalledWith(MESSAGE_NUMBER)
    const values = await takeAsync(stream, 2)
    expect(values).toEqual([Uint8Array.from([1]), Uint8Array.from([2])])
    // the listener should have ended because we finished the stream at two
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER)

    // rest of the stream can be consumed beacuse we have it in memory
    const rest = await takeAsync(stream, 2)
    expect(rest).toEqual([Uint8Array.from([3]), Uint8Array.from([4])])
  })

  it("closes the stream if the transport has an error", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 4
    const transport = instrumentTransport(MemoryTransport())
    const dispatcher = messageNumberHandler(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")
    const stream = streamFromDispatcher(
      dispatcher,
      StreamMessage.decode(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([1]))),
      MESSAGE_NUMBER
    )

    expect(removeListenerSpy).not.toHaveBeenCalledWith(MESSAGE_NUMBER)
    transport.client.emit("error", new Error("TRANSPORT ERROR"))
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER)

    // the listener should have ended because we finished the stream due to an error
    let received: Uint8Array[] = []
    await expect(async () => {
      for await (const data of stream) {
        received.push(data)
      }
    }).rejects.toThrow("RPC Transport failed")
    expect(received).toEqual([Uint8Array.from([1])])
  })
})
