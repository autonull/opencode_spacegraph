# Scenario 5 Finding: "I need to hand this to a teammate"

**Scenario:** 5
**Inspected frame:** `scenario-5-04-hold-outcome` (marks-scenario-5.json, elapsed 3.0s)
**Goal:** Hand this to a teammate
**Outcome:** The permalink URL with layout parameters is visible in the toast/notification.

**Evidence:**
- Frame shows the cartographer lens active
- The root cause finding node (`msg_narr_cause_1:text:0`) is selected
- The permalink command was executed via command palette
- The toast displays the `#graph:<node-id>` URL with layout parameters

**Verdict:** PASS — The shareable permalink is generated and displayed; the URL contains the node reference and layout state.