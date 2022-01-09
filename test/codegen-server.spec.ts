import { RpcServerPort } from "../src"
import { Book, GetBookRequest, QueryBooksRequest } from "./codegen/client_pb"
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
          if (req.getIsbn() == FAIL_WITH_EXCEPTION_ISBN) throw new Error("ErrorMessage")

          const book = new Book()
          book.setAuthor("menduz")
          book.setIsbn(req.getIsbn())
          book.setTitle("Rpc onion layers")
          return book
        },
        async *QueryBooks(req: QueryBooksRequest) {
          if (req.getAuthorPrefix() == "fail_before_yield") throw new Error("fail_before_yield")

          const books = [
            { author: "mr menduz", isbn: 1234, title: "1001 reasons to write your own OS" },
            { author: "mr cazala", isbn: 1111, title: "Advanced CSS" },
            { author: "mr mannakia", isbn: 7666, title: "Advanced binary packing" },
            { author: "mr kuruk", isbn: 7668, title: "Advanced bots AI" },
          ]

          for (const book of books) {
            if (book.author.includes(req.getAuthorPrefix())) {
              const protoBook = new Book()
              protoBook.setAuthor(book.author)
              protoBook.setIsbn(book.isbn)
              protoBook.setTitle(book.title)
              yield protoBook
            }
          }

          if (req.getAuthorPrefix() == "fail_before_end") throw new Error("fail_before_end")
        },
      }))
    },
  })

  let service: BookService

  it("basic service wraper creation", async () => {
    const { rpcClient } = testEnv

    const clientPort = await rpcClient.createPort("test1")
    service = loadBookService(clientPort)
  })

  it("calls an unary method", async () => {
    const req = new GetBookRequest()
    req.setIsbn(1234)
    const ret = await service.GetBook(req)
    expect(ret).toBeInstanceOf(Book)
    expect(ret.getIsbn()).toEqual(1234)
    expect(ret.getAuthor()).toEqual("menduz")
  })

  it("calls a streaming method", async () => {
    const req = new QueryBooksRequest()
    req.setAuthorPrefix("mr")

    const results: Book[] = []

    for await (const book of service.QueryBooks(req)) {
      expect(book).toBeInstanceOf(Book)
      expect(book.getAuthor()).toMatch(/^mr\s.+/)
      results.push(book)
    }

    expect(results).toHaveLength(4)
  })

  it("calls to unary fails throws error in client", async () => {
    const req = new GetBookRequest()
    req.setIsbn(FAIL_WITH_EXCEPTION_ISBN)
    await expect(service.GetBook(req)).rejects.toThrowError("RemoteError: ErrorMessage")
  })

  it("calls to streaming fails throws error in client, fail_before_yield", async () => {
    const req = new QueryBooksRequest()
    req.setAuthorPrefix("fail_before_yield")
    await expect(service.QueryBooks(req).next()).rejects.toThrowError("RemoteError: fail_before_yield")
  })

  it("calls to streaming fails throws error in client, fail_before_end", async () => {
    const req = new QueryBooksRequest()
    req.setAuthorPrefix("fail_before_end")
    await expect(() => takeAsync(service.QueryBooks(req))).rejects.toThrowError("RemoteError: fail_before_end")
  })
})
