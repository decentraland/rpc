import { RpcServerPort } from "../src"
import { AlmostEmpty, Book, BookServiceDefinition, Empty, GetBookRequest, QueryBooksRequest } from "./codegen/client"
import { createSimpleTestEnvironment, takeAsync } from "./helpers"
import * as codegen from "../src/codegen"

const FAIL_WITH_EXCEPTION_ISBN = 1

describe("codegen client & server", () => {
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
    }))
  })

  let service: codegen.RpcClientModule<BookServiceDefinition>

  it("basic service wraper creation", async () => {
    const { rpcClient } = await testEnv.start()

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
})
