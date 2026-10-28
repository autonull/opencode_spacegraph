# SPACEGRAPH.TODO.20 — Remaining Work

> **Context:** `SPACEGRAPH.TODO.19.md` records completed work. This file contains only open items. Dependency order is strict: each batch must be green before the next starts. The go/no-go decision is T2.2 (Batch 4).

---

## 1. Verified State (2026-10-27, after this pass)

| Check | Result |
|-------|--------|
| `session-graph` unit | **113 pass / 0 fail** |
| `app` graph-state unit | **37 pass / 0 fail** |
| `session-graph` component tests | **48 pass / 1 fail / 18 skip** (remaining: `graph-scale.spec.ts` turn cards count 0) |
| App e2e graph | **~35 pass / 10 fail** (was 0 pass; mount and card layout now work; hybrid log renders) |
| Typecheck | `session-graph` and `app` clean |
| Library vitest | 539 pass (build still has TS errors — L1) |
| `graph:verify` | **Blocked** on the remaining e2e/component failures below |

### 1a. Fixed in this pass

- **Card geometry was empty.** `displayPositions`/`renderCard` were created before `geometry`, so their memos cached an empty map. Moved them after `geometry`; node cards now use their real layout positions instead of stacking at the origin.
- **Viewport feedback loop.** Equal viewport reports rebuilt a new object on every camera event, recursively restarting Solid updates (`Maximum call stack size exceeded`). `setViewport` now ignores identical zoom/center reports.
- **Budget never settled.** Repeated identical camera reports cleared the resting timer forever. `setResting` now ignores duplicate centers, so the budget follows the camera.
- **Reactive props were frozen.** `canvasRegionProps` captured `renderModel()`, `ordered()`, popover values, error, etc. as plain values. These are now getters, restoring facet filtering, keep-only, notes, compare bar, and card-budget updates.
- **Budget order.** Proximity ordering now runs before the node budget, so the nearest cards win the budget.
- **Comparison.** `useComparison` reads checkpoint/turn count through accessors; `GraphCompareBar` reads `props.diff` reactively; clear resets the checkpoint to live.
- **Notes.** `GraphView` and `useGraphAnnotations` now share one notes store, so saved notes appear in the map.
- **Toolbar.** Search/questions/export render in the desktop View menu (tests open the menu first); time control receives the live model.
- **Persistence.** Creating a session view entry includes `scroll: {}`, matching the layout schema and fixing reload persistence.
- **E2E.** Log text size uses the actual max (`1.4`); capture and session specs open the View menu before Search.
- **Hybrid log blank.** The cached `MessageTimeline` now receives a combined `active` signal that includes the log pane visibility (`splitVisible`). This makes the virtualizer re-measure when the log pane becomes visible in hybrid mode, fixing the blank log in "shows map+log", "picking a node moves log", and related tests.

### 1b. Remaining e2e failures (10)

| Group | Tests | Likely cause |
|-------|-------|--------------|
| Hybrid log (partial) | scales log text, restores transcript position, log scroll to node | Log now renders rows (fixed), but: font size slider doesn't change size; transcript position restore times out; log doesn't auto-scroll to revealed node. |
| Camera input | pans with right mouse, zooms with wheel, card budget follows camera (T17.5) | Right-drag and wheel do not reach the renderer camera; all three depend on a working pan/zoom. Check the canvas/CSS3D input path after the graph canvas refactor. |
| Fallback mount | falls back to Cytoscape | Renderer mount fails with `Maximum call stack size exceeded` under the aborted SpaceGraph module path. Same reactive/error-path class as above; reproduce with the console stack. |
| Component | `graph-scale` turn cards | Scale story renders the notice but zero `.html-node-container:has([data-kind="turn"])`. Check the overview card budget / shaping after the geometry fix. |

---

## 2. Batch 1 — Fix Component Tests + Gate Closure (one PR, one pipeline)

**Must complete before any other batch.**

| # | Item | Fix | Status |
|---|------|-----|--------|
| **1.1** | Story root hidden on `parameters: { layout: "fullscreen" }` | In `packages/stories/src/frame.tsx:49`, `parameters.layout` reads from story `parameters`, but component tests pass `globals: { layout: "fullscreen" }`. Either: (a) make frame read `globals.layout` as fallback, or (b) change stories to use `globals` instead of `parameters`. Option (a) preserves Storybook semantics. | ✅ **Done** — Added `globals.layout` fallback |
| **1.2** | `Detail` story export fails | `session-graph-view--detail` renders `ViewHarness level="detail" selection="result:prt_tool_shell_2"`. The `result:` node may not exist in fixture. Change to `tool:prt_tool_read_1` (exists) or make selection optional. | ✅ **Done** — Changed to `tool:prt_tool_read_1` |
| **1.3** | Renderer tracking & capabilities | Track renderer in GraphView signal via `onRendererMounted`; add capabilities state to `useGraphState` with setter; move touch gestures to `GraphCanvasRegion` with renderer guard; add defensive guards for undefined model/node properties. | ✅ **Done** — `GraphView.tsx`, `GraphCanvasRegion.tsx`, `useGraphState.ts`, `cardTemplate.ts` |
| **1.4** | E2E test harness fixes | Fix mock session title in e2e utils; fix session title locator in wait utilities; add `role="heading"` to session header. | ✅ **Done** — `app.ts`, `waits.ts`, `session-identity-header.tsx` |
| **1.5** | Re-enable gate steps | Once 1.1–1.4 pass, `graph:verify` runs: library build, contract conformance, boundaries, controller, overlays, navigation, second host, 4 adapters, session-graph unit, session-ui graph unit, session-graph components, app e2e graph, side panels, capture verify, publish check — all green. | ⏳ **Blocked** — App e2e 32/46 pass; 14 fail (see §1b). Components 48 pass / 1 fail / 18 skip. Units 113 + 263 + 37 pass. |

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

1. **Camera input** — verify pointer/wheel events reach the SpaceGraph canvas after `GraphCanvasRegion`; fix the pan/zoom path. This unblocks 3 tests including T17.5.
2. **Cytoscape fallback** — run the single failing test with the mount error stack; fix the fallback path without reintroducing the viewport loop.
3. **`graph-scale` component** — inspect the overview render model for 80 turns and restore turn cards (or update the story/test if the level intentionally hides them).
4. **Hybrid log polish** — font size slider doesn't change size in hybrid; log doesn't auto-scroll to revealed node; transcript position restore times out.
5. Once these are green, re-run `bun run graph:verify`; then Batch 3 (library L1/L2) and Batch 4 (T2.2).
