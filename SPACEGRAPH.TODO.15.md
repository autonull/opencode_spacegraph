# SPACEGRAPH.TODO.15 — Unified Session Lens: Live, Animated, Multi-Layer (draft 2)

**Status:** draft 2, 2026-10-23. Builds on TODO.14 rev 10 (Slices 1–9 shipped, demo UI simplified, capture matrix regenerated). **Nothing here is implemented yet** — this is the executable proposal. Draft 2 replaces draft 1's delta/merge/controller machinery with one pipeline that live updates, layer switches, and time scrubbing all drive; it also corrects draft 1's transcript-as-lens error against the mission constraint.

Architecture direction unchanged: the mechanism lands in **SpaceGraphJS** (domain-agnostic substrate, own repo and test suite), OpenCode stays a thin host that consumes finished APIs.

---

## 1. The design in one paragraph

**One pipeline, three drivers.** Everything the reader sees change — a live workspace revision, a zoom/lens/depth switch, a scrub across turn boundaries — is the same operation: *derive the next view state, diff it against the current one (`diffKernels`), feed the diff to incremental layout (`added` / `removed` / `moved`), and interpolate `moved` by an explicit clock `t`.* Live updates, fluid layers, and the scrubber are not three features with three mechanisms; they are three drivers of one mechanism that mostly already exists. The plan's job is to finish that pipeline in the substrate, keep it deterministic, and point the host's controls at it.

Stated measurably:

