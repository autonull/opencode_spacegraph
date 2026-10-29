# SPACEGRAPH.TODO.24 — Artifact-level tests, one setup, packaging cleanup

> **Status: replaces TODO.23's Day 3.** TODO.23's bundle, no-surface fallbacks, seam archive and first mount keeper are done. This file corrects three trajectory errors and removes the duplication they left behind. Phases A–C are the work; D is release-only and deferred.

## Progress (2026-10-29)

| Phase | State | Evidence |
|---|---|---|
| A1 bundle through `pluginDefinition` | ✅ done | `plugin-spacegraph.spec.ts` reads `dist/gui-experimental.cjs`; fixture imports no plugin source |
| A2 freshness | ✅ done | spec builds unless `GRAPH_CAPTURE_SKIP_BUILD=1`; `bundle.test.ts` builds once before its tests |
| A3 Panel + dialog frames | ✅ done | panel mounts `${id}:map`; no-surface dialog opens the hybrid fallback |
| A4 one capture command | ✅ done | `bun run graph:capture --mode=bundle`; verify includes bundle frames and duplicate check |
| A5 manifest gate | ✅ done | build once, require allowlist, `evaluatePluginBundle` declarations |
| B1 move package | ✅ done | `packages/plugins/spacegraph`; `plugins` removed from root workspaces |
| B2 build script | ✅ done | resolves the local Vite binary; deletes the stray CSS after build |
| B3 typecheck inclusion | ✅ done | `bun typecheck` in the package and the repo turbo task |
| C1 one renderer | ✅ done | built-in `renderer.tsx` only adds the idle preload; external owns commands/surfaces/settings/menu; binds and `search` unified |
| C2 host transcript | ✅ done | `HybridSurface` renders the host `transcript`; `transcript.tsx` deleted; `MapSurface` prop dropped |
| C3 shared turn map | ✅ done | `TurnMapBody` serves the overlay layer and dialog |
| C4 small unifications | ✅ done | one `DEPTH_MODES`, `SpacegraphModel`, no `surfaces!` |
| C5 seam archive | ✅ done | `docs/spacegraph/seam/`; `patches/` holds dependency patches only |
| D1–D3 release | ⏸ deferred | publishing is deferred. The package is publishable and locally install-verified, and the built-in stays until a real install exists |
| Verification pass (2026-10-29) | ✅ done | fixed the dialog fixture (getter-only `ctx.surfaces`); 3/3 artifact frames pass; baselines unchanged |

**Remaining work:** none in A–C. Only D1–D3 remain, and they are deferred until publishing resumes; the built-in registration stays meanwhile.

**Verification run:** `bun install --frozen-lockfile` (no changes), `bun run graph:capture --mode=verify` (3/3 frames), `bun run graph:capture --mode=bundle` (3/3 frames), `bun run test` in `packages/plugins/spacegraph` (2 pass), `bun typecheck` in `packages/gui-plugins`, `packages/plugins/spacegraph` and `packages/app`, and scoped `lint:changed` on the files this plan created or edited.

**Deviations / notes for the remaining work**
- The bundle now defines `process.env.NODE_ENV` for browser libraries such as motion; without it the panel path threw `process is not defined`.
- `bundle.test.ts` builds once at module load, not once per test, so the 5 s per-test budget is not spent on Vite.
- `mountSessionRegion` gained an optional `tab` input (default `main`) and a `run(command)` helper; the session object also exposes `status()`.
- The host defines `ctx.surfaces` as a getter-only property, so a stock-host fixture cannot assign `undefined` to it. The dialog fixture now hides `surfaces` with a `Proxy`; mutating the context aborted setup and left the `hybrid` command unregistered.
- Repository-wide `bun run check` / `lint:changed` still report pre-existing fork findings. Treat only the files this plan touched as the gate until those are addressed separately.
- D is deferred. The built-in registration stays; when publishing resumes, install in a scratch app, verify Panel on web and desktop, then retire the built-in and decide the thin wrapper's lifetime.

## 0. Why this file

TODO.23 is accurate about the alias seam and the measured bundle, but three of its assumptions no longer hold:

