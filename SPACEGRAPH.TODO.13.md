# SPACEGRAPH.TODO.13 — Agility-First Gates (rev 7)

**Status:** rev 7, 2026-10-23. Supersedes TODO.12 (kept as history). Architecture unchanged: **domain-agnostic substrate in SpaceGraphJS (`@spacegraphjs/kernel`), OpenCode a thin host**. This rev relaxes the testing gates for development agility, splits the risky parity port into three landings behind a runtime flag, and adds 10 design changes that remove real performance and adoption risks. The idea vault is carried from TODO.12 §8 with new entries appended.

---

## 1. The gate problem

TODO.12's Slice 3 gate was "both goldens byte-identical." That is the correct *release* proof and the wrong *development* gate: it breaks on key order, on an added optional field, on a sorted-array tie, on a message-id change — none of which indicate the port is wrong. It would tax every commit for six days and teach us to regenerate goldens reflexively, which destroys their value.

Gates are now tiered. **Default development gate = contracts + normalized semantic goldens.** Byte-identical is opt-in, used on three specific days (port start, port end, release candidate). Perf and visual checks never run in the default test command.

---

## 2. Testing: three tiers

| Tier | What | When | Failure means |
|------|------|------|---------------|
| **1. Contracts / laws** | Invariants: ordering preserved, no node duplicate, append-only, version monotonic, codec round-trip, pipe law, scope keeps pinned, zoom override wins, no edge without both endpoints (host conformance), no derived node without provenance (host conformance) | Every `bun test` | A real defect. Never regenerate, always fix. |
| **2. Normalized semantic goldens** | Split fixtures (below), compared after normalization | Every `bun test` | Intentional-or-not behavior change; message names the kind and the added/removed ids |
| **3. Strict byte parity** | Full serialized model, byte-for-byte | `GRAPH_PARITY=strict` — port start/end, release candidate only | Cosmetic drift; inspect, then either fix or accept |

### Normalized semantic goldens (replaces one blob with two readable files)

```
packages/session-ui/src/graph/model.contract.json
  { nodesByKind: { <kind>: [ids sorted] },
    edgeTriples: ["<kind>|<source>|<target>", …sorted],
    turns: [ids], activeTurn, root, workspaceRoot, goal,
    turnByMessageID: [[msgId, turnId] …sorted] }

packages/session-ui/src/graph/model.sample.json
  { <kind>: [ 3–5 representative full nodes, stable choice ] }
```

- Normalization: sort by id, drop `undefined`, no timestamps in fixtures, stable Map→array.
- `UPDATE_GOLDEN=1 bun test src/graph/workspace.test.ts` rewrites both.
- Failure output is a per-kind delta (`directory: +2 −0`, `symbol: +0 −3`), never a 4000-line JSON dump.
- `model.sample.json` catches field-level regressions without pinning every node.

### What no longer fails a default run

- Timings (`graph:scale`) — separate script; CI perf job only; warn always, hard-fail at 2×.
- Visual capture — diff-scoped and reviewed; `--mode=update` is one command.
- Golden byte formatting.

### Still forbidden

Per-deriver snapshots · render-tree snapshots · pixel diffs · exact node counts outside the contract fixture · tests duplicating implementation logic · cross-file test ordering · asserting on `GraphModel` internals rather than its contract.

### The rule that keeps this honest

> A test that pins a value a developer would reasonably change is a bug in the test. If updating it costs more than the change it guards, replace it with a law or a contract.

---

## 3. Design changes (D11–D21)

| # | Change | Why it matters |
|---|--------|----------------|
| **D11** | **State is fold-on-demand; edits go through one pass.** `SessionKernel.append(entry)` is O(1) (push to log, bump version, invalidate memo). `state()` folds the log once, memoized by version. Derivers edit via `kernel.modify(b => …)` — one O(n) pass, not O(n) per add. | A naive `addNode` returning `{...k, nodes:[...nodes, n]}` is O(n) per call → O(n²) for a session build. This removes a real quadratic. |
| **D12** | **`GraphModel` view is memoized by kernel version.** `toGraphModel(kernel)` returns the same object while `kernel.version` is unchanged. | Selectors and Solid memos stop re-walking the graph on every render. |
| **D13** | **`buildGraph` accepts a prebuilt kernel** (`input.kernel?`), falling back to building one from messages. | Hosts build once, render many; enables streaming (D14). |
| **D14** | **Streaming session state.** The host keeps a `SessionKernel` and appends new messages as they arrive instead of rebuilding from the full message array. | Turns every streaming update from O(session) into O(new messages); D11 makes it possible. |
| **D15** | **Diagnostics, not silent drops.** Kernel records `{ duplicates, danglingEdges }` in `kernel.diagnostics`; it does not reject. The host's conformance asserts both are empty at parity. | Silent `if (id exists) return` hides bugs; a counter makes them visible and keeps the kernel non-opinionated (D4). |
| **D16** | **Kernel contract version is negotiated** (`KERNEL_CONTRACT_VERSION`, `negotiateKernelContract`) mirroring the renderer. | Dependents get a clear failure instead of a shape mismatch. |
| **D17** | **Deriver inputs are typed tokens**, not bare strings. | Compile-time dependency edges; no typo'd invalidation later. |
| **D18** | **The kernel package ships a domain-neutral example fixture** (e.g. orgs → projects → tasks) used by its own tests and `examples/`. | Guards stop rule #1: if kernel code ever needs an OpenCode word, this fixture breaks. Also the adoption starting point. |
| **D19** | **`diffKernels` is order-insensitive and id-based** (set comparison, not array comparison). | Diffs must not depend on insertion order. |
| **D20** | **The adapter owns visibility.** Visible-set computation happens in the adapter (`visibleIn` when spatial lands); renderers stay dumb. | One place for culling; renderers remain interchangeable. |
| **D21** | **`SessionKernel.checkpoint()`** — fold the log to a state snapshot every N entries, memoized. | A time-travel scrubber (T63) replays per frame; without checkpoints it is O(entries) per frame. Prevents a known wall. |

