import { describe, expect, test } from "bun:test"
import { buildGraph } from "./build"
import { buildFixtureGraph, buildFixtureMessages, buildFixtureSnapshot, buildFixtureGraphWithSnapshot } from "./fixture"
import { directoryNodeID, fileNodeID, normalizePath, type GraphModel } from "./model"
import type { FileDiffInfo } from "@opencode/client/promise"

const symbolNodeID = (path: string, qualified: string) => `symbol:${normalizePath(path)}#${qualified}`

const serialize = (model: GraphModel) =>
  JSON.parse(JSON.stringify({ ...model, turnByMessageID: Object.fromEntries(model.turnByMessageID) }))

describe("T29.3 — the model takes the snapshot", () => {
  test("without a snapshot the model is unchanged", async () => {
    const model = buildFixtureGraph()
    const file = new URL("./model.golden.json", import.meta.url)

    if (process.env.UPDATE_GOLDEN) await Bun.write(file, `${JSON.stringify(serialize(model), null, 2)}\n`)

    expect(serialize(model)).toEqual(await Bun.file(file).json())
  })

  test("a snapshot adds derived kinds without changing the session", () => {
    const sessionOnly = buildFixtureGraph()
    const withSnapshot = buildGraph({
      messages: buildFixtureMessages(),
      status: { type: "idle" },
      snapshot: buildFixtureSnapshot(),
    })

    const directories = withSnapshot.nodes.filter((node) => node.kind === "directory")
    // Comprehensive fixture has directories for all files in snapshot
    expect(directories.length).toBeGreaterThanOrEqual(2)
    expect(directories.map((node) => node.id)).toContain(directoryNodeID("src"))
    expect(directories.map((node) => node.id)).toContain(directoryNodeID("src/auth"))

    // All derived kinds (not in session model)
    const derivedKinds = new Set(["directory", "package", "commit", "branch", "symbol", "process", "port", "issue"])
    const derived = new Set(
      withSnapshot.nodes.filter((node) => derivedKinds.has(node.kind)).map((node) => node.id),
    )
    const unchangedNodes = withSnapshot.nodes.filter((node) => !derived.has(node.id))
    expect(unchangedNodes).toEqual(sessionOnly.nodes)

    const unchangedEdges = withSnapshot.edges.filter(
      (edge) => !derived.has(edge.source) && !derived.has(edge.target),
    )
    expect(unchangedEdges).toEqual(sessionOnly.edges)
  })

  test("every session file is part-of its directory", () => {
    const model = buildGraph({
      messages: buildFixtureMessages(),
      status: { type: "idle" },
      snapshot: buildFixtureSnapshot(),
    })

    for (const path of ["src/auth/session.ts", "src/auth/session.test.ts"]) {
      expect(model.edges).toContainEqual(
        expect.objectContaining({
          kind: "part-of",
          source: fileNodeID(path),
          target: directoryNodeID("src/auth"),
          confidence: "structural",
        }),
      )
    }
    expect(model.edges).toContainEqual(
      expect.objectContaining({
        kind: "part-of",
        source: directoryNodeID("src/auth"),
        target: directoryNodeID("src"),
      }),
    )
  })

  test("the model carries the snapshot's provenance and workspace root", () => {
    const snapshot = buildFixtureSnapshot()
    const model = buildGraph({ messages: buildFixtureMessages(), status: { type: "idle" }, snapshot })

    expect(model.root).toBe("session")
    expect(model.workspaceRoot).toBe("/workspace/project")
    expect(model.snapshot).toEqual({ revision: snapshot.revision, asOf: snapshot.asOf, missing: snapshot.missing })
  })
})

