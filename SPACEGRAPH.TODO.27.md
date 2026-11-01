# SPACEGRAPH.TODO.27 — Lift Reusable Components to spacegraphjs

> **Goal:** Extract framework-agnostic UI components from `packages/gui-plugins/src/spacegraph/` and `packages/session-graph/src/ui/` into `spacegraphjs/` so other dependents (VS Code extension, JetBrains plugin, standalone hosts) can reuse them without OpenCode's plugin SDK.
>
> **Strategy:** Generic graph capabilities belong in SpaceGraphJS, not in host-specific packages. The host packages (`@opencode/session-graph`, `gui-plugins`) should only contain OpenCode-specific integration glue (plugin SDK, session semantics, layout policy). This minimizes integration surface, improves compatibility, and makes SpaceGraphJS a full-featured graph UI library usable by any dependent.
>
> **Optimization:** Consolidate tiny packages, prioritize high-impact work, share test infrastructure, batch operations.

---

## 1. Component Inventory (Optimized)

### 1.1 Already Lifted (Phases 1-5) ✅

| Component | Source | Status |
|-----------|--------|--------|
| **Windows** (window manager) | `gui-plugins/src/spacegraph/Windows.tsx` | ✅ **DONE** → `@spacegraphjs/window-manager` |
| **Inspector** (node detail) | `gui-plugins/src/spacegraph/Inspector.tsx` | ✅ **DONE** → `@spacegraphjs/inspector` |

### 1.2 Consolidated Package Targets (Phases 6+)

| Package | Components | Source Files | Priority | Notes |
|---------|------------|--------------|----------|-------|
| **@spacegraphjs/toolbar** | GraphToolbar, LayersControl, LayoutControl, TimeControl, ViewControls, CommandControls | `GraphToolbar.tsx`, `GraphToolbar*.tsx` | **P0** | Core UI; 6 sub-controls tightly coupled | ✅ **DONE** |
| **@spacegraphjs/search** | GraphSearch, GraphFind, search utils | `GraphSearch.tsx`, `GraphFind.tsx` | **P0** | High user value; pure search logic extractable |
| **@spacegraphjs/export** | exportGraph, GraphExportControl, standaloneHtml | `export.ts`, `GraphExportControl.tsx` | **P0** | High user value; core fn already generic |
| **@spacegraphjs/navigation** | GraphBreadcrumbs, GraphMinimap, GraphLegend | `GraphBreadcrumbs.tsx`, `GraphMinimap.tsx`, `GraphLegend.tsx` | **P1** | Pure presentational; no deps after type abstraction |
| **@spacegraphjs/a11y** | GraphA11y | `GraphA11y.tsx` | **P1** | Already generic; tiny |
| **@spacegraphjs/diff** | GraphDiffView | `GraphDiff.tsx` | **P1** | Generic diff visualization |
| **@spacegraphjs/overlays** | GraphPeek, GraphPopover, GraphOverlayManager | `GraphPeek.tsx`, `GraphPopover.tsx`, `GraphOverlayManager.tsx` | **P2** | Related overlay system; share popover abstraction |
| **@spacegraphjs/controls** | GraphShowControl, GraphDrawControl, GraphZoomControl, GraphStatusBar, GraphQuestionsControl | `GraphShowControl.tsx`, `GraphDrawControl.tsx`, `GraphZoomControl.tsx`, `GraphStatusBar.tsx`, `GraphQuestionsControl.tsx` | **P2** | Small toolbar-adjacent controls; consolidate |
| **@spacegraphjs/compare** | GraphCompare, GraphCompareBar | `GraphCompare.tsx` | **P2** | Diff comparison UI |
| **@spacegraphjs/turn-map** | TurnMapInlineGraph, TurnMapOverlay | `TurnMap*.tsx` | **P2** | Turn visualization |

**Total: 10 packages** (vs 14 originally) — consolidated 4 single-component packages.

### 1.3 OpenCode-Specific — Stay in `@opencode/session-graph` / `gui-plugins`

