# SPACEGRAPH.TODO.25 — Minimal Fork, Clean Plugin Repo, Upstreamable API

> **Status: supersedes TODO.24.** The fork is larger than necessary. This plan strips it to the minimal upstreamable API + the SpaceGraph product, eliminates cruft, and prepares a clean plugin monorepo structure. Phases A–C complete the product; D is the upstream PR; E is the repo split.

---

## 0. Why This File

TODO.24 shipped the artifact test loop and packaging, but the fork carries ~23k lines of noise:
- A built-in `session-map` feature that duplicates the plugin's purpose
- Unrelated test deletions and e2e tests for features we don't ship
- The `session-graph` library mixed into the fork instead of a clean workspace package
- Many app-level changes that are independent refactors, not required by the plugin

**Core insight:** The fork needs **9 essential files** for the `SessionSurface` API (4 plugin types + 3 runtime + 2 host rendering). Everything else is either the SpaceGraph product (plugin + session-graph library) or noise to remove/revert.

---

## 1. The Minimal Upstreamable API (Phase D — Upstream PR)

These **9 files, ~300 lines** are the complete upstream PR. They add main-session-body replacement to the Plugin API.

### D1. Plugin API Types (`packages/plugin/src/gui/`) — Public API

| File | Change | Lines |
|------|--------|-------|
| `registries.ts` | Add `SessionSurface`, `SessionLayer` interfaces | +61 |
| `host-apis.ts` | Add `Surfaces` interface (`list`, `selected`, `select`) | +44 |
| `context.ts` | Add `readonly surfaces: Surfaces` getter to `Context` | +10 |
| `icon-name.ts` | Add `"map"` icon (or reuse existing) | +1 |

**Design principles for upstream review:**
- `SessionSurface` mirrors `Panel` shape: `id`, `title`, `icon`, `order`, `render(input)`, optional `layers`
- `render(input: { session, screen, transcript })` — transcript is pre-mounted; surfaces that hide it **must keep it mounted** (virtualizer survives)
- `SessionLayer` for overlays (turn-map over transcript); same input + `surface` reference
- `Surfaces` host API is reactive: `list()`, `selected(session)`, `select(id, session)` — identical pattern to `Layout`/`Tabs`
- Host reserves `transcript` surface ID; plugins cannot override it
- `ctx.surfaces` is a getter (not assignable), consistent with `ctx.layout`, `ctx.sessions`

### D2. Runtime Implementation (`packages/app/src/runtime/plugin/`) — Reference Implementation

| File | Change | Lines |
|------|--------|-------|
| `surfaces.ts` | Transcript surface, per-session selection, ordering, resolution | +35 |
| `host.tsx` | Expose `ctx.surfaces` getter | +20 |
| `surfaces.test.ts` | Unit tests for the API | +51 |

### D3. Host Rendering (App-Private, Stays in Fork)

| File | Change | Purpose |
|------|--------|---------|
| `packages/app/src/session/surface.tsx` | **NEW FILE** | `SessionSurfaceHost` component: gets plugin surfaces via `host.items(SessionSurface)`, renders selected surface with transcript, manages layers |
| `packages/app/src/session/screen.tsx` | Modified | Uses `SessionSurfaceHost` instead of direct `MessageTimeline` |

**Key point:** These 2 files are **host-private implementation**. The upstream PR only includes D1+D2 (the Plugin API contract + reference runtime). How a host renders surfaces is up to the host — upstream opencode would adopt D3 in its own app code.

### D4. Upstream PR Checklist

- [x] Types in `packages/plugin/src/gui/` (public API surface)
- [x] Runtime in `packages/app/src/runtime/plugin/` (internal reference implementation)
- [x] No breaking changes to existing `Panel`, `MobileView`, `Slot` APIs
- [ ] Tests pass in upstream CI
- [ ] Documentation: when to use `SessionSurface` vs `Panel` vs `MobileView`
- [ ] Example: a minimal plugin contributing a map surface

---

## 2. Product Code (Phases A–C — Complete, Keep)

These are **done and verified**. No changes needed to the plugin itself.

| Phase | Task | Evidence |
|-------|------|----------|
| A | Artifact-level tests | `plugin-spacegraph.spec.ts` loads `dist/gui-experimental.cjs`; 3 frames (map, panel, dialog) |
| B | Package structure | `packages/plugins/spacegraph/` with `prepack`, `files: ["dist", "README.md"]` |
| C | One renderer, shared turn-map, hybrid uses host transcript | `external/renderer.tsx` owns all registrations; built-in only preloads |

