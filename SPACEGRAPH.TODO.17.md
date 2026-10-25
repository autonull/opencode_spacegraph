# SPACEGRAPH.TODO.17 — Writes Payload Labels, Annotation Persistence, and Major Usability Polish

**Status:** Draft. Builds on TODO.16 (core A/B/C complete, T2.2 gate removed for single-user focus).

---

## 1. Scope

| Item | Source | Impact |
|------|--------|--------|
| **Writes payload labels** | TODO.16 deferred | `+n −m` on `writes` edges in card/peek |
| **Annotation persistence (V113)** | TODO.16 deferred | Notes survive reload via app line-comment store |
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
| **Graph state persistence** | SPACEGRAPH.md §1.3 | Remember layout/level/selection per session |
| **First paint / pan frame rate** | SPACEGRAPH.md §8.10 | Performance measurement + budget |

---

## 2. Work Plan (8 slices, ~9 days)

### Slice 1 — Writes payload labels (1.5 days)

**Data flow:** Session message metadata → `diffByTurn` → `writes` edge `data` field → card/peek render

**Changes:**
1. `session-builder.ts`: When creating `writes` edges, look up `FileDiffInfo` from `diffByTurn` for that turn + file, attach `{ additions, deletions }` to edge `data`
2. `model.ts`: Extend `GraphEdge` with optional `data?: { additions?: number; deletions?: number }` (or reuse existing `data` field)
3. `cardTemplate.ts`: Render `+n −m` badge on file cards when `writes` edge has diff data
4. `GraphPeek.tsx`: Show diff stats in edge peek for `writes` edges
5. `GraphLegend.tsx`: Already lists edge kinds with counts — no change needed

**Test:** Unit test `fileRelations` includes diff stats; component test card shows `+3 −1`

---

### Slice 2 — Annotation persistence (1.5 days)

**Data flow:** `useNotes` store → app line-comment store (session-scoped) → hydrate on session load

**Changes:**
1. Add `onNotesChange?: (notes: Annotations) => void` to `GraphViewProps`
2. `useNotes.ts`: Accept optional `onPersist` callback; call on every mutation (add/edit/delete)
3. App side: Wire `GraphView.onNotesChange` → session's line-comment store (same key space as file comments: `note:<id>`)
4. Hydration: On session load, read notes from line-comment store → pass as initial `annotations` prop to `GraphView` → `useNotes` initializes from it

**Key decision:** Notes are session-local in TODO.16; persistence makes them survive reload. The line-comment store already uses `file:path:line:comment` keys — extend to `note:<noteId>`.

**Test:** E2E: add note → reload session → note persists with correct target/turn scoping

---

### Slice 3 — Cleanup & bug fixes (0.5 days)

| Task | File | Change |
|------|------|--------|
| Remove `shortestPath`/`forwardChain` from public export | `session-ui/src/graph/index.ts` | Delete lines 105, 106 |
| Fix `file.history`/`symbol.showCallers` self-nav | `session-ui/src/graph/actions.ts` | Dispatch `graph:command` with `why`/`led-here` trace |
| Remove dead `custom` lens option (if any) | `GraphToolbar.tsx` | Already deleted per TODO.16 |

---

### Slice 4 — Arrangement undo/redo + card micro-actions (1.5 days)

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

### Slice 5 — Mobile graph mode (1 day)

**Problem:** SPACEGRAPH.md §8.7 — "Mobile graph mode desktop-gated for v1; mobile reaches graph only via `graph.toggle` command. The hybrid needs room for two surfaces, so a narrow screen falls back to the map alone."

**Changes:**
1. `GraphView.tsx`: Detect viewport < 768px → use map-only fallback (already exists per TODO.16 §10)
2. `GraphToolbar.tsx`: Collapse secondary controls into overflow menu (already exists per RF.7)
3. `GraphInspector.tsx`: Bottom sheet on narrow (already exists per U3.8/RF.8)
4. Add mobile-specific tests: touch pan/zoom, drawer inspector, narrow layout
5. Verify `mod+alt+t` turn-map overlay works on mobile (focus-trapped dialog)

**Test:** Component test at 390×844 viewport; all gestures work via touch

---

### Slice 6 — Renderer selector + performance measurement (1 day)

**Problem:** SPACEGRAPH.md §8.10, §8.11 — "Renderer selector not in app toolbar; choice is prototype setting" + "First paint / pan frame rate unmeasured — no graph perf harness"

**Changes:**
1. `GraphToolbar.tsx`: Add renderer dropdown in "Draw" menu (uses `capabilities` from renderer registry)
2. `GraphView.tsx`: Expose `preferredRenderer` prop; persist in session settings
3. Add `graph:perf` command (or dev-only overlay) showing FPS, frame time, node count
4. `packages/session-graph/script/perf-bench.ts`: Automated FPS measurement during pan/zoom
5. CI gate: fail if 60-turn pan drops below 55 FPS on reference hardware

**Test:** E2E row: switch renderer → verify capabilities update; perf benchmark passes

---

### Slice 7 — Visual polish: fit, gutter, depth fade, edge labels, selection (1.5 days)

| Issue (SPACEGRAPH.md §8) | Fix |
|--------------------------|-----|
| #8.15 Empty-column exclusion in fit | `fitOptions`: filter nodes with `x > minContentX` before fitting |
| #8.13 Lane gutter world-space → screen-fixed | `GraphCanvas`: render gutter as overlay at `x=0` screen space, not world space |
| #8.16 Depth fade for DOM cards | `cardTemplate.ts`: apply `opacity: var(--depth-fade)` based on Z when depth ≠ flat |
| #8.3 Edge label collision avoidance | `spacegraph-renderer`: extend label avoidance to all geometry (edges, bands, cards) |
| #8.2 Mesh selection silhouette | `spacegraph-renderer`: replace `BoxHelper` with `MeshOutlineMaterial` or custom shader |

