# SPACEGRAPH.TODO.4 — the map as a workspace

**Status:** successor to `SPACEGRAPH.TODO.3.md` (the wrap-up, sync and share plan, 2026-10-21) and to
`SPACEGRAPH.TODO.2.md` (the build record) and `SPACEGRAPH.TODO.1.md` (the Phase 0–10 specification,
frozen). `SPACEGRAPH.md` remains the design argument; `docs/spacegraph/prototype.md` remains the
release write-up. **This file is the plan for what the map becomes once it is a *workspace* rather
than a viewer**: surfaces the reader can open, move and size; a map that pans under the hand; a
toolbar that fits; a card that can be tuned; a log that shares the panel with the map; and — from
T17 on — **a map that speaks one language**: one layout, one level, one way to show content.

**Conventions:** carried tasks keep their IDs (`T8.x`, `T9.x`, `T10.x`, `T2.x`); new work gets
`T11`–`T18` and the gates `G9`–`G18`. Never renumber or reuse an ID; superseded work gets a new ID.
Every task has a `Done when` and a `Verify` command. Check tasks off here. Cite TODO.1 and TODO.3 for
the evidence; do not copy it.

---

## 0. Where we are (2026-10-22)

### 0.1 The two repositories

| Item | State |
|---|---|
| OpenCode fork | `dev`, **13 ahead** of `origin/dev` (the T16–T18 block), **24 behind** upstream `dev` (fetched 2026-10-21) |
| Upstream | `anomalyco/opencode` `dev` — 24 commits, 150 files since the merge base; its `test` and `check` workflows are **green** on its own head |
| SpaceGraphJS | `main`, a sibling checkout at `spacegraphjs/`, version 8.5.0; the fork's `bun.lock` names it as a workspace |
| Contract | `CONTRACT_VERSION = 3`; `SUPPORTED_CONTRACT_VERSIONS = [2, 3]` |
| Green today | `session-ui` graph **123** · `session-graph` unit **101** · library vitest **534** + four package suites · `session-graph` component suite **58** · app graph e2e **29** · root `bun run check` **40/40** typecheck |

### 0.2 What the author found

The author's own words, after using the graph with the detail modes from TODO.3's T8.8:

> - 'on the node' doesn't do anything
> - 'besides the node' is cool. What if the popup could be made durable (by clicking on a button) and
>   could be moved and resized as an overlay node "window". Multiple windows that the user can
>   position and size, providing plenty of room for detail and related widgets (contextual actions,
>   logs, etc...). There could be other reasons to create windows too.
> - dragging on the background with left button, since it otherwise has no action, should pan like it
>   does with the right button — but only when dragging on the background.
> - the graph toolbar is getting cluttered — we should consider how to organize it better for
>   space-saving and intuitiveness.
> - maybe there can be an 'equalizer' panel that adjusts sizes/styles of nodes according to their type,
>   age, etc...

Five observations, five workstreams. The first is a **defect report**, not a feature request: the
`card` mode shipped in T8.8 and does not do what its name says. T11 fixes that before anything else
is built on top of it.

**The author's next round (2026-10-22), after the hybrid landed.** The map had a mode, an
arrangement and a text slider — and the map's own language was still two axes for one job:

> - "Consider how to enable all possibilities without making it confusing; we need to explore
>   varieties and not get stuck in a particular UI pattern."
> - "I found the 'Ribbon', 'Matrix', etc. thing confusing — aren't these just Layouts? The detail
>   level should be something applicable to any Layout."
> - "Consider how to simplify the Graph UI by consolidating and reorganizing it."
> - "Are we making use of LOD to enable high detail when a node is viewed up-close?"
> - "It might help to add a font-size slider for log text size which could be especially helpful in
>   hybrid modes" — and, on where it lives: "an easy-to-reach slider, not hidden away in a settings
>   panel. So it can be quickly adjusted back and forth."
> - and, on the tests: "avoid creating tests which are too brittle that they may interfere with our
>   active development and experimentation."

The text slider is built (T16.3 ✓) and the tests were moved onto their contracts rather than their
copy ✓. The other four are **T17 and T18**: one layout axis, the level as a grain, the log's own
shape as a layout, one concept for the surfaces, the detail the reader earns by moving closer, and
the ergonomics of the map-and-log pair.

### 0.3 The facts that shape this plan

Every number here was measured in this tree, not assumed. F1–F7 shaped the plan's first five
workstreams (2026-10-21); F8–F13 shaped the consolidation (2026-10-22).

**F1 — A card's box belongs to the layout, and the layout reads it per node.**
`CARD_SIZE = [220, 72]`, `COMPACT_SIZE = [132, 44]`, and one function `nodeSize(node)`
(`packages/session-ui/src/graph/layout.ts:55-66`) decide every node's footprint. Four of the five
strategies read the **per-node** width from it when they advance a cell cursor — `lanes`
(`spacegraphjs/src/layout/strategies.ts:367`), `timeline` (`:432`, `:454`), `tree` (`:588`), `force`
(`:618`); `hierarchy` hard-codes 220 for everything (`:547`). The vertical pitch is derived from
`standardSize[1]`, never from a node's own height. So **a card cannot grow without the layout
knowing**, and a size policy flows straight into the geometry.

**F2 — The legibility floor is low, and it is deliberate.**
The fit keeps a card at least `MIN_CARD_HEIGHT_PX = CARD_SIZE[1] / 2 = 36` screen pixels tall
(`packages/session-graph/src/ui/GraphView.tsx:57`, used as `minScale` at `:534`), which the code
comments call "the size the lane views are read at". At that floor a 220-unit card is ~110 screen
pixels wide, so its 13px label renders at **6.5px**, its 12px summary at **6px**, and an 11px detail
line at **5.5px**. The tier thresholds (`far < 80`, `near ≥ 170` screen pixels,
`packages/session-ui/src/graph/detail.ts:22`) therefore describe a reader who has **zoomed in**; at
the fit the reader is in the `mid` tier, where a summary is already a smudge.

**F3 — The `card` mode adds a line that is often empty and never visible.**
`detailLine()` (`packages/session-graph/src/ui/cardTemplate.ts:115-123`) is `time · path · agent`.
`time` exists on every kind except `session`, `phase` and `file`; `path` exists only on `file` (and
there it repeats the label); `agent` only on `subagent`. So selecting a **session** or a **phase**
node adds *literally nothing*, and everywhere else it adds one illegible line inside a box whose
size never changes. That is the "doesn't do anything" report, and it is a **design** failure, not a
plumbing one: the tier plumbing works (the card's markup carries `data-tier="near"`, asserted by
`packages/session-graph/component-tests/graph-detail.spec.ts:42`).

**F4 — There is no screen-space window in the library, and none is needed to build one.**
The library's screen-space surfaces are all fixed chrome: `HUDPlugin`, `MinimapPlugin`,
`ZoomUIPlugin`, `VisionOverlayPlugin` (the only `DOMOverlayPlugin` subclass,
`spacegraphjs/src/plugins/VisionOverlayPlugin.ts:8`), and `HoverMetaWidget`
(`spacegraphjs/src/plugins/interaction/HoverMetaWidget.ts:56-91`), which is `position: fixed` on
`document.body`, positioned **once** from `worldToClient` on hover and never moved again. The
`src/overlays/` folder is a focus-trap helper, a diff renderer and a model-level subgraph extractor —
no positioned window anywhere. `PanelNode`'s `onPanelDragStart/Move/End` and
`getDragMode`/`getResizeDirection` look like the panel-drag API but are **dead code** (nothing calls
them) and are **world-space**. A host can build a movable, resizable window in plain DOM today: the
graph container is `position: relative` (`spacegraphjs/src/core/WebGLRenderer.ts:99`) and the CSS3D
layer sits at `z-index: 1` (`WebGLRenderer.ts:101-106`), so a host-owned panel above it is trivial.

**F5 — The left button on the background does nothing, and the pan is a button bitmask.**
The camera's mouse map is `CAMERA_GESTURES` in
`spacegraphjs/src/input/fingerings/CameraFingerings.ts:20-23`: right (`buttons === 2`) pans, middle
(`4`) orbits. The left button belongs to the nodes. A plain left press on empty background takes
**no branch at all** in `InteractionPlugin.handlePointerDown`
(`spacegraphjs/src/plugins/InteractionPlugin.ts:109-139`): a ≤5px press emits `background:click`
(`:261-274`), a longer drag emits **nothing**. "Background" is defined by the raycast returning no
node (`spacegraphjs/src/plugins/interaction/RaycasterHelper.ts:39-52`); the separate "is this node
draggable" veto lives in `Node.isDraggable` (`src/nodes/Node.ts:349`) and
`DOMNode.isDraggable` (`src/nodes/DOMNode.ts:108-135`, which protects a control inside a card).

