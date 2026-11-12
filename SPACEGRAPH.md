# SpaceGraph for OpenCode — Fork README

> **Status (2026-11-12):** M0–M6 are implemented and M7 is complete except the outsider video
> review. M8 docs, migration notes, and deprecated aliases are in place; M9 remains the final gate.
> The capture gate covers 32 `@graph @capture` frames and the committed screenshot set is 35 app
> frames plus 3 bundle frames, re-blessed headless on 2026-11-12. `bun run check` is green (53/53).
> The timed benchmark comparison and the M7 video review still need a display-capable machine and
> outside reviewers. See [`SPACEGRAPH.TODO.35.md`](SPACEGRAPH.TODO.35.md) for the active plan;
> `SPACEGRAPH.TODO.34.md` is the frozen design archive.

---

## 1. Why SpaceGraph?

**The problem:** OpenCode's session model captures rich structure (tool calls, file ops, subtasks, retries, compactions) but presents it as a chronological log. Beyond a few dozen turns, developers can't easily answer:
- **Why** did the agent change this file?
- **Which** tool calls led to this failure?
- **What** did a subagent contribute?
- **What** changed after the failing test?
- **Where** did the agent retry or change direction?

In a transcript, answering these requires scrolling, searching, and mentally reconstructing context. A graph makes these relationships **directly navigable**.

**The paradigm shift:** From reading to exploring.

> **When agent activity becomes sufficiently complex, spatial navigation through relationships is more effective than linear navigation through messages.**

This gives the project a clear success criterion: measured task performance on investigative questions, not visual appeal.

**Why this matters beyond debugging:**

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

**What the graph exposes that the transcript hides:**

| Relationship type | Transcript | Graph |
|-------------------|------------|-------|
| **Sequence** | Implicit in scroll order | Explicit edges, navigable |
| **Causality** | Inferred by reading | `evidence` edges from test failure → fix |
| **Provenance** | Scattered across messages | `reads`/`writes` edges file ↔ tool |
| **Delegation** | Nested in conversation | `delegates` edge turn → subagent |
| **Retry/backtrack** | Buried in sequence | `retry` edge + `interrupted` status |

Three semantic levels — Overview → Execution → Detail — with progressive disclosure (nodes collapse/expand across levels, not hidden behind accordions).

---

## 2. Architecture (OpenCode Integration)

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
  [spacegraph] [svg]      (cytoscape removed)
   2D + 3D      static
       │       │
       └───────┴───────┘
                ▼
   @opencode/session-graph         Canvas, toolbar, inspector, breadcrumbs, search, minimap, a11y
                │
                ▼
   packages/app                    Per-session mode switch, lazy wrapper, toggle, commands
