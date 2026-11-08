# Auto-Generated Narrated Demo Feature-Tour Video Plan

## Goal
Generate an engaging demo video from the live capture run, with synchronized narration explaining each feature.
Video must hook viewers immediately with flashy action, showcase SpaceGraphJS features, and use stylized narration.

## Current Assets
- **42 capture frames** in `docs/spacegraph/screenshots/` (01-log.png through 43-graph-demo.png, frame 30 gallery removed)
- **Capture test suite** in `packages/app/e2e/graph/capture.spec.ts` - generates frames programmatically AND records video
- **Test fixtures** - canonical session data via `buildFixtureMessages()`

## Approach (Updated 2026-11-08)

### Live Recording + Post-Processed Narration + Effects (Recommended)
1. Run capture tests with Playwright video recording enabled → generates MP4 + PNG frames
2. Use capture manifest for frame-accurate narration timing
3. Generate narration via TTS (edge-tts, elevenlabs, or OpenAI TTS)
4. **Apply "kidnapper" voice effect** (pitch shift + formant shift) for entertainment value
5. **Prepend flashy hook sequence** (3-5s): rapid cuts of 3D orbit, force layout explosion, zoom-to-node
6. Combine video + audio with ffmpeg, using frame timestamps for sync

### Why Not Screenshot-Based Video?
- Narration timing was out of sync with static frame durations
- Live recording captures actual interactions, transitions, and animations
- Playwright video is already produced during capture runs
- Frame manifest provides exact timing for TTS alignment

## Implementation Plan

### Phase 1: Live Recording Setup + Hook Sequence
```bash
# 1. Run capture with video recording (already configured in capture.spec.ts)
cd packages/app && GRAPH_CAPTURE_DIR=../../docs/spacegraph/screenshots bun run test:e2e:built -- e2e/graph/capture.spec.ts

# 2. Playwright produces: test-results/graph-capture-*/video.webm
#    Copy to docs/spacegraph/video/capture.webm

# 3. Generate hook clip from most impressive moments (auto-zoom, 3D orbit, force layout)
#    Script extracts 3-5s highlight reel from capture video
```

### Phase 2: Enhanced Narration Script - 42 Frames + Hook (Gallery Removed)

**Hook (0:00-0:05)** - No narration, just visuals + sound design
- Rapid cuts: 3D orbit spin → force layout nodes exploding outward → auto-zoom to failing node → "Why?" trace overlay appears
- Sound: whoosh transitions, subtle glitch on trace reveal

| Frame | Feature | Narration |
|-------|---------|-----------|
| 01 | Log view | "Start in the familiar transcript log, where every turn, tool call, and result appears in chronological order." |
| 02 | Graph Overview | "Open the map with Ctrl+Shift+M. The Overview level shows your entire session structure at a glance: phases, delegations, and compactions." |
| 03 | Execution Level | "Switch to Execution level for turn-by-turn detail. Each node represents a message, tool, or result, connected by causal edges." |
| 04 | Node Selection | "Click any node to inspect it. Here, a file node reveals the full diff with syntax highlighting." |
| 05 | Return to Log | "Press Escape to return to the transcript instantly. The map and log are always one keystroke apart." |
| 06 | 3D Orbit | "Enable 3D orbit mode for spatial exploration. Drag to rotate, scroll to zoom, and see your session from any angle." |
| 11 | Timeline Layout | "Timeline layout arranges nodes by time, showing the session's temporal flow from start to finish." |
| 12 | Hierarchy Layout | "Hierarchy layout reveals the delegation structure: parent sessions, subagents, and their relationships." |
| 13 | Narrow Viewport | "Responsive design works on narrow screens. The toolbar collapses, and the inspector becomes a bottom sheet." |
| 14 | Light Theme | "Full light and dark theme support, with semantic colors that adapt to your preference." |
| 15 | Ribbon Layout | "Ribbon layout provides a compact overview, stacking turns horizontally for quick scanning." |
| 16 | Matrix Layout | "Matrix layout shows relationships between nodes as a grid, ideal for spotting patterns in tool usage." |
| 17 | Changed Files | "Toggle the changed files rail to see every file modification in the session, with diffs a click away." |
| 18 | Layered 3D | "Layered 3D mode stacks turns by depth, creating a visual timeline you can fly through." |
| 19 | Depth Stack | "Depth stack adds perspective fade: cards face the camera for readability at any angle." |
| 20 | Zoom 150% | "Smooth zoom with semantic zoom levels. At 150 percent, node labels remain crisp and readable." |
| 21 | Max Zoom / **Auto-Zoom** | "Maximum zoom reveals full node detail. **Auto-zoom frames any selection instantly — no manual adjustment needed.**" |
| 22 | Turn Focus 1 | "Search focuses on a turn node. Type to filter, or use natural language like 'failed tools'." |
| 23 | Turn Focus 2 | "Another turn with different context: search results highlight in place without layout movement." |
| 24 | Failure Chain | "Trace failure chains through the graph. Red edges show error propagation from tool to result to compaction." |
| 28 | Tree Layout | "Tree layout organizes nodes hierarchically, perfect for delegation-heavy sessions." |
| 29 | Force Layout | "Force-directed layout creates organic structure. Nodes repel, edges attract, revealing clusters naturally." |
| 31 | Perspective | "3D perspective with card-facing keeps text readable even at extreme angles." |
| 34 | Surfaces | "Hybrid surface shows the map and transcript together: split view for context and detail simultaneously." |
| 36 | Trace Overlay | "Click 'Why?' on any node to see its causal trace: why this tool ran, what it produced, what followed." |
| 37 | Collapsed Group | "Fold groups to reduce noise. Collapsed groups show a badge with node count; token bursts animate the badge." |
| 38 | Hybrid View | "Side-by-side arrangement in hybrid view: transcript on the left, map on the right, linked by selection." |
| 39 | NLQ Search | "Natural language query: type 'failed tools' and it compiles to 'kind:tool status:failed' automatically." |
| 40 | NLQ Code Errors | "Type 'failed' alone and it compiles to 'status:failed' across all kinds: errors, tools, messages." |
| 41 | Trust Lens | "Enable the trust lens with '?lens=unverified': a banner flags tool outputs that were never verified by tests." |
| 42 | Permalink Copy | "Copy deep links to share specific nodes. The permalink opens the map at that exact node and layout." |
| 43 | Demo Map | "First run shows a demo map labeled 'your session will appear as it runs': no empty state confusion." |

