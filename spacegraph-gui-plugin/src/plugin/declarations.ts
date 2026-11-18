import { Plugin, Store } from "@opencode/plugin/gui"
import { Schema } from "effect"
import {
  DETAIL_MODES,
  GRAPH_ARRANGEMENTS,
  GRAPH_SIDES,
  LAYOUTS,
  ZOOM_LEVELS,
} from "../model"
import en from "./i18n/en"
import { DEPTH_MODES, type BuiltinLensId, type DepthMode } from "./options"
import type { DetailMode, Layout, ZoomLevel } from "../model"

export * from "./options"
export * from "./host-manifest"
export { LENS_GOALS, getGoalByLensId, getGoalByLabel, getVisibleGoals, getAllGoals, type LensGoal } from "./lensGoals"

/** Lens definition - a stored preset of surface configuration. */
const LensDefinition = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  surface: Schema.String,
  layout: Schema.optional(Schema.Literals(LAYOUTS)),
  depth: Schema.optional(Schema.Literals(DEPTH_MODES)),
  level: Schema.optional(Schema.Literals(ZOOM_LEVELS)),
  detailMode: Schema.optional(Schema.Literals(DETAIL_MODES)),
  files: Schema.optional(Schema.Boolean),
  trace: Schema.optional(Schema.Literals(["why", "led-here", "related"])),
  widgets: Schema.optional(Schema.Boolean),
  budget: Schema.optional(Schema.Literals(["overview", "execution", "detail"])),
})

/** Widget preferences. */
const WidgetPreferences = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean),
  composer: Schema.optional(Schema.Boolean),
  todo: Schema.optional(Schema.Boolean),
  modelPicker: Schema.optional(Schema.Boolean),
  diff: Schema.optional(Schema.Boolean),
  terminal: Schema.optional(Schema.Boolean),
  permissionPrompt: Schema.optional(Schema.Boolean),
})

/**
 * Capability gates, owned by the plugin rather than core config flags. Every capability defaults to
 * on; a reader can turn one off without the fork carrying a `graph_*` flag bridge.
 */
const Capabilities = Schema.Struct({
  timeTravel: Schema.optional(Schema.Boolean),
  costLens: Schema.optional(Schema.Boolean),
  compactionAdvisor: Schema.optional(Schema.Boolean),
  palette: Schema.optional(Schema.Boolean),
  attention: Schema.optional(Schema.Boolean),
  layoutBreadth: Schema.optional(Schema.Boolean),
})

/** Full SpacegraphPreferences schema (used for lens definitions and settings). */
export const SpacegraphPreferences = Schema.Struct({
  /** Active lens ID (builtin or user-defined). */
  lens: Schema.optional(Schema.String),
  /** Per-surface preferences keyed by surface ID. */
  surfaces: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  /** Density/spacing profile. */
  density: Schema.optional(Schema.Unknown),
  /** Renderer configuration. */
  renderer: Schema.optional(Schema.Unknown),
  /** Budget configuration. */
  budgets: Schema.optional(Schema.Unknown),
  /** Widget configuration. */
  widgets: Schema.optional(WidgetPreferences),
  /** Internationalization overrides (additive, English defaults). */
  i18n: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  /** User-defined lenses. */
  userLenses: Schema.optional(Schema.Array(LensDefinition)),
  /** Plugin-owned capability gates (replaces the fork's core config flags). */
  capabilities: Schema.optional(Capabilities),
})

export type SpacegraphPreferences = Schema.Schema.Type<typeof SpacegraphPreferences>

/** Default preferences (empty = use built-in defaults). */
export const DEFAULT_PREFERENCES: SpacegraphPreferences = {
  lens: "navigator",
  surfaces: {},
  density: { profile: "comfortable" },
  renderer: { strategy: "spacegraph", reducedMotion: false, chrome: true },
  budgets: {},
  widgets: { enabled: false },
  i18n: {},
  userLenses: [],
}

