# Friction Log — Phase 1 Demo Recording

Generated during capture-story.spec.ts execution and demo video generation.

## Recording Friction

| # | Step | Issue | Severity | Phase 2 Action |
|---|------|-------|----------|----------------|
| 1 | Sync beacon detection | First-frame marker (red pixel at 0,0) not detected in video; fell back to luma beacon detection | Medium | Fix first-frame marker visibility in capture-story.spec.ts |
| 2 | Cursor ring | Cursor ring added via page.evaluate but not visible in screenshots (screenshots capture DOM state, not CSS animations) | Low | Consider adding cursor position indicator to screenshots |
| 3 | Click ripple | Click ripple animation not captured in screenshots | Low | Not critical for stills; video shows interactions |
| 4 | Scene markers | Marks.json written but frame numbers don't match manifest frame numbers (story-XX vs numeric) | Medium | Fixed in generate-demo-video.ts with regex update |

## TTS Generation Friction

| # | Step | Issue | Severity | Phase 2 Action |
|---|------|-------|----------|----------------|
| 5 | edge_tts empty output | edge_tts returns exit code 0 but produces 0-byte mp3 files intermittently | High | Added file size check + retry with backoff in generate-demo-video.ts |
| 6 | edge_tts rate limiting | Rapid successive requests cause "No audio received" errors | High | Added 500ms delay between requests in generate-demo-video.ts |
| 7 | Hash collision | base64url encoding produced identical hashKeys for different narrations | High | Fixed by including frame number in hash input and using standard base64 |

## Video Generation Friction

| # | Step | Issue | Severity | Phase 2 Action |
|---|------|-------|----------|----------------|
| 8 | First-frame marker | Red pixel marker not visible in recorded video (may be cropped or not rendered) | Medium | Increase marker size or use different detection method |
| 9 | Video duration | Demo video is ~50s body + hook/cards = ~60s, target is 90s | Low | Adjust hold/transition times in demo-manifest.json |

## UI/UX Friction (from test execution)

| # | Step | Issue | Severity | Phase 2 Action |
|---|------|-------|----------|----------------|
| 10 | Search dialog | Opening search with "/" shortcut sometimes has race condition with canvas focus | Low | Ensure canvas is focused before pressing "/" |
| 11 | Layout switch | pickLayout() requires menu open/close cycle; could be faster with direct keyboard shortcut | Medium | Consider adding keyboard shortcuts for layout switching |
| 12 | Fit button | Fit button sometimes requires opening overflow menu first | Low | UI improvement: make Fit always visible or add keyboard shortcut |

## Summary

**High priority fixes for Phase 2:**
1. Fix first-frame marker detection in capture tests
2. Make edge_tts generation more robust (done in script)
3. Add keyboard shortcuts for common actions (layout switch, fit, search)

**Medium priority:**
4. Improve sync beacon visibility
5. Add cursor/click indicators to video recording

**Low priority:**
6. Adjust demo timing to hit 90s target
7. UI polish for search and layout controls
