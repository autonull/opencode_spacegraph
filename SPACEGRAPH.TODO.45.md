# SPACEGRAPH.TODO.45.md — The immersive agentic workspace plan

**Status (2026-11-19): r4 draft for review.** `SPACEGRAPH.TODO.44.md` (r8) closes the engineering
track: the fork is synced, every gate is green, and only owner sign-off remains. This plan is the
product track that follows it. It keeps the audit baseline (r0 of this file) and raises the target
from "a good graph view" to **an immersive, high-bandwidth workspace for agentic development**.

**North star.** *The session is a place you can see, enter and conduct.* A developer should be able
to watch an agent work, ask why it did something, verify the result, steer it, and hand the whole
story to a teammate — without losing the transcript and without learning a new vocabulary first.

**Extends:** `SPACEGRAPH.TODO.44.md`; `SPACEGRAPH.md`; `docs/spacegraph/scenarios.md`;
`docs/spacegraph/study-protocol.md`; `spacegraphjs/docs/capabilities.md`.
**Does not:** authorise a push or PR (TODO.44 §11.9 / §12.4); add Changesets; invent
backwards-compatibility aliases without sign-off (§10 R6).

---

## 0. Upstream sync record (done)

1. Fetched `upstream/dev`: `3dc66ab6e5` → `df313c5209` (34 commits).
2. One conflict, `packages/schema/src/config/flag.ts`: kept the seven `graph_*` keys, adopted upstream's
   `video_generate`/`full_codemode` copy and `optInOnly = ["todo"]`.
3. Merged → **`214cfea187`**. `bun run generate` in `packages/client` produced no diff;
   `packages/schema` typecheck clean (131 files). `upstream/dev` is an ancestor of HEAD.
4. No graph source was touched upstream. `bun.lock`/`package.json`/generated types auto-merged cleanly.

---

## 1. What "ultimate" means — measurable experience goals

| Goal | Target | How it is checked |
|------|--------|-------------------|
| Answer any of the five canonical questions | ≤ 3 interactions from open | Instrumented e2e + study counters |
| Orient in a 1,000-turn session | ≤ 2 s to "where am I / what is live" | Full-session index + minimap test |
| See the current agent action | Always visible, no scroll | Live HUD + follow mode test |
| Never lose the transcript | Scroll position preserved on every move | Existing e2e, extended to all surfaces |
| Keyboard-only parity | 100% of investigative tasks | Keyboard script + a11y tests |
| Pan / follow frame rate | ≥ 60 fps at 1440×900, 60-turn window | Perf harness (F-26) |
| First interaction after chunk load | < 100 ms | Perf harness |
| Legibility | No text < 13 px; WCAG AA both themes | Contrast + min-font assertions |
| Reachability | Every control has an effect; every failure explains itself | Dead-control + error-state audit |
| Trust | No unlabelled inference; confidence always named | Model + UI contract tests |

### 1.1 Experience invariants (design laws)

1. **The transcript is never lost.** Any graph surface is additive; exit always restores place.
2. **One action to causality.** A failure, file or retry leads to *why* in one gesture.
3. **Motion punctuates reading; it never replaces it.** Camera moves travel between reading beats.
4. **Focus + context over hiding.** Dim and distance, never silently delete.
5. **Every encoding is named.** Colour, dash, glow and size have a legend or a tooltip.
6. **Progressive disclosure over feature walls.** One recommended path; the rest on demand.
7. **Calm by default; attention on request.** No nagging, no persistent banners, no dead chrome.
8. **One owner per fact.** State, grammar, colour, budget and surface each have a single source.
9. **Legible or omitted.** If it cannot be read, it becomes a chip, a count or a notice.
10. **Measured, not asserted.** A claim ships with a number, a capture or a study result.

---

## 2. Modes of use

The product is one workspace with six modes. Each mode names a job, not a feature.

| Mode | Job | Entry today | Target |
|------|-----|-------------|--------|
| **Observe** | "What is the agent doing right now?" | Composer lens, `followLog` at turn boundary | Live follow, attention HUD, stream breathing |
| **Investigate** | "Why did this happen?" | Why / led-here / related traces | Graded focus, triage queue, one-action why |
| **Verify** | "Can I trust this change?" | Files rail + diff | Verified-writes overlay, checkpoint diff |
| **Conduct** | "Steer the work from here." | Composer widget | Context-attached compose, branch from node |
| **Share** | "Hand this to a teammate." | Permalink, export | Annotated handoff bundle, replay |
| **Learn** | "Explain this to me." | Lenses + inspector | Guided tour, storyboard, plain-language captions |

The hybrid remains the adoption bridge. The map remains the power surface. Neither replaces the log.

---

## 3. Use-case matrix

Source: the scenario catalogue and findings (`docs/spacegraph/scenarios.md`, `findings/*`,
`explorations/*`). ✅ served, ◐ partial/unvalidated, ✗ not served. Feature IDs point to §5.

| Persona | Job / question | Today | Target feature |
|---------|----------------|-------|----------------|
| Solo dev | Why did the build fail? | ✅ Why trace | F-07 |
| Solo dev | Which call caused it? | ✅ led-here | F-07 |
| Solo dev | Why was this file changed? | ✅ selector, no scenario | F-07 |
| Solo dev | What changed after the failure, and did it work? | ◐ downstream, no delta | F-08, F-10 |
| Solo dev | Keep working while the agent runs | ◐ stream-append follow; control hybrid-only | F-01, F-03, F-13 |
| Solo dev | Stay oriented in a long session | ◐ 60-turn tail | F-06, F-23 |
| Solo dev | Which attempt was better? | ✗ | F-09 |
| Reviewer | Verify the fix before merge | ✅ files + diff | F-10, F-11 |
| Reviewer | Was the change verified? | ✗ trust lens contested | F-11 |
| Reviewer | What was touched outside the task? | ◐ files rail | F-11, F-12 |
| Reviewer | Were approvals sound? | ✗ permissions not nodes | F-11 (permission lane) |
| Team lead | Audit a long session fast | ✅ matrix + compaction | F-23, F-27 |
| Team lead | Hand off with reasoning | ◐ permalink only | F-17 |
| Team lead | What did the run cost? | ✅ per-node cost lens | F-22 |
| On-call | Triage a failure | ✅ why + downstream | F-08, F-11 |
| On-call | Has this failure happened before? | ✗ cross-session deferred | F-19 |
| On-call | Triage from a phone | ◐ pill entry; no windows/compare/minimap | F-28 |
| New hire | Understand why a change was made | ◐ needs vocabulary | F-20 |
| Teacher | Explain agent behaviour | ◐ static export | F-18, F-20, F-21 |
| Researcher | Test graph vs transcript | ✗ study not run | Phase 0 |
| Researcher | Which layout helps? | ✗ unmeasured | F-27 |
| Researcher | Export structured data | ✅ RenderModel JSON | F-21 |
| Researcher | Analyse many sessions | ✗ deferred | F-19, F-22 |

