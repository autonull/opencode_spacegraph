# SPACEGRAPH.TODO.43.md — Plugin-only delivery plan (no fork)

**Status:** Phases 0–6 complete on the local fork; PR not submitted, no repos created/pushed. The fork branch `pr1-plugin-surface-apis` was reset to upstream `dev` (`3dc66ab6e5`, 2026-11-18) with the canonical `SessionSurface` patch reapplied (Phase 6.1–3), and the plugin was made self-contained on that base (Phase 6.4): plugin-owned i18n (`ui.sessionGraph.*` catalog), local `Button`/`TextInput` primitives and local `WorkspaceSnapshot` types replace the `@opencode/ui/*` and `@opencode/client/promise` exports upstream dropped. The app component gate now passes in a real browser with the committed bundle loaded through the production `pluginDefinition` loader: both `spacegraph.map` and `spacegraph.hybrid` render a real SpaceGraphJS graph (nodes, edges, cards), the transcript element survives surface switches, and screenshots/videos are captured. Plugin 6/6, component 4/4, plugin typecheck and app typecheck are green. Fork-only `useGraphState`/`useGraphKeyboard`/`GraphWindowManager` and literal `GraphView` state/keyboard parity remain **deliberately out of scope** (plugin-owned state/shortcuts/window registry cover them). Remaining: push per the standing decision (new origin branch for the fork, plugin repo to its own origin, library `main` separately) — requires explicit sign-off. Do not submit the upstream PR or create/push repos without asking.
**Extends:** `SPACEGRAPH.TODO.41.md` (r17, implemented); alternative to `SPACEGRAPH.TODO.42.md` (upstream merge plan).
**Goal:** deliver the full SpaceGraph capability platform as a **SpaceGraphJS library + a third-party OpenCode GUI plugin**, so the fork carries little or no SpaceGraph source and upstream `dev` can be tracked without a 2,251-commit merge.
**Principle:** *minimize the fork patch; maximize what lives in SpaceGraphJS and GUI Plugins.* Every line added to `packages/app`, `packages/plugin`, or `packages/core` must be a generic host seam with no SpaceGraph vocabulary, and must be contributed upstream.

---

## 1. Why this is viable now (measured 2026-11-18)

| Finding | Evidence | Consequence |
|---------|----------|-------------|
| Upstream has a real third-party GUI plugin system | `packages/plugin/src/gui`, `@opencode/plugin/gui` (public), `Plugin.define`; built-ins and third-party bundles use the same manifest | The graph host can be a plugin, not fork source |
| A plugin ships one `./gui-experimental` CommonJS bundle | `packages/plugin/src/gui/vite.ts` `gui()` helper; `packages/gui-plugins/AGENTS.md`: "a third-party `./gui-experimental` bundle default-exports one `Plugin.define`" | No upstream build changes; Vite config in the plugin repo |
| SDK registries cover commands, panels, settings, slots, styles, themes, icons, i18n, contracts | `packages/plugin/src/gui/registries.ts` | Toolbar, settings, side panel, preference gate, and copy move cleanly into the plugin |
| `@opencode/plugin`, `@opencode/ui`, `@opencode/client`, `@opencode/schema` are public; `@opencode/session-ui` is **private** | `package.json` of each on `upstream/dev` | Plugin cannot import `@opencode/session-ui/*` from npm — port those pieces locally (§4.3) |
| The pure graph model imports only `@opencode/client/promise` | 98 files under `packages/session-ui/src/graph` | Portable to a plugin-owned package with no core changes |
| The one missing host seam is small | Upstream has **no** `SessionSurface`; our fork's addition is ~40–150 lines across 7 files + tests (interface + registry + `Surfaces` API + host wiring) | A single small, generic upstream PR unblocks the plugin; this is `SPACEGRAPH.md §9.1` rung 4 |
| Library can be bundled, not published | `gui()` externalizes app-provided OpenCode modules; `@spacegraphjs/*` and `three` are ordinary deps | `TODO.41` r12 (npm publishing out of scope) stays valid; no registry decision needed |

**Conclusion:** `SPACEGRAPH.TODO.42.md`'s 917-conflict merge is avoidable. Do not execute it unless this plan fails its spike (§3).

---

## 2. Target architecture — where each line of code lives

| Location | Contents | Fork patch? |
|----------|----------|-------------|
| **Upstream `dev` (contributed)** | One generic `SessionSurface` registry, `Surfaces` host API, surface selection/host rendering hook, plus tests and TSDoc. No SpaceGraph names. | Yes — **the only upstream change**; PR first, then drop the local patch when merged |
| **Fork (temporary)** | The same `SessionSurface` patch, kept as a rebaseable diff sitting on clean upstream `dev`. After upstream merges it: **zero SpaceGraph source in the fork**. | Yes, temporary |
| **SpaceGraphJS repo** (`spacegraphjs/`, already separate) | All 19 capabilities from TODO.41, contract, renderers, explorer, second host, docs. Unchanged by this plan. | No |
| **New plugin repo/package** (`spacegraph-gui-plugin`) | Pure graph model (from `session-ui/src/graph`), graph host (from `session-graph`), GUI plugin integration (from `gui-plugins/src/spacegraph`), local copies of the few private `session-ui/timeline/*` helpers, tests, `gui-experimental` build | No |
| **App / core / schema** | Nothing SpaceGraph-specific. No flags, no mode, no toggle, no `session/surface.tsx`, no `spacegraph.*` strings. | No |

**Budget:** target fork patch ≤ ~200 lines and zero SpaceGraph-specific files. If a change grows past that, it goes back into the plugin or into SpaceGraphJS.

---

## 3. Phase 0 — Feasibility spike (do this first; stop if it fails)

**Progress (r2, 2026-11-18): gate passed.**

The generic seam was applied to a throwaway worktree at clean `upstream/dev` (`0220248dc1`) with a real
`bun install --frozen-lockfile`, then verified end to end:

- `docs/spacegraph/upstream-session-surface.patch`: 14 files, 524 added lines. `git apply --check` passes on pristine upstream.
- Unit: `packages/plugin/test/gui-host.test.ts` 18 pass, `packages/app/src/runtime/plugin/surfaces.test.ts` 4 pass.
- Component (real browser): `packages/app/component-tests/session-surface.spec.ts` 2 pass — one mounts a synthetic
  contributed surface and proves the transcript element survives a switch; the other builds a real
  `gui-experimental.cjs` with `gui()`, loads it through the app's production `pluginDefinition` → `evaluatePluginBundle`
  path, and proves its surface renders in the host.
- `tsc -b` clean in `packages/plugin` and `packages/app`; `bun script/sdk-docs.ts` reports 0 problems.
- The component test caught and fixed a real bug: the transcript memo tracked `custom()`, rebuilding the element on
  every surface switch. It is now untracked and constructed once.

Step 4's literal desktop launch (open a session in Electron) was **not** performed: the web e2e harness has no main
process or `Bridge`, so it cannot load a third-party GUI bundle from config, and `agent-browser` is not installed.
The browser test above exercises the same contract through the production loader, which is the gate's substance.
A desktop smoke test remains optional before Phase 4, not a blocker.

Goal: prove a third-party plugin can own a session surface on a **clean upstream checkout** before porting anything.

1. Clone upstream `dev` into a throwaway worktree (do not use the fork branch).
2. Apply the minimal `SessionSurface` patch to `@opencode/plugin/gui` and the app host:
   - SDK: `SessionSurface` interface (`registries.ts`), `SessionSurface` registry, `Surfaces.list()/select()` in `host-apis.ts`, context property.
   - Host: `runtime/plugin/surfaces.ts` (selection keyed by session, ordered list with `transcript` first), `host-apis.tsx` and `host.tsx` wiring, `session/surface.tsx` render seam, `session/screen.tsx` picker entry.
   - Use the fork's own implementations as reference (`git show HEAD:<path>`); they already contain the exact code.
3. Create a minimal plugin package: `src/gui.tsx` default-exports `Plugin.define({ setup(ctx) { ctx.add(SessionSurface, { id: "spike.map", title: ctx.t("map"), render: ({ transcript }) => <div>map</div> }) } })`, with a `gui()` Vite build producing `dist/gui-experimental.cjs`.
4. Configure the plugin in the upstream app (`plugin` config with a local path), launch, open a session, select the surface, assert it renders and that the transcript stays mounted.
5. **Gate:** if step 4 works, continue. If the host cannot render a contributed session body, stop and re-plan (fallback: side-panel-only plugin with a hybrid split contributed as a second small seam).

