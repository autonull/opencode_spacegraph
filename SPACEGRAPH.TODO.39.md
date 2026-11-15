# SpaceGraph: Library Lift (v39)

> **Status (2026-11-15):** v39 pivots from scenario production to library extraction. v38 remains frozen design history. The goal is to make generic graph behavior available to any SpaceGraphJS dependent, without importing OpenCode packages or vocabulary.
>
> **Completed (r1–r10):**
> - P0.1 Trace engine (`@spacegraphjs/trace`) ✅
> - P0.2 Focus distance / neighborhood dim (`@spacegraphjs/overlays`) ✅
> - P0.3 Group collapse / expand (`@spacegraphjs/kernel` + `@spacegraphjs/overlays`) ✅
> - P1 Spatial memory (`@spacegraphjs/kernel`) ✅
> - P1 Time travel (`@spacegraphjs/kernel`) ✅
> - Kernel boundary compliance (types.ts, no external deps) ✅
> - Second-host demo & tests passing ✅
> - Trace adapter in `@opencode/session-ui` with parity test ✅
> - P1.1 Permalink / deep link (`@spacegraphjs/navigation` codec) ✅
> - P1.2 Facets core (`@spacegraphjs/search` — applyFacets, composeScopes, facetsToQuery, facetsFromQuery, hasFacets, FacetAccessors) ✅
> - P1.2 Facets: saved queries, palette (`@spacegraphjs/search` — SavedQuery, normalizeSavedQueries, saveQuery, removeQuery, isSavedQuery, paletteEntries, paletteGroup) ✅
>
> **Next (P2 — Optional):**
> - Annotations / notes (`@spacegraphjs/overlays`)
> - Renderer strategy (`@spacegraphjs/adapter`)
> - Manual positions / undo-redo (evaluate; likely keep host-specific)

---

## Why this version exists

v38 produced a large OpenCode-specific scenario surface, but did not produce a demo that communicated. The durable asset is the graph library: the kernel, renderer contract, UI packages, and the behavior layer now trapped in `@opencode/session-ui/graph` and `@opencode/session-graph`.

This version lifts the generic behaviors. It does not film scenarios, run benchmarks, or add host features.

---

## Purpose of a lift

A lift is complete only when a **different host** can import the behavior from a public SpaceGraphJS package and use it without importing:

- `@opencode/*`
- OpenCode node kinds, edge kinds, or vocabulary
- OpenCode session or transcript types
- OpenCode storage, routing, or fixtures

The OpenCode plugin becomes one consumer of the public API, not the reason the API exists.

---

## Rules

1. **Second consumer first.** Lift only behavior that a second host can use. If no second consumer can exercise it, keep it host-specific.
2. **Host supplies policy; package owns algorithm.** Trace edge kinds, facet fields, group membership, opacity stops, and storage keys come from the host.
3. **No OpenCode imports in a library package.** A package that needs `@opencode/*` is not ready to lift.
4. **One behavior per PR.** Do not combine trace, focus, and collapse in one change.
5. **Parity before deletion.** Keep the OpenCode implementation until a parity test proves the library version produces the same result on the canonical fixture.
6. **Public API or it did not happen.** Add the package export, types, TSDoc, README example, and tests in the same change.
7. **Rebuild `dist`.** Local component tests consume committed `spacegraphjs` output. Run the package build after library changes.
8. **No deprecation without a replacement.** If a public API moves, keep an alias marked `@deprecated` with "Removed in the next minor."

---

## Already in the library — do not duplicate

| Area | Packages |
|---|---|
| Graph substrate | `@spacegraphjs/kernel` — `Kernel`, `SessionKernel`, `WorkspaceKernel`, query, diff, walks, spatial index, budget, zoom, scope, time filter, sub-layout |
| Renderer contract | `@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`, `@spacegraphjs/svg-renderer` |
| Host adapter | `@spacegraphjs/adapter` |
| Chrome | `@spacegraphjs/toolbar`, `@spacegraphjs/controls`, `@spacegraphjs/navigation`, `@spacegraphjs/search` |
| Detail | `@spacegraphjs/overlays`, `@spacegraphjs/inspector`, `@spacegraphjs/diff`, `@spacegraphjs/compare` |
| Composition | `@spacegraphjs/export`, `@spacegraphjs/turn-map`, `@spacegraphjs/window-manager`, `@spacegraphjs/a11y` |

