import { SpatialIndex2D } from "@spacegraphjs/kernel"

/**
 * M4 — does the kernel's spatial index beat a linear scan for nearest-node work in the session
 * graph? The graph canvas has no host-side hit-testing today (the renderer owns picking), so this
 * measures the candidate rather than a current call site. Run from `packages/session-graph`:
 *
 *   bun script/spatial-bench.ts
 */

const SIZES = [500, 2_000, 5_000]
const QUERIES = 200
const RADIUS = 120

function random(seed: number) {
  let state = seed

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296

    return state / 4_294_967_296
  }
}

function points(count: number) {
  const next = random(42)
  const list: { id: string; x: number; y: number }[] = []

  for (let index = 0; index < count; index += 1) {
    list.push({ id: `node:${index}`, x: next() * 4_000, y: next() * 4_000 })
  }

  return list
}

for (const size of SIZES) {
  const nodes = points(size)
  const index = new SpatialIndex2D(nodes)
  const next = random(7)

  const queries = Array.from({ length: QUERIES }, () => ({ x: next() * 4_000, y: next() * 4_000 }))

  const indexedStart = performance.now()

  for (const query of queries) index.near(query.x, query.y, RADIUS, 10)

  const indexed = performance.now() - indexedStart
  const scanStart = performance.now()

  for (const query of queries) {
    nodes
      .map((node) => ({ node, distance: Math.hypot(node.x - query.x, node.y - query.y) }))
      .filter((entry) => entry.distance <= RADIUS)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10)
  }

  const scan = performance.now() - scanStart
  const format = (duration: number) => `${(duration * 1000 / QUERIES).toFixed(1)} µs/query`

  console.log(
    `${size} nodes: index ${format(indexed)} · scan ${format(scan)} · ${(scan / indexed).toFixed(1)}x`,
  )
}
