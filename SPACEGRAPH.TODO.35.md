# SpaceGraph: Remaining Work & Delivery Plan (v35)

> **Status (2026-11-11):** M0 foundation repair, M1 memory/decisions, M2 authoring/orchestration, and
> M3 widgets/cost are complete (M0.1–M0.10, M1.1–M1.2, M2.1–M2.4, M3.1–M3.2). One canonical capture
> gate and suite tags are in place. Phases 14–19.11 are complete. `SPACEGRAPH.TODO.34.md` is the frozen
> design and history reference; this file is the single source of truth for remaining work.
>
> **Baseline:** through Phase 19.11 at `r6` below. Canonical local suites: `packages/session-ui`
> `bun test src/graph` 338 tests / 33 files, `packages/session-graph` `bun test src` 97 / 12,
> `packages/gui-plugins` `bun run test` 1,162 / 115 (1 skip), and root `bun run check` green
> (53/53). Session-graph component suite: the two new widget/cost specs pass; the known pre-existing
> narrow-sheet geometry failure remains (see r5).
>
> **Next:** M4 performance and scale, then M5 navigation/attention/layout breadth.

### Session handoff

- M0–M3 are done. Start with **M4**.
- Node widgets now cover todo (`todowrite`), a small diff (`edit`/`write`/`patch`/`apply_patch`),
  and a read-only terminal snapshot (shell result). The model picker and permission-prompt summary
  are **parked** (M3.1): the plugin SDK exposes no model catalog and the graph carries no permission
  request, so neither could save a click without duplicating the host.
- The cost lens is `graph_cost_lens`-gated and shows tokens, wall time, and tool counts on turn
  cards plus the session total. Streaming turns show a `~` range. Heat sizing was not built because
  it would force a relayout; it stays optional.
- Notes and pins are session-local durable annotations. Notes live in the plugin session store and
  export with the map; pins live in the same store and mark every surface's card. Neither is
  foregrounded: both stay behind the selected-node status bar until a study says otherwise.
- Lineage is host navigation, not model causality. `GraphLineage` names the fork, parent, and
  delegated children from node data; `onOpenSession` opens them. The session model still draws no
  cross-session edge. Drill-down is capped at widget 1, popover 2, full map 3 (`maxDrillDepth`).
- The compaction advisor is **parked** (M1.2): it does not beat the keep-all baseline on the
  canonical fixture. Keep the component and the `graph_compaction_advisor` flag; do not foreground it.
- The bundled graph copy is generated: edit `packages/session-ui/src/graph`, then run
  `bun run sync:graph` in `packages/gui-plugins`. `bun run check:graph` (also run by `bun test`)
  fails on drift, and `packages/gui-plugins/src/spacegraph/graph-parity.test.ts` proves behavior
  parity.
- Capture: `packages/app/e2e/graph/capture.spec.ts` is the only canonical gate and runs only with
  `GRAPH_CAPTURE_DIR` (set by `bun run graph:capture`). `capture-live`, `capture-clips`, and
  `capture-segment1` are opt-in demo recordings (`GRAPH_CAPTURE_DEMO=1`).
- The committed screenshot set predates the Phase 16.3 "Map this turn" affordance. `--mode=verify`
  still captures and compares the full set, but reports pre-existing pixel drift; re-blessing needs a
  reference render environment and belongs with the M7 visual review, not the capture refactor.
- Known component failure: `graph-refine.spec.ts` "inspector becomes a bottom sheet" fails its
  40%-height assertion on this machine and reproduces on unmodified `HEAD` (299–316 px against a
  372.8 px threshold). It is not an M2 regression; fix it during M6 with a real narrow-viewport
  measurement or by dismissing the first-run banner before measuring.
- Canonical checks: `bun run check` at the root; `bun test src/graph` in `packages/session-ui`;
  `bun test src` in `packages/session-graph`; `bun run test` in `packages/gui-plugins`;
  `bun run graph:verify` for the full graph gate.
- Targeted runs: `cd packages/app && bun run test:e2e -- --grep @graph` (graph surfaces);
  `bun run graph:capture --mode=frame --only=24` (one capture frame);
  `GRAPH_CAPTURE_DEMO=1 bun run test:e2e:built -- e2e/graph/capture-live.spec.ts -p graph-capture`
  (demo recording);
  `cd packages/session-graph && bun run test:components -- --grep @graph` (component contract);
  `cd packages/session-graph && bun run test:components -- --grep @a11y` (a11y only);
  `cd packages/session-graph && bun test src --test-name-pattern="<pattern>"` (unit tests).
- Do not add work to `SPACEGRAPH.TODO.34.md`; it is frozen. Record results here.
- Former hazards are fixed: root lint has 0 errors (warnings stay advisory) and the `gui-plugins`
  model suite runs under the Solid JSX preload.

**Non-negotiables**

1. One `SessionGraph` code path; surfaces compose it and never fork rendering.
2. New behavior starts flag-gated; a capability is available only when its flag and preference agree.
3. Never add work to the host timeline. Inline graphs stay static until expanded.
4. Every capability has a measured pass/park result. No capability ships on intuition alone.
5. Test each behavior at one layer only. Do not duplicate pure-model tests in the bundled copy.
6. Do not add a second active checklist. Completed work moves to the revision log; remaining work
   stays here.

---

## Priority order

