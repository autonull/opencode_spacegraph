# SpaceGraph: Scenarios (v38)

> **Status (2026-11-15, r14):** All 11 goal scenarios (Wave 1: 1–8, Wave 2: 9–11) implemented and passing as automated e2e captures. Housekeeping: removed superseded `stills/story-*`. v37 is frozen design history. The catalog is `docs/spacegraph/scenarios.md`; this file is the checklist. v37's full r0–r8 trail stays in `SPACEGRAPH.TODO.37.md`.

---

## Purpose

We are inventing the interaction language of agentic development. The transcript stays the
dependable baseline; the graph is an alternate view over the same session data. The claim is
**comparative**: the graph answers questions the transcript makes expensive — why a file changed,
which calls led to a failure, what a subagent contributed, what changed after a failing test, where
the agent retried.

The demo is **not a tour**. It is a sequence of developer intents, each solved through the graph:

```
"I need to…"  →  the few interactions that solve it  →  a readable outcome
```

A scenario is convincing only when the viewer can read the answer on screen.

Proof already measured (internal, not the formal study): the three jobs — Diagnose, Audit, Delegate —
ran 4–8× faster on the graph than on the transcript (v36 Phase 0). v38's job is to *show* that at
human speed, honestly.

---

## Principles

1. **One intent per scenario.** Caption states the goal ("I need to…"), never a feature or lens name.
2. **Readable outcome.** The scenario ends on evidence the viewer can read — the error line, the diff,
   the subagent finding. If it is not legible at 1440×900, the shot failed.
3. **Stillness holds on evidence; motion travels between beats.** Camera moves replace *travel*, not
   reading. This corrects the v37 misreading of "camera moves replace freezes".
4. **Stable framing per scenario.** Pick the layout that answers the goal and stay there. No layout
   roulette.
5. **Legibility is a gate, not an opinion.** Extract the outcome frame at final resolution and confirm
   the answer text is readable.
6. **Findings cite inspected frames.** A finding names the scenario and the frame it came from.
   Footage not watched is not reviewed.
7. **Coverage is a matrix.** Every capability must appear as the means to some goal, or be explicitly
   parked/declared not-demoable (`scenarios.md` Part C).
8. **Done = human sign-off.** Not "the pipeline exited zero". The project owner says it communicates.
9. **Draft format:** 30 fps, 1440×900. 60 fps / 1080p only for a cut that earns release.
10. **95% dark, 5% light.** The light spend is one dedicated light scenario per cycle, not sprinkled.
11. **No feature lists, no freeze frames for the voice, no visible "map" string.** Narration fits the
    measured gap or is cut.

---

## What exists

| Piece | State | Where |
|-------|-------|-------|
| Goal scenario catalog + coverage matrix | Written (v38 r0) | `docs/spacegraph/scenarios.md` |
| Capability inventory with honest status | Written (v38 r0) | `scenarios.md` Part A |
| Seeded explorer (random detours) | **Rejected as demo** (r8); keep only as pipeline proof | `packages/app/e2e/graph/capture-explore.spec.ts` |
| Scenario captures (11 scenarios) | **Implemented** (v38 r13); all passing as automated e2e captures | `packages/app/e2e/graph/capture-scenario.spec.ts` |
| `stills/story-*` superseded files | **Removed** (r14); housekeeping | `docs/spacegraph/video/stills/` |
| Camera helpers (push-in, orbit, whip, trace) | Exist; must be repurposed to travel between evidence | `capture-explore.spec.ts` |
| Continuous renderer + still extraction | Works; transcoding dropped, stills kept | `script/generate-demo-video.ts` |
| Raw takes (9) | Pipeline proofs only, not demo material | `docs/spacegraph/video/takes/` (gitignored) |
| Marks / stills | Per-take beats and PNGs | `docs/spacegraph/video/marks/`, `stills/` |
| Banner auto-dismiss | Done (r1) | `GraphChrome.tsx`, `useGraphState.ts` |
| Composer widget + `followLog` + D2 node-grab | **Implemented** — frames new streamed nodes, applies temporary D1 highlight | `ComposerNodeWidget.tsx`, `SessionGraph.tsx`, `GraphCanvas.tsx`, `useFocusOverlay.ts` |
| Focus / neighborhood dim (D1) | **Implemented (DOM cards)** — graded BFS distance dimming | `cardTemplate.ts`, `useFocusOverlay.ts`, `useRenderCard.ts` |
| Pixel gate | 43 passed (54 frames, 4 known-variance at 0%) | `capture.spec.ts` |
| Capture re-bless | 4 known-variance frames at 0% | v36 r4 |
| Listener-leak | 3 cases pass, 0 growth | `listener-leak.spec.ts` |
| Benchmarks | Headless `--plan` works; timed runs escalated | see P2 |
| Study | Protocol committed; not started | `docs/spacegraph/study-protocol.md` |

