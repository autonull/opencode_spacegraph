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
    if (!current) {
      console.log('[useCapabilityFallback] No capabilities yet')
      return
    }
    const proj = projection()
    const d = depth()
    console.log('[useCapabilityFallback] Running', { capabilities: current.depths, projection: proj, depth: d })
    if (proj === "3d" && !supports(current, "3d")) {
      console.log('[useCapabilityFallback] 3d not supported, setting projection to 2d')
      setProjection("2d")
    }
    if (!supportsDepth(current, d)) {
      console.log('[useCapabilityFallback] Depth not supported, falling back to flat', { depth: d })
      setDepth("flat")
      if (d !== "flat") setProjection("2d")
    } else {
      console.log('[useCapabilityFallback] Depth supported, keeping', { depth: d })
    }
  })
}