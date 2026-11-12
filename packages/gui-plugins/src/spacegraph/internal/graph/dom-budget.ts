/** Semantic DOM budget constants for semantic zoom levels. */
export const DOM_BUDGET = {
  /** Overview: session, turn, phase clusters only (24 cards max). */
  overview: 24,
  /** Execution: all nodes except reasoning/diff/compaction (80 cards max). */
  execution: 80,
  /** Detail: all nodes (48 cards max — more detail per card, fewer cards). */
  detail: 48,
} as const

export type DomBudgetLevel = keyof typeof DOM_BUDGET

/** Card density the reader chose; compact cards hold less, so more fit. */
export type CardDensity = "comfortable" | "compact" | "cozy"

export const CARD_DENSITY_SCALE: Record<CardDensity, number> = {
  comfortable: 1,
  compact: 1.25,
  cozy: 0.9,
}

/** The viewport the per-level budgets were chosen against. */
export const DOM_BUDGET_VIEWPORT = { width: 1280, height: 800 } as const

/**
 * The card budget for a level in a viewport. The table above answers the reference viewport; a
 * larger viewport can show more cards without crowding and a smaller one fewer. The result stays
 * between half and double the table so a tiny window never erases the map and a huge one never
 * floods it.
 */
export function viewportCardBudget(
  level: DomBudgetLevel,
  viewport: { width: number; height: number } | undefined,
  density: CardDensity = "comfortable",
): number {
  const base = DOM_BUDGET[level]

  if (!viewport || viewport.width <= 0 || viewport.height <= 0) return base

  const area = viewport.width * viewport.height
  const reference = DOM_BUDGET_VIEWPORT.width * DOM_BUDGET_VIEWPORT.height
  const scaled = base * Math.sqrt(area / reference) * CARD_DENSITY_SCALE[density]

  return Math.min(base * 2, Math.max(Math.ceil(base / 2), Math.round(scaled)))
}
