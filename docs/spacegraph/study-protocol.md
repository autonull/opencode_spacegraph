# SpaceGraph Study Protocol (M7)

**Status:** Pre-authored; **Gate:** Video review (Phase 13) must pass before recruiting.

---

## 1. Consent

Participants receive a one-page consent form before the first task. It covers:

- **Purpose:** Compare the transcript view vs the graph view on five investigative tasks.
- **Procedure:** Two sessions (transcript-first, graph-first), counterbalanced, ~20 minutes each.
- **Data collected:** Task success (binary), completion time (ms), wrong turns (count), interaction log
  (surface opens, lens switches, inline expands, why clicks), subjective preference (1–7 Likert), free-text quotes.
- **Voluntary:** May withdraw at any time; data deleted on request.
- **No risk:** No personal data; session is a fixed fixture with no network access.
- **Contact:** [study contact email]

**Signature line:** Participant initials and date.

---

## 2. Task Scripts

Each task is read verbatim to the participant. The fixture is the canonical narrative session
(`buildNarrativeFixtureGraph()`), which contains one turn: failing test → wrong fix → root cause →
correct fix → subagent verification → share.

| Task ID | Question (read to participant) | Expected Answer (from fixture) |
|---------|--------------------------------|--------------------------------|
| `why-session` | "Why did the agent change `src/auth/session.ts`?" | The suite failed with `FAIL auth refresh token` after the session edit; the retry error names the expected stored refresh token, so the token handling changed to store it. |
| `led-to-failure` | "Which tool calls led to the failing test?" | The verify phase ran `bun test src/auth/session.test.ts` (pass) and then `bun test` (fail), after the earlier read, subagent, edit, write, and patch tools. |
| `subagent` | "What did the subagent contribute?" | The explore subagent (`ses_child_auth`) reported that session tokens refresh through the store. |
| `after-failure` | "Which changes were made after the failing test?" | An edit to `src/auth/session.test.ts` fixed the refresh path, the suite then passed 3/3, and a second turn added refresh coverage (4/4). |
| `direction-change` | "Where did the agent retry or change direction?" | Retry #2 followed the `Expected refresh token to be stored` error, then the corrective edit switched from the session change to the test's refresh path. |

**Script for each task:**

> "Here is the [transcript / graph] view of a session where an agent fixed a failing authentication test. Please answer: [question]. Take as much time as you need. Tell me when you have your answer."

The facilitator starts a timer on "Please answer" and stops it when the participant says they have their answer. The facilitator also counts wrong turns (navigating to an unrelated node/message, opening a wrong surface, applying a wrong lens).

---

## 3. Counterbalancing

- **Design:** Within-subjects, two conditions (transcript, graph), five tasks each.
- **Order:** Latin square across participants. With 6 participants:
  - P1: transcript → graph
  - P2: graph → transcript
  - P3: transcript → graph
  - P4: graph → transcript
  - P5: transcript → graph
  - P6: graph → transcript
- **Cohort:** Each participant is assigned one cohort at random:
  - **reader-first:** starts on transcript surface with `reader` lens
  - **map-first:** starts on map surface with `cartographer` lens
  - **hybrid-first:** starts on hybrid surface with `navigator` lens
  - The cohort determines the *initial* surface/lens in each condition; participants may switch freely.

**Assignment:** Pre-generated random sequence stored in `study-protocol/assignment.csv` (not committed).

---

## 4. Analysis Plan

**Primary outcome:** Task success rate (binary per task).

**Secondary outcomes:**
- Completion time (ms, log-transformed)
- Wrong turns (count)
- Interaction rates: surface opens/min, lens switches/min, inline expand rate, why clicks/task
- Preference (1–7 Likert: "How much did this view help you answer the questions?")

**Statistical tests:**
- Success: McNemar's test (paired binary)
- Time, wrong turns, interactions: Wilcoxon signed-rank (paired, non-parametric)
- Preference: Wilcoxon signed-rank

**Effect size threshold for "win":** Cohen's d ≥ 0.5 on time *and* success rate difference ≥ 20
percentage points in favor of graph. Both must meet the threshold.

**Exploratory:** Qualitative coding of free-text quotes for themes (spatial reasoning, traceability,
cognitive load).

**Pre-registration:** This protocol document is the pre-registration. No analysis decisions after data
collection.

---

## 5. Stop Rule

- **Minimum n:** 5 participants (gives 80% power to detect d=0.8 at α=0.05 paired).
- **Maximum n:** 12 (practical ceiling for this phase).
- **Early stop for efficacy:** If after n=5 the primary outcome meets the effect-size threshold with
  p < 0.05 (one-sided), stop and declare win.
- **Early stop for futility:** If after n=8 the 95% CI for the success-rate difference excludes the
  20-point threshold, stop and declare loss.
- **Mandatory stop:** At n=12 regardless.

---

## 6. Outcome Disposition (Pre-Authored)

| Outcome | Action |
|---------|--------|
| **Win** (both thresholds met) | Draft RFC: "Hybrid-as-Entry" — make the hybrid surface the default entry point for sessions with graph enabled. Archive the transcript-only path. |
| **Loss** (either threshold missed) | Publish negative result: "Graph view did not beat transcript on investigative tasks (n=X). The library and host-integration guide remain the deliverable; the graph stays behind the transcript as an opt-in surface." Update `SPACEGRAPH.md` §16 with the finding. |

---

## 7. Artifacts to Produce

- `study-protocol/assignment.csv` — counterbalancing sequence (generated, not committed)
- `study-protocol/raw.csv` — one row per task per participant per condition
- `study-protocol/analysis.ipynb` — reproducible analysis (or equivalent script)
- `study-protocol/disposition.md` — win/loss declaration with numbers

---

## 8. Video Gate Dependency

**This study does not start until:**

1. The demo video (Phase 13) passes its review gate (≥3 outsiders, notes recorded).
2. The canonical fixture is documented with expected answers (done: `STUDY_TASKS` in `study.ts`).
3. The study protocol is committed (this file).

---

## 9. Local Counters Integration (Dev Only)

During development, the `StudyCounters` type in `packages/session-ui/src/graph/study.ts` records the
same interaction metrics locally (surface opens, lens switches, inline expands, why clicks, timed
answers). These counters:

- Are opt-in via a dev-only preference (not in released builds)
- Never leave the machine
- Are cleared when the session store is cleared
- Provide the same variables the study measures, for internal dogfooding

**Do not** confuse these dev counters with the human study data. They are unrelated pipelines.

---

## 10. Appendix: Fixture Reference

The canonical narrative fixture is exported as:

```typescript
import { buildNarrativeFixtureGraph, narrativeFixtureMessages } from "@opencode/session-ui/graph"
```

It contains exactly one turn (`turn:msg_user_narr_1`) with 15 nodes spanning the full arc. The
five expected answers are derived from this model and locked in `STUDY_TASKS`.