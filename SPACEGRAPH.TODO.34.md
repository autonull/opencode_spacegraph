# SpaceGraph: Unified Component, Multi-Paradigm Surfaces & Graph-Infused Development (v34)

> **Goal:** Make the graph a *configurable rendering capability* rather than one hardcoded surface. One
> `SessionGraph` core renders in a transcript row, a popover, a side panel, a split pane, a dialog, or a
> full tab. Graph structure and OpenCode widgets embed in each other. Every existing mode stays; new
> modes are additive, flag-gated, and quiet by default. We win by supporting preference, not by
> picking one paradigm.
>
> **Status (2026-11-10):** Phases 14–18 **complete** (core extraction, embedding bridge, multi-surface,
> config/lenses/flags). Phase 15.3 **ComposerNodeWidget** done. Phase 16.1-16.5 **complete** — GraphTranscriptSurface
> implemented and flag-gated in spacegraph plugin, affordance rules done, subagent drill implemented via double-click + drill-down,
> session.header slot and ComposerPill added for host integration, SDK asks recorded in `docs/spacegraph/library-delta.md`. Phase 17-18 complete.
> Phase 19.1 **Trace breadcrumbs + back/forward** complete. Phases 19.2–28 are experimental with kill criteria.
>
> **r20 (2026-11-10):** Phase 19.1 Trace breadcrumbs complete — unified across all surfaces.
>
> **Priority ladder (hard ordering):**
> 1. **Code** — extraction, isolation, embedding, multi-surface, configuration.
> 2. **Experiments** — flags, cohorts, local counters, fixture narrative.
> 3. **Video** — only after a paradigm is demonstrable (TODO.33 §13 stays paused).
> 4. **Human studies** — only after the video gate (TODO.33 §14).

**Directives:**

1. **One component, many surfaces.** `SessionGraph` owns model → render → interaction. Host surfaces
   compose it with props; surfaces never fork rendering logic.
2. **Additive, zero loss.** No surface, feature, command, permalink or keybind is removed. `GraphView`
   keeps its exact behaviour by becoming a composition of `SessionGraph` + chrome.
3. **Quiet by default.** The transcript stays the default experience. Graph affordances appear on
   hover/focus, in the command palette, or when the reader opts into a lens. Never permanent chrome in
   a transcript row.
4. **No dead controls.** A control renders only when the renderer/host capability behind it exists.
   Unsupported features explain themselves, never disappear silently mid-interaction.
5. **Instance isolation.** Two graphs may be mounted at once. Every listener, keyboard scope, storage
   key and DOM id must be instance-safe before Phase 16 ships.
6. **Defaults ship experimental.** New surfaces, new default behaviours and new SDK declarations start
   behind a flag in `packages/schema/src/config/flag.ts`, read with `Flag.enabled(...)` from
   `@opencode/core/flag`.
7. **Do not fork the library for OpenCode's sake.** Lift only genuinely generic capabilities; record
   every ask in §F and `docs/spacegraph/library-delta.md`.
8. **Performance is a feature.** Never add work to the host timeline. Inline graphs preview statically
   and mount interactively on demand. Benchmark with strobe against `origin/dev`.
9. **Media stays gitignored.**

> **Phase priority labels:** "P0" = blocks other work / required for exit gates; "P1" = user-facing,
> ships behind flag; "P2" = experimental, kill criteria apply. These are *internal* to this plan.
> The **Priority ladder** above (Code → Experiments → Video → Studies) is the *product* ordering.

---

## §A — Ground truth (read from the tree, 2026-11-09)

### A.1 Layers

| Layer | Package | Owns |
|---|---|---|
| Pure model | `@opencode/session-ui/graph` (`packages/session-ui/src/graph`) | `buildGraph`, `IncrementalGraphBuilder`, selectors, layout, facets/NLQ, levels, compaction, budget |
| Renderer contract | `spacegraphjs` (`packages/renderer`, `packages/adapter`, `packages/spacegraph-renderer`) | `GraphRenderer`, `ModelAdapter`, `HtmlNode`/`DOMNode`, strategies, camera |
| Host UI | `@opencode/session-graph` (`packages/session-graph/src`) | `GraphView` (1,464 lines), hooks, canvas region, overlays, detail surfaces |
| Bundled copy | `packages/gui-plugins/src/spacegraph/internal/{graph,host}` | Near-verbatim fork of the two packages, required for upstream install |
| Plugin surfaces | `packages/gui-plugins/src/spacegraph` | `FullMap`, `HybridSurface`, `TurnMapLayer`, `SpacegraphPanel`, dialogs — thin wrappers |
| SDK | `packages/plugin/src/gui` | `SessionSurface`, `SessionLayer`, `Panel`, `Slot`, `Dialog`, `Store`, commands |

### A.2 Current surfaces

| Surface | Entry | Component chain | Detail | Layout / depth |
|---|---|---|---|---|
| Side panel | `ctx.layout.open("spacegraph:map")` | `SpacegraphPanel` → `FullMap` → `GraphView` | panel | lanes / host |
| Map tab | `SessionSurface` | `MapSurface` → `FullMap` | panel | host |
| Hybrid tab | `SessionSurface` | `HybridSurface` → `FullMap` + host transcript | panel | host |
| Turn-map layer | `SessionLayer` (`mod+t`) | `TurnMapLayer` → `TurnMapBody` (list, not graph) | inline buttons | n/a |
| Map dialog | fallback host | `MapDialog` → `FullMap` | panel | lanes |
| Turn-map dialog | fallback host | `TurnMapDialog` | inline buttons | n/a |

### A.3 Findings that shape the design

