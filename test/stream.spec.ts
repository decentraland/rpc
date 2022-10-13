import { RpcClient } from "../src"
import { log } from "./logger"
import { createSimpleTestEnvironment, delay, takeAsync } from "./helpers"
import { pushableChannel } from "../src/push-channel"
import mitt from "mitt"
import future from "fp-future"

async function testPort(rpcClient: RpcClient, portName: string) {
  log(`> Creating Port ${portName}`)

  log("> Loading module echo")
  const port = await rpcClient.createPort(portName)
  const module = (await port.loadModule("echo")) as {
    basic(): Promise<Uint8Array>
    getPortId(): Promise<Uint8Array>
    identity(data: Uint8Array): Promise<Uint8Array>
  }

  expect(module).toHaveProperty("basic")
  expect(module).toHaveProperty("getPortId")
  expect(module).toHaveProperty("identity")

  const result = await module.basic()
  expect(result).toEqual(Uint8Array.from([0, 1, 2]))
  const getPortId = await module.getPortId()
  expect(getPortId).toEqual(Uint8Array.from([port.portId % 0xff]))
  const identity1 = await module.identity(Uint8Array.from([3]))
  expect(identity1).toEqual(Uint8Array.from([3]))
  const identity2 = await module.identity(Uint8Array.from([4]))
  expect(identity2).toEqual(Uint8Array.from([4]))

  return port
}

