# SPACEGRAPH.TODO.11 — Definitive Plan (rev 5): Substrate in SpaceGraphJS, Thin Host, Complete Idea Vault

**Status:** rev 5, 2026-10-23. The plan to execute. Supersedes TODO.6–TODO.10 (kept as history). Architecture unchanged from TODO.10: **all domain-agnostic substrate lands in SpaceGraphJS (`@spacegraphjs/kernel`, dependency-free); OpenCode keeps only thin domain derivers and UI**. This rev adds: the anti-brittleness testing strategy, explicit alignment with existing codebase assets, and the complete idea vault (nothing discussed is lost).

---

## 1. Anti-Brittleness Testing Strategy

Tests must accelerate development, not gate it. Rules:

### Principles

1. **Test laws, not snapshots.** The substrate (kernel, derivers, query, codec, spatial) gets property tests: round-trip, composition (`pipe(d1,d2)(k) === d2(d1(k))`), version monotonicity, no-dangling-edges. These hold across any intentional change.
2. **Contract tests assert relationships, not values.** "Every derived node carries `provenance`", "lenses never drop session nodes", "no edge references a missing node". Refactor-stable; they survive rewrites.
3. **Exactly two golden fixtures, one-command update.** `model.golden.json` (session-only) and `model.golden.with-snapshot.json`. Update with `UPDATE_GOLDEN=1 bun test src/graph/workspace.test.ts` — never hand-edit. Goldens are regression tripwires, not straightjackets.
4. **Migration gate, then freedom.** During Slices 1–3 the two goldens are byte-identical (the port-is-correct proof). After parity they document intent: update deliberately in the same commit as the behavior change, with a note.
5. **No exact-count or exact-format assertions outside goldens.** Tests may not assert `nodes.length === 17` or `id.startsWith("symbol:")` except inside the goldens and the codec format test.
6. **Visual regression = cheap baseline refresh.** `graph:capture --mode=compare` locally before a PR; `--mode=verify` in CI only for layouts the diff touches. Baseline update is one reviewed command, not a negotiation.
7. **Conformance is opt-in.** `@spacegraphjs/kernel/conformance` runs for hosts and plugins against their registries. Core development is never blocked by host-specific expectations.
8. **Fail-useful.** A contract failure names the violated invariant and the offending node/edge id.
9. **Budgets warn before they fail.** `graph:scale` prints actuals with margins; CI fails only past hard limits (2× budget) so near-misses never flake.
10. **Fixtures are deterministic.** Fixed base timestamp, one tick per event, no `Date.now()`, no randomness, no network.

### We will NOT

- No per-deriver snapshot tests (derivers get property + targeted behavior tests).
- No render-tree snapshots (no React/Solid output snapshots).
- No pixel diffs (structural capture only).
- No tests that duplicate implementation logic.
- No test-ordering dependencies between files.

### Brittleness budget

If updating a test takes longer than the code change it accompanies more than once, the test is wrong — replace it with a law or a contract.

---

## 2. Alignment With and Leverage of the Codebase

### SpaceGraphJS: reuse, never duplicate

| Existing asset | How the substrate aligns |
|----------------|--------------------------|
| `@spacegraphjs/renderer` contract v3 (zero-dep, types + tiny helpers) | `@spacegraphjs/kernel` mirrors this discipline: no runtime deps, versioned, conformance-tested |
| `BaseGraphRenderer` + event bus | Kernel is event-free (versioned, pull-based); view layers subscribe to version numbers; renderer bus unchanged |
| `ModelAdapter` pipeline (level filter, bands; `AdapterNode.derived` + `clusterOf` already exist) | `ClusterSpec` formalizes `derived`/`clusterOf`; `GroupLayout` flows through the same pipeline — groups are not new, they are typed |
| `navigation/search.ts` (generic scored search) | Becomes a `GraphQuery` macro; the matching core is reused, not rewritten |
| `core/SpatialIndex` (THREE, grid-cells, for WebGL) | Stays for the WebGL path; `SpatialIndex2D` (R-tree) is the logic-side twin with the same API shape (`build`/`queryBox`/`queryRadius`) |
| `core/TypeRegistry`, `PluginManager` | `Registry`/`composeRegistry` mirrors their patterns; existing plugins untouched |
| `layout/` (force, grid, LaneLayout, tree, placement) | `LayoutStrategy` wraps them; `compute` signatures adapt; placement logic reused |
| `a11y/AccessibilityLayer` | Kernel `A11ySupport` (asTree/summarize/next) feeds it structured data; the layer stays the DOM side |
| `Selection`, `CameraControls` | Consume `ViewState`; `ViewState` serializes what they already own |
| `zoom/`, `LODPlugin`, `ZoomBandsPlugin` | `deriveZoom` is the data side; the plugins stay the render side |
| Builder `$` API, `depth/`, `vision/`, overlays | Unchanged; the kernel sits beneath the builder for substrate users |

