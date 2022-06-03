import {test} from './code'

const ITERATIONS = 50

const yieldThread = () => new Promise(setImmediate)

async function main() {
  const functions = await test()
  functions.printMemory()
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
