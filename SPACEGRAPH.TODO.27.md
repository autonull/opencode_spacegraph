# SPACEGRAPH.TODO.27 — Lift Reusable Components to spacegraphjs

> **Goal:** Extract framework-agnostic UI components from `packages/gui-plugins/src/spacegraph/` and `packages/session-graph/src/ui/` into `spacegraphjs/` so other dependents (VS Code extension, JetBrains plugin, standalone hosts) can reuse them without OpenCode's plugin SDK.
>
> **Strategy:** Generic graph capabilities belong in SpaceGraphJS, not in host-specific packages. The host packages (`@opencode/session-graph`, `gui-plugins`) should only contain OpenCode-specific integration glue (plugin SDK, session semantics, layout policy). This minimizes integration surface, improves compatibility, and makes SpaceGraphJS a full-featured graph UI library usable by any dependent.

---

## 1. Component Inventory (Expanded)

### 1.1 Already Lifted (Phases 1-5) ✅

| Component | Source | OpenCode Deps | Status |
|-----------|--------|---------------|--------|
| **Windows** (window manager) | `gui-plugins/src/spacegraph/Windows.tsx` | `@opencode/ui/i18n` (empty state only) | ✅ **DONE** → `@spacegraphjs/window-manager` |
| **Inspector** (node detail) | `gui-plugins/src/spacegraph/Inspector.tsx` | `@opencode/ui/i18n`, `session-graph/formatProvenance`, `session-graph/text` | ✅ **DONE** → `@spacegraphjs/inspector` |

### 1.2 To Lift from `session-graph/src/ui/` (Phases 6+)

| Component | Current Path | OpenCode Deps | Liftable? | Target Package |
|-----------|--------------|---------------|-----------|----------------|
| **GraphToolbar** + subcontrols | `session-graph/src/ui/GraphToolbar.tsx` + `GraphToolbar*.tsx` | `useI18n`, `@opencode/session-ui/graph` types | ✅ Yes (with i18n externalization) | `@spacegraphjs/toolbar` |
| **GraphSearch** | `session-graph/src/ui/GraphSearch.tsx` | `useI18n`, `@opencode/ui/Icon`, `session-ui/graph` search fns | ✅ Yes (with i18n/Icon externalization) | `@spacegraphjs/search` |
| **GraphFind** | `session-graph/src/ui/GraphFind.tsx` | `useI18n`, `@opencode/ui/Icon` | ✅ Yes (with i18n/Icon externalization) | `@spacegraphjs/search` |
| **GraphBreadcrumbs** | `session-graph/src/ui/GraphBreadcrumbs.tsx` | None (pure Solid) | ✅ Yes | `@spacegraphjs/navigation` |
| **GraphA11y** | `session-graph/src/ui/GraphA11y.tsx` | None (pure Solid) | ✅ Yes | `@spacegraphjs/a11y` |
| **GraphDiffView** | `session-graph/src/ui/GraphDiff.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/diff` |
| **GraphExportControl** + `export.ts` | `session-graph/src/ui/export.ts`, `GraphExportControl.tsx` | `@opencode/ui/Dialog` (for control) | ✅ Yes (core export fn is generic; control needs abstraction) | `@spacegraphjs/export` |
| **GraphMinimap** | `session-graph/src/ui/GraphMinimap.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/minimap` |
| **GraphLegend** | `session-graph/src/ui/GraphLegend.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/legend` |
| **GraphPeek** | `session-graph/src/ui/GraphPeek.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/peek` |
| **GraphPopover** | `session-graph/src/ui/GraphPopover.tsx` | `@opencode/ui/Popover` | ✅ Yes (needs popover abstraction) | `@spacegraphjs/popover` |
| **GraphShowControl** | `session-graph/src/ui/GraphShowControl.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/show-control` |
| **GraphDrawControl** | `session-graph/src/ui/GraphDrawControl.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/draw-control` |
| **GraphZoomControl** | `session-graph/src/ui/GraphZoomControl.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/zoom-control` |
| **GraphStatusBar** | `session-graph/src/ui/GraphStatusBar.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/status-bar` |
| **GraphQuestionsControl** | `session-graph/src/ui/GraphQuestionsControl.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/questions-control` |
| **GraphOverlayManager** | `session-graph/src/ui/GraphOverlayManager.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/overlay-manager` |
| **GraphCompare** / `GraphCompareBar` | `session-graph/src/ui/GraphCompare.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/compare` |
| **TurnMapInlineGraph** / **TurnMapOverlay** | `session-graph/src/ui/TurnMap*.tsx` | `@opencode/session-ui/graph` types | ✅ Yes (with type abstraction) | `@spacegraphjs/turn-map` |

