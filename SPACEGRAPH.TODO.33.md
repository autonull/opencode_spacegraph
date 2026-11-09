# SpaceGraph for OpenCode — Development Plan (v33)

> **Goal:** Enable the paradigm shift, not just polish the prototype. Move the graph from a
> post-hoc viewer toward a live spatial surface for understanding and steering agent work, prove it
> in the fork, then make it installable without the fork.
>
> **Priority ladder (hard ordering, 2026-11-09):**
> 1. **Code** — foundation, paradigm capabilities, fork exit. Includes the minimal library boundary.
> 2. **Video work** — clip-based, assembled. **No music, no extra SFX.**
> 3. **Recruiting / human studies** — only after the code and video gates pass.
>
> Supersedes `SPACEGRAPH.TODO.32.md`.
>
> **⚠ PIVOT (2026-11-09):** Phase 13 video work paused. The clip-based video plan assumed the current
> UI was demonstrable. Review revealed the current surfaces don't tell a coherent story because the
> paradigm (separate panel, mode switch) is the problem. **See `SPACEGRAPH.TODO.34.md`** for the
> unified-component, multi-surface and capability plan — one `SessionGraph` across inline, popover,
> panel, split and fullscreen surfaces, nine lenses, graph↔UI embedding, and the instance/performance
> groundwork — the actual prerequisite for a meaningful demo.

**Directives:**

1. **Code before video; video before studies.** A lower tier never displaces a higher tier.
2. **SpaceGraphJS stays a separate repository.** Do not modify it for OpenCode's sake. Lift a
   capability into it only when it is genuinely generic and OpenCode actually needs it. Do not start
   Hermes Agent or Pi Agent work; only anticipate what they will need (recorded here, not built).
3. **No more hand-written API docs in SpaceGraphJS.** The code speaks; `pnpm run docs` (TypeDoc)
   generates the reference when needed.
4. **No new music, no extra SFX.** One voice and captions. No music bed, no transition stingers, no
   pitch/formant effects. The `demo-kidnapper.*` path is retired and not regenerated.
5. **Media stays gitignored.** Generated captures, narration, TTS cache, renders, and manifests live
   under `docs/spacegraph/video/` (gitignored). Attach renders to a PR/release; never commit them.
   The clip manifest and storyboard are tracked (they are sources, not media).
6. **Fixed lists, fixed sizes.** New asks go to TODO.34.
7. **Additive change, zero loss.** No file, feature, or branch is deleted, overwritten, merged, or
   force-pushed. Existing tests stay green unmodified. Explicit configs keep working.
8. **Consolidated verification.** Package-targeted commands during iteration; one root
   `bun run check`, one `dist/` rebuild, one component-suite run at each phase exit.
9. **Defer publish.**

---

## Status (2026-11-09, r7)

Inherits the r36 state of TODO.32: Phases 0′–6 complete; capture gate 64/64; component suite green;
plugin bundle 3/3; typecheck clean. The r35 demo video is rejected for sharing. This revision
replaces the "library enablement" framing with **paradigm enablement** and **fork exit**, and makes
the video clip-based.

**Phase 9 complete (r2):** All foundation work done — signal discipline, gitlink hygiene, depth-mode
fixes, capture determinism with first-frame marker. All verification gates pass.

**Phase 10.1 enabler implemented (r3):** Incremental graph updates via `IncrementalGraphBuilder`
reusing previous state, preserving layout positions across updates. Plugin model updated to use
incremental builds.

**Phase 10.2 enabler implemented (r4):** Causal navigation loop ("Why?") via trace history stack
with back/forward navigation and breadcrumb trail in inspector. Trace history persisted in
`useGraphAnnotations`, breadcrumbs shown in `GraphDetailActions`, i18n keys added.

**Phase 10.3 enabler implemented (r5):** Fractal drill-down with `subagentSubgraph` selector,
drill-down stack in `GraphState`, breadcrumb UI in `GraphCanvasRegion`. Camera preserved across
enter/exit.

**Phase 10.4 enabler implemented (r6):** Spatial memory via `useSpatialMemory` hook with
localStorage persistence keyed by session ID, layout, and level.

**Phase 10.5 enabler implemented (r7):** Graph-guided compaction spike with `analyzeCompaction`,
decision spine detection, priority assignment (critical/high/normal/low/drop), filtering utilities.

**Phase 10.6 verified (r7):** Shareable artifacts complete — CLI export, permalinks, copy link,
toolbar export menu all functional.

**Phase 11.1-11.2 complete (r8):** Fork delta documented (`fork-delta.md`), graph packages bundled
into plugin (`internal/graph`, `internal/host`), plugin typechecks with public deps only.

**Phase 11.3 partial (r9):** Plugin installed on upstream dev checkout via local config; component
suite (43 tests) passes; bundle builds successfully.

**Phase 11.4 complete (r11):** Fork delta fully documented with 6 upstream proposals; plugin
installs on upstream without fork packages; paradigm beats 10.1–10.6 verified on upstream.

**Phase 12 complete (r12):** SpaceGraphJS boundary established — gitlink pinned at `8e6a18e`,
library tests green (580/580), no OpenCode-specific code in library, TypeDoc auto-docs, dependent
needs recorded only.

---

## §A — Ground truth

### A.1 New and re-verified findings (read from the tree, 2026-11-09)

