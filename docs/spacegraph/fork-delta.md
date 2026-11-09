# Fork Delta — SpaceGraph Plugin

This document inventories every import of a fork-only package and every plugin-API gap that requires the fork. This is the single justification for the fork's existence.

## 1. Fork-only package imports in `packages/gui-plugins/src/spacegraph/`

| File | Import | Fork package | Public alternative? |
|------|--------|--------------|---------------------|
| `model.ts` | `buildGraphIncremental`, `layoutGraph`, `GraphLayout`, `IncrementalBuilderState` | `@opencode/session-ui/graph` | **No** — graph model, incremental builder, layout strategies are private |
| `model.ts` | `buildRenderModel`, `exportGraph`, `DEFAULT_THEME` | `@opencode/session-graph` | **No** — render model, export, theme are private |
| `full-map.tsx` | `GraphView`, `LAYOUT_STRATEGIES`, `GraphArrangement`, `GraphSide` | `@opencode/session-graph`, `@opencode/session-ui/graph` | **No** — GraphView host component is private; layouts are private |
| `panel.tsx` | `navigationResults`, `rankedSearch`, `GraphNode`, `GraphViewData`, `formatProvenance`, `text` | `@opencode/session-ui/graph`, `@opencode/session-graph` | **No** — selectors, types, utilities are private |
| `turn-map-body.tsx` | `turnSubgraph`, `GraphNode` | `@opencode/session-ui/graph` | **No** — subgraph selector is private |
| `settings.tsx` | `LAYOUTS`, `ZOOM_LEVELS`, `DETAIL_MODES` | `@opencode/session-ui/graph` | **No** — constants are private |
| `external/renderer.tsx` | `LAYOUTS` | `@opencode/session-ui/graph` | **No** — layout list is private |
| `index.ts` | `GRAPH_ARRANGEMENTS`, `GRAPH_SIDES`, `LAYOUTS`, `ZOOM_LEVELS`, `DETAIL_MODES` | `@opencode/session-ui/graph` | **No** — constants are private |
| `hybrid-surface.tsx` | `GraphToolbarViewControls` | `@opencode/session-graph` | **No** — toolbar component is private |

**Total: 9 files importing fork-only packages**

## 2. Fork-only packages

| Package | Location | Purpose | Why private? |
|---------|----------|---------|--------------|
| `@opencode/session-ui/graph` | `packages/session-ui/src/graph/` | Pure graph model: `buildGraph`, `buildGraphIncremental`, `layoutGraph`, selectors (`why`, `turnSubgraph`, `subagentSubgraph`, `forwardChain`), types (`GraphViewData`, `GraphNode`, `GraphEdge`, `GraphLayout`, `IncrementalBuilderState`) | Prototype-specific; not yet stabilized for public API |
| `@opencode/session-graph` | `packages/session-graph/` | Host UI: `GraphView`, `GraphInspectorPanel`, `buildRenderModel`, `exportGraph`, `useGraphPermalink`, `useSpatialMemory`, toolbar controls, depth modes, layout controls | Host-specific rendering and interaction; not a generic library |

## 3. Plugin API gaps (what the GUI plugin API cannot yet express)

| Gap | Description | Workaround in fork | Upstream proposal needed? |
|-----|-------------|---------------------|---------------------------|
| Session map surface | `TranscriptScreen` documents "A surface that draws a session map uses it to link a map node back to its message" but no `MapScreen` or `GraphScreen` exists in the plugin API | Fork implements full map as a panel + full-screen view + hybrid surface | **Yes** — propose `GraphScreen` declaration in `@opencode/plugin/gui` |
| Live session data subscription | Plugin reads `server.data.session.message.list(session.id)` and `.status(...)` via Solid resources | Works today because `server.data` is exposed; no streaming delta API | **Maybe** — if streaming deltas needed, propose `session.graph.delta` event |
| File-diff enrichment | Diff nodes need host loader for changed-file diffs (`GraphDiffSource`) | Fork passes `diffSource` prop through panel → GraphView → inspector | **Maybe** — if diff API standardized, propose `session.diff` contract |
| Permalink routing | `#graph:<node>` and `#spacegraph:<layout>:<node>` hash routing handled by plugin | Fork handles in `external/renderer.tsx` and `useGraphPermalink` | **Yes** — propose standard hash route prefix for plugins |
| Layout persistence | Plugin persists layout/level/arrangement per session via stores | Fork uses `BuiltinStore` with session-scoped keys | **No** — works with current SDK |
| Keyboard shortcuts | Plugin registers commands for level/layout/arrangement cycling | Fork uses `BuiltinCommand` | **No** — works with current SDK |

