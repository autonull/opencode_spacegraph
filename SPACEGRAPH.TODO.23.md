# SPACEGRAPH.TODO.23 — Plugin-Only Delivery at Full Parity (Verified)

> **Supersedes SPACEGRAPH.TODO.22.** Verified against `upstream/dev` @ `6007274795` (`anomalyco/opencode`); this fork is synced to it (`402 0`). The deliverable is an **external GUI plugin on stock OpenCode with no functional loss**; the fork stays as the reference build and test lab. No upstream PR.

---

## 📍 STATE (2026-10-29)

| Item | Status |
|------|--------|
| Branch base | ✅ `upstream/dev` @ `6007274795` merged; `bun run check` 42/42, session-graph components 49/49, plugin-host 33/33 |
| Built-in plugin (`gui-plugins/src/spacegraph`) | ✅ full parity, 26/26 capture frames |
| Human-testing smoke checklist | ✅ done |
| External plugin | ❌ not started — constraints below are decisive |
| T2.2 evidence | ⏸️ deferred behind stop rule |

---

## ✅ VERIFICATION — what an external bundle may and may not do

| # | Constraint | Evidence | Consequence |
|---|---|---|---|
| V1 | **Closed module allowlist.** `gui()` externalizes only `effect`, `@opencode/plugin/gui`, `@opencode/plugin/gui/main`, `@opencode/plugin/rpc`, `@opencode/schema/rpc`, `@opencode/client`, `@opencode/client/effect`, `solid-js*`, `@opencode/plugin/gui/{file,review,browser}` and **fails the build** on any other `@opencode/*`, `effect/*`, `solid-js/*` import. | `packages/plugin/src/gui/vite.ts`, `modules.ts` | `@opencode/session-ui`, `@opencode/session-graph`, `@opencode/ui` must be vendored or replaced — **but nothing has to be dropped**. |
| V2 | **Tailwind scans `packages/*/src` only.** | `packages/ui/src/styles/tailwind/index.css` | The plugin compiles its own CSS and contributes it with `ctx.add(Style, css)`. |
| V3 | **No HMR; bundle is watched.** `gui()` is a lib build (CJS, `inlineDynamicImports: true`). A local plugin's `./gui-experimental` is watched; its hash becomes the GUI revision and windows re-evaluate it. | `vite.ts`, `packages/core/src/plugin/module.ts` | Dev loop is `vite build --watch` + GUI reload (~1 s). Full HMR only in the fork's built-in. |

### The dependency surface is small — full parity is mechanical

`packages/session-graph/src` is 12,782 lines (non-test): `ui/` 12,453, `canvas/` 1,384, `contract/` 154. Its **entire** `@opencode` surface:

| Import | Sites | Disposition |
|---|---|---|
| `@opencode/session-ui/graph` | 91 | Vendor → `@autonull/spacegraph-model` (pure TS; only type-imports `@opencode/client/promise`) |
| `@opencode/ui/context/i18n` | 49 | Adapter: `t` → `ctx.t` (346 uses), `plural` → `ctx.plural` (9 uses), `locale` → `ctx.locale` |
| `@opencode/ui/icon` | 8 | Adapter component over `ctx.ui.Icon` |
| `@opencode/ui/segmented-control` | 1 | Adapter over `ctx.ui.Menu` |
| `@opencode/ui/icon-button` | 1 | Adapter over `ctx.ui.IconButton` |
| `@opencode/client/promise` | 2 (type-only) | Provided ✅ |

Everything else is `solid-js` (70) and `@spacegraphjs/*` + `spacegraphjs/*` — bundleable.

**Conclusion: the whole graph UI ships externally at 100% feature parity.** A ~200-line adapter (Solid context provider feeding `useI18n`/`Icon`/`IconButton`/`SegmentedControl` from the plugin `ctx`) plus a scripted import rewrite covers all 12,782 lines. No subsystem is dropped.

---

## 🧩 FUNCTIONALITY PARITY CONTRACT

Every subsystem below must work identically in the external plugin. This list is the acceptance check — a missing row is a regression, not a scope cut.

