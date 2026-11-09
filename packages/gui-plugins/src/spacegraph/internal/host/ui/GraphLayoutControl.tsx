import { LAYOUTS, type Layout, VOCABULARY_KEYS } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"
import { ToolbarMenu } from "./ToolbarMenu"

export type GraphLayoutControlProps = {
  layout?: Layout
  onLayoutChange?: (layout: Layout) => void
}

export const GraphLayoutControl = (props: GraphLayoutControlProps) => {
  const i18n = useI18n()

  return (
    <Show when={props.onLayoutChange}>
      <ToolbarMenu
        slot="graph-toolbar-layout"
        label={i18n.t("ui.sessionGraph.toolbar.layout")}
        icon="workspace-isolated"
        value={i18n.t(VOCABULARY_KEYS.layout[props.layout ?? "lanes"])}
        valueSlot="graph-layout-name"
      >
        {LAYOUTS.map((layout) =>
          (
            <button
              type="button"
              data-slot="graph-layout-option"
              data-value={layout}
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
              aria-pressed={props.layout === layout}
              onClick={(event) => {
                const menu = event.currentTarget.closest("details")
                if (menu) menu.open = false
                props.onLayoutChange?.(layout)
              }}
            >
              {i18n.t(VOCABULARY_KEYS.layout[layout])}
            </button>
          )
        )}
      </ToolbarMenu>
    </Show>
  )
}