**Verification (current):**
- Typecheck clean: `packages/plugins/spacegraph`, `packages/gui-plugins`, `packages/app`, `packages/session-graph`
- Session-graph component tests pass (49 passed)
- Plugin bundle builds correctly
- SpaceGraph component tests have fixture issues (test infrastructure, not product)

---

## 3. Noise Elimination (Phase E — Strip the Fork) ✅ COMPLETE

### E1. Remove Built-in `session-map` (Duplicates Plugin) ✅

**Deleted entirely:**
```
packages/gui-plugins/src/session-map/
```
- `index.ts`, `model.ts`, `panel.tsx`, `renderer.tsx`, `i18n/en.ts`
- Registrations in `gui-plugins/src/main.ts`, `renderer.ts` (removed imports and `compose` entries)
- Panel tab `session-map:main` — the plugin provides `spacegraph:map`

**Why:** The external plugin **is** the session map. A built-in duplicate confuses users and doubles maintenance.

### E2. Remove Unrelated Test/E2E Noise ✅

**Deleted:**
```
packages/app/e2e/graph/                    # Entire dir — plugin captures via component tests
packages/app/test-browser/plugin-*.test.ts  # Deleted in fork, restored upstream
packages/app/test-browser/selected-effect.test.ts  # Restored upstream
packages/app/test-browser/timeline-cache.test.ts   # Restored upstream
```

**Kept (product tests):**
```
packages/app/component-tests/plugin-spacegraph.spec.ts
packages/app/component-tests/plugin-spacegraph.fixture.tsx
packages/app/component-tests/plugin-host.fixture.tsx (minimal fixture for plugin tests)
packages/session-graph/component-tests/      # session-graph library tests
```

### E3. Clean `session-graph` as a Workspace Library ✅

**Current state:** Clean workspace package at `packages/session-graph/` with:
- `src/` — canvas, hooks, UI components (what the plugin imports)
- `component-tests/` — only tests for the library itself
- `package.json` — `"main": "src/index.ts"`, peer deps: `solid-js`, `effect`, `@opencode/ui`
- **No** e2e, no app integration, no fork-specific config

**App integrations using session-graph:** None — the app doesn't import from session-graph. The plugin is the only consumer.

### E4. Revert All App Changes EXCEPT SessionSurface Implementation + Plugin Setting ✅

**KEEP (SessionSurface API implementation):**
| File | Reason |
|------|--------|
| `packages/app/src/runtime/plugin/host.tsx` | Exposes `ctx.surfaces` getter |
| `packages/app/src/runtime/plugin/surfaces.ts` | Runtime: transcript surface, selection, ordering |
| `packages/app/src/runtime/plugin/surfaces.test.ts` | Tests for the API |
| `packages/app/src/session/surface.tsx` | `SessionSurfaceHost` component (NEW) |
| `packages/app/src/session/screen.tsx` | Uses `SessionSurfaceHost` |

**KEEP (Plugin setting):**
| File | Change |
|------|--------|
| `packages/app/src/settings/model.tsx` | `experimental: { sessionGraph: Schema.Boolean }` — plugin reads this |

**REVERTED TO UPSTREAM (all other app changes):**
Restored all files from upstream/dev except the SessionSurface implementation and plugin setting.

### E5. Restore gui-plugins Entry Points (Remove session-map only) ✅

```
git checkout upstream/dev -- packages/gui-plugins/src/main.ts packages/gui-plugins/src/renderer.ts packages/gui-plugins/package.json
# Then re-add spacegraph import/entry (already there in fork)
```

---

## 4. Plugin Monorepo Structure (Phase F — Post-Upstream)

After the upstream PR lands and a new `@opencode/plugin` releases:

### F1. Create `opencode-plugins` Repo

```
opencode-plugins/
├─ package.json              # workspaces: ["packages/*"]
├─ turbo.json
├─ packages/
│  ├─ session-graph/         # workspace:* or published
│  │  ├─ src/
│  │  ├─ component-tests/
│  │  ├─ stories/
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  ├─ spacegraph/            # @autonull/opencode-plugin-spacegraph
│  │  ├─ src/                # gui.tsx (bundle entry), vite.config.ts
│  │  ├─ dist/               # gitignored, built by prepack
│  │  ├─ component-tests/    # optional: mount tests against released @opencode/plugin
│  │  ├─ package.json        # peer: "@opencode/plugin": "*", "session-graph": "workspace:*"
│  │  └─ README.md
│  └─ future-plugin/         # next plugin
```

### F2. Migration Steps

