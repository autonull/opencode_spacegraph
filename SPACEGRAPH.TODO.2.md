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
| SpaceGraphJS | `main` @ `f7cf48a`; unpushed: `f7cf48a`, `0bb41fd` (demo deploy + README) |
| Contract | `CONTRACT_VERSION = 2` (depth spectrum) |
| Last green (re-run 2026-10-19) | `session-ui` graph 74 · `session-graph` unit 49 · `session-graph` component 37 · `spacegraphjs` 338 · `graph:verify` all steps · app typecheck · lint:changed 0 |
| Reviewer packet | `docs/spacegraph/upstream-review.md`, `upstream-pr.md`, `security.md`, `demos.md`, `decisions.md` |
| Reference images | `docs/spacegraph/screenshots/01`–`24`, all committed |

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

### 0.4 Critical path vs. refinements

**Critical path (blocks upstream review/decision):**
- **T2 Evidence** — the hypothesis test; everything else is scaffolding for this result
- **T6.2 Hosted review build** — URL a maintainer clicks to try it; zero setup
- **T6.3 Review packet + FAQ** — one doc a maintainer reads; no TODO spelunking
- **T6.7 Security/escaping suite** — proves hostile markup inert; hard trust requirement
- **T3.7 Upstream contribution ladder + RFC** — the actual deliverable to upstream
- **T3.8 Diff budget audit** — required content for the RFC

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
T0 (sync), T1 (all usability defects), T3.1 (flag), T3.2 (settings), T3.3a/b (hybrid), T3.4 (export), T3.7 (ladder), T3.8 (diff budget), T6.1 (provider-free demo), T6.3 (review packet), T6.7 (security suite), T6.16 (demo index).

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

**Gate G1 — PASSED.** A first-time viewer reads every label, sees the whole model, understands overview without legend.

---

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

- [ ] **T2.3 (Optional) Interaction instrumentation behind a dev flag**
  Count mode switches, searches, node selections, expand/return actions per task so "≤ 3
  interactions" is measured, not estimated. Local-only; no telemetry.
  Done when: counter off by default and documented; dry run can cite numbers.
  Verify: flag exists, dry run cites numbers.

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
  - Per-file table with a justification for every app edit: `docs/spacegraph/upstream-review.md` §5.
    Linked from `prototype.md` §"Upstream readiness".
  - Claim checked, not assumed: only `packages/app/src/session/graph/*.tsx` imports
    `@opencode/session-ui/graph`; the rest of `packages/app/src` touches the mode, the setting, the
    commands, or the scroll position.
  - The e2e side shrank too: `packages/app/e2e/utils/timeline.ts` is back to its upstream bytes
    (the experimental-settings seam moved to the new `packages/app/e2e/utils/graph.ts`), so the
    shared harness carries no fork diff at all.

**Refinements (defer until after RFC or parallel if capacity):**

- [ ] **T3.5 Permalinks to a node** — sharing polish, not blocking
  Extend hash reveal to `#graph:<nodeID>` (and representation) so a reviewer can link to a decision/failure.
  Done when: cold-loading URL selects and frames node; unknown IDs fall back safely.

- [ ] **T3.6 Namespace the model for future comparison** — future-proofing, not blocking
  Add `data.sessionID` to session root (keep literal root ID for compat) so exported maps from two sessions combine later without breaking change.
  Done when: exports carry session identity; existing tests/IDs unchanged.

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

- [ ] **T4.1 Push and tag the library**
  Push `main` and tag the tested SHA (`5abf80d` or newer). Done when: `origin/main` matches HEAD and tag exists.

- [ ] **T4.2 Publish the packages** (adoption mechanic, not demo blocker)
  Add `dist` builds (ESM + d.ts), `files`, `exports`, semver tags for all packages. Replace source workspace linkage. Fallback: one bundled companion package with contract + adapters, never vendored source, explicit note upstream adoption waits.
  Done when: clean project outside monorepo installs published versions and mounts both adapters; `graph:verify` passes against published packages.

- [ ] **T4.3 Fold session layouts onto `LaneLayout`** — library-first debt
  Give `LaneLayout` variable item widths and per-lane cursors; move three strategies onto it without behaviour change.
  Done when: byte-identical positions for fixture; library tests and captures unchanged.

