import { createMemo } from "solid-js"
import { incoming, outgoing, type GraphViewData, type TraceOverlay } from "@opencode/session-ui/graph"
import { type UseGraphAnnotationsReturn } from "./useGraphAnnotations"

/**
 * Merges the explicit trace overlay (why/led-here/related) with the focus overlay
 * (execution-level neighborhood dimming). Explicit trace takes precedence over focus.
 */
export function createMergedTraceOverlay(
  annotations: UseGraphAnnotationsReturn,
  model: () => GraphViewData,
  level: () => "overview" | "execution" | "detail",
  selection: () => readonly string[],
) {
  return createMemo<TraceOverlay | undefined>(() => {
    const explicitOverlay = annotations.traceOverlay()

    // Focus dimming: at execution level, compute 1-hop neighborhood of selected node.
    // Explicit trace (why/led-here/related) takes precedence over focus.
    const selectedId = selection()[0]
    const focusOverlay =
      level() === "execution" && selectedId
        ? (() => {
            const answerIds = new Set<string>([selectedId])
            const contextIds = new Set<string>()
            for (const edge of incoming(model(), selectedId)) contextIds.add(edge.source)
            for (const edge of outgoing(model(), selectedId)) contextIds.add(edge.target)
            return {
              answerIds: answerIds as ReadonlySet<string>,
              contextIds: contextIds as ReadonlySet<string>,
              answerEdgeIds: new Set<string>() as ReadonlySet<string>,
              visibleEdgeIds: new Set<string>() as ReadonlySet<string>,
            }
          })()
        : undefined

    // Merge traces: explicit trace wins over focus
    return explicitOverlay ?? focusOverlay
  })
}