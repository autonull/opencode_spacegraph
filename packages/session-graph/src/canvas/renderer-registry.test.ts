import { expect, test } from "bun:test"
import { type GraphRenderer } from "@spacegraphjs/renderer"
import { DARK_THEME } from "../fixtures"
import { createRenderer, mountRenderer, rendererOrder } from "./renderer-registry"

function stub(): GraphRenderer {
  return {
    capabilities: {
      projections: ["2d", "3d"],
      depths: ["flat", "layered", "depth-stack", "orbit"],
      domNodes: true,
      maxDomNodes: 40,
      edgeLabels: true,
      clusterNodes: true,
      minimap: false,
      maxRecommendedNodes: 300,
      zoomRange: { min: 0, max: 1 },
      cardFacing: true,
      fitInsets: true,
    },
    mount: async () => {},
    setModel: () => {},
    setTheme: () => {},
    setProjection: () => {},
    setDepth: () => {},
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
const options = { theme: DARK_THEME, projection: "2d" as const }

test("rendererOrder always returns spacegraph", () => {
  expect(rendererOrder()).toEqual(["spacegraph"])
  expect(rendererOrder("spacegraph")).toEqual(["spacegraph"])
})

test("createRenderer exposes capabilities without mounting", async () => {
  expect((await createRenderer("spacegraph")).capabilities.projections).toContain("3d")
})

test("a failing mount throws the error (no fallback)", async () => {
  await expect(mountRenderer(container, options, {
    spacegraph: () => Promise.reject(new Error("no webgl")),
  })).rejects.toThrow("no webgl")
})

test("successful mount returns spacegraph without fallback", async () => {
  const mounted = await mountRenderer(container, options, {
    spacegraph: async () => stub(),
  })

  expect(mounted.id).toBe("spacegraph")
  expect(mounted.fallback).toBe(false)
})