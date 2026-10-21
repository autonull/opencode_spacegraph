/**
 * Where a selected node's detail is shown. The modes are alternatives, not stages: a reader picks
 * one, and the graph stops being the only thing that changes when a node is selected.
 */
export const DETAIL_MODES = ["off", "card", "popover", "panel"] as const

export type DetailMode = (typeof DETAIL_MODES)[number]

/**
 * How much a card says, given how close the reader is to it. A card's own box never changes — the
 * layout owns the geometry and the positions stay stable — so the tier changes the composition
 * inside the box: a far card is a labelled chip, a near card carries its payload.
 */
export const DETAIL_TIERS = ["far", "mid", "near"] as const

export type DetailTier = (typeof DETAIL_TIERS)[number]

/**
 * The card widths, in screen pixels, at which a card changes tier. The entry and exit thresholds
 * differ, so a reader sitting on a boundary does not see the card flip back and forth.
 */
export const DETAIL_TIER_WIDTH = { far: 80, farExit: 96, near: 170, nearExit: 156 } as const

/**
 * The tier a card of `width` screen pixels shows, given the tier it shows now. Pure and total: the
 * caller owns the current tier, so the hysteresis survives across frames.
 */
export function detailTier(width: number, current: DetailTier = "mid"): DetailTier {
  if (current === "far") return width >= DETAIL_TIER_WIDTH.farExit ? "mid" : "far"

  if (current === "near") return width < DETAIL_TIER_WIDTH.nearExit ? "mid" : "near"

  if (width < DETAIL_TIER_WIDTH.far) return "far"

  if (width >= DETAIL_TIER_WIDTH.near) return "near"

  return "mid"
}
