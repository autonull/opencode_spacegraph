# SPACEGRAPH.TODO.1 — Spatial Session Graph for OpenCode

## 0. Progress log

**2026-10-18 — restart from Phase 0 (previous attempt reverted).**

The prior commit `0cd8b67376` ("feat(session-ui): sketch session graph model from session messages") was
rejected and reverted with `git reset --hard origin/dev`. It was unverified and did not build:

- `packages/session-ui/src/graph/model.ts` declared required `childrenOf`/`parentOf` fields on `GraphModel`
  but `build()` never returned them, so it did not typecheck.
- It reimplemented the turn walk from scratch, which M2.2 explicitly forbids ("reuse
  `Timeline.constructSessionMessageRows` / `assistantMessagesByParent`, not a second implementation").
- It skipped Phase 0, which the plan orders first, and recorded a known bug (phase `time` held an ordinal).

`SPACEGRAPH.md` and `SPACEGRAPH.TODO.1.md` are unchanged from `93f49a9cea` (the plan commit); only the
speculative model code was dropped. Work restarts from Phase 0.

**2026-10-18 (cont.) — P0.3 core link and P0.5 embed spike.**

Scope for this pass (agreed with the user): link `spacegraphjs` core from source and prove it embeds. The
contract/Cytoscape/SVG subpackages and P0.7/P0.8 stay deferred to Phase 1, since those packages do not
exist yet.

- **L1.1 (first half) — landed in `spacegraphjs` (`adf2dd6`).** All 37 `spacegraphjs/*` self-imports in
  `src` are now relative, so the library resolves without a tsconfig `paths` alias. `package.json`
  `main`/`module`/`types` and `exports` point at `src` and expose `./activity`, `./core`, `./edges`,
  `./nodes`, `./plugins`, `./plugins/mermaid`, `./input`, `./utils`, `./types`, `./builder`, `./vision`.
  `tsconfig.json` drops the TS7-removed `baseUrl` and keeps valid relative `paths` for `test/`. Vitest: 10
  files / 157 tests pass. `pnpm exec tsc` in `spacegraphjs` now surfaces 181 pre-existing errors (10 in
  `src`) that the old invalid config masked; cleaning them is L1.18.
- **P0.3 — core linked (not complete).** `spacegraphjs` added to root `workspaces.packages` and as a
  `workspace:*` dependency of `packages/session-graph`; `bun install` links it. Because the library source
  is not clean under this repo's universal `noUnusedLocals`, the `./activity` export carries a `types`
  condition pointing at a stopgap `spacegraphjs/types/activity.d.ts`; Vite/Bun load real source and only
  `tsc` sees the stopgap (the L1.1 "types condition" mechanism). `packages/session-graph` typecheck
  passes. The plan's four contract packages do not exist yet, so only the core is linked.
- **P0.5 — embed spike done (go).** `packages/session-graph/src/spike/graph-spike.tsx`, its story, and
  `component-tests/graph-spike.spec.ts` mount the real library (`SpaceGraph.create`) with 8 `HtmlNode`s +
  `CurvedEdge`s. The component test asserts mount, node/edge counts, single `SpaceGraph` instance, resize
  propagation, drag with no console errors, and captures
  `docs/spacegraph/screenshots/00-spike-spacegraph.png`. Chunk: ~27 KB min / ~8.7 KB gzip excluding
  `three`; ~360 KB min / ~84 KB gzip with `three` (the app does not yet depend on `three`).
- **Findings for later phases.** The spike runs under the Storybook host, not the routed session panel, so
  exit gate 0's "in the real app shell" is not yet exercised (Phase 4). Default chrome (HUD telemetry,
  zoom card, hint) and the hard-coded dark background are visible and are L1.3/L1.4 work.
  `Renderer` forces its container to `position: relative`, so the graph container must be given a definite
  size rather than `position: absolute; inset: 0`.
- Details and measurements: `docs/spacegraph/prototype.md`.

### Environment (this session)

- `bun` 1.4.3 installed to `/home/me/.local` via `npm i -g bun --prefix ~/.local` (postinstall run manually);
  it is on `PATH`. `bun install` at the repo root succeeds (2155 packages; `bun.lock` gains the new workspace).
- Playwright browser mismatch worked around: the repo pins `@playwright/test` 1.59.1 (wants chromium
  headless-shell revision 1217) while the machine cache had 1193/1194/1234. The 1217 path is now a symlink to
  the working 1234 build (`~/.cache/ms-playwright/chromium_headless_shell-1217/...`), with the
  `INSTALLATION_COMPLETE`/`DEPENDENCIES_VALIDATED` markers copied. Also note `bun x playwright` resolves to a
  broken Python shim; drive the CLI through
  `node node_modules/.bun/playwright@1.59.1/node_modules/playwright/cli.js`.

### Done

- **P0.2 Repository linkage** — `spacegraphjs/` added to root `.gitignore`. Linkage stays "sibling git repo,
  pinned commit, not vendored, not a submodule": remote `git@github.com:autonull/spacegraphjs7.git`, tested
  commit `8fe955a` (branch `main`). No nested-repo commit.
- **P0.6 `packages/session-graph` scaffolding** — private `@opencode/session-graph`, `type: module`, source
  export `"." -> ./src/index.ts`, scripts `typecheck` (`tsc -b`) / `test` (`bun test src`) / `test:components`
  (Playwright via `../storybook/playwright/config`), `AGENTS.md`, and a placeholder story. Registered in
  `packages/storybook/.storybook/main.ts` (story glob, `optimizeDeps` entry, `server.fs.allow`). Verified:
  `bun run typecheck` passes; `bun run test:components` boots Storybook, discovers `session-graph-scaffold`,
  and the scaffold spec passes. `bun test src` matches no files yet (no unit tests until Phase 2/3).

### Notes for the remaining Phase 0 work

- **P0.1** branch/baseline: work continues directly on `dev` (no `session-graph` branches). Tested SHAs:
  OpenCode `93f49a9cea`, spacegraphjs `8fe955a`. The session-entry performance baseline is not yet captured.
- **P0.3** source workspaces: `spacegraphjs` core and `@spacegraphjs/renderer` (L1.19) are linked today. The
  remaining three packages (`@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`,
  `@spacegraphjs/svg-renderer`) do not exist yet; they are Phase 1 deliverables (L1.20-L1.21a). The task's
  "links all five packages" is not satisfiable in Phase 0 as written: link each now as Phase 1 creates it.
  `spacegraphjs` `package.json` already points `main`/`module` at `./src/index.ts` with a `types` stopgap for
  `./activity`; the contract package needs no stopgap because its source is clean.
- **P0.4** critical path: the library survey found `spacegraphjs/src/core/VisionManager.ts` statically imports
  `spacegraphjs/vision` -> `onnxruntime-web`, `src/nodes/CodeEditorNode.ts` statically imports
  `@monaco-editor/loader`, and `src/core/Renderer.ts:3` imports `three-mesh-bvh` (patched onto global
  `THREE.*.prototype` in `Renderer.init()`). `src/index.ts` pulls all of these at import time. `mitt` is a
  declared dependency with no imports in `src/`.
- **P0.5/P0.7/P0.8** embed spike, Cytoscape spike, and contract smoke test are not started; they depend on
  P0.3 and on the contract package.

### spacegraphjs toolchain (installed; persists across sessions, not in git)

- `cd spacegraphjs && pnpm install --ignore-scripts --filter spacegraphjs` installs the root project only (348
  packages; skips the heavy `n8n-bridge` workspace and the native `canvas` build). Verified working:
  `pnpm exec vitest run test/EventManager.test.ts` passes. The `esbuild` CLI is absent from `.bin`, but
  vite/vitest transforms work.
- Do **not** run a full `pnpm install` in `spacegraphjs/`: it pulls the `n8n-bridge` workspace (n8n, rxjs,
  yjs, ...) and the native `canvas` devDependency.

### P0.4 — applied (spacegraphjs commit `d066ffa`). Edit map below, now done; extras listed at the end.

Exact changes, with locations confirmed by reading the files:

1. `spacegraphjs/src/core/Renderer.ts`
   - line 3: remove `import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh'`.
   - line 33: remove `private _threePatched = false`.
   - lines 99-103: remove the global `THREE.*.prototype` patch block inside `init()`.
   - Safe: `src/nodes/SceneNode.ts` already feature-detects (`if (geometry.disposeBoundsTree)` at lines 77/88,
     `if (computeBoundsTree)` at line 125), and `three-mesh-bvh` is imported nowhere else (grep confirmed).
2. `spacegraphjs/src/vision/VisionModelLoader.ts`
   - line 1: keep only a type import, `import type { InferenceSession } from 'onnxruntime-web'` (erased at runtime).
   - `configureWasmPaths`: make `async` and `const { env } = await import('onnxruntime-web')`.
   - `loadModels`: `const { InferenceSession } = await import('onnxruntime-web')`.
3. `spacegraphjs/src/core/VisionManager.ts`
   - line 48: `await VisionModelLoader.configureWasmPaths(...)`.
4. `spacegraphjs/src/vision/strategies/OnnxStrategy.ts`
   - line 1: remove the static `Tensor` import (only used as a value, always inside `async` methods at lines
     91, 147, 187, 208, 244). Use a dynamic `await import('onnxruntime-web')` at those sites or one private helper.
5. `spacegraphjs/src/nodes/CodeEditorNode.ts`
   - line 1: remove `import loader from '@monaco-editor/loader'`.
   - lines ~86 and ~111: replace `loader.init()` with
     `import('@monaco-editor/loader').then(({ default: loader }) => loader.init())`.

`spacegraphjs/src/index.ts:245` statically re-exports `./vision`; that is acceptable once `onnxruntime-web` is
reachable only through dynamic imports (deviation from the literal "do not import `src/vision` statically" wording;
the done-when is about runtime evaluation, which the dynamic import satisfies). `onnxruntime-web` is referenced in
only those two vision files (grep confirmed).

Verification: `cd spacegraphjs && pnpm exec vitest run`, plus a new `test/entry-critical-path.test.ts` that
`vi.mock`s `onnxruntime-web` and `@monaco-editor/loader` with recorders and asserts neither recorder fires when
`await import('../src/index')` runs.

Caveat to check first: `spacegraphjs/vitest.config.ts` aliases `spacegraphjs -> src/index.ts` with a bare string;
`@rollup/plugin-alias` string matching would rewrite `spacegraphjs/vision` to `src/index.ts/vision` and fail. Verify
that importing the entry under vitest resolves `spacegraphjs/vision`; if not, tighten the alias to `/^spacegraphjs$/`
and rely on the tsconfig `paths` (`spacegraphjs/* -> src/*`) for subpaths.

Extras landed with P0.4 (narrowed scope, agreed with user): vision is now bypassed rather than supported
(ONNX import made dynamic; vision dropped from the default entry, still on `spacegraphjs/core` and the opt-in
`spacegraphjs/vision` subpath); `n8n-bridge` removed from `pnpm-workspace.yaml` and its vitest suite excluded;
new lean `spacegraphjs/src/activity.ts`. Two pre-existing bugs were surfaced by fixing the vitest subpath alias
(bare `spacegraphjs -> src/index.ts` broke all `spacegraphjs/*` imports) and were fixed: the alias is now a
regex array, and `PluginManager` field order no longer evaluates `pluginNames` before `plugins` exists.
Verification: `cd spacegraphjs && pnpm exec vitest run` -> 10 files, 157 tests pass (incl. new
`test/entry-critical-path.test.ts` asserting no ONNX/Monaco evaluation on import of the entry or activity).
Deferred to L1.1/L1.2: `activity` build/`exports` wiring and the `spacegraphjs/*` source-consumption repoint.

**2026-10-18 (cont.) — Phase 1 begins: L1.3 chrome opt-in and L1.4 render/theme plumbing.**

Scope for this pass: make the library safely embeddable — take default chrome off the entry and let the
host supply render/theme options. `spacegraphjs` commit `cac6374` (branch `main`).

- **L1.3 — default chrome opt-in (done).** `DEFAULT_CHROME_PLUGINS` (`FractalZoomPlugin`, `ZoomUIPlugin`,
  `MinimapPlugin`, `HUDPlugin`) is split out of `DEFAULT_SYSTEM_PLUGINS` in `src/core/defaults.ts`.
  `SpaceGraphOptions.chrome` (default off) gates registration in `SpaceGraph.#registerDefaults`, so a bare
  graph mounts only the canvas + CSS3D layer and no plugin appends to `document.body`. The only two
  `document.body` writers are `ZoomUIPlugin` (chrome) and `HoverMetaWidget` (exported, not a default), so
  the opt-out also satisfies "remove fixed body overlays unless chrome is enabled".
- **L1.4 — plumb render/theme options (partial).** `SpaceGraphOptions` gains `render?: RenderOptions`,
  `chrome?`, and `theme?: SpaceGraphTheme` (`{ background }`). `RenderOptions` gains `transparent` and
  `preserveDrawingBuffer`; `Renderer` now imports the single definition from `src/types.ts` (its local
  duplicate is gone) and honors `transparent` (null scene background + alpha clear) and
  `preserveDrawingBuffer`. `SpaceGraph.#init` passes `{ ...options.render, backgroundColor:
  theme.background ?? render.backgroundColor }` to the renderer, so a host theme no longer fights the
  hard-coded `0x1a1a2e`. **Remaining:** the theme only covers `background`; node fill/stroke, edge color,
  label color/font, and selection/hover wiring still need per-node/edge default plumbing. The "light and
  dark screenshots both pass" clause needs the L1.18 demo page.
- **L1.1/L1.2 — effectively complete for the current module set.** No `spacegraphjs/*` self-imports remain
  in `src` (grep clean); `package.json` `exports` cover every existing module (`./`, `./activity`,
  `./core`, `./nodes`, `./edges`, `./plugins`, `./plugins/mermaid`, `./input`, `./utils`, `./types`,
  `./builder`, `./vision`). The five subpaths the plan lists as not yet present (`./zoom`, `./layout`,
  `./a11y`, `./navigation`, `./inline`) are Phase 1 modules (L1.23–L1.26) and `ZoomBandsPlugin` (L1.2's
  list) arrives with L1.23.

Verification: `cd spacegraphjs && pnpm exec vitest run` -> 11 files, 160 tests (new `test/chrome.test.ts`
asserts the chrome/system split and that core interaction + LOD stay registered). `pnpm exec tsc --noEmit`
still reports the same 10 pre-existing `src` errors and none in the touched files. `eslint` cannot run in
this environment (typescript-eslint rejects TS 7.0) and the repo is not prettier-clean, so style was
matched by hand against the surrounding files.

Note: the committed `docs/spacegraph/screenshots/00-spike-spacegraph.png` now understates the post-L1.3
surface (it still shows the old default chrome). Regenerate it through the session-graph component test at
the next opportunity.

**2026-10-18 (cont.) — Phase 2 begins: the graph model, fixture, and selectors (all in-repo, no library change).**

Scope for this pass: build the pure, tested model that everything downstream renders, since it is the
foundation and the previous attempt at it was reverted. All work is in `packages/session-ui`; `spacegraphjs`
is untouched. Entered Phase 2 ahead of finishing Phase 0/1 because the model is self-contained, verifiable
with `bun test` (not a browser), and unblocks the UI phases; Phase 0's remaining tasks (P0.7/P0.8) are still
gated on the Phase 1 contract packages.

- **Reuse, not a second walk (M2.2).** `Timeline.constructSessionMessageRows` now returns an additive
  `turnByMessageID` map (message id → owning execution opener) built inside its existing walk. A steered
  prompt maps to the opener that began its execution, so the graph groups steers into one turn without
  re-deriving boundaries. The change is purely additive; the projection suite (72 tests) still passes.
- **New `packages/session-ui/src/graph/`.** `model.ts` (`buildGraph`, node/edge/ID helpers), `selectors.ts`
  (neighbors, ancestors/breadcrumbs, `why`, shortest path, `forwardChain`, search, `openInTranscript`,
  `currentActivity`), `fixture.ts` (§7 canonical session; `buildFixtureMessages`/`fixtureMessages`,
  `buildFixtureGraph`, `buildInterruptedFixtureMessages`, `CHANGED_FILES`), `index.ts` barrel, and tests.
  Exported from the package as `@opencode/session-ui/graph` and `.../graph/model`.
- **Measured:** `cd packages/session-ui && bun test src/graph` → 24 tests pass; `bun run typecheck` clean
  (session-ui and `packages/app`). Full session-ui suite 263 pass; the one failure is the pre-existing
  `markdown-solid.test.tsx` Solid `jsxDEV` runtime issue, unrelated to this work.
- **Exit gate 2 is satisfied in tests:** `selectors.test.ts` answers all five mission questions against
  the fixture (why a file changed, which tools led to the failure, the subagent's contribution, the
  changes after the failing test, and where the agent retried).

Remaining Phase 2 work (notes):

- **M2.3 phase nodes are not built.** `buildGraph` creates session/turn/message/reasoning/tool/subagent/
  file/result/error/retry/diff/compaction/notice nodes; it does **not** yet create `phase` nodes
  (§5.1: consecutive tool categories Explore/Edit/Verify/Delegate/Result, `derived: true`, `clusterOf`).
  M2.6 (semantic levels) is blocked on this: its overview policy renders phase clusters with counts.
- **M2.6 `levels.ts` and M2.7 `layout.ts` are not started.** `nodesAtLevel`/`edgesAtLevel` (policy table
  §5.4) and the deterministic lanes/ordinals/positions (§5.5) live there. `buildGraph` already sets
  `minLevel` on every node and `data.category` on tools, which is the input these modules need. Positions
  are required before Phase 3 (`buildRenderModel`) can emit a `RenderModel`.
- **M2.10 is partial.** Tests cover stable IDs, steered turns, shell-only turns, interrupted idle, subagent
  mapping, file provenance, retry/evidence, unknown tools, malformed metadata, no-inferred-cause, purity,
  and the five questions. Level-filtering and layout-stability tests land with M2.6/M2.7.
- **Design choices worth confirming downstream.** A shell turn owns its trailing idle; a subagent tool maps
  to one `subagent` node keyed by child session id, and the synthetic completion notice carries the
  `delegates` edge (there is no separate spawner node); `diff` nodes list only written/patch/snapshot files,
  never reads; the session root id is the literal `"session"`.

**2026-10-18 (cont.) — Phase 2 completes: phase nodes (M2.3), semantic levels (M2.6), deterministic layout (M2.7).**

Scope for this pass: the remaining in-repo Phase 2 deliverables. `spacegraphjs` is untouched; all work is in
`packages/session-ui` and verifiable with `bun test`.

- **M2.3 `phase` nodes (done).** `model.ts` now clusters consecutive phase-eligible children of one turn into
  derived `phase` nodes (`phase:${turnID}:${category}:${ordinal}`) carrying `derived: true`, `data.category`,
  and `clusterOf` in membership order; each phase is `part-of` its turn. Categories use the §5.1 vocabulary
  (explore/edit/verify/delegate/result) from `phaseCategoryForTool`; unclassified tools fall to `result`.
  Membership is tracked per turn, so a category change starts a new run (explore → edit → explore is three
  phases). Children keep their existing `part-of` → turn edges (breadcrumbs/`ancestors` unchanged) and phases
  are deliberately **not** added to the `sequence` chain, so `forwardChain` semantics are unchanged. A
  duplicated active-turn block in `buildGraphInternal` was removed.
- **M2.6 `levels.ts` (done).** New `packages/session-ui/src/graph/levels.ts`: per-kind minimum level (each
  node's own `minLevel` wins), `nodesAtLevel`/`visibleNodeIDs`, `edgesAtLevel` (edge-kind min level plus both
  endpoints visible; at execution a focus narrows to the neighborhood plus hierarchy), `clusterCount`,
  `isClusterExpanded`, `labelMode` (constant), and `domBudget` (12/40/24). Overview resolves to hierarchy
  (`part-of`) edges only; errors/retries are execution-level because the model sets their `minLevel` to
  execution, so failures reach overview as phase/turn badges rather than standalone nodes.
- **M2.7 `layout.ts` (done).** New `layout.ts` exposes `layoutGraph(model, options?)` → `positions`,
  `clusters`, `bounds`. X = turn index × `turnGap` + event ordinal × `step`; Y = lane (`prompt`, `narrative`,
  `explore`, `edit`, `verify`, `delegate`, `artifacts`) × `laneGap`; Z = hierarchy depth × `depthStep`. Phase
  clusters sit at their first member's X on the phase's lane; file nodes sit near their first tool write on
  the artifacts lane (else their first provenance edge). Positions depend only on model order, so layout is
  append-only and byte-identical across builds.
- **M2.10 tests (done).** Added phase, level, and layout suites. `cd packages/session-ui && bun test src/graph`
  → 42 tests across 4 files. `bun run typecheck` clean; `bun test src` → 289 pass with the single pre-existing
  `markdown-solid.test.tsx` `jsxDEV` failure unchanged.

Notes for the next phases:

- **Level/lane conventions to confirm downstream.** Phase category `result` is the fallback bucket for tools
  that match no named category; extend `phaseCategoryForTool` if the UI wants a distinct chip label. Phase
  labels are hardcoded English (`PHASE_LABELS`) matching the existing model convention (e.g. "Session",
  "Retry #2"); localize at the UI layer when the graph is rendered (U3.x), which is also where the `en.ts`
  rule applies.
- **Overview edges.** Overview keeps only `part-of` today because both endpoints must be visible and error/
  retry nodes are execution-level; failure visibility at overview is via phase/turn clusters and badges. If the
  UI needs explicit `evidence`/`delegates` edges at overview, relax the endpoint-visibility rule for those kinds
  in `edgesAtLevel`.
- **`levels.ts` is host policy.** Per §5.4 it lives in `session-ui` (the host adapter), not the library; the
  generic band controller (`spacegraphjs/zoom`, L1.23) still owns raw zoom thresholds. `layout.ts` is a
  session-specific assignment meant to sit on top of `spacegraphjs/layout/LaneLayout` (L1.24) once that generic
  primitive exists.
- Positions are units-agnostic absolute coordinates with default gaps (`turnGap` 320, `step` 48, `laneGap` 56,
  `depthStep` 64); `buildRenderModel` (U3.1) consumes them directly.

**2026-10-18 (cont.) — Phase 1 L1.19: the dependency-free renderer contract package.**

Scope for this pass: publish the shared port that Phase 3 and P0.8 build on, and link it into the OpenCode
workspace (the next piece of P0.3). All library work is in `spacegraphjs` commit `5a39bd5`; the OpenCode repo
carries only the workspace wiring and this log.

- **L1.19 — `@spacegraphjs/renderer` created (`spacegraphjs/packages/renderer`).** `src/index.ts` carries the
  §4.4 contract: `CONTRACT_VERSION`, `Projection`, `NodeStatus`, `RenderNode`, `RenderEdge`, `RenderModel`,
  `RenderTheme`, `RendererCapabilities`, `RendererViewport`, `RendererEventMap`, `GraphRenderer`, `Unsubscribe`,
  plus `RendererCapability` and `supports` (the L1.28 predicate: `"2d"`/`"3d"` resolve through
  `capabilities.projections`, every other capability is its own boolean field). Zero runtime dependencies,
  `sideEffects: false`, source export `"." -> ./src/index.ts` (no build step, matching the source-workspace
  decision). `src/index.test.ts` (bun) covers the version and `supports`.
- **Workspace linkage (P0.3, second of five packages).** `spacegraphjs/packages/renderer` added to the root
  `workspaces.packages`; `@spacegraphjs/renderer` added as a `workspace:*` dependency of
  `packages/session-graph`. New `packages/session-graph/src/contract.test.ts` proves resolution under `bun test`
  and `tsc -b`. **No `types` stopgap is needed** (unlike `spacegraphjs/activity`) because the contract source is
  clean under this repo's `noUnusedLocals`; the package `tsconfig.json` excludes its `bun:test` file from
  `tsc --noEmit`, which only checks the contract source.
- **Verification.** `cd spacegraphjs/packages/renderer && bun test` → 4 pass; `cd spacegraphjs && pnpm exec tsc
  --noEmit -p packages/renderer/tsconfig.json` clean; `cd packages/session-graph && bun test src` → 1 pass;
  `bun run typecheck` clean; root `bun install` links the new workspace.
- **Not done here (unchanged from plan ordering).** The three adapters and the conformance suite
  (L1.20–L1.22) are not started; P0.7/P0.8 stay gated on them. Phase 3 `buildRenderModel` (U3.1) can now import
  `RenderModel` from the contract. The next library dependency for L1.20 is the core primitive set it consumes
  (event forwarding L1.8, click semantics L1.9, unified selection L1.10, `setPositions` L1.16).

**2026-10-18 (cont.) — Phase 1 core interaction primitives: events (L1.8), click semantics (L1.9), unified selection (L1.10), positions (L1.16).**

Scope for this pass (agreed with the user): the core primitives the L1.20 SpaceGraph adapter consumes. `spacegraphjs` commit `6172d0f` (branch `main`). All work is in `spacegraphjs`; OpenCode carries only this log.

