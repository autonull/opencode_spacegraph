# SPACEGRAPH.TODO.10 — SpaceGraphJS Substrate, OpenCode as Thin Host (rev 4, definitive)

**Status:** rev 4, 2026-10-23. Final revision: all substrate work lands in **SpaceGraphJS** so any dependent benefits; **OpenCode changes stay minimal** (thin derivers + adapters). Supersedes TODO.7–TODO.9. Preserves original IDs (`T19`–`T33`, `G19`–`G33`, `D23`–`D28`); new substrate tasks `T34`–`T71`, `G34`–`G42`.

**Testing philosophy:** unchanged — integration over unit, golden fixture + contract tests, visual regression for layouts, property-based for pure functions, E2E for user flows.

---

## The Split: SpaceGraphJS owns the substrate, OpenCode owns the vocabulary

```
SpaceGraphJS (domain-agnostic — every dependent benefits)
┌──────────────────────────────────────────────────────────────────────┐
│  @spacegraphjs/kernel (NEW — dependency-free, like renderer contract)  │
│  Kernel · SessionKernel · WorkspaceKernel · Hyperedges · EdgeData    │
│  Serialization · diffKernels · Deriver+pipe · BuildGraph · Query     │
│  Registry+composeRegistry · A11y (asTree/summarize/next) · ViewState │
│  SpatialIndex2D (R-tree, no THREE) · deriveScope · deriveZoom        │
├──────────────────────────────────────────────────────────────────────┤
│  @spacegraphjs/renderer (contract — EXTEND)                           │
│  RenderModel + GroupLayout · group shapes · transition hints          │
├──────────────────────────────────────────────────────────────────────┤
│  @spacegraphjs/adapter (host-agnostic pipeline — EXTEND)              │
│  ClusterSpec → GroupLayout · cluster chips · expansion flow           │
├──────────────────────────────────────────────────────────────────────┤
│  spacegraphjs (main lib — UPGRADE)                                    │
│  LayoutStrategy interface · computeIncremental · THREE SpatialIndex  │
│  stays for WebGL path · continuous camera transitions                 │
└──────────────────────────────────────────────────────────────────────┘

OpenCode (vocabulary only — minimal surface)
┌──────────────────────────────────────────────────────────────────────┐
│  packages/session-ui/src/graph (THIN)                                │
│  Domain derivers: deriveDirectories, derivePackages, deriveCommits,  │
│  deriveSymbols, deriveProcesses, deriveIssues, deriveDocs,           │
│  deriveTests — each a thin (Kernel, inputs) → Kernel using kernel     │
│  primitives. buildGraph = buildSessionKernel + pipe(domain derivers) │
├──────────────────────────────────────────────────────────────────────┤
│  packages/session-graph/src/ui (THIN)                                 │
│  Consumes @spacegraphjs/kernel Query, ViewState, ClusterSpec.        │
│  Kind vocabulary, i18n, toolbar, inspector stay — they are the host.  │
└──────────────────────────────────────────────────────────────────────┘
```

**The rule:** if a feature is domain-agnostic (kernels, derivers, queries, layouts, spatial, a11y, serialization, diff, registry), it lives in SpaceGraphJS. If it names a domain concept (session, turn, commit, file, directory, issue), it stays in OpenCode as a thin definition over the substrate.

**What other dependents gain:** any app (IDE, debugger, data explorer, CI dashboard) can `import { Kernel, pipe, GraphQuery, LayoutStrategy, SpatialIndex2D, Registry } from '@spacegraphjs/kernel'` and build their own map with their own vocabulary — the same substrate OpenCode uses.

---

## SpaceGraphJS Work

### New package: `@spacegraphjs/kernel` (dependency-free)

Lives at `spacegraphjs/packages/kernel/`. Zero runtime dependencies (same discipline as `@spacegraphjs/renderer`). No THREE, no DOM, no host vocabulary — pure graph substrate.

