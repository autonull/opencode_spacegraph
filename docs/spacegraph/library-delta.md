# SpaceGraph Library Delta — SDK and Library Proposals

This document tracks every SDK and library proposal from the SpaceGraph v34 plan (§F). Each proposal includes rationale, status, and the OpenCode feature that needs it.

---

## SDK Proposals (`packages/plugin/src/gui`)

### 1. `SessionLayer` on the `transcript` surface

**Rationale:** Allow plugins to overlay a mini-map on the transcript without owning rows. The host transcript is opaque (G26, G27) and has no row slot. A `SessionLayer` contribution on the `transcript` surface lets a plugin render a static SVG preview or interactive affordance per turn without replacing the transcript.

**Status:** Proposed, not implemented.

**Needed for:** Phase 16.5 — Graph affordances in the host transcript (C1 inline preview, C2 Why, C3 Drill, C6 Share). The own-rows surface shipped first; this layer remains the lower-cost path for a host-owned transcript.

**API sketch:**
```ts
ctx.add(SessionLayer, {
  surface: "transcript",
  order: 10,
  render: ({ session, turn, rowElement }) => {
    // rowElement is the transcript row DOM node; overlay a chip or SVG
    return <TurnAffordanceChips turn={turn} />;
  },
});
```

**Flag:** `graph_transcript_layer` (new, off by default).

---

### 2. Experimental `session.turn` slot

**Rationale:** If the own-rows `GraphTranscriptSurface` proves too costly (virtualization, scroll performance), a strict no-layout slot on the host transcript's turn row is the fallback. Contract: the slot receives `{ turn, model }` and must not measure or lay out the row — only render inline chips or a static preview.

**Status:** Proposed, not implemented. Only build if `GraphTranscriptSurface` fails performance budget.

**Needed for:** Phase 16.5 — fallback for C1/C2/C3 affordances.

**API sketch:**
```ts
ctx.add(Slot, {
  at: "session.turn",
  render: ({ turn, model }) => <TurnGraphChips turn={turn} model={model} />,
});
```

---

### 3. `ctx.ui.Popover` — controlled open, anchor rect, placement

**Rationale:** The graph needs anchored popovers for node detail (Why, Expand, Subagent drill), share permalink, and the composer widget. Today only `ComposerQuoteAnchor` exists (G29). A generic popover primitive lets plugins and the graph surface build consistent anchored overlays.

**Status:** Proposed, not implemented.

**Needed for:** Phase 16.2 (GraphTranscriptSurface affordances), Phase 16.4 (Subagent drill popover), Phase 15.1 (NodeWidgetLayer popover fallback).

**API sketch:**
```ts
ctx.ui.Popover({
  open: true,
  anchorRect: { left: 100, top: 200, width: 20, height: 20 },
  placement: "right-start",
  onClose: () => setOpen(false),
  children: <GraphPopoverContent node={node} />,
});
```

---

### 4. Persist `Surfaces.selected` per session; resolve unknown ids

**Rationale:** Surface selection is not persisted (G28). `current()` returns raw ids; `select()` accepts unknown ids. The plugin works around this with a per-session store (Phase 17.3), but the SDK should expose this generically so any plugin can persist the user's chosen surface.

**Status:** Partially shipped: `Surfaces.current(session)` and `Surfaces.select(id, session)` exist and resolve the host transcript. Persistence across restarts remains plugin-side.

**Needed for:** Phase 17.3 — shared surface persistence across all plugins.

**API sketch:**
```ts
// In SurfaceContext or Layout
selected: Accessor<string>;           // current surface id, falls back to "transcript"
select: (id: string) => void;         // validates id, falls back to "transcript" if unknown
onSurfaceChange: (id: string) => void; // fires after validation
```

---

### 5. `SessionSurface` metadata: `enabled?`, `default?`, `enter?`, `focus?`

**Rationale:** Current surface metadata is minimal (`id`, `title`, `icon`, `order`). The graph needs:
- `enabled?: boolean | (() => boolean)` — flag-gated surfaces (e.g., `graph_palette`)
- `default?: boolean` — which surface is default for new sessions
- `enter?: (session) => void` — setup when surface becomes active (e.g., restore camera)
- `focus?: (session) => void` — called when surface gains focus (e.g., sync selection)

