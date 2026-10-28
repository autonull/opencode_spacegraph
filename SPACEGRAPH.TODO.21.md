# SPACEGRAPH.TODO.21 — Minimal Plugin Architecture

> **Supersedes all previous TODO files.** This version eliminates artificial blockers, unifies seams, and prioritizes
> getting SpaceGraph into OpenCode with the smallest possible fork.

---

## 📍 PROGRESS (2026-10-28)

| Batch | State | Notes |
|-------|-------|-------|
| **0 — commit sync** | ✅ done | `44757e552b chore: sync upstream dev`; tag `spacegraph-baseline-20261028` |
| **1.1 — SessionSurface + layering** | ✅ seam landed | Registry, `ctx.surfaces` API, host rendering, per-session selection, host default, unit + host component test. Selection persistence deliberately deferred to 2.6. |
| **1.2 — TranscriptSurface protocol** | ✅ already present | `TranscriptScreen.activeMessageID/reveal` in `packages/plugin/src/gui/host-apis.ts`; host binds it in `packages/app/src/runtime/plugin/mounted-session.ts` and `packages/app/src/session/screen.tsx`. No bridge work remains. |
| **1.3 — scroll-preservation test** | ✅ done | `mountSessionSurface` fixture + component test switches transcript → map → hybrid → transcript; transcript mounts once and scroll restores. Host now restores reported scroll positions after a surface switch. |
| **2 — built-in GUI plugin** | 🔶 in progress | 2.1–2.4, 2.6, 2.8 landed: map, hybrid (3 arrangements), turn-map layer, basic side panel, settings (level/layout/depth/arrangement/side), commands (map/hybrid/transcript/level/layout/arrangement/side/turn-map/permalink/export). Remaining: 2.5 (side panel polish + Inspector/Windows), 2.7 (search/keybinds), 2.10 (arrangement scroll test, stories, capture matrix). |
| **3 — cutover** | ❌ pending | Blocked on 2 parity. |
| **4 — T2.2** | ❌ pending | Blocked on 3. |

### Landed for 1.1

- `packages/plugin/src/gui/registries.ts`: `SessionSurface`, `SessionLayer`, `SessionSurface` registry token.
- `packages/plugin/src/gui/host-apis.ts`: `Surfaces` (`list`, `current`, `select`).
- `packages/plugin/src/gui/context.ts`: `ctx.surfaces`.
- `packages/app/src/runtime/plugin/surfaces.ts`: host `transcript` default, per-session selection, ordering/fallback.
- `packages/app/src/runtime/plugin/host.tsx`: real `ctx.surfaces` backed by the plugin host's registry items.
- `packages/app/src/session/surface.tsx`: selected surface, host default fallback, layer rendering.
- `packages/app/src/session/screen.tsx`: session body now renders through `SessionSurfaceHost`; the old graph pane remains the host default during migration.
- Tests: `packages/app/src/runtime/plugin/surfaces.test.ts`; host integration row in `packages/app/component-tests/plugin-host.spec.ts`.

### Batch 1 carry-over

