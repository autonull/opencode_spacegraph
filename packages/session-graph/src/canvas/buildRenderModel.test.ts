import { expect, test } from "bun:test"
import { buildFixtureGraph, layoutGraph, type GraphModel, type ZoomLevel } from "@opencode/session-ui/graph"
import { buildRenderModel } from "./buildRenderModel"

const model = buildFixtureGraph()
const positions = layoutGraph(model).positions

const at = (level: ZoomLevel, extra: { cardBudget?: number } = {}) =>
  buildRenderModel(model, { level, positions, ...extra })

const STRUCTURAL = new Set(["session", "turn", "phase", "error", "retry", "approval"])

/** Activity cards consume the DOM budget; structural panels (LE.2) are chrome and never do. */
const activityCards = (built: ReturnType<typeof at>) =>
  built.nodes.filter((node) => node.html !== undefined && !STRUCTURAL.has(node.kind))

const kindsAt = (level: ZoomLevel) => new Set(at(level).nodes.map((node) => node.kind))

test("lane labels are a non-interactive gutter left of the content (LE.10)", () => {
  const labels = [
    { id: "explore", label: "Explore", y: 288 },
    { id: "edit", label: "Edit", y: 384 },
  ]
  const built = buildRenderModel(model, { level: "execution", positions, laneLabels: labels })
  const lanes = built.nodes.filter((node) => node.kind === "lane")

  expect(lanes.length).toBe(2)
  for (const lane of lanes) expect(lane.interactive).toBe(false)

  const contentLeft = Math.min(
    ...built.nodes.filter((node) => node.kind !== "lane" && node.kind !== "band").map((node) => node.position[0]),
  )

  for (const lane of lanes) expect(lane.position[0]).toBeLessThan(contentLeft)
  // Chrome never consumes the activity card budget.
  expect(activityCards(built).length).toBeLessThanOrEqual(40)
})

test("overview shows only session, turns, phase clusters, and subagents", () => {
  const kinds = kindsAt("overview")

  expect([...kinds].sort()).toEqual(["message", "phase", "session", "subagent", "turn"])

  const phases = at("overview").nodes.filter((node) => node.kind === "phase")

  expect(phases.length).toBeGreaterThan(0)

  for (const phase of phases) {
    expect(phase.data?.expanded).toBe(false)
    expect(Number(phase.data?.count)).toBeGreaterThan(0)
  }
})

test("overview phase clusters render as counted cards within the DOM budget", () => {
  const built = at("overview")
  const phases = built.nodes.filter((node) => node.kind === "phase")

  expect(phases.length).toBeGreaterThan(0)

  const chips = phases.filter((node) => node.shape === "card")

  expect(chips.length).toBeGreaterThan(0)

  for (const chip of chips) {
    expect(chip.html).toContain(String(chip.data?.count))
    expect(chip.size?.[0]).toBeLessThan(220)
  }

  expect(activityCards(built).length).toBeLessThanOrEqual(12)
})

test("execution expands phase clusters into legible headers, not collapsed chips", () => {
  const phases = at("execution").nodes.filter((node) => node.kind === "phase")

  expect(phases.length).toBeGreaterThan(0)

  for (const phase of phases) {
    expect(phase.data?.expanded).toBe(true)
    expect(phase.shape).toBe("card")
    expect(phase.html).toBeDefined()
  }
})

test("overview drops the root part-of wires and turn bands (LE.3/LE.6)", () => {
  const built = buildRenderModel(model, { level: "overview", positions, bands: true })

  expect(built.nodes.some((node) => node.kind === "band" && node.data?.band === "turn")).toBe(false)

  for (const edge of built.edges) expect(edge.source).not.toBe(model.root)
})

test("execution adds tools, files, results, errors, and retries", () => {
  const kinds = kindsAt("execution")

  for (const kind of ["tool", "file", "result", "error", "retry"]) expect(kinds.has(kind)).toBe(true)
  expect(kinds.has("reasoning")).toBe(false)
})

test("detail adds low-prominence notices", () => {
  const kinds = kindsAt("detail")

  expect(kinds.has("notice")).toBe(true)
  expect(kinds.has("reasoning")).toBe(false)
})

test("failure statuses map onto the contract vocabulary", () => {
  const statuses = at("execution").nodes.map((node) => node.status)

  expect(statuses).toContain("error")
  expect(statuses).not.toContain("failed")
})

test("cards are budgeted and degrade to labels above the cap", () => {
  const model = at("execution", { cardBudget: 1 })
  const demoted = model.nodes.filter((node) => node.shape === "dot" && node.html === undefined)

  expect(activityCards(model).length).toBe(1)
  expect(demoted.length).toBeGreaterThan(0)
})

