import { RpcClient } from "../src"
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

const testEnv = createSimpleTestEnvironment<void>(async function (port) {
  port.registerModule("echo", async (port) => ({
    async getPortId() {
      return Uint8Array.from([port.portId % 0xff])
    },
  }))
})

describe("Helpers simple req/res", () => {
  it("creates the server", async () => {
    const { rpcClient } = await testEnv.start()

    const port1 = await testPort(rpcClient, "port1")
    const port2 = await testPort(rpcClient, "port2")
    const r1 = await testPort(rpcClient, "port3-repeated")
    const r2 = await testPort(rpcClient, "port3-repeated")

    expect(r1).toBe(r2)
    expect(r1).not.toBe(port1)
    expect(port1).not.toBe(port2)
  })
})

describe("Close ports", () => {
  it("When reusing open ports it returns the same ports", async () => {
    const { rpcClient } = await testEnv.start()

    const port1 = await testPort(rpcClient, "port")
    const port2 = await testPort(rpcClient, "port")
    expect(port1.state).toEqual("open")
    expect(port1).toEqual(port2)
    port1.close()
    expect(port1.state).toEqual("closed")

    const port1_1 = await testPort(rpcClient, "port")
    const port2_1 = await testPort(rpcClient, "port")
    expect(port1_1).toEqual(port2_1)
    expect(port1_1).not.toEqual(port1)
    expect(port1_1.state).toEqual("open")
  })
})
