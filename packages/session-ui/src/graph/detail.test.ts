import { describe, expect, test } from "bun:test"
import {
  CARD_LINE_WORLD,
  CARD_WORLD_WIDTH,
  DETAIL_READING_PX,
  DETAIL_TIER_WIDTH,
  detailTier,
} from "./detail"

// The tier is the legibility the reader actually has: a card far away says less, because more text
// in the same box would be a smudge. The thresholds are separate in and out, so a reader sitting on
// a boundary does not see the card flip back and forth.
describe("detailTier", () => {
  test("a card too small to read says less", () => {
    expect(detailTier(40)).toBe("far")
    expect(detailTier(DETAIL_TIER_WIDTH.far - 1)).toBe("far")
  })

  test("a readable card carries its summary", () => {
    expect(detailTier(DETAIL_TIER_WIDTH.far)).toBe("mid")
    expect(detailTier(DETAIL_TIER_WIDTH.far + 1)).toBe("mid")
  })

  test("a close card carries its payload", () => {
    expect(detailTier(DETAIL_TIER_WIDTH.near)).toBe("near")
    expect(detailTier(DETAIL_TIER_WIDTH.near + 1)).toBe("near")
  })

  test("the closest card carries the payload itself", () => {
    expect(detailTier(DETAIL_TIER_WIDTH.closest)).toBe("closest")
    expect(detailTier(DETAIL_TIER_WIDTH.closest + 40)).toBe("closest")
  })

  test("a far card keeps its tier until the card is comfortably readable", () => {
    expect(detailTier(DETAIL_TIER_WIDTH.farExit - 1, "far")).toBe("far")
    expect(detailTier(DETAIL_TIER_WIDTH.farExit, "far")).toBe("mid")
  })

  test("a near card keeps its tier until the card stops being readable", () => {
    expect(detailTier(DETAIL_TIER_WIDTH.nearExit, "near")).toBe("near")
    expect(detailTier(DETAIL_TIER_WIDTH.nearExit - 1, "near")).toBe("mid")
  })

  test("the closest card keeps its tier until the payload stops being readable", () => {
    expect(detailTier(DETAIL_TIER_WIDTH.closestExit, "closest")).toBe("closest")
    expect(detailTier(DETAIL_TIER_WIDTH.closestExit - 1, "closest")).toBe("near")
  })

  test("the tier never flips on a single pixel at a boundary", () => {
    const start = detailTier(DETAIL_TIER_WIDTH.far - 1)
    expect(detailTier(DETAIL_TIER_WIDTH.far, start)).toBe("far")
    expect(detailTier(DETAIL_TIER_WIDTH.farExit - 1, start)).toBe("far")
  })
})

// T11.4 — a tier boundary is the card width at which the next line reaches the reading size. The
// thresholds are derived, not guessed, so the numbers in the plan and the numbers in the code are
// the same numbers.
describe("the tier thresholds", () => {
  const widthFor = (world: number) => (DETAIL_READING_PX * CARD_WORLD_WIDTH) / world

  test("the summary appears at the width where it reads", () => {
    expect(DETAIL_TIER_WIDTH.far).toBe(Math.round(widthFor(CARD_LINE_WORLD.summary)))
  })

  test("the kind's own line appears at the width where it reads", () => {
    expect(DETAIL_TIER_WIDTH.near).toBe(Math.round(widthFor(CARD_LINE_WORLD.detail)))
  })

  test("the payload appears at the width where a line a step smaller reads", () => {
    expect(DETAIL_TIER_WIDTH.closest).toBe(Math.round(widthFor(CARD_LINE_WORLD.content)))
  })

  test("the boundaries are the ones the plan states", () => {
    expect(DETAIL_TIER_WIDTH.far).toBe(165)
    expect(DETAIL_TIER_WIDTH.farExit).toBe(173)
    expect(DETAIL_TIER_WIDTH.near).toBe(180)
    expect(DETAIL_TIER_WIDTH.nearExit).toBe(171)
    expect(DETAIL_TIER_WIDTH.closest).toBe(198)
    expect(DETAIL_TIER_WIDTH.closestExit).toBe(188)
  })

  test("the fit's floor is below the summary's threshold, so the default view shows labels", () => {
    // A card at the fit's legibility floor (half size) is 110 screen pixels wide.
    expect(CARD_WORLD_WIDTH / 2).toBeLessThan(DETAIL_TIER_WIDTH.far)
  })
})
