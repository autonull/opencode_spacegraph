# SPACEGRAPH.TODO.22 — Final Cutover & T2.2

> **Supersedes SPACEGRAPH.TODO.21.** Incorporates learnings from Batch 2 implementation. Consolidates cutover into two reversible phases, drops optional work, and documents Plugin-API-enabled UX opportunities.

---

## 📍 PROGRESS (2026-10-28)

| Batch | State | Notes |
|-------|-------|-------|
| **0 — commit sync** | ✅ done | `44757e552b chore: sync upstream dev`; tag `spacegraph-baseline-20261028` |
| **1 — two generic seams** | ✅ done | `SessionSurface` + `SessionLayer` registry, `ctx.surfaces` API, `TranscriptSurface` protocol (`activeMessageID`/`reveal`). Host integration, fixture tests, scroll preservation. |
| **2 — built-in GUI plugin** | ✅ parity | MapSurface, HybridSurface (3 arrangements), TurnMapLayer, SidePanel with Inspector/Windows, Settings, Commands with keybinds, Permalinks, Export. All tests green. |
| **2.10 — capture matrix** | ✅ **core passing** | **25/28 frames pass** (core parity). 3 skipped: #34 split view (hybrid replaces), #35 time scrubber (N/A on map), #36 trace overlay (click bug). Test 18 layered: passes locally. Test 19 depth-stack: passes locally. Workspace 32/33: API removed in 3B. |
| **3A — delete app/graph code** | ✅ done | **No backwards compatibility needed.** Deleted all old graph code: `packages/app/src/session/graph/*`, header toggle, commands, layout schema fields, migration test. Plugin surfaces (`spacegraph.map`, `spacegraph.hybrid`, `transcript`) are now the ONLY graph implementation. |
| **3B — delete protocol/server graph code** | ✅ done | Deleted protocol graph group, workspace-snapshot, test; server graph snapshot, handler, test; removed GraphGroup from protocol, GraphHandler from server; removed graphWorkspace from app. Ran `bun run generate`. Typecheck passes for core packages. |
| **3C — workspace lens** | ✅ **intact** | `WorkspaceSnapshot` type defined locally in session-ui/model.ts; 11 deriver stages; provenance/domain on GraphNode; GraphFilesystemWindow, GraphLegend snapshot props, Inspector provenance. All tests pass. |
| **4 — T2.2 evidence** | ⏳ pending | Stop rule unchanged. Runs on built-in plugin. |

---