```
spacegraphjs/packages/kernel/src/
  kernel.ts          # Kernel base: addNode/addEdge/addHyperedge, version, subgraph
  session.ts         # SessionKernel: appendMessage-style append, tag, checkout, fork
  workspace.ts       # WorkspaceKernel: LWW merge, replaceFrom, CRDT-mergeable
  codec.ts           # encode/decode (binary) + encodeJSON/decodeJSON
  diff.ts            # diffKernels → added/removed/changed + asKernel + summarize
  deriver.ts         # Deriver { id, inputs, outputs, derive, deriveIncremental? } + pipe
  buildgraph.ts      # Deriver build graph: track inputs→outputs, incremental invalidation
  scope.ts           # deriveScope(domains) — generic domain filter
  zoom.ts            # deriveZoom(level, expansion) — semantic zoom as pipeline stage
  query.ts           # GraphQuery: nodes(pattern), traverse, path, near, count, collect
  registry.ts        # Registry interface, CORE_REGISTRY, composeRegistry
  a11y.ts            # asTree, summarize, next — pure graph → accessible structures
  view.ts            # ViewState: camera, selection, expansion; serialize/deserialize
  spatial.ts         # SpatialIndex2D: R-tree over {x,y}; hitTest/rectTest/near/visibleIn
  cluster.ts         # ClusterSpec, matchers; expansion affects deriveZoom not kernel
  index.ts           # public API
test/
  property.test.ts   # kernel invariants: append-only, version monotonic, no dangling
  codec.test.ts      # round-trip binary + JSON
  diff.test.ts       # structural diff correctness
  query.test.ts      # pattern matching, traversal, pathfinding
  deriver.test.ts    # pipe composition, build graph invalidation
  a11y.test.ts       # tree structure, summaries, keyboard graph
  spatial.test.ts    # R-tree queries vs brute force
  conformance.ts     # contract tests other packages run against the kernel
```

| Task | Description | Verify |
|------|-------------|--------|
| **T34** | `Kernel` — immutable base: `addNode`, `addEdge`, `addHyperedge`, `getNode`, `getEdges`, `filterNodes`, `subgraph`, `version`. Edge carries `weight?` + `data?`. Hyperedge: `{ id, kind, members, roles?, data?, confidence }`. | Property tests: invariants, version monotonic, append-only, no dangling edges |
| **T35** | `SessionKernel` — `append(entry)`, `tag(name)`, `checkout(versionOrTag)`, `fork(from)`. | Time-travel: checkout returns exact historical view; fork diverges cleanly |
| **T36** | `WorkspaceKernel` — LWW per node: `merge(other, clock)`, `replaceFrom(snapshotEntries)`. | CRDT: concurrent merges converge; last-write-wins per node id |
| **T37** | `KernelCodec` — versioned binary format + readable JSON. Every kernel encodes/decodes. | Round-trip: encode→decode === original (property test); JSON inspected in fixtures |
| **T38** | `diffKernels(a, b)` → `{ addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, asKernel(), summarize() }`. | Diff two kernels: correct sets; summary human-readable |
| **T39** | `Deriver` + `pipe(...)` + **build graph**: inputs→outputs tracking; changed inputs re-run only affected derivers. | Property: pipe(d1,d2)(k) === d2(d1(k)); update 1 input → only dependent derivers re-run |
| **T40** | `GraphQuery` — `nodes(pattern)` (kind/domain/id/data/label/status), `traverse(ref, edgePattern, dir)`, `path(from, to)`, `near(pos, radius)` (via SpatialIndex2D), `count`, `collect`. | "Files modified by kind X" returns correct set; path found; near uses R-tree |
| **T41** | `Registry` + `composeRegistry(...)` — nodeKinds, edgeKinds, hyperedgeKinds, derivers, layouts, actions, clusterSpecs, queryMacros. Extensible via TS package spread. | Registry composition: extension adds kinds without core change; type-checked |
| **T42** | `A11ySupport` — `asTree(root)` → ARIA hierarchy; `summarize(nodeId)` → readable sentence; `next(from, direction)` → keyboard graph. | Screen reader flows: announce selection; navigate via keyboard for every kind |
| **T43** | `ViewState` — camera, selection, hover, expansion map; `serialize()`/`deserialize()`. | Reload restores exact view; "look at this" link encodes camera |
| **T44** | `SpatialIndex2D` — R-tree over `{x,y}`: `build(positions)`, `hitTest(point)`, `rectTest(rect)`, `near(point, r)`, `visibleIn(viewport)`. No THREE. | O(log n) vs brute-force property test; visibleIn returns only visible |
| **T45** | `deriveScope(domains)` — generic: keeps nodes whose `domain` is in set (plus pinned set); drops edges with missing endpoints. | Session-only lens === full model with only pinned domain |
| **T46** | `deriveZoom(level, expansion)` — generic: filters by `minLevel` field; `expansion: Map<id, boolean>` overrides per node. | Level filter + per-node override; renderer receives final node set |

