import { Writer, Reader } from "protobufjs/minimal"

export type CallOptions = {}

export type MethodRequest<Definition extends MethodDefinition<any, any>> = Definition extends MethodDefinition<
  infer T,
  any,
  any,
  any
>
  ? T
  : never
export type MethodResponse<Definition extends MethodDefinition<any, any>> = Definition extends MethodDefinition<
  any,
  infer T,
  any,
  any
>
  ? T
  : never

export type TsProtoServiceDefinition = {
  name: string
  fullName: string
  methods: {
    [method: string]: TsProtoMethodDefinition<any, any>
  }
}

export type TsProtoMethodDefinition<Request, Response> = {
  name: string
  requestType: TsProtoMessageType<Request>
  requestStream: boolean
  responseType: TsProtoMessageType<Response>
  responseStream: boolean
  options: {
    idempotencyLevel?: "IDEMPOTENT" | "NO_SIDE_EFFECTS"
  }
}

export interface TsProtoMessageType<T> {
  encode(message: T, writer?: Writer): Writer
  decode(input: Reader | Uint8Array, length?: number): T
  fromJSON(object: any): T
}

export type ProtobufJsWriter = {
  finish(): Uint8Array
}

export type TsProtoMessageIn<Type extends TsProtoMessageType<any>> = Type["encode"] extends Function
  ? Parameters<Type["encode"]>[0]
  : Type extends TsProtoMessageType<infer Message>
  ? Message
  : never

export type FromTsProtoServiceDefinition<Service extends TsProtoServiceDefinition> = {
  [M in keyof Service["methods"]]: FromTsProtoMethodDefinition<Service["methods"][M]>
}

export type FromTsProtoMethodDefinition<Method> = Method extends TsProtoMethodDefinition<infer Request, infer Response>
  ? MethodDefinition<
      TsProtoMessageIn<Method["requestType"]>,
      TsProtoMessageIn<Method["responseType"]>,
      Method["requestStream"],
      Method["responseStream"]
    >
  : never

export type ServiceDefinition = {
  [method: string]: AnyMethodDefinition
}

export type MethodDefinition<
  Request,
  Response,
  RequestStream extends boolean = boolean,
  ResponseStream extends boolean = boolean
> = {
  path: string
  requestStream: RequestStream
  responseStream: ResponseStream
  requestSerialize(value: Request): Uint8Array
  requestDeserialize(bytes: Uint8Array): Request
  responseSerialize(value: Response): Uint8Array
  options: {
    idempotencyLevel?: "IDEMPOTENT" | "NO_SIDE_EFFECTS"
  }
}

export type AnyMethodDefinition = MethodDefinition<any, any>

export type Client<Service extends TsProtoServiceDefinition, CallOptionsExt = {}> = RawClient<
  FromTsProtoServiceDefinition<Service>,
  CallOptionsExt
>

export type RawClient<Service extends ServiceDefinition, CallOptionsExt = {}> = {
  [Method in keyof Service]: ClientMethod<Service[Method], CallOptionsExt>
}

export type ClientMethod<
  Definition extends MethodDefinition<any, any, any, any>,
  CallOptionsExt = {}
> = Definition["requestStream"] extends false
  ? Definition["responseStream"] extends false
    ? UnaryClientMethod<MethodRequest<Definition>, MethodResponse<Definition>, CallOptionsExt>
    : Definition["responseStream"] extends true
    ? ServerStreamingMethod<MethodRequest<Definition>, MethodResponse<Definition>, CallOptionsExt>
    : never
  : Definition["requestStream"] extends true
  ? Definition["responseStream"] extends false
    ? ClientStreamingMethod<MethodRequest<Definition>, MethodResponse<Definition>, CallOptionsExt>
    : Definition["responseStream"] extends true
    ? BidirectionalStreamingMethod<MethodRequest<Definition>, MethodResponse<Definition>, CallOptionsExt>
    : never
  : never

export type UnaryClientMethod<Request, Response, CallOptionsExt = {}> = (
  request: Request,
  options?: CallOptions & CallOptionsExt
) => Promise<Response>


export type ServerStreamingMethod<Request, Response, CallOptionsExt = {}> = (
  request: Request,
  options?: CallOptions & CallOptionsExt
) => AsyncGenerator<Response>

export type ClientStreamingMethod<Request, Response, CallOptionsExt = {}> = (
  request: AsyncIterable<Request>,
  options?: CallOptions & CallOptionsExt
) => Promise<Response>

export type BidirectionalStreamingMethod<Request, Response, CallOptionsExt = {}> = (
  request: AsyncIterable<Request>,
  options?: CallOptions & CallOptionsExt
) => AsyncGenerator<Response>

export type RawServiceImplementation<Service extends ServiceDefinition, CallContextExt> = {
  [Method in keyof Service]: MethodImplementation<Service[Method], CallContextExt>
}

export type MethodImplementation<
  Definition extends MethodDefinition<any, any, any, any>,
  CallContextExt
> = Definition["requestStream"] extends false
  ? Definition["responseStream"] extends false
    ? UnaryMethodImplementation<MethodRequest<Definition>, MethodResponse<Definition>, CallContextExt>
    : Definition["responseStream"] extends true
    ? ServerStreamingMethodImplementation<MethodRequest<Definition>, MethodResponse<Definition>, CallContextExt>
    : never
  : Definition["requestStream"] extends true
  ? Definition["responseStream"] extends false
    ? ClientStreamingMethodImplementation<MethodRequest<Definition>, MethodResponse<Definition>, CallContextExt>
    : Definition["responseStream"] extends true
    ? BidiStreamingMethodImplementation<MethodRequest<Definition>, MethodResponse<Definition>, CallContextExt>
    : never
  : never

export type UnaryMethodImplementation<Request, Response, CallContextExt> = (
  request: Request,
  context: CallContextExt
) => Promise<Response>

export type ServerStreamingMethodImplementation<Request, Response, CallContextExt> = (
  request: Request,
  context: CallContextExt
) => ServerStreamingMethodResult<Response>

export type ClientStreamingMethodImplementation<Request, Response, CallContextExt> = (
  request: AsyncIterable<Request>,
  context: CallContextExt
) => Promise<Response>

export type BidiStreamingMethodImplementation<Request, Response, CallContextExt> = (
  request: AsyncIterable<Request>,
  context: CallContextExt
) => ServerStreamingMethodResult<Response>

export type ServerStreamingMethodResult<Response> = {
  [Symbol.asyncIterator](): AsyncGenerator<Response, void>
}
