import { Schema } from "effect"
import { Plugin, Store } from "@opencode/plugin/gui"
import {
  GRAPH_ARRANGEMENTS,
  GRAPH_SIDES,
  LAYOUTS,
  ZOOM_LEVELS,
  DETAIL_MODES,
  type Layout,
  type ZoomLevel,
  type DetailMode,
} from "@opencode/session-ui/graph"
import en from "./i18n/en"

// Local constants that extend session-ui/graph
export const DEPTH_MODES = ["flat", "layered", "depth-stack", "orbit"] as const
export type DepthMode = (typeof DEPTH_MODES)[number]

export const DENSITY_PROFILES = ["comfortable", "compact", "cozy"] as const
export type DensityProfile = (typeof DENSITY_PROFILES)[number]

export const RENDERER_STRATEGIES = ["spacegraph", "cytoscape", "svg-preview"] as const
export type RendererStrategy = (typeof RENDERER_STRATEGIES)[number]

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

/** Full SpacegraphPreferences schema for Phase 18 (used for lens definitions and settings). */
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
  {
    id: "reader",
    name: "Reader",
    description: "Transcript-first with hover/focus affordances only",
    surface: "transcript",
    layout: "lanes",
    depth: "flat",
    level: "overview",
    detailMode: "off",
    files: false,
    trace: null,
    widgets: false,
    budget: "overview",
  },
  {
    id: "navigator",
    name: "Navigator",
    description: "Hybrid view with linked selection and turn map",
    surface: "hybrid",
    layout: "lanes",
    depth: "flat",
    level: "execution",
    detailMode: "popover",
    files: false,
    trace: "why",
    widgets: false,
    budget: "execution",
  },
  {
    id: "cartographer",
    name: "Cartographer",
    description: "Whole-session shape, layouts, legend",
    surface: "map",
    layout: "lanes",
    depth: "flat",
    level: "overview",
    detailMode: "panel",
    files: false,
    trace: null,
    widgets: false,
    budget: "overview",
  },
  {
    id: "investigator",
    name: "Investigator",
    description: "Why traces, failure chains, breadcrumbs",
    surface: "map",
    layout: "lanes",
    depth: "flat",
    level: "execution",
    detailMode: "panel",
    files: false,
    trace: "why",
    widgets: false,
    budget: "execution",
  },
  {
    id: "orchestrator",
    name: "Orchestrator",
    description: "Delegations, subagent recursion, lineage",
    surface: "map",
    layout: "hierarchy",
    depth: "layered",
    level: "overview",
    detailMode: "panel",
    files: false,
    trace: "led-here",
    widgets: false,
    budget: "overview",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Compare, trust lens, files rail, verification",
    surface: "hybrid",
    layout: "lanes",
    depth: "flat",
    level: "execution",
    detailMode: "panel",
    files: true,
    trace: "related",
    widgets: false,
    budget: "execution",
  },
  {
    id: "archivist",
    name: "Archivist",
    description: "Time travel, spatial memory, notes, permalinks",
    surface: "map",
    layout: "lanes",
    depth: "flat",
    level: "overview",
    detailMode: "panel",
    files: false,
    trace: null,
    widgets: false,
    budget: "overview",
  },
  {
    id: "composer",
    name: "Composer",
    description: "Node widgets, prompt injection, attach context",
    surface: "hybrid",
    layout: "lanes",
    depth: "flat",
    level: "execution",
    detailMode: "popover",
    files: false,
    trace: null,
    widgets: true,
    budget: "execution",
  },
  {
    id: "auditor",
    name: "Auditor",
    description: "Cost, budget, provenance, export",
    surface: "map",
    layout: "matrix",
    depth: "flat",
    level: "overview",
    detailMode: "panel",
    files: true,
    trace: null,
    widgets: false,
    budget: "detail",
  },
]

const TraceHistoryEntry = Schema.Struct({
  kind: Schema.Literals(["why", "led-here", "related"]),
  source: Schema.String,
  label: Schema.String,
})

const State = Schema.Struct({
  focused: Schema.optional(Schema.String),
  level: Schema.optional(Schema.Literals(ZOOM_LEVELS)),
  layout: Schema.optional(Schema.Literals(LAYOUTS)),
  depth: Schema.optional(Schema.Literals(DEPTH_MODES)),
  arrangement: Schema.optional(Schema.Literals(GRAPH_ARRANGEMENTS)),
  side: Schema.optional(Schema.Literals(GRAPH_SIDES)),
  detailMode: Schema.optional(Schema.Literals(DETAIL_MODES)),
  turnMap: Schema.optional(Schema.Boolean),
  surface: Schema.optional(Schema.String),
  /** Shared trace state across surfaces. */
  traceKind: Schema.optional(Schema.Literals(["why", "led-here", "related"])),
  traceSource: Schema.optional(Schema.String),
  traceHistory: Schema.optional(Schema.Array(TraceHistoryEntry)),
  traceHistoryIndex: Schema.optional(Schema.Number),
  /** Shared group collapse state across surfaces. */
  explicitlyCollapsedGroups: Schema.optional(Schema.Array(Schema.String)),
  /** Shared notes across surfaces. */
  notes: Schema.optional(Schema.Unknown),
})

export type State = Schema.Schema.Type<typeof State>

// Simple prefs schema for the global store (mutable)
const Prefs = Schema.Struct({
  level: Schema.optional(Schema.Literals(ZOOM_LEVELS)),
  layout: Schema.optional(Schema.Literals(LAYOUTS)),
  depth: Schema.optional(Schema.Literals(DEPTH_MODES)),
  arrangement: Schema.optional(Schema.Literals(GRAPH_ARRANGEMENTS)),
  side: Schema.optional(Schema.Literals(GRAPH_SIDES)),
  detailMode: Schema.optional(Schema.Literals(DETAIL_MODES)),
  // Phase 18 additions
  lens: Schema.optional(Schema.String),
  surfaces: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  density: Schema.optional(Schema.Unknown),
  renderer: Schema.optional(Schema.Unknown),
  budgets: Schema.optional(Schema.Unknown),
  widgets: Schema.optional(WidgetPreferences),
  i18n: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  userLenses: Schema.optional(Schema.Array(LensDefinition)),
})

export default Plugin.define({
  stores: {
    prefs: Store.global(Prefs, {}),
    session: Store.session(State, {}),
  },
  i18n: { en },
})