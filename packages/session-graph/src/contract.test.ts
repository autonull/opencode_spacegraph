import { expect, test } from "bun:test"
import { CONTRACT_VERSION, supports, type RendererCapabilities } from "@spacegraphjs/renderer"
import { SpaceGraphRenderer } from "@spacegraphjs/spacegraph-renderer"

test("session-graph resolves the @spacegraphjs/renderer workspace package", () => {
  const capabilities: RendererCapabilities = {
    contractVersion: CONTRACT_VERSION,
    projections: ["2d"],
    domNodes: true,
    maxDomNodes: 40,
    edgeLabels: true,
    clusterNodes: true,
    minimap: false,
    maxRecommendedNodes: 300,
  }

  expect(capabilities.contractVersion).toBe(CONTRACT_VERSION)
  expect(supports(capabilities, "2d")).toBe(true)
  expect(supports(capabilities, "3d")).toBe(false)
})

test("session-graph resolves the @spacegraphjs/spacegraph-renderer adapter", () => {
  const capabilities = new SpaceGraphRenderer().capabilities
  expect(capabilities.contractVersion).toBe(CONTRACT_VERSION)
  expect(supports(capabilities, "2d")).toBe(true)
  expect(supports(capabilities, "3d")).toBe(true)
  expect(supports(capabilities, "minimap")).toBe(false)
})