Record the exact patch as a diff file (`docs/spacegraph/upstream-session-surface.patch`) so the fork patch is reproducible.

---

## 4. Phase 1 — Contribute the seam upstream

**Progress (r2): PR content complete; submission intentionally deferred.** The recorded patch is generic and PR-shaped:
`SessionSurface`, `SessionLayer`, `SessionSurface` registry, `Surfaces` API, `ctx.surfaces`, per-session surface state,
a render seam plus picker, full TSDoc, unit tests, app component tests, and a real CJS bundle fixture. No SpaceGraph
vocabulary, flags, flags bridge, transcript screen, or default change is included. The Phase 0 gate now passes, so the
patch is ready to submit.

1. Extract the spike patch into a clean upstream PR: generic names, full TSDoc per `packages/plugin/src/gui` rules, tests in `packages/plugin/test/gui-host.test.ts` and app component tests.
2. PR title `feat(gui): add a session surface registry for plugins`; target `anomalyco/opencode:dev`. Keep it to the 7 files + tests. No SpaceGraph dependency, no flag, no default change.
3. While the PR is open, the fork keeps the patch rebased on upstream `dev`. When merged, reset the fork branch to upstream and delete the local patch — the fork becomes source-free.

**Do not** contribute SpaceGraph-specific behavior, package deps, or UI copy in this PR. The review question from `SPACEGRAPH.md §9.1` is "does the generic seam make sense for any plugin?"

---

## 5. Phase 2 — Scaffold the plugin package (new repo)

**Progress (r3, 2026-11-18): complete.** `spacegraph-gui-plugin/` now holds a real, buildable package:
`package.json`, `tsconfig.json`, `vite.config.ts` (`gui({ entry: "src/gui.tsx" })`), `src/gui.tsx`
(`Plugin.define` with i18n, a `prefs` store, two `SessionSurface`s, a command, a side `Panel` and a `Style`),
`src/model/`, `src/host/`, `src/i18n/`, `test/` and `README.md`. The package is scaffolded inside the fork for now;
Phase 6 extracts it to its own repo. The SDK resolves to the fork's seam-enabled `@opencode/plugin`, so no local
reimplementation of the contributed APIs is needed.

Create `spacegraph-gui-plugin` with:

```
package.json          deps: @opencode/plugin (public), @opencode/client, solid-js, @spacegraphjs/* (bundled)
vite.config.ts        plugins: [gui({ entry: "src/gui.tsx" })] from @opencode/plugin/gui/vite
src/gui.tsx           Plugin.define: declarations (i18n, stores, icons), setup registering surfaces/commands/panel/settings
src/model/            port of packages/session-ui/src/graph (98 files, pure, imports only @opencode/client/promise)
src/host/             port of packages/session-graph (canvas, UI, cards, widgets, views)
src/plugin/           port of packages/gui-plugins/src/spacegraph (surfaces, hybrid, widget-host, host-manifest)
src/private/          minimal local copies of any @opencode/session-ui/timeline/* helpers the host needs
src/i18n/, src/icons/ plugin-owned copy and artwork (ctx.t, ctx.icons)
test/                 unit + component tests; e2e runs against an app with the plugin installed
```

Rules:
- Use `ctx.t`/`ctx.plural`, `ctx.stores`, `ctx.add(Style, css?inline)`, `ctx.icons`, and contracts instead of `useI18n`, `prefs` store globals, or direct CSS imports from the app.
- Replace `ConfigFlag` gating with plugin options / a plugin-declared store. The `graph_*` flag bridge in `TODO.41` P0.5 becomes a plugin option, not a core flag.
- Replace `SessionSurface` host calls (`selectSessionSurface` etc.) with `ctx.ui.surfaces` from the contributed SDK.
- `@opencode/session-ui` is private upstream: copy only the specific timeline helpers used (verify with `git grep` on the fork), do not vendor the package.

---

## 6. Phase 3 — Bundle SpaceGraphJS instead of publishing it

**Progress (r3, 2026-11-18): complete, with a measured size finding.** `bun run build` produces
`dist/gui-experimental.cjs` (1.8 MB / 558 KB gzip). Its only `require` calls are the app-provided modules
`effect`, `@opencode/plugin/gui`, `solid-js`, `solid-js/web`; `spacegraphjs/activity` and `three` are inlined.
Finding: the engine's vision path dynamically imports `onnxruntime-web` (~70 MB); since `gui()` inlines every dynamic
import, the build aliases that one module to an inert `src/onnx-stub.ts` (the plugin does not use vision). Without the
alias the bundle is 78 MB. If vision is later needed, publish `@spacegraphjs/*` instead of bundling (§6 step 5) — a
separate decision, not a Phase 3 blocker.

1. Add `@spacegraphjs/*` as normal dependencies of the plugin package.
2. `gui()` leaves them in the bundle; build `dist/gui-experimental.cjs` with all dynamic imports inlined.
3. Check the bundle: OpenCode modules must stay external (the build fails if a second copy is bundled), `three`/`@spacegraphjs/*` are included. Expected cost ≈ 282 KB gzip (`SPACEGRAPH.md §7.3`).
4. Keep `spacegraphjs` as its own repo; push its r17 tip (`ba733d0`, 39 ahead of its origin) separately. **No npm upload** — `TODO.41` r12 stays valid.
5. If bundle size or load cost later proves unacceptable, revisit publishing as a separate decision; do not make it a prerequisite.

---

## 7. Phase 4 — Port the capabilities, in dependency order

**Progress (r12, 2026-11-18): steps 1–2 core done, steps 3 and the GUI-integration model, widgets, panel/settings and the interactive chrome done; the remaining file-for-file `SessionGraph`/`GraphView` chrome depth stays in the fork.** The complete pure model from `packages/session-ui/src/graph` is ported to
`src/model/` (99 files, including its golden fixtures and 41 unit-test files), with the 3 private helpers copied to
`src/private/timeline/` (`detail`, `projection`, `timeline-row`) and `src/private/message/current-tool-state.ts` and
their imports rewritten. `src/model/session-spec.ts` adapts `buildGraph` + `layoutGraph` output into the engine spec,
and `src/host/graph-canvas.tsx` now renders that real model through `SpaceGraph.create` from
`spacegraphjs/activity`, disposing on cleanup. Both surfaces keep the transcript mounted. Tests match the fork's
original model suite exactly (343 pass / 19 fail / 1 error in both), so the port is faithful. **Still not file-for-file
parity:** the remaining renderer-host UI (`packages/session-graph`, ~120 chrome files) — `GraphDetail`, `GraphFind`
facets, minimap, status bar, a11y layer, gallery, compare, popovers, filesystem windows and their hooks — stays in the
fork. r12 delivers their interactive capability surface in plugin-owned chrome. Replace the `ConfigFlag` / `prefs`
bridge with plugin options or a plugin-declared store as the plan below specifies.

On r5 the render-model core was added at `src/host/canvas/`: `buildRenderModel.ts`, `sessionGraphAdapter.ts`,
`computeLayout.ts`, `model-apply.ts`, `renderer-registry.ts`, `constants.ts` plus `fixtures.ts`, with 90 ported unit
tests (all pass). The surface now runs the real host pipeline — `buildGraph` → `layoutGraph` → `buildRenderModel` →
`mountRenderer` (SpaceGraphJS first, Cytoscape fallback) → `renderer.setModel` — and disposes the renderer on cleanup.
The interim `buildSessionSpec`/`SpaceGraph.create` adapter and its tests were deleted as dead code. The remaining
renderer-host UI (`packages/session-graph/src/ui`, ~120 files) is still in the fork.

On r6 the first GUI-integration slice landed at `src/plugin/`: `options.ts` (depth/density/renderer/widget/lens
lists), `lensGoals.ts`, the full English catalog, and a `ConfigFlag`-free capability manifest with 3 ported/adapted
tests (all pass). `hostManifestEntries()` replaced core `ConfigFlag` keys with plugin-owned options
(`GRAPH_OPTION_KEYS` / `graphOptionSet`), so no `@opencode/schema/config/flag` dependency leaks into the plugin.
`src/gui.tsx` now merges the full copy and registers a read-only settings page that lists every manifest axis. Still
in the fork: the GUI surfaces/model hook, widget host, interactive panel and settings controls, lens/palette pickers,
time travel and the renderer-host UI.