| Component | Reason |
|-----------|--------|
| `GraphInspector` / `GraphInspectorPanel` | Uses `@opencode/ui` (Button, Dialog, Popover, etc.) |
| `GraphWindows` / `GraphWindowManager` | OpenCode window system (can use `@spacegraphjs/window-manager` internally) |
| `GraphFilesystemWindow` | File system integration |
| `GraphGroupMenu` / `GraphGallery` / `GraphNoteComposer` / `GraphError` / `GraphFallback` | Use `@opencode/ui` components |
| `model.ts` / `panel.tsx` / `renderer.tsx` / `external/*` / `settings.tsx` / `turn-map-body.tsx` / `turn-map-layer.tsx` | Plugin SDK integration |

---

## 2. Optimized Implementation Phases

### Phase 6: Batch Create All Package Skeletons (1 hour, parallelizable)

```bash
# In spacegraphjs/ — single command creates all 10 packages
for pkg in toolbar search export navigation a11y diff overlays controls compare turn-map; do
  mkdir -p packages/$pkg/src packages/$pkg/test
done
```

Each package gets: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` (templated, shared config).

### Phase 7: Core Packages (P0) — Sequential, High Impact

| Order | Package | Effort | Key Work |
|-------|---------|--------|----------|
| 1 | **toolbar** | 4 hrs | Externalize i18n; abstract session-ui types; 6 sub-controls |
| 2 | **search** | 2 hrs | Move pure search fns; externalize i18n + Icon; keyboard nav tests |
| 3 | **export** | 1.5 hrs | exportGraph done; abstract popover for control; HTML template |

**Shared work:** Type abstraction pattern, i18n externalization, Icon abstraction — done once in toolbar, reused.

### Phase 8: P1 Packages — Parallelizable (3-4 hrs total)

| Package | Effort | Notes |
|---------|--------|-------|
| **navigation** | 1 hr | Breadcrumbs, Minimap, Legend — pure presentational |
| **a11y** | 0.5 hr | Already generic; just copy + types |
| **diff** | 1 hr | GraphDiffView with generic types |

Can run in parallel since no cross-deps.

### Phase 9: P2 Packages — Parallelizable (2-3 hrs total)

| Package | Effort | Notes |
|---------|--------|-------|
| **overlays** | 1 hr | Peek, Popover, OverlayManager — share popover abstraction |
| **controls** | 1 hr | 5 small controls — shared types, minimal logic |
| **compare** | 0.5 hr | Compare + CompareBar |
| **turn-map** | 0.5 hr | TurnMapInlineGraph + TurnMapOverlay |

### Phase 10: session-graph Migration (2 hrs)

1. Add workspace deps for 10 new packages
2. Replace `session-graph/src/ui/` files with re-exports + adapters
3. Create `src/adapters/spacegraphjs.ts` for type conversion
4. Run typecheck + tests

### Phase 11: gui-plugins Verification (0.5 hrs)

- Typecheck passes (imports from session-graph unchanged)

---

## 3. Test Strategy (Minimized)

| Package | Test Approach | Rationale |
|---------|---------------|-----------|
| **toolbar** | Unit: capability gating, i18n injection, prop passing | Complex logic |
| **search** | Unit: search fns (navigationResults, rankedSearch); Integration: keyboard nav, results rendering | Core logic + UX |
| **export** | Unit: exportGraph (SVG/JSON/HTML), standaloneHtml template | Pure functions |
| **navigation** | **None** — covered by session-graph component tests | Pure presentational |
| **a11y** | **None** — covered by session-graph component tests | Pure presentational |
| **diff** | Unit: diff rendering with mock data | Logic-heavy |
| **overlays** | Unit: popover positioning, peek timing | Interaction logic |
| **controls** | **None** — trivial presentational | 5 tiny components |
| **compare** | Unit: compare rendering | Logic |
| **turn-map** | Unit: turn model building | Logic |

**Test budget:** ~6 focused test files vs 14 packages. Session-graph's existing component tests cover integration.

---

## 4. Shared Abstraction Infrastructure (Do Once, Reuse)

Create in `spacegraphjs/packages/shared/` (not published, internal):

```
shared/
├── src/
│   ├── i18n.ts              # t, plural prop types; default no-op implementations
│   ├── icons.ts             # IconComponent type; default inline SVGs
│   ├── popover.ts           # PopoverComponent type; render-prop pattern
│   ├── types.ts             # GraphNode, GraphEdge, GraphViewData, Provenance, Layout, DepthMode, ZoomLevel, etc.
│   └── index.ts
```

Each package imports from `@spacegraphjs/shared` (workspace:*) — **not published**, avoids version drift.

---

## 5. Optimized Timeline

| Phase | Effort | Parallelization | Cumulative |
|-------|--------|-----------------|------------|
| 1-5 (done) | 10 hrs | 2-3 hrs | 10 hrs ✅ |
| 6: Skeletons | 1 hr | All 10 at once | 11 hrs |
| 7: P0 (toolbar, search, export) | 7.5 hrs | Sequential | 18.5 hrs |
| 8: P1 (nav, a11y, diff) | 2.5 hrs | 3-way parallel | 21 hrs |
| 9: P2 (overlays, controls, compare, turn-map) | 3 hrs | 4-way parallel | 24 hrs |
| 10: session-graph migration | 2 hrs | — | 26 hrs |
| 11: gui-plugins verify | 0.5 hrs | — | **26.5 hrs** |

**vs Original: ~29 hrs → ~26.5 hrs (savings: ~2.5 hrs from consolidation + test reduction + batching)**

---

## 6. Package Consolidation Details

### Merged Packages

| Original | Merged Into | Savings |
|----------|-------------|---------|
| `show-control`, `draw-control`, `zoom-control`, `status-bar`, `questions-control` | **controls** | 4 package configs, 4 test setups |
| `peek`, `popover`, `overlay-manager` | **overlays** | 2 package configs, shared popover abstraction |
| `minimap`, `legend`, `breadcrumbs` | **navigation** | 2 package configs |

### Why This Works

- **Toolbar sub-controls** already live in one package — natural grouping
- **Search** has shared pure logic — natural grouping
- **Navigation** components are all pure presentational with same type deps
- **Controls** are all toolbar-adjacent toggles with identical prop patterns
- **Overlays** share popover abstraction and positioning logic

---

## 7. Updated Success Criteria

- [x] `window-manager`, `inspector` — DONE
- [x] `@spacegraphjs/toolbar` — DONE (builds successfully)
- [ ] 10 new packages build and install cleanly
- [ ] P0 packages (toolbar, search, export) have focused unit tests
- [ ] P1/P2 packages: no dedicated tests (covered by session-graph component tests)
- [ ] `session-graph` re-exports from all 10 packages; typecheck + tests pass
- [ ] `gui-plugins` typecheck passes
- [ ] Second host can import toolbar, search, export, navigation without OpenCode deps
- [ ] Bundle size: each package independently tree-shakeable

---

## 8. Versioning (10 packages + session-graph)

| Package | Version |
|---------|---------|
| `@spacegraphjs/window-manager` | `0.1.0` |
| `@spacegraphjs/inspector` | `0.1.0` |
| `@spacegraphjs/toolbar` | `0.1.0` |
| `@spacegraphjs/search` | `0.1.0` |
| `@spacegraphjs/export` | `0.1.0` |
| `@spacegraphjs/navigation` | `0.1.0` |
| `@spacegraphjs/a11y` | `0.1.0` |
| `@spacegraphjs/diff` | `0.1.0` |
| `@spacegraphjs/overlays` | `0.1.0` |
| `@spacegraphjs/controls` | `0.1.0` |
| `@spacegraphjs/compare` | `0.1.0` |
| `@spacegraphjs/turn-map` | `0.1.0` |
| `@opencode/session-graph` | `0.1.0` |

**Publish Order:**
1. `window-manager`, `inspector` ✅
2. `toolbar`, `search`, `export`, `navigation`, `a11y`, `diff` (no cross-deps)
3. `overlays`, `controls`, `compare`, `turn-map` (depend on shared types)
4. `session-graph` (depends on all)
5. `gui-plugins` (depends on session-graph)

---

## 9. Related Documents

- `SPACEGRAPH.md` §6 — SpaceGraphJS dependency overview
- `SPACEGRAPH.md` §9.1 — Five-rung contribution ladder
- `packages/gui-plugins/AGENTS.md` — Plugin SDK rules
- `spacegraphjs/AGENTS.md` — Library code guidelines
- `packages/session-graph/AGENTS.md` — Session graph boundaries

---

---

## 10. Additional Improvements & Code Sharing

### 10.1 Extended Shared Infrastructure

Add to `spacegraphjs/packages/shared/src/`:

| File | Purpose | Used By |
|------|---------|---------|
| `animations.ts` | Spring/transition configs (framer-motion style); shared `useSpring`, `useTransition` hooks | overlays, controls, turn-map, peek |
| `keyboard.ts` | `useKeyboardShortcuts`, `useArrowNavigation`, `useFocusTrap` hooks | search, toolbar, overlays, navigation |
| `tokens.ts` | Design token types (spacing, radii, shadows, transitions); maps to CSS custom properties | All packages for consistent theming |
| `css.ts` | `cx`/`cn` utility for conditional classes; `styleVar` for CSS var access | All packages |
| `portal.ts` | `Portal` component for rendering overlays/popovers at document root | overlays, popover, export-control |
| `hooks.ts` | `useClickOutside`, `useResizeObserver`, `useIntersectionObserver`, `useMediaQuery` | overlays, minimap, toolbar, peek |

**Benefit:** Avoids reimplementing interaction logic across 10 packages. Each hook is ~30 lines, tree-shakeable.

### 10.2 Headless Hooks Pattern (Future-Proofing)

For maximum flexibility without committing to UI, export headless logic alongside components:

```typescript
// @spacegraphjs/toolbar/src/hooks.ts
export function useToolbarState(initial?: Partial<ToolbarState>) {
  // Returns { level, facets, depth, layout, zoom, checkpoint, ... setters }
}

