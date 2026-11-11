import { describe, expect, test } from "bun:test"
import type { GraphViewData } from "../../../session-ui/src/graph"

/**
 * The plugin bundle carries a generated copy of the graph model at
 * `src/spacegraph/internal/graph`, because the story and plugin bundles cannot load the
 * workspace package. `packages/session-ui/src/graph` is the only editable source; this parity
 * test proves the copy builds, selects, reviews, and lays out the canonical fixture identically.
 *
 * Drift in the source files themselves is caught by `bun script/sync-graph.ts --check`.
 */
const source = await import("../../../session-ui/src/graph")

const bundled = await import("./internal/graph")

/** `turnByMessageID` is a Map, which `toEqual` compares by identity. */
function normalize(model: GraphViewData) {
  return { ...model, turnByMessageID: [...model.turnByMessageID].sort(([a], [b]) => a.localeCompare(b)) }
}

function normalizeSnapshots(snapshots: ReturnType<typeof source.captureTimeTravel>) {
  return snapshots.map((snapshot) => ({ ...snapshot, graph: normalize(snapshot.graph) }))
}

function entries<K, V>(map: ReadonlyMap<K, V>) {
  return [...map].sort(([a], [b]) => String(a).localeCompare(String(b)))
}

const fixture = source.buildFixtureGraph()

const failedResult = fixture.nodes.find((node) => node.kind === "result" && node.status === "failed")!

const subagent = fixture.nodes.find((node) => node.kind === "subagent")!

const firstTurn = fixture.turns[0]!

describe("bundled graph parity", () => {
  test("exports the session-ui public surface", () => {
    expect(Object.keys(bundled).sort()).toEqual(Object.keys(source).sort())
  })

  test("builds the canonical fixture identically", () => {
    expect(normalize(bundled.buildFixtureGraph())).toEqual(normalize(source.buildFixtureGraph()))
  })

  test("builds incrementally and resumes from the same state shape", () => {
    const messages = source.buildFixtureMessages()

    const status = { type: "idle" } as const

    const sourceFirst = source.buildGraphIncremental({ messages, status })

    const bundledFirst = bundled.buildGraphIncremental({ messages, status })

    expect(normalize(bundledFirst.graph)).toEqual(normalize(sourceFirst.graph))

    const sourceSecond = source.buildGraphIncremental({
      messages,
      status,
      previousState: sourceFirst.state,
    })

    const bundledSecond = bundled.buildGraphIncremental({
      messages,
      status,
      previousState: bundledFirst.state,
    })

    expect(normalize(bundledSecond.graph)).toEqual(normalize(sourceSecond.graph))
  })

  test("captures and reads time-travel checkpoints identically", () => {
    const sourceModel = source.buildFixtureGraph()

    const bundledModel = bundled.buildFixtureGraph()

    const sourceSnapshots = source.captureTimeTravel(sourceModel, [], 4)

    const bundledSnapshots = bundled.captureTimeTravel(bundledModel, [], 4)

    expect(normalizeSnapshots(bundledSnapshots)).toEqual(normalizeSnapshots(sourceSnapshots))

    for (const checkpoint of [0, 1, 2, 3])
      expect(normalize(bundled.graphAtCheckpoint(bundledModel, bundledSnapshots, checkpoint))).toEqual(
        normalize(source.graphAtCheckpoint(sourceModel, sourceSnapshots, checkpoint)),
      )
  })

  test("selectors agree over the fixture", () => {
    expect(bundled.why(fixture, failedResult.id), "why").toEqual(source.why(fixture, failedResult.id))
    expect(bundled.breadcrumbs(fixture, failedResult.id), "breadcrumbs").toEqual(
      source.breadcrumbs(fixture, failedResult.id),
    )
    expect(bundled.downstreamChain(fixture, firstTurn), "downstreamChain").toEqual(
      source.downstreamChain(fixture, firstTurn),
    )
    expect(bundled.downstreamForks(fixture, firstTurn), "downstreamForks").toEqual(
      source.downstreamForks(fixture, firstTurn),
    )
    expect(bundled.traceDownstream(fixture, firstTurn), "traceDownstream").toEqual(
      source.traceDownstream(fixture, firstTurn),
    )
    expect(bundled.traceWhy(fixture, failedResult.id), "traceWhy").toEqual(source.traceWhy(fixture, failedResult.id))
    expect(bundled.evidenceFor(fixture, failedResult.id), "evidenceFor").toEqual(
      source.evidenceFor(fixture, failedResult.id),
    )
    expect(bundled.turnSubgraph(fixture, firstTurn), "turnSubgraph").toEqual(source.turnSubgraph(fixture, firstTurn))
    expect(bundled.subagentSubgraph(fixture, subagent.id), "subagentSubgraph").toEqual(
      source.subagentSubgraph(fixture, subagent.id),
    )
    expect(bundled.search(fixture, "auth"), "search").toEqual(source.search(fixture, "auth"))
    expect(bundled.sessionOutline(fixture), "sessionOutline").toEqual(source.sessionOutline(fixture))
    expect(bundled.changedFiles(fixture), "changedFiles").toEqual(source.changedFiles(fixture))
    expect(bundled.unverifiedFiles(fixture), "unverifiedFiles").toEqual(source.unverifiedFiles(fixture))
  })

  test("reviews changes identically, including per-turn stats", () => {
    const before = source.buildFixtureGraph()

    const after: GraphViewData = { ...before, nodes: before.nodes.filter((_, index) => index !== 3) }

    const expected = source.reviewChanges(before, after)

    expect(bundled.reviewChanges(before, after)).toEqual(expected)
    expect(expected.turnStats?.length ?? 0).toBeGreaterThan(0)
  })

  test("projects the review model identically", () => {
    const before = source.buildFixtureGraph()

    const after: GraphViewData = { ...before, nodes: before.nodes.slice(0, -2) }

    expect(normalize(bundled.reviewModel(before, after))).toEqual(normalize(source.reviewModel(before, after)))
  })

  test("lays out the fixture identically", () => {
    const expected = source.layoutGraph(fixture)

    const actual = bundled.layoutGraph(fixture)

    expect(entries(actual.positions)).toEqual(entries(expected.positions))
    expect(entries(actual.clusters)).toEqual(entries(expected.clusters))
    expect(actual.bounds).toEqual(expected.bounds)
    expect(actual.strategy).toEqual(expected.strategy)
  })
})