```

### Package Roles (OpenCode Side)

| Package | Responsibility |
|---------|---------------|
| `session-ui/src/graph` | Pure model: vocabulary, builder, levels, layout, selectors, fixture |
| `session-graph` | Host UI: `SessionGraph` core, `GraphView` chrome wrapper, canvas, toolbar, inspector, breadcrumbs, search, minimap, a11y |
| `packages/app/src/session/graph` | Integration: panel, mode branch, turn-map overlay, permalinks, commands |

### Host Modules (`session-graph/src/`)

| Module | What It Owns |
|--------|--------------|
| `ui/GraphView.tsx` | Surface: toolbar, canvas region, inspector, wiring; owns semantic level & layout |
| `ui/graph-camera.ts` | Camera: frame, zoom, 100% reference readout |
| `ui/graph-selection.ts` | Selection & path; mirrors `GraphController` state into signals |
| `ui/graph-anchors.ts` | Screen anchor of a node (popover, peek, pinned window placement) |
| `ui/graph-windows.tsx` | Windows over map: kinds offered, first placement; manager moves/stacks |
| `ui/cardTemplate.ts` | Card markup: kind glyph, accent, tier, one distinguishing fact |
| `ui/card-copy.ts` | Card words; host owns language, template never hardcodes English |
| `ui/node-data.ts` | Readers over node's untyped `data`; card & inspector agree on fields |
| `ui/GraphDetail.tsx` | Node detail: header + body, shared by every surface |
| `canvas/` | Renderer seam: contract, registry, adapter, canvas; never imports concrete backend |

The host imports **only** `@spacegraphjs/renderer` (contract). No renderer branches — differences are capability flags.

---

## 3. Graph Model (OpenCode Vocabulary)

### Node Kinds (stable IDs, `minLevel` for semantic zoom)

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

### Edge Kinds (confidence: `explicit` / `structural` / `inferred`)

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

### Selectors (Answering the Five Questions)

| Question | Selector |
|----------|----------|
| Why did the agent change this file? | `why(model, fileNodeID)` |
| Which tool calls led to this failure? | `forwardChain(model, errorNodeID)` |
| What did the subagent contribute? | `ancestors(model, subagentNodeID)` |
| What changed after the failing test? | `search` + `forwardChain` |
| Where did the agent retry/change direction? | `search` for `retry`/`error` nodes |

Proven against canonical fixture in `selectors.test.ts`.

### Semantic Levels (Host Policy: `levels.ts`)

| Level | Nodes Visible | Edges Visible | Label Mode |
|-------|---------------|---------------|------------|
| `overview` | session, turn, phase (clusters) | `part-of` only | Cluster counts |
| `execution` | All except `reasoning`, `diff`, `compaction` | All except `inferred-cause` | Full labels |
| `detail` | All nodes | All edges | Full detail |

DOM budget caps cards per level (overview 12, execution 40, detail 24); excess degrades to dots.

### Deterministic Layout (`layout.ts`)

- **X** = turn index × `turnGap` (320) + event ordinal × `step` (48)
- **Y** = lane × `laneGap` (56); lanes: `prompt`, `narrative`, `explore`, `edit`, `verify`, `delegate`, `artifacts`
- **Z** = hierarchy depth × `depthStep` (64)
- Phase clusters at first member's X on phase's lane
- File nodes near first write on artifacts lane
- Append-only: new turns append right; existing positions never change

---

## 4. Hybrid Experience (Summary)

| Mode | Description |
|------|-------------|
| **transcript** | Classic log |
| **graph** | Full map |
| **hybrid** | Map + log together, log never detaches |

**Arrangements:** `stacked` (map above), `side` (map beside), `floating` (map over, movable).

**Entry points:** Toolbar "show log beside map", `graph.hybrid` (`mod+shift+h`), turn-map overlay (`mod+alt+t`), side panel (`+` menu), permalinks (`#graph:<nodeID>`).

Detail: [`docs/spacegraph/hybrid.md`](docs/spacegraph/hybrid.md)

---

## 5. Path to Fully Plugin-Based SpaceGraph

### Current: Built-in plugin on fork
Uses public GUI Plugin API for UI (`SessionSurface`, `Panel`, `Command`, `Slot`, `SettingsPage`...) but **data access requires OpenCode internals** (`@opencode/session-ui/graph`, `@opencode/client/solid`).

### Required upstream contracts for portable plugin

| Contract | Purpose |
|----------|---------|
| `SessionDataProvider` | Standard access to messages, tool calls, file edits + streaming events |
| `GraphModelBuilder` | Host-neutral transform: session data → graph spec |
| `RendererAdapter` | Plugin-contributed renderer backends via contract |
| `SessionEventBus` | Standard events for streaming graph updates |

### Architecture Inversion (Future)

```
spacegraphjs (core)
  ├── @spacegraphjs/renderer (contract)
  ├── @spacegraphjs/adapter (domain → RenderModel)
  └── @spacegraphjs/plugin-api (NEW: data contracts)
        ↑
OpenCode plugin  │  Hermes plugin  │  Pi Agent plugin
(provides data)  │  (provides data)  │  (provides data)
```

### Why Not Done Yet
1. No external consumer demand — OpenCode is the only host
2. Phase 6.1 proves the pattern in `spacegraphjs/` (second host), not plugin API
3. Other hosts (Grant Workspace) consume `spacegraphjs` directly
4. Fork velocity > upstream review cycles

### Decision Framework
| Condition | Action |
|-----------|--------|
| Another OpenCode-based host appears | Prioritize contracts upstream |
| Hermes / Pi Agent want compatibility | Co-design with them |
| OpenCode maintainers adopt SpaceGraph | Rungs 1-4 don't need plugin API changes |
| SpaceGraph team wants external distro | Build external bundle; migrate when API ready |

