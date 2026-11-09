# SpaceGraph Unified Component & Multi-Paradigm Support (v34)

> **Goal:** Extract a single, configurable `SessionGraph` component that renders anywhere (transcript inline, popover, sidebar, fullscreen, hybrid) with props controlling layout, depth, detail mode, and interaction callbacks. Enable embedding OpenCode UI inside graph nodes and graph inside transcript. Support all user preferences without mode-switching friction.

> **Priority:** Paradigm enablement > video > studies. This unblocks the "transcript-first + 1% graph" and "graph-first" users simultaneously.

---

## §A — Ground Truth (from code inventory)

### A.1 Current Architecture

| Layer | Package | Responsibility |
|---|---|---|
| **Pure model** | `@opencode/session-ui/graph` | `buildGraph`, selectors (`turnSubgraph`, `forwardChain`, `why`), layout strategies, incremental builder |
| **Renderer contract** | `spacegraphjs` (pinned `8e6a18e`) | `ModelAdapter`, `GraphRenderer`, `HTMLNode`, layouts, camera, viewport |
| **OpenCode host UI** | `@opencode/session-graph` (bundled in plugin) | `GraphView` (1400 lines), toolbar, inspector, windows, keyboard, spatial memory, drill-down |
| **Plugin surfaces** | `gui-plugins/spacegraph` | `FullMap`, `HybridSurface`, `TurnMapLayer`, `MapDialog`, `SpacegraphPanel` — all thin wrappers around `GraphView` |

### A.2 Current Surfaces (all render `GraphView` with different prop bundles)

| Surface | Entry | Detail Mode | Layout/Depth | Selection |
|---|---|---|---|---|
| Side Panel | `ctx.layout.open("spacegraph:map")` | Panel | Lanes/Flat | Toolbar-driven |
| Map Surface (tab) | `SessionSurface` | Panel/Window | Toolbar | Toolbar-driven |
| Hybrid Surface | `SessionSurface` | Panel | Toolbar | Linked to transcript |
| Turn Map Overlay | `mod+t` | Inline buttons | Tree/Flat | Click→reveal transcript |
| Map Dialog | `mod+shift+m` (no surfaces) | Panel | Lanes/Flat | Toolbar-driven |
| Turn Map Dialog | `mod+t` (no surfaces) | Inline buttons | Tree/Flat | Click→reveal transcript |

### A.3 GraphView Props (120+ — the unified configuration surface)

Already supports: layout, depth, level, detailMode, detailFraming, selection, camera, windows, interaction callbacks (`onSelect`, `onOpenTranscript`, `onOpenSession`, `onTurnMap`, `onAction*`), export, a11y, spatial memory, drill-down, comparison, equalizer, file rail, popover, peek, followLog, rules, renderSummary, renderCard, diffSource.

**Missing for unified vision:**
- `roots: GraphNode[]` — render subset (turns, subagent, search results)
- `detailMode: "inline"` — expand inside parent surface
- `onNodeClick`, `onNodeExpand`, `onWhyClick` — finer-grained than `onSelect`
- `renderNodeContent: (node) => JSX.Element` — Solid component in node
- `renderNodeHTML: (node) => string` — HTMLNode bridge

### A.4 SpaceGraphJS HTMLNode

```ts
new HTMLNode({ id, html: string, position: [x,y,z], size: [w,h], data: { className } })
```
- Renders via CSS3D (Cytoscape) or DOM overlay (WebGL)
- Full event relay into graph interaction system
- Can contain arbitrary HTML — no Solid mount bridge yet

---

## §B — The Paradigm Shift

### B.1 From "Mode Switch" to "Progressive Disclosure"

| Old | New |
|---|---|
| Ctrl+Shift+M → separate panel | Inline expand in transcript |
| Three fixed levels (Overview/Execution/Detail) | Continuous zoom: transcript → turn → tool → subagent |
| Graph OR transcript | Graph IS transcript (collapsed) |
| One paradigm for all users | Configurable per surface, per user |

