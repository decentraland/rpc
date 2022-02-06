import * as $protobuf from "protobufjs";
/** Properties of a RpcMessageHeader. */
export interface IRpcMessageHeader {

    /** RpcMessageHeader messageIdentifier */
    messageIdentifier?: (number|null);
}

/** Represents a RpcMessageHeader. */
export class RpcMessageHeader implements IRpcMessageHeader {

    /**
     * Constructs a new RpcMessageHeader.
     * @param [properties] Properties to set
     */
    constructor(properties?: IRpcMessageHeader);

    /** RpcMessageHeader messageIdentifier. */
    public messageIdentifier: number;

    /**
     * Creates a new RpcMessageHeader instance using the specified properties.
     * @param [properties] Properties to set
     * @returns RpcMessageHeader instance
     */
    public static create(properties?: IRpcMessageHeader): RpcMessageHeader;

    /**
     * Encodes the specified RpcMessageHeader message. Does not implicitly {@link RpcMessageHeader.verify|verify} messages.
     * @param message RpcMessageHeader message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IRpcMessageHeader, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified RpcMessageHeader message, length delimited. Does not implicitly {@link RpcMessageHeader.verify|verify} messages.
     * @param message RpcMessageHeader message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IRpcMessageHeader, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a RpcMessageHeader message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns RpcMessageHeader
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): RpcMessageHeader;

    /**
     * Decodes a RpcMessageHeader message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns RpcMessageHeader
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): RpcMessageHeader;

    /**
     * Verifies a RpcMessageHeader message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a RpcMessageHeader message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns RpcMessageHeader
     */
    public static fromObject(object: { [k: string]: any }): RpcMessageHeader;

    /**
     * Creates a plain object from a RpcMessageHeader message. Also converts values to other types if specified.
     * @param message RpcMessageHeader
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: RpcMessageHeader, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this RpcMessageHeader to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** RpcMessageTypes enum. */
export enum RpcMessageTypes {
    RpcMessageTypes_EMPTY = 0,
    RpcMessageTypes_REQUEST = 1,
    RpcMessageTypes_RESPONSE = 2,
    RpcMessageTypes_STREAM_MESSAGE = 3,
    RpcMessageTypes_STREAM_ACK = 4,
    RpcMessageTypes_CREATE_PORT = 5,
    RpcMessageTypes_CREATE_PORT_RESPONSE = 6,
    RpcMessageTypes_REQUEST_MODULE = 7,
    RpcMessageTypes_REQUEST_MODULE_RESPONSE = 8,
    RpcMessageTypes_REMOTE_ERROR_RESPONSE = 9,
    RpcMessageTypes_DESTROY_PORT = 10,
    RpcMessageTypes_SERVER_READY = 11
}

/** Represents a CreatePort. */
export class CreatePort implements ICreatePort {

    /**
     * Constructs a new CreatePort.
     * @param [properties] Properties to set
     */
    constructor(properties?: ICreatePort);

    /** CreatePort messageIdentifier. */
    public messageIdentifier: number;

    /** CreatePort portName. */
    public portName: string;

    /**
     * Creates a new CreatePort instance using the specified properties.
     * @param [properties] Properties to set
     * @returns CreatePort instance
     */
    public static create(properties?: ICreatePort): CreatePort;

    /**
     * Encodes the specified CreatePort message. Does not implicitly {@link CreatePort.verify|verify} messages.
     * @param message CreatePort message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ICreatePort, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified CreatePort message, length delimited. Does not implicitly {@link CreatePort.verify|verify} messages.
     * @param message CreatePort message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ICreatePort, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a CreatePort message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns CreatePort
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): CreatePort;

    /**
     * Decodes a CreatePort message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns CreatePort
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): CreatePort;

    /**
     * Verifies a CreatePort message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a CreatePort message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns CreatePort
     */
    public static fromObject(object: { [k: string]: any }): CreatePort;

    /**
     * Creates a plain object from a CreatePort message. Also converts values to other types if specified.
     * @param message CreatePort
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: CreatePort, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this CreatePort to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Represents a CreatePortResponse. */
export class CreatePortResponse implements ICreatePortResponse {

