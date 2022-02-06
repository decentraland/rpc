/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.RpcMessageHeader = (function() {

    /**
     * Properties of a RpcMessageHeader.
     * @exports IRpcMessageHeader
     * @interface IRpcMessageHeader
     * @property {number|null} [messageIdentifier] RpcMessageHeader messageIdentifier
     */

    /**
     * Constructs a new RpcMessageHeader.
     * @exports RpcMessageHeader
     * @classdesc Represents a RpcMessageHeader.
     * @implements IRpcMessageHeader
     * @constructor
     * @param {IRpcMessageHeader=} [properties] Properties to set
     */
    function RpcMessageHeader(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * RpcMessageHeader messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof RpcMessageHeader
     * @instance
     */
    RpcMessageHeader.prototype.messageIdentifier = 0;

    /**
     * Creates a new RpcMessageHeader instance using the specified properties.
     * @function create
     * @memberof RpcMessageHeader
     * @static
     * @param {IRpcMessageHeader=} [properties] Properties to set
     * @returns {RpcMessageHeader} RpcMessageHeader instance
     */
    RpcMessageHeader.create = function create(properties) {
        return new RpcMessageHeader(properties);
    };

    /**
     * Encodes the specified RpcMessageHeader message. Does not implicitly {@link RpcMessageHeader.verify|verify} messages.
     * @function encode
     * @memberof RpcMessageHeader
     * @static
     * @param {IRpcMessageHeader} message RpcMessageHeader message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RpcMessageHeader.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        return writer;
    };

    /**
     * Encodes the specified RpcMessageHeader message, length delimited. Does not implicitly {@link RpcMessageHeader.verify|verify} messages.
     * @function encodeDelimited
     * @memberof RpcMessageHeader
     * @static
     * @param {IRpcMessageHeader} message RpcMessageHeader message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RpcMessageHeader.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a RpcMessageHeader message from the specified reader or buffer.
     * @function decode
     * @memberof RpcMessageHeader
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {RpcMessageHeader} RpcMessageHeader
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RpcMessageHeader.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.RpcMessageHeader();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a RpcMessageHeader message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof RpcMessageHeader
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {RpcMessageHeader} RpcMessageHeader
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RpcMessageHeader.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a RpcMessageHeader message.
     * @function verify
     * @memberof RpcMessageHeader
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    RpcMessageHeader.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        return null;
    };

    /**
     * Creates a RpcMessageHeader message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof RpcMessageHeader
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {RpcMessageHeader} RpcMessageHeader
     */
    RpcMessageHeader.fromObject = function fromObject(object) {
        if (object instanceof $root.RpcMessageHeader)
            return object;
        var message = new $root.RpcMessageHeader();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        return message;
    };

    /**
     * Creates a plain object from a RpcMessageHeader message. Also converts values to other types if specified.
     * @function toObject
     * @memberof RpcMessageHeader
     * @static
     * @param {RpcMessageHeader} message RpcMessageHeader
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    RpcMessageHeader.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults)
            object.messageIdentifier = 0;
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        return object;
    };

    /**
     * Converts this RpcMessageHeader to JSON.
     * @function toJSON
     * @memberof RpcMessageHeader
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    RpcMessageHeader.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return RpcMessageHeader;
})();

/**
 * RpcMessageTypes enum.
 * @exports RpcMessageTypes
 * @enum {number}
 * @property {number} RpcMessageTypes_EMPTY=0 RpcMessageTypes_EMPTY value
 * @property {number} RpcMessageTypes_REQUEST=1 RpcMessageTypes_REQUEST value
 * @property {number} RpcMessageTypes_RESPONSE=2 RpcMessageTypes_RESPONSE value
 * @property {number} RpcMessageTypes_STREAM_MESSAGE=3 RpcMessageTypes_STREAM_MESSAGE value
 * @property {number} RpcMessageTypes_STREAM_ACK=4 RpcMessageTypes_STREAM_ACK value
 * @property {number} RpcMessageTypes_CREATE_PORT=5 RpcMessageTypes_CREATE_PORT value
 * @property {number} RpcMessageTypes_CREATE_PORT_RESPONSE=6 RpcMessageTypes_CREATE_PORT_RESPONSE value
 * @property {number} RpcMessageTypes_REQUEST_MODULE=7 RpcMessageTypes_REQUEST_MODULE value
 * @property {number} RpcMessageTypes_REQUEST_MODULE_RESPONSE=8 RpcMessageTypes_REQUEST_MODULE_RESPONSE value
 * @property {number} RpcMessageTypes_REMOTE_ERROR_RESPONSE=9 RpcMessageTypes_REMOTE_ERROR_RESPONSE value
 * @property {number} RpcMessageTypes_DESTROY_PORT=10 RpcMessageTypes_DESTROY_PORT value
 * @property {number} RpcMessageTypes_SERVER_READY=11 RpcMessageTypes_SERVER_READY value
 */
$root.RpcMessageTypes = (function() {
    var valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "RpcMessageTypes_EMPTY"] = 0;
    values[valuesById[1] = "RpcMessageTypes_REQUEST"] = 1;
    values[valuesById[2] = "RpcMessageTypes_RESPONSE"] = 2;
    values[valuesById[3] = "RpcMessageTypes_STREAM_MESSAGE"] = 3;
    values[valuesById[4] = "RpcMessageTypes_STREAM_ACK"] = 4;
    values[valuesById[5] = "RpcMessageTypes_CREATE_PORT"] = 5;
    values[valuesById[6] = "RpcMessageTypes_CREATE_PORT_RESPONSE"] = 6;
    values[valuesById[7] = "RpcMessageTypes_REQUEST_MODULE"] = 7;
    values[valuesById[8] = "RpcMessageTypes_REQUEST_MODULE_RESPONSE"] = 8;
    values[valuesById[9] = "RpcMessageTypes_REMOTE_ERROR_RESPONSE"] = 9;
    values[valuesById[10] = "RpcMessageTypes_DESTROY_PORT"] = 10;
    values[valuesById[11] = "RpcMessageTypes_SERVER_READY"] = 11;
    return values;
})();

$root.CreatePort = (function() {

    /**
     * Properties of a CreatePort.
     * @exports ICreatePort
     * @interface ICreatePort
     * @property {number|null} [messageIdentifier] CreatePort messageIdentifier
     * @property {string|null} [portName] CreatePort portName
     */

    /**
     * Constructs a new CreatePort.
     * @exports CreatePort
     * @classdesc Represents a CreatePort.
     * @implements ICreatePort
     * @constructor
     * @param {ICreatePort=} [properties] Properties to set
     */
    function CreatePort(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * CreatePort messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof CreatePort
     * @instance
     */
    CreatePort.prototype.messageIdentifier = 0;

    /**
     * CreatePort portName.
     * @member {string} portName
     * @memberof CreatePort
     * @instance
     */
    CreatePort.prototype.portName = "";

    /**
     * Creates a new CreatePort instance using the specified properties.
     * @function create
     * @memberof CreatePort
     * @static
     * @param {ICreatePort=} [properties] Properties to set
     * @returns {CreatePort} CreatePort instance
     */
    CreatePort.create = function create(properties) {
        return new CreatePort(properties);
    };

    /**
     * Encodes the specified CreatePort message. Does not implicitly {@link CreatePort.verify|verify} messages.
     * @function encode
     * @memberof CreatePort
     * @static
     * @param {ICreatePort} message CreatePort message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CreatePort.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        if (message.portName != null && Object.hasOwnProperty.call(message, "portName"))
            writer.uint32(/* id 4, wireType 2 =*/34).string(message.portName);
        return writer;
    };

    /**
     * Encodes the specified CreatePort message, length delimited. Does not implicitly {@link CreatePort.verify|verify} messages.
     * @function encodeDelimited
     * @memberof CreatePort
     * @static
     * @param {ICreatePort} message CreatePort message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CreatePort.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a CreatePort message from the specified reader or buffer.
     * @function decode
     * @memberof CreatePort
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {CreatePort} CreatePort
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CreatePort.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.CreatePort();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            case 4:
                message.portName = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a CreatePort message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof CreatePort
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {CreatePort} CreatePort
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CreatePort.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a CreatePort message.
     * @function verify
     * @memberof CreatePort
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    CreatePort.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        if (message.portName != null && message.hasOwnProperty("portName"))
            if (!$util.isString(message.portName))
                return "portName: string expected";
        return null;
    };

    /**
     * Creates a CreatePort message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof CreatePort
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {CreatePort} CreatePort
     */
    CreatePort.fromObject = function fromObject(object) {
        if (object instanceof $root.CreatePort)
            return object;
        var message = new $root.CreatePort();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        if (object.portName != null)
            message.portName = String(object.portName);
        return message;
    };

    /**
     * Creates a plain object from a CreatePort message. Also converts values to other types if specified.
     * @function toObject
     * @memberof CreatePort
     * @static
     * @param {CreatePort} message CreatePort
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    CreatePort.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.messageIdentifier = 0;
            object.portName = "";
        }
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        if (message.portName != null && message.hasOwnProperty("portName"))
            object.portName = message.portName;
        return object;
    };

    /**
     * Converts this CreatePort to JSON.
     * @function toJSON
     * @memberof CreatePort
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    CreatePort.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return CreatePort;
})();

$root.CreatePortResponse = (function() {

    /**
     * Properties of a CreatePortResponse.
     * @exports ICreatePortResponse
     * @interface ICreatePortResponse
     * @property {number|null} [messageIdentifier] CreatePortResponse messageIdentifier
     * @property {number|null} [portId] CreatePortResponse portId
     */

    /**
     * Constructs a new CreatePortResponse.
     * @exports CreatePortResponse
     * @classdesc Represents a CreatePortResponse.
     * @implements ICreatePortResponse
     * @constructor
     * @param {ICreatePortResponse=} [properties] Properties to set
     */
    function CreatePortResponse(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * CreatePortResponse messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof CreatePortResponse
     * @instance
     */
    CreatePortResponse.prototype.messageIdentifier = 0;

    /**
     * CreatePortResponse portId.
     * @member {number} portId
     * @memberof CreatePortResponse
     * @instance
     */
    CreatePortResponse.prototype.portId = 0;

    /**
     * Creates a new CreatePortResponse instance using the specified properties.
     * @function create
     * @memberof CreatePortResponse
     * @static
     * @param {ICreatePortResponse=} [properties] Properties to set
     * @returns {CreatePortResponse} CreatePortResponse instance
     */
    CreatePortResponse.create = function create(properties) {
        return new CreatePortResponse(properties);
    };

    /**
     * Encodes the specified CreatePortResponse message. Does not implicitly {@link CreatePortResponse.verify|verify} messages.
     * @function encode
     * @memberof CreatePortResponse
     * @static
     * @param {ICreatePortResponse} message CreatePortResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CreatePortResponse.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        if (message.portId != null && Object.hasOwnProperty.call(message, "portId"))
            writer.uint32(/* id 2, wireType 5 =*/21).fixed32(message.portId);
        return writer;
    };

    /**
     * Encodes the specified CreatePortResponse message, length delimited. Does not implicitly {@link CreatePortResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof CreatePortResponse
     * @static
     * @param {ICreatePortResponse} message CreatePortResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CreatePortResponse.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a CreatePortResponse message from the specified reader or buffer.
     * @function decode
     * @memberof CreatePortResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {CreatePortResponse} CreatePortResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CreatePortResponse.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.CreatePortResponse();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            case 2:
                message.portId = reader.fixed32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a CreatePortResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof CreatePortResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {CreatePortResponse} CreatePortResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CreatePortResponse.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a CreatePortResponse message.
     * @function verify
     * @memberof CreatePortResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    CreatePortResponse.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        if (message.portId != null && message.hasOwnProperty("portId"))
            if (!$util.isInteger(message.portId))
                return "portId: integer expected";
        return null;
    };

    /**
     * Creates a CreatePortResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof CreatePortResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {CreatePortResponse} CreatePortResponse
     */
    CreatePortResponse.fromObject = function fromObject(object) {
        if (object instanceof $root.CreatePortResponse)
            return object;
        var message = new $root.CreatePortResponse();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        if (object.portId != null)
            message.portId = object.portId >>> 0;
        return message;
    };

    /**
     * Creates a plain object from a CreatePortResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof CreatePortResponse
     * @static
     * @param {CreatePortResponse} message CreatePortResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    CreatePortResponse.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.messageIdentifier = 0;
            object.portId = 0;
        }
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        if (message.portId != null && message.hasOwnProperty("portId"))
            object.portId = message.portId;
        return object;
    };

    /**
     * Converts this CreatePortResponse to JSON.
     * @function toJSON
     * @memberof CreatePortResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    CreatePortResponse.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return CreatePortResponse;
})();

$root.RequestModule = (function() {

    /**
     * Properties of a RequestModule.
     * @exports IRequestModule
     * @interface IRequestModule
     * @property {number|null} [messageIdentifier] RequestModule messageIdentifier
     * @property {number|null} [portId] RequestModule portId
     * @property {string|null} [moduleName] RequestModule moduleName
     */

    /**
     * Constructs a new RequestModule.
     * @exports RequestModule
     * @classdesc Represents a RequestModule.
     * @implements IRequestModule
     * @constructor
     * @param {IRequestModule=} [properties] Properties to set
     */
    function RequestModule(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * RequestModule messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof RequestModule
     * @instance
     */
    RequestModule.prototype.messageIdentifier = 0;

    /**
     * RequestModule portId.
     * @member {number} portId
     * @memberof RequestModule
     * @instance
     */
    RequestModule.prototype.portId = 0;

    /**
     * RequestModule moduleName.
     * @member {string} moduleName
     * @memberof RequestModule
     * @instance
     */
    RequestModule.prototype.moduleName = "";

    /**
     * Creates a new RequestModule instance using the specified properties.
     * @function create
     * @memberof RequestModule
     * @static
     * @param {IRequestModule=} [properties] Properties to set
     * @returns {RequestModule} RequestModule instance
     */
    RequestModule.create = function create(properties) {
        return new RequestModule(properties);
    };

    /**
     * Encodes the specified RequestModule message. Does not implicitly {@link RequestModule.verify|verify} messages.
     * @function encode
     * @memberof RequestModule
     * @static
     * @param {IRequestModule} message RequestModule message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RequestModule.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        if (message.portId != null && Object.hasOwnProperty.call(message, "portId"))
            writer.uint32(/* id 2, wireType 5 =*/21).fixed32(message.portId);
        if (message.moduleName != null && Object.hasOwnProperty.call(message, "moduleName"))
            writer.uint32(/* id 4, wireType 2 =*/34).string(message.moduleName);
        return writer;
    };

    /**
     * Encodes the specified RequestModule message, length delimited. Does not implicitly {@link RequestModule.verify|verify} messages.
     * @function encodeDelimited
     * @memberof RequestModule
     * @static
     * @param {IRequestModule} message RequestModule message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RequestModule.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a RequestModule message from the specified reader or buffer.
     * @function decode
     * @memberof RequestModule
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {RequestModule} RequestModule
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RequestModule.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.RequestModule();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            case 2:
                message.portId = reader.fixed32();
                break;
            case 4:
                message.moduleName = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a RequestModule message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof RequestModule
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {RequestModule} RequestModule
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RequestModule.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a RequestModule message.
     * @function verify
     * @memberof RequestModule
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    RequestModule.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        if (message.portId != null && message.hasOwnProperty("portId"))
            if (!$util.isInteger(message.portId))
                return "portId: integer expected";
        if (message.moduleName != null && message.hasOwnProperty("moduleName"))
            if (!$util.isString(message.moduleName))
                return "moduleName: string expected";
        return null;
    };

    /**
     * Creates a RequestModule message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof RequestModule
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {RequestModule} RequestModule
     */
    RequestModule.fromObject = function fromObject(object) {
        if (object instanceof $root.RequestModule)
            return object;
        var message = new $root.RequestModule();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        if (object.portId != null)
            message.portId = object.portId >>> 0;
        if (object.moduleName != null)
            message.moduleName = String(object.moduleName);
        return message;
    };

    /**
     * Creates a plain object from a RequestModule message. Also converts values to other types if specified.
     * @function toObject
     * @memberof RequestModule
     * @static
     * @param {RequestModule} message RequestModule
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    RequestModule.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.messageIdentifier = 0;
            object.portId = 0;
            object.moduleName = "";
        }
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        if (message.portId != null && message.hasOwnProperty("portId"))
            object.portId = message.portId;
        if (message.moduleName != null && message.hasOwnProperty("moduleName"))
            object.moduleName = message.moduleName;
        return object;
    };

    /**
     * Converts this RequestModule to JSON.
     * @function toJSON
     * @memberof RequestModule
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    RequestModule.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return RequestModule;
})();

$root.RequestModuleResponse = (function() {

    /**
     * Properties of a RequestModuleResponse.
     * @exports IRequestModuleResponse
     * @interface IRequestModuleResponse
     * @property {number|null} [messageIdentifier] RequestModuleResponse messageIdentifier
     * @property {number|null} [portId] RequestModuleResponse portId
     * @property {Array.<IModuleProcedure>|null} [procedures] RequestModuleResponse procedures
     */

    /**
     * Constructs a new RequestModuleResponse.
     * @exports RequestModuleResponse
     * @classdesc Represents a RequestModuleResponse.
     * @implements IRequestModuleResponse
     * @constructor
     * @param {IRequestModuleResponse=} [properties] Properties to set
     */
    function RequestModuleResponse(properties) {
        this.procedures = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * RequestModuleResponse messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof RequestModuleResponse
     * @instance
     */
    RequestModuleResponse.prototype.messageIdentifier = 0;

    /**
     * RequestModuleResponse portId.
     * @member {number} portId
     * @memberof RequestModuleResponse
     * @instance
     */
    RequestModuleResponse.prototype.portId = 0;

    /**
     * RequestModuleResponse procedures.
     * @member {Array.<IModuleProcedure>} procedures
     * @memberof RequestModuleResponse
     * @instance
     */
    RequestModuleResponse.prototype.procedures = $util.emptyArray;

    /**
     * Creates a new RequestModuleResponse instance using the specified properties.
     * @function create
     * @memberof RequestModuleResponse
     * @static
     * @param {IRequestModuleResponse=} [properties] Properties to set
     * @returns {RequestModuleResponse} RequestModuleResponse instance
     */
    RequestModuleResponse.create = function create(properties) {
        return new RequestModuleResponse(properties);
    };

    /**
     * Encodes the specified RequestModuleResponse message. Does not implicitly {@link RequestModuleResponse.verify|verify} messages.
     * @function encode
     * @memberof RequestModuleResponse
     * @static
     * @param {IRequestModuleResponse} message RequestModuleResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RequestModuleResponse.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        if (message.portId != null && Object.hasOwnProperty.call(message, "portId"))
            writer.uint32(/* id 2, wireType 5 =*/21).fixed32(message.portId);
        if (message.procedures != null && message.procedures.length)
            for (var i = 0; i < message.procedures.length; ++i)
                $root.ModuleProcedure.encode(message.procedures[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified RequestModuleResponse message, length delimited. Does not implicitly {@link RequestModuleResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof RequestModuleResponse
     * @static
     * @param {IRequestModuleResponse} message RequestModuleResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RequestModuleResponse.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a RequestModuleResponse message from the specified reader or buffer.
     * @function decode
     * @memberof RequestModuleResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {RequestModuleResponse} RequestModuleResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RequestModuleResponse.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.RequestModuleResponse();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            case 2:
                message.portId = reader.fixed32();
                break;
            case 5:
                if (!(message.procedures && message.procedures.length))
                    message.procedures = [];
                message.procedures.push($root.ModuleProcedure.decode(reader, reader.uint32()));
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a RequestModuleResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof RequestModuleResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {RequestModuleResponse} RequestModuleResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RequestModuleResponse.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a RequestModuleResponse message.
     * @function verify
     * @memberof RequestModuleResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    RequestModuleResponse.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        if (message.portId != null && message.hasOwnProperty("portId"))
            if (!$util.isInteger(message.portId))
                return "portId: integer expected";
        if (message.procedures != null && message.hasOwnProperty("procedures")) {
            if (!Array.isArray(message.procedures))
                return "procedures: array expected";
            for (var i = 0; i < message.procedures.length; ++i) {
                var error = $root.ModuleProcedure.verify(message.procedures[i]);
                if (error)
                    return "procedures." + error;
            }
        }
        return null;
    };

    /**
     * Creates a RequestModuleResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof RequestModuleResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {RequestModuleResponse} RequestModuleResponse
     */
    RequestModuleResponse.fromObject = function fromObject(object) {
        if (object instanceof $root.RequestModuleResponse)
            return object;
        var message = new $root.RequestModuleResponse();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        if (object.portId != null)
            message.portId = object.portId >>> 0;
        if (object.procedures) {
            if (!Array.isArray(object.procedures))
                throw TypeError(".RequestModuleResponse.procedures: array expected");
            message.procedures = [];
            for (var i = 0; i < object.procedures.length; ++i) {
                if (typeof object.procedures[i] !== "object")
                    throw TypeError(".RequestModuleResponse.procedures: object expected");
                message.procedures[i] = $root.ModuleProcedure.fromObject(object.procedures[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a RequestModuleResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof RequestModuleResponse
     * @static
     * @param {RequestModuleResponse} message RequestModuleResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    RequestModuleResponse.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults)
            object.procedures = [];
        if (options.defaults) {
            object.messageIdentifier = 0;
            object.portId = 0;
        }
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        if (message.portId != null && message.hasOwnProperty("portId"))
            object.portId = message.portId;
        if (message.procedures && message.procedures.length) {
            object.procedures = [];
            for (var j = 0; j < message.procedures.length; ++j)
                object.procedures[j] = $root.ModuleProcedure.toObject(message.procedures[j], options);
        }
        return object;
    };

    /**
     * Converts this RequestModuleResponse to JSON.
     * @function toJSON
     * @memberof RequestModuleResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    RequestModuleResponse.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return RequestModuleResponse;
})();

$root.DestroyPort = (function() {

    /**
     * Properties of a DestroyPort.
     * @exports IDestroyPort
     * @interface IDestroyPort
     * @property {number|null} [messageIdentifier] DestroyPort messageIdentifier
     * @property {number|null} [portId] DestroyPort portId
     */

    /**
     * Constructs a new DestroyPort.
     * @exports DestroyPort
     * @classdesc Represents a DestroyPort.
     * @implements IDestroyPort
     * @constructor
     * @param {IDestroyPort=} [properties] Properties to set
     */
    function DestroyPort(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * DestroyPort messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof DestroyPort
     * @instance
     */
    DestroyPort.prototype.messageIdentifier = 0;

    /**
     * DestroyPort portId.
     * @member {number} portId
     * @memberof DestroyPort
     * @instance
     */
    DestroyPort.prototype.portId = 0;

    /**
     * Creates a new DestroyPort instance using the specified properties.
     * @function create
     * @memberof DestroyPort
     * @static
     * @param {IDestroyPort=} [properties] Properties to set
     * @returns {DestroyPort} DestroyPort instance
     */
    DestroyPort.create = function create(properties) {
        return new DestroyPort(properties);
    };

    /**
     * Encodes the specified DestroyPort message. Does not implicitly {@link DestroyPort.verify|verify} messages.
     * @function encode
     * @memberof DestroyPort
     * @static
     * @param {IDestroyPort} message DestroyPort message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DestroyPort.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        if (message.portId != null && Object.hasOwnProperty.call(message, "portId"))
            writer.uint32(/* id 2, wireType 5 =*/21).fixed32(message.portId);
        return writer;
    };

    /**
     * Encodes the specified DestroyPort message, length delimited. Does not implicitly {@link DestroyPort.verify|verify} messages.
     * @function encodeDelimited
     * @memberof DestroyPort
     * @static
     * @param {IDestroyPort} message DestroyPort message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DestroyPort.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a DestroyPort message from the specified reader or buffer.
     * @function decode
     * @memberof DestroyPort
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {DestroyPort} DestroyPort
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DestroyPort.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.DestroyPort();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            case 2:
                message.portId = reader.fixed32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a DestroyPort message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof DestroyPort
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {DestroyPort} DestroyPort
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DestroyPort.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a DestroyPort message.
     * @function verify
     * @memberof DestroyPort
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    DestroyPort.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        if (message.portId != null && message.hasOwnProperty("portId"))
            if (!$util.isInteger(message.portId))
                return "portId: integer expected";
        return null;
    };

    /**
     * Creates a DestroyPort message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof DestroyPort
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {DestroyPort} DestroyPort
     */
    DestroyPort.fromObject = function fromObject(object) {
        if (object instanceof $root.DestroyPort)
            return object;
        var message = new $root.DestroyPort();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        if (object.portId != null)
            message.portId = object.portId >>> 0;
        return message;
    };

    /**
     * Creates a plain object from a DestroyPort message. Also converts values to other types if specified.
     * @function toObject
     * @memberof DestroyPort
     * @static
     * @param {DestroyPort} message DestroyPort
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    DestroyPort.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.messageIdentifier = 0;
            object.portId = 0;
        }
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        if (message.portId != null && message.hasOwnProperty("portId"))
            object.portId = message.portId;
        return object;
    };

    /**
     * Converts this DestroyPort to JSON.
     * @function toJSON
     * @memberof DestroyPort
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    DestroyPort.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return DestroyPort;
})();

$root.ModuleProcedure = (function() {

    /**
     * Properties of a ModuleProcedure.
     * @exports IModuleProcedure
     * @interface IModuleProcedure
     * @property {number|null} [procedureId] ModuleProcedure procedureId
     * @property {string|null} [procedureName] ModuleProcedure procedureName
     */

    /**
     * Constructs a new ModuleProcedure.
     * @exports ModuleProcedure
     * @classdesc Represents a ModuleProcedure.
     * @implements IModuleProcedure
     * @constructor
     * @param {IModuleProcedure=} [properties] Properties to set
     */
    function ModuleProcedure(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ModuleProcedure procedureId.
     * @member {number} procedureId
     * @memberof ModuleProcedure
     * @instance
     */
    ModuleProcedure.prototype.procedureId = 0;

    /**
     * ModuleProcedure procedureName.
     * @member {string} procedureName
     * @memberof ModuleProcedure
     * @instance
     */
    ModuleProcedure.prototype.procedureName = "";

    /**
     * Creates a new ModuleProcedure instance using the specified properties.
     * @function create
     * @memberof ModuleProcedure
     * @static
     * @param {IModuleProcedure=} [properties] Properties to set
     * @returns {ModuleProcedure} ModuleProcedure instance
     */
    ModuleProcedure.create = function create(properties) {
        return new ModuleProcedure(properties);
    };

    /**
     * Encodes the specified ModuleProcedure message. Does not implicitly {@link ModuleProcedure.verify|verify} messages.
     * @function encode
     * @memberof ModuleProcedure
     * @static
     * @param {IModuleProcedure} message ModuleProcedure message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ModuleProcedure.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.procedureId != null && Object.hasOwnProperty.call(message, "procedureId"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.procedureId);
        if (message.procedureName != null && Object.hasOwnProperty.call(message, "procedureName"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.procedureName);
        return writer;
    };

    /**
     * Encodes the specified ModuleProcedure message, length delimited. Does not implicitly {@link ModuleProcedure.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ModuleProcedure
     * @static
     * @param {IModuleProcedure} message ModuleProcedure message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ModuleProcedure.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a ModuleProcedure message from the specified reader or buffer.
     * @function decode
     * @memberof ModuleProcedure
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ModuleProcedure} ModuleProcedure
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ModuleProcedure.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.ModuleProcedure();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.procedureId = reader.fixed32();
                break;
            case 2:
                message.procedureName = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a ModuleProcedure message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ModuleProcedure
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ModuleProcedure} ModuleProcedure
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ModuleProcedure.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a ModuleProcedure message.
     * @function verify
     * @memberof ModuleProcedure
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ModuleProcedure.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.procedureId != null && message.hasOwnProperty("procedureId"))
            if (!$util.isInteger(message.procedureId))
                return "procedureId: integer expected";
        if (message.procedureName != null && message.hasOwnProperty("procedureName"))
            if (!$util.isString(message.procedureName))
                return "procedureName: string expected";
        return null;
    };

    /**
     * Creates a ModuleProcedure message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ModuleProcedure
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ModuleProcedure} ModuleProcedure
     */
    ModuleProcedure.fromObject = function fromObject(object) {
        if (object instanceof $root.ModuleProcedure)
            return object;
        var message = new $root.ModuleProcedure();
        if (object.procedureId != null)
            message.procedureId = object.procedureId >>> 0;
        if (object.procedureName != null)
            message.procedureName = String(object.procedureName);
        return message;
    };

    /**
     * Creates a plain object from a ModuleProcedure message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ModuleProcedure
     * @static
     * @param {ModuleProcedure} message ModuleProcedure
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ModuleProcedure.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.procedureId = 0;
            object.procedureName = "";
        }
        if (message.procedureId != null && message.hasOwnProperty("procedureId"))
            object.procedureId = message.procedureId;
        if (message.procedureName != null && message.hasOwnProperty("procedureName"))
            object.procedureName = message.procedureName;
        return object;
    };

    /**
     * Converts this ModuleProcedure to JSON.
     * @function toJSON
     * @memberof ModuleProcedure
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ModuleProcedure.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return ModuleProcedure;
})();

$root.Request = (function() {

    /**
     * Properties of a Request.
     * @exports IRequest
     * @interface IRequest
     * @property {number|null} [messageIdentifier] Request messageIdentifier
     * @property {number|null} [portId] Request portId
     * @property {number|null} [procedureId] Request procedureId
     * @property {Uint8Array|null} [payload] Request payload
     */

    /**
     * Constructs a new Request.
     * @exports Request
     * @classdesc Represents a Request.
     * @implements IRequest
     * @constructor
     * @param {IRequest=} [properties] Properties to set
     */
    function Request(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Request messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof Request
     * @instance
     */
    Request.prototype.messageIdentifier = 0;

    /**
     * Request portId.
     * @member {number} portId
     * @memberof Request
     * @instance
     */
    Request.prototype.portId = 0;

    /**
     * Request procedureId.
     * @member {number} procedureId
     * @memberof Request
     * @instance
     */
    Request.prototype.procedureId = 0;

    /**
     * Request payload.
     * @member {Uint8Array} payload
     * @memberof Request
     * @instance
     */
    Request.prototype.payload = $util.newBuffer([]);

    /**
     * Creates a new Request instance using the specified properties.
     * @function create
     * @memberof Request
     * @static
     * @param {IRequest=} [properties] Properties to set
     * @returns {Request} Request instance
     */
    Request.create = function create(properties) {
        return new Request(properties);
    };

    /**
     * Encodes the specified Request message. Does not implicitly {@link Request.verify|verify} messages.
     * @function encode
     * @memberof Request
     * @static
     * @param {IRequest} message Request message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Request.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        if (message.portId != null && Object.hasOwnProperty.call(message, "portId"))
            writer.uint32(/* id 2, wireType 5 =*/21).fixed32(message.portId);
        if (message.procedureId != null && Object.hasOwnProperty.call(message, "procedureId"))
            writer.uint32(/* id 4, wireType 5 =*/37).fixed32(message.procedureId);
        if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
            writer.uint32(/* id 6, wireType 2 =*/50).bytes(message.payload);
        return writer;
    };

    /**
     * Encodes the specified Request message, length delimited. Does not implicitly {@link Request.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Request
     * @static
     * @param {IRequest} message Request message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Request.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Request message from the specified reader or buffer.
     * @function decode
     * @memberof Request
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Request} Request
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Request.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Request();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            case 2:
                message.portId = reader.fixed32();
                break;
            case 4:
                message.procedureId = reader.fixed32();
                break;
            case 6:
                message.payload = reader.bytes();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Request message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Request
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Request} Request
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Request.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Request message.
     * @function verify
     * @memberof Request
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Request.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        if (message.portId != null && message.hasOwnProperty("portId"))
            if (!$util.isInteger(message.portId))
                return "portId: integer expected";
        if (message.procedureId != null && message.hasOwnProperty("procedureId"))
            if (!$util.isInteger(message.procedureId))
                return "procedureId: integer expected";
        if (message.payload != null && message.hasOwnProperty("payload"))
            if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                return "payload: buffer expected";
        return null;
    };

    /**
     * Creates a Request message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Request
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Request} Request
     */
    Request.fromObject = function fromObject(object) {
        if (object instanceof $root.Request)
            return object;
        var message = new $root.Request();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        if (object.portId != null)
            message.portId = object.portId >>> 0;
        if (object.procedureId != null)
            message.procedureId = object.procedureId >>> 0;
        if (object.payload != null)
            if (typeof object.payload === "string")
                $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
            else if (object.payload.length)
                message.payload = object.payload;
        return message;
    };

    /**
     * Creates a plain object from a Request message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Request
     * @static
     * @param {Request} message Request
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Request.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.messageIdentifier = 0;
            object.portId = 0;
            object.procedureId = 0;
            if (options.bytes === String)
                object.payload = "";
            else {
                object.payload = [];
                if (options.bytes !== Array)
                    object.payload = $util.newBuffer(object.payload);
            }
        }
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        if (message.portId != null && message.hasOwnProperty("portId"))
            object.portId = message.portId;
        if (message.procedureId != null && message.hasOwnProperty("procedureId"))
            object.procedureId = message.procedureId;
        if (message.payload != null && message.hasOwnProperty("payload"))
            object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
        return object;
    };

    /**
     * Converts this Request to JSON.
     * @function toJSON
     * @memberof Request
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Request.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Request;
})();

$root.RemoteError = (function() {

    /**
     * Properties of a RemoteError.
     * @exports IRemoteError
     * @interface IRemoteError
     * @property {number|null} [messageIdentifier] RemoteError messageIdentifier
     * @property {number|null} [errorCode] RemoteError errorCode
     * @property {string|null} [errorMessage] RemoteError errorMessage
     */

    /**
     * Constructs a new RemoteError.
     * @exports RemoteError
     * @classdesc Represents a RemoteError.
     * @implements IRemoteError
     * @constructor
     * @param {IRemoteError=} [properties] Properties to set
     */
    function RemoteError(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * RemoteError messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof RemoteError
     * @instance
     */
    RemoteError.prototype.messageIdentifier = 0;

    /**
     * RemoteError errorCode.
     * @member {number} errorCode
     * @memberof RemoteError
     * @instance
     */
    RemoteError.prototype.errorCode = 0;

    /**
     * RemoteError errorMessage.
     * @member {string} errorMessage
     * @memberof RemoteError
     * @instance
     */
    RemoteError.prototype.errorMessage = "";

    /**
     * Creates a new RemoteError instance using the specified properties.
     * @function create
     * @memberof RemoteError
     * @static
     * @param {IRemoteError=} [properties] Properties to set
     * @returns {RemoteError} RemoteError instance
     */
    RemoteError.create = function create(properties) {
        return new RemoteError(properties);
    };

    /**
     * Encodes the specified RemoteError message. Does not implicitly {@link RemoteError.verify|verify} messages.
     * @function encode
     * @memberof RemoteError
     * @static
     * @param {IRemoteError} message RemoteError message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RemoteError.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        if (message.errorCode != null && Object.hasOwnProperty.call(message, "errorCode"))
            writer.uint32(/* id 2, wireType 5 =*/21).fixed32(message.errorCode);
        if (message.errorMessage != null && Object.hasOwnProperty.call(message, "errorMessage"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.errorMessage);
        return writer;
    };

    /**
     * Encodes the specified RemoteError message, length delimited. Does not implicitly {@link RemoteError.verify|verify} messages.
     * @function encodeDelimited
     * @memberof RemoteError
     * @static
     * @param {IRemoteError} message RemoteError message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RemoteError.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a RemoteError message from the specified reader or buffer.
     * @function decode
     * @memberof RemoteError
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {RemoteError} RemoteError
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RemoteError.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.RemoteError();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            case 2:
                message.errorCode = reader.fixed32();
                break;
            case 3:
                message.errorMessage = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a RemoteError message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof RemoteError
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {RemoteError} RemoteError
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RemoteError.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a RemoteError message.
     * @function verify
     * @memberof RemoteError
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    RemoteError.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        if (message.errorCode != null && message.hasOwnProperty("errorCode"))
            if (!$util.isInteger(message.errorCode))
                return "errorCode: integer expected";
        if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
            if (!$util.isString(message.errorMessage))
                return "errorMessage: string expected";
        return null;
    };

    /**
     * Creates a RemoteError message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof RemoteError
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {RemoteError} RemoteError
     */
    RemoteError.fromObject = function fromObject(object) {
        if (object instanceof $root.RemoteError)
            return object;
        var message = new $root.RemoteError();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        if (object.errorCode != null)
            message.errorCode = object.errorCode >>> 0;
        if (object.errorMessage != null)
            message.errorMessage = String(object.errorMessage);
        return message;
    };

    /**
     * Creates a plain object from a RemoteError message. Also converts values to other types if specified.
     * @function toObject
     * @memberof RemoteError
     * @static
     * @param {RemoteError} message RemoteError
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    RemoteError.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.messageIdentifier = 0;
            object.errorCode = 0;
            object.errorMessage = "";
        }
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        if (message.errorCode != null && message.hasOwnProperty("errorCode"))
            object.errorCode = message.errorCode;
        if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
            object.errorMessage = message.errorMessage;
        return object;
    };

    /**
     * Converts this RemoteError to JSON.
     * @function toJSON
     * @memberof RemoteError
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    RemoteError.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return RemoteError;
})();

$root.Response = (function() {

    /**
     * Properties of a Response.
     * @exports IResponse
     * @interface IResponse
     * @property {number|null} [messageIdentifier] Response messageIdentifier
     * @property {Uint8Array|null} [payload] Response payload
     */

    /**
     * Constructs a new Response.
     * @exports Response
     * @classdesc Represents a Response.
     * @implements IResponse
     * @constructor
     * @param {IResponse=} [properties] Properties to set
     */
    function Response(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Response messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof Response
     * @instance
     */
    Response.prototype.messageIdentifier = 0;

    /**
     * Response payload.
     * @member {Uint8Array} payload
     * @memberof Response
     * @instance
     */
    Response.prototype.payload = $util.newBuffer([]);

    /**
     * Creates a new Response instance using the specified properties.
     * @function create
     * @memberof Response
     * @static
     * @param {IResponse=} [properties] Properties to set
     * @returns {Response} Response instance
     */
    Response.create = function create(properties) {
        return new Response(properties);
    };

    /**
     * Encodes the specified Response message. Does not implicitly {@link Response.verify|verify} messages.
     * @function encode
     * @memberof Response
     * @static
     * @param {IResponse} message Response message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Response.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
            writer.uint32(/* id 6, wireType 2 =*/50).bytes(message.payload);
        return writer;
    };

    /**
     * Encodes the specified Response message, length delimited. Does not implicitly {@link Response.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Response
     * @static
     * @param {IResponse} message Response message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Response.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Response message from the specified reader or buffer.
     * @function decode
     * @memberof Response
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Response} Response
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Response.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Response();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            case 6:
                message.payload = reader.bytes();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Response message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Response
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Response} Response
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Response.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Response message.
     * @function verify
     * @memberof Response
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Response.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        if (message.payload != null && message.hasOwnProperty("payload"))
            if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                return "payload: buffer expected";
        return null;
    };

    /**
     * Creates a Response message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Response
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Response} Response
     */
    Response.fromObject = function fromObject(object) {
        if (object instanceof $root.Response)
            return object;
        var message = new $root.Response();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        if (object.payload != null)
            if (typeof object.payload === "string")
                $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
            else if (object.payload.length)
                message.payload = object.payload;
        return message;
    };

    /**
     * Creates a plain object from a Response message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Response
     * @static
     * @param {Response} message Response
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Response.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.messageIdentifier = 0;
            if (options.bytes === String)
                object.payload = "";
            else {
                object.payload = [];
                if (options.bytes !== Array)
                    object.payload = $util.newBuffer(object.payload);
            }
        }
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        if (message.payload != null && message.hasOwnProperty("payload"))
            object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
        return object;
    };

    /**
     * Converts this Response to JSON.
     * @function toJSON
     * @memberof Response
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Response.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Response;
})();

$root.StreamMessage = (function() {

    /**
     * Properties of a StreamMessage.
     * @exports IStreamMessage
     * @interface IStreamMessage
     * @property {number|null} [messageIdentifier] StreamMessage messageIdentifier
     * @property {number|null} [portId] StreamMessage portId
     * @property {number|null} [sequenceId] StreamMessage sequenceId
     * @property {Uint8Array|null} [payload] StreamMessage payload
     * @property {boolean|null} [closed] StreamMessage closed
     * @property {boolean|null} [ack] StreamMessage ack
     */

    /**
     * Constructs a new StreamMessage.
     * @exports StreamMessage
     * @classdesc Represents a StreamMessage.
     * @implements IStreamMessage
     * @constructor
     * @param {IStreamMessage=} [properties] Properties to set
     */
    function StreamMessage(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * StreamMessage messageIdentifier.
     * @member {number} messageIdentifier
     * @memberof StreamMessage
     * @instance
     */
    StreamMessage.prototype.messageIdentifier = 0;

    /**
     * StreamMessage portId.
     * @member {number} portId
     * @memberof StreamMessage
     * @instance
     */
    StreamMessage.prototype.portId = 0;

    /**
     * StreamMessage sequenceId.
     * @member {number} sequenceId
     * @memberof StreamMessage
     * @instance
     */
    StreamMessage.prototype.sequenceId = 0;

    /**
     * StreamMessage payload.
     * @member {Uint8Array} payload
     * @memberof StreamMessage
     * @instance
     */
    StreamMessage.prototype.payload = $util.newBuffer([]);

    /**
     * StreamMessage closed.
     * @member {boolean} closed
     * @memberof StreamMessage
     * @instance
     */
    StreamMessage.prototype.closed = false;

    /**
     * StreamMessage ack.
     * @member {boolean} ack
     * @memberof StreamMessage
     * @instance
     */
    StreamMessage.prototype.ack = false;

    /**
     * Creates a new StreamMessage instance using the specified properties.
     * @function create
     * @memberof StreamMessage
     * @static
     * @param {IStreamMessage=} [properties] Properties to set
     * @returns {StreamMessage} StreamMessage instance
     */
    StreamMessage.create = function create(properties) {
        return new StreamMessage(properties);
    };

    /**
     * Encodes the specified StreamMessage message. Does not implicitly {@link StreamMessage.verify|verify} messages.
     * @function encode
     * @memberof StreamMessage
     * @static
     * @param {IStreamMessage} message StreamMessage message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StreamMessage.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.messageIdentifier != null && Object.hasOwnProperty.call(message, "messageIdentifier"))
            writer.uint32(/* id 1, wireType 5 =*/13).fixed32(message.messageIdentifier);
        if (message.portId != null && Object.hasOwnProperty.call(message, "portId"))
            writer.uint32(/* id 2, wireType 5 =*/21).fixed32(message.portId);
        if (message.sequenceId != null && Object.hasOwnProperty.call(message, "sequenceId"))
            writer.uint32(/* id 4, wireType 5 =*/37).fixed32(message.sequenceId);
        if (message.payload != null && Object.hasOwnProperty.call(message, "payload"))
            writer.uint32(/* id 6, wireType 2 =*/50).bytes(message.payload);
        if (message.closed != null && Object.hasOwnProperty.call(message, "closed"))
            writer.uint32(/* id 7, wireType 0 =*/56).bool(message.closed);
        if (message.ack != null && Object.hasOwnProperty.call(message, "ack"))
            writer.uint32(/* id 8, wireType 0 =*/64).bool(message.ack);
        return writer;
    };

    /**
     * Encodes the specified StreamMessage message, length delimited. Does not implicitly {@link StreamMessage.verify|verify} messages.
     * @function encodeDelimited
     * @memberof StreamMessage
     * @static
     * @param {IStreamMessage} message StreamMessage message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StreamMessage.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a StreamMessage message from the specified reader or buffer.
     * @function decode
     * @memberof StreamMessage
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {StreamMessage} StreamMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StreamMessage.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.StreamMessage();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.messageIdentifier = reader.fixed32();
                break;
            case 2:
                message.portId = reader.fixed32();
                break;
            case 4:
                message.sequenceId = reader.fixed32();
                break;
            case 6:
                message.payload = reader.bytes();
                break;
            case 7:
                message.closed = reader.bool();
                break;
            case 8:
                message.ack = reader.bool();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a StreamMessage message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof StreamMessage
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {StreamMessage} StreamMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StreamMessage.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a StreamMessage message.
     * @function verify
     * @memberof StreamMessage
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    StreamMessage.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            if (!$util.isInteger(message.messageIdentifier))
                return "messageIdentifier: integer expected";
        if (message.portId != null && message.hasOwnProperty("portId"))
            if (!$util.isInteger(message.portId))
                return "portId: integer expected";
        if (message.sequenceId != null && message.hasOwnProperty("sequenceId"))
            if (!$util.isInteger(message.sequenceId))
                return "sequenceId: integer expected";
        if (message.payload != null && message.hasOwnProperty("payload"))
            if (!(message.payload && typeof message.payload.length === "number" || $util.isString(message.payload)))
                return "payload: buffer expected";
        if (message.closed != null && message.hasOwnProperty("closed"))
            if (typeof message.closed !== "boolean")
                return "closed: boolean expected";
        if (message.ack != null && message.hasOwnProperty("ack"))
            if (typeof message.ack !== "boolean")
                return "ack: boolean expected";
        return null;
    };

    /**
     * Creates a StreamMessage message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof StreamMessage
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {StreamMessage} StreamMessage
     */
    StreamMessage.fromObject = function fromObject(object) {
        if (object instanceof $root.StreamMessage)
            return object;
        var message = new $root.StreamMessage();
        if (object.messageIdentifier != null)
            message.messageIdentifier = object.messageIdentifier >>> 0;
        if (object.portId != null)
            message.portId = object.portId >>> 0;
        if (object.sequenceId != null)
            message.sequenceId = object.sequenceId >>> 0;
        if (object.payload != null)
            if (typeof object.payload === "string")
                $util.base64.decode(object.payload, message.payload = $util.newBuffer($util.base64.length(object.payload)), 0);
            else if (object.payload.length)
                message.payload = object.payload;
        if (object.closed != null)
            message.closed = Boolean(object.closed);
        if (object.ack != null)
            message.ack = Boolean(object.ack);
        return message;
    };

    /**
     * Creates a plain object from a StreamMessage message. Also converts values to other types if specified.
     * @function toObject
     * @memberof StreamMessage
     * @static
     * @param {StreamMessage} message StreamMessage
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    StreamMessage.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.messageIdentifier = 0;
            object.portId = 0;
            object.sequenceId = 0;
            if (options.bytes === String)
                object.payload = "";
            else {
                object.payload = [];
                if (options.bytes !== Array)
                    object.payload = $util.newBuffer(object.payload);
            }
            object.closed = false;
            object.ack = false;
        }
        if (message.messageIdentifier != null && message.hasOwnProperty("messageIdentifier"))
            object.messageIdentifier = message.messageIdentifier;
        if (message.portId != null && message.hasOwnProperty("portId"))
            object.portId = message.portId;
        if (message.sequenceId != null && message.hasOwnProperty("sequenceId"))
            object.sequenceId = message.sequenceId;
        if (message.payload != null && message.hasOwnProperty("payload"))
            object.payload = options.bytes === String ? $util.base64.encode(message.payload, 0, message.payload.length) : options.bytes === Array ? Array.prototype.slice.call(message.payload) : message.payload;
        if (message.closed != null && message.hasOwnProperty("closed"))
            object.closed = message.closed;
        if (message.ack != null && message.hasOwnProperty("ack"))
            object.ack = message.ack;
        return object;
    };

    /**
     * Converts this StreamMessage to JSON.
     * @function toJSON
     * @memberof StreamMessage
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    StreamMessage.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return StreamMessage;
})();

module.exports = $root;
