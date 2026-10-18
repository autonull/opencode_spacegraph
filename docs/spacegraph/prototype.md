# SpaceGraph prototype — running notes

Companion to `SPACEGRAPH.md` (design) and `SPACEGRAPH.TODO.1.md` (plan). This file accumulates the tested
state, measurements, and open issues that the plan's `R7.2` will turn into the final write-up.

## Tested revisions

| Repository | Revision | Notes |
|---|---|---|
| OpenCode (`opencode` monorepo) | `fd2c0454ea` (base) + the source-link/spike commit + the Phase 2 model commit | Branch `dev`; no `session-graph` branch, per the Phase 0 restart note |
| SpaceGraphJS (`spacegraphjs`, sibling repo, gitignored here) | `f7f5544` | Self-imports resolved, `src` entry points exposed, `./activity` types condition; chrome opt-in (L1.3), render/theme plumbing (L1.4), ortho projection + zoom telemetry (L1.12/L1.13), and the `@spacegraphjs/renderer` + `@spacegraphjs/spacegraph-renderer` packages (L1.19/L1.20) |

Linkage stays "sibling git repo, pinned SHA, not vendored, not a submodule" (P0.2).

## P0.1 — baseline

Deferred. The session-entry baseline command is
`cd packages/app && bun run bench:entry` (`PLAYWRIGHT_BUILD=1`, 20 repeats). It was not captured in this
pass because the source-link and spike changes touch no app code, so there is nothing yet to compare
against. Capture it before the first change to `packages/app` session/timeline entry code.

## P0.3 — source workspaces

- `spacegraphjs` is now a root Bun workspace (`workspaces.packages` in the repo `package.json`) and a
  `workspace:*` dependency of `packages/session-graph`. `bun install` links it (isolated linker; the
  symlink lives at `packages/session-graph/node_modules/spacegraphjs -> ../../../spacegraphjs`).
- `spacegraphjs/package.json` `main`/`module`/`types` and `exports` now point at `src` so the package is
  consumed from source for the prototype.
- The contract packages in the plan land as Phase 1 creates them (L1.19–L1.21a). So far
  `@spacegraphjs/renderer` (L1.19) and `@spacegraphjs/spacegraph-renderer` (L1.20) exist and are linked as
  workspaces and `workspace:*` deps of `packages/session-graph`. `@spacegraphjs/cytoscape-renderer` and
  `@spacegraphjs/svg-renderer` do not exist yet. P0.3 therefore links the core and two contract packages.

### Why `./activity` has a `types` condition

Consuming a workspace package from source means the consumer's `tsc` typechecks the library source with
the consumer's compiler options. Every package in this repo sets `noUnusedLocals: true`, and
`spacegraphjs/src` has ~19 unused locals plus a handful of genuine type errors (`core/bvh.ts` declaration
merge, literal-typed `readonly` fields in `DynamicThicknessEdge`/`HistoryPlugin`/`MermaidNode`, and
`Array.prototype.at` needing a newer `lib`). Cleaning those is L1.18 work.

