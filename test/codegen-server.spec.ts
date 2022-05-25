import { RpcServerPort } from "../src"
import { AlmostEmpty, Book, BookServiceDefinition, Empty, GetBookRequest, QueryBooksRequest } from "./codegen/client"
import { createSimpleTestEnvironment, delay, takeAsync } from "./helpers"
import * as codegen from "../src/codegen"
import { from, lastValueFrom, take } from "rxjs"

const FAIL_WITH_EXCEPTION_ISBN = 1

describe("codegen client & server", () => {
  let infiniteGeneratorClosed = 0
  let infiniteGeneratorEmited = 0
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
      async *infiniteGenerator() {
        try {
          while (true) {
            infiniteGeneratorEmited++
            if (infiniteGeneratorEmited == 15) await Promise.race([])
            yield { int: infiniteGeneratorEmited }
          }
        } finally {
          infiniteGeneratorClosed++
        }
      },
    }))
  })

  let service: codegen.RpcClientModule<BookServiceDefinition>

  beforeAll(async () => {
    const { rpcClient } = await testEnv.start(null, {
      decouplingFunction: (cb) => {
        setTimeout(cb, Math.random() * 10)
      },
    })

    const clientPort = await rpcClient.createPort("test1")
    service = codegen.loadService(clientPort, BookServiceDefinition)
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

  it("infinite stream take rxjs 10", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0

    const gen = from(service.infiniteGenerator({})).pipe(take(10))

    await lastValueFrom(gen)
    await delay(100)

    expect(infiniteGeneratorEmited).toEqual(10)
    expect(infiniteGeneratorClosed).toEqual(1)
  })

  it("infinite stream take rxjs 15", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0

    const gen = from(service.infiniteGenerator({})).pipe(take(15))
    const values: any[] = []

    const sub = gen.subscribe((value) => {
      values.push(value)
    })

    await delay(1000)
    sub.unsubscribe()
    await delay(100)

    expect(values).toEqual([
      { int: 1 },
      { int: 2 },
      { int: 3 },
      { int: 4 },
      { int: 5 },
      { int: 6 },
      { int: 7 },
      { int: 8 },
      { int: 9 },
      { int: 10 },
      { int: 11 },
      { int: 12 },
      { int: 13 },
      { int: 14 },
    ])
    expect(infiniteGeneratorEmited).toEqual(15)
    expect(infiniteGeneratorClosed).toEqual(1)
  })

  it("infinite stream take rxjs 0", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0

    const gen = from(service.infiniteGenerator({})).pipe(take(0))
    const values: any[] = []

    const sub = gen.subscribe((value) => {
      values.push(value)
    })

    await delay(1000)
    sub.unsubscribe()
    await delay(100)

    expect(values).toEqual([])

    expect(infiniteGeneratorEmited).toEqual(0)
    expect(infiniteGeneratorClosed).toEqual(1)
  })

  it("take async iterator", async () => {
    infiniteGeneratorClosed = 0
    infiniteGeneratorEmited = 0

    const values: any[] = []

    const stream = service.infiniteGenerator({})

    for await (const value of stream) {
      values.push(value)
      if (values.length == 10) break
    }

    await delay(100)

    expect(infiniteGeneratorEmited).toEqual(10)
    expect(infiniteGeneratorClosed).toEqual(1)
    expect(values).toEqual([
      { int: 1 },
      { int: 2 },
      { int: 3 },
      { int: 4 },
      { int: 5 },
      { int: 6 },
      { int: 7 },
      { int: 8 },
      { int: 9 },
      { int: 10 },
    ])
  })
})