1. **Selection persistence**: plugin-chosen surfaces persist in `Store.session`; selection made outside the spacegraph commands (the host's in-memory map) still does not persist. Revisit if a generic surface picker lands.
2. **Fixture surface story**: `mountSessionSurface` covers mount, switch and scroll restore with the real host.
3. **Layer focus contract**: `TurnMapLayer` implements focus trap and Escape; add coverage with the arrangement test harness.

### Clarified next actions

- Batch 2.3 next: arrangement scroll test needs a gui-plugins component-test harness; app component tests cannot statically import gui-plugins sources without breaking the app TS project boundary.
- Batch 2.10 next: arrangement scroll test and capture matrix. Real-host map/hybrid render coverage landed.
- Keep the old graph pane as `SessionSurfaceHost.default` until 3.1; do not delete `packages/app/src/session/graph/*` yet.
- The plugin's MapSurface receives the same `transcript` element and hides it with `visibility`/position, never `display: none`.
- `SessionLayer` ids are scoped to their surface only; the host renders them inline above the surface body.

### Batch 2 current state (2026-10-28)

- `spacegraph` is a real built-in plugin with map, hybrid, turn-map layer, side panel (basic), settings, camera, permalinks.
- The built-in activation matrix (`plugin-graph.spec.ts`) passes with `spacegraph` included.
- The map now renders through `@opencode/session-graph`'s `GraphView`; depth, layouts, camera, search and export are owned by that renderer.
- Arrangement scroll preservation is reliable because `HybridSurface` keeps one DOM tree and only changes classes; a real-host render test covers both built-in surfaces, but arrangement cycling still needs coverage.

### Batch 2 remaining work (2026-10-28)

| Item | Status | Notes |
|------|--------|-------|
| **2.5 SidePanel** | 🔶 partial | Current `panel.tsx` renders `FullMap` but missing: active-turn highlight, reveal-to-transcript, compact parity polish, `Inspector.tsx`/`Windows.tsx` not implemented |
| **2.6 Settings** | ✅ complete | `settings.tsx` covers level, layout, depth, arrangement, side; all persisted to `Store.global` |
| **2.7 Commands** | 🔶 partial | Has map/hybrid/transcript, level, layout, arrangement, side, turn-map, permalink, export (svg/json/html); **missing**: search, header slot, keybinds |
| **2.8 Export** | ✅ complete | Commands for SVG/JSON/HTML export via `model.export()` using `@opencode/session-graph`'s `exportGraph` |
| **2.9 Workspace lens** | ⏭️ optional | Deferred, not blocking parity |
| **2.10 Tests** | 🔶 partial | Built-in activation, real-host map/hybrid render pass; **missing**: arrangement scroll test per arrangement, stories, capture matrix |
| **Inspector.tsx** | ❌ missing | Node detail inspector for side panel |
| **Windows.tsx** | ❌ missing | Window manager for graph (saved viewports) |

---

## ⚡ THE CORE INSIGHT

**Built-in plugins compile with the app — they do NOT go through the Vite preset.** The `@opencode/*` import
restriction only applies to *external* plugin bundles. We can ship SpaceGraph as a **built-in plugin today** with zero
model extraction, zero `@spacegraphjs/session-model` package, and zero external publishing.

The external plugin package is a *distribution concern*, not an architecture concern. Defer it.

---

## ⚡ REVISED CRITICAL PATH (4 BATCHES TO T2.2)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ BATCH 0 — COMMIT SYNC (done, committed + tagged)                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BATCH 1 — TWO GENERIC SEAMS (1–2 weeks)                                      │
│   1.1 SessionSurface (with built-in layering) — replaces map-only + hybrid   │
│   1.2 TranscriptSurface protocol (activeMessageID/reveal) — no special bridge│
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BATCH 2 — BUILT-IN GUI PLUGIN (full parity, 2 weeks)                         │
│   2.1 Skeleton + built-in registration (2 lines in fork)                     │
│   2.2 MapSurface (full map, transcript hidden but mounted)                   │
│   2.3 HybridSurface (transcript + map: stacked/side/floating)                │
│   2.4 TurnMap layer (on MapSurface, not a separate overlay)                  │
│   2.5 SidePanel (consumes model directly, no Contract needed)                │
│   2.6 Settings + Store.session persistence                                   │
│   2.7 Commands/keybinds + header slot + MenuItem                             │
│   2.8 Permalinks (plugin-owned hash) + Export (ctx.system.save)              │
│   2.9 Workspace lens via plugin server RPC (optional, degrades gracefully)   │
│   2.10 Tests/stories + perf parity matrix                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BATCH 3 — CUTOVER (delete old integration, 1 week)                           │
│   3.1 Delete packages/app/src/session/graph/* + protocol/server graph code   │
│   3.2 Re-baseline bundle/perf; plugin gate replaces graph gate               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BATCH 4 — EVIDENCE T2.2 (go/no-go)                                           │
│   Runs on the built-in plugin. Stop rule unchanged.                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
┌──────────────────────────────────┐  ┌───────────────────────────────────────┐
│ POST-T2.2 (if positive)          │  │ POST-T2.2 (distribution)              │
│   5.1 TUI part (OpenTUI)         │  │   6.1 Extract @spacegraphjs/          │
│   5.2 Real 3D/depth if validated │  │       session-model (for external)    │
│   5.3 Cross-session if validated │  │   6.2 External plugin package         │
│                                  │  │   6.3 Delete built-in registration    │
│                                  │  │   6.4 Upstream seam PRs (if any)      │
└──────────────────────────────────┘  └───────────────────────────────────────┘
```

**T2.2 runs in Batch 4 on the built-in plugin.** No model extraction, no external package, no Contract, no TUI.

---

## 0. LOCKED DECISIONS (MINIMAL SET)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Built-in plugin first** | Works on web + desktop today; no Vite preset restrictions; no model extraction needed |
| D2 | **Two seams only** | `SessionSurface` (with layering) + `TranscriptSurface` protocol. No separate `overlays` API. |
| D3 | **No Contract in v1** | Side panel is in the same plugin; imports model directly. Contract only for external consumers. |
| D4 | **Workspace lens = optional RPC** | `snapshot-cache` already degrades gracefully. Add RPC only if profiling shows it's needed. |
| D5 | **TUI deferred** | Adds OpenTUI, second renderer, second test matrix. Post-T2.2 only. |
| D6 | **External package deferred** | Distribution concern. Built-in is the product. |
| D7 | **Permalinks = plugin-owned hash** | `ctx.router` is read-only; plugin reads `location.hash` and calls `ctx.surfaces.select`. No app changes. |
| D8 | **Fork = 2 registration lines + 2 seams** | That's it. When seams land upstream, delete the registration. |

---

## 1. VERIFIED STATE (2026-10-28)

| Check | Result |
|-------|--------|
| `upstream/dev` merged | ✅ 122 commits, 1,698 files; 10 conflicts resolved |
| `gui-extensions` → `gui-plugins` | ✅ handled by git rename; SDK → `packages/plugin/src/gui` |
| `session-map` ported to fork | ✅ `packages/gui-plugins/src/session-map` on `@opencode/plugin/gui` |
| Typecheck | ✅ `app`, `gui-plugins`, `session-graph`, `session-ui`, `plugin` clean |
| `session-graph` imports `@opencode/*` | ✅ **Irrelevant for built-in** — compiles with app |
| Merge committed | ❌ staged, needs approval |

---

## 2. BATCH 0 — COMMIT THE SYNC

| # | Action |
|---|--------|
| **0.1** | ✅ Commit staged merge as `chore: sync upstream dev` (`44757e552b`) |
| **0.2** | ✅ Tag baseline: `spacegraph-baseline-20261028` |

**Do not start Batch 1 until 0.1 is done.**

---

## 3. BATCH 1 — TWO GENERIC SEAMS

### 3.1 `SessionSurface` Registry (with Layering)

**Problem:** Plugins can only contribute side panels. They cannot own the session body.

**API (`packages/plugin/src/gui/registries.ts`):**

```ts
interface SessionSurface {
  id: string
  title: string
  icon?: IconName
  order?: number
  /** Receives the stable transcript element + session/screen. */
  render(props: {
    session: MountedSession
    screen: SessionScreen
    transcript: JSX.Element
  }): JSX.Element
  /** Optional: layers rendered above the surface body (e.g., turn map, node windows). */
  layers?: SessionLayer[]
}