---

### Slice 8 — Graph state persistence per session (1 day)

**Problem:** SPACEGRAPH.md §1.3 — "Stable spatial layout + manual arrangement that survives rebuilds" but layout/level/selection not persisted across reloads.

**Changes:**
1. `GraphViewProps`: Add `persistedState?: { layout: Layout; level: ZoomLevel; selection: string; depth: DepthMode }`
2. On mount: apply persisted state before first render
3. On change: debounced write to session storage (key: `graph:state:<sessionId>`)
4. Include manual positions in persisted state (already in `manual.positions`)
5. Restore: raise level if needed, then frame selection

**Test:** E2E: set layout=tree, level=detail, select node → reload → state restored

---

## 3. Technical Details

### 2.1 Writes edge data attachment

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

### 2.2 Card template badge

```typescript
// cardTemplate.ts - in kindContent for "file"
const writesEdges = incoming(model, node.id).filter(e => e.kind === "writes")
const diff = writesEdges.find(e => e.data?.additions || e.data?.deletions)
if (diff) return `+${diff.data.additions ?? 0} −${diff.data.deletions ?? 0}`
```

### 2.3 Annotation persistence key scheme

```
Line-comment store key:  "note:<noteId>"
Value: { id, target, body, createdAt, turnId }  // matches Annotations type
```

---

## 4. Test Strategy

| Layer | Coverage |
|-------|----------|
| Unit | `fileRelations` includes diff stats; `withAnnotations` hydrates from store; fit excludes empty columns; depth fade applied; edge labels avoid geometry |
| Component | Card shows `+n −m`; note composer save → persists; undo/redo restores position; mobile viewport renders map-only; renderer selector switches backends; state persists reload |
| E2E | 9 new rows: writes labels, notes persist reload, undo/redo, mobile gestures, renderer switch, perf budget, fit excludes empty, depth fade cards, state persistence |

---

## 5. Invariant Checklist

- [ ] Positions never move due to writes labels (overlay only)
- [ ] Notes persist without re-layout
- [ ] Undo/redo only affects manual positions, not derived layout
- [ ] No new mode vocabulary
- [ ] Single scope pipeline unchanged
- [ ] Mobile gestures don't conflict with browser chrome
- [ ] Renderer switch preserves selection and camera
- [ ] Fit never frames empty space
- [ ] Depth fade consistent between canvas and DOM
- [ ] State persistence doesn't leak across sessions

---

## 6. Out of Scope (remain vaulted)

| Item | Reason |
|------|--------|
| Compare-as-window | Claims delivered; verify in Slice 3 |
| Group header fold/menu | Claims delivered; verify in Slice 3 |
| Community grouping (V103) | No consumer |
| Executable flow edges (V117) | Separate product |
| Multi-user presence (V119) | Needs collaboration owner |
| Cross-session graphs (D4) | Needs single-session evidence first |
| Incremental RenderModelPatch (D3) | Premature optimization |
| Real 3D geometry (D5) | Protocol prefers layered/depth-stack |

---

## 7. Acceptance Criteria (per TODO.16 §7)

| Row | Scenario | Assertion |
|-----|----------|-----------|
| 12 | File card shows `+3 −1` on `writes` edge | `data-slot="card-badge"` contains `+3 −1` |
| 13 | Note persists after session reload | Note visible with same target/body after reload |
| 14 | Undo restores dragged card position | Position matches pre-drag after `z` key |
| 15 | Mobile viewport shows map-only fallback | `data-slot="graph-view"` at 390px width has no inspector panel |
| 16 | Renderer selector switches backend | `data-graph-renderer` changes; capabilities update |
| 17 | Fit excludes empty columns | Camera bounds match content, not session root at x=0 |
| 18 | Depth fade on DOM cards | `data-depth="layered"` → card opacity varies with Z |
| 19 | State persists across reload | layout/level/selection restored after F5 |

---

## 8. Dependency Graph

```
Slice 1 (writes labels) ──┐
Slice 2 (note persist) ───┤
Slice 3 (cleanup) ────────┤ → independent, can parallelize
Slice 4 (undo/micro) ─────┘ (depends on Slice 3)
Slice 5 (mobile) ─────────┐
Slice 6 (renderer/perf) ──┤ → independent, can parallelize
Slice 7 (visual polish) ──┤
Slice 8 (state persist) ──┘ (depends on Slice 4 for manual positions)
```

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| `diffByTurn` not available in session builder | Pass through `buildGraph` input; already in `BuildGraphInput` |
| Line-comment store key collision | Prefix with `note:`; distinct from `file:` |
| Undo stack memory growth | Cap at 50 entries; drop oldest |
| Card action clutter | One icon, hover-only, 16px |
| Mobile touch conflicts with browser gestures | Use `touch-action: none` on canvas; test on iOS/Android |
| Renderer switch loses camera state | Serialize camera before switch; restore after mount |
| Fit excluding empty columns breaks long sessions | Only exclude columns with zero content nodes |
| Depth fade on DOM cards hurts readability | Clamp minimum opacity at 0.3; respect reduced-motion |
| State persistence leaks across sessions | Key includes sessionId; clear on session change |