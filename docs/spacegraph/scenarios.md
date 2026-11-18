# SpaceGraph Scenarios — the demo's unit of work

**Status:** planning, 2026-11-14. Supersedes the seeded random-detour takes.
**Rule:** a caption states a developer goal, never a feature name. The graph is the means, not the subject.

---

## The model

A scenario is **intent → solution → visible outcome**:

- **Caption (intent):** "I need to…" — a real developer goal, including a question to answer.
- **Actions:** the one or few interactions that *are* the solution.
- **Outcome:** a resolution the viewer can read on screen that proves the need was met.
- **Capabilities:** the named features used as means.

A demo is an ordered set of scenarios. This makes two failures impossible:

1. **Aimless footage.** Every action must serve the stated goal or it is cut.
2. **Invisible gaps.** Because each scenario declares its capabilities, coverage is a matrix, not a
   hope that random walks hit everything.

```
capability  ×  scenario  →  exists / partial / proposed / gap
```

---

## Status legend

| Status | Meaning |
|---|---|
| `exists` | Shipped. Filmable today. |
| `partial` | Foundation present; needs work before it can be filmed honestly. |
| `proposed` | Design only. Build before filming. |
| `gap` | No scenario covers it. Decide: film it, park it, or declare it not-demoable. |

---

## Part A — Capability inventory

Sources: `composition-guide.md`, `layouts-renderers.md`, `packages/session-graph/src/ui/*`,
`packages/session-ui/src/graph/*`. Cited so the matrix is checkable, not asserted.

### Surfaces (6) — `exists`

| Surface | Entry | What it proves |
|---|---|---|
| Map | `MapSurface → SessionGraph` | full host chrome, the default map |
| Hybrid | `HybridSurface` | map + transcript side by side |
| Transcript graph | `GraphTranscriptSurface` | virtualized rows, inline expand |
| Panel | `SpacegraphPanel` | map in the side panel |
| Turn map | `TurnMapLayer → GraphInline` | one turn as a map, read-only |
| Inline preview | `GraphInline` | static SVG → interactive on expand |

### Lenses (9) — `exists` (`composition-guide.md`, Lens Table)

`reader, navigator, cartographer, investigator, orchestrator, reviewer, archivist, composer, auditor`.
Each sets surface + layout + depth + level + detail + trace + files + widgets. Lenses are packaged
goal bundles; captions still state the goal.

### Layouts (10) — `exists` (`layouts-renderers.md`)

`lanes, timeline, hierarchy, tree, force` (core). `grid, circular, ribbon, matrix, log` require
`graph_layout_breadth`. Parked and not exposed: `radial, spectral, cluster, geo`.

### Depth / level / density — `exists`

Depth `flat | layered | depth-stack | orbit`; level `overview | detail | execution`; density
`comfortable | compact | cozy`; projection `2D | 3D`.

### Traces and overlays — `exists`, except focus dim

| Capability | Status | Evidence |
|---|---|---|
| Trace overlay + `trace.dim` (0.35) | `exists` | `cardTemplate.ts:237` |
| Depth fade (z-based) | `exists` | `cardTemplate.ts:372-384` |
| Equalizer age fade | `exists` | `cardTemplate.ts:369-370`, `GraphEqualizer.tsx` |
| Neighbor traversal (`neighborStep`) | `exists` | `useGraphKeyboard.ts:213` |
| **Focus / neighborhood dim (graded)** | **`proposed`** | `cardTemplate.ts:239-241` — *placeholder* |

### Selection, search, framing — `exists`

Selection bus `useGraphSelection`; search palette (`/`); focus/frame node (middle click → `graph-camera.ts`);
breadcrumbs, minimap, a11y mirror.

### Composer / live conduct — `partial`

| Capability | Status | Evidence |
|---|---|---|
| Composer node widget (prompt + attach) | `exists` | `ComposerNodeWidget.tsx`, `panel.tsx:169` |
| `followLog` frames the active turn | `exists` | `SessionGraph.tsx:831-835` |
| Streaming appends keep selection | `exists` | `graph-selection.ts:74` |
| Frame each new node as it streams | `proposed` | see D2 |

### Diff / files / permalink / export — `exists`

Diff via `diffSource`; files rail; permalink `#graph:<node>`; export SVG/JSON/HTML.

### Progressive expansion — `exists`

