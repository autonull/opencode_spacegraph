import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import {
  EQUALIZER_PRESETS,
  equalizerFade,
  equalizerHue,
  equalizerMuted,
  equalizerScale,
  ruleMatches,
  type EqualizerRule,
} from "./equalizer"
import { layoutGraph, nodeSize } from "./layout"
import type { GraphNode } from "./model"

const node = (partial: Partial<GraphNode> & Pick<GraphNode, "id" | "kind" | "label" | "status">): GraphNode =>
  partial as GraphNode

const tool = node({ id: "tool:1", kind: "tool", label: "read", status: "success" })
const error = node({ id: "error:1", kind: "error", label: "boom", status: "failed" })

describe("the equalizer's rules", () => {
  test("a rule speaks to a kind and a status", () => {
    expect(ruleMatches({ id: "a", kind: "tool" }, tool)).toBe(true)
    expect(ruleMatches({ id: "a", kind: "error" }, tool)).toBe(false)
    expect(ruleMatches({ id: "a", status: "failed" }, error)).toBe(true)
    expect(ruleMatches({ id: "a", status: "failed" }, tool)).toBe(false)
    expect(ruleMatches({ id: "a" }, tool)).toBe(true)
  })

  test("the last matching rule wins, so the reader's order is their order", () => {
    const rules: EqualizerRule[] = [
      { id: "a", kind: "tool", scale: 1.2 },
      { id: "b", kind: "tool", scale: 1.5 },
    ]

    expect(equalizerScale(rules, tool)).toBe(1.5)
  })

  test("a node with no matching rule keeps its own size and accent", () => {
    expect(equalizerScale([{ id: "a", kind: "error", scale: 2 }], tool)).toBe(1)
    expect(equalizerHue([{ id: "a", kind: "error", hue: 10 }], tool)).toBeUndefined()
    expect(equalizerMuted([{ id: "a", kind: "error", muted: true }], tool)).toBe(false)
  })

  test("an age rule fades a card but never moves it", () => {
    const rules: EqualizerRule[] = [{ id: "a", fadeAfter: 600 }]
    const old = node({ id: "tool:1", kind: "tool", label: "read", status: "success", time: 0 })

    // A fresh card is untouched; an old one fades.
    expect(equalizerFade(rules, tool, 0)).toBe(1)
    expect(equalizerFade(rules, old, 601_000)).toBeLessThan(1)
    // The fade never reaches zero: a card that disappears is a card the reader cannot find.
    expect(equalizerFade(rules, old, 10_000_000_000)).toBeGreaterThanOrEqual(0.25)
  })
})

describe("what a rule costs", () => {
  const model = buildFixtureGraph()

  test("a style rule leaves the positions where they were", () => {
    const plain = layoutGraph(model, { strategy: "lanes", level: "execution" })
    const styled = layoutGraph(model, {
      strategy: "lanes",
      level: "execution",
      nodeSizeFn: (node) => nodeSize(node),
    })

    expect([...styled.positions.keys()].sort()).toEqual([...plain.positions.keys()].sort())
    for (const [id, position] of plain.positions) {
      expect(styled.positions.get(id)).toEqual(position)
    }
  })

  test("a size rule re-lays-out the map, because the cell cursor reads the card's box", () => {
    const plain = layoutGraph(model, { strategy: "lanes", level: "execution" })
    const scaled = layoutGraph(model, {
      strategy: "lanes",
      level: "execution",
      nodeSizeFn: (node) => {
        const scale = equalizerScale([{ id: "a", kind: "tool", scale: 1.5 }], node)
        return [220 * scale, 72 * scale]
      },
    })

    const moved = [...plain.positions].filter(([id, position]) => {
      const other = scaled.positions.get(id)
      return !other || other.x !== position.x
    })

    expect(moved.length).toBeGreaterThan(0)
  })

  test("the presets are named rule sets, and each one says something", () => {
    expect(EQUALIZER_PRESETS.length).toBeGreaterThanOrEqual(3)
    for (const preset of EQUALIZER_PRESETS) {
      expect(preset.id.length).toBeGreaterThan(0)
      expect(preset.rules.length).toBeGreaterThan(0)
    }
  })
})