---

## 4. SpaceGraphJS capability leverage

The library is far ahead of the host's use of it. Status: **✅** runtime · **◐** partial or type-only ·
**○** registered but no consumer · **✗** unused · **☠** imported only by the dead adapter.

**Two structural facts govern the whole matrix:**

1. `packages/session-graph/src/adapters/spacegraphjs-components.tsx` is the sole importer of
   `@spacegraphjs/{toolbar,controls,export,a11y}` and the `search/diff/turn-map/compare` components.
   Nothing imports that file and `src/index.ts` does not export it. Treat it as **dead code**: adopt one
   UI tree or delete it (Phase 2, task 6).
2. The renderer mounts with `chrome:false` (`spacegraph-renderer/src/index.ts`), so `HUD`, `Minimap`,
   `ZoomUI` and `ZoomBands` chrome never mounts, while `DEFAULT_SYSTEM_PLUGINS` (`Interaction`, `LOD`,
   `History`, `Physics`, `AutoColor`, `AutoLayout`, `Ergonomics`) still register and initialize
   (`LifecycleController.ts:74`; `defaults.ts:165-181`).

| Capability | Module / package | Used | Proposed use |
|------------|------------------|------|--------------|
| Semantic levels / zoom bands | `levels`, `zoom` | ✅ / ◐ | Keep level policy; adopt `ScaleDomain` for bands |
| Lane layout + strategies | `layout`, `@spacegraphjs/kernel` | ✅ | Keep; add density modes |
| Ribbon / matrix / log representations | `representations` | ✅ | Fix legibility, gate honestly |
| Representation ladder + playback | `representations/ladder`, `playback` | ✗ | Morph rungs with hysteresis; replay/storyboard (F-18) |
| Edge ladder (bundle→hair→arrow→ribbon) | `edges/ladder` | ✗ | Declutter + focus (F-05) |
| Search | `navigation/search`, `@spacegraphjs/search` | ✅ / ◐ | Keep headless; unify palette components |
| Minimap + follow frame | `navigation/minimap`, `Trail` | ✅ / ◐ | Fix hit-test; adopt `computeFollowFrame` (F-01, F-23) |
| Cross-scale descent | `navigation/descent` | ✗ | Turn→phase→tool→file policy without host vocabulary (F-23) |
| Controller (selection, focus, trail) | `control/GraphController` | ◐ | Spatial back/forward; one state owner (F-01, F-14) |
| Renderer binding | `control/GraphBinding` | ✗ | StrictMode/HMR-safe mount; adopt or delete |
| Accessibility mirror | `a11y` | ✅ | Keyboard-first repair (F-28) |
| Depth spectrum | `depth` | ◐ | Keep modes; adopt continuum/axes for lane/turn depth |
| Salience signals + channels | `salience` | ✗ | Attention system (F-02), graded focus (F-06) |
| Motion director + camera verbs | `motion` | ✗ | Follow, arrival breathing, replay (F-01, F-18) |
| World / LOD / instancing / sensory | `world` | ✗ | Scale + optional sensory cues (F-24) |
| LOD plugin | `LODPlugin` | ✅ | Keep; tune density (F-24) |
| Instanced node renderer | `rendering/InstancedNodeRenderer` | ○ | Dense overviews at one draw call (F-24) |
| HTML widgets | `widgets` | ✅ / ◐ | Expand inline reasoning/diff/terminal (F-04); adopt sizing/security helpers |
| Scoped overlay + subgraph | `overlays/ScopedOverlay`, `subgraph` | ✅ | Keyboard-safe dialogs, drill-down (F-06, F-10) |
| Code-diff renderer | `overlays/codeDiff` | ◐ | Adopt `renderCodeDiff`; remove host duplicate (F-04, F-10) |
| Vision analysers + autofix + asserts | `vision`, `VisionOverlayPlugin` | ✗ | CI/runtime quality gate (F-26) |
| Experiments (cartesian, neutral metrics) | `experiments` | ✗ | Layout/task harness (F-27) |
| History (undo/redo) | `HistoryPlugin` | ○ | Undo spatial edits + annotations (F-15) |
| Physics | `PhysicsPlugin` | ○ | Optional organic exploration lens (F-16) |
| Fractal zoom | `FractalZoomPlugin` | ✗ | Subgraphs inside nodes (F-25) |
| HUD / DOM overlay | `HUDPlugin`, `DOMOverlayPlugin` | ✗ | Live status (F-03); no second chrome tree |
| Mermaid / DOT / GraphML | `MermaidPlugin` | ✗ | Documentation export (F-21) |
| Trace classification | `@spacegraphjs/trace` | ✅ | Keep why/led-here/related (F-07) |
| Diff + compare | `@spacegraphjs/diff`, `compare` | ◐ / ☠ | Adopt headless diff/compare; remove host duplicate (F-09, F-10, F-19) |
| Turn-map package | `@spacegraphjs/turn-map` | ☠ | Host re-implements it; adopt or delete |
| Window manager / inspector | `@spacegraphjs/window-manager`, `inspector` | ✅ | Unify into a non-modal dock (F-15) |
| Toolbar / controls / export | `@spacegraphjs/toolbar`, `controls`, `export` | ☠ | Dead adapter; adopt one control tree or delete |
| Kernel query / walks / time-filter / history | `@spacegraphjs/kernel` | ✗ | Versioned snapshots + declarative traces; replace host time-travel buffers |
| Core query / algorithms / serialization | `spacegraphjs/core` | ✗ | Programmatic traversal and export (F-12, F-19) |
| Rich node library (Markdown, code, chart, controls) | `spacegraphjs/nodes` | ✗ | Rich inline content (F-04) |
| Edge library (flow, bundled, dynamic thickness) | `spacegraphjs/edges` | ◐ | Live flow + cost/thickness (F-02, F-04) |
| React / Solid bindings | `react-spacegraph`, `solid-spacegraph` | ✗ | Only for future surfaces; host uses `SessionGraph` |
| AutoColor / AutoLayout / Ergonomics fixers | `AutoColorPlugin`, `AutoLayoutPlugin`, `ErgonomicsPlugin` | ○ | Vision-driven repair and hit-target hints (F-26) |
| Second host | `demo/second-host` | ✅ | Contract proof; keep green |

