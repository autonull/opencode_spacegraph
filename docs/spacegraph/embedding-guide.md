# SpaceGraph Embedding Guide

This guide documents the three embedding tiers, interactive control rules, and the HTML trust boundary for embedding SpaceGraph in host applications.

---

## Embedding Tiers

| Tier | Description | Use Case | Component |
|------|-------------|----------|-----------|
| **Tier 1** | Static SVG preview | Transcript inline, turn map, share cards | `TurnMapInlineGraph`, `GraphPreview` |
| **Tier 2** | Interactive `SessionGraph` with host chrome | Panel, dialog, full map, hybrid | `SessionGraph` (`chrome={false}`) |
| **Tier 3** | Live framework nodes in renderer | Fractal widgets, live subgraphs | *Requires library proposal: `RenderNode.element`* |

---

## Tier 1: Static SVG Preview

**Components:**
- `TurnMapInlineGraph` — turn-scoped subgraph as static SVG
- `GraphPreview` — session overview as labelled `role="img"`

**Characteristics:**
- No WebGL, no renderer mount, no a11y mirror
- Single `aria-label` + `aria-description` (node/edge/failure counts)
- Renders in < 5 ms for 500 nodes
- Used by: transcript inline graphs, turn map dialog, share permalink cards

**Props (TurnMapInlineGraph):**
```tsx
interface TurnMapInlineGraphProps {
  model: GraphViewData           // projected model (turn subgraph)
  width: number                  // container width
  height: number                 // container height
  level?: ZoomLevel              // overview | detail | execution
  layout?: Layout                // force | grid | circular | ...
  depth?: DepthMode              // flat | layered | depth-stack | orbit
  projection?: Projection        // 2D | 3D | AR
  highlight?: string             // node ID to emphasize
  showFailures?: boolean         // render failure badges
}
```

**Host responsibilities:**
- Provide projected model (via `buildTurnMap` / `buildSubagentMap`)
- No event handlers needed (static)
- Set explicit width/height to prevent layout shift

---

## Tier 2: Interactive SessionGraph (Host Chrome)

**Component:** `SessionGraph` with `chrome={false}`, `shell="bare"`

**Characteristics:**
- Full WebGL renderer, a11y mirror, keyboard navigation
- Host provides all chrome: toolbar, inspector, status, windows, file rail
- Host controls: `level`, `layout`, `depth`, `projection`, `density`, `selection`
- Host persists: spatial memory, windows, collapsed groups, notes, pins
- Drill depth limited by `maxDrillDepth` (default 3)

**Required host wiring:**

```tsx
// 1. GraphViewContext provides bus/router for multi-graph isolation
<GraphViewProvider>
  // 2. SessionGraph with controlled props
  <SessionGraph
    model={graphModel}
    level={level}
    setLevel={setLevel}
    layout={layout}
    onLayoutChange={setLayout}
    depth={depth}
    onDepthChange={setDepth}
    projection={projection}
    onProjectionChange={setProjection}
    density={density}
    selection={selection}
    onSelect={setSelection}
    surfaceLabel="Session map"
    chrome={false}
    shell="bare"
    spatialMemoryOwner={isPrimarySurface}
    windows={windows}
    onWindowsChange={setWindows}
    explicitlyCollapsedGroups={collapsedGroups}
    onExplicitlyCollapsedGroupsChange={setCollapsedGroups}
    notes={notes}
    onNotesChange={setNotes}
    pins={pins}
    onPinsChange={setPins}
    maxDrillDepth={3}
    // Feature flags
    enableCostLens={flags.graph_cost_lens}
    palette={paletteSources}
    onPaletteAction={runPaletteAction}
    // Custom renderers
    renderNodeWidget={renderWidget}
    renderNodeHTML={renderHTML}
    diffSource={loadDiff}
    renderSummary={renderMarkdown}
    // Trace
    traceKind={traceKind}
    onTraceKindChange={setTraceKind}
    // Navigation
    onOpenSession={openSession}
    onOpenTranscript={openTranscript}
    onTurnMap={openTurnMap}
    onOpenWindow={openWindow}
    onActionNavigate={navigate}
    // ...
  />

  // 3. Host chrome (composed separately)
  <GraphToolbar
    level={level}
    onLevelChange={setLevel}
    layout={layout}
    onLayoutChange={setLayout}
    depth={depth}
    onDepthChange={setDepth}
    // ...
  />
  <GraphInspector
    model={graphModel}
    selectedNode={selection}
    onSelect={setSelection}
    // ...
  />
  <GraphWindowManager
    windows={windows}
    onWindowsChange={setWindows}
    onOpenWindow={openWindow}
    // ...
  />
  <GraphFileRail
    model={graphModel}
    files={filesMode}
    onFilesChange={setFilesMode}
    // ...
  />
</GraphViewProvider>
```

