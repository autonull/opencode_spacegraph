# SPACEGRAPH.TODO.15 — Unified Session Lens: Live, Animated, Multi-Layer (draft 2)

**Status:** complete, 2026-10-23. Builds on TODO.14 rev 10 (Slices 1–9 shipped, demo UI simplified, capture matrix regenerated). **S1–S4 are complete and verified.** S5 remains optional and is not required by the shipped scrubber (decision recorded below).

## Progress (2026-10-23)

| Slice | State | Landed | Remaining |
|-------|-------|--------|-----------|
| **S1 — Deriver memoization** | **Done** | `runPipeline(derivers, kernel, inputs?, versions?, memo?)` memoizes each deriver by name + stage kernel version + prefix token versions. Four laws tested (partial = full, unchanged-token zero executions, entries stable across kernel versions, seeded kernels). Kernel 72 tests green; `bun run check` green. | — |
| **S2 — Incremental layout substrate + clock** | **Done** | `spacegraphjs/src/layout/incremental.ts`: `computeIncremental`/`diffPositions`, `interpolatePosition`, `interpolatedPositions`, `LayoutMove` with no stored `t`; vitest invariants in `test/layout/incremental.test.ts`. Session-ui delegates to the substrate; `moved` no longer carries `t`. Renderer clock `packages/renderer/src/clock.ts` consumes `moved` with explicit `advance(t)` and is re-exported from the renderer package. New kernel `applyNodeBudget` in `packages/kernel/src/budget.ts` (weights are host data, protected ids survive). `demo/delta-animation.html` drives a live merge and a layer switch through derive → diff → incremental → clock. `test/e2e/delta-animation.spec.ts` asserts the same clock, t=0/t=1 endpoints, and silent per-frame a11y announcements without sleeps. Kernel 75 tests, layout 7 tests, demo spec green; `build:packages` green. | — |
| **S3 — Layer transitions demo** | **Done** | `demo/layers.html`: one range control writes a preset's level/lens/depth into `runPipeline` (three thin derivers over `deriveZoom`/`deriveScope`, shared memo and token versions), `diffKernels` feeds the added/removed report, and the host positions the derived kernel through `LaneLayout` → `diffPositions` → `createRenderClock`. `test/e2e/layers.spec.ts` asserts the control writes all three parameters, node/diff counts, t=0/t=1 endpoints, and a silent live region. Added `@spacegraphjs/kernel` demo/tsconfig aliases only. Demo spec and `build:packages` green; no new substrate API. | — |
| **S4 — Unified session surface** | **Done (verified)** | `GraphLayersRail` writes level/lens/depth with no controller state. `GraphMode` is deleted from the public vocabulary; persisted modes migrate to independent `map`/`sideBySide` surface flags. The panel mounts the transcript and map as independent surfaces, the header/commands toggle surfaces instead of modes, and the graph-failure e2e asserts the transcript renders without the graph module. The checkpoint scrubber scopes turn boundaries. Two stale capture frames (`11 graph timeline`, `12 graph hierarchy`) clicked the deleted toolbar `Flat` button; they now set `graph-layers-depth` to `flat`, so the capture matrix exercises the rail. | — |
| **S5 — History (optional)** | **Not needed** | — | The scrubber names turn boundaries, not commits; no consumer exists. Do not start without a concrete request (see the scrubber decision below). |

**S1 API note:** versions are passed beside inputs as a fourth argument; the memo is an optional fifth. Omitting the memo preserves the old pure `pipe` path exactly, so existing callers are untouched. The memo key includes the stage kernel version and every prefix deriver's token versions so a cached downstream kernel can never hide an upstream change.

**S2 API note:** the clock lives in the renderer package (`createRenderClock(model, moves).advance(t)`), and the kernel budget is generic (`applyNodeBudget(kernel, { maxNodes, weights, protectedIds? })`). The demo uses the lane layout with explicit group open/close so a merge moves an existing node rather than silently stacking columns.

### Verification (2026-10-23)

| Gate | Command | Result |
|------|---------|--------|
| Host graph suite (21 acceptance rows) | `bun test src/graph` in `packages/session-ui` | 236 pass, 0 fail (23 files) |
| Session-graph units | `bun test src` in `packages/session-graph` | 104 pass, 0 fail (9 files) |
| Product graph e2e | `bun run test:e2e -- e2e/graph/session-graph.spec.ts` in `packages/app` | 31 pass, 0 fail |
| Capture matrix + duplicate-hash gate | `bun run graph:capture --mode=verify` | 26 app frames pass, 2 Cytoscape component frames pass, committed set and T6.19 duplicate-hash gate pass |