**Boundary rule:** generic capability lands in `spacegraphjs` first; the host composes it. No
`renderer === "cytoscape"` branches, no host-only forks of library primitives.

**Consequence for the plan:** the host currently maintains two UI trees and several duplicated renderers
(diff, compare, turn-map, toolbar, search components). Every feature in §5 must either adopt the library
implementation or explicitly delete the dead adapter. "One concept, one implementation" is a Phase 2 gate.

---

## 5. Feature backlog

Priority: **P0** = required for the product claim; **P1** = high-value; **P2** = deliberate later.
Every feature names its use-case, its library leverage and its flag. Flags go in
`packages/schema/src/config/flag.ts`; fixes do not need one. A feature is not done until it is
reachable on every surface that declares it and localised (see §6.1).

### 5.1 Observe — live conduct

| ID | Feature | Serves | Leverage | Flag | Pri | Phase |
|----|---------|--------|----------|------|-----|-------|
| F-01 | **Live follow**: camera follows the newest node; pauses on user interaction; pins the composer; resumes on request | Keep working while the agent runs | `motion` director, `GraphController.focus`, `salience` | `graph_live_follow` | P1 | 4 |
| F-02 | **Attention system**: host signals (failure, retry, unverified write, cost spike, recency, user pin) → size/glow/status; explainable "why this is loud" | What needs me now | `salience`, `HUDPlugin` | extend `graph_attention` | P1 | 4 |
| F-03 | **Live status HUD**: current tool, elapsed, tokens/cost, queue, failures, follow state; jump to latest | Orientation at a glance | `HUDPlugin`/`DOMOverlayPlugin`, widgets | `graph_live_hud` | P1 | 4 |
| F-04 | **Inline live widgets**: reasoning summary, diff, terminal output, todo, subagent finding attached to nodes | Read without leaving the map | `widgets`, `MarkdownNode`/`CodeEditorNode`, `codeDiff.renderCodeDiff` | extend graduated widgets | P1 | 4 |
| F-05 | **Edge declutter ladder**: bundle → hair → arrow → ribbon by zoom/selection; 1-hop focus at execution | See structure, not spaghetti | `edges/ladder`, `representations` | `graph_edge_ladder` | P1 | 5 |

### 5.2 Investigate — causal bandwidth

| ID | Feature | Serves | Leverage | Flag | Pri | Phase |
|----|---------|--------|----------|------|-----|-------|
| F-06 | **Graded neighborhood focus (D1)**: BFS distance → opacity; multi-select by minimum distance; focus+context | Focus on what matters | `salience`, card emphasis, per-node renderer opacity | `graph_neighborhood` | P0 | 5 |
| F-07 | **Universal why**: file/error/retry/tool → why in one action; step-through; copy outline | Why did this happen | `@spacegraphjs/trace`, existing selectors | fix | P0 | 5 |
| F-08 | **Failure triage queue + since-failure delta**: rank unresolved failures; status new/investigated/fixed; show only changes after a failure | Triage fast; verify the fix | `GraphFailureProgress`, `salience`, filters | `graph_triage` | P1 | 5 |
| F-09 | **Attempt comparison**: align retries/forks by phase; structural + file diff; "which attempt worked" | Which attempt was better | headless `@spacegraphjs/diff`/`compare`, adopt or delete the dead adapter | `graph_attempts` | P2 | 5 |
| F-10 | **Checkpoint diff**: pick any two turns; changed/added/removed nodes and files; side-by-side | Verify a change window | `@spacegraphjs/diff`, kernel `graph-history`, `overlays/codeDiff` | `graph_checkpoint_diff` | P1 | 5 |
| F-11 | **Verified-writes overlay**: join writes → tests → results; verified / unverified / untested; permission lane for requests/grants | Can I trust this change | `salience`, `trace`, `levels` | `graph_verify` | P0 | 5 |
| F-12 | **Natural-language query**: local, explainable filters ("show failed tools", "what changed after the test") | Ask the map | `search`, `GraphController.search`, `nlq.ts` | `graph_nlq` | P2 | 5 |
| F-30 | **Agent-driven navigation**: "show me why" / "where did it fail" from a chat message, tool call or command opens the graph at the node with the trace already lit | Move from the conversation into the map | permalink grammar, `GraphController`, `@spacegraphjs/trace` | `graph_agent_nav` | P1 | 5 |

### 5.3 Conduct — steer from the map

| ID | Feature | Serves | Leverage | Flag | Pri | Phase |
|----|---------|--------|----------|------|-----|-------|
| F-13 | **Graph-native composer**: prompt from a node; attach selected nodes/edges as context; continue/branch from a checkpoint | Steer without leaving the map | `ComposerNodeWidget`, multi-select, controller | `graph_compose` | P1 | 4 |
| F-14 | **Unified command palette (`Mod+K`)**: every command, lens, surface, layout, search and recent action; fuzzy; keyboard-first | High-bandwidth control | `toolbar`, `controls`, controller search | `graph_command_palette` | P0 | 2 |
| F-15 | **Non-modal dock**: pin inspector, diff, terminal, failure queue; drag, snap, resize, close; undo/redo of spatial edits | Multi-threaded investigation | `window-manager`, `HistoryPlugin` | `graph_dock` | P1 | 2 |
| F-16 | **Guided suggestions**: contextual, dismissible ("3 failures, 1 fix attempt — investigate?"); optional organic physics lens | Discover the next move | `salience`, `HUD`, `PhysicsPlugin` | `graph_suggest` | P1 | 2 |

