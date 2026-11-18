import { expect, test } from "bun:test"
import { createSignal } from "solid-js"
import { DEFAULT_FACETS, type GraphViewData } from "../../model"
import { createGraphViewModel, turnOfTurn } from "./useGraphViewModel"

function fixture(): GraphViewData {
  return {
    root: "session",
    nodes: [
      { id: "session", kind: "session", label: "Session", status: "neutral" },
      { id: "turn-1", kind: "turn", label: "Turn 1", status: "success" },
      { id: "tool-1", kind: "tool", label: "Tool 1", status: "success", turnID: "turn-1" },
      { id: "turn-2", kind: "turn", label: "Turn 2", status: "success" },
    ],
    edges: [
      { id: "e1", kind: "part-of", source: "turn-1", target: "session", confidence: "structural" },
      { id: "e2", kind: "part-of", source: "tool-1", target: "turn-1", confidence: "structural" },
      { id: "e3", kind: "part-of", source: "turn-2", target: "session", confidence: "structural" },
    ],
    turns: ["turn-1", "turn-2"],
    turnByMessageID: new Map(),
  }
}

function view(graph: GraphViewData, selection: string[] = [], compared: readonly [string, string] | null = null) {
  const [selected] = createSignal(selection)
  return createGraphViewModel({
    model: () => graph,
    facets: () => DEFAULT_FACETS,
    selection: selected,
    collapsedGroups: () => new Set(),
    comparedTurns: () => compared,
  })
}

test("turnOfTurn resolves a turn itself and a node's turn ancestor", () => {
  const graph = fixture()
  expect(turnOfTurn(graph, "turn-1")).toBe("turn-1")
  expect(turnOfTurn(graph, "tool-1")).toBe("turn-1")
  expect(turnOfTurn(graph, "missing")).toBeUndefined()
  expect(turnOfTurn(graph, undefined)).toBeUndefined()
})

test("selection resolves to its turn", () => {
  const model = view(fixture(), ["tool-1"])
  expect(model.selectedTurn()).toBe("turn-1")
  expect(model.selectedTurns()).toEqual([])
  expect(model.turnOf("tool-1")).toBe("turn-1")
})

test("selected turn nodes are exposed separately", () => {
  const model = view(fixture(), ["turn-2"])
  expect(model.selectedTurns().map((node) => node.id)).toEqual(["turn-2"])
})

test("the window covers all turns of a short session without an anchor", () => {
  const model = view(fixture())
  expect([...model.scale().turns]).toEqual(["turn-1", "turn-2"])
  expect(model.scale().hidden).toBe(0)
  expect(model.windowAnchor()).toBeUndefined()
})

test("comparing two turns widens the scoped model to include both", () => {
  const model = view(fixture(), [], ["turn-1", "turn-2"])
  expect(model.turnScoped().turns).toEqual(["turn-1", "turn-2"])
  expect(model.scoped().nodes.map((node) => node.id)).toContain("tool-1")
})

test("facet counts come from the turn scope", () => {
  const model = view(fixture())
  const counts = model.counts()
  expect(counts.kinds.find((entry) => entry.value === "turn")?.total).toBe(2)
  expect(counts.kinds.find((entry) => entry.value === "tool")?.total).toBe(1)
})
