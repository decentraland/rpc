import { linkedList } from "../../src/push-channel"
import { test } from "./code"

const ITERATIONS = 50

const yieldThread = () => new Promise(setImmediate)

async function testLinkedList() {
  const ll = linkedList<any>()

  for (let i = 0; i < 10000; i++) {
    ll.enqueue(new Uint8Array(100).fill(0))
  }

  while (!ll.isEmpty()) {
    ll.dequeue()
  }
}

async function main() {
  const functions = await test()

  for (let i = 0; i < ITERATIONS; i++) {
    await testLinkedList()
    await yieldThread()
  }
  functions.printMemory()
  for (let i = 0; i < ITERATIONS; i++) {
    await testLinkedList()
    await yieldThread()
  }
  functions.printMemory()
  return
  for (let i = 0; i < ITERATIONS; i++) {
    await functions.benchGetBooks()
    await yieldThread()
  }
  functions.printMemory()
  for (let i = 0; i < ITERATIONS; i++) {
    await functions.benchBooks()
    await yieldThread()
  }
  functions.printMemory()
  for (let i = 0; i < ITERATIONS; i++) {
    await functions.benchBooksNoAck()
    await yieldThread()
  }
  functions.printMemory()
  for (let i = 0; i < ITERATIONS; i++) {
    await functions.benchBooks()
    await yieldThread()
  }
  functions.printMemory()
  for (let i = 0; i < ITERATIONS; i++) {
    await functions.benchBooksNoAck()
    await yieldThread()
  }
  functions.printMemory()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
