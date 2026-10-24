import { describe, expect, test } from "bun:test"
import { reviewChanges, reviewModel } from "./review"
import type { GraphViewData, GraphNode } from "./model"

const node = (id: string, label = id): GraphNode => ({
  id,
  kind: "file",
  label,
  status: "neutral",
  data: { path: label },
})

const model = (nodes: GraphNode[], edges: GraphViewData["edges"] = []): GraphViewData => ({
  root: "session",
  nodes,
  edges,
  turns: [],
  turnByMessageID: new Map(),
})

describe("review profile", () => {
  test("reports added, removed and changed nodes", () => {
    const before = model([node("file:a", "a.ts"), node("file:b", "b.ts")])
    const after = model([node("file:a", "a.ts")])

    expect(reviewChanges(before, after)).toEqual({
      added: [],
      removed: ["file:b"],
      changed: [],
    })
  })

  test("projects changed nodes and adjacent edge endpoints", () => {
    const before = model([node("file:a", "a.ts"), node("file:b", "b.ts")])
    const after = model(
      [node("file:a", "a.ts"), node("file:c", "c.ts"), node("file:d", "d.ts")],
      [
        { id: "writes:a->c", kind: "writes", source: "file:a", target: "file:c", confidence: "explicit" },
        { id: "writes:a->d", kind: "writes", source: "file:a", target: "file:d", confidence: "explicit" },
      ],
    )
    const reviewed = reviewModel(before, after)

    expect(reviewed.nodes.map((item) => item.id)).toEqual(["file:a", "file:c", "file:d"])
    expect(reviewed.edges.map((edge) => edge.id)).toEqual(["writes:a->c", "writes:a->d"])
  })

  test("keeps model metadata in the review projection", () => {
    const before = model([node("file:a", "a.ts")])
    const after: GraphViewData = {
      ...model([node("file:a", "a.ts"), node("file:b", "b.ts")]),
      goal: "Review changes",
      turns: ["turn:u1"],
      turnByMessageID: new Map([["u1", "turn:u1"]]),
    }

    expect(reviewModel(before, after).goal).toBe("Review changes")
    expect(reviewModel(before, after).turns).toEqual(["turn:u1"])
  })
})
