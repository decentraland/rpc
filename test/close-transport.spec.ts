import { RpcClient, sendServerStream } from "../src"
import { calculateMessageIdentifier } from "../src/protocol/helpers"
import { RpcMessageHeader, RpcMessageTypes, StreamMessage } from "../src/protocol"
import { createSimpleTestEnvironment, delay } from "./helpers"
import future from "fp-future"
import { MemoryTransport } from "../src/transports/Memory"
import { log } from "./logger"
import { AsyncQueue } from "../src/push-channel"
import { GlobalHandlerFunction, MessageDispatcher, messageDispatcher } from "../src/message-dispatcher"
import { Reader } from "protobufjs"

async function testPort(rpcClient: RpcClient, portName: string) {
  const port = await rpcClient.createPort(portName)
  return (await port.loadModule("echo")) as {
    infinite(): Promise<AsyncGenerator<Uint8Array>>
    infiniteClientStream(param: AsyncIterable<Uint8Array>): Promise<void> | undefined
  }
}


/**
 * This test ensures that the server iterators.next() are NOT called if the client
 * doesn't specifically agrees to generate a new element (ack=true)
 */
test("Unit: server sendStream doesn't consume an element from the generator unless specifically asked", async () => {
  const messageQueue = new AsyncQueue<Partial<StreamMessage>>(log)

  const dispatcher: MessageDispatcher = {
    async sendStreamMessage(data) {
      return await (await messageQueue.next()).value
    },
    transport: undefined,
    addListener: function (messageNumber: number, handler: (reader: Reader, messageType: number, messageNumber: number, message: any) => void): void {
      throw new Error("Function not implemented.")
    },
    async addOneTimeListener() {
      throw new Error("Function not implemented.")
    },
    removeListener: function (messageNumber: number): void {
      throw new Error("Function not implemented.")
    },
    setGlobalHandler: function (globalHandler: GlobalHandlerFunction): void {
      throw new Error("Function not implemented.")
    }
  }

  const transport = MemoryTransport()
  const sendMessageSpy = jest.spyOn(transport.client, 'sendMessage')
  const sendWithAckSpy = jest.spyOn(dispatcher, 'sendStreamMessage')

  function generator() {
    const ret: AsyncGenerator<Uint8Array> = {
      [Symbol.asyncIterator]: () => ret,
      async next() { throw new Error('not implemented') },
      async return() { throw new Error('not implemented') },
      async throw() { throw new Error('not implemented') }
    }
    return ret
  }

  await Promise.all([
    sendServerStream(dispatcher, transport.client, generator(), 0, 0).catch(log),
    // this message responds to the "stream offer" by closing it.
    // IN SOME CASES, the client may not need to consume the stream. Since we are
    // creating a "safe" API to handle resources and possibly signatures in the
    // servers, not generating extra elements in generators must be ensured
    messageQueue.enqueue({ closed: true })
  ])

  expect(sendWithAckSpy).toBeCalledTimes(1)
  expect(sendMessageSpy).toBeCalledTimes(0)
})


/**
 * This test ensures that the server iterators are closed if an ACK rejects
 */