### 5.4 Share and learn

| ID | Feature | Serves | Leverage | Flag | Pri | Phase |
|----|---------|--------|----------|------|-----|-------|
| F-17 | **Annotated handoff bundle**: notes + pins + selected path + decision summary; export HTML/JSON/SVG + permalink | Hand off with reasoning | `widgets`, `export`, `@spacegraphjs/overlays` annotations, `svg-renderer` | `graph_handoff` | P1 | 7 |
| F-18 | **Replay / storyboard**: step through causal beats with plain-language captions; export | Explain and teach | `representations/playback`, `motion` | `graph_replay` | P1 | 7 |
| F-19 | **Cross-session compare + error fingerprint**: align two sessions; show prior occurrences and resolutions | Has this happened before | `@spacegraphjs/compare`, `InterGraphEdge`, kernel `time-filter` | `graph_cross_session` | P2 | 7 |
| F-20 | **Teaching tour**: first-run walkthrough; "explain this view"; recommended lens per goal | Onboard non-experts | `levels`, `overlays`, lenses | `graph_tour` | P1 | 2,7 |
| F-21 | **Mermaid / DOT / GraphML export**: session → diagram source for docs and PRs | Share in text form | `MermaidPlugin`, `svg-renderer` | `graph_mermaid_export` | P2 | 7 |
| F-22 | **Cost ledger**: per-session/subagent/turn attribution; team rollups; enforced budgets; threshold alerts | Know what it cost | cost lens, `prefs.budgets`, data | `graph_cost_ledger` | P2 | 7 |
| F-31 | **Read-only collaboration**: shared viewer URL, presence, pinned comments and a review queue on the same annotations | Review together | annotations store, `export`, `InterGraphEdge` | `graph_collab` | P2 | 7 |

### 5.5 Scale, performance and verification

| ID | Feature | Serves | Leverage | Flag | Pri | Phase |
|----|---------|--------|----------|------|-----|-------|
| F-23 | **Full-session index**: searchable index/minimap beyond the 60-turn window; jump with stable layout | Orient in 1,000 turns | `navigation/descent`, kernel `time-filter`/`walks`, `layout`, `minimap` | `graph_full_index` | P1 | 6 |
| F-24 | **LOD + instancing + world**: instanced overview, DOM detail, fog, optional sensory seam | Scale without losing legibility | `LODPlugin`, `InstancedNodeRenderer`, `world` | `graph_lod` | P1 | 6 |
| F-25 | **Fractal / progressive expansion**: subgraphs inside nodes; expand a subagent or turn in place | Open a cluster without losing place | `FractalZoomPlugin`, `navigation/descent` | `graph_fractal` | P2 | 6 |
| F-26 | **Quality harness**: perf (first paint, pan fps, memory) + vision (legibility, overlap, ergonomics) assertions in CI and a runtime overlay; wire `AutoLayoutPlugin`/`AutoColorPlugin` to the report | Prove it is fast and legible | `vision`, `VisionAutoFixer`, `createVisionAssert`, Vite plugin | dev-only | P1 | 8 |
| F-27 | **Layout/task experiment harness**: instrumented tasks per layout/depth; recommend a default | Decide with data | `experiments` | dev-only | P1 | 8 |

### 5.6 Accessibility, responsive and visual system

| ID | Feature | Serves | Leverage | Flag | Pri | Phase |
|----|---------|--------|----------|------|-----|-------|
| F-28 | **Parity**: keyboard-first, mobile/touch, reduced motion, high contrast, RTL, 200% zoom | Everyone | `a11y`, `input`, responsive breakpoints | fix | P0 | 1,2,7 |
| F-29 | **Design system**: tokens, typographic scale, semantic encoding, states, framing, motion spec | Aesthetic coherence | theme contract, `motion` | fix | P0 | 3 |

---

## 6. Audit baseline (r0 findings, kept)

Severity: P0 blocks ship/claim, P1 materially harms, P2 polish. Every finding was checked in source.

