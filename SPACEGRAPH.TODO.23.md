# SPACEGRAPH.TODO.23 — Plugins Only, Full Parity

> **Status: usable.** The external bundle builds today (measured). Two open questions remain, each with a check. Work left is packaging: **~3 days**. Read §1 before touching anything.

---

## 0. Context for a fresh reader

| Thing | Where |
|---|---|
| The graph feature, as a **built-in GUI plugin** | `packages/gui-plugins/src/spacegraph/` (`renderer.tsx`, `model.ts`, `map-surface.tsx`, `hybrid-surface.tsx`, `full-map.tsx`, `panel.tsx`, `Inspector.tsx`, `Windows.tsx`, `settings.tsx`, `i18n/en.ts`) |
| Graph UI (12,782 lines, unchanged) | `packages/session-graph/src/` (`ui/` 12,453, `canvas/` 1,384, `contract/` 154) |
| Graph model (9,284 lines, unchanged) | `packages/session-ui/src/graph/` |
| The GUI plugin SDK | `packages/plugin/src/gui/` — `vite.ts` (`gui()` build), `modules.ts` (allowlist), `registries.ts`, `host-apis.ts` |
| Reference build extras (ours) | `packages/app/src/runtime/plugin/surfaces.ts`, `packages/app/src/session/surface.tsx`, `packages/app/src/session/screen.tsx` |
| Tests | `packages/app/component-tests/plugin-host.spec.ts` (33), `packages/session-graph/component-tests/` (49), capture matrix |
| Base commit | `upstream/dev` @ `6007274795`, merged (`git rev-list --left-right --count HEAD...upstream/dev` → `402 0`) |

Goal: ship the same feature as an **external plugin on stock OpenCode**. No upstream PR, no fork for users, no source rewrite, no feature loss beyond what the host makes impossible (§4).

---

## 1. Measured facts — do not re-litigate

A real `gui()` build of the unmodified sources with only `resolve.alias`:

| Variant | Raw | gzip |
|---|---|---|
| Naive build (no stubs) | 78.7 MB | 21.3 MB — `inlineDynamicImports` inlined spacegraphjs **vision/ONNX** (two 37.8 MB chunks) |
| + `onnxruntime-web` stub | 2.78 MB | 839 KB |
| **+ Cytoscape stub (chosen)** | **2.32 MB** | **684 KB** |

- 606 modules transform; **zero edits** to `session-graph` or `session-ui`.
- The artifact requires exactly the allowlist: `solid-js`, `solid-js/web`, `solid-js/store`, `@opencode/plugin/gui`, `effect`.
- CSS is emitted separately (8.3 kB) → must ship through `ctx.add(Style, css)`.
- Vite's internal `alias` plugin runs before user `pre` plugins, so aliases bypass `gui()`'s `@opencode/*` rejection.
- **Gotcha:** running `vite build` through Node fails to load the config (`@opencode/plugin/gui/vite` imports `./modules.js`, which only exists as `.ts`). Run Vite **through Bun**: `bun node_modules/.bun/vite@7.3.7*/node_modules/vite/bin/vite.js build --config <config>`.

Decisions already made (do not reopen without a measurement):
| Question | Decision | Why |
|---|---|---|
| Vendor `session-graph`/`session-ui`? | **No** | Aliases need no source copy, no drift guard |
| Port GraphView to `ctx.ui`? | **No** | Nothing is lost; the real UI bundles |
| Upstream PR for `SessionSurface`? | **No** | Stock APIs suffice |
| Cytoscape renderer | **Excluded from the external build** | Saves 155 KB gzip; SpaceGraph renderer is the product (§3) |
| ONNX / vision | **Excluded** | Unreachable from the graph |
| Custom Transcript component | **Cannot ship** | Host owns the session body |
| Stacked hybrid arrangement | **Cannot ship** | Needs the body |
| Separate monorepo before release | **No** | Build and publish from this repo; extract later if wanted |

---

## 2. Build recipe (copy verbatim)

Files at `plugins/` (repo root):

1. **`plugins/gui.tsx`** — bundle entry. Default export `Plugin.define({ setup })`; setup registers contributions only (`Panel`, `Command`, `MenuItem`, `SettingsPage`, `Slot`, `ComposerPill`, `Style`).
2. **`plugins/i18n.ts`** — shim for `@opencode/ui/context/i18n`: `t → ctx.t`, `plural → ctx.plural`, `locale/direction → ctx.locale`, plus `tDynamic`/`list`/`listSeparator` fallbacks. Provided through a tiny Solid context set at each render root (panel render, dialog render).
3. **`plugins/stubs/onnx.ts`**, **`plugins/stubs/cytoscape.ts`** — throw-on-use stubs (as measured).
4. **`plugins/vite.config.ts`**:

