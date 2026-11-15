// Palette adapter: delegates to @spacegraphjs/search.

import type { GraphViewData } from "./model";
import {
  paletteEntries as searchPaletteEntries,
  paletteGroup as searchPaletteGroup,
  type PaletteAction as SearchPaletteAction,
  type PaletteLens as SearchPaletteLens,
  type PaletteSurface as SearchPaletteSurface,
  type PaletteSources as SearchPaletteSources,
  type PaletteEntryKind as SearchPaletteEntryKind,
  type PaletteEntry as SearchPaletteEntry,
  PALETTE_GROUP_ORDER as SearchPaletteGroupOrder,
  PALETTE_NODE_LIMIT as SearchPaletteNodeLimit,
} from "@spacegraphjs/search";

// Re-export types
export type PaletteAction = SearchPaletteAction;
export type PaletteLens = SearchPaletteLens;
export type PaletteSurface = SearchPaletteSurface;
export type PaletteSources = SearchPaletteSources;
export type PaletteEntryKind = SearchPaletteEntryKind;
export type PaletteEntry = SearchPaletteEntry;

export const PALETTE_GROUP_ORDER = SearchPaletteGroupOrder;
export const PALETTE_NODE_LIMIT = SearchPaletteNodeLimit;

/**
 * The rows the palette shows for a query. An empty query shows the commands a reader can run
 * without naming a node; a typed query also ranks the nodes it names.
 * Delegates to @spacegraphjs/search.
 */
export function paletteEntries(
  model: GraphViewData,
  query: string,
  sources: PaletteSources = {},
  nodeLimit = PALETTE_NODE_LIMIT,
): PaletteEntry[] {
  return searchPaletteEntries(model, query, sources, nodeLimit);
}

/** The entries of one kind, in rank order; the palette renders one section per non-empty group. */
export function paletteGroup(entries: readonly PaletteEntry[], kind: PaletteEntryKind): PaletteEntry[] {
  return searchPaletteGroup(entries, kind);
}