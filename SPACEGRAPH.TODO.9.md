# SPACEGRAPH.TODO.9 — Universal Graph Substrate (rev 3, definitive)

**Status:** rev 3, 2026-10-23. Integrates all review insights and explored improvements. Supersedes TODO.7/TODO.8. Preserves original IDs (`T19`–`T33`, `G19`–`G33`, `D23`–`D28`); new substrate tasks `T34`–`T52`, `G34`–`G52`.

**Testing philosophy:** unchanged — integration over unit, golden fixture + contract tests, visual regression for layouts, property-based for pure functions, E2E for user flows.

---

## Architecture: Universal Graph Substrate

```
┌──────────────────────────────────────────────────────────────────────┐
│                         GRAPH SUBSTRATE                              │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  KERNELS                                                       │  │
│  │  SessionKernel (immutable, append-only, versioned, taggable)   │  │
│  │  WorkspaceKernel (LWW, replaceable, CRDT-mergeable)            │  │
│  │  - Hyperedges (multi-node relations)                           │  │
│  │  - Edge weights + extensible data                              │  │
│  │  - Serialization (binary + JSON)                              │  │
│  │  - Structural diff                                             │  │
│  │  - Time-travel (checkout, fork, replay)                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  DERIVER PIPELINE (pure Kernel → Kernel, composable)           │  │
│  │  - pipe(d1, d2, ...dn)                                         │  │
│  │  - Build graph: track inputs→outputs, incremental invalidation  │  │
│  │  - deriveWorkspace (all domain derivers)                        │  │
│  │  - deriveScope (domain lens)                                   │  │
│  │  - deriveZoom (semantic zoom + cluster expansion)              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  QUERY API (GraphQuery over kernels)                            │  │
│  │  - nodes(pattern) — like CSS selectors                         │  │
│  │  - traverse(ref, edgePattern) — like GraphQL                   │  │
│  │  - path(from, to) — pathfinding                                │  │
│  │  - near(position, radius) — spatial (via R-tree)                │  │
│  │  - count, collect — aggregation                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  LAYOUT + SPATIAL                                               │  │
│  │  LayoutStrategy.compute(kernel, constraints) → LayoutState     │  │
│  │  - ClusterSpec (groups) in constraints, GroupLayout in output  │  │
│  │  - computeIncremental (continuous, opt-in)                       │  │
│  │  - SpatialIndex (R-tree): hitTest, rectTest, near, visibleIn    │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         VIEW LAYER                                   │
├──────────────────────────────────────────────────────────────────────┤
│  RendererAdapter(LayoutState, SpatialIndex) → renderer format       │
│  ViewState (camera, selection, expansion — persistable, syncable)    │
│  ActionRegistry (declarative, per-kind contributions)                │
│  A11ySupport (asTree, summarize, next — screen-reader navigation)     │
│  Registry (static module — extensibility via TS package extension)   │
└──────────────────────────────────────────────────────────────────────┘
```

### Core Invariants (Non-Negotiable)

1. **SessionKernel is immutable** — append-only, versioned, taggable. New messages → new version. Never mutated in place.
2. **WorkspaceKernel is replaceable** — LWW per node, full refresh on snapshot, CRDT-mergeable across clients.
3. **Derivers are pure** — `Kernel → Kernel`. Composable via `pipe()`. Inputs/outputs tracked for incremental invalidation.
4. **Query API is the only navigation** — search, grammar (`g` + mnemonics), review queries all built on `GraphQuery`.
5. **Layouts are pure strategies** — `compute(kernel, constraints) → LayoutState`. Groups via `ClusterSpec`/`GroupLayout`, not kernel nodes.
6. **Spatial index is in view layer** — built from `LayoutState`, O(log n) queries, enables 100k+ nodes.
7. **Renderer is dumb** — receives final node set + positions; no filtering, no domain logic.
8. **Serialization is native** — every kernel encodes/decodes; debugging, export, CI fixtures, offline.
9. **A11y is built-in** — `asTree`, `summarize`, `next` on every kernel; screen readers are first-class users.
10. **Static module registry** — TS packages extend registry at build time; zero runtime cost.

---

## Extensibility: Static Module Registry

