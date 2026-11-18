import {
  DEFAULT_FACETS,
  applyFacets,
  facetCounts,
  isVisibleAt,
  rankedSearch,
  type FacetCounts,
  type GraphFacets,
  type GraphNode,
  type GraphViewData,
  type ZoomLevel,
} from "../../model"

export type FindScope = {
  level?: ZoomLevel
  turnID?: string
}

/** Toggle one facet value, keeping a permanent value (the session domain) selected. */
export function toggleFacet<T extends string>(current: ReadonlySet<T>, value: T, permanent?: T): Set<T> {
  const next = new Set(current)
  if (!next.delete(value) || value === permanent) next.add(value)
  return next
}

/** Live kept/total label for a facet chip. */
export function facetCountLabel(counts: FacetCounts, group: keyof FacetCounts, value: string): string {
  const entry = counts[group].find((candidate) => candidate.value === value)
  return entry ? `${entry.kept}/${entry.total}` : "0/0"
}

/** Search results for the active facets and view scope. Empty query means "all kept nodes". */
export function findResults(model: GraphViewData, facets: GraphFacets, scope: FindScope = {}): GraphNode[] {
  const scoped = applyFacets(model, facets)
  const found = facets.query.trim()
    ? rankedSearch(scoped, facets.query)
    : scoped.nodes
  return found.filter(
    (node) =>
      (!scope.level || isVisibleAt(node, scope.level)) &&
      (!scope.turnID || node.turnID === scope.turnID),
  )
}

/** Clamp a roving-index position to the current result list. */
export function clampActive(index: number, length: number): number {
  return length <= 0 ? 0 : Math.max(0, Math.min(index, length - 1))
}

/** Merge a partial facet patch without dropping the other facets. */
export function withFacets(facets: GraphFacets, patch: Partial<GraphFacets>): GraphFacets {
  return { ...facets, ...patch }
}

export function emptyFacets(): GraphFacets {
  return { ...DEFAULT_FACETS, kinds: new Set(), statuses: new Set(), domains: new Set(["session"]) }
}

export { facetCounts }
