// Saved queries adapter: delegates to @spacegraphjs/search.

import type { GraphFacets } from "./facets-adapter";
import { NODE_KINDS, NODE_STATUSES, DOMAINS } from "./vocabulary";
import {
  SavedQuery as SearchSavedQuery,
  MAX_SAVED_QUERIES as SearchMAX_SAVED_QUERIES,
  savedQueryFacets as searchSavedQueryFacets,
  defaultSavedQueryLabel as searchDefaultSavedQueryLabel,
  saveQuery as searchSaveQuery,
  removeQuery as searchRemoveQuery,
  isSavedQuery as searchIsSavedQuery,
  normalizeSavedQueries as searchNormalizeSavedQueries,
  type SavedQuerySerializeOptions,
} from "@spacegraphjs/search";

// Re-export types
export type SavedQuery = SearchSavedQuery;
export const MAX_SAVED_QUERIES = SearchMAX_SAVED_QUERIES;

const serializeOptions: SavedQuerySerializeOptions = {
  knownKinds: NODE_KINDS,
  knownStatuses: NODE_STATUSES,
  knownDomains: DOMAINS,
};

/** Convert a saved query to facets. Delegates to @spacegraphjs/search. */
export const savedQueryFacets = (query: SavedQuery): GraphFacets => {
  return searchSavedQueryFacets(query, serializeOptions) as GraphFacets;
};

/** Default label for a saved query. Delegates to @spacegraphjs/search. */
export const defaultSavedQueryLabel = (facets: GraphFacets): string => {
  return searchDefaultSavedQueryLabel(facets as any, serializeOptions);
};

/**
 * Adds the current facets. The same question saved twice updates its label instead of duplicating
 * the row; the newest question goes first.
 * Delegates to @spacegraphjs/search.
 */
export function saveQuery(
  queries: readonly SavedQuery[],
  facets: GraphFacets,
  label = defaultSavedQueryLabel(facets),
): SavedQuery[] {
  return searchSaveQuery(queries, facets as any, label, serializeOptions);
}

/** Remove a saved query by its serialized query string. Delegates to @spacegraphjs/search. */
export function removeQuery(queries: readonly SavedQuery[], query: string): SavedQuery[] {
  return searchRemoveQuery(queries, query);
}

/** Check if the current facets match a saved query. Delegates to @spacegraphjs/search. */
export function isSavedQuery(queries: readonly SavedQuery[], facets: GraphFacets): boolean {
  return searchIsSavedQuery(queries, facets as any, serializeOptions);
}

/** Validates the persisted list at the store boundary; malformed rows are dropped, duplicates collapse. */
export function normalizeSavedQueries(value: unknown): SavedQuery[] {
  return searchNormalizeSavedQueries(value);
}