**F6 — The toolbar has nineteen controls, and four of its icons do not exist.**
`packages/session-graph/src/ui/GraphToolbar.tsx` renders: representation, level, zoom, depth, layout,
detail mode, peek, minimap, files, fit, search, legend, gallery, billboard, turn map, expand, export,
the renderer label and back. The icons `cube` (billboard), `download` (export), `image` and `code`
(export's SVG/JSON items) and `branch` (turn map) are **not in the icon catalogue**
(`packages/ui/src/icons/catalog.ts`, `icon/additional-icons.ts`), and `Icon` falls back to `"plus"`
for an unknown name **silently** (`packages/ui/src/icons/icon/icon.tsx:52`) — so five buttons render
as the same plus sign. The overflow menu only appears below **640px** of the view's root width
(`GraphView.tsx:212-225`), and the segmented controls are already squeezed to `width: auto` by
`packages/session-graph/src/ui/graph-toolbar.css`.

**F7 — The card's accents are hard-coded HSL, not theme tokens.**
`CATEGORY_HUE` and `KIND_HUE` (`packages/session-graph/src/ui/cardTemplate.ts:30-53`) resolve to
`hsl(h 70% 55%)` / `hsl(h 70% 55% / 0.16)`. The contract's `RenderTheme`
(`spacegraphjs/packages/renderer/src/index.ts:89-107`) carries surface/text/border/status/accent and
the font, but no per-kind hue. Any new styling dimension (age, size, importance) has to either
extend the HSL scheme or introduce theme roles.

**F8 — the layout is two axes for one job.**
`REPRESENTATIONS = ["graph","ribbon","matrix"]`
(`packages/session-ui/src/graph/vocabulary.ts:88`) and
`LAYOUT_STRATEGIES = ["lanes","timeline","hierarchy","tree","force"]` (`:80`) both answer *how are
the nodes arranged*. They live in two different controls — the representation is an **inline
segmented control**, the strategy a row in the **Draw menu** — so the reader meets "Graph" beside
"Lanes" and has to work out that both are layouts. The ribbon and the matrix are not a
different *kind* of thing: they are host-level layouts built on the library's own summary geometry
(`packages/session-ui/src/graph/representation.ts:53,63` → `spacegraphjs/representations`), the
same seam the five strategies use. The author's instinct is right: **they are layouts.**

**F9 — the level is disabled for two of the three representations.**
`representationLevel()` (`packages/session-ui/src/graph/representation.ts:20`) answers `"overview"`
for the summaries, so the toolbar greys the level out for them
(`packages/session-graph/src/ui/GraphToolbar.tsx`: the level items carry `disabled={!graphMode()}`).
The reader meets **a control that does nothing** — the clearest possible sign that the two
controls are not what they look like.

**F10 — the level is a grain, and every layout can honour it.**
The model already carries the grain: `minLevel` per kind
(`packages/session-ui/src/graph/model.ts:69-84`, `levels.ts:10-73`) — the session and the turns are
`overview`, the phases, the tools, the files and the messages are `execution`, the reasoning, the
diffs and the compactions are `detail`. A layout that draws a *summary* of the model can honour
the level by drawing a **finer grain**, not a different thing: at `overview` a turn's row is its
phase clusters, at `execution` the row is the turn's tools, at `detail` the row carries the
reasoning and the diffs too. The level then means the same thing everywhere: **how fine is the
grain**.

**F11 — the library has a per-node LOD, and it is a cull, not a detail.**
`Node.computeLOD()` (`spacegraphjs/src/nodes/Node.ts:182`) returns `high | medium | low | hidden`
from the node's **screen pixel size** (culled below `minPixelSize`), its **distance** to the camera
(100 / 500 world units), and two host escapes: `data.lod` (an override) and `data.minZoom` /
`data.maxZoom` (a zoom band, `spacegraphjs/src/types.ts:61-62`). The core consumes it in exactly
one place — `RenderContext.shouldRender()` (`spacegraphjs/src/core/RenderContext.ts:81-90`):
`hidden` culls the node, and **the `high | medium | low` distinction is returned and never read**.
So the LOD is *whether to draw*, never *how much to draw*.

**F12 — the host uses none of the library's LOD escapes, and the DOM budget is a flat count.**
No `lod`, `minZoom` or `maxZoom` is set anywhere in
`packages/session-graph/src/canvas/sessionGraphAdapter.ts` or `packages/session-ui/src/graph/*`, so
a session's map runs on the library's generic distance bands. And the DOM card budget is a flat
per-level count (`levels.ts`: 12 / 40 / 24) spent **in model order** — the adapter walks
`visibleNodes` and stops at the budget (`ModelAdapter.build`: `cards < budget`) — so the card the
reader is looking at may be a dot because an earlier node in the model took the budget. **The
reader's proximity is not the budget's criterion.**

**F13 — the map has exactly one "more detail up close", and it stops one line early.**
The card's tier (`far | mid | near`, `packages/session-ui/src/graph/detail.ts`) is derived from the
card's **screen width** (T11.4) — a genuine screen-size LOD ✓. But it adds **one** line at the near
tier (the kind's own fact, T11.3), and the node's *record* (a tool's output, a diff's patch) is
only ever in the detail surface. **The map never shows more of a node because the reader moved
closer.** And the seam for "a far node draws itself simpler" — the library's `high | medium | low`
— is empty (F11).

### 0.4 Invariants carried forward

Cite TODO.3 §0.6; do not relitigate. The transcript stays the dependable baseline; the graph is
opt-in, lazy and reverts cleanly; no causality is inferred from adjacency; stable ids and
append-only positions; the renderer owns geometry and camera, the host owns semantics and layout;
detail content is always selectable DOM text, never painted into the canvas; a surface that takes
layout width must not reframe the map.

### 0.5 The gates

| Gate | Means | Tasks |
|---|---|---|
| **G9 — the card speaks** | the selected node's detail is visible, and what a card says depends on what its kind has to say | T11 |
| **G10 — windows** | durable, movable, resizable overlays over the map, with content the host supplies | T12 |
| **G11 — the hand** | the background pans under the left button, and the mouse map is written down | T13 |
| **G12 — the toolbar** | the controls fit, are grouped by axis, and every one of them is legible | T14 |
| **G13 — the equalizer** | the reader can tune a card's size and style by rules over the graph's own vocabulary | T15 |
| **G14 — the map and the log** | the two surfaces hold the panel together, and the log keeps its place | T16 |
| **G15 — one axis** | one layout list, one control, and a level every layout honours | T17.1, T17.2 |
| **G16 — the log's shape** | the map can be read in the session's order, like the log | T17.3 |
| **G17 — one surface concept, and the detail up close** | every surface is a gutter, a neighbour or a window; the card nearest the reader is a card | T17.4, T17.5 |
| **G18 — the pair, tightened** | the map follows the log, one control offers the surfaces, the detail's home follows the map, and the hybrid works from the keyboard | T18 |

They are independent: T13 and T14 can land before T12 exists, and T11 is a precondition for
believing the `card` mode at all. **Nothing in this plan is a prerequisite for the TODO.3 gates
(G5–G8)** — but the TODO.3 freeze rule (§10.3 rule 4) says no graph features after G5, so **this
plan is the exemption**: it is the work the author's own use of the product asked for, and it lands
as one reviewed block rather than as a drip.

**Status: G9, G10, G11, G12 and G13 are reached** (T11, T12, T13, T14 and T15, 2026-10-21 — see the
log), and **T16 — the map and the log together — is reached** (the hybrid mode, 2026-10-22). T14.3
(the minimap as a window) is still open, and is now the last step of T17.4 rather than a leftover.

**T17 and T18 are planned, not started** (2026-10-22). They are the consolidation the author's own
use asked for — one layout axis, a level that applies to every layout, one way to show
content, the detail the reader earns by moving closer, and the ergonomics of the map-and-log pair.
They are written here before any of them is built, because the consolidation moves a vocabulary and
a vocabulary is cheaper to move on paper.

### 0.6 What is *not* in this plan

- **The `auto` detail mode** — *moved into T18.3*: G9 and G10 have now produced the evidence the
  deferral asked for (the card speaks, the window works), and the answer turned out to be a rule
  rather than a guess: the detail's home follows the map's width.
- **A new node type for windows.** A node is world-space: it scales, rotates and moves with the
  camera, it is in the spec, it is in the layout, it is culled by LOD. A window that behaves like a
  window must not be a node (F4).
- **A world-anchored window** (a panel that lives in the map and pans with it). It is a real option
  and T12.4 records it; it is not built by default, because a window you are reading should stay
  still while the map moves.
- **Multi-session windows, saved layouts, collaborative windows.** Deferred (TODO.3 D4).

---

## 1. T11 — The card speaks (the `card` mode, fixed)

**Why this is first.** T8.8 shipped four detail modes. The popover works and the author likes it.
The `card` mode does nothing (F3), and "on the node" is one of the two answers to the question the
whole feature exists to answer. A reader who picks `card` and sees no change will not pick it
again, and the mode's only value is as a comparison point — which requires it to be *visible*.

### T11.1 Say exactly what "nothing" is, and prove it — **done**

The three independent reasons, each measured in this tree. The fixture is 43 nodes.

| Reason | Measurement |
|---|---|
| **Empty content** | the detail line was `time · path · agent`: `time` exists on every kind except `session`, `phase` and `file`, `path` only on `file`, `agent` only on `subagent`. **9 of 43 nodes (21%) would have shown an empty line** — the session and its eight phases. |
| **Redundant content** | on the 5 `file` nodes the line *was* the label. **14 of 43 (33%)** of the fixture's cards would have said nothing the label did not. |
| **No change of box** | the card's world box is `CARD_SIZE = [220, 72]`; the tier changes the composition inside it, so the reader sees the same rectangle before and after. |
| **Illegibility** | at the fit's floor (a card 110 screen pixels wide) the added line is `11 · 110/220 = 5.5px`, and the summary already there is 6px. |

The kinds, against "what does this kind have that the label does not":

| kind | in the fixture | has | the card says now |
|---|---|---|---|
| `session` | 1 | the lineage | the session it was forked from, or its parent |
| `turn` | 2 | the time | when the turn started |
| `phase` | 8 | the time — usually none | nothing; a phase has no time of its own |
| `message` | 3 | the role | who spoke (`user`, `assistant`, `shell`, `steered`) |
| `reasoning` | 0 | the text, which is the summary | nothing |
| `tool` | 14 | the input's first line | the path it touched, the command it ran, the pattern it searched |
| `file` | 5 | the path (the label) and the readers/writers | the readers and the writers, from the graph's edges |
| `subagent` | 1 | the agent | the agent's name |
| `result` | 4 | the output, the exit code, the timeout | the first line of the output, `exit N`, `timed out` |
| `error` | 1 | the error type | `tool_error` |
| `retry` | 1 | the attempt, which is the label | nothing |
| `compaction` | 0 | whether the window was replayed | `replayed` |
| `notice` | 1 | the source | `subagent` |
| `diff` | 2 | the files | the first changed file |

Done when: the three reasons are written down with the numbers, and the fixture's kinds are listed
against "what does this kind have to say that the label does not".
Verify: a table in this file; no code.

### T11.2 Decide what "the detail on the node" can physically be — **done**

Three options, with their consequences. The choice is the plan's first real decision.

| Option | What the reader sees | Cost | Risk |
|---|---|---|---|
| **A. The camera frames the node** | selecting a node flies the camera to it; the card is then large on screen and the near tier is legible | one call to the existing `focusNode` (`GraphView.tsx:706-719`) plus a policy | the camera moves on every click, which is the interruption the popover was built to remove — but only in `card` mode |
| **B. The card's box grows** | the selected card becomes a bigger card, overlapping its neighbours | the layout must know (F1): `nodeSize()` changes → the cell cursor moves → **the row reflows** → positions move | breaks "stable ids produce stable positions" unless the growth is excluded from the layout's cursor |
| **C. The detail leaves the card** | the card says *identity and a summary*; the detail lives in a window (T12) | the `card` mode becomes "emphasise the card", and the detail mode loses a member | the `card` mode stops being a detail surface — it becomes a focus surface |

**The decision: C, with A as the amplifier.** The card keeps *identity, a summary and the one fact
its kind has*; the full record lives in a window (T12). A makes C work: in `card` mode, selecting a
node frames it, so the card is legible and the near tier earns its keep.

**What A means in the code.** The camera frames the selected node with the *fit*, whose legibility
floor is the card's reading width (`minScale: 198 / 220` screen pixels per world unit), so the
frame lands on a card the reader can read. It is renderer-agnostic — the contract's `fit` already
carries `minScale` and `padding` — and it never zooms the reader *out*: the fit's floor only
raises the scale. A pan, a zoom or a fit never re-frames the card; only the selection does.

The consequence the plan named — "the camera moves on every click" — is real, and it is confined
to the `card` mode. The other modes (the default `panel`, the `popover`, `off`) leave the map
where it is.

Done when: the decision is recorded in §10.1 and the plan's task list names the resulting modes.
Verify: this file.

### T11.3 The card's composition becomes a function of the kind, not of the tier alone — **done**

Today the three tiers are `far` (glyph + label), `mid` (+ summary), `near` (+ one generic detail
line). The plan's change: **the tier decides how much room there is, and the kind decides what
fills it.** The vocabulary is already there:

| Kind | What it has that the label does not | Source |
|---|---|---|
| `message`, `reasoning` | the text | `summary` |
| `tool` | the tool name, the input's first line, the result's exit code | `data.name`, `data.input`, `data.exit` |
| `file` | the path (the label) and the readers/writers | `data.path`, the graph's edges |
| `subagent` | the agent, the child's session | `data.agent`, `data.childSessionID` |
| `result` | the output's first line, the exit code, the timeout | `data.output`, `data.exit` |
| `error`, `retry` | the message, the attempt | `summary`, `data.attempt` |
| `compaction` | whether a window was replayed or a summary left | `data.replayed` |
| `notice` | the source | `data.source` |
| `diff` | the files, the additions/deletions | `data.files` |
| `turn`, `phase`, `session` | the time; the category; the lineage | `time`, `data.category`, `data.sessionID` |

The rule to encode: **a card shows the one thing its kind has that the label does not** — and shows
nothing when it has nothing. A `phase` card that has no time shows a label, not an empty line.

**What was built.** `kindDetail(node)` in `packages/session-graph/src/ui/cardTemplate.ts` is the one
function that answers the question, per kind, and it returns `undefined` when the kind has nothing
— so the card adds no line at all rather than an empty one. The `file` case is the exception the
kind cannot answer: the readers and the writers live in the graph's edges, so the host supplies them
through the card template's `related` option, and the view counts them once per model.

Done when: `createCardTemplate` takes the kind's content from the node's own fields, and a node
with nothing extra shows exactly the same card as before.
Verify: `cd packages/session-graph && bun test src/ui/cardTemplate.test.ts` — a table case per kind,
each asserting the *absence* of an empty line.

### T11.4 Re-tune the tier thresholds against the legibility floor — **done**

The thresholds (80 / 170 screen pixels) were guesses; the floor (F2) says otherwise. The arithmetic
is exact and worth writing down once:

> A card is 220 world units wide, so at a screen width `W` one world unit is `W / 220` screen pixels.
> The label is 13 world units → `0.059·W` px. The summary is 12 → `0.055·W` px. The kind's detail
> line is 11 → `0.050·W` px.

| line | readable at 8px | readable at 9px | at the fit's floor (`W = 110`) |
|---|---|---|---|
| the label (13) | W ≥ 135 | W ≥ 152 | 6.5px |
| the summary (12) | W ≥ 147 | W ≥ 165 | 6.0px |
| the kind's detail (11) | W ≥ 160 | W ≥ 180 | 5.5px |

**The rule to adopt: a tier boundary is the width at which the next line reaches its reading size.**
Under that rule, at 9px: `far` below 165, `mid` from 165 to 180, `near` from 180. At 8px: 147 / 160.

Two consequences worth stating plainly:

- The current `far` threshold of **80 is too low**. Between 80 and 147 the summary is 4.4–8px — a
  smudge the tier nevertheless calls `mid`. Raising it means **the default view shows labels only**,
  and the summaries appear when the reader zooms in far enough to read them. That is the behaviour
  the whole tier idea was for, and it is not what shipped.
- The `near` band is narrow (165→180 at 9px, a 9% zoom change). The hysteresis matters more there
  than anywhere else: the separate in and out thresholds (`detail.ts:22`) must be wide enough that
  a card sitting on the boundary does not flip.

The reading size (8px or 9px) is the author's call, not the plan's: it is a judgement about the
reader, and the author is the reader.

**The reading size taken: 9px.** The thresholds are *derived*, not written down: `detail.ts` holds
the reading size (`DETAIL_READING_PX = 9`), the card's world width (220) and the world size of its
three lines (13 / 12 / 11), and the boundaries are computed from them. One number moves them all,
so the author's call stays one edit:

| boundary | derived from | at 9px | at 8px |
|---|---|---|---|
| `far` → `mid` | the summary (12) reaches the reading size | **165** | 147 |
| `mid` → `near` | the kind's line (11) reaches the reading size | **180** | 160 |
| `farExit` | 5% past `far` | **173** | 154 |
| `nearExit` | 5% before `near` | **171** | 152 |

The hysteresis is 5% of the boundary, which is 8px at 9px — wide enough that a card on the edge
does not flip, narrow enough that the band is still a band.

**The consequence the plan named is now the shipped behaviour:** at the fit a card is 110 screen
pixels wide, well under 165, so **the default view shows labels only** and the summaries appear
when the reader zooms in far enough to read them.

**One defect the change found.** The tier is hysteretic, so it needs a second pass to settle: a
card that grows from `far` to `near` in one step is `mid` on the first pass and `near` on the
second. The view's tier effect read only the card's width, so a card whose width *stopped* changing
stayed one tier behind the reader. The effect now reads the tier as well as the width, and the
signal settles in the same frame.

Done when: the thresholds are derived from a stated reading size, and the numbers are in this file.
Verify: `cd packages/session-ui && bun test src/graph/detail.test.ts` — the thresholds in the test
are the ones in the code.

### T11.5 The selected card is *selected* — **done**

Whether or not the detail stays on the card, a selected card must look selected. Today the
selection is expressed only by the neighbourhood dimming (`focus` in the render model,
`GraphView.tsx:340`) and by the DOM card's `setSelectedStyle` (which the host never calls). The
card's border is `theme.border` for a neutral or successful card and the status colour otherwise
(`cardTemplate.ts:135`) — so a selected card and an unselected one look identical.

**What was built.** The card template takes the selected node's id and gives that card the
contract's `theme.selection` as its border, plus a ring that does not change the card's box (a
border *width* change would move the content inside a fixed 220×72 box). The state is a theme
token, so it follows the theme: the template is rebuilt with the theme, and the selection survives
the change. The card also carries `data-selected="true"`, so a test — and a screen reader's mirror
— can see it.

The library's `setSelectedStyle` (a `selected` class on the DOM node) stays unused: the host owns
the card's markup, so the host owns the card's selection state.

Done when: the selected card carries a visible, theme-token-derived selection state (the contract
already has `theme.selection` and `theme.focus`), and the state survives the theme change.
Verify: `packages/session-graph/component-tests/graph-detail.spec.ts` — a case that selects a node
and asserts the card's selected state.

---

## 2. T12 — Windows: durable, movable, resizable overlays over the map

**The idea.** A window is a panel that floats over the map, holds content, and can be moved,
resized, focused and closed by the reader. It is *durable*: it stays where the reader put it until
they close it. It is a **host surface**, not a node (F4), and it is **screen-space**: it does not
move when the camera moves, because a window you are reading should stay still.

### T12.1 The window model — **done**

| Property | Value | Why |
|---|---|---|
| Owner | the **host** (`packages/session-graph`), not the library | a window is chrome, not graph content; it must not enter the render model, the spec or the export |
| Placement | screen space, inside the canvas region (`GraphView.tsx:1052`, `position: relative`) | a window in world space would be sheared by a tilted camera and would fight the LOD (F4) |
| Layer | a dedicated layer above the CSS3D layer (`z-index: 1`) and the CSS2D layer (`2`), below the search/legend overlays | the library's own chrome uses 9997–10001; a window should sit *under* the modal-ish overlays |
| Content | **host-supplied**: a render function or a slot | the library must not know what a "log" or an "action" is (the host-owns-semantics rule) |
| Anchor | free-floating by default; optionally pinned to a node | T12.4 |
| Persistence | per session, in the app's layout store beside the other graph preferences | the same place the detail mode and the peek live (`packages/app/src/shell/state/layout.tsx:88-106`) |
| Keyboard | the topmost window takes focus; `Escape` closes it; focus returns to the map | the a11y contract; the turn map and the search already do this (`ScopedOverlay`, `spacegraphjs/src/overlays/ScopedOverlay.ts`) |

**What was built.** `GraphWindows` (`packages/session-graph/src/ui/GraphWindows.tsx`) is the manager:
one component that owns the gestures and holds no content. The state is `{ id, kind, nodeID?, left,
top, width, height, z, pinned? }` ✓ — the plan's list, verbatim. The *host* owns that list (the app
persists it), the view proposes a window's first placement (it knows how much room the canvas has),
and the manager reports what the reader did.

The layer sits at `z-30` inside the canvas region: above the canvas (1) and the CSS2D layer (2),
below the search and legend overlays.

### T12.2 The window manager — **done**

One component owns the windows: create, focus, close, move, resize, z-order, and the keyboard
contract. It holds no content of its own.

- **Moving**: a title bar with a `pointerdown` → `pointermove` → `pointerup` cycle, with
  `setPointerCapture`. In screen space the pointer delta *is* the window delta — **no pixel-to-world
  conversion is needed** (contrast `NodeResizer`, which converts because it resizes a world-space
  node, `spacegraphjs/src/utils/nodeResize.ts:79-96`).
- **Resizing**: a corner handle; the same pointer cycle; the size is written in CSS pixels. Minimum
  size, and a maximum that keeps the window inside the canvas region.
- **Focus and z-order**: clicking a window brings it to the front; the front window is the one that
  answers `Escape`.
- **Clamping**: a window dragged off the canvas is clamped back, or parked as a title bar only.
- **The library's contribution is optional.** A small exported helper (say
  `spacegraphjs/src/utils/screenWindow.ts`: install the pointer listeners on an element, write
  `style.left/top/width/height`) would be reusable and unit-testable without a renderer, and would
  save every host from re-implementing pointer capture. The host may equally own it. **Do not** add
  a node type, and **do not** build on `PanelNode`'s dead `onPanelDrag*` API (F4).