| TODO.23 says | Reality | Correction |
|---|---|---|
| §5 "Capture matrix **on the bundle**" is the parity oracle | The keeper mounts the **source** setup (`@opencode/gui-plugins/spacegraph/external`); the bundle is only shape-checked | Load `dist/gui-experimental.cjs` through the production loader `pluginDefinition` and screenshot that |
| Day 3 3.5 "delete the built-in → `bun run check` green" | `bun run check` already fails on hundreds of pre-existing fork findings vs `upstream/dev` | Use a scoped gate: touched-package typecheck + `lint:changed` + bundle/mount keepers |
| The stock path is the surface | Stock hosts have no `ctx.surfaces`; the default is the side **Panel** | Add a Panel frame; keep the surface frame as the fork/reference path |

Two structural costs were paid to get here and should be repaid now:

- `plugins/` is a root workspace exception added to `package.json`; the repo already has `packages/plugins/*`.
- `plugins/build.ts` discovers Vite through a `node_modules/.bun/vite@7.*` glob because the package sits outside the normal resolution root.

## 1. Decisions (do not reopen without a measurement)

| Question | Decision |
|---|---|
| Where does the external setup live? | `packages/gui-plugins/src/spacegraph/external/` — one implementation, imported by the built-in and the bundle |
| How do tests load the artifact? | `dist/gui-experimental.cjs` through `pluginDefinition(id, code)` from `packages/app/src/runtime/plugin/module.ts` |
| Where does the plugin package live? | `packages/plugins/spacegraph/` (already a workspace glob) |
| Screenshot command | Extend `script/capture-graph-demo.ts`; one command, one baseline directory |
| Seam patch | Reference-only, moved out of `patches/`; never on the release critical path |
| Retire the built-in | Only after the npm install path is verified, not after a local mount |

## 2. Phase A — Make the test loop artifact-level (P0)

The loop must be fast and must test what ships. Current cost: bundle build ~6 s, one component mount ~1–2 s warm, one cold story server ~5–7 s.

### A1. Load the bundle through `pluginDefinition`
- **Files:** `packages/app/component-tests/plugin-spacegraph.fixture.tsx`, `plugin-spacegraph.spec.ts`.
- Read `packages/plugins/spacegraph/dist/gui-experimental.cjs` in the Playwright spec (Node), pass the code string into the page, and call `pluginDefinition("spacegraph-external", code)`.
- Mount the resulting `Entry` with `mountBuiltInSurface`; remove the static imports of `@opencode/gui-plugins/spacegraph/external` from the fixture.
- **Done when:** deleting `dist/` or breaking the bundle fails the screenshot test; the fixture imports no plugin source.

### A2. Freshness
- The spec builds before mounting unless `GRAPH_CAPTURE_SKIP_BUILD=1` is set (the capture script sets it after its own build).
- Remove the "build only if `dist` is missing" branch from `packages/plugins/spacegraph/bundle.test.ts`; always build there too, or make the whole evaluation test live in the app side and keep only the manifest regex in the package.
- **Done when:** a source edit without a rebuild cannot pass a bundle test.

### A3. Cover the stock path (Panel) and a dialog
- Add `mountSpacegraphPanel(code)` using `mountSessionRegion`, selecting `${entry.id}:map`.
- `mountSessionRegion` currently assumes every panel's stored tab is `main`; add an optional `tabs` input (default `${plugin}:main`) or pass the real tab id. Do not rename the map tab just to satisfy the fixture.
- Frames: panel (stock path), map surface (reference path), one dialog (turn map or map fallback).
- **Done when:** the panel frame fails if `Panel.list`/`render` regress; the dialog frame fails if the no-surface fallback regresses.

### A4. One capture command
- Extend `script/capture-graph-demo.ts` with `--mode=bundle`: build the plugin, run `component-tests/plugin-spacegraph.spec.ts` with `GRAPH_CAPTURE_DIR`, write to `docs/spacegraph/screenshots/bundle/`.
- Include the bundle frames in `--mode=verify` and in the duplicate-frame check.
- **Done when:** `bun run graph:capture --mode=bundle` and `--mode=verify` are the only commands needed; no port or env var is remembered by hand.

### A5. Keep the unit-level manifest gate
- Keep `packages/plugins/spacegraph/bundle.test.ts` for: build → static `require` set ⊆ allowlist → `evaluatePluginBundle` shape assertions. It is 1 s and catches packaging errors before Playwright.
- Do not grow a second module map. If the map grows, export one loader and use it from both; today the 10-line duplication is cheaper than the coupling.

## 3. Phase B — Structure and build (P1)