### B.2 Target User Preferences

| User | Primary | Graph % | Needs |
|---|---|---|---|
| Transcript loyalist | Linear log | 1% | Inline "Why?" on failure, expand delegation, permalink copy |
| Visual thinker | Graph | 90% | Full map, 3D, spatial memory, windows, comparison |
| Hybrid reviewer | Both | 50% | Split view, linked selection, inline detail |
| Mobile user | Transcript | 5% | Collapsed turn map, quick permalink |

---

## Phase 14 — Unified SessionGraph Component (P0)

### 14.1 Extract `SessionGraph` from `GraphView`

- [ ] **Create `packages/gui-plugins/src/spacegraph/internal/host/ui/SessionGraph.tsx`**
  - Pure rendering + interaction component, no OpenCode-specific toolbar/inspector/window logic
  - Props = all GraphView props that are renderer-agnostic + new embedding props
  - Returns JSX for: canvas, optional popover, optional inline detail, optional a11y tree
  - No `GraphToolbar`, `GraphInspectorPanel`, `GraphWindowManager`, `GraphStatusBar`, `GraphFileRail`, `GraphBreadcrumbs`, `GraphScaleNotice`, `GraphCompareBar` — host surfaces compose those

- [ ] **New props for `SessionGraph`:**
  ```ts
  interface SessionGraphProps extends Omit<GraphViewProps, "model" | "selection" | "onSelect"> {
    // Data
    roots: GraphNode[]                    // Subset to render (turns, subagent, filtered)
    model: GraphViewData                  // Full session data for context
    
    // Detail modes
    detailMode: "panel" | "popover" | "inline" | "window" | "auto"
    detailFraming: "card" | "center" | "focus"
    
    // Fine-grained interaction (host owns behavior)
    onNodeClick?: (node: GraphNode, event: MouseEvent) => void
    onNodeExpand?: (node: GraphNode) => void
    onWhyClick?: (node: GraphNode) => void
    onOpenTranscript?: (messageID: string, partID?: string) => void
    onOpenSession?: (sessionID: string) => void
    onPermalinkCopy?: (node: GraphNode) => void
    
    // Embedding OpenCode UI in nodes
    renderNodeContent?: (node: GraphNode) => JSX.Element   // Solid component
    renderNodeHTML?: (node: GraphNode) => string           // HTMLNode bridge
    
    // Camera
    camera?: CameraState
    onCameraChange?: (camera: CameraState) => void
    
    // Selection
    selection?: string
    onSelectionChange?: (id: string | undefined) => void
    
    // Windows
    windows?: readonly GraphWindowState[]
    onWindowsChange?: (windows: GraphWindowState[]) => void
  }
  ```

- [ ] **Refactor `GraphView` to compose `SessionGraph` + host chrome**
  - `GraphView` = `SessionGraph` + `GraphToolbar` + `GraphInspectorPanel`/`Windows` + `GraphStatusBar` + `GraphFileRail` + `GraphBreadcrumbs` + `GraphScaleNotice` + `GraphCompareBar`
  - All existing behavior preserved, zero loss

- [ ] **Unit tests:** `SessionGraph` renders with all prop combinations; `GraphView` still passes component tests

### 14.2 HTMLNode Solid Bridge

- [ ] **Add `mountSolidComponent` utility** in `spacegraphjs` or plugin
  ```ts
  function mountSolidComponent(html: string, component: () => JSX.Element, props: any): HTMLElement
  ```
  - Creates container, mounts Solid component, returns element for HTMLNode
  - Handles cleanup on node removal

- [ ] **Add `renderNodeContent` support in `SessionGraph`**
  - If provided, wraps node in HTMLNode with mounted Solid component
  - Falls back to `renderCard` / `renderSummary` for card template

- [ ] **Demo: Composer Input inside node** — click turn → inline expand shows mini-composer for that turn's context

