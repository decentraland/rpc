import { loadService } from "../src/codegen"
import { RpcClientPort } from "../src/types"
import { BookServiceDefinition } from "./api"

// this function loads the remote BookService using the specified port
// this is the function that will be most likely used in clients to consume
// remote APIs
export const createBookServiceClient = <Context>(clientPort: RpcClientPort) => loadService<Context, BookServiceDefinition>(clientPort, BookServiceDefinition)
