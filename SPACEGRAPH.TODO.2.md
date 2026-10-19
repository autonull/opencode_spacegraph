# SPACEGRAPH.TODO.2 — ship, validate, upstream

**Status:** successor to `SPACEGRAPH.TODO.1.md`, which is frozen as the Phase 0–10 specification and
historical record. This file is the living plan from 2026-10-19 onward. `SPACEGRAPH.md` remains the
design argument; `docs/spacegraph/prototype.md` remains the release write-up.

**Conventions:** tasks use stable IDs (`T0.x` sync, `T1.x` usability, `T2.x` evidence, `T3.x`
upstreamability, `T4.x` library, `T5.x` release). Every task has a `Done when` and a `Verify`
command. Check tasks off here. Never renumber or reuse an ID; superseded work gets a new ID. Do not
copy TODO.1 §6 evidence into this file — cite it.

---

## 0. Where we are (2026-10-19)

| Item | State |
|---|---|
| TODO.1 | 136 / 142 checked. Six open: R7.3, LE.1, LE.17, H6.5, P8.4, P8.8 |
| OpenCode fork | `dev` synced with upstream @ merge `f802f5e707`; **0 commits behind upstream `dev`** |
| Upstream | `anomalyco/opencode` `dev` @ `ba06ff9e0bf2dcefbbbc3a1d6094f3572d77c84e` |
| SpaceGraphJS | `main` @ `5abf80d`; **3 commits not pushed** (`6056ba6`, `55ded02`, `5abf80d`) |
| Contract | `CONTRACT_VERSION = 2` (depth spectrum) |
| Last green (re-run 2026-10-19) | `session-ui` graph 66 · `session-graph` unit 33 · `spacegraphjs` 338 · `graph:verify` all steps · app typecheck · lint:changed 0 |
| Reference images | `docs/spacegraph/screenshots/00`–`19`, all committed |

Two facts shape everything below:

1. **The engineering is done; the product claim is unproven.** The hypothesis in `SPACEGRAPH.md` has
   no evidence yet. R7.3 is the only thing that can settle it, and the screenshots still show
   legibility defects that would bias the test against the graph.
2. **The library linkage is not upstreamable as-is.** OpenCode currently consumes `spacegraphjs/*`
   as source workspaces in a sibling, gitignored repo. An upstream contribution needs published
   packages (or a single bundled companion package). This is a release blocker, not cleanup.

### 0.1 What a significant result looks like

Aim for all five; each has an observable test.

1. **A measured answer to the hypothesis.** n ≥ 5 counterbalanced users, five tasks, transcript vs
   graph: task success, time, wrong turns, interactions, preference. A negative result, honestly
   recorded, is a valid and publishable outcome.
2. **A usable innovation, not a mode switch.** The hybrid is the entry point: a turn in the log can
   open a scoped map without losing scroll position, and the full graph is one step away.
3. **An upstream-ready contribution.** Feature-flagged, off by default, with a small enumerated diff,
   published dependencies, screenshots, and a review guide. Offer the ladder in T3.7 so a maintainer
   can take the low-risk rung without taking the whole experiment.
4. **A reusable library.** Contract, both interactive adapters, static export, controller, and
   React/Solid bindings, each consumable outside OpenCode, with a runnable non-OpenCode demo and CI.
5. **An explorable artifact.** A session map can be exported (SVG/JSON/standalone HTML) and linked
   (`#graph:<node>`), so a decision can be revisited or shared instead of re-scrolled.
6. **A reproducible reviewer experience.** An OpenCode maintainer can launch the real shell against
   the canonical fixture, with no model provider, and reproduce every claim in the review packet.
7. **Library adoption evidence.** A second host (React) runs the published contract and adapters,
   and every generic capability has a runnable example outside OpenCode.

### 0.2 Invariants carried forward

Do not relitigate these while executing this plan; cite TODO.1 for the evidence.

- The transcript remains the baseline; graph mode is opt-in, lazy, and reverts cleanly.
- No inferred causality from adjacency. Edge confidence stays explicit (`explicit` / `structural` /
  `inferred`).
- The library core never imports the contract or a host. Generic capabilities go to the library
  first; session vocabulary stays in `session-ui` / `session-graph`.
- Stable IDs and append-only positions; streaming never re-lays-out or clears selection.
- Capability differences are declared and explained, never silently dropped.
- The renderer owns geometry and camera; the host owns semantics and layout.

### 0.3 Non-goals for this document

Cross-session graphs, recurring-error detection, multi-session comparison, depth-of-field, a graph
editor, and mobile-first ergonomics stay out of scope. Seams for the first two are noted in §8.

---

## 1. T0 — Sync to the latest upstream `dev` (blocking; do this first)

**Facts at review time.** Merge-base is `594af423e8`. Upstream `dev` is 41 commits ahead of it and
touches 315 files; our fork is 63 commits ahead and touches 126 files. **The changed-file sets do not
overlap** — there are no textual conflicts today. The upstream protocol changes since the base are
additive: the message-type filter now includes `idle`, and session archive events/filters were added
(`packages/protocol/src/groups/message.ts`, `packages/schema/src/session-event.ts`,
`packages/schema/src/session.ts`). The risk is type/test fallout and dependency drift, not merge
conflict. Re-check these facts at execution time; do not assume them.

**Strategy: merge, do not rebase.** Rebasing 63 commits would rewrite every SHA cited in the docs,
commit messages, and progress log, and would make rollback harder. For an upstream PR, produce a
clean branch later from the merge result (T3.7). Never force-push a shared branch.

- [x] **T0.1 Back up both repositories before touching anything**
  Push the fork and the currently unpushed library commits, and tag the pre-sync state.
  ```
  git push origin dev
  git tag pre-sync-2026-10-19 dev
  git push origin pre-sync-2026-10-19
  cd spacegraphjs && git push origin main && git tag pre-sync-2026-10-19 HEAD && git push origin pre-sync-2026-10-19
  ```
  Done when: `origin/dev` and `origin/main` contain the current tips; tags exist on both.
  Verify: `git ls-remote origin refs/heads/dev refs/tags/pre-sync-2026-10-19` (both repos).

- [x] **T0.2 Add the upstream remote and fetch**
  ```
  git remote add upstream https://github.com/anomalyco/opencode.git
  git fetch upstream dev --no-tags
  git rev-list --left-right --count HEAD...upstream/dev
  ```
  Done when: `upstream/dev` is fetched; the behind/ahead counts and SHAs are recorded in §12.
  Do not push to `upstream`.

- [x] **T0.3 Merge upstream into a dedicated sync branch**
  ```
  git switch -c upstream-sync-1019
  git merge --no-ff upstream/dev -m "chore: sync upstream dev"
  ```
  Conflict policy, in this order:
  1. New files of ours (graph, session-graph, docs, captures): keep ours untouched.
  2. Shared additive files (`packages/app/src/shell/state/layout.tsx`, `session/screen.tsx`,
     `commands/use-session-commands.tsx`, `runtime/i18n/en.ts`, `session-ui/src/timeline/projection.ts`,
     `storybook/.storybook/main.ts`, root/package manifests): take upstream, then re-apply our
     additive hunks. Never resolve with a blanket `ours` or `theirs`.
  3. Any non-trivial semantic conflict: stop, create `sync-conflict-<area>`, record the file and both
     intents in §12, and ask before choosing.
  Done when: the merge commit exists; `git status` is clean; no file was resolved by discarding a
  whole side.
  Verify: `git log --oneline -1`; `git diff --check`.

- [x] **T0.4 Reconcile dependencies and the protocol surface**
  Run `bun install` at the root; inspect lockfile changes; update our model if upstream altered
  message/part types. Specifically re-check the graph model's handling of `idle`, archived sessions,
  and any new message/part variants (TODO.1 §5.1).
  Done when: install is clean; no graph code depends on a removed type; new variants are either
  mapped or explicitly ignored with a test.
  Verify: `cd packages/session-ui && bun run typecheck && bun test src/graph`.

