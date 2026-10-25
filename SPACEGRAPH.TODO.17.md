# SPACEGRAPH.TODO.17 — Writes Payload Labels, Usability Polish & Library Hardening

**Status:** Draft. Builds on TODO.16 (core A/B/C complete, T2.2 gate removed for single-user focus).

---

## 1. Scope

| Item | Source | Impact |
|------|--------|--------|
| **Writes payload labels** | TODO.16 deferred | `+n −m` on `writes` edges in card/peek |
| **Consumerless exports cleanup** | TODO.16 delete list | Remove `shortestPath`/`forwardChain` from public API |
| **Self-navigating action fix** | TODO.16 delete list | `file.history`/`symbol.showCallers` → trace presets |
| **Arrangement undo/redo (V115)** | Vault | Manual layout survives rebuilds; needs undo stack |
| **Card micro-actions (V116)** | Vault | One safe icon per card (e.g., copy path) |
| **Mobile graph mode** | SPACEGRAPH.md §8.7 | Desktop-gated → works on mobile |
| **Renderer selector in toolbar** | SPACEGRAPH.md §8.11 | Switch SpaceGraph ↔ Cytoscape ↔ SVG |
| **Empty-column exclusion in fit** | SPACEGRAPH.md §8.15 | Fit frames content, not empty space |
| **Lane gutter as screen-fixed overlay** | SPACEGRAPH.md §8.13 | Better spatial orientation |
| **Depth fade for DOM cards** | SPACEGRAPH.md §8.16 | Visual consistency with canvas |
| **Edge label collision avoidance** | SPACEGRAPH.md §8.3 | Labels avoid all geometry, not just cards |
| **Mesh selection silhouette** | SPACEGRAPH.md §8.2 | Better visual feedback on select |
| **First paint / pan frame rate** | SPACEGRAPH.md §8.10 | Performance measurement + budget |
| **Graph onboarding / keyboard reference** | UX gap | First-time discoverability |
| **Export: standalone HTML with interactivity** | SPACEGRAPH.md §7.1 | Shareable artifact viewers can explore |
| **Library: Incremental RenderModelPatch** | SPACEGRAPH.md §12 D3 | Streaming updates without full rebuild |
| **Library: Force layout optimization** | SPACEGRAPH.md §8.19 | 9s → <1s at 20k nodes |
| **Library: Edge bundling / curve routing** | Vault V105 | Visual clarity for dense graphs |
| **Library: Minimap mirror fix (Cytoscape)** | SPACEGRAPH.md §8.9 | Consistent orientation across renderers |
| **Library: Orthographic wheel zoom** | SPACEGRAPH.md §8.1 | Keep pointer-anchored zoom |
| **Library: Activity types stopgap removal** | SPACEGRAPH.md §8.5 | Replace `types/activity.d.ts` with generated |
| **Library: Contract version bump + publish** | SPACEGRAPH.md §9.1 | Upstream-ready npm packages |

### Deferred (architectural consequences)

| Item | Reason |
|------|--------|
| **Annotation persistence (V113)** | Needs app line-comment store owner; session-local is fine for now |
| **Graph state persistence** | Needs session storage abstraction; manual positions survive rebuilds already |

---

## 2. Work Plan (11 slices, ~12 days)

### Slice 1 — Writes payload labels (1.5 days)

**Data flow:** Session message metadata → `diffByTurn` → `writes` edge `data` field → card/peek render

**Changes:**
1. `session-builder.ts`: When creating `writes` edges, look up `FileDiffInfo` from `diffByTurn` for that turn + file, attach `{ additions, deletions }` to edge `data`
2. `model.ts`: Extend `GraphEdge` with optional `data?: { additions?: number; deletions?: number }`
3. `cardTemplate.ts`: Render `+n −m` badge on file cards when `writes` edge has diff data
4. `GraphPeek.tsx`: Show diff stats in edge peek for `writes` edges
5. `GraphLegend.tsx`: Already lists edge kinds with counts — no change needed

**Test:** Unit test `fileRelations` includes diff stats; component test card shows `+3 −1`

---

### Slice 2 — Cleanup & bug fixes (0.5 days)

| Task | File | Change |
|------|------|--------|
| Remove `shortestPath`/`forwardChain` from public export | `session-ui/src/graph/index.ts` | Delete lines 105, 106 |
| Fix `file.history`/`symbol.showCallers` self-nav | `session-ui/src/graph/actions.ts` | Dispatch `graph:command` with `why`/`led-here` trace |
| Remove dead `custom` lens option (if any) | `GraphToolbar.tsx` | Already deleted per TODO.16 |

