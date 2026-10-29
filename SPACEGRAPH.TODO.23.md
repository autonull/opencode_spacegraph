# SPACEGRAPH.TODO.23 — Plugin-Only Architecture & Upstream Readiness

> **Supersedes SPACEGRAPH.TODO.22.** The core MVP is complete and verified. This plan moves the entire graph implementation into the Plugin API, contributes the 3 minimal app-side seams upstream, and establishes a clean external plugin distribution workflow. No fork required.

---

## 📍 CURRENT STATE (2026-10-29)

| Item | Status | Notes |
|------|--------|-------|
| Core graph MVP | ✅ Done | 26/26 capture frames, 49/49 component tests, plugin-graph test passes |
| Built-in GUI plugin | ✅ Complete | `packages/gui-plugins/src/spacegraph/` — Map, Hybrid, TurnMap, Inspector, Windows, Settings, Commands, Permalinks, Export, custom Transcript |
| All 8 smoke items | ✅ Verified | Ready for human testing |
| T2.2 evidence study | ⏸️ Deferred | Stop rule: only if stakeholder demands; runs on built-in plugin when MVP-complete |
| Typecheck | ✅ Clean | 42/42 packages pass |

---

## 🎯 GOAL: ZERO FORK, PURE PLUGINS

The graph is **already 100% implemented as a plugin** in `packages/gui-plugins/src/spacegraph/`. Only **3 small app-side files** remain fork-specific. Once upstreamed, the entire feature works as a standard built-in plugin and can be distributed externally.

```
┌─────────────────────────────────────────────────────────────────┐
│  PLUGIN-ONLY ARCHITECTURE                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────┐    ┌─────────────────────────────┐   │
│   │  @opencode/plugin   │◄───│  gui-plugins/src/spacegraph/  │   │
│   │  (SDK + Registries) │    │  • MapSurface                 │   │
│   │  • SessionSurface   │    │  • HybridSurface              │   │
│   │  • ctx.surfaces     │    │  • TurnMapLayer               │   │
│   │  • SessionLayer     │    │  • SidePanel (Inspector)      │   │
│   │  • SettingsPage     │    │  • Settings                   │   │
│   │  • Panel/Command    │    │  • Commands + Keybinds        │   │
│   │  • Store.session    │    │  • Permalinks, Export         │   │
│   └─────────┬───────────┘    │  • Custom Transcript          │   │
│             │                └─────────────────────────────┘   │
│             │                            │                      │
│             │          ┌─────────────────┴─────────────────┐   │
│             │          │     session-graph (library)        │   │
│             │          │  • GraphView, Toolbar, Inspector  │   │
│             │          │  • Windows, Breadcrumbs, Search   │   │
│             │          │  • Minimap, A11y                  │   │
│             │          │  • Imports @spacegraphjs/renderer │   │
│             │          └──────────────────────────────────┘   │
│             │                            │                      │
│             ▼                            ▼                      │
│   ┌─────────────────────────────────────────────────────┐      │
│   │  APP SIDE (3 files to upstream)                     │      │
│   │  • packages/app/src/runtime/plugin/surfaces.ts      │      │
│   │  • packages/app/src/session/surface.tsx             │      │
│   │  • packages/app/src/session/screen.tsx (integration)│      │
│   └─────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ REMAINING WORK TRACKS

### Track A: Upstream the 3 App Seams (Blocker for Zero Fork)

| # | File | Purpose | Effort | Risk |
|---|------|---------|--------|------|
| A1 | `packages/app/src/runtime/plugin/surfaces.ts` | Surface ID persistence, ordering, resolution helpers | 15 min | None — pure helpers |
| A2 | `packages/app/src/session/surface.tsx` | `SessionSurfaceHost` — surface switching, transcript preservation, composer inset | 30 min | Low — self-contained component |
| A3 | `packages/app/src/session/screen.tsx` | Integration point — uses `SessionSurfaceHost` instead of old graph panel | 15 min | Low — delete old branch |

**Deliverable:** PR to upstream `dev` with these 3 files. Review packet in `docs/spacegraph/upstream-review.md`.

### Track B: External Plugin Distribution

| # | Task | Description | Effort |
|---|------|-------------|--------|
| B1 | **Extract `@opencode/plugin-spacegraph`** | Move `gui-plugins/src/spacegraph/` to a standalone plugin package (same code, different entry) | 2 hrs |
| B2 | **Vite preset for external plugins** | Create `@opencode/plugin-vite-preset` or document manual setup so external plugins get HMR, chunking, i18n | 4 hrs |
| B3 | **Publish to npm** | `npm publish @opencode/plugin-spacegraph` (or GitHub Packages) with proper peer deps | 1 hr |
| B4 | **Extension marketplace entry** | Add to Extensions › Plugins with install button, screenshots, changelog | 1 hr |
| B5 | **Delete built-in registration** | Remove `spacegraph` from `gui-plugins/src/{main,renderer}.ts` — external plugin takes over | 10 min |

**Key insight:** The built-in plugin **is** the external plugin. Two registration lines in `gui-plugins/src/{main,renderer}.ts` is the entire fork cost. Deleting them makes the external package the only source.

### Track C: Clean Development Workflow

| # | Task | Description | Effort |
|---|------|-------------|--------|
| C1 | **`bun run dev:spacegraph`** | Single command: starts app + Storybook + plugin HMR (no mock server needed for UI work) | 1 hr |
| C2 | **Component test isolation** | `mountSpacegraphSurface(id)` fixture — loads only spacegraph plugin, not full host | 2 hrs |
| C3 | **Chunk-level preloading** | Separate `onIdle` preloads for Inspector, Windows, Settings chunks | 30 min |
| C4 | **Plugin-scoped keybind discovery** | Add `suggested: true` to commands for palette discoverability | 10 min |
| C5 | **HMR for graph UI** | Extract `GraphView`, `Inspector`, `Windows` to `@opencode/spacegraph-ui` (Vite + HMR), import from plugin | 4 hrs |

### Track D: Polish & Harden (Post-Human Testing)

| # | Task | Description | Trigger |
|---|------|-------------|---------|
| D1 | **Settings page e2e test** | Verify Settings > Session > Session Map renders and persists | Human feedback |
| D2 | **Export file download test** | Verify SVG/JSON/HTML produce valid downloads | Human feedback |
| D3 | **Mobile hybrid arrangements** | Test Stacked/Side/Floating on narrow viewports | Human feedback |
| D4 | **Permalink cold-load test** | `#graph:layout:node` from fresh tab | Human feedback |
| D5 | **Accessibility audit** | Screen reader, keyboard, reduced motion, high contrast | Human feedback |

