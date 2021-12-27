import { RpcClient } from "../src"
import { log } from "../src/logger"
import { createSimpleTestEnvironment } from "./helpers"

async function testPort(rpcClient: RpcClient, portName: string) {
  const port = await rpcClient.createPort(portName)
  const module = (await port.loadModule("echo")) as {
    getPortId(): Promise<Uint8Array>
  }

  expect(module).toHaveProperty("getPortId")

  const getPortId = await module.getPortId()
  expect(getPortId).toEqual(Uint8Array.from([port.portId % 0xff]))

  return port
}

describe("Helpers simple req/res", () => {
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
      port.registerModule("echo", async (port) => ({
        async getPortId() {
          return Uint8Array.from([port.portId % 0xff])
        },
      }))
    },
  })

  it("creates the server", async () => {
    const { rpcClient } = testEnv

    const port1 = await testPort(rpcClient, "port1")
    const port2 = await testPort(rpcClient, "port2")
    const r1 = await testPort(rpcClient, "port3-repeated")
    const r2 = await testPort(rpcClient, "port3-repeated")

    expect(r1).toBe(r2)
    expect(r1).not.toBe(port1)
    expect(port1).not.toBe(port2)
  })
})