---

### Slice 3 — Arrangement undo/redo + card micro-actions (1.5 days)

**V115 — Arrangement undo/redo:**
- `GraphView`: `manual.positions`/`manual.sizes` already store reader drags
- Add `manualHistory: Position[][]` + `manualFuture: Position[][]` stacks
- On drag commit: push to history, clear future
- Toolbar: Undo/Redo buttons (disabled when empty) + `z`/`Z` keys
- Persist per session? Optional — session-local is fine for V1

**V116 — Card micro-actions:**
- One icon per card (top-right, 16px): "Copy path" for files, "Copy ID" for others
- Reuse `createCardCopy` logic; `navigator.clipboard.writeText`
- Show on hover only; `data-slot="card-action"` for tests

---

### Slice 4 — Mobile graph mode (1 day)

**Problem:** SPACEGRAPH.md §8.7 — "Mobile graph mode desktop-gated for v1; mobile reaches graph only via `graph.toggle` command."

**Changes:**
1. `GraphView.tsx`: Detect viewport < 768px → use map-only fallback (exists per TODO.16 §10)
2. `GraphToolbar.tsx`: Collapse secondary controls into overflow menu (exists per RF.7)
3. `GraphInspector.tsx`: Bottom sheet on narrow (exists per U3.8/RF.8)
4. Add mobile-specific tests: touch pan/zoom, drawer inspector, narrow layout
5. Verify `mod+alt+t` turn-map overlay works on mobile (focus-trapped dialog)

**Test:** Component test at 390×844 viewport; all gestures work via touch

---

### Slice 5 — Renderer selector + performance measurement (1 day)

**Problem:** SPACEGRAPH.md §8.10, §8.11 — "Renderer selector not in app toolbar" + "First paint / pan frame rate unmeasured"

**Changes:**
1. `GraphToolbar.tsx`: Add renderer dropdown in "Draw" menu (uses `capabilities` from renderer registry)
2. `GraphView.tsx`: Expose `preferredRenderer` prop; persist in session settings
3. Add `graph:perf` command (dev-only overlay) showing FPS, frame time, node count
4. `packages/session-graph/script/perf-bench.ts`: Automated FPS measurement during pan/zoom
5. CI gate: fail if 60-turn pan drops below 55 FPS on reference hardware

**Test:** E2E row: switch renderer → verify capabilities update; perf benchmark passes

---

### Slice 6 — Visual polish: fit, gutter, depth fade, edge labels, selection (1.5 days)

| Issue (SPACEGRAPH.md §8) | Fix | Location |
|--------------------------|-----|----------|
| #8.15 Empty-column exclusion in fit | `fitOptions`: filter nodes with `x > minContentX` | `graph-camera.ts` / `GraphView` |
| #8.13 Lane gutter world-space → screen-fixed | `GraphCanvas`: render gutter as overlay at `x=0` screen space | `GraphCanvas.tsx` |
| #8.16 Depth fade for DOM cards | `cardTemplate.ts`: apply `opacity: var(--depth-fade)` based on Z | `cardTemplate.ts` |
| #8.3 Edge label collision avoidance | Extend label avoidance to all geometry (edges, bands, cards) | `spacegraph-renderer` |
| #8.2 Mesh selection silhouette | Replace `BoxHelper` with `MeshOutlineMaterial` or custom shader | `spacegraph-renderer` |

---

### Slice 7 — Graph onboarding & keyboard reference (0.5 days)

**Problem:** First-time users don't discover gestures (`w`/`e`/`r` for traces, `[`/`]` for stepping, `/` search, `f` fit, `1/2/3` levels).

**Changes:**
1. `GraphView.tsx`: On first mount (no `graph:onboarded` in localStorage), show transient toast with 5 key gestures
2. `GraphToolbar.tsx`: Add "Keyboard shortcuts" to overflow menu → opens modal with full reference
3. `GraphCanvas.tsx`: Subtle hint overlay on empty canvas ("Drag to pan, wheel to zoom, click node to select")

**Test:** Component test: first visit shows toast; shortcuts modal opens and lists all bindings

---

### Slice 8 — Export: standalone HTML with interactivity (0.5 days)

**Problem:** SPACEGRAPH.md §7.1 — export produces static SVG/JSON/HTML; HTML export should be explorable.