Drill depth `maxDrillDepth` default 3 (`useGraphNavigation` refuses a 4th); `isClusterExpanded`;
`graph_multi_surface`. Visible "expand node grows graph" affordance: chevron toggle on group cards
(phase, file-group, subagent-group, error-group) in `cardTemplate.ts:441`. Click handler in
`GraphCanvas.tsx:217`, state in `useGroupCollapse.ts:125`. Layout preserves positions on expand
(append-only).

### Trust lens — `gap / verify`

`composition-guide.md` lists `graph_trust_lens` as a **deleted orphan**, but `GraphToolbar.tsx:67`
still comments "Trust lens: highlight unverified writes." **Verify before filming.** The earlier
`trust` take called `setTrustLens?.()` with optional chaining, so it may have been a no-op. Do not
claim trust-lens coverage until confirmed.

---

## Part B — Scenario catalog

Ordered by a plausible session: read → investigate → verify → delegate → review → hand off → work.

| # | "I need to…" | Actions | Capabilities | Readable outcome | Status |
|---|---|---|---|---|---|
| 1 | Know why the build broke | attention badge → **Why** | trace=why, investigator/navigator, panel detail | causal chain ending in the failed `bun test` and its error | `exists` ✅ filmed |
| 2 | Find the call that caused the failure | search "failed" → focus → follow `sequence` back | search, focus/frame, led-here | the exact result node and its command input | `exists` |
| 3 | See what the subagent actually did | hierarchy/tree → subagent node → `delegates` | orchestrator, tree, panel detail | the subagent's reads and the finding it returned | `exists` |
| 4 | Verify the fix before I merge | files rail → diff | reviewer, files rail, diffSource | wrong fix vs correct fix, side by side | `exists` |
| 5 | Hand this to a teammate | select node → copy permalink | cartographer, `#graph:<node>` | a URL pinned to the node and layout | `exists` |
| 6 | Audit a long session fast | auditor lens → matrix | auditor, matrix (`graph_layout_breadth`), compaction | whole session as one object; drops visible | `exists` |
| 7 | Know what this run cost | cost lens | `graph_cost_lens`, lanes | per-node tokens/cost, no relayout | `exists` |
| 8 | Read a turn without leaving the transcript | inline preview → expand | reader, inline preview, turn map | the turn's graph inline, static → interactive | `exists` |
| 9 | Focus on what matters and ignore the rest | select ≥1 node → neighborhood highlight | **graded neighborhood dim (D1)** | selected cluster bright; everything dims by distance | `proposed` |
| 10 | Keep working while the agent runs | composer widget → send → follow | composer + followLog + **node-grab focus (D2)** | new nodes appear and the camera moves to them | `partial` |
| 11 | Open a crowded cluster without losing my place | expand a node | **progressive expansion (D3)**, drill depth | children fan out from the expanded node | `partial` |

**Film the 8 `exists` scenarios first.** They need no new code and already cover the core claim.
D1–D3 are additive; build and film them second.

---

## Part C — Coverage matrix

| Capability | Scenarios | Status |
|---|---|---|
| Attention badge | 1 | `exists` |
| Trace = why | 1 | `exists` |
| Trace = led-here | 2 | `exists` |
| Trace = related | 3 | `exists` |
| Trace = downstream | 9 | `exists` |
| Search + focus/frame | 2 | `exists` |
| Hierarchy / tree + delegates | 3, 11 | `exists` |
| Subagent widget | 3 | `exists` |
| Files rail + diff | 4 | `exists` |
| Permalink | 5 | `exists` |
| Auditor + matrix | 6 | `exists` |
| Compaction | 6 | `exists` (verify visibility) |
| Cost lens | 7 | `exists` (flag-gated) |
| Inline preview / turn map | 8 | `exists` |
| Hybrid surface | 10 | `exists` |
| Panel surface | 1, 3, 4 | `exists` |
| Orbit / layered depth | — | `gap` (candidate: B-roll, not a goal) |
| Neighborhood dim | 9 | `proposed` |
| Composer + follow | 10 | `partial` |
| New-node camera grab | 10 | `proposed` |
| Progressive expansion | 11 | `exists` |
| Trust lens | — | `gap / verify` |
| Export SVG/JSON/HTML | 11 | `exists` |
| A11y / minimap / breadcrumbs | — | not demoed (supporting chrome) |
| Parked layouts (radial/spectral/cluster/geo) | — | not demoable (see layouts-renderers.md) |

Uncovered rows are decisions, not oversights: for each, either add a scenario, park it, or state why
it is not demoable. Do not let a row stay blank by accident.

---

## Part D — New capabilities to design

### D1 — Neighborhood highlighting (graded, distance-based)

**Goal it serves:** "I need to focus on what matters and ignore the rest." Also the impression that
the graph supports a much larger session than any single frame shows.

