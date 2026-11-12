import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphViewData, TurnStats } from "@opencode/session-ui/graph"
import { For, Show, createSignal } from "solid-js"

export type GraphCompareChanges = {
  added: ReadonlySet<string>
  removed: ReadonlySet<string>
  changed: ReadonlySet<string>
  turnStats?: TurnStats[]
  diffModel?: GraphViewData
}

/**
 * Compare-as-window: the same three counts the status chip shows, with the nodes named. The window is
 * screen space and the manager stays content-free; this component owns only the comparison's words.
 * Also supports a visual graph diff view when diffModel is provided.
 */
export const GraphCompare = (props: { model: GraphViewData; changes: GraphCompareChanges }) => {
  const i18n = useI18n()
  const [view, setView] = createSignal<"text" | "visual">("text")
  const sections = () => [
    { key: "added", label: i18n.t("ui.sessionGraph.compare.added"), ids: props.changes.added },
    { key: "removed", label: i18n.t("ui.sessionGraph.compare.removed"), ids: props.changes.removed },
    { key: "changed", label: i18n.t("ui.sessionGraph.compare.changed"), ids: props.changes.changed },
  ]
  const label = (id: string) => props.model.nodes.find((node) => node.id === id)?.label ?? id
  const empty = () => props.changes.added.size + props.changes.removed.size + props.changes.changed.size === 0
  const hasTurnStats = () => (props.changes.turnStats?.length ?? 0) > 0
  const hasVisualDiff = () => !!props.changes.diffModel && props.changes.diffModel!.nodes.length > 0

  return (
    <div data-slot="graph-compare-window" class="p-3 flex flex-col gap-4">
      <Show when={hasVisualDiff()}>
        <div class="flex gap-1 border-b border-border-weaker-base pb-2">
          <button
            type="button"
            class="px-2 py-1 text-12-regular rounded-sm transition-colors"
            classList={{ "bg-surface-base-hover text-text-strong": view() === "text", "text-text-weak hover:bg-surface-base-hover": view() !== "text" }}
            onClick={() => setView("text")}
          >
            {i18n.t("ui.sessionGraph.compare.textTab")}
          </button>
          <button
            type="button"
            class="px-2 py-1 text-12-regular rounded-sm transition-colors"
            classList={{ "bg-surface-base-hover text-text-strong": view() === "visual", "text-text-weak hover:bg-surface-base-hover": view() !== "visual" }}
            onClick={() => setView("visual")}
          >
            {i18n.t("ui.sessionGraph.compare.visualTab")}
          </button>
        </div>
      </Show>

      <Show when={view() === "text"}>
        <Show
          when={!empty()}
          fallback={<div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.compare.empty")}</div>}
        >
          <For each={sections()}>
            {(section) => (
              <Show when={section.ids.size > 0}>
                <div class="mt-2 first:mt-0" data-slot="graph-compare-section" data-diff={section.key}>
                  <div class="text-12-medium text-text-strong">
                    {section.label} <span class="tabular-nums text-text-weak">{section.ids.size}</span>
                  </div>
                  <ul class="mt-1 flex flex-col gap-0.5">
                    <For each={[...section.ids]}>
                      {(id) => (
                        <li class="truncate text-12-regular text-text-base" title={label(id)}>
                          {label(id)}
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              </Show>
            )}
          </For>
        </Show>

        <Show when={hasTurnStats()}>
          <div class="border-t border-border-weaker-base pt-3">
            <div class="text-12-medium text-text-strong mb-2">{i18n.t("ui.sessionGraph.compare.turnStats")}</div>
            <div class="overflow-x-auto">
              <table class="w-full text-12-regular text-text-base">
                <thead>
                  <tr class="text-start text-text-weak border-b border-border-weaker-base">
                    <th class="pb-1 pe-2">{i18n.t("ui.sessionGraph.compare.turn")}</th>
                    <th class="pb-1 pe-2 tabular-nums">{i18n.t("ui.sessionGraph.compare.files")}</th>
                    <th class="pb-1 pe-2 tabular-nums">{i18n.t("ui.sessionGraph.compare.tools")}</th>
                    <th class="pb-1 pe-2 tabular-nums">{i18n.t("ui.sessionGraph.compare.errors")}</th>
                    <th class="pb-1 pe-2 tabular-nums">{i18n.t("ui.sessionGraph.compare.retries")}</th>
                    <th class="pb-1 tabular-nums">{i18n.t("ui.sessionGraph.compare.duration")}</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={props.changes.turnStats ?? []}>
                    {(stat) => (
                      <tr class="border-b border-border-weaker-base/50 last:border-0">
                        <td class="py-1 pe-2">{i18n.t("ui.sessionGraph.compare.turnNumber", { num: stat.turnNumber })}</td>
                        <td class="py-1 pe-2 tabular-nums">{stat.filesTouched}</td>
                        <td class="py-1 pe-2 tabular-nums">{stat.toolsRun}</td>
                        <td class="py-1 pe-2 tabular-nums text-text-on-critical-base">{stat.errors}</td>
                        <td class="py-1 pe-2 tabular-nums text-text-on-warning-base">{stat.retries}</td>
                        <td class="py-1 tabular-nums">{Math.round(stat.durationMs / 1000)}s</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      </Show>

      <Show when={view() === "visual" && hasVisualDiff()}>
        <div class="flex-1 min-h-0" data-slot="graph-compare-visual">
          <GraphVisualDiff model={props.changes.diffModel!} />
        </div>
      </Show>

      <Show when={view() === "visual" && !hasVisualDiff()}>
        <div class="text-12-regular text-text-weak">{i18n.t("ui.sessionGraph.compare.empty")}</div>
      </Show>
    </div>
  )
}

const GraphVisualDiff = (props: { model: GraphViewData }) => {
  const i18n = useI18n()
  // Simple inline SVG-based visualization of the diff graph
  // For now, render a compact node list with connections shown
  // In the future, this could use a lightweight renderer

  const nodes = props.model.nodes
  const edges = props.model.edges

  return (
    <div class="flex flex-col gap-3 overflow-auto">
      <div class="text-12-medium text-text-strong mb-2">
        {i18n.t("ui.sessionGraph.compare.visualTitle", { count: nodes.length })}
      </div>
      <div class="space-y-2 max-h-96 overflow-auto">
        <For each={nodes}>
          {(node) => (
            <div class="flex items-center gap-2 px-2 py-1 rounded-sm bg-surface-base-hover text-12-regular text-text-base" title={node.id}>
              <span class="w-4 h-4 rounded-full flex-shrink-0"
                style={{
                  "background-color":
                    node.kind === "turn" ? "var(--color-success)" :
                    node.kind === "tool" ? "var(--color-primary)" :
                    node.kind === "file" ? "var(--color-warning)" :
                    node.kind === "error" ? "var(--color-critical)" :
                    "var(--color-text-weak)"
                }}
              />
              <span class="truncate flex-1">{node.label}</span>
              <span class="text-text-weak text-11-regular">{node.kind}</span>
            </div>
          )}
        </For>
      </div>
      <Show when={edges.length > 0}>
        <div class="border-t border-border-weaker-base pt-2">
          <div class="text-11-regular text-text-weak mb-1">{i18n.t("ui.sessionGraph.compare.edges", { count: edges.length })}</div>
          <div class="space-y-1 max-h-48 overflow-auto text-11-regular text-text-weaker">
            <For each={edges.slice(0, 20)}>
              {(edge) => (
                <div class="truncate">
                  {edge.source} → {edge.target} <span class="text-text-weaker">({edge.kind})</span>
                </div>
              )}
            </For>
            <Show when={edges.length > 20}>
              <div>... and {edges.length - 20} more edges</div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}
