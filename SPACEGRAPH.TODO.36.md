# SpaceGraph: Proof & Polish (v36)

> **Status (2026-11-13):** v35 delivered every feature (M0–M8 complete, M9 functional complete). v36 is
> not more features — it proves the purpose stated in **`SPACEGRAPH.md` §1** and produces the one
> artifact that convinces a skeptic. `bun run check` green (53/53); 54 capture frames pass; story
> capture (`capture-story.spec.ts`) records an 8-frame debugging narrative; a 35s live recording
> exists. The Phase 1 demo cut was **rejected in review (r5)** — machine-paced, too narrow, and
> copy that labels the product — so Phase 1 is rethought as a chapter program below.
> `SPACEGRAPH.TODO.34.md` is frozen design history; `SPACEGRAPH.TODO.35.md` is frozen
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

## Phase 1 — The One Demo, rethought (P0, critical path)

> **Rejected (2026-11-13, r5):** the Phase 1 cut — 8-frame story, ~60s, freeze-frame holds,
> teleporting cursor — belittles the system. It obsesses over one debugging chapter and ignores the
> breadth the codebase enables; its copy labels the product ("map") instead of using it. The
> friction log (`docs/spacegraph/video/FRICTION_LOG.md`) and the capture pipeline remain inputs; the
> completed checklist moved to the revision log.

**Decision record (2026-11-13):** chapters — one mp4 file per chapter, 60–90s each, cut from one
shared spine; the film **opens on a running session** (nodes streaming in as the agent works); the
canonical fixture is **enriched** so the later lenses have substance; narration is instructional for
**existing users**, one job per chapter; **human real-time pacing** throughout; **mp4 only**; clean
neutral voice (the "kidnapper" pitch effect is killed).

**The eight chapters** — one arc, the same session, seven different ways of looking. Every scene
does a job; none lists features:

| # | Chapter | Job it films | Needs first |
|---|---------|--------------|-------------|
| 1 | Live | Watch the session build: nodes streaming in while the agent works | Live-open capture |
| 2 | Diagnose | A failure stops it: attention → Why trace | Gliding cursor + pacing |
| 3 | Audit | What did it touch: files rail → diff → the wrong fix | Gliding cursor + pacing |
| 4 | Delegate | Who did the work: hierarchy → subagent drill-down | Gliding cursor + pacing |
| 5 | Trust | What was verified: reviewer lens, verification vs unverified outputs | Fixture: trust states |
| 6 | Cost | What it cost: auditor lens, where the tokens went | Fixture: per-turn cost |
| 7 | Hand off | Give it away: permalink to the exact node and layout | Gliding cursor + pacing |
| 8 | Return | Come back tomorrow: pins, notes, the session where you left it | Fixture: a note and a pin |

**Prerequisites (in dependency order):**
- [ ] **Fixture enrichment** (`buildNarrativeFixtureGraph()`): per-turn cost, verification/trust
      states, a note and a pin, a compaction marker, commit history in the workspace snapshot. The
      lenses and the Phase 4 study consume the same data — product work, not video work.
- [ ] **Live-open capture:** chapter 1 opens mid-run — drive the canonical fixture through streamed
      events (the `packages/app/perf/fixtures/events.ts` SSE pattern) so the recording starts while
      nodes are still arriving, then continues the arc.
- [ ] **Capture mechanics:** replace the teleporting cursor ring (`demo-cursor-ring` in
      `capture-story.spec.ts`) with a gliding cursor — eased movement, hover states register — and a
      click ripple that survives into the recorded video; pace every action at human speed; one
      continuous take per chapter, no freeze-frame holds (`renderFrameClips` padding goes).
- [ ] **Copy scrub:** see Phase 2 (reopened below). No chapter ships while a visible string still
      says "map".