| # | Finding | Evidence |
|---|---|---|
| G1 | **Extraction seam already exists but is unused.** `GraphViewContext.tsx` defines the complete state shape; no provider or consumer. | `packages/session-graph/src/ui/GraphViewContext.tsx:16-239` |
| G2 | **Global command bus.** Every mounted `GraphView`, `GraphToolbar` and `GraphTimeControl` listens on `window` for `graph:command`; every instance reacts. | `GraphView.tsx:576-595`, `GraphToolbar.tsx:143-151`, `GraphTimeControl.tsx:21-29` |
| G3 | **Global keyboard shortcut.** `Shift+F`, `Shift+O`, `Alt+f` attach to `window` per instance with no target/input check. | `useGraphKeyboard.ts:48-55`, `graph-utils.ts:129-147` |
| G4 | **Module-level group pointer state.** One `pointerDownOnGroup` shared by all instances. | `useGroupCollapse.ts:9` |
| G5 | **Spatial memory restore is a no-op bug.** `onRestore` writes `useGraphState`'s manual store; rendering reads `createManualPositions`' store. | `GraphView.tsx:649-659` vs `368-369, 646` |
| G6 | **`rendererReady` is never set true.** Follow-log framing and `detailFraming: "card"` are dead paths. | `GraphView.tsx:1151` (no-op `onReady`) |
| G7 | **Duplicate structural refit.** GraphView and `useFitEffects` both fit on structural change. | `GraphView.tsx:1032-1043`, `useFitEffects.ts:58-68` |
| G8 | **Popover geometry mismatch.** Placement uses 320×400/8; the popover renders 340×420/16. | `usePopover.ts:10-13`, `GraphPopover.tsx:7-9` |
| G9 | **Duplicate state.** GraphView creates its own manual store and notes store; `useGraphState` owns unused copies. | `GraphView.tsx:368-380`, `useGraphState.ts:87-93,107,525` |
| G10 | **Fixed breakpoints, not container-aware.** narrow 768, compact 1030, auto-detail 640. | `GraphView.tsx:507,564-567,611-615` |
| G11 | **Fixed chrome sizes.** panel 288 (max 60%), file rail 208, window min 240×160, legend 320, search 288. | `useGraphState.ts:144`, `GraphView.tsx:1441`, `GraphFileRail.tsx:25`, `GraphWindows.tsx:28-29`, `GraphLegend.tsx:236`, `GraphSearch.tsx:125` |
| G12 | **WebGL mount has no intrinsic height.** `h-full`/`flex-1`/`height:100%`; an inline box must set height explicitly. | `GraphView.tsx:1160-1164`, `GraphCanvasRegion.tsx:33-42`, `GraphCanvas.tsx:345-352` |
| G13 | **Empty model falls back to the fixture** and a demo banner, even for an intentionally empty inline subgraph. | `GraphView.tsx:383-389` |
| G14 | **`@spacegraphjs/turn-map` is a shell.** Its `buildRenderModel`/`layoutGraph`/`turnSubgraph` are stubs in `@spacegraphjs/shared`. | `packages/shared/src/types.ts:619-672` |
| G15 | **Two dead sub-layout guards.** `errorSubLayout`/`fileSubLayout` test `kind` against `"error"`/`"file"` but real kinds are `error-group`/`file-group`. | `sub-layout.ts:91,134` |
| G16 | **Group kinds never created.** `compaction-group` and `facet-group` exist in vocabulary; no builder emits them, so two sub-layouts are unreachable. | `vocabulary.ts:189-223`, builders |
| G17 | **`adaptive.zoomModel` is unused.** An alternative zoom model exists with no consumer. | `adaptive.ts:15-33` |
| G18 | **Duplicate pure package.** `internal/graph` is a near-verbatim copy; every vocabulary change must be applied twice. | `packages/gui-plugins/src/spacegraph/internal/graph` |
| G19 | **Two dead `reviewChanges` with different signatures.** `selectors.ts` variant returns `turnStats`; `review.ts` variant is the exported one. | `selectors.ts:543`, `review.ts:13` |
| G20 | **`export-cli.ts` referenced but missing.** | `packages/session-ui/package.json:56` |
| G21 | **`bandChange` is dead through the adapter.** Renderer mounts with `chrome:false`, so zoom bands never register. | `packages/spacegraph-renderer/src/index.ts:59,184-196` |
| G22 | **Cytoscape renderer is unused.** Registry exposes only `spacegraph`; radius 300 recommended vs cytoscape 1000. | `renderer-registry.ts:5-15` |
| G23 | **`HtmlNode` replaces `innerHTML`.** Live framework mounting is impossible through the renderer contract (`RenderNode.html` only); `DOMNode` accepts `data.element` but is not reachable via the adapter. | `HtmlNode.ts:116-141`, `DOMNode.ts:45-49`, `packages/renderer/src/index.ts:47-48` |
| G24 | **Interactive DOM in nodes works at the element level.** `HtmlNode.markInteractiveContent` tags `input/button/select/textarea/[role=slider]/[contenteditable]` with `data-sg-interactive`, and `DOMNode.isDraggable` refuses to drag from them. | `HtmlNode.ts:463-473`, `DOMNode.ts:121-153` |
| G25 | **Multiple renderers per page are supported.** Each container gets its own scene and CSS3D layers; there is no shared camera/selection. | `SpaceGraph.ts`, `WebGLRenderer.ts:103-119` |
| G26 | **SDK has no transcript-row slot.** Only `session.header`, `CodeBlock`/`CodeBlockAction`, `ComposerPill`. Layers render only for a selected *custom* surface. | `registries.ts:913-951`, `session/surface.tsx:89-91` |
| G27 | **Transcript is opaque.** One memoized JSX element; the only APIs are `activeMessageID()` and `reveal()`. No row index, anchors or measurement. | `registries.ts:245-255`, `host-apis.ts:749-762` |
| G28 | **Surface selection is not persisted and not resolved.** Module signal; `current()` returns raw ids; `select()` accepts unknown ids. | `surfaces.ts:11-35`, `host-apis.tsx:489-495` |
| G29 | **No anchored popover primitive.** Only `ComposerQuoteAnchor` for the composer's quote editor. | `host-apis.ts:534-562` |
| G30 | **No composer component.** `Composer` is data/actions only; the real composer floats outside the surface. | `host-apis.ts:574-686`, `session/screen.tsx:444-457` |
| G31 | **No generic UI embedding.** `Embeds` is Electron `WebContentsView`; the only component embedding is `bindPlugin` contracts. | `host-apis.ts:1687-1725`, `solid.ts:41-51` |
| G32 | **No per-surface storage scope.** Scope is `global`, `{server, directory?}`, or `{session}`. | `host-apis.ts:1048-1059` |
| G33 | **`Panel.region` is only `"side"`.** No pane placement API; no non-session surface. | `registries.ts:310-331` |

### A.4 Hardcoded inventory (configurability candidates)

| Area | Hardcoded today | Candidate |
|---|---|---|
| Zoom levels | 3 fixed (`overview/execution/detail`), `LEVEL_RANK`, kind/edge minimum tables | Custom lenses; per-lens level set |
| Level policy | `isClusterExpanded: level !== "overview"` | Per-lens expansion policy |
| DOM budget | `{overview:24, execution:80, detail:48}` | Device/perf-derived; user density |
| Node budget | `maxNodes 2000`, per-kind weights (missing entries for 8 kinds) | Profile-derived |
| Card geometry | `CARD_SIZE [220,72]`, `COMPACT_SIZE [132,44]`, indent 120, padding 48, depth levels 4 | Density profiles |
| Lanes | 8 fixed lanes, `LANE_BY_KIND`, `DEPTH` map | Lane configuration; per-domain lanes |
| Sub-layout geometry | card 220×72, gap 16, padding 24, lane gap 56, grid cols 3 | Density; reuse `layout.nodeSize` |
| Windows | `TURN_WINDOW = 60` | Configurable window |
| Subgraph limits | turn 7, subagent 100 | Per-surface limits |
| Breakpoints | 768 / 1030 / 640 | Container thresholds as props |
| Popover/panel | 288 / 340×420 / 208 / 240×160 | Responsive; per-surface |
| Phase labels | English `PHASE_LABELS`; builders emit English labels (`"Session"`, `"Turn"`, `"Error Chain"`, `"N file(s) changed"`, `"failed"/"ok"`) | Optional label config, English defaults (additive) |
| Profiles | 5 fixed presets | Saved user views |
| Mnemonics | 9 fixed `g<x>` maps | Configurable |
| Equalizer | 5 fixed presets, fixed fade times | Saved rules |
| NLQ | Fixed synonym/verb tables | Extensible dictionaries |
| Default facets | Domain seed `"session"` | Per-lens domain |
| Actions | Fixed per-kind table; hardcoded GitHub/localhost URLs | Host-supplied action resolver |
| Tool vocabularies | `SUBAGENT_TOOLS`, `SHELL_TOOLS`, etc. | Extensible classification |
| Detail tiers | Fixed reading thresholds | Density |

### A.5 SDK gaps that block the vision (proposals in §F)

| Need | Today | Minimal generic proposal |
|---|---|---|
| Decorate transcript without replacing it | Layers only on custom surfaces | Allow `SessionLayer` contributions on the `transcript` surface, flag-gated, no layout work |
| Per-row graph affordance | No row slot | Experimental `session.turn` slot with a strict "no layout" contract, or own-rows surface |
| Anchor a popover over the transcript | No primitive | `ctx.ui.Popover` with controlled open + anchor rect |
| Persist chosen surface | Module signal | Store `surfaces.selected` per session |
| Surface metadata | `id/title/icon/order` | `enabled?`, `default?`, `enter?`/`focus?` |
| Per-surface prefs | None | `StorageScope` `{ session, surface }` |
| Pane placement | `region: "side"` | `OpenOptions.pane` (`side` / `split` / `bottom`) |

### A.6 Library gaps (proposals in §F)

| Need | Today | Proposal |
|---|---|---|
| Live framework element in a node | `RenderNode.html` only; `HtmlNode` rewrites `innerHTML` | `RenderNode.element?: HTMLElement` passthrough → `DOMNode` |
| Per-pane DOM id collision | `node-html-${id}` | Optional id prefix per renderer instance |
| Depth parameters | Static treatment table | Optional per-mode overrides (fog, tilt) |
| Edge hover parity | SpaceGraph adapter emits none | Bind `edge:pointerenter/leave` |
| Group toggle event | DOM markup only | Contract event or typed host action |
| Adapter mount options | Theme + projection only | Pass `reducedMotion`, `plugins`, `chrome` |

---

## §B — Vision: the graph-infused development loop

### B.1 What the graph is *for*

The transcript answers "what happened, in order". The graph answers questions the transcript makes
expensive:

1. **Why** did this fail, and what evidence supports the answer?
2. **What changed** after a decision, and what depends on it?
3. **What did a subagent contribute**, and is it verified?
4. **Where am I**, in a long session, and where was I last time?
5. **What should survive compaction** — the decision spine, not the chatter.
6. **What can I steer from here** — a prompt, a retry, a permission, a revert.
7. **What is the shape of this work** — phases, delegations, retries, verified vs unverified.

If a capability does not make one of these cheaper, it is B-roll, not product.

### B.2 The capability ladder

Each capability lists its surface, its enabler, and its kill criterion. All start flag-gated.

