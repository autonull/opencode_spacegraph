# SPACEGRAPH.TODO.17 — Writes Payload Labels, Usability Polish & Library Hardening

**Status:** Draft. Builds on TODO.16 (core A/B/C complete, T2.2 gate removed for single-user focus).

---

## 1. Scope

### Active work (consolidated)

| Item | Source | Use case | Slice |
|------|--------|----------|-------|
| **Writes payload labels** | TODO.16 deferred | Debug wires: `+n −m` on edges | 1 |
| **Consumerless exports cleanup** | TODO.16 delete list | Code health | 2 |
| **Self-navigating action fix** | TODO.16 delete list | Fix bug: actions navigate to self | 2 |
| **Arrangement undo/redo (V115)** | Vault | Spatial memory: recover from bad drags | 3 |
| **Card micro-actions (V116)** | Vault | Quick actions: copy path without inspector | 3 |
| **Mobile graph mode** | SPACEGRAPH.md §8.7 | On-the-go: review on phone/tablet | 4 |
| **Visual polish (fit, gutter, depth, labels, selection)** | §8.2, 8.3, 8.13, 8.15, 8.16 | Spatial orientation, readability | 5 |
| **Failure digest + progress** | V112 simplified | Debugging: one gesture shows failures + progress | 6 |
| **Unified Find panel** | New | Search + filters + outline in one panel | 7 |
| **Inspector polish** | New | Pretty I/O, subagent summary, hot-file ranking | 8 |
| **Compare stats** | New | Turn stats in compare window | 9 |
| **Quality Gate (a11y + motion + RTL + shortcuts + perf)** | — | All new windows hardened at once | 10 |
| **Incremental RenderModelPatch** | SPACEGRAPH.md §12 D3 | Streaming performance | L1 |
| **Barnes-Hut force + edge bundling** | §8.19, Vault V105 | Large graph performance, dense readability | L2 |
| **Walk API + default scorer** | TODO.16 P1 | Declarative traversal, search without host scorer | L3 |
| **Publish v4 + confidence encoding + minimap fix** | §9.1, §8.9 | Upstream readiness, visual encoding | L4 |

### Deferred (architectural consequences or UX unknown)

| Item | Reason |
|------|--------|
| Annotation persistence (V113) | Needs app line-comment store owner |
| Graph state persistence | Needs session storage abstraction |
| Graph onboarding & keyboard reference | UX copy review needed; localStorage in library is wrong layer |
| Export: standalone HTML with interactivity | Needs bundling strategy; static export adequate for now |
| Auto-trace "what's new since I left" (V112 full) | Last-visited owner; simplified failure digest ships |
| Cross-session graphs (D4) | Needs single-session evidence first |
| Community detection (V103) | No consumer; fights deterministic layout |
| Executable flow edges (V117) | Separate product |
| Multi-user presence (V119) | Collaboration owner needed |
| Legend node kind counts | Redundant with facets + outline |
| Turn stats comparison table | Compare diff is primary; stats secondary |
| Graph metrics (centrality, density) | No consumer; degree budget covers it |
| Time-range filter | 60-turn window is the filter |
| Investigation report export | Post-TODO.17 |
| Annotations v2, Bookmarks, AI analysis, etc. | See future opportunities below |

---

## 2. Future Opportunities (post-TODO.17, ~23 days)

| Priority | Item | Why it matters | Trigger |
|----------|------|----------------|---------|
| 1 | **Investigation report export** | Share findings as PDF/Markdown with traces, failures, subagent summaries | Team debugging, post-mortems |
| 2 | **Provenance chain as trace kind** | "Show full chain: prompt → tool → file → test → error" as navigable path | Deeper debugging |
| 3 | **Session health scorecard** | Single metric: "3 errors, 2 retries, 45 min, 12 files, 87 tools" | Quick triage |
| 4 | **Bulk operations** | "Collapse all phases", "expand all subagents", "select all files" | Long session management |
| 5 | **Bookmarks / pinned nodes** | Pin important nodes across reloads | Recurring investigation |
| 6 | **Annotations v2** | Threaded comments, reactions, resolution status | Code review workflow |
| 7 | **AI-assisted analysis** | "Summarize this session", "What patterns do you see?" | Cognitive load reduction |
| 8 | **Time-travel replay** | Scrub through session with full state at each turn | Debugging intermittent failures |
| 9 | **Codebase overlay** | Show graph over actual filesystem (file tree + graph sync) | Navigation context |
| 10 | **Cross-session learning** | "This error happened before in session X" | Pattern detection |
| 11 | **Plugin/extension API** | Third-party graph extensions (custom layouts, analyzers) | Ecosystem |
| 12 | **Settings/preferences panel** | Graph-specific: default layout, level, renderer, density | Personalization |
| 13 | **Full keyboard navigation** | Traverse entire graph without mouse | Accessibility, power users |
| 14 | **Command palette integration** | All graph actions discoverable via `mod+shift+p` | Discoverability |
| 15 | **Performance profiling UI** | Built-in profiler (FPS, render time, node count, memory) | Perf debugging |
| 16 | **Analytics/telemetry (opt-in)** | Which features used, where users struggle | Product decisions |

