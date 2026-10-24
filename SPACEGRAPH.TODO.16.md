# SPACEGRAPH.TODO.16 — The Answerable Map: Traces, Facets, Diffs, Group Power, and a First Write Path (draft 4)

**Status:** Core A/B/C implemented (2026-10-24); A and B tested where noted, C core implemented. **Tests and the T2.2 evidence run are deferred by owner direction and must land before the plan closes.** Builds on TODO.15 (S1–S4 complete: memoized pipeline, incremental clock, Layers menu, surfaces, first-class groups). The model and substrate are ahead of the interface; this plan closes the exposure gap, adds the map's first reader-authored content, and records the trajectory toward SpaceGraphJS as a spatial operating environment — **without shipping any of that leap**.

## Progress

| Milestone | State | Gate | Days |
|-----------|-------|------|------|
| **A — Questions & Scopes** | **Complete** (A1 + A2) | T2.2 evidence run | 3.0 |
| **B — Comparison, Verbs, Groups, Edges** | **Complete core** (B1/B2/B3); tests deferred | Evidence pass (deferred by owner) | 2.5 |
| **C — Annotations** | **Complete core** (C1); tests deferred | Evidence pass | 1.25 |
| **Platform track (parallel/optional)** | Not started | Second host / platform demand | 2.75 |

**Core total: 6.75 days** (was 8.25; substrate track decoupled). **A is delivered; B1 is implemented.** The owner has explicitly deferred the T2.2 gate and test authoring for B1; both remain required before the plan is closed.

### Where the work stands

- **A1 — trace overlay: complete.** `packages/session-graph/src/ui/overlay.ts` + `overlay.test.ts`; `GraphView` trace state/keys; `cardTemplate` lit/dim markup; copy-as-outline.
- **A2 — facets, ranked search, lens, permalinks: complete.** New `packages/session-ui/src/graph/facets.ts` (+ tests) owns the facet grammar, live counts, and the single scope step. `selectors.rankedSearch` uses `Navigation.searchBy` with the host scorer. The toolbar has facet chips and per-domain lens toggles with a runtime preset. `graph-permalink.ts` carries `?q=` and supports view-only links (`#graph?kind:file`). `degreeBudget` feeds `fileRelations` into `applyNodeBudget` with the selection protected. `GraphDetail` offers copy-view beside copy-node.
- **B1 — diff, compare, and selection verbs: implemented (tests deferred).** New `GraphStatusBar.tsx` owns the selection verbs (Frame · Keep only · Copy paths · Export subset · Clear) as pure functions over the held ids. `GraphView` applies keep-only after facets. A parked scrubber turn diffs against the live map through `reviewChanges`, marking cards with `data-diff="added|changed|removed"` and showing a `+n −n ~n` chip with a return-to-live action. The scrubber draws per-turn status ticks. `graph-camera` gained `frame(ids)`.
- **B2 — group collapse: implemented (tests deferred).** `session-ui/src/graph/collapse.ts` hides a collapsed group's members while keeping the group chip and its member count; the status bar collapses/expands the selected group and can collapse every other group. Positions are derived and never re-laid-out.
- **B3 — edge affordances: implemented (tests deferred).** `GraphCanvas` now forwards `edgeClick` and edge-kind `hoverChange`; edge hover peeks kind/confidence/label, edge click selects the source and traces from it, the legend lists edge kinds with counts and visibility toggles that filter the render model, and `[`/`]` walk incoming/outgoing edges when no trace is active.
- **C1 — annotations: implemented (tests deferred).** `note` is a host node kind and `annotates` an edge kind; `session-ui/src/graph/annotations.ts` appends notes to the model, inheriting the target's turn so scoping and search work without a substrate change. `GraphNoteComposer.tsx` anchors to the target via `graph-anchors`; the status bar offers Add note (also `n`), and note nodes get edit/copy/delete in the shared detail surface. Notes stay session-local.
- **Commands — palette bridge: implemented.** `GraphToolbar` gained a Questions menu (Why? · What led here? · Related · Compare turns · Add a note · Show facets) that dispatches `graph:command` events; `GraphView` handles the trace/compare/note names and the toolbar opens its facet menu for `facets`. The same events let the app's command palette reach the map without a new mode.
- **Deferred:** the T2.2 evidence run, all B1–B3/C1 e2e/unit/component tests, optional compare-as-window, adapter header-click collapse, the group action menu, `writes` payload labels, and annotation persistence (V113). The plan does not close until they land.
- **Platform track P1/P2 remains optional** and adds zero product diff; it has no consumer until a second host exists.


---

## 0. The trajectory: SpaceGraphJS as a spatial operating environment