**Design.** A selectable *mode* (like the trace overlay, never always-on):

- Input: the current selection (one or many nodes) + a max distance `D` (default 2–3).
- Compute BFS graph distance from the nearest selected node over model edges.
- Map distance to opacity with a smooth curve, not a cliff:
  - distance 0 → 1.0 (selected)
  - 1 → ~0.85
  - 2 → ~0.6
  - 3 → ~0.35
  - > D → ~0.15
- Multi-select fades by **minimum** distance to any selected node.
- It is a *focus+context* view: the attended cluster stays legible, the rest recedes but remains
  discoverable. Combined with `fit` on the lit cluster, it reads as "this is a small part of a
  larger map" without hiding the whole.

**Where it plugs in.** The precedence chain in `cardTemplate.ts:emphasis()` already orders
`diff.removed → trace.dim → (focus.dim) → diff.changed/added → selected/active → depth fade`. Add a
`neighborhood` overlay beside `trace.dim`; compute per-node opacity once per selection change and pass
it through `CardTemplateOptions`. The canvas/WebGL renderer needs the same per-node opacity for
non-DOM nodes — verify the renderer exposes a style hook, else start with DOM cards.

**Honesty note.** `cardTemplate.ts:239-241` marks focus dim as a placeholder. This is a real build,
not a turn-on.

### D2 — Live conduct in the graph

**Goal it serves:** "I need to keep working while the agent runs" — the session conducted entirely in
the graph, transcending the linear transcript.

**What already exists:** the `ComposerNodeWidget` sends a prompt from the graph (`panel.tsx:169`);
`followLog` frames the active turn when it changes (`SessionGraph.tsx:831-835`); streaming appends do
not clear selection (`graph-selection.ts:74`).

**The gap.** Frame *each new node as it streams*, not only the turn boundary, and keep the composing
node in view while the prompt is typed.

**Design.**
- On a model content-hash change with append-only nodes, if follow mode is on, frame the newest node
  with a short camera move (~400–600 ms).
- Wrap the newest node in **D1 neighborhood highlighting** for a beat, so the graph "breathes" around
  the new work and the rest dims. This is what makes a large live session feel tractable.
- While composing, pin the session-root composer and do not follow, so typing is stable.

### D3 — Progressive expansion

**Goal it serves:** "I need to open a crowded cluster without losing my place."

**What exists:** drill depth 3, `isClusterExpanded`, `graph_multi_surface`. **Implemented:** card
affordance (chevron toggle) on group cards for phase clusters, file groups, subagent groups, and
error groups (`packages/session-graph/src/ui/cardTemplate.ts:420-442`). Click handler in
`GraphCanvas.tsx:217` calls `onGroupToggle` which updates `useGroupCollapse` state. Layout is
deterministic append-only: expanding a cluster adds member nodes with new positions while preserving
all existing node positions. No full re-layout occurs.

---

## Part E — Shot list

Template per scenario:

```
Scenario: <n> — "<goal caption>"
Start:    <layout, level, selection>
Actions:  <ordered, minimal>
Legible:  <the exact text that must be readable in the outcome frame>
Hold:     3–5 s on the outcome
Duration: <= 12 s
```

---

### Scenario 1 — "I need to know why the build broke."

```
Scenario: 1 — "I need to know why the build broke."
Start:    lanes, execution level, nothing selected
Actions:  click attention badge -> click "Why"
Legible:  the failed `bun test` line and its error text (assertion message, file:line)
Hold:     4 s, zoomed so the error fills the lower third
Duration: 8 s
```

### Scenario 2 — "I need to find the call that caused the failure."

```
Scenario: 2 — "I need to find the call that caused the failure."
Start:    lanes, execution level, trace=why active from scenario 1
Actions:  search "failed" -> select result -> middle-click / frame node -> follow "led here" edge back to caller
Legible:  the exact result node label and its command input text (the failing command)
Hold:     4 s on the caller node with command visible
Duration: 10 s
```

### Scenario 3 — "I need to see what the subagent actually did."

```
Scenario: 3 — "I need to see what the subagent actually did."
Start:    hierarchy or tree layout, overview level, nothing selected
Actions:  navigate to subagent node (delegated task) -> click to expand delegates -> open panel detail
Legible:  the subagent's read tool calls (file paths) and the finding text it returned
Hold:     5 s on the panel showing the finding
Duration: 11 s
```

### Scenario 4 — "I need to verify the fix before I merge."

