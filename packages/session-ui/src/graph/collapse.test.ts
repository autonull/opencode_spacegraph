import { describe, expect, test } from "bun:test"
import { collapseGroups } from "./collapse"
import type { GraphViewData } from "./model"

const model: GraphViewData = {
  root: "session",
  nodes: [
    { id: "session", kind: "session", label: "Session", status: "neutral" },
    { id: "phase:1", kind: "phase", label: "Plan", status: "neutral", clusterOf: ["turn:1", "turn:2"] },
    { id: "turn:1", kind: "turn", label: "Turn 1", status: "neutral", turnID: "turn:1" },
    { id: "turn:2", kind: "turn", label: "Turn 2", status: "success", turnID: "turn:2" },
    { id: "file:a", kind: "file", label: "a.ts", status: "neutral", turnID: "turn:1" },
  ],
  edges: [
    { id: "part-of:turn-1", kind: "part-of", source: "turn:1", target: "phase:1", confidence: "structural" },
    { id: "part-of:turn-2", kind: "part-of", source: "turn:2", target: "phase:1", confidence: "structural" },
    { id: "writes:a", kind: "writes", source: "turn:1", target: "file:a", confidence: "explicit" },
    { id: "writes:b", kind: "writes", source: "turn:2", target: "file:a", confidence: "explicit" },
  ],
  turns: ["turn:1", "turn:2"],
  turnByMessageID: new Map(),
  activeTurn: "turn:2",
}

describe("collapse — the group stays, its members leave the model", () => {
  test("no collapsed groups is the same model", () => {
    expect(collapseGroups(model, new Set())).toBe(model)
  })

  test("a collapsed group hides its members and their incident edges", () => {
    const collapsed = collapseGroups(model, new Set(["phase:1"]))
    const ids = new Set(collapsed.nodes.map((node) => node.id))

    expect(ids.has("phase:1")).toBe(true)
    expect(ids.has("turn:1")).toBe(false)
    expect(ids.has("turn:2")).toBe(false)
    expect(collapsed.edges).toEqual([])
    expect(collapsed.turns).toEqual([])
  })

  test("node positions and the group's member list are untouched", () => {
    const collapsed = collapseGroups(model, new Set(["phase:1"]))

    expect(collapsed.nodes.find((node) => node.id === "phase:1")?.clusterOf).toEqual([
      "turn:1",
      "turn:2",
    ])
    expect(collapsed.nodes.find((node) => node.id === "file:a")).toBe(
      model.nodes.find((node) => node.id === "file:a"),
    )
  })

  test("an active turn hidden by collapse is cleared", () => {
    expect(collapseGroups(model, new Set(["phase:1"])).activeTurn).toBeUndefined()
  })

  test("a real collapse conserves every non-member node", () => {
    const collapsed = collapseGroups(model, new Set(["phase:1"]))
    const nonMembers = model.nodes.filter((node) => !["turn:1", "turn:2"].includes(node.id))

    expect(collapsed.nodes).toEqual(nonMembers)
  })

  test("an unknown group leaves the model alone", () => {
    expect(collapseGroups(model, new Set(["phase:missing"]))).toBe(model)
  })
})
