import { RpcClient, RpcServerPort } from "../src"
import { log } from "./logger"
import { createSimpleTestEnvironment } from "./helpers"
export type BasicTestModule = {
  basic(): Promise<Uint8Array>
  getPortId(): Promise<Uint8Array>
  returnEmpty(): Promise<void>
  identity(data: Uint8Array): Promise<Uint8Array>
  assert(t: Uint8Array): Promise<Uint8Array>
}

export async function configureTestPortServer<Context = { key: boolean }>(
  port: RpcServerPort<any>,
  assert?: (t: Uint8Array, context: Context) => Promise<Uint8Array>
) {
  log(`! Initializing port ${port.portId} ${port.portName}`)
  port.registerModule("fails", async (port, context): Promise<any> => {
    throw new Error("Failed while creating ModuLe")
  })
  port.registerModule("echo", async (port, context): Promise<BasicTestModule> => {
    if (!context.key) throw new Error("missing key in context")
    return {
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
      assert: assert as any,
    }
  })
}
export async function testPort(rpcClient: RpcClient, portName: string) {
  log(`> Creating client port ${portName}`)
  const port = await rpcClient.createPort(portName)
  log("> Loading module echo")

  const module = (await port.loadModule("echo")) as BasicTestModule

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
  const testEnv = createSimpleTestEnvironment(async function (port) {
    await configureTestPortServer(port)
  })

  it("creates the server and gracefully fails if a module creation fails", async () => {
    const { rpcClient } = await testEnv.start({ key: true })

    const port1 = await testPort(rpcClient, "port1")
    await expect(() => port1.loadModule("fails")).rejects.toThrowError("Failed while creating ModuLe")
    await expect(() => port1.loadModule("unknown-module")).rejects.toThrowError(
      "Module unknown-module is not available for port port1"
    )
    const port2 = await testPort(rpcClient, "port2")

    expect(port1).not.toBe(port2)
  })
})
