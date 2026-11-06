import type { GraphViewData } from "./model"

/**
 * B2 — a collapsed group is model state, not a renderer special case. The group node stays (and
 * carries its member count); the members it names are hidden with their incident edges. Positions
 * of everything else are untouched, so collapse never re-lays-out the map.
 */
export const collapseGroups = (
  model: GraphViewData,
  collapsed: ReadonlySet<string>,
): GraphViewData => {
  if (collapsed.size === 0) return model
  const hidden = new Set<string>()
  for (const node of model.nodes) {
    if (!collapsed.has(node.id)) continue
    for (const member of node.clusterOf ?? []) hidden.add(member)
  }
  if (hidden.size === 0) return model
  return {
    ...model,
    nodes: model.nodes.filter((node) => !hidden.has(node.id)),
    edges: model.edges.filter((edge) => !hidden.has(edge.source) && !hidden.has(edge.target)),
    turns: model.turns.filter((turn) => !hidden.has(turn)),
    activeTurn: model.activeTurn !== undefined && !hidden.has(model.activeTurn) ? model.activeTurn : undefined,
  }
}
