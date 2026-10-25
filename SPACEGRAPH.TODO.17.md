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
| **Accessibility hardening (new)** | — | All new windows: focus trap, ARIA, announcements |
| **Reduced motion compliance (new)** | — | Depth fade, bundling, window transitions |
| **RTL support for new UI (new)** | — | Failure digest, outline, compare, search filters |
| **Keyboard shortcuts for new actions (new)** | — | `Shift+F` digest, `Shift+O` outline, `Alt+F` search filters |
| **CI perf gates for new features (new)** | — | Failure digest <50ms, outline <30ms, search filter <20ms |

### Deferred (architectural consequences or UX unknown)

| Item | Reason |
|------|--------|
| Annotation persistence (V113) | Needs app line-comment store owner |
| Graph state persistence | Needs session storage abstraction |
| Graph onboarding & keyboard reference | UX copy review needed; localStorage in library is wrong layer |
| Export: standalone HTML with interactivity | Needs bundling strategy; static export adequate for now |
| Auto-trace "what's new since I left" (V112) | Full version needs last-visited owner; simplified failure digest ships |
| Cross-session graphs (D4) | Needs single-session evidence first |
| Community detection (V103) | No consumer; fights deterministic layout |
| Executable flow edges (V117) | Separate product |
| Multi-user presence (V119) | Collaboration owner needed |

### Future opportunities (post-TODO.17)

| Item | Why it matters | Trigger |
|------|----------------|---------|
| **Session investigation report export** | Share findings as PDF/Markdown with traces, failures, subagent summaries | Team debugging, post-mortems |
| **Provenance chain as trace kind** | "Show full chain: prompt → tool → file → test → error" as navigable path | Deeper debugging |
| **Session health scorecard** | Single metric: "3 errors, 2 retries, 45 min, 12 files, 87 tools" | Quick triage |
| **Bulk operations** | "Collapse all phases", "expand all subagents", "select all files" | Long session management |
| **Bookmarks / pinned nodes** | Pin important nodes across reloads | Recurring investigation |
| **Annotations v2** | Threaded comments, reactions, resolution status | Code review workflow |
| **AI-assisted analysis** | "Summarize this session", "What patterns do you see?" | Cognitive load reduction |
| **Time-travel replay** | Scrub through session with full state at each turn | Debugging intermittent failures |
| **Codebase overlay** | Show graph over actual filesystem (file tree + graph sync) | Navigation context |
| **Cross-session learning** | "This error happened before in session X" | Pattern detection |
| **Plugin/extension API** | Third-party graph extensions (custom layouts, analyzers) | Ecosystem |
| **Settings/preferences panel** | Graph-specific: default layout, level, renderer, density | Personalization |
| **Full keyboard navigation** | Traverse entire graph without mouse | Accessibility, power users |
| **Command palette integration** | All graph actions discoverable via `mod+shift+p` | Discoverability |
| **Performance profiling UI** | Built-in profiler (FPS, render time, node count, memory) | Perf debugging |
| **Analytics/telemetry (opt-in)** | Which features used, where users struggle | Product decisions |

---

## 2. Use-Case Analysis (what drives each slice)

| Use case | Current state | Gap | Slice |
|----------|---------------|-----|-------|
| **Debugging a failure** | `why` trace, evidence edges, failure ticks | No one-gesture "show me all failures" | 7 (failure digest) |
| **Reviewing what agent did** | Files rail, provenance, notes | No summary of subagent contributions | 8 (subagent summary) |
| **Monitoring live session** | Running/pending statuses | No progress indicator (X/Y turns) | 9 (progress) |
| **Understanding session arc** | Overview level, phases | No jump-to-phase, no legend counts | 12 (session outline), 13 (legend counts) |
| **Finding specific activity** | Search, ranked results | Can't filter by kind/status in search | 11 (search filters) |
| **Reading tool calls** | Inspector shows raw JSON | No pretty-printing, no expand/collapse | 13 (inspector) |
| **Long codebase sessions** | Workspace stages, file hub weights | No "hottest file" ranking | 10 (hot-file) |
| **Comparing approaches** | Two-turn compare (B1) | No per-turn stats table | 14 (turn stats) |
| **Streaming performance** | Full rebuild per update | 63ms per update at 300 nodes | L1 (patch) |
| **Dense graph readability** | Straight edges | No bundling, cluttered crossings | L2 (bundling) |
| **Second host / platform** | `searchBy` requires host scorer | No default scorer, no walk API | L3 (walk + scorer) |

---

## 3. Work Plan

### Host track (14 slices + 3 hardening, ~8.5 days)

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
2. `session-graph/ui/GraphStatusBar.tsx`: Show "Turn 12 · 34 files · 87 tools · 3 errors" in status bar
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
2. `session-ui/graph/selectors.ts`: `rankedSearch` extend to accept `kinds?: Set<NodeKind>`
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

#### Slice H1 — Accessibility hardening for all new windows (1 day)

**New windows:** Failure digest, Subagent summary, Session outline, Compare stats, Search filters