### OpenCode: the migration reuses the working code

| Existing asset | Migration path |
|----------------|----------------|
| `GraphBuilder` (`build.ts`) | The message loop becomes `buildSessionKernel` — same emission order, same node IDs, same edges; a port, not a rewrite |
| `attachWorkspace` + `attachPackages`/`attachCommits`/`attachBranches`/`attachSymbols`/`attachProcesses`/`attachIssues` | Each method body becomes a standalone `Deriver` — moved, not re-authored |
| `symbolsFromHunk` | Called inside `deriveSymbols`; unchanged |
| `scopeModel` (`scope.ts`) | Thin wrapper over `deriveScope` during migration; deleted at parity |
| `actionsFor`, `filterActionsByCapabilities`, `capabilitiesFromSnapshot` | Become registry `actions` contributions; the filtering logic is reused verbatim |
| `vocabulary.ts` (`DOMAINS`, `DOMAIN_OF_KIND`, `nodeDomain`) | Stays — host vocabulary; the registry references it |
| `levels.ts`, `layout.ts`, `summary.ts`, `scale.ts` | Stay — host layout policy; `LayoutStrategy` ports call into them |
| `selectors.ts` (`search`, `why`, `ancestors`, …) | Read-through to kernel queries; `GraphQuery` subsumes `search` |
| `budget.ts` (`byProximity`) | Optionally consumes `SpatialIndex2D`; the budget semantics stay |
| `detail.ts` (tiers, hysteresis) | Feeds `deriveZoom` params; unchanged |
| `equalizer.ts`, `metrics.ts`, `lookup.ts` | Stay host-side, untouched |
| `fixture.ts` + both goldens | Unchanged — they are the parity gate |
| `GraphToolbar`/`GraphView`/`GraphDetail`/windows | Consume `ViewState`, query macros, `ClusterSpec` through props; minimal prop additions, no rewrites |

### Server gaps (carried, unchanged)

- Snapshot memoization per `(location, revision, scope)` + event invalidation (T29.2 note).
- `Vcs.history` capability to fill `commits`/`branches`/`head.sha`/`base.sha` (T29.2 note).

---

## 3. SpaceGraphJS Work — `spacegraphjs/packages/kernel/` + extensions

Dependency-free package, same discipline as the renderer contract.

| Task | Description | Verify |
|------|-------------|--------|
| **T34** | `Kernel` — `addNode/addEdge/addHyperedge`, `getNode/getEdges`, `filterNodes`, `subgraph`, `version`. Edge carries `weight?` + `data?`. Hyperedge `{ id, kind, members, roles?, data?, confidence }`. | Property: append-only, version monotonic, no dangling |
| **T35** | `SessionKernel` — `append(entry)`, `tag(name)`, `checkout(versionOrTag)`, `fork(from)`. | Property: checkout returns exact historical view |
| **T36** | `WorkspaceKernel` — LWW `merge(other, clock)`, `replaceFrom(entries)`. | Property: concurrent merges converge |
| **T37** | `KernelCodec` — versioned binary + readable JSON. | Property: round-trip identical; JSON diffable |
| **T38** | `diffKernels(a, b)` → added/removed/changed + `asKernel()` + `summarize()`. | Behavior: correct sets; readable summary |
| **T39** | `Deriver { id, inputs, outputs, derive, deriveIncremental? }` + `pipe()` + **build graph** (changed inputs re-run only dependents). | Property: pipe law; invalidation touches only dependents |
| **T40** | `GraphQuery` — `nodes(pattern)`, `traverse(ref, edgePattern, dir)`, `path(from,to)`, `near(pos,r)` (via SpatialIndex2D), `count`, `collect`. | Behavior: patterns match; paths found; near uses R-tree |
| **T41** | `Registry` + `composeRegistry(...)` — kinds, derivers, layouts, actions, clusterSpecs, queryMacros. | Type-checked extension; composition additive |
| **T42** | `A11ySupport` — `asTree(root)`, `summarize(id)`, `next(from, dir)`. | Contract: every registered kind reachable and announced |
| **T43** | `ViewState` — camera, selection, hover, expansion; `serialize()`/`deserialize()`. | Round-trip; "look at this" link encodes camera |
| **T44** | `SpatialIndex2D` — R-tree: `build`, `hitTest`, `rectTest`, `near`, `visibleIn(viewport)`. No THREE. | Property: agrees with brute force; O(log n) |
| **T45** | `deriveScope(domains, pinned)` — generic domain filter; drops dangling edges. | Contract: pinned always survive |
| **T46** | `deriveZoom(level, expansion)` — filters by `minLevel`; per-node `expansion` overrides. | Contract: override beats table |
| **T47** | `ClusterSpec` in `@spacegraphjs/adapter` — `match`, `getLabel`, `layoutHint` → `GroupLayout` in `RenderModel`. | Conformance: groups render in every renderer |
| **T48** | `@spacegraphjs/renderer`: `RenderNode.shape: 'group'` + `GroupLayout { id, bounds, children }`. All renderers implement. | Conformance suite |
| **T49** | `LayoutStrategy` in kernel interface; main lib ports force/grid/lane/tree; force accepts edge `weight`. | Same-input-same-output; visual compare |
| **T50** | **Continuous layout** — `computeIncremental` on tree/lanes; renderer interpolates 150–300ms cubic-bezier; budget at target positions. | Visual compare; rapid-toggle no thrash |
| **T51** | Conformance suite — invariants, codec round-trip, deriver composition, query semantics, a11y completeness. Hosts/plugins run it against their registries. | Opt-in; failures name contract + node |

