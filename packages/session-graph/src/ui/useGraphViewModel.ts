import { createMemo, type Accessor } from "solid-js"
import type { GraphViewData, GraphNode } from "@opencode/session-ui/graph"
import { scaleWindow, scopeToTurns, composeScopes, facetCounts, nodeByID, ancestors } from "@opencode/session-ui/graph"
import type { UseComparisonReturn } from "./useComparison"
import type { UseGroupCollapseReturn } from "./useGroupCollapse"
import type { UseGraphSelectionReturn } from "./useGraphSelection"

export type UseGraphViewModelOptions = {
  model: Accessor<GraphViewData>
  facets: Accessor<ReturnType<typeof import("@opencode/session-ui/graph").facetsFromQuery>>
  graphSelection: UseGraphSelectionReturn
  groupCollapse: UseGroupCollapseReturn
  comparisonHook: UseComparisonReturn
  frame: string | undefined
  followLog: Accessor<boolean>
  activeTurn: string | undefined
}

export type UseGraphViewModelReturn = {
  scale: Accessor<ReturnType<typeof scaleWindow>>
  scoped: Accessor<GraphViewData>
  turnScoped: Accessor<GraphViewData>
  counts: Accessor<ReturnType<typeof facetCounts>>
  windowAnchor: Accessor<string | undefined>
  selectedTurn: Accessor<string | undefined>
  selectedTurns: Accessor<Array<{ id: string; kind: string }>>
  turnOf: (id: string | undefined) => string | undefined
}

export function useGraphViewModel(options: UseGraphViewModelOptions): UseGraphViewModelReturn {
  const {
    model,
    facets,
    graphSelection,
    groupCollapse,
    comparisonHook,
    frame,
    followLog,
    activeTurn,
  } = options

  const getSelection = graphSelection.selection

  const turnOf = (id: string | undefined) => {
    if (!id) return undefined
    const node = nodeByID(model(), id)
    if (!node) return undefined
    if (node.kind === "turn") return node.id
    return ancestors(model(), id).find((ancestor) => ancestor.kind === "turn")?.id
  }

  const scale = createMemo(() =>
    scaleWindow(
      model(),
      [turnOf(getSelection()[0]), turnOf(frame), followLog() ? activeTurn : undefined].filter(
        (id): id is string => !!id,
      ),
    ),
  )

  const scopeBase = (source: GraphViewData) =>
    composeScopes(source, facets(), graphSelection.keptIds(), groupCollapse.collapsedGroups())

  const turnScoped = createMemo(() => {
    const turns = new Set(scale().turns)
    for (const turn of comparisonHook.comparedTurns() ?? []) turns.add(turn)
    return scopeToTurns(model(), turns)
  })

  const scoped = createMemo(() => {
    const result = scopeBase(turnScoped())
    return result ?? { nodes: [], edges: [], turns: [], turnByMessageID: new Map() }
  })

  const counts = createMemo(() => facetCounts(turnScoped(), facets()))

  const windowAnchor = createMemo(() => {
    if (scale().hidden === 0) return undefined
    return [...scale().turns][0]
  })

  const selectedTurn = createMemo(() => turnOf(getSelection()[0]))
  const selectedTurns = createMemo(() =>
    getSelection()
      .map((id) => nodeByID(model(), id))
      .filter((node): node is GraphNode => node?.kind === "turn"),
  )

  return {
    scale,
    scoped,
    turnScoped,
    counts,
    windowAnchor,
    selectedTurn,
    selectedTurns,
    turnOf,
  }
}