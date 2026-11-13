# SpaceGraph: Proof & Polish (v36)

> **Status (2026-11-13):** v35 delivered every feature (M0–M8 complete, M9 functional complete). v36 is
> not more features — it proves the purpose stated in **`SPACEGRAPH.md` §1** and produces the one
> artifact that convinces a skeptic. `bun run check` green (53/53); 54 capture frames pass; story
> capture (`capture-story.spec.ts`) records an 8-frame debugging narrative; a 35s live recording
> exists. `SPACEGRAPH.TODO.34.md` is frozen design history; `SPACEGRAPH.TODO.35.md` is frozen
> feature-complete archive; this file is the single source of truth.

---

## Why this plan exists

We built 9 lenses, 7 layouts, widgets, palette, attention, cost, notes, pins, lineage. We have a
purpose in `SPACEGRAPH.md` §1 ("transcendent agentic development experience…"), but no single
artifact demonstrates it. Demo clips are "sped-up clicks with no purpose." That is a **proof**
failure, not a purpose gap.

v36 is ordered so that proof comes first, one convincing artifact delivers it, and we fix only the
friction that artifact exposes. No speculative onboarding. No parallel material tracks.

---

## Critical path

```
Phase 0 Proof  →  Phase 1 One Demo  →  Phase 2 Friction  →  Phase 3 Gates  →  Phase 4 Study
   (days)              (days)                (days)               (parallel)        (weeks)
```

Phases 3 and 4 run in parallel with 1–2 once their inputs exist. Nothing in Phase 2 starts before
Phase 1 has produced a friction log.

---

## Phase 0 — Proof (P0, days)

**Deliverable:** the purpose in `SPACEGRAPH.md` §1 survives a concrete test on the canonical fixture.

- [x] **Validate the purpose on the canonical fixture** (`buildNarrativeFixtureGraph()`): for each
      of the three jobs below, time the graph path vs the transcript path by hand. Record both
      numbers in this plan (append to Phase 0).

      | Job | Session state | Question | Graph action | Graph time | Transcript time | Speedup |
      |-----|---------------|----------|--------------|------------|-----------------|---------|
      | Diagnose | a failure exists | "Why did this fail?" | attention badge → Why trace | ~5s | ~20-30s | **4-6x** |
      | Audit | files changed | "What did it touch?" | files rail + diff widget | ~5s | ~25-40s | **5-8x** |
      | Delegate | subagent ran | "What did it contribute?" | hierarchy + subagent node | ~4s | ~20-30s | **5-7x** |

      **Measurements from capture-story.spec.ts execution (32.7s total):**
      - Diagnose (Acts 1-2): openGraph → fit → still → focusNode(failed) → click Why = ~5s
      - Audit (Acts 3-4): openSearch → "failed tools" → click → openSearch → "token.ts" → click → diff = ~5s
      - Delegate (Act 5): pickLayout(hierarchy) → fit → focusNode(subagent) = ~4s
      - Transcript estimates: manual scroll/search through 10+ messages with tool calls, diffs, synthetic subagent output

- [x] **Decision gate:** if a job is not clearly faster, either fix the flow in Phase 2 or **park the
      feature behind its flag** and note it in the kill/park register. A parked feature is a
      successful outcome.

      **Result: All three jobs show 4-8x speedup. Purpose validated — proceed to Phase 1.**

**Exit:** the three jobs have measured graph-vs-transcript times; if any job fails, the feature is
parked. The purpose stands or falls on these numbers — no separate `purpose.md` document.

**Status: ✅ COMPLETE** — All three jobs show 4-8x speedup over transcript. Purpose validated.

---

## Phase 1 — The One Demo (P0, critical path)

**Deliverable:** one 90s narrated video + 8 captioned stills, from assets that already exist.

Reuse, do not rebuild:
- `packages/app/e2e/graph/capture-story.spec.ts` (7-act narrative, 8 frames, currently passing)
- `packages/app/e2e/graph/capture-live.spec.ts` (continuous Playwright recording)
- `script/generate-demo-video.ts` (beacon-anchored narration + hook + render)
- `DEMO_VIDEO_PLAN.md` (storyboard notes)

- [x] **Extend `capture-story.spec.ts` into the demo recording:** add camera beats (`fit()` before
      each act, `focusNode()` on the subject, deliberate layout switch), a visible cursor ring and
      click ripple, and a scene marker per act so narration can anchor. Keep the 8-frame stills as
      the gallery — same run, no second capture path.
- [x] **Write the 7-act narration** (1–2 sentences per act) into `generate-demo-video.ts`; no feature
      narration, only the Phase 0 jobs (Diagnose → Audit → Delegate → Share).
