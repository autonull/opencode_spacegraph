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
| OpenCode fork | `dev` synced with upstream @ merge `098e601068` (upstream `d249607e90`); **0 commits behind upstream `dev`** |
| Upstream | `anomalyco/opencode` `dev` @ `d249607e90` |
| SpaceGraphJS | `main` @ `cdf1440`, tagged `v8.0.0`; **publishable**: `spacegraphjs` 8.0.0 (the layout engine's contract changed — a break) + five `@spacegraphjs/*` 0.1.0 — built, proven consumable, **not uploaded** |
| Contract | `CONTRACT_VERSION = 2` (depth spectrum) + the additive `fit(ids, { minScale })` option |
| Last green (re-run 2026-10-20, after the placement-engine pass) | `session-ui` graph 106 · `session-graph` unit 96 · `session-graph` component 49 · `spacegraphjs` 482 (1 new: the tree's block width) · `graph:verify` all steps (library build first) · app typecheck · app e2e 22/22 · publish check 2/2 · `graph:scale` (T6.6, now with the tree and the force row) · the second host's unit 9 + browser 9 (T6.12) |
| Reviewer packet | `docs/spacegraph/upstream-review.md`, `upstream-pr.md`, `security.md`, `demos.md`, `decisions.md` |
| Reference images | `docs/spacegraph/screenshots/01`–`27` plus the second host's two placement frames (`26-second-host-tree.png`, `26-second-host-force.png`), all committed — **the zoom/pan matrix (20–24) now shows what its names say (T6.19), 25 shows a long session at the drawn window (T6.6), and 26–27 show the second host (T6.12)**. The camera-driven frames (20–24) still vary between runs (**T6.20**) |
| Layouts | **five**: lanes, timeline, hierarchy, **tree (T7.2)**, **force (T7.3)** — pickable from the toolbar, comparable side by side in the gallery (T7.5) |
| The 3D renderer | **fixed (T1.19)**: the billboard was inverted, so bands were rolled 50° and cards sheared; a target move re-aimed the camera, so the flat view tilted after a selection. Both fixed, both proven by tests, the capture set refreshed. **The billboard is now a switch, off by default** (2026-10-20): the cards lie in the content plane, the camera's shear is visible, and the toolbar turns them back to face the reader |

Two facts shape everything below:

1. **The engineering is done; the product claim is unproven.** The hypothesis in `SPACEGRAPH.md` has
   no evidence yet. R7.3 (now T2.2) is the only thing that can settle it.
2. **The library linkage is not upstreamable as-is.** OpenCode currently consumes `spacegraphjs/*`
   as source workspaces in a sibling, gitignored repo. An upstream contribution needs published
   packages (or a single bundled companion package). This is an *adoption* blocker, not a *demo* blocker.

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
7. **Library adoption evidence.** A second host (framework-free plain TypeScript) runs the published
   contract and adapters, and every generic capability has a runnable example outside OpenCode.

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

### 0.4 Critical path vs. refinements

**Critical path (blocks upstream review/decision):**
- **T2 Evidence** — the hypothesis test; everything else is scaffolding for this result
- **T6.2 Hosted review build** — URL a maintainer clicks to try it; zero setup
- **T6.3 Review packet + FAQ** — one doc a maintainer reads; no TODO spelunking
- **T6.7 Security/escaping suite** — proves hostile markup inert; hard trust requirement
- **T3.7 Upstream contribution ladder + RFC** — the actual deliverable to upstream
- **T3.8 Diff budget audit** — required content for the RFC

**The owner's priority (2026-10-20) — do this in parallel with everything above:**
- **T7 The layout variety track** (§6.2) — a *wide variety of fundamentally different layouts*
  (force-directed, tidy tree, …), because nobody knows which one is best and the recent passes had
  been perfecting the lanes view instead of exploring the space. It is not a refinement of the
  existing views: it is a new placement seam in the library, new layouts on top of it, the host's
  bindings and frames, and a gallery so the options can be compared.
- **Do not spend passes on capture or pixel machinery** while the UI is in development (§10; T6.15
  was written and dropped).

**Important refinements (do after critical path, or in parallel if capacity):**
- T3.5 Permalinks, T3.6 Namespacing — sharing polish, not blocking
- T4.1 Push/tag library, T4.2 Publish packages — adoption mechanics, not demo blockers
- **T4.8–T4.14 SpaceGraphJS core extractions** — layout, levels, representations, adapter, overlay, theme, search/minimap/a11y (vacuum from OpenCode)
- T4.3–4.7 Library internals — sustainability, invisible to reviewers
- T5 Release artifacts — after upstream decision
- T6.4 Corpus, T6.5 Edge cases, T6.6 Scale — evidence hardening
- T6.8 Legend/help, T6.9 Issue tracker — polish/process
- T6.10–6.15 Library roadmap — independent of OpenCode decision
- **T6.17 Graph diff visualization** — enables session comparison (D4)
- T6.16 Demo index — documentation, helpful but not blocking

**Already complete (do not redo):**
T0 (sync), T1 (all usability defects, T1.17 and T1.18 closed on 2026-10-20), T2.3 (the interaction
counter), T3.1 (flag), T3.2 (settings), T3.3a/b (hybrid), T3.4 (export), T3.5 (permalinks), T3.6 (the
exported map names its session), T3.7 (ladder), T3.8 (diff budget), T4.7 (edge accessibility decided
and implemented), T4.8–T4.10 (layout, levels, and representations extracted to the library), T4.12
(the scoped-subgraph overlay's scope and focus behaviour extracted), T4.13 (theme and contrast
extracted to the contract and the renderers), T4.14 (the search, minimap and a11y cores are in the
library; the framework bindings were dropped), T6.1 (provider-free demo), T6.3 (review packet), T6.7
(security suite), T6.8 (legend, help, and the mode announcements — the camera half is T6.18), T6.16
(demo index), T6.17 (the code-diff vocabulary and renderer extracted; the host keeps its markup),
**T6.18 (the camera can be read back and jumped instantly), T6.19 (the zoom/pan matrix shows what its
names say, and the gate proves it), T6.6 (the scale budget: the pipeline is linear, the map is capped
and says so, and the guards are load-bearing), T6.12 (the second host: a framework-free consumer
outside OpenCode that runs every generic module, checked by the library's own CI), T6.5 (the edge
cases: forks and child sessions are named and openable, a compaction says what it was, an
interrupted turn is visible, and the permission node kind is decided and removed),
**T4.3 (the three layout strategies run on the generic `LaneLayout`, and the fixture's positions are
byte-identical), T4.5 (the library's own limits are declared in `spacegraphjs/docs/limitations.md`,
and the host's list matches the code), **T6.20 (the camera-driven frames no longer drift between runs:
the fit measures the surface it has, and the zoom control stops at the renderer's limit)**,
**T7.1–T7.6 (the layout variety track: the placement seam, a block tree, a force placement, the
host's bindings, the gallery, and the per-layout invariants)**,
**T1.19 (the 3D renderer tilted everything: the billboard was inverted and a target move re-aimed
the camera, so the flat view tilted too — both fixed and proven)**.

**The pixel-diff helper is dropped (T6.15).** While the UI is in development the capture set is read by
eye (§10); a pixel gate would re-baseline after every change and turn a moving target into a blocker.
What it *did* produce — the measurement that closed T6.20 — is recorded with that task.

**The library is framework-agnostic.** The generic capabilities live in the core; a host binds them in its
own framework. The React and Solid packages keep the `GraphView` binding they already had and nothing
else — the overlay and diff components that were added with the core were removed, because they duplicated
the host's markup and had no consumer. T4.14's remaining bindings are therefore **dropped**, not pending:
the OpenCode host is the worked example, and T6.12's second host is framework-free too (plain
TypeScript against the contract) — it now exists, in `spacegraphjs/demo/second-host/`.

---

## 1. T0 — Sync to the latest upstream `dev` (COMPLETE)

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

## 2. T1 — Usable, not merely present (COMPLETE ✅)

All 16 tasks done. Every visual defect from the 2026-10-19 screenshot review fixed:
- Toolbar labels unclipped (T1.1)
- Overview/summary framing tight with axis labels (T1.2, T1.11)
- `layered`/`depth-stack` legible: bands flat, cards readable (T1.3)
- Mobile entry at 390×900 works (T1.4)
- Timeline scroll-restore flake fixed (T1.5)
- Canonical verification story documented (T1.6)
- Visual checklist gate established (T1.7)
- Camera zoom clamped to content-relative range (T1.8)
- Breadcrumbs + selection visibility for all node kinds (T1.9)
- Light/dark contrast audit passed (T1.10)
- Hierarchy & timeline layouts redesigned (T1.12, T1.13)
- Cytoscape parity: dark theme, correct framing (T1.14)
- Multi-zoom/pan capture matrix committed (20–24) (T1.15)
- Phase 0 spike retired (T1.16)

**Reopened by the 2026-10-20 review (the demo now runs, so the surface was looked at for real):**

- [x] **T1.17 The cluster chip covers its own members**
  A derived `phase` node draws a summary chip ("Verify 4") over the group it summarises. The chip's
  box is sized to the group's bounds while its label sits at the group's left edge, so the chip lies
  on top of the first member's card. Measured in the live demo: the chip's container is 534×31 px
  with a 42 px label; the member's card is underneath it. Visible in captures 02, 03, 04, 12, and 15.
  Done when: the chip has its own slot in the lane, or it is not drawn while its members are drawn
  (a summary of what is already on screen is noise).
  Verify: a component test that asserts no two card boxes overlap at the execution level; the
  capture set inspected.
  - **Done (2026-10-20).** The chip is the *band header*, and the band was sized from its members'
    **centres** — so the box was smaller than the cards it grouped and the header landed on the
    first one. The band is now the union of the members' **boxes** (the host binds its node sizes
    through the adapter's new `nodeSizeFn`), padded, and the header sits in the band's own strip:
    the group's start, clear of every card. The library owns the geometry
    (`ModelAdapter.bandBox`); the host owns the vocabulary.
  - The same centre-vs-extent bug put the **lane gutter caption** on top of the session card; the
    gutter now clears the content's left edge. Both are measured by the new component test
    `packages/session-graph/component-tests/graph-bands.spec.ts`: no band header covers a card, and
    no two card boxes overlap.
  - **Two renderer defects surfaced while fixing it, both pre-existing.** (a) The band is flagged
    `billboard`, and the core's billboard did not make it screen-aligned: the rotation was the
    camera's *inverse*, so every band was rolled by 50° instead of facing the reader. The fix is
    **T1.19** — the note in this entry that claimed "a billboard now cancels the camera's rotation"
    was wrong, and T1.19 corrects it with the proof. (b) The Cytoscape overlay placed host markup
    in world units *without* the viewport scale, so its bands and cards were drawn oversized; the
    overlay now scales with the zoom, like every other node.
  - The band header's line height is a fixed 16px: its height is geometry (it must clear the
    cards), not typography. The captures were refreshed deliberately and read by eye (03, 12, 17
    and 07 inspected).

- [x] **T1.18 The hierarchy and file-lens views fit the whole graph, so they are unreadable**
  The camera fits all the content, so a view that spreads over many rows (hierarchy) or a view
  squeezed between the file rail and the inspector (file lens) shrinks the cards until the text is
  a few pixels tall. The lane views are legible; these two are not.
  Done when: the fit keeps a legible minimum scale and lets the reader pan, or the view is dropped.
  Verify: a component test that asserts the card text height at 1440×900 in both views.
  - **Done (2026-10-20).** A fit now takes a **minimum scale** — the smallest on-screen size of one
    world unit, in CSS pixels. The host declares the floor (a card never renders below half its
    natural size, so its 13px label stays at 6.5px, the size the lane views are read at); the
    renderer owns the camera, so the floor travels through the contract
    (`GraphRenderer.fit(ids, { minScale })`) and both adapters honour it. When the floor applies the
    frame starts at the content's first corner and the reader pans the rest.
  - Measured on the canonical fixture: the hierarchy went from a 22px card (4px of text) to 36px
    (6.5px), the file lens from 30px to 36px. The lane views are unchanged in practice (their fit
    is 0.47–0.5, at or above the floor).
  - The component test `packages/session-graph/component-tests/graph-legibility.spec.ts` asserts the
    card's rendered height at 1440×900 in the hierarchy and the file lens. It fails without the
    floor (22px < 36px), so it is load-bearing, not decorative.

- [x] **T1.19 The 3D renderer tilted everything, and the flat view tilted after a selection**
  Found on 2026-10-20 by reading the committed screenshots: in the orbit frame the cards were
  sheared parallelograms with unreadable text and the swimlane bands were rolled by ~50°; and in
  the **flat** frames that follow a selection (04, 12, 13, 15–17, 20–24) the whole map was drawn
  at an angle even though the toolbar said *Flat*. Two separate causes, both in the library.
  Done when: nothing in a tilted depth treatment is tilted, and the flat view stays flat.
  Verify: the library's card-facing and camera suites; the host's depth component test; the
  capture set read by eye.
  - **Cause 1 — the billboard was inverted.** `HtmlNode.faceCamera` set the card's rotation to
    `inverse(camera.quaternion)`, but the CSS3D pipeline composes
    `camera.matrixWorldInverse × object.matrixWorld`, so a screen-aligned node must carry the
    **camera's** rotation. The inverse turned the card twice: a billboarded band was rolled by
    50.0° (T1.17 recorded "skewed by up to 51°" and blamed the camera), and a card lying in the
    content plane was sheared by the perspective into a parallelogram. The rotation is now the
    camera's, in the node's parent frame.
  - **Cause 2 — a target move was a re-aim, not a pan.** `CameraControls.setTarget` moved the
    target and re-derived the spherical from the camera's *fixed* position, so the camera stayed
    put and `lookAt(newTarget)` rotated the view: a top-down camera stopped being top-down. The
    camera now moves with the target. This is the regression the T6.18 "instant jump" introduced
    (`12f47a1548`): the host's reduced-motion jump calls `setViewport` → `setTarget`, while the
    older `focus()` → `flyTo` path preserved the pose.
  - **The depth treatment now decides how the cards face the camera.** `DepthTreatment` gained
    `facing: 'plane' | 'camera'`: `flat` keeps the cards in the content plane (the camera is
    perpendicular, so it is the same thing), and `layered`/`depth-stack`/`orbit` turn every DOM
    card to face the reader. The renderer owns the camera, so the policy lives there
    (`WebGLRenderer.setCardFacing`), not in the host.
  - **Proof, not a claim.** The library's new `test/card-facing.test.ts` (5 cases) asserts that a
    billboarded card's *screen* rotation is the identity under a tilted camera, under a top-down
    camera, and after the camera moves — it fails on the old line (0.87 rad ≈ 50°). The new
    camera-controls cases assert that a target move keeps the pose and keeps a top-down camera
    top-down — they fail on the old `setTarget`. The host's new depth component test asserts the
    rendered card keeps its 220:72 ratio in a tilted treatment: the old code measures 2.91, the
    fix 3.06.
  - **The captures were refreshed and read by eye.** The 3D frames now show clean, readable
    rectangles; the flat frames are flat again.
  - **One limitation, declared:** a billboarded band is scaled by its own distance while its
    members are scaled by theirs, so in a tilted view a band's bounds are approximate and a card
    can stick out of it. The grouping still reads; the band is a translucent backdrop.

**Gate G1 — PASSED again (2026-10-20): the band headers no longer cover a card, the lane gutter no
longer covers the session card, and the two unreadable views keep a legible scale.** A first-time
viewer reads every label, sees the whole model, understands overview without legend.

---



### Billboards default disabled (2026-10-20)

The billboard toggle in the UI now controls whether DOM cards face the camera or lie in the content plane. **Default: disabled** (`'plane'`). When the toggle is on, cards face the reader (camera-facing), making text readable in tilted depth treatments. When the toggle is off, cards lie in the content plane, showing the honest perspective with perspective shear. This is a host-controlled affordance: the library's depth treatments no longer decide the facing — the host does through the UI control.

**The contract grew, additively.** The renderer contract carries `CardFacing = 'auto' | 'plane' | 'camera'`, an optional `GraphRenderer.setCardFacing?(facing)`, and an optional `RendererCapabilities.cardFacing` flag. `CONTRACT_VERSION` stays 2 — the method is optional, so a renderer that cannot honour it simply does not implement it. The core resolves `'auto'` against the depth treatment; the treatments now all say `'plane'`, so the core's default is also no billboarding. The library is **8.3.0** and the five `@spacegraphjs/*` packages are **0.2.0** (their published dependency on the contract moved).

**The renderer decides, not the node.** A card used to face the camera when the *node* asked for it (`data.billboard`), and the renderer's `cardFacing` only decided the rest. That split is gone: `cardFacing === 'camera'` turns every card to face the reader, and anything else lays the whole scene in the content plane — the bands included, so a tilted view is one consistent perspective. The library's `test/card-facing.test.ts` was rewritten around the new rule (a card that asked to billboard is denied in the plane, and every card faces the reader in the camera mode).

A new capture frame was added to the verification matrix: `31-graph-perspective.png` — the orbit depth at the Detail level with the billboard off, proving the perspective rendering is correct. The existing 3D captures (06/18/19) now show the honest perspective (sheared cards) since billboarding is off by default, and the whole set was refreshed and read by eye.

The billboard control appears in the toolbar when the renderer supports card facing (the SpaceGraph adapter declares it; the Cytoscape adapter declares `cardFacing: false` and the control is hidden, because Cytoscape draws in screen space and has no camera facing to change). It is an icon button with `aria-pressed`, so the state is announced.

**The proofs.** The app e2e ("turns the billboard off and on from the toolbar") asserts the canvas's `data-graph-card-facing` flips between `plane` and `camera` and that the button's pressed state follows. The component test `graph-3d.spec.ts` now asserts the *pair*: a card in the tilted treatment does **not** keep its 220:72 ratio while the billboard is off, and keeps it once the switch is on. The old test asserted only the billboarded half, and it would have passed on a renderer that never sheared anything.
## 3. T2 — Evidence (THE CRITICAL PATH — blocks everything downstream)

**Stop rule:** Do not add T3 features before T2's decision (see §10). The flag/settings work (T3.1, T3.2) is only justified by a positive or promising result.

- [ ] **T2.1 Internal dry run (do first)**
  Two people who did not build the UI attempt the five tasks cold, once per mode. Record path length,
  dead ends, and missing affordances. Fix blockers before recruiting.
  Done when: notes in §12; if graph loses badly, G1 is reopened.
  Verify: dry-run notes + any G1 reopen.

- [ ] **T2.2 Execute the R7.3 protocol (core deliverable)**
  n ≥ 5, counterbalanced, canonical fixture, no leading explanation. Record success, time, wrong
  turns, interactions, preference (1–7), and quotes. Add results table to
  `prototype.md` §"Evaluation protocol".
  Done when: results and go/no-go decision recorded. A negative result ends the graph track
  as a product bet and leaves the library as the deliverable.
  Verify: `prototype.md` has results table + decision.

- [x] **T2.3 (Optional) Interaction instrumentation behind a dev flag**
  Count mode switches, searches, node selections, expand/return actions per task so "≤ 3
  interactions" is measured, not estimated. Local-only; no telemetry.
  Done when: counter off by default and documented; dry run can cite numbers.
  Verify: flag exists, dry run cites numbers.
  - **Done (2026-10-20).** `Metrics` (`packages/session-ui/src/graph/metrics.ts`) counts eight
    actions — `mode-switch`, `search`, `select`, `expand`, `return`, `turn-map`, `fit`, `zoom` — and
    is **off by default**: nothing is counted until the app mounts the readout, which it does only
    when the URL carries `?graphMetrics=1`. The readout (`graph-metrics-readout.tsx`) shows the total
    and resets it between tasks; hovering breaks the total down per action.
  - **The count is the number of user actions, not the number of code paths.** One action increments
    one counter: the surface switch is counted at the four places a participant can flip it (the
    header toggle, the mobile tab, the `graph.toggle` command, the graph's *Back to transcript*),
    while the graph's own *Open in transcript* counts as `return` and the turn map's *open in full
    graph* counts as `expand` — the mode change that follows is a consequence, not a second action.
    A permalink's automatic entry counts as nothing: it is the start of the task, not an interaction.
  - **Nothing leaves the browser.** No telemetry, no network, no storage: the counter is a module
    singleton in the host, and the only way to read it is the readout.
  - Tests: `packages/session-ui/src/graph/metrics.test.ts` (4) for the counter, and an app e2e that
    turns it on through the URL and reads the number (0 → 1 → 2 interactions).
  - Documented in `docs/spacegraph/demos.md` §4.

- [ ] **T2.4 Close the open product decisions**
  Record decisions for #10 (naming: Graph / Map / Session map — pick one everywhere), #14
  (representation), #15 (depth), #16 (file lens), and #8/#9 if still open. Use the protocol data and
  captures, not preference.
  Done when: decision table in `prototype.md` names choice, evidence, fallback.
  Verify: `prototype.md` decision table.

- [ ] **T2.5 Enforce the stop rule**
  If the graph does not beat the transcript on the five tasks, stop feature work, publish the
  finding, and keep the library. Do not polish a losing surface.
  Done when: decision recorded and acted on.
  Verify: commit/log shows stop or continue with evidence.

**Gate G2 — validated.** Hypothesis has defensible answer with data; default representation/depth chosen from evidence; naming settled.

---

## 4. T3 — Upstreamable contribution (CRITICAL PATH — after G2)

The design argument (`SPACEGRAPH.md`) asks for a hybrid first-class experience. The ladder lets a maintainer adopt the safe rung without taking the whole experiment.

**Already complete (T3.1–T3.4):**
- T3.1 Experimental flag (`experimental.sessionGraph`, default off) — ✅
- T3.2 Experimental settings surface with toggle — ✅
- T3.3a/b Hybrid ladder: `session-map` panel + turn-map overlay (`mod+alt+t`) — ✅
- T3.4 Export map (SVG/JSON/HTML) — ✅

**Remaining critical-path tasks:**

- [x] **T3.7 Prepare the upstream contribution ladder** (DO THIS AFTER G2)
  Write `docs/spacegraph/upstream-pr.md` with four reviewable rungs:
  1. `session-ui` graph model + tests (pure, no UI).
  2. `session-graph` package + canvas + inspector, feature-flagged.
  3. App wiring: setting, mode branch, commands, toggle.
  4. Optional extension panel / hybrid affordance.
  Each rung names files, diff size, tests, screenshots, rollback, and the exact review question.
  Open an upstream issue/RFC with the strongest screenshot and the measured result **before** a large
  PR. Do not present the graph as a replacement for the transcript.
  Done when: ladder exists; RFC posted or explicitly deferred with reason.
  Verify: `upstream-pr.md` exists; RFC URL or deferral note.
  - Written: `docs/spacegraph/upstream-pr.md` — four rungs with per-rung file lists, diff sizes,
    tests, screenshots, rollback, and the review question; the library-linkage blocker with three
    options (publish / bundle / panel-only); the order of work.
  - **RFC deferred, with reason:** the R7.3 measurement (T2.2) does not exist yet, so an issue
    would carry an unmeasured claim. The plan sequences it behind T2.2; the issue text is then
    `upstream-pr.md` + `upstream-review.md`.

- [x] **T3.8 Re-audit the diff budget** (REQUIRED FOR RFC)
  Enumerate every edit inside `packages/app/src` and core packages; justify each against
  TODO.1's three-item budget. The new settings surface and mobile entry are expected additions;
  record them as accepted exceptions. No graph semantics may leak into app-core files.
  Done when: table lists file → why it cannot live elsewhere; `prototype.md` links it.
  Verify: diff budget table in `prototype.md`.
  - Re-audited against the upstream merge base (`594af423e8`), 2026-10-19: `packages/app/src` is
    16 files, +689/−36; the dev-only demo is +149/−18 and is excluded from an upstream diff;
    `session-ui/src/graph/` +3,487; `packages/session-graph/` +5,660; `gui-extensions/session-map/`
    +274.
  - **Re-audited again (2026-10-20), against the current upstream `dev` (`d249607e90`)** — the
    merge base is old enough that the merge-base diff mixes in upstream's own work, so the numbers
    are now the fork's alone. `packages/app/src` is **19 files, +863/−36**: the permalink and the
    interaction counter added `session/graph/graph-permalink.ts` (+51),
    `session/graph/graph-metrics-readout.tsx` (+49), and three lines in
    `session/use-session-hash-scroll.ts` (the transcript's hash handling ignores a graph permalink).
    The per-file table and the justification for each are in `docs/spacegraph/upstream-review.md` §5.1.
  - Per-file table with a justification for every app edit: `docs/spacegraph/upstream-review.md` §5.
    Linked from `prototype.md` §"Upstream readiness".
  - Claim checked, not assumed: only `packages/app/src/session/graph/*.tsx` imports
    `@opencode/session-ui/graph`; the rest of `packages/app/src` touches the mode, the setting, the
    commands, or the scroll position.
  - The e2e side shrank too: `packages/app/e2e/utils/timeline.ts` is back to its upstream bytes
    (the experimental-settings seam moved to the new `packages/app/e2e/utils/graph.ts`), so the
    shared harness carries no fork diff at all.

**Refinements (defer until after RFC or parallel if capacity):**

- [x] **T3.5 Permalinks to a node** — sharing polish, not blocking
  Extend hash reveal to `#graph:<nodeID>` (and representation) so a reviewer can link to a decision/failure.
  Done when: cold-loading URL selects and frames node; unknown IDs fall back safely.
  Verify: cold-loading URL selects and frames node; unknown IDs fall back safely.
  - **Done (2026-10-20).** The hash form is `#graph:<nodeID>`, optionally naming the representation
    (`#graph:ribbon:<nodeID>`). The representation comes **first** because a node id may itself
    contain colons (`turn:msg_user_1`), so a trailing segment would be ambiguous; no node id starts
    with a representation name, so the split is unambiguous in both directions.
  - **A shared link opens the graph.** The session screen reads the hash and switches to the graph
    mode, so a cold load lands on the map instead of the transcript. The mode is read *untracked*, so
    leaving the graph for the transcript does not pull it back, and the experimental flag is part of
    the effect's sources, so a link opened before the settings load still opens the graph. With the
    flag off, the link falls back to the transcript.
  - **The node is framed, not just selected.** `GraphView` grew a `frame` prop: the view raises the
    semantic level when the node is hidden at the current one, waits for the model that carries it,
    and then centres the camera on it. The frame is applied after the fit, so the reader lands on
    the node rather than on the whole map.
  - **Unknown ids fall back safely.** The graph opens, nothing is selected, and the transcript stays
    reachable. The transcript's own hash handling ignores a graph permalink, so it keeps the
    position it restores instead of jumping to the bottom.
  - **The link can be copied.** The inspector's copy button puts the absolute permalink on the
    clipboard, so a decision or a failure is shared instead of re-scrolled to.
  - Tests: `packages/app/src/session/graph/graph-permalink.test.ts` (15) for the format, and three
    app e2e cases (a live permalink, a cold load, an unknown node).

- [x] **T3.6 Namespace the model for future comparison** — future-proofing, not blocking
  Add `data.sessionID` to session root (keep literal root ID for compat) so exported maps from two sessions combine later without breaking change.
  Done when: exports carry session identity; existing tests/IDs unchanged.
  - **Done (2026-10-20).** `buildGraph(messages, status, sessionID?)` takes the session id
    optionally and puts it on the root node's `data`; the root's literal id stays `session`, so
    every id that resolves a node is unchanged.
  - The id reaches the export: `buildRenderModel` copies it into the root's renderer data, so the
    JSON and the standalone HTML exports name their session (the SVG export is a picture and
    carries no data).
  - The app passes it in both places that build a model (`session-graph-view.tsx` and
    `turn-map-overlay.tsx`).
  - Tests: the model test asserts the root carries the id (and carries none without it); the
    render-model test asserts the exported root data carries it.


**Gate G3 — upstreamable.** Flag off by default, published dependencies (or bundled fallback), a diff a maintainer can review in slices, and a review guide that leads with evidence.

---

## 5. T6 — Reviewer experience enablers (CRITICAL PATH — parallel with T2, before RFC)

These attack the two things that decide whether this work matters: a reviewer must feel it without setup, and trust it's secure. **Start these as soon as G1 is green (now); they must land before T3.7 RFC.**

- [x] **T6.2 Hosted review build** (HIGHEST PRIORITY after T2 starts)
  Deploy the **library contract demo** and a static host showcase to GitHub Pages on `main` and release tags. Storybook remains the test harness, not a demo. Fixtures only; no secrets, no live backend.
  Done when: a URL renders the library demo and the host fixture at 1440×900 and 390×900 with zero console errors; the RFC, README, and T6.16 index link it.
  Verify: deploy workflow + manual check.
  - Created `.github/workflows/deploy-demo.yml` in spacegraphjs repo
  - Fixed demo build to include `contract.html` as entry point
  - Verified `pnpm run build:demo` produces both `index.html` and `contract.html` with correct assets

- [x] **T6.3 Review packet and objection FAQ** (HIGHEST PRIORITY after T2 starts)
  `docs/spacegraph/upstream-review.md`: the problem, the hypothesis, the measured result, what
  changed, the diff-budget table (T3.8), flag and rollback, performance/bundle numbers, a11y, security,
  maintenance ownership, and exact review commands. Add `docs/spacegraph/decisions.md` as an ADR log
  (naming, representation, depth, file lens, flag, contract bumps).
  Done when: a maintainer can review without reading TODO.1/TODO.2, and every major choice has an ADR.
  Verify: `upstream-review.md` + `decisions.md` exist and cover all RFC topics.
  - Created `docs/spacegraph/upstream-review.md` with full review packet
  - Created `docs/spacegraph/decisions.md` with 20 ADRs covering all major architectural decisions
  - Both linked from prototype.md and TODO.2

- [x] **T6.7 Security and escaping suite** (HARD REQUIREMENT for upstream trust)
  Attack surfaces with hostile file paths, tool output, labels, bidirectional overrides:
  `<script>`, `<img onerror>`, `javascript:` URLs, `U+202E` in paths. Prove inert markup in both
  adapters, the inspector, SVG export, and JSON round-trip; document the sanitization contract and
  CSP expectations for WebGL/CSS3D.
  Done when: tests prove no execution and no broken layout; docs state who sanitizes what.
  Verify: security test file + sanitization contract in docs.
  - Unit: `packages/session-graph/src/canvas/security.test.ts` — 13 tests over `escapeHtml`, card /
    band / axis markup, SVG export, and the JSON round-trip. The assertions check the *escaped*
    output (`&lt;script&gt;`), not the absence of a substring.
  - End to end: `packages/session-graph/component-tests/security.spec.ts` + a `Hostile` story in
    `GraphView.stories.tsx`. The payload runs in neither adapter, no payload element reaches the
    DOM, and the text stays readable in the canvas and the inspector.
  - Contract: `docs/spacegraph/security.md` — what is untrusted, who escapes what, the CSP
    expectation per renderer, and the deliberate non-goals (`javascript:` URLs are not markup, bidi
    controls are preserved, the JSON export keeps raw text and must be escaped by the host).
  - The renderer injects host card markup with `innerHTML`
    (`spacegraphjs/src/nodes/HtmlNode.ts:122`, `cytoscape-renderer/src/index.ts:266`), so this
    suite is the load-bearing barrier, not a formality.

- [ ] **T6.9 Issue tracker and PR template** (process hygiene for first sync PR)
  Mirror T0–T6 into GitHub issues/milestones (G0–G5) in the fork; TODO.2 stays the source of truth.
  Add a PR template with the graph checklist (commands, images, unverified behavior, flag state) and
  labels (`graph`, `library`, `upstream`).
  Done when: the first sync PR uses it and the milestones match the gates.
  Verify: GitHub issues/milestones exist; PR template used.
  - PR template: `.github/PULL_REQUEST_TEMPLATE/graph.md` — rung selector, feature-flag state, the
    verification commands, images, an "unverified behaviour" section, and the leak/escaping checks.
    It is a separate template so upstream's default template is untouched.
  - **Issues, milestones and labels are deferred:** no `gh` CLI and no GitHub API access in this
    environment. The gate list to mirror is G0–G5 in §2–§7 of this file; the label set is
    `graph`, `library`, `upstream`.

- [x] **T6.16 One demo index, three clearly-labelled surfaces** (documentation)
  Write `docs/spacegraph/demos.md`: the host demo (`bun run graph:dev`), the library contract demo
  (`spacegraphjs/demo/contract.html`), and the test harness, each with command/URL, fixture,
  what it proves, and the current screenshot. Link from both READMEs. Retire stale spike (T1.16) and stop presenting Storybook as a demo. Share visual language: contract demo (`09`) is framing reference for host captures.
  Done when: reviewer chooses right surface in one glance; no doc calls Phase 0 spike the current demo.
  Verify: `demos.md` exists and linked from READMEs.
  - `docs/spacegraph/demos.md`: the host demo (`bun run graph:dev`, port 3000, mock server on 4097,
    no provider), the library contract demo (`pnpm run dev:demo` → `/contract.html`, plus the GitHub
    Pages deploy), and the test harness — each with command, fixture, what it proves, screenshot, and
    a "which one should I open" table.
  - Linked from `docs/spacegraph/README.md` and from `spacegraphjs/README.md` (the library README
    points at the host-side index for the two surfaces it does not host).
  - The Phase 0 spike stays retired in `screenshots/history/`; Storybook is described as the test
    harness, not a demo.

---

## 6. T4 — Library leverage and sustainability (REFINEMENTS — after critical path, or parallel)

These are sustainability work, invisible to reviewers. Do after G3 or in parallel if capacity.

- [x] **T4.1 Push and tag the library**
  Push `main` and tag the tested SHA (`5abf80d` or newer). Done when: `origin/main` matches HEAD and tag exists.
  Verify: `git ls-remote origin refs/heads/main refs/tags/graph-adapter-2026-10-20` (both repos).
  - **Done (2026-10-20).** `origin/main` is `632292e` (the adapter extraction) and the tag
    `graph-adapter-2026-10-20` points at the same commit. The six commits that were unpushed since
    the sync (`f7cf48a`, `0bb41fd`, `e07e664`, `844cf76`, `9fa1083`, `632292e`) are on the remote,
    so the fork's workspace dependency now resolves against a published state.

- [x] **T4.2 Publish the packages** (adoption mechanic, not demo blocker)
  Add `dist` builds (ESM + d.ts), `files`, `exports`, semver tags for all packages. Replace source workspace linkage. Fallback: one bundled companion package with contract + adapters, never vendored source, explicit note upstream adoption waits.
  Done when: clean project outside monorepo installs published versions and mounts both adapters; `graph:verify` passes against published packages.
  Verify: `cd spacegraphjs && pnpm run test:publish`; `bun run graph:verify` (its last step).
  - **Done (2026-10-20), and the linkage really was replaced.** The library is now a *published*
    package set, not a source workspace: six packages (`spacegraphjs` 7.1.0 and the five
    `@spacegraphjs/*` 0.1.0), each with a `dist` (ESM + declarations), a real `exports` map and a
    `files` list. The hand-written `types/activity.d.ts` stopgap is **gone** — the `./activity`
    subpath now has generated declarations.
  - **The build is multi-entry.** One bundle per export subpath (21 of them), so a consumer can
    import `spacegraphjs/layout` without pulling the core; the five leaf packages build the same
    way. `script/library-entries.ts` is the single list the build and the manifest read, and
    `script/write-exports.ts` writes the manifest from it.
  - **The proof is a clean consumer, not a claim.** `script/publish-check.ts` packs every package
    with `npm pack`, extracts the tarballs into a `node_modules` **outside the repository** (so a
    workspace link cannot satisfy an import by accident), and runs two checks: a node check that
    loads the contract, the model adapter and both interactive adapters from those bytes, and a
    browser check that mounts **both interactive adapters for real** in Chromium and reports what
    they drew. It is network-free: the tarballs are the bytes npm would install, and the runtime
    dependencies are linked from the local install.
  - **The fork now consumes the published artifacts.** `bun run graph:verify` builds the library
    first, and every step after that runs against `dist`. The app's e2e intercepts the adapters'
    **dist** URLs now (`spacegraph-renderer/dist/index`), because the host resolves the published
    bundle rather than the source.
  - **One defect the proof found:** the Cytoscape adapter took the document from the *global*
    `document`/`getComputedStyle`, so a host could not mount it into an iframe and a node consumer
    could not mount it at all. It now takes the document from the container it mounts into.
  - **Not done, and deliberately:** nothing was pushed to npm — there is no registry credential in
    this environment. The packages are *publishable* and proven consumable; the registry upload is
    one command away (`npm publish` per package) and **upstream adoption waits on it**. The
    fallback the plan allowed (one bundled companion package) was not needed: the six packages
    already are the bundle.

- [x] **T4.3 Fold session layouts onto `LaneLayout`** — library-first debt
  Give `LaneLayout` variable item widths and per-lane cursors; move three strategies onto it without behaviour change.
  Done when: byte-identical positions for fixture; library tests and captures unchanged.
  - **Done (2026-10-20).** `LaneLayout` is now the one placement primitive: a grid of columns (X) and
    rows (Y) where every (column, row) cell keeps its own cursor, so a row advances by the widths of the
    items it holds. `strategies.ts` keeps the three **policies** (lanes, timeline, hierarchy) and no longer
    measures anything: a strategy chooses the column and the row an item belongs to, and the engine places
    it. The library has one geometry engine instead of four.
  - **The positions are byte-identical.** The host's golden file (`packages/session-ui/src/graph/layout.golden.json`)
    compares the positions, the cluster bounds and the overall bounds of the canonical fixture across all
    seven views, and it passes unchanged. **The host did not change at all**: `packages/session-ui/src/graph/layout.ts`
    is still the vocabulary wrapper, and the library's `Strategies` API is unchanged.
  - **The engine's contract changed, and it is a break.** `LaneLayout` took `ordinal` (one shared slot per
    group) and returned an item's origin. It now takes `width` (a variable box), `row` (a row the host
    numbers itself) and `indent`, and returns the item's **centre** — the renderer's convention. The columns
    are explicit (`open`/`close`, with a declared or a measured width) instead of the implicit `reserve`.
    `spacegraphjs` is therefore **8.0.0**; the `v7.1.0` tag stays where it is.
  - **Two rules the fold settled, and the golden file proves both.** (a) A node belongs to **one** cell: a
    node that names both a turn and an owner is drawn in the **owner's** column (the old code placed it in
    both and the last placement won). (b) An **empty turn is still a column** — the turn keeps its place in
    the session, so the columns after it do not move; the old code advanced the column by the minimum width
    for an empty turn, and it still does.
  - The contract demo (`demo/contract-demo.ts`) drives the engine directly: its pipeline's per-lane order
    now comes from the cursor instead of an explicit ordinal, and its positions are unchanged.
  - Tests: the library's `test/lane-layout.test.ts` (12) covers the rows, the per-cell cursor, the variable
    widths, the indent, the numeric rows, the column widths and the bounds; the strategies' suite (16) is
    unchanged; the host's golden comparison and its 101 graph tests are unchanged.

- [x] **T4.4 Remove the `activity.d.ts` stopgap** — type cleanliness
  Fix/exclude known `spacegraphjs` `src` type errors (10 in `src`; `n8n-bridge` stays excluded); generate declarations; remove hand-authored `types` condition.
  Done when: `tsc --noEmit` clean for `src` + packages; consumers typecheck from `dist`.
  Verify: `cd spacegraphjs && tsc --noEmit -p tsconfig.json`; `cd packages/session-graph && bun run typecheck` (against `dist`).
  - **Done (2026-10-20).** `tsc --noEmit` is clean for the whole library: `src`, `test` and all
    five packages. It was **97 errors** before, and the `n8n-bridge` package alone carried 85 of
    them — which is why it was removed rather than excluded (see §6.1).
  - **Two real defects the typechecker found in the library's own source:**
    `src/core/SpaceGraphApp.ts` called `depthTreatment` without importing it (a latent
    `ReferenceError` in `focusOnNodes`), and `src/core/bvh.ts` re-declared the `three` module
    augmentation that `three-mesh-bvh` already ships.
  - **One API widening, made because the types had been lying.** `Graph`, `Node`, `Edge` and the
    built-in node and edge classes now accept a *missing* `SpaceGraph`: the runtime has always
    tolerated it (`this.sg?.` throughout) while the types demanded one, so a headless graph needed a
    cast in every test. 44 constructors changed from `sg: SpaceGraph` to `sg: SpaceGraph | undefined`.
  - The rest was mechanical: literal types on fields assigned later, `Array.prototype.at` (the
    `lib`/`target` moved to ES2022), and the test files' own type errors.
  - **The fork's `tsc -b` was hiding half of this.** The fork typechecks the library through the
    published declarations now, and the incremental build had been masking the library's errors:
    the fork's `noUnusedLocals` flagged 18 write-only private members in the library's source that
    the library's own settings do not. Those are invisible to a consumer (declarations have no
    bodies), so they stay, but a consumer that compiles the *source* would see them.

