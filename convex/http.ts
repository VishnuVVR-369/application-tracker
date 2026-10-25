import { httpRouter } from "convex/server"

import { authComponent, createAuth } from "./betterAuth/auth"
import { handle as mcp } from "./mcp"

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

// The MCP endpoint for the Job Scout. Only POST is served; other methods get 405, as a stateless server may.
for (const method of ["POST", "GET", "DELETE"] as const) {
  http.route({ path: "/mcp", method, handler: mcp })
}

export default http
