type Node<T> = { value: T; resolve?: LastResolver; prev?: Node<T>, next?: Node<T> }
type LastResolver = (err?: any) => void

export function linkedList<T>() {
  let head: Node<T> | undefined = undefined
  let tail: Node<T> | undefined = undefined

  function push(value: T, resolve?: LastResolver) {
    const node: Node<T> = {
      value,
      resolve,
    }
    node.prev = tail;
    if (tail) {
      tail.next = node;
    }
    if (!head) {
      head = node;
    }
    tail = node;
  }

  function remove(node: Node<T>): void {
    if (!node.next) {
      tail = node.prev;
    } else {
      const nextNode = node.next;
      nextNode.prev = node.prev;
    }
    if (!node.prev) {
      head = node.next;
    } else {
      const prevNode = node.prev;
      prevNode.next = node.next;
    }
  }

  // removes the head node and updates the head
  function unshift(): Node<T> | undefined {
    const ret = head
    if (ret) remove(ret)
    return ret
  }

  // signals if the list is empty
  function isEmpty(): boolean {
    return !head
  }

  return { push, unshift, isEmpty }
}


export function pushableChannel<T>(onIteratorClose: () => void) {
  let returnLock: (() => void) | null = null
  const queue = linkedList<T>()
  let closed = false
  let error: Error | null = null

  function closeAllPending() {
    if (!queue.isEmpty()) {
      const err = error || new Error("Channel was closed before deliverying the message")
      while (!queue.isEmpty()) {
        const { resolve } = queue.unshift()!
        if (resolve) resolve(err);
      }
    }
  }

  function releaseLockIfNeeded() {
    // signal that we have a value
    if (returnLock) {
      const originalReturnLock = returnLock
      returnLock = null
      originalReturnLock()
    }
  }

  function push(value: T, callback: (err?: any) => void) {
    if (closed) {
      callback(new Error("Channel is closed"))
      return
    }
    if (error) {
      callback(error)
      return
    }
    // push the value to the queue
    queue.push(value, callback)
    releaseLockIfNeeded()
  }

  function failAndClose(errorToThrow: Error) {
    error = errorToThrow
    close()
  }

  function yieldNextResult(): IteratorResult<T> | void {
    if (error && queue.isEmpty()) {
      throw error
    }
    if (closed && queue.isEmpty()) {
      return { done: true, value: undefined }
    }
    if (!queue.isEmpty()) {
      const node = queue.unshift()!
      if (node.resolve) node.resolve()
      return {
        done: false,
        value: node.value,
      }
    }
  }

  function close() {
    if (!closed) {
      closed = true
      releaseLockIfNeeded()
      onIteratorClose()
    }
  }

  const iterable: AsyncGenerator<T> = {
    async next() {
      while (true) {
        try {
          const result = yieldNextResult()
          if (result) {
            return result
          } else {
            await new Promise<void>((res) => (returnLock = res))
          }
        } catch (err: any) {
          error = err
          close()
          throw err
        }
      }
    },
    async return(value) {
      close()
      closeAllPending()
      return { done: true, value: undefined }
    },
    async throw(e) {
      if (error) {
        throw error
      }
      close()
      closeAllPending()
      return { done: true, value: undefined }
    },
    [Symbol.asyncIterator]() {
      return iterable
    },
  }

  function isClosed() {
    return closed
  }

  return { iterable, push, close, failAndClose, isClosed, [Symbol.asyncIterator]: () => iterable }
}
