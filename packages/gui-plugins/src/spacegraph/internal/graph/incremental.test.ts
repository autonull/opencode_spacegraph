import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import { computeIncremental, interpolatePosition, layoutGraph } from "./layout"
import type { GraphViewData, GraphNode } from "./model"

const extra = (id: string): GraphNode => ({
  id,
  kind: "message",
  label: id,
  status: "neutral",
  turnID: "turn:msg_user_2",
  minLevel: "overview",
})

describe("incremental layout", () => {
  test("reports added nodes and leaves existing positions stable", () => {
    const model = buildFixtureGraph()
    const first = layoutGraph(model)
    const next: GraphViewData = { ...model, nodes: [...model.nodes, extra("message:new")] }
    const incremental = computeIncremental(next, first)

    expect(incremental.added.has("message:new")).toBe(true)
    for (const [id, position] of first.positions)
      expect(incremental.layout.positions.get(id)).toEqual(position)
  })

  test("reports removed nodes", () => {
    const model = buildFixtureGraph()
    const first = layoutGraph(model)
    const removedID = model.nodes[0]!.id
    const next: GraphViewData = {
      ...model,
      nodes: model.nodes.filter((node) => node.id !== removedID),
      edges: model.edges.filter((edge) => edge.source !== removedID && edge.target !== removedID),
    }
    const incremental = computeIncremental(next, first)

    expect(incremental.removed).toContain(removedID)
  })

  test("accepts previous positions directly", () => {
    const model = buildFixtureGraph()
    const first = layoutGraph(model)
    const incremental = computeIncremental(model, first.positions)

    expect(incremental.added.size).toBe(0)
    expect(incremental.moved.size).toBe(0)
  })

  test("moved records carry no clock", () => {
    const model = buildFixtureGraph()
    const first = layoutGraph(model)
    const incremental = computeIncremental(model, first)

    expect(incremental.layout.strategy).toBe(first.strategy)
    for (const move of incremental.moved.values()) expect("t" in move).toBe(false)
  })

  test("interpolates positions", () => {
    expect(interpolatePosition({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 0 }, 0.5)).toEqual({
      x: 5,
      y: 10,
      z: 0,
    })
    expect(interpolatePosition({ x: 0, y: 0, z: 1 }, { x: 10, y: 20, z: 3 }, 0.5)).toEqual({
      x: 5,
      y: 10,
      z: 2,
    })
  })
})
