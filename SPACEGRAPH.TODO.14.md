# SPACEGRAPH.TODO.14 — No Backwards Compatibility, Ready to Implement (rev 8)

**Status:** rev 8, 2026-10-23. Supersedes TODO.13. **There are no users, so no compatibility layer is built at all.** The old graph core is deleted, not preserved behind a flag. This rev also records verified repository facts (§2) so the plan is executable as written.

Architecture unchanged: domain-agnostic substrate in **SpaceGraphJS** (`@spacegraphjs/kernel`), OpenCode a thin host.

---

## 0. Execution progress

**Last updated:** 2026-10-23. Kernel substrate and the deriver/scope layer are landed; the host rewrite has not started.

### Completed

- [x] **Slice 1 — Kernel substrate** (`spacegraphjs/packages/kernel`)
  - Package: `package.json` (single entry, zero deps), `tsconfig.json`, `README.md`.
  - Core: `kernel.ts` (ordered nodes/edges/hyperedges, `version`, `modify`, `diagnostics`, `subgraph`, `filterNodes`), `session.ts` (append log, memoized fold, `tag`/`checkout`/`fork`), `workspace.ts` (`replaceFrom`, LWW `merge`), `codec.ts` (JSON, `format: 1`, kernel/session/workspace documents).
  - Query/registry: `query.ts` (patterns, traverse, path, count, collect), `registry.ts` (`createRegistry`, `composeRegistry`), `conformance.ts` (`runConformance` + default rules), `generator.ts` (seeded LCG + `randomKernel`), `example/fixture.ts` (orgs → projects → tasks).
  - Tests: laws beside source in `*.test.ts`; `bun test packages/kernel/src` is green.
  - Build: `pnpm --dir spacegraphjs run build:packages` emits `packages/kernel/dist/index.js` + `.d.ts`.
- [x] **Slice 2 — Deriver + scope** (`spacegraphjs/packages/kernel`)
  - `deriver.ts`: typed `inputToken`, `defineDeriver`, `pipe`, `runPipeline`.
  - `scope.ts`: `deriveScope(kernel, keep, pinned)` keeps pinned nodes and drops edges outside the scope.
  - Tests cover pipe composition/order, input dedupe, pipeline application, scope pinning, and internal-edge retention.
- [x] **Registration**
  - Outer `package.json` workspaces includes `spacegraphjs/packages/kernel`; `packages/session-ui/package.json` depends on `@spacegraphjs/kernel`; `bun.lock` carries the workspace entry.
  - Nested repo: `script/build-packages.ts` `PACKAGES`, `test/package-exports.test.ts` `LEAF_PACKAGES`, `test/boundaries.test.ts` dependency-free kernel rule, `package.json` `test:kernel` and `test:full`.
  - `test:exports` and `test:boundaries` are green after the build.

### Remaining

- [ ] **Slice 3 — Rewrite the host** (in progress, 3 days).
  1. [x] Acceptance suite landed: `packages/session-ui/src/graph/acceptance.test.ts`, 21 product behavior tests, green against the current host. This is the rewrite gate.
  2. [x] Host ↔ kernel projection landed in `packages/session-ui/src/graph/view.ts`: `toKernelNode`/`toKernelEdge`, `graphModelToKernel`, `graphViewMeta`, `toGraphView`, and `createGraphViewCache` (memoized by kernel version + identity). Five round-trip/cache tests.
  3. [x] Builder now emits a `Kernel`: `GraphBuilder.buildKernel()`, `buildSessionKernel(input)`, and `buildGraph({ kernel, meta })`; `buildGraph(input)` builds a kernel then projects with `toGraphView`. No `GraphModel` intermediate. Full `src/graph` suite: 207 pass.
  4. [x] Workspace derivation is out of the session builder: `buildSessionKernel` is session-only; `buildWorkspaceKernel` and `workspaceDeriver` compose workspace domains through `runPipeline`. Tests cover session-only vs derived.
  5. [x] Split the composite workspace deriver into 10 thin stage derivers (`files`, `directories`, `packages`, `commits`, `branches`, `symbols`, `hunk-symbols`, `processes`, `ports`, `issues`), composed with `pipe`/`runPipeline`; the session builder is the 11th deriver. Goldens refreshed for the new emission order.
  6. [x] UI wiring: all `buildGraph` call sites now run the kernel pipeline with no signature change. `scope.ts` is deleted; `scopeModel` lives in `view.ts` and is implemented with kernel `deriveScope`.
  7. [x] Extracted the session builder into `session-builder.ts` and workspace stages into `workspace-derivers.ts`; `build.ts` is now orchestration only.
  8. [x] Replaced `model.golden*.json` with `graph.contract.json` (semantic kind/count/invariant contract) and `graph.sample.json` (small decodable kernel sample); `contract.test.ts` enforces both.
  9. [x] Converted `actionsFor` to a per-kind `actionRegistry` of factories.
  10. [ ] Rename `GraphModel` → `GraphView` is deferred: `session-graph/src/ui/GraphView.tsx` already owns the `GraphView` component name and imports the type in the same file. Choose a non-colliding type name (for example `GraphViewData`) or rename the component first.
  11. [x] Kernel gate: `build:packages`, `test:kernel` (47 pass), `session-ui` typecheck, `session-graph` typecheck all green.
