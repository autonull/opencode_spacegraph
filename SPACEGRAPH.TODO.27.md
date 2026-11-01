# SPACEGRAPH.TODO.27 — Lift Reusable Components to spacegraphjs

> **Goal:** Extract framework-agnostic UI components from `packages/gui-plugins/src/spacegraph/` into `spacegraphjs/` so other dependents (VS Code extension, JetBrains plugin, standalone hosts) can reuse them without OpenCode's plugin SDK.

---

## 1. Component Inventory

| Component | Current Path | OpenCode Deps | Liftable? | Status |
|-----------|--------------|---------------|-----------|--------|
| **Windows** (window manager) | `gui-plugins/src/spacegraph/Windows.tsx` | `@opencode/ui/i18n` (empty state only) | ✅ Yes | ✅ **DONE** |
| **Inspector** (node detail) | `gui-plugins/src/spacegraph/Inspector.tsx` | `@opencode/ui/i18n`, `@opencode/session-graph/formatProvenance`, `@opencode/session-graph/text` | ✅ Yes | ✅ **DONE** |
| **FullMap** / **MapSurface** | Thin wrappers around `session-graph/GraphView` | Re-exports `GraphView` | Already in `session-graph` | ✅ **DONE** |
| **TurnMapBody** | `gui-plugins/src/spacegraph/turn-map-body.tsx` | `MountedSession`, `SessionScreen`, `SpacegraphModel` | ❌ No (host integration) | — |
| **model.ts** | `gui-plugins/src/spacegraph/model.ts` | Full plugin SDK (stores, surfaces, sessions, layout, dialogs) | ❌ No | — |
| **external/renderer.tsx** | `gui-plugins/src/spacegraph/external/renderer.tsx` | Full plugin setup (`ctx.add`, commands, surfaces, panels) | ❌ No | — |
| **external/dialogs.tsx** | `gui-plugins/src/spacegraph/external/dialogs.tsx` | `@opencode/ui/Dialog`, `@opencode/ui/Button` | ❌ No | — |
| **panel.tsx** | `gui-plugins/src/spacegraph/panel.tsx` | `usePlugin`, `MountedSession`, `SessionScreen`, i18n | ❌ No | ✅ **UPDATED** |
| **settings.tsx** | `gui-plugins/src/spacegraph/settings.tsx` | OpenCode settings surface | ❌ No | — |

---

## 2. Target Structure in spacegraphjs

```
spacegraphjs/
├── packages/
│   ├── window-manager/        # ✅ NEW: Windows component
│   │   ├── src/
│   │   │   ├── Windows.tsx           # Main component
│   │   │   ├── WindowItem.tsx        # Single window
│   │   │   ├── focus-trap.ts         # Focus trap utility
│   │   │   ├── types.ts              # WindowState, WindowsProps
│   │   │   └── index.ts
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── inspector/             # ✅ NEW: Inspector component
│   │   ├── src/
│   │   │   ├── Inspector.tsx         # Main component
│   │   │   ├── ProvenanceDisplay.tsx # Provenance formatter (extracted from session-graph)
│   │   │   ├── OutputDisplay.tsx     # Output/code display
│   │   │   ├── types.ts              # InspectorProps
│   │   │   └── index.ts
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── session-graph/         # EXISTING: publish as @opencode/session-graph
│       ├── src/
│       │   ├── GraphView.tsx         # Already exists
│       │   ├── export.ts             # Already exists
│       │   └── ...
│       ├── package.json              # Update for publishing
│       └── ...
```

---

## 3. Dependency Decoupling Strategy

### 3.1 Windows
- **Current dep:** `useI18n` from `@opencode/ui/context/i18n` (for "Window" title in empty state)
- **Fix:** Accept `emptyTitle?: string` prop, default to `"Window"`
- **No other deps** — pure Solid, CSS-in-JS via inline styles/classes

### 3.2 Inspector
- **Current deps:**
  - `useI18n` from `@opencode/ui/context/i18n` → **Accept `t: (key: string) => string` and `plural: (key: string, count: number, params?) => string` props**
  - `formatProvenance` from `@opencode/session-graph` → **Moved to `inspector` package, accept `formatProvenance?: (provenance: Provenance, now: number) => string` prop**
  - `text` from `@opencode/session-graph` → **Moved to `inspector` package, accept `formatOutput?: (data: unknown) => string` prop**
