import { OpenCode, type OpenCodeClient } from "@opencode/client/promise"
import type { ServerConnection } from "@/runtime/server/registry"
import { decode64 } from "@/runtime/persistence/base64"
import type { ServerGraphWorkspaceInput, WorkspaceSnapshot } from "@opencode/client/promise"

export function authTokenFromCredentials(input: { password: string }) {
  return btoa(`opencode:${input.password}`)
}

export function authFromToken(token: string | null) {
  const decoded = decode64(token ?? undefined)

  if (!decoded) return
  const separator = decoded.indexOf(":")

  if (separator === -1) return

  return {
    password: decoded.slice(separator + 1),
  }
}

// Extended server API with graph workspace endpoint
export interface ServerGraphApi {
  workspace: (input?: ServerGraphWorkspaceInput) => Promise<WorkspaceSnapshot>
}

// The base server object from the generated client
type BaseServer = {
  info: (requestOptions?: OpenCode.RequestOptions) => Promise<any>
  pair: (requestOptions?: OpenCode.RequestOptions) => Promise<any>
  connect: (input: any, requestOptions?: OpenCode.RequestOptions) => Promise<any>
}

// Extended server object with graph
export interface ExtendedServer extends BaseServer {
  graph: ServerGraphApi
}

// Extended client API
export interface ServerApi extends OpenCodeClient {
  server: ExtendedServer
}

export function createApiForServer(input: {
  server: ServerConnection.HttpBase
  fetch?: typeof globalThis.fetch
}): ServerApi {
  const raw = OpenCode.make({
    baseUrl: input.server.url,
    fetch: input.fetch,
    headers: input.server.password
      ? {
          Authorization: `Basic ${authTokenFromCredentials({
            password: input.server.password,
          })}`,
        }
      : undefined,
  })

  // Add the graph workspace endpoint to the server object
  const graphWorkspace = async (input?: ServerGraphWorkspaceInput): Promise<WorkspaceSnapshot> => {
    const result = await raw["server.graph"].workspace(input)
    return result.data
  }

  return {
    ...raw,
    server: {
      ...raw.server,
      graph: {
        workspace: graphWorkspace,
      },
    },
  } as ServerApi
}
