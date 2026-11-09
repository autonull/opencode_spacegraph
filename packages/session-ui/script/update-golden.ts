#!/usr/bin/env bun
// Regenerate the layout golden file

import { buildFixtureGraph } from "../src/graph/fixture"
import { layoutGraph } from "../src/graph/layout"
import { ribbonLayout, matrixLayout } from "../src/graph/summary"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { join, dirname } from "node:path"
import type { GraphLayout } from "../src/graph/layout"

const __dirname = dirname(fileURLToPath(import.meta.url))
const GOLDEN_PATH = join(__dirname, "..", "src", "graph", "layout.golden.json")

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function dump(layout: GraphLayout) {
  return [
    [...layout.positions.entries()].map(([id, point]) => [id, round(point.x), round(point.y), round(point.z)]),
    [...layout.clusters.entries()].map(([id, bounds]) => [
      id,
      round(bounds.min.x),
      round(bounds.min.y),
      round(bounds.min.z),
      round(bounds.max.x),
      round(bounds.max.y),
      round(bounds.max.z),
    ]),
    [
      round(layout.bounds.min.x),
      round(layout.bounds.min.y),
      round(layout.bounds.min.z),
      round(layout.bounds.max.x),
      round(layout.bounds.max.y),
      round(layout.bounds.max.z),
    ],
  ]
}

async function main() {
  const model = buildFixtureGraph()

  const golden = {
    lanes: dump(layoutGraph(model)),
    overview: dump(layoutGraph(model, { level: "overview" })),
    execution: dump(layoutGraph(model, { level: "execution" })),
    timeline: dump(layoutGraph(model, { strategy: "timeline" })),
    hierarchy: dump(layoutGraph(model, { strategy: "hierarchy" })),
    tree: dump(layoutGraph(model, { strategy: "tree" })),
    force: dump(layoutGraph(model, { strategy: "force" })),
    ribbon: dump(ribbonLayout(model)),
    matrix: dump(matrixLayout(model)),
  }

  writeFileSync(GOLDEN_PATH, JSON.stringify(golden, null, 2))
  console.log("Golden file updated at:", GOLDEN_PATH)
}

main()