**What was built.** The manager is the host's, in plain DOM: a title bar that moves the window, a
corner that resizes it, a close button, and a pointer cycle with `setPointerCapture` ✓. The window
is clamped to the canvas region ✓ (the region is the box). Clicking a window raises it ✓ (the front
window answers `Escape` ✓).

**One thing the plan did not say, and the implementation had to answer.** `Escape` on a window must
close the window and *not* clear the reader's selection — but the library's own `Escape` handler
(which clears the selection) listens on the document body, and a bubble-phase handler on the window
arrives *after* it. The window therefore listens in the **capture phase**, and stops the key there:
the window answers `Escape` before the map does ✓.

**The library's contribution stayed optional.** The manager is plain DOM in the host; no helper was
added to the library, and no node type was added (stop rule 2 ✓).

Done when: a window can be opened, moved, resized, focused and closed, and the map does not move
when it happens.
Verify: `packages/session-graph/component-tests/` — a case that opens a window, drags it, resizes
it, and asserts the camera's viewport is unchanged.

### T12.3 The window kinds — **done**

The author's list — "plenty of room for detail and related widgets (contextual actions, logs,
etc.)" — plus the other reasons a window is wanted. Each kind is a *content contract*, not a
feature of the window:

| Kind | Content | Opened by |
|---|---|---|
| **node detail** | the existing `GraphDetailBody` (the shared body from T8.8) | the detail mode, or a button on a card |
| **contextual actions** | the actions a node offers: focus, open in transcript, open the child session, copy the link, reveal the file, show the diff | a button on the card or in the detail window |
| **output / log** | a tool's output, a session's event log, a subagent's transcript | a node action, or a "watch" action |
| **diff** | the changed files and their patches (the host's `GraphDiffSource` already loads them) | a `diff` node |
| **the equalizer** | T15's rules | the toolbar |
| **the legend / the gallery** | the existing overlays, promoted to windows | the toolbar |
| **scratch** | a free surface for notes the reader keeps next to the map | a toolbar action |
| **a second session** | another session's map, in a window | a cross-session action (TODO.3 D4) |

The point of the list: **the window is a generic surface, and each kind is a plug.** The manager
must not know them; the host registers content.

**What was built.** Two kinds, and the manager knows neither:

- **node detail** — the existing `GraphDetailBody` ✓, opened from the detail surfaces by a new
  button ("open in a window") in the shared detail header ✓, so both the popover and the side panel
  offer it;
- **the legend** — the legend's content, extracted from its overlay shell into `GraphLegendBody` ✓,
  so a window can hold it. (The toolbar's own legend button still opens the overlay; T14.2 moves it
  into a window.)

The kinds are a registry in the view (`windowContent`), and the *host* decides which windows exist
✓ — the manager only ever receives a `kind` it does not interpret ✓.

Done when: the window manager takes content as a parameter, and at least two kinds (node detail and
one more) are implemented on top of it.
Verify: the component test; the kinds are listed in this file.

### T12.4 Anchoring: free, pinned, or world-anchored — **done**

Three behaviours, one window:

- **Free** (default): the window stays where it was put, in screen space, while the camera moves.
- **Pinned to a node**: the window follows its node. The anchor is the node's screen position, which
  the renderer already reports — `GraphRenderer.getNodeScreenPosition?`
  (`spacegraphjs/packages/renderer/src/index.ts:218`, added in T8.8). The window re-anchors on
  every `viewportChange`; the popover already does this
  (`packages/session-graph/src/ui/GraphView.tsx`, the `createAnchor` helper).
- **World-anchored**: the window lives *in the map* — it moves and scales with the camera, like a
  card. This is the "overlay node" reading of the author's phrase, and it is the one option with a
  real cost: the window's content becomes a CSS3D element, so it is sheared by a tilted camera, it
  is culled by LOD, and its text is scaled by the camera. It is **deferred** (§0.6) and recorded here
  so it is a choice, not an accident.

**What was built.** Free is the default ✓. A window can be pinned (`pinned: true`) and then rides
its node: the view reads the node's screen position on every viewport change ✓ (the same anchor the
popover uses), and the window's placement follows it ✓. The world-anchored window stays deferred
(D8) ✓.

Done when: a window can be pinned to a node and follows it across a pan, and the plan says which
behaviour the default is.
Verify: the component test pins a window, pans the camera, and asserts the window followed.

### T12.5 The window survives a session — **done**

The windows are how the reader has arranged the map. They belong in the same per-session store as
the detail mode (`packages/app/src/shell/state/layout.tsx:88-106`): a list of
`{ id, kind, nodeID?, left, top, width, height, z, pinned? }`. The store is a `Persistence.struct`
with optional fields, so a new field needs no migration.

The content itself is **not** persisted (a log is not worth storing; the detail is re-derived from
the model). A window that cannot be rehydrated is dropped, not restored empty.

**What was built.** The per-session graph state gained a `windows` field: an array of the plan's
struct ✓, optional ✓ (no migration), beside the detail mode and the peek ✓. The app writes it
whenever the reader moves, resizes, raises or closes a window ✓. The content is re-derived: the
window's `kind` and `nodeID` are stored, and the view rebuilds the body from the model ✓ — so a
window whose node is gone shows "this node is no longer on the map" instead of an empty frame ✓.

Done when: a window's placement survives a session switch and a reload.
Verify: the app e2e — open a window, switch sessions, come back, and assert its placement.

---

## 3. T13 — The background pans under the left button

**The request.** "Dragging on the background with left button, since it otherwise has no action,
should pan like it does with the right button — but only when dragging on the background."

**The facts (F5).** The camera's mouse map is a bitmask on `PointerEvent.buttons`; the left button
belongs to the nodes; a left press on empty background takes no branch at all, so a press emits
`background:click` and a drag emits nothing.

### T13.1 The change, and where it belongs — **done**

**It belongs in the library's `InteractionPlugin`, not in the camera fingering.** The camera
fingering (`spacegraphjs/src/input/fingerings/CameraFingerings.ts:20-23`) has no raycaster and does
not claim the gesture (`claimsGesture = false`, `:27`), so a blind left-button pan there would pan
*and* drag the node under the pointer. The interaction plugin already knows whether a node was
picked (`spacegraphjs/src/plugins/InteractionPlugin.ts:109-113`).

