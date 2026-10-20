# SpaceGraph Architecture Decision Records (ADRs)

Each record documents a significant architectural decision, its context, and its consequences. These are the "why" behind the code.

---

## ADR-001: Transcript remains baseline; graph is opt-in

**Date:** 2026-10-19
**Status:** Accepted

**Context:** The transcript is the dependable, familiar interface. Any graph must not break existing workflows.

**Decision:** The graph is an alternate, opt-in representation built entirely from existing session data. No protocol, server, or session-schema changes. The transcript keeps working if the graph package fails to load.

**Consequences:**
- Feature flag `experimental.sessionGraph` defaults to `false`
- Lazy loading: graph chunk only loads when user opts in
- No graph semantics in app-core files
- Rollback is flipping one flag

---

## ADR-002: No inferred causality from adjacency

**Date:** 2026-10-19
**Status:** Accepted

**Context:** Adjacent messages in a transcript do not imply causal relationships. Inferring edges from adjacency creates false confidence.

**Decision:** Edge confidence is always explicit: `explicit` (direct protocol relationship), `structural` (hierarchy/sequence from model), or `inferred` (never emitted from adjacency). The UI labels the difference.

**Consequences:**
- `inferred-cause` edge kind exists but is never auto-generated
- Users see confidence badges on every edge
- Model tests verify no adjacency-based inference

---

## ADR-003: Library core never imports contract or host

**Date:** 2026-10-19
**Status:** Accepted

**Context:** SpaceGraphJS must be reusable outside OpenCode. Coupling the core to the renderer contract or OpenCode vocabulary prevents second-host adoption.

**Decision:** Generic capabilities (layout, levels, zoom bands, a11y, navigation, control, builder) live in `spacegraphjs` core with minimal structural types. The core never imports `@spacegraphjs/renderer`, `@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`, or `cytoscape`. Only the SpaceGraph adapter imports both core and contract.

**Consequences:**
- `test/boundaries.test.ts` enforces no core→contract/Cytoscape imports
- Hosts provide config (lane list, node shape, etc.) to generic primitives
- OpenCode is a thin vocabulary layer over generic library primitives

---

## ADR-004: Stable IDs and append-only positions

**Date:** 2026-10-19
**Status:** Accepted

**Context:** Streaming updates must not disrupt user orientation. Re-layout on every message destroys spatial memory.

**Decision:** Stable IDs produce stable positions and stable selection across streaming updates. Streaming text appends nodes; it never rebuilds the graph or re-lays-out existing nodes. Positions depend only on model order.

**Consequences:**
- Layout algorithms are deterministic and append-only
- `LaneLayout` reserves group X span before items arrive
- Selection persists by ID, not index
- No physics, no force-directed layout

---

## ADR-005: Capability differences declared, not silently dropped

**Date:** 2026-10-19
**Status:** Accepted

**Context:** The SpaceGraph adapter supports 2D + 3D; Cytoscape is 2D only. Hiding this difference confuses users and breaks trust.

**Decision:** Differences are capability flags surfaced by the toolbar. No `if (renderer === "cytoscape")` branches in host code. The toolbar disables 3D with an explanation under Cytoscape.

**Consequences:**
- `RendererCapabilities` contract declares `projections`, `depths`, `domNodes`, `edgeLabels`, `minimap`
- Host UI reads capabilities and adapts (toolbar, minimap, depth selector)
- Both adapters consume the same `RenderModel` from the same `buildRenderModel`

---

## ADR-006: Renderer owns geometry and camera; host owns semantics and layout

**Date:** 2026-01-19
**Status:** Accepted

**Context:** Mixing camera logic with semantic layout creates tight coupling and makes renderer swaps impossible.

**Decision:** The renderer (adapter) owns: camera, projection, fit, zoom, pan, depth treatment, node/edge rendering, selection events. The host owns: semantic level policy, layout strategy, node/edge data, card markup, band markup, inspector content.