---

## 4. OpenCode Work (thin)

### `packages/session-ui/src/graph/`

| Task | Description | Verify |
|------|-------------|--------|
| **T52** | `buildSessionKernel(messages, status, sessionID?, lineage?)` — port of the builder loop; identical IDs, edges, order. | `model.golden.json` byte-identical |
| **T53** | Domain derivers (thin, over kernel primitives): `deriveDirectories`, `derivePackages` (+dep data), `deriveCommits`, `deriveBranches`, `deriveSymbols` (hunk+snapshot dedup), `deriveProcesses`, `derivePorts` (conflict hyperedge), `deriveIssues`, `deriveDocs` (file roles + ADR chain), `deriveTests` (vitest extractor), `deriveTestRuns` (hyperedge), `deriveCoverage` (only when report exists). | `model.golden.with-snapshot.json` byte-identical; contract tests |
| **T54** | `buildGraph(input)` becomes the adapter: merged kernels + `pipe(...registry.derivers)`; returns kernel-backed `GraphModel`; selectors read through; **signature unchanged**. | All existing tests pass unchanged |
| **T55** | `DiffProvider` — `(turnID) => FileDiffInfo[]`; hunk symbols derive lazily. | No Map allocation; lazy eval verified |

### `packages/session-graph/src/ui/`

| Task | Description | Verify |
|------|-------------|--------|
| **T56** | Navigation — `g`-grammar + search as `queryMacros` in the OpenCode registry; help overlay generated from the registry table. | Mnemonics jump; mixed-domain results |
| **T57** | Lens control — profiles = saved deriver presets in `ViewState`; Domains menu composes `deriveScope`; empty states from registry metadata (with the T27.3 action table: git init / install grammar / run tests / add token / load full project). | Profile applies once; `custom` after manual edit |
| **T58** | Adaptive UI — cluster chips from `ClusterSpec` + `ViewState.expansion`; continuous transitions via T50. | Toggle animates; persists reload |
| **T59** | Review profile — `diffKernels(workspaceKernel, sessionKernel)` rendered: uncommitted files highlighted + summary; one-click "what changed". | E2E passes |
| **T60** | A11y in host — inspector/toolbar consume `A11ySupport`; roving tabindex from `next()`. | Screen-reader flow per kind |
| **T61** | Export — `KernelCodec.encodeJSON` behind the existing export menu; graph files round-trip. | Exported kernel reloads identically |

### Capability gates (all land as thin derivers/UI)

