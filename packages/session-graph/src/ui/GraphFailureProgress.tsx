import type { GraphViewData, GraphNode } from "@opencode/session-ui/graph"
import { failures, sessionProgress } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { escapeHtml } from "../canvas/buildRenderModel"
import type { TraceOverlay } from "./overlay"

export type GraphFailureProgressProps = {
  model: GraphViewData
  traceOverlay: TraceOverlay | undefined
  onSelect?: (id: string) => void
  onTraceWhy?: (id: string) => void
  onTraceLedHere?: (id: string) => void
  onTraceRelated?: (id: string) => void
  onFrame?: (ids: string[]) => void
}

/**
 * Failure digest + progress window (Slice 6).
 * Shows session progress header and a list of all error/retry nodes in session order.
 * Click a node to select it, run a trace, or frame the camera.
 */
export const GraphFailureProgress = (props: GraphFailureProgressProps) => {
  const i18n = useI18n()

  const failureList = failures(props.model)
  const progress = sessionProgress(props.model)

  const handleNodeClick = (node: GraphNode) => {
    props.onSelect?.(node.id)
    // Also frame the camera on the node
    props.onFrame?.([node.id])
  }

  const handleTraceWhy = (node: GraphNode) => {
    props.onTraceWhy?.(node.id)
  }

  const handleTraceLedHere = (node: GraphNode) => {
    props.onTraceLedHere?.(node.id)
  }

  const handleTraceRelated = (node: GraphNode) => {
    props.onTraceRelated?.(node.id)
  }

  return (
    <div data-slot="graph-failure-progress" class="flex flex-col h-full overflow-hidden">
      {/* Progress header */}
      <div class="flex items-center gap-4 border-b border-border-weaker-base bg-surface-base p-3">
        <div class="flex-1 min-w-0">
          <div class="text-13-medium text-text-base">
            {i18n.t("ui.sessionGraph.failureProgress.header", {
              turn: String(progress.turns),
              files: String(progress.filesTouched),
              tools: String(progress.toolsRun),
              errors: String(progress.errors + progress.retries),
            })}
          </div>
          <div class="flex items-center gap-2 mt-1 text-11-regular text-text-weaker">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-red-500" />
              {i18n.t("ui.sessionGraph.failureProgress.errors", { count: progress.errors })}
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-orange-500" />
              {i18n.t("ui.sessionGraph.failureProgress.retries", { count: progress.retries })}
            </span>
          </div>
        </div>
      </div>

      {/* Failure list */}
      <div class="flex-1 overflow-y-auto p-3">
        {failureList.length === 0 ? (
          <div class="flex h-full items-center justify-center text-text-weak">
            {i18n.t("ui.sessionGraph.failureProgress.none")}
          </div>
        ) : (
          <ul class="flex flex-col gap-2" role="list">
            {failureList.map((item, index) => (
              <li
                class="flex items-start gap-3 rounded-sm border border-border-weaker-base bg-surface-base p-3 hover:bg-surface-base-hover transition-colors cursor-pointer"
                onClick={() => handleNodeClick(item.node)}
                role="listitem"
                tabindex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleNodeClick(item.node)
                  }
                }}
              >
                <span class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-11-medium font-mono text-text-weak bg-surface-muted">
                  {index + 1}
                </span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="flex items-center gap-1 text-12-medium"
                      style={{
                        color: item.node.kind === "error" ? "var(--color-error)" : "var(--color-warning)",
                      }}
                    >
                      {item.node.kind === "error" ? (
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="8" cy="8" r="7" />
                          <path d="M8 4v4M8 11v1" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M13 8a5 5 0 1 1-1.5-3.5" />
                          <path d="M13 2v3h-3" />
                        </svg>
                      )}
                      <span>{i18n.t(`ui.sessionGraph.nodeKind.${item.node.kind}`)}</span>
                    </span>
                    <span class="text-11-regular text-text-weaker">Turn {item.turnNumber}</span>
                  </div>
                  <div class="mt-1 text-12-regular text-text-base truncate">{escapeHtml(item.node.label)}</div>
                  <div class="mt-1 text-11-regular text-text-weaker">{item.turnLabel}</div>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <button
                    type="button"
                    class="flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular text-text-base hover:bg-surface-base-hover transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTraceWhy(item.node)
                    }}
                    aria-label={i18n.t("ui.sessionGraph.failureProgress.traceWhy")}
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <path d="M8 2v12M2 8h12" />
                    </svg>
                    <span>{i18n.t("ui.sessionGraph.failureProgress.traceWhy")}</span>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular text-text-base hover:bg-surface-base-hover transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTraceLedHere(item.node)
                    }}
                    aria-label={i18n.t("ui.sessionGraph.failureProgress.traceLedHere")}
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <path d="M8 2l4 4-4 4" />
                    </svg>
                    <span>{i18n.t("ui.sessionGraph.failureProgress.traceLedHere")}</span>
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular text-text-base hover:bg-surface-base-hover transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTraceRelated(item.node)
                    }}
                    aria-label={i18n.t("ui.sessionGraph.failureProgress.traceRelated")}
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <path d="M8 2a4 4 0 0 1 4 4" />
                      <path d="M12 8a4 4 0 0 1-4 4" />
                    </svg>
                    <span>{i18n.t("ui.sessionGraph.failureProgress.traceRelated")}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}