### Extend `@spacegraphjs/adapter` — clusters and groups

The pipeline already understands derived clusters (`AdapterNode.derived` + `clusterOf`). Extend it:

| Task | Description | Verify |
|------|-------------|--------|
| **T47** | `ClusterSpec` (in adapter config): `{ id, match(node), getLabel(members), layoutHint? }` → adapter derives `GroupLayout` bands/chips in `RenderModel`. Expansion state flows from `ViewState`. | Cluster chip renders; expand/collapse changes drawn children |
| **T48** | Group rendering in `@spacegraphjs/renderer` contract: `RenderNode.shape: 'group'` + `GroupLayout { id, bounds, children }` in `RenderModel`. All four renderers (cytoscape, webgl, svg, +future) implement. | Visual regression: groups draw in each renderer; conformance test passes |

### Upgrade main `spacegraphjs` — layouts and continuous

| Task | Description | Verify |
|------|-------------|--------|
| **T49** | `LayoutStrategy` interface aligned with kernel: `compute(kernel, constraints) → LayoutState`, optional `computeIncremental(prev, changes)`. Port force/grid/lane/tree; accept edge `weight` for force attraction. | Same input → same output; force uses weights |
| **T50** | **Continuous layout** — `tree.computeIncremental` + lane/grid incremental. Renderer interpolates LayoutState frames (150–300ms, cubic-bezier(0.2,0,0,1)). Budget evaluated at target positions (via SpatialIndex2D/visibleIn). | Smooth expand/collapse; no thrash on rapid toggles; budget respected |

### Conformance suite

| Task | Description | Verify |
|------|-------------|--------|
| **T51** | `@spacegraphjs/kernel/conformance` — contract tests any host or extension runs: invariants, codec round-trip, deriver composition, query semantics, a11y completeness. Hosts run it against their registries. | OpenCode registry passes; example extension passes; failures name the broken contract |

---

## OpenCode Work (minimal, thin)

### `packages/session-ui/src/graph/` — domain derivers on the kernel

The existing `GraphBuilder` class and `attachWorkspace` become thin derivers. `buildGraph` keeps its exact signature — internally it becomes `buildSessionKernel + pipe(domainDerivers)`.

| Task | Description | Verify |
|------|-------------|--------|
| **T52** | `buildSessionKernel(messages, status, sessionID?, lineage?)` — port of current builder loop; emits session/turn/phase/message/tool/file/... nodes into a `SessionKernel`. Same node ids, same edges. | `model.golden.json` byte-identical |
| **T53** | Domain derivers (each `Deriver` over `WorkspaceSnapshot`/`DiffProvider` inputs): `deriveDirectories`, `derivePackages` (+dependency data), `deriveCommits`, `deriveBranches`, `deriveSymbols` (hunk+snapshot dedup), `deriveProcesses`, `derivePorts` (hyperedge for conflicts), `deriveIssues`, `deriveDocs` (file roles + ADR chain), `deriveTests` (vitest extractor; registry-extensible), `deriveTestRuns` (hyperedge). | `model.golden.with-snapshot.json` byte-identical; contract tests pass |
| **T54** | `buildGraph(input)` becomes adapter: `pipe(...registry.derivers)` applied to merged kernels; returns kernel-backed `GraphModel` (existing selectors read through). Callers unchanged. | All existing session-ui/session-graph tests pass unchanged |
| **T55** | `DiffProvider` — `(turnID) => FileDiffInfo[]`; hunk symbols derive lazily. | No Map allocation; called only for file-touching turns |

### `packages/session-graph/src/ui/` — UI consumes SpaceGraphJS APIs