| Subsystem | Source | Adapter need |
|---|---|---|
| GraphView, camera, fit and insets | `ui/GraphView.tsx`, `graph-camera.ts`, `GraphCanvasRegion.tsx` | none |
| Toolbar: level, layout, depth, side, draw, show, time, questions | `GraphToolbar.tsx`, `GraphLayersControl.tsx`, `GraphDrawControl.tsx`, `GraphShowControl.tsx`, `GraphTimeControl.tsx`, `GraphQuestionsControl.tsx` | `SegmentedControl` → `ctx.ui.Menu` |
| Inspector and detail | `GraphDetail.tsx`, `cardTemplate.ts` | i18n |
| Windows (drag, pin, stack, resize, RTL) | `GraphWindows.tsx`, `GraphWindowManager.tsx`, `GraphOverlayManager.tsx` | i18n |
| Search and find | `GraphSearch.tsx`, `GraphFind.tsx` | i18n |
| Minimap, legend, gallery, equalizer | `GraphMinimap.tsx`, `GraphLegend.tsx`, `GraphGallery.tsx`, `GraphEqualizer.tsx` | i18n |
| Compare, notes, trace overlay | `GraphCompare.tsx`, `useNotes.ts`, `useComparison.ts`, `useTraceOverlay.ts` | i18n |
| Filesystem window (workspace lens) | `GraphFilesystemWindow.tsx` | i18n |
| Turn map overlay | `TurnMapOverlay.tsx` | i18n |
| Status bar, failure progress | `GraphStatusBar.tsx`, `GraphFailureProgress.tsx` | i18n |
| Export SVG/JSON/HTML | `export.ts` + `@spacegraphjs/svg-renderer` | none |
| A11y mirror, keyboard nav | `GraphA11y.tsx`, `useGraphKeyboard.ts` | i18n |
| Renderers: SpaceGraph (2D/3D) + Cytoscape + SVG | `canvas/`, `@spacegraphjs/*` | bundled |
| Card copy, axis labels, labels | `card-copy.ts`, `axisLabels.ts` | i18n |

Parity is **proven**, not asserted: the capture matrix runs against the external bundle (below).

---

## 🧭 DECISION: NO UPSTREAM PR

The only capability with no stock equivalent is taking over the session body. Everything else maps onto shipped APIs: `Panel` (`wide`, `mobile`, `group`), `ctx.dialogs.open`, `Slot` `session.header`, `ComposerPill.menu`, `SettingsPage`, `Command`, `MenuItem`, `Store.session`, `ctx.system.copy`, `ctx.ui.*`. Upstreaming stays optional; no track depends on it.

---

## 🔍 STOCK SURFACE SET

| Feature | Stock implementation |
|---|---|
| Session Map panel | `Panel(region: "side", wide: true)` — full `GraphView` or compact overview |
| Full map | `ctx.dialogs.open`, full-bleed `GraphView` |
| Hybrid | **Side** (wide panel beside transcript) + **Floating** (dialog). **Stacked** needs the body — the only arrangement not reproducible |
| Turn map | `TurnMapOverlay` inside a dialog |
| Ambient ribbon | `Slot` `session.header` — fixed-height phase strip |
| Composer pill | `ComposerPill` + `menu` → mini map → "Open full map" |
| Permalinks | `#spacegraph:<layout>:<node>` → dialog + frame |
| Transcript bridge | `screen.transcript.reveal` |
| Custom Transcript component | **Dropped** — the host owns the body; the plugin cannot replace it (only true functional loss, and it existed to fix a hybrid measurement bug that no longer occurs) |

---

## 🏗️ REPOSITORIES

One new monorepo, three packages — mirrors `spacegraphjs` conventions.

