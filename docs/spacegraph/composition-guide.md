# SpaceGraph Composition Guide

This guide documents how surfaces compose the single `SessionGraph` code path, the lens and surface tables, and progressive-disclosure rules.

---

## Single Code Path Rule

**One `SessionGraph` renders every surface.** Surfaces compose it and never fork rendering.

| Surface | Entry Point | Key Props |
|---------|-------------|-----------|
| Map (full) | `GraphView` → `SessionGraph` | `chrome={true}`, `shell="full"`, `surfaceLabel="Session map"` |
| Hybrid | `GraphView` → `SessionGraph` | `arrangement="hybrid"`, `surfaceLabel="Hybrid view"` |
| Panel | `GraphView` → `SessionGraph` | `detailMode="panel"`, `surfaceLabel="Session map"` |
| Dialog (map) | `GraphView` → `SessionGraph` | `chrome={false}`, `shell="bare"`, `surfaceLabel="Map this turn"` |
| Turn map (inline) | `GraphTranscriptSurface` → `GraphInline` → `SessionGraph` | `chrome={false}`, `shell="bare"`, `spatialMemoryOwner={false}`, `surfaceLabel="Turn map"` |
| Transcript inline | `GraphTranscriptSurface` → `GraphInline` → `SessionGraph` | `chrome={false}`, `shell="bare"`, `spatialMemoryOwner={false}`, `surfaceLabel="Inline graph"` |

All surfaces share:
- `model`: the same `GraphViewData` (built by `session-ui/graph`)
- `renderer`: SpaceGraph renderer via `renderer-registry`
- `level`, `layout`, `depth`, `projection`, `density`: synced via controlled props
- `selection`, `onSelect`: synced via `useGraphSelection` bus
- `windows`, `onWindowsChange`: synced via `useGraphWindows` bus
- `explicitlyCollapsedGroups`, `onExplicitlyCollapsedGroupsChange`: synced via `useGroupCollapse`

---

## Surface Table

| Surface | ID | Entry point | Flags | Persisted State |
|---------|----|-------------|-------|-----------------|
| Map | `${ctx.id}.map` | `MapSurface` → `SessionGraph` | `graph_palette`, `graph_attention`, `graph_layout_breadth` | level, layout, depth, density, selection, windows, collapsedGroups |
| Hybrid | `${ctx.id}.hybrid` | `HybridSurface` → map + transcript | `graph_palette`, `graph_attention`, `graph_layout_breadth` | level, layout, depth, density, arrangement, side, activeTurn, followLog |
| Transcript graph | `${ctx.id}.transcript-graph` | `GraphTranscriptSurface` | `graph_palette` | virtualized rows, inline expand state, notes, pins |
| Side panel | panel key `${ctx.id}:map` | `SpacegraphPanel` → `SessionGraph` | `graph_palette`, `graph_attention` | level, layout, depth, density, selection |
| Turn map | layer on a surface | `TurnMapLayer` → `GraphInline` | — | level, layout, depth, density (read-only memory) |
| Inline preview | inside a transcript row | `GraphInline` → `SessionGraph` | — | expand/collapse per turn (read-only memory) |

The flags above add optional chrome. The surface itself is always registered; the graduated
`graph_surface_transcript`, `graph_node_widgets`, `graph_inline_preview`, and `graph_multi_surface`
keys are gone from the registry.

---

## Lens Table

The nine built-in lenses are data in `packages/gui-plugins/src/spacegraph/index.ts`. Applying one
sets the surface, layout, depth, level, detail mode, files rail, trace kind, and widget preference,
and persists the lens id. No lens id is flag-gated; flags gate individual capabilities inside the
lens.

| Lens ID | Title | Surface | Layout | Depth | Level | Detail | Files | Trace | Widgets |
|---------|-------|---------|--------|-------|-------|--------|-------|-------|---------|
| `reader` | Reader | transcript | lanes | flat | overview | off | — | — | — |
| `navigator` | Navigator | hybrid | lanes | flat | execution | popover | — | why | — |
| `cartographer` | Cartographer | map | lanes | flat | overview | panel | — | — | — |
| `investigator` | Investigator | map | lanes | flat | execution | panel | — | why | — |
| `orchestrator` | Orchestrator | map | hierarchy | layered | overview | panel | — | led-here | — |
| `reviewer` | Reviewer | hybrid | lanes | flat | execution | panel | yes | related | — |
| `archivist` | Archivist | map | lanes | flat | overview | panel | — | — | — |
| `composer` | Composer | hybrid | lanes | flat | execution | popover | — | — | yes |
| `auditor` | Auditor | map | matrix | flat | overview | panel | yes | — | — |

Applying a lens through the palette also selects the lens surface: `transcript` stays the host
surface, `map` selects `${ctx.id}.map`, and `hybrid` selects `${ctx.id}.hybrid`. Stored lens fields
are in the plugin `prefs` store; per-session overrides stay in the session store.

**Surface filtering** uses `PROFILE_PRESETS` in `session-ui/graph/profiles.ts`. Profiles are domain
and status scopes; they are not lenses and do not change layout or surface.