```ts
// packages/graph-substrate/src/registry.ts — the extension surface
export interface Registry {
  nodeKinds: Record<string, NodeKindDef>;
  edgeKinds: Record<string, EdgeKindDef>;
  hyperedgeKinds: Record<string, HyperedgeKindDef>;
  derivers: Deriver[];              // ordered pipeline
  layouts: Record<string, LayoutStrategy>;
  actions: Record<string, ActionContribution[]>;   // per kind
  clusterSpecs: ClusterSpec[];
  queryMacros: Record<string, (q: GraphQuery) => QueryResult>;  // g-grammar
}

export const CORE_REGISTRY: Registry = { ... }

// Extension = TS package that spreads + extends
// Host composes at build:
export const REGISTRY = composeRegistry(CORE_REGISTRY, CODE_INTEL_REGISTRY, ADR_REGISTRY)
```

---

## Task Breakdown: Vertical Slices

### Slice 1: Kernel Core (G34) — 3 days
Foundation: kernels, serialization, hyperedges, edge data.

| Task | Description | Verify |
|------|-------------|--------|
| **T34** | `Kernel` — immutable base: `addNode`, `addEdge`, `addHyperedge`, `getNode`, `getEdges`, `filterNodes`, `subgraph`, `version`. Edge carries `weight?` + `data?`. | Property tests: invariants, version monotonic, append-only |
| **T35** | `SessionKernel` — extends Kernel with `appendMessage(msg)`, `tag(name)`, `checkout(version)`, `fork(version)`. | Time-travel: checkout(v) returns exact historical view |
| **T36** | `WorkspaceKernel` — extends Kernel with LWW merge: `merge(other, clock)`, `replaceFrom(snapshot)`. | CRDT: concurrent merges converge; LWW per node |
| **T37** | **KernelCodec** — `encode`/`decode` (binary) + `encodeJSON`/`decodeJSON`. Version-tagged format. | Round-trip: encode→decode === original. JSON readable |
| **T38** | **GraphDiff** — `diffKernels(a, b)` → `{ addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, asKernel(), summarize() }`. | Diff session vs workspace: correct uncommitted files |
| **T39** | Adapter: `buildGraph(input)` uses kernels internally, same signature, same golden output. | `model.golden.with-snapshot.json` matches byte-for-byte |

### Slice 2: Deriver Pipeline (G35) — 2 days
Pure transformations, build graph, scope + zoom.

| Task | Description | Verify |
|------|-------------|--------|
| **T40** | `pipe(...derivers)` + `Deriver` interface: `{ id, inputs, outputs, derive, deriveIncremental? }`. | Property: pipe(d1,d2)(k) === d2(d1(k)) |
| **T41** | **Deriver build graph** — track `inputs→outputs`; on changed inputs, re-run only affected derivers. | Update 1 file → only directory deriver re-runs |
| **T42** | `deriveScope(domains)` — replaces `scopeModel`. Session always included. | `deriveScope(['session'])` output === session-only golden |
| **T43** | `deriveZoom(level, expansion)` — semantic zoom + cluster expansion as pipeline stage. | Zoom pipeline filters by minLevel; expansion overrides per node |
| **T44** | `DiffProvider` — `(turnID) => FileDiffInfo[]` function type; lazy; replaces `diffByTurn` Map. | No Map allocation; called only for file-touching turns |

### Slice 3: Domain Derivers (G36) — 3 days
All workspace facts as composable derivers.

| Task | Description | Verify |
|------|-------------|--------|
| **T45** | `deriveDirectories` + `derivePackages` (with `dependencies`/`devDependencies` data) + `part-of` edges. | Golden fixture: directories + packages match |
| **T46** | `deriveCommits` + `deriveBranches` (with `touches`, `points-at` edges, edge data: files, dates). | Golden fixture: history domain matches |
| **T47** | `deriveSymbols` (hunk + snapshot, `origin`, dedup) + `deriveProcesses` + `derivePorts` (hyperedge for port conflicts) + `deriveIssues`. | Golden fixture: all derived kinds match |
| **T48** | `deriveDocs` — file roles (`config`, `doc`, `adr`, `test`, `fixture`) from path policy + snapshot `config`/`doc` flags + ADR frontmatter (`supersedes` chain via `references` edges). | ADR chain walkable; README links → `references` edges |
| **T49** | `deriveTests` (vitest extractor first; registry is extensible list) + `deriveTestRuns` (hyperedge: run → N tests) + `deriveCoverage` (`covers` edges only when report exists). | Fixture vitest output → named tests with status; run groups via hyperedge |

### Slice 4: Query API (G37) — 3 days
The universal navigation interface.