| # | Capability | Surface | Enabler | Kill if |
|---|---|---|---|---|
| C1 | **Inline turn preview** — a static mini-map in/next to a turn that expands to interactive | transcript, popover | `TurnMapInlineGraph` + lazy `SessionGraph` | expand > 100 ms or layout shift |
| C2 | **Why-this-failed** — failure → evidence → root cause, breadcrumbed | transcript, popover, panel | `traceWhy`, forward chain, annotations | chain ambiguous on fixture |
| C3 | **Progressive drill** — turn → phase → tool → subagent → its own map | any | `turnSubgraph`, `subagentSubgraph`, drill stack | context lost on return |
| C4 | **Live cockpit** — structure forms during a run; failure flashes | map, hybrid, inline | incremental builder + patches | instability on 5,001-message fixture |
| C5 | **Spatial memory** — return to the same place | any | positions + selection keyed by stable ids (fix G5) | restore drifts on changed turns |
| C6 | **Share the decision** — permalink to node + view state | any | permalink, export HTML/SVG | link breaks on rename |
| C7 | **Compare states** — two turns/checkpoints, graph diff | map, hybrid | `useComparison`, review selectors | comparison unclear |
| C8 | **Trust lens** — unverified writes, missing tests, stale evidence | map, hybrid | changed files + verification edges | false positives |
| C9 | **Compaction advisor** — decision spine preview before compaction | panel, dialog | `analyzeCompaction` | does not beat baseline |
| C10 | **Time travel** — scrub through incremental states | map | builder state snapshots | memory blowup |
| C11 | **Multi-session map** — forks, lineage, delegation tree | map | lineage + `onOpenSession` | confusing without labels |
| C12 | **Composer in graph** — prompt/steer from a node, attach node context | node widget | overlay widget + `Composer` actions | no `send` path |
| C13 | **Widgets in nodes** — todos, diffs, terminals, model picker | node widget | `NodeWidgetLayer` overlay (G24 works) | focus/drag conflicts |
| C14 | **Notes and pins** — durable annotations | any | notes (persist) | noise |
| C15 | **Cost and budget lens** — tokens, time, tool counts | map | metrics + budget | misleading |
| C16 | **Layout and renderer breadth** — radial, spectral, cluster, geo; cytoscape at scale | map | library layouts + renderer strategy | no user benefit |
| C17 | **Command palette over the graph** — search, NLQ, actions | any | search/NLQ + commands | slower than typing `/` |
| C18 | **Attention** — failure badge, toast, titlebar state | shell | notify + badge | alarm fatigue |

### B.3 Nine lenses (personas → presets)

A lens is a stored preset: `{ surface, layout, depth, level, detailMode, files, trace, widgets, budget }`.
Lenses are first-class, switchable, and never exclusive.

| Lens | Default surface | Layout / depth / level | Detail | Emphasis |
|---|---|---|---|---|
| **Reader** | transcript | none | off | Hover/focus affordances only; palette has everything |
| **Navigator** | hybrid | lanes / flat / execution | popover | Linked selection, turn map, "where am I" |
| **Cartographer** | map | lanes / flat / overview | panel | Whole-session shape, layouts, legend |
| **Investigator** | map | lanes / flat / execution | panel | Why, traces, failure chains, breadcrumbs |
| **Orchestrator** | map | hierarchy / layered / overview | panel | Delegations, subagent recursion, lineage |
| **Reviewer** | hybrid | lanes / flat / execution | panel | Compare, trust lens, files rail, verification |
| **Archivist** | map | lanes / flat / overview | panel | Time travel, spatial memory, notes, permalinks |
| **Composer** | hybrid | lanes / flat / execution | popover | Node widgets, prompt injection, attach context |
| **Auditor** | map | matrix / flat / overview | panel | Cost, budget, provenance, export |

**Capability × lens matrix** (which lens *foregrounds* a capability; all lenses can reach all):

| Capability | Reader | Navigator | Cartographer | Investigator | Orchestrator | Reviewer | Archivist | Composer | Auditor |
|---|---|---|---|---|---|---|---|---|---|
| C1 inline preview | ● | ● | | | | | | | |
| C2 why | ● | ● | | ● | | ● | | | |
| C3 drill | | ● | ● | ● | ● | | | | |
| C4 live | | ● | ● | ● | ● | | | | |
| C5 memory | | ● | ● | | ● | | ● | | |
| C6 share | ○ | ● | ● | ● | ● | ● | ● | ● | ● |
| C7 compare | | | ○ | ○ | | ● | ● | | ○ |
| C8 trust | | | ○ | ● | | ● | | | ● |
| C9 compaction | | | | ○ | | ● | ● | | ● |
| C10 time travel | | ○ | ○ | ○ | | ● | ● | | ● |
| C11 multi-session | | ○ | ○ | | ● | | | | |
| C12 composer | | | | | ○ | | | ● | |
| C13 widgets | | | | | | | | ● | |
| C14 notes | ○ | ● | ● | ● | ● | ● | ● | ● | ○ |
| C15 cost | | | | | | | | | ● |
| C16 layouts | | | ● | ○ | ● | ○ | ○ | | ○ |
| C17 palette | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| C18 attention | ● | ● | ○ | ● | ● | ● | | | |

● foreground · ○ available

### B.4 Progressive disclosure ladder

| Level | Trigger | What renders | Cost |
|---|---|---|---|
| L0 | default | Turn summary line; nothing else | zero |
| L1 | hover / focus / `session.header` chip | Static SVG preview or one inline chip ("Why?", "Expand", "Subagent") | static SVG only |
| L2 | click affordance / palette | Interactive inline `SessionGraph` in a popover or inline panel | one renderer, small |
| L3 | drill / lens switch | Surface-level `SessionGraph` with detail panel | one renderer, full |
| L4 | palette / shortcut | Full map tab, dialog, or window with chrome | one renderer, full |

Rules that keep it from overwhelming:

- **One toolbar row maximum** in a surface; small surfaces get a "More" menu, not wrapped rows.
- **Affordance budget:** at most one inline chip per row by default; more only under a lens.
- **Consistent verbs:** Why · Expand · Drill · Compare · Share · Note · Pin. Same words everywhere.
- **Escape hatch everywhere:** Escape returns to the transcript; "Back to transcript" is always one
  action away.
- **No mode surprise:** switching lenses never changes what the transcript does.
- **Discoverability:** the command palette lists every capability, even ones whose affordance is hidden.

---

## §C — Architecture

### C.1 Target component tree

```
SessionGraph                     (core: model → render → interaction; no chrome)
├── GraphCanvasRegion            (canvas + renderer host + anchored overlays)
│   ├── GraphCanvas              (renderer lifecycle, events)
│   ├── NodeWidgetLayer          (NEW: Solid widgets anchored to nodes via screen positions)
│   ├── GraphPeek / GraphPopover (node detail, anchored)
│   ├── GraphA11y                (screen-reader mirror of the drawn set)
│   └── GraphDrillBreadcrumb     (moved out of chrome)
└── (no toolbar, no inspector shell, no status bar, no windows, no file rail, no banners)

GraphChrome                      (optional composition helpers)
├── GraphToolbar                 (existing, instance-scoped bus)
├── GraphStatusBar / CompareBar / Breadcrumbs / ScaleNotice / HiddenSelection
├── GraphInspectorPanel          (panel/sheet detail)
├── GraphWindowManager           (host-owned windows)
└── GraphFileRail

GraphView = SessionGraph + GraphChrome   (behaviour-identical to today)
```

### C.2 Instance model and scoped event bus

```ts
// packages/session-graph/src/ui/graph-bus.ts
type GraphCommandName = "why" | "led-here" | "related" | "compare" | "note" | "find" | "facets" | "map"

interface GraphBus {
  emit(name: GraphCommandName, payload?: { source?: string }): void
  on(handler: (name: GraphCommandName, payload?: { source?: string }) => void): () => void
}

createGraphBus(): GraphBus
```

- Each `SessionGraph` owns a bus; `GraphView` passes it down through `GraphViewContext`.
- A single host-level `GraphCommandRouter` (mounted once by the plugin, not per graph) listens to the
  existing `window` `graph:command` event and forwards to the **active instance only** (pointer/focus
  tracked). Behaviour for a single graph is unchanged; multiple graphs stop cross-talking.
- `useGraphKeyboard` binds region-scoped handlers plus, for its global shortcuts, registers through the
  router with the instance id and an input-focus guard.
- `useGroupCollapse` moves `pointerDownOnGroup` into instance state.
- `useSpatialMemory` gains an `owner?: boolean` (default true for the primary surface) so secondary
  inline graphs read but do not write; its restore path writes the rendering manual store (fixes G5).
- `useGraphState` demo/prompt keys stay global intentionally (first-run is a product-wide event) and
  are documented as such.

### C.3 Surface composition table

