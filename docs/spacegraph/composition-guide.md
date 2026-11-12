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

| Surface ID | Title | Icon | Default Lens | Flags | Persisted State |
|------------|-------|------|--------------|-------|-----------------|
| `spacegraph.map` | Map | `MapIcon` | `cartographer` | — | level, layout, depth, density, selection, windows, collapsedGroups |
| `spacegraph.hybrid` | Hybrid | `SplitIcon` | `navigator` | `graph_surface_transcript` | level, layout, depth, density, arrangement, side, activeTurn, followLog |
| `spacegraph.transcript` | Transcript | `ListIcon` | `reader` | `graph_surface_transcript` | virtualized scroll, inline expand state |
| `spacegraph.turn-map` | Turn Map | `GitBranchIcon` | `navigator` | — | level, layout, depth, density (read-only memory) |
| `spacegraph.inline` | Inline | `Maximize2Icon` | `reader` | `graph_inline_preview` | expand/collapse per turn (read-only memory) |

---

## Lens Table

| Lens ID | Title | Description | Projection | Flags |
|---------|-------|-------------|------------|-------|
| `reader` | Reader | Linear transcript order, minimal edges | `reader` | — |
| `cartographer` | Cartographer | Full session topology, all edges | `cartographer` | — |
| `navigator` | Navigator | Turn-focused with subagent context | `navigator` | — |
| `debugger` | Debugger | Failure chain + trace overlays | `debugger` | — |
| `trust` | Trust | Highlights unverified writes | `trust` | `graph_trust_lens` |
| `cost` | Cost | Token/time/tool badges on turns | `cost` | `graph_cost_lens` |
| `files` | Files | Changed-files rail + provenance | `files` | — |
| `compare` | Compare | Two-turn diff overlay | `compare` | `graph_compare_lens` |
| `review` | Review | Review Changes mode | `review` | `graph_review_lens` |

**Lens ↔ Projection mapping** (in `session-ui/graph/profiles.ts`):
- Each lens selects a projection profile that determines which nodes/edges are visible.
- Projections are pure functions: `project(model, profile) → GraphViewData`.
- The active lens is persisted per session in the plugin store.

---

## Progressive Disclosure Rules

1. **Static first, interactive on demand**
   - Inline graphs (transcript, turn map) render static SVG previews (`TurnMapInlineGraph`, `GraphPreview`).
   - Interactive `SessionGraph` mounts only when the user expands (clicks affordance or presses `Enter`).
   - `graph_inline_preview` flag gates the expand affordance.

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
   - Flags default `off` in releases; `on` in local/dev via `OPENCODE_FLAGS`.

---

## Prop Categories

### Required
- `model: GraphViewData` — the projected session graph

### View Control (controlled, persisted by host)
- `level: ZoomLevel` — `overview` | `detail` | `execution`
- `layout: Layout` — `force` | `grid` | `circular` | `hierarchical` | `radial` | `spectral` | `cluster` | `geo`
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
- `renderNodeWidget: (node) => JSX.Element` — `graph_node_widgets`
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