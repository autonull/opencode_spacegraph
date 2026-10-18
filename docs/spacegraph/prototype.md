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

## Phase 5 — capture and conformance (V5.1–V5.4, V5.6)

One command produces every image and one command proves both adapters still honor the contract:

- `bun run graph:capture --mode=baseline|demo|compare|verify` writes to `docs/spacegraph/screenshots/`
  (`verify` renders into a temp dir and asserts the committed set). `demo`/`compare` capture the app's
  routed session through `packages/app/e2e/graph/capture.spec.ts`; `compare`/`verify` add the Cytoscape
  frames from `packages/session-graph/component-tests/graph-capture.spec.ts` (the app has no renderer
  switch yet). Readiness is the preserved WebGL drawing buffer, not a node count.
- `bun run graph:verify` runs the headless contract suite against both adapters, the package boundary
  test, the four leaf/contract packages, the session-graph unit and component suites, and the capture
  verify pass.

Committed images: `01-log`, `02-graph-overview`, `03-graph-execution`, `04-graph-selected`,
`05-return-to-log`, `06-graph-3d`, `07-cytoscape-overview`, `08-cytoscape-selected`. Determinism:
viewport 1440×900, device scale factor 1, dark scheme, en-US, reduced motion, and the clock-free fixture.

Known defects found while capturing:

- `GraphCanvas`'s model/theme effects used `mounted?.renderer.setModel(props.model)`, so `props.model`
  was never read while `mounted` was undefined and the effect never tracked it; after mount, level
  switches and live appends reached the DOM but never the WebGL scene. Fixed by reading the props first.
  The capture spec guards it by asserting the overview→execution level change repaints the canvas.
- Orthographic `fitView` derives the camera distance from a perspective `fov`/`aspect`, so it does not
  center the graph; the session root and overview clusters can fall outside the frame (image 02 is the
  weakest). `calculateFitView` should be projection-aware.
  **Resolved** (see "SpaceGraph renderer essentials"): `calculateFitView` is now projection-aware and
  `GraphView` fits on load and on level/projection change.
- The graph toolbar's right side (`Renderer: …` and the back control) sits beneath the floating
  `session-header-toggles`, so those controls are not clickable at 1440×900. The capture returns to the
  transcript through the header toggle instead.
  **Resolved** (see "Phase 5 verification"): `GraphView`/`GraphToolbar` reserve an inline-end inset and
  the app wrapper passes the desktop toggle width; `02`/`04` show the back control clear of the toggles.
- `THREE.Color: Invalid hex color #XXXXXXff` at mount (a warning): the host token background is 8-digit
  hex and reaches `new THREE.Color(string)` unchanged.
  **Resolved** (see "SpaceGraph renderer essentials"): the core `Renderer` normalizes its background
  through `parseColor`, which drops alpha from 8-digit hex.

## Phase 5 verification (V5.7–V5.9, U3.6)

Captured against the current `dev` tree; see `SPACEGRAPH.TODO.1.md` §0 for the full pass log.

### U3.6 — renderer comparison

Both adapters consume the same `RenderModel` (same fixture, same `buildRenderModel`). The differences
are declared capabilities, not behavior:

| Aspect | SpaceGraphJS (`@spacegraphjs/spacegraph-renderer`) | Cytoscape (`@spacegraphjs/cytoscape-renderer`) |
|---|---|---|
| Projection | 2D orthographic + 3D perspective | 2D only (`setProjection('3d')` is a declared no-op) |
| Lazy chunk (built app) | core `activity-*.js` 1,039.6 KB min / 282.0 KB gzip (includes `three`) | `cytoscape.esm-*.js` 435.0 KB min / 137.9 KB gzip |
| HTML cards | CSS3D `HtmlNode`/`DOMNode`, cap 40 | clipped DOM overlay, cap 20 |
| Edge labels | CSS2D, constant screen size, decluttered | cytoscape labels |
| Cluster nodes | model nodes | model nodes (compound-free) |
| Selection, click/drag, fit/focus, viewport | contract events | contract events |
| Minimap | declared unavailable | declared unavailable |

Navigation for the five mission questions is identical in both (toolbar level, breadcrumbs, search,
inspector, edge-follow); the toolbar disables 3D with an explanation under Cytoscape. Paired
screenshots: `02`/`03`/`04` (SpaceGraphJS) and `07`/`08` (Cytoscape). The default renderer stays
SpaceGraphJS because it is the only one with the 2D+3D story the hypothesis tests; Cytoscape is the
2D fallback and benchmark and renders the same model without any host branch.

### V5.7 — performance

| Metric | Budget (§9) | Measured |
|---|---|---|
| Model build, 300-message / 1201-node synthetic stream (`performance.test.ts`) | 200 msgs < 50 ms | ~27 ms (guard ceiling 250 ms) |
| Lazy SpaceGraphJS chunk (gzip, excluding `three`) | < 400 KB | core chunk 282.0 KB gzip incl. `three`; adapter 2.0 KB gzip |
| Lazy Cytoscape chunk (gzip) | < 250 KB | 137.9 KB |
| Session-graph UI chunk | — | 28.3 KB min / 8.8 KB gzip |
| Session entry delta | no measurable regression | not measured — the graph is lazy, so no graph module is in the entry; the P0.1 baseline was never captured |
| First graph paint / pan frame rate | < 500 ms / 60 fps | not measured — no graph perf harness is wired; DOM/canvas readiness is asserted instead |

