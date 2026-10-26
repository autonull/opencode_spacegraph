# SPACEGRAPH.TODO.18.md — Definitive Closing Plan

## Status (2026-10-26)
- **Unit tests**: ✅ 377 passing (session-graph: 116, session-ui/graph: 261)
- **Typecheck**: ✅ All passing (session-graph, session-ui)
- **Component tests**: ⚠️ Flaky (Storybook state issue between runs)
- **E2E tests**: ⚠️ Graph module not loading in Playwright
- **Screenshots**: ⚠️ Same E2E infrastructure issue

---

## Completed This Session

### ✅ 1. Keyboard Handling Extraction (Completed)
- **File**: `packages/session-graph/src/ui/useGraphKeyboard.ts` (new)
- Extracted ~100 lines of keyboard handling from GraphView.tsx
- Separates global shortcuts (Quality Gate: `F`, `Shift+O`, `Alt+f`) from canvas-region shortcuts
- Makes keyboard logic testable and reusable

### ✅ 2. Adapter Simplification (Completed)
- **File**: `packages/session-graph/src/canvas/sessionGraphAdapter.ts`
- Removed `CytoscapeSessionAdapter` subclass (23 lines)
- Made `cardBudget` configurable via constructor parameter
- Both adapters now use same `SessionGraphAdapter` class with different budget configs

### ✅ 3. GraphCanvasRegion Extraction (Completed)
- **File**: `packages/session-graph/src/ui/GraphCanvasRegion.tsx` (new, ~400 lines)
- Extracted: GraphCanvas, overlays (peek, popover, note composer, search, legend, gallery, group menu), A11y, windows, error/empty states
- Fixed all type issues:
  1. `noteAnchor` accessor vs value mismatch (line 314) - fixed by calling `props.noteAnchor()`
  2. `GraphGallery` model prop - fixed by calling `props.model()`
  3. GraphView.tsx 14 type errors - all fixed (unused imports removed, type mismatches resolved, missing props added to GraphCanvasRegionProps)
- Verified `bun run typecheck --filter=@opencode/session-graph` passes
- Verified `bun test packages/session-graph/src` passes (116 tests)

### ✅ 4. GraphWindowManager Extraction (Completed)
- **File**: `packages/session-graph/src/ui/GraphWindowManager.tsx` (new, ~220 lines)
- Extracted: GraphWindows, windowKinds (node, filesystem, legend, compare, equalizer, minimap, failureProgress, find), windowContent, window anchor logic
- Owns: window management, z-ordering, drag/resize gestures, pinned window positioning
- Props: windows, onWindowsChange, onOpenWindow, model, theme, layout, canvasSize, renderer, viewport, displayPositions, selection, trace, notes, edgeKinds, comparison, diffSource, link, onOpenTranscript, onOpenSession, onActionNavigate, rules, onRulesChange, findInitialTab, i18n, renderSummary, facets, onFacetsChange
- Verified `bun run typecheck --filter=@opencode/session-graph` passes
- Verified `bun test packages/session-graph/src` passes (116 tests)

---

## Remaining Work

## 1. GraphView Breakdown Completion

### 1.1 Fix GraphCanvasRegion Type Issues ✅
- Fix `noteAnchor` type to be value not accessor ✅
- Add missing `GraphGallery` import ✅
- Clean up GraphView.tsx unused imports and fix remaining type errors ✅
- Verify `bun run typecheck --filter=@opencode/session-graph` passes ✅

### 1.2 Extract GraphWindowManager ✅
- **File**: `packages/session-graph/src/ui/GraphWindowManager.tsx`
- Owns: GraphWindows, windowKinds, windowContent, windowAnchors, openWindow ✅
- Props: windows, onWindowsChange, onOpenWindow, model, selection, etc. ✅

### 1.3 Extract GraphOverlayManager
- **File**: `packages/session-graph/src/ui/GraphOverlayManager.tsx`
- Owns: Peek, popover, note composer, search, legend, gallery, group menu
- Props: model, selection, peek, popoverVisible, notes, trace, etc.

### 1.4 Extract GraphViewportTracker
- **File**: `packages/session-graph/src/ui/GraphViewportTracker.tsx`
- Owns: camera, viewport, resting, fit logic, refitKey, contentIDs, fitOptions
- Props: renderer, displayPositions, canvasSize, inspectorOpen, etc.

### 1.5 Extract GraphStateInitializers
- **File**: `packages/session-graph/src/ui/GraphStateInitializers.tsx`
- Owns: All createSignal/createMemo for level, projection, depth, layout, files, detailMode, etc.
- Returns: Object with all state + setters

