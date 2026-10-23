# SPACEGRAPH.TODO.7 — Universal Graph Kernel (rev 1)

**Status:** rev 1, 2026-10-23. Replaces TODO.6 with universal graph kernel architecture. Preserves all original IDs (`T19`–`T33`, `G19`–`G33`, `D23`–`D28`). New kernel tasks: `T34`–`T42`, `G34`–`G42`.

**Testing philosophy:** unchanged — integration over unit, golden fixtures for topology invariants, visual regression for layouts, property-based for pure functions (kernel, lenses, layouts), contract tests at boundaries (renderer, plugin), E2E for user flows.

---

## Architecture: Universal Graph Kernel

```
┌─────────────────────────────────────────────────────────────────┐
│                        GRAPH KERNEL                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Topology    │  │  Geometry    │  │  Projection  │          │
│  │  (pure DAG)  │  │  (layouts)   │  │  (lenses)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    EVENT BUS                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Renderer A    │  │  Renderer B    │  │  Query API     │
│  (Cytoscape)   │  │  (Canvas/WebGL)│  │  (GraphQL/TS)  │
└────────────────┘  └────────────────┘  └────────────────┘
```

### Three-Layer Separation

| Layer | Responsibility | Key Types |
|-------|---------------|-----------|
| **Topology** | Append-only DAG, versioned, pure | `GraphKernel`, `Node`, `Edge`, `GraphDelta` |
| **Geometry** | Layout strategies as pure functions | `LayoutStrategy`, `LayoutConstraints`, `PositionMap` |
| **Projection** | Lenses transform kernel → kernel | `Lens`, `LensContext`, `ClusterDef` |

### Core Invariants

1. **Topology is immutable** — only `addNode`, `addEdge`. "Delete" = tombstone edge. Enables time-travel, undo, replay.
2. **Lenses are pure** — same kernel + context = same projection. Composable, traceable, incremental.
3. **Layouts are capability-declared** — no renderer branches. Strategies declare `["continuous", "3d", "gpu"]`.
4. **Group nodes are first-class** — `kind: "group"` with `members`, `expansionState`, `layoutHint`.
5. **Plugins extend via contribution** — node kinds, edge kinds, lenses, layouts, actions.

---

## Migration from Current Architecture

| Current | Kernel Equivalent | Task |
|---------|-------------------|------|
| `buildGraph()` → `GraphModel` | `GraphKernel` + `composeLenses([...]).apply(kernel)` | T34 |
| `scopeModel()` | `SCOPE_LENS` + `DOMAIN_LENS` | T35 |
| `attachWorkspace()` | `WORKSPACE_LENS` (derives directories, packages, symbols, processes...) | T36 |
| `actionsFor()` | `ACTION_REGISTRY` plugin | T37 |
| `layoutGraph()` | `LayoutStrategy.compute()` | T38 |
| `buildRenderModel()` | Renderer adapter from `LayoutState` | T39 |
| Golden fixture | Topology contract tests (invariants) | T40 |
| `diffByTurn` Map | `DiffProvider` function (lazy) | T41 |
| Session + snapshot merge | `mergeKernels(sessionKernel, workspaceKernel)` | T42 |

---

## Task Breakdown

### Phase 0: Kernel Foundation (G34–G38)

| Task | Description | Done When | Verify |
|------|-------------|-----------|--------|
| **T34** | **GraphKernel core** — append-only, versioned, pure TS. `addNode`, `addEdge`, `getNode`, `getEdges`, `getDescendants`, `getAncestors`, `subgraph`, `reverse`, `on('node:add'|'edge:add')`. No layout, no UI. | Kernel passes property tests: invariants hold (no dangling edges, version monotonic, append-only) | `bun test packages/graph-kernel` — 100% property test coverage |
| **T35** | **Lens system** — `Lens` interface, `composeLenses`, `LensContext`. Built-ins: `DOMAIN_LENS`, `SCOPE_LENS`, `CLUSTER_LENS`, `TIME_LENS`. Traceability: `trace(derivedId) → sourceIds`. | `composeLenses([DOMAIN, SCOPE]).apply(kernel)` produces same nodes as current `scopeModel` | Golden fixture: lens output = current `scopeModel` output |
| **T36** | **WorkspaceLens** — derives directories, packages, commits, branches, symbols, processes, ports, issues from `WorkspaceSnapshot`. Emits `provenance` on derived nodes. Replaces `attachWorkspace`. | `WORKSPACE_LENS.apply(sessionKernel, { snapshot })` = current `buildGraph({ snapshot })` | Golden fixture: `model.golden.with-snapshot.json` matches exactly |
| **T37** | **ActionRegistry plugin** — declarative `ActionContribution[]` per kind. Host resolves `run` actions. Replaces `actionsFor` switch. | All current actions registered via plugin; `GraphDetailActions` works unchanged | `bun test packages/session-graph/src/ui/GraphDetail.test.tsx` |
| **T38** | **LayoutStrategy interface** — `compute`, optional `computeIncremental`, `capabilities`. Port current strategies: `lanes`, `timeline`, `hierarchy`, `tree`, `force`. `continuous` capability for hierarchy/tree. | Each strategy produces same positions as current `layout.ts` for same input | Visual regression: `graph:capture --mode=compare` passes |
| **T39** | **Renderer adapter** — converts `LayoutState` → renderer-specific format. Cytoscape adapter first. `buildRenderModel` becomes thin wrapper. | Current `GraphCanvas` renders identically | Visual regression: all existing captures pass |
| **T40** | **Contract tests replace golden fixture** — invariants: (1) session nodes unchanged by lenses, (2) no dangling edges, (3) provenance on all derived, (4) domain filter preserves session, (5) cluster expansion preserves topology. | Golden fixture becomes one regression test; invariants are the gate | `bun test packages/graph-kernel/contract.test.ts` |
| **T41** | **DiffProvider function** — `type DiffProvider = (turnID) => FileDiffInfo[]`. Replaces `diffByTurn: Map`. Lazy, no allocation. | `buildGraph` calls provider only for turns with file-touching tools | Benchmark: no Map allocation for sessions without diffs |
| **T42** | **Kernel merge** — `mergeKernels(sessionKernel, workspaceKernel)` combines session topology + workspace projection. Session kernel is immutable history; workspace is recomputable. | Two kernels merge cleanly; session kernel never modified | `sessionKernel.version` unchanged after merge |

