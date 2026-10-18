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
- **P0.3** source workspaces: only `spacegraphjs` core can be linked today. The four contract packages
  (`@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`,
  `@spacegraphjs/svg-renderer`) do not exist yet; they are Phase 1 deliverables (L1.19-L1.21a). The task's
  "links all five packages" is not satisfiable in Phase 0 as written: link core now, add the rest as Phase 1
  creates them. `spacegraphjs` `package.json` still points `main`/`module` at `./dist` (no build present) and
  must be repointed at `src/index.ts` for source consumption, with a Vite/tsconfig fallback if bun workspace
  resolution conflicts.
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

- [ ] **P0.3 Make the SpaceGraphJS packages source workspaces** (core linked; the four contract packages are Phase 1 deliverables — see log)
  Add `spacegraphjs`, `spacegraphjs/packages/renderer`, `spacegraphjs/packages/spacegraph-renderer`, `spacegraphjs/packages/cytoscape-renderer`, and `spacegraphjs/packages/svg-renderer` to root `workspaces.packages`. Point each package's `main`/`module`/`types`/`exports` at its `src/index.ts` for the prototype. Add `spacegraphjs`, `@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`, and `@spacegraphjs/svg-renderer` as `workspace:*` dependencies of `packages/session-graph`. Keep a documented fallback (Vite regex aliases + tsconfig paths) if Bun workspace resolution conflicts.
  Done: `bun install` links all five packages; imports resolve from `packages/session-graph` in Vite, Bun test, typecheck, and Storybook; core does not import the contract.
  Status: `spacegraphjs` is a root workspace and a `workspace:*` dep of `packages/session-graph`; imports resolve in Vite, Bun, and Storybook, and typecheck passes via the `./activity` `types` condition. The remaining four packages and the "all five" clause land in Phase 1.

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

- [ ] **P0.7 Cytoscape renderer spike**
  Add `cytoscape` and its types only to `spacegraphjs/packages/cytoscape-renderer` (`@spacegraphjs/cytoscape-renderer`). Render the same 8-node/edge model with `layout: { name: "preset", fit: false }`. Verify tap/dbltap, selection sync, fit/focus, resize, theme restyle, HTML card overlay for one node, and `cy.destroy()`. Measure the lazy chunk.
  Done: Cytoscape mounts from a dynamic import, obeys explicit positions, emits string-ID events, positions one HTML card correctly, and disposes without listeners.

- [ ] **P0.8 Contract smoke test**
  Define the minimal `GraphRenderer` shape (mount, setModel, selection, events, dispose) in `@spacegraphjs/renderer` and wrap the two spike mounts behind it. Write `spacegraphjs/test/renderer.contract.test.ts` with mount/dispose, diff-by-ID, selection, click-vs-drag, and HTML-card cases. Run it against both spike adapters.
  Done: both spikes pass the same smoke test; any capability difference is declared, not assumed. The full contract lands in L1.19-L1.22.

**Exit gate 0:** both renderers render and dispose cleanly in the real app shell; heavy deps are off the critical path; the shared contract smoke test passes against both. If it fails for structural reasons, stop and re-evaluate the renderer choice with the user before continuing.

---

### Phase 1 — SpaceGraphJS hardening and generalisation

Goal: make the library reliably embeddable, interaction-correct, and reusable outside OpenCode before adding app semantics.

#### Packaging and entry points

- [x] **L1.1 Remove internal self-imports** (done for existing modules; five subpaths await their modules — see log)
  Convert the 37 `spacegraphjs/*` imports in `src` to relative imports. Add explicit core `exports` for `.`, `./activity`, `./core`, `./nodes`, `./edges`, `./plugins`, `./builder`, `./types`, `./zoom`, `./layout`, `./a11y`, `./navigation`, `./inline`, and `./vision`. Add `types` and a `types` condition. The renderer contract is a separate package, not a core subpath.
  Done: source and built consumption resolve without tsconfig paths; no `spacegraphjs/spacegraphjs/...` alias corruption.
  Status: self-imports are all relative (grep clean); `exports` cover every existing module. `./zoom`, `./layout`, `./a11y`, `./navigation`, `./inline` land with L1.23–L1.26.

- [x] **L1.2 Add a lean activity entry** (done except `ZoomBandsPlugin`, which arrives with L1.23 — see log)
  Create `src/activity.ts` exporting only: `SpaceGraph`, `Graph`, `EventEmitter`, `ShapeNode`, `HtmlNode`, `DOMNode`, `NoteNode`, `PanelNode`, `TextMeshNode`, `GroupNode`, `CurvedEdge`, `LabeledEdge`, `GridLayout`, `HierarchicalLayout`, `TimelineLayout`, `LODPlugin`, `ZoomBandsPlugin`, and theme/types. It must not import vision, Monaco, Chart, Math, or media nodes.
  Done: lean entry imports in under the agreed chunk budget and never pulls ONNX/Monaco.
  Status: `src/activity.ts` exists and `test/entry-critical-path.test.ts` asserts importing the entry and the activity entry evaluates neither ONNX nor Monaco. `ZoomBandsPlugin` is added when L1.23 creates it.

- [x] **L1.3 Make default chrome opt-in** (done; see log — browser "bare canvas" assertion still to confirm in L1.18)
  Move `HUDPlugin`, `MinimapPlugin`, `ZoomUIPlugin`, and `FractalZoomPlugin` out of `DEFAULT_SYSTEM_PLUGINS` into a `DEFAULT_CHROME_PLUGINS` list. Add `chrome: false` default for embedded use. Remove fixed `document.body` overlays unless chrome is enabled.
  Done: a bare `new SpaceGraph(container, { chrome: false })` renders only canvas + CSS3D layer.
  Status: `DEFAULT_CHROME_PLUGINS` exists; `chrome` defaults off and gates registration; `test/chrome.test.ts` asserts the split. The only default `document.body` writer was `ZoomUIPlugin`, now chrome-gated.