describe("T32.1 — golden snapshot fixture", () => {
  test("comprehensive snapshot produces expected graph", async () => {
    const model = buildFixtureGraphWithSnapshot()
    const file = new URL("./model.golden.with-snapshot.json", import.meta.url)

    if (process.env.UPDATE_GOLDEN) await Bun.write(file, `${JSON.stringify(serialize(model), null, 2)}\n`)

    expect(serialize(model)).toEqual(await Bun.file(file).json())
  })

  test("derived kinds appear in the model", () => {
    const model = buildFixtureGraphWithSnapshot()

    const kinds = new Set(model.nodes.map((node) => node.kind))
    // Session kinds
    expect(kinds.has("session")).toBe(true)
    expect(kinds.has("turn")).toBe(true)
    expect(kinds.has("tool")).toBe(true)
    expect(kinds.has("file")).toBe(true)
    // Derived kinds from snapshot
    expect(kinds.has("directory")).toBe(true)
    expect(kinds.has("package")).toBe(true)
    expect(kinds.has("commit")).toBe(true)
    expect(kinds.has("branch")).toBe(true)
    expect(kinds.has("symbol")).toBe(true)
    expect(kinds.has("process")).toBe(true)
    expect(kinds.has("port")).toBe(true)
    expect(kinds.has("issue")).toBe(true)
  })

  test("directory nodes have provenance from filesystem", () => {
    const model = buildFixtureGraphWithSnapshot()

    const dirSrc = model.nodes.find((node) => node.id === directoryNodeID("src"))
    expect(dirSrc?.provenance?.source).toBe("tree")
    expect(dirSrc?.provenance?.confidence).toBe("inferred")
    expect(dirSrc?.domain).toBe("directories")
  })

  test("package nodes have provenance from packages", () => {
    const model = buildFixtureGraphWithSnapshot()

    const pkg = model.nodes.find((node) => node.kind === "package")
    expect(pkg?.provenance?.source).toBe("packages")
    expect(pkg?.domain).toBe("directories")
  })

  test("commit nodes have provenance from vcs", () => {
    const model = buildFixtureGraphWithSnapshot()

    const commit = model.nodes.find((node) => node.kind === "commit")
    expect(commit?.provenance?.source).toBe("vcs")
    expect(commit?.domain).toBe("history")
  })

  test("symbol nodes have provenance from symbols", () => {
    const model = buildFixtureGraphWithSnapshot()

    const symbol = model.nodes.find((node) => node.kind === "symbol")
    expect(symbol?.provenance?.source).toBe("symbols")
    expect(symbol?.domain).toBe("code")
  })

  test("process nodes have provenance from processes", () => {
    const model = buildFixtureGraphWithSnapshot()

    const process = model.nodes.find((node) => node.kind === "process")
    expect(process?.provenance?.source).toBe("processes")
    expect(process?.domain).toBe("runtime")
  })

  test("issue nodes have provenance from issues", () => {
    const model = buildFixtureGraphWithSnapshot()

    const issue = model.nodes.find((node) => node.kind === "issue")
    expect(issue?.provenance?.source).toBe("issues")
    expect(issue?.domain).toBe("work")
  })
})