Rather than pull that debt into `packages/session-graph`, the `./activity` export carries a `types`
condition pointing at `spacegraphjs/types/activity.d.ts` (a hand-authored stopgap declaring the lean
entry's surface). Vite and Bun resolve the `default` condition and load the real source; only `tsc` sees
the stopgap. This is the L1.1 "types condition" mechanism; replace the hand-authored file with generated
declarations once the library source is clean.

## P0.5 — SpaceGraphJS embed spike

`packages/session-graph/src/spike/graph-spike.tsx` mounts the real library (`SpaceGraph.create`) into a
sized container and renders 8 `HtmlNode` cards joined by `CurvedEdge`s. Covered by
`packages/session-graph/component-tests/graph-spike.spec.ts` and the `session-graph-spike` story. Evidence:
`docs/spacegraph/screenshots/00-spike-spacegraph.png`.

Verified in the component test (Storybook-backed Playwright, headless Chromium):

- the graph mounts, reports `nodeCount: 8` / `edgeCount: 7`, and renders 8 `[data-node-id]` cards;
- a single `SpaceGraph` instance exists after mount (`window.SpaceGraph.instances.size === 1`);
- container resize propagates (the canvas drawing buffer height follows a host height change);
- pointer drag over the canvas raises no console errors;
- the canvas is visible and the drawing buffer matches the container box.

### Lifecycle gotcha found

`Renderer`'s constructor forces the container it is given to `position: relative` and appends the WebGL
canvas and the CSS3D layer as absolutely positioned children. A wrapper that positions the graph container
with `position: absolute; inset: 0` therefore collapses to zero height, because the library overwrites the
`position`. The host element must supply a definite size and be the element handed to `SpaceGraph.create`.

### Measurements (bun build, minified, `three-mesh-bvh`/`onnxruntime-web`/`@monaco-editor/loader` external)

| Chunk | Minified | gzip |
|---|---|---|
| `spacegraphjs/activity` reachable surface, `three` external | ~27 KB | ~8.7 KB |
| `spacegraphjs/activity` with `three` bundled | ~360 KB | ~84 KB |

The engine's own code is small; `three` dominates. `packages/app` does not currently depend on `three`,
so the lazy graph chunk will carry it unless the app adopts `three` as a shared dependency. Both figures
are within the plan's budget (lazy SpaceGraphJS chunk < 400 KB gzip excluding `three`).

### Open issues for later phases

- ~~Default chrome is visible~~ **Resolved by L1.3 (`spacegraphjs` `cac6374`):** `DEFAULT_CHROME_PLUGINS`
  is separate from `DEFAULT_SYSTEM_PLUGINS` and `chrome` defaults off, so a bare graph mounts only the
  canvas + CSS3D layer. The committed spike screenshot predates this and should be regenerated.
- ~~The graph uses the library's hard-coded dark background (`0x1a1a2e`); there is no theme plumbing yet.~~
  **Partially resolved by L1.4:** `SpaceGraphOptions.render`/`chrome`/`theme` are plumbed and
  `theme.background` overrides `render.backgroundColor`; `transparent` renders onto the host surface. Node
  fill/stroke, edge color, label color/font, and selection/hover theming remain, and the OpenCode-token
  theme bridge is U3.7.
- The spike lives in `packages/session-graph` and runs under the Storybook host, not inside the routed
  session panel. Real placement in `packages/app` is Phase 4 (I4.2/I4.3); the plan's eval gate for Phase 0
  ("render and dispose cleanly in the real app shell") is not yet exercised end-to-end.

## Phase 1 progress

### L1.3 — default chrome opt-in (done, `cac6374`)

- `src/core/defaults.ts`: `FractalZoomPlugin`, `ZoomUIPlugin`, `MinimapPlugin`, `HUDPlugin` moved from
  `DEFAULT_SYSTEM_PLUGINS` to a new `DEFAULT_CHROME_PLUGINS`.
- `SpaceGraph.#registerDefaults` registers chrome plugins only when `options.chrome` is true.
- Verified by `spacegraphjs/test/chrome.test.ts` (chrome/system lists are disjoint; core
  `InteractionPlugin`/`LODPlugin` remain always-registered). Full library suite: 11 files, 160 tests.

### L1.4 — render/theme plumbing (partial, `cac6374`)

- `SpaceGraphOptions` gains `render?: RenderOptions`, `chrome?`, `theme?: { background }`.
- `RenderOptions` gains `transparent` and `preserveDrawingBuffer`; `Renderer` imports the single
  definition from `src/types.ts` (its duplicate is removed) and honors both new flags.
- `theme.background` takes precedence over `render.backgroundColor`; the hard-coded `0x1a1a2e` only
  applies when the host supplies neither.
- Remaining: theming beyond `background`, the `plugins` option, and the light/dark screenshot check via the
  L1.18 demo page. `projection` is now plumbed through `render.projection` (L1.12).

### L1.12 — orthographic projection, and L1.13 — zoom telemetry (done, `f7f5544`)

- `Renderer` owns a perspective and an orthographic camera and swaps the active one in
  `setProjection(projection, target?)`, deriving the ortho frustum from the perspective framing so the toggle
  preserves scale. `RenderContext.setCamera` follows the active camera; `onResize` keeps the ortho frustum
  aspect-correct.
- `CameraControls` takes a mutable `camera` with `setCamera`, disables orbit in ortho, and drives zoom
  through `orthographicCamera.zoom` (clamped 0.01–100).
- `src/core/zoom.ts` normalizes distance/ortho zoom to 0..1; `SpaceGraph.zoom`/`setZoom`/`zoomToFit`/`viewport`
  expose it and emit `camera:change`/`zoom:change`/`projection:change` (value-deduped).
- Verified by `spacegraphjs/test/zoom.test.ts` (10 tests) and the browser adapter contract test below.
- Not done: pointer-anchored ortho zoom (zoom scales the frustum about the target), and `projection` is not a
  top-level `SpaceGraphOptions` field (hosts set `render.projection`).

### L1.20 — `@spacegraphjs/spacegraph-renderer` (done, `f7f5544`)

- `spacegraphjs/packages/spacegraph-renderer` implements the `GraphRenderer` contract over the lean
  `spacegraphjs/activity` entry, loaded by dynamic `import()` inside `mount` (so importing the adapter pulls
  no `three`/WebGL). `src/mapping.ts` is the pure `RenderNode`/`RenderEdge` → core-spec mapping; `src/index.ts`
  is `SpaceGraphRenderer` (idempotent mount/dispose, ID-diffed `setModel`, selection, theme, projection,
  viewport, fit/focus/resize, events).
- Capabilities: `projections: ['2d','3d']`, `domNodes: true`, `maxDomNodes: 40`, `edgeLabels: true`,
  `clusterNodes: true`, `minimap: false` (honest until L1.27), `maxRecommendedNodes: 300`. The core never
  imports the contract (grep clean) and the adapter never runs a layout.
- Verified by `packages/spacegraph-renderer` `bun test` (10 tests) and `packages/session-graph`'s
  `component-tests/adapter.spec.ts` (`session-graph-adapter` story): mount, 5 nodes/2 edges, one `SpaceGraph`
  instance, 2D→3D→2D, selection, resize, dispose to zero instances, no console errors.
- Also fixed the pre-existing `LabeledEdge` constructor crash (the base `Edge` constructor called the
  overridable `update()` before the label fields existed).
- Limitations: node `type` changes are not remodelled; `fit(ids)` ignores ids; `resize()` just re-renders.

## P0.7 / P0.8 — blocked on the second adapter

`@spacegraphjs/renderer` (L1.19) and `@spacegraphjs/spacegraph-renderer` (L1.20) now exist, so the SpaceGraph
side of P0.8 is available. The Cytoscape spike (P0.7) and the two-adapter contract smoke test (P0.8) still
need `@spacegraphjs/cytoscape-renderer` (L1.21). Phase 0 exit gate 0 (both renderers) remains unsatisfiable
until then.

## Phase 2 — graph model (M2.1–M2.5, M2.8, M2.9; in-repo)

Started ahead of finishing Phase 0/1 because the model is pure, testable with `bun test`, and unblocks every
UI phase; the earlier reverted attempt at exactly this was the reason to do it carefully.

- Location: `packages/session-ui/src/graph/` (`model.ts`, `selectors.ts`, `fixture.ts`, `index.ts`, tests).
  Exported as `@opencode/session-ui/graph` and `@opencode/session-ui/graph/model`.
- Reuse contract (M2.2): `Timeline.constructSessionMessageRows` gained an additive `turnByMessageID`
  (message id → execution opener) computed inside its existing walk; the graph reads ownership from it and
  never re-walks the message stream. Projection suite still green (72 tests).
- `buildGraph(messages, status)` builds session/turn/message/reasoning/tool/subagent/file/result/error/
  retry/diff/compaction/notice nodes and `part-of`/`sequence`/`delegates`/`reads`/`writes`/`searches`/
  `produces`/`references`/`compacts`/`evidence` edges. `inferred-cause` is never emitted from adjacency.
- `selectors.ts` answers the five mission questions in unit tests (`selectors.test.ts`), so exit gate 2's
  "the model answers the five questions without rendering" holds in tests.
- Verification: `cd packages/session-ui && bun test src/graph` → 24 pass; `bun run typecheck` clean in
  session-ui and app.

Not done yet: `phase` nodes (M2.3), `levels.ts` (M2.6), `layout.ts` (M2.7). Phase 3 needs positions from
M2.7 before `buildRenderModel` can emit a `RenderModel`. See the plan's Phase 2 progress notes for detail.