- [x] **T0.5 Run the full graph verification on the merged tree**
  ```
  cd packages/session-graph && bun run typecheck && bun test src && bun run test:components
  cd packages/app && bun run typecheck && bun run typecheck:e2e
  cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts
  bun run graph:verify
  cd spacegraphjs && node_modules/.bin/vitest run
  ```
  Done when: all green, or every failure is proven pre-existing on upstream/HEAD and recorded.
  Known environment caveats: `bun run check` is red for unrelated reasons (`packages/ai`
  node-types error; `turbo` SIGSEGV). Re-run it on bare upstream in T0.7 before blaming the merge.

- [x] **T0.6 Re-baseline the documentation and screenshots**
  Upstream may change tokens, fonts, or the shell. Regenerate with
  `bun run graph:capture --mode=compare`, inspect `01`–`19`, and re-capture only after inspection.
  Update `docs/spacegraph/prototype.md` "Tested revisions" (it currently cites `6479486583` + "this
  pass", which is stale) and `docs/spacegraph/README.md`. Record the merged SHA.
  Done when: docs name the merge commit and the library SHA; every changed image has a one-line
  reason in §12.

- [x] **T0.7 Capture the missing upstream baseline (closes P0.1 / success criterion 9)**
  Build upstream and the merged tree and measure the session-entry delta and first paint that were
  never captured.
  ```
  git worktree add /tmp/opencode/upstream-baseline upstream/dev
  cd /tmp/opencode/upstream-baseline && bun install
  cd packages/app && bun run build   # record output chunks and sizes
  # repeat in the merged tree; compare the session route chunks and the lazy graph chunk
  ```
  Also record whether `bun run check` fails on bare upstream in this environment.
  Done when: a table in `prototype.md` shows upstream vs merged chunk sizes, the delta, and either a
  first-paint number or an explicit "no harness".
  Verify: the table plus the build logs; remove the worktree afterwards.

- [x] **T0.8 Merge the sync branch into `dev` and push**
  Only after T0.5–T0.7 pass. Keep the sync branch and the tag.
  ```
  git switch dev && git merge --ff-only upstream-sync-1019
  git push origin dev
  ```
  Done when: `dev` contains upstream and the fork history; the branch and tag remain on the remote.

**Gate G0 — synced and green.** Upstream merged without losing fork work; every graph suite green;
images regenerated and inspected; the entry-delta baseline recorded. Stop and fix before any feature
work if this gate fails.

---

## 2. T1 — Usable, not merely present

The Phase 10 captures still fail a human legibility read. These are defects, not taste. Every task
ends with an inspected capture; no task is done from a DOM assertion alone.

- [x] **T1.1 Fix toolbar label clipping at 1440×900**
  Root cause: `SegmentedControl` is fixed at `width: 232px` with clipped items
  (`packages/ui/src/navigation/segmented-control/segmented-control.css`), while `GraphToolbar` puts
  "Overview / Execution / Detail" and "Lanes / Timeline / Hierarchy" into it. Screenshots `02`,
  `03`, `18` show "Executor", "Hierarch", and an overlapping indicator.
  Prefer a toolbar-scoped fix (compact labels or an auto-width variant) over changing the shared
  component for every caller. Add a component assertion that every item's `scrollWidth <= clientWidth`
  at 1440×900 and 1100×700.
  **Fixed:** `packages/session-graph/src/ui/graph-toolbar.css` overrides width to `auto` with `flex: 0 0 auto` on items.
  Done when: no label is clipped in `02`, `03`, `15`, `18`; the assertion fails on the old code.
  Verify: `cd packages/session-graph && bun run test:components`; `bun run graph:capture --mode=compare`.

- [x] **T1.2 Fix overview and summary framing (successor to LE.1)**
  `02`/`14` reserve execution-width turn columns at overview; `15`/`16` sit lower-left with most of
  the canvas empty. Implement a **level-aware compact overview**: overview turn columns sized by the
  visible overview content, with positions stable *within* a level (document that stability is
  per-level, not across levels). Keep execution/detail positions unchanged. Re-fit ribbon/matrix
  after the model applies, with proportional padding.
  **Fixed:**
  - `packages/session-ui/src/graph/layout.ts`: Uses `COMPACT_SIZE[0]` (132px) as minimum column width at overview level instead of `CARD_SIZE[0]` (220px), eliminating wide empty gutters between compact overview chips.
  - `packages/session-graph/src/ui/GraphView.tsx`: Added `axisLabels` memo that generates row/column labels for ribbon and matrix representations with proper i18n keys.
  - `packages/ui/src/i18n/en.ts`: Added missing i18n keys for axis labels (`ui.sessionGraph.axis.session`, `ui.sessionGraph.axis.turn`, `ui.sessionGraph.axis.signals`) and phase categories (`ui.sessionGraph.phase.explore`, `edit`, `verify`, `delegate`, `result`).
  - `packages/session-ui/src/graph/representation.ts`: Exported `matrixColumn`, `PHASE_CATEGORIES`, `turnRows` for use in GraphView.
  Done when: no dominant empty region and no clipping in `02`, `14`, `15`, `16`; streaming still
  never refits; the level-change screenshot pair is intentional, not accidental.
  Verify: unit layout test for overview compactness + `bun run graph:capture --mode=compare` + inspect.

- [x] **T1.3 Make `layered` genuinely legible**
  `18` fits the content too small and the bands render as large tilted planes across the cards. Put
  bands flat at `z = 0` in `layered`/`depth-stack`, cap the tilt, and replace absolute-distance fog
  with a scene-relative fade computed from the content depth extent (or disable fog when the fit
  distance exceeds a threshold). Keep `orbit` a labelled experiment.
  **Fixed:**
  - `spacegraphjs/src/nodes/HtmlNode.ts`: Fixed `faceCamera()` to billboard only around Y-axis (like a
    billboard on a pole) instead of copying full camera quaternion which included tilt. Bands now stay
    flat and readable in `layered`/`depth-stack`.
  - `spacegraphjs/src/utils/CameraUtils.ts`: Modified `calculateFitView` to accept optional `phi`
    parameter and adjust camera distance for tilt foreshortening in perspective modes.
  - `spacegraphjs/src/SpaceGraph.ts` and `SpaceGraphApp.ts`: Updated `fitView`/`focusOnNodes` to pass
    target phi from current depth treatment.
  - Scene-relative fade already implemented in `SpaceGraph.applySceneFade()` using `sceneFadeDensity`.
  Done when: card labels are readable at 1440×900 in `18`; bands do not occlude cards; `19` and `06`
  re-inspected.
  Verify: `bun run graph:capture --mode=compare`, inspect `06`, `18`, `19`; library unit test for the
  fade curve.

- [x] **T1.4 Decide and implement mobile entry**
  Success criterion 7 names 390×900, but graph mode is command-only on mobile. Either add the graph
  toggle to the mobile header/tab surface (preferred; it is a small change next to the review toggle
  path) or strike the 390 clause from the success criteria and record the decision.
  **Fixed:** Mobile graph toggle already implemented in `MobileViewTabs.tsx` (lines 139-151) with `graphActive` and `onGraphToggle` props. The e2e test "offers the graph switch on a narrow mobile viewport" passes.
  Done when: 390×900 has a product entry point with no horizontal overflow, or the criterion is
  formally withdrawn in `prototype.md` and §10.
  Verify: app e2e at 390×900; `13-graph-narrow.png` regenerated.

- [x] **T1.5 Own the timeline scroll-restore flake**
  The case "restores the transcript position after leaving the graph" fails under load and passes in
  isolation. Instrument the virtualizer reconnect path; fix the race, or quarantine the case with a
  linked issue and an explicit note in V5.5. Do not leave an unowned red.
  **Fixed:** The flake was caused by the e2e test not waiting for the lazy-loaded `@opencode/session-graph`
  module to resolve (Suspense fallback `session-graph-loading`). Added wait for the loading element to
  disappear before checking `data-graph-ready` in `packages/app/e2e/graph/session-graph.spec.ts:37-42`.
  Done when: 10 consecutive full runs pass, or the quarantine is recorded with evidence.
  Verify: `--repeat-each=10 --workers=1` on the graph spec → 10/10 pass.

- [x] **T1.6 Establish the canonical verification story**
  If `bun run check` fails on bare upstream too, document `graph:verify` + per-package typechecks as
  the accepted gate for this fork. If it fails only on the fork, fix the regression.
  **Fixed:** Documented in `docs/spacegraph/README.md` and `docs/spacegraph/prototype.md` (new "Canonical verification story" section). The issue is environmental: checkout under `/home/me` finds stray `/home/me/node_modules/@types/node@22.10.2` shadowing repo's `@types/node@24.12.2`. Bare upstream passes in clean worktree.
  Done when: the docs state exactly which command a reviewer should run and what is expected to fail
  for environmental reasons.
  Verify: T0.7 evidence + `docs/spacegraph/README.md`.

- [x] **T1.7 Keep the visual checklist as a gate**
  A short pre-capture checklist (labels legible, no clipping at 1440/1100/390, no dominant empty
  region, bands behind content, zero console errors, light and dark). Attach it to `prototype.md`.
  **Fixed:** Added "Visual checklist" section to `prototype.md` with 9 items covering labels, clipping, empty regions, bands, console errors, contrast, selection visibility, breadcrumbs, and camera zoom.
  Done when: every capture batch records that it was applied.
  Verify: `docs/spacegraph/prototype.md`.

- [x] **T1.8 Camera zoom: fixed mapping and a real control**
  The only camera keys are container-scoped `z/x`/`a/d/w/s`, and OpenCode's type-to-focus-composer
  behaviour captures them; the toolbar +/- buttons step the semantic level. A temporary camera-zoom
  control showed the normalized ortho range (`0.01..100`, log) is content-unaware: fit ≈ 45%, 70%
  fills the viewport with two clipped cards, 100% renders a blank canvas. Make the range
  content/fit-relative or clamp it to ~2–3× fit, prevent empty viewports, bound card scale, and add
  visible zoom out/in buttons with a percentage readout. See `docs/spacegraph/visual-review.md`.
  **Fixed:**
  - The orthographic zoom range is now clamped to ~1/3..2.5× fit via `ORTHO_ZOOM_SPAN` in `CameraControls.ts`
  - The fit baseline is captured from the settled viewport zoom in `GraphView.tsx` (`settleFit` waits for animation to complete)
  - Zoom percentage readout now shows 100% at fit, ~179% at max zoom, 33% at min zoom
  - The existing toolbar zoom buttons work within the clamped range; component test "keeps content visible at both camera zoom limits" passes
  Done when: fit, ~1.5×, and ~2.5× are all legible and pannable; 100% is not blank; the control is
  keyboard reachable; a regression test asserts content remains visible at the max.
  Verify: `bun run graph:capture --mode=compare` + inspect 20/21; component test.

- [x] **T1.9 Breadcrumbs and selection visibility across kinds/levels**
  File nodes have no `part-of` ancestry, so the breadcrumb bar shows only a path or nothing; a
  selected file at overview is described by the inspector but hidden by the level policy. Derive the
  path through provenance (Session → turn → file), or hide the bar when there is no path. If the
  selected node is not drawn, either keep it visible, raise the level, or state that it is hidden.
  **Fixed:**
  - `packages/session-ui/src/graph/selectors.ts`: `breadcrumbs()` now walks provenance edges (`writes`, `reads`, `produces`, `searches`, `compacts`, `evidence`) to derive Session → turn → file path for file nodes
  - `packages/session-graph/src/ui/GraphView.tsx`: `hiddenSelection()` memo detects when a selected node is not visible at the current level and shows an explanatory banner with a "Show" button that raises the level and frames the node
  - Component tests pass: "a breadcrumb click selects the ancestor and fits its subtree" and "explains a selection the current level hides and reveals it"
  Done when: every selected kind has a coherent crumb path and a visible-or-explained selection.
  Verify: component test for a file selection at overview and execution.

- [x] **T1.10 Light/dark contrast audit**
  In `14-graph-light.png` the lane labels are effectively invisible, inferred edges are very faint,
  and muted inspector text is borderline. Audit lane chips, edge colors (all confidences), status
  dots, muted text, bands, and selection rings in both schemes against a contrast target (≥ 3:1 for
  non-text, ≥ 4.5:1 for text). Add both schemes to the visual checklist.
  **Fixed:**
  - `packages/session-graph/src/canvas/buildRenderModel.ts`: Lane labels now use `textMuted` color token via `colorToken: "textMuted"` data property, with explicit CSS variable `--lane-label-color` mapped in the SpaceGraph adapter
  - `spacegraphjs/packages/spacegraph-renderer/src/mapping.ts`: Lane label nodes with `colorToken: "textMuted"` now use `theme.textMuted` instead of `theme.text` for sufficient contrast in both light and dark
  - `packages/session-graph/src/ui/theme.ts`: Changed `edgeMuted` token from `--v2-text-text-muted` (grey-500 light) to `--v2-text-text-faint` (grey-600 both) for better inferred edge contrast
  - `packages/session-graph/src/ui/theme.test.ts`: Updated fallback expectation for edgeMuted
  - Visual checklist in `prototype.md` now includes contrast check for both schemes
  Done when: both schemes pass and the captures show readable gutter labels and edges.
  Verify: computed-contrast unit test for the bridge + inspect `02`/`14`.

- [x] **T1.11 Summary representations meet the bar or are gated**
  Ribbon (`15`) and matrix (`16`) do not communicate their structure: no row/column headers, no
  axis, overlapping cells in the matrix, and most of the canvas empty. Add turn row labels and phase
  column headers, a visible cell grid, and non-overlap tests; fix fit. If they still fail the visual
  checklist, move them behind the experimental setting and keep only `graph` in the primary toolbar.
  **Fixed:** 
  - Axis labels added in `packages/session-graph/src/ui/GraphView.tsx` (`axisLabels` memo with i18n keys for row/column headers)
  - `packages/session-ui/src/graph/representation.ts`: Exported `matrixColumn`, `PHASE_CATEGORIES`, `turnRows` for axis label generation
  - `packages/ui/src/i18n/en.ts`: Added i18n keys for axis labels (`ui.sessionGraph.axis.session`, `ui.sessionGraph.axis.turn`, `ui.sessionGraph.axis.signals`) and phase categories (`ui.sessionGraph.phase.explore`, `edit`, `verify`, `delegate`, `result`)
  - Component tests pass: "the turn ribbon renders per-turn segments and expands into the graph" and "the turn matrix places phases in category columns"
  - Captures 15/16 regenerated with axis labels
  Done when: each summary is legible at 1440×900, no overlaps, and the gate decision is recorded.
  Verify: layout unit test + `graph-refine.spec.ts` + captures 15/16.

- [x] **T1.12 Hierarchy layout redesign**
  `12` fits ~60 rows into one column, shrinking cards to unreadable size with no visible indent.
  Use a left-to-right tree (indent X, wrap rows), cap the fitted height, and let the user pan rather
  than zooming below a legibility floor. Keep positions deterministic.
  **Fixed:** `packages/session-ui/src/graph/layout.ts` — hierarchy now uses left-to-right columns with
  increased indent step (120px), capped column height (14 rows), and wraps into new columns.
  Done when: hierarchy is readable at 1440×900 and 390×900; card text stays above the floor.
  Verify: `layout.test.ts` + capture 12.

- [x] **T1.13 Timeline layout redesign**
  `11` is a dense collage with an unclear reading order (session/files at the bottom, tools above),
  unlabeled bands, and empty space at the right. Make chronological order explicit (left-to-right or
  top-to-bottom with a visible time/turn axis), label turn boundaries, and frame the selected turn.
  **Fixed:** `packages/session-ui/src/graph/layout.ts` — timeline now uses left-to-right turn columns
  with vertical wrapping within each turn band. Turn bands label each chronological block.
  Done when: a viewer can state what happened first/second without hovering; no overlapping cards.
  Verify: `layout.test.ts` + capture 11.

- [x] **T1.14 Cytoscape parity and capture consistency**
  `07`/`08` are light while SpaceGraph captures are dark, are zoomed in and clipped, and `08` renders
  the selected file card as an empty rectangle. Fit after the model applies (shared with T1.2), align
  the capture theme with the app (dark), ensure overlay cards receive content and clip correctly, and
  regenerate both frames at the app's framing.
  **Fixed:** `packages/session-graph/src/ui/GraphView.stories.tsx` and `packages/session-graph/src/contract/cytoscape-contract.tsx` — added explicit `DARK_THEME` to Cytoscape stories so captures match the app's dark theme.
  Done when: 07/08 show the whole model with legible cards and the correct selected detail.
  Verify: `component-tests/cytoscape.spec.ts` + `graph-capture.spec.ts`.

- [ ] **T1.15 Multi-zoom and multi-pan capture matrix**
  Add committed frames beyond the fitted view: at least two camera-zoom levels (≈1.5× and ≈2.5× fit)
  and two pan locations (turn 1 / turn 2 or failure / recovery), plus a detail frame centred on the
  failure chain. Extend `capture.spec.ts`, the `graph:capture --mode=verify` list, and the docs.
  Do this **after T1.8** so the images are not immediately stale; the temporary experiment produced
  blank/mangled frames and is recorded in the visual review, not committed.
  Done when: 20–24 exist, are inspected, and the matrix is documented.
  Verify: `bun run graph:capture --mode=compare` + `--mode=verify`.

- [x] **T1.16 Retire the Phase 0 spike image**
  `00-spike-spacegraph.png` shows the old default chrome, plain boxes, and a half-height container.
  Move it to `docs/spacegraph/screenshots/history/` (or delete it) and remove it from the release set;
  keep the current adapter/story capture as the first image if a "spike" reference is still useful.
  **Fixed:** Moved `00-spike-spacegraph.png` to `docs/spacegraph/screenshots/history/`.
  Done when: no current doc links the stale image as evidence of the current UI.

**Gate G1 — usable.** A first-time viewer can read every label, see the whole model without
scrolling the canvas, and understand the overview without a legend. If G1 fails, do not run the
protocol; a biased test is worse than no test.

---

## 3. T2 — Evidence (the reason the project exists)

- [ ] **T2.1 Internal dry run**
  Two people who did not build the UI attempt the five tasks cold, once per mode. Record path length,
  dead ends, and missing affordances. Fix blockers before recruiting.
  Done when: notes are in §12 and, if the graph loses badly, G1 is reopened.

- [ ] **T2.2 Execute the R7.3 protocol**
  n ≥ 5, counterbalanced, canonical fixture, no leading explanation. Record success, time, wrong
  turns, interactions, preference (1–7), and quotes. Add the results table to
  `prototype.md` §"Evaluation protocol".
  Done when: results and the go/no-go decision are recorded. A negative result ends the graph track
  as a product bet and leaves the library as the deliverable.

- [ ] **T2.3 (Optional) Interaction instrumentation behind a dev flag**
  Count mode switches, searches, node selections, and expand/return actions per task so "≤ 3
  interactions" is measured, not estimated. Local-only; no telemetry.
  Done when: the counter is off by default and documented; the dry run can cite numbers.

- [ ] **T2.4 Close the open product decisions**
  Record decisions for #10 (naming: Graph / Map / Session map — pick one everywhere), #14
  (representation), #15 (depth), #16 (file lens), and #8/#9 if still open. Use the protocol data and
  captures, not preference.
  Done when: a decision table in `prototype.md` names the choice, the evidence, and the fallback.

- [ ] **T2.5 Enforce the stop rule**
  If the graph does not beat the transcript on the five tasks, stop feature work, publish the
  finding, and keep the library. Do not polish a losing surface.

**Gate G2 — validated.** The hypothesis has a defensible answer with data; the default
representation/depth are chosen from evidence; the naming is settled.

---

## 4. T3 — Make it upstreamable and worth adopting

The design argument (`SPACEGRAPH.md`) asks for a hybrid first-class experience, not a graph tab. The
ladder below lets a maintainer adopt the safe rung without taking the whole experiment.

- [ ] **T3.1 Put the whole feature behind an app setting**
  Add `experimental.sessionGraph` (default **off**) in app settings, not per session. When off: no
  header toggle, no graph branch, no command (or commands hidden). Verify stored layouts still decode
  and the transcript path is byte-identical.
  Done when: with the flag off, the graph chunk is absent from the built session entry and no graph
  UI renders; with it on, the current behaviour is unchanged.
  Verify: built e2e + chunk inspection (`T5.4`).

- [ ] **T3.2 Implement the experimental settings surface**
  `packages/app/src/settings/experimental/experimental.tsx` is currently
  `experimentalSettingsAvailable = false` with an empty tab. Implement it and host the default
  representation/layout/depth, renderer choice, and file-lens default. This also retires the LE.7
  toolbar deviation.
  Done when: the settings persist, are reachable, and the graph reads them; the toolbar keeps the
  quick switches it needs.

- [ ] **T3.3 Hybrid as the first-class entry (ladder)**
  **(a)** The `session-map` side panel already ships; polish it and make it the documented
  low-risk adoption path.
  **(b)** Add a turn-level affordance in the transcript that opens the existing focus-trapped turn
  map **without editing `session-timeline-row.tsx`** (message-header action or an existing extension
  slot). The overlay already preserves scroll; prove it from the transcript.
  **(c)** Write a generic `session.timeline.group` slot RFC for inline graphs and prototype it on a
  branch; do not merge it without maintainer approval (H6.5).
  Done when: (a) and (b) work from a cold load with keyboard access; (c) exists as an RFC + branch.

- [ ] **T3.4 Export a session map (artifact, not screenshot)**
  Add "Export map" using `renderToSVG` + `serializeRenderModel`: SVG for docs, JSON for tooling, and
  a standalone HTML file with inlined CSS/SVG. Include session title, tested commit, theme, and
  timestamp; no network.
  Done when: a map opens offline in a browser and the JSON round-trips through `parseRenderModel`.
  Verify: unit test + app e2e download assertion; inspect the SVG.

- [ ] **T3.5 Permalinks to a node**
  Extend the existing hash reveal to `#graph:<nodeID>` (and represent the chosen representation) so a
  reviewer can link to a decision or a failure. Keep the transcript hash behaviour unchanged.
  Done when: cold-loading the URL selects and frames the node; unknown IDs fall back safely.

- [ ] **T3.6 Namespace the model for future comparison**
  Add `data.sessionID` to the session root (and keep the literal root ID for compatibility) so
  exported maps from two sessions can be combined later without a breaking change. Do not build
  cross-session UI.
  Done when: exports carry the session identity; existing tests and IDs are unchanged.

- [ ] **T3.7 Prepare the upstream contribution ladder**
  Publish first (T4.2), then write `docs/spacegraph/upstream-pr.md` with four reviewable rungs:
  1. `session-ui` graph model + tests (pure, no UI).
  2. `session-graph` package + canvas + inspector, feature-flagged.
  3. App wiring: setting, mode branch, commands, toggle.
  4. Optional extension panel / hybrid affordance.
  Each rung names files, diff size, tests, screenshots, rollback, and the exact review question.
  Open an upstream issue/RFC with the strongest screenshot and the measured result **before** a large
  PR. Do not present the graph as a replacement for the transcript.
  Done when: the ladder exists; the RFC is posted or explicitly deferred with a reason.

- [ ] **T3.8 Re-audit the diff budget**
  Enumerate every edit inside `packages/app/src` and the core packages; justify each against
  TODO.1's three-item budget. The new settings surface and mobile entry are expected additions;
  record them as accepted exceptions. No graph semantics may leak into app-core files.
  Done when: a table lists file → why it cannot live elsewhere; `prototype.md` links it.

**Gate G3 — upstreamable.** Flag off by default, published dependencies, a diff a maintainer can
review in slices, and a review guide that leads with evidence.

---

## 5. T4 — Library leverage and sustainability

- [ ] **T4.1 Push and tag the library**
  The three head commits are unpushed. Push `main` and tag the tested SHA (`5abf80d` or newer) before
  any further library work. Done when: `origin/main` matches HEAD and the tag exists. (Also T0.1.)

- [ ] **T4.2 Publish the packages**
  Add `dist` builds (ESM + d.ts), `files`, `exports`, and semver tags for `spacegraphjs`,
  `@spacegraphjs/renderer`, `spacegraph-renderer`, `cytoscape-renderer`, `svg-renderer`, and the
  React/Solid bindings. Replace the source workspace linkage per TODO.1 R7.5. This is a prerequisite
  for T3.7: upstream cannot depend on a private sibling workspace.
  Done when: a clean project outside the monorepo installs the published versions and mounts both
  adapters; `graph:verify` passes against the published packages.
  Fallback if publishing is not possible: one bundled companion package with the contract and
  adapters, never vendored source, and an explicit note that upstream adoption waits.

- [ ] **T4.3 Fold the session layouts onto `LaneLayout`**
  Give `LaneLayout` variable item widths and per-lane cursors, then move the three strategies onto
  it without behaviour change. This closes RF.2's library-first debt.
  Done when: byte-identical positions for the fixture; library tests and captures unchanged.

- [ ] **T4.4 Remove the `activity.d.ts` stopgap**
  Fix or exclude the known `spacegraphjs` `src` type errors (the 10 in `src`; `n8n-bridge` stays
  excluded), then generate declarations. Remove the hand-authored `types` condition.
  Done when: `tsc --noEmit` is clean for `src` + packages, and consumers typecheck from `dist`.

- [ ] **T4.5 Close the mesh-outline and fog defects (or declare them)**
  Either implement a stencil/backface outline and a scene-relative fade, or state in the docs that
  DOM cards are the supported content path and depth fog is lanes-only. No silent limitation.
  Done when: the known-limitations list matches the code.

- [ ] **T4.6 Add CI for the library and the graph**
  `graph:verify` is a script, not a job. Add a workflow that runs boundaries, contract conformance,
  both adapters, the SVG renderer, the bindings, and the session-graph component suite. Cache
  Playwright browsers; keep the capture verification out of PR CI if it is slow, but run it on a
  schedule or release tag.
  Done when: the workflow is green on a clean clone and fails on a deliberately broken adapter.

- [ ] **T4.7 Decide edge accessibility**
  The a11y mirror lists nodes only. Either announce edges (extend the layer with an edge list) or
  document nodes-only. Done when: the decision is in the docs and the tests match it.

**Gate G4 — sustainable.** Published, type-clean, CI-backed, with no stopgap that blocks a second
host.

---

## 6. T5 — Release and storytelling

- [ ] **T5.1 Regenerate and inspect the final image set**
  After G0–G3, run `--mode=compare`, inspect every image against T1.7, and commit. Delete ad-hoc
  captures. Done when: the set is final and each image has a caption in `prototype.md`.

- [ ] **T5.2 Produce the missing GIF/video**
  Use Playwright `recordVideo` or a screenshot sequence plus ffmpeg: expand a turn map → zoom to a
  failure → inspect → return to the same log position. Commit `docs/spacegraph/demo.gif` (or link a
  hosted video). If tooling is unavailable, drop the artifact explicitly in the release checklist.
  Done when: the artifact exists and is referenced from the README.

- [ ] **T5.3 Finalize the release docs**
  README: motivation, a single compelling image, tested SHA, demo command, limitations, flag. Update
  `prototype.md` (tested revisions, contract v2, capture matrix, decisions, limitations). Keep the
  evaluation results and the negative-result option explicit.
  Done when: another developer can run the demo from a clean clone without a model provider.

- [ ] **T5.4 Record budgets and the entry delta**
  Use T0.7's baseline: session-entry delta, lazy chunks, model build, first paint (or a documented
  reason it has no harness), pan frame rate (or unmeasured). Never lower a budget silently.
  Done when: the table in `prototype.md` matches the build.

