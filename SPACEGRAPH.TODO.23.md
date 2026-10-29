# SPACEGRAPH.TODO.23 — Plugin-Only Delivery (No Fork, No Upstream PR)

> **Supersedes SPACEGRAPH.TODO.22.** The MVP is complete as a built-in GUI plugin. This plan delivers the same product as a **third-party plugin on stock OpenCode**, with no fork and no upstream PR. The surface seam we built stays as an *optional* reference-build patch, never a dependency.

---

## 📍 STATE (2026-10-29)

| Item | Status |
|------|--------|
| Graph MVP as built-in plugin (`gui-plugins/src/spacegraph`) | ✅ 26/26 capture frames, 49/49 component tests, plugin-graph matrix green |
| `bun run check` (42 packages) | ✅ clean |
| Human-testing smoke checklist (8 items) | ✅ done |
| T2.2 evidence | ⏸️ deferred behind stop rule |

---

## 🧭 DECISION: NO UPSTREAM PR

**Question:** do we need an upstream PR for `SessionSurface` / `ctx.surfaces` / `SessionSurfaceHost`?

**Answer: No.** Verified against `upstream/dev` @ `6007274795` (2026-10-29):

| Capability the plugin needs | Exists upstream today? |
|---|---|
| Registry contributions (`Panel`, `Command`, `MenuItem`, `SettingsPage`, `Slot`, `Style`) | ✅ |
| `ctx.dialogs.open(render, { replace })` — arbitrary JSX above the app, plugin context | ✅ |
| `Panel.region: "side"` + `Panel.wide` + `Panel.mobile` (`tab`/`menu`/`drawer`) | ✅ |
| `PanelTab.group`, `transient`, `fallback`, `file`, `hidden` | ✅ |
| `Store.global` / `Store.session`, `ctx.storage`, `ctx.layout`, `ctx.sessions`, `ctx.screen` | ✅ |
| `ctx.system.copy` (permalinks), `ctx.ui.*` (Icon, Button, Menu, Switch, Dialog frame) | ✅ |
| `SessionSurface` (full-body session view) | ❌ **ours only** |
| `SessionLayer` (overlay above the body) | ❌ **ours only** |
| `ctx.surfaces` (select/list surfaces) | ❌ **ours only** |

So exactly one product capability has no stock equivalent: **taking over the session body**. Everything else the plugin does maps onto shipped APIs. The body takeover is a *nice UX*, not a requirement — and it is replaceable with dialogs and a wide side panel.

**Consequence:** upstreaming is optional and unnecessary. We do not wait on review, and no track depends on `anomalyco/opencode` accepting anything.

---

## 🚦 TWO DELIVERY TIERS

| | **Tier 1 — Stock plugin** (the product) | **Tier 2 — Reference build** (optional lab) |
|---|---|---|
| Runs on | Released OpenCode, unmodified | Our fork (this repo) with a 3-file patch |
| Session body | Host transcript (unchanged) | Map / Hybrid as first-class surfaces |
| Map, full | `ctx.dialogs.open` full-bleed render | `SessionSurface` + `contexts.surfaces` |
| Hybrid | Wide side panel map beside transcript | `HybridSurface` (3 arrangements) |
| Turn map | Dialog over the transcript (scroll preserved) | `SessionLayer` on the Map surface |
| Custom Transcript component | Dropped (host owns the transcript) | Kept |
| Composer inset | N/A (dialogs overlay) | `composerInset` reserves `timeline.inset()` |
| Distribution | `npm i` + `plugin: ["@autonull/opencode-plugin-spacegraph"]` | `git clone` + `bun run dev` |
| Ships | **Now** | Whenever, or never |

Tier 1 is the deliverable. Tier 2 exists so the capture matrix, e2e keepers and the seam patch stay alive as evidence and as an upgrade path if upstream ever adds surfaces.

---

## 🗺️ TIER 1 CAPABILITY MAPPING