### 1.3 OpenCode-Specific — Stay in `@opencode/session-graph` / `gui-plugins`

| Component | Reason |
|-----------|--------|
| `GraphInspector` | Uses `@opencode/ui` (Button, Dialog, Popover, etc.) — host-specific detail panel |
| `GraphInspectorPanel` | Uses `@opencode/ui` components |
| `GraphWindows` / `GraphWindowManager` | OpenCode window system (now can use `@spacegraphjs/window-manager` internally) |
| `GraphFilesystemWindow` | File system integration (OpenCode-specific) |
| `GraphGroupMenu` / `GraphGallery` / `GraphNoteComposer` / `GraphError` / `GraphFallback` | Use `@opencode/ui` components |
| `model.ts` (gui-plugins) | Full plugin SDK integration |
| `panel.tsx` / `renderer.tsx` / `external/*` | Plugin host integration |
| `settings.tsx` | OpenCode settings surface |
| `turn-map-body.tsx` / `turn-map-layer.tsx` | Transcript integration |

---

## 2. Target Structure in spacegraphjs (Expanded)

```
spacegraphjs/
├── packages/
│   ├── window-manager/        # ✅ DONE: Windows component
│   │   ├── src/Windows.tsx, WindowItem.tsx, focus-trap.ts, types.ts, index.ts
│   ├── inspector/             # ✅ DONE: Inspector component
│   │   ├── src/Inspector.tsx, ProvenanceDisplay.tsx, OutputDisplay.tsx, types.ts, index.ts
│   │
│   ├── toolbar/               # NEW: Graph toolbar with sub-controls
│   │   ├── src/
│   │   │   ├── GraphToolbar.tsx              # Main toolbar
│   │   │   ├── GraphLayersControl.tsx        # Level, facets, depth, renderer
│   │   │   ├── GraphLayoutControl.tsx        # Layout selector
│   │   │   ├── GraphTimeControl.tsx          # Turn checkpoint navigation
│   │   │   ├── GraphToolbarViewControls.tsx  # View toggles (peek, legend, gallery, etc.)
│   │   │   ├── GraphToolbarCommandControls.tsx # Commands (export, equalizer, etc.)
│   │   │   ├── types.ts                      # GraphToolbarProps, sub-control props
│   │   │   └── index.ts
│   │
│   ├── search/                # NEW: Search & find
│   │   ├── src/
│   │   │   ├── GraphSearch.tsx               # Full search dialog
│   │   │   ├── GraphFind.tsx                 # Inline find bar
│   │   │   ├── search.ts                     # Pure search functions (navigationResults, rankedSearch, navigationHelp)
│   │   │   ├── types.ts                      # GraphSearchProps, GraphFindProps
│   │   │   └── index.ts
│   │
│   ├── export/                # NEW: Export functionality
│   │   ├── src/
│   │   │   ├── export.ts                     # Core exportGraph function (SVG/JSON/HTML)
│   │   │   ├── GraphExportControl.tsx        # Export button/menu (needs popover abstraction)
│   │   │   ├── standaloneHtml.ts             # HTML template generator
│   │   │   ├── types.ts                      # ExportFormat, ExportOptions
│   │   │   └── index.ts
│   │
│   ├── navigation/            # NEW: Navigation aids
│   │   ├── src/
│   │   │   ├── GraphBreadcrumbs.tsx          # Path breadcrumbs
│   │   │   ├── GraphMinimap.tsx              # Minimap overview
│   │   │   ├── GraphLegend.tsx               # Legend panel
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── a11y/                  # NEW: Accessibility
│   │   ├── src/
│   │   │   ├── GraphA11y.tsx                 # Live region announcements
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── diff/                  # NEW: Graph diff visualization
│   │   ├── src/
│   │   │   ├── GraphDiffView.tsx             # Diff comparison view
│   │   │   ├── types.ts                      # GraphDiff, GraphDiffSource
│   │   │   └── index.ts
│   │
│   ├── peek/                  # NEW: Hover peek
│   │   ├── src/
│   │   │   ├── GraphPeek.tsx                 # Transient node peek
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── popover/               # NEW: Generic popover (abstraction over @opencode/ui/Popover)
│   │   ├── src/
│   │   │   ├── GraphPopover.tsx              # Popover component
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── show-control/          # NEW: Show/hide toggles
│   │   ├── src/
│   │   │   ├── GraphShowControl.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── draw-control/          # NEW: Draw mode controls
│   │   ├── src/
│   │   │   ├── GraphDrawControl.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── zoom-control/          # NEW: Zoom controls
│   │   ├── src/
│   │   │   ├── GraphZoomControl.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── status-bar/            # NEW: Status bar
│   │   ├── src/
│   │   │   ├── GraphStatusBar.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── questions-control/     # NEW: Questions/filters
│   │   ├── src/
│   │   │   ├── GraphQuestionsControl.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── overlay-manager/       # NEW: Overlay management
│   │   ├── src/
│   │   │   ├── GraphOverlayManager.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── compare/               # NEW: Graph comparison
│   │   ├── src/
│   │   │   ├── GraphCompare.tsx
│   │   │   ├── GraphCompareBar.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   ├── turn-map/              # NEW: Turn map visualization
│   │   ├── src/
│   │   │   ├── TurnMapInlineGraph.tsx
│   │   │   ├── TurnMapOverlay.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │
│   └── session-graph/         # EXISTING: @opencode/session-graph (thin integration layer)
│       ├── src/
│       │   ├── GraphView.tsx                 # Main canvas (stays — ties to renderer)
│       │   ├── GraphInspector.tsx            # OpenCode-specific inspector (uses @opencode/ui)
│       │   ├── GraphInspectorPanel.tsx       # OpenCode-specific panel
│       │   ├── GraphWindows.tsx              # Uses @spacegraphjs/window-manager internally
│       │   ├── GraphFilesystemWindow.tsx     # OpenCode-specific
│       │   ├── GraphGroupMenu.tsx            # OpenCode-specific
│       │   ├── GraphGallery.tsx              # OpenCode-specific
│       │   ├── GraphNoteComposer.tsx         # OpenCode-specific
│       │   ├── GraphError.tsx                # OpenCode-specific
│       │   ├── GraphFallback.tsx             # OpenCode-specific
│       │   ├── export.ts                     # Re-export from @spacegraphjs/export
│       │   ├── theme.ts                      # Re-export from @spacegraphjs/renderer
│       │   └── ... (other OpenCode-specific)
│       ├── package.json                      # ✅ Updated
│       ├── vite.config.ts                    # ✅ Library build
│       └── tsconfig.json                     # ✅ Declarations
```

