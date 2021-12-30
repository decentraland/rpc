import { pushableChannel } from "../src/push-channel"
import { takeAsync } from "./helpers"

describe.only("push channel", () => {
  it("enqueues several elements and iterates through them", async () => {
    const chan = pushableChannel<number>(() => void 0)
    expect(chan.isClosed()).toEqual(false)

    const pushes = [chan.push(1), chan.push(2), chan.push(3)]

    const values: number[] = []

    for await (const val of chan) {
      values.push(val)
      expect(chan.isClosed()).toEqual(false)
      if (val == 3) {
        setTimeout(() => pushes.push(chan.push(4)), 100)
      } else if (val == 4) {
        chan.close()
        expect(chan.isClosed()).toEqual(true)
      }
    }

    expect(chan.isClosed()).toEqual(true)
    expect(values).toEqual([1, 2, 3, 4])
    // all promises must have ended after consumption
    await Promise.all(pushes)
    expect(values).toEqual([1, 2, 3, 4])
  })

  it("break in the iterator closes the channel", async () => {
    const chan = pushableChannel<number>(() => void 0)

    expect(chan.isClosed()).toEqual(false)
    void chan.push(0)
    expect(chan.isClosed()).toEqual(false)

    for await (const val of chan) {
      expect(val).toEqual(0)
      expect(chan.isClosed()).toEqual(false)
      break
    }

    expect(chan.isClosed()).toEqual(true)
  })

  it("it works as a job queue", async () => {
    const chan = pushableChannel<number>(() => void 0)

    void chan.push(0)
    void chan.push(1)
    void chan.push(2)
    void chan.push(3)
    void chan.push(4)

    const takeAll = takeAsync(chan.iterable)

    chan.close()

    expect(await takeAll).toEqual([0, 1, 2, 3, 4])
  })

  it("it works as a job queue, iterator still works after close", async () => {
    const chan = pushableChannel<number>(() => void 0)

    void chan.push(0)
    void chan.push(1)
    void chan.push(2)
    void chan.push(3)
    void chan.push(4)
    chan.close()

    expect(await takeAsync(chan.iterable)).toEqual([0, 1, 2, 3, 4])
  })

  it("throw in the iterator closes the channel", async () => {
    const chan = pushableChannel<number>(() => void 0)

    expect(chan.isClosed()).toEqual(false)
    void chan.push(0)
    expect(chan.isClosed()).toEqual(false)

    await expect(async () => {
      for await (const _ of chan) {
        throw new Error("safe")
      }
    }).rejects.toThrow("safe")

    expect(chan.isClosed()).toEqual(true)
  })

  it("close the channel asynchronously before yielding first time works", async () => {
    const chan = pushableChannel<number>(() => void 0)

    expect(chan.isClosed()).toEqual(false)

    const values: number[] = []

    // asynchronously close the channel
    setTimeout(() => chan.close(), 100)

    expect(chan.isClosed()).toEqual(false)

    for await (const val of chan) {
      values.push(val)
    }

    expect(chan.isClosed()).toEqual(true)
    expect(values).toEqual([])
  })

  it("close the channel without pending ops inside iterator breaks iterator", async () => {
    const chan = pushableChannel<number>(() => void 0)

    expect(chan.isClosed()).toEqual(false)

    let values: number[] = []

    void chan.push(1)

    expect(chan.isClosed()).toEqual(false)

    for await (const val of chan) {
      if (chan.isClosed()) throw new Error("did continue with iterator")
      values.push(val)
      // this should behave exactly as "break"
      chan.close()
      expect(chan.isClosed()).toEqual(true)
      await expect(async () => await chan.push(2)).rejects.toThrow("Channel is closed")
    }

    expect(chan.isClosed()).toEqual(true)
    expect(values).toEqual([1])
  })

  it("close the channel with failAndClose should make the iterator fail", async () => {
    const chan = pushableChannel<number>(() => void 0)

    expect(chan.isClosed()).toEqual(false)

    let values: number[] = []

    expect(chan.isClosed()).toEqual(false)

    setTimeout(() => chan.push(1).then(() => chan.failAndClose(new Error("safe"))), 10)

    await expect(async () => {
      for await (const val of chan) {
        values.push(val)
      }
    }).rejects.toThrow("safe")

    expect(chan.isClosed()).toEqual(true)
    expect(values).toEqual([1])
  })

  it("generator yield basic case", async () => {
    const chan = pushableChannel<number>(() => void 0)
    let values: number[] = []

    async function* generator() {
      let counter = 0
      for await (const val of chan) {
        yield val
        if (++counter == 3) throw new Error("reached 3")
      }
    }

    setTimeout(async () => {
      await chan.push(1)
      await chan.push(2)
      await chan.push(3)
    }, 10)

    await expect(async () => {
      for await (const val of generator()) {
        values.push(val)
      }
    }).rejects.toThrow("reached 3")

    expect(chan.isClosed()).toEqual(true)
    expect(values).toEqual([1, 2, 3])
  })
})