interface SessionLayer {
  id: string
  render(props: {
    session: MountedSession
    screen: SessionScreen
    surface: SessionSurface  // back-reference for coordination
  }): JSX.Element
}

export const SessionSurface = Registry.define<SessionSurface>("session.surface")

// Host API: ctx.surfaces
interface Surfaces {
  list(): SessionSurface[]          // reactive
  current(session: SessionRef): string
  select(id: string, session: SessionRef): void
}
```

**Host behavior (`packages/app/src/runtime/plugin/host-apis.tsx` + `screen.tsx`):**
- Transcript is constructed **once** and passed to the selected surface.
- **Map-only**: surface renders transcript as `invisible absolute` (preserves virtualizer/scroll).
- **Hybrid**: surface composes transcript + map in its render (stacked/side/floating are surface-internal).
- **Layers**: rendered in a portal above the surface body but inside the session panel; `TurnMap` is a layer.
- Switching surfaces: transcript element stays mounted; scroll survives.
- Selection persists per session (layout state initially; Batch 2.6 moves to `Store.session`).
- Host provides default `"transcript"` surface (renders only the transcript).

**Acceptance:**
- Fixture surface mounts, switches, restores; transcript scroll preserved.
- Map-only ↔ hybrid inside one surface preserves scroll.
- `ctx.surfaces.select` works from command + another plugin.
- Unit + component test; story with trivial surface + layer.

### 3.2 `TranscriptSurface` Protocol (No Special Bridge)

The host's default `"transcript"` surface **exposes** `activeMessageID()` and `reveal(messageID, partID?)` on its
returned element's ref, or via a context. A map surface calls `transcriptRef.current?.reveal(id)` to link a node.

**No `ctx.screen.transcript` API needed.** The transcript surface *is* the bridge.

**Acceptance:** Map surface reveals exact message/part; leaving map restores transcript scroll.

---

## 4. BATCH 2 — BUILT-IN GUI PLUGIN (FULL PARITY)

**Package:** `opencode-spacegraph/` (sibling to this repo, or in-repo package — same source).

```
opencode-spacegraph/
├── package.json          exports: ".", "./gui-experimental", "./tui" (stub), "./server"
├── vite.config.ts        # NOT used for built-in; only for external package later
├── src/
│   ├── index.ts          # Server part: WorkspaceSnapshot RPC (optional)
│   ├── rpc.ts            # WorkspaceSnapshot contract (optional)
│   ├── gui.tsx           # Plugin.define({ ...definition, setup, main })
│   ├── gui/
│   │   ├── definition.ts # stores + i18n
│   │   ├── window.tsx    # setup: provide surfaces, panels, slots, commands
│   │   ├── MapSurface.tsx      # SessionSurface: full map, transcript hidden
│   │   ├── HybridSurface.tsx   # SessionSurface: transcript + map (3 arrangements)
│   │   ├── TurnMapLayer.tsx    # Layer on MapSurface: capped turn subgraph
│   │   ├── SidePanel.tsx       # Panel region side; imports model directly
│   │   ├── Settings.tsx        # SettingsPage + Store.session
│   │   ├── Inspector.tsx / Windows.tsx
│   │   └── i18n/
│   └── server/
│       └── snapshot.ts   # WorkspaceSnapshot RPC implementation (optional)
```

| # | Item | Acceptance |
|---|------|------------|
| **2.1** | ✅ Skeleton + built-in reg | `packages/gui-plugins/src/spacegraph/{index,renderer}.tsx`; id `spacegraph` reserved in `gui-plugins/{main,renderer}.ts` |
| **2.2** | ✅ MapSurface | Full `GraphView`: levels, layouts, depth modes, camera, toolbar, hidden transcript |
| **2.3** | 🔶 HybridSurface | `stacked`/`side`/`floating` landed in one DOM tree so the transcript never moves; side start/end. Needs explicit scroll test per arrangement |
| **2.4** | ✅ TurnMapLayer | Layer on the map surface, capped `turnSubgraph`, focus trap, Escape, "Open full map"; command switches to map |
| **2.5** | 🔶 SidePanel | `Panel` region side + mobile with `FullMap`. **Missing**: active-turn highlight, reveal-to-transcript, compact parity polish; `Inspector.tsx`/`Windows.tsx` not implemented |
| **2.6** | ✅ Settings + persistence | `Store.session` persists surface, level, layout, arrangement, side, depth, turn map, focused node; `Store.global` settings page edits defaults for level, layout, depth, arrangement, side |
| **2.7** | 🔶 Commands | Has: map/hybrid/transcript, level, layout, arrangement, side, turn map, permalink, **export (svg/json/html)**. **Missing**: search, header slot, keybinds |
| **2.8** | ✅ Permalinks + Export | `#graph:<layout>:<node>` cold-load restores layout, selects map, focuses and frames the node; **plugin has export commands** (svg/json/html via `model.export()`) |
| **2.9** | Workspace lens (optional) | Server part provides `WorkspaceSnapshot` RPC; GUI calls `ctx.client.rpc`; graceful absence |
| **2.10** | 🔶 Tests | Built-in activation, real-host map/hybrid render, and `model.test.ts` pass; **missing**: arrangement scroll test per arrangement, stories, capture matrix |

