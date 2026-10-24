# SPACEGRAPH.TODO.16 — The Answerable Map: Traces, Facets, Diffs, and Group Power (draft 2)

**Status:** drafted 2026-10-24, not started. Builds on TODO.15 (S1–S4 complete: memoized pipeline, incremental clock, Layers menu, surfaces, first-class groups). The model and substrate are ahead of the interface; this plan closes the exposure gap with substrate mechanism only where a generic capability exists, and host composition everywhere else.

## Progress

| Slice | State | Landed | Remaining |
|-------|-------|--------|-----------|
| **S1 — Traces** | Not started | — | Kernel walks + one demo; host questions (keys, minimap, copy-outline, palette) |
| **S2 — Facets & ranked search** | Not started | — | Substrate default scorer; host chip popover, lens domain toggles, keep-only |
| **S3 — Diff overlay & compare** | Not started | — | Scrub-park diff, two-turn compare, diff chip |
| **S4 — Selection verbs** | Not started | — | Frame / keep-only / copy paths / export subset over the existing multi-select |
| **S5 — Group collapse** | Not started | — | Adapter-level collapse, header stats, group actions, collapse-others |
| **S6 — Edge affordances** | Not started | — | Consume existing `edgeClick`/`hoverChange`; legend edge-kind toggles with counts |
| **S7 — View permalinks** | Not started | — | Hash grammar for lens/level/layout+node |
| **S9 — Action outcome loop (optional)** | Not started | — | Link a `run` action to the turn it produced |

---

## 1. The design in one paragraph

The map can *describe* a session but cannot yet be *asked* a question. Every high-leverage gap is an exposure gap, not a model gap: `why`/`forwardChain` are computed and buried; `reviewModel` is tested and invisible; multi-select is a state without verbs; groups are containers without collapse; edges have contract events no host listens to. This plan adds **one small substrate surface** — declarative **walks** in the kernel — and composes everything else from parts that already exist: dim/lit is the host's own card markup (the host owns card markup by architecture) plus the existing `visible` flags for edges; collapse is the adapter emitting a compact group instead of a renderer state; facets are host policy over existing selectors. Questions, scopes, and comparisons are *views of the same derive → diff → incremental → interpolate pipeline* (stop rule #25 unchanged), classified at draw time, never re-laid-out. No contract bump, no new mode vocabulary, no stateful controller.

Stated measurably:

1. **Ask, don't scan.** Every investigative question from SPACEGRAPH.md §1.1 is one gesture (button or one key) that lights the answer, dims the rest, and is announced once.
2. **Compose, don't preset.** Level × lens × facet × trace are independent parameters feeding one scope-and-classify step.
3. **Sets, not clicks.** Box-select gains verbs; two selected turns compare; a selected file's history is a trace preset.
4. **Groups earn their keep.** A group collapses to a labeled chip with stats, and offers its members' actions.
5. **Answers are artifacts.** A trace or comparison can be copied as a markdown outline — the map exports *answers*, not just images.
6. **Positions never move because of a question.** Overlays classify; they never enter layout.
7. **No speculative genericity.** Mechanism is substrate (walks, scorer); presentation of host-owned markup is host. A contract change waits for a second consumer.

---

## 2. What draft 2 changed, and why it costs less

