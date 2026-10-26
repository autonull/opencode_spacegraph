# SPACEGRAPH.TODO.18.md — State of record: verified state and completed work

> **This file is not the plan.** Remaining work lives in `SPACEGRAPH.TODO.19.md`.
> Here: what is verifiably true today, what was completed and how it was verified, and the diagnostic
> evidence behind the open defects. Anything forward-looking in an earlier revision of this file has
> moved to TODO.19.

---

## 1. Ground truth (re-verified 2026-10-26, clean tree)

Branch `upstream-sync-1025`, fork tip `5c3093546c`.

| Check | Result | Command |
|---|---|---|
| session-graph unit | ✅ **116 pass** (398 ms, 973 assertions, 10 files) | `cd packages/session-graph && bun test src` |
| session-ui unit | ✅ **529 pass** (1.97 s, 4,144 assertions, 47 files) | `cd packages/session-ui && bun test src` |
| Typecheck | ✅ clean (session-graph `tsc -b`; session-ui 288 files) | per-package `bun run typecheck` |
| Component suite | ⚠️ **53 pass / 14 fail** (2.8 min, 1 worker, no retries locally) | `cd packages/session-graph && bun run test:components` |
| E2E critical path | ✅ **passes** — `session-graph.spec.ts:85` green in 9.6 s | `cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts:85` |
| Performance | ✅ **238.5 ms** pipeline at 5,001 msgs / 20,005 nodes / 36,673 edges — model 99.4 · layout 64.3 · render 74.8 (budget < 400 ms) | `bun run graph:scale` |
| SpaceGraphJS tree | ✅ clean, `main` @ `6587d32`, builds + 536 vitest + 109 kernel + `test:publish` green (prior session) | `cd spacegraphjs && pnpm run build && pnpm test` |
| Upstream divergence | upstream `dev` @ `e31647d68e`; merge-base `08ac673ab8`; **upstream +455 / fork +306**; **39 files changed on both sides** | `git fetch upstream dev; git rev-list --left-right --count upstream/dev...HEAD` |
| App surface | **+2,009 / −42 over 30 files** in `packages/app/src`; 10 new files (1,243 added lines), 20 upstream-owned (≈766) | `git diff 08ac673ab8..HEAD --stat -- packages/app/src` |
| Protocol/server surface | **+~900 lines** across `protocol/src/groups/graph.ts` (+39), `protocol/src/workspace-snapshot.ts` (+159), `server/src/graph/snapshot.ts` (+295), `handlers/graph.ts` (+30), regenerated client types (+130), `client/src/effect/api/api.ts` (+106) | `git diff 08ac673ab8..HEAD --stat -- packages/{protocol,server,client}` |
| Committed captures | **45 frames** in `docs/spacegraph/screenshots/` | `ls` |
| E2E graph specs | **106 tests** — 47 `session-graph.spec.ts`, 59 `capture.spec.ts` | `grep -c '^\s*test('` |
| CI graph gate | `.github/workflows/graph.yml` runs `bun run graph:verify` on PRs to `dev`; it checks out `autonull/spacegraphjs7` at branch tip (not the tested SHA) | `cat .github/workflows/graph.yml` |

### Package versions in the sibling tree (unpublished; host consumes `workspace:*`)

core `spacegraphjs 8.5.0` · `renderer 0.3.0` · `kernel 0.1.0` · `adapter 0.2.0` ·
`spacegraph-renderer 0.3.1` · `cytoscape-renderer 0.3.0` · `svg-renderer 0.2.0`.

Seven packages, not six: `packages/session-ui` depends on `@spacegraphjs/kernel`, so the published
set must include it.

---

## 2. Completed work

### 2.1 GraphView breakdown

