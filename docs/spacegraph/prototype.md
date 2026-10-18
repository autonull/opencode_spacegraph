# SpaceGraph prototype — running notes

Companion to `SPACEGRAPH.md` (design) and `SPACEGRAPH.TODO.1.md` (plan). This file accumulates the tested
state, measurements, and open issues that the plan's `R7.2` will turn into the final write-up.

## Tested revisions

| Repository | Revision | Notes |
|---|---|---|
| OpenCode (`opencode` monorepo) | `fd2c0454ea` (base) + the source-link/spike commit | Branch `dev`; no `session-graph` branch, per the Phase 0 restart note |
| SpaceGraphJS (`spacegraphjs`, sibling repo, gitignored here) | `cac6374` | Self-imports resolved, `src` entry points exposed, `./activity` types condition; chrome opt-in (L1.3) and render/theme plumbing (L1.4) |

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
- The four contract packages in the plan (`@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer`,
  `@spacegraphjs/cytoscape-renderer`, `@spacegraphjs/svg-renderer`) do not exist yet; they are Phase 1
  deliverables (L1.19–L1.21a). P0.3 therefore links the core only. Add the rest to `workspaces.packages`
  and to `packages/session-graph` as Phase 1 creates them.

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
- Remaining: theming beyond `background`, `projection` pass-through (L1.12), a `plugins` option, and the
  light/dark screenshot check via the L1.18 demo page.

## P0.7 / P0.8 — not started

Both need Phase 1 packages: the Cytoscape spike (P0.7) needs `@spacegraphjs/cytoscape-renderer` (L1.21) and
the contract smoke test (P0.8) needs `@spacegraphjs/renderer` (L1.19). Neither package exists yet. Phase 0
exit gate 0 (both renderers) is therefore not satisfiable without pulling Phase 1 packaging forward.
