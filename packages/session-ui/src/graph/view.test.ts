import { describe, expect, test } from "bun:test"
import { buildGraph, buildSessionKernel, buildWorkspaceKernel } from "./build"
import { buildFixtureSnapshot, fixtureMessages } from "./fixture"
import {
  createGraphViewCache,
  graphModelToKernel,
  graphViewMeta,
  toGraphView,
} from "./view"
import type { GraphModel, GraphNode } from "./model"

const node = (overrides: Partial<GraphNode> & Pick<GraphNode, "id" | "kind" | "label">): GraphNode => ({
  status: "neutral",
  ...overrides,
})

const model: GraphModel = {
  root: "session",
  workspaceRoot: "/repo",
  snapshot: {
    revision: "r1",
    asOf: { tree: 1 },
    missing: [],
  },
  goal: "Fix auth",
  nodes: [
    node({
      id: "session",
      kind: "session",
      label: "Session",
      summary: "Fix auth",
      status: "neutral",
      minLevel: "overview",
      data: { sessionID: "ses_1" },
    }),
    node({
      id: "turn:u1",
      kind: "turn",
      label: "Fix auth",
      status: "success",
      turnID: "turn:u1",
      messageID: "u1",
      time: 10,
      minLevel: "overview",
      clusterOf: ["tool:t1"],
    }),
    node({
      id: "tool:t1",
      kind: "tool",
      label: "read",
      summary: "read session.ts",
      status: "success",
      turnID: "turn:u1",
      messageID: "u1",
      partID: "p1",
      toolID: "t1",
      derived: true,
      data: { path: "src/auth/session.ts" },
    }),
    node({
      id: "file:src/auth/session.ts",
      kind: "file",
      label: "src/auth/session.ts",
      status: "neutral",
      data: { path: "src/auth/session.ts" },
    }),
    node({
      id: "sym:src/auth/session.ts#load",
      kind: "symbol",
      label: "load",
      status: "neutral",
      minLevel: "execution",
      domain: "code",
      provenance: { source: "tree", confidence: "explicit", asOf: 2 },
      data: { path: "src/auth/session.ts", name: "load" },
    }),
  ],
  edges: [
    { id: "part-of:turn:u1->session", kind: "part-of", source: "turn:u1", target: "session", confidence: "explicit" },
    { id: "reads:tool:t1->file:src/auth/session.ts", kind: "reads", source: "tool:t1", target: "file:src/auth/session.ts", confidence: "inferred", label: "read" },
  ],
  turns: ["turn:u1"],
  turnByMessageID: new Map([["u1", "turn:u1"]]),
  activeTurn: "turn:u1",
}

describe("GraphView projection", () => {
  test("round-trips every host node field and the model metadata", () => {
    const kernel = graphModelToKernel(model, 7)
    const view = toGraphView(kernel, graphViewMeta(model))

    expect(view).toEqual(model)
    expect(view.nodes.map((item) => item.id)).toEqual(model.nodes.map((item) => item.id))
    expect(view.turnByMessageID.get("u1")).toBe("turn:u1")
  })

  test("round-trips edge confidence and label", () => {
    const view = toGraphView(graphModelToKernel(model), graphViewMeta(model))
    const edge = view.edges.find((item) => item.id === "reads:tool:t1->file:src/auth/session.ts")

    expect(edge?.confidence).toBe("inferred")
    expect(edge?.label).toBe("read")
  })

  test("keeps host fields out of node data", () => {
    const kernel = graphModelToKernel(model)
    const view = toGraphView(kernel, graphViewMeta(model))
    const session = view.nodes.find((item) => item.id === "session")

    expect(session?.data).toEqual({ sessionID: "ses_1" })
    expect(session?.data && "$host" in session.data).toBe(false)
  })

  test("produces a valid kernel", () => {
    expect(graphModelToKernel(model).diagnostics()).toEqual({
      danglingEdges: [],
      duplicateNodes: [],
      duplicateEdges: [],
      hyperedgeMissingNodes: [],
    })
  })

  test("memoizes the view by kernel version and identity", () => {
    const cache = createGraphViewCache()
    const kernel = graphModelToKernel(model, 1)
    const meta = graphViewMeta(model)

    expect(cache(kernel, meta)).toBe(cache(kernel, meta))
    expect(cache(graphModelToKernel(model, 2), meta)).not.toBe(cache(kernel, meta))
  })

  test("buildSessionKernel emits a valid kernel", () => {
    const kernel = buildSessionKernel({ messages: fixtureMessages, status: { type: "idle" } })

    expect(kernel.nodes[0]?.id).toBe("session")
    expect(kernel.diagnostics()).toEqual({
      danglingEdges: [],
      duplicateNodes: [],
      duplicateEdges: [],
      hyperedgeMissingNodes: [],
    })
  })

  test("buildSessionKernel stays session-only and the workspace deriver adds domains", () => {
    const snapshot = buildFixtureSnapshot()
    const session = buildSessionKernel({
      messages: fixtureMessages,
      status: { type: "idle" },
      snapshot,
    })
    const workspace = buildWorkspaceKernel(session, snapshot)

    expect(session.nodes.some((item) => item.kind === "directory")).toBe(false)
    expect(workspace.nodes.some((item) => item.kind === "directory")).toBe(true)
    expect(workspace.version).toBe(session.version + 1)
  })

  test("buildGraph accepts a kernel and its metadata", () => {
    const view = buildGraph({ messages: fixtureMessages, status: { type: "idle" } })
    const projected = buildGraph({ kernel: graphModelToKernel(view), meta: graphViewMeta(view) })

    expect(projected).toEqual(view)
  })
})