---

## Progressive Disclosure Rules

1. **Static first, interactive on demand**
   - Inline graphs (transcript, turn map) render static SVG previews (`TurnMapInlineGraph`, `GraphPreview`).
   - Interactive `SessionGraph` mounts only when the user expands (clicks affordance or presses `Enter`).
   - The expand affordance is always on; its old `graph_inline_preview` flag is graduated.

2. **Chrome is host-composed**
   - `SessionGraph.chrome={false}` for inline/embedded surfaces.
   - Host provides toolbar, inspector, status bar, windows, file rail via `GraphChrome`, `GraphInspector`, `GraphWindowManager`, `GraphFileRail`.
   - `SessionGraph` exposes `onRenderer`, `onRendererMounted` for host camera control.

3. **Memory ownership**
   - Primary surface (`spatialMemoryOwner={true}`) writes spatial memory (selection, camera, collapsed groups).
   - Secondary surfaces (`spatialMemoryOwner={false}`) read the session frame but never overwrite it.
   - Key: `session + layout + level + contentHash`.

4. **Drill depth limit**
   - `maxDrillDepth` (default 3): widget=1, popover=2, full map=3.
   - `useGraphNavigation` refuses a fourth drill-down.
   - Subagent widget caps previews at 1 (widget) / 2 (popover).

5. **Flag gating**
   - Every capability starts behind a flag (see `packages/schema/src/config/flag.ts`).
   - UI checks `ctx.flags.enabled("flag_name")` before rendering affordances.
   - The host resolves every key in `ConfigFlag.registry`, so a new flag needs no second list.
   - Flags default `off` in releases; `on` in local/dev via `OPENCODE_FLAGS`.
   - Graduated and removed: `graph_surface_transcript`, `graph_node_widgets`,
     `graph_inline_preview`, `graph_multi_surface`. Deleted orphan: `graph_trust_lens`.

---

## Prop Categories

### Required
- `model: GraphViewData` — the projected session graph

### View Control (controlled, persisted by host)
- `level: ZoomLevel` — `overview` | `detail` | `execution`
- `layout: Layout` — `lanes` | `timeline` | `hierarchy` | `tree` | `force` | `grid` | `circular` | `ribbon` | `matrix` | `log`
- `depth: DepthMode` — `flat` | `layered` | `depth-stack` | `orbit`
- `projection: Projection` — 2D | 3D | AR
- `density: CardDensity` — `comfortable` | `compact` | `cozy`
- `selection: string` — selected node ID
- `checkpoint: number` — pinned turn index
- `turnCount: number` — total turns

### Surface Identity
- `surfaceLabel: string` — announced by a11y (default: "Session map")
- `chrome: boolean` — show host chrome (default: true)
- `shell: "full" | "bare"` — layout mode (default: "full")

### Feature Flags (host passes, derived from config)
- `enableCostLens: boolean` — `graph_cost_lens`
- `palette: PaletteSources` — `graph_palette`
- `savedQueries: SavedQuery[]` — `graph_palette`

### Callbacks (host owns persistence)
- `onSelect, onLayoutChange, onDepthChange, onProjectionChange, onLevelChange`
- `onWindowsChange, onExplicitlyCollapsedGroupsChange, onNotesChange, onPinsChange`
- `onArrangementChange, onArrangementSideChange, onDetailModeChange, onPeekChange`
- `onOpenSession, onOpenTranscript, onTurnMap, onOpenWindow, onActionNavigate, ...`
- `onRulesChange, onCompactionAdvisorChange, onTrustLensChange, onFilesChange`

### Advanced
- `renderNodeWidget: (node) => JSX.Element` — node widgets (graduated)
- `renderNodeHTML: (node) => string` — sanitized HTML in card
- `diffSource: GraphDiffSource` — host loader for turn diffs
- `renderSummary: (node) => JSX.Element` — custom node summary
- `traceKind, onTraceKindChange, ...` — controlled trace state
- `roots: GraphNode[]` — scope model to subset (search, subagent)
- `breakpoints: { narrow, compact, detail }` — responsive thresholds

---

## Two Instances Without Interference

- Each `SessionGraph` gets a unique `instanceId` via `createUniqueId()`.
- `GraphBus` + `GraphRouter` isolate events per instance.
- `GraphA11y` assigns instance-scoped item IDs (`sg-${instanceId}-${nodeId}`).
- `NodeWidgetLayer` uses `z-index: 10` and `data-sg-interactive` to prevent canvas drag.
- DOM IDs use `instanceId` prefix (library proposal: per-instance DOM id prefix).

---

## Verification

Run the component test suite:
```bash
cd packages/session-graph && bun run test:components -- --grep @graph
```

Key assertions:
- `graph-two-instances.spec.ts` — two `SessionGraph` instances share no state
- `graph-inline.spec.ts` — static preview has no a11y mirror; interactive does
- `graph-refine.spec.ts` — narrow sheet uses explicit 50% height
- `graph-a11y-surface.spec.ts` — per-instance announcements name the surface