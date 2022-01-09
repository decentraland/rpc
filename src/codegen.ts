import { Message } from "google-protobuf"

export type WrappedModule<
  K extends keyof any,
  T extends ((arg: any) => Promise<any>) | ((arg: any) => AsyncGenerator<any>)
> = {
  [U in K]: T
}

export type Constructor<C> = { new (): C; deserializeBinary(data: Uint8Array): C }

export function wrapModule<M extends WrappedModule<any, any>>(port: Promise<unknown>) {
  const mutableModule: M = {} as any

  return {
    setMethodUnary<T extends keyof M, Ctor1 extends Message, Ctor2 extends Message>(
      name: T,
      requestType: Constructor<Ctor1>,
      requestResponseConstructor: Constructor<Ctor2>
    ) {
      if (name in mutableModule) throw new Error("Method " + name + " already declared")

      const fn: (arg: Ctor1) => Promise<Ctor2> = async (arg: any): Promise<any> => {
        const remoteModule: Record<T, (arg: Uint8Array) => Promise<any>> = (await port) as any

        if (!(arg instanceof requestType)) throw new Error("Argument passed to RPC Method " + name + " type mismatch.")
        if (!(name in remoteModule)) throw new Error("Method " + name + " not implemented in server port")

        const result = await remoteModule[name](arg.serializeBinary())
        if (!result) {
          throw new Error("Server sent an empty or null response to method call " + name)
        }
        return requestResponseConstructor.deserializeBinary(result)
      }

      mutableModule[name] = fn as any
    },
    setMethodStream<T extends keyof M, Ctor1 extends Message, Ctor2 extends Message>(
      name: T,
      requestType: Constructor<Ctor1>,
      requestResponseConstructor: Constructor<Ctor2>
    ) {
      if (name in mutableModule) throw new Error("Method " + name + " already declared")

      const fn: (arg: Ctor1) => AsyncGenerator<Ctor2> = async function* (arg: any) {
        const remoteModule: Record<keyof M, (arg: Uint8Array) => Promise<any>> = (await port) as any

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

      mutableModule[name] = fn as any
    },
    getModule(): M {
      return mutableModule
    },
  }
}