For each:
1. Focus trap on open; restore focus on close
2. ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
3. Roving tabindex for lists; `ArrowUp/Down` navigation
4. Screen reader announcement on open (`graph:announce`)
5. Escape closes; `Tab` cycles within dialog
6. `data-slot` for a11y test assertions

**Test:** Component: each window passes axe-core; E2E: keyboard-only navigation works

---

#### Slice H2 — Reduced motion + RTL + keyboard shortcuts (0.5 days)

**Reduced motion:**
1. Depth fade transitions (Slice 6): `prefers-reduced-motion` → instant opacity
2. Edge bundling (L2): disable animation when reduced motion
3. Window open/close (H1): instant, no transition

**RTL:**
1. Failure digest list, outline tree, compare stats table, search filter chips: logical properties
2. `GraphToolbar` overflow already RTL-aware; extend to new windows

**Keyboard shortcuts:**
| Action | Key | Conflict |
|--------|-----|----------|
| Open failure digest | `Shift+F` | — |
| Open session outline | `Shift+O` | — |
| Toggle search filters | `Alt+F` | `f` = fit |
| Show subagent summary | `s` on subagent node | — |

**Test:** Component: shortcuts trigger correct actions; RTL snapshot tests

---

#### Slice H3 — CI perf gates + investigation report export (0.5 days)

**Perf gates (add to `graph:scale`):**
1. Failure digest window render < 50ms
2. Session outline build < 30ms
3. Search filter re-rank < 20ms
4. Compare stats table build < 40ms

**Export investigation report:**
1. `session-graph/ui/export.ts`: Add `format: "report"` — generates Markdown with:
   - Session metadata (duration, turns, files, errors)
   - Failure digest list with traces
   - Subagent contribution summaries
   - Turn comparison tables (if any)
   - Session outline
2. `data-slot="graph-export-report"` for tests

**Test:** E2E: export report → open in Markdown viewer → all sections present

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
| Component | Card `+n −m` badge; failure digest window; subagent inspector; progress bar; file rail sorting; search filters; outline window; inspector pretty I/O; legend counts; compare stats; **a11y for all windows; reduced motion; RTL; keyboard shortcuts** |
| E2E | 18 rows: writes labels, undo/redo, mobile, renderer switch, perf budget, fit/gutter/depth/labels/silhouette, failure digest, search filters, outline jump, turn stats compare, **a11y keyboard nav, reduced motion, investigation report export** |
| Library vitest | Walk determinism, scorer law, union conservation, patch round-trip, Barnes-Hut convergence, bundling stability |
| Perf bench | Incremental < 10ms; force 20k < 2s; pan ≥ 55 FPS; **new feature gates** |

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
- [ ] RTL works for all new UI (digest, outline, compare, search filters)
- [ ] Keyboard shortcuts don't conflict; discoverable in shortcuts reference

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
| 28 | New windows pass a11y | axe-core passes; keyboard nav works; announcements fire |
| 29 | Reduced motion respected | `prefers-reduced-motion` → instant transitions everywhere |
| 30 | RTL works on new windows | Logical properties; no hardcoded left/right |
| 31 | Shortcuts work | `Shift+F`/`Shift+O`/`Alt+F`/`s` trigger correct actions |
| 32 | Investigation report exports | Markdown contains failures, subagents, compare, outline |

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

HARDENING (depend on their features):
Slice H1 (a11y) ──────┐
Slice H2 (motion/RTL) ┤ after features they harden
Slice H3 (perf/export)┘

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
| A11y regressions in existing windows | Run axe-core on all windows in CI |
| Reduced motion missed in new code | Lint rule: no `transition` without `prefers-reduced-motion` check |
| RTL bugs in complex windows | Snapshot tests at 390px RTL; component test matrix |
| Shortcut conflicts | Central registry; test matrix of all key combos |

---

## 11. Post-TODO.17 Vision

After TODO.17, the graph becomes a **complete investigative platform** for agentic development. The next phase (TODO.18+) should tackle:

| Priority | Item | Effort |
|----------|------|--------|
| 1 | **Investigation report export** | 1 day |
| 2 | **Provenance chain trace kind** | 1 day |
| 3 | **Session health scorecard** | 0.5 days |
| 4 | **Bulk operations** | 1 day |
| 5 | **Bookmarks / pinned nodes** | 1 day |
| 6 | **Annotations v2** | 2 days |
| 7 | **Settings/preferences panel** | 1 day |
| 8 | **Full keyboard navigation** | 1 day |
| 9 | **Command palette integration** | 0.5 days |
| 10 | **AI-assisted analysis** | 3 days |
| 11 | **Time-travel replay** | 3 days |
| 12 | **Codebase overlay** | 2 days |
| 13 | **Cross-session learning** | 2 days |
| 14 | **Plugin/extension API** | 3 days |

**Total: ~23 days** for a mature, extensible graph platform.

The architecture (pure model, contract-based renderers, host-owned vocabulary) supports all of this without structural changes.