# Integration guide — Using SpaceGraph in your session

> **Status: experimental.** SpaceGraph is an opt-in alternate view. The transcript remains the dependable baseline.

## Enable the graph

1. Open **Settings** → **Experimental**
2. Enable **Session graph**
3. Reload the app (or restart the session)

A new **Map** toggle appears in the session header (desktop) or the **graph.toggle** command (all platforms).

## Open the graph

| Platform | How |
|----------|-----|
| Desktop (web/app) | Click the **Map** toggle in the session header |
| Any | Press `Mod+Shift+M` (`graph.toggle` command) |
| Command palette | Type "map" and select **Open session map** |

## Navigate the map

### Semantic level (what the map shows)

| Level | Shows | Shortcut |
|-------|-------|----------|
| **Overview** | Phase clusters + turn counts | `1` |
| **Execution** | Tool calls, reads/writes, errors, retries | `2` |
| **Detail** | Full reasoning, file diffs, subagent work | `3` |

Cycle with `Mod+L` or the **Level** dropdown in the toolbar.

### Layout (how the map is drawn)

| Layout | Best for |
|--------|----------|
| **Lanes** (default) | Timeline-like columns; execution order left→right |
| **Timeline** | Wrapped per-turn rows; compact overview |
| **Hierarchy** | Indented outline; follow delegation depth |
| **Ribbon** | Turn-level summary; one row per turn |
| **Matrix** | Turn × level matrix; compare at a glance |
| **Tree** | Force-directed; free exploration |
| **Force** | Free geometry; organic clusters |

Cycle with `Mod+Shift+L` or the **Layout** dropdown.

### Depth (3D perspective)

| Mode | Effect |
|------|--------|
| **Flat** (default) | 2D orthographic |
| **Layered** | 2.5D — lanes at different Z, camera can tilt |
| **Depth-stack** | Stacked layers; orthographic depth |
| **Orbit** | Full 3D perspective; drag to orbit |

Cycle with `Mod+D` or the **Depth** dropdown. *Requires the SpaceGraphJS renderer (default).*

### Search & focus

- **Search** (`Mod+F`): Find nodes by label, file, or kind. Results show inline on the canvas.
- **Fit** (`F` or toolbar button): Frame all visible nodes.
- **Frame selection** (`G`): Center the camera on the selected node.
- **Breadcrumbs**: Click any breadcrumb to select and frame its subtree.

### Inspector (detail panel)

Click a node to open its detail. Three display modes:

| Mode | Where detail appears | Toggle |
|------|---------------------|--------|
| **Panel** (default, wide) | Persistent side panel | `D` or toolbar |
| **Popover** | Floating beside the node | `D` or toolbar |
| **Window** | Pinned, resizable overlay | `D` or toolbar |

The panel resizes by dragging its left edge. On narrow screens it becomes a bottom sheet.

### Turn map overlay

While a turn is selected in the graph:
- Press `Mod+Alt+T` or click **Open turn map** in the toolbar
- A focus-trapped dialog shows the turn's execution subgraph
- Press **Escape** to close and return focus to the graph
- Click **Open full graph** to jump to that turn in the main map

### Hybrid view (map + transcript side by side)

| Arrangement | Description | Shortcut |
|-------------|-------------|----------|
| **Stacked** | Transcript above, map below (1/3 height) | `Mod+Shift+H` |
| **Side by side** | Map left/right, transcript fills rest | `Mod+Shift+H` then `Mod+S` to flip |
| **Floating** | Map as an overlay over the transcript | `Mod+Shift+H` twice |

Cycle arrangements with `Mod+A`. Flip sides with `Mod+S`.

In hybrid, the map highlights the transcript's active turn. Click a node in the map → the transcript scrolls to that message.

### Permalinks

Copy a link to the current view:

1. Select a node (or don't — the link captures the whole query)
2. Click **Copy view** in the toolbar (or run `graph:permalink` command)
3. Paste the URL — it opens the graph at that node, level, layout, and depth

Permalink format: `#graph:<layout>:<nodeID>` (e.g., `#graph:lanes:turn:3`).

### Export

Click **Export** in the toolbar → choose format:

- **SVG** — vector, theme-aware, printable
- **JSON** — full `RenderModel` for tooling
- **HTML** — standalone file with embedded renderer (view offline)

### Keyboard shortcuts summary

| Shortcut | Action |
|----------|--------|
| `Mod+Shift+M` | Toggle graph |
| `Mod+Shift+H` | Toggle hybrid |
| `Mod+Alt+T` | Open turn map |
| `Mod+L` | Cycle level (1/2/3 also work) |
| `Mod+Shift+L` | Cycle layout |
| `Mod+A` | Cycle arrangement |
| `Mod+S` | Flip side (in side-by-side) |
| `Mod+D` | Cycle depth |
| `Mod+F` | Search |
| `F` | Fit all |
| `G` | Frame selection |
| `Z` / `Shift+Z` | Undo / redo manual drag |
| `/` | Open search |
| `1` / `2` / `3` | Level: overview / execution / detail |

## Session-specific settings

The graph remembers per-session:
- Layout, level, depth, arrangement, side
- Detail mode (panel/popover/window)
- Renderer (SpaceGraphJS or Cytoscape)
- File lens (changed-files rail)
- Windows (pinned overlays)

Global defaults live in **Settings** → **Experimental** → **Session graph** (renderer default).

## When the graph helps

| Question | Graph affordance |
|----------|------------------|
| Why did this file change? | Click the file node → inspector shows reads/writes/diff; follow **writes** edges upstream |
| Which calls led to this failure? | Select the error node → **why** trace highlights the causal chain |
| What did the subagent contribute? | Subagent node → inspector opens its session; **part-of** edges show its work |
| What changed after the failing test? | Frame the failed test turn → **follow log** keeps the map synced as you scroll |
| Where did the agent retry? | Execution level shows retry chains; **related** trace fans out from a retry node |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Graph toggle not visible | Enable **Session graph** in Settings → Experimental; reload |
| 3D options disabled | Cytoscape renderer doesn't support 3D; switch to SpaceGraphJS in Settings |
| Map is empty | Check the session has messages; try **Fit** (F) or increase level |
| Permalink opens transcript | The node may be hidden at the current level; the graph raises the level automatically |
| Performance issues on long sessions | The map shows the last 60 turns by design; use **Overview** level or **Ribbon** layout |

## Known limitations (v1)

- Mobile: graph toggle is desktop-only; use `graph.toggle` command
- Renderer choice is a Settings setting, not a toolbar control
- First paint and pan FPS are unmeasured
- Layout/depth combinations are not all validated (usability protocol pending)
- Cytoscape minimap is vertically mirrored

## Give feedback

This is an experimental prototype. Report issues or share quotes at:
- GitHub: `opencode` issue tracker (label `spacegraph`)
- Discord: `#spacegraph` channel
- In-app: **Help** → **Report issue** (includes session context)

---

*See also:* [Prototype write-up](./prototype.md) | [Surface vs Panel vs MobileView](./surface-vs-panel-vs-mobileview.md) | [Demo surfaces](./demos.md)