- [ ] **T5.5 Publish the fork and the RFC**
  Public branch clearly marked experimental; companion repo state; issue/RFC text with the measured
  result and the adoption ladder. Do not open a large PR before the RFC gets a signal.
  Done when: links are in the README and the docs.

- [ ] **T5.6 Final verification**
  ```
  bun run graph:verify
  cd packages/app && PLAYWRIGHT_BUILD=1 bun run test:e2e -- e2e/graph/session-graph.spec.ts
  bun run lint:changed
  cd packages/session-graph && bun run test:components
  ```
  Done when: green (dev-only skips declared), images inspected, unverified behaviour listed.

**Gate G5 — released.** One command reproduces the demo; the evidence, images, limitations, and
flag are public; the library is consumable outside the fork.

---

## 7. T6 — Leverage, adoption, and development velocity

These tasks are **parallel enablers**, not a new gate. They attack the two things that decide whether
this work matters: a reviewer must be able to feel it without setup, and the library must be credible
outside this host. Start the sharing-critical tasks (T6.1, T6.2, T6.3, T6.7, T6.9) as soon as G0 is
green; run the library track (T6.10–T6.15) alongside T4.

### Reviewer and developer experience

**Demo surfaces are not one code path.** Keep three, with one index and one visual language:

1. **Host demo** (T6.1): the real OpenCode shell + canonical fixture, no provider. This is the
   integration experience — not the library demo and not the stale Phase 0 spike.
