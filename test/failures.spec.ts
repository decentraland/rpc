import { RpcClient } from "../src"
import { createSimpleTestEnvironment } from "./helpers"

async function testPort(rpcClient: RpcClient, moduleName: string) {
  const port = await rpcClient.createPort("MyPortName")
  return (await port.loadModule(moduleName)) as {
    basic(): Promise<Uint8Array>
  }
}

describe("Fails creating port", () => {
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
      port.registerModule("fails", async (port) => {
        throw new Error("Access denied")
      })
      port.registerModule("works", async (port) => {
        return {
          async basic() {
            return Uint8Array.from([1])
          },
        }
      })
    },
  })

  it("fails to create a port", async () => {
    const { rpcClient } = testEnv

    await expect(testPort(rpcClient, "fails")).rejects.toThrow("RemoteError: Access denied")
  })

  it("rpcClient still works after failure", async () => {
    const { rpcClient } = testEnv

    const { basic } = await testPort(rpcClient, "works")
    expect(await basic()).toEqual(Uint8Array.from([1]))
  })
})