1. **Complete representation.** The graph holds every domain of the session; every layer change is a re-derivation, never a rebuild.
2. **Live, not rebuilt.** Changed inputs re-run only the derivers that declared them; a partial re-run equals a full re-run (TODO.14's S10 criterion, by construction).
3. **Animated, not teleported.** Nodes carry `moved: { id, from, to }` between view states; `t` is a clock argument, never stored in the model; stable IDs keep their positions; appends never re-layout existing nodes.
4. **One layers affordance.** Level, lens, and depth are three parameters written by one control; layer switches animate through the same pipeline as live updates.
5. **Surfaces, not modes.** The panel composes the transcript and the map as independent surfaces; the mode concept dies at the control level. **The transcript never becomes a projection of the graph** — mission constraint: it must keep working if the graph fails to load.
6. **Fluidity is proven by invariants.** No pixel diffs, no timing gates, no sleeps.

---

## 2. What draft 2 deleted, and why the result does more

| Draft 1 machinery | Draft 2 replacement | Why it is more capability for less work |
|------------------|---------------------|------------------------------------------|
| `WorkspaceDelta` + `diffSnapshots` + `mergeDelta` (3 new types) | `diffKernels` (already shipped in S5, already tested) | The diff *is* the delta. Convergence becomes structural: derivers are pure functions of (kernel, inputs), so re-running affected derivers on the new state equals re-running all — the only law to prove is memo soundness. LWW `merge` stays as-is for a future multi-writer story (vault V101). |
| `DeriverGraph` input→output bookkeeping | Per-deriver memoization in `runPipeline`, keyed by the typed `inputToken` versions it already declares | The invalidation set is not a separate graph — it is *which token versions changed*. Unchanged token ⇒ cache hit ⇒ "untouched derivers do not re-run" holds by construction and is testable with a counter. Reuses the typed tokens the substrate already has. |
| `LayersController` (stateful, ordered named layers) | Composition of the pure functions that already exist: `deriveZoom(deriveScope(kernel, keep), …)` | Layers were never three mechanisms; a controller re-states the parameters as state. A layer switch is just another re-derivation → diff → incremental → animate. Zero new substrate surface. |
| `moved: { from, to, t }` (time stored in data) | `moved: { id, from, to }`; `t` passed to `interpolatePosition(from, to, t)` | The model stays time-independent (pure, no effects); endpoints are exact at `t=0/1`; tests need no clock at all. |
| Transcript as a *lens of the kernel* (draft 1 §1.5) | Transcript as an independent surface beside the map | Draft 1 violated the mission constraint. Modes still die — the panel composes surfaces and one layers rail drives the map — but the transcript never depends on graph code. |

Net: draft 1 base was 5.5 days with three new concepts; draft 2 base is **4 days** with **zero new stateful concepts** — one memo, one composition, one moved-record simplification — and it gains a feature draft 1 did not have: layer switches and scrubbing animate through the same path as live updates.

---

## 3. Verified SpaceGraphJS facts (demo/test side)

| Fact | Consequence |
|------|-------------|
| Root `spacegraphjs/package.json` has many subpath exports (`./core`, `./nodes`, `./plugins`, `./a11y`, …); the single-entry rule from TODO.14 §2 was **kernel-specific**, not repo law | New substrate modules may become subpaths when they have independent consumers; the kernel stays single-entry so `package-exports.test.ts` keeps its shape |
| `vitest.config.ts` collects `test/**/*.test.ts` + `packages/*/test/**/*.test.ts`; aliases map `spacegraphjs/*` → `src/*` and four renderer packages, but **not** `@spacegraphjs/kernel` | Kernel tests stay `bun test` beside source; new `src` modules get vitest tests in `test/` with no config change |
| `playwright.config.ts`: `testDir ./test`, `*.spec.ts`, video → `recordings/` | Substrate e2e specs join `test/` (`vision.spec.ts`, `interaction.spec.ts` precedent) |
| `playwright.demo.config.ts`: `testDir ./test/e2e`, webServer `vite --config vite.demo.config.ts` port 5173 (`SG_DEMO_PORT`) | Demo-driven specs run under this config |
| `test/e2e/demo-screenshots.spec.ts` auto-discovers every `demo/*.html` and writes `spacegraphjs/screenshots/<demo>.png` | **Substrate screenshots are generated here**, not in the OpenCode app matrix; a feature ships as a demo page and is documented automatically |
| The existing demo specs use `waitForTimeout` to settle; the new specs must **not** inherit it | New demo specs assert through the deterministic clock (`advance(t)`) and content checks; the sleeps are pre-existing cleanup, vaulted (V102) |
| SpaceGraphJS `src` already has `layout`, `levels`, `zoom`, `a11y` modules as substrate precedent | Incremental layout joins `src/layout`; the host keeps only vocabulary |
| `computeIncremental` / `interpolatePosition` live in OpenCode (`packages/session-ui/src/graph/layout.ts`) though they are domain-agnostic | S2 moves them; call sites migrate in the same change and the re-export shim is deleted (stop rule #17) |

**Workflow gate (carried from TODO.14):** after any kernel change, `pnpm --dir spacegraphjs run build:packages` before OpenCode typecheck/tests.

---

## 4. Slices (est. 8 days total; base = 4 days, all SpaceGraphJS)

| Slice | Days | Where | Delivers |
|-------|------|-------|----------|
| **S1 — Deriver memoization** | 1.5 | kernel | `runPipeline` memoizes each deriver's output by the versions of the `inputToken`s it declares. Laws: (a) a partial re-run after one token changes is equal to a full re-run; (b) derivers whose tokens did not change execute zero times (counter-proven); (c) memo hits are stable across kernel versions. No new types. |
| **S2 — Incremental layout substrate + clock** | 2 | spacegraphjs `src/layout` + renderer | Move `computeIncremental`/`interpolatePosition` into `src/layout`; `moved` loses its stored `t`; renderer consumes `moved` with an explicit `t` clock and exposes `advance(t)` for tests; interpolation laws (stable ids keep positions, endpoints exact, `added`/`removed` reported); demo `delta-animation.html` shows a live merge *and* a layer switch through the same path; vitest invariants in `test/layout/`, demo spec under `playwright.demo.config.ts` with no sleeps. |
| **S3 — Layer transitions demo** | 0.5 | spacegraphjs demo | `layers.html`: one control writing level/lens/depth; each change flows through derive → diff → incremental → interpolate, proving the unification with a generic fixture. No new substrate API. |
| **S4 — Unified session surface** | 2.5 | OpenCode host | The mode concept is deleted: the panel composes the transcript and map as surfaces; the toolbar's View/Domains menus are replaced by one layers rail writing the S2/S3 parameters; a scrubber drives `SessionKernel.checkpoint()` across turn boundaries through the same pipeline. The 21-row acceptance suite retargets with zero product-behavior loss; capture frames are renamed, not relaxed. The transcript keeps loading without the graph (asserted). |
| **S5 — History (optional)** | 1 | server | Snapshot memoization per `(location, revision, scope)` with event invalidation, and `Vcs.history` commit ids so the scrubber can name commits. Carried unchanged from TODO.14 §0 / TODO.5 T29.2. Only if the scrubber must name commits. |

---

## 5. Invariants that make the design complete

These are the laws each slice must carry; each has exactly one testable owner:

- **Memo soundness (S1):** partial re-run === full re-run; unchanged-token derivers execute zero times.
- **Position stability (S2):** an append or a layer switch never moves a node that both view states place identically; `moved` is exactly the symmetric difference of placements.
- **Clock purity (S2):** the layout result is time-independent; `t` is an argument. `t=0` reproduces `from`, `t=1` reproduces `to`, no frame state lives in the model.
- **Budget and index during animation (S2):** `applyNodeBudget` and `SpatialIndex2D` consume the interpolated positions, so `q.near` stays correct mid-flight; the selected node is never budgeted out of view.
- **A11y discipline (S2):** the live region announces *view changes* (level/lens/depth/scrub), not per-frame movement; moving nodes never spam `AccessibilityLayer` updates.
- **Ordering (S1/S4):** kernel versions are monotonic; a session append and a snapshot revision arriving together fold in arrival order, and the memo makes the second one cheap.
- **Transcript independence (S4):** with the graph module failed/unloaded, the transcript surface still renders and the composer still accepts input.

## 6. Test strategy — re-targeted, never relaxed

**Relaxed:** nothing. No pixel tolerances, no timing gates, no removal of the still-canvas or reduced-motion contracts.

| Proof | Owner | How |
|-------|-------|-----|
| Memo soundness | kernel (`bun test` beside source) | Equality laws + execution counters, seeded generator cases |
| Interpolation/fluidity invariants | spacegraphjs vitest (`test/layout/`, jsdom, seeded) | Endpoint exactness, position stability, budget/index correctness mid-flight |
| Substrate user-visible behavior | spacegraphjs Playwright demo specs (`playwright.demo.config.ts`) | `delta-animation.html`, `layers.html`: content present, no console/page errors, deterministic via `advance(t)` — no `waitForTimeout` |
| Substrate screenshots | `test/e2e/demo-screenshots.spec.ts` convention | Auto-written to `spacegraphjs/screenshots/<demo>.png`; never the OpenCode matrix |
| Product behavior | OpenCode acceptance suite (21 rows) | Unchanged as the definition of "we did not lose the product" (stop rule #18) |
| Product documentation images | OpenCode per-frame capture | Unchanged strictness: fixed viewport, scale 1, reduced motion, still canvas, T6.19 duplicate-hash gate |

**Animated marketing frames**, if ever wanted: a separate `graph:capture --mode=animated` writing to its own directory; excluded from `verify`'s committed-set list so no gate depends on motion.

---

## 7. Impact inventory (OpenCode diff budget)

- **S1:** 0 files. Rebuild gate only.
- **S2:** `packages/session-ui/src/graph/layout.ts` shrinks as `computeIncremental`/`interpolatePosition` move; call sites migrate in the same change; session-graph camera wiring ≈2 files.
- **S3:** 0 files (demo-only).
- **S4:** host slice proper — `session-graph-panel.tsx`, `screen.tsx`, deletion of the toggle's mode remnants, layers-rail mapping, capture/e2e retarget, i18n keys.
- **S5:** server files only; no UI change.

---

## 8. Delete list (part of S4)

| Path / symbol | Fate |
|---------------|------|
| `GraphMode` tri-state in the panel | Surfaces + composition replace modes |
| `graph-toolbar-view` + `graph-toolbar-domains` menus | Replaced by the layers rail |
| Mode-menu i18n keys (`command.graph.mode.*`) | Deleted; rail labels come from domain vocabulary |
| E2E/mobile fixtures asserting mode menus | Retargeted to surface/rail assertions |
| S2's temporary re-export shim | Deleted in the same change that migrates call sites (stop rule #17) |

The transcript itself is never deleted and never graph-derived (mission constraint).

---

## 9. Open questions — resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | Do we need a delta type? | No. `diffKernels` is the delta; a partial re-run equals a full re-run, so convergence is structural |
| 2 | How does invalidation work without a graph? | Version-keyed per-deriver memo over the typed input tokens that already exist; "affected" = "whose token versions changed" |
| 3 | Where do substrate tests run? | Vitest for `src` (`test/**`), `bun test` beside source for kernel — existing convention, no config changes |
| 4 | Where are substrate screenshots generated? | In the nested repo, by `demo-screenshots.spec.ts` from a demo page; never in the OpenCode app matrix |
| 5 | How is animation tested without wall clock? | The renderer takes `t` explicitly; tests call `advance(t)`; no sleeps, ever |
| 6 | Is the layers control host or substrate? | The parameters are substrate (`deriveScope`/`deriveZoom`); the one control writing them is host; no controller state |
| 7 | Does the scrubber need `Vcs.history`? | No — turn boundaries come from `SessionKernel.checkpoint()`; commit names arrive only with S5 |
| 8 | Is the transcript a lens? | No. It is an independent surface. Modes die at the control level; the transcript never depends on graph code |
| 9 | Can the acceptance suite survive S4 unchanged? | Yes — rows describe product behavior, not modes; only locator vocabulary retargets |
| 10 | Do we relax capture determinism for animation? | No (stop rule #24); animated frames are a separate, ungated mode |

---

## 10. Stop rules (delta)

- **#21 (new): substrate-first.** No host-only mechanism. If a capability is generic it lands in SpaceGraphJS with a demo page and laws before OpenCode consumes it.
- **#22 (new):** animation is proven by invariants (memo soundness, interpolation laws, position stability), never by pixels or timing.
- **#23 (new):** a SpaceGraphJS feature ships with a demo page + spec; the OpenCode app capture matrix is not its screenshot venue.
- **#24 (new):** OpenCode capture strictness (reduced motion, still canvas, duplicate-hash gate) is never relaxed to make a feature pass.
- **#25 (new):** every change the reader sees — live update, layer switch, scrub — flows through the same derive → diff → incremental → interpolate pipeline. A second path needs a stated reason.
- **#26 (new):** no stateful controller where a composition of pure functions already expresses the behavior.

---

## 11. Idea vault — additions (carried: TODO.14 §9 V86–V94)

| # | Idea | Status | Why not now |
|---|------|--------|-------------|
| **V95** | `graph:capture --mode=animated` marketing frames | Vault | No gate may depend on motion; add only when someone asks for the artifact |
| **V96** | Physics camera (spring/inertia on every interaction) | **Rejected** | Fights the stable-positions law; interpolated `moved` is the whole desired effect |
| **V97** | Transcript rendered as canvas nodes | **Rejected** | DOM text stays selectable and must survive graph failure (mission constraint) |
| **V98** | Per-domain time offsets in the scrubber | **Rejected** | One session timeline; offsets would let the map lie about order |
| **V99** | Persisting layers-rail presets per session | Deferred with S4 | Persistence needs a settings owner; land the rail first |
| **V100** | `LayersController` stateful layer registry | **Rejected** | Layers are a composition of `deriveScope`/`deriveZoom`; a controller duplicates parameters as state (stop rule #26). Recorded so it is not re-proposed |
| **V101** | `WorkspaceDelta` + `mergeDelta` transport types | **Rejected** | `diffKernels` + version-keyed memo give the same acceptance with no new types; LWW `merge` stays for a future multi-writer story |
| **V102** | Retrofit sleeps out of the existing demo specs | Vault | New specs must not inherit `waitForTimeout`; retrofitting old specs is cleanup, not a gate |

---

## 12. Day 1 (Slice 1)

In `spacegraphjs/packages/kernel` (nested repo, `main`):

1. `src/deriver.ts` — extend `runPipeline`: each deriver's output memoized by the versions of its declared `inputToken`s; versions supplied by the caller beside the inputs.
2. `src/deriver.test.ts` — (a) partial re-run after one token changes equals full re-run; (b) unchanged-token derivers execute zero times (counter); (c) seeded `randomKernel` cases.
3. No new exports beyond the memo behavior; `pipe`/`runPipeline` signatures stay compatible.
4. `pnpm --dir spacegraphjs run build:packages` → `bun test packages/kernel/src` green → OpenCode `bun run check` green (no host files touched).
