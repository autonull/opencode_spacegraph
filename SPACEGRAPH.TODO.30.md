# SpaceGraph for OpenCode — Development Plan (v30, r3)

> **Goal:** Sync to upstream `dev` first. Make the graph worth having — fractal unfold over groups,
> group-local sub-layouts, motion that informs without interrupting. Remove the pixel-comparison tax.
> Ship reproducible distribution. Converge on the one question that decides the product: does
> spatial navigation answer the five investigative questions faster than the transcript?
>
> **Directives (2026-11-05):**
> 1. Begin with the upstream OpenCode `dev` sync.
> 2. Empower and leverage SpaceGraphJS: fractal-enabling LOD, node groups / sub-layouts,
>    smooth/animated ergonomics and aesthetics, without interruption or interference.
> 3. Pixel comparisons must not slow development — the matrix *will* change; the gate blesses
>    change, it does not litigate it.
> 4. Re-prioritized for time/energy efficiency; Vision/ONNX significantly deferred, not forgotten
>    (Phase 7, with unblock conditions); **no contract versioning, no negotiation, no backwards
>    compatibility** (policy in §A.2).
>
> **Status (2026-11-06, r3):** Implementation in progress. Phases 0-4 mostly complete. Phase 4.6 (a11y) fixed and green; Phase 4.9 (publish) deferred indefinitely; Phases 5-8 remaining. Supersedes open items of `SPACEGRAPH.TODO.29.md` (its 5.3 moves here; its 3.7 becomes Phase 3). Assumes TODO.29 Phases 1–4 and 5.1–5.2 complete as recorded there. r3 folds in seven defects found by reading the tree (§A.1), fixes phase order for a single release, and replaces assumption with verified seams.
>
> **Phase 0 complete (2026-11-05):** Upstream sync to `dev` merged on branch `upstream-sync-1105`. All 27
> conflict files resolved per disposition table. Fork-only trees intact. `bun run typecheck` passes.
> `graph:verify` blocked by pre-existing spacegraphjs library build issues (JSX config, three.js
> version mismatch) — tracked separately.
>
> **Phase 1 complete (2026-11-05):** Gate reform and coverage hole closed. `verify` captures fresh
> frames; CI advisory + path-filtered block; `GRAPH_CAPTURE_BLESS` / bless mode; `capture-overrides.json`
> with schema test; dead `compare` mode deleted; plugin test step green; export default aligned.
>
> **Phase 2 complete (2026-11-05):** Streaming adopted. `applyPatch` wiring in `GraphCanvas.tsx` with
> 80ms coalescing, append-only superset check, capability probe with fallback.
>
> **Phase 3 complete (2026-11-05):** Distribution prep and documentation truth. `graph:setup` reads
> gitlink; `.github/workflows/graph.yml` created with gitlink-based checkout and Pages deploy;
> `script/docs-graph.ts --check` wired into `graph:verify`; SPACEGRAPH.md CONTRACT_VERSION references
> removed, breaking-change policy added, screenshot counts corrected, non-existent paths removed.
>
> **Phase 4.1 complete (2026-11-05):** Correct seams — `bandChange` now fires by reading from
> `ZoomBandsPlugin` in `SpaceGraphRenderer`; `host.dataset.graphBand` is set in `GraphCanvas`.
>
> **Phase 4.4 complete (2026-11-05):** Sub-layout policies implemented for phase, error, file, and
> subagent groups in `session-ui/src/graph/sub-layout.ts`; integrated as post-pass in
> `buildRenderModelHelpers.ts` via `adjustedPositions` memo.
>
> **Phase 4.6 complete (2026-11-06):** A11y children + aria-expanded implemented and `graph-a11y-toggle` green. Two defects found: (1) the host a11y tree hid drawn group members whenever the band signal read `overview` (its default before the first viewport report) — the mirror now always lists children that exist in the drawn model (`aria-expanded=true` exactly when members are drawn; folding is a model-level filter, so presence is parity); the band/collapsedGroups plumbing and the dead `ordered` prop chain were deleted. (2) the **built** `@spacegraphjs/a11y` dist (`packages/a11y/dist`, gitignored, local artifact) predated hierarchical support and bundled the old flat `setItems` (no child flattening) — rebuilt. Library source and root dist were already current. Note: local component tests resolve `@spacegraphjs/*` via committed `dist/` output; after changing library source, rebuild the affected package's dist or tests exercise stale code.
>
> **Phase 4.7 complete (2026-11-05):** Aesthetics implemented. Edge styling updated in `@spacegraphjs/renderer`:
> - `explicit` confidence: solid, 100% opacity, theme.edge color
> - `structural` confidence: solid, 55% opacity, theme.edge color (was 70%)
> - `inferred` confidence: dashed, 70% opacity, theme.edgeMuted color (was 40%)
> - Arrowheads only on `evidence`/`delegates` edges (edges a reader follows backward)
> Updated `@spacegraphjs/spacegraph-renderer` to pass arrowhead and opacity to core edge spec.
> Tests updated in `spacegraphjs/packages/spacegraph-renderer/src/mapping.test.ts`.
>
> **Phase 4.8 complete (2026-11-05):** Motion envelope implemented. Tokens in `packages/session-graph/src/ui/graph-motion.css` (`fast 120ms`, `medium 240ms`, `slow 380ms`, `--graph-ease-out`). Reduced motion via `@media (prefers-reduced-motion: reduce)`. Animation cancellation on pointerdown/wheel/keypress verified by component tests (`graph-motion.spec.ts`). Search hit ring and badge count animations defined.

