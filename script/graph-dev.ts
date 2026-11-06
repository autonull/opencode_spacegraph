#!/usr/bin/env bun
// graph:dev — Provider-free graph demo
// Starts a mock server with NO_PROVIDER and the canonical fixture,
// then launches the Vite dev server serving the graph-dev entry.
// This is a dev-only command; the entry is guarded by VITE_OPENCODE_GRAPH_DEV=1.

import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { parse } from "node:url"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { buildFixtureMessages } from "../packages/session-ui/src/graph"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const APP_DIR = join(ROOT, "packages/app")

// The canonical fixture messages (same as e2e tests)
const FIXTURE_MESSAGES = buildFixtureMessages()
const SESSION_ID = "ses_session_graph"
const SESSION_DIR = "/tmp/opencode/graph-demo"
const PROJECT_ID = "proj_sessiongraph"

const SESSION_INFO = {
  id: SESSION_ID,
  projectID: PROJECT_ID,
  title: "Session graph",
  cost: 0,
  tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  time: { created: 1700000000000, updated: 1700000000000 },
  location: { directory: SESSION_DIR },
}

// Simple in-memory mock server
const mockServer = createServer(async (req, res) => {
  const url = parse(req.url!, true)

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "*")
  res.setHeader("Access-Control-Expose-Headers", "x-next-cursor")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    return res.end()
  }

  const pathname = url.pathname

  try {
    // Provider catalog — the demo has no provider, so the app's catalog stays empty. The shape is
    // the current one: the app builds its provider map from `data`, and an empty list is a valid
    // provider-free session.
    if (pathname === "/api/provider") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { directory: SESSION_DIR }, data: [] }))
    }

    // Model catalog — empty, for the same reason.
    if (pathname === "/api/model") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { directory: SESSION_DIR }, data: [] }))
    }

    // Location — the project the demo session belongs to.
    if (pathname === "/api/location" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(
        JSON.stringify({
          directory: SESSION_DIR,
          project: { id: PROJECT_ID, directory: SESSION_DIR, canonical: SESSION_DIR },
        }),
      )
    }

    // Session list
    if (pathname === "/api/session" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ data: [SESSION_INFO], cursor: {} }))
    }

    // Session get
    if (pathname === `/api/session/${SESSION_ID}` && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify(SESSION_INFO))
    }

    // Session messages — the canonical fixture. The current protocol serves them newest-first.
    if (pathname === `/api/session/${SESSION_ID}/message` && req.method === "GET") {
      const limit = Number(url.query.limit ?? 100)
      const order = url.query.order === "asc" ? "asc" : "desc"
      const items = order === "asc" ? FIXTURE_MESSAGES : [...FIXTURE_MESSAGES].reverse()

      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ data: items.slice(0, limit), cursor: {} }))
    }

    // Shells — the demo runs no commands.
    if (pathname === "/api/shell" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { directory: SESSION_DIR }, data: [] }))
    }

    // MCP resources — none.
    if (pathname === "/api/mcp/resource" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { directory: SESSION_DIR }, data: [] }))
    }

    // Worktree refresh — nothing to refresh.
    if (pathname === "/api/worktree/refresh" && req.method === "POST") {
      res.writeHead(204)
      return res.end()
    }

    // Session inbox (empty)
    if (pathname === `/api/session/${SESSION_ID}/inbox` && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ data: [] }))
    }

    // Session permissions (empty)
    if (pathname === `/api/session/${SESSION_ID}/permission` && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: [] }))
    }

    // Session form (empty)
    if (pathname === `/api/session/${SESSION_ID}/form` && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ data: [] }))
    }

    // Session status
    if (pathname === "/api/session/active" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ data: { [SESSION_ID]: { type: "idle" } } }))
    }

    // Project list
    if (pathname === "/api/project" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify([{
        id: PROJECT_ID,
        canonical: SESSION_DIR,
        name: "SessionGraph",
        vcs: "git",
        time: { created: 1700000000000, updated: 1700000000000, active: 1700000000000 },
        sandboxes: [],
      }]))
    }

    // Worktree list
    if (pathname === "/api/worktree" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify([{ directory: SESSION_DIR }]))
    }

    // VCS
    if (pathname === "/api/vcs" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: { branch: { current: "main", default: "main" } } }))
    }

    // Config
    if (pathname === "/api/config" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify([]))
    }

    // Config shells
    if (pathname === "/api/config/shell" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify([]))
    }

    // Commands
    if (pathname === "/api/command" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: [] }))
    }

    // Skills
    if (pathname === "/api/skill" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: [] }))
    }

    // Plugins
    if (pathname === "/api/plugin" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: [] }))
    }

    // Integrations
    if (pathname === "/api/integration" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: [] }))
    }

    // MCP
    if (pathname === "/api/mcp" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: [] }))
    }

    // Websearch providers
    if (pathname === "/api/websearch" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: [] }))
    }

    // Info
    if (pathname === "/api/info" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ version: "2.0.0", pid: 1, urls: ["http://localhost:4096"], paths: { tmp: "/tmp/opencode" } }))
    }

    // Agent
    if (pathname === "/api/agent" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({
        location: { type: "http", url: "http://localhost:4096" },
        data: [{ id: "build", name: "Build", mode: "primary", hidden: false, request: { settings: {}, headers: {}, body: {} }, permissions: [] }]
      }))
    }

    // Reference
    if (pathname === "/api/reference" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: [] }))
    }

    // Forms
    if (pathname === "/api/form" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ location: { type: "http", url: "http://localhost:4096" }, data: [] }))
    }

    // Server connected event (SSE)
    if (pathname === "/api/event" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      })
      res.write("data: " + JSON.stringify({ id: "evt_mock_connected", type: "server.connected", data: {} }) + "\n\n")
      // Keep connection open
      req.on("close", () => res.end())
      return
    }

    // Default: proxy to Vite dev server or serve static
    // For the dev server, we just return 404 for unhandled API routes
    console.log(`[graph:dev] no mock route for ${req.method} ${pathname}`)
    res.writeHead(404, { "Content-Type": "application/json" })
    return res.end(JSON.stringify({ name: "NotFound", message: `No mock route for ${req.method} ${pathname}` }))
  } catch (e) {
    console.error("Mock server error:", e)
    res.writeHead(500, { "Content-Type": "application/json" })
    return res.end(JSON.stringify({ name: "InternalError", message: String(e) }))
  }
})

