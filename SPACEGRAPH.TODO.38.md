# SpaceGraph: Scenarios (v38)

> **Status (2026-11-14, r0):** v37 is frozen design history. It proved the capture pipeline, but its
> seeded random-detour takes are **rejected** — camera motion, not usefulness. v38 refocuses the
> demo on **goal scenarios**. The catalog is `docs/spacegraph/scenarios.md`; this file is the
> checklist. v37's full r0–r8 trail stays in `SPACEGRAPH.TODO.37.md`.

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
| Camera helpers (push-in, orbit, whip, trace) | Exist; must be repurposed to travel between evidence | same spec |
| Continuous renderer + still extraction | Works; transcoding dropped, stills kept | `script/generate-demo-video.ts` |
| Raw takes (9) | Pipeline proofs only, not demo material | `docs/spacegraph/video/takes/` (gitignored) |
| Marks / stills | Per-take beats and PNGs | `docs/spacegraph/video/marks/`, `stills/` |
| Banner auto-dismiss | Done (r1) | `GraphChrome.tsx`, `useGraphState.ts` |
| Composer widget + `followLog` | Exist; live conduct is partial | `ComposerNodeWidget.tsx`, `SessionGraph.tsx:831` |
| Focus / neighborhood dim | **Placeholder** — not built | `cardTemplate.ts:239-241` |
| Pixel gate | 54 frames pass | `capture.spec.ts` |
| Capture re-bless | 4 known-variance frames at 0% | v36 r4 |
| Listener-leak | 3 cases pass, 0 growth | `listener-leak.spec.ts` |
| Benchmarks | Headless `--plan` works; timed runs escalated | see P2 |
| Study | Protocol committed; not started | `docs/spacegraph/study-protocol.md` |

Capture and review:

```bash
cd packages/app
PLAYWRIGHT_BUILD=1 GRAPH_EXPLORE_DEMO=1 GRAPH_EXPLORE_THEME=diagnose GRAPH_EXPLORE_SEED=7 \
  npx playwright test ./e2e/graph/capture-explore.spec.ts

cd ../..
bun run script/copy-capture-video.ts --prefix graph-capture-explore --dest takes/explore-diagnose.webm
# Review the raw take, marks, and stills:
#   docs/spacegraph/video/takes/explore-diagnose.webm
#   docs/spacegraph/video/marks/marks-explore-diagnose.json
#   docs/spacegraph/video/stills/explore-diagnose/
```

---

## Program — the scenarios

The catalog, shot template, and capability mapping live in `docs/spacegraph/scenarios.md` Parts B–E.
Two waves: film what exists, then build and film the new capabilities.

| # | "I need to…" | Wave | Status |
|---|---|---|---|
| 1 | Know why the build broke | 1 | `exists` |
| 2 | Find the call that caused the failure | 1 | `exists` |
| 3 | See what the subagent actually did | 1 | `exists` |
| 4 | Verify the fix before I merge | 1 | `exists` |
| 5 | Hand this to a teammate | 1 | `exists` |
| 6 | Audit a long session fast | 1 | `exists` |
| 7 | Know what this run cost | 1 | `exists` (flag-gated) |
| 8 | Read a turn without leaving the transcript | 1 | `exists` |
| 9 | Focus on what matters, ignore the rest | 2 | `proposed` (D1) |
| 10 | Keep working while the agent runs | 2 | `partial` (D2) |
| 11 | Open a crowded cluster without losing my place | 2 | `partial` (D3) |

**Wave 1 needs no new code.** Wave 2 needs D1–D3 (`scenarios.md` Part D).

---

## Remaining work

### P0 — film the existing eight (Wave 1)

- [ ] **P0.0 — Void the unverified findings.** The 7 findings written in v37 r3 were not derived from
      watched footage (`audit-13`, `delegate-3`, `trust-5`, `cost-7`, `handoff-9`, `return-11`,
      `night-15`). Archive or delete them so they are not mistaken for evidence. Keep `diagnose-7` and
      `chaos-1` as v36-history only.