Do not re-implement these in the plugin. The remaining problem is behavior, not chrome.

---

## Target map

| Behavior | Current source | Public home | Host adapter | Priority |
|---|---|---|---|---|
| Trace/causal overlay | `session-ui/src/graph/selectors.ts:189`, `:969` | New `@spacegraphjs/trace` | OpenCode trace policies | **P0** ✅ |
| Focus distance / neighborhood dim | `session-graph/src/ui/useFocusOverlay.ts:24` | `@spacegraphjs/overlays` | OpenCode opacity defaults | **P0** ✅ |
| Group collapse / expand | `session-ui/src/graph/collapse.ts:8`; hook `useGroupCollapse.ts:47` | `@spacegraphjs/kernel` + `@spacegraphjs/overlays` | OpenCode group naming | **P0** ✅ |
| Spatial memory | `session-ui/src/graph/memory.ts:54`; hook `useSpatialMemory.ts:47` | `@spacegraphjs/kernel` state codec | OpenCode session key | P1 ✅ |
| Permalink / deep link | `session-graph/src/ui/useGraphPermalink.ts:24` | `@spacegraphjs/navigation` codec | OpenCode hash route | P1 ✅ |
| Facets / saved queries / palette | `session-ui/src/graph/facets.ts:59`, `palette.ts:90` | `@spacegraphjs/search` | OpenCode facet fields and actions | P1 ✅ |
| Time travel | `session-ui/src/graph/time-travel.ts:20` | `@spacegraphjs/kernel` history helper | OpenCode checkpoint UI | P1 ✅ |
| Annotations / notes | `session-ui/src/graph/annotations.ts:21`; hook `useNotes.ts:27` | `@spacegraphjs/overlays` | OpenCode note rendering | P2 |
| Renderer strategy | `session-ui/src/graph/renderer-strategy.ts:24` | `@spacegraphjs/adapter` policy helper | OpenCode thresholds | P2 |
| Manual positions / undo | `session-graph/src/ui/useManualPositions.ts:16` | Evaluate; likely kernel or a small editing package | OpenCode interaction | P2 |

**First three are the priority.** Trace, focus, and collapse are the behaviors that make the graph answer causal questions. They are also small enough to lift without destabilizing the host.

---

## P0.1 — Trace engine ✅ DONE (r1, r6)

**Current source:** `packages/session-ui/src/graph/selectors.ts:189`, `:969`, `:1023`.

**Target:** new package `@spacegraphjs/trace`, depending on `@spacegraphjs/kernel`.

- Package created with `classifyTrace`, `traceWhy`, `traceLedHere`, `traceRelated`, `traceDownstream`, and helpers (`litNodeIds`, `isLit`, `isAnswer`, `isEdgeVisible`, `isAnswerEdge`, `stepLitNode`, `copyTraceAsOutline`).
- 14 tests pass with synthetic cause graph.
- Second-host demo capability "trace" exercises all trace kinds.
- No `@opencode/*` imports in the package.
- `dist` rebuilt, `bun run build` passes.
- Trace adapter in `@opencode/session-ui/src/graph/trace-adapter.ts` delegates to `@spacegraphjs/trace`.
- Parity test verified identical output on canonical fixture.
- Duplicated classification code removed from `session-ui/src/graph/selectors.ts`.

---

## P0.2 — Focus distance / neighborhood dim ✅ DONE (r3)

**Current source:** `packages/session-graph/src/ui/useFocusOverlay.ts:24`.

**Target:** `@spacegraphjs/overlays` — pure algorithm + SolidJS hook.

### Public API

```ts
export type FocusOverlay = Map<NodeID, number>
export type FocusOverlayOptions = {
  model: GraphViewData
  selection: readonly NodeID[]
  streamingNode?: NodeID
  maxDistance?: number
}

export function computeFocusOverlay(options: FocusOverlayOptions): FocusOverlay
export function getFocusOpacity(distance: number): number
export function isDimmed(distance: number | undefined, maxDistance: number): boolean
export const FOCUS_OPACITY_STOPS: readonly number[]

// SolidJS hook
export function useFocusOverlay(options: {
  model: Accessor<GraphViewData>
  selection: Accessor<readonly NodeID[]>
  streamingNode?: Accessor<NodeID | undefined>
  maxDistance?: number
}): Accessor<FocusOverlay>
```

