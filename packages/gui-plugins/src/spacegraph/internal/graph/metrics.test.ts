import { afterEach, describe, expect, test } from "bun:test"
import { Metrics } from "./metrics"

describe("graph interaction metrics", () => {
  afterEach(() => {
    Metrics.disable()
    Metrics.reset()
  })

  test("counts nothing while it is off", () => {
    Metrics.count("select")
    Metrics.count("search")
    expect(Metrics.total()).toBe(0)
  })

  test("counts every action once it is on", () => {
    Metrics.enable()
    Metrics.count("select")
    Metrics.count("select")
    Metrics.count("search")
    expect(Metrics.counts().select).toBe(2)
    expect(Metrics.counts().search).toBe(1)
    expect(Metrics.total()).toBe(3)
  })

  test("zeroes the counters on a reset", () => {
    Metrics.enable()
    Metrics.count("fit")
    Metrics.reset()
    expect(Metrics.total()).toBe(0)
  })

  test("tells its subscribers about a new count", () => {
    const seen: number[] = []
    const unsubscribe = Metrics.subscribe((counts) => seen.push(Object.values(counts).reduce((sum, value) => sum + value, 0)))

    Metrics.enable()
    Metrics.count("zoom")
    Metrics.count("zoom")
    unsubscribe()
    Metrics.count("zoom")

    expect(seen).toEqual([0, 1, 2])
  })
})
