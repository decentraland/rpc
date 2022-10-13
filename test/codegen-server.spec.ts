import { future } from "fp-future"
import {
  AlmostEmpty,
  Book,
  BookServiceDefinition,
  Empty,
  GetBookRequest,
  QueryBooksRequest,
  IntValue,
} from "./codegen/client"
import { createSimpleTestEnvironment, delay, takeAsync } from "./helpers"
import * as codegen from "../src/codegen"
import { from, lastValueFrom, take } from "rxjs"

const FAIL_WITH_EXCEPTION_ISBN = 1

describe("codegen client & server", () => {
  let infiniteGeneratorClosed = 0
  let infiniteGeneratorEmited = 0
  let closeFuture = future<void>()
  const testEnv = createSimpleTestEnvironment(async function (port) {
    codegen.registerService(port, BookServiceDefinition, async () => ({
      async getBook(req: GetBookRequest) {
        if (req.isbn == FAIL_WITH_EXCEPTION_ISBN) throw new Error("ErrorMessage")

        return {
          author: "menduz",
          isbn: req.isbn,
          title: "Rpc onion layers",
        }
      },
      async *queryBooks(req: QueryBooksRequest) {
        if (req.authorPrefix == "fail_before_yield") throw new Error("fail_before_yield")

        const books = [
          { author: "mr menduz", isbn: 1234, title: "1001 reasons to write your own OS" },
          { author: "mr cazala", isbn: 1111, title: "Advanced CSS" },
          { author: "mr mannakia", isbn: 7666, title: "Advanced binary packing" },
          { author: "mr kuruk", isbn: 7668, title: "Advanced bots AI" },
        ]

        for (const book of books) {
          if (book.author.includes(req.authorPrefix)) {
            yield book
          }
        }

        if (req.authorPrefix == "fail_before_end") throw new Error("fail_before_end")
      },
      async *queryBooksNoAck(req: QueryBooksRequest) {
        if (req.authorPrefix == "fail_before_yield") throw new Error("fail_before_yield")

        const books = [
          { author: "mr menduz", isbn: 1234, title: "1001 reasons to write your own OS" },
          { author: "mr cazala", isbn: 1111, title: "Advanced CSS" },
          { author: "mr mannakia", isbn: 7666, title: "Advanced binary packing" },
          { author: "mr kuruk", isbn: 7668, title: "Advanced bots AI" },
        ]

        for (const book of books) {
          if (book.author.includes(req.authorPrefix)) {
            yield book
          }
        }

        if (req.authorPrefix == "fail_before_end") throw new Error("fail_before_end")
      },
      async emptyQuery() {
        return { author: "", isbn: 0, title: "" }
      },
      async emptyResponse() {
        return {}
      },
      async *emptyResponseStream() {
        yield {}
        yield {}
        yield {}
      },
      async *almostEmptyResponseStream() {
        yield { int: 0 }
        yield { int: 1 }
        yield { int: 0 }
      },
      infiniteGenerator() {
        const ret: AsyncGenerator<AlmostEmpty> = {
          [Symbol.asyncIterator]: () => ret,
          async next() {
            // hang in 4th iteration
            if (infiniteGeneratorEmited == 4) await closeFuture
            infiniteGeneratorEmited++
            return { value: { int: infiniteGeneratorEmited } }
          },
          async return() {
            infiniteGeneratorClosed++
            return { done: true, value: null }
          },
          async throw() {
            throw new Error("throw should never be called in this scenario")
          },
        }

        return ret
      },
      failFirstGenerator() {
        const ret: AsyncGenerator<AlmostEmpty> = {
          [Symbol.asyncIterator]: () => ret,
          next() {
            throw new Error("Fails on first yield without returning a promise")
          },
          async return() {
            throw new Error("Fails on return")
          },
          async throw() {
            throw new Error("throw should never be called in this scenario")
          },
        }

        return ret
      },
      async addAllValues(req: AsyncIterable<IntValue>) {
        let sum = 0
        for await (const value of req) {
          sum += value.int
        }

        return { int: sum }
      },
      multipleBy2(req: AsyncIterable<IntValue>) {
        const generator = async function*() {
          for await (const value of req) {
            yield { int: value.int * 2 } as IntValue
          }
        }

        return generator()
      }
    }))
  })

  let service: codegen.RpcClientModule<BookServiceDefinition>

  beforeAll(async () => {
    const { rpcClient } = await testEnv.start({})

    const clientPort = await rpcClient.createPort("test1")
    service = codegen.loadService(clientPort, BookServiceDefinition)
  })

  beforeEach(async () => {
    process.stderr.write("Cleaning up...\n")

    closeFuture.resolve()
    closeFuture = future()
    await delay(100)

    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0
    process.stderr.write("\n")
  })

  it("calls an unary method", async () => {
    const ret = await service.getBook({ isbn: 1234 })
    expect(ret.isbn).toEqual(1234)
    expect(ret.author).toEqual("menduz")
  })

  it("calls a streaming method", async () => {
    const results: Book[] = []

    for await (const book of service.queryBooks({ authorPrefix: "mr" })) {
      expect(book.author).toMatch(/^mr\s.+/)
      results.push(book)
    }

    expect(results).toHaveLength(4)
  })

  it("calls a streaming method NoAck", async () => {
    const results: Book[] = []

    for await (const book of service.queryBooks({ authorPrefix: "mr" })) {
      expect(book.author).toMatch(/^mr\s.+/)
      results.push(book)
    }

    expect(results).toHaveLength(4)
  })

  it("AlmostEmpty stream response", async () => {
    const results: AlmostEmpty[] = []

    for await (const book of service.almostEmptyResponseStream({ author: "", isbn: 0, title: "" })) {
      results.push(book)
    }

    expect(results).toEqual([{ int: 0 }, { int: 1 }, { int: 0 }])
  })

  it("Empty stream response", async () => {
    const results: Empty[] = []

    for await (const book of service.emptyResponseStream({ author: "", isbn: 0, title: "" })) {
      results.push(book)
    }

    expect(results).toEqual([{}, {}, {}])
  })

  it("calls to unary fails throws error in client", async () => {
    await expect(service.getBook({ isbn: FAIL_WITH_EXCEPTION_ISBN })).rejects.toThrowError("RemoteError: ErrorMessage")
  })

  it("calls to empty query works", async () => {
    expect(await service.emptyQuery({})).toEqual({ author: "", isbn: 0, title: "" })
  })

  it("calls to empty response works", async () => {
    expect(await service.emptyResponse({ author: "", isbn: 0, title: "" })).toEqual({})
  })

  it("calls to streaming fails throws error in client, fail_before_yield", async () => {
    await expect(service.queryBooks({ authorPrefix: "fail_before_yield" }).next()).rejects.toThrowError(
      "RemoteError: fail_before_yield"
    )
  })

  it("calls to streaming fails throws error in client, fail_before_end", async () => {
    await expect(() => takeAsync(service.queryBooks({ authorPrefix: "fail_before_end" }))).rejects.toThrowError(
      "RemoteError: fail_before_end"
    )
  })

  it("infinite stream take vanilla 1", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0
    closeFuture = future()

    const gen = service.infiniteGenerator({})

    const values = [await (await gen.next()).value]

    await gen.return(null)
    // give it time to end and send async messages
    await delay(100)

    expect(values).toEqual([{ int: 1 }])

    expect(infiniteGeneratorEmited).toEqual(1)
    expect(infiniteGeneratorClosed).toEqual(1)
  })

  it("infinite stream take rxjs 2", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0
    closeFuture = future()

    const gen = from(service.infiniteGenerator({})).pipe(take(2))

    await lastValueFrom(gen)
    await delay(100)

    expect(infiniteGeneratorEmited).toEqual(2)
    expect(infiniteGeneratorClosed).toEqual(1)
  })

  it("infinite stream take rxjs 3", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0
    closeFuture = future()

    const gen = from(service.infiniteGenerator({})).pipe(take(3))
    const values: any[] = []

    const sub = gen.subscribe((value) => {
      values.push(value)
    })

    await delay(1000)
    sub.unsubscribe()
    await delay(100)

    expect(values).toEqual([{ int: 1 }, { int: 2 }, { int: 3 }])
    expect(infiniteGeneratorEmited).toEqual(3)
    expect(infiniteGeneratorClosed).toEqual(1)
  })

  it("infinite stream take rxjs 3 (using lastvalue)", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0
    closeFuture = future()

    const gen = from(service.infiniteGenerator({})).pipe(take(3))

    const lastValue = await lastValueFrom(gen)
    await delay(100)

    expect(lastValue).toEqual({ int: 3 })
    expect(infiniteGeneratorEmited).toEqual(3)
    expect(infiniteGeneratorClosed).toEqual(1)
  })

  it("infinite stream take rxjs 4", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0
    closeFuture = future()

    const gen = from(service.infiniteGenerator({})).pipe(take(4))
    const values: any[] = []

    const sub = gen.subscribe((value) => {
      values.push(value)
    })

    // allow the stream to be "fully" consumed
    await delay(1000)
    sub.unsubscribe()

    // wait for the close message to arrive to the server
    await delay(100)

    // resolve the "hanging promise"
    closeFuture.resolve()

    // give it time to end and send async messages
    await delay(100)

    expect(values).toEqual([{ int: 1 }, { int: 2 }, { int: 3 }, { int: 4 }])
    expect(infiniteGeneratorEmited).toEqual(4)
    expect(infiniteGeneratorClosed).toEqual(1)
  })

  it("take async iterator", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0
    closeFuture = future()

    const values: any[] = []

    for await (const value of service.infiniteGenerator({})) {
      values.push(value)
      if (values.length == 3) break
    }

    await delay(100)

    expect(values).toEqual([{ int: 1 }, { int: 2 }, { int: 3 }])
    expect(infiniteGeneratorEmited).toEqual(3)
    expect(infiniteGeneratorClosed).toEqual(1)
  })

  it("Add all numbers in the client stream", async () => {
    const numberGenerator = async function*() {
      yield IntValue.fromJSON({ int: 1 })
      yield IntValue.fromJSON({ int: 2 })
      yield IntValue.fromJSON({ int: 4 })
      yield IntValue.fromJSON({ int: 8 })
    }

    const result = await service.addAllValues(numberGenerator())

    expect(result).toEqual({ int: 15 })
  })

  it("Consume all values from clientStream", async () => {
    const numberGenerator = async function*() {
      yield IntValue.fromJSON({ int: 1 })
      yield IntValue.fromJSON({ int: 2 })
      yield IntValue.fromJSON({ int: 4 })
      yield IntValue.fromJSON({ int: 8 })
    }

    const results: AlmostEmpty[] = []

    for await (const res of service.multipleBy2(numberGenerator())) {
      results.push(res)
    }

    expect(results).toEqual([{ int: 2 }, { int: 4 }, { int: 8 }, { int: 16 }])
  })
})