| Task | Description | Verify |
|------|-------------|--------|
| **T50** | `GraphQuery` core: `nodes(pattern)`, `traverse(ref, edgePattern, direction)`, `count(pattern)`, `collect(pattern, field)`. `NodePattern`/`EdgePattern` with kind, domain, id, data, label, status matching. | "Files this session modified" query returns correct set |
| **T51** | `path(from, to, constraints?)` — shortest path with edge-kind constraints. `near(position, radius)` — via spatial index. | Path between tool and file found; near() uses R-tree |
| **T52** | `queryMacros` — `g`-grammar built on queries: `gp` parent, `gd` directory, `gy` symbol, `gc` commit, `gt` test, `gi` issue, `gr` process, `gb` branch, `gf` file. Each macro = `(q) => NodeRef[]`. Help overlay generated from registry. | Each mnemonic jumps to nearest node of kind via BFS |
| **T53** | Search over kernels: `search(query)` — labels, paths, shas, issue numbers, symbol names. Results grouped by domain. | Mixed-domain results for one query |

### Slice 5: Layout + Spatial (G38) — 3 days
Layout strategies, spatial index, renderer adapter.

| Task | Description | Verify |
|------|-------------|--------|
| **T54** | `LayoutStrategy` interface: `compute(kernel, constraints) → LayoutState`, optional `computeIncremental`. `LayoutConstraints`: viewport, fixedNodes, clusterSpecs, transitions. `LayoutState`: positions + groups (GroupLayout[]). | Each strategy pure; same input → same output |
| **T55** | Port 5 strategies: `lanes`, `timeline`, `hierarchy`, `tree`, `force`. Force uses edge `weight` for attraction. | Visual regression: all 5 layouts match current captures |
| **T56** | **SpatialIndex (R-tree)** — `build(positions)`, `hitTest(point)`, `rectTest(rect)`, `near(point, radius)`, `visibleIn(viewport)`. | O(log n) queries; visibleIn returns only visible nodes |
| **T57** | `RendererAdapter` (Cytoscape + Canvas) — consumes `LayoutState` + `SpatialIndex`; `buildRenderModel` becomes thin wrapper. Viewport culling: render only `visibleIn(viewport)`. | Visual regression passes; 10k nodes render without jank |
| **T58** | **ViewState** — camera, selection, hover, expansion. `serialize()`/`deserialize()`. Persist per session; enables "look at this" links and collaborative camera sync. | Reload restores exact view; link opens with camera positioned |

### Slice 6: Adaptive UI (G39–G41) — 3 days
Expand/collapse, continuous layout, progressive detail.

| Task | Description | Verify |
|------|-------------|--------|
| **T59** | `CLUSTER_LENS` — deriver emitting `ClusterSpec`s from topology (by directory, by package, by turn, by test-run). Expansion state in `ViewState`. `GroupLayout` in `LayoutState` — renderer draws group chips/bounds. | Click cluster chip → expand/collapse; state persists reload |
| **T60** | Continuous layout — `hierarchy.computeIncremental` + `tree.computeIncremental`. Renderer interpolates `LayoutState` frames (150–300ms, cubic-bezier(0.2,0,0,1)). Budget evaluated at target positions. | Smooth toggle, no thrash; `graph:scale --transition` passes |
| **T61** | Progressive detail — `deriveZoom` params change continuously with camera zoom. `detailTier(width)` drives card content cross-fade (opacity 120ms). No pop at level boundaries. | Zoom card: smooth summary → detail → content transitions |

### Slice 7: A11y + Review + Polish (G42) — 2 days
Accessibility, review profile, final integration.

| Task | Description | Verify |
|------|-------------|--------|
| **T62** | **A11ySupport** — `asTree(root)` (hierarchical ARIA list), `summarize(selection)` ("File src/auth.ts, 3 relations: 2 writes, 1 part-of"), `next(from, direction)` (roving tabindex graph). | Screen reader: announce selection, navigate via keyboard |
| **T63** | **Review profile** — `diffKernels(workspaceKernel, sessionKernel)` renders: uncommitted files highlighted, "what changed" summary, commits→files edges. One click: "show me what this session changed". | Review profile shows diff; toggle works E2E |
| **T64** | `mergeKernels(session, workspace)` — session wins on conflicts. Session version unchanged. Multi-kernel refs (`ref` nodes) resolve to workspace nodes on merge. | Session kernel version unchanged after merge; refs resolve |
| **T65** | Final integration: all domains on kernel, registry composed, all tests green, golden fixtures match, visual regression passes, budgets in CI. | `bun run check` passes; `graph:capture --mode=verify` passes |

---