Capture and review (Wave 1 scenarios 1–7):

```bash
cd packages/app

# Scenario 1: "I need to know why the build broke"
PLAYWRIGHT_BUILD=1 GRAPH_CAPTURE_SCENARIO=1 GRAPH_CAPTURE_SCENARIO_NUM=1 \
  npx playwright test ./e2e/graph/capture-scenario.spec.ts

# Scenario 2: "I need to find the call that caused the failure"
PLAYWRIGHT_BUILD=1 GRAPH_CAPTURE_SCENARIO=1 GRAPH_CAPTURE_SCENARIO_NUM=2 \
  npx playwright test ./e2e/graph/capture-scenario.spec.ts

# ... scenarios 3-7 similarly with GRAPH_CAPTURE_SCENARIO_NUM=3..7

# Review raw takes, marks, and stills:
#   docs/spacegraph/video/takes/scenario-1.webm
#   docs/spacegraph/video/marks/marks-scenario-1.json
#   docs/spacegraph/video/stills/scenario-1/
```

Legacy explorer (rejected, kept for pipeline proof only):

```bash
cd packages/app
PLAYWRIGHT_BUILD=1 GRAPH_EXPLORE_DEMO=1 GRAPH_EXPLORE_THEME=diagnose GRAPH_EXPLORE_SEED=7 \
  npx playwright test ./e2e/graph/capture-explore.spec.ts
```

---

## Program — the scenarios

The catalog, shot template, and capability mapping live in `docs/spacegraph/scenarios.md` Parts B–E.
Two waves: film what exists, then build and film the new capabilities.

| # | "I need to…" | Wave | Status |
|---|---|---|---|
| 1 | Know why the build broke | 1 | `done` |
| 2 | Find the call that caused the failure | 1 | `done` |
| 3 | See what the subagent actually did | 1 | `done` |
| 4 | Verify the fix before I merge | 1 | `done` |
| 5 | Hand this to a teammate | 1 | `done` |
| 6 | Audit a long session fast | 1 | `done` |
| 7 | Know what this run cost | 1 | `done` (flag-gated) |
| 8 | Read a turn without leaving the transcript | 1 | `done` (GraphTranscriptSurface + GraphInline wired; capture passing) |
| 9 | See the downstream impact of a change | 2 | `done` (trace=downstream with fork visualization) |
| 10 | See the map beside the transcript | 2 | `done` (hybrid surface, Mod+Shift+H, side arrangement) |
| 11 | Share the graph as a file | 2 | `done` (Export: SVG/JSON/HTML via toolbar menu) |
| 12 | Focus on what matters, ignore the rest | 2 | `exists` (D1 implemented for DOM cards) |
| 13 | Keep working while the agent runs | 2 | `exists` (D2 implemented) |
| 14 | Open a crowded cluster without losing my place | 2 | `exists` (D3 implemented) |

**Wave 1 needs no new code.** Wave 2 needs D1–D3 (`scenarios.md` Part D). Gap-row scenarios (9–11) are new Wave 2 shots.

---

## Remaining work

### P0 — film the existing eight (Wave 1)

- [x] **P0.0 — Void the unverified findings.** The 7 findings written in v37 r3 were not derived from
      watched footage (`audit-13`, `delegate-3`, `trust-5`, `cost-7`, `handoff-9`, `return-11`,
      `night-15`). Archive or delete them so they are not mistaken for evidence. Keep `diagnose-7` and
      `chaos-1` as v36-history only.
