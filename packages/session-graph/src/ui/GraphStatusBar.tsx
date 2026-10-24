import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"
import { GraphIconButton } from "./GraphIconButton"

export type GraphStatusBarProps = {
  /** How many nodes the verbs act on. The bar is absent at zero. */
  count: number
  onFrame: () => void
  onKeepOnly: () => void
  onCopyPaths: () => void
  onExportSubset: () => void
  onClear: () => void
}

/**
 * B1 — the selection is a set, not a click. Every verb is pure over the selected ids, so the bar
 * never owns state: it names what the reader can do with what they are holding.
 */
export const GraphStatusBar = (props: GraphStatusBarProps) => {
  const i18n = useI18n()

  return (
    <Show when={props.count > 0}>
      <div
        data-component="session-graph-status-bar"
        data-slot="graph-status-bar"
        data-selection-count={props.count}
        class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-weak"
      >
        <span data-slot="graph-status-count" class="tabular-nums">
          {i18n.plural("ui.sessionGraph.status.count", props.count)}
        </span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            data-slot="graph-status-frame"
            class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={() => props.onFrame()}
          >
            {i18n.t("ui.sessionGraph.status.frame")}
          </button>
          <button
            type="button"
            data-slot="graph-status-keep-only"
            class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={() => props.onKeepOnly()}
          >
            {i18n.t("ui.sessionGraph.status.keepOnly")}
          </button>
          <button
            type="button"
            data-slot="graph-status-copy-paths"
            class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={() => props.onCopyPaths()}
          >
            {i18n.t("ui.sessionGraph.status.copyPaths")}
          </button>
          <button
            type="button"
            data-slot="graph-status-export"
            class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
            onClick={() => props.onExportSubset()}
          >
            {i18n.t("ui.sessionGraph.status.exportSubset")}
          </button>
        </div>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.status.clear")}
          icon="close-small"
          onClick={() => props.onClear()}
        />
      </div>
    </Show>
  )
}
