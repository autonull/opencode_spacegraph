import { CARD_SIZE } from "./vocabulary"

/**
 * Where a selected node's detail is shown. The modes are alternatives, not stages: a reader picks
 * one, and the graph stops being the only thing that changes when a node is selected.
 */

export type { DetailMode } from "./vocabulary"

/**
 * How much a card says, given how close the reader is to it. A card's own box never changes — the
 * layout owns the geometry and the positions stay stable — so the tier changes the composition
 * inside the box: a far card is a labelled chip, a near card carries its payload.
 */
export const DETAIL_TIERS = ["far", "mid", "near"] as const

export type DetailTier = (typeof DETAIL_TIERS)[number]

/**
 * The card's world width — the layout's own card box, so the two cannot drift — and the world size
 * of the three lines it can carry. A card is 220 world units wide, so at a screen width of `W` one
 * world unit covers `W / 220` screen pixels and a line of `n` world units reads at `n · W / 220`
 * screen pixels.
 */
export const CARD_WORLD_WIDTH = CARD_SIZE[0]

export const CARD_LINE_WORLD = { label: 13, summary: 12, detail: 11 } as const

/**
 * The reading size: the screen size at which a line of a card is readable. It is a judgement about
 * the reader, and the author is the reader — this one number moves every threshold below.
 */
export const DETAIL_READING_PX = 9

/** The card width at which a line of `world` world units reads at `reading` screen pixels. */
const widthFor = (world: number, reading = DETAIL_READING_PX) => (reading * CARD_WORLD_WIDTH) / world

/** How far past a boundary a card must travel before it changes tier. */
const HYSTERESIS = 0.05

/**
 * The card widths, in screen pixels, at which a card changes tier. A boundary is the width at
 * which the next line reaches the reading size, so the tiers follow the reader's eye instead of a
 * guess about distance: the summary appears when it can be read, and the kind's own line appears
 * when it can be read too. The entry and exit thresholds differ, so a reader sitting on a boundary
 * does not see the card flip back and forth.
 */
export const DETAIL_TIER_WIDTH = {
  far: Math.round(widthFor(CARD_LINE_WORLD.summary)),
  farExit: Math.round(widthFor(CARD_LINE_WORLD.summary) * (1 + HYSTERESIS)),
  near: Math.round(widthFor(CARD_LINE_WORLD.detail)),
  nearExit: Math.round(widthFor(CARD_LINE_WORLD.detail) * (1 - HYSTERESIS)),
} as const

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