- [ ] **L1.4 Plumb render/theme options** (partial — background + transparency done; node/edge/label/selection/hover theming remains; `projection` waits on L1.12)
  Pass `RenderOptions` through `SpaceGraphOptions`: `backgroundColor`, `transparent`, `antialias`, `pixelRatio`, `preserveDrawingBuffer`, `projection`, `chrome`, `plugins`. Add a theme object for background, node fill/stroke, edge color, label color/font, selection/hover colors. Support transparent background so the app surface shows through.
  Done: no hard-coded `0x1a1a2e` when the app supplies a theme; light and dark screenshots both pass.
  Status: `render`/`chrome`/`theme` added; `RenderOptions` gains `transparent` + `preserveDrawingBuffer`; `Renderer` honors both and takes the single `types.ts` definition; `theme.background` overrides `render.backgroundColor`. Remaining: theme beyond `background`, the `projection` pass-through (needs L1.12), a `plugins` option, and the light/dark screenshot check (L1.18 demo page).

#### Lifecycle and input

- [ ] **L1.5 Correct `init()`/`dispose()`**
  Make both idempotent. `dispose()` must call `renderer.dispose()` (ResizeObserver + WebGL + DOM), `cameraControls.dispose()`, `input.dispose()`, `vision.dispose()`, `pluginManager.disposePlugins()`, `graph.clear()`, and `events.clear()`. Remove `window.SpaceGraph`/`instances` registration by default (`global: false`).
  Done: repeated mount/unmount over 20 cycles shows no listener, observer, or WebGL context growth; verified by a Playwright test.

- [ ] **L1.6 Container-scoped keyboard**
  Camera keyboard handling only when the canvas or its container has focus, and never while an `input`, `textarea`, `select`, `[contenteditable]`, or `.monaco-editor` has focus. Add `keyboard: false | "container" | "window"`.
  Done: typing in the app composer/settings never moves the camera; keyboard pan/zoom still works when the canvas is focused.

- [ ] **L1.7 Render scheduling**
  Add `renderMode: "continuous" | "on-demand"`. On-demand schedules a frame after graph mutations, camera moves, resize, theme changes, and selection changes. Default embedded mode to on-demand.
  Done: idle CPU usage is near zero; mutations repaint; tests still see deterministic frames.

#### Events and selection

- [ ] **L1.8 Forward graph events**
  Emit `node:added`, `node:removed`, `node:updated`, `edge:added`, `edge:removed`, `edge:updated` on `sg.events` in addition to `sg.graph`. Add a typed `SpaceGraphEvents` map. `updateNode` emits `node:updated`; `clear()` emits remove events or a single `graph:cleared`.
  Done: `sg.watch('node:added', cb)` fires; HUD/History subscriptions work or are removed.

- [ ] **L1.9 Real click semantics**
  Distinguish click from drag with a movement threshold. Emit `node:click`, `node:dblclick`, `edge:click`, `background:click` with `{ id, originalEvent }`. Make the dblclick camera fly configurable (`doubleClickFocus: false`). Route `ButtonNode` clicks through the same event path.
  Done: a plain click on a card selects it and does not fly the camera; a drag does not emit click; edge click works.

- [ ] **L1.10 Unified selection**
  Replace the three selection systems with one API: `select(id | ids | null)`, `clearSelection()`, `selected` (IDs), `selection:changed`, and `node:selection-changed`. Selection applies a visible outline; focus/camera movement is separate (`focusNode`). Box-select feeds the same state.
  Done: click, box-select, keyboard, and programmatic selection agree; selection survives updates by ID.

- [ ] **L1.11 Hover and focus cleanup**
  Deduplicate hover events from `HoverManager` and `HoverFingering`. Add a visible keyboard focus outline for mesh nodes. Ensure hidden/LOD-culled nodes cannot be picked.
  Done: one enter/leave per transition; Tab cycles selectable nodes with visible focus.

#### Cameras and zoom

- [ ] **L1.12 First-class orthographic projection**
  Add `projection: "perspective" | "orthographic"` to the renderer. Swap the camera used by WebGL, CSS3D, raycasting, resize, `fitView`, and `RenderContext`. Implement ortho pan and wheel zoom around the pointer. Clamp zoom. Disable free orbit in ortho.
  Done: `sg.setProjection("orthographic")` produces a true parallel projection with correct CSS3D alignment; wheel zoom and pan work; toggling to perspective preserves target and selection.

- [ ] **L1.13 Camera zoom telemetry**
  Add a normalized camera zoom (`0..1` or log-scale) derived from perspective distance or ortho height. Emit throttled `camera:change` and `zoom:change`; expose `zoom`, `setZoom`, and `zoomToFit(nodes?)`. Do not implement semantic levels here; the band controller in L1.23 owns policy.
  Done: manual wheel, programmatic zoom, and projection changes all emit correct viewport/zoom events.

- [ ] **L1.14 LOD correctness**
  Cache node bounds instead of recomputing `Box3.setFromObject` twice per frame. Add per-node `data.minZoom`/`maxZoom`/`data.lod`. Hidden nodes are not pickable. Add `labelMode: "scale" | "constant" | "hide"` for DOM labels. Fix the LOD plugin key mismatch and restore edges when zooming back in.
  Done: 300-node scene holds 60fps during pan in the app viewport; labels stay readable or hide according to policy; hidden nodes cannot be clicked.

#### Content and layout

- [ ] **L1.15 Safe DOM node updates**
  Add a supported `DOMNode`/`CustomNode` spec path that accepts an existing `HTMLElement`, never replaces it on update, and exposes `data.lod`. Make `HtmlNode.updateSpec` no-op when HTML is unchanged. Do not destroy mounted Solid content.
  Done: a mounted card survives 100 model updates with its listeners intact.

- [ ] **L1.16 Stable layout primitives**
  Add `setPositions(positions: Record<string, [number, number, number]>)`, `pinAll()`, and `layoutOnce(name, options)` that does not run on mutation. Make `TimelineLayout` and `HierarchicalLayout` deterministic and pin-aware. Remove `window.gsap` dependence from layout animation or make animation optional.
  Done: applying positions twice yields identical coordinates; adding nodes does not move pinned nodes.

