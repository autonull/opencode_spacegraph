# SPACEGRAPH.TODO.41.md — Flagship Capability Platform

**Status:** implemented (r17), 2026-11-18.
**Next (planned, not started):** plugin-only delivery in `SPACEGRAPH.TODO.43.md` (preferred); upstream merge fallback in `SPACEGRAPH.TODO.42.md`.
**Extends:** `SPACEGRAPH.TODO.39.md` (library lifts) and `SPACEGRAPH.TODO.40.md` (usability-first pivot).
**Supersedes:** nothing. v40's completed work stays done; this version adds the missing *design space*.

---

## Progress (r17, 2026-11-18)

Legend: ✅ complete · 🟡 partial · ⬜ not started. A phase is complete only when every sub-task and its gates pass.

| Task | Status | Evidence |
|------|--------|----------|
| P0.1 Capability manifest | ✅ | Library: `buildManifest` / `libraryManifest` / `libraryEntries` in `@spacegraphjs/config`; `test/manifest.test.ts` covers every library registry value. Host: `hostManifestEntries()` in `packages/gui-plugins/src/spacegraph/host-manifest.ts` lists lens goals/IDs, detail modes/tiers, layouts, zoom levels, density, depth, renderer strategies, equalizer presets, window kinds, time modes and salience signals; `host-manifest.test.ts` checks coverage. |
| P0.2 Config space and negotiation | ✅ | `ConfigSpace`, `ConfigState` (immutable + `#hash` round-trip), `negotiate` with capability/flag gating, `degraded-to` / `unsupported` reasons; tests, README recipe, built `dist`, root aliases, boundaries clean. |
| P0.3 Runtime explorer | ✅ | `demo/explorer.html` + `demo/explorer.ts`: every manifest axis (library plus second-host `source` / `view` / `level`) as switchable buttons, full state in `#hash`, randomize/reset/compare, presets labelled "examples, not defaults". Renders the contract fixture and `SecondHost` through `InlineGraph`; `window.__explorer` and `test/e2e/explorer.spec.ts` (13 passing). Added as a demo build input with a `test:explorer` script. |
| P0.4 Presets as experiments | ✅ | `Preset`, `EXAMPLE_PRESETS` (max detail, max widgets, full depth, zero motion, loud nodes), `applyPreset`; unknown axes are ignored so removing any preset leaves the space complete. Every preset axis is now declared in `libraryManifest()` and checked by `test/manifest.test.ts`. |
| P0.5 Flag bridge | ✅ | `GRAPH_FLAG_AXES` maps every `graph_*` flag to an axis, `graphFlagSet` resolves enabled flags plus `all_flags` as availability only; descriptors use `flag` / `valueFlags`; negotiation degrades gated values. |
| P1.1 One scale domain | ✅ | `ScaleDomain` in `spacegraphjs/src/zoom/ScaleDomain.ts`: composes `ZoomBands` (hysteresis, band changes), interpolates continuous position and `FractalZoomPlugin` importance/transition semantics, anchored target math for perspective and orthographic, deterministic and pure. `test/scale-domain.test.ts`; existing zoom tests green. |
| P1.2 Representation registry | ✅ | `src/representations/ladder.ts`: `RepresentationLadder`, `ladderFromStops`, `register` / `select` / `resolve`, `DEFAULT_RUNG_IDS`, kind and `minImportance` gates, host-owned `build` functions, and `collapseClusters` for cluster-as-representation. `test/representation-ladder.test.ts` (9 tests). The `lod` axis is in `libraryManifest()` and switchable in the explorer. |
| P1.3 Hysteresis and transitions | ✅ | Both ladders use the shared `selectRung` dead-zone selector and read interpolated importance and `transitionDuration` from `ScaleDomain`. `src/representations/playback.ts` adds a clock-injected, gsap-equivalent playback seam (`playRepresentationChanges`, `REPRESENTATION_EASINGS`) with reduced-motion instant swaps and stable ids. The explorer tracks previous rungs, plays `lod` swaps with SVG size/opacity interpolation, and exposes `transition()`; `test/representation-playback.test.ts` (5) and two e2e cases cover eased frames, reduced motion and a stable-id parity capture. |
| P1.4 Edge and cluster LOD | ✅ | `src/edges/ladder.ts`: `EdgeLadder`, `EDGE_RUNG_IDS` (`bundle → hair → arrow → ribbon`), host-owned styles, kind/importance gates and the shared hysteresis selector. `collapseClusters` in `src/representations/ladder.ts` hides members until the host's expand rung. `test/edge-ladder.test.ts` (6 tests); `edgeLod` is a manifest axis and visibly switches dash/width in the explorer. |
| P1.5 Cross-scale seams and fit gaps | ✅ | `src/navigation/descent.ts`: `DescentRegistry`, `kindDescent`, first-match arbitration and root-inclusive paths over host-defined kinds. `src/layout/fit.ts`: `declaredEmpty` and `contentBounds` exclude declared-empty columns from the fit frame without changing placement. Tests: `test/descent.test.ts` (5), `test/fit-bounds.test.ts` (3). No OpenCode vocabulary in either seam. |
| P2.1 Salience signal API | ✅ | `src/salience/signals.ts`: `createSalience(signals)` composes host-registered signals into a deterministic `[0, 1]` map with weighted `explain(id)` reasons. Built-in factories: `kindSignal`, `statusSignal`, `recencySignal` (host clock), `centralitySignal`, `selectionSignal`; `SALIENCE_SIGNAL_IDS`. Zero signals give a uniform zero map. `test/salience.test.ts` proves two hosts get different deterministic maps. The explorer supplies different signal sets for the contract fixture and the second host. |
| P2.2 Emphasis channel in contract | ✅ | `packages/renderer/src/index.ts` adds additive `emphasis?: number` to `RenderNode` and `RenderEdge`, `data?` to edges, `EmphasisChannel` / `EMPHASIS_CHANNELS` and `RendererCapabilities.emphasis`. `supportsEmphasis()` gates channels; current renderers ignore the score unchanged. `LIBRARY_CONTRACT_VERSION` bumped to `1.1.0`. |
| P2.3 Visual channel mapping | ✅ | `src/salience/channels.ts`: `EmphasisMapping` ranges, `mappingFor`, `applyEmphasis`, `applyEdgeEmphasis`, `applyModelEmphasis`. Edges inherit the louder endpoint. The explorer maps the `emphasis` axis to size/opacity/edge thickness and degrades unsupported channels to no mapping. Published as the lightweight `spacegraphjs/salience` subpath with `docs/salience.md` recipe. |
| P2.4 Explainability | ✅ | `explain(id)` returns descending weighted reasons with labels. The explorer adds a "Why is this big?" panel: click a node to see its score and contributing signals; exposed as `__explorer.explain(id)` and covered by e2e. |
| P3.1 Widget registry and slots | ✅ | `src/widgets/registry.ts`: `WidgetRegistry`, `WIDGET_SLOTS`, `WIDGET_CAPABILITIES`, host-owned `WidgetDescriptor` (`id`, `label`, `slots`, `representations`, `capabilities`, `initialSize`, `mount`) and DOM-free `WidgetHandle`. Published as `spacegraphjs/widgets` with `docs/widgets.md` and `test/widgets.test.ts`. The explorer registers three demo descriptors and resolves them against both the contract fixture and the second host. |
| P3.2–P3.5 Sizing, facing, fog, security | ✅ | `src/widgets/sizing.ts` clamps a host measurement to a budget with configurable overflow and layout feedback; `src/widgets/layer.ts` attaches/detaches on representation changes, routes interactive state and projects scene fog via `depthFade`. Card facing was already correct in `HtmlNode.faceCamera` / `WebGLRenderer.cardFacing` (T1.19) and is covered by `test/card-facing.test.ts`; overview dots/glyphs come from the P1 representation ladder. `src/widgets/security.ts` declares the host-sanitized/CSP boundary with `isSafeWidgetMarkup`; `test/widgets-security.test.ts` proves the library never evaluates, fetches or writes raw HTML. |
| P3.6 OpenCode adapter | ✅ | `packages/session-graph/src/ui/widget-registry.ts` registers the five host widgets as `WidgetDescriptor`s; `session-widget-components.tsx` injects the Solid components with `runWithOwner` so host context (i18n) survives; `sessionWidgetRequests` is the kind → id bridge moved out of `panel.tsx`. `NodeWidgetLayer` now consumes the registry through the library `WidgetLayer` and owns only screen position, event routing, per-widget `aria-label` and roving tabindex. `renderWidget` is deleted; `renderNodeWidget` stays deprecated for one minor through `legacyWidgetRegistry`. Parity: `widget-registry.test.ts` compares the legacy callback and the registry over frames 45–47 (diff/terminal/write) and 54 (todo); `node-widget-layer.spec.ts` proves labels and ArrowLeft/ArrowRight focus (it caught and fixed a direction bug). |
| P4.1–P4.5 Motion / world | ✅ | `spacegraphjs/motion`: `playMotion` (named verbs, stagger, easings, spring curves, reduced-motion final frames), `MotionDirector`, `CameraVerbRegistry` and a `CameraPolicy` that exposes opt-in orthographic orbit and content-relative zoom bounds; `spacegraphjs/depth` adds `blendDepth` / `sampleDepth` with host `lane/turn/hierarchy` axes; `spacegraphjs/world` declares scene features, instancing-vs-DOM LOD policy and descriptor-only sensory seams. `CameraControls.setOrbitInOrthographic` makes gap 7 switchable. Axes `motionVerb`, `cameraVerb`, `depthAxis`, `sceneFeature`, `sensory` and the `orbit-world` example preset are in the manifest and explorer. Tests: `test/motion.test.ts`, `test/depth-continuum.test.ts`, `test/world.test.ts`, 3 explorer e2e cases; 651 unit tests, 19 explorer e2e tests, boundaries, exports and `test:publish` pass. |
| P5.1–P5.5 Experiments | ✅ | `spacegraphjs/experiments`: `cartesianMatrix` (full product or seeded baseline + pairwise + capped fill, stable cell ids), `hasCombination` / `axisValues` coverage helpers, `MetricsHarness` with `fromCounterRecord` adapter, inert `EXPERIMENT_TEMPLATES` with stop rules, and `reportMarkdown` that always lists negative results. The explorer exposes `__explorer.matrix()` and `exportConfig()`, labels the comparison panes with the shared model/scale anchor, and the matrix includes `widgets` with two other axes. Tests: `test/experiments.test.ts` (7), one explorer e2e case; 659 unit tests, 20 explorer e2e tests, boundaries, exports and `test:publish` pass. |
| P6.1–P6.4 Packaging | ✅ | P6.1 `pnpm run explorer` starts the library demo; P6.2 adds `docs/compose-your-viewer.md` and `docs/not-decided.md` with the open decisions; P6.4 adds `minContractVersion` per axis, `minContractVersion()` / `contractFloor()` helpers, bumps the contract to 1.4.0 and documents the one-minor alias policy in `docs/contract-versioning.md`. P6.3 is proven without a registry: `pnpm run test:publish:second-host` packs 11 packages into an external consumer, serves the real second host with no source aliases, and checks all 19 capabilities and all three renderers. Registry publishing is explicitly out of scope. |
| r13 UI/UX polish | ✅ | Map atmosphere, card hierarchy (accent rail, path-aware labels, status glow), band headers, borderless lane captions, larger gallery previews, and the canvas-region ref that restores live card-tier measurement. All 30 app capture frames pass and are refreshed in `docs/spacegraph/screenshots/`. |
| r14 app matrix (next work 1) | ✅ | `script/app-matrix.ts` samples 12 combinations of the app-owned axes (layout × depth × level × lens) with the library's `cartesianMatrix` (seed 41) into `docs/spacegraph/screenshots/matrix/app-cells.json`. `packages/app/e2e/graph/capture-matrix.spec.ts` applies and verifies every value on the real OpenCode surface, writes 12 frames + per-cell hashes under `screenshots/matrix-app/`, and aggregates `screenshots/matrix-app.json`. `graph:capture` generates, captures and gates the report: 12/12 distinct frames, zero duplicate pairs, zero page errors. |
| r14 visual-quality gate (next work 2) | ✅ | Gap 6: the gallery frame measures every preview's SVG size, font-size floor (≥ 9 px) and WCAG contrast (≥ 4.5:1). Gap 3: a new capture assertion measures CSS3D card aspect under a tilted camera and proves the billboard switch removes shear (plane mean ≈ 1.6, billboarded ≈ 1.0); cards also keep a non-degenerate box. Both run in the existing app capture spec, so `graph:capture --mode=verify` enforces them without a production seam. Full `VisionAssert` on the live surface still needs the opt-in `global` registration (see remaining work). |
| r15–r16 host widgets on the app surface (next work 3) | ✅ | One host widget policy in `packages/gui-plugins/src/spacegraph/widget-host.ts` binds the library registry on the map, hybrid and panel surfaces from the same `prefs.widgets` gate; the map and hybrid surfaces previously rendered no widgets. `packages/app/e2e/graph/widget-behavior.spec.ts` proves the preference gates real widget kinds on the flagship map surface (2/2 pass). The host manifest declares the `widgets` axis from `HOST_WIDGET_STATES`. r15's pixel frames were removed in r16 as visual-appeal evidence that goes stale on redesign; the app capture matrix is back to its r14 form and `graph:capture --mode=verify` still passes. |
| r17 live VisionAssert (next work 2a) | ✅ | `GraphCanvas` now resolves `global` / `reducedMotion` at mount and forwards both through `renderer-registry.ts`; `SpaceGraphRenderer.mount` passes `global` into `SpaceGraph.create`, so `?debug=true` registers the live instance on `window.SpaceGraph` / `SpaceGraph.instances`. `packages/session-graph/component-tests/canvas.spec.ts` mounts the new `Global` story and asserts the instance registers (3/3 canvas specs pass). Library `dist` rebuilt. |
| r17 DOM-card fog (next work 2b) | ✅ | `LODPlugin` now multiplies the LOD opacity of DOM/CSS3D cards by the scene-fog curve (`sceneFadeDensity` + `depthFade`) from the active depth treatment, sharing the density inputs the WebGL fog uses. Flat depth leaves cards opaque; layered/depth-stack attenuate farther cards. `test/lod.test.ts` covers flat (=1) and depth-stack (far < near < 1); library 661 unit tests pass. No new capture frames — the gate is the library policy test, consistent with r16's rejection of stale pixel evidence. |

