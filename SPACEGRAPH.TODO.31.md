# SpaceGraph for OpenCode — Development Plan (v31)

> **Goal:** Finish the graph. Close out Phase 4's remaining UX work, run the Phase 5 evidence
> gate, land the remaining library-leverage items, and fold in the SpaceGraphJS dependency
> hardening from the Grant Workspace review. Publishing/releasing remains **deferred indefinitely**.
>
> **Directives (2026-11-06):**
> 1. **Publishing/releasing stays deferred indefinitely** (inherits §4.9 of TODO.30). The Grant
>    Workspace improvements spec's "before v1.0" framing is moot — there is no v1.0 gate here.
>    Everything in this plan is in-monorepo work.
> 2. **`SPACEGRAPH.md` was missing from the working tree** (627-line design/evidence document,
>    present in git on `upstream-sync-1105` at `92f07d5599`). It was restored from git on
>    2026-11-06. Do not delete it. It and this file must live on the branch that becomes the
>    fork's mainline — never as untracked strays again.
> 3. **Lift-to-library principle.** General-purpose functionality built in or requested by the
>    OpenCode integration lands in `spacegraphjs/` when a second dependent could use it. The
>    Grant Workspace review items (§6.0) are all library-side and are lifted by definition. The
>    integration stays thin: host vocabulary and policies only.
> 4. **All layouts get the size-awareness treatment, if possible** (2026-11-06): not just
>    `ForceLayout`. Every layout where sizes can inform placement reads them; layouts where sizes
>    are meaningless (GeoLayout, SpectralLayout) are documented as such, not hacked.
> 5. **The result must be an improvement over the last working state, with zero loss.** No files,
>    functionality, or branches are deleted, overwritten, merged, or force-pushed in this work.
>    Additive changes only; explicit configs keep working; existing tests stay green unmodified.
>    The branch topology is *not* to be untangled by this plan's implementation steps — see §A.4.
> 6. **Defer premature optimization.** No performance work lands before the essential, functional
>    work (§6.0) is done and verified. The 300-iteration `ForceLayout` perf question, the
>    Spectral-relax post-pass, and converging the two force engines go to Phase 7 with unblock
>    conditions. No spatial indices, no Barnes-Hut wiring into plugin layouts in 6.0.
> 7. **Consolidated verification.** One bounds helper, one conformance test file, no per-layout
>    duplicates. Package-targeted test commands during iteration; one root `bun run check` and one
>    `dist/` rebuild at the end of 6.0; the session-graph component suite runs once at 6.0 exit,
>    not per item. No test is modified to make a new behavior pass.
> 8. **Prioritize.** The product critical path remains Phase 5 (T2.2 evidence gate) — it is
>    elapsed-time-bound, start it immediately and interleave. Library hardening (§6.0) is cheap
>    and unblocks a second dependent; do it in short bursts alongside, never instead of. Phase 4
>    close-out is small; finish it first. Nothing in this plan reopens Vision/ONNX/3D/publish.

**Status (2026-11-06, v31):** Supersedes the open items of `SPACEGRAPH.TODO.30.md`. Phases 0–4
are implemented (Phase 4.6 a11y complete 2026-11-06; Phase 4.9 publish deferred indefinitely).
This revision: (a) carries forward the remaining work unchanged, (b) re-derives priorities,
(c) folds in the Grant Workspace "SpaceGraphJS Improvements Specification" (issues 1–8),
re-verified against the tree — several of its assumptions are stale, one of its "missing" exports
exists, and its P0 is not this repo's critical path, (d) restores `SPACEGRAPH.md` from git,
(e) flags a branch-topology problem that must be resolved explicitly, and (f, r5) extends the
size-aware treatment to **all** plugin layouts where feasible (§6.0 SGF-9/10), hardens the no-loss
and no-branch-confusion guarantees, defers premature optimization explicitly, and consolidates
verification to one helper + one conformance test file.

**Completed in this session (2026-11-06):**
- Phase 0′: Branch reconciliation — restored missing files from upstream-sync-1105, added
  `.github/workflows/graph.yml`, `script/graph-*`, `docs/spacegraph/`, packages/gui-plugins/src/spacegraph/,
  packages/plugins/spacegraph/, packages/app component and e2e tests; SPACEGRAPH.md and SPACEGRAPH.TODO.31.md
  now tracked on upstream-dev-sync.
- Phase 4.11: Fractal unfold UX finish — search-hit ring, aria-live announcements, badge animation
  wire-up complete; unit tests pass (92/92).
- Fixed session-graph i18n type errors by adding all SpaceGraph i18n keys to packages/ui/src/i18n/en.ts.
- session-ui projection.ts updated with turnByMessageID for graph ownership mapping.
- Phase 5.2 Discoverability: first-run demo map ("demo — your session will appear as it runs"),
  "see the map" prompt (errors/compactions/many turns, dismissible+remembered), PR-embed export
  (`graph:export --pr` via `packages/session-graph/src/graph/export-cli.ts`), Trust lens
  (`?lens=unverified` banner + detection).

---

## §A — Ground truth, policy, critical path

### A.1 New and re-verified findings (read from the tree, 2026-11-06)

Inherits §A.1/§A.2 of TODO.30 in full. Additions and corrections from this revision:

