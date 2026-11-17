# Scenario 6 Finding: "I need to audit a long session fast"

**Scenario:** 6
**Inspected frame:** `scenario-6-02-hold-outcome` (marks-scenario-6.json, elapsed 5.0s)
**Goal:** Audit a long session fast
**Outcome:** The matrix layout shows the whole session as one object; the compaction "N drops" badge is legible.

**Evidence:**
- Frame shows the auditor lens active with matrix layout (`graph_layout_breadth` flag on) at overview level
- The matrix displays turns as rows and phase categories as columns
- The compaction group shows a "N drops" badge indicating how many items were dropped during compaction
- The badge text is readable at 1440×900

**Verdict:** PASS — The matrix provides a single-view summary of the entire session; compaction indicator is visible.