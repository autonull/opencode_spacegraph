# Auto-Generated Narrated Demo Feature-Tour Video Plan

## Goal
Generate a professional demo video from the existing 43-frame capture matrix, with synchronized narration explaining each feature.

## Current Assets
- **43 capture frames** in `docs/spacegraph/screenshots/` (01-log.png through 43-graph-demo-map.png)
- **Capture test suite** in `packages/app/e2e/graph/capture.spec.ts` - generates frames programmatically
- **Test fixtures** - canonical session data via `buildFixtureMessages()`

## Approach Options

### Option A: Post-Processing (Recommended)
1. Run capture tests → generate PNG frames
2. Use `ffmpeg` to stitch frames into video with controlled timing
3. Generate narration via TTS (elevenlabs, OpenAI TTS, or local)
4. Combine video + audio with ffmpeg

### Option B: Real-Time Recording
1. Use Playwright's video recording during test run
2. Add narration track separately
3. Less control over timing/pacing

## Implementation Plan

### Phase 1: Video Generation Pipeline
```bash
# 1. Generate frames (existing)
cd packages/app && GRAPH_CAPTURE_DIR=../../docs/spacegraph/screenshots bun run test:e2e:built -- e2e/graph/capture.spec.ts

# 2. Create frame sequence with hold durations (JSON manifest)
# Frame: { file, hold_seconds, transition_seconds, narration_text }

# 3. Generate narration audio files (one per frame or combined)
# Using: edge-tts, elevenlabs CLI, or openai TTS API

# 4. Stitch with ffmpeg
ffmpeg -f concat -safe 0 -i frames.txt -i narration.wav -c:v libx264 -pix_fmt yuv420p -c:a aac demo.mp4
```

### Phase 2: Narration Script (Draft)

| Frame | Feature | Narration |
|-------|---------|-----------|
| 01 | Log view | "Start in the familiar transcript log..." |
| 02 | Graph Overview | "Open the map with Ctrl+Shift+M. Overview level shows the session structure..." |
| 03 | Execution Level | "Switch to Execution level for turn-by-turn detail..." |
| 04 | Node Selection | "Click any node to inspect — here, a file node shows the full diff..." |
| 05 | Return to Log | "Escape returns to the transcript instantly..." |
| 06 | 3D Orbit | "Enable 3D orbit mode for spatial exploration..." |
| 11 | Timeline Layout | "Timeline layout arranges nodes by time..." |
| 12 | Hierarchy Layout | "Hierarchy layout shows delegation structure..." |
| 13 | Narrow Viewport | "Responsive design works on narrow screens..." |
| 14 | Light Theme | "Full light/dark theme support..." |
| 15 | Ribbon Layout | "Ribbon layout for compact overview..." |
| 16 | Matrix Layout | "Matrix layout shows relationships..." |
| 17 | Changed Files | "Toggle changed files rail to see file modifications..." |
| 18 | Layered 3D | "Layered depth mode stacks turns..." |
| 19 | Depth Stack | "Depth stack with perspective fade..." |
| 20 | Zoom 150% | "Smooth zoom with semantic zoom levels..." |
| 21 | Max Zoom | "Maximum zoom reveals node detail..." |
| 22 | Turn Focus 1 | "Search focuses on a turn node..." |
| 23 | Turn Focus 2 | "Another turn with different context..." |
| 24 | Failure Chain | "Trace failure chains through the graph..." |
| 28 | Tree Layout | "Tree layout for hierarchical data..." |
| 29 | Force Layout | "Force-directed layout for organic structure..." |
| 30 | Gallery | "Compare all layouts side-by-side..." |
| 31 | Perspective | "3D perspective with card-facing..." |
| 34 | Surfaces | "Hybrid surface: map + transcript together..." |
| 36 | Trace Overlay | "Why? button shows causal trace..." |
| 37 | Collapsed Group | "Fold groups to reduce noise..." |
| 38 | Hybrid View | "Side-by-side arrangement..." |
| 39 | NLQ Search | "Natural language: 'failed tools' → facet query..." |
| 40 | NLQ Code Errors | "'failed' compiles to status:failed..." |
| 41 | Trust Lens | "Unverified banner flags untested tool outputs..." |
| 42 | Permalink Copy | "Copy deep links to share specific nodes..." |
| 43 | Demo Map | "First-run demo map explains the graph..." |

### Phase 3: Automation Script
Create `script/generate-demo-video.ts`:
- Reads frame manifest (JSON)
- Generates TTS audio for each narration segment
- Builds ffmpeg concat file with precise timing
- Outputs `demo.mp4` and `demo.webm`

### Phase 4: CI Integration
- Add to `.github/workflows/graph.yml` as optional artifact
- Trigger on tag push or manual dispatch
- Upload video as release asset

## Technical Details

### Frame Timing Manifest (`docs/spacegraph/demo-manifest.json`)
```json
[
  { "frame": 1, "file": "01-log.png", "hold": 3, "transition": 1, "narration": "..." },
  { "frame": 2, "file": "02-graph-overview.png", "hold": 4, "transition": 1, "narration": "..." },
  ...
]
```

### TTS Options
1. **elevenlabs** - High quality, CLI available, needs API key
2. **edge-tts** - Free, Microsoft voices, Python CLI
3. **OpenAI TTS** - High quality, API key needed
4. **Local (piper/coqui)** - Free, offline, lower quality

### Video Specs
- Resolution: 1440x900 (matches capture viewport)
- Frame rate: 30 fps
- Codec: H.264 (MP4) + VP9 (WebM)
- Bitrate: ~5 Mbps
- Duration: ~3-4 minutes

## Dependencies
- `ffmpeg` (system)
- TTS provider (API key or local install)
- Node.js for orchestration script

## Timeline
- Phase 1-2: 1 day (manifest + narration script)
- Phase 3: 0.5 day (automation script)
- Phase 4: 0.25 day (CI integration)
- **Total: ~1.75 days**

## Related: Fix F2-F9 First
The capture tests must pass reliably (43/43 frames) before video generation is stable. Priority:
1. Fix F2-F9 (see SPACEGRAPH.TODO.31.md Phase 9)
2. Verify `graph:capture --mode=verify` passes 43/43
3. Then implement video generation