The branch, in outline:

1. `handlePointerDown`: if `button === 0` and the raycast found **no node** and **no edge** and
   `shiftKey` is not held → remember the start point; do not select.
2. `handlePointerMove`: while that state is active → `cameraControls.pan(dx, dy)` with the delta
   since the previous point, and return (no hover update while panning).
3. `handlePointerUp`: clear the state. The existing ≤5px path still emits `background:click`, so a
   *click* on the background keeps clearing the selection, and a *drag* does not.

The gesture must be a **library option**, not a hard-coded change: the library's mouse map is
public contract (`README.md:383-393`), and hosts that want the old behaviour must be able to keep
it. `SpaceGraphOptions.input` already declares `enableCameraPan`, `enableBoxSelect`, `enableDrag`
and friends — and **none of them is read anywhere** (`spacegraphjs/src/types.ts:462-490`; the
`applyDefaultInputConfig` function ignores its config argument). T13.1 therefore includes
**wiring the input config that already exists**, or replacing it with one honest set of options.

**What was built.** The branch is in the interaction plugin, exactly as the plan drew it. The option
is `input.interaction.enableBackgroundPan`, **on by default**: over the void the left button has
nothing else to do, and a host that wants the old map turns it off.

**The input config is honest now.** Every option it declares is read: `enableHover`,
`enableBoxSelect`, `enableDrag` and `clickThreshold` are wired in the interaction plugin, and the
new `enableBackgroundPan` joins them. The two sections that were *promises* — a camera section
that duplicated `options.cameraControls` (which is read) and a history section that duplicated the
history plugin's own option (which is read) — are gone, and the camera gained the two setters the
option needs (`setPanEnabled`, `setZoomEnabled`).

Done when: a left drag on the background pans the map, a left drag on a card still moves the card, a
left click on the background still clears the selection, and a host can turn the new behaviour off.
Verify: `cd spacegraphjs && pnpm exec vitest run` — the mouse contract test
(`test/mouse-contract.test.ts`) and the interaction e2e
(`test/e2e/mouse-interaction.spec.ts:133-165`, the case that a left drag on a card moves the card).

### T13.2 The conflicts, written down — **done**

| Gesture | Today | After T13.1 | Test |
|---|---|---|---|
| left drag on a **card** | moves the card | unchanged (the raycast found a node) | the mouse contract ("does not pan when the drag started on a node") and the e2e ("a control inside a card takes the mouse, and the card still moves by its background") |
| left drag on a **card's control** | nothing (the card's `isDraggable` veto) | unchanged | the e2e, unchanged |
| left drag on the **background** | nothing | **pans** | the mouse contract ("pans the view when the left button drags over the background") and the e2e ("the left button pans the view over the background") |
| left **click** on the background | `background:click` → clears the selection | unchanged (the ≤5px path) | the mouse contract ("keeps the click") and the e2e ("a click on the background still reports a background click") |
| shift + left drag | box-select | unchanged (the shift branch is checked first) | the mouse contract ("does not pan when the shift key asks for a box selection") |
| right drag | pans | unchanged | the mouse contract and the e2e, unchanged |
| middle drag | orbits | unchanged | the mouse contract, unchanged |
| left drag on a **window's title bar** | n/a | the window moves (T12), and the map does not | T12's test |

The last row is why the background pan must be **gated on the pointer being over the canvas** and
not over a host surface: a window sits over the canvas, so its pointer events must not reach the
canvas. The library's DOM cards already relay their events to the canvas
(`spacegraphjs/src/nodes/DOMNode.ts:230-333`); a host window must *not* — it must stop them.

**One thing the table does not say, and the e2e found.** The library emits `background:click` and
leaves the *selection* to the host: the demo does not clear the selection on a background click,
and the fork's host does. So the contract the e2e pins is the event, not the selection.

Done when: the table above is in the library's mouse map and every row has a test.
Verify: the mouse contract test grows a case per row.

### T13.3 The mouse map, written down and kept true — **done**

The author's own guide ("the mouse map") is the reference; the library's README table
(`README.md:383-393`) and the fork's `SPACEGRAPH.md:310-318` must agree with it. Every entry names
the button, the target, the effect, and what it *replaces* — because the left button now has two
meanings depending on what is under the pointer, and a reader must be able to learn that.

**What was written.** The library's README and the fork's `SPACEGRAPH.md` both gained the row, in
the same words: *left button + drag on the background → pan the view — over the background the left
button has nothing else to do*. Both also say how to turn it off
(`input.interaction.enableBackgroundPan`), because a map that a host cannot narrow is a map that
every host has to fight.

Done when: the three documents agree, and the fork's guide is the canonical one.
Verify: a test that reads the fork's table and checks every gesture it names is reachable.

---

## 4. T14 — The toolbar, organized

**The problem.** Nineteen controls (F6) in one flex row, with the overflow menu only below 640px.
The author found it cluttered before it grew: T8.8 added two more (the detail mode, the peek).

### T14.1 Measure the budget first — **done**

The toolbar's width at 1440 in the app, per control, and the width the panel actually has. The
number that matters: **the toolbar's content width against the panel's width**, because the toolbar
wraps (`flex flex-wrap`) and a wrap pushes the back control onto a second row — where the app's
floating header hint covers it (that is a real failure the e2e caught during T8.8).

**Measured** (the graph toolbar in a 1440px panel, in the browser):

| control | width |
|---|---|
| the representation (graph · ribbon · matrix) | 178px |
| the level (overview · execution · detail) | 213px |
| the camera (zoom out · the percent · zoom in) | 85px |
| fit | 20px |
| **the "Draw" menu** | 81px |
| **the "Show" menu** | 109px |
| the end block (search, export, the renderer label, back) | 227px |
| **the row** | **913px** |

The row fits on one line while the panel is at least **913 + 16 (the padding) + 72 (the app's
floating header) = 1001px** wide. Below that the row wraps ✗ — measured: one row at 1000px, two
rows at 950px.

Done when: the per-control widths and the total are in this file.
Verify: a component test that measures the toolbar's rendered width at 1440 and 1100 and asserts it
fits on one row.

### T14.2 Group by axis, not by kind — **done**

The controls are not nineteen things; they are four **axes**, and a reader thinks in axes:

| Axis | Controls | Where it lives |
|---|---|---|
| **what is shown** | representation (graph/ribbon/matrix), level (overview/execution/detail) | **inline** — these are the map's *subject* |
| **where the camera is** | zoom out/in/percent, fit | **inline** — the camera is always in play |
| **how it is drawn** | layout strategy, depth, billboard, the file lens | one popover: "Draw" |
| **what it says** | the detail mode, the peek, the turn map, the legend, the gallery | one popover: "Show" |
| **commands** | export, the renderer label, back | inline at the end |

The rule: **at most four things are inline; everything else is one click away.** The overflow menu
stays for the narrow case, but it is not the primary organisation. Two of the popover's entries (the
legend, the gallery) open a **window** rather than an overlay, once T12 exists — the popover is
their doorway.

The popovers are `<details>` dropdowns, the pattern already used for the layout chooser
(`GraphToolbar.tsx:116-146`) and the export menu (`:284-320`); the *icon* is the affordance, the
label names the current value.

Done when: the toolbar shows at most the four inline controls of the "what is shown" and "where the
camera is" axes, plus two popovers and the end block, at 1440.
Verify: the component test measures the toolbar's width and counts the inline controls.

**What was built.** The row is now:

| axis | controls | where it lives |
|---|---|---|
| **what is shown** | the representation, the level | **inline** |
| **where the camera is** | the zoom, the fit | **inline** |
| **how it is drawn** | the layout, the depth, the billboard, the file lens | the **"Draw"** menu |
| **what it says** | the detail mode, the peek, the minimap, the turn map, the legend, the gallery | the **"Show"** menu |
| **commands** | the search, the export, the renderer label, back | **inline at the end** |

Four things are inline and everything else is one click away ✓. The menus are `<details>` dropdowns
✓ (the pattern the layout chooser and the export menu already used ✓), the *icon* is the affordance
✓ and the label names the current value ✓ ("Lanes", "Side panel").

Two details the change had to answer:

- **a toggle leaves its menu open** (the billboard, the file lens, the peek), so the reader sees the
  state they just changed; a *choice* (the layout, the depth, the detail mode) closes the menu ✓;
- **the accessible name of a toggle does not change with its state**: the billboard's visible label
  says "Billboard cards off" when it is off, but its accessible name stays "Billboard cards" and the
  state is in `aria-pressed` ✓ — a name that changes is a name a reader cannot find again.

### T14.3 The minimap is a window too — **open**

The minimap is the one control that is *already* an overlay over the canvas
(`packages/session-graph/src/ui/GraphMinimap.tsx`, drawn inside the canvas region at
`GraphView.tsx`), and it is the one control that makes the toolbar's end of the row busy. Under T12
it becomes a window: movable, resizable, and closable, like the rest.

**Not done in this pass.** The window manager (T12) is in place and the minimap's *toggle* moved to
the "Show" menu ✓, so the remaining work is small: a `minimap` window kind (the content is the
existing `GraphMinimap`) and the toggle becomes "open the minimap in a window". It is left open
rather than half-done, because a half-migrated minimap would be neither an overlay nor a window.

Done when: the minimap is a window and the toolbar's inline row is four controls.
Verify: the component test.

### T14.4 The icons that do not exist — **done**

