import {
  FromTsProtoServiceDefinition,
  RawClient,
  TsProtoMethodDefinition,
  TsProtoServiceDefinition,
  UnaryMethodImplementation,
  ServerStreamingClientMethod,
  UnaryClientMethod,
  RawServiceImplementation,
  MethodImplementation,
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

export function clientProcedureStream<Request, Response>(
  port: unknown | Promise<unknown>,
  method: TsProtoMethodDefinition<Request, Response>
): ServerStreamingClientMethod<Request, Response> {
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

    function generateResult(): AsyncGenerator<Response> {
      const ret: AsyncGenerator<Response> = {
        [Symbol.asyncIterator]: () => generateResult(),
        async next() {
          const iter = await (await getGenerator()).next()
          return { value: method.responseType.decode(iter.value ?? EMPTY_U8ARRAY), done: iter.done }
        },
        async return(value) {
          const iter = await (await getGenerator()).return(value)
          return { value: method.responseType.decode(iter.value ?? EMPTY_U8ARRAY), done: iter.done }
        },
        async throw(value) {
          const iter = await (await getGenerator()).throw(value)
          return { value: method.responseType.decode(iter.value ?? EMPTY_U8ARRAY), done: iter.done }
        }
      }

      return ret
    }

    return generateResult()
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

export function serverProcedureStream<Request, Response, Context>(
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

export type RpcClientModule<Service extends TsProtoServiceDefinition, CallContext = {}> = RawClient<
  FromTsProtoServiceDefinition<Service>,
  CallContext
>

export type RpcServerModule<Service extends TsProtoServiceDefinition, CallContext = {}> = RawServiceImplementation<
  FromTsProtoServiceDefinition<Service>,
  CallContext
>

export function loadService<CallContext = {}, Service extends TsProtoServiceDefinition = any>(
  port: RpcClientPort,
  service: Service
): RpcClientModule<Service, CallContext> {
  const portFuture = port.loadModule(service.name)
  const ret: RawClient<any, CallContext> = {} as any
  for (const [key, def] of Object.entries(service.methods)) {
    if (def.responseStream) {
      ret[key] = clientProcedureStream(portFuture, def)
    } else {
      ret[key] = clientProcedureUnary(portFuture, def)
    }
  }

  return ret
}

export function registerService<CallContext = {}, Service extends TsProtoServiceDefinition = any>(
  port: RpcServerPort<CallContext>,
  service: Service,
  moduleInitializator: (port: RpcServerPort<CallContext>) => Promise<RpcServerModule<Service, CallContext>>
) {
  port.registerModule(service.name, async (port) => {
    const mod = await moduleInitializator(port)

    const ret: Record<string, any> = {}

    for (const [key, def] of Object.entries(service.methods)) {
      if (def.responseStream) {
        ret[def.name] = serverProcedureStream(mod[key].bind(mod) as any, def)
      } else {
        ret[def.name] = serverProcedureUnary(mod[key].bind(mod) as any, def)
      }
    }

    return ret
  })
}
