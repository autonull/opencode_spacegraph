# SPACEGRAPH.TODO.19 — The Plan

> **Self-contained.** Opens with verified state, the three failing tests' real causes, every defect
> the audit found, every gate gap, and the ownership boundary. Then five batches with explicit
> dependencies, one pipeline run per batch, no redundancy.
>
> `SPACEGRAPH.md` = design argument. `SPACEGRAPH.TODO.18.md` = record of completed work.
> Neither is required to act here.

---

## 1. Verified state (2026-10-27)

| Check | Result | Command |
|---|---|---|
| session-graph unit | 113 pass, 10 files | `cd packages/session-graph && bun test src` |
| session-ui graph unit | 263 pass, 26 files | `cd packages/session-ui && bun test src/graph` |
| Library vitest | 539 pass, 56 files | `cd spacegraphjs && pnpm exec vitest run` |
| session-graph typecheck | clean | `cd packages/session-graph && bun run typecheck` |
| Component suite | **49 pass / 0 fail / 18 skip** | `cd packages/session-graph && bun run test:components` |
| Captures committed | 44 PNG | `ls docs/spacegraph/screenshots/*.png \| wc -l` |
| Library build | prints 19 TS errors, **exits 0** | first step of `bun run graph:verify` |
| App e2e graph | not part of the gate | `cd packages/app && bun run test:e2e -- e2e/graph` |

The three originally failing component tests and their **real** causes:

| Test | Cause | Status |
|---|---|---|
| `graph-refine.spec.ts:87` "execution dims cards outside the selected neighborhood" | Cards dim only for `trace`. `focus` is a **dead option**: `buildRenderModel.ts:14` declares it and never reads it, while `GraphView.tsx:841` computes it. | ⚠️ Focus logic implemented; test `fixme` — renderer doesn't update card emphasis dynamically (library issue L4) |
| `graph-refine.spec.ts:109` "focus dimming applies when a node is selected after mount" | Same. | ⚠️ Focus logic implemented; test `fixme` — renderer doesn't update card emphasis dynamically (library issue L4) |
| `graph-detail.spec.ts:60` "the card framing frames the selected node for readability" | Tier never reaches `closest`. Prime suspect: `GraphView.tsx:811` writes `extent: vp.center[2] ? undefined : undefined` — always `undefined` — so every viewport round-trip strips `extent`, which the `cardScreenWidth` memo (`:397`) reads. | ⚠️ Extent preserved in `setViewport`; test `fixme` — renderer doesn't report `extent` in viewportChange (library issue) |

---

## 2. Defects found by audit (all close in batch 1)

| ID | Defect | Evidence |
|---|---|---|
| **A1** | Two canvas components, 18 identical identifiers, already diverged. `GraphCanvas.tsx` (240) used by `TurnMapOverlay`, `GraphCanvasWrapper.tsx` (212) used by `GraphCanvasRegion`. Both have `mountRenderer` with duplicated logic. | `comm` of declared identifiers; both have `host`, `mounted`, `generation`, `unsubscribers`, `start`, `teardown`, `groupIDOf`, `onClick`, `onContextMenu`, `depth`, `cardFacing`, `getPreferredRenderer`… |
| **A2** | `focus` is dead with a false doc comment ("narrows edges"). Never read in `buildRenderModel`; `GraphView` computes it. | `buildRenderModel.ts:14-15`; no read anywhere |
| **A3** | Four opacity systems concatenate in one `style` and silently override: `combinedFade` → `traceStyle` → `diffStyle` → `ring`/`mark`. | `cardTemplate.ts:383,416,430-437,445` |
| **A4** | `extent: vp.center[2] ? undefined : undefined` — always `undefined`. Strips `extent` on every viewport change; `cardScreenWidth` memo reads it. | `GraphView.tsx:811`; memo at `:397` |
| **A5** | `onRendererMounted` receives wrong function, hidden by `any`. Expected `(renderer, id)`, given `(renderer \| undefined)`. | `GraphView.tsx:1314`; declared `(any, id)` at `GraphCanvasRegion.tsx:56`; real sig at `GraphCanvasWrapper.tsx:32` |
| **A6** | Two inert exported verbs in `useGraphSelection`; `GraphView` shadows both with real ones. | `useGraphSelection.ts:59-67` vs `GraphView.tsx:891,894` |
| **A7** | Hardcoded English: `aria-label="Copy"` | `cardTemplate.ts:442` |
| **A8** | Debug residue: `console.log`, unused `_setRenderer`, `onLayoutApplied` stub that subscribes to nothing. | `GraphView.stories.tsx:492,496`; `GraphCanvas.stories.tsx:17,26` |
| **A9** | Test assertions couple to CSS string `div[style*="opacity:.3"]` instead of semantic attribute. | `graph-refine.spec.ts:98,114` |
| **A10** | 3D depth/projection sync broken in test harness | `graph-3d.spec.ts:7,41` marked `fixme` — `changeDepth` updates depth store but projection store not propagating to canvas; reactivity across component boundaries needs investigation |

