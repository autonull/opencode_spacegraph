import { describe, expect, test } from "bun:test"
import { DETAIL_TIER_WIDTH, detailTier } from "./detail"

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
    expect(detailTier(120)).toBe("mid")
  })

  test("a close card carries its payload", () => {
    expect(detailTier(DETAIL_TIER_WIDTH.near)).toBe("near")
    expect(detailTier(400)).toBe("near")
  })

  test("a far card keeps its tier until the card is comfortably readable", () => {
    expect(detailTier(DETAIL_TIER_WIDTH.farExit - 1, "far")).toBe("far")
    expect(detailTier(DETAIL_TIER_WIDTH.farExit, "far")).toBe("mid")
  })

  test("a near card keeps its tier until the card stops being readable", () => {
    expect(detailTier(DETAIL_TIER_WIDTH.nearExit, "near")).toBe("near")
    expect(detailTier(DETAIL_TIER_WIDTH.nearExit - 1, "near")).toBe("mid")
  })

  test("the tier never flips on a single pixel at a boundary", () => {
    const start = detailTier(DETAIL_TIER_WIDTH.far - 1)
    expect(detailTier(DETAIL_TIER_WIDTH.far, start)).toBe("far")
    expect(detailTier(DETAIL_TIER_WIDTH.farExit - 1, start)).toBe("far")
  })
})
