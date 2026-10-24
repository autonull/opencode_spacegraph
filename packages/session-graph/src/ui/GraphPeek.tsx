import type { GraphEdge, GraphNode } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { Show } from "solid-js"
import { EDGE_KEY, KIND_KEY } from "./vocabulary"

export type GraphPeekProps = {
  node?: GraphNode
  edge?: GraphEdge
}

/**
 * A transient look at the node or edge under the pointer: its kind and its label. It answers "what
 * is this?" without changing the selection, so a reader can scan a dense map without committing to
 * anything — and it disappears the moment the pointer moves on.
 */
export const GraphPeek = (props: GraphPeekProps) => {
  const i18n = useI18n()

  return (
    <div
      data-component="session-graph-peek"
      data-slot="graph-peek"
      data-kind={props.edge ? "edge" : props.node?.kind}
      class="pointer-events-none flex max-w-[260px] items-center gap-2 rounded-md border border-border-weaker-base bg-surface-base px-2 py-1 shadow-md"
    >
      <Show
        when={props.node}
        fallback={
          <Show when={props.edge}>
            {(edge) => (
              <>
                <span class="shrink-0 text-12-regular text-text-weaker">
                  {i18n.t(EDGE_KEY[edge().kind])}
                </span>
                <span class="shrink-0 text-12-regular text-text-weaker">
                  {i18n.t(`ui.sessionGraph.confidence.${edge().confidence}`)}
                </span>
                <Show when={edge().label}>
                  <span class="truncate text-12-regular text-text-strong">{edge().label}</span>
                </Show>
              </>
            )}
          </Show>
        }
      >
        {(node) => (
          <>
            <span class="shrink-0 text-12-regular text-text-weaker">{i18n.t(KIND_KEY[node().kind])}</span>
            <span class="truncate text-12-regular text-text-strong">{node().label}</span>
          </>
        )}
      </Show>
    </div>
  )
}