| Task | Description | Verify |
|------|-------------|--------|
| **T56** | Navigation (`T28`) — `g`-grammar and search built on `GraphQuery.queryMacros` in the OpenCode registry. Help overlay generated from the registry table. | Mixed-domain results; every mnemonic jumps correctly |
| **T57** | Lens control (`T27`) — profiles = saved deriver-set presets in `ViewState`; Domains menu composes `deriveScope`; empty states from registry `clusterSpecs`/`derivers` metadata. | Profile applies domains+layout once; custom after manual edit |
| **T58** | Adaptive UI (`T33`) — cluster chips from `ClusterSpec` + `ViewState.expansion`; continuous transitions via T50. | Toggle animates; state persists reload; no layout thrash |
| **T59** | Review profile — `diffKernels(workspaceKernel, sessionKernel)` rendered: uncommitted files highlighted + summary. One click "what changed". | Review view shows diff; E2E passes |
| **T60** | A11y in host — inspector/toolbar read `A11ySupport` from kernel; roving tabindex from `next()`. | Screen-reader navigation works per kind |
| **T61** | Export — `KernelCodec.encodeJSON` behind existing export menu (svg/json/html); graph files round-trip. | Exported kernel reloads identically |

### Remaining capability gates (all as thin derivers/UI)

| Original | Where it lands | Task |
|----------|----------------|------|
| T19 Directories | OpenCode deriver `deriveDirectories` + registry `clusterSpecs` | T53 |
| T20 History | OpenCode deriver `deriveCommits`/`deriveBranches` (+edge data) | T53 |
| T21 Code | OpenCode `deriveSymbols` (hunk); parser = extension registry entry | T53 |
| T22 Packages | OpenCode `derivePackages` | T53 |
| T23 Runtime | OpenCode `deriveProcesses`/`derivePorts` (hyperedge) | T53 |
| T24 Verification | OpenCode `deriveTests`/`deriveTestRuns`/`deriveCoverage` | T53 |
| T25 Work | OpenCode `deriveIssues` (+checklist data) | T53 |
| T26 Docs | OpenCode `deriveDocs` (roles) + `deriveADRs` (frontmatter) | T53 |
| T27 Lens Control | session-graph UI over `deriveScope`/`ViewState` | T57 |
| T28 Navigation | session-graph UI over `GraphQuery` macros | T56 |
| T33 Adaptive UI | SpaceGraphJS T47–T50 + session-graph T58 | T58 |

---

## Universal Features (post-slices, SpaceGraphJS-first)

| Task | Description | Package |
|------|-------------|---------|
| **T62** | **Real-time deltas** — `WorkspaceKernel.merge(delta)`; build graph re-runs affected derivers. Server-agnostic: any host can push deltas. | kernel |
| **T63** | **Time-travel UI** — version scrubber over `SessionKernel.tag/checkout` + `diffKernels`. Host-agnostic primitives; hosts draw their own scrubber. | kernel |
| **T64** | **Plugin packages** — publish registry extensions as npm packages (`@x/graph-plugin-*`). `composeRegistry` at host build. Marketplace = git repo of packages. | kernel (registry) |
| **T65** | **GPU layouts** — `LayoutStrategy.computeGPU` in main lib (WebGL2/WebGPU) for force/circular. | spacegraphjs |
| **T66** | **Cross-session substrate** — `mergeKernels` across sessions; `ref` nodes resolve on merge; shared WorkspaceKernel per project. | kernel |
| **T67** | **Collaborative cursors** — `ViewState` sync (LWW camera, ephemeral cursors). Transport-agnostic. | kernel (view) |
| **T68** | **Framework wrappers** — react/solid/vue SpaceGraph components consume kernel+adapter directly. | wrappers |

---

## Slices (vertical, each shippable)