### Track E: T2.2 Evidence Study (Optional, Stop-Rule Governed)

| # | Task | Description |
|---|------|-------------|
| E1 | **Recruit n ≥ 5** | Counterbalanced, canonical fixture, 5 investigative tasks |
| E2 | **Run protocol** | Measure success, time, wrong turns, preference (1–7), quotes |
| E3 | **Publish RFC** | Honest result — if graph doesn't beat transcript, stop feature work |
| E4 | **Decision** | Proceed with upstream PRs only if evidence positive |

---

## 📋 PRIORITIZED EXECUTION ORDER

```
WEEK 1 (Upstream & Distribute)
├── A1, A2, A3  →  PR to upstream dev (3 files, ~1 hour total)
├── B1          →  Extract @opencode/plugin-spacegraph package
├── B2          →  Document Vite preset (or create minimal one)
├── B3          →  Publish to npm/GitHub Packages
├── B4          →  Marketplace entry
└── B5          →  Delete built-in registration (gui-plugins)

WEEK 2 (DevEx & Polish)
├── C1          →  bun run dev:spacegraph
├── C2          →  mountSpacegraphSurface fixture
├── C3          →  Chunk preloading
├── C4          →  Suggested keybinds
└── D1–D5       →  As human testing surfaces issues

WEEK 3+ (Optional)
├── C5          →  HMR extraction (if dev velocity demands)
└── E1–E4       →  T2.2 only if stakeholder requests
```

---

## 🏗️ PLUGIN ARCHITECTURE DETAILS

### Plugin Structure (`@opencode/plugin-spacegraph`)