test("Unit: server sendStream finalizes iterator upon failed ACK", async () => {
  const messageQueue = new AsyncQueue<Partial<StreamMessage>>(log)

  const dispatcher: MessageDispatcher = {
    async sendStreamMessage(data) {
      return await (await messageQueue.next()).value
    },
    transport: undefined,
    addListener: function (messageNumber: number, handler: (reader: Reader, messageType: number, messageNumber: number, message: any) => void): void {
      throw new Error("Function not implemented.")
    },
    async addOneTimeListener() {
      throw new Error("Function not implemented.")
    },
    removeListener: function (messageNumber: number): void {
      throw new Error("Function not implemented.")
    },
    setGlobalHandler: function (globalHandler: GlobalHandlerFunction): void {
      throw new Error("Function not implemented.")
    }
  }

  const transport = MemoryTransport()
  const sendMessageSpy = jest.spyOn(transport.client, 'sendMessage')
  const sendWithAckSpy = jest.spyOn(dispatcher, 'sendStreamMessage')

  let finalized = false

  function generator() {
    const ret: AsyncGenerator<Uint8Array> = {
      [Symbol.asyncIterator]: () => ret,
      async next() {
        return { value: new Uint8Array(), done: false }
      },
      async return() {
        finalized = true
        return { done: true, value: undefined }
      },
      async throw() { throw new Error('not implemented') }
    }
    return ret
  }

  await Promise.all([
    sendServerStream(dispatcher, transport.client, generator(), 0, 0).catch(log),
    // this message responds to the "stream offer"
    messageQueue.enqueue({ ack: true, closed: false }),
    // this message asks for an element of the stream to be consumed
    messageQueue.enqueue({ ack: true, closed: false }),
    // then we FAIL! on the ACK. This should finalize the server generator
    messageQueue.close(new Error('Timed out!')),
  ])

  expect(finalized).toEqual(true)

  expect(sendWithAckSpy).toBeCalledTimes(3)
  expect(sendMessageSpy).toBeCalledTimes(0)
})


/**
 * This test ensures that the server sends a close message after the iterator returns a value
 */
test("Unit: server sendStream sends a close message after iterator finalizes", async () => {
  const dispatcher: MessageDispatcher = {
    async sendStreamMessage(data) {
      if (data.sequenceId != 0) throw new Error('never called')
      return Promise.resolve({ closed: false, ack: true } as any)
    },
    transport: undefined,
    addListener: function (messageNumber: number, handler: (reader: Reader, messageType: number, messageNumber: number, message: any) => void): void {
      throw new Error("Function not implemented.")
    },
    async addOneTimeListener() {
      throw new Error("Function not implemented.")
    },
    removeListener: function (messageNumber: number): void {
      throw new Error("Function not implemented.")
    },
    setGlobalHandler: function (globalHandler: GlobalHandlerFunction): void {
      throw new Error("Function not implemented.")
    }
  }

  const transport = MemoryTransport()

  const sendMessageSpy = jest.spyOn(transport.client, 'sendMessage')

  function generator() {
    const ret: AsyncGenerator<Uint8Array> = {
      [Symbol.asyncIterator]: () => ret,
      async next() {
        return { value: undefined, done: true }
      },
      async return() {
        return { done: true, value: undefined }
      },
      async throw() { throw new Error('not implemented') }
    }
    return ret
  }

  await sendServerStream(dispatcher, transport.client, generator(), 0, 0)

  expect(sendMessageSpy).toBeCalledTimes(1)
})


/**
 * This test ensures tha the AckDispatcher rejects all pending operations
 * if an error is triggered in the transport
 */
test("Unit: AckDispatcher rejects all pending operations on transport error", async () => {
  const transport = MemoryTransport()
  const ackDispatcher: MessageDispatcher = messageDispatcher(transport.server)

  const promises = Promise.allSettled([
    ackDispatcher.sendStreamMessage({ messageIdentifier: calculateMessageIdentifier(0, 1), sequenceId: 1, payload: '' } as any),
    ackDispatcher.sendStreamMessage({ messageIdentifier: calculateMessageIdentifier(0, 2), sequenceId: 2, payload: '' } as any),
    ackDispatcher.sendStreamMessage({ messageIdentifier: calculateMessageIdentifier(0, 3), sequenceId: 3, payload: '' } as any),
  ])

  const error = new Error('Error123')

  transport.server.emit('error', error)

  expect(await promises).toEqual([
    { status: 'rejected', reason: error },
    { status: 'rejected', reason: error },
    { status: 'rejected', reason: error }
  ])
})

/**
 * This test ensures tha the AckDispatcher rejects all pending operations
 * if the transport is closed
 */
