# SpaceGraph prototype — final write-up

Companion to `SPACEGRAPH.md` (design) and `SPACEGRAPH.TODO.2.md` (living plan). `SPACEGRAPH.TODO.1.md`
is frozen as the Phase 0–10 specification and pass log.

This is the release artifact for the prototype: what was built, how to run and reproduce it, what was
measured, and what remains open. `R7.1` (library docs) lives in the `spacegraphjs` repo
(`README.md`, `AGENTS.md`, `docs/host-integration.md`); the library change history is the `spacegraphjs`
git log.

## Hypothesis

> When agent activity becomes sufficiently complex, spatial navigation through relationships is more
> effective than linear navigation through messages.

The transcript stays the dependable baseline. The graph is an alternate, opt-in representation built
from existing session data. No protocol, server, or session-schema changes. Success is not "a graph
exists": it is that a user can answer questions the transcript makes expensive — why a file changed,
which calls led to a failure, what a subagent contributed, what changed after a failing test, and
where the agent retried or changed direction.

## Tested revisions

| Repository | Revision | Notes |
|---|---|---|
| OpenCode (`opencode` monorepo) | `dev` synced with upstream `dev` @ `ba06ff9e0b` (merge `f802f5e707`) | Branch `dev`; the upstream sync merged 41 commits with no textual or semantic conflicts (upstream touched no `packages/app/src` or `packages/ui`). Prior fork tip was `6479486583`. |
| SpaceGraphJS (`spacegraphjs`, sibling repo, gitignored here) | code `f7cf48a` | Branch `main`; the library change history is its git log. `55ded02` adds the depth spectrum (primitives, `setDepth`, contract v2); `5abf80d` includes node extents in the fit bounds so edge cards are not clipped; `4e5f733` fixes the billboard, fit and camera-zoom behaviour; `0bb41fd` publishes the contract demo to GitHub Pages |

Linkage is "sibling git repo, pinned SHA, not vendored, not a submodule" (P0.2). `spacegraphjs/` is
gitignored in the OpenCode repo; its commits are recorded here by SHA.

## Architecture

Ports and adapters, with the SpaceGraphJS core kept pure:

```
Session messages + status + turn diffs
              │
              ▼
  @opencode/session-ui/graph      GraphModel + levels + layout + selectors (pure, tested)
              │  RenderModel (renderer-facing, stable IDs, absolute positions)
              ▼
  @spacegraphjs/renderer          contract types + version helper, zero deps
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
 [spacegraph] [cytoscape] [svg]
  2D + 3D      2D        static
     │        │        │
     └────────┴────────┘
              ▼
  @opencode/session-graph         canvas, toolbar, inspector, breadcrumbs, search, minimap, a11y
              │
              ▼
  packages/app                    per-session mode switch, lazy wrapper, toggle, commands
```

- **Model** — `packages/session-ui/src/graph/{model,levels,layout,selectors,fixture}.ts`. Pure and
  synchronous. `buildGraph` reuses the timeline projection's `turnByMessageID` (no second walk) to
  group steered prompts into one turn. It builds session/turn/phase/message/reasoning/tool/subagent/
  file/result/error/retry/diff/compaction/notice nodes and `part-of`/`sequence`/`delegates`/`reads`/
  `writes`/`searches`/`produces`/`references`/`compacts`/`evidence` edges. `inferred-cause` is never
  emitted from adjacency. `levels.ts` owns the semantic policy (§5.4); `layout.ts` assigns lanes,
  ordinals, and depths deterministically (append-only).
- **Contract + leaves** — `spacegraphjs/packages/{renderer,adapter,spacegraph-renderer,cytoscape-renderer,svg-renderer}`.
  The core never imports the contract; only the SpaceGraph adapter imports both. The model adapter
  (`@spacegraphjs/adapter`) owns the domain-model → `RenderModel` pipeline and imports the contract
  only, so a second host can reuse the pipeline without the renderer packages.
- **Host UI** — `packages/session-graph` imports the contract, never a concrete backend. No
  `renderer === "cytoscape"` branch exists; differences are capability flags.
- **Integration** — `packages/app/src/session/graph/` (lazy wrapper) + `session/header/session-graph-toggle.tsx`
  + a mode branch in `screen.tsx` + a `graph` field on `sessionViewSchema`. This is the whole app diff.

## How to run

Reproduce the screenshots and prove conformance from the repo root:

```bash
bun run graph:capture --mode=compare   # regenerate all committed screenshots
bun run graph:capture --mode=verify    # assert the committed set without overwriting it
bun run graph:verify                   # contract conformance + boundaries + packages + suites + capture verify
```

Focused checks (never run tests from the repo root):

```bash
cd packages/session-ui && bun test src/graph
cd packages/session-graph && bun run typecheck && bun test src && bun run test:components
cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts
cd spacegraphjs && pnpm exec vitest run && bun run test:boundaries
```

The non-OpenCode reference host runs from the library repo: `pnpm run dev:demo` (vite on 5173), then
`SG_DEMO_URL=… node_modules/.bin/playwright test test/e2e/contract-demo.spec.ts --workers=1`.

