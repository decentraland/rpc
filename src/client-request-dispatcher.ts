import { Writer, Reader } from "protobufjs/minimal"
import { MessageDispatcher } from "./message-dispatcher"
let globalMessageNumber = 0

export type ClientRequestDispatcher = {
  dispatcher: MessageDispatcher
  request(cb: (bb: Writer, messageNumber: number) => void): Promise<Reader>
  nextMessageNumber(): number
}

export function createClientRequestDispatcher(dispatcher: MessageDispatcher): ClientRequestDispatcher {
  // message_number -> future
  function nextMessageNumber(): number {
    const messageNumber = ++globalMessageNumber
    if (globalMessageNumber > 0x01000000) globalMessageNumber = 0
    return messageNumber
  }

  return {
    dispatcher,
    async request(cb: (binaryWriter: Writer, messageNumber: number) => void): Promise<Reader> {
      const messageNumber = nextMessageNumber()
      const binaryWriter = new Writer()
      cb(binaryWriter, messageNumber)
      // first add listener
      const promise = dispatcher.addOneTimeListener(messageNumber)
      // then send the signal
      dispatcher.transport.sendMessage(binaryWriter.finish())
      const { reader } = await promise
      return reader
    },
    nextMessageNumber,
  }
}