| ID | Sev | Finding | Evidence | Fix |
|----|-----|---------|----------|-----|
| UX-01 | P0 | Library hijacks global `Tab`; competing focus models | `spacegraphjs/src/plugins/InteractionPlugin.ts:389-396`; `AccessibilityLayer.ts:170-182` | Trap only inside the graph boundary; allow Tab-out |
| UX-02 | P0 | Camera keys collide with trace/undo; no modifier guard | `CameraControls.ts:37-57,511-519`; `useGraphKeyboard.ts:190-204,240-247` | Require graph focus + no modifiers |
| UX-03 | P0 | Dense, undiscoverable, conflicting key map | `useGraphKeyboard.ts:130-150,226-229`; `GraphFind.tsx:178-208` | `?` sheet, hover chips, remove duplicates |
| UX-04 | P1 | Modeless windows trap focus, claim dialog, overlap | `GraphWindows.tsx:65-112,126,240`; `graph-windows.tsx:31` | Non-modal region; collision placement |
| UX-05 | P1 | Inspector resize and minimap pointer-only | `GraphView.tsx:1952-1959`; `GraphMinimap.tsx:72-101` | Keyboard + ARIA |
| UX-06 | P1 | Turn-map drops focus, ignores scrim, no empty state | `turn-map-layer.tsx:26-64,83`; `dialogs.tsx:121-149` | Adopt polished `TurnMapOverlay` |
| UX-07 | P2 | Second double-click calls missing `flyBack()` | `InteractionPlugin.ts:458` | Use `zoomOut()`; drop `as any` |
| UX-08 | P0 | Contextual entry dead; `showSeeMapPrompt` always false | `model.ts:301-309`; `map-surface.tsx:101` | Implement F-16 |
| UX-09 | P1 | Capability overload; no guided first path | `composition-guide.md:47-68` | One recommended path + disclosure (F-20) |
| UX-10 | P1 | Renderer choice is dead setting, not toolbar | `SPACEGRAPH.md` §8.11; `model.ts:412` | Expose or remove |
| UX-11 | P1 | Narrow-screen entry gap; non-reactive pill | `screen.tsx:508-524`; `external/renderer.tsx:130-147` | F-28 |
| UX-12 | P2 | Hybrid arrangements rigid; no drag/dismiss/narrow fallback | `hybrid-surface.tsx:31-43,38` | Draggable divider + fallback |
| UX-13 | P0 | Documented 6.5 px label floor | `GraphView.tsx:128-133` | 13 px floor + pan/LOD |
| UX-14 | P0 | Overview ~60 % empty; faint lane labels | `02-graph-overview.png`; `known-issues.md:11` | Content-first fit; hide empty lanes |
| UX-15 | P0 | Light theme near-invisible | `14-graph-light.png` | WCAG AA tokens |
| UX-16 | P1 | Edge spaghetti; declutter caps at 200 | `03-graph-execution.png`; `WebGLRenderer.ts:33,319-344` | F-05 |
| UX-17 | P1 | Opacity fades multiply to ~0.05 | `cardTemplate.ts:418-437,473,487-494` | One composed opacity with floor |
| UX-18 | P1 | Detail tiers calibrated to 9 px | `detail.ts:34,50-57` | Raise to 13 px |
| UX-19 | P1 | Phase colours disagree; zoom-out/fit share icon | `GraphFind.tsx:447-455`; `cardTemplate.ts:67-73`; `GraphToolbar.tsx:896-917` | One token source; distinct icons |
| UX-20 | P1 | Depth/summary bar not enforced; 50 % capture override | `capture-overrides.json` | Fix or gate honestly |
| UX-21 | P1 | Capture set misses hybrid/plugin/mobile/loading/error | `capture-graph-demo.ts:65-104` | Expand verify set |
| UX-22 | P0 | Renderer/reduced-motion settings dead | `model.ts:412`; `settings.tsx:312-334,448-463` | Wire or remove |
| UX-23 | P0 | Renderer errors swallowed | `GraphError.tsx:13-19` | Show message + copy + back |
| UX-24 | P1 | Permalink grammars inconsistent; silent clipboard failure | `model.ts:454-462`; `graph-permalink.ts:20-76` | One writer, transitional readers |
| UX-25 | P1 | Two surface owners; lenses don't switch surface | `graph-layout.ts:5-55`; `screen.tsx:158-169` | One owner; lens declares surface |
| UX-26 | P1 | Hardcoded English in host/plugin/library | `GraphFind.tsx:425,460`; `settings.tsx:391-469` | i18n sweep + CI |
| UX-27 | P1 | Blank loading; silent export; dead clicks; stray menu | `GraphCanvas.tsx:272-276`; `model.ts:463-479`; `hybrid-surface.tsx:171-183` | Designed states; delete stray |
| UX-28 | P2 | Three card budgets; viewport-aware one dead | `levels.ts:67`; `dom-budget.ts:2-9`; `SessionGraph.tsx:140` | One table |
| UX-29 | P1 | Minimap hit-test wrong; edge selection empty | `MinimapPlugin.ts:138-159`; `SelectionManager.ts:78-80` | Canvas-local coords; implement/remove |
| UX-30 | P2 | Placeholder metadata; `DEFAULT_THEME` leaks | `side-overview.tsx:22-24`; `model.ts:477-478` | Tokens + real metadata |
| UX-31 | P0 | Product claim unproven; T2.2 not run | `prototype.md` evaluation protocol | Phase 0 |
| UX-32 | P1 | First paint/pan unmeasured; 2-turn fixture | `known-issues.md:8`; `fixture.ts:78-257` | F-26, F-27 |

### 6.1 Reachability and wiring (r3 feature inventory)

A feature can exist and still be unreachable. These are the wiring gaps between shipped code and a
user who can see it. Severity uses the same scale.

| ID | Sev | Finding | Evidence | Fix |
|----|-----|---------|----------|-----|
| RW-01 | P0 | **Filtering is partly cosmetic.** Quick-filter chips and the OR/AND compose toggle store state, but `applyFacets` ignores those fields, so the controls do nothing. Chips mount only on hybrid. | `GraphFilterChips.tsx:7`; `GraphToolbarViewControls.tsx:160`; `session-ui/src/graph/facets.ts:72-90` | Implement the grammar or remove the controls; mount on every surface |
| RW-02 | P0 | **Per-turn diff is silently absent.** `GraphDiff`/`GraphDetail` render diffs, but the plugin never supplies `diffSource` (zero occurrences under `gui-plugins/src/spacegraph`), so the section never appears. | `GraphDiff.tsx:30`; `GraphDetail.tsx:455` | Supply `diffSource`; assert a non-empty diff in e2e |
| RW-03 | P0 | **Follow mode is half-built and barely reachable.** It frames new nodes on stream and pulses a temporary focus highlight, but its control renders only in the hybrid View menu; map and panel pass `followMode` with no way to change it. There is no pause-on-interaction, composer pin or per-node breathing; `selectNewOnStream` is a separate inert switch. | `SessionGraph.tsx:1535-1576`; `GraphShowControl.tsx:138`; `hybrid-surface.tsx:171-185`; `map-surface.tsx:125`; `panel.tsx:267` | F-01 |
| RW-04 | P1 | **The attention score is computed, never shown.** The salience signal (tone/count/latest failure) and `smartEntry` exist, but no surface consumes the score; the visible red badge is status-based, not attention-based, and there is no toast, titlebar item or queue. | `internal/graph/attention.ts:31`; `model.ts:76,300-302`; `host-manifest.ts:17` | F-02, F-16 |
| RW-05 | P1 | **Surface parity is broken.** Windows are passed only by the map; panel and hybrid pass none, so minimap, compare, compaction, filesystem, find and `detailMode:"window"` are silent no-ops there. | `map-surface.tsx:41`; `panel.tsx:186`; `hybrid-surface.tsx:150`; `SessionGraph.tsx:1124-1127` | F-15; one dock on every surface |
| RW-06 | P1 | **Flags are not wired.** `graph_*` keys and a manifest negotiator exist, but runtime reads `prefs.capabilities`, which nothing writes; Settings exposes no capability toggles. Risky surfaces are on/off by code path. | `host-manifest.ts:14-31`; `model.ts:71`; `settings.tsx:63`; `flag.ts:23-29` | Read `Flag.enabled`; expose or delete each gate |
| RW-07 | P1 | **The in-graph palette is node search only.** `GraphSearch` accepts `palette`/`onAction`/`onLens`/`onSurface` and never uses them. | `GraphSearch.tsx:15-22` | F-14 |
| RW-08 | P1 | **Localization holes.** 166 `ui.sessionGraph.*` keys are referenced with no app-dictionary entry; several panels fall back to raw keys; some exist only in the plugin catalog. | `ui/src/i18n/en.ts`; `gui-plugins/src/spacegraph/i18n/en.ts` | Complete the dictionary; add a missing-key CI check |
| RW-09 | P1 | **Duplicated model and dead UI invite drift.** `gui-plugins/src/spacegraph/internal/graph` is a 53-file copy of `session-ui/src/graph`; only three files differ. Unused: `session-graph/src/gui/index.tsx`, `adapters/*`, `contract/*`, legacy `GraphView.tsx`, `GraphLayersControl`, `GraphQuestionsControl`, `GraphLineage`. | generated copy; `session-graph/src/index.ts` | One model, generated and gated; delete dead UI |
| RW-10 | P1 | **Handoff is thin.** Notes are a session store with no list, report or PR/issue export; export emits the render model only; trace back/forward history is passed down but never rendered. | `model.ts:575`; `export.ts:22`; `GraphDetail.tsx:623`; `GraphInspectorPanel.tsx:26` | F-17, F-07 |
| RW-11 | P2 | **Mobile parity.** No windows, compare or minimap; the file rail is dropped; only a bottom-sheet inspector remains. | `SessionGraph.tsx:2032` | F-28 |
| RW-12 | P2 | **No teaching layer.** First run shows a synthetic fixture and a demo banner; there are no tours or coach marks; help is the a11y instructions string. | `SessionGraph.tsx:585-591` | F-20 |
| RW-13 | P2 | **Frontier affordances absent:** agent-driven navigation from chat into the graph; turn-number jump beyond the 60-turn window and 32-snapshot buffer; checkpoint fork/resume; enforced token budgets; shareable read-only viewer URL. | `model.ts:141`; `prefs.budgets`; `time-travel.ts` | F-13, F-22, F-23, F-17 |