describe("Server stream Helpers simple req/res", () => {
  let remoteCallCounter = 0
  let asynchronousBidirectionalStreamSum = 0
  let channel: ReturnType<typeof pushableChannel>

  const asyncJobs: Promise<any>[] = []

  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    log(`! Initializing port ${port.portId} ${port.portName}`)
    port.registerModule("echo", async (port) => ({
      async *basic() {
        yield Uint8Array.from([0])
        yield Uint8Array.from([1])
        yield Uint8Array.from([2])
        yield Uint8Array.from([3])
      },
      async *throwFirst() {
        log("Will throw!")
        throw new Error("safe error 1")
      },
      async *throwSecond() {
        yield Uint8Array.from([0])
        throw new Error("safe error 2")
      },
      async *infiniteCounter() {
        let counter = 0
        while (true) {
          remoteCallCounter++
          counter++
          log("infiniteCounter yielding #" + counter + " " + (counter % 0xff))
          yield new Uint8Array([counter % 0xff])
        }
      },
      async *parameterCounter(data) {
        let total = data[0]
        while (total > 0) {
          total--
          yield new Uint8Array([total % 0xff])
        }
      },
      async clientStreamConsumedCompletely(stream) {
        if (stream instanceof Uint8Array) throw new Error("argument is not stream")
        const arr: Uint8Array[] = []
        await consumeInto(stream, arr)
        return Uint8Array.from(Buffer.concat(arr))
      },
      async consumeCompleteStreamAsynchronously(stream) {
        if (stream instanceof Uint8Array) throw new Error("argument is not stream")
        const arr: Uint8Array[] = [new Uint8Array([0])]
        void consumeInto(stream, arr)
        return Uint8Array.from(Buffer.concat(arr))
      },
      async consume100FromClientStream(stream): Promise<Uint8Array> {
        if (stream instanceof Uint8Array) throw new Error("argument is not stream")
        const r = await takeAsync(stream, 100)
        return Uint8Array.from([r.length])
      },
      async *synchronousBidirectionalStream(stream) {
        if (stream instanceof Uint8Array) throw new Error("argument is not stream")
        for await (const $ of stream) {
          yield Uint8Array.from([$[0], $[0] * 2])
        }
      },
      async neverOpensClientStream(stream) {
        if (stream instanceof Uint8Array) throw new Error("argument is not stream")
        return Uint8Array.from([123])
      },
      async asyncJob(stream) {
        if (stream instanceof Uint8Array) throw new Error("argument is not stream")

        const number =
          asyncJobs.push(
            (async () => {
              await delay(10)
              await takeAsync(stream, 10)
            })()
          ) - 1

        // returns the index of the async job to run assertions
        return Uint8Array.from([number])
      },
      async *asynchronousBidirectionalStream(stream) {
        if (stream instanceof Uint8Array) throw new Error("argument is not stream")
        ;(async () => {
          for await (const $ of stream) {
            asynchronousBidirectionalStreamSum += $[0]
          }
        })()

        let i = 0
        while (true) {
          yield Uint8Array.from([i, i * 2])
          i++
          if (i === 100) break
        }
      },
    }))
  })

  it("basic iteration", async () => {
    const { rpcClient } = await testEnv.start()
    const port = await rpcClient.createPort("test1")
    const module = (await port.loadModule("echo")) as {
      basic(): Promise<AsyncGenerator<Uint8Array>>
    }
    let values: Uint8Array[] = []
    for await (const u8a of await module.basic()) {
      values.push(u8a)
    }
    expect(new Uint8Array(Buffer.concat(values))).toEqual(new Uint8Array([0, 1, 2, 3]))
  })

  it("fails in async generator before yielding, the async iterator in our end throws", async () => {
    const { rpcClient } = await testEnv.start()
    const port = await rpcClient.createPort("test1")
    const module = (await port.loadModule("echo")) as {
      throwFirst(): Promise<AsyncGenerator<Uint8Array>>
    }
    let values: any[] = []

    await expect(async () => {
      for await (const u8a of await module.throwFirst()) {
        values.push(u8a)
      }
    }).rejects.toThrow("RemoteError: safe error 1")

    expect(values).toEqual([])
  })

  it("yields one result and then throws. must end the stream with exception and the first result must arrive correctly", async () => {
    const { rpcClient } = await testEnv.start()
    const port = await rpcClient.createPort("test1")
    const module = (await port.loadModule("echo")) as {
      throwSecond(): Promise<AsyncGenerator<Uint8Array>>
    }
    let values: any[] = []

    await expect(async () => {
      for await (const u8a of await module.throwSecond()) {
        values.push(u8a)
      }
    }).rejects.toThrow("RemoteError: safe error 2")

    expect(values).toEqual([new Uint8Array([0])])
  })

  it("a remote infiniteCounter is stopped via exception from client side on third iteration", async () => {
    const { rpcClient } = await testEnv.start()
    const port = await rpcClient.createPort("test1")
    const module = (await port.loadModule("echo")) as {
      infiniteCounter(): Promise<AsyncGenerator<Uint8Array>>
    }
    const values: Uint8Array[] = []
    const FINAL_RESULT = new Uint8Array([1, 2, 3])

    const generator = (await module.infiniteCounter())[Symbol.asyncIterator]()

    remoteCallCounter = 0

    values.push(await (await generator.next()).value)
    values.push(await (await generator.next()).value)
    values.push(await (await generator.next()).value)
    await generator.throw(new Error("closed locally"))

    expect(new Uint8Array(Buffer.concat(values))).toEqual(FINAL_RESULT)
  })

  it("a remote infiniteCounter is gracefully stopped from client side on third iteration", async () => {
    const { rpcClient } = await testEnv.start()
    const port = await rpcClient.createPort("test1")
    const module = (await port.loadModule("echo")) as {
      infiniteCounter(): Promise<AsyncGenerator<Uint8Array>>
    }
    const values: Uint8Array[] = []
    const FINAL_RESULT = new Uint8Array([1, 2, 3])
    let localCallCounter = 0
    remoteCallCounter = 0

    for await (const u8a of await module.infiniteCounter()) {
      values.push(u8a)
      localCallCounter++
      if (localCallCounter == FINAL_RESULT.length) break
    }

    expect(new Uint8Array(Buffer.concat(values))).toEqual(FINAL_RESULT)

    expect(remoteCallCounter).toEqual(localCallCounter)
  })

  it("a remote infiniteCounter is halted IF the transport is forcefully closed", async () => {
    const { rpcClient, transportServer } = await testEnv.start()
    const port = await rpcClient.createPort("test1")
    const module = (await port.loadModule("echo")) as {
      infiniteCounter(): Promise<AsyncGenerator<Uint8Array>>
    }
    const values: Uint8Array[] = []
    const FINAL_RESULT = new Uint8Array([1, 2, 3])
    let localCallCounter = 0
    remoteCallCounter = 0

    await expect(async () => {
      for await (const u8a of await module.infiniteCounter()) {
        values.push(u8a)
        localCallCounter++
        if (localCallCounter == FINAL_RESULT.length) {
          transportServer.close()
        }
      }
    }).rejects.toThrow("RPC Transport closed")

    expect(new Uint8Array(Buffer.concat(values))).toEqual(FINAL_RESULT)

    expect(remoteCallCounter).toEqual(localCallCounter)
  })

  describe("clientStream", () => {
    it("client is consumed completely", async () => {
      const { rpcClient } = await testEnv.start()
      const port = await rpcClient.createPort("test1")
      const module = (await port.loadModule("echo")) as {
        clientStreamConsumedCompletely(stream: AsyncIterator<Uint8Array>): Promise<Uint8Array>
      }

      async function* it() {
        yield new Uint8Array([1])
        yield new Uint8Array([2])
        yield new Uint8Array([3])
        yield new Uint8Array([4])
        yield new Uint8Array([5])
      }

      const ret = await module.clientStreamConsumedCompletely(it())
      expect(ret).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    })

    it("client is consumed asynchronously completely", async () => {
      const { rpcClient } = await testEnv.start()
      const port = await rpcClient.createPort("test1")
      const module = (await port.loadModule("echo")) as {
        consumeCompleteStreamAsynchronously(stream: AsyncIterator<Uint8Array>): Promise<Uint8Array>
      }

      const didFinish = future<boolean>()

      async function* it() {
        yield new Uint8Array([1])
        yield new Uint8Array([2])
        yield new Uint8Array([3])
        yield new Uint8Array([4])
        yield new Uint8Array([5])
        didFinish.resolve(true)
      }

      const ret = await module.consumeCompleteStreamAsynchronously(it())
      expect(ret).toEqual(new Uint8Array([0]))
      expect(await didFinish).toEqual(true)
    })

    it("client stream is closed by server", async () => {
      const { rpcClient } = await testEnv.start()
      const port = await rpcClient.createPort("test1")
      const module = (await port.loadModule("echo")) as {
        consume100FromClientStream(stream: AsyncIterator<Uint8Array>): Promise<Uint8Array>
      }

      const didFinish = future<boolean>()

      async function* it() {
        let i = 0
        try {
          while (true) {
            yield new Uint8Array([i++ % 256])
          }
        } finally {
          didFinish.resolve(true)
        }
      }

      expect(await module.consume100FromClientStream(it())).toEqual(Uint8Array.from([100]))
      expect(await didFinish).toEqual(true)
    })

    it("client is consumed and server generates one result for each client element", async () => {
      const { rpcClient } = await testEnv.start()
      const port = await rpcClient.createPort("test1")
      const module = (await port.loadModule("echo")) as {
        synchronousBidirectionalStream(stream: AsyncIterator<Uint8Array>): Promise<AsyncGenerator<Uint8Array>>
      }

      const didFinish = future<boolean>()

      async function* it() {
        let i = 0
        try {
          while (true) {
            yield new Uint8Array([i++ % 256])
          }
        } finally {
          didFinish.resolve(true)
        }
      }

      const results = await takeAsync(await module.synchronousBidirectionalStream(it()), 100)

      expect(results).toHaveLength(100)

      let i = 0

      for (const $ of results) {
        expect($).toEqual(Uint8Array.from([i, i * 2]))
        i++
      }

      expect(await didFinish).toEqual(true)
    })

    it("client stream is never opened by server", async () => {
      const { rpcClient } = await testEnv.start()
      const port = await rpcClient.createPort("test1")
      const module = (await port.loadModule("echo")) as {
        neverOpensClientStream(stream: AsyncIterator<Uint8Array>): Promise<Uint8Array>
      }

      let didHappen = false

      async function* it() {
        didHappen = true
        throw new Error("this should never happen")
      }

      expect(await module.neverOpensClientStream(it())).toEqual(Uint8Array.from([123]))
      expect(didHappen).toBeFalsy()
    })

    it("client stream cannot be consumed if server sent an asnwer", async () => {
      const { rpcClient } = await testEnv.start()
      const port = await rpcClient.createPort("test1")
      const module = (await port.loadModule("echo")) as {
        asyncJob(stream: AsyncIterator<Uint8Array>): Promise<Uint8Array>
      }

      // 1. call the server with an iterator that fails on its first iteration
      // 2. the server will schedule an async job to consume the iterator and
      //    it will return immediately after that
      // 3. we get the response from the server
      // 4. the async job will fail to consume the stream with a stream not
      //    available error

      let didHappen = false

      async function* it() {
        didHappen = true
        throw new Error("this should never happen")
      }

      const result = await module.asyncJob(it())
      const jobId = result[0]

      await expect(asyncJobs[jobId]).rejects.toThrow('ClientStream lost')
    })

    it("client is consumed while server generates results asynchronous", async () => {
      const { rpcClient } = await testEnv.start()
      const port = await rpcClient.createPort("test1")
      const module = (await port.loadModule("echo")) as {
        asynchronousBidirectionalStream(stream: AsyncIterator<Uint8Array>): Promise<AsyncGenerator<Uint8Array>>
      }

      const didFinish = future<boolean>()

      async function* it() {
        let i = 0
        try {
          while (true) {
            yield new Uint8Array([i++ % 256])
            if (i === 100) break
          }
        } finally {
          didFinish.resolve(true)
        }
      }


      const results = await takeAsync(await module.asynchronousBidirectionalStream(it()), 100)
      expect(results).toHaveLength(100)

      let i = 0

      for (const $ of results) {
        expect($).toEqual(Uint8Array.from([i, i * 2]))
        i++
      }

      expect(await didFinish).toEqual(true)
      expect(asynchronousBidirectionalStreamSum).toEqual(4950)
    })
  })
})

async function consumeInto<T>(stream: AsyncIterable<T>, into: T[]) {
  for await (const thing of stream) {
    into.push(thing)
  }
}
