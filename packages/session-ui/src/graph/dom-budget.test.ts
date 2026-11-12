import { describe, expect, test } from "bun:test"
import { DOM_BUDGET, DOM_BUDGET_VIEWPORT, viewportCardBudget } from "./dom-budget"

// M4 — the card budget answers the viewport, not only the semantic level. A desk-sized window
// keeps the table's number; a small pane spends fewer cards and a large display more.
describe("the card budget follows the viewport", () => {
  test("the reference viewport keeps the level's table value", () => {
    expect(viewportCardBudget("overview", DOM_BUDGET_VIEWPORT)).toBe(DOM_BUDGET.overview)
    expect(viewportCardBudget("execution", DOM_BUDGET_VIEWPORT)).toBe(DOM_BUDGET.execution)
    expect(viewportCardBudget("detail", DOM_BUDGET_VIEWPORT)).toBe(DOM_BUDGET.detail)
  })

  test("a small pane spends fewer cards and a large display more", () => {
    expect(viewportCardBudget("execution", { width: 640, height: 480 })).toBeLessThan(DOM_BUDGET.execution)
    expect(viewportCardBudget("execution", { width: 2560, height: 1440 })).toBeGreaterThan(DOM_BUDGET.execution)
  })

  test("the result stays between half and double the table so neither extreme empties or floods the map", () => {
    const tiny = viewportCardBudget("overview", { width: 1, height: 1 })
    const huge = viewportCardBudget("overview", { width: 8000, height: 8000 })

    expect(tiny).toBe(Math.ceil(DOM_BUDGET.overview / 2))
    expect(huge).toBe(DOM_BUDGET.overview * 2)
  })

  test("an unknown viewport keeps the table value", () => {
    expect(viewportCardBudget("detail", undefined)).toBe(DOM_BUDGET.detail)
    expect(viewportCardBudget("detail", { width: 0, height: 0 })).toBe(DOM_BUDGET.detail)
  })

  test("compact cards fit more than comfortable ones and cozy cards fewer", () => {
    const viewport = { width: 1280, height: 800 }

    expect(viewportCardBudget("execution", viewport, "compact")).toBeGreaterThan(
      viewportCardBudget("execution", viewport, "comfortable"),
    )
    expect(viewportCardBudget("execution", viewport, "cozy")).toBeLessThan(
      viewportCardBudget("execution", viewport, "comfortable"),
    )
  })
})