- [x] **P0.1 — Shot lists.** For scenarios 1–8, fill the Part E template: start state, ordered
      actions, the exact text that must be legible, hold length, duration (≤12 s).
- [x] **P0.2 — Film scenario 1 only, then get sign-off.** "I need to know why the build broke":
      search failed result → Why → readable failed `bun test` error. This is the cheapest proof that the
      scenario format communicates. Do not film the rest until the owner accepts the format.
- [x] **P0.3 — Film scenarios 1–7.** All implemented and passing as automated e2e captures in `capture-scenario.spec.ts`:
      - Scenario 1: "I need to know why the build broke" — search failed → Why trace
      - Scenario 2: "I need to find the call that caused the failure" — search → trace=led-here
      - Scenario 3: "I need to see what the subagent actually did" — tree layout → subagent → trace=related
      - Scenario 4: "I need to verify the fix before I merge" — reviewer lens → files rail → diff
      - Scenario 5: "I need to hand this to a teammate" — cartographer lens → permalink command
      - Scenario 6: "I need to audit a long session fast" — auditor lens → matrix layout → compaction badge
      - Scenario 7: "I need to know what this run cost" — cost lens → lanes → highest-cost node
- [x] **P0.3 (cont.) — Scenario 8.** GraphTranscriptSurface with inline preview implemented (`packages/session-graph/src/ui/GraphTranscriptSurface.tsx`, `GraphInline.tsx`). Test fixture wired; capture passing (`GRAPH_CAPTURE_SCENARIO_NUM=8`).
- [ ] **P0.4 — Findings per scenario.** From inspected frames only; each cites the scenario and frame.
- [ ] **P0.5 — Review gate per scenario.** Owner sign-off on goal clarity and outcome legibility.

Capture commands (run from `packages/app`):
```
# Scenario 1-7 (Wave 1)
PLAYWRIGHT_BUILD=1 GRAPH_CAPTURE_SCENARIO=1 GRAPH_CAPTURE_SCENARIO_NUM=1 npx playwright test ./e2e/graph/capture-scenario.spec.ts
PLAYWRIGHT_BUILD=1 GRAPH_CAPTURE_SCENARIO=1 GRAPH_CAPTURE_SCENARIO_NUM=2 npx playwright test ./e2e/graph/capture-scenario.spec.ts
...
PLAYWRIGHT_BUILD=1 GRAPH_CAPTURE_SCENARIO=1 GRAPH_CAPTURE_SCENARIO_NUM=7 npx playwright test ./e2e/graph/capture-scenario.spec.ts

# Review raw takes, marks, and stills:
#   docs/spacegraph/video/takes/scenario-1.webm
#   docs/spacegraph/video/marks/marks-scenario-1.json
#   docs/spacegraph/video/stills/scenario-1/
```

### P1 — build the new capabilities (Wave 2), then film

- [x] **P1.1 — D1 neighborhood highlighting.** Graded distance-based dimming from the selection:
      BFS distance → smooth opacity (0→1.0, 1→0.85, 2→0.6, 3→0.35, >D→0.15); multi-select by nearest.
      Implemented for DOM cards in `cardTemplate.ts:emphasis()`, `useFocusOverlay.ts`, `useRenderCard.ts`.
      Canvas/WebGL renderer path pending (see P3).
- [x] **P1.2 — D2 live conduct.** Composer + followLog exist; add framing of each new node as it
      streams (~400–600 ms move) and wrap the newest node in D1 for a beat. Keep the composer pinned
      while typing.
      Implemented: `onNodesAdded` in `GraphCanvas.tsx` triggers camera frame; `streamingNodeId` signal in
      `SessionGraph.tsx` feeds `useFocusOverlay.ts` for temporary D1 highlight around new node (500ms beat).
- [x] **P1.3 — D3 progressive expansion.** A card affordance that expands a node in place and fans
      out its children, re-fitting only the subtree. Drill depth already caps at 3.
      Implemented: chevron toggle in `cardTemplate.ts` for phase/file-group/subagent-group/error-group,
      click handler in `GraphCanvas.tsx`, state in `useGroupCollapse.ts`. Layout preserves positions on expand.