**Consequences:**
- `GraphRenderer` contract: `setModel`, `setTheme`, `setProjection`, `setDepth`, `fit`, `focus`, `setSelection`, `setViewport`
- Host `buildRenderModel` is pure: `GraphModel` + level + positions → `RenderModel`
- Layout strategies (`lanes`, `timeline`, `hierarchy`) are host-owned in `session-ui/graph/layout.ts`
- Depth modes (`flat`, `layered`, `depth-stack`, `orbit`) are renderer-owned via `setDepth`

---

## ADR-007: Semantic zoom levels (overview / execution / detail)

**Date:** 2026-10-19
**Status:** Accepted

**Context:** Users need different detail densities for different tasks. A single fixed density serves no one well.

**Decision:** Three semantic levels with explicit node/edge visibility policies and DOM budgets:
- **Overview:** Session, turn, phase chips, error/retry badges. Budget: 12 DOM cards.
- **Execution:** All activity nodes (tools, files, results, subagents). Budget: 40 DOM cards.
- **Detail:** Adds reasoning, notice, compaction. Budget: 24 DOM cards (cards above budget fall back to dots).

**Consequences:**
- `levels.ts` owns policy: `KIND_MIN_LEVEL`, `EDGE_MIN_LEVEL`, `DOM_BUDGET`, `isClusterExpanded`
- `edgesAtLevel` narrows neighborhood at execution when a node is selected (RF.10)
- Representations `ribbon`/`matrix` are overview-only summaries

---

## ADR-008: Representation seam (graph / ribbon / matrix)

**Date:** 2026-10-19
**Status:** Accepted

**Context:** Different questions need different visual metaphors. Node-link shows relationships; ribbon shows turn rhythm; matrix shows phase dominance.

**Decision:** Three representations, each a pure `model → layout` function. Selection, inspector, search, breadcrumbs, a11y mirror stay unchanged — the representation only relocates the model's own nodes, never invents IDs.

**Consequences:**
- `representation.ts` exports `ribbonLayout`, `matrixLayout` (overview level only)
- Toolbar switches representation; level control hidden for summaries
- `GraphView` passes `axisLabels` for ribbon/matrix row/column headers
- Representation layout strategies are being extracted to SpaceGraphJS (T4.10)

---

## ADR-009: Depth spectrum (flat / layered / depth-stack / orbit)

**Date:** 2026-10-19
**Status:** Accepted

**Context:** 2D is readable but loses hierarchy depth; 3D orbit is immersive but disorients. A spectrum lets users choose per task.

**Decision:** Four depth modes as a spectrum, not a binary:
- **Flat:** 2D orthographic, all nodes Z=0. Baseline.
- **Layered:** 2.5D — bands at Z=0, cards lifted by `DEPTH[kind]` with fog. Cards stay flat (billboard).
- **Depth-stack:** Perspective — cards at true Z, camera at angle. Fog by absolute distance.
- **Orbit:** Full 3D perspective, free camera rotation.

**Consequences:**
- Contract v2 adds `depths` capability and `setDepth(depth)` method
- SpaceGraph adapter maps to core `setDepth`; Cytoscape declares 3D as no-op
- `billboard: true` on bands prevents shear in depth modes
- Scene-relative fade (`applySceneFade`) mitigates absolute-distance fog over-attenuation

---

## ADR-010: File-first lens (changed-files rail + bundled provenance)

**Date:** 2026-10-19
**Status:** Accepted

**Context:** "Why did this file change?" is a top investigative question. The node-link graph buries files in turn lanes.

**Decision:** A file rail lists changed files with provenance bundled to owning turn (LE.13). Clicking a file selects it in the graph and reveals its turn context.

**Consequences:**
- `GraphFileRail` component in `session-graph/src/ui/GraphFileRail.tsx`
- `bundleEdges` in `buildRenderModel.ts` rebases per-activity edges to turn node
- `fileOwnerTurn` selector finds turn from first incident edge
- File breadcrumbs show Session → turn → file (T1.9)

---

## ADR-011: Hybrid ladder over mode switch

**Date:** 2026-10-19
**Status:** Accepted

