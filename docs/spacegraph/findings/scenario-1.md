# Scenario 1 Finding: "I need to know why the build broke"

**Scenario:** 1
**Inspected frame:** `scenario-1-04-hold-outcome` (marks-scenario-1.json, elapsed 6.434s)
**Goal:** Know why the build broke
**Outcome:** The failed `bun test` error is legible — the assertion message "FAIL expected refresh token to be stored" and file:line reference are readable at 1440×900.

**Evidence:**
- Frame shows the causal chain ending in the failed `bun test` result node
- The "Why" trace (trace=why) highlights the path from the failure back to its cause
- Error text fills the lower third of the viewport as specified

**Verdict:** PASS — The graph answers the question; the error is readable without leaving the graph.