### 2.1a Built-in Registration (2 lines)

```ts
// packages/gui-plugins/src/main.ts
import spacegraph from "./spacegraph/main"  // or mainEntry
// ...
"spacegraph": spacegraph,

// packages/gui-plugins/src/renderer.ts
import spacegraph from "./spacegraph"
import spacegraphRenderer from "./spacegraph/renderer"
// ...
"spacegraph": { ...spacegraph, windowEntry: eager(spacegraphRenderer) },
```

**That's the entire fork delta for the GUI plugin.**

---

## 5. BATCH 3 — CUTOVER

| # | Action |
|---|--------|
| **3.1** | Delete `packages/app/src/session/graph/*`, header toggle, `graph-commands.ts`, layout fields, settings model, i18n, `snapshot-cache.ts`, stories |
| **3.2** | Delete `packages/protocol/src/groups/graph.ts`, `workspace-snapshot.ts`, `packages/server/src/graph/*`, `handlers/graph.ts`, generated client changes; run `bun run generate` |
| **3.3** | Re-baseline: entry delta, plugin bundle, lazy chunks, first paint; update `SPACEGRAPH.md` §7.3 |
| **3.4** | Plugin gate: model tests, plugin unit/component, app e2e, capture verify |

### Carry-over from TODO.20 (disposition)