| Order | Milestone | Priority | Absorbs |
|---|---|---|---|
| 1 | **M0 — Foundation and test repair** | P0 | Deferred debt, duplicate suites, gate repair |
| 2 | **M1 — Memory and decisions** | P1 | 19.5, 19.3 kill measurement |
| 3 | **M2 — Authoring and orchestration** | P1 | 19.6, 19.7, 15.5, deferred SDK/widget gaps |
| 4 | **M3 — Widgets and cost** | P1/P2 | 19.9, 19.11 |
| 5 | **M4 — Performance and scale** | P1 | Phase 20 |
| 6 | **M5 — Navigation, attention, layout breadth** | P2 | 19.8, 19.10, 19.12 |
| 7 | **M6 — Accessibility, theming, i18n, RTL** | P1 | Phase 21 |
| 8 | **M7 — Experiments and validation** | P2 | Phase 22 |
| 9 | **M8 — Docs, migration, graduation** | P2 | Phase 23 |
| 10 | **M9 — Definition of done** | P0 gate | Final verification |

P2 work may be parked after its kill test. It must not block M6–M8 unless adopted as a default.

---

## M0 — Foundation and test repair (P0)

Purpose: make the canonical gates trustworthy and remove duplicated coverage before adding more
features.

- [x] **M0.1 Repair the canonical lint gate.** **Done.** The 7 failures were all
      `no-restricted-imports` findings in the generated `spacegraph/internal/graph` tree and in
      `spacegraph/external/renderer.tsx` importing that tree. The vendored copy is library code, not
      plugin source, so it is exempted from `no-restricted-imports` and from the
      `gui-plugin-no-module-state` ast-grep rules; `script/lint-changed.ts` skips it because
      `sync:graph` and the parity test guard it. The `../*/*` cross-plugin pattern now negates
      `../internal/*` so an intra-plugin deep import is not mistaken for a cross-plugin one.
      `bun run lint` exits 0 with 0 errors; the ~2,070 warn-level anti-slop findings stay advisory.
- [x] **M0.2 Repair the `gui-plugins` model test harness.** **Done.**
      `packages/gui-plugins/bunfig.toml` preloads `../ui/test/solid-jsx.ts` before `happydom.ts`, so
      TSX compiles against `solid-js/h` and no suite asks for `jsxDEV`. Full suite: 1,160 tests /
      115 files, 1 skip, 0 fail.
- [x] **M0.3 Delete duplicate internal graph tests.** **Done.** Audit confirmed 27/29 files were
      byte-identical and the two others are stale subsets; internal had 305 tests against
      session-ui's 324.
      - [x] Fixed the two real drifts before deletion. The parity test failed on all three real
            differences first: missing `downstreamChain`, extra internal-only timeline/message
            exports, and `reviewChanges` without `turnStats`.
      - [x] Added `packages/gui-plugins/src/spacegraph/graph-parity.test.ts` with the three layers:
            public export parity, fixture build/incremental/time-travel parity (normalizing
            `turnByMessageID`), and selector/review/layout parity over fixture nodes.
      - [x] Deleted the 29 duplicated test files (277 tests) and 3 fixture JSONs only after the
            parity test passed. `session-ui` is the test source of truth.
- [x] **M0.4 Consolidate the graph capture gate.** **Done.**
      `e2e/graph/capture.spec.ts` is the only always-on gate: 32 frames tagged `@graph @capture`,
      and the file skips unless `GRAPH_CAPTURE_DIR` is set. `capture-live`, `capture-clips`, and
      `capture-segment1` are demo recordings tagged `@capture @demo`; they skip unless
      `GRAPH_CAPTURE_DEMO=1`. `playwright.config.ts` excludes all capture files from `chromium` and
      runs them only in the `graph-capture` project, so a frame is never written twice. The demo
      commands in `script/copy-capture-*`, `script/generate-demo-video.ts`, and `DEMO_VIDEO_PLAN.md`
      now set the opt-in variable.
      **Verification:** `bun run graph:capture --mode=verify` ran the gate once (32 tests, one
      worker) and compared all 35 committed frames plus the 3 bundle frames through the pixel gate.
      It correctly failed on drift: every frame differs slightly from the local render, and frames
      02–04 also include the Phase 16.3 "Map this turn" affordance added after the last blessing.
      Re-blessing is deferred to the M7 visual review with a reference environment.
- [x] **M0.5 Remove redundant component readiness checks.** **Done.**
      `packages/app/e2e/utils/waits.ts` owns `graphCanvasHost`, `graphToolbar`, and the single
      `waitForGraphContent` readiness wait (canvas visible plus `data-graph-ready`). All six
      `e2e/graph` specs use the helpers; the four capture specs no longer inline readiness checks or
      a local canvas selector. Only distinct assertions remain beside the wait, such as the renderer
      identity and projection/depth attributes.
- [x] **M0.6 Reconcile stale verification counts.** **Done.** Recorded in the baseline above and in
      the Test strategy section: 324 session-ui graph tests / 30 files, 96 session-graph unit tests /
      12 files, 1,160 gui-plugins tests / 115 files, 25 session-graph component specs, 31 app
      component specs, 66 app e2e specs (6 in `e2e/graph`), and root `bun run check` green.