Five controls name icons that are not in the catalogue (F6) and therefore render as a plus sign:
`cube` (billboard), `download` (export), `image` and `code` (export's SVG and JSON items), `branch`
(turn map). The catalogue has good alternatives — `split` and `unified` for the billboard,
`outline-worktree` or `filetree` for the turn map, `outline-share` or `archive` for the export — and
the export menu's items can simply be text.

**The deeper fix: a missing icon must not be silent.** `Icon` falls back to `"plus"`
(`packages/ui/src/icons/icon/icon.tsx:52`), which is how five buttons came to look alike without
anyone noticing. The fallback should be a development-time warning (and a visibly broken glyph in
development), never a plausible icon in production.

**What was built.**

- **the five icons are real now**: the billboard is `workspace-isolated`, the export is
  `outline-share`, the turn map is `outline-worktree`, and the export's items are **text** ✓ (the
  plan's own suggestion ✓). A sweep of every `<Icon name=…>` in the packages finds no missing name
  left in production code ✓ (seven remain in *stories*, which are pre-existing and harmless);
- **a missing icon is a development-time error**: `Icon` warns once per unknown name ✓ and draws a
  crossed-out glyph ✓ instead of a plus sign that looks like a real icon ✓. In production it draws
  the broken glyph and nothing else — a wrong icon is worse than no icon ✓.

Done when: every icon the graph names exists in the catalogue, and an unknown icon warns in
development.
Verify: a test that walks the toolbar's icons and asserts each is in the catalogue.

### T14.5 The narrow case — **done**

The compact threshold is 640px of the *view's root* width (`GraphView.tsx:212-225`), which is not
the toolbar's width. After T14.2 the toolbar is short enough that the overflow menu may only be
needed much lower — or the *primary* popovers may become the only organisation, with the inline row
kept to the subject and the camera.

**What was built.** The threshold follows the measurement: the row needs 1001px (T14.1), so below
**1000px** the secondary controls collapse into the overflow menu ✓ — the subject and the camera stay
inline ✓, and the renderer label (the widest thing left in the end block) is hidden in the narrow row
✓. The overflow menu keeps the same items as the two menus ✓, so nothing is lost, and the app's e2e
opens whichever menu the row has ✓.

**What was still open.** The narrow row is 747px wide, so a panel narrower than that still wraps —
in the app, the session panel is often narrower than the graph's own row. The fix is to make the
narrow row narrower still: the level control (213px) could become a menu like the layout chooser,
which would bring the row to about 530px. That is a separate, small change, and it is not done here.

Done when: the compact threshold follows from the measured widths, not from a round number.
Verify: the narrow-viewport component test.

**What the hybrid forced (T16.3).** A half-width map is a narrow map, so the narrow row had to get
narrower: the **level control is a menu in the compact row** ✓ (the same `<details>` pattern as the
layout chooser ✓), which brings the row to about 530px ✓. The threshold moved with the row: the
split control added 28px to the end block, so the row needs 941px of controls, and the row is
compact below **1030px** ✓.

---

## 5. T15 — The equalizer

**The idea.** "An 'equalizer' panel that adjusts sizes/styles of nodes according to their type,
age, etc." A set of rules over the graph's own vocabulary, applied to the cards, with a panel to
edit them.

### T15.1 The rule model — **done**

A rule is a **predicate over a node** plus an **effect on the card**. The vocabulary already exists
(F7, and `packages/session-ui/src/graph/model.ts:69-84`): `kind`, `status`, `time`, `turnID`,
`derived`, `clusterOf`, `data.category`, `data.agent`, `data.path`, `data.exit`, `data.attempt`.

| Effect | What it changes | Where it is applied | Cost |
|---|---|---|---|
| **size** | the card's world box | `nodeSize()` (`packages/session-ui/src/graph/layout.ts:64-66`) — the *one* function the layouts and the adapter read | the layout re-runs (F1) |
| **style** | the accent, the border, the glyph's emphasis, the font | the card template (`cardTemplate.ts:125-158`) | a model rebuild |
| **opacity / emphasis** | how loud a card is | the card's inline style, or the node's `data.opacity` | a model rebuild |
| **lifetime** | a card fades as it ages | the card template, against `node.time` | a model rebuild |

A rule set is a list; the panel edits the list; the list is persisted per session with the other
graph preferences.

**What was built.** `packages/session-ui/src/graph/equalizer.ts` holds the model, the evaluation and
the presets:

```ts
export type EqualizerRule = {
  id: string
  kind?: NodeKind
  status?: NodeStatus
  scale?: number      // the size effect: the layout reads it
  hue?: number        // the style effect: the accent reads it
  muted?: boolean     // the style effect: the card loses its voice
  fadeAfter?: number  // the age effect: the card fades, and nothing moves
}
```

The **last matching rule wins** ✓, so the reader's order is their order ✓. The rules are persisted
per session beside the windows ✓ (`sessionView[session].graph.rules` ✓).

### T15.2 The size effect has a layout cost, and it must be paid deliberately — **done**

A size change reaches the layout through `nodeSize()`: the lanes, timeline, tree and force layouts
read the per-node width to advance their cell cursor
(`spacegraphjs/src/layout/strategies.ts:367`, `:432`, `:454`, `:588`, `:618`). So a size rule
**re-runs the layout** and **moves nodes** — the same thing a level or strategy change does today
(`packages/session-graph/src/ui/GraphView.tsx:234-256`, the layout history keyed by
`session:strategy:level`).

That is acceptable *if it is explicit*: changing the rules is a deliberate act, and the map
re-lays-out under it, exactly as it does when the reader changes the level. It is not acceptable
if a rule changes silently with time (an "age" rule that fades a card as it ages must not resize
the layout every minute).

The rule: **size effects re-lay-out; style effects rebuild the model; age effects may do neither**,
because age is a continuous input and a continuous input must not move the map under the reader.

**What was built.** The layout takes a `nodeSizeFn` ✓ (`layoutGraph(…, { nodeSizeFn })` ✓) — the
library's strategies already read `config.nodeSizeFn` ✓, so no library change was needed ✓. The
view passes a size-aware function ✓, and **the rules are part of the layout key** ✓
(`session:strategy:level:rules` ✓), so a rule change re-lays-out like a level change ✓ and the
positions stay stable while the rules do not change ✓.

The **age effect is excluded from the layout** ✓: a fade is the card's own opacity ✓, computed in
the card template against the node's time ✓ — it costs a model rebuild ✓ and never a re-layout ✓.

Done when: the rule model says which effect costs what, and the age effect is excluded from the
layout.
Verify: `packages/session-ui` — a test that a style-only rule leaves the positions unchanged.

### T15.3 The style effect needs a colour scheme that can carry it — **done**

The accents are hard-coded HSL triples (F7). An age rule needs a second dimension (hue *and*
lightness, or a separate "muted" accent), and a "by type" rule needs the kind and the category to
be reachable from one place. The card template already resolves the hue in one function
(`hue()`, `cardTemplate.ts:55-60`) and exports `kindAccent`/`categoryAccent` so the legend cannot
drift. The equalizer extends that resolution: **one function maps a node to its accent**, and the
legend, the cards and the equalizer's preview all read it.

Whether the new roles become theme tokens or stay in the HSL scheme is a decision (§10.1). The
contrast test (`packages/session-graph/src/ui/contrast.test.ts`) must cover any new colour in both
schemes.

**What was built.** `accentOf(node, rules)` is the one function ✓: the rules set the hue ✓, a muted
rule keeps the hue and loses the voice (a darker accent and a fainter tint ✓). The cards read it ✓,
the bands read it ✓, and the legend reads it ✓ (`kindAccent(kind, rules)` ✓ — so the key and the
picture cannot disagree ✓).

The muted accent is the same hue at a lower lightness ✓ — the same two colours the scheme already
has ✓ — so the contrast audit still covers it ✓ (`contrast.test.ts` ✓ passes ✓).

Done when: one function maps a node to its accent, the legend and the cards read it, and the
contrast audit covers the new colours.
Verify: `cd packages/session-graph && bun test src/ui/contrast.test.ts`.

### T15.4 The panel is a window — **done**

The equalizer's UI is a window (T12), not another toolbar control: it needs room, it is edited
rarely, and it should stay where the reader put it. Its contents: one row per rule, a preview
swatch per rule, and a reset.

**What was built.** The panel is a window kind (`equalizer`) beside the legend's, so the manager
knows neither: it holds the presets, the rules they make, a size slider per rule, a way to drop a
rule, and a reset. The rules are the host's — the app persists them per session and the panel
reports what the reader did ✓. The toolbar offers it in the **Draw** menu, next to the arrangement
(it is the same kind of choice: how the map is drawn) ✓.

**What the panel does not do.** It does not write rules from scratch. The presets are the product
(T15.5), and a free-form rule editor is a larger surface than the plan asked for; the panel edits
what the presets make (the size, and which rules are in force).

Done when: the equalizer opens as a window and edits the persisted rule list.
Verify: the component test — change a rule, assert the cards change.

### T15.5 The presets — **done**

A reader should not have to write rules to get value. The presets are the product: "errors are
larger", "files older than the last turn are dimmer", "subagents are as large as their turn". The
panel ships with a few, each a named rule set, and the reader can start from one.

**What was built.** The three presets exist as named rule sets ✓ (`EQUALIZER_PRESETS` ✓): "errors
larger" ✓, "subagents as large" ✓ and "old files dimmer" ✓. The panel lists them ✓ and applies
one on a click ✓ — the rules it makes are then listed with a preview swatch, a size, and a way to
drop them ✓.

Done when: the panel ships with at least three presets, each of which visibly changes the map.
Verify: the component test, with a screenshot per preset.

---

## 6. T16 — The map and the log together (the hybrid mode)

**The request.** The author's observations were about the map's own furniture, but the product's
own design argument (SPACEGRAPH.md §1.3, §1.6) had said something the build never delivered: *the
transcript stays familiar; the graph appears where it answers a question*. The hybrid existed only
as a scoped overlay over one turn. The rest of the session — the whole map, the whole log — could
not be looked at together.

### T16.1 The mode, and the arrangements — **done**

The hybrid is a **mode** of its own: `transcript | graph | hybrid`. Three arrangements say how the
two surfaces meet — `stacked` (the map above the log), `side` (the map beside it), `floating` (the
map over the log, movable and resizable) — and the reader picks one. They are one geometry with
three readings, not three features.

**What was built.**

- the **vocabulary** (`session-ui/src/graph/vocabulary.ts`): `GRAPH_MODES`, `GRAPH_ARRANGEMENTS` and
  `GRAPH_SIDES` — the session's words, next to the level, the strategy and the detail mode;
- the **panel** (`packages/app/src/session/graph/session-graph-panel.tsx`): the log's pane is the
  log's *home*, and the map is arranged around it with CSS `order` rather than by moving nodes, so
  entering or leaving the hybrid never detaches the transcript;
- the **arrangement control** in the map's **Draw** menu, and the map's side, so the reader can put
  the map first or last;
- the **way in**: the map's toolbar offers "show the log beside the map", and `graph.hybrid`
  (`mod+shift+h`) toggles the mode.

### T16.2 The bridge — **done**

The hybrid is worth nothing if the two surfaces do not talk.

- **the map moves the log**: picking a node reveals its message in the log, without leaving either;
- **the log moves the map**: the turn the log is reading is marked on the map's card, so the
  reader sees where they are in the session.

### T16.3 The ergonomics the split forced — **done**

A half-width map is a narrow map, and the toolbar's row does not fit in half a panel.

- the **level control becomes a menu** in the compact row (T14.5's open item): the narrow row is
  about 530px instead of 747px;
- the **compact threshold follows the measurement**: the row needs 941px of controls (the split
  control added 28px to the end block), so the row is compact below 1030px, not 1000px;
- the **log's place is kept**: the panel's composition never moves the transcript's DOM, so the
  reader's scroll survives every move between the modes;
- the **log's text size is a slider at hand**: a split panel's log is narrow, so the reader wants the
  text bigger or smaller, and a setting panel is the wrong place for that. The slider sits at the
  top of the log's pane, always visible, and scales the theme's own sizes (`--text-scale`) so the
  line heights follow.

### T16.4 The map frames itself for the pane it has — **done**

A pane that changes shape needs a new frame: the orthographic view holds the world height, so a
shorter pane shrinks the cards below reading. The map re-frames when the *shape* changes — the
host moved it into the hybrid, or the reader chose another arrangement — and not when the reader
merely resizes: their zoom and their pan are theirs.

Done when: the map and the log hold the panel together, the log keeps its place, and the reader can
choose how they meet.
Verify: the app e2e — the hybrid shows both surfaces, the arrangement changes it, and picking a node
moves the log.

---

## 7. T17 — The map's own language: one axis, one level, one surface

**The author's words.** "I found the 'Ribbon', 'Matrix', etc. thing confusing — aren't these just
Layouts? The detail level should be something applicable to any Layout." And, on the whole surface:
"consider how to simplify the Graph UI by consolidating and reorganizing it." And, on the map's
depth: "are we making use of LOD to enable high detail when a node is viewed up-close?"

Three questions, one cause: **the map's vocabulary grew a second axis for a job the first axis
already did, and the level that should describe every layout is wired to only one of them.**

The facts that shape this section are **F8–F13 in §0.3** ✓ — measured in this tree, not assumed.

### T17.1 One layout axis — the decision — **planned**

- The representations become layouts:
  `LAYOUTS = ["lanes","timeline","hierarchy","tree","force","ribbon","matrix"]` — one list, one
  control, one name for the job. (T17.3 adds the eighth: the log's own shape.)
- The control is a **menu** (seven names do not fit a segmented control), inline, with the icon and
  the current value's name ✓ — the pattern the Draw menu already uses ✓. The Draw menu loses its
  layout row ✓, so the row does not grow.
- The persisted state migrates: the store's `layout` (the strategy) and `representation` (the
  family) become one `layout` field. A stored `representation` of `ribbon`/`matrix` wins;
  otherwise the stored strategy is kept. The graph state needs its **own** migration —
  `Persistence.migrate` with a legacy read shape
  (`packages/app/src/runtime/persistence/schema.ts`) — because the document-level chain
  (`layoutPersistence`) moves the document, not a field inside it ✓. Without it, a reader's saved
  ribbon would silently become the default layout.
- `representationLevel()` goes away, and with it the toolbar's `graphMode()`: **no control is ever
  disabled because of the layout** ✓.
- **the hybrid's own axis keeps its name.** The map's arrangement of nodes and the panel's
  arrangement of surfaces are different jobs in different domains, and the plan has one word for
  each: the **layout** is the map's, the **arrangement** is the panel's (T16.1 ✓).

Done when: one layout list, one control, and the level control is enabled for every
layout.
Verify: `cd packages/session-ui && bun test src/graph` — the layout and level vocabulary; the
app e2e — a stored `ribbon` still opens as the ribbon after the migration.

### T17.2 The level means the same thing in every layout — **planned**

The level is a **grain**, not a family. Every layout draws the level's units; a summary
layout packs them into its own grammar.

| layout | `overview` | `execution` | `detail` |
|---|---|---|---|
| `lanes`, `timeline`, `hierarchy`, `tree`, `force` | the session, the turns, the phase clusters | the phases' members: the tools, the files, the messages | + the reasoning, the diffs, the compactions |
| `ribbon` | a row per turn, one segment per phase | a row per turn, one segment per tool | + the reasoning and the diffs in the row |
| `matrix` | a row per turn, a column per phase | a row per turn, a cell per phase holding its tools | + the rest in the cell |

The general rule, which is what makes the table a rule and not a list: **a layout draws the
level's units; a summary layout packs them into its own grammar.** The node-link layouts already
honour it (the level is a filter over `minLevel` ✓); the summaries gain it by drawing a finer
grain instead of a different thing.

Done when: the level is a filter every layout honours, and the level control is never
disabled.
Verify: `cd packages/session-ui && bun test src/graph` — the ribbon and the matrix at each level;
the app e2e — the level control is enabled in the ribbon.

### T17.3 The log's own shape, as a layout — **planned**

**The question.** "Consider if there's a way to loosely emulate the log using the graph, possibly
as an alternate layout mode."

**The answer: yes, and it belongs on the layout axis.** The log is the transcript's shape; the
lanes are the *structure*'s shape. A layout that borrows the log's shape — a vertical reading
order, one block per turn, the activity nested under it, the sequence drawn as a spine — lets the
reader read the session the way they read it, with the map's information mixed in.

- **it is a layout, not a mode**: it is one more member of T17.1's list, and the level is its
  grain ✓ (at `overview` a turn is one card, at `execution` its tools, at `detail` its reasoning);
- **it is host-level geometry**, like the ribbon and the matrix
  (`packages/session-ui/src/graph/representation.ts` → a `logLayout(model)`), because it is the
  session's grammar, not a generic geometry;
- **it differs from the `timeline` layout**: the timeline keeps the lanes and wraps them per
  turn (the horizontal geometry); the log layout **drops the lanes** — a turn's nodes in one
  column in the order they happened, the phases as depth, the sequence as a spine.

**Why it earns its place.** The hybrid puts the log and the map side by side, and today they show
*different things* — a reader has to hold two readings of the same session in their head. With the
log layout, the map's pane can be a **second reading of the same session in the log's own order**,
so the two panes are comparable line by line. It is also the layout that makes the map
answer the investigative questions *in reading order* ("what changed after the failing test" is a
question about order).

Done when: the log layout draws a turn's nodes in the session's order with the structure as depth,
at every level.
Verify: `cd packages/session-ui && bun test src/graph` — the layout's positions; the app e2e — the
layout menu offers it and the map reads top to bottom.

### T17.4 One concept for the surfaces — **planned**

The map shows content in five different ways today: the gutter (the inspector), beside the node
(the popover), on the node (the card), in an overlay (the search, the legend, the gallery, the
minimap) and in a window. Five ways is a vocabulary the reader has to learn.

- **the overlays become windows.** The legend, the gallery and the minimap are windows (T14.3 is
  the last step of this, and it stops being an arbitrary leftover ✓), so "open a window" is one
  idea, and the "Show" menu becomes the **windows** menu: the detail, the legend, the gallery, the
  minimap, the turn map.
- **the detail's homes reduce to three**: the gutter, beside the node, in a window. The fourth,
  "on the node", is not a *home* but a **framing** — T11.2's decision C already said it: the card
  says identity and a summary, the record lives in a window. So the card behaviour becomes "the map
  frames what you picked" (a camera behaviour, next to the zoom and the fit) rather than a fourth
  place to read.
- the vocabulary becomes `off | panel | popover | window`, with the framing as a separate
  behaviour ✓.
- **the capture matrix grows with the surfaces.** The committed frames (31 today) are the
  project's only "look at it" ritual, and the 2026-10-19 visual review (T1.1–T1.18) is what
  found the last round of legibility defects. The consolidated row, the log layout and the
  windows need frames of their own ✓ — and a layout that is only ever seen in a test is a layout
  nobody has looked at.

Done when: every piece of content the map shows lives in a gutter, beside a node, or in a window,
and one menu opens them.
Verify: `cd packages/session-graph && bun test src` — the detail modes; the component suite — the
minimap opens as a window.

### T17.5 The detail the reader earns by moving closer — **planned**

**The question.** "Are we making use of LOD to enable high detail when a node is viewed up-close?"

**The answer today: no.** F11–F13 say why: the library's LOD is a cull, the host uses none of its
escapes, the DOM budget is spent in model order, and the card's own screen-size tier adds one line
and stops. The mechanism for the answer is already in the library — it is empty.

Three pieces, in the order they pay:

1. **the budget follows the camera.** The host knows the camera's centre (the viewport reports it
   ✓) and the model's positions ✓, and the adapter walks the model's nodes **in order** and stops at
   the budget (`ModelAdapter.build`: `cards < budget` over `visibleNodes`, F12). So the host can
   hand the adapter a model whose nodes are **ordered by their distance from the camera's centre**,
   and the flat budget is then spent on **what the reader is looking at** ✓. The layout is keyed by
   turn and ordinal, so the order does not move a node ✓ (F1) — it only decides which nodes get a
   card. No library change: the adapter already walks whatever order it is given. **One exception:
   the a11y list keeps the session's order** — a screen reader reads the session, not the
   camera ✓ — so the reorder is the render model's, not the model's ✓.
2. **a kind earns its card by proximity.** The host sets the library's per-node escapes
   (`data.minZoom`, `data.lod`): a kind that is only worth a card when the reader is close says so,
   and the far map is a map of dots rather than a map of tiny cards ✓.
3. **the card's LOD gains a band.** The tier is derived from the reading size (T11.4 ✓), so a fourth
   band is a fourth reading size — and because the card's box is fixed (F1), the nearest card
   **replaces** its summary with the kind's *content* (the output's first lines, the diff's files)
   rather than adding a fourth line to a box that cannot hold one.

**The library seam, and where it belongs.** The `high | medium | low` distinction the core computes
and never reads (F11) is the seam for "a node draws itself simpler when it is far" — a *generic*
capability, so it belongs in SpaceGraphJS, not in the host (the session-graph package's rule:
"Generic graph capabilities belong in SpaceGraphJS; if a capability is generic, add it to the
library first"). Until it is there, the host's answer is the two pieces it can do itself: the
proximity budget and the zoom bands.

Done when: the card nearest the reader is a card, the map's budget follows the camera, and the
nearest card says more than the one across the map.
Verify: `cd packages/session-graph && bun test src` — the render model's node order near the
camera; the app e2e — zooming into a cluster gives those nodes their cards.

---

## 8. T18 — The map and the log, tightened

**The state.** The hybrid (T16) put the two surfaces in one panel, and the bridge (T16.2) makes
them talk. What is left is the ergonomics of the pair: who follows whom, where the detail goes
when the map is narrow, how a keyboard reader moves between the panes — and the measurement that
decides whether the pair is worth keeping.

### T18.1 The map follows the log — **planned**

The map *marks* the turn the log is reading (T16.2 ✓) and leaves the reader to hunt for it. The
pieces are already there: `scaleWindow(model, keep)` keeps a turn in the drawn window ✓, the app
computes the active turn ✓, and the camera can frame a node ✓.

- the log's active turn **joins the map's drawn window** ✓ (one more turn in the list the scale
  window already takes);
- the camera **frames it** when it changes — as a **toggle**, because a camera that moves while the
  reader scrolls is a camera the reader did not ask for. The marker (T16.2) says where the reader
  is; the follow says where the map looks; they are two different promises, and the reader picks
  the second.

Done when: the map's window follows the log's active turn, and the camera follows only when the
reader asks.
Verify: the app e2e — scrolling the log moves the map's window; the follow toggle frames the turn.

### T18.2 One control for the surface — **planned**

The mode is three-valued (T16.1 ✓), but the entry points are scattered: the header's icon toggles
transcript↔map, the map's toolbar offers the split, and `graph.hybrid` toggles the hybrid. A
reader cannot see all three from one place, and the split is only reachable *from inside the map*.

- the session header's icon becomes a **menu**: **Transcript | Map | Both** ✓ — the three modes, in
  one place, named the way the reader thinks of them;
- the map's own "show the log beside it" and the `graph.hybrid` command stay ✓ (the command is the
  keyboard path, the menu is the discovery path).

Done when: one control offers the three surfaces, and the hybrid has a discoverable home.
Verify: the app e2e — the header menu switches between the three.

### T18.3 The detail's home follows the map's width (D9, unblocked) — **planned**

§0.6 deferred the `auto` detail mode "until G9 and G10 have produced evidence about which surface
wins". The evidence now exists: **the card speaks** (G9 ✓) and **the window works** (G10 ✓). The
answer is a rule, not a guess:

- the detail lives in the **gutter** when the map is wide, and in a **window** when it is narrow. A
  288px gutter out of a 631px map — the hybrid's `side` arrangement — is a third of the map, and a
  third of the map is not a map.
- the threshold is the map's own width (the host owns it ✓), the same measurement the toolbar's
  compact threshold already uses (T14.5 ✓).

Done when: the detail's home follows the map's width, and the reader never loses a third of the
map to a panel.
Verify: the component suite — a narrow map opens the detail in a window.

### T18.4 The hybrid's keyboard — **planned**

The hybrid is two surfaces and a divider, and none of it has been through the keyboard.

- the **divider is a keyboard-resizable separator** (the ARIA separator pattern: the arrows resize,
  `Home` and `End` take it to the ends) — the pointer is not the only way to size a pane;
- the two panes have a **defined focus order** and a way to jump between them (the map is a canvas
  with its own key map: `f` fits, `1`/`2`/`3` set the level, `/` searches ✓ — those keys belong to
  the map's region, and the log's keys belong to the log);
- the log's **text-size slider** is reachable and named ✓ (a range input with an accessible name ✓).

Done when: the hybrid is usable without a pointer.
Verify: the component suite — the divider resizes from the keyboard; the app e2e — the map's keys
do not fire while the log has focus.

### T18.5 The measurement (T2.2, carried) — the gate on all of this — **planned**

The evidence is the product's decision, and `SPACEGRAPH.md` §10 makes it the critical path: if the
map does not beat the transcript on the five investigative tasks, **stop feature work and publish
the finding**. T17 and T18 are ergonomics; they are worth doing while the study is arranged, and
the study's result decides whether the map becomes a mode of the product or a curiosity.

What exists: the app counts the actions (`Metrics`, `?graphMetrics=1` ✓ — the mode switches, the
search, the selections, the fits, the zooms, the turn maps). What is missing is the *task* side:

- the **protocol**: the five questions over the canonical fixture, each with its answer key, so two
  people (or the same person twice) are scored the same way;
- the **counterbalance**: the transcript and the map are one toggle away (T16.1 ✓), so the order of
  the two surfaces can be swapped per participant without any new machinery;
- the **readout**: success, time, wrong turns, interactions, preference (1–7) and the quotes — the
  `Metrics` counter is the interactions column, and the rest is a form and a stopwatch.

**The rule this plan adopts:** T17 and T18 are *ergonomics work*; they do not commit the product
to the map. The study does.

Done when: the protocol, the counterbalance and the readout exist, and the study can be run
without changing the app.
Verify: the app e2e — the counter and the mode switch are enough to score a session; the protocol
is in this file.

---
## 9. Deferred and future seams

| ID | Item | Unblock condition | Seam already present |
|---|---|---|---|
| D8 | a world-anchored window (T12.4) | a reader wants a panel that travels with the map | the CSS3D layer, `HtmlNode` |
| D9 | the `auto` detail mode | evidence from G9 and G10 about which surface wins | `DetailMode` |
| D10 | windows in the export (a saved map with its windows) | the export grows a "workspace" format | `renderToSVG`, `serializeRenderModel` |
| D11 | a window per session in a split view | cross-session graphs (TODO.3 D4) | the per-session store |
| D12 | an equalizer for the *layout* (not the cards): lane pitch, column width | the layout strategies gain a policy surface | `LayoutConfig` (`standardSize`, `nodeSizeFn`) |
| D13 | the mouse map grows a third gesture (a modifier for a third dimension) | a 3D map that earns it | the depth spectrum |
| D14 | the library's `high \| medium \| low` LOD consumed, so a node draws itself simpler when it is far | the library reads the level it already computes (F11) | `Node.computeLOD`, `RenderContext.shouldRender` |
| D15 | the log's *text* in the map: the log layout carrying the messages' own words, not the map's cards | the host decides that a layout may render prose (T17.3) | the card template's `summary` |

---

## 10. Decisions, risks, stop rules

### 10.1 Decisions this plan makes

| # | Decision | Reason |
|---|---|---|
| 1 | **The card's box belongs to the layout; the detail does not go on the card** | the box is fixed by `nodeSize()` and the layout's cell cursor (F1), and at the legibility floor a detail line is 5.5px (F2, F3) — the card can carry identity and a summary, not a record |
| 2 | **A window is a host surface in screen space, never a node** | a node is world-space: it scales, shears, is culled by LOD and enters the spec and the export (F4) |
| 3 | **The background pan is a library behaviour behind an option** | the mouse map is public contract, and the left button already means "the nodes" (F5) |
| 4 | **The toolbar shows the subject and the camera inline; everything else is one click away** | nineteen controls do not fit, and the overflow menu below 640px is a fallback, not a plan (F6) |
| 5 | **Size rules re-lay-out the map; style rules do not; age rules never do** | a continuous input must not move the map under the reader |
| 6 | **A missing icon is a development-time error, never a plausible glyph** | five buttons rendered as the same plus sign for as long as nobody looked (F6) |
| 7 | **The card's line is its kind's own fact, and a kind with nothing to add adds no line** | 33% of the fixture's cards would have said nothing the label did not, and an empty line is worse than no line (T11.1, T11.3) |
| 8 | **The reading size is 9px, and every tier boundary is derived from it** | a boundary is the width at which the next line reads; one number moves them all, and the author can change it (T11.4) |
| 9 | **In the `card` mode the camera frames the selected node, and only the selection moves it** | the tier is measured in screen pixels, so a card that stays small cannot say anything; the fit's legibility floor is the card's reading width (T11.2) |
| 10 | **The hybrid is a mode, and the arrangement is the reader's choice** | one axis (which surfaces) and one axis (how they meet) is two questions a reader can hold; a single fixed split would be one layout the author has to live with (T16.1) |
| 11 | **The log's pane is the log's home; the map is arranged around it** | moving the transcript's DOM resets its scroll, and the reader's place in the log is the whole point of the hybrid (T16.3) |
| 12 | **The equalizer's panel edits the presets' rules; it does not write rules from scratch** | a free-form rule editor is a larger surface than the map needs, and the presets are the product (T15.4, T15.5) |
| 13 | **The layout is one axis** — the representations are layouts, and no control is disabled because of them | the author's own words ("aren't these just Layouts?") and the facts agree: the ribbon and the matrix are host-level layouts like the strategies, and the level was greyed out for two of the three (F8, F9) |
| 14 | **The level is a grain, not a family** — every layout draws the level's units, and a summary layout packs them into its own grammar | a level that is disabled for two layouts is a control that lies, and the model already carries the grain in `minLevel` (F9, F10) |
| 15 | **The log's shape is a layout, not a mode** | the map's pane can be a second reading of the same session in the log's order, which is what makes the hybrid's two panes comparable (T17.3) |
| 16 | **Every surface is a gutter, a neighbour or a window** | five ways to show content is a vocabulary to learn; the windows already exist (T12) and the overlays can join them (T17.4) |
| 17 | **The detail the reader earns by moving closer** — the budget follows the camera, a kind earns its card by proximity, and the nearest card says more | the library's LOD is a cull and its escapes are unused, the budget is spent in model order, and the map's only screen-size LOD adds one line (F11–F13) |
| 18 | **The map follows the log only when the reader asks** | a camera that moves while the reader scrolls is a camera the reader did not ask for (T18.1) |
| 19 | **The study decides the product; T17 and T18 do not** | the stop rule in `SPACEGRAPH.md` §10 is this plan's own promise, and T17/T18 are ergonomics (T18.5) |

### 10.2 Risks

| Risk | Likelihood | Mitigation | Fallback |
|---|---|---|---|
| The `card` mode is dropped, and the map has one detail surface | Medium | T11 decides it explicitly before T12 builds on it | the popover stays the only surface, and the mode is removed from the toolbar |
| Windows collide with the app's own chrome (the header toggles, the composer) | Medium | the windows live inside the canvas region, and the region's box is the clamp | a window that cannot fit is docked to the region's edge |
| The background pan breaks the card drag or the box select | Medium | the branch is gated on the raycast; the mouse contract test grows a case per row | the behaviour is an option, and the host turns it off |
| The toolbar loses a control nobody can find | High | the axe runs over the toolbar; every control keeps an accessible name | the control stays in the overflow menu |
| The equalizer makes the map unreadable (everything large, or nothing distinct) | Medium | the presets are the product; the contrast audit covers the colours | the presets ship alone, and the rules are not free-form |
| A size rule re-lays-out on every streaming append | Medium | the rules are part of the layout key, so they re-lay-out like a level does | size rules are pinned to the session, not to the model |
| The hybrid's log is too narrow to read in the stacked arrangement | Medium | the divider is draggable, the arrangement can become `side` or `floating`, and the split is remembered per session | the reader drags the divider or switches the arrangement |
| The hybrid's map is too narrow to read | Medium | the level control becomes a menu in the compact row, so the controls fit a half-width map | the reader uses the map alone (`graph.toggle`) |
| The consolidation breaks a reader's muscle memory | Medium | the layouts keep their names and the level keeps its meaning; what changes is the *control*, not the words | the old controls stay as an alias for a release |
| The summary layouts at a finer grain become unreadable | Medium | the grain is the level the reader already chose, and a summary row *packs* the units rather than stretching them | the summaries stay at the overview grain and say so |
| A budget that follows the camera moves nodes under the reader | Medium | the order changes which nodes get a *card*, never the positions — the layout is untouched (F1) | the budget returns to the flat count |
| The log layout duplicates the log | Low | it is the same data in the map's grammar: the structure is what the log cannot show (T17.3) | the layout is not offered |

### 10.3 Stop rules

1. Do not start T12 before T11.1 and T11.2 are decided: the window's *content* is the card's
   content, and the card's content is not yet settled.
2. Do not add a node type for a window, and do not build on `PanelNode`'s dead drag API.
3. A window that is open must never move the map: no window may trigger a fit, a focus or a
   re-frame.
4. Do not add a gesture to the mouse map without writing the row down in T13.2 and the row's test.
5. If the toolbar needs a twentieth control, it goes into a popover — never inline.
6. If a size rule moves a node while the reader is reading, the rule is wrong, not the reader.

---

## 11. Verification matrix

| Check | Command | Owns |
|---|---|---|
| The graph's own model | `cd packages/session-ui && bun test src/graph` | ids, turns, levels, layout, tiers |
| The graph's host | `cd packages/session-graph && bun test src` | the render model, the card template, the windows |
| The library | `cd spacegraphjs && pnpm exec vitest run` | the core, the mouse map, the a11y layer |
| The library's packages | `cd spacegraphjs/packages/<p> && bun test` | the contract and the adapters |
| The component suite | `cd packages/session-graph && bun run test:components` | the toolbar, the windows, the card |
| The app's e2e | `cd packages/app && bunx playwright test e2e/graph` | the graph in the app, end to end |
| The whole fork | `bun run check` from the repository root | lint and types |
| The visual record | `bun run graph:capture --mode=verify` from the repository root | the committed frames — the ritual that finds what the tests cannot |

---

## 12. Log

Append-only. One entry per pass: date, task IDs, commands run, results, surprises, unverified items.

**2026-10-21 — TODO.4 created; the author's five observations, and what was measured.**
No code changed by this pass. What was measured:

- the author's report: the `card` mode "doesn't do anything", the popover is good and should
  become a durable, movable, resizable window, the background should pan under the left button, the
  toolbar is cluttered, and an equalizer could tune card size and style by type and age;
- the **`card` mode's** three reasons for doing nothing, all confirmed in the code: the detail line
  is empty for `session` and `phase` and repeats the label for `file`; the card's box never changes
  (the layout owns it); and at the fit's legibility floor the added line is 5.5 screen pixels;
- the **library's mouse map**: the camera pans on the right button by a bitmask on
  `PointerEvent.buttons`, and a left press on empty background takes no branch at all — a press
  emits `background:click`, a drag emits nothing;
- the **library's screen-space surfaces**: all fixed chrome; `HoverMetaWidget` is the closest
  precedent (fixed to the viewport, positioned once, never moved); `PanelNode`'s drag API is dead
  code and world-space; a host can build a movable window in plain DOM today;
- the **toolbar**: nineteen controls, five of whose icons are not in the catalogue and therefore
  render as a plus sign, and an overflow menu that only appears below 640 pixels;
- the **card's size seam**: `nodeSize()` is the one function the layouts and the adapter read, so a
  size policy reaches the geometry — four of the five strategies read the per-node width, and
  `hierarchy` hard-codes 220;
- the **upstream branch does not fix any of this**: its `test` and `check` workflows are green on
  its own head with the same manifests and the same tsconfigs.

Unverified: the plan's own claims about the *feel* of a window (a drag that feels right, a size that
reads well) cannot be measured from here; they need the author's hands on the build.