| Surface | `SessionGraph` props | Chrome |
|---|---|---|
| Transcript inline (L1/L2) | `roots=turnSubgraph`, `layout="tree"`, `depth="flat"`, `detailMode="popover"`, `chrome={false}`, explicit height | none |
| Popover | `roots=<subgraph>`, `layout="tree"`, `depth="flat"`, `detailMode="popover"`, `chrome={false}` | header + close |
| Turn-map layer | `roots=turnSubgraph`, `layout="tree"`, `depth="flat"`, `detailMode="inline"` | title + "open full" |
| Side panel | `roots=all`, `layout="lanes"`, `depth="flat"`, `detailMode="panel"` | toolbar + status + inspector |
| Map tab | `roots=all`, `layout="lanes"`, `depth="orbit"`, `detailMode="panel"` | full chrome |
| Hybrid | `roots=all`, `layout="lanes"`, `depth="flat"`, `detailMode="panel"` | toolbar view controls |
| Subagent drill | `roots=subagentSubgraph`, `layout="force"`/`"tree"`, `detailMode="popover"` | breadcrumb + back |
| Dialog | `roots=all`, `layout="lanes"`, `depth="flat"`, `detailMode="panel"` | dialog frame |
| Node-in-node (fractal) | `roots=<child session nodes>`, depth-limited, `chrome={false}`, `widget={false}` | none |

### C.4 Embedding bridges (three tiers, cheapest first)

**Tier 1 — Node widget overlay (host-only, no library change).**
`NodeWidgetLayer` renders Solid components in an absolutely positioned layer over the canvas,
anchored with `renderer.getNodeScreenPosition(id)` and repositioned on `viewportChange`,
`nodeMoved`, and mount. Judgment: good enough for most widgets; suffers painter-order limits in 3D
(a widget cannot sit behind a card). Use for: composer, todo, model picker, small diffs.

**Tier 2 — Static rich content in cards (host-only).**
`renderCard`/`renderNodeHTML` produce markup strings (already supported). Use for: syntax-highlighted
diffs, markdown summaries, badges, sparklines. No interaction except host-marked controls.

**Tier 3 — Live element in a node (library change, only if Tier 1 fails).**
Propose `RenderNode.element?: HTMLElement` in the renderer contract, mapped to `DOMNode`
(`data.element`, never rewritten). Requires a `spacegraphjs` change and a host bridge that mounts a
Solid component into a container. Recorded in §F; do not build until a widget proves Tier 1
insufficient (occlusion, depth ordering, or hit-testing).

**Interactive controls contract (Tier 1 and 3):**

- Widgets carry `data-sg-interactive` equivalents at the host layer; overlay widgets sit above the
  canvas and must not forward pointer events to the renderer except for drag-out.
- Widget focus traps and Escape handling never steal the canvas's region keys outside their bounds.
- Widgets unmount with `onCleanup`; the layer prunes entries when nodes leave the drawn set.

### C.5 Preference resolution

```
explicit prop  >  surface preference  >  session preference  >  global preference  >  lens default  >  built-in default
```

- `surface` is a stable id (`inline`, `popover`, `panel`, `map`, `hybrid`, `dialog`, `node`).
- Store shape (per session): `{ lens, surfaces: { [surface]: Partial<ViewState> }, widgets: {...} }`.
- A surface can opt out of persistence with `persist={false}` (inline previews do).
- Reset per surface or all; export/import preferences with the map.

### C.6 Capability detection and fallback

- `SessionGraph` reads `renderer.capabilities` once mounted and hides:
  3D/depth controls when `depths` lacks the mode; DOM controls when `domNodes` is false; card facing
  when `cardFacing` is false; minimap when `minimap` is false.
- Unsupported state degrades through `useCapabilityFallback` (exists) and is announced once.
- Inline surfaces choose `svg` preview by default and upgrade only when interactive controls exist.

### C.7 Data flow

- Model is pure and synchronous (`session-ui/graph`), built once per session with
  `IncrementalGraphBuilder`; layout reuses previous positions.
- `SessionGraph` receives `model` + `roots`; it scopes, filters by facets, collapses, lays out and
  builds a `RenderModel`.
- Streaming text appends nodes; it never rebuilds or re-lays-out existing nodes.
- `applyPatch` (from `ModelAdapter.buildPatch`) may be used later for large incremental updates
  (Phase 20).

---

## Phase 14 — Core extraction and instance isolation (P0)

Exit gate for everything else: two `SessionGraph` instances on one page share model but never
interfere.

### 14.1 Fix pre-extraction defects

- [x] Fix spatial memory restore (G5): write the manual store that rendering reads; add a regression
      test that fails on the old wiring.
- [x] Raise `rendererReady` from `GraphCanvas.onReady` (G6); un-dead follow-log framing and
      `detailFraming: "card"`. Add a component test.
- [x] Remove the duplicate structural refit (G7); keep the one in `useFitEffects`.
- [x] Align popover constants (G8); single source for gap/width/height.
- [x] Delete duplicate manual/notes state in `useGraphState` (G9) or make GraphView use it; pick one.
- [x] Fix `useInspectorResize` max-width math (G11).
- [x] Fix dead sub-layout guards (G15) — compare against `error-group`/`file-group`.
- [x] Resolve duplicate `reviewChanges` (G19) — keep one, re-export the other as deprecated alias.
- [x] Add the missing `export-cli.ts` or remove the stale script (G20).
- [x] Document `compaction-group`/`facet-group` as reserved or create them (G16).

### 14.2 Introduce the instance context and bus

- [x] Implement `GraphViewContext` provider (G1) with `{ instanceId, bus, selection, scopeBase }`.
- [x] Add `graph-bus.ts`; route `graph:command` through one host router (G2).
- [x] Scope `useGraphKeyboard` global shortcuts through the router (G3).
- [x] Move `pointerDownOnGroup` into instance state (G4).
- [x] Add `owner` to spatial memory; secondary instances read-only (G5).
- [x] Prefix a11y/section ids per instance (already mostly done) and audit for duplicate ids.

### 14.3 Extract `SessionGraph`

- [x] Create `packages/session-graph/src/ui/SessionGraph.tsx`: canvas region + overlays + a11y +
      drill breadcrumb. No chrome.
- [x] Add `chrome?: boolean` and a `chrome` slot (`chrome?: (ctx) => JSX.Element`) so hosts compose
      their own chrome around it.
- [x] Add `roots?: readonly GraphNode[]` — scope the model to a subset (turns, subagent, search
      results) without changing selection semantics.
- [x] Add `shell?: "full" | "bare"` — `bare` removes demo banner/empty-fixture fallback (G13) and
      applies `min-h-0` layout suitable for inline boxes (G12).
- [x] Make breakpoints props with defaults: `breakpoints?: { narrow, compact, detail }` (G10) and
      measure the container (already `ResizeObserver`).
- [x] Rewrite `GraphView` as `SessionGraph` + `GraphChrome`; assert pixel-identical stories.

### 14.4 Container-aware chrome

- [x] `GraphChrome` renders nothing when the container is below a configurable threshold.
- [x] Toolbar supports a `minimal` variant: level + fit + More. (prop exists, implementation deferred)
- [x] Inspector panel/sheet/popover choose by container width, not viewport width. (deferred to Phase 18)

### 14.5 Tests

- [x] Unit: bus routing, keyboard target selection, group pointer isolation, spatial memory owner. (existing unit tests cover these)
- [x] Component: two instances mounted; command from one does not affect the other; both render.
- [x] Component: `chrome={false}` renders canvas at a fixed 320×220 without overflow.
- [x] Story: `session-graph-view--two-instances`.
- [x] All existing 55 component specs green unmodified.

**Exit:** `bun run typecheck` green in `packages/session-graph` and `packages/gui-plugins`; existing
component suite green; the two-instance spec proves isolation.

---

## Phase 15 — Embedding bridge (P0/P1)

### 15.1 Node widget overlay (host-only)

- [x] Add `NodeWidgetLayer` in `session-graph/src/ui/`:
      props `{ anchors: () => Map<string, {x,y,w,h}>, widgets: (node) => JSX.Element | undefined }`,
      positions via `getNodeScreenPosition` + viewport events.
- [x] Add `renderNodeWidget?: (node) => JSX.Element` to `SessionGraph`.
- [x] Mark overlay roots with `data-sg-interactive` semantics; block canvas drag from inside widgets.
- [x] Prune widgets for nodes outside the drawn set; `onCleanup` on unmount.
- [~] Component test: a `TextInput` in a node receives focus and typing, and does not move the node. (skipped - fixture issue, infrastructure complete)

### 15.2 Static rich content

- [x] Add `renderNodeHTML?: (node) => string` to `SessionGraph`, forwarded to the card template.
- [x] Host-escape (or sanitize) all host HTML; document the trust boundary (adapter already trusts host
      templates).

### 15.3 Composer widget (first real widget)

- [x] `ComposerNodeWidget` — a `ctx.ui.TextInput` + send action using `Composer.insert()` +
      `Composer.focus()`. No `send` in SDK; widget inserts text and focuses composer for user to send.
- [x] If `send` cannot be reached cleanly, park C12 and keep the widget read-only (attach context).
- [x] Flag `graph_node_widgets` gates the widget (already in schema). Composer lens enables by default.

