# SPACEGRAPH.TODO.12 — Base-System-First (rev 6, definitive)

**Status:** rev 6, 2026-10-23. Supersedes TODO.11 (kept as history). Architecture unchanged — **domain-agnostic substrate in SpaceGraphJS (`@spacegraphjs/kernel`), OpenCode a thin host** — but the *path* is reordered so a **complete usable base lands in ~6.5 days with zero regressions**, and everything peripheral stacks after. Adds 10 design refinements and 7 development-path improvements.

---

## 1. Definition: what "usable base" means

**Base = the kernel-backed system with no capability loss.** Concretely, after Slice 3:

- OpenCode's graph runs entirely on `@spacegraphjs/kernel`; `buildGraph` signature unchanged; both goldens byte-identical; all 179 session-ui + 104 session-graph tests pass untouched.
- `@spacegraphjs/kernel` ships a versioned, publishable package: Kernel / SessionKernel / WorkspaceKernel, KernelCodec, `diffKernels`, `Deriver` + `pipe`, `deriveScope`, `deriveZoom`, `GraphQuery` (topology: patterns, traverse, path, count, collect), `Registry` types, conformance runner.
- A dependent can: build a kernel, serialize it, diff two kernels, run derivers, query it, and render through the **existing** adapter/renderer contract (unchanged).

Everything else — navigation UI, profiles, clusters, continuous layout, spatial, a11y, review — is **additive capability**, each in its own shippable slice.

**Base is not a demo.** It is a library other projects can adopt, and the version of OpenCode with no behavior change.

---

## 2. Design refinements (deltas from TODO.11)

| # | Refinement | Why |
|---|-----------|-----|
| **D1** | Kernels preserve **insertion order** for nodes and edges; declared invariant. | Goldens and layout stability depend on order. |
| **D2** | `SessionKernel` state is the **fold of its append log**; `checkout(v)`/`fork(v)` replay entries to v. No per-version snapshots. | History without memory blow-up; time-travel becomes entry replay, not snapshot storage. |
| **D3** | `deriveScope(keep: (node) => boolean)` and `deriveZoom({ levelOf, rank, level, expansion })` take **host functions**. | Kernel must not know `domain`, `minLevel`, or `provenance` — those are host metadata. Keeps the substrate genuinely domain-agnostic. |
| **D4** | `provenance`/`confidence` contracts are enforced by the **host conformance run**, not kernel core. | Kernel stays vocabulary-free; the host declares its own invariants. |
| **D5** | `GraphQuery` is **topology-only**. Spatial queries take an index explicitly: `q.near(spatial, point, radius)`. | Query can ship in Slice 1, long before `SpatialIndex2D`. No API churn later. |
| **D6** | `GraphModel` becomes a **view**: `toGraphModel(kernel)`. Kernel is the source of truth; existing selectors/tests read the view unchanged. | 283 existing tests keep working; migration is internal. |
| **D7** | **Groups are bands.** The adapter already emits bands as `RenderNode`s; clusters reuse that mechanism with a `data.group` convention. **No renderer-contract change in base or clusters.** Native `shape:'group'` deferred (V66). | Zero contract churn; maximal alignment with `ModelAdapter`. |
| **D8** | `Registry.actions` is **host-owned**; kernel core leaves the slot empty. | Action vocabulary is OpenCode's, not the substrate's. |
| **D9** | Codec header carries **format version + contract version**; old files fail with a clear message. | Files outlive code; fail loudly, never silently. |
| **D10** | Kernel tests stay **dependency-free**: small seeded LCG generator in test utils, no `fast-check`. | Property tests without a dependency; same discipline as the package. |

---

## 3. Development-path improvements

