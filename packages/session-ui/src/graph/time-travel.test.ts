import { describe, expect, test } from "bun:test"
import type { GraphNode, GraphViewData } from "./model"
import { captureTimeTravel, graphAtCheckpoint } from "./time-travel"

function modelWithTurns(count: number): GraphViewData {
  const turns = Array.from({ length: count }, (_, index) => `turn:${index}`)

  const nodes: GraphNode[] = turns.map((id) => ({
    id,
    kind: "turn",
    label: id,
    status: "neutral",
    minLevel: "overview",
    turnID: id,
  }))

  return {
    root: "session",
    nodes,
    edges: [],
    turns,
    turnByMessageID: new Map(turns.map((id, index) => [`message:${index}`, id])),
  }
}

describe("time travel snapshots", () => {
  test("keeps only the newest checkpoints", () => {
    const snapshots = captureTimeTravel(modelWithTurns(10), [], 3)

    expect(snapshots.map((snapshot) => snapshot.checkpoint)).toEqual([7, 8, 9])
    expect(snapshots.at(-1)?.graph.turns).toEqual(modelWithTurns(10).turns)
  })

  test("appends new turns without rebuilding known checkpoints", () => {
    const first = captureTimeTravel(modelWithTurns(2), [], 4)
    const second = captureTimeTravel(modelWithTurns(3), first, 4)

    expect(second.map((snapshot) => snapshot.checkpoint)).toEqual([0, 1, 2])
    expect(second[0]).toBe(first[0]!)
  })

  test("freezes a checkpoint against later live updates", () => {
    const model = modelWithTurns(2)
    const snapshot = captureTimeTravel(model, [], 2).at(-1)!
    model.nodes[0]!.status = "failed"

    expect(snapshot.graph.nodes[0]!.status).not.toBe("failed")
  })

  test("uses a buffered snapshot and falls back to scoping older turns", () => {
    const model = modelWithTurns(4)
    const snapshots = captureTimeTravel(model, [], 2)

    expect(graphAtCheckpoint(model, snapshots, 3).turns).toEqual(model.turns)
    expect(graphAtCheckpoint(model, snapshots, 1).turns).toEqual(["turn:0", "turn:1"])
    expect(graphAtCheckpoint(model, snapshots, 0).turns).toEqual(["turn:0"])
  })

  test("clamps checkpoints to the available turn range", () => {
    const model = modelWithTurns(3)

    expect(graphAtCheckpoint(model, [], 99).turns).toEqual(model.turns)
    expect(graphAtCheckpoint(model, [], -5).turns).toEqual(["turn:0"])
  })

  test("drops an active turn outside the parked prefix", () => {
    const model = modelWithTurns(3)
    model.activeTurn = "turn:2"

    expect(graphAtCheckpoint(model, [], 0).activeTurn).toBeUndefined()
    expect(captureTimeTravel(model, [], 3)[0]!.graph.activeTurn).toBeUndefined()
  })
})