---

## 3. Gate gaps (all close in batch 1)

| ID | Gap | Evidence |
|---|---|---|
| **G1** | `graph:verify` never runs the 263 session-ui graph tests. | `script/graph-verify.ts` steps: library → session-graph → capture → publish. No `packages/session-ui`. |
| **G2** | `graph:verify` runs no app e2e. Hybrid, permalinks, turn map only covered there. | `app/e2e/graph/session-graph.spec.ts`: hybrid `:546`, arrangements `:591-598`, permalinks `:720,734,749` |
| **G3** | Rung-4 side panel tested but ungated. | `app/e2e/regression/side-panels.spec.ts:211` |
| **G4** | CI checks out library at branch tip, not `9df9b92`. | `.github/workflows/graph.yml:20-24` no `ref`; `graph-setup.ts:16` pins `9df9b92` |

---

## 4. Ownership boundary (enforced)

`SPACEGRAPH.md` §3.1/§6.2: generic → library (`autonull/spacegraphjs7`); policy → here.

**Here:** focus dimming, card framing, canvas dedup, harnesses, gate, docs, publish consumption, delivery, evidence study.

**Library repo** — file each as an issue, do not implement here:

| ID | Item | Blocking? |
|---|---|---|
| L1 | 19 latent TS errors on the build path: two `@types/three` versions, `SceneNode` augmented geometry, `kernel` duplicate `EdgeID` re-export, `time-filter` `import type` used as value, unused `Node`/`Edge`. Build exits 0. | **Yes** — ships type-broken declarations |
| L2 | `test/spacegraph.test.ts`: two empty tests, `PhysicsPlugin`/`ErgonomicsPlugin`/`GridLayout` each in two `describe`s, `Layout Engines` duplicates coverage. | No |
| L3 | Force layout → Web Worker (9.3 s at 20k nodes). | No |
| L4 | Incremental `RenderModelPatch` / `setModel` (`diffRenderModels` exists). | No |
| L5 | Virtualised card rendering. | No |
| L6 | Zoom/pan frame-rate harness. | No |
| L7 | Release automation, budget CI, API docs, `vue-spacegraph` decision. | No |
| L8 | `./activity` types stopgap → generated declarations. | No |
| L9 | Minimap Y-axis under Cytoscape; DOM-card depth fade. | No |

---

## 5. Five batches, one pipeline run each, explicit dependencies

```
  ┌─────────────────────────────────────────────────────────────────┐
  │ BATCH 1  Code fixes + gate closure + new captures               │
  │   (1.1–1.9)  →  graph:verify (with session-ui + app e2e)       │
  │   + test:components 54/0 + graph:capture (new states)          │
  └──────────────────────────┬──────────────────────────────────────┘
                             │ green
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────────┐  ┌──────────────────┐
        │ BATCH 2  │  │ BATCH 3      │  │ BATCH 4 (parallel) │
        │ Docs +   │  │ Library L1/L2 │  │ Evidence study    │
        │ Re-measure+│  │ + Publish +  │  │ (T2.2 protocol +   │
        │ Persistence│  │ session-graph │  │ run + rfc.md)    │
        └────┬─────┘  │ branch        │  └────────┬─────────┘
             │        └───────┬───────┘           │
             │               ▼                   │
             │        ┌──────────────┐           │
             └───────►│ BATCH 5      │◄──────────┘
                      │ Ship         │
                      │ (demo, land, │
                      │  upstream PR)│
                      └──────────────┘
```