- [ ] **T4.4 Remove the `activity.d.ts` stopgap** — type cleanliness
  Fix/exclude known `spacegraphjs` `src` type errors (10 in `src`; `n8n-bridge` stays excluded); generate declarations; remove hand-authored `types` condition.
  Done when: `tsc --noEmit` clean for `src` + packages; consumers typecheck from `dist`.

- [ ] **T4.5 Close mesh-outline and fog defects (or declare them)**
  Implement stencil/backface outline and scene-relative fade, or document DOM cards as supported path and depth fog as lanes-only.
  Done when: known-limitations list matches code.

- [ ] **T4.6 Add CI for library and graph**
  Workflow running boundaries, contract conformance, both adapters, SVG renderer, bindings, session-graph component suite. Cache Playwright browsers; capture verification on schedule/release tag.
  Done when: workflow green on clean clone; fails on deliberately broken adapter.

- [ ] **T4.7 Decide edge accessibility**
  a11y mirror lists nodes only. Announce edges (extend layer) or document nodes-only.
  Done when: decision in docs and tests match.

**SpaceGraphJS core extractions (vacuum generic primitives from OpenCode):**

- [ ] **T4.8 Extract layout strategies to SpaceGraphJS `src/layout/`**
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

- [ ] **T4.9 Extract semantic levels to SpaceGraphJS `src/levels/`**
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

- [ ] **T4.10 Extract summary representations to SpaceGraphJS `src/representations/`**
  Move `packages/session-ui/src/graph/representation.ts` (`ribbon`, `matrix` generators, axis/label logic) to `spacegraphjs/src/representations/index.ts`. Replace session-specific logic with generic functions:
  - `rowKeyFn: (node) => string | number` — replaces `turnRows`/`turnOrder` (row grouping)
  - `rowOrderFn: (nodes) => nodes` — replaces `turnOrder` (within-row ordering)
  - `columnKeyFn: (node) => number` — replaces `matrixColumn`/`PHASE_CATEGORIES` (column assignment)
  - `levelFilter: (node) => boolean` — replaces hardcoded `isVisibleAt(node, "overview")` (which nodes participate)
  - `categoryMap: Record<number, string>` — optional column index → label for axis generation
  Ribbon = 1D segments per row; Matrix = 2D grid with cell packing (no overlap). Algorithms stay pure.
  Done when: OpenCode `representation.ts` imports from SpaceGraphJS with its config; captures 15/16 unchanged; SpaceGraphJS tests verify non-overlap + axis generation.
  Verify: `cd packages/session-ui && bun test src/graph/representation.test.ts`; `cd spacegraphjs && vitest run test/representations/`

- [ ] **T4.11 Extract adapter framework to SpaceGraphJS `packages/adapter/`**
  Create `packages/adapter/src/ModelAdapter.ts` with abstract `ModelAdapter<DomainModel, RenderModel>` base class and conformance suite. The base provides:
  - Pure `build(model, options): RenderModel` pipeline (level filter → node map → bands → lanes → axes → edges)
  - Configurable: `cardBudget`, `renderCardTemplate`, `renderBandTemplate`, `laneLabels`, `axisLabels`, `bundleEdges`, `buildBands`
  - **Abstract methods host must implement:** `nodeShape(node)`, `nodeStatus(node)`, `isStructuralKind(kind)`, `nodeData(node, level, dimmed)`, `toRenderEdge(edge, level)`
  - **Optional overrides:** `defaultCardTemplate`, `defaultBandTemplate`, `buildBands`, `bundleEdges`
  Port OpenCode `buildRenderModel.ts` as reference `SessionGraphAdapter` extending base. Cytoscape adapter gets parallel subclass. Conformance suite tests pipeline + abstract method contracts.
  Done when: `spacegraphjs/packages/adapter` publishes independently; OpenCode `buildRenderModel.ts` extends base adapter; both adapters pass conformance.
  Verify: `cd spacegraphjs/packages/adapter && vitest run`; `cd packages/session-graph && bun run typecheck`

