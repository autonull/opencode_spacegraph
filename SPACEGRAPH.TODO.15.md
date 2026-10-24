# SPACEGRAPH.TODO.15 — Unified Session Lens: Live, Animated, Multi-Layer (draft 1)

**Status:** draft 1, 2026-10-23. Builds on TODO.14 rev 10 (Slices 1–9 shipped, demo UI simplified, capture matrix regenerated). **Nothing here is implemented yet** — this is the executable proposal. Direction agreed in review: move toward one unified session graph (transcript as a lens, nodes animating between kernel versions, one continuous layers control), and do **not** relax test determinism to get there.

Architecture direction unchanged: the mechanism lands in **SpaceGraphJS** (domain-agnostic substrate, own repo and test suite), OpenCode stays a thin host that consumes finished APIs. Every slice below names its OpenCode diff budget; the base slices touch OpenCode almost not at all.

---

## 1. The aim, stated measurably

1. **Complete representation.** The graph holds every domain of the session (session, directories, history, code, verification, runtime, work) and every layer the reader can ask for.
2. **Live, not rebuilt.** A merged delta converges to the same kernel as a full rebuild (TODO.14's S10 criterion, promoted to law + test), and untouched derivers do not re-run.
3. **Animated, not teleported.** Nodes carry `moved: { from, to, t }` between kernel versions; stable IDs keep their positions; streaming appends never re-layout existing nodes.
4. **One layers control.** Zoom level, lens/profile, and depth are three axes of one continuous affordance, not three menus.
5. **The transcript is a lens.** "Log" is a projection of the same kernel, not a mode; the panel composes lenses instead of switching surfaces.
6. **Fluidity is proven by invariants.** No pixel diffs, no timing gates, no sleeps: convergence equalities, interpolation laws, position stability.

---

## 2. Direction — substrate first, host thin

| Capability | Lands in | OpenCode impact |
|------------|----------|-----------------|
| Delta substrate: `WorkspaceDelta`, `mergeDelta`, deriver input→output invalidation | `spacegraphjs/packages/kernel` | Zero files; rebuild gate only |
| Incremental/interpolated layout: `computeIncremental`, `interpolatePosition` moved out of the host | `spacegraphjs/src/layout` | `session-ui/layout.ts` becomes a re-export; net-negative host diff |
| Deterministic animation clock: renderer consumes `moved` + `t`, tests advance time explicitly | `spacegraphjs` renderer packages | Camera wiring (~2 files) |
| Layers controller: ordered named layers (zoom/lens/depth) over `deriveScope`/`deriveZoom` | `spacegraphjs/src` beside `levels`/`zoom` | session-graph maps vocabulary onto it (~3 files) |
| Unified session lens + time scrubber | OpenCode host | The one host slice (S4) |
| Snapshot memoization + `Vcs.history` | OpenCode server | Only if the scrubber must name commits (S5, optional) |

**Vocabulary-leak correction (S2):** `computeIncremental`/`interpolatePosition` are domain-agnostic but live in `packages/session-ui/src/graph/layout.ts`. They move to `spacegraphjs/src/layout`; the host re-exports until call sites migrate. This is the pattern for everything in this plan: shrink the host by moving mechanism out, not by adding shims (stop rule #17 carried).

---

## 3. Verified SpaceGraphJS facts (demo/test side; new in this rev)

| Fact | Consequence |
|------|-------------|
| Root `spacegraphjs/package.json` has many subpath exports (`./core`, `./nodes`, `./plugins`, `./a11y`, …); the single-entry rule from TODO.14 §2 was **kernel-specific**, not repo law | New substrate modules may become subpaths when they have independent consumers; the kernel stays single-entry so `package-exports.test.ts` keeps its shape |
| `vitest.config.ts` collects `test/**/*.test.ts` + `packages/*/test/**/*.test.ts`; aliases map `spacegraphjs/*` → `src/*` and four renderer packages, but **not** `@spacegraphjs/kernel` | Kernel tests stay `bun test` beside source; new `src` modules get vitest tests in `test/` with no config change |
| `playwright.config.ts`: `testDir ./test`, `*.spec.ts`, video → `recordings/` | Substrate e2e specs join `test/` (`vision.spec.ts`, `interaction.spec.ts` precedent) |
| `playwright.demo.config.ts`: `testDir ./test/e2e`, webServer `vite --config vite.demo.config.ts` port 5173 (`SG_DEMO_PORT`) | Demo-driven specs run under this config |
| `test/e2e/demo-screenshots.spec.ts` auto-discovers every `demo/*.html` and writes `spacegraphjs/screenshots/<demo>.png`; `demo-verification.spec.ts`, `visual-regression.spec.ts` share the convention | **Substrate screenshots are generated here**, not in the OpenCode app matrix; a new feature ships as a demo page and is documented automatically |
| SpaceGraphJS `src` already has `layout`, `levels`, `zoom`, `a11y` modules as substrate precedent | The layers controller joins them; OpenCode's `session-graph` keeps only vocabulary |
| SpaceGraphJS has its own `screenshots/`, `recordings/`, `test/fixtures/` | Substrate visual artifacts stay in the nested repo and its own commit stream |

**Workflow gate (carried from TODO.14):** after any kernel change, `pnpm --dir spacegraphjs run build:packages` before OpenCode typecheck/tests.

---

## 4. Slices (est. 9 days total; base = 5.5 days, all SpaceGraphJS)

| Slice | Days | Where | Delivers |
|-------|------|-------|----------|
| **S1 — Delta substrate** | 2 | kernel | `WorkspaceDelta` (per-collection add/upsert/remove); `WorkspaceKernel.mergeDelta` (LWW, converges byte-for-byte with `replaceFrom`); `DeriverGraph` recording each deriver's input tokens → outputs, `invalidate(delta)` returning affected deriver ids. Acceptance: merged delta == full rebuild; untouched derivers do not re-run. Tests: kernel laws beside source. |
| **S2 — Animated layout substrate** | 2 | spacegraphjs `src/layout` + renderer | Move `computeIncremental`/`interpolatePosition` into `src/layout`; renderer accepts `moved[].{from,to}` with `t` from a clock or explicit `advance(t)` (no wall clock in tests); interpolation laws (stable ids keep positions, `t∈[0,1]` endpoints exact, `added`/`removed` reported); demo `delta-animation.html` shows a live merge; vitest invariants in `test/layout/`, demo spec under `playwright.demo.config.ts`. |
| **S3 — Layers controller** | 1.5 | spacegraphjs `src` | `LayersController`: ordered named layers over `deriveScope`/`deriveZoom` — one axis for zoom level, lens, and depth, with per-node expansion; generic fixture demo `layers.html`; vitest laws + demo spec. OpenCode's toolbar later maps session vocabulary onto it. |
| **S4 — Unified session lens** | 2.5 | OpenCode host | The mode concept is deleted: the panel composes lenses (transcript is one of them); the toolbar's View/Domains menus are replaced by the layers rail from S3; a time scrubber drives `SessionKernel.checkpoint()` across turn boundaries. The 21-row acceptance suite retargets with zero product-behavior loss; capture frames are renamed, not relaxed. |
| **S5 — History (optional)** | 1 | server | Snapshot memoization per `(location, revision, scope)` with event invalidation, and `Vcs.history` commit ids so the scrubber can name commits. Carried unchanged from TODO.14 §0 / TODO.5 T29.2. |

**Base = S1–S3 (5.5 days) touches OpenCode only via re-exports and the rebuild gate.** S4 is the only host-heavy slice and lands after the substrate it consumes is proven.

---

## 5. Test strategy — re-targeted, never relaxed

**Relaxed:** nothing. No pixel tolerances, no timing gates, no removal of the still-canvas or reduced-motion contracts.

**Ownership split (each proof has exactly one owner):**

| Proof | Owner | How |
|-------|-------|-----|
| Delta convergence, invalidation correctness | kernel (`bun test` beside source) | Equality laws: `mergeDelta(d) === replaceFrom(snap)`; unaffected derivers have empty invalidation sets |
| Interpolation/fluidity invariants | spacegraphjs vitest (`test/layout/`, jsdom, seeded) | Stable ids keep positions across an append; `moved` pairs interpolate `from→to` exactly at `t=0/1`; `added`/`removed` reported; budget never drops the selection |
| Substrate user-visible behavior | spacegraphjs Playwright demo specs (`playwright.demo.config.ts`) | `delta-animation.html`, `layers.html`: content present, no console/page errors, deterministic via explicit `advance(t)` |
| Substrate screenshots | `test/e2e/demo-screenshots.spec.ts` convention | Auto-written to `spacegraphjs/screenshots/<demo>.png`; never the OpenCode matrix |
| Product behavior | OpenCode acceptance suite (21 rows) | Unchanged as the definition of "we did not lose the product" (stop rule #18) |
| Product documentation images | OpenCode per-frame capture | Unchanged strictness: fixed viewport, scale 1, reduced motion, still canvas, T6.19 duplicate-hash gate |

**Animated marketing frames**, if ever wanted: a separate `graph:capture --mode=animated` writing to its own directory; excluded from `verify`'s committed-set list so no CI gate depends on motion.

---

## 6. Impact inventory (OpenCode diff budget)

- **S1:** 0 files. Rebuild gate only.
- **S2:** `packages/session-ui/src/graph/layout.ts` shrinks to a re-export; session-graph camera wiring ≈2 files.
- **S3:** session-graph toolbar→rail mapping ≈3 files (after S4 does the swap).
- **S4:** host slice proper — `session-graph-panel.tsx`, `screen.tsx`, deletion of the toggle's mode remnants, capture/e2e retarget, i18n keys.
- **S5:** server files only; no UI change.

---

## 7. Delete list (part of S4)

| Path / symbol | Fate |
|---------------|------|
| `GraphMode` tri-state in the panel (`transcript \| graph \| hybrid` as *modes*) | Becomes lens composition; the panel holds lenses, not modes |
| `graph-toolbar-view` + `graph-toolbar-domains` menus | Replaced by the layers rail (S3 substrate, host mapping) |
| Mode-menu i18n keys (`command.graph.mode.*`) | Deleted; lens names come from domain vocabulary |
| E2E/mobile fixtures asserting mode menus | Retargeted to lens assertions |

The transcript itself is never deleted (mission constraint): it keeps working if the graph fails to load, and remains the dependable baseline.

---

## 8. Open questions — resolved

| # | Question | Resolution |
|---|----------|------------|
| 1 | Where do substrate tests run? | Vitest for `src` (`test/**`), `bun test` beside source for kernel — matching existing convention, no config changes |
| 2 | Where are substrate screenshots generated? | In the nested repo, by `demo-screenshots.spec.ts` from a demo page; never in the OpenCode app matrix |
| 3 | How is animation tested without wall clock? | The renderer takes `t` explicitly; tests call `advance(t)`; no sleeps, no `waitForTimeout` |
| 4 | Is the layers control host or substrate? | Substrate (`LayersController` over `deriveScope`/`deriveZoom`); the host contributes only names |
| 5 | Does the scrubber need `Vcs.history`? | No — turn boundaries come from `SessionKernel.checkpoint()`; commit names arrive only with S5 |
| 6 | Can the acceptance suite survive S4 unchanged? | Yes — rows describe product behavior, not modes; only locator vocabulary retargets |
| 7 | Do we relax capture determinism for animation? | No (stop rule #24); animated frames are a separate, ungated mode |

---

## 9. Stop rules (delta)

- **#21 (new): substrate-first.** No host-only mechanism. If a capability is generic it lands in SpaceGraphJS with a demo page and laws before OpenCode consumes it.
- **#22 (new):** animation is proven by invariants (convergence equality, interpolation laws, position stability), never by pixels or timing.
- **#23 (new):** a SpaceGraphJS feature ships with a demo page + spec; the OpenCode app capture matrix is not its screenshot venue.
- **#24 (new):** OpenCode capture strictness (reduced motion, still canvas, duplicate-hash gate) is never relaxed to make a feature pass.
- **#25 (new):** a merged delta must equal a full rebuild. Any delta path that cannot prove this is rejected.

---

## 10. Idea vault — additions (carried: TODO.14 §9 V86–V94)

| # | Idea | Status | Why not now |
|---|------|--------|-------------|
| **V95** | `graph:capture --mode=animated` marketing frames | Vault | No gate may depend on motion; add only when someone asks for the artifact |
| **V96** | Physics camera (spring/inertia on every interaction) | **Rejected** | Fights the stable-positions law; interpolated `moved` is the whole desired effect |
| **V97** | Transcript rendered as canvas nodes | Vault | DOM text stays selectable (mission constraint); revisit only with a DOM-node card precedent |
| **V98** | Per-domain time offsets in the scrubber | **Rejected** | One session timeline; offsets would let the map lie about order |
| **V99** | Persisting layers-rail presets per session | Deferred with S4 | Persistence needs a settings owner; land the rail first |

---

## 11. Day 1 (Slice 1)

In `spacegraphjs/packages/kernel` (nested repo, `main`):

1. `src/delta.ts` — `WorkspaceDelta` type (per-collection add/upsert/remove) + `diffSnapshots(before, after): WorkspaceDelta`.
2. `src/workspace.ts` — `mergeDelta(delta)` beside `replaceFrom`; LWW per collection item.
3. `src/deriver.ts` — `DeriverGraph`: registry recording input tokens → output ids; `invalidate(delta) → DeriverId[]`.
4. `src/delta.test.ts`, `deriver-graph.test.ts` — convergence equality laws (`mergeDelta(diff(a,b))` over `a` `===` `replaceFrom(b)`), invalidation-set exactness (untouched derivers return `[]`).
5. Seeded generator cases: `randomKernel` round-trips through delta + merge.
6. `pnpm --dir spacegraphjs run build:packages` → `bun test packages/kernel/src` green → OpenCode `bun run check` green (no host files touched).
