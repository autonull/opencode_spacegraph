import { expect, test } from "bun:test"
import { CONTRACT_VERSION, type GraphRenderer } from "@spacegraphjs/renderer"
import { ADAPTER_THEME } from "../contract/fixtures"
import { createRenderer, mountRenderer, rendererOrder } from "./renderer-registry"

function stub(): GraphRenderer {
  return {
    capabilities: {
      contractVersion: CONTRACT_VERSION,
      projections: ["2d"],
      domNodes: false,
      maxDomNodes: 0,
      edgeLabels: false,
      clusterNodes: false,
      minimap: false,
      maxRecommendedNodes: 0,
    },
    mount: async () => {},
    setModel: () => {},
    setTheme: () => {},
    setProjection: () => {},
    setSelection: () => {},
    setViewport: () => {},
    fit: () => {},
    focus: () => {},
    resize: () => {},
    on: () => () => {},
    dispose: () => {},
  }
}

const container = {} as HTMLElement
const options = { theme: ADAPTER_THEME, projection: "2d" as const }

test("spacegraph is preferred and cytoscape is its fallback", () => {
  expect(rendererOrder()).toEqual(["spacegraph", "cytoscape"])
  expect(rendererOrder("cytoscape")).toEqual(["cytoscape"])
})

test("createRenderer exposes capabilities without mounting", async () => {
  expect((await createRenderer("spacegraph")).capabilities.projections).toContain("3d")
  expect((await createRenderer("cytoscape")).capabilities.projections).toEqual(["2d"])
})

test("a failing preferred mount falls through to the fallback", async () => {
  const mounted = await mountRenderer(container, options, {
    spacegraph: () => Promise.reject(new Error("no webgl")),
    cytoscape: async () => stub(),
  })

  expect(mounted.id).toBe("cytoscape")
  expect(mounted.fallback).toBe(true)
  expect((mounted.error as Error).message).toBe("no webgl")
})

test("every renderer failing rethrows the last error", async () => {
  const run = mountRenderer(container, options, {
    spacegraph: () => Promise.reject(new Error("no webgl")),
    cytoscape: () => Promise.reject(new Error("no dom")),
  })

  await expect(run).rejects.toThrow("no dom")
})
