# SPACEGRAPH.TODO.23 — Plugins Only, Full Parity

> **Answer to "can we build this with plugins only?" — Yes.** The existing code ships as an external plugin with **no source rewrite and no feature loss**, via build-time aliases. Remaining work is packaging: **~3 days**, not a port.

---

## 1. Why it works (verified, not assumed)

`gui()` rejects unaliased `@opencode/*` imports. But Vite's internal alias plugin is ordered **before** user `pre` plugins (`vite/dist/node/chunks/dep-*.js`, `resolvePlugins`: `alias({...}), ...prePlugins`). So `resolve.alias` rewrites our imports **before** `gui()` sees them.

Only **four** module IDs need handling; everything else is already legal:

| Import | Sites | Treatment |
|---|---|---|
| `@opencode/session-ui/graph` | 91 | alias → fork source (pure TS; `@opencode/client/promise` imports are **type-only**, erased) |
| `@opencode/session-graph` | 2 | alias → fork source (12,782 lines, unchanged) |
| `@opencode/ui/context/i18n` | 49 | **one shim** (~40 lines): `t`→`ctx.t` (346 uses), `plural`→`ctx.plural` (9), `locale`/`direction`→`ctx.locale` |
| `@opencode/ui/{icon,icon-button,segmented-control}` | 10 | alias → fork source; these are self-contained (solid-js + kobalte + motion + own CSS), so **bundle the real components** — identical pixels |
| `@opencode/client/promise` | 2 | type-only, nothing to do |

Consequences:

- **Zero edits** to `session-ui/src/graph` or `session-graph/src`. No vendoring script, no drift guard, no parity port.
- **Every subsystem ships**: GraphView, toolbar (level/layout/depth/draw/show/time/questions), inspector, windows, search, find, minimap, legend, gallery, equalizer, compare, notes, trace, filesystem window, turn map, status bar, failure progress, export, a11y mirror, keyboard nav, animation, depth modes, notifications, security sanitizing.
- Only **4 files** in the plugin itself change: `renderer.tsx`/`model.ts` get a ~30-line branch so contributions work with or without `ctx.surfaces` (9 call sites).

The one true loss: **the custom Transcript component**, which cannot exist on stock (the host owns the session body). It was a workaround for a hybrid virtualizer bug that no longer occurs.

---

## 2. Why the plan had exploded

I planned a **port** before testing a **build**. Treating 22k lines as something to re-implement added a vendoring script, drift guards, a monorepo, and parity phases — all unnecessary once the alias path is proven. That was my error, not a constraint. The 99% already built stays built.

---

## 3. Remaining work (3 days)

### Day 1 — External build (the only unknown)
- `plugins/gui.tsx` (entry): registers the existing contributions; wraps panels/dialogs in the i18n shim provider.
- `plugins/i18n.ts` shim (~40 lines) + `plugins/config.ts` with the aliases above.
- Build with `gui({ entry: "plugins/gui.tsx" })`; add any further `@opencode/ui/*` alias the build names (expected: 0–2).
- CSS: `import css from "../src/spacegraph.css?inline"` (Tailwind over the plugin + aliased sources, `cssCodeSplit: false`) → `ctx.add(Style, css)`; UI component CSS comes with the aliased sources.
- **Mount the real `GraphView` in a `Panel` on stock web + desktop.** Measure bundle size.
- Exit criterion: stock app renders the full graph UI, correctly styled, ~1 s rebuild reload.

### Day 2 — Contributions without `ctx.surfaces`
- `model.select`/`renderer.tsx`: `ctx.surfaces` when present (reference build), otherwise panel + full-map dialog (stock).
- Panel (side, `wide`), full-map dialog (`ctx.dialogs.open`), turn map dialog, permalinks `#spacegraph:`, hybrid Side/Floating, transcript bridge (`screen.transcript.reveal`), commands/keybinds, settings, per-session store.
- ~150 lines of wiring; the map itself is unchanged.

### Day 3 — Prove, publish, retire the built-in
- Run the capture matrix against the external bundle; every frame must match the reference build (fix, don't re-baseline).
- Verify on stock web + desktop, npm install path.
- Publish the artifact from this repo (`dist/gui-experimental.cjs` + package.json) as `@autonull/opencode-plugin-spacegraph`.
- Archive the seam as `patches/0001-session-surfaces.patch`; delete `spacegraph` from `gui-plugins/src/{main,renderer}.ts`.

### Fast follow (optional)
`session.header` turn ribbon, `ComposerPill` popover mini map, mobile drawer polish, `onIdle` preloads.

---

## 4. Testing

| Gate | Where | Catches | Cost |
|---|---|---|---|
| Build (`gui()`) | CI | An unaliased `@opencode/*` import — names the module | 5 s |
| Bundle-load (Node evaluate against provided modules) | CI | Missing external, bad export shape | 2 s |
| Capture matrix **on the bundle** | this fork | Any visual/interaction difference vs the reference build | `graph:capture --mode=verify` |
| e2e keepers on the bundle | this fork | Panel open, reveal, permalink, export | 2 min |
| Component tests (built-in) | this fork | Host contracts while developing in the HMR loop | 35 s |

The capture matrix is the parity gate: a differing frame is a regression.

---

## 5. Dev loop

| Loop | Command | Feedback |
|---|---|---|
| UI with full HMR | fork's built-in plugin, `bun run dev:live` | instant, state preserved |
| UI on stock | `vite build --watch` + stock app with a local plugin dir | ~1 s; the host re-evaluates the bundle (hash revision), state lost |
| Unit | `bun test --watch` | instant |

No HMR for the external bundle itself (`gui()` is a lib build; the host reloads the whole plugin). Develop in the fork, ship the bundle.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| An `@opencode/ui/*` module drags in context-bound code | The build fails and names it; alias or shim that module |
| Bundle size: `inlineDynamicImports` forbids code splitting (three + cytoscape + svg in one CJS, ~1.5–2 MB raw) | Measured on Day 1. If startup cost is unacceptable, decide with data — do not pre-emptively drop a renderer |
| CSS: utilities used by aliased sources | Tailwind scans `plugins/` + `packages/session-graph/src` + `packages/ui/src`; colors only via `var(--v2-*)` |
| Upstream SDK change | `git merge upstream/dev` before Day 1; re-read `modules.ts` |

---

## 7. Definition of done

1. Stock web + desktop load the plugin from npm; no fork for users.
2. Capture matrix on the bundle matches the reference build; all subsystems present.
3. Build + bundle-load gates green.
4. Seam archived as a patch; built-in registration deleted.
5. **No upstream PR filed, none required.**

---

## 8. Principles

| # | Decision |
|---|---|
| P1 | No functionality sacrificed; the alias seam preserves all of `session-graph` and `session-ui` |
| P2 | No source rewrite, no vendored copy, no drift to guard |
| P3 | Packaging is the work; features are done |
| P4 | The capture matrix on the bundle proves parity |
| P5 | The built-in plugin remains the HMR development target |
| P6 | The seam patch is reference-build-only |
