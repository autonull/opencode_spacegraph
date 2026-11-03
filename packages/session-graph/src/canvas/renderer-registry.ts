import { type GraphRenderer, type Projection, type RenderTheme } from "@spacegraphjs/renderer"

export type RendererID = "spacegraph"

export type RendererFactory = () => Promise<GraphRenderer>

/** SpaceGraphJS only — no fallback. */
const FACTORIES: Record<RendererID, RendererFactory> = {
  spacegraph: async () => new (await import("@spacegraphjs/spacegraph-renderer")).SpaceGraphRenderer(),
}

/** Constructs the SpaceGraph adapter without mounting. */
export function createRenderer(id: RendererID): Promise<GraphRenderer> {
  return FACTORIES[id]()
}

/** Always returns SpaceGraphJS — no Cytoscape fallback. */
export function rendererOrder(preferred: RendererID = "spacegraph"): RendererID[] {
  return ["spacegraph"]
}

export type MountedRenderer = {
  id: RendererID
  renderer: GraphRenderer
  /** Always false — no fallback path exists. */
  fallback: false
  /** The mount error when one occurred. */
  error?: unknown
}

/**
 * Mounts the SpaceGraph adapter. On mount failure, throws the error — no fallback.
 */
export async function mountRenderer(
  container: HTMLElement,
  options: { theme: RenderTheme; projection: Projection; preferred?: RendererID; reducedMotion?: boolean },
  overrides: Partial<Record<RendererID, RendererFactory>> = {},
): Promise<MountedRenderer> {
  const id = "spacegraph"
  try {
    const renderer = await (overrides[id] ?? FACTORIES[id])()
    await renderer.mount(container, { theme: options.theme, projection: options.projection, reducedMotion: options.reducedMotion } as { theme: RenderTheme; projection: Projection; reducedMotion?: boolean })
    return { id, renderer, fallback: false }
  } catch (error) {
    throw error
  }
}