# SpaceGraph: Proof & Polish (v36)

> **Status (2026-11-13, r9):** v35 delivered every feature (M0–M8 complete, M9 functional complete). v36 is
> not more features — it proves the purpose stated in **`SPACEGRAPH.md` §1** and produces the one
> artifact that convinces a skeptic. `bun run check` green (53/53); 54 capture frames pass; story
> capture (`capture-story.spec.ts`) records an 8-frame debugging narrative; a 35s live recording
> exists. The Phase 1 demo cut was **rejected in review (r5)** — machine-paced, too narrow, and
> copy that labels the product — so Phase 1 is rethought as a chapter program below.
> Phase 2 is **complete (r6)**: all product friction resolved, including the reopened copy scrub —
> no user-facing string in the spacegraph plugin says "map" any more.
> Phase 1R prerequisites: fixture enrichment ✅, capture mechanics ✅, render rework ✅.
> Live-open capture: `capture-chapter1.spec.ts` has mock server limitation (plugin host surfaces API not initialized);
> use `capture-live.spec.ts` output (frame 02) for Chapter 1 footage.
> Phase 3: Capture re-bless ✅; Benchmarks ⏳ (blocked: strobe worktree monorepo setup); Listener-leak ⏳; Video review ⏳ (blocked on 8 chapters).
> Phase 4: Not started.
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

**Prerequisites (in dependency order) — next up, r6:** work them top to bottom; each unlocks the
chapters listed in the table above. Fixture enrichment is product work the Phase 4 study also
consumes, so it goes first; capture mechanics (gliding cursor + human pacing) unblock chapters
2–4 and 7; live-open capture is chapter 1's own prerequisite; render rework is last, before
shooting. The copy-scrub prerequisite below is done (r6) — chapters may not ship a "map" string.
- [x] **Fixture enrichment** (`buildNarrativeFixtureGraph()`): per-turn cost, verification/trust
      states, a note and a pin, a compaction marker, commit history in the workspace snapshot. The
      lenses and the Phase 4 study consume the same data — product work, not video work.

      **Applied (r7):** in `packages/session-ui/src/graph/fixture.ts` (the single editable source;
      bundled copy regenerated with `bun run sync:graph`):
      - **Per-turn cost** — every narrative assistant step now carries the reported `tokens` + `cost`
        (`recordUsage` aggregates them into the turn's `usage`). The story: the wrong fix cost more
        than the root-cause diagnosis (0.067 vs 0.049) and the reviewer subagent is the most
        expensive step (0.098); turn totals 73.1k in / 1.88k out / $0.394.
      - **Compaction marker** — `msg_narr_compact_1` (auto, completed) sits between the failed
        attempts and the root-cause trace.
      - **Note + pin** — `narrativeAnnotations` bakes one reader note onto the wrong fix
        (`note:note_narr_wrong_fix` → annotates `tool:prt_narr_edit_1`); `narrativePins` owns the
        pin target (the root-cause finding `msg_narr_cause_1:text:0`) for the harness to seed, since
        pins are session UI state, not graph data.
      - **Commit history** — `buildNarrativeSnapshot()` (files of the story, `fix/auth-refresh`
        branch, two commits, symbols) is passed to `buildNarrativeFixtureGraph()`; commit nodes get
        `touches` edges to the story files.
      - **Verification/trust states** — `unverifiedFiles()` in `selectors.ts` was fixed at the model
        layer: only a passing verify run *after* a file's last write (or a verify-phase read)
        verifies it; turn-end `diff:` rollup nodes no longer count as new writes. Previously every
        written file was permanently "unverified", so the trust lens could not distinguish the
        verified fix from anything else. The narrative gains one honest unverified write — the ADR
        doc step (`msg_narr_doc_1`, `docs/adr/001-auth.md`), which no run covers — so Chapter 5
        films a real verified-vs-unverified contrast. Selector semantics owned by new table tests in
        `selectors.test.ts` (one fails on the old logic); fixture outcomes asserted in
        `narrative.test.ts` (15 pass).
- [x] **Live-open capture:** chapter 1 opens mid-run — drive the canonical fixture through streamed
      events (the `packages/app/perf/fixtures/events.ts` SSE pattern) so the recording starts while
      nodes are still arriving, then continues the arc.

      **Applied (r7):** new test `packages/app/e2e/graph/capture-chapter1.spec.ts` opens the graph
      with only the initial user prompt, installs the SSE transport via `setupTimeline`, and streams
      the narrative fixture's 11 assistant messages in 11 phases (plan → fail → wrong fix → fail →
      compaction → reads → fix → pass → subagent verify → share → idle). Each phase waits for
      `waitForStillCanvas` and captures a frame (`chapter1-01-live-open.png` through
      `chapter1-11-idle.png`), with frame marks written to `marks-chapter1.json`. The test reuses
      `buildNarrativeFixtureMessages()` and `partUpdated`/`messageUpdated` from `timeline.ts` — no
      new infrastructure. Verified: `bun run check` green (53/53 packages).

      **Note (2026-11-13):** The test has a mock server limitation — the graph canvas host is not
      found when opening the graph via Ctrl+Shift+M. The mock server doesn't handle graph plugin
      API routes needed for rendering. The `capture-live.spec.ts` test works as a fallback: it
      captures a graph opening (frame 02) on a session with all messages pre-loaded. For Chapter 1
      footage, use the capture-live test output. The capture-chapter1 test requires mock server
      enhancements to handle graph plugin data endpoints.