---

### Phase 1: Capability Gates on Kernel (G19–G28 mapped to kernel)

| Task | Kernel Mapping | Notes |
|------|---------------|-------|
| **T19** Directories | `DIRECTORY_CLUSTER_DEF` in `CLUSTER_LENS` | Group nodes with `expansionState`, continuous toggle |
| **T20** History | `HISTORY_LENS` derives commits/branches from snapshot | `TIME_LENS` for temporal filtering |
| **T21** Code | `SYMBOL_LENS` + `CALL_GRAPH_LENS` + `NAMESPACE_CLUSTER` | Parser = separate plugin; hunk symbols = fallback lens |
| **T22** Packages | `PACKAGE_LENS` derives package nodes + dependency edges | Dependencies as virtual `dependency:<name>@<version>` nodes |
| **T23** Runtime | `RUNTIME_LENS` from snapshot + `PROCESS_EXTRACTOR` from tool output | Dual-source: snapshot + real-time regex |
| **T24** Verification | `TEST_LENS` (extractor registry per runner) | Start with vitest; registry is plugin |
| **T25** Work | `ISSUE_LENS` extracts refs from messages/branches | Messages first; branches/commits opt-in |
| **T26** Docs | `DOC_LENS` — file roles (`config`, `doc`, `adr`, `test`, `fixture`) | Generalized from `config`/`doc` booleans |
| **T27** Lens Control | `LensComposer` UI — composes lenses visually | Profiles = saved lens compositions |
| **T28** Navigation | `GraphQuery` API — search, grammar (`g` + mnemonic) | Unified over kernel, not model |

---

### Phase 2: Adaptive UI on Kernel (G33 → G39–G41)

| Task | Description | Done When | Verify |
|------|-------------|-----------|--------|
| **T39** | **Continuous layout** — hierarchy/tree strategies implement `computeIncremental`. Renderer interpolates `LayoutState` frames (150–300ms, cubic-bezier). Budget evaluated at target positions. | Toggle directory animates smoothly; no layout thrash; budget respected | Visual regression + `graph:scale --transition` passes CI |
| **T40** | **Progressive detail on zoom** — `LENS.params` changes with zoom level. `detailTier(width)` drives card content cross-fade (opacity 120ms). No pop at level boundaries. | Zoom card smoothly reveals summary → detail → content | Visual check: cross-fade, no pop |
| **T41** | **Cluster expansion animation** — `CLUSTER_LENS` emits `GroupNode` with `expansionState`. Continuous expansion: children animate in/out via layout incremental. | Click cluster chip → smooth expand/collapse; state persists | Golden fixture: toggle state persists reload |

---

### Phase 3: Universal Features (G42+)

| Task | Description | Unblocks |
|------|-------------|----------|
| **T42** | **Multi-view** — same kernel, different lens compositions → split views (session + code, timeline + verify) | Dashboard, hybrid views |
| **T43** | **Real-time deltas** — server pushes `GraphDelta`; client applies optimistically, reconciles | Live collaboration, instant refresh |
| **T44** | **Time-travel** — versioned kernel, replay any version, fork at version | Debugging, session replay |
| **T45** | **Plugin marketplace** — register `GraphPlugin` at runtime (WASM plugins?) | Extensibility without rebuild |
| **T46** | **GPU layouts** — `LayoutStrategy.computeGPU` for force/circular on large graphs | 10k+ nodes at 60fps |
| **T47** | **Cross-session merge** — `mergeKernels` across sessions with stable IDs | Multi-session control plane |

