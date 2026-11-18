import { Show } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphViewData, GraphNode, ZoomLevel } from "@opencode/session-ui/graph"
import { nodeByID, isVisibleAt } from "@opencode/session-ui/graph"

export type GraphHiddenSelectionProps = {
  model: () => GraphViewData
  selection: () => readonly string[]
  level: () => ZoomLevel
  onJumpTo: (node: GraphNode) => void
}

export const GraphHiddenSelection = (props: GraphHiddenSelectionProps) => {
  const i18n = useI18n()
  const selectedNode = () => {
    const id = props.selection()[0]
    return id ? nodeByID(props.model(), id) : undefined
  }
  const hiddenNode = () => {
    const node = selectedNode()
    return node && !isVisibleAt(node, props.level()) ? node : undefined
  }

  return (
    <Show when={hiddenNode()}>
      {(node) => (
        <div
          data-slot="graph-selection-hidden"
          class="flex items-center gap-2 border-b border-border-weaker-base px-3 py-1 text-12-regular text-text-weak"
        >
          <span class="min-w-0 flex-1 truncate">
            {i18n.t("ui.sessionGraph.selection.hidden", { label: node().label })}
          </span>
          <button
            type="button"
            class="shrink-0 rounded-sm px-1 text-text-base hover:text-text-strong"
            onClick={() => props.onJumpTo(node())}
          >
            {i18n.t("ui.sessionGraph.selection.show")}
          </button>
        </div>
      )}
    </Show>
  )
}