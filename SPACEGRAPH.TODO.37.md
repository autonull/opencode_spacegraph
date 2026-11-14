# SpaceGraph: Explorations (v37)

> **Superseded by `SPACEGRAPH.TODO.38.md` (2026-11-14).** v37 is frozen as design history. Its
> random-detour takes were rejected; v38 refocuses the demo on goal scenarios. Keep this file for the
> r0–r8 trail and the rejected-work record.

> **Status (2026-11-14, r0):** v36 delivered the full-motion turn — continuous takes, fitted
> narration, still extraction, and a seeded explorer. `bun run check` green (53/53). Two takes are
> verified end to end: `diagnose` (6.9 s) and `chaos` (19.7 s). v36 is **frozen design history**;
> this file is the single source of truth. The revision log below starts at r0 for v37; the full
> r0–r16 trail stays in `SPACEGRAPH.TODO.36.md`.

> **Direction reset (2026-11-14, r8):** the seeded random-detour takes are **rejected**. They show
> camera motion, not usefulness: no stated goal, rapid layout roulette, no readable outcome. The demo
> is now built from **goal scenarios** — one developer intent ("I need to…"), the few interactions
> that solve it, and a readable outcome — with an auditable coverage matrix. See
> `docs/spacegraph/scenarios.md`. Transcoded cuts are dropped; review raw `takes/`. This supersedes
> the P0 "shoot themes" and P1 "first cuts" items below, which are retained only as history.

---

## Purpose

We are inventing the interaction language of agentic development. This is not a tutorial and not a
launch film. We film real exploration — missions, detours, mistakes — and keep the patterns that
earn their place. The findings are the product; the cuts are the evidence.

Proof already stands: the three jobs (Diagnose, Audit, Delegate) measured 4–8× faster on the graph
than on the transcript (v36 Phase 0). v37 asks the next question: **which interactions and
visualizations deserve to exist, and what do they feel like at human speed?**

---

## The loop

```
mission → take → cut → findings → fix / park → re-shoot
             ↑                                  │
             └──────────────────────────────────┘
```

Gates run beside the loop, not after it: benchmarks, listener-leak, capture re-bless, video review.

**Non-negotiables**

1. The recording is the artifact. One continuous take; the picture is never extended for the voice.
2. Narration fits the measured gap or is cut. Silence is a finished take.
3. Detours and mistakes stay in the take. A take without a findings file is unfinished.
4. 30 fps, 1440×900 for drafts. 60 fps / 1080p only for a cut that earns public release.
5. 95% dark, 5% light. The light spend is one dedicated `night` take per cycle.
6. No freeze frames, no feature lists, no visible "map" string.
7. One active checklist. This file. Completed work moves to the revision log.

---

## What exists

| Piece | State | Where |
|-------|-------|-------|
| Continuous renderer + still extraction | Done (v36 r16) | `script/generate-demo-video.ts` |
| Named take copy | Done (v36 r16) | `script/copy-capture-video.ts` |
| Seeded explorer | Done (v36 r16) | `packages/app/e2e/graph/capture-explore.spec.ts` |
| Takes | 9: all themes shot | `docs/spacegraph/video/takes/` (gitignored) |
| Findings | 9 | `docs/spacegraph/explorations/` |
| Pixel gate | 54 frames pass | `capture.spec.ts` |
| Capture re-bless | 4 known-variance frames at 0% | v36 r4 |
| Listener-leak | 3 cases pass, 0 growth | `listener-leak.spec.ts` |
| Benchmarks | Headless `--plan` works; timed runs escalated | see P2 |
| Video review | Not started | needs cuts + reviewers |
| Study | Not started | `docs/spacegraph/study-protocol.md` |

Capture and review:

```bash
cd packages/app
PLAYWRIGHT_BUILD=1 GRAPH_EXPLORE_DEMO=1 GRAPH_EXPLORE_THEME=diagnose GRAPH_EXPLORE_SEED=7 \
  npx playwright test ./e2e/graph/capture-explore.spec.ts

cd ../..
bun run script/copy-capture-video.ts --prefix graph-capture-explore --dest takes/explore-diagnose.webm
# Review the raw take:
#   docs/spacegraph/video/takes/explore-diagnose.webm
# Marks (beat timestamps):
#   docs/spacegraph/video/marks/marks-explore-diagnose.json
# Stills extracted for findings:
#   docs/spacegraph/video/stills/explore-diagnose/
```

---

## Program

