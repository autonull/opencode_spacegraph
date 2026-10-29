# SPACEGRAPH.TODO.23 — Plugin-Only Delivery (Verified, Consolidated)

> **Supersedes SPACEGRAPH.TODO.22.** Verified against `upstream/dev` @ `6007274795` (`anomalyco/opencode`). This fork is now synced to it (`402 0`). The deliverable is an **external GUI plugin on stock OpenCode**; the fork stays as the reference build and test lab. No upstream PR.

---

## 📍 STATE (2026-10-29)

| Item | Status |
|------|--------|
| Branch base | ✅ `upstream/dev` @ `6007274795`, merged; `bun run check` 42/42, session-graph components 49/49, plugin-host 33/33 |
| Built-in plugin (`gui-plugins/src/spacegraph`) | ✅ full feature parity, 26/26 capture frames |
| Human-testing smoke checklist | ✅ done |
| External plugin | ❌ not started — **three blockers found, see below** |
| T2.2 evidence | ⏸️ deferred behind stop rule |

---

## ✅ VERIFICATION — can the current code ship as an external plugin?

**No, not as-is.** The SDK is closed by design, and the build enforces it. Three hard constraints:

| # | Constraint | Evidence | Consequence |
|---|---|---|---|
| V1 | **Fixed module allowlist.** `gui()` (`@opencode/plugin/gui/vite`) externalizes exactly `effect`, `@opencode/plugin/gui`, `@opencode/plugin/gui/main`, `@opencode/plugin/rpc`, `@opencode/schema/rpc`, `@opencode/client`, `@opencode/client/effect`, `solid-js*`, `@opencode/plugin/gui/{file,review,browser}` — and **fails the build** on any other `effect/…`, `solid-js/…` or `@opencode/…` import. | `packages/plugin/src/gui/modules.ts`, `vite.ts` | `@opencode/session-ui/graph`, `@opencode/session-graph`, `@opencode/ui/*` cannot be imported by an external bundle. |
| V2 | **The app's Tailwind scans only `packages/*/src`.** | `packages/ui/src/styles/tailwind/index.css` | An external plugin must ship its own CSS through `ctx.add(Style, css)`; app utility classes are not generated from the bundle. |
| V3 | **No HMR.** `gui()` is a lib build (CJS, `inlineDynamicImports`). A **local** plugin's `./gui-experimental` is watched; its content hash becomes the GUI revision and windows re-evaluate it. | `vite.ts`, `packages/core/src/plugin/module.ts` | Dev loop is `vite build --watch` + automatic GUI reload (~1 s). No preserved state. |

### What that means for our code

| Our dependency | Lines | External-safe? | Disposition |
|---|---|---|---|
| `@opencode/session-ui/graph` (model) | 9,284 / 56 files | Pure TS, only type-imports `@opencode/client/promise` | **Vendor** into `@autonull/spacegraph-model` and publish |
| `@opencode/session-graph` `buildRenderModel` | ~300 | Imports `@spacegraphjs/*` | Vendor |
| `@opencode/session-graph` `exportGraph` | ~60 | same | Vendor |
| `@opencode/session-graph` `GraphView` + `ui/` | **12,453** | `@opencode/ui` (59 sites) + i18n | **Do not port.** Reference build keeps it; the external plugin uses a lean UI |
| `@opencode/ui/context/i18n`, `icon`, `icon-button`, `segmented-control` in our plugin | 4 files | Not provided | Replace with `ctx.t`, `ctx.ui.Icon`, `ctx.ui.IconButton`, `ctx.ui.Menu` |

**Therefore:** the external plugin is **not a copy of the built-in**. It is the built-in's *contributions* (panel, commands, settings, permalinks, export) plus a **lean map UI** built on `ctx.ui.*` and `@spacegraphjs/spacegraph-renderer`, over a vendored model package.

---

## 🧭 DECISION: NO UPSTREAM PR

Only one product capability has no stock equivalent: taking over the session body. Everything else maps onto shipped APIs (`Panel` + `Panel.wide` + `Panel.mobile`, `ctx.dialogs.open`, `Slot` `session.header`, `ComposerPill.menu`, `SettingsPage`, `Command`, `Store.*`, `ctx.system.copy`, `ctx.ui.*`). Upstreaming is optional and unnecessary; no track depends on `anomalyco/opencode`.

---

## 🔍 FEATURE SET (stock)

