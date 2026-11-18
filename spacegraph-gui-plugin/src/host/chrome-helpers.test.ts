import { expect, test } from "bun:test"
import { nextValue, openInspectorWindow } from "./chrome-helpers"

test("nextValue wraps and tolerates an unknown current value", () => {
  expect(nextValue(["a", "b", "c"] as const, "a")).toBe("b")
  expect(nextValue(["a", "b", "c"] as const, "c")).toBe("a")
  expect(nextValue(["a", "b", "c"] as const, "missing" as "a")).toBe("a")
})

test("openInspectorWindow raises the existing inspector instead of stacking a duplicate", () => {
  const windows = [
    { id: "a", kind: "inspector", nodeID: "node-1", left: 24, top: 24, width: 360, height: 320, z: 1 },
    { id: "b", kind: "inspector", nodeID: "node-2", left: 48, top: 48, width: 360, height: 320, z: 2 },
  ]
  const next = openInspectorWindow(windows, "node-1")
  expect(next).toHaveLength(2)
  expect(next[0]?.z).toBe(3)
  expect(next[1]?.z).toBe(2)
})

test("openInspectorWindow offsets and raises a new inspector", () => {
  const next = openInspectorWindow([], "node-1")
  expect(next[0]).toMatchObject({ id: "inspector-node-1", nodeID: "node-1", kind: "inspector", z: 1, left: 24, top: 24 })
  const second = openInspectorWindow(next, "node-2")
  expect(second[1]).toMatchObject({ nodeID: "node-2", z: 2, left: 48, top: 48 })
})
