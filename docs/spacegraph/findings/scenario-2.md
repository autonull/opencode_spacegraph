# Scenario 2 Finding: "I need to find the call that caused the failure"

**Scenario:** 2
**Inspected frame:** `scenario-2-04-hold-outcome` (marks-scenario-2.json, elapsed 6.387s)
**Goal:** Find the call that caused the failure
**Outcome:** The caller node (the shell command that ran the failing test) is visible with its command input text legible.

**Evidence:**
- Frame shows the "Led here" trace active, following the edge back from the failure to its caller
- The caller node label displays the exact command: `bun test src/auth/session.test.ts`
- Command input text is readable at 1440×900

**Verdict:** PASS — The graph surfaces the causal call; the failing command is readable in the inspector.