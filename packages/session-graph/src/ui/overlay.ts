import {
  type TraceKind,
  type TraceOverlay,
  classifyTrace,
  traceWhy,
  traceLedHere,
  traceRelated,
  litNodeIds,
  stepLitNode,
  copyTraceAsOutline,
  isLit,
  isAnswer,
  isEdgeVisible,
  isAnswerEdge,
} from "@opencode/session-ui/graph"

export type { TraceKind, TraceOverlay }

export {
  classifyTrace,
  traceWhy,
  traceLedHere,
  traceRelated,
  litNodeIds,
  stepLitNode,
  copyTraceAsOutline,
  isLit,
  isAnswer,
  isEdgeVisible,
  isAnswerEdge,
}