- [x] **M0.7 Tag test suites for targeted runs.** **Done.**
      - Component contract: `componentConfig(directory, { tag })` applies `@graph` to the whole
        `packages/session-graph` component suite; the two a11y specs also carry `@a11y` in their
        titles.
      - App e2e: `session-graph` and `reactivity` carry `@graph`; the canonical capture frames carry
        `@graph @capture`; demo recordings carry `@capture @demo`.
      - Targets:
        - `cd packages/app && bun run test:e2e -- --grep @graph`
        - `cd packages/app && GRAPH_CAPTURE_DEMO=1 bun run test:e2e:built -- e2e/graph/capture-live.spec.ts -p graph-capture`
        - `cd packages/session-graph && bun run test:components -- --grep @graph`
        - `cd packages/session-graph && bun run test:components -- --grep @a11y`
        - Unit suites use Bun's name filter: `bun test src --test-name-pattern="<pattern>"` in
          `packages/session-graph`, `packages/session-ui`, or `packages/gui-plugins`.
      - `@perf` and `@host` stay out of the e2e config: benchmarks live in `packages/app/perf` /
        strobe, and the host keeper is the existing app suite.
- [x] **M0.8 Close deferred Phase 14.4 items.** **Done.** Container-width inspector selection was
      already implemented: `createWidthThresholdTracker` observes the graph root element, and
      `SessionGraph` chooses the side panel, sheet (via FAB), or the popover detail mode from it.
      The unused `GraphChromeProps.minimal` toolbar variant had no caller and no implementation, so
      it was dropped rather than kept as a dead control; `chrome.hideBelow` remains the narrow
      container behavior.
- [x] **M0.9 Delete the unused internal host fork.** **Done.** Deleted all 114 files (792 KB) under
      `packages/gui-plugins/src/spacegraph/internal/host` after confirming zero references.
      `gui-plugins` typecheck passes (1,640 files) and `bun run --cwd packages/app build` completes.
- [x] **M0.10 Add a drift guard for the internal graph copy.** **Done.**
      `packages/gui-plugins/script/sync-graph.ts` regenerates the copy from `session-ui` (graph
      modules plus the four timeline modules and `message/current-tool-state`) and rewrites the
      import paths; `--check` reports missing, stale, and unexpected files. `bun run sync:graph` and
      `bun run check:graph` are package scripts, `bun test` runs the check first, and
      `src/spacegraph/internal/README.md` documents the source of truth.

**Exit:** `bun run check` green; `gui-plugins` model tests run; duplicate graph unit tests gone;
one canonical capture gate in `capture.spec.ts` with opt-in demo recordings; suite tags and targeted
commands published in M0.7.

---

## M1 — Memory and decisions (P1)

### M1.1 — 19.5 Spatial memory v2

- [x] Key positions by `session + layout + level` plus a content hash so changed turns do not restore a
      stale frame. **Done.** `packages/session-ui/src/graph/memory.ts` owns the key, the FNV-1a
      structural hash, record validation, pruning, and clearing. The hash covers node ids, kinds,
      turns, and group membership; streaming labels do not change it. `useSpatialMemory` delegates to
      it and stops after the first complete model, so a later streaming key cannot restore over the
      visible map.
- [x] Restore selection, camera, and collapsed groups. **Done.** The record carries positions,
      selection, camera (`zoom` plus a 3-axis centre), and explicit collapsed groups. The camera is
      popped once by the structural fit effect after the renderer mounts, so the mount fit cannot
      overwrite it. Selection restores only when the node still exists.
- [x] Keep secondary inline graphs read-only for memory (owner rule from Phase 14). **Done.**
      `SessionGraph` gains `spatialMemoryOwner` (default true). `GraphInline`, the turn-map layer,
      and the turn-map dialog pass `false`; they read the session frame and never write it.
- [x] **Kill:** drift on changed turns. **Result:** no drift. A changed structure produces a different
      key and no record is read. Keep session-local `localStorage` memory only.
- [x] Test: changed-turn fixture restores the same frame only when the hash matches. **Done.**
      `memory.test.ts` proves the same fixture restores the record, a layout/level mismatch does not,
      a removed node changes the hash, and malformed records are rejected.

### M1.2 — 19.3 Compaction-advisor kill measurement

- [x] Define the baseline: the existing compaction path on the canonical fixture. **Done.** Baseline
      is the current keep-all path with the advisor off: all 46 fixture nodes visible.
- [x] Measure decision-spine retention, dropped tokens, advisor latency, and whether the reader can
      name the decision without opening the transcript. **Done.** The token proxy is content length at
      four characters per token (label + summary + data), exposed by `measureCompaction`.
- [x] Compare advisor policy against baseline and record the numbers here. **Done.**
      - Fixture: 46 nodes, 31 decision-spine nodes, 855 estimated tokens.
      - Baseline keep-all: 46 kept, 855 tokens, 0 dropped (0%), spine 31/31 (100%).
      - Advisor at `normal`: 46 kept, 855 tokens, 0 dropped (0%), spine 31/31 (100%).
      - No fixture node reaches `low` or `drop`, so the advisor saves nothing.
      - Advisor latency: ~0.18 ms per analyze+measure on this machine (test budget < 5 ms).
      - Reader check: yes. The spine carries `FAIL auth refresh token`, `Expected refresh token to be
        stored`, `fixed refresh path`, and `3 pass 0 fail`.
- [x] **Decision:** **park.** The advisor does not beat the keep-all baseline on the fixture. Keep
      `GraphCompactionAdvisor`, keep `graph_compaction_advisor` default-off in releases, and do not
      foreground the affordance. The token row now reports the content-derived kept count instead of
      `nodes × 100`. Revisit only when a fixture or real session produces `low`/`drop` candidates; the
      measurement is locked by `compaction-measure.test.ts`.

**Exit:** memory restores correctly; compaction advisor has a recorded keep/tune/park decision.
**Met:** M1.1 keep (session-local), M1.2 park.

---

## M2 — Authoring and orchestration (P1)

### M2.1 — 19.6 Notes and pins