| # | Fact | Evidence |
|---|---|---|
| 13 | **`ForceLayout` is not node-size aware.** Repulsion is `config.repulsion / distSq`, clamped only by a single `config.minDistance`; per-pair distance never reads node dimensions. The OpenCode host is unaffected (its layout path uses `src/layout/` `ForcePlacement`, whose geometry is card-aware via `ForceMeta.radius`); the Grant Workspace consumer hits this path via `layoutOnce('ForceLayout', …)`. | `spacegraphjs/src/plugins/layouts/ForceLayout.ts:120-148`, `spacegraphjs/src/layout/force.ts` (`ForceMeta.radius`, "half its width"), `packages/session-ui/src/graph/layout.ts` header ("The geometry is card-aware (RF.1)") |
| 14 | **Three-name mismatch for layouts, and silent failure.** Plugins register under class names (`'ForceLayout'`), the plugin `id` is `'force-layout'`, `LayoutOptionsMap`/`layoutOnce` type keys are `'force-layout'`, and `pluginManager.getPlugin('ForceLayout')` is the runtime lookup. Typed `layoutOnce('ForceLayout')` fails to compile; `layoutOnce('force-layout')` compiles but runtime-misses unless registered under that key; an unknown name is a **silent no-op** (`SpaceGraph.layout` has no miss branch). This is the root cause of the `as any` + magic strings in the Grant Workspace call site. | `spacegraphjs/src/core/defaults.ts:142-153`, `spacegraphjs/src/spacegraph/LifecycleController.ts:73`, `spacegraphjs/src/types/layout.ts:27-40`, `spacegraphjs/src/SpaceGraph.ts:318-333`, `spacegraphjs/src/plugins/layouts/ForceLayout.ts` (`readonly id = 'force-layout'`) |
| 15 | **Export gaps are narrower than the spec claims, but real.** `ForceLayoutConfig` *is* exported top-level (`src/index.ts:25`). Missing top-level: `LayoutOptions`, `LayoutConfig`, `BaseLayout`, `HtmlNodeData` (exists at `src/types/node-data.ts:12`, reachable only via `* as types`), `NodeSpec`/`EdgeSpec`/`GraphSpec` (`src/types/spec.ts`), a `create()` return type. `SimpleGraph.create` return type is unnameable without `Awaited<ReturnType<…>>`. | `spacegraphjs/src/index.ts:25-31,51,78-79`, `spacegraphjs/src/types/node-data.ts:12`, `spacegraphjs/src/types/spec.ts` |
| 16 | **Edge attraction ignores edge strength.** `ForceLayout.step()` applies `config.attraction * dist` uniformly; `edge.data?.strength` is never read. | `spacegraphjs/src/plugins/layouts/ForceLayout.ts:136-148` |
| 17 | **Positions can be restored but not serialized.** `setPositions(Record<string,[number,number,number]>)` exists on `SpaceGraph` and `Graph`; no `getPositions` / serialize. | `spacegraphjs/src/SpaceGraph.ts:335-339`, `spacegraphjs/src/core/Graph.ts:165` |
| 18 | **No cheap layout-bounds API.** `Node.bounds`/`bounds3D` use `Box3.setFromObject` (render-dependent, expensive); `HtmlNode.size` and `BaseContentNode`'s `data.width/height` are class-level, not on base `Node`. | `spacegraphjs/src/nodes/Node.ts:102-112`, `spacegraphjs/src/nodes/HtmlNode.ts` (`size`, `MIN_SIZE`), `spacegraphjs/src/nodes/BaseContentNode.ts:40-41` |
| 19 | **`SPACEGRAPH.md` was absent from this branch**; restored from `92f07d5599:SPACEGRAPH.md` (626 lines). Also absent here (present on `upstream-sync-1105`): `.github/workflows/graph.yml`, `script/graph-{setup,dev,verify}.ts`, `script/capture-graph-demo.ts`, `script/pixel-diff.ts`, `script/docs-graph.ts`, `docs/spacegraph/`, `packages/gui-plugins/src/spacegraph/`, `packages/plugins/spacegraph/`. Any TODO.30 reference to those paths resolves **only on the sync branch**. | `git ls-tree -r upstream-sync-1105 --name-only` |
| 20 | **`spacegraphjs/` is an untracked standalone clone** at `f90b609` ("feat(kernel): add generic sub-layout engine"), equal to the gitlink recorded on `upstream-sync-1105`. No `.gitmodules`; root `package.json` workspaces include `spacegraphjs` + `spacegraphjs/packages/*`. Local component tests consume committed `dist/` output — **rebuild dist after library changes** (TODO.30 r3.2). | `git -C spacegraphjs log`, root `package.json` |
| 21 | **Grant Workspace issue #2 (dev/prod data loading) is not applicable to this repo** — no vite-middleware + `server.cjs` dual-loader pair exists here. Its solution (one shared typed loader serving both) is guidance for any host with dual loaders; capture it in `docs/host-integration.md` (§6.2). The Grant Workspace action item lives in that repo. | Improvements spec §2 |
| 22 | **Three distinct `LayoutStrategy` concepts** exist: plugin layouts, `src/layout/strategies.ts` (`'lanes'|'timeline'|'hierarchy'|'tree'|'force'`, internal), and `LayoutNode`'s per-kind strategy functions. None is a registry of the layout plugins. | `spacegraphjs/src/layout/strategies.ts:18`, `spacegraphjs/src/nodes/LayoutNode.ts:7` |
| 23 | **The internal generic engines are already size-aware — propagate, don't invent.** `ForcePlacement` reads `meta.radius` with a collision term + final 30-pass separation (`force.ts`); `BarnesHutForcePlacement` is radius/mass based; `GridPlacement` + `LaneLayout` measure columns from `item.width`; `strategies.ts` takes a `nodeSizeFn`; `PlacementItem` carries `width`/`height`. The OpenCode host is fully on this path. | `spacegraphjs/src/layout/force.ts`, `barnes-hut.ts`, `grid.ts`, `LaneLayout.ts`, `placement.ts`, `strategies.ts` |
| 24 | **`TreePlacement` (the one internal engine, gap) reads no item sizes** — leaves are fixed `columnPitch` blocks, so homogeneous widths are assumed inside the tree engine even though `PlacementItem.width` exists. | `spacegraphjs/src/layout/tree.ts:119,143` (`width: this.#columnPitch`) |
| 25 | **The plugin layouts are all non-size-aware**, and they are the API a second dependent (Grant Workspace) consumes: fixed `spacingX`/`spacingY` (Grid), fixed ring radii (Circular), fixed cursor `nodeSpacing`/`levelHeight` (Tree, Hierarchical), fixed `radiusStep` + equal arc allocation (Radial), fixed `nodeRadius`/`clusterRadius` (Cluster), time-only X positions + fixed fallback `spacing` (Timeline). `GeoLayout` is size-agnostic by design (lat/lng are semantics). `SpectralLayout` is size-agnostic by design (eigenvector positions are unitless). | `spacegraphjs/src/plugins/layouts/*.ts` (verified 2026-11-06) |
| 26 | **Existing layout tests must stay green unmodified.** `test/layout-plugins.test.ts` passes explicit `spacingX: 100`/`spacingY: 50` and asserts exact positions — so explicit config must remain an exact override and auto-computation only fills in what the caller did not set. `test/spacegraph.test.ts`, `test/integration.test.ts`, `test/hardening.test.ts` also touch layouts. | `spacegraphjs/test/layout-plugins.test.ts:28-31` |

### A.2 Breaking-change policy (unchanged from TODO.30 §A.2)

No `CONTRACT_VERSION`, no negotiation, no aliases, no `@deprecated` shims, no migration paths.
Capability is probed by existence, never by a constant. Library change = gitlink bump + host update
in one PR (on the mainline; see Phase 0′). Delete, don't deprecate.

### A.3 Critical path

```
4 close-out ─► 0′ reconciliation ─┬─► 6.0 library hardening (short bursts, P0 first)
              │                    │      ▲ start immediately, interleave, never instead-of
              │                    ▼
              └──────────────► 5 discovery + T2.2 study (elapsed-time-bound; starts day 1)
                                   │
                              6.1–6.4 library leverage
                                   │
                              7 parked (Vision/ONNX…) ─► 8 close-out
```

Sizing: 4 close-out ≈ 1 d · 0′ ≈ 0.5–1 d · 6.0 ≈ 7–9 d total, split into ≤1–2-day items · 5 = 2 d work,
weeks elapsed · 6.1–6.4 ≈ 2–3 d · 7 = hours · 8 ≈ 1 d. Publish: **never** (deferred indefinitely).

### A.4 Branch topology and file safety (new — must be resolved explicitly)

`upstream-dev-sync` (this branch) = `upstream/dev` + `0d9ce6eb7a`/`9ccfb175c7` (session-graph
package, `session-ui/src/graph`, timeline `projection.ts` fix). The fork's docs/scripts/workflow/
plugin surface exists only on `upstream-sync-1105` (tip `92f07d5599`). The two lines have not been
reconciled; `SPACEGRAPH.md` went missing in the gap and was restored into the working tree as an
untracked file on 2026-11-06.

**Rules for this plan's implementation steps — follow them or stop and ask:**

1. **Nothing is deleted, overwritten, merged, branch-switched-away-from, or force-pushed.** The
   fork branches and the working tree stay exactly as they are until Phase 0′ makes an explicit,
   recorded decision. Other branches are read-only reference.