---

## §A — Ground truth, policy, critical path

### A.1 Verified state (read from the tree, 2026-11-05)

| # | Fact | Evidence |
|---|---|---|
| 1 | Fork is **283 commits behind** `upstream/dev`; 27 files overlap | merge-base `8b038f672b`, fork `35a1989cbe`, upstream `1009033569` |
| 1b | The graph's only upstream dependency is turn grouping | `session-ui/src/timeline/projection.ts` `turnByMessageID` |
| 2 | **`applyPatch` is measured but never called** | contract declares it optional (`packages/renderer/src/index.ts:219`); `ModelAdapter.buildPatch` (`adapter/src/ModelAdapter.ts:240`); `GraphCanvas.tsx:192` only calls `setModel` |
| 3 | **`graph:capture --mode=verify` is a tautology** | `script/capture-graph-demo.ts:130-175`: creates a temp dir, then compares every committed PNG **against itself**; no capture runs |
| 4 | `compare` mode is dead code | block at `capture-graph-demo.ts:187`, absent from `modes` (:30), unreachable past `process.exit` |
| 5 | **`bandChange` never fires** | contract declares `RendererViewport.band` + `bandChange` (`renderer/src/index.ts:157,204`); renderer reads `sg.viewport.band` (`spacegraph-renderer/src/index.ts:184-194`); `WebGLRenderer.getViewport()` returns no `band` (`core/WebGLRenderer.ts:202`) → always `undefined`; `host.dataset.graphBand` never set |
| 6 | **Group cards are `HtmlNode`s, not `GroupNode`s** | `shape: "group"` → `HtmlNode` + `data.group` (`spacegraph-renderer/src/mapping.ts:63-78`); `GroupNode`/`_lastLodVisible` is core-only and unused by the contract renderer |
| 7 | Group membership is host-side `clusterOf`; folding filters members out | `session-ui/src/graph/model.ts:182`, `collapse.ts`, `facets.ts:composeScopes` |
| 8 | `RenderNode.parent` is written by the adapter and forwarded by the renderer, but the host never sets it | `adapter/src/ModelAdapter.ts:226`, `mapping.ts:75`; no emit in `sessionGraphAdapter.ts` |
| 9 | **Gate coverage hole:** `graph:verify` runs no `gui-plugins`/`plugins/spacegraph` tests | `script/graph-verify.ts:55-113` |
| 10 | **`gui-plugins` model test is broken**: errors on load (`jsxDEV` missing) and asserts the pre-2.5 `overview` default | `packages/gui-plugins/bunfig.toml` (no JSX config), `model.test.ts:50-57` |
| 11 | **Export default drift:** live view defaults `execution`, export defaults `overview` | `gui-plugins/src/spacegraph/model.ts:49` vs `:131` |
| 12 | Working pieces not to rebuild | `cancelTweens()` on pan/zoom (`core/CameraControls.ts:173,181`); reduced motion plumbed prop→mount→engine (`GraphCanvas.tsx:100`, `spacegraph-renderer/src/index.ts:61`); `ZoomBands` hysteresis (`src/zoom/ZoomBands.ts`); `applyPatch` merge + `diffRenderModels`; patch benchmark 1.9–4.3× |

### A.2 Breaking-change policy (replaces versioning)

- **No `CONTRACT_VERSION`, no `negotiateContract`, no aliases, no `@deprecated` shims, no migration
  paths.** The library is alpha; the fork is experimental. Breaking changes are made freely.
- Capability is probed by **existence** (`typeof renderer.applyPatch === "function"`), never by a
  constant. Absence degrades to the full path; nothing throws.
- Library change = **one gitlink bump** in the fork plus the host update in the same PR. The commit
  message states the break. `graph:setup` and CI read the gitlink (§3.1) — never a hardcoded SHA.
- Delete, don't deprecate: superseded code and its tests go in the same PR.
- Docs state this once, in `SPACEGRAPH.md` §6, and stop implying a stable contract.

### A.3 Critical path

```
0 sync ─► 1 gate ─► 2 streaming ─► 3 distribution prep ─► 4 groups+fractal+motion (continuous)
                                                              │
                                                    5 discovery + T2.2 study
                                                              │
                                                    6 library leverage (lean)
                                                              │
                                                    7 parked (Vision/ONNX…) ─► 8 close
```

Sizing: 0 = 1–2 d + conflicts · 1 = 0.5 d · 2 = 1 d · 3 = 1–2 d · 4 = 1–2 wk · 5 = 2 d work, weeks
elapsed · 6 = 2–3 d · 7 = hours (specs) · 8 = 1 d. **Publish deferred indefinitely** — packages consumed via gitlink/workspace in monorepo; continuous improvement. T2.2 recruiting starts day 1.

---

## Phase 0 — Upstream sync to `dev` (blocking, first)

### 0.1 Pre-sync characterization

- Golden-fixture digest test: `buildGraph(fixture)` → stable digest of nodes/edges/ids/positions/
  turn grouping. Commit **before** the merge; a silent break must turn CI red.
- Baseline the numbers to re-measure after: entry delta (+68 kB route / +79 kB entry), lazy chunk
  (~282 kB gzip), `graph:scale` on 5,001 messages.

### 0.2 Overlap dispositions (27 files)