**Status:** Proposed, not implemented.

**Needed for:** Phase 18 — flag-gated surfaces, lens defaults, surface lifecycle hooks.

**API sketch:**
```ts
ctx.add(SessionSurface, {
  id: "spacegraph.map",
  title: ctx.t("surface.map"),
  enabled: () => ctx.flags.enabled("graph_palette"),
  default: () => ctx.flags.enabled("graph_palette") && prefs.lens === "navigator",
  enter: (session) => model.restoreSurface(session),
  focus: (session) => model.syncSelection(session),
  render: ({ session }) => <MapSurface ... />,
});
```

---

### 6. `StorageScope` `{ session, surface }`

**Rationale:** Today scope is `global`, `{server, directory?}`, or `{session}` (G32). The graph needs per-surface preferences (density, layout, collapsed groups) that are scoped to the surface within a session. A `surface` scope lets plugins store `{ [surfaceId]: ViewState }` without manual key management.

**Status:** Proposed, not implemented.

**Needed for:** Phase 18 — per-surface preference persistence.

**API sketch:**
```ts
const prefs = ctx.storage.session({ scope: "surface" }); // auto-keys by active surface
// or
const prefs = ctx.storage.session({ scope: { session: true, surface: "spacegraph.map" } });
```

---

### 7. `OpenOptions.pane` (`side | split | bottom`)

**Rationale:** `Panel.region` is only `"side"` (G33). The graph needs:
- `side` — current side panel
- `split` — hybrid transcript + map (split view)
- `bottom` — bottom drawer (mobile, or compact map)

**Status:** Proposed, not implemented.

**Needed for:** Phase 17.1 — `HybridSurface` as a split pane, mobile map drawer.

**API sketch:**
```ts
ctx.layout.open("spacegraph:map", session, { pane: "split" });
ctx.layout.open("spacegraph:map", session, { pane: "bottom" });
```

---

### 8. Generic `ctx.mount(component, element)` for widget layers