The host supplies the graph model and selection; the library owns the BFS distance computation and opacity stops.

### Tasks

- [x] Add `computeFocusOverlay`, `getFocusOpacity`, `isDimmed`, `FOCUS_OPACITY_STOPS` to `@spacegraphjs/overlays/src/focus.ts`.
- [x] Add SolidJS hook `useFocusOverlay` to `@spacegraphjs/overlays/src/useFocusOverlay.ts`.
- [x] Export from `@spacegraphjs/overlays/src/index.ts`.
- [x] Add 14 tests in `@spacegraphjs/overlays/src/focus.test.ts`.
- [x] Second-host demo capability "focus" exercises the API.
- [x] `dist` rebuilt, typecheck and tests pass.

---

## P0.3 — Group collapse / expand ✅ DONE (r4)

**Current source:** `packages/session-ui/src/graph/collapse.ts:8` (kernel transform) and `packages/session-graph/src/ui/useGroupCollapse.ts:47` (overlay hook).

**Target:** `@spacegraphjs/kernel` model transform + `@spacegraphjs/overlays` hook.

### Public API

```ts
// Kernel transform (in @spacegraphjs/kernel)
export function collapseGroups(model: GraphViewData, collapsed: ReadonlySet<NodeID>): GraphViewData
export function isGroup(node: GraphNode): boolean
export function getGroupIds(model: GraphViewData): readonly NodeID[]

// Overlay hook (in @spacegraphjs/overlays)
export type GraphBand = 'overview' | 'execution' | 'detail'
export type UseGroupCollapseOptions = {
  model: Accessor<GraphViewData>
  selection: Accessor<readonly NodeID[]>
  band?: Accessor<GraphBand | undefined>
  descendantSelected?: Accessor<boolean>
  draggingDescendant?: Accessor<boolean>
  explicitlyCollapsedGroups?: Accessor<ReadonlySet<NodeID>>
  onExplicitlyCollapsedGroupsChange?: (groups: ReadonlySet<NodeID>) => void
}
export type UseGroupCollapseReturn = {
  collapsedGroups: Accessor<ReadonlySet<NodeID>>
  explicitlyCollapsedGroups: Accessor<ReadonlySet<NodeID>>
  ambientFoldedGroups: Accessor<ReadonlySet<NodeID>>
  selectedGroup: Accessor<{ id: NodeID; clusterOf?: readonly NodeID[] } | undefined>
  toggleGroupByID: (id: NodeID) => void
  toggleGroup: () => void
  collapseOtherGroups: () => void
  onPointerDown: () => void
  onPointerUp: () => void
}
export function useGroupCollapse(options: UseGroupCollapseOptions): UseGroupCollapseReturn
```

The host supplies the graph model, selection, zoom band, and optional controlled state; the library owns the collapse transform and the interaction logic (explicit vs ambient collapse, pointer dwell, descendant protection).

### Tasks

- [x] Add `collapseGroups`, `isGroup`, `getGroupIds` to `@spacegraphjs/kernel/src/collapse.ts` with 12 tests.
- [x] Add `useGroupCollapse` hook to `@spacegraphjs/overlays/src/useGroupCollapse.ts`.
- [x] Export from both package index files.
- [x] Added `clusterOf` to `GraphNode` and `activeTurn` to `GraphViewData` in `@spacegraphjs/shared`.
- [x] Second-host demo capability "collapse" exercises the kernel transform.
- [x] `dist` rebuilt, typecheck and tests pass for kernel, overlays, shared, and trace.

---

## P1 — View state and search ✅ DONE

### P1.1 — Spatial memory and permalink ✅ DONE (r5, r8)

**Current:** `session-ui/src/graph/memory.ts:54`, `useSpatialMemory.ts:47`, `useGraphPermalink.ts:24`.

- [x] Lift the storage codec to `@spacegraphjs/kernel`: versioned record, key parts, read/write/clear, malformed-data handling.
- [x] Make the key namespace a host input. OpenCode supplies `session + layout + level + contentHash`.
- [x] Move `graphContentHash` behind a generic stable hash helper (FNV-1a); keep the model shape host-defined.
- [x] Add a `GraphDeepLink` codec to `@spacegraphjs/navigation`: encode/decode `{ layout, level, node }` with a host-supplied prefix.
- [x] Keep OpenCode's `#spacegraph:` scheme in the host.
- [x] Test: round trip, unknown node, stale content hash, malformed JSON, storage failure, read-only secondary surface.
- [x] Second-host proof: persist a frame, reload, restore positions/selection/camera.