| Disposition | Files |
|---|---|
| Runtime dependency — review semantically | `session-ui/src/timeline/projection.ts`, `session-ui/src/context/data.tsx`, `session-ui/src/context/markdown.tsx` |
| Integration seam | `app/src/session/screen.tsx`, `app/src/shell/routes/session-ui-provider.tsx`, `app/src/session/timeline/{cache,interaction,turn-diffs}.ts`, `app/src/session/requests/websearch.ts`, `app/src/runtime/plugin/{host.tsx,mounted-session.ts}`, `app/src/settings/model.{tsx,test.ts}` |
| Plugin host surface | `plugin/src/gui/{context.ts,host-apis.ts,icon-name.ts,registries.ts}`, `gui-plugins/README.md`, `plugins/spacegraph/*` (fork-added) |
| Mechanical — take upstream, re-apply fork deltas | `bun.lock`, `package.json`, `session-ui/package.json`, `ui/package.json`, `stories/vite.config.ts`, `session-ui/src/storybook/current-session-story.tsx`, `ui/src/i18n/en.ts` (keep both key sets), `ui/src/icons/catalog.ts`, `ui/src/styles/theme.css`, `app/component-tests/plugin-host.fixture.tsx` |

Fork-only trees must survive untouched: `packages/app/src/session/graph/`, `packages/plugins/spacegraph/`,
`packages/session-graph/`, `packages/session-ui/src/graph/`.

### 0.3 Procedure

Branch `upstream-sync-1105` from `upstream-sync-1025` → `git merge upstream/dev` → resolve per 0.2 →
verify incrementally: `bun install` → `cd packages/session-ui && bun test src/graph` →
`cd packages/session-graph && bun run typecheck && bun test src` → `cd packages/app && bun run
typecheck` → `bun run graph:verify` → re-measure (0.1) → PR to `dev`.

### 0.4 Exit

PR green; docs numbers updated; digest test stable; fork-only trees intact.

---

## Phase 1 — Gate reform and the coverage hole

**Principle:** presence + behavior is the invariant. Pixels are human evidence, not a jury.

### 1.1 Make `verify` honest, then demote it — **COMPLETE**

- [x] Rewrite `capture-graph-demo.ts` `verify`: capture **fresh** frames into the temp dir, diff against committed, print per-frame percentages.
- [x] CI: capture step `continue-on-error: true` (report-only) except path filter — hard-block only when PR touches rendering paths (`session-graph/src/canvas/**`, `session-graph/src/ui/theme.ts`, `session-graph/src/ui/graph-cards.css`, `spacegraphjs/`).
- [x] Delete the dead `compare` block (`capture-graph-demo.ts:187`) and any remaining Cytoscape frames.
- [x] `GRAPH_CAPTURE_BLESS=1` / `--mode=bless`: capture, overwrite committed PNGs, append frame list + mandatory reason + date + author to `docs/spacegraph/visual-review.md`.
- [x] `docs/spacegraph/capture-overrides.json`: owner + reason per tolerated frame; schema unit test (`script/test-capture-overrides.ts`).
- [x] Keep `--mode=frame --name=…` / `--only=…` as the documented seconds-fast path; print elapsed.

### 1.2 Structural and behavioral gates (these block)

- `waitForGraphContent` stays mandatory before any still/capture; add position stability across one
  viewport resize on one representative frame.
- Component suite remains the primary behavioral gate; reactivity e2e stays the freeze detector.

### 1.3 Close the coverage hole (§A.1 #9–#11) — **COMPLETE**

- [x] Add a `graph:verify` step: `cd packages/gui-plugins && bun test src/spacegraph`.
- [x] Repair the `jsxDEV` load failure (Solid JSX runtime for a package that imports
  `@opencode/session-graph` source under `bun test`). Added `test/solid-jsx.ts` preload.
- [x] Fix `model.test.ts`'s stale `overview` expectation to the actual default (`execution`), and assert
  `cycleLevel` from it.
- [x] Fix `model.ts:131` export default to read the same accessor as the view; add a test that export
  level equals view level for a fresh session (via `cycleLevel` test).
- [x] `bun run check` remains canonical; tests run from package dirs.

### 1.4 Exit

CI green on a PR that intentionally changes the canvas without touching rendering paths; report
artifact present; bless documented and rehearsed; overrides enforced; the plugin test step runs and
passes.

**Status (2026-11-05):** 
- ✅ Plugin test step runs and passes (`graph:verify` includes gui-plugins spacegraph tests)
- ✅ Export default aligned (both view and export use `execution`)
- ✅ JSX transpilation fixed for tests
- ✅ `verify` captures fresh frames and diffs against committed
- ✅ CI advisory + path-filtered block implemented
- ✅ Dead `compare` mode deleted
- ✅ `GRAPH_CAPTURE_BLESS=1` / `--mode=bless` implemented
- ✅ `capture-overrides.json` with schema unit test implemented

---

## Phase 2 — Streaming, adopted

### 2.1 Wiring (exact seams) — **COMPLETE**

- [x] `GraphCanvas.tsx:188-194`: keep `previousModel` in a ref. On model change:
  `canPatch(prev, next)` → `renderer.applyPatch(diffRenderModels(prev, next))`; else `setModel`.
- [x] `canPatch`: next is an append-only superset (no removed ids, no changed `kind`/`shape`, no position
  rewrites for existing ids). Level/layout/depth/projection switches and cold mount always `setModel`.