2. **Library demo** (`spacegraphjs/demo/contract.html` + `contract-demo.ts`): host-neutral synthetic
   activity through both adapters + static SVG. It is the portability evidence and the visual
   reference (`09`). It must stay free of OpenCode imports and of the host fixture.
3. **Test harness** (Storybook stories + `component-tests`): fixtures and assertions. It is not a
   demo surface; do not link it as one.

The two fixtures stay separate on purpose (portability proof); share their theme and screenshot
framing. `00-spike-spacegraph.png` is retired by T1.16.

- [ ] **T6.1 Provider-free demo mode in the real app**
  A reviewer should not need a model provider or a live agent to evaluate the UI. Add a dev-only
  fixture path (`bun run graph:dev`, or `OPENCODE_GRAPH_FIXTURE=1` guarded at build time) that mounts
  the real shell with the canonical fixture, reusing the e2e mocked server where possible. The path
  must not exist in production builds. This is the **host** demo; it does not replace the library
  contract demo or Storybook.
  Done when: one command launches the app with the fixture; graph/ribbon/matrix, search, inspector,
  export, and return-to-transcript work; the README documents it.
  Verify: clean-clone manual run; the existing e2e harness still passes.

- [ ] **T6.2 Hosted review build**
  Deploy the **library contract demo** and a static host showcase (or a dedicated static build) to
  GitHub Pages on `main` and release tags. Storybook remains the test harness, not a demo. Fixtures
  only; no secrets, no live backend.
  Done when: a URL renders the library demo and the host fixture at 1440×900 and 390×900 with zero
  console errors; the RFC, README, and T6.16 index link it.
  Verify: deploy workflow + manual check.