test("Unit: AckDispatcher rejects all pending operations on transport close", async () => {
  const transport = MemoryTransport()
  const ackDispatcher: MessageDispatcher = messageDispatcher(transport.server)

  const promises = Promise.all([
    ackDispatcher.sendStreamMessage({ messageIdentifier: calculateMessageIdentifier(0, 1), sequenceId: 1, payload: '' } as any),
    ackDispatcher.sendStreamMessage({ messageIdentifier: calculateMessageIdentifier(0, 2), sequenceId: 2, payload: '' } as any),
    ackDispatcher.sendStreamMessage({ messageIdentifier: calculateMessageIdentifier(0, 3), sequenceId: 3, payload: '' } as any),
  ])

  transport.server.close()

  expect(await promises).toMatchObject([
    { closed: true },
    { closed: true },
    { closed: true }
  ])
})

describe("Throw in client iterator closes remote iterator", () => {
  const didClose = future<any>()
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    let i = 0
    port.registerModule("echo", async (port) => ({
      infinite() {
        const ret: AsyncGenerator<Uint8Array> = {
          [Symbol.asyncIterator]: () => ret,
          async next() {
            if (!didClose.isPending) throw new Error('error in logic, .next should not be called after return')
            return { value: Uint8Array.from([i++]), done: false }
          },
          async return(value) {
            didClose.resolve(value)
            return { done: true, value: undefined }
          },
          async throw() { throw new Error('not implemented') }
        }
        return ret
      },
    }))
  })

  it("runs the test", async () => {
    const { rpcClient } = await testEnv.start()

    const generator = await (await testPort(rpcClient, "port1")).infinite()

    expect(await (await generator.next()).value).toEqual(Uint8Array.from([0]))
    expect(await (await generator.next()).value).toEqual(Uint8Array.from([1]))

    await generator.throw(new Error('client error'))

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(await didClose).toEqual(undefined)
  })
})

describe("Throw in client iterator closes remote iterator after receiving a message", () => {
  const didClose = future<any>()
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    let i = 0
    port.registerModule("echo", async (port) => ({
      infinite() {
        const ret: AsyncGenerator<Uint8Array> = {
          [Symbol.asyncIterator]: () => ret,
          async next() {
            if (!didClose.isPending) throw new Error('error in logic, .next should not be called after return')
            return { value: Uint8Array.from([i++]), done: false }
          },
          async return(value) {
            didClose.resolve(value)
            return { done: true, value: undefined }
          },
          async throw() { throw new Error('not implemented') }
        }
        return ret
      },
    }))
  })

  it("runs the test", async () => {
    const { rpcClient } = await testEnv.start()

    const generator = await (await testPort(rpcClient, "port1")).infinite()

    await (await generator.next()).value
    await generator.throw(new Error('client error'))

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(await didClose).toEqual(undefined)
  })
})

describe("Close transport closes server streams (server side) 1", () => {
  const didClose = future<any>()
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    let i = 0
    port.registerModule("echo", async (port) => ({
      infinite() {
        const ret: AsyncGenerator<Uint8Array> = {
          [Symbol.asyncIterator]: () => ret,
          async next() {
            if (!didClose.isPending) throw new Error('error in logic, .next should not be called after return')
            return { value: Uint8Array.from([i++]), done: false }
          },
          async return(value) {
            didClose.resolve(value)
            return { done: true, value: undefined }
          },
          async throw() { throw new Error('not implemented') }
        }
        return ret
      },
    }))
  })

  it("runs the test", async () => {
    const { rpcClient, transportServer } = await testEnv.start()

    const generator = await (await testPort(rpcClient, "port1")).infinite()

    await (await generator.next()).value
    transportServer.close()
    await expect(generator.next()).rejects.toThrow("RPC Transport closed")

    await delay(100)

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(await didClose).toEqual(undefined)
  })
})


describe("Close transport closes server streams (server side)", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    port.registerModule("echo", async (port) => ({
      async *infinite() {
        try {
          infiniteStreamClosed = false
          while (true) {
            yield Uint8Array.from([1])
          }
        } finally {
          infiniteStreamClosed = true
        }
      },
    }))
  })

  it("runs the test", async () => {
    const { rpcClient, transportServer } = await testEnv.start()

    const { infinite } = await testPort(rpcClient, "port1")

    expect(infiniteStreamClosed).toEqual(false)
    let count = 0

    await expect(async () => {
      for await (const _ of await infinite()) {
        if (count++ == 10) {
          transportServer.close()
        }
      }
    }).rejects.toThrow("RPC Transport closed")

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(infiniteStreamClosed).toEqual(true)
  })
})