| # | Improvement | Effect |
|---|-------------|--------|
| **P1** | **Base-system-first ordering.** Kernel (3d) → deriver/scope (1d) → parity port (3d) → **ship base**. | First real value at day 6.5 instead of day 19. |
| **P2** | **Dual-path compare during the port**: `SESSION_GRAPH_KERNEL=compare` builds the model by *both* old builder and kernel, throws on divergence. Dev-only; deleted at the end of Slice 3. | Catches real-session divergence the fixtures miss, while both paths exist. |
| **P3** | **Kernel JSON fixtures**: once the codec exists, commit `session.kernel.json` / `workspace.kernel.json`; deriver tests become `kernel in → kernel out`. | Faster, clearer tests; derivers testable without message fixtures. |
| **P4** | **Slice 1 ends publishable**: version the package, add README + exports map. | Dependents can adopt immediately; API pressure surfaces early. |
| **P5** | **No contract bump in base.** Groups via bands (D7), so renderer v3 stays valid through Slice 6. | Removes a whole class of adapter/conformance churn from the critical path. |
| **P6** | **Per-kind parity report**: during the port, compare node/edge id sets *per kind*, not just the whole golden. | Makes a partial port debuggable ("directories match, symbols 3 off") instead of one opaque diff. |
| **P7** | **Every slice ends shippable**: named gate, green tests, no half-migrated surfaces. | No integration hell; any slice can be the last one for a while. |

---

## 4. Revised slices — base first (6.5 days), then capability

| Slice | Days | Package | Delivers | Gate |
|-------|------|---------|----------|------|
| **1. Kernel substrate** | 3 | `@spacegraphjs/kernel` | T34 Kernel (+hyperedge, edge data, ordered), T35 SessionKernel (log fold, tag/checkout/fork), T36 WorkspaceKernel (replaceFrom; LWW merge), T37 KernelCodec (D9), T38 diffKernels, T40a GraphQuery (patterns/traverse/path/count/collect — no near), T41 Registry types | Property tests (D10) + codec round-trip + **publishable package** (P4) |
| **2. Deriver + lens** | 1 | kernel | T39 `Deriver`+`pipe` (no build-graph invalidation yet), T45 `deriveScope(keep)` (D3), T46 `deriveZoom({levelOf,…})` (D3) | Laws: pipe composition, scope keeps pinned, zoom override beats table |
| **3. Parity port** | 3 | session-ui | T52 `buildSessionKernel`; T53 domain derivers (existing domains, moved not re-authored); T54 `buildGraph` adapter + `toGraphModel` (D6); T55 DiffProvider; actions → registry (D8); per-kind parity report (P6); delete `scopeModel` wrapper | **Both goldens byte-identical** + dual-path compare clean (P2) + all existing tests pass. **← BASE COMPLETE, SHIP** |
| **4. Navigation** | 2 | session-graph | T56 search + `g`-grammar as query macros; help overlay generated from registry | Every mnemonic jumps; mixed-domain search results |
| **5. Profiles + review** | 1.5 | session-graph | T57 profiles as deriver presets; empty states with the T27.3 action table; T59 review profile via `diffKernels` | E2E: profile applies once, `custom` after edit; review shows uncommitted |
| **6. Clusters + adaptive** | 3 | adapter + host | T47 `ClusterSpec` → group bands (D7); expansion in view state; T33.1–3 expand/collapse, progressive detail on zoom | Visual compare; expansion persists; no pop at level boundaries |
| **7. Continuous layout** | 2 | kernel interface + spacegraphjs main | T49 `LayoutStrategy` port of force/grid/lane/tree (weight-aware); T50 `computeIncremental` + interpolation behind flag | Visual compare; >50ms cost stays behind flag |
| **8. Spatial + scale** | 1.5 | kernel + host | T44 `SpatialIndex2D`; viewport culling; `q.near` (D5); budget weights per domain | Bench: 10k nodes culled; budgets warn-then-fail at 2× |
| **9. A11y + export** | 2 | kernel + host | T42 `A11ySupport` (config-driven, D4); T60 host wiring; T61 kernel JSON export | Every kind announced/reachable; export round-trips |
| **10. Real-time** | post | kernel | T62 `WorkspaceKernel.merge(delta)` + deriver re-run | Converges; no full rebuild |

**Base = Slices 1–3 (6.5 days). Full capability = Slices 1–9 (~19.5 days).** Slice 10 and the universal features (T63–T68) are post-plan.

---

## 5. Testing discipline (carried from TODO.11, tightened)

