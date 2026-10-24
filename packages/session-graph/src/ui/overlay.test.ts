import { describe, it, expect } from "bun:test"
import type { GraphViewData, GraphNode, GraphEdge } from "@opencode/session-ui/graph"
import { traceWhy, traceLedHere, traceRelated, litNodeIds, stepLitNode, copyTraceAsOutline, isLit, isAnswer, isEdgeVisible, isAnswerEdge } from "./overlay"

// Minimal fixture for testing traces
const createTestModel = (): GraphViewData => {
  const nodes: GraphNode[] = [
    { id: "session:1", kind: "session", label: "Session", status: "neutral" },
    { id: "turn:1", kind: "turn", label: "Turn 1", status: "success", turnID: "turn:1" },
    { id: "tool:1", kind: "tool", label: "Read file", status: "success", turnID: "turn:1" },
    { id: "tool:2", kind: "tool", label: "Write file", status: "success", turnID: "turn:1" },
    { id: "file:1", kind: "file", label: "src/main.ts", status: "neutral" },
    { id: "file:2", kind: "file", label: "src/utils.ts", status: "neutral" },
    { id: "phase:1", kind: "phase", label: "Explore", status: "success", clusterOf: ["tool:1", "tool:2"] },
  ]

  const edges: GraphEdge[] = [
    { id: "e1", kind: "part-of", source: "turn:1", target: "session:1", confidence: "explicit" },
    { id: "e2", kind: "part-of", source: "phase:1", target: "turn:1", confidence: "explicit" },
    { id: "e3", kind: "part-of", source: "tool:1", target: "phase:1", confidence: "explicit" },
    { id: "e4", kind: "part-of", source: "tool:2", target: "phase:1", confidence: "explicit" },
    { id: "e5", kind: "writes", source: "tool:2", target: "file:1", confidence: "explicit" },
    { id: "e6", kind: "reads", source: "tool:1", target: "file:2", confidence: "explicit" },
    { id: "e7", kind: "sequence", source: "tool:1", target: "tool:2", confidence: "explicit" },
  ]

  return {
    root: "session:1",
    nodes,
    edges,
    turns: ["turn:1"],
    turnByMessageID: new Map(),
  }
}

describe("trace overlay", () => {
  const model = createTestModel()

  it("classifyTrace why - finds incoming edges and ancestors", () => {
    const overlay = traceWhy(model, "file:1")

    // Answer should include the writer (tool:2)
    expect(overlay.answerIds.has("tool:2")).toBe(true)

    // Context should include ancestors (phase:1, turn:1, session:1)
    expect(overlay.contextIds.has("phase:1")).toBe(true)
    expect(overlay.contextIds.has("turn:1")).toBe(true)
    expect(overlay.contextIds.has("session:1")).toBe(true)
  })

  it("classifyTrace led-here - finds forward chain", () => {
    const overlay = traceLedHere(model, "tool:1")

    // Answer should include the next tool in sequence
    expect(overlay.answerIds.has("tool:2")).toBe(true)
  })

  it("classifyTrace related - finds incoming and outgoing neighbors", () => {
    const overlay = traceRelated(model, "phase:1")

    // Incoming: turn:1 (part-of)
    expect(overlay.answerIds.has("turn:1")).toBe(true)

    // Outgoing: tool:1, tool:2 (part-of children)
    expect(overlay.answerIds.has("tool:1")).toBe(true)
    expect(overlay.answerIds.has("tool:2")).toBe(true)
  })

  it("litNodeIds combines answer and context", () => {
    const overlay = traceWhy(model, "file:1")
    const lit = litNodeIds(overlay)

    expect(lit.has("tool:2")).toBe(true) // answer
    expect(lit.has("phase:1")).toBe(true) // context
    expect(lit.has("turn:1")).toBe(true) // context
    expect(lit.has("session:1")).toBe(true) // context
  })

  it("isLit returns true for answer and context nodes", () => {
    const overlay = traceWhy(model, "file:1")

    expect(isLit(overlay, "tool:2")).toBe(true) // answer
    expect(isLit(overlay, "phase:1")).toBe(true) // context
    expect(isLit(overlay, "file:2")).toBe(false) // unrelated
  })

  it("isAnswer returns true only for answer nodes", () => {
    const overlay = traceWhy(model, "file:1")

    expect(isAnswer(overlay, "tool:2")).toBe(true) // answer
    expect(isAnswer(overlay, "phase:1")).toBe(false) // context
    expect(isAnswer(overlay, "file:2")).toBe(false) // unrelated
  })

  it("stepLitNode steps through lit nodes in order", () => {
    const overlay = traceWhy(model, "file:1")
    const lit = Array.from(litNodeIds(overlay))

    // Step forward from undefined (first)
    const first = stepLitNode(overlay, undefined, 1)
    expect(first).toBe(lit[0])

    // Step backward from undefined (last)
    const last = stepLitNode(overlay, undefined, -1)
    expect(last).toBe(lit[lit.length - 1])

    // Step forward from first
    const second = stepLitNode(overlay, lit[0], 1)
    expect(second).toBe(lit[1] ?? undefined)

    // Step backward from first
    const prev = stepLitNode(overlay, lit[0], -1)
    expect(prev).toBeUndefined()
  })

  it("copyTraceAsOutline produces markdown outline", () => {
    const overlay = traceWhy(model, "file:1")
    const breadcrumbs = (model: GraphViewData, id: string) => {
      const node = model.nodes.find((n) => n.id === id)
      return node ? [node] : []
    }

    const outline = copyTraceAsOutline(model, overlay, breadcrumbs)

    expect(outline).toContain("▸") // answer marker
    expect(outline).toContain("  ") // context marker
  })

  it("isEdgeVisible returns true for answer and context edges", () => {
    const overlay = traceWhy(model, "file:1")

    // Edge from tool:2 (answer) to file:1 (target) should be visible
    expect(isEdgeVisible(overlay, "e5")).toBe(true)

    // Edge between context nodes should be visible
    expect(isEdgeVisible(overlay, "e2")).toBe(true) // turn:1 -> phase:1

    // Unrelated edge should not be visible
    expect(isEdgeVisible(overlay, "e6")).toBe(false) // tool:1 -> file:2 (reads)
  })

  it("isAnswerEdge returns true for edges between answer nodes", () => {
    const overlay = traceWhy(model, "file:1")

    // e5 is from answer (tool:2) to target (file:1) - it's an answer edge
    expect(isAnswerEdge(overlay, "e5")).toBe(true)
  })
})