On r7 the first renderer-host UI slice landed at `src/host/ui/`: `graph-camera.ts`, `overlay.ts`, `theme.ts`,
`node-data.ts`, `provenance.ts`, `cardTemplate.ts`, `card-copy.ts`, `axisLabels.ts` and
`canvas/buildRenderModelHelpers.ts`, with 26 ported tests (all pass). `src/host/graph-canvas.tsx` now supplies
`createCardTemplate(DARK_THEME, { copy: createCardCopy(i18n) })` to `buildRenderModel`, so cards carry the real host
markup. The empty `packages/plugin/src/gui/solid.js` shadow file was removed: it broke module resolution in both the
Bun tests and the browser harness.
On r8 the headless session widget registry landed at `src/host/widget-registry.ts` (ported from
`packages/session-graph/src/ui/widget-registry.ts`): `SESSION_WIDGET_IDS`, `sessionWidgetRequests`,
`createSessionWidgetRegistry`, `legacyWidgetRegistry`, `widgetRequestNode` plus a new
`withWidgetRequests` helper that attaches P3.6 widget tokens to a `RenderModel`. The five widget-prop
types live in `src/host/widget-types.ts` so the registry stays headless (components are injected).
Five ported tests pass via `bun run test:host`; `graph-canvas.tsx` now annotates the built render model
with widget requests. Bundle is 2.51 MB / 759 KB gzip with the same app-provided externals. Still in
the fork: the full UI chrome (`SessionGraph.tsx` 2,101 lines, `GraphView.tsx` 2,003 lines, toolbar,
panels, windows, the mounting widget components and `NodeWidgetLayer`, ~120 files) and the GUI
integration model hook (`createSpacegraph`), panel, settings and widget host.
On r9 the GUI-integration declarations and model hook landed at `src/plugin/`: `declarations.ts`
(full `State`/`Prefs` schemas, `SpacegraphPreferences`, `DEFAULT_PREFERENCES`, all nine
`BUILTIN_LENSES`, and a plugin-owned `capabilities` gate set), `export.ts` (SVG/JSON/HTML map export)
and `model.ts` (`createSpacegraph`). Three deliberate adaptations keep plugin delivery core-free:
`ctx.flags.enabled("graph_*")` becomes `prefs.capabilities.<name> !== false`; the fork-only
`server.graph.workspace` RPC is dropped; and the incremental builder uses the ported `buildGraph`
plus incremental layout positions instead of the fork's internal graph copy. `gui.tsx` now spreads the
full declarations definition, creates the model in `setup`, and routes the open-map command through
`model.select`. Twelve ported model tests pass via `bun run test:model-plugin` (now also covered by
`test:plugin`, 15/15). Bundle is 2.53 MB / 765 KB gzip with six app-provided externals (added
`solid-js/store`). Still in the fork: the mounting widget components + `NodeWidgetLayer`, the
interactive panel/settings and the full `SessionGraph`/`GraphView` chrome.
On r10 the node widgets are mounted, not just tokenised. `src/host/widgets/` carries
`node-widget-data` (parsing contracts with 4 new tests), the five Solid components,
`TurnMapInlineGraph` + `turnMap`, the library-facing `NodeWidgetLayer`, `session-widget-components`
and the three copied widget stylesheets. `src/plugin/widget-host.ts` binds `createSpacegraph` to the
headless registry through the plugin's `widgets` prefs gate. `graph-canvas.tsx` now holds the built
view and mounted renderer in signals and renders `NodeWidgetLayer` above the canvas; both surfaces
pass the routed `screen` and the model into that host policy. The widget components are now in the
bundle (2.55 MB / 772 KB gzip) with `@opencode/ui/button` and `@opencode/ui/text-input` as additional
app-provided externals. The bundle test supplies a minimal `window.document` because Solid's compiled
JSX registers delegated events at module scope. Still in the fork after r10: the interactive panel/settings and
the full `SessionGraph`/`GraphView` chrome (~120 files); r11 ports the panel/settings.

On r11 the interactive side panel and settings page landed at `src/plugin/`. `panel.tsx` keeps the fork's
search → `model.focus`, `Windows`/`Inspector` overlays, transcript reveal through `props.screen.transcript.reveal`
and the shared host-widget registry, but uses the already-ported `GraphCanvas` as its body because the
`SessionGraph` chrome is not ported yet; `@spacegraphjs/inspector` and `@spacegraphjs/window-manager` join the
plugin deps. Like the fork, the windows signal starts empty — creating inspector windows belongs to the chrome
port. `settings.tsx` replaces the manifest dump with real controls backed by the plugin `prefs` store: the nine-lens
picker, custom-lens save, map/hybrid defaults, density and renderer selects, reduced-motion and node-widget switches,
framed by `ctx.ui.SettingsLayout`/`SettingsSection`/`SettingsRow`. `gui.tsx` renders both components instead of
the placeholders and contributes their CSS through the existing single `Style`. No core `graph_*` flag or
`server.graph.workspace` RPC is used. Bundle is 2.58 MB / 779 KB gzip with the same app-provided externals.

On r12 the interactive chrome landed at `src/host/`. `session-graph.tsx` composes the canvas with a toolbar, palette,
find panel, legend and floating `Inspector` windows, and is now the body of the side panel, the map surface and the
hybrid surface (the transcript stays mounted). `chrome.tsx` drives the model's lens/level/layout/depth/arrangement/
side setters, palette entries, focus/turn-map/follow/time-travel/permalink/export actions; `chrome-helpers.ts` holds
the pure option-cycle and window-raise policy (3 new tests). Inspector windows now open from the toolbar or an
inspector selection, so the r11 empty-window gap is closed. `GraphCanvas` observes the shared graph memo with
`runWithOwner`/`createEffect`, so chrome-driven layout changes redraw the live renderer. All chrome copy is
plugin-owned i18n; no new app module became a bundle external. A palette-surface id bug was fixed to select the
registered `spacegraph.map`/`spacegraph.hybrid` ids rather than `${ctx.id}.*`. Bundle is 2.60 MB / 782 KB gzip.

On r13 the next chrome-depth slice landed in `src/host/ui/`, keeping `SessionGraph` as the single mount
point. `graph-find.tsx` replaces the compact find panel with the fork's three-tab shape (search,
filters, outline): ranked search with saved questions, composable kind/status/domain and quick
facets via the ported `applyFacets`/`facetCounts`, plus level/turn scoping and the session outline.
Its pure policy lives in `find-helpers.ts` (4 tests). `graph-minimap.tsx` is the renderer-agnostic SVG
overview; because the plugin has no camera seam, clicking or dragging focuses the nearest laid-out
node through `minimap-geometry.ts` (3 tests). `graph-a11y.tsx` mounts the library `AccessibilityLayer`
over the render model built from the shared graph memo, with all copy supplied by `ctx.t`. The
ported `graph-status-bar.tsx` drives focused-node verbs (frame, save-as-question, copy path, export,
note, pin, clear) from `createSpacegraph` using plugin-owned CSS. `comparison.ts`, `window-placement.ts`
and `graph-compare.tsx` port the turn/parked comparison and first-placement policy (4 tests) and add a
second window kind beside `Inspector`; the status bar's Compare action opens and closes it. All new
copy is plugin-owned i18n; no new app module became a bundle external and no core `graph_*` flag or
fork RPC is used. Bundle is 2.63 MB / 790 KB gzip. **Still not file-for-file parity:** `GraphDetail`/
`GraphDiff`, gallery, popover, filesystem windows, and the deeply entangled hooks (`useGraphState`,
`useGraphKeyboard`, `GraphWindowManager`) stay in the fork; the plugin-owned window registry covers
the two kinds the chrome actually mounts.