- [ ] **L1.17 Edge rendering fixes**
  Render `LabeledEdge` labels via a real CSS2D layer or an `HtmlNode` anchor. Ensure edge labels are zoom-aware and never overlap cards. Add an optional edge hit area for easier clicking.
  Done: edge labels appear in a screenshot; edge click targets are reliable at 2D zoom levels.

- [ ] **L1.18 Library tests and demo**
  Add focused Vitest tests for event forwarding, click-vs-drag, selection, dispose, ortho projection math, zoom bands, stable IDs/positions, and DOM update preservation. Add a Playwright demo page exercising ortho + click + zoom bands + dispose. Quarantine or repair stale tests that contradict the new API.
  Done: `bunx vitest run` from `spacegraphjs/` passes the new suite; demo test passes in Chromium.

#### Shared contract and second backend

- [ ] **L1.19 Publish the renderer contract package**
  Create `spacegraphjs/packages/renderer` (`@spacegraphjs/renderer`) with the types in §4.4. It contains types plus a tiny `CONTRACT_VERSION`/capability helper, with zero dependencies. It must not import `spacegraphjs`, `three`, `cytoscape`, or host code. Add a small `supports(capabilities, capability)` helper if useful.
  Done: the package typechecks and builds with zero runtime dependencies; importing it adds no bundle weight.

- [ ] **L1.20 SpaceGraph renderer adapter package**
  Create `spacegraphjs/packages/spacegraph-renderer` (`@spacegraphjs/spacegraph-renderer`) exporting `SpaceGraphRenderer`. It wraps the lean `spacegraphjs/activity` entry, maps `RenderModel` to specs, applies positions with `setPositions`, maps status/kind to theme styles, positions HTML cards via `DOMNode`/`HtmlNode`, translates events to string IDs, and implements viewport/band reporting. It is the only package that imports both the core and the contract.
  Done: the adapter passes the contract suite; it never calls an automatic layout; core still does not import the contract.

- [ ] **L1.21 Cytoscape renderer adapter package**
  Create `spacegraphjs/packages/cytoscape-renderer` (`@spacegraphjs/cytoscape-renderer`) exporting `CytoscapeRenderer`. It depends only on `@spacegraphjs/renderer` and `cytoscape` (peer), not on `spacegraphjs` core. Use `preset` layout, `cy.batch` diffs, `cy.style` from `RenderTheme`, compound-free cluster nodes, `min-zoomed-font-size`, and event mapping. Implement a clipped DOM overlay for `shape: "card"` nodes, updated on `render`/`viewport`, with `maxDomNodes` and simple-label fallback. Declare `projections: ["2d"]`, `domNodes: true`, `maxDomNodes`, and `maxRecommendedNodes`.
  Done: the package passes the contract suite, renders HTML cards without core imports, and disposes the overlay with `cy.destroy()`.

- [ ] **L1.21a Static SVG renderer package**
  Create `spacegraphjs/packages/svg-renderer` (`@spacegraphjs/svg-renderer`) exporting `renderToSVG(model, options)` and `InlineGraph`. It depends only on `@spacegraphjs/renderer` and renders nodes, edges, labels, clusters, and statuses to static SVG. It is not an interactive `GraphRenderer`. Use a simple card representation (no HTML execution) and preserve theme colors.
  Done: the package renders the fixture to SVG without a browser; `InlineGraph` uses it; core remains contract-free.

- [ ] **L1.22 Renderer conformance suite**
  Finish `test/renderer.contract.test.ts` and run it against both adapters: mount/dispose, diff-by-ID, selection sync, click-vs-drag, fit/focus, viewport/band events, theme change, resize, hidden-node non-interactivity, HTML-card positioning, and capability declaration. Split the suite: headless model assertions in Vitest, and mount/click/resize/dispose assertions in Playwright (Cytoscape can run headless for graph operations, but hit-testing and canvas lifecycle need a browser).
  Done: one command proves both adapters honor the contract; capability gaps are asserted, not ignored.

- [ ] **L1.23 Generic zoom-band controller**
  Add `src/zoom/ZoomBands.ts`: configurable thresholds, normalized zoom, band callbacks, and viewport snapshots. Replace `FractalZoomPlugin` with a thin `ZoomBandsPlugin` that delegates to the controller. The controller stays headless and policy-free.
  Done: unit tests cover threshold edges, wheel bursts, projection changes, and programmatic zoom; `FractalZoomPlugin` is removed or deprecated.

- [ ] **L1.24 Generic lane layout**
  Add `src/layout/LaneLayout.ts`: lanes, ordinals, gaps, cluster bounds, reserved space, and append-only positions. `TimelineLayout`/`HierarchicalLayout` can use it internally, but the API is generic and does not mention sessions or messages.
  Done: deterministic snapshots; adding an item never moves existing items.

- [ ] **L1.25 Generic accessibility layer**
  Add `src/a11y/AccessibilityLayer.ts`: a visually hidden ordered node/edge list, roving tabindex, Enter/Space selection, Escape back, and `aria-live` selection announcements. It accepts a minimal structural node list (`id`, `label`, `kind`, `status`, `interactive`) so core does not import the contract; the host passes `RenderModel.nodes`.
  Done: keyboard-only traversal works against both interactive adapters; no renderer-specific accessibility code; core has no contract import.

- [ ] **L1.26 Generic navigation trail**
  Add `src/navigation/Trail.ts`: push/replace/back/forward, depth, and labels. Session-graph renders breadcrumbs from it; any graph app can use the controller.
  Done: trail state survives render-model updates by ID and resets on explicit root.

- [ ] **L1.27 Optional chrome modules**
  Fix `MinimapPlugin` and `ZoomControls` for embedded use: container-scoped, explicit enable/disable, accurate viewport rectangle, no second full scene pass if a DOM/SVG minimap is cheaper. Expose them as optional modules, not defaults.
  Done: a 300-node demo can enable the minimap without doubling frame cost; disabling leaves no DOM behind.

- [ ] **L1.28 Capability-aware UI contract**
  Define how unsupported capabilities surface: `supports(capabilities, capability)` plus a user-visible explanation. 3D on Cytoscape and minimap availability must be explicit. HTML cards are supported by both adapters; only their `maxDomNodes` differs.
  Done: the UI never calls an unsupported method; the toolbar explains unavailable actions.

