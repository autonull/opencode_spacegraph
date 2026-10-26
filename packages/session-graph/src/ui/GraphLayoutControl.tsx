import { LAYOUTS, type Layout, VOCABULARY_KEYS } from "@opencode/session-ui/graph"
import { Icon } from "@opencode/ui/icon"
import { useI18n } from "@opencode/ui/context/i18n"
import { type JSX } from "solid-js"

const ToolbarMenu = (props: {
  slot: string
  label: string
  icon: string
  value?: string
  valueSlot?: string
  align?: "start" | "end"
  children: JSX.Element
}) => (
  <details class="relative" data-slot={props.slot}>
    <summary
      class="flex h-6 cursor-pointer list-none items-center gap-1 rounded-sm px-1 text-12-regular text-text-base hover:bg-surface-base-hover [&::-webkit-details-marker]:hidden"
      aria-label={props.label}
      title={props.label}
    >
      <Icon name={props.icon} size="small" />
      {props.value ? <span data-slot={props.valueSlot ?? `${props.slot}-value`}>{props.value}</span> : null}
      {props.value ? <Icon name="outline-chevron-down" size="small" /> : null}
    </summary>
    <div
      class="absolute z-30 mt-1 flex min-w-[180px] flex-col items-start gap-2 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md"
      classList={{ "start-0": props.align === "start", "end-0": props.align !== "start" }}
    >
      {props.children}
    </div>
  </details>
)

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

import { Show } from "solid-js"