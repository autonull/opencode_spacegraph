import { createMemo, createSignal, type Accessor } from "solid-js"
import { breadcrumbs, nodeByID, type Annotations, type GraphNode, type GraphViewData } from "../../model"
import { noteData } from "./node-data"
import {
  classifyTrace,
  copyTraceAsOutline,
  downstreamForks,
  stepLitNode,
  type TraceKind,
  type TraceOverlay,
} from "./overlay"

export type TraceHistoryEntry = { kind: TraceKind; source: string; label: string }

export type AnnotationI18n = {
  t: (key: string, params?: Record<string, string | number | boolean>) => string
  plural: (key: string, count: number, params?: Record<string, string | number | boolean>) => string
}

export type GraphAnnotationsInput = {
  model: Accessor<GraphViewData>
  selection: Accessor<readonly string[]>
  i18n: AnnotationI18n
  notes: () => Annotations
  setNotes: (notes: Annotations) => void
  onAnnounce?: (message: string) => void
  traceKind?: Accessor<TraceKind | null>
  onTraceKindChange?: (kind: TraceKind | null) => void
  traceSource?: Accessor<string | null>
  onTraceSourceChange?: (source: string | null) => void
  traceHistory?: Accessor<readonly TraceHistoryEntry[]>
  onTraceHistoryChange?: (history: readonly TraceHistoryEntry[]) => void
  traceHistoryIndex?: Accessor<number>
  onTraceHistoryIndexChange?: (index: number) => void
}

