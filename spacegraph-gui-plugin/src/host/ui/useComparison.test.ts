import { expect, test } from "bun:test"
import { createSignal } from "solid-js"
import type { GraphViewData } from "../../model"
import { createComparison } from "./useComparison"

function fixture(): GraphViewData {
  return {
    root: "session",
    nodes: [
      { id: "session", kind: "session", label: "Session", status: "neutral" },
      { id: "turn-1", kind: "turn", label: "Turn 1", status: "success" },
      { id: "tool-a", kind: "tool", label: "Tool A", status: "success", turnID: "turn-1" },
      { id: "turn-2", kind: "turn", label: "Turn 2", status: "success" },
      { id: "tool-b", kind: "tool", label: "Tool B", status: "success", turnID: "turn-2" },
    ],
    edges: [
      { id: "e1", kind: "part-of", source: "turn-1", target: "session", confidence: "structural" },
      { id: "e2", kind: "part-of", source: "tool-a", target: "turn-1", confidence: "structural" },
      { id: "e3", kind: "part-of", source: "turn-2", target: "session", confidence: "structural" },
      { id: "e4", kind: "part-of", source: "tool-b", target: "turn-2", confidence: "structural" },
    ],
    turns: ["turn-1", "turn-2"],
    turnByMessageID: new Map(),
  }
}

function harness(selection: string[] = [], checkpoint?: number) {
  const graph = fixture()
  const [selected] = createSignal(selection)
  return {
    graph,
    comparison: createComparison({ model: () => graph, selection: selected, checkpoint: () => checkpoint }),
  }
}

test("comparing visible turns produces a turn-labelled change set", () => {
  const { comparison } = harness()
  comparison.compareVisibleTurns()
  expect(comparison.comparedTurns()).toEqual(["turn-1", "turn-2"])
  expect(comparison.comparison()?.label).toBe("turns")
  expect(comparison.comparison()?.counts.added).toBe(1)
  expect(comparison.comparison()?.counts.removed).toBe(1)
})

test("two selected turns can be compared explicitly", () => {
  const { comparison } = harness(["turn-1", "turn-2"])
  comparison.compareSelectedTurns()
  expect(comparison.comparedTurns()).toEqual(["turn-1", "turn-2"])
})

test("one selected turn is not enough to compare", () => {
  const { comparison } = harness(["turn-1"])
  comparison.compareSelectedTurns()
  expect(comparison.comparedTurns()).toBeNull()
})

test("clearing an explicit pair falls back to the parked checkpoint", () => {
  const { comparison } = harness([], 0)
  expect(comparison.comparison()?.label).toBe("parked")
  comparison.compareVisibleTurns()
  expect(comparison.comparison()?.label).toBe("turns")
  comparison.clearComparison()
  expect(comparison.comparison()?.label).toBe("parked")
})