---

## Verification Matrix (Updated)

| Check | Command |
|-------|---------|
| **Kernel** — topology, lenses, layouts, contracts | `cd packages/graph-kernel && bun test` |
| **Session-UI** — workspace lens, diff provider, merge | `cd packages/session-ui && bun test src/graph` |
| **Protocol** — schema round-trip, client gen | `cd packages/protocol && bun test` && `cd packages/client && bun run generate` |
| **Server** — snapshot endpoint, delta push | `cd packages/server && bun test src/graph` |
| **Host UI** — lens composer, actions, search, grammar | `cd packages/session-graph && bun run typecheck && bun test` |
| **User flows** — profile switch, commit→file, symbol→caller, issue→branch | `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts` |
| **Visual regression** — capture vs committed frames | `bun run graph:capture --mode=verify` |
| **Performance** — budgets guarded in CI | `bun run graph:scale` |

---

## Stop Rules (Extended)

1. **No I/O in topology build.** Facts needing I/O enter through lenses (snapshot, diff provider).
2. **No new node kind without contract tests.** Invariants: provenance, no dangling edges, domain membership.
3. **No derived node without `provenance.source`; no derived edge without confidence.**
4. **No `run` action outside registry, without confirmation, or without attribution.**
5. **No layout strategy without declared capabilities.** Renderer matches capabilities at runtime.
6. **No lens without `trace()` for derived nodes.** Enables "go to source."
7. **If session kernel changes after creation, stop.** Session kernel is immutable history.
8. **If continuous layout adds >50ms to topology→layout pipeline, off by default behind flag.**
9. **No renderer-specific branches in kernel or layouts.** Capabilities only.

---

## Deferred (Unchanged)

| ID | Item | Unblock |
|----|------|---------|
| D16–D22 | Multi-session, cursors, time travel, AI summaries, plugin kinds, prompt export, 3D | T44, T45 |
| D23 | External dependency *nodes* | Packaging lens proves nodes beat detail list |
| D24 | Container nodes | `docker ps`/devcontainer source observed |
| D25 | Comment nodes | Reader task proves TODO/FIXME nodes beat search |
| D26 | Tag nodes | Release landmarks are real navigation need |
| D27 | True go-to-definition (LSP plugin) | LSP provider exists server-side, worth latency |
| D28 | Cross-session control plane | T47 |

---

## Immediate Next Actions

1. **Create `packages/graph-kernel`** — extract pure topology from `session-ui/src/graph/build.ts`
2. **Implement `GraphKernel` + property tests** — append-only, versioned, invariants
3. **Implement `Lens` + `composeLenses`** — replace `scopeModel` first (lowest risk)
4. **Implement `WORKSPACE_LENS`** — port `attachWorkspace` logic, verify golden fixture matches
5. **Implement `LayoutStrategy` interface** — port `layout.ts` strategies
6. **Add `CLUSTER_LENS` + `GroupNode`** — enables T33.1 (expand/collapse) immediately
7. **Migrate `session-ui/src/graph` to kernel** — `buildGraph` becomes `WORKSPACE_LENS.apply(sessionKernel)`

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Kernel breaks existing model output | Golden fixture `model.golden.with-snapshot.json` is the gate. Kernel must produce byte-identical output. |
| Performance regression | `graph:scale` benchmarks kernel vs current `buildGraph`. Lens-aware build should be faster. |
| Plugin system over-engineering | Start with static registry (current `actionsFor` → plugin). Dynamic loading later (T45). |
| Continuous layout complexity | Only hierarchy/tree get `computeIncremental`. Force stays discrete. Opt-in per layout. |
| Migration scope | Phase 0 is internal refactor. Phase 1 maps 1:1 to current gates. Phase 2+ is new capability. |

---

## Decision Log (New)

| # | Decision | Reason |
|---|----------|--------|
| 48 | **Topology is immutable, append-only** | Enables time-travel, undo, replay, collaboration; simplifies reasoning |
| 49 | **Lenses are pure, composable, traceable** | Replaces `scopeModel` + `attachWorkspace`; enables incremental, multi-view |
| 50 | **Layout strategies declare capabilities** | No renderer branches; runtime matching; future-proof for GPU/3D |
| 51 | **Group nodes are first-class topology** | Enables continuous expand/collapse, semantic zoom, cluster layouts |
| 52 | **Plugins contribute via declarations** | Extensibility without core changes; domains/plugins are symmetric |
| 53 | **Contract tests replace golden fixture** | Tests invariants, not structure; survives refactors |
| 54 | **DiffProvider is a function, not Map** | Lazy, no allocation; caller controls caching |
| 55 | **Session kernel ≠ workspace projection** | Immutable history vs recomputable derivation; clear ownership |
| 56 | **Real-time via event-sourced deltas** | Optimistic UI, instant refresh, collaboration foundation |

---