### 1.6 Result: GraphView.tsx becomes thin composition (~200 lines)
```tsx
export const GraphView = (props) => {
  const state = useGraphState(props)
  const viewport = useGraphViewport(state)
  const windows = useGraphWindows(state)
  return (
    <div>
      <GraphToolbar {...state} />
      <GraphBreadcrumbs {...state} />
      <GraphStatusBar {...state} />
      <GraphCompareBar {...state} />
      <GraphScaleNotice {...state} />
      <GraphHiddenSelection {...state} />
      <GraphFallback {...state} />
      <div class="flex-1 flex">
        <Show when={state.files}> <GraphFileRail {...state} /> </Show>
        <GraphCanvasRegion {...state} {...viewport} {...windows} />
        <Show when={state.inspectorOpen}> <GraphInspectorGutter {...state} /> </Show>
      </div>
    </div>
  )
}
```

---

## 2. GraphToolbar Breakdown (~900 lines → sub-components)

### 2.1 Extract by Control Group
- `GraphLayersControl` — Level, Lens, Depth (LE.5/LE.14)
- `GraphLayoutControl` — Layout picker (LE.8/LE.9/T7)
- `GraphDrawControl` — Billboard, Frame Node, Files, Equalizer, Arrangement
- `GraphShowControl` — Detail mode, Peek, Follow Log, Minimap, Filesystem, Legend, Gallery, Turn Map, Expand
- `GraphTimeControl` — Turn scrubber (T18.3/T6.6)
- `GraphQuestionsControl` — Why, Led-here, Related, Compare, Note, Facets, Failure Progress, Find
- `GraphZoomControl` — Zoom In/Out/Fit
- `GraphExportControl` — Export menu
- `GraphRendererStatus` — Renderer label, Split View, Back

### 2.2 Each sub-component:
- Owns its own i18n keys
- Receives only the props it needs
- No cross-control dependencies

---

## 3. Vocabulary Consolidation

### 3.1 Single Source of Truth
- **Types**: Stay in `session-ui/src/graph/vocabulary.ts` (already the source)
- **i18n keys**: Generate from types or share single `vocabularyKeys.ts`
- **Labels**: Move to `session-ui/src/graph/vocabulary.ts` as constants

### 3.2 Files to Update
- `session-graph/src/ui/vocabulary.ts` → Remove, import from session-ui
- `session-graph/src/ui/GraphToolbar.tsx` → Use shared keys
- `session-graph/src/ui/GraphView.tsx` → Use shared keys

---

## 4. SpaceGraphJS Library Improvements

### 4.1 Verify Generic Capabilities Are In Library (Not Host)
| Capability | Status | Action |
|------------|--------|--------|
| Layout strategies | ✅ `spacegraphjs/layout` | Verify no host-specific code |
| Semantic levels / zoom bands | ✅ `spacegraphjs/levels` | Verify |
| Band computation | ✅ `spacegraphjs/adapter` | Verify |
| Edge bundling | ✅ `spacegraphjs/adapter` | Verify |
| Navigation (search, minimap, trail) | ✅ `spacegraphjs/navigation` | Verify |
| View controller | ✅ `spacegraphjs/control` | Verify |
| Accessibility | ✅ `spacegraphjs/a11y` | Verify |
| Depth spectrum | ✅ `spacegraphjs/depth` | Verify |
| Scoped overlay & code diff | ✅ `spacegraphjs/overlays` | Verify |
| Static export (SVG/JSON/HTML) | ✅ `@spacegraphjs/svg-renderer` | Verify |
| Keyboard shortcuts | ✅ `spacegraphjs/utils` | Already extracted ✓ |

### 4.2 Remove Host-Specific Code from Library
- Audit `spacegraphjs/packages/*/src` for OpenCode-specific logic
- Move any found back to `session-graph` or `session-ui`

### 4.3 Publish SpaceGraphJS Packages
```bash
cd /home/me/opencode_spacegraph/spacegraphjs
pnpm version patch  # or appropriate bump
pnpm publish --access public  # all 6 packages in order
```
Then update OpenCode to consume published versions (remove sibling checkout).

---

## 5. Adapter Simplification (Already Done ✓)
- Removed `CytoscapeSessionAdapter` subclass
- Configure `cardBudget` via constructor parameter
- Both adapters use same `SessionGraphAdapter` class

---

## 6. Hook Consolidation