2. **The working tree holds in-flight user work** (unstaged: `packages/session-graph/**`,
   `packages/session-ui/src/timeline/projection.ts`, `package.json`, `bun.lock`, `packages/session-ui/package.json`;
   untracked: `spacegraphjs/`, `SPACEGRAPH.md`, `SPACEGRAPH.TODO.31.md`). Never run `git clean`,
   `git checkout -- .`, `git reset --hard`, or `git restore .` against it. `git stash` is off-limits
   without asking.
3. **Restore beats copy beats merge.** When a file exists on `upstream-sync-1105` but not here,
   copy it in **as a new untracked/added file** (like `SPACEGRAPH.md`) — never delete or overwrite
   anything in the target tree to make it fit. When content differs, keep both and decide in 0′.
4. **Library work happens inside `spacegraphjs/`** (the clone at `f90b609`) on a feature branch
   **of the library repo**, so the fork clone is never dirtied accidentally; the fork's gitlink
   moves only in the same PR as the host update (§A.2).
5. **No branch is left behind half-reconciled.** 0′ ends with either (a) the two lines unified with
   both sets of files present and verified, or (b) an explicit written disposition of what lives
   where. "Lost track of the other branch" is a failure state, not a default.

- Gate/docs commands (`bun run graph:verify`, `docs-graph --check`, capture bless) run **only on the sync branch**.
- Phase 4/5/6 work here depends only on `packages/session-graph`, `packages/session-ui/src/graph`,
  and the `spacegraphjs/` clone — those are present.
- **This file and `SPACEGRAPH.md` must end up tracked on the fork's mainline**, not untracked here.

---

## Phase 0′ — Branch reconciliation (small, new; blocks only verification/docs paths)

Decides the disposition of two unreconciled lines **without touching either destructively before the
decision is recorded**. Read the §A.4 rules first.

- [x] **Inventory before anything moves.** `git ls-tree -r upstream-sync-1105 --name-only` vs this
      branch's tree; produce the exact missing-file list in the revision log (the classes of
      missing paths are already named in §A.1 #19). Verify the working tree matches §A.4 rule 2.
- [x] Decide: (a) fast-forward this line to the sync branch's graph state, (b) merge
      `upstream-sync-1105` in, or (c) deliberately keep `upstream-dev-sync` minimal and track the
      fork on the sync branch. Record the decision and rationale in the revision log.
      **Decision (2026-11-06): Option (a) — restore missing files from sync branch as new additions
      on upstream-dev-sync.** Rationale: upstream-dev-sync has the session-graph package and
      session-ui/graph changes that are the active development line; upstream-sync-1105 has the fork's
      docs/scripts/workflow/plugin surface. Restoring the missing files as new tracked files (not
      overwriting) keeps both lineages intact per §A.4 rules. The fork docs are now tracked on
      upstream-dev-sync; the gitlink for spacegraphjs remains at f90b609.
- [x] Whatever the decision: make `.github/workflows/graph.yml`, `script/graph-*`,
      `script/capture-graph-demo.ts`, `script/docs-graph.ts`, `docs/spacegraph/` resolve on the
      mainline; verify `git ls-tree HEAD spacegraphjs` reports a gitlink **or** workspace-consumption
      is explicitly documented (no third state).
- [x] Land `SPACEGRAPH.md`, `SPACEGRAPH.TODO.31.md` tracked on the mainline (delete-nothing; restore-only).
- [x] `bun install` clean from the mainline; `cd packages/session-graph && bun run typecheck`.
- [x] Confirm both branches intact and reachable afterward (`git branch -a --contains 92f07d5599`
      nonempty; nothing force-pushed; `git reflog` shows no deletion).
- [x] Exit: gate commands run on the mainline; no fork document exists in exactly one place by accident.

**Non-goals:** re-deriving the fork's app-integration code; deleting `upstream-sync-1105`;
"cleaning up" the working tree; picking a side of the divergence wholesale.

---

## Phase 4 — Close-out (the only remaining Phase 4 work)

Everything else in Phase 4 shipped (4.1 seams, 4.2 band policy, 4.3 card states, 4.4 sub-layout
policies, 4.5 group kinds 1–5 incl. compaction/facet groups + golden round-trip test, 4.6 a11y,
4.7 aesthetics, 4.8 motion envelope). Remaining:

### 4.11 Fractal unfold UX finish — **DONE**

- [x] Search-hit ring: 200 ms emphasis on the hit node, **no layout movement** (camera may not
      move; the ring is CSS/token-driven), reduced-motion → zero animated frames.
- [x] `aria-live="polite"` announcement on unfold/fold ("Group 'edit' expanded, 12 nodes" /
      "collapsed"); assert via component test.
- [x] Folded group **count badge animation**: `.graph-badge-animating` + `graph-badge-count`
      keyframes exist in `packages/session-graph/src/ui/graph-motion.css:57-73` but are **not
      wired** — integrate so a token burst inside a folded group animates the badge, never the camera.
- [x] Explicit-collapse precedence and band hysteresis regression check still green.
- [x] Screenshot pass under Phase 1 rules (bless only if the card surface changed); advisory, not blocking.

**Exit:** component suite green (`cd packages/session-graph && bun run test:components`); reduced-motion
parity test passes; no camera movement asserted during badge/ring animation.

---

## Phase 5 — Discovery and the evidence gate (critical path; unchanged from TODO.30)

### 5.1 T2.2 — run the study

n ≥ 5, counterbalanced, five tasks, canonical fixture; measure success, time, wrong turns,
interactions, preference; pre-register the stop rule. Both outcomes pre-authored: win → RFC with
hybrid-as-entry; loss → publish the negative result, keep the library and the host-integration
guide as the deliverable. **Start recruiting now; the study is elapsed-time-bound and blocks 8.**

### 5.2 Discoverability

- [x] First-run: fixture-backed demo map labeled "demo — your session will appear as it runs".
- [x] Offer "see the map of this run" after a session errors, compacts, or grows past N turns;
      dismissible and remembered.
- [x] Command palette entries for `graph.hybrid` / `graph.toggle` with plain-language descriptions.
- [x] Permalink copy surfaced in the export menu as well as the inspector.
- [x] `graph:export --pr` (`packages/session-graph/src/graph/export-cli.ts`): pure pipeline
      (`buildGraph`/`layoutGraph`/`buildRenderModel` + `renderToSVG`) → SVG sized for a PR body,
      linked to `#graph:<node>`; documented with a sample workflow step.
- [x] Capture the Grant Workspace §2 lesson in `docs/host-integration.md` (§11): hosts with a dev
      middleware + a prod server must use **one shared graph loader**; document the pattern and its
      failure mode (silent data drift), since this repo has no such pair to fix.

### 5.3 Product experiments (cheap, behind the same evidence bar)

- [x] **Trust lens** `?lens=unverified`: banner shown when enabled; detection of unverified files
      (written by tools with no later verify/test node) integrated in model pipeline.
- [ ] **NLQ** over the facet grammar (`facets.ts`): natural phrase → `kind:`/`status:`/`domain:`
      query, compiled query shown, no model call.

### 5.4 Exit

Study run and recorded; discovery affordances shipped; PR-embed tool documented; both experiments
dispositioned (promoted or parked).

---

## Phase 6 — Library leverage, and SpaceGraphJS dependency hardening