export function useSearch(model: GraphViewData) {
  // Returns { query, results, setQuery, select, navigate }
}

export function usePeek(model: GraphViewData) {
  // Returns { peekedNode, showPeek, hidePeek }
}
```

**Usage:**
```tsx
// Host builds custom UI
function CustomToolbar() {
  const { level, setLevel, facets, setFacets } = useToolbarState();
  return <MyCustomLevelPicker value={level} onChange={setLevel} />;
}

// Or use provided component
<GraphToolbar level={level} onLevel={setLevel} facets={facets} onFacetsChange={setFacets} />
```

**Implementation:** Extract state logic from components into hooks during Phase 7-9. Zero extra cost if done during extraction.

### 10.3 Automated Migration (Codemod)

Create `spacegraphjs/codemods/` for session-graph migration:

```bash
# Run in session-graph/
npx jscodeshift --parser=tsx \
  --transform=spacegraphjs/codemods/lift-toolbar.ts \
  src/ui/GraphToolbar.tsx

# Transforms:
# import { GraphToolbar } from "./GraphToolbar"
# → import { GraphToolbar } from "@spacegraphjs/toolbar"
# Adds adapter imports for type conversion
```

**Patterns to codemod:**
1. Import replacement: `./GraphToolbar` → `@spacegraphjs/toolbar`
2. Prop type updates: `level: ZoomLevel` → `level: ToolbarLevel` (local type)
3. i18n prop injection: Add `t={i18n.t} plural={i18n.plural}` to component usage
4. Adapter function generation for type conversion

**Effort:** 2 hrs to write; saves 30 min manual editing per file × 30 files = 15 hrs saved.

### 10.4 Bundle Optimization Strategy

| Technique | Implementation |
|-----------|----------------|
| **Tree-shaking** | All exports are named; no barrel re-exports of entire packages |
| **Dynamic imports** | Heavy components (GraphSearch, GraphExportControl) exported as `lazy(() => import(...))` |
| **Side-effect free** | `package.json`: `"sideEffects": false` — enables dead code elimination |
| **Peer deps** | `@spacegraphjs/renderer`, `solid-js` as peers — single copy in host |
| **Shared internal** | `@spacegraphjs/shared` not published — no version conflicts |

**Bundle budget per package (gzipped):**
- toolbar: ~8 KB (core) + 2 KB per sub-control
- search: ~5 KB
- export: ~3 KB (core) + 2 KB (control)
- navigation: ~4 KB
- overlays: ~6 KB
- controls: ~3 KB
- diff/compare/turn-map: ~4 KB each

### 10.5 CSS/Styling Approach

**Current:** Tailwind-like utility classes in JSX (`class="flex items-center gap-2 px-2 py-1.5"`)

**Options for spacegraphjs:**
1. **Keep utility classes** — Host must provide matching CSS (Tailwind, UnoCSS, or custom). Document required classes.
2. **Extract to CSS Modules** — `.module.css` files co-located with components. More portable, slightly larger bundles.
3. **CSS-in-JS (vanilla-extract)** — Type-safe, zero-runtime, but adds build complexity.

**Decision:** **Option 1 (utility classes) + documented class map.** 
- Most SpaceGraphJS hosts already use Tailwind-compatible utilities
- Add `packages/shared/src/classMap.ts` documenting required classes per component
- Host can map to their design system

```typescript
// shared/src/classMap.ts
export const classMap = {
  toolbar: "flex flex-wrap items-center gap-2 border-b px-2 py-1.5",
  toolbarButton: "rounded px-2 py-1 text-sm hover:bg-muted",
  searchInput: "flex-1 bg-transparent outline-none placeholder:text-muted",
  // ...
} as const;
```

### 10.6 Storybook / Documentation per Package

Each package gets `stories/` for visual testing:

```
packages/toolbar/
├── src/
├── stories/
│   ├── GraphToolbar.stories.tsx      # All prop combinations
│   ├── GraphLayersControl.stories.tsx
│   └── index.ts                      # Register with spacegraphjs storybook
├── .storybook/
│   └── main.ts                       # Extends root config
```

**Shared storybook config** at `spacegraphjs/.storybook/` — packages extend it. Runs in CI for visual regression.

### 10.7 Type-Safe Adapter Pattern

Formalize the session-graph → spacegraphjs conversion:

```typescript
// session-graph/src/adapters/spacegraphjs.ts
import type { GraphViewData as SGViewData, GraphNode as SGNode } from "@opencode/session-ui/graph";
import type { GraphViewData as SGJSViewData, GraphNode as SGJSNode } from "@spacegraphjs/shared";