    /**
     * Constructs a new CreatePortResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: ICreatePortResponse);

    /** CreatePortResponse messageIdentifier. */
    public messageIdentifier: number;

    /** CreatePortResponse portId. */
    public portId: number;

    /**
     * Creates a new CreatePortResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns CreatePortResponse instance
     */
    public static create(properties?: ICreatePortResponse): CreatePortResponse;

    /**
     * Encodes the specified CreatePortResponse message. Does not implicitly {@link CreatePortResponse.verify|verify} messages.
     * @param message CreatePortResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ICreatePortResponse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified CreatePortResponse message, length delimited. Does not implicitly {@link CreatePortResponse.verify|verify} messages.
     * @param message CreatePortResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ICreatePortResponse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a CreatePortResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns CreatePortResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): CreatePortResponse;

    /**
     * Decodes a CreatePortResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns CreatePortResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): CreatePortResponse;

    /**
     * Verifies a CreatePortResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a CreatePortResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns CreatePortResponse
     */
    public static fromObject(object: { [k: string]: any }): CreatePortResponse;

    /**
     * Creates a plain object from a CreatePortResponse message. Also converts values to other types if specified.
     * @param message CreatePortResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: CreatePortResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this CreatePortResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Represents a RequestModule. */
export class RequestModule implements IRequestModule {

    /**
     * Constructs a new RequestModule.
     * @param [properties] Properties to set
     */
    constructor(properties?: IRequestModule);

    /** RequestModule messageIdentifier. */
    public messageIdentifier: number;

    /** RequestModule portId. */
    public portId: number;

    /** RequestModule moduleName. */
    public moduleName: string;

    /**
     * Creates a new RequestModule instance using the specified properties.
     * @param [properties] Properties to set
     * @returns RequestModule instance
     */
    public static create(properties?: IRequestModule): RequestModule;

    /**
     * Encodes the specified RequestModule message. Does not implicitly {@link RequestModule.verify|verify} messages.
     * @param message RequestModule message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IRequestModule, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified RequestModule message, length delimited. Does not implicitly {@link RequestModule.verify|verify} messages.
     * @param message RequestModule message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IRequestModule, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a RequestModule message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns RequestModule
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): RequestModule;

    /**
     * Decodes a RequestModule message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns RequestModule
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): RequestModule;

    /**
     * Verifies a RequestModule message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a RequestModule message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns RequestModule
     */
    public static fromObject(object: { [k: string]: any }): RequestModule;

    /**
     * Creates a plain object from a RequestModule message. Also converts values to other types if specified.
     * @param message RequestModule
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: RequestModule, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this RequestModule to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Represents a RequestModuleResponse. */
export class RequestModuleResponse implements IRequestModuleResponse {

    /**
     * Constructs a new RequestModuleResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: IRequestModuleResponse);

    /** RequestModuleResponse messageIdentifier. */
    public messageIdentifier: number;

    /** RequestModuleResponse portId. */
    public portId: number;

    /** RequestModuleResponse procedures. */
    public procedures: IModuleProcedure[];

    /**
     * Creates a new RequestModuleResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns RequestModuleResponse instance
     */
    public static create(properties?: IRequestModuleResponse): RequestModuleResponse;

    /**
     * Encodes the specified RequestModuleResponse message. Does not implicitly {@link RequestModuleResponse.verify|verify} messages.
     * @param message RequestModuleResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IRequestModuleResponse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified RequestModuleResponse message, length delimited. Does not implicitly {@link RequestModuleResponse.verify|verify} messages.
     * @param message RequestModuleResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IRequestModuleResponse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a RequestModuleResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns RequestModuleResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): RequestModuleResponse;

    /**
     * Decodes a RequestModuleResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns RequestModuleResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): RequestModuleResponse;

    /**
     * Verifies a RequestModuleResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a RequestModuleResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns RequestModuleResponse
     */
    public static fromObject(object: { [k: string]: any }): RequestModuleResponse;