---

## 3. Dependency Decoupling Strategy (Extended)

### 3.3 Toolbar Package (`@spacegraphjs/toolbar`)

- **Current deps:** `useI18n` from `@opencode/ui/context/i18n`, `@opencode/session-ui/graph` types
- **Fix:** 
  - Accept `t: (key: string) => string` and `plural: (key: string, count: number, params?) => string` props on main toolbar
  - Pass i18n down to sub-controls via context or props
  - Replace `@opencode/session-ui/graph` types with local generic types (`GraphFacets`, `FacetCounts`, `Layout`, `DepthMode`, `ZoomLevel`, `GraphArrangement`, `GraphSide`, `DetailMode`, `DetailFraming`, `GraphViewData`)
  - Sub-controls: `GraphLayersControl`, `GraphLayoutControl`, `GraphTimeControl`, `GraphToolbarViewControls`, `GraphToolbarCommandControls`
  - Each sub-control accepts its own props slice; main toolbar composes them
  - **Capability detection:** `RendererCapabilities` from `@spacegraphjs/renderer` — keep as peer dep
  - **Dispatch command:** `dispatchCommand?: (command: string) => void` — host provides
  - **Export callback:** `onExport?: (format, model) => void` — host provides render model

### 3.4 Search Package (`@spacegraphjs/search`)

