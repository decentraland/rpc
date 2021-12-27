import { RpcClient } from "../src"
import { log } from "./logger"
import { createSimpleTestEnvironment } from "./helpers"

async function testPort(rpcClient: RpcClient, portName: string) {
  log(`> Creating Port ${portName}`)
  const port = await rpcClient.createPort(portName)
  log("> Loading module echo")

  const module = (await port.loadModule("echo")) as {
    basic(): Promise<Uint8Array>
    getPortId(): Promise<Uint8Array>
    returnEmpty(): Promise<void>
    identity(data: Uint8Array): Promise<Uint8Array>
  }

  expect(module).toHaveProperty("basic")
  expect(module).toHaveProperty("getPortId")
  expect(module).toHaveProperty("identity")

  const resultEmpty = await module.returnEmpty()
  expect(resultEmpty).toBeUndefined()
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
        async returnEmpty() {},
        async basic() {
          return Uint8Array.from([0, 1, 2])
        },
        async getPortId() {
          return Uint8Array.from([port.portId % 0xff])
        },
        async identity(test) {
          return test
        },
      }))
    },
  })

  it("creates the server", async () => {
    const { rpcClient } = testEnv

    const port1 = await testPort(rpcClient, "port1")
    const port2 = await testPort(rpcClient, "port2")

    expect(port1).not.toBe(port2)
  })
})