- [x] Persist notes per session in the store; export them with the map. **Done.** Notes already
      lived in `SpacegraphModel.notes/setNotes/addNote/updateNote/deleteNote`; this pass added
      store-layer tests for add, update, delete, and the per-session key. `model.export` now applies
      `withAnnotations` before layout and render, so JSON/SVG/HTML exports include note nodes and
      their `annotates` edges instead of silently dropping them.
- [x] Show pins in every surface that renders the node. **Done.** `State.pins` stores pinned node
      ids per session. `SessionGraph` accepts controlled `pins`/`onPinsChange`, marks the card with
      `data-pinned` plus a pin badge, and exposes the toggle in the selected-node status bar. All
      plugin surfaces pass `notes` and `pins`: panel, full map, map, hybrid, map dialog, turn map,
      and the transcript inline graph.
- [x] Add note creation/edit/delete coverage at the store layer and one component smoke. **Done.**
      `model.test.ts` covers add/update/delete and pins; `graph-write-path.spec.ts` covers the note
      composer, the new pin toggle, and the card marker.
- [x] **Kill:** if notes are never used in studies, keep them but do not foreground them. **Decision:**
      keep quiet. Notes and pins remain behind the selected-node status bar and are not shown in the
      toolbar or first-run prompts until a study shows use.

### M2.2 — 19.7 Orchestration

- [x] Draw lineage (`forkedFrom`, `parentSessionID`, children) using `SessionLineage`. **Done.**
      `GraphLineage` models node attribution as `SessionLineage` and lists the fork, parent, and
      delegated children. It is host navigation beside the inspector, never a `GraphViewData` edge.
- [x] Clicking a lineage node opens the other session. **Done.** Each entry is a button carrying
      `data-session-id` and calling `onOpenSession`; the inspector's existing header link remains.
- [x] Enforce recursion depth: widget 1, popover 2, full map 3. **Done.** `SessionGraph` gains
      `maxDrillDepth` (default 3). `useGraphNavigation` refuses a nested drill-down at the limit.
      `SubagentNodeWidget` caps previews at 1 in a widget and 2 in a popover; `GraphInline` and both
      turn-map surfaces pass 1.
- [x] **Test:** lineage fixture renders parent/fork/child labels without cross-session causal edges.
      **Done.** `GraphView.stories.tsx` adds `Lineage`; `graph-session-links.spec.ts` asserts the
      three entries and opens the parent. The existing model test still proves every edge stays
      inside the session.

### M2.3 — 15.5 Library ask

- [x] Add `RenderNode.element` and per-instance DOM id prefix status to `docs/spacegraph/library-delta.md`
      and §F of the v34 archive. **Done.** Both proposals were already recorded; their status now
      states "Proposed, not implemented (recorded 2026-11-11)" and the tracking table keeps them as
      upstream asks.
- [x] Build the live-element path only if Tier 1 overlay fails a real widget test (occlusion, depth
      ordering, or hit-testing). **Decision:** do not build. The skipped `TextInput`-in-node test was
      a missing story wiring plus a z-order bug, not a Tier 1 contract failure. Giving the widget layer
      `z-index: 10` makes the live `TextInput` focusable, typable, and pointer-stable over the card.

### M2.4 — Deferred widget and SDK gaps

- [x] Replace the skipped `TextInput`-in-node component test with a working fixture. It must prove
      focus, typing, and no node drag. **Done.** `NODE_WIDGET_MODEL` draws the tool node at every
      level and `ViewHarness` forwards `renderNodeWidget`. The test focuses, types, asserts the
      viewport is unchanged, and asserts the input sits inside the `data-sg-interactive` wrapper.
- [x] Decide the SDK proposals from v34 §F: implement the minimal generic ones or leave them recorded
      as upstream asks. **Decision:** leave recorded. `RenderNode.element`, per-instance DOM id
      prefixes, and the remaining §F items stay upstream asks; Tier 1/2 cover shipped widgets.
- [x] Revisit generic `surfaces.selected` persistence (v34 17.3) and either implement it or keep the
      plugin-store fallback documented. **Decision:** keep the plugin-store fallback. The per-session
      spacegraph store owns level, layout, depth, surface, notes, and pins; do not widen the generic
      SDK until a second plugin needs the same record.

**Exit:** notes and lineage work; node widget focus test passes; deferred SDK status is explicit.
**Met.**

---

## M3 — Widgets and cost (P1/P2)

### M3.1 — 19.9 Widgets breadth

- [x] Todo widget. **Done.** `TodoNodeWidget` reads the `todowrite` tool input (`todos`, status) and
      shows progress and items in the node. `widgets.todo` gates it; the master
      `graph_node_widgets` flag and `widgets.enabled` preference also apply.
- [x] Model picker. **Parked.** The plugin SDK exposes only `Composer.model()`/`setModel()` and no
      catalog or variant list, so a one-item picker duplicates the host composer without saving a
      click. Build it when the SDK exposes the model catalog.
- [x] Small diff. **Done.** `DiffNodeWidget` renders `oldString`/`newString`, `patch`, or write
      content as a small read-only diff, with graph `writes` edge stats as the fallback. It is gated
      by `widgets.diff`.
- [x] Read-only terminal snapshot. **Done.** `TerminalNodeWidget` renders a shell result's output,
      exit/timeout status, truncation note, fold, and copy action. It is gated by `widgets.terminal`.
- [x] Permission-prompt summary. **Parked.** The graph model carries no permission request and the
      host dock already owns the prompt; adding a second surface would duplicate it. Revisit when a
      permission node enters the model.