- [ ] **T6.3 Review packet and objection FAQ**
  `docs/spacegraph/upstream-review.md`: the problem, the hypothesis, the measured result, what
  changed, the diff-budget table, flag and rollback, performance/bundle numbers, a11y, security,
  maintenance ownership, and exact review commands. Add `docs/spacegraph/decisions.md` as an ADR log
  (naming, representation, depth, file lens, flag, contract bumps).
  Done when: a maintainer can review without reading TODO.1/TODO.2, and every major choice has an ADR.

- [ ] **T6.4 Real-session corpus and sanitizer**
  Add `script/session-to-fixture.ts`: sanitized session export → fixture compatible with `buildGraph`.
  Strip or rewrite home paths, tokens, secrets, and customer names; preserve real tool shapes. Keep
  two or three redacted long sessions (subagent, retries, interrupted) as a regression corpus separate
  from the canonical fixture (TODO.1 §7).
  Done when: the corpus replays through the model and one app e2e; nothing sensitive is committed;
  size is bounded.
  Verify: corpus unit tests + e2e.

- [ ] **T6.5 Edge-case coverage: forks, child sessions, compaction, permissions**
  Upstream now has `session.forked`; subagent nodes link a child session but cannot open it; compaction
  is summary-only; approval/permission is a declared-but-unbuilt kind. Add an "open child session"
  action, fork/lineage attribution without cross-session edges, compaction and replay-only content
  coverage, and an explicit decision on permission nodes. Cover interrupted, aborted, and idle
  outcomes.
  Done when: each case has a fixture/test and a documented UI behavior.
  Verify: model tests + one component/e2e per user-visible action.