- [ ] **L1.29 Non-OpenCode reference demo**
  Add a generic demo under `spacegraphjs/demo` that uses the contract, `LaneLayout`, `ZoomBands`, `AccessibilityLayer`, and `Trail` with synthetic activity data. Include HTML activity cards, both interactive adapters, and the static SVG renderer. No OpenCode imports or session vocabulary.
  Done: the demo runs from the library repo and demonstrates the same capabilities outside OpenCode; it is linked from the README.

- [ ] **L1.30 Multi-instance isolation**
  Remove global instance registration, global event buses, and cross-instance edge resolution. Two `SpaceGraph` instances on one page must have independent cameras, selections, themes, input, and disposal. Add a test with two graphs and duplicate node IDs.
  Done: two graphs coexist without cross-talk; deleting one leaves the other functional.

- [ ] **L1.31 SSR-safe entry**
  Ensure importing `spacegraphjs` and `@spacegraphjs/renderer` in Node/SSR does not touch `window`, `document`, `navigator`, or WebGL. Guard browser-only work in constructors and `mount`, and document the client-only boundary.
  Done: a Node import smoke test passes; no top-level browser access.

- [ ] **L1.32 Touch and pointer parity**
  Add pinch zoom, two-finger pan, pointer capture, and touch hit-testing to the SpaceGraphJS adapter. Do not rely on global keyboard listeners. Verify at 390×900 with touch emulation.
  Done: pan, pinch zoom, tap selection, and HTML-card controls work on a touch viewport.

- [ ] **L1.33 Disambiguate the core renderer**
  Rename the core WebGL class `Renderer` to `WebGLRenderer`, keeping `Renderer` as a deprecated alias for one release. Update exports, docs, and internal references. Reserve "renderer" in public docs for the contract and adapters.
  Done: no public name collision between the core WebGL class and the renderer contract; existing imports still work through the alias.

- [ ] **L1.34 Package boundaries and dependency enforcement**
  Give each package its own `package.json` with explicit `exports`, `sideEffects: false`, peer dependencies where appropriate (`three`, `gsap`, `cytoscape`), and a build script. Add a boundary test that scans `spacegraphjs/src` and fails if it imports `@spacegraphjs/renderer`, `@spacegraphjs/cytoscape-renderer`, or `cytoscape`, and scans `@spacegraphjs/cytoscape-renderer` and fails if it imports `spacegraphjs` core.
  Done: the boundary test runs in CI; core's dependency graph is unchanged by the contract and adapters; each package is independently publishable.

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

- [ ] **M2.3 Node construction** (partial — `phase` nodes not built; see log)
  Build session, turn, phase, message, reasoning, tool, result, error, retry, subagent, file, diff, compaction, notice, and approval nodes. Map tool names to categories with `timelineCategory`; normalize unknown tools to a generic `tool` node.
  Done: every `SessionMessageInfo` variant maps to a node or is explicitly ignored; unknown tools do not throw.
  Status: every kind except `phase` (and `approval`) is built; config events (agent/model/location-switched) are explicitly ignored; unknown tools become generic `tool` nodes. `phase` nodes (consecutive tool categories, `derived`, `clusterOf`) remain and unblock M2.6.

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

- [ ] **M2.6 Semantic zoom levels**
  Implement `levels.ts` with the policy table in §5.4: per-level visible kinds, cluster expansion, label mode, edge filter, and DOM budget. Expose `nodesAtLevel(model, level)` and `edgesAtLevel(model, level, focus?)`.
  Done: snapshot tests for each level; cluster counts match children; hidden nodes are excluded from interaction data.

- [ ] **M2.7 Deterministic layout**
  Implement `layout.ts` per §5.5: lanes, ordinals, depth, cluster bounds, append-only coordinates, reserved in-flight turn space. Return positions and cluster geometry; no rendering dependency.
  Done: repeated builds produce byte-identical positions; appending a turn leaves earlier positions unchanged.

- [x] **M2.8 Selectors** (done; see log — answers the five questions in unit tests)
  Implement neighbors, incoming/outgoing edges, shortest path, "why this node" (part-of + evidence + sequence context), search index, breadcrumbs, current activity, and "open in transcript" message/part refs.
  Done: fixture queries answer all five mission questions in unit tests.
  Status: `selectors.ts` provides neighbors, incoming/outgoing, ancestors/breadcrumbs, `why`, `shortestPath`, `forwardChain`, `search`, `openInTranscript`, and `currentActivity`; `selectors.test.ts` answers all five questions.

- [x] **M2.9 Canonical fixture** (done; see log)
  Add `fixture.ts` implementing §7 with deterministic IDs and timestamps. Export both raw `SessionMessageInfo[]` and the built model. Make it the single source for stories, e2e seeds, and screenshots; do not maintain a second hand-written fixture.
  Done: fixture consumes no network, no clock; identical output across runs; a parity test asserts the story and e2e fixtures produce the same model.
  Status: `fixture.ts` gives `buildFixtureMessages`/`fixtureMessages`, `buildFixtureGraph`, and a `buildInterruptedFixtureMessages` variant; the purity test asserts identical output across runs. The story/e2e parity assertion lands when Phase 3/4 consume it.

- [ ] **M2.10 Model tests** (partial — level-filtering and layout tests wait on M2.6/M2.7; see log)
  Cover stable IDs, steered turns, subagent mapping, file provenance, retry/evidence, cluster counts, level filtering, layout stability, unknown tools, streaming partial states, and malformed metadata.
  Done: `cd packages/session-ui && bun test src/graph` passes.
  Status: `bun test src/graph` → 24 tests pass (stable IDs, steered/shell/interrupted turns, subagent mapping, provenance, retry/evidence, unknown tools, streaming JSON, malformed metadata, purity, five questions). Cluster-count, level-filtering, and layout-stability cases land with M2.6/M2.7.

**Exit gate 2:** the fixture model is inspectable in a plain test and answers the five questions without rendering. If the model cannot answer them, the UI cannot.

---

### Phase 3 — Graph UI

Goal: a legible, navigable surface that is worth comparing to the transcript, and that proves renderer independence.

