import { expect, test } from "bun:test"
import { adapterConformance } from "@spacegraphjs/adapter"
import {
  buildFixtureGraph,
  layoutGraph,
  neighbors,
  nodesAtLevel,
  type ZoomLevel,
} from "@opencode/session-ui/graph"
import { cytoscapeSessionAdapter, sessionGraphAdapter } from "./sessionGraphAdapter"

const model = buildFixtureGraph()
const positions = layoutGraph(model).positions

const STRUCTURAL = new Set(["session", "turn", "phase", "error", "retry", "approval"])

/** The nodes the adapter must draw at a level, in the model's own order. */
const visibleAt = (level: ZoomLevel) => nodesAtLevel(model, level).map((node) => node.id)

/**
 * The fixture describes the session's vocabulary to the library's conformance suite: which node
 * plays the activity card, which one is chrome, and what the focus neighbourhood is. The suite
 * never needs to know a session kind.
 */
function fixture(level: ZoomLevel) {
  const visible = visibleAt(level)
  const built = sessionGraphAdapter.build(model, { level, positions })
  const card = built.nodes.find((node) => node.html !== undefined && !STRUCTURAL.has(node.kind))?.id
  const structural = visible.find((id) => STRUCTURAL.has(model.nodes.find((node) => node.id === id)!.kind))
  const focus = visible.find((id) => neighbors(model, id).nodes.length > 0)
  const lit = focus ? [focus, ...neighbors(model, focus).nodes.map((node) => node.id)] : []
  const phase = visible.find((id) => model.nodes.find((node) => node.id === id)?.kind === "phase")

  return {
    model,
    level,
    positions,
    visible,
    card: card!,
    structural: structural!,
    chip: phase,
    focus,
    lit,
    dimmed: visible.filter((id) => !lit.includes(id)),
    bands: level === "overview" ? [] : model.turns.map((id) => `band:${id}`),
    options: {
      bands: level !== "overview",
      laneLabels: [{ id: "explore", label: "Explore", y: 288 }],
      axisLabels: [{ id: "col:0", label: "Turn", x: 0, y: -30, role: "column" as const }],
    },
  }
}

const EXECUTION = fixture("execution")
const OVERVIEW = fixture("overview")

for (const adapter of [
  { name: "the session adapter", adapter: sessionGraphAdapter },
  { name: "the Cytoscape adapter", adapter: cytoscapeSessionAdapter },
]) {
  for (const level of [EXECUTION, OVERVIEW]) {
    for (const conformanceCase of adapterConformance(adapter.adapter, level)) {
      test(`${adapter.name} at ${level.level}: ${conformanceCase.name}`, conformanceCase.check)
    }
  }
}

test("the Cytoscape adapter caps the card budget at the renderer's DOM capability", () => {
  const plain = sessionGraphAdapter.build(model, { level: "execution", positions })
  const capped = cytoscapeSessionAdapter.build(model, { level: "execution", positions })
  const cards = (built: typeof plain) => built.nodes.filter((node) => node.html !== undefined && !STRUCTURAL.has(node.kind))

  expect(cards(plain).length).toBeGreaterThan(cards(capped).length)
  expect(cards(capped).length).toBeLessThanOrEqual(20)
})

test("the Cytoscape DOM cap mirrors the renderer's declared capability", async () => {
  const { CytoscapeRenderer } = await import("@spacegraphjs/cytoscape-renderer")
  const { CYTOSCAPE_DOM_NODES } = await import("./sessionGraphAdapter")

  expect(new CytoscapeRenderer().capabilities.maxDomNodes).toBe(CYTOSCAPE_DOM_NODES)
})

test("the session model is unchanged by the extraction", () => {
  const built = sessionGraphAdapter.build(model, { level: "execution", positions, bands: true })
  const ids = built.nodes.map((node) => node.id)

  expect(ids.length).toBeGreaterThan(0)
  expect(new Set(ids).size).toBe(ids.length)
})