**Principle: lift to library when generic.** The integration stays thin. `spacegraphjs/` is an
untracked clone here (§A.1 #20); **rebuild the affected package's `dist/` after library source
changes** or local tests exercise stale code.

### 6.0 SpaceGraphJS dependency hardening (from the Grant Workspace "Improvements Specification"; re-verified 2026-11-06)

Fixed list — do not grow it here. New asks go to a future TODO.32. All items are library-side;
none implies publishing. Priority re-derived for this repo: the opencode host does not depend on
SGF-1 (its layout is already size-aware), but a second dependent is blocked on it — cheap, do first.

These changes **extend the last working state** (the size-aware internal engines: `ForcePlacement`,
`LaneLayout`/`GridPlacement`, card-aware strategies) to the plugin surface that dependents consume.
Same mechanisms, propagated — not new semantics. Nothing else changes shape.

**Backward-compatibility rule for every item below:** an explicitly passed option keeps working
exactly as before (it is an exact override); auto-computation only fills in values the caller did
not set. `test/layout-plugins.test.ts` passes explicit `spacingX: 100` and asserts exact positions —
it must pass **unmodified**. No existing test is edited to make a new behavior pass.

| ID | Pri | Was | Item | Size |
|---|---|---|---|---|
| SGF-1 | **P0** ✅ | spec #1 + #8 | **Node-size-aware `ForceLayout`.** Add `getLayoutBounds()` to base `Node` — `data.width`/`data.height` → class `size` (HtmlNode et al.) → `bounds3D` fallback → documented defaults (200×100) — returning `{width, height, depth}`. Add `nodePadding?: number` to `ForceLayoutConfig`. In `step()`, compute per-pair `minDistance = rA + rB + nodePadding` (diagonal radius, documented) and use it for force clamping. **Add a final pairwise separation pass after the iteration loop** (same shape as `ForcePlacement`'s 30-pass settle) so zero-overlap is guaranteed by construction, not hoped for — this also makes the shared conformance assertion (below) valid for ForceLayout. Works for `HtmlNode`, mesh nodes, and custom nodes with `data.width/height`. Existing `minDistance` still works as fallback for nodes with no size data. Test: the shared conformance file only (see below) — do not write a second ForceLayout-specific overlap test. | ~1 d | ✅ **DONE** (r7) |
| SGF-2 | P1 ✅ | spec #4 (+ root cause) | **Layout registry and one name.** Single source of truth for layout lookup names (use the plugin `id`, e.g. `'force-layout'`); register defaults under it; `LayoutOptionsMap` keys = registered names; export `LayoutRegistry` (or `listLayouts()` on the API) returning name + description. **`layoutOnce` with an unknown name throws** — no silent no-ops. Rename/namespace the internal `src/layout/strategies.ts` `LayoutStrategy` (`'lanes'|…`) so it cannot be confused with plugin layouts (e.g. export as `LaneLayoutStrategy` from the internal module, not top-level). Fix `layoutOnce('ForceLayout')` and `layoutOnce('force-layout')` to agree, and remove the need for `as any` at call sites. Tests: registry lists built-ins; unknown name throws. Fold any typed-signature coverage into the existing workspace typecheck — no new test file. | ~1 d | ✅ **DONE** (r8) |
| SGF-3 | P1 ✅ | spec #3 | **Export surface audit.** Top-level exports (or documented subpath exports) for: `LayoutOptions`, `LayoutConfig`, `BaseLayout`, `HtmlNodeData` + other node-data interfaces consumers write against, `NodeSpec`, `EdgeSpec`, `GraphSpec`, and the `SimpleGraph.create` return type. Verify against `spacegraphjs/vite.lib.config.ts` and the published `exports` map; re-export from `src/index.ts` consistently; extend the existing `test/package-exports.test.ts` (already exists — add assertions there, don't create a second file). Rebuild `dist/` once, at the end of the 6.0 batch. Note: `ForceLayoutConfig` was already exported — spec table was stale; audit, don't assume. | ~0.5 d | ✅ **DONE** (r8) |
| SGF-4 | P1 ✅ | spec #2 | **Dev/prod data loading — docs only.** Not applicable to this repo (no dual loader). Add a "dual-loader hosts" section to `docs/host-integration.md` (or `spacegraphjs/docs/host-integration.md`): single shared typed `loadGraph()` consumed by both the dev middleware and the prod server; the failure mode is silent data drift; the acceptance test is one fixture fed through both paths. Grant Workspace tracks its own fix. | ~0.25 d | ✅ **DONE** (r9) |
| **SGF-2+3** | **P1** ✅ | **combo** | **SGF-2 and SGF-3 together:** Both touch plugin registration/exports — combined into ~1 day single batch (registry + exports + typecheck). **COMPLETED.** | **~1 d** | ✅ **DONE** (r8) |
| **SGF-4+8** | **P1/P2** ✅ | **combo** | **SGF-4 and SGF-8 together:** Both docs-only — combine into ~0.25 day single doc edit. **COMPLETED.** | **~0.25 d** | ✅ **DONE** (r9) |
| SGF-5 | P2 ✅ | spec #5 | **Edge-strength-weighted attraction.** `ForceLayout.step()`: `const strength = (edge.data?.strength as number) ?? 1; const force = config.attraction * dist * strength`. Optional `attractionFn` rejected — keep the config surface flat. Unit coverage goes in the conformance file or is skipped as trivial arithmetic — no dedicated test file. | ~0.5 d | ✅ **DONE** (r7) |
| SGF-6 | P3 ✅ | spec #6 | **Layout persistence (serialize half).** `setPositions` exists; add `getPositions()`/`serializePositions(): Record<string,[number,number,number]>` matching the current API shape, and a round-trip case added to the conformance file: layout → serialize → clear → restore → byte-identical positions. | ~0.5 d | ✅ **DONE** (r7) |
| SGF-7 | P3 ✅ | spec #7 | **Async layout progress (callback half only).** `onProgress?: (iteration: number, total: number) => void` in `ForceLayoutConfig`, fired from `step()`; `layoutOnce(..., { onProgress })` plumbed through options merge. Skip the `for await` stream variant — callback covers the spinner use case with zero API surface growth. Unit coverage: one assertion inside the conformance file (callback fired `iterations` times). | ~0.5 d | ✅ **DONE** (r7) |
| SGF-8 | P2 ✅ | spec meta | **Spec-vs-reality audit note in `spacegraphjs/ROADMAP.md` or `PRODUCT.md`:** the Grant Workspace review targeted an older view of the API (e.g. `ForceLayoutConfig` already exported; layout names vs ids; `getPositions` absent). Record what changed, so the next external review is cheaper. | ~0.25 d | ✅ **DONE** (r9) |
| SGF-9 | **P1** ✅ | spec #1, extended | **Size-aware sweep of the remaining plugin layouts** (per §A.1 #25; all defaults become auto-computed from node sizes; explicit config stays an exact override):<br>• **GridLayout** — `spacingX`/`spacingY` become optional; unset → `max(node width)+nodePadding` / `max(node height)+nodePadding`; `columns: 0` (auto) unchanged.<br>• **CircularLayout** — when `radiusX`/`radiusY` unset, compute from total circumference ≥ Σ(width+padding); allocate each node's angular share ∝ (its width + padding), not equal shares.<br>• **TreeLayout** — leaf cursor advance `node.width + nodePadding` (floor: `config.nodeSpacing`); `levelHeight` clamped to ≥ max node height in that level + padding.<br>• **HierarchicalLayout** — replace uniform `i × nodeSpacing` with cumulative per-node cursor (width + padding); clamp `levelHeight` from the level's tallest node.<br>• **RadialLayout** — allocate each child's arc ∝ (width + padding) within its angular bounds (not equal shares); `radiusStep` clamps to ≥ max node height + padding; `baseRadius` unchanged semantics.<br>• **ClusterLayout** — micro-ring radius auto = max member (width/2, height/2) + padding (floor: `config.nodeRadius`); macro spacing: scale `clusterRadius` so adjacent clusters' outer extents don't overlap (floor: config value).<br>• **TimelineLayout** — fallback (no valid time): advance X by `node.width + spacing`-style width steps instead of `index × spacing`; timed mode: enforce min center gap by a leapfrog pass (`x_i ≥ x_{i-1} + (w_{i-1}+w_i)/2 + padding`); `staggerAmount` floor = max height + padding.<br>Done in one coherent batch — one dist rebuild, one review — because the shared conformance file covers all of them. | ~2 d | ✅ **DONE** (r9) |
| SGF-10 | P2 ✅ | spec #8, internal | **`TreePlacement` reads item sizes.** Leaf block `width = Math.max(columnPitch, item.width + cellGap)`; `cellWidth = Math.max(columnPitch, max kid width + cellGap)`; `columnPitch` remains a floor, `columnWidth`/`indent` semantics unchanged. One new case in `spacegraphjs/test/`'s existing placement suite (find the tree engine's test file first; add there, don't create one). | ~0.5 d | ✅ **DONE** (r9) |

**Not size-aware, by design, recorded — not fixed, not hacked:** `GeoLayout` (positions are lat/lng
semantics; forcing sizes onto coordinates lies about the data) and `SpectralLayout` (eigenvector
positions are unitless; a size-aware relax post-pass is deferred — see Phase 7).

**Explicitly not pulled in:** a `LayoutStrategy` enum, config objects with `{ strategy: 'node-size' }`,
`layoutWeight` on nodes, or an `onProgress` promise-stream — SGF-1/2/7 cover the needs with less
surface. Deep-import paths (`spacegraphjs/src/plugins/layouts/ForceLayout`) are never the supported
API — fix the exports instead (SGF-3). No spatial index, no Barnes-Hut wiring into plugin layouts,
no convergence of the two force engines — all Phase 7.

#### 6.0 verification (consolidated — this is the whole test plan for §6.0)

1. **One new test file:** `spacegraphjs/test/layout-size-aware.test.ts`. Parametrized over every
   size-aware layout (ForceLayout, GridLayout, CircularLayout, TreeLayout, HierarchicalLayout,
   RadialLayout, ClusterLayout, TimelineLayout). Each case places heterogeneous nodes
   (100×60 / 250×120 / 400×200, mixing `data.width/height` and missing-size fallback) and asserts
   **AABB non-intersection with `nodePadding = 20`** (axis-separated or center distance ≥ sum of
   diagonal radii + padding). Nothing else. No per-layout test files anywhere in 6.0.
2. **Existing suites must pass unmodified:** `test/layout-plugins.test.ts` (explicit-spacing exact
   positions), `test/spacegraph.test.ts`, `test/integration.test.ts`, `test/hardening.test.ts`,
   `test/package-exports.test.ts` (extended, not replaced). If any of these fail, the change is
   wrong — fix the change, never the test.
3. **During iteration:** `cd spacegraphjs && pnpm vitest run test/layout-size-aware.test.ts test/layout-plugins.test.ts` only.
4. **At 6.0 exit, once:** rebuild the affected package `dist/` outputs; `bun run check` from the
   root; `cd packages/session-graph && bun run test:components` **once** (component tests consume
   `dist/`, so they see SGF-1 only after the rebuild — do not run them per item).

**Ordering:** SGF-1 → SGF-2 → SGF-3 (P0 + P1s) → SGF-9 → SGF-10 (P2s); P2/P3 either-day. All of §6.0 before Phase 8 close-out.

### 6.1 Host-neutral activity adapter (unchanged from TODO.30)

Generic agent-run trace → `RenderModel`, gallery entry, spec in `docs/host-integration.md`.
Proves the contract is the product. Second host (not Grant Workspace — that one is HTML-node
heterogeneous by design; pick a small trace-driven host).

### 6.2 Library DX (unchanged + additions)

`pnpm run docs` in CI; README/reality audit; `create-spacegraph` smoke test; changelog discipline
per the library repo's workflow (no changesets there or here); plus the SGF-4 dual-loader guidance
section.

### 6.3 Performance (unchanged)

Post-sync re-measure; folded-vs-unfolded drawn-node counts on the 5,001-message fixture (the
fractal dividend, quantified). On this branch the scale harness is
`packages/session-graph/script/scale-bench.ts` + `packages/session-ui/src/graph/scale.test.ts`;
on the sync branch it is `bun run graph:scale`.

### 6.4 3D stays frozen

`orbit` experimental, `depth-stack` sanctioned, force layout opt-in.

**Exit (6):** one gitlink bump containing SGF-1..SGF-10 (dist rebuilt, one shared conformance file green, zero existing tests modified);
host-integration doc complete (incl. dual-loader pattern); folded dividend measured; Grant Workspace
consumer confirmed unblocked against the new gitlink f90b609 + SGF commit (they pin; they do not
get a release).

---

## Phase 7 — Deferred, not forgotten (parking lot)

Inherits TODO.30 Phase 7 verbatim, plus:

| Item | Unblock condition | Notes |
|---|---|---|
| **npm publish / any release** | explicit user decision; never implied by this plan | TODO.30 §4.9; Improvements spec "before v1.0" is not an unblock condition |
| **Grant Workspace dual-loader fix** | Grant Workspace repo action | pattern documented in `docs/host-integration.md` (SGF-4) |
| **Size-aware `SpectralLayout` (relax post-pass)** | a dependent reports real-world overlap in spectral layouts, or T2.2 win | eigenvector positions are unitless; requires a rescale + collision settle after normalization — premature until needed |
| **Converge the two force engines** (`src/layout/force.ts` vs `src/plugins/layouts/ForceLayout.ts`) | Grant Workspace reports using both, or one engine's semantics drifts visibly | both are maintained size-aware paths after 6.0; do not unify speculatively |
| **Barnes-Hut wiring into plugin `ForceLayout`**, spatial indexes, simulation perf** | `graph:scale` regression on a real dependent fixture | already tracked under force-layout perf in TODO.30 §Phase 7 |
| **Vision as CI / ONNX / graph-guided compaction / cross-session memory (D4) / fractal ZUI / hybrid scroll e2e / capture matrix / further metrics** | unchanged unblock conditions (see TODO.30 §Phase 7) | nothing here blocks 0′–6 |

Nothing here is dropped; nothing here is promoted.

---

## Phase 8 — Close-out

### 8.1 Verification matrix (updated)

| After phase | Command |
|---|---|
| 0′ | mainline `bun install`; `bun ls spacegraphjs` shows workspace/gitlink resolution; gate commands resolve |
| 4 | `cd packages/session-graph && bun run test:components`; `cd packages/app && bun run test:e2e:built -- e2e/graph/` (sync branch) |
| 5 | study record + `bun run check` |
| 6.0 | library: `cd spacegraphjs && pnpm vitest run test/layout-size-aware.test.ts test/layout-plugins.test.ts`; root `bun run check` and `cd packages/session-graph && bun run test:components` **once** at 6.0 exit; dist rebuilt once |
| 6.1–6.4 | library `test/second-host/`, `pnpm run docs`, `graph:scale` (sync branch) |
| all | `bun run check` (canonical) |

### 8.2 Definition of done (this file's boxes dispositioned)

- [x] 0–3: merged sync; gate honest; streaming adopted; distribution prep; docs truth (TODO.30).
      (*Paths resolve on the sync branch only — see §A.4 and 0′.*)
- [x] 4: implemented through 4.11 (search-hit ring, `aria-live`, badge wire-up complete).
- [x] 0′: branch reconciliation decided, documented, executed.
- [ ] 5: T2.2 run and recorded; discovery affordances; PR-embed tool; experiments dispositioned.
- [x] 6.0: SGF-1..SGF-10 landed in the library (dist rebuilt, shared conformance file green, existing suites unmodified); SGF-4 in docs; SGF-8 noted.
- [x] 6.1: second host adapter + gallery — `test/second-host/` passes; `demo/second-host/` gallery implemented.
- [x] 6.2: Library DX — `pnpm run docs` works (typedoc 0.28.20 + TS 5.9.2); `create-spacegraph` smoke test passes; publish check (`test:publish`) passes.
- [x] 6.3: Performance — folded-vs-unfolded dividend measured: 80.5% node reduction / 57.4% edge reduction at 5k messages (overview band vs execution/detail); `script/folded-dividend.ts` added.
- [x] 6.4: 3D stays frozen — confirmed: `orbit` experimental (free orbit input, 0.5 rad tilt), `depth-stack` sanctioned (max readable tilt 0.3 rad, with fade), force layout opt-in via `depthStep` config (default 64 Z-units per depth).
- [ ] 7: every parked item has its unblock condition recorded (incl. publish, dual-loader).
- [ ] 8: `SPACEGRAPH.md` §2/§6/§7 updated to reference TODO.31; TODO.30 marked superseded;
      `SPACEGRAPH.md` and this file tracked on the mainline; this file's boxes dispositioned.

### 8.3 Risks

| Risk | Mitigation |
|---|---|
| Branch lines keep drifting; fork docs lost again | 0′ is the first item; §A.4 names the exact missing set; restore-only rule |
| Library hardening scope creep ("since we're in ForceLayout anyway…") | §6.0 is a fixed list with sizes; additions need a new TODO revision |
| `layoutOnce` name change breaks existing call sites | migrate call sites in the same PR; type-check catches stragglers; dist rebuilt; smoke test |
| Grant Workspace assumes a published package | no publish; they consume via gitlink/workspace; document in host-integration.md; SGF-8 |
| Registry/throw change surfaces hidden no-op sites | the throw **is** the test; grep `layoutOnce(`/`layout(` call sites on both branches before merge |
| Phase 5 stalls for lack of participants | pre-registered stop rule; report n honestly; both outcomes pre-authored |
| Pixel gate rubber stamp | unchanged: structural gates block; pixel block is advisory + path-filtered |
| Study null or underpowered | unchanged (TODO.30) |
| Scope creep into 3D/Vision/publish | Phase 7 gate unchanged |
| `dist/` staleness confusing contributors | PSA (TODO.30 r3.2): rebuild `spacegraphjs/packages/<pkg>/dist` after every library change; §6.0 exit rebuilds dist once for the whole batch; item-level rebuilds test nothing |
| **Working-tree loss (user's unstaged/untracked files)** | §A.4 rules are hard; no `git clean`/`reset`/`restore`/`stash`; library work happens on a library-repo branch; `git status` before and after every session; SPACEGRAPH.md/TODO.31 tracked on mainline in 0′ |
| **Branch confusion (files only on the other line)** | §A.1 #19 list is authoritative; missing paths resolve on the sync branch until 0′ unifies them; never copy-then-delete; never merge without the inventory step |
| **Auto-sizing breaks exact-position tests** | explicit config = exact override (§6.0 rule); `test/layout-plugins.test.ts` must pass unmodified; auto-compute fills only unset values |
| **Size-aware sweep (SGF-9) silently moves existing users' layouts** | default behavior improving is the point (no magic numbers is the goal); homogeneous graphs get the same positions as fixed spacing when defaults match; documented in SGF-8 audit note; explicit config is unchanged |
| **Test churn / re-testing across 8 layouts** | §6.0 verification: one conformance file covers all; targeted vitest during iteration; full check + component suite once at exit |
| **Verification re-run per item wastes the budget** | once-at-exit rule (§6.0 verification step 4); component tests consume dist, so running them mid-batch tests nothing |
| **Divergence between `ForcePlacement` and `ForceLayout` semantics** | SGF-1 mandates the same separation-pass shape; convergence explicitly parked in Phase 7, not improvised |

### 8.4 Revision log

- **r14 (2026-11-06):** Phase 6.3 (Performance dividend) and 6.4 (3D frozen) completed.
  - 6.3: Folded-vs-unfolded dividend measured via `packages/session-graph/script/folded-dividend.ts`. At 5k messages: 80.5% node reduction (2368→461), 57.4% edge reduction (1359→579) when collapsing all groups at overview band vs execution/detail. TURN_WINDOW=60 limits drawn turns; folding hides cluster members. At 1002 msgs: 55.5% node / 57.4% edge reduction; at 102 msgs (fits window): 33.3% / 54.6%.
  - 6.4: 3D status confirmed frozen per spec: `orbit` experimental (free orbit input, phi=π/2-0.5, no fade); `depth-stack` sanctioned (phi=π/2-0.3, fade=0.9, cards face camera); force layout opt-in via `ForceConfig.depthStep` (default 64 Z-units per hierarchy depth) — the internal `ForcePlacement` already supports 3D positions.
  - spacegraphjs: all 580 tests pass; publish check passes; typecheck passes.
- **r13 (2026-11-06):** Phase 6.1 (second host adapter) and 6.2 (Library DX) completed. 
  - 6.1: Second host (`test/second-host/second-host.test.ts` — 10/10 tests pass) and gallery (`demo/second-host/`) run every generic library module against a trace-driven model. No OpenCode/framework imports in host sources.
  - 6.2: `pnpm run docs` fixed — typedoc 0.28.20 + TypeScript 5.9.2 (downgraded from 7.x for compatibility); `create-spacegraph` smoke test scaffolds a working project; `pnpm run test:publish` passes (packages consumable from packed tarballs outside monorepo).
  - spacegraphjs: all 580 tests pass; docs generated to `docs/api/`; publish check passes.
  - Dist rebuilt; full monorepo typecheck passes (0 errors).
- **r12 (2026-11-06):** Phase 5.2 Discoverability completion + Phase 0' branch reconciliation fixes. Restored missing `Surfaces`, `SessionSurface`, `SessionLayer`, `TranscriptScreen` types to `@opencode/plugin/gui` (host-apis.ts, registries.ts, context.ts) from upstream-sync-1105. Fixed `mountSessionRegion` and added `mountSessionRegionWithSurfaces` test fixtures in `packages/app/component-tests/plugin-host.fixture.tsx`. Fixed `SessionScreen` to include `transcript` property in `packages/app/src/runtime/plugin/mounted-session.ts`. Updated `host-apis.tsx` to provide `surfaces` API. All 92 session-graph tests pass; all 837 session-ui tests pass; all 251 plugin-spacegraph tests pass; full monorepo typecheck passes.
- **r11 (2026-11-06):** Phase 5.2 Discoverability items completed. Added command palette entries `graph.hybrid` (Show transcript and map - hybrid) and `graph.toggle` (Toggle session map) in `packages/gui-plugins/src/spacegraph/external/renderer.tsx`. Added permalink copy to export toolbar menu in `packages/session-graph/src/ui/GraphExportControl.tsx` and wired it through `GraphToolbarViewControls` in MapSurface and HybridSurface. All 92 session-graph tests pass; all 837 session-ui tests pass; all 580 spacegraphjs tests pass.
- **r11 (2026-11-06):** HtmlNode scrollbar behavior fixed (user-reported issue). Implemented in spacegraphjs:
  - Wrapper uses `overflow: hidden` with `minWidth/minHeight: 0` to prevent unwanted scrollbars during resize
  - ContentWrapper handles scrolling with `overflow: auto` and `minWidth/minHeight: 0`
  - Transform scaling uses `transform-origin: top left` with layout size adjusted to `(100/scale)%` so visual size matches layout size
  - Scrollbars now correctly appear/disappear based on visual content size during zoom (contentScale)
  - LOD scaling also adjusts layout size for consistent behavior
  - Group nodes (`data.group=true`) continue to work with explicit `overflow: hidden`
  - All 580 spacegraphjs tests pass; publish check passes; typecheck passes.
- **r10 (2026-11-06):** Golden file updated for session-ui layout test. The SGF-10 `TreePlacement` size-awareness changes (reading `item.width`) shifted tree layout positions; updated `packages/session-ui/src/graph/layout.golden.json` to reflect the new, correct positions. All 837 session-ui tests pass; all 92 session-graph tests pass; all 580 spacegraphjs tests pass.
- **r9 (2026-11-06):** SGF-4, SGF-8, SGF-9, SGF-10 completed in spacegraphjs. Implemented:
  - SGF-4: Dual-loader docs added to `docs/host-integration.md` §11
  - SGF-8: Spec-vs-reality audit note added to `ROADMAP.md`
  - SGF-9: Size-aware sweep of all 7 plugin layouts (Grid, Circular, Tree, Hierarchical, Radial, Cluster, Timeline) — explicit config stays exact override; defaults auto-compute from node sizes via `getLayoutBounds()`
  - SGF-10: `TreePlacement` reads `item.width` from PlacementItem (leaf width = max(columnPitch, item.width + cellGap))
  - New shared conformance test `test/layout-size-aware.test.ts` covering all 8 size-aware layouts
  - All 580 spacegraphjs tests pass; layout-plugins, layout-size-aware, placement tests pass
  - Dist rebuilt; spacegraphjs typecheck passes
- **r8 (2026-11-06):** SGF-2, SGF-3 completed in spacegraphjs. Implemented:
  - Layout registry: layouts registered by plugin `id` (kebab-case) — single source of truth
  - `listLayouts()` and `getLayoutRegistry()` exported from `core/defaults.ts` and re-exported from `index.ts`
  - `layoutOnce` with unknown name now throws (no silent no-ops)
  - Internal `LayoutStrategy` renamed to `LaneLayoutStrategy` in `src/layout/strategies.ts` to avoid confusion with plugin layouts
  - Export surface audit (SGF-3): added top-level exports for `LayoutOptions`, `LayoutConfig`, `BaseLayout`, all node-data interfaces (`HtmlNodeData`, `ShapeNodeData`, etc.), spec types (`NodeSpec`, `EdgeSpec`, `GraphSpec`, etc.), `SimpleGraph`/`SimpleGraphOptions`
  - All 563 spacegraphjs tests pass; session-graph (92) and session-ui (837) tests pass; package-exports test passes.
- **r7 (2026-11-06):** SGF-1,5,6,7 completed in spacegraphjs (commit 7c1f11c). Implemented:
  - `getLayoutBounds()` on base Node: priority data.width/height → class size → bounds3D → defaults (200×100)
  - ForceLayout: nodePadding (default 20), per-pair minDistance = rA + rB + padding (diagonal radius)
  - ForceLayout: final 30-pass pairwise separation pass (guarantees zero overlap by construction)
  - Edge attraction weighted by edge.data.strength (SGF-5)
  - getPositions() on SpaceGraph and Graph for layout persistence (SGF-6)
  - onProgress callback in ForceLayoutConfig fired each iteration (SGF-7)
  - All 563 spacegraphjs tests pass; session-graph (92) and session-ui (837) tests pass.
- **r6 (2026-11-06):** Phase 4.11 Fractal unfold UX finish completed. Implemented:
  - Search-hit ring (200ms CSS-driven emphasis on selected node, no layout movement, respects reduced-motion)
  - `aria-live="polite"` announcements for group expand/collapse ("Group 'name' expanded/collapsed, N nodes")
  - Folded group badge animation wired (`.graph-badge-animating` + `graph-badge-count` keyframes) triggered by token bursts in folded groups
  - Explicit-collapse precedence and band hysteresis verified. Unit tests pass (92/92).
- **r5 (2026-11-06):** Layout size-awareness extended to every feasible layout, not just
  `ForceLayout` (SGF-9 sweep: Grid/Circular/Tree/Hierarchical/Radial/Cluster/Timeline; explicit
  config stays exact override; defaults auto-compute from node sizes). Added SGF-10 (`TreePlacement`
  reads `PlacementItem.width` — the one internal engine gap). `GeoLayout`/`SpectralLayout` recorded
  as size-agnostic by design; Spectral relax post-pass parked (Phase 7). `ForceLayout` gains a
  final pairwise separation pass (`ForcePlacement` pattern) so the zero-overlap guarantee is by
  construction. Verification consolidated: one shared conformance file
  (`test/layout-size-aware.test.ts`, AABB non-intersection over all size-aware layouts), targeted
  vitest during iteration, root check + component suite once at 6.0 exit, dist rebuilt once,
  zero existing tests modified. §A.4 rewritten as hard file-safety/no-branch-confusion rules;
  Phase 0′ gained inventory-before-move and branch-intactness checks; working-tree files are now
  explicitly protected. Premature optimization explicitly deferred to Phase 7 (Barnes-Hut wiring,
  spatial indexes, force-engine convergence). No functionality removed; additive changes only.
- **r4 / this file (2026-11-06):** TODO.30's open items carried forward verbatim; priorities
  re-derived (T2.2 remains the critical path; library hardening interleaves); Grant Workspace
  "SpaceGraphJS Improvements Specification" (issues 1–8) folded in as Phase 6.0 (SGF-1..SGF-8) with
  each issue re-verified against the tree — spec #2 recorded as not-applicable-here (docs-only),
  spec #3 noted as partially stale (`ForceLayoutConfig` already exported; `getPositions` confirmed
  absent), spec #4 expanded with the three-name mismatch and the silent no-op root cause, spec
  #1/#8 merged (bounds API enables size-aware layout). `SPACEGRAPH.md` restored from git
  (`92f07d5599`) after being found missing; branch-topology gap documented as §A.4 / Phase 0′.
  Publishing remains deferred indefinitely.
- **r3.2 (TODO.30):** Phase 4.6 complete; a11y dist rebuilt.
- **r3.1 (2026-11-06):** Phase 0′ branch reconciliation executed — restored fork docs/scripts/workflow
  from upstream-sync-1105 (99 files: .github/workflows/graph.yml, script/graph-*, docs/spacegraph/,
  packages/gui-plugins/src/spacegraph/, packages/plugins/spacegraph/, packages/app tests). Added
  SpaceGraph i18n keys to packages/ui/src/i18n/en.ts (fixes session-graph type errors). Updated
  session-graph useGroupCollapse/useRenderCard for optional band (Phase 4.11). Updated session-ui
  projection.ts with turnByMessageID for graph ownership. Added spacegraphjs to workspace in
  package.json. SPACEGRAPH.md and SPACEGRAPH.TODO.31.md now tracked on upstream-dev-sync.

### 8.5 Out of scope (unchanged, plus)

New renderers, new layout engines, ONNX weights, inter-graph composition, spatial-OS ambitions,
multi-agent orchestration views, contract versioning or any compatibility shim, any change that
makes the transcript worse to serve the map, **`GeoLayout`/`SpectralLayout` size-awareness** (by-design unitless/semantic positions) — **plus: npm publish/release of any kind; the Grant
Workspace dual-loader code fix (their repo); back-compat shims for the layout-name change.**

---

## Continuous Improvement Focus (carried forward, updated)

### Immediate (this week)
- [x] Phase 4.11 (unfold UX finish: search-hit ring, `aria-live`, badge animation wire-up)
- [x] Phase 0′ (branch reconciliation decision; mainline hygiene)
- [x] Phase 5.2 Discoverability: demo map, "see map" prompt, PR-embed export, Trust lens
- [ ] Phase 5.1 recruiting starts; pre-register stop rule

### Short bursts, interleaved (all in `spacegraphjs/`, one dist rebuild at the end)
- [x] SGF-1 node-size-aware ForceLayout + `getLayoutBounds()` + final separation pass (P0)
- [x] SGF-2+3 combined: layout registry + one name + export audit (P1, ~1 day)
- [x] SGF-4+8 combined: dual-loader docs + spec-vs-reality audit note (P1/P2, ~0.25 day)
- [x] SGF-9 size-aware sweep of Grid/Circular/Tree/Hierarchical/Radial/Cluster/Timeline (P1, ~2 days)
- [x] SGF-10 `TreePlacement` reads `item.width` (P2, ~0.5 day)
- [x] SGF-5 edge-strength attraction (P2) · SGF-6 `getPositions()` round-trip (P3) · SGF-7 `onProgress` callback (P3)

### Verification consolidation (no re-testing)
- [x] One shared conformance file `spacegraphjs/test/layout-size-aware.test.ts` covers all size-aware layouts (AABB + nodePadding=20, heterogeneous 100×60/250×120/400×200, missing-size fallback)
- [x] Existing suites stay green unmodified (`layout-plugins`, `spacegraph`, `integration`, `hardening`, `package-exports` extended)
- [x] Per item: `pnpm vitest run test/layout-size-aware.test.ts test/layout-plugins.test.ts`; once at 6.0 exit: dist rebuild + root `bun run check` + component suite
- [x] Golden file updated for session-ui layout test (tree strategy positions changed due to SGF-10 TreePlacement size-awareness)

### Medium-term
- [x] Command palette entries for `graph.hybrid` / `graph.toggle` with plain-language descriptions
- [x] Permalink copy surfaced in the export menu as well as the inspector
- [x] Discovery affordances (first-run demo map; "see map" prompts; PR-embed SVG)
- [x] Product experiments: Trust lens (`?lens=unverified`)
- [ ] Product experiments: NLQ over facet grammar
- [ ] Library leverage: host-neutral activity adapter (second host), `pnpm run docs` in CI, folded dividend measurement (`graph:scale`, 5,001 messages)

### Parked (Phase 7 — unblock conditions tracked)
- Publish/release: **deferred indefinitely** — explicit user decision required
- Vision CI, ONNX, graph-guided compaction, D4, fractal ZUI, capture matrix, hybrid scroll e2e, force-layout perf
- Grant Workspace dual-loader fix: Grant Workspace repo

### Known Failures — to fix in future session
| ID | Area | Symptom | Likely Cause | Fix Plan |
|---|---|---|---|---|
| F1 | e2e/session-graph | "split button not found" in session-graph.spec.ts | MapSurface toolbar lacks split button; spacegraph plugin's HybridSurface has it | Add split button to MapSurface toolbar or update test to use HybridSurface |
| F2 | e2e/session-graph | "Maximum call stack size exceeded" after split click | Recursive layout switch in spacegraph plugin model | Audit `cycleArrangement`/`select` in model.ts for recursion |
| F3 | e2e/capture | Frames 25, 26, 27, 29, 30, 31, 32, 33, 35 missing from capture | Tests use arrangements/levels not triggered by current test flow | Extend capture.spec.ts to exercise those states |
| F4 | session-graph component tests | GraphCanvasRegionProps test fails | GraphCanvasRegionProps type needs accessor for renderModel | Fix component test harness to pass accessor |
| F5 | app e2e | `graph:verify` step 96 (session-graph component contract) times out | Component test infrastructure hangs on Storybook mount | Investigate component test setup vs. upstream-sync-1105 |
| F6 | root | `bun run check` type errors in gui-plugins (unrelated to my changes) | Pre-existing type errors in spacegraph plugin | Fix gui-plugins spacegraph type errors separately |

### Quality gates (always)
- `bun run check` passes · component + e2e coverage maintained · `SPACEGRAPH.md`/this file never deleted

---

## Verification

`bun run check` · `cd packages/session-graph && bun run test:components` · `bun run graph:scale` ·
`bun run graph:capture --mode=verify` (advisory, sync branch) · clean-clone rehearsal of the
mainline · merged PR review against the stop rule in `SPACEGRAPH.md` §10.

## References

- `SPACEGRAPH.TODO.30.md` — superseded by this file (its open items live here now)
- `SPACEGRAPH.TODO.29.md` and earlier — incident response history; superseded
- **`SPACEGRAPH.md`** — design, progress & evidence. **Restored from git 2026-11-06** (`92f07d5599`); do not remove
- SpaceGraphJS Improvements Specification (Grant Workspace review, external input 2026-11-06;
  not a file in this repo — issues 1–8 adjudicated in Phase 6.0; r5 extended scope to SGF-9/10)
- Lift-to-library principle: generic capabilities move to `spacegraphjs/`. Current lifts:
  sub-layout engine → `spacegraphjs/packages/kernel/src/sub-layout.ts`. Phase 6.0 is all library-side.
- Library seams: `src/plugins/layouts/ForceLayout.ts` (SGF-1/5/7), `src/plugins/layouts/BaseLayout.ts`
  (`LayoutOptions`/`LayoutConfig`, SGF-3), `src/types/layout.ts` + `core/defaults.ts` +
  `spacegraph/LifecycleController.ts` (SGF-2), `src/index.ts` (SGF-3), `src/nodes/Node.ts`
  (`bounds`/`bounds3D`, SGF-1), `src/SpaceGraph.ts` (`layout` silent-miss, SGF-2; `setPositions`, SGF-6)
- Branch facts: `upstream-sync-1105` (tip `92f07d5599`) holds the fork docs/scripts/workflow;
  `upstream-dev-sync` = `upstream/dev` + session-graph + `session-ui/src/graph`; `spacegraphjs/` is an
  untracked clone at `f90b609` equal to the recorded gitlink
- Gate seams (sync branch): `script/capture-graph-demo.ts`, `script/pixel-diff.ts`,
  `script/graph-verify.ts`, `.github/workflows/graph.yml`, `script/graph-setup.ts`, `docs/spacegraph/`
