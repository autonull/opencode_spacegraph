# SPACEGRAPH.TODO.16 — The Answerable Map: Traces, Facets, Diffs, and Group Power (draft 1)

**Status:** drafted 2026-10-24, not started. Builds on TODO.15 (S1–S4 complete: memoized pipeline, incremental clock, Layers menu, surfaces, first-class groups). The model and substrate are ahead of the interface; this plan closes the exposure gap with **substrate-first mechanics** and thin host wiring.

## Progress

| Slice | State | Landed | Remaining |
|-------|-------|--------|-----------|
| **S1 — Trace overlay** | Not started | — | Contract overlay states, kernel walks, trace demo; host question buttons |
| **S2 — Facets & ranked search** | Not started | — | Substrate facet combinator + default scorer; host chip popover, lens domain toggles, keep-only scope |
| **S3 — Diff overlay** | Not started | — | Diff demo; host scrub-park diff and two-turn compare |
| **S4 — Selection verbs** | Not started | — | Status bar, frame/scope/copy/export verbs over the existing multi-select |
| **S5 — Group collapse** | Not started | — | Contract `collapsed` state; host collapse toggle, header stats, group actions |
| **S6 — Edge affordances** | Not started | — | Host consumption of the existing `edgeClick`/`hoverChange`; legend edge-kind toggles |
| **S7 — Runtime & traversal presets** | Not started | — | Runtime "now" preset; file-history/package-deps as trace presets |
| **S8 — View permalinks** | Not started | — | Hash grammar for lens/level/layout+node |
| **S9 — Action outcome loop (optional)** | Not started | — | Link a `run` action to the turn it produced |

---

## 1. The design in one paragraph