**Rule:** a feature is not done until it is reachable on every surface that declares it, localised in
the app dictionary, and backed by a test that fails if the wiring is removed.

**Strengths to preserve:** localised a11y mirror; confidence-labelled edges; honest 60-turn window;
append-only non-overlapping layout; constant-size labels; fit-relative camera clamps; hybrid
transcript linkage and text scaling; semantic theme tokens; transcript-safe error boundary.

---

## 7. Aesthetic system

Aesthetic perfection is a **system**, not a styling pass. It is defined once and enforced by tests.

### 7.1 Spatial composition

- Fit to *visible content* plus insets for toolbar, inspector and composer. No clipping, no content
  under chrome.
- Lane gutter and axis labels are **screen-fixed**, not world-space.
- Hide empty lanes; overview shows phase bands and cluster chips, not individual tools.
- Execution is focus + context: the selected neighbourhood stays full strength; the rest recedes to
  a floor, never disappears.
- Hybrid: draggable divider, dismissible floating panel, stacked fallback under 768 px.

### 7.2 Typography

- 13 px minimum for card labels; 11 px only for meta with AA contrast; `--line-height-compact` for 13 px.
- Monospace for commands, paths, token counts; tabular numerals for cost/time.
- Truncate with a tooltip and the full text in the inspector. Never shrink text to fit.

### 7.3 Encoding

- Semantic tokens only; no raw hue values.
- Phase palette is one source: explore, edit, verify, delegate, result, prompt.
- Confidence: explicit = solid; structural = dashed; inferred = dotted + lower opacity; legend names all.
- Status: success / warning / error / info; attention adds a single accent glow.
- Cost: sequential ramp; thickness may encode tokens (DynamicThicknessEdge).
- Light and dark are equal citizens; both meet WCAG AA.

### 7.4 Motion

- UI 150–250 ms; camera flights 400–600 ms; arrival stagger 60–80 ms; `spring.snappy`.
- Reduced motion emits final frames only.
- Follow mode moves between reading beats, then holds still.
- No gratuitous parallax, no auto-pan while the reader is reading.

### 7.5 Depth, density, chrome

- Flat is the default; layered is optional; orbit is experimental and labelled.
- Cards face the camera; fog is canvas-only, with a DOM-fog projection for widgets.
- Density: comfortable default, compact/cozy available; overview collapses to chips.
- Chrome: one toolbar row + overflow, one command palette, one status bar. No stray menus.

### 7.6 States

- **Loading:** skeleton with shimmer, not an empty div.
- **Empty:** guidance and the one action that starts work.
- **Error:** the real message, copy, report, back to transcript.
- **Offline/disconnected, permission denied, no selection, hidden-by-level:** each has a named state.

### 7.7 Acceptance checklist (per capture batch)

1. No text below 13 px at default fit.
2. WCAG AA text and graphics contrast in both themes.
3. Content fills the frame; no dominant empty region.
4. No edge label overlaps a card; declutter works beyond 200 edges.
5. No content opacity below the floor.
6. Phase/confidence/status colours agree across card, legend, find and export.
7. Every state (loading, empty, error, hidden) has a designed frame.
8. Motion respects reduced motion; no reading-beat camera move.
9. Hybrid, mobile, turn-map and plugin surfaces are captured.
10. A keyboard-only run completes the five questions.

---

## 8. Roadmap

Phases are ordered by user harm and dependency. Phase 0 is the critical path; Phases 1–3 may run in
parallel with it. Phases 4–7 are gated on a Phase 0 win, or ship explicitly as experimental.

### Phase 0 — Evidence gate (UX-31)

1. Confirm the video/story gate (`study-protocol.md` §8).
2. Run T2.2: n ≥ 5, counterbalanced, canonical fixture, five tasks; collect success, time, wrong
   turns, interactions, preference, quotes.
3. Apply the pre-registered stop rule; write `disposition.md`. Win → Hybrid-as-Entry RFC. Loss →
   publish the negative result, keep the library, and re-scope Phases 4–7 to library-only work.