| Slice | Package | Days | Delivers |
|-------|---------|------|----------|
| **1. Kernel core** | `@spacegraphjs/kernel` | 3 | T34–T38: Kernel, Session/Workspace, codec, diff + property tests |
| **2. Derivers + query** | `@spacegraphjs/kernel` | 3 | T39–T41, T44–T46: pipe, build graph, GraphQuery, R-tree, scope/zoom |
| **3. OpenCode parity** | session-ui | 3 | T52–T55: session kernel + all domain derivers; both goldens byte-identical |
| **4. Groups + layouts** | adapter/renderer/spacegraphjs | 3 | T47–T50: ClusterSpec, group shapes, LayoutStrategy, continuous |
| **5. A11y + view + registry** | kernel | 2 | T42–T43, T51: a11y, ViewState, conformance suite |
| **6. Host UI on substrate** | session-graph | 3 | T56–T61: navigation, profiles, adaptive UI, review, export |
| **7. Polish + gates** | all | 2 | Remaining T19–T28 gates verified end-to-end; budgets in CI |

**Total: 19 days.** Slices 1–2 make SpaceGraphJS valuable standalone. Slice 3 proves parity. Slices 4–6 light up the universal features for every dependent.

---

## Verification Matrix

| Check | Command |
|-------|---------|
| **Kernel** — substrate invariants, codec, diff, query, a11y, spatial | `cd spacegraphjs/packages/kernel && bun test` |
| **SpaceGraphJS** — layouts, renderer conformance, adapter clusters | `cd spacegraphjs && bun test` |
| **Session-UI** — domain derivers, golden fixtures, contracts | `cd packages/session-ui && bun test src/graph` |
| **Host UI** — navigation, profiles, adaptive UI, a11y | `cd packages/session-graph && bun run typecheck && bun test` |
| **Protocol** — schema round-trip, client gen | `cd packages/protocol && bun test` && `cd packages/client && bun run generate` |
| **User flows** | `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts` |
| **Visual regression** | `bun run graph:capture --mode=verify` |
| **Performance** | `bun run graph:scale` |

---

## Stop Rules (enforced)

1. **Substrate is domain-agnostic.** If a SpaceGraphJS file names a domain concept, it's wrong.
2. **OpenCode changes stay thin.** A domain feature that grows substrate logic moves into SpaceGraphJS.
3. **No I/O in derivers.** Facts enter via parameters (snapshot, provider functions).
4. **No derived node without `provenance`; no derived edge without confidence.**
5. **SessionKernel never mutated.** New version = new kernel instance.
6. **Groups live in LayoutState** (`ClusterSpec` → `GroupLayout`), never as kernel nodes.
7. **Every kernel serializes.** No codec → doesn't exist.
8. **Every navigation is GraphQuery.** No bespoke search/grammar logic.
9. **A11y fails = release fails.** `asTree`/`summarize`/`next` cover every registered kind.
10. **Continuous layout >50ms pipeline cost → off by default behind flag.**
11. **`@spacegraphjs/kernel` stays dependency-free.** No THREE, no DOM, no host imports.

---

## Decision Log (additions to #48–65)

| # | Decision | Reason |
|---|----------|--------|
| 66 | **Substrate lives in SpaceGraphJS (`@spacegraphjs/kernel`), dependency-free** | Every dependent benefits; kernel shares the renderer contract's discipline |
| 67 | **OpenCode is one host among many** | Domain vocabulary stays in the host as thin derivers over the substrate |
| 68 | **Registry composition is the only extension mechanism** | TS package spread; zero runtime cost; type-checked; marketplace = npm packages |
| 69 | **Conformance suite ships with kernel** | Hosts and plugins verify against the same contracts |
| 70 | **SpatialIndex2D is THREE-free; core SpatialIndex stays for WebGL** | Two paths: substrate R-tree for logic, THREE BVH for the WebGL renderer |
| 71 | **LayoutStrategy lives in kernel interface, main lib implements** | Strategies are substrate; renderers are consumers |

---

## Immediate Next Action

**Slice 1 — create `spacegraphjs/packages/kernel/`** with `Kernel`, `SessionKernel`, `WorkspaceKernel`, `KernelCodec`, `diffKernels` + property/conformance tests. Dependency-free, same discipline as `@spacegraphjs/renderer`.

**Then Slice 3 gate:** port OpenCode's `GraphBuilder` to `buildSessionKernel` + domain derivers; both golden fixtures (`model.golden.json`, `model.golden.with-snapshot.json`) byte-identical; all existing tests pass with `buildGraph`'s signature unchanged.

---