    /**
     * Creates a plain object from a RequestModuleResponse message. Also converts values to other types if specified.
     * @param message RequestModuleResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: RequestModuleResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this RequestModuleResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Represents a DestroyPort. */
export class DestroyPort implements IDestroyPort {

    /**
     * Constructs a new DestroyPort.
     * @param [properties] Properties to set
     */
    constructor(properties?: IDestroyPort);

    /** DestroyPort messageIdentifier. */
    public messageIdentifier: number;

    /** DestroyPort portId. */
    public portId: number;

    /**
     * Creates a new DestroyPort instance using the specified properties.
     * @param [properties] Properties to set
     * @returns DestroyPort instance
     */
    public static create(properties?: IDestroyPort): DestroyPort;

    /**
     * Encodes the specified DestroyPort message. Does not implicitly {@link DestroyPort.verify|verify} messages.
     * @param message DestroyPort message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IDestroyPort, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified DestroyPort message, length delimited. Does not implicitly {@link DestroyPort.verify|verify} messages.
     * @param message DestroyPort message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IDestroyPort, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a DestroyPort message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns DestroyPort
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): DestroyPort;

    /**
     * Decodes a DestroyPort message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns DestroyPort
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): DestroyPort;

    /**
     * Verifies a DestroyPort message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a DestroyPort message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns DestroyPort
     */
    public static fromObject(object: { [k: string]: any }): DestroyPort;

    /**
     * Creates a plain object from a DestroyPort message. Also converts values to other types if specified.
     * @param message DestroyPort
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: DestroyPort, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this DestroyPort to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Represents a ModuleProcedure. */
export class ModuleProcedure implements IModuleProcedure {

    /**
     * Constructs a new ModuleProcedure.
     * @param [properties] Properties to set
     */
    constructor(properties?: IModuleProcedure);

    /** ModuleProcedure procedureId. */
    public procedureId: number;

    /** ModuleProcedure procedureName. */
    public procedureName: string;

    /**
     * Creates a new ModuleProcedure instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ModuleProcedure instance
     */
    public static create(properties?: IModuleProcedure): ModuleProcedure;

    /**
     * Encodes the specified ModuleProcedure message. Does not implicitly {@link ModuleProcedure.verify|verify} messages.
     * @param message ModuleProcedure message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IModuleProcedure, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ModuleProcedure message, length delimited. Does not implicitly {@link ModuleProcedure.verify|verify} messages.
     * @param message ModuleProcedure message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IModuleProcedure, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a ModuleProcedure message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ModuleProcedure
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ModuleProcedure;

    /**
     * Decodes a ModuleProcedure message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ModuleProcedure
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ModuleProcedure;

    /**
     * Verifies a ModuleProcedure message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a ModuleProcedure message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ModuleProcedure
     */
    public static fromObject(object: { [k: string]: any }): ModuleProcedure;

    /**
     * Creates a plain object from a ModuleProcedure message. Also converts values to other types if specified.
     * @param message ModuleProcedure
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ModuleProcedure, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ModuleProcedure to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Represents a Request. */
export class Request implements IRequest {

    /**
     * Constructs a new Request.
     * @param [properties] Properties to set
     */
    constructor(properties?: IRequest);

    /** Request messageIdentifier. */
    public messageIdentifier: number;

    /** Request portId. */
    public portId: number;

    /** Request procedureId. */
    public procedureId: number;

    /** Request payload. */
    public payload: Uint8Array;

    /**
     * Creates a new Request instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Request instance
     */
    public static create(properties?: IRequest): Request;

    /**
     * Encodes the specified Request message. Does not implicitly {@link Request.verify|verify} messages.
     * @param message Request message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IRequest, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Request message, length delimited. Does not implicitly {@link Request.verify|verify} messages.
     * @param message Request message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IRequest, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Request message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Request
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Request;

    /**
     * Decodes a Request message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Request
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Request;

    /**
     * Verifies a Request message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Request message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Request
     */
    public static fromObject(object: { [k: string]: any }): Request;