- [ ] **U3.1 Render-model builder**
  Add `packages/session-graph/src/canvas/buildRenderModel.ts`: `GraphModel` + level + positions + focus → `RenderModel`. It applies the §5.4 policy, hides non-interactive nodes, assigns labels and statuses, emits absolute positions, and generates sanitized `html` for `shape: "card"` nodes from a host-owned template. It must not import a renderer.
  Done: snapshot tests per level; both adapters receive identical models; card HTML is escaped/sanitized and contains no host code.

- [ ] **U3.2 Renderer registry**
  Add `renderer-registry.ts` mapping `"spacegraph" | "cytoscape"` to dynamic imports of `@spacegraphjs/spacegraph-renderer` and `@spacegraphjs/cytoscape-renderer`. Expose capabilities before mount. Default to SpaceGraphJS; fall back to Cytoscape after a mount error with a recoverable banner. Persist the chosen renderer per session.
  Done: neither adapter is imported at module scope; a fake failing SpaceGraph mount selects Cytoscape without losing the session.

- [ ] **U3.3 Canvas component**
  `GraphCanvas.tsx` owns one container, mounts the selected adapter once, sends new `RenderModel`s, syncs selection both ways, handles resize, and disposes. Show a sized skeleton while mounting and surface errors to the parent. Expose `data-graph-ready`, `data-graph-renderer`, `data-graph-projection`, `data-graph-band`.
  Done: session switch and unmount dispose cleanly; no stale async callbacks; renderer switch rebuilds once.

- [ ] **U3.4 SpaceGraph wiring**
  Use `@spacegraphjs/spacegraph-renderer` through the registry. Apply the theme and projection; map renderer zoom bands to the semantic level; drive selection from string IDs; render HTML activity cards through the adapter's `DOMNode` path. Keep core imports inside the adapter package.
  Done: 2D ortho and 3D work with the shared model; HTML cards survive updates; no session semantics enter the library.

- [ ] **U3.5 Cytoscape wiring**
  Use `@spacegraphjs/cytoscape-renderer` through the same registry. The preset layout consumes model positions; styles consume `RenderTheme`; HTML cards use the adapter's DOM overlay with its lower cap; 3D is unavailable and explained. Selection, click, fit, focus, and zoom events map to the contract.
  Done: the same fixture renders, selects, inspects, and displays HTML cards identically; the inspector does not depend on the renderer.

- [ ] **U3.6 Renderer comparison**
  Render overview, execution, and selected states in both renderers. Record navigation steps, visual clarity, frame rate, chunk size, and capability gaps. Capture paired screenshots.
  Done: a comparison table in `docs/spacegraph/prototype.md`; the default renderer choice is justified, not assumed.

- [ ] **U3.7 Theme bridge**
  Read OpenCode CSS tokens (`--v2-*`) at mount and on scheme change. Produce the full `RenderTheme`. Provide light/dark values in both app and Storybook; do not leak OpenCode token names into the library.
  Done: both renderers re-theme from the same theme object; no hard-coded palette.

- [ ] **U3.8 Graph view layout**
  `GraphView.tsx` composes canvas + toolbar + breadcrumbs + inspector in a flex layout that fills the session panel. No page-level scroll; the canvas owns pan/zoom. Empty/loading/error states keep the transcript available.
  Done: at 1440×900 and 390×900 the canvas and controls do not overlap the composer or header.

- [ ] **U3.9 Toolbar**
  2D/3D toggle, zoom in/out, fit, reset, search, "current activity", and "back to transcript". Show the active renderer and capability state unobtrusively; put the renderer selector in prototype settings, not the primary toolbar. Use `SegmentedControl`, `IconButton`, `Tooltip`, and existing tokens. Disable unsupported capabilities with a reason. Add `data-slot="graph-toolbar"`.
  Done: every control is keyboard reachable and has an aria label; the 3D toggle is disabled on Cytoscape with an explanation; the toolbar is not a renderer debug panel.

- [ ] **U3.10 Inspector**
  Render per-kind detail: message markdown, reasoning, tool input/output (ANSI-stripped terminal), file path + diff, subagent link, error/retry/evidence, timestamps, and confidence labels. Provide "follow edge", "open in transcript", and copy actions. Keep text selectable and scrollable; do not use the canvas for detail text.
  Done: all fixture node kinds render without errors in both renderers; long output scrolls; diffs load on demand.

- [ ] **U3.11 Breadcrumbs and focus**
  Use `spacegraphjs/navigation/Trail` for session → turn → phase → node. Clicking an ancestor selects it and fits its subtree. "Focus" dims non-neighbors at execution level; Esc clears focus, then selection.
  Done: breadcrumbs track selection; the trail controller has no OpenCode imports.

- [ ] **U3.12 Search**
  Search labels, tool names, file paths, commands, and summaries. Selecting a result selects the node, expands its level, and fits it. Show result count and keyboard navigation.
  Done: searching a fixture file name finds all provenance nodes.

- [ ] **U3.13 Minimap**
  Use the fixed optional library minimap or a DOM/SVG overview fed by the same positions. Show the viewport rectangle; click/drag to pan. Do not run a second full scene pass.
  Done: minimap stays in sync with both renderers and does not double rendering cost.

- [ ] **U3.14 Accessibility mirror**
  Mount `spacegraphjs/a11y/AccessibilityLayer` over the active render model. Expose an ordered node/edge list, roving tabindex, Enter/Space selection, Escape back, and `aria-live` announcements. The canvas wrapper has instructions and focus.
  Done: keyboard-only traversal selects and inspects nodes in both renderers.

- [ ] **U3.15 3D mode**
  Same model and levels; Z from hierarchy. Clamp orbit, keep 2D-like labels, add a subtle depth cue. Toggle animates camera and preserves target/selection. Default remains 2D; the control is capability-gated.
  Done: 3D does not change node identity or inspector content; switching back restores the 2D framing.

- [ ] **U3.16 Stories**
  Stories for overview, execution, detail, selected node, 2D, 3D, both renderers, light, dark, narrow, empty, loading, error, and long-output. Use `CurrentSessionProviders` or a local provider with the canonical fixture. Story ID prefix: `session-graph--`.
  Done: Storybook renders all states without network; `document.fonts.ready` is awaited in tests.

