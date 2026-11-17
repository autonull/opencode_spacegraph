# Scenario 7 Finding: "I need to know what this run cost"

**Scenario:** 7
**Inspected frame:** `scenario-7-03-hold-outcome` (marks-scenario-7.json, elapsed 4.0s)
**Goal:** Know what this run cost
**Outcome:** Per-node token counts and USD cost labels on the top 3 nodes are legible; no relayout flash.

**Evidence:**
- Frame shows the cost lens active (`graph_cost_lens` flag on) with lanes layout at execution level
- The highest-cost node (subagent verification `prt_narr_subagent_1`) is selected
- Tooltip shows token counts (input: 12400, output: 420) and USD cost ($0.098)
- Top 3 cost nodes display cost sizing/color without relayout

**Verdict:** PASS — Cost information is surfaced visually and numerically; the most expensive operation is immediately identifiable.