- [x] **Kill per widget:** if it does not save a click or context switch, drop it. **Result:** keep
      todo, diff, and terminal; park model picker and permission summary. Each reads data already in
      the node, so none adds a request or a second source of truth.
- [x] Test only the interaction contract (focus, input, no drag, cleanup), not duplicated rendering.
      **Done.** `WidgetBreadth` mounts all three widgets in `graph-view.spec.ts`; the spec proves
      focus, fold/expand, diff/terminal text, and an unchanged viewport.

### M3.2 — 19.11 Cost lens

- [x] Tokens, wall time, and tool counts per turn and per subagent. **Done.** The builder records
      provider usage on each turn (`tokens`, `cost`, `wallTime`, `tools`, `steps`, `streaming`);
      `costLens(model)` sums it and `useRenderCard` draws a compact badge on turn and session cards.
      A subagent's own map shows its turns the same way; the parent model does not hold the child
      session's messages.
- [x] Optional heat sizing; ranges when streaming or truncation makes exact numbers misleading.
      **Decision:** ranges are done (`~` on a streaming turn); heat sizing is not built because it
      would force a layout pass and the plan marks it optional. Revisit only if a study asks for it.
- [x] **Kill:** if numbers are misleading, show ranges or park the lens. **Result:** keep, gated by
      `graph_cost_lens`. Token totals come from the provider's reported usage; streaming turns say
      they are a lower bound.

**Exit:** each widget and the cost lens has a pass/park result.
**Met:** todo/diff/terminal/cost lens keep; model picker and permission summary park.

---

## M4 — Performance and scale (P1)

- [ ] Add `packages/app/perf/graph-inline.bench.ts` (expand cost, first frame).
- [ ] Add `packages/app/perf/graph-transcript.bench.ts` (scroll cost with zero graphs mounted).
- [ ] Add `packages/app/perf/graph-render.bench.ts` (500 / 2,000 / 5,000 nodes).
- [ ] Keep the host timeline untouched; inline previews stay static SVG.
- [ ] Lazy mount and dispose one renderer per visible surface; reuse safely across lens switches.
- [ ] Use `applyPatch` for additions and verify no camera jump.
- [ ] Virtualize the graph transcript surface; do no per-row graph work when collapsed.
- [ ] Make budgets viewport/density-aware using `useBudgetCenter` and `DOM_BUDGET`.
- [ ] Evaluate kernel `SpatialIndex2D` for hit-testing and nearest-node at scale.
- [ ] **Budgets:** transcript scroll regression < 3%; interactive expand first frame < 100 ms;
      two mounted graphs ≤ 1.5× the memory of one.
- [ ] Record benchmark results against `origin/dev` once per milestone, not per commit.

**Exit:** benchmarks committed; budgets met or a documented fallback chosen.

---

## M5 — Navigation, attention, layout breadth (P2)

### M5.1 — 19.8 Search and palette

- [ ] Extend NLQ with user dictionaries without changing core behavior.
- [ ] Saved queries as facets.
- [ ] Palette lists nodes, actions, lenses, and surfaces.
- [ ] **Kill:** if the palette is slower than typing `/`, keep `/` only.

### M5.2 — 19.10 Attention

- [ ] Failure badge on the surface chip.
- [ ] Toast on failure.
- [ ] Titlebar item for sessions with failures.
- [ ] Respect `reducedMotion`; no sound.
- [ ] **Kill:** alarm fatigue in studies.

### M5.3 — 19.12 Layout and renderer breadth

- [ ] Expose `radial-layout`, `spectral-layout`, `cluster-layout`, `geo-layout`, `grid-layout`, and
      `circular-layout` as optional strategies.
- [ ] Renderer strategy: SVG preview < 50 nodes, SpaceGraph < 300, Cytoscape for large 2D maps.
- [ ] Document capability trade-offs and fallback behavior.
- [ ] Fix `bandChange` only if semantic zoom becomes a shipped feature (G21).
- [ ] **Kill:** no measured user benefit over current layouts.

**Exit:** each P2 capability has a pass/park decision; none blocks M6–M8 unless adopted.

---

## M6 — Accessibility, theming, i18n, RTL (P1)

- [ ] Inline graphs expose the a11y tree only when interactive; static previews carry an accessible name
      and summary.
- [ ] Per-instance roving tabindex and `aria-activedescendant`; announcements include the surface name.
- [ ] Focus returns to the affordance that opened a popover or window.
- [ ] `reducedMotion` disables camera animation on mount and lens change.
- [ ] Density themes: comfortable and compact; high-contrast audit.
- [ ] Theme tokens per surface; no literal colors; extend theme roles where missing.
- [ ] Add an optional `labels` config to builders with English defaults (additive).
- [ ] Verify RTL for chrome, popovers, breadcrumbs, and the composer widget.
- [ ] Fix the known narrow bottom-sheet geometry failure: `graph-refine.spec.ts` expects the sheet
      below 40% of the root but sees 299–316 px against 372.8 px on this machine, reproducing on
      unmodified `HEAD`. Measure the sheet against the canvas column, or dismiss the first-run banner
      before measuring; do not raise the timeout.
- [ ] Reuse existing a11y component specs; add only uncovered roles and focus-return cases.
- [ ] **Audit:** `bun run check`; a11y component tests; RTL story screenshots.

**Exit:** a11y suite green; no new English literals; RTL verified.

---

## M7 — Experiments and validation (P2)

- [ ] Author the canonical fixture narrative: failing test → wrong fix → root cause → correct fix →
      subagent verification → share.
