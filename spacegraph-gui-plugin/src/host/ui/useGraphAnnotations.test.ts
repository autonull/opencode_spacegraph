import { expect, test } from "bun:test"
import { createSignal } from "solid-js"
import { type Annotations, type GraphNode, type GraphViewData } from "../../model"
import { type TraceKind } from "./overlay"
import { createGraphAnnotations } from "./useGraphAnnotations"

const i18n = {
  t: (key: string) => key,
  plural: (key: string) => key,
}

function fixture(): GraphViewData {
  return {
    root: "session",
    nodes: [
      { id: "session", kind: "session", label: "Session", status: "neutral" },
      { id: "turn-1", kind: "turn", label: "Turn 1", status: "success" },
      { id: "tool-1", kind: "tool", label: "Tool 1", status: "success", turnID: "turn-1" },
      { id: "tool-2", kind: "tool", label: "Tool 2", status: "success", turnID: "turn-1" },
    ],
    edges: [
      { id: "e1", kind: "part-of", source: "turn-1", target: "session", confidence: "structural" },
      { id: "e2", kind: "part-of", source: "tool-1", target: "turn-1", confidence: "structural" },
      { id: "e3", kind: "sequence", source: "tool-1", target: "tool-2", confidence: "explicit" },
    ],
    turns: ["turn-1"],
    turnByMessageID: new Map(),
  }
}

function harness(selection: string[] = ["tool-1"]) {
  const graph = fixture()
  const [notes, setNotes] = createSignal<Annotations>({})
  const [kind, setKind] = createSignal<TraceKind | null>(null)
  const [source, setSource] = createSignal<string | null>(null)
  const announced: string[] = []
  const annotations = createGraphAnnotations({
    model: () => graph,
    selection: () => selection,
    i18n,
    notes,
    setNotes,
    onAnnounce: (message) => announced.push(message),
    traceKind: kind,
    onTraceKindChange: (next) => setKind(next),
    traceSource: source,
    onTraceSourceChange: (next) => setSource(next),
  })
  return { graph, annotations, notes, announced }
}

test("the note composer creates a note and dismisses itself", () => {
  const { annotations, notes, announced } = harness()
  annotations.openNoteComposer()
  expect(annotations.noteTarget()).toBe("tool-1")
  annotations.saveNote("first")
  const saved = Object.values(notes())[0]!
  expect(saved.target).toBe("tool-1")
  expect(saved.body).toBe("first")
  expect(announced).toContain("ui.sessionGraph.note.added")
  expect(annotations.noteTarget()).toBeUndefined()
})

test("deleting a note removes it from the store and announces", () => {
  const { annotations, notes, announced } = harness()
  annotations.openNoteComposer()
  annotations.saveNote("first")
  const saved = Object.values(notes())[0]!
  const noteNode = { id: `note:${saved.id}`, kind: "note", label: "Note", status: "neutral", data: { noteID: saved.id, target: saved.target } } as GraphNode
  annotations.deleteNote(noteNode)
  expect(notes()[saved.id]).toBeUndefined()
  expect(announced).toContain("ui.sessionGraph.note.deleted")
})

test("trace back and forward walk the controlled history", () => {
  const { annotations } = harness()
  annotations.startTrace("related", "tool-1")
  annotations.startTrace("downstream", "tool-1")
  expect(annotations.traceHistory().map((entry) => entry.kind)).toEqual(["related", "downstream"])
  expect(annotations.historyIndex()).toBe(1)
  annotations.traceBack()
  expect(annotations.traceKind()).toBe("related")
  annotations.traceForward()
  expect(annotations.traceKind()).toBe("downstream")
  annotations.clearTrace()
  expect(annotations.traceKind()).toBeNull()
})

test("a downstream trace lights its answers, edges and nodes only", () => {
  const { annotations } = harness()
  annotations.startTrace("downstream", "tool-1")
  expect(annotations.traceKind()).toBe("downstream")
  expect(annotations.isAnswer("tool-2")).toBe(true)
  expect(annotations.isLit("tool-2")).toBe(true)
  expect(annotations.isAnswer("tool-1")).toBe(false)
  expect(annotations.isEdgeVisible("e3")).toBe(true)
  expect(annotations.isAnswerEdge("e3")).toBe(true)
  expect(annotations.isEdgeVisible("e2")).toBe(false)
})

test("stepping a trace follows the lit answers", () => {
  const { annotations } = harness()
  annotations.startTrace("downstream", "tool-1")
  expect(annotations.stepLitNode(1)).toBe("tool-2")
})
