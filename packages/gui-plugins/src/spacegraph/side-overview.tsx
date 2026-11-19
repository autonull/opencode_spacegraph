import { createMemo } from "solid-js"
import { renderToSVG } from "@spacegraphjs/svg-renderer"
import { buildRenderModel, DEFAULT_THEME } from "@opencode/session-graph"
import { layoutGraph, nodesAtLevel, type GraphViewData } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"

/** Compact static overview for the side strip: the whole session at a glance, without a canvas. */
export function SideOverview(props: {
  model: GraphViewData
  onPick: (nodeID: string) => void
  onOpenFull: () => void
}) {
  const i18n = useI18n()
  const svg = createMemo(() => {
    const visible = new Set(nodesAtLevel(props.model, "overview").map((node) => node.id))
    const scoped: GraphViewData = {
      ...props.model,
      nodes: props.model.nodes.filter((node) => visible.has(node.id)),
      edges: props.model.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)),
    }
    const layout = layoutGraph(scoped, { strategy: "tree", level: "overview" })
    return renderToSVG(buildRenderModel(scoped, { level: "overview", positions: layout.positions, edges: true }), {
      theme: DEFAULT_THEME,
      padding: 16,
    })
  })
  return (
    <div class="flex size-full min-h-0 flex-col gap-2 p-2" data-slot="spacegraph-side-overview">
      <div class="text-11-regular text-text-weak">{i18n.t("panel.overview.hint")}</div>
      <div
        class="min-h-0 flex-1 overflow-auto rounded-md border border-v2-border-border-base bg-v2-background-bg-base"
        data-slot="spacegraph-side-overview-svg"
        innerHTML={svg()}
        onClick={(event) => {
          const node = (event.target as Element).closest("[data-node-id]")
          const id = node?.getAttribute("data-node-id")
          if (id) props.onPick(id)
        }}
      />
      <button type="button" class="shrink-0 text-12-regular text-text-interactive" onClick={props.onOpenFull}>
        {i18n.t("panel.overview.open")}
      </button>
    </div>
  )
}