## Canonical verification story (T1.6)

The accepted gate for this fork is **`bun run graph:verify`** + per-package typechecks. The repo-level `bun run check`
fails on this checkout in `@opencode/ai` (`zstdCompressSync` missing from `node:zlib`) because the checkout
lives under a home directory, so `tsc`'s type-root walk-up finds a stray `~/node_modules/@types/node@22.10.2`
that shadows the repo's `@types/node@24.12.2`. This is an environmental issue (checkout location), not a fork
or merge regression — `bun run check` passes on bare upstream in a clean worktree (T0.7). A reviewer should
run `graph:verify` and the per-package typechecks listed above; any other failures are environmental.

## Screenshots

Committed in `docs/spacegraph/screenshots/`, deterministic (viewport 1440×900, DPR 1, dark scheme,
en-US, reduced motion, clock-free fixture):

| File | Content |
|---|---|
| `00-spike-spacegraph.png` | P0.5 embed spike (predates chrome opt-in) |
| `01-log.png` | baseline transcript |
| `02-graph-overview.png` | SpaceGraphJS 2D overview, counted phase clusters |
| `03-graph-execution.png` | execution neighborhood with files and error/retry chain |
| `04-graph-selected.png` | selected node with inspector detail |
| `05-return-to-log.png` | transcript restored at the same position |
| `06-graph-3d.png` | 3D toggle, selection preserved |
| `07-cytoscape-overview.png` | Cytoscape adapter, same model |
| `08-cytoscape-selected.png` | Cytoscape adapter, selected |
| `09-contract-demo-light.png`, `10-contract-demo-dark.png` | non-OpenCode demo, light/dark (the L1.4 check) |
| `11-graph-timeline.png` | Timeline layout (RF.2/LE.11), wrapped per-turn rows |
| `12-graph-hierarchy.png` | Hierarchy layout (RF.2/LE.11), indented outline |
| `13-graph-narrow.png` | 390×900 narrow viewport with the bottom-sheet inspector |
| `14-graph-light.png` | light scheme parity (RF.9) |
| `15-graph-ribbon.png` | turn ribbon representation (LE.8) |
| `16-graph-matrix.png` | turn matrix representation (LE.9) |
| `17-graph-files.png` | file-first lens: changed-files rail + bundled provenance (LE.12/LE.13) |
| `18-graph-layered.png` | `layered` 2.5D depth treatment (LE.14) |
| `19-graph-depth-stack.png` | `depth-stack` depth treatment (LE.14/LE.16) |
| `20-graph-zoom-150.png` | camera at 150% of the fit |
| `21-graph-zoom-max.png` | the closest zoom the renderer allows |
| `22-graph-turn-1.png` | camera centred on the first turn |
| `23-graph-turn-2.png` | camera centred on the second turn |
| `24-graph-failure-chain.png` | the failing test run, at the closest zoom |
| `25-graph-scale-window.png` | a long session at the drawn window: 60 of 80 turns, with the notice |
| `20`–`24-cytoscape-*.png` | the same five frames over the Cytoscape adapter |

`02`/`03`/`04` come from the app's routed session (`packages/app/e2e/graph/capture.spec.ts`); `07`/`08`
come from the Storybook story (`packages/session-graph/component-tests/graph-capture.spec.ts`) because
the app has no renderer selector (renderer choice is a prototype setting, per §4.7).

### Capture matrix (LE.16)

The captures are one frame per option value at the benchmark state (execution level, lanes layout, flat
depth, SpaceGraph renderer), so each axis can be read against a stable baseline. The axes are not a full
cartesian product because they are not independent: `ribbon`/`matrix` replace the layout, and depth is a
camera/fog treatment over the node-link layout's Z (the summaries place every node at `z = 0`).

| Axis | Values | Captures |
|---|---|---|
| Representation | `graph` | `02` (overview), `03` (execution), `04` (selected) |
| | `ribbon` | `15` |
| | `matrix` | `16` |
| Layout (graph) | `lanes` | `02`/`03`/`04` |
| | `timeline` | `11` |
| | `hierarchy` | `12` |
| Depth (graph, lanes) | `flat` | `03` |
| | `layered` | `18` |
| | `depth-stack` | `19` |
| | `orbit` | `06` |
| Lens | files rail + bundled provenance | `17` |
| Context | narrow 390×900 / light scheme | `13` / `14` |
| Camera | 150% of fit / closest zoom | `20` / `21` |
| Camera | centred on turn 1 / turn 2 / the failed run | `22` / `23` / `24` |

`graph:capture --mode=compare` regenerates this matrix (the app frames plus the Cytoscape story) and
`--mode=verify` asserts the committed set exists **and that no two frames of the zoom/pan matrix are
the same picture** (T6.19: five of the ten used to be one picture under five names). The depth modes
are captured at the compact lanes framing, where the fog cue is legible; the fade is scene-relative,
and the DOM cards do not fade with the scene at all (see known limitation 16).

## Visual checklist (T1.7)

Every capture batch must be inspected against this checklist before committing:

