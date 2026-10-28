# SPACEGRAPH.TODO.20 — Remaining Work

> **Context:** `SPACEGRAPH.TODO.19.md` records completed work. This file contains only open items. Dependency order is strict: each batch must be green before the next starts. The go/no-go decision is T2.2 (Batch 4).

---

## 1. Verified State (2026-10-28, after this pass)

| Check | Result |
|-------|--------|
| `session-graph` unit | 113 pass / 0 fail (last run; no source change to the model since) |
| `app` graph-state unit | 37 pass / 0 fail (last run) |
| `session-graph` component tests | **48 pass / 1 fail / 18 skip** (remaining: `graph-scale.spec.ts` turn cards count 0) |
| App e2e graph (`session-graph.spec.ts`) | **43–44 pass / 1–3 fail** out of 46; camera, split, fallback, transcript and text-scale tests now pass |
| Typecheck | `session-graph` and `app` clean |
| Library vitest | 539 pass (build still has TS errors — L1) |
| `graph:verify` | **Blocked** on the remaining e2e/component failures in §1b |

### 1a. Fixed in this pass (2026-10-28)

- **Self-triggering refit loop (root cause of the camera failures).** The `refitKey`/`arrangement` effect called `camera.request(...)`, and the synchronous fit reports flowed through `setViewport`/`camera.report`, reading signals inside the effect's tracking scope. The effect therefore refit on every viewport report: the camera never rested, the zoom readout always said 100%, pans/wheel zooms were undone, and the aborted-adapter path recursed. The fit is now inside `untrack`.
- **Camera e2e coordinates.** The pan and budget tests started their right-drag at the pane's bottom-right, which the floating composer overlays, so the map never received the gesture. They now drag from the canvas centre (right-button pan relays through cards).
- **Fallback banner never appeared.** `GraphFallback` read `props.fallback` in the component body and returned early, so it was not reactive. It now uses `<Show when={props.fallback && !props.error}>`; `GraphCanvasRegion` forwards `onReady.info.fallback` and `GraphView` calls `setFallback`.
- **Arrangement menu lost `data-value`.** `GraphDrawControl` now writes `data-value` on its options; the hybrid arrangement test can select side/floating again.
- **Transcript disappeared in map-only mode.** The `graph-pane` refactor gated the whole `SessionGraphPanel` on `mapVisible()`, so turning the map off removed the only transcript host. The panel is rendered unconditionally; `map` only controls the map surface.
- **Timeline virtualizer did not follow log visibility.** `combinedActive` is no longer `active() && splitVisible()` (which blanked the transcript when the map was off). It now follows the conversation while the log stays mounted and measured.
- **Log pane hidden with `display:none`.** It is positioned absolutely and made `invisible pointer-events-none` while the map takes the panel alone, keeping the virtualizer measured.
- **ScrollView styles missing.** The app imported only `@opencode/ui/styles/tailwind` + `tokens`; the base `.scroll-view` rules (display:flex, overflow) were never loaded, so the timeline was not scrollable. Added a `./styles/components/*` UI export and imported `scroll-view.css` in `packages/app/src/index.css`. Transcript position restore now works.
- **Log text scale was a no-op.** The scale variables were derived from `--text-size-*` names the app does not define. The log content wrapper now sets `font-size: calc(13px * var(--text-scale))`.
- **E2E assertions that assumed the broken scroll view.** Scroll to the session start before finding `msg_user_1`; measure the text-scale contract on the log content surface; use the real `.scroll-view__viewport` in the hybrid keyboard test and `Control+Shift+h` on Linux.
- Earlier in this pass: card geometry ordering, viewport feedback, resting budget, reactive `canvasRegionProps` getters, comparison/notes stores, toolbar menus, scroll persistence, and the hybrid log re-measure.

### 1b. Remaining failures (3)

| Group | Tests | Cause / next step |
|-------|-------|-------------------|
| Hybrid scroll preservation | `graph.hybrid (mod+shift+h) ...` | Entering map-only resets the log's `scrollTop` to 0 and it does not come back on return. The log is still mounted/measured, so something remounts or re-initialises the timeline (check the `transcript(logActive)` child and the cache view identity). The same scroll is preserved by the toolbar split path, so compare the two toggles. |
| Flaky under parallel workers | `picking a node in the map moves the log to it`, `restores the transcript position after leaving the graph` | Both pass with `--workers=1` and fail intermittently with workers=3. Suspect virtualizer measurement under concurrent page load rather than product logic. Re-run with `--workers=1` before treating either as broken; then stabilise the wait on the visible row rather than a fixed scroll offset. |
| Component | `graph-scale` turn cards | The overview story still renders the notice with zero `.html-node-container:has([data-kind="turn"])`. Decide whether overview intentionally hides turn cards (then update story/test) or restore the capped turn cards. |

---

## 2. Batch 1 — Fix Component Tests + Gate Closure (one PR, one pipeline)

**Must complete before any other batch.**

