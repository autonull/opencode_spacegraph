import type { GraphNode } from "@opencode/session-ui/graph"
import { useI18n } from "@opencode/ui/context/i18n"
import { KIND_KEY } from "./vocabulary"

export type GraphPeekProps = {
  node: GraphNode
}

/**
 * A transient look at the node under the pointer: its kind and its label. It answers "what is
 * this?" without changing the selection, so a reader can scan a dense map without committing to
 * anything — and it disappears the moment the pointer moves on.
 */
export const GraphPeek = (props: GraphPeekProps) => {
  const i18n = useI18n()

  return (
    <div
      data-component="session-graph-peek"
      data-slot="graph-peek"
      class="pointer-events-none flex max-w-[260px] items-center gap-2 rounded-md border border-border-weaker-base bg-surface-base px-2 py-1 shadow-md"
    >
      <span class="shrink-0 text-12-regular text-text-weaker">{i18n.t(KIND_KEY[props.node.kind])}</span>
      <span class="truncate text-12-regular text-text-strong">{props.node.label}</span>
    </div>
  )
}