**2026-10-21 — T11: the card speaks (G9).**
The `card` mode did nothing, and the plan said why before changing anything: 9 of the fixture's 43
nodes would have shown an *empty* line (the session and its eight phases), 5 more would have shown
the label back (the files), the card's box never changes, and at the fit's floor the added line is
5.5 screen pixels. The kinds, what they have, and what they now say are in T11.1's table.

What changed:

- **the card's line is its kind's own fact.** `kindDetail(node)` answers, per kind, "what do you
  have that your label does not" — the tool's input, the result's output and exit code, the
  message's role, the diff's first file, the notice's source — and returns nothing when the kind
  has nothing. A phase with no time shows a label, not an empty line;
- **the file's readers and writers come from the graph's edges**, because only the graph knows
  them: the host counts them once per model and hands them to the card template;
- **the tier thresholds are derived, not guessed.** The reading size is 9px — the author's call,
  one number — and the boundaries follow from it: `far` at 165, `near` at 180, with a 5% hysteresis
  (173 / 171). The old `far` threshold of 80 was a smudge called a summary; the default view now
  shows labels only, and the summaries appear when the reader zooms in far enough to read them;
- **the selected card says so**: the contract's `theme.selection` as its border and a ring that
  does not move the card's box, plus `data-selected="true"` for the tests and the a11y mirror;