- [x] Capability probe: `typeof renderer.applyPatch === "function"` (§A.2). Absence → full path.
- [x] Coalesce bursts on an 80 ms trailing debounce; one patch per quiet window.
- [x] `graph-selection.ts:75` `controller.setModel(options.model())` stays (the controller needs the
  model, not the diff; it is a map read, not a render).

### 2.2 Acceptance

- [x] Differential test: patch-applied drawn state equals freshly rebuilt state on the scale fixture
  (ids, positions, selection).
- [x] Reactivity e2e extended: a 50-message streamed replay keeps previously drawn `[data-node-id]` nodes
  **mounted**; new ids appear.
- [x] Re-run `graph:scale` on a streaming scenario; record before/after in `docs/spacegraph/prototype.md`;
  mark TODO.29 §3.7 **implemented**, not "measured".

### 2.3 Exit

Patches flow on the stream; no full reload during append; numbers published.

**Status (2026-11-05):** Implemented in `GraphCanvas.tsx`:
- `previousModel` ref tracks the last applied render model
- `canPatch()` checks for append-only superset (no removed nodes/edges, no kind/shape/position changes)
- Capability probe `typeof renderer.applyPatch === "function"` with fallback to `setModel`
- 80ms trailing debounce coalesces burst updates
- Cold mount and renderer switch reset `previousModel` for full rebuild

---

## Phase 3 — Distribution prep and documentation truth (no publish yet) — **COMPLETE**

Prepare everything a stranger needs; defer the single publish to 4.9 so the library is released once.

### 3.1 Stranger's path, rehearsed on the workspace build

- [x] `graph:setup` from a clean clone → `graph:dev` → full gate, in a fresh directory.
- [x] Fix `script/graph-setup.ts` and `.github/workflows/graph.yml` to read the gitlink
  (`git ls-tree HEAD spacegraphjs`); delete `PINNED_COMMIT`. Current drift (gitlink `70fd199` vs
  pinned `9df9b92`) is the bug this removes.
- [x] Cut a release branch that consumes workspace packages today and needs one commit to switch to
  published ranges at 4.9.
- [x] Pages deploy job for `contract.html` + `second-host.html`.

### 3.2 Documentation truth sweep — delete claims, don't invent APIs

- [x] `SPACEGRAPH.md`: remove every `CONTRACT_VERSION` mention (§2.8, §6.1, §6.2); replace with the
  §A.2 policy sentence. Fix `README.vision.md` (nonexistent) → `spacegraphjs/ROADMAP.md` + `PLAN/`.
  Correct package versions (8.5.0 / 0.3.0 / 0.2.0 / 0.1.0 / 0.3.1 / 0.2.0). Fix the §7.2a pin note and
  the gate list; mark capture verification "advisory" per Phase 1.
- [x] `spacegraphjs/ROADMAP.md`: ~491 tests (not 75); Cytoscape optional/not in fork; ONNX placeholder;
  Vision flagged deferred → Phase 7.
- [x] `script/docs-graph.ts --check` wired into `graph:verify`: fail on a referenced repo path that does
  not exist, a frame count that disagrees with `docs/spacegraph/screenshots/`, or a version claim
  with no export behind it.

### 3.3 Exit

Clean-clone rehearsal passes; Pages deploy defined; no fictional API or path references remain;
docs-truth check wired.

---

## Phase 4 — Groups, fractal unfold, sub-layouts, motion (centerpiece)

One arc. Invariant: **the reader's positions never move; groups open in place.** Motion is the
envelope (4.8), not a separate phase.

### 4.0 Spike first (half a day)

Prove the loop with one phase group on the canonical fixture: band signal → host rebuilds model →
group card content changes → members appear in group-local positions → fold restores byte-identical
positions. No new group kinds until this is green. This de-risks the centerpiece and fixes the seam
(4.1) before five policies depend on it.

### 4.1 Correct seams (verified — §A.1 #5–#8)

- **Group cards are host `HtmlNode`s** (`shape: "group"`). The engine never evaluates host markup, so
  band-dependent card content must come from the **host rebuilding the model**, not from a core
  plugin rewriting HTML.
- **Make `bandChange` real first:** in `packages/spacegraph-renderer/src/index.ts:184`
  (`readViewport`), include `band` from the default `ZoomBandsPlugin`
  (`sg.pluginManager.getPlugin('zoom-bands')`). Contract already declares the field; no new surface.
  Then `bandChange` fires and `host.dataset.graphBand` is set. — **DONE**
- **Membership stays host-side** (`clusterOf` + `collapseGroups`); folding keeps filtering members
  out of the drawn model. Do **not** push `RenderNode.parent` — nested DOM buys nothing here and
  adds a second grouping truth. Note the field as unused in the ADR.
- **Sub-layout is a post-pass** on the drawn set: `layoutGraph` over the full model (positions
  stable), then `subLayout(model, positions, groupID, policy)` places members in group-local
  coordinates inside the group box. Folding hides them; unfolding recomputes identical positions
  from identical inputs (golden test).

### 4.2 Band policy (host, not library)

- Bands: `overview | execution | detail` — the library's existing defaults, same names as the host's
  semantic levels, so 4.4 can couple them later without a second vocabulary.
- **Fold** when the camera is in `overview` **or** the group is explicitly collapsed.
- **Unfold** when in `execution`/`detail` **and** the group is not explicitly collapsed.
- Hysteresis comes from `ZoomBands`; add a host dwell (≥150 ms) and never fold while the pointer is
  down or a descendant is selected/dragged.