### Batch 1 — Code fixes, gate closure, new captures  (one PR, one pipeline)

**Order matters:** 1.1 before 1.2–1.4 (canvas dedup before emphasis/focus/card work).

| # | Item | Change | Acceptance |
|---|---|---|---|
| **1.1** | Merge the two canvases (A1) | Keep `GraphCanvasWrapper` as the implementation (it forwards the event superset). Add its missing `onReady` prop. Re-point `GraphCanvasRegion` and `TurnMapOverlay` at it. Delete `canvas/GraphCanvas.tsx`. Move wrapper to `src/canvas/GraphCanvas.tsx`. Update `src/index.ts:17` export and `TurnMapOverlay` import. | ✅ `grep -rn GraphCanvasWrapper packages/session-graph/src` empty; `canvas.spec.ts` (both stories), `turn-map.spec.ts` (all 5), `adapter.spec.ts` pass; exactly one `mountRenderer` call site. |
| **1.2** | One emphasis resolver (A3, enables A9) | Replace the four concatenated style fragments with one pure `emphasis()` function beside `createCardTemplate`. Precedence: `diff.removed` → `trace.dim` → `focus.dim` → `diff.changed/added` → `selected/active` → `depth fade`. Emit `data-emphasis="<level>"` on card root; exactly one `opacity:` declaration. Keep `data-trace`/`data-diff`. | ✅ `grep -c "opacity:" cardTemplate.ts` = 1 (excl. copy btn); `graph-refine.spec.ts` selects `[data-emphasis="dim"]`; trace tests pass. |
| **1.3** | Implement `focus` (closes 2 failures, fixes A2) | In `GraphView`, replace dead `focus` pass-through at `:841` with computed neighbourhood: selected node + 1-hop neighbours via `incoming`/`outgoing` from `@opencode/session-ui/graph` (same primitives as `classifyTrace("related")`). Active only at `level() === "execution"`; explicit trace wins via precedence in 1.2. Emit `data-emphasis="dim"` on non-members, `data-emphasis="selected"` on selection. Delete unused `focus` option from `buildRenderModel`. | ⚠️ Logic implemented; tests marked `fixme` — renderer doesn't update card emphasis dynamically (library issue L4: Incremental RenderModelPatch). `graph-refine.spec.ts:87` `:109` fixme with finding. |
| **1.4** | Card framing tier (closes 3rd failure, fixes A4) | Remove dead ternary at `GraphView.tsx:811` so `setViewport` preserves `extent`. Re-check tier path: `cardScreenWidth` memo (`:397`) → tier effect → `createCardTemplate({ tier })` → `data-tier`. **If `closest` still absent:** compare renderer-reported `extent` after programmatic `fit` against `canvasSize()`. If renderer doesn't update `extent`, file library issue, mark test `test.fixme` with finding above it — never weaken assertion. | ⚠️ Extent preserved in `setViewport`; test marked `fixme` — renderer doesn't report `extent` in viewportChange (library issue). `graph-detail.spec.ts:60` fixme with finding. |
| **1.5** | Delete dead surface (A5, A6, A8) | `GraphView.tsx:1314`: pass real `onRendererMounted` prop, typed `(GraphRenderer, RendererID) => void`; remove `any` from renderer seam. `useGraphSelection.ts`: delete `frameSelection`/`exportSelection` (shadowed in `GraphView`). `GraphView.stories.tsx`: drop `_setRenderer`, `console.log`. `GraphCanvas.stories.tsx`: wire `onLayoutApplied` to `onModelApplied` or delete. | `grep -rn "onRendererMounted: props.onRenderer" packages/session-graph/src` empty; `grep -rn "console.log" packages/session-graph/src/ui` empty outside tests; typecheck clean, no `any` in renderer seam. |
| **1.6** | Test harness consolidation (A9 support) | One `GraphTestHarness` type (getters only: `selected`, `select`, `setRenderer`, `searchOpen/setSearchOpen`, `legendOpen/setLegendOpen`, `galleryOpen/setGalleryOpen`, `groupMenu/setGroupMenu`, `detailMode/setDetailMode`, `level/setLevel`). Attach as `window.__graph`; keep `__graphView`, `__graphA11y`, `__sessionGraphCanvas` as aliases in the same change that migrates specs, then delete aliases. **Prop rule:** state passed to child = getter `() => T`. | No spec reads a plain-value harness field; every overlay toggle in every spec drives the same method. |
| **1.7** | Localize copy label (A7) | `cardTemplate.ts:442`: `aria-label="Copy"` → key via `options.copy` builder (like `expandGroup`/`collapseGroup`). English source string only. | `grep -n 'aria-label="[A-Z]' cardTemplate.ts` empty. |
| **1.8** | Close the gate (G1–G4) | `script/graph-verify.ts`: add three steps — `packages/session-ui` → `bun test src/graph`; `packages/app` → `playwright test e2e/graph/session-graph.spec.ts`; `packages/app` → `playwright test e2e/regression/side-panels.spec.ts`. `.github/workflows/graph.yml:20-24`: add `ref: 9df9b92` to library checkout (share constant with `graph-setup.ts:16`). | `bun run graph:verify` runs all three new steps and fails if any fail. |
| **1.9** | Two uncovered user paths (U1, U2) | Add to existing `app/e2e/graph/session-graph.spec.ts` (one e2e run): `graph.hybrid` (`mod+shift+h`) toggles hybrid and preserves transcript scroll; log text-size slider changes scale and survives reload (persists as `logTextScale`). | Both assert visible, reversible change; no duplication of arrangement test at `:591`. |
| **1.10** | New captures (focus dimming + 6 new states) | Run `graph:capture --mode=compare` in the same pipeline: focus dimming, search open, legend open, gallery open, group menu open, error state, loading state. | `--mode=verify` green; no duplicates in zoom/pan matrix (SHA check). |