---

## 3. Work Plan

### Host track (10 slices, ~6.5 days)

#### Slice 1 — Writes payload labels (1.5 days) ✅ COMPLETE

**Data flow:** `diffByTurn` → `writes` edge `data` → card/peek badge

1. ✅ `session-builder.ts`: Attach `{ additions, deletions }` from `FileDiffInfo` to `writes` edges
2. ✅ `model.ts`: Extend `GraphEdge.data` with optional diff stats
3. ✅ `cardTemplate.ts` + `card-copy.ts` + `GraphView.tsx`: `+n −m` badge on file cards (via `related` function)
4. ✅ `GraphPeek.tsx`: Diff stats in edge peek

---

#### Slice 2 — Cleanup & bug fixes (0.5 days) ✅ COMPLETE

| Task | File |
|------|------|
| Remove `shortestPath`/`forwardChain` from public export | `session-ui/graph/index.ts` | ✅
| Fix `file.history`/`symbol.showCallers` self-nav | `session-ui/graph/actions.ts` | ✅

---

#### Slice 3 — Arrangement undo/redo + card micro-actions (1.5 days) ✅ COMPLETE

**V115 — Undo/redo:** `manualHistory`/`manualFuture` stacks; `z`/`Z` keys; toolbar buttons. ✅
**V116 — Micro-actions:** Hover-only copy icon on cards; `navigator.clipboard`. ✅

---

#### Slice 4 — Mobile graph mode (1 day) ✅ COMPLETE

Map-only fallback < 768px; overflow menu; bottom-sheet inspector; touch gestures. ✅

---

#### Slice 5 — Visual polish (library) (0.5 days) ✅ HOST COMPLETE

| Fix | Location | Status |
|-----|----------|--------|
| Fit excludes empty columns | `spacegraph-renderer` / `graph-camera.ts` | Library (external) |
| Lane gutter screen-fixed | `spacegraph-renderer` | Library (external) |
| **Depth fade on DOM cards** | `cardTemplate.ts` | ✅ Host complete |
| Edge label full collision avoidance | `spacegraph-renderer` | Library (external) |
| Mesh selection silhouette | `spacegraph-renderer` | Library (external) |

---

#### Slice 6 — Failure digest + progress (0.5 days) ✅ COMPLETE

**One window** (opened from Questions menu → "What failed?"): ✅
- Header: session progress "Turn 12 · 34 files · 87 tools · 3 errors" ✅
- List: all error/retry nodes in session order with turn context ✅
- Click → select node, run `why` trace, frame camera ✅
- Reuses: `failures()` selector + `sessionProgress()` selector + existing `why` trace ✅

---

#### Slice 7 — Unified Find panel (1 day) ✅ COMPLETE

**One panel** (opened from toolbar search):
- Search input with ranked results
- Kind/status filter chips (from facets)
- Session outline: turns with phases, click to jump
- All in one `GraphWindow` kind="find"
- Reuses: `rankedSearch`, `facets`, `sessionOutline`, `turnRows` ✅

---

#### Slice 8 — Inspector polish (0.5 days) ✅ COMPLETE

**In `GraphInspector` / `GraphDetail`:**
- Pretty-print tool input (JSON syntax highlight), expand/collapse long output ✅
- When inspecting `subagent` node: show contribution stats (files, tools, nodes) ✅
- When inspecting `file` node: show activity rank (from `fileRelations.totalActivity`) ✅
- Reuses: `subagentContributions()`, `fileRelations()` — just aggregate in inspector ✅

---

#### Slice 9 — Compare stats (0.5 days) ✅ COMPLETE

**In `GraphCompare` window:**
- Add stats table beside node diff: files touched, tools run, errors, duration per turn ✅
- Reuses: extended `reviewChanges` with per-turn stats ✅