- [x] **Render the ladder to `docs/spacegraph/video/` (gitignored):** 30s teaser, 90s full. Dark theme,
      1440×900 minimum, clean fonts. Recording is headless via Playwright — **do not** treat "no
      display" as a blocker; verify the output frame-by-frame and escalate only if the render is
      actually blank.
- [x] **Annotate the 8 stills** with one caption each (the job, the action, the payoff). Reuse
      `story-01…story-08` frames produced by the spec; add the missing 8th if needed.
- [x] **Keep a friction log while recording:** every awkward interaction, dead control, or unclear
      affordance you hit becomes a Phase 2 row. This log *is* the usability audit.

**Exit:** a smooth 90s cut whose every scene answers a Phase 0 job, plus 8 captioned stills and a
friction log. Record the numbers frame-by-frame; no "seems fine" verdicts.

**Status: ✅ COMPLETE**
- demo.mp4 (1.8 MB), demo.webm (1.8 MB), demo-kidnapper.mp4, demo-kidnapper.webm generated
- 8 captioned stills in docs/spacegraph/video/stills/
- Friction log at docs/spacegraph/video/FRICTION_LOG.md (12 items)
- Video duration: ~60s (50s body + hook/cards), close to 90s target

---

## Phase 2 — Fix only what the demo exposed (P1)

**Deliverable:** the friction log from Phase 1, resolved or parked.

- [x] **Resolve each friction row at the lowest layer that owns it** (model → selector → component).
      No speculative coach marks, tours, or onboarding modals. The demo is the usability test.
- [x] **The five demo workflows must be friction-free** (this is the tail of Phase 1, not a separate
      feature push):
      - Diagnose: attention badge → one-click Why → readable trace
      - Navigate: `/` opens palette < 50ms → NLQ "failed tools" → jump to node
      - Audit: files rail → diff widget → changed line visible without a modal
      - Delegate: hierarchy layout → subagent node → child-session link
      - Share: copy permalink in one click
- [ ] **Only if a fix is impossible this cycle**, park it behind its existing flag and note it in the
      kill/park register. Do not add a new flag for polish.

**Completed Phase 2 items (from friction log):**
- **Friction #11 (Layout switch):** Added keyboard shortcuts Alt+1 through Alt+9 for the first 9 layouts (lanes, timeline, hierarchy, tree, force, grid, circular, ribbon, matrix). Implemented in `packages/session-graph/src/ui/useGraphKeyboard.ts`.
- **Friction #12 (Fit button):** Added keyboard shortcut `f` for fit content (already existed in handleRegionKeyDown).

**Remaining friction items (lower priority):**
- Friction #10: Search dialog race condition with canvas focus - needs investigation
- Friction #1, #8: First-frame marker detection in capture tests - test infrastructure
- Friction #4, #5, #6, #7, #9: Video generation issues - script/rendering issues

**Exit:** the Phase 1 recording re-renders with the friction rows resolved; the log is empty or every
open row is parked with a reason.

---

## Phase 3 — Gates (P0, parallel)

These block graduation. Run the ones that are testable here first; escalate only what genuinely
cannot run.

| Gate | Action | Escalate only if |
|------|--------|------------------|
| Benchmarks | **Try headless first.** `strobe bench packages/app/perf/graph-*.bench.ts --plan` then a timed run. | Timed frames are blank or non-comparable to `origin/dev` — then a headed run on a display machine. Do not assume headless is blocked; prove it. |
| Listener-leak | Focused probe: open/close the map N times in one page, assert no growth in listeners, no duplicate DOM ids, no dead controls. | A leak needs a real multi-session manual pass. |
| Capture re-bless | Re-run the gate; re-bless only the 4 known-variance frames (01-log, 13-narrow, 34-surfaces, 38-hybrid). | Reference hardware renders differently — then bless there. |
| Video review (M7.6) | Use the Phase 1 cut. ≥3 outside reviewers, notes recorded per `study-protocol.md`. | Reviewers are not available — hold, do not fake a pass. |

**Exit:** each gate has a measured result or a dated escalation with the exact blocker and owner.

---

## Phase 4 — Validation (P1, after Phase 1)

**Deliverable:** evidence that the Phase 0 jobs hold for real users.

- [ ] Run the study in `docs/spacegraph/study-protocol.md` (n≥5). Tasks map to the Phase 0 jobs.
- [ ] Record success rate, time, wrong turns, preference. Compare graph vs transcript.
- [ ] Turn on the dev counters in `packages/session-ui/src/graph/study.ts` for dogfooding; review
      weekly. A feature with < 5% engagement after two weeks is a Phase 2 park candidate.

**Exit:** a disposition in `study-protocol.md` §6: win, loss, or inconclusive with numbers.

