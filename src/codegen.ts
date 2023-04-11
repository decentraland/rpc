import {
  FromTsProtoServiceDefinition,
  RawClient,
  TsProtoMethodDefinition,
  TsProtoServiceDefinition,
  UnaryMethodImplementation,
  ServerStreamingMethod,
  UnaryClientMethod,
  RawServiceImplementation,
  MethodImplementation,
  ClientStreamingMethod,
  BidirectionalStreamingMethod,
} from "./codegen-types"
import { CallableProcedureClient, RpcClientPort, RpcServerPort } from "./types"

const EMPTY_U8ARRAY = new Uint8Array()

export function clientProcedureUnary<Request, Response>(
  port: unknown | Promise<unknown>,
  method: TsProtoMethodDefinition<Request, Response>
): UnaryClientMethod<Request, Response> {
  const fn = async (arg: Request): Promise<Response> => {
    const remoteModule: Record<typeof method.name, (arg: Uint8Array) => Promise<any>> = (await port) as any

    if (!(method.name in remoteModule)) throw new Error("Method " + method.name + " not implemented in server port")

    const result = await remoteModule[method.name](method.requestType.encode(arg).finish())

    return method.responseType.decode(result ?? EMPTY_U8ARRAY)
  }

  return fn
}

async function* requestToBinaryGenerator<Request, Response>(requests: AsyncIterable<Request>, method: TsProtoMethodDefinition<Request, Response>): AsyncIterable<Uint8Array> {
  for await (const request of requests) {
    const arg = method.requestType.encode(request)
    yield arg.finish()
  }
}

export function clientProcedureClientStream<Request, Response>(
  port: unknown | Promise<unknown>,
  method: TsProtoMethodDefinition<Request, Response>
): ClientStreamingMethod<Request, Response> {
  const fn = async (arg: AsyncIterable<Request>): Promise<Response> => {
    const remoteModule: Record<typeof method.name, (arg: AsyncIterable<Uint8Array>) => Promise<any>> = (await port) as any

    if (!(method.name in remoteModule)) throw new Error("Method " + method.name + " not implemented in server port")

    const result = await remoteModule[method.name](requestToBinaryGenerator(arg, method))

    return method.responseType.decode(result ?? EMPTY_U8ARRAY)
  }

  return fn
}

export function clientProcedureServerStream<Request, Response>(
  port: unknown | Promise<unknown>,
  method: TsProtoMethodDefinition<Request, Response>
): ServerStreamingMethod<Request, Response> {
  const fn = function (arg: Request): AsyncGenerator<Response> {
    let _generator: Promise<AsyncGenerator<Uint8Array>> | undefined = undefined

    async function lazyGenerator() {
      const remoteModule: Record<typeof method.name, (arg: Uint8Array) => Promise<any>> = (await port) as any
      if (!(method.name in remoteModule)) throw new Error("Method " + method.name + " not implemented in server port")
      return (await remoteModule[method.name](method.requestType.encode(arg).finish()))[Symbol.asyncIterator]()
    }

    function getGenerator() {
      if (!_generator) {
        _generator = lazyGenerator()
      }
      return _generator!
    }

    const ret: AsyncGenerator<Response> = {
      [Symbol.asyncIterator]: () => ret,
      async next() {
        const iter = await (await getGenerator()).next()
        return { value: method.responseType.decode(iter.value ?? EMPTY_U8ARRAY), done: iter.done }
      },
      async return(value) {
        const iter = await (await getGenerator()).return(value)
        return { value: iter.value ? method.responseType.decode(iter.value) : iter.value, done: iter.done }
      },
      async throw(value) {
        const iter = await (await getGenerator()).throw(value)
        return { value: iter.value ? method.responseType.decode(iter.value) : iter.value, done: iter.done }
      }
    }

    return ret
  }

  return fn
}