- [ ] **Labels legible:** All toolbar labels, lane chips, axis labels, node labels, and inspector text are readable at 1440×900, 1100×700, and 390×900.
- [ ] **No clipping:** No label or content is clipped at any of the three viewport sizes.
- [ ] **No dominant empty region:** The canvas is not mostly empty; content fills the frame proportionally.
- [ ] **Bands behind content:** Lane bands, phase bands, and depth bands render behind cards, never occluding them.
- [ ] **Zero console errors:** No errors in the browser console during capture.
- [ ] **Light and dark:** Both color schemes render correctly with sufficient contrast (≥ 3:1 for non-text, ≥ 4.5:1 for text).
- [ ] **Selection visible:** The selected node is visible on the canvas, or the UI explains why it is hidden and offers a way to reveal it.
- [ ] **Breadcrumbs coherent:** Every selected node kind has a meaningful breadcrumb path (provenance for files: Session → turn → file).
- [ ] **Camera zoom safe:** Fit, 150%, and the closest zoom are all legible and pannable; the closest zoom is not blank; the zoom readout shows a percentage.

This checklist is applied by `graph:capture --mode=compare` (manual inspection) and recorded in the log.

## Renderer comparison (U3.6)

Both adapters consume the same `RenderModel` (same fixture, same `buildRenderModel`). The differences
are declared capabilities, not behavior:

| Aspect | SpaceGraphJS (`@spacegraphjs/spacegraph-renderer`) | Cytoscape (`@spacegraphjs/cytoscape-renderer`) |
|---|---|---|
| Projection | 2D orthographic + 3D perspective | 2D only (`setProjection('3d')` is a declared no-op) |
| Lazy chunk (built app) | core `activity-*.js` 1,039.6 KB min / 282.0 KB gzip (includes `three`) | `cytoscape.esm-*.js` 435.0 KB min / 137.9 KB gzip |
| HTML cards | CSS3D `HtmlNode`/`DOMNode`, cap 40 | clipped DOM overlay, cap 20 |
| Edge labels | CSS2D, constant screen size, decluttered | cytoscape labels |
| Cluster nodes | model nodes | model nodes (compound-free) |
| Minimap | host SVG (renderer-agnostic) | host SVG (renderer-agnostic) |
| Selection, click/drag, fit/focus, viewport | contract events | contract events |

Navigation for the five mission questions is identical in both (toolbar level, breadcrumbs, search,
inspector, edge-follow); the toolbar disables 3D with an explanation under Cytoscape. The default
renderer stays SpaceGraphJS because it is the only one with the 2D+3D story the hypothesis tests;
Cytoscape is the 2D fallback and benchmark and renders the same model with no host branch.

## Performance (V5.7)