**Batch 1 done when:** `graph:verify` green (incl. session-ui + app e2e + side-panels), `test:components` 54/0, new captures verified.

---

### Batch 2 — Docs, re-measure, persistence  (one commit, one pipeline)

*Independent of batch 1's code; runs after batch 1 is green.*

| # | Item | Change | Acceptance |
|---|---|---|---|
| **2.1** | Documentation corrections | Mechanical replacements in `SPACEGRAPH.md`: §3/§7.1 (≈900 protocol/server lines, not "no changes"); §6.1 (seven packages incl. `kernel 0.1.0`); §7.1 (44 frames, not 31); §9.1 (five rungs, fresh Δ-line figures); §13.1 (already correct — `graph:setup` exists); add **Gate** paragraph listing `graph:verify` steps and CI pin. `docs/spacegraph/prototype.md`: re-date to merge base + library SHA after 2.2. `docs/spacegraph/README.md`: point at `bun run graph:setup`. Remove `rfc.md` citation (batch 5 writes it). | No claim contradicts a runnable command; `grep -rn "rfc.md"` only forward refs. |
| **2.2** | Re-measure every published number | Record in `prototype.md` and mirror in `SPACEGRAPH.md` §7.3. Each number traces to a command: `graph:scale` (5k/300 msg, force layout), `bun run build` manifest (lazy chunk sizes), `git diff --stat` vs `origin/dev` (diff budget, session entry delta). | Every number in both docs traces to its command named beside it. |
| **2.3** | Persistence round-trip (U4) | Add `app/src/session/graph/graph-state.test.ts` covering `sessionGraphSchema` (`graph-state.ts:14-90`): every field round-trips, absent stays absent, unknown rejected/migrated, two session keys isolated. Runs under `bun test src/session/graph`. | Test fails if any field dropped; runs in `packages/app` unit suite. |

**Batch 2 done when:** docs corrected, `prototype.md` numbers current, persistence test passes.

---

### Batch 3 — Library L1/L2 + Publish + session-graph branch  (library repo, then this repo)

*Depends on batch 1 green (L1 unblocks publish).*