    /**
     * Creates a plain object from a Request message. Also converts values to other types if specified.
     * @param message Request
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Request, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Request to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Represents a RemoteError. */
export class RemoteError implements IRemoteError {

    /**
     * Constructs a new RemoteError.
     * @param [properties] Properties to set
     */
    constructor(properties?: IRemoteError);

    /** RemoteError messageIdentifier. */
    public messageIdentifier: number;

    /** RemoteError errorCode. */
    public errorCode: number;

    /** RemoteError errorMessage. */
    public errorMessage: string;

    /**
     * Creates a new RemoteError instance using the specified properties.
     * @param [properties] Properties to set
     * @returns RemoteError instance
     */
    public static create(properties?: IRemoteError): RemoteError;

    /**
     * Encodes the specified RemoteError message. Does not implicitly {@link RemoteError.verify|verify} messages.
     * @param message RemoteError message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IRemoteError, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified RemoteError message, length delimited. Does not implicitly {@link RemoteError.verify|verify} messages.
     * @param message RemoteError message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IRemoteError, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a RemoteError message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns RemoteError
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): RemoteError;

    /**
     * Decodes a RemoteError message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns RemoteError
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): RemoteError;

    /**
     * Verifies a RemoteError message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a RemoteError message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns RemoteError
     */
    public static fromObject(object: { [k: string]: any }): RemoteError;

    /**
     * Creates a plain object from a RemoteError message. Also converts values to other types if specified.
     * @param message RemoteError
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: RemoteError, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this RemoteError to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Represents a Response. */
export class Response implements IResponse {

    /**
     * Constructs a new Response.
     * @param [properties] Properties to set
     */
    constructor(properties?: IResponse);

    /** Response messageIdentifier. */
    public messageIdentifier: number;

    /** Response payload. */
    public payload: Uint8Array;

    /**
     * Creates a new Response instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Response instance
     */
    public static create(properties?: IResponse): Response;

    /**
     * Encodes the specified Response message. Does not implicitly {@link Response.verify|verify} messages.
     * @param message Response message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IResponse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Response message, length delimited. Does not implicitly {@link Response.verify|verify} messages.
     * @param message Response message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IResponse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Response message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Response
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Response;

    /**
     * Decodes a Response message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Response
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Response;

    /**
     * Verifies a Response message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Response message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Response
     */
    public static fromObject(object: { [k: string]: any }): Response;

    /**
     * Creates a plain object from a Response message. Also converts values to other types if specified.
     * @param message Response
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Response, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Response to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Represents a StreamMessage. */
export class StreamMessage implements IStreamMessage {

    /**
     * Constructs a new StreamMessage.
     * @param [properties] Properties to set
     */
    constructor(properties?: IStreamMessage);

    /** StreamMessage messageIdentifier. */
    public messageIdentifier: number;

    /** StreamMessage portId. */
    public portId: number;

    /** StreamMessage sequenceId. */
    public sequenceId: number;

    /** StreamMessage payload. */
    public payload: Uint8Array;

    /** StreamMessage closed. */
    public closed: boolean;

    /** StreamMessage ack. */
    public ack: boolean;

    /**
     * Creates a new StreamMessage instance using the specified properties.
     * @param [properties] Properties to set
     * @returns StreamMessage instance
     */
    public static create(properties?: IStreamMessage): StreamMessage;

    /**
     * Encodes the specified StreamMessage message. Does not implicitly {@link StreamMessage.verify|verify} messages.
     * @param message StreamMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IStreamMessage, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified StreamMessage message, length delimited. Does not implicitly {@link StreamMessage.verify|verify} messages.
     * @param message StreamMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IStreamMessage, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a StreamMessage message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns StreamMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): StreamMessage;

    /**
     * Decodes a StreamMessage message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns StreamMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): StreamMessage;

    /**
     * Verifies a StreamMessage message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a StreamMessage message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns StreamMessage
     */
    public static fromObject(object: { [k: string]: any }): StreamMessage;

    /**
     * Creates a plain object from a StreamMessage message. Also converts values to other types if specified.
     * @param message StreamMessage
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: StreamMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this StreamMessage to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}