const MOCK_PORT = 4097

async function main() {
  // Start mock server
  await new Promise<void>((resolve) => {
    mockServer.listen(MOCK_PORT, () => {
      console.log(`[graph:dev] Mock server listening on http://localhost:${MOCK_PORT}`)
      resolve()
    })
  })

  // Start Vite dev server with graph-dev entry
  process.chdir(APP_DIR)
  const env = {
    ...process.env,
    VITE_OPENCODE_GRAPH_DEV: "1",
    // The app derives its server URL from these two variables in dev; without them it talks to the
    // real backend on 4096, which answers 401 for an unauthenticated demo session.
    VITE_OPENCODE_SERVER_HOST: "127.0.0.1",
    VITE_OPENCODE_SERVER_PORT: String(MOCK_PORT),
    PLAYWRIGHT_SERVER_HOST: "127.0.0.1",
    PLAYWRIGHT_SERVER_PORT: String(MOCK_PORT),
    PLAYWRIGHT_PORT: "3000",
    PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
  }

  console.log("[graph:dev] Starting Vite dev server on http://localhost:3000")
  console.log("[graph:dev] Press Ctrl+C to stop")

  // The mock server shares this process, so Vite must run asynchronously: a blocking spawn would
  // stop the event loop and the mock would never answer the app it serves.
  const vite = spawn("bun", ["run", "dev"], {
    cwd: APP_DIR,
    env,
    stdio: "inherit",
  })

  const stop = (code: number) => {
    mockServer.close()
    process.exit(code)
  }

  vite.on("exit", (code) => stop(code ?? 0))
  process.on("SIGINT", () => {
    vite.kill("SIGINT")
    stop(0)
  })
}

main().catch((e) => {
  console.error(e)
  mockServer.close()
  process.exit(1)
})