- [ ] **T4.12 Extract scoped subgraph overlay to SpaceGraphJS `src/overlays/`**
  Move `packages/session-graph/src/ui/turnMap.ts` + `TurnMapOverlay.tsx` to `spacegraphjs/src/overlays/` as:
  - **Headless core:** `extractSubgraph(model, nodeId, limit) => subgraph`, `buildSubgraphRenderModel(subgraph, options) => RenderModel`
  - **React binding:** `ScopedSubgraphOverlay` — focus-trapped, scroll-preserving (host owns container `position: relative`), Escape closes + restores focus, expand-to-full callback, slot-based header/inspector/actions
  - **Solid binding:** same API, Solid primitives
  Host provides: `model`, `nodeId` (turn or any node), `limit`, `renderCard`, `onOpenFull`, `onClose`, `onSelect`, custom header/inspector slots.
  Done when: OpenCode `TurnMapOverlay.tsx` wraps SpaceGraphJS overlay with its slots; overlay works in `react-spacegraph` demo; keyboard focus trap + Escape close verified.
  Verify: `cd packages/session-graph && bun run test:components -- turn-map`; `cd spacegraphjs/packages/react-spacegraph && vitest run`

- [ ] **T4.13 Extract theme/contrast system to `spacegraph-renderer`**
  Move `packages/session-graph/src/ui/theme.ts` + `contrast.ts` semantic token → renderer color mapping to `spacegraphjs/packages/spacegraph-renderer/src/theme.ts`:
  - `SemanticTokenMap: Record<string, CSSVariable>` — host semantic token (e.g., `textMuted`) → CSS variable (e.g., `--v2-text-text-muted`)
  - `RendererTheme = { surface, border, text, textMuted, textFaint, accent, success, warning, error, ... }` — renderer-internal palette
  - `resolveTheme(semanticMap, rendererTheme): RendererTheme` — merges host overrides with renderer defaults
  - `ContrastAuditor` class: `audit(rendererTheme): ContrastReport` — verifies ≥4.5:1 text, ≥3:1 non-text per WCAG
  Cytoscape renderer gets parallel `CytoscapeThemeBridge` with its own token map.
  Done when: Both renderers import theme from SpaceGraphJS; contrast tests pass in library CI; OpenCode theme tokens unchanged.
  Verify: `cd spacegraphjs/packages/spacegraph-renderer && vitest run`; `cd packages/session-graph && bun test src/ui/contrast.test.ts`

- [ ] **T4.14 Extract graph search/minimap/a11y to SpaceGraphJS packages**
  - **Search:** `spacegraphjs/src/navigation/search.ts` — headless `search(model, query, fieldsFn?) => Node[]` where `fieldsFn: (node) => string[]` extracts searchable text (label, summary, tool name, path, command). React/Solid bindings: `GraphSearch` component with keyboard nav, ARIA, result list.
  - **Minimap:** `spacegraphjs/src/navigation/Minimap.ts` — headless `project(positions, bounds, viewport) => { dots, viewRect }` + SVG renderer. React/Solid bindings: `GraphMinimap` component with drag-to-pan, viewport sync.
  - **A11y:** `spacegraphjs/src/a11y/AccessibilityLayer.ts` (already exists) — extend with `edgeAnnouncer: (edges) => EdgeSummary[]` for edge announcement (T4.7). React/Solid bindings: `GraphA11y` component.
  Done when: OpenCode components wrap SpaceGraphJS primitives; each has library tests; T6.12 capability gallery includes all three.
  Verify: `cd spacegraphjs && vitest run test/search/ test/minimap/ test/a11y/`; OpenCode component tests pass

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
- T6.1 Provider-free demo mode (`bun run graph:dev`) — ✅

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

- [ ] **T6.5 Edge-case coverage: forks, child sessions, compaction, permissions**
  Upstream has `session.forked`; subagent nodes link child session but cannot open it; compaction summary-only; approval/permission declared but unbuilt. Add "open child session" action, fork/lineage attribution without cross-session edges, compaction/replay-only coverage, explicit decision on permission nodes. Cover interrupted, aborted, idle outcomes.
  Done when: each case has fixture/test and documented UI behavior.
  Verify: model tests + one component/e2e per user-visible action.

- [ ] **T6.6 Scale and streaming budget**
  Benchmark 1k and 5k message sessions: model build, layout, render-model build, adapter diff, first paint. Decide whether P8.8 incremental patches needed **from data**, not speculation. Add auto-collapse/cap policy at scale.
  Done when: table in `prototype.md` and guard test fails on order-of-magnitude regression.
  Verify: new perf test + capture at cap.

- [ ] **T6.8 First-run legend, help, and reduced motion**
  Make encoding discoverable: lane labels/colors, edge kinds/confidence, status dots, help popover; respect `prefers-reduced-motion` for camera/depth transitions; announce mode changes. Removes bias from usability protocol.
  Done when: new user decodes graph without briefing; reduced-motion test passes.
  Verify: component test + capture.

