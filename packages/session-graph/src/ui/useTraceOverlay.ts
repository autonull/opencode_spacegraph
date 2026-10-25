import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal, createMemo } from "solid-js"
import { nodeByID } from "@opencode/session-ui/graph"
import { classifyTrace, copyTraceAsOutline, stepLitNode, type TraceKind, type TraceOverlay } from "./overlay"
import type { GraphViewData } from "@opencode/session-ui/graph"

export type UseTraceOverlayOptions = {
  model: () => GraphViewData
  selection: () => readonly string[]
  onAnnounce: (message: string) => void
}

export type UseTraceOverlayReturn = {
  traceKind: () => TraceKind | null
  traceSource: () => string | null
  traceOverlay: () => TraceOverlay | null
  startTrace: (kind: TraceKind, source?: string) => void
  traceWhy: (nodeId: string) => void
  traceLedHere: (nodeId: string) => void
  traceRelated: (nodeId: string) => void
  clearTrace: () => void
  copyTraceOutline: () => void
  stepLitNode: (direction: 1 | -1) => string | undefined
  isLit: (nodeId: string) => boolean
  isAnswer: (nodeId: string) => boolean
  isEdgeVisible: (edgeId: string) => boolean
  isAnswerEdge: (edgeId: string) => boolean
}

export function useTraceOverlay(options: UseTraceOverlayOptions): UseTraceOverlayReturn {
  const i18n = useI18n()
  const [traceKind, setTraceKind] = createSignal<TraceKind | null>(null)
  const [traceSource, setTraceSource] = createSignal<string | null>(null)

  const traceOverlay = createMemo<TraceOverlay | null>(() => {
    const kind = traceKind()
    const source = traceSource()
    if (!kind || !source) return null
    return classifyTrace(options.model(), kind, source)
  })

  const clearTrace = () => {
    setTraceKind(null)
    setTraceSource(null)
  }

  const startTrace = (kind: TraceKind, source?: string) => {
    const from = source ?? options.selection()[0]
    if (!from) return
    setTraceKind(kind)
    setTraceSource(from)
    const node = nodeByID(options.model(), from)
    const label = node?.label ?? from
    const messages: Record<TraceKind, string> = {
      why: i18n.t("ui.sessionGraph.trace.whyAnnouncement", { label }),
      "led-here": i18n.t("ui.sessionGraph.trace.ledHereAnnouncement", { label }),
      related: i18n.t("ui.sessionGraph.trace.relatedAnnouncement", { label }),
    }
    options.onAnnounce(messages[kind])
  }

  const copyTraceOutline = () => {
    const overlay = traceOverlay()
    if (!overlay) return
    const text = copyTraceAsOutline(options.model(), overlay, (model, id) => {
      const node = nodeByID(model, id)
      if (!node) return []
      const ancestry = []
      let current = node
      while (current) {
        ancestry.unshift(current)
        const parent = nodeByID(model, current.id)
        if (!parent || parent.id === current.id) break
        current = parent
      }
      return ancestry
    })
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

  return {
    traceKind,
    traceSource,
    traceOverlay,
    startTrace,
    traceWhy,
    traceLedHere,
    traceRelated,
    clearTrace,
    copyTraceOutline,
    stepLitNode: step,
    isLit,
    isAnswer,
    isEdgeVisible,
    isAnswerEdge,
  }
}