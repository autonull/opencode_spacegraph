import { createMemo } from "solid-js"
import type { GraphNode, GraphViewData, DetailTier, EqualizerRuleSet } from "@opencode/session-ui/graph"
import type { CardTemplate } from "../canvas/buildRenderModel"
import { createCardTemplate } from "./cardTemplate"
import { createCardCopy } from "./card-copy"
import { fileRelations } from "@opencode/session-ui/graph"

export function useRenderCard(
  props: {
    renderCard?: CardTemplate
    rules: () => EqualizerRuleSet | undefined
    activeTurn?: string
    diffSource?: any
    renderSummary?: (node: GraphNode) => import("solid-js").JSX.Element | undefined
  },
  state: {
    theme: () => import("@spacegraphjs/renderer").RenderTheme
    tier: () => DetailTier
    selection: () => readonly string[]
    model: () => GraphViewData
    copy: ReturnType<typeof createCardCopy>
    mergedTrace: () => any
    comparison: () => any
    collapsedGroups: () => ReadonlySet<string>
    displayPositions: () => Map<string, import("@opencode/session-ui/graph").Position>
    i18n: import("./useGraphState").UseGraphStateReturn["i18n"]
    band?: () => "overview" | "execution" | "detail" | undefined
  },
) {
  return createMemo(() => {
    const now = Date.now()
    const selectedId = state.selection()[0]

    return (
      props.renderCard ??
      (() => {
        const theme = state.theme()
        const tier = state.tier()
        const model = state.model()
        const copy = state.copy
        const relations = createMemo(() => fileRelations(model))
        const relatedDetail = (node: GraphNode) => {
          if (node.kind !== "file") return undefined
          const relation = relations().get(node.id)
          if (!relation) return undefined
          const parts = [
            relation.reads > 0 ? copy.reads(relation.reads) : undefined,
            relation.writes > 0 ? copy.writes(relation.writes) : undefined,
            relation.additions > 0 || relation.deletions > 0
              ? copy.diff(relation.additions, relation.deletions)
              : undefined,
          ].filter((part): part is string => !!part)
          return parts.length > 0 ? parts.join(" · ") : undefined
        }

        return createCardTemplate(theme, {
          tier,
          selected: selectedId,
          active: props.activeTurn,
          related: relatedDetail,
          rules: props.rules(),
          now,
          copy,
          trace: state.mergedTrace(),
          diff: state.comparison(),
          collapsedGroups: state.collapsedGroups(),
          positions: state.displayPositions(),
          band: state.band?.(),
        })
      })()
    )
  })
}