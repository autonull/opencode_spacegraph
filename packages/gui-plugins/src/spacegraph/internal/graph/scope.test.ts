import { describe, expect, test } from "bun:test"
import { buildGraph } from "./build"
import { buildFixtureGraph, buildFixtureMessages, buildFixtureSnapshot } from "./fixture"
import { directoryNodeID, type GraphViewData, type GraphNode } from "./model"
import { scopeModel } from "./view"
import type { Domain } from "./vocabulary"

const allDomains: Domain[] = ["session", "directories", "history", "code", "verification", "runtime", "work"]

const snapshotModel = () =>
  buildGraph({
    messages: buildFixtureMessages(),
    status: { type: "idle" },
    snapshot: buildFixtureSnapshot(),
  })

describe("T30.2 — scopeModel", () => {
  test("a session-only lens equals today's model", () => {
    const model = buildFixtureGraph()

    expect(scopeModel(model, new Set(["session"]))).toEqual(model)
  })

  test("session is enforced even when the caller omits it", () => {
    const model = buildFixtureGraph()
    const scoped = scopeModel(model, new Set())

    expect(scoped.nodes).toEqual(model.nodes)
    expect(scoped.edges).toEqual(model.edges)
  })

  test("directories joins the session without dropping session work", () => {
    const model = snapshotModel()
    const scoped = scopeModel(model, new Set(["directories"]))

    // At minimum the touched directories should be present
    expect(scoped.nodes.filter((node) => node.kind === "directory").map((node) => node.id)).toContain(directoryNodeID("src"))
    expect(scoped.nodes.filter((node) => node.kind === "directory").map((node) => node.id)).toContain(directoryNodeID("src/auth"))
    expect(scoped.nodes.filter((node) => node.kind === "file")).toEqual(
      model.nodes.filter((node) => node.kind === "file"),
    )
  })

  test("dropping a domain never leaves a dangling edge", () => {
    const model: GraphViewData = {
      root: "session",
      nodes: [
        { id: "session", kind: "session", label: "Session", status: "neutral" },
        { id: "file:a.ts", kind: "file", label: "a.ts", status: "neutral", data: { path: "a.ts" } },
        { id: "dir:src", kind: "directory", label: "src", status: "neutral", data: { path: "src" } },
        { id: "commit:abc", kind: "file", label: "abc", status: "neutral", domain: "history" },
      ],
      edges: [
        { id: "part-of:file:a.ts->dir:src", kind: "part-of", source: "file:a.ts", target: "dir:src", confidence: "structural" },
        { id: "touches:commit:abc->file:a.ts", kind: "references", source: "commit:abc", target: "file:a.ts", confidence: "explicit" },
      ],
      turns: [],
      turnByMessageID: new Map(),
    }

    const scoped = scopeModel(model, new Set(["directories"]))
    const ids = new Set(scoped.nodes.map((node) => node.id))

    expect(ids.has("commit:abc")).toBe(false)
    expect(scoped.edges).toHaveLength(1)
    expect(scoped.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target))).toBe(true)
  })

  test("a node's explicit domain overrides its kind", () => {
    const node: GraphNode = {
      id: "file:untouched.ts",
      kind: "file",
      label: "untouched.ts",
      status: "neutral",
      domain: "directories",
    }

    const model: GraphViewData = {
      root: "session",
      nodes: [node],
      edges: [],
      turns: [],
      turnByMessageID: new Map(),
    }

    expect(scopeModel(model, new Set(["directories"])).nodes).toEqual([node])
    expect(scopeModel(model, new Set([...allDomains.filter((domain) => domain !== "directories")])).nodes).toEqual([])
  })
})
