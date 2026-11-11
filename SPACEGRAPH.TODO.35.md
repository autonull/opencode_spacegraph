# SpaceGraph: Remaining Work & Delivery Plan (v35)

> **Status (2026-11-11):** Execution plan for all work remaining after v34 r27. Phases 14–19.4 are
> complete. `SPACEGRAPH.TODO.34.md` is now the frozen design and history reference; this file is the
> single source of truth for remaining work.
>
> **Baseline:** through Phase 19.4, commit `56e99f4cdd`. `packages/session-ui` graph unit tests pass
> (324), `packages/session-graph` unit tests pass (96), and root `bun run typecheck` passes (53/53).
>
> **Next:** M0 (foundation and test repair), then M1.1 (19.5 spatial memory v2) and M1.2 (19.3
> compaction-advisor measurement).

### Session handoff

- Read **M0** first; it removes the duplicated tests and repairs the two broken gates before feature work.
- Start with **M0.1** (`bun run check` lint baseline) and **M0.2** (`gui-plugins` model `jsxDEV` harness).
- Then do **M0.3**: delete the 29 duplicated internal graph test files and add the parity test.
- Canonical checks: `bun run typecheck` at the root; `bun test src/graph` in `packages/session-ui`;
  `bun test src` in `packages/session-graph`; `bun run typecheck` in `packages/gui-plugins`.
- Do not add work to `SPACEGRAPH.TODO.34.md`; it is frozen. Record results here.
- Known hazards: root lint is red on pre-existing restricted-import findings, and the
  `gui-plugins` model suite fails before running with `jsxDEV is not exported`.

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

- [ ] **M0.1 Repair the canonical lint gate.** `bun run check` currently fails on pre-existing
      `no-restricted-imports` / anti-slop findings. Categorize them, fix the real layering violations,
      and align the lint config only where the rule is intentionally obsolete. Do not suppress findings
      wholesale.
- [ ] **M0.2 Repair the `gui-plugins` model test harness.** The model suite fails before running with
      `jsxDEV is not exported` from Solid. Fix the preload/conditions so host-model tests execute.
- [ ] **M0.3 Delete duplicate internal graph tests.** Remove the 29 test files / 277 tests under
      `packages/gui-plugins/src/spacegraph/internal/graph`. Replace them with one parity test that:
      builds the same fixture with both copies, compares nodes/edges/turns, and compares time-travel
      snapshots. Keep `session-ui` as the test source of truth.
- [ ] **M0.4 Consolidate the graph capture gate.** Merge `packages/app/e2e/graph/capture*.spec.ts` into
      one parameterized capture spec. Preserve the 32-frame gate; make live/segment/clip modes explicit
      env options or delete overlapping flows.
- [ ] **M0.5 Remove redundant component readiness checks.** Centralize `data-graph-ready`, canvas,
      toolbar, and inspector waits. Keep one smoke assertion per surface and remove repeated waits that
      do not protect a distinct behavior.
- [ ] **M0.6 Reconcile stale verification counts.** v34 says 25, 55, and 57 component specs in different
      places. Record the actual canonical commands and counts here after M0.3–M0.5.
- [ ] **M0.7 Tag test suites for targeted runs.** Add tags such as `@graph`, `@a11y`, `@capture`,
      `@perf`, `@host`, so pure-model changes do not run every visual surface spec.
- [ ] **M0.8 Close deferred Phase 14.4 items.** Implement or explicitly drop the toolbar `minimal`
      variant and container-width inspector panel/sheet/popover selection.

**Exit:** `bun run check` green; `gui-plugins` model tests run; duplicate graph unit tests gone;
one canonical capture command; targeted test commands documented.

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

- Delete 29 internal graph test files / 277 tests; add one parity test.
- Merge four `capture*.spec.ts` files into one gate.
- Keep one readiness helper for `data-graph-ready`, toolbar, and inspector waits.
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