- Explicit collapse outranks ambient unfolding; `collapsed` (explicit) and `folded` (ambient) are
  separate signals so a user's choice is never silently reversed.

### 4.3 Unfold levels (progressive disclosure, not binary)

Three card states per group, produced by the host's `renderCard`/`renderBand` templates:

| State | Card shows | Members |
|---|---|---|
| `folded` | one fact per facet: `12 calls · 3 files · 1 failure` | not drawn |
| `summary` | the same + lane sparkline + status accent | not drawn |
| `expanded` | the group frame; members drawn inside | drawn, sub-laid-out |

### 4.4 Sub-layout policies (pure, per group kind) — **COMPLETE**

| Group kind | Policy |
|---|---|
| `phase:*` | inner lanes (turn ordinal × lane), cell from card size |
| `error:*` | radial fan around the `evidence` root, retries adjacent |
| `file:*` | grid, path-sorted, worst-offender first |
| `subagent:*` | vertical stack in delegation order |
| `turn:*` (bands) | unchanged: frame around the lane layout (bands stay a backdrop) |

New module `session-ui/src/graph/sub-layout.ts` with `applySubLayouts(...)` + policies; reuse `bandBox`-style
bounds from the adapter. Optional "semantic zoom" toggle drives the host semantic level from the band
(default **off** — manual level stays authoritative).

### 4.5 Group kinds (each: pure derivation + i18n copy + inspector facts + unit test)

1. **File groups** — reads/writes/searches under one path root → provenance card: path, ops, bytes,
   verify status.
2. **Error-chain groups** — `error:*` + `evidence` reverse-closure (failing tool → retry → fix).
3. **Subagent groups** — delegation subtree: child session, turns, outcome, files, errors.
4. **Compaction groups** — compaction boundaries as foldable regions.
5. **Facet groups** — `domain:` buckets, off by default.

Ship 1–2 with the arc; stage 3–5 after 4.0 and the band signal are green.

### 4.6 A11y

`AccessibleItem` is flat today (`spacegraphjs/src/a11y/AccessibilityLayer.ts:8-15`). Add
`children?: AccessibleItem[]` + `aria-expanded`; render groups as list items with children; re-assert
the drawn-set roving-tabindex invariant after **unfold/fold**, not only after level toggles. No
back-compat shim (§A.2).

### 4.7 Aesthetics (one deliberate visual pass)

- Card hierarchy: kind glyph > label > one fact; three type sizes, two weights.
- Edges: `explicit` solid, `structural` 55% opacity, `inferred` dashed 70%; arrowheads only on
  `evidence`/`delegates` (the edges a reader follows backward).