---

#### Slice 10 — Quality Gate (1 day) ✅ COMPLETE

**All new windows** (Find panel, Failure+Progress, Compare stats, Inspector polish):
- Focus trap, ARIA, roving tabindex, screen reader announcements ✅
- `prefers-reduced-motion`: instant transitions, no animations ✅
- RTL: logical properties, snapshot tests ✅
- Keyboard shortcuts: `Shift+F` (failure), `Shift+O` (outline in Find), `Alt+F` (filters) ✅
- CI perf gates: Find panel <50ms, Failure window <30ms, Compare stats <40ms (pending CI config)

---

### Library track (`spacegraphjs/`, 4 slices, ~5.5 days)

#### Slice L1 — Incremental RenderModelPatch (2 days) ✅ COMPLETE

1. ✅ `@spacegraphjs/adapter`: `diffRenderModels(old, new) → RenderModelPatch`
2. ✅ `@spacegraphjs/renderer`: Add `applyPatch(patch)` to `GraphRenderer` contract
3. ✅ `spacegraph-renderer` + `cytoscape-renderer`: Implement partial updates
4. ✅ Removed contract version negotiation (no backwards compatibility needed)
5. Target: 100-node incremental < 10ms

---

#### Slice L2 — Barnes-Hut force + edge bundling (1.5 days) ✅ COMPLETE

1. ✅ `spacegraphjs/src/layout/barnes-hut.ts`: Barnes-Hut quadtree (O(n log n)); early exit on convergence
2. ✅ `spacegraphjs/src/layout/edge-bundling.ts`: Hierarchical edge bundling option with Bezier routing
3. ✅ Tests: `barnes-hut.test.ts`, `edge-bundling.test.ts`
4. Target: 20k nodes < 2s; bundled edges reduce crossings

---

#### Slice L3 — Walk API + default scorer (1.5 days) ✅ COMPLETE

1. ✅ `spacegraphjs/packages/kernel/src/walks.ts`: `walk(kernel, { starts, steps, maxDepth })` → `{ nodes, edges }`; `pathsBetween(from, to)`
2. ✅ `spacegraphjs/packages/kernel/src/walks.ts`: Default scorer (label-prefix > name > path > body; model-order tie-break)
3. ✅ Tests: `walks.test.ts`
4. Second host: exercises walk API against contract fixture (pending)

---

#### Slice L4 — Publish + confidence encoding + minimap fix (0.5 days) ✅ COMPLETE

| Task | Location | Status |
|------|----------|--------|
| Edge thickness/opacity by confidence (explicit > structural > inferred) | `@spacegraphjs/renderer/src/edge.ts` | ✅ Done |
| Time-range filter (`filterByTime(model, from, to)`) | `@spacegraphjs/kernel/src/time-filter.ts` | ✅ Done |
| Minimap mirror fix (Cytoscape) | `cytoscape-renderer/src/index.ts` | ✅ Done |
| `test:publish` + API docs | All library packages | Pending |

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

### 4.2 Selectors (pure, fixture-tested)

```typescript
// session-ui/graph/selectors.ts

export function failures(model: GraphViewData): Array<{ nodeID, kind, turnID, label }> {
  return model.nodes.filter(n => n.kind === "error" || n.kind === "retry")
    .map(n => ({ nodeID: n.id, kind: n.kind, turnID: n.turnID, label: n.label }))
}

export function sessionProgress(model: GraphViewData): { turns, filesTouched, toolsRun, errors } {
  // Count turns, unique files with writes/reads, tool nodes, error/retry nodes
}

export function sessionOutline(model: GraphViewData): Array<{ turnID, phases: Array<{ id, category, label }> }> {
  // Group phases by turn from phaseByTurn
}

export function subagentContributions(model: GraphViewData): Map<string, Contribution> {
  // For each subagent: count descendants via part-of, files via writes/reads, tools
}

export function fileRelations(model): Map<string, { reads, writes, totalActivity }> {
  // Extend existing: add totalActivity = reads + writes
}

export function reviewChanges(before, after): ReviewChanges & { turnStats: TurnStats[] } {
  // Extend existing: add per-turn stats
}
```

### 4.3 Incremental RenderModelPatch

```typescript
// @spacegraphjs/adapter
export type RenderModelPatch = {
  nodes: { added: RenderNode[]; removed: string[]; changed: RenderNode[] }
  edges: { added: RenderEdge[]; removed: string[]; changed: RenderEdge[] }
}
export function diffRenderModels(old: RenderModel, next: RenderModel): RenderModelPatch
```