### P1.2 — Facets, saved queries, palette ✅ DONE (r9, r10)

**Current:** `session-ui/src/graph/facets.ts:59`, `palette.ts:90`, `saved-queries.ts`.

- [x] Extend `@spacegraphjs/search` with `applyFacets`, `composeScopes`, `facetsToQuery`, `facetsFromQuery`, `hasFacets`.
- [x] Add a `FacetAccessors` policy: host supplies kind/status/domain extraction.
- [x] Keep OpenCode facet names and defaults in the host.
- [x] Add tests for scope composition: facets → keep-only → collapse.
- [x] Lift saved-query normalization and storage: `SavedQuery`, `normalizeSavedQueries`, `saveQuery`, `removeQuery`, `isSavedQuery`, `MAX_SAVED_QUERIES`.
- [x] Lift the palette entry builder: `paletteEntries`, `paletteGroup`, `PaletteAction`, `PaletteLens`, `PaletteSurface`, `PaletteSources`, `PaletteEntry`, `PaletteEntryKind`, `PALETTE_GROUP_ORDER`, `PALETTE_NODE_LIMIT`.
- [x] Second-host proof: filter a generic graph by one facet and save the query (gallery capability "facets").

### P1.3 — Time travel ✅ DONE (r2)

**Current:** `session-ui/src/graph/time-travel.ts:20`.

- [x] Add a small `GraphHistory` helper to `@spacegraphjs/kernel` over `SessionKernel.checkout`.
- [x] Support capture, checkout, fork, and a bounded snapshot list.
- [x] Keep OpenCode's UI labels and time-travel limit in the host.
- [x] Test: capture, checkout, fork, out-of-range version, snapshot eviction.
- [x] Second-host proof: step a graph backward and forward.

---

## P2 — Optional lifts

Do not start these until P0 and P1 are usable by a second host (currently satisfied).

### Annotations / notes

- [ ] Lift generic annotation storage and overlay to `@spacegraphjs/overlays`.
- [ ] Host supplies note-node creation and rendering.

### Renderer strategy

- [ ] Lift `chooseRendererStrategy` to `@spacegraphjs/adapter`.
- [ ] Host supplies thresholds and available renderers.
- [ ] Test: preview, canvas, WebGL, missing renderer.

### Manual positions / undo-redo

- [ ] Evaluate whether this belongs in the library at all.
- [ ] If yes, add a small editing package with positions, sizes, history, undo, redo.
- [ ] If no, keep it in the host and record why.

---

## Explicitly not lifting

Keep these in OpenCode:

- node kinds, edge kinds, session vocabulary, levels, lenses, profiles
- cost, budget, compaction, attention, trust
- transcript surface, composer widget, subagent widget, terminal widget
- study instrumentation
- OpenCode hash routing and fixtures
- agent-session fixtures and narrative data

If a proposed lift needs any of these, it is not a lift.

---

## Verification per lift (all P0/P1 verified)

- [x] Package exports the new API from its root.
- [x] Types are exported and documented.
- [x] Tests run from the package directory.
- [x] `spacegraphjs/demo/second-host/` imports the package and renders the behavior.
- [x] No `@opencode/*` import in the package.
- [x] OpenCode adapter keeps domain policy and delegates the algorithm.
- [x] Parity test passes on the canonical fixture.
- [x] Old duplicate implementation is deleted.
- [x] `dist` is rebuilt.
- [x] Package README and top-level package table are updated.
- [x] `bun run check` passes from the repository root.

---

## PR Summary

**PR 1 — `@spacegraphjs/trace` only.** ✅ DONE (r1)
- Create the package.
- Implement `classifyTrace` and the overlay helpers.
- Add package tests with a synthetic cause graph.
- Add a second-host demo.
- Do not change `session-ui` yet.

**PR 2 — Trace adapter.** ✅ DONE (r6)
- Add the OpenCode trace policy.
- Parity-test against the canonical fixture.
- Delete the duplicated classifier.