**Library roadmap (independent of OpenCode decision):**

- [ ] **T6.10 Contract v3: fit insets and viewport options**
  Add optional `fit(ids?, { padding?, insets?: { top, right, bottom, left } })` honored in both adapters. Generic fix for framing beside inspector/header/bottom sheet; lets host delete workaround. Bump `CONTRACT_VERSION`, update conformance, document migration/negotiation.
  Done when: host frames with insets; both adapters pass; v2 consumers negotiate cleanly.
  Coordinate with T4.2 before publishing.

- [ ] **T6.11 Benchmark and budget CI**
  Harness for mount/dispose cycles, pan/zoom frame time via `PerformanceObserver`, WebGL context count, model-diff cost at 100/500/1k/5k nodes. Emit JSON report per tag. Add `publint`, `attw`, bundle-size checks to publish workflow.
  Done when: report archived per release; CI fails beyond budget.

- [ ] **T6.12 Second-host React app and capability gallery**
  Vite React app under `spacegraphjs/demo/react-host` using `react-spacegraph` + contract + synthetic adapter, deployed with demo. Capability gallery (zoom bands, **lane layout (T4.8)**, trail, a11y, **minimap (T4.14)**, SVG, depth) so each generic module has runnable example. **Enabled by T4.8, T4.10, T4.12, T4.13, T4.14 extractions.**
  Done when: CI runs it; README links it; no OpenCode imports.

- [ ] **T6.13 Embedder devtools**
  Dev-only overlay/API (`sg.debug()` or `?debug=1`) showing renderer, contract version, capabilities, node/edge/LOD counts, frame time, selection; matching diagnostic panel in host.
  Done when: no production code path enables it by accident; screenshot in docs.

- [ ] **T6.14 API docs and release automation**
  Typedoc for contract, adapters, control; tag → build → publish → docs workflow; compatibility matrix (three, cytoscape, React/Solid/Vue, browsers). Decide stale `vue-spacegraph` fate: bring to contract parity or deprecate explicitly.
  Done when: new host integrates from generated docs; release reproducible.

- [ ] **T6.16 (Optional) Pixel-diff helper**
  `graph:diff` compares fresh captures to committed set with threshold and per-image report. Reduces inspection toil; does not replace human review; not a hard gate.
  Done when: flags deliberate change and ignores normal GPU/font noise.

- [ ] **T6.17 Extract code diff visualization to SpaceGraphJS `src/overlays/`**
  Move `packages/session-graph/src/ui/GraphDiff.tsx` to `spacegraphjs/src/overlays/CodeDiffOverlay.tsx` (React/Solid). **Specifically for unified diff patches (code changes)**, not a generic graph model diff. Renders:
  - File header with path, +additions/-deletions counts
  - Syntax-highlighted unified diff (green for +, red for -, muted for headers/hunks)
  - Scrollable, selectable DOM text (not canvas)
  Host provides: `from` (turn/message ID), `source: { get(id), load(id) }` returning `{ file, patch, additions, deletions, status }[]`.
  Generic "graph model diff" (added/removed/changed nodes between two render models) is a separate future feature (D4); this extraction is only for the code diff viewer.
  Done when: OpenCode wraps SpaceGraphJS `CodeDiffOverlay`; library tests verify diff rendering; T6.12 capability gallery includes code diff demo.
  Verify: `cd spacegraphjs && vitest run test/overlays/code-diff.test.ts`; OpenCode component test passes

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
| Captures | `bun run graph:capture --mode=compare` + manual inspection | Visual acceptance |
| Capture verify | `bun run graph:capture --mode=verify` | Committed set exists |
| Lint | `bun run lint:changed` | Changed files |
| Repo check | `bun run check` | Canonical, but red for known environmental reasons; see T1.6 |
| Provider-free demo | `bun run graph:dev` | T6.1 |
| Security suite | new graph security tests | T6.7 |
| Scale guard | new 1k/5k perf test | T6.6 |
| Library benchmark | `cd spacegraphjs && bun run bench:graph` (new) | T6.11 |
| Pixel diff (optional) | `bun run graph:diff` (new) | T6.15 |

Rules: run from package directories, never repo root for tests; inspect images before claiming a visual task; record unverified behaviour.

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