export function clientProcedureBidirectionalStream<Request, Response>(
  port: unknown | Promise<unknown>,
  method: TsProtoMethodDefinition<Request, Response>
): BidirectionalStreamingMethod<Request, Response> {
  const fn = function (arg: AsyncIterable<Request>): AsyncGenerator<Response> {
    let _generator: Promise<AsyncGenerator<Uint8Array>> | undefined = undefined

    async function lazyGenerator() {
      const remoteModule: Record<typeof method.name, (arg: AsyncIterable<Uint8Array>) => Promise<any>> = (await port) as any
      if (!(method.name in remoteModule)) throw new Error("Method " + method.name + " not implemented in server port")
      return (await remoteModule[method.name](requestToBinaryGenerator(arg, method)))[Symbol.asyncIterator]()
    }

    function getGenerator() {
      if (!_generator) {
        _generator = lazyGenerator()
      }
      return _generator!
    }

    const ret: AsyncGenerator<Response> = {
      [Symbol.asyncIterator]: () => ret,
      async next() {
        const iter = await (await getGenerator()).next()
        return { value: method.responseType.decode(iter.value ?? EMPTY_U8ARRAY), done: iter.done }
      },
      async return(value) {
        const iter = await (await getGenerator()).return(value)
        return { value: iter.value ? method.responseType.decode(iter.value) : iter.value, done: iter.done }
      },
      async throw(value) {
        const iter = await (await getGenerator()).throw(value)
        return { value: iter.value ? method.responseType.decode(iter.value) : iter.value, done: iter.done }
      }
    }

    return ret
  }

  return fn
}

export function serverProcedureUnary<Request, Response, Context>(
  fn: (arg: Request, context: Context) => Promise<Response>,
  method: TsProtoMethodDefinition<Request, Response>
): (arg: Uint8Array, context: Context) => Promise<Uint8Array> {
  return async function (argBinary, context) {
    const arg = method.requestType.decode(argBinary)
    const result = await fn(arg, context)

    if (!result) throw new Error("Empty or null responses are not allowed. Procedure: " + method.name)
    return method.responseType.encode(result).finish()
  }
}

async function* binaryToRequestGenerator<Request, Response>(argBinaryGenerator: AsyncIterable<Uint8Array>, method: TsProtoMethodDefinition<Request, Response>): AsyncIterable<Request> {
  for await (const argBinary of argBinaryGenerator) {
    const arg = method.requestType.decode(argBinary)
    yield arg
  }
}

export function serverProcedureClientStream<Request, Response, Context>(
  fn: (arg: AsyncIterable<Request>, context: Context) => Promise<Response>,
  method: TsProtoMethodDefinition<Request, Response>
): (arg: AsyncIterable<Uint8Array>, context: Context) => Promise<Uint8Array> {
  return async function (argBinaryGenerator, context) {

    const result = await fn(binaryToRequestGenerator(argBinaryGenerator, method), context)

    if (!result) throw new Error("Empty or null responses are not allowed. Procedure: " + method.name)
    return method.responseType.encode(result).finish()
  }
}

export function serverProcedureServerStream<Request, Response, Context>(
  fn: (arg: Request, context: Context) => Promise<AsyncGenerator<Response>> | AsyncGenerator<Response>,
  method: TsProtoMethodDefinition<Request, Response>
): (arg: Uint8Array, context: Context) => AsyncGenerator<Uint8Array> {
  return function (argBinary, context): AsyncGenerator<Uint8Array> {
    let _generator: Promise<AsyncGenerator<Response>> | undefined = undefined

    const arg = method.requestType.decode(argBinary)

    async function lazyGenerator() {
      const result = (await fn(arg, context))

      if (!result) throw new Error("Empty or null responses are not allowed. Procedure: " + method.name)

      return result[Symbol.asyncIterator]()
    }

    function getGenerator() {
      if (!_generator) {
        _generator = lazyGenerator()
      }
      return _generator!
    }

    const ret: AsyncGenerator<Uint8Array> = {
      [Symbol.asyncIterator]: () => ret,
      async next() {
        const iter = await (await getGenerator()).next()
        return { value: iter.value ? method.responseType.encode(iter.value).finish() : iter.value, done: iter.done }
      },
      async return(value) {
        const iter = await (await getGenerator()).return(value)
        return { value: iter.value ? method.responseType.encode(iter.value).finish() : iter.value, done: iter.done }
      },
      async throw(value) {
        const iter = await (await getGenerator()).throw(value)
        return { value: iter.value ? method.responseType.encode(iter.value).finish() : iter.value, done: iter.done }
      }
    }

    return ret
  }
}

