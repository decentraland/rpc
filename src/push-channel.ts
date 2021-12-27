export function pushableChannel<T>() {
  let returnLock: (() => void) | null = null
  const queue: T[] = []
  let closed = false
  let error: Error | null = null

  function returnLockIfNeeded() {
    // signal that we have a value
    if (returnLock) {
      const originalReturnLock = returnLock
      returnLock = null
      originalReturnLock()
    }
  }

  function push(value: T) {
    // push the value to the queue
    queue.push(value)
    returnLockIfNeeded()
  }

  function close() {
    closed = true
    returnLockIfNeeded()
  }

  function fail(errorToThrow: Error) {
    error = errorToThrow
    returnLockIfNeeded()
  }

  async function* iter(): AsyncGenerator<T> {
    while (true) {
      if (error) throw error
      if (closed) break
      if (queue.length) {
        yield queue.shift()!
      } else {
        await new Promise<void>((res) => (returnLock = res))
      }
    }
  }

  const iterable = iter()

  return { iterable, push, close, fail }
}
