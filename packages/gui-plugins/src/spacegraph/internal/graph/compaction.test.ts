import { describe, it, expect } from "bun:test"
import { analyzeCompaction, filterByCompactionPriority, getCompactionSummary } from "./compaction"
import type { GraphViewData, GraphNode, GraphEdge } from "./model"

function createTestGraph(): GraphViewData {
  const nodes: GraphNode[] = [
    { id: "session", kind: "session", label: "Session", status: "neutral", minLevel: "overview", data: {} },
    { id: "turn-1", kind: "turn", label: "Turn 1", status: "neutral", minLevel: "overview", turnID: "turn-1", data: {} },
    { id: "turn-2", kind: "turn", label: "Turn 2", status: "neutral", minLevel: "overview", turnID: "turn-2", data: {} },
    { id: "phase-1", kind: "phase", label: "Edit", status: "neutral", minLevel: "overview", turnID: "turn-1", derived: true, data: { category: "edit" } },
    { id: "msg-1", kind: "message", label: "I'll fix the bug", status: "neutral", turnID: "turn-1", messageID: "msg-1", data: { role: "assistant" } },
    { id: "tool-1", kind: "tool", label: "edit", status: "success", turnID: "turn-1", toolID: "tool-1", data: { name: "edit" } },
    { id: "file-1", kind: "file", label: "src/bug.ts", status: "success", data: { path: "src/bug.ts" } },
    { id: "error-1", kind: "error", label: "Type error", status: "failed", turnID: "turn-2", data: {} },
    { id: "retry-1", kind: "retry", label: "Retry #1", status: "neutral", turnID: "turn-2", data: { attempt: 1 } },
    { id: "subagent-1", kind: "subagent", label: "Subagent", status: "success", turnID: "turn-1", minLevel: "overview", data: { childSessionID: "sub-1" } },
    { id: "compaction-1", kind: "compaction", label: "Compacted", status: "success", turnID: "turn-2", data: {} },
    { id: "reasoning-1", kind: "reasoning", label: "Let me think", status: "neutral", turnID: "turn-1", minLevel: "detail", data: {} },
    { id: "result-1", kind: "result", label: "ok", status: "success", turnID: "turn-1", data: {} },
  ]

  const edges: GraphEdge[] = [
    { id: "part-of:turn-1->session", kind: "part-of", source: "turn-1", target: "session", confidence: "explicit" },
    { id: "part-of:turn-2->session", kind: "part-of", source: "turn-2", target: "session", confidence: "explicit" },
    { id: "part-of:phase-1->turn-1", kind: "part-of", source: "phase-1", target: "turn-1", confidence: "explicit" },
    { id: "part-of:msg-1->turn-1", kind: "part-of", source: "msg-1", target: "turn-1", confidence: "explicit" },
    { id: "part-of:tool-1->turn-1", kind: "part-of", source: "tool-1", target: "turn-1", confidence: "explicit" },
    { id: "produces:tool-1->file-1", kind: "produces", source: "tool-1", target: "file-1", confidence: "explicit" },
    { id: "writes:turn-1->file-1", kind: "writes", source: "turn-1", target: "file-1", confidence: "structural" },
    { id: "part-of:error-1->turn-2", kind: "part-of", source: "error-1", target: "turn-2", confidence: "explicit" },
    { id: "part-of:retry-1->turn-2", kind: "part-of", source: "retry-1", target: "turn-2", confidence: "explicit" },
    { id: "evidence:error-1->retry-1", kind: "evidence", source: "error-1", target: "retry-1", confidence: "structural" },
    { id: "part-of:subagent-1->turn-1", kind: "part-of", source: "subagent-1", target: "turn-1", confidence: "explicit" },
    { id: "delegates:msg-1->subagent-1", kind: "delegates", source: "msg-1", target: "subagent-1", confidence: "explicit" },
    { id: "compacts:compaction-1->turn-1", kind: "compacts", source: "compaction-1", target: "turn-1", confidence: "explicit" },
    { id: "part-of:reasoning-1->turn-1", kind: "part-of", source: "reasoning-1", target: "turn-1", confidence: "explicit" },
    { id: "part-of:result-1->turn-1", kind: "part-of", source: "result-1", target: "turn-1", confidence: "explicit" },
    { id: "produces:tool-1->result-1", kind: "produces", source: "tool-1", target: "result-1", confidence: "explicit" },
  ]

  return {
    root: "session",
    nodes,
    edges,
    turns: ["turn-1", "turn-2"],
    turnByMessageID: new Map(),
  }
}