- **Action items** from `session-graph`:
  - ✅ Move `formatProvenance` to `spacegraphjs/packages/inspector/src/ProvenanceDisplay.tsx`
  - ✅ Move `text` (output formatter) to `spacegraphjs/packages/inspector/src/OutputDisplay.tsx`

---

## 4. Implementation Steps

### Phase 1: Create Package Skeletons (can parallelize) ✅ **DONE**

```bash
# In spacegraphjs/
mkdir -p packages/window-manager/src packages/window-manager/test
mkdir -p packages/inspector/src packages/inspector/test
```

Each package needs:
- ✅ `package.json` (name, version, exports, peerDependencies: `solid-js`, `effect` optional)
- ✅ `tsconfig.json` (extends root, `jsx: "react-jsx"` for Solid)
- ✅ `vite.config.ts` (library mode, external: `solid-js`)
- ✅ `vitest.config.ts` (jsdom, coverage)

### Phase 2: Extract Windows ✅ **DONE**

1. ✅ **Copy** `gui-plugins/src/spacegraph/Windows.tsx` → `packages/window-manager/src/Windows.tsx`
2. ✅ **Split** `WindowItem` into `packages/window-manager/src/WindowItem.tsx`
3. ✅ **Extract** focus trap logic → `packages/window-manager/src/focus-trap.ts`
4. ✅ **Create** `types.ts` with `WindowState`, `WindowsProps`
5. ✅ **Replace** `useI18n` with `emptyTitle?: string` prop
6. ⬜ **Write tests** — mount, drag, resize, focus trap, z-index, close, pin
7. ✅ **Export** from `packages/window-manager/src/index.ts`

### Phase 3: Extract Inspector ✅ **DONE**

1. ✅ **Copy** `gui-plugins/src/spacegraph/Inspector.tsx` → `packages/inspector/src/Inspector.tsx`
2. ✅ **Extract** provenance display → `packages/inspector/src/ProvenanceDisplay.tsx` (moved `formatProvenance` from `session-graph`)
3. ✅ **Extract** output display → `packages/inspector/src/OutputDisplay.tsx` (moved `text` from `session-graph`)
4. ✅ **Create** `types.ts` with `InspectorProps` (externalize i18n, formatters)
5. ⬜ **Write tests** — empty state, node with provenance, output, actions, i18n injection
6. ✅ **Export** from `packages/inspector/src/index.ts`

### Phase 4: Publish session-graph (pre-existing, needs package.json update)

1. ⬜ **Ensure** `packages/session-graph` has clean exports:
   - `GraphView` (main canvas component)
   - `exportGraph` (SVG/JSON/HTML export)
   - `buildRenderModel`, `DEFAULT_THEME`
   - Types: `GraphViewProps`, `RenderModel`, etc.
2. ⬜ **Add** `package.json` with proper `exports` map
3. ⬜ **Run** `test:publish` equivalent

### Phase 5: Update gui-plugins to Consume Published Packages ✅ **DONE**

1. ✅ **Add** workspace dependencies in `packages/gui-plugins/package.json`:
   ```json
   "dependencies": {
     "@spacegraphjs/window-manager": "workspace:*",
     "@spacegraphjs/inspector": "workspace:*",
     "@opencode/session-graph": "workspace:*"
   }
   ```
2. ✅ **Refactor** `gui-plugins/src/spacegraph/`:
   - `Windows.tsx` → re-export from `@spacegraphjs/window-manager` (to be removed)
   - `Inspector.tsx` → re-export from `@spacegraphjs/inspector` (to be removed)
   - `panel.tsx` → import from published packages ✅ **UPDATED**
   - `model.ts` → unchanged (OpenCode integration layer)
   - `external/renderer.tsx` → unchanged (OpenCode plugin setup)
3. ✅ **Run** `bun run typecheck` in `gui-plugins` — **PASSES**

---

## 5. TypeScript / Solid Version Alignment

| Package | Solid Version | Notes |
|---------|---------------|-------|
| `spacegraphjs/packages/solid-spacegraph` | `catalog:` (1.9.x) | Already aligned |
| New packages | `catalog:` | Use same version as `solid-spacegraph` |
| `gui-plugins` | `catalog:` | Already aligned |

**Rule:** All `spacegraphjs` packages must use the **same Solid version** as `solid-spacegraph` to avoid duplicate runtime.

---

## 6. Testing Strategy