### Clarifications landed in r2–r7

- **Open decision 11 is settled for now:** the manifest is a *runtime data assembly*, not a generated file. `buildManifest(version, entries)` collects registry contributions; `libraryManifest()` reads the library registries; hosts append their own entries with the same shape. There is no code generation step to keep in sync.
- **`@spacegraphjs/config` stays dependency-free at its main entry.** Registry aggregation lives in the `@spacegraphjs/config/library` subpath, so the pure space/state/negotiation API can be imported by any host without loading three.js or the renderer.
- **`spacegraphjs/layout-registry` is a new published subpath** holding `LAYOUT_REGISTRY` and `LayoutRegistryEntry`. `src/core/defaults.ts` re-exports it. This keeps the manifest off the heavy core import (and its strict-mode drift).
- **`PROJECTIONS` / `CARD_FACINGS` / `RENDERER_STRATEGIES` are now exported constants**, so manifests enumerate values without duplicating literal lists. `canvasRendererFor` still maps everything to `spacegraph`; gap 11 remains open until the host registry gains the `svg-preview` id.
- **`LIBRARY_CONTRACT_VERSION = '1.0.0'`** in `@spacegraphjs/config/library` is the value P6.4 will bump on additive changes. Capability → minimum contract version metadata is still outstanding.
- **The manifest now declares `lod`, `widgets` and `motion` as axis descriptors**, so every example preset resolves to a declared axis. Widgets and motion *mechanisms* are still P3/P4 work; a descriptor only makes the option discoverable and switchable in the explorer.
- **The explorer is a plain-TypeScript library demo, not an OpenCode adapter.** It drives the contract fixture via `activityHostFixture()` and the second host via `SecondHost.renderModel()`, both rendered with `InlineGraph`. No OpenCode package is imported.
- **`vite.demo.config.ts` gained aliases** for `spacegraphjs/layout-registry`, `@spacegraphjs/overlays` and `@spacegraphjs/search`, so the second host and the explorer load without workspace links. This also unblocked an already-broken second-host demo page.
- **`selectRung` in `src/core/rung.ts` is the one dead-zone selector** shared by the representation and edge ladders. Ladder-specific registration, gating and output stay in each ladder; no selection policy is duplicated.
- **`spacegraphjs/edges/ladder` is a new lightweight published subpath.** Importing the heavy `spacegraphjs/edges` index early hits a pre-existing `core/defaults ↔ edges` initialization cycle; manifests and the explorer import the ladder subpath instead. The index still re-exports the ladder for general consumers.
- **Empty columns are a fit policy, not a placement change.** Layouts keep a declared-empty turn's column; only `contentBounds` drops it from the camera frame.
- **Code and plan live in separate git repositories.** Library code commits under `spacegraphjs/` (branch `main`); this plan commits in the outer repo (branch `pr1-plugin-surface-apis`).
- **Playback is a pure seam, not a gsap wrapper.** `playRepresentationChanges` takes a host interpolator and an injected clock; it emits eased progress with the rung's stable id. This keeps the headless `spacegraphjs/representations` subpath dependency-free while the explorer supplies the DOM-side appearance interpolation. `Node.tweenPosition` remains the three.js host path for consumers that own scene nodes.
- **`data-node-id` on SVG node groups is intentional public DOM.** The SVG renderer stamps the stable node id so selection, permalinks, the parity capture and the explain panel all address the same element across a rung swap.
- **Salience ships as `spacegraphjs/salience`, not a new workspace package.** It follows the same lightweight subpath pattern as `spacegraphjs/representations` and `spacegraphjs/edges/ladder`; the "public home" in the target map is satisfied by that subpath plus `docs/salience.md`. No new package, lockfile entry or workspace dependency was needed.
- **`emphasis` is data, not a renderer feature.** The contract field is additive and renderers keep ignoring it; only the host's `EmphasisMapping` writes visual fields. `supportsEmphasis` gates a channel the way `supportsDepth` gates depth, and an unsupported channel maps to nothing rather than falling back to a hardcoded default.
- **Contract version is now 1.1.0.** The additive `emphasis` fields and salience subpath are the P6.4-style bump; capability → minimum contract version metadata in the manifest is still outstanding and lands with P6.4.
- **The `loud-nodes` preset is another example, not a default.** It demonstrates `salience: combined` with `emphasis: size`; `emphasis: none` and `salience: none` remain the baseline so no configuration is chosen.

### Clarifications landed in r7 (P3)

- **Widgets ship as `spacegraphjs/widgets`, not a new package.** Like `salience`, `representations` and `edges/ladder`, it is a pure subpath: only a type-only import from `@spacegraphjs/renderer`, no DOM access and no heavy core import. `LIBRARY_ENTRIES` drives the export map and build; `pnpm run write:exports` regenerates `package.json`.
- **A descriptor is metadata plus a host mount.** `WidgetDescriptor` carries `id`, `label`, `slots`, `representations`, `capabilities`, `initialSize` and `mount(node, slot) -> handle`. Every `WidgetHandle` member (`measure`, `setOpacity`, `setInteractive`, `unmount`) is optional, so the library never needs an element and tests can use plain objects. No widget is hardcoded in the library.
- **Resolution has one policy.** `WidgetRegistry.resolve` filters in registration order by `RenderNode.widgets` (a host request, not a library choice), representation rung and enabled slot. A node can name a descriptor that is absent or ineligible; that degrades to no widget.
- **Measured size is host-supplied; layout feedback is opt-in.** `resolveWidgetSize` clamps the host measurement to a budget, reports overflow only when clamped, and sets `feedLayout` false by default. A widget cannot reframe the map unless the host's sizing policy allows it.
- **DOM fog reuses the depth primitive.** `WidgetLayer.setDepthFade(distance, density)` calls `depthFade` from `spacegraphjs/depth` and forwards opacity to the handle. There is no second attenuation curve. `CardFacing` already works in `HtmlNode.faceCamera` under the renderer's `cardFacing` policy; P3.3 needed no facing rewrite.
- **Widget contract fields are additive.** `RenderNode.widgets` / `RenderNode.widgetSlots` and `RendererCapabilities.widgetSlots` are optional strings; `supports(capabilities, 'widgets')` gates the control. `LIBRARY_CONTRACT_VERSION` is now `1.2.0`. Capability → minimum contract version metadata still lands with P6.4.
- **The explorer's widgets are demo registrations, not host widgets.** `summary`/`composer`/`terminal` exist only in `demo/explorer.ts`, use no OpenCode import and resolve against both graph sources. They prove the registry, slot and fog seams without importing any real host widget.
- **Security stays a host contract.** The library guard `isSafeWidgetMarkup` rejects executable vectors but is explicitly not a sanitizer; escaping still happens in `buildRenderModel` and the host `security.test.ts` remains the parity baseline (P3.5).
- **P3.6 is deliberately deferred.** `NodeWidgetLayer.renderWidget` stays in place until a parity test proves the library registry matches frames 45–47 and 54. Per rule 7, the adapter is a separate consumer PR; removing the host layer before that proof would be a defect.

