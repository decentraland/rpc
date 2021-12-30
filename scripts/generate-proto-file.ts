import { generateProtoFile } from "./print-proto-dsl"
import { field, protoDsl } from "./proto-dsl"
import { writeFileSync } from "fs"

const proto = protoDsl()
/////////////////////////////////////////////////////////////
/////////////////////// Wire protocol ///////////////////////
/////////////////////////////////////////////////////////////

// every message implements this header
proto.addMessage("RpcMessageHeader", [
  field("int32", "message_type", 1), // (RpcMessageTypes) message_type is always the first element
  field("int32", "message_id", 2), // message_id is always the second element
])

const PORT_ID = field("int32", "port_id", 3)
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

  SERVER_READY: 100,
})

/////////////////////////////////////////////////////////////
/////////////////////// Port loading ////////////////////////
/////////////////////////////////////////////////////////////

// Client->Server
proto.addMessage("CreatePort", [field("string", "port_name", 3)], ["RpcMessageHeader"])

// Server->Client
proto.addMessage("CreatePortResponse", [PORT_ID], ["RpcMessageHeader"])

// Client->Server
// proto.addMessage("ClosePort", [PORT_ID], ["RpcMessageHeader"])

/////////////////////////////////////////////////////////////
////////////////////// Module loading ///////////////////////
/////////////////////////////////////////////////////////////

// Client->Server
proto.addMessage("RequestModule", [PORT_ID, field("string", "module_name", 4)], ["RpcMessageHeader"])

// Server->Client
proto.addMessage(
  "RequestModuleResponse",
  [PORT_ID, field("ModuleProcedure", "procedures", 5, true)],
  ["RpcMessageHeader"]
)

proto.addMessage("ModuleProcedure", [
  field("int32", "procedure_id", 1),
  field("string", "procedure_name", 2),
  // we can possibly define some parameter information.
  // It is not really necessary now.
])

/////////////////////////////////////////////////////////////
//////////////////////////// RPC ////////////////////////////
/////////////////////////////////////////////////////////////

// Client->Server
proto.addMessage(
  "Request",
  [
    PORT_ID,
    field("int32", "procedure_id", 4), // id of the procedure to be called
    PAYLOAD, // payload of the request (this protocol doesn't care about the content)
  ],
  ["RpcMessageHeader"]
)

// Server->Client
proto.addMessage(
  "RemoteError",
  [field("int32", "error_code", 3), field("string", "error_message", 4)],
  ["RpcMessageHeader"]
)

// Server->Client
proto.addMessage(
  "Response",
  [
    PAYLOAD, // the payload in case of a successful result
  ],
  ["RpcMessageHeader"]
)

// StreamMessage are all the elements of a stream call. The intended use case
// is to generate subscriptions and event listeners from the client side. It is
// designed with async iterators in mind (think about js sagas).
// Server->Client/Client->Server
proto.addMessage(
  "StreamMessage",
  [
    PORT_ID,
    field("int32", "sequence_id", 4), // sequence id of the StreamMessage, starting at 0

    PAYLOAD, // Server->Client the payload in case of a successful result
    field("bool", "closed", 7), // Server->Client/Client->Server an empty message signaling the end of the stream
    field("bool", "ack", 8), // Client->Server used for backpressure
  ],
  ["RpcMessageHeader"]
)

writeFileSync("src/protocol/index.proto", generateProtoFile(proto.validate()))
