import { Suite } from "benchmark"
import * as helpers from "./helpers"
import { BookServiceDefinition } from "./codegen/client"
import {
  loadService,
  registerService,
} from "../src/codegen"

const books = [
  { author: "mr menduz", isbn: 1234, title: "1001 reasons to write your own OS" },
  { author: "mr cazala", isbn: 1111, title: "Advanced CSS" },
  { author: "mr mannakia", isbn: 7666, title: "Advanced binary packing" },
  { author: "mr kuruk", isbn: 7668, title: "Advanced bots AI" },
]

async function test() {
  const testEnv = helpers.createSimpleTestEnvironment({
    async initializePort(port) {
      registerService(port, BookServiceDefinition, async () => ({
        async getBook(req) {
          return {
            author: "menduz",
            isbn: req.isbn,
            title: "Rpc onion layers",
          }
        },
        async *queryBooks(req) {
          for (let i = 0; i < 100; i++) {
            yield* books
          }
        },
        async *queryBooksNoAck(req) {
          for (let i = 0; i < 100; i++) {
            yield* books
          }
        },
      }))
    },
  })

  const { rpcClient } = await testEnv.start()
  const clientPort = await rpcClient.createPort("test1")
  const service = loadService(clientPort, BookServiceDefinition)

  const suite = new Suite()

  async function benchBooks(deferred) {
    const results = []

    for await (const book of service.queryBooks({ authorPrefix: "mr" })) {
      results.push(book)
    }

    if (results.length != 400) deferred.reject("Invalid number of results, got: " + results.length)
    else deferred.resolve()
  }

  async function benchBooksNoAck(deferred) {
    const results = []

    for await (const book of service.queryBooksNoAck({ authorPrefix: "mr" })) {
      results.push(book)
    }

    if (results.length != 400) deferred.reject("Invalid number of results, got: " + results.length)
    else deferred.resolve()
  }

  suite
    .add("GetBook", {
      defer: true,
      async fn(deferred) {
        for (let i = 0; i < 400; i++) {
          const ret = await service.getBook({ isbn: 1234 })
          if (ret.isbn != 1234) deferred.reject(new Error("invalid number"))
        }
        deferred.resolve()
      },
    })
    .add("QueryBooks", {
      defer: true,
      fn: benchBooks,
    })
    .add("QueryBooksNoAck", {
      defer: true,
      fn: benchBooksNoAck,
    })
    .add("QueryBooks 2", {
      defer: true,
      fn: benchBooks,
    })
    .add("QueryBooksNoAck 2", {
      defer: true,
      fn: benchBooksNoAck,
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
