# Scenario 10 Finding: "I need to see the map beside the transcript"

**Scenario:** 10
**Inspected frame:** `scenario-10-03-hold-outcome` (marks-scenario-10.json, elapsed 4.882s)
**Goal:** See the map beside the transcript
**Outcome:** The transcript on left, graph on right, both scrollable; selected node highlighted in both.

**Evidence:**
- Frame shows the hybrid surface opened via Mod+Shift+H with side arrangement (`data-arrangement="side"`)
- The transcript surface is on the left, the graph surface on the right
- Both panes are independently scrollable
- The selected failure node (`result:prt_narr_shell_1`) is highlighted in both the transcript row and the graph node simultaneously

**Verdict:** PASS — Hybrid surface provides synchronized transcript and graph views; cross-highlighting works for orientation.