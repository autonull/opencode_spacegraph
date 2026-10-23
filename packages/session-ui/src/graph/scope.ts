import type { GraphModel } from "./model"
import { nodeDomain, type Domain } from "./vocabulary"

/**
 * T30.2 — the lens. It is a pure filter over a built model, not a rebuild: the session model is the
 * input, the reader's chosen domains are the filter, and every other graph function keeps its
 * signature. Session is always in the lens, and an edge survives only when both endpoints do.
 */
export function scopeModel(model: GraphModel, lens: ReadonlySet<Domain>): GraphModel {
  const domains = new Set(lens)
  domains.add("session")

  const nodes = model.nodes.filter((node) => domains.has(nodeDomain(node)))
  const kept = new Set(nodes.map((node) => node.id))
  const edges = model.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target))

  return {
    ...model,
    nodes,
    edges,
    turns: model.turns.filter((turn) => kept.has(turn)),
    activeTurn: model.activeTurn !== undefined && kept.has(model.activeTurn) ? model.activeTurn : undefined,
  }
}