| # | Item | Fix | Status |
|---|------|-----|--------|
| **1.1** | Story root hidden on `parameters: { layout: "fullscreen" }` | In `packages/stories/src/frame.tsx:49`, `parameters.layout` reads from story `parameters`, but component tests pass `globals: { layout: "fullscreen" }`. Either: (a) make frame read `globals.layout` as fallback, or (b) change stories to use `globals` instead of `parameters`. Option (a) preserves Storybook semantics. | ✅ **Done** — Added `globals.layout` fallback |
| **1.2** | `Detail` story export fails | `session-graph-view--detail` renders `ViewHarness level="detail" selection="result:prt_tool_shell_2"`. The `result:` node may not exist in fixture. Change to `tool:prt_tool_read_1` (exists) or make selection optional. | ✅ **Done** — Changed to `tool:prt_tool_read_1` |
| **1.3** | Renderer tracking & capabilities | Track renderer in GraphView signal via `onRendererMounted`; add capabilities state to `useGraphState` with setter; move touch gestures to `GraphCanvasRegion` with renderer guard; add defensive guards for undefined model/node properties. | ✅ **Done** — `GraphView.tsx`, `GraphCanvasRegion.tsx`, `useGraphState.ts`, `cardTemplate.ts` |
| **1.4** | E2E test harness fixes | Fix mock session title in e2e utils; fix session title locator in wait utilities; add `role="heading"` to session header. | ✅ **Done** — `app.ts`, `waits.ts`, `session-identity-header.tsx` |
| **1.5** | Re-enable gate steps | Once 1.1–1.4 pass, `graph:verify` runs: library build, contract conformance, boundaries, controller, overlays, navigation, second host, 4 adapters, session-graph unit, session-ui graph unit, session-graph components, app e2e graph, side panels, capture verify, publish check — all green. | ⏳ **Blocked** — App e2e 43–44/46 pass (3 in §1b). Components 48 pass / 1 fail / 18 skip. Units 113 + 263 + 37 pass. |

**Acceptance:** `bun run graph:verify` green; `test:components` = 54 pass / 0 fail / 0 fixme.

---

## 3. Batch 2 — Persistence Test (one commit, one pipeline)

*Independent of Batch 1 code; runs after Batch 1 green.*

| # | Item | Change | Status |
|---|------|--------|--------|
| **2.1** | Persistence round-trip test | Add `packages/app/src/session/graph/graph-state.test.ts` covering `sessionGraphSchema` (`graph-state.ts:14-90`): every field round-trips, absent stays absent, unknown rejected/migrated, two session keys isolated. Runs under `bun test src/session/graph`. | ✅ **Done** — 16 tests passing, typecheck clean |

**Acceptance:** Test passes in `packages/app` unit suite. ✅

---

## 4. Batch 3 — Library L1/L2 + Publish + session-graph Branch (library repo, then this repo)

*Depends on Batch 1 green (L1 unblocks publish). Work happens in `spacegraphjs` sibling repo.*

| # | Item | Change |
|---|------|--------|
| **3.1** | L1: library build type-clean | `bvh.ts` — declare `three-mesh-bvh` augmentations once in version-agnostic `declare module` + cast through `unknown`; `SceneNode.ts` — read augmented geometry type; `kernel/index.ts` — resolve duplicate `EdgeID` re-export; `kernel/time-filter.ts` — split import (`import { Kernel }` for value, `import type { Node, Edge }` where used); `kernel/walks.ts` — drop unused `Edge`. |
| **3.2** | L2: consolidate library test file | Remove two empty tests (`:1331,:1335`). Merge duplicate `PhysicsPlugin`/`ErgonomicsPlugin` `describe`s; delete `Layout Engines` cases covered by `GridLayout`/`CircularLayout`/`HierarchicalLayout` blocks. |
| **3.3** | Publish 7 packages, leaf first | Order: `@spacegraphjs/renderer` 0.3.0 → `@spacegraphjs/kernel` 0.1.0 → `@spacegraphjs/adapter` 0.2.0 → `@spacegraphjs/spacegraph-renderer` 0.3.1 → `@spacegraphjs/cytoscape-renderer` 0.3.0 → `@spacegraphjs/svg-renderer` 0.2.0 → `spacegraphjs` 8.5.0. All `CONTRACT_VERSION = 3`. |
| **3.4** | `session-graph` branch consumes published | Branch from `dev`. Swap seven `workspace:*` for published versions. Remove seven `spacegraphjs` entries from root `workspaces` and `.gitignore`. Verify: clean clone → `bun install && bun run graph:verify` passes; `bun run graph:dev` serves. |

**Acceptance:** 7 packages on npm; `session-graph` branch verifies from clean clone, no sibling checkout.

---

## 5. Batch 4 — Evidence Study T2.2 (parallel from **end of Batch 1**)

*Needs only working build (Batch 1 provides). Does not wait for Batch 2/3.*