One product e2e case (`picking a node in the map moves the log to it`) failed once inside a full-file run and passed on isolated and full reruns; treat it as a pre-existing timing flake to watch, not an S4 regression.

### Scrubber checkpoint decision

Turn scoping is the intended semantic. The host model is derived from the session message history, not from a `SessionKernel` entry log, so `SessionKernel.checkpoint()` has no host-side state to checkpoint; its versions are kernel-append versions, not product turn boundaries. `scopeToTurns` gives the reader exactly the contract the scrubber promises: show the map as of the last turn the rail names, while the newest checkpoint returns the live `fullModel()` so appends stay current. A durable checkpoint would add no user-visible capability until S5 names commits, so S5 stays closed. Do not mix the two: if a future scrubber must name commits or survive a reload mid-scrub, that is the trigger to reopen S5 and replace turn scoping wholesale.

### Slice detail and next actions

S1–S5 require no follow-up. The plan is complete; reopen S5 only for a commit-naming scrubber, V99 only when a settings owner exists for rail presets, and V95/V102 only as cleanup or marketing artifacts.

**S4b note:** `GraphMode` is gone from the public vocabulary. `graph-toolbar-view` remains as the map-tools menu (billboard, files, equalizer, arrangement, detail, windows); it no longer contains any layer parameter, so the layers rail is the only place level/lens/depth are written. The panel keeps both surfaces mounted and hides the transcript only while the map has the panel alone, which preserves transcript scroll and focus when the map opens or closes.

**S3 API note:** no substrate surface was added. The demo composes `deriveZoom` + `deriveScope` in a three-deriver `runPipeline` and exposes only demo state (`setLayer`, `draw`, `params`, `nodeCount`, `diff`, `positionOf`). `@spacegraphjs/kernel` is now aliased in `vite.demo.config.ts` and `tsconfig.json` so demos can import the kernel source directly.

### Known follow-ups

- S2's kernel `applyNodeBudget` is generic and tested; the host `session-ui` still uses its own `GraphViewData` budget until S4 migrates it. Do not duplicate the host budget in new substrate code.
- The demo's added nodes appear at their target position at `t=0` (only moved nodes interpolate). This is acceptable for S2; if added-node fade-in is wanted, it belongs in a later renderer extension, not the clock.
- The scrubber filters the graph with `scopeToTurns`; turn boundaries are the intended checkpoint semantic (see the decision above). Do not add a durable `SessionKernel.checkpoint()` path or mix it with turn scoping unless S5 is reopened for commit names.
- `graph-toolbar-view` remains as the map-tools menu (billboard, files, equalizer, arrangement, detail, windows); it no longer writes any layer parameter. Do not re-add level/lens/depth there.
- Capture fixtures must drive depth through `[data-slot="graph-layers-depth"]`, never through a toolbar mode button. The two frames that regressed did exactly that; the rail is the only writer.
- The persisted `map`/`sideBySide` migration is covered by `packages/app/src/shell/state/layout.test.ts`; the local bun test runner currently fails on a pre-existing Solid `jsxDEV` resolution error, so that test was typechecked but not executed here.
- `picking a node in the map moves the log to it` flaked once in a full-file e2e run and passed on reruns. Do not relax its poll; investigate only if it recurs.


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
| **S4 — Unified session surface** | 2.5 | OpenCode host | The mode concept is deleted: the panel composes the transcript and map as surfaces; the toolbar's View/Domains menus are replaced by one layers rail writing the S2/S3 parameters; a scrubber scopes turn boundaries through the same pipeline. Turn boundaries, not kernel versions, are the checkpoint semantic (see the decision above). The 21-row acceptance suite retargets with zero product-behavior loss; capture frames are renamed, not relaxed. The transcript keeps loading without the graph (asserted). |
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
- **S3:** 0 product files (demo-only); `demo/layers.html`, `test/e2e/layers.spec.ts`, plus the demo/tsconfig kernel alias.
- **S4:** `GraphLayersRail.tsx` (new), `GraphToolbar.tsx` (layer controls and Domains/Depth menus removed), `GraphView.tsx`, `session-graph-view.tsx` (scrubber), `session-graph-panel.tsx` (surfaces), `screen.tsx` (map/side-by-side flags), `session-graph-toggle.tsx`, commands, `layout.tsx` (mode migration), i18n keys, graph e2e/capture and component locators, transcript-without-graph assertion.
- **S5:** server files only; no UI change.

---

## 7b. Explicit ownership table (nothing falls through)

