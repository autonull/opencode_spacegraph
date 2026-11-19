// Facets adapter: delegates to @spacegraphjs/search with OpenCode-specific accessors.

import type { GraphNode as SessionGraphNode, GraphViewData as SessionGraphViewData } from "./model";
import { DOMAINS, NODE_KINDS, NODE_STATUSES } from "./vocabulary";
import type { Domain, NodeKind, NodeStatus } from "./vocabulary";
import { turnCost } from "./cost";
import { collapseGroups } from "./collapse-adapter";
import {
  applyFacets as searchApplyFacets,
  keepOnly as searchKeepOnly,
  composeScopes as searchComposeScopes,
  facetCounts as searchFacetCounts,
  facetsToQuery as searchFacetsToQuery,
  facetsFromQuery as searchFacetsFromQuery,
  hasFacets as searchHasFacets,
  type FacetAccessors,
} from "@spacegraphjs/search";
import type { GraphFacets as SearchGraphFacets } from "@spacegraphjs/shared";

// P2.1: Precompute costly nodes (top 10% by tokens) per model
function computeCostlyNodes(model: SessionGraphViewData): Set<string> {
  const turnCosts = new Map<string, { tokens: number }>();
  let maxTokens = 0;

  for (const node of model.nodes) {
    if (node.kind === "turn") {
      const cost = turnCost(node);
      if (cost) {
        const totalTokens = cost.tokens.input + cost.tokens.output + cost.tokens.reasoning + cost.tokens.cacheRead + cost.tokens.cacheWrite;
        turnCosts.set(node.id, { tokens: totalTokens });
        if (totalTokens > maxTokens) maxTokens = totalTokens;
      }
    }
  }

  if (turnCosts.size === 0) return new Set();

  // Top 10% by tokens
  const threshold = turnCosts.size <= 10 ? 0 : maxTokens * 0.9;
  const costly = new Set<string>();
  for (const [id, { tokens }] of turnCosts) {
    if (tokens >= threshold) costly.add(id);
  }
  return costly;
}

// Session-ui specific GraphFacets type (uses specific unions)
export type GraphFacets = {
  query: string;
  kinds: ReadonlySet<NodeKind>;
  statuses: ReadonlySet<NodeStatus>;
  domains: ReadonlySet<Domain>;
  // P2.1: Semantic quick filter facets
  failedTools?: boolean;
  fileWrites?: boolean;
  subagentCalls?: boolean;
  errors?: boolean;
  retries?: boolean;
  costlyNodes?: boolean;
  /** How active semantic filters compose: "or" (default) keeps a node matching any, "and" requires all. */
  composeMode?: "or" | "and";
};

export type FacetCount = {
  value: string;
  kept: number;
  total: number;
};

export type SemanticFacetCount = {
  total: number;
  kept: number;
};

export type FacetCounts = {
  kinds: FacetCount[];
  statuses: FacetCount[];
  domains: FacetCount[];
  // P2.1: Semantic quick filter counts
  failedTools?: SemanticFacetCount;
  fileWrites?: SemanticFacetCount;
  subagentCalls?: SemanticFacetCount;
  errors?: SemanticFacetCount;
  retries?: SemanticFacetCount;
  costlyNodes?: SemanticFacetCount;
};

// P2.1: Compute costly nodes lazily
let _costlyNodesCache: Map<string, Set<string>> = new Map();

function getCostlyNodes(model: SessionGraphViewData): Set<string> {
  const key = model.root;
  const cached = _costlyNodesCache.get(key);
  if (cached) return cached;
  const costly = computeCostlyNodes(model);
  _costlyNodesCache.set(key, costly);
  return costly;
}

// OpenCode-specific FacetAccessors - cast to library types
// Note: isCostlyNode needs the model context, so we'll wrap it
let _currentCostlyNodes: Set<string> = new Set();

import type { GraphNode as SearchGraphNode, GraphViewData as SearchGraphViewData } from "@spacegraphjs/shared";

