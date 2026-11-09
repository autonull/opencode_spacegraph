/** Semantic DOM budget constants for semantic zoom levels. */

export const DOM_BUDGET = {
  /** Overview: session, turn, phase clusters only (24 cards max). */
  overview: 24,
  /** Execution: all nodes except reasoning/diff/compaction (80 cards max). */
  execution: 80,
  /** Detail: all nodes (48 cards max — more detail per card, fewer cards). */
  detail: 48,
} as const