```
Scenario: 4 — "I need to verify the fix before I merge."
Start:    reviewer lens (files rail visible), detail level
Actions:  select changed file in files rail -> open diff -> toggle between wrong fix and correct fix
Legible:  side-by-side diff showing the wrong fix (red) and correct fix (green) with readable code lines
Hold:     4 s on the correct fix diff
Duration: 10 s
```

### Scenario 5 — "I need to hand this to a teammate."

```
Scenario: 5 — "I need to hand this to a teammate."
Start:    cartographer lens, any layout, target node in view
Actions:  select target node -> open share/copy permalink -> paste into chat (simulated)
Legible:  the `#graph:<node-id>` URL with layout params visible in the toast/notification
Hold:     3 s on the copied URL toast
Duration: 7 s
```

### Scenario 6 — "I need to audit a long session fast."

```
Scenario: 6 — "I need to audit a long session fast."
Start:    auditor lens, matrix layout (`graph_layout_breadth` flag on), overview level
Actions:  (no interaction needed — the lens + layout is the answer) -> observe compaction drops indicator
Legible:  the matrix showing the whole session as one object; compaction "N drops" badge legible
Hold:     5 s on the full matrix view
Duration: 9 s
```

### Scenario 7 — "I need to know what this run cost."

```
Scenario: 7 — "I need to know what this run cost."
Start:    cost lens (`graph_cost_lens` flag on), lanes layout, execution level
Actions:  (no interaction — lens applies cost sizing/color) -> scan for highest-cost nodes
Legible:  per-node token counts and USD cost labels on the top 3 nodes; no relayout flash
Hold:     4 s on the highest-cost node with tooltip open
Duration: 8 s
```

### Scenario 8 — "I need to read a turn without leaving the transcript."

```
Scenario: 8 — "I need to read a turn without leaving the transcript."
Start:    reader lens, transcript surface, inline preview visible
Actions:  hover turn row -> inline preview expands to interactive -> click expand to turn map
Legible:  the turn's graph structure in the inline preview (static SVG) and after expand (interactive nodes)
Hold:     4 s on the expanded turn map with node labels readable
Duration: 10 s
```

### Scenario 9 — "I need to see the downstream impact of a change."

```
Scenario: 9 — "I need to see the downstream impact of a change."
Start:    lanes layout, execution level, node with downstream forks selected
Actions:  click node -> open trace menu -> select "Downstream"
Legible:  the fork node with multiple branches visible; branch labels readable
Hold:     4 s on the fork with branches fanned out
Duration: 10 s
```

### Scenario 10 — "I need to see the map beside the transcript."

```
Scenario: 10 — "I need to see the map beside the transcript."
Start:    transcript surface, any layout
Actions:  press Mod+Shift+H -> hybrid surface opens with map on right
Legible:  the transcript on left, graph on right, both scrollable; selected node highlighted in both
Hold:     4 s on the side-by-side view
Duration: 8 s
```

### Scenario 11 — "I need to share the graph as a file."

```
Scenario: 11 — "I need to share the graph as a file."
Start:    any surface, any layout, graph visible
Actions:  open toolbar menu -> click Export -> select SVG -> file saves
Legible:  the export dialog with format options; toast confirms "Exported as SVG"
Hold:     3 s on the confirmation toast
Duration: 7 s
```

---

## Part F — Editorial rules and definition of done

1. **Caption = goal.** "I need to…" Never a feature or lens name.
2. **Stillness holds on evidence.** Camera moves travel *between* reading beats; they never replace
   reading. (The earlier rule "camera moves replace freezes" was read backwards.)
3. **Stable framing per scenario.** Pick the layout that answers the goal and stay there. No layout
   roulette.
4. **Legibility gate.** Extract the outcome frame at final resolution and confirm the answer text is
   readable. This is a check, not an opinion.
5. **Findings cite frames.** A finding names the scenario and the frame; footage not inspected is not
   reviewed.
6. **Done = human sign-off.** Not "the pipeline exited zero." The project owner says it communicates.
7. **Coverage is a matrix.** A capability with no scenario is a decision recorded in Part C.

---

## Part G — Open questions

- Trust lens: deleted or still live? Resolve before any `trust` scenario.
- Does the canvas renderer accept per-node opacity for D1, or is D1 DOM-cards-only at first?
- Is `compaction` visible enough to film as an outcome, or only as a caption?
- **Decided:** All three gap rows earn scenarios — downstream trace (Scenario 9), hybrid surface (Scenario 10), export (Scenario 11).
- For D2, does the fixture stream, or do we need a scripted append to show node-grab focus?
