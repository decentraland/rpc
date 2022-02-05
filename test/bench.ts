import * as helpers from "./helpers"
import { Book, GetBookRequest, QueryBooksRequest } from "./codegen/client_pb"
import { RpcClientPort, RpcServerPort } from "../src"
import {
  clientProcedureStream,
  clientProcedureUnary,
  serverProcedureStream,
  serverProcedureUnary,
} from "../src/codegen"

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
      GetBook: serverProcedureUnary(mod["GetBook"].bind(mod), "GetBook", GetBookRequest, Book),
      QueryBooks: serverProcedureStream(mod["QueryBooks"].bind(mod), "QueryBooks", QueryBooksRequest, Book),
    }
  })
}

export function loadBookService(port: RpcClientPort): BookService {
  const mod = port.loadModule("BookService")
  return {
    GetBook: clientProcedureUnary(mod, "GetBook", GetBookRequest, Book),
    QueryBooks: clientProcedureStream(mod, "QueryBooks", QueryBooksRequest, Book),
  }
}

async function test() {
  const testEnv = helpers.createSimpleTestEnvironment({
    async initializePort(port) {
      registerBookService(port, async () => ({
        async GetBook(req) {
          if (req.getIsbn() == FAIL_WITH_EXCEPTION_ISBN) throw new Error("ErrorMessage")

          const book = new Book()
          book.setAuthor("menduz")
          book.setIsbn(req.getIsbn())
          book.setTitle("Rpc onion layers")
          return book
        },
        async *QueryBooks(req) {
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

  await testEnv.start()

  const { rpcClient } = testEnv
  const clientPort = await rpcClient.createPort("test1")
  const service = loadBookService(clientPort)

  const req1 = new GetBookRequest()
  const req2 = new QueryBooksRequest()
  req1.setIsbn(1234)
  req2.setAuthorPrefix("mr")
  let iter = 0

  while (iter++ < 100000) {
    {
      const ret = await service.GetBook(req1)
      if (ret.getIsbn() != 1234) throw new Error("invalid number")
    }
    {
      const results = []

      for await (const book of service.QueryBooks(req2)) {
        results.push(book)
      }

      if (results.length != 4) throw new Error("invalid length")
    }
  }
}

test().catch((err) => {
  console.error(err)
  process.exit(1)
})
