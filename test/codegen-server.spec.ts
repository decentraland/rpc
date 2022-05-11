import { RpcServerPort } from "../src"
import { Book, GetBookRequest, QueryBooksRequest } from "./codegen/client"
import { createSimpleTestEnvironment, takeAsync } from "./helpers"
import * as codegen from "../src/codegen"
import { loadBookService } from "./codegen-client.spec"

/// service BookService {
export type BookService = {
  ///   rpc GetBook(GetBookRequest) returns (Book) {}
  GetBook(arg: GetBookRequest): Promise<Book>
  ///   rpc QueryBooks(QueryBooksRequest) returns (stream Book) {}
  QueryBooks(arg: QueryBooksRequest): AsyncGenerator<Book>
}
/// }

const FAIL_WITH_EXCEPTION_ISBN = 1

export type BookServiceModuleInitializator = (port: RpcServerPort) => Promise<BookService>

export function registerBookService(port: RpcServerPort, moduleInitializator: BookServiceModuleInitializator): void {
  port.registerModule("BookService", async (port) => {
    const mod = await moduleInitializator(port)
    return {
      GetBook: codegen.serverProcedureUnary(mod["GetBook"].bind(mod), "GetBook", GetBookRequest, Book),
      QueryBooks: codegen.serverProcedureStream(mod["QueryBooks"].bind(mod), "QueryBooks", QueryBooksRequest, Book),
    }
  })
}

describe("codegen client & server", () => {
  const testEnv = createSimpleTestEnvironment({
    async initializePort(port) {
      registerBookService(port, async () => ({
        async GetBook(req: GetBookRequest) {
          if (req.isbn == FAIL_WITH_EXCEPTION_ISBN) throw new Error("ErrorMessage")

          return {
            author: "menduz",
            isbn: req.isbn,
            title: "Rpc onion layers",
          }
        },
        async *QueryBooks(req: QueryBooksRequest) {
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