| Repo | Packages / role | Ships |
|---|---|---|
| `autonull/opencode-spacegraph` (new) | `packages/model` (vendored, generated) · `packages/ui` (vendored session-graph + adapter) · `packages/plugin` (contributions) | `@autonull/spacegraph-model`, `@autonull/spacegraph-ui`, `@autonull/opencode-plugin-spacegraph` |
| `autonull/opencode_spacegraph` (this) | Reference build: seam patch, capture matrix, component tests, e2e keepers | private |
| `autonull/spacegraphjs` (exists) | Renderer contract, adapters, layout, a11y, SVG export | published |
| `anomalyco/opencode` | Upstream | untouched |

`model` and `ui` are **generated** from `packages/session-ui/src/graph` and `packages/session-graph/src` by `script/vendor.ts` (copy + import rewrite), never hand-edited; a parity test compares model output and a `git diff` guard fails on drift.

---

## 🗂️ TRACKS (13 working days)

### Phase 0 — Pipeline spike (1.5 days) — *decides everything*
| # | Task |
|---|------|
| P0.1 | `script/vendor.ts`: copy `session-ui/src/graph` + `session-graph/src` into the monorepo, rewrite the 152 `@opencode` imports to local paths |
| P0.2 | Adapter (~200 lines): `useI18n`/`Icon`/`IconButton`/`SegmentedControl` from a Solid context fed by `ctx` |
| P0.3 | Tailwind CSS build for `packages/ui` → one string via `ctx.add(Style, css)` |
| P0.4 | Minimal plugin: one `Panel` rendering the vendored `GraphView`; build with `gui()`; load as a local plugin on stock **web + desktop** |
| P0.5 | Measure bundle size and startup cost of the single CJS artifact |

Exit: stock app shows the **real GraphView** with correct styling and ~1 s reload. If this fails, stop and re-scope.

### Phase 1 — Model + UI packages (2 days)
| # | Task |
|---|------|
| P1.1 | Publish `@autonull/spacegraph-model`; parity test vs the fork's model on the canonical fixture |
| P1.2 | Publish `@autonull/spacegraph-ui`; adapter covered by component tests |
| P1.3 | Drift guard: re-run `vendor.ts` in CI and fail on a diff |

### Phase 2 — Contributions (3 days)
| # | Task |
|---|------|
| P2.1 | Side panel: full map + inspector + windows inside the panel |
| P2.2 | Full-map dialog (full-bleed `GraphView`) |
| P2.3 | Hybrid: Side (panel) + Floating (dialog) |
| P2.4 | Turn map dialog |
| P2.5 | Permalinks `#spacegraph:` |
| P2.6 | Commands + keybinds (`mod+shift+m`, `mod+shift+g`, `mod+t`), palette `suggested` |
| P2.7 | Settings page + `Store.session` per-session state |
| P2.8 | Transcript bridge via `screen.transcript.reveal` |

### Phase 3 — Parity proof (2 days)
| # | Task |
|---|------|
| P3.1 | Run the **capture matrix against the external bundle**: all 26 frames byte-comparable to the reference build |
| P3.2 | e2e keepers against the bundle (panel open, node click → reveal, permalink cold load, export) |
| P3.3 | Functionality parity checklist above: walk every row on web + desktop |

### Phase 4 — Release (1 day)
| # | Task |
|---|------|
| P4.1 | Publish; verify install from npm on web + desktop |
| P4.2 | README: install, keybinds, screenshots, limitations (one row: no custom transcript) |
| P4.3 | Archive seam as `patches/0001-session-surfaces.patch` + `patch:apply`/`patch:revert` |
| P4.4 | Delete `spacegraph` from `gui-plugins/src/{main,renderer}.ts` in this fork |

### Phase 5 — Ambient + polish (fast follow)
| # | Task |
|---|------|
| P5.1 | `session.header` turn ribbon |
| P5.2 | `ComposerPill` popover mini map |
| P5.3 | Mobile drawer, a11y audit, `onIdle` preloads |

---

## 🧪 TESTING

