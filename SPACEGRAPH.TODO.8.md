# SPACEGRAPH.TODO.8 — Universal Graph Kernel (rev 2, ideal)

**Status:** rev 2, 2026-10-23. Incorporates critical review of TODO.7. Preserves all original IDs (`T19`–`T33`, `G19`–`G33`, `D23`–`D28`). New kernel tasks: `T34`–`T42`, `G34`–`G38`. Extensibility via **static module registry** (not dynamic plugins).

**Testing philosophy:** unchanged — integration over unit, golden fixture for regression + contract tests for invariants, visual regression for layouts, property-based for pure functions, E2E for user flows.

---

## Architecture: Two-Layer Kernel + View

```
┌─────────────────────────────────────────────────────────────────┐
│                        GRAPH KERNEL                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SessionKernel (immutable, append-only)                    │  │
│  │  - messages → turns, tools, files, phases                  │  │
│  │  - versioned, time-travel ready                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  WorkspaceKernel (mutable, replaceable)                    │  │
│  │  - snapshot → directories, packages, symbols, processes... │  │
│  │  - refreshed on server push                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Derivers (pure: Kernel + input → Kernel)                  │  │
│  │  - deriveScope, deriveDirectories, derivePackages, ...     │  │
│  │  - composable via pipe()                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  LayoutStrategies (pure: Kernel + constraints → LayoutState)│ │
│  │  - lanes, timeline, hierarchy, tree, force                 │  │
│  │  - optional: computeIncremental for continuous             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        VIEW LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  RendererAdapter(LayoutState) → RendererFormat                  │
│  UI State: lens selection, cluster expansion, zoom, camera     │
│  ActionRegistry: declarative contributions per kind             │
└─────────────────────────────────────────────────────────────────┘
```

### Core Invariants (Non-Negotiable)

1. **SessionKernel is immutable** — append-only, versioned. New messages → new version. Enables time-travel, replay, streaming.
2. **WorkspaceKernel is replaceable** — full refresh on snapshot/delta. No tombstones.
3. **Derivers are pure** — `Kernel → Kernel`. Composable via `pipe()`. Provenance = node data, not separate API.
4. **LayoutStrategies are pure** — `compute(kernel, constraints) → LayoutState`. Optional `computeIncremental`.
5. **Groups are layout annotations** — `ClusterSpec` in constraints, `GroupLayout` in `LayoutState`. Not in kernel.
6. **Static module registry** — TypeScript modules = plugin system. Extensible via re-export + extend.

---

## Migration from Current Architecture (Adapter-First)

| Current | Kernel Equivalent | Task |
|---------|-------------------|------|
| `buildGraph(input)` → `GraphModel` | `buildSessionKernel(msgs, status) → pipe(deriveWorkspace, deriveScope)(..., snapshot)` | T34–T36 |
| `scopeModel(model, lens)` | `deriveScope(lens)(kernel)` | T35 |
| `attachWorkspace(snapshot)` | `deriveWorkspace(kernel, snapshot, diffProvider)` | T36 |
| `actionsFor(node, model)` | `ACTION_REGISTRY[node.kind](node, kernel)` | T37 |
| `layoutGraph(model, ...)` | `LAYOUTS[strategy].compute(kernel, constraints)` | T38 |
| `buildRenderModel(...)` | `RENDERER_ADAPTERS[renderer](layoutState)` | T39 |
| Golden fixture | **Kept** + contract tests for invariants | T40 |
| `diffByTurn: Map` | `diffProvider: (turnID) => FileDiffInfo[]` | T41 |
| Session + snapshot merge | `mergeKernels(sessionKernel, workspaceKernel)` | T42 |

---

## Extensibility: Static Module Registry

**No dynamic loading, no lifecycle hooks, no WASM.** TypeScript modules *are* the plugin system.

```ts
// packages/graph-kernel/src/registry.ts — single source of truth
export interface Registry {
  nodeKinds: Record<string, NodeKindDef>;
  edgeKinds: Record<string, EdgeKindDef>;
  derivers: Deriver[];              // ordered: session → workspace → scope
  layouts: Record<string, LayoutStrategy>;
  actions: Record<NodeKind, ActionContribution[]>;
  clusterSpecs: ClusterSpec[];      // for layout clustering
}

// Built-in registry (core)
export const CORE_REGISTRY: Registry = { ... };

// Extension pattern (plugin package)
/*
// @myorg/graph-plugin-code-intel/src/registry.ts
import { CORE_REGISTRY } from '@opencode/graph-kernel/registry';
export const REGISTRY: Registry = {
  ...CORE_REGISTRY,
  nodeKinds: { ...CORE_REGISTRY.nodeKinds, 'call-graph': { ... } },
  derivers: [...CORE_REGISTRY.derivers, deriveCallGraph],
  layouts: { ...CORE_REGISTRY.layouts, 'call-hierarchy': callHierarchyLayout },
  actions: { ...CORE_REGISTRY.actions, symbol: [...CORE_REGISTRY.actions.symbol, gotoDefinition] },
  clusterSpecs: [...CORE_REGISTRY.clusterSpecs, namespaceCluster],
};
*/
```

