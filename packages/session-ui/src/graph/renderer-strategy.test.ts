import { describe, expect, test } from "bun:test"
import {
  canvasRendererFor,
  chooseRendererStrategy,
  RENDERER_STRATEGY_THRESHOLDS,
} from "./renderer-strategy"

describe("renderer breadth policy", () => {
  test("small maps use the static preview", () => {
    expect(chooseRendererStrategy(0)).toBe("svg-preview")
    expect(chooseRendererStrategy(RENDERER_STRATEGY_THRESHOLDS.preview - 1)).toBe("svg-preview")
  })

  test("interactive maps use SpaceGraph up to its recommended count", () => {
    expect(chooseRendererStrategy(RENDERER_STRATEGY_THRESHOLDS.preview)).toBe("spacegraph")
    expect(chooseRendererStrategy(RENDERER_STRATEGY_THRESHOLDS.canvas)).toBe("spacegraph")
  })

  test("large maps use Cytoscape only when it is registered", () => {
    expect(chooseRendererStrategy(RENDERER_STRATEGY_THRESHOLDS.canvas + 1)).toBe("spacegraph")
    expect(chooseRendererStrategy(RENDERER_STRATEGY_THRESHOLDS.canvas + 1, { cytoscape: true })).toBe("cytoscape")
  })

  test("an unregistered renderer falls back to the one the canvas can mount", () => {
    expect(canvasRendererFor("svg-preview")).toBe("spacegraph")
    expect(canvasRendererFor("cytoscape")).toBe("spacegraph")
  })
})