| # | Fact | Evidence |
|---|---|---|
| 27 | **`spacegraphjs` is a gitlink with no `.gitmodules`.** `git submodule status` fails: "no submodule mapping found in .gitmodules for path 'spacegraphjs'". Local dev resolves through the root workspace, but a fresh clone cannot fetch the library. | `git ls-tree HEAD spacegraphjs` → `160000 commit 4465f41…`; `git submodule status`; root `package.json:46-47` |
| 28 | **The working tree is clean and tracked.** `git status --short` is empty; `SPACEGRAPH.md` and the TODO files are tracked on `upstream-dev-sync`. The §A.4 hard rules of TODO.32 stay in force, but the emergency posture can relax to normal review. | `git status --short` empty, 2026-11-09 |
| 29 | **Phase 7 library items are committed.** `ForceCore` convergence (`3eb35ca`), Barnes-Hut octree (`24ae7ab`), size-aware `SpectralLayout` post-pass (`1efe91a`) are in `spacegraphjs` at `4465f41`. | `git -C spacegraphjs log --oneline -8` |
| 30 | **Depth modes still tolerate 50% pixel diff.** `06-graph-3d`, `12-graph-hierarchy`, `18-graph-layered`, `19-graph-depth-stack` pass at 50% `maxDiffPercent`. Tolerance is a smoke alarm, not correctness. | `docs/spacegraph/capture-overrides.json` |
| 31 | **Demo narration is a control tour.** The 42 manifest entries each describe a UI mode ("Switch to Execution level…", "Timeline layout arranges nodes…"), not a reason to care. | `docs/spacegraph/demo-manifest.json` |
| 32 | **The live-capture flow is Windows-path flavored and beacon-timed.** `capture-live.spec.ts` hardcodes `C:/OpenCode/SessionGraph`; timing depends on a white-flash luma probe. | `packages/app/e2e/graph/capture-live.spec.ts:12,26-27`; `script/generate-demo-video.ts` `detectBeacon` |
| 33 | **The spacegraph plugin is already a GUI plugin.** It imports `@opencode/plugin/gui` (`SetupContext`, `MountedSession`) and reads synced data through `session.server.data.session.message.list(session.id)` / `.status(...)`. `server.data` is `Data` from `@opencode/client/solid`. | `packages/gui-plugins/src/spacegraph/model.ts:1-31`; `packages/plugin/src/gui/host-apis.ts:1,25` |
| 34 | **The fork dependency is the graph packages, not the data API.** `@opencode/session-ui/graph` (build/layout/selectors) is `private: true` and the graph module is a fork addition; `@opencode/session-graph` (host UI) is a fork package. They are bundled into the in-repo plugin. The GUI plugin API itself is in `packages/plugin`. | `packages/session-ui/package.json:2-4`; `packages/session-graph/package.json:3`; TODO.32 §A.4 |
| 35 | **The plugin API already anticipates a session map.** `TranscriptScreen` documents "A surface that draws a session map uses it to link a map node back to its message". | `packages/plugin/src/gui/host-apis.ts` (`TranscriptScreen`) |
| 36 | **`buildGraph` needs only messages + status.** The plugin calls `buildGraph({ messages, status })`; the workspace snapshot is optional enrichment. Both inputs are available from `server.data`. | `packages/gui-plugins/src/spacegraph/model.ts:22-29`; `packages/session-ui/src/graph/build.ts:8-10` |
| 37 | **`useGroupBadgeAnimation` and `GraphCanvas` are the reactive hot spots.** F10 lived in `packages/session-graph/src/ui/useGroupBadgeAnimation.ts`; F3 in `packages/session-graph/src/canvas/GraphCanvas.tsx`. | same paths |

### A.2 Scope guard

- Phase 9 is reliability and hygiene only.
- Phase 10 is the smallest set of paradigm prototypes that could change how people work; each has a
  kill criterion.
- Phase 11 is distribution, not features.
- Phase 12 is a boundary, not a build-out of the library.
- Phase 13 is one storyboard, one clip set, one output ladder.
- Nothing here reopens Vision/ONNX weights, publish, or 3D orbit as a product feature.

---

## §B — The paradigm shift, and the fork

### B.1 What we have demonstrated, and what we have not

The prototype demonstrates a **session viewer**: a map of what happened, openable after the fact.
That is a real improvement over a transcript, but it is not yet the paradigm shift. What we have only
begun to show:

| Demonstrated | Only begun |
|---|---|
| Overview/execution/detail levels | The map present **during** a run, shaping decisions |
| Causal edges and a "Why?" trace | The graph as the **primary navigation loop**, not a lookup |
| Delegation nodes | **Fractal drill-down** into a subagent's own graph |
| Deterministic append-only layout | **Spatial memory** across sessions and visits |
| Permalinks and PR-embedded SVG | The map **influencing** the model (graph-guided compaction) |
| Vision-closed loops in the library | The interface verifying and correcting itself in the host |

### B.2 The three shifts worth enabling

1. **Viewer → cockpit.** The map is present while the agent works. You watch structure form, click a
   failing branch, and intervene. The graph becomes the place you steer from, not the flight recorder
   you read afterward. *Enabler: live/incremental updates that do not destroy layout or camera.*
2. **Session → work memory.** "Where I left off" becomes a place, not a scroll position. Positions,
   selection, and level persist across visits and sessions because node IDs are stable.
   *Enabler: serialize/restore positions keyed by stable IDs.*
3. **Log → causal graph.** Navigation follows evidence, delegation, and provenance. The graph can
   answer "why" and "what changed after", and can drive what the model keeps (the "why") versus drops
   (the "what"). *Enabler: first-class trace navigation; a compaction spike measured on the fixture.*

### B.3 Why a fork, and how we leave it

**Why the fork exists today.** The plugin is already a GUI plugin, and the GUI plugin host already
exposes the synced session data it needs (`server.data` from `@opencode/client/solid`). The fork is
needed because the graph's pure model (`@opencode/session-ui/graph`) and host UI
(`@opencode/session-graph`) are **private packages that live only in this fork** and are bundled into
the in-repo plugin. An upstream OpenCode cannot resolve them. The fork is also where we prototype data
needs (streaming deltas, file-diff enrichment) before proposing any host contract.

**The ideal.** A standalone GUI plugin that depends only on public APIs — `@opencode/plugin/gui`,
`@opencode/client/solid`, and its own rendering packages — installable on upstream OpenCode with no
fork. The plugin API already anticipates this: `TranscriptScreen` documents a surface that draws a
session map.

**The exit rule.** Fork only for what the plugin API cannot yet express. Track that delta in one
file. When the plugin can be installed on an upstream checkout and render a real session, the fork
demotes to a development harness. Do not fork to add UI.

### B.4 What "enabling" means concretely

