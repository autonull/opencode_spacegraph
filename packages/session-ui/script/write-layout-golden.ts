import { buildFixtureGraph } from "../src/graph/fixture"
import { layoutGraph, type GraphLayout } from "../src/graph/layout"
import { matrixLayout, ribbonLayout } from "../src/graph/representation"

/** The positions, the cluster bounds, and the overall bounds as plain rows. */
function dump(layout: GraphLayout) {
  const round = (value: number) => Math.round(value * 100) / 100

  return [
    ...[...layout.positions.entries()].map(([id, point]) => [id, round(point.x), round(point.y), round(point.z)]),
    ...[...layout.clusters.entries()].map(([id, bounds]) => [
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

await Bun.write(
  new URL("../src/graph/layout.golden.json", import.meta.url),
  JSON.stringify(golden, null, 2) + "\n",
)

console.log("golden entries:", Object.keys(golden).join(", "))
