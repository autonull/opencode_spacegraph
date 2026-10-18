import { expect, test } from "bun:test"
import { CONTRACT_VERSION, supports, type RendererCapabilities } from "@spacegraphjs/renderer"

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