- [ ] Add opt-in local counters (no network): surface opens, expand rate, why usage, lens switches, and
      time-to-answer on canned questions.
- [ ] Add cohort flags: Reader-first vs Map-first vs Hybrid-first.
- [ ] Define five task scenarios with expected answers on the fixture.
- [ ] Write the study protocol: consent, counterbalancing, analysis plan, and stop rule (reuse TODO.33
      §14).
- [ ] Do not start human studies before the video gate.

**Exit:** counters visible in dev; cohorts switchable; narrative fixture committed.

---

## M8 — Docs, migration, graduation (P2)

- [ ] TypeDoc for `SessionGraph` props, `NodeWidgetLayer`, lenses, and preferences.
- [ ] Composition guide: surface table, lens table, progressive-disclosure rules.
- [ ] Embedding guide: tiers 1–3, interactive-control rules, HTML trust boundary.
- [ ] Complete `docs/spacegraph/library-delta.md` with rationale, status, and feature mapping.
- [ ] SDK proposals with minimal diffs; TSDoc and guide updates in the same change.
- [ ] Flag graduation: delete flags for proven defaults; keep the rest.
- [ ] Deprecated aliases for moved public SDK/plugin names until the next minor.
- [ ] Update `SPACEGRAPH.TODO.33.md` cross-links and `SPACEGRAPH.md` §5/§16.
- [ ] Mark `SPACEGRAPH.TODO.34.md` as archived and point all remaining work here.

**Exit:** docs build; no orphan flags; cross-links resolve.

---

## M9 — Definition of done (final gate)

- [ ] One `SessionGraph` renders every surface; `GraphView` behavior unchanged.
- [ ] Two instances coexist without interference.
- [ ] A graph renders inside the transcript; an interactive widget renders inside a node.
- [ ] All nine lenses switch without surprise and persist.
- [ ] Every capability is flag-gated and has a pass/park decision with evidence.
- [ ] No dead control, global listener leak, or duplicate DOM id in a normal session.
- [ ] Benchmarks within budget; a11y and RTL verified.
- [ ] `bun run check` green; capture gate green; one `dist/` rebuild; one component-suite run.

---

## Test strategy: test once, at the right layer

| Change type | Minimum verification | Do not also run |
|---|---|---|
| Pure graph model, selectors, time travel | `session-ui` graph unit tests + internal parity test | Duplicate internal graph unit tests |
| `SessionGraph` rendering or interaction | Targeted `session-graph` component spec | Full session-ui component suite |
| Host/plugin wiring | `gui-plugins` typecheck + one component or e2e smoke | All map surfaces |
| Cross-surface selection, flags, links | One `packages/app/e2e/graph/session-graph.spec.ts` story | Per-surface e2e copies |
| Visual/capture change | One parameterized capture gate at the milestone | Capture-live/segment/clip variants |
| Performance-sensitive change | Relevant graph bench before/after | Full strobe suite |
| Docs-only change | Build/link check | Renderer suites |

**Consolidation targets**

- [x] Deleted 29 internal graph test files / 277 tests and added one parity test
      (`gui-plugins/src/spacegraph/graph-parity.test.ts`, 20 tests) plus the `sync:graph --check`
      drift guard. No internal-only coverage was lost.
- [x] One canonical capture gate: `capture.spec.ts` is the 32-frame `@graph @capture` gate;
      `capture-live`/`capture-clips`/`capture-segment1` are `@capture @demo` recordings behind
      `GRAPH_CAPTURE_DEMO=1` (M0.4).
- [x] `e2e/utils/waits.ts` owns the canvas selector and readiness wait; all six `e2e/graph` specs use
      them, and the capture specs contain no inline `data-graph-ready` checks (M0.5).
- Do not duplicate pure model assertions inside component tests.
- Do not add a new suite when an existing suite already owns the behavior.

---

## Kill/park register

| Capability | Decision needed | Evidence |
|---|---|---|
| 19.3 Compaction advisor | **Parked** | 0 of 46 nodes dropped, 0 tokens saved, spine 31/31; ~0.18 ms latency (M1.2) |
| 19.5 Spatial memory | **Keep session-local only** | Hash miss on changed structure; same structure restores (M1.1) |
| 19.6 Notes and pins | **Keep quiet** | Store coverage and pin smoke pass; no study usage yet (M2.1) |
| 19.8 Palette | Keep or `/` only | Time-to-action vs typing `/` |
| 19.9 Widgets | **Keep todo, diff, terminal; park model picker and permission summary** | Widget data already lives in the node; picker/permission need host sources that would duplicate the composer and dock (M3.1) |
| 19.10 Attention | Keep or reduce | Alarm-fatigue study |
| 19.11 Cost lens | **Keep, flag-gated; streaming shows ranges** | Provider-reported usage on turn cards; heat sizing deferred (M3.2) |
| 19.12 Layouts/renderers | Adopt or drop | Measured benefit over current layouts |
| Phase 20 budgets | Met or fallback | Strobe against `origin/dev` |

---

## Open decisions

| Decision | Needed by | Default if unresolved |
|---|---|---|
| ~~Compaction baseline definition~~ | ~~M1.2~~ | Resolved: keep-all path, 46 nodes / 855 tokens |
| Palette speed metric | M5.1 | Median time-to-node vs `/` |
| ~~Per-widget success metric~~ | ~~M3.1~~ | Resolved: data already in the node; keep todo/diff/terminal, park the rest |
| Renderer strategy thresholds | M5.3 | Keep SpaceGraph only |
| Notes and attention study design | M7 | Keep quiet, do not foreground |
| ~~Which SDK proposals to implement~~ | ~~M2.4~~ | Resolved: keep recorded as upstream asks |
| Flag graduation order | M8 | Delete only proven defaults |