### Package ergonomics (cheap, high leverage for dependents)

- `@spacegraphjs/kernel/conformance` subpath export (types + runner, no runtime weight in the main import).
- `spacegraphjs/packages/kernel/examples/` — 40-line build → serialize → diff → query walkthrough.
- `spacegraphjs/packages/kernel/bench/` — the package owns its own perf harness.

---

## 4. Development path: flag-first landings (P8–P15)

| # | Change | Effect |
|---|--------|--------|
| **P8** | **Runtime flag in the host**: `OPENCODE_GRAPH=legacy` (default) · `kernel` · `compare`. | Kernel work lands incrementally without switching behavior; users can dogfood before the flip. |
| **P9** | `compare` builds both paths, compares **normalized** models, serves legacy, logs a per-kind divergence summary. Sampled (every Nth build or on demand), not every render. | Catches real-session divergence without doubling every build. |
| **P10** | **Split the parity port into three landings**: **3a** session kernel + `toGraphModel` + view memo (flag off, contracts + contracts fixtures green); **3b** domain derivers one domain at a time (flag off, per-kind contract deltas green); **3c** flip default to `kernel`, delete the `scopeModel` wrapper and the legacy builder. | No big bang; each landing is reviewable and revertible on its own. |
| **P11** | **Base is defined by "the flag can flip,"** verified by: contracts green · normalized goldens green · `compare` clean on three real sessions · visual capture unchanged · strict parity clean once. | Objective, non-brittle definition of done. |
| **P12** | **Legacy deletion is a tracked task** (T54c), scheduled one soak week after the flip. | Prevents two systems living forever. |
| **P13** | Streaming append lands *after* the flip as an internal optimization (D14) — not part of base. | Keeps base small; the improvement is invisible to users. |
| **P14** | **Per-kind parity report is the landing checklist** for 3b: `directories ✓ packages ✓ commits ✓ …`. | Makes a partial port a dashboard, not an opaque diff. |
| **P15** | Every slice ends with the flag in a valid state (`legacy`, `kernel`, or `compare`); never both half-wired. | Stop rule #12 becomes mechanically checkable. |

---

## 5. Revised slices

| Slice | Days | Package | Delivers | Gate |
|-------|------|---------|----------|------|
| **1. Kernel substrate** | 3 | `@spacegraphjs/kernel` | T34–T38, T40a, T41 types; D11 fold/modify, D15 diagnostics, D16 contract version, D18 example fixture, D19 diff; conformance subpath, examples, bench | Tier-1 laws + codec round-trip; publishable |
| **2. Deriver + lens** | 1 | kernel | T39 `Deriver`+`pipe` (typed inputs, D17), T45 `deriveScope(keep)`, T46 `deriveZoom({levelOf,…})` | Laws: pipe, scope, zoom |
| **3a. Session port** | 1.5 | session-ui | T52 `buildSessionKernel`; `toGraphModel` (D6) + version memo (D12); `buildGraph({kernel})` (D13); flag scaffold (P8) | Contracts + contract-fixture parity for session kinds; `compare` session-only clean |
| **3b. Domain derivers** | 1.5 | session-ui | T53 derivers domain by domain; T55 DiffProvider; actions → registry (D8) | Per-kind checklist green (P14); `compare` clean on 3 real sessions |
| **3c. Flip + delete** | 0.5 | session-ui | Flip default to `kernel` (P10); delete `scopeModel` wrapper; strict parity once (Tier 3) | **BASE COMPLETE**; strict parity clean; visual unchanged |
| **4. Navigation** | 2 | session-graph | T56 search + `g`-grammar as query macros; registry-generated help | Mnemonics + mixed-domain results |
| **5. Profiles + review** | 1.5 | session-graph | T57 profiles/presets; T27.3 empty states; T59 review via `diffKernels` | E2E |
| **6. Clusters + adaptive** | 3 | adapter + host | T47 `ClusterSpec` → bands (D7); expansion state; T33.1–3 | Visual compare; persists reload |
| **7. Continuous layout** | 2 | kernel iface + main lib | T49 `LayoutStrategy`; T50 `computeIncremental` + interpolation behind flag | Visual compare; >50ms stays flagged |
| **8. Spatial + scale** | 1.5 | kernel + host | T44 `SpatialIndex2D`; adapter-owned visibility (D20); `q.near`; budget weights | Bench 10k culled |
| **9. A11y + export** | 2 | kernel + host | T42 `A11ySupport`; T60 host wiring; T61 JSON export | Every kind announced; export round-trips |
| **10. Real-time** | post | kernel | T62 `WorkspaceKernel.merge(delta)` + deriver re-run | Converges; no full rebuild |