/** The nine built-in lenses from §B.3 as data (no logic). */
export const BUILTIN_LENSES: readonly {
  id: BuiltinLensId
  name: string
  description: string
  surface: string
  layout: Layout
  depth: DepthMode
  level: ZoomLevel
  detailMode: DetailMode
  files: boolean
  trace: "why" | "led-here" | "related" | null
  widgets: boolean
  budget: "overview" | "execution" | "detail"
}[] = [
  { id: "reader", name: "Reader", description: "Transcript-first with hover/focus affordances only", surface: "transcript", layout: "lanes", depth: "flat", level: "overview", detailMode: "off", files: false, trace: null, widgets: false, budget: "overview" },
  { id: "navigator", name: "Navigator", description: "Hybrid view with linked selection and turn view", surface: "hybrid", layout: "lanes", depth: "flat", level: "execution", detailMode: "popover", files: false, trace: "why", widgets: false, budget: "execution" },
  { id: "cartographer", name: "Cartographer", description: "Whole-session shape, layouts, legend", surface: "map", layout: "lanes", depth: "flat", level: "overview", detailMode: "panel", files: false, trace: null, widgets: false, budget: "overview" },
  { id: "investigator", name: "Investigator", description: "Why traces, failure chains, breadcrumbs", surface: "map", layout: "lanes", depth: "flat", level: "execution", detailMode: "panel", files: false, trace: "why", widgets: false, budget: "execution" },
  { id: "orchestrator", name: "Orchestrator", description: "Delegations, subagent recursion, lineage", surface: "map", layout: "hierarchy", depth: "layered", level: "overview", detailMode: "panel", files: false, trace: "led-here", widgets: false, budget: "overview" },
  { id: "reviewer", name: "Reviewer", description: "Compare, trust lens, files rail, verification", surface: "hybrid", layout: "lanes", depth: "flat", level: "execution", detailMode: "panel", files: true, trace: "related", widgets: false, budget: "execution" },
  { id: "archivist", name: "Archivist", description: "Time travel, spatial memory, notes, permalinks", surface: "map", layout: "lanes", depth: "flat", level: "overview", detailMode: "panel", files: false, trace: null, widgets: false, budget: "overview" },
  { id: "composer", name: "Composer", description: "Node widgets, prompt injection, attach context", surface: "hybrid", layout: "lanes", depth: "flat", level: "execution", detailMode: "popover", files: false, trace: null, widgets: true, budget: "execution" },
  { id: "auditor", name: "Auditor", description: "Cost, budget, provenance, export", surface: "map", layout: "matrix", depth: "flat", level: "overview", detailMode: "panel", files: true, trace: null, widgets: false, budget: "detail" },
]

const TraceHistoryEntry = Schema.Struct({
  kind: Schema.Literals(["why", "led-here", "related", "downstream"]),
  source: Schema.String,
  label: Schema.String,
})

/** Per-session graph state shared by all surfaces. */
export const State = Schema.Struct({
  focused: Schema.optional(Schema.String),
  level: Schema.optional(Schema.Literals(ZOOM_LEVELS)),
  layout: Schema.optional(Schema.Literals(LAYOUTS)),
  depth: Schema.optional(Schema.Literals(DEPTH_MODES)),
  arrangement: Schema.optional(Schema.Literals(GRAPH_ARRANGEMENTS)),
  side: Schema.optional(Schema.Literals(GRAPH_SIDES)),
  detailMode: Schema.optional(Schema.Literals(DETAIL_MODES)),
  turnMap: Schema.optional(Schema.Boolean),
  surface: Schema.optional(Schema.String),
  /** Parked time-travel checkpoint (zero-based turn index); absent means live. */
  checkpoint: Schema.optional(Schema.Number),
  /** Shared trace state across surfaces. */
  traceKind: Schema.optional(Schema.Literals(["why", "led-here", "related", "downstream"])),
  traceSource: Schema.optional(Schema.String),
  traceHistory: Schema.optional(Schema.Array(TraceHistoryEntry)),
  traceHistoryIndex: Schema.optional(Schema.Number),
  /** Shared group collapse state across surfaces. */
  explicitlyCollapsedGroups: Schema.optional(Schema.Array(Schema.String)),
  /** Shared notes across surfaces. */
  notes: Schema.optional(Schema.Unknown),
  /** Nodes the reader pinned; every surface marks the same set. */
  pins: Schema.optional(Schema.Array(Schema.String)),
  /** M5.1: saved facet questions, newest first. */
  savedQueries: Schema.optional(
    Schema.Array(Schema.Struct({ label: Schema.String, query: Schema.String })),
  ),
  /** P1.3: Neighborhood focus mode - dims nodes outside the selection's BFS neighborhood. */
  neighborhoodMode: Schema.optional(Schema.Boolean),
  /** P3.1: Follow mode for live streaming updates - off, turn, node, node+focus. */
  followMode: Schema.optional(Schema.Literals(["off", "turn", "node", "node+focus"])),
})

export type State = Schema.Schema.Type<typeof State>

/** Global Spacegraph preferences. */
export const Prefs = Schema.Struct({
  level: Schema.optional(Schema.Literals(ZOOM_LEVELS)),
  layout: Schema.optional(Schema.Literals(LAYOUTS)),
  depth: Schema.optional(Schema.Literals(DEPTH_MODES)),
  arrangement: Schema.optional(Schema.Literals(GRAPH_ARRANGEMENTS)),
  side: Schema.optional(Schema.Literals(GRAPH_SIDES)),
  detailMode: Schema.optional(Schema.Literals(DETAIL_MODES)),
  lens: Schema.optional(Schema.String),
  surfaces: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  density: Schema.optional(Schema.Unknown),
  renderer: Schema.optional(Schema.Unknown),
  budgets: Schema.optional(Schema.Unknown),
  widgets: Schema.optional(WidgetPreferences),
  i18n: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  userLenses: Schema.optional(Schema.Array(LensDefinition)),
  capabilities: Schema.optional(Capabilities),
})

export type Prefs = Schema.Schema.Type<typeof Prefs>

/** Declarations only; `src/gui.tsx` attaches the window setup to this definition. */
export default Plugin.define({
  stores: {
    prefs: Store.global(Prefs, {}),
    session: Store.session(State, {}),
  },
  i18n: { en },
})