- **Current deps:** `useI18n`, `@opencode/ui/Icon`, `session-ui/graph` search functions
- **Fix:**
  - Accept `t`, `plural` props
  - Accept `Icon` component as prop (default to simple SVG) — decouples from `@opencode/ui`
  - Move pure search functions (`navigationResults`, `rankedSearch`, `navigationHelp`) to `search.ts` with generic `GraphNode`/`GraphViewData` types
  - `GraphFind` — inline find bar, similar externalization

### 3.5 Export Package (`@spacegraphjs/export`)

- **Current deps:** `@spacegraphjs/svg-renderer` (already in spacegraphjs), `@opencode/ui/Dialog` (for control)
- **Fix:**
  - `exportGraph` function: already generic, uses renderer contracts — keep as-is
  - `GraphExportControl`: accept `Popover` component as prop (abstraction), or make it a headless hook + render prop
  - `standaloneHtml`: generic template function

### 3.6 Navigation Package (`@spacegraphjs/navigation`)

- **Current deps:** `@opencode/session-ui/graph` types
- **Fix:** Replace with local generic types (`GraphNode`, `GraphEdge`, `GraphViewData`)

### 3.7 Type Abstraction Pattern

For all packages consuming `@opencode/session-ui/graph` types:

```typescript
// In each package's types.ts — define local generic types
export interface GraphNode { id: string; label: string; kind?: string; summary?: string; provenance?: Provenance; data?: Record<string, unknown>; }
export interface GraphEdge { from: string; to: string; kind?: string; }
export interface GraphViewData { nodes: GraphNode[]; edges: GraphEdge[]; }
export interface Provenance { source: string; asOf?: number; confidence?: "explicit" | "structural" | "inferred"; }

// Host-specific types (Layout, DepthMode, etc.) — define as string unions or accept as generic params
export type Layout = "lanes" | "timeline" | "hierarchy" | "tree" | "force";
export type DepthMode = "flat" | "layered" | "depthStack" | "orbit";
export type ZoomLevel = "overview" | "execution" | "detail";
// ... etc.
```

**Host adapter pattern** (in `@opencode/session-graph`):
```typescript
// session-graph/src/adapters/spacegraphjs.ts
export function toSpacegraphjsGraphViewData(data: SessionGraphViewData): SpacegraphjsGraphViewData { ... }
export function toSpacegraphjsGraphNode(node: SessionGraphNode): SpacegraphjsGraphNode { ... }
```

---

## 4. Implementation Phases (Extended)

### Phase 6: Create New Package Skeletons (Parallelizable)

```bash
# In spacegraphjs/
mkdir -p packages/toolbar/src packages/toolbar/test
mkdir -p packages/search/src packages/search/test
mkdir -p packages/export/src packages/export/test
mkdir -p packages/navigation/src packages/navigation/test
mkdir -p packages/a11y/src packages/a11y/test
mkdir -p packages/diff/src packages/diff/test
mkdir -p packages/minimap/src packages/minimap/test
mkdir -p packages/legend/src packages/legend/test
mkdir -p packages/peek/src packages/peek/test
mkdir -p packages/popover/src packages/popover/test
mkdir -p packages/show-control/src packages/show-control/test
mkdir -p packages/draw-control/src packages/draw-control/test
mkdir -p packages/zoom-control/src packages/zoom-control/test
mkdir -p packages/status-bar/src packages/status-bar/test
mkdir -p packages/questions-control/src packages/questions-control/test
mkdir -p packages/overlay-manager/src packages/overlay-manager/test
mkdir -p packages/compare/src packages/compare/test
mkdir -p packages/turn-map/src packages/turn-map/test
```