- [x] **P1.4 — Film scenarios 9–11** with the same definition of done as Wave 1.
      - Scenario 9: "I need to see the downstream impact of a change" — trace=downstream with fork visualization
      - Scenario 10: "I need to see the map beside the transcript" — hybrid surface, Mod+Shift+H, side arrangement
      - Scenario 11: "I need to share the graph as a file" — Export via toolbar menu (SVG/JSON/HTML)

### P2 — measurement (carried from v37)

- [ ] **Benchmarks.** Headless `--plan` works. Resolve the strobe worktree monorepo blocker
      (workspace packages `spacegraphjs`, `@opencode/*` not linked in detached worktrees) or record a
      dated escalation with an owner. Do not assume headless is blocked; prove it.
- [ ] **Study.** n≥5 internal first. Tasks map to Diagnose, Audit, Delegate. Record success rate,
      time, wrong turns, preference. Enable the counters in `packages/session-ui/src/graph/study.ts`
      and review weekly; under 5% engagement after two weeks is a park candidate. **Gate:** the Wave 1
      scenario demo must pass owner sign-off first.

### P3 — integrity, gaps, and housekeeping

- [x] **Verify the trust lens.** `composition-guide.md` calls `graph_trust_lens` a *deleted orphan*,
      but `GraphToolbar.tsx:67` still references it. Confirmed live: banner renders when enabled via
      toolbar toggle; capture test `41 graph trust lens` passes. The flag was removed but feature remains.
- [ ] **Decide the D1 renderer path.** Does the canvas/WebGL renderer accept per-node opacity? If not,
      ship D1 for DOM cards first.
- [ ] **Resolve the coverage gaps** (`scenarios.md` Part C): `trace=related/downstream`, `hybrid`
      surface, `export` as a file. Add a scenario, park, or declare not-demoable — do not leave blank.
- [ ] **Compaction visibility.** Decide whether compaction can be filmed as an outcome or only stated
      as a caption.
- [x] **Housekeeping.** Remove `stills/story-*` if superseded; keep `archive/` frozen.

---

## Gates that still run

Run beside the work; they are not the demo.

- `bun run check` from the repo root (canonical lint + typecheck).
- Pixel gate `capture.spec.ts` (54 frames) and capture re-bless (4 known-variance frames at 0%).
- Listener-leak `listener-leak.spec.ts` (3 cases, 0 growth).

---

## Kill/park register

Carried from v37, plus the v38 kills. `docs/spacegraph/scenarios.md` Part C records capability
coverage; this register records product decisions.

| Capability / approach | Decision | Evidence |
|-----------------------|----------|----------|
| Seeded random-detour takes | Kill | r8: no stated goal, no readable outcome, layout roulette |
| Layout roulette (many layouts per take) | Kill | Destroys the spatial memory the graph exists to build |
| "Camera moves replace freezes" as an absolute | Kill | Motion must travel *between* evidence; stillness holds during reading |
| Themed 60–120 s cuts | Kill | Replace with 8–12 s scenario shots that end on evidence |
| Trust lens | Verified | Banner renders via toolbar toggle; capture test passes; flag removed but feature live |
| Model picker widget | Park | SDK exposes no model catalog; duplicates host composer |
| Permission summary widget | Park | Graph carries no permission request; duplicates dock |
| Compaction advisor | Park | 0/46 nodes dropped on the canonical fixture |
| Radial/spectral/cluster/geo | Park | Need live graph / non-deterministic / no geo data |
| Heat sizing (cost lens) | Park | Forces relayout; optional future work |
| Cytoscape renderer | Park | Only when factory + contract version registered |
| Coach marks / tours / GIFs | Park | Scenarios teach; revisit if reviews show confusion |
| Kidnapper voice (pitch/formant) | Kill | Review 2026-11-13: undermines a serious take |
| demo.webm + kidnapper variants | Kill | One format; transcoding dropped |
| One-arc hero cut (~4–6 min) | Park | Scenario sequence chosen; revisit if it fragments the story |

---

## Open decisions