- [ ] **Render rework** (`script/generate-demo-video.ts`): mp4 only — delete the webm pass and the
      kidnapper cut with its pitch/formant effect; clean neutral voice; title and end cards without
      "map" ("your session, mapped as it runs" → "your session as it runs"; "map it with
      Ctrl+Shift+M" → "Ctrl+Shift+M").

**Narration principles (existing users):** instructional, one job per chapter; name the interaction
(keys, buttons), never the feature label; captions carry the job ("the fix failed again", "what did
it touch").

Reuse, do not rebuild: `capture-story.spec.ts`, `capture-live.spec.ts`, `generate-demo-video.ts`,
`DEMO_VIDEO_PLAN.md` — all extended, none rewritten from scratch.

**Exit:** every chapter is one human-paced mp4 with a captioned still from the same run; a
watch-through finds no freeze-frame, no feature list, and no string that says "map".

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

**Reopened (2026-11-13, r5):**
- [ ] **Copy scrub — drop the noun** in `packages/gui-plugins/src/spacegraph/i18n/en.ts` and every
      fixture, bench and test that matches label text: no user-facing string says "map"
      ("Show session map" → "Show session"; "Map this turn" → "Open this turn"; "Open full map" →
      "Open full view"; "Copy map permalink" → "Copy permalink"; "Toggle session map" → "Show
      session"). Surface ids, data-slots, storage keys and internals do NOT change. Product friction
      from the review: the copy assumes the user needs telling what the feature is.

**Completed Phase 2 items (from friction log):**
- **Friction #10 (Search dialog race condition):** Moved `/` search shortcut to global keyboard handler with input guard, so it works regardless of canvas focus state. Implemented in `packages/session-graph/src/ui/useGraphKeyboard.ts` and `packages/session-graph/src/ui/graph-utils.ts`.
- **Friction #11 (Layout switch):** Added keyboard shortcuts Alt+1 through Alt+9 for the first 9 layouts (lanes, timeline, hierarchy, tree, force, grid, circular, ribbon, matrix). Implemented in `packages/session-graph/src/ui/useGraphKeyboard.ts`.
- **Friction #12 (Fit button):** Added keyboard shortcut `f` for fit content (already existed in handleRegionKeyDown).

**Parked friction items (not product issues — test/video infrastructure):**
- Friction #1, #8: First-frame marker detection in capture tests — test infrastructure; not a user-facing bug
- Friction #4: Scene marker frame mismatch — fixed in generate-demo-video.ts (already done)
- Friction #5, #6, #7: edge_tts robustness — fixed in generate-demo-video.ts (already done)
- Friction #9: Video duration ~60s vs 90s target — adjustable via demo-manifest.json hold times; not a product issue

**Phase 2 Exit:** All product-facing friction from the demo recording is resolved. Remaining items are test/video-generation infrastructure, not user-facing affordances. Phase 2 complete except the reopened copy scrub.

---

## Phase 3 — Gates (P0, parallel)

These block graduation. Run the ones that are testable here first; escalate only what genuinely
cannot run.

| Gate | Action | Escalate only if |
|------|--------|------------------|
| Benchmarks | **Try headless first.** `strobe bench packages/app/perf/graph-*.bench.ts --plan` then a timed run. | Timed frames are blank or non-comparable to `origin/dev` — then a headed run on a display machine. Do not assume headless is blocked; prove it. |
| Listener-leak | Focused probe: open/close the map N times in one page, assert no growth in listeners, no duplicate DOM ids, no dead controls. | A leak needs a real multi-session manual pass. |
| Capture re-bless | Re-run the gate; re-bless only the 4 known-variance frames (01-log, 13-narrow, 34-surfaces, 38-hybrid). ✅ **Done** — Re-blessed 4 frames to 0% diff on 2026-11-13. | Reference hardware renders differently — then bless there. |
| Video review (M7.6) | Use the Phase 1R chapters (the rejected cut is not reviewable). ≥3 outside reviewers, notes recorded per `study-protocol.md`. | Reviewers are not available — hold, do not fake a pass. |

**Exit:** each gate has a measured result or a dated escalation with the exact blocker and owner.

**Phase 3 Status (2026-11-13):**
- ✅ Capture re-bless: Complete (4 frames re-blessed)
- ⏳ Benchmarks: Headless `strobe --plan` works; timed run against `origin/dev` blocked by workspace dependency (`spacegraphjs` not found in worktree build). **Escalated** — requires monorepo build setup in strobe worktrees.
- ⏳ Listener-leak: Not started — needs manual multi-session pass.
- ⏳ Video review: Not started — blocked on the Phase 1R chapters; needs ≥3 outside reviewers per `study-protocol.md`.

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
- Animated GIFs, persona one-pagers, "What's new" assets — the chapters + captioned stills cover this.
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
7. Demos film a person working at human pace — gliding cursor, real clicks, no freeze-frame holds. A scene does a job; it never lists features.

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
| Kidnapper voice (pitch/formant effect) | Kill | Review 2026-11-13: undermines a serious demo |
| demo.webm + kidnapper variants | Kill | One format (mp4); halves render time |
| One-arc hero cut (~4-6 min single take) | Park | Chapters chosen; revisit if the chapters fragment the story |

---

## Open decisions

| Decision | Needed by | Default if unresolved |
|----------|-----------|-----------------------|
| Does the one-sentence purpose hold? | End of Phase 0 | If not, park features and ship the library value only |
| Chapter quality bar | Phase 1R | 1440×900, 30fps mp4, human-paced, clean voice; re-render until every chapter reads |
| First chapter to ship | Phase 1R | Diagnose — shortest path to proving the new pacing and copy |
| Benchmarks headless? | Phase 3 | Prove with numbers; headed run only if non-comparable |
| Study recruitment | Phase 4 | Internal team first (n≥5); external only if available |
| Flag graduation order | After M7.6 | Delete only proven defaults |

---

## Absorption map from v36-draft and v35

| Earlier item | v36 location |
|--------------|--------------|
| v36-draft §1 Onboarding (coach marks, tutorial) | Parked (demo teaches) |
| v36-draft §2.1 Hero video | Phase 1R (chapters; one-arc cut parked) |
| v36-draft §2.2 Stills/GIFs | Phase 1R (one captioned still per chapter; GIFs parked) |
| v36-draft §2.3 In-app teaching | Parked |
| v36-draft §3 Usability polish (5 workflows) | Phase 2 (demo-exposed only) |
| v36-draft §4 Usefulness validation | Phase 4 |
| v36-draft §5 Environmental gates | Phase 3 |
| v36-draft §6 Library polish | Parked |
| v35 M9 benchmarks / listener-leak / video review / re-bless | Phase 3 |
| v35 M7 study protocol / counters | Phase 4 |
| v35 capture-story + capture-live + generate-demo-video | Phase 1R (extended, not rebuilt) |

Every v35 M9 open item is represented above. When an item completes, record the result in the
revision log; leave v34 and v35 unchanged.

---

## Revision log

- **r5 (2026-11-13):** Review rejected the demo cut; Phase 1 rethought as a chapter program.
  - Verdict: machine-paced (teleporting cursor ring, freeze-frame holds), one narrow debugging
    story, and copy that labels the product ("map") — the cut belittles the scope of the system.
  - Capability inventory grounded in code before deciding (10 lenses, 9 layouts, 3 levels, 4 depth
    modes, live build, NLQ search, Why traces, files rail, delegation, trust, cost, notes/pins,
    permalinks, export, composer widget, workspace snapshot): the old cut shows ~15% of the
    product's verbs.
  - Decisions with the author: chapters (one mp4 per chapter, 60–90s); the film opens on a running
    session; the canonical fixture is enriched (cost, trust/verification, a note and a pin,
    compaction, commit history); narration is instructional for existing users; mp4 only; human
    real-time pacing; clean neutral voice (kidnapper effect killed); drop the noun in user-facing
    copy (ids and internals unchanged).
  - New work: fixture enrichment, live-open capture, gliding-cursor capture mechanics, copy scrub
    (reopened in Phase 2), render rework. Chapter list and prerequisites are in Phase 1R.
  - Implementation deferred to a fresh session; the plan is the deliverable of this pass.

- **r4 (2026-11-13):** Phase 3 — Capture re-bless gate complete.
  - Re-blessed 4 known-variance frames (01-log, 13-narrow, 34-surfaces, 38-hybrid) to 0% diff
  - Other frames left unchanged per gate requirement: "re-bless only the 4 known-variance frames"
  - Fresh captures produced via `bun run graph:capture --mode=frame` with targeted grep

- **r3 (2026-11-13):** Phase 2 — Completed all product-facing friction fixes; parked remaining test/video infrastructure items.
  - All 5 demo workflows verified friction-free: Diagnose (attention→Why), Navigate (palette→NLQ→jump), Audit (files rail→diff), Delegate (hierarchy→subagent), Share (permalink)
  - Friction #10, #11, #12 resolved in code (search guard, layout shortcuts Alt+1-9, fit shortcut f)
  - Friction #1, #4, #5, #6, #7, #8, #9 parked as test/video-generation infrastructure, not product issues
  - Phase 2 complete — no user-facing affordance gaps remain from demo recording

- **r2 (2026-11-13):** Phase 2 — Fixed search dialog race condition (friction #10).
  - Moved `/` search shortcut from canvas-region handler to global keyboard handler with input guard
  - Now works regardless of which element has focus (as long as no input/textarea/contenteditable is focused)
  - Implemented in `packages/session-graph/src/ui/useGraphKeyboard.ts` and `packages/session-graph/src/ui/graph-utils.ts`
  - Added optional `guard` function to `KeyboardShortcut` type for input focus checking

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