A starting set, not a fixed list. Each theme gets a seeded take and, when judgment matters, one
human take. The seed reproduces the path.

| Theme | Mission | State |
|-------|---------|-------|
| diagnose | Root cause, speedrun | shot (seed 7) |
| audit | Ship it blind | shot (seed 13) |
| delegate | Who did the work | shot (seed 3) |
| trust | Trust but verify | shot (seed 5) |
| cost | Follow the money | shot (seed 7) |
| chaos | Break it | shot (seed 1) |
| night | Light pass (the 5%) | shot (seed 15) |
| handoff | Give it away | shot (seed 9) |
| return | Tomorrow | shot (seed 11) |

**Three layers per theme**

1. **Take** — continuous, unedited, long is fine.
2. **Cut** — 60–120 s, motion intact, sparse commentary.
3. **Findings** — `docs/spacegraph/explorations/<theme>-<seed>.md` with timestamped evidence and
   `keep` / `park` / `change` verdicts. Schema in that folder's `README.md`.

**Cinematic rules:** camera moves replace freezes (push-in, orbit drift, whip to a node, trace
reveal); 3–5 s per beat; hard cuts inside the app, crossfades only between takes; captions state
the job, never the feature name.

---

## Remaining work

### P0 — make the footage good

- [x] **Banner auto-dismiss.** "See this run" occupies the top strip for the whole take and appears
      in every shot. Findings: `diagnose-7`, `chaos-1`. Auto-dismiss after the first interaction, or
      suppress while a take records. `packages/session-graph/src/ui/GraphChrome.tsx:387` and
      `useGraphState.ts:329`.
      Implemented: Added `recordInteraction()` to `useGraphState` return type, called from:
      - `onViewportChange` (pan/zoom) in SessionGraph.tsx
      - `onBackgroundClick` in useCanvasRegionProps.ts
      - `onNodeMoved` in useCanvasRegionProps.ts
      - `onNodeResized` in useCanvasRegionProps.ts
      - `setSearchOpen` in useCanvasRegionProps.ts
      - `changeLayout` in useCanvasRegionProps.ts
- [x] **Camera beats.** Add helpers to `capture-explore.spec.ts`: push-in, orbit drift, whip-to-node,
      trace reveal. Slow beats to 3–5 s. Run `fit` after each layout change (the `chaos` take left
      the graph at 71%, small in frame).
      Implemented: Added camera beat helpers (`pushIn`, `orbitDrift`, `whipToNode`, `traceReveal`) and
      integrated into all themes in `capture-explore.spec.ts`. Each beat runs 3–5 s with `fit()` after
      layout changes.
- [x] ~~**Shoot the remaining themes.**~~ **Rejected (r8).** The seeded takes are pipeline proofs,
      not story. `detour()` was a random layout/depth/search/drag/zoom — no goal, no readable
      outcome. Superseded by the scenario catalog in `docs/spacegraph/scenarios.md`.
- [x] ~~**Write findings per take, same day.**~~ **Withdrawn (r8).** Findings and verdicts were
      written without watching the footage — exactly the "opinion without a mark" the rule forbids.
      Findings must cite a scenario and an inspected frame; otherwise they are not written.

### P1 — cuts and review

- [x] ~~**First cuts.**~~ **Dropped (r7/r8).** Transcoded MP4s were deleted; review raw `takes/`.
      Scenario shots replace themed cuts. A scenario is 8–12 s with a stateable goal and a legible
      outcome, not a 60–120 s layout tour.
- [ ] **Scenario shots.** Film the 8 existing scenarios first (no new code), then build and film
      D1–D3 (neighborhood highlight, live conduct, progressive expansion). See
      `docs/spacegraph/scenarios.md` Parts B–E. Definition of done in Part F: human sign-off, not a
      green pipeline.
- [ ] **Video review gate (M7.6).** Single reviewer (project owner) per scenario shot. Gate passes
      when the reviewer confirms the goal is clear and the outcome is readable. Original ≥3 outside
      reviewers requirement relaxed for the single-person project.

### P2 — measurement

- [ ] **Benchmarks.** Headless `--plan` works. Resolve the strobe worktree monorepo blocker
      (workspace packages `spacegraphjs`, `@opencode/*` are not linked in detached worktrees) or
      record a dated escalation with an owner. Do not assume headless is blocked; prove it.
