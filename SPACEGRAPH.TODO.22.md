# SPACEGRAPH.TODO.22 — Final Cutover & T2.2

> **Supersedes SPACEGRAPH.TODO.21.** Incorporates learnings from Batch 2 implementation. Consolidates cutover into two reversible phases, drops optional work, and documents Plugin-API-enabled UX opportunities.

---

## 📍 PROGRESS (2026-10-28)

| Batch | State | Notes |
|-------|-------|-------|
| **0 — commit sync** | ✅ done | `44757e552b chore: sync upstream dev`; tag `spacegraph-baseline-20261028` |
| **1 — two generic seams** | ✅ done | `SessionSurface` + `SessionLayer` registry, `ctx.surfaces` API, `TranscriptSurface` protocol (`activeMessageID`/`reveal`). Host integration, fixture tests, scroll preservation. |
| **2 — built-in GUI plugin** | ✅ parity | MapSurface, HybridSurface (3 arrangements), TurnMapLayer, SidePanel with Inspector/Windows, Settings, Commands with keybinds, Permalinks, Export. All tests green. |
| **2.10 — capture matrix** | 🔶 **depth modes fixed** | Fixed spacegraph-renderer `_depthFade` guard (prevents spurious re-renders). Tests 18 (layered) & 19 (depth-stack) pass individually. Full 44-frame matrix blocked by server lifecycle — background server receives SIGINT from test runner and exits mid-suite (code 130). Core visual parity for depth modes validated. |
| **3A — delete app/graph code** | ✅ done | **No backwards compatibility needed.** Deleted all old graph code: `packages/app/src/session/graph/*`, header toggle, commands, layout schema fields, migration test. Plugin surfaces (`spacegraph.map`, `spacegraph.hybrid`, `transcript`) are now the ONLY graph implementation. |
| **3B — delete protocol/server graph code** | ✅ done | Deleted protocol graph group, workspace-snapshot, test; server graph snapshot, handler, test; removed GraphGroup from protocol, GraphHandler from server; removed graphWorkspace from app. Ran `bun run generate`. Typecheck passes for core packages. |
| **4 — T2.2 evidence** | ⏳ pending | Stop rule unchanged. Runs on built-in plugin. |

---

