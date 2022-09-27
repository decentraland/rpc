import * as codegen from "../src/codegen"
import { RpcServerPort } from "../src/types"
import expect from "expect"
import { Book, BookServiceDefinition, GetBookRequest, QueryBooksRequest } from "./api"
import { streamWithoutAck } from "../src"
import { ServerStreamingMethodImplementation } from "../src/codegen-types"

// This file creates the server implementation of BookService defined in api.proto

const FAIL_WITH_EXCEPTION_ISBN = 1

export type TestContext = { hardcodedDatabase: Book[] }

// This function registers the BookService into the given RpcServerPort
export function registerBookServiceServerImplementation(port: RpcServerPort<TestContext>) {
  codegen.registerService(port, BookServiceDefinition, async () => ({
    async getBook(req: GetBookRequest, context) {
      if (req.isbn == FAIL_WITH_EXCEPTION_ISBN) throw new Error("ErrorMessage")

      // assert context is OK
      expect(context.hardcodedDatabase).toHaveLength(4)

      return {
        author: "menduz",
        isbn: req.isbn,
        title: "Rpc onion layers",
      }
    },
    queryBooks(req: QueryBooksRequest, context) {

      const generator = async function* () {
        if (req.authorPrefix == "fail_before_yield") throw new Error("fail_before_yield")

        for (const book of context.hardcodedDatabase) {
          if (book.author.includes(req.authorPrefix)) {
            yield book
          }
        }
  
        if (req.authorPrefix == "fail_before_end") throw new Error("fail_before_end")
      }

      return streamWithoutAck(generator())
    },
    async getBookStream(req: AsyncGenerator<GetBookRequest>, context) {
      for await (const message of req) {
        console.log('Received client stream: ', message)
      }

      return {
        author: "kuruk",
        isbn: 2077,
        title: "Le protocol",
      }
    }
  }))
}
