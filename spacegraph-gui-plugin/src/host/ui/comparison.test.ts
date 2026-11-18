import { expect, test } from "bun:test"
import type { WindowState } from "@spacegraphjs/window-manager"
import { buildFixtureGraph } from "../../model/fixture"
import { compareParked, compareTurns } from "./comparison"
import { pinnedAnchors, proposeWindow, windowKind } from "./window-placement"

const model = buildFixtureGraph()

test("compareTurns names two turns and keeps counts in sync with the sets", () => {
  const [before, after] = model.turns
  const result = compareTurns(model, before, after)
  expect(result.label).toBe("turns")
  expect(result.counts.added).toBe(result.added.size)
  expect(result.counts.removed).toBe(result.removed.size)
  expect(result.counts.changed).toBe(result.changed.size)
})

test("compareParked is undefined for live or the final turn", () => {
  expect(compareParked(model, undefined)).toBeUndefined()
  expect(compareParked(model, model.turns.length - 1)).toBeUndefined()
  if (model.turns.length > 1) {
    const parked = compareParked(model, 0)
    expect(parked?.label).toBe("parked")
  }
})

test("proposeWindow clamps to the canvas and stacks above existing windows", () => {
  const small = proposeWindow("find", undefined, { canvas: { width: 100, height: 80 }, windows: [] })
  expect(small.width).toBe(240)
  expect(small.left).toBe(0)
  expect(small.top).toBe(0)

  const existing: WindowState[] = [{ id: "inspector:a", kind: "inspector", nodeID: "a", left: 24, top: 24, width: 360, height: 320, z: 4 }]
  const next = proposeWindow("compare", "turn-1", { canvas: { width: 800, height: 600 }, windows: existing })
  expect(next.id).toBe("compare:turn-1")
  expect(next.z).toBe(5)
  expect(next.left).toBe(48)
  expect(windowKind([{ name: "compare", title: () => "Compare", render: () => null }], next)?.name).toBe("compare")
})

test("pinnedAnchors ignores free and unsolvable windows", () => {
  const windows: WindowState[] = [
    { id: "a", kind: "inspector", nodeID: "a", left: 0, top: 0, width: 10, height: 10, z: 1, pinned: true },
    { id: "b", kind: "inspector", nodeID: "missing", left: 0, top: 0, width: 10, height: 10, z: 1, pinned: true },
    { id: "c", kind: "inspector", nodeID: "c", left: 0, top: 0, width: 10, height: 10, z: 1 },
  ]
  const anchors = pinnedAnchors(windows, (id) => (id === "a" ? { x: 10, y: 20 } : undefined))
  expect([...anchors]).toEqual([["a", { x: 10, y: 20 }]])
})
