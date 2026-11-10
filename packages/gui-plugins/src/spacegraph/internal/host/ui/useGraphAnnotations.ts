import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal, createMemo } from "solid-js"
import { produce, type SetStoreFunction } from "solid-js/store"
import { breadcrumbs, type GraphViewData, type GraphNode, type Annotations } from "@opencode/session-ui/graph"
import { classifyTrace, copyTraceAsOutline, stepLitNode, type TraceKind, type TraceOverlay } from "./overlay"
import { noteData } from "./node-data"
import { useNodeLookup, type NodeLookup } from "./useNodeLookup"

export type UseGraphAnnotationsOptions = {
  model: () => GraphViewData
  selection: () => readonly string[]
  onAnnounce: (message: string) => void
  notes: Annotations
  setNotes: SetStoreFunction<Annotations>
  nodeLookup?: NodeLookup
}

export type UseGraphAnnotationsReturn = {
  notes: Annotations
  noteTarget: () => string | undefined
  editingNote: () => string | undefined
  openNoteComposer: () => void
  closeNoteComposer: () => void
  saveNote: (body: string) => void
  editNote: (node: GraphNode) => void
  deleteNote: (node: GraphNode) => void
  copyNote: (node: GraphNode) => void

  traceKind: () => TraceKind | null
  traceSource: () => string | null
  traceOverlay: () => TraceOverlay | null
  traceHistory: () => readonly { kind: TraceKind; source: string; label: string }[]
  startTrace: (kind: TraceKind, source?: string) => void
  traceWhy: (nodeId: string) => void
  traceLedHere: (nodeId: string) => void
  traceRelated: (nodeId: string) => void
  traceDownstream: (nodeId: string) => void
  traceBack: () => void
  traceForward: () => void
  clearTrace: () => void
  copyTraceOutline: () => void
  stepLitNode: (direction: 1 | -1) => string | undefined
  isLit: (nodeId: string) => boolean
  isAnswer: (nodeId: string) => boolean
  isEdgeVisible: (edgeId: string) => boolean
  isAnswerEdge: (edgeId: string) => boolean
}