On r14 the detail-family chrome landed in `src/host/ui/`, still mounted through the single `SessionGraph`
host. `graph-detail.tsx` ports the selectable-DOM node record (header, fields, badges, file/subagent
sections, input/output, connections, capability-filtered actions and trace verbs); `detail-helpers.ts`
carries its pure derivation (5 tests) and `detail-copy.ts` names every plugin-owned i18n key, including
the model's kind/status/confidence/action vocabulary. The inspector window now renders this component
instead of `@spacegraphjs/inspector`, so that dependency was dropped. `graph-diff.tsx` ports the
library-backed unified-diff view; `graph-filesystem-window.tsx` adds a workspace-tree window kind;
`graph-gallery.tsx` renders every layout as a static SVG thumbnail through the ported render pipeline;
`graph-popover.tsx` floats the same detail over the canvas without taking layout width. No new app
module became a bundle external, and no core `graph_*` flag or fork RPC is used. Bundle is 2.66 MB /
797 KB gzip. **Still not file-for-file parity:** the headless hooks (`useGraphDetailMode`,
`useGraphViewModel`, `useGraphAnnotations`, `useComparison` consumers), `GraphWindows`' focus-trap host
and `GraphWindowManager`'s nine-body registry stay in the fork; the plugin-owned `createSpacegraph`
state and three-kind window registry cover the mounted chrome.

On r15 the remaining headless hooks were ported into `src/host/ui/`, closing the Phase 4 parity slice.
`useGraphDetailMode.ts` coordinates the detail/depth/layout setters with their change callbacks (the plugin
has no projection or detail-framing state, so those two axes stay out); the chrome's layout and depth
buttons now go through it. `useGraphViewModel.ts` composes the turn window, active facets and collapsed
groups into one scoped model plus counts and anchors; `graph-find.tsx` now takes its results and facet
counts from it. `useGraphAnnotations.ts` owns the note composer and trace walker over plugin-owned state,
with i18n from `ctx` and trace axes controlled by `createSpacegraph`; the status bar's Add note and the
detail's trace/note verbs now go through it, its announcements feed the a11y live region, and `graph()`
now includes note nodes via `withAnnotations` (so `export` no longer applies it twice). `useComparison.ts`
binds the plugin's pure `compareTurns`/`compareParked` to a headless turn-pair signal; the compare window's
active state now comes from it, and comparing the parked view uses the unparked live model (fixing a
pre-existing bug where the parked graph was compared to itself). The fork's `useGraphState` (612-line
duplicate of plugin-owned state), `useGraphKeyboard` (global DOM + multi-instance bus) and
`GraphWindowManager` (nine window bodies) stay out by design. 19 new pure-logic tests pass via
`bun run test:ui` (61/61 total). Bundle is 2.66 MB / 799 KB gzip with the same app-provided externals;
the bundle gate now checks the new note/trace i18n keys.

1. Pure model (`session-ui/src/graph`) → `src/model/`. Keep IDs, levels, and selectors identical so existing unit tests port unchanged.
2. Renderer host (`session-graph`) → `src/host/`. It imports only the contract plus public `@opencode/*` packages; replace private `session-ui` helper imports with `src/private/`.
3. GUI plugin integration → `src/plugin/`. Register:
   - two `SessionSurface`s: `spacegraph.map` and `spacegraph.hybrid` (hybrid renders transcript + map);
   - commands for toggling/focus/permalinks;
   - a `Panel` for the side inspector and a settings page for `prefs.widgets`;
   - `Slot` contributions for header actions if needed;
   - the host widget registry from `gui-plugins/src/spacegraph/widget-host.ts`.
4. Move `data-*` contracts, a11y labels, roving tabindex, reduced-motion behavior, and the host manifest into the plugin; keep the library seams unchanged.
5. Preserve the r17 debug path: the plugin passes `global: true` under debug mode so `createVisionAssert(page)` still finds the live instance.

---

## 8. Phase 5 — Tests and screenshots

**Progress (r16, 2026-11-18): partial.** `test/bundle.test.ts` (3 cases) reads the committed
`dist/gui-experimental.cjs`, evaluates it through the production `evaluatePluginBundle` loader with browser conditions,
asserts its i18n and store declarations, runs `setup` with a capture context and checks the two surface ids plus
command/panel/settings-page/style registrations, chrome i18n and the shipped panel/settings/chrome CSS. The ported model's 41 test files
(362 tests) run via `bun run test:model` and reproduce the fork's pre-existing 343/19/1 result exactly; the 90 ported
render-pipeline tests run via `bun run test:canvas` and all pass; the 3 adapted capability-manifest tests plus the
12 model-hook tests run via `bun run test:plugin` (15/15); the 26
ported renderer-host UI helper tests run via `bun run test:ui` and all pass; the 5 ported headless
widget-registry tests run via `bun run test:host` and all pass; the 12 adapted model-hook tests run via
`bun run test:model-plugin` and all pass (`test:plugin` is now 15/15); the 4 new node-widget-data
contract tests run via `bun run test:widgets` and all pass; the 3 new pure chrome
tests run via `bun run test:chrome` and all pass. `bun run test` (3/3) and `bun run
typecheck` are green. On r13 the renderer-host UI suite grew to 37 passing tests (4 find helpers,
3 minimap geometry, 4 comparison/window placement on top of the prior 26), and on r14 to 42 with the
5 detail-helper tests, and on r15 to 61 with the 19 headless-hook tests; the bundle gate now checks the `find.title` and `ui.sessionGraph.inspector.title`
i18n keys and the shipped `.sg-find-panel`, `.sg-status-bar`, `.sg-minimap`, `.sr-only`, `.sg-detail`,
`.sg-files`, `.sg-gallery` and `.sg-popover` styles, and still passes 3/3 against the rebuilt bundle.
On r16 a self-contained component suite landed in the plugin package: `test/components.test.ts` (3 cases,
`bun run test:components`) mounts the shipped SettingsPage from the committed bundle under a mock host
context, plus the source `GraphToolbar` and `GraphFind` under a mock model; it asserts the settings
layout/sections/rows/controls, the toolbar controls and a depth change routed through
`useGraphDetailMode`, and the find panel's chips and results. It uses happy-dom and a small Bun TSX
preload (`test/solid-jsx.ts`, `bunfig.toml`) because the plugin has no Storybook harness; `bun run test`
now runs 6/6 across both test files. Still missing: regenerated screenshots from a plugin-enabled app,
and the app graph e2e.

An app component gate was added at `packages/app/component-tests/spacegraph-plugin.{spec,fixture}.tsx`: it loads the
committed bundle through `pluginDefinition`, selects each contributed surface and asserts it renders while the
transcript element keeps its marker. It is a CI gate only — this fork's local component harness has pre-existing
breakage (stale duplicate `packages/stories/playwright` harness, a Storybook dependency-scan failure, and a missing
`SESSION_PANES` export in `app/src/shell/state/session-tabs.ts`), so the spec cannot pass locally yet; existing
component specs fail identically. On r16 the local failure was triaged: the Storybook Vite dependency scan aborts
first on two missing `session-ui` package exports (`./tools/ansi`, `./tools/shell-output`); adding them exposes
about twenty further "No matching export" errors across app/UI/session-ui sources (including the missing
`SESSION_PANES`, `createShellFollower` and several story-model exports). That is broad pre-existing fork drift,
not a plugin regression, so it was left untouched to keep the fork patch minimal, and the missing exports probe
was reverted. Still missing: regenerated screenshots and the app graph e2e. The r2
seam component test already proves a real bundle renders in the host, so this is an extension of a proven path, not a
new spike.

- Port unit tests with the code (`session-ui/src/graph`, `session-graph`, `host-manifest`, widget registry). They run in the plugin repo with `bun test`.
- Port component tests that mount graph components; keep the Storybook harness but point story globs at `src/host/**/*.stories.tsx`.
- App e2e (`packages/app/e2e/graph/*`) needs the app with the plugin installed. Two options, choose in the spike:
  - a CI harness that seeds the local plugin path in config before launch (preferred — tests the real delivery shape); or
  - keep a thin fork-only e2e suite if config injection is impossible.
- Screenshot regeneration: run the existing capture gate against the plugin-enabled app; commit frames into the plugin repo (not the fork). Keep `TODO.41` r16 rule: functional DOM assertions over pixel hashes.
- Gates: plugin unit/component tests, app graph e2e, `graph:capture --mode=verify`, library `vitest run` + both publish checks, `bun run check` on a clean upstream checkout + plugin.

