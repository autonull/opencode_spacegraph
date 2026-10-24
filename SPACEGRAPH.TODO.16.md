# SPACEGRAPH.TODO.16 — The Answerable Map: Traces, Facets, Diffs, Group Power, and a First Write Path (draft 3)

**Status:** drafted 2026-10-24, not started. Builds on TODO.15 (S1–S4 complete: memoized pipeline, incremental clock, Layers menu, surfaces, first-class groups). The model and substrate are ahead of the interface; this plan closes the exposure gap, adds the map's first reader-authored content, and records the trajectory toward SpaceGraphJS as a spatial operating environment — **without shipping any of that leap**.

## Progress

| Slice | State | Landed | Remaining |
|-------|-------|--------|-----------|
| **S1 — Traces** | Not started | — | Kernel walks + one demo; host questions (keys, minimap, copy-outline, palette) |
| **S2 — Facets & ranked search** | Not started | — | Substrate default scorer; host chip popover, lens domain toggles, keep-only, degree-aware budget |
| **S3 — Diff overlay & compare** | Not started | — | Scrub-park diff, two-turn compare, diff chip |
| **S4 — Selection verbs** | Not started | — | Frame / keep-only / copy paths / export subset over the existing multi-select |
| **S5 — Group collapse** | Not started | — | Adapter-level collapse, header stats, group actions, collapse-others |
| **S6 — Edge affordances** | Not started | — | Consume existing `edgeClick`/`hoverChange`; legend toggles; payload-bearing edge labels |
| **S7 — View permalinks & the query string** | Not started | — | Hash grammar for lens/level/layout+node; facet state serializes to a shareable one-liner |
| **S8 — Annotations** | Not started | — | Reader-authored notes attached to nodes; the map's first write path |
| **S9 — Action outcome loop (optional)** | Not started | — | Link a `run` action to the turn it produced |
| **S10 — Kernel union, the mount seam (optional, substrate-only)** | Not started | — | Read-only composition of kernels; demo + laws; zero OpenCode diff |

---

## 0. The trajectory: SpaceGraphJS as a spatial operating environment

Taken to its logical conclusion, SpaceGraphJS is a spatial OS: a stable address space of live, addressable, inspectable, actionable entities, projected many ways, arranged spatially, queried textually, and shared as links. This plan does **not** take that leap. It records it so every slice lands on the trajectory instead of across it, and it names the one step (S8: annotations) that turns the map from a read-only projection into a place with authorship — the moment a viewer starts becoming an environment.

| OS concept | Graph primitive | Status |
|------------|-----------------|--------|
| Address space (files, paths) | Stable node ids + permalinks | Have |
| Filesystem | Kernel: append-only, versioned, diffable, mergeable | Have |
| Window manager | Renderer contract: projections + capability flags | Have |
| Desktop / spatial memory | Deterministic layout + manual arrangement that survives rebuilds | Have |
| Process table | Node statuses, runtime lens preset, live tail | Presets in S2; scrubber has turns |
| Shell | Facet chips ↔ serialized query string; permalink grammar | S2/S7 |
| IPC / pipes | Edges; payload-bearing labels; peek (S6). Executable flow edges are V117 | Peek now, flow vaulted |
| Mount | Kernel `union`: read-only composition with namespaced edges | S10 (optional, substrate-only) |
| Permissions / trust | Edge confidence (`explicit`/`structural`/`inferred`) + per-kind visibility toggles | S6 |
| Notifications | A11y announcements (local); digest is V112 | Local now |
| Authoring / write | Annotations (S8); manual arrangement (have); full authoring V114/V115 | First write path in S8 |
| Undo | Arrangement undo | V115 |
| Multi-user | Presence, shared cursors | V119 |
| Package manager | Published npm set + second-host demo | Carried from TODO.3/14 |