**Changes:**
1. `export.ts`: Standalone HTML includes SpaceGraphJS renderer + `GraphController` + minimal UI (toolbar, inspector)
2. Embed render model as inline JSON; hydrate on load
3. Support `#graph:<nodeID>` deep link in exported file
4. Add "Export interactive" alongside existing formats

**Test:** E2E: export interactive → open in browser → pan/zoom/select works; deep link frames node

---

### Slice 9 — Library: Incremental RenderModelPatch + streaming (2 days)

**Problem:** SPACEGRAPH.md §12 D3 — "Incremental `RenderModelPatch`" for streaming updates without full rebuild.

**Changes:**
1. `@spacegraphjs/adapter`: Add `diffRenderModels(old, new) → RenderModelPatch` (nodes/edges added/removed/changed)
2. `@spacegraphjs/renderer`: Add `applyPatch(patch: RenderModelPatch)` to `GraphRenderer` contract
3. `spacegraph-renderer` / `cytoscape-renderer`: Implement `applyPatch` (partial DOM/WebGL updates)
4. `GraphView.tsx`: On streaming model update, compute patch → `renderer.applyPatch()` instead of `setModel()`
5. Benchmark: 100-node incremental update < 10ms vs 63ms full rebuild

**Test:** Unit: patch round-trip equals full rebuild; Perf: incremental update latency

---

### Slice 10 — Library: Force layout optimization + edge bundling (1.5 days)

**Problem:** SPACEGRAPH.md §8.19 — "Force layout 9.3s uncapped at 20k nodes" + Vault V105 "Edge bundling / curve routing"

**Changes:**
1. `spacegraphjs/layout`: Force layout — add Barnes-Hut quadtree (O(n log n) vs O(n²)), early exit on convergence
2. `spacegraphjs/layout`: Add edge bundling option (hierarchical edge bundling by common ancestors)
3. `spacegraph-renderer`: Curved edge routing (bezier with control points at bundle junctions)
4. Config: `forceLayout: { maxIterations: 300, barnesHutTheta: 0.5, edgeBundling: true }`

**Test:** Perf: 20k nodes < 2s; Visual: bundled edges reduce clutter in dense regions

---

### Slice 11 — Library: Hardening & publish (1.5 days)

| Task | Location | Status |
|------|----------|--------|
| Fix minimap vertical mirror (Cytoscape) | `cytoscape-renderer` | §8.9 |
| Orthographic wheel zoom keeps pointer anchor | `spacegraph-renderer` | §8.1 |
| Replace `types/activity.d.ts` with generated declarations | `spacegraphjs/packages/*` | §8.5 |
| Remove global `SpaceGraph.instances` dev handle | `spacegraphjs/core` | §8.4 |
| Contract version bump (3 → 4) + `test:publish` | All library packages | §9.1 |
| Deprecate `vue-spacegraph` | `spacegraphjs` | §8.3 |
| Embedder devtools (node/edge inspector) | `spacegraphjs/control` | §8.3 |
| API docs + release automation | `spacegraphjs` | §8.3 |

---

## 3. Technical Details

### 3.1 Writes edge data attachment

```typescript
// session-builder.ts ~line 1398
const diffInfo = diffByTurn?.get(turnID)?.find(d => d.file === path)
this.addEdge({
  kind: "writes",
  source: toolID,
  target: fileID,
  confidence: "explicit",
  data: diffInfo ? { additions: diffInfo.additions, deletions: diffInfo.deletions } : undefined
})
```

### 3.2 Card template badge

```typescript
// cardTemplate.ts - in kindContent for "file"
const writesEdges = incoming(model, node.id).filter(e => e.kind === "writes")
const diff = writesEdges.find(e => e.data?.additions || e.data?.deletions)
if (diff) return `+${diff.data.additions ?? 0} −${diff.data.deletions ?? 0}`
```

### 3.3 Incremental RenderModelPatch (Slice 9)

```typescript
// @spacegraphjs/adapter
export type RenderModelPatch = {
  nodes: { added: RenderNode[]; removed: string[]; changed: RenderNode[] }
  edges: { added: RenderEdge[]; removed: string[]; changed: RenderEdge[] }
  viewport?: { zoom: number; center: [number, number, number] }
}

export function diffRenderModels(old: RenderModel, next: RenderModel): RenderModelPatch {
  // O(n) diff by stable ID maps
}
```

---

## 4. Test Strategy

