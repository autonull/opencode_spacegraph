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

- [ ] Types in `packages/plugin/src/gui/` (public API surface)
- [ ] Runtime in `packages/app/src/runtime/plugin/` (internal reference implementation)
- [ ] No breaking changes to existing `Panel`, `MobileView`, `Slot` APIs
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
- Registrations in `gui-plugins/src/main.ts`, `renderer.ts` (remove imports and `compose` entries)
- Panel tab `session-map:main` — the plugin provides `spacegraph:map`

**Why:** The external plugin **is** the session map. A built-in duplicate confuses users and doubles maintenance.

### E2. Remove Unrelated Test/E2E Noise

**Delete:**
```
packages/app/e2e/graph/                    # Entire dir — plugin captures via component tests
packages/app/test-browser/plugin-*.test.ts  # Deleted in fork, restore upstream
packages/app/test-browser/selected-effect.test.ts  # Restore upstream
packages/app/test-browser/timeline-cache.test.ts   # Restore upstream
```

**Keep (product tests):**
```
packages/app/component-tests/plugin-spacegraph.spec.ts
packages/app/component-tests/plugin-spacegraph.fixture.tsx
packages/app/component-tests/plugin-host.fixture.tsx (minimal fixture for plugin tests)
packages/session-graph/component-tests/      # session-graph library tests
```

### E3. Clean `session-graph` as a Workspace Library

**Current state:** Full package with component tests, stories, benchmarks, app integrations — mixed into fork.

**Target:** Clean workspace package at `packages/session-graph/` with:
- `src/` — canvas, hooks, UI components (what the plugin imports)
- `component-tests/` — only tests for the library itself
- `stories/` — Storybook for library components
- `package.json` — `"main": "src/index.ts"`, peer deps: `solid-js`, `effect`, `@opencode/ui`
- **No** e2e, no app integration, no fork-specific config

**App integrations using session-graph:** None — the app doesn't import from session-graph. The plugin is the only consumer.

### E4. Revert All App Changes EXCEPT SessionSurface Implementation + Plugin Setting

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

**REVERT TO UPSTREAM (all other app changes):**
```
packages/app/src/runtime/plugin/link-check.ts      # Deleted → restore
packages/app/src/runtime/plugin/mobile.tsx         # Unrelated → restore
packages/app/src/runtime/plugin/mounted-session.ts # Unrelated → restore
packages/app/src/runtime/plugin/render.tsx         # Unrelated → restore
packages/app/src/workspaces/location.tsx           # Unrelated → restore
packages/app/src/session/commands/use-session-commands.tsx  # Unrelated → restore
packages/app/src/session/composer/go-limit-tray.tsx         # Deleted → restore
packages/app/src/session/composer/region.tsx       # Refactor → restore
packages/app/src/session/composer/timeline-actions.ts # Deleted → restore
packages/app/src/session/requests/session-question-dock-classic.tsx  # Unrelated → restore
packages/app/src/session/requests/session-question-dock-experimental.tsx # Unrelated → restore
packages/app/src/session/timeline/cache.ts         # Refactor → restore
packages/app/src/session/timeline/controller.tsx   # Minor → restore
packages/app/src/session/timeline/interaction.ts   # Unrelated → restore
packages/app/src/session/timeline/message-timeline.tsx # Unrelated → restore
packages/app/src/session/timeline/selected-effect.ts # Unrelated → restore
packages/app/src/session/timeline/turn-diffs.ts    # Unrelated → restore
packages/app/src/session/timeline/virtualizer.tsx  # Minor → restore
packages/app/src/session/usage-exceeded-dialogs.tsx # Unrelated → restore
packages/app/src/shell/routes/session-ui-provider.tsx  # Refactor → restore
packages/app/src/session/session-identity-header.tsx   # Accessibility → restore (separate PR)
packages/app/src/settings/experimental/experimental.tsx  # Trivial → restore
packages/app/src/runtime/i18n/en.ts                # session-map strings → restore (keep surface strings)
packages/app/src/runtime/persistence/schema.ts     # session-map schema → restore
packages/app/src/index.css                         # session-map styles → restore
packages/app/src/entry.graph-dev.tsx               # Dev entry → restore or delete
```

**Command to execute E4:**
```bash
# For each file above, restore from upstream:
git checkout upstream/dev -- <file>
# Then re-apply ONLY the SessionSurface changes to host.tsx, screen.tsx
# And re-apply ONLY the experimental.sessionGraph setting to settings/model.tsx
```

### E5. Restore gui-plugins Entry Points (Remove session-map only)