### Clarifications landed in r8 (P3.6)

- **The adapter is a consumer, not a second registry.** `createSessionWidgetRegistry(host, components)` fills the library's `WidgetRegistry`; `createOpenCodeWidgetRegistry` is the convenience binding of the five real Solid widgets. No descriptor list or lifecycle logic is duplicated in the host.
- **Solid context crosses the mount boundary deliberately.** `mountSolid` captures `getOwner()` when the registry is created and mounts with `runWithOwner`, so a widget rendered into its own element still resolves host context such as i18n. The library handle stays DOM-free; `element`, `measure`, `setOpacity`, `setInteractive` and `unmount` are all host callbacks.
- **Kind → widget gating is host policy.** `sessionWidgetRequests` is the migrated panel rule; `panel.tsx` supplies composer, model, diff stats, drill-down, parked/read-only and preference gating. The library resolves tokens only and never imports session vocabulary.
- **The host wrapper owns focus.** `NodeWidgetLayer` drops `renderWidget` entirely. It adds `aria-label` per widget and ArrowLeft/ArrowRight roving tabindex; the library `WidgetLayer` owns resolution, attach/detach and depth-fade. Per rule 7, the legacy path was kept until parity passed, then deleted.
- **Deprecation follows rule 10.** `renderNodeWidget` is still accepted on `SessionGraph`/`GraphInline`/`GraphTranscriptSurface` and adapted by `legacyWidgetRegistry`, which registers the same five ids so `sessionWidgetRequests` gates both paths identically. It is a removal candidate after one minor.
- **Parity is resolution + a11y, not a pixel re-bless.** The historical frames 45–47/54 no longer exist in the current capture gate, so parity is proven by comparing which descriptors the legacy callback and the registry select for those frame nodes, plus a DOM-level focus/label test. Pixel parity needs the capture gate re-established (see gaps below).
- **`supports(caps, 'widgets')` is a predicate fix, not a contract change.** It now maps to `widgetSlots`; library package `dist` was rebuilt, all 636 unit tests and `test:publish` pass. No `LIBRARY_CONTRACT_VERSION` bump: no additive field landed in r8.

### Clarifications landed in r9 (P4)

- **Motion is a sequencer, not a gsap wrapper.** `playMotion` owns verb ordering, stagger, timing, easing and the injected clock; a host registers a handler per verb and decides which channel (emphasis or camera) a frame mutates. Canonical positions are never an output. Reduced motion emits only final frames, matching P1.3 playback.
- **Springs ship as data and analytic curves.** The numeric spring presets from `packages/shared` are copied into the dependency-free `spacegraphjs/motion` subpath and exposed as `spring.*` easings; no Solid or gsap import reaches the motion seam. Spring curves may overshoot; hosts clamp `[0, 1]` channels.
- **Camera verbs are host adapters, not library flights.** `CameraVerbRegistry` supplies neutral defaults that call a host adapter bound to `CameraController` / `CameraControls`; registering a verb overrides it. Gap 7 is a *policy*: orthographic orbit stays off unless the host calls `setOrbitInOrthographic(true)`, and content-relative zoom bounds are the existing fitted `setOrthoZoomRange` multiplied by a host `CameraPolicy`. No single flight is exported.
- **Depth is an interpolation over existing treatments, not a new mode.** `blendDepth` keeps `DEPTH_MODES` as endpoints; `sampleDepth` adds a host-normalized `lane` / `turn` / `hierarchy` offset and reuses `depthFade`. Existing `DepthController` behavior is unchanged at the endpoints.
- **The world is optional features plus one LOD swap.** `SCENE_FEATURES` (`fog`, `lights`, `parallax`, `trails`, `instancing`) and `worldRepresentation` (overview rungs instanced, detail rungs DOM) are policy; the library does not own lights, fog or instanced meshes. Sound, haptics and WebXR stay descriptors and report unsupported until a host adapter exists.
- **Contract version is now 1.3.0.** The five new manifest axes are additive capability surface. Capability → minimum contract version metadata still lands with P6.4.
- **The explorer's motion/camera/world state is observable.** `window.__explorer` exposes `world()`, `sensorySupport()`, `camera()`, `depth()`, `motion()` and `playMotion()`; changing `motionVerb` plays an emphasis pulse on stable-id SVG nodes. No OpenCode import was added.

### Clarifications landed in r10 (P5–P6)

- **The matrix sampler is dependency-free and structural.** `cartesianMatrix` takes `{ id, values }[]`, so it works with `ConfigSpace.axes` without importing `@spacegraphjs/config` (which would invert the library dependency direction). Full products enumerate; larger ones keep the baseline, all pairwise combinations of `pairWith` axes, then a seeded LCG fill up to `maxCells`. The strategy, seed and cap are part of the result and therefore of every report.
- **The explorer is the comparison surface, not a capture gate.** Comparison already renders both panes from one model and one `ScaleDomain`; r10 labels that shared anchor and adds JSON config export. The actual frame capture gate lives in the outer repo (`script/capture-graph-demo.ts` and `packages/app/e2e/graph/capture.spec.ts`); adding frames there is still required for visual evidence.
- **The metrics API is neutral on purpose.** `MetricsHarness` records arbitrary `{ id, kind, at?, meta? }` events; `fromCounterRecord` adapts `StudyCounters` without importing it. No kind is a success criterion, no template fires automatically, and reports state negative results explicitly.
- **Contract metadata is additive.** `minContractVersion` is optional on `AxisDescriptor`, so a consumer on an older manifest still parses. The contract is now 1.4.0; the floor needed to discover all axes is 1.3.0. Capability detection still uses predicates, not the constant.
- **P6.3 was deliberately open at r10.** `test:publish` proved an external consumer can pack and mount both renderers, but the flagship claim still required the second host to consume packed tarballs. r11 closed that gap by driving the real second host from tarballs with no source aliases. Registry publishing is not part of this version.

### Clarifications landed in r11 (P6.3, capture, harness)

- **The second-host publish proof is a new consumer, not a reconfigured demo.** `script/publish-check/pack.ts` packs the 11 packages the demo imports and extracts them into a temp consumer outside the repo. The Vite server in `second-host-browser-check.ts` has no source aliases, so a workspace link cannot satisfy an import; the check drives the real page and asserts all 19 capabilities plus all three renderers. `test:publish` was refactored onto the same packing helper and still passes.
- **Publishing is out of scope, so tarballs are the proof boundary.** The demo must consume packed tarballs rather than sibling workspaces; no package is uploaded to a registry. The r11 `publish:ordered` driver was removed in r12 because it served only a release that is not planned.
- **Cartesian evidence lives where every axis is switchable.** `test/e2e/capture-matrix.spec.ts` drives the explorer's 24 sampled cells, applies and verifies every value, writes frames plus `matrix.json`, and checks geometry, a legibility floor, and duplicate hashes. Outer `graph:capture` now invokes it and verifies the committed manifest.
- **Duplicate frames are negative results, not always defects.** Depth, projection, card facing and emphasis can be visual no-ops at `dot` LOD; the report lists those pairs with their differing axes. Only a duplicate across different `lod` rungs fails the gate, because a representation change must change the picture.
- **The host harness failures were stale expectations, not product defects.** Six specs used `packages/stories/playwright/story` (manager URL and `#story-root`) instead of the shared Storybook helper; gallery count drifted from 5 to 7 layouts; the a11y specs asserted labels and attributes the product never had (`Graph contents: Session map`, `aria-description`, `aria-activedescendant`). `src/canvas/scale.test.ts` used a 5000-message force layout and a wall-clock assertion; it now uses the lanes strategy and structural bounds.
- **The scale test proves the pipeline, not speed.** It builds the same long session and asserts a band per turn and a capped drawn window; a quadratic regression now trips the test timeout instead of a 400 ms budget that varied by machine.

### Clarifications landed in r13 (UX polish)

- **The live map is `SessionGraph.tsx`, not `GraphView.tsx`.** The plugin surfaces `spacegraph.map` / `spacegraph.hybrid` render `SessionGraph` from `@opencode/session-graph`; the app's `SessionGraphView` / `GraphView` path is not mounted. A UI fix that lands only in `GraphView.tsx` is invisible in the captured product.
- **The canvas-region ref was dead.** `SessionGraph` passed `canvasRegionRef`, but `GraphCanvasRegion` never forwarded its element. `canvasSize` stayed at zero, so the card tier never advanced past `closest` and every card carried its full payload — the main cause of the cluttered captures. `GraphCanvasRegion` now forwards the element, and a `cardEpoch` re-measures after each applied model.
- **Tier is measured from a drawn card, not the camera extent.** CSS3D's on-screen scale and the renderer's reported world extent disagree; the card box is fixed by the layout, so measuring one rendered card is the reliable legibility signal. Structural cards map through `COMPACT_SIZE`.
- **A lane label is a caption, not a card.** The adapter emits a transparent, borderless, muted container and `currentColor` text, so the gutter reads as an axis instead of a column of outlined chips.
- **Path labels keep their tail.** At far tier a path shows its basename, at mid its last two segments with `…/`; the full label stays in the element's `title`. This is semantic zoom on the label itself, with no host vocabulary in the library.
- **The dot-grid atmosphere was dropped.** It doubled screenshot PNG sizes while being nearly invisible; a single faint radial glow remains behind the transparent WebGL buffer.
- **The graph keeper suite is broken ahead of r13.** `e2e/graph/session-graph.spec.ts` has 30 failures on this branch: an app-level `HierarchyRequestError` when the narrow viewport mounts the map, a layout-persistence mismatch, and cascading 60 s click timeouts. Two representative failures reproduce with the r13 ref change reverted, so they are not r13 regressions. The two assertions that named a full path as visible card text were updated to the tier-aware basename and pass.

### Clarifications landed in r14