```ts
import path from "node:path"
import { defineConfig } from "vite"
import { gui } from "@opencode/plugin/gui/vite"

const repo = path.resolve(import.meta.dirname, "../..")
const here = import.meta.dirname
const at = (...parts: string[]) => path.join(repo, ...parts)
const exact = (name: string, file: string) => ({ find: new RegExp(`^${name}$`), replacement: at(file) })

export default defineConfig({
  root: repo,
  resolve: {
    alias: [
      exact("spacegraphjs", "spacegraphjs/src/index.ts"),
      exact("spacegraphjs/control", "spacegraphjs/src/control/index.ts"),
      exact("spacegraphjs/a11y", "spacegraphjs/src/a11y/index.ts"),
      exact("spacegraphjs/navigation", "spacegraphjs/src/navigation/index.ts"),
      exact("spacegraphjs/overlays", "spacegraphjs/src/overlays/index.ts"),
      exact("spacegraphjs/levels", "spacegraphjs/src/levels/index.ts"),
      exact("spacegraphjs/zoom", "spacegraphjs/src/zoom/index.ts"),
      exact("spacegraphjs/utils", "spacegraphjs/src/utils/index.ts"),
      exact("@opencode/session-graph", "packages/session-graph/src/index.ts"),
      exact("@opencode/session-ui/graph", "packages/session-ui/src/graph/index.ts"),
      exact("@opencode/ui/icon", "packages/ui/src/icons/icon/icon.tsx"),
      exact("@opencode/ui/icon-button", "packages/ui/src/actions/icon-button/icon-button.tsx"),
      exact("@opencode/ui/segmented-control", "packages/ui/src/navigation/segmented-control/segmented-control.tsx"),
      { find: /^@opencode\/ui\/context\/i18n$/, replacement: path.join(here, "i18n.ts") },
      { find: /^onnxruntime-web.*$/, replacement: path.join(here, "stubs/onnx.ts") },
      { find: /^@spacegraphjs\/cytoscape-renderer$/, replacement: path.join(here, "stubs/cytoscape.ts") },
    ],
  },
  plugins: [gui({ entry: path.join(here, "gui.tsx"), outFile: path.join(here, "dist/gui-experimental.cjs") })],
})
```

5. **`plugins/style.css`** — Tailwind entry with `@source` for `plugins/`, `packages/session-graph/src`, `packages/ui/src`; compile to a string and `ctx.add(Style, css)`. Colors only via `var(--v2-*)` / theme tokens.
6. **`plugins/package.json`** — name `@autonull/opencode-plugin-spacegraph`, `exports: { ".": …, "./gui-experimental": "./dist/gui-experimental.cjs" }`, `peerDependencies: { "@opencode/plugin": "*", "spacegraphjs": ">=8.5" }`.

Build: `bun plugins/build.ts` (wraps the Bun-run Vite command above).

---

## 3. Remaining work

### Day 1 — Mount in a stock app (open question C1)
| # | Task | Done when |
|---|---|---|
| 1.1 | `plugins/` scaffold: entry, i18n shim, stubs, config, build script | `dist/gui-experimental.cjs` builds at ≤700 KB gzip |
| 1.2 | Panel contribution rendering the **real `GraphView`** with the vendored model | Panel opens on a stock session |
| 1.3 | Load as a **local plugin** (`.opencode/plugins/` or a config path) on stock **web and desktop** | Graph renders, pans, zooms, selects; CSS applied |
| 1.4 | Measure load + first interaction; record the numbers here | C2 answered (accept 684 KB or apply a targeted cut) |

Do not proceed to Day 2 until 1.3 passes; if it cannot pass, report the exact blocker before writing more code.