describe("analyzeCompaction", () => {
  it("identifies decision spine nodes", () => {
    const model = createTestGraph()
    const analysis = analyzeCompaction(model)

    // Decision spine should include errors, retries, decision phases, subagents, compactions
    expect(analysis.decisionSpine).toContain("error-1")
    expect(analysis.decisionSpine).toContain("retry-1")
    expect(analysis.decisionSpine).toContain("phase-1") // edit phase
    expect(analysis.decisionSpine).toContain("subagent-1")
    expect(analysis.decisionSpine).toContain("compaction-1")

    // Should also include nodes with causal edges
    expect(analysis.decisionSpine).toContain("tool-1") // has produces/writes edges
    expect(analysis.decisionSpine).toContain("file-1") // target of writes
  })

  it("assigns critical priority to decision spine nodes", () => {
    const model = createTestGraph()
    const analysis = analyzeCompaction(model)

    const criticalNodes = analysis.nodes.filter((n) => n.compactionPriority === "critical")
    expect(criticalNodes.length).toBeGreaterThan(0)

    // Error and retry should be critical
    const errorNode = analysis.nodes.find((n) => n.id === "error-1")
    expect(errorNode?.compactionPriority).toBe("critical")

    const retryNode = analysis.nodes.find((n) => n.id === "retry-1")
    expect(retryNode?.compactionPriority).toBe("critical")
  })

  it("assigns high priority to why-kinds", () => {
    const model = createTestGraph()
    const analysis = analyzeCompaction(model)

    // Phase is in decision spine (decision phase), so it's critical
    const phaseNode = analysis.nodes.find((n) => n.id === "phase-1")
    expect(phaseNode?.compactionPriority).toBe("critical")

    // Subagent is in decision spine (has delegates edge), so it's critical
    const subagentNode = analysis.nodes.find((n) => n.id === "subagent-1")
    expect(subagentNode?.compactionPriority).toBe("critical")

    // File is in decision spine (target of writes edge), so it's critical
    const fileNode = analysis.nodes.find((n) => n.id === "file-1")
    expect(fileNode?.compactionPriority).toBe("critical")
  })

  it("assigns normal priority to reasoning with part-of edge", () => {
    const model = createTestGraph()
    const analysis = analyzeCompaction(model)

    const reasoningNode = analysis.nodes.find((n) => n.id === "reasoning-1")
    // Reasoning has part-of edge, so it gets normal priority (message with activity)
    expect(reasoningNode?.compactionPriority).toBe("normal")
  })

  it("filterByCompactionPriority works correctly", () => {
    const model = createTestGraph()
    const analysis = analyzeCompaction(model)

    const criticalOnly = filterByCompactionPriority(analysis, "critical")
    expect(criticalOnly.every((n) => n.compactionPriority === "critical")).toBe(true)

    const highAndAbove = filterByCompactionPriority(analysis, "high")
    expect(highAndAbove.every((n) => ["critical", "high"].includes(n.compactionPriority))).toBe(true)

    const normalAndAbove = filterByCompactionPriority(analysis, "normal")
    expect(normalAndAbove.every((n) => ["critical", "high", "normal"].includes(n.compactionPriority))).toBe(true)
  })

  it("getCompactionSummary returns readable output", () => {
    const model = createTestGraph()
    const analysis = analyzeCompaction(model)
    const summary = getCompactionSummary(analysis)

    expect(summary).toContain("Compaction Analysis")
    expect(summary).toContain("Total nodes:")
    expect(summary).toContain("Decision spine:")
    expect(summary).toContain("Critical")
    expect(summary).toContain("High")
  })
})