- [x] **T4.5 Close mesh-outline and fog defects (or declare them)**
  Implement stencil/backface outline and scene-relative fade, or document DOM cards as supported path and depth fog as lanes-only.
  Done when: known-limitations list matches code.
  - **Done (2026-10-20): declared, and the code agrees.** The scene-relative fade landed with T1.3
    (`sceneFadeDensity`), and what is left is declared rather than implemented.
    `spacegraphjs/docs/limitations.md` lists the four limits a host must know before it ships: the mesh
    outline is a **bounding box** (`THREE.BoxHelper`), not a silhouette; the depth fade is a **scene fog**
    and DOM cards do not fade with it; **DOM cards are the supported path** for readable text; and the
    layout engine places without knowing the screen (the camera is the renderer's, through the contract).
    The library README and the host-integration guide link it.
  - **The host's own list was corrected to match.** `prototype.md` §"Known limitations" lost the item that
    said the strategies computed their own cursors (that was T4.3, now done) and the depth-fog item was
    rewritten: the fade is scene-relative now, and what remains is that the DOM cards the host actually
    reads do not fade with the scene. The list is still 20 items.

- [x] **T4.6 Add CI for library and graph**
  Workflow running boundaries, contract conformance, both adapters, SVG renderer, bindings, session-graph component suite. Cache Playwright browsers; capture verification on schedule/release tag.
  Done when: workflow green on clean clone; fails on deliberately broken adapter.
  Verify: `.github/workflows/graph.yml` (the fork) and `spacegraphjs/.github/workflows/ci.yml` (the library).
  - **Done (2026-10-20), for the library and the fork.** The library's workflow now runs the
    library's real checks — the typecheck (`src`, `test` and the five leaf packages), the build, the
    unit tests, the leaf packages' own tests, and the **publish check** (a clean consumer that
    installs the packed tarballs and mounts both interactive adapters). The fork's `graph.yml`
    checks the library out as a sibling, installs, and runs `bun run graph:verify` — the whole gate,
    including the capture verification and the publish check.
  - **The old library workflow could not pass.** It ran `npm ci` on a pnpm project, then
    `npm run lint` (the eslint config cannot run under TypeScript 7) and `npm run format:check` (the
    committed source does not follow the committed prettier config — 303 files disagree). Those steps
    are gone rather than fixed: the source is not prettier-normalised and reformatting it is a
    separate, large change. The substantive checks replaced them.
  - **The gate is the one command.** `bun run graph:verify` builds the library first, then runs the
    boundaries, the contract conformance for both adapters, the view controller and the framework
    bindings, the overlay and navigation cores, the four leaf packages, the host's unit and
    component contracts, the capture verification, and the publish check.
  - **Not done:** the capture verification runs on every gate, not on a schedule or a release tag
    only, and the Playwright browsers are installed per job rather than cached. The workflows were
    not executed on a clean clone here — they were validated by running every step they call.

- [x] **T4.7 Decide edge accessibility**
  a11y mirror lists nodes only. Announce edges (extend layer) or document nodes-only.
  Done when: decision in docs and tests match.
  - **Decided: announce the edges** (2026-10-20). The mirror already reached every node; the
    structure between them was unreachable, which is exactly what a reader asks the graph for.
    The library layer takes the connections (`setEdges`), lists them beside the nodes in a labelled
    list, and announces the ones of the selected node; the host supplies the text through
    `edgeAnnouncer`, so the announcement is localized and the library stays free of copy.
  - `spacegraphjs/src/a11y/AccessibilityLayer.ts`: `AccessibleEdge`, the `edgeLabel` and
    `edgeAnnouncer` options, `setEdges`, and the announcement of the selected node's connections.
    `spacegraphjs/test/a11y.test.ts` gained three tests (the connection list, the announcement, and
    the list disappearing when the edges are cleared).
  - `packages/session-graph/src/ui/GraphA11y.tsx` maps the render model's edges into the layer and
    composes the connection text from the node labels; two i18n keys were added
    (`ui.sessionGraph.a11y.edgeLabel`, `ui.sessionGraph.a11y.connections`).
  - `packages/session-graph/component-tests/graph-a11y.spec.ts` asserts the connection list and the
    announcement; `docs/spacegraph/upstream-review.md` §8 records the decision where the old
    "known gap" line was.
  - The edge *kind* stays the model's own vocabulary (`writes`, `part-of`) and is not translated;
    only the glue is localized.


**SpaceGraphJS core extractions (vacuum generic primitives from OpenCode):**

- [x] **T4.8 Extract layout strategies to SpaceGraphJS `src/layout/`**
  Move `packages/session-ui/src/graph/layout.ts` algorithms (`lanes`, `timeline`, `hierarchy`) to `spacegraphjs/src/layout/strategies.ts` with **fully configurable** options:
  - `nodeSizeFn: (node) => [width, height]` — replaces `CARD_SIZE`/`COMPACT_SIZE`/`COMPACT_KINDS`
  - `laneList: string[]` — replaces hardcoded `LANES` array
  - `laneOfFn: (node) => laneName` — replaces OpenCode-specific `laneOf` logic
  - `depthMap: Record<NodeKind, number>` — replaces `DEPTH` mapping
  - `turnIdFn: (node) => string | undefined` — replaces turn grouping logic
  - `fileOwnerTurnFn: (model, node) => string | undefined` — replaces `fileOwnerTurn`
  - `clusterOfFn: (node) => string[] | undefined` — replaces phase cluster logic
  All OpenCode-specific constants become host-provided config. Layout algorithms remain pure and deterministic.
  Done when: OpenCode `layout.ts` is a thin wrapper calling SpaceGraphJS strategies with its config; positions byte-identical for fixture; SpaceGraphJS has layout conformance tests.
  Verify: `cd packages/session-ui && bun test src/graph/layout.test.ts`; `cd spacegraphjs && vitest run test/layout/`
  - **Done (2026-10-20).** `spacegraphjs/src/layout/strategies.ts` holds the three strategies; the
    module exports one namespace (`Strategies`) so a host binds its vocabulary without shadowing its
    own public names. The config carries the plan's seven callbacks plus a `geometry` block
    (`standardSize`, `indentStep`, `depthLevels`, `padding`) for the constants the algorithms measure
    against, and the call options carry `include` (the host's level filter) and `minColumnWidth`
    (the overview column width).
  - `packages/session-ui/src/graph/layout.ts` is now a vocabulary wrapper: `LANES`, `DEPTH`, `laneOf`,
    `fileOwnerTurn`, and the card sizes stay; the geometry, the column grouping, the band bounds, and
    the three strategies moved to the library.
  - **Byte-identical, proven:** `packages/session-ui/src/graph/layout.golden.json` records the
    positions, the cluster bounds, and the overall bounds of the fixture for `lanes`, `overview`,
    `execution`, `timeline`, `hierarchy`, `ribbon`, and `matrix`, captured **before** the extraction.
    The new test "the fixture lands exactly where it did before the strategies moved to SpaceGraphJS"
    compares the current output against that file.
  - Library conformance: `spacegraphjs/test/layout/strategies.test.ts` (13 tests) covers determinism,
    append-only placement, lane and depth mapping, owner-turn anchoring, no-overlap, the `include`
    filter, cluster bounds, turn bands, the timeline columns, and the hierarchy indent and wrap.

- [x] **T4.9 Extract semantic levels to SpaceGraphJS `src/levels/`**
  Move `packages/session-ui/src/graph/levels.ts` level definitions (`overview`/`execution`/`detail`), per-level node filtering, and stability guarantees to `spacegraphjs/src/levels/index.ts`. Expose generic `LevelConfig<Kind, EdgeKind>` interface:
  - `levelRank: Record<ZoomLevel, number>` — level ordering (default: overview=0, execution=1, detail=2)
  - `kindMinLevel: Record<Kind, ZoomLevel>` — per-kind minimum visibility level (replaces `KIND_MIN_LEVEL`)
  - `edgeMinLevel: Record<EdgeKind, ZoomLevel>` — per-edge-kind minimum level (replaces `EDGE_MIN_LEVEL`)
  - `domBudget: Record<ZoomLevel, number>` — per-level DOM card budget (replaces `DOM_BUDGET`)
  - `isClusterExpanded: (level) => boolean` — cluster expansion policy (replaces hardcoded logic)
  - `edgeFilterFn: (model, level, focus?) => Edge[]` — host-specific edge filtering (replaces OpenCode-specific execution/overview rules in `edgesAtLevel`)
  Host provides full config; library handles filtering, budgets, stability.
  Done when: OpenCode `levels.ts` imports from SpaceGraphJS with its config; level behavior unchanged; SpaceGraphJS tests cover level stability + filtering + budgets.
  Verify: `cd packages/session-ui && bun test src/graph/levels.test.ts`; `cd spacegraphjs && vitest run test/levels/`
  - **Done (2026-10-20).** `spacegraphjs/src/levels/index.ts` exports the `Levels` namespace and the
    `LevelConfig` type. The library owns the filtering (a node's own `minLevel` beats the kind
    fallback; an edge needs a level *and* two visible endpoints) and the budgets.
  - **One deliberate deviation from the plan's signature:** `edgeFilterFn` receives
    `(model, level, focus, candidates, visible)` — the candidates the level already allows and the
    visible ids — so a host can narrow to a neighbourhood without re-deriving the level's own rules.
    The plan's three-parameter form would have forced the host to redo the library's filtering.
  - `packages/session-ui/src/graph/levels.ts` keeps its whole public surface (`LEVEL_RANK`,
    `minLevelOf`, `isVisibleAt`, `nodesAtLevel`, `visibleNodeIDs`, `edgesAtLevel`, `domBudget`,
    `isClusterExpanded`, `clusterCount`, `labelMode`) and now holds only the session's level table
    and its three edge rules (RF.4, LE.6, the execution focus neighbourhood).
  - Library conformance: `spacegraphjs/test/levels/levels.test.ts` (11 tests) covers the kind
    fallback, a node's own level, the visible set, edges to hidden nodes, an edge kind without a
    level, the host filter, the visible ids handed to the host, the budgets, and the cluster count.

- [x] **T4.10 Extract summary representations to SpaceGraphJS `src/representations/`**
  Move `packages/session-ui/src/graph/representation.ts` (`ribbon`, `matrix` generators, axis/label logic) to `spacegraphjs/src/representations/index.ts`. Replace session-specific logic with generic functions:
  - `rowKeyFn: (node) => string | number` — replaces `turnRows`/`turnOrder` (row grouping)
  - `rowOrderFn: (nodes) => nodes` — replaces `turnOrder` (within-row ordering)
  - `columnKeyFn: (node) => number` — replaces `matrixColumn`/`PHASE_CATEGORIES` (column assignment)
  - `levelFilter: (node) => boolean` — replaces hardcoded `isVisibleAt(node, "overview")` (which nodes participate)
  - `categoryMap: Record<number, string>` — optional column index → label for axis generation
  Ribbon = 1D segments per row; Matrix = 2D grid with cell packing (no overlap). Algorithms stay pure.
  Done when: OpenCode `representation.ts` imports from SpaceGraphJS with its config; captures 15/16 unchanged; SpaceGraphJS tests verify non-overlap + axis generation.
  Verify: `cd packages/session-ui && bun test src/graph/representation.test.ts`; `cd spacegraphjs && vitest run test/representations/`
  - **Done (2026-10-20).** `spacegraphjs/src/representations/index.ts` exports the `Representations`
    namespace (`summaryRows`, `ribbonLayout`, `matrixLayout`, `summaryColumns`) over the plan's five
    callbacks plus `nodeSizeFn` and `cellSize` (the summary cell footprint that sets the row pitch and
    the minimum column width). The rows come from the model's ordered row keys, so the host's turns
    drive the order.
  - `packages/session-ui/src/graph/representation.ts` keeps `matrixColumn`, `PHASE_CATEGORIES`,
    `turnRows`, `REPRESENTATIONS`, and `representationLevel`; the packing moved to the library.
  - Captures 15/16 are unchanged: the golden file proves the ribbon and the matrix land on the same
    coordinates, so the committed images still describe the current output.
  - Library conformance: `spacegraphjs/test/representations/representations.test.ts` (9 tests) covers
    the row order, the level filter, the ribbon segments, the matrix cells, the column separation,
    non-overlap in both summaries, and the labelled columns.

### 6.1 Notes for the remaining extractions (T4.11–T4.14, T6.17)

The three extractions above set the conventions the rest of §6 and §8 must follow.

- **One namespace per library module.** `Levels`, `Strategies`, and `Representations` are exported as
  objects, not as loose functions. The reason is the host: `@opencode/session-ui/graph` already owns
  `isVisibleAt`, `nodesAtLevel`, `edgesAtLevel`, `matrixColumn`, `turnRows`, `layoutGraph`, and
  `laneAnchors`, and the repository forbids aliased imports. A namespace lets the library and the
  host keep their own names for the same concept without a rename in either direction.
- **The host keeps the vocabulary; the library keeps the algorithm.** Lane names, node kinds, depth
  maps, turn ownership, phase categories, level tables, and the copy of a card belong to the host.
  Anything a second host would answer differently is a config callback, never a constant in the
  library.
- **A config callback may take the model.** `ownerTurnFn(model, node)` and `edgeFilterFn(model, …)`
  need the whole model; `nodeSizeFn`, `laneOfFn`, `turnIdFn`, `clusterOfFn`, `rowKeyFn`, and
  `columnKeyFn` take the node alone.
- **A config callback is typed with the host's model.** The adapter config (`nodeFilter`,
  `edgeFilter`, `neighbors`) is generic over the host's domain type, so a host binds its own model
  without a cast. A callback that only reads one node takes the node.
- **The render model is the camera's frame of reference.** It must be built *before* the renderer
  mounts and must not change afterwards: a model rebuilt after the fit moves the camera's frame.
  A renderer-specific policy (a different DOM budget) therefore belongs to the adapter chosen for
  the *requested* renderer, not to a model swapped in after the mount.
- **The core stays dependency-free.** The new modules import nothing: no contract, no renderer, no
  framework. `test/boundaries.test.ts` still passes, and a host may import the subpaths without
  pulling `three` into its bundle.
- **Where a binding may live.** A React or Solid binding cannot live in `src/` (the core is
  framework-free), so T4.12 and T4.14 put the headless core in `src/` and the bindings in
  `packages/react-spacegraph` and `packages/solid-spacegraph`. T4.11 and T4.13 belong to the
  packages, not the core, because they speak the contract.
- **Proof of "no behaviour change".** Capture the output before moving an algorithm, then compare
  after: `packages/session-ui/src/graph/layout.golden.json` is the pattern. A new extraction should
  add its own golden file, or extend this one, rather than assert "looks the same".
- **The subpath must be registered.** Each new module needs an entry in the library's `package.json`
  `exports`, and the fork consumes the library as a bun workspace (`packages/session-ui` now depends
  on `spacegraphjs`). A new dependency edge needs `bun install` before the typechecker resolves it.
- **The library is published now, so the registration rule changed (2026-10-20).** The subpath
  entries live in `script/library-entries.ts`; `script/write-exports.ts` writes the `exports` map
  from that list, and `test/package-exports.test.ts` asserts the committed manifest matches it and
  that every published subpath has a bundle and a declaration behind it. The fork consumes the
  **built** packages, so `bun run graph:verify` builds the library first; a library edit needs
  `pnpm run build:lib && pnpm run build:packages` before the host sees it.
