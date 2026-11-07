# The Hybrid Experience (Detail)

## Split View — The Map and the Log Together

The hybrid is the strongest form of the product, and it is now a **mode** of its own:
`transcript | graph | hybrid`. In the hybrid the log and the map hold the panel together, and the
log is never detached: the reader's place in the transcript survives every move between the modes.

| Piece | What it does |
|-------|--------------|
| **the panel** | owns the composition: the log's pane is the log's *home*, and the map is arranged around it with CSS order rather than by moving nodes — so entering the hybrid never detaches the transcript |
| **the arrangements** | `stacked` (the map above the log), `side` (the map beside it), `floating` (the map over it, movable and resizable). The reader picks one; the map offers the choice in its **Draw** menu |
| **the bridge** | picking a node in the map reveals its message in the log without leaving either; the log's active turn is marked on the map, so the reader sees where they are in the session |
| **the log's text size** | a slider at the top of the log's pane: in a split panel the log is narrow, and the reader wants it bigger or smaller without leaving the map |
| **the way in** | the map's toolbar offers "show the log beside the map", and `graph.hybrid` (`mod+shift+h`) toggles the mode |

The arrangement is the map's business only in name: the panel owns the geometry, and the map's
toolbar names the choice. Nothing about the composition is hard-coded into the map view.

## Turn-map Overlay (`mod+alt+t`)

- Mounts lazily in the session panel's container (`screen.panel.ref`), scoped to the panel's own width
- Transcript stays mounted underneath — scroll position preserved
- Shows execution-level subgraph of selected turn (capped at 7 nodes)
- Shared `GraphCanvas` + `GraphInspector` + "Open full graph"
- Focus-trapped dialog (`role="dialog"`, `aria-modal`); Escape closes, focus returns

## Inline Subgraph (SVG)

- Thin wrapper over `@spacegraphjs/svg-renderer`'s `InlineGraph`
- Non-interactive, five-node turn subset
- Not injected into timeline rows — avoids timeline coupling

## Side Panel

- Compact SVG overview: turns + phase clusters from `layoutGraph` + `nodesAtLevel("overview")`
- Highlights transcript's active turn → last pick → model's `activeTurn`
- Reveals message when node picked (uses `SessionScreen.transcript` SDK surface)
- Opened from side strip `+` menu

## Permalinks (`#graph:<nodeID>`)

- Cold load switches to graph mode, frames node (raises level if needed)
- Layout prefix: `#graph:ribbon:<nodeID>` (unambiguous — no node ID starts with a layout name)
- Unknown IDs fall back safely (graph opens, nothing selected, transcript reachable)
- Inspector copy button puts absolute permalink on clipboard