```
plugin-spacegraph/
├── package.json                    # name, peerDependencies: @opencode/plugin, @opencode/session-ui, spacegraphjs
├── src/
│   ├── index.ts                    # Plugin.define({ stores, i18n, contracts? })
│   ├── contract.ts                 # (none needed — uses SDK registries only)
│   ├── renderer.tsx                # Plugin.Setup — contributes surfaces, commands, panels, settings
│   ├── model.ts                    # createSpacegraph(ctx) — session store + prefs
│   ├── settings.tsx                # SpacegraphSettings component
│   ├── panel.tsx                   # Side panel (SessionMapPanel)
│   ├── map-surface.tsx             # SessionSurface: MapSurface
│   ├── hybrid-surface.tsx          # SessionSurface: HybridSurface
│   ├── turn-map-layer.tsx          # SessionLayer: TurnMapLayer
│   ├── i18n/
│   │   └── en.ts                   # All copy
│   └── lazy/                       # Heavy UI behind lazy()
│       ├── SpacegraphPanel.tsx
│       ├── SpacegraphSettings.tsx
│       ├── Inspector.tsx
│       └── Windows.tsx
├── vite.config.ts                  # Extends @opencode/plugin-vite-preset
└── README.md                       # Install, configure, develop
```

### Vite Preset for External Plugins

```ts
// @opencode/plugin-vite-preset
export default defineConfig({
  plugins: [solid()],
  build: {
    lib: { entry: 'src/renderer.tsx', formats: ['es'], fileName: 'plugin' },
    rollupOptions: {
      external: ['solid-js', '@opencode/plugin/gui', '@opencode/session-ui', 'spacegraphjs'],
      output: { globals: { 'solid-js': 'SolidJS' } }
    }
  },
  resolve: {
    alias: { '@opencode/plugin/gui': '/path/to/plugin/src/gui' } // for HMR in dev
  }
})
```

### Development Workflow (Post-Extraction)

```bash
# In opencode repo (for core dev)
bun run dev:spacegraph          # Starts app + plugin HMR

# In plugin-spacegraph repo (for plugin dev)
bun run dev                     # Vite dev server with HMR
bun run build                   # Production bundle
npm publish                     # Release
```

---

## 🔄 UPSTREAM CONTRIBUTION STRATEGY

### The 3-File PR (Minimal, Reviewable)

**File 1:** `packages/app/src/runtime/plugin/surfaces.ts` (35 lines)
- Pure helpers: `sessionSurfaceID`, `selectSessionSurface`, `orderedSessionSurfaces`, `resolveSessionSurface`
- No UI, no side effects, fully tested in `surfaces.test.ts`

**File 2:** `packages/app/src/session/surface.tsx` (95 lines)
- `SessionSurfaceHost` component
- Props: `{ session, screen, transcript, children? }`
- Handles: surface list from `ctx.add(SessionSurface)`, selection persistence, composer inset (`timeline.inset()`), render prop passes stable `transcript` element
- Tests: `surface.test.tsx` (component tests)

**File 3:** `packages/app/src/session/screen.tsx` (integration)
- Replace `SessionGraphView`/`SessionGraphPanel` branch with `<SessionSurfaceHost />`
- Delete `settings.experimental.sessionGraph` feature flag logic
- ~30 lines changed

### Why This Gets Accepted

| Concern | Mitigation |
|---------|------------|
| "Too much fork" | 3 files, <150 lines total, generic surface infrastructure (not graph-specific) |
| "Maintenance burden" | Plugin owns all graph code; app only hosts surfaces |
| "Feature flag" | No flag — surfaces register themselves; disabled = not loaded |
| "Breaking changes" | Additive only; `transcript` surface remains default |
| "Review overhead" | Self-contained PR with tests, review guide in `docs/spacegraph/upstream-review.md` |

---

## 📦 EXTERNAL PLUGIN PUBLISHING CHECKLIST

- [ ] **Peer dependencies** declared correctly:
  ```json
  "peerDependencies": {
    "@opencode/plugin": "workspace:*",
    "@opencode/session-ui": "workspace:*",
    "spacegraphjs": "workspace:*",
    "@spacegraphjs/renderer": "workspace:*",
    "@spacegraphjs/adapter": "workspace:*",
    "@spacegraphjs/spacegraph-renderer": "workspace:*",
    "@spacegraphjs/cytoscape-renderer": "workspace:*",
    "@spacegraphjs/svg-renderer": "workspace:*"
  }
  ```
- [ ] **No `@opencode/app`, `@opencode/desktop`, `@/` imports** (lint enforces)
- [ ] **Icon names** from generated `IconName` type (`bun run generate` in `packages/plugin`)
- [ ] **i18n** — English only in plugin; translations land separately
- [ ] **Store keys** namespaced: `plugin.spacegraph.<key>`
- [ ] **Command IDs** prefixed: `spacegraph.map`, `spacegraph.hybrid`, etc.
- [ ] **Panel keys** use `BuiltinPanel.legacy` for migration if renaming
- [ ] **Settings page** at `Settings > Session > Session Map`
- [ ] **README** with install, config, screenshots, keybinds