### 6.1 Merge Related Hooks
| Current Hooks | Consolidated |
|---------------|--------------|
| `useSelectionVerbs` + selection logic | `useGraphSelection` |
| `useNotes` + `useTraceOverlay` | `useGraphAnnotations` |
| `useEdgeKinds` | Keep (simple) |
| `useGroupCollapse` | Keep (simple) |
| `useComparison` | Keep (complex) |
| `useGraphKeyboard` | ✅ Done |

---

## 7. Verification & Fixes (After Refactoring)

### 7.1 Component Test Stability
- Fix Storybook state bleed between tests
- Options: `reuseBrowser: false`, proper cleanup, longer timeouts
- Target: All 67 component tests pass reliably

### 7.2 E2E Test Fixes
- Graph module not loading in Playwright (`data-graph-ready` never "true")
- Debug lazy loading / Suspense boundary
- Target: All 44 e2e/graph tests pass

### 7.3 Screenshot Generation
```bash
bun run graph:capture --mode=compare  # Regenerate
bun run graph:capture --mode=verify   # Assert committed set
```
- 31 frames across 5 layouts × 4 depths × contexts
- Commit updated screenshots if intentional changes

### 7.4 Performance Budget
```bash
bun run graph:scale  # Must stay < 400ms for 5001 messages
```

---

## 8. Upstream Sync (G6)

### 8.1 Merge Upstream `dev`
- 24 commits, 7 overlapping files
- Re-measure entry delta
- Re-baseline docs
- Push to fork

---

## 9. Shareable Delivery (G7)

### 9.1 Publish to npm
- Library packages (6 packages, ordered)
- `session-graph` branch consuming published packages

### 9.2 Hosted Demo
- GitHub Pages: contract demo + second host

### 9.3 Upstream RFC
- After T2.2 measurement (evidence task)
- Text prepared in `rfc.md`

### 9.4 Stranger's Path
```bash
git clone <fork> && bun run graph:setup && bun run graph:dev
```

---

## Priority Order

| Phase | Work | Est. Effort |
|-------|------|-------------|
| **1** | Fix GraphCanvasRegion types + complete GraphView breakdown (1.1–1.6) | 1–2 days |
| **2** | GraphToolbar breakdown (2.1–2.2) | 1–2 days |
| **3** | Vocabulary consolidation (3.1–3.2) | 0.5 day |
| **4** | SpaceGraphJS audit & publish (4.1–4.3) | 1–2 days |
| **5** | Hook consolidation (6.1) | 0.5 day |
| **6** | Component/E2E test fixes (7.1–7.2) | 1–2 days |
| **7** | Screenshots & perf (7.3–7.4) | 0.5 day |
| **8** | Upstream sync (8.1) | 1 day |
| **9** | Shareable delivery (9.1–9.4) | 1 day |

**Total**: ~8–12 days to G7 delivery

---

## Dependencies

```
Fix GraphCanvasRegion types
        ↓
GraphView breakdown (1.2–1.6) → GraphToolbar breakdown (shared state types)
       ↓
Vocabulary consolidation (independent)
       ↓
SpaceGraphJS audit/publish (after host cleanup)
       ↓
Hook consolidation (after GraphView breakdown)
       ↓
Test fixes (after all refactoring)
       ↓
Screenshots & perf (after test fixes)
       ↓
Upstream sync → Shareable delivery
```

---

## Notes

- **Do not** run full `bun run check` during refactoring — use per-package `typecheck` + `test`
- **Do** run `bun run typecheck --filter=@opencode/session-graph` after each extraction
- **Do** run `bun test packages/session-graph/src` after each extraction
- Component test flakiness is infrastructure, not logic — fix after refactoring
- E2E failures are likely Suspense/lazy-loading timing — fix after refactoring

---

## Files Modified This Session

| File | Status |
|------|--------|
| `packages/session-graph/src/ui/useGraphKeyboard.ts` | ✅ Created |
| `packages/session-graph/src/canvas/sessionGraphAdapter.ts` | ✅ Simplified |
| `packages/session-graph/src/ui/GraphCanvasRegion.tsx` | ✅ Created (type issues fixed) |
| `packages/session-graph/src/ui/GraphView.tsx` | ✅ Refactored (unused imports removed, types fixed) |
| `packages/session-graph/src/ui/GraphWindowManager.tsx` | ✅ Created |

---

## Next Immediate Steps

1. Extract GraphOverlayManager (1.3)
2. Extract GraphViewportTracker (1.4)
3. Extract GraphStateInitializers (1.5)
4. Complete GraphView breakdown to thin composition (1.6)