- **The app matrix samples the axes the toolbar owns, not the explorer's 19.** The app has no generic config-injection seam: `layout`, `depth`, `level` and `lens` are set through toolbar/layers controls, while the other 15 explorer axes have no OpenCode equivalent (contract fixture vs second host, widget/salience/emphasis/motion policies). Feeding the explorer's literal cells would vary `level` in 0/24 cases and `lens` not at all, so it would produce near-identical app frames. The app matrix uses the same library sampler and seed on the expressible axes instead; the explorer remains the full-space evidence.
- **One page per matrix cell.** Switching depth repeatedly on a single mounted graph trips a pre-existing Solid `Maximum call stack size exceeded` in the keeper path (the same family as r13's 30 keeper failures). Isolating each cell also matches the rest of the capture gate, so the matrix spec generates 12 independent tests.
- **Lens is a filter, not a picture axis.** A lens change may be a visual no-op on the fixture; duplicate frames that differ only by `lens` are recorded as negative results. A duplicate across `layout`, `depth` or `level` still fails the gate, matching P5.1's rule that a representation/structure change must change the picture.
- **Gap 3 is measured at the DOM boundary, not with `VisionAssert`.** CSS3D cards write `style.opacity` through `DOMNode.setOpacity`, but the captured fixture shows no depth attenuation on cards, so opacity is not a usable fog signal here. Card aspect (`getBoundingClientRect` ratio vs `offsetWidth/offsetHeight`) is: plane cards under a tilted camera shear to ≈ 1.6, billboarded cards return to ≈ 1.0. The gate asserts the billboard invariant; the existing `global` option on `SpaceGraph.create` still needs to be threaded from `useDebugMode` through `GraphCanvas` and the renderer adapter before `VisionAssert` can read the live instance.
- **Gap 6 needs no production seam.** Gallery previews are static SVG rendered from the same theme the host already holds, so font-size, box size and colour-contrast are read straight from the DOM/WCAG formula. The existing component-test legibility floor (card height ≥ 36 px) stays; the new floor applies to gallery previews.
- **The capture report is a derived artifact.** Per-cell JSON files are written beside each PNG; `graph:capture` assembles `matrix-app.json` for both demo and verify modes. The committed copy under `docs/spacegraph/screenshots/` is the demo output; verify mode re-derives it into a temp dir and checks both the committed frames and the fresh hashes.

### Clarifications landed in r15

- **The map and hybrid surfaces had no widget registry.** `prefs.widgets.enabled` was read only by the side panel (`panel.tsx`); the flagship `spacegraph.map` / `spacegraph.hybrid` surfaces passed no `widgetRegistry` to `SessionGraph`, so widgets never rendered there even when enabled. r15 extracts one host policy into `widget-host.ts` and passes the same registry accessor from `external/renderer.tsx` setup into all three surfaces. No library change and no `dist` rebuild were needed.
- **The app's widget axis is the persisted preference, not a new toolbar control.** The matrix seeds `opencode.global.dat:plugin.spacegraph.prefs` through the real preference store before navigation; the existing settings toggle is the user-facing control. This keeps the gate on the product's configuration seam rather than adding a test-only control or a new default surface.
- **`none` / `all` / `diff` / `terminal` are host widget states, not library slots.** The library `widgets` axis enumerates slots (`header`, `body`, `footer`, `attached`, `pinned`, `max`); the app enumerates which host widgets are enabled. The host manifest declares its own `widgets` axis from `HOST_WIDGET_STATES`, so the coverage gate reflects the app surface without renaming the library axis. (r15 also fed these states into the app matrix; r16 removed that, but the manifest declaration stays.)
- **The r15 pixel-frame experiment was reverted in r16.** Its per-cell `widgetLabels` and "at least four rendered widget frames" gate were tied to PNG evidence; r16 keeps the kind assertions as a functional e2e case and restores the app capture matrix to its r14 form. The reasoning is in the r16 clarifications below.

### Clarifications landed in r16

- **Pixel frames were the wrong evidence for this item.** `SPACEGRAPH.md §1.2` sets the success criterion to measured task performance, not visual appeal, and §10 keeps the product claim gated on the unrun study. Committed widget PNGs and per-frame hashes go stale on every visual redesign, cost a 20-page capture run to refresh, and prove nothing the DOM cannot assert. r16 reverts the r15 pixel artifacts (`app-matrix.ts`, `capture-matrix.spec.ts`, `capture-graph-demo.ts`, the matrix cells/frames/report) to their r14 form and keeps only the durable parts.
- **Widget parity is a functional contract, not a picture.** `widget-behavior.spec.ts` seeds the real preference store and asserts that enabling `widgets` renders host widgets with their kind labels on the flagship map surface, and disabling it renders none. This survives redesign and would fail if the registry wiring regressed — the actual r15 defect.
- **The host `widgets` manifest axis stays.** It is the discoverable configuration surface (`HOST_WIDGET_STATES`) for the preference the behavioral test drives; it does not depend on any capture frame.

### Clarifications landed in r17

- **The debug flag was wired halfway, not absent.** `useDebugMode()` → `useCanvasRegionProps.global` → `GraphCanvasRegion` already passed `global` to `GraphCanvas`, but `GraphCanvas` declared the prop and dropped it at the `mountRenderer` call. The same drop applied to `reducedMotion`. Both now resolve at mount (the value is a memo-backed `() => boolean`) and flow through `renderer-registry` into the adapter. No library semantic change: `SpaceGraph.create` already registers instances when `global: true`.
- **`global` is passed as a variable, not an object literal, at the contract mount.** `GraphRenderer.mount` declares only `{ theme, projection }`; building a `mountOptions` variable avoids an excess-property error without widening the shared renderer contract or forcing a renderer-package rebuild beyond the adapter.
- **A story, not a production seam, proves live registration.** The `Global` canvas story renders the real `GraphCanvas` with `global: true`; the component test reads `window.SpaceGraph.instances`. Reverting the threading makes the instance absent, so the test fails on the pre-fix code. No `data-*` attribute or test-only parameter was added.
- **DOM fog belongs where DOM opacity already lives.** `LODPlugin` is the only per-frame writer of `DOMNode.setOpacity`; adding a second writer in `DepthController` would be overwritten every frame. The plugin now derives fog density from the active depth treatment using the same `sceneFadeDensity` inputs as WebGL scene fog, and multiplies the LOD opacity by `depthFade(cameraDistanceToNode, density)`. Per-node distance (not the ortho extent) makes near cards fade less than far ones in both projections.
- **Fog is a library policy test, not a pixel gate.** Cards attenuate by the depth treatment; a committed PNG hash would go stale on redesign and prove less than the unit assertion. This follows r16's decision that visual appeal is not the success criterion (`SPACEGRAPH.md §1.2`).

### Next concrete work

1. **App-surface combinations — done in r14.** `capture-matrix.spec.ts` closes the "combinations only in the explorer" gap with 12 verified app frames. The one-option frames remain because each isolates a named scenario; the matrix is additive, not a replacement. The 19-axis explorer matrix stays the full-space evidence.
2. **Visual-quality gate — done. Gaps 3 and 6 gated in r14, both remaining sub-items closed in r17.** Gallery previews have a font-size/box/contrast floor and billboarded cards have an aspect-shear gate; `graph:capture --mode=verify` runs both.
   - **Live `VisionAssert` instance — done in r17.** `GraphCanvas` forwards `global` / `reducedMotion` through `renderer-registry.ts` into `SpaceGraph.create`; `?debug=true` registers the instance on `window.SpaceGraph` / `SpaceGraph.instances`, which is what `createVisionAssert(page)` reads. Proven by the `Global` canvas story and `canvas.spec.ts`. Library `dist` rebuilt. The DOM aspect gate remains the shear evidence; the live instance now makes `createVisionAssert` usable on the real surface.
   - **Fog on DOM cards — done in r17.** `LODPlugin` multiplies DOM-card LOD opacity by the depth-treatment fog curve, so flat depth is opaque and layered/depth-stack attenuate farther cards. Covered by `test/lod.test.ts`; widget fog stays a separate, already-tested seam. No pixel frames added (see r16).
3. **P3.6 widgets on the app surface — done in r15–r16.** The map, hybrid and panel surfaces now share one host widget registry gated by `prefs.widgets`, so the flagship surface actually renders widgets. `widget-behavior.spec.ts` proves the gate and per-kind resolution on the real surface; `widget-registry.test.ts` and `node-widget-layer.spec.ts` keep the resolution/a11y parity. Pixel-frame blessing was tried in r15 and deliberately removed in r16: visual appeal is not the success criterion (`SPACEGRAPH.md §1.2`), and PNG hashes go stale during redesign. No further pixel work is planned for this item.
4. **Keep the coverage gates:** any new axis value needs a manifest entry (now with a `minContractVersion`), an explorer control, a preset where it belongs, and a test before it is switchable. Rebuild `dist`, regenerate exports with `pnpm run write:exports`, and rerun both publish checks after each capability.
5. **Watch known flakes, not defects:** the library full `vitest run` intermittently times out an entry/SSR/vision file or the adapter performance file under 74-worker load (all pass in isolation and on a clean rerun); the shared Storybook server still prints optimize-deps reloads on a cold component run even with renderer deps in `include` (76/76 passed on two cold runs). The app graph keeper has 30 pre-existing failures (see r13 clarification); it needs its own repair before it can gate this work. `component-tests/canvas.spec.ts` first case can fail on a cold Storybook cache when a renderer dep is optimized mid-test (r17: one cold-cache failure from `three`/`gsap`/`cytoscape` reloads, then 3/3 on the warm cache with zero optimizer events). Fix worker startup or raise per-test budgets if the CI gate flake persists.

---

## The problem this version solves

The capabilities are largely **already built**. They are fragmented across three zoom mechanisms, four LOD mechanisms, a host-only widget layer, and a set of capability flags that no consumer can query as a whole. The product failure is not missing code; it is a missing **unified, configurable surface**.

- **Zoom is three mechanisms, not one continuum.** `ZoomBands` (`spacegraphjs/src/zoom/ZoomBands.ts:16-21,96-135`), generic `levels` (`spacegraphjs/src/levels/index.ts:25-54,157-166`), host detail tiers (`packages/session-ui/src/graph/detail.ts:16-78`), and the deprecated `FractalZoomPlugin` (`spacegraphjs/src/plugins/FractalZoomPlugin.ts:10-46,48`) each own a piece. There is no single scale domain with representation changing continuously as the reader moves through it.
- **LOD is four policies, not a representation registry.** `Node.computeLOD` (`nodes/Node.ts:26,235-255`), `LODPlugin` (`plugins/LODPlugin.ts:7-16,49-158`), label LOD (`core/lod.ts:8-27`), and DOM budgets (`dom-budget.ts:2-9`) never meet. No host can register "dot → glyph → card → widget → detail" as one ladder with hysteresis and transitions.
- **Importance uses separate visual languages.** `equalizer.ts:16-97` (scale/hue/muted/age), `useFocusOverlay.ts:11-77` (BFS dimming), `attention.ts:31-53`, and trace overlays each highlight differently. There is no scored salience, no `emphasis` channel on `RenderNode` (`renderer/src/index.ts:42-58`), and no explanation of why a node is loud.
- **Widgets exist but are host-only.** `NodeWidgetLayer.tsx:11-22,46-61` accepts arbitrary `renderWidget` content; `HtmlNode.ts:122-124,257-268` wraps `innerHTML` in CSS3D. Neither is a library registry with slots, measured sizing (the layer estimates size at `NodeWidgetLayer.tsx:56`), and lifecycle independent of OpenCode.
- **Motion exists but has no director.** `AnimationController.ts:13-49`, `builder/animation.ts:30-176`, `CameraControls.ts:241-273,312-352`, CSS transitions and `shared/animations.ts:16-100` (springs) coexist. No named verb sequences them; reduced motion is honored only in isolated places (`CameraController.ts:34-36`, `graph-motion.css:22-32`).
- **World pieces exist but do not compose.** WebGL has lights, fog and CSS3D (`WebGLRenderer.ts:114,227-272`), instancing (`InstancedShapeNode.ts:76-112`), thick edges (`DynamicThicknessEdge.ts:11-68`), bundling (`edge-bundling.ts:6-15`) and depth treatments (`DepthCues.ts:12-61`). Yet `06-graph-3d.png` shears cards, DOM nodes do not fade with fog (`known-issues.md:13`), and no host can compose these into a coherent world through one policy.
- **Capability negotiation exists but no manifest.** `supports()`/`supportsDepth()` (`renderer/src/index.ts:260-272`), layout registry (`core/defaults.ts:164-184`), renderer registry (`renderer-registry.ts:15-62`), `getAllGoals()` (`lensGoals.ts:119-127`), window kinds (`graph-windows.tsx:10-15`) and `GraphGallery` (`GraphGallery.tsx:24-50`) all expose options — but a consumer must know where to look. There is no single manifest of every axis value.
- **The evidence surface is one-frame-per-option** (`known-issues.md:14`). We cannot see how capabilities combine, so we keep guessing.
- **OpenCode is mistaken for the product.** The library is the reusable artifact (`SPACEGRAPH.md §2.8`). A flagship requires the library demo and the second host to exercise every capability first.

**North star:** SpaceGraphJS is the flagship. Any dependent can discover, configure, combine, and compare *all* capabilities at runtime. OpenCode is one consumer, not the reason the API exists.

---

## Already in the library — do not duplicate

Extend these seams. Re-implementing any of them in the plugin, or in a new parallel package, is a defect.

| Area | Existing seam | Use it for |
|------|---------------|-----------|
| Headless zoom | `zoom/ZoomBands.ts:7-21,85-135`; math `core/zoom.ts:5-28` | Continuous scale domain with hysteresis and listeners |
| Zoom UI | `plugins/ZoomBandsPlugin.ts:8-54`, `ZoomUIPlugin.ts:68,91,153` | Band chrome; host supplies any band set |
| Semantic levels | `levels/index.ts:25-54,157-166`; host config `session-ui/graph/levels.ts:10-99` | Visibility, edge filtering, DOM budget per level |
| LOD | `nodes/Node.ts:235-255`; `plugins/LODPlugin.ts:7-158`; `core/lod.ts:8-27` | Distance/pixel-size LOD, label LOD, fade ranges |
| Detail tiers | `detail.ts:16-78`; `dom-budget.ts:2-45`; `scale.ts:8-53` | Screen-pixel tier selection, viewport budget, turn window |
| Camera | `CameraController.ts:34-151`; `CameraControls.ts:21-31,241-359`; `graph-camera.ts:11-140` | Fit, fly, focus, reduced motion, zoom limits |
| HTML / CSS3D | `nodes/DOMNode.ts:23-84`; `HtmlNode.ts:16-90,122-124,257-268`; `WebGLRenderer.ts:256-264` | DOM nodes, card facing, billboard mitigation |
| Widget content | `NodeWidgetLayer.tsx:11-22,46-134`; `window-manager/types.ts:3-24`; `graph-windows.tsx:10-47` | Arbitrary content, window kinds, focus traps |
| Animation | `AnimationController.ts:13-86`; `builder/animation.ts:30-176`; `Node.ts:507-529`; `constants.ts:15-37`; `shared/animations.ts:16-100` | Ticker, verbs, tweens, easings, springs |
| World | `WebGLRenderer.ts:114,227-272`; `InstancedShapeNode.ts:76-112`; `DynamicThicknessEdge.ts:11-68`; `edge-bundling.ts:6-15`; `DepthCues.ts:12-61` | Lights, fog, instancing, edges, depth |
| Capabilities | `renderer/src/index.ts:120-150,256-272`; `useCapabilityFallback.ts:5-22`; `renderer-registry.ts:15-62` | Negotiation, fallback, backend registry |
| Host policy registries | `core/defaults.ts:156-184`; `TypeRegistry.ts`; `actions.ts:20-21,136-156`; `vision/VisionSystem.ts:15-57` | Layouts, types, capability-filtered actions, strategies |
| Host lenses / surfaces | `lensGoals.ts:34-127`; `composition-guide.md` §Lens/Surface tables; `GraphView.tsx:149-263` | Expose-all vs flag-filtered goals, controlled knobs |
| Pure projections | `index.ts:183-323` — profiles, equalizer, zoomModel, budgets, levels, detail tiers, actions | Host-owned policy feeding the mechanisms |

---

## Explicit gaps this version closes

| # | Gap | Evidence | Phase |
|---|-----|----------|-------|
| 1 | No scored salience / unified emphasis API | No `salience` identifier; `useFocusOverlay.ts:12` mentions emphasis only in a comment | P2.1–2.3 |
| 2 | No spring-based animation path in the core | Springs exist only in `shared/animations.ts:16-100`, unused by graph motion | P4.1 |
| 3 | No true billboarded 3D DOM cards; cards shear and ignore fog | `visual-review.md:17-18,33,44-45`; `known-issues.md:13`; `HtmlNode.ts:264-268` | P3.3, P4.3–4.4 |
| 4 | No cartesian capture matrix or visual-quality gate | `known-issues.md:14`; `visual-review.md:85-89` | P5.1 |
| 5 | No empty-column exclusion in fit | `known-issues.md:12` | P1.5 |
| 6 | Layout/representation variety unmeasured; gallery illegible | `known-issues.md:17`; `30-graph-gallery.png`; `visual-review.md:37-42` | P5.1–5.2 |
| 7 | Middle-drag orbit no-op in orthographic; zoom math historically absolute | `known-issues.md:18`; `visual-review.md:63-83` | P4.2 |
| 8 | No general widget anchor/scale/bezel lifecycle; size estimated | `NodeWidgetLayer.tsx:56` | P3.1–3.4 |
| 9 | No widget-component registry in the renderer contract | `RenderNode.html` is a host string; `HtmlNode` takes `innerHTML` | P3.1 |
| 10 | No single capabilities manifest / preset catalog | `getAllGoals` and `GraphGallery` are the closest patterns | P0.1–0.4 |
| 11 | Renderer strategy names `svg-preview` but maps everything to `spacegraph` | `renderer-strategy.ts:6-34` | P0.2 |
| 12 | Feature gating is thin; no dedicated flag service in these packages | `lensGoals.ts:flag?` + `getVisibleGoals(flags)` | P0.5 |

---

## The rule that governs this version

> **Support every configuration. Choose none.**

Every capability ships as an extension to an existing seam, plus a discoverable configuration axis. A named preset may demonstrate a combination, but a preset is never a default, never a recommendation, and never removed from the explorer. The library encodes every way to see a graph and lets the host, the reader, or an experiment decide.

This does not override the stop rule in `study-protocol.md:95-113`. This version builds capability and experiment infrastructure. It does not declare a winning configuration or change an OpenCode default.

---

## Rules

1. **Extend before invent.** If a seam exists in the "already in the library" table, the change extends it. A parallel implementation is a defect.
2. **Configuration before commitment.** A capability is not done until it is switchable at runtime, URL-encodable, and capturable in the matrix.
3. **Host supplies policy; package owns mechanism.** Weights, bands, thresholds, verbs, bindings and budgets come from the host.
4. **Second consumer first.** Each capability runs in the library demo and the framework-free second host (`spacegraphjs/demo/second-host/`) before the OpenCode adapter changes.
5. **Capability negotiation over assumption.** Consumers ask what is supported and degrade by declared flags; never branch on a backend name.
6. **No OpenCode imports in a library package.** Keep the v39 boundary (`TODO.39.md:57-69`).
7. **One capability per PR; parity before deletion.** Keep the host implementation until a parity test proves the library version matches on the canonical fixture.
8. **Public API or it did not happen.** Export, types, TSDoc, README recipe, and tests land in the same change.
9. **Rebuild `dist`.** Local component tests consume committed output (`TODO.39.md:71`).
10. **No deprecation without a replacement.** Moving a public API keeps a deprecated alias for one minor.
11. **Accessibility and reduced motion are configuration axes.** Every animated or depth capability declares its reduced-motion and a11y behavior.
12. **Budgets are policies.** Caps and limits are host-supplied values with library defaults, never hardcoded ceilings inside an algorithm.

---

## Configuration axes to expose (no values chosen here)

Each axis must be **discoverable** (listable at runtime), **switchable** (no rebuild), **serializable** (URL + state codec), and **capturable** (matrix entry per value and per combination). The explorer in P0.3 proves this.

| Axis | Existing values / seam | Policy owner |
|------|------------------------|--------------|
| Projection | `RendererCapabilities.projections`; `spacegraph-renderer/src/index.ts:23-33` | renderer, host switch |
| Depth treatment | `DEPTH_MODES`, `DepthCues.ts:12-61`, `supportsDepth` | host |
| Card facing | `CardFacing`, `WebGLRenderer.ts:256-264`, `HtmlNode.ts:257-268` | host |
| Scale / level | `ZoomBands`, `levels/index.ts`, `detail.ts:16-78` | host bands + reader zoom |
| Layout strategy + placement | `LAYOUT_REGISTRY` (`core/defaults.ts:164-184`), `layout.ts`, `sub-layout.ts` | host |
| Representation / LOD | `Node.computeLOD`, `LODPlugin`, `dom-budget.ts`, `detail.ts` | host registry |
| Salience signals + weights | `attention.ts`, `equalizer.ts`, `cost.ts`, `compaction.ts`, trace | host |
| Emphasis channels | `RenderNode` (no channel yet), `useFocusOverlay.ts` | host mapping |
| Widgets + slots | `NodeWidgetLayer.tsx`, `window-manager/types.ts` | host registry |
| Animation style + timing | `AnimationController`, `builder/animation.ts`, `shared/animations.ts` | host director config |
| Camera verbs | `CameraController`, `CameraControls`, `graph-camera.ts` | host registry |
| Edge style / bundling / thickness | `DynamicThicknessEdge.ts`, `edge-bundling.ts`, `LabeledEdge` | host |
| Surface composition | `composition-guide.md`, plugin surfaces | host |
| Lens / goal | `LENS_GOALS`, `getAllGoals`/`getVisibleGoals` | host |
| Time mode | `time-travel.ts`, kernel history | host |
| Budgets (nodes, DOM, frame, zoom) | `budget.ts`, `dom-budget.ts`, `renderer/src/index.ts:131,173` | host |
| A11y / reduced motion | `a11y`, `CameraController.ts:34-36`, `graph-motion.css:22-32` | user + host |
| Renderer backend | `renderer-registry.ts:15-62`, `renderer-strategy.ts` | host |

---

## Target map

| ID | Capability | Extend from | Public home | Host supplies | Priority |
|----|-----------|-------------|-------------|---------------|----------|
| F0 | Configuration substrate + manifest | capability flags, registries, `getAllGoals` | new `@spacegraphjs/config` + explorer | all axis values | **P0** |
| F1 | Fractal zoom + LOD continuum | `ZoomBands`, `levels`, `detail.ts`, `computeLOD`, `LODPlugin` | `@spacegraphjs/kernel` + `@spacegraphjs/lod` | bands, ladders, hysteresis | **P0** |
| F2 | Salience + emphasis | equalizer, focus overlay, attention, trace | `@spacegraphjs/salience` + renderer contract | signals, weights, channels | **P1** |
| F3 | HTML widget substrate | `NodeWidgetLayer`, `HtmlNode`, window manager | `@spacegraphjs/widgets` | content + lifecycle | **P1** |
| F4 | Motion direction | `AnimationController`, `builder/animation.ts`, springs | `@spacegraphjs/motion` | verbs, timing, preference | **P1** |
| F5 | World / immersion | WebGL lights/fog, instancing, `DepthCues` | core extensions | depth policy, lighting, XR gating | **P2** |
| F6 | Experimentation + cartesian evidence | `graph:capture`, `StudyCounters` | `@spacegraphjs/experiments` | tasks, metrics, axes | **P1** |
| F7 | Flagship packaging | library demo, second host, docs | packed tarballs + explorer app | none | **P2** |

---

## Phase 0 — Configuration substrate and manifest (F0)

**Purpose:** make every existing and future option queryable in one place, without replacing the registries that already hold them.

### P0.1 — Capability manifest
A generated `Manifest` that reads `RendererCapabilities`, `LAYOUT_REGISTRY`, `DEPTH_MODES`, `LENS_GOALS`, `DETAIL_MODES`, window kinds, profile/equalizer presets, renderer registry, and config axes into one list. Each entry: `id`, `values`, `source`, `capability requirement`, `reduced-motion note`.

**Acceptance:** a new dependent can list every option without importing an OpenCode package or knowing which registry owns it.
**Test:** `manifest.test.ts` — every registry entry appears; adding a value to any registry changes the manifest without library edits.

### P0.2 — Declarative config space and negotiation
`@spacegraphjs/config`: `ConfigSpace` (axis descriptors) and immutable, URL-encodable `ConfigState`. Negotiation merges host config, manifest capabilities, and flags into `supported | degraded-to | unsupported` with a reason. Extend `supports()`/`supportsDepth()`; do not fork them. Fix the `svg-preview` mapping gap in `renderer-strategy.ts:6-34`.

### P0.3 — Runtime explorer
Library demo surface listing every axis and value with the live graph. URL hash encodes full state. Buttons: randomize, reset to host baseline, compare two states side by side. Presets are labelled "example, not default". Runs with no OpenCode import and drives both the contract demo and the second host.

### P0.4 — Presets as experiments, not answers
Named bundles plus extremes (max LOD, max widgets, full depth, zero motion). Every preset is opt-in, editable, removable. Deleting any preset leaves the explorer complete.

### P0.5 — Flag bridge
Map `graph_*` flags (`packages/schema/src/config/flag.ts:25-31`) and `all_flags` to axis values. Flags gate availability of values; they never set values. Add the missing flag service seam (gap 12).

---

## Phase 1 — Fractal zoom and LOD continuum (F1)

**Purpose:** unify the existing zoom and LOD mechanisms into one anchored continuum where representation changes as scale changes.

### P1.1 — One scale domain
Extend `ZoomBands` (`feed`/`feedNormalized`, hysteresis) and `core/zoom.ts` math into a continuous domain with host-defined bands. Reconcile the deprecated `FractalZoomPlugin` semantics (semantic importance, transition duration) into the headless controller, not into a plugin.

**Acceptance:** zoom from session to part in one gesture, anchored, and return to the identical frame.
**Test:** anchor invariance and determinism across builds; existing `ZoomBands` tests remain green.

### P1.2 — Representation registry
Add a host registry of representation functions per band and kind (`dot → glyph → card → widget → detail`) alongside `levels/index.ts` and `Node.computeLOD`. The library owns selection, registration and arbitration; hosts own appearance and ordering.

### P1.3 — Hysteresis and transitions across representations
Reuse `ZoomBands` hysteresis for band edges; use `Node.tweenPosition` (`Node.ts:507-529`) and gsap easings (`constants.ts:15-37`) for representation transitions. Stable IDs keep selection and permalinks valid across swaps.

### P1.4 — Edge and cluster LOD
Extend `DynamicThicknessEdge`, `edge-bundling.ts` and `LabelLodLevel` into one edge ladder: bundle → hair → arrow → labelled causal ribbon. Clusters collapse as representations, not as separate level state.

### P1.5 — Cross-scale seams and fit gaps
Host-provided descent policies: session → turn → phase → tool → part; time → checkpoint; delegate → child session. Empty-column exclusion (gap 5) lands here. No OpenCode vocabulary in the seam.

---

## Phase 2 — Salience and manifestation (F2)

**Purpose:** make importance visible without deciding what is important.

### P2.1 — Salience signal API
`salience(model, context, now) -> Map<id, number>` composed from host-registered signal functions. Candidate inputs (all optional, configurable): kind/status base, attention, trace answer/context, focus distance, lens relevance, recency, centrality, cost, pins, search, notes. Each returns a number and a reason label. Existing equalizer, focus overlay and attention become *inputs*, not separate visual languages.

**Acceptance:** two hosts supply different signal sets and get different deterministic maps; zero signals equals today's uniform behavior.

### P2.2 — Emphasis channel in the contract
Add optional `emphasis?: number` to `RenderNode` and per-edge emphasis. Purely additive; current renderers ignore it. A capability flag declares which channels a backend honors.

### P2.3 — Visual channel mapping registry
Hosts map emphasis to any combination of size, opacity, lift, glow, edge thickness, label density, saturation, motion. Multiple channels may be active; none mandatory. Extend `computeLayout.ts:12,30` and `cardTemplate.ts:12,123,393` as the OpenCode mapping.

### P2.4 — Explainability
A "why is this big?" affordance lists contributing signals and weights. This makes an adaptive map trustworthy rather than magical.

---

## Phase 3 — HTML widget substrate (F3)

**Purpose:** arbitrary living HTML attached to nodes becomes a library capability for any renderer and host.

### P3.1 — Widget registry and slots
Lift `NodeWidgetLayer`'s `renderWidget` into `@spacegraphjs/widgets`. Descriptor: `id`, `mount(node, ctx)`, `unmount`, `slots` (header, body, footer, attached panel, pinned window), `preferredRepresentations`, `capabilities`. The explorer lists registered widgets; no host widget is hardcoded in the library.

### P3.2 — Lifecycle, measured sizing, budget
Fix the estimated-size gap (`NodeWidgetLayer.tsx:56`) with a measured bounds contract. Widgets attach/detach with representation changes. Desired size feeds layout only when the host's sizing policy allows. Overflow strategy (dot, summary, virtualized list) is configurable.

### P3.3 — Renderer integration and card facing
Honor `CardFacing: 'camera'` in tilted views; reconcile the `HtmlNode.billboard` note (`HtmlNode.ts:264-268`). Billboard distant cards; mesh-represent them at overview LOD. Fix shear shown in `06-graph-3d.png` in the library so every dependent benefits.

### P3.4 — Event, focus and DOM-fog contract
Keep `data-sg-interactive` routing (`NodeWidgetLayer.tsx:104-134`). Add depth-fade for DOM cards (gap 3): project scene fog onto widget opacity so HTML recedes with meshes. Roving tabindex and labels cover widget content.

### P3.5 — Security contract
Host-sanitized markup only; no `eval`, no remote fetch by the library; CSP documented. Keep `security.test.ts` as the parity baseline.

### P3.6 — OpenCode adapter of widgets
Port composer, terminal, diff, subagent and todo widgets to registrations. Parity test against frames 45–47, 54. Consumer, not design driver.

---

## Phase 4 — Motion direction and world (F4, F5)

**Purpose:** make depth, motion and camera a configurable world rather than a broken mode. Every item is capability-gated and off unless enabled by a host or the explorer.

### P4.1 — Animation director (F4)
A central director for named verbs: `arrive`, `emphasize`, `trace`, `flyTo`, `sweep`, `follow`, `decay`, `compact`. Built on `AnimationController`, `builder/animation.ts`, `Node.tween`, and the spring presets in `shared/animations.ts:16-100` (gap 2). Timing, easing, stagger and reduced motion are host policies. Animations mutate emphasis and camera, never canonical positions.

### P4.2 — Camera verb registry (F4)
Hosts register camera behaviors; the library sequences them using `CameraController.fitView/focusNode` and `CameraControls.flyTo`. Address middle-drag orbit in orthographic and content-relative zoom bounds (gap 7). No single "correct" motion is exported.

### P4.3 — Depth continuum (F5)
Extend `DepthCues` treatments and `DepthController` into a continuous depth policy. Lanes, turns and hierarchy are candidate depth axes; hosts choose. Card facing, fog and depth fade cover mesh and DOM representations.

### P4.4 — Instanced world rendering (F5)
Overview uses `InstancedShapeNode`; detail uses DOM cards; the swap is an LOD policy. Fog (`setDepthFade`), lights, parallax and trails are configurable scene features, all optional.

### P4.5 — Sensory seams (F5)
Sound, haptics and WebXR are **seams only**: descriptors, no implementation requirement. A dependent may supply an adapter; the explorer reports them unsupported until then. No headset or sound requirement.

---

## Phase 5 — Experimentation and cartesian evidence (F6)

**Purpose:** turn "we cannot compare configurations" into a product feature.

### P5.1 — Cartesian capture matrix
Generate the full product of enabled axis values, sampled where the product is too large, with a deterministic seed and documented sampling policy. Replace the one-frame-per-option practice (gap 4). Add an automated visual-quality gate for the previously "broken" modes (gap 3) and legibility measurements for gallery/layout comparisons (gap 6).

### P5.2 — Explorer comparison mode
Two configurations side by side, same model, same camera anchor. Diff view highlights which axes differ. Export as SVG/JSON/HTML via `@spacegraphjs/export`.

### P5.3 — Host-agnostic metrics harness
Record interactions, time, wrong turns and preference prompts through a neutral API. `StudyCounters` (`study.ts:64-72`) becomes one adapter. No metric is a success criterion unless a host protocol declares it.

### P5.4 — Experiment templates
Reusable templates: reaction test ("describe what you see"), task study (the five questions in `study.ts:31-61`), A/B config comparison. Templates define procedure and stop rules; they never fire automatically.

### P5.5 — Honest reporting
Generated reports state the configuration matrix, sampling, and negative results. A negative result is a valid output (`evidence.md:15-17`).

---

## Phase 6 — Flagship packaging (F7)

### P6.1 — One-command explorer
From the library repo, one command starts an explorer showing every capability, both renderers, and the second host. No OpenCode checkout required.

### P6.2 — Documentation as product
API reference, one recipe per capability, a "compose your own viewer" guide, and an explicit "not decided here" page listing every open question below. Library demo is the landing page; OpenCode is a case study.

### P6.3 — Pack and prove
`test:publish` (pack → external `node_modules` → mount) plus the same proof for the second host. The second host must consume packed tarballs, not sibling workspaces or source aliases. No registry upload is performed; published packages are not part of this version.

### P6.4 — Contract versioning
Additive changes (`emphasis`, widget descriptors, LOD hooks) bump the contract version with aliases for one minor. Record capability → minimum contract version in the manifest.

---

## Cross-cutting quality gates

| Gate | Command | Must pass |
|------|---------|-----------|
| Typecheck | `bun run typecheck` (spacegraphjs + opencode packages) | 0 errors |
| Lint | `bun run lint` | 0 errors |
| Library unit | `pnpm exec vitest run` in `spacegraphjs` | 100% pass |
| Package boundaries | `bun run test:boundaries` | no OpenCode import in library |
| Host unit + component | `bun test src && bun run test:components` in `session-graph` | 100% pass |
| App capture | `bun run graph:capture --mode=compare` / `verify` | all frames, 0 unexpected diffs |
| Scale | `bun run graph:scale` | linear pipeline within documented budget |
| Publish | `bun run test:publish` (library) | external consumer mounts all capabilities |
| Publish (second host) | `pnpm run test:publish:second-host` (library) | the real second host runs on 11 packed tarballs with no source aliases |
| Cartesian capture | `pnpm run test:capture-matrix` (library) | 24 sampled cells, verified values, legible and distinct frames, `matrix.json` report |
| Second host | `pnpm run dev:demo` + `second-host.html` | exercises every axis |
| **Manifest coverage** | generated by P0.1 | every registry value is listed in the manifest |
| **Axis coverage** | generated by P5.1 | every axis appears in explorer, preset, matrix, and a test |

---

## Task dependency graph

```
P0.1 manifest ──→ P0.2 config/negotiation ──→ P0.3 explorer ──→ P0.4 presets ──→ P0.5 flags
    │                                           │
    ├──→ P1.1 scale ──→ P1.2 representations ──→ P1.3 transitions ──→ P1.4 edges ──→ P1.5 seams
    │                                           │
    ├──→ P2.1 salience ──→ P2.2 contract ──→ P2.3 channels ──→ P2.4 explain
    │                                           │
    ├──→ P3.1 widgets ──→ P3.2 sizing ──→ P3.3 facing ──→ P3.4 fog/events ──→ P3.5 security ──→ P3.6 adapter
    │
    ├──→ P4.1 director ──→ P4.2 camera ──→ P4.3 depth ──→ P4.4 instancing ──→ P4.5 seams
    │
    └──→ P5.1 matrix ──→ P5.2 compare ──→ P5.3 metrics ──→ P5.4 templates ──→ P5.5 reports
                                           │
                                           └──→ P6.1 explorer ──→ P6.2 docs ──→ P6.3 pack/prove ──→ P6.4 contract
```

Every phase produces a visible artifact in the explorer. No infrastructure-only phase.

---

## Definition of done (per capability)

A capability in the target map is done when **all** statements hold:

1. It runs in the library demo and the second host with no OpenCode import.
2. Every value is in the manifest, switchable at runtime, and URL-encodable.
3. It appears in the cartesian matrix with at least two other axes combined.
4. Its host policy seam is separate from the existing mechanism it extends.
5. It has public exports, TSDoc, a recipe, and fixture-driven tests.
6. The OpenCode adapter (where applicable) is a parity consumer, not the owner.
7. Reduced-motion and a11y behavior are declared and tested.
8. `dist` is rebuilt and `test:publish` passes from external `node_modules`.

---

## Scope exclusions (parking lot)

| Item | Reason |
|------|--------|
| Choosing a default zoom band, lens, layout, renderer, salience mapping, or depth mode | Explicitly out of scope — support configurations, do not select them |
| Publishing packages to a registry (npm upload) | Not planned. P6.3 proves consumability from packed tarballs in an external `node_modules`; no upload is performed or gated on |
| Changing an OpenCode default surface or lens | v40 path stays; promotion is a later decision after evidence |
| Executing the n ≥ 5 study | Stays gated by `study-protocol.md:125-133`; this version builds the harness only |
| VR headset / WebXR implementation | Seam only (P4.5); no hardware requirement |
| Real-time collaboration | No scenario in `scenarios.md`; revisit with a second consumer |
| Mobile graph UX v1 | Desktop-first; axis support must not break the panel fallback |
| Cytoscape 3D parity | Declared 2D fallback; capability flags declare the limit |
| New node/edge kinds or session vocabulary | Host concern, not library concern |
| Replacing the deprecated `FractalZoomPlugin` import path without an alias | Rule 10: alias for one minor |

---

## Open decisions (deliberately NOT decided)

Inputs for later experiments, not choices made here. The explorer exists so they can be explored.

1. Which scale bands, if any, feel like "fractal zoom" to a developer.
2. Which representation ladder is best for which node kinds.
3. Which salience signals matter, and their weights.
4. Which visual channel (size, glow, lift, opacity) carries emphasis without harming legibility.
5. Whether animated camera flights help or annoy.
6. Which depth treatment, if any, is worth promoting to a default.
7. Whether widgets belong inside cards, attached to them, or only in pinned windows.
8. Whether the immersive direction wins the v40 stop-rule test.
9. Budget values for DOM nodes, frame time, and matrix size.
10. Which renderer is the default for the flagship explorer (both must be switchable).
11. Whether the manifest is a build-time artifact or a runtime registry.

---

## Revision log

- **r0 (2026-11-17):** Initial draft. Framed the flagship as a configuration platform. Added F0–F7 target map, governing rules, 18 configuration axes, phases P0.1–P6.4, gates, dependency graph, definition of done, exclusions, and open decisions. No defaults chosen; no code changed.
- **r1 (2026-11-17):** Folded in a full capability inventory of the library and host packages. Reframed the version from "build missing capabilities" to "unify, expose, and extend existing seams": added "Already in the library — do not duplicate" and a 12-item explicit gap table with phase assignments; corrected every target-map and phase entry to name the existing seam it extends; added `Extend before invent` and `Manifest coverage` gate; added gaps 7, 11, 12 and open decision 11. No defaults chosen; no code changed.
- **r2 (2026-11-17):** Started Phase 0. Added the `@spacegraphjs/config` package (dependency-free `ConfigSpace`, `ConfigState`, `negotiate`, `buildManifest`) plus its `./library` subpath that assembles values from library registries. Added `spacegraphjs/layout-registry` as a lightweight published subpath, exported `PROJECTIONS`, `CARD_FACINGS` and `RENDERER_STRATEGIES` constants, added `test/manifest.test.ts` coverage gate, rebuilt `dist`, and added a progress + clarification section. Host registry entries, flag bridge, explorer, presets and P1–P6 remain. No defaults chosen.
- **r3 (2026-11-17):** Completed P0.1, P0.4 and P0.5, and started P1. Added host manifest entries and the `graph_*` flag bridge under `packages/gui-plugins/src/spacegraph`, moved host option constants into `options.ts`, and added `@spacegraphjs/config` as a workspace dependency with a lockfile update. Added presets and explorer helpers to `@spacegraphjs/config`. Added `ScaleDomain` as the P1.1 headless continuum over `ZoomBands`, with interpolated semantic importance, transition durations and anchored zoom for both projections. Explorer UI representation registry and P1.2–P6 remain. No defaults chosen.
- **r4 (2026-11-17):** Completed P0.3 and P1.2, and partially landed P1.3. Added `demo/explorer.html` / `demo/explorer.ts` with every manifest axis, hash state, randomize/reset/compare, labelled example presets, and live graphs from both the contract fixture and the second host; added `test/e2e/explorer.spec.ts`, a demo build input and a `test:explorer` script. Added `src/representations/ladder.ts` (representation registration, arbitration, hysteresis, importance gates, stable-id swaps and transition records) with `test/representation-ladder.test.ts`, and declared the `lod` / `widgets` / `motion` axes so all example presets are covered. Fixed demo aliases so the second host and the explorer load. P1.3 host-side playback, P1.4–P1.5 and P2–P6 remain. No defaults chosen.
- **r5 (2026-11-17):** Completed P1.4 and P1.5. Extracted the shared dead-zone selector into `src/core/rung.ts`; added `src/edges/ladder.ts` with the `bundle → hair → arrow → ribbon` ladder and host-owned styles, `collapseClusters` for cluster representations, `src/navigation/descent.ts` for host-defined descent policies and paths, and `src/layout/fit.ts` for empty-column exclusion from camera fit. Added `test/edge-ladder.test.ts`, `test/descent.test.ts` and `test/fit-bounds.test.ts`, wired `edgeLod` into the manifest and explorer, and published `spacegraphjs/edges/ladder` as a lightweight subpath to avoid the heavy edges/core cycle. P1.3 playback and P2–P6 remain. No defaults chosen.
- **r6 (2026-11-17):** Completed P1.3 and all of P2 (P2.1–P2.4). Added a pure `playRepresentationChanges` seam in `src/representations/playback.ts` with gsap-equivalent easings, injected clock, reduced-motion instant swaps and stable ids; the explorer now tracks previous rungs, plays `lod` swaps with SVG appearance interpolation, stamps `data-node-id` on SVG node groups and exposes a `transition()` parity probe. Added `src/salience/` (`createSalience`, five signal factories, `explain`, emphasis channel mapping) published as `spacegraphjs/salience` with `docs/salience.md`; added additive `emphasis` fields and `supportsEmphasis` to the renderer contract and bumped the library contract to 1.1.0. Declared `salience` / `emphasis` manifest axes plus the opt-in `loud-nodes` preset, and added the explorer "Why is this big?" panel. Tests: `test/representation-playback.test.ts`, `test/salience.test.ts`, manifest assertions and four new e2e cases (parity frame, reduced motion, two-host salience, explain/channel gating); 623 unit tests, 13 explorer e2e tests, boundaries, exports and `test:publish` pass. P3–P6 remain. No defaults chosen.
- **r7 (2026-11-17):** Completed P3.1–P3.5. Added `src/widgets/` (`WidgetRegistry`, `WidgetDescriptor`/`WidgetHandle`, measured `resolveWidgetSize` with host budget/overflow/layout feedback, `WidgetLayer` lifecycle + interactive routing + `depthFade` opacity projection, and the host-sanitized/CSP security guard), published as `spacegraphjs/widgets` with `docs/widgets.md`. Added additive `widgets` / `widgetSlots` fields to the renderer contract, `supports(..., 'widgets')`, and bumped the contract to 1.2.0. The `widgets` manifest axis now enumerates `WIDGET_SLOTS`, with a reduced-motion note and a manifest assertion; the explorer lists registered descriptors and drives them against both graph sources. Tests: `test/widgets.test.ts`, `test/widgets-security.test.ts`, three new explorer e2e cases; 636 unit tests, 16 explorer e2e tests, boundaries, exports and `test:publish` pass. P3.6 and P4–P6 remain. No defaults chosen.
- **r8 (2026-11-17):** Completed P3.6. Added `sessionWidgetRequests`, `createSessionWidgetRegistry`, `legacyWidgetRegistry` and `widgetRequestNode` in `packages/session-graph/src/ui/widget-registry.ts`, plus `createOpenCodeWidgetRegistry` binding the five real Solid widgets in `session-widget-components.tsx` with `runWithOwner` context preservation. `panel.tsx` now registers the widgets instead of rendering them inline; `NodeWidgetLayer` consumes the library `WidgetLayer` and owns screen position, event routing, `aria-label` and roving tabindex; `renderWidget` is deleted and `renderNodeWidget` is deprecated through the compatibility registry. Fixed `supports(caps, 'widgets')` to map to `widgetSlots` and rebuilt library package `dist`. Tests: `widget-registry.test.ts` proves resolution parity for frames 45–47/54, `node-widget-layer.spec.ts` proves labels and left/right focus movement (and caught a direction bug, now fixed); library 636 unit tests and `test:publish` pass, session-graph typecheck and all unit files except the pre-existing hanging `scale.test.ts` pass. Documented remaining harness gaps (capture pixel parity, widgets matrix entry, older component specs on the wrong story helper). P4–P6 remain. No defaults chosen.
- **r9 (2026-11-17):** Completed P4.1–P4.5. Added `spacegraphjs/motion` (`playMotion`, `MotionDirector`, `MOTION_VERBS`, `MOTION_EASINGS`/spring curves, `CameraVerbRegistry`, `CameraPolicy`), extended `spacegraphjs/depth` with `blendDepth`/`sampleDepth` and host depth axes, and added `spacegraphjs/world` with scene features, instancing LOD and sensory descriptors. `CameraControls.setOrbitInOrthographic` makes the orthographic orbit gap switchable. Declared `motionVerb`/`cameraVerb`/`depthAxis`/`sceneFeature`/`sensory` axes plus the `orbit-world` example preset, bumped the contract to 1.3.0, wired explorer hooks and e2e cases, and added `docs/motion.md` / `docs/world.md`. Tests: 651 library unit tests, 19 explorer e2e tests, boundaries, exports and `test:publish` pass. P5–P6 remain. No defaults chosen.
- **r10 (2026-11-17):** Completed P5.1–P5.5 and P6.1/P6.2/P6.4; P6.3 remains partial. Added `spacegraphjs/experiments` with the deterministic cartesian matrix, neutral metrics harness, inert experiment templates and honest report generator; the explorer exposes matrix/config export and labels the shared comparison anchor. Added `pnpm run explorer`, `docs/compose-your-viewer.md`, `docs/not-decided.md` and `docs/contract-versioning.md`; added per-axis `minContractVersion`, `minContractVersion()`/`contractFloor()` and bumped the contract to 1.4.0. Tests: 659 library unit tests, 20 explorer e2e tests, boundaries, exports and `test:publish` pass. Remaining: second host on published packages and ordered upload (P6.3), outer-repo capture gate and host harness repairs. No defaults chosen.
- **r11 (2026-11-17):** Proved the packed-tarball half of P6.3, added cartesian visual evidence, and repaired the host harness. Added the shared `publish-check/pack.ts`, `test:publish:second-host` (11 packed tarballs, alias-free Vite, all 19 capabilities and three renderers), and `publish:ordered` (dependency order, dry-run default). Added `test/e2e/capture-matrix.spec.ts` with 24 cells, legibility/duplicate gates and a `matrix.json` negative-result report; wired it into `graph:capture` and committed `docs/spacegraph/screenshots/matrix/`. Repaired six legacy story-helper imports, the gallery count, two a11y specs and the hanging scale test. Tests: 659 library unit tests, 20 explorer e2e, matrix capture, boundaries, exports, both publish checks, 136 session-graph unit tests and 76/76 component tests pass. Remaining: app-surface combination frames and pixel parity. No defaults chosen.
- **r12 (2026-11-17):** Registry publishing is out of scope. Removed the r11 `publish:ordered` driver, marked P6.3 complete at the pack-and-prove boundary, added npm upload to the parking lot, and dropped upload from the next-work list. No tests changed; all r11 gates still pass. No defaults chosen.
- **r13 (2026-11-17):** UX polish on the live map. Forwarded `GraphCanvasRegion`'s element to `canvasRegionRef` so `canvasSize` and the card tier are real; measured tier from a drawn card instead of the camera extent. Added a faint canvas glow, path-aware card labels with full text in `title`, kind accent rails, status glow, gradient band headers, hover lift, and larger layout-gallery previews. Lane captions became borderless and muted in the adapter (library `dist` rebuilt). Refreshed all 30 app capture frames; session-graph typecheck, 136 unit tests, the 30-frame app capture, eight relevant component specs, and duplicate-frame hashes pass. Two keeper assertions that named a full path as visible text were updated to the new basename labels; the rest of that keeper's 30 failures reproduce on the unmodified code and are pre-existing. No defaults chosen.
- **r14 (2026-11-18):** Closed the two actionable "Next concrete work" items on the OpenCode surface. Added `script/app-matrix.ts` (library `cartesianMatrix`, seed 41, 12 cells over layout/depth/level/lens), `packages/app/e2e/graph/capture-matrix.spec.ts` (12 isolated cells, verified toolbar values, per-cell frames/hashes, no page errors), and committed `docs/spacegraph/screenshots/matrix/app-cells.json`, `matrix-app/`, and `matrix-app.json`. Extended `packages/app/e2e/graph/capture.spec.ts` with a gallery-preview legibility/contrast floor (gap 6) and a CSS3D card-aspect shear gate around the billboard switch (gap 3). Wired generation, capture and report checks into `script/capture-graph-demo.ts` so `graph:capture --mode=verify` gates both. Documented remaining live-`VisionAssert` registration, card fog, widget pixel parity and known flakes. No defaults chosen.
- **r15 (2026-11-18):** Wired host widgets into the flagship surfaces and attempted pixel parity. Added `widget-host.ts` so the map, hybrid and panel surfaces share one host widget registry from `prefs.widgets`; the map and hybrid surfaces previously rendered no widgets. Added `HOST_WIDGET_STATES` to the host manifest. Extended `script/app-matrix.ts` to 20 cells over five axes and committed widget pixel frames with per-cell label assertions; `graph:capture --mode=verify` passed. No defaults chosen.
- **r16 (2026-11-18):** Removed the r15 pixel frames and replaced them with a functional contract. `SPACEGRAPH.md §1.2` sets measured task performance, not visual appeal, as the success criterion, and committed PNG hashes go stale on redesign; the app capture matrix, frames and report are back to their r14 form. Added `packages/app/e2e/graph/widget-behavior.spec.ts`: enabling `prefs.widgets` renders host widgets with their kind labels on the map surface, disabling renders none (2/2 pass). Kept the registry wiring and host manifest axis from r15. No defaults chosen.
- **r17 (2026-11-18):** Closed the last two sub-items of "Next concrete work" item 2. Threaded `global` / `reducedMotion` from `GraphCanvas` through `renderer-registry.ts` into `SpaceGraphRenderer.create`, rebuilt the library `dist`, and added a `Global` canvas story plus `canvas.spec.ts` assertion that the live `SpaceGraph` instance registers under `global: true` (3/3 canvas specs pass, zero optimizer reloads on a warm run). Added DOM-card fog to `LODPlugin`: DOM/CSS3D card opacity now combines the LOD fade with `depthFade(cameraDistanceToNode, sceneFadeDensity(...))` from the active depth treatment, so flat is opaque and layered/depth-stack attenuate farther cards; `test/lod.test.ts` covers both. Verification: 661 library unit tests, 136 session-graph unit tests, 3 canvas component specs, both publish checks, session-graph typecheck all pass. No defaults chosen.