---

## Absorption map from v34

| v34 item | v35 location |
|---|---|
| 14.4 deferred toolbar/inspector | M0.8 |
| 15.1 skipped widget test | M2.4 |
| 15.5 `RenderNode.element` | M2.3 |
| 17.3 generic surface persistence | M2.4 |
| 19.3 kill measurement | M1.2 |
| 19.5 spatial memory v2 | M1.1 |
| 19.6 notes and pins | M2.1 |
| 19.7 orchestration | M2.2 |
| 19.8 search and palette | M5.1 |
| 19.9 widgets breadth | M3.1 |
| 19.10 attention | M5.2 |
| 19.11 cost lens | M3.2 |
| 19.12 layout/renderer breadth | M5.3 |
| Phase 20 performance and scale | M4 |
| Phase 21 a11y/theming/i18n/RTL | M6 |
| Phase 22 experiments and validation | M7 |
| Phase 23 docs/migration/graduation | M8 |
| Definition of done | M9 |
| Duplicate internal graph tests | M0.3 |
| Internal graph drift (`downstreamChain`, `reviewChanges.turnStats`) | M0.3 |
| Unused `internal/host` fork | M0.9 |
| Capture-spec duplication | M0.4 |
| Stale verification counts | M0.6 |
| Root lint gate failure | M0.1 |
| `gui-plugins` model harness failure | M0.2 |

Every unchecked item in v34 is represented above. When an item completes here, record the result in
this file's revision log and leave the v34 archive unchanged.

---

## Revision log

- **r0 (2026-11-11):** Created v35. Absorbed all remaining v34 work, reordered by dependency and
  decision value, added test-consolidation targets, deferred-gap closure, kill register, and open
  decisions. v34 frozen as design/history archive.
- **r1 (2026-11-11):** Verified test consolidation. 27/29 internal graph test files are byte-identical;
  the other two are stale subsets. Found two real drifts (`downstreamChain` export and
  `reviewChanges.turnStats`) that the parity test must catch before deletion. Confirmed the internal
  host fork is unreferenced, and capture e2e duplication is ~1,891 lines with repeated frames.
- **r2 (2026-11-11):** Completed M0.1, M0.2, M0.3, M0.6, M0.8, M0.9, M0.10.
  - Lint: 0 errors. Fixed the 7 `no-restricted-imports` false positives by scoping the generated graph
    tree out of plugin-only rules (`no-restricted-imports`, `gui-plugin-no-module-state`) and negating
    `../internal/*` in the cross-plugin glob; `lint-changed` skips the generated tree.
  - `gui-plugins` tests: preload `../ui/test/solid-jsx.ts`; the full 1,160-test suite runs.
  - Graph copy: added `script/sync-graph.ts` with `--check`, package scripts, and
    `internal/README.md`; regenerated the copy. The new parity test first caught `downstreamChain`,
    12 extra internal-only exports, and missing `reviewChanges.turnStats`. Deleted 29 stale test
    files / 277 tests and 3 fixture JSONs.
  - Deleted the 114-file `internal/host` fork; `gui-plugins` typecheck and the app build pass.
  - Dropped the never-implemented `GraphChromeProps.minimal` prop; container-width inspector
    panel/sheet/popover selection already exists via `createWidthThresholdTracker`.
  - M0.5 progress: `e2e/utils/waits.ts` exposes `graphCanvasHost`, `graphToolbar`, and the single
    `waitForGraphContent` readiness wait; `session-graph.spec.ts` and `reactivity.spec.ts` use them.
    The capture specs adopt the same helper during the M0.4 rewrite.
  - Counts recorded: session-ui graph 324/30, session-graph unit 96/12, gui-plugins 1,160/115,
    session-graph component specs 25, app component specs 31, app e2e specs 66 (6 graph).
  - Verified: `bun run check` 53/53, `bun run lint` 0 errors, `bun run --cwd packages/app build`, and
    all three canonical unit suites. Remaining M0 work: M0.4, M0.5, M0.7.
- **r3 (2026-11-11):** Completed M0.4, M0.5, M0.7.
  - Capture: `capture.spec.ts` is the only always-on gate (32 frames, `@graph @capture`) and skips
    without `GRAPH_CAPTURE_DIR`. `capture-live`, `capture-clips`, and `capture-segment1` skip without
    `GRAPH_CAPTURE_DEMO=1` and carry `@capture @demo`. `chromium` excludes every capture file, so the
    `graph-capture` project is the only writer and no frame is captured twice. Demo commands in the
    capture/copy scripts and `DEMO_VIDEO_PLAN.md` set the opt-in variable.
  - Verify: `bun run graph:capture --mode=verify` ran the gate once (32 tests, 1 worker) and compared
    35 committed frames plus 3 bundle frames. The comparison executed correctly and failed on drift:
    all frames differ slightly from this machine's render, and frames 02–04 include Phase 16.3's
    "Map this turn" affordance, which landed 2026-11-10 14:58 after the last screenshot blessing at
    11:00. Re-blessing is deferred to M7 with a reference render environment.
  - Readiness: all six `e2e/graph` specs use `graphCanvasHost`/`waitForGraphContent`; the capture
    specs no longer inline `data-graph-ready` or a local canvas selector. Only distinct assertions
    (renderer identity, projection, depth) remain beside each wait.
  - Tags: `componentConfig` accepts a config-level tag, so the 25 `session-graph` component specs run
    as `@graph`; the two a11y specs also carry `@a11y`; app e2e graph specs carry `@graph`, capture
    frames `@capture`, and demo recordings `@demo`. Targeted commands are published in M0.7.
  - Verified: root `bun run check` 53/53; `graph-legend` component spec passes under the tagged
    config; `capture-clips` reports 4 skipped without the demo env; `playwright test --list` assigns
    the capture files only to `graph-capture`.
