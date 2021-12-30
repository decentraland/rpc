export function pushableChannel<T>(onIteratorClose: () => void) {
  type LastResolver = () => void
  type ListItem = { value: T; resolve: LastResolver; prev?: ListItem }

  let returnLock: (() => void) | null = null
  const queue: ListItem[] = []
  let closed = false
  let error: Error | null = null
  let lastResolver: LastResolver | null = null

  function releaseLockIfNeeded() {
    // signal that we have a value
    if (returnLock) {
      const originalReturnLock = returnLock
      returnLock = null
      originalReturnLock()
    }
  }

  async function push(value: T) {
    if (closed) throw new Error("Channel is closed")
    if (error) {
      throw error
    }
    // push the value to the queue
    return new Promise<void>((resolve) => {
      queue.push({ value, resolve })
      releaseLockIfNeeded()
    })
  }

  // resolves the promise returned by push(T)
  function markConsumed() {
    if (lastResolver) {
      lastResolver()
      lastResolver = null
    }
  }

  function failAndClose(errorToThrow: Error) {
    error = errorToThrow
    close()
  }

  function yieldNextResult(): IteratorResult<T> | void {
    if (error && queue.length == 0) {
      throw error
    }
    if (closed && queue.length == 0) {
      return { done: true, value: undefined }
    }
    if (queue.length) {
      if (lastResolver) {
        throw new Error("logic error, this should never happen")
      }

      const { value, resolve } = queue.shift()!
      lastResolver = resolve
      return {
        done: false,
        value,
      }
    }
  }

  function close() {
    if (!closed) {
      markConsumed()
      closed = true
      releaseLockIfNeeded()
      onIteratorClose()
    }
  }

  const iterable: AsyncGenerator<T> = {
    async next() {
      while (true) {
        try {
          markConsumed()
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
      return { done: true, value: undefined }
    },
    async throw(e) {
      if (error) {
        throw error
      }
      close()
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
