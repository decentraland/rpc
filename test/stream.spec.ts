import { RpcClient } from "../src"
import { log } from "../src/logger"
import { createSimpleTestEnvironment } from "./helpers"

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
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
      log(`! Initializing port ${port.portId} ${port.portName}`)
      port.registerModule("echo", async (port) => ({
        async *basic() {
          yield Uint8Array.from([0])
          yield Uint8Array.from([1])
          yield Uint8Array.from([2])
          yield Uint8Array.from([3])
        },
        async *throwFirst() {
          throw new Error("safe error")
        },
        async *throwSecond() {
          yield Uint8Array.from([0])
          throw new Error("safe error")
        },
        async *infiniteCounter() {
          let counter = 0
          while (true) {
            counter++
            const d = new DataView(new Uint8Array(16).fill(0))
            d.setUint32(0, counter)
            yield new Uint8Array(d.buffer)
          }
        },
        async *parameterCounter(data) {
          let total = data[0]
          while (total > 0) {
            total--
            const d = new DataView(new Uint8Array(16).fill(0))
            d.setUint32(0, total)
            yield new Uint8Array(d.buffer)
          }
        },
      }))
    },
  })

  it("creates the server", async () => {
    const { rpcClient } = testEnv
    const port = await rpcClient.createPort("test1")
    const module = (await port.loadModule("echo")) as {
      basic(): Promise<AsyncGenerator<Uint8Array>>
      throwFirst(): Promise<AsyncGenerator<Uint8Array>>
      throwSecond(): Promise<AsyncGenerator<Uint8Array>>
    }
    let values: any[] = []
    for await (const u8a of await module.basic()) {
      values.push(u8a)
    }
    console.dir(values)
  })
})
