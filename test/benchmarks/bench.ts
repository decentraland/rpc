import { Suite } from "benchmark"
import { test } from "./code"

async function main() {

  const suite = new Suite()

  const functions = await test()

  suite
    .add("PREWARM GetBook", {
      defer: true,
      async fn(deferred) {
        await functions.benchGetBooks()

        deferred.resolve()
      },
    })
    .add("PREWARM QueryBooks", {
      defer: true,
      async fn(deferred) {
        await functions.benchBooks()
        deferred.resolve()
      },
    })
    .add("QPREWARM ueryBooksNoAck", {
      defer: true,
      async fn(deferred) {
        await functions.benchBooksNoAck()

        deferred.resolve()
      },
    })
    .add("QueryBooks", {
      defer: true,
      async fn(deferred) {
        await functions.benchBooks()
        deferred.resolve()
      },
    })
    .add("GetBook", {
      defer: true,
      async fn(deferred) {
        await functions.benchGetBooks()

        deferred.resolve()
      },
    })
    .add("QueryBooksNoAck", {
      defer: true,
      async fn(deferred) {
        await functions.benchBooksNoAck()

        deferred.resolve()
      },
    })
    .on("cycle", function (event) {
      console.log(String(event.target))

      console.log("Relative mean error: ±" + event.target.stats.rme.toFixed(2) + "%")
      if (event.target.stats.rme > 5 && !event.target.name.includes("PREWARM")) {
        console.log("❌  FAILED, should be less than 5%")
        process.exitCode = 1
      }

      functions.printMemory()
    })
    .on("complete", function (event) {
      functions.printMemory()
      functions.clientPort.close()
      functions.transportClient.close()
      functions.transportServer.close()
    })
    .run({ async: true })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
