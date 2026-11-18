// Facets adapter: delegates to @spacegraphjs/search with OpenCode-specific accessors.

import type { GraphNode as SessionGraphNode, GraphViewData as SessionGraphViewData } from "./model";
import { DOMAINS, NODE_KINDS, NODE_STATUSES } from "./vocabulary";
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

// Session-ui specific GraphFacets type (uses specific unions)
export type GraphFacets = {
  query: string;
  kinds: ReadonlySet<string>; // NodeKind in session-ui
  statuses: ReadonlySet<string>; // NodeStatus in session-ui
  domains: ReadonlySet<string>; // Domain in session-ui
  // P2.1: Semantic quick filter facets
  failedTools?: boolean;
  fileWrites?: boolean;
  subagentCalls?: boolean;
  errors?: boolean;
  retries?: boolean;
  costlyNodes?: boolean;
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

// OpenCode-specific FacetAccessors - cast to library types
const openCodeAccessors: FacetAccessors = {
    kind: (node: SessionGraphNode) => node.kind as string,
    status: (node: SessionGraphNode) => node.status as string,
    domain: (node: SessionGraphNode) => (node.kind === "directory" ? "workspace" : "session") as string | undefined,
  rootId: (model: SessionGraphViewData) => model.root,
} as FacetAccessors;

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
    accessors: openCodeAccessors,
  }) as SessionGraphViewData;
};

/** "Keep only" scope over held ids, applied after facets. Delegates to @spacegraphjs/search. */
export const keepOnly = (model: SessionGraphViewData, ids: Iterable<string>): SessionGraphViewData => {
    return searchKeepOnly({
        model: model as any,
    ids,
    accessors: { rootId: openCodeAccessors.rootId },
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
    accessors: openCodeAccessors,
    collapseGroups: libraryCollapseGroups,
  }) as SessionGraphViewData;
};

/** Live kept/total counts per facet value. Delegates to @spacegraphjs/search. */
export const facetCounts = (model: SessionGraphViewData, facets: GraphFacets): FacetCounts => {
  const result = searchFacetCounts(
        model as any,
        facets as SearchGraphFacets,
    openCodeAccessors,
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