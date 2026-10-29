import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import { type GraphViewData } from "./model"
import { scopeModel } from "./view"

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

  test("dropping a domain never leaves a dangling edge", () => {
    const model: GraphViewData = {
      root: "session",
      nodes: [
        { id: "session", kind: "session", label: "Session", status: "neutral" },
        { id: "dir:src", kind: "directory", label: "src", status: "neutral", data: { path: "src" } },
        { id: "commit:abc", kind: "commit", label: "abc", status: "neutral" },
      ],
      edges: [
        { id: "touches:commit:abc->dir:src", kind: "touches", source: "commit:abc", target: "dir:src", confidence: "explicit" },
      ],
      turns: [],
      turnByMessageID: new Map(),
    }

    const scoped = scopeModel(model, new Set(["directories"]))
    const ids = new Set(scoped.nodes.map((node) => node.id))

    expect(ids.has("dir:src")).toBe(true)
    expect(ids.has("commit:abc")).toBe(false)
    expect(scoped.edges).toHaveLength(0)
  })
})
