# What We Learned Building SpaceGraph

## 2.1 The data was already there — the model just needed extracting

OpenCode's session messages (`session-ui/src/timeline/projection.ts`) already carry turn boundaries, tool calls, file operations, subtasks, and outcomes. The graph model (`session-ui/src/graph/model.ts`) is a **pure, synchronous transformation** of that data — no backend changes, no new protocol required for the core graph (rungs 1–4). An optional workspace lens (rung 5) adds a protocol/server endpoint (~900 lines); the `snapshot-cache` degrades gracefully when the endpoint is unavailable. Key insight: reuse `Timeline.constructSessionMessageRows`'s `turnByMessageID` map rather than re-walking the session.

## 2.2 Semantic levels are host policy, not library internals

What nodes appear at each zoom level is a **product decision** (OpenCode's `session-ui/src/graph/levels.ts`), not a renderer concern. The library (`spacegraphjs/levels`) provides the generic band controller; the host decides the policy table.

## 2.3 Layout stability enables spatial memory

Deterministic, append-only layout (`session-ui/src/graph/layout.ts`) means nodes never jump when new events arrive. X = turn index, Y = semantic lane (prompt/explore/edit/verify/delegate/artifacts), Z = hierarchy depth. Positions are byte-identical across builds.

## 2.4 Two interactive renderers, one contract, zero host branches

The host (`session-graph`) imports only `@spacegraphjs/renderer` (the contract). It mounts either `@spacegraphjs/spacegraph-renderer` (2D+3D, WebGL+CSS3D) or `@spacegraphjs/cytoscape-renderer` (2D, Canvas) through a registry. **No `renderer === "cytoscape"` branch exists** — differences are capability flags (`supports(capabilities, "3d")`).

## 2.5 The hybrid is the entry point, not the full graph

The turn-map overlay (`mod+alt+t`) opens a scoped subgraph of one turn over the transcript. The transcript underneath stays mounted — scroll preserved for free. This is the bridge that lets users try the graph without committing to a mode switch.

## 2.6 Performance is linear, not quadratic — because we measured it

`bun run graph:scale` on a 5,001-message synthetic session: model build 55 ms, layout 42 ms, render model 63 ms. The first run was **27.5 seconds** — two O(n²) passes eliminated. A 60-turn window caps what the renderer draws; the layout still measures the whole session so positions don't drift.

## 2.7 Five fundamentally different layouts, not variations

The placement seam (`spacegraphjs/layout`) supports:
- **Lanes** (grid: turns × semantic lanes) — default
- **Timeline** (wrapped per-turn rows)
- **Hierarchy** (indented outline by `part-of`)
- **Tree** (block tree via Reingold–Tilford)
- **Force** (neighbour-grid simulation, ~9 s at 20k nodes, frozen after one run)

They are not the same kind of thing — three are policies over one primitive; two are different geometries. Which is best is an open question the evidence task (T2.2) must answer.

## 2.8 The library is the reusable artifact

SpaceGraphJS is now a **published package set** (6 packages), consumable outside OpenCode. A framework-free reference host (`spacegraphjs/demo/second-host/`) runs every generic capability against the contract. The OpenCode integration is one worked example. Capability is probed by **existence** (`typeof renderer.applyPatch === "function"`), never by a version constant.