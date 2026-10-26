import { useI18n } from "@opencode/ui/context/i18n"
import { type RenderModel } from "@spacegraphjs/renderer"
import { Icon } from "@opencode/ui/icon"
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

export type GraphExportControlProps = {
  onExport?: (format: "svg" | "json" | "html", model: RenderModel) => void
  renderModel?: RenderModel
  onCopyView?: () => void
}

export const GraphExportControl = (props: GraphExportControlProps) => {
  const i18n = useI18n()

  const option = (input: {
    label: string
    onClick: () => void
    slot?: string
    value?: string
  }) => (
    <button
      type="button"
      data-slot={input.slot}
      data-value={input.value}
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
      onClick={(event) => {
        const menu = event.currentTarget.closest("details")
        if (menu) menu.open = false
        input.onClick()
      }}
    >
      {input.label}
    </button>
  )

  return (
    <>
      <Show when={props.onCopyView}>
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.copyView")}
          icon="outline-copy"
          slot="graph-copy-view"
          onClick={() => props.onCopyView?.()}
        />
      </Show>
      <Show when={props.onExport && props.renderModel}>
        <ToolbarMenu slot="graph-toolbar-export" label={i18n.t("ui.sessionGraph.toolbar.export")} icon="outline-share">
          {option({
            label: i18n.t("ui.sessionGraph.toolbar.exportSvg"),
            onClick: () => props.onExport?.("svg", props.renderModel!),
            slot: "graph-export-option",
            value: "svg",
          })}
          {option({
            label: i18n.t("ui.sessionGraph.toolbar.exportJson"),
            onClick: () => props.onExport?.("json", props.renderModel!),
            slot: "graph-export-option",
            value: "json",
          })}
          {option({
            label: i18n.t("ui.sessionGraph.toolbar.exportHtml"),
            onClick: () => props.onExport?.("html", props.renderModel!),
            slot: "graph-export-option",
            value: "html",
          })}
        </ToolbarMenu>
      </Show>
    </>
  )
}

import { Show } from "solid-js"
import { GraphIconButton } from "./GraphIconButton"