## Capability Gates on Substrate (G19–G28 → Substrate Mapping)

| Original | Substrate Mapping | Slice |
|----------|-------------------|-------|
| T19 Directories | `deriveDirectories` + `directoryClusterSpec` | 3 |
| T20 History | `deriveCommits` + `deriveBranches` + edge data (dates, files) | 3 |
| T21 Code | `deriveSymbols` (hunk); parser = extension registry deriver | 3 |
| T22 Packages | `derivePackages` + dependency data on package nodes | 3 |
| T23 Runtime | `deriveProcesses` + `derivePorts` (hyperedge for conflicts) | 3 |
| T24 Verification | `deriveTests` + `deriveTestRuns` (hyperedge) + `deriveCoverage` | 3 |
| T25 Work | `deriveIssues` (message refs first) + `checklist` data on issue nodes | 3 |
| T26 Docs | `deriveDocs` (file roles) + `deriveADRs` (frontmatter chain) | 3 |
| T27 Lens Control | `LensComposer` UI composing derivers; profiles = saved pipeline presets | 6+ |
| T28 Navigation | `GraphQuery` + `queryMacros` (g-grammar) + search | 4 |

---

## Universal Features (Post-Slice 7, G43+)

| Task | Description | Unblocks |
|------|-------------|----------|
| **T66** | **Real-time deltas** — server pushes `WorkspaceDelta`; `WorkspaceKernel.merge(delta)` applies optimistically. Deriver build graph re-runs only affected derivers. | Live collaboration, instant refresh |
| **T67** | **Time-travel UI** — version scrubber on `SessionKernel`; `checkout(version)` + `diffKernels` = visual history. | Session replay, debugging |
| **T68** | **Plugin packages** — publish registry extensions as npm packages. App composes via `composeRegistry`. Marketplace = git repo of packages. | Extensibility without rebuild |
| **T69** | **GPU layouts** — `LayoutStrategy.computeGPU` for force/circular. WebGL2/WebGPU. | 100k+ nodes at 60fps |
| **T70** | **Cross-session substrate** — `mergeKernels` across sessions; `ref` nodes for cross-session links. Shared `WorkspaceKernel` per project. | Multi-session control plane |
| **T71** | **Collaborative cursors** — `ViewState` sync via server; LWW camera, ephemeral cursors/selections. | Pair programming on the map |

---

## Verification Matrix

| Check | Command |
|-------|---------|
| **Substrate** — kernels, derivers, queries, layouts, codecs, diff, a11y | `cd packages/graph-substrate && bun test` |
| **Session-UI** — domain derivers, diff provider, merge, golden fixtures | `cd packages/session-ui && bun test src/graph` |
| **Protocol** — schema round-trip, client gen | `cd packages/protocol && bun test` && `cd packages/client && bun run generate` |
| **Server** — snapshot endpoint, delta push | `cd packages/server && bun test src/graph` |
| **Host UI** — lens composer, actions, search, grammar, a11y | `cd packages/session-graph && bun run typecheck && bun test` |
| **User flows** — profile switch, commit→file, symbol→caller, issue→branch | `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts` |
| **Visual regression** — capture vs committed frames | `bun run graph:capture --mode=verify` |
| **Performance** — budgets guarded in CI | `bun run graph:scale` |

---

## Stop Rules (Minimal, Enforced)

1. **No I/O in derivers.** Facts enter via snapshot/diffProvider parameters.
2. **No derived node without `provenance.source`; no derived edge without confidence.**
3. **No `run` action outside registry, without confirmation, or without attribution.**
4. **SessionKernel never mutated after creation.** New version = new kernel instance.
5. **Groups only in LayoutState** (`ClusterSpec` → `GroupLayout`). Kernel has no `group` kind.
6. **No renderer branches in substrate.** `RendererAdapter` + capabilities only.
7. **Every kernel serializable.** If it can't be encoded/decoded, it doesn't exist.
8. **Every navigation = GraphQuery.** No bespoke search, grammar, or review logic.
9. **If continuous layout adds >50ms to substrate→layout pipeline, off by default behind flag.**
10. **A11y fails = release fails.** `asTree`/`summarize`/`next` must work for every node kind.

---

## Deferred (Unchanged)

