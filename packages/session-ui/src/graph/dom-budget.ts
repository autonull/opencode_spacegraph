/** Semantic DOM budget constants for semantic zoom levels. */

export const DOM_BUDGET = {
  /** Overview: session, turn, phase clusters only (12 cards max). */
  overview: 12,
  /** Execution: all nodes except reasoning/diff/compaction (40 cards max). */
  execution: 40,
  /** Detail: all nodes (24 cards max — more detail per card, fewer cards). */
  detail: 24,
} as const