# SpaceGraph: Remaining Work & Delivery Plan (v35)

> **Status (2026-11-11):** M0 foundation repair is in progress. M0.1, M0.2, M0.3, M0.6, M0.8, M0.9,
> and M0.10 are complete; M0.4 (capture consolidation) and M0.7 (suite tags) remain, and M0.5 has
> its helpers in place with the capture specs left to M0.4. Phases 14–19.4 are complete.
> `SPACEGRAPH.TODO.34.md` is the frozen design and history reference; this file is the single source
> of truth for remaining work.
>
> **Baseline:** through Phase 19.4, commit `56e99f4cdd`, plus the M0 foundation commit. Canonical
> local suites: `packages/session-ui` `bun test src/graph` 324 tests / 30 files,
> `packages/session-graph` `bun test src` 96 / 12, `packages/gui-plugins` `bun run test` 1,160 / 115
> (1 skip, includes the 20 parity tests), and root `bun run check` green (53/53, 0 lint errors).
>
> **Next:** finish M0.4, M0.5, and M0.7, then M1.1 (19.5 spatial memory v2) and M1.2 (19.3
> compaction-advisor measurement).

### Session handoff

- M0.1–M0.3 and M0.6–M0.10 are done. Start from **M0.4** (capture gate) and **M0.5** (readiness
  helpers); both are e2e-only and must keep `bun run graph:verify` green.
- The bundled graph copy is generated: edit `packages/session-ui/src/graph`, then run
  `bun run sync:graph` in `packages/gui-plugins`. `bun run check:graph` (also run by `bun test`)
  fails on drift, and `packages/gui-plugins/src/spacegraph/graph-parity.test.ts` proves behavior
  parity.
- Then do **M0.7** tags, then M1.1/M1.2.
- Canonical checks: `bun run check` at the root; `bun test src/graph` in `packages/session-ui`;
  `bun test src` in `packages/session-graph`; `bun run test` in `packages/gui-plugins`;
  `bun run graph:verify` for the full graph gate.
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
- [ ] **M0.4 Consolidate the graph capture gate.** The four `packages/app/e2e/graph/capture*.spec.ts`
      files total ~1,891 lines and capture the same frames 2–4 times. Keep one canonical 32-frame gate,
      make live/segment/clip modes explicit opt-in demo modes or delete the overlap.
      **Next:** keep `capture.spec.ts` as the canonical gate, move `capture-live`/`capture-clips`/
      `capture-segment1` frames behind an env-selected demo mode, and confirm `bun run graph:capture
      --mode=verify` still asserts the committed set.
      **Baseline hazard:** on 2026-11-11 the local `PLAYWRIGHT_BUILD=1 bun run test:e2e:built
      e2e/graph/session-graph.spec.ts e2e/graph/reactivity.spec.ts` run failed the same 4 tests with
      and without the M0.5 changes (the toolbar "Fit to view" control was not found). Treat that as
      an environment/fixture issue, not a regression, and establish a green local e2e baseline before
      trusting a capture comparison.
- [ ] **M0.5 Remove redundant component readiness checks.** Centralize `data-graph-ready`, canvas,
      toolbar, and inspector waits. Keep one smoke assertion per surface and remove repeated waits that
      do not protect a distinct behavior.
      **Progress:** `packages/app/e2e/utils/waits.ts` now exports `graphCanvasHost`, `graphToolbar`, and
      `waitForGraphContent` (canvas visible + `data-graph-ready`). `session-graph.spec.ts` and
      `reactivity.spec.ts` use them and no longer inline the readiness assertion.
      **Remaining:** the four capture specs still inline it; fold that into the M0.4 rewrite instead
      of editing them twice. Add a toolbar/inspector readiness helper only if a spec needs one.
- [x] **M0.6 Reconcile stale verification counts.** **Done.** Recorded in the baseline above and in
      the Test strategy section: 324 session-ui graph tests / 30 files, 96 session-graph unit tests /
      12 files, 1,160 gui-plugins tests / 115 files, 25 session-graph component specs, 31 app
      component specs, 66 app e2e specs (6 in `e2e/graph`), and root `bun run check` green.
- [ ] **M0.7 Tag test suites for targeted runs.** Add tags such as `@graph`, `@a11y`, `@capture`,
      `@perf`, `@host`, so pure-model changes do not run every visual surface spec.
      **Next:** Playwright supports `test.describe(name, { tag })` and `--grep @tag`; bun has no tag
      option, so document `--test-name-pattern` commands for the unit suites. Tag the 25
      session-graph component specs and the graph e2e specs, then publish the targeted commands here.
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
one canonical capture command still pending M0.4, targeted test commands pending M0.7.

---

## M1 — Memory and decisions (P1)

### M1.1 — 19.5 Spatial memory v2

- [ ] Key positions by `session + layout + level` plus a content hash so changed turns do not restore a
      stale frame.
