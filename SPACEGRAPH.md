# SpaceGraph for OpenCode — Design, Progress & Evidence

> **Status (2026-10-21):** The prototype is built and verified. The hypothesis remains unproven — it requires human evaluation (T2.2). This document is the design argument and architectural record for the **OpenCode integration only**; `docs/spacegraph/prototype.md` is the release write-up; `SPACEGRAPH.TODO.3.md` is the closing plan. The broader SpaceGraphJS platform vision lives in `spacegraphjs/README.vision.md`.

---

## 1. The Big Picture: Why a Graph Changes How Developers Work with Agents

### 1.1 The core problem: linear transcripts hide structure

OpenCode's session model already captures rich structure: messages with typed parts (tool calls, file reads/writes, reasoning, patches, snapshots, subtasks, errors, retries, compactions). But the UI presents this as a chronological log. When a session grows beyond a few dozen turns, developers cannot easily answer:

- **Why** did the agent change this file?
- **Which** tool calls led to this failure?
- **What** did a subagent actually contribute?
- **What** changed after the failing test?
- **Where** did the agent retry, backtrack, or change direction?

In a transcript, answering these requires scrolling, searching, and mentally reconstructing context. A graph makes these relationships **directly navigable**.

### 1.2 The paradigm shift: from reading to exploring

The hypothesis is stronger than "a graph looks better":

> **When agent activity becomes sufficiently complex, spatial navigation through relationships is more effective than linear navigation through messages.**

This gives the project a clear success criterion: measured task performance on investigative questions, not visual appeal.

### 1.3 Usability, ergonomics & fun — why this matters beyond debugging

The investigative use case (answering the five questions) is the measurable entry point. But the deeper opportunity is **changing how developers experience agentic development**:

| Dimension | Transcript UX | Graph UX |
|-----------|---------------|----------|
| **Cognitive load** | Scroll, search, mentally reconstruct context | Relationships visible at a glance; spatial memory replaces recall |
| **Onboarding** | Intimidating terminal log for new users | Approachable visual map; see *how* the agent thinks, not just *what* it did |
| **Orientation** | Lost in long sessions; "where am I?" | Stable spatial layout; minimap + breadcrumbs + zoom = always oriented |
| **Exploration** | Linear, passive reading | Active navigation; follow edges, zoom into detail, compare layouts |
| **Delight** | Functional but utilitarian | "Map of my work" feeling; animations, spatial transitions, layout variety |
| **Collaboration** | Share logs, scroll together | Share decision links (`#graph:node`), export artifacts, annotate together |

**The hybrid is the ergonomic bridge:** the transcript stays familiar; the graph appears where it answers a question. Users don't choose a mode — they choose a *question*, and the graph answers it.

This is not just a better session viewer. It's a step toward making agentic development **accessible to non-experts**, **auditable by teams**, and **enjoyable for everyone**.

### 1.4 What the graph exposes that the transcript hides

| Relationship type | Transcript | Graph |
|-------------------|------------|-------|
| **Sequence** | Implicit in scroll order | Explicit edges, navigable |
| **Causality** | Inferred by reading | `evidence` edges from test failure → fix |
| **Provenance** | Scattered across messages | `reads`/`writes` edges file ↔ tool |
| **Delegation** | Nested in conversation | `delegates` edge turn → subagent |
| **Retry/backtrack** | Buried in sequence | `retry` edge + `interrupted` status |

### 1.5 Semantic zoom, not just a large canvas

A zoomable canvas is the mechanism; reducing cognitive overhead is the objective. Three semantic levels:

| Level | Name | What the user sees |
|-------|------|-------------------|
| 1 | **Overview** | Session goal, major phases, parallel subtasks, failures, outcome |
| 2 | **Execution** | Messages, tool calls, files, error chains, neighboring subtasks |
| 3 | **Detail** | Full output, command, reasoning, diff, test failure, approval |

Nodes **collapse/expand** across levels — a cluster of tool calls becomes "Explore repository" at overview, individual calls at execution, full content at detail. This is progressive disclosure, not hiding behind accordions.

### 1.6 Dual representation, not replacement

The transcript remains ideal for following a conversation. The graph excels at exploring structure, parallel activity, and provenance. The strongest product is a **hybrid**: the log stays primary; relevant turns expand into inline graphs or open a scoped overlay without losing scroll position. The hybrid is a mode of its own now (§5.1): the map and the log hold the panel together, and the log keeps its place while the map answers the question.

---

## 2. What We Learned Building This

### 2.1 The data was already there — the model just needed extracting

