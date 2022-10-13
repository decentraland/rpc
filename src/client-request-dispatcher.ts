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
    async request(cb: (bb: Writer, messageNumber: number) => void): Promise<Reader> {
      const messageNumber = nextMessageNumber()
      const bb = new Writer()
      cb(bb, messageNumber)
      dispatcher.transport.sendMessage(bb.finish())
      const { reader } = await dispatcher.addOneTimeListener(messageNumber)
      return reader
    },
    nextMessageNumber,
  }
}