```bash
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
| 1 | **E1** | Delete `session-map`; verify `graph:capture --mode=verify` passes |
| 2 | **E2** | Delete e2e/graph, restore test-browser files; verify |
| 3 | **E3** | Clean `session-graph` package; verify its component tests pass |
| 4 | **E4** | Revert all app changes EXCEPT SessionSurface impl + plugin setting; verify |
| 5 | **E5** | Restore gui-plugins entry points; verify |
| 6 | **D1–D3** | Upstream PR opened, reviewed, merged, released |
| 7 | **F1–F2** | New `opencode-plugins` repo publishes SpaceGraph; fork deletes product |

**Parallelizable:** E1–E3 can start now. E4–E5 after. D waits for E to produce clean diff. F waits for upstream release.

---

## 11. Upstream Sync Strategy (During Cleanup)

Keep this fork closely synchronized with `upstream/dev` throughout E1–E5 to minimize merge conflicts and ensure the API diff stays minimal.

### Sync Workflow

```bash
# 1. Fetch latest upstream
git fetch upstream dev

# 2. Rebase this branch onto upstream/dev (preserves our commits on top)
git rebase upstream/dev

# 3. If conflicts — resolve ONLY the 9 API files + product code.
#    NEVER accept upstream changes to our API files; they are the PR.
#    For other files: prefer upstream (they're being reverted anyway).

# 4. Verify
bun install --frozen-lockfile
bun run graph:capture --mode=verify

# 5. Push updated branch
git push --force-with-lease origin upstream-sync-1025
```

### Sync Frequency

- **Before each E step** — ensures clean base
- **Weekly** — prevents large divergence
- **Before opening upstream PR** — final sync

### Conflict Resolution Rules

| File Category | Resolution |
|---------------|------------|
| 9 API files (D1–D3) | **Always keep fork version** — these ARE the PR |
| Product code (spacegraph, session-graph) | **Keep fork version** — our features |
| Revert-target files (E4 list) | **Take upstream** — we're reverting them anyway |
| New files (`surface.tsx`) | **Keep fork** — new implementation |
| `screen.tsx` (modified) | **Manual merge** — keep `SessionSurfaceHost` usage, accept upstream fixes |
| `settings/model.tsx` (modified) | **Manual merge** — keep `experimental.sessionGraph`, accept upstream fixes |

### Automation

Add a weekly CI job or local cron:
```bash
# .github/workflows/upstream-sync.yml (optional)
# Runs weekly, creates PR if clean rebase fails
```

This keeps the fork "review-ready" at any point — the diff vs upstream is always exactly our 9 API files + product.

---

## 7. Definition of Done

1. **Fork size** — `git diff upstream/dev..HEAD --stat` shows: 9 API files + SpaceGraph product + session-graph library (~10k lines added, not 23k)
2. **Upstream PR** — Minimal (D1–D2), typed, tested, documented; merges without product code
3. **Product intact** — All 3 artifact frames + 38 demo frames pass; bundle publishes and installs
4. **No duplication** — No built-in session-map; plugin is the only map
5. **Clean separation** — Plugin API in `packages/plugin/`; product in `packages/plugins/spacegraph`, `packages/gui-plugins/src/spacegraph`, `packages/session-graph`; host rendering in `packages/app/src/session/surface.tsx`
6. **New repo ready** — `opencode-plugins` structure defined; migration path documented

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Upstream rejects `SessionSurface` API | Keep fork; plugin works. Document API as "fork extension" in plugin README. |
| Upstream wants different design | API is small; iterate in PR. Core shape (`render({session, transcript})`) is solid. |
| `session-graph` too large for workspace | Publish to npm as `@opencode/session-graph`; plugin uses peer dep. |
| App regressions during E1/E4 cleanup | Run `graph:capture --mode=verify` after each step; component tests catch breaks. |
| Lost e2e coverage | Component tests cover plugin; session-graph has its own component tests. App e2e is upstream's job. |

---

## 9. Immediate Next Actions (Can Start Now)

1. **E1** — Delete `packages/gui-plugins/src/session-map/` and its registrations in `main.ts`/`renderer.ts`
2. **E2** — Delete `packages/app/e2e/graph/`; restore upstream test-browser files
3. **E3** — Clean `packages/session-graph/` to library-only (remove app-specific config)
4. **E4** — Revert all app changes except SessionSurface impl + plugin setting
5. **E5** — Restore gui-plugins entry points (remove session-map only)
6. **Verify** — `bun run graph:capture --mode=verify` after each step

---

## 10. Appendix: Current vs Target Fork Diff

```
CURRENT (vs upstream/dev):     TARGET (vs upstream/dev):
+23k lines / -1.7k lines       +~300 lines (API) + ~10k (product)
├─ 178 files                     ├─ 9 API files (D1-D3)
├─ session-map (built-in)        ├─ spacegraph plugin
├─ session-graph (full lib)      ├─ session-graph (clean lib)
├─ app integrations (scattered)  └─ (no app glue, no e2e noise)
└─ e2e/test noise
```

The target fork is **reviewable as an upstream PR** (9 files) while still shipping a complete SpaceGraph product with all app integrations.