| TODO.20 item | Disposition |
|--------------|-------------|
| **1.5** Hybrid scroll preservation | **Superseded**: transcript element stable by design. Parity test in 2.10. |
| **1.6** Flaky parallel scroll tests | **Rewrite** as visible-row assertions in new e2e (2.10). |
| **1.7** `graph-scale` turn cards | **Decide** overview policy in plugin; update story/test (2.10). |
| **Library publish/L1-L9** | **Post-T2.2** — not blocking parity. |

---

## 6. BATCH 4 — EVIDENCE T2.2

| Item | Protocol |
|------|----------|
| **4.1** | n ≥ 5, counterbalanced, canonical fixture, five tasks. Measure success, time, wrong turns, interactions, preference 1–7, quotes. |
| **4.2** | Stop rule: if graph doesn't beat transcript, **stop feature work**, publish finding, keep library + plugin as deliverable. |
| **4.3** | Docs truthfulness: `SPACEGRAPH.md` §3, §6.1, §7.1, §9.1 match plugin build; §7.3 traceable; `prototype.md` re-dated. |

**Build:** Batch 2 + 3 (built-in plugin). No TUI.

---

## 7. POST-T2.2 (ONLY IF POSITIVE)

| Track | Items |
|-------|-------|
| **Feature** | TUI part (OpenTUI outline + navigation); Real 3D/depth if validated; Cross-session if validated |
| **Distribution** | Extract `@spacegraphjs/session-model` (portable, no `@opencode/*`); External `opencode-spacegraph` package; Delete built-in registration; Upstream seam PRs (if maintainers want them) |

---

## 8. DEFINITION OF DONE (MINIMAL)

| # | Criterion | Batch |
|---|-----------|-------|
| 1 | Sync committed; baseline tagged | 0 |
| 2 | `SessionSurface` + layering + `TranscriptSurface` protocol implemented, tested | 1 |
| 3 | Built-in GUI plugin parity: map-only, hybrid (3), turn layer, side panel, permalinks, settings, persistence, export, mobile | 2 |
| 4 | Built-in registration works web + desktop | 2.1 |
| 5 | Old integration + protocol/server endpoint deleted; plugin gate green | 3 |
| 6 | T2.2 executed on built-in plugin; `rfc.md` + stop-rule | 4 |

---

## 9. WHAT WE ELIMINATED (AND WHY)

| Previous Plan Item | Why It's Gone |
|--------------------|---------------|
| `ctx.overlays` API | Turn map is a **layer on the MapSurface**, not a separate overlay system. One seam instead of two. |
| `ctx.screen.transcript` API | Transcript **is a surface**; it exposes `activeMessageID`/`reveal` directly. No special bridge. |
| `@spacegraphjs/session-model` extraction | **Not needed for built-in** — compiles with app. External package is post-T2.2. |
| `SessionGraph` Contract | **Not needed for v1** — side panel is same plugin, imports model directly. Contract only for external consumers. |
| Workspace lens RPC as required | `snapshot-cache` degrades gracefully. Add only if profiling demands it. |
| TUI in this cycle | Adds OpenTUI, second renderer, second test matrix. Post-T2.2. |
| External plugin package | Distribution concern. Built-in is the product. |
| Web GUI loader proposal | Built-in works on web today. Loader only needed for external plugins (post-T2.2). |
| Library L1-L9 cleanup | Not blocking parity. Post-T2.2. |

---

## 10. RISKS (HONEST)