---

## Phase 15 — Transcript Inline Integration (P0)

### 15.1 Inline Turn Graph

- [ ] **Add `TurnGraphInline` component** in `gui-plugins/spacegraph`
  ```tsx
  <TurnGraphInline
    turn={turnNode}
    model={graphData}
    onNodeClick={...}
    onWhyClick={...}
    onOpenTranscript={...}
    layout="tree"
    depth="flat"
    detailMode="popover"
  />
  ```
  - Renders `SessionGraph` with `roots={turnSubgraph(turn)}`
  - Collapsed by default, expand on click
  - Part of transcript row, not separate surface

### 15.2 Transcript Affordances

- [ ] **"Why?" button on failed turns** — inline in transcript, opens trace popover
- [ ] **Expand chevron on delegation turns** — reveals subagent subgraph inline
- [ ] **Permalink copy on any message** — copies `#spacegraph:<layout>:<node>`
- [ ] **Subagent pill** — click → opens subagent graph in popover/panel

### 15.3 Progressive Disclosure Levels

| Level | Trigger | Renders |
|---|---|---|
| 0 (collapsed) | Default | Turn summary line |
| 1 (expanded) | Click chevron / "Why?" | `TurnGraphInline` (tree, flat, popover) |
| 2 (drill) | Double-click subagent | `SessionGraph` with `roots={subagent.nodes}` in popover/panel |
| 3 (full) | Ctrl+Shift+M | Full `GraphView` with toolbar, inspector, windows |

---

## Phase 16 — Host Surface Unification (P1)

### 16.1 Single Component, All Surfaces

| Surface | `SessionGraph` Props |
|---|---|
| Transcript inline | `roots={turn.nodes}`, `layout="tree"`, `depth="flat"`, `detailMode="popover"` |
| Turn map overlay | `roots={turn.nodes}`, `layout="tree"`, `depth="flat"`, `detailMode="inline"` |
| Side panel | `roots={allTurns}`, `layout="lanes"`, `depth="orbit"`, `detailMode="panel"` |
| Map tab | `roots={allTurns}`, `layout="lanes"`, `depth="orbit"`, `detailMode="window"` |
| Hybrid | `roots={allTurns}`, `layout="lanes"`, `depth="flat"`, `detailMode="panel"` + transcript |
| Subagent popover | `roots={subagent.nodes}`, `layout="force"`, `depth="layered"`, `detailMode="popover"` |
| Fullscreen dialog | `roots={allTurns}`, `layout="lanes"`, `depth="orbit"`, `detailMode="window"` |

### 16.2 Surface Components as Thin Wrappers

- [ ] `FullMap` → `<SessionGraph roots={allTurns} layout="lanes" depth="orbit" detailMode="panel" ... />` + `GraphToolbar` + `GraphInspectorPanel`
- [ ] `HybridSurface` → `<SessionGraph roots={allTurns} layout="lanes" depth="flat" detailMode="panel" />` + transcript + `GraphToolbarViewControls`
- [ ] `TurnMapLayer` → `<SessionGraph roots={turn.nodes} layout="tree" depth="flat" detailMode="inline" />` in dialog
- [ ] `SpacegraphPanel` → same as `FullMap` but in side panel region

### 16.3 Remove Duplication

- [ ] Delete `TurnMapBody` (replaced by `SessionGraph` with `detailMode="inline"`)
- [ ] Delete `MapDialog`/`TurnMapDialog` (replaced by `SessionGraph` in dialog wrapper)
- [ ] Consolidate `GraphView` → `SessionGraph` + host chrome

---

## Phase 17 — Configuration & Persistence (P1)

### 17.1 User Preferences (per-session, per-surface)

- [ ] **Settings store:** `spacegraph.preferences.{surface}.{layout,depth,detailMode,level}`
- [ ] **Surface detection:** auto-apply preference when `SessionGraph` mounts in known surface
- [ ] **Override props:** explicit props always win over stored preferences