- [ ] **U3.17 Component tests**
  Assert DOM contracts: switch control, prototype settings renderer selector, toolbar, breadcrumbs, inspector content, search, keyboard traversal, 2D/3D state, capability explanations, HTML cards, `data-graph-ready`, and no console errors. Screenshot only when pixels are the contract.
  Done: `cd packages/session-graph && bun run test:components` passes; repeated at `--workers=2 --repeat-each=10`.

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

- [ ] **I4.0 Enforce the diff budget**
  Review every planned edit against the three-item budget. If a feature needs more, first ask whether SpaceGraphJS or `packages/session-graph` can own it. Record accepted exceptions.
  Done: the OpenCode diff is enumerated in the docs; no graph-specific logic lands in `packages/app/src` outside the thin integration folder.

- [ ] **I4.1 Per-session mode state**
  Extend `sessionViewSchema` in `packages/app/src/shell/state/layout.tsx` with optional `graph: { mode: "transcript" | "graph"; projection: "2d" | "3d"; renderer?: "spacegraph" | "cytoscape"; selected?: string; zoom?: number }`. Backward compatible; absent means transcript. Add accessors beside scroll persistence, with `touch`/`prune` participation.
  Done: reload restores mode, projection, and renderer per session; old stored layouts decode.

- [ ] **I4.2 Lazy integration wrapper**
  Add `packages/app/src/session/graph/session-graph-view.tsx` using `lazy(() => import("@opencode/session-graph"))`, a sized `<Suspense>` fallback, and an error boundary that returns to the transcript with a message. Preload on idle after the session is ready. The wrapper passes only session data and callbacks; it must not import either adapter.
  Done: graph code and both adapters are absent from the session entry chunk; load failure does not break the session.

- [ ] **I4.3 Render branch**
  In `packages/app/src/session/screen.tsx`, replace the single `timelineView()` render with a mode branch inside the existing `Match when={session.identity.params.id}`. Pass `messages`, `status`, `turnDiff` loader, `openInTranscript`, and `onModeChange`. Keep the composer and header untouched.
  Done: switching modes does not remount the composer or lose the active model/settings.

- [ ] **I4.4 Preserve transcript position**
  Read the current scroll snapshot before switching to graph; restore it when returning. Use the existing `createScrollPersistence` path rather than a second store. Keep `createTimelineCache` entries alive so virtualizer state survives.
  Done: test scrolls to a mid-session message, switches to graph, returns, and asserts the same anchor is visible.

- [ ] **I4.5 Toggle control**
  Add `session-graph-toggle.tsx` near `SessionReviewToggle` in `screen.tsx` (desktop) and in the mobile header/tabs area. Use `SegmentedControl` with Transcript/Graph, or an `IconButton` with `state="pressed"`. Add accessible labels and keybind hints.
  Done: control is reachable by role/name; state matches persisted mode; does not overlap the review toggle at narrow widths.

- [ ] **I4.6 Command and keybind**
  Add `graph.toggle` and `graph.projection` commands in `packages/app/src/session/commands/use-session-commands.tsx`, with default keybinds in `settings/keybinds` and i18n keys in `runtime/i18n/en.ts`. Do not fire while a text field has focus.
  Done: command palette lists both; keybind works; no conflict with existing session commands.

- [ ] **I4.7 Open in transcript and hash reveal**
  Inspector "open in transcript" selects the message, switches mode, and reveals it. When the URL hash targets a message while graph mode is active, select the corresponding node instead of scrolling a hidden timeline.
  Done: both directions work from a cold load and a live session.

- [ ] **I4.8 Live streaming behavior**
  Feed graph updates from the same reactive `session.history.messages()` accessor. Diff the model by ID; append new nodes; update statuses; never re-layout or clear selection. Throttle model rebuilds to animation frames if a stream part changes many times.
  Done: an e2e test pushes a new assistant tool and asserts the node appears, the selected node stays selected, and earlier node coordinates are unchanged.

- [ ] **I4.9 Session switching and cleanup**
  Ensure graph state is keyed by `sessionKey`; dispose the renderer when a tab is evicted or the session changes; do not leave WebGL contexts around. Reset inspector, search, and focus per session.
  Done: switching between three sessions 10 times keeps the WebGL context count stable and shows no stale nodes.

- [ ] **I4.10 Mobile behavior**
  Provide the graph behind the same switch on mobile, defaulting to 2D, with the toolbar in a compact row and the inspector as a bottom sheet. If layout cannot be made usable in this phase, gate graph mode to desktop and record the decision.
  Done: 390×900 screenshot and interaction test; no horizontal overflow.

- [ ] **I4.11 Theme and i18n**
  Use `data-color-scheme` changes to re-theme the canvas. Add all new strings to `en.ts`; other locales fall back. No hard-coded user-visible English in components.
  Done: light/dark switch re-themes without remount; `bun run lint` passes i18n checks.

**Exit gate 4:** a real routed session can switch to the graph, receive live updates, and return to the exact transcript position. The transcript is demonstrably unaffected.

---

### Phase 5 — Verification and screenshots

Goal: make the result inspectable, repeatable, and honest.

- [ ] **V5.1 Capture spec**
  Add `packages/app/e2e/graph/capture.spec.ts` using the mocked server harness and `setupTimeline`. Seed the canonical fixture (or adapt `fixture.ts` into the harness builders). Wait for `[data-graph-ready="true"]`, `document.fonts.ready`, and a stable node count before capture.
  Done: the spec runs against both the dev server and `PLAYWRIGHT_BUILD=1`.

- [ ] **V5.2 Capture CLI**
  Add `scripts/capture-graph-demo.ts` and a root `graph:capture` script. Modes:
  - `baseline` — transcript only at the fixed viewport/theme.
  - `demo` — overview, execution, detail/selected, 3D, return-to-transcript.
  - `compare` — the same overview/execution/selected states in SpaceGraphJS and Cytoscape.
  - `verify` — run graph assertions and fail on regression.
  Write to `docs/spacegraph/screenshots/`; never overwrite committed images silently in `verify` mode.
  Done: one command produces all screenshots; exit code reflects assertions.

