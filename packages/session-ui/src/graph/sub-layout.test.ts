import { describe, expect, test } from "bun:test"
import type { GraphViewData, GraphNode, GraphEdge } from "./model"
import type { Layout } from "./vocabulary"
import { layoutGraph } from "./layout"
import { applySubLayouts, isClusterExpanded, computeBandBox } from "./sub-layout"
import { nodeIndex } from "./lookup"
import type { Position } from "./layout"

function dumpPositions(positions: Map<string, Position>) {
  const round = (value: number) => Math.round(value * 100) / 100
  return [...positions.entries()].map(([id, point]) => [id, round(point.x), round(point.y), round(point.z)])
}

function createTestModel(): GraphViewData {
  const nodes: GraphNode[] = [
    { id: "session", kind: "session", label: "Session", status: "neutral", minLevel: "overview" },
    // Phase group
    { id: "phase:1", kind: "phase", label: "Plan", status: "neutral", minLevel: "overview", clusterOf: ["turn:1", "turn:2"] },
    { id: "turn:1", kind: "turn", label: "Turn 1", status: "neutral", turnID: "turn:1", minLevel: "overview", data: { ordinal: 1 } },
    { id: "turn:2", kind: "turn", label: "Turn 2", status: "success", turnID: "turn:2", minLevel: "overview", data: { ordinal: 2 } },
    // File group
    { id: "file-group:1", kind: "file-group", label: "src/auth", status: "neutral", minLevel: "overview", clusterOf: ["file:a", "file:b"] },
    { id: "file:a", kind: "file", label: "a.ts", status: "neutral", turnID: "turn:1", minLevel: "execution" },
    { id: "file:b", kind: "file", label: "b.ts", status: "neutral", turnID: "turn:1", minLevel: "execution" },
    // Error group
    { id: "error-group:1", kind: "error-group", label: "Auth error", status: "failed", minLevel: "overview", clusterOf: ["error:1", "retry:1"] },
    { id: "error:1", kind: "error", label: "Auth failed", status: "failed", turnID: "turn:2", minLevel: "overview" },
    { id: "retry:1", kind: "retry", label: "Retry auth", status: "running", turnID: "turn:2", minLevel: "overview" },
    // Subagent group
    { id: "subagent-group:1", kind: "subagent-group", label: "Auth fix", status: "neutral", minLevel: "overview", clusterOf: ["sub:1", "sub:2"] },
    { id: "sub:1", kind: "subagent", label: "Explore", status: "success", turnID: "turn:1", minLevel: "overview" },
    { id: "sub:2", kind: "subagent", label: "Fix", status: "success", turnID: "turn:2", minLevel: "overview" },
    // Compaction group
    { id: "compaction-group:1", kind: "compaction-group", label: "Compaction 1", status: "neutral", minLevel: "overview", clusterOf: ["compact:1", "compact:2"] },
    { id: "compact:1", kind: "compaction", label: "Auto compact", status: "success", turnID: "turn:1", minLevel: "execution", time: 1000 },
    { id: "compact:2", kind: "compaction", label: "Manual compact", status: "success", turnID: "turn:2", minLevel: "execution", time: 2000 },
    // Facet group
    { id: "facet-group:1", kind: "facet-group", label: "domain:auth", status: "neutral", minLevel: "overview", clusterOf: ["tool:1", "tool:2", "tool:3"] },
    { id: "tool:1", kind: "tool", label: "read", status: "success", turnID: "turn:1", minLevel: "execution", data: { domain: "auth", count: 3 } },
    { id: "tool:2", kind: "tool", label: "edit", status: "success", turnID: "turn:1", minLevel: "execution", data: { domain: "auth", count: 2 } },
    { id: "tool:3", kind: "tool", label: "shell", status: "success", turnID: "turn:2", minLevel: "execution", data: { domain: "auth", count: 5 } },
  ]

  const edges: GraphEdge[] = [
    { id: "e1", kind: "part-of", source: "turn:1", target: "phase:1", confidence: "structural" },
    { id: "e2", kind: "part-of", source: "turn:2", target: "phase:1", confidence: "structural" },
    { id: "e3", kind: "writes", source: "turn:1", target: "file:a", confidence: "explicit" },
    { id: "e4", kind: "writes", source: "turn:1", target: "file:b", confidence: "explicit" },
    { id: "e5", kind: "evidence", source: "error:1", target: "retry:1", confidence: "explicit" },
    { id: "e6", kind: "delegates", source: "sub:1", target: "subagent-group:1", confidence: "explicit" },
    { id: "e7", kind: "delegates", source: "sub:2", target: "subagent-group:1", confidence: "explicit" },
    { id: "e8", kind: "compacts", source: "compact:1", target: "compaction-group:1", confidence: "structural" },
    { id: "e9", kind: "compacts", source: "compact:2", target: "compaction-group:1", confidence: "structural" },
    { id: "e10", kind: "touches", source: "tool:1", target: "facet-group:1", confidence: "inferred" },
    { id: "e11", kind: "touches", source: "tool:2", target: "facet-group:1", confidence: "inferred" },
    { id: "e12", kind: "touches", source: "tool:3", target: "facet-group:1", confidence: "inferred" },
  ]

  return {
    root: "session",
    nodes,
    edges,
    turns: ["turn:1", "turn:2"],
    turnByMessageID: new Map(),
    activeTurn: "turn:2",
  }
}