**Host composes registry at startup:**
```ts
// packages/app/src/graph/registry.ts
import { CORE_REGISTRY } from '@opencode/graph-kernel/registry';
// import { REGISTRY as CODE_INTEL } from '@myorg/graph-plugin-code-intel'; // when ready

export const REGISTRY = CORE_REGISTRY; // extend here
```

**Why this works:**
- Zero runtime cost — tree-shaken, type-checked
- Plugins are just npm packages extending the registry
- No versioning conflicts — single registry per app
- Easy to audit: `console.log(REGISTRY.nodeKinds)`

---

## Task Breakdown: Vertical Slices (Not Phases)

Each slice delivers **working, tested functionality** against existing golden fixture.

### Slice 1: Kernel Core + Directories (G34) — 2 days
| Task | Description | Verify |
|------|-------------|--------|
| **T34** | `Kernel` class: `addNode`, `addEdge`, `filterNodes`, `getDescendants`, `getAncestors`, `subgraph`, `version`, `onChange`. Immutable. `SessionKernel` extends with `appendMessage(msg)`. | Property tests: invariants hold, version monotonic, append-only |
| **T35** | `pipe(...derivers)`, `deriveScope(domains)`. Replaces `scopeModel`. | `deriveScope(['session'])(kernel) === sessionOnlyKernel` |
| **T36a** | `deriveDirectories(kernel, snapshot)`, `derivePackages(kernel, snapshot)`. Emit `provenance` on nodes. | Golden fixture: directories + packages match `model.golden.with-snapshot.json` |
| **T38a** | `LayoutStrategy` interface. Port `hierarchy` strategy. | Visual regression: hierarchy layout matches current |

### Slice 2: History + Actions (G20, G31) — 2 days
| Task | Description | Verify |
|------|-------------|--------|
| **T36b** | `deriveCommits`, `deriveBranches` from snapshot. `TIME_LENS` params for temporal filter. | Golden fixture: commits + branches match |
| **T37** | `ACTION_REGISTRY` module. Declarative `ActionContribution[]` per kind. `GraphDetailActions` uses registry. | All current actions work; `bun test packages/session-graph/src/ui/GraphDetail.test.tsx` |

### Slice 3: Code + Runtime + Work (G21, G23, G25) — 3 days
| Task | Description | Verify |
|------|-------------|--------|
| **T36c** | `deriveSymbols` (hunk + snapshot), `deriveProcesses`, `derivePorts`, `deriveIssues`. | Golden fixture: all derived kinds match |
| **T36d** | `deriveDocs` — file roles (`config`, `doc`, `adr`, `test`, `fixture`) from path policy + snapshot. | Config/doc/ADR badges in inspector |
| **T36e** | `DiffProvider` function type. Hunk symbols use provider. | No `Map` allocation; lazy eval |

### Slice 4: Layout Parity + Renderer (G38, G39) — 2 days
| Task | Description | Verify |
|------|-------------|--------|
| **T38b** | Port `lanes`, `timeline`, `tree`, `force` strategies. `LayoutStrategy` interface. | Visual regression: all 5 layouts match current |
| **T39** | `RendererAdapter` for Cytoscape + Canvas. `buildRenderModel` → thin wrapper. | Visual regression: all captures pass |

### Slice 5: Contract Tests + Merge (G34, G35) — 1 day
| Task | Description | Verify |
|------|-------------|--------|
| **T40** | Contract tests: no dangling edges, provenance on derived, session nodes preserved, scope filter correct. **Golden fixture kept as regression test.** | `bun test packages/graph-kernel` passes |
| **T42** | `mergeKernels(session, workspace)` — session wins conflicts. Session kernel version unchanged. | `sessionKernel.version` unchanged after merge |

### Slice 6: Adaptive UI Foundation (G33 → G39–G41) — 3 days
| Task | Description | Verify |
|------|-------------|--------|
| **T33.1** | `CLUSTER_LENS` = deriver emitting `ClusterSpec`. `expansionState` in UI state (not kernel). `GroupLayout` in `LayoutState`. | Click cluster chip → expand/collapse; state persists reload |
| **T39** | Continuous layout: `hierarchy.computeIncremental` + renderer interpolation (150–300ms). Budget at target positions. | Visual regression: smooth toggle, no thrash, budget respected |
| **T40** | Progressive detail: lens params change with zoom. `detailTier(width)` drives cross-fade (120ms). | Zoom cross-fades tiers, no pop |

---

## Capability Gates on Kernel (G19–G28 → Kernel Mapping)

