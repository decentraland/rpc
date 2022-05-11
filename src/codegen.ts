import { Writer, Reader } from "protobufjs/minimal"

export interface Message<T> {
  encode(message: T, writer?: Writer): Writer
  decode(input: Reader | Uint8Array, length?: number): T
  fromJSON(object: any): T
  toJSON(message: T): unknown
}

export function clientProcedureUnary<Ctor1, Ctor2>(
  port: unknown | Promise<unknown>,
  name: string,
  requestType: Message<Ctor1>,
  requestResponseConstructor: Message<Ctor2>
) {
  const fn = async (arg: Ctor1): Promise<Ctor2> => {
    const remoteModule: Record<typeof name, (arg: Uint8Array) => Promise<any>> = (await port) as any

    if (!(name in remoteModule)) throw new Error("Method " + name + " not implemented in server port")

    const result = await remoteModule[name](requestType.encode(arg).finish())
    if (!result) {
      throw new Error("Server sent an empty or null response to method call " + name)
    }
    return requestResponseConstructor.decode(result)
  }

  return fn
}

export function clientProcedureStream<Ctor1, Ctor2>(
  port: unknown | Promise<unknown>,
  name: string,
  requestType: Message<Ctor1>,
  requestResponseConstructor: Message<Ctor2>
) {
  const fn = async function* (arg: Ctor1): AsyncGenerator<Ctor2> {
    const remoteModule: Record<typeof name, (arg: Uint8Array) => Promise<any>> = (await port) as any

    if (!(name in remoteModule)) throw new Error("Method " + name + " not implemented in server port")

    const result = await remoteModule[name](requestType.encode(arg).finish())
    if (!result) {
      throw new Error("Server sent an empty or null response to method call " + name)
    }
    for await (const bytes of await result) {
      yield requestResponseConstructor.decode(bytes)
    }
  }

  return fn
}

export function serverProcedureUnary<Ctor1, Ctor2>(
  fn: (arg: Ctor1) => Promise<Ctor2>,
  name: string,
  ctor1: Message<Ctor1>,
  ctor2: Message<Ctor2>
): (arg: Uint8Array) => Promise<Uint8Array> {
  return async function (argBinary) {
    const arg = ctor1.decode(argBinary)
    const result = await fn(arg)

    if (!result) throw new Error("Empty or null responses are not allowed. Procedure: " + name)
    return ctor2.encode(result).finish()
  }
}

export function serverProcedureStream<Ctor1, Ctor2>(
  fn: (arg: Ctor1) => Promise<AsyncGenerator<Ctor2>> | AsyncGenerator<Ctor2>,
  name: string,
  ctor1: Message<Ctor1>,
  ctor2: Message<Ctor2>
): (arg: Uint8Array) => AsyncGenerator<Uint8Array> {
  return async function* (argBinary) {
    const arg = ctor1.decode(argBinary)
    const result = await fn(arg)

    if (!result) throw new Error("Empty or null responses are not allowed. Procedure: " + name)

    for await (const elem of result) {
      yield ctor2.encode(elem).finish()
    }
  }
}
