import { describe, expect, test } from "bun:test"
import { buildFixtureGraph } from "./fixture"
import { PROFILE_PRESETS, applyProfile } from "./profiles"
import { nodeDomain } from "./vocabulary"

const preset = (id: string) => PROFILE_PRESETS.find((item) => item.id === id)!

describe("profile presets", () => {
  test("all keeps every domain", () => {
    const model = buildFixtureGraph()
    const all = applyProfile(model, preset("all"))

    expect(all.nodes.length).toBe(model.nodes.length)
  })

  test("session keeps only session nodes", () => {
    const session = applyProfile(buildFixtureGraph(), preset("session"))

    expect(session.nodes.every((node) => nodeDomain(node) === "session")).toBe(true)
  })

  test("code keeps session nodes (no code domain in session-only graph)", () => {
    const code = applyProfile(buildFixtureGraph(), preset("code"))

    expect(code.nodes.every((node) => nodeDomain(node) === "session")).toBe(true)
  })

  test("review drops verification while keeping session", () => {
    const review = applyProfile(buildFixtureGraph(), preset("review"))

    expect(review.nodes.some((node) => nodeDomain(node) === "verification")).toBe(false)
    expect(review.nodes.every((node) => nodeDomain(node) === "session")).toBe(true)
  })
})