OpenCode's session messages (`session-ui/src/timeline/projection.ts`) already carry turn boundaries, tool calls, file operations, subtasks, and outcomes. The graph model (`session-ui/src/graph/model.ts`) is a **pure, synchronous transformation** of that data — no backend changes, no new protocol required for the core graph. (An optional workspace lens adds a protocol/server endpoint; see rung 5 in §9.1.) Key insight: reuse `Timeline.constructSessionMessageRows`'s `turnByMessageID` map rather than re-walking the session.

### 2.2 Semantic levels are host policy, not library internals

What nodes appear at each zoom level is a **product decision** (OpenCode's `session-ui/src/graph/levels.ts`), not a renderer concern. The library (`spacegraphjs/levels`) provides the generic band controller; the host decides the policy table.

### 2.3 Layout stability enables spatial memory

Deterministic, append-only layout (`session-ui/src/graph/layout.ts`) means nodes never jump when new events arrive. X = turn index, Y = semantic lane (prompt/explore/edit/verify/delegate/artifacts), Z = hierarchy depth. Positions are byte-identical across builds.

### 2.4 Two interactive renderers, one contract, zero host branches

The host (`session-graph`) imports only `@spacegraphjs/renderer` (the contract). It mounts either `@spacegraphjs/spacegraph-renderer` (2D+3D, WebGL+CSS3D) or `@spacegraphjs/cytoscape-renderer` (2D, Canvas) through a registry. **No `renderer === "cytoscape"` branch exists** — differences are capability flags (`supports(capabilities, "3d")`).

### 2.5 The hybrid is the entry point, not the full graph

The turn-map overlay (`mod+alt+t`) opens a scoped subgraph of one turn over the transcript. The transcript underneath stays mounted — scroll preserved for free. This is the bridge that lets users try the graph without committing to a mode switch.

### 2.6 Performance is linear, not quadratic — because we measured it

`bun run graph:scale` on a 5,001-message synthetic session: model build 55 ms, layout 42 ms, render model 63 ms. The first run was **27.5 seconds** — two O(n²) passes eliminated. A 60-turn window caps what the renderer draws; the layout still measures the whole session so positions don't drift.

### 2.7 Five fundamentally different layouts, not variations

The placement seam (`spacegraphjs/layout`) supports:
- **Lanes** (grid: turns × semantic lanes) — default
- **Timeline** (wrapped per-turn rows)
- **Hierarchy** (indented outline by `part-of`)
- **Tree** (block tree via Reingold–Tilford)
- **Force** (neighbour-grid simulation, ~9 s at 20k nodes, frozen after one run)

They are not the same kind of thing — three are policies over one primitive; two are different geometries. Which is best is an open question the evidence task (T2.2) must answer.

### 2.8 The library is the reusable artifact

SpaceGraphJS is now a **published package set** (6 packages, `CONTRACT_VERSION = 3`), consumable outside OpenCode. A framework-free reference host (`spacegraphjs/demo/second-host/`) runs every generic capability against the contract. The OpenCode integration is one worked example.

---

## 3. Architecture Overview

```
Session messages + status + turn diffs
               │
               ▼
  @opencode/session-ui/graph      GraphModel + levels + layout + selectors (pure, tested)
               │  RenderModel (renderer-facing, stable IDs, absolute positions)
               ▼
  @spacegraphjs/renderer          Contract types + version helper, zero deps
               │
      ┌───────┼───────┐
      ▼       ▼       ▼
 [spacegraph] [cytoscape] [svg]
  2D + 3D      2D       static
      │       │       │
      └───────┴───────┘
               ▼
  @opencode/session-graph         Canvas, toolbar, inspector, breadcrumbs, search, minimap, a11y
               │
               ▼
  packages/app                    Per-session mode switch, lazy wrapper, toggle, commands
```

### 3.1 Package roles

| Package | Responsibility | Key exports |
|---------|---------------|-------------|
| `session-ui/src/graph` | Pure model: vocabulary, builder, levels, layout, selectors, fixture | `buildGraph`, `nodesAtLevel`, `layoutGraph`, `why`, `search`, `openInTranscript` |
| `spacegraphjs/packages/renderer` | **Contract only** — `RenderModel`, `GraphRenderer`, `RenderTheme`, capabilities, version | `CONTRACT_VERSION`, `supports()`, `FitOptions` |
| `spacegraphjs/packages/adapter` | Domain → `RenderModel` pipeline (imports contract only) | `SessionGraphAdapter`, `buildRenderModel`, `diffRenderModels` |
| `spacegraphjs/packages/spacegraph-renderer` | 2D ortho + 3D perspective, WebGL + CSS3D, HTML cards | `SpaceGraphRenderer` implements `GraphRenderer` |
| `spacegraphjs/packages/cytoscape-renderer` | 2D Canvas fallback, clipped DOM overlay for cards | `CytoscapeRenderer` implements `GraphRenderer` |
| `spacegraphjs/packages/svg-renderer` | Static export: `renderToSVG`, `InlineGraph`, `serializeRenderModel` | Pure Node/ browser, no interaction |
| `session-graph` | Host UI: `GraphView`, `GraphCanvas`, toolbar, inspector, breadcrumbs, search, minimap | React/Solid bindings via `spacegraphjs/control` (`GraphController`) |
| `packages/app/src/session/graph` | Integration: the panel (the log's home and the map around it), the mode branch, the turn-map overlay, permalinks | `SessionGraphPanel`, `SessionGraphView`, `TurnMapOverlay`, `graph.toggle` command |

### 3.2 The host's modules (`session-graph/src`)

| Module | What it owns |
|--------|--------------|
| `ui/GraphView.tsx` | The surface: the toolbar, the canvas region, the inspector, and the wiring between them. It owns the semantic level and the layout; the camera, the selection and the windows have their own modules. |
| `ui/graph-camera.ts` | The camera: the frame, the zoom, and the 100% reference the readout shows. The renderer owns the geometry; the host owns what the frame should hold. |
| `ui/graph-selection.ts` | The selection and the path to it. The library's `GraphController` owns the state; the view mirrors it into signals. |
| `ui/graph-anchors.ts` | The screen anchor of a node — where the popover, the peek and a pinned window hang. |
| `ui/graph-windows.tsx` | The windows over the map: the kinds the host offers and the first placement a window gets. The manager moves and stacks them; it holds no content. |
| `ui/cardTemplate.ts` | The card's markup: the kind glyph, the accent, the tier, and the one fact a kind has that its label does not. |
| `ui/card-copy.ts` | The card's words. The card is canvas markup, so the host owns its language; the template never hardcodes English. |
| `ui/node-data.ts` | The readers over a node's untyped `data`, so the card and the inspector cannot disagree about what a field holds. |
| `ui/GraphDetail.tsx` | The detail of a node: the header and the body, shared by every surface that shows one. |
| `canvas/` | The renderer seam: the contract, the registry, the adapter, and the canvas. It never imports a concrete backend. |

---

## 4. The Graph Model (session-ui/src/graph)

### 4.0 The modules

| Module | What it owns |
|--------|--------------|
| `vocabulary.ts` | The session's words — kinds, statuses, phase categories, layouts, detail modes, and the box a node occupies. It has no dependencies, so a host can read the vocabulary without pulling in the model. |
| `model.ts` | The model's types and the stable ids (`turn:…`, `msg:…`, `tool:…`) that make positions and selection survive streaming. |
| `build.ts` | The builder: a session's messages in, the model out. Every activity enters the model the same way, so a node is never half-attached. |
| `lookup.ts` | The model's indexes — nodes by id, `part-of` parents and children, the sequence chain — built once per model, so a lookup costs a map read instead of a scan. |
| `levels.ts`, `layout.ts`, `summary.ts`, `selectors.ts` | The policy: what a level shows, where a node sits, what a question answers. |

### 4.1 Node kinds (stable IDs, `minLevel` for semantic zoom)

| Kind | ID pattern | `minLevel` | Purpose |
|------|------------|------------|---------|
| `session` | `"session"` | overview | Root |
| `turn` | `turn:${messageID}` | overview | User prompt + assistant execution |
| `phase` | `phase:${turnID}:${category}:${ordinal}` | execution | Consecutive tools of same category (explore/edit/verify/delegate/result) |
| `message` | `msg:${messageID}` | execution | Assistant/user messages |
| `reasoning` | `reasoning:${partID}` | detail | Assistant reasoning parts |
| `tool` | `tool:${partID}` | execution | Tool calls with input/output |
| `subagent` | `subagent:${childSessionID}` | execution | Delegation to child session |
| `file` | `file:${path}` | execution | Files read/written (provenance) |
| `result` | `result:${partID}` | execution | Tool results, test output |
| `error` | `error:${partID}` | execution | Errors (including `interrupted` status) |
| `retry` | `retry:${turnID}:${attempt}` | execution | Retry/backtrack chain |
| `diff` | `diff:${turnID}` | detail | File diffs/snapshots |
| `compaction` | `compaction:${messageID}` | detail | Context compaction summary |
| `notice` | `notice:${messageID}` | execution | Synthetic completion messages |

### 4.2 Edge kinds (confidence: `explicit` / `structural` / `inferred`)

| Kind | Source → Target | Confidence | Meaning |
|------|-----------------|------------|---------|
| `part-of` | child → parent | structural | Hierarchy (message→turn, phase→turn, tool→phase) |
| `sequence` | earlier → later | structural | Chronological order within a turn |
| `delegates` | turn → subagent | explicit | Subtask delegation |
| `reads` / `writes` | tool → file | explicit | File provenance |
| `searches` | tool → file | explicit | Search/query operations |
| `produces` | tool → result | explicit | Tool → output |
| `references` | node → node | explicit | Cross-references (diff, compaction) |
| `compacts` | compaction → messages | explicit | Compaction scope |
| `evidence` | error/retry → tool | explicit | Failure → influencing action |
| `inferred-cause` | **never emitted** | — | **Adjacency ≠ causality** |

### 4.3 Semantic levels (host policy: `levels.ts`)

| Level | Nodes visible | Edges visible | Label mode |
|-------|---------------|---------------|------------|
| `overview` | session, turn, phase (clusters) | `part-of` only | Cluster counts |
| `execution` | All except `reasoning`, `diff`, `compaction` | All except `inferred-cause` | Full labels |
| `detail` | All nodes | All edges | Full detail |

DOM budget caps cards per level (overview 12, execution 40, detail 24); excess degrades to dots.

### 4.4 Deterministic layout (`layout.ts`)

- **X** = turn index × `turnGap` (320) + event ordinal × `step` (48)
- **Y** = lane × `laneGap` (56); lanes: `prompt`, `narrative`, `explore`, `edit`, `verify`, `delegate`, `artifacts`
- **Z** = hierarchy depth × `depthStep` (64)
- Phase clusters at first member's X on phase's lane
- File nodes near first write on artifacts lane
- Append-only: new turns append right; existing positions never change

### 4.5 Selectors (answering the five questions)

| Question | Selector | How it works |
|----------|----------|--------------|
| Why did the agent change this file? | `why(model, fileNodeID)` | Traverses `writes` → tool → `part-of` → turn → user prompt |
| Which tool calls led to this failure? | `forwardChain(model, errorNodeID)` | `evidence` edges backward to causing tools |
| What did the subagent contribute? | `ancestors(model, subagentNodeID)` | `delegates` edge + `part-of` chain in child session |
| What changed after the failing test? | `search` + `forwardChain` | Finds error node, walks forward through sequence |
| Where did the agent retry/change direction? | `search` for `retry`/`error` nodes | Kind filter + `interrupted` status |

All proven against the canonical fixture in `selectors.test.ts` (exit gate 2).

---

## 5. The Hybrid Experience (Phase 6)

### 5.1 The split view — the map and the log together

The hybrid is the strongest form of the product, and it is now a **mode** of its own:
`transcript | graph | hybrid`. In the hybrid the log and the map hold the panel together, and the
log is never detached: the reader's place in the transcript survives every move between the modes.

| Piece | What it does |
|-------|--------------|
| **the panel** (`packages/app/src/session/graph/session-graph-panel.tsx`) | owns the composition: the log's pane is the log's *home*, and the map is arranged around it with CSS order rather than by moving nodes — so entering the hybrid never detaches the transcript |
| **the arrangements** | `stacked` (the map above the log), `side` (the map beside it), `floating` (the map over it, movable and resizable). The reader picks one; the map offers the choice in its **Draw** menu |
| **the bridge** | picking a node in the map reveals its message in the log without leaving either; the log's active turn is marked on the map, so the reader sees where they are in the session |
| **the log's text size** | a slider at the top of the log's pane: in a split panel the log is narrow, and the reader wants it bigger or smaller without leaving the map |
| **the way in** | the map's toolbar offers "show the log beside the map", and `graph.hybrid` (`mod+shift+h`) toggles the mode |

The arrangement is the map's business only in name: the panel owns the geometry, and the map's
toolbar names the choice. Nothing about the composition is hard-coded into the map view.

### 5.2 Turn-map overlay (`mod+alt+t`)

- Mounts lazily in the session panel's container (`screen.panel.ref`), scoped to the panel's own width
- Transcript stays mounted underneath — scroll position preserved
- Shows execution-level subgraph of selected turn (capped at 7 nodes)
- Shared `GraphCanvas` + `GraphInspector` + "Open full graph"
- Focus-trapped dialog (`role="dialog"`, `aria-modal`); Escape closes, focus returns

### 5.3 Inline subgraph (SVG)

- Thin wrapper over `@spacegraphjs/svg-renderer`'s `InlineGraph`
- Non-interactive, five-node turn subset
- Not injected into timeline rows — avoids timeline coupling

### 5.4 Side panel (`gui-extensions/session-map`)

- Compact SVG overview: turns + phase clusters from `layoutGraph` + `nodesAtLevel("overview")`
- Highlights transcript's active turn → last pick → model's `activeTurn`
- Reveals message when node picked (uses `SessionScreen.transcript` SDK surface)
- Opened from side strip `+` menu

### 5.5 Permalinks (`#graph:<nodeID>`)

- Cold load switches to graph mode, frames node (raises level if needed)
- Layout prefix: `#graph:ribbon:<nodeID>` (unambiguous — no node ID starts with a layout name)
- Unknown IDs fall back safely (graph opens, nothing selected, transcript reachable)
- Inspector copy button puts absolute permalink on clipboard

---

## 6. SpaceGraphJS Dependency (External)

### 6.1 Package set (published, `CONTRACT_VERSION = 3`)

| Package | Version | Description |
|---------|---------|-------------|
| `spacegraphjs` | 8.5.0 | Core: graph, events, camera, plugins, nodes, edges, vision (dynamic) |
| `@spacegraphjs/renderer` | 0.3.0 | Contract types, `GraphRenderer`, capabilities, `FitOptions` (padding + insets) |
| `@spacegraphjs/adapter` | 0.2.0 | Model adapter pipeline (domain → RenderModel), `diffRenderModels` |
| `@spacegraphjs/spacegraph-renderer` | 0.3.1 | 2D ortho + 3D perspective, CSS3D HTML cards, CSS2D edge labels |
| `@spacegraphjs/cytoscape-renderer` | 0.3.0 | 2D Canvas, clipped DOM card overlay, declared 3D no-op |
| `@spacegraphjs/svg-renderer` | 0.2.0 | Static SVG export, `InlineGraph`, serialization |

### 6.2 Generic capabilities used by OpenCode integration

| Capability | Module | Purpose in OpenCode |
|------------|--------|---------------------|
| Semantic levels / zoom bands | `spacegraphjs/levels`, `spacegraphjs/zoom` | Toolbar level selector, camera bands |
| Layout strategies + placement engines | `spacegraphjs/layout` (LaneLayout + strategies) | Lanes, timeline, hierarchy, tree, force |
| Summary representations | `spacegraphjs/representations` (ribbon, matrix) | Ribbon/matrix view modes |
| Navigation (search, minimap, trail) | `spacegraphjs/navigation` | GraphSearch, GraphMinimap, breadcrumbs |
| View controller | `spacegraphjs/control` (`GraphController`) | Selection, focus, trail in GraphView |
| Accessibility (roving tabindex, ARIA) | `spacegraphjs/a11y` | Keyboard/screen-reader support |
| Depth spectrum | `spacegraphjs/depth` + contract `depths` | Flat/layered/depth-stack/orbit |
| Scoped overlay & code diff | `spacegraphjs/overlays` | Turn-map overlay, diff view |
| Static export (SVG/JSON/standalone HTML) | `@spacegraphjs/svg-renderer` | Export button, inline subgraph |

> **Note:** SpaceGraphJS is developed in `spacegraphjs/` (sibling repo, MIT) and published as independent packages. The broader platform vision, roadmap, and exploratory R&D areas are documented in `spacegraphjs/README.vision.md`.

---

## 7. Implementation Status & Verification

### 7.1 What's built and verified

| Area | Status | Verification |
|------|--------|--------------|
| Pure graph model (nodes, edges, levels, layout, selectors) | ✅ Complete | 123 unit tests, fixture-driven |
| Renderer contract + 3 leaves (SpaceGraph, Cytoscape, SVG) | ✅ Complete | 491 vitest tests, shared conformance suite |
| Host UI (GraphView, toolbar, inspector, breadcrumbs, search, minimap, a11y) | ✅ Complete | 100 unit + 57 component tests, 26 app e2e |
| Hybrid: turn-map overlay, the split view, inline SVG, side panel, permalinks | ✅ Complete | Component + app e2e |
| Export (SVG/JSON/standalone HTML) | ✅ Complete | Contract demo, component test |
| Security/escaping suite | ✅ Complete | 13 unit + browser tests, sanitization contract |
| Performance budget (linear pipeline, 60-turn window) | ✅ Measured | `graph:scale` benchmark, guard tests |
| Capture matrix (31 frames, 5 layouts × 4 depths × contexts) | ✅ Committed | `graph:capture --mode=verify` asserts set |
| Library published + clean consumer proof | ✅ Done | `test:publish` packs → external `node_modules` → mounts both adapters |
| Second host (framework-free, plain TS) | ✅ Running | `spacegraphjs/demo/second-host/` |
| Direct mouse interaction (pan, zoom, pick, frame, drag) | ✅ Complete | Library unit + Playwright e2e; app e2e in `e2e/graph/` |

### 7.1a The mouse map

The graph is read with the mouse, so the mouse map is a contract of the library, not of the host:

| Gesture | Does |
|---------|------|
| Right button + drag | Pan the view (the view follows the cursor) |
| Left button + drag on the background | Pan the view — over the background the left button has nothing else to do |
| Wheel | Zoom about the point under the pointer |
| Middle click on a node | Frame that node (auto-zoom, half a second) |
| Middle button + drag | Orbit (3D only; an orthographic view has no orbit) |
| Left click on a node | Select it; the detail appears where the reader asked for it — on the node, beside it, or in the panel |
| Left drag on a node | Move it |
| Shift + drag on the background | Box-select |

The library owns the map; a host that draws cards over the canvas inherits it. Two rules keep a card
readable: a control inside a card takes the mouse (the card does not drag out from under the
reader, and its background still drags it), and a card draws its hover as an outline, so hovering
never moves the controls under the reader's finger. A host that wants the left button to mean only
"the nodes" turns the background pan off (`input.interaction.enableBackgroundPan`).

### 7.2 Test commands (run from package directories, not root)

```bash
# Model
cd packages/session-ui && bun test src/graph

# Host package
cd packages/session-graph && bun run typecheck && bun test src && bun run test:components

# App integration
cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts

# Library
cd spacegraphjs && pnpm exec vitest run && bun run test:boundaries

# Full gate (canonical)
bun run graph:verify

# Screenshots
bun run graph:capture --mode=compare  # regenerate + inspect
bun run graph:capture --mode=verify   # assert committed set
```

### 7.3 Performance numbers (measured, not estimated)

| Metric | Budget | Measured |
|--------|--------|----------|
| Model build (300 msg / 1201 nodes) | < 50 ms | ~27 ms |
| Full pipeline (5,001 msg / 20,005 nodes) | < 400 ms | 55 + 42 + 63 = 160 ms |
| Force layout (same stream) | — | 9.3 s uncapped; 0.2 s over 60-turn window |
| Lazy SpaceGraphJS chunk (gzip) | < 400 KB | 282 KB (incl. `three`) |
| Lazy Cytoscape chunk (gzip) | < 250 KB | 138 KB |
| Session entry delta (gzip) | No regression | +0.3 kB (noise) |

---

## 8. Known Limitations (Honest, Not Lowered)

1. **Orthographic wheel zoom** keeps the point under the pointer in place
2. **Mesh selection outline** is axis-aligned `BoxHelper`, not silhouette; DOM cards use element outline
3. **Edge labels** avoid labels and DOM cards, not all geometry
4. **Global `SpaceGraph.instances`** remains as off-by-default dev handle
5. **`./activity` types stopgap** (`types/activity.d.ts`) — replace with generated declarations
6. **Toolbar `endInset`** clears floating header toggles; desktop-media-query-gated
7. **Mobile graph mode** desktop-gated for v1; mobile reaches graph only via `graph.toggle` command. The hybrid needs room for two surfaces, so a narrow screen falls back to the map alone
8. **Minimap vertically mirrored under Cytoscape** (model +y downward); correct under SpaceGraph
9. **Two adapter-failure e2e cases** dev-only (built chunks hashed); component suite covers seam
10. **First paint / pan frame rate** unmeasured — no graph perf harness
11. **Renderer selector** not in app toolbar; choice is prototype setting
12. **Swimlane bands** full-opacity under execution focus dimming (structure, not content)
13. **Lane gutter** is world-space (left of content, included in fit), not screen-fixed overlay
14. **Lanes overview** has dominant empty region (reserves execution width at overview)
15. **Empty-column exclusion** not implemented; fit frames content IDs
16. **Depth fade** is scene fog; DOM cards do not fade (HTML over canvas)
17. **Capture matrix** is one frame per option value, not cartesian product
18. **2026-10-19 visual review** found legibility defects; tracked T1.1–T1.18, layout-variety T7
19. **Long sessions** drawn as recent 60 turns + banner; layout measures whole session
20. **Camera-driven captures** used to vary (T6.20 fixed: fit measures live surface, zoom stops at renderer limit)
21. **Five layouts are not comparable kinds** — three grid policies, two different geometries; best is unmeasured
22. **Middle-drag orbit** does nothing in an orthographic view; there is no orbit to have

---

## 9. Upstream Readiness

### 9.1 Five-rung contribution ladder

| Rung | Scope | Diff | Risk | Review question |
|------|-------|------|------|-----------------|
| 1 | `session-ui/graph` (pure model + tests) | +6,126 lines | None — no UI, no deps | Is the model correct and reusable? |
| 2 | `session-graph` package (canvas, UI, contract only) | +7,411 lines | Low — feature-flagged, lazy | Does the host UI work and stay isolated? |
| 3 | App wiring (flag, settings, mode, toggle, commands) | +863/−36 in `app/src` | Low — off by default | Is the integration clean and reversible? |
| 4 | Hybrid affordance (turn-map, side panel) | +274 in `gui-extensions` | Medium — new SDK surface | Does the hybrid add value without disruption? |
| 5 (optional) | Protocol/server workspace snapshot | ~900 lines | Medium — new HTTP endpoint | Is the workspace lens worth the protocol cost? |

**Rung-selection rule:** A maintainer may take rungs 1–4 and never take rung 5; the graph still works as a session-only graph. Rung 5 adds the workspace lens (files and symbols from the workspace that aren't in the session) via a new HTTP endpoint. The `snapshot-cache` degrades gracefully when the endpoint is unavailable, so rung 5 is truly optional.

**Blocker:** Library packages must be published to npm (or bundled) before upstream can adopt. The fork currently uses source workspaces in a gitignored sibling repo.

### 9.2 Diff budget (re-audited 2026-10-20)

| Area | Δ lines | Verdict |
|------|---------|---------|
| `packages/app/src` (19 files) | +863 / −36 | Setting, mode, commands, toggle, scroll, permalinks, metrics. No graph semantics outside `session/graph/*.tsx`. |
| `packages/app` dev-only demo | +149 / −18 | Excluded from upstream diff. |
| `session-ui/src/graph` (13 files) | +6,126 | New pure model package. |
| `packages/session-graph` (57 files) | +7,411 | New host package; imports contract only. |
| `gui-extensions/session-map` | +274 | Side panel, built-in extension. |

Per-file justification in `docs/spacegraph/upstream-review.md` §5.

### 9.3 Review packet

- `docs/spacegraph/upstream-review.md` — problem, hypothesis, measured results, diff budget, flag/rollback, bundle, a11y, security, ownership, review commands, 12 review questions
- `docs/spacegraph/decisions.md` — 20 ADRs (naming, representation, depth, file lens, flag, contract bumps, etc.)
- `docs/spacegraph/security.md` — sanitization contract, CSP expectations, deliberate non-goals
- `docs/spacegraph/demos.md` — three demo surfaces, which to open
- `docs/spacegraph/prototype.md` — release write-up with all measurements

---

## 10. The Evidence Gap (Critical Path for Product Claim)

### 10.1 Protocol defined, not executed

**T2.2 (R7.3)** requires n ≥ 5 counterbalanced users, canonical fixture, five investigative tasks:
1. Why did the agent change `src/auth/session.ts`?
2. Which tool calls led to the failing test?
3. What did the subagent contribute?
4. Which changes were made after the failing test?
5. Where did the agent retry or change direction?

**Measured:** task success, time, wrong turns, interactions, preference (1–7), quotes.

### 10.2 Stop rule governs the product claim

If the graph does not beat the transcript on the five tasks, **stop feature work**, publish the finding, and keep the library as the deliverable. The RFC (T10.4) will state the result honestly — a negative result is publishable.

### 10.3 What a significant result looks like

1. Measured answer to the hypothesis (n ≥ 5, counterbalanced)
2. Usable innovation: hybrid is the entry point, not a mode switch
3. Upstream-ready contribution: flagged, small diff, published deps, review guide
4. Reusable library: contract, adapters, static export, controller, bindings
5. Explorable artifact: exportable (SVG/JSON/HTML), linkable (`#graph:<node>`)
6. Reproducible reviewer experience: provider-free demo, canonical fixture
7. Library adoption evidence: second host runs published contract + adapters

---

## 11. Remaining Work (Closing Plan: TODO.3)

### 11.1 Engineering wrap-up (G5 — CI green, code frozen)

- **T8.1** Fix all four red CI workflows (library build toolchain, deploy pnpm version, retire benchmark, fork Graph gate installer independence, reduced-motion test flake)
- **T8.2** Make fork installable from clean clone (`graph:setup` script, correct README)
- **T8.3** Library roadmap: budget CI, embedder devtools, API docs/release automation, `vue-spacegraph` deprecation, README audit
- **T8.4** Retire ad-hoc scripts (`PLAN/`, `verification/`, competing docs) → `docs/archive/`
- **T8.5** Final capture set + demo video (`docs/spacegraph/demo.mp4`)
- **T8.6** Re-measure every number in docs against current merge base
- **T8.7** Freeze graph code (only upstream syncs and defects after G5)

### 11.2 Upstream sync (G6 — fork on upstream `dev`)

- **T9** Merge upstream `dev` (24 commits, 7 overlapping files), re-measure entry delta, re-baseline docs, push

### 11.3 Shareable delivery (G7 — one clone, one install, one URL, one doc, one video, one npm release)

- **T10.1** Publish library to npm (version bump, `test:publish`, ordered upload)
- **T10.2** Cut `session-graph` branch consuming published packages (no sibling checkout)
- **T10.3** Hosted demo on GitHub Pages (contract demo + second host)
- **T10.4** Upstream RFC (after T2.2 measurement; text prepared in `rfc.md`)
- **T10.5** Fork landing page (banner), one compelling screenshot, release note, honest limitations
- **T10.6** Shared state branch + tag
- **T10.7** Stranger's path: `git clone <fork> && bun run graph:setup && bun run graph:dev`

---

## 12. Future Seams (Deferred by Design — OpenCode Level)

| ID | Item | Unblock condition | Seam present |
|----|------|-------------------|--------------|
| D1 | Inline row host (H6.5) | Maintainer approval for generic timeline slot | Turn-map overlay, SVG `InlineGraph` |
| D2 | Host-neutral activity adapter | Real second host needs it | `GraphController` + contract, demo fixture |
| D3 | Incremental `RenderModelPatch` | Profiling shows full-model diffs too slow | `diffRenderModels`; contract `setModel` |
| D4 | Cross-session graphs, recurring errors, comparing attempts | Validated single-session win | `data.sessionID`, stable IDs, SVG/JSON export |
| D5 | Real 3D geometry, depth of field, production 3D | Protocol prefers `layered`/`depth-stack` | Depth seam; host-owned Z |

> **Platform-level future seams** (multi-agent, time-travel, codebase overlay, NLQ, collaboration, etc.) are documented in `spacegraphjs/README.vision.md`.

---

## 13. How to Run the Prototype

### 13.1 Development mode (library + fork together)

```bash
git clone <fork-url>
cd <fork>
bun run graph:setup      # clones spacegraphjs/ at pinned tag, installs both trees
bun run graph:dev        # starts dev server (mock backend, no provider needed)
```

### 13.2 Consumption mode (published packages only)

```bash
git clone <fork-url> -b session-graph
cd <fork>
bun install              # no spacegraphjs/ directory needed
bun run graph:dev
```

### 13.3 Verification commands

```bash
bun run graph:verify           # full gate
bun run graph:capture --mode=verify  # assert screenshots
bun run graph:scale            # performance budget
```

### 13.4 Hosted demo (when deployed)

- Library contract demo: `https://autonull.github.io/spacegraphjs7/contract.html`
- Second host (framework-free): `https://autonull.github.io/spacegraphjs7/second-host.html`

---

## 14. Key Files for Reviewers

| Purpose | File |
|---------|------|
| Design argument (this file) | `SPACEGRAPH.md` |
| Release write-up | `docs/spacegraph/prototype.md` |
| Upstream contribution ladder | `docs/spacegraph/upstream-pr.md` |
| Maintainer review packet | `docs/spacegraph/upstream-review.md` |
| Security contract | `docs/spacegraph/security.md` |
| Architecture decisions (20 ADRs) | `docs/spacegraph/decisions.md` |
| Demo surfaces guide | `docs/spacegraph/demos.md` |
| Visual review evidence | `docs/spacegraph/visual-review.md` |
| Canonical fixture | `packages/session-ui/src/graph/fixture.ts` |
| Model builder | `packages/session-ui/src/graph/build.ts` |
| Model tests (5 questions) | `packages/session-ui/src/graph/selectors.test.ts` |
| Capture matrix | `docs/spacegraph/screenshots/01–31` |

---

## 15. License & Ownership

This fork is experimental, community-built, and not an official OpenCode feature. The transcript remains the dependable baseline. The graph is opt-in, lazy-loaded, and reverts cleanly. SpaceGraphJS is developed in `spacegraphjs/` (sibling repo, MIT) and published as independent packages. OpenCode gets the first integration opportunity because it's the tool we use to develop; other agent tools (Hermes, competitors) will follow the same adapter pattern.