1. **Laws, not snapshots**, for substrate: round-trip, composition, monotonicity, order preservation, no dangling edges.
2. **Contracts, not values**, for hosts: every derived node has provenance; lenses never drop pinned kinds; no edge references a missing node. Enforced by the host's conformance run (D4).
3. **Two goldens, one command**: `UPDATE_GOLDEN=1 bun test src/graph/workspace.test.ts`. Byte-identical is the *migration gate* (Slices 1–3), then goldens document intent.
4. **No exact-count/format assertions outside goldens** and the codec format test.
5. **Dual-path compare (P2)** is temporary by design — deleted at parity; it must never become a permanent test.
6. **Seed generators, not randomness.** Fixed seeds in test utils; fixtures have no clock, no network.
7. **Budgets warn, then hard-fail at 2×.** Never flake on a near-miss.
8. **Conformance is opt-in**; core development is never blocked by host expectations.
9. **Fail-useful**: every failure names the invariant and the offending node/edge id.
10. **A test that pins a value a developer would reasonably change is a bug in the test.** If a test costs more to update than the change it guards, replace it with a law or a contract.

**We will not:** per-deriver snapshots; render-tree snapshots; pixel diffs; tests duplicating implementation logic; cross-file test ordering.

---

## 6. Codebase alignment (unchanged, now load-bearing)

| SpaceGraphJS asset | Reused as |
|--------------------|-----------|
| `@spacegraphjs/renderer` v3 (zero-dep, versioned, negotiated) | Model for `@spacegraphjs/kernel`'s discipline; **contract unchanged in base** (D7, P5) |
| `ModelAdapter` bands + `derived`/`clusterOf` | Groups = bands (D7) — the existing mechanism, typed |
| `navigation/search.ts` | Becomes a `GraphQuery` macro; matching core reused |
| `core/SpatialIndex` (THREE, grid) | Stays for WebGL; `SpatialIndex2D` is the logic twin with the same API shape |
| `core/TypeRegistry`, `PluginManager` | Pattern for `Registry`/`composeRegistry` |
| `layout/` (force, grid, lane, tree) | Wrapped by `LayoutStrategy` in Slice 7; placement logic reused |
| `a11y/AccessibilityLayer`, `Selection`, `CameraControls` | Consume config-driven kernel output / view state; DOM side unchanged |
| `zoom/`, `LODPlugin`, `ZoomBandsPlugin` | Render side stays; `deriveZoom` is the data side |

| OpenCode asset | Migration |
|----------------|-----------|
| `GraphBuilder` message loop | **Ported** to `buildSessionKernel` — same order, IDs, edges |
| `attachWorkspace` + `attachPackages`/`Commits`/`Branches`/`Symbols`/`Processes`/`Issues` | Each becomes a `Deriver` — moved, not re-authored |
| `symbolsFromHunk` | Called inside `deriveSymbols`, unchanged |
| `scopeModel` | Thin wrapper at first; deleted at parity (T54) |
| `actionsFor` / capability filtering | Registry contributions (D8), logic reused verbatim |
| `selectors.ts` `search` | Subsumed by query macros in Slice 4; behavior preserved |
| `vocabulary.ts`, `levels.ts`, `layout.ts`, `summary.ts`, `scale.ts`, `budget.ts`, `detail.ts` | Stay host-side; supply the functions `deriveScope`/`deriveZoom` need (D3) |
| `fixture.ts` + both goldens | Unchanged — the parity gate |

**Server gaps (carried):** snapshot memoization per `(location, revision, scope)`; `Vcs.history` to fill commit/branch SHAs.

---

## 7. Stop rules

1. Substrate is domain-agnostic; a SpaceGraphJS file naming a domain concept is wrong.
2. OpenCode stays thin; domain logic that grows substrate moves into SpaceGraphJS.
3. No I/O in derivers — facts enter via parameters.
4. `SessionKernel` is never mutated; new version = new instance; state = log fold (D2).
5. Groups live in the adapter/view (`ClusterSpec` → bands), never as kernel nodes.
6. Every kernel serializes; no codec → doesn't exist.
7. Every navigation is `GraphQuery`; no bespoke search/grammar logic.
8. A11y fails = release fails (from Slice 9 onward); every registered kind announced and reachable.
9. Continuous layout >50ms pipeline cost → off by default behind a flag.
10. `@spacegraphjs/kernel` stays dependency-free — runtime *and* test helpers (D10).
11. A test that pins a value a developer would reasonably change is a bug in the test.
12. **No slice ships half-migrated**: either the old path or the new one, never both, except the explicit dual-path compare (P2) which is deleted at parity.

---

## 8. Idea vault — nothing lost

Status: **Landed** (in a slice) · **Planned** (scheduled) · **Deferred** (named unblock) · **Vault** (indefinite; revisit when its unblock arrives).