**Base = 1 + 2 + 3a + 3b + 3c = 7.5 days** (the extra day is the flag scaffold and three clean landings; it buys revertibility and dogfooding).

---

## 6. Stop rules (delta)

Carried from TODO.12 §7, with these amendments:

- **#11 (restated):** a test that pins a value a developer would reasonably change is a bug in the test.
- **#13 (new):** never gate a default `bun test` run on timing, pixels, or byte formatting.
- **#14 (new):** `compare` mode must compare normalized models — byte comparison in `compare` is forbidden (it produces noise, not signal).
- **#15 (new):** the flag must always name a valid path; "both half-wired" is a failed landing, not a WIP state.
- **#16 (new):** kernel edits go through one pass (`modify`); per-add array copies are forbidden.

---

## 7. Idea vault — additions (carried: TODO.12 §8, V1–V72 + D16–D28)

| # | Idea | Status | Why |
|---|------|--------|-----|
| **V73** | Fold-on-demand session state + `modify` single pass (D11) | Landed | Removes an O(n²) |
| **V74** | Version-memoized `GraphModel` view (D12) | Landed | Stops per-render re-walks |
| **V75** | Streaming session append (D14) | Deferred to post-flip (P13) | Invisible optimization; keeps base small |
| **V76** | Kernel diagnostics counter (D15) | Landed | Turns silent drops into a metric |
| **V77** | Kernel contract version negotiation (D16) | Landed | Clear failure for dependents |
| **V78** | Domain-neutral example fixture (D18) | Landed | Guards vocabulary leakage; adoption seed |
| **V79** | `SessionKernel.checkpoint()` (D21) | Planned (T63) | Prevents O(entries) scrubber |
| **V80** | Query result memoization keyed by (version, queryKey) | Vault | Only when a real query is hot |
| **V81** | Structural sharing / persistent vectors for kernel state | Vault | Fold-on-demand is enough until profiling says otherwise |
| **V82** | Per-domain migration flags (instead of one host flag) | Vault | One flag covers current risk; more only if landings collide |
| **V83** | Golden fixtures as kernel JSON files (P3 carried) | Planned (3b) | Deriver tests become kernel→kernel |
| **V84** | `visibleIn` in adapter rather than renderer (D20) | Planned (S8) | One culling site |
| **V85** | Runtime graph schema validation per kind | Vault (carried V72) | With plugins |

Status changes carried from TODO.12: V14 (build-graph invalidation) remains deferred to real-time; V17 (lens-aware build), V18 (two-level lens), V54 (multi-view), V26 (3-profile) remain vault; V39 (native group shape) remains vault.

---

## 8. Decision log (additions to #48–82)

| # | Decision | Reason |
|---|----------|--------|
| 83 | **Default gate = contracts + normalized goldens; byte parity is opt-in** | Byte equality taxes every commit and teaches reflexive regeneration |
| 84 | **Goldens split into `contract.json` (ids/triples) + `sample.json` (representative nodes)** | Readable, reviewable, per-kind failure messages |
| 85 | **Timing and pixels never gate a default test run** | The two classic flake sources |
| 86 | **Parity lands behind `OPENCODE_GRAPH=legacy\|kernel\|compare`, flipped in 3c** | Decouples landing from switching; enables dogfooding and revert |
| 87 | **Base is proved by "the flag can flip," not by a diff blob** | Objective, robust definition of done |
| 88 | **Session state is a memoized fold; edits are one pass** | Correctness of D2 plus linear build time |
| 89 | **Diagnostics are counted, conformance asserts zero** | Kernel stays non-opinionated; host enforces its own invariants |

---

## 9. Immediate next action

**Slice 1, day 1:** scaffold `spacegraphjs/packages/kernel/` (zero deps, exports map incl. `./conformance`, `./examples`; mirroring `@spacegraphjs/renderer`):

1. `src/kernel.ts` — `Kernel` with fold-on-demand state, `modify(b => …)`, `diagnostics`, ordered `nodes`/`edges`/`hyperedges`, `version`.
2. `src/codec.ts` — header with format + kernel-contract versions.
3. `test/support/generator.ts` — seeded LCG; no dependency.
4. `test/kernel.test.ts` — ordering, append-only, monotonic version, no per-add copy (timing-free: assert one pass via a counting proxy), duplicate diagnostics.
5. `examples/orgs-to-tasks.ts` + its fixture (D18).

---