- **r4 (2026-11-11):** Completed M1.1 and M1.2.
  - Spatial memory v2: `session-ui/src/graph/memory.ts` adds the structural FNV-1a hash, the
    `session:layout:level:hash` key, record validation, pruning, and clearing. The hook restores
    positions, selection, camera, and explicit collapsed groups in one record. The camera is applied
    by the structural fit effect after mount instead of before it, and `spatialMemoryOwner` keeps
    inline and turn-map instances read-only. Old hash-less keys are ignored once.
  - Tests: `memory.test.ts` covers same-structure restore, layout/level mismatch, changed-turn hash
    miss, clearing across hashes, malformed records, and key shape. `session-ui` graph suite is now
    335 tests / 32 files.
  - Compaction measurement: added `measureCompaction` and `estimateNodeTokens`; the advisor token row
    now shows the content-derived kept count. `compaction-measure.test.ts` locks the fixture numbers
    and the decision narrative. Result: 46 nodes / 855 estimated tokens, 0 dropped, spine 31/31,
    ~0.18 ms latency. Decision: **park**; flag stays default-off in releases.
  - Regenerated the bundled graph copy (`sync:graph`, 42 modules) and updated the parity/export set.
  - Verified: `bun test src/graph` 335/32, `bun test src` 96/12 in `session-graph`, `bun run test`
    1,160/115 in `gui-plugins`, root `bun run check` 53/53, and `check:graph` clean.
- **r5 (2026-11-11):** Completed M2.1, M2.2, M2.3, M2.4.
  - Notes: store CRUD covered in `model.test.ts`; `model.export` now applies `withAnnotations` so a
    saved map carries note nodes. Pins added to `State` (`pins: string[]`), the model
    (`pins/setPins/togglePin`), `SessionGraph` (`pins`/`onPinsChange`), the card template
    (`data-pinned`, pin badge), and the status bar. Every plugin surface passes notes and pins:
    panel, full map, map, hybrid, map dialog, turn map, and the transcript inline graph.
  - Lineage: new `GraphLineage` renders fork/parent/child from `SessionLineage` data as host
    navigation buttons. `Lineage` story plus `graph-session-links.spec.ts` prove the three labels
    and that opening the parent calls `onOpenSession`. No cross-session edge enters the model.
  - Recursion: `SessionGraph.maxDrillDepth` defaults to 3; `useGraphNavigation` refuses a deeper
    drill-down. `SubagentNodeWidget` allows 1 in a widget and 2 in a popover; `GraphInline` and
    turn-map surfaces pass 1.
  - Widget test: added `NODE_WIDGET_MODEL`, forwarded `renderNodeWidget` in `ViewHarness`, and raised
    the widget layer to `z-index: 10`. The previously skipped test now proves focus, typing, and an
    unchanged viewport. This closes the Tier 1 question without `RenderNode.element`.
  - Docs: `library-delta.md` records both library asks as proposed/not built with the 2026-11-11
    status. SDK asks and `surfaces.selected` stay plugin-side by decision.
  - Verified: `bun run check` 53/53; `session-graph` unit 97/12; `gui-plugins` 1,162/115 (1 skip);
    targeted component suites 14 pass / 1 skip (write path, lineage, widget); full component suite
    58 pass / 12 skip / 1 fail. The failure is the pre-existing narrow bottom-sheet height assertion
    in `graph-refine.spec.ts`; it reproduces on unmodified `HEAD` (299–316 px vs 372.8 px) and is
    recorded in the handoff for M6.
- **r6 (2026-11-11):** Completed M3.1 and M3.2.
  - Widgets: `TodoNodeWidget` reads `todowrite` todos; `DiffNodeWidget` renders `oldString`/
    `newString`, `patch`, or write content plus graph `writes` stats; `TerminalNodeWidget` renders a
    shell result with exit/timeout, truncation, fold, and copy. `panel.tsx` wires all three behind
    `graph_node_widgets` plus the master and per-widget preferences. The model picker and permission
    summary are parked: the SDK has no model catalog and the graph has no permission request.
  - Cost lens: the builder records provider usage on turn nodes (`tokens`, `cost`, `wallTime`,
    `tools`, `steps`, `streaming`); `cost.ts` exposes `costLens`/`turnCost`; `useRenderCard` draws a
    card badge and the toolbar offers the lens only when `graph_cost_lens` is on. Streaming turns
    prefix the label with `~`. Compaction's token estimate ignores the usage field, so the locked
    855-token baseline is unchanged. Heat sizing is not built; it would force a relayout.
  - Tests: new `cost.test.ts` proves per-turn sums, wall time, tool counts, streaming lower bounds,
    and an empty lens; `WidgetBreadth` and `CostLens` stories drive two new `graph-view.spec.ts`
    component tests (focus/fold and toolbar toggle). Synced the bundled graph copy (43 modules).
  - Verified: `bun run check` 53/53; `session-ui` graph 338/33; `session-graph` unit 97/12;
    `gui-plugins` 1,162/115 (1 skip); both new component specs pass.