### Kernel & data model
| # | Idea | Status | Where |
|---|------|--------|-------|
| V1 | Two kernels: Session (append-only) + Workspace (LWW) | Landed | S1 |
| V2 | Hyperedges for multi-node relations | Landed (primitive) · usage in S3 | S1/S3 |
| V3 | Edge weights + extensible edge data | Landed | S1 |
| V4 | Native serialization (binary + JSON) | Landed | S1/S9 |
| V5 | Structural diff `diffKernels` | Landed | S1/S5 |
| V6 | Time-travel tag/checkout/fork via log replay | Landed (D2) · UI Deferred | S1 / T63 |
| V7 | Multi-kernel `ref` nodes (cross-session) | Deferred | T66 |
| V8 | Explicit edge kinds (`defines`, `tests`) vs `part-of` overload | Vault | Revisit if layouts/queries suffer |
| V9 | Ports as process property (no port nodes) | Vault | Revisit if port nodes clutter |
| V10 | Single virtual workspace root | Vault | Revisit if two-root layouts hurt |
| V11 | `minLevel` as per-node function | Partly landed | `deriveZoom` per-node override (D3) |
| V12 | Stale marking + optimistic invalidation | Vault | Pairs with T62 |
| V13 | CRDT-ready workspace (LWW registers, clock) | Landed (merge) · transport Deferred | S1 / T67 |

### Pipeline
| # | Idea | Status | Where |
|---|------|--------|-------|
| V14 | Deriver build graph (incremental invalidation) | Deferred (pipe ships first) | T62/S10 |
| V15 | `DiffProvider` function (lazy) | Landed | S3 |
| V16 | Semantic zoom as deriver stage | Landed | S2 |
| V17 | Lens-aware build (skip out-of-lens sources) | Vault | Perf revisit at 10k+ |
| V18 | Two-level lens: domain + workspace scope | Vault | Post-parity experiment |
| V19 | Push-based `WorkspaceDelta` | Deferred | T62 |

### Query & navigation
| # | Idea | Status | Where |
|---|------|--------|-------|
| V20 | `GraphQuery` (patterns/traverse/path/count/collect) | Landed | S1 |
| V21 | Spatial query takes explicit index (D5) | Landed (shape) · `near` in S8 | S1/S8 |
| V22 | `g`-grammar as query macros (9 mnemonics) | Landed | S4 |
| V23 | Reduced 5-mnemonic grammar | Vault | If 9 proves noisy |
| V24 | Search as a query (reuse `navigation/search.ts`) | Landed | S4 |
| V25 | Profiles as saved deriver presets | Landed | S5 |
| V26 | 3-profile simplification | Vault | If 5 confuse |
| V27 | `DomainEmptyState` registry with primary actions | Landed | S5 |
| V28 | Empty-state action table (git init / grammar / tests / token / load full) | Landed | S5 |

### Layout, groups, spatial
| # | Idea | Status | Where |
|---|------|--------|-------|
| V29 | Groups = adapter bands, `data.group` (D7) | Landed | S6 |
| V30 | `LayoutStrategy` interface (kernel-owned, lib-implemented) | Landed | S7 |
| V31 | Continuous layout (`computeIncremental` + interpolation) | Landed | S7 |
| V32 | `SpatialIndex2D` R-tree (THREE-free) | Landed | S8 |
| V33 | Viewport culling via `visibleIn` | Landed | S8 |
| V34 | Force weights from edge data | Landed | S7 |
| V35 | Budget at target positions | Landed | S7 |
| V36 | GPU layouts (WebGL2/WebGPU) | Deferred | T65 |
| V37 | Force layout off by default | Landed (existing policy) | — |
| V38 | Card budget weights per domain | Landed | S8 |
| V39 | Native group shape in renderer contract (v4) | **Vault (new)** | When a renderer needs distinct group styling |