4. Add the missing `SPACEGRAPH.md` §16 finding.

**Gate:** study artefacts committed; disposition signed; the product claim matches the result.

### Phase 1 — Truth, safety and focus (UX-01…07, 13, 15, 22, 23, 29; RW-01, RW-02; F-28 core)

1. Library: remove global `Tab` interception; unify focus with the a11y mirror; add the camera
   modifier/focus guard; fix `flyBack()`; canvas-local minimap hit-testing.
2. Host: show real renderer errors; wire or remove renderer/reduced-motion settings; 13 px floor;
   light-theme contrast; keyboard resize and minimap.
3. Plugin: adopt `TurnMapOverlay`; focus restore and scrim dismiss.
4. Remove or implement the two dead controls: facet chips/OR-AND (RW-01) and per-turn diff
   (RW-02, supply `diffSource`).

**Gate:** keyboard-only five tasks; Tab-out works; no key collisions; errors explain themselves; 13 px
and AA contrast assertions green; no dead control.

### Phase 2 — Ergonomics and command (UX-03…06, 08…12; RW-05…RW-09; F-14, F-15, F-16, F-20)

1. `Mod+K` unified palette over commands, lenses, surfaces, layouts, search and recent.
2. `?` shortcut sheet and hover chips; remove duplicate bindings.
3. Non-modal dock with drag/snap/resize/close; undo/redo for spatial edits.
4. Contextual, dismissible suggestions (`smartEntry`); first-run tour and recommended path.
5. Reactive, universal mobile switcher; draggable hybrid divider and narrow fallback.
6. One UI tree: adopt the library `toolbar/controls/search/diff/compare/turn-map` components or
   delete `adapters/spacegraphjs-components.tsx`; no second implementation of one concept.
7. Reachability sweep: windows on every surface (RW-05), palette actions (RW-07), wiring of every
   flag in use (RW-06), the 166 missing i18n keys (RW-08), and deletion of the dead UI/modules (RW-09).

**Gate:** every action is reachable from the palette; no focus traps; suggestions are dismissible and
never nag; narrow and wide entry both work; one implementation per concept; the dead adapter is gone or
live and imported.

### Phase 3 — Visual system and legibility (UX-13…21, 26…30; F-29)

1. Land the token/typography/encoding/motion spec; one phase-colour source; distinct icons.
2. Content-first framing; screen-fixed gutters; hide empty lanes; overview density.
3. Edge declutter ladder and opacity floor; 13 px detail tiers.
4. Designed loading, empty, error and hidden states.
5. Expand the capture verify set to hybrid, mobile, turn-map, plugin, loading and error; tighten
   overrides to ≤ 10 %.

**Gate:** the §7.7 checklist passes on fresh captures; light/dark parity; no override above 10 %
without written justification.

### Phase 4 — Immersive live conduct (RW-03, RW-04; F-01…04, F-13)

1. Follow mode with MotionDirector/CameraVerbRegistry; pause on interaction; pin composer; resume.
2. Attention system from salience signals; HUD with tool, elapsed, cost, queue, failures.
3. Inline live widgets (reasoning, diff, terminal, todo, subagent).
4. Graph-native composer with context attach and continue/branch.

**Gate:** a live stream is followable at 60 fps; the composer stays stable while typing; attention is
explainable; the transcript still wins if the graph fails.

### Phase 5 — Investigation bandwidth (RW-01, RW-02, RW-10; F-05…12)

1. Graded neighborhood focus (D1) and edge ladder.
2. Universal why, step-through and copy outline.
3. Failure triage queue, since-failure delta, status.
4. Checkpoint diff and verified-writes overlay (including the permission lane).
5. Attempt comparison and NLQ filters.

**Gate:** all five questions answer in ≤ 3 interactions; the triage queue and checkpoint diff pass
e2e; the trust overlay never claims verification it cannot prove.

### Phase 6 — Scale and performance (F-23…25)

1. Full-session index and minimap beyond the 60-turn window; adopt `navigation/descent` and kernel
   `time-filter`/`walks` instead of host-only indexes.
2. LOD, `InstancedNodeRenderer` and `world` policies; DOM detail.
3. Fractal/progressive expansion and inline subagent graphs.
4. Adopt or delete kernel `graph-history`; one owner for "state at turn N" (the host time-travel buffer
   is the other).

**Gate:** 1,000-turn index navigable; no node moves when the window slides; pan/follow budgets met;
one history owner; the scale path uses library primitives.

### Phase 7 — Share, learn and collaborate (RW-11…RW-13; F-17…22, F-28 mobile)

1. Annotated handoff bundle and replay/storyboard.
2. Cross-session compare and recurring-error fingerprint.
3. Teaching tour and "explain this view".
4. Mermaid/DOT/GraphML export; cost ledger.
5. Mobile/touch parity and RTL/200 % zoom.

**Gate:** a teammate can open a handoff and answer the five questions without the author; mobile
reaches the graph and returns with scroll preserved.

### Phase 8 — Verification and doc parity (RW-06, RW-08, RW-09; F-26, F-27)

1. Perf harness (first paint, pan fps, memory) and budgets.
2. Vision assertions (legibility, overlap, ergonomics) in CI and a runtime overlay; wire the heuristic
   path first, keep ONNX experimental.
3. Layout/task experiment harness; recommend a default from data.
4. One UI tree and one plugin set: the dead adapter is deleted or live; `chrome:false` plus
   `DEFAULT_SYSTEM_PLUGINS` is a recorded decision, not an accident.
5. Reconcile docs with code: `SPACEGRAPH.md` §6/§8/§9/§16 (CONTRACT_VERSION, Cytoscape and the
   `graph_trust_lens` orphan are stale; mobile gating is stale), `known-issues.md`, `interaction.md`,
   `hybrid.md`, `composition-guide.md`, `scenarios.md`.
6. Re-run the full gate set from a clean worktree.

**Gate:** `bun run check`, `bun run graph:verify`, `bun run graph:capture --mode=verify`,
`session-graph` unit + components, app graph e2e all green; docs match shipped behaviour; one
implementation per concept.

---