| Metric | Budget (§9) | Measured |
|---|---|---|
| Model build, 300-message / 1201-node synthetic stream (`performance.test.ts`) | 200 msgs < 50 ms | ~27 ms (guard ceiling 250 ms) |
| Whole pipeline, 5,001-message / 20,005-node stream (`scale.test.ts`) | — | 55 ms model + 42 ms layout + 63 ms render (guard ceiling 400 ms) — see [Scale and streaming budget](#scale-and-streaming-budget-t66-measured-2026-10-20) |
| Force layout, same stream | — | 9.3 s uncapped; ~0.2 s over the 60-turn window the host draws — see [The two free geometries](#the-two-free-geometries-t71t73-measured-2026-10-20) |
| Lazy SpaceGraphJS chunk (gzip, excluding `three`) | < 400 KB | core chunk 282.0 KB gzip incl. `three`; adapter 2.0 KB gzip |
| Lazy Cytoscape chunk (gzip) | < 250 KB | 137.9 KB |
| Session-graph UI chunk | — | 28.3 KB min / 8.8 KB gzip |
| Session entry delta (P0.1 / T0.7) | no measurable regression | entry `index` 654.66→656.09 kB (gzip 201.30→201.62); session route 361.12→355.31 kB (gzip 109.18→106.88); new lazy `graph` chunk 37.55 kB min / 11.82 kB gzip |
| First graph paint / pan frame rate | < 500 ms / 60 fps | **unmeasured** — no graph perf harness; DOM/canvas readiness is asserted instead |

`packages/session-ui/src/graph/performance.test.ts` is the complexity guard: a 300-message, tool-heavy
stream must build and lay out under a generous ceiling, catching an accidental O(n²) join without
flaking under CI load. The unmeasured row is recorded, not lowered.

### Scale and streaming budget (T6.6, measured 2026-10-20)

`bun run graph:scale` runs the whole pipeline on synthetic sessions and prints the table below
(`packages/session-graph/script/scale-bench.ts`). One "turn" is a user message, an assistant answer
with a read, an edit and a shell call, and an idle marker.

| Messages | Nodes | Edges | Model build | Layout | Render model | Render diff | One streamed update |
|---|---|---|---|---|---|---|---|
| 102 | 409 | 747 | 2.3 ms | 3.2 ms | 7.5 ms | 1.1 ms | 6.5 ms |
| 1,002 | 4,009 | 7,347 | 9.8 ms | 7.3 ms | 12.8 ms | 9.9 ms | 37.8 ms |
| 5,001 | 20,005 | 36,673 | 55.3 ms | 41.7 ms | 63.0 ms | 57.7 ms | 227.1 ms |

**The pipeline was quadratic and now is not.** The first run of this benchmark took **27.5 seconds**
to build the render model of a 5,001-message session. Two passes were to blame, and both are now
single passes: the library's band geometry re-indexed the whole model for every band, and the
host's band builder filtered the whole node list for every turn. The render build is now 63 ms at
the same size — **436× faster** — and the numbers above grow linearly with the session.

**The map does not carry the whole session.** A long session is drawn as its recent tail: the map
shows the last 60 turns (plus the turn the reader is looking at), and the view says so
("Showing 60 of 1,666 turns. The transcript has the rest."). The cap is a host policy
(`packages/session-ui/src/graph/scale.ts`), not a silent drop: the layout still measures the whole
session, so the position of a node that stays in the window does not move when the window slides.

**Incremental patches stay deferred, with the number that would reopen them.** The host rebuilds
the model, the layout, and the render model on every streamed chunk, and the renderer is handed the
whole thing. That costs 38 ms at 1,002 messages and 227 ms at 5,001. The diff between two
consecutive render models is now a library primitive (`diffRenderModels` in
`@spacegraphjs/adapter`) and it says how little actually moved — 3 nodes of 20,005 — so an
incremental path has a seam to build on. The P8.8 work stays deferred until a session above roughly
2,000 messages is a normal thing to open, at which point the 227 ms update is the number to beat.

**The guard.** `packages/session-graph/src/canvas/scale.test.ts` builds the render model of a
5,000-message session and fails above 400 ms — a ceiling the measured 63 ms clears by 6×, and the
quadratic path (2,482 ms) breaks by 6×. The library has the matching call-count guard
(`spacegraphjs/test/layout/strategies.test.ts`): a layout may ask each node for its turn a bounded
number of times, which is what "not quadratic" means in a test that cannot flake.

### The two free geometries (T7.1–T7.3, measured 2026-10-20)

The same benchmark, with the tree and the force simulation added as columns. A second run, so the
pipeline's own numbers move by a few percent (the model build reads 2.4 ms where the run above read
2.3 ms, the render build 78 ms where it read 63 ms); the shape is what matters.

| Messages | Nodes | Tree layout | Force layout |
|---|---|---|---|
| 102 | 409 | 6.0 ms | 208.7 ms |
| 1,002 | 4,009 | 11.4 ms | 2,318.5 ms |
| 5,001 | 20,005 | 75.9 ms | 9,319.8 ms |

**The tree is a linear pass and the force simulation is not cheap.** The tree walks the model once
and places the boxes; the simulation runs a fixed number of cooling steps over a neighbour grid, and
its cost grows with the content — at 20,005 nodes it is **9.3 seconds**, two orders of magnitude
above the lanes layout on the same model.

**What a reader actually pays is much less.** The host draws a long session as its recent tail — the
last 60 turns — so the force layout sees a few hundred boxes rather than twenty thousand: the
measured 209 ms at 409 nodes is the number the reader waits for, and it is paid once per view
switch, not per frame. The uncapped number is the reason the simulation is frozen after one run:
a live simulation over a whole session would cost that again on every streamed message.

### Entry-delta baseline (T0.7, captured 2026-10-19)

`packages/app` was built with `bun run build` from a clean `git worktree` of upstream `dev` @
`ba06ff9e0b` and from the merged tree @ `f802f5e707`; chunk names and sizes are read from the Vite
build log.

| Chunk | Upstream `ba06ff9e0b` | Merged `f802f5e707` | Δ |
|---|---|---|---|
| App entry `index-*.js` | 654.66 kB (gzip 201.30) | 656.09 kB (gzip 201.62) | +1.43 kB |
| Session route `route-*.js` (largest) | 361.12 kB (gzip 109.18) | 355.31 kB (gzip 106.88) | −5.81 kB |
| Secondary route `route-*.js` | 45.50 kB (gzip 13.63) | 45.63 kB (gzip 13.66) | +0.13 kB |
| Graph view `graph-*.js` (lazy) | — | 37.55 kB (gzip 11.82) | +37.55 kB (lazy only) |

The graph is a separate lazy chunk referenced from the route's import map; the session entry/route
delta is within bundler re-split noise (≈±6 kB), so there is no measurable regression to the initial
session load. First paint has no harness and stays unmeasured.

`bun run check` **passes on bare upstream** here (34/34 turbo tasks) and **fails on this checkout**
only in `@opencode/ai` (`zstdCompressSync` missing from `node:zlib`). Cause: the main checkout lives
under the home directory, so `tsc`'s type-root walk-up finds a stray `~/node_modules/@types/node@22.10.2`
and shadows the repo's `@types/node@24.12.2`; the `/tmp` upstream worktree has no such ancestor and
resolves the repo copy. This is environmental (checkout location), not a fork or merge regression; see
T1.6.

## Upstream readiness

The contribution is prepared as four independently reviewable rungs, so a maintainer can take the
low-risk one without taking the whole experiment.

| Document | What it carries |
|---|---|
| [`upstream-pr.md`](./upstream-pr.md) | The ladder: model → host package → app wiring → hybrid affordance. Each rung names its files, diff size, tests, screenshots, rollback, and the one review question it answers. Names the dependency blocker (published library packages) and the RFC deferral. |
| [`upstream-review.md`](./upstream-review.md) | The maintainer packet: problem, hypothesis, measured results, **diff-budget table (§5)**, flag and rollback, bundle numbers, a11y, security, ownership, review commands, and 12 review questions. |
| [`security.md`](./security.md) | The sanitization contract: what is untrusted, who escapes what, the CSP expectation per renderer, and the deliberate non-goals (`javascript:` URLs, bidi overrides, raw text in the JSON export). |
| [`demos.md`](./demos.md) | The three demo surfaces and which one to open. |
| [`decisions.md`](./decisions.md) | 20 ADRs: every major choice, with its reason and its fallback. |

**Diff budget (T3.8), re-audited 2026-10-19** against the upstream merge base:

| Area | Δ | Verdict |
|---|---|---|
| `packages/app/src` (16 files) | +689 / −36 | Setting, mode branch, commands, toggle, per-session state, scroll restore. No graph semantics outside `session/graph/*.tsx`. |
| `packages/app` dev-only demo | +149 / −18 | `bun run graph:dev`; excluded from an upstream diff. |
| `packages/session-ui/src/graph/` (13 files) | +3,487 | New pure model package. |
| `packages/session-graph/` (57 files) | +5,660 | New host package; imports the renderer contract only. |
| `packages/gui-extensions/src/session-map/` | +274 | Side panel, mounted as a built-in extension. |

The per-file table with a justification for every app edit is in `upstream-review.md` §5.

## Accessibility (V5.8)

- Library layer: `spacegraphjs/test/a11y.test.ts` (jsdom) — roving tabindex, Arrow/Home/End skipping
  non-interactive items, Enter/Space, Escape, and the `aria-live` announcement.
- Browser traversal against **both** adapters: `packages/session-graph/component-tests/graph-a11y.spec.ts`
  walks the hidden mirror to a node, activates it with Enter, and asserts the inspector under
  SpaceGraphJS and after switching to Cytoscape.
- The app has no dedicated axe/automated suite; the keyboard path is exercised through the component
  suite and the app e2e. Reduced motion is emulated in the capture spec; the adapter camera animation
  has no dedicated reduced-motion assertion.

## Cross-environment (V5.9)

| Environment | Result |
|---|---|
| Web dev (`bun run test:e2e -- e2e/graph/session-graph.spec.ts`) | 10 pass |
| Built web (`PLAYWRIGHT_BUILD=1`, same spec) | 9 pass, 1 skipped (the dev-only module-load fallback, whose chunk URL is hashed) |
| Storybook component suite (`bun run test:components`) | 15 pass |
| Non-OpenCode demo (`test/e2e/contract-demo.spec.ts`, library repo) | 5 pass |
| Desktop shell | **not run** in this environment |
| SpaceGraphJS demo pages (`test/e2e/hardening.spec.ts`) | **not run** in this environment |

Known caveat: WebGL under headless Chromium uses SwiftShader; the capture waits on the preserved
drawing buffer rather than a frame count, and DOM assertions are preferred where a pixel is not the
contract.

## Hybrid log + graph (Phase 6)

Progressive disclosure over the transcript: a compact subgraph of one turn opens over the log, so the
reader never loses their place. Nothing injects into timeline rows.

- **H6.1 host decision.** `packages/app/src/session/graph/turn-map-overlay.tsx` mounts the library
  `TurnMapOverlay` lazily inside the session panel's relative container (`screen.panel.ref`), so it
  covers the panel in either mode while the transcript underneath stays mounted (scroll preserved for
  free). Opened from the graph toolbar's "Open turn map" control (visible while a turn is selected)
  and the `graph.turnmap` command (`mod+alt+t`). No `session-timeline-row.tsx` edit.
- **H6.2 overlay.** `packages/session-graph/src/ui/TurnMapOverlay.tsx` — a focus-trapped dialog
  (`role="dialog"`, `aria-modal`) showing the turn's execution-level subgraph (turn + highest-signal
  `part-of` children, capped at seven) through `GraphCanvas`, the shared `GraphInspector`, and "Open
  full graph". Escape closes and returns focus. Backed by the pure `turnSubgraph(model, turnID, limit)`
  selector (`inferred-cause` never appears).
