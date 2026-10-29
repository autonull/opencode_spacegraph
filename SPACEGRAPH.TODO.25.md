# SPACEGRAPH.TODO.25 — Minimal Fork, Clean Plugin Repo, Upstreamable API

> **Status: supersedes TODO.24.** The fork is larger than necessary. This plan strips it to the minimal upstreamable API + the SpaceGraph product, eliminates cruft, and prepares a clean plugin monorepo structure. Phases A–C complete the product; D is the upstream PR; E is the repo split.

---

## 0. Why This File

TODO.24 shipped the artifact test loop and packaging, but the fork carries ~23k lines of noise:
- A built-in `session-map` feature that duplicates the plugin's purpose
- App-level integration glue (`screen.tsx`, `surface.tsx`, timeline/composer changes) that should use the API, not fork internals
- Unrelated test deletions and e2e tests for features we don't ship
- The `session-graph` library mixed into the fork instead of being a clean workspace package

**Core insight:** The fork only needs **7 small files (~180 lines)** to add `SessionSurface` to the Plugin API. Everything else is either the product (SpaceGraph + session-graph) or noise.

---

## 1. The Minimal Upstreamable API (Phase D)

These **7 files, ~180 lines** are the complete upstream PR. They add main-session-body replacement to the Plugin API without touching upstream product code.

### D1. Plugin API Types (`packages/plugin/src/gui/`)

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

### D2. Runtime Implementation (`packages/app/src/runtime/plugin/`)

| File | Change | Lines |
|------|--------|-------|
| `surfaces.ts` | Transcript surface, per-session selection, ordering, resolution | +35 |
| `host.tsx` | Expose `ctx.surfaces` getter | +20 |
| `surfaces.test.ts` | Unit tests for the API | +51 |

**Behavioral guarantees (documented in PR):**
- Surface switches keep transcript mounted (visibility/position only)
- Per-session selection persists across routing (keyed by `SessionRef.key`)
- Unknown surface ID → falls back to transcript
- Plugin surface list is reactive; host transcript is always first

### D3. Upstream PR Checklist

- [ ] Types are in `packages/plugin/src/gui/` (public API surface)
- [ ] Runtime is in `packages/app/src/runtime/plugin/` (internal, not exported)
- [ ] No breaking changes to existing `Panel`, `MobileView`, `Slot` APIs
- [ ] Tests pass in upstream CI
- [ ] Documentation: when to use `SessionSurface` vs `Panel` vs `MobileView`
- [ ] Example: a minimal plugin contributing a map surface

---

## 2. Product Code (Phases A–C — Complete, Keep)

These are **done and verified**. No changes needed.

| Phase | Task | Evidence |
|-------|------|----------|
| A | Artifact-level tests | `plugin-spacegraph.spec.ts` loads `dist/gui-experimental.cjs`; 3 frames (map, panel, dialog) |
| B | Package structure | `packages/plugins/spacegraph/` with `prepack`, `files: ["dist", "README.md"]` |
| C | One renderer, shared turn-map, hybrid uses host transcript | `external/renderer.tsx` owns all registrations; built-in only preloads |

**Verification (current):**
- `bun run graph:capture --mode=verify` → 3/3 frames pass
- `bun run graph:capture --mode=demo` → 38 frames fresh (2026-10-29)
- `bun run test` in `packages/plugins/spacegraph` → 2 pass
- Typecheck clean: `packages/plugins/spacegraph`, `packages/gui-plugins`, `packages/app`

---

## 3. Noise Elimination (Phase E — Strip the Fork)

### E1. Remove Built-in `session-map` (Duplicates Plugin)

**Delete entirely:**
```
packages/gui-plugins/src/session-map/
```
- `index.ts`, `model.ts`, `panel.tsx`, `renderer.tsx`, `i18n/en.ts`
- Registrations in `gui-plugins/src/main.ts`, `renderer.ts`
- Panel tab `session-map:map` — the plugin provides `spacegraph:map`

**Why:** The external plugin **is** the session map. A built-in duplicate confuses users and doubles maintenance.

### E2. Remove App-Level Integration Glue (Use the API, Not Fork Internals)

**Delete or revert to upstream:**
| File | Action |
|------|--------|
| `packages/app/src/session/surface.tsx` | Delete — host uses `Surfaces` API from plugin runtime |
| `packages/app/src/session/screen.tsx` | Revert — uses `ctx.surfaces` via the API, not fork types |
| `packages/app/src/session/timeline/*` changes | Revert — no fork changes needed for surfaces |
| `packages/app/src/session/composer/*` changes | Revert — unrelated to surfaces |
| `packages/app/src/settings/experimental/experimental.tsx` | Revert — only if session-map setting added |

**Principle:** App code should only call `ctx.surfaces` (the API). No imports from `gui-plugins/spacegraph` or `session-map`.

### E3. Remove Unrelated Test/E2E Noise

**Delete:**
```
packages/app/e2e/graph/                    # Entire dir — plugin captures via component tests
packages/app/test-browser/plugin-*.test.ts  # Deleted in fork, not our concern
packages/app/test-browser/selected-effect.test.ts
packages/app/test-browser/timeline-cache.test.ts
```

**Keep (product tests):**
```
packages/app/component-tests/plugin-spacegraph.spec.ts
packages/app/component-tests/plugin-spacegraph.fixture.tsx
packages/app/component-tests/plugin-host.fixture.tsx (revert to upstream + our fixture only)
packages/session-graph/component-tests/      # session-graph library tests
```