Each package: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` (same pattern as window-manager/inspector).

### Phase 7: Extract Toolbar (Core — enables other UI)

1. **Copy** `session-graph/src/ui/GraphToolbar.tsx` + sub-controls → `packages/toolbar/src/`
2. **Create** `types.ts` with all props types, generic graph types
3. **Externalize** i18n: add `t`, `plural` props to `GraphToolbarProps`, pass to sub-controls
4. **Abstract** `@opencode/session-ui/graph` types to local generics
5. **Abstract** `@opencode/ui/Icon` (if used in sub-controls) — accept as prop
5. **Export** from `index.ts`
6. **Write tests** — render with mock props, verify i18n injection, capability gating

### Phase 8: Extract Search

1. **Copy** `GraphSearch.tsx`, `GraphFind.tsx` → `packages/search/src/`
2. **Move** `navigationResults`, `rankedSearch`, `navigationHelp` from `@opencode/session-ui/graph` → `packages/search/src/search.ts` (pure functions)
3. **Create** `types.ts` with generic types
4. **Externalize** i18n + `Icon` component prop
5. **Export** from `index.ts`
6. **Write tests** — search logic, keyboard nav, i18n

### Phase 9: Extract Export

1. **Copy** `export.ts` → `packages/export/src/export.ts` (already generic)
2. **Copy** `GraphExportControl.tsx` → `packages/export/src/` (abstract popover)
3. **Create** `types.ts`
4. **Export** from `index.ts`

### Phase 10: Extract Navigation, A11y, Diff, and Remaining (Parallelizable)

Each follows same pattern: copy → create types.ts with generic types → externalize deps → export → test.

### Phase 11: Update `@opencode/session-graph` to Consume Published Packages

1. **Add** workspace dependencies for new packages
2. **Refactor** `session-graph/src/ui/`:
   - `GraphToolbar.tsx` → re-export from `@spacegraphjs/toolbar` with OpenCode i18n/formatters bound
   - `GraphSearch.tsx` / `GraphFind.tsx` → re-export from `@spacegraphjs/search`
   - `GraphBreadcrumbs.tsx` → re-export from `@spacegraphjs/navigation`
   - `GraphA11y.tsx` → re-export from `@spacegraphjs/a11y`
   - `GraphDiffView.tsx` → re-export from `@spacegraphjs/diff`
   - `export.ts` → re-export from `@spacegraphjs/export`
   - `GraphMinimap.tsx` / `GraphLegend.tsx` / `GraphPeek.tsx` / `GraphPopover.tsx` / etc. → re-export
3. **Create** adapter functions in `session-graph/src/adapters/spacegraphjs.ts` for type conversion
4. **Run** `bun run typecheck` and `bun test src` in `session-graph`

### Phase 12: Update `gui-plugins` to Use New Session-Graph Re-exports

1. **No direct changes needed** — gui-plugins imports from `@opencode/session-graph`, which now re-exports from spacegraphjs packages
2. **Verify** `bun run typecheck` in `gui-plugins`
3. **Run** component tests

---

## 5. Modularity & Extensibility Considerations

### 5.1 Composable Package Design

Each package is independently installable. A minimal host might only need:
```json
"dependencies": {
  "@spacegraphjs/window-manager": "^0.1.0",
  "@spacegraphjs/inspector": "^0.1.0",
  "@spacegraphjs/toolbar": "^0.1.0"
}
```

Advanced hosts add search, export, navigation, etc. as needed.

### 5.2 Icon Abstraction

Instead of hardcoding `@opencode/ui/Icon`, accept a component prop:
```typescript
interface IconProps { name: string; size?: "small" | "medium" | "large"; class?: string; }
type IconComponent = (props: IconProps) => JSX.Element;