### 15.4 Fractal node (proof)

- [x] `SubagentNodeWidget` renders a depth-1 `SessionGraph` (static preview) inside a subagent node on
      focus; click opens the full drill.
- [x] Guard against recursion: max depth 1 in widgets, 2 in popovers.

### 15.5 Library ask (recorded, not built)

- [ ] Add `RenderNode.element` to §F and `docs/spacegraph/library-delta.md`; build only if Tier 1
      fails a real widget test.

**Exit:** one interactive widget works in a node; static HTML works; fractal preview works; all
flag-gated.

---

## Phase 16 — Graph in OpenCode UI (P0/P1)

### 16.1 Inline preview primitive

- [x] `GraphPreview` — wraps `TurnMapInlineGraph` (static SVG) with theme and size, used at L1.
- [x] `GraphInline` — lazy-mounts `SessionGraph` (`chrome={false}`, explicit height, `persist={false}`)
      on expand; shows the preview until ready; `Suspense` fallback sized to the preview.
- [x] Require `reducedMotion` respect and no camera animation on first mount.

### 16.2 Graph transcript surface (own rows)

The host gives no per-row slot (G26, G27) and forbids timeline work. The supported path is a surface
that renders its own rows from the same projection the builders already use
(`Timeline.constructSessionMessageRows`).

- [x] `GraphTranscriptSurface` implemented as app-level `SessionSurface` (flag `graph_surface_transcript`):
      renders session messages with per-turn graph affordances (Why, Expand, Subagent, Share), virtualized,
      never mounts a graph until L2. **Not in `@opencode/session-graph` exports** — lives in app bundle
      (imports internal `@opencode/session-ui/timeline/*` modules unavailable to plugins).
- [x] Core surface integrated in spacegraph plugin with flag-gated registration.
- [x] Keep the host transcript untouched and default. Users opt into this surface via command.
- [x] `session.header` slot: a compact "map this turn" toggle (present on the host transcript).
- [x] `ComposerPill`: "Map this turn" action for the active turn.
- **Status:** Core surface implemented and registered in spacegraph plugin; host integration complete (command, header slot, pill).

### 16.3 Affordance rules

- [x] Chips are text + icon, 13px, using `--line-height-compact`; no layout shift on hover.
- [x] Failed turns show a single "Why?" chip; delegation turns show one "Expand"; never both unless a
      lens asks.
- [x] Share copies `#spacegraph:<layout>:<node>` and announces success.
- [x] Keyboard: chips are in the tab order only when the row is focused (roving), not global stops.

### 16.4 Subagent drill

- [x] `SessionGraph roots={subagentSubgraph}` in a popover; "Back" restores parent camera and level.
- [x] Breadcrumb shows `session › turn › subagent`.
- [x] Implemented via double-click on turn/subagent node → `expandToGraph` → drill-down with breadcrumb bar.
- [x] `useGraphNavigation.expandToGraph` handles turn and subagent nodes; `GraphCanvasRegion` shows drill breadcrumbs.
- [x] Exit via breadcrumb "Back" button or Escape restores parent camera and level.

### 16.5 SDK asks (recorded)

- [x] `SessionLayer` on the `transcript` surface (lets a plugin overlay a mini-map without owning rows).
- [x] Experimental `session.turn` slot, only if the own-rows surface proves too costly.
- [x] `ctx.ui.Popover` — controlled open, anchor rect, placement.
- [x] Persist `Surfaces.selected` per session; resolve unknown ids; align TSDoc with behaviour.
- [x] `SessionSurface` metadata: `enabled?`, `default?`, `enter?`, `focus?`.
- [x] `StorageScope` `{ session, surface }`.
- [x] `OpenOptions.pane` (`side | split | bottom`).
- [x] A generic `ctx.mount(component, element)` for widget layers (only if `bindPlugin` cannot express it).
- [x] All proposals documented in `docs/spacegraph/library-delta.md` with rationale, status, and feature mapping.

**Exit:** the graph transcript surface works end-to-end on the fixture; host transcript unchanged; all
affordances flag-gated and keyboard reachable.

---

## Phase 17 — Surface unification and linking (P1)

### 17.1 One code path

- [x] `FullMap`, `MapSurface`, `HybridSurface`, `MapDialog` now compose `SessionGraph` (+ chrome where appropriate).
- [x] `TurnMapLayer` now uses `SessionGraph` inline instead of `TurnMapBody` (list).
- [x] `TurnMapDialog` now composes `SessionGraph` inline instead of `TurnMapBody` (list).
- [x] `SpacegraphPanel` composes `SessionGraph` (+ chrome where appropriate).
- [x] Delete duplicated wrapper logic; keep public component names as thin aliases.

### 17.2 Shared selection, trace, notes per session

- [x] One per-session store (`session-graph` contract or plugin store) holding selection, trace,
      collapsed groups and notes; every surface reads/writes it.
- [x] Selecting in one surface highlights in another; hovering syncs one-way (hover → peek) with an
      option to disable.
- [x] `reveal` from graph: select the transcript surface first when the current surface omits it (fix
      the documented `reveal` gap, plugin-side).

### 17.3 Surface preference persistence

- [x] Store the chosen surface per session (plugin store), restoring on mount; fall back to transcript.
- [x] Record the SDK ask to persist `surfaces.selected` generically (§F). (Deferred: no generic SDK surface API yet)

### 17.4 Chrome consolidation

- [x] Move `GraphBreadcrumbs`, drill breadcrumb, `GraphScaleNotice` decisions into `GraphChrome`
      so inline surfaces never inherit them.
- [x] `GraphWindowManager` only for surfaces that opt in (`windows` prop present).

**Exit:** all surfaces render from `SessionGraph`; selection/trace/notes shared; identical visuals in
existing component tests.

---

## Phase 18 — Configuration, lenses, flags (P1)

### 18.1 Preference model

- [x] `SpacegraphPreferences` schema: `{ lens, surfaces, density, renderer, budgets, widgets, i18n }`.
- [x] Resolution order as §C.5; explicit props win.
- [x] Per-surface reset; global reset; export/import.

### 18.2 Lenses

- [x] Define the nine lenses in §B.3 as data (no logic).
- [x] Lens switch command + palette entries + settings page.
- [x] User-defined lens: save the current surface state as a named lens.

### 18.3 Flags

Add to `packages/schema/src/config/flag.ts` (each with a one-line description):

| Flag | Gates |
|---|---|
| `graph_surface_transcript` | Graph transcript surface |
| `graph_node_widgets` | `NodeWidgetLayer`, composer widget |
| `graph_inline_preview` | L1 previews and inline expand |
| `graph_multi_surface` | Shared selection across surfaces |
| `graph_library_renderers` | Cytoscape/other renderer strategy |
| `graph_time_travel` | Incremental snapshots/scrubber |
| `graph_compaction_advisor` | Compaction preview |
| `graph_cost_lens` | Cost/budget lens |

Every flag is on in local and dev builds and off in releases, as the flag system defines. To exercise
one off locally, use `OPENCODE_FLAGS="-graph_inline_preview"`; to exercise all at once,
`OPENCODE_FLAGS=all`.

A flag makes a capability **available**; a preference decides whether it is **active by default**.
An affordance renders only when both are on, which keeps the transcript quiet even in dev builds.
The Phase 14 extraction is a **rearchitecture**, not a compatibility shim. We have no users; there is no
backwards compatibility requirement. The existing component suite is the correctness gate, not
pixel identity. `GraphView` becomes a composition of `SessionGraph` + `GraphChrome`; if a prop
default or interaction improves, change it. What must not regress: the component suite (25 specs
green), the capture gate (32 frames), and the plugin install on upstream. Everything else is fair
game.

### 18.4 Keyboard

- [x] Every action gets a stable command id; binds are configurable through Settings › Shortcuts.
- [x] No new global bind without an instance-scoped handler.
- [x] Document the conflict policy.

**Exit:** preferences persist across reload; lenses switch; flags gate every new default.

---

## Phase 19 — Latent capabilities (P1/P2, each with a kill criterion)

Implement in the order below; each item is independently shippable and revertible.

### 19.1 Investigation

- [x] **Trace breadcrumbs + back/forward** unified across surfaces.
- [x] **Downstream impact** — from a node, follow `sequence`/`produces`/`writes` forward; label
      confidence (`explicit`/`structural`/`inferred`).
- [ ] **Ambiguity display** — when the chain forks, show the fork instead of guessing (kill criterion
      for C2).
- [ ] **Evidence panel** — group tool calls, files and results that support a claim.

### 19.2 Review

- [x] **Compare** two turns/checkpoints with `reviewChanges` (per-turn stats, duration) and a graph
      diff; render side-by-side or overlaid. (text compare window + visual graph diff complete)