**Context:** A hard mode switch (transcript OR graph) loses scroll position and context. Progressive disclosure preserves the reader's place.

**Decision:** Hybrid ladder — three affordances, each a step deeper:
1. **Inline subgraph** (H6.4): Static SVG turn summary in timeline row (deferred, approval-gated)
2. **Turn-map overlay** (H6.2): `mod+alt+t` opens scoped subgraph over transcript, focus-trapped, Escape closes, scroll preserved
3. **Full graph mode**: One click from overlay or header toggle

**Consequences:**
- No `session-timeline-row.tsx` edits
- Overlay mounts in session panel's relative container (`screen.panel.ref`)
- Side panel (`session-map`) shows compact SVG overview with transcript sync
- All off by default; explicit action required

---

## ADR-012: Export as shareable artifact (SVG / JSON / standalone HTML)

**Date:** 2026-10-19
**Status:** Accepted

**Context:** A decision found in the graph should be revisitable or shareable without re-scrolling the transcript.

**Decision:** Export from graph toolbar: SVG (vector, printable), JSON (machine-readable, `serializeRenderModel`), standalone HTML (self-contained with SVG renderer).

**Consequences:**
- `@spacegraphjs/svg-renderer` provides `renderToSVG`, `serializeRenderModel`, `parseRenderModel`
- JSON round-trip enables `GraphController` to reload exported model
- `#graph:<nodeID>` permalinks planned (T3.5)

---

## ADR-013: Contract version negotiation

**Date:** 2026-10-19
**Status:** Accepted

**Context:** Host and adapter must be upgradeable independently. A version mismatch must fail gracefully.

**Decision:** `CONTRACT_VERSION = 2` (depth spectrum). `negotiateContract(hostVersion, adapterVersion)` in `@spacegraphjs/renderer`. Host registry rejects unsupported declared version and falls through.

**Consequences:**
- Adapter declares `capabilities.contractVersion`
- Host can support multiple adapter versions
- Migration path documented for v2→v3 (T6.10: fit insets)

---

## ADR-014: Text direction (RTL) via host bridge

**Date:** 2026-10-19
**Status:** Accepted

**Context:** Graph coordinates are never mirrored (layout is LTR logical). Only text rendering follows direction.

**Decision:** `renderToSVG` emits `direction="rtl"`; both adapters set `dir` on cards; host bridge reads `document.documentElement.dir` and passes in `RenderTheme.direction`.

**Consequences:**
- `spaceGraphTheme` in SpaceGraph adapter wraps host HTML in `<div dir="...">`
- Cytoscape adapter sets `dir` on container
- Coordinates (x/y/z) are never mirrored

---

## ADR-015: Second-host fixture in library demo

**Date:** 2026-10-19
**Status:** Accepted

**Context:** The library must prove it works without OpenCode. A synthetic activity model exercises all three adapters.

**Decision:** `activityHostFixture()` in `spacegraphjs/demo/activity-host.ts` — a small host-neutral model with HTML cards, tool calls, artifact, failure, retry. Used by contract demo and shared conformance suite.

**Consequences:**
- Contract demo (`spacegraphjs/demo/contract.html`) switches between pipeline and host scenes
- Conformance suite tests both adapters against same fixture
- No OpenCode imports in library demo

---

## ADR-016: View controller framework-agnostic

**Date:** 2026-10-19
**Status:** Accepted

**Context:** Selection, trail, zoom bands, search, connections should be reusable across React, Solid, Vue, vanilla.

**Decision:** `GraphController` in `spacegraphjs/control` — minimal structural model, bound to any renderer through `GraphBinding` (mount/update/dispose policy). Framework bindings (`react-spacegraph`, `solid-spacegraph`) wrap `GraphBinding`, not core internals.

**Consequences:**
- OpenCode `GraphView` routes selection/breadcrumbs through `GraphController`
- Search stays host-owned (uses richer tool-input selector)
- Library demo driven by `GraphController`

---

## ADR-017: Named layouts (lanes / timeline / hierarchy)