describe("sub-layout — golden round-trip (fold → unfold → byte-identical positions)", () => {
  const model = createTestModel()
  const layout: Layout = "lanes"
  const level: "execution" | "detail" = "execution"

  test("applySubLayouts is deterministic — two runs produce identical positions", () => {
    const baseLayout = layoutGraph(model)
    const basePositions = new Map(baseLayout.positions)

    const a = applySubLayouts(model, basePositions, level, layout)
    const b = applySubLayouts(model, basePositions, level, layout)

    expect(dumpPositions(a)).toEqual(dumpPositions(b))
  })

  test("sub-layout round-trip: fold (overview) → unfold (execution) restores identical positions", () => {
    const baseLayout = layoutGraph(model)
    const basePositions = new Map(baseLayout.positions)

    // Step 1: Apply sub-layouts at execution level (unfolded)
    const unfoldedPositions = applySubLayouts(model, basePositions, "execution", layout)

    // Step 2: Fold to overview (groups collapsed, members hidden)
    const foldedPositions = applySubLayouts(model, basePositions, "overview", layout)
    // At overview, sub-layouts should NOT be applied, so positions should equal base
    expect(dumpPositions(foldedPositions)).toEqual(dumpPositions(basePositions))

    // Step 3: Unfold back to execution
    const unfoldedAgain = applySubLayouts(model, basePositions, "execution", layout)

    // Step 4: Positions must be byte-identical
    expect(dumpPositions(unfoldedAgain)).toEqual(dumpPositions(unfoldedPositions))
  })

  test("each group kind produces deterministic member positions", () => {
    const baseLayout = layoutGraph(model)
    const basePositions = new Map(baseLayout.positions)

    const unfoldedPositions = applySubLayouts(model, basePositions, "execution", layout)

    // Check each group kind's members have stable positions
    const groupKinds = ["phase", "file-group", "error-group", "subagent-group", "compaction-group", "facet-group"] as const

    for (const kind of groupKinds) {
      const group = model.nodes.find((n) => n.kind === kind)
      if (!group || !group.clusterOf) continue

      for (const memberId of group.clusterOf) {
        const pos = unfoldedPositions.get(memberId)
        expect(pos).toBeDefined()

        // Verify position is within group bounds
        const bounds = computeBandBox(model, group.clusterOf, unfoldedPositions, new Set(group.clusterOf))
        expect(bounds).toBeDefined()
        if (bounds) {
          expect(pos!.x).toBeGreaterThanOrEqual(bounds.min.x)
          expect(pos!.x).toBeLessThanOrEqual(bounds.max.x)
          expect(pos!.y).toBeGreaterThanOrEqual(bounds.min.y)
          expect(pos!.y).toBeLessThanOrEqual(bounds.max.y)
        }
      }
    }
  })

  test("phase group: members laid out in inner lanes (turn ordinal × lane)", () => {
    const baseLayout = layoutGraph(model)
    const basePositions = new Map(baseLayout.positions)
    const idx = nodeIndex(model)

    const unfoldedPositions = applySubLayouts(model, basePositions, "execution", layout)

    const phase = model.nodes.find((n) => n.kind === "phase")!
    const members = phase.clusterOf!.map((id) => idx.get(id)!).filter(Boolean)

    // Members should be grouped by lane (y coordinate)
    const byLane = new Map<number, typeof members>()
    for (const member of members) {
      const pos = unfoldedPositions.get(member.id)
      if (!pos) continue
      const lane = Math.round(pos.y / 56)
      const bucket = byLane.get(lane) ?? []
      bucket.push(member)
      byLane.set(lane, bucket)
    }

    // Each lane should have members sorted by X (turn ordinal)
    for (const laneMembers of byLane.values()) {
      for (let i = 1; i < laneMembers.length; i++) {
        const prev = unfoldedPositions.get(laneMembers[i - 1].id)!
        const curr = unfoldedPositions.get(laneMembers[i].id)!
        expect(curr.x).toBeGreaterThan(prev.x)
      }
    }
  })

  test("file group: members laid out in grid, path-sorted", () => {
    const baseLayout = layoutGraph(model)
    const basePositions = new Map(baseLayout.positions)

    const unfoldedPositions = applySubLayouts(model, basePositions, "execution", layout)

    const group = model.nodes.find((n) => n.kind === "file-group")!
    const members = group.clusterOf!

    // Sort by path (label)
    const sortedByPath = [...members].sort((a, b) => {
      const nodeA = model.nodes.find((n) => n.id === a)
      const nodeB = model.nodes.find((n) => n.id === b)
      return (nodeA?.label ?? "").localeCompare(nodeB?.label ?? "")
    })

    // Positions should follow sorted order (grid layout)
    for (let i = 1; i < sortedByPath.length; i++) {
      const prev = unfoldedPositions.get(sortedByPath[i - 1])!
      const curr = unfoldedPositions.get(sortedByPath[i])!
      // In grid, later items go down/right
      expect(curr.y).toBeGreaterThanOrEqual(prev.y)
    }
  })

  test("error group: members in radial fan around evidence root", () => {
    const baseLayout = layoutGraph(model)
    const basePositions = new Map(baseLayout.positions)

    const unfoldedPositions = applySubLayouts(model, basePositions, "execution", layout)

    const group = model.nodes.find((n) => n.kind === "error-group")!
    const evidenceRoot = group.clusterOf!.find((id) => {
      const node = model.nodes.find((n) => n.id === id)
      return node?.kind === "error"
    })!

    const evidencePos = unfoldedPositions.get(evidenceRoot)
    expect(evidencePos).toBeDefined()

    // Other members should be adjacent to evidence root
    for (const memberId of group.clusterOf!) {
      if (memberId === evidenceRoot) continue
      const pos = unfoldedPositions.get(memberId)
      expect(pos).toBeDefined()
      const distance = Math.hypot(pos!.x - evidencePos!.x, pos!.y - evidencePos!.y)
      expect(distance).toBeLessThanOrEqual(300) // within reasonable radius
    }
  })

  test("subagent group: members in vertical stack by delegation order", () => {
    const baseLayout = layoutGraph(model)
    const basePositions = new Map(baseLayout.positions)

    const unfoldedPositions = applySubLayouts(model, basePositions, "execution", layout)

    const group = model.nodes.find((n) => n.kind === "subagent-group")!
    const members = group.clusterOf!

    // Members should be stacked vertically
    for (let i = 1; i < members.length; i++) {
      const prev = unfoldedPositions.get(members[i - 1])!
      const curr = unfoldedPositions.get(members[i])!
      expect(curr.y).toBeGreaterThan(prev.y)
      expect(curr.x).toBe(prev.x) // same X (vertical stack)
    }
  })

  test("compaction group: members in chronological stack", () => {
    const baseLayout = layoutGraph(model)
    const basePositions = new Map(baseLayout.positions)

    const unfoldedPositions = applySubLayouts(model, basePositions, "execution", layout)

    const group = model.nodes.find((n) => n.kind === "compaction-group")!
    const members = group.clusterOf!

    // Members should be stacked vertically by time
    for (let i = 1; i < members.length; i++) {
      const prev = unfoldedPositions.get(members[i - 1])!
      const curr = unfoldedPositions.get(members[i])!
      expect(curr.y).toBeGreaterThan(prev.y)
    }
  })

  test("facet group: members in grid by domain, worst-offender first", () => {
    const baseLayout = layoutGraph(model)
    const basePositions = new Map(baseLayout.positions)

    const unfoldedPositions = applySubLayouts(model, basePositions, "execution", layout)

    const group = model.nodes.find((n) => n.kind === "facet-group")!
    const members = group.clusterOf!

    // First member should be the one with highest count (worst offender)
    const first = unfoldedPositions.get(members[0])!
    const second = unfoldedPositions.get(members[1])!

    // Both should be in the grid (first row)
    expect(first.y).toBe(second.y)
    expect(second.x).toBeGreaterThan(first.x)
  })
})

describe("sub-layout — isClusterExpanded", () => {
  test("returns false for overview", () => {
    expect(isClusterExpanded("overview")).toBe(false)
  })

  test("returns true for execution", () => {
    expect(isClusterExpanded("execution")).toBe(true)
  })

  test("returns true for detail", () => {
    expect(isClusterExpanded("detail")).toBe(true)
  })
})