describe("Error in transport finalizes streams", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    port.registerModule("echo", async (port) => ({
      async *infinite() {
        try {
          infiniteStreamClosed = false
          while (true) {
            yield Uint8Array.from([1])
          }
        } finally {
          infiniteStreamClosed = true
        }
      },
    }))
  })

  it("creates the server", async () => {
    const { rpcClient, transportServer } = await testEnv.start()

    const { infinite } = await testPort(rpcClient, "port1")

    expect(infiniteStreamClosed).toEqual(false)
    let count = 0

    await expect(async () => {
      for await (const _ of await infinite()) {
        if (count++ == 10) {
          transportServer.emit("error", new Error("SOCKET DISCONNECTED"))
        }
      }
    }).rejects.toThrow("RPC Transport closed")

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(infiniteStreamClosed).toEqual(true)
  })
})

describe("Close transport closes server streams (client side)", () => {
  let infiniteStreamClosed = 0
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    port.registerModule("echo", async (port) => ({
      async *infinite() {
        try {
          infiniteStreamClosed = 1
          while (true) {
            yield Uint8Array.from([1])
          }
        } finally {
          infiniteStreamClosed = 2
        }
      },
    }))
  })

  it("creates the server", async () => {
    const { rpcClient, transportClient } = await testEnv.start()

    const { infinite } = await testPort(rpcClient, "port1")

    expect(infiniteStreamClosed).toEqual(0)
    let count = 0

    await expect(async () => {
      for await (const _ of await infinite()) {
        expect(infiniteStreamClosed).toEqual(1)
        if (count++ == 10) {
          transportClient.close()
        }
      }
    }).rejects.toThrow("RPC Transport closed")

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(infiniteStreamClosed).toEqual(2)
  })
})

describe("Close transport closes client streams (client side)", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    port.registerModule("echo", async (port) => ({
      async infiniteClientStream(gen: AsyncIterable<Uint8Array>): Promise<void> {
        for await (const _ of gen) { }
      }
    }))
  })

  it("run the test", async () => {
    const { rpcClient, transportClient } = await testEnv.start()

    const { infiniteClientStream } = await testPort(rpcClient, "port1")

    expect(infiniteStreamClosed).toBeFalsy()
    let count = 0

    await expect(async () => {
      const infiniteGenerator = async function* () {
        try {
          infiniteStreamClosed = false
          while (true) {
            if (count++ == 10) {
              transportClient.close()
              break
            }
            yield Uint8Array.from([1])
          }
        } finally {
          infiniteStreamClosed = true
        }
      }

      await infiniteClientStream(infiniteGenerator())
    }).rejects.toThrow("RPC Transport closed")

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(infiniteStreamClosed).toBeTruthy()
  })
})

describe("Close transport closes client streams (server side)", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    port.registerModule("echo", async (port) => ({
      async infiniteClientStream(gen: AsyncIterable<Uint8Array>): Promise<void> {
        for await (const _ of gen) { }
      }
    }))
  })

  it("run the test", async () => {
    const { rpcClient, transportServer } = await testEnv.start()

    const { infiniteClientStream } = await testPort(rpcClient, "port1")

    expect(infiniteStreamClosed).toBeFalsy()
    let count = 0

    await expect(async () => {
      const infiniteGenerator = async function* () {
        try {
          infiniteStreamClosed = false
          while (true) {
            if (count++ == 10) {
              transportServer.close()
              break
            }
            yield Uint8Array.from([1])
          }
        } finally {
          infiniteStreamClosed = true
        }
      }

      await infiniteClientStream(infiniteGenerator())
    }).rejects.toThrow("RPC Transport closed")

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(infiniteStreamClosed).toBeTruthy()
  })
})

