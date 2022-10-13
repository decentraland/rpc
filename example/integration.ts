// This file describes an end to end flow of creating a transport pair, server and clients

// 1st step: compile the api.proto -> api.ts (./build.sh)
// (done manually)

// 2nd step: create a server. the server will be listening to new transport
//           connections. That is analogous to socket connections
import { createRpcClient, createRpcServer } from "../src/index"
import { registerBookServiceServerImplementation, TestContext } from "./server"

function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// this emulates a server context with components
const context: TestContext = {
  hardcodedDatabase: [
    { author: "mr menduz", isbn: 1234, title: "1001 reasons to write your own OS" },
    { author: "mr cazala", isbn: 1111, title: "Advanced CSS" },
    { author: "mr mannakia", isbn: 7666, title: "Advanced binary packing" },
    { author: "mr kuruk", isbn: 7668, title: "Advanced bots AI" },
  ],
}

console.log("> Creating server")
const rpcServer = createRpcServer<TestContext>({})
// the handler function will be called every time a port is created.
// it should register the available APIs/Modules for the specified port
rpcServer.setHandler(async function handler(port) {
  console.log("  Creating server port: " + port.portName)
  // 2nd.1 step: we register the API for the new port
  registerBookServiceServerImplementation(port)
})

// 3rd step: create a transport pair. In this case we will use a in-memory transport
//           which creates two mutually connected virtual sockets
import { MemoryTransport } from "../src/transports/Memory"
console.log("> Creating client and server MemoryTransport")
const { client: clientSocket, server: serverSocket } = MemoryTransport()

// 4th step: create a client connection
console.log("> Creating client")
const clientPromise = createRpcClient(clientSocket)

// 5th step: connect the "socket" to the server
console.log("> Attaching transport")
rpcServer.attachTransport(serverSocket, context)

import { createBookServiceClient } from "./client"
import expect from "expect"
import { Book, GetBookRequest } from "./api"

async function* bookRequestGenerator() {
  for (const book of context.hardcodedDatabase) {
    const request: GetBookRequest = { isbn: book.isbn }
    yield request
  }
}

async function handleClientCreation() {
  // 6th step: once connected to the server, ask the server to create a port
  const client = await clientPromise
  console.log("  Client created!")
  console.log("> Creating client port")
  const clientPort = await client.createPort("my-port")
  // 7th step: with the port, ask te server to create a BookService instance for us
  //           now the step 2.1 will be called
  console.log("> Requesting BookService client")
  const clientBookService = createBookServiceClient(clientPort)

  // 8th step: profit
  console.log("> Invoking BookService.getBook(isbn:19997)")
  const response = await clientBookService.getBook({ isbn: 19997 })
  console.log("  Response: ", response)
  expect(response).toEqual({
    author: "menduz",
    isbn: 19997,
    title: "Rpc onion layers",
  })

  console.log("> Server stream")
  const list: Book[] = []
  for await (const book of clientBookService.queryBooks({ authorPrefix: "mr" })) {
    list.push(book)
    console.log(book)
  }
  expect(list).toEqual(context.hardcodedDatabase)

  console.log("> Client stream")
  const streamResponse = await clientBookService.getBookStream(bookRequestGenerator())
  console.log("  Response: ", streamResponse)
  expect(streamResponse).toEqual({
    author: "kuruk",
    isbn: 2077,
    title: "Le protocol",
  })

  console.log("> Bidirectional stream:")
  for await (const book of clientBookService.queryBooksStream(bookRequestGenerator())) {
    console.log(book)
  }
}

handleClientCreation().catch((err) => {
  process.exitCode = 1
  console.error(err)
})