/** Converts session-ui graph types to spacegraphjs generic types. */
export function toSGJSViewData(data: SGViewData): SGJSViewData {
  return {
    nodes: data.nodes.map(toSGJSNode),
    edges: data.edges.map(e => ({ from: e.source, to: e.target, kind: e.kind })),
  };
}

export function toSGJSNode(node: SGNode): SGJSNode {
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    summary: node.summary,
    provenance: node.provenance ? { ...node.provenance, source: String(node.provenance.source) } : undefined,
    data: node.data as Record<string, unknown>,
  };
}

/** Batch adapter for toolbar — converts all props at once. */
export function adaptToolbarProps(props: SessionGraphToolbarProps): SGJSToolbarProps {
  return {
    ...props,
    model: toSGJSViewData(props.model),
    t: (k) => props.i18n.t(k),
    plural: (k, c, p) => props.i18n.plural(k, c, p),
    // ...
  };
}
```

**Benefit:** Single conversion point; components stay pure; easy to test.

### 10.8 Accessibility Enhancements

During extraction, upgrade a11y beyond current state:

| Component | Current | Improved |
|-----------|---------|----------|
| Toolbar | Basic ARIA labels | Full roving tabindex for overflow menu; keyboard shortcuts announced |
| Search | Basic combobox | Live region for result count; `aria-describedby` for hints |
| Overlays | Focus trap | Return focus to trigger; `aria-modal`; `Esc` handling |
| Peek | None | `role="tooltip"`; `aria-describedby` on target |
| Navigation | Breadcrumbs only | `nav` landmark; `aria-current="page"` |

**Effort:** +1 hr during P0/P2 extraction (done inline, not separate).

### 10.9 Performance Considerations

| Concern | Mitigation |
|---------|------------|
| **Toolbar re-renders** | Split into `ToolbarRow` (memo) + sub-controls (memo); only changed axis re-renders |
| **Search on every keystroke** | Debounce `query` in `useSearch` hook (150ms); memoize `rankedSearch` |
| **Minimap canvas** | `useMemo` for render model; only re-draw on viewport/model change |
| **Peek popover** | `requestAnimationFrame` for position update; cleanup on unmount |
| **Turn map** | Virtualized turn list; only render visible turns |

### 10.10 Migration Checklist Additions

Add to Phase 10 (session-graph migration):

- [ ] Run codemod for import replacements
- [ ] Add adapter imports to each re-export file
- [ ] Verify all i18n keys exist in OpenCode's `en.ts` (new keys for spacegraphjs components)
- [ ] Update `session-graph/src/index.ts` to re-export from spacegraphjs packages
- [ ] Run `bun run test:components` (component tests catch visual regressions)
- [ ] Verify bundle size: `bun run build && npx bundle-analyzer dist/`

---

## 11. Complete Package Dependency Graph

```
@spacegraphjs/
├── shared (internal, not published)
│   ├── i18n, icons, popover, types, animations, keyboard, tokens, css, portal, hooks
│
├── window-manager ✅
│   └── deps: shared, solid-js
│
├── inspector ✅
│   └── deps: shared, solid-js
│
├── toolbar (P0)
│   ├── GraphToolbar + 5 sub-controls
│   └── deps: shared, @spacegraphjs/renderer (peer), solid-js
│
├── search (P0)
│   ├── GraphSearch, GraphFind, search.ts
│   └── deps: shared, solid-js
│
├── export (P0)
│   ├── exportGraph, GraphExportControl, standaloneHtml
│   └── deps: shared, @spacegraphjs/svg-renderer (peer), solid-js
│
├── navigation (P1)
│   ├── GraphBreadcrumbs, GraphMinimap, GraphLegend
│   └── deps: shared, solid-js
│
├── a11y (P1)
│   ├── GraphA11y
│   └── deps: shared, solid-js
│
├── diff (P1)
│   ├── GraphDiffView
│   └── deps: shared, solid-js
│
├── overlays (P2)
│   ├── GraphPeek, GraphPopover, GraphOverlayManager
│   └── deps: shared, solid-js
│
├── controls (P2)
│   ├── 5 small controls
│   └── deps: shared, solid-js
│
├── compare (P2)
│   ├── GraphCompare, GraphCompareBar
│   └── deps: shared, solid-js
│
├── turn-map (P2)
│   ├── TurnMapInlineGraph, TurnMapOverlay
│   └── deps: shared, solid-js
│
└── @opencode/session-graph (integration layer)
    ├── GraphView, GraphInspector, GraphWindows, etc.
    └── deps: ALL above (re-exports) + @opencode/ui + @opencode/plugin/gui