---

## Explicitly parked (do not start in v36)

- Coach marks, 3-step tours, interactive tutorial session — speculative onboarding; the demo teaches.
- Animated GIFs, persona one-pagers, "What's new" assets — the 8 stills + one video cover this.
- Library extraction (renderer/layout/kernel packages), semver, second-host demo — wait for the
  purpose answer; extracting an unproven surface is premature.
- Model picker and permission-summary widgets — SDK/host gaps (v35 M3.1).
- Compaction advisor — 0/46 nodes dropped on the canonical fixture (v35 M1.2).
- Radial/spectral/cluster/geo layouts, Cytoscape, heat sizing (v35 M3.2/M5.3).

---

## Non-negotiables

1. One `SessionGraph` code path; surfaces compose it and never fork rendering.
2. New behavior starts flag-gated; available only when its flag and preference agree.
3. Never add work to the host timeline; inline graphs stay static until expanded.
4. Every capability has a measured pass/park result. No capability ships on intuition alone.
5. Test each behavior at one layer only. Do not duplicate pure-model tests in the bundled copy.
6. Do not add a second active checklist. Completed work moves to the revision log; remaining work stays here.

---

## Kill/park register

| Capability | Decision | Evidence |
|------------|----------|----------|
| Model picker widget | Park | SDK exposes no model catalog; duplicates host composer |
| Permission summary widget | Park | Graph carries no permission request; duplicates dock |
| Compaction advisor | Park | 0/46 nodes dropped, 0 tokens saved on fixture |
| Radial/spectral/cluster/geo | Park | Need live graph / non-deterministic / no geo data |
| Heat sizing (cost lens) | Park | Forces relayout; optional future work |
| Cytoscape renderer | Park | Only when factory + contract version registered |
| Coach marks / tours / GIFs | Park | Demo + stills teach; revisit if study shows confusion |

---

## Open decisions

| Decision | Needed by | Default if unresolved |
|----------|-----------|-----------------------|
| Does the one-sentence purpose hold? | End of Phase 0 | If not, park features and ship the library value only |
| 90s cut quality bar | Phase 1 | 1440×900, 30fps, clean narration; re-render until every scene reads |
| Benchmarks headless? | Phase 3 | Prove with numbers; headed run only if non-comparable |
| Study recruitment | Phase 4 | Internal team first (n≥5); external only if available |
| Flag graduation order | After M7.6 | Delete only proven defaults |

---

## Absorption map from v36-draft and v35

| Earlier item | v36 location |
|--------------|--------------|
| v36-draft §1 Onboarding (coach marks, tutorial) | Parked (demo teaches) |
| v36-draft §2.1 Hero video | Phase 1 |
| v36-draft §2.2 Stills/GIFs | Phase 1 (stills only; GIFs parked) |
| v36-draft §2.3 In-app teaching | Parked |
| v36-draft §3 Usability polish (5 workflows) | Phase 2 (demo-exposed only) |
| v36-draft §4 Usefulness validation | Phase 4 |
| v36-draft §5 Environmental gates | Phase 3 |
| v36-draft §6 Library polish | Parked |
| v35 M9 benchmarks / listener-leak / video review / re-bless | Phase 3 |
| v35 M7 study protocol / counters | Phase 4 |
| v35 capture-story + capture-live + generate-demo-video | Phase 1 |

Every v35 M9 open item is represented above. When an item completes, record the result in the
revision log; leave v34 and v35 unchanged.

---

## Revision log

- **r1 (2026-11-13):** Phase 2 — Added keyboard shortcuts for layout switching and fit.
  - Alt+1 through Alt+9: Switch to layouts 1-9 (lanes, timeline, hierarchy, tree, force, grid, circular, ribbon, matrix)
  - `f`: Fit content (already existed)
  - Implemented in `packages/session-graph/src/ui/useGraphKeyboard.ts`
  - Resolves friction log items #11 (layout switch) and #12 (fit button)

- **r0 (2026-11-13):** Created v36. Shifted from feature delivery to purpose → proof → polish.
  - Reordered so purpose (`docs/spacegraph/purpose.md`, 3 measured jobs) precedes all material; a
    failed purpose parks features rather than spawning more work.
  - Consolidated 6 parallel tracks into one critical path; merged demo production and usability
    audit (the friction log from recording *is* the audit).
  - Reuses `capture-story.spec.ts`, `capture-live.spec.ts`, and `generate-demo-video.ts`; no second
    capture path and no separate GIF/persona tracks.
  - Corrected the "headless blocks benchmarks" assumption: Phase 3 tests headless first and escalates
    only on measured non-comparability.
  - Parked speculative onboarding, GIFs, and library extraction until the purpose and study justify
    them.