- **H6.4 inline subgraph.** `packages/session-graph/src/ui/TurnMapInlineGraph.tsx` is a thin,
  non-interactive wrapper over `@spacegraphjs/svg-renderer`'s `InlineGraph` (five-node turn subset).
  Not injected into the timeline.
- **H6.3 side panel.** `packages/gui-extensions/src/session-map/` — a `Panel` (region `"side"`, with a
  `Store.session` `{ focused }`) that draws a compact SVG overview of the session's turns and phase
  clusters from `@opencode/session-ui/graph` (`layoutGraph` + `nodesAtLevel("overview")`), opened from
  the side strip's `+` menu (a `session.panel` `MenuItem`). It needs the new generic SDK surface
  `SessionScreen.transcript` (`TranscriptScreen.activeMessageID()`/`reveal()`), which the app binds from
  the timeline; the map highlights the transcript's active turn (then the last pick, then the model's
  `activeTurn`) and reveals a message when its node is picked. **H6.5 inline row host — deferred,
  approval-gated** (the only item that exceeds the core diff budget).
- **H6.7 flag.** The hybrid is off by default; the overlay opens only on explicit action.
- **H6.6 tests.** `component-tests/turn-map.spec.ts` (5 cases); app e2e cases for the overlay
  (`e2e/graph/session-graph.spec.ts`) and the side-panel synchronization
  (`e2e/regression/side-panels.spec.ts`).