- **in the `card` mode the camera frames the selected node** (T11.2's option A), with the fit's
  legibility floor set to the card's reading width, so the card the reader just chose is one they
  can read. Only the selection moves the camera: a pan, a zoom or a fit never re-frames the card.

Two defects the work found, both older than the pass:

- **the tier needed a second pass to settle.** The hysteresis means a card that jumps from `far`
  to `near` in one step is `mid` first and `near` second; the view's tier effect read only the
  card's width, so a card whose width stopped changing stayed a tier behind the reader. The
  effect now reads the tier as well, and the signal settles in the same frame;
- **the camera was framed before the renderer was handed over.** The first viewport report can
  arrive before the renderer itself, so the framing waited for a signal that never came and the
  card mode framed nothing. The view now waits for the renderer, not for the camera's first word.

Measured: `session-ui` graph **116** (+4), `session-graph` unit **100** (+3), the session-graph
component suite **54** (the card-mode case now asserts the near tier, the kind's line and the
selection), the root `bun run check` **40/40**.

Unverified: the *feel* of the card mode's framing — a camera that moves on every click is the
cost the plan named, and only the author's hands can say whether the frame lands where they want
it. The reading size (9px) is the same question: one number, one edit.

**2026-10-21 — T13: the background pans under the left button (G11).**
The author's request, in one line: "dragging on the background with left button, since it otherwise
has no action, should pan like it does with the right button — but only when dragging on the
background."

What changed, in the library (`spacegraphjs`):

- **the gesture lives in the interaction plugin**, not in the camera fingering — the fingering has
  no raycaster and does not claim the gesture, so a blind left-button pan there would pan *and*
  drag the node under the pointer. The plugin already knows whether a node was picked;
- **the branch is the plan's**: a left press that finds no node and no edge remembers the point;
  the move pans by the pointer's delta and skips the hover; the release clears the state. A click
  (≤5px) still emits `background:click`, so a click keeps clearing the selection and a drag does
  not;
- **it is an option, not a hard-coded change**: `input.interaction.enableBackgroundPan`, on by
  default. Over the void the left button has nothing else to do, and a host that wants the old map
  turns it off;
- **the input config is honest now.** Every option it declares is read: `enableHover`,
  `enableBoxSelect`, `enableDrag` and `clickThreshold` are wired in the interaction plugin, and
  the camera gained the two setters the option needs. The two sections that were *promises* — a
  camera section duplicating `options.cameraControls`, and a history section duplicating the
  history plugin's own option — are gone.

The mouse map is written down in the two places that carry it (the library's README and the fork's
`SPACEGRAPH.md`), in the same words, with the way out.

**The library's two commits are pushed** (`autonull/spacegraphjs7`, `main`): the renderer's
`getNodeScreenPosition` ✓ (which the host already called ✗ — the fork's CI checks the library out
from GitHub, so without the push the fork's graph gate ran against a library that could not place a
node ✗) and the background pan ✓.

Measured: the library's vitest **534** (+5), the library's mouse e2e **11** (+2), the library's
package suites (adapter 21, cytoscape 23, renderer 12, spacegraph-renderer 17, svg-renderer 9),
the app's graph e2e **27**, the session-graph component suite **54**.

Two things the pass found, both about the environment rather than the code:

- **the app's e2e failed until the vite dependency cache was cleared.** The library's dist was
  rebuilt (its chunk names change with every build), so the app's pre-bundled dependency was
  stale and the graph module 504'd. After the cache was cleared and the server re-optimized, the
  suite is green — but the *first* run after a library rebuild reloads the page mid-test, and the
  Cytoscape fallback case fails on the stale hash. The second run passes;
- **the react and solid binding suites cannot run under `bun test`** (no DOM): they fail with
  `document is not defined`, before and after this pass.

Unverified: the *feel* of the pan — whether the left drag over the background reads as "the map
follows my hand" or as "the map jumped" — needs the author's hands.

**2026-10-21 — T12: windows over the map (G10).**
The author's second observation: the popover is good, but it should be *durable* — opened by a
button, movable and resizable, and still there when the reader comes back to it.

What changed:

- **the window manager** (`GraphWindows`): one component that owns the gestures and holds no
  content. A title bar moves the window, a corner resizes it, a click raises it, `Escape` closes
  it, and the window is clamped to the canvas region. In screen space the pointer's delta *is* the
  window's delta, so nothing converts pixels to world units;
- **the window state is the plan's list, verbatim**: `{ id, kind, nodeID?, left, top, width, height,
  z, pinned? }`. The *host* owns it — the app persists it per session, beside the detail mode and
  the peek — and the view proposes a window's first placement, because the view knows how much room
  the canvas has;
- **two kinds, and the manager knows neither**: the node's detail (the existing `GraphDetailBody`,
  opened from a new button in the shared detail header) and the legend (its content, extracted from
  its overlay shell into `GraphLegendBody`, so a window can hold it);
- **a window can be pinned to a node** and then rides it: the view reads the node's screen position
  on every viewport change, the same anchor the popover uses. Free-floating is the default; the
  world-anchored window stays deferred (D8);
- **the content is not persisted**: the kind and the node are, and the body is re-derived from the
  model — so a window whose node is gone says so instead of showing an empty frame.

Two things the implementation had to answer that the plan did not say:

- **`Escape` on a window must not clear the reader's selection**, but the library's own `Escape`
  handler (which clears it) listens on the document body, and a bubble-phase handler on the window
  arrives after it. The window listens in the **capture phase** and stops the key there: the window
  answers `Escape` before the map does;
- **the window layer must not eat the map's pointer**: it sits above the canvas as a sibling, so
  the canvas never sees a window's pointer, and a background drag pans the map (T13) while a
  window's drag moves the window.

Measured: the session-graph component suite **56** (+3: the window opens, moves, resizes and leaves
the map where it was; `Escape` closes it and keeps the selection; a pinned window rides its node
across a pan), `session-graph` unit **100**, `session-ui` graph **116**, the root `bun run check`
**40/40**.

Unverified: the *feel* of a window — whether its title bar drags the way the author expects, and
whether the first placement is where they would put it — needs their hands. The app's persistence
of a window's placement across a session switch is written but not yet proven by an app e2e.

**2026-10-21 — T14: the toolbar, organised by axis (G12, in part).**
The author's third observation: "the graph toolbar is getting cluttered — we should consider how to
organize it better for space-saving and intuitiveness."

The row was **913px** of controls in a row that wraps — measured, per control, in T14.1 — and five of
its icons were not in the catalogue, so they all drew the same plus sign.

What changed:

- **the row is organised by axis**: four things are inline (the representation and the level; the
  zoom and the fit) and everything else is one click away — the **"Draw"** menu (the layout, the
  depth, the billboard, the file lens), the **"Show"** menu (the detail mode, the peek, the minimap,
  the turn map, the legend, the gallery) and the commands at the end (the search, the export, the
  renderer label, back). The icon is the affordance and the label names the current value;
- **a toggle leaves its menu open** and a choice closes it, so the reader sees the state they just
  changed; a toggle's accessible name does not change with its state;
- **the five missing icons are real now** (the billboard, the export, the turn map; the export's
  items are text), and **a missing icon is no longer silent**: `Icon` warns once and draws a
  broken glyph instead of a plus sign that looks real. A sweep of every icon name in the packages
  finds none missing in production code;
- **the compact threshold follows the measurement**: the row needs 1001px, so below 1000px the
  secondary controls collapse into the overflow menu, the subject and the camera stay inline, and
  the renderer label is hidden.

Measured: the session-graph component suite **59** (+3: the row stays on one line at 1440 and
1100; the four inline things and the two menus are where they belong), the app's graph e2e **27**
(the e2e opens whichever menu the row has), the library unchanged, the root `bun run check**
**40/40**.