- [x] **Slice 4 — Navigation** (search + `g` grammar as query macros).
  - `navigation.ts`: 9 mnemonics, `parseNavigation` (`g f` / `gf`), `navigationTargets`, `navigationResults`, `nextNavigationTarget`, generated `navigationHelp`.
  - `GraphSearch` accepts `initialQuery`, treats `g <key>` as a macro, and renders registry-generated help.
  - `GraphView` maps `g` to opening search with the grammar prefix; selection reuses `jumpTo`.
  - Tests: 5 navigation grammar cases.
- [x] **Slice 5 — Profiles + review** (UI profile presets added atop existing empty states).
  - [x] `diffKernels` in `@spacegraphjs/kernel`: id-based, order-insensitive, stable data-key comparison; 4 tests.
  - [x] `reviewChanges` / `reviewModel` in session-ui using `diffKernels`; review projection keeps changed nodes and adjacent edge endpoints; 3 tests.
  - [x] `PROFILE_PRESETS` / `applyProfile` (all, session, code, review) and a Domains-menu preset row; 4 tests.
  - [x] Empty states already ship for canvas, inspector, file rail, and equalizer.
  - [ ] `SessionKernel.checkpoint()` remains deferred.
- [x] **Slice 6 — Clusters + adaptive** (`deriveZoom` + expansion; adapter bands already grouped turns/phases).
  - [x] Kernel `deriveZoom({ levelOf, rank, level, expansion })`: rank table or function, per-node expansion override; 5 tests.
  - [x] Host `zoomModel(model, level, expansion)` using `minLevel` + `ZOOM_RANK`; 4 tests.
  - [x] Expansion state and turn/phase swimlane bands already exist in the adapter/view; no kernel nodes are used for groups.
- [x] **Slice 7 — Continuous layout**.
  - [x] `LayoutStrategy` vocabulary already existed; `layoutGraph` already consumes `previous` positions and keeps earlier coordinates stable.
  - [x] `computeIncremental` returns `{ layout, added, removed, moved }`; `moved` carries `{ from, to, t }`.
  - [x] `interpolatePosition` and the `t` option provide interpolation for callers that want it.
  - [x] 5 incremental layout tests.
- [x] **Slice 8 — Spatial + scale**.
  - [x] Kernel `SpatialIndex2D`: grid buckets, `near`, `within`, insert/move/remove, limit + distance ordering; 6 tests.
  - [x] `query(kernel, { positions }).near(x, y, radius, limit)` exported as `q.near`; returns `[]` without positions.
  - [x] `applyNodeBudget(model, budget)` with `DEFAULT_BUDGET` weights; adapter-owned `byProximity`/`sessionOrder` retained; 4 tests.
- [ ] **Slice 9 — A11y + export**.

### Current gate