| Original | Where | Task |
|----------|-------|------|
| T19 Directories | `deriveDirectories` + `directoryClusterSpec`; equalizer presets `directories-as-large`, `untouched-dimmer` | T53, T57 |
| T20 History | `deriveCommits`/`deriveBranches` + edge data (dates, files) | T53 |
| T21 Code | `deriveSymbols` (hunk); parser = registry extension (Vault V50) | T53 |
| T22 Packages | `derivePackages` | done → keep on kernel at parity |
| T23 Runtime | `deriveProcesses`/`derivePorts` (conflict hyperedge; PID-reuse no fork) | T53 |
| T24 Verification | `deriveTests`/`deriveTestRuns`/`deriveCoverage` (absent ≠ zero) | T53 |
| T25 Work | `deriveIssues` (messages first) + checklist `data.tasks` with turn links | T53 |
| T26 Docs | `deriveDocs` (roles) + ADR `supersedes` chain via `references` | T53 |
| T27 Lens Control | UI over `deriveScope`/`ViewState`/empty-state registry | T57 |
| T28 Navigation | UI over `GraphQuery` macros | T56 |
| T33 Adaptive UI | SpaceGraphJS T47–T50 + host T58 | T58 |

---

## 5. Universal Features (SpaceGraphJS-first, post-slices)

| Task | Description | Package |
|------|-------------|---------|
| **T62** | Real-time deltas — `WorkspaceKernel.merge(delta)`; build graph re-runs affected derivers. Transport-agnostic. | kernel |
| **T63** | Time-travel UI — scrubber over `tag/checkout` + `diffKernels`; hosts draw their own. | kernel primitives, host UI |
| **T64** | Plugin packages — `@x/graph-plugin-*` npm packages via `composeRegistry`; marketplace = git repo. | kernel registry |
| **T65** | GPU layouts — `computeGPU` (WebGL2/WebGPU) for force/circular. | spacegraphjs main |
| **T66** | Cross-session substrate — `mergeKernels` across sessions; `ref` nodes resolve on merge; shared workspace kernel per project. | kernel |
| **T67** | Collaborative cursors — `ViewState` sync (LWW camera, ephemeral cursors). Transport-agnostic. | kernel view |
| **T68** | Framework wrappers on kernel — react/solid/vue components consume kernel+adapter directly. | wrappers |

---

## 6. Slices (19 days, each shippable)

| Slice | Package | Days | Delivers |
|-------|---------|------|----------|
| **1. Kernel core** | `@spacegraphjs/kernel` | 3 | T34–T38 + property tests |
| **2. Derivers + query + spatial** | `@spacegraphjs/kernel` | 3 | T39–T41, T44–T46 |
| **3. OpenCode parity** | session-ui | 3 | T52–T55; both goldens byte-identical |
| **4. Groups + layouts + continuous** | adapter/renderer/main | 3 | T47–T50 |
| **5. A11y + ViewState + conformance** | kernel | 2 | T42–T43, T51 |
| **6. Host UI on substrate** | session-graph | 3 | T56–T61 |
| **7. Polish + gates verified** | all | 2 | T19–T28/T33 gates green; budgets in CI |

---

## 7. Verification Matrix (with brittleness notes)

| Check | Command | Brittleness guard |
|-------|---------|-------------------|
| Kernel substrate | `cd spacegraphjs/packages/kernel && bun test` | Property + contract only; no goldens |
| SpaceGraphJS layouts/renderers | `cd spacegraphjs && bun test` | Conformance + targeted behavior |
| Session-UI derivers + goldens | `cd packages/session-ui && bun test src/graph` | Two goldens, `UPDATE_GOLDEN=1` refresh |
| Host UI | `cd packages/session-graph && bun run typecheck && bun test` | Behavior tests; no render snapshots |
| Protocol/client gen | `cd packages/protocol && bun test` && `cd packages/client && bun run generate` | Round-trip only |
| Server | `cd packages/server && bun test src/graph` | Behavior |
| User flows | `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts` | Flow-level; one per flow |
| Visual regression | `bun run graph:capture --mode=verify` | Diff-scoped; baseline refresh is one command |
| Performance | `bun run graph:scale` | Warn-first; hard-fail at 2× budget |

---

## 8. Stop Rules (enforced)

1. Substrate is domain-agnostic; a SpaceGraphJS file naming a domain concept is wrong.
2. OpenCode stays thin; domain logic that grows substrate moves into SpaceGraphJS.
3. No I/O in derivers — facts enter via parameters.
4. No derived node without `provenance`; no derived edge without confidence.
5. `SessionKernel` is never mutated; new version = new instance.
6. Groups live in `LayoutState` (`ClusterSpec` → `GroupLayout`), never as kernel nodes.
7. Every kernel serializes; no codec → doesn't exist.
8. Every navigation is `GraphQuery`; no bespoke search/grammar logic.
9. A11y fails = release fails; every registered kind announced and reachable.
10. Continuous layout >50ms pipeline cost → off by default behind a flag.
11. `@spacegraphjs/kernel` stays dependency-free (no THREE, no DOM, no host imports).
12. **A test that pins a value a developer would reasonably change is a bug in the test** (§1).

