import { expect, test } from "bun:test"
import { buildFixtureGraph, layoutGraph, type GraphModel, type ZoomLevel } from "@opencode/session-ui/graph"
import { buildRenderModel } from "./buildRenderModel"

const model = buildFixtureGraph()
const positions = layoutGraph(model).positions

const at = (level: ZoomLevel, extra: { cardBudget?: number } = {}) =>
  buildRenderModel(model, { level, positions, ...extra })

const kindsAt = (level: ZoomLevel) => new Set(at(level).nodes.map((node) => node.kind))

test("overview shows only session, turns, phase clusters, and subagents", () => {
  const kinds = kindsAt("overview")

  expect([...kinds].sort()).toEqual(["message", "phase", "session", "subagent", "turn"])

  const phases = at("overview").nodes.filter((node) => node.kind === "phase")

  expect(phases.length).toBeGreaterThan(0)

  for (const phase of phases) {
    expect(phase.data?.expanded).toBe(false)
    expect(Number(phase.data?.count)).toBeGreaterThan(0)
  }
})

test("execution adds tools, files, results, errors, and retries", () => {
  const kinds = kindsAt("execution")

  for (const kind of ["tool", "file", "result", "error", "retry"]) expect(kinds.has(kind)).toBe(true)
  expect(kinds.has("reasoning")).toBe(false)
})

test("detail adds low-prominence notices", () => {
  const kinds = kindsAt("detail")

  expect(kinds.has("notice")).toBe(true)
  expect(kinds.has("reasoning")).toBe(false)
})

test("failure statuses map onto the contract vocabulary", () => {
  const statuses = at("execution").nodes.map((node) => node.status)

  expect(statuses).toContain("error")
  expect(statuses).not.toContain("failed")
})

test("cards are budgeted and degrade to labels above the cap", () => {
  const model = at("execution", { cardBudget: 1 })
  const cards = model.nodes.filter((node) => node.html !== undefined)
  const demoted = model.nodes.filter((node) => node.shape === "dot" && node.html === undefined)

  expect(cards.length).toBe(1)
  expect(demoted.length).toBeGreaterThan(0)
})

test("card markup escapes host content", () => {
  const synthetic: GraphModel = {
    root: "session",
    nodes: [
      { id: "session", kind: "session", label: "Session", status: "neutral" },
      {
        id: "tool:1",
        kind: "tool",
        label: 'read <script>alert("x")</script>',
        summary: '<img src=x onerror="y">',
        status: "failed",
      },
    ],
    edges: [],
    turns: [],
    turnByMessageID: new Map(),
  }

  const html = buildRenderModel(synthetic, { level: "execution", positions: new Map() }).nodes.find(
    (node) => node.id === "tool:1",
  )!.html!

  expect(html).toContain("&lt;script&gt;")
  expect(html).toContain("&lt;img")
  expect(html).not.toContain("<script>")
  expect(html).not.toContain("<img")
})

test("edges never reference a node hidden at the level", () => {
  for (const level of ["overview", "execution", "detail"] as const) {
    const built = at(level)
    const ids = new Set(built.nodes.map((node) => node.id))

    for (const edge of built.edges) {
      expect(ids.has(edge.source)).toBe(true)
      expect(ids.has(edge.target)).toBe(true)
    }
  }
})

test("overview keeps only hierarchy edges", () => {
  expect(new Set(at("overview").edges.map((edge) => edge.kind))).toEqual(new Set(["part-of"]))
})

test("model building is deterministic", () => {
  expect(JSON.stringify(at("execution"))).toBe(JSON.stringify(at("execution")))
})
