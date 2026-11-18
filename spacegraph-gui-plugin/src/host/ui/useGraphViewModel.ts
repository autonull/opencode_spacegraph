import { createMemo, type Accessor } from "solid-js"
import {
  ancestors,
  composeScopes,
  facetCounts,
  nodeByID,
  scopeToTurns,
  scaleWindow,
  type GraphFacets,
  type GraphNode,
  type GraphViewData,
} from "../../model"

export type GraphViewModelInput = {
  model: Accessor<GraphViewData>
  facets: Accessor<GraphFacets>
  selection: Accessor<readonly string[]>
  collapsedGroups: Accessor<ReadonlySet<string>>
  comparedTurns: Accessor<readonly [string, string] | null>
  frame?: string
  followLog?: Accessor<boolean>
  activeTurn?: string
}

export type GraphViewModel = {
  scale: Accessor<ReturnType<typeof scaleWindow>>
  scoped: Accessor<GraphViewData>
  turnScoped: Accessor<GraphViewData>
  counts: Accessor<ReturnType<typeof facetCounts>>
  windowAnchor: Accessor<string | undefined>
  selectedTurn: Accessor<string | undefined>
  selectedTurns: Accessor<GraphNode[]>
  turnOf: (id: string | undefined) => string | undefined
}

/** The turn a node belongs to: itself when it is a turn, otherwise its closest turn ancestor. */
export function turnOfTurn(model: GraphViewData, id: string | undefined): string | undefined {
  if (!id) return undefined
  const node = nodeByID(model, id)
  if (!node) return undefined
  if (node.kind === "turn") return node.id
  return ancestors(model, id).find((ancestor) => ancestor.kind === "turn")?.id
}

/**
 * Headless counterpart of the fork's `useGraphViewModel`. It composes the turn window, the active
 * facets, the kept selection and the collapsed groups into one scoped model, plus the counters and
 * anchors the chrome reads. The plugin has a single focus rather than a multi-selection, so `keptIds`
 * is intentionally `null`: the scope comes from facets and turns.
 */
export function createGraphViewModel(input: GraphViewModelInput): GraphViewModel {
  const { model, facets, selection, collapsedGroups, comparedTurns, frame, followLog, activeTurn } = input

  const turnOf = (id: string | undefined) => turnOfTurn(model(), id)

  const scale = createMemo(() =>
    scaleWindow(
      model(),
      [turnOf(selection()[0]), turnOf(frame), followLog?.() ? activeTurn : undefined].filter(
        (id): id is string => !!id,
      ),
    ),
  )

  const turnScoped = createMemo(() => {
    const turns = new Set(scale().turns)
    for (const turn of comparedTurns() ?? []) turns.add(turn)
    return scopeToTurns(model(), turns)
  })

  const scoped = createMemo(() => composeScopes(turnScoped(), facets(), null, collapsedGroups()))

  const counts = createMemo(() => facetCounts(turnScoped(), facets()))

  const windowAnchor = createMemo(() => (scale().hidden === 0 ? undefined : [...scale().turns][0]))

  const selectedTurn = createMemo(() => turnOf(selection()[0]))

  const selectedTurns = createMemo(() =>
    selection()
      .map((id) => nodeByID(model(), id))
      .filter((node): node is GraphNode => node?.kind === "turn"),
  )

  return { scale, scoped, turnScoped, counts, windowAnchor, selectedTurn, selectedTurns, turnOf }
}
