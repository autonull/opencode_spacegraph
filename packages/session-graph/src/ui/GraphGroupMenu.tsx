import { Show } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphViewData } from "@opencode/session-ui/graph"

export type GraphGroupMenuProps = {
  id: string
  x: number
  y: number
  model: () => GraphViewData
  collapsedGroups: ReadonlySet<string>
  onToggleGroup: (id: string) => void
  onCollapseOthers: () => void
  onFrame: (id: string) => void
  onClose: () => void
}

export const GraphGroupMenu = (props: GraphGroupMenuProps) => {
  const i18n = useI18n()
  const group = () => {
    const node = props.model().nodes.find((item) => item.id === props.id)
    return node
  }

  return (
    <Show when={group()}>
      {(node) => (
        <div
          data-slot="graph-group-menu"
          role="menu"
          class="absolute z-30 flex min-w-40 flex-col rounded-md border border-border-weaker-base bg-surface-base p-1 shadow-lg"
          style={{ left: `${props.x}px`, top: `${props.y}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            class="rounded-sm px-2 py-1 text-start text-12-regular text-text-base hover:bg-surface-base-hover"
            onClick={() => {
              props.onToggleGroup(props.id)
              props.onClose()
            }}
          >
            {i18n.t(
              props.collapsedGroups.has(props.id)
                ? "ui.sessionGraph.status.expandGroup"
                : "ui.sessionGraph.status.collapseGroup",
            )}
          </button>
          <button
            type="button"
            role="menuitem"
            class="rounded-sm px-2 py-1 text-start text-12-regular text-text-base hover:bg-surface-base-hover"
            onClick={() => {
              props.onCollapseOthers()
              props.onClose()
            }}
          >
            {i18n.t("ui.sessionGraph.status.collapseOthers")}
          </button>
          <button
            type="button"
            role="menuitem"
            class="rounded-sm px-2 py-1 text-start text-12-regular text-text-base hover:bg-surface-base-hover"
            onClick={() => {
              props.onFrame(props.id)
              props.onClose()
            }}
          >
            {i18n.t("ui.sessionGraph.status.frame")}
          </button>
        </div>
      )}
    </Show>
  )
}