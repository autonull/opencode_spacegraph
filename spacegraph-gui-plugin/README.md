# @spacegraph/gui-plugin

Third-party OpenCode GUI plugin that owns the session body through the generic
`SessionSurface` registry. It is the delivery vehicle from
`SPACEGRAPH.TODO.43.md`: SpaceGraph lives in a library plus this plugin, so the
OpenCode fork carries no SpaceGraph source.

> Status: Phases 2/3 complete; Phase 4 has the full pure model, render pipeline,
> capability manifest, widget registry, declarations, model hook, mounted node
> widgets, side panel/settings, interactive chrome and the r13/r14 chrome-depth
> slices. The bundle builds, loads through the production `evaluatePluginBundle`
> loader and contributes two surfaces. One `SessionGraph` host carries the
> toolbar/palette, a three-tab full-facet find panel, legend, minimap, an
> accessibility mirror, a selection status bar, a ported `GraphDetail` in the
> inspector window, filesystem/compare windows, a layout gallery and a node
> popover; `GraphCanvas` redraws from the shared graph memo. An app component test
> gates the installed bundle's two surfaces in a real browser. The remaining
> file-for-file parity is the headless chrome hooks; see the plan.

Measured bundle (r14): `dist/gui-experimental.cjs` is 2.66 MB / 797 KB gzip. The
full `spacegraphjs` engine's optional vision path dynamically imports
`onnxruntime-web` (~70 MB); Vite inlines every dynamic import, so the build
aliases that one module to `src/onnx-stub.ts` (the plugin does not use vision).
Without the alias the single-file bundle grows to 78 MB. Revisit if vision is
ever needed in the plugin: publish `@spacegraphjs/*` instead of bundling (a
separate decision per TODO.43 §6).

## Layout

```
package.json          deps: @opencode/plugin (peer), spacegraphjs + three (bundled)
vite.config.ts        plugins: [gui({ entry: "src/gui.tsx" })]
src/gui.tsx           Plugin.define: i18n, prefs store, two surfaces, command, panel, style
src/model/                ported pure session-graph model (99 files)
src/private/              ported private timeline/message helpers used by the model
src/host/                 Solid components mounting the renderer host
src/host/canvas/          ported render-model pipeline + renderer registry (+ 90 tests)
src/host/ui/              ported camera/card/provenance helpers, find, minimap, a11y, status bar,
                          comparison/window placement, detail/diff/filesystem/gallery/popover (+ 42 tests)
src/i18n/                 minimal plugin-owned copy (ctx.t)
src/plugin/               GUI integration: options, lens goals, capability manifest, full copy
dist/gui-experimental.cjs built by `bun run build`
test/                     bundle-load tests
src/model/*.test.ts       ported model unit tests (`bun run test:model`)
src/host/canvas/*.test.ts ported render pipeline tests (`bun run test:canvas`)
src/plugin/*.test.ts      capability manifest tests (`bun run test:plugin`)
```

## Build

```sh
bun install
bun run build      # writes dist/gui-experimental.cjs
bun run test       # bundle-load tests (green gate)
bun run test:model # ported model unit tests
bun run test:canvas # ported render pipeline + renderer tests
bun run test:plugin # capability manifest tests
bun run test:ui     # ported renderer-host UI helpers and chrome policy (42 tests)
bun run test:chrome # toolbar/window policy (3 tests)
bun run test:host   # headless widget registry (5 tests)
bun run test:widgets # node-widget-data contracts (4 tests)
bun run typecheck
```

`test:model` reproduces the fork's existing model-test result exactly: 343 pass,
19 fail, 1 error (3,400 assertions). The same 19 failures and 1 error occur when
running `bun test src/graph` from `packages/session-ui` — they are pre-existing
fork failures, not port regressions. The plugin's own `test` gate stays green.

Browser gate: `packages/app/component-tests/spacegraph-plugin.spec.ts` loads the committed bundle through
`pluginDefinition` and asserts both contributed surfaces render while the transcript stays mounted. It is a CI gate:
this fork's local component harness has pre-existing breakage (a stale duplicate `packages/stories/playwright`
harness, a Storybook dependency-scan failure, and a missing `SESSION_PANES` export in `session-tabs.ts`), so the spec
cannot pass locally yet. Those are fork issues, not plugin regressions.

On this fork the plugin resolves `@opencode/plugin` from TypeScript source. The
build script therefore runs Vite through Bun, and the test script sets
`--conditions=browser` so `solid-js/web` resolves to its client build, matching
the Electron renderer that loads the bundle. A published `@opencode/plugin`
with compiled `.js` output needs neither workaround. The empty
`packages/plugin/src/gui/solid.js` shadow file that broke both resolutions was
removed in r7.

`gui()` keeps OpenCode's modules (`effect`, `@opencode/plugin/gui`,
`solid-js`, `@opencode/ui/*`, `@opencode/session-ui/*`) external — the app
provides its own instances — and bundles `spacegraphjs` together with `three`.
Dynamic imports are inlined because the app loads no second chunk.

## Install

Install this bundle as a third-party GUI plugin through the Extensions UI, or
seed it in the app config. The host assigns the plugin id; surfaces appear as
`spacegraph.map` and `spacegraph.hybrid` in the surface picker. The transcript
element is kept mounted on both surfaces so its virtualizer and scroll position
survive switches.

## Remaining work

- Phase 4: port the remaining headless chrome hooks (`useGraphDetailMode`,
  `useGraphViewModel`, `useGraphAnnotations` and `useComparison` consumers) with
  pure-logic tests. Keep `useGraphState`, `useGraphKeyboard` and
  `GraphWindowManager` out: the plugin-owned model state, shortcut handling and
  three-kind window registry already cover the mounted chrome.
- Phase 5: port component tests that mount the chrome/settings controls and
  regenerate screenshots from the plugin-enabled app; the installed-bundle gate
  is blocked locally by pre-existing fork harness breakage.
- Phase 6: extract this package to its own repo, delete SpaceGraph source from
  the fork, and push the three repos.
