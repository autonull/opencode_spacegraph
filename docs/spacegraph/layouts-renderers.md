# Layouts and renderers

The session owns the vocabulary; SpaceGraphJS owns the geometry. This page records what each
arrangement and renderer promises, and the fallback the host takes when a capability is absent.

## Layouts

| Layout | Geometry | Stable on append | Best for | Notes |
|---|---|---|---|---|
| `lanes` | Turn columns, one row per lane | Yes | Reading the session as work in lanes | Default |
| `timeline` | Turn columns, wrapped rows | Yes | Time order at a glance | |
| `hierarchy` | Indented outline, wrapped columns | Yes | Parent/child structure | |
| `tree` | Parent-centred tree | Yes | Delegation and file ownership | |
| `force` | Relaxed force simulation | Partial | Shape discovery | Reads previous positions |
| `grid` | Row-major square grid | No | Comparing many same-size cards | Requires `graph_layout_breadth` |
| `circular` | One ring in model order | No | Seeing the whole session as one object | Requires `graph_layout_breadth` |
| `ribbon`, `matrix`, `log` | Session summary geometry | Yes | Overview and audit | Not node-link layouts |

`grid` and `circular` are deterministic session-local arrangements. They do not reuse the
SpaceGraphJS layout plugin runtime, so they do not pull `three` into the model or need a live
renderer. They are exposed only when `graph_layout_breadth` is enabled.

### Parked layouts

`radial-layout`, `spectral-layout`, `cluster-layout`, and `geo-layout` stay in the library plugin
registry. They are **not** exposed by the session:

- `radial-layout` and `cluster-layout` need a live `SpaceGraph` instance and node objects, not the
  plain `GraphViewData` the session layout computes from.
- `spectral-layout` is eigenvector-based; it is not deterministic on append and would move cards a
  reader is looking at.
- `geo-layout` needs latitude/longitude per node; the session model carries no geographic data.

Expose them when the renderer owns layout, or when the model carries the data they need. Until
then the five core strategies plus the two optional arrangements cover the measured use cases.

## Renderers

| Strategy | Node budget | Status | Fallback |
|---|---|---|---|
| SVG preview | < 50 | Shipped for inline turn maps and gallery thumbnails | Static preview is the intended renderer |
| SpaceGraph (WebGL) | < 300 recommended | Shipped canvas renderer | The only renderer the canvas can mount today |
| Cytoscape (2D canvas) | large 2D maps | Not a session-graph dependency | Falls back to SpaceGraph |

`chooseRendererStrategy(nodeCount, { cytoscape })` in
`packages/session-ui/src/graph/renderer-strategy.ts` records the policy. The canvas registry
currently exposes one renderer, so `canvasRendererFor` maps every request to `spacegraph`; adding a
renderer means registering its factory and honouring the same contract version.

`bandChange` stays unimplemented for now: it belongs to semantic zoom, which is not a shipped
feature (G21). Do not add a listener for it until that feature lands.