`packages/session-ui/src/graph/performance.test.ts` is the complexity guard: a 300-message,
tool-heavy stream must build and lay out under a generous ceiling, catching an accidental O(n²) join
without flaking under CI load.

### V5.8 — accessibility

- Library layer: `spacegraphjs/test/a11y.test.ts` (jsdom) covers roving tabindex, Arrow/Home/End
  skipping non-interactive items, Enter/Space, Escape, and the `aria-live` announcement.
- Browser traversal against **both** adapters: `packages/session-graph/component-tests/graph-a11y.spec.ts`
  walks the hidden mirror to a node, activates it with Enter, and asserts the inspector under
  SpaceGraphJS and after switching to Cytoscape.
- The app has no dedicated axe/automated a11y suite; the keyboard path is exercised through the
  component suite and the app e2e. Reduced motion: the capture spec emulates `prefers-reduced-motion`;
  no dedicated reduced-motion assertion exists for the adapter's camera animation.

### V5.9 — cross-environment

| Environment | Result |
|---|---|
| Web dev (`bun run test:e2e -- e2e/graph/session-graph.spec.ts`) | 10 pass (9 original + the toolbar-occlusion case) |
| Built web (`PLAYWRIGHT_BUILD=1`, same spec) | 9 pass, 1 skipped (the dev-only module-load fallback, whose chunk URL is hashed) |
| Storybook component suite (`bun run test:components`) | 15 pass |
| Desktop shell | not run this pass |
| SpaceGraphJS demo pages (`test/e2e/hardening.spec.ts`) | not run this pass |

Known cross-environment caveat: WebGL under headless Chromium uses SwiftShader; the capture waits on
the preserved drawing buffer rather than a frame count, and DOM assertions are preferred where a
pixel is not the contract.

## Phase 6 — hybrid log + graph (H6.1, H6.2, H6.4, H6.6, H6.7)

The hybrid is delivered as progressive disclosure over the transcript: a compact subgraph of one turn
opens over the log, so the reader never loses their place. Nothing injects into timeline rows.

### H6.1 — host decision (recorded)

- **Turn map overlay host.** `packages/app/src/session/graph/turn-map-overlay.tsx` mounts the library
  `TurnMapOverlay` lazily inside the session panel's relative container (`screen.panel.ref`), so it
  covers the panel in either mode while the transcript underneath stays mounted (scroll position is
  therefore preserved for free). It is opened from the graph toolbar's "Open turn map" control (visible
  while a turn is selected) and from the `graph.turnmap` command (`mod+alt+t`). No
  `session-timeline-row.tsx` edit.
- **Synchronized side panel (H6.3) — deferred.** A side panel is an extension `Panel` (region `"side"`)
  in `packages/gui-extensions`, which is a materially larger surface: a new extension entry, per-locale
  i18n, a session store, and host integration, for a view whose first value (a graph popover that does
  not abandon the log) is already delivered by the overlay. Recorded as a deliberate deferral, not a
  silent omission.
- **Inline row host (H6.5) — deferred, approval-gated.** It would add a generic timeline slot, the one
  change that exceeds the core diff budget; it stays gated on maintainer approval.

### H6.2 — turn map overlay

- `packages/session-graph/src/ui/TurnMapOverlay.tsx`: a focus-trapped dialog (`role="dialog"`,
  `aria-modal`) showing the turn's execution-level subgraph (turn + highest-signal `part-of` children,
  capped at seven) through `GraphCanvas`, the same `GraphInspector` detail panel, and "Open full graph".
  Escape closes and focus returns to the control that opened it.
- `packages/session-ui/src/graph/selectors.ts` gains the pure `turnSubgraph(model, turnID, limit)`
  selector: children rank phases/failures/subagent/result above raw tools/files, ties keep model order,
  and `inferred-cause` never appears. Covered by new `selectors.test.ts` cases.
- `packages/session-graph/src/ui/turnMap.ts` scopes the model and reuses `layoutGraph`/`buildRenderModel`
  so the overlay positions match the full graph.

### H6.4 — generic inline subgraph

- `packages/session-graph/src/ui/TurnMapInlineGraph.tsx` is a thin, non-interactive wrapper over
  `@spacegraphjs/svg-renderer`'s `InlineGraph`, rendering a five-node turn subset as static SVG. It adds
  no graph logic and is theme-aware. It is not injected into the timeline (deferred with H6.5).

### H6.7 — flag and progressive disclosure

- The hybrid is **off by default**. The overlay opens only on explicit action (the toolbar control or the
  command); the graph view remains the primary alternate mode. Documented here: a graph appears where it
  answers a question (what happened in this tool sequence), not on every message.

### H6.6 — tests