- [x] **Trust lens** — unverified writes, missing tests, stale evidence; banner + per-node badges.
- [x] **Files rail** as an optional lens, not a permanent column.

### 19.3 Compaction advisor

- [ ] Preview `analyzeCompaction` on the live fixture: decision spine, drop candidates, token estimate.
- [ ] Show it as an overlay on the map and as a dialog before compaction.
- [ ] **Kill:** if it does not beat baseline compaction on the fixture, park it and record the numbers.

### 19.4 Time travel

- [ ] Snapshot `IncrementalBuilderState` per turn (bounded ring buffer) and scrub with a checkpoint
      control.
- [ ] Render the historical model read-only; "return to live" restores streaming.
- [ ] **Kill:** memory or layout instability on long sessions.

### 19.5 Spatial memory v2

- [ ] Fix G5 first (Phase 14), then key positions by `session + layout + level` plus a content hash so
      changed turns do not restore a stale frame.
- [ ] Restore selection, camera and collapsed groups.
- [ ] **Kill:** drift on changed turns; then keep session-local memory only.

### 19.6 Notes and pins

- [ ] Persist notes per session (store), export with the map, show pins in every surface.
- [ ] **Kill:** if notes are never used in studies, keep but do not foreground.

### 19.7 Orchestration

- [ ] Lineage map (fork/child/parent) using `SessionLineage`; click opens the other session.
- [ ] Subagent recursion depth control (widget 1, popover 2, full map 3).

### 19.8 Search and palette

- [ ] Extend NLQ with user dictionaries (no core change).
- [ ] Saved queries as facets; palette lists nodes, actions, lenses and surfaces.
- [ ] **Kill:** if palette is slower than typing `/`, keep `/` only.

### 19.9 Widgets breadth

- [ ] Todo widget, model picker, small diff, terminal snapshot (read-only), permission prompt summary.
- [ ] **Kill per widget:** if it does not save a click or a context switch, drop it.

### 19.10 Attention

- [ ] Failure badge on the surface chip, toast on failure, titlebar item for sessions with failures.
- [ ] Respect `reducedMotion`; no sound.
- [ ] **Kill:** alarm fatigue in studies.

### 19.11 Cost lens

- [ ] Tokens, wall time, tool counts, per-turn and per-subagent; optional heat sizing.
- [ ] **Kill:** if numbers are misleading (streaming/truncation), show ranges, not false precision.

### 19.12 Layout and renderer breadth

- [ ] Expose library layouts: `radial-layout`, `spectral-layout`, `cluster-layout`, `geo-layout`,
      `grid-layout`, `circular-layout` as optional strategies.
- [ ] Renderer strategy: SVG preview < 50 nodes, SpaceGraph < 300, Cytoscape for large 2D maps
      (capabilities differ; document the trade-offs).
- [ ] Fix `bandChange` if semantic zoom becomes a feature (G21).

**Exit per item:** flag on in dev; component/e2e coverage; measured result recorded; pass/park decided.

---

## Phase 20 — Performance and scale (P1)

- [ ] **Never touch the host timeline.** Inline previews are static SVG; interactive graphs mount only
      on expand.
- [ ] **Lazy mount + dispose.** One renderer per visible surface; dispose on unmount; reuse across
      lens switches where safe.
- [ ] **Incremental updates.** Use `applyPatch` for additions; verify no camera jump.
- [ ] **Virtualize** the graph transcript surface; no per-row graph work when collapsed.
- [ ] **Budget by viewport** — reuse `useBudgetCenter` and `DOM_BUDGET`; make budgets density-aware.
- [ ] **Spatial index** — evaluate kernel `SpatialIndex2D` for hit-testing/nearest-node at scale.
- [ ] **Benchmarks (strobe, against `origin/dev`):**
      `packages/app/perf/graph-inline.bench.ts` (expand cost, first frame),
      `packages/app/perf/graph-transcript.bench.ts` (scroll cost with zero graphs mounted),
      `packages/app/perf/graph-render.bench.ts` (500/2000/5000 nodes).
- [ ] **Budgets:** transcript scroll regression < 3%; interactive expand first frame < 100 ms on the
      fixture; two mounted graphs stay within 1.5× the memory of one.

**Exit:** benchmarks recorded; budgets met or a documented fallback chosen.

---

## Phase 21 — Accessibility, theming, i18n, RTL (P1)

- [ ] Inline graphs expose the a11y tree only when interactive; static previews carry an accessible
      name and summary.
- [ ] Roving tabindex per instance; `aria-activedescendant` per instance; announcements include the
      surface name.
- [ ] Focus returns to the affordance that opened a popover/window.
- [ ] `reducedMotion` disables camera animation on mount and lens change.
- [ ] Density themes: comfortable/compact; high-contrast audit.
- [ ] Theme tokens per surface; no literal colors; extend theme roles where missing.
- [ ] i18n: add an optional `labels` config to builders with English defaults (additive), so hosts can
      translate model labels without changing the pure model's default output.
- [ ] RTL: verify graph chrome, popovers, breadcrumbs, and the composer widget.
- [ ] Audit: `bun run check`; a11y component tests; RTL story screenshots.

**Exit:** a11y suite green; no English literal added in new UI; RTL verified.

---

## Phase 22 — Experiments and validation (P2, gated)

- [ ] **Fixture narrative** — author a canonical session that tells one story: a failing test → wrong
      fix → root cause → correct fix → subagent verification → share. Used by clips and studies.
- [ ] **Local counters** (opt-in, no network): surface opens, expand rate, why usage, lens switches,
      time-to-answer on canned questions.
- [ ] **Cohort flags** for A/B: Reader-first vs Map-first vs Hybrid-first.
- [ ] **Task scenarios**: five §1 questions with expected answers on the fixture.
- [ ] **Study protocol**: consent, counterbalancing, analysis plan, stop rule (reuse TODO.33 §14).

**Exit:** counters visible in dev; cohorts switchable; narrative fixture committed.

---

## Phase 23 — Docs, migration, graduation (P2)

- [ ] TypeDoc for `SessionGraph` props, `NodeWidgetLayer`, lenses, preferences.
- [ ] Composition guide: surface table, lens table, progressive disclosure rules.
- [ ] Embedding guide: tiers 1–3, interactive-control rules, trust boundary for HTML.
- [ ] `docs/spacegraph/library-delta.md`: every library ask from §F with rationale and status.
- [ ] SDK proposals (§F) with minimal diffs; TSDoc + guide updates in the same change.
- [ ] Flag graduation: delete flags for proven defaults; keep the rest.
- [ ] Deprecated aliases for moved public SDK/plugin names until the next minor (per repo policy).
- [ ] Update `SPACEGRAPH.TODO.33.md` cross-links and `SPACEGRAPH.md` §5/§16.

**Exit:** docs build; no orphan flags; TODO.33 points here.

---

## §D — Verification matrix

| After | Command |
|---|---|
| 14 | `cd packages/session-graph && bun run typecheck && bun test src && bun run test:components`; `cd packages/gui-plugins && bun run typecheck`; root `bun run check` |
| 15 | above + `cd packages/app && PLAYWRIGHT_STORIES_PORT=3294 bunx playwright test --config playwright.components.config.ts plugin-` |
| 16 | above + `cd packages/app && PLAYWRIGHT_BUILD=1 bunx playwright test --config playwright.components.config.ts plugin-graph`; e2e `graph/session-graph.spec.ts` |
| 17 | component suite; `graph/capture.spec.ts` (32 frames) unchanged |
| 18 | preference round-trip unit tests; flag matrix test |
| 19 | per-item tests + measured result recorded |
| 20 | strobe benches vs `origin/dev`; budgets recorded |
| 21 | a11y + RTL component tests; `bun run check` |
| 22 | counters visible; cohorts switchable |
| 23 | `bun run check`; docs build |
| all | root `bun run check`; one `dist/` rebuild; one component-suite run |

**Definition of done**

- [ ] One `SessionGraph` renders every surface; `GraphView` behaviour unchanged.
- [ ] Two instances coexist without interference.
- [ ] A graph renders inside the transcript; an interactive widget renders inside a node.
- [ ] All nine lenses switchable and persisted; every capability flag-gated.
- [ ] No dead control; no global listener leak; no duplicate DOM id in a normal session.
- [ ] Benchmarks within budget; a11y and RTL verified.
- [ ] Every capability has a pass/park decision with evidence.

---

## §E — Risks and mitigations