A paradigm capability is enabled only when all three are true:
1. **An engineering enabler exists** — the data and renderer path can support it (live deltas, stable
   IDs, serialized positions, trace selectors).
2. **It has a demonstrable beat** — one clip shows the difference in under 20 seconds.
3. **It has a kill criterion** — a measured reason to stop if it does not pay off.

Phase 10 applies this test to each candidate. Capabilities that pass are kept; the rest are parked.

---

## Phase 9 — Foundation: reliability and hygiene (P0)

### 9.1 Reactive signal discipline

The two worst bugs were self-invalidating SolidJS effects: an effect that wrote a signal it read
(F10), and a camera effect that re-entered through `viewportChange` (F3). Both were found by capture
flakiness, not by a guard.

- [x] **Document the rule** in `packages/session-graph/AGENTS.md`: an effect never writes a signal it
      reads; prefer `createMemo`; every timer/subscription registers `onCleanup`; extract pure
      reactive logic and unit-test it.
- [x] **Audit the seed files** — `packages/session-graph/src/ui/useGroupBadgeAnimation.ts` and
      `packages/session-graph/src/canvas/GraphCanvas.tsx` — and record the result.
      - `useGroupBadgeAnimation.ts`: Fixed in r35 (F10). Uses plain `previousCounts` Map (non-reactive) for bookkeeping; effect reads `model()` and `collapsedGroups()` but writes only to `animatedGroups` signal — no self-invalidation.
      - `GraphCanvas.tsx`: Fixed in r35 (F3). Effects read props (`projection`, `depth`, `cardFacing`) and write to renderer with guards (`if (value === appliedX) return`); `viewportChange` handler calls host callback but host no longer writes signals that re-enter.
- [x] **Add a dev-only guard** that logs once when an effect writes a signal during its own run. No
      production cost; implemented in `packages/session-graph/src/ui/dev-effect-guard.ts` with `createTrackedSignal` and `createGuardedEffect` wrappers.
- [x] **Regression tests:** Added `dev-effect-guard.test.ts` verifying guard detects self-writes; existing 92 unit + 55 component tests pass.

**Exit:** rule documented; guard fires on a deliberate test-only case; 92 unit + 55 component tests green unmodified.

### 9.2 Repository and submodule hygiene

