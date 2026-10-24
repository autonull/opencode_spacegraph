import { describe, expect, test } from "bun:test"
import { buildFixtureGraphWithSnapshot } from "./fixture"
import { PROFILE_PRESETS, applyProfile } from "./profiles"
import { nodeDomain } from "./vocabulary"

const preset = (id: string) => PROFILE_PRESETS.find((item) => item.id === id)!

describe("profile presets", () => {
  test("all keeps every domain", () => {
    const model = buildFixtureGraphWithSnapshot()
    const all = applyProfile(model, preset("all"))

    expect(all.nodes.length).toBe(model.nodes.length)
  })

  test("session keeps only session nodes", () => {
    const session = applyProfile(buildFixtureGraphWithSnapshot(), preset("session"))

    expect(session.nodes.every((node) => nodeDomain(node) === "session")).toBe(true)
  })

  test("code keeps session and code domains", () => {
    const code = applyProfile(buildFixtureGraphWithSnapshot(), preset("code"))

    expect(code.nodes.every((node) => ["session", "code"].includes(nodeDomain(node)))).toBe(true)
    expect(code.nodes.some((node) => node.kind === "symbol")).toBe(true)
  })

  test("review drops runtime and verification while keeping history", () => {
    const review = applyProfile(buildFixtureGraphWithSnapshot(), preset("review"))

    expect(review.nodes.some((node) => nodeDomain(node) === "runtime")).toBe(false)
    expect(review.nodes.some((node) => nodeDomain(node) === "verification")).toBe(false)
    expect(review.nodes.some((node) => node.kind === "commit")).toBe(true)
  })
})