| Layer | Coverage |
|-------|----------|
| Unit | `fileRelations` includes diff stats; `diffRenderModels` round-trip; force layout O(n log n); patch apply equals full rebuild |
| Component | Card shows `+n −m`; undo/redo restores position; mobile viewport renders map-only; renderer selector switches backends; onboarding toast; interactive export; keyboard shortcuts modal |
| E2E | 12 new rows: writes labels, undo/redo, mobile gestures, renderer switch, perf budget, fit excludes empty, depth fade cards, onboarding, interactive export, force layout perf, patch streaming, publish verify |

---

## 5. Invariant Checklist

- [ ] Positions never move due to writes labels (overlay only)
- [ ] Undo/redo only affects manual positions, not derived layout
- [ ] No new mode vocabulary
- [ ] Single scope pipeline unchanged
- [ ] Mobile gestures don't conflict with browser chrome
- [ ] Renderer switch preserves selection and camera
- [ ] Fit never frames empty space
- [ ] Depth fade consistent between canvas and DOM
- [ ] Incremental patch produces identical result to full rebuild
- [ ] Force layout converges deterministically with same seed
- [ ] Published packages install cleanly in clean clone

---

## 6. Out of Scope (remain vaulted)

| Item | Reason |
|------|--------|
| Compare-as-window | Claims delivered; verify in Slice 2 |
| Group header fold/menu | Claims delivered; verify in Slice 2 |
| Community grouping (V103) | No consumer |
| Executable flow edges (V117) | Separate product |
| Multi-user presence (V119) | Needs collaboration owner |
| Cross-session graphs (D4) | Needs single-session evidence first |
| Real 3D geometry (D5) | Protocol prefers layered/depth-stack |
| Host-neutral activity adapter (D2) | Second host not demanding |
| Inline row host (D1) | Maintainer approval needed |

---

## 7. Acceptance Criteria

| Row | Scenario | Assertion |
|-----|----------|-----------|
| 12 | File card shows `+3 −1` on `writes` edge | `data-slot="card-badge"` contains `+3 −1` |
| 13 | Undo restores dragged card position | Position matches pre-drag after `z` key |
| 14 | Mobile viewport shows map-only fallback | `data-slot="graph-view"` at 390px width has no inspector panel |
| 15 | Renderer selector switches backend | `data-graph-renderer` changes; capabilities update |
| 16 | Fit excludes empty columns | Camera bounds match content, not session root at x=0 |
| 17 | Depth fade on DOM cards | `data-depth="layered"` → card opacity varies with Z |
| 18 | Onboarding toast shows on first visit | `localStorage.graph:onboarded` set after dismiss |
| 19 | Interactive export works standalone | Open exported HTML → pan/zoom/select works |
| 20 | Force layout 20k nodes < 2s | `graph:scale` benchmark passes |
| 21 | Incremental patch < 10ms for 100 nodes | Perf benchmark vs 63ms full rebuild |
| 22 | Published packages install in clean clone | `bun run graph:setup` from fresh checkout |
| 23 | Minimap orientation matches across renderers | SpaceGraph + Cytoscape minimap same orientation |

---

## 8. Dependency Graph

```
Slice 1 (writes labels) ──┐
Slice 2 (cleanup) ────────┤
Slice 3 (undo/micro) ─────┘ (depends on Slice 2)
Slice 4 (mobile) ─────────┐
Slice 5 (renderer/perf) ──┤ → independent, can parallelize
Slice 6 (visual polish) ──┤
Slice 7 (onboarding) ─────┘
Slice 8 (interactive export) ── independent

Slice 9 (incremental patch) ──┐
Slice 10 (force/bundling) ────┤ → library, can parallelize
Slice 11 (hardening/publish) ─┘ (depends on 9, 10)
```

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| `diffByTurn` not available in session builder | Pass through `buildGraph` input; already in `BuildGraphInput` |
| Undo stack memory growth | Cap at 50 entries; drop oldest |
| Card action clutter | One icon, hover-only, 16px |
| Mobile touch conflicts with browser gestures | Use `touch-action: none` on canvas; test on iOS/Android |
| Renderer switch loses camera state | Serialize camera before switch; restore after mount |
| Fit excluding empty columns breaks long sessions | Only exclude columns with zero content nodes |
| Depth fade on DOM cards hurts readability | Clamp minimum opacity at 0.3; respect reduced-motion |
| Incremental patch diverges from full rebuild | Round-trip test: patch → apply → equals full rebuild |
| Force layout non-determinism | Fixed seed; Barnes-Hut theta configurable |
| Contract v4 breaks consumers | `test:publish` against second host; semver minor for additive |
| Edge bundling hurts readability on sparse graphs | Enable only when edge density > threshold |