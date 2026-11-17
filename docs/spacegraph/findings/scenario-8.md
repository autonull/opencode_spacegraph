# Scenario 8 Finding: "I need to read a turn without leaving the transcript"

**Scenario:** 8
**Inspected frame:** `scenario-8-03-hold-outcome` (marks-scenario-8.json, elapsed 6.206s)
**Goal:** Read a turn without leaving the transcript
**Outcome:** The turn's graph structure in the inline preview (static SVG) and after expand (interactive nodes) is legible.

**Evidence:**
- Frame shows the transcript-graph surface with reader lens active
- Hover over a turn row expands the inline preview to show the static SVG of the turn's graph structure
- Clicking the expand button (`.graph-affordance-toggle`) opens the interactive turn map with node labels readable
- The inline preview and expanded turn map both display node labels at readable size

**Verdict:** PASS — The transcript surface with inline preview allows reading turn structure without context switching; expansion provides interactive detail.