- [ ] **P0.1 — Shot lists.** For scenarios 1–8, fill the Part E template: start state, ordered
      actions, the exact text that must be legible, hold length, duration (≤12 s).
- [ ] **P0.2 — Film scenario 1 only, then get sign-off.** "I need to know why the build broke":
      attention badge → Why → readable failed `bun test` error. This is the cheapest proof that the
      scenario format communicates. Do not film the rest until the owner accepts the format.
- [ ] **P0.3 — Film scenarios 2–8.** One take each, stable framing, readable outcome.
- [ ] **P0.4 — Findings per scenario.** From inspected frames only; each cites the scenario and frame.
- [ ] **P0.5 — Review gate per scenario.** Owner sign-off on goal clarity and outcome legibility.

### P1 — build the new capabilities (Wave 2), then film

- [ ] **P1.1 — D1 neighborhood highlighting.** Graded distance-based dimming from the selection:
      BFS distance → smooth opacity (0→1.0, 1→0.85, 2→0.6, 3→0.35, >D→0.15); multi-select by nearest.
      Plug into the `cardTemplate.ts:emphasis()` precedence chain beside `trace.dim`. Decide the
      renderer path first (DOM cards only, or per-node canvas opacity) — see P3.
- [ ] **P1.2 — D2 live conduct.** Composer + followLog exist; add framing of each new node as it
      streams (~400–600 ms move) and wrap the newest node in D1 for a beat. Keep the composer pinned
      while typing.
- [ ] **P1.3 — D3 progressive expansion.** A card affordance that expands a node in place and fans
      out its children, re-fitting only the subtree. Drill depth already caps at 3.
- [ ] **P1.4 — Film scenarios 9–11** with the same definition of done as Wave 1.

### P2 — measurement (carried from v37)

- [ ] **Benchmarks.** Headless `--plan` works. Resolve the strobe worktree monorepo blocker
      (workspace packages `spacegraphjs`, `@opencode/*` not linked in detached worktrees) or record a
      dated escalation with an owner. Do not assume headless is blocked; prove it.
- [ ] **Study.** n≥5 internal first. Tasks map to Diagnose, Audit, Delegate. Record success rate,
      time, wrong turns, preference. Enable the counters in `packages/session-ui/src/graph/study.ts`
      and review weekly; under 5% engagement after two weeks is a park candidate. **Gate:** the Wave 1
      scenario demo must pass owner sign-off first.

### P3 — integrity, gaps, and housekeeping

- [ ] **Verify the trust lens.** `composition-guide.md` calls `graph_trust_lens` a *deleted orphan*,
      but `GraphToolbar.tsx:67` still references it. Confirm whether it is live. No `trust` scenario
      until resolved.
- [ ] **Decide the D1 renderer path.** Does the canvas/WebGL renderer accept per-node opacity? If not,
      ship D1 for DOM cards first.
- [ ] **Resolve the coverage gaps** (`scenarios.md` Part C): `trace=related/downstream`, `hybrid`
      surface, `export` as a file. Add a scenario, park, or declare not-demoable — do not leave blank.
- [ ] **Compaction visibility.** Decide whether compaction can be filmed as an outcome or only stated
      as a caption.
- [ ] **Housekeeping.** Remove `stills/story-*` if superseded; keep `archive/` frozen.

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
| Trust lens | Verify | Docs say deleted orphan; toolbar still refs; prior take was a probable no-op |
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
| Which gap row earns a scenario? | Before Wave 2 filming | Pick one of related-trace / hybrid / export |
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

## Revision log

- **r0 (2026-11-14):** Split v38 from v37 after the direction reset (v37 r8).
  - Refocused the demo from seeded random takes to **goal scenarios**; catalog in
    `docs/spacegraph/scenarios.md`.
  - Rejected random-detour takes, layout roulette, and themed cuts in the kill register.
  - Carried open work: benchmarks, study, pixel gate, listener-leak, capture re-bless, banner fix,
    kill/park register, open decisions.
  - Added: void the 7 unverified findings; film scenario 1 first for format sign-off; build D1–D3
    before Wave 2; verify the trust lens.
  - v37 frozen as history.
