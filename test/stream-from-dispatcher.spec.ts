import { messageDispatcher } from "../src/message-dispatcher"
import { closeStreamMessage, streamMessage } from "../src/protocol/helpers"
import { streamFromDispatcher } from "../src/stream-protocol"
import { MemoryTransport } from "../src/transports/Memory"
import { instrumentMemoryTransports, takeAsync } from "./helpers"

describe("StreamFromDispatcher", () => {
  it("a CloseMessage from the server closes the iterator in the client.", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 1
    const PORT_ID = 0
    const transport = instrumentMemoryTransports(MemoryTransport())
    const dispatcher = messageDispatcher(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")

    // create a client stream for the server
    const clientStream = streamFromDispatcher(dispatcher, PORT_ID, MESSAGE_NUMBER)

    // server sends CLOSE message
    setImmediate(() => transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, PORT_ID)))

    // consume all stream
    const allMessages = await takeAsync(clientStream.generator)

    // yields empty array
    expect(allMessages).toEqual([])

    // and the listener should have been cleared
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER)
  })

  it("a CloseMessage from the server closes the iterator in the client after yielding data SYNC", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 2
    const PORT_ID = 0
    const PAYLOAD = Uint8Array.from([0xde, 0xad])
    const transport = instrumentMemoryTransports(MemoryTransport())
    const dispatcher = messageDispatcher(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")
    const addListenerSpy = jest.spyOn(dispatcher, "addListener")

    // create a client stream for the server
    const clientStream = streamFromDispatcher(dispatcher, PORT_ID, MESSAGE_NUMBER).generator

    // it should have registered the listener
    expect(addListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER, expect.anything())

    // ask the server for the .next() value
    const futureValue = clientStream.next()

    // server sends .next()
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, PORT_ID, PAYLOAD))

    // server closes transport
    transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, PORT_ID))

    // and since we consumed only one element from the stream, our entire materialized
    // messages should only contain that
    expect((await futureValue).value).toEqual(PAYLOAD)

    expect((await clientStream.next()).done).toEqual(true)

    // the listener should have been cleared
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER)
  })

  it("a CloseMessage from the server closes the iterator in the client after yielding data", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 2
    const PORT_ID = 0
    const PAYLOAD = Uint8Array.from([0xde, 0xad])
    const transport = instrumentMemoryTransports(MemoryTransport())
    const dispatcher = messageDispatcher(transport.client)

    // create a client stream for the server
    const clientStream = streamFromDispatcher(dispatcher, PORT_ID, MESSAGE_NUMBER).generator

    // server sends a message and then closes the stream
    setImmediate(() => {
      transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, PORT_ID, PAYLOAD))
      transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, PORT_ID))
    })

    // client consumes one message and then finishes the iterator
    const allMessages = await takeAsync(clientStream)
    expect(allMessages).toEqual([PAYLOAD])
  })

  it("Consume complete stream", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 4
    const transport = instrumentMemoryTransports(MemoryTransport())
    const dispatcher = messageDispatcher(transport.client)
    const clientStream = streamFromDispatcher(dispatcher, 0, MESSAGE_NUMBER).generator

    // send three messages and then close the stream
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([2])))
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([3])))
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, 0, Uint8Array.from([4])))
    transport.server.sendMessage(closeStreamMessage(MESSAGE_NUMBER, seq++, 0))

    const values = await takeAsync(clientStream)

    expect(values).toEqual([Uint8Array.from([2]), Uint8Array.from([3]), Uint8Array.from([4])])
  })

  it("closed streams", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 4
    const PORT_ID = 0
    const transport = instrumentMemoryTransports(MemoryTransport())
    const dispatcher = messageDispatcher(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")

    // create a client stream for the server
    const clientStream = streamFromDispatcher(dispatcher, PORT_ID, MESSAGE_NUMBER).generator

    // send three messags to the client
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, PORT_ID, Uint8Array.from([2])))
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, PORT_ID, Uint8Array.from([3])))
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, PORT_ID, Uint8Array.from([4])))

    // then the listener should not have been called because the stream was not processed yet
    expect(removeListenerSpy).not.toHaveBeenCalledWith(MESSAGE_NUMBER)

    const values = await takeAsync(clientStream, 1)
    expect(values).toEqual([Uint8Array.from([2])])

    // the listener should have ended because we finished the stream at 1st
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER)

    // rest of the stream can be consumed beacuse we have it in memory
    const rest = await takeAsync(clientStream, 2)
    expect(rest).toEqual([Uint8Array.from([3]), Uint8Array.from([4])])
  })

  it("closes the stream if the transport has an error", async () => {
    let seq = 0
    const MESSAGE_NUMBER = 4
    const PORT_ID = 0
    const transport = instrumentMemoryTransports(MemoryTransport())
    const dispatcher = messageDispatcher(transport.client)
    const removeListenerSpy = jest.spyOn(dispatcher, "removeListener")
    // create a client stream for the server
    const clientStream = streamFromDispatcher(dispatcher, PORT_ID, MESSAGE_NUMBER).generator

    // send a message to the client
    transport.server.sendMessage(streamMessage(MESSAGE_NUMBER, seq++, PORT_ID, Uint8Array.from([12])))

    expect(removeListenerSpy).not.toHaveBeenCalledWith(MESSAGE_NUMBER)
    transport.client.emit("error", new Error("TRANSPORT ERROR"))
    expect(removeListenerSpy).toHaveBeenCalledWith(MESSAGE_NUMBER)

    // the listener should have ended because we finished the stream due to an error
    let received: Uint8Array[] = []
    await expect(async () => {
      for await (const data of clientStream) {
        received.push(data)
      }
    }).rejects.toThrow("RPC Transport failed")
    expect(received).toEqual([Uint8Array.from([12])])
  })
})
