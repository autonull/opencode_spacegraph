import { expect, test } from "bun:test"
import { supports, type RendererCapabilities } from "@spacegraphjs/renderer"
import { CytoscapeRenderer } from "@spacegraphjs/cytoscape-renderer"
import { SpaceGraphRenderer } from "@spacegraphjs/spacegraph-renderer"
import { renderToSVG } from "@spacegraphjs/svg-renderer"

test("session-graph resolves the @spacegraphjs/renderer workspace package", () => {
  const capabilities: RendererCapabilities = {
    projections: ["2d"],
    depths: ["flat"],
    domNodes: true,
    maxDomNodes: 40,
    edgeLabels: true,
    clusterNodes: true,
    minimap: false,
    maxRecommendedNodes: 300,
  }

  expect(supports(capabilities, "2d")).toBe(true)
  expect(supports(capabilities, "3d")).toBe(false)
})

test("session-graph resolves the @spacegraphjs/spacegraph-renderer adapter", () => {
  const capabilities = new SpaceGraphRenderer().capabilities
  expect(supports(capabilities, "2d")).toBe(true)
  expect(supports(capabilities, "3d")).toBe(true)
  expect(supports(capabilities, "minimap")).toBe(false)
})

test("session-graph resolves the @spacegraphjs/cytoscape-renderer adapter", () => {
  const capabilities = new CytoscapeRenderer().capabilities
  expect(supports(capabilities, "2d")).toBe(true)
  expect(supports(capabilities, "3d")).toBe(false)
  expect(supports(capabilities, "domNodes")).toBe(true)
})

test("session-graph resolves the @spacegraphjs/svg-renderer package", () => {
  const svg = renderToSVG({ nodes: [{ id: "a", kind: "tool", label: "read", position: [0, 0, 0] }], edges: [] })
  expect(svg.startsWith("<svg")).toBe(true)
  expect(svg).toContain("read")
})