```

**No circular deps.** All arrows point inward to `shared` or outward to peers.

---

## 12. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type drift between session-ui and spacegraphjs types | Medium | High | Adapter functions + unit tests for conversion |
| Missing i18n keys in OpenCode | Low | Medium | Codemod extracts keys; CI checks against en.ts |
| Bundle size regression | Low | Medium | CI budget check: `size-limit` per package |
| Breaking change in @spacegraphjs/renderer | Low | High | Peer dep with `^` version; test against latest in CI |
| Host doesn't provide popover/Icon | Medium | Medium | Default implementations in shared; documented as required |

---

## 13. Final Timeline with Improvements

| Phase | Work | Effort | Notes |
|-------|------|--------|-------|
| 6 | Batch skeletons + shared infrastructure | 1.5 hrs | Includes shared package |
| 7 | P0: toolbar, search, export | 8.5 hrs | Includes hooks extraction + a11y upgrades |
| 8 | P1: navigation, a11y, diff | 2.5 hrs | Parallel |
| 9 | P2: overlays, controls, compare, turn-map | 3 hrs | Parallel |
| 10 | Codemod writing + session-graph migration | 3 hrs | Codemod saves manual work |
| 11 | gui-plugins verify + CI setup | 1 hr | Bundle budgets, storybook |

**Total: ~29.5 hrs** (vs 26.5 hrs without improvements — but includes headless hooks, codemod, a11y, CI, docs which pay off long-term)

---

## 14. Next Steps

1. **Approve plan** — confirm package consolidation, priorities
2. **Phase 6** — Create `shared/` + 10 package skeletons (single script)
3. **Phase 7** — Start with `toolbar` (highest complexity, establishes patterns)
4. **Parallel** — While toolbar builds, create codemod scaffolding

**Decision needed:** 
- Confirm 10-package consolidation (vs 14)
- Confirm utility-class styling approach (Option 1)
- Confirm headless hooks as part of P0 (not separate phase)

---

**Owner:** SpaceGraph maintainers
**Blockers:** None
**Depends on:** Phases 1-5 complete (✅ done)