| Original | Kernel Mapping | Status |
|----------|---------------|--------|
| T19 Directories | `deriveDirectories` + `directoryClusterSpec` | Slice 1 |
| T20 History | `deriveCommits` + `deriveBranches` + `TIME_LENS` params | Slice 2 |
| T21 Code | `deriveSymbols` (hunk) + `SYMBOL_LENS` (parser plugin) + `namespaceClusterSpec` | Slice 3 |
| T22 Packages | `derivePackages` + `dependencyEdges` (virtual nodes) | Slice 1 |
| T23 Runtime | `deriveProcesses` (snapshot + tool output regex) + `derivePorts` | Slice 3 |
| T24 Verification | `deriveTests` (extractor registry) + `deriveTestRuns` + `deriveCoverage` | Post-slice 6 |
| T25 Work | `deriveIssues` (message refs first) + `checklist` on issue node | Slice 3 |
| T26 Docs | `deriveDocs` (file roles) + `deriveADRs` (frontmatter) | Slice 3 |
| T27 Lens Control | `LensComposer` UI: composes derivers visually. Profiles = saved deriver sets. | Post-slice 6 |
| T28 Navigation | `GraphQuery` API over kernel: search, `g` + mnemonic grammar | Post-slice 6 |

---

## Universal Features (Post-Slice 6, G42+)

| Task | Description | Unblocks |
|------|-------------|----------|
| **T43** | **Real-time deltas** — server pushes `GraphDelta` (workspace only); client applies optimistically, reconciles | Live collaboration, instant refresh |
| **T44** | **Time-travel** — session kernel versioning, replay any version, fork at version | Debugging, session replay |
| **T45** | **Plugin packages** — publish registry extensions as npm packages. App composes at build. | Extensibility without rebuild |
| **T46** | **GPU layouts** — `LayoutStrategy.computeGPU` for force/circular | 10k+ nodes at 60fps |
| **T47** | **Cross-session merge** — `mergeKernels` across sessions with stable IDs | Multi-session control plane |

---

## Verification Matrix

| Check | Command |
|-------|---------|
| **Kernel** — topology, derivers, layouts, contracts | `cd packages/graph-kernel && bun test` |
| **Session-UI** — workspace derivers, diff provider, merge | `cd packages/session-ui && bun test src/graph` |
| **Protocol** — schema round-trip, client gen | `cd packages/protocol && bun test` && `cd packages/client && bun run generate` |
| **Server** — snapshot endpoint, delta push | `cd packages/server && bun test src/graph` |
| **Host UI** — lens composer, actions, search, grammar | `cd packages/session-graph && bun run typecheck && bun test` |
| **User flows** — profile switch, commit→file, symbol→caller, issue→branch | `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts` |
| **Visual regression** — capture vs committed frames | `bun run graph:capture --mode=verify` |
| **Performance** — budgets guarded in CI | `bun run graph:scale` |

---

## Stop Rules (Minimal, Enforced)

1. **No I/O in derivers.** Facts enter via snapshot/diffProvider parameters.
2. **No derived node without `provenance.source`; no derived edge without confidence.**
3. **No `run` action outside registry, without confirmation, or without attribution.**
4. **SessionKernel never mutated after creation.** New version = new kernel.
5. **Groups only in LayoutState.** Kernel has no `group` kind.
6. **If continuous layout adds >50ms to kernel→layout pipeline, off by default behind flag.**
7. **No renderer branches in kernel/layouts.** Adapter pattern only.

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

## Decision Log (Final)

| # | Decision | Reason |
|---|----------|--------|
| 48 | **Two kernels: Session (append-only) + Workspace (replaceable)** | Matches reality: event log vs state snapshot |
| 49 | **Derivers = pure `Kernel → Kernel`, composable via `pipe()`** | Replaces `Lens` abstraction; testable, reorderable, no `trace()` needed |
| 50 | **Groups = layout annotations (`ClusterSpec`/`GroupLayout`)** | Kernel stays pure topology; expansion = UI state |
| 51 | **Static module registry** | TypeScript modules = plugins; zero runtime cost; tree-shaken |
| 52 | **Golden fixture + contract tests** | Golden catches regressions; contracts catch structural bugs |
| 53 | **DiffProvider = function** | Lazy, no allocation; caller controls caching |
| 54 | **Adapter-first migration** | `buildGraph` signature unchanged; kernel swapped internally |
| 55 | **Vertical slices over phases** | Each slice delivers working code; no integration hell |
| 56 | **Real-time = workspace deltas only** | Session is immutable; workspace is mutable state |

---

## Immediate Next Action

**Start Slice 1:** Create `packages/graph-kernel` with `Kernel`, `SessionKernel`, `pipe`, `deriveScope`, `deriveDirectories`, `derivePackages`, `hierarchy` layout. Verify against golden fixture.

**Files to create:**
- `packages/graph-kernel/src/kernel.ts` — `Kernel`, `SessionKernel`
- `packages/graph-kernel/src/derivers.ts` — `pipe`, `deriveScope`, `deriveDirectories`, `derivePackages`
- `packages/graph-kernel/src/layout.ts` — `LayoutStrategy`, `hierarchyLayout`
- `packages/graph-kernel/src/registry.ts` — `CORE_REGISTRY`
- `packages/graph-kernel/src/test/contract.test.ts` — invariants
- `packages/graph-kernel/src/test/property.test.ts` — append-only, versioning
- Adapter in `packages/session-ui/src/graph/build.ts` — `buildGraph` uses kernel internally

**Gate:** All existing tests pass + `model.golden.with-snapshot.json` matches exactly.