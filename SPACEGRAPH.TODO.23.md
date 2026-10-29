# SPACEGRAPH.TODO.23 — Plugins Only, Full Parity (measured)

> **Can we ship this with plugins only? Yes — and it has now been built, not argued.** An external bundle of the *unmodified* `session-graph` + `session-ui` sources with `GraphView` mounted builds today. No source edits, no fork for users, no upstream PR.

---

## 1. Measured facts (spike run 2026-10-29)

A real `vite build` with `gui()` and nothing but `resolve.alias`:

| Measurement | Result |
|---|---|
| Build | ✅ **606 modules**, no source edits to `session-graph` or `session-ui` |
| Aliases needed | `@opencode/session-ui/graph`, `@opencode/session-graph`, `@opencode/ui/{icon,icon-button,segmented-control}` → fork sources; `@opencode/ui/context/i18n` → 40-line shim |
| Provided modules required by the artifact | `solid-js`, `solid-js/web`, `solid-js/store`, `@opencode/plugin/gui`, `effect` — **exactly the allowlist** |
| Artifact size | **2.78 MB raw / 839 KB gzip** |
| CSS | 8.33 kB emitted separately → must ship via `ctx.add(Style, css)` |
| Vanilla attempt first | 78.7 MB / 21.3 MB gzip — because `gui()` sets `inlineDynamicImports: true`, which inlined spacegraphjs's **ONNX vision runtime** (two 37.8 MB chunks) |
| After stubbing `onnxruntime-web` | 2.78 MB — vision is unreachable from the graph, so **no graph functionality is lost** |

Vite's alias plugin runs before user `pre` plugins (`resolvePlugins`: `alias({...}), ...prePlugins`), which is why zero source changes are needed.

### What still has to be proven (two things, both measurable)

| # | Check | Pass criterion |
|---|---|---|
| C1 | Mount the bundle in a **stock** app (web + desktop) | Panel shows the real `GraphView`, styled, interactive |
| C2 | Is 839 KB gzip acceptable at plugin-load time? | Load/interaction timing on a stock app; if not, the fix is targeted (e.g. ship one renderer), decided on data |

Everything else — every subsystem, every interaction — rides in the built artifact already.

---

## 2. Why the plan kept moving (and how that stops)

Each earlier revision was a *reading* of the source, not a *run*. Four rewrites came from four guesses: "lean UI", "vendor 22k lines", "13-day port", "monorepo". The spike replaced guesses with numbers in ~40 minutes.

**Convergence rule from here on:** a claim enters this plan only with a measurement or a passing check. The design is considered converged when C1 passes and the capture matrix on the bundle matches the reference build; until then, treat the plan as a hypothesis with a named open question.

---

## 3. Remaining work

### Day 1 — Prove C1 (the only real unknown)
- Add `plugins/gui.tsx` (entry) + `plugins/i18n.ts` (shim) + `plugins/vite.config.ts` (the measured alias set).
- Ship CSS: Tailwind over `plugins/`, `packages/session-graph/src`, `packages/ui/src` → one string via `ctx.add(Style, css)`.
- Register a `Panel` rendering the real `GraphView`; load as a **local plugin** on stock web + desktop.
- Measure C2 (load + interaction timing).

### Day 2 — Contributions without `ctx.surfaces`
- `renderer.tsx` / `model.ts` (9 call sites, 4 files): use `ctx.surfaces` when present (reference build), otherwise panel + `ctx.dialogs.open` full map.
- Full map dialog, turn map dialog, permalinks `#spacegraph:`, hybrid Side/Floating, transcript bridge (`screen.transcript.reveal`), commands/keybinds, settings, `Store.session`.

### Day 3 — Parity proof, publish, retire the built-in
- Capture matrix **on the bundle** vs the reference build; a differing frame is a bug, not a re-baseline.
- Publish `@autonull/opencode-plugin-spacegraph` from this repo (`dist/gui-experimental.cjs` + manifest).
- Archive the seam as `patches/0001-session-surfaces.patch`; delete `spacegraph` from `gui-plugins/src/{main,renderer}.ts`.

### Fast follow
`session.header` turn ribbon, `ComposerPill` popover mini map, mobile drawer polish, `onIdle` preloads.

---

## 4. Functional scope

Everything ships: GraphView, toolbar (level/layout/depth/draw/show/time/questions), inspector, detail, windows, search, find, minimap, legend, gallery, equalizer, compare, notes, trace overlay, filesystem window, turn map, status bar, failure progress, export SVG/JSON/HTML, a11y mirror, keyboard nav, 2D/3D/depth modes, both renderers, sanitizing.

Not reproducible on stock:
- **Custom Transcript component** — the host owns the session body. It existed to work around a hybrid virtualizer measurement bug that no longer occurs.
- **Stacked hybrid arrangement** — needs the body. Side (wide panel) and Floating (dialog) remain.

---

## 5. Testing

| Gate | Where | Catches | Cost |
|---|---|---|---|
| Build (`gui()`) | CI | An unaliased `@opencode/*` import — names the module | 5 s |
| Artifact manifest (requires only allowlisted modules) | CI | Accidental app import | 1 s |
| Capture matrix **on the bundle** | this fork | Any visual/interaction regression vs the reference build | `graph:capture --mode=verify` |
| e2e keepers on the bundle | this fork | Panel open, reveal, permalink, export | 2 min |
| Component tests (built-in) | this fork | Host lifetime contracts while developing in the HMR loop | 35 s |

---

## 6. Dev loop

| Loop | Command | Feedback |
|---|---|---|
| UI with full HMR | fork's built-in plugin, `bun run dev:live` | instant, state preserved |
| UI on stock | `vite build --watch` + stock app with a local plugin dir | ~1 s; the host re-evaluates the changed bundle, state lost |
| Unit | `bun test --watch` | instant |

---

## 7. Risks

| Risk | Mitigation | Status |
|---|---|---|
| Alias seam insufficient | Spike built 606 modules with zero source edits | ✅ closed |
| ONNX/vision bloat | Stubbed; unreachable from the graph | ✅ closed |
| Bundle size (839 KB gzip) | C2 measurement; targeted fix if needed | open, measured |
| Stock mount / CSS | C1 on web + desktop | open |
| Upstream SDK change | `git merge upstream/dev`; re-run the spike build | routine |

---

## 8. Definition of done

1. Stock web + desktop load the plugin from npm; no fork for users.
2. Capture matrix on the bundle matches the reference build.
3. Build + manifest gates green.
4. Seam archived as a patch; built-in registration deleted.
5. No upstream PR filed, none required.

---

## 9. Principles

| # | Decision |
|---|---|
| P1 | No source rewrite, no vendored copy, no drift to guard — the alias seam preserves all code |
| P2 | Packaging is the work; features are done |
| P3 | Claims require measurements; the capture matrix on the bundle is the parity oracle |
| P4 | The built-in plugin remains the HMR development target |
| P5 | The seam patch is reference-build-only |
