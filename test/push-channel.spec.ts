import mitt from "mitt"
import { lastValueFrom, from, map } from "rxjs"
import { AsyncQueue, linkedList, pushableChannel } from "../src/push-channel"
import { takeAsync } from "./helpers"

function promisify(fn) {
  return (...args) => {
    return new Promise<void>((resolve, reject) => fn(...args, x => x ? reject(x) : resolve()))
  }
}

describe('linked list', () => {
  it('adds one, removes one', () => {
    const l = linkedList<number>()
    expect(l.isEmpty()).toBeTruthy()
    expect(l.dequeue()).toBe(undefined)
    expect(l.isEmpty()).toBeTruthy()
    l.enqueue(1)
    expect(l.dequeue()).toEqual(1)
    expect(l.isEmpty()).toBeTruthy()
    expect(l.dequeue()).toBe(undefined)
    expect(l.isEmpty()).toBeTruthy()
    l.enqueue(1)
    expect(l.isEmpty()).toBeFalsy()
    l.enqueue(2)
    l.enqueue(3)
    expect(l.isEmpty()).toBeFalsy()
    expect(l.dequeue()).toEqual(1)
    expect(l.dequeue()).toEqual(2)
    expect(l.isEmpty()).toBeFalsy()
    expect(l.dequeue()).toEqual(3)
    expect(l.isEmpty()).toBeTruthy()
    expect(l.dequeue()).toBe(undefined)
  })
})

