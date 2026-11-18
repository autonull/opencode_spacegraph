import { Show } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import type { ComparisonChanges } from "./useComparison"

export type GraphCompareBarProps = {
  diff: ComparisonChanges | undefined
  onOpenWindow: () => void
  onClear: () => void
}

export const GraphCompareBar = (props: GraphCompareBarProps) => {
  const i18n = useI18n()
  const { diff } = props

  return (
    <Show when={diff}>
      {(d) => (
        <div
          data-slot="graph-compare-bar"
          class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base px-2 py-1 text-12-regular text-text-weak"
        >
          <span data-slot="graph-compare-counts" class="tabular-nums">
            {i18n.t("ui.sessionGraph.compare.chip", {
              added: String(d().counts.added),
              removed: String(d().counts.removed),
              changed: String(d().counts.changed),
            })}
          </span>
          <span class="min-w-0 flex-1 truncate">
            {i18n.t(
              d().label === "turns" ? "ui.sessionGraph.compare.twoTurns" : "ui.sessionGraph.compare.parked",
            )}
          </span>
          <button
            type="button"
            data-slot="graph-compare-open"
            class="shrink-0 rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={props.onOpenWindow}
          >
            {i18n.t("ui.sessionGraph.compare.window")}
          </button>
          <button
            type="button"
            data-slot="graph-compare-clear"
            class="shrink-0 rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={props.onClear}
          >
            {i18n.t("ui.sessionGraph.compare.live")}
          </button>
        </div>
      )}
    </Show>
  )
}