import { useI18n } from "@opencode/ui/context/i18n"
import { For, Show } from "solid-js"
import type { CompactionAnalysis, CompactionNode } from "@opencode/session-ui/graph"
import { analyzeCompaction, filterByCompactionPriority, getCompactionSummary } from "@opencode/session-ui/graph"
import type { GraphViewData } from "@opencode/session-ui/graph"

export type GraphCompactionAdvisorProps = {
  model: GraphViewData
}

const PRIORITY_ORDER: CompactionAnalysis["nodes"][0]["compactionPriority"][] = [
  "critical",
  "high",
  "normal",
  "low",
  "drop",
]

const PRIORITY_LABELS = {
  critical: "ui.sessionGraph.compactionAdvisor.priorityCritical",
  high: "ui.sessionGraph.compactionAdvisor.priorityHigh",
  normal: "ui.sessionGraph.compactionAdvisor.priorityNormal",
  low: "ui.sessionGraph.compactionAdvisor.priorityLow",
  drop: "ui.sessionGraph.compactionAdvisor.priorityDrop",
} as const

const PRIORITY_COLORS = {
  critical: "var(--color-success)",
  high: "var(--color-primary)",
  normal: "var(--color-warning)",
  low: "var(--color-critical)",
  drop: "var(--color-text-weaker)",
} as const

export const GraphCompactionAdvisor = (props: GraphCompactionAdvisorProps) => {
  const i18n = useI18n()
  const analysis = analyzeCompaction(props.model)

  const nodesByPriority = (priority: CompactionNode["compactionPriority"]) =>
    filterByCompactionPriority(analysis, priority)

  const totalNodes = analysis.nodes.length
  const keptAtNormal = nodesByPriority("normal").length + nodesByPriority("high").length + nodesByPriority("critical").length

  return (
    <div class="p-3 flex flex-col gap-4 max-h-[600px] overflow-auto">
      <div class="flex items-center justify-between gap-2">
        <div class="text-12-medium text-text-strong">
          {i18n.t("ui.sessionGraph.compactionAdvisor.title")}
        </div>
        <span class="text-11-regular text-text-weak tabular-nums">
          {i18n.t("ui.sessionGraph.compactionAdvisor.tokens", { count: Math.round(totalNodes * 100) })}
        </span>
      </div>

      <Show when={analysis.nodes.length === 0} fallback={
        <>
          <div class="border-t border-border-weaker-base pt-3">
            <div class="text-11-medium text-text-strong mb-2">{i18n.t("ui.sessionGraph.compactionAdvisor.decisionSpine")}</div>
            <div class="space-y-1 max-h-48 overflow-auto text-11-regular text-text-base">
              <For each={analysis.decisionSpine}>
                {(nodeId) => {
                  const node = props.model.nodes.find((n) => n.id === nodeId)
                  return node ? (
                    <div class="flex items-center gap-2 px-2 py-1 rounded-sm bg-surface-base-hover" title={node.id}>
                      <span class="w-2 h-2 rounded-full flex-shrink-0" style={{ "background-color": "var(--color-success)" }} />
                      <span class="truncate flex-1 text-12-regular">{node.label}</span>
                      <span class="text-11-regular text-text-weak">{node.kind}</span>
                    </div>
                  ) : null
                }}
              </For>
            </div>
          </div>

          <div class="border-t border-border-weaker-base pt-3">
            <div class="text-11-medium text-text-strong mb-2">
              {i18n.t("ui.sessionGraph.compactionAdvisor.keep")} ({keptAtNormal}/{totalNodes}) —{" "}
              <span class="text-text-weak">at Normal</span>
            </div>
            <div class="space-y-1 max-h-48 overflow-auto text-11-regular text-text-base">
              <For each={PRIORITY_ORDER.slice(0, 3)}>
                {(priority) => (
                  <Show when={nodesByPriority(priority).length > 0}>
                    <div class="flex items-center gap-2 px-2 py-1 rounded-sm bg-surface-base-hover">
                      <span class="w-2 h-2 rounded-full flex-shrink-0" style={{ "background-color": PRIORITY_COLORS[priority] }} />
                      <span class="text-12-medium">{i18n.t(PRIORITY_LABELS[priority])}</span>
                      <span class="text-text-weak tabular-nums">({nodesByPriority(priority).length})</span>
                    </div>
                  </Show>
                )}
              </For>
            </div>
          </div>

          <div class="border-t border-border-weaker-base pt-3">
            <div class="text-11-medium text-text-strong mb-2">
              {i18n.t("ui.sessionGraph.compactionAdvisor.drop")} ({totalNodes - keptAtNormal}/{totalNodes})
            </div>
            <div class="space-y-1 max-h-48 overflow-auto text-11-regular text-text-weaker">
              <For each={PRIORITY_ORDER.slice(3)}>
                {(priority) => (
                  <Show when={nodesByPriority(priority).length > 0}>
                    <div class="flex items-center gap-2 px-2 py-1 rounded-sm bg-surface-base-hover/50">
                      <span class="w-2 h-2 rounded-full flex-shrink-0" style={{ "background-color": PRIORITY_COLORS[priority] }} />
                      <span class="text-12-regular">{i18n.t(PRIORITY_LABELS[priority])}</span>
                      <span class="text-text-weaker tabular-nums">({nodesByPriority(priority).length})</span>
                    </div>
                  </Show>
                )}
              </For>
            </div>
          </div>

          <div class="border-t border-border-weaker-base pt-2 text-11-regular text-text-weaker">
            <pre class="whitespace-pre-wrap font-mono">{getCompactionSummary(analysis)}</pre>
          </div>
        </>
      }>
        <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.compactionAdvisor.noModel")}</div>
      </Show>
    </div>
  )
}