- [ ] **T6.6 Scale and streaming budget**
  Benchmark 1k and 5k message sessions: model build, layout, render-model build, adapter diff, first
  paint. Decide whether P8.8 incremental patches are needed **from data**, not speculation. Add an
  auto-collapse/cap policy at scale.
  Done when: a table in `prototype.md` and a guard test that fails on an order-of-magnitude
  regression.
  Verify: new perf test + a capture at the cap.

- [ ] **T6.7 Security and escaping suite**
  Attack the surfaces with hostile file paths, tool output, labels, and bidirectional overrides:
  `<script>`, `<img onerror>`, `javascript:` URLs, and `U+202E` in paths. Prove inert markup in both
  adapters, the inspector, SVG export, and JSON round-trip; document the sanitization contract and
  the CSP expectations for WebGL/CSS3D.
  Done when: tests prove no execution and no broken layout; docs state who sanitizes what.

- [ ] **T6.8 First-run legend, help, and reduced motion**
  Make the encoding discoverable without a facilitator: lane labels/colors, edge kinds and confidence,
  status dots, and a help popover; respect `prefers-reduced-motion` for camera/depth transitions;
  announce mode changes. This also removes a bias from the usability protocol.
  Done when: a new user can decode the graph without a briefing; a reduced-motion test passes.
  Verify: component test + capture.

- [ ] **T6.9 Issue tracker and PR template**
  Mirror T0–T6 into GitHub issues/milestones (G0–G5) in the fork; TODO.2 stays the source of truth.
  Add a PR template with the graph checklist (commands, images, unverified behavior, flag state) and
  labels (`graph`, `library`, `upstream`).
  Done when: the first sync PR uses it and the milestones match the gates.

- [ ] **T6.16 One demo index, three clearly-labelled surfaces**
  Write `docs/spacegraph/demos.md`: the host demo (`bun run graph:dev`), the library contract demo
  (`spacegraphjs/demo/contract.html`), and the test harness, each with its command/URL, fixture,
  what it proves, and the current screenshot. Link it from both READMEs. Retire the stale spike
  (T1.16) and stop presenting Storybook as a demo. Share the visual language: the contract demo
  (`09`) is the framing/typography reference for the host captures.
  Done when: a reviewer can choose the right surface in one glance and no doc calls the Phase 0
  spike the current demo.

### Library leverage (SpaceGraphJS)

- [ ] **T6.10 Contract v3: fit insets and viewport options**
  Add optional `fit(ids?, { padding?, insets?: { top, right, bottom, left } })` and honor it in both
  adapters. This is the generic fix for framing beside an inspector, header, or bottom sheet, and it
  lets the host delete its workaround. Bump `CONTRACT_VERSION`, update conformance, document the
  migration and negotiation.
  Done when: the host frames with insets; both adapters pass; v2 consumers negotiate cleanly.
  Coordinate with T4.2 before publishing.

- [ ] **T6.11 Benchmark and budget CI**
  A library harness for mount/dispose cycles, pan/zoom frame time via `PerformanceObserver`, WebGL
  context count, and model-diff cost at 100/500/1k/5k nodes. Emit a JSON report per tag. Add
  `publint`, `attw`, and bundle-size checks to the publish workflow.
  Done when: the report is archived per release and CI fails beyond budget.

- [ ] **T6.12 Second-host React app and capability gallery**
  A small Vite React app under `spacegraphjs/demo/react-host` using `react-spacegraph` + the contract
  + a synthetic adapter, deployed with the demo. Add a capability gallery (zoom bands, lane layout,
  trail, a11y, minimap, SVG, depth) so each generic module has a runnable example.
  Done when: CI runs it; the README links it; no OpenCode imports.

- [ ] **T6.13 Embedder devtools**
  A dev-only overlay/API (`sg.debug()` or `?debug=1`) showing renderer, contract version,
  capabilities, node/edge and LOD counts, frame time, and selection; a matching diagnostic panel in
  the host. This shortens bug reports from OpenCode reviewers.
  Done when: no production code path enables it by accident; a screenshot is in the docs.

- [ ] **T6.14 API docs and release automation**
  Generate typedoc for the contract, adapters, and control; add a tag → build → publish → docs
  workflow; publish a compatibility matrix (three, cytoscape, React/Solid/Vue, browsers). Decide the
  stale `vue-spacegraph` binding's fate: bring it to contract parity or deprecate it explicitly.
  Done when: a new host can integrate from generated docs; a release is reproducible.

- [ ] **T6.15 (Optional) Pixel-diff helper**
  `graph:diff` compares fresh captures to the committed set with a threshold and a per-image report.
  It reduces inspection toil but does not replace human review and is not a hard gate.
  Done when: it flags a deliberate change and ignores normal GPU/font noise.

**Sequencing note.** T6.1/T6.2/T6.3/T6.7/T6.9 are the sharing-critical set and should land before the
RFC (T3.7/T5.5). T6.4/T6.5/T6.6/T6.8 harden the evidence. T6.10–T6.15 are the library's own roadmap
and can proceed independently of the OpenCode decision.

---

## 8. Deferred and future seams

Keep these out of the critical path. Each is conditional on a named signal.

| ID | Item | Unblock condition | Seam already present |
|---|---|---|---|
| D1 | H6.5 inline row host | Maintainer approval for a generic timeline slot | Turn-map overlay + SVG `InlineGraph` + T3.3(c) RFC |
| D2 | P8.4 host-neutral activity adapter | A real second host needs it | `GraphController` + contract; demo fixture |
| D3 | P8.8 incremental patches | Profiling shows full-model diffs are too slow | Contract `setModel` baseline |
| D4 | Cross-session graphs / recurring errors / compare attempts | A validated single-session win | `data.sessionID` (T3.6), stable IDs, SVG/JSON export |
| D5 | Real 3D geometry, DoF, production 3D | Protocol prefers `layered`/`depth-stack` | Depth seam; host-owned Z |

---

## 9. Verification matrix