### E4. Clean `session-graph` as a Workspace Library

**Current state:** Full package with component tests, stories, benchmarks — mixed into fork.

**Target:** Clean workspace package at `packages/session-graph/` with:
- `src/` — canvas, hooks, UI components (what the plugin imports)
- `component-tests/` — only tests for the library itself
- `stories/` — Storybook for library components
- `package.json` — `"main": "src/index.ts"`, peer deps: `solid-js`, `effect`, `@opencode/ui`
- **No** e2e, no app integration, no fork-specific config

**Publish decision later:** Can stay `workspace:*` or publish as `@opencode/session-graph` if other plugins need it.

### E5. Restore Upstream Files (Revert Fork Divergence)

Run `git checkout upstream/dev --` for these, then re-apply only our API additions:
```
packages/app/src/runtime/plugin/host.tsx          # + our ctx.surfaces getter
packages/app/src/runtime/plugin/surfaces.ts       # new file (ours)
packages/app/src/runtime/plugin/surfaces.test.ts  # new file (ours)
packages/plugin/src/gui/context.ts                # + surfaces getter
packages/plugin/src/gui/host-apis.ts              # + Surfaces interface
packages/plugin/src/gui/registries.ts             # + SessionSurface, SessionLayer
packages/plugin/src/gui/icon-name.ts              # + map icon
packages/gui-plugins/src/main.ts                  # revert (remove session-map import)
packages/gui-plugins/src/renderer.ts              # revert (remove session-map import)
packages/gui-plugins/package.json                 # revert (remove session-map deps)
packages/app/vite.config.ts                       # revert
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
│  │  ├─ package.json        # peer: "@opencode/plugin": "*"
│  │  └─ README.md
│  └─ future-plugin/         # next plugin
```

### F2. Migration Steps

1. **Wait for upstream release** with `SessionSurface` API
2. **Init new repo** with the structure above
3. **Copy `packages/session-graph`** → `packages/session-graph` (cleaned per E4)
4. **Copy `packages/plugins/spacegraph`** → `packages/spacegraph` (update deps to `@opencode/plugin`, `session-graph: workspace:*`)
5. **Update `spacegraph` bundle entry** to import from `session-graph` workspace
6. **Publish** `@autonull/opencode-plugin-spacegraph` from the new repo
7. **Delete** `packages/plugins/spacegraph`, `packages/gui-plugins/src/spacegraph`, `packages/session-graph` from this fork
8. **This fork** → only the 7 API files + any remaining upstream PR work

---

## 5. API Growth (Non-Breaking, Generally Useful)

These are **optional enhancements** to the upstream PR that add value without complexity. Include if reviewers agree; else defer.

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
| 1 | **E1–E5** | Fork stripped to 7 API files + SpaceGraph + session-graph; `bun run graph:capture --mode=verify` passes |
| 2 | **D1–D3** | Upstream PR opened, reviewed, merged, released |
| 3 | **F1–F2** | New `opencode-plugins` repo publishes SpaceGraph; this fork deletes product code |
| 4 | **Archive** | This repo becomes "upstream PR reference + historical screenshots" or deleted |

**Parallelizable:** E1–E5 can start now. D1–D3 waits for E to produce a clean diff. F waits for upstream release.

---

## 7. Definition of Done

1. **Fork size** — `git diff upstream/dev..HEAD --stat` shows only the 7 API files + SpaceGraph product + session-graph library (< 5k lines added)
2. **Upstream PR** — Minimal, typed, tested, documented; merges without product code
3. **Product intact** — All 3 artifact frames + 38 demo frames pass; bundle publishes and installs
4. **No duplication** — No built-in session-map; plugin is the only map
5. **Clean separation** — App code only uses `ctx.surfaces` API; no fork-type imports in product
6. **New repo ready** — `opencode-plugins` structure defined; migration path documented

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Upstream rejects `SessionSurface` API | Keep fork; plugin works. Document API as "fork extension" in plugin README. |
| Upstream wants different design | API is small; iterate in PR. Core shape (`render({session, transcript})`) is solid. |
| `session-graph` too large for workspace | Publish to npm as `@opencode/session-graph`; plugin uses peer dep. |
| App regressions during E2–E3 cleanup | Run `graph:capture --mode=verify` after each revert; component tests catch breaks. |
| Lost e2e coverage | Component tests cover plugin; session-graph has its own component tests. App e2e is upstream's job. |

---

## 9. Immediate Next Actions (Can Start Now)

1. **E1** — Delete `packages/gui-plugins/src/session-map/` and its registrations
2. **E2** — Revert `screen.tsx`, `surface.tsx`, timeline/composer changes to upstream
3. **E3** — Delete `packages/app/e2e/graph/`, restore upstream test-browser files
4. **E4** — Clean `session-graph` package.json, remove app-specific config
5. **E5** — `git checkout upstream.dev --` for the 10 files listed, re-apply API additions
6. **Verify** — `bun run graph:capture --mode=verify` after each step

---

## 10. Appendix: Current vs Target Fork Diff

```
CURRENT (vs upstream/dev):     TARGET (vs upstream/dev):
+23k lines / -1.7k lines       +~180 lines (API) + ~8k (product)
├─ 178 files                     ├─ 7 API files
├─ session-map (built-in)        ├─ spacegraph plugin
├─ session-graph (full lib)      ├─ session-graph (clean lib)
├─ app integration glue          └─ (no app glue, no e2e noise)
└─ e2e/test noise
```

The target fork is **reviewable as an upstream PR** while still shipping a complete SpaceGraph product.