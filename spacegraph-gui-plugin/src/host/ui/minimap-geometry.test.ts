import { expect, test } from "bun:test"
import { MINIMAP_BOX, minimapPanPoint, minimapProjection, nearestNode } from "./minimap-geometry"

const positions = new Map([
  ["a", { x: 0, y: 0 }],
  ["b", { x: 100, y: 0 }],
  ["c", { x: 0, y: 100 }],
])

test("minimapProjection centres content and flips the Y axis into the box", () => {
  const projection = minimapProjection(positions)
  expect(projection.project({ x: 0, y: 0 }).y).toBeGreaterThan(projection.project({ x: 0, y: 100 }).y)
  expect(projection.bounds.minX).toBe(0)
  expect(projection.bounds.maxX).toBe(100)
})

test("minimapPanPoint unprojects a pointer back to graph space", () => {
  const projection = minimapProjection(positions)
  const rect = { left: 10, top: 20, width: MINIMAP_BOX.width, height: MINIMAP_BOX.height } as DOMRect
  const center = minimapPanPoint(10 + MINIMAP_BOX.width / 2, 20 + MINIMAP_BOX.height / 2, rect, projection)
  const projectedCenter = projection.project({ x: 50, y: 50 })
  expect(center.x).toBeCloseTo(50, 5)
  expect(center.y).toBeCloseTo(50, 5)
  expect(center.x).toBeCloseTo(projection.unproject(projectedCenter).x, 5)
})

test("nearestNode picks the closest laid-out node", () => {
  expect(nearestNode({ x: 99, y: 1 }, positions)).toBe("b")
  expect(nearestNode({ x: 1, y: 99 }, positions)).toBe("c")
  expect(nearestNode({ x: 0, y: 0 }, new Map())).toBeUndefined()
})
