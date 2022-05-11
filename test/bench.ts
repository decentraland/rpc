import { Suite } from "benchmark"
import * as helpers from "./helpers"
import { Book, GetBookRequest, QueryBooksRequest } from "./codegen/client"
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
          if (req.isbn == FAIL_WITH_EXCEPTION_ISBN) throw new Error("ErrorMessage")

          return {
            author: "menduz",
            isbn: req.isbn,
            title: "Rpc onion layers",
          }
        },
        async *QueryBooks(req) {
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

  const { rpcClient } = await testEnv.start()
  const clientPort = await rpcClient.createPort("test1")
  const service = loadBookService(clientPort)

  const suite = new Suite()

  suite
    .add("GetBook", {
      defer: true,
      async fn(deferred) {
        const ret = await service.GetBook({ isbn: 1234 })
        if (ret.isbn != 1234) deferred.reject(new Error("invalid number"))
        deferred.resolve()
      },
    })
    .add("QueryBooks", {
      defer: true,
      async fn(deferred) {
        const results = []

        for await (const book of service.QueryBooks({ authorPrefix: "mr" })) {
          results.push(book)
        }

        if (results.length != 4) throw new Error("invalid length")
        deferred.resolve()
      },
    })
    .on("cycle", function (event) {
      console.log(String(event.target))
    })
    .on("complete", function () {
      console.log("Fastest is " + this.filter("fastest").map("name"))
    })
    .run({ async: true })
}

test().catch((err) => {
  console.error(err)
  process.exit(1)
})
