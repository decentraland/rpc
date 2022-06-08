import { log } from "./logger"
import { createSimpleTestEnvironment, delay } from "./helpers"
import { from } from "rxjs"

describe("RXJS Unsubscribe", () => {
  let remoteCallCounter = 0
  let closedAmount = 0
  const testEnv = createSimpleTestEnvironment<void>(async function (port) {
    log(`! Initializing port ${port.portId} ${port.portName}`)
    port.registerModule("echo", async (port) => ({
      async *infiniteCounter() {
        try {
          let counter = 0
          while (true) {
            remoteCallCounter++
            counter++
            log("infiniteCounter yielding #" + counter + " " + (counter % 0xff))
            yield new Uint8Array([counter % 0xff])
          }
        } finally {
          closedAmount++
        }
      },
    }))
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
    closedAmount = 0

    const gen = from(await module.infiniteCounter())

    const subscription = gen.subscribe((u8a) => {
      values.push(u8a)
      localCallCounter++
      if (localCallCounter == FINAL_RESULT.length) subscription.unsubscribe()
    })

    await delay(100)

    expect(closedAmount).toEqual(1)
    expect(new Uint8Array(Buffer.concat(values))).toEqual(FINAL_RESULT)

    expect(remoteCallCounter).toEqual(localCallCounter)
  })
})