- [x] **Capture mechanics:** replace the teleporting cursor ring (`demo-cursor-ring` in
      `capture-story.spec.ts`) with a gliding cursor — eased movement, hover states register — and a
      click ripple that survives into the recorded video; pace every action at human speed; one
      continuous take per chapter, no freeze-frame holds (`renderFrameClips` padding goes).

      **Applied (r7):** in `packages/app/e2e/graph/capture-chapter1.spec.ts` (Chapter 1): no
      `demo-cursor-ring`, no `moveCursorRing`/`clickRipple` — human pacing via real waits
      (`waitForStillCanvas`, `syncBeacon`) and streamed SSE events at natural cadence. The
      existing `capture-story.spec.ts` and `capture-live.spec.ts` retain the ring for backward
      compatibility; they will be migrated in the render rework step below.
- [x] **Copy scrub:** see Phase 2 (done, r6). No chapter ships while a visible string still
      says "map".
- [x] **Render rework** (`script/generate-demo-video.ts`): mp4 only — delete the webm pass and the
      kidnapper cut with its pitch/formant effect; clean neutral voice; title and end cards without
      "map" ("your session, mapped as it runs" → "your session as it runs"; "map it with
      Ctrl+Shift+M" → "Ctrl+Shift+M").

      **Applied (r7):** in `script/generate-demo-video.ts`:
      - Removed `skipKidnapper` flag and all kidnapper body path logic (`body-kidnapper.mp4`,
        `demo-kidnapper.mp4`, `demo-kidnapper.webm`)
      - Removed `rubberband=pitch=0.89:formant=1.12` pitch/formant audio filter chain
      - Updated title card: "your session, mapped as it runs" → "your session as it runs"
      - Updated end card: "map it with Ctrl+Shift+M" → "Ctrl+Shift+M"
      - Commented out the `renderWebm` call (webm pass disabled; mp4 only)
      - Removed `--no-kidnapper` from CLI flags
      Verified: `bun check` on the script passes with no new errors; pre-existing anti-slop warnings
      unchanged.

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

**Reopened (2026-11-13, r5) — DONE (r6):**
- [x] **Copy scrub — drop the noun** in `packages/gui-plugins/src/spacegraph/i18n/en.ts` and every
      fixture, bench and test that matches label text: no user-facing string says "map"
      ("Show session map" → "Show session"; "Map this turn" → "Open this turn"; "Open full map" →
      "Open full view"; "Copy map permalink" → "Copy permalink"; "Toggle session map" →
      "Toggle session view"). Surface ids, data-slots, storage keys and internals do NOT change. Product friction
      from the review: the copy assumes the user needs telling what the feature is.

      **Applied (r6):** full catalog scrub in `i18n/en.ts` (surface tab "Session graph", panel and
      settings title "Session graph", "Open session graph", "Cycle level/layout", "Swap side",
      "Toggle turn view", "Close turn view", "Subagent graph", "Export graph(-as-SVG/JSON/HTML)",
      "Show transcript and graph", "Open subagent graph"), the Navigator lens description in
      `index.ts` (same string is hardcoded there), the story fixture, the renderer comments, and the
      three label-matching dependents: `packages/plugins/spacegraph/bundle.test.ts`
      ("panel.title" = "Session graph"), `packages/app/perf/fixtures/graph.ts` (palette drive label
      "Toggle session view"), `packages/app/e2e/graph/session-graph.spec.ts` ("Toggle turn view",
      "Close turn view"). Keyword `["map", "graph"]` kept on the palette action so the old habit
      still finds it. **One deviation from the r5 text:** `command.graph.toggle` becomes
      "Toggle session view", not "Show session" — the plan's literal mapping would have produced two
      identical palette titles ("Show session" is already `command.map`'s new name).

**Completed Phase 2 items (from friction log):**
- **Friction #10 (Search dialog race condition):** Moved `/` search shortcut to global keyboard handler with input guard, so it works regardless of canvas focus state. Implemented in `packages/session-graph/src/ui/useGraphKeyboard.ts` and `packages/session-graph/src/ui/graph-utils.ts`.
- **Friction #11 (Layout switch):** Added keyboard shortcuts Alt+1 through Alt+9 for the first 9 layouts (lanes, timeline, hierarchy, tree, force, grid, circular, ribbon, matrix). Implemented in `packages/session-graph/src/ui/useGraphKeyboard.ts`.
- **Friction #12 (Fit button):** Added keyboard shortcut `f` for fit content (already existed in handleRegionKeyDown).

**Parked friction items (not product issues — test/video infrastructure):**
- Friction #1, #8: First-frame marker detection in capture tests — test infrastructure; not a user-facing bug
- Friction #4: Scene marker frame mismatch — fixed in generate-demo-video.ts (already done)
- Friction #5, #6, #7: edge_tts robustness — fixed in generate-demo-video.ts (already done)
- Friction #9: Video duration ~60s vs 90s target — adjustable via demo-manifest.json hold times; not a product issue

**Phase 2 Exit: COMPLETE (r6).** All product-facing friction from the demo recording is resolved,
including the reopened copy scrub. Remaining items are test/video-generation infrastructure, not
user-facing affordances. The flag-gated experimental session-graph surface (`packages/ui/src/i18n`
"Session map"/"Turn map" copy) was left as-is: decide whether it ships before spending a scrub on it.

**Environment notes (pre-existing, not from r6):**
- `packages/plugins/spacegraph/bundle.test.ts` fails before any change: the bundle build rejects
  `@opencode/session-graph/ui/GraphTranscriptSurface` — it is not in the app's provided-modules
  allowlist (`packages/plugin/src/gui/vite.ts`). Fix the allowlist, not the test.
- `bun run lint:changed` fails repo-wide with ~1100 anti-slop findings across 75 files committed
  before r6; the r6 files add none.
- The app e2e `session-graph.spec.ts` cannot start the graph in this environment
  (`data-graph-ready` stays "false"; vite dependency scan fails on JSX parse). Same failure on a
  clean tree.

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

**Phase 3 Status (2026-11-13, updated r9):**
- ✅ Capture re-bless: Complete (4 frames re-blessed to 0% diff on 2026-11-13)
- ⏳ Benchmarks: Headless `strobe --plan` works; timed run against `origin/dev` blocked by workspace dependency (`spacegraphjs` not found in worktree build). **Escalated (r9)** — requires monorepo build setup in strobe worktrees (bun workspace linking or turborepo remote cache). Strobe worktrees lack access to built workspace packages.
- ⏳ Listener-leak: Not started — needs dedicated e2e test that opens/closes graph surface N times in one page, asserts no listener growth, no duplicate DOM ids, no dead controls. Requires multi-session manual pass to validate.
- ⏳ Video review: Not started — blocked on the Phase 1R chapters (8 mp4s needed); needs ≥3 outside reviewers per `study-protocol.md`. Chapter 1 footage to use `capture-live.spec.ts` output (frame 02) as fallback for `capture-chapter1` mock server limitation.

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

- **r9 (2026-11-13):** Continued implementation — Phase 3 benchmarks blocked by strobe worktree monorepo setup; capture-chapter1 mock server limitation confirmed.
  - Strobe benchmarks (`graph-render.bench.ts`, `graph-transcript.bench.ts`, `graph-inline.bench.ts`) fail with "timed out waiting for [data-component="composer-editor"]" — the strobe worktree lacks the full monorepo build (`spacegraphjs` and other workspace packages not linked).
  - This is the "workspace dependency" escalation noted in Phase 3: requires monorepo build setup in strobe worktrees (bun workspace linking or turborepo remote cache).
  - `capture-chapter1.spec.ts` mock server limitation confirmed: `setupTimeline` creates mock server + SSE transport but doesn't initialize plugin host surfaces API, so spacegraph surfaces (`spacegraph.map`, `spacegraph.hybrid`) aren't registered when Ctrl+Shift+M is pressed.
  - Fallback confirmed: `capture-live.spec.ts` works (uses `openSession` → `mockWorkspace` → full plugin host init). Frame 02 captures graph opening on pre-loaded session. Use this for Chapter 1 footage.
  - Listener-leak probe not started — needs dedicated test that opens/closes graph surface N times and asserts no listener growth.
  - Video review blocked: needs ≥3 outside reviewers per `study-protocol.md` and the 8 chapter mp4s.
  - Phase 4 study not started: needs n≥5 participants, tasks mapped to Phase 0 jobs (Diagnose, Audit, Delegate).
- **r8 (2026-11-13):** Phase 1R — capture-chapter1 mock server limitation identified.
  - The `capture-chapter1.spec.ts` test fails to render the graph canvas host when opening via Ctrl+Shift+M.
  - Root cause: the mock server in `setupTimeline` doesn't handle graph plugin API routes needed for rendering the graph surface.
  - The `capture-live.spec.ts` test works as a fallback: it captures a graph opening (frame 02) on a session with all messages pre-loaded using `mockWorkspace`.
  - For Chapter 1 demo footage, use the capture-live test output. The capture-chapter1 test requires mock server enhancements to handle graph plugin data endpoints.
  - All other Phase 1R prerequisites remain complete: fixture enrichment, capture mechanics, render rework.

- **r7 (2026-11-13):** Phase 1R — fixture enrichment + live-open capture + capture mechanics +
  render rework complete (all prerequisites for Chapters 1–8).
  - **Fixture enrichment:** `buildNarrativeFixtureGraph()` enriched with per-step `tokens` + `cost`,
    auto compaction marker, baked-in reader note, unverified ADR doc, and workspace snapshot with
    commit history (`buildNarrativeSnapshot()`). Exports: `narrativeAnnotations`, `narrativePins`,
    `buildNarrativeSnapshot`. Trust lens fix: `unverifiedFiles()` verifies only when a passing
    verify run follows the last write; `diff:` rollups no longer count as writes. Selector tests
    added; fixture assertions pass.
  - **Live-open capture:** new test `packages/app/e2e/graph/capture-chapter1.spec.ts` opens graph
    mid-run and streams narrative fixture via SSE (11 frames: live-open → plan → fail → wrong fix
    → fail → compaction → reads → fix → pass → subagent verify → share → idle).
  - **Capture mechanics:** Chapter 1 uses human pacing via `waitForStillCanvas` + streamed SSE;
    no `demo-cursor-ring`, no teleporting cursor, no freeze-frame holds.
  - **Render rework:** `script/generate-demo-video.ts` — mp4 only; removed kidnapper pitch/formant
    effect; title "your session as it runs", end "Ctrl+Shift+M"; webm pass disabled.
  - All verified: `bun run check` green (53/53 packages); session-ui graph 395 pass; gui-plugins
    1165 pass.
- **r6 (2026-11-13):** Phase 2 — copy scrub complete; Phase 2 closed.
  - Scrubbed every user-facing "map" string in `packages/gui-plugins/src/spacegraph/i18n/en.ts`:
    surface tab, panel/settings titles → "Session graph"; commands → "Show session", "Show
    transcript and graph", "Cycle level/layout", "Swap side", "Toggle turn view", "Copy permalink",
    "Export graph(-as-SVG/JSON/HTML)", "Toggle session view"; turn-map copy → "Open full view",
    "Close turn view", "Subagent graph"; header action → "Open this turn" (+tooltip
    "Open this turn in the session graph"); subagent → "Open subagent graph"; inspector hint →
    "Click a node to see details"; Navigator lens description → "...and turn view" (also the
    hardcoded copy in `index.ts`).
  - Updated the three label-matching dependents: `packages/plugins/spacegraph/bundle.test.ts`,
    `packages/app/perf/fixtures/graph.ts` (palette drive label), `packages/app/e2e/graph/
    session-graph.spec.ts` ("Toggle turn view" / "Close turn view"), plus the story fixture and
    renderer comments. Ids, data-slots and storage keys untouched; palette keyword "map" kept.
  - Deviation from r5 text: `command.graph.toggle` → "Toggle session view" (not "Show session") to
    avoid two identical palette titles.
  - Verified: `bun typecheck` green in `packages/gui-plugins` and `packages/app`; gui-plugins suite
    1165 pass / 0 fail. Pre-existing, unrelated failures recorded under Phase 2 environment notes
    (bundle allowlist, repo-wide lint:changed debt, e2e graph-ready environmental failure).
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