**Rationale:** `NodeWidgetLayer` (Phase 15.1) renders Solid components in an absolutely positioned overlay anchored to canvas nodes. If `bindPlugin` cannot express this (widgets are not plugin surfaces, they're host-only), a generic mount primitive is needed. Only build if Tier 1 overlay proves insufficient.

**Status:** Proposed, not implemented. Tier 1 (`NodeWidgetLayer`) works for ComposerNodeWidget.

**Needed for:** Phase 15.4 (Fractal node widget), Phase 19.9 (Widgets breadth) — if Tier 1 fails.

**API sketch:**
```ts
ctx.mount(<ComposerNodeWidget />, containerElement, { cleanup: () => {} });
```

### Minimal diffs for the open SDK proposals

These are the smallest API edits that unblock the graph without widening the host surface beyond
what a shipped surface needs. Each diff ships with its TSDoc and a guide update in the same change;
none is applied until a second consumer proves it. Host implementation follows the type in the same
change, so no field lands as a declaration only.

**4. Validate and persist surface selection**

```diff
+/** The selected surface, restored from storage; unknown ids fall back to `transcript`. */
+selected(session: SessionRef): string
+/** Selects a surface; an unknown id is stored but reads as `transcript`. */
+select(id: string, session: SessionRef): void
```

**5. Surface metadata and lifecycle**

```diff
 export interface SessionSurface {
   readonly id: string
   readonly title: string
   readonly icon?: IconName
   readonly order?: number
+  /** When false, the surface is hidden from the picker and reads as `transcript`. */
+  readonly enabled?: boolean | (() => boolean)
+  /** The surface a new session enters first; the host keeps `transcript` when none is enabled. */
+  readonly default?: boolean | (() => boolean)
+  /** Runs when the surface becomes selected, after it mounts. */
+  enter?(input: { readonly session: MountedSession }): void
+  /** Runs when the graph or transcript surface gains keyboard focus. */
+  focus?(input: { readonly session: MountedSession }): void
   render(input: { ... }): JSX.Element
 }
```

**6. Surface-scoped storage**

```diff
 export type StorageScope =
   | "global"
   | { readonly server: string; readonly directory?: string }
+  | { readonly session: SessionRef; readonly surface: string }
   | { readonly session: SessionRef }
```

Practical key: `plugin.<id>.<key>.<session-key>.<surface>`. A `surface` store follows the same
location wait and prune rules as a `session` store.

**7. Panel placement**

```diff
 export interface OpenOptions {
   readonly tab?: "open" | "preview" | "append" | "select"
   readonly background?: boolean
+  /** Where the tab lands: the side region, a transcript split, or the bottom pane. */
+  readonly pane?: "side" | "split" | "bottom"
 }
```

**8. Widget mount**

```diff
+interface MountOptions {
+  /** Runs when the host removes the container or the plugin unloads. */
+  readonly cleanup?: () => void
+}
+/** Mounts a component into a host-owned element; the host owns the element's lifetime. */
+mount(component: () => JSX.Element, element: HTMLElement, options?: MountOptions): () => void
```

---

## Library Proposals (`spacegraphjs`)

### 1. `RenderNode.element?: HTMLElement` → `DOMNode` (live framework nodes)

**Rationale:** `RenderNode.html` only accepts string markup; `HtmlNode` rewrites `innerHTML`. Live framework mounting (Solid, React) is impossible through the renderer contract. `DOMNode` accepts `data.element` but is not reachable via the adapter. This is Tier 3 embedding (Phase 15.5).

**Status:** Proposed, not implemented (recorded 2026-11-11). Tier 1 (`NodeWidgetLayer` overlay) works for current widgets.

**Needed for:** Phase 15.4 (Fractal node with live subgraph), Phase 19.9 (Terminal snapshot, model picker widgets needing focus management).

**API sketch:**
```ts
// In RenderNode
element?: HTMLElement; // if present, renderer mounts it instead of html

// In DOMNode (renderer contract)
data?: { element?: HTMLElement }; // passed through from RenderNode.element
```

---

### 2. Optional per-instance DOM id prefix

**Rationale:** Multiple renderers per page are supported (G25), but DOM ids use `node-html-${id}`. Two graphs with the same node ids collide. An optional prefix per renderer instance (`spacegraph-1-`, `spacegraph-2-`) avoids collisions.

**Status:** Proposed, not implemented (recorded 2026-11-11). Instance context isolates state; DOM ids can still collide.

**Needed for:** Phase 14 — multiple `SessionGraph` instances on one page (already isolated via instance context, but DOM ids leak).

**API sketch:**
```ts
// Adapter mount options
interface AdapterMountOptions {
  domIdPrefix?: string; // e.g., "sg1-"
}
```

---

### 3. Depth treatment overrides (fog, tilt)

**Rationale:** Depth treatment is a static table (fog density, camera tilt per `DepthMode`). Some surfaces need custom depth (e.g., inline preview with subtle tilt, subagent drill with no fog). Optional per-mode overrides let hosts tune depth without forking the renderer.

**Status:** Proposed, not implemented.

**Needed for:** Phase 16.1 (Inline preview depth), Phase 16.4 (Subagent drill depth), Phase 19.12 (Layout breadth).

**API sketch:**
```ts
interface DepthTreatmentOverrides {
  fog?: Record<DepthMode, { density: number; color?: string }>;
  tilt?: Record<DepthMode, number>; // degrees
}
```

---

### 4. Edge hover parity in the SpaceGraph adapter

**Rationale:** SpaceGraph adapter emits `hoverChange` for nodes but not for edges. The graph needs edge hover for trace overlays (Why, Led-here) and edge peeks.

**Status:** Proposed, not implemented.

**Needed for:** Phase 19.1 (Investigation — trace breadcrumbs), Phase 19.2 (Review — compare).

**API sketch:**
```ts
// In renderer contract RendererEventMap
edgeHover: { id: string }; // add to existing hoverChange or new event
```

---

### 5. Group-toggle contract event

**Rationale:** Group collapse/expand is DOM markup only (chevron click). The host needs a typed event to update its collapsed groups store and announce to a11y.

**Status:** Proposed, not implemented. Currently handled via `onGroupToggle` in GraphCanvas (DOM click on `[data-group-toggle]`).

**Needed for:** Phase 17.2 (Shared collapsed groups across surfaces), Phase 21 (A11y — announce group state change).

**API sketch:**
```ts
// In renderer contract RendererEventMap
groupToggle: { id: string; expanded: boolean };
```

---

### 6. Adapter mount options: `reducedMotion`, `plugins`, `chrome`

**Rationale:** Adapter mount currently takes only `theme` and `projection`. The graph needs to pass:
- `reducedMotion` — disable camera animations on mount/lens change
- `plugins` — optional renderer plugins (e.g., edge bundling, minimap)
- `chrome` — whether renderer should draw its own chrome (toolbar, minimap) vs host chrome

**Status:** Proposed, not implemented.

**Needed for:** Phase 16.1 (Inline preview `reducedMotion`), Phase 18.3 (Flag-gated chrome), Phase 19.12 (Renderer strategy).

**API sketch:**
```ts
interface AdapterMountOptions {
  theme: RenderTheme;
  projection: Projection;
  reducedMotion?: boolean;
  plugins?: RendererPlugin[];
  chrome?: boolean;
}
```

---

### 7. Real `turn-map` functions (or document the injection requirement)

**Rationale:** `TurnMapInlineGraph` and `TurnMapOverlay` need `turnSubgraph` and `subagentSubgraph` from the session model. These are currently imported from `@opencode/session-ui/graph`. The library should either export real `turn-map` functions or document the injection requirement for hosts not using the session-ui graph.

**Status:** Proposed, not implemented. Currently works via session-ui import.

**Needed for:** Phase 15.3 (Composer widget), Phase 16.1 (Inline preview), standalone SpaceGraphJS usage.

**API sketch:**
```ts
// In spacegraphjs or adapter
export function buildTurnMap(model: GraphViewData, turnId: string, options?: { limit?: number }): RenderModel;
export function buildSubagentMap(model: GraphViewData, subagentId: string, options?: { limit?: number }): RenderModel;
```

---

## Tracking Table

| Proposal | Area | Phase | Status | Rationale | Feature Mapping | Blocker |
|----------|------|-------|--------|-----------|-----------------|---------|
| SessionLayer on transcript | SDK | 16.5 | Proposed | Host transcript is opaque; plugin needs to overlay affordances per turn without owning rows | Graph transcript surface affordances (Why, Expand, Drill, Share) | — |
| session.turn slot | SDK | 16.5 | Proposed | Fallback if GraphTranscriptSurface virtualization fails performance budget | Fallback for C1/C2/C3 affordances | Only if own-rows fails |
| ctx.ui.Popover | SDK | 16.2, 16.4 | Proposed | Generic anchored popover primitive for node detail, share, composer widget | Node detail popover, subagent drill popover, share permalink, composer widget | — |
| Persist Surfaces.selected | SDK | 17.3 | Plugin workaround | Surface selection not persisted generically; plugin uses per-session store | Shared surface persistence across plugins | — |
| SessionSurface metadata | SDK | 18 | Proposed | Need enabled/default/enter/focus hooks for flag-gated surfaces and lifecycle | Flag-gated surfaces, lens defaults, surface lifecycle hooks | — |
| StorageScope {session, surface} | SDK | 18 | Proposed | Per-surface preferences (density, layout, collapsed groups) scoped to surface within session | Per-surface preference persistence | — |
| OpenOptions.pane | SDK | 17.1 | Proposed | Panel.region only supports "side"; need split (hybrid) and bottom (mobile) | HybridSurface as split pane, mobile map drawer | — |
| ctx.mount for widgets | SDK | 15.4, 19.9 | Proposed | Generic mount primitive if Tier 1 overlay (NodeWidgetLayer) proves insufficient | Fractal node widget, widgets needing focus management | Only if Tier 1 fails |
| RenderNode.element → DOMNode | Library | 15.5 | Proposed | Live framework mounting (Solid, React) impossible through renderer contract | Fractal node with live subgraph, terminal snapshot, model picker widgets | Only if Tier 1 fails |
| Per-instance DOM id prefix | Library | 14 | Proposed | Multiple renderers per page supported but DOM ids collide (node-html-${id}) | Multiple SessionGraph instances on one page | — |
| Depth treatment overrides | Library | 16.1, 16.4 | Proposed | Static depth table; surfaces need custom fog/tilt without forking renderer | Inline preview depth, subagent drill depth, layout breadth | — |
| Edge hover parity | Library | 19.1, 19.2 | Proposed | SpaceGraph adapter emits hoverChange for nodes only; need edge hover for trace overlays | Investigation (trace breadcrumbs), Review (compare) | — |
| Group-toggle contract event | Library | 17.2, 21 | Proposed | Group collapse/expand is DOM markup only; host needs typed event for store + a11y | Shared collapsed groups across surfaces, a11y group state announcement | — |
| Adapter mount options | Library | 16.1, 18.3 | Proposed | Adapter mount takes only theme/projection; need reducedMotion, plugins, chrome | Inline preview reducedMotion, flag-gated chrome, renderer strategy | — |
| Real turn-map functions | Library | 15.3, 16.1 | Proposed | TurnMapInlineGraph/Overlay import from session-ui; library should export or document injection | Composer widget, inline preview, standalone SpaceGraphJS usage | — |

---

## Graduation Criteria

Each proposal graduates when:
1. A real feature needs it (not speculative)
2. Implementation is complete and tested
3. TSDoc and guide updated in the same change
4. No orphan flag or config remains

Proposals that are not needed by Phase 23 are marked "Park" with rationale.

---

## Feature-to-Proposal Mapping

| Feature | SDK Proposals Needed | Library Proposals Needed | Status |
|---------|---------------------|-------------------------|--------|
| Graph transcript surface (own rows) | — | — | Shipped (M5.1) |
| Graph transcript affordances (chips) | SessionLayer or session.turn slot | — | Shipped via own rows |
| Node detail popover (Why, Expand, Drill) | ctx.ui.Popover | — | Tier 2: GraphPopover |
| Share permalink popover | ctx.ui.Popover | — | Tier 2: GraphPopover |
| Composer widget in node | ctx.ui.Popover, ctx.mount | RenderNode.element | Tier 2: NodeWidgetLayer |
| Subagent drill popover | ctx.ui.Popover | — | Tier 2: GraphPopover |
| Multiple graph surfaces with synced state | Persist Surfaces.selected, StorageScope {session, surface} | Per-instance DOM id prefix | Shipped (M2.2, M5.1) |
| Flag-gated surfaces | SessionSurface metadata | — | Plugin workaround |
| Per-surface preferences | StorageScope {session, surface} | — | Plugin store |
| Hybrid as split pane | OpenOptions.pane | — | Shipped via arrangement prop |
| Mobile map drawer | OpenOptions.pane | — | Not built |
| Inline preview depth | — | Depth treatment overrides | Not built |
| Subagent drill depth | — | Depth treatment overrides | Not built |
| Trace overlays (Why, Led-here) | — | Edge hover parity | Shipped via node hover |
| Review compare overlay | — | Edge hover parity | Parked |
| Shared collapsed groups | — | Group-toggle contract event | Shipped via useGroupCollapse |
| Flag-gated chrome | — | Adapter mount options | Not built |
| Renderer strategy (SVG/SpaceGraph/Cytoscape) | — | Adapter mount options | Contract recorded |
| Turn map in composer widget | — | Real turn-map functions | Shipped via session-ui import |
| Inline turn map (static SVG) | — | Real turn-map functions | Shipped via TurnMapInlineGraph |
| Fractal node (live subgraph) | ctx.mount | RenderNode.element | Parked (Tier 3) |
| Live terminal widget | ctx.mount | RenderNode.element | Parked (Tier 3) |