### Host features
| # | Idea | Status | Where |
|---|------|--------|-------|
| V40 | Thin domain derivers | Landed | S3 |
| V41 | File roles (`config`, `doc`, `adr`, `test`) + more roles | Landed (4) · more Vault | S3 |
| V42 | Dependency virtual nodes | Vault | If queries beat the detail list |
| V43 | Dual-source processes (snapshot + tool-output regex) | Snapshot landed · regex Vault | S3 |
| V44 | Issue extraction: messages first, branches/commits opt-in | Landed (messages) | S3 |
| V45 | Test extractors: vitest first, others via registry | Landed (vitest) · rest Vault | S3 |
| V46 | ADR `supersedes` chain | Landed | S3 |
| V47 | Issue checklists as `data.tasks` with turn links | Landed | S3 |
| V48 | Coverage absent ≠ zero | Landed | S3 |
| V49 | Port conflict badge (both cards) | Landed | S3 |
| V50 | PID reuse does not fork a node | Landed | S3 |
| V51 | Equalizer presets (`directories-as-large`, `untouched-dimmer`, `uncovered-larger`) | Landed | S5/S6 |
| V52 | As-of legend + missing display | Landed (T30.3) | — |
| V53 | Filesystem window lazy 20k E2E | Planned | S8 verify |
| V54 | Multi-view split (same kernel, different lenses) | Vault | Post-parity experiment |
| V55 | Review profile via `diffKernels` | Landed | S5 |

### Server / infra
| # | Idea | Status | Where |
|---|------|--------|-------|
| V56 | Snapshot memoization + event invalidation | Planned | server |
| V57 | `Vcs.history` capability (commit/branch SHAs) | Planned | server + protocol |
| V58 | Tree-sitter WASM parser (`origin:"parser"`, `calls`) | Deferred | D27-adjacent |
| V59 | Degradation matrix tests (3 critical rows) | Landed | S2/S9 conformance |
| V60 | CI budgets warn-first, hard-fail at 2× | Landed | S8 |

### A11y & view
| # | Idea | Status | Where |
|---|------|--------|-------|
| V61 | `A11ySupport` config-driven (D4) | Landed | S9 |
| V62 | View state persist + "look at this" links | Landed | S6/S9 |
| V63 | Collaborative cursors / camera follow | Deferred | T67 |

### Extensibility
| # | Idea | Status | Where |
|---|------|--------|-------|
| V64 | Static module registry (`composeRegistry`) | Landed | S1 |
| V65 | Conformance suite for hosts/plugins (opt-in) | Landed | S1/S3 |
| V66 | Plugin packages + marketplace | Deferred | T64 |
| V67 | Framework wrappers consuming kernel directly | Deferred | T68 |

### New vault entries from this rev
| # | Idea | Why deferred |
|---|------|--------------|
| V68 | Per-version kernel snapshots (vs log replay) | Log replay (D2) is enough; snapshots only if replay cost shows |
| V69 | Kernel as CRDT document (full oplog) | LWW merge covers current needs |
| V70 | Query planner / index hints | Query is O(n) per call over a kernel; optimize when a real query is hot |
| V71 | Streaming derivers (incremental output over time) | `computeIncremental` layout is the near-term need |
| V72 | Graph schema validation (typed node data per kind) | Registry types are compile-time; runtime validation when plugins ship |

### Carried deferrals
D16–D22 (multi-session, cursors, time travel UI, AI summaries, plugin kinds, prompt export, 3D) · D23 dependency nodes · D24 containers · D25 comments · D26 tags · D27 go-to-definition (LSP) · D28 cross-session control plane.

---

## 9. Decision log (additions to #48–75)

| # | Decision | Reason |
|---|----------|--------|
| 76 | **Base-first ordering; base = zero-regression kernel-backed system** | Value at day 6.5; every later slice is additive |
| 77 | **Kernel functions take host predicates/config** (D3) | Keeps the substrate vocabulary-free |
| 78 | **Session state is a log fold** (D2) | Time-travel without snapshot storage |
| 79 | **Groups reuse adapter bands** (D7) | No renderer contract churn in base; aligns with existing pipeline |
| 80 | **Query ships topology-only** (D5) | Unblocks navigation before spatial exists |
| 81 | **Dual-path compare is temporary** (P2) | Safety during the port, deleted at parity so it cannot calcify |
| 82 | **No slice ships half-migrated** | Prevents the long tail of two systems |

---

## 10. Immediate next action

**Slice 1, day 1:** scaffold `spacegraphjs/packages/kernel/` — `package.json` (zero deps, exports map, like `@spacegraphjs/renderer`), `src/kernel.ts`, `src/codec.ts`, seeded test generator, property tests for ordering + append-only + round-trip.

**Slice 3 gate (the proof of the whole plan):** both goldens byte-identical, dual-path compare clean on a live session, all existing tests green, `scopeModel` deleted.

---
