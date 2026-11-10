import { type GraphRenderer, type Projection, type RenderTheme, type RendererCapabilities } from "@spacegraphjs/renderer"

export type RendererID = "spacegraph"

export type RendererFactory = () => Promise<GraphRenderer>

/** Expected contract version. Increment when rendering behavior changes. */
export const EXPECTED_CONTRACT_VERSION = 3

/** SpaceGraphJS only — no fallback. */
const FACTORIES: Record<RendererID, RendererFactory> = {
  spacegraph: async () => new (await import("@spacegraphjs/spacegraph-renderer")).SpaceGraphRenderer(),
}

/** Constructs the SpaceGraph adapter without mounting. */
export function createRenderer(id: RendererID): Promise<GraphRenderer> {
  return FACTORIES[id]()
}

/** Mount options for the SpaceGraph renderer. */
export type MountRendererOptions = {
  theme: RenderTheme
  projection: Projection
  preferred?: RendererID
  reducedMotion?: boolean
  /** Register the instance on `window.SpaceGraph` and `SpaceGraph.instances` for developer tooling. Off by default. */
  global?: boolean
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
 * Checks if the renderer's capabilities meet the expected contract version.
 * Currently checks for `fitInsets` capability (added in v3).
 */
function checkContractVersion(capabilities: RendererCapabilities): void {
  if (!capabilities.fitInsets) {
    throw new Error(
      `Renderer contract version mismatch: expected >= ${EXPECTED_CONTRACT_VERSION} (fitInsets capability), ` +
        `but renderer does not declare fitInsets. This host requires contract version ${EXPECTED_CONTRACT_VERSION}.`,
    )
  }
}

/**
 * Mounts the SpaceGraph adapter. On mount failure, throws the error — no fallback.
 */
export async function mountRenderer(
  container: HTMLElement,
  options: MountRendererOptions,
  overrides: Partial<Record<RendererID, RendererFactory>> = {},
): Promise<MountedRenderer> {
  const id = "spacegraph"
  const renderer = await (overrides[id] ?? FACTORIES[id])()
  // Verify contract version compatibility
  checkContractVersion(renderer.capabilities)
  await renderer.mount(container, {
    theme: options.theme,
    projection: options.projection,
    reducedMotion: options.reducedMotion,
    global: options.global,
  } as { theme: RenderTheme; projection: Projection; reducedMotion?: boolean; global?: boolean })
  return { id, renderer, fallback: false }
}