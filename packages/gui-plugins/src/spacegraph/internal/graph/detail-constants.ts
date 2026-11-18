/** Semantic constants for detail tiers (T1.11). */

export const DETAIL_READING_PX = 9

/** Hysteresis factor (5%) to prevent tier flapping at boundaries. */
export const DETAIL_HYSTERESIS = 0.05

/** World units per line at each detail tier (decreasing = more content fits). */
export const CARD_LINE_WORLD = {
  label: 13,
  summary: 12,
  detail: 11,
  content: 10,
} as const