- [ ] Restore selection, camera, and collapsed groups.
- [ ] Keep secondary inline graphs read-only for memory (owner rule from Phase 14).
- [ ] **Kill:** drift on changed turns. Then keep session-local memory only.
- [ ] Test: changed-turn fixture restores the same frame only when the hash matches.

### M1.2 — 19.3 Compaction-advisor kill measurement

- [ ] Define the baseline: the existing compaction path on the canonical fixture.
- [ ] Measure decision-spine retention, dropped tokens, advisor latency, and whether the reader can
      name the decision without opening the transcript.
- [ ] Compare advisor policy against baseline and record the numbers here.
- [ ] **Decision:** keep, tune, or park. If parked, hide the affordance behind the flag default and keep
      the component for research.

**Exit:** memory restores correctly; compaction advisor has a recorded keep/tune/park decision.

---

## M2 — Authoring and orchestration (P1)

### M2.1 — 19.6 Notes and pins

- [ ] Persist notes per session in the store; export them with the map.
- [ ] Show pins in every surface that renders the node.
- [ ] Add note creation/edit/delete coverage at the store layer and one component smoke.
- [ ] **Kill:** if notes are never used in studies, keep them but do not foreground them.

### M2.2 — 19.7 Orchestration

- [ ] Draw lineage (`forkedFrom`, `parentSessionID`, children) using `SessionLineage`.
- [ ] Clicking a lineage node opens the other session.
- [ ] Enforce recursion depth: widget 1, popover 2, full map 3.
- [ ] **Test:** lineage fixture renders parent/fork/child labels without cross-session causal edges.

### M2.3 — 15.5 Library ask

- [ ] Add `RenderNode.element` and per-instance DOM id prefix status to `docs/spacegraph/library-delta.md`
      and §F of the v34 archive.
- [ ] Build the live-element path only if Tier 1 overlay fails a real widget test (occlusion, depth
      ordering, or hit-testing).

### M2.4 — Deferred widget and SDK gaps

- [ ] Replace the skipped `TextInput`-in-node component test with a working fixture. It must prove focus,
      typing, and no node drag.
- [ ] Decide the SDK proposals from v34 §F: implement the minimal generic ones or leave them recorded as
      upstream asks. Do not silently implement them.
- [ ] Revisit generic `surfaces.selected` persistence (v34 17.3) and either implement it or keep the
      plugin-store fallback documented.

**Exit:** notes and lineage work; node widget focus test passes; deferred SDK status is explicit.

---

## M3 — Widgets and cost (P1/P2)

### M3.1 — 19.9 Widgets breadth

- [ ] Todo widget.
- [ ] Model picker.
- [ ] Small diff.
- [ ] Read-only terminal snapshot.
- [ ] Permission-prompt summary.
- [ ] **Kill per widget:** if it does not save a click or context switch, drop it.
- [ ] Test only the interaction contract (focus, input, no drag, cleanup), not duplicated rendering.

### M3.2 — 19.11 Cost lens

- [ ] Tokens, wall time, and tool counts per turn and per subagent.
- [ ] Optional heat sizing; ranges when streaming or truncation makes exact numbers misleading.
- [ ] **Kill:** if numbers are misleading, show ranges or park the lens.

**Exit:** each widget and the cost lens has a pass/park result.

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
- [ ] Merge four `capture*.spec.ts` files into one gate (M0.4).
- [x] Added the readiness helpers in `e2e/utils/waits.ts`; the capture specs adopt them in M0.4 (M0.5).
- Do not duplicate pure model assertions inside component tests.
- Do not add a new suite when an existing suite already owns the behavior.

---

## Kill/park register

| Capability | Decision needed | Evidence |
|---|---|---|
| 19.3 Compaction advisor | Keep / tune / park | Baseline comparison on fixture |
| 19.5 Spatial memory | Keep session-local only | Drift test on changed turns |
| 19.6 Notes and pins | Foreground or keep quiet | Study usage |
| 19.8 Palette | Keep or `/` only | Time-to-action vs typing `/` |
| 19.9 Widgets | Per-widget pass/park | Saved click or context switch |
| 19.10 Attention | Keep or reduce | Alarm-fatigue study |
| 19.11 Cost lens | Exact numbers, ranges, or park | Streaming/truncation accuracy |
| 19.12 Layouts/renderers | Adopt or drop | Measured benefit over current layouts |
| Phase 20 budgets | Met or fallback | Strobe against `origin/dev` |

---

## Open decisions

| Decision | Needed by | Default if unresolved |
|---|---|---|
| Compaction baseline definition | M1.2 | Current compaction path on canonical fixture |
| Palette speed metric | M5.1 | Median time-to-node vs `/` |
| Per-widget success metric | M3.1 | One saved click or context switch |
| Renderer strategy thresholds | M5.3 | Keep SpaceGraph only |
| Notes and attention study design | M7 | Keep quiet, do not foreground |
| Which SDK proposals to implement | M2.4 | Record as upstream asks |
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