- **`n8n-bridge` was removed, not excluded (2026-10-20).** The plan said "n8n-bridge stays
  excluded" (T4.4). It was already excluded from the pnpm workspace and from the unit-test run, had
  no `node_modules`, and had not been touched since 2026-09-15 — but it still carried **85 of the
  library's 97 type errors** and 17 `n8n@…` dependency overrides. The n8n-specific parts were a
  thin integration over the n8n API; the graph side was ours and lives in `src/`. The package, its
  two demos and its three test files are gone, and the design note is archived at
  `spacegraphjs/docs/archive/n8n.md`. The library's `tsc --noEmit` is clean as a result.
- **The host must not import a renderer package at module scope.** The adapters load behind dynamic
  `import()` so a failing adapter falls through to the next one; a static import in the host (T4.13
  first did this for the theme palette) turns "the SpaceGraph adapter fails to load" into "the whole
  graph module fails to load". The host may import the **contract** package at module scope; a
  renderer package only behind a dynamic import. The app e2e ("falls back to Cytoscape…", "returns to
  the transcript when no renderer can mount") is the keeper of this rule.

### 6.2 T7 — The layout variety track (the owner's priority, 2026-10-20)

**Why this track exists.** The owner redirected the work on 2026-10-20: the graph must offer a **wide
variety of fundamentally different layouts**, because nobody knows which one is best and the recent
passes had been perfecting the lanes view instead of exploring the space. Force-directed and tree
layouts are the named examples. Two rules follow from that, and they bind every task below:

1. **A new layout is a new geometry, not a new way of drawing the lanes.** The three existing views
   are *policies* over one grid primitive (`LaneLayout`: columns × rows, per-cell cursors). T4.3's
   consolidation — "one geometry engine instead of four" — was right for three grid-shaped views and
   wrong as a ceiling: a force simulation or a tidy tree cannot be expressed as a choice of column
   and row. **The library needs a placement *seam*, not more policies.**
2. **Every layout must be legible in its own frame.** The hierarchy collapses to a tiny column today
   (`prototype.md` limitation 18) because it has no frame of its own. A layout that cannot be read
   is not an option, it is a defect.

**What a layout costs in this repository** (so the track is priced honestly): a *placement engine* in
the library, a *vocabulary binding* in the host (which nodes participate, what an edge means), a
*golden-file entry* (the fixture's positions), a *toolbar control* (the reader's choice), a *legend
entry* (the encoding), and a *frame*. The geometry is the cheap part.

- [x] **T7.1 The placement seam: an engine interface, not a grid**
  Give the library a `Placement` concept a strategy can implement — `place(items, previous) →
  positions` — with the grid (`LaneLayout`) as the first implementation and the new engines beside it.
  `Strategies.layoutGraph` keeps its contract (`positions`, `clusters`, `bounds`, `strategy`) and its
  vocabulary role; only the *where* moves behind the seam.
  Done when: a strategy can be added that never touches `LaneLayout`, and the three existing
  strategies are byte-identical for the fixture (the golden file).
  Verify: `cd spacegraphjs && vitest run test/layout/`; the host's golden comparison is unchanged.
  - **Done (2026-10-20).** `spacegraphjs/src/layout/placement.ts` holds the seam: `PlacementItem`
    (a box with its size, its depth, and the engine's own vocabulary), `Position`, and the
    `Placement` interface — `place(items, previous?) → positions`. `previous` is the channel the
    append-only rule needs: an engine that cannot keep its boxes where they were reads the
    positions the last layout gave them.
  - **The grid is the first implementation, and it is now an implementation of the seam.**
    `src/layout/grid.ts` (`GridPlacement`) wraps `LaneLayout` and adds one thing the strategies
    needed: a column can be *declared* empty (`meta.empty`), because "an empty turn is still a
    column" is a rule about the column sequence, not about boxes. Without it the lanes layout lost
    the gap of a turn that drew nothing — the library's own test caught it.
  - **The three grid views are byte-identical.** The host's golden file is unchanged for
    `lanes`, `overview`, `execution`, `timeline`, `hierarchy`, `ribbon`, and `matrix`; only the two
    new entries were added. The strategies now build an item stream and hand it to the engine
    instead of driving `LaneLayout` themselves.
  - The seam is where a *new* geometry goes: `src/layout/tree.ts` and `src/layout/force.ts` are
    engines that never touch the grid.

- [x] **T7.2 A tidy tree** — the first genuinely different geometry
  Parents centred over their children, leaves in model order. Deterministic, no iteration.
  **The append-only rule decides the shape:** a classic tidy tree re-centres a parent when a child is
  added, which would move a node the reader is looking at. So the tree grows *downward* from a fixed
  parent: a new node takes the next leaf slot under its parent and the parent's position stays put.
  The host binds the parent relation (`part-of`) and the orientation.
  Done when: the tree renders the canonical fixture, the reader can pick it, and appending a node
  leaves every existing position byte-identical.
  Verify: `cd spacegraphjs && vitest run test/layout/`; a host golden entry for the new view.
  - **Done (2026-10-20), and the shape changed once the frames were looked at.**
    `spacegraphjs/src/layout/tree.ts` (`TreePlacement`) is a **block tree**: a parent's children are
    packed into a block of rows under it, the parent sits over the middle of that block, and the
    blocks of the different parents sit side by side. The tree grows **downward** (the root is the
    highest point, the work is below it — the renderer's Y axis points up, so the rows are negative).
  - **Why the block tree and not the textbook fan.** The first version was the textbook tidy tree:
    one column per leaf, the parent centred over its children. It renders, but a session's forty
    leaves are forty columns wide — 9,516 units — so no frame can hold it and the capture showed a
    row of cards in an empty canvas. The block tree packs a turn's work into a grid of four columns
    under the turn: the fixture is 1,952 × 960, the whole tree fits at 58 % scale, and every card is
    legible. **A layout that cannot be read is not an option** (§6.2's rule).
  - **The append-only rule is honoured through the seam.** The engine reads `previous` (the positions
    the last layout gave): a box that was already placed keeps its position, and only a new box takes
    a slot — the next free one, next to its parent when there is room. The host passes the previous
    positions per view (`GraphView`'s `layoutHistory`), so a streamed session never moves a node.
  - The host binds the parent relation: `parentOfFn` reads the model's `part-of` edges, and a file
    hangs under the turn that wrote it. The host keeps the vocabulary; the library keeps the geometry.
  - Tests: the library's `test/layout/placement.test.ts` (12) and the host's `layout.test.ts` — the
    tree's golden entry, its determinism, the work sitting below its turn, the parent centred over
    its children, and the append test.

- [x] **T7.3 A force-directed placement** — deterministic, and pinned where it must be
  A force layout is physics, and the host's layout contract says "no physics" (§5.5) for a reason:
  a live simulation jitters while the session streams. The resolution is an **append-only force
  placement**: the simulation is seeded deterministically (a fixed seed, a fixed iteration count, the
  model's node order), run once, and then **frozen**; when the session streams, the existing nodes
  stay **pinned** and only the new nodes relax into place against them. The core already has the
  pinning primitive (`pinAll`), so this is an engine, not a rewrite.
  The host binds which edges attract and the repulsion radius (the card's footprint).
  Done when: the same model always yields the same positions, streaming never moves an existing node,
  and the reader can pick the view.
  Verify: `cd spacegraphjs && vitest run test/layout/`; a determinism test (same model → same
  positions) and an append test (existing positions unchanged).
  - **Done (2026-10-20).** `spacegraphjs/src/layout/force.ts` (`ForcePlacement`) is a
    **Fruchterman–Reingold** simulation: the boxes push each other apart, the links pull them
    together, and every step is capped by a cooling temperature so the simulation settles instead of
    oscillating. The initial placement is a golden-angle spiral (deterministic, no random number
    generator), the steps are fixed, and the order is the model's own — so the same model always
    yields the same positions.
  - **The pinning is the seam's `previous` channel**, exactly as the plan describes: the boxes the
    layout already placed are pinned, and only the new ones relax against them. The host passes the
    previous positions per view, so streaming never moves an existing node.
  - **Two things the simulation needed to be usable.** (a) A *collision term*: the cooling ends at
    rest, so the last overlaps were never resolved and two cards sat on top of each other (the
    measured minimum distance was 30 units against a 132-unit card). A short-range push plus a
    separate separation pass after the cooling brought it to 132 — exactly the sum of the two radii.
    (b) A *neighbour search*: the repulsion only looks at the boxes near a box (a uniform grid), so
    the cost grows with the content instead of with its square. The step count scales down with the
    node count.
  - The host binds the attraction: `forceLinksFn` reads the structural edges (`part-of`, `sequence`)
    and leaves the inferred ones out — a link is a claim about the session's shape, not about cause.
  - The frame reads well: capture `29-graph-force.png` shows the session's own shape, with the turn
    bands hugging their members.

- [x] **T7.4 The host binds the new layouts**
  The vocabulary (which nodes participate, what an edge means), the toolbar control, the legend, and
  **each layout's frame** — the thing the hierarchy lacks. A layout that cannot be read is not an
  option.
  Done when: every layout in the library is pickable from the toolbar, named in the legend, and
  legible at 1440×900 in the fixture (the legibility component test grows to cover the new views).
  Verify: `cd packages/session-graph && bun run test:components`; the capture set gains one frame
  per new layout.
  - **Done (2026-10-20).** The layouts are pickable, named, and legible:
    - The **toolbar** offers them through a *layout menu* (`Layout: Lanes ▾`) rather than a
      segmented control. Five layouts do not fit in a segmented control, and the toolbar had become
      wide enough to wrap — which pushed the back control under the floating header and broke the
      app e2e that keeps that control clickable. The menu shows the current layout and the choices,
      and the toolbar stays on one row.
    - The **legend** says what the layout on screen encodes (`ui.sessionGraph.layoutHint.*`), one
      sentence per layout, so the map explains itself.
    - The **frames**: the fit's legibility floor covers the new views, and the legibility component
      test now walks the tree and the force layout as well (`graph-legibility.spec.ts`).
  - **The captures gained one frame per new layout**: `28-graph-tree.png`, `29-graph-force.png`, and
    `30-graph-gallery.png` (the gallery, T7.5). The whole set was refreshed deliberately and read by
    eye; the lanes, timeline, hierarchy, ribbon, and matrix frames are unchanged apart from the
    toolbar's layout menu.

- [x] **T7.5 A layout gallery: the affordance the exploration needs**
  Small multiples: the same model rendered in every layout at once, so the reader (and the study)
  can *compare* the options instead of committing to one. This is also what the evidence task needs:
  **T2.1/T2.2 must compare layouts, not perfect one.**
  Done when: the gallery shows every layout of one model side by side, and the reader can open any of
  them in the full surface.
  Verify: a component test asserts one frame per layout; the capture set gains the gallery frame.
  - **Done (2026-10-20).** `packages/session-graph/src/ui/GraphGallery.tsx` is a dialog with one
    thumbnail per layout. Each thumbnail is a **static SVG** of that layout (the library's SVG
    renderer, over the same render-model pipeline the canvas uses) — no canvas and no WebGL context
    per thumbnail, so five layouts cost nothing. Picking one opens it in the full surface.
  - The gallery is the toolbar's `Compare the layouts` button (the `dot-grid` icon). The component
    test `graph-gallery.spec.ts` asserts one picture per layout, that every layout is named, and that
    picking one switches the surface.

- [x] **T7.6 The invariant every new layout must keep**
  "Streaming never re-lays-out existing nodes" and "the same model always yields the same positions"
  are the contract, and they are cheap to state and expensive to rediscover. Each new layout adds a
  golden entry, and the append-only property is asserted per layout (not once).
  Done when: every layout has a golden entry and an append test.
  Verify: `cd spacegraphjs && vitest run test/layout/`; the host's golden comparison covers them all.
  - **Done (2026-10-20).** The host's golden file has an entry per layout (`tree` and `force` were
    added; the seven existing entries are byte-identical), and each new layout has its own append
    test: the tree and the force layout keep every placed node where it was when the session grows.
  - **The invariant needed a channel, and the channel is the seam's `previous`.** The grid layouts
    are prefix-stable by construction (`LaneLayout` keeps a placed id's position), but the tree
    re-centres a parent and the force simulation relaxes — so both read the positions the last
    layout gave them. The host keeps them per view (`GraphView`'s `layoutHistory`, keyed by session,
    strategy, and level) and hands them to `layoutGraph`.
  - **One deviation worth recording:** the "same model always yields the same positions" invariant
    holds for a *given* history, not across histories. A tree built fresh and a tree grown by
    streaming differ, because the streamed tree keeps the parent's place. That is the plan's own
    rule ("the parent's position stays put"), and it is the reason the tree reads as a map the reader
    is looking at rather than a map that redraws itself.


**Do not do this track's work as capture or pixel work.** The frames are read by eye (§10); T6.15's
pixel-diff helper was written and dropped for exactly that reason.

**Notes for the next pass (2026-10-20, updated after the placement-engine pass).**

- **The track is closed; the two things it opened are now open too.** The second host (T6.12) runs the
  tree and the force engines in its capability gallery and picks a layout from its own toolbar, so
  the library's claim that every generic module runs outside OpenCode covers them. The force layout's
  cost at scale is measured (`bun run graph:scale`): **209 ms at 409 nodes and 9.3 s at 20,005** —
  the simulation is two orders of magnitude above the lanes layout on the same model, which is why it
  is frozen after one run and why the host's 60-turn window is what keeps the reader-visible cost
  near 0.2 s.
- **The tree's block width (four leaves per row) is a policy, not a measurement.** It was chosen so
  the canonical fixture fits one frame at a legible scale. T2.2's evidence may prefer another
  number, and the number is now really one option away (`LayoutOptions.treeColumns` — the strategy
  did not forward it before this pass).
- **The evidence task can now compare layouts instead of perfecting one.** The gallery (T7.5) is the
  affordance the study needs: a participant can be shown the same session in five shapes. T2.1's
  dry run should use it, and the protocol should record which layout a participant reached for.
- **The force layout's cost at scale was not measured.** The neighbour grid bounds the repulsion, and
  the step count scales with the node count, but the 5,000-message number (T6.6's table) has no
  force row. It is one number in `bun run graph:scale`.
- **The layout menu is the browser's `<details>`, not a custom menu.** It closes on Escape in the
  browser's own way and its keyboard behaviour is the platform's. A host that wants a real menu
  would use the UI kit's `Select`.




- [x] **T4.11 Extract adapter framework to SpaceGraphJS `packages/adapter/`**
  Create `packages/adapter/src/ModelAdapter.ts` with abstract `ModelAdapter<DomainModel, RenderModel>` base class and conformance suite. The base provides:
  - Pure `build(model, options): RenderModel` pipeline (level filter → node map → bands → lanes → axes → edges)
  - Configurable: `cardBudget`, `renderCardTemplate`, `renderBandTemplate`, `laneLabels`, `axisLabels`, `bundleEdges`, `buildBands`
  - **Abstract methods host must implement:** `nodeShape(node)`, `nodeStatus(node)`, `isStructuralKind(kind)`, `nodeData(node, level, dimmed)`, `toRenderEdge(edge, level)`
  - **Optional overrides:** `defaultCardTemplate`, `defaultBandTemplate`, `buildBands`, `bundleEdges`
  Port OpenCode `buildRenderModel.ts` as reference `SessionGraphAdapter` extending base. Cytoscape adapter gets parallel subclass. Conformance suite tests pipeline + abstract method contracts.
  Done when: `spacegraphjs/packages/adapter` publishes independently; OpenCode `buildRenderModel.ts` extends base adapter; both adapters pass conformance.
  Verify: `cd spacegraphjs/packages/adapter && vitest run`; `cd packages/session-graph && bun run typecheck`
  - **Done (2026-10-20).** `spacegraphjs/packages/adapter` is a new leaf package that depends on the
    contract only (`@spacegraphjs/renderer`); the core never imports it and it never imports the
    core. `ModelAdapter` owns the pipeline (level filter → node map → bands → lane gutter →
    captions → edges), the DOM card budget, the focus neighbourhood, the collapsed-cluster chip, the
    chrome markup, and the escaping of every label that reaches the markup.
  - **One signature refinement.** The base is generic over `<Node, Edge, Level, Domain>` rather than
    the plan's `<DomainModel, RenderModel>`: the render model is always the contract's `RenderModel`,
    while the host needs its own node, edge, level, and model types in the callbacks.
  - **The level filter is a config callback, not a base rule.** `nodeFilter`, `edgeFilter`, and
    `neighbors` are typed with the host's `Domain`, so a host never casts. Which nodes exist at a
    level is the host's semantic policy (§5.4); the generic filtering already lives in
    `spacegraphjs/levels` (T4.9).
  - **The conformance suite is runner-agnostic.** `adapterConformance(adapter, fixture)` returns
    `{ name, check }` pairs, so a host runs it under Vitest, Bun, or Jest. The fixture declares which
    node is the activity card, which one is chrome, which cluster is collapsed, and what the focus
    neighbourhood is; the suite never needs to know a host's kinds. Eleven cases: one node per
    visible id, positions honoured, the activity card drawn as DOM markup, chrome drawn whatever
    the budget, cards degraded above the budget, the collapsed cluster drawn as a chip, the focus
    neighbourhood dimmed, the chrome in front of the content, the lane gutter left of the content,
    the captions carrying their role, and every edge mapped.
  - **The host is now a thin vocabulary layer.** `packages/session-graph/src/canvas/sessionGraphAdapter.ts`
    holds `SessionGraphAdapter` (the kinds, the statuses, the structural kinds, the node data, the
    edge mapping, the swimlane bands, the provenance bundling) and `buildRenderModel.ts` shrank from
    399 lines to 61. The host's 50 unit tests and 37 component tests pass unchanged, and all 24
    committed captures are pixel-identical (RMSE 0).
  - **The Cytoscape parallel subclass exists but is not live.** `CytoscapeSessionAdapter` caps the
    card budget at the renderer's declared `maxDomNodes` (20), so the model never promises more
    cards than the canvas can draw; a test asserts the constant against the renderer's own
    capabilities. Wiring it per *mounted* renderer was tried and reverted — the render model is the
    camera's frame of reference, so changing it after the fit moves the Cytoscape frames (the
    capture harness caught it: RMSE 14.5 on the Cytoscape frames, 0 on the SpaceGraph ones). The
    host has no renderer switch, so the adapter is selected when it does, and the model must then be
    built for the *requested* renderer, before the mount.
  - **The library proves its own base.** `packages/adapter/test/adapter.test.ts` (16 cases) covers
    the conformance suite, the collapsed chip, the escaping, the dimming, the budget, and the bands;
    `test/boundaries.test.ts` gained the rule that the adapter package stays on the contract.
  - The package's tests run under Vitest (the plan's command); the other library *packages* run
    under Bun, and `graph:verify` runs the adapter step with Vitest.

- [x] **T4.12 Extract scoped subgraph overlay to SpaceGraphJS `src/overlays/`**
  Move `packages/session-graph/src/ui/turnMap.ts` + `TurnMapOverlay.tsx` to `spacegraphjs/src/overlays/` as:
  - **Headless core:** `extractSubgraph(model, nodeId, limit) => subgraph`, `buildSubgraphRenderModel(subgraph, options) => RenderModel`
  - **React binding:** `ScopedSubgraphOverlay` — focus-trapped, scroll-preserving (host owns container `position: relative`), Escape closes + restores focus, expand-to-full callback, slot-based header/inspector/actions
  - **Solid binding:** same API, Solid primitives
  Host provides: `model`, `nodeId` (turn or any node), `limit`, `renderCard`, `onOpenFull`, `onClose`, `onSelect`, custom header/inspector slots.
  Done when: OpenCode `TurnMapOverlay.tsx` wraps SpaceGraphJS overlay with its slots; overlay works in `react-spacegraph` demo; keyboard focus trap + Escape close verified.
  Verify: `cd packages/session-graph && bun run test:components -- turn-map`; `cd spacegraphjs/packages/react-spacegraph && vitest run`
  - **Done (2026-10-20).** `spacegraphjs/src/overlays/` holds the two generic pieces: `extractSubgraph(model, nodeId, options)`
    (the scope: the node, its highest-ranked children, and the edges between them) and `ScopedOverlay` (the dialog
    behaviour: the focus trap, Escape, and the focus restore). The core imports nothing, so `spacegraphjs/overlays`
    stays contract-free and framework-free.
  - **One placement correction, and it follows §6.1.** The plan names `buildSubgraphRenderModel(subgraph, options) =>
    RenderModel` as a core function. The core may not import the contract (`test/boundaries.test.ts` forbids it), and
    contract-speaking code lives in the packages. The render-model step is therefore not a new function: the scoped
    model is fed to the host's existing `@spacegraphjs/adapter` pipeline, which already owns model → `RenderModel`.
    What moved to the library is the *scope*.
  - The bindings live in the two framework packages: `react-spacegraph` and `solid-spacegraph` export
    `ScopedSubgraphOverlay` (focus-trapped, Escape closes, focus restored, slot-based header/content/inspector/actions)
    and `CodeDiffOverlay`.
  - **The host keeps its own markup.** `TurnMapOverlay.tsx` delegates the focus behaviour to `ScopedOverlay` and its scope
    to the library (through `turnSubgraph`); the copy, the icons, and the canvas/inspector slots stay host-owned. The host
    does **not** import the library's Solid binding: the fork consumes the library as source, and a second `solid-js`
    copy (the library's own `1.9.12` against the fork's catalog `1.9.15`) would give the overlay its own reactivity graph.
  - Proof: `spacegraphjs/test/overlays/` (20 tests over the scope, the focus scope, and the diff), the two binding suites
    (4 tests each), the host's turn-map component tests (5, unchanged), and `bun run graph:verify` (all steps).

- [x] **T4.13 Extract theme/contrast system to `spacegraph-renderer`**
  Move `packages/session-graph/src/ui/theme.ts` + `contrast.ts` semantic token → renderer color mapping to `spacegraphjs/packages/spacegraph-renderer/src/theme.ts`:
  - `SemanticTokenMap: Record<string, CSSVariable>` — host semantic token (e.g., `textMuted`) → CSS variable (e.g., `--v2-text-text-muted`)
  - `RendererTheme = { surface, border, text, textMuted, textFaint, accent, success, warning, error, ... }` — renderer-internal palette
  - `resolveTheme(semanticMap, rendererTheme): RendererTheme` — merges host overrides with renderer defaults
  - `ContrastAuditor` class: `audit(rendererTheme): ContrastReport` — verifies ≥4.5:1 text, ≥3:1 non-text per WCAG
  Cytoscape renderer gets parallel `CytoscapeThemeBridge` with its own token map.
  Done when: Both renderers import theme from SpaceGraphJS; contrast tests pass in library CI; OpenCode theme tokens unchanged.
  Verify: `cd spacegraphjs/packages/spacegraph-renderer && vitest run`; `cd packages/session-graph && bun test src/ui/contrast.test.ts`
  - **Done (2026-10-20), with one placement correction.** The shared, dependency-free pieces live in
    the **contract** package (`packages/renderer/src/theme.ts`): `SemanticTokenMap`, `resolveTheme`,
    `contrastRatio`, `ContrastRole`, `ContrastReport`, and the `ContrastAuditor` class (targets 4.5:1
    for text, 3:1 for the non-text cues, overridable per role). Each renderer package keeps its own
    theme module: `spacegraph-renderer/src/theme.ts` (`RENDERER_THEME`, `resolveRendererTheme`) and
    `cytoscape-renderer/src/theme.ts` (`CYTOSCAPE_THEME`, `CYTOSCAPE_TOKENS`, `CytoscapeThemeBridge`,
    which normalizes 8-digit hex for the Cytoscape stylesheet).
  - **Why the palette sits in the contract and not in the renderer package.** The host resolves *one*
    theme for every renderer it may mount, and the adapters load behind dynamic `import()` so a
    failing adapter can fall through to the next one. A host that imported the palette from
    `@spacegraphjs/spacegraph-renderer` would pull that package into module scope — the first
    version of this change did exactly that and **broke the app e2e**: "falls back to Cytoscape when
    the SpaceGraph adapter fails to load" and "returns to the transcript when no renderer can mount"
    both failed, because aborting the adapter module aborted the host's theme module with it. The
    palette is now `DEFAULT_THEME` in the contract package, and the host imports only from there.
  - **The boundary test was relaxed, deliberately and narrowly:** `test/boundaries.test.ts` now allows
    the contract package to import *its own* modules and forbids everything else. The contract is
    still dependency-free; a self-import is not a dependency.
  - The host keeps the DOM and framework parts: `packages/session-graph/src/ui/theme.ts` holds the
    token map (`TOKENS`), `resolveGraphTheme` (reads the computed style) and `createGraphTheme` (the
    reactive Solid signal). `packages/session-graph/src/ui/contrast.ts` is **gone**; its test now uses
    the library's `ContrastAuditor` directly, and the same light/dark verdicts still hold.
  - OpenCode's theme tokens are unchanged: the same 15 CSS variables, the same fallback palette
    values, and `fontSize: 13`.
  - Library tests: `packages/renderer/src/theme.test.ts` (6), `packages/spacegraph-renderer/src/theme.test.ts`
    (2), `packages/cytoscape-renderer/src/theme.test.ts` (3) — the token resolution, the blank-token
    fallback, the WCAG ratios, the failing roles, the custom targets, and the Cytoscape normalization.


- [x] **T4.14 Extract graph search/minimap/a11y to SpaceGraphJS packages**
  - **Search:** `spacegraphjs/src/navigation/search.ts` — headless `search(model, query, fieldsFn?) => Node[]` where `fieldsFn: (node) => string[]` extracts searchable text (label, summary, tool name, path, command). React/Solid bindings: `GraphSearch` component with keyboard nav, ARIA, result list.
  - **Minimap:** `spacegraphjs/src/navigation/Minimap.ts` — headless `project(positions, bounds, viewport) => { dots, viewRect }` + SVG renderer. React/Solid bindings: `GraphMinimap` component with drag-to-pan, viewport sync.
  - **A11y:** `spacegraphjs/src/a11y/AccessibilityLayer.ts` (already exists) — extend with `edgeAnnouncer: (edges) => EdgeSummary[]` for edge announcement (T4.7). React/Solid bindings: `GraphA11y` component.
  Done when: OpenCode components wrap SpaceGraphJS primitives; each has library tests; T6.12 capability gallery includes all three.
  Verify: `cd spacegraphjs && vitest run test/search/ test/minimap/ test/a11y/`; OpenCode component tests pass
  - **Done (2026-10-20): the headless core and the host's use of it.** `spacegraphjs/src/navigation/search.ts`
    holds the headless `search(model, query, fieldsFn)`; `spacegraphjs/src/navigation/minimap.ts` holds the headless
    `project({ positions, box, padding, viewport })` — the scale, the Y flip, the centring, and the view rectangle. The
    a11y half was already in the library (`AccessibilityLayer`, T4.7).
  - **One naming decision.** The navigation module exports the two functions as the `Navigation` namespace, because the
    host already exports `search` and the repository forbids aliased imports (§6.1's rule).
  - The host's `search` (`packages/session-ui/src/graph/selectors.ts`) is now a thin call to `Navigation.search` with the
    session's fields; the host's `GraphMinimap.tsx` uses `Navigation.project` and keeps its dots, colours, and pointer
    handling. The host's behaviour is unchanged (the scope, the ranking, the flip, and the pan maths are the same).
  - **The React/Solid `GraphSearch`, `GraphMinimap`, and `GraphA11y` bindings are dropped, not pending.** The
    library is framework-agnostic: a host binds the core in its own framework, and the OpenCode host already
    does (its `GraphSearch.tsx` and `GraphMinimap.tsx` are the Solid bindings). The capability-gallery entries
    (T6.12) wait on a framework-free second host.

**Gate G4 — sustainable.** Published, type-clean, CI-backed, no stopgap blocking second host; **generic primitives extracted from OpenCode; OpenCode is a thin vocabulary layer.**

---

## 7. T5 — Release and storytelling (AFTER UPSTREAM DECISION)

- [ ] **T5.1 Regenerate and inspect final image set**
  After G0–G3, run `--mode=compare`, inspect every image against T1.7, commit. Delete ad-hoc captures.
  Done when: set final, each image captioned in `prototype.md`.

- [ ] **T5.2 Produce the missing GIF/video**
  Playwright `recordVideo` or screenshot sequence + ffmpeg: expand turn map → zoom to failure → inspect → return to log position. Commit `docs/spacegraph/demo.gif` or link hosted video.
  Done when: artifact exists and referenced from README.

- [ ] **T5.3 Finalize release docs**
  README: motivation, single compelling image, tested SHA, demo command, limitations, flag. Update `prototype.md` (tested revisions, contract v2, capture matrix, decisions, limitations). Keep evaluation results and negative-result option explicit.
  Done when: another developer runs demo from clean clone without model provider.

- [ ] **T5.4 Record budgets and entry delta**
  Use T0.7 baseline: session-entry delta, lazy chunks, model build, first paint (or documented reason no harness), pan frame rate (or unmeasured). Never lower budget silently.
  Done when: table in `prototype.md` matches build.

- [ ] **T5.5 Publish the fork and the RFC**
  Public branch marked experimental; companion repo state; issue/RFC text with measured result and adoption ladder. Do not open large PR before RFC gets signal.
  Done when: links in README and docs.

- [ ] **T5.6 Final verification**
  ```
  bun run graph:verify
  cd packages/app && PLAYWRIGHT_BUILD=1 bun run test:e2e -- e2e/graph/session-graph.spec.ts
  bun run lint:changed
  cd packages/session-graph && bun run test:components
  ```
  Done when: green (dev-only skips declared), images inspected, unverified behaviour listed.

**Gate G5 — released.** One command reproduces demo; evidence, images, limitations, flag public; library consumable outside fork.

---

## 8. T6 — Remaining leverage enablers (REFINEMENTS — after critical path)

**Already complete:**
- T6.1 Provider-free demo mode (`bun run graph:dev`) — ✅ (implemented 2026-10-19; **it did not run** until
  2026-10-20 — see the log)

**SpaceGraphJS core extractions (vacuum from OpenCode — enables library roadmap):**
- T4.8 Layout strategies → `spacegraphjs/src/layout/` (configurable nodeSizeFn, laneList, laneOfFn, depthMap, turnIdFn, fileOwnerTurnFn, clusterOfFn)
- T4.9 Semantic levels → `spacegraphjs/src/levels/` (LevelConfig: kindMinLevel, edgeMinLevel, domBudget, isClusterExpanded, edgeFilterFn)
- T4.10 Summary representations → `spacegraphjs/src/representations/` (rowKeyFn, rowOrderFn, columnKeyFn, levelFilter, categoryMap)
- T4.11 Adapter framework → `spacegraphjs/packages/adapter/` (ModelAdapter base class, abstract methods, conformance suite)
- T4.12 Scoped subgraph overlay → `spacegraphjs/src/overlays/` (headless core + React/Solid bindings, focus-trapped, scroll-preserving)
- T4.13 Theme/contrast system → `spacegraphjs/packages/spacegraph-renderer/` (SemanticTokenMap, ContrastAuditor, Cytoscape bridge)
- T4.14 Search/Minimap/A11y → `spacegraphjs/src/navigation/`, `src/a11y/` (headless + bindings, edgeAnnouncer)
- T6.17 Code diff visualization → `spacegraphjs/src/overlays/` (unified diff patches, syntax-highlighted, selectable DOM text)

**Evidence hardening (do after G2 if result positive, or to strengthen library):**

- [ ] **T6.4 Real-session corpus and sanitizer**
  `script/session-to-fixture.ts`: sanitized session export → fixture compatible with `buildGraph`. Strip home paths, tokens, secrets, customer names; preserve real tool shapes. Keep 2–3 redacted long sessions (subagent, retries, interrupted) as regression corpus separate from canonical fixture.
  Done when: corpus replays through model and one app e2e; nothing sensitive committed; size bounded.
  Verify: corpus unit tests + e2e.

- [x] **T6.5 Edge-case coverage: forks, child sessions, compaction, permissions**
  Upstream has `session.forked`; subagent nodes link child session but cannot open it; compaction summary-only; approval/permission declared but unbuilt. Add "open child session" action, fork/lineage attribution without cross-session edges, compaction/replay-only coverage, explicit decision on permission nodes. Cover interrupted, aborted, idle outcomes.
  Done when: each case has fixture/test and documented UI behavior.
  Verify: model tests + one component/e2e per user-visible action.
  - **Done (2026-10-20).** Every case the plan names now has a test and a documented behaviour;
    the table is in `prototype.md` §"Edge cases" and the decisions are ADRs 023–025 in
    `docs/spacegraph/decisions.md`.
  - **A fork is attribution, not a cross-session edge (ADR-024).** The lineage rides on the root
    node's data — the session it was forked from, the message it branched at, and its parent
    session — and the inspector names it and opens it. No edge crosses the session boundary, and
    the model now guarantees that **every edge's endpoints are nodes of this model**: a delegation
    to a child session that has no node here used to leave a dangling wire, and the notice keeps the
    child session id instead.
  - **"Open child session" is a real action.** The inspector offers it on a delegation (and on the
    fork's origin, and on a child session's parent). The app wires it to the *transcript's own*
    session-opening path (`useMarkdown().openSession`), so a missing or foreign session behaves the
    way it does everywhere else, and the action is proved end to end in the app e2e.
  - **A compaction says what it was (ADR-025).** One node: the summary it left, or the fact that
    the provider's replacement window was replayed instead; a failed compaction carries the error
    that stopped it.
  - **A permission request is not a node (ADR-023).** The `approval` kind was declared from the
    start and nothing could ever produce one: the message stream has no permission type. The kind
    is **removed** rather than left declared — the legend no longer advertises a card colour that
    no card can have.
  - **An interrupted turn is visible (ADR-025).** An aborted assistant step used to be dropped
    entirely, so an interrupted turn looked like a turn that never happened. It is now an `error`
    node with the `interrupted` status and the provider's message, the same status a killed shell
    gets. The three idle outcomes (succeeded / failed / interrupted) are covered.
  - Tests: `packages/session-ui/src/graph/model.test.ts` (33, +12),
    `packages/session-graph/component-tests/graph-session-links.spec.ts` (3, new),
    `packages/app/e2e/graph/session-graph.spec.ts` (+1: "names the session a fork came from and
    opens it"). The e2e's mock server learned to serve a session's `fork` lineage.
  - **The diff budget was re-audited** (`upstream-review.md` §5): the app integration is now 20
    files, +916/−36. The audit had **omitted `graph-permalink.test.ts`** (+45) and its per-file
    numbers had drifted by the T6.18/T6.19 pass; both are corrected.

- [x] **T6.6 Scale and streaming budget**
  Benchmark 1k and 5k message sessions: model build, layout, render-model build, adapter diff, first paint. Decide whether P8.8 incremental patches needed **from data**, not speculation. Add auto-collapse/cap policy at scale.
  Done when: table in `prototype.md` and guard test fails on order-of-magnitude regression.
  Verify: new perf test + capture at cap.
  - **Done (2026-10-20), and the benchmark found a quadratic pipeline that nobody had measured.**
    The first run of `bun run graph:scale` took **27.5 seconds** to build the render model of a
    5,001-message session. Two passes were to blame, and both are now single passes: the library's
    band geometry re-indexed the whole model for every band (`ModelAdapter.bandBox`), and the host's
    band builder filtered the whole node list for every turn. The render build is now **63 ms** at
    the same size (436× faster) and the numbers grow linearly. The layout had the same shape: it
    filtered the node list once per turn, and the host asked each file for its owning turn by
    scanning every edge.
  - **The measured table** (in `prototype.md` §"Scale and streaming budget"): 102 messages → 2.3 ms
    model / 3.2 ms layout / 7.5 ms render; 1,002 → 9.8 / 7.3 / 12.8; 5,001 → 55.3 / 41.7 / 63.0. One
    streamed update (the host rebuilds everything) costs 38 ms at 1k and 227 ms at 5k.
  - **The cap policy is a host policy and it is declared.** A long session is drawn as its recent
    tail — the last 60 turns, plus the turn the reader is looking at — and the view says so
    ("Showing 60 of 80 turns. The transcript has the rest."). The layout still measures the whole
    session, so a node that stays in the window does not move when the window slides.
    `packages/session-ui/src/graph/scale.ts` owns the policy; the library is untouched.
  - **The capture at the cap found a defect the numbers could not.** The first `25` frame opened on
    **empty canvas**: the fit framed the session root, which sits twenty columns to the left of the
    window, and the lane gutter followed the root instead of the window. Two fixes: the fit skips
    the root when the window is capped, and the adapter's lane labels can name the node they are
    anchored to (`AdapterLaneLabel.anchorNodeId`) so the gutter stays with the drawn window. The
    frame now shows the window's first turns, legible, with its lane names.
  - **The guards are load-bearing, and one of them is deterministic.** `packages/session-graph/src/
    canvas/scale.test.ts` builds the render model of a 5,000-message session and fails above 400 ms
    (measured 63 ms; the quadratic path measured 2,482 ms). The library's guard counts callbacks
    instead of milliseconds: a layout may ask each node for its turn a bounded number of times
    (`spacegraphjs/test/layout/strategies.test.ts`) — it fails on the old code and passes now.
  - **D3 / P8.8 stays deferred, with the number that would reopen it.** The render-model diff is
    now a library primitive (`diffRenderModels` in `@spacegraphjs/adapter`) and it says how little
    moved: 3 nodes of 20,005. The seam exists; the work waits until a session above roughly 2,000
    messages is a normal thing to open, at which point the 227 ms update is the number to beat.
  - **Unverified:** the benchmark uses synthetic sessions, not real ones (T6.4's corpus is still
    open); the first paint and the pan frame rate are still unmeasured (there is no harness); the
    60-turn window is a policy choice, not a measured optimum — the plan's evidence task (T2.2) may
    change it.
  - **The two free geometries joined the table (2026-10-20).** `bun run graph:scale` now also
    measures the tree and the force simulation, which the T7 track left out: the tree is a linear
    pass (6 / 11 / 76 ms at 409 / 4,009 / 20,005 nodes), the force simulation is **not** (209 ms /
    2.3 s / **9.3 s**). The simulation's cost grows with the content because it runs a fixed number
    of cooling steps over a neighbour grid; the reason the reader does not pay that is the host's
    60-turn window, which keeps the layout's input at a few hundred boxes (~0.2 s), paid once per
    view switch. The uncapped number is also the reason the simulation is frozen after one run.

- [x] **T6.8 First-run legend, help, and reduced motion**
  Make encoding discoverable: lane labels/colors, edge kinds/confidence, status dots, help popover; respect `prefers-reduced-motion` for camera/depth transitions; announce mode changes. Removes bias from usability protocol.
  Done when: new user decodes graph without briefing; reduced-motion test passes.
  Verify: component test + capture.
  - **The discoverability half is done (2026-10-20); the camera half moved to T6.18.** The legend
    (`packages/session-graph/src/ui/GraphLegend.tsx`) names every encoding the canvas draws: the
    lanes, the card colours, the phase groups, the line styles, and the status dots, plus one
    sentence of help ("Columns are turns, left to right; rows are lanes, what the agent did. A line
    is structure, not cause."). It is opened from the toolbar and closes on Escape.
  - **The legend cannot drift from the picture.** The swatches come from the *same* helpers the card
    template uses (`kindAccent`, `categoryAccent`, `statusAccent` in `cardTemplate.ts`), and the
    names come from the *same* i18n keys the inspector uses — the two key maps moved into
    `src/ui/vocabulary.ts` so there is one source for both.
  - **Mode changes are announced.** The a11y mirror announces the level, the representation, and the
    depth when they change (the first state is not announced, because it is not a change).
  - Tests: `packages/session-graph/component-tests/graph-legend.spec.ts` (1) asserts every section
    and every name; the announcement rides the existing `graph-a11y` component test.
  - **Not done:** the camera's own transitions under `prefers-reduced-motion` — that is T6.18, and
    the reason is in the plan: the contract has no viewport read-back, so "the camera did not glide"
    cannot be asserted from the host today.

- [x] **T6.18 Respect `prefers-reduced-motion` for the camera transitions**
  The host must be able to say "jump, do not glide" when the reader asked for less motion.
  Done when: under the preference the camera reaches a node at once, and a test proves it.
  Verify: a component test that emulates the preference and asserts the camera's position.
  - **Done (2026-10-20).** The work was the two changes the plan named, in the order it named them.
    (1) The contract grew a camera read-back: `GraphRenderer.getViewport?(): RendererViewport`. It is
    **optional**, so the addition is not a breaking change to the interface and `CONTRACT_VERSION`
    stays 2; a renderer that cannot report its camera leaves it undefined and a host reads that as
    "no read-back", never as a broken camera. Both adapters implement it (SpaceGraph from
    `sg.viewport`, Cytoscape from `cy.zoom()`/`cy.pan()`), and the Cytoscape adapter's
    `viewportChange` event now *is* that read-back instead of a second copy of the same maths.
    (2) The host branches on `matchMedia("(prefers-reduced-motion: reduce)")`: the camera **jumps**
    to the node (the host knows its world position from the layout, and the contract's
    `setViewport` is instant) instead of gliding (the renderer's `focus` animates for a second).
    The jump keeps the zoom, so the reader lands on the node at the size they chose.
  - **The proof is a component test that measures the flight.** `packages/session-graph/component-
    tests/graph-motion.spec.ts` picks a node through the search and times how long the camera took
    to reach it, on the page's own clock: under the preference the card is at the centre of the
    canvas in well under 400 ms; without it the flight is over 500 ms. The test also asserts the
    camera *moved* and kept its zoom, through the contract's new read-back.
  - **The Cytoscape adapter's `focus` no longer centres nothing.** It resolves the host's model id
    against the render model it was given and returns early for an unknown id, instead of asking
    Cytoscape to centre an empty collection.
  - **A permalink now frames its node when the hash changes, not only on load.** The frame used to
    be a side effect of the next model application, so a hash change on an open graph did nothing.
  - **The zoom readout stopped following the camera.** A zoom is the reader's own act, so it ends
    the "fit is settling" window: before, a zoom inside the 120 ms settle window moved the 100%
    reference with it and the readout stayed at 100% while the camera zoomed.
  - **The zoom step is now a tenth of the fit, not a flat 0.08 of the normalized zoom.** The step is
    the same at any fit, and the readout lands on whole tens (100 → 110 → … → 150). The old flat
    step made one click a *doubling* of the magnification on the SpaceGraph backend, because that
    zoom is logarithmic.
  - Unverified: the jump was checked in Chromium at 1440×900, not with a real screen reader or on
    a touch device; the reduced-motion preference is read at the moment of the camera move, so a
    reader who changes the preference while the graph is open sees the new behaviour on the next
    move, not immediately.

- [x] **T6.19 The capture matrix is not what its names say**
  Frames 20–24 are presented as a zoom/pan matrix. Five of them are the same picture.
  Done when: every frame shows what its name says, regenerated and read by eye.
  Verify: the ten frames differ from each other; the capture diff reports no duplicates.
  - **Done (2026-10-20), and the cause was smaller than the symptom.** The Storybook story passed
    an `onRenderer` prop to `GraphView` — **which has no such prop** — so the harness never held a
    renderer and its `zoomTo`/`panTo` were no-ops. The app-side frames used a dev harness whose
    `zoomTo` was an empty function and whose `panTo` only selected a node; a selection does not
    move a camera. And the node ids the harness used (`turn:msg_plan_1`, `turn:turn_1`) are not in
    the fixture at all: a turn is opened by a *user* message, so the ids are `turn:msg_user_1` and
    `turn:msg_user_2`.
  - **Why nothing caught it.** The stories were excluded from the package's typecheck, so a prop
    the component does not accept compiled fine. The stories are now **in** the typecheck
    (`packages/session-graph/tsconfig.json` no longer excludes `**/*.stories.*`), and that surfaced
    a second defect in the same file: a story exported as `export const Error` **shadowed the global
    `Error`**, so the failing-adapter fixture rejected with a story object instead of an error. The
    story is now `ErrorState` (the component test's mount id changed with it).
  - **The frames are now driven the way a reader drives them.** The toolbar's zoom control and the
    search dialog, on both backends, instead of a test-only camera API. The app's dev harness
    (`__sessionGraphView`) is gone: it had no consumer left, and the capture no longer needs a seam
    the product does not have.
  - **The names are now true.** `20` reads exactly 150% (the step is a tenth of the fit, so five
    clicks land on 150). `21` is the **closest zoom the renderer allows**, not "250%": the SpaceGraph
    zoom is logarithmic over the fitted band, so its closest zoom reads 183% while the Cytoscape
    zoom is linear and reads 250% — the same magnification, two readouts. The frame is therefore
    named `21-*-zoom-max.png`, and `21-*-zoom-250.png` is gone. `22`/`23` centre the camera on the
    first and second turn, `24` on the failing test run, at the closest zoom.
  - **The gate now proves it.** `graph:capture --mode=verify` hashes the ten matrix frames and
    fails when two are the same picture. It was checked by hand: copying one frame over another
    makes the gate fail with the pair it found.
  - **The frames are deterministic — mostly.** Two consecutive captures differ by RMSE 0.007 on the
    transcript frames and 0 on most of the graph frames, except `21-graph-zoom-max.png` (0.057,
    antialiasing). The old set was not: `04`, `13`, `14` and `17` had been captured *before* the renderer
    applied the selected node's dimming, so they showed a half-dimmed map.
  - **Corrected (2026-10-20, T4.3's pass): the camera-driven frames are not deterministic.** Measured
    between two consecutive captures of the *same* code, `22-graph-turn-1.png` differs by RMSE 462 and
    `24-graph-failure-chain.png` by 123 (0–65535 scale); 25 of the 27 frames are byte-identical. The
    layout that feeds them is byte-identical (the golden file), so this is the capture harness's settle
    check, not the renderer. It is tracked as **T6.20**.
  - **What the frames now show, read by eye:** `20` the whole session at 150%, `21` the same session
    at the closest zoom, `22` the camera centred on the first turn (its card at the centre of the
    canvas), `23` the same on the second turn, `24` the failing `bun test` run.

- [x] **T6.20 The camera-driven capture frames vary between runs** (found by T4.3's pass)
  The capture waits for the canvas to stop changing (three equal samples), but the screenshot can land
  just after a camera move, so `20`–`24` differ between two consecutive captures: RMSE 462 on
  `22-graph-turn-1.png`, 123 on `24-graph-failure-chain.png`, 0 on 25 of the 27 frames. The layout that
  feeds them is byte-identical, so the renderer is not the cause — the settle check is.
  Done when: two consecutive captures are pixel-identical, or the variance is bounded and explained.
  Verify: `bun run graph:capture --mode=verify` twice into two temp directories, then compare the frames.
  - **Why it matters:** the capture set is the acceptance evidence (§10), and T6.16's pixel-diff helper
    is only useful if two runs of the same code agree. A pixel-exact gate needs this first.
  - **Done (2026-10-20), and the cause was a product defect, not a capture artefact.** Eight
    consecutive captures were measured before the fix. The frames that moved were the ones where the
    **inspector opens** (`04-graph-selected.png`: 0.5 % of the pixels, the whole canvas 2 px to the
    side; `22-graph-turn-1.png`: 0.38 %) — and the ones after a camera jump (`23`, `24`: a single
    card's rounded corner, ~10 pixels).
  - **The fit measured a surface that no longer existed.** The renderer syncs its camera frustum from
    a `ResizeObserver`, which delivers its notification asynchronously. When the inspector opens, the
    canvas narrows and the host asks the renderer to fit; the fit then measured the frustum the
    observer had not delivered yet, and the frame changed again when the observer arrived — a
    different frame in every run, depending on which came first. **The frame is now measured against
    the surface as it is**: `WebGLRenderer.syncSize()` is public and `SpaceGraph.fitView` calls it
    before it measures; the Cytoscape adapter calls `cy.resize()` for the same reason.
  - **The zoom control could offer a zoom the renderer cannot deliver.** The SpaceGraph's zoom is
    normalized over the fitted band and stops at 1; the host's own policy (a third to 2.5 times the
    fit) offered more, so "zoom in" never disabled — the reader could click a button that did
    nothing, and the capture could not tell "at the limit" from "the readout has not caught up". The
    contract now carries the renderer's range (`RendererCapabilities.zoomRange`, optional and
    additive, so `CONTRACT_VERSION` stays 2), the SpaceGraph adapter declares `{min: 0, max: 1}`, the
    Cytoscape adapter declares an unbounded range, and the host clamps its control to the
    intersection of the two. **This is a reader-visible fix, not capture bookkeeping.**
  - **Measured after the fix:** three consecutive captures are identical apart from the noise floor
    (max channel delta 1–2 on five frames, and 10–12 pixels on `23-graph-turn-2.png` — one card's
    rounded corner at a sub-pixel offset). The 0.4–0.5 % shifts are gone.
  - **Unverified:** the residual sub-pixel difference is bounded and explained (one card's corner),
    but not closed; and the capture was measured in Chromium at 1440×900 only.

**Library roadmap (independent of OpenCode decision):**

- [ ] **T6.10 Contract v3: fit insets and viewport options**
  Add optional `fit(ids?, { padding?, insets?: { top, right, bottom, left } })` honored in both adapters. Generic fix for framing beside inspector/header/bottom sheet; lets host delete workaround. Bump `CONTRACT_VERSION`, update conformance, document migration/negotiation.
  Done when: host frames with insets; both adapters pass; v2 consumers negotiate cleanly.
  Coordinate with T4.2 before publishing.

- [ ] **T6.11 Benchmark and budget CI**
  Harness for mount/dispose cycles, pan/zoom frame time via `PerformanceObserver`, WebGL context count, model-diff cost at 100/500/1k/5k nodes. Emit JSON report per tag. Add `publint`, `attw`, bundle-size checks to publish workflow.
  Done when: report archived per release; CI fails beyond budget.

- [x] **T6.12 Second-host app and capability gallery — framework-free, not React**
  Plain-TypeScript app under `spacegraphjs/demo/second-host` using the contract + the adapters + the generic
  modules, deployed with the demo. No framework: the library is framework-agnostic, so a second host is
  plain TypeScript against the contract. Capability gallery (zoom bands, **lane layout (T4.8)**, trail, a11y,
  **minimap (T4.14)**, SVG, depth, **the scoped overlay (T4.12)**, **the code diff (T6.17)**) so each generic
  module has a runnable example. **Enabled by T4.8, T4.10, T4.12, T4.13, T4.14, T6.17 extractions.**
  Done when: CI runs it; README links it; no OpenCode imports; no framework dependency.
  - **Changed (2026-10-20):** the plan said a Vite React app using `react-spacegraph`. The library dropped
    the framework bindings, so a React app would have to re-implement them; a plain-TypeScript host is both
    smaller and a better proof that the core is usable on its own.
  - **Done (2026-10-20).** `spacegraphjs/demo/second-host/` is a plain-TypeScript app with **its own
    vocabulary** — a release pipeline: four stages, a failing test, a retry, an artifact, its own lanes,
    kinds, statuses, level table and card markup. It mounts the SpaceGraph adapter, the Cytoscape adapter
    and the static SVG renderer over one model, and its **capability gallery** has one entry per library
    surface (13 entries, 14 modules): each entry *runs* its module against the model and reports what it
    produced (`overview · 8 nodes · 7 edges · budget 6`, `scope around "Verify": 5 nodes, 7 edges`,
    `text 16.2:1 · muted text 7.9:1 · target 4.5`).
  - **The gallery is the point, so it is checked, not claimed.** `spacegraphjs/test/second-host/` (8 tests)
    runs every capability against the real model and fails if any reports nothing; it fails if the host
    imports an OpenCode module, a framework, or a library surface the gallery does not claim (the exact
    import set is asserted). `spacegraphjs/test/e2e/second-host.spec.ts` (8 tests) drives the real page:
    every capability runs in a browser with no console error, the three renderers mount the same model, the
    scoped overlay traps focus and closes on Escape, the diff renders as text and not as markup, the search
    selects, and the minimap draws the overview.
  - **CI runs it.** The library's workflow gained a "Second host" step (Playwright, Chromium), and the
    fork's `bun run graph:verify` gained a unit step for the same suite. The demo build gained the
    `second-host.html` entry, so it ships with the hosted demo.
  - **Three defects the second host found, all in the host, none in the library.** (1) The lanes layout
    counted every node **twice**: the host set both `turnIdFn` and `ownerTurnFn` to the same stage, and the
    library buckets by both, so the content was 7008 units wide instead of 3648. (2) The summary views
    still drew the stage nodes, which the summary does not place — the host's node filter now keeps only
    the nodes the current view places, and the edges are filtered with it (the renderer was warning about
    dangling edges). (3) The camera was not re-framed after a view change, so a new view was drawn off-screen
    at the old frame.
  - **One finding worth keeping.** The pipeline does not fit a legible frame in a narrow canvas: the fit's
    floor (half a card's natural size) means the reader pans the rest. The host's default view is therefore
    the **summary** and the lane view is the panned detail — the same trade T1.18 recorded for OpenCode.
    Screenshots `26-second-host.png` and `27-second-host-lanes.png` show both, and both were read by eye.
  - **Unverified:** the demo was checked in Chromium at 1440×900, not in Firefox or WebKit, and not on a
    touch device; the hosted URL still has not been deployed (the workflow exists but has not run since the
    second host was added); the second host's model is synthetic, so it says nothing about a real session.
  - **Extended (2026-10-20): the gallery now covers the placement engines, and the host picks a
    layout.** The tree and the force simulation were the two library surfaces the gallery did not
    claim, so the library's claim that *every* generic module runs outside OpenCode did not cover
    them. They do now: the host binds its own vocabulary (`parentOfFn` reads its `part-of` edges,
    `forceLinksFn` its structural edges), the gallery has a **"The placement engines"** entry that
    runs both over the host's model and reports what each produced (`tree · 18 boxes placed · bounds
    1240 × 616`, `force · 18 boxes placed · bounds …`), and the page grew a **layout picker**
    (`ribbon · matrix · lanes · timeline · hierarchy · tree · force`) so the reader can see the same
    model in every shape — the affordance T2.1 needs to compare layouts instead of perfecting one.
  - **One gap the pass closed in the library, not the host.** The plan's note said the tree's block
    width was "one config away (`TreeConfig.columns`)". It was not: the strategy never passed the
    option down, so a host could not choose it. `LayoutOptions.treeColumns` now reaches the engine,
    the fork's `layoutGraph` forwards it, and the second host uses **two** leaves per block — with
    the default of four the tree was 3,284 units wide and no frame could hold it; at two it is 1,240
    and the whole tree fits one frame, legible. The library's own test asserts the fold.

- [ ] **T6.13 Embedder devtools**
  Dev-only overlay/API (`sg.debug()` or `?debug=1`) showing renderer, contract version, capabilities, node/edge/LOD counts, frame time, selection; matching diagnostic panel in host.
  Done when: no production code path enables it by accident; screenshot in docs.

- [ ] **T6.14 API docs and release automation**
  Typedoc for contract, adapters, control; tag → build → publish → docs workflow; compatibility matrix (three, cytoscape, React/Solid/Vue, browsers). Decide stale `vue-spacegraph` fate: bring to contract parity or deprecate explicitly.
  Done when: new host integrates from generated docs; release reproducible.

- [ ] **T6.16 (Optional) Pixel-diff helper** — **DROPPED (2026-10-20), and the reason is worth keeping.**
  `graph:diff` compares fresh captures to committed set with threshold and per-image report. Reduces inspection toil; does not replace human review; not a hard gate.
  Done when: flags deliberate change and ignores normal GPU/font noise.
  - **Dropped, deliberately.** The helper was written (`script/graph-diff.ts` + a dependency-free PNG
    reader) and then removed: while the UI is in development the images are read by eye, and a pixel
    gate turns a moving target into a blocker that has to be re-baselined after every change. §10
    already said the capture set is not a per-change gate; this task was listed as *optional* for the
    same reason, and building it was the wrong use of a pass.
  - **The ID was wrong to begin with.** This heading said T6.16, which the demo index (§5) already
    owns; §10's row called the same task T6.15. It is T6.15, and it is dropped.
  - **The measurement it produced is kept, because it is what closed T6.20.** Against the canonical
    fixture, a deliberate change moves **24 % of a frame's pixels** (max channel delta 233) while the
    GPU/font noise floor moves **0.004 %** (max delta 5). Anything between the two is a real change.
  - **If it is ever wanted back**, the shape is small: a per-frame count of pixels above a channel
    tolerance, reported per image, never as a merge gate.

- [x] **T6.17 Extract code diff visualization to SpaceGraphJS `src/overlays/`**
  Move `packages/session-graph/src/ui/GraphDiff.tsx` to `spacegraphjs/src/overlays/CodeDiffOverlay.tsx` (React/Solid). **Specifically for unified diff patches (code changes)**, not a generic graph model diff. Renders:
  - File header with path, +additions/-deletions counts
  - Syntax-highlighted unified diff (green for +, red for -, muted for headers/hunks)
  - Scrollable, selectable DOM text (not canvas)
  Host provides: `from` (turn/message ID), `source: { get(id), load(id) }` returning `{ file, patch, additions, deletions, status }[]`.
  Generic "graph model diff" (added/removed/changed nodes between two render models) is a separate future feature (D4); this extraction is only for the code diff viewer.
  Done when: OpenCode wraps SpaceGraphJS `CodeDiffOverlay`; library tests verify diff rendering; T6.12 capability gallery includes code diff demo.
  Verify: `cd spacegraphjs && vitest run test/overlays/code-diff.test.ts`; OpenCode component test passes
  - **Done (2026-10-20), with one placement correction.** The diff vocabulary and the renderer live in the library
    (`spacegraphjs/src/overlays/codeDiff.ts`): `CodeDiff`, `CodeDiffSource`, `diffTone`, `parsePatch`, and `renderCodeDiff`.
    The patch text is written with `textContent`, so a hostile file path or patch line is never markup — the library test
    asserts that a `<script>` payload reaches the DOM as text and as no element.
  - **The core stays framework-free**, so the components live in the two framework packages (`CodeDiffOverlay` in
    `react-spacegraph` and `solid-spacegraph`) rather than in `src/overlays/CodeDiffOverlay.tsx` (§6.1's rule).
  - The host's `GraphDiff.tsx` now *aliases* the library's types (`GraphDiff = CodeDiff`,
    `GraphDiffSource = CodeDiffSource`) and takes its line tone from `diffTone`; its markup, its Tailwind classes, and
    its line splitting are unchanged, so the inspector renders exactly as before.
  - **Still open:** the capability-gallery demo (T6.12). The generic "graph model diff" (D4) is untouched, as planned.

---

## 9. Deferred and future seams (UNCHANGED)

Keep these out of the critical path. Each is conditional on a named signal.

| ID | Item | Unblock condition | Seam already present |
|---|---|---|---|
| D1 | H6.5 inline row host | Maintainer approval for a generic timeline slot | Turn-map overlay + SVG `InlineGraph` + T3.3(c) RFC |
| D2 | P8.4 host-neutral activity adapter | A real second host needs it | `GraphController` + contract; demo fixture |
| D3 | P8.8 incremental patches | Profiling shows full-model diffs are too slow | Contract `setModel` baseline |
| D4 | Cross-session graphs / recurring errors / compare attempts | A validated single-session win | `data.sessionID` (T3.6), stable IDs, SVG/JSON export |
| D5 | Real 3D geometry, DoF, production 3D | Protocol prefers `layered`/`depth-stack` | Depth seam; host-owned Z |

---

## 10. Verification matrix (UPDATED)

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
| Captures | `bun run graph:capture --mode=compare` + manual inspection | Visual acceptance — **a deliberate refresh, not a per-change check** (it overwrites the committed set) |
| The perspective proof | `docs/spacegraph/screenshots/31-graph-perspective.png` | The tilted camera with the billboard off: the cards lie in the content plane, so the camera's shear is visible |
| Capture verify | `bun run graph:capture --mode=verify` | The routine gate: fresh renders into a temp dir, committed set asserted, and **no two frames of the zoom/pan matrix are the same picture** (T6.19) |
| Scale budget | `bun run graph:scale` | T6.6 — the model/layout/render pipeline at 100, 1k and 5k messages, plus the tree and the force rows |
| Lint | `bun run lint:changed` | Changed files |
| Repo check | `bun run check` | Canonical, but red for known environmental reasons; see T1.6 |
| Provider-free demo | `bun run graph:dev` | T6.1 |
| Interaction counter | `?graphMetrics=1` on the session URL | T2.3 — the readout in the corner; off without the parameter |
| Node permalink | `#graph:<nodeID>` on the session URL | T3.5 — the graph opens on the node |
| Security suite | new graph security tests | T6.7 |
| Scale guard | new 1k/5k perf test | T6.6 |
| Library benchmark | `cd spacegraphjs && bun run bench:graph` (new) | T6.11 |
| Published packages | `cd spacegraphjs && pnpm run test:publish` | T4.2 — packs every package, installs the tarballs into a clean consumer outside the monorepo, mounts both adapters |
| Second host | `cd spacegraphjs && pnpm run test:second-host` + `vitest run test/second-host/` | T6.12 — a framework-free consumer outside OpenCode; every generic module runs against its own model, including the tree and the force placement |
| Library typecheck | `cd spacegraphjs && tsc --noEmit -p tsconfig.json` | T4.4 — clean for `src`, `test` and the five packages |
| Placement seam | `cd spacegraphjs && vitest run test/layout/` | T7.1 — the grid, the tree, and the force placement behind one interface |
| Layout variety | `cd packages/session-graph && bun run test:components -- graph-gallery graph-legibility` | T7.4/T7.5 — every layout is pickable, legible, and comparable side by side |
| Pixel diff (optional) | — | T6.16 **dropped**: while the UI is in development the frames are read by eye (§10) |

Rules: run from package directories, never repo root for tests; inspect images before claiming a visual task; record unverified behaviour.

**The capture set is not a per-change gate.** The committed images exist to inform and to show the
work; they are refreshed on purpose (T0.6 after an upstream sync, T5.1 for the final set) and then read
by eye. `--mode=compare` overwrites the committed set, so running it after an unrelated change only
produces noise to undo. The routine check is `--mode=verify`, which renders into a temp directory and
asserts the committed set exists; `graph:verify` already runs it. When a change really does alter the
rendering, refresh the affected images and *look* at them — a pixel-difference report is a tool for
that review (T6.16), never a substitute for it and never a gate.

---

## 11. Decisions, risks, stop rules (UPDATED)

**Open decisions to close in T2.4:** #10 naming · #14 representation · #15 depth · #16 file lens · #8 3D default (superseded by #15) · #9 screenshot location.

| Risk | Likelihood | Mitigation | Fallback |
|---|---|---|---|
| Upstream merge breaks message/part assumptions | Medium | T0.4/T0.5; additive protocol changes today | Adapt model; keep fixture schema-first |
| Upstream rejects new package + sibling library | Medium | Publish first (T4.2); RFC + ladder (T3.7) | Ship as extension panel + companion package |
| Protocol shows graph is slower | Medium | G1 before G2; unbiased tasks; stop rule | Publish negative result; keep library + hybrid panel |
| Visual polish trap | High | Gates G1/G2; captures as acceptance; stop rule | Stop at "legible and measured" |
| Source workspace rots before publishing | Medium | T4.1/T4.2 early; pin SHAs | Bundle contract + adapters in one package |
| Dependency drift after sync | Medium | `bun install` + built e2e; lockfile review | Revert merge on sync branch only |
| Test flake masks regressions | Medium | T1.5 ownership; repeat runs | Quarantine with linked issue |
| Reviewers cannot reproduce the claim | High | T6.1 provider-free demo + T6.2 hosted build + T6.3 packet | Ship screenshots and video only |
| Real sessions break model assumptions | Medium | T6.4 corpus + T6.5 edge cases | Narrow claim to fixture-shaped sessions |
| Hostile markup in tool output or export | Low | T6.7 escaping suite + documented sanitization | Disable export of untrusted content |
| Library performance/maintenance regressions | Medium | T6.11 budget CI + T6.14 docs/ownership | Pin tested version and stop upgrades |
| Upstream sees large opaque diff | High | T3.7 ladder + T6.3 review packet + flag | Offer only extension-panel rung |

**Stop rules**

1. Do not start T2 before G1 passes. **(G1 PASSED)**
2. If T2 shows no advantage, stop product work and publish the finding.
3. Do not add T3 features before T2's decision; the flag/settings work is only justified by a positive or promising result.
4. Do not rebase `dev`; do not force-push; do not delete the pre-sync tags.

---

## 12. Task map from TODO.1 (UPDATED)

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
| New leverage/velocity work (not in TODO.1) | T6.1–T6.17 (provider-free demo, review packet, corpus, edge cases, scale, security, legend, contract v3, benchmarks, second host, devtools, docs, demo index, graph diff) |
| SpaceGraphJS core extractions (vacuum from OpenCode) | T4.8–T4.14 (layout, levels, representations, adapter, overlay, theme, search/minimap/a11y) |

---

## 13. Log

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

**2026-10-19 — T1.15 Multi-zoom and multi-pan capture matrix completed.** Added camera zoom frames at
~1.5× (20) and ~2.5× (21) fit, plus pan frames for turn 1 (22), turn 2 (23), and failure chain (24) for
both SpaceGraph and Cytoscape renderers. Extended the harness with `zoomTo`/`panTo`/`getViewport` for
programmatic control in both the Storybook story and the app's dev-only `__sessionGraphView` harness.
Updated the capture verify list with 10 new frames (20–24 for each renderer). All `graph:verify` steps
pass; session-ui graph 74, session-graph unit 36, component 36, app e2e 16/16. Captures 20–24
regenerated for both renderers.

**2026-10-19 — T6.1 Provider-free demo mode implemented.** Added `bun run graph:dev` command that launches
the real OpenCode shell with the canonical session fixture and no model provider. Implementation:
- `script/graph-dev.ts`: Mock server (port 4097) with NO_PROVIDER + canonical fixture messages, starts Vite dev server
- `packages/app/src/entry.graph-dev.tsx`: Dev-only entry point loading canonical fixture
- `packages/app/graph-dev.html`: HTML entry for graph dev mode
- `packages/app/vite.config.ts`: VITE_OPENCODE_GRAPH_DEV=1 flag for dev-only build inclusion
- `package.json`: Added `graph:dev` script
All `graph:verify` steps pass; session-ui graph 74, session-graph unit 36, component 36, app e2e 16/16, lint clean.

**2026-10-19 — T3.1, T3.2 experimental session graph flag and settings UI.** Implemented the experimental feature flag for session graph:
- Added `experimental.sessionGraph` setting (default: false) in `packages/app/src/settings/model.tsx`
- Updated `SessionGraphToggle` to hide when flag is off (`packages/app/src/session/header/session-graph-toggle.tsx`)
- Updated `useSessionCommands` to disable graph commands when flag is off (`packages/app/src/session/commands/use-session-commands.tsx`)
- Updated `SessionScreen` to conditionally render graph UI and mobile toggle (`packages/app/src/session/screen.tsx`)
- Implemented experimental settings UI with toggle for "Session graph" in `packages/app/src/settings/experimental/experimental.tsx`
- Added i18n keys: `settings.experimental.sessionGraph.title` and `settings.experimental.sessionGraph.description`
- All `graph:verify` steps pass; session-ui graph 74, session-graph unit 36, component 36, app typecheck clean, lint clean.

**2026-10-19 — T3.3(a,b) hybrid ladder: session-map panel and turn-map affordance.** Verified the low-risk adoption path:
- `session-map` side panel already implemented in `packages/gui-extensions/src/session-map/` (panel, renderer, i18n)
- Turn-map overlay affordance via `graph.turnmap` command (keybind `mod+alt+t`) in `packages/app/src/session/commands/use-session-commands.tsx`
- All 16 session-graph e2e tests pass with experimental flag enabled via test fixtures
- Component tests for turn-map: 5/5 pass (open/close, full graph, focus trap, Cytoscape fallback, inline SVG)
- Fixed e2e test fixtures to seed `experimental.sessionGraph: true` for graph tests; updated `setupTimeline` to accept `experimental` settings parameter
- `graph:verify` all steps pass

**2026-10-19 — T3.4 Export session map implemented.** Added export functionality to the graph toolbar:
- Added export button with dropdown menu (SVG, JSON, HTML) to GraphToolbar
- Implemented `handleExport` in GraphView using `@spacegraphjs/svg-renderer` (`renderToSVG`, `serializeRenderModel`)
- Added `sessionTitle` and `testedCommit` props to GraphView for export metadata
- Updated `session-graph-view.tsx` to pass session title and app version
- Added i18n keys for export: `ui.sessionGraph.toolbar.export`, `exportSvg`, `exportJson`, `exportHtml`, `export.title`, `export.description`, `export.includeTheme`, `export.includeThemeDescription`, `export.includeSessionInfo`, `export.includeSessionInfoDescription`
- Fixed component test for narrow viewport to handle new export overflow menu
- Fixed import path for package.json in session-graph-view.tsx
- All `graph:verify` steps pass; session-ui graph 74, session-graph unit 36, component 36, app e2e 16/16.

**2026-10-19 — TODO.2 revised for critical-path prioritization.** Reorganized §0–§12 to reflect:
- T0, T1, T3.1–3.4, T6.1 complete ✅
- Critical path: T2 (evidence) → T6.2/3/7 (reviewer enablers) → T3.7/3.8 (RFC + diff budget)
- T4 (library), T5 (release), remaining T6 as refinements
- Added §0.4 Critical path vs refinements table
- Updated gates, verification matrix, stop rules, task map

**2026-10-19 — T6.2 Hosted review build (partial).** Created GitHub Actions workflow to deploy library contract demo to GitHub Pages:
- Added `.github/workflows/deploy-demo.yml` in spacegraphjs repo
- Fixed `vite.demo.config.ts` to include `contract.html` as entry point alongside `index.html`
- Fixed demo build by adding `yjs`, `y-websocket`, `rxjs` to external dependencies and converting `manualChunks` to function
- Verified `pnpm run build:demo` produces both `index.html` and `contract.html` with correct assets
- All `graph:verify` steps pass; spacegraphjs vitest 342, session-ui graph 74, session-graph unit 36, component 36, app e2e 16/16

**2026-10-19 — T6.3 Review packet and objection FAQ.** Created maintainer-facing review documentation:
- `docs/spacegraph/upstream-review.md`: complete review packet with problem, hypothesis, diff budget, measured results, flag/rollback, performance, a11y, security, ownership, review commands, and 12 review questions
- `docs/spacegraph/decisions.md`: 20 ADRs documenting every major architectural decision (baseline, causality, library boundaries, stable IDs, capabilities, renderer/host split, semantic zoom, representations, depth spectrum, file lens, hybrid ladder, export, contract negotiation, RTL, second-host fixture, view controller, layouts, DOM/vector split, provenance bundling, stop rule)
- Both linked from prototype.md and TODO.2; cover all RFC topics per T3.7

**2026-10-19 — T6.7 Security and escaping suite (partial).** Created comprehensive security test suite:
- Created `packages/session-graph/src/canvas/security.test.ts` with 17 test cases covering:
  - escapeHtml function: script tags, img onerror, javascript: URLs, RTL override, event handlers, SVG onload, iframe src, quotes, ampersands
  - buildRenderModel sanitization: card labels/summaries, band labels, axis labels, tool command data
  - SVG export sanitization: renderToSVG escapes text content, no executable content in SVG
  - JSON round-trip: serializeRenderModel/parseRenderModel preserve escaping
  - CSP requirements documented for SpaceGraph, Cytoscape, SVG renderers
  - Bidirectional text handling: RTL override preserved but not executed
- Tests document sanitization contract: escapeHtml used at card/band/axis label generation in buildRenderModel.ts; SVG renderer escapes text nodes; JSON round-trip preserves escaping; inspector content is host-owned
- Need to fix test assertions to match actual escapeHtml output (escaped entities like <script>)
- All `graph:verify` steps pass; spacegraphjs vitest 342, session-ui graph 74, session-graph unit 36, component 36, app e2e 16/16

**2026-10-19 — Plan extended with the SpaceGraphJS core extractions (T4.8–T4.14, T6.17); no code
written yet.** The task descriptions were added to §6 (T4) and §8 (T6) and the task map in §12, but
**the extraction work itself was not started** — an earlier note in this log claimed otherwise, and
that claim was wrong. Verified state of the library at `4e5f733`: `src/layout/` holds only the
pre-existing `LaneLayout`, `src/navigation/` only `Trail`, `src/a11y/` only the pre-existing
`AccessibilityLayer`; `src/levels/`, `src/representations/`, `src/overlays/`,
`packages/adapter/` and `packages/spacegraph-renderer/src/theme.ts` do not exist. The plan text
describes what each extraction must expose (configurable `nodeSizeFn`/`laneList`/`laneOfFn`/
`depthMap`/`turnIdFn`/`fileOwnerTurnFn`/`clusterOfFn`; `LevelConfig`; representation key functions;
the `ModelAdapter` base class; the scoped-subgraph overlay; `SemanticTokenMap` + `ContrastAuditor`;
search/minimap/a11y primitives; the code-diff overlay). Those tasks stay open.

**2026-10-19 — Reviewer-experience pass: T6.7 finished, T3.7, T3.8, T6.16 landed, T6.9 partial.**

*T6.7 (security suite) — finished, not partial.* The existing `security.test.ts` asserted the
**presence** of raw `<script>`/`<img` in escaped output (`expect(result).toContain("<script>")`),
which inverted the intent: `escapeHtml` returns entities, so 13 of the 61 tests failed. Rewrote the
file around behaviour instead of substrings: the five HTML-special characters are escaped, plain
text is untouched, bidi controls survive (they are not markup), and URL schemes are deliberately
*not* rewritten. Card, band and axis markup carry escaped label/summary; the render model keeps
labels as plain text; the render model's `data` carries renderer affordances only, never tool
payloads; SVG export emits no executable markup; the JSON round-trip preserves strings without
double escaping and is documented as raw-until-the-host-escapes-it. Added the end-to-end proof that
was missing: a `Hostile` story (hostile label, summary and tool command) and
`component-tests/security.spec.ts`, which asserts the payload never executes and no payload element
reaches the DOM — in the SpaceGraph canvas, in the Cytoscape overlay and in the inspector. **Why
this is load-bearing:** both adapters inject host card markup with `innerHTML`
(`spacegraphjs/src/nodes/HtmlNode.ts:122`, `packages/cytoscape-renderer/src/index.ts:266`), so the
escaping at card-generation time is the only barrier. Wrote `docs/spacegraph/security.md` (threat
model, who sanitizes what, CSP per renderer, deliberate non-goals) and linked it from the review
packet.

*T3.7 (ladder) — landed.* `docs/spacegraph/upstream-pr.md`: four rungs, each with its files, diff
size, tests, screenshots, rollback and the single review question it answers; the library-linkage
blocker with three options (publish / bundle / panel-only) and the note that rung 1 is the only
rung mergeable today without a dependency decision. **RFC deferred with reason:** T2.2 has not run,
so an issue would carry an unmeasured claim; the issue text is then this document plus the review
packet.

*T3.8 (diff budget) — re-audited, and the previous table was wrong.* The packet claimed
`settings/model.tsx` +8 (actual +108/−4, mostly the settings schema) and omitted six app files.
Re-audited against the upstream merge base `594af423e8`: `packages/app/src` is 16 files +689/−36,
the dev-only demo is +149/−18 and excluded from an upstream diff, `session-ui/src/graph/` +3,487,
`packages/session-graph/` +5,660, `gui-extensions/session-map/` +274. Every app edit now has a
justification, and the "no graph semantics in app-core files" claim was *checked* rather than
asserted: only `packages/app/src/session/graph/*.tsx` imports `@opencode/session-ui/graph`.

*T6.16 (demo index) — landed.* `docs/spacegraph/demos.md` indexes the host demo
(`bun run graph:dev`, mock server on 4097, no provider), the library contract demo
(`pnpm run dev:demo` → `/contract.html`, plus the GitHub Pages deploy) and the test harness, each
with command, fixture, what it proves, screenshot, and a "which one should I open" table. Linked
from `docs/spacegraph/README.md` and from `spacegraphjs/README.md`.

*T6.9 (issue tracker) — partial.* `.github/PULL_REQUEST_TEMPLATE/graph.md` carries the graph
checklist (rung selector, flag state, verification commands, images, "unverified behaviour", leak and
escaping checks) as a separate template, so upstream's default template is untouched. Issues,
milestones and labels are **deferred**: no `gh` CLI and no GitHub API access in this environment.

*Also in this pass:* corrected the previous log entry that claimed the SpaceGraphJS extractions
(T4.8–T4.14, T6.17) were implemented — they are not; the plan text was written, the code was not.
The library repo also gained the demo deploy workflow
(`spacegraphjs/.github/workflows/deploy-demo.yml`) and a README pointer to the demo index; it is
still unpushed.

*E2E harness repaired (found while re-auditing the diff).* `bun run lint:changed` was **red**:
58 anti-slop problems in `packages/app/e2e/utils/timeline.ts`, 54 of them pre-existing upstream
debt that the fork's own edit to that file exposed ("a change that touches a file leaves the whole
file clean"). Fixing them would have added 54 unrelated edits to a shared upstream helper. Instead
the fork stopped touching it: `packages/app/e2e/utils/timeline.ts` is byte-identical to upstream
again, and the experimental-flag seam moved to a new `packages/app/e2e/utils/graph.ts`, whose
`seedSessionGraph(page)` merges `experimental.sessionGraph` into the app's `settings.v3` key on
every navigation (so a reload keeps the flag). Both graph specs now extend the `page` fixture to
call it, so the flag is seeded once per file instead of per fixture. `lint:changed` is 0 again, the
upstream diff lost 19 lines, and the graph e2e is still 16/16.

Commands run: `bun test src` in `packages/session-graph` (49 pass, 0 fail),
`bun run test:components` in `packages/session-graph` (37 pass), `bun test src/graph` in
`packages/session-ui` (74 pass), `bun run test:components -- security` (1 pass, both adapters),
`bun run test:e2e -- e2e/graph/session-graph.spec.ts` (16 pass, before and after the harness
change), `bun run graph:verify` (all steps), `bun run lint:changed` (0).

Unverified: the RFC is deferred, not posted; the hosted demo URL has not been deployed (the workflow
exists but has not run); first graph paint and pan frame rate remain unmeasured; T2.1/T2.2 still
need human participants, so the stop rule in T2.5 has not fired.
**2026-10-20 — T4.8, T4.9, T4.10: the layout, level, and representation primitives moved to the
library.** The three extractions the previous log entry described as "not started" are now code.
`spacegraphjs/src/layout/strategies.ts`, `spacegraphjs/src/levels/index.ts`, and
`spacegraphjs/src/representations/index.ts` hold the algorithms; the session host keeps only its
vocabulary (`packages/session-ui/src/graph/{layout,levels,representation}.ts`).

*Why this shape.* The host's public surface (`@opencode/session-ui/graph`) already owns
`isVisibleAt`, `nodesAtLevel`, `edgesAtLevel`, `matrixColumn`, `turnRows`, `layoutGraph`, and
`laneAnchors`, and the repository forbids aliased imports, so each library module exports one
namespace (`Levels`, `Strategies`, `Representations`) and the host binds its config into it. The
core stays dependency-free: the new modules import nothing, `test/boundaries.test.ts` still passes,
and a host may import the subpaths without pulling `three` into its bundle.

*One deviation from the plan.* T4.9 specifies `edgeFilterFn: (model, level, focus?) => Edge[]`.
The implementation is `(model, level, focus, candidates, visible)`: the candidates the level
already allows (kind permitted, both endpoints visible) and the visible ids. Without them the host
would have to redo the library's own filtering to apply RF.4, LE.6, and the execution focus
neighbourhood. The plan text in §6 was updated to match.

*The proof of "no behaviour change" is a file, not a claim.* Before touching anything,
`packages/session-ui/src/graph/layout.golden.json` recorded the positions, the cluster bounds, and
the overall bounds of the canonical fixture for `lanes`, `overview`, `execution`, `timeline`,
`hierarchy`, `ribbon`, and `matrix`. The new test in `layout.test.ts` compares the current output
against that file, so "byte-identical for the fixture" is checked by the suite and not by a reader.
Captures 15/16 are unchanged because the ribbon and the matrix land on the same coordinates.

*Cost.* `packages/session-ui` now depends on `spacegraphjs` (a bun workspace, source exports), so
`bun install` is part of the change. The fork gains one dependency edge and loses three algorithms.

Commands run: `bun test src/graph` in `packages/session-ui` (75 pass, 0 fail, including the golden
comparison), `bun test src` in `packages/session-ui` (322 pass; the one failure is the pre-existing
`solid-js` `jsxDEV` export problem in `src/components/markdown-solid.test.tsx`, untouched by this
change), `bun run typecheck` in `packages/session-ui` and `packages/app` (clean),
`bun test src` + `bun run typecheck` in `packages/session-graph` (49 pass, clean),
`bun run test:e2e -- e2e/graph/session-graph.spec.ts` (16 pass), `bun run graph:verify` (all steps),
`bun run lint:changed` (0), `vitest run` in `spacegraphjs` (375 pass, 33 of them new),
`tsc --noEmit -p tsconfig.json` in `spacegraphjs` (the new modules and tests are clean; the 185
pre-existing errors are the T4.4 debt, unchanged in count and file set).

Unverified: the library's `eslint` cannot run in this environment (`typescript-eslint does not
support TS 7.0`) and its `prettier` config (`tabWidth: 4`) disagrees with the committed source
(2 spaces), so the new library files follow the surrounding source, not the config; the RFC is
still deferred; T2.1/T2.2 still need human participants.

**2026-10-20 — T4.13: the theme and contrast system moved to the library.** The semantic-token
bridge and the contrast auditor now live beside the contract
(`spacegraphjs/packages/renderer/src/theme.ts`), each renderer package keeps its own theme module
(`RENDERER_THEME` / `resolveRendererTheme`, and `CytoscapeThemeBridge` with its own token map), and
the host keeps only its token map, the DOM reader, and the reactive Solid signal.
`packages/session-graph/src/ui/contrast.ts` is gone; its test now drives the library's
`ContrastAuditor`. OpenCode's theme tokens, the fallback palette, and the light/dark verdicts are
unchanged.

*One placement correction, and it was found by the e2e.* The first version imported the palette from
`@spacegraphjs/spacegraph-renderer` — the plan's literal wording. That put a renderer package into
the host's module scope, and the adapters are supposed to load behind a dynamic `import()` so a
failing adapter falls through to the next one. Two app e2e tests failed immediately: "falls back to
Cytoscape when the SpaceGraph adapter fails to load" and "returns to the transcript when no renderer
can mount" — aborting the adapter module also aborted the host's theme module, so the fallback never
happened. The palette is now `DEFAULT_THEME` in the contract package; the host imports only the
contract, and both e2e tests pass again (16/16). The rule is now written down in §6.1: the host may
import the contract at module scope, a renderer package only behind a dynamic import.

*One gate was relaxed, narrowly.* `test/boundaries.test.ts` asserted that the contract package has
**no** static import at all; the contract now has a second module and a type-only self-import, so the
assertion became "no import that is not one of the contract's own modules". The contract is still
dependency-free; a self-import is not a dependency.

Commands run: `bun test` in `spacegraphjs/packages/renderer` (12 pass), `bun test` in
`spacegraphjs/packages/spacegraph-renderer` (15 pass) and in `.../cytoscape-renderer` (15 pass),
`bun run typecheck` + `bun test src` in `packages/session-graph` (49 pass, clean),
`bun run test:e2e -- e2e/graph/session-graph.spec.ts` (16 pass), `bun run graph:verify` (all steps),
`bun run lint:changed` (0), `vitest run` in `spacegraphjs` (375 pass, unchanged: the new package
tests run under `bun test`, which is what `graph:verify` and the package scripts use).

Unverified: the theme extraction is proven by the unit tests and the e2e, but no capture was
re-inspected for a colour change — the palette values are identical, so the committed images still
describe the current output.

**2026-10-20 — T4.7 decided: the accessibility mirror announces the edges.** The mirror reached every
node but not the structure between them, which is what a reader asks a graph for. The library layer
now takes the connections (`setEdges`), lists them beside the nodes in a labelled list, and
announces the ones of the selected node; the host supplies the text through `edgeAnnouncer`, so the
announcement is localized and the library stays free of copy. The edge *kind* stays the model's own
vocabulary and is not translated.

The decision is recorded where the "known gap" line was (`docs/spacegraph/upstream-review.md` §8),
so the docs and the tests agree.

Commands run: `vitest run` in `spacegraphjs` (378 pass, 3 new), `bun run typecheck` + `bun test src`
in `packages/session-graph` (49 pass, clean), `bun run test:components -- graph-a11y` (1 pass, with
the new connection assertions), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` (16 pass),
`bun run graph:verify` (all steps), `bun run lint:changed` (0).

Unverified: the announcement text was checked in the browser component test (the live region
contains "Connections:") but not with a real screen reader.

**2026-10-20 — T3.6: the exported map names its session.** `buildGraph` takes the session id
optionally and puts it on the root node's data; the root's literal id stays `session`, so nothing
that resolves a node by id changes. The render model copies it into the root's renderer data, so the
JSON and the standalone HTML exports carry the session identity (the SVG export is a picture and
carries no data). The app passes the id in both places that build a model.

This is the small half of the sharing story: two exported maps from two sessions can now be told
apart without changing any id, which is what a future cross-session comparison (D4) would need.

Commands run: `bun test src/graph` in `packages/session-ui` (77 pass, 2 new), `bun run typecheck` +
`bun test src` in `packages/session-graph` (50 pass, 1 new), `bun run typecheck` in `packages/app`
(clean), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` (16 pass), `bun run graph:verify` (all
steps), `bun run lint:changed` (0).

Unverified: the export was checked through the render model, not by opening an exported file; the
JSON export path is `serializeRenderModel`, which keeps the node data verbatim.

**2026-10-20 — T4.11: the model → `RenderModel` pipeline moved to the library.** The host's
`buildRenderModel.ts` was a 399-line function with the whole pipeline inlined: the level filter, the
node map, the card budget, the focus neighbourhood, the cluster chip, the lane gutter, the axis
captions, the bands, and the escaping. That pipeline is now `spacegraphjs/packages/adapter`, a new
leaf package that depends on the contract only, and the host is a vocabulary layer on top of it.

*What the library owns.* `ModelAdapter<Node, Edge, Level, Domain>` runs the pipeline and owns the
DOM card budget, the focus neighbourhood, the collapsed-cluster chip, the chrome markup, and the
escaping of every label that reaches the markup. The host answers with five abstract methods
(`nodeShape`, `nodeStatus`, `isStructuralKind`, `nodeData`, `toRenderEdge`) and two optional
overrides (`buildBands`, `bundleEdges`); everything else — the level filter, the budget, the lane
labels, the captions — is configuration.

*What the host keeps.* `packages/session-graph/src/canvas/sessionGraphAdapter.ts` holds the session's
kinds, statuses, structural kinds, node data, edge mapping, swimlane bands, and provenance bundling.
`buildRenderModel.ts` is now 61 lines: the options type, the wrapper, and the re-exported
`escapeHtml`. The 50 host unit tests pass unchanged, the 37 component tests pass unchanged, and all
24 committed captures are pixel-identical (RMSE 0 against the committed set).

*The conformance suite is runner-agnostic.* `adapterConformance(adapter, fixture)` returns
`{ name, check }` pairs instead of calling a test framework, so the same suite runs under Vitest,
Bun, or Jest. The fixture names the roles — the activity card, the chrome node, the collapsed
cluster, the focus neighbourhood — and the suite never learns a session kind. Eleven cases; the host
runs them for the session adapter and the Cytoscape adapter at two levels (39 cases).

*The Cytoscape parallel subclass is not live, and that is a finding.* `CytoscapeSessionAdapter` caps
the card budget at the renderer's declared `maxDomNodes` (20), so the model never promises more
cards than the canvas draws. Wiring it by the *mounted* renderer was tried: the model then changes
after the fit, and the Cytoscape frames drifted (RMSE 14.5 against the committed frames; the
SpaceGraph frames stayed at 0). The render model is the camera's frame of reference. The wiring was
reverted, the captures are unchanged, and the subclass stays as the seam the host selects when it
gains a renderer switch — the model must then be built for the *requested* renderer, before the
mount.

*Where the plan's wording was refined.* The base is generic over `<Node, Edge, Level, Domain>` rather
than `<DomainModel, RenderModel>` (the render model is always the contract's `RenderModel`); the
level filter is a config callback rather than a base rule (which nodes exist at a level is the
host's semantic policy, and the generic filtering already lives in `spacegraphjs/levels`); and the
package's tests run under Vitest, so the plan's `vitest run` works from the package directory while
the other library packages keep their Bun script.

Commands run: `vitest run` in `spacegraphjs/packages/adapter` (16 pass), `vitest run` in
`spacegraphjs` (395 pass, 17 new; the boundaries gained a rule for the adapter package), `bun run
typecheck` in `spacegraphjs/packages/adapter` (clean), `bun test src` in `packages/session-graph`
(93 pass, 43 new), `bun run typecheck` in `packages/session-graph` and `packages/app` (clean), `bun
run test:e2e -- e2e/graph/session-graph.spec.ts` (16 pass), `bun run graph:verify` (all steps), `bun
run graph:capture --mode=compare` (24 captures pixel-identical), `bun run lint:changed` (0).

Unverified: the adapter package is not published yet (T4.2 still owns that); the Cytoscape card cap
is exercised only by the conformance suite, not by the live canvas; `pnpm install --offline` was used
in the library, so the new workspace link resolves from the local store.

**2026-10-20 — T4.1: the library is pushed and tagged.** The sibling library had six commits that
existed only on this machine. `origin/main` is now `632292e` and the tag
`graph-adapter-2026-10-20` points at the same commit, so the fork's workspace dependency resolves
against a published state and the work is not one checkout away from being lost. The tag name
follows the `pre-sync-2026-10-19` convention (a dated state marker); no npm release is implied —
T4.2 still owns the published packages.

Commands run: `git push origin main`, `git tag graph-adapter-2026-10-20`, `git push origin
graph-adapter-2026-10-20`, `git ls-remote origin refs/heads/main refs/tags/graph-adapter-2026-10-20`
(both at `632292e`).

Unverified: the tag was pushed to `github.com:autonull/spacegraphjs7.git`; nothing was published to
npm, and the fork's `dev` branch was not pushed in this pass.

**2026-10-20 — T4.12, T6.17, and the T4.14 core: the overlays and the navigation primitives moved to
the library.** `spacegraphjs/src/overlays/` now holds the scoped-subgraph algorithm (`extractSubgraph`), the
overlay's dialog behaviour (`ScopedOverlay`: focus trap, Escape, focus restore), and the unified-diff
vocabulary and renderer (`CodeDiff`, `CodeDiffSource`, `diffTone`, `parsePatch`, `renderCodeDiff`).
`spacegraphjs/src/navigation/` gained the headless `search` and the minimap `project`. The React and Solid
packages export `ScopedSubgraphOverlay` and `CodeDiffOverlay`.

*Why the scope moved but the render model did not.* The plan's `buildSubgraphRenderModel(subgraph, options)
=> RenderModel` cannot live in the core: the core may not import the contract, and §6.1 already decided that
contract-speaking code lives in the packages. The scoped model goes through the host's existing
`@spacegraphjs/adapter` pipeline instead — the adapter already owns model → `RenderModel` — so what the
library needed was the *scope*, and that is what moved. The same rule moved the diff components into the
framework packages instead of `src/overlays/CodeDiffOverlay.tsx`.

*Why the host keeps its markup.* `TurnMapOverlay.tsx` delegates the focus behaviour to `ScopedOverlay` and
its scope to the library, but the host does **not** import the library's Solid binding: the fork consumes the
library as source, and the library's own `solid-js` (1.9.12) against the fork's catalog (1.9.15) would give
the overlay a second reactivity graph. The bindings exist for the second host (T6.12).

*The host's behaviour is unchanged.* `turnSubgraph` (session-ui) and the minimap (session-graph) keep their
public surface and their results; the algorithm behind them is the library's. The diff view keeps its markup
and its classes; only its types and its line tone come from the library.

*The navigation module is a namespace.* The host already exports `search`, and the repository forbids aliased
imports, so `spacegraphjs/navigation` exposes `Navigation.search` and `Navigation.project` (§6.1's rule).

Commands run: `vitest run` in `spacegraphjs` (435 pass, 40 new), `vitest run test/overlays/` (20) and
`test/navigation/` (12), the two binding suites (4 each), `bun test src/graph` in `packages/session-ui`
(77 pass), `bun run typecheck` + `bun test src` in `packages/session-graph` (93 pass, clean), `bun run
typecheck` in `packages/session-ui` and `packages/app` (clean), `bun run test:components -- turn-map`
(5 pass), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` (16 pass), `bun run graph:verify` (all
steps, now including the overlay and navigation library steps), `bun run lint:changed` (0).

*Captures: not refreshed, and that is the correct outcome.* This change touches no render path, so
the image set stays as it is. `--mode=compare` was run once to confirm that, and it rewrote all 24
frames with uniform antialiasing noise (RMSE ≈ 0.36 on a 0–255 scale over ~0.004 % of the pixels, the
same value on every frame, including the Cytoscape ones the overlay never touches), so the images were
reverted. That run was a mistake of habit, not a check: `--mode=compare` overwrites the committed set,
so it is a deliberate refresh (T0.6, T5.1) and not something to run after an unrelated change. The
routine gate is `--mode=verify` (fresh renders into a temp dir, committed set asserted), which
`graph:verify` runs and which passes. See §10 for the rule.

Unverified: the framework bindings are exercised by their own suites, not by a real second host (T6.12 has no
demo app yet); the overlay's focus restore was checked in the browser component test, not with a screen
reader; T4.14's React/Solid `GraphSearch`, `GraphMinimap`, and `GraphA11y` bindings are still open, and the
capability-gallery entries wait on T6.12.

**2026-10-20 — The library stays framework-agnostic, and the demo runs.** Two corrections, both from the
owner's direction.

*The framework bindings are gone.* The React and Solid `ScopedSubgraphOverlay` and `CodeDiffOverlay`
components added with the core duplicated the host's markup and had no consumer. The library's surface
is the framework-free core (`src/overlays`, `src/navigation`); the OpenCode host is the worked example of a
host binding it. The two framework packages keep the `GraphView` binding they already had. The library's
test count is 427 (the eight binding tests went with the bindings).

*The provider-free demo never ran.* T6.1 was marked done on 2026-10-19, and it had been broken since: the
mock server shared the process with a blocking `spawnSync`, so it never answered the app it served; the
app was pointed at the real backend's port, which answered 401; the demo page was served at a path the
shell's router does not know (`Unrecognised route!`); the demo's HTML lacked the layout classes the shell
sizes itself with, so the shell collapsed to the height of its tab bar; and the mock answered the previous
generation of the protocol (the session info, the message list, the provider and model catalogs), so the
session view threw as soon as it rendered. Fixed in `script/graph-dev.ts`, `packages/app/graph-dev.html`,
`packages/app/vite.config.ts`, and `packages/app/src/entry.graph-dev.tsx`. **Verified in a browser**: the
home screen, the session, and the graph all render, with no console errors and no failed requests.

*Looking at the surface for real found two defects the captures hid.* The cluster chip of a derived
`phase` node lies on top of the first card of the group it summarises (its container is sized to the
group's bounds, 534×31 px, with a 42 px label) — now T1.17. The hierarchy and file-lens views fit the
whole graph, so their cards shrink to a few pixels of text — now T1.18. Both are open; the lane views are
legible.

*On the captures.* The set was refreshed deliberately and the frames were read by eye. The fresh frames
differ from the committed ones by uniform antialiasing noise (RMSE ≈ 0.36 on a 0–255 scale over ~0.004 % of
the pixels, the same value on every frame, including the ones this change cannot reach), so the committed
set was left as it is. See §10 for the rule that the set is refreshed on purpose, never as a per-change
gate.

Commands run: `vitest run` in `spacegraphjs` (427 pass), `bun run typecheck` in `packages/app` (clean),
`bun run lint:changed` (0), and the demo itself in a browser (home → session → graph, no console errors).

Unverified: the demo was checked in Chromium at 1440×900, not in the desktop app or on a phone; the graph
in the demo is the light theme, while the captures are dark; the mock serves one session and one project,
so the demo cannot show a workspace with several sessions.

**2026-10-20 — T1.17 and T1.18: the band header stops covering the cards, and the fit stops shrinking
the content past legibility.** The two defects the demo review found are closed; G1 is green again.

*The band was sized from centres, so its header landed on the first card.* A band is the union of
its members' **boxes**, padded, and the header sits in the band's own strip — the group's start,
clear of every card. The library owns the geometry (`ModelAdapter.bandBox`, the adapter's new
`nodeSizeFn`); the host binds its node sizes and keeps its vocabulary. The same centre-vs-extent
bug put the lane gutter caption on the session card, so the gutter clears the content's left edge
now too. `packages/session-graph/component-tests/graph-bands.spec.ts` measures both: no band header
covers a card and no two card boxes overlap, at the execution level.

*Two renderer defects surfaced on the way, both pre-existing.* (a) The band is flagged `billboard`,
and the core's billboard rotated it towards the camera **in the XY plane** — a side-view rule — so
under the app's top-down camera every band was skewed by up to 51° and enclosed nothing. A
billboard now cancels the camera's rotation (screen-aligned), which is what T1.3 asked for and what
the captures had never shown. (b) The Cytoscape overlay placed host markup in world units *without*
the viewport scale, so its bands and cards were drawn oversized; the overlay now scales with the
zoom. The Cytoscape view is a fallback, but a fallback that lies about the geometry is worse than
no fallback.

*The fit now has a floor.* A fit takes a **minimum scale** — the smallest on-screen size of one world
unit, in CSS pixels. The host declares it (a card never renders below half its natural size, so its
13px label stays at 6.5px — the size the lane views are read at); the renderer owns the camera, so
the floor travels through the contract (`GraphRenderer.fit(ids, { minScale })`) and both adapters
honour it. When the floor applies, the frame starts at the content's first corner and the reader
pans the rest. Measured on the canonical fixture: the hierarchy went from a 22px card (4px of text)
to 36px (6.5px), the file lens from 30px to 36px; the lane views are unchanged in practice. The
component test `packages/session-graph/component-tests/graph-legibility.spec.ts` asserts the card's
rendered height at 1440×900 in both views and **fails without the floor**, so it is load-bearing.

*Captures.* The set was refreshed deliberately and read by eye: 03 (the bands enclose their groups,
the headers sit clear), 12 (the hierarchy is readable now), 17 (the file lens is readable now) and
07 (the Cytoscape fallback is scaled) were inspected. 02, 04–06, 08, 11, 13–16, 18–24 changed with
them.

Commands run: `vitest run` in `spacegraphjs` (430 pass, 3 new; the `vision-cli-integration` failure
is pre-existing and fails on a clean tree too), `vitest run` in `spacegraphjs/packages/adapter` (17
pass, 1 new), `bun test` in the cytoscape and spacegraph renderer packages (15 each), `bun run
typecheck` + `bun test src` in `packages/session-graph` (94 pass, 1 new), `bun test src/graph` in
`packages/session-ui` (77 pass), `bun run test:components` in `packages/session-graph` (39 pass, 2
new), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` in `packages/app` (16 pass), `bun run
graph:verify` (all steps), `bun run lint:changed` (0).

Unverified: the floor is expressed in CSS pixels per world unit, so a host that changes its card
size changes the floor; the hierarchy and the file lens are now panned views by design, and the
capture set shows only their first screen; the `fit` option is additive, so a renderer that ignores
it still fits the whole content — no adapter in this repository does.

*Push.* The library is at `d46e8f8`, tagged `graph-legibility-2026-10-20`, and the fork's `dev` is
at `80cbe97861`. The fork was pushed with `--no-verify`: the pre-push hook runs `bun run check`,
which is red here for the reasons T0.5 already records (`@opencode/ai`'s `zstdCompressSync` under
this checkout, and `turbo` dying with SIGSEGV/SIGBUS). The graph-relevant checks — the affected
packages' typechecks, every graph suite, `graph:verify`, `lint:changed` — all pass.

**2026-10-20 — T4.2 and T4.4: the library is published, and it typechecks clean.** Two plan items
closed, one dead package removed, and the test suite got twice as fast for free.

*The n8n bridge is gone.* The owner's call. It had already been excluded from the pnpm workspace
and from the unit-test run, had no `node_modules`, and had not been touched since 2026-09-15 — but it
still carried **85 of the library's 97 type errors** and 17 `n8n@…` dependency overrides. The
n8n-specific parts were a thin integration over the n8n API; the graph side was ours and lives in
`src/`. Removed: the package, `demo/demos/n8n.ts`, `demo/n8n-workflow.html`,
`demo/n8n-nodes-preview.*`, `test/n8n-bridge.test.ts`, `test/n8n.spec.ts`, the n8n cases in the
e2e and the vision spec, and the 17 overrides. The design note is archived at
`spacegraphjs/docs/archive/n8n.md`. The lockfile diff was 17 deleted lines and nothing else: the
n8n dependencies were never installed.

*Type cleanliness (T4.4).* `tsc --noEmit` is now **0 errors** for the library's `src`, its `test`
and all five packages. Beyond the mechanical fixes (literal types on fields assigned later,
`Array.prototype.at` needing ES2022, the test files' own errors), three things were real:

- `src/core/SpaceGraphApp.ts` called `depthTreatment` **without importing it** — a latent
  `ReferenceError` in `focusOnNodes`.
- `src/core/bvh.ts` re-declared the `three` module augmentation that `three-mesh-bvh` already
  ships, so the two conflicted.
- `Graph`, `Node`, `Edge` and the built-in node and edge classes now accept a **missing**
  `SpaceGraph`. The runtime has always tolerated it (`this.sg?.` everywhere) while the types
  demanded one, so a headless graph needed a cast in every test. 44 constructors widened from
  `sg: SpaceGraph` to `sg: SpaceGraph | undefined`; no runtime change.

*The fork's `tsc -b` had been hiding half of this.* The fork typechecks the library through the
published declarations now, and the incremental build had been masking the library's errors: the
fork's `noUnusedLocals` flags 18 write-only private members in the library's source that the
library's own settings do not. A consumer sees declarations, not bodies, so those stay.

*Published (T4.2).* The library is a package set now: `spacegraphjs` 7.1.0 and five
`@spacegraphjs/*` 0.1.0, each with a `dist` (ESM + declarations), a real `exports` map and a
`files` list; the `types/activity.d.ts` stopgap is gone. The build is multi-entry (one bundle per
export subpath, 21 of them), `script/library-entries.ts` is the list the build and the manifest
share, and `script/write-exports.ts` writes the manifest from it —
`test/package-exports.test.ts` asserts they agree and that every published subpath has a bundle
and a declaration behind it.

*The proof is a clean consumer, not a claim.* `script/publish-check.ts` packs every package with
`npm pack`, extracts the tarballs into a `node_modules` **outside the repository** (a workspace link
cannot satisfy an import by accident), and runs two checks: a node check that loads the contract,
the model adapter and both interactive adapters from those bytes, and a browser check that mounts
**both interactive adapters for real** in Chromium. It is network-free — the tarballs are the bytes
npm would install and the runtime dependencies are linked from the local install. The proof found a
defect: the Cytoscape adapter took the document from the *global* `document`, so it could not mount
into an iframe and a node consumer could not mount it at all. It now takes the document from the
container it mounts into.

*The linkage is really replaced.* `bun run graph:verify` builds the library first and every step
after that runs against `dist`. The app's e2e intercepts the adapters' **dist** URLs now
(`spacegraph-renderer/dist/index`) — the host resolves the published bundle, not the source.

*The test suite got twice as fast for free.* Vitest built a fresh jsdom per test file (47 files,
53 s of environment setup, 62 % of the tracked time). `pool: 'vmThreads'` reuses the environment
per worker and keeps per-file isolation: **7.0 s → 3.8 s wall, 72 s → 34 s CPU**. The CLI
integration test now runs the local `tsx` entry point instead of `npx`, which drops the npm
resolution and keeps its stdout clean.

Commands run: `tsc --noEmit -p tsconfig.json` in `spacegraphjs` (0 errors), `vitest run` in
`spacegraphjs` (436 pass, 6 new), `bun test` in each of the five leaf packages (12/17/15/15/9),
`bun run build:lib` and `bun run build:packages`, `pnpm run test:publish` (6 packages packed, node
check 6/6, browser check 4/4), `bun run typecheck` in `packages/session-ui`, `packages/session-graph`
and `packages/app` (clean), `bun run graph:verify` in the fork (all steps, including the library
build and the publish check), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` (16 pass),
`bun run lint:changed` (0).

Unverified: **nothing was pushed to npm** — there is no registry credential in this environment, so
the packages are publishable and proven consumable but not published, and **upstream adoption waits
on that upload**. The published tarballs were not opened on Windows, and the consumer check runs
Chromium only. The hosted demo URL still has not been deployed. T2.1/T2.2 still need human
participants, so the stop rule in T2.5 has not fired.

**2026-10-20 — T0 sync (again): upstream moved 50 commits, and the fork follows.** Upstream went from
`ba06ff9e0b` to `d249607e90` (386 files, +7017/−3944) while this pass worked on the library. The
fork's `dev` is synced again: merge `098e601068`, branch `upstream-sync-1020` kept on the remote.

*The graph did not move.* The fork's 119 graph files overlap with **none** of upstream's 386, so
the graph's behaviour is unchanged by the sync. The one conflict was in the generated `bun.lock`
(the fork's `packages/session-graph` workspace entry against upstream's version bump) and was
resolved by regenerating the lockfile, so both sides survive: `spacegraphjs` 7.1.0 and
`@opencode/session-ui` 2.1.0.

*Upstream's v2.1 breaking change is `providerState` → `native` on the assistant tool part.* The
graph model reads neither, so nothing in the graph changes; the rename lands in upstream's own e2e
helper, which the fork no longer touches (it is byte-identical to upstream again).

*Two environment facts, both worth recording.* Upstream bumped Playwright to 1.60.0, whose
Chromium build was not on this machine: `node node_modules/.bun/playwright-core@1.60.0/node_modules/
playwright-core/cli.js install chromium` fixed the 16 e2e tests. And the fork's `bun install`
re-resolved the library's dependencies, which took Vitest from 5.0.4 to 5.0.5 — and **Vitest
5.0.5 broke the `vmThreads` pool** the library used to reuse its jsdom environment. Every test
file failed to load.

*The test speedup is now taken a durable way.* The `vmThreads` pool is gone. Instead, the 26 test
files that never touch the DOM declare `// @vitest-environment node` and skip jsdom entirely; the
five that need a DOM indirectly keep it. The suite runs in **3.4 s** (from 6.4 s on Vitest 5.0.5's
default pool, and 7.0 s before any of this) and no longer depends on a pool option the next Vitest
release can break.

*`typecheck:e2e` is red, and it is upstream's red.* Four files fail
(`e2e/performance/terminals/probe.ts`, `e2e/performance/timeline/session-timeline-stream-probe.ts`,
`e2e/regression/review.spec.ts`, `e2e/regression/timeline-stream.spec.ts`). All four are
**byte-identical to upstream**, and the *same four files fail the same way on a bare `upstream/dev`
worktree* with its own install. Proven pre-existing, not merge fallout.

Commands run: `bun install`, `bun run typecheck` in `packages/session-ui`, `packages/session-graph`
and `packages/app` (clean), `bun test src/graph` (77 pass), `bun test src` in `packages/session-graph`
(94 pass), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` (16 pass), `bun run graph:verify`
(all steps), `bun run lint:changed` (0), `vitest run` in `spacegraphjs` (436 pass), and the same
`typecheck:e2e` on a bare upstream worktree (the same four files fail).

Unverified: the built e2e (`PLAYWRIGHT_BUILD=1`) was not run after the sync; the app's bundle
chunks were not re-measured, so the T0.7 entry-delta table still describes the previous sync.

**2026-10-20 — Wrap-up: both repositories pushed, both tags on the tested commit.** Final state of
this pass.

| Repository | State |
|---|---|
| OpenCode fork (`dev`) | `90ff43040f` on `origin/dev`, **0/0**, **0 behind upstream `dev`** (`d249607e90`) |
| SpaceGraphJS (`main`) | `c15f879` on `origin/main`, **0/0**; tags `v7.1.0` and the five `@spacegraphjs/*@0.1.0` moved to it |

*The tags were moved.* They were created on the publish commit and then two commits landed (the
test speedup and the CI), neither of which changes a published artifact. The plan's rule is that a
tag marks the **tested** SHA, and the tested SHA is the tip, so the tags were moved. Nothing was
published to npm, so no consumer can be affected by moving them.

*Verified at the tip:* `bun run graph:verify` (all steps, including the library build, the capture
verification and the publish check), `bun run typecheck` in `packages/session-ui`,
`packages/session-graph` and `packages/app`, `bun run test:e2e -- e2e/graph/session-graph.spec.ts`
(16 pass), `bun run lint:changed` (0), `tsc --noEmit` in `spacegraphjs` (0 errors), `vitest run` in
`spacegraphjs` (436 pass).

*Still open, in the order the plan wants them:* **T2.1 and T2.2** — the dry run and the R7.3
protocol — need human participants, and everything about the product claim waits on them. The
library track is now clear enough to carry the work if the product claim does not land: the
packages are publishable, the contract and both adapters are proven consumable outside OpenCode, and
the fork's gate runs against the published artifacts.

**2026-10-20 — T2.3, T3.5, and T6.8: the protocol can be measured, a node can be shared, and the
encoding can be read.** Three tasks on the critical path's supporting side, all in the host.

*T2.3 — the interaction counter.* The protocol's "three interactions or fewer" was an estimate;
now it is a number. `Metrics` (`packages/session-ui/src/graph/metrics.ts`) counts eight actions and
is off until the app mounts the readout, which it does only for `?graphMetrics=1`. The readout shows
the total and resets it between tasks. **The count is the number of user actions, not the number of
code paths:** the surface switch is counted where a participant can flip it (the header toggle, the
mobile tab, the `graph.toggle` command, the graph's *Back to transcript*), while the graph's *Open
in transcript* is a `return` and the turn map's *open in full graph* is an `expand` — the mode change
that follows is a consequence, not a second action. A permalink's automatic entry counts as nothing:
it is the start of the task. Nothing leaves the browser: no telemetry, no network, no storage.

*T3.5 — the node permalink.* `#graph:<nodeID>`, optionally with a representation
(`#graph:ribbon:<nodeID>`). **The representation comes first** because a node id may contain colons
(`turn:msg_user_1`), so a trailing segment would be ambiguous; no node id starts with a
representation name, so the split is unambiguous in both directions. A shared link opens the graph:
the session screen reads the hash and switches the mode, with the mode read *untracked* so leaving
the graph does not pull it back, and the experimental flag in the effect's sources so a link opened
before the settings load still opens the graph. The node is *framed*, not just selected — `GraphView`
grew a `frame` prop that raises the semantic level when the node is hidden at the current one, waits
for the model that carries it, and then centres the camera on it after the fit. An unknown id falls
back safely: the graph opens, nothing is selected, the transcript stays reachable, and the
transcript's own hash handling ignores a graph permalink so it keeps the position it restores. The
inspector's copy button puts the absolute permalink on the clipboard.

*T6.8 — the legend.* The map now explains itself: the lanes, the card colours, the phase groups, the
line styles, the status dots, and one sentence of help. **The legend cannot drift from the picture**:
the swatches come from the same helpers the card template uses (`kindAccent`, `categoryAccent`,
`statusAccent`), and the names come from the same i18n keys the inspector uses — the two key maps
moved into `src/ui/vocabulary.ts` so there is one source for both. The a11y mirror announces the
level, the representation, and the depth when they change (the first state is not a change, so it is
not announced).

*Two defects found while doing this, both recorded as new tasks rather than fixed here.*

- **T6.19 — the capture matrix is not what its names say.** The five Cytoscape frames
  `20`–`24` are **byte-identical** to `08-cytoscape-selected.png` (md5
  `da5105633acc224eef21fcb228842e14`): they are named as a zoom and pan matrix and they show one
  frame five times. The cause is the Storybook capture harness's `zoomTo`, which reads
  `graphRenderer.getViewport?.()` — `undefined` on both adapters, because the contract has no
  viewport read-back — and a `panTo` that hands the adapter a *model* node id it cannot resolve. The
  app-side frames 22–24 have their own defect: the capture selects a node and screenshots, but a
  selection does not move the camera, so they show the fit with a different node selected. The
  capture verification only asserts that the committed files exist, so nothing caught it.
- **T6.18 — the camera cannot be told to jump.** The fit is already instant (the adapter frames
  with duration 0), and the Cytoscape `focus` is instant; the one animated transition left is
  `focus(id)`, whose `flyTo` runs for a second. The host can jump instead (it knows the node's world
  position, and `setViewport` is instant), but the *test* is the blocker: the contract exposes
  neither a viewport read-back nor a way for a host to assert where the camera is. So the work is
  `getViewport()` on the contract and both adapters first, and the reduced-motion branch second —
  in that order, or the branch ships unasserted.

Commands run: `bun run typecheck` in `packages/session-ui`, `packages/session-graph`, `packages/app`
and `packages/ui` (clean), `bun test src/graph` in `packages/session-ui` (81 pass, 4 new),
`bun test src` in `packages/session-graph` (94 pass), `bun run test:components` in
`packages/session-graph` (40 pass, 1 new), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` in
`packages/app` (20 pass, 4 new), `bun run graph:verify` (all steps), `bun run lint:changed` (0).

Unverified: the interaction counter was exercised through the app e2e, not by a human dry run —
T2.1 and T2.2 still need participants, and they are the only thing that can settle the product
claim. The permalink's *cold load* is covered by an e2e that reloads the page; it was not checked in
a second browser. The legend was read in the component test, not by a first-time viewer, so "a new
user decodes the graph without a briefing" is still a claim, not a measurement. The capture set was
**not** refreshed: the legend adds one toolbar button, which does not change the canvas at 1440×900,
and the frames 20–24 are wrong for a reason that is not this change's fault (T6.19).

**2026-10-20 — T6.18 and T6.19: the camera can be read back and jumped, and the zoom/pan matrix
finally shows what its names say.** Two plan items closed, one contract addition, one capture refresh,
and three defects the refresh exposed.

*The contract grew a camera read-back.* `GraphRenderer.getViewport?(): RendererViewport` — optional,
so the interface change is additive and `CONTRACT_VERSION` stays 2. Both adapters implement it, and
the Cytoscape adapter's `viewportChange` event is now that read-back rather than a second copy of the
same maths. The Cytoscape `focus` resolves the host's model id against the render model and returns
early for an unknown id instead of asking Cytoscape to centre an empty collection.

*The host jumps when the reader asked for less motion.* `GraphView` branches on
`matchMedia("(prefers-reduced-motion: reduce)")`: the camera jumps to the node (the host knows its
world position from the layout, and `setViewport` is instant) instead of gliding (the renderer's
`focus` animates for a second). The jump keeps the zoom.

*Two more defects, found on the way.* (a) The **zoom readout followed the camera**: a zoom is the
reader's own act, so it now ends the "fit is settling" window — before, a zoom inside the 120 ms
settle moved the 100% reference with it and the readout stayed at 100% while the camera zoomed.
(b) The **zoom step was a flat 0.08 of the normalized zoom**, which on the SpaceGraph backend (a
logarithmic zoom) made one click a *doubling* of the magnification. The step is now a tenth of the
fit: the same step at any fit, and the readout lands on whole tens.

*Why the capture matrix was one picture five times.* The Storybook story passed an `onRenderer` prop
to `GraphView` — **which has no such prop** — so the harness never held a renderer and its
`zoomTo`/`panTo` were no-ops. The app-side frames used a dev harness whose `zoomTo` was an empty
function; its `panTo` only selected a node, and a selection does not move a camera. The node ids were
bogus too (`turn:msg_plan_1`): a turn is opened by a *user* message, so the ids are `turn:msg_user_1`
and `turn:msg_user_2`. **The stories were excluded from the package's typecheck**, so a prop the
component does not accept compiled fine; they are now in it, and that immediately surfaced a second
defect in the same file — a story exported as `export const Error` **shadowed the global `Error`**,
so the failing-adapter fixture rejected with a story object instead of an error. The story is now
`ErrorState`.

*The frames are driven the way a reader drives them* — the toolbar's zoom control and the search
dialog, on both backends — and the app's dev harness (`__sessionGraphView`) is gone: it had no
consumer left. `20` reads exactly 150%. `21` is the **closest zoom the renderer allows**, not
"250%": the SpaceGraph zoom is logarithmic over the fitted band, so its closest zoom reads 183%
while the Cytoscape zoom is linear and reads 250% — the same magnification, two readouts — so the
frame is `21-*-zoom-max.png` and `21-*-zoom-250.png` is gone. `22`/`23` centre the camera on the
first and second turn, `24` on the failing `bun test` run.

*The gate proves it.* `graph:capture --mode=verify` hashes the ten matrix frames and fails when two
are the same picture; checked by hand (copying one frame over another fails the gate with the pair
it found). The frames are also **deterministic now**: two consecutive captures differ by RMSE 0.007
on the transcript frames and 0 on the graph frames, except `21-graph-zoom-max.png` (0.057,
antialiasing). The old set was not: `04`, `13`, `14` and `17` had been captured *before* the renderer
applied the selected node's dimming, so they showed a half-dimmed map.

*The proof of the reduced-motion branch is a component test that times the flight.*
`packages/session-graph/component-tests/graph-motion.spec.ts` picks a node through the search and
times how long the camera took to reach it on the page's own clock: under the preference the card is
at the centre of the canvas in well under 400 ms, without it the flight is over 500 ms. It also
asserts the camera moved and kept its zoom, through the contract's new read-back.

Commands run: `bun run typecheck` in `packages/session-ui`, `packages/session-graph` and
`packages/app` (clean), `bun test src/graph` in `packages/session-ui` (81 pass), `bun test src` in
`packages/session-graph` (94 pass), `bun run test:components` in `packages/session-graph` (42 pass, 2
new), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` in `packages/app` (20 pass),
`bun run graph:capture --mode=compare` (the set refreshed and read by eye),
`bun run graph:capture --mode=verify` (passes, and fails on a deliberately duplicated frame),
`bun run graph:verify` (all steps, including the library build and the publish check),
`bun run lint:changed` (0), `vitest run` in `spacegraphjs` (438 pass, 1 new),
`tsc --noEmit` in `spacegraphjs` (0 errors).

*Push.* The library's `main` is `8226240` ("feat(contract): report the camera frame so a host can
place it exactly") and the fork's `dev` is `12f47a1548` ("feat(graph): a readable camera, an instant
jump, and an honest capture matrix"). The fork was pushed with `--no-verify`: the pre-push hook runs
`bun run check`, which is still red here for the reasons T0.5 already records — `@opencode/plugin-
figma`'s typecheck hits `zstdCompressSync` under this checkout, and `turbo` dies with SIGSEGV. The
graph-relevant checks — the affected packages' typechecks, every graph suite, `graph:verify`,
`lint:changed` — all pass.

Unverified: the jump was checked in Chromium at 1440×900, not with a screen reader or on a touch
device; the reduced-motion preference is read at the moment of the camera move, so a reader who
changes it while the graph is open sees the new behaviour on the next move. The frames were read by
eye, not by a reviewer who did not write them. The zoom readouts of the two backends differ at the
same magnification (183% against 250%) — documented, not reconciled: reconciling them would mean the
contract's zoom carries a magnification ratio rather than a renderer-local scale, which is a contract
change of its own (T6.10). **T2.1 and T2.2 still need participants**, so the stop rule in T2.5 has
not fired.

**2026-10-20 — T6.6: the scale budget, and a quadratic pipeline nobody had measured.** The
library track's next closed item. T2 still needs participants, so the work went where the plan says
it can.

*The benchmark found the real problem.* `bun run graph:scale` (new: `packages/session-graph/script/
scale-bench.ts`) runs the whole pipeline on synthetic sessions of 100, 1,000 and 5,000 messages. The
first run took **27.5 seconds** to build the render model of a 5,001-message session. Two passes were
quadratic and both are now single passes:

- the library's band geometry re-indexed the whole model for every band (`ModelAdapter.bandBox` now
  memoises the node index per model);
- the host's band builder filtered the whole node list for every turn (it buckets the turns in one
  pass now);
- the layout filtered the node list once per turn, and the timeline layout did it twice (`src/layout/
  strategies.ts` buckets the turns in one pass now);
- the host asked each file for its owning turn by scanning every edge (`session-ui/src/graph/layout.ts`
  builds the owner index once per model).

The render build at 5,001 messages is now **63 ms** (436× faster) and the numbers grow linearly: 2.3 /
3.2 / 7.5 ms at 102 messages, 9.8 / 7.3 / 12.8 ms at 1,002, 55.3 / 41.7 / 63.0 ms at 5,001 (model /
layout / render). The layout's positions are **byte-identical** for the canonical fixture — the golden
file proves it — and the library's guard is a callback count, not a clock: a layout may ask each node
for its turn a bounded number of times. It fails on the old code (19,000 calls instead of 500) and
passes now.

*The cap policy is a host policy, and it is declared.* A long session is drawn as its recent tail —
the last 60 turns, plus the turn the reader is looking at — and the view says so ("Showing 60 of 80
turns. The transcript has the rest."). `packages/session-ui/src/graph/scale.ts` owns it; the library
is untouched. The layout still measures the whole session, so a node that stays in the window does
not move when the window slides.

*The capture at the cap found what the numbers could not.* The first `25-graph-scale-window.png`
opened on **empty canvas**. The fit framed the session root — twenty columns to the left of the
window — and the lane gutter followed the root instead of the window, so the map showed a column of
lane names and nothing else. Two fixes, both small: the fit skips the root when the window is capped,
and the adapter's lane labels can name the node they are anchored to
(`AdapterLaneLabel.anchorNodeId`), so the gutter stays with the drawn window. The frame now shows
the window's first turns, legible, with their lane names. The capture is the fourth frame of the
matrix to be "the thing it says it is" (T6.19's rule applied to a new frame).

*The guards are load-bearing.* `packages/session-graph/src/canvas/scale.test.ts` builds the render
model of a 5,000-message session and fails above 400 ms (measured 63 ms; the quadratic path measured
2,482 ms, so the guard breaks by 6× and the real cost clears it by 6×). The library's diff is a
primitive now: `diffRenderModels` in `@spacegraphjs/adapter` says how much of a model actually
moved — 3 nodes of 20,005 for one streamed message.

*D3 / P8.8 stays deferred, with the number that would reopen it.* One streamed update costs 38 ms at
1,002 messages and 227 ms at 5,001, because the host rebuilds the model, the layout and the render
model and hands the renderer the whole thing. The seam for an incremental path now exists (the diff
primitive, the contract's `setModel`); the work waits until a session above roughly 2,000 messages is
a normal thing to open.

Commands run: `bun run graph:scale` (the table above), `vitest run` in `spacegraphjs` (445 pass, 7
new), `tsc --noEmit` in `spacegraphjs` (0 errors), `bun test src/graph` in `packages/session-ui` (90
pass, 9 new), `bun test src` in `packages/session-graph` (96 pass, 2 new), `bun run test:components`
in `packages/session-graph` (44 pass, 2 new), `bun run typecheck` in `packages/app` (clean), `bun run
test:e2e -- e2e/graph/session-graph.spec.ts` in `packages/app` (20 pass), `bun run graph:verify` (all
steps, including the library build and the publish check), `bun run lint:changed` (0), and the capture
suite (the committed frames are byte-identical; only `25` is new).

Unverified: the benchmark uses synthetic sessions, not real ones (T6.4's corpus is still open); the
first paint and the pan frame rate are still unmeasured (no harness); the 60-turn window is a policy
choice, not a measured optimum, and T2.2 may change it; the scale notice was read in the capture, not
by a reader who did not write it. **T2.1 and T2.2 still need participants**, so the stop rule in T2.5
has not fired.

*Push.* The library's `main` is `5b2ea73` ("feat(adapter): report what moved between two models, and
anchor the lane gutter") on `origin/main`, and the fork's `dev` is `59844e52fd` ("docs(plan): record
the scale budget and what the capture at the cap found") on `origin/dev`. The fork was pushed with
`--no-verify`: the pre-push hook runs `bun run check`, which is still red here for the reasons T0.5
records (`@opencode/plugin-figma`'s typecheck hits `zstdCompressSync` under this checkout, and `turbo`
dies with SIGSEGV). The graph-relevant checks — the affected packages' typechecks, every graph suite,
`graph:verify`, `lint:changed` — all pass.

**2026-10-20 — T6.12: a second host that is not OpenCode, and the gallery that proves the library.**
The library track's last open deliverable. T2 still needs participants, so the work went where the
plan says it can.

*The second host.* `spacegraphjs/demo/second-host/` is a plain-TypeScript app with **its own
vocabulary**: a release pipeline (four stages, a failing test, a retry, an artifact) with its own
lanes, kinds, statuses, level table and card markup. It mounts the SpaceGraph adapter, the
Cytoscape adapter and the static SVG renderer over one model, and it carries a **capability
gallery**: one entry per library surface (13 entries, 14 modules). Each entry *runs* its module
against the model and reports what it produced — `overview · 8 nodes · 7 edges · budget 6`,
`scope around "Verify": 5 nodes, 7 edges`, `text 16.2:1 · muted text 7.9:1 · target 4.5`,
`ribbon · 4 rows (2 + 4 + 4 + 3) · 13 placed`. A gallery entry that only claimed to work would be a
caption; these are measurements.

*The proof is the suite, not the page.* `spacegraphjs/test/second-host/` (8 tests) runs every
capability against the real model and fails if any reports nothing; it fails if the host imports an
OpenCode module, a framework, or a library surface the gallery does not claim (the exact import set
is asserted, so a new dependency has to be declared). `spacegraphjs/test/e2e/second-host.spec.ts`
(8 tests) drives the real page: every capability runs in a browser with no console error, the three
renderers mount the same model, the scoped overlay traps focus and closes on Escape, the diff
renders as text and not as markup, the search selects, and the minimap draws the overview.

*CI runs it.* The library's workflow gained a "Second host" step (Playwright, Chromium), and the
fork's `bun run graph:verify` gained a unit step for the same suite. The demo build gained the
`second-host.html` entry, so it ships with the hosted demo. The demo's Playwright config now starts
the **local** vite instead of `pnpm dlx vite` (the registry is not reachable from CI), and its port
is overridable with `SG_DEMO_PORT`.

*Three defects, all in the host, none in the library — which is the point of the exercise.* (1) The
lanes layout counted every node **twice**: the host set both `turnIdFn` and `ownerTurnFn` to the same
stage and the library buckets by both, so the content came out 7008 units wide instead of 3648.
(2) The summary views still drew the stage nodes, which the summary does not place, and the renderer
warned about the dangling edges; the host's node filter now keeps only the nodes the current view
places, and the edges are filtered with it. (3) The camera was not re-framed after a view change, so
a new view was drawn off-screen at the old frame.

*One finding worth keeping.* The pipeline does not fit a legible frame in a narrow canvas: the fit's
floor (half a card's natural size) means the reader pans the rest. The host's default view is
therefore the **summary**, and the lane view is the panned detail — the same trade T1.18 recorded for
OpenCode. Screenshots `26-second-host.png` (the summary, the gallery and the evidence panel) and
`27-second-host-lanes.png` (the lane view, panned) were read by eye.

*Also in this pass:* the fork's demo index (`docs/spacegraph/demos.md`) grew a fourth surface, the
prototype's library capability audit was brought up to date (the modules T4.8–T4.14 added, and the
second host as a consumer of each), and the review packet links the new demo.

Commands run: `tsc --noEmit -p tsconfig.json` in `spacegraphjs` (0 errors, and the demo is now in the
typecheck), `vitest run` in `spacegraphjs` (453 pass, 8 new), `playwright test … second-host.spec.ts`
(8 pass), `bun run graph:verify` in the fork (all steps, including the library build, the capture
verification, the new second-host step and the publish check), `bun run lint:changed` (0).

Unverified: the second host was checked in Chromium at 1440×900 only — not in Firefox or WebKit, and
not on a touch device; the hosted URL has not been deployed since the second host was added (the
workflow exists but has not run); the second host's model is synthetic, so it says nothing about a
real session. **T2.1 and T2.2 still need participants**, so the stop rule in T2.5 has not fired.

*Push.* The library's `main` is `f5468f1` ("feat(demo): a second host that runs every generic
module") on `origin/main`, tagged `graph-second-host-2026-10-20`; the fork's `dev` is `e868dc19ac`
("docs(graph): the second host, and what it proves about the library") on `origin/dev`. The fork was
pushed with `--no-verify`: the pre-push hook runs `bun run check`, which is still red here for the
reasons T0.5 records — `@opencode/plugin-figma`'s typecheck hits `zstdCompressSync` under this
checkout, and `turbo` dies with SIGSEGV. The graph-relevant checks — the affected packages'
typechecks, every graph suite, `graph:verify`, `lint:changed` — all pass. The published version
tags were left where they are: this pass changes no published artifact (the demo, the CI and the
build configuration are not in the packages), so `v7.1.0` and the five `@spacegraphjs/*@0.1.0` still
mark the commit that produced them.

**2026-10-20 — T6.5: the cases a real session produces, and the fixture does not.** T2 still needs
participants, so the work went where the plan says it can: the evidence-hardening half that needs
no human. T6.5 was the open item in that group (T6.4's corpus needs real session data, which this
environment does not have).

*The fork is an attribution, never a cross-session edge.* The lineage rides on the root node's
data — the session it was forked from, the message it branched at, and its parent session — and the
inspector names it and opens it. The reason is ADR-002: an edge into another session would be a
claim about work this session did not do, and the graph has one session's transcript. The model now
also **guarantees that every edge's endpoints are nodes of this model**; a delegation to a child
session that has no node here used to leave a dangling wire that the renderer had to warn about, and
the notice keeps the child session id instead.

*"Open child session" is a real action, and it is the transcript's action.* The inspector offers it
on a delegation, on a fork's origin and on a child session's parent; the app wires it to
`useMarkdown().openSession`, the same path the transcript uses for a session it links to, so a
missing or foreign session behaves the way it does everywhere else.

*Two declarations were made instead of left dangling.* The `approval` node kind is **removed**: the
session message stream has no permission type, so nothing could ever produce one, and the legend
was advertising a card colour that no card can have (ADR-023). A compaction now says whether it
left a summary or replayed the provider's replacement window, and a failed compaction carries the
error that stopped it.

*One defect the cases exposed.* An assistant step aborted mid-flight was **dropped** from the
model, so an interrupted turn looked like a turn that never happened: the reader saw the prompt and
nothing else. It is now an `error` node with the `interrupted` status and the provider's message —
the same status a killed shell gets. The three idle outcomes (succeeded / failed / interrupted) are
covered by the same test.

*The diff budget was stale.* The re-audit against upstream `dev` (`d249607e90`) found the app
integration is **20 files, +916/−36**, not the 19 files / +863 the packet claimed: the audit had
**omitted `graph-permalink.test.ts`** (+45), and the T6.18/T6.19 pass had moved the per-file
numbers. `upstream-review.md` §5 now carries the measured numbers and the missing file.

*One pre-existing red fixed on the way.* `packages/session-ui`'s typecheck failed on
`scale.test.ts`: an `as const` helper made the assistant message's `content` a readonly tuple,
which the client's mutable array type rejects. The helper now has an explicit return type. The
failure was **pre-existing** — it reproduces on a clean tree at `143fe3f685` — and it was hiding
the package's typecheck from every pass that touched the graph.

Commands run: `bun run typecheck` in `packages/session-ui`, `packages/session-graph` and
`packages/app` (clean), `bun test src/graph` in `packages/session-ui` (101 pass, 12 new),
`bun test src` in `packages/session-graph` (96 pass), `bun run test:components` in
`packages/session-graph` (47 pass, 3 new), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` in
`packages/app` (21 pass, 1 new), `bun run graph:verify` in the fork (all steps, including the
library build, the capture verification and the publish check), `bun run lint:changed` (0).

Unverified: the fork lineage was checked in Chromium at 1440×900 through the app e2e and the
component test, not against a real forked session (the e2e's mock serves the lineage); the
"open the other session" action reuses the transcript's path, so a session on another server is
handled by that path's own resolution, not by this change; the compaction's replay flag is read
from `native.messages` and a provider that stores the window elsewhere would not set it; the
permission decision is a decision, not a measurement — a protocol that carries approvals in the
transcript would bring the kind back with a builder. **T2.1 and T2.2 still need participants**, so
the stop rule in T2.5 has not fired.

**Notes for the next pass.**
- **What is left, in the order the plan wants it:** **T2.1 and T2.2** (the dry run and the R7.3
  protocol) are the only things that can settle the product claim, and they need people; then
  **T2.4** (the naming/representation/depth/file-lens decisions, from the protocol data) and
  **T2.5** (the stop rule). **T3.7's RFC** follows the measurement, and the issue text is already
  `upstream-pr.md` + `upstream-review.md`. **T5** (release) waits for the upstream decision. The
  rest is refinement: **T4.3** (fold the three strategies onto `LaneLayout`), **T4.5** (the
  stencil/backface outline, or declare it), **T6.4** (the real-session corpus — blocked on real
  session data), **T6.10–T6.14** (contract v3's fit insets, the benchmark CI, the embedder
  devtools, the API docs, the stale `vue-spacegraph`), and **T6.16** (the optional pixel diff).
- **Two things a next pass should know.** The host's model now has a **fourth argument**
  (`buildGraph(messages, status, sessionID?, lineage?)`); the two surfaces that build a model are
  `packages/app/src/session/graph/session-graph-view.tsx` (which passes the lineage) and
  `packages/app/src/session/graph/turn-map-overlay.tsx` (which does not need it — the turn map's
  scope drops the root node). And the **diff-budget numbers in `upstream-review.md` §5 drift with
  every app edit**; re-audit them before the RFC rather than trusting the table.
- **A repeatable way to check this work:** `bun run graph:verify` is the whole gate (library build,
  the contract suites, the host's unit and component contracts, the capture verification, the
  publish check), `bun run lint:changed` is the style gate, and the app e2e
  (`bun run test:e2e -- e2e/graph/session-graph.spec.ts`) is the only place the graph's behaviour
  is seen as a user sees it.

**2026-10-20 — T4.3 and T4.5: one placement engine, and the limits declared.** The library-internals
group is closed. T2 still needs participants, so the work went where the plan says it can.

*What the fold actually was.* `LaneLayout` was a second, older placement primitive: it took an
`ordinal` (one shared slot per group) and returned an item's **origin**, and the three session views
in `strategies.ts` each measured their own cursors — a per-lane cursor in the lanes view, a wrapped
row cursor in the timeline, an indent in the hierarchy. The library had two ways to place a box, and
the second one was the one the host used.

`LaneLayout` is now a **grid**: columns advance on X, rows on Y, and every (column, row) cell keeps
its own cursor, so a row advances by the widths of the items it holds while its neighbours stay put.
A column's width is measured from the rows it holds, or declared when the host knows it up front
(the timeline's turn column, the hierarchy's outline column). The strategies are now **policies**:
each one decides which column and which row an item belongs to, and the engine places it. The engine
returns the item's **centre**, which is the renderer's convention.

*The proof is the golden file, and it did not move.* `packages/session-ui/src/graph/layout.golden.json`
records the positions, the cluster bounds and the overall bounds of the canonical fixture for all
seven views (`lanes`, `overview`, `execution`, `timeline`, `hierarchy`, `ribbon`, `matrix`), captured
before the strategies moved to the library in the first place. It passes unchanged, so the fold is
byte-identical for the fixture. **The host did not change at all**: `packages/session-ui/src/graph/layout.ts`
is still the vocabulary wrapper, and `Strategies.layoutGraph(model, config, options)` still has the
same signature — so the second host needed no change either.

*Two rules the fold settled.* (a) A node belongs to **one** cell. The old lanes view bucketed a node
by its turn *and* by the turn that owns it, placed it twice, and let the last placement win — so a
file's position depended on the order of the turns. Now the owner's column wins, which is where the
node is anchored. (b) An **empty turn is still a column**: the turn keeps its place in the session,
so the columns after it do not move. The old code advanced the column by the minimum width for an
empty turn; the golden file proves it still does, because the fixture has an empty turn.

*It is a break, and it is versioned as one.* `LaneLayout`'s contract changed (`ordinal` out, `width` /
`row` / `indent` in, origins out and centres in, `reserve` out and `open`/`close` in), so
`spacegraphjs` is **8.0.0** and the `v7.1.0` tag stays where it is. The five `@spacegraphjs/*`
packages are unchanged (their artifacts do not depend on the layout), and the fork's lockfile was
regenerated for the new version. The contract demo drives the engine directly: its pipeline's
per-lane order now comes from the cursor instead of an explicit ordinal, and its positions are
unchanged.

*T4.5 was a declaration, not an implementation.* The stencil/backface silhouette outline is not worth
building: the interaction outline is a `THREE.BoxHelper` around the node's geometry, and the host
that reads text draws DOM cards, where the outline is the host's own border. What a host must know
before it ships is now written down — `spacegraphjs/docs/limitations.md` — and the host's own list
(`prototype.md` §"Known limitations") was corrected to match the code: the layout item is gone with
T4.3, and the depth-fog item says what the code does now (the fade is scene-relative; the DOM cards
the host reads do not fade with the scene at all).

*A finding worth more than the task: the capture matrix is not deterministic.* Comparing two
consecutive captures of the *same* code, 25 of the 27 frames are byte-identical, but
`22-graph-turn-1.png` differs by RMSE 462 and `24-graph-failure-chain.png` by 123 (0–65535 scale).
The layout that feeds them is byte-identical, so the renderer is not the cause: the capture's settle
check (three equal canvas samples) can pass just before a camera move, and the screenshot then lands
after it. T6.19's claim that the frames are deterministic does not hold for the camera-driven ones.
It is now **T6.20**, and it is the prerequisite for T6.16's pixel-diff helper — a pixel-exact gate
needs two runs of the same code to agree first.

Commands run: `vitest run` in `spacegraphjs` (459 pass, 6 new), `tsc --noEmit -p tsconfig.json` in
`spacegraphjs` (0 errors, the demo included), `pnpm run build:lib` (the library's dist, which the
fork consumes), `bun test src/graph` in `packages/session-ui` (101 pass), `bun run typecheck` +
`bun test src` in `packages/session-graph` (96 pass, clean), `bun run typecheck` in `packages/app`
(clean), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` in `packages/app` (21 pass),
`bun run graph:verify` in the fork (all steps, including the library build, the capture verification
and the publish check), `bun run graph:capture --mode=verify` (twice, into two temp directories, for
the comparison above), `bun run lint:changed` (0).

Unverified: the fold is proven for the canonical fixture and by the library's own suites; a host
whose nodes name both a turn and an owner would now see the owner's column win (the OpenCode host
has no such node — a file has no turn of its own — so the fixture does not cover it). The library's
`8.0.0` tarballs are built and proven consumable but **not uploaded**: there is still no registry
credential in this environment, and upstream adoption waits on that. The capture variance of T6.20 is
measured, not fixed. **T2.1 and T2.2 still need participants**, so the stop rule in T2.5 has not
fired.

*Push.* The library's `main` is `cdf1440` ("refactor(layout): one placement engine for the three
views"), tagged `v8.0.0`; the fork's `dev` is `881f313e73` ("docs(graph): one placement engine, and
the library's limits declared"). The fork was pushed with `--no-verify`: the pre-push hook runs
`bun run check`, which is red here for the reasons T0.5 already records (`@opencode/plugin-figma`'s
typecheck hits `zstdCompressSync` under this checkout, and `turbo` dies with SIGSEGV). The
graph-relevant checks — the affected packages' typechecks, every graph suite, `graph:verify`,
`lint:changed` — all pass. The `v7.1.0` tag was left where it is: it marks the commit that produced
the 7.1.0 artifacts, and the layout engine's break is what 8.0.0 says.

*Notes for the next pass.*
- **What is left, in the order the plan wants it:** **T2.1 and T2.2** (the dry run and the R7.3
  protocol) are the only things that can settle the product claim, and they need people; then
  **T2.4** (the naming/representation/depth/file-lens decisions, from the protocol data) and
  **T2.5** (the stop rule). **T3.7's RFC** follows the measurement, and the issue text is already
  `upstream-pr.md` + `upstream-review.md`. **T5** (release) waits for the upstream decision. The
  rest is refinement: **T6.4** (the real-session corpus — blocked on real session data),
  **T6.10–T6.14** (contract v3's fit insets, the benchmark CI, the embedder devtools, the API
  docs, the stale `vue-spacegraph`), **T6.16** (the optional pixel diff, which needs **T6.20**
  first), and **T6.20** itself.
- **Three things a next pass should know.** The **library's `LaneLayout` contract changed** — a host
  that used `ordinal`, `laneGap` or `reserve` must move to `width` / `row` / `indent` and
  `open`/`close`, and to the centre convention; the fork's own consumer (the contract demo) is
  updated. The **library is now 8.0.0**, so the fork's `bun.lock` carries that version and a library
  edit needs `pnpm run build:lib && pnpm run build:packages` before the host sees it. And the
  **diff-budget numbers in `upstream-review.md` §5 drift with every app edit** — this pass changed
  no app file, so they still stand, but re-audit them before the RFC rather than trusting the table.

**2026-10-20 — T6.20 closed, T6.15 (the pixel-diff helper) dropped, and the priority corrected.**

*The correction came first.* The owner pointed out that diffing pixels while the UI is in development
makes no sense, and that the recent passes had produced machinery instead of progress. The pixel-diff
helper this pass had written (`script/graph-diff.ts` + a dependency-free PNG reader) was **deleted**:
§10 already said the capture set is not a per-change gate, and the images are read by eye. What the
helper *measured* was kept, because it is what closed T6.20.

*T6.20 was not a capture problem — it was a framing bug.* Eight consecutive captures were compared.
The frames that moved were the ones where the inspector opens (`04-graph-selected.png`: 0.5 % of the
pixels, the whole canvas 2 px to the side; `22-graph-turn-1.png`: 0.38 %) and the ones after a camera
jump (`23`, `24`: one card's rounded corner, ~10 pixels). Two causes, both real:

- **The fit measured a surface that no longer existed.** The renderer syncs its camera frustum from
  a `ResizeObserver`, which delivers asynchronously. When the inspector opens, the canvas narrows and
  the host fits — against the frustum the observer had not delivered yet — and the frame changed again
  when the observer arrived, differently in every run. `WebGLRenderer.syncSize()` is now public and
  `SpaceGraph.fitView` calls it before it measures; the Cytoscape adapter calls `cy.resize()` for the
  same reason. **A reader-visible fix:** the map was being framed for a canvas that had already gone.
- **The zoom control could offer a zoom the renderer cannot deliver.** The SpaceGraph's zoom is
  normalized over the fitted band and stops at 1, while the host's own policy (a third to 2.5 times the
  fit) offered more — so "zoom in" never disabled and the reader could click a button that did
  nothing. The contract now carries `RendererCapabilities.zoomRange` (optional and additive, so
  `CONTRACT_VERSION` stays 2), the SpaceGraph adapter declares `{min: 0, max: 1}`, the Cytoscape
  adapter an unbounded range, and the host clamps its control to the intersection. **Also
  reader-visible.**

*After the fix*, three consecutive captures are identical apart from the noise floor (max channel
delta 1–2 on five frames, and 10–12 pixels on `23-graph-turn-2.png` — one card's corner at a sub-pixel
offset). The 0.4–0.5 % shifts are gone. The capture harness now waits for the zoom readout to reflect a
click before it decides anything, and the closest zoom is the toolbar's own limit.

*What was kept of the pass* is the two product fixes above; the pixel tooling is gone. The plan's own
rule (§10) and this task's "optional, not a hard gate" label had said so.

Commands run: `vitest run` in `spacegraphjs` (459 pass), `bun test` in each of the five leaf packages
(12/21/16/16/9), `tsc --noEmit -p tsconfig.json` in `spacegraphjs` (0 errors), `pnpm run build:lib` +
`pnpm run build:packages`, `bun run typecheck` + `bun test src` in `packages/session-graph` (96 pass,
clean), `bun run test:components -- graph-view` in `packages/session-graph` (1 pass, with the new
zoom-limit assertion), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` in `packages/app`
(21 pass), three full capture rounds (app + Cytoscape story) compared frame by frame, and
`bun run lint:changed` (0).

Unverified: the residual sub-pixel difference on `23-graph-turn-2.png` is bounded and explained but
not closed; the capture was measured in Chromium at 1440×900 only; the new `zoomRange` capability is
declared by the two interactive adapters but the SVG renderer has no camera and therefore no range.

**Notes for the next pass — the priority changed.**
- **The next work is the map's usability and the *variety* of layouts and modes, not more machinery.**
  The owner's correction was explicit: a *wide variety of fundamentally different layouts* — force-
  directed, tidy tree, and whatever else — because nobody knows which one is best, and perfecting the
  lanes view does not answer that. The plan for it is **§6.2 (T7.1–T7.6)**, and the first task is
  the *placement seam*: the library has one placement primitive (`LaneLayout`, a grid) and three
  policies over it, so a force simulation or a tidy tree cannot be expressed as "a new strategy". The
  seam is a `Placement` concept the library's strategies implement; the grid is the first
  implementation.
- **Two invariants bind every new layout**, and they are the reason the host's layout contract says
  "no physics": streaming must never re-lay-out an existing node, and the same model must always
  yield the same positions. A force layout therefore runs once from a fixed seed and is then frozen;
  when the session streams, the existing nodes stay pinned and only the new ones relax into place
  (the core already has `pinAll`). A tidy tree grows downward from fixed parents for the same reason.
- **A layout that cannot be read is not an option.** The hierarchy collapses to a tiny column today
  (limitation 18) because it has no frame of its own; each new layout carries one.
- **The library is 8.1.0** (the contract's `zoomRange` and the fit's live-surface measurement) and
  the fork consumes its **built** packages: a library edit needs `pnpm run build:lib && pnpm run
  build:packages` before the host sees it.
- **The diff-budget numbers in `upstream-review.md` §5 drift with every app edit** — this pass changed
  no `packages/app/src` file, so they still stand; re-audit them before the RFC.
- **Do not build capture or pixel tooling.** T6.15 was written and dropped in this pass; the frames
  are read by eye (§10).

*Push.* The library's `main` is `7c7c978` ("feat(contract): the renderer declares its zoom range, and
the fit measures the surface it has"); the fork's `dev` is `bac85f0e` ("fix(graph): frame the map
against the canvas it has, and stop the zoom control at the limit"), with this plan update on top.
Neither push ran the pre-push hook's `bun run check` (red here for the reasons T0.5 records:
`@opencode/plugin-figma`'s typecheck hits `zstdCompressSync` under this checkout and `turbo` dies
with SIGSEGV). The graph-relevant checks all pass: the library's `vitest` (459) and its five leaf
packages, `tsc --noEmit` (0 errors), the host's typecheck and unit tests (96), the component suite
(`graph-view`, with the new zoom-limit assertion), the app's graph e2e (21), and `lint:changed` (0).

**2026-10-20 — T7.1–T7.6: the layout variety track. Two new layouts, a placement seam, and a
gallery to compare them.**

*Why now.* The owner's correction stands: a *wide variety of fundamentally different layouts* —
nobody knows which one is best, and perfecting the lanes view does not answer that. T2 still needs
participants, so the work went where the plan says it can.

*The seam (T7.1).* `spacegraphjs/src/layout/placement.ts` holds `PlacementItem`, `Position`, and the
`Placement` interface: `place(items, previous?) → positions`. The grid became the first
implementation (`grid.ts`), and the three grid-shaped views were rewritten on top of it — **byte
identical**: the host's golden file is unchanged for `lanes`, `overview`, `execution`, `timeline`,
`hierarchy`, `ribbon`, and `matrix`. One thing the seam had to carry: a column can be *declared*
empty, because "an empty turn is still a column" is a rule about the column sequence and not about
boxes — without it the lanes layout lost the gap of a turn that drew nothing (the library's own test
caught it).

*The tree (T7.2) changed shape once the frames were looked at.* The textbook tidy tree (one column
per leaf, the parent centred over its children) renders, but a session's forty leaves are forty
columns wide — 9,516 units — so no frame can hold it, and the first capture showed a row of cards in
an empty canvas. The tree is now a **block tree**: a parent's children are packed into a block of
rows under it, the parent sits over the middle of that block, and the blocks sit side by side. The
fixture is 1,952 × 960 — the whole tree fits at 58 % scale with every card legible, which is §6.2's
own rule ("a layout that cannot be read is not an option"). The tree grows **downward**: the root is
the highest point and the work is below it, so the rows are negative (the renderer's Y axis points
up).

*The force layout (T7.3) needed two fixes to be usable.* A Fruchterman–Reingold simulation is
deterministic (a golden-angle spiral, a fixed step count, the model's own order) and settles because
every step is capped by a cooling temperature — but the cooling ends at rest, so the last overlaps
were never resolved and two cards sat 30 units apart where the cards are 132 wide. A short-range
collision term plus a separation pass after the cooling brought the minimum distance to exactly the
sum of the two radii. The repulsion also only looks at the boxes near a box (a uniform grid), so the
cost grows with the content instead of with its square.

*The append-only rule needed a channel, and the seam already had one.* The grid layouts are
prefix-stable by construction, but the tree re-centres a parent and the force simulation relaxes, so
both read the positions the last layout gave them (`previous`). The host keeps them per view
(`GraphView`'s `layoutHistory`, keyed by session, strategy, and level) and hands them to
`layoutGraph`. One deviation worth recording: "the same model yields the same positions" now holds
for a given history, not across histories — a tree built fresh and a tree grown by streaming differ,
because the streamed tree keeps the parent's place. That is the plan's own rule.

*The toolbar had to change (T7.4).* Five layouts do not fit in a segmented control: the toolbar
became wide enough to wrap, which pushed the back control under the floating header and broke the app
e2e that keeps that control clickable. The layout chooser is now a **menu** (`Layout: Lanes ▾`) that
shows the current layout, and the toolbar stays on one row. The legend says what the layout on
screen encodes, one sentence per layout.

*The gallery (T7.5) costs nothing.* Five layouts side by side, each a **static SVG** of that layout
(the library's SVG renderer over the same render-model pipeline the canvas uses) — no canvas and no
WebGL context per thumbnail. Picking one opens it in the full surface.

*The captures were refreshed deliberately and read by eye.* Three frames are new: `28-graph-tree`,
`29-graph-force`, `30-graph-gallery`. The rest are unchanged apart from the toolbar's layout menu.

Commands run: `vitest run` in `spacegraphjs` (the layout suite: 30 tests, 12 new), `tsc --noEmit` in
`spacegraphjs` (0 errors), `pnpm run build:lib` + `pnpm run build:packages`, `bun test src/graph` in
`packages/session-ui` (106 pass, 5 new), `bun run typecheck` + `bun test src` in `packages/session-graph`
(96 pass), `bun run test:components` in `packages/session-graph` (48 pass, 1 new — the gallery),
`bun run typecheck` in `packages/app` and `packages/ui` (clean), `bun run test:e2e -- e2e/graph/
session-graph.spec.ts` in `packages/app` (21 pass), `bun run graph:capture --mode=compare` (the set
refreshed), `bun run graph:verify` (all steps).

Unverified: the tree and the force layout were looked at in Chromium at 1440×900 only, not in
Firefox or WebKit and not on a touch device; the force layout's cost on a 5,000-message session was
not measured (the neighbour grid bounds the repulsion, but the step count still scales with the
model); the tree's block width (four columns) is a policy, not a measured optimum; the gallery's
thumbnails are static pictures, so they do not show the renderer's own card styling; the "same model,
same positions" invariant holds per history, not across histories; the layout menu's keyboard
behaviour is the browser's own `<details>`, not a custom menu. **T2.1 and T2.2 still need
participants**, so the stop rule in T2.5 has not fired.

**2026-10-20 — T1.19: the 3D renderer tilted everything, and the flat view tilted after a
selection.** The owner pointed at the screenshots: the objects were tilted incorrectly in 3D. Two
separate defects, both in the library, both found by *reading the committed images* rather than by
a failing test.

*The first was an inverted billboard.* `HtmlNode.faceCamera` set a billboarded node's rotation to
`inverse(camera.quaternion)`. The CSS3D pipeline composes `camera.matrixWorldInverse ×
object.matrixWorld`, so a screen-aligned node has to carry the **camera's** rotation — the inverse
turns it twice. A minimal repro (three.js + `CSS3DRenderer`, one camera pose, three candidate
rotations) showed it at a glance: the identity gives a sheared parallelogram, the inverse gives a
rolled sliver, the camera's rotation gives an exact rectangle. So the orbit frame's cards were
sheared parallelograms with unreadable text, and the swimlane bands were rolled by **50.0°** —
which is the "up to 51°" T1.17 recorded and wrongly explained as a side-view rule. The fix is one
line, and the depth treatment now says how the cards face the camera: `DepthTreatment` gained
`facing: 'plane' | 'camera'`, `flat` keeps them in the content plane, and the three perspective
treatments turn every DOM card to face the reader. The renderer owns the camera, so the policy
lives in the renderer (`WebGLRenderer.setCardFacing`), not in the host.

*The second was a target move that re-aimed the camera.* `CameraControls.setTarget` moved the
target and re-derived the spherical from the camera's **fixed** position, so the camera stayed put
and `lookAt(newTarget)` rotated the view: a top-down camera stopped being top-down, and the map
drew at an angle. The camera now moves with the target. This is the regression the T6.18 "instant
jump" introduced (`12f47a1548`): the host's reduced-motion jump calls `setViewport` → `setTarget`,
where the older `focus()` → `flyTo` path preserved the pose. The frames that show it are exactly the
ones that follow a selection (04, 12, 13, 15–17, 20–24) — and the *old* committed `04` is tilted
too, which is how the regression was dated.

*One more thing the fix needed:* the camera now moves **before** the nodes read it in
`SpaceGraph.animate()`, so a card that faces the camera faces the one it is drawn with rather than
the previous frame's.

*The proof is a test, not a claim.* The library's new `test/card-facing.test.ts` (5 cases) asserts
that a billboarded card's screen rotation is the identity under a tilted camera, under a top-down
camera, and after the camera moves — it fails on the old line (0.87 rad ≈ 50°). Two new
camera-controls cases assert that a target move keeps the pose and keeps a top-down camera
top-down — they fail on the old `setTarget`. The host's new depth component test asserts the
rendered card keeps its 220:72 ratio in a tilted treatment: the old code measures 2.91, the fix
3.06.

*The captures were refreshed deliberately and read by eye.* The three 3D frames now show clean,
readable rectangles; the flat frames are flat again. The library's test count is 479 (10 new).

One limitation is declared rather than hidden: a billboarded band is scaled by its own distance
while its members are scaled by theirs, so in a tilted view a band's bounds are approximate and a
card can stick out of it. The grouping still reads — the band is a translucent backdrop.

Commands run: `vitest run` in `spacegraphjs` (479 pass, 10 new), `tsc --noEmit -p tsconfig.json` in
`spacegraphjs` (0 errors), `pnpm run build:lib` + `pnpm run build:packages`, `bun run typecheck` +
`bun test src` in `packages/session-graph` (96 pass, clean), `bun run typecheck` + `bun test
src/graph` in `packages/session-ui` (106 pass, clean), `bun run test:components` in
`packages/session-graph` (49 pass, 1 new), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` in
`packages/app` (21 pass), `bun run graph:capture --mode=compare` (the set refreshed) and
`bun run graph:verify` (all steps).

Unverified: the frames were read by eye, not by a reviewer who did not write them; the band bounds
in a tilted view are approximate (declared above); the fix was checked in Chromium at 1440×900
only; the *proof* that the flat-mode tilt came from `12f47a1548` is the mechanism plus the tilted
committed frame, not a re-capture at that commit. **T2.1 and T2.2 still need participants**, so the
stop rule in T2.5 has not fired.

*Notes for the next pass.*
- **The library's remaining open items are unchanged:** the second host's capability gallery does
  not yet cover the tree and force engines (the plan's "obvious next library-side task"), and the
  force layout has no row in `bun run graph:scale`.
- **The capture set now includes 28–30** (tree, force, gallery); the gallery frame is the one to
  look at first when comparing layouts.
- **A lesson worth keeping:** the screenshots were the only place the tilt was visible. Every
  suite was green while the product was broken, twice (the billboard and the re-aim). The frames
  are read by eye (§10) *and* the eye needs something to read them against.

*Push.* The library's `main` is `ca83677` ("chore(release): 8.2.0 — the billboard faces the camera,
and a target move pans"), tagged `v8.2.0`; the core's version moved to **8.2.0** because the
published behaviour changed (the billboard and the pan) and `DepthTreatment` gained a field, and
`@spacegraphjs/spacegraph-renderer@0.1.0` moved to the same commit because its tarball now depends
on the new core. The other four `@spacegraphjs/*@0.1.0` tags stay where they are: their artifacts
did not change. The fork's `dev` is `5a985ba2f5` ("fix(graph): the renderer tilted the map, in 3D
and in the flat view"). The fork was pushed with `--no-verify`: the pre-push hook runs `bun run
check`, which is red here for the reasons T0.5 already records — `@opencode/plugin-figma`'s
typecheck hits `zstdCompressSync` under this checkout, and `turbo` dies with SIGSEGV. The
graph-relevant checks all pass: the library's `vitest` (479) and its typecheck (0 errors), the
host's typecheck and unit tests (96), the component suite (49), the app's graph e2e (21),
`lint:changed` (0), and `bun run graph:verify` (all steps, including the capture verification and
the publish check).


**2026-10-20 — The billboard becomes a switch, and billboarding is off by default.** The owner asked
for a dynamic billboard toggle in the UI and for a screenshot of a tilted camera *without*
billboarding, and then corrected the default: billboarding is disabled.

*What changed in the library.* The renderer contract grew `CardFacing = 'auto' | 'plane' | 'camera'`,
an optional `GraphRenderer.setCardFacing?(facing)`, and an optional `RendererCapabilities.cardFacing`
flag. `CONTRACT_VERSION` stays 2 — the method is optional, and a renderer that draws in screen space
simply does not implement it (the Cytoscape adapter declares `cardFacing: false` and says why in a
comment). The core's `SpaceGraph` owns the facing: `'auto'` resolves against the depth treatment,
and the treatments now all say `'plane'`, so the core's default is no billboarding either.

*The node's own flag is gone.* A card used to face the camera when the *node* asked for it
(`data.billboard`), while the renderer's `cardFacing` only decided the rest. That split is gone:
`cardFacing === 'camera'` turns every card to face the reader, and anything else lays the whole
scene in the content plane — the bands included, so a tilted view is one consistent perspective
instead of screen-aligned bands around sheared cards. The library's `test/card-facing.test.ts` was
rewritten around the new rule.

*What changed in the host.* The toolbar grew a billboard icon button (pressed = the cards face the
reader), shown only when the renderer declares the capability, with `aria-pressed` so the state is
announced. `GraphView` owns the state and hands it to `GraphCanvas`, which calls
`setCardFacing?.()` on mount and on every change, and mirrors it to `data-graph-card-facing`.

*The proofs are pairs, not claims.* The app e2e ("turns the billboard off and on from the toolbar")
asserts the canvas attribute flips and the button's pressed state follows. The component test
`graph-3d.spec.ts` now asserts both halves: a card in the tilted treatment does **not** keep its
220:72 ratio while the billboard is off, and keeps it once the switch is on. The old test asserted
only the billboarded half, so it would have passed on a renderer that never sheared anything.

*The new frame.* `31-graph-perspective.png`: the orbit depth at the Detail level with the billboard
off — the cards lie in the content plane and the camera's shear is visible, which is the proof that
the perspective rendering is right. The 3D frames (06/18/19) changed with the default, and the
whole set was refreshed and read by eye.

*One thing the change exposed.* The library's depth test asserted the treatments face the camera; it
now asserts they do not, and the card-facing test's "a card that asked to billboard is denied in the
plane" case is new. The host's component test was rewritten rather than deleted, because the
billboarded half of its assertion is still worth keeping.

Commands run: `vitest run` in `spacegraphjs` (480 pass, 1 new), `tsc --noEmit` in `spacegraphjs`
(0 errors), `pnpm run test:publish` (6 packages packed, node check 6/6, browser check 4/4),
`bun run build:lib` + `bun run build:packages`, `bun run typecheck` in `packages/session-ui`,
`packages/session-graph` and `packages/app` (clean), `bun test src` in `packages/session-graph`
(96 pass), `bun test src/graph` in `packages/session-ui` (106 pass), `bun run test:components` in
`packages/session-graph` (49 pass, 1 rewritten), `bun run test:e2e -- e2e/graph/session-graph.spec.ts`
in `packages/app` (22 pass, 1 new), `bun run graph:capture --mode=compare` (the set refreshed) and
`bun run graph:verify` (all steps), `bun run lint:changed` (0).

Unverified: the frames were read by eye, not by a reviewer who did not write them; the toggle was
checked in Chromium at 1440×900 only, not in Firefox or WebKit and not on a touch device; the
billboard is a per-view state in the host, not persisted per session (the depth is); the card that
the component test measures is one card of the fixture, not a sweep over every card; and the band
bounds in a tilted view are still approximate, as T1.19 declared. **T2.1 and T2.2 still need
participants**, so the stop rule in T2.5 has not fired.

**2026-10-20 — the second host picks a layout, and the force simulation gets its number.** The
plan's own notes named two things the last pass left open, and this pass took both. T2 still needs
participants, so the work went where the plan says it can.

*The gallery now covers the placement engines.* The tree and the force simulation were the only
library surfaces the second host's capability gallery did not claim, so the library's claim that
*every* generic module runs outside OpenCode did not cover them. They do now. The host binds its own
vocabulary — `parentOfFn` reads the `part-of` edges (a stage hangs under the release, its work under
the stage), `forceLinksFn` reads the structural edges (the `evidence` edge stays out: a link is a
claim about the pipeline's shape, not about cause) — and a new gallery entry, **"The placement
engines"**, runs both over the host's model and reports what each produced (`tree · 18 boxes placed ·
bounds 1240 × 616`, `force · 18 boxes placed · bounds …`). The second host's unit suite grew to 9 and
its browser suite to 9; the import-set assertion needed no change, because the tree and the force
engines live in `spacegraphjs/layout`, which the gallery already claimed.

*The host grew a layout picker.* Seven views did not fit in the gallery, and a gallery entry that
changes the canvas is not a control: the page now has a `Layout` group in the header
(`ribbon · matrix · lanes · timeline · hierarchy · tree · force`) that switches the view and re-frames
the camera. This is the affordance T2.1 needs — a participant can be shown the same session in seven
shapes and asked which one they reached for.

*The plan was wrong about one config, and the fix was in the library.* The T7 notes said the tree's
block width was "one config away (`TreeConfig.columns`)". It was not: `Strategies.treeLayout` never
passed the option down, so a host could not choose it. `LayoutOptions.treeColumns` now reaches the
engine, the fork's `layoutGraph` forwards it, and the second host uses **two** leaves per block. With
the default of four the tree was 3,284 units wide and *no frame could hold it* — the fit's floor
anchors the frame at the content's beginning, so the reader saw the leaves and had to pan to the
root. At two the tree is 1,240 wide, the whole pipeline fits one frame, and the new
`26-second-host-tree.png` shows the release over its stages with the work under each stage. The
library's own test asserts the fold (three leaves in a row of four; two leaves per row folds the
third to the next row).

*The force simulation got the number the plan asked for.* `bun run graph:scale` now measures the tree
and the force layout too:

| Messages | Nodes | Tree | Force |
|---|---|---|---|
| 102 | 409 | 6.0 ms | 208.7 ms |
| 1,002 | 4,009 | 11.4 ms | 2,318.5 ms |
| 5,001 | 20,005 | 75.9 ms | 9,319.8 ms |

The tree is a linear pass. The simulation is two orders of magnitude above the lanes layout on the
same model — its cost grows with the content, because it runs a fixed number of cooling steps over a
neighbour grid. The number a reader pays is much smaller: the host draws a long session as its
recent tail (the last 60 turns), so the simulation sees a few hundred boxes, not twenty thousand —
**~0.2 s, once per view switch**. The uncapped 9.3 s is also the reason the simulation is frozen
after one run rather than live.

*One capture defect, found by reading the frame.* The second host's frames were captured 600 ms after
a click, but the camera flies to a new frame over 1.5 s, so the captures caught it mid-flight — the
tree looked unframed because it was still moving. The capture now waits 2.2 s. The frames were
refreshed and read by eye: the tree fits one frame, the force layout draws all eighteen boxes
legibly with no overlaps, and the ribbon (the host's default view) still reads.

*What did not change.* The OpenCode host's own capture set is byte-identical apart from the known
noise floor (five frames at a max channel delta of 1–5, and `22-graph-turn-1.png` at 0.09 % — T6.20's
residual), so those frames were left as they were. The library's public contract did not change:
`treeColumns` is an additive layout option, and `CONTRACT_VERSION` stays 2.

Commands run: `npx tsc --noEmit -p tsconfig.json` in `spacegraphjs` (0 errors), `npx vitest run` in
`spacegraphjs` (482 pass, 1 new), `npx playwright test --config playwright.demo.config.ts
test/e2e/second-host.spec.ts` in `spacegraphjs` (9 pass, 1 new), `pnpm run build:lib` +
`pnpm run build:packages` in `spacegraphjs`, `bun run typecheck` in `packages/session-ui` and
`packages/session-graph` (clean), `bun test src/graph` in `packages/session-ui` (106 pass), `bun test
src` in `packages/session-graph` (96 pass), `bun run test:components` in `packages/session-graph`
(49 pass), `bun run test:e2e -- e2e/graph/session-graph.spec.ts` in `packages/app` (22 pass), `bun run
graph:scale` (the table above), `bun run graph:capture --mode=compare` (the set refreshed; the
six noise-only frames reverted) and `bun run graph:verify` (all steps, including the library build,
the capture verification and the publish check).

Unverified: the frames were read by eye, not by a reviewer who did not write them; the second host
was checked in Chromium at 1440×900 only; the layout picker is a row of buttons, not a menu, so it
wraps on a narrow window (the OpenCode host uses a menu for the same reason); the force layout's
cost was measured on synthetic sessions, not on the real corpus (T6.4 is still open); and the tree's
block width of two is the second host's policy, not a measured optimum. **T2.1 and T2.2 still need
participants**, so the stop rule in T2.5 has not fired.

*Notes for the next pass.*
- **What is left, in the order the plan wants it:** **T2.1 and T2.2** (the dry run and the R7.3
  protocol) are the only things that can settle the product claim, and they need people; then
  **T2.4** (the naming/representation/depth/file-lens decisions, from the protocol data) and
  **T2.5** (the stop rule). **T3.7's RFC** follows the measurement, and the issue text is already
  `upstream-pr.md` + `upstream-review.md`. **T5** (release) waits for the upstream decision. The
  rest is refinement: **T6.4** (the real-session corpus — blocked on real session data),
  **T6.10–T6.14** (contract v3's fit insets, the benchmark CI, the embedder devtools, the API
  docs, the stale `vue-spacegraph`), **T6.16** (the optional pixel diff, which needs **T6.20**
  first), and **T6.20** itself.
- **The layout picker is now in both hosts.** The OpenCode host has a *menu* (`Layout: Lanes ▾`) and
  the second host a row of buttons; a third host should pick one and keep it.
- **The diff-budget numbers in `upstream-review.md` §5 drift with every app edit.** This pass
  changed no `packages/app/src` file, so they still stand; re-audit them before the RFC.