| Feature (today) | Built-in implementation | Stock-plugin implementation |
|---|---|---|
| Map surface (`spacegraph.map`) | `SessionSurface` | `Panel(region: "side", wide: true)` tab **Session Map** + `ctx.dialogs.open` **Full map** |
| Hybrid surface (`spacegraph.hybrid`) | `SessionSurface` + arrangements | Wide side panel beside the transcript (side-by-side is the stock equivalent); stacked/floating become layout options inside the panel |
| Turn map layer | `SessionLayer` | `ctx.dialogs.open` scoped turn subgraph; transcript keeps its mount and scroll |
| Side panel (compact overview) | `Panel(region: "side")` | unchanged |
| Inspector | inside surface | inside panel / dialog |
| Windows (draggable inspectors) | plugin-owned | unchanged (plugin-owned overlays) |
| Custom Transcript | plugin component | dropped — use host transcript + `TranscriptScreen.reveal` |
| Permalinks `#graph:layout:node` | plugin hash + `surfaces.select` | plugin hash + open Full-map dialog, then frame node |
| Commands + keybinds | `Command` | unchanged (`mod+shift+m` → panel, `mod+shift+f` → full map dialog…) |
| Settings | `SettingsPage` | unchanged |
| Export SVG/JSON/HTML | model + `exportGraph` | unchanged |
| Per-session state | `Store.session` | unchanged |

**Spike first (half a day):** confirm a dialog render can fill the viewport (no Dialog frame, own scroll container, Esc + focus trap as the host behaves) and that a `wide: true` side panel holds a canvas without reframing. If the dialog cannot go full-bleed, fall back to "Full map" as a maximized panel tab; the rest of Tier 1 is unaffected.

---

## 🏗️ REPOSITORY PLAN

Three repos, clean ownership. Upstream is read-only to us.

| Repo | Role | Ships |
|---|---|---|
| **`autonull/opencode-plugin-spacegraph`** (new) | The plugin. `Plugin.define`, `renderer.tsx`, surfaces/panels/dialogs, model, i18n, Vite preset config. Own CI, own release. | npm package exposing `./gui-experimental` |
| **`autonull/opencode_spacegraph`** (this repo) | Reference host: seam patch, capture matrix, e2e keepers, evidence. Not the deliverable. | nothing (private) |
| **`autonull/spacegraphjs`** (exists) | Renderer contract, adapters, layout, a11y, SVG export | published packages |
| `anomalyco/opencode` | Upstream | untouched |

### Why a separate plugin repo (and not publish from this fork)

- This fork is a *host* (1031 commits over upstream); publishing from it makes the plugin look like fork output and drags fork-only deps (`@opencode/app`, desktop) into release checks.
- The plugin only needs `@opencode/plugin` (peer), `@opencode/session-ui` (peer), and `spacegraphjs` packages. A small repo proves that.
- Release cadence: plugin tags move at plugin speed; the fork syncs upstream on its own schedule.
- The fork stays useful: capture matrix and e2e keepers validate the reference build, and the seam patch is versioned there.

### Plugin repo layout

```
opencode-plugin-spacegraph/
├── package.json            name, peerDeps, exports: { ".": dist/index.js, "./gui-experimental": dist/plugin.js }
├── tsconfig.json
├── vite.config.ts          @opencode/plugin/gui/vite preset (solid, lib build, externals)
├── src/
│   ├── index.ts            Plugin.define({ stores, i18n })
│   ├── renderer.tsx        contributions: Panel, Dialog entry, Commands, SettingsPage, Style
│   ├── model.ts            createSpacegraph(ctx): prefs + per-session store
│   ├── map/                MapView (used by panel and full-map dialog)
│   ├── hybrid/             arrangements inside the panel
│   ├── turn-map/           scoped dialog
│   ├── inspector/ windows/ lazy chunks
│   ├── permalink.ts        hash parse + apply
│   ├── export.ts           exportGraph wiring
│   └── i18n/en.ts
├── test/                   unit (*.test.ts) + a minimal mount harness for components
└── README.md               install, keybinds, screenshots, limitations
```

