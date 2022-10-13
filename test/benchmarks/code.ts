import * as helpers from "../helpers"
import { BookServiceDefinition } from "../codegen/client"
import { loadService, registerService } from "../../src/codegen"

const ITER_MULTIPLIER = 400

const books = [
  { author: "mr menduz", isbn: 1234, title: "1001 reasons to write your own OS" },
  { author: "mr cazala", isbn: 1111, title: "Advanced CSS" },
  { author: "mr mannakia", isbn: 7666, title: "Advanced binary packing" },
  { author: "mr kuruk", isbn: 7668, title: "Advanced bots AI" },
]

export async function test() {
  const testEnv = helpers.createSimpleTestEnvironment<void>(async function (port) {
    registerService(port, BookServiceDefinition, async () => ({
      async getBook(req) {
        return {
          author: "menduz",
          isbn: req.isbn,
          title: "Rpc onion layers",
        }
      },
      async *queryBooks(req) {
        for (let i = 0; i < ITER_MULTIPLIER; i++) {
          yield* books
        }
      },
      async *queryBooksNoAck(req) {
        for (let i = 0; i < ITER_MULTIPLIER; i++) {
          yield* books
        }
      },
      async *almostEmptyResponseStream() { throw new Error('not implemented') },
      async emptyQuery() { throw new Error('not implemented') },
      async emptyResponse() { throw new Error('not implemented') },
      async *emptyResponseStream() { throw new Error('not implemented') },
      async *infiniteGenerator() { throw new Error('not implemented') },
      async *failFirstGenerator() { throw new Error('not implemented') },
      async addAllValues() { throw new Error('not implemented') },
      async *multipleBy2() { throw new Error('not implemented') },
    }))
  })

  const { rpcClient, rpcServer, transportClient, transportServer } = await testEnv.start()
  const clientPort = await rpcClient.createPort("test1")
  const service = loadService(clientPort, BookServiceDefinition)

  async function benchBooks() {
    const results = []

    for await (const book of service.queryBooks({ authorPrefix: "mr" })) {
      results.push(book)
    }

    if (results.length != ITER_MULTIPLIER * 4) throw new Error("Invalid number of results, got: " + results.length)
  }

  async function benchBooksNoAck() {
    const results = []

    for await (const book of service.queryBooksNoAck({ authorPrefix: "mr" })) {
      results.push(book)
    }

    if (results.length != ITER_MULTIPLIER * 4) throw new Error("Invalid number of results, got: " + results.length)
  }

  let memory: ReturnType<typeof process.memoryUsage> = process.memoryUsage()

  function printMemory() {
    const newMemory = process.memoryUsage()

    function toMb(num: number) {
      return (num / 1024 / 1024).toFixed(2) + "MB"
    }

    console.log(`
    heapTotal: ${toMb(newMemory.heapTotal - memory.heapTotal)}
     heapUsed: ${toMb(newMemory.heapUsed - memory.heapUsed)}
          rss: ${toMb(newMemory.rss - memory.rss)}
 arrayBuffers: ${toMb((newMemory as any).arrayBuffers - (memory as any).arrayBuffers)}
    `)

    memory = newMemory
  }

  return {
    benchBooks,
    benchBooksNoAck,
    async benchGetBooks() {
      for (let i = 0; i < ITER_MULTIPLIER; i++) {
        const ret = await service.getBook({ isbn: 1234 })
        if (ret.isbn != 1234) throw new Error("invalid number")
      }
    },
    printMemory,
    clientPort,
    transportClient,
    transportServer,
  }
}