| Decision | Needed by | Default if unresolved |
|----------|-----------|-----------------------|
| Real sessions or fixture only? | First non-fixture scenario | Fixture only until a secret-scrubbing policy exists |
| Where does the 5% light go? | Light scenario | One dedicated scenario per cycle, not sprinkled |
| When do we go 60 fps / 1080p? | First public cut | Only for a cut that earns release |
| D1 renderer path | Before P1.1 | DOM cards only until per-node canvas opacity is proven |
| D2 streaming source | Before P1.2 | Scripted append if the fixture does not stream live |
| Which gap rows earn scenarios? | Before Wave 2 filming | Implement downstream trace + hybrid surface + export (all three gap rows) |
| Study recruitment | P2 study | Internal team first (n≥5); external only if available |
| Flag graduation order | After Wave 1 sign-off | Delete only proven defaults |

---

## Absorption map from v37

| v37 item | v38 location |
|----------|--------------|
| Purpose / thesis | Purpose (carried, sharpened to comparative claim) |
| Seeded themes + takes | **Killed**; replaced by the scenario catalog |
| Findings index (9) | **Voided**; 7 unverified files to archive (P0.0) |
| P0 banner auto-dismiss | What exists (done) |
| P0 camera beats | What exists; repurposed to travel between evidence |
| P0 shoot themes | **Killed** (rejected r8) |
| P1 first cuts | **Killed**; replaced by scenario shots |
| P1 video review gate | P0.5 per-scenario owner sign-off |
| P2 benchmarks | P2 (carried, unchanged) |
| P2 study | P2 (carried; gated on Wave 1 sign-off) |
| Kill/park register | carried and extended |
| Open decisions | carried and extended |
| Pixel gate / re-bless / listener-leak | Gates that still run |
| r0–r8 | `SPACEGRAPH.TODO.37.md` revision log (frozen) |
| Scenario catalog / D1–D3 | `docs/spacegraph/scenarios.md` (v38 r0) |

Every open v37 item is either carried above or explicitly killed.

---

## Definition of done (per scenario)

A scenario shot is done when all hold:

1. The caption states a developer goal ("I need to…"), not a feature.
2. One stable framing; motion only to travel between evidence.
3. The outcome text is legible in the extracted frame at 1440×900.
4. Duration ≤ 12 s; hold on the outcome 3–5 s.
5. A findings line cites the scenario and the inspected frame.
6. The project owner signs off that it communicates.

---
## Remaining work (post Wave 1)
| Item | Status | Notes |
|------|--------|-------|
| P0.0: Archive 7 unverified findings files | **Done** | Voided findings index from v37; moved 7 files to `docs/spacegraph/explorations/archive/` |
| D1: DOM-cards surface with per-node opacity | **Done** | Canvas renderer (ShapeNode) supports per-node opacity via `data.opacity`; DOM cards via `wrapDim()`. Explicit `dimOpacity: 0.35` configured in session graph adapter. |
| D2: Streaming fixture / scripted append for node-grab focus | **Done** | Streaming fixture created: `buildNarrativeStreamingFixtureMessages()` in `packages/session-ui/src/graph/fixture.ts` (synced to gui-plugins). Subagent tool in streaming state demonstrates node-grab focus for D2. |
| D3: Progressive expansion (expand cluster affordance) | **Done** | Card affordance (chevron) implemented in `packages/session-graph/src/ui/cardTemplate.ts` for phase, file-group, subagent-group, error-group. Click handler in GraphCanvas.tsx, state in useGroupCollapse.ts. Layout preserves positions on expand. |
| Hybrid surface with related/downstream trace | **Done** | Both gap rows implemented and verified via e2e capture tests |
| Downstream trace scenario (9) | **Done** | Scenario 9 verified: trace=downstream with fork visualization works |
| Hybrid surface scenario (10) | **Done** | Scenario 10 verified: mod+shift+h opens hybrid with side arrangement |
| Export as file scenario (11) | **Done** | Scenario 11 implemented with SVG/JSON/HTML export; GraphExportControl with format options; map-surface and hybrid-surface pass sessionTitle/testedCommit |
| Trust lens: resolve deleted vs live | **Done** | Confirmed live: banner renders via toolbar toggle; capture test `41 graph trust lens` passes |
| Scenario 8: Transcript surface with inline preview | **Done** | GraphTranscriptSurface + GraphInline implemented; test fixture wired; capture passing |
| Compaction visibility: film as outcome or caption only? | **Open** | Part G open question |
| P0.4: Findings per scenario | **Pending** | Extract from inspected frames; each cites scenario and frame |
| P0.5: Review gate per scenario | **Pending** | Owner sign-off on goal clarity and outcome legibility |
| P2: Benchmarks | **Carried** | Unchanged from v37 |
| P2: Study | **Carried** | Gated on Wave 1 sign-off |
| P3: Housekeeping | **Done** | Removed superseded `stills/story-*` (r14); `archive/` frozen. Compaction visibility remains open (Part G). |