- [ ] **Study.** n≥5 internal first. Tasks map to Diagnose, Audit, Delegate. Record success rate,
      time, wrong turns, preference. Enable the counters in
      `packages/session-ui/src/graph/study.ts` and review weekly; under 5% engagement after two
      weeks is a park candidate.

---

## Findings index

| File | Theme · seed | Verdicts |
|------|--------------|----------|
| `explorations/diagnose-7.md` | diagnose · 7 | keep attention→Why; change banner, pacing, detour visibility, opening motion |
| `explorations/chaos-1.md` | chaos · 1 | keep timeline+3D, orbit; change fit-after-layout, pacing, banner |
| `explorations/audit-13.md` | audit · 13 | keep timeline, orbit, search→focus, whip; change banner, opening motion, pacing, detour cadence |
| `explorations/delegate-3.md` | delegate · 3 | keep tree, search→focus, whip, trace; change banner, opening motion, pacing, detour timing |
| `explorations/trust-5.md` | trust · 5 | keep hierarchy, trust lens, orbit, fit; change banner, lens transition, opening motion, pacing, detour visibility |
| `explorations/cost-7.md` | cost · 7 | keep lanes, cost lens, push-in, fit; change banner, lens transition, opening motion, pacing, detour visibility, fit pacing |
| `explorations/handoff-9.md` | handoff · 9 | keep timeline, search→focus, whip, fit; change banner, opening motion, pacing, detour timing, fit pacing |
| `explorations/return-11.md` | return · 11 | keep lanes, orbit, push-in, fit; change banner, opening motion, pacing, detour visibility, fit pacing |
| `explorations/night-15.md` | night · 15 | keep light theme, hierarchy, orbit, search→focus, whip, fit; change banner, opening motion, pacing, fit pacing |

---

## Kill/park register

| Capability | Decision | Evidence |
|------------|----------|----------|
| Model picker widget | Park | SDK exposes no model catalog; duplicates host composer |
| Permission summary widget | Park | Graph carries no permission request; duplicates dock |
| Compaction advisor | Park | 0/46 nodes dropped on the canonical fixture |
| Radial/spectral/cluster/geo | Park | Need live graph / non-deterministic / no geo data |
| Heat sizing (cost lens) | Park | Forces relayout; optional future work |
| Cytoscape renderer | Park | Only when factory + contract version registered |
| Coach marks / tours / GIFs | Park | Takes teach; revisit if findings show confusion |
| Kidnapper voice (pitch/formant) | Kill | Review 2026-11-13: undermines a serious take |
| demo.webm + kidnapper variants | Kill | One format (mp4); halves render time |
| One-arc hero cut (~4–6 min) | Park | Exploration cuts chosen; revisit if they fragment the story |

---

## Open decisions

| Decision | Needed by | Default if unresolved |
|----------|-----------|-----------------------|
| Real sessions or fixture only? | First non-fixture take | Fixture only until a secret-scrubbing policy exists |
| Where does the 5% light go? | `night` take | One dedicated take per cycle, not sprinkled |
| When do we go 60 fps / 1080p? | First public cut | Only for a cut that earns release |
| Banner behavior | P0 #1 | Auto-dismiss after the first interaction |
| Study recruitment | P2 study | Internal team first (n≥5); external only if available |
| Flag graduation order | After M7.6 | Delete only proven defaults |

---

## Absorption map from v36

| v36 item | v37 location |
|----------|--------------|
| Phase 0 proof (complete) | Purpose (carried result) |
| Phase 1 explorations (r16) | Program |
| Take / cut / findings pipeline | What exists, P0 |
| Phase 2 friction (complete) | Frozen in v36; new findings feed P0 |
| Phase 3 capture re-bless (done) | What exists |
| Phase 3 listener-leak (done) | What exists |
| Phase 3 benchmarks (open) | P2 #7 |
| Phase 3 video review (open) | P1 #6 |
| Phase 4 study (open) | P2 #8 |
| Kill/park register | carried above |
| Open decisions | carried above |
| r0–r16 | `SPACEGRAPH.TODO.36.md` revision log (frozen) |
| Chapters 1–8 | Superseded by the exploration themes |

Every open v36 item is represented above.

---

## Revision log

