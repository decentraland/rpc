import { RpcClient } from "../src"
import { log } from "./logger"
import { createSimpleTestEnvironment, delay } from "./helpers"
import { pushableChannel } from "../src/push-channel"
import mitt from "mitt"

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

describe("Helpers simple req/res", () => {
  let remoteCallCounter = 0
  const events = mitt<{ a: Uint8Array }>()
  let channel: ReturnType<typeof pushableChannel>
  const testEnv = createSimpleTestEnvironment(async function (port) {
    log(`! Initializing port ${port.portId} ${port.portName}`)
    port.registerModule("echo", async (port) => ({
      async *basic() {
        yield Uint8Array.from([0])
        yield Uint8Array.from([1])
        yield Uint8Array.from([2])
        yield Uint8Array.from([3])
      },
      async *throwFirst() {
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
      async *manualHackWithPushableChannel() {
        channel = pushableChannel<Uint8Array>(() => deferCloseChannel)
        // subscribe to room message
        events.on("a", channel.push)
        // forward all messages
        for await (const message of channel) {
          yield message as Uint8Array
        }

        // then close the channel
        channel.close()

        function deferCloseChannel() {
          events.off("a", channel.push)
        }
      },
      async *parameterCounter(data) {
        let total = data[0]
        while (total > 0) {
          total--
          yield new Uint8Array([total % 0xff])
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

    let localCallCounter = 0
    remoteCallCounter = 0
    await expect(async () => {
      for await (const u8a of await module.infiniteCounter()) {
        values.push(u8a)
        localCallCounter++
        if (localCallCounter == FINAL_RESULT.length) throw new Error("closed locally")
      }
    }).rejects.toThrow("closed locally")

    expect(new Uint8Array(Buffer.concat(values))).toEqual(FINAL_RESULT)

    expect(remoteCallCounter).toEqual(localCallCounter)
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

  it("a remote manualHackWithPushableChannel is gracefully stopped from client side on third iteration", async () => {
    const { rpcClient } = await testEnv.start()
    const port = await rpcClient.createPort("test1")
    const module = (await port.loadModule("echo")) as {
      manualHackWithPushableChannel(): Promise<AsyncGenerator<Uint8Array>>
    }

    async function test() {
      for await (const u8a of await module.manualHackWithPushableChannel()) {
        expect(channel.isClosed()).toEqual(false)
        return u8a
      }
    }

    const ret = test()

    await delay(100)

    events.emit("a", new Uint8Array([1]))
    expect(await ret).toEqual(new Uint8Array([1]))

    await delay(100)
    expect(channel.isClosed()).toEqual(true)
  })
})
