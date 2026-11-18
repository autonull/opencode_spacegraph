import { ConfigFlag } from "@opencode/schema/config/flag"
import {
  DETAIL_MODES,
  DETAIL_TIERS,
  EQUALIZER_PRESETS,
  LAYOUTS,
  ZOOM_LEVELS,
} from "@opencode/session-ui/graph"
import type { ManifestEntry } from "@spacegraphjs/config"
import { LENS_GOALS } from "./lensGoals"
import { BUILTIN_LENS_IDS, DEPTH_MODES, DENSITY_PROFILES, HOST_WIDGET_STATES, RENDERER_STRATEGIES } from "./options"

/** Which axis each graph flag gates. Flags gate availability; they never choose a value. */
export const GRAPH_FLAG_AXES: Partial<Record<ConfigFlag.Key, string>> = {
  graph_cost_lens: "lensGoal",
  graph_palette: "equalizerPreset",
  graph_attention: "salienceSignal",
  graph_layout_breadth: "layout",
  graph_library_renderers: "rendererStrategy",
  graph_time_travel: "timeMode",
  graph_compaction_advisor: "windowKind",
}

/** Resolve graph flags into the set the config negotiator reads. `all_flags` gates availability only. */
export function graphFlagSet(options: {
  enabled: (key: string) => boolean
  allFlags?: boolean
}): ReadonlySet<string> {
  const keys = Object.keys(ConfigFlag.registry).filter((key) => key.startsWith("graph_"))
  return new Set(options.allFlags ? keys : keys.filter(options.enabled))
}

/** Every host-owned registry value, in the manifest's entry shape. */
export function hostManifestEntries(): ManifestEntry[] {
  return [
    {
      id: "lensGoal",
      values: [...new Set(LENS_GOALS.map((goal) => goal.lensId))],
      source: "gui-plugins/lensGoals",
      valueFlags: { auditor: "graph_cost_lens" },
    },
    { id: "lens", values: BUILTIN_LENS_IDS, source: "gui-plugins/BUILTIN_LENS_IDS" },
    { id: "detailMode", values: DETAIL_MODES, source: "session-ui/DETAIL_MODES" },
    { id: "detailTier", values: DETAIL_TIERS, source: "session-ui/DETAIL_TIERS" },
    {
      id: "layout",
      values: LAYOUTS,
      source: "session-ui/LAYOUTS",
      valueFlags: { grid: "graph_layout_breadth", circular: "graph_layout_breadth" },
    },
    { id: "zoomLevel", values: ZOOM_LEVELS, source: "session-ui/ZOOM_LEVELS" },
    { id: "density", values: DENSITY_PROFILES, source: "gui-plugins/DENSITY_PROFILES" },
    {
      id: "depth",
      values: DEPTH_MODES,
      source: "gui-plugins/DEPTH_MODES",
      reducedMotion: "static fog and layering; no parallax",
    },
    {
      id: "rendererStrategy",
      values: RENDERER_STRATEGIES,
      source: "gui-plugins/RENDERER_STRATEGIES",
      valueFlags: {
        cytoscape: "graph_library_renderers",
        "svg-preview": "graph_library_renderers",
      },
    },
    {
      id: "equalizerPreset",
      values: EQUALIZER_PRESETS.map((preset) => preset.id),
      source: "session-ui/EQUALIZER_PRESETS",
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
      source: "session-graph/GraphView+GraphWindowManager",
      valueFlags: { compactionAdvisor: "graph_compaction_advisor" },
    },
    {
      id: "timeMode",
      values: ["live", "checkpoint"],
      source: "session-ui/time-travel",
      valueFlags: { checkpoint: "graph_time_travel" },
    },
    {
      id: "salienceSignal",
      values: ["attention"],
      source: "session-ui/attention",
      flag: "graph_attention",
    },
    {
      id: "widgets",
      values: HOST_WIDGET_STATES,
      source: "gui-plugins/prefs.widgets",
      reducedMotion: "mount and fade follow the host transition; reduced motion zeroes it",
    },
  ]
}
