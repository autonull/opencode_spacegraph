import type { ManifestEntry } from "@spacegraphjs/config"
import { DETAIL_MODES, DETAIL_TIERS, EQUALIZER_PRESETS, LAYOUTS, ZOOM_LEVELS } from "../model"
import { LENS_GOALS } from "./lensGoals"
import { BUILTIN_LENS_IDS, DEPTH_MODES, DENSITY_PROFILES, HOST_WIDGET_STATES, RENDERER_STRATEGIES } from "./options"

/**
 * Plugin options that gate capability axes. They replace the fork's core
 * `ConfigFlag` keys: the plugin owns its preferences and declares them here.
 */
export const GRAPH_OPTION_KEYS = [
  "graph_cost_lens",
  "graph_palette",
  "graph_attention",
  "graph_layout_breadth",
  "graph_library_renderers",
  "graph_time_travel",
  "graph_compaction_advisor",
] as const

export type GraphOptionKey = (typeof GRAPH_OPTION_KEYS)[number]

/** Which axis each option gates. Options gate availability; they never choose a value. */
export const GRAPH_OPTION_AXES: Readonly<Record<GraphOptionKey, string>> = {
  graph_cost_lens: "lensGoal",
  graph_palette: "equalizerPreset",
  graph_attention: "salienceSignal",
  graph_layout_breadth: "layout",
  graph_library_renderers: "rendererStrategy",
  graph_time_travel: "timeMode",
  graph_compaction_advisor: "windowKind",
}

/** Resolve plugin options into the set the config negotiator reads. `allOptions` gates availability only. */
export function graphOptionSet(options: {
  enabled: (key: string) => boolean
  allOptions?: boolean
}): ReadonlySet<string> {
  return new Set(
    options.allOptions ? GRAPH_OPTION_KEYS : GRAPH_OPTION_KEYS.filter(options.enabled),
  )
}

/** Every plugin-owned registry value, in the manifest's entry shape. */
export function hostManifestEntries(): ManifestEntry[] {
  return [
    {
      id: "lensGoal",
      values: [...new Set(LENS_GOALS.map((goal) => goal.lensId))],
      source: "plugin/lensGoals",
      valueFlags: { auditor: "graph_cost_lens" },
    },
    { id: "lens", values: BUILTIN_LENS_IDS, source: "plugin/BUILTIN_LENS_IDS" },
    { id: "detailMode", values: DETAIL_MODES, source: "plugin/model/DETAIL_MODES" },
    { id: "detailTier", values: DETAIL_TIERS, source: "plugin/model/DETAIL_TIERS" },
    {
      id: "layout",
      values: LAYOUTS,
      source: "plugin/model/LAYOUTS",
      valueFlags: { grid: "graph_layout_breadth", circular: "graph_layout_breadth" },
    },
    { id: "zoomLevel", values: ZOOM_LEVELS, source: "plugin/model/ZOOM_LEVELS" },
    { id: "density", values: DENSITY_PROFILES, source: "plugin/DENSITY_PROFILES" },
    {
      id: "depth",
      values: DEPTH_MODES,
      source: "plugin/DEPTH_MODES",
      reducedMotion: "static fog and layering; no parallax",
    },
    {
      id: "rendererStrategy",
      values: RENDERER_STRATEGIES,
      source: "plugin/RENDERER_STRATEGIES",
      valueFlags: {
        cytoscape: "graph_library_renderers",
        "svg-preview": "graph_library_renderers",
      },
    },
    {
      id: "equalizerPreset",
      values: EQUALIZER_PRESETS.map((preset) => preset.id),
      source: "plugin/model/EQUALIZER_PRESETS",
      flag: "graph_palette",
    },
    {
      id: "windowKind",
      values: [
        "node",
        "filesystem",
        "legend",
        "compare",
        "compactionAdvisor",
        "equalizer",
        "minimap",
        "failureProgress",
        "find",
      ],
      source: "plugin/GraphView+GraphWindowManager",
      valueFlags: { compactionAdvisor: "graph_compaction_advisor" },
    },
    {
      id: "timeMode",
      values: ["live", "checkpoint"],
      source: "plugin/model/time-travel",
      valueFlags: { checkpoint: "graph_time_travel" },
    },
    {
      id: "salienceSignal",
      values: ["attention"],
      source: "plugin/model/attention",
      flag: "graph_attention",
    },
    {
      id: "widgets",
      values: HOST_WIDGET_STATES,
      source: "plugin/HOST_WIDGET_STATES",
      reducedMotion: "mount and fade follow the host transition; reduced motion zeroes it",
    },
  ]
}