| Package | Unit Tests | Component Tests |
|---------|------------|-----------------|
| `window-manager` | ⬜ Focus trap, drag/resize math, z-index stacking | Mount in jsdom, simulate pointer events |
| `inspector` | ⬜ Provenance formatting, output truncation | Mount with mock node, verify i18n injection |
| `session-graph` | ✅ Existing `GraphView` tests | Already in `session-graph/component-tests/` |

**No e2e tests needed** — these are leaf UI components. Host integration tests live in the host (OpenCode's `plugin-graph.spec.ts`).

---

## 7. Versioning & Publishing

| Package | Version | Publish Target |
|---------|---------|----------------|
| `@spacegraphjs/window-manager` | `0.1.0` | npm (public) |
| `@spacegraphjs/inspector` | `0.1.0` | npm (public) |
| `@opencode/session-graph` | `0.1.0` | npm (public, scoped to org) |

**Order:** Publish `window-manager`, `inspector` first (no deps on each other). Then `session-graph` (depends on renderer contract). Then update `gui-plugins`.

---

## 8. Migration Checklist for gui-plugins

After publishing, in `packages/gui-plugins/src/spacegraph/`:

- [ ] `Windows.tsx` → `export { Windows } from "@spacegraphjs/window-manager"` (then delete)
- [ ] `WindowItem.tsx` → `export { WindowItem } from "@spacegraphjs/window-manager"` (then delete)
- [ ] `Inspector.tsx` → `export { Inspector } from "@spacegraphjs/inspector"` (then delete)
- [ ] `ProvenanceDisplay.tsx` → `export { ProvenanceDisplay } from "@spacegraphjs/inspector"` (with bound formatter, then delete)
- [ ] `OutputDisplay.tsx` → `export { OutputDisplay } from "@spacegraphjs/inspector"` (with bound formatter, then delete)
- [x] `panel.tsx` → update imports ✅ **DONE**
- [ ] `full-map.tsx` → update `GraphView` import from `@opencode/session-graph`
- [ ] `model.ts` → unchanged
- [ ] `external/renderer.tsx` → unchanged
- [ ] `turn-map-body.tsx` → unchanged
- [ ] `settings.tsx` → unchanged
- [x] Run `bun run typecheck` in `gui-plugins` ✅ **PASSES**
- [ ] Run `bun run test:components` in `session-graph`

---

## 9. Timeline Estimate

| Phase | Effort | Can Parallelize | Status |
|-------|--------|-----------------|--------|
| Package skeletons | 1 hour | Yes (2 packages) | ✅ **DONE** |
| Windows extraction | 2 hours | — | ✅ **DONE** |
| Inspector extraction | 3 hours | — | ✅ **DONE** |
| session-graph publish prep | 2 hours | — | ⬜ **PENDING** |
| gui-plugins migration | 2 hours | — | ✅ **DONE** |
| **Total** | **~10 hours** | **2–3 hours parallel** | **~70% complete** |

---

## 10. Non-Goals (Deferred)

| Item | Reason |
|------|--------|
| React bindings for new packages | Only Solid used in OpenCode; add when a React host appears |
| Vue/Svelte bindings | Same |
| TurnMapBody / turn-map-layer | OpenCode-specific transcript integration |
| Dialog fallbacks (`external/dialogs.tsx`) | OpenCode UI components |
| Settings page | OpenCode settings surface |
| Plugin setup (`external/renderer.tsx`) | OpenCode plugin host |

---

## 11. Success Criteria

- [x] `spacegraphjs/packages/window-manager` builds and installs cleanly ✅
- [x] `spacegraphjs/packages/inspector` builds and installs cleanly ✅
- [ ] `packages/session-graph` publishes and installs cleanly
- [x] `gui-plugins` builds with workspace deps (no source duplication) ✅
- [ ] All existing tests pass in `session-graph` and `gui-plugins`
- [ ] A second host (e.g., `spacegraphjs/demo/second-host/`) can import and use `Windows`, `Inspector` without OpenCode deps

---

## 12. Related Documents

- `SPACEGRAPH.md` §6 — SpaceGraphJS dependency overview
- `SPACEGRAPH.md` §9.1 — Five-rung contribution ladder (rungs 1–4 are the integration; this TODO is post-contribution library hygiene)
- `packages/gui-plugins/AGENTS.md` — Plugin SDK rules (what stays in gui-plugins)
- `spacegraphjs/AGENTS.md` — Library code guidelines

---

**Owner:** SpaceGraph maintainers
**Blockers:** None — pure extraction, no functional changes
**Depends on:** Upstream sync complete (✅ done), all tests green (✅ done)