### Dev loop (no fork, no sibling checkout)

```bash
# plugin repo
bun run dev            # Vite build --watch, emits dist/plugin.js

# stock opencode, pointed at the working tree
opencode.json:
{ "plugin": ["/abs/path/opencode-plugin-spacegraph"] }   # or `bun link` + package name

bun run dev:stock      # runs released opencode with a fixture session
```

HMR: the `@opencode/plugin/gui/vite` preset already externalizes the SDK and emits the single `./gui-experimental` bundle the host evaluates; a rebuild triggers the host's plugin revision change.

---

## 🗂️ WORK TRACKS

### Track A — Stock-API port (Tier 1) — *the product*

| # | Task | Notes | Effort |
|---|------|-------|--------|
| A1 | Spike: full-bleed dialog + wide panel canvas | Decide dialog vs maximized panel for Full map | 0.5 d |
| A2 | Panel contribution: map overview + inspector | Port `panel.tsx` + inspector; no surface props | 1 d |
| A3 | Full map dialog: `GraphView` at full size | Reuse `@opencode/session-graph` `GraphView`; own toolbar | 1 d |
| A4 | Hybrid-in-panel: arrangement switch (side/stacked/floating) | CSS-only inside the panel; no host changes | 1 d |
| A5 | Turn map dialog | Scoped subgraph; transcript untouched beneath | 0.5 d |
| A6 | Permalinks via hash + dialog | Replace `surfaces.select` with dialog open + frame | 0.5 d |
| A7 | Commands/keybinds without `ctx.surfaces` | `mod+shift+m` panel, `mod+shift+g` full map, `mod+t` turn map | 0.5 d |
| A8 | Settings page + per-session store | unchanged from built-in | 0.5 d |
| A9 | Export wiring | unchanged | 0.25 d |
| A10 | Transcript bridge | `screen.transcript.reveal` from panel/full-map selection | 0.5 d |
| A11 | i18n + a11y pass + mobile (`Panel.mobile` drawer) | | 1 d |

### Track B — Plugin repository & release

| # | Task | Effort |
|---|------|--------|
| B1 | Create `autonull/opencode-plugin-spacegraph`, move `src/spacegraph` | 1 h |
| B2 | Build config from `@opencode/plugin/gui/vite`; externals: `solid-js`, `@opencode/plugin`, `@opencode/session-ui`, `spacegraphjs`, `three` | 1 h |
| B3 | CI: typecheck, lint, unit tests, bundle size budget | 2 h |
| B4 | Publish `@autonull/opencode-plugin-spacegraph` (npm), verify install on stock web + desktop | 2 h |
| B5 | README: install, keybinds, screenshots, honest limitations, "map is a dialog, transcript is the body" | 1 h |
| B6 | Remove `spacegraph` from `gui-plugins/src/{main,renderer}.ts` in the fork once the plugin ships | 10 min |

### Track C — Reference build & optional seam (Tier 2)

| # | Task | Effort |
|---|------|--------|
| C1 | Freeze the 3 seam files as `patches/0001-session-surfaces.patch` (`git format-patch` of `runtime/plugin/surfaces.ts`, `session/surface.tsx`, `session/screen.tsx`) | 1 h |
| C2 | `bun run patch:apply` / `patch:revert` scripts + docs so the fork is reproducible | 1 h |
| C3 | Keep capture matrix + e2e keepers green on the reference build | ongoing |
| C4 | If upstream ever adds a surface registry, delete the patch (no user-visible change) | — |

### Track D — DevEx