| Item | Protocol | Deliverable |
|------|----------|-------------|
| **T2.2** | n ≥ 5 participants, counterbalanced, canonical fixture (`session-ui/src/graph/fixture.ts`), 5 investigative tasks: (1) why file changed, (2) which calls led to failure, (3) subagent contribution, (4) changes after failure, (5) retries/direction changes. Measures: success, time, wrong turns, interactions, preference 1–7, verbatim quotes. | `rfc.md` with task script, raw per-participant table, one-page result + stop-rule decision (§10.2). **If negative: stop feature work, publish finding, keep library.** |

**Acceptance:** `rfc.md` written with measured outcome and decision.

---

## 6. Batch 5 — Ship (after Batch 3 + Batch 4)

| # | Item | Acceptance |
|---|------|------------|
| **5.1** | Hosted demo | `https://autonull.github.io/spacegraphjs7/contract.html` and `/second-host.html` load without provider key |
| **5.2** | Landing page | One screenshot, honest limitations (link `SPACEGRAPH.md` §8), stranger's path `git clone && bun run graph:setup && bun run graph:dev` |
| **5.3** | Demo video | `docs/spacegraph/demo.mp4` recorded **after Batch 1** (shows focus dimming, merged canvas) |
| **5.4** | Upstream PR | Rungs 1–4; rung 5 optional. Diff table from Batch 2. Review packet matches branch. |

---

## 7. Parked (with reason)

| Item | Why |
|------|-----|
| Residual `GraphView` split (~1,587 lines) | Maintainability, not correctness; not a gate |
| `GraphCanvasRegion` wide props (~60) / `useGraphState` return | Same |
| Library L3–L9 (worker, incremental patch, virtualisation, perf harness, release automation, activity types, minimap/depth) | Generic capability; owned by `spacegraphjs` |
| Rung 5 workspace endpoint | Optional; `snapshot-cache` degrades gracefully |
| Real 3D geometry, mobile graph mode, cross-session graphs | Need validated single-session result first |
| Empty-column exclusion, lane-gutter screen-fixing, overview whitespace | Cosmetic; revisit only if visual review or T2.2 names them |

---

## 8. Definition of Done

- [ ] `bun run graph:verify` green (library build, contract, boundaries, controller, overlays, navigation, second host, 4 adapters, session-graph unit, session-ui graph unit, session-graph components, app e2e graph, side panels, capture verify, publish check)
- [ ] `test:components` = 54 pass / 0 fail / 0 fixme without written finding
- [ ] One canvas component; one emphasis resolver; no dead `focus` option; no dead verbs; no `any` in renderer seam; no literal English in card markup
- [ ] CI pins library SHA (`9df9b92`) and matches `graph:setup`
- [ ] `SPACEGRAPH.md` §3, §6.1, §7.1, §9.1 truthful; §7.3 numbers traceable to command; `prototype.md` re-dated; no citation of missing `rfc.md`
- [ ] Library builds with zero TS errors; 7 packages published; `test:publish` green
- [ ] `session-graph` branch installs and verifies from clean clone, no sibling checkout
- [ ] Hybrid toggle, log text size, hybrid arrangements, permalinks, side panel, focus dimming, persistence round-trip all covered in gate
- [ ] Two demo URLs live; landing page with stranger's path; `demo.mp4` recorded after Batch 1
- [ ] T2.2 executed, written into `rfc.md`, stop-rule decision recorded
- [ ] Upstream PR open: rungs 1–4, rung 5 optional

---

## 9. Commands

```bash
# The gate (after Batch 1 this includes session-ui + app e2e + side panels)
bun run graph:verify

# Focused loops
cd packages/session-graph && bun test src && bun run typecheck
cd packages/session-graph && bun run test:components
cd packages/session-ui    && bun test src/graph
cd packages/app           && bun test src/session/graph
cd packages/app           && bun exec playwright test e2e/graph/session-graph.spec.ts
cd packages/app           && bun exec playwright test e2e/regression/side-panels.spec.ts
cd spacegraphjs           && pnpm exec vitest run
cd spacegraphjs           && pnpm exec vitest run test/spacegraph.test.ts

# Numbers and pictures
bun run graph:scale
bun run graph:capture --mode=compare
bun run graph:capture --mode=verify

# Library and publish
cd spacegraphjs && pnpm run build:lib && pnpm run build:packages
cd spacegraphjs && bun run test:publish

# Development
bun run graph:setup    # clone library at pinned SHA, install both trees
bun run graph:dev      # mock backend, no provider key
```

---

## 10. Immediate Next Action

1. **Hybrid scroll preservation** — the log's `scrollTop` resets when the map takes the panel alone and does not return in hybrid. The log pane is mounted and measured (no `display:none`), so trace what remounts the timeline on `sideBySide` false (`transcript(logActive)` identity, `createTimelineCache` key, `MessageTimeline` active/remount). Compare with the toolbar split toggle, which does preserve position.
2. **Stabilise the two flaky scroll tests** under parallel workers — reproduce with `--workers=3`, then wait on the visible row/scroll state instead of a fixed offset.
3. **`graph-scale` component** — decide whether the overview level intentionally hides turn cards; either restore the capped turn cards or update the story/test and record why.
4. Once these are green, re-run `bun run graph:verify`; then Batch 3 (library L1/L2) and Batch 4 (T2.2).