- Kernel: `pnpm --dir spacegraphjs run build:packages` then `bun test packages/kernel/src` (or `pnpm --dir spacegraphjs run test:kernel`).
- Host: after Slice 3, `bun run check` from the OpenCode root plus the acceptance suite.
- Do not add a compatibility flag, dual path, or `GraphModel` shim (§1, §8 #17–#18).

---

## 1. What "no backwards compatibility" removes

| Removed | Why it existed | Replacement |
|---------|----------------|-------------|
| `OPENCODE_GRAPH=legacy\|kernel\|compare` flag | Safe incremental switch | Direct rewrite in one landing; git revert is the fallback |
| Dual-path semantic compare | Prove the port preserved behavior | **Acceptance suite written first** (§4) |
| Byte-identical golden gate | Prove port equivalence | Deleted. Normalized fixtures are self-generated intent snapshots |
| `buildGraph` signature preservation as a goal | Avoid touching call sites | All 5 call sites updated in the same change |
| `GraphModel` compatibility view | Keep 283 tests untouched | Renamed `GraphView`, shape free to change; tests retargeted |
| `scopeModel` wrapper | Shrink the diff | Call `deriveScope` directly |
| Kernel contract negotiation (`D16`) | External adapter versioning | Codec header carries a format version only |
| Binary codec | Compact files | JSON only; binary is vault V87 |
| `@spacegraphjs/kernel/conformance` subpath | Light main import | Single entry; `runConformance` is a named export (keeps `package-exports.test.ts` shape intact) |
| `diffKernels` in base | Prove diff early | Lands with the review profile (S5) |

**What is *not* removed: logic reuse.** The message loop, phase clustering, symbol extraction, and every `attachX` body are *copied into* derivers. Reuse the code, discard the API shape.

Net: base drops from 7.5 to **6 days**.

---

## 2. Verified repository facts (these were wrong or missing in TODO.13)

| Fact | Consequence |
|------|-------------|
| `spacegraphjs/` is a **separate git repo** (own `.git`, branch `main`, pnpm, prettier + eslint, root `vitest run`), not a submodule of OpenCode | Kernel work is its own commit/PR stream. Style is the nested repo's: 2-space, single quotes, semicolons, prettier-checked |
| Outer `package.json` `workspaces.packages` lists spacegraphjs packages **explicitly** (`spacegraphjs/packages/renderer`, `…/adapter`, `…/spacegraph-renderer`, `…/cytoscape-renderer`, `…/svg-renderer`) | Must add `"spacegraphjs/packages/kernel"` |
| `spacegraphjs/script/build-packages.ts` has a **hardcoded** `PACKAGES = ['renderer','adapter','spacegraph-renderer','cytoscape-renderer','svg-renderer']`; builds ESM + `.d.ts` to each package's `dist/` via Vite + vite-plugin-dts | Must add `'kernel'`. `dist` is gitignored, so `pnpm run build:packages` must run before OpenCode typechecks/tests resolve `@spacegraphjs/kernel` |
| `spacegraphjs/test/package-exports.test.ts` has a hardcoded `LEAF_PACKAGES` list asserting exports are exactly `{ types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' }` | Must add `'kernel'`; keep the package single-entry (no `./conformance` subpath) to satisfy it |
| `spacegraphjs/test/boundaries.test.ts` enforces "the contract is dependency-free" by rejecting any non-relative import in `packages/renderer/src` | Add the same rule for `packages/kernel/src` — a mechanical guard for stop rule #11 |
| Root `vitest.config.ts` `include: ['test/**/*.test.ts', 'packages/*/test/**/*.test.ts']` — it **does not** collect `packages/*/src/*.test.ts`; `packages/renderer/src/index.test.ts` uses `bun:test` and is run by that package's own `bun test` | Kernel tests live beside source and use `bun:test` (renderer precedent). Add `"test:kernel": "bun test packages/kernel/src"` to the nested repo, called from `test:full` |
| Sibling packages mix runners (renderer: `bun test`; adapter: `vitest run`) | Choosing `bun test` is consistent with the closest sibling and adds no config |
| `fast-check` is in the **outer** catalog; the nested repo does not use it | Kernel tests stay dependency-free: seeded LCG generator in `test/support` |
| OpenCode packages consume `@spacegraphjs/*` through the bun workspace → package `exports` → `dist` | Add `"@spacegraphjs/kernel": "workspace:*"` to `packages/session-ui/package.json` |

**Workflow gate:** after any kernel change, run `pnpm --dir spacegraphjs run build:packages` before `bun run typecheck` / `bun test` in OpenCode.

---

## 3. Slices (base = 6 days)

| Slice | Days | Where | Delivers |
|-------|------|-------|----------|
| **1. Kernel substrate** | 2.5 | `spacegraphjs/packages/kernel` | `Kernel` (ordered nodes/edges/hyperedges, `version`, `modify(b=>…)`, `diagnostics`), `SessionKernel` (append log, memoized fold, tag/checkout/fork, checkpoint seam), `WorkspaceKernel` (replaceFrom + LWW merge), `KernelCodec` (JSON, versioned header), `GraphQuery` (patterns/traverse/path/count/collect), `Registry` types, `runConformance`, seeded generator, orgs→tasks example fixture |
| **2. Deriver + scope** | 0.5 | kernel | `Deriver` (typed input tokens), `pipe`, `runPipeline(derivers, kernel, inputs)`, `deriveScope(keep, pinned)` |
| **3. Rewrite the host** | 3 | OpenCode | Acceptance suite first (§4); `buildSessionKernel`; 11 thin derivers; `toGraphView` (memoized by version); `buildGraph({ kernel? })`; UI wiring; **delete the old core** (§5); regenerate fixtures |
| **4. Navigation** | 2 | session-graph | search + `g`-grammar as query macros; registry-generated help |
| **5. Profiles + review** | 1.5 | session-graph + kernel | profile presets; empty states with primary actions; `diffKernels` + review profile |
| **6. Clusters + adaptive** | 3 | adapter + host + kernel | `ClusterSpec` → group bands; expansion state; `deriveZoom(levelOf, expansion)` per-node override; progressive detail on zoom |
| **7. Continuous layout** | 2 | kernel iface + main lib | `LayoutStrategy`; `computeIncremental`; interpolation behind a flag |
| **8. Spatial + scale** | 1.5 | kernel + host | `SpatialIndex2D`; adapter-owned visibility; `q.near`; budget weights |
| **9. A11y + export** | 2 | kernel + host | `A11ySupport`; host wiring; JSON export |

**Base = Slices 1–3 = 6 days.** `deriveZoom` is deliberately *not* in base: the adapter already filters by level (`ModelAdapter`), and moving that now would double-filter. It arrives in Slice 6 where per-node overrides actually matter.

---

## 4. The acceptance suite replaces the parity gate

Written **before** the rewrite, in the new shape, red first. Each row is one behavior test. They live in `packages/session-ui/src/graph/acceptance.test.ts` and describe the product, not the implementation.

### Session behaviors (must survive)
1. Each message opener creates one turn; steered prompts share the opener's turn.
2. Consecutive children of a turn get `sequence` edges in order.
3. Consecutive phase-eligible children of one category cluster into one `phase` node; a category change starts a new cluster.
4. Subagent tools produce `subagent` nodes; a synthetic completion links `delegates`.
5. Shell/tool results produce `result` nodes with `produces`; failures are `failed`; retries link `evidence` to the prior failure.
6. Assistant errors produce `error` nodes; an abort reads `interrupted`, not `failed`.
7. Compaction produces a `compaction` node with `compacts` → previous turn; `replayed` reflects a native window.
8. An idle with changed files produces one `diff` node listing them, `produces` each file.
9. `read`/`edit`/`write`/`patch`/search produce `reads`/`writes`/`searches` edges to files.
10. The active turn is flagged while the session is not idle; the goal is the first user text.

### Workspace behaviors (must survive)
11. Directories derive from the union of touched and snapshot files; every file is `part-of` its parent; directory counts carry total + touched.
12. Packages derive from snapshot with distinct `pkg:<path>` ids and `dependencies`/`devDependencies` data.
13. Commits derive from snapshot (+ base), `touches` files; branches `points-at` commits; the current branch is marked.
14. Symbols derive from snapshot and from hunk patches, dedupe by id, carry `origin` and `deleted` where applicable.
15. Processes/ports derive with `listens-on`; a shared port is visible on both cards; PID reuse does not fork a node.
16. Issues derive with provider/repo/number ids; file roles mark `config`/`doc`.
17. Every derived node carries `provenance`; the model carries `revision`, `asOf`, `missing`.

### Host behaviors (must survive)
18. The domain lens drops non-session domains and never drops session.
19. Without a snapshot the graph is the session-only graph and every derived domain is absent (not empty-but-present).
20. Level filtering shows the same nodes as today for overview/execution/detail.
21. Toolbar domains menu, inspector fields, detail actions, filesystem window, equalizer presets, and search keep working.

**Retired:** byte-identical model fixtures, exact node counts, `GraphModel` field-by-field snapshots.

Fixtures after the rewrite: `graph.contract.json` (per-kind id sets + edge triples, sorted) and `graph.sample.json` (3–5 nodes per kind), both generated by `UPDATE_GOLDEN=1`.

---

## 5. Delete list (part of Slice 3)

| Path / symbol | Fate |
|---------------|------|
| `session-ui/src/graph/build.ts` — `GraphBuilder`, `attachWorkspace`, `attachPackages/Commits/Branches/Symbols/Processes/Issues`, `attachHunkSymbols`, `symbolsFromHunk` | Split: `session-builder.ts` (session + builder), `workspace-derivers.ts` (stage derivers), `build.ts` (orchestration) |
| `session-ui/src/graph/scope.ts` — `scopeModel` | Deleted; `scopeModel` now lives in `view.ts` and delegates to kernel `deriveScope` |
| `session-ui/src/graph/actions.ts` — `actionsFor` switch | Becomes registry contributions |
| `session-ui/src/graph/model.golden.json`, `model.golden.with-snapshot.json` | Deleted; replaced by contract + sample fixtures |
| `session-ui/src/graph/model.ts` — `GraphModel` | Renamed `GraphView` (host projection over kernel `Node`/`Edge`); `GraphNode = Node & { kind: NodeKind }` |
| `fixture.ts` — `buildFixtureGraph*` helpers | Kept, rebuilt on the new pipeline |

Nothing is kept "just in case." If a function is needed, it is copied into its deriver.

---

## 6. Readiness checklist

- [x] Architecture: two kernels, derivers, query, groups-as-bands, static registry — settled (§1, TODO.12 §2)
- [x] Ownership split: substrate in SpaceGraphJS, vocabulary in OpenCode — settled, guarded by the orgs→tasks fixture and the boundaries test
- [x] Repository facts: nested repo, workspace registration, build script list, exports/boundaries tests, test runner, `dist` resolution — **verified** (§2)
- [x] Exact registration edits named (4 files) (§2)
- [x] Test strategy: laws + contracts default; normalized fixtures; no byte gate; no timing/pixel gate (§4)
- [x] Base scope: Slices 1–3, 6 days, no flag, no dual path (§3)
- [x] Acceptance suite enumerated (21 rows) as the port's definition of done (§4)
- [x] Delete list enumerated (§5)
- [x] Removed-for-agility items recorded with their replacement (§1)
- [x] Open questions resolved: test runner, package entry shape, codec format, error model, style, determinism, where snapshot types live (host, not kernel)

**Deliberately out of base:** `deriveZoom` (S6), `diffKernels` (S5), runs/search/grammar (S4), clusters (S6), continuous (S7), spatial (S8), a11y (S9), real-time (S10), snapshot memoization, `Vcs.history`, parser WASM.

---

## 7. Open questions — resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | Test runner for the kernel | `bun test`, tests beside source, matching `@spacegraphjs/renderer`; root vitest does not collect `src` tests |
| 2 | Subpath exports (`./conformance`)? | No — single entry; `runConformance` is a named export; keeps `package-exports.test.ts` unchanged in shape |
| 3 | Binary codec? | No — JSON only with a versioned header; binary is V87 |
| 4 | Kernel contract negotiation? | No — no external adapters yet; codec format version only |
| 5 | Kernel opinions on dangling edges/duplicates? | Neither: they are counted in `diagnostics`; host conformance asserts zero |
| 6 | Where do `WorkspaceSnapshot` types live? | OpenCode protocol (host concept); the kernel never imports them |
| 7 | Style in the kernel package | The nested repo's prettier/eslint: 2-space, single quotes, semicolons |
| 8 | Determinism | No clock, no randomness, no network in kernel; fixtures fixed; seeded generator for properties |
| 9 | How does OpenCode resolve kernel changes? | `pnpm --dir spacegraphjs run build:packages` then workspace dep resolves `dist` + `.d.ts` |
| 10 | Can the UI call `buildGraph` per render? | No: host builds the kernel once per session version, `toGraphView` memoizes by version, and `buildGraph({ kernel })` is the entry |

---

## 8. Stop rules (delta)

Carried from TODO.13 §6, amended:
- **#17 (new):** never add a compatibility shim, alias, or flag for a path with no users. Delete and replace.
- **#18 (new):** the acceptance suite (§4) is the only definition of "we did not lose the product." Byte equality is not evidence.
- **#19 (new):** kernel changes require `build:packages` before OpenCode checks; a PR that skips it is incomplete.
- **#20 (new):** `@spacegraphjs/kernel` imports nothing but its own relative modules (enforced by the boundaries test).

---

## 9. Idea vault — additions (carried: TODO.12 §8 V1–V72, TODO.13 V73–V85, D16–D28)

| # | Idea | Status | Why not now |
|---|------|--------|-------------|
| **V86** | Rollout flag / dual-path compare | **Rejected** | No users; git revert is the fallback. Recorded so it is not re-proposed |
| **V87** | Binary kernel codec | Vault | JSON is enough; binary pins a format we would still be designing |
| **V88** | Kernel contract negotiation | Vault | Zero external adapters; add with the first one |
| **V89** | `./conformance` subpath export | Vault | Single entry keeps the exports test stable |
| **V90** | `fast-check` property testing | Vault | Seeded generator keeps the package dependency-free |
| **V91** | `GraphModel` compatibility view | **Rejected** | Rename to `GraphView`; tests retargeted |
| **V92** | `diffKernels` in base | Deferred to S5 | Nothing consumes it before review |
| **V93** | `SessionKernel.checkpoint()` (carried V79) | Planned S5 | Only the time-travel scrubber needs it |
| **V94** | Snapshot memoization + `Vcs.history` | Planned (server) | Not needed by base; carried from TODO.5 T29.2 |

---

## 10. Day 1 (Slice 1)

In `spacegraphjs/` (nested repo, `main`):

1. `packages/kernel/package.json` — zero deps; exports exactly `{ types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' }`; scripts `typecheck: tsc --noEmit`, `test: bun test`.
2. `packages/kernel/tsconfig.json` — copy `packages/renderer/tsconfig.json` (strict, bundler, `noEmit`).
3. `packages/kernel/src/kernel.ts` — ordered `nodes`/`edges`/`hyperedges`, `version`, `modify`, `diagnostics`, `subgraph`, `filterNodes`.
4. `packages/kernel/src/session.ts` — append log, memoized fold, `tag`/`checkout`/`fork`.
5. `packages/kernel/src/workspace.ts` — `replaceFrom`, `merge` (LWW).
6. `packages/kernel/src/codec.ts` — JSON, header `{ format: 1 }`.
7. `packages/kernel/src/index.ts` — single entry.
8. `packages/kernel/src/kernel.test.ts`, `session.test.ts`, `codec.test.ts` — `bun:test`; laws only.
9. `packages/kernel/src/example/fixture.ts` — orgs → projects → tasks (vocabulary-leak guard).
10. Register: outer `package.json` workspaces, `script/build-packages.ts` `PACKAGES`, `test/package-exports.test.ts` `LEAF_PACKAGES`, `test/boundaries.test.ts` kernel rule; `test:kernel` script.
11. `pnpm run build:packages` → confirm `packages/kernel/dist/index.js` + `.d.ts`.

---