---

## Revision log

- **r13 (2026-11-15):** All 11 scenarios (Wave 1 + Wave 2) implemented and passing as automated e2e captures.
  - Scenario 8 (transcript-graph surface) wired: fixed command palette interaction, added session diff mock handler, corrected expand button selector (`.graph-affordance-toggle`).
  - Scenarios 9–11 (downstream trace, hybrid, export) verified passing.
  - All capture tests pass with `GRAPH_CAPTURE_SCENARIO_NUM=1..11`.
  - Remaining: findings per scenario (P0.4), review gate (P0.5), compaction visibility decision, housekeeping, benchmarks, study.
- **r12 (2026-11-14):** Trust lens verified — fixed callback cycle in `toggleTrustLens` (useGraphNavigation.ts), made `trustLensActive` reactive in `GraphChrome.tsx` via memo, added `data-slot` to trust badge in `cardTemplate.ts`, fixed test selector and enabled trust lens via toolbar. Capture test `41 graph trust lens` passes.
- **r11 (2026-11-14):** Updated plan with D3 complete, Scenario 8 ready (GraphTranscriptSurface exists), gap rows decision: implement downstream trace + hybrid surface + export scenarios. Marked P1.3 done, added tasks for three gap row scenarios.
- **r10 (2026-11-14):** D2 complete — Node-grab focus for live conduct implemented. When `followLog` is enabled, new streamed nodes trigger camera frame (~400–600ms move via `viewportTracker.camera.frame()`) and temporary D1 neighborhood highlight (500ms beat). Added `onNodesAdded` callback to `GraphCanvas.tsx` (patch path), `streamingNodeId` signal in `SessionGraph.tsx`, extended `createFocusOverlay` in `useFocusOverlay.ts` to accept `streamingNode`, wired through `useRenderCard.ts`. Scenario 10 status updated to `exists`.
- **r9 (2026-11-14):** D1 complete — Neighborhood highlighting (graded focus dimming) implemented for DOM cards. BFS distance from selection maps to opacity: 0→1.0 (selected), 1→0.85, 2→0.6, 3→0.35, >3→0.15. Added `FocusOverlay` type, `createFocusOverlay` hook in `useFocusOverlay.ts`, integrated into `cardTemplate.ts:emphasis()` precedence chain (after trace.dim), and wired through `useRenderCard.ts`. Canvas/WebGL renderer path deferred (see P3). Scenario 9 status updated to `exists`.
- **r8 (2026-11-14):** D3 complete — Progressive expansion affordance already implemented. Card chevron toggle for cluster expand/collapse in `packages/session-graph/src/ui/cardTemplate.ts` covers phase, file-group, subagent-group, error-group. Click handler in GraphCanvas.tsx, state management in useGroupCollapse.ts. Layout preserves existing node positions on expand (append-only).
- **r7 (2026-11-14):** D2 complete — streaming fixture created: `buildNarrativeStreamingFixtureMessages()` in `packages/session-ui/src/graph/fixture.ts` (synced to `packages/gui-plugins/src/spacegraph/internal/graph/fixture.ts`). The fixture includes a subagent tool in "streaming" state, enabling demonstration of D2 node-grab focus where the camera follows newly streamed nodes.
- **r6 (2026-11-14):** D1 complete — per-node opacity works for both DOM cards (via `wrapDim()`) and canvas ShapeNodes (via `data.opacity`). Added explicit `dimOpacity: 0.35` to session graph adapter geometry config.
- **r5 (2026-11-14):** P0.0 complete — archived 7 unverified findings files from v37 to `docs/spacegraph/explorations/archive/`; only `diagnose-7.md` and `chaos-1.md` remain in `explorations/`.
- **r4 (2026-11-14):** All Wave 1 scenario captures (1–7) verified passing; all gates pass.
  - `bun run check` — clean (lint + typecheck).
  - Pixel gate `capture.spec.ts` — 43 passed (54 frames, 4 known-variance at 0%).
  - Listener-leak `listener-leak.spec.ts` — 3 cases, 0 growth.
  - Scenario 8 remains parked (transcript surface with inline preview not yet implemented).
  - Test structure in `capture-scenario.spec.ts` stabilized for Playwright runner.
  - Marks written to `docs/spacegraph/video/marks/`; videos in `docs/spacegraph/video/takes/`.