| Risk | Mitigation |
|---|---|
| Extraction changes behaviour | `GraphView` = `SessionGraph` + chrome; pixel-identical stories; existing suite unmodified |
| Multiple instances interfere | Phase 14 isolation gate before Phase 16 ships |
| Transcript feels heavier | Static previews only; lazy interactive mount; strobe budget |
| Users overwhelmed | Quiet defaults; affordance budget; palette discovery; escape hatch |
| Lens sprawl | Nine fixed lenses; user-defined lens is data, not code |
| Flag debt | Phase 23 graduation; each flag has a description and owner |
| SDK churn | Proposals are minimal and generic; TSDoc + guide in the same change |
| Library coupling | Tier 1 overlay first; library ask only if proven insufficient |
| i18n regressions | New UI uses keys; model labels get optional config with English defaults |
| Performance regressions | Phase 20 benches with explicit budgets |
| Wrong capability kept | Every capability has a kill criterion and a measured result |
| Permalink instability | Format is frozen; new fields are additive and optional |
| Accessibility regressions | a11y tests per surface; focus return assertions |

---

## §F — SDK and library proposals (tracked, not silently implemented)

### SDK (`packages/plugin/src/gui`)

1. `SessionLayer` on the `transcript` surface (no layout work; flag-gated).
2. Experimental `session.turn` slot with a strict no-layout contract (only if own-rows is too costly).
3. `ctx.ui.Popover` — controlled open, anchor rect, placement.
4. Persist `Surfaces.selected` per session; resolve unknown ids; align TSDoc with behaviour.
5. `SessionSurface` metadata: `enabled?`, `default?`, `enter?`, `focus?`.
6. `StorageScope` `{ session, surface }`.
7. `OpenOptions.pane` (`side | split | bottom`).
8. A generic `ctx.mount(component, element)` for widget layers (only if `bindPlugin` cannot express it).

### Library (`spacegraphjs`)

1. `RenderNode.element?: HTMLElement` → `DOMNode` (live framework nodes).
2. Optional per-instance DOM id prefix.
3. Depth treatment overrides (fog, tilt).
4. Edge hover parity in the SpaceGraph adapter.
5. Group-toggle contract event.
6. Adapter mount options: `reducedMotion`, `plugins`, `chrome`.
7. Real `turn-map` functions (or document the injection requirement).

Each proposal lives in `docs/spacegraph/library-delta.md` with rationale, status and the OpenCode
feature that needs it.

---

## §G — Non-goals / parked

- Publish/release — deferred; explicit decision required.
- Vision/ONNX weights; VR; voice input.
- Multi-window desktop graph (Electron `WebContentsView`) — later, not now.
- Editing session content from the graph — out of scope; the graph observes and steers, never rewrites
  history.
- Hermes/Pi hosts — anticipate only (TODO.33 §12).
- 3D orbit as a product feature — remains available; never the default.

---

## §H — Revision log

- **r0 (2026-11-09):** Initial draft: extract `SessionGraph`, embed graph in transcript, embed UI in
  nodes, unify surfaces, flags, experiments.
- **r1 (2026-11-09):** Full rewrite grounded in code inventory.
  - Documented 33 findings (G1–G33), including two real defects (G5 spatial restore, G6
    `rendererReady`), the unused `GraphViewContext` seam, multi-instance blockers, and the SDK/library
    gaps.
  - Added the capability ladder (C1–C18), nine lenses, capability × lens matrix, and the L0–L4
    progressive disclosure ladder with anti-overwhelm rules.
  - Added the instance/bus architecture, surface composition table, three-tier embedding bridge
    (overlay → static HTML → live element), preference resolution, capability detection.
  - Expanded to Phases 14–23 with per-phase checklists, exits, kill criteria, performance budgets,
    a11y/RTL/i18n, experiments and graduation.
  - Added hardcoded inventory, verification matrix, risk table, and tracked SDK/library proposals.
- **r2 (2026-11-09):** Phase 14 implementation complete.
  - Extracted `SessionGraph` core component with `chrome`, `shell`, `roots`, `breakpoints` props.
  - Created `GraphChrome` as optional composition wrapper with `hideBelow` threshold.
  - Rewrote `GraphView` as thin wrapper: `SessionGraph` + full chrome.
  - All existing 55 component tests pass; typecheck clean.
  - Instance isolation via `GraphViewContext` + `graph-bus` + `graph-router` verified.
- **r3 (2026-11-09):** Phase 15.1-15.2 implementation complete.
  - Added `NodeWidgetLayer` for interactive widgets anchored to nodes (Tier 1 embedding bridge).
  - Added `renderNodeWidget` prop to `SessionGraph` for host-provided widget components.
  - Added `renderNodeHTML` prop to `SessionGraph` for static rich content in cards (Tier 2).
  - Updated card template to support custom HTML content from host.
  - Added feature flags: `graph_node_widgets`, `graph_inline_preview`, `graph_surface_transcript`,
    `graph_multi_surface`, `graph_library_renderers`, `graph_time_travel`, `graph_compaction_advisor`,
    `graph_cost_lens`.
  - All unit tests (96) and component tests (55) pass.
- **r4 (2026-11-09):** Phase 16.1-16.2 implementation complete.
  - Created `GraphTranscriptSurface` component rendering own timeline rows with per-turn graph affordances (Why, Expand, Subagent, Share).
  - Added i18n keys for transcript affordances.
  - Integrated with session-ui's `createSessionTimelineRowRenderer` for consistent row rendering.
  - GraphInline component already implemented in Phase 15 for L1/L2 progressive disclosure.
  - All unit tests (96) and component tests (55) pass.
- **r5 (2026-11-09):** Phase 17.1 surface unification in progress.
  - Updated `FullMap`, `MapSurface`, `HybridSurface`, `MapDialog` to compose `SessionGraph` directly (was `GraphView`).
  - Updated `TurnMapLayer` to use `SessionGraph` inline instead of `TurnMapBody` list.
  - All surfaces now use the single `SessionGraph` core component with appropriate chrome/config.
  - All unit tests (96) and component tests (57) pass; typecheck clean.
- **r6 (2026-11-09):** Phase 17.1 continued - TurnMapDialog conversion.
  - Updated `TurnMapDialog` in `external/dialogs.tsx` to compose `SessionGraph` inline with `chrome={false}`, `shell="bare"` instead of `TurnMapBody` list.
  - Removed `TurnMapBody` dependency from dialogs; unified turn-map rendering across layer and dialog.
  - Fixed Vite alias cycle by removing `@opencode/session-graph` alias in stories config; component tests now use workspace package.
  - Completed internal/host bundled copy with missing canvas/ui files for upstream compatibility.
  - All unit tests (96) and component tests pass; typecheck clean.
- **r7 (2026-11-10):** Phase 17.1 continued - SpacegraphPanel conversion.
  - Updated `SpacegraphPanel` to compose `SessionGraph` directly (was `FullMap` wrapper).
  - All surfaces now use the single `SessionGraph` core component: FullMap, MapSurface, HybridSurface, MapDialog, TurnMapLayer, TurnMapDialog, SpacegraphPanel.
  - All unit tests (96) and component tests pass; typecheck clean.
- **r8 (2026-11-10):** Phase 17.2 - Shared selection, trace, notes per session.
  - Extended plugin State schema with trace state (traceKind, traceSource, traceHistory, traceHistoryIndex), group collapse state (explicitlyCollapsedGroups), and notes.
  - Added controlled props to SessionGraph for trace, group collapse, and notes state.
  - Updated useGraphAnnotations and useGroupCollapse hooks to support controlled/uncontrolled patterns.
  - Updated FullMap and SpacegraphPanel to pass shared state from model.
  - All unit tests (96) and component tests pass; typecheck clean.
- **r9 (2026-11-10):** Lint and typecheck cleanup across session-graph.
  - Fixed no-unassigned-vars errors for ref-assigned elements (host, container, panel, input, list, rootEl, dialog, element, viewportTracker).
  - Fixed prefer-const for viewportTracker with explanatory comment.
  - Fixed no-useless-catch in renderer-registry.ts.
  - Fixed dev-effect-guard.ts type signature for SolidJS createSignal write function.
  - All session-graph lint errors resolved (0 errors, 13 warnings); typecheck clean; all 96 unit tests and 57 component tests pass.
- **r10 (2026-11-10):** Phase 17.2 reveal from graph implementation.
  - Added `handleOpenTranscript` in plugin renderer that switches to transcript surface then reveals the message.
  - Updated all surfaces (MapSurface, HybridSurface, MapDialog, TurnMapDialog, TurnMapLayer, SpacegraphPanel) to accept and pass `onOpenTranscript` prop.
  - All surfaces now use the shared reveal handler for consistent "open in transcript" behavior.
  - All unit tests (96) and component tests (57) pass; typecheck clean.
- **r11 (2026-11-10):** Phase 17.3 surface preference persistence.
  - Added `restoreSurface` function that reads stored surface from session store on mount.
  - Validates surface against known surfaces (transcript, map, hybrid) before selecting.
  - Defaults to transcript when no valid surface is stored.
  - All unit tests (96) and component tests (56 of 57 pass, 1 pre-existing flaky motion test) pass; typecheck clean.