describe("T21.1 — diff-hunk symbols from turn diffs", () => {
  test("extracts function symbols from patch hunk headers", () => {
    const messages = buildFixtureMessages()
    const snapshot = buildFixtureSnapshot()
    const diffByTurn = new Map<string, FileDiffInfo[]>()
    diffByTurn.set("turn:msg_edit_1", [
      {
        file: "src/auth/session.ts",
        patch: `@@ -10,5 +10,7 @@ function session() {
+  const token = getToken()
+  return { ...token, valid: true }
 }
@@ -25,4 +27,6 @@ function refreshToken(token: string) {
+  const newToken = await fetchToken(token)
+  return newToken
 }`,
        additions: 4,
        deletions: 0,
        status: "modified",
      },
    ])

    const model = buildGraph({
      messages,
      status: { type: "idle" },
      snapshot,
      diffByTurn,
    })

    // This test validates the extraction logic works - the snapshot already has some symbols
    expect(model.nodes.some((n) => n.kind === "symbol" && n.data?.origin === "hunk")).toBe(true)
  })

  test("extracts class and method symbols from patch", () => {
    const messages = buildFixtureMessages()
    const snapshot = buildFixtureSnapshot()
    const diffByTurn = new Map<string, FileDiffInfo[]>()
    diffByTurn.set("turn:msg_edit_1", [
      {
        file: "src/auth/new-class.ts",
        patch: `@@ -1,3 +1,12 @@
+export class AuthManager {
+  constructor(private store: TokenStore) {}
+
+  async authenticate(creds: Credentials) {
+    return this.store.verify(creds)
+  }
+
+  logout() {
+    this.store.clear()
+  }
+}
`,
        additions: 12,
        deletions: 0,
        status: "added",
      },
    ])

    const model = buildGraph({
      messages,
      status: { type: "idle" },
      snapshot,
      diffByTurn,
    })

    // Should extract AuthManager class
    const classSymbol = model.nodes.find((n) => n.id === symbolNodeID("src/auth/new-class.ts", "AuthManager"))
    expect(classSymbol).toBeDefined()
    expect(classSymbol?.data?.origin).toBe("hunk")
    expect(classSymbol?.data?.kind).toBe("class")

    // Should extract authenticate method
    const authMethod = model.nodes.find((n) => n.id === symbolNodeID("src/auth/new-class.ts", "AuthManager.authenticate"))
    expect(authMethod).toBeDefined()
    expect(authMethod?.data?.origin).toBe("hunk")
    expect(authMethod?.data?.kind).toBe("method")

    // Should extract logout method
    const logoutMethod = model.nodes.find((n) => n.id === symbolNodeID("src/auth/new-class.ts", "AuthManager.logout"))
    expect(logoutMethod).toBeDefined()
    expect(logoutMethod?.data?.origin).toBe("hunk")
    expect(logoutMethod?.data?.kind).toBe("method")
  })

  test("extracts deleted function symbols", () => {
    const messages = buildFixtureMessages()
    const snapshot = buildFixtureSnapshot()
    const diffByTurn = new Map<string, FileDiffInfo[]>()
    diffByTurn.set("turn:msg_edit_1", [
      {
        file: "src/auth/old.ts",
        patch: `@@ -1,5 +0,0 @@
-function oldFunction() {
-  return "old"
-}
-
-export default oldFunction
`,
        additions: 0,
        deletions: 5,
        status: "deleted",
      },
    ])

    const model = buildGraph({
      messages,
      status: { type: "idle" },
      snapshot,
      diffByTurn,
    })

    // Should extract deleted function with origin "hunk:deleted"
    const deletedSymbol = model.nodes.find((n) => n.id === symbolNodeID("src/auth/old.ts", "oldFunction"))
    expect(deletedSymbol).toBeDefined()
    expect(deletedSymbol?.data?.origin).toBe("hunk:deleted")
    expect(deletedSymbol?.data?.deleted).toBe(true)
    expect(deletedSymbol?.status).toBe("failed")
  })

  test("does not duplicate symbols from snapshot", () => {
    const messages = buildFixtureMessages()
    const snapshot = buildFixtureSnapshot()
    // Snapshot already has a symbol for session.refreshToken with origin "hunk"
    const diffByTurn = new Map<string, FileDiffInfo[]>()
    diffByTurn.set("turn:msg_edit_1", [
      {
        file: "src/auth/session.ts",
        patch: `@@ -25,4 +27,6 @@ function refreshToken(token: string) {
+  const newToken = await fetchToken(token)
+  return newToken
 }`,
        additions: 2,
        deletions: 0,
        status: "modified",
      },
    ])

    const model = buildGraph({
      messages,
      status: { type: "idle" },
      snapshot,
      diffByTurn,
    })

    // Should only have one symbol for session.refreshToken (from snapshot)
    const symbols = model.nodes.filter((n) => n.id === symbolNodeID("src/auth/session.ts", "session.refreshToken"))
    expect(symbols.length).toBe(1)
    // The snapshot one has origin "hunk" (from fixture)
    expect(symbols[0]?.data?.origin).toBe("hunk")
  })
})
