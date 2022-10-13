import { generateProtoFile } from "./print-proto-dsl"
import { field, protoDsl } from "./proto-dsl"
import { writeFileSync } from "fs"

const proto = protoDsl()
/////////////////////////////////////////////////////////////
/////////////////////// Wire protocol ///////////////////////
/////////////////////////////////////////////////////////////

// every message implements this header
proto.addMessage("RpcMessageHeader", [
  // message_identifier packs two numbers the
  //   bits 32..28 correspond to the message_type
  //   bits 28..1  correspond to the secuential message number, analogous to JSON-RPC 2
  field("fixed32", "message_identifier", 1, false),
])

const PORT_ID = field("fixed32", "port_id", 2)
const PAYLOAD = field("bytes", "payload", 6)

proto.addEnum("RpcMessageTypes", {
  EMPTY: 0,

  REQUEST: 1,
  RESPONSE: 2,
  STREAM_MESSAGE: 3,
  STREAM_ACK: 4,
  CREATE_PORT: 5,
  CREATE_PORT_RESPONSE: 6,
  REQUEST_MODULE: 7,
  REQUEST_MODULE_RESPONSE: 8,
  REMOTE_ERROR_RESPONSE: 9,
  DESTROY_PORT: 10,

  SERVER_READY: 11
})

/////////////////////////////////////////////////////////////
/////////////////////// Port loading ////////////////////////
/////////////////////////////////////////////////////////////

/**
 * @direction   Client->Server
 * @response    CreatePortResponse
 * @description Signals the RPC server that a port is created locally.
 */
proto.addMessage("CreatePort", [field("string", "port_name", 4)], ["RpcMessageHeader"])

/**
 * @direction   Server->Client
 * @idempotent
 * @description response of CreatePort. Signals the client the number of
 *              port assigned to the requested parameters.
 */
proto.addMessage("CreatePortResponse", [PORT_ID], ["RpcMessageHeader"])

/////////////////////////////////////////////////////////////
////////////////////// Module loading ///////////////////////
/////////////////////////////////////////////////////////////

/**
 * @description Requests a module to the server, by name.
 * @idempotent
 * @direction   Client->Server
 */
proto.addMessage("RequestModule", [PORT_ID, field("string", "module_name", 4)], ["RpcMessageHeader"])

/**
 * @description Responds to the specified port, the number of module
 *              assigned to the requested name.
 * @direction   Server->Server
 * @responseOf  RequestModule
 */
proto.addMessage(
  "RequestModuleResponse",
  [PORT_ID, field("ModuleProcedure", "procedures", 5, true)],
  ["RpcMessageHeader"]
)

/**
 * @description Used to signal the server that a specific port is closed.
 * @direction   Client->Server
 */
proto.addMessage("DestroyPort", [PORT_ID], ["RpcMessageHeader"])

/**
 * @description Describes a module procedure. In the future this struct
 *              may include reflection data.
 */
proto.addMessage("ModuleProcedure", [
  field("fixed32", "procedure_id", 1),
  field("string", "procedure_name", 2),
  // we can possibly define some parameter information.
  // It is not really necessary now.
])

/////////////////////////////////////////////////////////////
//////////////////////////// RPC ////////////////////////////
/////////////////////////////////////////////////////////////

/**
 * @description Request sent to a specific procedure_id.
 * @direction   Client->Server
 */
proto.addMessage(
  "Request",
  [
    PORT_ID,
    field("fixed32", "procedure_id", 4), // id of the procedure to be called
    field("fixed32", "client_stream", 5),
    PAYLOAD, // payload of the request (this protocol doesn't care about the content)
  ],
  ["RpcMessageHeader"]
)

/**
 * @description Signals the client about an error during the request
 *              execution or malformed input.
 * @direction   Server->Client
 */
proto.addMessage(
  "RemoteError",
  [field("fixed32", "error_code", 2), field("string", "error_message", 3)],
  ["RpcMessageHeader"]
)

/**
 * @description Successful response including unary payload.
 * @responseOf  Request
 * @direction   Server->Client
 */
proto.addMessage(
  "Response",
  [
    PAYLOAD, // the payload in case of a successful result
  ],
  ["RpcMessageHeader"]
)

/**
 * @description StreamMessage are all the elements of a stream call.
 *              The intended use case is to generate subscriptions and
 *              event listeners from the client side. It is designed
 *              with async iterators in mind (think about js sagas).
 * @direction   Server->Client/Client->Server
 */
 proto.addMessage(
  "StreamMessage",
  [
    PORT_ID,
    field("fixed32", "sequence_id", 4), // sequence id of the StreamMessage, starting at 0
    PAYLOAD, // Server->Client the payload in case of a successful result
    field("bool", "closed", 7), // Server->Client/Client->Server an empty message signaling the end of the stream
    field("bool", "ack", 8), // Client->Server used for backpressure
  ],
  ["RpcMessageHeader"]
)

writeFileSync("src/protocol/index.proto", generateProtoFile(proto.validate()))