---

## 9. Idea Vault — everything discussed, nothing lost

Status: **Landed** (in a task above) · **Planned** (in slices) · **Deferred** (D-items / post-slice) · **Vault** (indefinite; revisit when its unblock arrives). Vault items name where they would land.

### Kernel & data model

| # | Idea | Status | Where |
|---|------|--------|-------|
| V1 | Two kernels: Session (append-only) + Workspace (LWW) | Landed | T34–T36 |
| V2 | Hyperedges for multi-node relations (test-runs, port conflicts) | Landed | T34, T53 |
| V3 | Edge weights + extensible edge data | Landed | T34, T49 |
| V4 | Native serialization (binary + JSON) | Landed | T37, T61 |
| V5 | Structural diff `diffKernels` (+ asKernel, summarize) | Landed | T38, T59 |
| V6 | Time-travel: tag/checkout/fork/replay | Landed (T35); UI Deferred | T63 |
| V7 | Multi-kernel `ref` nodes (cross-session) | Deferred | T66 |
| V8 | Explicit edge kinds (`defines`, `tests`) vs `part-of` overload | Vault — kernel | Revisit if layouts/queries suffer from the overload |
| V9 | Ports as process property (no port nodes) | Vault — host | Revisit if port nodes clutter |
| V10 | Single virtual workspace root (session as child) | Vault — kernel | Revisit if two-root layouts hurt |
| V11 | `minLevel` as per-node function | Vault — kernel | T46 expansion may cover it |
| V12 | Stale marking (`stale: true`) + optimistic invalidation | Vault — kernel | Pairs with T62 |
| V13 | CRDT-ready workspace (LWW registers, logical clock) | Landed | T36; transport in T67 |

### Pipeline

| # | Idea | Status | Where |
|---|------|--------|-------|
| V14 | Deriver build graph (incremental invalidation) | Landed | T39 |
| V15 | `DiffProvider` function (lazy, no Map) | Landed | T55 |
| V16 | Semantic zoom as deriver stage | Landed | T46 |
| V17 | Lens-aware build (skip out-of-lens sources entirely) | Vault — kernel | Perf revisit at 10k+ nodes |
| V18 | Two-level lens: domain + workspace scope (directory/package/turn) | Vault — host UX | Post-parity experiment |
| V19 | Push-based updates (server events, `WorkspaceDelta`) | Planned | T62 |

### Query & navigation

| # | Idea | Status | Where |
|---|------|--------|-------|
| V20 | `GraphQuery` (pattern/traverse/path/near/count/collect) | Landed | T40 |
| V21 | `g`-grammar as query macros (9 mnemonics) | Landed | T56 |
| V22 | Reduced grammar (5 core mnemonics) | Vault — host | If 9 proves noisy |
| V23 | Search as a query (generic, scored — reuse `navigation/search.ts`) | Landed | T56 |
| V24 | Profiles as saved deriver presets | Landed | T57 |
| V25 | 3-profile simplification (verify/work as presets) | Vault — host | If 5 profiles confuse |
| V26 | `DomainEmptyState` registry (cause + one primary action) | Planned | T57 |
| V27 | Empty-state action table (git init / install grammar / run tests / add token / load full) | Planned | T57 |

### Layout & spatial

| # | Idea | Status | Where |
|---|------|--------|-------|
| V28 | `LayoutStrategy` interface (kernel-owned, lib-implemented) | Landed | T49 |
| V29 | Continuous layout (`computeIncremental` + interpolation) | Landed | T50 |
| V30 | Groups as layout annotations (`ClusterSpec` → `GroupLayout`) | Landed | T47–T48 |
| V31 | `SpatialIndex2D` R-tree (THREE-free) | Landed | T44 |
| V32 | Viewport culling via `visibleIn` | Landed | T44/T57 |
| V33 | Force layout weight-aware attraction | Landed | T49 |
| V34 | Budget evaluated at target positions | Landed | T50 |
| V35 | GPU layouts (WebGL2/WebGPU) | Deferred | T65 |
| V36 | Force layout off by default | Landed (existing policy) | keep |

### Host (OpenCode) features

