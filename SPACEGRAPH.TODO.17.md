# SPACEGRAPH.TODO.17 — Writes Payload Labels, Usability Polish & Library Hardening

**Status:** Draft. Builds on TODO.16 (core A/B/C complete, T2.2 gate removed for single-user focus).

---

## 1. Scope

### Active work

| Item | Source | Use case served |
|------|--------|-----------------|
| **Writes payload labels** | TODO.16 deferred | Debug wires: see what changed without opening inspector |
| **Consumerless exports cleanup** | TODO.16 delete list | Code health: remove footguns |
| **Self-navigating action fix** | TODO.16 delete list | Fix bug: actions navigate to self |
| **Arrangement undo/redo (V115)** | Vault | Spatial memory: recover from bad drags |
| **Card micro-actions (V116)** | Vault | Quick actions: copy path without opening inspector |
| **Mobile graph mode** | SPACEGRAPH.md §8.7 | On-the-go: review session on phone/tablet |
| **Renderer selector + perf harness** | §8.10, §8.11 | User choice + measured budget |
| **Visual polish (fit, gutter, depth, labels, selection)** | §8.2, 8.3, 8.13, 8.15, 8.16 | Spatial orientation, readability |
| **Session outline / phase jump** | New | Long sessions: jump to "verify" phase, "edit" phase |
| **Failure digest** | V112 unvaulted (simplified) | Debugging: one gesture shows all failures |
| **Subagent contribution summary** | New | Delegation: what did each subagent actually do |
| **Progress indicator** | New | Monitoring: X/Y turns, files touched, tests run |
| **Hot-file ranking** | New (extends `fileRelations`) | Code review: which files dominate the session |
| **Turn stats comparison** | New (extends `reviewChanges`) | Audit: compare two turns' activity side-by-side |
| **Search kind/status filters** | New (extends `rankedSearch`) | Investigation: narrow search to errors, tools |
| **Inspector: pretty tool input/output** | New | Debugging: readable JSON, truncated output expansion |
| **Legend: node kind counts** | New (extends `GraphLegendBody`) | Orientation: what am I looking at |
| **Library: Walk API** | TODO.16 P1 (never done) | Declarative traversal for second host |
| **Library: Default scorer** | TODO.16 P1 | `searchBy` works without host-provided `scoreFn` |
| **Library: Incremental RenderModelPatch** | SPACEGRAPH.md §12 D3 | Streaming performance |
| **Library: Force layout Barnes-Hut** | §8.19 | Large graph performance |
| **Library: Edge bundling** | Vault V105 | Dense graph readability |
| **Library: Graph metrics** | New | Centrality, density, clustering for budget/UI |
| **Library: Time-range filter** | New | Long sessions: show only last hour |
| **Library: Edge weight by confidence** | New | Visual encoding: explicit > structural > inferred |
| **Library: Minimap mirror fix** | §8.9 | Consistency across renderers |
| **Library: Publish + contract v4** | §9.1 | Upstream readiness |

### Deferred (architectural consequences or UX unknown)