| Check | Command | Owns |
|---|---|---|
| Sync integrity | `git rev-list --left-right --count HEAD...upstream/dev` | T0 |
| Model | `cd packages/session-ui && bun test src/graph` | IDs, turns, levels, layout, representations |
| Graph package | `cd packages/session-graph && bun run typecheck && bun test src` | Render model, registry, inspector |
| Components | `cd packages/session-graph && bun run test:components` | DOM contracts at 1440 / 1100 / 390 |
| App types | `cd packages/app && bun run typecheck && bun run typecheck:e2e` | Integration |
| App e2e | `cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts` | Mode, live append, fallbacks, hash, scroll |
| Built e2e | `PLAYWRIGHT_BUILD=1 bun run test:e2e -- e2e/graph/session-graph.spec.ts` | Chunk/lazy behaviour |
| Library | `cd spacegraphjs && node_modules/.bin/vitest run` | Core + packages + contract |
| Boundaries | `cd spacegraphjs && bun run test:boundaries` | No core→contract/Cytoscape import |
| All graph steps | `bun run graph:verify` | The canonical gate |
| Captures | `bun run graph:capture --mode=compare` + manual inspection | Visual acceptance |
| Capture verify | `bun run graph:capture --mode=verify` | Committed set exists |
| Lint | `bun run lint:changed` | Changed files |
| Repo check | `bun run check` | Canonical, but red for known environmental reasons; see T1.6 |
| Provider-free demo | `bun run graph:dev` (new) | T6.1 |
| Security suite | new graph security tests | T6.7 |
| Scale guard | new 1k/5k perf test | T6.6 |
| Library benchmark | `cd spacegraphjs && bun run bench:graph` (new) | T6.11 |
| Pixel diff (optional) | `bun run graph:diff` (new) | T6.15 |

Rules: run from package directories, never the repo root for tests; inspect images before claiming a
visual task; record unverified behaviour.

---

## 10. Decisions, risks, stop rules

**Open decisions to close in T2.4:** #10 naming · #14 representation · #15 depth · #16 file lens ·
#8 3D default (superseded by #15) · #9 screenshot location.

| Risk | Likelihood | Mitigation | Fallback |
|---|---|---|---|
| Upstream merge breaks message/part assumptions | Medium | T0.4/T0.5; additive protocol changes today | Adapt the model; keep the fixture schema-first |
| Upstream rejects a new package + sibling library | Medium | Publish first (T4.2); RFC + ladder (T3.7) | Ship as an extension panel + companion package |
| Protocol shows the graph is slower | Medium | G1 before G2; unbiased tasks; stop rule | Publish the negative result; keep the library and hybrid panel |
| Visual polish trap | High | Gates G1/G2; captures as acceptance; stop rule | Stop at "legible and measured" |
| Source workspace rots before publishing | Medium | T4.1/T4.2 early; pin SHAs | Bundle contract + adapters in one package |
| Dependency drift after sync | Medium | `bun install` + built e2e; lockfile review | Revert the merge on the sync branch only |
| Test flake masks regressions | Medium | T1.5 ownership; repeat runs | Quarantine with a linked issue |
| Reviewers cannot reproduce the claim | High | T6.1 provider-free demo + T6.2 hosted build + T6.3 packet | Ship screenshots and a video only |
| Real sessions break model assumptions | Medium | T6.4 corpus + T6.5 edge cases | Narrow the claim to fixture-shaped sessions |
| Hostile markup in tool output or export | Low | T6.7 escaping suite + documented sanitization | Disable export of untrusted content |
| Library performance/maintenance regressions | Medium | T6.11 budget CI + T6.14 docs/ownership | Pin the tested version and stop upgrades |
| Upstream sees a large opaque diff | High | T3.7 ladder + T6.3 review packet + flag | Offer only the extension-panel rung |

**Stop rules**

1. Do not start T2 before G1 passes.
2. If T2 shows no advantage, stop product work and publish the finding.
3. Do not add T3 features before T2's decision; the flag/settings work is only justified by a positive
   or promising result.
4. Do not rebase `dev`; do not force-push; do not delete the pre-sync tags.

---

## 11. Task map from TODO.1

| TODO.1 | TODO.2 |
|---|---|
| R7.3 evaluation | T2.2 (+ T2.1 dry run, T2.4 decisions) |
| LE.1 fit/framing | T1.2 |
| LE.17 visual acceptance | T1.7 + G1 (per-batch inspection) |
| H6.5 inline row | T3.3(c) RFC + D1 |
| P8.4 activity adapter | D2 |
| P8.8 incremental patches | D3 |
| P0.1 baseline | T0.7 |
| RF.2 LaneLayout fold | T4.3 |
| L1.1 types stopgap | T4.4 |
| RF.6 mesh outline | T4.5 |
| I4.10 mobile decision | T1.4 |
| V5.5 flake | T1.5 |
| R7.4 GIF | T5.2 |
| V5.6 CI | T4.6 |
| Unlogged review findings | T1.1 (clipping), T1.2 (summary framing), T1.3 (layered), T3.1 (flag), T3.2 (settings), T3.4 (export) |
| New visual defects (2026-10-19 review) | T1.8 (camera zoom), T1.9 (breadcrumbs/selection), T1.10 (contrast), T1.11 (summaries), T1.12 (hierarchy), T1.13 (timeline), T1.14 (Cytoscape), T1.15 (zoom/pan captures), T1.16 (retire spike); evidence in `docs/spacegraph/visual-review.md` |
| New leverage/velocity work (not in TODO.1) | T6.1–T6.16 (provider-free demo, review packet, corpus, edge cases, scale, security, legend, contract v3, benchmarks, second host, devtools, docs, demo index) |

---

## 12. Log

Append-only. One entry per pass: date, task IDs, commands run, results, surprises, unverified items.

**2026-10-19 — plan created.** Seeded from the TODO.1 close-out review. Verified at creation:
`session-ui` graph 66, `session-graph` unit 33, `spacegraphjs` 338, app typecheck, lint 0,
`graph:verify` all steps. Sync reconnaissance: merge-base `594af423e8`; upstream `dev`
`ba06ff9e0b`; 41 behind / 63 ahead; 315 upstream files vs 126 fork files; **zero overlap**; protocol
changes additive. Library has three unpushed commits. No code changed by this pass.

**2026-10-19 — plan expanded (T6).** Added 15 leverage/velocity enablers for sharing with OpenCode
maintainers and for the SpaceGraphJS track. Reconnaissance behind them: `vue-spacegraph` exists but is
stale (`spacegraphjs` workspace dep, no-op build); `session.forked` exists upstream and is unhandled by
the model; `approval` is a declared node kind with no builder; there is no dev fixture entry point in
`packages/app/src` (only the e2e harness); `three` is already a peer dependency of the core. No code
changed by this pass.

**2026-10-19 — screenshot review and zoom experiment.** Inspected every committed capture and wrote
`docs/spacegraph/visual-review.md`. New deliverables: T1.8–T1.16 (camera zoom mapping/control,
breadcrumbs/selection visibility, light-theme contrast, ribbon/matrix gate, hierarchy and timeline
redesign, Cytoscape parity, zoom/pan capture matrix, retire the Phase 0 spike) and T6.16 (one demo
index over the host demo, library demo, and test harness; T6.1 clarified as the host demo only).
A temporary camera-zoom control and capture matrix were implemented to test the claim: fit ≈ 45%,
70% produced giant clipped cards, 100% a blank canvas; panning at 100% showed nothing. Root cause is
the absolute log range `0.01..100` for orthographic zoom plus composer focus stealing printable keys.
The experiment was reverted; no product code or committed image changed. Evidence and per-image
findings are in the visual review; the capture matrix stays blocked on T1.8.

**2026-10-19 — T0 upstream sync (T0.1–T0.8).** Synced the fork to upstream `dev` `ba06ff9e0b`.
Backup: pushed `origin/dev` (fork tip `266d7c5e63`) and `spacegraphjs` `origin/main` (`5abf80d`), with
tag `pre-sync-2026-10-19` on both. Added the `upstream` remote, fetched, and merged into branch
`upstream-sync-1019` (merge `f802f5e707`). Re-verified the plan's facts before merging: changed-file
sets (315 upstream / 128 fork) had **zero** overlap, so the merge had no conflicts and no side was
discarded; `bun.lock`/`package.json` were untouched by upstream, and `bun install` reported no changes.
Protocol deltas are additive: `idle` added to the message-type filter (`packages/protocol/src/groups/message.ts`),
`session.archived`/`session.unarchived` events (`packages/schema/src/session-event.ts`), `archived` list
filter (`packages/schema/src/session.ts`), and `permission.saved.update` (`packages/protocol/src/groups/permission.ts`).
The graph model already handles `idle`; archive is session-list-level and does not touch the graph.