**Host must provide:**
- `GraphViewProvider` — isolates instance state (bus, router, a11y IDs)
- All controlled props + callbacks (see [Composition Guide](composition-guide.md))
- Chrome components (toolbar, inspector, status, windows, file rail)
- Feature flags from config (`ctx.flags.enabled(...)`)

**Host may customize:**
- `renderNodeWidget` — interactive widgets (todo, diff, terminal)
- `renderNodeHTML` — sanitized HTML in card (trust boundary, see below)
- `renderSummary` — custom node summary (e.g., Markdown)
- `chromeRenderer` — custom chrome when `chrome={true}`
- `rendererOverrides` — replace adapter factory (tests/stories)

---

## Tier 3: Live Framework Nodes (Library Proposal)

**Status:** Proposed, not implemented. Requires `RenderNode.element` in SpaceGraphJS.

**Use cases:**
- Fractal node: live subgraph inside a node card
- Live terminal widget with streaming output
- Model picker with live search
- Any widget needing focus management inside the canvas

**Current workaround (Tier 2):**
- `NodeWidgetLayer` overlays Solid components anchored to node screen positions
- Widgets carry `data-sg-interactive` to prevent canvas drag
- `z-index: 10` keeps widgets above canvas
- Works for: todo, diff, terminal snapshot, composer widget

**Library proposal (recorded in `library-delta.md`):**
```ts
// In RenderNode (SpaceGraphJS)
interface RenderNode {
  html?: string;
  element?: HTMLElement; // NEW: if present, renderer mounts it instead of html
}

// In DOMNode (renderer contract)
interface DOMNodeData {
  element?: HTMLElement; // passed through from RenderNode.element
}
```

---

## Interactive Control Rules

| Control | Tier 1 | Tier 2 | Tier 3 |
|---------|--------|--------|--------|
| Pan/zoom | ❌ | ✅ (keyboard + mouse) | ✅ |
| Node selection | ❌ | ✅ (click, arrow keys) | ✅ |
| Group collapse | ❌ | ✅ (chevron, `onExplicitlyCollapsedGroupsChange`) | ✅ |
| Trace overlays | ❌ | ✅ (Why, Led-here, Related, Downstream) | ✅ |
| Node widgets | ❌ | ✅ (via `renderNodeWidget`) | ✅ (native) |
| HTML in card | ❌ | ✅ (via `renderNodeHTML`, sanitized) | ✅ |
| Camera API | ❌ | ✅ (`onRenderer` → `renderer.camera`) | ✅ |
| Palette (`/`) | ❌ | ✅ (`graph_palette` flag) | ✅ |
| Search | ❌ | ✅ (`GraphSearch`, NLQ) | ✅ |

---

## HTML Trust Boundary

**Rule:** `renderNodeHTML` output is sanitized by the host before rendering.

**Host must:**
1. Use `DOMPurify` (or equivalent) with a strict allowlist
2. Allow only: `b`, `i`, `em`, `strong`, `code`, `pre`, `span`, `div`, `a[href]`, `br`
3. Strip all event handlers (`onclick`, `onload`, etc.)
4. Strip `style` attributes (use CSS classes instead)
5. Validate `href` on links (allow `https:`, `mailto:`, `#anchor`)

**Default allowlist (host implementation):**
```ts
const sanitize = (html: string) => DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "code", "pre", "span", "div", "a", "br"],
  ALLOWED_ATTR: ["href", "class", "data-*"],
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
  FORBID_ATTR: ["style", "on*"],
});
```

**Graph component renders:**
```tsx
<div
  class="sg-node-html"
  data-slot="graph-node-html"
  dangerouslySetInnerHTML={{ __html: sanitize(html) }}
/>
```

**Never:**
- Pass unsanitized HTML to `renderNodeHTML`
- Allow `javascript:` or `data:` URLs
- Allow `<script>`, `<style>`, or event handlers

---

## Verification Checklist

- [ ] Tier 1: Static preview renders in < 5 ms (500 nodes)
- [ ] Tier 2: Two `SessionGraph` instances share no state
- [ ] Tier 2: Host controls all view props via callbacks
- [ ] Tier 2: Spatial memory owned by primary surface only
- [ ] Tier 2: Drill depth limited to 3
- [ ] Tier 2: `renderNodeHTML` output is sanitized
- [ ] Tier 2: `NodeWidgetLayer` widgets have `data-sg-interactive`
- [ ] Tier 2: `GraphA11y` uses instance-scoped IDs
- [ ] Tier 3: Not implemented — tracked in `library-delta.md`

---

## Related Documents

- [Composition Guide](composition-guide.md) — surface table, lens table, prop categories
- [Library Delta](library-delta.md) — SDK and library proposals
- [Layouts & Renderers](layouts-renderers.md) — renderer budgets and parked strategies