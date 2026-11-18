import type { GraphNode, GraphViewData } from "./model"
import { scopeModel } from "./view"
import { nodeDomain, DOMAINS, NODE_KINDS, NODE_STATUSES, type Domain, type NodeKind, type NodeStatus } from "./vocabulary"
import { searchText } from "./selectors"
import { collapseGroups } from "./collapse"

/**
 * A2 — the reader's question, as data. Text, kinds, statuses, and domains are independent facets;
 * they compose into one scope and never into a mode. The query string is the shareable form.
 * P2.1: Added semantic quick filter facets for common query patterns.
 */
export type GraphFacets = {
  query: string
  kinds: ReadonlySet<NodeKind>
  statuses: ReadonlySet<NodeStatus>
  domains: ReadonlySet<Domain>
  // P2.1: Semantic quick filter facets
  failedTools?: boolean
  fileWrites?: boolean
  subagentCalls?: boolean
  errors?: boolean
  retries?: boolean
  costlyNodes?: boolean
}

export type FacetCount = {
  value: string
  kept: number
  total: number
}

export type SemanticFacetCount = {
  total: number
  kept: number
}

export type FacetCounts = {
  kinds: FacetCount[]
  statuses: FacetCount[]
  domains: FacetCount[]
  // P2.1: Semantic quick filter counts
  failedTools?: SemanticFacetCount
  fileWrites?: SemanticFacetCount
  subagentCalls?: SemanticFacetCount
  errors?: SemanticFacetCount
  retries?: SemanticFacetCount
  costlyNodes?: SemanticFacetCount
}

export const DEFAULT_FACETS: GraphFacets = {
  query: "",
  kinds: new Set(),
  statuses: new Set(),
  domains: new Set(["session"]),
  failedTools: false,
  fileWrites: false,
  subagentCalls: false,
  errors: false,
  retries: false,
  costlyNodes: false,
}

// ast-grep-ignore: gui-plugin-no-module-state -- pure ported model constant, not plugin state
const KINDS = new Set<string>(NODE_KINDS)
// ast-grep-ignore: gui-plugin-no-module-state -- pure ported model constant, not plugin state
const STATUSES = new Set<string>(NODE_STATUSES)
// ast-grep-ignore: gui-plugin-no-module-state -- pure ported model constant, not plugin state
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
  
  // Helper to count semantic facets
  const countSemantic = (
    nodes: readonly GraphNode[],
    predicate: (node: GraphNode) => boolean
  ): { total: number; kept: number } => {
    const total = nodes.filter(predicate).length
    const kept = nodes.filter((node) => predicate(node) && matchesFacets(node, facets)).length
        return { total, kept }
  }

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
    // P2.1: Semantic quick filter counts
    failedTools: countSemantic(scoped.nodes, (node) => node.kind === "tool" && node.status === "failed"),
    fileWrites: countSemantic(scoped.nodes, (node) => node.kind === "diff" || (node.kind === "file" && !!node.data?.path)),
    subagentCalls: countSemantic(scoped.nodes, (node) => node.kind === "subagent"),
    errors: countSemantic(scoped.nodes, (node) => node.kind === "error"),
    retries: countSemantic(scoped.nodes, (node) => node.kind === "retry"),
    costlyNodes: countSemantic(scoped.nodes, (node) => node.kind === "turn" && facets.costlyNodes === true),
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

/** Serialize facets into the `q=` grammar: free text plus `kind:`/`status:`/`domain:`/`semantic:` tokens. */
export const facetsToQuery = (facets: GraphFacets): string => {
  const values = [
    facets.query.trim(),
    encode("kind", orderedValues(facets.kinds, NODE_KINDS)),
    encode("status", orderedValues(facets.statuses, NODE_STATUSES)),
    encode("domain", orderedValues(facets.domains, DOMAINS)),
    // P2.1: Semantic quick filter facets
    encode("semantic", orderedValues(
            [
        facets.failedTools && "failedTools",
        facets.fileWrites && "fileWrites",
        facets.subagentCalls && "subagentCalls",
        facets.errors && "errors",
        facets.retries && "retries",
        facets.costlyNodes && "costlyNodes",
      ].filter(Boolean) as string[],
      [] // no canonical order needed for semantic facets
    )),
  ].filter((value): value is string => !!value)
    return values.join(" ")
}

/** Parse the `q=` grammar back into facets. Unknown values are ignored; order is canonical. */
export const facetsFromQuery = (query: string): GraphFacets => {
  const text: string[] = []
  const kinds = new Set<NodeKind>()
  const statuses = new Set<NodeStatus>()
  const domains = new Set<Domain>(["session"])
  // P2.1: Semantic quick filter facets
  let failedTools = false
  let fileWrites = false
  let subagentCalls = false
  let errors = false
  let retries = false
  let costlyNodes = false

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
        if (name === "semantic") {
      for (const value of values) {
        switch (value) {
          case "failedTools": failedTools = true; break
          case "fileWrites": fileWrites = true; break
          case "subagentCalls": subagentCalls = true; break
          case "errors": errors = true; break
          case "retries": retries = true; break
          case "costlyNodes": costlyNodes = true; break
        }
      }
            continue
    }
        text.push(token)
  }

  return { query: text.join(" "), kinds, statuses, domains, failedTools, fileWrites, subagentCalls, errors, retries, costlyNodes }
}

export const hasFacets = (facets: GraphFacets) =>
  facets.query.trim().length > 0 ||
  facets.kinds.size > 0 ||
  facets.statuses.size > 0 ||
  facets.failedTools === true ||
  facets.fileWrites === true ||
  facets.subagentCalls === true ||
  facets.errors === true ||
  facets.retries === true ||
  facets.costlyNodes === true

/**
 * Compose the scope pipeline: facets → keepOnly → collapseGroups.
 * This is the single scope pipeline used by the host (GraphView.scopeBase).
 */
export const composeScopes = (
  model: GraphViewData,
  facets: GraphFacets,
  keptIds: ReadonlySet<string> | null,
  collapsedGroups: ReadonlySet<string>,
): GraphViewData => {
  let result = applyFacets(model, facets)

  if (keptIds) result = keepOnly(result, keptIds)

  if (collapsedGroups.size > 0) result = collapseGroups(result, collapsedGroups)

  return result
}