- Component: `packages/session-graph/component-tests/turn-map.spec.ts` (5 cases) mounts the real overlay
  over a transcript placeholder and asserts open/ready, Escape-close, "Open full graph", a trapped focus
  ring, the Cytoscape fallback, and the inline SVG node cap.
- App e2e: `packages/app/e2e/graph/session-graph.spec.ts` adds "opens the hybrid turn map over the graph
  and closes on Escape", driving the toolbar control after a turn is selected.

## Phase 8 — portability (P8.3, P8.5, P8.6, P8.7, P8.9)

Library-side work that lets a second host reuse the boundary without OpenCode (see
`spacegraphjs/docs/host-integration.md`):

- **Contract version negotiation.** `negotiateContract` in `@spacegraphjs/renderer`; the host registry rejects an
  adapter whose declared `capabilities.contractVersion` is unsupported and falls through.
- **Static export.** `serializeRenderModel`/`parseRenderModel` in `@spacegraphjs/svg-renderer` (validated,
  `undefined` on malformed input) beside `renderToSVG`.
- **Text direction.** `renderToSVG` emits `direction="rtl"`; the SpaceGraph adapter wraps host card markup in a
  `dir` container; the Cytoscape adapter sets `dir` on overlay cards; the host bridge reads
  `document.documentElement.dir`. Graph coordinates are never mirrored.
- **Second-host fixture.** `spacegraphjs/test/fixtures/activity-host.ts`, exercised by the shared conformance suite.

Also fixed here: the Cytoscape adapter passed 8-digit-hex host theme tokens into `cy.style`, logging
`The style property … is invalid`; `normalizeTheme` now normalizes colors at mount/`setTheme`. The adapter-failure
app path (below) surfaced it.

### Adapter fallback in the app

SpaceGraph mount failure now falls back to Cytoscape with a visible `data-slot="graph-fallback"` banner and 3D
disabled; when no adapter mounts, the error state's Back control returns to the transcript. Both paths have
dev-only app e2e cases (the built chunks are hashed, so `PLAYWRIGHT_BUILD=1` skips them).

## L1.29 — non-OpenCode reference demo (done)

`spacegraphjs/demo/contract.html` + `demo/contract-demo.ts` is a second host built only from the public surface:
the contract, `LaneLayout`, `ZoomBands`, `Trail`, `AccessibilityLayer`, and the three renderer leaves. It carries
no OpenCode import and no session vocabulary.

- One synthetic activity stream (intent → explore → edit/artifact → delegate → failing verify → retry → recover)
  is laid out by `LaneLayout` (lane → Y, per-lane ordinal → X, hierarchy depth → Z) and fed unchanged to the
  SpaceGraph adapter, the Cytoscape adapter, and the static SVG renderer. Neither renderer runs a layout.
- Controls switch renderer, projection (3D is disabled and explained when the active adapter lacks it), theme,
  text direction, and scene ("Pipeline" plus the P8.6 second-host fixture, now demo-consumed rather than test-only).
  Selection drives the `Trail` breadcrumbs, the `AccessibilityLayer` mirror (Arrow/Home/End, Enter, Escape), and a
  generic inspector whose edge rows follow a connection and label its `confidence`.
- `vite.demo.config.ts` now uses regex aliases (`^spacegraphjs$`, `^spacegraphjs/(.+)$`) plus `@spacegraphjs/*`
  source aliases, so the demo resolves the workspace packages without a pnpm link; the old bare `spacegraphjs`
  string would have rewritten `spacegraphjs/layout` to `src/index.ts/layout`.
- `test/e2e/contract-demo.spec.ts` runs five cases (SpaceGraph mount, renderer switch + SVG export + 3D gating,
  keyboard/connection/trail navigation, second-host fixture + RTL markup, light/dark capture) against the demo
  server (`SG_DEMO_URL`, page `/contract.html`). Light and dark captures are committed as
  `docs/spacegraph/screenshots/09-contract-demo-light.png` and `10-contract-demo-dark.png`, which is also the
  L1.4 light/dark screenshot check.
- Remaining demo gaps: the edge label pill is styled by demo CSS because the core hard-codes an edge-label
  background (a light theme otherwise draws theme text over a dark pill); the selected outline uses the core
  default colour because the SpaceGraph adapter still passes only `{ background }` to the core theme.

### Node-type registration collision (library bug, fixed)

Adding the demo exposed a real defect: `MermaidNode extends HtmlNode` and inherits `static typeName = 'HtmlNode'`,
so `#registerDefaults` (`cls.typeName || cls.name`) registered `MermaidNode` **as** `HtmlNode`, and
`PluginManager.registerNodeType` re-registered every class under its inherited `typeName`. Every `HtmlNode` in
the library was silently constructed as a `MermaidNode` (its label markup replaced the host `html`), and every
`Edge` subclass registered as `Edge` (the last subclass, `Wire`, won). Fixed with `nodeTypeName` (own-property
`typeName` only) used by `#registerDefaults`, and an own-property check in `PluginManager.registerNodeType`/
`registerEdgeType`. Regression test: `spacegraphjs/test/node-types.test.ts`. This is why the app captures now
show real card markup sizes (220×72) instead of the previous 160×60 label fallback.