**The no-strain rules** (how the OS aspiration stays out of OpenCode's way):

1. Substrate gains mechanism only with a law, a demo, and a named consumer (carries #21/#36). S10's consumer is the second host; OpenCode's diff from S10 is zero.
2. Host vocabulary never enters the substrate. "Note", "turn", "file" stay host-side; the substrate keeps Node/Edge/walk/union.
3. OS-ambition items enter this plan in exactly two shapes: a slice with an OpenCode consumer, or a vault entry with a trigger. Nothing ships "because the OS will want it."
4. The OpenCode diff budget stays ≤ ~16 existing files + 2 new components. When a slice can't fit that, it splits or vaults.

---

## 1. The design in one paragraph

The map can *describe* a session but cannot yet be *asked* a question — and it cannot be *written on*. This plan fixes both, with substrate mechanism only where a generic capability exists: kernel **walks** (S1) power every question; facet chips compose into one scope and serialize into a shareable query string (S2, S7); `reviewChanges` becomes the diff overlay (S3); multi-select, groups, and edges gain the verbs their state already implies (S4–S6); and **annotations** (S8) let a reader pin a note to any node — the first authored content, riding the existing node/edge vocabulary with no substrate change. Everything is a view of the same derive → diff → incremental → interpolate pipeline (stop rule #25 unchanged); classification and authorship never re-layout. No contract bump, no new mode vocabulary, no stateful controller.

Stated measurably:

1. **Ask, don't scan.** Every question from SPACEGRAPH.md §1.1 is one gesture (button or one key) that lights the answer, dims the rest, and is announced once.
2. **Compose, don't preset.** Level × lens × facet × trace are independent parameters feeding one scope-and-classify step.
3. **Sets, not clicks.** Box-select gains verbs; two turns compare; a file's history is a trace preset.
4. **Groups earn their keep.** A group collapses to a labeled chip with stats and offers its members' actions.
5. **Answers are artifacts.** A trace copies as a markdown outline; a scope serializes to a link.
6. **Author, don't just read.** A note attaches to any node, deterministically placed, searchable, exported — and moves nothing.
7. **Positions never move because of a question or a note.** Overlays classify; annotations append; layout is untouched.
8. **No speculative genericity.** Mechanism is substrate (walks, scorer, union); presentation and vocabulary are host until a second consumer appears.

---

## 2. Revision history

**Draft 2 → draft 3 (this revision) — additions, driven by architectural comparison (§3b):**

| Addition | What | Cost |
|----------|------|------|
| **S8 — Annotations** | Reader-authored notes attached to nodes; the comparison table's single biggest missing usability (HyperCard/Obsidian/tldraw lineage) and the OS trajectory's first write path | 1.5 days, host-only |
| **Query string** | Facet state serializes to/from a one-line `q=` in the permalink — the shell seed, Engelbart-style view specifiers | +0.25 on S7 |
| **Degree-aware budget** | `applyNodeBudget` weights from the existing `fileRelations`/degree counts, so caps keep hubs and the selection (Gephi ranking insight) | ~0 on S2 |
| **Payload-bearing edge labels** | `writes` edges carry "+12 −3" in the host-authored label at build time; the S6 peek renders it. `GraphEdge` stays label-only — no model change | ~0 on S6 |
| **S10 — Kernel union** | Read-only mount composition, laws + second-host demo, zero OpenCode diff. Optional | 1 day, substrate-only |
| **§0 trajectory + §3b comparison** | The OS mapping and the gap table, so future slices land on the trajectory | — |

**Draft 1 → draft 2 — cuts** (unchanged, kept for the record):

| Draft 1 machinery | Draft 2 replacement | Saved |
|-------------------|----------------------|-------|
| Contract bump v4 (`state` on node/edge) + leaves + conformance | Host card-markup classes + existing `RenderEdge.visible`; vaulted V109 | ~1.5 days, only cross-repo risk removed |
| Renderer-side group collapse | Adapter-emitted compact group chip (model state) | ~1 day |
| Substrate facet combinator + demo | Host policy over existing selectors | ~1 day |
| Four demo pages | One (`trace.html`) | Maintenance |
| Standalone S7 | Runtime preset rides S2; trace presets ride S1 | 0.5 day |

Net: core **8.25 days** (substrate ≈ 1.75, host ≈ 6.5), optional **+2** (S9, S10). Zero contract changes; one new substrate file family (walks) + optional union; one demo.

---

## 3. Borrowed interaction paradigms (what we take, what we reject)

| Paradigm | Source | What we adopt | Why here |
|----------|--------|---------------|----------|
| Focus+context highlighting | Palantir-style pathfinding, Neo4j Bloom scene actions | The trace: answer lit in card markup, non-answer edges hidden via `visible` | §1.2 hypothesis; no renderer work — cards are host markup |
| Expand-by-relationship | Bloom / Linkurious one-hop expansion | Kernel `walk` `{direction, edgeKind, maxDepth}`; host presets per kind | `traverse` exists; missing piece is edge sets + union |
| Facet panel with live counts | kepler.gl filter histograms, Obsidian filter groups | Chip popover with kept/total counts | 24 kinds made substring search the bottleneck |
| Ego graph with radius | Obsidian local graph depth slider | `walk` `maxDepth` behind the trace affordance | One parameter of the S1 primitive |
| Compound-node collapse | Cytoscape expand-collapse, yEd count badges | Adapter-emitted compact group chip | Renderer draws any sized group; collapse is data |
| Selection toolbar with counts | Figma/tldraw status bars | Status bar verbs over the existing id array | State exists; verbs don't |
| Edge as first-class entity | React Flow, Linkurious tooltips | Consume existing `edgeClick`/`hoverChange`; peek renders kind, confidence, label | Zero substrate cost |
| Legend as control | Map layer toggles | Edge-kind visibility toggles with counts | `RenderEdge.visible` exists |
| **Annotations** | HyperCard notes, Obsidian, tldraw text | Reader-authored `note` nodes attached by an `annotates` edge | The map's first write path; review workflows ("this is the fix"); persistence seam already exists (app line-comment store) |
| **View specifiers** | Engelbart NLS | Facet state serializes into the permalink (`?q=`); chips and one-liner are two views of one scope | Shareable, scriptable questions |
| **Debug wires** | Node-RED live payload preview | Payload-bearing host-authored edge labels; peek shows them | `GraphEdge.label` is host-authored at build time; no model change |
| **Ranking by metric** | Gephi partition/ranking | Degree/relation counts become budget weights | `fileRelations` exists; `applyNodeBudget` takes weights |
| Command palette questions | VS Code / Obsidian palettes | `graph.why`, `graph.compare`, `graph.facets` registry entries | Discoverability without toolbar growth |
| CI timeline ticks | Pipeline status timelines | Scrubber ticks mark failing turns; hover peeks | "Where did it go wrong" at a glance |
| Diff/ghost rendering | Code review metaphors | Ghost = outline card for removed; added lit | `diffKernels` + `reviewChanges` classify |
| Search-to-visualize | Bloom NL search | **Rejected** — chips + query string only; a DSL is a flake factory | |
| Auto-community grouping | Gephi modularity | **Vault** (V103) — groups derive from real structure; detection moves nodes' meaning without a consumer | |

## 3b. Missing functionality found by architectural comparison

What the lineage has that we lack, and where each landed:

| System / lineage | Mechanism we lack | Verdict |
|------------------|-------------------|---------|
| Node-RED, Blueprints, n8n | Authoring wires, ports, subgraph-as-node, comment frames | Ports/wires vaulted (V117 — executable flow edges); comment frames → **S8 annotations**; subgraph-as-node vaulted (V114: pin a trace as a group); undo vaulted (V115) |
| Obsidian / Roam / LogSeq | Reader-authored content in the graph; backlink panes | **S8**; backlinks = inspector's `why` + incoming (have) |
| Jupyter | Live cells with inline controls | Statuses have it; card micro-actions vaulted (V116 — one icon button per card, safe `navigate` subset only) |
| Gephi | Metric-driven styling and budget | **S2** degree weights; full ranking vaulted (V111 prominence rules) |
| Palantir | Saved scopes, workspaces | Query-string permalinks (**S7**) are the seed; team workspaces vaulted (V119) |
| Cytoscape | Expand/collapse, context menus | **S5**; group menus ride the action registry |
| TouchDesigner / ComfyUI | Executable graphs (run the picture) | **Vaulted** (V117) — the agent-workflow editor is a product of its own; the kernel's append-only + action registry are the seams it would use |
| tldraw / Excalidraw / Miro | Free authoring, snap, laser, presence | Authoring seeds in **S8**; snap/undo/presence vaulted (V115/V119) |
| Engelbart NLS | View specifiers as first-class shareable specs | **S7** query string |
| HyperCard | The canvas as an authoring OS for non-experts | The trajectory (§0); S8 is the first step, deliberately tiny |

---

## 4. Slices (core est. 8.25 days; optional +2)

| Slice | Days | Where | Delivers |
|-------|------|-------|----------|
| **S1 — Traces** | 2.5 | kernel + demo (1.5), host (1) | Kernel `walks.ts`: `walk(kernel, {starts, steps: [{direction, edgeKind}], maxDepth})` → `{nodes, edges}`; `pathsBetween(from, to)` union. Laws: order stability, union idempotence, empty starts → empty result. Demo `trace.html` + spec (deterministic, `advance(t)`, no sleeps). Host: "Why / What led here / Related" on cards and detail; one-key `w`/`e`/`r`; `[`/`]` step lit nodes; lit marks in the minimap; copy answer as markdown outline; `graph.*` palette commands; one announcement, a11y mirror lists lit first; trace presets replace self-navigating actions (`file.history`, `package.dependencies`, `symbol.showCallers`) |
| **S2 — Facets & ranked search** | 1.5 | substrate scorer (0.25), host (1.25) | Substrate: default scorer for `searchBy` (label-prefix > name > path > body; model-order tie-break) — the only generic piece. Host: facet popover (text + kind/status/domain chips, live kept/total); lens per-domain toggles, presets as shortcuts, "custom" reachable or the select deleted; "keep only these" through the existing `scopeModel` path; runtime lens preset (session + runtime domains, `running`/`pending`, latest test-run); **degree-aware budget weights** from `fileRelations` (hubs and selection survive caps); search popover adopts ranked results with kind badges |
| **S3 — Diff overlay & compare** | 1 | host | Scrub-park on turn N ⇒ diff parked vs live (`reviewChanges` → lit/ghost markup, non-answer edges hidden); "+12 −3 ~7" chip; two-turn compare from multi-select; optional compare-as-window (windows machinery exists); scrubber failure ticks + hover peek |
| **S4 — Selection verbs** | 0.5 | host | Status bar: count + frame / keep-only / copy paths / export subset (export gains an id-set overload). Pure over the id array |
| **S5 — Group collapse** | 0.5 | host | Adapter emits collapsed group (compact chip, `data.memberCount`, stats from `data.members`); header click toggles, session-local; "collapse others"; group context menu reuses the action registry; budget `protectedIds` keeps selected members on expand |
| **S6 — Edge affordances** | 0.5 | host | Edge hover → peek (kind, confidence, label); `writes` edges carry "+n −m" in the build-time label, so the peek has a payload; edge click selects + "trace from here"; legend edge-kind toggles with counts; `[`/`]` traversal |
| **S7 — View permalinks & query string** | 0.75 | host | `#graph:<layout>:<nodeID>?lens=&level=&q=` — appended params, existing permalinks keep parsing; facet state serializes/round-trips through `q=`; copy-view beside copy-node; a pasted link lands the reader inside the question |
| **S8 — Annotations** | 1.5 | host | `note` node kind + `annotates` edge kind (host vocabulary); "add note" from selection or card; note cards render beside their target (deterministic placement, own lane discipline); searchable, exported, announced; inspector body for notes (edit, delete, copy); scrubber scopes notes with their target's turn. Session-local first — the app's line-comment store is the named persistence seam (V113), not this plan. Substrate: nothing — a note is just a node |
| **S9 — Action outcome loop (optional)** | 1 | host | Tag the turn a `run` action produces with a `produced-by` edge to the origin node; lit-trace it once. Deferred; touches prompt-time bookkeeping |
| **S10 — Kernel union, the mount seam (optional)** | 1 | substrate only | `union(kernels, {namespace})`: read-only composition, edge ids namespaced per source, provenance preserved; laws: disjoint namespaces, stable order, no mutation of inputs; second-host demo mounts two fixtures side by side. **Zero OpenCode diff.** Trigger: D4 cross-session demand or platform work; `merge` (LWW) stays the multi-writer story — union is the read-only mount, a different operation |

**Order:** S1 first (the question gesture everything reuses), S2–S3 (scopes and comparisons), S4–S6 small and independent, S7 anytime after S2, S8 after S3 (needs stable classification to sit beside), S9/S10 only on request. **Acceptance rows: ≤ +14 total.**

---

## 5. Invariants (one testable owner each)

- **Overlay immobility (S1/S3):** a trace/facet/diff changes no node position and yields an empty `moved` set. Owner: host unit + demo assertion.
- **Classification totality (S1):** every node id is exactly `answer` | `ambient`; every edge is in the answer set or hidden. Owner: host unit (set algebra over the fixture).
- **Walk determinism (S1):** same spec ⇒ same `{nodes, edges}` in model order; union order-stable. Owner: kernel `bun test`.
- **Facet soundness (S2):** scope = intersection of chips; counts = kept set; cleared chips restore the model. Owner: host unit.
- **Search ranking law (S2):** prefix > substring; ties keep model order; empty query returns nothing. Owner: substrate vitest.
- **Query round-trip (S7):** `parse(serialize(state)) === state`; a serialized link restores level, lens, scope, and selection. Owner: host unit.
- **Diff honesty (S3):** ghost set = exactly `reviewChanges(before, after).removed`. Owner: host unit.
- **Verb purity (S4):** no verb mutates the model; keep-only uses the lens's `scopeModel` path. Owner: host unit.
- **Collapse conservation (S5):** expanding re-emits every member byte-identical; non-members never move; the group's manual box survives. Owner: adapter unit.
- **Annotation discipline (S8):** a note attaches only to an existing node; adding/removing a note changes no other node's position; a note without its target is garbage-collected with it; note placement is deterministic given (target, ord). Owner: host unit + acceptance row.
- **Union conservation (S10):** `union` output contains each input unchanged (namespace aside); edges cross kernels only via namespaced ids; inputs never mutate. Owner: kernel `bun test`.
- **Answer copy fidelity (S1):** the outline names exactly the lit nodes in trace order, one breadcrumb line each. Owner: host unit.
- **A11y discipline (all):** one announcement per open/close; per-frame silence; lit nodes lead the mirror; note add/edit announces once. Owner: host component test.
- **Transcript independence (carried #29):** nothing here puts graph code on the transcript path.

---

## 6. Test strategy and discipline — deliberately un-brittle

**The rule: laws in the substrate, acceptance rows in the host, pixels nowhere.**

| Layer | What | Discipline |
|-------|------|------------|
| Substrate vitest | Walk laws, scorer law, union laws | Seeded fixtures; set equality and order-stability, never DOM snapshots |
| Substrate demo | One: `trace.html` + one spec under `playwright.demo.config.ts` | Content counts and `data-*` via the deterministic clock; **no `waitForTimeout`** (stop rule #27) |
| Host unit | Classification algebra, verb purity, facet soundness, query round-trip, collapse conservation, annotation discipline, outline copy | Pure functions over the canonical fixture; no renderer mocks; session-local stores faked via fixture, not globalThis |
| Product e2e | **≤3 rows per slice**, into the existing suite | `data-slot` locators only; poll/predicate waits; assert counts, states, announcements — never class names, colors, i18n prose |
| Capture matrix | Regenerate **once at plan completion** | ≤2 optional new frames (trace overlay, collapsed group); annotations stay out of the committed set until persistence exists (stop rule #37) |

Anti-brittleness rules (carried): no DOM-depth assertions beyond `data-slot`; no color/style/i18n pinning where a count or state exists; acceptance rows name reader outcomes; no snapshots, no pixel diffs, no Cartesian captures (carries #24); a flake gets one isolated rerun, then `test.skip` with a TODO.16 note — never a sleep.

---

## 7. Impact inventory (OpenCode diff budget)

- **S1:** `cardTemplate.ts` (lit/dim/ghost classes + related action), `GraphDetail.tsx`, `GraphView.tsx` (trace state, `w/e/r`, `[`/`]`), `GraphMinimap.tsx` (lit marks), `selectors.ts` (outline copy), command registry entry, i18n, +3 rows.
- **S2:** `GraphToolbar.tsx` (popover + lens toggles), `GraphSearch.tsx` (ranked + badges), `GraphView.tsx` (scope composition + degree weights), `profiles.ts` (runtime preset; `applyProfile` consumed or deleted), `selectors.ts`, i18n, +3 rows.
- **S3:** `GraphView.tsx`/scrubber wiring, `session-graph-view.tsx`, optional compare window kind, i18n, +2 rows.
- **S4:** `GraphStatusBar.tsx` (new), `export.ts` (id-set overload), +2 rows.
- **S5:** `sessionGraphAdapter.ts`, `GraphView.tsx`, group menu, +2 rows.
- **S6:** `GraphPeek.tsx` (edge case), `GraphLegend.tsx` (toggles + counts), `graph-selection.ts`, build-time edge labels, +2 rows.
- **S7:** `session-graph-view.tsx` (hash + `q=`), +1 row.
- **S8:** `vocabulary.ts`/`model.ts` (`note`, `annotates`), `build.ts` (attach + deterministic placement), `cardTemplate.ts` (note card), `GraphDetail.tsx` (note body), a note composer popover (~60 lines), i18n, +2 rows.
- **S9 (if started):** prompt-time bookkeeping + one edge kind.
- **S10:** **zero OpenCode files.** Substrate: `packages/kernel/src/union.ts` + tests + second-host demo section.
- **Total host budget:** ~16 existing files + 2 new components (`GraphStatusBar.tsx`, note popover). Substrate: `walks.ts` (+ optional `union.ts`), one scorer, one demo.

RTL note: popovers, status bar, group headers, compare window, and the note composer use logical properties; `[`/`]` map to direction-relative traversal.

## 7b. Ownership additions (extends TODO.15 §7b)

| Capability | Lives in | Why |
|------------|----------|-----|
| Declarative walks; kernel union; default scorer | SpaceGraphJS kernel / `src/navigation` | Generic mechanism; knows nothing of "turn" or "note" |
| Lit/dim/ghost card classes; edge visibility; payload labels | OpenCode host | Host authors card markup and edge labels; `visible` is an existing substrate flag |
| Question vocabulary, facet chips, lens toggles, presets, status bar, legend toggles, permalink grammar, outline copy | OpenCode host | Session words; writes substrate parameters |
| `note` / `annotates` vocabulary, note placement, note persistence seam | OpenCode host | A note is domain content; the substrate already stores arbitrary node kinds — nothing generic to build |
| Walk specs for host questions | OpenCode selectors | `why`/`forwardChain` stay; become walk specs only when trivial |

**Rule unchanged:** knows "turn"/"phase"/"file path"/"note" → OpenCode. Knows Node/Edge/Kind/walk/union → SpaceGraphJS. **Carried:** genericity needs a second consumer (#36) — union's second consumer is the second host; annotations have no substrate claim to resist.

---

## 8. Interaction model additions

| Interaction | Behavior |
|-------------|----------|
| **"Why?" / "What led here?" / "Related"** — button, or `w`/`e`/`r` | Lights the answer, dims the rest; Escape closes; one announcement; positions never move |
| **`[` / `]`** | Step through lit nodes from the selection; a11y mirror follows |
| **Facet popover** | Text + chips with live kept/total; keep-only scopes; composes with lens/level through one scope path |
| **Lens domain toggles** | Presets are shortcuts over the same set; "custom" is live state |
| **Scrubber park** | Turn-scoped map with diff-vs-live overlay; failure ticks; hover peeks before parking |
| **Two-turn compare** | Select two turns → compare → overlay + "+/−/~" chip (or a compare window) |
| **Group header click** | Collapse to chip (session-local); stats; context menu; "collapse others" |
| **Edge hover / click** | Peek names the edge and its payload; click selects and offers "trace from here"; legend toggles kinds with counts |
| **Status bar verbs** | Frame · Keep only · Copy paths · Export subset — pure over the selection |
| **Copy answer / copy view** | Trace → markdown outline; view → permalink with `lens=&level=&q=` — the question is the link |
| **Add note** (`n` on selection, or card menu) | Composer popover; note card renders beside its target; edit/delete in the inspector; announced once; scrubbing scopes it with its target |
| **Command palette** | `graph.why`, `graph.compare`, `graph.facets`, `graph.note` |
| **Reduced motion** | Overlays and notes apply instantly (`t=1`); nothing new animates |
| **Mobile** | No regression: traces, facets, and notes render in the map-only fallback; status bar collapses to a count chip |

---

## 9. Delete list

| Path / symbol | Fate |
|---------------|------|
| Dead `custom` option in the lens select | Reachable via toggles, or deleted — decided in S2 |
| `applyProfile` (unused export) | Consumed by the lens menu or deleted (stop rule #17) |
| `shortestPath`/`forwardChain` as consumerless exports | Gain S1/S3 consumers; anything still consumerless at plan end is deleted |
| Self-navigating action targets (`file.history`, `symbol.showCallers` → self) | Retarget to trace presets in S1; navigate-to-self is a bug after this plan |
| Draft-1's four-demo surface | One demo survives; no orphan pages |

The transcript, the Layers menu, the mouse map (§7.1a), and capture strictness are untouched.

---

## 10. Open questions — resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | Contract field or host markup for overlays? | Host markup + `visible`; vaulted V109 (stop rule #36) |
| 2 | Renderer-level group collapse? | No — adapter model state; the renderer draws it like any node |
| 3 | Should `why`/`forwardChain` migrate to walk specs? | Opportunistically; never rewritten for symmetry |
| 4 | Do traces need animation? | No; classification is instant; reduced motion pins `t=1` |
| 5 | Facet/annotation state persisted? | Session-local now; persistence needs an owner — facets V107, notes V113 (the app's line-comment store is the named seam) |
| 6 | Where do ghost nodes get positions? | From the model they were removed from; no re-layout |
| 7 | Does the lens select survive S2? | Either way is one line; persisted state is the domain set, not the preset id |
| 8 | Is the runtime preset a mechanism? | No — one profile entry over existing scopes |
| 9 | Is S9 safe to defer? | Yes; S1–S8 deliver every claim without it |
| 10 | Does S8 strain the substrate? | No — a note is a node and an edge; the substrate stores arbitrary kinds already. The OS trajectory gains its write path with zero substrate diff |
| 11 | Union vs `merge`? | Different operations. `merge` is LWW multi-writer (kept, TODO.14); `union` is read-only mount with namespacing. Both stay; neither replaces the other |
| 12 | Does the OS trajectory add runtime now? | No. §0 records the map; S10 ships the mount seam as laws + a second-host demo with zero product diff — the trajectory is served by never blocking it, not by pre-building it |

---

## 11. Stop rules (delta)

- **#30:** exposure before invention — a tested capability with no consumer is unfinished; unused exports are deleted at plan end.
- **#31:** questions are overlays, not modes — no new mode word enters the vocabulary.
- **#32:** one scope pipeline — lens, facets, keep-only, presets all flow through `scopeModel` → derive → diff → incremental → interpolate.
- **#33:** product e2e stays acceptance-level — `data-slot`, counts, states, announcements; structure/style/i18n pinning is a bug in the test.
- **#34:** the capture matrix regenerates once per plan, at completion.
- **#35:** contract changes are single, deliberate events — this plan ships none.
- **#36:** genericity needs a second consumer — mechanism substrate-first, presentation host-side; vault, don't pre-build.
- **#37 (new):** reader-authored state is session-local until a persistence owner exists — notes, facets, traces, and arrangements all follow the same rule (generalizes the V99 family); no capture frame or gate may depend on it.

---

## 12. Idea vault — additions (carried: TODO.15 §12 V95–V102)

| # | Idea | Status | Trigger |
|---|------|--------|---------|
| **V103** | Community-detection auto-grouping | Vault | Would fight the deterministic-layout law; no consumer |
| **V104** | Natural-language query | **Rejected** | Chips + query string cover it; a DSL is a flake factory |
| **V105** | Edge bundling / curve routing | Vault | Polish with real cost in both leaves |
| **V106** | Cross-session supermap | Deferred (carried D4) | S10 is the seam; needs single-session evidence (T2.2) |
| **V107** | Facet persistence | Vault | Settings owner (V99 family) |
| **V108** | Trace history (`g` to revisit asked questions) | Vault | Cheap host-side later |
| **V109** | Generic overlay states on the contract (v4) | Vault | Second host, or a question styling non-card shapes |
| **V110** | Branch-vs-branch compare | Vault | S3 proves the gesture first |
| **V111** | Prominence rules in the equalizer | Vault | A second rule kind re-opens layout policy |
| **V112** | "What's new since I left" auto-trace | Vault | Last-visited owner |
| **V113** | Annotation persistence (multi-session notes) | Vault | The app's line-comment store is the named seam; S8 ships session-local |
| **V114** | Pin a trace as a saved group (subgraph-as-node) | Vault | Needs S8 + a state owner; Blueprints meta-node analog |
| **V115** | Arrangement undo/redo | Vault | Genuine plumbing; manual state already survives, so the cost is a stack, not a model |
| **V116** | Card micro-actions (one safe icon button per card) | Vault | Card space is precious; detail + palette cover the gestures |
| **V117** | Executable flow edges (agent-workflow graphs) | Vault | Its own product; append-only kernel + action registry are the seams |
| **V118** | Embed nodes (iframes, live widgets) | Vault | Needs a security owner (CSP, sanitization contract) |
| **V119** | Presence and shared cursors | Vault | Collaboration owner; view permalinks are the shareable seed |

---

## 13. Day 1 (Slice 1)

In `spacegraphjs/` (nested repo, `main`):

1. `packages/kernel/src/walks.ts` — `walk(kernel, spec)` → `{nodes, edges}`; `pathsBetween(kernel, from, to, {maxDepth})` union. `bun test` laws: order stability, union idempotence, empty starts → empty result, edge sets exactly the traversed edges.
2. `demo/trace.html` + `test/e2e/trace.spec.ts` — deterministic fixture; presets cycle through walks; asserts lit/hidden counts and one silent live region via `advance(t)`.
3. `src/navigation/search.ts` — default scorer (label-prefix > name > path > body; model-order tie-break) + vitest law (host adopts in S2).
4. `pnpm run build:packages` → kernel green → OpenCode `bun run check` green. **No contract, leaf, or conformance changes exist in this plan.**

Then the host wiring (still S1): trace buttons and `w/e/r`, `[`/`]`, minimap lit marks, copy-outline, palette commands, one announcement, +3 acceptance rows. S8 (annotations) starts only after S3 lands, so notes can sit beside a stable classification surface.
