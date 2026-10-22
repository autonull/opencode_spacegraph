import type { GraphNode } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"
import { GraphDetailSurface, type GraphDetailProps } from "./GraphDetail"

export type GraphInspectorProps = Omit<GraphDetailProps, "node"> & {
  node?: GraphNode
}

/**
 * Conventional detail panel (U3.10). All content is selectable DOM text, never drawn on the canvas,
 * so long tool output and errors stay readable. Detail is read back from the model, not the render
 * model; the renderer supplies structure only.
 */
export const GraphInspector = (props: GraphInspectorProps) => {
  const i18n = useI18n()

  return (
    <aside
      data-component="session-graph-inspector"
      data-slot="graph-inspector"
      class="flex h-full w-full flex-col overflow-hidden border-l border-border-weaker-base"
      aria-label={i18n.t("ui.sessionGraph.inspector.title")}
    >
      <Show
        when={props.node}
        keyed
        fallback={
          <div class="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            <span class="text-14-regular text-text-weak">{i18n.t("ui.sessionGraph.inspector.empty")}</span>
            <span class="text-12-regular text-text-weaker">{i18n.t("ui.sessionGraph.inspector.emptyHint")}</span>
          </div>
        }
      >
        {(node) => (
          <div class="flex min-h-0 flex-1 flex-col">
            <GraphDetailSurface
              model={props.model}
              node={node}
              diffSource={props.diffSource}
              renderSummary={props.renderSummary}
              link={props.link}
              onSelect={props.onSelect}
              onOpenTranscript={props.onOpenTranscript}
              onOpenSession={props.onOpenSession}
            />
          </div>
        )}
      </Show>
    </aside>
  )
}