| # | Idea | Status | Where |
|---|------|--------|-------|
| V37 | Domain derivers as thin `(Kernel, inputs) → Kernel` | Landed | T53 |
| V38 | File roles generalized (`config`, `doc`, `adr`, `test`, `fixture`, `generated`, `lockfile`) | Planned (4 roles) · more Vault | T53 |
| V39 | Dependency virtual nodes (queryable, not rendered) | Vault — host | If graph queries beat the detail list |
| V40 | Dual-source processes (snapshot + tool-output regex real-time) | Planned (snapshot) · regex Vault | T53 |
| V41 | Issue extraction: messages first; branches/commits opt-in | Landed (messages) · opt-in Vault | T53 |
| V42 | Test extractors: vitest first; jest/pytest/go via registry | Landed (vitest) · rest Vault | T53 |
| V43 | ADR frontmatter `supersedes` chain | Landed | T53 |
| V44 | Issue checklists as `data.tasks` with turn links | Planned | T53 |
| V45 | Coverage absent ≠ zero | Planned | T53 |
| V46 | Port conflict badge on both cards | Landed | T53 + host UI |
| V47 | PID reuse does not fork a node | Landed (test) | T53 |
| V48 | Equalizer presets (`directories-as-large`, `untouched-dimmer`, `uncovered-larger`) | Planned | host polish |
| V49 | Card budget weights per domain (`byProximity` weights arg) | Planned | budget work |
| V50 | As-of legend + missing display | Landed (T30.3) | keep |
| V51 | Filesystem window lazy 20k E2E | Planned | T19.3 verify |
| V52 | Multi-view split (same kernel, different lenses side by side) | Vault — host UX | Post-parity experiment |

### Server / infrastructure

| # | Idea | Status | Where |
|---|------|--------|-------|
| V53 | Snapshot memoization per `(location, revision, scope)` + event invalidation | Planned | server (T29.2 note) |
| V54 | `Vcs.history` capability (fills commits/branches/head/base SHAs) | Planned | server + protocol |
| V55 | Tree-sitter WASM parser packaging (`origin: "parser"`, `calls` edges) | Deferred | D27-adjacent |
| V56 | Degradation matrix tests (3 critical rows: no repo / no parser / no snapshot) | Planned | T51 + host |
| V57 | CI budgets warn-first, hard-fail at 2× | Planned | `graph:scale` |

### A11y & view

| # | Idea | Status | Where |
|---|------|--------|-------|
| V58 | `A11ySupport` (asTree / summarize / next) | Landed | T42, T60 |
| V59 | `ViewState` persist + sync ("look at this" links) | Landed | T43 |
| V60 | Collaborative cursors / camera follow | Deferred | T67 |
| V61 | Review profile via `diffKernels` ("what changed") | Landed | T59 |

### Extensibility & ecosystem

| # | Idea | Status | Where |
|---|------|--------|-------|
| V62 | Static module registry (`composeRegistry`) | Landed | T41 |
| V63 | Conformance suite for hosts/plugins | Landed | T51 |
| V64 | Plugin packages + marketplace (npm + git repo) | Deferred | T64 |
| V65 | Framework wrappers consuming kernel directly | Deferred | T68 |

### Carried deferrals (unchanged)

| ID | Item |
|----|------|
| D16–D22 | Multi-session, cursors, time travel, AI summaries, plugin kinds, prompt export, 3D |
| D23 | External dependency *nodes* |
| D24 | Container nodes (`docker ps`/devcontainer source) |
| D25 | Comment nodes (TODO/FIXME) |
| D26 | Tag nodes (release landmarks) |
| D27 | True go-to-definition (LSP plugin) |
| D28 | Cross-session control plane |

---

## 10. Decision Log (#48–71 unchanged, additions)

| # | Decision | Reason |
|---|----------|--------|
| 72 | **Tests are laws and contracts; goldens are two, refreshable in one command** | Brittleness is a development tax; invariants hold across intentional change |
| 73 | **Budgets warn before they fail** | Near-miss flakes stop development; 2× hard-fail catches regressions |
| 74 | **Conformance is opt-in** | Host expectations must not gate core development |
| 75 | **Idea vault is part of the plan** | Nothing discussed is lost; each vault item names its landing place and unblock |

---

## 11. Immediate Next Action

**Slice 1 — create `spacegraphjs/packages/kernel/`** with `Kernel`, `SessionKernel`, `WorkspaceKernel`, `KernelCodec`, `diffKernels` + property tests (§1 discipline: laws, not snapshots).

**Slice 3 gate (the proof):** OpenCode's `buildGraph` ported to `buildSessionKernel` + domain derivers; both goldens byte-identical via `UPDATE_GOLDEN=1`; every existing test passes with the public signature unchanged.

---