| Extraction | File | Owns |
|---|---|---|
| State | `ui/useGraphState.ts` (325) | Basic signals/stores: level, projection, depth, layout, files, detail mode/framing, peek, follow log, facets, card facing, UI + renderer state, responsive, manual layout, model |
| Viewport | `ui/useGraphViewport.ts` | Camera, viewport, resting, fit, content IDs, fit options, `zoomBy`, `frame`, `focus` |
| Canvas region | `ui/GraphCanvasRegion.tsx` (370) | Canvas + overlays + A11y + windows + error/empty states |
| Windows | `ui/GraphWindowManager.tsx` (226) | Window kinds, content, anchors, z-order, drag/resize, pinned placement |
| Overlays | `ui/GraphOverlayManager.tsx` (231) | Peek, popover, note composer, search, legend, gallery, group menu, A11y, error/empty |
| Selection | `ui/useGraphSelection.ts` | Library `GraphController` mirrored into signals; selection verbs |
| Annotations | `ui/useGraphAnnotations.ts` (203) | Notes + trace overlay |
| Keyboard | `ui/useGraphKeyboard.ts` | Global shortcuts (Quality Gate `F`, `Shift+O`, `Alt+f`) vs canvas-region shortcuts |

Bugs fixed during the breakdown (all verified): hook initialization order (`useGraphSelection` before its
dependents); `viewportTracker ↔ cardScreenWidth` circular dependency via an initialised-later signal;
temporal dead zones (`geometry`, `renderModel`, `budget`, `contentIDs`, `displayPositions`, `fitOptions`);
`canvasRegionEl` ref callback; **renderer never connected to the viewport tracker** (zoom readout now
reactive, 100% → 183%); static `zoomPercent`; `ResizeObserver` "parameter 1 is not of type 'Element'"
(guards added in `spacegraphjs/src/utils/resizeObserver.ts`).

`GraphView.tsx` remains **1,674 lines** — the "thin composition ≈200 lines" sketch in the previous
revision of this file was aspirational and is retracted.

### 2.2 Toolbar breakdown

`GraphLayersControl` (334), `GraphLayoutControl`, `GraphDrawControl`, `GraphShowControl`,
`GraphTimeControl`, `GraphQuestionsControl`, `GraphZoomControl`, `GraphExportControl`,
`GraphRendererStatus`; `GraphToolbar.tsx` composes them (330 lines).

### 2.3 Vocabulary consolidation

Single source in `session-ui/src/graph/vocabulary.ts` (`VOCABULARY_KEYS`, `DepthMode`, kinds, statuses,
layouts, detail modes, arrangements, sides); `session-graph/src/ui/vocabulary.ts` **removed**; 12 UI
components import the shared keys.

### 2.4 Adapter simplification

`CytoscapeSessionAdapter` subclass removed; `cardBudget` is a constructor parameter; both renderers use
one `SessionGraphAdapter`.

### 2.5 Library (generic) changes

- `layoutApplied` event added to the `@spacegraphjs/renderer` contract and forwarded
  `spacegraphjs` core (`layout:applied`) → `spacegraph-renderer` → `GraphCanvas` → host.
- `Element instanceof` guards in `spacegraphjs/src/utils/resizeObserver.ts`.
- TypeScript fixes for publishability across `adapter` (`ModelAdapter`, `build-utils`, `diff`) and
  `kernel` (`time-filter`, `walks`).
- `packages/storybook/package.json` wired to the `spacegraphjs` workspace packages.

---

## 3. Component-suite failures — evidence (diagnostic, not a plan)

14 failures were reproduced on 2026-10-26. Error contexts show **wiring regressions from the
breakdown**, not test-isolation noise:

| Test | Evidence from the error context |
|---|---|
| `graph-windows.spec.ts:6` | Selection renders ("1 selected", Frame/Keep/Copy/Export/Add note), toolbar and breadcrumbs fine — the popover's **"Open in a window"** button never becomes clickable (60 s timeout) |
| `graph-windows.spec.ts:59` | Same missing button, reached via a different path |
| `graph-windows.spec.ts:78` | Pinned-window pan path depends on the same open action |
| `graph-equalizer.spec.ts:6` | `graph-window` exists; `graph-equalizer-rule` **resolves to 0 elements** on 23 polls |
| `graph-minimap.spec.ts:3` | `graph-minimap` exists; **no `circle`** in it |
| `graph-detail.spec.ts:90` | Peek does not answer without selection |
| `graph-view.spec.ts:13` | View-level question verbs fail; snapshot shows the view fully mounted (zoom 183%, level Overview, 1 selected) with the node reported "hidden at this level" |
| `graph-bands.spec.ts:47` | Layout-metric overlap assertion; `layoutApplied` wait already present |
| `graph-motion.spec.ts:70,85` | Motion timing assertions |
| `graph-states.spec.ts:120` | Pixel visibility at zoom limits |
| `graph-toolbar.spec.ts:38` | Exact inline-control count |
| `graph-3d.spec.ts:72` | Card shear vs billboard |
| `graph-capture.spec.ts:107` | Cytoscape capture |

**Harness facts (correct a previous assumption):** `reuseBrowser` is not an option here — the suite is
page-based against a shared Storybook server (`packages/storybook/playwright/config.ts`:
`fullyParallel`, `retries: 2` on CI only, `workers: 2` on CI only, `timeout: 60 s`,
`expect.timeout: 10 s`, `reuseExistingServer: !CI`). There is no config-level isolation switch to buy
back six tests.

---

## 4. Corrections to documentation still pending

Listed so the next session does not trust stale text; each is a TODO.19 action.

| Document | Stale claim |
|---|---|
| `SPACEGRAPH.md` §3, §7.1 | "No protocol, server, or session-schema changes" — false; see §1 (≈900 lines) |
| `SPACEGRAPH.md` §6.1 | `spacegraphjs 8.4.0`; missing `svg-renderer 0.2.0` / `spacegraph-renderer 0.3.1` |
| `SPACEGRAPH.md` §9.1 | Four-rung ladder with old diff numbers; needs a fifth (optional) server rung |
| `SPACEGRAPH.md` §13.1 | `bun run graph:setup` **does not exist** in root `package.json` |
| `docs/spacegraph/README.md` | Setup section assumes the sibling checkout with no setup script |
| `docs/spacegraph/prototype.md` | Tested-revision table (upstream `ba06ff9e0b`, library `f7cf48a`) predates 455 upstream commits and `6587d32` |
| `rfc.md` | Referenced as prepared; **does not exist** |

---

## 5. Repository state

- Branch `upstream-sync-1025`; remotes `origin` (`autonull/opencode_spacegraph`) and
  `upstream` (`anomalyco/opencode`).
- Sync convention: **merge** with message `chore: sync upstream dev` (cf. `ffc6bced61`, `098e601068`,
  `f802f5e707`). Never rebase the fork's 306 commits.
- `spacegraphjs/` is gitignored (line 42) and wired in root `package.json` `workspaces` as **7 entries**
  (`spacegraphjs` + `packages/{renderer,adapter,spacegraph-renderer,cytoscape-renderer,svg-renderer,kernel}`);
  its own git repo is on `main`.
- Graph code owns: `packages/session-ui/src/graph` (pure model), `packages/session-graph` (host UI,
  132 files / +16,009), `packages/app/src/session/graph` (10 of the new app files),
  `packages/gui-extensions/src/session-map` (+274), `script/{graph-dev,graph-verify,capture-graph-demo}.ts`.

## 6. Environment gotcha (do not chase)

`bun run check` fails in `@opencode/ai` (`zstdCompressSync` missing from `node:zlib`) because this
checkout lives under a home directory, so `tsc`'s type-root walk-up finds a stray
`~/node_modules/@types/node@22.10.2` that shadows the repo's `@types/node@24.12.2`. It passes on bare
upstream in a clean worktree. The accepted fork gate is `graph:verify` plus per-package typechecks.
