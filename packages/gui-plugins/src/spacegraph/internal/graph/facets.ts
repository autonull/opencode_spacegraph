import type { GraphNode, GraphViewData } from "./model"
import { scopeModel } from "./view"
import { nodeDomain, DOMAINS, NODE_KINDS, NODE_STATUSES, type Domain, type NodeKind, type NodeStatus } from "./vocabulary"
import { searchText } from "./selectors"
import { collapseGroups } from "./collapse"

/**
 * A2 — the reader's question, as data. Text, kinds, statuses, and domains are independent facets;
 * they compose into one scope and never into a mode. The query string is the shareable form.
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
  /** How active semantic filters compose: "or" (default) keeps a node matching any, "and" requires all. */
  composeMode?: "or" | "and"
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
  composeMode: "or",
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

/** RW-01: semantic quick-filter predicates, keyed by their active facet flag. */
const SEMANTIC_MATCHERS: readonly [keyof GraphFacets, (node: GraphNode) => boolean][] = [
  ["failedTools", (node) => node.kind === "tool" && node.status === "failed"],
  ["fileWrites", (node) => node.kind === "diff" || (node.kind === "file" && !!node.data?.path)],
  ["subagentCalls", (node) => node.kind === "subagent"],
  ["errors", (node) => node.kind === "error"],
  ["retries", (node) => node.kind === "retry"],
  ["costlyNodes", (node) => node.kind === "turn"],
]

const activeSemanticMatchers = (facets: GraphFacets) =>
  SEMANTIC_MATCHERS.filter(([key]) => facets[key] === true).map(([, match]) => match)

const matchesSemantic = (node: GraphNode, facets: GraphFacets) => {
  const active = activeSemanticMatchers(facets)
  if (active.length === 0) return true
  return facets.composeMode === "and"
    ? active.every((match) => match(node))
    : active.some((match) => match(node))
}

const matchesFacets = (node: GraphNode, facets: GraphFacets) => {
  const matchesStandard =
    matchNeedle(node, facets.query.trim().toLowerCase()) &&
    matchesKinds(node, facets) &&
    matchesStatus(node, facets)
  return matchesStandard && matchesSemantic(node, facets)
}

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
  const semanticCount = (matcher: (node: GraphNode) => boolean): SemanticFacetCount => {
    const members = scoped.nodes.filter(matcher)
    return { total: members.length, kept: members.filter((node) => matchesFacets(node, facets)).length }
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
    failedTools: semanticCount((node) => node.kind === "tool" && node.status === "failed"),
    fileWrites: semanticCount((node) => node.kind === "diff" || (node.kind === "file" && !!node.data?.path)),
    subagentCalls: semanticCount((node) => node.kind === "subagent"),
    errors: semanticCount((node) => node.kind === "error"),
    retries: semanticCount((node) => node.kind === "retry"),
    costlyNodes: semanticCount((node) => node.kind === "turn"),
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

const SEMANTIC_KEYS = ["failedTools", "fileWrites", "subagentCalls", "errors", "retries", "costlyNodes"] as const

/** Serialize facets into the `q=` grammar: free text plus `kind:`/`status:`/`domain:` tokens. */
export const facetsToQuery = (facets: GraphFacets): string => {
  const values = [
    facets.query.trim(),
    encode("kind", orderedValues(facets.kinds, NODE_KINDS)),
    encode("status", orderedValues(facets.statuses, NODE_STATUSES)),
    encode("domain", orderedValues(facets.domains, DOMAINS)),
    ...SEMANTIC_KEYS.filter((key) => facets[key] === true),
    facets.composeMode === "and" ? "compose:and" : undefined,
  ].filter((value): value is string => !!value)
  return values.join(" ")
}

/** Parse the `q=` grammar back into facets. Unknown values are ignored; order is canonical. */
export const facetsFromQuery = (query: string): GraphFacets => {
  const text: string[] = []
  const kinds = new Set<NodeKind>()
  const statuses = new Set<NodeStatus>()
  const domains = new Set<Domain>(["session"])
  const semantic: Partial<GraphFacets> = {}
  let composeMode: "or" | "and" = "or"

  for (const token of query.trim().split(/\s+/)) {
    if (!token) continue
    const separator = token.indexOf(":")
    if (separator <= 0) {
      if ((SEMANTIC_KEYS as readonly string[]).includes(token)) semantic[token as (typeof SEMANTIC_KEYS)[number]] = true
      else text.push(token)
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
    if (name === "compose" && values.includes("and")) {
      composeMode = "and"
      continue
    }
    text.push(token)
  }

  return { ...DEFAULT_FACETS, ...semantic, query: text.join(" "), kinds, statuses, domains, composeMode }
}

export const hasFacets = (facets: GraphFacets) =>
  facets.query.trim().length > 0 ||
  facets.kinds.size > 0 ||
  facets.statuses.size > 0 ||
  SEMANTIC_KEYS.some((key) => facets[key] === true)

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