### Day 2 — Contributions without `ctx.surfaces` (open question C3, low risk)
| # | Task | Files |
|---|---|---|
| 2.1 | Branch on surface support: `ctx.surfaces` when present, else panel/dialog | `renderer.tsx`, `model.ts` (9 call sites, 4 files) |
| 2.2 | Full map dialog (`ctx.dialogs.open`), turn map dialog | `full-map.tsx`, `turn-map-layer.tsx` |
| 2.3 | Hybrid: Side (wide panel) + Floating (dialog) | `hybrid-surface.tsx` |
| 2.4 | Permalinks `#spacegraph:<layout>:<node>` → open dialog + frame | `renderer.tsx` |
| 2.5 | Commands/keybinds (`mod+shift+m`, `mod+shift+g`, `mod+t`), settings page, `Store.session` | `renderer.tsx`, `settings.tsx` |
| 2.6 | Transcript bridge `screen.transcript.reveal` | `model.ts` |

### Day 3 — Parity, publish, retire the built-in
| # | Task | Done when |
|---|---|---|
| 3.1 | Capture matrix **on the bundle** | Every frame matches the reference build |
| 3.2 | e2e keepers on the bundle (panel open, reveal, permalink, export) | green |
| 3.3 | Publish `@autonull/opencode-plugin-spacegraph` | installs and runs from npm on web + desktop |
| 3.4 | Archive seam: `patches/0001-session-surfaces.patch` + apply/revert scripts | fork reproducible |
| 3.5 | Delete `spacegraph` from `gui-plugins/src/{main,renderer}.ts` | `bun run check` green |

### Later (not blocking release)
`session.header` turn ribbon · `ComposerPill` popover mini map · mobile drawer polish · `onIdle` preloads · optional Cytoscape build variant (one alias).

---

## 4. Functional scope

Ships: GraphView; toolbar (level/layout/depth/draw/show/time/questions); inspector; detail; windows; search; find; minimap; legend; gallery; equalizer; compare; notes; trace overlay; filesystem window; turn map; status bar; failure progress; export SVG/JSON/HTML; a11y mirror; keyboard nav; 2D/3D/depth modes; sanitizing.

Not shipped, with reasons:
- **Custom Transcript component** — host owns the session body; it existed to work around a hybrid virtualizer bug that no longer occurs.
- **Stacked hybrid** — needs the body. Side and Floating remain.
- **Cytoscape renderer** — 2D Canvas fallback for WebGL-less machines. Excluded to save 155 KB gzip. If a WebGL failure occurs, `mountRenderer` falls back to Cytoscape, which throws here and surfaces the existing error state. Restore with one alias if a user reports it.

---

## 5. Testing

| Gate | Where | Catches | Cost |
|---|---|---|---|
| Build (`gui()`) | CI | Unaliased `@opencode/*` import (error names the module) | 5 s |
| Artifact manifest | CI | Requires a module outside the allowlist | 1 s |
| Capture matrix **on the bundle** | this fork | Any visual/interaction regression vs the reference build | `graph:capture --mode=verify` |
| e2e keepers on the bundle | this fork | Panel open, reveal, permalink, export | 2 min |
| Component tests (built-in) | this fork | Host lifetime contracts while developing in HMR | 35 s |

Parity oracle: the capture matrix on the bundle. A differing frame is a bug; never re-baseline.

---

## 6. Efficiency rules

- **Build and publish from this repo.** No monorepo, no extraction, no second harness until after release.
- **Develop UI in the built-in (full HMR); build the bundle to verify.** `bun run dev:live` for iteration; `bun plugins/build.ts` for truth.
- **One checkpoint per day**, each with a pass criterion; stop and report rather than extending scope.
- **Defer everything not on Day 1–3.** Ambient surfaces, mobile polish, extra renderers.
- **Never port or copy graph code.** If a build error appears, add an alias/stub — the error names the module.
- **One source of truth for features**: `packages/gui-plugins/src/spacegraph/` stays the implementation; the bundle is a packaging artifact of it.

---

## 7. Risks

| Risk | Status | Mitigation |
|---|---|---|
| Alias seam insufficient | ✅ closed | Spike built 606 modules with zero source edits |
| ONNX/vision bloat | ✅ closed | Stub; unreachable from the graph |
| Bundle size | ✅ measured 684 KB gzip | Accept or apply a targeted cut (§3 1.4) |
| Stock mount / CSS | ⏳ open (C1) | Day 1; stop and report if it fails |
| `ctx.surfaces` branch | ⏳ open (C3) | 9 call sites, small |
| Upstream SDK change | routine | `git merge upstream/dev`, rebuild |

---

## 8. Definition of done

1. Stock web + desktop load the plugin from npm; no fork for users.
2. Capture matrix on the bundle matches the reference build.
3. Build + manifest gates green.
4. Seam archived as a patch; built-in registration deleted.
5. No upstream PR filed, none required.
