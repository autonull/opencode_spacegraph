import { describe, expect, it } from "bun:test"
import { analyzeCompaction, measureCompaction } from "./compaction"
import { buildFixtureGraph } from "./fixture"

const model = buildFixtureGraph()
const analysis = analyzeCompaction(model)
const measurement = measureCompaction(analysis)

describe("compaction advisor measurement", () => {
  it("records the keep-all baseline on the canonical fixture", () => {
    expect(measurement.totalNodes).toBe(46)
    expect(measurement.totalTokens).toBe(855)
    expect(measurement.keptNodes).toBe(46)
    expect(measurement.droppedTokens).toBe(0)
    expect(measurement.droppedShare).toBe(0)
  })

  it("does not beat the baseline: no fixture node reaches low or drop", () => {
    expect(analysis.stats.low).toBe(0)
    expect(analysis.stats.drop).toBe(0)
    expect(measurement.keptTokens).toBe(measurement.totalTokens)
  })

  it("retains the full decision spine", () => {
    expect(measurement.decisionSpine).toBe(31)
    expect(measurement.decisionSpineRetained).toBe(31)
    expect(measurement.decisionSpineRetention).toBe(1)
  })

  it("names the decision without the transcript", () => {
    const evidence = analysis.decisionSpine
      .map((id) => model.nodes.find((node) => node.id === id))
      .map((node) => `${node?.label ?? ""} ${node?.summary ?? ""}`)
      .join("\n")

    expect(evidence).toContain("FAIL auth refresh token")
    expect(evidence).toContain("Expected refresh token to be stored")
    expect(evidence).toContain("fixed refresh path")
    expect(evidence).toContain("3 pass 0 fail")
  })

  it("analyzes the fixture within the advisor latency budget", () => {
    const start = performance.now()
    for (let iteration = 0; iteration < 100; iteration++) analyzeCompaction(model)
    const average = (performance.now() - start) / 100

    expect(average).toBeLessThan(5)
  })
})
