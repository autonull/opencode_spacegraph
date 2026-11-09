import { createEffect } from "solid-js"
import { supports, supportsDepth } from "@spacegraphjs/renderer"
import type { DepthMode, Projection, RendererCapabilities } from "@spacegraphjs/renderer"

export function useCapabilityFallback(
  capabilities: () => RendererCapabilities | undefined,
  projection: () => Projection,
  depth: () => DepthMode,
  setProjection: (p: Projection) => void,
  setDepth: (d: DepthMode) => void,
) {
  createEffect(() => {
    const current = capabilities()
    if (!current) return
    const proj = projection()
    const d = depth()
    if (proj === "3d" && !supports(current, "3d")) setProjection("2d")
    if (!supportsDepth(current, d)) {
      setDepth("flat")
      if (d !== "flat") setProjection("2d")
    }
  })
}