## Portability (Phase 8)

Library-side work that lets a second host reuse the boundary without OpenCode (see
`spacegraphjs/docs/host-integration.md`):

- **Contract version negotiation** (P8.7) — `negotiateContract` in `@spacegraphjs/renderer`; the host
  registry rejects an unsupported declared version and falls through.
- **Static export** (P8.3) — `serializeRenderModel`/`parseRenderModel` in `@spacegraphjs/svg-renderer`
  beside `renderToSVG`.
- **Text direction** (P8.9) — `renderToSVG` emits `direction="rtl"`; both adapters set `dir` on cards;
  the host bridge reads `document.documentElement.dir`. Coordinates are never mirrored.
- **Second-host fixture** (P8.6) — `spacegraphjs/demo/activity-host.ts`, exercised by the shared
  conformance suite and the demo.
- **Host integration guide** (P8.5) — `spacegraphjs/docs/host-integration.md`.
- **Reference demo** (L1.29) — `spacegraphjs/demo/contract.html` + `demo/contract-demo.ts`: one
  synthetic activity stream through all three leaves, using `LaneLayout` and the `GraphController`
  (selection, trail, zoom bands, search), with no OpenCode import and no session vocabulary.
- **Framework-agnostic view controller** (P8.1) — `spacegraphjs/control` (`GraphController`): selection,
  focus, navigation trail, zoom bands, search, and connections over a minimal structural model, bound to
  any renderer through a minimal structural surface. The library demo is driven by it, and OpenCode's
  `GraphView` routes selection and breadcrumbs through it (it stays unbound from the renderer, because
  `GraphCanvas` remains the single renderer-event mediator).
- **Framework bindings** (P8.2) — `react-spacegraph` and `solid-spacegraph` wrap `GraphBinding` (the
  framework-agnostic mount/update/dispose policy in `spacegraphjs/control`) over the contract, not core
  internals.
- **Deferred by design:** P8.4 (host-neutral activity adapter) and P8.8 (incremental `RenderModelPatch`).

## Library capability audit (R7.6)

Each generic module added for this work, with its consumers and any gap. No session-specific naming or
data assumptions appear in the library.

| Capability | Module | Consumers | Gap |
|---|---|---|---|
| Renderer contract | `@spacegraphjs/renderer` | both adapters, OpenCode registry, conformance suite, second host | none |
| Fit options (padding, insets) | contract `FitOptions` + the core's fit + the Cytoscape adapter's `fit.ts` | OpenCode `GraphView` (the minimap), second host | the perspective path's insets are approximate; a tilted camera has no single screen-to-world scale |
| Model adapter | `@spacegraphjs/adapter` | OpenCode `SessionGraphAdapter`, second host | the Cytoscape card cap is not live: the host has no renderer switch yet |
| SpaceGraph adapter | `@spacegraphjs/spacegraph-renderer` | OpenCode, contract demo, second host | node remodelling recreates a node on type change (by design) |
| Cytoscape adapter | `@spacegraphjs/cytoscape-renderer` | OpenCode fallback, contract demo, second host | 3D is a declared no-op; minimap is host-side |
| Static SVG renderer | `@spacegraphjs/svg-renderer` | OpenCode inline subgraph, contract demo, second host | `InlineGraph` is not exercised in a browser beyond the demo |
| Semantic levels | `spacegraphjs/levels` | OpenCode `levels.ts`, second host | none |
| Layout strategies and placement engines | `spacegraphjs/layout` | OpenCode `layout.ts`, second host | the tree's block width is a host policy (`treeColumns`), not a measured optimum |
| Summary representations | `spacegraphjs/representations` | OpenCode `representation.ts`, second host | none |
| Zoom bands | `spacegraphjs/zoom` | `GraphController`, second host | band→level wiring is host-owned |
| Accessibility layer | `spacegraphjs/a11y` | OpenCode a11y mirror, second host | none — the edges are announced too (T4.7) |
| Navigation (search, minimap, trail) | `spacegraphjs/navigation` | `GraphController`, OpenCode `GraphView` + `GraphMinimap`, second host | OpenCode search stays host-owned (uses the richer tool-input selector) |
| View controller | `spacegraphjs/control` | OpenCode `GraphView`, second host | — |
| Scoped overlay and code diff | `spacegraphjs/overlays` | OpenCode turn map and diff view, second host | the host keeps its own markup and copy |
| Depth spectrum | `spacegraphjs/depth` + contract `depths` | OpenCode depth chooser, second host | Z spread is host layout; depth fade is scene fog, not per-object DoF |
| DOM mount | `spacegraphjs` `DOMNode` | SpaceGraph adapter | — |
| Minimap | host SVG (`GraphMinimap.tsx`) | OpenCode | vertical mirror under Cytoscape (documented) |