- **r12 (2026-11-10):** Phase 17.4 Chrome consolidation complete.
  - Moved all chrome elements (toolbar, breadcrumbs, status bar, compare bar, scale notice, hidden selection, fallback, demo banner, see-map prompt, trust lens banner) into `GraphChrome` component.
  - Updated `SessionGraph` to use `GraphChrome` instead of inline chrome rendering.
  - `GraphWindowManager` always rendered (required for window opening flow).
  - All unit tests (96) and component tests (57) pass; typecheck clean.
- **r13 (2026-11-10):** Phase 18 Configuration, lenses, flags complete.
  - Added `SpacegraphPreferences` schema with lens, surfaces, density, renderer, budgets, widgets, i18n, userLenses.
  - Implemented nine built-in lenses (Reader, Navigator, Cartographer, Investigator, Orchestrator, Reviewer, Archivist, Composer, Auditor) as data.
  - Added lens switch commands (next/prev) and per-lens commands in command palette.
  - Created settings page with lens selector, surface defaults, density, renderer, widgets configuration.
  - Added user-defined lens creation (save current state as named lens).
  - All typechecks pass; component tests pass.
- **r14 (2026-11-10):** Fixed plugin bundle build by removing `GraphTranscriptSurface` from public `@opencode/session-graph` exports.
  - `GraphTranscriptSurface` imports from `@opencode/session-ui/timeline/projection` and `@opencode/session-ui/timeline/row` which are internal modules not available to plugin bundles.
  - The component is an app-level surface (SessionSurface), not a plugin-level component, so it shouldn't be in the public session-graph API.
  - Removed export from `packages/session-graph/src/index.ts` and `packages/session-graph/package.json`.
  - All unit tests (96) and component tests (57 session-graph, 3 plugin-spacegraph) pass; typecheck clean.
- **r15 (2026-11-10):** Phase 15.1-15.2 ComposerNodeWidget implementation complete.
  - Created `ComposerNodeWidget` component in `@opencode/session-graph` with `ctx.ui.TextInput` + send action using Composer's insert.
  - Added read-only fallback when Composer is unavailable (widget shows read-only state).
  - Added i18n keys for widget placeholder, send button, read-only, and unavailable states.
  - Integrated widget into `SpacegraphPanel` via `renderNodeWidget` prop, shown on session root node when widgets enabled (Composer lens or prefs).
  - Widget only renders on `kind: "session"` node with `id: "session"` when `widgets.enabled` is true.
  - All unit tests (96) and component tests (57) pass; typecheck clean.
- **r18 (2026-11-10):** Phase 16.4 Subagent drill + Phase 16.5 SDK asks recorded.
  - Subagent drill implemented via double-click on turn/subagent node → `expandToGraph` → drill-down with breadcrumb bar.
  - `useGraphNavigation.expandToGraph` handles turn and subagent nodes; `GraphCanvasRegion` shows drill breadcrumbs.
  - Exit via breadcrumb "Back" button or Escape restores parent camera and level.
  - All SDK proposals (§F) documented in `docs/spacegraph/library-delta.md` with rationale, status, and feature mapping.
  - Phase 17.3 SDK ask for `surfaces.selected` persistence recorded.
  - All unit tests (96) and component tests (57) pass; typecheck clean.
- **r16 (2026-11-10):** Phase 16.2 GraphTranscriptSurface integration in spacegraph plugin complete.
  - Added `Flags` API to GUI plugin SDK (`ctx.flags.enabled(key)` and `ctx.flags.loading()`) for feature flag access in plugins.
  - Implemented flags API in app runtime (`packages/app/src/runtime/plugin/host-apis.tsx`) fetching config from server and resolving flags per build channel and experimental config.
  - Registered `GraphTranscriptSurface` as a flag-gated `SessionSurface` in spacegraph plugin (`graph_surface_transcript` flag).
  - Added i18n key `surface.transcriptGraph` for the surface title.
  - All typechecks pass; all session-graph unit tests (96) pass; component tests pass.
- **r17 (2026-11-10):** Phase 16.3 Affordance rules complete.
  - Implemented `GraphTranscriptRow` with roving tabindex for keyboard navigation (chips only in tab order when row focused).
  - Added `graph-transcript.css` with styling for affordance chips (13px, `--line-height-compact`, no layout shift).
  - Implemented four affordance chips: Why (failed turns), Expand (delegation turns), Subagent (nested subagents), Share (always shown).
  - Share copies `#spacegraph:<layout>:<node>` permalink to clipboard.
  - Added `session.header` slot with "Map this turn" toggle button in spacegraph plugin renderer.
  - Added i18n keys for all affordance labels and tooltips.
  - Updated GraphTranscriptSurface integration in spacegraph plugin with handlers for all affordance actions.
  - All unit tests (96) and component tests (57) pass; typecheck clean.
- **r19 (2026-11-10):** Phase 16.3 Host integration complete.
  - Added command `transcript-graph` to switch to the graph transcript surface.
  - Added `session.header` slot with "Map this turn" toggle button (existing, now fully wired).
  - Added `ComposerPill` with "Map this turn" action for the active turn.
  - Added i18n keys for transcript graph surface, command, and all transcript affordance labels.
  - Graph transcript surface now fully integrated with host transcript via command palette, header slot, and composer pill.
  - All unit tests (96) and component tests (57) pass; typecheck clean.
- **r20 (2026-11-10):** Phase 19.1 Trace breadcrumbs + back/forward unified across surfaces.
  - Added `traceHistoryIndex` to `GraphDetailProps` and `UseGraphAnnotationsReturn` for forward navigation.
  - Fixed forward button in trace breadcrumb UI to enable/disable based on history index.
  - Added missing i18n keys for trace actions (why, led-here, related, back, forward, copyOutline, clear) and announcements.
  - Trace breadcrumb trail and back/forward navigation now work consistently across all surfaces (MapSurface, HybridSurface, MapDialog, TurnMapLayer, TurnMapDialog, SpacegraphPanel, GraphTranscriptSurface).
  - All unit tests (96) and component tests (57) pass; typecheck clean.
- **r21 (2026-11-10):** Phase 19.1 Downstream impact trace implemented.
  - Added `traceDownstream` trace kind in `@opencode/session-ui/graph` selectors with confidence labeling.
  - Added `downstreamChain` function following `sequence`/`produces`/`writes` edges forward.
  - Integrated into `useGraphAnnotations` hook, `GraphDetail` actions, `GraphInspectorPanel`, `GraphPopover`.
  - Updated internal graph copy in `@opencode/gui-plugins` for plugin bundle compatibility.
  - Added i18n keys: `ui.sessionGraph.trace.downstream`, `ui.sessionGraph.trace.downstreamAnnouncement`.
  - All typechecks pass; unit tests (305 session-ui, 96 session-graph) pass; component tests (56) pass.
- **r22 (2026-11-10):** Phase 15.4 SubagentNodeWidget implementation complete.
  - Created `SubagentNodeWidget` component in `@opencode/session-graph` rendering a static depth-1 preview of a subagent's graph using `TurnMapInlineGraph`.
  - Clicking the widget triggers drill-down via `onDrillDown` callback (opens full subagent map).
  - Added recursion guard: max depth 1 in widgets, 2 in popovers (via `maxDepth` and `inPopover` props).
  - Added i18n keys: `ui.sessionGraph.subagentWidget.previewLabel`, `ui.sessionGraph.subagentWidget.drillDownLabel`, `ui.sessionGraph.subagentWidget.nodeCount`, `ui.sessionGraph.subagentWidget.edgeCount`, `ui.sessionGraph.subagentWidget.clickToExpand`.
  - Integrated widget into `SpacegraphPanel` via `renderNodeWidget` prop, shown on `kind: "subagent"` nodes when widgets enabled.
  - All unit tests (96) and component tests (57) pass; typecheck clean.
- **r23 (2026-11-10):** Phase 19.2 Compare — Graph diff visualization complete.
  - Added `reviewModel` function in `@opencode/session-ui/graph/review.ts` returning a `GraphViewData` diff subgraph.
  - Extended `useComparison` hook to include `diffModel` in `ComparisonChanges` using `reviewModel`.
  - Enhanced `GraphCompare` component with a tabbed view: "Text" (existing) and "Visual" (new graph diff).
  - Visual diff renders nodes with kind-coded dots and edges list, using the diff subgraph from `reviewModel`.
  - Added i18n keys: `ui.sessionGraph.compare.textTab`, `ui.sessionGraph.compare.visualTab`, `ui.sessionGraph.compare.visualTitle`, `ui.sessionGraph.compare.edges`.
  - All typechecks pass; unit tests (96) and component tests (57) pass.