describe("Error in server transport closes the iterators", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    port.registerModule("echo", async (port) => ({
      infinite() {
        infiniteStreamClosed = false
        const ret: AsyncGenerator<Uint8Array> = {
          [Symbol.asyncIterator]: () => ret,
          async next() {
            return { value: Uint8Array.from([1]), done: false }
          },
          async return() {
            infiniteStreamClosed = true
            return { value: null, done: true }
          },
          async throw() {
            throw new Error("throw should never be called in this scenario")
          },
        }

        return ret
      },
    }))
  })

  it("runs the test", async () => {
    const { rpcClient, transportServer } = await testEnv.start()

    const { infinite } = await testPort(rpcClient, "port1")

    expect(infiniteStreamClosed).toEqual(false)
    let count = 0

    await expect(async () => {
      for await (const _ of await infinite()) {
        if (count++ == 10) {
          transportServer.emit("error", new Error("error"))
        }
      }
    }).rejects.toThrow("RPC Transport closed")

    // give it a second to finish, the memory transport adds some jitter to simulate
    // async network conditions
    await delay(10)

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(infiniteStreamClosed).toEqual(true)
  })
})

async function setupForFailures() {
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    port.registerModule("echo", async () => ({
      async infinite() {
        return Uint8Array.from([2])
      },
    }))
  })

  const { rpcClient, rpcServer, transportServer } = await testEnv.start()

  const { infinite } = await testPort(rpcClient, "port1")

  const events: string[] = []

  function logEvent(evt: string) {
    events.push(evt)
    process.stderr.write(evt + "\n")
  }

  transportServer.on("close", () => logEvent("transport: close"))
  transportServer.on("error", () => logEvent("transport: error"))
  rpcServer.on("transportClosed", () => logEvent("rpc: transportClosed"))
  rpcServer.on("transportError", () => logEvent("rpc: transportError"))

  // make sure everything works
  await infinite()

  expect(events).toEqual([])

  return { events, rpcClient, rpcServer, transportServer, testEnv }
}

describe("Unknown packets in the network close the transport", () => {
  it("disconnects the transport on empty messages", async () => {
    const { events, transportServer } = await setupForFailures()
    transportServer.emit("message", Uint8Array.of())
    expect(events).toEqual(["rpc: transportError", "rpc: transportClosed", "transport: close", "transport: error"])
  })

  it("disconnects the transport under known malformed messages", async () => {
    const { events, transportServer } = await setupForFailures()

    // sending invalid packages should raise an error

    transportServer.emit(
      "message",
      RpcMessageHeader.encode({
        messageIdentifier: calculateMessageIdentifier(RpcMessageTypes.RpcMessageTypes_CREATE_PORT_RESPONSE, 0),
      }).finish()
    )
    expect(events).toEqual(["rpc: transportError", "rpc: transportClosed", "transport: close", "transport: error"])
  })

  it("disconnects the transport under unknown message type", async () => {
    const { events, transportServer } = await setupForFailures()

    // sending invalid packages should raise an error
    transportServer.emit(
      "message",
      RpcMessageHeader.encode({
        messageIdentifier: calculateMessageIdentifier(0xfff, 0),
      }).finish()
    )
    expect(events).toEqual(["rpc: transportError", "rpc: transportClosed", "transport: close", "transport: error"])
  })

  it("disconnects the transport under unknown messages", async () => {
    const { events, transportServer } = await setupForFailures()

    // sending random things should not break anything
    transportServer.emit("message", Uint8Array.from([128, 109]))
    expect(events).toEqual(["rpc: transportError", "rpc: transportClosed", "transport: close", "transport: error"])
  })

  it("disconnects the transport under unknown messages 2", async () => {
    const { events, transportServer } = await setupForFailures()

    // sending random things should not break anything
    transportServer.emit("message", Uint8Array.from([8, 109]))
    expect(events).toEqual(["rpc: transportError", "rpc: transportClosed", "transport: close", "transport: error"])
  })
})