| Capability | Lives in | Why |
|------------|----------|-----|
| **Kernel, derivers, tokens, memoization** | SpaceGraphJS kernel | Pure, domain-agnostic, no session vocabulary |
| **`diffKernels`, `deriveScope`, `deriveZoom`** | SpaceGraphJS kernel | Generic graph operations |
| **`SpatialIndex2D`, `applyNodeBudget`** | SpaceGraphJS kernel | Generic spatial ops; budget weights are data, not code |
| **Incremental layout (`computeIncremental`, `interpolatePosition`)** | SpaceGraphJS `src/layout` | Domain-agnostic; moved from session-ui in S2 |
| **Renderer interpolation clock (`advance(t)`, consumes `moved`)** | SpaceGraphJS renderer | Generic; host drives the clock |
| **AccessibilityLayer** | SpaceGraphJS `src/a11y` | Already there; generic over render model |
| **ZoomBands, level system, lane/force/tree layouts** | SpaceGraphJS `src/zoom`, `src/layout` | Already there; generic |
| **Session vocabulary (turn, phase, tool, file, directory, package, commit, branch, symbol, process, port, issue)** | OpenCode `session-ui` | Domain-specific |
| **Deriver implementations (11 thin derivers)** | OpenCode `session-ui` | Know session snapshot schema; call substrate pure fns |
| **Graph builder (`buildSessionKernel`, `buildWorkspaceKernel`)** | OpenCode `session-ui` | Orchestrates session-specific derivers |
| **View projection (`toGraphView`, `GraphViewData`)** | OpenCode `session-ui` | Host projection over kernel Node/Edge |
| **Camera controller (`graph-camera.ts`)** | OpenCode `session-graph` | Session-specific: follows log, frames turn, knows phase bands |
| **Selection state (`graph-selection.ts`)** | OpenCode `session-graph` | By stable ID (substrate); host owns UI meaning (inspector, actions) |
| **Layers rail control (one UI writing level/lens/depth)** | OpenCode `session-graph` | Writes substrate parameters; no controller state |
| **Transcript surface** | OpenCode `app` | Independent; survives graph failure (mission constraint) |
| **Panel composition (surfaces + rail + scrubber)** | OpenCode `session-graph` / `app` | Host UI assembly |
| **Scrubber over turn boundaries (`scopeToTurns`)** | OpenCode `session-graph` | Turn boundaries are session concept; uses substrate pipeline. Kernel checkpoint versions are not product turns, so no durable checkpoint path exists |
| **Snapshot fetch/cache** | OpenCode `app` | Session-scoped, debounced, protocol-aware |
| **Export (SVG/JSON/HTML)** | OpenCode `session-graph` | Host formats; substrate provides render model |
| **Capture/determinism contract** | OpenCode `app` e2e | Product documentation images |

**Rule:** if it knows "turn", "phase", "message", "session", "file path", or "protocol", it's OpenCode. If it only knows Node/Edge/Kind/Position/Level/Lens, it's SpaceGraphJS.

---

## 8. Animation interaction model (explicit, no surprises)

| Interaction | Behavior |
|-------------|----------|
| **Clock ownership** | Host owns the clock; substrate exposes `advance(t)` and renders at the given `t`. Host may animate (e.g., 300ms ease), jump to `t=1`, or pause. |
| **Selection during animation** | Selection is by stable ID (substrate). The selected node's interpolated position is visible mid-flight; inspector follows it. Budget never drops the selected node (invariant). |
| **Keyboard/mouse during animation** | Host handles input; a click on a moving node selects it at its interpolated position. Keys (`j`/`k`, arrows) step the host clock or jump to `t=1` — no substrate changes. |
| **Live delta during animation** | Kernel versions are monotonic. A new delta creates a new target view state; host re-starts the pipeline (derive → diff → incremental → new `moved` set, `t=0`). No frame state to clean up. |
| **Layer switch during animation** | Same as live delta: the parameter change produces a new target; pipeline re-runs; clock resets to 0 for the new `moved` set. |
| **Scrubber during live delta** | Scrubber position is a kernel version. A new delta appends a version; the scrubber's rail extends. If scrubbing an old version, the view is that version (pipeline idempotent). |
| **Focus management (F6 cycling)** | Surfaces (transcript, map, inspector) keep their DOM; focus state is preserved because the panel composes surfaces, it doesn't swap them. |
| **Minimap / multi-view** | Renderer supports multiple views of the same model. `computeIncremental` produces one `moved` set; each view interpolates with the same `t`. No substrate duplication. |
| **Export during animation** | Exports the *settled* state (`t=1` of the current target). If the host wants the mid-flight frame it calls `advance(t)` on a headless renderer and exports that — explicit, not implicit. |
| **A11y live region** | Announces *view changes* (level/lens/depth/scrub target) at `t=0` of a new pipeline run. Per-frame movement is silent. |
| **Reduced motion** | Host forces `t=1` immediately (no animation). Pipeline still runs (derive → diff → incremental), so layout is correct; just no interpolation frames. |

