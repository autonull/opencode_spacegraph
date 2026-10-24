import type { GraphNode, GraphViewData } from "./model"
import { scopeModel } from "./view"
import { nodeDomain, DOMAINS, NODE_KINDS, NODE_STATUSES, type Domain, type NodeKind, type NodeStatus } from "./vocabulary"
import { searchText } from "./selectors"

/**
 * A2 — the reader's question, as data. Text, kinds, statuses, and domains are independent facets;
 * they compose into one scope and never into a mode. The query string is the shareable form.
 */
export type GraphFacets = {
  query: string
  kinds: ReadonlySet<NodeKind>
  statuses: ReadonlySet<NodeStatus>
  domains: ReadonlySet<Domain>
}

export type FacetCount = {
  value: string
  kept: number
  total: number
}

export type FacetCounts = {
  kinds: FacetCount[]
  statuses: FacetCount[]
  domains: FacetCount[]
}

export const DEFAULT_FACETS: GraphFacets = {
  query: "",
  kinds: new Set(),
  statuses: new Set(),
  domains: new Set(["session"]),
}

const KINDS = new Set<string>(NODE_KINDS)
const STATUSES = new Set<string>(NODE_STATUSES)
const DOMAINS_SET = new Set<string>(DOMAINS)

const matchNeedle = (node: GraphNode, needle: string) =>
  !needle || searchText(node).join("\n").toLowerCase().includes(needle)

const matchesKinds = (node: GraphNode, facets: GraphFacets) =>
  facets.kinds.size === 0 || facets.kinds.has(node.kind)

const matchesStatus = (node: GraphNode, facets: GraphFacets) =>
  facets.statuses.size === 0 || facets.statuses.has(node.status)

const matchesFacets = (node: GraphNode, facets: GraphFacets) =>
  matchNeedle(node, facets.query.trim().toLowerCase()) &&
  matchesKinds(node, facets) &&
  matchesStatus(node, facets)

/**
 * The model with the facets applied. The domain facet goes through the one scope pipeline; the
 * other facets classify the scoped nodes. The session root stays so the answer still has an address.
 */
export const applyFacets = (model: GraphViewData, facets: GraphFacets): GraphViewData => {
  const scoped = scopeModel(model, facets.domains)
  const kept = new Set(
    scoped.nodes.filter((node) => node.id === model.root || matchesFacets(node, facets)).map((node) => node.id),
  )
  return {
    ...scoped,
    nodes: scoped.nodes.filter((node) => kept.has(node.id)),
    edges: scoped.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target)),
    turns: scoped.turns.filter((turn) => kept.has(turn)),
    activeTurn:
      scoped.activeTurn !== undefined && kept.has(scoped.activeTurn) ? scoped.activeTurn : undefined,
  }
}

/**
 * B1 — "keep only" is a scope over held ids, applied after facets so the two compose. The session
 * root always stays so the answer keeps an address.
 */
export const keepOnly = (model: GraphViewData, ids: Iterable<string>): GraphViewData => {
  const kept = new Set(ids)
  kept.add(model.root)
  return {
    ...model,
    nodes: model.nodes.filter((node) => kept.has(node.id)),
    edges: model.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target)),
    turns: model.turns.filter((turn) => kept.has(turn)),
    activeTurn:
      model.activeTurn !== undefined && kept.has(model.activeTurn) ? model.activeTurn : undefined,
  }
}

const countGroup = (
  nodes: readonly GraphNode[],
  values: readonly string[],
  valueOf: (node: GraphNode) => string,
  facets: GraphFacets,
  without: (facets: GraphFacets) => GraphFacets,
): FacetCount[] => {
  const other = without(facets)
  return values.map((value) => {
    const members = nodes.filter((node) => valueOf(node) === value)
    return {
      value,
      total: members.length,
      kept: members.filter((node) => matchesFacets(node, other)).length,
    }
  })
}

/** Live kept/total counts per facet value, each excluding its own group so a chip says what it adds. */
export const facetCounts = (model: GraphViewData, facets: GraphFacets): FacetCounts => {
  const scoped = scopeModel(model, facets.domains)
  return {
    kinds: countGroup(scoped.nodes, NODE_KINDS, (node) => node.kind, facets, (current) => ({
      ...current,
      kinds: new Set(),
    })),
    statuses: countGroup(scoped.nodes, NODE_STATUSES, (node) => node.status, facets, (current) => ({
      ...current,
      statuses: new Set(),
    })),
    domains: countGroup(
      model.nodes,
      DOMAINS,
      (node) => nodeDomain(node),
      facets,
      (current) => ({ ...current, domains: new Set(DOMAINS) }),
    ),
  }
}

const orderedValues = <T extends string>(values: Iterable<T>, order: readonly T[]) => {
  const set = new Set(values)
  return order.filter((value) => set.has(value))
}

const encode = (name: string, values: Iterable<string>) => {
  const list = [...values]
  return list.length > 0 ? `${name}:${list.join(",")}` : undefined
}

/** Serialize facets into the `q=` grammar: free text plus `kind:`/`status:`/`domain:` tokens. */
export const facetsToQuery = (facets: GraphFacets): string => {
  const values = [
    facets.query.trim(),
    encode("kind", orderedValues(facets.kinds, NODE_KINDS)),
    encode("status", orderedValues(facets.statuses, NODE_STATUSES)),
    encode("domain", orderedValues(facets.domains, DOMAINS)),
  ].filter((value): value is string => !!value)
  return values.join(" ")
}

/** Parse the `q=` grammar back into facets. Unknown values are ignored; order is canonical. */
export const facetsFromQuery = (query: string): GraphFacets => {
  const text: string[] = []
  const kinds = new Set<NodeKind>()
  const statuses = new Set<NodeStatus>()
  const domains = new Set<Domain>(["session"])

  for (const token of query.trim().split(/\s+/)) {
    if (!token) continue
    const separator = token.indexOf(":")
    if (separator <= 0) {
      text.push(token)
      continue
    }
    const name = token.slice(0, separator)
    const values = token.slice(separator + 1).split(",").filter(Boolean)
    if (name === "kind") {
      for (const value of values) if (KINDS.has(value)) kinds.add(value as NodeKind)
      continue
    }
    if (name === "status") {
      for (const value of values) if (STATUSES.has(value)) statuses.add(value as NodeStatus)
      continue
    }
    if (name === "domain") {
      for (const value of values) if (DOMAINS_SET.has(value)) domains.add(value as Domain)
      continue
    }
    text.push(token)
  }

  return { query: text.join(" "), kinds, statuses, domains }
}

export const hasFacets = (facets: GraphFacets) =>
  facets.query.trim().length > 0 || facets.kinds.size > 0 || facets.statuses.size > 0
