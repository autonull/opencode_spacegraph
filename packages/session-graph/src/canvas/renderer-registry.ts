import { type GraphRenderer, type Projection, type RenderTheme } from "@spacegraphjs/renderer"

export type RendererID = "spacegraph" | "cytoscape"

export type RendererFactory = () => Promise<GraphRenderer>

function requireCompatible(renderer: GraphRenderer): GraphRenderer {
  return renderer
}

/**
 * Adapters load behind dynamic `import()` so neither backend is pulled at module scope; a host that
 * only ever uses SpaceGraphJS never pays for Cytoscape, and vice versa.
 */
const FACTORIES: Record<RendererID, RendererFactory> = {
  spacegraph: async () => new (await import("@spacegraphjs/spacegraph-renderer")).SpaceGraphRenderer(),
  cytoscape: async () => new (await import("@spacegraphjs/cytoscape-renderer")).CytoscapeRenderer(),
}

/** Constructs an adapter without mounting, so a host can inspect capabilities before it commits. */
export function createRenderer(id: RendererID): Promise<GraphRenderer> {
  return FACTORIES[id]().then(requireCompatible)
}

/** SpaceGraphJS first with Cytoscape as the 2D fallback; a Cytoscape request never falls back up. */
export function rendererOrder(preferred: RendererID = "spacegraph"): RendererID[] {
  return preferred === "cytoscape" ? ["cytoscape"] : ["spacegraph", "cytoscape"]
}

export type MountedRenderer = {
  id: RendererID
  renderer: GraphRenderer
  /** True when the preferred renderer failed and a later one mounted instead. */
  fallback: boolean
  /** The mount error that forced the fallback, when one occurred. */
  error?: unknown
}

/**
 * Mounts the preferred adapter, falling back down the order on a mount failure. A failed attempt is
 * discarded; the caller keeps the previous renderer or returns to the transcript, never a broken canvas.
 */
export async function mountRenderer(
  container: HTMLElement,
  options: { theme: RenderTheme; projection: Projection; preferred?: RendererID },
  overrides: Partial<Record<RendererID, RendererFactory>> = {},
): Promise<MountedRenderer> {
  let lastError: unknown

  for (const [index, id] of rendererOrder(options.preferred).entries()) {
    try {
      const renderer = requireCompatible(await (overrides[id] ?? FACTORIES[id])())
      await renderer.mount(container, { theme: options.theme, projection: options.projection })

      return { id, renderer, fallback: index > 0, ...(lastError ? { error: lastError } : {}) }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}