**Progress (r17, 2026-11-18): harness repair attempted; true scope established.** With sign-off to attempt the Phase 5 repair, the component harness was triaged from a cold cache on an isolated port (`PLAYWRIGHT_STORYBOOK_PORT=6218`, cache cleared). The Vite dep-scan fails first on `Missing "./tools/ansi" specifier in "@opencode/session-ui"` (the fork's `session-ui/package.json` lacks the `./tools/ansi` and `./tools/shell-output` subpath exports that upstream has and the r27-era app files import). Adding those exports (probe, since reverted) exposes **60+ `No matching export` errors across 19 files** — not the ~20 estimated at r16 — including `SESSION_PANES`, `createShellFollower`, the `session.story-model` helpers, mock `context`/`solid-router` providers and ~20 `tool-renderer.tsx` helpers. Root cause: the fork's `app`/`session-ui`/`ui` sources are ~1,006 files / 67172-116015 lines behind upstream `dev` (session-ui 2.1.0 vs upstream 2.3.0), while later consumer files were added against the newer APIs; hand-fixing exports or syncing those packages is the 2,251-commit merge this plan exists to avoid. A contained alternative was also tried: `optimizeDeps.noDiscovery: true` with the 23 runtime-discovered deps listed in `include` (single-file change to `packages/storybook/.storybook/main.ts`). Storybook did not reach `ready` within the 120s `webServer` timeout with that config, so it was reverted. Separately, the **app e2e harness was verified working**: `e2e/graph/widget-behavior.spec.ts` passes 2/2 against a fresh Vite dev server. However, the app loads third-party GUI bundles only through `props.bridge.pluginGuis()` (`src/runtime/plugin/plugins.tsx:83`), a desktop-only path absent from the web harness, so it cannot seed the external plugin from config — matching the r2 finding. Working tree is clean; no probe changes were kept. **Conclusion:** plugin screenshots and plugin-enabled app e2e stay blocked until either (a) a desktop/Bridge-based harness is provided, or (b) the fork is synced to upstream `dev` (Phase 6 territory). Both need explicit sign-off; do not attempt a silent export-by-export repair.

---

## 9. Phase 6 — Shrink and freeze the fork

1. Delete all SpaceGraph source from the fork: `spacegraphjs/` (plain dir / submodule pointer), `packages/session-graph`, `packages/gui-plugins/src/spacegraph`, `packages/session-ui/src/graph`, `packages/app/e2e/graph`, graph scripts, `SPACEGRAPH*.md`, graph docs/screenshots, graph CI workflow.
2. Keep only the `SessionSurface` patch until upstream merges it; afterwards the fork is clean upstream `dev`.
3. Rebase on new upstream commits with plain `git rebase` / fast-forward; the recurring 2,251-commit sync debt is gone.
4. Update `SPACEGRAPH.md` §6/§9/§11 to describe the plugin delivery: library published/bundled, plugin installed by config, fork source-free.
5. Mark `SPACEGRAPH.TODO.42.md` superseded (fallback only) and add an r18 entry to `TODO.41`.
6. Push per the standing decision: **new origin branch** for the fork state; plugin repo to its own origin; library repo `main` separately.

---

## 10. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Upstream rejects or delays `SessionSurface` | Keep the patch rebaseable; plugin works on fork until merge. If rejected, re-plan around `Panel` + a contributed split slot (smaller, weaker UX) |
| `gui-experimental` is explicitly experimental; API churn | Pin `@opencode/plugin`; the plugin owns its build; re-run the spike against each upstream sync |
| Private `@opencode/session-ui` helpers drift | Copy only the few used files; add a sync check that diffs them against upstream on each rebase |
| Bundle too large or slow | Measure in spike; publish packages later if needed (separate decision) |
| Plugin config/policy (`plugin.use`) gates third-party plugins | Document install steps; keep opt-by-config behavior (no default change, per `SPACEGRAPH.md §10`) |
| Tests lose coverage when moved | Port the exact test files; keep one app-side smoke test that proves the installed plugin renders the map |

---

## 11. Definition of done

1. Clean upstream `dev` + plugin config reproduces every capability in TODO.41's manifest and explorer.
2. Fork patch is ≤ ~200 lines, generic, and upstreamed (or an explicit, time-boxed temporary patch).
3. No SpaceGraph code in `packages/app`, `packages/core`, `packages/plugin`, or `packages/session-ui` on the fork.
4. All library gates and all plugin/app graph gates pass; screenshots regenerated from the plugin-enabled app.
5. Docs updated; TODO.42 marked fallback; r18 recorded in TODO.41; all three repos pushed to new/own branches as decided.

---

## 12. Fresh-session handoff checklist

1. Read this file, `SPACEGRAPH.TODO.42.md` §1, and `TODO.41` r16/r17 clarifications.
2. Phases 0–3 are complete; Phase 4 has the model, render pipeline, capability manifest, renderer-host UI slice,
   widget registry, full plugin declarations, `createSpacegraph` model hook, mounted node widgets, panel/settings,
   the interactive chrome, the r13 depth slice, the r14 detail slice and the r15 headless hook parity ported. `spacegraph-gui-plugin/` builds,
   loads, contributes two surfaces, renders a `RenderModel` with the ported card templates, renderer registry and
   widget request tokens, and mounts the five Solid widgets through `NodeWidgetLayer` under a plugin-owned prefs gate.
   One `SessionGraph` host is mounted in the side panel and both surfaces; it carries a toolbar/palette, the
   three-tab full-facet find panel, legend, minimap, an accessibility mirror, a selection status bar, a ported
   `GraphDetail` in the inspector window, filesystem and comparison windows, a layout gallery, a node popover,
   time-travel and follow/focus controls, plus a `prefs`-backed settings page. `GraphCanvas` redraws from the shared
   graph memo, so model changes reach the renderer. An app component gate for the installed bundle exists but is
   blocked locally by pre-existing fork harness breakage. Phase 4's headless hooks are now ported and wired into the
   chrome, find panel, note/trace verbs and comparison window; the plugin's own component suite now mounts the
   settings page, toolbar and find panel (3/3), so Phase 5 needs only screenshots and the app graph e2e; Phase 6
   needs fork cleanup and pushes.
   Concrete next slice (Phase 5): regenerate screenshots from a plugin-enabled app and commit the frames into the
   plugin repo, and add the app graph e2e through a CI harness that seeds the local plugin path in config. Both stay
   blocked, and r17 established why: the component harness's dep scan fails on ~60 missing exports across 19 files
   because the fork's `app`/`session-ui`/`ui` are ~1,006 files behind upstream `dev` (e.g. `SESSION_PANES`,
   `createShellFollower`, `tool-renderer` helpers, `./tools/ansi` subpath); an export-by-export repair or sync is the
   avoided 2,251-commit merge, so do not fix it silently. The e2e harness works (built-in graph 2/2) but cannot load an
   external GUI plugin because the web harness has no desktop `Bridge`. A decision is needed: provide a desktop/Bridge
   harness, or sync the fork to upstream `dev` as part of Phase 6. Do not attempt contained config hacks (`noDiscovery`)
   — the r17 probe prevented Storybook from reaching ready. Phase 6 then deletes
   fork source, extracts `spacegraph-gui-plugin/` to its own repo, and pushes the three repos to new/own branches —
   all require explicit sign-off before execution. Do not submit the upstream PR or create/push repos without asking.
   Keep the fork's deeply entangled `useGraphState` (612-line store duplicating plugin-owned state), `useGraphKeyboard`
   (global DOM + multi-instance bus) and `GraphWindowManager` (nine window bodies) out: the plugin-owned
   `createSpacegraph` state, shortcut handling and three-kind window registry cover the mounted chrome. Reuse the
   catalog in `packages/ui/src/i18n/en.ts` for `ui.sessionGraph.*` copy. Keep the shared `SessionGraph` composition as
   the single mount point. Keep replacing core `graph_*` flags with `prefs.capabilities` and keep the fork-only
   `server.graph.workspace` RPC out of the plugin.
3. Keep the "minimize fork / maximize SpaceGraphJS + GUI Plugins" budget on every decision. The 524-line patch is the
   *upstream PR*, not the fork patch; the fork budget of ~200 lines still applies to the local diff.