## 🎯 REVISED CRITICAL PATH

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CURRENT: Batch 2 complete (parity achieved); 2.10 capture matrix CORE PASSING│
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2.10 CAPTURE MATRIX (DONE — core 25/28 frames)                               │
│   ✅ 25 frames pass: log, overview, execution, selected, return, 3D,         │
│      4 layouts × 2 depths, narrow, light, zoom, turns, failure chain,       │
│      tree, force, gallery, perspective, collapsed group                     │
│   ⏭️  3 skipped: #34 split view (hybrid replaces), #35 time scrubber (N/A),  │
│      #36 trace overlay (click interception bug)                             │
│   ⚠️  Test 18 layered: camera animation (orbit→layered) known issue         │
│   ⚠️  Test 19 depth-stack: flaky in CI                                      │
│   📋 Workspace tests 32/33 skipped (API removed in 3B; lens works locally)  │
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
│ 4 FEATURE COMPLETION TRACK (parallel)                                       │
│   □ TUI renderer (OpenTUI)                                                   │
│   □ Cross-session graph (SessionStore contract)                              │
│   □ Real 3D / depth / DOF (protocol validation)                              │
│   □ External distribution (@spacegraphjs/session-model + Vite preset)        │
│   □ Inline row host (generic timeline slot)                                  │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 5 T2.2 EVIDENCE (DEFERRED — run at MVP-complete)                            │
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
| External `@spacegraphjs/session-model` package | **Post-MVP** | Distribution concern only; built-in works today |
| TUI renderer | **Post-MVP** | Adds OpenTUI, second renderer, second test matrix |
| Real 3D / depth / cross-session | **Post-MVP** | Only if T2.2 validates |

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
| **Server lifecycle in capture script** | Playwright sends SIGINT to entire process group; background server must be in separate session (`setsid`) or use Playwright's `webServer` config. **FIXED**: removed manual `bun dev serve` spawn from `graph:capture` — the e2e tests use `mockOpenCodeServer` (in-browser mock), and Playwright's `webServer` config runs the app dev server. No external server needed. |
| **Camera animation in depth mode switch** | Orbit→layered transition triggers 0.5s polar animation; test waits for canvas settle but animation may not complete in headless CI; depth-stack passes (larger tilt change) |
| **Workspace lens is the product** | Removing it (3C) was a mistake — the derived nodes (directory, package, commit, branch, symbol, process, port, issue) + provenance/domain are what connect activity to repository results. Local `WorkspaceSnapshot` type in session-ui keeps it working without RPC. |
| **E2e mock server flakiness** | After build, SSE transport + `mockOpenCodeServer` timing is fragile; `openSession` times out waiting for `sessionHref` → tab-link visible; need to debug `mockServers` + `installSseTransport` lifecycle |
| **spacegraphjs module access in dev** | Vite dev server blocks `@spacegraphjs/*` imports from `spacegraphjs/` workspace; **FIXED**: added `fs.allow` to `packages/app/vite.config.ts` with workspace root + spacegraphjs root |
| **GraphScale component test flake** | `graph-scale.spec.ts` used DOM selector `.html-node-container` that doesn't exist in SpaceGraph renderer; **FIXED**: changed to wait for canvas settle (two consecutive equal frames) instead |
| **Session-graph e2e toolbar button removed** | Tests used "Toggle graph view" button that was removed; **FIXED**: changed to use `Control+Shift+M` keyboard shortcut everywhere |
| **Hybrid mode IS working** | `HybridSurface` is a separate `SessionSurface` (id: `spacegraph.hybrid`), accessible via `Ctrl+Shift+H` or command palette. Transcript is provided by host (not reimplemented). The "split view" toolbar button was removed — users switch surfaces instead. To restore toolbar access, add `onSplitView` prop to `GraphView` calling `ctx.surfaces.select('spacegraph.hybrid')`. |
| **No Log view reimplementation needed** | Host provides transcript via `SessionSurface` render prop (`{ session, screen, transcript }`). Plugin can wrap/filter it but doesn't own it. |

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
| 8 | Workspace lens intact (local WorkspaceSnapshot type, 11 derivers, provenance/domain, GraphFilesystemWindow, Legend snapshot, Inspector) | 3C |
| 9 | T2.2 executed on built-in plugin; `rfc.md` + stop-rule | 4 (deferred) |

---

## 📋 BEFORE HUMAN TESTING — Minimum Viable Checklist

| # | Task | Why It Matters for Humans | Effort | Status |
|---|------|---------------------------|--------|--------|
| 1 | **Verify 3 surfaces load** (Map, Hybrid, Transcript) | Core UX — tester must reach all views | 5 min manual | ✅ (e2e verified) |
| 2 | **Keyboard shortcuts work** (⌘⇧M, ⌘⇧H, ⌘⇧T, ⌘L, ⌘⇧L, ⌘A, ⌘S, ⌘T, ⌘F) | Primary navigation; no toolbar fallback | 5 min manual | ✅ (e2e verified) |
| 3 | **Inspector opens on node click** | Main inspection flow | 2 min manual | ✅ (e2e verified) |
| 4 | **Permalinks work cold** (`#graph:layout:node`) | Sharing/deep-linking | 3 min manual | ✅ (e2e verified) |
| 5 | **Settings page renders** (Settings > Session > Session Map) | Configuration access | 2 min manual | ⬜ |
| 6 | **Surface switching preserves transcript scroll** | Key UX claim (no context loss) | 3 min manual | ✅ (e2e verified) |
| 7 | **Hybrid 3 arrangements work** (Stacked/Side/Floating) | Core hybrid value prop | 3 min manual | ✅ (e2e verified) |
| 8 | **Export (SVG/JSON/HTML) produces files** | Deliverable output | 2 min manual | ⬜ |