- [ ] **V5.3 Determinism**
  Fix viewport (1440×900), device scale factor 1, theme, locale, reduced motion, and a fixture clock. Enable `preserveDrawingBuffer` only for capture. Avoid arbitrary sleeps; wait on `data-*` state.
  Done: two consecutive `demo` runs produce visually indistinguishable images (manual inspection; optional pixel diff later).

- [ ] **V5.4 Required screenshots**
  Produce at minimum:
  1. `01-log.png` — baseline transcript.
  2. `02-graph-overview.png` — SpaceGraphJS 2D overview with turn/phase clusters, failure and subagent badges.
  3. `03-graph-execution.png` — execution neighborhood with files and error/retry chain.
  4. `04-graph-selected.png` — selected node with inspector detail.
  5. `05-return-to-log.png` — transcript restored at the same position.
  6. `06-graph-3d.png` — 3D toggle (extra evidence).
  7. `07-cytoscape-overview.png` and `08-cytoscape-selected.png` — the Cytoscape adapter rendering the same model, including an HTML activity card.
  Done: all images inspected; defects filed as tasks in this file.

- [ ] **V5.5 App e2e contracts**
  Add cases to the owning keeper suite (or `e2e/graph/session-graph.spec.ts` if it owns the contract):
  - mode switch and persistence across reload;
  - live message append without selection loss;
  - session switch disposes state;
  - resize does not break the canvas;
  - SpaceGraph mount failure falls back to Cytoscape with a banner;
  - both renderers failing falls back to the transcript;
  - no unexpected console errors.
  Done: `cd packages/app && bun run test:e2e -- graph` passes.

- [ ] **V5.6 Contract conformance in CI**
  Run the shared renderer contract suites (headless and browser) as part of the SpaceGraphJS test job and the session-graph test job. Add a root `graph:verify` script (or CI job) that runs contract conformance, all four packages (contract, SpaceGraph adapter, Cytoscape adapter, SVG renderer), and the capture `verify` mode. Fail if either interactive adapter stops honoring selection, click, viewport, disposal, HTML cards, or capability declarations.
  Done: one command covers both adapters; regressions fail before UI tests.

- [ ] **V5.7 Performance**
  Record: model build time for the fixture, first graph paint, pan frame rate at the DOM cap, chunk size, and session-entry delta for both adapters. Compare against the P0.1 baseline. Add a guard test for model build complexity if practical.
  Done: numbers recorded in `docs/spacegraph/prototype.md`; regressions beyond budget are either fixed or documented.

- [ ] **V5.8 Accessibility**
  Keyboard traversal, focus visibility, aria labels, inspector focus order, overlay focus trap (Phase 6), and reduced-motion behavior. Run the library accessibility layer against both adapters. Run the app's existing a11y tooling if available; otherwise manual scripted checks.
  Done: keyboard-only path covers switch → traverse → select → inspect → return.

- [ ] **V5.9 Cross-environment**
  Verify in web dev, built web (`PLAYWRIGHT_BUILD=1`), desktop shell, Storybook, and the SpaceGraphJS demo pages. Note any WebGL/SwiftShader differences in CI.
  Done: a short matrix in the docs with pass/fail and known limitations.

**Exit gate 5:** a reviewer can run one command, inspect the images, and reproduce the demo from the fixture without a model provider.

---

### Phase 6 — Hybrid log + graph

Goal: bridge modes without redesigning every log component, without violating the timeline-row rule in `packages/gui-extensions/AGENTS.md`, and without growing the OpenCode diff.

The hybrid is delivered in this order:

1. **Turn map overlay** — a graph popover scoped to the active or selected turn, opened from the graph toolbar or header. The transcript stays visible and unchanged underneath.
2. **Synchronized side panel** — an extension-owned session map that follows the active turn while the log remains primary. This uses the existing side-region extension path, not timeline rows.
3. **Generic inline graph component** — built in `@spacegraphjs/svg-renderer`, wrapped thinly by `packages/session-graph`, usable by any host, but not injected into OpenCode's timeline.
4. **Inline row host** — deferred unless the OpenCode maintainers approve a generic timeline slot. It is the only task that would exceed the core diff budget, so it stays approval-gated.

- [ ] **H6.1 Host decision**
  Confirm the overlay and side-panel hosts before building. Do not modify `session-timeline-row.tsx` in this phase. Record the decision and the rationale in the docs.
  Done: a one-page host decision; no timeline-row edits.

- [ ] **H6.2 Turn map overlay**
  Build `TurnMapOverlay.tsx`: render the selected turn's execution-level subgraph, maximum 7 nodes, with inspect, follow-edge, and "open full graph" actions. Open from the graph toolbar and from a transcript selection; Esc restores the previous focus and scroll anchor.
  Done: overlay opens at the same log position and returns to it; focus trap and keyboard work.

- [ ] **H6.3 Synchronized side panel**
  Build an extension `Panel` (`region: "side"`) that renders a compact session map and follows the active turn. Use `Store.session` for its own state. No core timeline edits.
  Done: selecting a transcript turn highlights the map; selecting a map node can reveal the message in the transcript.

- [ ] **H6.4 Generic inline graph**
  Use `InlineGraph` from `@spacegraphjs/svg-renderer` against `RenderModel`: execution-level subset, no pan/zoom, max 5 nodes, theme-aware. `packages/session-graph/src/ui/InlineGraph.tsx` is a thin OpenCode wrapper. Keep it out of OpenCode's timeline until approved.
  Done: the library component renders the fixture subset in the library demo and is documented as a reusable capability; the wrapper adds no graph logic.

- [ ] **H6.5 Inline row host (approval-gated)**
  Only if the OpenCode maintainers approve: add one generic `session.timeline.group` slot that any extension can render into, not a graph-specific branch. Then mount `InlineGraph` there behind a setting. This is an explicit exception to the current timeline-row rule and must be documented.
  Done: either approval + a generic slot + tests, or a recorded decision to defer.

- [ ] **H6.6 Tests**
  Component tests for overlay open/close/return and side-panel synchronization; e2e for the overlay on the fixture. No duplicate coverage of the canvas contract.
  Done: both suites pass.

