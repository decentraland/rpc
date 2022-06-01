import { RpcClient } from "../src"
import { calculateMessageIdentifier } from "../src/protocol/helpers"
import { RpcMessageHeader, RpcMessageTypes } from "../src/protocol"
import { createSimpleTestEnvironment, delay } from "./helpers"

async function testPort(rpcClient: RpcClient, portName: string) {
  const port = await rpcClient.createPort(portName)
  return (await port.loadModule("echo")) as {
    infinite(): Promise<AsyncGenerator<Uint8Array>>
  }
}

describe("Close transport closes streams (server side)", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment(async function (port) {
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
  const testEnv = createSimpleTestEnvironment(async function (port) {
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

describe("Close transport closes streams (client side)", () => {
  let infiniteStreamClosed = 0
  const testEnv = createSimpleTestEnvironment(async function (port) {
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

describe("Error in transport closes the transport", () => {
  let infiniteStreamClosed = false
  const testEnv = createSimpleTestEnvironment(async function (port) {
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
  const testEnv = createSimpleTestEnvironment(async function (port) {
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