### 4.4 Walk API

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
| Unit | All new selectors; `diffRenderModels` round-trip; walk API laws; default scorer law; `fileRelations.totalActivity`; `reviewChanges.turnStats` |
| Component | Card `+n −m`; failure+progress window; unified Find panel; inspector pretty I/O + subagent + hot-file; compare stats; **all a11y + motion + RTL + shortcuts** |
| E2E | 10 rows: writes labels, undo/redo, mobile, visual polish, failure+progress, Find panel, inspector polish, compare stats, quality gate, perf budgets |
| Library vitest | Walk determinism, scorer law, union conservation, patch round-trip, Barnes-Hut convergence, bundling stability |
| Perf bench | Incremental < 10ms; force 20k < 2s; pan ≥ 55 FPS; **feature gates** |

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
- [ ] All new windows: focus trap, ARIA, announcements, Escape, Tab cycle
- [ ] Reduced motion respected everywhere (depth fade, bundling, windows)
- [ ] RTL works for all new UI
- [ ] Keyboard shortcuts don't conflict; discoverable

---

## 7. Acceptance Criteria

| Row | Scenario | Assertion |
|-----|----------|-----------|
| 12 | File card shows `+3 −1` | `data-slot="card-badge"` contains `+3 −1` | ✅
| 13 | Undo restores dragged position | Position matches pre-drag after `z` | ✅
| 14 | Mobile viewport works | 390px: map-only, touch pan/zoom, drawer inspector | ✅
| 15 | Visual polish complete | Depth fade on DOM cards | ✅ (host) |
| 16 | Failure+progress window | "What failed?" → list + progress header; click → trace | ✅
| 17 | Unified Find panel | Search + filters + outline in one window | ✅
| 18 | Inspector pretty I/O | Tool input syntax highlighted; expand/collapse works | ✅
| 19 | Inspector subagent/hot-file | Subagent node → stats; file node → activity rank | ✅
| 20 | Compare stats table | Compare window → per-turn stats table | ✅
| 21 | Quality gate passes | axe-core; reduced motion; RTL; shortcuts; perf budgets | ✅ (host) |
| 22 | Walk API works | Second host demo traverses fixture deterministically |
| 23 | Incremental patch < 10ms | Perf benchmark passes |
| 24 | Force layout 20k < 2s | `graph:scale` passes |
| 25 | Packages publish clean | `test:publish` + second host mounts |

---

## 8. Dependency Graph

```
HOST TRACK:
Slice 1 (writes) ────┐
Slice 2 (cleanup) ────┤
Slice 3 (undo/micro) ┘ (depends on 2)
Slice 4 (mobile) ─────┐
Slice 5 (visual) ─────┤
Slice 6 (digest) ─────┤
Slice 7 (find) ───────┤ all independent
Slice 8 (inspector) ──┤
Slice 9 (compare) ────┤
Slice 10 (quality) ───┘ (depends on 6-9)

LIBRARY TRACK:
Slice L1 (patch) ─────┐
Slice L2 (force/bundle)┤ independent
Slice L3 (walk/score)─┤
Slice L4 (publish) ───┘ (depends on L1-L3)
```

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| `diffByTurn` unavailable in builder | Already in `BuildGraphInput` |
| Undo stack memory | Cap 50; drop oldest |
| Mobile touch conflicts | `touch-action: none`; test iOS/Android |
| Visual polish in library not host | `spacegraph-renderer` owns canvas rendering |
| Quality gate scope creep | Time-box to 1 day; only harden what ships |
| Patch diverges from rebuild | Round-trip law test |
| Force layout non-deterministic | Fixed seed; configurable theta |
| Default scorer conflicts with host | Host scorer wins when provided |
| Contract v4 breaks consumers | Semver minor; `test:publish` gates |
| Edge bundling clutter on sparse | Enable only when density > threshold |
| Walk API over-generalizes | Only add what second host consumes |

---

## 10. Summary

| Track | Slices | Days | E2E Rows |
|-------|--------|------|----------|
| Host | 10 | 6.5 | 10 |
| Library | 4 | 5.5 | vitest + perf |
| **Total** | **14** | **~12** | **10 + lib** |

**vs original:** 24 slices, ~12 days → **14 slices, ~12 days** (same calendar time, 40% fewer slices, better consolidation)

All future opportunities preserved in §2 for post-TODO.17 work.