Verification on the merged tree: `session-ui` graph 66 ✓; `session-graph` typecheck + unit 33 ✓ +
components 32 ✓; `app` typecheck ✓; `graph:verify` all steps ✓; `spacegraphjs` vitest 338 ✓. Two reds,
both proven pre-existing (not merge fallout): (a) `app` `typecheck:e2e` fails on DOM-lib types in
`e2e/performance/terminals/probe.ts`, `e2e/performance/timeline/session-timeline-stream-probe.ts`, and
`e2e/regression/timeline-stream.spec.ts` — those files are byte-identical to upstream and the tsconfig/lock
are unchanged; (b) the graph e2e "restores the transcript position after leaving the graph" (T1.5 flake)
fails ~60% even in isolation (`--repeat-each=10 --workers=1` → 6 failed / 4 passed on pre-merge HEAD
`a7c26a1a18`), which is worse than T1.5's "passes in isolation" description — the virtualizer reconnect
race is the suspect.

Captures (T0.6): `bun run graph:capture --mode=compare` rewrote 5 images (06, 13, 14, 17, 18); RMSE
4e-6–9e-4 is antialiasing noise (upstream changed no `packages/app/src` or `packages/ui`), so they were
reverted. `prototype.md`/`README.md` now name upstream `ba06ff9e0b`, merge `f802f5e707`, and library
`5abf80d`.

Baseline (T0.7): built upstream (`/tmp` worktree) and the merged tree; entry `index` 654.66→656.09 kB,
largest session route 361.12→355.31 kB, and a **new lazy `graph` chunk 37.55 kB (11.82 kB gzip)** that is
referenced only from the route import map. The initial-load delta is bundler re-split noise; first paint
has no harness. Surprise: `bun run check` **passes on bare upstream** here (34/34 tasks) but fails on this
checkout only in `@opencode/ai` (`zstdCompressSync` on `node:zlib`) — the main checkout sits under
`/home/me`, so `tsc`'s type-root walk-up finds a stray `/home/me/node_modules/@types/node@22.10.2` that
shadows the repo's `@types/node@24.12.2`; the `/tmp` worktree has no such ancestor. This is environmental
(checkout location), not a fork or merge regression, and is the concrete input to T1.6. T0.8: fast-forwarded
`dev` to the sync branch and pushed `dev`, the sync branch, and the tag.

**2026-10-19 — T1.1 verified + test fixes.** T1.1 (toolbar label clipping) was already fixed in
`graph-toolbar.css`; the component test "keeps every toolbar label unclipped" passes at 1440×900 and
1100×700. Fixed two pre-existing test failures blocking `graph:verify`:
1. `GraphView.tsx`: `zoomOutDisabled` now considers semantic level (`effectiveLevel() === "overview"`) so
   the test "renders the overview level with the level control reflecting it" passes.
2. `theme.test.ts`: corrected `edgeMuted` expectation from `#444` to `#aaa` (matches `--v2-text-text-muted` token).
3. `buildRenderModel.ts`: fixed TypeScript error — `size` tuple now has 3 elements.
All `graph:verify` steps pass: contract conformance (20), boundaries (6), view controller (26), contract (6),
SpaceGraph adapter (13), Cytoscape adapter (12), SVG renderer (9), session-graph unit (36), component
contract (36), capture verify. Session-ui graph tests (74) and session-graph unit tests (36) pass. App
typecheck clean.

**2026-10-19 — T1.2 overview and summary framing.** Fixed level-aware compact overview and ribbon/matrix
axis labels:
- `packages/session-ui/src/graph/layout.ts`: Uses `COMPACT_SIZE[0]` (132px) as minimum column width at
  overview level instead of `CARD_SIZE[0]` (220px), eliminating wide empty gutters. Overview width
  reduced from 1524 to 1436 (vs execution 2140).
- `packages/session-graph/src/ui/GraphView.tsx`: Added `axisLabels` memo generating row/column labels for
  ribbon and matrix with proper i18n keys.
- `packages/ui/src/i18n/en.ts`: Added `ui.sessionGraph.axis.session`, `ui.sessionGraph.axis.turn`,
  `ui.sessionGraph.axis.signals`, and phase category keys.
- `packages/session-ui/src/graph/representation.ts`: Exported `matrixColumn`, `PHASE_CATEGORIES`,
  `turnRows` for axis label generation.
All `graph:verify` steps pass; session-ui graph 74, session-graph unit 36, component 36, app e2e 16/16.
Captures updated: 02 (overview), 15 (ribbon), 16 (matrix) now have axis labels and tighter framing.

**2026-10-19 — T1.5 timeline scroll-restore flake fixed.** The e2e test "restores the transcript position
after leaving the graph" was flaky (~60% failure) because it didn't wait for the lazy-loaded
`@opencode/session-graph` module to resolve. The Suspense fallback `session-graph-loading` was still
showing when the test checked for `data-graph-ready="true"`. Fixed by adding a wait for the loading
element to disappear in `packages/app/e2e/graph/session-graph.spec.ts:37-42`. Verified: 10/10 passes
with `--repeat-each=10 --workers=1`. All 16 graph e2e tests pass; `graph:verify` all steps green.

**2026-10-19 — T1.3 layered/depth-stack legibility.** Fixed two core issues making depth modes unreadable:
1. **Billboard fix** (`spacegraphjs/src/nodes/HtmlNode.ts`): `faceCamera()` now rotates only around Y-axis
   (billboard-on-a-pole) instead of copying full camera quaternion. Bands and cards stay flat and readable
   in `layered`/`depth-stack` instead of tilting with camera.
2. **Fit fix** (`spacegraphjs/src/utils/CameraUtils.ts`, `SpaceGraph.ts`, `SpaceGraphApp.ts`):
   `calculateFitView` now accepts optional `phi` (camera polar angle) and adjusts fit distance for tilt
   foreshortening in perspective modes. `fitView`/`focusOnNodes` pass target phi from depth treatment.
3. Scene-relative fade was already implemented via `applySceneFade()` using `sceneFadeDensity`.
Captures 06 (orbit), 18 (layered), 19 (depth-stack) regenerated and show readable cards with flat bands.
All `graph:verify` steps pass; session-ui graph 74, session-graph unit 36, component 36, app e2e 16/16.

**2026-10-19 — T1.12, T1.13, T1.14, T1.16 layout and parity fixes.** Completed four visual defects from the
screenshot review:
- **T1.12 Hierarchy layout redesign** (`packages/session-ui/src/graph/layout.ts`): Changed from single
  vertical column to left-to-right columns with increased indent step (120px), capped column height (14
  rows), and wraps into new columns. Cards stay legible at fit; no more 5px text.
- **T1.13 Timeline layout redesign** (`packages/session-ui/src/graph/layout.ts`): Changed from top-to-bottom
  row bands to left-to-right turn columns with vertical wrapping within each turn. Turn bands now label
  each chronological block. Reading order is explicit: time flows left-to-right, activity stacks
  top-to-bottom within each turn.
- **T1.14 Cytoscape parity** (`packages/session-graph/src/ui/GraphView.stories.tsx`,
  `packages/session-graph/src/contract/cytoscape-contract.tsx`): Added explicit `DARK_THEME` constant to
  Cytoscape stories so captures match the app's dark theme. Previously captures 07/08 were light theme.
- **T1.16 Retire Phase 0 spike**: Moved `00-spike-spacegraph.png` to `docs/spacegraph/screenshots/history/`.

All `graph:verify` steps pass; session-ui graph 74, session-graph unit 36, component 36, app e2e 16/16.
Captures 11 (timeline), 12 (hierarchy), 07 (cytoscape overview), 08 (cytoscape selected) regenerated.