Taken to its logical conclusion, SpaceGraphJS is a spatial OS: a stable address space of live, addressable, inspectable, actionable entities, projected many ways, arranged spatially, queried textually, and shared as links. This plan does **not** take that leap. It records it so every slice lands on the trajectory instead of across it, and it names the one step (C: annotations) that turns the map from a read-only projection into a place with authorship.

| OS concept | Graph primitive | Status |
|------------|-----------------|--------|
| Address space | Stable node ids + permalinks | Have |
| Filesystem | Kernel: append-only, versioned, diffable, mergeable | Have |
| Window manager | Renderer contract: projections + capability flags | Have |
| Desktop / spatial memory | Deterministic layout + manual arrangement that survives rebuilds | Have |
| Process table | Node statuses, runtime lens preset, live tail | Presets in A2; scrubber has turns |
| Shell | Facet chips ↔ serialized query string; permalink grammar | A2 / A3 |
| IPC / pipes | Edges; payload-bearing labels; peek (B3). Executable flow edges V117 | Peek now, flow vaulted |
| Mount | Kernel `union`: read-only composition with namespaced edges | Platform P2 (optional) |
| Permissions / trust | Edge confidence + per-kind visibility toggles | B3 |
| Notifications | A11y announcements (local); digest V112 | Local now |
| Authoring / write | **Annotations (C)**; manual arrangement (have); full authoring V114/V115 | **First write path in C** |
| Undo | Arrangement undo | V115 |
| Multi-user | Presence, shared cursors | V119 |
| Package manager | Published npm set + second-host demo | Carried from TODO.3/14 |