### B1. Move the package
- `plugins/` → `packages/plugins/spacegraph/`.
- Remove `"plugins"` from root `package.json` workspaces (the existing `"packages/plugins/*"` covers it).
- Update aliases in `vite.config.ts`, `plugins/README.md`, and the component test's dist path.
- **Done when:** `bun install` is clean, no root-level workspace exception remains, and the lockfile diff is only the moved package.

### B2. Build script
- Replace the `.bun` glob with `Bun.resolveSync("vite/bin/vite.js", import.meta.dir)` (or the package's local `vite` binary).
- Delete the stray `dist/opencode-plugin-spacegraph.css` after build (the CSS ships in the JS string through `?inline`). Do not leave two plausible CSS artifacts.
- **Done when:** the script works from a clean install and `dist/` contains only `gui-experimental.cjs`.

### B3. Typecheck inclusion
- Keep `tsconfig.json` in the package; it should inherit the repo's package settings, not restate them.
- **Done when:** `bun typecheck` from `packages/plugins/spacegraph` and the repo's turbo typecheck both include it.

## 4. Phase C — Remove duplication and dead code (P1)

### C1. One renderer
`packages/gui-plugins/src/spacegraph/renderer.tsx` (381 lines) and `external/renderer.tsx` (~380 lines) are two copies of the same registration list. Make the external setup the only one:

- Move the built-in-only `onIdle` preload into a thin `spacegraph/renderer.tsx`:
  ```tsx
  import { onCleanup } from "solid-js"
  import { onIdle } from "@opencode/plugin/gui/builtin"
  import setup from "./external/renderer"
  import type { Plugin } from "@opencode/plugin/gui"
  import type definition from "./index"

  const builtin: Plugin.Setup<typeof definition> = (ctx) => {
    onCleanup(onIdle(() => void import("./panel")))
    setup(ctx)
  }

  export default builtin
  ```
- Keep the **built-in** keybinds in the shared list (`mod+l`, `mod+shift+l`, `mod+a`, `mod+s`, `mod+f`); the external copy invented `mod+shift+k/l/a/s` and dropped the `search` command. Unify on the existing bindings and restore `search`.
- Keep both `#spacegraph:` and legacy `#graph:` permalinks in the shared setup.
- **Done when:** one file owns commands, surfaces, settings and menu; the built-in adds only the preload.

### C2. Hybrid must use the host transcript
`hybrid-surface.tsx` renders the custom `transcript.tsx` instead of the `transcript` element the host passes to a `SessionSurface`. That is both a parity bug and ~100 lines of dead timeline code.

- Change `SessionSurface` render to pass `transcript` into `HybridSurface`.
- Render that element instead of `<Transcript>`.
- Delete `transcript.tsx`.
- Drop the unused `transcript` prop from `MapSurface` (and its stories) or inline `MapSurface` into the renderer.
- **Done when:** hybrid shows the real, virtualized transcript; no custom transcript code remains; existing hybrid frames match.

### C3. Share the turn-map body
`turn-map-layer.tsx` and `external/dialogs.tsx` both build the same `turnSubgraph` list and opener logic. Extract `TurnMapBody` (nodes, empty state, reveal) and use it in both the overlay layer and the dialog.
- **Done when:** one implementation of the `TURN_PREFIX`/opener logic; both frames unchanged.

### C4. Small unifications
- One `DEPTH_MODES` source (currently `spacegraph/index.ts` and `settings.tsx`).
- Use the exported `SpacegraphModel` consistently in panel/dialogs instead of inline structural types.
- Drop any `ctx.surfaces!` non-null assertions by narrowing once:
  ```ts
  const surfaces = () => (ctx as { surfaces?: Surfaces }).surfaces
  ```
  with a `SAFETY:` comment.
- **Done when:** `lint:changed` clean on every touched file.

### C5. Relocate the seam archive
- `patches/0001-session-surfaces.patch` and its scripts live in the dependency-patch directory used by Bun.
- Move them to `docs/spacegraph/seam/` (patch + `apply.sh` + `revert.sh`).
- Mark the archive reference-only in its header; it is not needed to ship the external plugin.
- **Done when:** `patches/` contains only dependency patches and `bun install` is unchanged.

## 5. Phase D — Release and retire (P2, deferred)

**Deferred (2026-10-29).** Publishing is out of scope for now, so D1–D3 stay open and the built-in registration stays.
Do not start D2/D3 from a local mount; the gate is a real published install.

Prepared, not published:
- `private: true` removed; `files` is `["dist", "README.md"]`; `prepack` runs the build.
- The bogus `spacegraphjs` peer was removed. Vite bundles it from `spacegraphjs/src`, and the built artifact requires only `effect`, `@opencode/plugin/gui`, `solid-js`, `solid-js/store` and `solid-js/web`.
- `npm pack` now contains only `dist/gui-experimental.cjs`, `README.md` and `package.json` (659 kB packed).
- A scratch `npm install <tarball>` installed the package and its peer, and the `./gui-experimental` export resolved to `dist/gui-experimental.cjs`.

When publishing resumes:
1. `npm login` with the `@autonull` scope, then `npm publish --access public`.
2. Install `@autonull/opencode-plugin-spacegraph` in a scratch opencode app.
3. Verify the stock Panel on web and desktop; only then delete the built-in registration (D2) and decide the wrapper lifetime (D3).

| # | Task | Gate |
|---|---|---|
| D1 | Publish `@autonull/opencode-plugin-spacegraph` | package ready; `npm install` in a scratch app, then the Panel frame works on web and desktop |
| D2 | Delete the built-in registration from `gui-plugins/src/{main,renderer}.ts` | A–C green; scoped typecheck + `lint:changed`; no `bun run check` claim |
| D3 | Keep or drop the thin built-in wrapper | Decide after D1: if users must install the plugin, keep the wrapper for one release to avoid drift, then remove |

## 6. Gates

| Gate | Where | Catches | Cost |
|---|---|---|---|
| Bundle builds | `packages/plugins/spacegraph` | Unaliased `@opencode/*`, missing alias | ~6 s |
| Manifest + declaration | `packages/plugins/spacegraph/bundle.test.ts` | Module outside the allowlist, broken `Plugin.define` | ~1 s |
| Artifact mounts (surface) | `component-tests/plugin-spacegraph.spec.ts` | Bundle/evaluation/render regressions | ~2 s warm |
| Artifact mounts (Panel) | same spec | Stock path: tab listing, panel render | ~2 s warm |
| Dialog fallback | same spec | No-surface map/turn-map path | ~1 s warm |
| Screenshot verify | `bun run graph:capture --mode=verify` | Missing or duplicate frames | ~1 min |
| Scoped static checks | touched packages | Types, lint, dead imports | seconds |

## 7. Risks

| Risk | Mitigation |
|---|---|
| Passing 2.4 MB of CJS through `page.evaluate` is slow | Measure once; if painful, serve the file from the story server and `fetch` it in-page |
| `pluginDefinition` runs `import()` of host modules in the page | It is the production path; a mismatch is a real bug, not a test artifact |
| Moving the package churns `bun.lock` | Move in its own commit; verify `bun install --frozen-lockfile` |
| Unifying renderers changes built-in loading | The wrapper keeps `onIdle`; check first-open timing in `dev:live` |
| Hybrid transcript change affects the virtualizer | Reuse the existing hybrid capture frames; a differing frame is a bug |
| The Panel fixture assumes tab `main` | Add a `tabs` input; do not rename the product tab |

## 8. Sequencing

1. **B1** (move the package) — smallest diff first, so later paths are final.
2. **A1, A2** (bundle loader + freshness) — the loop now tests the artifact.
3. **A3, A4** (panel/dialog frames + capture command) — the loop covers stock and the fallback.
4. **C1–C5** (one renderer, real hybrid, shared turn map, small unifications).
5. **D1–D3** (publish, retire).

Each step ends with its gate; stop and report rather than extending scope.

## 9. Definition of done

1. The screenshot test loads `dist/gui-experimental.cjs` and cannot pass on a stale or broken bundle.
2. It renders the stock Panel path and the no-surface dialog path, not only `ctx.surfaces`.
3. `bun run graph:capture --mode=bundle` and `--mode=verify` are the documented loop; baselines live in `docs/spacegraph/screenshots/bundle/`.
4. One setup owns commands/surfaces/settings/menu; the built-in adds only a preload.
5. Hybrid renders the host transcript; `transcript.tsx` is gone.
6. `plugins/` no longer exists at the repo root; `packages/plugins/spacegraph` is a normal workspace package.
7. `patches/` holds only dependency patches.
8. Publishing is gated on a real install, not a local mount.