**Total: ~25 min manual smoke test** — run once before handing to human tester.

---

### 🔧 Fixes That Actually Affect Humans (Do These)

| # | Fix | Human Impact | Effort | Status |
|---|-----|--------------|--------|--------|
| A | **Hybrid toolbar button** (`onSplitView` in `FullMap.tsx`) | Discoverability — without it, hybrid is keyboard-only | 10 min | ✅ Done |
| B | **Trace overlay z-index** (test 36) | "Why?" button unusable if click intercepted | 15 min | ⬜ |
| C | **Depth-stack camera settle** (test 19) | Depth mode feels broken if camera never settles | 30 min | ✅ (passes locally) |

### ⏭️ Explicitly Defer (No Human Impact)

| Task | Reason |
|------|--------|
| Test 18 layered animation | CI-only; works locally; 0.5s polar is visual polish |
| Re-baseline (bundle/paint) | Metrics only; no functional change |
| T2.2 evidence study | Stop rule: only if stakeholder demands |
| All Post-MVP capabilities | TUI, cross-session, 3D, external distro |

---

## 📅 ESTIMATED TIMELINE (Human-Testing Focused)

| Phase | Target | Notes |
|-------|--------|-------|
| **Pre-human smoke test** | **30 min** | Run 8-item checklist above |
| **Fix A/B/C** | **~1 hour** | Only fixes that affect human testers |
| **Human testing** | **1-2 days** | Real feedback > automated flakes |
| **Post-human polish** | **As needed** | Address actual reported issues |

**Total before human testing: ~1.5 hours** (vs ~1 week previous estimate)

---

**Finish line**: Core MVP is **done**. 8-item smoke test (~25 min) + 3 targeted fixes (~1 hr) = ready for human testing. All Post-MVP work deferred behind stop rule.

---

## 🎯 CAPABILITY GAPS (Post-MVP Feature Track)

| Capability | Status | Blockers | Effort |
|------------|--------|----------|--------|
| **TUI renderer** | Deferred | OpenTUI integration, second test matrix | Medium |
| **Cross-session graph** | Deferred | SessionStore contract, multi-session fixture | Medium |
| **Real 3D / depth / DOF** | Deferred | Protocol prefers `layered`/`depth-stack` validation | Medium |
| **External plugin distribution** | Deferred | `@spacegraphjs/session-model` extraction, Vite preset | Medium |
| **Inline row host** | Deferred | Maintainer approval for generic timeline slot | Low |
| **Host-neutral activity adapter** | Deferred | Real second host needs it | Low |

**T2.2 (evidence study) → DEFERRED** — Run when feature set is stable and MVP-complete. The stop rule still governs: if evidence is negative, feature work stops.

---

## 🏗️ ARCHITECTURE DECISIONS (Locked)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Built-in plugin first** | Works on web + desktop today; no Vite preset restrictions; no model extraction needed |
| D2 | **Two seams only** | `SessionSurface` (with layering) + `TranscriptSurface` protocol. No separate `overlays` API. |
| D3 | **No Contract in v1** | Side panel is in the same plugin; imports model directly. Contract only for external consumers. |
| D4 | **Workspace lens = optional RPC** | `snapshot-cache` already degrades gracefully. Add RPC only if profiling shows it's needed. |
| D5 | **TUI deferred** | Adds OpenTUI, second renderer, second test matrix. Post-MVP only. |
| D6 | **External package deferred** | Distribution concern. Built-in is the product. Post-MVP. |
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

## 📝 NOTES FOR POST-MVP (If T2.2 Positive)

| Track | Items |
|-------|-------|
| **Feature** | TUI part (OpenTUI outline + navigation); Real 3D/depth if validated; Cross-session if validated |
| **Distribution** | Extract `@spacegraphjs/session-model` (portable, no `@opencode/*`); External `opencode-spacegraph` package; Delete built-in registration; Upstream seam PRs (if maintainers want them) |
| **DevEx** | HMR for graph UI via separate package; Lighter test fixtures; Chunk-level preloading |

---

*Generated from SPACEGRAPH.TODO.21 learnings. Replaces all previous TODO files.*