**Note:** Frame 30 (Layout Gallery) removed — gallery is broken and not worth fixing. Users cycle layouts with `mod+shift+l`.

### Phase 3: Automation Script (Enhanced)
Create `script/generate-demo-video.ts`:
- Reads live capture video from `docs/spacegraph/video/capture.webm`
- **Extracts hook clip** (3-5s highlight reel from most dynamic moments)
- Reads frame manifest (`docs/spacegraph/demo-manifest.json`) for timing
- Generates TTS audio for each narration segment aligned to frame timestamps
- **Applies "kidnapper" voice effect**: pitch shift (-2 to -4 semitones) + formant shift (+10-15%) via ffmpeg `asetrate` + `rubberband` or `sox`
- Combines: hook clip + narrated capture video + stylized audio
- Outputs `docs/spacegraph/video/demo.mp4` and `demo.webm`

### Phase 4: CI Integration
- Add to `.github/workflows/graph.yml` as optional artifact
- Trigger on tag push or manual dispatch
- Upload video as release asset

## Technical Details

### Frame Timing Manifest (`docs/spacegraph/demo-manifest.json`)
```json
[
  { "frame": 1, "file": "01-log.png", "hold": 3.5, "transition": 1.0, "narration": "..." },
  { "frame": 2, "file": "02-graph-overview.png", "hold": 4.0, "transition": 1.0, "narration": "..." },
  ...
]
```

### Voice Effect: "Kidnapper" Style (ffmpeg)
```bash
# Pitch shift down 3 semitones + formant shift up 12% (via rubberband)
ffmpeg -i narration.wav -af "asetrate=48000*0.89,aresample=48000, rubberband=pitch=-3:formant=1.12" narration-styled.wav

# Alternative with sox (if available):
sox narration.wav narration-styled.wav pitch -300 formant 1.12
```

### TTS Options
1. **elevenlabs** - High quality, CLI available, needs API key, supports voice design
2. **edge-tts** - Free, Microsoft voices, Python CLI
3. **OpenAI TTS** - High quality, API key needed
4. **Local (piper/coqui)** - Free, offline, lower quality

### Video Specs
- Resolution: 1440x900 (matches capture viewport)
- Frame rate: 30 fps
- Codec: H.264 (MP4) + VP9 (WebM)
- Bitrate: ~5 Mbps
- Duration: ~4:30 minutes (including 5s hook)

### Output Location
- **Input video:** `docs/spacegraph/video/capture.webm` (from Playwright)
- **Hook clip:** `docs/spacegraph/video/hook.webm` (auto-extracted)
- **Output videos:** `docs/spacegraph/video/demo.mp4`, `demo.webm`

## Dependencies
- `ffmpeg` (system) - with `librubberband` for pitch/formant shifting
- `sox` (optional, alternative for voice effects)
- TTS provider (API key or local install)
- Node.js for orchestration script

## Timeline
- Phase 1-2: 0.5 day (manifest + narration script + hook design)
- Phase 3: 0.75 day (automation script with voice effects + hook extraction)
- Phase 4: 0.25 day (CI integration)
- **Total: ~1.5 days**

## Related: Fix F2-F9 First
The capture tests must pass reliably (42/42 frames) before video generation is stable. Priority:
1. Fix F2-F9 (see SPACEGRAPH.TODO.32.md Phase 9)
2. Verify `graph:capture --mode=verify` passes 42/42
3. Then implement live recording video generation