4. `docs/spacegraph/upstream-session-surface.patch` is the canonical clean seam. The older
   `docs/spacegraph/seam/0001-session-surfaces.patch` is a stale, SpaceGraph-flavoured archive; do not apply it.
5. Working tree state: fork branch `pr1-plugin-surface-apis` carries the patch file, these plan notes, the seam
   README pointer, and the new `spacegraph-gui-plugin/` package (source, tests and committed 2.66 MB / 799 KB gzip bundle). Its
   `node_modules/` holds uncommitted, gitignored symlinks to this fork's source packages; a real repo runs `bun
   install`. Scratch worktrees `/tmp/spacegraph-seam-upstream` (patched, real `bun install`) and
   `/tmp/spacegraph-seam-baseline` (pristine) still hold the seam verification.
6. No PR submitted and no new repos created. The plugin package is scaffolded inside the fork and must be extracted
   to its own repo in Phase 6 (per the agreed scope). Library repo remains at `ba733d0` (39 ahead); no merge started.

---

## Revision log

- **r0 (2026-11-18):** Plan written only. Established that upstream's `gui-experimental` SDK can host the plugin, that `SessionSurface` is the sole missing generic seam (~150 lines), that `@opencode/session-ui` is private and must be ported locally, and that `@spacegraphjs/*` can be bundled instead of published. Phases: spike → upstream PR → plugin scaffold → bundle → port → tests/screenshots → shrink fork. No execution.
- **r1 (2026-11-18):** Phase 0 static spike + Phase 1 PR content. Built the generic seam on clean `upstream/dev` in a throwaway worktree: SDK interfaces/registry/context, app `surfaces` helper, host wiring, render seam + picker, i18n key, TSDoc, and two test suites. Recorded `docs/spacegraph/upstream-session-surface.patch` (11 files; applies cleanly to pristine upstream). Plugin bundle test: 18 pass. App surface test: 4 pass. `tsc -b`: no new errors. Live launch gate and actual PR submission intentionally deferred; Phases 2–6 untouched.
- **r2 (2026-11-18):** Completed Phase 0+1 without shortcuts. Recreated the scratch worktree with a real `bun install`; fixed the upstream component fixture's `Attached`/`HostApiFactories` to include `surfaces`; added `packages/app/component-tests/session-surface.spec.ts` plus a real 431-byte `gui-experimental.cjs` fixture built with `gui()`. Built that bundle from a minimal plugin and verified it loads through `evaluatePluginBundle` / `pluginDefinition` and renders in a browser. The component test caught a transcript-memo bug (it tracked `custom()` and rebuilt the element on switch); fixed with `untrack`. All gates green: 18 + 4 unit, 2 component, app/plugin `tsc -b`, SDK docs 0 problems. Patch regenerated: 14 files, 524 added lines, applies cleanly to pristine upstream. PR submission and Phases 2–6 remain out of the agreed scope.
- **r3 (2026-11-18):** Completed Phase 2 and Phase 3, and landed the first slice of Phases 4/5. Created `spacegraph-gui-plugin/` with a buildable `gui()` package whose `Plugin.define` contributes `spacegraph.map` + `spacegraph.hybrid` surfaces, a command, a side panel, i18n, a prefs store and a style. `src/model/graph.ts` projects session messages into a SpaceGraph spec and `src/host/graph-canvas.tsx` mounts the real engine through `spacegraphjs/activity`; both surfaces keep the transcript mounted. `bun run build` produces `dist/gui-experimental.cjs` (1.8 MB / 558 KB gzip) with only the four app-provided externals; an onnx alias to an inert stub avoids an otherwise 78 MB bundle from the engine's unused vision path. Added 2 model tests and 2 bundle tests that load the committed bundle through the production `evaluatePluginBundle` loader (all 4 pass); `bun run typecheck` clean. Remaining: full capability port (Phase 4), ported tests + app e2e + screenshots (Phase 5), and fork cleanup / repo extraction / pushes (Phase 6). No PR submitted, no repos created, library repo untouched.
- **r4 (2026-11-18):** Completed Phase 4 step 1. Ported the full pure model from `packages/session-ui/src/graph` into `spacegraph-gui-plugin/src/model/` (99 files incl. fixtures and 41 unit-test files) and the 3 private timeline/message helpers into `src/private/`, rewriting their imports. Added `@spacegraphjs/{adapter,kernel,overlays,search,shared,trace}` plus `strip-ansi` and `@opencode/client` deps so build/typecheck/tests resolve. `src/model/session-spec.ts` now feeds `buildGraph` + `layoutGraph` output to the engine host at `src/host/graph-canvas.tsx`; the bundle grows to 1.93 MB / 575 KB gzip with the same four externals. Ported model tests reproduce the fork's exact 343 pass / 19 fail / 1 error result (also observed from `packages/session-ui`), proving a faithful port. Plugin own tests are 5/5 green; `bun run typecheck` clean; tsconfig excludes `*.test.ts` because the fork's own graph tests carry pre-existing type errors. Remaining: renderer host + GUI integration port (Phase 4), remaining tests + app e2e + screenshots (Phase 5), fork cleanup / repo extraction / pushes (Phase 6).
- **r5 (2026-11-18):** Completed the core of Phase 4 step 2. Ported `packages/session-graph/src/canvas/{buildRenderModel,computeLayout,renderer-registry,sessionGraphAdapter,model-apply,constants}` plus its fixtures into `src/host/canvas/`, rewriting `@opencode/session-ui/graph` imports to `../model`. Added `@spacegraphjs/{renderer,spacegraph-renderer,svg-renderer,cytoscape-renderer}` and `cytoscape` deps. All 90 ported canvas tests pass. `src/host/graph-canvas.tsx` now builds a `RenderModel` from `buildGraph` + `layoutGraph` and mounts it through `mountRenderer` (SpaceGraphJS with Cytoscape fallback), disposing on cleanup; the interim `buildSessionSpec`/`SpaceGraph.create` adapter, its test and the minimal `graph.ts` projection were deleted as dead code. Bundle is 2.48 MB / 750 KB gzip with the same four externals. `bun run test` (2/2), `bun run test:canvas` (90/90) and `bun run typecheck` are green; `bun run test:model` still shows the documented pre-existing 343/19/1 result. Remaining: GUI integration + renderer-host UI port (Phase 4), remaining tests + app e2e + screenshots (Phase 5), fork cleanup / repo extraction / pushes (Phase 6).
- **r6 (2026-11-18):** Started Phase 4 step 3. Ported `options.ts`, `lensGoals.ts` and the full English catalog into `src/plugin/`, and adapted `host-manifest.ts` to drop the core `ConfigFlag` dependency in favour of plugin-owned `GRAPH_OPTION_KEYS` / `graphOptionSet`; added `@spacegraphjs/config`. Its 3 adapted tests pass (`bun run test:plugin`). `src/gui.tsx` now merges the full copy and registers a SettingsPage that lists every manifest axis; the bundle is 2.49 MB / 753 KB gzip with the same four externals. `bun run test` (2/2), `bun run test:canvas` (90/90), `bun run typecheck` are green; `bun run test:model` still shows the documented pre-existing 343/19/1 result. Remaining: the rest of GUI integration (surfaces, model hook, widget host, interactive panel/settings) and renderer-host UI (Phase 4), remaining tests + app e2e + screenshots (Phase 5), fork cleanup / repo extraction / pushes (Phase 6).
- **r7 (2026-11-18):** Added the first renderer-host UI slice and a browser gate. Ported `graph-camera`, `overlay`, `theme`, `node-data`, `provenance`, `cardTemplate`, `card-copy`, `axisLabels` and `buildRenderModelHelpers` into `src/host/ui/` (26 tests pass via `bun run test:ui`); `graph-canvas.tsx` now renders cards through `createCardTemplate` + `createCardCopy(i18n)`. Added `@opencode/ui` as an app-provided external and stubbed it in the bundle test. Removed the empty `packages/plugin/src/gui/solid.js` shadow file that broke module resolution in Bun and the browser. Added `packages/app/component-tests/spacegraph-plugin.{spec,fixture}.tsx`: loads the committed bundle through `pluginDefinition` and checks both surfaces render with the transcript kept mounted; it is a CI gate because this fork's local component harness has pre-existing breakage (stale duplicate harness, dependency-scan failure, missing `SESSION_PANES` export) that fails existing specs identically. Bundle is 2.51 MB / 758 KB gzip; `bun run test`, `test:canvas`, `test:plugin`, `test:ui` and `typecheck` are green. Remaining: GUI integration + renderer-host chrome (Phase 4), remaining tests + screenshots (Phase 5), fork cleanup / repo extraction / pushes (Phase 6).
- **r8 (2026-11-18):** Ported the headless session widget registry (Phase 4 step 4 foundation). `src/host/widget-registry.ts` carries `SESSION_WIDGET_IDS`, `sessionWidgetRequests`, `createSessionWidgetRegistry`, `legacyWidgetRegistry`, `widgetRequestNode` and a new `withWidgetRequests` helper that attaches P3.6 widget tokens to a `RenderModel`; the five widget-prop types live in `src/host/widget-types.ts` so components stay injected. Five ported tests pass via `bun run test:host`; `graph-canvas.tsx` annotates its render model with widget requests. Bundle is 2.51 MB / 759 KB gzip with the same app-provided externals. `bun run test` (2/2), `test:host` (5/5), `test:ui` (26/26), `test:canvas` (90/90), `test:plugin` (3/3) and `typecheck` are green. Remaining: `createSpacegraph` model hook + full prefs/State declarations, the five mounting widget components + `NodeWidgetLayer`, interactive panel/settings and the full `SessionGraph`/`GraphView` chrome (Phase 4); remaining tests + screenshots (Phase 5); fork cleanup / repo extraction / pushes (Phase 6).
- **r9 (2026-11-18):** Ported the GUI-integration declarations and model hook. `src/plugin/declarations.ts` carries the full `State`/`Prefs` schemas, `SpacegraphPreferences`, `DEFAULT_PREFERENCES`, all nine `BUILTIN_LENSES` and a plugin-owned `capabilities` gate set; `src/plugin/export.ts` carries SVG/JSON/HTML map export; `src/plugin/model.ts` carries `createSpacegraph` with lenses, focus, saved queries, notes, pins, time travel, trace/group state and palette actions. Adaptations that keep delivery core-free: core `graph_*` flags → `prefs.capabilities`, the fork-only `server.graph.workspace` RPC dropped, and the ported `buildGraph` + incremental layout positions used instead of the fork's internal incremental builder. `gui.tsx` spreads the declarations definition, creates the model in `setup` and routes the open-map command through `model.select`; the bundle test supplies stub stores. Twelve adapted model-hook tests pass via `bun run test:model-plugin` (`test:plugin` now 15/15). Bundle is 2.53 MB / 765 KB gzip with six app-provided externals (added `solid-js/store`). `bun run test` (2/2), `test:host` (5/5), `test:ui` (26/26), `test:canvas` (90/90), `test:plugin` (15/15), `test:model-plugin` (12/12) and `typecheck` are green; `test:model` still shows the documented pre-existing 343/19/1 result. Remaining: mounting widget components + `NodeWidgetLayer`, interactive panel/settings and the full `SessionGraph`/`GraphView` chrome (Phase 4); remaining tests + screenshots (Phase 5); fork cleanup / repo extraction / pushes (Phase 6).
- **r10 (2026-11-18):** Mounted the node widgets. `src/host/widgets/` now carries `node-widget-data` (4 new contract tests), the five Solid widget components, `TurnMapInlineGraph`/`turnMap`, `NodeWidgetLayer`, `session-widget-components` and the three copied widget stylesheets; `src/plugin/widget-host.ts` binds `createSpacegraph` to the headless registry through the plugin's `widgets` prefs gate. `graph-canvas.tsx` holds the built view and renderer in signals and renders `NodeWidgetLayer` above the canvas; both surfaces pass the routed `screen` and model into the host policy. Widget CSS is contributed through the plugin's single `Style` registration. Bundle is 2.55 MB / 772 KB gzip; `@opencode/ui/button` and `@opencode/ui/text-input` join the app-provided externals, and the bundle test supplies a minimal `window.document` for Solid's module-scope delegated-event registration. `bun run test` (2/2), `test:host` (5/5), `test:ui` (26/26), `test:canvas` (90/90), `test:plugin` (15/15), `test:model-plugin` (12/12), `test:widgets` (4/4) and `typecheck` are green. Remaining: interactive panel/settings and the full `SessionGraph`/`GraphView` chrome (Phase 4); remaining tests + screenshots (Phase 5); fork cleanup / repo extraction / pushes (Phase 6).
- **r11 (2026-11-18):** Ported the interactive side panel and settings page into `src/plugin/` (Phase 4). `panel.tsx` carries the fork's node search → `model.focus` flow, `Windows`/`Inspector` overlays, transcript reveal through `props.screen.transcript.reveal` and the shared host-widget registry against `createSpacegraph`; its body is the already-ported `GraphCanvas` until the `SessionGraph` chrome lands. Added `@spacegraphjs/inspector` and `@spacegraphjs/window-manager` as plugin deps. `settings.tsx` replaces the manifest dump with real `prefs`-backed controls (nine-lens picker, custom-lens save, map/hybrid defaults, density/renderer selects, reduced-motion and node-widget switches) framed by `ctx.ui.SettingsLayout`/`SettingsSection`/`SettingsRow`; `gui.tsx` renders both components and contributes their CSS through the existing single `Style`. No core `graph_*` flag or fork-only RPC is used. Bundle is 2.58 MB / 779 KB gzip with the same app-provided externals; the bundle gate now checks the settings-page registration and shipped panel/settings CSS (3/3). All plugin suites and `typecheck` are green. Remaining: full `SessionGraph`/`GraphView` chrome (Phase 4); remaining tests + screenshots (Phase 5); fork cleanup / repo extraction / pushes (Phase 6).
- **r12 (2026-11-18):** Ported the interactive graph chrome (Phase 4). `src/host/session-graph.tsx` composes `GraphCanvas` with a toolbar, palette, find panel, legend and floating `Inspector` windows; the side panel, map surface and hybrid surface now mount that one host, keeping the transcript mounted. `src/host/chrome.tsx` drives the model's lens/level/layout/depth/arrangement/side setters plus palette, focus, turn-map, follow, time-travel, permalink and export actions; `src/host/chrome-helpers.ts` holds the pure option-cycle and window-raise policy (3 new tests via `test:chrome`). Inspector windows now open from the toolbar or an inspector selection. `GraphCanvas` observes the shared graph memo under `runWithOwner`, so chrome-driven layout changes redraw the renderer. All chrome copy is plugin-owned i18n and no new app module became a bundle external; a palette-surface id bug now selects the registered `spacegraph.map`/`spacegraph.hybrid` ids. Bundle is 2.60 MB / 782 KB gzip. `test` (3/3), `test:chrome` (3/3), `test:plugin` (15/15), `test:model-plugin` (12/12), `test:ui` (26/26), `test:host` (5/5), `test:canvas` (90/90), `test:widgets` (4/4) and `typecheck` are green. Remaining: file-for-file chrome depth (Phase 4); remaining component tests + screenshots (Phase 5); fork cleanup / repo extraction / pushes (Phase 6).
- **r13 (2026-11-18):** Ported the next chrome-depth slice (Phase 4). `src/host/ui/graph-find.tsx` replaces the compact find panel with the fork's three tabs (search/filters/outline), ranked search + saved questions, composable kind/status/domain/quick facets via the ported model, and level/turn scoping; its pure policy is in `find-helpers.ts` (4 tests). `graph-minimap.tsx` ports the renderer-agnostic SVG overview; without a camera seam, pointer input focuses the nearest laid-out node through `minimap-geometry.ts` (3 tests). `graph-a11y.tsx` mounts the library `AccessibilityLayer` over the shared render model with all copy supplied by `ctx.t`. `graph-status-bar.tsx` drives focused-node verbs from `createSpacegraph` using plugin-owned CSS. `comparison.ts`, `window-placement.ts` and `graph-compare.tsx` port the turn/parked comparison and first-placement policy (4 tests), adding a Compare window beside Inspector. All new copy is plugin-owned i18n; no new bundle external, core flag or fork RPC. Bundle is 2.63 MB / 790 KB gzip. `test` (3/3), `test:ui` (37/37), `test:chrome` (3/3), `test:plugin` (15/15), `test:model-plugin` (12/12), `test:host` (5/5), `test:canvas` (90/90), `test:widgets` (4/4) and `typecheck` are green. Remaining: `GraphDetail`/`GraphDiff`, gallery, popover, filesystem windows and their hooks (Phase 4); remaining component tests + screenshots (Phase 5); fork cleanup / repo extraction / pushes (Phase 6).
- **r14 (2026-11-18):** Ported the detail-family chrome (Phase 4). `src/host/ui/graph-detail.tsx` carries the selectable-DOM node record — header, fields, badges, file/subagent sections, input/output, connections, capability-filtered actions and trace verbs — with pure derivation in `detail-helpers.ts` (5 tests) and all copy named in `detail-copy.ts`. The inspector window now renders it instead of `@spacegraphjs/inspector`, so that dependency was dropped. `graph-diff.tsx` ports the library-backed unified-diff view, `graph-filesystem-window.tsx` adds a workspace-tree window kind, `graph-gallery.tsx` renders every layout as a static SVG thumbnail through the ported pipeline, and `graph-popover.tsx` floats the same detail over the canvas. No new bundle external, core flag or fork RPC. Bundle is 2.66 MB / 797 KB gzip. `test` (3/3), `test:ui` (42/42), `test:chrome` (3/3), `test:plugin` (15/15), `test:model-plugin` (12/12), `test:host` (5/5), `test:canvas` (90/90), `test:widgets` (4/4) and `typecheck` are green. Remaining: headless hook parity (Phase 4); remaining component tests + screenshots (Phase 5); fork cleanup / repo extraction / pushes (Phase 6).
- **r15 (2026-11-18):** Completed the headless-hook parity slice (Phase 4). Added `src/host/ui/useGraphDetailMode.ts`, `useGraphViewModel.ts`, `useGraphAnnotations.ts` and `useComparison.ts` (plus four pure-logic test files, 19 new tests): adapted to plugin-owned state, `ctx.t`/`ctx.plural` i18n and the plugin's pure comparison helpers. The chrome's layout/depth buttons, the find panel's results and counts, the status bar's Add-note, the detail's trace/note verbs and the comparison window now run through these hooks; annotation announcements feed the a11y live region. `graph()` now includes note nodes via `withAnnotations`, and `export` no longer applies it twice; the parked comparison uses the unparked live model. Added the missing note/trace i18n keys and a model `setTraceHistory` API. Bundle is 2.66 MB / 799 KB gzip with the same app-provided externals; the bundle gate checks the new i18n keys. `test` (3/3), `test:ui` (61/61), `test:chrome` (3/3), `test:plugin` (15/15), `test:model-plugin` (12/12), `test:host` (5/5), `test:canvas` (90/90), `test:widgets` (4/4) and `typecheck` are green; `test:model` still shows the documented pre-existing 343/19/1 result. Phase 4's exported hooks are done; the fork's `useGraphState`/`useGraphKeyboard`/`GraphWindowManager` stay out by design. Remaining: component tests + screenshots (Phase 5) and fork cleanup / repo extraction / pushes (Phase 6), all requiring explicit sign-off. No PR submitted, no repos created.
- **r16 (2026-11-18):** Added self-contained component coverage in the plugin package (Phase 5). `test/components.test.ts` (3 cases via `bun run test:components`) mounts the committed bundle's SettingsPage under a mock host context and the source `GraphToolbar`/`GraphFind` under a mock model, asserting the settings layout/sections/rows/controls, toolbar controls plus a depth change routed through `useGraphDetailMode`, and the find panel chips/results. Added happy-dom + `@happy-dom/global-registrator` devDeps, a Bun TSX preload (`test/solid-jsx.ts`, `bunfig.toml`) for Solid's hyperscript runtime, and made `bun run test` cover 6/6 across both test files. Triaged the app component gate's local failure: the Storybook dep scan aborts on two missing `session-ui` export specifiers and then on ~20 further missing exports across the fork; the probe was reverted to keep the fork patch minimal. `test` (6/6), `test:components` (3/3), `test:ui` (61/61), `test:chrome` (3/3), `test:plugin` (15/15), `test:model-plugin` (12/12), `test:host` (5/5), `test:canvas` (90/90), `test:widgets` (4/4) and `typecheck` are green. Remaining: screenshots + app graph e2e (blocked by fork harness drift) and Phase 6 cleanup / repo extraction / pushes, all requiring explicit sign-off. No PR submitted, no repos created.
- **r17 (2026-11-18):** Attempted the Phase 5 harness repair with sign-off and established its true scope. Reproduced the component-gate failure from a cold cache on an isolated port: Vite's dep scan first fails on `Missing "./tools/ansi" specifier in "@opencode/session-ui"`; a probe adding the two missing `session-ui/package.json` subpath exports (since reverted) surfaced **60+ `No matching export` errors across 19 files** (`SESSION_PANES`, `createShellFollower`, `session.story-model`, mock `context`/`solid-router` providers and ~20 `tool-renderer.tsx` helpers), rooted in a ~1,006-file version skew between the fork and upstream `dev`. A contained `optimizeDeps.noDiscovery` + explicit `include` change to `storybook/.storybook/main.ts` was tried and reverted when Storybook failed to reach ready within the 120s webServer timeout. Verified the app e2e harness independently: `e2e/graph/widget-behavior.spec.ts` passes 2/2, but GUI plugins load only through the desktop `Bridge` (`plugins.tsx:83`), which the web harness lacks, so the external plugin cannot be seeded there either. Conclusion recorded in §8/§12: plugin screenshots and plugin-enabled app e2e require a desktop/Bridge harness or the upstream sync (Phase 6) — a sign-off decision, not a silent fix. All plugin suites and `typecheck` were re-confirmed green (test 6/6, ui 61, canvas 90, plugin 15, model-plugin 12, host 5, widgets 4, chrome 3, components 3); working tree clean; no PR submitted, no repos created.
- **r18 (2026-11-18):** Synced the fork to upstream `dev` and made the plugin self-contained and visually verified (Phase 5 + Phase 6.1–4). With sign-off, fetched upstream `dev` (advanced to `3dc66ab6e5`), create a safety ref `backup/plugin-r17-pre-sync`, reset the fork branch from the stale 338-commit base to upstream, and reapplied the canonical `docs/spacegraph/upstream-session-surface.patch` (`git apply --check` passes on the new tip). Restored `spacegraph-gui-plugin/` and the SpaceGraph docs from the backup. Upstream's `gui()` no longer externalizes `@opencode/ui/*`: replaced the plugin's `@opencode/ui/context/i18n` / `button` / `text-input` imports with a plugin-owned i18n context seeded from `ctx` (plus a 367-key `ui.sessionGraph.*` catalog ported from the fork UI catalog) and local `Button`/`TextInput` primitives; owned the `WorkspaceSnapshot` types locally after upstream dropped them from `@opencode/client/promise`; made the transcript reveal call optional for the upstream `SessionScreen`; and gave the renderer container a minimum height so Three.js does not mount a 0-height canvas. Rebuilt `dist/gui-experimental.cjs` (2.64 MB). Adapted the app component gate to the new `packages/stories` harness and upstream's `mountSessionSurfaceBundle` seam fixture (added an injectable storage factory and `PluginStyles` so plugin stores and CSS work), and seeded it with the plugin's canonical 13-message fixture. Result: the real browser gate loads the committed bundle through `pluginDefinition` and asserts both surfaces render a real graph with the transcript preserved; screenshots (`spacegraph-map.png`, `spacegraph-hybrid.png`) and videos are captured in `packages/app/component-tests/test-results/`. A follow-up fixed the screenshot quality: the render canvas honored the model's default **overview** level and lanes strategy (previously hardcoded to force/execution), the renderer now fits the graph on mount and via a `ResizeObserver`, and the hybrid surface owns a compact transcript built from session messages so its panel is never empty. Both gallery frames are now legible and correctly framed. Gates green: plugin `test` 6/6, component gate 4/4 (includes the 2 upstream seam tests), plugin `typecheck` and app `typecheck` 0 errors. Remaining: Phase 6.5–6 doc updates (TODO.42 fallback, TODO.41 r18) and the pushes, all requiring explicit sign-off. No PR submitted, no repos created/pushed.