export function serverProcedureBidirectionalStream<Request, Response, Context>(
  fn: (arg: AsyncIterable<Request>, context: Context) => Promise<AsyncGenerator<Response>> | AsyncGenerator<Response>,
  method: TsProtoMethodDefinition<Request, Response>
): (arg: AsyncIterable<Uint8Array>, context: Context) => AsyncGenerator<Uint8Array> {
  return function (argBinaryGenerator, context): AsyncGenerator<Uint8Array> {
    let _generator: Promise<AsyncGenerator<Response>> | undefined = undefined

    async function lazyGenerator() {
      const result = (await fn(binaryToRequestGenerator(argBinaryGenerator, method), context))

      if (!result) throw new Error("Empty or null responses are not allowed. Procedure: " + method.name)

      return result[Symbol.asyncIterator]()
    }

    function getGenerator() {
      if (!_generator) {
        _generator = lazyGenerator()
      }
      return _generator!
    }

    const ret: AsyncGenerator<Uint8Array> = {
      [Symbol.asyncIterator]: () => ret,
      async next() {
        const iter = await (await getGenerator()).next()
        return { value: iter.value ? method.responseType.encode(iter.value).finish() : iter.value, done: iter.done }
      },
      async return(value) {
        const iter = await (await getGenerator()).return(value)
        return { value: iter.value ? method.responseType.encode(iter.value).finish() : iter.value, done: iter.done }
      },
      async throw(value) {
        const iter = await (await getGenerator()).throw(value)
        return { value: iter.value ? method.responseType.encode(iter.value).finish() : iter.value, done: iter.done }
      }
    }

    return ret
  }
}

export type RpcClientModule<Service extends TsProtoServiceDefinition, CallContext = {}> = RawClient<
  FromTsProtoServiceDefinition<Service>,
  CallContext
>

export type RpcServerModule<Service extends TsProtoServiceDefinition, CallContext = {}> = RawServiceImplementation<
  FromTsProtoServiceDefinition<Service>,
  CallContext
>

export function loadService<CallContext extends {} = {}, Service extends TsProtoServiceDefinition = any>(
  port: RpcClientPort,
  service: Service
): RpcClientModule<Service, CallContext> {
  const portFuture = port.loadModule(service.name)
  const ret: RawClient<any, CallContext> = {} as any
  for (const [key, def] of Object.entries(service.methods)) {
    if (def.responseStream && def.requestStream) {
      ret[key] = clientProcedureBidirectionalStream(portFuture, def)
    } else if (def.responseStream) {
      ret[key] = clientProcedureServerStream(portFuture, def)
    } else if (def.requestStream) {
      ret[key] = clientProcedureClientStream(portFuture, def)
    } else {
      ret[key] = clientProcedureUnary(portFuture, def)
    }
  }

  return ret
}

export function registerService<CallContext = {}, Service extends TsProtoServiceDefinition = any>(
  port: RpcServerPort<CallContext>,
  service: Service,
  moduleInitializator: (port: RpcServerPort<CallContext>, context: CallContext) => Promise<RpcServerModule<Service, CallContext>>
) {
  port.registerModule(service.name, async (port, context) => {
    const mod = await moduleInitializator(port, context)

    const ret: Record<string, any> = {}

    for (const [key, def] of Object.entries(service.methods)) {
      if (def.responseStream && def.requestStream) {
        ret[def.name] = serverProcedureBidirectionalStream(mod[key].bind(mod) as any, def)
      } else if (def.responseStream) {
        ret[def.name] = serverProcedureServerStream(mod[key].bind(mod) as any, def)
      } else if (def.requestStream) {
        ret[def.name] = serverProcedureClientStream(mod[key].bind(mod) as any, def)
      } else {
        ret[def.name] = serverProcedureUnary(mod[key].bind(mod) as any, def)
      }
    }

    return ret
  })
}
