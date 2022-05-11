import { RpcClientPort } from "../src"
import { clientProcedureStream, clientProcedureUnary } from "../src/codegen"
import { Book, GetBookRequest, QueryBooksRequest } from "./codegen/client"
import { createSimpleTestEnvironment, takeAsync } from "./helpers"

/// service BookService {
export type BookService = {
  ///   rpc GetBook(GetBookRequest) returns (Book) {}
  GetBook(arg: GetBookRequest): Promise<Book>
  ///   rpc QueryBooks(QueryBooksRequest) returns (stream Book) {}
  QueryBooks(arg: QueryBooksRequest): AsyncGenerator<Book>
}
/// }

const FAIL_WITH_EXCEPTION_ISBN = 1

export function loadBookService(port: RpcClientPort): BookService {
  const mod = port.loadModule("BookService")
  return {
    GetBook: clientProcedureUnary(mod, "GetBook", GetBookRequest, Book),
    QueryBooks: clientProcedureStream(mod, "QueryBooks", QueryBooksRequest, Book),
  }
}

describe("codegen client", () => {
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
      port.registerModule("BookService", async (port) => ({
        async GetBook(arg: Uint8Array) {
          const req = GetBookRequest.decode(arg)

          if (req.isbn == FAIL_WITH_EXCEPTION_ISBN) throw new Error("ErrorMessage")

          return Book.encode({
            author: "menduz",
            isbn: req.isbn,
            title: "Rpc onion layers",
          }).finish()
        },
        async *QueryBooks(arg: Uint8Array) {
          const req = QueryBooksRequest.decode(arg)

          if (req.authorPrefix == "fail_before_yield") throw new Error("fail_before_yield")

          const books = [
            { author: "mr menduz", isbn: 1234, title: "1001 reasons to write your own OS" },
            { author: "mr cazala", isbn: 1111, title: "Advanced CSS" },
            { author: "mr mannakia", isbn: 7666, title: "Advanced binary packing" },
            { author: "mr kuruk", isbn: 7668, title: "Advanced bots AI" },
          ]

          for (const book of books) {
            if (book.author.includes(req.authorPrefix)) {
              yield Book.encode(book).finish()
            }
          }

          if (req.authorPrefix == "fail_before_end") throw new Error("fail_before_end")
        },
      }))
    },
  })

  let service: BookService

  it("basic service wraper creation", async () => {
    const { rpcClient } = await testEnv.start()

    const clientPort = await rpcClient.createPort("test1")
    service = loadBookService(clientPort)
  })

  it("calls an unary method", async () => {
    const ret = await service.GetBook({ isbn: 1234 })
    expect(ret.isbn).toEqual(1234)
    expect(ret.author).toEqual("menduz")
  })

  it("calls a streaming method", async () => {
    const results: Book[] = []

    for await (const book of service.QueryBooks({ authorPrefix: "mr" })) {
      expect(book.author).toMatch(/^mr\s.+/)
      results.push(book)
    }

    expect(results).toHaveLength(4)
  })

  it("calls to unary fails throws error in client", async () => {
    await expect(service.GetBook({ isbn: FAIL_WITH_EXCEPTION_ISBN })).rejects.toThrowError("RemoteError: ErrorMessage")
  })

  it("calls to streaming fails throws error in client, fail_before_yield", async () => {
    await expect(service.QueryBooks({ authorPrefix: "fail_before_yield" }).next()).rejects.toThrowError(
      "RemoteError: fail_before_yield"
    )
  })

  it("calls to streaming fails throws error in client, fail_before_end", async () => {
    await expect(() => takeAsync(service.QueryBooks({ authorPrefix: "fail_before_end" }))).rejects.toThrowError(
      "RemoteError: fail_before_end"
    )
  })
})