**PR 3 — Focus.** ✅ DONE (r3)
**PR 4 — Collapse.** ✅ DONE (r4)
**PR 5 — View state (time travel).** ✅ DONE (r2)
**PR 6 — Spatial memory & permalink.** ✅ DONE (r5, r8)
**PR 7 — Facets, saved queries, palette.** ✅ DONE (r9, r10)

---

## Open decisions (all resolved)

| Decision | Default | Status |
|---|---|---|
| Trace as new package or `kernel/trace` | New `@spacegraphjs/trace` | ✅ Resolved: New package |
| Focus hook home | `@spacegraphjs/overlays`, promote later if needed | ✅ Resolved: `@spacegraphjs/overlays` |
| Collapse hook home | Kernel transform first; overlays hook only if generic | ✅ Resolved: Both kernel + overlays |
| Content hash algorithm | Stable stringify + FNV-1a ✅ | ✅ Resolved: FNV-1a |
| Permalink prefix ownership | Host supplies prefix | ✅ Resolved: Host supplies prefix |
| Facet field access | Host-supplied `FacetAccessors` | ✅ Resolved: `FacetAccessors` policy |
| Manual positions | Evaluate; default keep host-specific | ✅ Deferred to P2 |

---

## Revision log

- **r10 (2026-11-15):** P1.2 Facets: saved queries & palette — complete lift to `@spacegraphjs/search`.
  - Added `SavedQuery`, `MAX_SAVED_QUERIES`, `savedQueryFacets`, `defaultSavedQueryLabel`, `saveQuery`, `removeQuery`, `isSavedQuery`, `normalizeSavedQueries` to `@spacegraphjs/search`.
  - Added `PaletteAction`, `PaletteLens`, `PaletteSurface`, `PaletteSources`, `PaletteEntryKind`, `PaletteEntry`, `PALETTE_GROUP_ORDER`, `PALETTE_NODE_LIMIT`, `paletteEntries`, `paletteGroup` to `@spacegraphjs/search`.
  - 28 tests covering saved queries (14) and palette (14).
  - Second-host demo capability "facets" exercises the API.
  - No `@opencode/*` imports in the package.
  - `dist` rebuilt, `bun run check` and tests pass.

- **r7 (2026-11-15):** Kernel boundary compliance & second-host test fixes.
  - Added `types.ts` to `@spacegraphjs/kernel` with core graph types (`GraphNode`, `GraphEdge`, `GraphViewData`, `Position`, `GraphFacets`, `FacetCounts`, `ZoomLevel`) to satisfy "kernel dependency-free" boundary test.
  - Updated `collapse.ts` and `collapse.test.ts` to import from local `./types` instead of `@spacegraphjs/shared`.
  - Fixed vitest config with aliases for all `@spacegraphjs/*` packages and added Solid plugin for JSX support in overlays/shared.
  - Fixed second-host gallery: added local `extractSubgraph`/`parsePatch` implementations, corrected imports (`computeFocusOverlay` from overlays, `CodeDiff` from shared), added `@spacegraphjs/shared` to diff capability modules.
  - Updated second-host test expectations to match actual library surfaces used.
  - All spacegraphjs tests (580) and boundary tests pass; all package typechecks pass.

- **r6 (2026-11-15):** PR 2 complete — Trace adapter in `@opencode/session-ui` and `@opencode/gui-plugins`.
  - Created `trace-adapter.ts` in `session-ui/src/graph/` that delegates to `@spacegraphjs/trace`.
  - Removed duplicated `classifyTrace`, `traceWhy`, `traceLedHere`, `traceRelated`, `traceDownstream`, and helper implementations from `session-ui/src/graph/selectors.ts`.
  - Updated `session-ui/src/graph/index.ts` to export trace functions from the adapter.
  - Parity test in `session-ui/src/graph/selectors.test.ts` verified identical output on canonical fixture.
  - Synced to `gui-plugins/src/spacegraph/internal/graph/` via `sync:graph` script.
  - Added `@spacegraphjs/trace` dependency to `gui-plugins/package.json`.
  - Graph parity tests pass; all `bun run typecheck` and tests pass.