describe("push channel", () => {
  it("enqueues several elements and iterates through them", async () => {
    const chan = pushableChannel<number>(() => void 0)
    expect(chan.isClosed()).toEqual(false)

    const push = promisify(chan.push)

    const pushes = [push(1), push(2), push(3)]

    const values: number[] = []

    for await (const val of chan) {
      values.push(val)
      expect(chan.isClosed()).toEqual(false)
      if (val == 3) {
        setTimeout(() => pushes.push(push(4)), 100)
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
    let closedCalled = false
    const chan = pushableChannel<number>(() => {
      closedCalled = true
    })
    const push = promisify(chan.push)

    expect(chan.isClosed()).toEqual(false)
    push(0)
    expect(chan.isClosed()).toEqual(false)

    for await (const val of chan) {
      expect(val).toEqual(0)
      expect(chan.isClosed()).toEqual(false)
      break
    }

    expect(chan.isClosed()).toEqual(true)
    expect(closedCalled).toEqual(true)
  })

  it("breaking the channel as generator should finish execution", async () => {
    let closedCalled = false
    const events = mitt()

    async function* test() {
      const chan = pushableChannel<any>(() => {
        closedCalled = true
        events.off("*", push)
      })
      const push = promisify(chan.push)
      events.on("*", push)
      for await (const num of chan) {
        yield num
      }
    }

    const ret = takeAsync(test(), 3)

    await new Promise((ret) => setTimeout(ret, 100))

    void events.emit("a", 0)
    void events.emit("a", 0)
    void events.emit("a", 0)

    await new Promise((ret) => setTimeout(ret, 100))

    expect(await ret).toEqual(["a", "a", "a"])
    expect(closedCalled).toEqual(true)
  })

  it("it works as a job queue", async () => {
    const chan = pushableChannel<number>(() => void 0)
    const push = promisify(chan.push)

    const jobs = Promise.all([
      push(0),
      push(1),
      push(2),
      push(3),
      push(4)
    ])

    const takeAll = takeAsync(chan.iterable)
    await jobs

    chan.close()

    expect(await takeAll).toEqual([0, 1, 2, 3, 4])
  })

  it("it works as a job queue, iterator still works after close", async () => {
    const chan = pushableChannel<number>(() => void 0)
    const push = promisify(chan.push)

    const jobs = Promise.all([
      push(0),
      push(1),
      push(2),
      push(3),
      push(4)
    ])

    chan.close()

    const takeAll = takeAsync(chan.iterable)

    await jobs

    expect(await takeAll).toEqual([0, 1, 2, 3, 4])
  })

  it("throw in the iterator closes the channel", async () => {
    const chan = pushableChannel<number>(() => void 0)
    const push = promisify(chan.push)
    expect(chan.isClosed()).toEqual(false)
    void push(0)
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
    const push = promisify(chan.push)
    expect(chan.isClosed()).toEqual(false)

    let values: number[] = []

    void push(1)

    expect(chan.isClosed()).toEqual(false)

    for await (const val of chan) {
      if (chan.isClosed()) throw new Error("did continue with iterator")
      values.push(val)
      // this should behave exactly as "break"
      chan.close()
      expect(chan.isClosed()).toEqual(true)
      await expect(async () => await push(2)).rejects.toThrow("Channel is closed")
    }

    expect(chan.isClosed()).toEqual(true)
    expect(values).toEqual([1])
  })

  it("rxjs consumer reads a value after start the stream", async () => {
    const chan = pushableChannel<number>(() => void 0)
    const push = promisify(chan.push)
    expect(chan.isClosed()).toEqual(false)

    const result = lastValueFrom(from(chan))

    expect(chan.isClosed()).toEqual(false)

    await push(1)
    chan.close()

    expect(chan.isClosed()).toEqual(true)

    expect(await result).toEqual(1)
  })

  it("emit one, read one, then pause. read callback is triggered", async () => {
    const chan = pushableChannel<number>(() => void 0)
    const push = promisify(chan.push)
    expect(chan.isClosed()).toEqual(false)

    expect(chan.isClosed()).toEqual(false)

    const [pushed, next] = await Promise.all([
      push(1),
      chan.iterable.next()
    ])

    expect(chan.isClosed()).toEqual(false)
    expect(await next.value).toEqual(1)

    chan.close()

    expect(chan.isClosed()).toEqual(true)
  })

  it("emit three, read one, then close stream. pending pushes must fail", async () => {
    const chan = pushableChannel<number>(() => void 0)
    const push = promisify(chan.push)
    expect(chan.isClosed()).toEqual(false)

    expect(chan.isClosed()).toEqual(false)

    const pushes = Promise.allSettled([
      push(1),
      push(2),
      push(3),
    ])

    expect((await chan.iterable.next()).value).toEqual(1)


    expect(chan.isClosed()).toEqual(false)
    await chan.iterable.return(null)
    expect(chan.isClosed()).toEqual(true)

    expect((await pushes).map($ => $.status)).toEqual(["fulfilled", "rejected", "rejected"])
  })


  it("rxjs consumer reads all preexistent values", async () => {
    const chan = pushableChannel<number>(() => void 0)
    expect(chan.isClosed()).toEqual(false)
    const push = promisify(chan.push)

    const promises = [push(1), push(2), push(3)]

    const result = lastValueFrom(from(chan))

    expect(chan.isClosed()).toEqual(false)
    chan.close()
    expect(chan.isClosed()).toEqual(true)

    await Promise.all(promises)

    expect(await result).toEqual(3)
  })

  it("async consumer reads all preexistent values", async () => {
    const chan = pushableChannel<number>(() => void 0)
    expect(chan.isClosed()).toEqual(false)
    const push = promisify(chan.push)

    const promises = [push(1), push(2), push(3)]

    expect(await (await chan.iterable.next()).value).toEqual(1)
    expect(await (await chan.iterable.next()).value).toEqual(2)
    expect(await (await chan.iterable.next()).value).toEqual(3)

    await Promise.all(promises)

    expect(chan.isClosed()).toEqual(false)
    chan.close()
    expect(chan.isClosed()).toEqual(true)
  })

  it("async consumer reads zero values if the channel is closed", async () => {
    const chan = pushableChannel<number>(() => void 0)
    expect(chan.isClosed()).toEqual(false)

    const result = lastValueFrom(from(chan))

    expect(chan.isClosed()).toEqual(false)
    chan.close()
    expect(chan.isClosed()).toEqual(true)

    await expect(() => result).rejects.toMatchObject({ message: 'no elements in sequence' })
  })

  it("close the channel with failAndClose should make the iterator fail", async () => {
    const chan = pushableChannel<number>(() => void 0)
    const push = promisify(chan.push)
    expect(chan.isClosed()).toEqual(false)

    let values: number[] = []

    expect(chan.isClosed()).toEqual(false)

    setImmediate(() => { push(1).then(() => chan.failAndClose(new Error("safe"))) })

    await expect(async () => {
      for await (const val of chan) {
        values.push(val)
      }
    }).rejects.toThrow("safe")

    expect(chan.isClosed()).toEqual(true)
    expect(values).toEqual([1])
  })

  it("generator yield basic case", async () => {
    let chan = pushableChannel<number>(() => void 0)
    const push = promisify(chan.push)
    let values: number[] = []

    async function* generator() {
      let counter = 0
      for await (const val of chan) {
        yield val
        if (++counter == 3) throw new Error("reached 3")
      }
    }

    setTimeout(async () => {
      await push(1)
      await push(2)
      await push(3)
    }, 10)

    expect(chan.isClosed()).toEqual(false)

    await expect(async () => {
      for await (const val of generator()) {
        values.push(val)
      }
    }).rejects.toThrow("reached 3")

    expect(chan.isClosed()).toEqual(true)
    expect(values).toEqual([1, 2, 3])
  })
})

describe("async queue", () => {
  it("enqueues several elements and iterates through them", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    const pushes = [chan.enqueue(1), chan.enqueue(2), chan.enqueue(3)]

    const values: number[] = []

    for await (const val of chan) {
      values.push(val)
      expect(chan.closed).toEqual(false)
      if (val == 3) {
        setTimeout(() => pushes.push(chan.enqueue(4)), 100)
      } else if (val == 4) {
        chan.close()
        expect(chan.closed).toEqual(true)
      }
    }

    expect(chan.closed).toEqual(true)
    expect(values).toEqual([1, 2, 3, 4])
    // all promises must have ended after consumption
    await Promise.all(pushes)
    expect(values).toEqual([1, 2, 3, 4])
  })

  it("break in the iterator closes the channel", async () => {
    let closedCalled = false
    const chan = new AsyncQueue<number>((_, reason) => {
      if (reason == 'close') closedCalled = true
    })

    expect(chan.closed).toEqual(false)
    chan.enqueue(0)
    expect(chan.closed).toEqual(false)

    for await (const val of chan) {
      expect(val).toEqual(0)
      expect(chan.closed).toEqual(false)
      break
    }

    expect(chan.closed).toEqual(true)
    expect(closedCalled).toEqual(true)
  })

  it("breaking the channel as generator should finish execution", async () => {
    let closedCalled = false
    const events = mitt()

    async function* test() {
      const chan = pushableChannel<any>(() => {
        closedCalled = true
        events.off("*", push)
      })
      const push = promisify(chan.push)
      events.on("*", push)
      for await (const num of chan) {
        yield num
      }
    }

    const ret = takeAsync(test(), 3)

    await new Promise((ret) => setTimeout(ret, 100))

    void events.emit("a", 0)
    void events.emit("a", 0)
    void events.emit("a", 0)

    await new Promise((ret) => setTimeout(ret, 100))

    expect(await ret).toEqual(["a", "a", "a"])
    expect(closedCalled).toEqual(true)
  })

  it("it works as a job queue", async () => {
    const chan = new AsyncQueue<number>(() => void 0)

    const jobs = Promise.all([
      chan.enqueue(0),
      chan.enqueue(1),
      chan.enqueue(2),
      chan.enqueue(3),
      chan.enqueue(4)
    ])

    const takeAll = takeAsync(chan)
    await jobs

    chan.close()

    expect(await takeAll).toEqual([0, 1, 2, 3, 4])
  })

  it("it works as a job queue, iterator still works after close", async () => {
    const chan = new AsyncQueue<number>(() => void 0)

    const jobs = Promise.all([
      chan.enqueue(0),
      chan.enqueue(1),
      chan.enqueue(2),
      chan.enqueue(3),
      chan.enqueue(4)
    ])

    chan.close()

    const takeAll = takeAsync(chan)

    await jobs

    expect(await takeAll).toEqual([0, 1, 2, 3, 4])
  })

  it("throw in the iterator closes the channel", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)
    chan.enqueue(0)
    expect(chan.closed).toEqual(false)

    await expect(async () => {
      for await (const _ of chan) {
        throw new Error("safe")
      }
    }).rejects.toThrow("safe")

    expect(chan.closed).toEqual(true)
  })

  it("close the channel asynchronously before yielding first time works", async () => {
    const chan = new AsyncQueue<number>(() => void 0)

    expect(chan.closed).toEqual(false)

    const values: number[] = []

    // asynchronously close the channel
    setTimeout(() => chan.close(), 100)

    expect(chan.closed).toEqual(false)

    for await (const val of chan) {
      values.push(val)
    }

    expect(chan.closed).toEqual(true)
    expect(values).toEqual([])
  })

  it("close the channel without pending ops inside iterator breaks iterator", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    let values: number[] = []

    chan.enqueue(1)

    expect(chan.closed).toEqual(false)

    for await (const val of chan) {
      if (chan.closed) throw new Error("did continue with iterator")
      values.push(val)
      // this should behave exactly as "break"
      chan.close()
      expect(chan.closed).toEqual(true)
      await expect(async () => chan.enqueue(2)).rejects.toThrow("Channel is closed")
    }

    expect(chan.closed).toEqual(true)
    expect(values).toEqual([1])
  })

  it("rxjs consumer reads a value after start the stream", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    const result = lastValueFrom(from(chan))

    expect(chan.closed).toEqual(false)

    await chan.enqueue(1)
    chan.close()

    expect(chan.closed).toEqual(true)

    expect(await result).toEqual(1)
  })

  it("emit one, read one, then pause. read callback is triggered", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    const [pushed, next] = await Promise.all([
      chan.enqueue(1),
      chan.next()
    ])

    expect(chan.closed).toEqual(false)
    expect(await next.value).toEqual(1)

    chan.close()

    expect(chan.closed).toEqual(true)
  })

  it("emit one, read three, then close stream. pending pushes must fail", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    chan.enqueue(1)

    const pushes = Promise.all([
      chan.next(),
      chan.next(),
      chan.next(),
    ])

    expect(chan.closed).toEqual(false)
    await chan.return(null)
    expect(chan.closed).toEqual(true)

    expect((await pushes)).toEqual([{ value: 1 }, { done: true, value: undefined }, { done: true, value: undefined }])
  })


  it("emit one, read three, then throw stream. pending pushes must fail", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    chan.enqueue(1)

    const pushes = Promise.allSettled([
      chan.next(),
      chan.next(),
      chan.next(),
    ])

    expect(chan.closed).toEqual(false)
    await chan.throw(new Error('Synthetic error'))
    expect(chan.closed).toEqual(true)

    expect((await pushes).map($ => $.status)).toEqual(["fulfilled", "rejected", "rejected"])
  })

  it("read three, emit one, then close stream. pending pushes must fail", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    const pushes = Promise.all([
      chan.next(),
      chan.next(),
      chan.next(),
    ])

    chan.enqueue(1)

    expect(chan.closed).toEqual(false)
    await chan.return(null)
    expect(chan.closed).toEqual(true)

    expect((await pushes)).toEqual([{ value: 1 }, { done: true, value: undefined }, { done: true, value: undefined }])
  })


  it("read three, emit one, then close stream. pending pushes must fail", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    const pushes = Promise.allSettled([
      chan.next(),
      chan.next(),
      chan.next(),
    ])

    chan.enqueue(1)

    expect(chan.closed).toEqual(false)
    await chan.throw(new Error('Synthetic error'))
    expect(chan.closed).toEqual(true)

    expect((await pushes).map($ => $.status)).toEqual(["fulfilled", "rejected", "rejected"])
  })


  it("rxjs consumer reads all preexistent values", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    const promises = [chan.enqueue(1), chan.enqueue(2), chan.enqueue(3)]

    const result = lastValueFrom(from(chan))

    expect(chan.closed).toEqual(false)
    chan.close()
    expect(chan.closed).toEqual(true)

    await Promise.all(promises)

    expect(await result).toEqual(3)
  })

  it("async consumer reads all preexistent values", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    const promises = [chan.enqueue(1), chan.enqueue(2), chan.enqueue(3)]

    expect(await (await chan.next()).value).toEqual(1)
    expect(await (await chan.next()).value).toEqual(2)
    expect(await (await chan.next()).value).toEqual(3)

    await Promise.all(promises)

    expect(chan.closed).toEqual(false)
    chan.close()
    expect(chan.closed).toEqual(true)
  })

  it("async consumer reads zero values if the channel is closed", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    const result = lastValueFrom(from(chan))

    expect(chan.closed).toEqual(false)
    chan.close()
    expect(chan.closed).toEqual(true)

    await expect(() => result).rejects.toMatchObject({ message: 'no elements in sequence' })
  })

  it("close the channel with failAndClose should make the iterator fail", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    expect(chan.closed).toEqual(false)

    let values: number[] = []
    setImmediate(() => {
      chan.enqueue(1);
      chan.close(new Error("safe"))
    })

    await expect(async () => {
      for await (const val of chan) {
        values.push(val)
      }
    }).rejects.toThrow("safe")

    expect(chan.closed).toEqual(true)
    expect(values).toEqual([1])
  })

  it("generator yield basic case", async () => {
    const chan = new AsyncQueue<number>(() => void 0)
    let values: number[] = []

    async function* generator() {
      let counter = 0
      for await (const val of chan) {
        yield val
        if (++counter == 3) throw new Error("reached 3")
      }
    }

    setTimeout(async () => {
      await chan.enqueue(1)
      await chan.enqueue(2)
      await chan.enqueue(3)
    }, 10)

    expect(chan.closed).toEqual(false)

    await expect(async () => {
      for await (const val of generator()) {
        values.push(val)
      }
    }).rejects.toThrow("reached 3")

    expect(chan.closed).toEqual(true)
    expect(values).toEqual([1, 2, 3])
  })
})