The map can *describe* a session but cannot yet be *asked* a question. Every high-leverage gap is an exposure gap, not a model gap: `why`/`forwardChain`/`shortestPath` are computed and buried; `reviewModel` is tested and invisible; multi-select is a state without verbs; groups are containers without collapse; edges have contract events no host listens to. This plan adds **one new substrate surface — overlay states** (lit/dim/ghost on nodes and edges) — and one kernel surface — **declarative walks** returning `{nodes, edges}` sets. Everything else is composition: traces, facets, diffs, collapses, and selection verbs are *views of the same derive → diff → incremental → interpolate pipeline* (stop rule #25 unchanged), classified at draw time, never re-laid-out. No new mode vocabulary, no second layout path, no stateful controller.

Stated measurably:

1. **Ask, don't scan.** Every investigative question from SPACEGRAPH.md §1.1 is one gesture that lights the answer and dims the rest, announced once by the live region.
2. **Compose, don't preset.** Level × lens × facet × trace are independent parameters; any combination is legal because they all feed one scope-and-classify step.
3. **Sets, not clicks.** Box-select gains verbs; two selected turns compare; a selected file's history is a trace preset.
4. **Groups earn their keep.** A group collapses, reports its stats, and offers its members' actions.
5. **Positions never move because of a question.** Overlays classify nodes (lit/dim/ghost); they never enter layout. Stability law untouched.
6. **Substrate-first.** Generic mechanism lands in `spacegraphjs/` with a demo page and laws; OpenCode consumes finished APIs.

---

## 2. Borrowed interaction paradigms (what we take, what we reject)

| Paradigm | Source | What we adopt | Why here |
|----------|--------|---------------|----------|
| Focus+context highlighting | Palantir-style pathfinding, Neo4j Bloom scene actions | The trace overlay: answer subgraph lit, all else dimmed to `surfaceMuted` | The core §1.2 hypothesis; `edgeMuted` theme token already exists |
| Expand-by-relationship | Bloom / Linkurious one-hop expansion | Kernel `walk` with `{direction, edgeKind, maxDepth}`; host presets per kind | `traverse` already exists; missing piece is edge sets + union |
| Facet/filter panel with live counts | kepler.gl filter histograms, Obsidian graph filter groups | Chip popover: kind × status × domain × text with kept/total counts | 24 kinds made plain substring search the bottleneck |
| Ego graph with radius | Obsidian local graph depth slider | `walk` with `maxDepth` behind a trace "depth" affordance, not a permanent lens | Radius walk is one parameter of the S1 primitive |
| Compound-node collapse | Cytoscape expand-collapse, yEd collapsed groups with count badges | Group `collapsed` state: members leave the draw, header keeps label+count | Groups shipped in TODO.15 without reader-controlled collapse |
| Selection toolbar with counts | Figma/tldraw status bars | Graph status bar: "4 selected — frame · keep · copy paths · export · compare" | `graph-selection.ts` already holds the id array |
| Edge as first-class entity | React Flow edge selection, Linkurious edge tooltips | Consume the **existing** `edgeClick`/`hoverChange(kind:'edge')` contract events; peek explains an edge | Zero substrate cost; the events are already in `RendererEventMap` |
| Legend as control | Map layer toggles | Legend edge kinds become visibility toggles (writes `RenderEdge.visible`) | `visible` already exists on both node and edge |
| Diff/ghost rendering | Code review metaphors | `state: 'ghost'` for removed nodes in a comparison; added lit, changed outlined | `diffKernels` gives the classification; clock gives the animation |
| Search-to-visualize | Bloom's natural-language search | **Rejected** — facet chips only. A query DSL is a second language to maintain and a new kind of brittleness | |
| Auto-community grouping | Gephi modularity classes | **Vault** (V103) — groups derive from real structure (directories, packages, turns); detection has no consumer yet | |

---

## 3. Verified substrate facts (what already exists, unused)

| Fact | Consequence for this plan |
|------|---------------------------|
| `RendererEventMap` already has `edgeClick: {id}` and `hoverChange: {id?, kind?: 'node' \| 'edge'}` (`packages/renderer/src/index.ts:183-193`) | S6 is host-only: consume events, no contract change |
| `RenderEdge.visible` and `RenderNode.visible` exist | Edge-kind toggles are pure render-model filtering; no contract change |
| `RenderTheme` already carries `surfaceMuted`, `textMuted`, `edgeMuted` | Dim/lit/ghost styles bind to existing semantic tokens; no theme additions unless contrast laws demand them |
| Kernel `query(kernel).traverse(start, {direction, edgeKind, maxDepth})` and `path(from, to)` exist (`packages/kernel/src/query.ts`) | S1's walk primitive extends, not replaces: add `{nodes, edges}` returns and multi-start union |
| `searchBy(model, query, scoreFn, limit)` exists in `spacegraphjs/navigation` | Ranked search is a host swap plus a substrate default scorer; no new search engine |
| `applyNodeBudget` accepts `protectedIds` (TODO.15) | Collapse and facets compose with budget: selected/expanded members survive |
| Contract version is 3; both renderer leaves + SVG implement against a shared conformance suite | The one contract bump this plan needs (`state`, `collapsed`) is a deliberate, single event: version 4, all leaves updated in the same change |
| `reviewModel`/`reviewChanges` exist host-side over `diffKernels`, with zero UI references | S3's classification is already built and tested; only the render mapping and gestures are new |
| Host `graph-selection.ts` stores `readonly string[]` with primary-first | S4 verbs need no new state shape |

---

## 4. Slices (est. 9.5 days; substrate 5.5, host 4.5, one optional)

| Slice | Days | Where | Delivers |
|-------|------|-------|----------|
| **S1 — Trace overlay** | 3.5 | renderer contract + kernel + demo, then host | Contract: `state?: 'lit' \| 'dim' \| 'ghost'` on `RenderNode`/`RenderEdge` (CONTRACT_VERSION 3→4). Kernel `walks.ts`: declarative walk `{starts, steps: [{direction, edgeKind}], maxDepth}` returning `{nodes, edges}` unions; multi-path between two ids. Demo `trace.html` (deterministic fixture, cycle presets via `advance(t)`, no sleeps). Host: "Why / What led here / Related" actions on cards and detail; keyboard `[`/`]` step related nodes; live region announces the question and its answer size; a11y lists lit nodes first. |
| **S2 — Facets & ranked search** | 3 | kernel/navigation + demo, then host | Substrate: facet combinator (kind/status/field predicates, kept/total counts per facet) in `src/navigation`; default scorer for `searchBy` (label-prefix > name > path > body; stable tie-break by model order). Demo `facets.html`. Host: toolbar facet popover with chips + live counts; lens menu gains per-domain toggles (presets become shortcuts, "custom" becomes reachable — closes the dead `custom` option); "keep only these" writes a scope through the existing `scopeModel` path; search popover uses ranked results and shows kind badges. |
| **S3 — Diff overlay** | 2 | demo, then host | Demo `diff-overlay.html`: two snapshots through derive → `diffKernels` → lit/ghost classification → clock. Host: parking the scrubber on turn N *is* the comparison view (overlay diff of parked model vs live model); two-turn compare via S4's selection; "removed" draws ghost, "added" lit, "changed" outlined — classification from `reviewChanges`, mapping through the S1 contract states. |
| **S4 — Selection verbs** | 1 | host | Status bar under the canvas: count + verbs — frame selection, keep-only (scope), copy all paths (files), export subgraph (existing export gains an id set), compare (two turns → S3). No new state: verbs read the existing selection array. |
| **S5 — Group collapse** | 2 | renderer contract + leaves + demo, then host | Contract: group `collapsed?: boolean`; leaves redraw bounds from stored group size, badge counts members. Demo `groups-collapse.html`. Host: group header click collapses/expands (per-group state beside global semantic zoom, session-local); header shows stats (members, writes, failing tests) read from `data.members`; group context menu reuses the existing action registry for `directory`/`package`. Budget `protectedIds` keeps selected members visible when a group expands. |
| **S6 — Edge affordances** | 1 | host (+ conformance check) | Edge hover → peek (kind, confidence, label); edge click selects and offers trace-from-edge; legend edge kinds become visibility toggles; `[`/`]` traversal from selection over `incoming`/`outgoing`. Verify contract events against the conformance suite; add one interaction spec assertion in the substrate only if the suite lacks edge coverage. |
| **S7 — Runtime & traversal presets** | 1 | host | Lens preset "runtime" (session + runtime domains, statuses `running`/`pending`, latest test-run) — one preset entry, no new mechanism. `file.history`, `package.dependencies`, `symbol.showCallers` become trace presets (S1 overlay id sets) instead of node jumps. |
| **S8 — View permalinks** | 0.5 | host | Extend the hash grammar: `#graph:<layout>:<nodeID>?lens=&level=` — appended params, so existing node permalinks keep parsing; copy-view command beside the existing copy-node. |
| **S9 — Action outcome loop (optional)** | 1 | host | When a `run` action fires, tag the resulting turn with a `produced-by` host edge back to the origin node, and lit-trace it once. Start only if a reviewer asks for the act→observe arc; it touches prompt-time bookkeeping and is not required by S1–S8. |

**Dependency order:** S1 first (contract bump + states everything else draws with), then S2–S3 (compose states), S4–S5 (verbs + collapse), S6–S8 are independent and small. S9 optional, last.

---

## 5. Invariants (one testable owner each)

- **Overlay immobility (S1):** a trace/facet/diff changes no node position. Law: `layoutGraph(model)` before === after classification; the clock sees an empty `moved` set. Owner: substrate vitest + demo.
- **Overlay totality (S1):** every node/edge is exactly one of lit/dim/ghost/default. Owner: contract conformance; host unit test on the classification function.
- **Walk determinism (S1):** `walk` returns the same `{nodes, edges}` for the same spec, in model order; multi-path union is order-stable. Owner: kernel `bun test`.
- **Facet soundness (S2):** a scope built from facets equals the intersection of its predicates; counts equal the kept set; removing all chips restores the full model. Owner: substrate vitest.
- **Search ranking law (S2):** prefix match ranks before substring; equal scores keep model order; the empty query returns nothing (never everything). Owner: substrate vitest.
- **Diff honesty (S3):** the ghost set is exactly `reviewChanges(before, after).removed`; nothing else is ghosted. Owner: host unit test over the fixture.
- **Selection verb safety (S4):** every verb is pure over the id set: no verb changes the model; keep-only is the same `scopeModel` path the lens uses. Owner: host unit test.
- **Collapse conservation (S5):** expanding a collapsed group restores every member's position exactly; collapse never moves any non-member; the group's own manual position/size survive (TODO.15 contract). Owner: substrate vitest + conformance.
- **A11y discipline (all):** a trace/facet/diff announces one view-change sentence at open and close; per-frame and per-node changes stay silent; lit nodes lead the a11y mirror. Owner: host component test + demo spec (silent live region between announcements).
- **Transcript independence (carried #29):** nothing in this plan adds graph code to the transcript path.

---

## 6. Test strategy and discipline — deliberately un-brittle

**The rule: laws in the substrate, acceptance rows in the host, pixels nowhere.**

| Layer | What | Discipline |
|-------|------|------------|
| Substrate vitest (`spacegraphjs/test/`) | Walk laws, facet soundness, ranking law, collapse conservation, overlay totality | Seeded fixtures; set equality and order-stability, never DOM snapshots |
| Substrate demos | `trace.html`, `facets.html`, `diff-overlay.html`, `groups-collapse.html` + one spec each under `playwright.demo.config.ts` | Assert content counts and `data-*` state via the deterministic clock; **no `waitForTimeout`** (stop rule #27); no console-error sweeps beyond the existing shared spec |
| Contract conformance | `state`/`collapsed` behaviors asserted for every leaf renderer (spacegraph, cytoscape, SVG) | Conformance additions are behavioral (opacity class present, badge count), not visual |
| Host unit (`session-ui`, `session-graph`) | Classification functions, verb purity, preset wiring, hash grammar | Pure function tests over the canonical fixture; no renderer mocks |
| Product e2e (`packages/app/e2e/graph/`) | **≤3 new rows per slice**, added to the existing suite | `data-slot` locators only; poll/predicate waits (existing harness); assert counts, states, and announcements — never class names, never colors, never i18n prose |
| Capture matrix | **Regenerate once at plan completion**, not per slice | Stops screenshot-hash churn mid-development; the committed set gains at most two optional frames (trace overlay, collapsed group) |

Explicit anti-brittleness rules:

- Never assert DOM structure deeper than a `data-slot`.
- Never assert theme colors, computed styles, or i18n strings where a data attribute or count exists.
- Prefer deleting a stale assertion over pinning a new one; an acceptance row names a *reader outcome*, not a widget.
- No snapshot tests, no pixel diffs, no Cartesian capture explosion (TODO.15 #24 carries).
- A flake gets one isolated rerun, then a `test.skip` with a TODO.16 follow-up note — never a sleep.

---

## 7. Impact inventory (OpenCode diff budget — minimize, then minimize again)

- **S1:** host: `GraphDetail.tsx`, `GraphView.tsx` (trace state + keyboard), `cardTemplate.ts` (related action), i18n keys, +2 acceptance rows. Substrate carries the contract bump, walks, demo, conformance.
- **S2:** host: `GraphToolbar.tsx` (facet popover, lens toggles), `GraphSearch.tsx` (ranked + badges), `GraphView.tsx` (scope composition), `selectors.ts` (adopt `searchBy`), i18n, +3 rows.
- **S3:** host: `GraphView.tsx`/scrubber wiring, `session-graph-view.tsx`, +2 rows. Demo in substrate.
- **S4:** host: `GraphView.tsx`, new `GraphStatusBar.tsx`, `export.ts` (id-set overload), +2 rows.
- **S5:** host: `GraphView.tsx` (collapse state), `sessionGraphAdapter.ts` (collapsed groups), `GraphDetail.tsx`/`GraphToolbar` (group menu), +2 rows.
- **S6:** host: `GraphPeek.tsx` (edge case), `GraphLegend.tsx` (toggles), `graph-selection.ts` (edge-aware traversal), +2 rows.
- **S7:** host: `profiles.ts` (+1 preset), `actions.ts` (trace targets), +1 row.
- **S8:** host: `session-graph-view.tsx` (hash), +1 row.
- **Total host diff target:** ~14 files touched, ~10 of them existing; new files: `GraphStatusBar.tsx` only. All i18n keys namespaced under the existing `ui.sessionGraph.*`.

RTL note: popovers, the status bar, and group headers must use logical properties per the repo's RTL-aware expectations; the trace `[`/`]` keys must map to direction-relative traversal, not visual left/right.

## 7b. Ownership additions (extends TODO.15 §7b)

| Capability | Lives in | Why |
|------------|----------|-----|
| Overlay states (`lit`/`dim`/`ghost`) | SpaceGraphJS renderer contract + leaves | Generic drawing vocabulary; version 4 |
| Declarative walks (`{nodes, edges}` unions, multi-path) | SpaceGraphJS kernel | Generic traversal; domain knows nothing of "turn" |
| Facet combinator + default search scorer | SpaceGraphJS `src/navigation` | Generic over node fields; host maps domain vocabulary |
| Diff classification → overlay mapping | SpaceGraphJS demo (pattern); host render mapping | `diffKernels` already generic; the mapping is one function |
| Group `collapsed` state + badge geometry | SpaceGraphJS renderer contract + leaves | Generic container behavior |
| Question vocabulary (why/led-here/related), facet chips, presets, status bar, permalink grammar, legend toggles | OpenCode host | Session words; writes substrate parameters |
| Walk specs for host questions | OpenCode `session-ui` selectors | `why`/`forwardChain` stay; they may *become* walk specs when trivial, never rewritten for symmetry's sake |

**Rule unchanged:** knows "turn"/"phase"/"file path" → OpenCode. Knows Node/Edge/Kind/Position/walk → SpaceGraphJS.

---

## 8. Interaction model additions

| Interaction | Behavior |
|-------------|----------|
| **"Why?" / "What led here?" / "Related"** (card or detail button) | Computes the id set, lights it, dims the rest; Escape or re-click closes; one a11y announcement; positions never move |
| **`[` / `]`** | Step to previous/next lit/related node from the selection; a11y mirror follows |
| **Facet popover** | Text + chips (kind, status, domain); live kept/total counts; "Keep only these" scopes; chips compose with lens/level (one scope pipeline) |
| **Lens domain toggles** | Presets are one-click shortcuts over the same domain set; "custom" is a live state, not a dead option |
| **Scrubber park** | Shows the turn-scoped map with diff-vs-live overlay (added lit, removed ghost); live tail keeps updating |
| **Two-turn compare** | Select two turns → status bar "compare" → same overlay |
| **Group header click** | Collapse/expand (session-local); header stats line; context menu with the group kind's actions |
| **Edge hover / click** | Peek names the edge (kind + confidence); click selects it and offers "trace from here"; legend toggles edge-kind visibility |
| **Status bar verbs** | Frame · Keep only · Copy paths · Export subgraph · Compare — pure functions of the selection |
| **Reduced motion** | Overlays apply at `t=1` instantly (clock law carries); nothing animates that wasn't already |
| **Mobile** | Out of scope beyond "no regression": facets/traces must render in the map-only fallback; the status bar collapses to a count chip |

---

## 9. Delete list

| Path / symbol | Fate |
|---------------|------|
| Dead `custom` option in the lens select (`GraphToolbar.tsx`) | Becomes reachable state via domain toggles, or deleted if toggles replace the select |
| `applyProfile` (unused export, `profiles.ts`) | Delete or make the lens menu consume it — one consumer must exist (stop rule #17) |
| `shortestPath`/`forwardChain` as unused exports | Gain S1/S3 consumers (detail trace, compare); any still consumerless selector is deleted, not kept "for later" |
| Action navigate targets that only re-select the current node (`file.history`, `symbol.showCallers` today) | Retarget to trace overlays in S7; a navigate-to-self action is a bug after this plan |

The transcript, the Layers menu, the mouse map (§7.1a), and the capture strictness are untouched.

---

## 10. Open questions — resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | New contract field or `data`-driven styling? | Contract field. `data` styling would push drawing policy into every host; states are renderer vocabulary (version 4) |
| 2 | Should `why`/`forwardChain` migrate to walk specs? | Only opportunistically. Rewrites churn host tests for symmetry; the walk primitive exists for demos and future hosts |
| 3 | Does a trace need animation? | No. Classification is instant; the only animation is the existing clock for diff-removed ghosts, and reduced motion pins `t=1` |
| 4 | Facet state persisted? | No. Session-local like the scrubber's open state; persistence is V99's settings-owner question, still closed |
| 5 | Where do ghost nodes get positions? | From the model they were removed from — the diff classification carries the position; no re-layout ever |
| 6 | Does the lens select survive S2? | Presets become shortcut chips; if the select goes, the migration is one release note line, not a persisted-state break (lens domains persist, the preset id does not) |
| 7 | Is S9 safe to defer? | Yes. It is the only slice touching prompt-time bookkeeping; S1–S8 deliver the plan's claims without it |
| 8 | Do we gate overlay states behind a capability? | No. All three leaves implement v4 (SVG renders opacity); a capability would let a leaf silently drop the plan's core vocabulary |

---

## 11. Stop rules (delta)

- **#30 (new): exposure before invention.** A tested model capability with no UI consumer is an unfinished slice, not a finished one. Unused exports are deleted at plan end.
- **#31 (new): questions are overlays, not modes.** Trace/facet/diff are view classifications composible with surfaces and levels; no new mode word enters the vocabulary.
- **#32 (new): one scope pipeline.** Lens, facets, keep-only, and presets all flow through `scopeModel` → derive → diff → incremental → interpolate. A second scoping path needs a stated reason (carries #25).
- **#33 (new): product e2e stays acceptance-level.** `data-slot` locators, counts, states, announcements. A test that pins DOM structure, computed style, or i18n prose is a bug in the test.
- **#34 (new): the capture matrix regenerates once per plan, at completion.** Slices do not churn committed screenshots.
- **#35 (new): contract bumps are single, deliberate events.** All leaves, the conformance suite, and both demo hosts move together in one change.

---

## 12. Idea vault — additions (carried: TODO.15 §12 V95–V102)

| # | Idea | Status | Why not now |
|---|------|--------|-------------|
| **V103** | Community-detection auto-grouping (Gephi modularity) | Vault | Groups derive from real structure; detection has no consumer and would fight the deterministic-layout law if it moved nodes |
| **V104** | Natural-language query (Bloom-style) | **Rejected** | Facet chips cover the real questions; a DSL is a maintenance surface and a new flake factory |
| **V105** | Edge bundling / curve routing | Vault | Edge labels already avoid content; bundling is polish with real cost in both leaves |
| **V106** | Cross-session supermap over `issue`/`branch` kinds | Deferred (carried D4) | Single-session win must be measured first (T2.2) |
| **V107** | Facet persistence per session | Vault | Same settings owner as V99; ships session-local first |
| **V108** | Trace history (a stack of asked questions, `g` to revisit) | Vault | Cheap to add later host-side; not needed for the first asking gesture |

---

## 13. Day 1 (Slice 1)

In `spacegraphjs/` (nested repo, `main`):

1. `packages/kernel/src/walks.ts` — `walk(kernel, spec)` returning `{nodes, edges}`; `pathsBetween(kernel, from, to, {maxDepth})` returning the union of shortest paths' nodes and edges. `bun test` laws: order stability, union idempotence, empty starts → empty result.
2. `packages/renderer/src/index.ts` — `state?: 'lit' | 'dim' | 'ghost'` on `RenderNode` and `RenderEdge`; `collapsed?: boolean` on groups can land here too (S5 needs it; one bump, one conformance pass). `CONTRACT_VERSION` → 4.
3. Leaves: spacegraph-renderer and cytoscape-renderer implement the three states (opacity + outline classes from the existing muted theme tokens); svg-renderer renders them as static opacity. Conformance suite grows the behavioral assertions.
4. `demo/trace.html` + `test/e2e/trace.spec.ts` — deterministic fixture; presets cycle through walks; asserts lit/dim counts and one silent live region via `advance(t)`.
5. `pnpm run build:packages` → kernel + renderer + leaves green → OpenCode `bun run check` green (host untouched on day 1).

Then the host wiring (still S1): trace buttons on card/detail, `[`/`]` stepping, a11y announcement, +2 acceptance rows.