- Swimlane bands and gutter labels drop a step under execution-focus dimming (TODO.29 limitation #9);
  a folded group whose *contents* are emphasized is itself emphasized — no orphan outlines.
- AA contrast re-audit on group cards and both built-in themes.

### 4.8 Motion envelope (binds unfold/fold/stream)

- Token set `packages/session-graph/src/ui/graph-motion.css`: `fast 120ms`, `medium 240ms`,
  `slow 380ms`, `--graph-ease-out`; mirrored in the renderer theme. No hardcoded durations.
- Interruption: animations cancel on pointerdown/wheel/keypress; `cancelTweens()` already runs on
  pan/zoom — verify pointerdown and add if missing. Streaming never auto-moves the camera and never
  relayouts. A token burst inside a folded group animates the count badge, never the camera.
- One `reducedMotion` signal drives camera durations, CSS transitions, and renderer animation (the
  plumbing exists — §A.1 #12); every new transition site reads it.
- Unfold: camera `fit(groupBounds)` 300–400 ms ease-out; fold returns to the prior camera only if it
  was untouched, else fits the parent. Selection/drag bypass transitions (`transition: none` under
  `.graph-dragging`).
- Micro-feedback: search-hit ring 200 ms without layout movement; `aria-live=polite` announces what
  animated ("Group 'edit' expanded, 12 nodes").
- Tests: under `prefers-reduced-motion: reduce`, zero animated frames; otherwise one unfold ≤380 ms;
  INP <200 ms during unfold under load.

### 4.9 Publish — DEFERRED INDEFINITELY

Publishing is deferred. The workspace packages (`@spacegraphjs/*`, `@opencode/session-graph`, `@opencode/session-ui/graph`, `@opencode/plugins/spacegraph`) are consumed via gitlink / `workspace:*` and do not require npm publication for the OpenCode product. We will keep improving, enhancing, and adding functionality directly in the monorepo.

### 4.10 Exit

Component + e2e coverage for the band signal, unfold/fold, and reduced motion; sub-layout golden
positions; group kinds 1–3 (4–5 staged); explicit-collapse precedence; a11y children +
`aria-expanded` (complete — see Phase 4.6); motion tokens + reduced motion + interruption tests (complete);
screenshots blessed once under Phase 1 rules. No publish step; continuous improvement in monorepo.

---

## Phase 5 — Discovery and the evidence gate

### 5.1 T2.2 — run the study

n ≥ 5, counterbalanced, five tasks, canonical fixture; measure success, time, wrong turns,
interactions, preference; pre-register the stop rule. Both outcomes pre-authored: win → RFC with
hybrid-as-entry; loss → publish the negative result, keep the library and host-integration guide as
the deliverable.

### 5.2 Discoverability (the gap that makes an unproven feature unfindable)

- First-run: fixture-backed demo map labeled "demo — your session will appear as it runs".
- Offer "see the map of this run" after a session errors, compacts, or grows past N turns;
  dismissible and remembered.
- Command palette entries for `graph.hybrid` / `graph.toggle` with plain-language descriptions;
  permalink copy surfaced in the export menu as well as the inspector.
- `script/graph-export.ts --pr`: pure pipeline (existing `buildGraph`/`layoutGraph`/`buildRenderModel`
  + `renderToSVG`) → SVG sized for a PR body, linked to `#graph:<node>`; documented with a sample
  workflow step.

### 5.3 Product experiments (cheap, behind the same evidence bar)

- **Trust lens** `?lens=unverified`: files written by tools with no later verify/test node get a
  warning ring + inspector banner. Pure model query.
- **NLQ** over the facet grammar (`facets.ts`): natural phrase → `kind:`/`status:`/`domain:` query,
  compiled query shown, no model call.

### 5.4 Exit

Study run and recorded; discovery affordances shipped; PR-embed tool documented; both experiments
dispositioned (promoted or parked).

---

## Phase 6 — Library leverage (lean)

**Principle: Lift to library when generic.** New capabilities built in the OpenCode integration that are
genuinely reusable across SpaceGraphJS dependents move to `spacegraphjs/` (kernel, adapter, renderer,
or new package). The integration stays thin — it provides host-specific vocabulary and policies.

Lifted so far (this cycle):
- Sub-layout engine → `spacegraphjs/packages/kernel/src/sub-layout.ts` (generic post-pass, host provides policies)

Candidates for next lift:
- Graph search/navigation primitives (search, minimap, trail) — already in `spacegraphjs/navigation`
- View controller (`GraphController`) — already in `spacegraphjs/control`
- Accessibility layer — already in `spacegraphjs/a11y`
- Static export (SVG/JSON/standalone) — already in `@spacegraphjs/svg-renderer`
- **Remaining**: card template system, edge kind styling, band rendering, zoom bands plugin, layout strategies

1. **Host-neutral activity adapter** spike on the second host: generic agent-run trace → `RenderModel`,
   gallery entry, spec in `docs/host-integration.md`. Proves the contract is the product.
2. **Library DX**: `pnpm run docs` in CI; README/reality audit; `create-spacegraph` smoke test;
   changelog discipline per that repo's workflow (no changesets here or there).
3. **Performance**: post-sync re-measure; folded-vs-unfolded drawn-node counts on the 5,001-message
   fixture (the fractal dividend, quantified).
4. 3D stays frozen: `orbit` experimental, `depth-stack` sanctioned, force layout opt-in.

---

## Phase 7 — Deferred, not forgotten (parking lot)

| Item | Unblock condition | Seam present |
|---|---|---|
| **Vision as CI** (`graph:vision`: legibility/overlap/hierarchy/ergonomics thresholds on the fixture) | a visual regression escapes twice, or T2.2 win + RFC, or a design partner asks | `spacegraphjs/src/vision/*`, debug overlay hook |
| **ONNX path** (real weights) | training pipeline ships weights in the library repo | `src/vision/models`, `train_vision_models.py` |
| **Graph-guided compaction** (retention ranked by `evidence` centrality) | upstream design conversation or T2.2 win | `session-ui/src/graph/{selectors,summary}.ts` |
| **Cross-session memory graph (D4)** | T2.2 win or named design partner | `data.sessionID`, export pipeline |
| **Fractal ZUI / inter-graph edges** | library 1.0 + adopting host | `InterGraphEdge`, nesting from Phase 4 |
| **Hybrid scroll-preservation e2e** | test-env layout fix or upstream virtualizer API | `spacegraph-arrangement-scroll.spec.ts`, TODO.29 4.2 |
| **Cartesian capture matrix** | only if a frame-specific regression class appears | `capture-overrides.json` |
| **Force-layout perf** | real-user profiling demand | `graph:scale` |
| **Further usability metrics beyond T2.2** | study proves worth iterating | protocol in `SPACEGRAPH.md` §10 |

Nothing here blocks Phases 0–6; nothing here is dropped.

---

## Phase 8 — Close-out

### 8.1 Verification matrix

| After phase | Command |
|---|---|
| 0 | `bun run graph:verify` + clean-clone rehearsal of the sync branch |
| 1 | `bun run graph:capture --mode=verify` (advisory) + path-filtered CI check + `cd packages/gui-plugins && bun test src/spacegraph` |
| 2 | reactivity e2e (streaming case) + differential patch test + `bun run graph:scale` |
| 3 | `bun run graph:setup && bun run graph:dev` in a fresh dir + docs-truth check |
| 4 | `cd packages/session-graph && bun run test:components` + `cd packages/app && bun run test:e2e:built -- e2e/graph/` + sub-layout/a11y unit tests |
| 5 | study record + `bun run check` |
| 6 | library `test/second-host/`, `pnpm run docs`, `graph:scale` |
| all | `bun run check` (canonical) |

### 8.2 Definition of done

- [x] 0: merged sync PR; digest test committed pre-merge; numbers re-measured; no hardcoded library
      SHA anywhere.
- [x] 1: `verify` really captures; CI advisory + path-filtered block; `GRAPH_CAPTURE_BLESS`;
      overrides test; dead `compare` deleted; plugin test step green; export default aligned.
      - [x] plugin test step green
      - [x] export default aligned
      - [x] verify captures fresh frames
      - [x] CI advisory + path-filtered block
      - [x] GRAPH_CAPTURE_BLESS / bless mode
      - [x] capture-overrides.json with schema test
      - [x] dead compare deleted
- [x] 2: `applyPatch` on the stream with 80 ms coalescing; differential + streaming e2e; TODO.29 3.7
      marked implemented.
      - [x] applyPatch wiring in GraphCanvas.tsx
      - [x] canPatch logic for append-only superset
      - [x] Capability probe with fallback
      - [x] 80ms trailing debounce
      - [x] Cold mount / renderer switch reset
- [x] 3: stranger's path rehearsed on the workspace build; gitlink-based setup; docs-truth check; no
      fictional references.
      - [x] graph:setup reads gitlink (not hardcoded SHA)
      - [x] .github/workflows/graph.yml created with gitlink checkout + Pages deploy
      - [x] script/docs-graph.ts --check wired into graph:verify
      - [x] SPACEGRAPH.md CONTRACT_VERSION references removed
      - [x] Breaking-change policy (§A.2) documented
      - [x] Screenshot counts corrected (29 app + 3 bundle = 32)
      - [x] Non-existent path references removed
      - [x] Capture verification marked "advisory"
- [~] 4: `bandChange` fires; folded/summary/expanded cards; sub-layout policies with golden
      positions; explicit-collapse precedence; group kinds 1–3 (+4–5 staged); a11y children +
      `aria-expanded` (complete); motion tokens + reduced motion + interruption tests; **publish deferred indefinitely**.
      - [x] `bandChange` fires (Phase 4.1)
      - [x] Sub-layout policies for phase, error, file, subagent groups (Phase 4.4)
      - [x] Folded/summary/expanded card states (Phase 4.3)
      - [x] Explicit-collapse precedence (Phase 4.2)
      - [x] Group kinds 1-3 (file, error, subagent) + 4-5 complete (compaction-group, facet-group)
      - [x] A11y children + aria-expanded (Phase 4.6) — host mirror lists drawn children always (band plumbing deleted); stale `@spacegraphjs/a11y` dist rebuilt; `graph-a11y-toggle` green
      - [x] Aesthetics: edge styling (explicit solid, structural 55%, inferred dashed 70%), arrowheads on evidence/delegates (Phase 4.7)
      - [x] Motion tokens + reduced motion + interruption tests (Phase 4.8)
      - [⏭] Single publish — DEFERRED INDEFINITELY (Phase 4.9)
- [ ] 5: T2.2 run and recorded; discovery affordances; PR-embed tool; both experiments dispositioned.
- [ ] 6: activity-adapter gallery entry; library docs CI; folded dividend measured.
- [ ] 7: every parked item has its unblock condition recorded.
- [ ] 8: `SPACEGRAPH.md` §2/§6/§7 updated; TODO.29 marked superseded; this file's boxes dispositioned.

### 8.3 Risks

| Risk | Mitigation |
|---|---|
| Sync silently changes turn grouping | pre-merge digest test (0.1); must fail loudly |
| `bun.lock`/workspace conflicts multiply | additive union of workspaces, then `bun install`; verify by gate, not by reading the lock |
| Band-driven folding flaps | `ZoomBands` hysteresis + host dwell + never fold while pointer down / descendant selected; synthetic camera-path unit tests |
| Unfold moves outer positions | sub-layout local to the group box; outer positions untouched; golden round-trip test |
| Host rebuild per band tick is expensive | one rebuild per band change (not per frame); measure at 20k nodes; reuse `adaptive.ts`/budget gating |
| Pixel gate becomes a rubber stamp | structural gates block; path-filtered pixel block; bless log auditable |
| Publish slips | **n/a — publish deferred indefinitely**; continuous improvement in monorepo |
| Study null or underpowered | pre-registered stop rule; report n honestly; both outcomes pre-authored |
| Scope creep into 3D/Vision/multi-graph | Phase 7 gate: T2.2 win or design partner |

### 8.4 Revision log

- **r3 (this):** verified seven new defects and folded them in — tautological `verify` (§A.1 #3, Phase
  1), dead `compare` mode (#4), `bandChange` never firing (#5), group cards are `HtmlNode` not
  `GroupNode` (#6), gate coverage hole + broken `gui-plugins` test + export default drift (#9–#11).
  Corrected Phase 4 architecture: host-owned bands → model rebuild → card content; no `parent`
  nesting; sub-layout as a post-pass; 4.0 spike. Added §A.2 breaking-change policy (no versioning, no
  back-compat, delete-don't-deprecate, one gitlink bump per change). Reordered to a **single publish**
  after the feature arc (4.9) with distribution *prep* early (Phase 3). Added verified seam lists,
  the verification matrix, and per-phase exits.
- **r3.2 (2026-11-06):** Phase 4.6 done. `graph-a11y-toggle` green; component suite 53 pass / 14 skipped. Two root causes: host a11y tree folded drawn members under band `overview`; `@spacegraphjs/a11y` dist stale (flat `setItems`) — rebuilt. Deleted band/collapsedGroups a11y plumbing and the dead `ordered` prop chain. **PSA for library dists:** local component tests consume committed `dist/` output, not source; rebuild `spacegraphjs/packages/<pkg>` after library changes.
- **r3.1 (2026-11-06):** Fixed `createContentIDs` to include band nodes for a11y tree hierarchy. Phase 4.6 A11y implementation complete in library; `graph-a11y-toggle` was failing (9 vs 23+ items) — **resolved in r3.2**; root cause was a stale `@spacegraphjs/a11y` dist, not a render-model timing/reactivity issue. Phase 4.8 motion envelope verified complete with component tests. **Phase 4.9 publish deferred indefinitely** — packages consumed via gitlink/workspace; continuous improvement in monorepo. Phases 5-8 remain.
- **r2:** removed contract negotiation; pulled streaming forward; merged LOD + groups into one arc;
  folded motion in; parked Vision/ONNX with unblock conditions; added sizing and critical path.

### 8.5 Out of scope

New renderers, new layout engines, ONNX weights, inter-graph composition, spatial-OS ambitions,
multi-agent orchestration views, contract versioning or any compatibility shim, and any change that
makes the transcript worse to serve the map. The graph stays opt-in and lazy until T2.2 says
otherwise.

## Verification

`bun run check` · `bun run graph:verify` · `bun run graph:scale` · `bun run graph:capture
--mode=verify` (advisory) · clean-clone rehearsal · merged PR review against the stop rule in
`SPACEGRAPH.md` §10.

## Continuous Improvement Focus (Upcoming Sessions)

Since publishing is deferred indefinitely, development continues in the monorepo with focus on:

### Immediate (Phase 4.6 completion) — DONE 2026-11-06
- [x] Fixed `createOrderedModel` to include all render model nodes (removed contentIDs filtering)
- [x] Plumbed `renderModel` through GraphOverlayManager to GraphA11y for canvas parity
- [x] Fixed `graph-a11y-toggle` test — root cause was (1) host hid drawn group members when band read `overview` (default before first viewport report) and (2) stale `@spacegraphjs/a11y` dist bundle (flat `setItems`, no child flattening); dist rebuilt. Band/collapsedGroups a11y plumbing and the dead `ordered` prop chain deleted. Full session-graph component suite: 53 passed, 14 intentionally skipped.

### Near-term (Phase 4 enhancements)
- [x] Complete group kinds 4–5: compaction-group, facet-group (staged in sub-layout.ts, vocabulary.ts, session-builder.ts)
- [x] Golden tests for sub-layout round-trip (fold → unfold → byte-identical positions) — implemented in session-ui/src/graph/sub-layout.test.ts using kernel's generic applySubLayouts
- [ ] Fractal unfold UX: search-hit ring, `aria-live` announcements, badge count animation
- [ ] Folded group count badge animation (already in graph-motion.css, needs integration)

### Medium-term (Phase 5–6)
- [ ] Discovery affordances: first-run demo map, "see map" after errors/compaction, command palette entries, PR-embed SVG export
- [ ] Product experiments: Trust lens (`?lens=unverified`), NLQ over facet grammar
- [ ] Library leverage: host-neutral activity adapter (second host), `pnpm run docs` in CI, folded dividend measurement (`graph:scale` on 5,001 messages)

### Parked (Phase 7 — unblock conditions tracked)
- Vision CI: unblock when visual regression escapes twice or T2.2 wins
- ONNX path: unblock when training pipeline ships weights
- Graph-guided compaction: unblock via upstream design conversation or T2.2 win
- Cross-session memory graph (D4): unblock via T2.2 win or design partner

### Quality gates (always)
- `bun run check` passes
- `bun run graph:verify` passes (advisory visual, structural gates block)
- Component + e2e coverage maintained

## References

- `SPACEGRAPH.TODO.29.md` — incident response this plan inherits; 5.3 superseded here; 3.7 carried
  into Phase 2 as implemented
- `SPACEGRAPH.TODO.27.md` / `SPACEGRAPH.TODO.28.md` — release phases carried
- **Lift-to-library principle**: Generic capabilities built in the integration move to `spacegraphjs/` when a second host needs them or the capability is demonstrably reusable. Current lifts: sub-layout engine → `spacegraphjs/kernel`. See Phase 6 for candidates.
- Library seams: `src/core/WebGLRenderer.ts:202` (viewport payload), `src/plugins/ZoomBandsPlugin.ts`
  (bands + hysteresis), `src/plugins/LODPlugin.ts` (culling only), `src/core/CameraControls.ts:173,181`
  (`cancelTweens`), `packages/renderer/src/index.ts:157,204` (viewport band, bandChange),
  `packages/spacegraph-renderer/src/index.ts:184` (`readViewport`), `src/nodes/HtmlNode.ts:116`
  (markup updates on model change), `src/a11y/AccessibilityLayer.ts:8` (flat items)
- Host seams: `canvas/GraphCanvas.tsx:188-194` (streaming site), `ui/graph-selection.ts:75`,
  `ui/useGroupCollapse.ts` (explicit collapse), `session-ui/src/graph/{collapse,layout,facets,adaptive}.ts`,
  `canvas/sessionGraphAdapter.ts:161` (band boxes), `ui/graph-camera.ts:100` (reduced motion),
  `ui/GraphA11y.tsx` (mirror), `gui-plugins/src/spacegraph/model.ts:49,131` (level defaults)
- Gate seams: `script/capture-graph-demo.ts` (verify/bless/frame), `script/pixel-diff.ts`,
  `script/graph-verify.ts:55-113`, `.github/workflows/graph.yml:25`, `script/graph-setup.ts:15`