---

## 9. Delete list (part of S4)

| Path / symbol | Fate |
|---------------|------|
| `GraphMode` tri-state in the panel | Surfaces + composition replace modes |
| `graph-toolbar-view` + `graph-toolbar-domains` menus | Replaced by the layers rail |
| Mode-menu i18n keys (`command.graph.mode.*`) | Deleted; rail labels come from domain vocabulary |
| E2E/mobile fixtures asserting mode menus | Retargeted to surface/rail assertions |
| S2's temporary re-export shim | Deleted in the same change that migrates call sites (stop rule #17) |

The transcript itself is never deleted and never graph-derived (mission constraint).

---

## 10. Open questions — resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | Do we need a delta type? | No. `diffKernels` is the delta; a partial re-run equals a full re-run, so convergence is structural |
| 2 | How does invalidation work without a graph? | Version-keyed per-deriver memo over the typed input tokens that already exist; "affected" = "whose token versions changed" |
| 3 | Where do substrate tests run? | Vitest for `src` (`test/**`), `bun test` beside source for kernel — existing convention, no config changes |
| 4 | Where are substrate screenshots generated? | In the nested repo, by `demo-screenshots.spec.ts` from a demo page; never in the OpenCode app matrix |
| 5 | How is animation tested without wall clock? | The renderer takes `t` explicitly; tests call `advance(t)`; no sleeps, ever |
| 6 | Is the layers control host or substrate? | The parameters are substrate (`deriveScope`/`deriveZoom`); the one control writing them is host; no controller state |
| 7 | Does the scrubber need `Vcs.history`? | No — the scrubber moves across turn boundaries via `scopeToTurns`; `SessionKernel.checkpoint()` versions are kernel-appends, not product turns. Commit names would require S5, which has no consumer |
| 8 | Is the transcript a lens? | No. It is an independent surface. Modes die at the control level; the transcript never depends on graph code |
| 9 | Can the acceptance suite survive S4 unchanged? | Yes — rows describe product behavior, not modes; only locator vocabulary retargets |
| 10 | Do we relax capture determinism for animation? | No (stop rule #24); animated frames are a separate, ungated mode |
| 11 | Who owns the clock? | Host. Substrate exposes `advance(t)`; host animates, jumps, or pauses. |
| 12 | What if a live delta arrives during a layer animation? | New target view state replaces the in-flight one; pipeline re-runs from `t=0`. No frame state to clean up. |
| 13 | Does the minimap animate? | Yes — same `moved` set, same `t`, separate renderer instance. Budget/index apply per view. |

---

## 11. Stop rules (delta)

- **#21 (new): substrate-first.** No host-only mechanism. If a capability is generic it lands in SpaceGraphJS with a demo page and laws before OpenCode consumes it.
- **#22 (new):** animation is proven by invariants (memo soundness, interpolation laws, position stability), never by pixels or timing.
- **#23 (new):** a SpaceGraphJS feature ships with a demo page + spec; the OpenCode app capture matrix is not its screenshot venue.
- **#24 (new):** OpenCode capture strictness (reduced motion, still canvas, duplicate-hash gate) is never relaxed to make a feature pass.
- **#25 (new):** every change the reader sees — live update, layer switch, scrub — flows through the same derive → diff → incremental → interpolate pipeline. A second path needs a stated reason.
- **#26 (new):** no stateful controller where a composition of pure functions already expresses the behavior.
- **#27 (new):** host owns the clock; substrate is time-independent. No wall clock, no stored `t`, no sleeps in tests.
- **#28 (new):** selection is by stable ID; the selected node is never budgeted out of view. Both are substrate guarantees the host relies on.
- **#29 (new):** the transcript is an independent surface that survives graph failure. No graph code on the transcript's critical path.

---

## 12. Idea vault — additions (carried: TODO.14 §9 V86–V94)

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

## 13. Day 1 (Slice 1)

In `spacegraphjs/packages/kernel` (nested repo, `main`):

1. `src/deriver.ts` — extend `runPipeline`: each deriver's output memoized by the versions of its declared `inputToken`s; versions supplied by the caller beside the inputs.
2. `src/deriver.test.ts` — (a) partial re-run after one token changes equals full re-run; (b) unchanged-token derivers execute zero times (counter); (c) seeded `randomKernel` cases.
3. No new exports beyond the memo behavior; `pipe`/`runPipeline` signatures stay compatible.
4. `pnpm --dir spacegraphjs run build:packages` → `bun test packages/kernel/src` green → OpenCode `bun run check` green (no host files touched).
