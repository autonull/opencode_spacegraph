import { describe, expect, test } from "bun:test"
import { DEFAULT_BUDGET, applyNodeBudget, byProximity, sessionOrder } from "./budget"
import { buildFixtureGraph } from "./fixture"
import { layoutGraph } from "./layout"
import type { GraphViewData } from "./model"

// T17.5 — the DOM card budget follows the camera. The adapter spends the budget in the order it
// walks the model's nodes, so the order decides which nodes get a card and which fall back to a
// dot. Ordering the nodes by their distance from the camera's centre spends it on what the reader
// is looking at.
describe("the card budget follows the camera", () => {
  test("the nodes nearest the camera come first", () => {
    const model = buildFixtureGraph()
    const positions = layoutGraph(model).positions
    const centre: [number, number, number] = [0, 0, 0]

    const ordered = byProximity(model, positions, centre)

    const distance = (id: string) => {
      const point = positions.get(id)!
      return Math.hypot(point.x, point.y)
    }

    const distances = ordered.nodes.map((node) => distance(node.id))

    expect(distances).toEqual([...distances].sort((a, b) => a - b))
  })

  test("the order follows the camera's centre", () => {
    const model = buildFixtureGraph()
    const positions = layoutGraph(model).positions
    const near = [...positions.entries()].sort(
      (a, b) => Math.hypot(a[1].x, a[1].y) - Math.hypot(b[1].x, b[1].y),
    )[0]![0]

    const centred = byProximity(model, positions, [positions.get(near)!.x, positions.get(near)!.y, 0])

    expect(centred.nodes[0]!.id).toBe(near)
  })

  test("the order keeps the session's order among equal distances", () => {
    const model: GraphViewData = {
      root: "session",
      nodes: [
        { id: "a", kind: "tool", label: "a", status: "success" },
        { id: "b", kind: "tool", label: "b", status: "success" },
        { id: "c", kind: "tool", label: "c", status: "success" },
      ],
      edges: [],
      turns: [],
      turnByMessageID: new Map(),
    }
    const positions = new Map([
      ["a", { x: -10, y: 0, z: 0 }],
      ["b", { x: 10, y: 0, z: 0 }],
      ["c", { x: 0, y: 20, z: 0 }],
    ])

    const ordered = byProximity(model, positions, [0, 0, 0])

    // "a" and "b" are the same distance from the centre, so the session's order decides.
    expect(ordered.nodes.map((node) => node.id)).toEqual(["a", "b", "c"])
  })

  test("a node the layout did not place never takes a card", () => {
    const model = buildFixtureGraph()
    const ordered = byProximity(model, new Map(), [0, 0, 0])

    expect(ordered.nodes.length).toBe(model.nodes.length)
  })

  test("the session's own order is still available", () => {
    const model = buildFixtureGraph()
    const order = sessionOrder(model)

    expect(order.get(model.nodes[0]!.id)).toBe(0)
    expect(order.get(model.nodes[1]!.id)).toBe(1)
  })
})

describe("visibility budget", () => {
  test("is a no-op below the budget", () => {
    const model = buildFixtureGraph()
    expect(applyNodeBudget(model, { ...DEFAULT_BUDGET, maxNodes: model.nodes.length })).toBe(model)
  })

  test("keeps the highest-priority nodes and the session", () => {
    const model = buildFixtureGraph()
    const budgeted = applyNodeBudget(model, { ...DEFAULT_BUDGET, maxNodes: 10 })

    expect(budgeted.nodes.length).toBe(10)
    expect(budgeted.nodes.some((node) => node.kind === "session")).toBe(true)
    expect(budgeted.nodes.some((node) => node.kind === "turn")).toBe(true)
  })

  test("drops low-priority nodes first", () => {
    const model = buildFixtureGraph()
    const budgeted = applyNodeBudget(model, {
      ...DEFAULT_BUDGET,
      maxNodes: 12,
      weights: { ...DEFAULT_BUDGET.weights, diff: 0, error: 0, retry: 0 },
    })

    expect(budgeted.nodes.some((node) => node.kind === "diff")).toBe(false)
  })

  test("keeps metadata", () => {
    const model = buildFixtureGraph()
    const budgeted = applyNodeBudget(model, { ...DEFAULT_BUDGET, maxNodes: 5 })

    expect(budgeted.goal).toBe(model.goal)
    expect(budgeted.turns).toEqual(model.turns)
  })

  test("never drops a protected node", () => {
    const model = buildFixtureGraph()
    const protectedID = model.nodes.find((node) => node.kind === "file")!.id
    const budgeted = applyNodeBudget(model, {
      ...DEFAULT_BUDGET,
      maxNodes: 5,
      protectedIds: [protectedID],
    })

    expect(budgeted.nodes.some((node) => node.id === protectedID)).toBe(true)
  })
})