| ID | Item | Unblock |
|----|------|---------|
| D16–D22 | Multi-session, cursors, time travel, AI summaries, plugin kinds, prompt export, 3D | T67, T68, T70 |
| D23 | External dependency *nodes* | Packaging lens proves nodes beat detail list |
| D24 | Container nodes | `docker ps`/devcontainer source observed |
| D25 | Comment nodes | Reader task proves TODO/FIXME nodes beat search |
| D26 | Tag nodes | Release landmarks are real navigation need |
| D27 | True go-to-definition (LSP plugin) | LSP provider exists server-side, worth latency |
| D28 | Cross-session control plane | T70 |

---

## Decision Log (Definitive)

| # | Decision | Reason |
|---|----------|--------|
| 48 | **Two kernels: Session (append-only) + Workspace (LWW)** | Matches reality: event log vs state snapshot; CRDT-ready |
| 49 | **Derivers = pure `Kernel → Kernel`, pipe-composable, build-graph-tracked** | Incremental invalidation; testable; reorderable |
| 50 | **Groups = layout annotations** (`ClusterSpec` → `GroupLayout`) | Kernel stays pure topology; expansion = view state |
| 51 | **Static module registry** | TS packages = plugins; zero runtime cost; type-checked |
| 52 | **Golden fixture + contract tests** | Golden catches regressions; contracts catch structural bugs |
| 53 | **DiffProvider = function** | Lazy, no allocation; caller controls caching |
| 54 | **Adapter-first migration** | `buildGraph` signature unchanged; kernels swapped internally |
| 55 | **Vertical slices** | Each slice delivers working code; no integration hell |
| 56 | **GraphQuery = the only navigation** | Search, grammar, review all compose from one query API |
| 57 | **Structural diff as kernel operation** | Review profile, time-travel, session comparison |
| 58 | **Serialization native** | Debugging, export, CI, offline, collaboration |
| 59 | **Spatial index in view layer** | O(log n) queries; viewport culling for 100k nodes |
| 60 | **Hyperedges for multi-node relations** | Test-runs, port conflicts, commit groups — one visual unit |
| 61 | **Edge weights + data** | Better force layouts; richer inspector; extensible per kind |
| 62 | **A11y built-in** | `asTree`/`summarize`/`next` on kernel; screen readers first-class |
| 63 | **ViewState persistable + syncable** | Share views, collaborative camera, reload restore |
| 64 | **Zoom as deriver pipeline stage** | Renderer dumb; all filtering in pipeline |
| 65 | **Time-travel via kernel versioning** | `tag`/`checkout`/`fork`/`replay` on SessionKernel |

---

## Total Effort Estimate

| Slice | Days | Deliverable |
|-------|------|-------------|
| 1: Kernel Core | 3 | Kernels + serialization + diff + adapter (golden matches) |
| 2: Deriver Pipeline | 2 | pipe + build graph + scope + zoom + diff provider |
| 3: Domain Derivers | 3 | All 8 domains as derivers + hyperedges |
| 4: Query API | 3 | GraphQuery + g-grammar + search |
| 5: Layout + Spatial | 3 | 5 strategies + R-tree + renderer adapter + view state |
| 6: Adaptive UI | 3 | Clusters + continuous layout + progressive detail |
| 7: A11y + Review | 2 | A11y + review profile + merge + final integration |
| **Total** | **19 days** | **Full parity + universal substrate** |

Post-Slice 7 features (T66–T71) are incremental — each builds on substrate without core changes.

---

## Immediate Next Action

**Start Slice 1: Kernel Core.** Create `packages/graph-substrate`:

```
packages/graph-substrate/
  src/
    kernel.ts          # Kernel base, Node, Edge, Hyperedge
    session.ts         # SessionKernel (append, tag, checkout, fork)
    workspace.ts       # WorkspaceKernel (LWW merge, replaceFrom)
    codec.ts           # encode/decode binary + JSON
    diff.ts            # diffKernels
    deriver.ts         # Deriver interface, pipe, build graph
    scope.ts           # deriveScope, deriveZoom
    query.ts           # GraphQuery
    layout.ts          # LayoutStrategy, LayoutState, ClusterSpec
    spatial.ts         # SpatialIndex (R-tree)
    registry.ts        # Registry, CORE_REGISTRY, composeRegistry
    a11y.ts            # asTree, summarize, next
    view.ts            # ViewState
    index.ts           # public API
  test/
    property.test.ts   # kernel invariants
    contract.test.ts   # structural invariants
    codec.test.ts      # round-trip
    diff.test.ts       # diff correctness
    query.test.ts      # query patterns
```

**Gate for Slice 1:** `buildGraph` uses kernels internally, produces byte-identical `model.golden.with-snapshot.json`, all existing tests pass.

---