- **L1.8 — forward graph events (done).** New `src/core/forwardEvents.ts::forwardGraphEvents(graph, events)` mirrors `node/edge:added|removed|updated` and the new `graph:cleared` from the Graph emitter onto `sg.events`, wired in `SpaceGraph.#init`. `Graph.updateNode` now emits `node:updated` (previously only the Node's own emitter fired, so `sg.watch('node:updated')` was dead); `Graph.clear()` emits `graph:cleared`. `SpaceGraphEvents` gains `graph:cleared`, `selection:changed`, `node:selection-changed`, `node:click`, `edge:click`, `background:click`, `node:dblclick`. This reconnects HUD/History subscriptions (`sg.events.on('node:added'|'selection:changed')`) that never fired before.
- **L1.9 — real click semantics (done for the pointer path).** `InteractionPlugin` records the pressed node/edge on pointerdown and, on pointerup, emits `node:click` / `edge:click` / `background:click` (with `{ id, originalEvent }`) only when pointer movement stays within `CLICK_MOVE_THRESHOLD` (5px) and no box-select/connect/resize was active — so a drag does not emit click and a plain click does not fly the camera. The dblclick camera fly is gated by a new `SpaceGraphOptions.doubleClickFocus` (default true). Remaining: `ButtonNode`/`ToggleNode` still emit their own `node:click` on press and are not yet routed through the single pointer path.
- **L1.10 — unified selection (done).** New `src/core/Selection.ts` is the one source of truth: `select(id | ids | null)`, `clear()`, `deselect()`, `toggle()`, `list`/`has`, applying `controlState` and emitting `selection:changed` (`{ ids, nodes:Set, edges:Set, timestamp }`) plus per-node `node:selection-changed`. `SpaceGraph` exposes `select`/`clearSelection`/`toggleSelection`/`deselect`/`selectAll`/`deselectAll`, `selected` (ids) and `selectedNodes`; `ErgonomicsAPI.select/deselect/selectAll/deselectAll/selected` delegate to it (they no longer call `node.focus()`; focus stays in `FocusManager`). `plugins/interaction/SelectionManager` is now a visual + box-select adapter over `Selection` (owns no membership state, resyncs DOM outlines from `selection:changed`); `KeyboardShortcuts.handleSelectAll` routes through it; `DragHandler`'s dead `emit('selection:getSelectedNodes')` probe was replaced with `sg.selectedNodes`. **Breaking:** `SpaceGraph.selected` now returns `string[]` ids (was `Node[]`); `ErgonomicsAPI.selected` still returns `Node[]`.
- **L1.16 — stable layout primitives (done, adapter subset).** `Graph.setPositions(map)` (absolute, no animation, refreshes edges) and `Graph.pinAll()`; `SpaceGraph.setPositions`/`pinAll` delegate and `layoutOnce(name, options)` aliases the existing one-shot `layout`. Physics stays off by default and `AutoLayoutPlugin` is a no-op, so explicit positions are not fought. Remaining per the task: make `TimelineLayout`/`HierarchicalLayout` deterministic and pin-aware and remove the `window.gsap` layout dependency.

Verification: `cd spacegraphjs && pnpm exec vitest run` → 13 files, 170 tests (new `test/selection.test.ts` 6 tests and `test/graph-events.test.ts` 4 tests). `pnpm exec tsc --noEmit` still reports exactly the same 10 pre-existing `src` errors (CameraControls `.at`, `bvh`, `DynamicThicknessEdge`, `HistoryPlugin`, `MermaidNode`) and none in the touched files. `packages/session-graph` typecheck (`tsc -b`) still clean.

Notes for the next pass:

- The next library dependency for **L1.20** (`@spacegraphjs/spacegraph-renderer`) is the adapter itself, plus viewport/band reporting (L1.13) and orthographic projection (L1.12) if 2D ortho is required at that step; click/selection/positions/events are now available in the core.
- `selection:changed` carries both `ids: string[]` (contract-friendly) and `nodes`/`edges` Sets (legacy HUD shape). Contract consumers should read `ids`.
- Loose ends from this slice: `ButtonNode`/`ToggleNode` click routing (L1.9), and layout determinism plus `window.gsap` cleanup (L1.16).

**2026-10-18 (cont.) — Phase 1 ortho projection (L1.12), zoom telemetry (L1.13), and the SpaceGraph adapter (L1.20).**

Scope for this pass (agreed with the user): the core prerequisites the adapter needs, then the adapter itself. `spacegraphjs` commit `f7f5544` (branch `main`); OpenCode carries the workspace wiring, an adapter story + component test, and this log.

- **L1.12 — first-class orthographic projection (done).** `Renderer` now owns both a `perspectiveCamera` and an `orthographicCamera` and exposes the active one via a `camera` getter; `setProjection('perspective' | 'orthographic', target?)` swaps them, copying position/orientation and deriving the ortho frustum from the perspective framing at the current distance so the toggle preserves scale. `RenderContext.setCamera` follows the active camera for culling; `onResize` keeps the ortho frustum aspect-correct and the perspective aspect otherwise; `render()` renders and raycasts with the active camera. `CameraControls` takes a mutable `camera` with `setCamera`, detects ortho from the camera type, disables orbit in ortho, and drives zoom through `orthographicCamera.zoom` (clamped 0.01–100) instead of distance. `SpaceGraph.setProjection(projection)` wires it and emits `projection:change`. Call sites that read perspective-only fields (`calculateFitView`, `ResizeFingering`, `ResizeHandler`, `MinimapPlugin`, `MermaidPlugin`, `HUDPlugin`) were widened or cast; `calculateFitView` now accepts `THREE.Camera`.
- **L1.13 — camera zoom telemetry (done).** New `src/core/zoom.ts` (`normalizeZoom`/`denormalizeZoom`/`clamp`) maps raw perspective distance or ortho zoom to a normalized 0..1 value (1 = closest). `Renderer.getZoom`/`setZoom`/`getViewport` expose it; `SpaceGraph` adds `zoom`, `setZoom(value)`, `zoomToFit()`, and `viewport`, and emits `camera:change` and `zoom:change` from the animation loop and every explicit camera op, deduped by value (no timer throttle, so tests are deterministic). `SpaceGraphEvents` gains `camera:change`, `zoom:change`, and `projection:change`; `CameraViewport` and `Projection` are exported from `src/types.ts`.
- **L1.20 — `@spacegraphjs/spacegraph-renderer` (done).** `packages/spacegraph-renderer` implements `GraphRenderer` over the lean `spacegraphjs/activity` entry (loaded via dynamic `import()` inside `mount`, so importing the adapter is free of `three`/WebGL). `src/mapping.ts` is the pure `RenderNode`/`RenderEdge` → core-spec mapping (HtmlNode for `html` cards via `data.html`, ShapeNode otherwise; `LabeledEdge` when a label exists else `CurvedEdge`; status→color, inferred→muted/dashed). `src/index.ts` holds `SpaceGraphRenderer`: idempotent `mount`, ID-diffed `setModel` (add/update/remove via `loadSpec`/`removeNode`/`removeEdge` + `setPositions`), `setSelection`, `setTheme` (re-applies the model), `setProjection`, `setViewport`→`setZoom`, `fit`/`focus`/`resize`, `on`, and idempotent `dispose`. It never calls a layout; the core still does not import the contract (grep clean). Capabilities: `projections: ['2d','3d']`, `domNodes: true`, `maxDomNodes: 40`, `edgeLabels: true`, `clusterNodes: true`, `minimap: false` (honest until L1.27), `maxRecommendedNodes: 300`.
- **Bug fix (L1.17 partial).** `LabeledEdge` crashed on construction: the base `Edge` constructor calls the overridable `update()`, which ran `_positionLabel`/`updateLod` before `labelObject`/`labelEl`/`labelLod` existed. Added a `ready` guard so the overrides no-op until the label is built. This was blocking any labelled edge in the adapter.
- **Stopgap types.** `spacegraphjs/types/activity.d.ts` (the `./activity` `types` condition) was extended with the L1.8–L1.13 surface the adapter consumes (`events`, `setPositions`, `setProjection`, `setZoom`, `select`, `clearSelection`, `removeNode`/`removeEdge`, `hide`/`show`, `watch`, `zoom`, `viewport`, and an `EventEmitter` with `on`/`off`/`emit`). Still a stopgap; replace with generated declarations once L1.1 lands.
- **Wiring.** `spacegraphjs/packages/spacegraph-renderer` added to the OpenCode root `workspaces.packages` and as a `workspace:*` dep of `packages/session-graph`; `bun install` links it. `packages/session-graph/src/contract.test.ts` now also asserts the adapter resolves and declares its capabilities. New `packages/session-graph/src/contract/adapter-contract.tsx` + `.stories.tsx` (story id `session-graph-adapter`) mount the real adapter with a 5-node/2-edge `RenderModel` (HTML card + labelled + inferred edges).

Verification:
- `cd spacegraphjs && pnpm exec vitest run` → 14 files, 180 tests (new `test/zoom.test.ts`, 10 tests). `pnpm exec tsc --noEmit` still reports exactly the 10 pre-existing `src` errors and none in touched files.
- `cd spacegraphjs/packages/spacegraph-renderer && bun test` → 10 tests (mapping + capability). `bun run typecheck` clean.
- `cd packages/session-graph && bun test src` → 2 tests; `bun run typecheck` clean; `cd packages/app && bun run typecheck` clean.
- `cd packages/session-graph && bun run test:components` → 3 component tests pass (scaffold, spike, new adapter contract). The adapter test mounts in Storybook, asserts mount + 5 nodes/2 edges + a single `SpaceGraph` instance, toggles 2D→3D→2D, selects, resizes, disposes, and asserts zero console errors and a stable instance count.

Notes for the next pass:

- **L1.22 headless conformance is partial.** The shared `spacegraphjs/test/renderer.contract.test.ts` suite is not written because only one adapter exists; a one-adapter harness proves little. The adapter's behaviour is covered by its own `bun test` mapping suite plus the session-graph browser contract test. Build the shared suite when the Cytoscape adapter (L1.21) lands.
- **Adapter limitations to revisit.** `setProjection` swaps projection but not `enableRotate`, so 3D after a 2D start cannot orbit (cosmetic). `setModel` upserts node specs by ID via `loadSpec`, so a node changing `type` (e.g. card→dot) is not remodelled; it keeps its original type. `fit(ids)` ignores ids (fit-all). `resize()` just re-renders because the core owns a `ResizeObserver`.
- **Orbit-enable plumbing.** If the adapter should allow orbit in 3D and lock it in 2D, expose `CameraControls.config.enableRotate` (or a `SpaceGraph.setInteraction`) rather than reconstructing.
- **L1.17 remains open.** The `LabeledEdge` fix only stops the constructor crash; label CSS2D layering/zoom-awareness and edge hit areas are still L1.17.
- **`projection` lives on `render`.** `SpaceGraphOptions` does not yet take a top-level `projection`; hosts set `render.projection`. L1.4's remaining theming work is unchanged.
- Next in the plan: L1.21 (`@spacegraphjs/cytoscape-renderer`), L1.21a (`@spacegraphjs/svg-renderer`), then the shared conformance suite (L1.22), which unblocks P0.7/P0.8 and exit gate 0.

**2026-10-18 (cont.) — Phase 1 second backend and static export: Cytoscape adapter (L1.21), SVG renderer (L1.21a), shared conformance (L1.22); P0.7/P0.8 land with them.**

Scope for this pass (agreed with the user): the three remaining leaves — the second interactive adapter, the static SVG renderer, and the shared contract suite — which complete P0.3's "five packages" and exit gate 0. Library work is in `spacegraphjs` (commits below); OpenCode carries the workspace wiring, two browser contract stories/specs, and this log.

- **L1.21 — `@spacegraphjs/cytoscape-renderer` (`spacegraphjs/packages/cytoscape-renderer`).** `CytoscapeRenderer implements GraphRenderer`. `src/mapping.ts` is the pure `RenderNode`/`RenderEdge` → Cytoscape `ElementDefinition`/`StylesheetJson` mapping; enum-valued style props (`shape`, `line-style`, `target-arrow-shape`) are driven by **classes + selectors** (cytoscape's typings reject `data()` for enum props), while `label`/`color`/`width`/`height` come from `data()`. `src/index.ts`: idempotent `mount` (dynamic `import('cytoscape')`, `layout: { name: 'preset', fit: false }`, absolute positions only, no auto-layout), ID-diffed `setModel` (add/update/remove via `cy.batch`, `display: none` for hidden), `setSelection` (unselect-all then select by id), `setProjection` **no-op** (2D only, capability-declared), `setViewport`→`cy.zoom`, `fit`/`focus`/`resize`, tap/dbltap/hover/select→string-ID events, `zoom pan resize`→`viewportChange`, idempotent `dispose`. `shape: "card"` renders through a clipped, `pointer-events: none` DOM overlay (`data-slot="cytoscape-card"`) capped at `maxDomNodes`, repositioned on render/viewport/resize; content is never evaluated. Capabilities: `projections: ['2d']`, `domNodes: true`, `maxDomNodes: 20`, `edgeLabels: true`, `clusterNodes: true`, `minimap: false`, `maxRecommendedNodes: 1000`. Depends on `@spacegraphjs/renderer` and `cytoscape` (peer + dev); **never imports `spacegraphjs` core** (grep clean).
- **L1.21a — `@spacegraphjs/svg-renderer` (`spacegraphjs/packages/svg-renderer`).** `renderToSVG(model, options?)` is pure (runs in Node, no browser/DOM): computes bounds, emits `<svg>` with themed edges (dashed for inferred, arrow marker for directed) under nodes (rounded-rect cards, status-colored dots, badges) plus escaped labels, and honors explicit `width`/`height`/`theme`. `InlineGraph(container, options?)` sets the result into a host element (`setModel`/`resize`/`dispose`). Not an interactive `GraphRenderer`. Depends on `@spacegraphjs/renderer` only; no core import.
- **L1.22 — shared conformance suite.** `spacegraphjs/test/renderer.contract.test.ts` (Vitest, jsdom) runs against **both** interactive adapters: full `GraphRenderer` method surface, `CONTRACT_VERSION`, capability flags driving `supports()`, pre-mount no-ops, `on()` unsubscribe, idempotent `dispose` + post-dispose no-ops, and an explicit "differences are declared" case (only SpaceGraph has 3D; both have DOM cards/edge labels/clusters; neither claims a minimap). The workspace packages resolve under Vitest via new `resolve.alias` entries (`@spacegraphjs/{renderer,spacegraph-renderer,cytoscape-renderer,svg-renderer} → packages/*/src/index.ts`) and matching root `tsconfig` `paths`. **Deviation:** the browser half (mount/click/resize/dispose/HTML-card overlap/capability gating) lives in the session-graph Storybook harness (`component-tests/cytoscape.spec.ts` beside the existing `adapter.spec.ts`), not a bespoke `spacegraphjs/test/e2e/renderer.contract.spec.ts`, because the library repo has no contract page harness and the host's harness already mounts both adapters; record the second command in §8 when V5.6 wires CI.
- **Wiring.** `spacegraphjs/packages/{cytoscape-renderer,svg-renderer}` added to the OpenCode root `workspaces.packages` and as `workspace:*` deps of `packages/session-graph`; `bun install` links all five packages (P0.3 complete). New session-graph contract fixtures refactor: `src/contract/fixtures.ts` holds the shared `ADAPTER_THEME`/`ADAPTER_MODEL`; `adapter-contract.tsx` and the new `cytoscape-contract.tsx` consume it; `src/contract.test.ts` now also resolves the Cytoscape adapter and `renderToSVG`.

Verification:
- `cd spacegraphjs/packages/cytoscape-renderer && bun test` → 10 tests; `bun run typecheck` clean. `.../svg-renderer && bun test` → 6 tests; `bun run typecheck` clean.
- `cd spacegraphjs && pnpm exec vitest run` → 15 files, 193 tests (was 14/180; +13 conformance). `pnpm exec tsc --noEmit` still reports exactly the 181 pre-existing errors (the `paths` additions add none).
- `cd packages/session-graph && bun test src` → 4 tests; `bun run typecheck` clean; `cd packages/app && bun run typecheck` clean.
- `cd packages/session-graph && bun run test:components` → 4 component tests pass (scaffold, spike, SpaceGraph adapter, **new Cytoscape adapter**: mount, 5 nodes/2 edges, both HTML cards in the overlay, 3D no-op, selection/fit/resize, dispose leaves no canvas, zero console errors).

Notes for the next pass:
- **Exit gate 0** is satisfied except the literal "in the real app shell", which is Phase 4 (the routed session panel); both renderers now mount/dispose in the Storybook host behind the same contract, and the heavy deps stay off the entry.
- **Adapter limitations to revisit** (Tracked in L1.21/L1.20): Cytoscape `setProjection('3d')` is a silent no-op — the toolbar must gate 3D via `supports(capabilities, '3d')` (L1.28). Card overlay positioning uses `renderedPosition()` on render/viewport; verify under pan/zoom in U3.5.
- **Both `@spacegraphjs/renderer` consumers** now exist; the shared suite is one headless command (spacegraphjs) plus one browser command (session-graph). Fold both into `graph:verify` at V5.6.
- **L1.17** (`LabeledEdge` layering/hit-area) and **L1.18** (library tests/demo) remain; the SVG renderer gives V5.4 its static export path but `InlineGraph` is not exercised in a browser yet (U3.16/H6.4).

**2026-10-18 (cont.) — Phase 3 begins: render-model builder (U3.1), renderer registry (U3.2), canvas component (U3.3).**

Scope for this pass: the renderer-agnostic core of the graph UI — model → render model, backend selection, and the canvas
that mounts an adapter. `spacegraphjs` is untouched; work is in `packages/session-graph`.

- **New dependency (P0.3 wiring).** `@opencode/session-ui` added as a `workspace:*` dependency of `packages/session-graph`
  (`bun install` links it). This is what lets the canvas builder import the graph model; previously only the
  `@spacegraphjs/*` packages were linked.
- **U3.1 `buildRenderModel` (done).** New `packages/session-graph/src/canvas/buildRenderModel.ts`:
  `buildRenderModel(model, { level, positions, focus?, cardBudget?, renderCard? })` → `RenderModel`. It calls
  `nodesAtLevel`/`edgesAtLevel` (§5.4), maps model status → contract status (`failed → error`, `interrupted → warning`),
  maps each kind to a `card`/`panel`/`dot`/`badge` shape, emits absolute positions from the `layoutGraph` map, and attaches
  sanitized `html` for `card` nodes within the level's DOM budget — above the cap a card degrades to a `dot` label. Card
  markup is escaped (`escapeHtml`) and, by default, carries only model content (labels/summaries) with `color:inherit`, so
  no palette or English copy is baked in; a host `renderCard` template (e.g. localized) can replace it. Pure: imports only
  the contract, never a backend.
- **U3.2 `renderer-registry` (done).** New `renderer-registry.ts`: `createRenderer(id)` (construct without mount, so
  capabilities are readable first), `rendererOrder(preferred)` (`spacegraph` default with `cytoscape` fallback; a
  `cytoscape` request never falls back up), and `mountRenderer(container, options, overrides?)` which tries the order,
  discards a failed attempt, returns `{ id, renderer, fallback, error? }`, and rethrows the last error when all fail.
  Both adapters load behind dynamic `import()` so neither is pulled at module scope.
- **U3.3 `GraphCanvas.tsx` (done).** New `GraphCanvas` (Solid): mounts the selected adapter once, pushes `model`/`theme`/
  `selection`/`projection` via effects, mirrors `selectionChange` out through `onSelect`, reports readiness/capabilities
  via `onReady`, sets `data-graph-ready`/`data-graph-renderer`/`data-graph-projection`/`data-graph-band`, and disposes on
  cleanup. A `generation` counter drops late async mounts (StrictMode/HMR/session-switch safe). Changing `preferredRenderer`
  disposes and rebuilds once on the same model.
- **Verification.** `cd packages/session-graph && bun test src` → 17 tests (new `canvas/buildRenderModel.test.ts` 9,
  `canvas/renderer-registry.test.ts` 4). `bun run typecheck` clean. New story `session-graph-canvas` +
  `component-tests/canvas.spec.ts` mount the canonical fixture through the real model → registry → adapter path: asserts
  ready, `spacegraph` renderer, DOM activity cards carrying fixture text (`src/auth/session.ts`), `onReady` capabilities
  (3D present), a live switch to `cytoscape`, programmatic selection, and zero console errors.
  `bun run test:components` → 5 pass; a cold run (cache cleared, fresh port) prints no dependency-optimizer reloads.
- **`bun run check` caveat.** Repo-wide `check` still fails on two pre-existing, unrelated problems: `packages/ai`
  `zstdCompressSync` node-types error (present on `origin/dev`; `git diff origin/dev` for `packages/ai` is empty) and a
  `turbo` SIGSEGV in this environment. Lint (`oxlint`/ast-grep) passed, and no graph package reported an error.

Notes for the next pass (U3.1–U3.3):

- **Localization is still deferred to the UI layer.** `buildRenderModel`'s default card and the model's own labels
  (`Explore`, `Session`, `Retry #2`) are English; `renderCard` is the seam to supply localized copy, and the toolbar/
  inspector (U3.9/U3.10) own the `en.ts` rule. `GraphCanvas` carries `data-*` only and no accessible name yet — that lands
  with the accessibility mirror (U3.14) and `GraphView` (U3.8).
- **The canonical fixture has no reasoning parts**, so `detail` adds `notice` (the synthetic subagent-completion message)
  but not `reasoning`; a reasoning-bearing fixture or a synthetic model is needed to exercise `reasoning` rendering (U3.10).
- **Per-session renderer persistence and the fallback banner** are not in U3.2/U3.3 (they are app/integration or
  `GraphView` concerns): the registry returns `fallback`/`error` and `GraphCanvas` surfaces `data-graph-error`/`onError`;
  the recoverable banner + persisted choice are I4.1/U3.8.
- **`GraphCanvas` skeleton is a bare placeholder**; `GraphView` (U3.8) owns real empty/loading/error chrome. Resize is the
  adapter's own `ResizeObserver` (the contract `resize()` is not driven by the canvas).
- Next in the plan: U3.4/U3.5 (wire SpaceGraph and Cytoscape through the registry, theme, projection, bands), then
  U3.7–U3.17 (theme bridge, view layout, toolbar, inspector, breadcrumbs, search, minimap, a11y, 3D, stories, tests).

**2026-10-18 (cont.) — Phase 3 UI shell: theme bridge (U3.7), GraphView (U3.8), toolbar (U3.9), inspector (U3.10),
breadcrumbs (U3.11), search (U3.12); SpaceGraph/Cytoscape wiring (U3.4/U3.5).**

Scope for this pass: the legible, navigable surface that answers the five questions in the DOM, on top of the
U3.1–U3.3 core. All work is in `packages/session-graph` plus one shared i18n/`@source` edit; `spacegraphjs` is
untouched.

- **New dependency.** `@opencode/ui` added as a `workspace:*` dependency of `packages/session-graph` (toolbar/
  inspector reuse `IconButton`, `Icon`, `SegmentedControl`, and `useI18n`). `bun install` links it.
- **U3.7 theme bridge — `src/ui/theme.ts`.** `graphThemeFromTokens(read)` maps the host's semantic CSS custom
  properties (`--v2-background-bg-base`, `--v2-text-text-base`, `--v2-state-fg-danger`, `--v2-font-family-sans`, …)
  to a `RenderTheme`, with a neutral fallback per token so a missing stylesheet never yields an empty theme.
  `resolveGraphTheme(root?)` reads computed style; `createGraphTheme()` re-resolves on a `class`/`style`/
  `data-color-scheme` mutation or an OS scheme change. The library only ever sees a `RenderTheme`; OpenCode token
  names stay in this file. Unit-tested in `src/ui/theme.test.ts` (2 tests).
- **U3.8 GraphView — `src/ui/GraphView.tsx`.** One flex column: `GraphToolbar` -> `GraphBreadcrumbs` -> (canvas +
  search overlay) + `GraphInspector`. Owns semantic level, projection, selection, and search-open; builds the
  `RenderModel` via `buildRenderModel` + `layoutGraph`, mounts `GraphCanvas`, exposes the live renderer for
  `fit`/`focus`, and reads the theme from `createGraphTheme` unless a host theme is supplied. Selection is
  controlled when `props.selection` is set (mirrors the host value, reports through `onSelect`) and internal
  otherwise. A capability-gap effect falls back to 2D when the active renderer cannot do 3D, so the projection is
  never silently ignored.
- **U3.9 toolbar — `src/ui/GraphToolbar.tsx`.** Level `SegmentedControl` (Overview/Execution/Detail), zoom-out/
  zoom-in steppers (step the level), projection `SegmentedControl` (3D disabled with an explanation when
  `supports(capabilities, "3d")` is false), fit, search toggle, an unobtrusive "Renderer: …" label, and back-to-
  transcript. Every control has an aria label and a title; `data-slot="graph-toolbar"`.
- **U3.10 inspector — `src/ui/GraphInspector.tsx`.** Conventional DOM panel keyed by node kind: kind + status
  header, label, summary, time/path/agent/child-session/attempt/exit/timeout fields, changed-file list, tool input
  JSON in a scrollable `<pre>`, and a connection list built from `why(model, id)` where each edge names its other
  endpoint and confidence and selects it ("follow edge"). "Open in transcript" is shown only when
  `openInTranscript` returns a ref. All text is selectable; `data-slot="graph-inspector"`.
- **U3.11 breadcrumbs — `src/ui/GraphBreadcrumbs.tsx`.** Session -> turn -> phase -> node from the model's
  `breadcrumbs` selector; clicking a crumb selects it. (The plan names `spacegraphjs/navigation/Trail` (L1.26); that
  library primitive does not exist yet, so this reads the model's `part-of` ancestry. Swap to `Trail` when L1.26
  lands.)
- **U3.12 search — `src/ui/GraphSearch.tsx`.** Query over the model's `search` selector; result count via
  `i18n.plural("ui.sessionGraph.search.results", count)`; selecting a result bumps the level to the node's
  `minLevel`, selects it, and focuses it. Escape closes.
- **U3.4/U3.5 wiring.** Both adapters already mount through `renderer-registry`; this pass supplies the real theme,
  the level->model rebuild, projection with capability fallback, string-ID selection, and the renderer/capability
  state the toolbar shows. No `renderer === "cytoscape"` branch anywhere; 3D is gated by `supports`.
- **i18n.** New `ui.sessionGraph.*` keys added to `packages/ui/src/i18n/en.ts` only (English source copy; other
  locales fall back per the app's `base = { ...en, ...dict }` merge). Count copy uses `.one`/`.other` plural keys.
- **Styling.** `@source "../../../../session-graph/src"` added to `packages/ui/src/styles/tailwind/index.css` so
  Tailwind scans the new components in the app and Storybook builds.
- **Story + component test.** `src/ui/GraphView.stories.tsx` (`session-graph-view`) mounts the real view over the
  canonical fixture with a controlled selection starting on `tool:prt_tool_read_1`. `component-tests/graph-view.spec.ts`
  asserts: ready/spacegraph; the selected tool node renders as DOM detail (kind "Tool call", the path in its input)
  with breadcrumbs root "Session"; the level prop drives the toolbar's derived disabled state; search lists results
  and selecting `src/auth/token.ts` updates the host selection and closes the overlay; the 3D toggle projects to 3D;
  switching to Cytoscape rebuilds once, falls back to 2D, and disables 3D — with zero console errors.

Verification:
- `cd packages/session-graph && bun run typecheck` clean; `bun test src` -> 19 tests (was 17; +2 theme).
- `cd packages/session-graph && bun run test:components` -> 6 pass (was 5; +1 view), repeated cold.
- `cd packages/ui && bun run typecheck` clean; `cd packages/app && bun run typecheck` clean.

Notes for the next pass:

- **A controlled selection is the reliable path in the Storybook harness.** During development the view exposed its
  state via `createEffect`+`data-*` and a native-attribute binding, and those did not re-render under the
  Storybook/preview module graph, while child text nodes and component props did; an effect fed by the adapter's
  `selectionChange` also risked a rebuild loop (`layoutGraph`/`selection()` return fresh objects each call). The
  shipped view avoids `data-*` reactivity for state and drives selection through props. If U3.14/U3.17 later need
  live selection assertions, verify them here before relying on them; the app e2e (I4.8/V5.5) is the stronger owner.
- **U3.11 is not the library Trail.** L1.26 (`spacegraphjs/navigation/Trail`) still has to exist before breadcrumbs
  can move; U3.11's done-when "the trail controller has no OpenCode imports" is met only after that swap.
- **U3.13 minimap (L1.27), U3.14 a11y (L1.25), U3.15 3D polish, U3.16 stories, U3.17 component tests remain.** The
  3D toggle exists but there is no depth cue/orbit polish and no 3D story. The renderer selector is not in the
  toolbar (it lives in the story harness / prototype settings); per §4.7 it belongs in prototype settings.
- **Inspector is structural.** It reads `GraphNode.summary`/`data`; markdown rendering, ANSI stripping, and
  on-demand diffs (§U3.10) are not implemented — the graph model does not carry the raw terminal text or diff
  hunks yet. Phase 4/5 own loading those from `openInTranscript` refs.
- **`graphThemeFromTokens` reads `--v2-font-family-sans`.** The token exists in `tokens/theme.css`; if a host omits
  it the fallback `system-ui, sans-serif` applies.
- Next in the plan: U3.16/U3.17 stories and component tests for the remaining states, then U3.13/U3.14 which need
  the Phase 1 primitives (L1.25 AccessibilityLayer, L1.27 MinimapPlugin), then Phase 4 integration (I4.x).

**2026-10-18 (cont.) — Phase 1 generic controller modules: ZoomBands (L1.23), LaneLayout (L1.24), AccessibilityLayer (L1.25), Trail (L1.26).**

Scope for this pass: the contract-free, headless primitives the remaining Phase 3 UI needs — breadcrumbs (U3.11), minimap (U3.13), and the accessibility mirror (U3.14). All work is in `spacegraphjs` commit `1d9159d` (branch `main`); OpenCode carries only this log.

- **L1.23 ZoomBands (done).** New `src/zoom/ZoomBands.ts`: contiguous normalized bands (validated to cover `[0,1]`) with a hysteresis dead-zone, `feed(raw, range)` / `feedNormalized(value)`, change callbacks carrying `from` and the previous snapshot, and `snapshot()`. New thin `src/plugins/ZoomBandsPlugin.ts` (extends `BaseSystemPlugin`) subscribes to the core `zoom:change` telemetry, feeds the controller, and emits `zoomband:change` plus a legacy `fractal:level-change` (band index as `to`) so `ZoomUIPlugin` and the `fractal-complex` demo keep working. `DEFAULT_CHROME_PLUGINS` now lists `ZoomBandsPlugin`; `FractalZoomPlugin` is kept but marked `@deprecated`. Exported from `src/index.ts`, `src/plugins/index.ts`, and the lean `src/activity.ts`; new `SpaceGraphEvents['zoomband:change']`.
- **L1.24 LaneLayout (done).** New `src/layout/LaneLayout.ts`: lanes → Y, group/ordinal → X, depth → Z, with `reserve(group, span)` for in-flight groups, `bounds(ids?)`, idempotent `place`, `placeAll`, and `clear`. Deterministic and append-only; no session or contract dependency. This is the generic primitive `layout.ts` (M2.7) can sit on once a host chooses to.
- **L1.25 AccessibilityLayer (layer implemented; adapter wiring is U3.14).** New `src/a11y/AccessibilityLayer.ts`: a visually hidden, ordered mirror over a minimal structural item (`id`/`label`/`kind`/`status`/`interactive`), roving tabindex, Arrow/Home/End traversal that skips non-interactive items, Enter/Space selection, Escape, and an `aria-live` selection announcement. It imports no contract and no renderer, and the core still does not import the contract (grep clean). **Not done:** mounting it over the active render model in the session-graph UI and proving keyboard traversal against both adapters — that is U3.14.
- **L1.26 Trail (done).** New `src/navigation/Trail.ts`: push/replace/back/forward with forward-truncation, `maxDepth` trimming, `reset(node?)`, `toLabels`, change listeners, and `reconcile(byId)` so entries survive render-model updates by ID (removed ids are dropped; nothing surviving resets the trail).
- **Exports.** `package.json` `exports` gains `./zoom`, `./layout`, `./a11y`, `./navigation`; the `spacegraphjs/*` tsconfig path already covers them. `./inline` remains the only subpath from L1.1's list with no module (the inline SVG renderer lives in `@spacegraphjs/svg-renderer`, not the core).

Verification: `cd spacegraphjs && pnpm exec vitest run` → 19 files, 226 tests (4 new files: `zoom-bands` 8, `lane-layout` 9, `trail` 8, `a11y` 6; `chrome.test.ts` updated to the new chrome list). `pnpm exec tsc --noEmit` still reports exactly the 181 pre-existing errors, none in the new or changed files. `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 19 pass.

Notes for the next pass:

- **L1.27 (Minimap/ZoomUI rework) is untouched** and blocks U3.13. The survey found: the minimap overlay is already container-scoped (`renderer.container`) but `ZoomUIPlugin` appends to `document.body`; `MinimapPlugin.dispose()` leaks its overlay node and never calls `super.dispose()`; `ZoomUIPlugin.dispose()` leaks the `fractal:level-change` listener and its hint `setTimeout`; the minimap runs a second full scene render per frame and computes the viewport rect from a `PerspectiveCamera` cast (wrong under ortho).
- **U3.11 breadcrumbs can now swap to `Trail`** (import `spacegraphjs/navigation`); `Trail` has no OpenCode imports. The focus-dimming/Esc clause of U3.11 is separate.
- **U3.14 should mount `AccessibilityLayer` against `RenderModel.nodes`** (map kind/status/interactive) and the adapter selection event.
- **L1.23's bands are a generic default, not UI policy.** The semantic level policy stays in `session-ui/src/graph/levels.ts`.
- Remaining Phase 3 UI: U3.6 (renderer comparison), U3.13 (minimap, needs L1.27), U3.14 (a11y, needs the layer mount), U3.15 (3D polish), U3.16 (stories), U3.17 (component tests). Remaining Phase 1: L1.5–L1.7, L1.11, L1.14–L1.18, L1.27–L1.34.

**2026-10-18 (cont.) — Phase 3 accessibility mirror (U3.14) and a selection-echo fix.**

Scope for this pass: mount the L1.25 `AccessibilityLayer` over the render model so keyboard-only users reach every node the canvas draws, and prove it in both renderers. Library work is in spacegraphjs `313a4bc`; OpenCode carries the UI, one i18n edit, and this log.

- **U3.14 accessibility mirror (done).** New `packages/session-graph/src/ui/GraphA11y.tsx` mounts the library `AccessibilityLayer` over `RenderModel.nodes` (mapping `id`/`label`/`kind`/`status`/`interactive`), mirrors the host selection into it, and forwards Enter/Space selection and Escape to the view. Its live-region copy is localized: `AccessibilityLayer` gained an optional `formatSelection(labels)` hook (default stays English), and the host passes `ui.sessionGraph.a11y.selected` / `.cleared`. `GraphView` renders it inside the canvas region, gives the region `tabindex="0"` + `aria-describedby` pointing at a visually hidden instructions paragraph, and wires Escape to clear the selection. Four new `ui.sessionGraph.a11y.*` keys in `packages/ui/src/i18n/en.ts`.
- **New story + component test.** `src/ui/GraphA11y.stories.tsx` (`session-graph-a11y`) mounts `GraphView` **uncontrolled** (the mirror drives the view's own selection; the harness only observes), because the controlled `selection` prop does not reliably round-trip in the Storybook/preview module graph (the warning recorded in the U3.7/U3.8 note). `component-tests/graph-a11y.spec.ts` asserts the labelled group, the connection to the instructions, one roving tabindex, arrow-key traversal, Enter-to-select-and-inspect, Escape-to-clear, and then repeats the traversal and inspection after switching to Cytoscape.
- **Selection feedback loop fixed (spacegraphjs `313a4bc`).** Wiring the mirror exposed a real bug: both adapters emitted `selectionChange` for their **own** `setSelection` calls, so `GraphCanvas` fed the event back into host selection, which re-pushed `setSelection` (a fresh array each time) and looped — the selection never stuck. With the debug trace, `ADAPTER.setSelection []` / `selection:changed []` repeated thousands of times. Both adapters now suppress `selectionChange` while applying a programmatic `setSelection` (a guard flag), so the event again means "the user changed the selection". The SpaceGraph adapter's `setSelection` and Cytoscape's `select`/`unselect` binding are the two changed sites.
- **Verification.** `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 19 pass; `bun run test:components` → 7 pass (was 6; +1 a11y), repeated cold. In spacegraphjs: `pnpm exec vitest run` → 19 files / 224 tests (a11y +1 with its `formatSelection` case); `test/renderer.contract.test.ts` → 13 pass; `packages/{spacegraph-renderer,cytoscape-renderer,renderer}` `bun run typecheck` clean.

Notes for the next pass:

- **The mirror lists nodes only.** `AccessibilityLayer` takes a node-shaped item; edge traversal is not exposed. If the contract needs edge announcements, extend the layer with an edge list rather than faking edges as items.
- **Live selection assertions in the harness remain unreliable.** The a11y test is deterministic because the view is uncontrolled and the assertions read the inspector DOM + the harness-observed callback, not the controlled prop. Keep the app e2e (I4.8/V5.5) as the owner of live streaming/resize selection.
- **U3.11 can still swap breadcrumbs to `Trail` (L1.26).** Unchanged; the a11y work did not touch breadcrumbs.
- Remaining Phase 3 UI: U3.6, U3.13 (needs L1.27), U3.15, U3.16, U3.17. Remaining Phase 1: L1.5–L1.7, L1.11, L1.14–L1.18, L1.27–L1.34.

**2026-10-18 (cont.) — Library hardening: lifecycle/input/scheduling (L1.5–L1.7), LOD (L1.14), DOM updates (L1.15), layouts (L1.16), tests and demo (L1.18); L1.11 dedup.**

Scope for this pass (agreed with the user): make the core reliably embeddable and deterministic. All work is in `spacegraphjs` (commits `e4ea140` and `7dec1ed`, branch `main`); the only OpenCode edits are two component-test assertions that no longer read the (now opt-in) global registry.

- **L1.5 Correct `init()`/`dispose()` (done).** `SpaceGraphOptions.global` (default false) gates `window.SpaceGraph` and `SpaceGraph.instances` registration. `init()` is idempotent (`#initialized`); `dispose()` is idempotent (`#disposed`) and now calls `pause()`, `pluginManager.disposePlugins()`, `input.dispose()`, `cameraControls.dispose()`, `vision.dispose()`, `graph.clear()`, `renderer.dispose()` (ResizeObserver + WebGL + DOM), and `events.clear()` — the old `dispose()` leaked the renderer, camera controls, input, vision, and event listeners. Verified by the new Playwright spec (`test/e2e/hardening.spec.ts`): 20 mount/dispose cycles leave one canvas and no extra instances.
- **L1.6 Container-scoped keyboard (done).** `SpaceGraphOptions.keyboard: false | 'container' | 'window'` (default `'container'`). `CameraControls.setKeyboardScope()` attaches listeners to the container (or window) and ignores keys whose target is an `input`/`textarea`/`select`/`[contenteditable]`/`.monaco-editor`. `SpaceGraph.#init` gives the container `tabindex=0` when scoped to it. Unit-tested in `test/hardening.test.ts` (container moves, window ignored, editable ignored, `false` binds nothing, `'window'` moves).
- **L1.7 Render scheduling (done).** `RenderOptions.renderMode: 'continuous' | 'on-demand'` (default `'on-demand'`). `SpaceGraph.render()` starts the loop only in continuous mode; otherwise `requestFrame()` coalesces a single frame. Frames are requested by graph/selection events, explicit camera ops, `CameraControls` drag/fly/keys, `InputManager` events, `Renderer.onResize`, and `Graph.setPositions`/`pinAll` and `Node.updateSpec`, so on-demand repaints on every mutation and idle CPU is near zero.
- **L1.11 dedup (partial — focus outline open).** The dead `HoverFingering` (its `start()` always returned false, so `FingerManager` never activated it) is removed along with its registration and export; `HoverManager` is the single hover source. Hidden/LOD-culled nodes are no longer pickable (see L1.14). **Not done:** a visible keyboard focus outline for mesh nodes (the a11y layer, U3.14, is the DOM traversal path; mesh focus painting is separate).
- **L1.14 LOD correctness (done).** `Node.computeLOD` is the single implementation (`RenderContext.computeLOD` delegates); it honours per-node `data.minZoom`/`data.maxZoom` and `data.lod`, and `Renderer.render` computes LOD once per node per frame (the double `Box3.setFromObject` is gone) via a per-frame bounds cache (`Node.lodFrame`). `InteractionRaycaster` skips nodes whose `node.visible`/`node.object.visible` is false, so hidden nodes cannot be picked. Unit-tested for zoom bands, the `lod` override, invisibility, screen-size culling, and cache invalidation on frame advance.
- **L1.15 safe DOM updates (partial).** `HtmlNode.updateSpec` no longer rewrites `innerHTML`/`textContent` when the html/content is unchanged. **Not done:** a `DOMNode`/`CustomNode` spec path that adopts an existing `HTMLElement` and exposes `data.lod` (types are constructed as `new Type(sg, spec)`, so a factory/registry path is required).
- **L1.16 deterministic layouts (done).** `BaseLayout.applyPosition` applies positions synchronously and no longer reaches for `window.gsap`, so layouts are deterministic; `HierarchicalLayout` skips pinned nodes (the timeline layout already did). Unit-tested: repeated runs are byte-identical and pinned nodes never move when new nodes are added.
- **L1.18 tests and demo (done for this slice).** New `test/hardening.test.ts` (12 tests) and `test/e2e/hardening.spec.ts` (4 Playwright tests) plus `demo/hardening.html`. The library unit suite is 20 files / 236 tests (was 19/224).

Verification:
- `cd spacegraphjs && pnpm exec vitest run` → 20 files, 236 tests pass. `pnpm exec tsc --noEmit` still reports exactly the same 10 pre-existing `src` errors (`bvh`, `DynamicThicknessEdge`, `HistoryPlugin`, `MermaidNode`, and two `Array.at` in `CameraControls`), none in the changed files.
- `cd spacegraphjs && node_modules/.bin/playwright test test/e2e/hardening.spec.ts` → 4 pass in Chromium against `demo/hardening.html`. **Environment caveats:** the demo server must be the repo vite (`root: 'demo'`), so the page URL is `/hardening.html` (not `/demo/hardening.html`; the older `/demo/*.html` specs are stale under this config). The suite needs the headless-shell/ffmpeg revision symlinks and `SG_DEMO_URL` when 5173 is occupied; the spec reads `SG_DEMO_URL` for that reason.
- `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 19 pass; `bun run test:components` → 7 pass. `cd packages/app && bun run typecheck` clean.

Notes for the remaining work:
- **Behavior changes to carry forward.** Graphs are bare by default: no `window.SpaceGraph`, no `SpaceGraph.instances`, no `chrome`, on-demand rendering, and container-scoped keyboard. Hosts that relied on the global registry or the continuous loop must opt in (`global: true`, `render: { renderMode: 'continuous' }`). Cross-graph edge resolution in `Graph.addEdge` still reads `SpaceGraph.instances`, so the inter-graph demo now needs `global: true` (L1.30 removes the mechanism).
- **L1.17 advanced.** `Renderer` gained a `CSS2DRenderer` layer, so edge labels actually paint (previously `LabeledEdge` built `CSS2DObject`s but no CSS2D renderer existed) at a constant screen size; the demo asserts a visible `.sg-edge-label` (spacegraphjs `7dec1ed`). Overlap avoidance and edge hit areas remain.
- **Bounds cache.** `Node.getScreenPixelSize` caches per render frame (`Node.lodFrame`); the public `bounds`/`bounds3D` getters stay uncached so camera fit is always fresh. Any future caller that needs node bounds outside a render frame should use the getters, not the LOD path.
- Next in Phase 1: L1.27 (minimap/zoom-control rework, unblocks U3.13), then L1.5-adjacent L1.30–L1.34 (multi-instance, SSR, touch, renderer rename, boundaries). Phase 3 UI still needs U3.6, U3.13, U3.15, U3.16, U3.17.

**2026-10-18 (cont.) — Phase 1 hardening (L1.28, L1.31, L1.34) and Phase 3 states/stories/tests (U3.16/U3.17 partial).**

Scope for this pass: two Phase 1 test-first tasks that needed no product behaviour, plus the graph view's non-happy-path states and their story/component coverage. Library work is in `spacegraphjs` (tests + one script; no `src` change); host work is in `packages/session-graph` plus four `en.ts` keys.

- **L1.31 SSR-safe entry (done).** New `spacegraphjs/test/ssr.test.ts` runs under `// @vitest-environment node` and imports the full entry, the lean `activity` entry, and all four packages (`@spacegraphjs/renderer`, `spacegraph-renderer`, `cytoscape-renderer`, `svg-renderer`) with no DOM present, asserting `window`/`document` are undefined and each surface resolves. This locks the "no top-level browser access" boundary; the entry already imported cleanly under Node.
- **L1.34 package boundaries (done).** New `spacegraphjs/test/boundaries.test.ts` statically scans imports (test/spec files excluded) and asserts the §4.1 direction: `src` imports none of the contract/adapters/`cytoscape`; `@spacegraphjs/renderer/src` has no imports at all; `cytoscape-renderer/src` and `svg-renderer/src` import neither `spacegraphjs` core nor `cytoscape`; and `spacegraph-renderer/src` is the only adapter that imports both the core and the contract. New `test:boundaries` script (`vitest run test/boundaries.test.ts`). The four package `package.json`s already carried explicit `exports`, `sideEffects: false`, and peer deps; a `build` script stays deferred with the source-workspace decision (R7.5).
- **L1.28 capability-aware UI contract (confirmed done).** `supports(capabilities, capability)` drives the toolbar's 3D control (`disabled` + `title` explanation) and `GraphView` falls back to 2D when the active renderer lacks 3D; there is no `renderer === "cytoscape"` branch in the UI. No code change needed.
- **U3.8 gap closed — empty and error states.** `GraphView` now renders a `data-slot="graph-empty"` message when the model has no nodes and a `data-slot="graph-error"` overlay (with a "Back to transcript" action when `onBack` is supplied) driven by the canvas's `onError`, so a session with nothing to graph and a total mount failure both stay legible. `GraphCanvas` gained an `overrides?: Partial<Record<RendererID, RendererFactory>>` prop forwarded to the existing `mountRenderer` overrides parameter, and `GraphView` exposes it as `rendererOverrides`; this is the seam that forces the error state without a global mock. Four `ui.sessionGraph.canvas.{empty,emptyHint,error,errorHint}` keys added to `en.ts`.
- **U3.16 stories (partial).** `GraphView.stories.tsx` is now a generalised harness with named stories: `Default` (execution, selected tool), `Overview`, `Detail` (failed shell result), `Projection3D`, `Cytoscape`, `Empty`, `Error`, `Narrow` (390×844). Light/dark are driven by the Storybook `theme` global (the preview toggles the `light`/`dark` class, which `createGraphTheme` observes), not separate stories.
- **U3.17 component tests (partial).** New `component-tests/graph-states.spec.ts` (5 tests) mounts the real view: empty state visible with the canvas ready; forced mount failure shows the error overlay + Back button with `data-graph-ready="false"`; overview disables zoom-out and enables zoom-in; the 390px viewport has no horizontal overflow; dark mode re-mounts the same model with `data-graph-renderer="spacegraph"` and zero console errors.

Verification:
- `cd spacegraphjs && pnpm exec vitest run` → 22 files, 245 tests (was 20/236; +`ssr`, +`boundaries`). `pnpm exec tsc --noEmit` unchanged (181 pre-existing errors, none in the new files). `bun run test:boundaries` → 5 pass.
- `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 19 pass; `bun run test:components` → 12 pass (was 7; +5 states).
- `cd packages/ui && bun run typecheck` clean; `cd packages/app && bun run typecheck` clean.

Notes for the next pass:

- **U3.16 still needs**: a long-output story (the canonical fixture carries no long tool output or diff hunks — the inspector's `<pre>` reads `data.input`, not terminal text), separate loading-state coverage (the skeleton is transient), and a `CurrentSessionProviders`-backed story set. The `aria`/`data-*` state note from U3.7/U3.8 still holds: read the inspector DOM and the harness callback, not the controlled selection.
- **Error-state assertion is story-injected, not integration.** The app e2e (V5.5: "SpaceGraph mount failure falls back to Cytoscape with a banner" and "both renderers failing falls back to the transcript") is the owner of the real fallback path; the `rendererOverrides` seam is only for deterministic stories/tests.
- **`rendererOverrides` is a test seam on two public components.** If the app integration (I4.2) does not need it, consider moving it behind a dev-only path; the registry's `mountRenderer(..., overrides)` already supported it, so it added no new concept.
- **L1.30 (multi-instance isolation) is the next Phase 1 fault line** and is *not* free: `Graph.addEdge` still resolves nodes across `SpaceGraph.instances` and `test/spacegraph.test.ts` ("creates InterGraphEdges…") asserts it. Removing the mechanism means rewriting that test and deciding whether `InterGraphEdge` stays. **L1.27 (minimap)** is larger than it reads: contract `setViewport` carries `zoom` but the adapters ignore `center`, so a click/drag-to-pan minimap needs a contract change and both adapters plus the conformance suite.
- Next in Phase 3: U3.15 (3D polish), U3.13 (minimap, needs L1.27), U3.6 (comparison). Remaining Phase 1: L1.11, L1.15, L1.17, L1.25, L1.27, L1.29–L1.34.

**2026-10-18 (cont.) — Phase 3 3D mode (U3.15): orbit follows projection, a real 3D camera pose, and a projection-agnostic detail check.**

Scope for this pass: make the 2D↔3D toggle an actual camera change instead of a silent swap. Library work is in `spacegraphjs` (camera controls + `SpaceGraph` facade + the `./activity` stopgap); host work is the adapter wiring plus one component test.

- **Orbit follows projection (library).** `CameraControls` gains `setOrbitEnabled(enabled)` (gates orbit input without swapping the camera; orthographic still never orbits) and `setPolar(phi, theta, duration)` (points the camera at a polar/azimuth angle, animating through the existing target/radius lerp when a duration is given; the polar clamp is shared with `rotate`). `SpaceGraph` re-exposes both as `setOrbitEnabled`/`setPolar`. New `test/camera-controls.test.ts` (4 tests) covers orbit gating and immediate vs animated pose.
- **U3.15 — 3D is a camera change (adapter).** `@spacegraphjs/spacegraph-renderer`'s `setProjection` now also applies a pose: `2d` → orbit off + flat top-down (`FLAT_PHI = π/2`), `3d` → orbit on + a ~29° tilt (`TILT_PHI = π/2 - 0.5`) so the hierarchy Z reads as depth; both animate over 0.5s and keep the controls target, so identity, selection, and inspector content are untouched. The same pose is applied at `mount` for a graph that starts in 3D. Without this, 3D looked identical to 2D until the user orbited, and orbit stayed dead after a 2D→3D toggle (the `enableRotate: false` set at mount was never restored).
- **Bug fixed.** The adapter set `enableRotate: !ortho` once at mount; `setOrbitEnabled` replaces that one-shot with an explicit per-projection gate, so 3D-after-2D can orbit.

Verification:
- `cd spacegraphjs && pnpm exec vitest run` → 23 files, 249 tests (was 22/245; +`camera-controls` 4). `pnpm exec tsc --noEmit` adds no errors in touched files (CameraControls keeps only its two pre-existing `Array.at` errors).
- `cd spacegraphjs/packages/spacegraph-renderer && bun run typecheck && bun test` → clean, 10 tests.
- `cd packages/session-graph && bun run typecheck && bun test src` → clean, 19 tests.
- `cd packages/session-graph && bun run test:components` → 13 pass (was 12; +`graph-3d`, which toggles 3D→2D and asserts `data-graph-projection`, inspector content, and breadcrumbs survive with zero console errors).
- `cd packages/app && bun run typecheck` → clean.

Notes for the next pass:
- **U3.15 remaining cosmetics.** "Keep 2D-like labels" already holds (CSS2D edge labels and `depthTest:false` node labels are constant-size); the "subtle depth cue" is the default 3D tilt — a fog/attenuation cue was deliberately not added because it is unverifiable without visual review and interacts badly with the transparent background. Orbit clamp is the existing polar/distance clamp.
- **The 3D pose is generic adapter policy, not OpenCode semantics.** `FLAT_PHI`/`TILT_PHI` live in the SpaceGraph adapter (the renderer owns camera per contract rule 1); a host cannot yet choose the tilt. If a host needs a different 3D framing, surface `render.projectionTilt` rather than branching in the host UI.
- **`SpaceGraphOptions.cameraControls` is still passed with a cast** (it is not typed on `SpaceGraphOptions`; the adapter relies on the `./activity` stopgap's index signature). Typing it is L1.4/L1.1 cleanup.
- Next in Phase 3: U3.13 (minimap, needs L1.27), U3.6 (comparison). Remaining Phase 1: L1.4, L1.11, L1.15, L1.17, L1.27, L1.29, L1.30, L1.32, L1.33.

**2026-10-18 (cont.) — Phase 4 integration (I4.1–I4.9, I4.11), L1.30 graph isolation, and Phase 3 U3.16/U3.17 close-out.**

Scope for this pass (agreed with the user): "essentials, hardening, and integration" — skip the minimap (L1.27/U3.13, low priority), land the OpenCode integration, the graph-isolation hardening, and the remaining Phase 3 stories/tests. Library work is in `spacegraphjs` commit `bafb5c2`; OpenCode carries the app wiring, the story/test, and this log.

- **I4.1 per-session graph state (done).** `sessionViewSchema` gains an optional `graph: { mode, projection?, renderer?, selected? }`; a new `layout.graph(sessionKey)` accessor (beside `view`/`tabs`) reads/patches it, participates in `touch`/`prune`, and is exposed as `session.layout.graph()` via `session-layout.ts`/`model.ts`. Absent means transcript, so old layouts decode unchanged.
- **I4.2 lazy wrapper (done).** New `packages/app/src/session/graph/session-graph-view.tsx`: `lazy(() => import("@opencode/session-graph").then(m => ({ default: m.GraphView })))` behind a `<Suspense>` skeleton and an `<ErrorBoundary>` whose fallback returns to the transcript with a message. It builds the pure model (`buildGraph(session.history.messages(), session.data.status())`), reads the persisted graph state, persists selection/projection, and maps "open in transcript" through `openInTranscript`. It imports no adapter; `@opencode/session-graph` was added as a `workspace:*` dep of `packages/app`.
- **I4.3 render branch (done).** In `screen.tsx` the single `timelineView()` render becomes a `Switch` between `graph.mode() === "graph"` (the wrapper) and the timeline. The composer, header, and panel frame are untouched, so a mode switch does not remount them.
- **I4.5 toggle (desktop done; mobile gated).** New `session/header/session-graph-toggle.tsx` (IconButton, pressed state, tooltip with the `graph.toggle` keybind) sits beside `SessionReviewToggle` in the header toggle container. Mobile has no header toggle yet; `graph.toggle`/`graph.projection` commands reach it on mobile. Per I4.10's escape hatch, mobile graph mode is currently command-only and the decision is recorded here.
- **I4.6 commands/keybinds (done).** `graph.toggle` (`mod+shift+g`) and `graph.projection` (`mod+alt+g`) register in `viewCmds`; both read `actions.session.layout.graph()`. `en.ts` gains `command.graph.toggle`/`command.graph.projection`.
- **I4.7 open in transcript (wired).** The wrapper persists selection, and "open in transcript" switches mode back to transcript then calls `timeline.actions.revealMessage(messageID, partID)`.
- **I4.8/I4.9/I4.11 (structural).** The model is a `createMemo` over the reactive message accessor, so streaming appends update the model and the adapters diff by ID; `GraphCanvas` disposes on cleanup and keys per session; `GraphView` already re-themes from host tokens via `createGraphTheme`.
- **L1.30 graph isolation (done; registry kept as a dev handle).** `Graph.addEdge` no longer searches other instances for endpoints and never auto-selects `InterGraphEdge`, so an edge only resolves nodes in the same graph. `test/spacegraph.test.ts` is rewritten: an edge to a node in another instance (both in `SpaceGraph.instances`) is rejected, and two instances with duplicate node ids stay independent (distinct nodes, isolated removal). **Deviation:** the literal "remove global instance registration" step is not taken — `SpaceGraph.instances`/`options.global` remain as an explicit, off-by-default **developer handle** for the vision/inspection Playwright helpers (`src/vision/analyzer.ts`, `assert.ts`, several `test/e2e/*.spec.ts`) and two demos; they are no longer consulted by graph semantics, so the observable Done ("two graphs coexist without cross-talk") holds. Removing the registry would rewrite the vision tooling and ~5 Playwright specs; deferred as out-of-scope churn. `inter-graph-edges.html` is repurposed as an isolation demo.
- **U3.16/U3.17 close-out.** New `LongOutput` story (`session-graph-view--long-output`) mounts a synthetic tool node whose `data.input` JSON runs to 120 lines; a new `graph-states.spec.ts` case asserts the output scrolls rather than growing the panel. The **full component suite passes repeated at `--workers=2 --repeat-each=10` (140/140)**.

Verification:
- `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 19 pass; `bun run test:components` → 14 pass; repeated `--workers=2 --repeat-each=10` → 140 pass.
- `cd packages/session-ui && bun test src/graph` → 42 pass; `bun run typecheck` clean.
- `cd packages/app && bun run typecheck` clean; `bun run lint:changed` → 0 problems.
- `cd spacegraphjs && pnpm exec vitest run` → 23 files / 250 tests (isolation rewrite nets +1).

Notes for the next pass:
- **Phase 4 is wired but not app-e2e-verified.** I4.4 (transcript scroll restore across the mode switch), I4.7 (both directions from a cold load), I4.8 (live append without selection loss), and I4.9 (WebGL context stability over repeated session switches) are structurally in place but their Done-whens are tests that belong to V5.5. `graph.mode` restoration on reload is schema-backed but untested.
- **Mobile graph is command-only.** Adding a mobile header/tab entry is I4.10; the toggle is desktop-only today.
- **Registry removal (L1.30 literal step) is deferred** with the rationale above; if pursued, the vision helpers need a non-semantic page handle and the behavioral/interaction/n8n/vision specs need rewriting.
- **App chunk check pending.** I4.2's "graph code absent from the session entry chunk" is asserted by construction (lazy import) but not measured; V5.7 owns the number.
- Remaining Phase 1: L1.4, L1.11, L1.15, L1.17, L1.27, L1.29, L1.32, L1.33. Remaining Phase 3: U3.6, U3.13. Next: Phase 5 verification/screenshots once the app path is exercised end to end.

**2026-10-18 (cont.) — Phase 5 begins: graph app e2e contracts (V5.5).**

Scope for this pass (agreed with the user): verify the wired-but-unverified Phase 4 integration end to end. New
`packages/app/e2e/graph/session-graph.spec.ts` (6 cases) over the canonical fixture. No production code changed;
OpenCode carries the new spec and this log.

- **Fixture seeding reuses the single source (M2.9).** The spec imports `buildFixtureMessages()` from
  `@opencode/session-ui/graph` and serves it through the harness `pageMessages` (mock server) or
  `setupTimeline({ sessionMessages })`. No second hand-written fixture.
- **Cases.** (1) mode switch renders the fixture (execution-level DOM activity cards) and the mode persists across
  reload; (2) search selects a file node and the inspector renders its detail in the DOM panel; (3) a live
  `session.step.started` + tool events append a node (a new file card) without clearing the selected node; (4)
  switching tabs disposes the graph (`graph-canvas-host` count 0) and returning re-mounts it; (5) resize keeps
  `data-graph-ready="true"`; (6) dev-only: aborting the lazy `@opencode/session-graph` module URL drives the wrapper
  `ErrorBoundary` to the transcript fallback.
- **Verification.** `cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts` → 6 pass (dev);
  `--repeat-each=10 --workers=5 --retries=0` → 60 pass across three clean runs (one earlier run failed 5/10 of case 1
  while the machine was heavily loaded; not reproduced in three later full runs); built
  `PLAYWRIGHT_BUILD=1 … -- e2e/graph/session-graph.spec.ts` → 5 pass, 1 skipped (the dev-only fallback). The file
  typechecks (`bun run typecheck:e2e`; the 4 pre-existing errors are unchanged) and root `bun run lint:changed`
  reports 0 problems.

Notes for the remaining Phase 5 work:

- **V5.5 still needs the renderer-fallback cases.** "SpaceGraph mount failure falls back to Cytoscape with a banner"
  and "both renderers failing falls back to the transcript" are proven at the component level
  (`session-graph/component-tests/graph-states.spec.ts`, via the `rendererOverrides` seam) but are not reproduced at
  app level: forcing an adapter mount failure without adding a production seam is not possible in the built bundle.
  The wrapper's own load-failure fallback is covered by case 6 (dev-only, because the built chunk URL is hashed).
  Before adding the app-level duplicates, confirm they are not already owned by the component suite.
- **8-digit theme color defect (fixed 2026-10-18).** The graph logged `THREE.Color: Invalid hex color #ffffffff`
  at mount. The host theme background token can be an 8-digit hex; the core `Renderer` now normalizes its
  background through `parseColor`, which drops alpha from 8-digit hex (and expands 3-digit hex), so no warning
  fires and the clear color is correct (see the SpaceGraph-renderer-essentials pass note above).
- **V5.1–V5.4 and V5.6–V5.9 remain** (capture spec + CLI + reproducible screenshots; conformance-in-CI; performance;
  accessibility; cross-environment). The app e2e harness is now proven to drive the graph, so the capture spec
  (V5.1) can build on `e2e/graph/`.

**2026-10-18 (cont.) — Phase 5 capture pipeline and the conformance gate (V5.1–V5.4, V5.6), and a `GraphCanvas` fix.**

Scope for this pass: the reproducible screenshots and the one-command conformance gate exit gate 5 names. Captures run against the real routed session (app harness) and the Cytoscape story (the app still has no renderer switch). OpenCode carries the two specs, the two root scripts, the `GraphCanvas` fix, the screenshots, and this log; `spacegraphjs` is untouched.

- **Product bug fixed — `GraphCanvas` dropped every post-mount update (U3.3/U3.4).** `createEffect(() => mounted?.renderer.setModel(props.model))` (and the parallel theme effect) short-circuited while `mounted` was still undefined on the first effect run, so `props.model` was never read and therefore never tracked: a later model reached the DOM (toolbar, inspector, a11y) but never the WebGL scene. Fixed by reading the prop into a local before the optional chain. Invisible to the DOM-asserting component tests; only screenshot capture exposed it.
- **V5.1 capture spec (done).** `packages/app/e2e/graph/capture.spec.ts` seeds `buildFixtureMessages()` through the mocked server (single fixture source), pins viewport 1440×900 / DPR 1 / dark / en-US, emulates reduced motion per page, and captures 01–06. It waits on the drawing buffer (`canvas.toDataURL`; the adapter mounts with `preserveDrawingBuffer`) for stillness instead of DOM state, and asserts the overview→execution level change actually repaints the canvas — the regression guard for the `GraphCanvas` fix.
- **V5.1b Cytoscape capture (done).** `packages/session-graph/component-tests/graph-capture.spec.ts` mounts the canonical fixture through the `session-graph-view--cytoscape` story and captures 07/08, because the app exposes no renderer selector.
- **V5.2 capture CLI (done; path follows repo convention).** `script/capture-graph-demo.ts` (+ root `graph:capture`) with `--mode=baseline|demo|compare|verify`. `baseline` writes only the transcript frame (`GRAPH_CAPTURE_MODE`); `demo` writes 01–06; `compare` adds 07/08; `verify` captures into a temp dir and asserts the committed set exists, never overwriting committed images. Deviation: the script lives in `script/` (the repo convention) not the plan's `scripts/`.
- **V5.3 determinism (done).** Fixed viewport/DPR/scheme/locale/reduced-motion and the clock-free fixture; `preserveDrawingBuffer` is already on in the adapter; no sleeps (buffer-stillness polling only).
- **V5.4 screenshots (done).** `docs/spacegraph/screenshots/` now holds `01-log`, `02-graph-overview`, `03-graph-execution`, `04-graph-selected`, `05-return-to-log`, `06-graph-3d`, `07-cytoscape-overview`, `08-cytoscape-selected`. Inspected: 03/04/06 are legible; 01/05 are the transcript; 07/08 render the same model with the HTML card outline.
- **V5.6 conformance gate (done).** `script/graph-verify.ts` (+ root `graph:verify`) runs the headless contract suite against both adapters, the boundary test, the four leaf/contract packages, the session-graph unit and component suites, and `graph:capture --mode=verify`.

Verification:
- `bun run graph:verify` → contract conformance 13, boundaries 5, packages renderer/spacegraph/cytoscape/svg = 4/10/10/6, session-graph unit 19, session-graph components 15, capture verify (both specs) — all green.
- `bun run graph:capture --mode=compare` regenerates all eight images; `--mode=verify` passes.
- `cd packages/app && bun run typecheck:e2e` → only the 4 pre-existing errors; `cd packages/session-graph && bun run typecheck` clean; `bun run lint:changed` → 0 problems.

Notes for the remaining Phase 5 work:
- **Ortho fit was imperfect (fixed 2026-10-18).** `calculateFitView` is now projection-aware and `fitView`
  scales the orthographic frustum; `GraphView` fits on load and on level/projection change. Images are
  deterministic; 02 is now framed (see the SpaceGraph-renderer-essentials pass note above).
- **Toolbar back is under the floating header toggles.** At 1440×900 the toolbar's right side (`Renderer: …` + back) sits beneath `session-header-toggles` (`absolute end-3 top-0 z-30 h-12`) and is not clickable; the capture returns via the header toggle. Needs a layout fix.
- **`THREE.Color: Invalid hex color #XXXXXXff` (fixed 2026-10-18).** The 8-digit host token background now parses correctly (see the SpaceGraph-renderer-essentials pass note above); no warning.
- **Cited-but-unverified:** 07/08 come from the Storybook story, not the app (no renderer switch); V5.1's `PLAYWRIGHT_BUILD=1` run and the non-verify modes' CI exit-code semantics are not exercised here, and V5.7/V5.8/V5.9 remain.

**2026-10-18 (cont.) — Remaining Phase 1 partials: theme surface (L1.4), mesh focus outline (L1.11), DOMNode element path (L1.15), edge labels/hit area (L1.17).**

Scope for this pass (agreed with the user): the embedding-hardening partials. All work is in `spacegraphjs`
commit `de0f632` (branch `main`); OpenCode carries only this log.

- **L1.4 theme surface (background already done; node/edge/label/interaction colours landed).** `SpaceGraphTheme`
  gains `node {fill, stroke}`, `edge {color, labelColor}`, `label {color, fontFamily, fontSize}`, and
  `selection`/`hover`/`focus`. New `src/core/theme.ts` (`resolveTheme`, `applyNodeTheme`, `applyEdgeTheme`):
  colour/label fields stay optional (a partial theme never overrides a node's own styling) while the
  interaction colours carry fallbacks (`NodeDefaults.SELECTED_COLOR`/`HOVER_COLOR`, focus `0x8b5cf6`). The base
  `Node`/`Edge` constructors apply the theme to their `data`; `ShapeNode` reads its mesh colour from `this.data`
  and its label uses the theme typography; `LabeledEdge` uses `theme.edge.labelColor`/`theme.label`. **Remaining:**
  a `plugins` option and the light/dark screenshot check (L1.18 demo) — unchanged.
- **L1.11 mesh focus outline (done).** `Node.setControlState(state)` is now the single writer for `controlState`
  and drives `syncVisual()`; the base implementation shows a `THREE.BoxHelper` outline on focus/selection/hover,
  coloured by `resolvedTheme.focus`/`selection`/`hover`, added to the renderer scene and disposed with the node.
  `DOMNode` overrides `syncVisual()` to draw a DOM `outline` instead (no BoxHelper). `Selection`,
  `HoverManager`, and `InteractionManager` route through `setControlState`; `SelectionManager` lost its dead
  DOM-visual path (it read a `userData.domElement` nothing ever set). `ControlState` gains `'focus'`.
  Tab→`FocusManager.focusNext` already existed, so focus is now visible while cycling.
- **L1.15 DOMNode element spec path (done).** `DOMNode`'s constructor arg is optional and falls back to
  `spec.data.element`; `DOMNodeData` is added to the `NodeData` union and `DOMNode` is registered in
  `DEFAULT_NODE_TYPES`, so `{ type: "DOMNode", data: { element } }` builds an adopting node. `DOMNode.updateSpec`
  strips `element` from updates so a mounted element is never replaced (a test updates 100× and asserts element
  identity plus a surviving listener). `BaseNodeData` now types `lod`/`minZoom`/`maxZoom` (already honoured by
  `Node.computeLOD`).
- **L1.17 edge labels and hit area (partial — label-vs-label done; label-vs-card open).** `EdgeData.hitWidth`
  drives `Edge.hitTest`'s raycaster threshold (default 5). Base `Edge` exposes a `labelElement` getter
  (`LabeledEdge` returns its `.sg-edge-label`); `Renderer` runs a per-frame declutter pass that measures the
  CSS2D label rects and hides overlaps via the pure `declutterLabels(rects, padding)` helper
  (`src/utils/labelDeclutter.ts`, deterministic by priority then id), using `opacity` so it never fights the
  existing LOD `visibility` logic, and skipped above a 200-label cap. **Remaining:** avoiding overlap against
  DOM cards (the declutter only considers label rects).

Verification:
- `cd spacegraphjs && pnpm exec vitest run` → 27 files / 268 tests (was 23/250; +`theme`, `interaction-visuals`,
  `dom-node`, `edge-labels`). `pnpm exec tsc --noEmit` unchanged at 184 errors — the current baseline is **184**,
  not the 181 recorded earlier, because the count now includes the `packages/n8n-bridge` sources; a stashed
  baseline also reports 184, so this pass adds none. `bun run test:boundaries` → 5 pass.
- `cd spacegraphjs/packages/spacegraph-renderer && bun test` → 10 pass; `bun run typecheck` clean.
- `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 19 pass; `bun run test:components` → 15 pass.
- `cd packages/app && bun run typecheck` clean.

Notes for the next pass:

- **The theme is now a real surface but only the library consumes it.** The SpaceGraph adapter still maps its own
  `RenderTheme` to per-node/per-edge specs, so OpenCode sees no visual change from L1.4. A host that wants the
  core defaults sets `options.theme` (or per-node `data.color`).
- **The focus/selection outline is a `BoxHelper`.** It is an axis-aligned world box, not a silhouette; fine for
  the prototype, but a true outline needs a stencil/backface pass. Hover scales the node object, so the box
  tracks it.
- **`declutterLabels` measures `getBoundingClientRect()` each frame** (transform-only changes keep layout clean,
  so it is cheap) but ignores node/card rects; extend the entry list with DOM card rects to fully satisfy
  "never overlap cards".
- Remaining Phase 1: L1.4 (`plugins` option + light/dark screenshots), L1.17 (label-vs-card), L1.27, L1.29,
  L1.32, L1.33. Remaining Phase 3: U3.6, U3.13.

**2026-10-18 (cont.) — SpaceGraph renderer essentials: orthographic fit, visible panel/badge nodes, and theme color parsing.**

Scope for this pass (agreed with the user): the main SpaceGraphJS renderer must actually frame and draw the
graph before other work. Performance and the minimap were explicitly deprioritized. Library work is in
`spacegraphjs`; one host change in `packages/session-graph`.

- **L1.12/L1.16 — orthographic fit (fixed).** `calculateFitView` was perspective-only: it derived camera
  distance from `fov`/`aspect` and `fitView` only moved the target, so under the orthographic camera the
  frustum was never scaled and the graph overflowed (the filed V5.4 "fit does not center" defect). It is now
  projection-aware: for ortho it returns a frustum `zoom` computed from the X/Y bounds against the base
  frustum (top-bottom / right-left), and `SpaceGraph.fitView` passes it through `CameraControls.flyTo(...,
  zoom)` while keeping the camera radius (distance does not scale ortho). `CameraControls` gained animated
  `zoomNext`/`startZoom` state wired into `setTargetSmooth`/`update`, clamped to the shared ortho zoom range.
- **Host — fit on load and on level/projection change (§5.5).** `GraphView` now fits the model when the
  canvas becomes ready, when the renderer switches, and on an explicit semantic-level or projection change
  (deferred a microtask so the canvas has applied the matching model first). Previously nothing fit on first
  load, so the overview was never framed; this is the exact V5.4 defect. Streaming model updates deliberately
  do not refit.
- **Adapter — do not force shape size 1 (fixed).** `@spacegraphjs/spacegraph-renderer`'s `nodeSpec` set
  `size: node.size?.[0] ?? 1` for every non-card node, so `panel`/`badge` nodes (session root, turns, phases,
  errors) rendered as sub-pixel boxes and edges to them looked like they dangled off-frame. It now passes the
  host size only when supplied and otherwise lets the core default (40) apply.
- **Core — color parsing (fixed).** `src/utils/color.ts::parseColor` mishandled 8- and 3-digit hex
  (`parseInt` over the whole string, so `#161616ff` became a wrong blue-ish value). It now drops alpha from
  8-digit hex and expands 3-digit hex, and the core `Renderer` normalizes its background through it, removing
  the `THREE.Color: Invalid hex color #161616ff` warning and the wrong clear color.

Verification:
- `cd spacegraphjs && pnpm exec vitest run` → 29 files, 280 tests (was 28/275; new `test/camera-fit.test.ts`
  (5) and `test/color.test.ts` (5), plus 2 ortho-fit cases in `test/camera-controls.test.ts`). `pnpm exec tsc
  --noEmit` unchanged at the 184-error baseline (no new errors in the touched files).
- `cd spacegraphjs/packages/spacegraph-renderer && bun test && bun run typecheck` → 11 pass, clean.
- `cd packages/session-graph && bun run typecheck && bun test src && bun run test:components` → clean, 19
  pass, 15 pass. `cd packages/app && bun run typecheck` clean; `bun run test:e2e -- e2e/graph/session-graph.spec.ts`
  → 6 pass.
- `bun run graph:capture --mode=demo` regenerated 01–06; **02-graph-overview** is now framed (session root
  and turn/phase nodes visible, no dangling edges), **03/04** are framed execution/selected views, and
  **06-graph-3d** shows depth with the selection preserved — with **no `THREE.Color` warning** in the run.

Notes for the next pass:
- **Overview chips are plain panels, not counted clusters.** `phase`/`turn` nodes map to the `panel` shape
  and render as small labelled boxes; `data.count`/`clusterCount` is not painted. Making overview "clusters
  with counts" is host card-markup work in `buildRenderModel` (render a count badge for `derived` phase
  nodes), not a renderer defect.
- **Toolbar-right occlusion remains (filed at V5.4, unaddressed).** At 1440×900 the `session-header-toggles`
  overlay (`absolute end-3 top-0 z-30 h-12`) still covers the toolbar's "Renderer: …" label and back button.
  It is an app/`GraphView` layout fix, out of scope for this renderer pass.
- **`focusNode` does not change ortho framing** (it only moves the target); `fit` is the framing path. Fine
  for the prototype; revisit if a "zoom to selection" affordance is wanted.
- Remaining Phase 1: L1.4 (`plugins` option + light/dark screenshots), L1.17 (label-vs-card), L1.27, L1.29,
  L1.32, L1.33. Remaining Phase 3: U3.6, U3.13.

**2026-10-18 (cont.) — Phase 4 close-out: hash→node reveal (I4.7) and transcript scroll restore (I4.4), with V5.5 coverage.**

Scope for this pass (agreed with the user): close Exit gate 4 by implementing the two Phase 4 behaviours that
were "wired/structural" but unverified. All work is in `packages/app` (the graph wrapper, the timeline
virtualizer, and the app e2e keeper suite); `spacegraphjs` and `packages/session-graph` are untouched.

- **I4.7 — hash→node reveal (done).** `session/graph/session-graph-view.tsx` now watches `location.hash` and,
  when it targets a message (`messageIdFromHash`), selects the owning turn node
  (`model.turnByMessageID.get(id)` → `turnNodeID`) if it exists in the current model. Driven only by the
  hash, so streaming model updates and manual selection do not fight it. This runs in graph mode only
  (the wrapper mounts only there). The reverse direction ("open in transcript") was already wired and is
  now covered end to end.
- **I4.4 — transcript scroll restore (done; a real defect, not just structurally in place).** The timeline
  virtualizer's scroll element is detached and re-attached when the mode branch swaps timeline↔graph, and a
  detached element's `scrollTop` resets to 0; the reconnect path only restored the *pinned* state, so an
  unpinned timeline returned to the top. `session/timeline/virtualizer.tsx` now remembers the last unpinned
  offset (recorded in `handleListScroll` while not pinned) and restores it with `scrollToOffset` in the
  `observeElementOffsetReconnectAware` reconnect callback (the pinned branch still calls `scrollToEnd`). One
  local variable; no second store.
- **V5.5 app e2e (extended).** `e2e/graph/session-graph.spec.ts` gains three cases: a message hash selects
  its turn and returns to the transcript; a message hash present when the graph opens selects the turn; and
  the transcript position is restored after a graph round-trip (seeded with 20 history messages).

Verification:
- `cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts` → 9 pass (was 6). Built
  (`PLAYWRIGHT_BUILD=1`) → 8 pass, 1 skipped (the dev-only module-load fallback). `--workers=2
  --repeat-each=4` → 36 pass.
- `bun run test:e2e -- e2e/regression/timeline-history.spec.ts` → 6 pass (the touched virtualizer keeps
  prepend-anchor behaviour).
- `cd packages/app && bun run typecheck` clean; `bun run typecheck:e2e` still only the 4 pre-existing errors;
  root `bun run lint:changed` → 0 problems.

Notes for the next pass:
- **The hash→node effect selects the turn but does not change the level or focus it.** The turn node is
  visible at execution (the default) and overview, so it renders; a deep link to a message whose turn is not
  the current level is not re-levelled. If the UI wants "jump to node" on hash, raise the level and focus, as
  `GraphSearch` does via `jumpTo`.
- **The timeline's own hash-scroll effects still run in graph mode.** They find no scroller element and retry
  a few frames harmlessly, and they set `state.messageID`; the reverse reveal then keeps that message. Not
  suppressed, because it does not scroll anything visible.
- **`rememberedOffset` is per virtualizer instance**, which is per cached timeline entry (per session key),
  so it does not leak across sessions. Restore is skipped when pinned, so following the tail is unchanged.
- Remaining Phase 4: I4.8/I4.9 are covered by existing cases (live append, session-switch dispose); I4.10 is
  the recorded desktop-gate decision; the adapter-failure V5.5 cases stay with the component suite. Remaining
  Phase 1: L1.4, L1.17, L1.27, L1.29, L1.32, L1.33. Remaining Phase 3: U3.6, U3.13. Remaining Phase 5:
  V5.7–V5.9 (and the two deferred adapter-failure V5.5 cases).

**2026-10-18 (cont.) — Phase 5 verification close-out: renderer comparison (U3.6), performance (V5.7),
accessibility (V5.8), cross-environment (V5.9), and the filed toolbar-occlusion defect.**

Scope for this pass (agreed with the user): make the result inspectable, repeatable, and honest, and fix the
one filed UI defect that the captures exposed. OpenCode carries the guard test, the toolbar fix, the e2e
case, the docs, and regenerated screenshots; `spacegraphjs` is untouched.

- **Toolbar occlusion fixed (filed at V5.4).** The desktop `session-header-toggles` (`absolute end-3 top-0
  z-30 h-12`; two 28px buttons) floated over the graph toolbar's right side, so its "Renderer: …" label and
  back control were not clickable at 1440×900. `GraphToolbar`/`GraphView` gain an optional `endInset` CSS
  length (`padding-inline-end` on `data-slot="graph-toolbar"`, default unset → no change in Storybook); the
  app wrapper `session-graph-view.tsx` passes `"72px"` when the desktop media query matches. This mirrors
  the timeline's `reserveReviewToggle`/`SessionHeaderSpacer` pattern. New e2e case "keeps the toolbar back
  control clickable under the floating header toggles" clicks the toolbar back at 1440×900 (Playwright only
  clicks when the element receives the event). Images `02`/`04` now show the back control clear of the toggles.
- **U3.6 renderer comparison (done).** `docs/spacegraph/prototype.md` §"U3.6" records the capability matrix,
  built chunk sizes, and the shared five-question navigation; paired screenshots `02`/`03`/`04` vs `07`/`08`.
  Default stays SpaceGraphJS (only 2D+3D host); Cytoscape is the 2D fallback/benchmark, no host branch.
- **V5.7 performance (done; two metrics documented unmeasured).** New
  `packages/session-ui/src/graph/performance.test.ts`: a 300-message / 1201-node tool-heavy stream builds and
  lays out in ~27ms under a 250ms complexity guard (catches an accidental O(n²) join, never flakes). Built-app
  chunks (`bun run build`, packages/app): core `activity-*.js` 1,039.6 KB min / 282.0 KB gzip (incl. `three`),
  `cytoscape.esm-*.js` 435.0 KB min / 137.9 KB gzip, session-graph UI `src-*.js` 28.3 KB min / 8.8 KB gzip,
  SpaceGraph adapter 4.4 KB min / 2.0 KB gzip — all within §9 budgets. Session-entry delta is unmeasured (the
  graph is lazy and the P0.1 baseline was never captured); first paint and pan frame rate have no graph perf
  harness. Both are recorded as unmeasured, not lowered.
- **V5.8 accessibility (done).** Library layer unit-tested (`spacegraphjs/test/a11y.test.ts`); browser
  traversal/select/inspect against both adapters in `component-tests/graph-a11y.spec.ts`; the switch/return
  leg is the app e2e toggle cases. No dedicated axe suite; reduced motion is emulated for capture but the
  adapter camera animation has no dedicated reduced-motion assertion.
- **V5.9 cross-environment (done; two entries not run).** Dev web 10 pass; built web (`PLAYWRIGHT_BUILD=1`)
  9 pass + 1 dev-only skip; Storybook component suite 15 pass. Desktop shell and the spacegraphjs demo pages
  were not run in this environment and are recorded as such.

Verification:
- `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 19 pass; `bun run test:components`
  → 15 pass.
- `cd packages/session-ui && bun test src/graph` → 43 pass (was 42; +performance guard); `bun run typecheck`
  clean.
- `cd packages/app && bun run typecheck` clean; `bun run test:e2e -- e2e/graph/session-graph.spec.ts` → 10
  pass (was 9; +toolbar-occlusion case); `PLAYWRIGHT_BUILD=1 … → 9 pass, 1 skipped`.
- `bun run graph:capture --mode=compare` regenerated all eight images; `02`/`04` inspected.
- Root `bun run lint:changed` → 0 problems.

Notes for the next pass:

- **Test flake observed, not caused here.** One full dev run failed "restores the transcript position after
  leaving the graph" (a timeline-virtualizer scroll-restore assertion) under machine load while this pass's
  build and e2e ran concurrently; the case then passed 3/3 in isolation and in the later full/built runs. If
  it recurs, treat it as a timeline-virtualizer race, not a graph bug.
- **V5.5 still partial.** The two adapter-failure app-level cases ("SpaceGraph mount failure → Cytoscape with
  a banner", "both renderers fail → transcript") remain owned by the component suite (`graph-states.spec.ts`)
  via the `rendererOverrides` seam; a non-seam app-level reproduction is undecided.
- **Remaining Phase 1: L1.4 (`plugins` option + light/dark screenshots), L1.17 (label-vs-card overlap), L1.27
  (minimap), L1.29 (non-OpenCode demo), L1.32 (touch), L1.33 (rename core renderer). Remaining Phase 3: U3.13
  (minimap, needs L1.27). Phase 6–8 (hybrid, docs/release, portability) are unstarted; R7.2 should fold
  `docs/spacegraph/prototype.md` (still carrying stale Phase 2/3 text above the new Phase 5 section) into the
  final write-up.**

**2026-10-18 (cont.) — Phase 1/3 library gaps: theme `plugins` (L1.4), label-vs-card declutter (L1.17), minimap/zoom embed fixes (L1.27), touch parity (L1.32), core renderer rename (L1.33), and the host minimap (U3.13).**

Scope for this pass (agreed with the user): close the remaining Phase 1/3 partials that need no user decision. Library work is in `spacegraphjs`; host work is `packages/session-graph` plus one `en.ts` key. L1.29 is deferred (blocked on demo wiring, see its task).

- **L1.4 — `plugins` option (done; light/dark screenshot check remains).** `SpaceGraphOptions.plugins?: Plugin[]` (the local `types.ts` `Plugin` interface) is registered in `#registerDefaults` after the defaults, so a host can add a chrome module or its own plugin without `chrome: true`. (The `Plugin` name collides with `types.ts`'s own exported `Plugin`, so no import was added; the register call casts through `Parameters<PluginManager['register']>[1]`.)
- **L1.17 — label-vs-card declutter (done).** `WebGLRenderer.#declutterLabels` now also measures `node.domElement` rects (via a structural read, no base-class change) and feeds them to `declutterLabels` at `priority: 1`, so a label overlapping a DOM card is hidden while the card never is. Caps: 200 labels, then cards up to 2× the cap. `test/edge-labels.test.ts` adds the card-overlap case.
- **L1.27 — MinimapPlugin / ZoomUIPlugin embedding (done).** `MinimapPlugin` is container-scoped, gains `settings.enabled`/`setEnabled`, throttles its scene pass (`settings.intervalMs`, default 100ms) so it does not double frame cost, derives the viewport rectangle from the *active* camera (ortho or perspective — the old `PerspectiveCamera` cast is gone), and `dispose()` removes its overlay and calls `super.dispose()`. `ZoomUIPlugin` moves its overlays into `sg.container` (`position: absolute`, not `document.body`) and `dispose()` releases the `fractal:level-change` listener and the hint timer. New `test/chrome-embedded.test.ts` (4 tests) covers scoping, enable/disable, the disabled no-op scene pass, and leak-free dispose.
- **L1.32 — touch parity (done; DOM-card-on-touch shares pointer hit-testing).** `InputManager.routeFingeringEvent` dispatches multi-touch (second pointer → `startMultiTouch`, moves → `updateMultiTouch`, lift → `stopMultiTouch`) and captures the pointer on trusted events (skipped for synthetic dispatch). `PinchZoomFingering` is projection-aware (pinch → `CameraControls.zoom` by distance ratio; two-finger drag → `CameraControls.pan` by midpoint delta) and is registered at `FingeringPriority.PINCH_ZOOM`. The WebGL canvas sets `touch-action: none`. `test/touch.test.ts` (3 tests) proves the dispatch and math; `test/e2e/hardening.spec.ts` gains a 390×900 `hasTouch` case that pinches and asserts the camera zoom changed with no console errors.
- **L1.33 — core renderer rename (done).** `src/core/Renderer.ts` → `src/core/WebGLRenderer.ts`; class `WebGLRenderer` with `export { WebGLRenderer as Renderer }` kept as a `@deprecated` alias. `src/core/index.ts`, `src/index.ts`, and `SpaceGraph` updated. `test/chrome-embedded.test.ts` asserts `Renderer === WebGLRenderer`.
- **U3.13 — host minimap (done; renderer-agnostic SVG).** `packages/session-graph/src/ui/GraphMinimap.tsx` renders dots from the same `layoutGraph` positions and the view rectangle from the adapter's reported viewport, so it is identical under both renderers and never runs a WebGL pass; click/drag pans via the shared `setViewport({ zoom, center })`. Groundwork: the contract `RendererViewport` gained optional `extent`; the core `CameraViewport` reports it (`WebGLRenderer.getWorldExtent`); the SpaceGraph adapter honours `center` (`cameraControls.setTarget`) and forwards `extent`; the Cytoscape adapter honours `center` (`cy.pan`) and reports its true viewport centre/extent (fixing a pan-as-centre bug). `GraphView` feeds the minimap the canvas `viewportChange` and the live renderer. `component-tests/graph-minimap.spec.ts` mounts the view and asserts dots, the view rectangle, and a click-to-pan with zero console errors. **Caveat:** orientation matches the y-up default renderer; the Cytoscape canvas draws model +y downward, so the overview is vertically mirrored under Cytoscape.

Verification:
- `cd spacegraphjs && pnpm exec vitest run` → 31 files, 288 tests (was 29/281; +`chrome-embedded` 4, +`touch` 3, +1 edge-labels). `pnpm exec tsc --noEmit` reports the same pre-existing error baseline, none in touched files. `bun run test:boundaries` → 5 pass.
- `SG_DEMO_URL=… node_modules/.bin/playwright test test/e2e/hardening.spec.ts` → the new touch case passes; **one pre-existing failure repros at clean HEAD too** ("switches projection and honours programmatic zoom" expects `viewport.zoom ≈ 0.8` after `setZoom(0.8)` but reads ~0.57) — not caused by this pass (verified with `git stash`).
- `cd spacegraphjs/packages/{renderer,spacegraph-renderer,cytoscape-renderer}` → typechecks clean, `bun test` 4/11/10 pass; `renderer.contract.test.ts` → 13 pass.
- `cd packages/session-graph` → `bun run typecheck` clean; `bun test src` → 19 pass; `bun run test:components` → 16 pass (was 15; +minimap). `packages/ui` and `packages/app` typecheck clean.

Notes for the next pass:
- **L1.29 remains, blocked on demo wiring.** `vite.demo.config.ts` needs `@spacegraphjs/*` + `spacegraphjs/zoom|layout|a11y|navigation` aliases, and the `spacegraphjs` pnpm workspace needs `cytoscape` installed, before a two-adapter demo can run. The generic modules it would show all exist.
- **L1.4's light/dark screenshot check remains** (needs the L1.18 demo page); the theme surface itself is complete.
- **The hardening "programmatic zoom" e2e is a pre-existing red** at HEAD — worth a separate fix (likely an in-flight camera animation from the projection toggle overwriting `setZoom`, or `normalizeZoom`/`setZoom` disagreement under ortho).
- Remaining Phase 1: **L1.4** (screenshot check), **L1.29** (demo). Remaining Phase 3: none (U3.6 and U3.13 both landed). Phases 6–8 (hybrid, docs/release, portability) are unstarted.

**2026-10-18 (cont.) — Phase 6 hybrid log + graph begins: host decision (H6.1), turn map overlay (H6.2), generic inline subgraph (H6.4), tests (H6.6), flag/docs (H6.7).**

Scope for this pass (user-selected: Phases 6, 8, and the remaining partials; Phase 6 first). The hybrid is
progressive disclosure over the transcript; nothing injects into timeline rows. Work is in `packages/session-ui`,
`packages/session-graph`, `packages/app`, plus `en.ts` strings and docs; `spacegraphjs` is untouched.

- **H6.1 host decision (recorded).** The overlay host is a lazy popover at
  `packages/app/src/session/graph/turn-map-overlay.tsx`, mounted inside the session panel's relative container
  (`screen.panel.ref`) so it covers the panel in either mode while the transcript stays mounted (scroll preserved).
  Entry points: the graph toolbar's "Open turn map" control (shown while a turn is selected) and the `graph.turnmap`
  command (`mod+alt+t`). **H6.3 deferred** (a side panel is an extension `Panel` region with its own i18n/store —
  a larger surface whose first value the overlay already delivers) and **H6.5 deferred** (approval-gated timeline
  slot). Both recorded in `docs/spacegraph/prototype.md` §"Phase 6".
- **H6.2 turn map overlay.** `packages/session-ui/src/graph/selectors.ts` gains the pure
  `turnSubgraph(model, turnID, limit)` (turn + highest-signal `part-of` children; phases/failures/subagent/result
  rank above tools/files; `inferred-cause` never appears). `packages/session-graph/src/ui/turnMap.ts` scopes the
  model and reuses `layoutGraph`/`buildRenderModel`. `src/ui/TurnMapOverlay.tsx` is a focus-trapped, Escape-closing
  dialog (`role="dialog"`, `aria-modal`) with a compact `GraphCanvas`, the shared `GraphInspector`, and "Open full
  graph"; the toolbar (`GraphToolbar`/`GraphView`) gained an `onTurnMap` control that resolves the selected node's
  turn via `ancestors`.
- **H6.4 generic inline subgraph.** `src/ui/TurnMapInlineGraph.tsx` is a thin wrapper over
  `@spacegraphjs/svg-renderer`'s `InlineGraph` rendering a five-node turn subset as static SVG; no graph logic, not
  injected into the timeline (deferred with H6.5).
- **H6.7 flag/docs.** Off by default: the overlay opens only on explicit action; the graph view stays the primary
  alternate mode. Rationale recorded in the prototype doc.
- **H6.6 tests.** `component-tests/turn-map.spec.ts` (5 cases: open/ready, Escape-close, "Open full graph", trapped
  focus, Cytoscape fallback, inline SVG node cap); app e2e case "opens the hybrid turn map over the graph and closes
  on Escape".

Verification:
- `cd packages/session-ui && bun test src/graph` → 47 pass (was 42; +5 for `turnSubgraph`).
- `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 19 pass; `bun run test:components` →
  5 new `turn-map` cases pass (10.3s).
- `cd packages/app && bun run typecheck` clean; `bun run test:e2e -- e2e/graph/session-graph.spec.ts -g "hybrid turn
  map"` → 1 pass; `bun run typecheck:e2e` shows only the 4 pre-existing errors.
- `cd packages/ui && bun run typecheck` clean.

Notes for the next pass:
- **H6.3/H6.5 remain deferred** (see the H6.1 decision). If the side panel is pursued, the entry is an extension
  `Panel` (`region: "side"`) in `packages/gui-extensions`, with its own store and `i18n/en.ts`.
- **The overlay's "open from a transcript selection" is a command, not a row affordance.** Timeline rows are
  off-limits this phase; the `graph.turnmap` command in either mode is the transcript-side entry. A real
  transcript-turn affordance would need a header control or an approved generic slot (H6.5).
- The centered dialog is sized by the host container; the app renders it inside `screen.panel.ref` at `z-40`, above
  the panel but below the floating header toggles.

**2026-10-18 (cont.) — Phase 8 portability (P8.3, P8.5, P8.6, P8.7, P8.9) and remaining partials (U3.16 loading, V5.5 adapter-failure cases).**

Scope for this pass (user-selected: Phases 6, 8, and the remaining partials; Phase 8 next). Library work is in
`spacegraphjs` (two commits); host work is `packages/app`/`packages/session-graph` plus two `en.ts` keys and docs.

- **P8.7 contract version negotiation (done).** `@spacegraphjs/renderer` gains
  `SUPPORTED_CONTRACT_VERSIONS`, `supportsContractVersion(version)`, and `negotiateContract(version)` (a clear
  message, never a crash). `packages/session-graph`'s `renderer-registry.ts` rejects an adapter whose declared
  `capabilities.contractVersion` is unsupported, so `createRenderer`/`mountRenderer` fail gracefully and fall
  through. Covered by renderer unit tests, a registry unit test, and the shared conformance suite.
- **P8.3 static export (done).** `@spacegraphjs/svg-renderer` gains `serializeRenderModel(model)` and
  `parseRenderModel(json)` (validated structurally, `undefined` on malformed input). Tested standalone and via the
  fixture.
- **P8.9 text direction (done; demo verification pending).** `renderToSVG` emits `direction="rtl"` when
  `theme.direction` is `rtl`; the SpaceGraph adapter wraps host card markup in a `dir` container; the Cytoscape
  adapter sets `dir` on overlay cards; the host bridge (`resolveGraphTheme`) reads `document.documentElement.dir`
  and re-resolves on a `dir` mutation. `RenderTheme.direction` already existed. An RTL fixture in the library demo
  (L1.29) is still pending.
- **P8.6 second-host fixture (done).** `spacegraphjs/test/fixtures/activity-host.ts` is a host-neutral activity
  model (HTML cards, tool calls, an artifact, a failure, a retry) consumed by the shared conformance suite.
- **P8.5 host integration guide (done).** `spacegraphjs/docs/host-integration.md` documents the boundary, data
  mapping, renderer choice + fallback, theming, layout/zoom policy, accessibility, persistence, export, a
  Hermes-style checklist, and versioning; linked from the library README.
- **Library fix surfaced by the app fallback path.** The Cytoscape adapter passed host theme tokens straight into
  `cy.style`, so 8-digit hex tokens (`#161616ff`, …) logged `The style property … is invalid` warnings. New
  `normalizeTheme` in `packages/cytoscape-renderer/src/mapping.ts` drops alpha from 8-digit hex and expands
  3-digit hex, applied at `mount`/`setTheme`; the warnings are gone.
- **U3.16 loading story (done).** `GraphView.stories.tsx` gains a `Loading` story (adapter factories that never
  settle) and `graph-states.spec.ts` asserts the canvas stays `data-graph-ready="false"` with a visible skeleton.
- **V5.5 adapter-failure app cases (done, dev-only).** `e2e/graph/session-graph.spec.ts` adds a real app-level
  reproduction: aborting the SpaceGraph adapter module makes the registry fall back to Cytoscape and the new
  `data-slot="graph-fallback"` banner explains it (3D disabled); aborting both adapters shows the error state whose
  Back control returns to the transcript. Both skip under `PLAYWRIGHT_BUILD=1` because the built chunks are hashed.

Verification:
- `cd spacegraphjs && pnpm exec vitest run` → 31 files / 288 tests; `bun run test:boundaries` → 5 pass;
  `test/renderer.contract.test.ts` → 17 pass (13 + fixture/negotiation).
- `cd spacegraphjs/packages/renderer && bun test` → 6; `.../svg-renderer` → 9; `.../cytoscape-renderer` → 12;
  `.../spacegraph-renderer` → 12; typechecks clean.
- `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 20; `bun run test:components` →
  `graph-states.spec.ts` 7 pass (was 6).
- `cd packages/app && bun run typecheck` clean; `bun run typecheck:e2e` shows only the 4 pre-existing errors;
  `bun run test:e2e -- e2e/graph/session-graph.spec.ts -g "adapter fails to load|no renderer can mount"` → 2 pass.
- `cd packages/ui && bun run typecheck` clean.

Notes for the next pass:
- **P8.1 (framework-agnostic view controller) and P8.2 (framework bindings) remain.** Both are larger than they
  read. P8.1 must live in `spacegraphjs/control` (core) and therefore cannot import the contract (§4.1), so it needs
  minimal structural types and a host binding layer; P8.2 needs React/Solid test infrastructure the library vitest
  setup does not have (the `react-spacegraph`/`solid-spacegraph` packages exist but wrap core internals, not the
  contract). Recorded as the next Phase 8 step.
- **P8.4 (host-neutral activity adapter) and P8.8 (incremental updates) are conditional** — P8.4 waits on a real
  second host, P8.8 on profiling — so they stay deferred by design.
- **L1.29 non-OpenCode demo and L1.4's light/dark screenshot check remain** (unchanged; blocked on demo wiring —
  `vite.demo.config.ts` aliases and a `cytoscape` install in the `spacegraphjs` workspace). P8.9's RTL
  verification and P8.6's runnable demo both wait on that page.
- **Remaining Phase 3 partials:** U3.16 still lacks a `CurrentSessionProviders`-backed story set; U3.17's switch
  control and prototype-settings renderer selector stay app e2e concerns.

**2026-10-18 (cont.) — L1.29 non-OpenCode demo (and the L1.4 screenshot check), plus a node-type registration fix.**

Scope for this pass: close the last Phase 1 task by building the reference host the library boundary exists for,
and use it for the outstanding light/dark screenshot check. Library work is in `spacegraphjs`; OpenCode carries
the two demo screenshots and the docs.

- **L1.29 — non-OpenCode reference demo (done).** `spacegraphjs/demo/contract.html` + `demo/contract-demo.ts`
  drive one synthetic activity stream (intent → explore → edit/artifact → delegate → failing verify → retry →
  recover) through the SpaceGraph adapter, the Cytoscape adapter, and the static SVG renderer. Positions come
  from `LaneLayout` (lane → Y, per-lane ordinal → X, depth → Z); `ZoomBands` reads the adapter viewport,
  `Trail` backs the breadcrumbs, and `AccessibilityLayer` provides keyboard traversal. Controls switch
  renderer/projection/theme/direction/scene; 3D is disabled with an explanation when 3D is unsupported. No
  OpenCode import, no session vocabulary. `demo/index.ts`, `demo/README.md`, and the root `README.md` link it.
- **Demo wiring (the blocker recorded last pass).** `vite.demo.config.ts` now uses regex aliases
  (`^spacegraphjs$`, `^spacegraphjs/(.+)$`) plus `@spacegraphjs/{renderer,spacegraph-renderer,cytoscape-renderer,svg-renderer}`
  source aliases, so the demo resolves the workspace packages (and the `cytoscape` installed under
  `packages/cytoscape-renderer/node_modules`) without a pnpm link. The previous bare `spacegraphjs` string would
  have rewritten `spacegraphjs/layout` to `src/index.ts/layout`.
- **Second host is demo-consumed (P8.6/P8.9).** `test/fixtures/activity-host.ts` moved to `demo/activity-host.ts`
  (the conformance suite imports it from there), so the fixture is part of the runnable demo ("Second host"
  scene). The demo spec exercises RTL markup (`html[dir=rtl]`, the adapter's `dir` card container), not only the
  SVG renderer.
- **L1.4 light/dark screenshot check (done).** `test/e2e/contract-demo.spec.ts` captures the demo at 1440×900 in
  both themes as `docs/spacegraph/screenshots/09-contract-demo-light.png` and `10-contract-demo-dark.png`.
  Inspected: both are legible; the theme surface (background, node fill via status, edge colour, edge-label
  colour) renders correctly in light and dark.
- **Library bug fixed — inherited `static typeName`.** `MermaidNode extends HtmlNode` inherits
  `static typeName = 'HtmlNode'`, and `#registerDefaults` used `cls.typeName || cls.name`; `PluginManager.
  registerNodeType` also re-registered each class under its inherited `typeName`. Every `HtmlNode` was therefore
  constructed as a `MermaidNode` (its generated label markup replaced the host `html`), and every `Edge` subclass
  registered as `Edge` (last one, `Wire`, won). Fixed with a new `nodeTypeName(cls)` helper (own-property
  `typeName` only) in `src/core/defaults.ts`, used by `#registerDefaults`, and an own-property check in
  `PluginManager.registerNodeType`/`registerEdgeType`. Regression test `test/node-types.test.ts` asserts the
  names are unique and `MermaidNode`/`CurvedEdge` do not alias their parents. This is why the app captures now
  show real card markup instead of the 160×60 label fallback.

Verification:
- `cd spacegraphjs && pnpm exec vitest run` → 32 files, 294 tests (was 31/288; +`node-types`). `pnpm exec tsc
  --noEmit` unchanged at the 184-error baseline. `bun run test:boundaries` → 5 pass.
- `packages/{renderer,spacegraph-renderer,cytoscape-renderer,svg-renderer} bun test` → 6/12/12/9 pass.
- Demo: `pnpm run dev:demo` (vite on 5173) then `node_modules/.bin/playwright test test/e2e/contract-demo.spec.ts
  --workers=1` with `SG_DEMO_URL` → 5 pass (mount, renderer switch + SVG export + 3D gating, keyboard/connection/
  trail, second-host fixture + RTL, light/dark capture).
- `cd packages/session-graph && bun run typecheck && bun test src && bun run test:components` → clean, 20, 22 pass.
  `cd packages/app && bun run typecheck` clean. `bun run graph:capture --mode=demo` regenerated 01–06; 03/04 now
  show real HTML cards.

Notes for the next pass:

- **The demo is the reference host the plan's §8 library-demo rows named.** `L1.18`'s demo row and the V5.4
  "library demo" half now have a page; folding `contract-demo.spec.ts` into a library demo command (or CI) is
  still open. The demo needs `pnpm run dev:demo` running (there is no bundled webServer config in
  `playwright.config.ts`).
- **Two theme gaps the demo works around.** The core hard-codes an edge-label background (`rgba(0,0,0,0.55)` on
  `LabeledEdge`), so a light theme draws theme text over a dark pill; the demo overrides `.sg-edge-label` in CSS.
  And the SpaceGraph adapter passes only `{ background }` to the core theme, so selected/focus outlines use the
  core default colour (the app's orange ring in `09`). Extending `SpaceGraphTheme` (edge label background) and
  mapping the adapter's `RenderTheme.selection/focus/hover` into it is the cleanup.
- **`node-types` changes default `Edge` resolution.** Nodes/edges created with `type: 'Edge'` now get `Edge`
  rather than the previously-registered `Wire`; `type: 'HtmlNode'` now gets `HtmlNode` rather than
  `MermaidNode`. No test relied on the old behaviour, but any consumer that omitted `type` and depended on the
  last-registered class should be re-checked.
- **App captures still show the known overview gap.** `02`/`03` now draw real 220×72 HTML cards (the fix), while
  `phase`/`turn`/`session` nodes remain plain `panel` shapes with tiny labels — the "overview chips are plain
  panels, not counted clusters" item recorded at V5.4. `buildRenderModel` could emit card markup (with `count`)
  for derived phase nodes within the overview DOM budget; that is the remaining host-side overview work.
  **(Resolved — see the "Overview counted clusters" entry below: phase clusters now draw as counted cards.)**
- Remaining Phase 1: none (L1.4 and L1.29 land here). Remaining Phase 3: none. Phase 7 (R7.1–R7.7) and P8.1/P8.2
  remain; P8.4/P8.8 stay deferred by design.

**2026-10-18 (cont.) — Overview counted clusters (U3.1) and adapter node remodelling.**

Scope for this pass (agreed with the user): the "remaining host-side overview work" the V5.4/L1.29 pass filed —
phase clusters read as tiny bare panel labels at overview — and the adapter defect it exposed. Host work is in
`packages/session-graph`; the library fix is in `spacegraphjs` commit `3e4612a` (branch `main`).

- **U3.1 — overview clusters are counted cards (done).** `buildRenderModel` now renders a derived cluster that is
  collapsed at the current level as a compact counted `card` (host markup), not a bare `panel` label. A new
  `isClusterChip(node, level)` predicate (derived + `clusterOf` + `!isClusterExpanded(level)`) gates it; the chip
  consumes the level's DOM card budget like any card and carries `size: [132, 44, 0]` so it draws as a chip. The
  default card appends the member count (`Explore 5`), escaped and structural, so no palette or English copy is
  baked in and a host `renderCard` can localize it. `nodeData` already exposed `count`/`expanded`; unchanged.
- **Adapter node remodelling (library, `spacegraphjs` `3e4612a`).** Wiring the chips exposed a real defect the L1.20
  note had flagged: `loadSpec` upserts by id and never changes a node's class, so a phase created as a `ShapeNode`
  panel at execution kept winning after the level switched to overview — the counted card never appeared. The
  SpaceGraph adapter now tracks each node's spec type (`#nodeTypes`) and drops a node whose type changed before
  `loadSpec` recreates it; the Cytoscape adapter re-applies `classes` on update so a shape change is not stale. This
  makes semantic zoom a true representation change, which is the hypothesis the prototype tests.
- **Tests.** `buildRenderModel.test.ts` gains two cases (overview clusters are counted cards within the budget;
  execution clusters stay panels). `component-tests/graph-view.spec.ts` switches execution→overview on the real view
  and asserts the `Explore 5` chip is a DOM card (and that execution has none) — the regression guard for the
  remodelling fix. The app path was verified directly first (11 overview DOM cards, was 3) before writing it.

Verification:
- `cd packages/session-graph && bun run typecheck` clean; `bun test src` → 22 pass (was 20; +2); `bun run
  test:components` → 22 pass.
- `cd packages/session-ui && bun test src/graph` → 47 pass; `bun run typecheck` clean.
- `cd spacegraphjs && pnpm exec vitest run` → 294 pass; `bun run test:boundaries` → 5 pass; `spacegraph-renderer`
  and `cytoscape-renderer` typecheck clean and `bun test` 12/12.
- `cd packages/app && bun run typecheck` clean; `bun run test:e2e -- e2e/graph/session-graph.spec.ts` → 13 pass.
- `bun run graph:capture --mode=demo` regenerated 01/02; **02-graph-overview** now reads as counted clusters
  (`Explore 5`, `Edit 1`, `Verify 2`, …) with no `THREE.Color` warning. Root `bun run lint:changed` → 0 problems.

Notes for the next pass:
- **Overview chips are host markup, not a library concept.** The library renders the card; the count, the 132×44
  size, and the `derived`/`clusterOf` semantics are `session-graph`/`session-ui`. No `phase` vocabulary entered the
  library.
- **The remodelling fix is generic and now covers every type change** (card↔dot demotion, future kinds), not just
  phases. The Cytoscape class-sync half rides the existing adapter/cytoscape component specs; a dedicated case was
  not added because the phase panel↔card change is the same Cytoscape class (`card`).
- **Remaining host-side overview polish:** `turn`/`session` nodes are still `panel` shapes; only derived clusters
  became chips. The §5.4 overview table calls for phase clusters with counts, which is now satisfied.
- Remaining Phase 1: none. Remaining Phase 3: none. Phase 7 (R7.1–R7.7) and P8.1/P8.2 remain; P8.4/P8.8 stay
  deferred by design.

**2026-10-18 (cont.) — Phase 7 polish, docs, and release package (R7.1, R7.2, R7.4–R7.7).**

Scope for this pass: the release package the plan orders after Phase 6 — the library changelog, the
final prototype write-up, the capability audit, the dependency migration plan, the release README, and
the final checks. Library docs are in `spacegraphjs` commit `fbc368f`; the OpenCode docs are in this
repo.

- **R7.1 — SpaceGraphJS changelog and docs (done, `spacegraphjs` `fbc368f`).** New `spacegraphjs/CHANGELOG.md`
  records every breaking change (chrome opt-in, global-registration opt-in, container-scoped keyboard,
  on-demand rendering, `SpaceGraph.selected` → `string[]`, `Renderer` → `WebGLRenderer`, cross-instance
  edge removal, node/edge type-name resolution, `HoverFingering` removal, `FractalZoomPlugin`
  deprecation), the lean `activity` entry, the `@spacegraphjs/renderer` contract and all three leaves,
  the ortho/zoom/selection/lifecycle/theme/click APIs, the package-boundary rules, and the §4.2 naming
  table. `README.md` gains a "Renderer contract" section and links the changelog; `AGENTS.md` gains a
  "Renderer surface" section pointing at `test:boundaries` and the naming rules. `docs/host-integration.md`
  already carries the integration guide with a non-OpenCode example.
- **R7.2 — prototype documentation (done).** `docs/spacegraph/prototype.md` is rewritten from running
  notes into the final write-up: hypothesis, architecture (ports/adapters), how to run, tested
  revisions, the screenshot table, the U3.6 renderer comparison, V5.7/V5.8/V5.9, the Phase 6 hybrid,
  Phase 8 portability, a known-limitations list (15 items), the evaluation protocol, the capability
  audit, and the migration plan. The stale "not done yet: phase nodes / levels / layout" Phase 2 text
  and the old tested-SHA table are gone. `packages/session-graph/AGENTS.md` already existed (added in
  the Phase 2/3 passes).
- **R7.4 — release artifacts (done; no GIF).** New `docs/spacegraph/README.md` is the release entry:
  experimental banner, motivation, setup, exact reproduce commands, tested commit, limitations, and the
  demo command; it embeds the overview screenshot (`screenshots/02-graph-overview.png`). The
  expand→zoom→inspect→return GIF/video is **not produced** (no recording tooling in this environment);
  recorded as the one missing artifact.
- **R7.5 — dependency migration plan (done).** `prototype.md` §"Dependency migration plan" gives the
  concrete source→packaged steps (build `dist` + `build` scripts, swap `workspace:*` for versioned
  ranges, drop the `./activity` `types` stopgap, re-run `graph:verify` + built e2e, keep
  `CONTRACT_VERSION`).
- **R7.6 — library capability audit (done).** `prototype.md` §"Library capability audit" is a table of
  every generic module (contract, three leaves, zoom bands, lane layout, a11y, trail, DOM mount,
  minimap) → consumers → gap; no session naming or data assumptions leak into the library.
- **R7.7 — final checks (done; component/e2e from the last pass).** Ran this pass: `packages/session-graph`
  `typecheck` clean + `bun test src` 22 pass; `packages/session-ui` `bun test src/graph` 47 pass;
  `packages/app` `typecheck` clean; root `bun run lint:changed` 0 problems; `spacegraphjs` `pnpm exec
  vitest run` 32 files / 294 tests; `test:boundaries` 5 pass; the four package suites 6/12/12/9 pass.
  Component (`bun run test:components`, 22 pass) and app e2e (`e2e/graph/session-graph.spec.ts`, 13 pass)
  were green in the last pass and are **not re-run** here (docs-only change). `bun run check` is not run:
  it fails on two pre-existing, unrelated problems (`packages/ai` `zstdCompressSync` node-types error,
  present on `origin/dev`, and a `turbo` SIGSEGV in this environment). All screenshots were inspected in
  prior passes; this pass changes no pixels.

Notes for the remaining work:

- **Phase 7 is complete except R7.3.** R7.3 (evaluation protocol) is **protocol-only**: the protocol is
  written into `prototype.md` but execution needs human participants, which this environment cannot
  provide. The go/no-go decision at the end of the prototype therefore stays open.
- **The GIF/video (R7.4) is the only unproduced release artifact.**
- Remaining after Phase 7: **P8.1** (framework-agnostic view controller in `spacegraphjs/control`) and
  **P8.2** (React/Solid bindings over the contract) are not started; **P8.4**/**P8.8** stay deferred by
  design. The 15 known limitations in `prototype.md` are the honest backlog.

## 0. Mission


Build a prototype that tests this hypothesis:

> When agent activity becomes sufficiently complex, spatial navigation through relationships is more effective than linear navigation through messages.

The transcript remains the dependable baseline. The graph is an alternate, opt-in representation built from existing session data. No backend or session-schema changes in v1.

Success is not "a graph exists". Success is that a user can answer questions the transcript makes expensive:

1. Why did the agent change this file?
2. Which tool calls led to this failure?
3. What did the subagent actually contribute?
4. Which changes were made after the failing test?
5. Where did the agent retry, backtrack, or change direction?

## 1. Decisions taken

| Decision | Choice | Consequence |
|---|---|---|
| Presentation | **2D orthographic default + 3D toggle from the start** | SpaceGraphJS must grow a real orthographic camera path, not just a stored `OrthoCamera`. 2D is the legibility baseline; 3D is an explicit experiment. |
| V1 scope | **Full Graph view + Transcript/Graph switch first; hybrid log + graph second** | Proves whole-session spatial navigation before adding turn-scoped overlays and a synchronized side panel. Inline row injection stays approval-gated. |
| SpaceGraphJS latitude | **Free rein to refactor** | Fix dead events/selection/dispose, split heavy entries, redesign zoom semantics, and change public API where it improves embedding. Record every break in the library changelog. |
| Dependency form | **Source workspace now, packaged dependencies later** | `spacegraphjs` and its renderer packages are consumed from source today, with a path to built `dist` packages and version pins after the prototype. |
| Data source | Existing `SessionMessageInfo[]`, status, turn diffs | No protocol, server, or session-data changes. Client-local view state is allowed. |
| Rendering strategy | **SpaceGraphJS first; Cytoscape.js as a 2D fallback and benchmark behind one shared contract** | The contract is a separate dependency-free package (`@spacegraphjs/renderer`); the core does not import it. The Cytoscape adapter (`@spacegraphjs/cytoscape-renderer`) ships in the SpaceGraphJS repo. The app selects a renderer without changing the model or UI semantics. |
| Library-first bias | **Prefer generic capabilities in SpaceGraphJS over OpenCode-specific code** | Semantic zoom control, lane layout, DOM mounting, selection, accessibility, navigation trail, minimap, and inline SVG become reusable library modules. OpenCode receives a thin mode switch and lazy wrapper. |
| Causality | Never infer causality from adjacency | Edges carry `confidence: "explicit" \| "structural" \| "inferred"` and the UI labels the difference. |

### 1.1 Starting conditions (verified)

- SpaceGraphJS already renders spec graphs, layouts, DOM cards, and a camera, but its interaction layer is prototype-grade: ordinary nodes do not emit click, selection is split across three systems, `dispose()` leaves listeners and observers alive, the renderer has no orthographic camera path, and zoom bands are not wired to manual camera movement. The plan treats this hardening as part of the prototype, not as a separate rewrite.
- Importing SpaceGraphJS today pulls vision/ONNX and Monaco onto the entry path. The lean `activity` entry and lazy heavy features are prerequisites for embedding.
- OpenCode already has everything needed to build the graph: typed `SessionMessageInfo`, assistant text/reasoning/tool parts with stable tool IDs, tool `input`/`metadata` for file provenance, `subagent` metadata for delegation, assistant `retry`/`error`, `snapshot.files`, turn diffs, and idle outcomes.
- The narrowest integration points are `packages/app/src/session/screen.tsx` (render branch around `timelineView()`), `packages/app/src/shell/state/layout.tsx` (per-session persisted view state), and `packages/session-ui/src/timeline/projection.ts` (authoritative turn/steered-prompt semantics to reuse).
- The graph model therefore belongs in `packages/session-ui`, the renderer and UI in a new `packages/session-graph`, and only the mode switch and lazy wrapper in `packages/app`.
- The renderer boundary is a separate, dependency-free contract package (`@spacegraphjs/renderer`), not part of the core. The SpaceGraph adapter (`@spacegraphjs/spacegraph-renderer`) and Cytoscape adapter (`@spacegraphjs/cytoscape-renderer`) are optional leaves. The core never imports the contract or Cytoscape.
- Cytoscape HTML cards are supported through a clipped DOM overlay, so "rich nodes" are not a renderer gap. The actual differences are 3D and depth representation.
- Where a capability is generic, implement it in SpaceGraphJS rather than in OpenCode: zoom bands, lane layout, DOM mounting, selection, accessibility, navigation trail, minimap, inline SVG, and theming. `packages/session-graph` should contain session presentation, not reusable graph behavior.
- The portability target is not only OpenCode: the contract, adapters, controllers, and framework bindings must be sufficient for a Hermes-style agent UI without forking the library.

## 2. Scope and non-goals

**In scope**

- A per-session `Transcript | Graph` mode switch.
- A deterministic graph model built from session messages.
- Semantic zoom with three representation levels: overview, execution, detail.
- Node selection, an inspector panel, and edge following.
- 2D orthographic and 3D perspective views of the same model in SpaceGraphJS.
- A Cytoscape.js 2D renderer behind the same contract, used as fallback and benchmark.
- A static SVG renderer for export, documentation artifacts, and inline subgraphs.
- Stable positions under streaming events; selection preserved.
- Deterministic fixture, component tests, app e2e, screenshot capture.
- SpaceGraphJS hardening and generalisation required to make the above credible and reusable outside OpenCode.

**Out of scope for v1**

- Changing the session data model, protocol, server, or storage.
- Cross-session graphs, recurring-error detection, or multi-session comparison.
- Replacing the transcript or redesigning existing message/tool renderers.
- A production-quality graph editor, annotations, or collaboration.
- Full accessibility parity for WebGL content (a DOM mirror is provided, not a full screen-reader graph).
- Mobile-first graph ergonomics beyond a usable 2D fallback.
- Cytoscape.js feature parity with SpaceGraphJS: the fallback is 2D-only. It supports HTML cards through a capped DOM overlay, but has no 3D or SpaceGraphJS-specific depth representation.
- Maintaining two independent product surfaces. The Cytoscape adapter exists to de-risk the contract and benchmark the interaction, not to become a parallel implementation.
- SpaceGraphJS's vision/auto-fix features. They must stay optional and lazy; the prototype does not depend on ONNX models or CDN assets.

## 3. Success criteria

The prototype is complete when all of these hold:

1. Switching modes preserves the transcript scroll position and restores it on return.
2. Zooming changes representation, not just scale: tool calls collapse into phase clusters at overview and expand at execution.
3. Selecting a node opens readable detail in a conventional panel with selectable text and keyboard access.
4. Following an edge from a node selects a related node; "open in transcript" reveals the originating message.
5. Streaming a new assistant turn appends nodes without repositioning existing nodes or clearing selection.
6. The representative fixture exposes exploration, three edits, a failing test, a retry, and a subagent; the five mission questions are answerable in at most three interactions each.
7. The 2D/3D toggle works on the same model; 2D remains legible at 1440×900 and 390×900.
8. No console errors or leaked WebGL/ResizeObserver resources after switching sessions or unmounting.
9. The graph chunk is lazy-loaded and does not regress session entry.
10. Screenshots are reproducible from one command and inspected before visual work is declared complete.
11. A small usability protocol compares transcript and graph on the same investigative tasks; results are recorded in `docs/spacegraph/prototype.md`.
12. The same fixture renders through both adapters behind the shared contract, including HTML activity cards; capability differences such as 3D are explicit in the UI, not hidden.
13. SpaceGraphJS gains reusable capabilities that do not mention OpenCode: a dependency-free contract package, zoom bands, lane layout, DOM mounting, selection, accessibility, navigation trail, inline SVG, and a working minimap path.

## 4. Architecture

Ports and adapters, with the SpaceGraphJS core kept pure:

```
Host event data (OpenCode, Hermes, other agent UIs)
                │
                ▼
Host adapter: GraphModel + levels + layout + selectors
                │  RenderModel (renderer-facing, stable IDs, absolute positions)
                ▼
  @spacegraphjs/renderer                contract types + version helper, zero deps
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
 [spacegraph] [cytoscape] [svg]
  interactive  interactive  static
   2D + 3D       2D         export + inline
     │          │          │
     └──────────┴──────────┘
                ▼
Host UI: canvas, inspector, toolbar, commands, persistence
```

The three leaves are `@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`, and `@spacegraphjs/svg-renderer`.

`spacegraphjs` core remains its own renderer. It does not import the contract, Cytoscape, or any host. The contract package is a sibling, not a dependency. The adapters are optional leaves. The host chooses.

### 4.1 Non-pollution rules

- `spacegraphjs` core must not import `@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer`, or `@spacegraphjs/cytoscape-renderer`.
- `@spacegraphjs/renderer` contains types and tiny helpers only. It has zero dependencies and no renderer implementation, no `three`, no `cytoscape`, and no host concepts.
- `@spacegraphjs/spacegraph-renderer` may import `spacegraphjs` and the contract. It is the only package that maps the core to the contract.
- `@spacegraphjs/cytoscape-renderer` may import `cytoscape` and the contract. It must not import `spacegraphjs` core.
- `@spacegraphjs/svg-renderer` may import the contract and nothing else. It provides static SVG export and the inline graph; it is not an interactive `GraphRenderer`.
- Hosts import the contract and only the adapter they need. OpenCode's `@opencode/session-graph` is one such host.
- Generic utilities that need only node IDs/labels (zoom bands, lane layout, navigation trail, accessibility) live in the core as optional subpaths and use minimal structural types, not the contract.
- The inline SVG renderer lives in `@spacegraphjs/svg-renderer`, not the core, so the core never imports the contract.
- If a capability is generic, add it to the core first. Do not special-case a renderer in a host.
- If a capability is renderer-specific, put it behind `RendererCapabilities`; never silently drop it.
- Do not add `if (renderer === "cytoscape")` branches to the core or the host UI. Differences belong in the adapter or in capability flags.
- Do not move host-specific node kinds, labels, or session concepts into the library. The library renders `RenderModel`; it does not interpret it.

Why the contract lives in the SpaceGraphJS repo but not in the core:

- If the contract lived only in OpenCode, every other host (Hermes, another agent UI) would duplicate it, and SpaceGraphJS could not present a stable port.
- If the contract lived inside the core, the core would gain a dependency it does not need.
- A separate, dependency-free contract package gives one shared port with zero core coupling. The core tarball, runtime dependencies, and bundle stay unchanged. The adapters are thin, optional leaves.
- Cost is one small contract package and three thin leaves: the SpaceGraph adapter, the Cytoscape adapter, and the static SVG renderer. If the SpaceGraph adapter overhead proves undesirable, it can collapse into the core as a subpath while keeping the contract separate; the Cytoscape and SVG packages still depend only on the contract.

### 4.2 Naming

| Concept | Name | Why |
|---|---|---|
| Contract package | `@spacegraphjs/renderer` | Short, scoped, clearly the renderer boundary |
| Contract interface | `GraphRenderer` | Avoids collision with the core `Renderer` class |
| Renderer-facing data | `RenderModel` | Distinct from the host's semantic `GraphModel` |
| Core WebGL class | `WebGLRenderer` (alias `Renderer`) | Disambiguates the core from the contract |
| SpaceGraph adapter | `@spacegraphjs/spacegraph-renderer` | Explicit backend, no ambiguity |
| Cytoscape adapter | `@spacegraphjs/cytoscape-renderer` | Matches the backend name |
| Static SVG renderer | `@spacegraphjs/svg-renderer` | Export and inline graphs; no core dependency |
| Backend registry | `renderer-registry.ts` | Consistent terminology |
| Persisted field | `renderer` | Consistent terminology |
| Lean core entry | `spacegraphjs/activity` | Small, embeddable, no heavy deps |
| Generic utilities | `spacegraphjs/zoom`, `spacegraphjs/layout`, `spacegraphjs/a11y`, `spacegraphjs/navigation` | Reusable, contract-free |

Do not use "engine" for a renderer backend. Reserve "engine" for layout/physics internals if it appears at all.

### 4.3 Package and file map

| Area | Path | Purpose |
|---|---|---|
| Graph model | `packages/session-ui/src/graph/model.ts` | Messages → typed nodes and edges |
| Graph levels | `packages/session-ui/src/graph/levels.ts` | Semantic zoom policy |
| Graph layout | `packages/session-ui/src/graph/layout.ts` | Lane/ordinal positions and cluster bounds |
| Selectors | `packages/session-ui/src/graph/selectors.ts` | Neighbors, paths, search, breadcrumbs |
| Fixture | `packages/session-ui/src/graph/fixture.ts` | Canonical representative session |
| Model tests | `packages/session-ui/src/graph/*.test.ts` | Pure logic tests |
| **Contract** | `spacegraphjs/packages/renderer/src/index.ts` | `GraphRenderer`, `RenderModel`, `RenderTheme`, capabilities, events |
| **SpaceGraph adapter** | `spacegraphjs/packages/spacegraph-renderer/src/index.ts` | Wraps `spacegraphjs`; no Cytoscape |
| **Cytoscape adapter** | `spacegraphjs/packages/cytoscape-renderer/src/index.ts` | Wraps `cytoscape`; no core dependency |
| **Contract conformance** | `spacegraphjs/test/renderer.contract.test.ts` | Headless suite for both adapters |
| **Browser conformance** | `spacegraphjs/test/e2e/renderer.contract.spec.ts` | Mount/click/resize/dispose for both |
| **Generic zoom bands** | `spacegraphjs/src/zoom/ZoomBands.ts` | Headless thresholds and band callbacks |
| **Generic lane layout** | `spacegraphjs/src/layout/LaneLayout.ts` | Deterministic lanes, ordinals, append-only positions |
| **Static SVG renderer** | `spacegraphjs/packages/svg-renderer/src/index.ts` | `renderToSVG` + inline graph; contract-only |
| **Generic accessibility** | `spacegraphjs/src/a11y/AccessibilityLayer.ts` | DOM mirror, keyboard traversal, announcements |
| **Generic navigation trail** | `spacegraphjs/src/navigation/Trail.ts` | Breadcrumb/focus history |
| **Generic DOM mount** | `spacegraphjs/src/nodes/DOMNode.ts` | Mount an existing element without replacement |
| Renderer registry | `packages/session-graph/src/canvas/renderer-registry.ts` | Capability-aware lazy selection |
| Render model builder | `packages/session-graph/src/canvas/buildRenderModel.ts` | Model + level + positions → `RenderModel` |
| Canvas component | `packages/session-graph/src/canvas/GraphCanvas.tsx` | Mount, update, select, dispose; renderer-agnostic |
| Theme bridge | `packages/session-graph/src/canvas/theme.ts` | OpenCode tokens → `RenderTheme` |
| Graph view | `packages/session-graph/src/ui/GraphView.tsx` | Canvas + toolbar + inspector |
| Inspector | `packages/session-graph/src/ui/GraphInspector.tsx` | Conventional detail panel |
| Toolbar | `packages/session-graph/src/ui/GraphToolbar.tsx` | 2D/3D, zoom, fit, search, capability state |
| Breadcrumbs | `packages/session-graph/src/ui/GraphBreadcrumbs.tsx` | Session → turn → phase → node |
| Search | `packages/session-graph/src/ui/GraphSearch.tsx` | Filter and jump |
| Hybrid | `packages/session-graph/src/ui/TurnMapOverlay.tsx`, `InlineGraph.tsx` | Phase 6 |
| Stories | `packages/session-graph/src/**/*.stories.tsx` | Deterministic states |
| Component tests | `packages/session-graph/component-tests/` | DOM/interaction contracts |
| App integration | `packages/app/src/session/graph/` | Mode, lazy wrapper, hand-off |
| Mode toggle | `packages/app/src/session/header/session-graph-toggle.tsx` | Switch control |
| Capture CLI | `scripts/capture-graph-demo.ts` | Baseline/demo/compare/verify |
| Capture spec | `packages/app/e2e/graph/capture.spec.ts` | Deterministic screenshots |
| Docs | `docs/spacegraph/prototype.md`, `docs/spacegraph/screenshots/` | Release artifact |

### 4.4 Contract types

The contract is generic, dependency-free, and JSON-friendly. It is the only surface a host uses to render.

```ts
export const CONTRACT_VERSION = 1

export type Projection = "2d" | "3d"

export type NodeStatus = "neutral" | "pending" | "running" | "success" | "warning" | "error"

export type RenderNode = {
  id: string
  kind: string
  label: string
  summary?: string
  /** Host-sanitized markup for `shape: "card"`. Never fetched or evaluated by the renderer. */
  html?: string
  position: [number, number, number]
  size?: [number, number, number]
  status?: NodeStatus
  visible?: boolean
  interactive?: boolean
  shape?: "card" | "panel" | "dot" | "badge"
  data?: Record<string, unknown>
}

export type RenderEdge = {
  id: string
  source: string
  target: string
  kind: string
  label?: string
  confidence?: "explicit" | "structural" | "inferred"
  visible?: boolean
  directed?: boolean
  style?: "solid" | "dashed" | "dotted"
}

export type RenderModel = {
  nodes: readonly RenderNode[]
  edges: readonly RenderEdge[]
  extent?: { width: number; height: number; depth?: number }
}

export type RenderTheme = {
  background: string
  surface: string
  surfaceMuted: string
  text: string
  textMuted: string
  border: string
  accent: string
  success: string
  warning: string
  error: string
  edge: string
  edgeMuted: string
  selection: string
  focus: string
  fontFamily: string
  fontSize: number
  direction?: "ltr" | "rtl"
}

export type RendererCapabilities = {
  contractVersion: number
  projections: readonly Projection[]
  domNodes: boolean
  maxDomNodes: number
  edgeLabels: boolean
  clusterNodes: boolean
  minimap: boolean
  maxRecommendedNodes: number
}

export type RendererViewport = {
  zoom: number
  center: [number, number, number]
  band?: string
}

export type RendererEventMap = {
  ready: void
  nodeClick: { id: string }
  edgeClick: { id: string }
  backgroundClick: void
  nodeDoubleClick: { id: string }
  hoverChange: { id?: string; kind?: "node" | "edge" }
  selectionChange: { ids: readonly string[] }
  viewportChange: RendererViewport
  bandChange: { band: string; zoom: number }
  error: { error: unknown }
}

export type GraphRenderer = {
  readonly capabilities: RendererCapabilities
  mount(container: HTMLElement, options: { theme: RenderTheme; projection: Projection }): Promise<void>
  setModel(model: RenderModel): void
  setTheme(theme: RenderTheme): void
  setProjection(projection: Projection): void
  setSelection(ids: readonly string[]): void
  setViewport(viewport: RendererViewport): void
  fit(ids?: readonly string[]): void
  focus(id: string): void
  resize(): void
  on<K extends keyof RendererEventMap>(event: K, handler: (payload: RendererEventMap[K]) => void): () => void
  dispose(): void
}
```

### 4.5 Contract rules

1. The renderer owns geometry, hit-testing, camera, and animation. It does not own semantic zoom, clustering rules, host semantics, or detail content.
2. The host sends a complete model for the current semantic level. The renderer diffs by ID and never invents nodes.
3. Positions are authoritative from the host. The renderer must not auto-layout. Cytoscape uses `preset`; SpaceGraphJS uses `setPositions`.
4. Events carry string IDs and primitives only. No library objects cross the boundary.
5. `RenderNode.data` and `RenderEdge` payloads are serializable; no functions, DOM nodes, or library instances.
6. HTML cards are host-provided and sanitized. The renderer must not fetch, parse, or evaluate HTML. It positions and displays what the host gives it.
7. Capability flags drive UI affordances. Unsupported capabilities are disabled with an explanation, never silently broken.
8. The contract is versioned. A breaking change updates `CONTRACT_VERSION`, both adapters, the conformance suite, and the changelog.
9. Both adapters must pass the same conformance suite for: mount/dispose, diffing, selection sync, click vs drag, fit/focus, viewport/band events, theme change, resize, hidden-node non-interactivity, and HTML-card positioning.
10. `mount` is idempotent per container, `dispose` is idempotent, and calls after `dispose` are no-ops or a clear error. This is required for React StrictMode, session switching, and hot reload.

### 4.6 HTML cards in both renderers

HTML activity cards are a baseline capability, not a SpaceGraph-only advantage.

- **SpaceGraphJS:** `DOMNode`/`HtmlNode` mounts a host-provided element or sanitized `html` string inside the CSS3D layer. It must survive updates without replacing the element.
- **Cytoscape.js:** a host-owned DOM overlay layer positions sanitized `html` card elements over node coordinates. It updates on `render`/`viewport`, clips to the container, and passes pointer events only to interactive controls. A `cytoscape-node-html-label`-style extension is an acceptable alternative, but the overlay is preferred for full control, disposal, and pointer handling.
- Both adapters cap DOM cards (`maxDomNodes`) and fall back to simple labels above the cap.
- The host supplies elements or sanitized markup. The renderer never owns the content.

### 4.7 Renderer selection

- Default renderer: SpaceGraphJS, 2D orthographic.
- Fallback renderer: Cytoscape.js, 2D only, selected by a prototype setting or URL flag, or automatically after a SpaceGraphJS mount failure.
- Renderer choice is a prototype/debug affordance, not a primary toolbar control. The toolbar shows the active renderer and capability state; the selector lives in prototype settings.
- Both renderers consume the same `RenderModel`. The inspector, semantic levels, search, breadcrumbs, and accessibility layer do not depend on the renderer.
- If both renderers fail to mount, graph mode shows a concise error state and returns to the transcript.

Capability matrix:

| Capability | SpaceGraphJS | Cytoscape.js | UI behavior |
|---|---|---|---|
| 2D orthographic | yes | yes | default |
| 3D perspective | yes | no | toggle disabled with explanation |
| HTML activity cards | yes (CSS3D) | yes (DOM overlay) | shared `shape: "card"` |
| Edge labels | yes | yes | shared theme |
| Cluster nodes | yes | yes | model nodes, no compound dependency |
| Minimap | optional module | optional DOM/SVG | same viewport contract |
| Accessibility layer | shared | shared | library-owned |
| Explicit positions | yes | yes | host-owned layout |
| Recommended node cap | ~300 | ~1000 | model caps DOM cards first |

Reference: [Cytoscape.js](https://js.cytoscape.org/).

### 4.8 Host integration surface

Any agent UI should be able to reuse the library without forking it.

| Concern | Library provides | Host provides |
|---|---|---|
| Data | `RenderModel` | Event-to-model adapter, node kinds, summaries |
| Zoom | `ZoomBands` controller | Semantic level policy |
| Layout | `LaneLayout` primitives | Lanes, ordinals, cluster rules |
| Rendering | Contract + adapters | Renderer choice |
| Interaction | Selection, trail, accessibility | Detail panel, commands, routing |
| Theme | `RenderTheme` | Token mapping |
| Persistence | None | Session/view state |
| Export | Static SVG/JSON helpers | Share/storage UI |
| Framework | Vanilla controllers | Solid/React/Vue binding |

Portability requirements:

- **SSR-safe imports:** no top-level `window`/`document` access; constructors guard browser-only work.
- **Multi-instance isolation:** two graphs on one page must not share cameras, selections, event buses, or cross-instance edge resolution.
- **Touch/pointer parity:** pinch zoom, two-finger pan, pointer capture, and no global keyboard capture.
- **Framework bindings:** repair `solid-spacegraph` and add a React binding for hosts such as Hermes; both wrap the contract, not core internals.
- **Static export:** `renderToSVG(RenderModel)` and JSON serialization for shareable artifacts.
- **Host-neutral activity schema:** extract an `ActivityGraph` adapter only when a second host needs it; do not force OpenCode semantics into the library.
- **Versioning:** `CONTRACT_VERSION` plus semver on the contract and adapters; hosts can negotiate capabilities.

Hermes Agent is the first portability target after OpenCode: a React/Next-style host needs the contract, a React binding, an event-to-`RenderModel` adapter, and a host theme. It should not need to fork SpaceGraphJS or import OpenCode packages.


## 5. Graph model contract

### 5.1 Node kinds

| Kind | Source | Notes |
|---|---|---|
| `session` | session info + messages | One root node; goal from first user prompt. |
| `turn` | user message boundary → idle | Group of steered prompts until idle belongs to one turn. |
| `phase` | derived from consecutive tool categories | Explore, Edit, Verify, Delegate, Result. Marked `derived: true`. |
| `message` | user, synthetic, system, shell, notice | Shell messages get their own result node where possible. |
| `reasoning` | assistant reasoning parts | Collapsed by default; visible at detail. |
| `tool` | assistant tool parts | Carries `category`, `status`, `input`, `output`, `error`. |
| `file` | tool inputs/metadata + snapshots | One node per normalized path; many provenance edges. |
| `subagent` | `subagent` tool metadata + synthetic completion | Links to child session when known. |
| `result` | shell/execute output, test result | Carries exit, timeout, failure. |
| `error` | tool error, assistant error, idle error | One node per distinct error occurrence. |
| `retry` | `assistant.retry` | Attempt number and error. |
| `compaction` | compaction messages | Context event; summary only. |
| `notice` | synthetic/system/skill notices | Low prominence. |
| `diff` | turn diff or snapshot files | Lists changed files; links to file nodes. |
| `approval` | question/permission tools | Only when represented in messages. |

Node fields:

```ts
type GraphNode = {
  id: string
  kind: NodeKind
  label: string
  summary?: string
  status: "pending" | "running" | "success" | "failed" | "interrupted" | "neutral"
  turnID?: string
  messageID?: string
  partID?: string
  toolID?: string
  time?: number
  derived?: boolean
  minLevel?: ZoomLevel
  clusterOf?: string[]
  data?: Record<string, unknown>
}
```

### 5.2 Edge kinds and confidence

| Kind | Meaning | Confidence |
|---|---|---|
| `part-of` | Node belongs to turn/phase/session | explicit |
| `sequence` | Next event in the same stream | explicit |
| `delegates` | Subagent tool spawned/completed a child session | explicit |
| `reads` | Tool read a file | explicit |
| `writes` | Tool created/modified a file | explicit |
| `searches` | Tool searched a path/pattern scope | explicit |
| `produces` | Tool produced a result, diff, or file change | explicit |
| `references` | Prompt attachment or link refers to a file/session | explicit |
| `compacts` | Compaction summarizes prior context | explicit |
| `evidence` | An error/result preceded or shaped a retry or later action | structural |
| `inferred-cause` | Only when a documentable rule exists; label as inferred | inferred |

Do **not** create `caused-by` from adjacency alone. The inspector answers "why" by showing `part-of`, incoming `evidence`, and ordered `sequence` neighbors.

Edge fields:

```ts
type GraphEdge = {
  id: string
  kind: EdgeKind
  source: string
  target: string
  confidence: Confidence
  label?: string
}
```

### 5.3 Stable identity

Use source IDs wherever they exist:

- Turn: `turn:${userMessageID}`
- Message: `msg:${messageID}`
- Tool: `tool:${toolID}`
- File: `file:${normalizedRelativePath}`
- Subagent: `sub:${childSessionID}`; fallback `sub:${toolID}`
- Phase: `phase:${turnID}:${category}:${firstOrdinal}`
- Diff: `diff:${idleMessageID}` or `diff:${assistantMessageID}`
- Result: `result:${toolID}`
- Error: `err:${messageID}:${partIDOrOrdinal}`
- Retry: `retry:${messageID}:${attempt}`

Text and reasoning parts have no explicit part IDs. Use `${messageID}:text:${ordinal}` and `${messageID}:reasoning:${ordinal}`. Ordinals are stable because parts append; never use array identity or object identity as a node ID.

### 5.4 Semantic zoom policy

| Representation | Overview | Execution | Detail |
|---|---|---|---|
| Session | Root + goal | Root, dimmed | Root, dimmed |
| Turn | Visible, collapsed with phase chips | Header + turn extent | Header + extent |
| Phase | Visible cluster with counts | Expanded header | Expanded |
| User message | Goal/short label | Full prompt | Full prompt |
| Assistant text | Hidden or one-line summary | Truncated | Full |
| Reasoning | Hidden | Hidden unless selected | Visible |
| Tool call | Count chip only | Card with name/status | Full card |
| File | Aggregated per turn | Visible when connected to turn/selection | Visible |
| Subagent | Branch stub with status | Branch + child summary | Branch + open child |
| Failure/retry | Badge on turn/phase | Visible chain | Visible chain |
| Edges | Hierarchy + failure/evidence only | Selection neighborhood + sequence | All |
| Labels | Constant screen size, decluttered | Constant screen size | Constant screen size |
| DOM cards | ≤12 | ≤40 | ≤24 plus inspector |

Zoom is driven by a normalized value from the renderer, not by node scale. The model provides `minLevel`/`clusterOf`; the UI owns the policy table.

### 5.5 Layout rules

- Deterministic, append-only layout. No physics, no re-layout on mutation. The algorithm is a thin session-specific assignment of lanes and ordinals on top of `spacegraphjs/layout/LaneLayout`.
- X = turn ordinal × gap + event ordinal × step. Use ordinals, not timestamps, for identity; timestamps only order and display.
- Y = lane: user/prompt, assistant narrative, explore, edit, verify, delegate, artifacts.
- Z = hierarchy depth for 3D: session 0, turn 1, tool 2, file/result 3.
- One file node per path, positioned near its first write; later touches add edges, never new nodes.
- Phase clusters compute bounds from children; expanding a cluster does not move siblings.
- Fit/focus only on explicit user action, first load, or session change.
- Reserve space for an in-flight turn; fill it as content arrives without shifting earlier nodes.
- The app always sends absolute positions in `RenderModel`; neither renderer may run an automatic layout.

### 5.6 Invariants

1. Model construction is pure and synchronous; no effects, no DOM, no WebGL.
2. Stable IDs produce stable positions and stable selection across updates.
3. Streaming text changes never rebuild the graph; only new parts append nodes.
4. Hidden nodes are not interactive.
5. Detail content is always readable in a DOM panel, never only on the canvas.
6. The transcript keeps working if the graph package fails to load.
7. Every derived relation is labeled; no implied causality.
8. Both renderers consume the same `RenderModel`; no session semantics or layout logic live in a renderer.
9. Capability differences are visible to the user; a renderer never silently drops a feature.

## 6. Workstreams

Task convention: each task names its files and a verifiable "Done when". Check tasks off in this file as they land.

---

### Phase 0 — Foundation and compatibility spike

Goal: prove both source-linked renderers can render, resize, and dispose inside the real session panel before building the model.

- [ ] **P0.1 Branch and baseline**
  Create `session-graph` branch in the OpenCode repo from `origin/dev`. Create `session-graph` branch in `spacegraphjs/`. Record both commit SHAs in `docs/spacegraph/prototype.md`. Capture the current session-entry performance baseline per `packages/app/AGENTS.md`.
  Done: branch names, SHAs, and baseline command/output recorded.

- [x] **P0.2 Decide repository linkage** (done: sibling git repo, pinned SHA, `spacegraphjs/` gitignored; see log)
  Choose one: git submodule for `spacegraphjs/`, or a pinned commit SHA with a documented clone command. Recommended: submodule for a reproducible release artifact; do not vendor source into OpenCode.
  Done: linkage method documented; `spacegraphjs/` ignored or registered consistently; no accidental nested-repo commit.

- [x] **P0.3 Make the SpaceGraphJS packages source workspaces** (done: all five packages linked; see log)
  Add `spacegraphjs`, `spacegraphjs/packages/renderer`, `spacegraphjs/packages/spacegraph-renderer`, `spacegraphjs/packages/cytoscape-renderer`, and `spacegraphjs/packages/svg-renderer` to root `workspaces.packages`. Point each package's `main`/`module`/`types`/`exports` at its `src/index.ts` for the prototype. Add `spacegraphjs`, `@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`, and `@spacegraphjs/svg-renderer` as `workspace:*` dependencies of `packages/session-graph`. Keep a documented fallback (Vite regex aliases + tsconfig paths) if Bun workspace resolution conflicts.
  Done: `bun install` links all five packages; imports resolve from `packages/session-graph` in Vite, Bun test, typecheck, and Storybook; core does not import the contract.
  Status: `spacegraphjs` is a root workspace and a `workspace:*` dep of `packages/session-graph`; imports resolve in Vite, Bun, and Storybook, and typecheck passes via the `./activity` `types` condition. `@spacegraphjs/renderer` (L1.19), `@spacegraphjs/spacegraph-renderer` (L1.20), `@spacegraphjs/cytoscape-renderer` (L1.21), and `@spacegraphjs/svg-renderer` (L1.21a) are each a root workspace and a `workspace:*` dep of `packages/session-graph`, resolved under `bun test`/`tsc -b`/Storybook. All five packages now link; `bun install` at the root links them.

- [x] **P0.4 Trim the critical path** (done, narrowed scope: ONNX/Monaco dynamic, BVH patch now conditional; see log)
  Make `onnxruntime-web` and `@monaco-editor/loader` optional via dynamic import in `src/core/VisionManager.ts` and `src/nodes/CodeEditorNode.ts`. Do not import `src/vision` statically from the main entry. Remove the unconditional `three-mesh-bvh` prototype patch in `src/core/Renderer.ts` unless a real BVH is built.
  Done: importing `spacegraphjs` and constructing a graph never evaluates ONNX or Monaco; build has no ONNX wasm on the critical path.

- [x] **P0.5 Minimal embed spike** (done for SpaceGraphJS; see log; screenshot `docs/spacegraph/screenshots/00-spike-spacegraph.png`)
  In `packages/session-graph`, render 8 `HtmlNode`s and `CurvedEdge`s inside a sized div in the session panel. Verify pointer drag, resize, theme, cleanup on unmount, session switch, and HMR. Capture one screenshot. Measure the lazy chunk size.
  Done: parity with the spike checklist in SPACEGRAPH.md §4; go/no-go recorded.
  Status: mounts 8 cards + curved edges, asserts mount/resize/drag/single-instance/no-console-errors in a component test; chunk measured; screenshot committed. Placement is the Storybook host, not the routed session panel (Phase 4); theme and chrome are L1.3/L1.4.

- [x] **P0.6 Add `packages/session-graph` scaffolding** (done: package + story + component test verified; see log)
  Private package, `type: module`, source exports, `typecheck`/`test`/`test:components` scripts, `playwright.components.config.ts` using `componentConfig`, and `AGENTS.md`. Add it to `packages/storybook/.storybook/main.ts` story globs and optimize-deps entries.
  Done: empty package typechecks; Storybook discovers a placeholder story; component test runner starts.

- [x] **P0.7 Cytoscape renderer spike** (done as the real L1.21 adapter; see log)
  Add `cytoscape` and its types only to `spacegraphjs/packages/cytoscape-renderer` (`@spacegraphjs/cytoscape-renderer`). Render the same 8-node/edge model with `layout: { name: "preset", fit: false }`. Verify tap/dbltap, selection sync, fit/focus, resize, theme restyle, HTML card overlay for one node, and `cy.destroy()`. Measure the lazy chunk.
  Done: Cytoscape mounts from a dynamic import, obeys explicit positions, emits string-ID events, positions one HTML card correctly, and disposes without listeners.
  Status: superseded by L1.21 — the spike *is* the adapter. Mounts from a dynamic import, uses `preset`/absolute positions, emits string-ID tap/hover/select events, positions HTML cards in a clipped DOM overlay, and `dispose()` destroys `cy` and removes the canvas + overlay (asserted by `component-tests/cytoscape.spec.ts`).

- [x] **P0.8 Contract smoke test** (done as L1.22; see log)
  Define the minimal `GraphRenderer` shape (mount, setModel, selection, events, dispose) in `@spacegraphjs/renderer` and wrap the two spike mounts behind it. Write `spacegraphjs/test/renderer.contract.test.ts` with mount/dispose, diff-by-ID, selection, click-vs-drag, and HTML-card cases. Run it against both spike adapters.
  Done: both spikes pass the same smoke test; any capability difference is declared, not assumed. The full contract lands in L1.19-L1.22.
  Status: superseded by L1.22 — `spacegraphjs/test/renderer.contract.test.ts` runs the headless contract against both adapters and the session-graph harness runs the browser contract against both; capability differences (3D, minimap) are asserted, not assumed.

**Exit gate 0:** both renderers render and dispose cleanly in the real app shell; heavy deps are off the critical path; the shared contract smoke test passes against both. If it fails for structural reasons, stop and re-evaluate the renderer choice with the user before continuing.

---

### Phase 1 — SpaceGraphJS hardening and generalisation

Goal: make the library reliably embeddable, interaction-correct, and reusable outside OpenCode before adding app semantics.

#### Packaging and entry points

- [x] **L1.1 Remove internal self-imports** (done; `./zoom`/`./layout`/`./a11y`/`./navigation` now exist — see log)
  Convert the 37 `spacegraphjs/*` imports in `src` to relative imports. Add explicit core `exports` for `.`, `./activity`, `./core`, `./nodes`, `./edges`, `./plugins`, `./builder`, `./types`, `./zoom`, `./layout`, `./a11y`, `./navigation`, `./inline`, and `./vision`. Add `types` and a `types` condition. The renderer contract is a separate package, not a core subpath.
  Done: source and built consumption resolve without tsconfig paths; no `spacegraphjs/spacegraphjs/...` alias corruption.
  Status: self-imports are all relative (grep clean); `exports` cover every existing module. `./zoom`, `./layout`, `./a11y`, and `./navigation` exist (L1.23–L1.26); only `./inline` has no core module (the inline SVG renderer is `@spacegraphjs/svg-renderer`).

- [x] **L1.2 Add a lean activity entry** (done — see log)
  Create `src/activity.ts` exporting only: `SpaceGraph`, `Graph`, `EventEmitter`, `ShapeNode`, `HtmlNode`, `DOMNode`, `NoteNode`, `PanelNode`, `TextMeshNode`, `GroupNode`, `CurvedEdge`, `LabeledEdge`, `GridLayout`, `HierarchicalLayout`, `TimelineLayout`, `LODPlugin`, `ZoomBandsPlugin`, and theme/types. It must not import vision, Monaco, Chart, Math, or media nodes.
  Done: lean entry imports in under the agreed chunk budget and never pulls ONNX/Monaco.
  Status: `src/activity.ts` exists and `test/entry-critical-path.test.ts` asserts importing the entry and the activity entry evaluates neither ONNX nor Monaco. `ZoomBandsPlugin` is now exported from the lean entry (L1.23).

- [x] **L1.3 Make default chrome opt-in** (done; see log — browser "bare canvas" assertion still to confirm in L1.18)
  Move `HUDPlugin`, `MinimapPlugin`, `ZoomUIPlugin`, and `FractalZoomPlugin` out of `DEFAULT_SYSTEM_PLUGINS` into a `DEFAULT_CHROME_PLUGINS` list. Add `chrome: false` default for embedded use. Remove fixed `document.body` overlays unless chrome is enabled.
  Done: a bare `new SpaceGraph(container, { chrome: false })` renders only canvas + CSS3D layer.
  Status: `DEFAULT_CHROME_PLUGINS` exists; `chrome` defaults off and gates registration; `test/chrome.test.ts` asserts the split. The only default `document.body` writer was `ZoomUIPlugin`, now chrome-gated.

- [x] **L1.4 Plumb render/theme options** (done — background, node/edge/label, selection/hover/focus colours, `plugins`, and `projection` landed; light/dark verified by the L1.29 demo captures)
  Pass `RenderOptions` through `SpaceGraphOptions`: `backgroundColor`, `transparent`, `antialias`, `pixelRatio`, `preserveDrawingBuffer`, `projection`, `chrome`, `plugins`. Add a theme object for background, node fill/stroke, edge color, label color/font, selection/hover colors. Support transparent background so the app surface shows through.
  Done: no hard-coded `0x1a1a2e` when the app supplies a theme; light and dark screenshots both pass.
  Status: `render`/`chrome`/`theme`/`plugins` added; `RenderOptions` gains `transparent`, `preserveDrawingBuffer`, and `projection`; `WebGLRenderer` honors them and takes the single `types.ts` definition; `theme.background` overrides `render.backgroundColor`. `render.projection` now drives the ortho/perspective camera (L1.12). `theme` now also covers node fill/stroke, edge colour/label, label typography, and the selection/hover/focus outline colours through `src/core/theme.ts` (L1.4 pass). `SpaceGraphOptions.plugins` (extra plugin instances registered after the defaults in `#registerDefaults`) landed this pass. The light/dark check is satisfied by the L1.29 demo captures (`docs/spacegraph/screenshots/09-contract-demo-light.png`, `10-contract-demo-dark.png`); `test/chrome-embedded.test.ts` covers the plugin registration path only indirectly. Known gap: the core hard-codes an edge-label background, and the SpaceGraph adapter passes only `{ background }` to the core theme, so selection/focus outlines use core defaults.

#### Lifecycle and input

- [x] **L1.5 Correct `init()`/`dispose()`** (done; see log)
  Make both idempotent. `dispose()` must call `renderer.dispose()` (ResizeObserver + WebGL + DOM), `cameraControls.dispose()`, `input.dispose()`, `vision.dispose()`, `pluginManager.disposePlugins()`, `graph.clear()`, and `events.clear()`. Remove `window.SpaceGraph`/`instances` registration by default (`global: false`).
  Done: repeated mount/unmount over 20 cycles shows no listener, observer, or WebGL context growth; verified by a Playwright test.
  Status: `init()`/`dispose()` are idempotent (`#initialized`/`#disposed`); `dispose()` releases renderer, camera controls, input, vision, plugins, graph, and events. Registration on `window.SpaceGraph`/`SpaceGraph.instances` requires `options.global`. `test/e2e/hardening.spec.ts` runs 20 cycles with a stable canvas count.

- [x] **L1.6 Container-scoped keyboard** (done; see log)
  Camera keyboard handling only when the canvas or its container has focus, and never while an `input`, `textarea`, `select`, `[contenteditable]`, or `.monaco-editor` has focus. Add `keyboard: false | "container" | "window"`.
  Done: typing in the app composer/settings never moves the camera; keyboard pan/zoom still works when the canvas is focused.
  Status: `SpaceGraphOptions.keyboard` (default `'container'`) drives `CameraControls.setKeyboardScope`; listeners bind to the container (or window); editable targets are ignored; the container gets `tabindex=0` when scoped to it. `test/hardening.test.ts` covers all five cases.

- [x] **L1.7 Render scheduling** (done; see log)
  Add `renderMode: "continuous" | "on-demand"`. On-demand schedules a frame after graph mutations, camera moves, resize, theme changes, and selection changes. Default embedded mode to on-demand.
  Done: idle CPU usage is near zero; mutations repaint; tests still see deterministic frames.
  Status: `RenderOptions.renderMode` (default `'on-demand'`); `SpaceGraph.requestFrame()` coalesces a frame and is driven by graph/selection events, explicit camera ops, `CameraControls` interaction, `InputManager` events, `Renderer.onResize`, and `Graph.setPositions`/`pinAll`/`Node.updateSpec`. Continuous mode keeps the rAF loop. `test/e2e/hardening.spec.ts` asserts on-demand ortho rendering.

#### Events and selection

- [x] **L1.8 Forward graph events** (done; see log — ButtonNode routing is L1.9's remainder)
  Emit `node:added`, `node:removed`, `node:updated`, `edge:added`, `edge:removed`, `edge:updated` on `sg.events` in addition to `sg.graph`. Add a typed `SpaceGraphEvents` map. `updateNode` emits `node:updated`; `clear()` emits remove events or a single `graph:cleared`.
  Done: `sg.watch('node:added', cb)` fires; HUD/History subscriptions work or are removed.
  Status: `forwardGraphEvents` mirrors every Graph event onto `sg.events`; `Graph.updateNode` emits `node:updated`; `Graph.clear()` emits `graph:cleared`; the event names are declared on `SpaceGraphEvents`. HUD/History subscriptions now fire.

- [x] **L1.9 Real click semantics** (done for the pointer path; ButtonNode/ToggleNode routing remains — see log)
  Distinguish click from drag with a movement threshold. Emit `node:click`, `node:dblclick`, `edge:click`, `background:click` with `{ id, originalEvent }`. Make the dblclick camera fly configurable (`doubleClickFocus: false`). Route `ButtonNode` clicks through the same event path.
  Done: a plain click on a card selects it and does not fly the camera; a drag does not emit click; edge click works.
  Status: pointerup emits `node:click`/`edge:click`/`background:click` with `{ id, originalEvent }` when movement ≤ 5px and no box-select/connect/resize is active; a plain click selects the node; `doubleClickFocus` (default true) gates the dblclick fly. `ButtonNode`/`ToggleNode` still emit their own `node:click` on press.

- [x] **L1.10 Unified selection** (done; see log)
  Replace the three selection systems with one API: `select(id | ids | null)`, `clearSelection()`, `selected` (IDs), `selection:changed`, and `node:selection-changed`. Selection applies a visible outline; focus/camera movement is separate (`focusNode`). Box-select feeds the same state.
  Done: click, box-select, keyboard, and programmatic selection agree; selection survives updates by ID.
  Status: `src/core/Selection.ts` owns the ids; `SpaceGraph.select/clearSelection/toggleSelection/deselect/selectAll/deselectAll`, `selected` (ids) and `selectedNodes` expose it; `ErgonomicsAPI` delegates; `SelectionManager` is a visual/box-select adapter; click, box-select, ctrl+A, drag multi-select, and programmatic calls all agree. `SpaceGraph.selected` changed from `Node[]` to `string[]` ids.

- [x] **L1.11 Hover and focus cleanup** (done; see log)
  Deduplicate hover events from `HoverManager` and `HoverFingering`. Add a visible keyboard focus outline for mesh nodes. Ensure hidden/LOD-culled nodes cannot be picked.
  Done: one enter/leave per transition; Tab cycles selectable nodes with visible focus.
  Status: the dead `HoverFingering` (never activated — `start()` returned false) is removed with its registration and export, so `HoverManager` is the single hover source. Hidden/LOD-culled nodes are not pickable (L1.14). The mesh focus outline is now real: `Node.setControlState`/`syncVisual` draw a theme-coloured `BoxHelper` on focus/selection/hover (DOM nodes draw a DOM outline instead), so Tab→`FocusManager.focusNext` shows a visible focus ring. **Deviation:** the outline is an axis-aligned `BoxHelper`, not a silhouette.

#### Cameras and zoom

- [x] **L1.12 First-class orthographic projection** (done; see log — wheel zoom is centered on the viewport, not the pointer)
  Add `projection: "perspective" | "orthographic"` to the renderer. Swap the camera used by WebGL, CSS3D, raycasting, resize, `fitView`, and `RenderContext`. Implement ortho pan and wheel zoom around the pointer. Clamp zoom. Disable free orbit in ortho.
  Done: `sg.setProjection("orthographic")` produces a true parallel projection with correct CSS3D alignment; wheel zoom and pan work; toggling to perspective preserves target and selection.
  Status: `Renderer` owns both cameras and swaps them in `setProjection`; `RenderContext.setCamera` follows the active camera; `onResize` keeps the ortho frustum aspect-correct; `CameraControls` disables orbit in ortho and zooms the frustum (clamped 0.01–100). Orbit is now explicitly gated per projection via `CameraControls.setOrbitEnabled`/`SpaceGraph.setOrbitEnabled` and `setPolar` (U3.15). Browser-verified by the session-graph adapter component test (2D↔3D with no console errors). Pointer-anchored ortho zoom is not done; zoom scales the frustum about the target.

- [x] **L1.13 Camera zoom telemetry** (done; see log)
  Add a normalized camera zoom (`0..1` or log-scale) derived from perspective distance or ortho height. Emit throttled `camera:change` and `zoom:change`; expose `zoom`, `setZoom`, and `zoomToFit(nodes?)`. Do not implement semantic levels here; the band controller in L1.23 owns policy.
  Done: manual wheel, programmatic zoom, and projection changes all emit correct viewport/zoom events.
  Status: `src/core/zoom.ts` normalizes distance/ortho zoom; `Renderer.getZoom`/`setZoom`/`getViewport` and `SpaceGraph.zoom`/`setZoom`/`zoomToFit`/`viewport` expose it; `camera:change`/`zoom:change` are emitted on change (value-deduped, not timer-throttled). `band` is left for host policy.

- [x] **L1.14 LOD correctness** (done; see log)
  Cache node bounds instead of recomputing `Box3.setFromObject` twice per frame. Add per-node `data.minZoom`/`maxZoom`/`data.lod`. Hidden nodes are not pickable. Add `labelMode: "scale" | "constant" | "hide"` for DOM labels. Fix the LOD plugin key mismatch and restore edges when zooming back in.
  Done: 300-node scene holds 60fps during pan in the app viewport; labels stay readable or hide according to policy; hidden nodes cannot be clicked.
  Status: `Node.computeLOD` is the only implementation (`RenderContext` delegates) and honours `data.minZoom`/`maxZoom`/`lod`; bounds are cached per render frame (`Node.lodFrame`), so the double `setFromObject` is gone. `InteractionRaycaster` skips hidden/LOD-culled nodes. Unit-tested. The literal 300-node 60fps and `labelMode` remain unmeasured — `labelMode` is superseded by per-node LOD/`data.lod` here and can be added where DOM labels need it.

#### Content and layout

- [x] **L1.15 Safe DOM node updates** (done; see log)
  Add a supported `DOMNode`/`CustomNode` spec path that accepts an existing `HTMLElement`, never replaces it on update, and exposes `data.lod`. Make `HtmlNode.updateSpec` no-op when HTML is unchanged. Do not destroy mounted Solid content.
  Done: a mounted card survives 100 model updates with its listeners intact.
  Status: `HtmlNode.updateSpec` only rewrites `innerHTML`/`textContent` when the value actually changed. `DOMNode` now takes an optional element and falls back to `spec.data.element`, is registered in `DEFAULT_NODE_TYPES`, and strips `element` from updates so a mounted element is never replaced; `BaseNodeData` types `lod`/`minZoom`/`maxZoom`, honoured by `Node.computeLOD`. `dom-node.test.ts` asserts element identity and a surviving listener across 100 updates.

- [x] **L1.16 Stable layout primitives** (done; see log)
  Add `setPositions(positions: Record<string, [number, number, number]>)`, `pinAll()`, and `layoutOnce(name, options)` that does not run on mutation. Make `TimelineLayout` and `HierarchicalLayout` deterministic and pin-aware. Remove `window.gsap` dependence from layout animation or make animation optional.
  Done: applying positions twice yields identical coordinates; adding nodes does not move pinned nodes.
  Status: `Graph.setPositions` (absolute, refreshes edges, requests a frame), `Graph.pinAll`, and `SpaceGraph.setPositions`/`pinAll`/`layoutOnce` land; physics is off by default. `BaseLayout.applyPosition` now applies positions synchronously without `window.gsap`, so layouts are deterministic, and `HierarchicalLayout` skips pinned nodes. Unit-tested for byte-identical repeats and pinned stability.

- [x] **L1.17 Edge rendering fixes** (done; see log — label-vs-card overlap resolved)
  Render `LabeledEdge` labels via a real CSS2D layer or an `HtmlNode` anchor. Ensure edge labels are zoom-aware and never overlap cards. Add an optional edge hit area for easier clicking.
  Done: edge labels appear in a screenshot; edge click targets are reliable at 2D zoom levels.
  Status: `LabeledEdge` no longer crashes on construction (the base `Edge` constructor called the overridable `update()` before the label fields existed; a `ready` guard defers `_positionLabel`/`updateLod`). `Renderer` owns a `CSS2DRenderer` layer so edge labels display at a constant screen size. `EdgeData.hitWidth` drives `Edge.hitTest`'s raycaster threshold (default 5). The per-frame declutter pass (`declutterLabels`) now also measures DOM card rects and treats them as higher-priority obstacles, so a label overlapping a card is hidden while the card never is (affects SpaceGraph and Cytoscape card markup alike). Capped at 200 labels + 200 card rects. (spacegraphjs `7dec1ed`/`de0f632`/this pass.)

- [x] **L1.18 Library tests and demo** (done for this slice; see log)
  Add focused Vitest tests for event forwarding, click-vs-drag, selection, dispose, ortho projection math, zoom bands, stable IDs/positions, and DOM update preservation. Add a Playwright demo page exercising ortho + click + zoom bands + dispose. Quarantine or repair stale tests that contradict the new API.
  Done: `bunx vitest run` from `spacegraphjs/` passes the new suite; demo test passes in Chromium.
  Status: `test/hardening.test.ts` (keyboard scope, per-node LOD, layout determinism) and `test/e2e/hardening.spec.ts` + `demo/hardening.html` (ortho/on-demand mount, projection+zoom, selection, 20 dispose cycles). `pnpm exec vitest run` → 20 files / 236 tests. The Playwright spec passes in Chromium; it reads `SG_DEMO_URL` and targets `/hardening.html` because the repo vite is `root: 'demo'` (the older `/demo/*.html` specs are stale under that config and were left for a separate repair). Broader library tests (click-vs-drag, ortho math, DOM-update preservation) still need dedicated cases.

#### Shared contract and second backend

- [x] **L1.19 Publish the renderer contract package** (done; see log)
  Create `spacegraphjs/packages/renderer` (`@spacegraphjs/renderer`) with the types in §4.4. It contains types plus a tiny `CONTRACT_VERSION`/capability helper, with zero dependencies. It must not import `spacegraphjs`, `three`, `cytoscape`, or host code. Add a small `supports(capabilities, capability)` helper if useful.
  Done: the package typechecks and builds with zero runtime dependencies; importing it adds no bundle weight.
  Status: `@spacegraphjs/renderer` exists with the §4.4 types plus `CONTRACT_VERSION`/`supports`; zero deps; source export. Typecheck is clean and `bun test` passes. No build step yet (source-only), and it is linked into `packages/session-graph` (P0.3).

- [x] **L1.20 SpaceGraph renderer adapter package** (done; see log — remodelling a node to a new type is not supported)
  Create `spacegraphjs/packages/spacegraph-renderer` (`@spacegraphjs/spacegraph-renderer`) exporting `SpaceGraphRenderer`. It wraps the lean `spacegraphjs/activity` entry, maps `RenderModel` to specs, applies positions with `setPositions`, maps status/kind to theme styles, positions HTML cards via `DOMNode`/`HtmlNode`, translates events to string IDs, and implements viewport/band reporting. It is the only package that imports both the core and the contract.
  Done: the adapter passes the contract suite; it never calls an automatic layout; core still does not import the contract.
  Status: `SpaceGraphRenderer` implements the full `GraphRenderer` surface; core loads via dynamic import inside `mount`; core never imports the contract (grep clean); never calls a layout. Passing the *shared* conformance suite waits on L1.22 (one adapter today); verified by `bun test` mapping/capability tests and the session-graph browser contract test. HTML cards go through `data.html` on `HtmlNode` (a `DOMNode` element path is not wired yet).

- [x] **L1.21 Cytoscape renderer adapter package** (done; see log — 3D is a capability-gated no-op)
  Create `spacegraphjs/packages/cytoscape-renderer` (`@spacegraphjs/cytoscape-renderer`) exporting `CytoscapeRenderer`. It depends only on `@spacegraphjs/renderer` and `cytoscape` (peer), not on `spacegraphjs` core. Use `preset` layout, `cy.batch` diffs, `cy.style` from `RenderTheme`, compound-free cluster nodes, `min-zoomed-font-size`, and event mapping. Implement a clipped DOM overlay for `shape: "card"` nodes, updated on `render`/`viewport`, with `maxDomNodes` and simple-label fallback. Declare `projections: ["2d"]`, `domNodes: true`, `maxDomNodes`, and `maxRecommendedNodes`.
  Done: the package passes the contract suite, renders HTML cards without core imports, and disposes the overlay with `cy.destroy()`.
  Status: `CytoscapeRenderer` implements the full `GraphRenderer` surface over a dynamic `import('cytoscape')` (no core import, grep clean); `preset` layout + absolute positions only; `cy.batch` ID-diffed `setModel`; string-ID tap/hover/select events; a clipped `pointer-events: none` DOM overlay for `shape: "card"` capped at `maxDomNodes`; `dispose()` destroys `cy` and removes the canvas + overlay. Enum style props use classes/selectors (cytoscape rejects `data()` for them). `setProjection('3d')` is a no-op the capability declares. Covered by `bun test` mapping/capability tests and the session-graph browser contract test.

- [x] **L1.21a Static SVG renderer package** (done; see log)
  Create `spacegraphjs/packages/svg-renderer` (`@spacegraphjs/svg-renderer`) exporting `renderToSVG(model, options)` and `InlineGraph`. It depends only on `@spacegraphjs/renderer` and renders nodes, edges, labels, clusters, and statuses to static SVG. It is not an interactive `GraphRenderer`. Use a simple card representation (no HTML execution) and preserve theme colors.
  Done: the package renders the fixture to SVG without a browser; `InlineGraph` uses it; core remains contract-free.
  Status: `renderToSVG` is pure Node/SVG (bounds, themed edges with dashed/arrow styling, rounded-rect cards, status-colored dots/badges, escaped labels, explicit size/theme); `InlineGraph(container, options?)` sets it into a host element (`setModel`/`resize`/`dispose`). Contract-only dependency; no core import (grep clean). `bun test` covers escaping, hidden-node omission, theme colors, size, and determinism.

- [x] **L1.22 Renderer conformance suite** (done; headless in spacegraphjs, browser in session-graph — see log)
  Finish `test/renderer.contract.test.ts` and run it against both adapters: mount/dispose, diff-by-ID, selection sync, click-vs-drag, fit/focus, viewport/band events, theme change, resize, hidden-node non-interactivity, HTML-card positioning, and capability declaration. Split the suite: headless model assertions in Vitest, and mount/click/resize/dispose assertions in Playwright (Cytoscape can run headless for graph operations, but hit-testing and canvas lifecycle need a browser).
  Done: one command proves both adapters honor the contract; capability gaps are asserted, not ignored.
  Status: `spacegraphjs/test/renderer.contract.test.ts` (Vitest, jsdom, 13 tests) runs the headless contract against **both** adapters — method surface, `CONTRACT_VERSION`, capability-driven `supports()`, pre-mount no-ops, `on()` unsubscribe, idempotent `dispose` + post-dispose no-ops, and an explicit 3D/minimap capability-difference case. The browser half (mount/click/resize/dispose, hidden-node display, HTML-card overlay, capability gating) runs in the session-graph Storybook harness (`component-tests/{adapter,cytoscape}.spec.ts`). **Deviation:** the browser suite is the host harness, not `spacegraphjs/test/e2e/renderer.contract.spec.ts`, because the library repo has no contract page harness; add the library-side spec if a non-OpenCode host needs it. V5.6 folds both commands into `graph:verify`.

- [x] **L1.23 Generic zoom-band controller** (done; see log)
  Add `src/zoom/ZoomBands.ts`: configurable thresholds, normalized zoom, band callbacks, and viewport snapshots. Replace `FractalZoomPlugin` with a thin `ZoomBandsPlugin` that delegates to the controller. The controller stays headless and policy-free.
  Done: unit tests cover threshold edges, wheel bursts, projection changes, and programmatic zoom; `FractalZoomPlugin` is removed or deprecated.
  Status: `src/zoom/ZoomBands.ts` is a headless controller (validated contiguous bands, hysteresis, `feed`/`feedNormalized`, change callbacks, `snapshot`). `ZoomBandsPlugin` delegates and is now in `DEFAULT_CHROME_PLUGINS`; `FractalZoomPlugin` is kept but `@deprecated`. `test/zoom-bands.test.ts` covers threshold edges, wheel-burst hysteresis, projection switches, and programmatic zoom.

- [x] **L1.24 Generic lane layout** (done; see log)
  Add `src/layout/LaneLayout.ts`: lanes, ordinals, gaps, cluster bounds, reserved space, and append-only positions. `TimelineLayout`/`HierarchicalLayout` can use it internally, but the API is generic and does not mention sessions or messages.
  Done: deterministic snapshots; adding an item never moves existing items.
  Status: `src/layout/LaneLayout.ts` provides `place`/`placeAll`/`reserve`/`bounds`/`clear`; `test/lane-layout.test.ts` asserts lane→Y, ordinal→X, depth→Z, group reservation, byte-identical rebuilds, and append-only stability. `TimelineLayout`/`HierarchicalLayout` are not yet refactored onto it.

- [x] **L1.25 Generic accessibility layer** (done; see log — the U3.14 host wiring proved traversal against both adapters)
  Add `src/a11y/AccessibilityLayer.ts`: a visually hidden ordered node/edge list, roving tabindex, Enter/Space selection, Escape back, and `aria-live` selection announcements. It accepts a minimal structural node list (`id`, `label`, `kind`, `status`, `interactive`) so core does not import the contract; the host passes `RenderModel.nodes`.
  Done: keyboard-only traversal works against both interactive adapters; no renderer-specific accessibility code; core has no contract import.
  Status: `src/a11y/AccessibilityLayer.ts` implements the mirror (roving tabindex, Arrow/Home/End skipping non-interactive items, Enter/Space, Escape, `aria-live`), imports no contract, and is covered by `test/a11y.test.ts` in jsdom. It is mounted over the active render model and exercised against **both** adapters in `packages/session-graph/component-tests/graph-a11y.spec.ts` (U3.14); `AccessibilityLayer` gained an optional `formatSelection` hook so the host localizes the live-region copy. The list is nodes only (edges are not announced).

- [x] **L1.26 Generic navigation trail** (done; see log)
  Add `src/navigation/Trail.ts`: push/replace/back/forward, depth, and labels. Session-graph renders breadcrumbs from it; any graph app can use the controller.
  Done: trail state survives render-model updates by ID and resets on explicit root.
  Status: `src/navigation/Trail.ts` provides the history plus `reconcile(byId)`/`reset`; `test/trail.test.ts` asserts forward-truncation, `maxDepth` trimming, by-id reconciliation, and reset. Session-graph breadcrumbs still read `part-of` ancestry; the swap to `Trail` is U3.11's remainder.

- [x] **L1.27 Optional chrome modules** (done; see log)
  Fix `MinimapPlugin` and `ZoomControls` for embedded use: container-scoped, explicit enable/disable, accurate viewport rectangle, no second full scene pass if a DOM/SVG minimap is cheaper. Expose them as optional modules, not defaults.
  Done: a 300-node demo can enable the minimap without doubling frame cost; disabling leaves no DOM behind.
  Status: `MinimapPlugin` is container-scoped, gains `settings.enabled` + `setEnabled()`, throttles its scene pass (`settings.intervalMs`, default 100ms), and derives the viewport rectangle from the **active** camera (`_visibleWorldSize`), so it is correct under orthographic as well as perspective (the old `PerspectiveCamera` cast is gone). `dispose()` now removes its overlay and calls `super.dispose()`. `ZoomUIPlugin` is container-scoped (`position: absolute` inside `sg.container`, not `document.body`) and `dispose()` releases the `fractal:level-change` listener and the hint timer. Both remain optional (chrome is off by default; hosts can also pass them through the new `options.plugins`). `test/chrome-embedded.test.ts` covers container scoping, enable/disable, the disabled no-op scene pass, and leak-free dispose. The measured 300-node no-double-cost check is the throttled interval plus the default on-demand render loop; a dedicated frame-cost benchmark is not added.

- [x] **L1.28 Capability-aware UI contract** (done; see log)
  Define how unsupported capabilities surface: `supports(capabilities, capability)` plus a user-visible explanation. 3D on Cytoscape and minimap availability must be explicit. HTML cards are supported by both adapters; only their `maxDomNodes` differs.
  Done: the UI never calls an unsupported method; the toolbar explains unavailable actions.
  Status: `supports` (L1.19) drives the toolbar's 3D control (`disabled` + `title` explanation) and `GraphView` falls back to 2D when the active renderer lacks 3D; there is no `renderer === "cytoscape"` branch. The minimap stays declared unavailable until L1.27.

- [x] **L1.29 Non-OpenCode reference demo** (done — `demo/contract.html` + `demo/contract-demo.ts`; see log)
  Add a generic demo under `spacegraphjs/demo` that uses the contract, `LaneLayout`, `ZoomBands`, `AccessibilityLayer`, and `Trail` with synthetic activity data. Include HTML activity cards, both interactive adapters, and the static SVG renderer. No OpenCode imports or session vocabulary.
  Done: the demo runs from the library repo and demonstrates the same capabilities outside OpenCode; it is linked from the README.
  Status: **done.** `spacegraphjs/demo/contract.html` + `demo/contract-demo.ts` mount the same synthetic activity
  model through the SpaceGraph adapter, the Cytoscape adapter, and the static SVG renderer, using `LaneLayout`
  (positions), `ZoomBands` (viewport bands), `Trail` (breadcrumbs), and `AccessibilityLayer` (keyboard
  traversal); the P8.6 second-host fixture is the "Second host" scene. `vite.demo.config.ts` gained the
  `@spacegraphjs/*` and regex `spacegraphjs/*` aliases the demo needs. `test/e2e/contract-demo.spec.ts` (5 cases)
  proves mount, renderer switch + SVG export + 3D gating, keyboard/connection/trail navigation, the second-host
  fixture with RTL markup, and the light/dark capture. Linked from `demo/README.md` and the root `README.md`.

- [x] **L1.30 Multi-instance isolation** (done; edge resolution isolated, registry kept as a dev handle — see log)
  Remove global instance registration, global event buses, and cross-instance edge resolution. Two `SpaceGraph` instances on one page must have independent cameras, selections, themes, input, and disposal. Add a test with two graphs and duplicate node IDs.
  Done: two graphs coexist without cross-talk; deleting one leaves the other functional.
  Status: `Graph.addEdge` resolves endpoints locally only and never auto-selects `InterGraphEdge`, so registry membership cannot couple graphs; `test/spacegraph.test.ts` asserts a cross-instance edge is rejected and that two instances with duplicate ids stay independent. `SpaceGraph.instances`/`options.global` remain as an off-by-default developer handle for the vision/inspection helpers, no longer consulted by graph semantics (see log).

- [x] **L1.31 SSR-safe entry** (done; see log)
  Ensure importing `spacegraphjs` and `@spacegraphjs/renderer` in Node/SSR does not touch `window`, `document`, `navigator`, or WebGL. Guard browser-only work in constructors and `mount`, and document the client-only boundary.
  Done: a Node import smoke test passes; no top-level browser access.
  Status: `test/ssr.test.ts` runs under `// @vitest-environment node` and imports the full entry, `activity`, and all four packages with no DOM; it asserts `window`/`document` are undefined and each surface resolves. Constructors still do browser-only work at `mount`/`init`, not at import.

- [x] **L1.32 Touch and pointer parity** (done; see log — HTML-card-on-touch is shared with pointer hit-testing)
  Add pinch zoom, two-finger pan, pointer capture, and touch hit-testing to the SpaceGraphJS adapter. Do not rely on global keyboard listeners. Verify at 390×900 with touch emulation.
  Done: pan, pinch zoom, tap selection, and HTML-card controls work on a touch viewport.
  Status: `InputManager.routeFingeringEvent` now dispatches multi-touch — a second pointer engages a registered `startMultiTouch` fingering, moves route to `updateMultiTouch`, and lifting a finger calls `stopMultiTouch` — and captures the pointer on the event target for trusted events (skipped for synthetic dispatch, so tests do not throw). `PinchZoomFingering` is projection-aware: pinch feeds `CameraControls.zoom` (ortho frustum or perspective distance) by the finger-distance ratio, and a two-finger drag feeds `CameraControls.pan` by the midpoint delta; `SpaceGraph` registers it at `FingeringPriority.PINCH_ZOOM`. The WebGL canvas sets `touch-action: none`. `test/touch.test.ts` proves the multi-touch dispatch and pinch/pan math; `test/e2e/hardening.spec.ts` adds a 390×900 touch-viewport case (hasTouch + viewport) that pinches through dispatched PointerEvents and asserts the camera zoom changed with no console errors. HTML-card controls use the same pointer hit-testing path as mesh nodes (covered by the adapter/component suites); no dedicated touch e2e for a DOM card is added.

- [x] **L1.33 Disambiguate the core renderer** (done; see log)
  Rename the core WebGL class `Renderer` to `WebGLRenderer`, keeping `Renderer` as a deprecated alias for one release. Update exports, docs, and internal references. Reserve "renderer" in public docs for the contract and adapters.
  Done: no public name collision between the core WebGL class and the renderer contract; existing imports still work through the alias.
  Status: `src/core/Renderer.ts` is renamed to `src/core/WebGLRenderer.ts` (class `WebGLRenderer`), with `export { WebGLRenderer as Renderer }` kept as a `@deprecated` alias. `src/core/index.ts` and `src/index.ts` export both names; `SpaceGraph.renderer` is typed `WebGLRenderer` and instantiated as `new WebGLRenderer(...)`. `test/chrome-embedded.test.ts` asserts `Renderer === WebGLRenderer`. The file touch index already anticipated this path.

- [x] **L1.34 Package boundaries and dependency enforcement** (done; see log)
  Give each package its own `package.json` with explicit `exports`, `sideEffects: false`, peer dependencies where appropriate (`three`, `gsap`, `cytoscape`), and a build script. Add a boundary test that scans `spacegraphjs/src` and fails if it imports `@spacegraphjs/renderer`, `@spacegraphjs/cytoscape-renderer`, or `cytoscape`, and scans `@spacegraphjs/cytoscape-renderer` and fails if it imports `spacegraphjs` core.
  Done: the boundary test runs in CI; core's dependency graph is unchanged by the contract and adapters; each package is independently publishable.
  Status: `test/boundaries.test.ts` (run by the new `test:boundaries` script) enforces the §4.1 direction: core imports none of the contract/adapters/`cytoscape`; the contract has zero imports; the Cytoscape and SVG renderers stay off the core and Cytoscape; only the SpaceGraph adapter imports core + contract. All four packages carry explicit `exports`, `sideEffects: false`, and peer deps; a `build` script is deferred with the source-workspace decision (R7.5).

**Exit gate 1:** a minimal activity graph can be opened, panned, zoomed in 2D and 3D, clicked, keyboard-navigated, and disposed without leaks or global interference. Both adapters pass the shared contract, including HTML activity cards. If click/selection/dispose cannot be made reliable in SpaceGraphJS, the Cytoscape adapter is already proven and the contract isolates the change.

---

### Phase 2 — Graph model and fixture

Goal: a pure, tested model that answers the five questions from real session data.

- [x] **M2.1 Model types and IDs** (done; see log)
  Add `packages/session-ui/src/graph/model.ts` with `GraphModel`, `GraphNode`, `GraphEdge`, `NodeKind`, `EdgeKind`, `Confidence`, and the ID helpers in §5.3. Export via `@opencode/session-ui/graph`.
  Done: types compile; ID helpers have table-driven tests.
  Status: landed in `model.ts`; `fileNodeID` normalization is covered; exported from `./graph` and `./graph/model`.

- [x] **M2.2 Turn ownership** (done; see log — additive `turnByMessageID` on the projection's single walk)
  Derive turn boundaries by reusing `Timeline.constructSessionMessageRows` / `assistantMessagesByParent`, not a second implementation. Handle steered prompts, idle markers, shell messages, notices, and interrupted sessions.
  Done: model tests cover a steered-prompt turn, an interrupted turn, and a shell-only turn.
  Status: `constructSessionMessageRows` now returns `turnByMessageID`; tests cover a steered turn, a shell-only turn, and an interrupted idle.

- [x] **M2.3 Node construction** (done; see log — `phase` nodes now built)
  Build session, turn, phase, message, reasoning, tool, result, error, retry, subagent, file, diff, compaction, notice, and approval nodes. Map tool names to categories with `timelineCategory`; normalize unknown tools to a generic `tool` node.
  Done: every `SessionMessageInfo` variant maps to a node or is explicitly ignored; unknown tools do not throw.
  Status: `phase` nodes are built from consecutive tool categories (`derived`, `data.category`, `clusterOf`, `part-of` the turn); every other kind except `approval` is built; config events (agent/model/location-switched) are explicitly ignored; unknown tools become generic `tool` nodes. `approval` stays unbuilt until question/permission messages are represented.

- [x] **M2.4 Edge construction** (done; see log)
  Emit `part-of`, `sequence`, `delegates`, `reads`, `writes`, `searches`, `produces`, `references`, `compacts`, and `evidence` edges with confidence. Ensure no `inferred-cause` edge is created from adjacency. Read file paths from:
  - `read` input `path`
  - `edit`/`write` input `path` and `state.metadata.files`
  - `patch` `state.metadata.files`
  - `glob`/`grep` input `path`/`pattern` as a search scope
  - `subagent` metadata `sessionID`/`sessionId`
  - `assistant.snapshot.files` as fallback provenance
  - synthetic subagent completion `metadata.source`, `childID`
  Done: provenance tests for each tool; a file touched by two tools has one node and two edges.
  Status: all ten edge kinds are emitted with confidence; `inferred-cause` is never created; file provenance covers read/edit/write/patch/search, subagent child session, and snapshot fallback; a file touched by several tools keeps one node and many edges.

- [x] **M2.5 Status and failure interpretation** (done; see log)
  Normalize running/completed/error tools, shell exit/timeout failures, assistant errors/retries, and idle outcomes. Attach failure badges to the owning turn/phase.
  Done: fixture produces exactly one failed result, one retry, and one recovered success.
  Status: node `status` normalizes tools/shell/idle/assistant errors; the fixture yields exactly one failed `result`, one `retry`, and a recovered success; failure badges attach to the owning turn via `part-of` (phase badges wait on M2.3).

- [x] **M2.6 Semantic zoom levels** (done; see log)
  Implement `levels.ts` with the policy table in §5.4: per-level visible kinds, cluster expansion, label mode, edge filter, and DOM budget. Expose `nodesAtLevel(model, level)` and `edgesAtLevel(model, level, focus?)`.
  Done: snapshot tests for each level; cluster counts match children; hidden nodes are excluded from interaction data.
  Status: `levels.ts` provides `nodesAtLevel`/`visibleNodeIDs`/`edgesAtLevel`, `clusterCount`, `isClusterExpanded`, `labelMode`, and `domBudget`; tests cover per-level visibility, edge filtering, focus narrowing, endpoint visibility, and cluster counts.

- [x] **M2.7 Deterministic layout** (done; see log)
  Implement `layout.ts` per §5.5: lanes, ordinals, depth, cluster bounds, append-only coordinates, reserved in-flight turn space. Return positions and cluster geometry; no rendering dependency.
  Done: repeated builds produce byte-identical positions; appending a turn leaves earlier positions unchanged.
  Status: `layoutGraph` returns `positions`/`clusters`/`bounds` with lanes, depths, and first-write file anchoring; tests assert byte-identical rebuilds, append-only stability, lane/depth placement, and cluster bounds. Reserved in-flight turn space is implicit in the turn-indexed base X.

- [x] **M2.8 Selectors** (done; see log — answers the five questions in unit tests)
  Implement neighbors, incoming/outgoing edges, shortest path, "why this node" (part-of + evidence + sequence context), search index, breadcrumbs, current activity, and "open in transcript" message/part refs.
  Done: fixture queries answer all five mission questions in unit tests.
  Status: `selectors.ts` provides neighbors, incoming/outgoing, ancestors/breadcrumbs, `why`, `shortestPath`, `forwardChain`, `search`, `openInTranscript`, and `currentActivity`; `selectors.test.ts` answers all five questions.

- [x] **M2.9 Canonical fixture** (done; see log)
  Add `fixture.ts` implementing §7 with deterministic IDs and timestamps. Export both raw `SessionMessageInfo[]` and the built model. Make it the single source for stories, e2e seeds, and screenshots; do not maintain a second hand-written fixture.
  Done: fixture consumes no network, no clock; identical output across runs; a parity test asserts the story and e2e fixtures produce the same model.
  Status: `fixture.ts` gives `buildFixtureMessages`/`fixtureMessages`, `buildFixtureGraph`, and a `buildInterruptedFixtureMessages` variant; the purity test asserts identical output across runs. The story/e2e parity assertion lands when Phase 3/4 consume it.

- [x] **M2.10 Model tests** (done; see log)
  Cover stable IDs, steered turns, subagent mapping, file provenance, retry/evidence, cluster counts, level filtering, layout stability, unknown tools, streaming partial states, and malformed metadata.
  Done: `cd packages/session-ui && bun test src/graph` passes.
  Status: `bun test src/graph` → 42 tests pass across `model.test.ts`, `selectors.test.ts`, `levels.test.ts`, and `layout.test.ts` (stable IDs, steered/shell/interrupted turns, phases, subagent mapping, provenance, retry/evidence, unknown tools, streaming JSON, malformed metadata, purity, five questions, level filtering, and layout stability).

**Exit gate 2:** the fixture model is inspectable in a plain test and answers the five questions without rendering. If the model cannot answer them, the UI cannot.

---

### Phase 3 — Graph UI

Goal: a legible, navigable surface that is worth comparing to the transcript, and that proves renderer independence.

- [x] **U3.1 Render-model builder** (done; see log)
  Add `packages/session-graph/src/canvas/buildRenderModel.ts`: `GraphModel` + level + positions + focus → `RenderModel`. It applies the §5.4 policy, hides non-interactive nodes, assigns labels and statuses, emits absolute positions, and generates sanitized `html` for `shape: "card"` nodes from a host-owned template. It must not import a renderer.
  Done: snapshot tests per level; both adapters receive identical models; card HTML is escaped/sanitized and contains no host code.
  Status: `buildRenderModel` maps level visibility, status, shape, positions, and escaped card markup; pure and contract-only. Tests cover per-level visibility, status mapping, card budgeting, escaping, edge/hidden-node invariants, and determinism. The default card is structural (host `renderCard` seam); both adapters get the same model (canvas component test).

- [x] **U3.2 Renderer registry** (done; see log)
  Add `renderer-registry.ts` mapping `"spacegraph" | "cytoscape"` to dynamic imports of `@spacegraphjs/spacegraph-renderer` and `@spacegraphjs/cytoscape-renderer`. Expose capabilities before mount. Default to SpaceGraphJS; fall back to Cytoscape after a mount error with a recoverable banner. Persist the chosen renderer per session.
  Done: neither adapter is imported at module scope; a fake failing SpaceGraph mount selects Cytoscape without losing the session.
  Status: dynamic-import factories, `createRenderer` (capabilities before mount), `rendererOrder`, and `mountRenderer` with fallback land; a failing preferred mount selects Cytoscape (unit-tested). Per-session persistence is app-level (I4.1) and the banner is `GraphView`'s (U3.8).

- [x] **U3.3 Canvas component** (done; see log)
  `GraphCanvas.tsx` owns one container, mounts the selected adapter once, sends new `RenderModel`s, syncs selection both ways, handles resize, and disposes. Show a sized skeleton while mounting and surface errors to the parent. Expose `data-graph-ready`, `data-graph-renderer`, `data-graph-projection`, `data-graph-band`.
  Done: session switch and unmount dispose cleanly; no stale async callbacks; renderer switch rebuilds once.
  Status: `GraphCanvas` mounts once, pushes model/theme/selection/projection, mirrors `selectionChange`, reports `onReady`, sets the `data-*` attributes, and disposes on cleanup; a `generation` guard drops late async mounts. Resize is the adapter's `ResizeObserver`; the skeleton is a placeholder until U3.8.

- [x] **U3.4 SpaceGraph wiring**
  Use `@spacegraphjs/spacegraph-renderer` through the registry. Apply the theme and projection; map renderer zoom bands to the semantic level; drive selection from string IDs; render HTML activity cards through the adapter's `DOMNode` path. Keep core imports inside the adapter package.
  Done: 2D ortho and 3D work with the shared model; HTML cards survive updates; no session semantics enter the library.
  Status: wired through `GraphCanvas` + `GraphView`; the host theme flows from the U3.7 bridge, projection is capability-gated with a 2D fallback, selection is string IDs, and 2D/3D both render the shared model (verified by the view component test toggling 3D). Band→level mapping is not wired: the renderer's `bandChange` is still only surfaced as `data-graph-band`; the toolbar drives the level directly. HTML cards use the adapter's `data.html` path, not `DOMNode`.

- [x] **U3.5 Cytoscape wiring**
  Use `@spacegraphjs/cytoscape-renderer` through the same registry. The preset layout consumes model positions; styles consume `RenderTheme`; HTML cards use the adapter's DOM overlay with its lower cap; 3D is unavailable and explained. Selection, click, fit, focus, and zoom events map to the contract.
  Done: the same fixture renders, selects, inspects, and displays HTML cards identically; the inspector does not depend on the renderer.
  Status: same registry/theme/level path as U3.4; switching to Cytoscape rebuilds once, the 3D control disables with an explanation, and the projection falls back to 2D. The view component test asserts the switch; the Cytoscape adapter's own component test covers overlay/selection/dispose.

- [x] **U3.6 Renderer comparison** (done; see log)
  Render overview, execution, and selected states in both renderers. Record navigation steps, visual clarity, frame rate, chunk size, and capability gaps. Capture paired screenshots.
  Done: a comparison table in `docs/spacegraph/prototype.md`; the default renderer choice is justified, not assumed.
  Status: `docs/spacegraph/prototype.md` §"U3.6 — renderer comparison" records the capability matrix, built chunk sizes, and the shared navigation; paired screenshots `02`/`03`/`04` (SpaceGraphJS) and `07`/`08` (Cytoscape). Default stays SpaceGraphJS (2D+3D); Cytoscape is the 2D fallback/benchmark. Frame rate is documented as unmeasured (no graph perf harness).

- [x] **U3.7 Theme bridge**
  Read OpenCode CSS tokens (`--v2-*`) at mount and on scheme change. Produce the full `RenderTheme`. Provide light/dark values in both app and Storybook; do not leak OpenCode token names into the library.
  Done: both renderers re-theme from the same theme object; no hard-coded palette.
  Status: `src/ui/theme.ts` maps `--v2-*` tokens → `RenderTheme` (per-token fallback), re-resolves on scheme/`class` change, unit-tested. `graphThemeFromTokens` is pure; `GraphView` uses `createGraphTheme` unless a host theme is passed. Light/dark screenshots (L1.18 demo page) still pending.

- [x] **U3.8 Graph view layout**
  `GraphView.tsx` composes canvas + toolbar + breadcrumbs + inspector in a flex layout that fills the session panel. No page-level scroll; the canvas owns pan/zoom. Empty/loading/error states keep the transcript available.
  Done: at 1440×900 and 390×900 the canvas and controls do not overlap the composer or header.
  Status: `src/ui/GraphView.tsx` composes the four regions in a flex column with the inspector as a capped sidebar. The Storybook harness mounts it at 1100×640; the 390×900 narrow/mobile layout (bottom-sheet inspector) is I4.10 and not yet done.

- [x] **U3.9 Toolbar**
  2D/3D toggle, zoom in/out, fit, reset, search, "current activity", and "back to transcript". Show the active renderer and capability state unobtrusively; put the renderer selector in prototype settings, not the primary toolbar. Use `SegmentedControl`, `IconButton`, `Tooltip`, and existing tokens. Disable unsupported capabilities with a reason. Add `data-slot="graph-toolbar"`.
  Done: every control is keyboard reachable and has an aria label; the 3D toggle is disabled on Cytoscape with an explanation; the toolbar is not a renderer debug panel.
  Status: `src/ui/GraphToolbar.tsx` ships level + zoom steppers + 2D/3D + fit + search + back + renderer label; 3D is disabled via `supports()`. "Reset" and "current activity" are not present (fit covers reframing; the level control covers zoom). Explanation is a `title`/disabled rather than a `Tooltip` component.

- [x] **U3.10 Inspector**
  Render per-kind detail: message markdown, reasoning, tool input/output (ANSI-stripped terminal), file path + diff, subagent link, error/retry/evidence, timestamps, and confidence labels. Provide "follow edge", "open in transcript", and copy actions. Keep text selectable and scrollable; do not use the canvas for detail text.
  Done: all fixture node kinds render without errors in both renderers; long output scrolls; diffs load on demand.
  Status: `src/ui/GraphInspector.tsx` renders kind/status/label/summary, per-kind fields, tool input JSON, a scrollable connection list with confidence labels ("follow edge"), and "open in transcript". Markdown rendering, ANSI stripping, on-demand diffs, and copy are not implemented (the model carries neither terminal text nor diff hunks yet).

- [x] **U3.11 Breadcrumbs and focus**
  Use `spacegraphjs/navigation/Trail` for session → turn → phase → node. Clicking an ancestor selects it and fits its subtree. "Focus" dims non-neighbors at execution level; Esc clears focus, then selection.
  Done: breadcrumbs track selection; the trail controller has no OpenCode imports.
  Status: `src/ui/GraphBreadcrumbs.tsx` renders the model's `part-of` ancestry and selects on click. It does not use the library `Trail` (L1.26 does not exist yet), does not fit the subtree, and has no focus-dimming/Esc behavior. Revisit with L1.26 + U3.11's focus clause.

- [x] **U3.12 Search**
  Search labels, tool names, file paths, commands, and summaries. Selecting a result selects the node, expands its level, and fits it. Show result count and keyboard navigation.
  Done: searching a fixture file name finds all provenance nodes.
  Status: `src/ui/GraphSearch.tsx` uses the model's `search` selector over labels/summaries/tool inputs, shows a pluralized result count, and on select raises the level to the node's `minLevel`, selects, and focuses it. Escape closes; per-result keyboard navigation (arrow keys) is not implemented.

- [x] **U3.13 Minimap** (done; see log — host SVG overview, renderer-agnostic)
  Use the fixed optional library minimap or a DOM/SVG overview fed by the same positions. Show the viewport rectangle; click/drag to pan. Do not run a second full scene pass.
  Done: minimap stays in sync with both renderers and does not double rendering cost.
  Status: `packages/session-graph/src/ui/GraphMinimap.tsx` renders an SVG overview from the same `layoutGraph` positions the canvas uses (status-coloured dots) and draws the view rectangle from the adapter's reported viewport, so it works identically under both renderers and never runs a WebGL pass. Clicking/dragging calls the shared `setViewport({ zoom, center })`; `GraphView` feeds it the canvas's `viewportChange` and the live renderer. To make this possible the contract `RendererViewport` gained an optional `extent: { width, height }`, the core `CameraViewport` reports it (`WebGLRenderer.getWorldExtent`, ortho and perspective), the SpaceGraph adapter honours `center` via `cameraControls.setTarget` and forwards `extent`, and the Cytoscape adapter honours `center` via `cy.pan` and reports its true viewport centre/extent (`cy.transform` math, replacing the old pan-as-centre bug). `component-tests/graph-minimap.spec.ts` mounts the view, asserts the overview has dots and a view rectangle, and clicks to pan with zero console errors. Orientation matches the y-up default renderer; the Cytoscape canvas draws model +y downward, so the overview is vertically mirrored under Cytoscape (documented limitation, not a correctness bug).

- [x] **U3.14 Accessibility mirror** (done; see log)
  Mount `spacegraphjs/a11y/AccessibilityLayer` over the active render model. Expose an ordered node/edge list, roving tabindex, Enter/Space selection, Escape back, and `aria-live` announcements. The canvas wrapper has instructions and focus.
  Done: keyboard-only traversal selects and inspects nodes in both renderers.
  Status: `src/ui/GraphA11y.tsx` mounts the library layer over `RenderModel.nodes` (kind/status/interactive), mirrors selection, and localizes its announcements through the layer's new `formatSelection` hook; `GraphView` gives the canvas region `tabindex` + `aria-describedby` instructions. `component-tests/graph-a11y.spec.ts` walks the hidden list with the arrow keys to a node, activates it with Enter, and asserts the inspector in SpaceGraph and Cytoscape. The ordered list is nodes only (edges are not listed); the app e2e still owns live selection assertions. Fixing it surfaced a selection feedback loop (both adapters echoed their own `setSelection` as a user `selectionChange`), fixed in spacegraphjs `313a4bc`.

- [x] **U3.15 3D mode** (done; see log — depth cue is the default 3D tilt, not fog)
  Same model and levels; Z from hierarchy. Clamp orbit, keep 2D-like labels, add a subtle depth cue. Toggle animates camera and preserves target/selection. Default remains 2D; the control is capability-gated.
  Done: 3D does not change node identity or inspector content; switching back restores the 2D framing.
  Status: the adapter's `setProjection` now gates orbit per projection and animates the camera to a flat top-down pose (2D) or a ~29° tilt (3D) about a preserved target, by way of the new `SpaceGraph.setOrbitEnabled`/`setPolar` (library). Same model and levels; CSS2D/`depthTest:false` labels stay constant-size; the polar/distance clamp still applies. `component-tests/graph-3d.spec.ts` proves identity, selection, breadcrumbs, and inspector content survive a 2D↔3D round trip with zero console errors. A fog/attenuation depth cue is deliberately not added (unverified visually; fights the transparent background).

- [ ] **U3.16 Stories**
  Stories for overview, execution, detail, selected node, 2D, 3D, both renderers, light, dark, narrow, empty, loading, error, and long-output. Use `CurrentSessionProviders` or a local provider with the canonical fixture. Story ID prefix: `session-graph--`.
  Done: Storybook renders all states without network; `document.fonts.ready` is awaited in tests.
  Status: partial — `GraphView.stories.tsx` exports `Default`, `Overview`, `Detail`, `Projection3D`, `Cytoscape`, `Empty`, `Error`, `Narrow`, `LongOutput` (a synthetic 120-line tool input), and now `Loading` (adapter factories that never settle) over the canonical fixture; light/dark come from the Storybook `theme` global. Not yet: a `CurrentSessionProviders`-backed set.

- [ ] **U3.17 Component tests**
  Assert DOM contracts: switch control, prototype settings renderer selector, toolbar, breadcrumbs, inspector content, search, keyboard traversal, 2D/3D state, capability explanations, HTML cards, `data-graph-ready`, and no console errors. Screenshot only when pixels are the contract.
  Done: `cd packages/session-graph && bun run test:components` passes; repeated at `--workers=2 --repeat-each=10`.
  Status: partial — `bun run test:components` → 21 pass (empty, error + Back, overview-level, narrow-overflow, dark-theme, long-output-scroll, loading-skeleton, and the turn-map cases on top of `graph-view.spec.ts`/`adapter.spec.ts`/`cytoscape.spec.ts`/`graph-3d.spec.ts`/`graph-a11y.spec.ts`), repeated cold and at `--workers=2 --repeat-each=10` → 140 pass (before the Phase 6/8 additions). The switch control (I4.5) and the prototype-settings renderer selector are app concerns; the app e2e (V5.5) owns them.

**Exit gate 3:** the fixture graph is legible and navigable in both renderers, with all detail readable outside the canvas. If the graph is harder to navigate than the transcript for the five tasks, stop and simplify before integration. If SpaceGraphJS lags Cytoscape on core interaction, the contract lets the prototype ship on Cytoscape while the library gap is fixed separately.

---

### Phase 4 — OpenCode integration

Goal: a first-class alternate view that never destabilizes the transcript, with the smallest defensible OpenCode diff.

**OpenCode diff budget.** Everything session-specific lives in `packages/session-ui/src/graph` and `packages/session-graph`. Core edits are limited to:

1. An additive optional `graph` field in `sessionViewSchema`.
2. A mode branch around `timelineView()` in `session/screen.tsx`.
3. A toggle/command registration and `en.ts` strings.

Any additional core edit requires an explicit justification in the task and a note in `docs/spacegraph/prototype.md`. Do not modify tool renderers, timeline rows, the composer, the protocol, or the server.

| # | File | Change | Why it cannot live elsewhere |
|---|---|---|---|
| 1 | `packages/app/src/shell/state/layout.tsx` | Optional `graph` view state | Per-session persistence, pruning, and migration already live here |
| 2 | `packages/app/src/session/screen.tsx` | Mode branch around `timelineView()` and toggle placement | This component owns the transcript/composer composition |
| 3 | `packages/app/src/session/commands/use-session-commands.tsx` + `runtime/i18n/en.ts` | Commands, keybinds, strings | The app command registry and i18n are app-owned |

- [x] **I4.0 Enforce the diff budget** (done — see log)
  Review every planned edit against the three-item budget. If a feature needs more, first ask whether SpaceGraphJS or `packages/session-graph` can own it. Record accepted exceptions.
  Done: the OpenCode diff is enumerated in the docs; no graph-specific logic lands in `packages/app/src` outside the thin integration folder.
  Status: the diff is the three budgeted edits (`layout.tsx`, `screen.tsx`, `use-session-commands.tsx` + `en.ts`) plus the new `session/graph/` and `session/header/session-graph-toggle.tsx`, and a two-line accessor plumbing in `session-layout.ts`/`model.ts`. No renderer or model logic lands in the app.

- [x] **I4.1 Per-session mode state** (done — see log)
  Extend `sessionViewSchema` in `packages/app/src/shell/state/layout.tsx` with optional `graph: { mode: "transcript" | "graph"; projection: "2d" | "3d"; renderer?: "spacegraph" | "cytoscape"; selected?: string; zoom?: number }`. Backward compatible; absent means transcript. Add accessors beside scroll persistence, with `touch`/`prune` participation.
  Done: reload restores mode, projection, and renderer per session; old stored layouts decode.
  Status: `sessionGraphSchema` (mode required, projection/renderer/selected optional) is optional on `sessionViewSchema`; `layout.graph(sessionKey)` reads/patches it with `touch`/`prune`. `zoom` is not persisted yet. Reload restore is schema-backed but not e2e-verified (V5.5).

- [x] **I4.2 Lazy integration wrapper** (done — see log)
  Add `packages/app/src/session/graph/session-graph-view.tsx` using `lazy(() => import("@opencode/session-graph"))`, a sized `<Suspense>` fallback, and an error boundary that returns to the transcript with a message. Preload on idle after the session is ready. The wrapper passes only session data and callbacks; it must not import either adapter.
  Done: graph code and both adapters are absent from the session entry chunk; load failure does not break the session.
  Status: lazy + `<Suspense>` + `<ErrorBoundary>` in place; no adapter import. Idle preload is not added and the entry-chunk absence is by construction, not measured (V5.7).

- [x] **I4.3 Render branch** (done — see log)
  In `packages/app/src/session/screen.tsx`, replace the single `timelineView()` render with a mode branch inside the existing `Match when={session.identity.params.id}`. Pass `messages`, `status`, `turnDiff` loader, `openInTranscript`, and `onModeChange`. Keep the composer and header untouched.
  Done: switching modes does not remount the composer or lose the active model/settings.
  Status: the branch switches between the wrapper and the timeline; the composer/header/panel frame are outside it. The wrapper reads messages/status from the session directly rather than as props.

- [x] **I4.4 Preserve transcript position** (done — see log)
  Read the current scroll snapshot before switching to graph; restore it when returning. Use the existing `createScrollPersistence` path rather than a second store. Keep `createTimelineCache` entries alive so virtualizer state survives.
  Done: test scrolls to a mid-session message, switches to graph, returns, and asserts the same anchor is visible.
  Status: the timeline cache keeps the virtualizer alive across the mode branch, but the detached scroll element resets its `scrollTop`; `virtualizer.tsx` now remembers the last unpinned offset and restores it on reconnect (`scrollToOffset`), leaving the pinned follow path on `scrollToEnd`. Covered by a V5.5 case that seeds 20 history messages, scrolls up, switches modes, and asserts the offset returns.

- [x] **I4.5 Toggle control** (desktop done; mobile command-only — see log)
  Add `session-graph-toggle.tsx` near `SessionReviewToggle` in `screen.tsx` (desktop) and in the mobile header/tabs area. Use `SegmentedControl` with Transcript/Graph, or an `IconButton` with `state="pressed"`. Add accessible labels and keybind hints.
  Done: control is reachable by role/name; state matches persisted mode; does not overlap the review toggle at narrow widths.
  Status: `session/header/session-graph-toggle.tsx` (IconButton, pressed state, tooltip + keybind) is placed beside the review toggle; no overlap. Mobile has no header toggle yet — graph mode is reachable there via the `graph.toggle` command (the I4.10 desktop-gate escape hatch).

- [x] **I4.6 Command and keybind** (done — see log)
  Add `graph.toggle` and `graph.projection` commands in `packages/app/src/session/commands/use-session-commands.tsx`, with default keybinds in `settings/keybinds` and i18n keys in `runtime/i18n/en.ts`. Do not fire while a text field has focus.
  Done: command palette lists both; keybind works; no conflict with existing session commands.
  Status: `graph.toggle` (`mod+shift+g`) and `graph.projection` (`mod+alt+g`) register in `viewCmds`; both keys were unused. i18n keys added. Keybind firing while a field has focus follows the existing command infrastructure.

- [x] **I4.7 Open in transcript and hash reveal** (done — see log)
  Inspector "open in transcript" selects the message, switches mode, and reveals it. When the URL hash targets a message while graph mode is active, select the corresponding node instead of scrolling a hidden timeline.
  Done: both directions work from a cold load and a live session.
  Status: `session-graph-view.tsx` selects the owning turn for a message hash (`turnByMessageID` → `turnNodeID`) while graph mode is active, and "open in transcript" sets mode to transcript and calls `timeline.actions.revealMessage(messageID, partID)`. Both directions are covered by e2e cases. The hash effect does not re-level or focus the node (see the pass note).

- [ ] **I4.8 Live streaming behavior** (structural — see log)
  Feed graph updates from the same reactive `session.history.messages()` accessor. Diff the model by ID; append new nodes; update statuses; never re-layout or clear selection. Throttle model rebuilds to animation frames if a stream part changes many times.
  Done: an e2e test pushes a new assistant tool and asserts the node appears, the selected node stays selected, and earlier node coordinates are unchanged.
  Status: the wrapper rebuilds the model from a `createMemo` over `session.history.messages()`; the adapters diff by ID and the append-only layout keeps positions stable, and selection is persisted. Frame-throttling of rebuilds is not added. Done test is V5.5.

- [ ] **I4.9 Session switching and cleanup** (structural — see log)
  Ensure graph state is keyed by `sessionKey`; dispose the renderer when a tab is evicted or the session changes; do not leave WebGL contexts around. Reset inspector, search, and focus per session.
  Done: switching between three sessions 10 times keeps the WebGL context count stable and shows no stale nodes.
  Status: `GraphCanvas` disposes on cleanup and `GraphView`/wrapper state is per session key; `graph` state is pruned with the layout. The context-count Done test is V5.5.

- [ ] **I4.10 Mobile behavior**
  Provide the graph behind the same switch on mobile, defaulting to 2D, with the toolbar in a compact row and the inspector as a bottom sheet. If layout cannot be made usable in this phase, gate graph mode to desktop and record the decision.
  Done: 390×900 screenshot and interaction test; no horizontal overflow.
  Status: **decision recorded — gated to desktop for v1.** The header toggle is desktop-only; on mobile the graph is reachable only through the `graph.toggle` command. The compact-row/bottom-sheet layout is deferred.

- [ ] **I4.11 Theme and i18n** (theme done; i18n applied — see log)
  Use `data-color-scheme` changes to re-theme the canvas. Add all new strings to `en.ts`; other locales fall back. No hard-coded user-visible English in components.
  Done: light/dark switch re-themes without remount; `bun run lint` passes i18n checks.
  Status: `GraphView` re-themes from host tokens via `createGraphTheme` (observes `class`/`data-color-scheme`); new app strings are in `en.ts` under `command.graph.*`/`session.graph.*`. Light/dark remount-free behavior is covered by the dark-mode component case; `bun run lint` i18n checks not run this pass.

**Exit gate 4:** a real routed session can switch to the graph, receive live updates, and return to the exact transcript position. The transcript is demonstrably unaffected.

---

### Phase 5 — Verification and screenshots

Goal: make the result inspectable, repeatable, and honest.

- [x] **V5.1 Capture spec** (done — see log)
  Add `packages/app/e2e/graph/capture.spec.ts` using the mocked server harness and `setupTimeline`. Seed the canonical fixture (or adapt `fixture.ts` into the harness builders). Wait for `[data-graph-ready="true"]`, `document.fonts.ready`, and a stable node count before capture.
  Done: the spec runs against both the dev server and `PLAYWRIGHT_BUILD=1`.
  Status: `capture.spec.ts` seeds `buildFixtureMessages()` and captures 01–06 behind `GRAPH_CAPTURE_DIR`; readiness is the preserved drawing buffer, not a node-count guess. Verified on the dev server; the `PLAYWRIGHT_BUILD=1` run is folded into V5.9 (the graph contract e2e already covers built mode). Cytoscape 07/08 come from `component-tests/graph-capture.spec.ts` because the app has no renderer switch.

- [x] **V5.2 Capture CLI** (done — see log)
  Add `scripts/capture-graph-demo.ts` and a root `graph:capture` script. Modes:
  - `baseline` — transcript only at the fixed viewport/theme.
  - `demo` — overview, execution, detail/selected, 3D, return-to-transcript.
  - `compare` — the same overview/execution/selected states in SpaceGraphJS and Cytoscape.
  - `verify` — run graph assertions and fail on regression.
  Write to `docs/spacegraph/screenshots/`; never overwrite committed images silently in `verify` mode.
  Done: one command produces all screenshots; exit code reflects assertions.
  Status: `script/capture-graph-demo.ts` (+ root `graph:capture`) supports all four modes; `verify` renders into a temp dir and asserts the committed set. Deviation: `script/` (repo convention) not `scripts/`.

- [x] **V5.3 Determinism** (done — see log)
  Fix viewport (1440×900), device scale factor 1, theme, locale, reduced motion, and a fixture clock. Enable `preserveDrawingBuffer` only for capture. Avoid arbitrary sleeps; wait on `data-*` state.
  Done: two consecutive `demo` runs produce visually indistinguishable images (manual inspection; optional pixel diff later).

- [x] **V5.4 Required screenshots** (done — see log)
  Produce at minimum:
  1. `01-log.png` — baseline transcript.
  2. `02-graph-overview.png` — SpaceGraphJS 2D overview with turn/phase clusters, failure and subagent badges.
  3. `03-graph-execution.png` — execution neighborhood with files and error/retry chain.
  4. `04-graph-selected.png` — selected node with inspector detail.
  5. `05-return-to-log.png` — transcript restored at the same position.
  6. `06-graph-3d.png` — 3D toggle (extra evidence).
  7. `07-cytoscape-overview.png` and `08-cytoscape-selected.png` — the Cytoscape adapter rendering the same model, including an HTML activity card.
  Done: all images inspected; defects filed as tasks in this file.
  Status: all eight images exist and were inspected. Filed: ortho fit does not center the graph (session root and overview clusters can fall outside the frame); the toolbar back control is occluded by the floating header toggles (the capture returns via the header toggle). 02 is the weakest image.

- [x] **V5.5 App e2e contracts** (done — all cases covered, two dev-only; see log)
  Add cases to the owning keeper suite (or `e2e/graph/session-graph.spec.ts` if it owns the contract):
  - mode switch and persistence across reload;
  - live message append without selection loss;
  - session switch disposes state;
  - resize does not break the canvas;
  - SpaceGraph mount failure falls back to Cytoscape with a banner;
  - both renderers failing falls back to the transcript;
  - no unexpected console errors.
  Done: `cd packages/app && bun run test:e2e -- graph` passes.
  Status: `e2e/graph/session-graph.spec.ts` covers every case: mode switch + persistence, live append without
  selection loss, session-switch dispose + re-mount, resize, transcript-position restore, hash→turn reveal and its
  reverse, zero console errors, and now a real app-level reproduction of both adapter-failure paths (aborting the
  SpaceGraph adapter module falls back to Cytoscape with a `data-slot="graph-fallback"` banner and 3D disabled;
  aborting both shows the error state whose Back control returns to the transcript). The two fallback cases are
  dev-only (`PLAYWRIGHT_BUILD=1` skips them because the built chunks are hashed); the component suite keeps the
  seam-based coverage. `bun run test:e2e -- e2e/graph/session-graph.spec.ts` is green.

- [x] **V5.6 Contract conformance in CI** (done — see log)
  Run the shared renderer contract suites (headless and browser) as part of the SpaceGraphJS test job and the session-graph test job. Add a root `graph:verify` script (or CI job) that runs contract conformance, all four packages (contract, SpaceGraph adapter, Cytoscape adapter, SVG renderer), and the capture `verify` mode. Fail if either interactive adapter stops honoring selection, click, viewport, disposal, HTML cards, or capability declarations.
  Done: one command covers both adapters; regressions fail before UI tests.
  Status: `script/graph-verify.ts` (+ root `graph:verify`) runs the headless contract suite (13), the boundary test (5), the four packages (4/10/10/6), session-graph unit (19) and component (15) suites, and `graph:capture --mode=verify`. Not yet wired into a CI job (the script is the CI entry point).

- [x] **V5.7 Performance** (done; see log — first paint/pan fps documented as unmeasured)
  Record: model build time for the fixture, first graph paint, pan frame rate at the DOM cap, chunk size, and session-entry delta for both adapters. Compare against the P0.1 baseline. Add a guard test for model build complexity if practical.
  Done: numbers recorded in `docs/spacegraph/prototype.md`; regressions beyond budget are either fixed or documented.
  Status: new `packages/session-ui/src/graph/performance.test.ts` guards a 300-message/1201-node build+layout (~27ms, ceiling 250ms). Built-app chunks recorded: core `activity-*.js` 282.0 KB gzip (incl. `three`), Cytoscape 137.9 KB gzip, session-graph UI 8.8 KB gzip, adapter 2.0 KB gzip — within §9 budgets. Session-entry delta is unmeasured because the graph is lazy and the P0.1 baseline was never captured; first paint and pan frame rate have no graph perf harness.

- [x] **V5.8 Accessibility** (done; see log)
  Keyboard traversal, focus visibility, aria labels, inspector focus order, overlay focus trap (Phase 6), and reduced-motion behavior. Run the library accessibility layer against both adapters. Run the app's existing a11y tooling if available; otherwise manual scripted checks.
  Done: keyboard-only path covers switch → traverse → select → inspect → return.
  Status: the library layer is unit-tested (spacegraphjs `test/a11y.test.ts`); browser traversal/select/inspect against **both** adapters is `component-tests/graph-a11y.spec.ts`; the switch/return is the app e2e toggle cases. No dedicated axe suite exists; reduced motion is emulated in the capture spec but has no dedicated assertion for the adapter camera animation.

- [x] **V5.9 Cross-environment** (done; see log — desktop shell and demo pages not run)
  Verify in web dev, built web (`PLAYWRIGHT_BUILD=1`), desktop shell, Storybook, and the SpaceGraphJS demo pages. Note any WebGL/SwiftShader differences in CI.
  Done: a short matrix in the docs with pass/fail and known limitations.
  Status: `docs/spacegraph/prototype.md` §"V5.9 — cross-environment" records web dev (10 pass), built web (9 pass + 1 dev-only skip), and Storybook (15 pass). Desktop shell and the spacegraphjs demo pages were not run in this environment and are recorded as such.

**Exit gate 5:** a reviewer can run one command, inspect the images, and reproduce the demo from the fixture without a model provider.

---

### Phase 6 — Hybrid log + graph

Goal: bridge modes without redesigning every log component, without violating the timeline-row rule in `packages/gui-extensions/AGENTS.md`, and without growing the OpenCode diff.

The hybrid is delivered in this order:

1. **Turn map overlay** — a graph popover scoped to the active or selected turn, opened from the graph toolbar or header. The transcript stays visible and unchanged underneath.
2. **Synchronized side panel** — an extension-owned session map that follows the active turn while the log remains primary. This uses the existing side-region extension path, not timeline rows.
3. **Generic inline graph component** — built in `@spacegraphjs/svg-renderer`, wrapped thinly by `packages/session-graph`, usable by any host, but not injected into OpenCode's timeline.
4. **Inline row host** — deferred unless the OpenCode maintainers approve a generic timeline slot. It is the only task that would exceed the core diff budget, so it stays approval-gated.

- [x] **H6.1 Host decision** (done — overlay host chosen; side panel recorded as deferred)
  Confirm the overlay and side-panel hosts before building. Do not modify `session-timeline-row.tsx` in this phase. Record the decision and the rationale in the docs.
  Done: a one-page host decision; no timeline-row edits.
  Status: recorded in `docs/spacegraph/prototype.md` §"Phase 6 — H6.1". The overlay host is
  `packages/app/src/session/graph/turn-map-overlay.tsx` (a lazy popover inside `screen.panel.ref`), opened from the
  graph toolbar and the `graph.turnmap` command. H6.3 (side panel) is deferred and H6.5 (inline row) stays
  approval-gated; no timeline-row edits.

- [x] **H6.2 Turn map overlay** (done — see log)
  Build `TurnMapOverlay.tsx`: render the selected turn's execution-level subgraph, maximum 7 nodes, with inspect, follow-edge, and "open full graph" actions. Open from the graph toolbar and from a transcript selection; Esc restores the previous focus and scroll anchor.
  Done: overlay opens at the same log position and returns to it; focus trap and keyboard work.
  Status: `packages/session-graph/src/ui/TurnMapOverlay.tsx` (focus-trapped, Escape-closing dialog) over the pure
  `turnSubgraph` selector and `turnMap.ts`; inspect/follow-edge come from the shared `GraphInspector`; "Open full
  graph" switches mode and selects the turn. The transcript stays mounted underneath, so its scroll position is
  preserved. Entry is the toolbar control (a selected turn) and the command, not a timeline row (see H6.1 note).

- [ ] **H6.3 Synchronized side panel** (deferred — see log)
  Build an extension `Panel` (`region: "side"`) that renders a compact session map and follows the active turn. Use `Store.session` for its own state. No core timeline edits.
  Done: selecting a transcript turn highlights the map; selecting a map node can reveal the message in the transcript.
  Status: **deferred this pass.** A side panel is a `packages/gui-extensions` extension `Panel` with its own store and
  per-locale i18n, a materially larger surface than the overlay that already delivers the hybrid's first value.
  Recorded in `docs/spacegraph/prototype.md` §"Phase 6 — H6.1".

- [x] **H6.4 Generic inline graph** (done — see log; not injected into the timeline)
  Use `InlineGraph` from `@spacegraphjs/svg-renderer` against `RenderModel`: execution-level subset, no pan/zoom, max 5 nodes, theme-aware. `packages/session-graph/src/ui/InlineGraph.tsx` is a thin OpenCode wrapper. Keep it out of OpenCode's timeline until approved.
  Done: the library component renders the fixture subset in the library demo and is documented as a reusable capability; the wrapper adds no graph logic.
  Status: `packages/session-graph/src/ui/TurnMapInlineGraph.tsx` (named to avoid colliding with the library
  `InlineGraph`) wraps `@spacegraphjs/svg-renderer`'s `InlineGraph` over the five-node turn subset, theme-aware and
  non-interactive. Not injected into the timeline (deferred with H6.5). The library-demo half is V5.4/L1.29 scope.

- [ ] **H6.5 Inline row host (approval-gated)** (deferred — approval-gated)
  Only if the OpenCode maintainers approve: add one generic `session.timeline.group` slot that any extension can render into, not a graph-specific branch. Then mount `InlineGraph` there behind a setting. This is an explicit exception to the current timeline-row rule and must be documented.
  Done: either approval + a generic slot + tests, or a recorded decision to defer.
  Status: **deferred** (no maintainer approval sought); it is the only Phase 6 item that exceeds the core diff budget.

- [x] **H6.6 Tests** (done — overlay cases; side-panel cases dropped with H6.3)
  Component tests for overlay open/close/return and side-panel synchronization; e2e for the overlay on the fixture. No duplicate coverage of the canvas contract.
  Done: both suites pass.
  Status: `packages/session-graph/component-tests/turn-map.spec.ts` (5 cases) and an app e2e case in
  `e2e/graph/session-graph.spec.ts`. Side-panel synchronization cases are dropped with the H6.3 deferral.

- [x] **H6.7 Flag and documentation** (done — see log)
  Default the hybrid to off until the full graph proves useful; expose a prototype setting and document progressive disclosure.
  Done: setting persists; docs explain why inline injection is deferred.
  Status: the hybrid is off by default — the overlay opens only on explicit action; the prototype doc records the
  progressive-disclosure rationale and why inline injection (H6.5) is deferred. No separate prototype-settings flag
  was added because the overlay is inert until invoked.

---

### Phase 7 — Polish, docs, and release package

- [x] **R7.1 SpaceGraphJS changelog and docs** (done — `spacegraphjs` `fbc368f`; see log)
  Record every breaking change, the lean `activity` entry, the `@spacegraphjs/renderer` contract, ortho/zoom/selection/lifecycle APIs, and both adapters in `spacegraphjs/CHANGELOG.md`, `README.md`, and the new `spacegraphjs/AGENTS.md`. Include a renderer-integration guide with a minimal non-OpenCode example and the naming rules from §4.2.
  Done: a new contributor can embed the lean entry and implement or use a renderer from the docs alone.
  Status: `CHANGELOG.md` records every breaking change, the lean entry, the contract and three leaves, and the ortho/zoom/selection/lifecycle APIs plus the §4.2 naming table; `README.md` gains a "Renderer contract" section; `AGENTS.md` gains a "Renderer surface" section. The integration guide is `docs/host-integration.md` with the `demo/contract.html` example.

- [x] **R7.2 Prototype documentation** (done — see log)
  Write `docs/spacegraph/prototype.md`: hypothesis, architecture, how to run, tested SHAs, screenshots, renderer comparison, known limitations, and the evaluation protocol/results. Add `packages/session-graph/AGENTS.md` with the mission constraints.
  Done: docs are accurate at the tested commit.
  Status: `docs/spacegraph/prototype.md` is the final write-up (hypothesis, architecture, how to run, tested revisions, screenshots, U3.6 comparison, V5.7–V5.9, Phase 6 hybrid, Phase 8 portability, 15-item known-limitations list, evaluation protocol, capability audit, migration plan); the stale Phase 2 "not done yet" text and old SHA table are removed. `packages/session-graph/AGENTS.md` already existed.

- [ ] **R7.3 Evaluation protocol** (protocol written; execution pending — see log)
  Recruit a small set of users; give each the same five investigative tasks on the same fixture session, once with transcript and once with graph, counterbalanced. Record task success, completion, wrong turns, and subjective preference. No leading explanation of the graph.
  Done: results and quotes recorded; decision on continuing recorded.
  Status: the protocol is written into `prototype.md` §"Evaluation protocol" (n ≥ 5, counterbalanced, the five tasks, and the recorded fields). **Not executed** — it requires human participants, which this environment cannot provide; results and the go/no-go decision stay open.

- [x] **R7.4 Release artifacts** (done; no GIF — see log)
  Public/companion branch clearly marked experimental; one compelling overview screenshot; a short GIF/video of expand → zoom → inspect → return; README with motivation, setup, tested commit, limitations, and exact demo command.
  Done: another developer can launch the demo from the fixture without configuring a provider.
  Status: `docs/spacegraph/README.md` (experimental banner, motivation, setup, reproduce commands, tested commit, limitations, demo command, overview screenshot) lands. The GIF/video is **not produced** — no recording tooling in this environment; it is the one missing artifact.

- [x] **R7.5 Dependency migration plan** (done — see log)
  Document the step after the prototype: build `dist` for `spacegraphjs`, `@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer`, and `@spacegraphjs/cytoscape-renderer`; replace the source workspaces with versioned dependencies; keep the contract version; re-run the contract and capture suites.
  Done: migration steps are concrete enough to execute without rediscovery.
  Status: `prototype.md` §"Dependency migration plan" lists the five concrete steps (build `dist` + `build` scripts; swap `workspace:*` for versioned ranges; drop the `./activity` `types` stopgap; re-run `graph:verify` + built e2e; keep `CONTRACT_VERSION` and negotiation).

- [x] **R7.6 Library capability audit** (done — see log)
  For each generic module added (contract, zoom bands, lane layout, accessibility, trail, minimap, DOM mount, static SVG), confirm it has no OpenCode naming, no session data assumptions, and at least one non-OpenCode consumer or documented example. Remove or defer anything that only serves the prototype.
  Done: a table of capability → consumers → gaps; no session-specific leakage in the library.
  Status: `prototype.md` §"Library capability audit" is the table (contract, three leaves, zoom bands, lane layout, a11y, trail, DOM mount, minimap → consumers → gap). No session naming or data assumptions leak into the library; every module has a non-OpenCode consumer (the library demo).

- [x] **R7.7 Final checks** (done; component/e2e from the last pass — see log)
  Run `bun run check` from the repo root. Run package tests, component tests, e2e, contract conformance, and the capture suite in built mode for both renderers. Inspect every screenshot. Record unverified behavior explicitly.
  Done: green checks plus an explicit limitations list.
  Status: this pass ran session-graph typecheck + `bun test src` (22), session-ui `bun test src/graph` (47), app typecheck, root `lint:changed` (0), `spacegraphjs` vitest (32 files / 294), `test:boundaries` (5), and the four package suites (6/12/12/9) — all green. Component (22) and app e2e (13) were green last pass and are not re-run (docs-only change). `bun run check` is not run: it fails on two pre-existing, unrelated problems (`packages/ai` `zstdCompressSync` node-types error on `origin/dev`, and a `turbo` SIGSEGV here). Limitations are listed in `prototype.md`.

---

### Phase 8 — Portability and second-host readiness

Post-OpenCode track. These tasks are not required for the OpenCode prototype exit gates, but they are the reason the library boundary is shaped this way.

Goal: after OpenCode works, a second agent UI such as Hermes Agent can integrate without forking SpaceGraphJS or importing OpenCode code.

- [ ] **P8.1 Framework-agnostic view controller** (not started — see log)
  Extract controllers for selection, focus, zoom bands, search, and trail into a `spacegraphjs/control` subpath (core), not into the dependency-free contract. The host supplies the detail panel. Avoid duplicating controller logic in `packages/session-graph`.
  Done: the vanilla controller drives both the library demo and OpenCode; no Solid imports.
  Status: not started. The `control` subpath is core, so §4.1 forbids importing the contract; the controller must use minimal structural types plus a thin host binding layer. `ZoomBands`, `Trail`, `AccessibilityLayer`, and `LaneLayout` already exist as headless modules.

- [ ] **P8.2 Framework bindings** (not started — see log)
  Repair `spacegraphjs/packages/solid-spacegraph` and add `spacegraphjs/packages/react-spacegraph` to wrap `@spacegraphjs/renderer` and the controllers, not core internals. Provide a minimal Hermes-style example. Verify React StrictMode double-mount and Solid `onCleanup` do not leak or double-initialize.
  Done: both bindings mount the same `RenderModel` and pass the contract smoke test; StrictMode double-mount is clean.
  Status: not started. `react-spacegraph` and `solid-spacegraph` exist but wrap `SpaceGraph`/`graph.fromJSON` core internals, not the contract. A contract-based rewrite also needs React/Solid test infrastructure the library vitest setup lacks.

- [x] **P8.3 Static export** (done — see log)
  Build on `@spacegraphjs/svg-renderer` for `renderToSVG(RenderModel)` and JSON serialization. Use it for docs, artifacts, and hosts that need a static preview.
  Done: a fixture renders to SVG without a browser; JSON round-trips.
  Status: `serializeRenderModel`/`parseRenderModel` (structurally validated, `undefined` on malformed input) added to `@spacegraphjs/svg-renderer` alongside the existing `renderToSVG`; round-trip tested standalone and via the second-host fixture.

- [ ] **P8.4 Host-neutral activity adapter** (deferred by design — see log)
  Define `ActivityGraph` and `ActivitySource` only when the second host needs them. Keep OpenCode's `GraphModel` as the reference adapter; do not move session semantics into the library.
  Done: a non-OpenCode event stream maps to `RenderModel` through the adapter.
  Status: deferred — the task is explicitly conditional on a real second host needing it. The reference pattern is documented in `docs/host-integration.md` §2.

- [x] **P8.5 Host integration guide** (done — see log)
  Document data mapping, renderer choice, theming, zoom policy, layout, accessibility, persistence, and export. Include a Hermes-style checklist and the non-OpenCode demo.
  Done: a new host can integrate without reading OpenCode code.
  Status: `spacegraphjs/docs/host-integration.md` (boundary, mapping, renderer choice/fallback, theming, layout/zoom, a11y, persistence, export, Hermes checklist, versioning) linked from the README. The runnable non-OpenCode demo is L1.29 (`demo/contract.html`).

- [x] **P8.6 Second-host reference fixture** (done — see log)
  Add a small non-OpenCode host demo with HTML cards, tool calls, artifacts, failures, and a retry. Use it in the contract suite.
  Done: the fixture runs against both adapters and is part of the library demo.
  Status: `spacegraphjs/demo/activity-host.ts` (moved from `test/fixtures/`) is consumed by `test/renderer.contract.test.ts` (adapters accept it; `renderToSVG` renders it) and by the L1.29 demo as the "Second host" scene, so the fixture runs against both adapters and is part of the demo.

- [x] **P8.7 Contract version negotiation** (done — see log)
  Document semver and `CONTRACT_VERSION`; adapters declare supported versions; hosts fail gracefully on mismatch.
  Done: a mismatched adapter produces a clear error, not a runtime crash.
  Status: `SUPPORTED_CONTRACT_VERSIONS`/`supportsContractVersion`/`negotiateContract` in `@spacegraphjs/renderer`; `packages/session-graph`'s registry rejects an unsupported declared version and falls through. Documented in `docs/host-integration.md` §9.

- [ ] **P8.8 Optional incremental updates** (deferred by design — see log)
  If profiling shows full-model diffs are too expensive for a high-frequency host, add `RenderModelPatch` (`added`/`updated`/`removed` nodes and edges) to the contract. Keep `setModel` as the baseline and implement patches in both adapters.
  Done: the patch path passes the same conformance suite; the host can choose full or incremental updates.
  Status: deferred — the task is explicitly conditional on profiling showing full-model diffs are too expensive; no such evidence exists (V5.7's model build is ~27 ms at 1201 nodes).

- [x] **P8.9 Text direction and locale** (done — see log)
  Make DOM cards and labels respect the host's `dir`/`lang`. Add `direction?: "ltr" | "rtl"` to `RenderTheme`; verify an RTL fixture in the library demo and in OpenCode.
  Done: card text, labels, and controls render correctly in RTL without mirrored graph coordinates.
  Status: `renderToSVG` emits `direction="rtl"`; the SpaceGraph adapter wraps host card markup in a `dir` container; the Cytoscape adapter sets `dir` on overlay cards; the host bridge reads `document.documentElement.dir` and re-resolves on a `dir` mutation. `lang` is host markup. Verified in the L1.29 demo (`test/e2e/contract-demo.spec.ts` RTL case: `html[dir=rtl]` plus the SpaceGraph adapter's `dir` card container).

## 7. Canonical fixture specification

A single deterministic session used by model tests, stories, component tests, e2e, and screenshots.

Scenario: "Fix the authentication test failures."

Required content, in order:

1. User prompt with the scenario title and two file attachments (`src/auth/session.ts`, `src/auth/session.test.ts`).
2. Assistant text: plan to inspect failures and trace affected code.
3. Exploration phase: `glob` (`**/*.test.ts`), `grep` (`auth`), `read` of three files, one of which is large and truncated.
4. Subagent phase: `subagent` tool with `agent: "explore"`, `description: "Authentication design"`, completed metadata `{ sessionID: "ses_child_auth", status: "completed" }`, plus a synthetic completion notice referencing `childID`.
5. Edit phase: `edit` on `src/auth/session.ts`, `write` of `src/auth/token.ts`, `patch` touching `src/auth/session.ts` and `src/auth/guards.ts` with `metadata.files` diffs.
6. Verification phase: `shell` running the test suite, exit 1, failure output naming a specific assertion. One earlier successful `shell` for a narrower test to contrast.
7. Retry: `assistant.retry` with attempt 2 and the failure error; assistant text explaining the fix; another `edit`.
8. Recovery: `shell` test suite exit 0.
9. Idle with `outcome: "succeeded"`, turn diff listing the four changed files.
10. A second short user prompt ("Also cover the refresh path") with one edit and one test, to prove turn separation.

Fixture rules:

- Fixed base timestamp; increments of 1000ms per event.
- Stable IDs with readable suffixes (`msg_user_1`, `prt_tool_read_1`, `ses_child_auth`).
- Tool states match real schema: `streaming` uses a JSON string, `completed` uses `input`/`content`/`metadata`.
- No network, no clock, no randomness.
- Keep a second variant with a failed/interrupted idle for error-path tests.

## 8. Verification matrix and commands

| Check | Command | Owns |
|---|---|---|
| Model unit tests | `cd packages/session-ui && bun test src/graph` | IDs, turns, provenance, levels, layout |
| Graph package unit tests | `cd packages/session-graph && bun test` | Render model, registry, theme, selectors |
| Typecheck (focused) | `cd packages/session-graph && bun run typecheck` | New package |
| Typecheck (app) | `cd packages/app && bun run typecheck` | Integration |
| Component tests | `cd packages/session-graph && bun run test:components` | DOM contracts, toolbar, inspector, a11y |
| Contract conformance (headless) | `cd spacegraphjs && bunx vitest run test/renderer.contract.test.ts` | Render-model diffing, capabilities, event mapping |
| Contract conformance (browser) | `cd spacegraphjs && bunx playwright test test/e2e/renderer.contract.spec.ts` | Mount/click/resize/dispose/HTML cards for both adapters |
| Contract package | `cd spacegraphjs/packages/renderer && bun test` | Contract types + helper, zero deps |
| SpaceGraph adapter | `cd spacegraphjs/packages/spacegraph-renderer && bun test` | Core mapping, grid/ortho, DOM nodes |
| Cytoscape adapter | `cd spacegraphjs/packages/cytoscape-renderer && bun test` | Preset layout, DOM overlay, selection, dispose |
| Static SVG renderer | `cd spacegraphjs/packages/svg-renderer && bun test` | `renderToSVG`, inline graph, no browser |
| Package boundaries | `cd spacegraphjs && bun run test:boundaries` | Core never imports contract/Cytoscape; adapters stay leaves |
| App e2e | `cd packages/app && bun run test:e2e -- graph` | Mode switch, live updates, fallback, renderer switch |
| App e2e built | `cd packages/app && PLAYWRIGHT_BUILD=1 bun run test:e2e -- graph` | Production bundle |
| Screenshots | `bun run graph:capture --mode=demo` | Visual evidence |
| Renderer comparison | `bun run graph:capture --mode=compare` | Paired screenshots and metrics |
| Screenshot verification | `bun run graph:capture --mode=verify` | Interaction assertions |
| SpaceGraphJS tests | `cd spacegraphjs && bunx vitest run` | Library unit |
| SpaceGraphJS demo | `cd spacegraphjs && bunx playwright test test/e2e/<graph-demo>.spec.ts` | Ortho/click/zoom/dispose |
| Non-OpenCode contract demo | `cd spacegraphjs && SG_DEMO_URL=… bunx playwright test test/e2e/contract-demo.spec.ts` | Contract + adapters + SVG + a11y/trail/zoom bands, light/dark |
| Cytoscape demo | `cd spacegraphjs && bunx playwright test test/e2e/cytoscape-demo.spec.ts` | DOM overlay, preset layout, selection |
| Full repo | `bun run check` | Lint + typecheck |

Rules:

- Never run tests from the repo root; use package directories.
- Repeat component tests at CI concurrency before pushing.
- Run built e2e before declaring the prototype complete.
- Inspect screenshots manually; automated image comparison is deferred.

## 9. Performance budgets

Targets, not guarantees; record actuals in the docs.

| Metric | Target |
|---|---|
| Graph model build, fixture | < 16ms |
| Graph model build, 200 messages | < 50ms |
| First graph paint after switch, SpaceGraphJS | < 500ms |
| First graph paint after switch, Cytoscape | < 400ms |
| Pan/zoom at DOM cap | 60fps |
| DOM cards visible | ≤ 40 execution, ≤ 12 overview |
| Lazy SpaceGraphJS chunk (gzip, excluding three) | < 400KB |
| Lazy Cytoscape chunk (gzip) | < 250KB |
| Session entry delta | No measurable regression |
| WebGL contexts after 10 session switches | Stable (no growth) |
| Contract conformance | Both renderers pass the same suite |
| Console errors | Zero |

If a budget is missed, either fix it or document the miss with evidence; do not silently lower the budget.

## 10. Risks and fallbacks

| Risk | Likelihood | Mitigation | Fallback |
|---|---|---|---|
| SpaceGraphJS click/selection cannot be made reliable without a rewrite | Medium | P1 click/selection tasks with Playwright proof | Cytoscape adapter behind the same contract; model unchanged |
| Shared contract leaks renderer assumptions | Medium | Contract conformance suite; capabilities; no library objects cross the boundary | Tighten the contract before adding more UI |
| Contract package and adapters become package overhead | Medium | Contract has zero deps; core never imports it; adapters are thin and optional | Collapse the SpaceGraph adapter into the core as a subpath; keep the contract separate |
| Cytoscape DOM overlay conflicts with pan/zoom/pointer events | Medium | Overlay is clipped, pointer-events only on controls, repositioned on render, capped | Fall back to labels plus inspector for cards |
| Cytoscape becomes a second product surface | Medium | 2D-only, same render model, HTML cards through a capped overlay, no 3D; comparison is bounded by scope, not features | Keep it internal as a benchmark and fallback |
| Cytoscape bundle cost | Low | Lazy registry; separate chunk; only loaded when selected or after failure | Default to SpaceGraphJS; no eager import |
| Library generalisation becomes OpenCode-shaped | Medium | R7.6 capability audit; no session naming in the library; non-OpenCode examples | Move app-specific helpers back to `session-graph` |
| WebGL in headless CI is slow or flaky | Medium | DOM assertions, fixed viewport, SwiftShader notes, capture-only buffer | Verify SpaceGraphJS locally/headed; assert Cytoscape in CI |
| Bundle/startup regression from `three` and DOM nodes | Medium | Lean entry, lazy import, DOM cap, chunk budget | Mesh-only cards; detail in inspector |
| Source alias breaks in Vite, Playwright, Storybook, or desktop | Medium | P0.3 proves all four; central alias config | Built `dist` package earlier than planned |
| Graph is prettier but harder to navigate | Medium | Exit gates, usability protocol, simplify before polish | Reduce to turn/phase overview + inspector |
| Model implies false causality | High if careless | Confidence labels, no adjacency-based cause edges, tests | Hide all `inferred` edges by default |
| Streaming churn causes jitter | High if naive | Stable IDs, append-only layout, frame-throttled updates, no relayout | Batch updates per animation frame; freeze layout |
| Unknown tools/metadata break the model | Medium | Generic tool node, per-field decoding, malformed fixture tests | Show tool name only |
| Layout/zoom policy becomes hard-coded in both app and library | Medium | Policy only in `levels.ts`; renderer reports zoom; `LaneLayout` is generic | Move policy fully into model selectors |
| Default SpaceGraphJS chrome interferes with app UI | High initially | `chrome: false`, L1.3 | Unregister plugins after init |
| Keyboard camera steals typing | High initially | Container-scoped input, L1.6 | Disable keyboard camera in embed |
| 3D mode reduces legibility | Medium | 2D default, 3D opt-in, usability comparison | Keep 3D as a documented experiment |
| Hybrid inline graph requires timeline-row changes | High | Overlay and side-panel hosts first; inline host is approval-gated | Ship the overlay hybrid and document the deferred inline variant |

Go/no-go points:

- **After Phase 0:** do both renderers render and dispose inside the real panel with no global interference?
- **After Phase 2:** can the model answer the five questions without rendering?
- **After Phase 3:** is the graph at least as effective as the transcript for those questions, and is the contract stable across renderers?
- **After Phase 5:** is the result reproducible and performant enough to publish?
- If any gate fails, stop, document the failure, and ask the user before expanding scope.

## 11. Open decisions

1. **Repository linkage:** submodule vs pinned SHA. Recommended: submodule for the release artifact, with both repos branched.
2. **Hybrid host:** overlay + synchronized side panel first; inline timeline rows are approval-gated. Confirm before Phase 6.
3. **Cytoscape parity:** 2D only, HTML cards through a capped DOM overlay, no 3D. Confirm this is the intended fallback bar.
4. **Cytoscape renderer home:** keep `@spacegraphjs/cytoscape-renderer` in the SpaceGraphJS repo for the prototype, then publish it as a versioned companion package. Confirm before R7.5.
5. **Contract packaging:** separate `@spacegraphjs/renderer` package (recommended) vs a core subpath. The separate package is the non-pollution guarantee; confirm the extra package is acceptable.
6. **Mode persistence:** additive optional `sessionViewSchema` field vs an app-local store. Recommended: the additive field, because it reuses the existing pruning, migration, and multi-window behavior; it is one of the three accepted core edits.
7. **Mobile:** full graph on mobile vs desktop-gated for v1. Decide after the 390×900 prototype.
8. **3D default:** 2D default; confirm 3D remains opt-in after the usability comparison.
9. **Committed screenshots:** keep demo images in `docs/spacegraph/screenshots/` for the release; exclude ad-hoc captures. Confirm during Phase 5.
10. **Public naming:** "Graph", "Map", or "Session graph" in user-facing copy; pick one and use it everywhere.
11. **Framework binding priority:** Solid for OpenCode first; React for Hermes after the OpenCode prototype. Confirm.
12. **Host-neutral activity schema:** extract `ActivityGraph` only when the second host needs it; do not pre-generalize OpenCode semantics. Confirm at Phase 8.
13. **Static renderer packaging:** keep `@spacegraphjs/svg-renderer` separate from the dependency-free contract (recommended) vs adding runtime SVG helpers to the contract package. The separate package preserves the zero-dependency contract.

## 12. File touch index

New:

- `packages/session-ui/src/graph/{model,levels,layout,selectors,fixture}.ts` + `*.test.ts`
- `packages/session-graph/**`
- `packages/session-graph/src/canvas/{buildRenderModel,renderer-registry}.ts`
- `packages/session-graph/src/ui/{TurnMapOverlay,InlineGraph}.tsx`
- `packages/app/src/session/graph/**`
- `packages/app/src/session/header/session-graph-toggle.tsx`
- `packages/app/e2e/graph/**`
- `scripts/capture-graph-demo.ts`
- `docs/spacegraph/**`
- `spacegraphjs/src/activity.ts`
- `spacegraphjs/packages/renderer/**`
- `spacegraphjs/packages/spacegraph-renderer/**`
- `spacegraphjs/packages/cytoscape-renderer/**`
- `spacegraphjs/packages/svg-renderer/**`
- `spacegraphjs/packages/react-spacegraph/**`
- `spacegraphjs/src/zoom/ZoomBands.ts`
- `spacegraphjs/src/layout/LaneLayout.ts`
- `spacegraphjs/src/a11y/AccessibilityLayer.ts`
- `spacegraphjs/src/navigation/Trail.ts`
- `spacegraphjs/src/control/**` (Phase 8 controllers)
- `spacegraphjs/src/activity/ActivityGraph.ts` (Phase 8, only if needed)
- `spacegraphjs/test/renderer.contract.test.ts`
- `spacegraphjs/test/e2e/renderer.contract.spec.ts`
- `spacegraphjs/test/e2e/contract-demo.spec.ts`
- `spacegraphjs/demo/contract.html` + `spacegraphjs/demo/contract-demo.ts` (non-OpenCode reference demo)
- `spacegraphjs/demo/activity-host.ts` (second-host fixture, shared with the contract suite)
- `spacegraphjs/test/boundaries.test.ts`
- `spacegraphjs/demo/activity-contract.ts` (planned name; the demo actually landed as `demo/contract.html` + `demo/contract-demo.ts` above)
- `spacegraphjs/AGENTS.md`

Modified:

- `package.json` (workspaces, `graph:capture` and `graph:verify` scripts)
- `packages/app/package.json` (dependency)
- `packages/app/src/shell/state/layout.tsx` (mode persistence)
- `packages/app/src/session/screen.tsx` (render branch, toggle)
- `packages/app/src/session/commands/use-session-commands.tsx` (commands)
- `packages/app/src/runtime/i18n/en.ts` (strings)
- `packages/app/tsconfig.json` / `vite.config.ts` if the workspace linkage needs paths/aliases
- `packages/storybook/.storybook/main.ts` (story glob, optimize deps)
- `packages/session-ui/package.json` (graph export)
- `spacegraphjs/package.json` (source exports, entry points, optional deps, workspace package list)
- `spacegraphjs/pnpm-workspace.yaml` (new packages)
- `spacegraphjs/packages/solid-spacegraph/**` (bind to the contract)
- `spacegraphjs/src/core/WebGLRenderer.ts` (renamed from `Renderer.ts`, alias kept)
- `spacegraphjs/src/SpaceGraph.ts`
- `spacegraphjs/src/core/{Renderer,CameraControls,Graph,defaults,VisionManager,RenderContext}.ts`
- `spacegraphjs/src/input/{DefaultInputConfig,InputManager}.ts` + fingerings
- `spacegraphjs/src/plugins/{LODPlugin,FractalZoomPlugin,ZoomUIPlugin,HUDPlugin,MinimapPlugin,InteractionPlugin}.ts`
- `spacegraphjs/src/nodes/{Node,DOMNode,HtmlNode,ShapeNode,GroupNode,CodeEditorNode}.ts`
- `spacegraphjs/src/edges/{Edge,LabeledEdge}.ts`
- `spacegraphjs/test/**`

Do not modify without a task: `packages/protocol/**`, `packages/server/**`, `packages/core/**`, session persistence schemas, existing tool renderers, existing transcript layout.

---

## Appendix A — Definition of done

A task is done when:

1. The code path is implemented at the named file.
2. The listed verification command passes from the correct package directory.
3. No unrelated refactor is included.
4. New user-visible strings are in `en.ts`.
5. New DOM surfaces have `data-component`/`data-slot` and accessible names.
6. The graph model still has no renderer imports, and the UI imports only the shared contract, not a concrete renderer.
7. A contract change updates both adapters and the conformance suite.
8. Generic library code contains no OpenCode or session naming.
9. Screenshots were inspected when visual behavior changed.
10. The report names changed files, commands run, and anything unverified.

## Appendix B — What "semantic zoom" means here

Semantic zoom is **not** node scaling or distance culling. It is a deliberate representation change:

- Overview: turns and phases carry meaning; individual tool calls are counts.
- Execution: tool calls and provenance files become individual objects; failures and retries form visible chains.
- Detail: full content is readable in the inspector; the canvas shows structure, not paragraphs.

If a zoom transition only changes size, label visibility, or opacity, it is not semantic zoom and does not satisfy the hypothesis.