**Two things this pass leaves open, on purpose.**

- **T14.3 (the minimap as a window) is not done.** The manager is there and the minimap's toggle
  moved to the "Show" menu, so the remaining work is a `minimap` window kind over the existing
  `GraphMinimap`. It is left open rather than half-done.
- **the narrow row still wraps below about 750px**, and the app's session panel is often narrower
  than that. The fix is measured: the level control (213px) becomes a menu like the layout chooser,
  which brings the narrow row to about 530px. It is a small change and it is not done here.

**2026-10-21 — T15: the equalizer (G13, in part).**
The author's fifth observation: "maybe there can be an 'equalizer' panel that adjusts sizes/styles of
nodes according to their type, age, etc...".

What was built — the **engine**, the **cost model** and the **accents**:

- **the rule model** (`packages/session-ui/src/graph/equalizer.ts`): a rule is a predicate over a node
  (the kind, the status) plus an effect on the card (the size, the hue, the muted flag, the age at
  which the card fades). The last matching rule wins, so the reader's order is their order;
- **the cost model is enforced, not just described**: a size rule reaches the layout through the
  card's box (the layout's `nodeSizeFn` ✓ — no library change was needed, the strategies already
  read it ✓) and the rules are part of the layout key ✓, so a rule change re-lays-out the map
  exactly like a level change ✓ and the positions stay stable while the rules do not change ✓. A
  style rule rebuilds the model and moves nothing ✓. **The age effect never re-lays-out**: a fade is
  the card's own opacity ✓;
- **one function maps a node to its accent** ✓ (`accentOf`): the cards read it ✓, the bands read it
  ✓, and the legend reads it ✓ — so a rule can never make the picture and the key disagree. A muted
  rule keeps the hue and loses the voice ✓;
- **the rules are persisted per session** ✓, beside the windows ✓, and the engine reads them ✓;
- **three presets** ✓ exist as named rule sets ✓ ("errors larger", "subagents as large", "old files
  dimmer").

Measured: `session-ui` graph **123** (+7: the rules speak to a kind and a status; the last match
wins; a style rule leaves the positions where they were; a size rule moves them; the age fades but
never reaches zero), `session-graph` unit **100**, the root `bun run check` **40/40**.

**What is not done.** The **panel** (T15.4): the rule list, the preview swatches, the reset, and the
presets offered as a choice ✗. The manager is there and the `legend` kind shows how a kind's content
is registered ✓, so the panel is the last piece, not the first — but until it exists, the equalizer
is an engine with no way in ✗. That is the honest state of T15 today.


**2026-10-22 — T16: the map and the log together (G14), and the equalizer's panel (G13).**

The plan's own opening says the transcript stays familiar and the graph appears where it answers a
question — and the build only ever offered that for a single turn. The whole session and the whole
log could not be looked at together, so the product's strongest form was still a promise.

What changed:

- **the hybrid is a mode**: `transcript | graph | hybrid`, in the session's own vocabulary
  (`GRAPH_MODES`, `GRAPH_ARRANGEMENTS`, `GRAPH_SIDES` beside the level, the strategy and the detail
  mode). The reader picks how the two surfaces meet — `stacked`, `side`, or `floating` (the map
  over the log, movable and resizable) — from the map's own **Draw** menu;
- **the panel owns the composition** (`packages/app/src/session/graph/session-graph-panel.tsx`): the
  log's pane is the log's *home*, and the map is arranged around it with CSS `order` rather than by
  moving nodes. The first attempt re-parented the transcript, and the reader's scroll was lost —
  measured in the browser, fixed by never moving the log's DOM;
- **the bridge**: picking a node in the map reveals its message in the log, and the log's active
  turn is marked on the map's card (`data-active`), so the reader sees where they are;
- **the ergonomics the split forced**: a half-width map is a narrow map, so the level control
  becomes a menu in the compact row (T14.5's open item, and the narrow row is about 530px instead of
  747px), and the compact threshold follows the measurement (941px of controls, so compact below
  1030px, not 1000px);
- **the equalizer has a way in** (T15.4, T15.5): the panel is a window kind beside the legend's,
  it lists the three presets, applies one on a click, and shows the rules it made with a preview, a
  size and a way to drop them. The toolbar offers it in the **Draw** menu;
- **the turn map is scoped to the session panel** and gated on the feature flag: it used to cover the
  side region as well;
- **the log's text size is a slider at hand**, at the top of the log's pane: in a split panel the
  log is narrow, and the reader wants its text bigger or smaller without leaving the map. It scales
  the theme's own sizes (`--text-scale`), so the line heights follow and a theme that changes them
  scales with it.

Measured: `session-ui` graph **123**, `session-graph` unit **101** (+1: the active turn's card
carries the active state), the session-graph component suite **58** (+1: the equalizer's panel
applies a preset and lists the rule), the app graph e2e **28** (+2: the hybrid shows both surfaces
and the reader chooses the arrangement; picking a node in the map moves the log to it), the root
`bun run check` **40/40**.

**Two things this pass found, both about the browser rather than the plan.**

- **moving a scrollable element in the DOM resets its scroll.** The hybrid's first version put the
  transcript in a new pane, and the log came back at the top. The fix is structural: the log's pane
  is the log's home, and the map is arranged around it with `order`, so the transcript's DOM is
  never moved;
- **a flex item sized by its content leaves the percentage heights inside it unresolved.** The map
  pane's height was a flex result, so the map view inside it shrank to its content instead of
  filling the panel. The pane's height is a percentage now, and the map fills the panel.

**One defect the work found, older than the pass.** The narrow graph view gave **311px of its
height to an invisible inspector**: the closed gutter is a sibling of the canvas in a narrow
layout's column, and its content kept the space. The gutter takes no room when it is closed now,
which the hybrid needed (a map pane beside the log is a narrow map) and the app's own narrow graph
mode had been missing.

Unverified: the *feel* of the three arrangements — whether the stacked split gives the log and the
map each enough room, and whether the floating pane is where the reader would put it — needs the
author's hands.

**2026-10-22 — T17 and T18: the map's own language, and the pair tightened (planned).**
No code changed by this pass. The author's use of the map asked three questions — are the
representations just layouts, can the level apply to any layout, is the LOD earning its keep — and
this pass measured the answers:

- **the layout is two axes for one job** (F8): the representation is an inline control, the
  strategy a row in a menu, and the ribbon and the matrix are host-level layouts like the
  strategies — the author's instinct is right;
- **the level is disabled for two of the three representations** (F9): a control that does nothing;
- **the level is a grain every layout can honour** (F10): the model already carries it in
  `minLevel`;
- **the library's LOD is a cull, not a detail** (F11): `high | medium | low` is computed and
  never read, and the host sets none of the library's per-node escapes (`lod`, `minZoom`,
  `maxZoom`);
- **the DOM budget is a flat count spent in model order** (F12): the card the reader is looking at
  may be a dot because an earlier node took the budget;
- **the map's only screen-size LOD is the card's tier, and it adds one line** (F13): the map never
  shows more of a node because the reader moved closer.

What was written: **T17** (one layout axis; the level as a grain; the log's own shape as a
layout; one concept for the surfaces; the detail the reader earns by moving closer) and **T18**
(the map follows the log; one control for the surfaces; the detail's home follows the map's width —
which un-defers D9; the hybrid's keyboard; and the measurement that decides the product).

What was *not* done, on purpose: none of it. T17 moves a vocabulary (the layouts, the level,
the detail modes) and T18 moves the ergonomics; both are cheaper to write down than to unpick, and
the study (T2.2, carried) decides whether the map is a mode of the product at all.

Unverified: every number in F8–F13 is measured in this tree, but the *feel* of the consolidated
row — seven layout names in one menu, the summaries at a finer grain, the log-shaped layout —
needs the author's hands.