interface SearchProps {
  Icon?: IconComponent;  // Default: simple inline SVG
}
```

### 5.3 Popover/Dialog Abstraction

For `GraphExportControl`, `GraphPopover`, and similar — accept a render prop or component:
```typescript
interface PopoverProps {
  children: JSX.Element;
  content: JSX.Element;
  trigger?: "hover" | "click";
  position?: "top" | "bottom" | "left" | "right";
}
type PopoverComponent = (props: PopoverProps) => JSX.Element;
```

Host provides implementation (e.g., `@opencode/ui/Popover`, `@floating-ui/react`, custom).

### 5.4 Theme Token Abstraction

Already handled: `session-graph/src/ui/theme.ts` maps OpenCode CSS vars → `@spacegraphjs/renderer` `RenderTheme`. Keep this adapter in session-graph; spacegraphjs packages consume `RenderTheme` directly.

### 5.5 Future: React/Vue/Svelte Bindings

Each package exports Solid components. When a React host appears:
- Add `@spacegraphjs/toolbar-react` wrapper package using `@solidjs/meta` or manual port
- Keep Solid as source of truth; bindings are thin adapters

### 5.6 Future: Headless Hooks

For maximum flexibility, consider exposing headless logic as hooks:
```typescript
// @spacegraphjs/search
export function useGraphSearch(model: GraphViewData) { ... } // Returns { query, results, setQuery, select }
// @spacegraphjs/toolbar
export function useGraphToolbarState() { ... } // Returns level, facets, depth, layout, etc.
```

This lets hosts build custom UI while reusing logic.

---

## 6. Migration Checklist for @opencode/session-graph

After publishing new packages:

- [ ] Add workspace deps for all new `@spacegraphjs/*` packages
- [ ] `GraphToolbar.tsx` → `export { GraphToolbar } from "@spacegraphjs/toolbar"` (with bound i18n)
- [ ] `GraphLayersControl.tsx` → re-export from `@spacegraphjs/toolbar`
- [ ] `GraphLayoutControl.tsx` → re-export from `@spacegraphjs/toolbar`
- [ ] `GraphTimeControl.tsx` → re-export from `@spacegraphjs/toolbar`
- [ ] `GraphToolbarViewControls.tsx` → re-export from `@spacegraphjs/toolbar`
- [ ] `GraphToolbarCommandControls.tsx` → re-export from `@spacegraphjs/toolbar`
- [ ] `GraphSearch.tsx` → `export { GraphSearch } from "@spacegraphjs/search"`
- [ ] `GraphFind.tsx` → `export { GraphFind } from "@spacegraphjs/search"`
- [ ] `GraphBreadcrumbs.tsx` → `export { GraphBreadcrumbs } from "@spacegraphjs/navigation"`
- [ ] `GraphMinimap.tsx` → `export { GraphMinimap } from "@spacegraphjs/minimap"`
- [ ] `GraphLegend.tsx` → `export { GraphLegend } from "@spacegraphjs/legend"`
- [ ] `GraphA11y.tsx` → `export { GraphA11y } from "@spacegraphjs/a11y"`
- [ ] `GraphDiffView.tsx` → `export { GraphDiffView } from "@spacegraphjs/diff"`
- [ ] `export.ts` → `export { exportGraph, type ExportFormat, type ExportOptions } from "@spacegraphjs/export"`
- [ ] `GraphExportControl.tsx` → `export { GraphExportControl } from "@spacegraphjs/export"`
- [ ] `GraphPeek.tsx` → `export { GraphPeek } from "@spacegraphjs/peek"`
- [ ] `GraphPopover.tsx` → `export { GraphPopover } from "@spacegraphjs/popover"`
- [ ] `GraphShowControl.tsx` → `export { GraphShowControl } from "@spacegraphjs/show-control"`
- [ ] `GraphDrawControl.tsx` → `export { GraphDrawControl } from "@spacegraphjs/draw-control"`
- [ ] `GraphZoomControl.tsx` → `export { GraphZoomControl } from "@spacegraphjs/zoom-control"`
- [ ] `GraphStatusBar.tsx` → `export { GraphStatusBar } from "@spacegraphjs/status-bar"`
- [ ] `GraphQuestionsControl.tsx` → `export { GraphQuestionsControl } from "@spacegraphjs/questions-control"`
- [ ] `GraphOverlayManager.tsx` → `export { GraphOverlayManager } from "@spacegraphjs/overlay-manager"`
- [ ] `GraphCompare.tsx` / `GraphCompareBar.tsx` → `export from "@spacegraphjs/compare"`
- [ ] `TurnMapInlineGraph.tsx` / `TurnMapOverlay.tsx` → `export from "@spacegraphjs/turn-map"`
- [ ] Create `src/adapters/spacegraphjs.ts` for type conversions
- [ ] Run `bun run typecheck` and `bun test src` in `session-graph`

---

## 7. Timeline Estimate (Extended)

| Phase | Effort | Can Parallelize | Status |
|-------|--------|-----------------|--------|
| Phases 1-5 (Windows, Inspector, session-graph, gui-plugins) | ~10 hours | 2–3 hrs | ✅ **DONE** |
| Phase 6: New package skeletons (14 packages) | 2 hours | Yes (all) | ⬜ **PENDING** |
| Phase 7: Toolbar extraction | 4 hours | — | ⬜ **PENDING** |
| Phase 8: Search extraction | 2 hours | — | ⬜ **PENDING** |
| Phase 9: Export extraction | 1 hour | — | ⬜ **PENDING** |
| Phase 10: Navigation/A11y/Diff/Remaining (11 packages) | 6 hours | Yes (groups of 3-4) | ⬜ **PENDING** |
| Phase 11: session-graph migration | 3 hours | — | ⬜ **PENDING** |
| Phase 12: gui-plugins verification | 1 hour | — | ⬜ **PENDING** |
| **Total (new phases)** | **~19 hours** | **~8 hours parallel** | **0% complete** |
| **Grand Total** | **~29 hours** | | **~35% complete** |

---

## 8. Versioning & Publishing (Extended)

| Package | Version | Publish Target |
|---------|---------|----------------|
| `@spacegraphjs/window-manager` | `0.1.0` | npm (public) |
| `@spacegraphjs/inspector` | `0.1.0` | npm (public) |
| `@spacegraphjs/toolbar` | `0.1.0` | npm (public) |
| `@spacegraphjs/search` | `0.1.0` | npm (public) |
| `@spacegraphjs/export` | `0.1.0` | npm (public) |
| `@spacegraphjs/navigation` | `0.1.0` | npm (public) |
| `@spacegraphjs/a11y` | `0.1.0` | npm (public) |
| `@spacegraphjs/diff` | `0.1.0` | npm (public) |
| `@spacegraphjs/minimap` | `0.1.0` | npm (public) |
| `@spacegraphjs/legend` | `0.1.0` | npm (public) |
| `@spacegraphjs/peek` | `0.1.0` | npm (public) |
| `@spacegraphjs/popover` | `0.1.0` | npm (public) |
| `@spacegraphjs/show-control` | `0.1.0` | npm (public) |
| `@spacegraphjs/draw-control` | `0.1.0` | npm (public) |
| `@spacegraphjs/zoom-control` | `0.1.0` | npm (public) |
| `@spacegraphjs/status-bar` | `0.1.0` | npm (public) |
| `@spacegraphjs/questions-control` | `0.1.0` | npm (public) |
| `@spacegraphjs/overlay-manager` | `0.1.0` | npm (public) |
| `@spacegraphjs/compare` | `0.1.0` | npm (public) |
| `@spacegraphjs/turn-map` | `0.1.0` | npm (public) |
| `@opencode/session-graph` | `0.1.0` | npm (public, scoped) |

**Publish Order:**
1. `window-manager`, `inspector` (no deps) ✅
2. `toolbar`, `search`, `export`, `navigation`, `a11y`, `diff` (no deps on each other)
3. `minimap`, `legend`, `peek`, `popover`, `show-control`, `draw-control`, `zoom-control`, `status-bar`, `questions-control`, `overlay-manager`, `compare`, `turn-map` (depend on toolbar/search types)
4. `session-graph` (depends on all above)
5. `gui-plugins` (depends on session-graph)

---

## 9. Success Criteria (Extended)

- [x] `spacegraphjs/packages/window-manager` builds and installs cleanly
- [x] `spacegraphjs/packages/inspector` builds and installs cleanly
- [x] `packages/session-graph` publishes and installs cleanly
- [x] `gui-plugins` builds with workspace deps (no source duplication)
- [x] All existing tests pass in `session-graph`
- [ ] All 14 new packages build and install cleanly
- [ ] All new packages have unit tests (search logic, toolbar capability gating, export formats)
- [ ] `session-graph` re-exports from new packages and all tests pass
- [ ] `gui-plugins` typecheck passes with new session-graph
- [ ] A second host (e.g., `spacegraphjs/demo/second-host/`) can import and use toolbar, search, export, etc. without OpenCode deps
- [ ] Bundle size analysis: each package is independently tree-shakeable

---

## 10. Non-Goals (Deferred)

| Item | Reason |
|------|--------|
| React/Vue/Svelte bindings | Only Solid used in OpenCode; add when a host appears |
| TurnMapBody / turn-map-layer | OpenCode-specific transcript integration |
| Dialog fallbacks (`external/dialogs.tsx`) | OpenCode UI components |
| Settings page | OpenCode settings surface |
| Plugin setup (`external/renderer.tsx`) | OpenCode plugin host |
| `GraphInspector` / `GraphInspectorPanel` | OpenCode-specific detail panels (use `@opencode/ui`) |
| `GraphWindows` / `GraphWindowManager` | Can use `@spacegraphjs/window-manager` internally but remain in session-graph for OpenCode integration |
| `GraphFilesystemWindow` / `GraphGroupMenu` / `GraphGallery` / `GraphNoteComposer` / `GraphError` / `GraphFallback` | OpenCode-specific |

---

## 11. Related Documents

- `SPACEGRAPH.md` §6 — SpaceGraphJS dependency overview
- `SPACEGRAPH.md` §9.1 — Five-rung contribution ladder
- `packages/gui-plugins/AGENTS.md` — Plugin SDK rules
- `spacegraphjs/AGENTS.md` — Library code guidelines
- `packages/session-graph/AGENTS.md` — Session graph boundaries

---

## 12. Open Questions / Design Decisions

1. **Popover abstraction**: Should `@spacegraphjs/popover` be a generic component with render prop, or a headless hook + CSS? → Start with render prop; headless hook as future enhancement.

2. **Icon system**: Accept `Icon` component prop vs. string name + registry? → Component prop is more flexible; provide default inline SVGs.

3. **Toolbar sub-control granularity**: Keep as one `@spacegraphjs/toolbar` package with sub-controls, or split each sub-control? → One package for now (they're tightly coupled); can split later if needed.

4. **Turn map types**: `TurnMapInlineGraph`/`TurnMapOverlay` use `turnGraphModel`/`buildTurnRenderModel` from session-graph. These are generic turn visualization — move to `@spacegraphjs/turn-map` with their own types.

5. **GraphCompare types**: `GraphDiffSource` is generic (left/right render models). Move to `@spacegraphjs/compare`.

6. **Theme system**: Already in `@spacegraphjs/renderer` — session-graph's `theme.ts` is just an adapter. Keep as-is.

---

**Owner:** SpaceGraph maintainers
**Blockers:** None — pure extraction with abstraction, no functional changes
**Depends on:** Upstream sync complete (✅ done), all tests green (✅ done), Phases 1-5 complete (✅ done)