| # | Task | Effort |
|---|------|--------|
| D1 | `mountSpacegraph()` harness in the plugin repo (only the plugin, not the host) | 2 h |
| D2 | Chunk preloading: `onIdle` for Inspector, Windows, Settings | 30 min |
| D3 | `suggested: true` keybinds for palette discovery | 10 min |
| D4 | Optional `@autonull/spacegraph-ui` extraction for HMR of GraphView/Inspector | 4 h (defer) |

### Track E — Polish & human testing

| # | Task | Trigger |
|---|------|---------|
| E1 | Fix human-testing issues | feedback |
| E2 | Mobile drawer for the map panel; narrow-screen behaviour | feedback |
| E3 | Screen-reader + reduced-motion audit | feedback |

### Track F — T2.2 (optional, stop-rule governed)

n ≥ 5, counterbalanced, canonical fixture, five tasks. Publish honestly; stop feature work on a negative result.

---

## 📅 ORDER

```
Week 1  A1–A3 (spike + map in panel + full-map dialog) → demoable Tier 1
Week 2  A4–A11 → feature parity without the seam
Week 3  B1–B6 → plugin repo, CI, npm release, delete built-in registration
Week 4  C1–C2 (seam patch archived), D1–D3, E1–E3 as feedback lands
Later   F (T2.2) only if requested
```

---

## ⚠️ RISKS

| Risk | Mitigation |
|------|------------|
| Dialog cannot go full-bleed | Fallback: maximized panel tab; spike decides in half a day (A1) |
| A side panel is too narrow for the map | `Panel.wide` + mobile drawer; full map lives in the dialog, not the panel |
| Losing the custom Transcript component hurts hybrid measurements | Host transcript + `reveal` covers the bridge; revisit only if measured |
| Plugin bundle can't resolve `@opencode/session-ui` | It is a published peer; verify in B4 on web + desktop |
| Upstream changes the GUI SDK | We track `@opencode/plugin` peer range; the fork's e2e keepers catch drift early |
| Distribution friction (config-only install) | Document both `plugin: [...]` and `.opencode/plugins/` paths; marketplace entry later |

---

## ✅ DEFINITION OF DONE

| # | Criterion | Track |
|---|-----------|-------|
| 1 | Plugin runs on stock OpenCode (web + desktop) with no fork | A, B |
| 2 | Map (panel + full dialog), turn map, permalink, export, settings, keybinds work | A |
| 3 | Transcript bridge works (selection reveals message, scroll preserved) | A10 |
| 4 | Published npm package; install documented | B |
| 5 | Built-in registration deleted from the fork | B6 |
| 6 | Seam archived as an applyable patch; reference build still green | C |
| 7 | Human testing passed; feedback addressed | E |
| 8 | **No upstream PR filed, none required** | — |

---

## 📌 IMMEDIATE NEXT ACTIONS

1. Spike A1 (dialog full-bleed vs maximized panel) — decides the Full-map home.
2. Create the plugin repo (B1) and move `src/spacegraph` into it unchanged, then port A2/A3.
3. Archive the seam patch (C1) so this fork becomes reproducible before anything is deleted.
4. Publish, then delete the built-in registration (B5, B6).

---

## 🔑 ARCHITECTURAL PRINCIPLES (locked)

| # | Decision | Rationale |
|---|----------|-----------|
| P1 | The plugin depends only on published SDK + library packages | Proves no-fork; keeps CI honest |
| P2 | The host transcript is never replaced in Tier 1 | Removes the only capability the stock API lacks |
| P3 | Full map lives in a dialog; the panel is the always-available surface | Both exist upstream; no seam |
| P4 | The seam patch is reference-build-only, applied by script | Evidence and upgrade path, never a dependency |
| P5 | The fork is an integration lab, not a product | Capture matrix + e2e keepers stay useful without shipping |
| P6 | One plugin repository, one npm package, one install line | Simplest distribution that works today |

---

*The fork was three app files of hosting code. We do not need them upstream, do not need them to ship, and do not wait on anyone to accept them. The plugin is the product.*