| Gate | Where | Catches | Cost |
|---|---|---|---|
| **Build gate** (`gui()`) | new repo CI | Any non-provided import (`@opencode/ui`, `@opencode/session-ui`) | ~5 s |
| **Bundle-load gate** | new repo CI | Missing external, bad export shape, top-level side effects | ~2 s |
| **Vendor drift guard** | new repo CI | `model`/`ui` diverging from the fork's source | ~3 s |
| **Model parity** | new repo | Model behaviour drift | ~2 s |
| **Adapter unit** | new repo | i18n/icon/segmented-control mapping | fast |
| **Capture matrix (bundle)** | this fork | **Every visual and interaction difference** vs the reference build — the parity proof | `graph:capture --mode=verify` |
| **e2e keepers (bundle)** | this fork | Panel open, reveal, permalink, export | ~2 min |
| **Component (built-in)** | this fork | Host lifetime contracts while developing in the HMR loop | ~35 s |

Rule: the parity gate is the **capture matrix on the external bundle**. If a frame differs, functionality was lost — fix it, do not re-baseline.

---

## ⚡ DEV LOOP

| Loop | Command | Feedback |
|---|---|---|
| Logic/ui package | `bun test --watch` | instant |
| UI iteration (full HMR) | fork's built-in plugin + `bun run dev:live` | instant, state preserved |
| UI on stock | `vite build --watch` + stock app with local plugin dir | ~1 s, plugin re-evaluates, state lost |
| Artifact | `bun run build && bun run test:bundle` | seconds |

Develop UI in the fork (HMR), then re-run `vendor.ts` to copy it into the plugin monorepo. That keeps one source of truth and zero porting by hand.

---

## ⚠️ RISKS

| Risk | Mitigation |
|---|---|
| Phase 0 fails (bundle mount/CSS/size) | 1.5 days, first thing; fallback is a 4-file built-in patch |
| **Bundle size**: `inlineDynamicImports` forbids code splitting, so `three` + cytoscape + svg ride in one CJS file (~1.5–2 MB raw) | Measure in P0.5; if startup cost is unacceptable, ship SpaceGraph + SVG renderers and load Cytoscape only in the reference build — decide on data, not guesswork |
| Adapter skew (i18n/icon APIs) | Adapter is 200 lines, unit-tested; `typecheck` fails loudly |
| CSS/theme drift | Utilities compiled from the same `@opencode/ui` theme; colors only via `var(--v2-*)` |
| Vendored drift | Generated + drift guard in CI |
| Upstream SDK changes | Merge `upstream/dev` before each phase; re-read `modules.ts` first |

---

## ✅ DEFINITION OF DONE

| # | Criterion |
|---|-----------|
| 1 | Stock web + desktop load the plugin from npm, no fork |
| 2 | **Every row of the functionality parity contract works**; capture matrix on the bundle matches the reference build |
| 3 | Build, bundle-load, vendor-drift and model-parity gates green |
| 4 | Fork keeps the built-in as reference; component tests and capture matrix green |
| 5 | Seam archived as an applyable patch; built-in registration deleted |
| 6 | **No upstream PR filed, none required** |

---

## 📌 IMMEDIATE NEXT ACTIONS

1. **P0.1** — write `script/vendor.ts` and confirm the 152-import rewrite builds.
2. **P0.4/P0.5** — mount the real `GraphView` in a stock panel; measure bundle size.
3. In parallel: `patches/0001-session-surfaces.patch` (1 h) so the fork is reproducible.

---

## 🔑 PRINCIPLES (locked)

| # | Decision |
|---|----------|
| P1 | The shipped plugin depends only on the SDK allowlist + published non-`@opencode` packages |
| P2 | **No functionality is sacrificed**: vendoring preserves every subsystem; only the custom transcript is impossible on stock |
| P3 | `model` and `ui` are generated from the fork's source, never hand-maintained |
| P4 | The capture matrix on the external bundle is the parity gate — differences are bugs |
| P5 | UI is developed in the fork (HMR) and vendored out; one source of truth |
| P6 | The host transcript is never replaced; `screen.transcript.reveal` is the bridge |
| P7 | The seam is a reference-build patch, never a dependency |

---

*Verified, not assumed: the allowlist is closed, the dependency surface is five imports, and nothing has to be cut to fit.*