| Draft 1 machinery | Draft 2 replacement | Saved |
|-------------------|----------------------|-------|
| Contract bump to v4: `state: 'lit' \| 'dim' \| 'ghost'` on `RenderNode`/`RenderEdge`, implemented by all three leaves + conformance | The host already authors card markup (`cardTemplate.ts`) — lit/dim/ghost are CSS classes in that markup; non-answer **edges** use the existing `RenderEdge.visible`. Vaulted as V109 until a second host or a non-card shape needs it (stop rule #36) | ~1.5 days; removes the only cross-repo risk and the only version bump |
| Group `collapsed` as a renderer contract state, leaves redraw bounds and badges | Collapse is a **model state**: the adapter emits the group as a compact chip with `data.memberCount` and omits members; expand re-emits them. Manual group size already survives rebuild (TODO.15). Renderer untouched | ~1 day + conformance |
| Substrate facet combinator + `facets.html` demo | Facets are **policy**: which chips exist is session vocabulary. Host filters over `GraphViewData` with existing selectors; unit-tested. No new substrate API ⇒ no demo owed (stop rule #23 applies to substrate features) | ~1 day |
| Four demo pages (`trace`, `facets`, `diff-overlay`, `groups-collapse`) | One demo (`trace.html`) — walks is the only new substrate API. Diff and collapse are host-tested + app-e2e | Ongoing maintenance per demo |
| `applyProfile` consumed via preset refactors | Lens presets become one-click shortcuts over the same domain toggles; keep-or-delete the unused export in the same change (stop rule #17) | — |
| S7 as its own slice (runtime preset + trace presets) | Dissolved: runtime preset joins S2 (one profile entry); trace presets join S1 (one walk-spec map over existing action ids) | 0.5 day of overhead |

Net: **9.5 → 7.0 days** (substrate ≈ 1.75, host ≈ 5.25), zero contract changes, one new substrate file, one demo — and draft 2 ships *more* reader capability per slice (§4).

---

## 3. Borrowed interaction paradigms (what we take, what we reject)

| Paradigm | Source | What we adopt | Why here |
|----------|--------|---------------|----------|
| Focus+context highlighting | Palantir-style pathfinding, Neo4j Bloom scene actions | The trace: answer subgraph lit in card markup, non-answer edges hidden via `visible` | The §1.2 hypothesis; no renderer work because cards are host markup |
| Expand-by-relationship | Bloom / Linkurus one-hop expansion | Kernel `walk` with `{direction, edgeKind, maxDepth}`; host presets per kind | `traverse` exists; missing piece is edge sets + union |
| Facet panel with live counts | kepler.gl filter histograms, Obsidian graph filter groups | Chip popover: kind × status × domain × text with kept/total counts | 24 kinds made substring search the bottleneck |
| Ego graph with radius | Obsidian local graph depth slider | `walk` `maxDepth` behind the trace affordance | One parameter of the S1 primitive |
| Compound-node collapse | Cytoscape expand-collapse, yEd collapsed groups with count badges | Adapter-emitted compact group chip: label + count + stats | Renderer already draws any sized group node; collapse is data |
| Selection toolbar with counts | Figma/tldraw status bars | Status bar: "4 selected — frame · keep · copy paths · export" | `graph-selection.ts` already holds the array |
| Edge as first-class entity | React Flow edge selection, Linkurious edge tooltips | Consume the **existing** `edgeClick`/`hoverChange(kind:'edge')` events; peek explains an edge | Zero substrate cost |
| Legend as control | Map layer toggles | Legend edge kinds become visibility toggles with counts (`writes · 47`) | `RenderEdge.visible` already exists |
| Command palette questions | VS Code / Obsidian palettes | Register `graph.why`, `graph.compare`, `graph.facets` in the app command registry | Discoverability without toolbar growth |
| CI timeline ticks | Pipeline status timelines | Scrubber ticks mark turns containing failures; hover peeks the turn label before parking | "Where did it go wrong" at a glance |
| Diff/ghost rendering | Code review metaphors | Ghost = outline-styled card for removed nodes; added lit, changed accented | `diffKernels` + `reviewChanges` give the classification |
| Search-to-visualize | Bloom's natural-language search | **Rejected** — facet chips only. A query DSL is a second language and a flake factory | |
| Auto-community grouping | Gephi modularity classes | **Vault** (V103) — groups derive from real structure; detection has no consumer | |

---

## 4. Slices (est. 7.0 days; substrate ≈ 1.75, host ≈ 5.25; one optional)

| Slice | Days | Where | Delivers |
|-------|------|-------|----------|
| **S1 — Traces** | 2.5 | kernel + demo (1.5), host (1) | Kernel `walks.ts`: `walk(kernel, {starts, steps: [{direction, edgeKind}], maxDepth})` → `{nodes, edges}`; `pathsBetween(from, to)` union. Laws: order stability, union idempotence, empty starts → empty result. Demo `trace.html` + spec (deterministic, `advance(t)`, no sleeps). Host: "Why / What led here / Related" on cards and detail; one-key questions `w`/`e`/`r` on selection; `[`/`]` step lit nodes; lit marks in the minimap; **copy answer as markdown outline** (breadcrumbs render it); `graph.*` palette commands; live region announces question + answer size; a11y mirror lists lit first; trace presets replace the self-navigating actions (`file.history`, `package.dependencies`, `symbol.showCallers`) |
| **S2 — Facets & ranked search** | 1.5 | substrate scorer (0.25), host (1.25) | Substrate: default scorer for `searchBy` (label-prefix > name > path > body; model-order tie-break) — the only generic piece. Host: facet popover (text + kind/status/domain chips, live kept/total counts); lens menu gains per-domain toggles, presets become shortcuts, "custom" becomes reachable (or the select dies — one line either way); "keep only these" writes the scope through the existing `scopeModel` path; runtime lens preset lands here (session + runtime domains, `running`/`pending`, latest test-run); search popover adopts ranked results with kind badges |
| **S3 — Diff overlay & compare** | 1 | host | Park the scrubber on turn N ⇒ diff parked model vs live (`reviewChanges` classification → lit/ghost markup, non-answer edges hidden); status chip "+12 −3 ~7"; two-turn compare from multi-select; optional compare-as-window (a new window kind — windows machinery exists); scrubber failure ticks + hover peek; +2 rows |
| **S4 — Selection verbs** | 0.5 | host | Status bar with count + verbs: frame selection, keep-only (scope), copy all paths, export subgraph (existing export gains an id-set overload). Pure over the id array |
| **S5 — Group collapse** | 0.5 | host | Adapter emits collapsed group (compact chip, `data.memberCount`, stats line from `data.members`); header click toggles, session-local; "collapse others" for siblings; group context menu reuses the action registry (`directory`/`package`); budget `protectedIds` keeps selected members visible on expand |
| **S6 — Edge affordances** | 0.5 | host | Edge hover → peek (kind, confidence, label); edge click selects + "trace from here"; legend edge-kind visibility toggles with counts; `[`/`]` traversal over `incoming`/`outgoing` |
| **S7 — View permalinks** | 0.5 | host | `#graph:<layout>:<nodeID>?lens=&level=` — appended params, existing permalinks keep parsing; copy-view beside copy-node |
| **S9 — Action outcome loop (optional)** | 1 | host | Tag the turn a `run` action produces with a `produced-by` host edge to the origin node; lit-trace it once. Deferred: only on a concrete request; touches prompt-time bookkeeping |

**Order:** S1 first (walks + the question gesture everything reuses), S2–S3 (scopes and comparisons), S4–S6 small and independent, S7 anytime, S9 last if ever. **Acceptance rows: ≤ +12 total across the plan.**

---

## 5. Invariants (one testable owner each)

- **Overlay immobility (S1/S3):** a trace/facet/diff changes no node position and produces an empty `moved` set. Owner: host unit test on the classification pipeline + substrate demo assertion.
- **Classification totality (S1):** every node id is exactly one of `answer` | `ambient`; every edge is in the answer set or hidden. Owner: host unit test (set algebra over the fixture).
- **Walk determinism (S1):** same spec ⇒ same `{nodes, edges}` in model order; multi-path union order-stable. Owner: kernel `bun test`.
- **Facet soundness (S2):** a scope equals the intersection of its chips; counts equal the kept set; clearing all chips restores the full model. Owner: host unit test.
- **Search ranking law (S2):** prefix > substring; ties keep model order; empty query returns nothing. Owner: substrate vitest.
- **Diff honesty (S3):** the ghost set is exactly `reviewChanges(before, after).removed`. Owner: host unit test.
- **Verb purity (S4):** no verb mutates the model; keep-only is the same `scopeModel` path the lens uses. Owner: host unit test.
- **Collapse conservation (S5):** expanding re-emits every member byte-identical (position, size, data); non-members never move; the group's manual box survives. Owner: adapter unit test.
- **Answer copy fidelity (S1):** the markdown outline names exactly the lit nodes in trace order, with one breadcrumb line each. Owner: host unit test — cheap, and it makes the export an assertion target instead of a snapshot.
- **A11y discipline (all):** one announcement on open/close; per-frame silence; lit nodes lead the mirror. Owner: host component test.
- **Transcript independence (carried #29):** nothing here adds graph code to the transcript path.

---

## 6. Test strategy and discipline — deliberately un-brittle

**The rule: laws in the substrate, acceptance rows in the host, pixels nowhere.**

| Layer | What | Discipline |
|-------|------|------------|
| Substrate vitest | Walk laws, scorer law | Seeded fixtures; set equality and order-stability, never DOM snapshots |
| Substrate demo | One: `trace.html` + one spec under `playwright.demo.config.ts` | Assert content counts and `data-*` via the deterministic clock; **no `waitForTimeout`** (stop rule #27) |
| Host unit (`session-ui`, `session-graph`) | Classification algebra, verb purity, facet soundness, collapse conservation, hash grammar, outline copy | Pure functions over the canonical fixture; no renderer mocks |
| Product e2e (`packages/app/e2e/graph/`) | **≤3 rows per slice**, into the existing suite | `data-slot` locators only; poll/predicate waits; assert counts, states, announcements — never class names, colors, or i18n prose |
| Capture matrix | Regenerate **once at plan completion** | Stops screenshot-hash churn mid-development; ≤2 optional new frames (trace overlay, collapsed group) |

Anti-brittleness rules:

- Never assert DOM structure deeper than a `data-slot`.
- Never assert theme colors, computed styles, or i18n strings where a data attribute or count exists.
- An acceptance row names a *reader outcome*, not a widget.
- No snapshot tests, no pixel diffs, no Cartesian capture explosion (carries #24).
- A flake gets one isolated rerun, then a `test.skip` with a TODO.16 note — never a sleep.

---

## 7. Impact inventory (OpenCode diff budget)

- **S1:** `cardTemplate.ts` (lit/dim/ghost classes + related action), `GraphDetail.tsx` + `GraphView.tsx` (trace state, `w/e/r`, `[`/`]`), `GraphMinimap.tsx` (lit marks), `selectors.ts` (outline copy), command registry entry, i18n, +3 rows.
- **S2:** `GraphToolbar.tsx` (popover + lens toggles), `GraphSearch.tsx` (ranked + badges), `GraphView.tsx` (scope composition), `profiles.ts` (runtime preset; `applyProfile` consumed or deleted), `selectors.ts`, i18n, +3 rows.
- **S3:** `GraphView.tsx`/scrubber wiring, `session-graph-view.tsx`, optional compare window kind, i18n, +2 rows.
- **S4:** `GraphStatusBar.tsx` (new, the only new component in the plan), `export.ts` (id-set overload), +2 rows.
- **S5:** `sessionGraphAdapter.ts` (collapsed emission), `GraphView.tsx` (toggle state), group menu, +2 rows.
- **S6:** `GraphPeek.tsx` (edge case), `GraphLegend.tsx` (toggles + counts), `graph-selection.ts`, +2 rows.
- **S7:** `session-graph-view.tsx` (hash), +1 row.
- **Substrate total:** one kernel file (`walks.ts`) + tests, one scorer + tests, one demo + spec. No contract, leaf, or conformance changes.

RTL note: popovers, status bar, group headers, and the compare window use logical properties; `[`/`]` map to direction-relative traversal, not visual left/right.

## 7b. Ownership additions (extends TODO.15 §7b)

| Capability | Lives in | Why |
|------------|----------|-----|
| Declarative walks (`{nodes, edges}` unions, multi-path) | SpaceGraphJS kernel | Generic traversal; knows nothing of "turn" |
| Default search scorer | SpaceGraphJS `src/navigation` | Generic field weighting over `searchBy` |
| Lit/dim/ghost as card classes; edge answer visibility | OpenCode host | The host authors card markup; `visible` is an existing substrate flag |
| Question vocabulary, facet chips, lens toggles, presets, status bar, legend toggles, permalink grammar, outline copy | OpenCode host | Session words; writes substrate parameters |
| Walk specs for host questions | OpenCode `session-ui` selectors | `why`/`forwardChain` stay; they may *become* walk specs when trivial, never rewritten for symmetry |

**Rule unchanged:** knows "turn"/"phase"/"file path" → OpenCode. Knows Node/Edge/Kind/walk → SpaceGraphJS. **New:** genericity that only one host will consume is host code until a second consumer appears (stop rule #36).

---

## 8. Interaction model additions

| Interaction | Behavior |
|-------------|----------|
| **"Why?" / "What led here?" / "Related"** — button, or `w`/`e`/`r` on selection | Lights the answer, dims the rest; Escape or re-key closes; one announcement; positions never move |
| **`[` / `]`** | Step through lit nodes (or related nodes) from the selection; a11y mirror follows |
| **Facet popover** | Text + chips with live kept/total; "Keep only these" scopes; composes with lens/level through one scope path |
| **Lens domain toggles** | Presets are shortcuts over the same set; "custom" is a live state |
| **Scrubber park** | Turn-scoped map with diff-vs-live overlay; failure ticks on the rail; hover peeks before parking |
| **Two-turn compare** | Select two turns → compare → overlay + "+/−/~" chip (or a compare window) |
| **Group header click** | Collapse to chip (session-local); stats line; context menu; "collapse others" |
| **Edge hover / click** | Peek names the edge; click selects and offers "trace from here"; legend toggles edge kinds with counts |
| **Status bar verbs** | Frame · Keep only · Copy paths · Export subgraph — pure over the selection |
| **Copy answer / copy view** | Trace → markdown outline (breadcrumb per lit node); view → permalink with lens/level |
| **Command palette** | `graph.why`, `graph.compare`, `graph.facets` — the questions are one keystroke from anywhere |
| **Reduced motion** | Overlays apply instantly (`t=1`); nothing new animates |
| **Mobile** | No regression: traces and facets render in the map-only fallback; the status bar collapses to a count chip |

---

## 9. Delete list

| Path / symbol | Fate |
|---------------|------|
| Dead `custom` option in the lens select | Reachable via toggles, or the select is deleted — one line, decided in S2 |
| `applyProfile` (unused export) | Consumed by the lens menu or deleted (stop rule #17) |
| `shortestPath`/`forwardChain` as consumerless exports | Gain S1/S3 consumers; anything still consumerless at plan end is deleted |
| Self-navigating action targets (`file.history`, `symbol.showCallers` → re-select self) | Retarget to trace presets in S1; navigate-to-self is a bug after this plan |
| Four-demo draft-1 surface | One demo survives; no orphan demo pages to maintain |

The transcript, the Layers menu, the mouse map (§7.1a), and capture strictness are untouched.

---

## 10. Open questions — resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | Contract field or host markup for overlay states? | Host markup + `visible`. A contract field is presentation genericity with one consumer; vaulted as V109 (stop rule #36) |
| 2 | Renderer-level group collapse? | No. The adapter owns what the model holds; a compact group node is data. The renderer draws it like any node |
| 3 | Should `why`/`forwardChain` migrate to walk specs? | Opportunistically only. Rewrites churn host tests for symmetry |
| 4 | Do traces need animation? | No. Classification is instant; reduced motion pins `t=1` regardless |
| 5 | Facet state persisted? | No — session-local, like the scrubber's open state; persistence is V99/V107's settings-owner question |
| 6 | Where do ghost nodes get positions? | From the model they were removed from; no re-layout ever |
| 7 | Does the lens select survive S2? | Either way is one line; persisted state is the domain set, not the preset id |
| 8 | Is the runtime preset a mechanism? | No — one profile entry over existing scopes; it rides S2 for free |
| 9 | Is S9 safe to defer? | Yes. S1–S8 deliver every claim without it; it is the only slice touching prompt-time bookkeeping |

---

## 11. Stop rules (delta)

- **#30 (new): exposure before invention.** A tested model capability with no UI consumer is an unfinished slice, not a finished one. Unused exports are deleted at plan end.
- **#31 (new): questions are overlays, not modes.** Trace/facet/diff are view classifications composible with surfaces and levels; no new mode word enters the vocabulary.
- **#32 (new): one scope pipeline.** Lens, facets, keep-only, and presets flow through `scopeModel` → derive → diff → incremental → interpolate. A second scoping path needs a stated reason (carries #25).
- **#33 (new): product e2e stays acceptance-level.** `data-slot` locators, counts, states, announcements. A test pinning DOM structure, computed style, or i18n prose is a bug in the test.
- **#34 (new): the capture matrix regenerates once per plan, at completion.** Slices do not churn committed screenshots.
- **#35 (new): contract changes are single, deliberate events — and this plan ships none.** The next bump bundles accumulated demand (see V109).
- **#36 (new): genericity needs a second consumer.** Substrate-first applies to *mechanism* (walks, scorer, diff); presentation of host-owned markup stays host until a second host asks. Vault, don't pre-build.

---

## 12. Idea vault — additions (carried: TODO.15 §12 V95–V102)

| # | Idea | Status | Trigger |
|---|------|--------|---------|
| **V103** | Community-detection auto-grouping | Vault | Would fight the deterministic-layout law; no consumer |
| **V104** | Natural-language query | **Rejected** | Facet chips cover the real questions; a DSL is a maintenance surface |
| **V105** | Edge bundling / curve routing | Vault | Polish with real cost in both leaves |
| **V106** | Cross-session supermap over `issue`/`branch` | Deferred (carried D4) | Single-session win measured first (T2.2) |
| **V107** | Facet persistence per session | Vault | Same settings owner as V99 |
| **V108** | Trace history (a stack of asked questions, `g` to revisit) | Vault | Cheap host-side later; not needed for the first asking gesture |
| **V109** | Generic overlay states on the renderer contract (v4 `state`/`collapsed`) | Vault | A second host, or a question that must style non-card shapes (dots, edges) generically |
| **V110** | Branch-vs-branch compare (commit/branch nodes) | Vault | S3's two-state compare proves the gesture first |
| **V111** | Prominence rules in the equalizer (opacity/emphasis, not just size) | Vault | Equalizer engine exists, but a second rule kind re-opens layout policy |
| **V112** | "What's new since I left" auto-trace on session open | Vault | Needs a last-visited owner (settings, as V99) |

---

## 13. Day 1 (Slice 1)

In `spacegraphjs/` (nested repo, `main`):

1. `packages/kernel/src/walks.ts` — `walk(kernel, spec)` → `{nodes, edges}`; `pathsBetween(kernel, from, to, {maxDepth})` union. `bun test` laws: order stability, union idempotence, empty starts → empty result, edge sets exactly the traversed edges.
2. `demo/trace.html` + `test/e2e/trace.spec.ts` — deterministic fixture; presets cycle through walks; asserts lit/hidden counts and one silent live region via `advance(t)`.
3. `src/navigation/search.ts` — default scorer (label-prefix > name > path > body; model-order tie-break) + vitest law (adopted by the host in S2).
4. `pnpm run build:packages` → kernel green → OpenCode `bun run check` green. **No contract, leaf, or conformance changes exist in this plan.**

Then the host wiring (still S1): trace buttons and `w/e/r`, `[`/`]`, minimap lit marks, copy-outline, palette commands, one announcement, +3 acceptance rows.
