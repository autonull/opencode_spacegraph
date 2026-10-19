# Visual review — committed captures (2026-10-19)

Scope: the 20 images in `docs/spacegraph/screenshots/`, inspected at full resolution. Unless noted,
frames are 1440×900, dark, en-US, reduced motion. `01`/`05` are transcript baselines; `10` mirrors
`09` and was not reviewed separately. This review is the input to T1.8–T1.16 in
`SPACEGRAPH.TODO.2.md`; it does not change the images.

## Verdict

The prototype is **structurally complete and visually uneven**. The graph answers the five questions
in tests, but the images still fail a first-time legibility read in four ways:

1. **Framing is content-poor.** Overview, ribbon, and matrix leave most of the canvas empty; the
   selected state clips content at the left and bottom; the inspector/composer are not in the fit.
2. **Three representations are not yet legible:** timeline reads as a collage, hierarchy collapses to
   a tiny vertical column, and matrix has no axes and overlapping cells.
3. **Depth modes are broken, not merely weaker.** `orbit`/`depth-stack` shear DOM cards into
   overlapping planes; `layered` is close but still small.
4. **Cytoscape does not match SpaceGraph.** It is captured light while SpaceGraph is dark, is zoomed
   in and clipped, and in `08` the selected file card renders as an empty rectangle.

The one clean reference is `09-contract-demo-light.png`: legible cards, a clear top-to-bottom flow,
a visible inspector, and a zoom/band readout. It should set the bar for the app captures.

## Image-by-image

| Image | Verdict | Findings | Tasks |
|---|---|---|---|
| `00-spike-spacegraph.png` | **Retire** | Phase 0 spike: old chrome (telemetry, zoom card, hint), plain blue boxes, container only half-height. Misleading in a release set. | T1.16 |
| `02-graph-overview.png` | Weak | Content sits in the lower third; ~60% empty canvas. Lane labels are faint and collide with content. No legend. Toolbar clips "Execution"/"Hierarchy". | T1.1, T1.2, T1.10, T6.8 |
| `03-graph-execution.png` | Fair | Cards are non-overlapping and readable as shapes, but text is tiny at fit; bottom third empty; turn bands dominate; toolbar clips. | T1.1, T1.2 |
| `04-graph-selected.png` | **Poor** | Content is pushed low, clipped at the left edge and under the composer. Inspector open but the fit did not account for it. Selected node's neighborhood is dimmed too subtly. | T1.2, T1.3, T6.10 |
| `06-graph-3d.png` | **Broken** | CSS3D cards shear into parallelograms, overlap across turns, bands become giant polygons, lane labels skew and clip. | T1.3, T1.11 |
| `07-cytoscape-overview.png` | **Poor** | Zoomed in and clipped on the left; light theme while SpaceGraph captures are dark; oversized bands; lane gutter clipped. Not an overview. | T1.14 |
| `08-cytoscape-selected.png` | **Poor** | Selected file renders as an empty blue rectangle; content clipped; theme mismatch; large empty regions. | T1.14 |
| `09-contract-demo-light.png` | **Reference** | Library demo: legible cards, clear flow, inspector, band/zoom readout, confidence labels. Use as the visual quality bar. | — |
| `11-graph-timeline.png` | **Poor** | Dense collage; reading order unclear (files/session at the bottom, tools above); unlabeled bands; empty right side. | T1.13 |
| `12-graph-hierarchy.png` | **Broken** | One tall column fitted to the full height; cards shrink to ~5px text; indentation is invisible. | T1.12 |
| `13-graph-narrow.png` | **Poor** | Canvas squeezed to ~180px between a three-row toolbar and a half-height sheet; content unreadable. | T1.4 |
| `14-graph-light.png` | Weak | Lane labels are effectively invisible (light text on light surface); inferred edges are very faint; a selected file is described in the inspector but is not visible at overview. | T1.9, T1.10 |
| `15-graph-ribbon.png` | Weak | Lower-left composition with ~60% empty canvas; no row labels or axis; framing does not fill the space. | T1.2, T1.11 |
| `16-graph-matrix.png` | **Poor** | Not a matrix: no row/column headers, cells scattered, two cards overlap ("Also cover…" and "Authentication design"); most of the canvas empty. | T1.11 |
| `17-graph-files.png` | Fair | The changed-files rail is clear and useful; the graph is small with large vertical margins; breadcrumbs show only the file path. | T1.2, T1.9 |
| `18-graph-layered.png` | **Poor** | Sheared planes, bands in front of cards, tiny text; the "2.5D minimum legible bar" is not met. | T1.3 |
| `19-graph-depth-stack.png` | **Broken** | Same plane shear/overlap as orbit; content unreadable. | T1.3 |

## Cross-cutting defects (new, beyond TODO.1)

- **Toolbar labels clip at 1440.** `SegmentedControl` is fixed at 232px; "Execution" → "Executor",
  "Hierarchy" → "Hierarch". Already T1.1.
- **Light-theme lane gutter.** The lane chips have no readable contrast in light mode. T1.10.
- **Breadcrumbs are provenance-blind.** File nodes have no `part-of` ancestry, so the bar shows only
  the path (or nothing) instead of Session → turn → file. T1.9.
- **Selection can be invisible.** A selected file at overview is hidden by the level policy while the
  inspector still describes it. The view should show the selected node, raise the level, or say it is
  hidden. T1.9.
- **Bands are too dominant.** Large translucent rectangles read as selections and, in depth modes,
  render in front of cards. T1.2/T1.3.
- **No edge/status legend.** Encoding is not discoverable without a briefing. T6.8.
- **Summary representations are exposed too early.** Ribbon/matrix are toolbar-primary despite not
  meeting the legibility bar. Gate them behind the experimental setting until T1.11 passes.

## Camera zoom experiment (important)

A temporary camera-zoom control (reverted) was added to capture multiple zoom levels. At the fitted
view the normalized readout is ~45%; two clicks (70%) fills the viewport with two giant clipped
cards; four clicks (100%) renders a **blank canvas**. Panning at 100% also shows nothing.

Root cause: `ORTHO_ZOOM` spans `0.01..100` on a log scale
(`spacegraphjs/src/core/WebGLRenderer.ts`), so most of the useful range sits below 50% normalized and
the top of the range is orders of magnitude past the content. The mapping is absolute, not
content/fit-relative, and the host has no safe clamp. Before shipping a camera zoom control:

- make the normalized range content/fit-relative, or cap the adapter/host range at ~2–3× fit;
- clamp zoom-out so the model cannot leave the viewport entirely;
- keep card text bounded (LOD/constant-size or a max scale);
- add a percentage readout and buttons (T1.8);
- then capture the zoom/pan matrix (T1.15).

This is the strongest evidence that the app lacked a usable camera zoom: the only camera keys (`z/x`,
`a/d/w/s`) are container-scoped, and OpenCode's "type to focus composer" behaviour captures printable
keys, so keyboard zoom is not reachable in practice. The existing toolbar +/- buttons step the
semantic level, not the camera.

## Not reviewed

- `01-log.png`, `05-return-to-log.png`: transcript frames (baseline), no graph content.
- `10-contract-demo-dark.png`: mirrors `09`.
- Pixel-level differences between runs: not compared; inspection is manual by design (V5.3).
