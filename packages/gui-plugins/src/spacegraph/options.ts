/** Host-owned option lists that extend the library registries. */
export const DEPTH_MODES = ["flat", "layered", "depth-stack", "orbit"] as const
export type DepthMode = (typeof DEPTH_MODES)[number]

export const DENSITY_PROFILES = ["comfortable", "compact", "cozy"] as const
export type DensityProfile = (typeof DENSITY_PROFILES)[number]

export const RENDERER_STRATEGIES = ["spacegraph", "cytoscape", "svg-preview"] as const
export type RendererStrategy = (typeof RENDERER_STRATEGIES)[number]

/** P3.6: host widget preferences as a discoverable app-surface axis. */
export const HOST_WIDGET_STATES = ["none", "all", "diff", "terminal"] as const
export type HostWidgetState = (typeof HOST_WIDGET_STATES)[number]

/** Built-in lens IDs (from §B.3). */
export const BUILTIN_LENS_IDS = [
  "reader",
  "navigator",
  "cartographer",
  "investigator",
  "orchestrator",
  "reviewer",
  "archivist",
  "composer",
  "auditor",
] as const
export type BuiltinLensId = (typeof BUILTIN_LENS_IDS)[number]