| Feature | Stock implementation |
|---|---|
| Session Map panel | `Panel(region: "side", wide: true)` — SVG overview + inspector |
| Full map | `ctx.dialogs.open` full-bleed, `@spacegraphjs/spacegraph-renderer` canvas |
| Hybrid | **Side** (wide panel) + **Floating** (dialog). **Stacked dropped** — needs the body |
| Turn map | Dialog over the transcript (scroll preserved) |
| Ambient ribbon | `Slot` `session.header` — fixed-height phase strip, no row work |
| Composer pill | `ComposerPill` + `menu` popover → mini map → "Open full map" |
| Permalinks | `#spacegraph:<layout>:<node>` → open dialog + frame |
| Inspector / search / export / settings / per-session state | `ctx.ui.*`, vendored model, `SettingsPage`, `Store.session` |
| Custom Transcript, composer inset, inline rows, cross-session | **Dropped** (host owns body; upstream forbids row work; no `SessionStore` contract) |

---

## 🏗️ REPOSITORIES

| Repo | Role | Ships |
|---|---|---|
| `autonull/opencode-plugin-spacegraph` (new) | Plugin + vendored model package | npm: `@autonull/opencode-plugin-spacegraph`, `@autonull/spacegraph-model` |
| `autonull/opencode_spacegraph` (this) | Reference build: seam patch, capture matrix, component tests, e2e keepers | nothing (private) |
| `autonull/spacegraphjs` (exists) | Renderer contract, adapters, layout, a11y, SVG export | published |
| `anomalyco/opencode` | Upstream | untouched |

