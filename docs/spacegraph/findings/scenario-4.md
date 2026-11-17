# Scenario 4 Finding: "I need to verify the fix before I merge"

**Scenario:** 4
**Inspected frame:** `scenario-4-03-hold-outcome` (marks-scenario-4.json, elapsed 4.0s)
**Goal:** Verify the fix before I merge
**Outcome:** The side-by-side diff shows the wrong fix (red) and correct fix (green) with readable code lines.

**Evidence:**
- Frame shows the reviewer lens active with files rail visible
- The changed file `src/auth/session.ts` is selected in the files rail
- The diff displays the wrong fix (extended token lifetime) in red and the correct fix (stored the rotated refresh token) in green
- Code lines are readable at 1440×900

**Verdict:** PASS — The diff comparison is clear; the correct fix is distinguishable from the wrong fix.