| Item | Reason |
|------|--------|
| Annotation persistence (V113) | Needs app line-comment store owner |
| Graph state persistence | Needs session storage abstraction |
| Graph onboarding & keyboard reference (was #7) | UX copy review needed; localStorage in library is wrong layer |
| Export: standalone HTML with interactivity (was #8) | Needs bundling strategy; static export adequate for now |
| Auto-trace "what's new since I left" (V112) | Full version needs last-visited owner; simplified failure digest ships |
| Cross-session graphs (D4) | Needs single-session evidence first |
| Community detection (V103) | No consumer; fights deterministic layout |
| Executable flow edges (V117) | Separate product |
| Multi-user presence (V119) | Collaboration owner needed |

---

## 2. Use-Case Analysis (what drives each slice)

| Use case | Current state | Gap | Slice |
|----------|---------------|-----|-------|
| **Debugging a failure** | `why` trace, evidence edges, failure ticks | No one-gesture "show me all failures" | 7 (failure digest) |
| **Reviewing what agent did** | Files rail, provenance, notes | No summary of subagent contributions | 8 (subagent summary) |
| **Monitoring live session** | Running/pending statuses | No progress indicator (X/Y turns) | 9 (progress) |
| **Understanding session arc** | Overview level, phases | No jump-to-phase, no legend counts | 6 (session outline), 12 (legend counts) |
| **Finding specific activity** | Search, ranked results | Can't filter by kind/status in search | 11 (search filters) |
| **Reading tool calls** | Inspector shows raw JSON | No pretty-printing, no expand/collapse | 13 (inspector) |
| **Long codebase sessions** | Workspace stages, file hub weights | No "hottest file" ranking | 10 (hot-file) |
| **Comparing approaches** | Two-turn compare (B1) | No per-turn stats table | 14 (turn stats) |
| **Streaming performance** | Full rebuild per update | 63ms per update at 300 nodes | L1 (patch) |
| **Dense graph readability** | Straight edges | No bundling, cluttered crossings | L2 (bundling) |
| **Second host / platform** | `searchBy` requires host scorer | No default scorer, no walk API | L3 (walk + scorer) |

---

## 3. Work Plan

### Host track (7 slices, ~6 days)

#### Slice 1 — Writes payload labels (1.5 days)

**Data flow:** `diffByTurn` → `writes` edge `data` → card/peek badge

1. `session-builder.ts`: Attach `{ additions, deletions }` from `FileDiffInfo` to `writes` edges
2. `model.ts`: Extend `GraphEdge.data` with optional diff stats
3. `cardTemplate.ts`: `+n −m` badge on file cards
4. `GraphPeek.tsx`: Diff stats in edge peek

---

#### Slice 2 — Cleanup & bug fixes (0.5 days)

| Task | File |
|------|------|
| Remove `shortestPath`/`forwardChain` from public export | `session-ui/graph/index.ts` |
| Fix `file.history`/`symbol.showCallers` self-nav | `session-ui/graph/actions.ts` |

---

#### Slice 3 — Arrangement undo/redo + card micro-actions (1.5 days)

**V115 — Undo/redo:** `manualHistory`/`manualFuture` stacks; `z`/`Z` keys; toolbar buttons.
**V116 — Micro-actions:** Hover-only copy icon on cards; `navigator.clipboard`.

---

#### Slice 4 — Mobile graph mode (1 day)

Map-only fallback < 768px; overflow menu; bottom-sheet inspector; touch gestures.

---

#### Slice 5 — Renderer selector + perf harness (1 day)

Renderer dropdown in "Draw" menu; `preferredRenderer` prop; FPS overlay (`graph:perf`); CI gate.

---

#### Slice 6 — Visual polish (1.5 days)

| Fix | Location |
|-----|----------|
| Fit excludes empty columns | `graph-camera.ts` |
| Lane gutter screen-fixed | `GraphCanvas.tsx` |
| Depth fade on DOM cards | `cardTemplate.ts` |
| Edge label full collision avoidance | `spacegraph-renderer` |
| Mesh selection silhouette | `spacegraph-renderer` |

---

#### Slice 7 — Failure digest (0.5 days)

**Use case:** "Show me what went wrong" — one gesture lists every error/retry in session order.

1. `session-ui/graph/selectors.ts`: Add `failures(model)` → `Array<{ nodeID, kind: "error"|"retry", turnID, label }>`
2. `session-graph/ui/GraphToolbar.tsx`: Add "What failed?" to Questions menu → opens window listing failures
3. Click failure → select node, run `why` trace, frame camera
4. `data-slot="graph-failure-list"` for tests

**Test:** Unit: `failures()` returns errors+retries in turn order; E2E: click "What failed?" → see list → click first → trace runs

---

#### Slice 8 — Subagent contribution summary (0.5 days)

**Use case:** "What did each subagent contribute?" — one gesture shows per-subagent stats.

1. `session-ui/graph/selectors.ts`: Add `subagentContributions(model)` → `Map<subagentID, { nodes: number, edges: number, filesTouched: number, toolsRun: number }>`
2. `session-graph/ui/GraphInspector.tsx`: When inspecting a `subagent` node, show contribution stats in detail body
3. `data-slot="graph-subagent-contrib"` for tests

**Test:** Unit: `subagentContributions` counts correct on fixture; Component: inspector shows stats for subagent node

---

#### Slice 9 — Progress indicator (0.5 days)

**Use case:** "Where am I?" — persistent header shows session progress.

1. `session-ui/graph/selectors.ts`: Add `sessionProgress(model)` → `{ turns: number, filesTouched: number, toolsRun: number, errors: number }`
2. `session-graph/ui/GraphStatusBar.tsx`: Show "Turn 12 · 34 files · 87 tools · 3 errors" in status bar (already shows selection info)
3. `data-slot="graph-progress"` for tests

**Test:** Unit: `sessionProgress` counts correct; Component: status bar shows stats

---

#### Slice 10 — Hot-file ranking (0.5 days)

**Use case:** "Which files dominate this session?" — sort by reads+writes.

1. `session-ui/graph/selectors.ts`: Extend `fileRelations` to include `totalActivity` (reads + writes)
2. `session-graph/ui/GraphFileRail.tsx`: Sort rail by activity (descending), show count badge
3. `data-slot="graph-file-activity"` for tests

**Test:** Unit: `fileRelations.totalActivity` correct; Component: rail sorts by activity

---

#### Slice 11 — Search kind/status filters (0.5 days)

**Use case:** "Find all errors" or "Find file nodes" — filter search results by kind.

1. `session-graph/ui/GraphSearch.tsx`: Add kind filter chips (toggleable) below search input
2. `session-ui/graph/selectors.ts`: `rankedSearch` already accepts query; extend to accept `kinds?: Set<NodeKind>`
3. `data-slot="graph-search-filter"` for tests

**Test:** Unit: `rankedSearch` filters by kind; E2E: search "auth" + filter "file" → only file results

---

#### Slice 12 — Session outline / phase jump (1 day)

**Use case:** "Jump to the verify phase" — navigate session structure, not just chronology.

1. `session-ui/graph/selectors.ts`: Add `sessionOutline(model)` → `Array<{ turnID, phases: Array<{ id, category, label }> }>`
2. `session-graph/ui/GraphToolbar.tsx`: Add "Outline" button → opens window listing turns with their phases
3. Click phase → select phase node, frame camera
4. `data-slot="graph-session-outline"` for tests

**Test:** Unit: `sessionOutline` returns correct structure; E2E: open outline → click "verify" phase → camera frames it

---

#### Slice 13 — Inspector: pretty tool I/O + legend counts (1 day)

**Use case:** Reading raw JSON in inspector is painful; legend shows what's on screen.

**Inspector:**
1. `session-graph/ui/GraphDetail.tsx`: Pretty-print tool input (JSON syntax highlight), expand/collapse long output
2. `data-slot="graph-tool-io"` for tests

**Legend:**
3. `session-graph/ui/GraphLegend.tsx`: Add node kind counts beside edge kind counts
4. `data-slot="graph-legend-kind-count"` for tests

**Test:** Component: inspector renders JSON pretty; legend shows kind counts

---

#### Slice 14 — Turn stats comparison (1 day)

**Use case:** "Compare turn 3 vs turn 7" — side-by-side activity stats.

1. `session-ui/graph/review.ts`: Extend `reviewChanges` to include per-turn stats (`filesTouched`, `toolsRun`, `errors`, `duration`)
2. `session-graph/ui/GraphCompare.tsx`: Show stats table in compare window beside node diff
3. `data-slot="graph-compare-stats"` for tests

**Test:** Unit: `reviewChanges` includes stats; Component: compare window shows stats table

---

### Library track (`spacegraphjs/`, 4 slices, ~5.5 days)

#### Slice L1 — Incremental RenderModelPatch (2 days)

**Problem:** SPACEGRAPH.md §12 D3 — streaming updates rebuild full model (63ms at 300 nodes).

**Changes:**
1. `@spacegraphjs/adapter`: `diffRenderModels(old, new) → RenderModelPatch`
2. `@spacegraphjs/renderer`: Add `applyPatch(patch)` to `GraphRenderer` contract
3. `spacegraph-renderer` + `cytoscape-renderer`: Implement partial updates
4. `GraphView.tsx`: Compute patch on streaming update → `applyPatch()`
5. Target: 100-node incremental < 10ms

---

#### Slice L2 — Force layout Barnes-Hut + edge bundling (1.5 days)

**Problem:** §8.19 — force layout 9.3s at 20k nodes; V105 — edges clutter in dense graphs.

**Changes:**
1. `spacegraphjs/layout`: Barnes-Hut quadtree (O(n log n)); early exit on convergence
2. `spacegraphjs/layout`: Hierarchical edge bundling option
3. `spacegraph-renderer`: Bezier edge routing at bundle junctions
4. Target: 20k nodes < 2s; bundled edges reduce crossings

---

#### Slice L3 — Walk API + default scorer + metrics (1.5 days)

**Problem:** TODO.16 P1 never done — `searchBy` requires host scorer; no declarative traversal; no metrics.

**Changes:**
1. `spacegraphjs/kernel/src/walks.ts`: `walk(kernel, { starts, steps, maxDepth })` → `{ nodes, edges }`; `pathsBetween(from, to)`
2. `spacegraphjs/src/navigation/search.ts`: Default scorer (label-prefix > name > path > body; model-order tie-break)
3. `spacegraphjs/kernel/src/metrics.ts`: `degreeCentrality`, `graphDensity`, `clusteringCoefficient`
4. OpenCode host: `rankedSearch` uses default scorer when no host scorer provided
5. Second host: exercises walk API against contract fixture

---

#### Slice L4 — Edge confidence visualization + time filter + publish (0.5 days)

| Task | Location |
|------|----------|
| Edge thickness/opacity by confidence (explicit > structural > inferred) | `spacegraph-renderer`, `cytoscape-renderer` |
| Time-range filter (`filterByTime(model, from, to)`) | `spacegraphjs/kernel` |
| Minimap mirror fix (Cytoscape) | `cytoscape-renderer` |
| Contract v4 bump + `test:publish` + API docs | All library packages |

---

## 4. Technical Details

### 4.1 Writes edge data

```typescript
// session-builder.ts
const diffInfo = diffByTurn?.get(turnID)?.find(d => d.file === path)
this.addEdge({
  kind: "writes", source: toolID, target: fileID, confidence: "explicit",
  data: diffInfo ? { additions: diffInfo.additions, deletions: diffInfo.deletions } : undefined,
})
```

### 4.2 Failure digest selector

```typescript
// selectors.ts
export function failures(model: GraphViewData): Array<{ nodeID, kind, turnID, label }> {
  return model.nodes
    .filter(n => n.kind === "error" || n.kind === "retry")
    .map(n => ({ nodeID: n.id, kind: n.kind, turnID: n.turnID, label: n.label }))
}
```

### 4.3 Subagent contributions

```typescript
// selectors.ts
export function subagentContributions(model: GraphViewData): Map<string, Contribution> {
  // For each subagent node: count descendants via part-of, files via writes/reads, tools
}
```

### 4.4 Incremental RenderModelPatch

```typescript
// @spacegraphjs/adapter
export type RenderModelPatch = {
  nodes: { added: RenderNode[]; removed: string[]; changed: RenderNode[] }
  edges: { added: RenderEdge[]; removed: string[]; changed: RenderEdge[] }
}
export function diffRenderModels(old: RenderModel, next: RenderModel): RenderModelPatch
```

### 4.5 Walk API

```typescript
// spacegraphjs/kernel/src/walks.ts
export function walk(kernel: Kernel, spec: {
  starts: string[]; steps: EdgeKind[]; maxDepth?: number
}): { nodes: string[]; edges: string[] }
export function pathsBetween(kernel: Kernel, from: string, to: string): string[][]
```

---

## 5. Test Strategy

| Layer | Coverage |
|-------|----------|
| Unit | `failures()`, `subagentContributions()`, `sessionProgress()`, `fileRelations.totalActivity`, `sessionOutline()`, `reviewChanges` stats, `diffRenderModels` round-trip, walk API laws, default scorer law, metrics correctness |
| Component | Card `+n −m` badge; failure digest window; subagent inspector; progress bar; file rail sorting; search filters; outline window; inspector pretty I/O; legend counts; compare stats |
| E2E | 12 rows: writes labels, undo/redo, mobile, renderer switch, perf budget, fit/gutter/depth/labels/silhouette, failure digest, search filters, outline jump, turn stats compare |
| Library vitest | Walk determinism, scorer law, union conservation, patch round-trip, Barnes-Hut convergence, bundling stability |
| Perf bench | Incremental < 10ms; force 20k < 2s; pan ≥ 55 FPS |

---

## 6. Invariant Checklist

- [ ] Positions never move due to writes labels, failure digest, or outline (overlays only)
- [ ] Undo/redo only affects manual positions
- [ ] No new mode vocabulary
- [ ] Single scope pipeline unchanged
- [ ] New selectors are pure and fixture-tested
- [ ] Walk API is deterministic (same input → same output)
- [ ] Default scorer never contradicts host scorer when both provided
- [ ] Incremental patch ≡ full rebuild (round-trip law)
- [ ] Edge confidence encoding matches legend/peek documentation
- [ ] Published packages install in clean clone

---

## 7. Out of Scope (vaulted or deferred)

| Item | Reason |
|------|--------|
| Annotation persistence (V113) | App line-comment store owner needed |
| Graph state persistence | Session storage abstraction needed |
| Onboarding & keyboard reference | UX copy review; wrong layer for localStorage |
| Interactive HTML export | Bundling strategy; static adequate |
| "What's new since I left" (V112 full) | Last-visited owner; simplified failure digest ships |
| Cross-session graphs (D4) | Single-session evidence first |
| Community detection (V103) | No consumer; fights layout |
| Executable flow edges (V117) | Separate product |
| Multi-user presence (V119) | Collaboration owner |
| Kernel union (P2) | Second host not demanding yet |

---

## 8. Acceptance Criteria

| Row | Scenario | Assertion |
|-----|----------|-----------|
| 12 | File card shows `+3 −1` | `data-slot="card-badge"` contains `+3 −1` |
| 13 | Undo restores dragged position | Position matches pre-drag after `z` |
| 14 | Mobile viewport works | 390px: map-only, touch pan/zoom, drawer inspector |
| 15 | Renderer selector switches | `data-graph-renderer` changes; capabilities update |
| 16 | Fit excludes empty columns | Camera bounds match content extent |
| 17 | Depth fade on DOM cards | `data-depth="layered"` → opacity varies with Z |
| 18 | Failure digest lists errors | "What failed?" → `graph-failure-list` shows all errors/retries |
| 19 | Search filters by kind | Search "auth" + "file" filter → only file nodes |
| 20 | Outline jumps to phase | Click "verify" in outline → camera frames phase node |
| 21 | Subagent shows contributions | Inspector on subagent → `graph-subagent-contrib` stats |
| 22 | Turn compare shows stats | Compare window → `graph-compare-stats` table |
| 23 | Progress shows in status bar | `graph-progress` shows "Turn N · X files · Y tools" |
| 24 | Walk API works on fixture | Second host demo traverses fixture deterministically |
| 25 | Incremental patch < 10ms | Perf benchmark passes |
| 26 | Force layout 20k < 2s | `graph:scale` passes |
| 27 | Packages publish clean | `test:publish` + second host mounts |

---

## 9. Dependency Graph

```
HOST TRACK (can parallelize within):
Slice 1 (writes) ────┐
Slice 2 (cleanup) ────┤
Slice 3 (undo/micro) ┘ (depends on 2)
Slice 4 (mobile) ─────┐
Slice 5 (renderer) ──┤
Slice 6 (visual) ────┤
Slice 7 (digest) ────┤
Slice 8 (subagent) ──┤ all independent
Slice 9 (progress) ──┤
Slice 10 (hot-file) ──┤
Slice 11 (search) ───┤
Slice 12 (outline) ──┤
Slice 13 (inspector) ┤
Slice 14 (turn stats)┘

LIBRARY TRACK:
Slice L1 (patch) ─────┐
Slice L2 (force/bundle)┤ independent
Slice L3 (walk/score)─┤
Slice L4 (publish) ───┘ (depends on L1-L3)
```

---

## 10. Risks

| Risk | Mitigation |
|------|------------|
| `diffByTurn` unavailable in builder | Already in `BuildGraphInput` |
| Undo stack memory | Cap 50; drop oldest |
| Mobile touch conflicts | `touch-action: none`; test iOS/Android |
| Renderer switch loses camera | Serialize before, restore after |
| Fit excludes wrong columns | Only exclude zero-content columns |
| Depth fade hurts readability | Min opacity 0.3; reduced-motion |
| Patch diverges from rebuild | Round-trip law test |
| Force layout non-deterministic | Fixed seed; configurable theta |
| Default scorer conflicts with host | Host scorer wins when provided |
| Contract v4 breaks consumers | Semver minor; `test:publish` gates |
| Edge bundling clutter on sparse | Enable only when density > threshold |
| Walk API over-generalizes | Only add what second host consumes |