**Date:** 2026-10-19
**Status:** Accepted

**Context:** Different tasks need different spatial metaphors. One layout cannot serve all.

**Decision:** Three named strategies, all deterministic and append-only:
- **Lanes:** Semantic default — session column, then one column per turn, Y = activity lane (explore/edit/verify/delegate)
- **Timeline:** Chronological left-to-right — each turn a column band, members stacked vertically
- **Hierarchy:** Indented outline — depth as X offset, rows wrap at capped column height

**Consequences:**
- Layout algorithms in `session-ui/graph/layout.ts` (being extracted to SpaceGraphJS T4.8)
- Switching levels may move nodes; streaming never moves existing nodes within same level
- `LaneLayout` in SpaceGraphJS is the generic primitive (configurable nodeSizeFn, laneList, laneOfFn, depthMap...)

---

## ADR-018: DOM cards for activity, vector for structure

**Date:** 2026-10-19
**Status:** Accepted

**Context:** Activity nodes (tools, files, results) need rich, selectable text. Structural nodes (session, turn, phase) are chrome.

**Decision:** `NODE_SHAPE` maps: activity kinds → `card` (DOM, selectable text), structural kinds → `panel`/`badge` (vector, compact). Structural kinds never consume the activity card budget.

**Consequences:**
- SpaceGraph adapter: `HtmlNode` for cards, `ShapeNode` for panels/badges
- Cytoscape adapter: clipped DOM overlay for cards, native nodes for structure
- DOM budget (`DOM_BUDGET`) caps cards per level; overflow → dots

---

## ADR-019: Provenance bundling (file edges to turn spine)

**Date:** 2026-10-19
**Status:** Accepted

**Context:** A file with 10 readers/writers creates 10 crossing wires. The turn already groups the activity.

**Decision:** `bundleEdges` rebases every per-activity edge into a `file` to the owning turn node, deduped by `(sourceTurn, targetFile, kind)`. File connects to short turn spine (one connector per turn) instead of one wire per writer/reader.

**Consequences:**
- Enabled by file-first lens (ADR-010)
- Stable rebased ID: `bundle:${source}:${target}:${kind}` for renderer diffing
- Turn bands + bundled edges = clear provenance without wire salad

---

## ADR-020: Experimental flag justifies feature work

**Date:** 2026-10-19
**Status:** Accepted

**Context:** The flag/settings work (T3.1, T3.2) is only justified by a positive or promising R7.3 result. Polishing a losing surface wastes maintainer time.

**Decision:** Stop rule (T2.5): If T2 shows no advantage, stop feature work, publish the finding, and keep the library. Do not add T3 features before T2's decision.

**Consequences:**
- T3.1–T3.4 complete but gated behind flag
- T3.5 (permalinks), T3.6 (namespacing) deferred
- T3.7 (RFC) waits for T2 result
- Library work (T4) continues independently

---

## Open decisions (to close in T2.4)

| ID | Decision | Options | Evidence needed |
|---|---|---|---|
| #10 | Naming | Graph / Map / Session map | Protocol data + captures |
| #14 | Default representation | graph / ribbon / matrix | Task success by representation |
| #15 | Default depth | flat / layered / depth-stack / orbit | Task success by depth |
| #16 | File lens | On by default / opt-in | Task success with/without |
| #8 | 3D default | Superseded by #15 | — |
| #9 | Screenshot location | `docs/spacegraph/screenshots/` vs elsewhere | — |

---

## Superseded decisions

| ID | Decision | Superseded by | Reason |
|---|---|---|---|
| — | Phase 0 spike as demo | T1.16 retired | Spike was exploratory; contract demo is reference |
| — | Cytoscape as default renderer | ADR-005 | SpaceGraph is only 2D+3D; Cytoscape is fallback |
| — | Inline row host (H6.5) | D1 deferred | Exceeds diff budget; approval-gated |
| — | Host-neutral activity adapter (P8.4) | D2 deferred | No second host needs it yet |
| — | Incremental patches (P8.8) | D3 deferred | Profiling needed first |