export type GraphAnnotations = {
  noteTarget: Accessor<string | undefined>
  editingNote: Accessor<string | undefined>
  openNoteComposer: () => void
  closeNoteComposer: () => void
  saveNote: (body: string) => void
  editNote: (node: GraphNode) => void
  deleteNote: (node: GraphNode) => void
  copyNote: (node: GraphNode) => void
  traceKind: Accessor<TraceKind | null>
  traceSource: Accessor<string | null>
  traceOverlay: Accessor<TraceOverlay | null>
  traceHistory: Accessor<readonly TraceHistoryEntry[]>
  historyIndex: Accessor<number>
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

/**
 * Headless counterpart of the fork's `useGraphAnnotations`. It owns the note composer and the trace
 * walker over plugin-owned state: i18n comes from `ctx`, notes from the session store, and the trace
 * axes can be controlled by the model so the map and transcript surfaces stay in step.
 */
export function createGraphAnnotations(input: GraphAnnotationsInput): GraphAnnotations {
  const { i18n, notes, setNotes, onAnnounce } = input
  const announce = (message: string) => onAnnounce?.(message)
  const lookup = (id: string) => nodeByID(input.model(), id)

  const [noteTarget, setNoteTarget] = createSignal<string>()
  const [editingNote, setEditingNote] = createSignal<string>()

  const [localKind, setLocalKind] = createSignal<TraceKind | null>(null)
  const [localSource, setLocalSource] = createSignal<string | null>(null)
  const [localHistory, setLocalHistory] = createSignal<readonly TraceHistoryEntry[]>([])
  const [localIndex, setLocalIndex] = createSignal(-1)

  const traceKind: Accessor<TraceKind | null> = input.traceKind ?? localKind
  const setKind = (kind: TraceKind | null) => {
    setLocalKind(kind)
    input.onTraceKindChange?.(kind)
  }
  const traceSource: Accessor<string | null> = input.traceSource ?? localSource
  const setSource = (source: string | null) => {
    setLocalSource(source)
    input.onTraceSourceChange?.(source)
  }
  const traceHistory: Accessor<readonly TraceHistoryEntry[]> = input.traceHistory ?? localHistory
  const setHistory = (history: readonly TraceHistoryEntry[] | ((previous: readonly TraceHistoryEntry[]) => readonly TraceHistoryEntry[])) => {
    const next = typeof history === "function" ? history(traceHistory()) : history
    setLocalHistory(next)
    input.onTraceHistoryChange?.(next)
  }
  const historyIndex: Accessor<number> = input.traceHistoryIndex ?? localIndex
  const setIndex = (index: number) => {
    setLocalIndex(index)
    input.onTraceHistoryIndexChange?.(index)
  }

  const traceOverlay = createMemo<TraceOverlay | null>(() => {
    const kind = traceKind()
    const source = traceSource()
    if (!kind || !source) return null
    return classifyTrace(input.model(), kind, source)
  })

  const openNoteComposer = () => {
    const id = input.selection()[0]
    if (!id) return
    const node = lookup(id)
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
    const next = { ...notes() }
    if (editing) {
      if (body.trim().length === 0) {
        delete next[editing]
        announce(i18n.t("ui.sessionGraph.note.deleted"))
      } else {
        next[editing] = { ...next[editing], body }
        announce(i18n.t("ui.sessionGraph.note.updated"))
      }
    } else {
      const id = crypto.randomUUID()
      next[id] = { id, target, body, createdAt: Date.now() }
      announce(i18n.t("ui.sessionGraph.note.added"))
    }
    setNotes(next)
    closeNoteComposer()
  }

  const deleteNote = (node: GraphNode) => {
    const data = noteData(node)
    if (!data) return
    const next = { ...notes() }
    delete next[data.noteID]
    setNotes(next)
    announce(i18n.t("ui.sessionGraph.note.deleted"))
  }

  const copyNote = (node: GraphNode) => {
    const body = typeof node.summary === "string" ? node.summary : node.label
    void navigator.clipboard?.writeText(body)
    announce(i18n.t("ui.sessionGraph.note.copied"))
  }

  const pushHistory = (kind: TraceKind, source: string, label: string) => {
    setHistory((previous) => [...previous.slice(0, historyIndex() + 1), { kind, source, label }])
    setIndex(historyIndex() + 1)
  }

  const clearTrace = () => {
    setKind(null)
    setSource(null)
  }

  const startTrace = (kind: TraceKind, source?: string) => {
    const from = source ?? input.selection()[0]
    if (!from) return
    setKind(kind)
    setSource(from)
    const label = lookup(from)?.label ?? from
    pushHistory(kind, from, label)
    const forks = kind === "downstream" ? downstreamForks(input.model(), from) : new Set<string>()
    const messages: Record<TraceKind, string> = {
      why: i18n.t("ui.sessionGraph.trace.whyAnnouncement", { label }),
      "led-here": i18n.t("ui.sessionGraph.trace.ledHereAnnouncement", { label }),
      related: i18n.t("ui.sessionGraph.trace.relatedAnnouncement", { label }),
      downstream:
        forks.size > 0
          ? i18n.plural("ui.sessionGraph.trace.downstreamForkAnnouncement", forks.size, { label })
          : i18n.t("ui.sessionGraph.trace.downstreamAnnouncement", { label }),
    }
    announce(messages[kind])
  }

  const restore = (index: number, key: "backAnnouncement" | "forwardAnnouncement") => {
    const entry = traceHistory()[index]
    if (!entry) return
    setIndex(index)
    setKind(entry.kind)
    setSource(entry.source)
    const label = lookup(entry.source)?.label ?? entry.source
    announce(i18n.t(`ui.sessionGraph.trace.${key}`, { label }))
  }

  const traceBack = () => {
    if (historyIndex() <= 0) return
    restore(historyIndex() - 1, "backAnnouncement")
  }

  const traceForward = () => {
    if (historyIndex() >= traceHistory().length - 1) return
    restore(historyIndex() + 1, "forwardAnnouncement")
  }

  const copyTraceOutline = () => {
    const overlay = traceOverlay()
    if (!overlay) return
    const text = copyTraceAsOutline(input.model(), overlay, breadcrumbs)
    void navigator.clipboard?.writeText(text)
    announce(i18n.t("ui.sessionGraph.trace.copied"))
  }

  const step = (direction: 1 | -1) => {
    const overlay = traceOverlay()
    if (!overlay) return undefined
    return stepLitNode(overlay, input.selection()[0], direction)
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

  return {
    noteTarget,
    editingNote,
    openNoteComposer,
    closeNoteComposer,
    saveNote,
    editNote: openNoteComposer,
    deleteNote,
    copyNote,
    traceKind,
    traceSource,
    traceOverlay,
    traceHistory: () => traceHistory(),
    historyIndex,
    startTrace,
    traceWhy: (nodeId) => startTrace("why", nodeId),
    traceLedHere: (nodeId) => startTrace("led-here", nodeId),
    traceRelated: (nodeId) => startTrace("related", nodeId),
    traceDownstream: (nodeId) => startTrace("downstream", nodeId),
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