### Library contract versions and breaking changes

The library contracts are consumed at source through the `spacegraphjs` submodule. A contract change
is a hard break: No `CONTRACT_VERSION`, no `negotiateContract` handshake, no `@deprecated`
shims, and no compatibility layer. The rule is **delete, don't deprecate** for the library. A
consumer takes the new contract with a `gitlink bump` of the submodule.

| Package | Version |
|---|---|
| `spacegraphjs` | 8.5.0 |
| `@spacegraphjs/renderer` | 0.3.0 |
| `@spacegraphjs/adapter` | 0.2.0 |
| `@spacegraphjs/kernel` | 0.1.0 |
| `@spacegraphjs/spacegraph-renderer` | 0.3.1 |
| `@spacegraphjs/svg-renderer` | 0.2.0 |

Capture verification is **advisory** in the check output; the canonical gate is
`packages/app/e2e/graph/capture.spec.ts`, and it writes no frame without `GRAPH_CAPTURE_DIR`.

The OpenCode plugin SDK follows the repository policy instead: a moved public name keeps a
deprecated alias until the next minor. See [`docs/spacegraph/migration.md`](docs/spacegraph/migration.md)
for the current aliases.

**Fork preserves the option:** `session-ui/graph` (pure model), `session-graph` (host UI), `gui-plugins/spacegraph` (plugin shell) are already cleanly separated.

Detail: [`SPACEGRAPH.md §5`](SPACEGRAPH.md#5-path-to-fully-plugin-based-spacegraph)

---

## 6. Quick Links

| Need | Go To |
|------|-------|
| **Run the prototype** | [`docs/spacegraph/getting-started.md`](docs/spacegraph/getting-started.md) |
| **Release write-up** | [`docs/spacegraph/prototype.md`](docs/spacegraph/prototype.md) |
| **What we learned** | [`docs/spacegraph/lessons-learned.md`](docs/spacegraph/lessons-learned.md) |
| **Known limitations** | [`docs/spacegraph/known-issues.md`](docs/spacegraph/known-issues.md) |
| **Upstream contribution** | [`docs/spacegraph/upstream.md`](docs/spacegraph/upstream.md) |
| **Evidence gap / T2.2** | [`docs/spacegraph/evidence.md`](docs/spacegraph/evidence.md) |
| **Performance numbers** | [`docs/spacegraph/performance.md`](docs/spacegraph/performance.md) |
| **CI gate (`graph:verify`)** | [`docs/spacegraph/ci.md`](docs/spacegraph/ci.md) |
| **Mouse interaction** | [`docs/spacegraph/interaction.md`](docs/spacegraph/interaction.md) |
| **Reviewer key files** | [`docs/spacegraph/review-guide.md`](docs/spacegraph/review-guide.md) |
| **Composition guide** | [`docs/spacegraph/composition-guide.md`](docs/spacegraph/composition-guide.md) |
| **Embedding guide** | [`docs/spacegraph/embedding-guide.md`](docs/spacegraph/embedding-guide.md) |
| **Library / SDK proposals** | [`docs/spacegraph/library-delta.md`](docs/spacegraph/library-delta.md) |
| **Migration and aliases** | [`docs/spacegraph/migration.md`](docs/spacegraph/migration.md) |
| **All docs index** | [`docs/spacegraph/README.md`](docs/spacegraph/README.md) |

**SpaceGraphJS library:** [`spacegraphjs/README.md`](../spacegraphjs/README.md), [`spacegraphjs/docs/`](../spacegraphjs/docs/), [`spacegraphjs/ROADMAP.md`](../spacegraphjs/ROADMAP.md)

**Active plan:** [`SPACEGRAPH.TODO.35.md`](SPACEGRAPH.TODO.35.md)

---

## 7. License & Ownership

This fork is experimental, community-built, and not an official OpenCode feature. The transcript remains the dependable baseline. The graph is opt-in, lazy-loaded, and reverts cleanly. SpaceGraphJS is developed in `spacegraphjs/` (sibling repo, MIT) and published as independent packages. OpenCode gets the first integration opportunity because it's the tool we use to develop; other agent tools (Hermes, competitors) will follow the same adapter pattern.