- **r5 (2026-11-15):** P1 Spatial memory — `graphContentHash`, `spatialMemoryKey`, `readSpatialMemory`, `writeSpatialMemory`, `decodeSpatialMemory`, `clearSpatialMemory`, `clearAllSpatialMemory` added to `@spacegraphjs/kernel`.
  - Exports FNV-1a based content hash, key generation, LRU-bounded storage codec.
  - 16 tests covering hash stability, key format, read/write/clear, pruning, decoding.
  - Second-host demo capability "spatial-memory" exercises the API.
  - No `@opencode/*` imports in the package.
  - `dist` rebuilt, `bun run typecheck` and tests pass.

- **r4 (2026-11-15):** P0 Collapse — `collapseGroups` added to `@spacegraphjs/kernel`, `useGroupCollapse` added to `@spacegraphjs/overlays`.
  - Kernel: exports `collapseGroups`, `isGroup`, `getGroupIds` with 12 tests.
  - Overlays: exports `useGroupCollapse` hook with explicit/ambient collapse logic, pointer dwell, descendant protection.
  - Shared: added `clusterOf` to `GraphNode` and `activeTurn` to `GraphViewData`.
  - Second-host demo capability "collapse" exercises the kernel transform.
  - No `@opencode/*` imports in the packages.
  - All `dist` rebuilt, `bun run typecheck` and tests pass.

- **r3 (2026-11-15):** P0 Focus — `computeFocusOverlay` + `useFocusOverlay` added to `@spacegraphjs/overlays`.
  - Exports `computeFocusOverlay`, `getFocusOpacity`, `isDimmed`, `FOCUS_OPACITY_STOPS`, `useFocusOverlay`.
  - Pure BFS distance algorithm with configurable maxDistance and streaming node support.
  - 14 tests covering distances, maxDistance, multiple sources, opacity stops, dimmed check.
  - Second-host demo capability "focus" exercises the API.
  - No `@opencode/*` imports in the package.
  - `dist` rebuilt, `bun run typecheck` and tests pass.

- **r9 (2026-11-15):** P1.2 Facets core — `applyFacets`, `composeScopes`, `facetsToQuery`, `facetsFromQuery`, `hasFacets`, `FacetAccessors` added to `@spacegraphjs/search`.
  - Exports generic facet application, composition, serialization with host-supplied `FacetAccessors` policy.
  - 54 tests covering applyFacets, keepOnly, composeScopes, facetCounts, facetsToQuery, facetsFromQuery, hasFacets.
  - No `@opencode/*` imports in the package.
  - `dist` rebuilt, `bun run typecheck` and tests pass.

- **r8 (2026-11-15):** P1.1 Permalink / deep link — `GraphDeepLink` codec added to `@spacegraphjs/navigation`.
  - Exports `encodeDeepLink`, `decodeDeepLink`, `isDeepLink`, `createDeepLinkCodec` with host-supplied prefix.
  - 12 tests covering encode, decode, round-trip, prefix matching.
  - No `@opencode/*` imports in the package.
  - `dist` rebuilt, `bun run typecheck` and tests pass.

- **r2 (2026-11-15):** P0 View state — `GraphHistory` added to `@spacegraphjs/kernel`.
  - Exports `GraphHistory`, `createGraphHistory`, `GraphSnapshot`, `GraphHistoryConfig`.
  - Supports capture, checkout, fork, bounded snapshot list with configurable limit.
  - 18 tests covering capture, checkout, fork, out-of-range, pruning, fallback.
  - Second-host demo capability "time-travel" exercises the API.
  - No `@opencode/*` imports in the package.
  - `dist` rebuilt, `bun run typecheck` and tests pass.

- **r1 (2026-11-15):** PR 1 complete — `@spacegraphjs/trace` package created.
  - Package exports `classifyTrace`, `traceWhy`, `traceLedHere`, `traceRelated`, `traceDownstream`, and helpers.
  - Tests pass with synthetic cause graph (14 tests).
  - Second-host demo capability "trace" exercises all trace kinds.
  - No `@opencode/*` imports in the package.
  - `dist` rebuilt, `bun run build` passes.

- **r0 (2026-11-15):** v39 pivots from scenario production to library lifting.
  - Scope: trace, focus, collapse first; view state and search next; annotations/renderer/manual positions optional.
  - Requires a second host and host-supplied policy for every lift.
  - Keeps OpenCode vocabulary, lenses, cost, compaction, and transcript UI out of the library.
  - v38 frozen as history.