**No-strain rules** (how the OS aspiration stays out of OpenCode's way):

1. Substrate gains mechanism only with a law, a demo, and a named consumer (carries #21/#36). P2's consumer is the second host; OpenCode's diff from P2 is zero.
2. Host vocabulary never enters the substrate. "Note", "turn", "file" stay host-side; the substrate keeps Node/Edge/walk/union.
3. OS-ambition items enter this plan in exactly two shapes: a milestone with an OpenCode consumer, or a vault entry with a trigger. Nothing ships "because the OS will want it."
4. The OpenCode diff budget stays ≤ ~16 existing files + 2 new components. When a slice can't fit that, it splits or vaults.

---

## 1. The design in one paragraph

The map can *describe* a session but cannot yet be *asked* a question — and it cannot be *written on*. This plan fixes both. The decisive simplification: **the host track never needed the substrate track.** Host traces run on existing selectors (`why`, `forwardChain`, `shortestPath`, `incoming`/`outgoing`, `ancestors`); ranked search passes a host `scoreFn` into the existing `searchBy`; diff uses existing `reviewChanges`; groups and edges already have their state. The kernel walks were a generalization with no product consumer — the speculative-genericity trap stop rule #36 was written to catch. The substrate track (walks, default scorer, trace demo, union) moves to a parallel "Platform track" with its own consumers (demo, second host), zero product dependency. Everything in the core is a view of the same derive → diff → incremental → interpolate pipeline (stop rule #25 unchanged); classification and authorship never re-layout. No contract bump, no new mode vocabulary, no stateful controller.

Stated measurably:

1. **Ask, don't scan.** Every question from SPACEGRAPH.md §1.1 is one gesture that lights the answer, dims the rest, and is announced once.
2. **Compose, don't preset.** Level × lens × facet × trace are independent parameters feeding one scope-and-classify step.
3. **Sets, not clicks.** Box-select gains verbs; two turns compare; a file's history is a trace preset.
4. **Groups earn their keep.** A group collapses to a labeled chip with stats and offers its members' actions.
5. **Answers are artifacts.** A trace copies as a markdown outline; a scope serializes to a link.
6. **Author, don't just read.** A note attaches to any node, deterministically placed, searchable, exported — and moves nothing.
7. **Positions never move because of a question or a note.** Overlays classify; annotations append; layout is untouched.
8. **Evidence gates the backlog.** Milestones B and C start only after T2.2; if the graph loses to the transcript, they are not built (SPACEGRAPH.md §10.2).

---

## 2. Revision history (draft 4 changes from draft 3)

| Change | What | Saved / Gained |
|--------|------|----------------|
| **Decoupled substrate track** | Host traces use existing selectors; `searchBy` accepts host `scoreFn`; walks/scorer/demo/union move to Platform track P1/P2 | Core 8.25 → 6.75 days; no spacegraphjs work on critical path; Day 1 is host-only |
| **Milestone restructuring + T2.2 gate** | A (questions + scopes) → T2.2 evidence → B/C only on pass. Per SPACEGRAPH.md §10.2 stop rule | Highest-EV schedule trick: if evidence is negative, B/C are never built |
| **Slice merges** | S3+S4 → B1 (shared status bar: compare + verbs); S7 query serialization → A2 (facets produce scope; serialize is pure); permalinks → A2 | 8 core slices → 6; overhead ~0.5 day saved; ≤11 acceptance rows (was 14) |
| **Machinery reuse inventory** (new §) | Peek for edges, anchors for note popover, windows for compare, breadcrumbs→outline, fileRelations→weights, comment-store seam, GraphDetailSurface for note body | Each new UI reuses an existing component; no blank-slate builds |
| **Testing ladder rule #38** | Assert at the cheapest layer that can fail: unit > component > e2e | Flakiness and runtime cut; popovers/status bar/note composer in Storybook |
| **i18n en-first** | Add keys to en.ts; translations follow per existing convention | No blocking on translation files |

---

## 3. Borrowed interaction paradigms (what we take, what we reject)

| Paradigm | Source | What we adopt | Why here |
|----------|--------|---------------|----------|
| Focus+context highlighting | Palantir, Neo4j Bloom | Trace: answer lit in card markup, non-answer edges hidden via `visible` | §1.2 hypothesis; cards are host markup |
| Expand-by-relationship | Bloom / Linkurious | Kernel `walk` in Platform track; host traces use `incoming`/`outgoing`/`shortestPath` | Selectors exist; walks are the generalization |
| Facet panel with live counts | kepler.gl, Obsidian | Chip popover with kept/total counts | 24 kinds made substring search the bottleneck |
| Ego graph with radius | Obsidian local graph | `maxDepth` via `shortestPath` / `traverse` in traces | One parameter of the A1 primitive |
| Compound-node collapse | Cytoscape, yEd | Adapter-emitted compact group chip | Renderer draws any sized group; collapse is data |
| Selection toolbar with counts | Figma / tldraw | Status bar verbs over existing id array | State exists; verbs don't |
| Edge as first-class entity | React Flow, Linkurious | Consume existing `edgeClick`/`hoverChange`; peek renders kind, confidence, label | Zero substrate cost |
| Legend as control | Map layer toggles | Edge-kind visibility toggles with counts | `RenderEdge.visible` exists |
| **Annotations** | HyperCard, Obsidian, tldraw | `note` node + `annotates` edge | Map's first write path; review workflows; app line-comment store is persistence seam |
| **View specifiers** | Engelbart NLS | Facet state serializes into `?q=` in permalink | Shareable, scriptable questions |
| **Debug wires** | Node-RED live payload preview | `writes` edges carry "+n −m" in build-time label; peek shows it | `GraphEdge.label` is host-authored; no model change |
| **Ranking by metric** | Gephi partition/ranking | Degree/relation counts → budget weights | `fileRelations` + `applyNodeBudget(weights)` |
| Command palette questions | VS Code / Obsidian | `graph.why`, `graph.compare`, `graph.facets`, `graph.note` registry entries | Discoverability without toolbar growth |
| CI timeline ticks | Pipeline timelines | Scrubber ticks mark failing turns; hover peeks | "Where did it go wrong" at a glance |
| Diff/ghost rendering | Code review | Ghost = outline card for removed; added lit | `diffKernels` + `reviewChanges` classify |
| Search-to-visualize | Bloom NL search | **Rejected** — chips + query string only; a DSL is a flake factory | |
| Auto-community grouping | Gephi modularity | **Vault** (V103) — groups derive from real structure | Detection moves meaning without a consumer |

### 3b. Missing functionality found by architectural comparison (durable record)

| System / lineage | Mechanism we lack | Verdict |
|------------------|-------------------|---------|
| Node-RED, Blueprints, n8n | Authoring wires, ports, subgraph-as-node, comment frames | Ports/wires V117; comment frames → **C**; subgraph-as-node V114; undo V115 |
| Obsidian / Roam / LogSeq | Reader-authored content; backlink panes | **C**; backlinks = `why` + incoming (have) |
| Jupyter | Live cells with inline controls | Statuses have it; card micro-actions V116 |
| Gephi | Metric-driven styling and budget | **A2** degree weights; full ranking V111 |
| Palantir | Saved scopes, workspaces | Query-string permalinks (**A2**); team workspaces V119 |
| Cytoscape | Expand/collapse, context menus | **B2**; group menus ride action registry |
| TouchDesigner / ComfyUI | Executable graphs | **Vaulted** (V117) — its own product; append-only + action registry are the seams |
| tldraw / Excalidraw / Miro | Free authoring, snap, laser, presence | Authoring seeds in **C**; snap/undo/presence V115/V119 |
| Engelbart NLS | View specifiers as shareable specs | **A2** query string |
| HyperCard | Canvas as authoring OS for non-experts | Trajectory (§0); C is the first step, deliberately tiny |

---

## 4. Milestones (core = 6.75 days)

### Milestone A — Questions & Scopes (3.0 days, unblocks T2.2)

| Slice | Days | Delivers |
|-------|------|----------|
| **A1 — Overlay core + traces** ✅ | 1.25 | Overlay classification algebra: `answerIds` set → `lit`/`dim` CSS classes on host card markup + `visible=false` on non-answer edges; one a11y announcement. Host: "Why" (`why`), "What led here" (`forwardChain`), "Related" (`incoming` ∪ `outgoing`) as buttons on cards + `w`/`e`/`r` keys; `[`/`]` steps lit nodes; copy answer as markdown outline (breadcrumbs per lit node); `graph.why`/`graph.led-here`/`graph.related` palette commands; trace presets replace self-navigating actions (`file.history`, `symbol.showCallers` → trace presets); +2 e2e rows. |
| **A2 — Facets, ranked search, lens, permalinks** ✅ | 1.75 | Facet popover: text + kind/status/domain chips with live kept/total counts; "keep only these" scopes via existing `scopeModel`; ranked search via `searchBy(model, query, hostScoreFn)` — host scorer (label-prefix > name > path > body; model-order tie-break); lens menu gains per-domain toggles, presets as shortcuts, "custom" reachable or select deleted; runtime lens preset (session + runtime domains, `running`/`pending`, latest test-run); **degree-aware budget weights** from `fileRelations` (hubs + selection survive caps); facet state serializes to `?q=` in permalink; round-trip law; copy-view beside copy-node; +3 e2e rows. |

**A acceptance rows: 5.**

### Gate: T2.2 evidence run (SPACEGRAPH.md §10.2)

> If the graph does not beat the transcript on the five investigative tasks, **stop feature work**, publish the finding, keep the library as the deliverable. Milestones B and C start only on a pass.

### Milestone B — Comparison, Verbs, Groups, Edges (2.5 days)

| Slice | Days | Delivers |
|-------|------|----------|
| **B1 — Diff & compare + status bar verbs** ✅ core (tests deferred) | 1.25 | Scrub-park on turn N ⇒ diff parked vs live (`reviewChanges` → `data-diff` lit/ghost markup, non-answer edges hidden); "+12 −3 ~7" chip; **shared status bar:** frame selection, keep-only (scope), copy paths, export subset, clear — pure over the id array; scrubber failure ticks; **two selected turns compare explicitly** and the map scopes to both. Optional compare-as-window remains. |
| **B2 — Group collapse** ✅ core (tests deferred) | 0.5 | `collapseGroups(model, collapsed)` hides a group's members while keeping the group chip and its `data-group-members` count; status-bar verbs collapse/expand the selected group, "collapse others"; Enter toggles the selected group; expanding restores the derived positions. Deferred: adapter header-click and group context menu. |
| **B3 — Edge affordances** ✅ core (tests deferred) | 0.5 | Edge hover peeks kind, confidence, and label; edge click selects the source and traces from it; the legend lists edge kinds with counts and visibility toggles that filter the render model; `[`/`]` walk incoming/outgoing edges when no trace is active. **Deferred:** `writes` payload labels (`+n −m`) from diff metadata. |

**B acceptance rows: 7.**

### Milestone C — Annotations (1.25 days)

| Slice | Days | Delivers |
|-------|------|----------|
| **C1 — Annotations** ✅ core (tests deferred) | 1.25 | `note` node kind + `annotates` edge kind (host vocabulary in `vocabulary.ts`/`model.ts`); "add note" from the status bar or `n`; note composer anchored via `graph-anchors`; note card renders as a normal node in its own narrative lane with deterministic layout; searchable (label/summary), exported, and announced; inspector actions edit/copy/delete reuse `GraphDetailSurface`; the note inherits its target's turn, so scrubbing scopes it with the target. Session-local; the app's line-comment store is the named persistence seam (V113). |

**C acceptance rows: 2.** Total core: **11 rows** (was 14).

### Platform track (parallel/optional, zero OpenCode diff)

| Slice | Days | Delivers |
|-------|------|----------|
| **P1 — Walks + scorer + trace demo** | 1.75 | `packages/kernel/src/walks.ts`: `walk(kernel, {starts, steps, maxDepth})` → `{nodes, edges}`; `pathsBetween(from, to)` union. Laws: order stability, union idempotence, empty starts → empty result, edge sets = traversed edges. `src/navigation/search.ts`: default scorer (label-prefix > name > path > body; model-order tie-break) + vitest law. Demo `trace.html` + spec (deterministic, `advance(t)`, no sleeps). Consumer: second host / platform tooling. |
| **P2 — Kernel union (the mount seam)** | 1.0 | `union(kernels, {namespace})`: read-only composition, edge ids namespaced per source, provenance preserved. Laws: disjoint namespaces, stable order, no mutation of inputs. Second-host demo mounts two fixtures side by side. Consumer: D4 cross-session demand or platform work. Distinct from LWW `merge` (kept for multi-writer). |

---

## 5. Reuse inventory (machinery we already have, new UI reuses it)

| New UI | Reuses | How |
|--------|--------|-----|
| Trace overlay | Host card markup + `visible` flag | CSS classes on cards; edge hiding via existing `RenderEdge.visible` |
| Facet popover | `GraphPeek` (anchor + popover) | Same anchoring, different content |
| Note composer | `graph-anchors` popover + `GraphDetailSurface` edit body | Anchor to node; editor = detail body with save |
| Compare-as-window | `GraphWindows` manager + new window kind | Manager knows no content; kind = "compare" |
| Edge peek | `GraphPeek` with `kind="edge"` | Same component, branch on edge |
| Outline copy | `breadcrumbs()` selector per lit node | Already produces path lines; join with `\n` |
| Degree-aware budget | `fileRelations` + `applyNodeBudget(weights)` | `fileRelations` exists; `applyNodeBudget` takes weights |
| Note persistence seam | App line-comment store | Named in V113; C ships session-local |
| Scrubber failure ticks | Existing scrubber + turn statuses | Already renders turn markers; color by status |

No new component is built from scratch.

---

## 6. Invariants (one testable owner each)

| Invariant | Milestone | Owner |
|-----------|-----------|-------|
| Overlay immobility | A1, B1 | Host unit + demo assertion |
| Classification totality | A1 | Host unit (set algebra over fixture) |
| Facet soundness | A2 | Host unit |
| Search ranking law | A2 | Substrate vitest (P1 scorer) or host unit (host scorer) |
| Query round-trip | A2 | Host unit |
| Diff honesty | B1 | Host unit |
| Verb purity | B1 | Host unit |
| Collapse conservation | B2 | Adapter unit |
| Annotation discipline | C1 | Host unit + acceptance row |
| Answer copy fidelity | A1 | Host unit |
| A11y discipline | All | Host component test |
| Transcript independence | All | Carried #29 — nothing puts graph code on transcript path |

Platform track invariants (P1/P2): walk determinism, scorer law, union conservation — substrate vitest.

---

## 7. Test strategy — deliberately un-brittle

**Rule: laws in substrate (vitest), acceptance rows in host (e2e), pixels nowhere.**

| Layer | What | Discipline |
|-------|------|------------|
| Substrate vitest (Platform track) | Walk laws, scorer law, union laws | Seeded fixtures; set equality and order-stability, never DOM snapshots |
| Substrate demo | One: `trace.html` + one spec under `playwright.demo.config.ts` | Content counts and `data-*` via deterministic clock; **no `waitForTimeout`** (#27) |
| Host unit (`session-ui`, `session-graph`) | Classification algebra, verb purity, facet soundness, query round-trip, collapse conservation, annotation discipline, outline copy | Pure functions over canonical fixture; no renderer mocks; stores faked via fixture |
| Host component (Storybook) | Popovers, status bar, note composer, edge peek, group header | `packages/session-graph/component-tests/`; fast, no flake |
| Product e2e (`packages/app/e2e/graph/`) | **≤11 total rows** into existing suite | `data-slot` locators only; poll/predicate waits; assert counts, states, announcements — never class names, colors, i18n prose |
| Capture matrix | Regenerate **once at plan completion** | ≤2 optional frames (trace overlay, collapsed group); annotations stay out until persistence exists (#37) |

**Anti-brittleness rules (carried):** no DOM-depth beyond `data-slot`; no color/style/i18n pinning where a count/state exists; acceptance rows name reader outcomes; no snapshots/pixels/Cartesian captures (#24); a flake gets one isolated rerun, then `test.skip` with TODO.16 note — never a sleep.

**Testing ladder rule #38:** assert at the cheapest layer that can fail. Unit > component > e2e.

### Deferred tests (owner decision, must land before plan close)

B1 shipped without new tests by explicit owner direction. Capture these when the deferred pass runs:

- **Unit:** status-bar verbs are pure over ids; `reviewChanges` classification for a parked turn; keep-only composition after facets; `collapseGroups` conservation; neighbor traversal order; `withAnnotations` adds one node + one `annotates` edge and inherits the target's turn.
- **Component (Storybook):** `GraphStatusBar` verbs, compare chip, scrubber ticks, edge peek, legend edge-kind toggles, note composer, note inspector actions.
- **Product e2e:** select one node ⇒ status bar count; keep-only hides others; scrub-park shows `+n −n ~n` and return-to-live; collapse a group and expand it; toggle an edge kind from the legend; `[`/`]` walk edges; add, edit, copy, and delete a note and find it by search. Keep to `data-slot` assertions and add no sleeps.
 If a unit test can catch it, it doesn't belong in e2e.

---

## 8. Impact inventory (OpenCode diff budget)

| Milestone | Files touched | New components |
|-----------|---------------|----------------|
| **A1** | `cardTemplate.ts`, `GraphDetail.tsx`, `GraphView.tsx`, `GraphMinimap.tsx`, `selectors.ts`, command registry, i18n | — |
| **A2** | `GraphToolbar.tsx`, `GraphSearch.tsx`, `GraphView.tsx`, `profiles.ts`, `selectors.ts`, `session-graph-view.tsx`, i18n | — |
| **B1** | `GraphView.tsx`, `session-graph-view.tsx`, `export.ts`, scrubber wiring, optional compare window kind | `GraphStatusBar.tsx` |
| **B2** | `sessionGraphAdapter.ts`, `GraphView.tsx`, group menu | — |
| **B3** | `GraphPeek.tsx`, `GraphLegend.tsx`, `graph-selection.ts`, edge label build-time code | — |
| **C1** | `vocabulary.ts`, `model.ts`, `build.ts`, `cardTemplate.ts`, `GraphDetail.tsx`, note popover (~60 lines), i18n | Note popover component |
| **Total host** | ~16 existing files | 2 new (`GraphStatusBar.tsx`, note popover) |
| **Substrate** | **Zero in core** | P1: `walks.ts`, scorer; P2: `union.ts` (optional) |

RTL: popovers, status bar, group headers, compare window, note composer use logical properties; `[`/`]` map to direction-relative traversal.

---

## 9. Ownership (extends TODO.15 §7b)

| Capability | Lives in | Why |
|------------|----------|-----|
| Declarative walks; kernel union; default scorer | SpaceGraphJS kernel / `src/navigation` | Generic mechanism; knows nothing of "turn" or "note" |
| Lit/dim/ghost card classes; edge visibility; payload labels | OpenCode host | Host authors card markup and edge labels; `visible` is existing substrate flag |
| Question vocabulary, facet chips, lens toggles, presets, status bar, legend toggles, permalink grammar, outline copy | OpenCode host | Session words; writes substrate parameters |
| `note` / `annotates` vocabulary, note placement, persistence seam | OpenCode host | A note is domain content; substrate already stores arbitrary kinds |
| Walk specs for host questions | OpenCode selectors | `why`/`forwardChain` stay; become walk specs only when trivial |

**Rule:** knows "turn"/"phase"/"file path"/"note" → OpenCode. Knows Node/Edge/Kind/walk/union → SpaceGraphJS. **Carried (#36):** genericity needs a second consumer — P1/P2's consumer is the second host; annotations have no substrate claim.

---

## 10. Interaction model additions

| Interaction | Milestone | Behavior |
|-------------|-----------|----------|
| **"Why?" / "What led here?" / "Related"** (button or `w`/`e`/`r`) | A1 | Lights answer, dims rest; Escape closes; one announcement; positions never move |
| **`[` / `]`** | A1 | Step through lit nodes from selection; a11y mirror follows |
| **Facet popover** | A2 | Text + chips with live kept/total; keep-only scopes; composes with lens/level |
| **Lens domain toggles** | A2 | Presets are shortcuts over same set; "custom" is live state |
| **Scrubber park** | B1 | Turn-scoped map with diff-vs-live overlay; failure ticks; hover peeks |
| **Two-turn compare** | B1 | Select two turns → compare → overlay + "+/−/~" chip (or window) |
| **Group header click** | B2 | Collapse to chip (session-local); stats; context menu; "collapse others" |
| **Edge hover / click** | B3 | Peek names edge and payload; click selects + "trace from here"; legend toggles with counts |
| **Status bar verbs** | B1 | Frame · Keep only · Copy paths · Export subset — pure over selection |
| **Copy answer / copy view** | A1 / A2 | Trace → markdown outline; view → permalink with `lens=&level=&q=` |
| **Add note** (`n` on selection or card menu) | C1 | Composer popover; note card beside target; edit/delete in inspector; announced; scrubbing scopes it |
| **Command palette** | A1 / A2 / C1 | `graph.why`, `graph.compare`, `graph.facets`, `graph.note` |
| **Reduced motion** | All | Overlays and notes apply instantly (`t=1`); nothing new animates |
| **Mobile** | All | No regression: traces, facets, notes render in map-only fallback; status bar collapses to count chip |

---

## 11. Delete list

| Path / symbol | Fate |
|---------------|------|
| Dead `custom` option in lens select | **Deleted in A2**; custom state is the live domain-toggle set |
| `applyProfile` (unused export) | Retained as the pure preset scope helper and exercised by `profiles.test.ts`; the toolbar's live path is `applyFacets` |
| `shortestPath`/`forwardChain` as consumerless exports | Gain A1/B1 consumers; anything still consumerless at plan end is deleted |
| Self-navigating action targets (`file.history`, `symbol.showCallers` → self) | Retarget to trace presets in A1; navigate-to-self is a bug after A |
| Draft-1's four-demo surface | One demo survives; no orphan pages |

Transcript, Layers menu, mouse map (§7.1a), capture strictness untouched.

---

## 12. Open questions — resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | Contract field or host markup for overlays? | Host markup + `visible`; vaulted V109 (stop rule #36) |
| 2 | Renderer-level group collapse? | No — adapter model state; renderer draws it like any node |
| 3 | Should `why`/`forwardChain` migrate to walk specs? | Opportunistically; never rewritten for symmetry |
| 4 | Do traces need animation? | No; classification is instant; reduced motion pins `t=1` |
| 5 | Facet/annotation state persisted? | Session-local now; persistence needs owner — facets V107, notes V113 (app line-comment store) |
| 6 | Where do ghost nodes get positions? | From the model they were removed from; no re-layout |
| 7 | Does the lens select survive A2? | Either way is one line; persisted state is the domain set, not the preset id |
| 8 | Is the runtime preset a mechanism? | No — one profile entry over existing scopes |
| 9 | Is S9 safe to defer? | Yes; A/B/C deliver every claim without it |
| 10 | Does C strain the substrate? | No — a note is a node + edge; substrate already stores arbitrary kinds |
| 11 | Union vs `merge`? | Different ops. `merge` = LWW multi-writer (kept, TODO.14); `union` = read-only mount with namespacing. Both stay. |
| 12 | Does the OS trajectory add runtime now? | No. §0 records the map; P2 ships mount seam as laws + demo with zero product diff — trajectory served by never blocking it, not by pre-building it. |

---

## 13. Stop rules (delta)

- **#30:** exposure before invention — a tested capability with no consumer is unfinished; unused exports are deleted at plan end.
- **#31:** questions are overlays, not modes — no new mode word enters the vocabulary.
- **#32:** one scope pipeline — lens, facets, keep-only, presets all flow through `scopeModel` → derive → diff → incremental → interpolate.
- **#33:** product e2e stays acceptance-level — `data-slot`, counts, states, announcements; structure/style/i18n pinning is a bug in the test.
- **#34:** the capture matrix regenerates once per plan, at completion.
- **#35:** contract changes are single, deliberate events — this plan ships none in core.
- **#36:** genericity needs a second consumer — mechanism substrate-first, presentation host-side; vault, don't pre-build.
- **#37:** reader-authored state is session-local until a persistence owner exists — notes, facets, traces, arrangements all follow; no capture gate depends on it.
- **#38 (new):** testing ladder — assert at the cheapest layer that can fail. Unit > component > e2e.

---

## 14. Idea vault — additions (carried: TODO.15 §12 V95–V102)

| # | Idea | Status | Trigger |
|---|------|--------|---------|
| **V103** | Community-detection auto-grouping | Vault | Fights deterministic-layout law; no consumer |
| **V104** | Natural-language query | **Rejected** | Chips + query string cover it; a DSL is a flake factory |
| **V105** | Edge bundling / curve routing | Vault | Polish with real cost in both leaves |
| **V106** | Cross-session supermap | Deferred (D4) | P2 is the seam; needs single-session evidence (T2.2) |
| **V107** | Facet persistence | Vault | Settings owner (V99 family) |
| **V108** | Trace history (`g` to revisit) | Vault | Cheap host-side later |
| **V109** | Generic overlay states on contract (v4) | Vault | Second host, or a question styling non-card shapes |
| **V110** | Branch-vs-branch compare | Vault | B1 proves the gesture first |
| **V111** | Prominence rules in equalizer | Vault | Second rule kind re-opens layout policy |
| **V112** | "What's new since I left" auto-trace | Vault | Last-visited owner |
| **V113** | Annotation persistence (multi-session) | Vault | App line-comment store is the named seam; C ships session-local |
| **V114** | Pin a trace as a saved group (subgraph-as-node) | Vault | Needs C + a state owner; Blueprints meta-node analog |
| **V115** | Arrangement undo/redo | Vault | Genuine plumbing; manual state already survives |
| **V116** | Card micro-actions (one safe icon) | Vault | Card space precious; detail + palette cover gestures |
| **V117** | Executable flow edges (agent workflows) | Vault | Its own product; append-only + action registry are the seams |
| **V118** | Embed nodes (iframes, live widgets) | Vault | Needs security owner (CSP, sanitization contract) |
| **V119** | Presence and shared cursors | Vault | Collaboration owner; view permalinks are the shareable seed |

---

## 15. Milestone A — **COMPLETE** (host only, no substrate dependency)

### A1 — trace overlay (complete)

**In `packages/session-ui/src/graph/` and `packages/session-graph/src/ui/`:**

1. ✅ `overlay.ts` (new) — `classifyTrace(model, kind, from)` → `TraceOverlay` with `answerIds`, `contextIds`, `answerEdgeIds`, `visibleEdgeIds`; pure functions for `traceWhy`, `traceLedHere`, `traceRelated`, `stepLitNode`, `copyTraceAsOutline`, `isLit`, `isAnswer`, `isEdgeVisible`, `isAnswerEdge`; tested over canonical fixture.
2. ✅ `GraphView.tsx` — trace state (`traceKind`, `traceSource`, `traceOverlay`); "Why / What led here / Related" actions in detail surfaces; `w`/`e`/`r` keys on selection; `[`/`]` stepping through lit nodes; a11y announcements via live region; copy trace outline (clipboard + announcement).
3. ✅ `cardTemplate.ts` — `lit`/`dim` CSS classes via `data-trace` attribute (`answer`/`context`/`dim`); dimmed cards at 35% opacity; answer nodes get distinct styling.
4. ✅ `selectors.ts` — `breadcrumbs()` used for outline copy.
5. ✅ Acceptance tests added in `overlay.test.ts` (10 tests covering all trace functions).
6. ✅ `bun run check` green. **No spacegraphjs commands on day 1.**

**Additional fixes:**
- Fixed `parentIndex` in `session-ui/src/graph/lookup.ts` to correctly map child→parent for `part-of` edges (was inverted).
- Updated `session-graph/src/ui/GraphDetail.tsx`, `GraphPopover.tsx`, `GraphInspector.tsx` to pass trace callbacks.

### A2 — facets, ranked search, lens, permalinks (complete)

1. ✅ `session-ui/src/graph/facets.ts` (new) — `GraphFacets`, `applyFacets`, `facetCounts`, `facetsFromQuery`, `facetsToQuery`, `hasFacets`; one `scopeModel` call plus classification; round-trip and count laws in `facets.test.ts`.
2. ✅ `selectors.ts` — exported `searchText`; added `rankedSearch` using `Navigation.searchBy` with a host scorer (label prefix > label > name > path > body, model-order tie-break). `GraphSearch` uses it.
3. ✅ `GraphToolbar.tsx` — facet popover (text + kind/status chips with live kept/total), per-domain lens toggles, preset shortcuts, and a runtime preset (`session + runtime + verification`, `running`/`pending`). The dead `custom` select option is deleted; custom state is the live set of toggles.
4. ✅ `GraphView.tsx` — facet state drives one `turnScoped → applyFacets → drawn → budget → render` pipeline; `facetQuery` mirrors a permalink; copy-view copies the current `q=`; trace/facet overlays never re-layout.
5. ✅ `budget.ts` — `degreeBudget(model, selection)` boosts the file weight by the hub's traffic and protects the selection; `GraphView` applies it through `applyNodeBudget`.
6. ✅ `graph-permalink.ts` — `?q=` round-trip and view-only links (`#graph?kind:file`); copy-view beside copy-node in `GraphDetail`, `GraphInspector`, and `GraphPopover`.
7. ✅ Three product e2e rows: facet filtering, lens preset/domain toggles, and a view permalink. `bun run check` green.

**Remaining core work:** the **T2.2 evidence run** (§ Gate) and the deferred test pass (§7). Core A/B/C are implemented. If the evidence run fails, stop feature work and publish the finding; if it passes, close the deferred tests and refinements (compare-as-window, header-click collapse, group action menu, `writes` payload labels, annotation persistence V113). The command bridge now reaches the map through the toolbar's Questions menu or the `graph:command` event.

The substrate track (P1/P2) runs in parallel if a second contributor exists, or lands after Milestone A completes, or triggers on second-host demand.