---

## 🛡️ RISKS & MITIGATIONS

| Risk | Mitigation |
|------|------------|
| Upstream rejects surface PR | Keep as 3-file fork seam; plugin still works built-in |
| External plugin API gaps | Plugin uses only stable SDK (`SessionSurface`, `ctx.surfaces`, `Panel`, `Command`, `SettingsPage`, `Store.session`) — all shipping in v2 |
| HMR not working for external plugins | Vite preset documents alias + `server.fs.allow`; fallback: `bun run dev:live` in opencode repo |
| Bundle size | Graph chunk is 282 KB gzipped (lazy); Inspector/Windows separate chunks |
| T2.2 negative result | Stop rule respected — library remains publishable, plugin stays opt-in |

---

## 📝 MIGRATION NOTES (For Upstream Reviewers)

### What Changes for Users

| Before (Fork) | After (Plugin) |
|---------------|----------------|
| `settings.experimental.sessionGraph` flag | No flag — plugin loads automatically |
| Header toggle button | Command palette (`⌘⇧M` Map, `⌘⇧H` Hybrid, `⌘⇧T` Transcript) |
| Layout in global settings | Per-session in Session Map settings page |
| Permalinks in `graph-permalink.ts` | Plugin owns `#graph:` hash |
| Side panel in `SessionGraphPane` | Plugin `Panel` with `region: "side"`, mobile drawer |

### What Stays the Same

- Transcript remains default surface
- Session data model unchanged (no protocol/server changes)
- `session-ui/src/graph` pure model unchanged
- `session-graph` host package unchanged (imports renderer contract only)

---

## ✅ DEFINITION OF DONE (PLUGIN-ONLY)

| # | Criterion | Track |
|---|-----------|-------|
| 1 | 3 app seams PR'd to upstream `dev` | A |
| 2 | `@opencode/plugin-spacegraph` published to npm | B |
| 3 | Extension marketplace entry live | B |
| 4 | Built-in registration deleted from `gui-plugins` | B |
| 5 | `bun run dev:spacegraph` works for core dev | C |
| 6 | `mountSpacegraphSurface` fixture for component tests | C |
| 7 | All 8 smoke items pass on external plugin | B + D |
| 8 | Human testing complete, issues addressed | D |
| 9 | T2.2 executed (if stakeholder requests) | E |

---

## 📅 TIMELINE

| Phase | Target | Notes |
|-------|--------|-------|
| **Upstream PR + External Package** | **Week 1** | Tracks A + B (can parallelize) |
| **DevEx + Polish** | **Week 2** | Tracks C + D |
| **T2.2 (Optional)** | **Week 3+** | Track E — stop rule governs |

**Total to zero-fork: ~1 week** (vs months previously estimated).

---

## 🎯 WHY PLUGIN-ONLY IS SUPERIOR

| Dimension | Fork Approach | Plugin Approach |
|-----------|---------------|-----------------|
| **Upstream review** | Large, mixed diff | 3-file seam PR + external package |
| **Maintenance** | Fork sync burden | Plugin updates independently |
| **Distribution** | Fork clone only | `npm install @opencode/plugin-spacegraph` |
| **Dogfooding** | Must use fork | Works on released OpenCode |
| **Third-party plugins** | Can't reuse graph | Other plugins can `ctx.use(SpacegraphIpc)` |
| **Experimentation** | Blocks mainline | Plugin can iterate freely |
| **Rollback** | Git revert | Disable plugin / uninstall |

---

## 📌 NEXT IMMEDIATE ACTIONS

1. **Create upstream PR** with the 3 app files (`surfaces.ts`, `surface.tsx`, `screen.tsx` integration)
2. **Extract `plugin-spacegraph`** from `gui-plugins/src/spacegraph/`
3. **Add Vite preset documentation** (or minimal preset package)
4. **Publish and announce** external plugin
5. **Delete built-in registration** — the fork seam is gone

---

*This plan replaces the fork-centric TODO.21/22. The graph is a plugin; the fork was only 3 app files. Upstream them, publish the plugin, done.*