## Known limitations

Carry these forward explicitly; none is silently lowered.

1. **The wheel zooms about the point under the pointer.** In an orthographic view that is exact; in a
   tilted perspective view the point is held on the target's plane, which is close but not exact.
2. **The mesh focus/selection outline is an axis-aligned `BoxHelper`**, not a silhouette (L1.11/RF.6);
   DOM cards are outlined on the element with the resolved theme colours instead.
3. **Edge labels avoid labels and DOM cards, but not all geometry**; `declutterLabels` measures label
   and card rects only (L1.17).
4. **`SpaceGraph.instances`/`options.global` remain** as an off-by-default developer handle for the
   vision/inspection helpers; graph semantics no longer consult it (L1.30 literal step deferred).
5. **The `./activity` `types` condition is a hand-authored stopgap** (`spacegraphjs/types/activity.d.ts`);
   replace with generated declarations once the library source is clean (L1.1).
6. **The graph toolbar renders in the app with an `endInset`** to clear the floating header toggles; the
   reserve is desktop-media-query-gated.
7. **Mobile graph mode is desktop-gated for v1** (I4.10 decision). The header toggle is desktop-only; on
   mobile the graph is reachable only through the `graph.toggle` command.
8. **The minimap orientation is vertically mirrored under Cytoscape** (the Cytoscape canvas draws
   model +y downward); it is correct under the default renderer.
9. **Two adapter-failure app e2e cases are dev-only** (the built chunks are hashed); the component
   suite keeps seam-based coverage. The same applies to the lazy-wrapper load-failure case.
10. **First graph paint and pan frame rate have no harness**, and the session-entry delta is unmeasured.
11. **The renderer selector is not in the app toolbar**; renderer choice is a prototype setting, and
    the Cytoscape captures come from the Storybook story.
12. **Vector swimlane bands stay full-opacity under execution focus dimming** (they are structure, not
    content, and are `interactive: false`).
13. **The lane gutter is world-space** (LE.10): the lane labels are non-interactive chips placed left of the
    content and included in the fit, not a screen-fixed overlay (the contract has no screen-space overlay).
14. **The lanes overview has a dominant empty region** (`02`/`14`): the lanes layout is level-agnostic (§5.5), so
    a turn column reserves its execution width at overview. The ribbon/matrix representations fix it by
    construction; a level-aware compact overview would risk position drift and is not taken.
15. **Empty-column exclusion is not implemented** (LE.1): the fit frames content ids but cannot skip empty
    structural columns. The asymmetric framing it used to lack is now in the contract (T6.10): `fit(ids?, { padding,
    insets })` takes the frame the host wants, and both adapters honour it.
16. **The depth fade is a scene fog, and DOM cards do not fade with it** (LE.14): `layered`/`depth-stack` use
    `FogExp2` with a scene-relative density, so the fade no longer follows the absolute camera distance. The fog
    attenuates the scene's materials; a DOM card is an HTML element over the canvas, so the cards the host
    actually reads stay at full opacity while the meshes recede. The library declares this, and the mesh
    outline it does not draw, in `spacegraphjs/docs/limitations.md`.
17. **The capture matrix is one frame per option value, not the cartesian product** (LE.16): representation
    replaces the layout and depth is a treatment over the node-link Z, so a full product would be redundant.
    The depth axis is captured at the benchmark lanes layout; a depth treatment on the flat ribbon/matrix
    summaries has no structural effect.
18. **The 2026-10-19 visual review found legibility defects** beyond the planned fixes: toolbar labels clip
    at 1440; light-theme lane labels fail contrast; selected-file framing clips content; hierarchy collapses
    to a tiny column; timeline reads as a collage; matrix has no axes and overlapping cells; Cytoscape is
    clipped and theme-mismatched; depth modes shear and overlap cards; breadcrumbs are provenance-blind; and
    camera zoom is not exposed and its normalized range is content-unaware (fit ≈ 45%, 100% blank). The Phase 0
    spike image is stale. Tracked as T1.1–T1.16 in `SPACEGRAPH.TODO.2.md`; per-image evidence is in
    `docs/spacegraph/visual-review.md`. The committed images were refreshed on 2026-10-20 and read by
    eye; the defects listed here that were not fixed are tracked as T1.17–T1.18 and the layout-variety
    track (T7).
19. **A long session is drawn as its recent tail** (T6.6): the map shows the last 60 turns and says
    so in a banner, because a renderer cannot carry the nodes of a thousand turns. The layout still
    measures the whole session, so a node that stays in the window does not move when the window
    slides. The transcript carries the rest.