Model packaging: `spacegraph-model` is **generated** from `packages/session-ui/src/graph` by a script in the plugin repo, with a parity test (same fixture → byte-identical JSON to the fork's model). Never hand-edited, so drift is caught, not discovered.

---

## 🗂️ CONSOLIDATED TRACKS (10 working days)

### Phase 0 — Vertical spike (1 day) — *decides everything*
| # | Task |
|---|------|
| P0.1 | Minimal external plugin: `Plugin.define` + one `Panel` rendering a hand-made SVG from a **vendored model copy**, own CSS via `ctx.add(Style, css)`, built with `gui()` |
| P0.2 | Load it as a **local plugin** on stock web and stock desktop; confirm panel renders, CSS applies, rebuild → GUI reload |
| P0.3 | If the bundle fails to load, stop and re-scope before writing more code |

Exit criterion: a stock app shows our panel with correct styling and hot-ish reload.

### Phase 1 — Model package (2 days)
| # | Task |
|---|------|
| P1.1 | Generate `@autonull/spacegraph-model` from `session-ui/src/graph`; publish |
| P1.2 | Parity test vs the fork's model on the canonical fixture |
| P1.3 | Vendor `buildRenderModel` + `exportGraph` (+ `DEFAULT_THEME` from `@spacegraphjs/renderer`) |

### Phase 2 — Map surfaces (3 days)
| # | Task |
|---|------|
| P2.1 | Full-map dialog: canvas host + camera fit (from `session-graph/src/canvas`, 1,384 lines) |
| P2.2 | Toolbar on `ctx.ui.Menu` (level, layout, depth, export) |
| P2.3 | Inspector on `ctx.ui` + vendored selectors; `ctx.t` copy |
| P2.4 | Panel overview: port `gui-plugins/src/session-map/panel.tsx` (137 lines, upstream-proven) |

### Phase 3 — Integration (2 days)
| # | Task |
|---|------|
| P3.1 | Turn map dialog |
| P3.2 | Permalinks `#spacegraph:` |
| P3.3 | Commands + keybinds (`mod+shift+m`, `mod+shift+g`, `mod+t`) |
| P3.4 | Settings page + `Store.session` |
| P3.5 | Transcript bridge via `screen.transcript.reveal` |
| P3.6 | Hybrid Side/Floating |

### Phase 4 — Release (1 day)
| # | Task |
|---|------|
| P4.1 | Publish plugin; verify installed from npm on web + desktop |
| P4.2 | README: install, keybinds, screenshots, limitations |
| P4.3 | Archive seam as `patches/0001-session-surfaces.patch` + `patch:apply`/`patch:revert` |
| P4.4 | Delete `spacegraph` from `gui-plugins/src/{main,renderer}.ts` in this fork |

### Phase 5 — Ambient + polish (fast follow)
| # | Task |
|---|------|
| P5.1 | `session.header` turn ribbon |
| P5.2 | `ComposerPill` popover mini map |
| P5.3 | Mobile drawer, a11y audit, `onIdle` chunk preloads, `suggested: true` keybinds |

---

## 🧪 TESTING WITH THE NEW INFRASTRUCTURE

| Gate | Where | What only it catches | Cost |
|---|---|---|---|
| **Build gate** (`gui()` build) | plugin repo CI | Any non-provided import (`@opencode/ui`, `@opencode/session-ui`) — the single most likely regression | ~5 s |
| **Bundle-load gate** | plugin repo CI (Node): evaluate `dist/gui-experimental.cjs` against the provided-module map | Missing external, wrong export shape, top-level side effects | ~2 s |
| **Model parity** | plugin repo | Vendored model drifting from `session-ui/graph` | ~2 s |
| **Unit** | plugin repo, `bun test` | Permalink parsing, selectors, export serialization | fast |
| **Component (real host)** | **this fork** — `mountPlugins` fixture, `plugin-host.spec.ts` | Contribution lifetimes, panel/slot rendering, surface behaviour of the *built-in* source | ~35 s |
| **Component (bundle)** | this fork — a story that loads `dist/gui-experimental.cjs` through the host evaluator | That the *shipped artifact* mounts, not just the source | ~10 s |
| **e2e keepers** | this fork, Playwright + mock server | What the user sees: panel opens, node click reveals message, permalink cold load | ~2 min |
| **Capture matrix** | this fork | Visual regressions across layouts/depths | `graph:capture --mode=verify` |

Rules of thumb:
- **One owner per contract.** Model parity lives in the plugin repo; UI behaviour lives in the fork.
- The fork keeps testing the **built-in** (same contributions, no bundle boundary) so UI regressions surface fast; the plugin repo proves the **artifact**.
- No second harness in the plugin repo: a stub `ctx` for panels would test our mocks, not the host.
- e2e for the *installed* plugin is manual/scripted (`dev:stock`), not CI, until the plugin is stable.

---

## ⚡ DEV LOOP — what HMR does and does not give us

| Loop | Command | Feedback |
|---|---|---|
| Model/logic | `bun test --watch` in the plugin repo | instant |
| UI on stock (local plugin) | `vite build --watch` + stock app pointed at the plugin dir | **~1 s**, GUI re-evaluates the changed bundle (hash revision). No state preservation |
| UI on the reference build | `bun run dev:live` / fork dev server with the built-in plugin | Vite HMR + Solid fast refresh — the fastest loop, and why Phase 2 UI work should be developed here first, then ported |
| Artifact check | `bun run build && bun run test:bundle` | seconds |

**Practical rule:** build new UI in the fork's built-in plugin (full HMR), then apply the `ctx.ui` substitutions and verify on stock. Do not attempt HMR for the external bundle — the host reloads the whole plugin.

---

## ⚠️ RISKS

| Risk | Mitigation |
|---|---|
| Phase 0 fails (bundle cannot mount/CSS) | It is one day, first thing; fall back to distributing a 4-file patch instead of a plugin |
| Vendored model drifts | Generated + parity test in CI |
| Lean UI diverges from the full map | Same model, same renderer contract; capture matrix compares the reference build, README compares stock |
| `ctx.ui` lacks a control (e.g. segmented control) | `ctx.ui.Menu` / `Button` substitutions; enumerate during P2.2 |
| Tailwind tokens differ in the plugin's CSS | Use theme CSS variables (`var(--v2-*)`), never raw colors |
| Upstream changes the SDK | Sync before each phase (`git merge upstream/dev`), re-read `packages/plugin/src/gui/modules.ts` first |

---

## ✅ DEFINITION OF DONE

| # | Criterion |
|---|-----------|
| 1 | Stock web + desktop load the plugin from npm, no fork |
| 2 | Panel, full map, turn map, permalink, export, settings, keybinds, transcript bridge work |
| 3 | Build + bundle-load + model-parity gates green in the plugin repo |
| 4 | Fork keeps the built-in as reference; capture matrix and component tests green |
| 5 | Seam archived as an applyable patch; built-in registration deleted |
| 6 | **No upstream PR filed, none required** |

---

## 📌 IMMEDIATE NEXT ACTIONS

1. **P0.1–P0.3** — the one-day external spike. Everything else is contingent on it.
2. While the spike runs, write `patches/0001-session-surfaces.patch` (1 h) so the fork is reproducible before anything is deleted.
3. Generate `@autonull/spacegraph-model` (P1.1) — it unblocks both the plugin and Phase 2.

---

## 🔑 PRINCIPLES (locked)

| # | Decision |
|---|----------|
| P1 | The shipped plugin depends only on the SDK allowlist + published non-`@opencode` packages |
| P2 | The host transcript is never replaced; `screen.transcript.reveal` is the bridge |
| P3 | The external plugin is **lean**; the full `GraphView` stays in the reference build |
| P4 | The seam is a reference-build patch, never a dependency |
| P5 | Ambient surfaces (`session.header`, `ComposerPill`) over a body takeover |
| P6 | Vendored model is generated and parity-tested, never hand-edited |
| P7 | UI is developed in the fork (HMR), then ported to the bundle |
| P8 | The plugin repo proves the artifact; the fork proves the behaviour |

---

*Verified constraint beats optimistic architecture: the SDK allowlist decides the design, the spike decides the schedule.*
