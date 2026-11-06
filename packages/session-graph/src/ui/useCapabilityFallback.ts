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
    if (projection() === "3d" && !supports(current, "3d")) setProjection("2d")
    if (!supportsDepth(current, depth())) setDepth("flat")
  })
}