| # | Item | Change | Acceptance |
|---|---|---|---|
| **3.1** | L1: library build type-clean | In `spacegraphjs`: `bvh.ts` — declare `three-mesh-bvh` augmentations once in version-agnostic `declare module` + cast through `unknown`; `SceneNode.ts` — read augmented geometry type; `kernel/index.ts` — resolve duplicate `EdgeID` re-export; `kernel/time-filter.ts` — split import (`import { Kernel }` for value, `import type { Node, Edge }` where used, both currently unused); `kernel/walks.ts` — drop unused `Edge`. | `pnpm run build:lib && pnpm run build:packages` zero TS errors; `bun run graph:verify` step 1 clean; `bun run test:publish` green. |
| **3.2** | L2: consolidate library test file | Remove two empty tests (`:1331,:1335`). Merge duplicate `PhysicsPlugin`/`ErgonomicsPlugin` `describe`s; delete `Layout Engines` cases covered by `GridLayout`/`CircularLayout`/`HierarchicalLayout` blocks. One set per behaviour. | `grep -c "^describe('PhysicsPlugin'"` = 1; assertions for existing behaviours unchanged. |
| **3.3** | Publish seven packages, leaf first | Order: `@spacegraphjs/renderer` 0.3.0 → `@spacegraphjs/kernel` 0.1.0 → `@spacegraphjs/adapter` 0.2.0 → `@spacegraphjs/spacegraph-renderer` 0.3.1 → `@spacegraphjs/cytoscape-renderer` 0.3.0 → `@spacegraphjs/svg-renderer` 0.2.0 → `spacegraphjs` 8.5.0. All `CONTRACT_VERSION = 3`. Preconditions: batch 3.1 green, `test:publish` green, `files` includes `dist` + declarations, tag per package. | `npm view` confirms all seven; scratch project installs `renderer` and imports `CONTRACT_VERSION`. |
| **3.4** | `session-graph` branch consumes published | Branch from `dev`. Swap seven `workspace:*` for published versions. Remove seven `spacegraphjs` entries from root `workspaces` and `.gitignore`. | In a clean clone with no sibling checkout: `bun install && bun run graph:verify` passes; `bun run graph:dev` serves. |

**Batch 3 done when:** seven packages on npm; `session-graph` branch verifies from clean clone.

---

### Batch 4 — Evidence study (T2.2)  (parallel from **end of batch 1**)

*Needs only a working build (batch 1 provides). Does not wait for batch 2/3.*

| Item | Protocol | Deliverable |
|---|---|---|
| **T2.2** | n ≥ 5 participants, counterbalanced, canonical fixture (`session-ui/src/graph/fixture.ts`), five investigative tasks (why file changed; which calls led to failure; subagent contribution; changes after failure; retries/direction changes). Measures: success, time, wrong turns, interactions, preference 1–7, verbatim quotes. | `rfc.md` with task script, raw per-participant table, one-page result + stop-rule decision (§10.2). If negative: stop feature work, publish finding, keep library. |

**Batch 4 done when:** `rfc.md` written with measured outcome and decision.

---

### Batch 5 — Ship  (after batch 3 + batch 4)

| Item | Change | Acceptance |
|---|---|---|
| **5.1** | Hosted demo | Deploy contract demo + second host to `https://autonull.github.io/spacegraphjs7/contract.html` and `/second-host.html`. | Both URLs load without provider key. |
| **5.2** | Landing page | One screenshot, honest limitations list (link `SPACEGRAPH.md` §8), stranger's path `git clone && bun run graph:setup && bun run graph:dev`. | Fresh clone following only the page reaches running graph. |
| **5.3** | Demo video | `docs/spacegraph/demo.mp4`, recorded **after batch 1** (shows focus dimming, merged canvas). | Under size budget, no provider key visible. |
| **5.4** | Upstream PR | Rungs 1–4 (§9.1); rung 5 optional. Diff table refreshed from batch 2.2. Review packet (`upstream-review.md`, `decisions.md`, `security.md`, `demos.md`, `prototype.md`) matches branch. | PR open, packet matches. |

---

## 6. Parked (with reason)