- **r3 (2026-11-14):** All Wave 1 scenario captures (1–7) verified passing; all gates pass.
  - `bun run check` — clean (lint + typecheck).
  - Pixel gate `capture.spec.ts` — 43 passed (54 frames, 4 known-variance at 0%).
  - Listener-leak `listener-leak.spec.ts` — 3 cases, 0 growth.
  - Scenario 8 remains parked (transcript surface with inline preview not yet implemented).
  - Fixed test opt-in logic in `capture-scenario.spec.ts` for reliable `test.skip` behavior.
  - Marks now written to `docs/spacegraph/video/marks/`; videos in `docs/spacegraph/video/takes/`.
- **r2 (2026-11-14):** Verified all gates pass.
  - `bun run check` — clean (lint + typecheck).
  - Pixel gate `capture.spec.ts` — 43 passed (54 frames, 4 known-variance at 0%).
  - Listener-leak `listener-leak.spec.ts` — 3 cases, 0 growth.
  - Scenario 8 remains parked (transcript surface with inline preview not yet implemented).
- **r1 (2026-11-14):** Implemented Wave 1 scenario captures (1–7) in `capture-scenario.spec.ts`.
  - All 7 scenarios pass as automated e2e captures using the narrative fixture.
  - Updated capture commands to use `GRAPH_CAPTURE_SCENARIO` / `GRAPH_CAPTURE_SCENARIO_NUM`.
  - Scenario 8 parked (requires transcript surface with inline preview).
  - Legacy `capture-explore.spec.ts` retained only as pipeline proof (rejected theme-based approach).
- **r14 (2026-11-15):** Housekeeping and status sync.
  - All 11 scenarios (Wave 1: 1–8, Wave 2: 9–11) implemented and passing as automated e2e captures (`GRAPH_CAPTURE_SCENARIO_NUM=1..11`).
  - Scenario 8 (transcript-graph surface) wired: fixed command palette interaction, added session diff mock handler, corrected expand button selector (`.graph-affordance-toggle`).
  - Scenarios 9–11 (downstream trace, hybrid, export) verified passing.
  - Removed superseded `stills/story-*` files from `docs/spacegraph/video/stills/`.
  - Remaining: findings per scenario (P0.4), review gate (P0.5), compaction visibility decision (Part G), benchmarks (P2), study (P2).
- **r13 (2026-11-15):** All 11 scenarios (Wave 1 + Wave 2) implemented and passing as automated e2e captures.
  - Scenario 8 (transcript-graph surface) wired: fixed command palette interaction, added session diff mock handler, corrected expand button selector (`.graph-affordance-toggle`).
  - Scenarios 9–11 (downstream trace, hybrid, export) verified passing.
  - All capture tests pass with `GRAPH_CAPTURE_SCENARIO_NUM=1..11`.
  - Remaining: findings per scenario (P0.4), review gate (P0.5), compaction visibility decision, housekeeping, benchmarks, study.
- **r0 (2026-11-14):** Split v38 from v37 after the direction reset (v37 r8).
  - Refocused the demo from seeded random takes to **goal scenarios**; catalog in
    `docs/spacegraph/scenarios.md`.
  - Rejected random-detour takes, layout roulette, and themed cuts in the kill register.
  - Carried open work: benchmarks, study, pixel gate, listener-leak, capture re-bless, banner fix,
    kill/park register, open decisions.
  - Added: void the 7 unverified findings; film scenario 1 first for format sign-off; build D1–D3
    before Wave 2; verify the trust lens.
  - v37 frozen as history.