const openCodeAccessorsBase: Omit<FacetAccessors, 'isCostlyNode'> = {
  kind: (node: SearchGraphNode) => (node as unknown as SessionGraphNode).kind as string,
  status: (node: SearchGraphNode) => (node as unknown as SessionGraphNode).status as string,
  domain: (node: SearchGraphNode) => ((node as unknown as SessionGraphNode).kind === "directory" ? "workspace" : "session") as string | undefined,
  rootId: (model: SearchGraphViewData) => (model as unknown as SessionGraphViewData).root,
  // P2.1: Semantic facet accessors
  isFailedTool: (node: SearchGraphNode) => {
    const n = node as unknown as SessionGraphNode;
    return n.kind === "tool" && n.status === "failed";
  },
  isFileWrite: (node: SearchGraphNode) => {
    const n = node as unknown as SessionGraphNode;
    return n.kind === "diff" || (n.kind === "file" && !!n.data?.path);
  },
  isSubagentCall: (node: SearchGraphNode) => {
    const n = node as unknown as SessionGraphNode;
    return n.kind === "subagent";
  },
  isError: (node: SearchGraphNode) => {
    const n = node as unknown as SessionGraphNode;
    return n.kind === "error";
  },
  isRetry: (node: SearchGraphNode) => {
    const n = node as unknown as SessionGraphNode;
    return n.kind === "retry";
  },
};

function createOpenCodeAccessors(model: SessionGraphViewData): FacetAccessors {
  _currentCostlyNodes = getCostlyNodes(model);
  return {
    ...openCodeAccessorsBase,
    isCostlyNode: (node: SearchGraphNode) => {
      const n = node as unknown as SessionGraphNode;
      return n.kind === "turn" && _currentCostlyNodes.has(n.id);
    },
  } as FacetAccessors;
}

/** Default facets for OpenCode. */
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
};

/** The model with the facets applied. Delegates to @spacegraphjs/search. */
export const applyFacets = (model: SessionGraphViewData, facets: GraphFacets): SessionGraphViewData => {
  return searchApplyFacets({
    model: model as any,
    facets: facets as SearchGraphFacets,
    accessors: createOpenCodeAccessors(model),
  }) as SessionGraphViewData;
};

/** "Keep only" scope over held ids, applied after facets. Delegates to @spacegraphjs/search. */
export const keepOnly = (model: SessionGraphViewData, ids: Iterable<string>): SessionGraphViewData => {
  return searchKeepOnly({
    model: model as any,
    ids,
    accessors: { rootId: openCodeAccessorsBase.rootId },
  }) as SessionGraphViewData;
};

/** Compose the scope pipeline: facets → keepOnly → collapseGroups. Delegates to @spacegraphjs/search. */
export const composeScopes = (
  model: SessionGraphViewData,
  facets: GraphFacets,
  keptIds: ReadonlySet<string> | null,
  collapsedGroups: ReadonlySet<string>,
): SessionGraphViewData => {
  // The library's composeScopes expects a collapseGroups that works with library types
  // We wrap our collapseGroups to convert types
  const libraryCollapseGroups = (
    libModel: any,
    libCollapsed: ReadonlySet<string>,
  ) => {
    return collapseGroups(libModel, libCollapsed);
  };

  return searchComposeScopes({
    model: model as any,
    facets: facets as SearchGraphFacets,
    keptIds,
    collapsedGroups,
    accessors: createOpenCodeAccessors(model),
    collapseGroups: libraryCollapseGroups,
  }) as SessionGraphViewData;
};

/** Live kept/total counts per facet value. Delegates to @spacegraphjs/search. */
export const facetCounts = (model: SessionGraphViewData, facets: GraphFacets): FacetCounts => {
  const result = searchFacetCounts(
    model as any,
    facets as SearchGraphFacets,
    createOpenCodeAccessors(model),
    NODE_KINDS,
    NODE_STATUSES,
    DOMAINS,
  );
  return result as FacetCounts;
};

/** Serialize facets into the `q=` grammar. Delegates to @spacegraphjs/search. */
export const facetsToQuery = (facets: GraphFacets): string => {
  return searchFacetsToQuery(facets as SearchGraphFacets, NODE_KINDS, NODE_STATUSES, DOMAINS);
};

/** Parse the `q=` grammar back into facets. Delegates to @spacegraphjs/search. */
export const facetsFromQuery = (query: string): GraphFacets => {
  return searchFacetsFromQuery(query, NODE_KINDS, NODE_STATUSES, DOMAINS) as GraphFacets;
};

/** Check if facets have any active filter. Delegates to @spacegraphjs/search. */
export const hasFacets = (facets: GraphFacets): boolean => {
  return searchHasFacets(facets as SearchGraphFacets);
};