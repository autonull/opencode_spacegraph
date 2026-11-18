/**
 * Renderer breadth policy (§19.12). The thresholds are a contract, not a claim: the registry today
 * exposes only the WebGL renderer, so a host that asks for a wider renderer gets SpaceGraph until
 * that renderer is registered. Inline previews are always the static SVG path.
 */
export type RendererStrategy = "svg-preview" | "spacegraph" | "cytoscape"

export const RENDERER_STRATEGY_THRESHOLDS = {
  /** Below this, a static SVG preview is cheaper than mounting a WebGL scene. */
  preview: 50,
  /** Above this, the WebGL scene is above its recommended node count. */
  canvas: 300,
} as const

export type RendererStrategyOptions = {
  /** Whether the host registered the Cytoscape 2D renderer. */
  cytoscape?: boolean
}

/**
 * The renderer a surface should ask for. The fallback is always SpaceGraph, so asking for a
 * renderer that is not registered never leaves the map blank.
 */
export function chooseRendererStrategy(nodeCount: number, options: RendererStrategyOptions = {}): RendererStrategy {
  if (nodeCount < RENDERER_STRATEGY_THRESHOLDS.preview) return "svg-preview"
  if (nodeCount <= RENDERER_STRATEGY_THRESHOLDS.canvas) return "spacegraph"
  if (options.cytoscape) return "cytoscape"
  return "spacegraph"
}

/** Map the policy onto the renderer ids the canvas registry can mount. */
export function canvasRendererFor(strategy: RendererStrategy): "spacegraph" {
  return "spacegraph"
}