### 17.2 Keyboard Shortcuts (configurable)

- [ ] Map each shortcut to `SessionGraph` action (not surface-specific)
- [ ] `mod+shift+m` → `openSurface("map")` (host decides which surface)
- [ ] `mod+t` → `toggleTurnMap()` on current turn
- [ ] `mod+shift+h` → `openSurface("hybrid")`

---

## Phase 18 — Experiments & Validation (P1)

### 18.1 Enable/Disable Flags (for gradual rollout)

| Flag | Default | Controls |
|---|---|---|
| `spacegraph.inlineTurnGraph` | `true` | Inline expand in transcript |
| `spacegraph.whyButton` | `true` | "Why?" on failed turns |
| `spacegraph.subagentPill` | `true` | Subagent navigation in transcript |
| `spacegraph.htmlNodeBridge` | `false` | Solid component in nodes |
| `spacegraph.unifiedComponent` | `true` | Use `SessionGraph` everywhere |

### 18.2 Telemetry (local, opt-in)

- [ ] Track which surfaces users open, how long, what interactions
- [ ] Track inline expand rate vs. full map open rate
- [ ] Track "Why?" usage vs. transcript scrolling

### 18.3 A/B Test Surfaces

- [ ] Cohort A: transcript + inline only (no full map)
- [ ] Cohort B: full map default, inline available
- [ ] Cohort C: hybrid default
- [ ] Measure: task success, time, preference

---

## Phase 19 — Documentation & Migration (P2)

### 19.1 Component Docs (TypeDoc)

- [ ] `SessionGraph` — all props with examples
- [ ] Host surface composition guide
- [ ] HTMLNode Solid bridge guide

### 19.2 Migration Path

- [ ] Feature flags gate new behavior
- [ ] Old surfaces work unchanged during transition
- [ ] Remove flags after validation

---

## Verification Matrix

| Phase | Command |
|---|---|
| 14.1 | `cd packages/session-graph && bun test src && bun run test:components` |
| 14.2 | `cd packages/gui-plugins && bun test src` (new HTMLNode bridge tests) |
| 15 | `cd packages/app && bun x playwright test --config playwright.components.config.ts plugin-graph` |
| 16 | All existing component tests pass; `FullMap`, `HybridSurface`, `TurnMapLayer` render identically |
| 17 | Preferences persist across reloads, per-surface |
| 18 | Flags toggle behavior without reload |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `SessionGraph` too large / complex | Extract sub-components (`SessionGraphCanvas`, `SessionGraphPopover`, `SessionGraphA11y`); keep `SessionGraph` as composition root |
| Breaking existing surfaces | Compose `GraphView` from `SessionGraph` + chrome; all props pass through; component tests catch regressions |
| HTMLNode Solid bridge leaks | Strict mount/unmount in `onCleanup`; test with rapid node add/remove |
| Preference conflicts (per-surface vs global) | Explicit props > surface prefs > global prefs > defaults |
| Performance (many inline graphs) | Virtualize transcript rows; lazy-mount `SessionGraph` on expand; reuse renderer instance where possible |
| Overcomplicating for users | Progressive disclosure: default shows only transcript; power features behind expand/shortcuts |

---

## Dependencies

- `spacegraphjs` HTMLNode already supports custom HTML — need Solid mount bridge only
- `@opencode/session-ui/graph` selectors (`turnSubgraph`, `subagentSubgraph`) already exist
- `session-graph` hooks (`useGraphViewport`, `useGraphSelection`, `useGraphAnnotations`, `useSpatialMemory`) are reusable
- Plugin SDK surfaces (`SessionSurface`, `Panel`, `Dialog`) unchanged

---

## Revision Log

- **r0 (2026-11-09):** Initial draft based on code inventory and paradigm discussion. Supersedes video-focused TODO.33 Phase 13; this is the code foundation that makes the video meaningful.