test("card markup escapes host content", () => {
  const synthetic: GraphModel = {
    root: "session",
    nodes: [
      { id: "session", kind: "session", label: "Session", status: "neutral" },
      {
        id: "tool:1",
        kind: "tool",
        label: 'read <script>alert("x")</script>',
        summary: '<img src=x onerror="y">',
        status: "failed",
      },
    ],
    edges: [],
    turns: [],
    turnByMessageID: new Map(),
  }

  const html = buildRenderModel(synthetic, { level: "execution", positions: new Map() }).nodes.find(
    (node) => node.id === "tool:1",
  )!.html!

  expect(html).toContain("&lt;script&gt;")
  expect(html).toContain("&lt;img")
  expect(html).not.toContain("<script>")
  expect(html).not.toContain("<img")
})

test("edges never reference a node hidden at the level", () => {
  for (const level of ["overview", "execution", "detail"] as const) {
    const built = at(level)
    const ids = new Set(built.nodes.map((node) => node.id))

    for (const edge of built.edges) {
      expect(ids.has(edge.source)).toBe(true)
      expect(ids.has(edge.target)).toBe(true)
    }
  }
})

test("overview keeps only hierarchy edges", () => {
  expect(new Set(at("overview").edges.map((edge) => edge.kind))).toEqual(new Set(["part-of"]))
})

test("model building is deterministic", () => {
  expect(JSON.stringify(at("execution"))).toBe(JSON.stringify(at("execution")))
})

test("turn and phase swimlane bands wrap the members visible at the level (RF.5)", () => {
  const built = buildRenderModel(model, { level: "execution", positions, bands: true })
  const bands = built.nodes.filter((node) => node.kind === "band")

  expect(bands.length).toBeGreaterThan(0)

  for (const band of bands) {
    expect(band.interactive).toBe(false)
    expect(band.html).toBeDefined()
    expect(band.size?.[0]).toBeGreaterThan(0)
  }

  // Execution draws a band per turn and per expanded phase.
  const turnBands = bands.filter((band) => band.data?.band === "turn")
  expect(turnBands.length).toBe(model.turns.length)
})

test("execution focus dims cards outside the selected neighborhood (RF.10)", () => {
  const focus = "tool:prt_tool_write_1"
  const built = buildRenderModel(model, {
    level: "execution",
    positions,
    bands: true,
    focus,
  })
  const focused = built.nodes.find((node) => node.id === focus)!

  expect(focused.data?.dimmed).toBe(false)
  expect(focused.html).not.toContain("opacity:.3")

  const dimmed = built.nodes.filter((node) => node.data?.dimmed === true && node.html !== undefined)

  expect(dimmed.length).toBeGreaterThan(0)
  expect(dimmed.every((node) => node.html!.includes("opacity:.3"))).toBe(true)
})

test("without a focus nothing is dimmed", () => {
  expect(at("execution").nodes.some((node) => node.data?.dimmed === true)).toBe(false)
})

test("execution focus dims demoted vector nodes through node opacity, not markup (RF.10)", () => {
  const built = buildRenderModel(model, {
    level: "execution",
    positions,
    bands: true,
    focus: "tool:prt_tool_write_1",
    cardBudget: 1,
  })

  // Cards fade through markup; the activity nodes demoted past the budget have no html, so they carry
  // the opacity for the renderer to apply to the vector node itself. Bands are never dimmed.
  const fadedVectors = built.nodes.filter(
    (node) => node.data?.dimmed === true && node.html === undefined,
  )

  expect(fadedVectors.length).toBeGreaterThan(0)
  expect(fadedVectors.every((node) => node.data?.opacity === 0.3)).toBe(true)
})

test("provenance bundling rebases file edges onto their turn spine (LE.13)", () => {
  const plain = at("execution")
  const bundled = buildRenderModel(model, { level: "execution", positions, bundle: true })
  const fileTargets = (built: ReturnType<typeof at>) =>
    built.edges.filter((edge) => edge.target.startsWith("file:"))
  const sources = (built: ReturnType<typeof at>) => new Set(fileTargets(built).map((edge) => edge.source))

  // Every file edge now originates from a turn node, and there are fewer crossing wires than before.
  expect([...sources(bundled)].every((source) => source.startsWith("turn:"))).toBe(true)
  expect(sources(bundled).size).toBeLessThan(sources(plain).size)
  expect(fileTargets(bundled).length).toBeLessThan(fileTargets(plain).length)
  // Nothing that does not touch a file is rebased, so the sequence spine is untouched.
  expect(bundled.edges.some((edge) => edge.kind === "sequence" && edge.source.startsWith("tool:"))).toBe(true)
})

test("hierarchy and inferred edges are dashed, provenance is solid (RF.4)", () => {
  const built = at("detail")
  const style = (kind: string, confidence?: string) =>
    built.edges.find((edge) => edge.kind === kind && (!confidence || edge.confidence === confidence))?.style

  expect(style("part-of")).toBe("dashed")
  expect(style("sequence", "explicit")).toBe("solid")
  expect(style("writes")).toBe("solid")
})
