import { GraphIconButton } from "./GraphIconButton"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"
import type { RendererID } from "../canvas/renderer-registry"

export type GraphRendererStatusProps = {
  renderer?: RendererID
  compact?: boolean
  onSplitView?: () => void
  onBack?: () => void
  endInset?: string
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