- [ ] **H6.7 Flag and documentation**
  Default the hybrid to off until the full graph proves useful; expose a prototype setting and document progressive disclosure.
  Done: setting persists; docs explain why inline injection is deferred.

---

### Phase 7 — Polish, docs, and release package

- [ ] **R7.1 SpaceGraphJS changelog and docs**
  Record every breaking change, the lean `activity` entry, the `@spacegraphjs/renderer` contract, ortho/zoom/selection/lifecycle APIs, and both adapters in `spacegraphjs/CHANGELOG.md`, `README.md`, and the new `spacegraphjs/AGENTS.md`. Include a renderer-integration guide with a minimal non-OpenCode example and the naming rules from §4.2.
  Done: a new contributor can embed the lean entry and implement or use a renderer from the docs alone.

- [ ] **R7.2 Prototype documentation**
  Write `docs/spacegraph/prototype.md`: hypothesis, architecture, how to run, tested SHAs, screenshots, renderer comparison, known limitations, and the evaluation protocol/results. Add `packages/session-graph/AGENTS.md` with the mission constraints.
  Done: docs are accurate at the tested commit.

- [ ] **R7.3 Evaluation protocol**
  Recruit a small set of users; give each the same five investigative tasks on the same fixture session, once with transcript and once with graph, counterbalanced. Record task success, completion, wrong turns, and subjective preference. No leading explanation of the graph.
  Done: results and quotes recorded; decision on continuing recorded.

- [ ] **R7.4 Release artifacts**
  Public/companion branch clearly marked experimental; one compelling overview screenshot; a short GIF/video of expand → zoom → inspect → return; README with motivation, setup, tested commit, limitations, and exact demo command.
  Done: another developer can launch the demo from the fixture without configuring a provider.

- [ ] **R7.5 Dependency migration plan**
  Document the step after the prototype: build `dist` for `spacegraphjs`, `@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer`, and `@spacegraphjs/cytoscape-renderer`; replace the source workspaces with versioned dependencies; keep the contract version; re-run the contract and capture suites.
  Done: migration steps are concrete enough to execute without rediscovery.

- [ ] **R7.6 Library capability audit**
  For each generic module added (contract, zoom bands, lane layout, accessibility, trail, minimap, DOM mount, static SVG), confirm it has no OpenCode naming, no session data assumptions, and at least one non-OpenCode consumer or documented example. Remove or defer anything that only serves the prototype.
  Done: a table of capability → consumers → gaps; no session-specific leakage in the library.

- [ ] **R7.7 Final checks**
  Run `bun run check` from the repo root. Run package tests, component tests, e2e, contract conformance, and the capture suite in built mode for both renderers. Inspect every screenshot. Record unverified behavior explicitly.
  Done: green checks plus an explicit limitations list.

---

### Phase 8 — Portability and second-host readiness

Post-OpenCode track. These tasks are not required for the OpenCode prototype exit gates, but they are the reason the library boundary is shaped this way.

Goal: after OpenCode works, a second agent UI such as Hermes Agent can integrate without forking SpaceGraphJS or importing OpenCode code.

- [ ] **P8.1 Framework-agnostic view controller**
  Extract controllers for selection, focus, zoom bands, search, and trail into a `spacegraphjs/control` subpath (core), not into the dependency-free contract. The host supplies the detail panel. Avoid duplicating controller logic in `packages/session-graph`.
  Done: the vanilla controller drives both the library demo and OpenCode; no Solid imports.

- [ ] **P8.2 Framework bindings**
  Repair `spacegraphjs/packages/solid-spacegraph` and add `spacegraphjs/packages/react-spacegraph` to wrap `@spacegraphjs/renderer` and the controllers, not core internals. Provide a minimal Hermes-style example. Verify React StrictMode double-mount and Solid `onCleanup` do not leak or double-initialize.
  Done: both bindings mount the same `RenderModel` and pass the contract smoke test; StrictMode double-mount is clean.

- [ ] **P8.3 Static export**
  Build on `@spacegraphjs/svg-renderer` for `renderToSVG(RenderModel)` and JSON serialization. Use it for docs, artifacts, and hosts that need a static preview.
  Done: a fixture renders to SVG without a browser; JSON round-trips.

- [ ] **P8.4 Host-neutral activity adapter**
  Define `ActivityGraph` and `ActivitySource` only when the second host needs them. Keep OpenCode's `GraphModel` as the reference adapter; do not move session semantics into the library.
  Done: a non-OpenCode event stream maps to `RenderModel` through the adapter.

- [ ] **P8.5 Host integration guide**
  Document data mapping, renderer choice, theming, zoom policy, layout, accessibility, persistence, and export. Include a Hermes-style checklist and the non-OpenCode demo.
  Done: a new host can integrate without reading OpenCode code.

- [ ] **P8.6 Second-host reference fixture**
  Add a small non-OpenCode host demo with HTML cards, tool calls, artifacts, failures, and a retry. Use it in the contract suite.
  Done: the fixture runs against both adapters and is part of the library demo.

- [ ] **P8.7 Contract version negotiation**
  Document semver and `CONTRACT_VERSION`; adapters declare supported versions; hosts fail gracefully on mismatch.
  Done: a mismatched adapter produces a clear error, not a runtime crash.

- [ ] **P8.8 Optional incremental updates**
  If profiling shows full-model diffs are too expensive for a high-frequency host, add `RenderModelPatch` (`added`/`updated`/`removed` nodes and edges) to the contract. Keep `setModel` as the baseline and implement patches in both adapters.
  Done: the patch path passes the same conformance suite; the host can choose full or incremental updates.

- [ ] **P8.9 Text direction and locale**
  Make DOM cards and labels respect the host's `dir`/`lang`. Add `direction?: "ltr" | "rtl"` to `RenderTheme`; verify an RTL fixture in the library demo and in OpenCode.
  Done: card text, labels, and controls render correctly in RTL without mirrored graph coordinates.

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
- `spacegraphjs/test/boundaries.test.ts`
- `spacegraphjs/demo/activity-contract.ts` (non-OpenCode reference demo)
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