## 4. Data path (what the plugin actually needs from the host)

The plugin reads **only** from public `server.data` (Solid resources from `@opencode/client/solid`):

```typescript
// From packages/gui-plugins/src/spacegraph/model.ts
const messages = server.data.session.message.list(session.id)
const status = server.data.session.status(session.id)
// Optional enrichment:
const workspace = server.data.workspace.snapshot(session.id)
```

**No server changes needed** for the current feature set. The plugin builds the graph entirely from:
- `messages` — all session messages
- `status` — session status (idle/running/failed)
- `workspace` — optional, for file-node enrichment

## 5. What must be bundled into the plugin for fork exit

To install on upstream without the fork, the plugin must **bundle** (or publish) the following from the private packages:

### From `@opencode/session-ui/graph`:
- `buildGraph`, `buildGraphIncremental`
- `layoutGraph` with all strategies (`lanes`, `timeline`, `hierarchy`, `tree`, `force`)
- Selectors: `why`, `forwardChain`, `turnSubgraph`, `subagentSubgraph`, `nodeByID`, `minLevelOf`, `capabilitiesFromSnapshot`, `actionsFor`, `filterActionsByCapabilities`, `fileRelations`, `subagentContributions`, `childIndex`, `childSessionID`, `parentSessionID`, `forkedFrom`, `filePath`, `fileRange`, `count`, `flag`, `strings`, `text`, `formatProvenance`
- Types: `GraphViewData`, `GraphNode`, `GraphEdge`, `GraphLayout`, `IncrementalBuilderState`, `Layout`, `ZoomLevel`, `GraphArrangement`, `GraphSide`, `DetailMode`, `ActionSpec`, `Provenance`, `VOCABULARY_KEYS`, `LEVEL_RANK`
- Constants: `LAYOUTS`, `LAYOUT_STRATEGIES`, `ZOOM_LEVELS`, `DETAIL_MODES`, `GRAPH_ARRANGEMENTS`, `GRAPH_SIDES`

### From `@opencode/session-graph`:
- `GraphView` (host component)
- `buildRenderModel`
- `exportGraph` (SVG/JSON/HTML)
- `DEFAULT_THEME`
- `useGraphPermalink`
- `useSpatialMemory`
- `useGraphAnnotations` (trace navigation)
- `GraphInspectorPanel` / `GraphInspector` / `GraphDetailSurface` / `GraphDetailActions`
- `GraphToolbarViewControls`
- `GraphExportControl`
- `GraphView` props interface (for external renderer)
- `useGraphViewport`
- `useGraphNavigation`
- `useGraphSelection`
- `useGraphComparison`
- `useGraphLayout`
- `useGraphLevel`
- `useGraphArrangement`
- `useGraphFiles`
- `useGraphDepth`
- `GraphCanvasRegion`
- `GraphCanvas` (adapter)

**Strategy:** Bundle all of the above into the plugin package (`packages/gui-plugins/src/spacegraph/`) as internal modules. Do not publish separately — the plugin is the distribution unit.

## 6. Exit checklist

- [ ] Write `fork-delta.md` (this file) — **DONE**
- [ ] Bundle `@opencode/session-ui/graph` into plugin
- [ ] Bundle `@opencode/session-graph` host UI into plugin
- [ ] Replace all fork imports with bundled internal imports
- [ ] Verify plugin builds with only public dependencies (`@opencode/plugin/gui`, `@opencode/client/solid`, `@spacegraphjs/*`, `solid-js`)
- [ ] Install plugin into upstream/dev checkout without fork packages
- [ ] Render a real session on upstream; capture one frame as evidence
- [ ] Exercise paradigm beats that passed Phase 10 on upstream
- [ ] Record any remaining gaps in this file with upstream proposals