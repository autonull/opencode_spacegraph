# SpaceGraph — salvage demo brief

**Status:** 2026-11-15. Supersedes the scenario-video program until one flow is understood.
**Purpose:** explain the system and show its use in under 10 seconds, using a real session.

---

## The explanation

SpaceGraph is a second view of an agent session. The transcript tells you what happened in order; the graph keeps the same events but connects them by cause, file, tool, and subagent. To answer one question — why did this test fail? — select the failed result and choose **Why**. SpaceGraph dims unrelated work and follows the chain back to the change that caused the failure, so you can read the cause instead of scrolling the transcript.

---

## The three frames

### Frame 1 — The cost of the transcript

- **Show:** the real session transcript, positioned at the failing test result.
- **Action:** scroll upward through the preceding messages. Do not show the graph yet.
- **Caption:** “I need to know why the build broke.”
- **Duration:** 3 seconds.
- **Point:** the cause is not next to the failure.

### Frame 2 — The graph action

- **Show:** the same session on the graph, with the failed result selected.
- **Action:** click **Why** once. Unrelated nodes dim; the causal path highlights.
- **Caption:** “Select the failure. Ask why.”
- **Duration:** 3 seconds.
- **Point:** one action, one stable framing. No lenses, layout changes, orbit, or zoom showmanship.

### Frame 3 — The readable answer

- **Show:** the failure node, its causal path, and the exact failure text.
- **Required text:** the assertion message and `file:line`, readable at 1440×900 without zooming the video.
- **Caption:** none. Let the evidence speak.
- **Duration:** 4 seconds, still.
- **Point:** the answer is on screen, not implied.

Placeholders to fill from the real session:

```
FAIL  <test name>
<assertion message>
<file>:<line>
```

---

## What a viewer must be able to say afterward

1. “The test failed because …”
2. “The graph showed me the path from the failure to the cause.”
3. “That was easier than finding it in the transcript.”

If a viewer cannot say all three, the demo failed. Do not add more scenarios.

---

## Hard constraints

- Use a **real session**, not the narrative fixture.
- Show the **transcript baseline** in frame 1; the claim is comparative.
- **One** graph action: select the failure, then **Why**.
- No visible feature names, lens names, or the word “map.”
- No voiceover. Captions and cursor only.
- No camera movement during reading.
- Total duration: 10 seconds.
- The answer text must be readable in the extracted frame, not only in the live app.

---

## Stop conditions

- If frame 3 needs the inspector to be readable, and the graph contributes nothing, stop and reconsider the product.
- If the viewer needs the controls explained, the interface is not ready for a demo.
- If the real session cannot produce a clean, non-secret example, do not fall back to the fixture without saying so.
- If the storyboard does not communicate as three static frames, do not record a video.

---

## Next step

Build the three frames as static screenshots or a clickable storyboard first. Review them with one person who has not seen the project. Only then record.