20. **The camera-driven capture frames used to vary between runs** (T6.20, closed): the cause was a
    product defect, not the capture — the renderer syncs its camera frustum from a `ResizeObserver`
    that delivers asynchronously, so a fit after the inspector opened measured the canvas the map no
    longer had. The fit now measures the live surface, and the zoom control stops at the renderer's
    declared limit instead of accepting clicks that do nothing. Three consecutive captures are
    identical apart from the noise floor (max channel delta 1–2 on five frames, and 10–12 pixels on
    `23-graph-turn-2.png` — one card's rounded corner at a sub-pixel offset).
21. **The layouts on offer are five, and they are not the same kind of thing** (T7): the three grid
    views (`lanes`, `timeline`, `hierarchy`) are policies over one placement primitive — columns ×
    rows — while `tree` and `force` are different geometries behind the same placement seam. The
    reader can compare them side by side (the layout gallery), but which one is *best* is a
    measurement nobody has made yet: the evidence task (T2.2) has five layouts to test, and the
    tree's block width is a policy (`treeColumns`), not a measured optimum.

## Edge cases (T6.5)

The cases a real session produces that the canonical fixture does not. Each one has a model test, and
the ones a reader can see have a component or app test.

| Case | What the graph shows | Where it is proved |
|---|---|---|
| A session forked from another | The root node carries the origin and the message it branched at; the inspector names both and opens the origin | `model.test.ts` (lineage), `graph-session-links.spec.ts`, the app e2e "names the session a fork came from and opens it" |
| A child session (a subagent's own session) | The root node names its parent, and the inspector opens it | `model.test.ts` (lineage) |
| A delegation to a child session | The delegated node carries the child session id; the inspector opens it. When the child has no node in this session, the id stays on the node and **no edge is drawn** — an edge to a node that does not exist is a dangling connection | `model.test.ts` (child sessions), `graph-session-links.spec.ts` |
| A compaction | One node: the summary it left, or the fact that the provider's replacement window was replayed instead. A failed compaction carries the error that stopped it | `model.test.ts` (compaction) |
| A permission request | **Nothing.** Permissions are session state, not a step in the transcript, so there is no node for one (ADR-023) | the vocabulary carries no `approval` kind |
| An aborted or interrupted step | An `error` node with the `interrupted` status and the provider's message — an interrupted turn is visible as interrupted, not as silence (ADR-025) | `model.test.ts` (interruption) |
| The three idle outcomes | `succeeded` adds no node, `failed` adds a failed one, `interrupted` an interrupted one | `model.test.ts` (outcomes) |

**Not covered, deliberately:** the child session's own work is not in this graph. Reading across
sessions is D4 (cross-session graphs), and it waits for a validated single-session win.

## Evaluation protocol (R7.3)

**Status: protocol defined; not executed** (requires human participants, which this environment cannot
provide). Execute before deciding to continue the graph track.

Protocol:

1. Recruit a small set (n ≥ 5) of OpenCode users familiar with the transcript but not the graph.
2. Use the canonical fixture session (§7) for every participant; give no leading explanation of the
   graph beyond "this is an alternate view of the same session".
3. For each participant, counterbalance order: run the five investigative tasks once with the
   transcript and once with the graph. Record task success, time to completion, wrong turns, and which
   node/edge or message they used.
4. Tasks: (a) why did the agent change `src/auth/session.ts`? (b) which tool calls led to the failing
   test? (c) what did the subagent contribute? (d) which changes were made after the failing test?
   (e) where did the agent retry or change direction?
5. Collect a subjective preference and free-text quotes; record the decision on continuing.

Results: _pending_. Record task success, completion times, wrong turns, and quotes here, then update
the go/no-go decision at the end of this section.

## Dependency migration plan (R7.5)

The prototype consumes `spacegraphjs` and its renderer packages from source via Bun workspaces. The
step after the prototype:

1. Build `dist` (ESM + `.d.ts`) for `spacegraphjs`, `@spacegraphjs/renderer`,
   `@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`, and
   `@spacegraphjs/svg-renderer`; point each `package.json` `main`/`module`/`types`/`exports` at
   `dist` and add a `build` script (deferred while source-consumed, R7.5/L1.34).
2. Remove `spacegraphjs` and the four packages from the OpenCode root `workspaces.packages`; replace
   the `workspace:*` dependencies of `packages/session-graph` with versioned ranges (`^7`, and a
   matching `CONTRACT_VERSION`).
3. Drop the `./activity` `types` stopgap once the library source typechecks clean; regenerate the
   declarations from `dist`.
4. Re-run `bun run graph:verify` (contract conformance + boundaries + packages + suites + capture
   verify) and the built e2e before declaring the migration done.
5. Keep `CONTRACT_VERSION` and the version-negotiation path (P8.7) so a host and adapter can be
   upgraded independently.

## Verification summary

One command produces every image and one command proves both adapters still honor the contract:

- `bun run graph:capture --mode=baseline|demo|compare|verify` writes to `docs/spacegraph/screenshots/`
  (`verify` renders into a temp dir and asserts the committed set).
- `bun run graph:verify` runs the headless contract suite against both adapters, the package boundary
  test, the four leaf/contract packages, the session-graph unit and component suites, and the capture
  verify pass.

See the plan's §0 progress log for the per-pass measurements and the §8 verification matrix for the
per-check commands.