| Item | Why |
|---|---|
| Residual `GraphView` split (~1,587 lines; placeholder-then-reassign locals) | Extraction is follow-up, not a gate. Batch 1 removes the defects that matter; remaining size is maintainability, not correctness. |
| `GraphCanvasRegion`'s wide props (~60) and `useGraphState` return | Same: readability, not correctness; splitting now would churn batch 1's diff. |
| Library L3–L9 (worker, incremental patch, virtualisation, perf harness, release automation, activity types, minimap/depth) | Generic capability; owned by `spacegraphjs`. |
| Rung 5 workspace endpoint | Optional (§9.1); `snapshot-cache` degrades gracefully. |
| Real 3D geometry, mobile graph mode, cross-session graphs | Seams D4/D5 and §8.7; each needs validated single-session result first. |
| Empty-column exclusion, lane-gutter screen-fixing, overview lane whitespace | Cosmetic; revisit only if visual review or T2.2 names them. |

---

## 7. Conventions (bind every change)

- `packages/session-graph/AGENTS.md`: no `if (renderer === "cytoscape")`; differences = capability flags; session semantics out of renderers; new DOM = `data-component`/`data-slot` + accessible name.
- `packages/session-ui/AGENTS.md`: no hardcoded user-visible English (incl. `aria-label`, tooltip, placeholder, empty state); English source strings only; `i18n.plural` for counts.
- Root `AGENTS.md`: no comments added; delete dead code created by change; no aliased imports; no star imports; getters + early returns over reassignment; validate unknown once at boundary.
- Tests: run from package dirs, never root. Component = Storybook-backed Playwright; unit = `bun test`. Never weaken assertion — `test.fixme` with written finding, or fix cause.
- Commits/PR titles: `type(scope): summary` (`fix(session-graph): …`).

---

## 8. Definition of done

- [ ] `bun run graph:verify` runs library build, contract, boundaries, controller, overlays, navigation, second host, all four adapters, session-graph unit, **session-ui graph unit**, session-graph components, **app e2e (`session-graph.spec.ts`)**, **side panels**, capture verify, publish check — green.
- [ ] `test:components` = 54 pass / 0 fail / 0 fixme without written finding.
- [ ] One canvas component; one emphasis resolver; no dead `focus`; no dead verbs; no `any` in renderer seam; no literal English in card markup.
- [ ] CI pins library SHA (`9df9b92`) and matches `graph:setup`.
- [ ] `SPACEGRAPH.md` §3, §6.1, §7.1, §9.1 truthful; §7.3 numbers each traceable to a command; `prototype.md` re-dated; no citation of missing `rfc.md`.
- [ ] Library builds with zero TS errors; seven packages published; `test:publish` green.
- [ ] `session-graph` branch installs and verifies from clean clone, no sibling checkout.
- [ ] `graph.hybrid`, log text size, hybrid arrangements, permalinks (node + layout form), side panel, focus dimming, persistence round-trip all covered in the gate.
- [ ] Two demo URLs live; landing page with stranger's path; `demo.mp4` recorded after batch 1.
- [ ] T2.2 executed, written into `rfc.md`, stop-rule decision recorded.
- [ ] Upstream PR open: rungs 1–4, rung 5 optional.

---

## 9. Commands

```bash
# The gate (after batch 1.8 this includes session-ui + app e2e + side panels)
bun run graph:verify

# Focused loops
cd packages/session-graph && bun test src && bun run typecheck
cd packages/session-graph && bun run test:components
cd packages/session-ui    && bun test src/graph
cd packages/app           && bun test src/session/graph
cd packages/app           && bun exec playwright test e2e/graph/session-graph.spec.ts
cd packages/app           && bun exec playwright test e2e/regression/side-panels.spec.ts
cd spacegraphjs           && pnpm exec vitest run
cd spacegraphjs           && pnpm exec vitest run test/spacegraph.test.ts

# Numbers and pictures
bun run graph:scale
bun run graph:capture --mode=compare
bun run graph:capture --mode=verify

# Library and publish
cd spacegraphjs && pnpm run build:lib && pnpm run build:packages
cd spacegraphjs && bun run test:publish

# Development
bun run graph:setup    # clone library at pinned SHA, install both trees
bun run graph:dev      # mock backend, no provider key
```