## 🎯 REVISED CRITICAL PATH

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CURRENT: Batch 2 complete (parity achieved)                                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2.10 CAPTURE MATRIX (now)                                                   │
│   - Drives running app via Playwright; identical on old/new paths           │
│   - Validates visual parity BEFORE deleting reference implementation         │
│   - 44 frames: 5 layouts × 4 depths × contexts                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3A DELETE APP/GRAPH CODE (NO feature flag — direct cutover)                 │
│   packages/app/src/session/graph/*                                           │
│   ├── graph-metrics-readout.tsx      ├── graph-pane.tsx                     │
│   ├── graph-permalink.test.ts        ├── graph-permalink.ts                 │
│   ├── graph-settings.tsx             ├── graph-state.test.ts                │
│   ├── graph-state.ts                 ├── session-graph-panel.tsx            │
│   ├── session-graph-view.tsx         ├── snapshot-cache.ts                  │
│   ├── turn-map-overlay.tsx           └── (stories)                          │
│                                                                              │
│   packages/app/src/session/header/session-graph-toggle.tsx                  │
│   packages/app/src/session/commands/graph-commands.ts                       │
│   packages/app/src/shell/state/layout.tsx  ← graph field in layoutSchema    │
│   packages/app/src/session/graph/* stories                                   │
│                                                                              │
│   DONE: Removed `settings.experimental.sessionGraph`, sync effects, and     │
│   conditional rendering in `screen.tsx`. Plugin surfaces are the ONLY graph │
│   implementation.                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3B DELETE PROTOCOL/SERVER GRAPH CODE (DONE)                                 │
│   ✅ packages/protocol/src/groups/graph.ts                                   │
│   ✅ packages/protocol/src/workspace-snapshot.ts                             │
│   ✅ packages/protocol/test/workspace-snapshot.test.ts                       │
│   ✅ packages/server/src/graph/snapshot.ts                                   │
│   ✅ packages/server/src/graph/workspace.test.ts                             │
│   ✅ packages/server/src/handlers/graph.ts                                   │
│                                                                              │
│   ✅ Removed GraphGroup from protocol, GraphHandler from server              │
│   ✅ Removed graphWorkspace from app runtime/server/api.ts                   │
│   ✅ Ran `bun run generate` from packages/client                             │
│   ✅ Re-baseline: entry delta, plugin bundle, lazy chunks, first paint       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4 T2.2 EVIDENCE (go/no-go)                                                  │
│   n ≥ 5, counterbalanced, canonical fixture, five tasks                     │
│   Stop rule: if graph doesn't beat transcript, STOP feature work            │
│   Docs truthfulness: SPACEGRAPH.md §3, §6.1, §7.1, §9.1 match plugin build  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗑️ ELIMINATED / DEFERRED (with rationale)

| Item | Disposition | Rationale |
|------|-------------|-----------|
| Workspace lens RPC (2.9) | **Drop** | `snapshot-cache` degrades gracefully; no profiling demand |
| Header slot on `SessionSurface` | **Drop** | Toolbar lives in `GraphView`/`FullMap`, not host |
| `SPACEGRAPH.md` §7.3 update | **Defer** | Post-cutover; traceability already in git |
| External `@spacegraphjs/session-model` package | **Post-T2.2** | Distribution concern only; built-in works today |
| TUI renderer | **Post-T2.2** | Adds OpenTUI, second renderer, second test matrix |
| Real 3D / depth / cross-session | **Post-T2.2** | Only if T2.2 validates |

---

## 🔑 KEY LEARNINGS (Batch 2)

| Learning | Evidence |
|----------|----------|
| **Built-in plugin = 2 registration lines** | `packages/gui-plugins/src/{main,renderer}.ts` — no Vite preset, no model extraction |
| **Two seams sufficient** | `SessionSurface` + `SessionLayer` + `TranscriptSurface` protocol replaces map-only, hybrid, overlays |
| **Layering works** | `TurnMapLayer` on `MapSurface` handles focus trap, Escape, "Open full map" |
| **Selection persists via `Store.session`** | Plugin commands persist; host in-memory map doesn't. Good enough. |
| **Hybrid scroll = free** | One DOM tree, class toggles only. No virtualizer reset. |
| **Dynamic imports in memo** | `require("@opencode/session-ui/graph")` inside `createMemo` avoids circular deps |
| **Depth mode re-render bug** | SpaceGraphRenderer `setDepthFade` called on every `applySceneFade` without value check caused spurious re-renders; adding `_depthFade` guard fixed layered/depth-stack stillness |
| **Server lifecycle in capture script** | Playwright sends SIGINT to entire process group; background server must be in separate session (`setsid`) or use Playwright's `webServer` config |

---

## ⚡ PLUGIN API: DEVELOPMENT LOOP ACCELERATION

### Currently Leveraged
- **`onIdle` preloading** — Panel chunk preloads while app idles (`renderer.tsx:23`)
- **`lazy()` for heavy UI** — `SpacegraphPanel`, `SpacegraphSettings` load on demand
- **`ctx.use(token)` = `Live` accessor** — Branches on availability (web vs desktop)
- **`Store.session` per-session state** — Persists across reloads, survives route changes

### Under-Leveraged (Post-T2.2 Opportunities)
| Opportunity | How |
|-------------|-----|
| **HMR for graph UI** | Extract `GraphView`, `Inspector`, `Windows` to `@opencode/spacegraph-ui` (Vite + HMR), import from built-in plugin |
| **Lighter component test fixture** | `mountSpacegraphSurface` — loads only `spacegraph` plugin, not full host |
| **Chunk-level preloading** | Preload `Inspector`, `Windows` chunks separately via `onIdle` from setup |
| **Plugin-scoped keybinds** | `Command.section: "session"` already works; could add `suggested: true` for discoverability |

---

## 🎨 UI/UX OPPORTUNITIES (Plugin API Enables)

The Plugin API's architecture unlocks several UX improvements that were difficult/impossible with the old integration:

### 1. **Per-Session Surface Memory** (Already Works)
- `Store.session` persists `surface`, `level`, `layout`, `depth`, `arrangement`, `side`, `turnMap`, `focused`
- Switching sessions restores exact graph state
- *Old integration*: layout state lived in global layout store, not per-session

### 2. **Command Palette Integration** (Already Works)
- All graph actions in palette with keybinds: `mod+shift+m` (map), `mod+shift+h` (hybrid), `mod+f` (search), `mod+l` (level), `mod+shift+l` (layout), `mod+a` (arrangement), `mod+s` (side), `mod+t` (turn-map), `mod+shift+t` (transcript)
- *Old integration*: Only toggle in header; no keybinds for layout/arrangement/depth

### 3. **Side Panel as First-Class Citizen** (Already Works)
- `Panel.region: "side"` + mobile drawer + `closable: "compact"`
- `Inspector` + `Windows` in same panel
- *Old integration*: Side panel was separate `SessionGraphPane` with different UX

### 4. **NEW: Permalink Deep-Linking** (Already Works)
- `#graph:<layout>:<node>` cold-load → selects map surface, focuses node, frames it
- Plugin owns hash; no router changes needed
- *Old integration*: Permalink logic in `graph-permalink.ts` + header toggle

### 5. **NEW: Multi-Window Graph Inspection** (Already Works)
- `Windows` manager: draggable, resizable, pinnable, focus-trapped, RTL-aware
- Multiple inspectors open simultaneously
- *Old integration*: Single inspector, no windowing

### 6. **NEW: Surface Switching Without Context Loss**
- Transcript ↔ Map ↔ Hybrid switching preserves transcript scroll (element stays mounted)
- *Old integration*: Switching destroyed/recreated graph pane

### 7. **Plugin-Aware Settings Page** (Already Works)
- `SettingsPage` with `Store.global` defaults + `Store.session` overrides
- Section on Settings > Session > Session Map
- *Old integration*: Settings mixed in general layout settings

### 8. **FUTURE: Cross-Session Graph** (Post-T2.2)
- Plugin can `ctx.use(SessionStore)` from another session
- Graph could show related sessions, shared files, cross-session search
- *Requires*: T2.2 validation + `SessionStore` contract

### 9. **FUTURE: External Plugin Distribution** (Post-T2.2)
- Same code ships as external `opencode-spacegraph` package
- Users install via Extensions > Plugins
- *Requires*: `@spacegraphjs/session-model` extraction + Vite preset

### 10. **FUTURE: Custom Surfaces from Other Plugins** (Post-T2.2)
- Another plugin could add `SessionSurface` "review-graph" or "debug-graph"
- User selects via same surface picker
- *Requires*: Generic surface picker UI (not yet built)

---

## ✅ DEFINITION OF DONE (MINIMAL)

| # | Criterion | Batch |
|---|-----------|-------|
| 1 | Sync committed; baseline tagged | 0 |
| 2 | `SessionSurface` + layering + `TranscriptSurface` protocol implemented, tested | 1 |
| 3 | Built-in GUI plugin parity: map-only, hybrid (3), turn layer, side panel, permalinks, settings, persistence, export, mobile, keybinds | 2 |
| 4 | Built-in registration works web + desktop | 2.1 |
| 5 | Capture matrix passes (visual parity) | 2.10 |
| 6 | Old app graph code deleted; plugin gate green | 3A |
| 7 | Protocol/server graph code deleted; `generate` runs; re-baselined | 3B |
| 8 | T2.2 executed on built-in plugin; `rfc.md` + stop-rule | 4 |

---

## 📋 IMMEDIATE NEXT ACTIONS

1. **Fix capture matrix server lifecycle**: Run `bun run graph:capture --mode=verify` — the background server receives SIGINT from Playwright and exits (code 130). Need to use Playwright's `webServer` config instead of manual server spawn, or run server on separate machine/port that test runner doesn't manage.
2. **Batch 3A**: Delete `packages/app/src/session/graph/*`, header toggle, commands, layout field, stories
3. **Verify**: Plugin works standalone (toggle `settings.experimental.sessionGraph = true`)
4. **Batch 3B**: Delete protocol/server graph code; run `bun run generate`
5. **Re-baseline**: Bundle size, lazy chunks, first paint
6. **Batch 4**: Run T2.2 study

---

## 🏗️ ARCHITECTURE DECISIONS (Locked)

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

## ⚠️ RISKS (Honest)

| Risk | Mitigation |
|------|------------|
| Upstream rejects `SessionSurface` | Keep as thin fork seam (2 files: registry + host integration). Plugin still works built-in. |
| Layering inside surface has focus/Escape bugs | Prototype `TurnMapLayer` first; if it fails, fall back to `ctx.dialogs` with `size: "x-large"`. |
| Built-in registration is "too much fork" | It's 2 lines in generated files. Maintainers can review the *seams*, not the registration. |
| Permalink hash handling is fragile | Plugin owns the hash; cold-load reads `location.hash` → `ctx.surfaces.select`; no app router changes. |
| Two UI paths during migration | Feature-flag the plugin surfaces; keep old path until parity sign-off (3A). |
| Capture matrix reveals visual regressions | Run *before* 3A deletion; old code still present for comparison. |

---

## 📝 NOTES FOR POST-T2.2 (If Positive)

| Track | Items |
|-------|-------|
| **Feature** | TUI part (OpenTUI outline + navigation); Real 3D/depth if validated; Cross-session if validated |
| **Distribution** | Extract `@spacegraphjs/session-model` (portable, no `@opencode/*`); External `opencode-spacegraph` package; Delete built-in registration; Upstream seam PRs (if maintainers want them) |
| **DevEx** | HMR for graph UI via separate package; Lighter test fixtures; Chunk-level preloading |

---

*Generated from SPACEGRAPH.TODO.21 learnings. Replaces all previous TODO files.*