## 9. Risks and mitigations

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | 32 defects + 29 features invite scope explosion. | Phase order is by user harm; P0 gates block ship; P2 items need an explicit owner decision. |
| R2 | Generic fixes land in the host. | Library first for Tab/focus/camera/minimap/edge ladder/salience/motion; no renderer branches. |
| R3 | Phase 0 returns a loss. | Phase 0 explicitly re-scopes Phases 4–7; the library remains the deliverable. |
| R4 | Keyboard changes regress the a11y mirror. | One focus model; tests assert Tab-out and arrow traversal together. |
| R5 | Follow mode becomes annoying or janky. | Pause on interaction; reduced motion; a visible follow toggle; 60 fps budget. |
| R6 | Permalink/handoff migration needs aliases. | One canonical writer; transitional readers only with owner sign-off. |
| R7 | Widgets/diff/terminal introduce XSS or CSP risk. | Host-sanitised markup only; `isSafeWidgetMarkup` parity test; strict CSP. |
| R8 | Vision/AI QA overpromises. | Heuristic path is the default; ONNX is experimental; vision complements, never replaces, tests. |
| R9 | Upstream `dev` keeps moving. | Re-sync per `AGENTS.md`; §0 records the method. |
| R10 | Docs drift again. | Phase 8 makes doc parity a gate; every phase updates the affected docs. |

---

## 10. Definition of done

1. Every P0 finding and P0 feature is closed with a test, capture or signed waiver.
2. The human study is executed; the disposition matches the pre-registered stop rule.
3. Every visible control has an effect; every failure explains itself; no global `Tab` trap.
4. Every feature is reachable on every surface that declares it (windows, minimap, compare, follow,
   palette actions, detail modes); no silent no-op.
5. Every flag that is read is wired to `Flag.enabled`; every flag that is not read is deleted.
6. All `ui.sessionGraph.*` keys resolve in the app dictionary; no raw-key fallback.
7. 13 px minimum text, WCAG AA both themes, no invisible opacity, no dominant empty frame.
8. One owner each for surface state, card budget, permalink grammar, colour, state and history; one UI
   tree (the dead adapter is adopted or deleted); one generated model copy with a drift gate.
9. Keyboard-only parity; mobile parity; reduced motion, RTL and 200 % zoom verified.
10. `Mod+K` reaches every action; `?` explains every shortcut.
11. Live follow, attention, graded focus, triage, checkpoint diff and verified-writes pass e2e.
12. A full-session index survives 1,000 turns without moving retained nodes.
13. Annotated handoff, replay and Mermaid export produce a shareable artifact.
14. Perf budgets are measured and enforced; vision assertions are green.
15. Fresh captures cover map, hybrid, mobile, turn-map, plugin, loading and error.
16. `SPACEGRAPH.md`, `known-issues.md`, `interaction.md`, `hybrid.md`, `composition-guide.md` match code.
17. Full gate set green from a clean worktree; numbers recorded in §12.
18. No push and no PR without explicit owner sign-off (TODO.44 §11.9 / §12.4).

---

## 11. Owner decisions needed

1. **Phase 0 go/no-go** — run the study now, or defer the product claim and ship the library.
2. **Renderer selector** — expose a working toolbar selector or remove the setting (UX-10/22).
3. **Permalink migration** — transitional readers are backwards compatibility; approve or choose a
   clean break (R6).
4. **Trust/verification scope** — is verified-writes a product promise or an experimental overlay?
5. **Cross-session** — is the error-fingerprint index in scope for this programme or a later one?
6. **P2 deferrals** — confirm which of F-09, F-12, F-19, F-21, F-22, F-25 wait.

---

## 12. Revision log

- **r0 (2026-11-19):** Audit draft. Synced `upstream/dev` (`214cfea187`); 32 findings (10 P0, 18 P1,
  4 P2), 6 strengths, 6 gates, 8 risks, 10 DoD items.
- **r1 (2026-11-19):** Rewritten as the product programme. Added the north star and ten experience
  invariants; six modes of use; a persona/use-case matrix; a full SpaceGraphJS capability-leverage
  matrix (salience, motion, world/LOD, edge ladder, vision, experiments, History, Physics, FractalZoom,
  HUD, Mermaid, playback, node/edge libraries); 29 features in six groups; an aesthetic system with a
  ten-point capture checklist; eight gated phases; ten risks; fifteen DoD items; six owner decisions.
  No code change, no commit, no push.
- **r2 (2026-11-19):** Reconciled §4 with the library capability inventory. Corrected overclaimed
  status (diff/compare/turn-map/toolbar/search components are dead-adapter-only or host re-implementations;
  history is registered-but-unused; `chrome:false` suppresses chrome plugins while system plugins still
  initialize). Added the cross-scale descent, kernel history/time-filter/walks/query, `codeDiff` renderer,
  `InstancedNodeRenderer`, and React/Solid bindings rows. Added the one-UI-tree task and gate, a kernel
  ownership task in Phase 6, and doc parity for the stale `CONTRACT_VERSION`/Cytoscape/trust claims.
- **r3 (2026-11-19):** Added §6.1 reachability and wiring (RW-01…RW-13) from the feature inventory:
  cosmetic filters, silently absent per-turn diff, half-built hybrid-only follow, unshown attention,
  broken surface parity, unwired flags, palette-only search, 166 missing i18n keys, the duplicated
  53-file model copy and dead UI, thin handoff, mobile parity, missing teaching, and the frontier
  affordances. Wired RW IDs into Phases 1–8, expanded the DoD to 18 items, and added the rule that a
  feature is not done until it is reachable, localised and test-pinned. Added F-30 agent-driven
  navigation (chat → graph) and F-31 read-only collaboration; the backlog is now 31 features.
- **r4 (2026-11-19):** Verified the top reachability claims in source. Corrected RW-03 (follow mode
  does frame streamed nodes and pulse focus; its control is hybrid-only, not absent) and RW-04 (the red
  badge is status-based; the attention score itself has no consumer). Confirmed RW-01 (quick-filter
  booleans are typed and defaulted but absent from `matchesFacets`), RW-02 (`diffSource` has zero
  occurrences under the plugin), and RW-07 (`GraphSearch` declares palette/action/lens/surface props and
  never reads them).
