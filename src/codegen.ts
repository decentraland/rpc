import { Message } from "google-protobuf"
import { RpcClientPort } from "."

export type Constructor<C> = { new (): C; deserializeBinary(data: Uint8Array): C }

export function clientProcedureUnary<Ctor1 extends Message, Ctor2 extends Message>(
  port: unknown | Promise<unknown>,
  name: string,
  requestType: Constructor<Ctor1>,
  requestResponseConstructor: Constructor<Ctor2>
) {
  const fn: (arg: Ctor1) => Promise<Ctor2> = async (arg: any): Promise<any> => {
    const remoteModule: Record<typeof name, (arg: Uint8Array) => Promise<any>> = (await port) as any

    if (!(arg instanceof requestType)) throw new Error("Argument passed to RPC Method " + name + " type mismatch.")
    if (!(name in remoteModule)) throw new Error("Method " + name + " not implemented in server port")

    const result = await remoteModule[name](arg.serializeBinary())
    if (!result) {
      throw new Error("Server sent an empty or null response to method call " + name)
    }
    return requestResponseConstructor.deserializeBinary(result)
  }

  return fn
}

export function clientProcedureStream<Ctor1 extends Message, Ctor2 extends Message>(
  port: unknown | Promise<unknown>,
  name: string,
  requestType: Constructor<Ctor1>,
  requestResponseConstructor: Constructor<Ctor2>
) {
  const fn: (arg: Ctor1) => AsyncGenerator<Ctor2> = async function* (arg: any) {
    const remoteModule: Record<typeof name, (arg: Uint8Array) => Promise<any>> = (await port) as any

    if (!(arg instanceof requestType)) throw new Error("Argument passed to RPC Method " + name + " type mismatch.")
    if (!(name in remoteModule)) throw new Error("Method " + name + " not implemented in server port")

    const result = await remoteModule[name](arg.serializeBinary())
    if (!result) {
      throw new Error("Server sent an empty or null response to method call " + name)
    }
    for await (const bytes of await result) {
      yield requestResponseConstructor.deserializeBinary(bytes)
    }
  }

  return fn
}

export function serverProcedureUnary<Ctor1 extends Message, Ctor2 extends Message>(
  fn: (arg: Ctor1) => Promise<Ctor2>,
  name: string,
  ctor1: Constructor<Ctor1>,
  ctor2: Constructor<Ctor2>
): (arg: Uint8Array) => Promise<Uint8Array> {
  return async function (argBinary) {
    const arg = ctor1.deserializeBinary(argBinary)
    const result = await fn(arg)

    if (!result) throw new Error("Empty or null responses are not allowed. Procedure: " + name)
    if (!(result instanceof ctor2))
      throw new Error("Result of procedure " + name + " did not match the expected constructor")

    return result.serializeBinary()
  }
}

export function serverProcedureStream<Ctor1 extends Message, Ctor2 extends Message>(
  fn: (arg: Ctor1) => Promise<AsyncGenerator<Ctor2>> | AsyncGenerator<Ctor2>,
  name: string,
  ctor1: Constructor<Ctor1>,
  ctor2: Constructor<Ctor2>
): (arg: Uint8Array) => AsyncGenerator<Uint8Array> {
  return async function* (argBinary) {
    const arg = ctor1.deserializeBinary(argBinary)
    const result = await fn(arg)

    if (!result) throw new Error("Empty or null responses are not allowed. Procedure: " + name)

    for await (const elem of result) {
      if (!(elem instanceof ctor2))
        throw new Error("Yielded result of procedure " + name + " did not match the expected constructor")

      yield elem.serializeBinary()
    }
  }
}