| Risk | Mitigation |
|------|------------|
| Upstream rejects `SessionSurface` | Keep as thin fork seam (2 files: registry + host integration). Plugin still works built-in. |
| Layering inside surface has focus/escape bugs | Prototype `TurnMapLayer` first; if it fails, fall back to `ctx.dialogs` with `size: "x-large"` (accept smaller turn map). |
| Built-in registration is "too much fork" | It's 2 lines in generated files. Maintainers can review the *seams*, not the registration. |
| Permalink hash handling is fragile | Plugin owns the hash; cold-load reads `location.hash` → `ctx.surfaces.select`; no app router changes. |
| Two UI paths during migration | Feature-flag the plugin surfaces; keep old path until parity sign-off (3.1). |

---

## 11. IMMEDIATE NEXT ACTIONS

1. **Batch 0:** ✅ committed and tagged.
2. **Batch 1.1:** ✅ registry, host integration, fixture surface component test, scroll preservation landed. Persistence deferred to 2.6.
3. **Batch 1.2:** ✅ `TranscriptScreen` protocol already present; no work.
4. **Batch 1.3:** ✅ map-only ↔ hybrid transcript scroll preservation verified.
5. **Batch 2.1:** next implementation step; Batch 1 seams are green.

**Batch 1 is green; Batch 2 may start.**

---

## 12. MIGRATION NOTES (PRACTICAL)

### 12.1 Coexistence During Migration

- **Feature flag the plugin surfaces:** Add `settings.experimental.sessionGraphPlugin` (default `false`). When `true`, `screen.tsx` uses `ctx.surfaces.select("spacegraph.map")` instead of the old `graph.setMap()` path.
- **Old path stays until parity sign-off (Batch 3.1):** No big-bang cutover. Both code paths compile; tests run against both.
- **Session state migration:** `sessionGraphSchema` in layout store → `Store.session` in plugin. On first plugin load, read layout values and write to `Store.session`; then ignore layout `graph` field.

### 12.2 Component Test Migration

| Current | Plugin |
|---------|--------|
| `packages/session-graph/src/ui/*.stories.tsx` | Move to `opencode-spacegraph/src/gui/*.stories.tsx` |
| `GraphView` stories | `MapSurface` + `HybridSurface` stories with mocked `SetupContext` |
| `packages/stories/src/frame.tsx` provides `usePlugin` mock | Extend mock for `ctx.surfaces`, `ctx.layout.scroll`, `ctx.overlays` |
| `bun run test:components` | Runs in `packages/gui-plugins` (same harness) |

### 12.3 Capture Matrix

**Unchanged.** `bun run graph:capture` drives the running app via Playwright; the built-in plugin loads before the first frame. The 44-frame matrix (5 layouts × 4 depths × contexts) is identical.

### 12.4 Files Deleted in Cutover (Batch 3.1)

```
packages/app/src/session/graph/
├── graph-metrics-readout.tsx
├── graph-pane.tsx
├── graph-permalink.test.ts
├── graph-permalink.ts
├── graph-settings.tsx
├── graph-state.test.ts
├── graph-state.ts
├── session-graph-panel.tsx
├── session-graph-view.tsx
├── snapshot-cache.ts
├── turn-map-overlay.tsx
└── (stories)

packages/app/src/session/header/session-graph-toggle.tsx
packages/app/src/session/commands/graph-commands.ts
packages/app/src/shell/state/layout.tsx  ← graph field in layoutSchema
packages/protocol/src/groups/graph.ts
packages/protocol/src/workspace-snapshot.ts
packages/protocol/test/workspace-snapshot.test.ts
packages/server/src/graph/snapshot.ts
packages/server/src/graph/workspace.test.ts
packages/server/src/handlers/graph.ts
```

### 12.5 Files Added in Plugin (Batch 2)

```
opencode-spacegraph/src/gui/
├── definition.ts
├── window.tsx
├── MapSurface.tsx
├── HybridSurface.tsx
├── TurnMapLayer.tsx
├── SidePanel.tsx
├── Settings.tsx
├── Inspector.tsx
├── Windows.tsx
├── i18n/en.ts
└── (stories)
```

---

## 13. COMMANDS

```bash
# Sync / gate
bun run check
bun run graph:verify

# Focused
cd packages/plugin && bun run typecheck && bun run generate
cd packages/app && bun run typecheck && bun test src/session/graph
cd packages/gui-plugins && bun run typecheck && bun test

# Numbers
bun run graph:scale
bun run graph:capture --mode=verify
```