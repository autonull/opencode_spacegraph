import { GraphIconButton } from "./GraphIconButton"
import { ToolbarMenu } from "./ToolbarMenu"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show, For } from "solid-js"
import type { RendererID } from "../canvas/renderer-registry"

export type GraphRendererStatusProps = {
  renderer?: RendererID
  compact?: boolean
  onSplitView?: () => void
  onBack?: () => void
  endInset?: string
  onRendererChange?: (renderer: RendererID) => void
}

const RENDERER_LABELS: Record<RendererID, string> = {
  spacegraph: "SpaceGraph",
  cytoscape: "Cytoscape",
}

export const GraphRendererStatus = (props: GraphRendererStatusProps) => {
  const i18n = useI18n()

  return (
    <div class="ml-auto flex items-center gap-2" style={props.endInset ? { "padding-inline-end": props.endInset } : undefined}>
      <Show when={!props.compact}>
        {props.renderer ? (
          <span
            class="text-12-regular text-text-weak"
            classList={{ hidden: props.compact }}
            title={i18n.t("ui.sessionGraph.toolbar.renderer", { renderer: RENDERER_LABELS[props.renderer] })}
          >
            {i18n.t("ui.sessionGraph.toolbar.renderer", { renderer: RENDERER_LABELS[props.renderer] })}
          </span>
        ) : null}
      </Show>
      {props.onRendererChange && (
        <ToolbarMenu
          slot="graph-toolbar-renderer"
          label={i18n.t("ui.sessionGraph.toolbar.rendererSelector")}
          icon="monitor"
          align="end"
          value={props.renderer ? RENDERER_LABELS[props.renderer] : undefined}
          valueSlot="graph-renderer-name"
        >
          <For each={["spacegraph", "cytoscape"] as RendererID[]}>
            {(id) => (
              <button
                type="button"
                data-slot="graph-renderer-option"
                data-value={id}
                class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
                aria-pressed={props.renderer === id}
                onClick={() => props.onRendererChange?.(id)}
              >
                {RENDERER_LABELS[id]}
              </button>
            )}
          </For>
        </ToolbarMenu>
      )}
      {props.onSplitView ? (
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.split")}
          icon="split"
          slot="graph-toolbar-split"
          onClick={props.onSplitView}
        />
      ) : null}
      {props.onBack ? (
        <GraphIconButton
          label={i18n.t("ui.sessionGraph.toolbar.back")}
          icon="outline-arrow-left"
          onClick={props.onBack}
        />
      ) : null}
    </div>
  )
}