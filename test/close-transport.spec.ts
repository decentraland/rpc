import { RpcClient } from "../src"
import { calculateMessageIdentifier } from "../src/protocol/helpers"
import { RpcMessageHeader, RpcMessageTypes } from "../src/protocol/index_pb"
import { createSimpleTestEnvironment } from "./helpers"

async function testPort(rpcClient: RpcClient, portName: string) {
  const port = await rpcClient.createPort(portName)
  return (await port.loadModule("echo")) as {
    infinite(): Promise<AsyncGenerator<Uint8Array>>
  }
}

describe("Close transport closes streams (server side)", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
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
    },
  })

  it("creates the server", async () => {
    const { rpcClient, transportServer } = testEnv

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
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
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
    },
  })

  it("creates the server", async () => {
    const { rpcClient, transportServer } = testEnv

    const { infinite } = await testPort(rpcClient, "port1")

    expect(infiniteStreamClosed).toEqual(false)
    let count = 0

    await expect(async () => {
      for await (const _ of await infinite()) {
        if (count++ == 10) {
          transportServer.emit('error', new Error('SOCKET DISCONNECTED'))
        }
      }
    }).rejects.toThrow("RPC Transport closed")

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(infiniteStreamClosed).toEqual(true)
  })
})



describe("Close transport closes streams (client side)", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
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
    },
  })

  it("creates the server", async () => {
    const { rpcClient, transportClient } = testEnv

    const { infinite } = await testPort(rpcClient, "port1")

    expect(infiniteStreamClosed).toEqual(false)
    let count = 0

    await expect(async () => {
      for await (const _ of await infinite()) {
        if (count++ == 10) {
          transportClient.close()
        }
      }
    }).rejects.toThrow("RPC Transport closed")

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(infiniteStreamClosed).toEqual(true)
  })
})

describe("Error in transport closes the transport", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
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
    },
  })

  it("creates the server", async () => {
    const { rpcClient, transportServer } = testEnv

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

    // the server AsyncGenerators must be closed after the transport is closed to avoid leaks
    expect(infiniteStreamClosed).toEqual(true)
  })
})

describe("Unknown packets in the network close the transport", () => {
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
      port.registerModule("echo", async () => ({
        async infinite() {
          return Uint8Array.from([2])
        },
      }))
    },
  })

  it("disconnects the transport under unknown messages", async () => {
    const { rpcClient, rpcServer, transportServer } = testEnv

    const { infinite } = await testPort(rpcClient, "port1")

    const events: string[] = []

    transportServer.on("close", () => events.push("transport: close"))
    transportServer.on("error", () => events.push("transport: error"))
    rpcServer.on("transportClosed", () => events.push("rpc: transportClosed"))
    rpcServer.on("transportError", () => events.push("rpc: transportError"))

    // make sure everything works
    await infinite()

    expect(events).toEqual([])

    // sending random things should not break anything
    transportServer.emit("message", Uint8Array.from([8, 109]))
    expect(events).toEqual([])

    // sending invalid packages should raise an error
    const badPacket = new RpcMessageHeader()
    badPacket.setMessageIdentifier(calculateMessageIdentifier(RpcMessageTypes.RPCMESSAGETYPES_CREATE_PORT_RESPONSE, 0))
    transportServer.emit("message", badPacket.serializeBinary())
    expect(events).toEqual(["rpc: transportError", "rpc: transportClosed", "transport: close", "transport: error"])
  })
})
