# Session Notes - Camera Input Investigation

## Failing Tests
- `pans the view with the right mouse button` - right-drag doesn't move camera (card position unchanged)
- `zooms the view with the mouse wheel` - wheel doesn't change zoom level (stays at "100%")
- `the card budget follows the camera (T17.5)` - depends on working pan/zoom

## Root Cause Analysis

### SpaceGraphJS Input Pipeline
1. **WebGLRenderer** (spacegraphjs/src/core/WebGLRenderer.ts:97) sets `pointerEvents: 'auto'` on canvas ✓
2. **InputManager** registers canvas source with CAMERA_EVENTS including `mousedown`, `mousemove`, `mouseup` ✓
3. **CameraFingering** (spacegraphjs/src/input/fingerings/CameraFingerings.ts:20-23) handles:
   - Right button (2) → pan
   - Middle button (4) → orbit
   - `claimsGesture = false` (allows other handlers to also run)

### SpaceGraphRenderer Adapter Issue
In `@spacegraphjs/spacegraph-renderer/src/index.ts:62-73`:
```typescript
const sg = await SpaceGraph.create(container, { nodes: [], edges: [] }, {
  chrome: false,
  doubleClickFocus: false,
  render: { ... },
  theme: spaceGraphTheme(options.theme),
  cameraControls: { enableRotate: !ortho },  // ONLY enableRotate passed!
})
```

**Missing**: `enablePan: true`, `enableZoom: true` - CameraControls defaults have these but they may not be applied when only partial config is passed.

### CSS Layer Blocking
CSS3D and CSS2D layers use `CSS_STYLES = { pointerEvents: 'none' }` (WebGLRenderer.ts:22) - this is correct, they should pass through.

## Next Steps
1. Fix SpaceGraphRenderer to pass full cameraControls config: `{ enableRotate: !ortho, enablePan: true, enableZoom: true }`
2. Verify CameraControls constructor applies defaults when partial config provided
3. Check if `pointerEvents: 'auto'` on canvas is being overridden by any overlay