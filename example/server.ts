import * as codegen from "../src/codegen"
import { RpcServerPort } from "../src/types"
import { BookServiceDefinition, GetBookRequest, QueryBooksRequest } from "./api"

// This file creates the server implementation of BookService defined in api.proto

const FAIL_WITH_EXCEPTION_ISBN = 1

// This function registers the BookService into the given RpcServerPort
export function registerBookServiceServerImplementation(port: RpcServerPort) {
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
  }))
}