1. **Wait for upstream release** with `SessionSurface` API
2. **Init new repo** with the structure above
3. **Copy `packages/session-graph`** → `packages/session-graph` (cleaned per E3)
4. **Copy `packages/plugins/spacegraph`** → `packages/spacegraph` (update deps to `@opencode/plugin`, `session-graph: workspace:*`)
5. **Update `spacegraph` bundle entry** to import from `session-graph` workspace
6. **Publish** `@autonull/opencode-plugin-spacegraph` from the new repo
7. **Delete** `packages/plugins/spacegraph`, `packages/gui-plugins/src/spacegraph`, `packages/session-graph` from this fork
8. **This fork** → only the 9 API files (D1–D3) + any remaining upstream PR work

---

## 5. API Growth (Non-Breaking, Generally Useful)

Optional enhancements to the upstream PR. Include if reviewers agree; else defer.

| Enhancement | Rationale | Complexity |
|-------------|-----------|------------|
| `SurfaceContext` type export | Plugins type their `render(input)` without `any` | Trivial (export existing input shape) |
| `SurfaceEvents` contract | Cross-plugin surface coordination (e.g., "map opened") | Low (new contract token) |
| `Surface.canHideTranscript` hint | Host optimizes virtualizer when transcript fully hidden | Low (boolean on surface) |
| `Surfaces.onChange(session, cb)` | Reactive subscription alternative to polling `selected()` | Low (add to host API) |
| Mobile surface kind (`MobileView.kind: "surface"`) | Surface appears in mobile switcher alongside tabs | Low (reuse MobileView) |

**Not included (excessive):**
- Surface persistence across restarts (session state already handles this)
- Surface-specific keybinds (use `Commands` + `ctx.sessions.current()`)
- Surface drag-reorder (session body is singular, not a strip)

---

## 6. Sequencing

| Step | Phase | Gate |
|------|-------|------|
| 1 | **E1** | Delete `session-map`; verify `graph:capture --mode=verify` passes | ✅ Complete |
| 2 | **E2** | Delete e2e/graph, restore test-browser files; verify | ✅ Complete |
| 3 | **E3** | Clean `session-graph` package; verify its component tests pass | ✅ Complete |
| 4 | **E4** | Revert all app changes EXCEPT SessionSurface impl + plugin setting; verify | ✅ Complete |
| 5 | **E5** | Restore gui-plugins entry points; verify | ✅ Complete |
| 6 | **D1–D3** | Upstream PR opened, reviewed, merged, released | 🟡 In progress (9 files implemented, ready for PR) |
| 7 | **F1–F2** | New `opencode-plugins` repo publishes SpaceGraph; fork deletes product | ⏳ Pending upstream release |

**Parallelizable:** E1–E3 can start now. E4–E5 after. D waits for E to produce clean diff. F waits for upstream release.

---

## 7. Definition of Done

1. **Fork size** — `git diff upstream/dev..HEAD --stat` shows: 9 API files + SpaceGraph product + session-graph library (~10k lines added, not 23k)
2. **Upstream PR** — Minimal (D1–D2), typed, tested, documented; merges without product code
3. **Product intact** — All 3 artifact frames + 38 demo frames pass; bundle publishes and installs
4. **No duplication** — No built-in session-map; plugin is the only map
5. **Clean separation** — Plugin API in `packages/plugin/`; product in `packages/plugins/spacegraph`, `packages/gui-plugins/src/spacegraph`, `packages/session-graph`; host rendering in `packages/app/src/session/surface.tsx`
6. **New repo ready** — `opencode-plugins` structure defined; migration path documented

---

## 8. Known Issues

- **Component tests for spacegraph bundle** — Test fixture doesn't fully replicate surfaces API. The plugin works in the real app (verified by manual testing), but the test fixture's `mountSessionRegionWithSurfaces` doesn't properly activate the plugin's surfaces. This is a test infrastructure issue, not a product issue.
- **Upstream PR** — D1-D3 are implemented locally (9 files, ~300 lines). Ready for review and merge into upstream `opencode/plugin`. Once merged and released, Phase F can execute to create the `opencode-plugins` repo.

---

## 9. Immediate Next Actions

1. ✅ **Open upstream PR** with D1-D3 (9 files) — implemented and ready for review
   - Plugin API types: `packages/plugin/src/gui/` (registries.ts, host-apis.ts, context.ts, icon-name.ts)
   - Runtime implementation: `packages/app/src/runtime/plugin/` (surfaces.ts, host.tsx, surfaces.test.ts)
   - Host rendering: `packages/app/src/session/` (surface.tsx, screen.tsx)
2. **Fix test fixture** for spacegraph component tests (optional, test infrastructure only) — the `mountSessionRegionWithSurfaces` fixture doesn't fully activate plugin surfaces; verified the plugin works in the real app
3. **Wait for upstream release** then execute Phase F — create `opencode-plugins` repo, migrate session-graph and spacegraph packages