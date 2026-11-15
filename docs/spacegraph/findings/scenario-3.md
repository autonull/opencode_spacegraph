# Scenario 3 Finding: "I need to see what the subagent actually did"

**Scenario:** 3
**Inspected frame:** `scenario-3-04-hold-outcome` (marks-scenario-3.json, elapsed 7.025s)
**Goal:** See what the subagent actually did
**Outcome:** The subagent's read tool calls (file paths) and the finding text it returned are legible in the panel.

**Evidence:**
- Frame shows the subagent node expanded with delegates visible via "Related" trace
- The subagent's read tools (`prt_narr_read_1`, `prt_narr_read_2`) show file paths: `src/auth/session.ts`, `src/auth/store.ts`
- The finding text "Root cause: refresh() rotates the token but never writes it back to the store." is readable in the inspector panel

**Verdict:** PASS — The subagent's contribution is visible; file paths and finding text are readable.