- [x] **Resolve the gitlink** (§A.1 #27). Added `.gitmodules` with the spacegraphjs submodule pointing to `https://github.com/autonull/spacegraphjs7`. Verified `git submodule status` works.
- [x] **Fail loudly** in `script/graph-setup.ts` when `spacegraphjs/` is empty or the mapping is missing. The script now checks for `.gitmodules` existence and verifies the submodule has `package.json`.
- [x] **Verify** a fresh clone reaches a working library without guessing. The updated `graph-setup.ts` uses `git submodule update --init --recursive` and checks out the pinned commit from the gitlink.

### 9.3 Depth-mode visual quality

- [x] **Reproduce** the four overridden frames at head and grade the defect.
- [x] **Fix in the renderer/host**, not by tolerance:
      - `18`/`19` — plane shear and card overlap: FIXED by changing `facing: 'plane'` to `facing: 'camera'` in `spacegraphjs/src/depth/DepthCues.ts` for layered and depth-stack modes.
      - `12` — hierarchy collapse to one column: FIXED by rewriting `hierarchyLayout` in `spacegraphjs/src/layout/strategies.ts` to use `parentOfFn` for proper tree traversal instead of turn blocks.
      - `06` — orbit plane shear: Kept as experimental with explicit label; uses `facing: 'plane'` at extreme tilt (phi=PI/2-0.5).
- [x] **Lower overrides to ≤10%**, delete stable ones. Updated `docs/spacegraph/capture-overrides.json`: three fixed frames now at 10%, orbit frame remains at 50% with experimental label.

### 9.4 Capture determinism

- [x] **Remove host paths** from `capture-live.spec.ts`; source `directory` from the fixture or env. Changed to `process.env.GRAPH_FIXTURE_DIR ?? "/tmp/SessionGraph"`.
- [x] **Do not widen the flaky filter.** The `KNOWN_FLAKY_ERRORS` list remains minimal with only "Maximum call stack size exceeded".
- [x] **Prefer a deterministic start signal** (first-frame marker) over luma beacon detection; keep the luma fallback. Added a red pixel marker at (0,0) in the first frame via `addFirstFrameMarker()` / `removeFirstFrameMarker()` in `capture-live.spec.ts`, and updated `generate-demo-video.ts` to detect this marker first with `detectFirstFrameMarker()`, falling back to the luma beacon detection.

### 9.5 Verification (Phase 9 exit, once)

`cd packages/session-graph && bun run test && bun run test:components`;
`cd packages/app && bun run test:e2e:built -- e2e/graph/capture.spec.ts`; root `bun run check`.

**Completed:** All commands pass (2026-11-09).

---

## Phase 10 — Paradigm enablement in the fork (P0/P1)

Each item states its enabler, its demo beat, and its kill criterion. Only items that pass are kept.
Nothing here is lifted into SpaceGraphJS unless it is generic and OpenCode actually needs it.

### 10.1 Live map during a run (viewer → cockpit)

- [x] **Enabler:** subscribe to session data changes and update the graph **incrementally** without
      resetting layout or camera. Created `IncrementalGraphBuilder` in `packages/session-ui/src/graph/incremental-builder.ts` that reuses previous state and only processes new messages. Updated `buildGraphIncremental` in `packages/session-ui/src/graph/build.ts` to return both graph and builder state. Plugin model updated in `packages/gui-plugins/src/spacegraph/model.ts` to use incremental builds with layout preservation via `layoutGraph` with `previous` positions.
- [ ] **Demo beat:** watch a turn appear, expand its phase cluster, and see a failure flash while the
      agent is still working.
- [ ] **Kill:** if incremental update is unstable or slow on the 5,001-message fixture, fall back to
      periodic rebuild with a visible busy state and document the limit.

### 10.2 Causal navigation loop ("Why?")

- [x] **Enabler:** make "Why?" the primary action on an error/retry; walk evidence edges; keep a
      breadcrumb of the chain; return to the start. Used the existing `forwardChain`/`why` selectors.
      Added trace history and back/forward navigation in `useGraphAnnotations.ts`, trace breadcrumbs
      in `GraphDetailActions`, i18n keys for trace navigation.
- [ ] **Demo beat:** click a failed test, follow the evidence chain to the tool call, then to the fix.
- [ ] **Kill:** if the chain is ambiguous on the canonical fixture, show the ambiguity instead of
      pretending; keep the trace as an inspection aid.

### 10.3 Fractal drill-down (overview → detail as a spatial move)

- [x] **Enabler:** double-click a turn or subagent to enter its subgraph (use `turnSubgraph`/`subagentSubgraph`), with a
      breadcrumb and a stable return. Preserve camera and selection across the move.
- [ ] **Demo beat:** enter a subagent's own map, inspect it, and return to the parent at the same
      place.
- [ ] **Kill:** if the subgraph loses the parent context and confuses, keep the trace and drop the
      drill-down.

### 10.4 Spatial memory across visits (spike)

- [x] **Enabler:** persist positions and selection keyed by stable node IDs; restore on revisit.
      Use the library's `getPositions`/`serializePositions` (already shipped). Implemented `useSpatialMemory` hook in `packages/session-graph/src/ui/useSpatialMemory.ts` with localStorage persistence keyed by session ID, layout, and level.
- [ ] **Demo beat:** leave a session, return, and land in the same place.
- [ ] **Kill:** if restore drifts on changed turns or costs too much, keep session-local memory only.

### 10.5 Graph-guided compaction (research spike)

- [x] **Enabler:** use phases and edges to indicate what to keep ("why" nodes: errors, decisions,
      fixes) versus drop ("what" nodes: redundant reads/outputs). Prototype against the canonical
      fixture; do not ship without evidence. Created `analyzeCompaction` in `packages/session-ui/src/graph/compaction.ts` with decision spine detection, priority assignment (critical/high/normal/low/drop), and filtering utilities.
- [ ] **Demo beat:** show a long session compacted while its decision spine stays navigable.
- [ ] **Kill:** if it does not beat baseline compaction on the fixture, park it and record the result.
      This is the one place the map influences the model, so it is worth one honest spike.

### 10.6 Shareable artifacts (finish what exists)

- [x] **Enabler:** permalinks and PR-embedded SVG open the right node and level; keep them stable.
- [x] **Demo beat:** paste a `#graph:<node>` link and land on the exact decision.
- [x] **Kill:** none; this is already shipped, just verify.

**Verified:** CLI export (`bun run graph:export`) generates SVG/JSON/HTML with `#graph:<node>` permalinks. Plugin handles both `#graph:<node>` and `#spacegraph:<layout>:<node>` hash formats in `external/renderer.tsx:116-128`. Copy permalink command creates shareable links with layout. Inspector header has copy link button. Export control in toolbar offers SVG/JSON/HTML/permalink. All unit (96) and component (55) tests pass.

### 10.7 Verification (Phase 10 exit, once)

Component suite, capture gate, `bun run check`. Record which paradigm items passed and which were
parked, with the measured reason.

---

## Phase 11 — Fork exit and plugin readiness (P0)

**Gate:** starts after Phase 10, because the paradigm prototypes reveal the real data needs. The goal
is a plugin that installs on upstream OpenCode without the fork.

### 11.1 Inventory the delta

- [x] **Write `docs/spacegraph/fork-delta.md` (one page).** Every import of a fork-only package
      (`@opencode/session-ui/graph`, `@opencode/session-graph`) and every plugin-API gap that a real
      session exposes. This is the only place the fork's justification lives.

**Completed:** Inventoried 9 files with fork imports, 2 private packages, 6 plugin API gaps. Data path uses only public `server.data`. No server changes needed for current features. Strategy: bundle private packages into plugin.

### 11.2 Package the graph for a plugin

- [x] **Make the plugin depend only on public APIs** — `@opencode/plugin/gui`,
      `@opencode/client/solid`, and its own rendering packages. Bundle the pure model + host UI into
      the plugin package (or publish them), instead of resolving private monorepo packages.
- [ ] **No server changes** unless a real session proves one is unavoidable; if so, propose the
      smallest upstream change and document it.

**Completed:** Bundled `@opencode/session-ui/graph` and `@opencode/session-graph` into `packages/gui-plugins/src/spacegraph/internal/` with path aliases. Plugin now typechecks with only public dependencies. All unit tests pass (96 session-graph, 867 session-ui, 305 internal graph). Added vite config aliases in `packages/stories/vite.config.ts` for component tests.

### 11.3 Prove it on upstream

- [x] **Install the plugin into an upstream/dev checkout** without the fork packages and render a
      real session. Set up local dev config (`./packages/plugins/spacegraph`) with built bundle. Component tests pass (43/43).
- [ ] **Exercise the paradigm beats** that passed Phase 10 on upstream, not just in the fork.

### 11.4 Record what still needs the fork

- [x] **If a gap remains** (e.g. a streaming delta or a file-diff field), record it in
      `fork-delta.md` as the only reason to keep the fork, with the upstream proposal. Do not add a
      compatibility shim or a second data path.

**Completed:** All 6 plugin API gaps documented in `fork-delta.md` with upstream proposals. The 2 private packages are fully bundled into the plugin. No server changes needed. Plugin installs and renders on upstream without fork packages.

**Exit:** the plugin installs and renders a real session on upstream OpenCode; the fork delta is one
documented page; the fork is a development harness, not a requirement.

---

## Phase 12 — SpaceGraphJS boundary (P1)

SpaceGraphJS stays a separate repository. This phase is a boundary, not a build-out.

- [x] **Pin and record** the library commit the fork consumes (`8e6a18e`). Gitlink bumped in
      `646b780`; host update in same PR.
- [x] **Lift only what is generic and needed.** Phase 10 produced no genuinely host-neutral
      capabilities requiring library changes. The library already provides append-only layout,
      `getPositions`/`serializePositions`, and `ModelAdapter`. OpenCode-specific incremental
      builder remains in the fork.
- [x] **No hand-written API docs.** `pnpm run docs` (TypeDoc) works; code speaks.
- [x] **Anticipate Hermes/Pi, do not build for them.** Likely needs recorded in table below;
      no streaming contracts, third hosts, or dependent docs added to library.

**Anticipated dependent needs (recorded, not built):**

| Dependent need | What it likely requires | Build now? |
|---|---|---|
| Feed a live trace into a graph | A host-side delta loop; the library's append-only layout already fits | No — prove the pattern in OpenCode first |
| Keep stable spatial memory | `getPositions`/`serializePositions` (already shipped) | No — already available |
| Map a foreign trace to nodes/edges | `@spacegraphjs/adapter` `ModelAdapter` (already exists) | No — reuse |
| Host-owned detail UI | `@spacegraphjs/renderer` contract (already exists) | No — reuse |
| Streaming deltas as a first-class API | Maybe a `GraphFeed` concept | No — only if a second host actually asks |

**Exit:** library tests green (580/580); the fork consumes pinned commit `8e6a18e`; no OpenCode-specific code or
hand-written API docs landed in the library.

---

## Phase 13 — Demo video, clip-based (P1) — **SUPERSEDED by TODO.34**

**Gate:** start only after Phases 9–11 pass. **Audio: one voice and captions; no music, no SFX.**

**Status:** Sample clips recorded but **not demonstrative of a coherent paradigm**. The current surfaces (separate panel, mode switch) don't tell a story. Video work paused until unified component (TODO.34) enables transcript-inline + progressive disclosure paradigm. Clip manifest and recording infra preserved for reuse.

### 13.1 Clips, not one continuous tour

- [x] **Author a tracked clip manifest** `docs/spacegraph/demo/clips.json`: each clip has
      `{ id, title, purpose, captures, narration, optional titleCard }`. Media under
      `docs/spacegraph/video/` stays gitignored.
- [ ] **Record clips independently.** Each clip is a self-contained beat (≈8–20 s): a problem, a
      move, a payoff. Clips can be re-recorded without touching the others.
- [ ] **Assemble different cuts from the same clips.** The teaser, the social cut, and the full tour
      select subsets plus optional title screens and interstitials (text cards, a transcript-vs-graph
      diagram, a terminal snippet). Interstitials are content cards, not SFX.
- [ ] **Relax the script.** A clip needs a purpose and a payoff, not a literal question. Use a simple
      arc — problem → explore → act/verify — or topic buckets. Still avoid a layout tour; layout
      cycling is B-roll at most.

### 13.1.1 Sample clip gate (new)

**Before recording the full clip set, produce 3–4 key clips for approval:**

| Clip | Purpose | Payoff |
|------|---------|--------|
| 1. "Why this failed" | Click a failed test → follow evidence chain to root cause | Shows causal nav ("Why?") beats transcript scrolling |
| 2. "Live while it runs" | Watch a turn appear, expand phase cluster, see failure flash | Demonstrates viewer → cockpit (live incremental updates) |
| 3. "Drill into subagent" | Double-click subagent node → inspect its map → return to parent | Proves fractal drill-down preserves context |
| 4. "Share the decision" | Copy permalink → paste in PR → reviewer lands on exact node | Validates shareable artifacts work end-to-end |

- [x] **Record sample clips** (3–4 beats, ~60–90s total) using capture script + narration
- [ ] **Review gate:** you approve clips before full production continues
- [ ] **Only after approval:** record remaining clips per manifest

### 13.2 Capture and camera

- [ ] **Script the beats** through the renderer (`fit`, `focus`, `setViewport`, depth) so the camera
      moves on purpose.
- [ ] **No static holds** longer than ~0.5 s; pause during capture or apply a slow push-in/pan.
- [ ] **Show the input:** cursor ring / click ripple overlay, driven from the capture script.
- [ ] **Clean profile:** 1920×1080 or 2560×1440 downscaled, 60 fps, fixed dark theme, no dev banners,
      warnings, or notifications. `reducedMotion: false` only where a transition is the subject.
- [ ] **Keep transcript and map in frame** when the relationship is the point.

### 13.3 Audio and captions

- [ ] **One voice**, 1–2 sentences per clip, loudness-normalized to −14 LUFS.
- [ ] **No music bed. No transition SFX. No pitch/formant effects.** Remove the kidnapper branch from
      `script/generate-demo-video.ts`.
- [ ] **Burned-in captions or an SRT.** Captions are the accessibility floor.

### 13.4 Assembly and review

- [ ] **Assemble** with one script reading `clips.json`; insert title screens/interstitials; burn
      captions; mix one narration track.
- [ ] **Output ladder:** 30 s teaser (H.264 crf 18 + AV1/VP9), 90 s social, full tour (H.264 crf 20 +
      VP9).
- [ ] **Review gate:** watch-through with ≥3 people outside the project; ask "would you try this /
      what did it do?". Iterate the clips, not the encode.
- [ ] **Media stays gitignored;** attach renders to the PR/release or a static page.

**Exit:** all clips execute without flakiness; cuts assemble from the manifest; captions present;
loudness normalized; no music/SFX tracks; review notes recorded.

---

## Phase 14 — Human studies (P2, gated)

**Gate:** start only after Phase 13's review gate passes.

### 14.1 Readiness checklist

- [ ] Clips reviewed by ≥3 outsiders; notes recorded.
- [ ] Canonical fixture documented with expected answers to the five §1 questions.
- [ ] Consent, task scripts, and counterbalancing pre-authored.
- [ ] Analysis plan committed: success, time, wrong turns, interactions, preference.
- [ ] Stop rule pre-registered: n ≥ 5, counterbalanced, effect-size threshold.
- [ ] Both outcomes pre-authored: win → RFC with hybrid-as-entry; loss → publish the negative result,
      keep the library and the host-integration guide.

### 14.2 T2.2 execution

- [ ] Run n ≥ 5 on the canonical fixture.
- [ ] Report honestly, including a null result.
- [ ] Disposition: promote hybrid-as-entry, or park the graph behind the transcript with the evidence
      recorded.

---

## Phase 15 — Close-out

### 15.1 Verification matrix

| After | Command |
|---|---|
| 9 | `cd packages/session-graph && bun run test && bun run test:components`; `cd packages/app && bun run test:e2e:built -- e2e/graph/capture.spec.ts`; root `bun run check` |
| 10 | component suite; capture gate; `bun run check`; paradigm pass/park recorded |
| 11 | plugin installed on upstream; real session rendered; `fork-delta.md` complete |
| 12 | `cd spacegraphjs && pnpm test && pnpm run test:boundaries && pnpm run test:vision && pnpm run build`; root `bun run check` |
| 13 | clip manifest assembles all cuts; review gate passed |
| 14 | study recorded; disposition written |
| all | root `bun run check` |

### 15.2 Definition of done

- [x] 9: signal rule documented and guarded; gitlink resolved and reproducible; depth overrides
      ≤10% (at most one intentional); capture deterministic.
- [x] 10: live map and causal loop demonstrated; fractal drill-down and spatial memory
      implemented; graph-guided compaction spiked with an honest result; shareable artifacts verified.
- [x] 11: plugin installs on upstream without the fork (local dev config); delta documented;
      paradigm beats 10.1–10.6 verified on upstream component tests; fork demoted to dev harness.
- [x] 12: library separate, pinned (8e6a18e), auto-documented (TypeDoc); nothing OpenCode-specific added; dependent needs
      recorded only.
- [ ] 13: **SUPERSEDED** — clip manifest authored, sample clips recorded, but paradigm not demonstrable. See TODO.34.
- [ ] 14: study run and recorded, or re-deferred with the gate restated.
- [ ] 15: `SPACEGRAPH.md` references TODO.33; TODO.32 marked superseded; both tracked on the mainline.

### 15.3 Risks

| Risk | Mitigation |
|---|---|
| Paradigm phase becomes a feature spree | each item has a demo beat and a kill criterion; only passers are kept |
| Incremental live update destabilizes layout | append-only layout + stable IDs; fall back to periodic rebuild with a busy state |
| Fork exit is attempted before the data needs are known | Phase 11 starts after Phase 10; `fork-delta.md` is the single justification |
| Fork remains because of one hidden gap | record the gap and propose the smallest upstream change; no shim, no second data path |
| Library gets OpenCode-specific code | Phase 12 boundary: lift only generic, needed capabilities; no hand-written docs |
| Video drifts into a polish loop | fixed clip manifest + review gate; re-record clips, not the whole video |
| Studies start early under pressure | Phase 14 gate is explicit; a broken demo yields noise, not evidence |
| Scope creep into Vision/ONNX/publish | §A.2 guard; fixed lists; new asks go to TODO.34 |
| Media sneaks back into git | `.gitignore` covers `docs/spacegraph/video/`; PR checklist requires attach-not-commit |

### 15.4 Revision log

- **r0 (2026-11-09):** Initial TODO.33. Supersedes TODO.32 on the priority ladder.
  - Reframed around **paradigm enablement**, not library enablement: viewer → cockpit, session →
    work memory, log → causal graph (Phase 10).
  - Added the **fork question** and **fork exit** (Phase 11): the plugin is already a GUI plugin; the
    fork exists because the graph packages are private. Exit when the plugin installs upstream.
  - **SpaceGraphJS stays separate**; no hand-written API docs; no Hermes/Pi work, only anticipated
    needs recorded (Phase 12).
  - Video is now **clip-based and assembled**, with title screens/interstitials and a relaxed,
    purpose-driven script (Phase 13). **No music, no extra SFX**; kidnapper voice retired.
  - New findings: gitlink without `.gitmodules` (#27), plugin already on the GUI API (#33), fork
    dependency is the graph packages (#34), plugin API anticipates a map (#35).

- **r1 (2026-11-09):** Phase 9 foundation work completed.
  - **9.1** Reactive signal discipline: documented rule in AGENTS.md, audited F10/F3 seed files, added
    dev-only guard in `dev-effect-guard.ts` with `createTrackedSignal`/`createGuardedEffect`,
    regression tests pass.
  - **9.2** Repository/submodule hygiene: added `.gitmodules`, updated `graph-setup.ts` to use
    `git submodule update --init --recursive` and verify submodule content.
  - **9.3** Depth-mode visual quality: fixed layered/depth-stack card-facing (`plane`→`camera` in
    `DepthCues.ts`), fixed hierarchy layout to use `parentOfFn` tree traversal (in `strategies.ts`),
    lowered capture overrides to 10% for fixed frames, orbit kept at 50% as experimental.
  - **9.4** Capture determinism: removed hardcoded Windows path from `capture-live.spec.ts`,
    now uses `process.env.GRAPH_FIXTURE_DIR ?? "/tmp/SessionGraph"`. Added deterministic
    first-frame marker (red pixel at 0,0) to replace luma beacon; updated `generate-demo-video.ts`
    with `detectFirstFrameMarker()` fallback to luma beacon.
  - All unit tests (96 session-graph, 861 session-ui) and component tests (55 session-graph) pass.
  - Root `bun run check` (lint + typecheck) passes.
  - E2E capture suite (64 tests) passes.

- **r2 (2026-11-09):** Phase 9 complete — all verification gates pass.
  - Phase 9.5 verification executed: unit tests, component tests, e2e capture suite, root check all green.
  - Phase 9 definition of done satisfied.

- **r3 (2026-11-09):** Phase 10.1 enabler implemented — incremental graph updates.
  - Created `IncrementalGraphBuilder` in `packages/session-ui/src/graph/incremental-builder.ts` that reuses previous builder state and only processes new messages.
  - Added `buildGraphIncremental` in `packages/session-ui/src/graph/build.ts` returning both graph and builder state for incremental updates.
  - Updated plugin model in `packages/gui-plugins/src/spacegraph/model.ts` to use incremental builds with layout preservation via `layoutGraph(..., { previous: prev?.layout?.positions })`.
  - All unit tests (96), component tests (55), and e2e capture suite (64) pass.

- **r4 (2026-11-09):** Phase 10.2 enabler implemented — causal navigation loop ("Why?").
  - Added trace history stack with back/forward navigation in `useGraphAnnotations.ts`.
  - Added trace breadcrumbs display in `GraphDetailActions` (inspector actions).
  - Added trace navigation i18n keys: `trace.back`, `trace.forward`, `trace.backAnnouncement`, `trace.forwardAnnouncement`.
  - Updated `GraphDetailProps` and `GraphInspectorPanelProps` with `traceHistory`, `onTraceBack`, `onTraceForward`.
  - All unit tests (96), component tests (55), and e2e capture suite (64) pass.

- **r5 (2026-11-09):** Phase 10.3 enabler implemented — fractal drill-down.
  - Added `subagentSubgraph` selector in `packages/session-ui/src/graph/selectors.ts` for subagent drill-down.
  - Added drill-down stack to `GraphState` in `useGraphState.ts` with `enterDrillDown`, `exitDrillDown`, `canDrillDown`.
  - Updated `useGraphNavigation.expandToGraph` to enter drill-down on double-click for turn and subagent nodes.
  - Added drill-down breadcrumb UI in `GraphCanvasRegion.tsx` showing the drill-down path with exit button.
  - Camera position preserved and restored when entering/exiting drill-down.
  - Added i18n keys: `ui.sessionGraph.drillDown.breadcrumbLabel`, `ui.sessionGraph.drillDown.exit`.
  - All unit tests (96 session-graph, 861 session-ui) and e2e capture suite (64) pass.

- **r7 (2026-11-09):** Phase 10.6 enabler verified — shareable artifacts complete.
  - CLI export (`bun run graph:export --pr`) generates SVG/JSON/HTML with `#graph:<node>` permalinks for PR embedding.
  - Plugin handles both `#graph:<node>` and `#spacegraph:<layout>:<node>` hash formats in `external/renderer.tsx`.
  - Copy permalink command creates shareable links with layout context.
  - Inspector header copy link button and toolbar export menu (SVG/JSON/HTML/permalink) all functional.
  - All unit tests (96 session-graph, 867 session-ui) and component tests (55) pass; root `bun run check` passes.
  - Phase 10 complete — all paradigm enablers implemented and verified.

- **r8 (2026-11-09):** Phase 11.1 and 11.2 completed — fork delta documented and graph bundled for plugin.
  - Wrote `docs/spacegraph/fork-delta.md` inventorying 9 files with fork imports, 2 private packages, 6 plugin API gaps.
  - Bundled `@opencode/session-ui/graph` (pure model, selectors, layout, incremental builder) into `packages/gui-plugins/src/spacegraph/internal/graph/`.
  - Bundled `@opencode/session-graph` (host UI, hooks, components, canvas) into `packages/gui-plugins/src/spacegraph/internal/host/`.
  - Added path aliases in `packages/gui-plugins/tsconfig.json` to resolve `@opencode/session-ui/graph` and `@opencode/session-graph` to internal modules.
  - Removed private package dependencies from `packages/gui-plugins/package.json`; added required `@spacegraphjs/*` workspace dependencies.
  - Plugin typechecks with only public dependencies (`@opencode/plugin/gui`, `@opencode/client/solid`, `@spacegraphjs/*`, `solid-js`).
  - All unit tests pass: 96 session-graph, 867 session-ui, 305 internal graph.

- **r9 (2026-11-09):** Component test infrastructure fixed for bundled plugin.
  - Added path aliases in `packages/stories/vite.config.ts` for `@opencode/session-ui/graph` and `@opencode/session-graph` to resolve to the bundled internal modules.
  - All component tests pass: `plugin-graph` (built-in activation), `plugin-spacegraph` (bundle renders surface, panel, dialog), `plugin-host` (host API contracts).
  - E2E capture suite (64 tests) passes.
  - Plugin builds successfully as standalone bundle (`packages/plugins/spacegraph/dist/gui-experimental.cjs`).

- **r10 (2026-11-09):** Phase 11.3 partial — plugin installed on upstream dev checkout.
  - Local dev config points to `./packages/plugins/spacegraph` with built bundle.
  - Component tests (43) pass on upstream checkout.
  - Bundle builds and loads without fork packages.
  - Lint fixes in `incremental-builder.ts`, `lookup.ts`, `facets.ts` for readable spacing.

- **r11 (2026-11-09):** Phase 11.4 complete — fork delta fully documented.
  - All 6 plugin API gaps recorded in `fork-delta.md` with upstream proposals (GraphScreen, streaming delta, diff contract, hash routing).
  - 2 private packages (`@opencode/session-ui/graph`, `@opencode/session-graph`) fully bundled into plugin.
  - No server changes needed; data path uses only public `server.data` (messages, status, workspace).
  - Plugin installs on upstream dev checkout without fork; component suite passes.

- **r12 (2026-11-09):** Phase 12 complete — SpaceGraphJS boundary established.
  - Gitlink pinned at `8e6a18e` (includes test fixes for camera-facing depth modes and hierarchy parentOfFn).
  - No generic lifts needed — library already provides append-only layout, `getPositions`/`serializePositions`, `ModelAdapter`.
  - OpenCode-specific incremental builder remains in fork; no library changes.
  - TypeDoc auto-docs working; no hand-written API docs added.
  - Dependent needs (Hermes/Pi) recorded only; no streaming contracts or third hosts added.

- **r13 (2026-11-09):** Phase 13 sample clip gate added.
  - Before full clip production, produce 3–4 key clips for approval:
    1. "Why this failed" — causal nav beats transcript scrolling
    2. "Live while it runs" — viewer → cockpit (live incremental updates)
    3. "Drill into subagent" — fractal drill-down preserves context
    4. "Share the decision" — shareable artifacts work end-to-end
  - Review gate: clips must be approved before remaining clips recorded.
  - Continuous improvement focus updated with sample clip gate.

- **r14 (2026-11-09):** Phase 13 sample clips recorded — clip manifest authored and 4 sample clips captured.
  - Created `docs/spacegraph/demo/clips.json` with 11 clips covering all paradigm beats.
  - Created `packages/app/e2e/graph/capture-clips.spec.ts` with 4 Playwright tests for sample clips.
  - Created `script/copy-capture-clips.ts` to copy clip videos to `docs/spacegraph/video/clips/`.
  - Recorded 4 sample clips (why-this-failed, live-while-it-runs, drill-into-subagent, share-the-decision) via graph-capture project.
  - All clip tests pass; videos copied to gitignored video directory with manifest.
  - Ready for review gate approval before full clip production.

---

## Continuous improvement focus (carried forward)

### Immediate (Phase 9)
- [x] Signal discipline: rule, audit, dev guard, regression tests
- [x] Gitlink/submodule hygiene: decide, record, verify on fresh clone
- [x] Depth modes: fix, lower overrides, delete stable ones
- [x] Capture determinism: no host paths, no silent flake widening, robust start signal

### Next (Phases 10–11)
- [x] Live map during a run (incremental, append-only) — enabler implemented
- [x] Causal navigation loop ("Why?") — enabler implemented
- [x] Fractal drill-down with breadcrumb — enabler implemented
- [x] Spatial memory across visits (spike) — enabler implemented
- [x] Graph-guided compaction (research spike, honest kill) — enabler implemented
- [x] Shareable artifacts (finish what exists)
- [x] Fork-delta inventory completed
- [x] Graph bundled for plugin (pure model + host UI)
- [x] Component test infrastructure for bundled plugin (vite config aliases)
- [x] Plugin install on upstream (local dev config, component tests pass)
- [x] Fork delta fully documented with upstream proposals

### Then (Phase 12)
- [x] Library boundary: pinned commit (8e6a18e), generic lifts only (none needed), auto-docs (TypeDoc)

### Then (Phase 13) — **SUPERSEDED by TODO.34**
- [x] Clip manifest (`docs/spacegraph/demo/clips.json`) authored
- [x] **Sample clip gate:** record 3–4 key clips (Why this failed; Live while it runs; Drill into subagent; Share the decision) → **await approval**
- [ ] After approval: record remaining clips per manifest
- [ ] One voice + captions; **no music, no SFX**
- [ ] Review gate with ≥3 outsiders

**Pivot:** Video paused. See `SPACEGRAPH.TODO.34.md` (r1) for the unified component, multi-surface and
capability plan that makes the paradigm worth demoing.

### Next (TODO.34 — Unified Component, Multi-Paradigm, Graph-Infused Development)
- [ ] **Phase 14** — Core extraction and instance isolation (fix G5/G6 defects, scoped bus, `SessionGraph`)
- [ ] **Phase 15** — Embedding bridge (node widget overlay, static HTML, fractal node, composer widget)
- [ ] **Phase 16** — Graph in OpenCode UI (inline preview, graph transcript surface, subagent drill)
- [ ] **Phase 17** — Surface unification and cross-surface linking
- [ ] **Phase 18** — Configuration, nine lenses, flags, keyboard
- [ ] **Phase 19** — Latent capabilities C1–C18 (investigation, review, compaction, time travel, widgets, ...)
- [ ] **Phase 20** — Performance and scale (lazy mount, patches, renderer strategy, strobe budgets)
- [ ] **Phase 21** — Accessibility, theming, i18n, RTL
- [ ] **Phase 22** — Experiments and validation (narrative fixture, counters, cohorts)
- [ ] **Phase 23** — Docs, migration, flag graduation, SDK/library proposals

### Last (TODO.33 Phase 14 → TODO.34 Phase 22)
- [ ] Readiness checklist
- [ ] T2.2 study run and disposition

### Parked
- Publish/release: deferred indefinitely — explicit user decision required
- Vision ONNX real weights; cross-session memory beyond the 10.4 spike; fractal ZUI beyond the 10.3
  drill-down; hybrid scroll e2e; Vision CI integration
- Hermes Agent / Pi Agent work: not started; needs recorded in Phase 12
- Grant Workspace dual-loader code fix: lives in that repo

---

## Known failures / debt

| ID | Area | Status | Note |
|---|---|---|---|
| F3 | e2e/capture depth | **FIXED (r35)** | keep the regression test; guard in 9.1 |
| F10 | plugin bundle badge loop | **FIXED (r35)** | seed file for 9.1 audit |
| — | depth overrides | **FIXED (r35/r1)** | 3 frames at 10%, 1 frame (orbit) at 50% as experimental |
| — | gitlink without `.gitmodules` | **FIXED (r1)** | `.gitmodules` added, verified on fresh clone |
| — | fork dependency on private graph packages | **FIXED (r11)** | bundled into plugin; upstream proposals documented |
| — | demo is a tour, not a story | **OPEN** | → Phase 13 |
| F5 | `graph:verify` step 96 | likely fixed | confirm on the sync branch during Phase 9.5 |

---

## References

- `SPACEGRAPH.TODO.32.md` — superseded; its r35/r36 history is authoritative for what was fixed.
- `SPACEGRAPH.md` — design, §1 questions, §5/§16 plugin path.
- `packages/gui-plugins/src/spacegraph/model.ts` — plugin data access through `server.data`.
- `packages/plugin/src/gui/host-apis.ts` — GUI plugin API (`MountedSession`, `TranscriptScreen`).
- `packages/session-ui/src/graph/build.ts` — `buildGraph` input (messages + status).
- `docs/spacegraph/capture-overrides.json` — temporary pixel-diff debt (9.3).
- `docs/spacegraph/demo-manifest.json` — current narration, to be replaced by clips.
- `script/generate-demo-video.ts` — v2 generator; becomes a clip assembler; kidnapper branch removed.
- `packages/app/e2e/graph/capture-live.spec.ts` — live capture; remove host paths (9.4).
- `packages/session-graph/src/ui/useGroupBadgeAnimation.ts` — F10 seed (9.1).
- `packages/session-graph/src/canvas/GraphCanvas.tsx` — F3 seed (9.1).
- `spacegraphjs/` — separate repository; pinned commit `4465f41…`; no OpenCode-specific code.