export function useGraphAnnotations(options: UseGraphAnnotationsOptions): UseGraphAnnotationsReturn {
  const i18n = useI18n()
  const notes = options.notes
  const setNotes = options.setNotes
  const [noteTarget, setNoteTarget] = createSignal<string>()
  const [editingNote, setEditingNote] = createSignal<string>()

  const nodeLookup = options.nodeLookup ?? useNodeLookup(options.model)

  const [traceKind, setTraceKind] = createSignal<TraceKind | null>(null)
  const [traceSource, setTraceSource] = createSignal<string | null>(null)
  const [traceHistory, setTraceHistory] = createSignal<{ kind: TraceKind; source: string; label: string }[]>([])
  const [historyIndex, setHistoryIndex] = createSignal(-1)

  const traceOverlay = createMemo<TraceOverlay | null>(() => {
    const kind = traceKind()
    const source = traceSource()
    if (!kind || !source) return null
    return classifyTrace(options.model(), kind, source)
  })

  const openNoteComposer = () => {
    const id = options.selection()[0]
    if (!id) return
    const node = nodeLookup()(id)
    if (!node) return
    if (node.kind === "note") {
      const data = noteData(node)
      if (!data) return
      setEditingNote(data.noteID)
      setNoteTarget(data.target)
      return
    }
    setEditingNote(undefined)
    setNoteTarget(id)
  }

  const closeNoteComposer = () => {
    setEditingNote(undefined)
    setNoteTarget(undefined)
  }

  const saveNote = (body: string) => {
    const target = noteTarget()
    if (!target) return
    const editing = editingNote()
    if (editing) {
      if (body.trim().length === 0) {
        setNotes(produce<Annotations>((all) => void delete all[editing]))
        options.onAnnounce(i18n.t("ui.sessionGraph.note.deleted"))
      } else {
        setNotes(editing, "body", body)
        options.onAnnounce(i18n.t("ui.sessionGraph.note.updated"))
      }
      closeNoteComposer()
      return
    }
    const id = crypto.randomUUID()
    setNotes(id, { id, target, body, createdAt: Date.now() })
    options.onAnnounce(i18n.t("ui.sessionGraph.note.added"))
    closeNoteComposer()
  }

  const editNote = (node: GraphNode) => {
    openNoteComposer()
  }

  const deleteNote = (node: GraphNode) => {
    const data = noteData(node)
    if (!data) return
    setNotes(produce<Annotations>((all) => void delete all[data.noteID]))
    options.onAnnounce(i18n.t("ui.sessionGraph.note.deleted"))
  }

  const copyNote = (node: GraphNode) => {
    const body = typeof node.summary === "string" ? node.summary : node.label
    navigator.clipboard?.writeText(body)
    options.onAnnounce(i18n.t("ui.sessionGraph.note.copied"))
  }

  const pushHistory = (kind: TraceKind, source: string, label: string) => {
    setTraceHistory((prev) => {
      const truncated = prev.slice(0, historyIndex() + 1)
      return [...truncated, { kind, source, label }]
    })
    setHistoryIndex((i) => i + 1)
  }

  const clearTrace = () => {
    setTraceKind(null)
    setTraceSource(null)
  }

  const startTrace = (kind: TraceKind, source?: string) => {
    const from = source ?? options.selection()[0]
    if (!from) return
    setTraceKind(kind)
    setTraceSource(from)
    const node = nodeLookup()(from)
    const label = node?.label ?? from
    pushHistory(kind, from, label)
    const messages: Record<TraceKind, string> = {
      why: i18n.t("ui.sessionGraph.trace.whyAnnouncement", { label }),
      "led-here": i18n.t("ui.sessionGraph.trace.ledHereAnnouncement", { label }),
      related: i18n.t("ui.sessionGraph.trace.relatedAnnouncement", { label }),
      downstream: i18n.t("ui.sessionGraph.trace.downstreamAnnouncement", { label }),
    }
    options.onAnnounce(messages[kind])
  }

  const traceBack = () => {
    if (historyIndex() <= 0) return
    const newIndex = historyIndex() - 1
    setHistoryIndex(newIndex)
    const entry = traceHistory()[newIndex]
    setTraceKind(entry.kind)
    setTraceSource(entry.source)
    const node = nodeLookup()(entry.source)
    const label = node?.label ?? entry.source
    options.onAnnounce(i18n.t("ui.sessionGraph.trace.backAnnouncement", { label }))
  }

  const traceForward = () => {
    if (historyIndex() >= traceHistory().length - 1) return
    const newIndex = historyIndex() + 1
    setHistoryIndex(newIndex)
    const entry = traceHistory()[newIndex]
    setTraceKind(entry.kind)
    setTraceSource(entry.source)
    const node = nodeLookup()(entry.source)
    const label = node?.label ?? entry.source
    options.onAnnounce(i18n.t("ui.sessionGraph.trace.forwardAnnouncement", { label }))
  }

  const copyTraceOutline = () => {
    const overlay = traceOverlay()
    if (!overlay) return
    const text = copyTraceAsOutline(options.model(), overlay, breadcrumbs)
    navigator.clipboard?.writeText(text)
    options.onAnnounce(i18n.t("ui.sessionGraph.trace.copied"))
  }

  const step = (direction: 1 | -1) => {
    const overlay = traceOverlay()
    if (!overlay) return undefined
    const current = options.selection()[0]
    return stepLitNode(overlay, current, direction)
  }

  const isLit = (nodeId: string) => {
    const overlay = traceOverlay()
    if (!overlay) return false
    return overlay.answerIds.has(nodeId) || overlay.contextIds.has(nodeId)
  }

  const isAnswer = (nodeId: string) => {
    const overlay = traceOverlay()
    if (!overlay) return false
    return overlay.answerIds.has(nodeId)
  }

  const isEdgeVisible = (edgeId: string) => {
    const overlay = traceOverlay()
    if (!overlay) return true
    return overlay.visibleEdgeIds.has(edgeId)
  }

  const isAnswerEdge = (edgeId: string) => {
    const overlay = traceOverlay()
    if (!overlay) return false
    return overlay.answerEdgeIds.has(edgeId)
  }

  const traceWhy = (nodeId: string) => startTrace("why", nodeId)
  const traceLedHere = (nodeId: string) => startTrace("led-here", nodeId)
  const traceRelated = (nodeId: string) => startTrace("related", nodeId)
  const traceDownstream = (nodeId: string) => startTrace("downstream", nodeId)

  return {
    notes,
    noteTarget,
    editingNote,
    openNoteComposer,
    closeNoteComposer,
    saveNote,
    editNote,
    deleteNote,
    copyNote,
    traceKind,
    traceSource,
    traceOverlay,
    traceHistory: () => traceHistory(),
    startTrace,
    traceWhy,
    traceLedHere,
    traceRelated,
    traceDownstream,
    traceBack,
    traceForward,
    clearTrace,
    copyTraceOutline,
    stepLitNode: step,
    isLit,
    isAnswer,
    isEdgeVisible,
    isAnswerEdge,
  }
}