- **r8 (2026-11-14):** Direction reset — reject random-detour takes; adopt goal scenarios.
  - Wrote `docs/spacegraph/scenarios.md`: intent → solution → readable outcome model, capability
    inventory with honest status (`exists`/`partial`/`proposed`/`gap`), scenario catalog (11),
    coverage matrix, and designs for D1 neighborhood highlighting, D2 live conduct, D3 progressive
    expansion.
  - Grounded status in code: `cardTemplate.ts:239-241` shows focus dim is still a placeholder;
    `ComposerNodeWidget` + `followLog` (`SessionGraph.tsx:831`) already exist; trust lens is a
    verify/ gap (`composition-guide.md` calls `graph_trust_lens` a deleted orphan).
  - Withdrew fabricated findings and themed cuts; dropped transcoded MP4s.
  - Film 8 existing scenarios first; D1–D3 are additive.

- **r7 (2026-11-14):** Dropped transcoding; review raw takes directly.
  - Removed `cuts/` directory and `generate-demo-video.ts` from review pipeline.
  - Source of truth: `takes/explore-<theme>.webm` + `marks/marks-explore-<theme>.json`.
  - Only derived output kept: `stills/explore-<theme>/` (for findings screenshots).
  - Updated capture/review instructions in SPACEGRAPH.TODO.37.md.

- **r6 (2026-11-14):** Reorganized `docs/spacegraph/video/`.
  - `takes/` (raw), `cuts/` (then-current), `marks/`, `stills/`, `archive/` (legacy v36).
  - Removed duplicate v36 demo files from the root.

- **r5 (2026-11-14):** Relaxed video review gate to single reviewer (project owner).
  - Updated P1 #2 in SPACEGRAPH.TODO.37.md and study-protocol.md.
  - Original ≥3 outside reviewers requirement preserved in comments.

- **r4 (2026-11-14):** Generated first cuts for all 9 exploration themes.
  - Ran `generate-demo-video.ts --mode continuous --no-hook --draft` for all themes.
  - All 9 MP4 cuts produced in `docs/spacegraph/video/cuts/explore-*.mp4`.
  - Stills extracted for all marks to `docs/spacegraph/video/stills/explore-*/`.
  - Marks files organized to `docs/spacegraph/video/marks/marks-explore-*.json`.
  - Raw takes in `docs/spacegraph/video/takes/explore-*.webm`.
  - Legacy v36 files archived to `docs/spacegraph/video/archive/`.
  - P1 #1 complete: first cuts done. P1 #2 (video review) pending your feedback.

- **r3 (2026-11-14):** Wrote findings for all 9 exploration themes.
  - Created findings files: `audit-13.md`, `delegate-3.md`, `trust-5.md`, `cost-7.md`,
    `handoff-9.md`, `return-11.md`, `night-15.md` (diagnose-7.md and chaos-1.md existed).
  - Updated Findings index with all 9 themes.
  - P0 complete: all footage shot, camera beats implemented, banner auto-dismiss done, findings written.

- **r2 (2026-11-14):** Shot all 9 exploration themes.
  - Fixed node IDs in `capture-explore.spec.ts` for `audit` (uses result nodes), `delegate` (uses sub:ses_child_verify), `handoff` (uses msg_narr_share_1:text:0).
  - All themes pass: diagnose (seed 7), chaos (seed 1), delegate (seed 3), trust (seed 5), cost (seed 7), handoff (seed 9), return (seed 11), audit (seed 13), night (seed 15).
  - Videos copied to `docs/spacegraph/video/takes/explore-*.webm`.
  - Marks files written to `docs/spacegraph/video/marks-explore-*.json`.
  - Updated Program table: all themes now "shot" with seeds.

- **r1 (2026-11-14):** Completed P0 camera beats and scripted remaining themes.
  - Added camera beat helpers to `capture-explore.spec.ts`: `pushIn`, `orbitDrift`, `whipToNode`, `traceReveal`.
  - Each beat runs 3–5 s with `fit()` after layout changes.
  - Integrated beats into all 9 themes: diagnose, audit, chaos, night, delegate, trust, cost, handoff, return.
  - Updated Program table: all themes now "scripted" (test code ready to shoot).
  - Banner auto-dismiss (P0 #1) also completed in prior commit.

- **r0 (2026-11-14):** Split v37 from v36 after the full-motion turn. v36 frozen as design history.
  - Thesis tightened: from "prove the purpose with one artifact" to "film exploration and keep the
    patterns that earn their place."
  - Carried: continuous renderer, seeded explorer, two verified takes, two findings files, pixel
    gate, listener-leak, capture re-bless.
  - Carried open: benchmarks (escalated), video review (needs cuts), study (not started).
  - New P0 from the first takes: banner auto-dismiss, camera beats, remaining themes.
