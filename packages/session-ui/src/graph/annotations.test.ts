import { describe, expect, test } from "bun:test"
import { noteNodeID, withAnnotations, type Annotations } from "./annotations"
import type { GraphViewData } from "./model"

const model: GraphViewData = {
  root: "session",
  nodes: [
    { id: "session", kind: "session", label: "Session", status: "neutral" },
    { id: "turn:1", kind: "turn", label: "Turn 1", status: "neutral", turnID: "turn:1" },
    { id: "file:a", kind: "file", label: "a.ts", status: "neutral", turnID: "turn:1" },
  ],
  edges: [],
  turns: ["turn:1"],
  turnByMessageID: new Map(),
}

const annotations: Annotations = {
  n1: { id: "n1", target: "file:a", body: "First line\nSecond line" },
}

describe("annotations — one note is one node and one edge", () => {
  test("no annotations is the same model", () => {
    expect(withAnnotations(model, {})).toBe(model)
  })

  test("adds one note node and one annotates edge", () => {
    const annotated = withAnnotations(model, annotations)
    const note = annotated.nodes.find((node) => node.id === noteNodeID("n1"))

    expect(annotated.nodes).toHaveLength(model.nodes.length + 1)
    expect(annotated.edges).toHaveLength(1)
    expect(note).toMatchObject({
      kind: "note",
      label: "First line",
      summary: "First line\nSecond line",
      turnID: "turn:1",
      data: { noteID: "n1", target: "file:a" },
    })
    expect(annotated.edges[0]).toMatchObject({
      kind: "annotates",
      source: noteNodeID("n1"),
      target: "file:a",
      confidence: "explicit",
    })
  })

  test("the note inherits the target's turn, not the annotation's", () => {
    const annotated = withAnnotations(model, {
      n2: { id: "n2", target: "turn:1", body: "on the turn" },
    })

    expect(annotated.nodes.find((node) => node.id === noteNodeID("n2"))?.turnID).toBe("turn:1")
  })

  test("an annotation for a missing target adds nothing", () => {
    expect(withAnnotations(model, { n3: { id: "n3", target: "file:gone", body: "orphan" } })).toBe(
      model,
    )
  })

  test("the note keeps the annotation's creation time", () => {
    const annotated = withAnnotations(model, {
      n4: { id: "n4", target: "file:a", body: "dated", createdAt: 42 },
    })

    expect(annotated.nodes.find((node) => node.id === noteNodeID("n4"))?.time).toBe(42)
  })
})
