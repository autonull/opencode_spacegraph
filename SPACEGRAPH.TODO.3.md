# SPACEGRAPH.TODO.3 — wrap up, sync, share

**Status:** successor to `SPACEGRAPH.TODO.2.md` (the build record, 2026-10-19 → 2026-10-20) and to
`SPACEGRAPH.TODO.1.md` (frozen as the Phase 0–10 specification and historical record). `SPACEGRAPH.md`
remains the design argument; `docs/spacegraph/prototype.md` remains the release write-up. **This file is
the closing plan**: it finishes the engineering, brings the fork back onto upstream `dev`, and makes
the fork usable by someone who did not build it. **`SPACEGRAPH.TODO.4.md` is the successor**: the
work the author's own use of the product asked for, and the exemption to the freeze rule in §7.3.

**Conventions:** carried tasks keep their IDs (`T2.x`, `T3.7`, `T4.2`, `T5.x`, `T6.x`); new work gets
`T8.x` (wrap up), `T9.x` (sync), `T10.x` (share). Never renumber or reuse an ID; superseded work gets
a new ID. Every task has a `Done when` and a `Verify` command. Check tasks off here. Cite TODO.1 and
TODO.2 for the evidence; do not copy it.

---

## 0. Where we are (2026-10-21)

### 0.1 The two repositories

| Item | State |
|---|---|
| OpenCode fork | `dev` @ `0e5f745c3d`, on `origin/dev`, 0/0 with origin. **24 behind upstream `dev` @ `5c3891ec18`** (fetched today) |
| Upstream | `anomalyco/opencode` `dev` @ `5c3891ec18` — 24 commits, 150 files since the merge base `d249607e90` |
| SpaceGraphJS | `main` @ `82c0f2e` = `origin/main`, clean. Tags: `v7.1.0` `v8.0.0` `v8.2.0` `v8.4.0`, five `@spacegraphjs/*@0.1.0|0.3.0`, four dated markers |
| Contract | `CONTRACT_VERSION = 3` (the fit options). `SUPPORTED_CONTRACT_VERSIONS = [2, 3]` |
| Library versions | `spacegraphjs` **8.4.0**; `@spacegraphjs/renderer` **0.3.0**; `@spacegraphjs/spacegraph-renderer` and `@spacegraphjs/cytoscape-renderer` **0.3.0**; `@spacegraphjs/adapter` and `@spacegraphjs/svg-renderer` **0.1.0** |
| Green when measured today | `session-ui` graph **106** · `session-graph` unit **96** · `spacegraphjs` vitest **491** · the library's `tsc --noEmit` **0 errors** |
| The fork's diff against the merge base | 193 files; `packages/app/src` 21 files (+1057/−36, the dev-only entry included); `session-ui/src/graph` +6,126; `packages/session-graph` +7,411 |

### 0.2 Five facts that shape this plan

1. **The product claim is still unproven.** T2.1/T2.2 need people. Everything else here is either
   preparing the measurement or preparing the delivery.
2. **The fork does not install from a clean clone.** `bun install` fails with
   `error: Workspace not found "spacegraphjs/packages/adapter"`. The library is a separate, gitignored
   repository that the root manifest lists as a workspace, and two packages depend on it with seven
   `workspace:*` edges. **A stranger cannot clone this fork and install it.**
3. **Every CI workflow on both repositories is red.** The library's `CI`, `Deploy Demo` and
   `Benchmark` workflows fail on every push; the fork's `Graph` gate fails on every push. The causes
   are identified and reproduced (§1, T8.1). The code passes locally — the failures are in the
   *environments*, not in the graph.
4. **Nothing is published and nothing is hosted.** `spacegraphjs` and the five `@spacegraphjs/*`
   return 404 on the npm registry (the names are free — verified), and the GitHub Pages demo URL
   returns 404. The fork's and the library's repositories are public.
5. **The docs quote numbers from earlier passes.** The diff budget has drifted by thousands of lines
   (§1, T8.6), and the tested-commit lines still name the *first* sync.

### 0.3 What "wrapped up and shareable" means

A stranger, with no model provider and no npm account, must be able to:

1. clone the fork and **install it** (T8.2, T10.2),
2. see the map **without a provider** (T6.1, done) and **without a local library checkout** (T10.2),
3. reach a **hosted URL** that renders the library demo and the second host (T10.3),
4. read **one document** that states the hypothesis, the measured result, the diff, the flag, the
   rollback and the limitations (T10.5),
5. see the work **moving** in a short video (T8.5),
6. install the library from npm for their own host (T10.1).

And the fork's own history must be **on top of upstream `dev`** (T9), with every gate green.

### 0.4 The three gates

| Gate | Means | Tasks |
|---|---|---|
| **G5 — closed** | The engineering is finished: CI green, the library's roadmap items done or deliberately dropped, the capture set final, the docs true, the code frozen | T8.1–T8.7 |
| **G6 — synced** | The fork sits on upstream `dev`, the gate is green, the entry delta is re-measured | T9.1–T9.9 |
| **G7 — shareable** | One clone, one install, one URL, one document, one video, one npm release | T10.1–T10.7 |

### 0.5 The three blockers this environment cannot lift

| Blocker | Evidence | How the plan works around it |
|---|---|---|
| **No npm credential** | `npm whoami` → "need auth"; no `~/.npmrc` | T10.1 prepares the release so the upload is one command, in a written order. The names are verified free. |
| **No GitHub write access** | no `gh` CLI, no token. The **unauthenticated API reads fine** on a public repository | T10.4 prepares the issue text and the verification steps; the owner posts it. Every check in this plan reads the API, so no token is needed to *verify* the result. |
| **No human participants** | — | T2 is scheduled with a protocol, not simulated. The plan states exactly what a participant does. |

### 0.6 Invariants carried forward

Cite TODO.2 §0.2; do not relitigate. The transcript stays the baseline; the graph is opt-in, lazy and
reverts cleanly; no causality is inferred from adjacency; the library core imports no contract and no
host; stable ids and append-only positions; capability differences are declared, never silently
dropped; the renderer owns geometry and camera, the host owns semantics and layout.

### 0.7 Critical path

**T8.1 → T9 → T10.1 → T10.2 → T10.3 → T10.4.** The CI must be green before anyone is invited to look
at it; the fork must be synced before the release branch is cut from it; the packages must be on npm
before the fork can depend on them instead of a sibling checkout; the hosted build and the RFC are
what a reviewer actually clicks.

T8.1 and T9 may run in either order, but **T9 must land before T10.2** (the release branch is cut from
the synced `dev`), and **T8.1 must land before T10.1** (the published tarballs are built by the same
toolchain that is currently red in CI).

---

## 1. T8 — Wrap up the engineering

### T8.1 Every CI workflow is red — make it green

**Facts measured today.** The GitHub Actions API reads a public repository without a token; the
step list of every failing run is available, and every cause below was then **reproduced locally on a
clean clone**.

| Workflow | Failing step | Cause |
|---|---|---|
| `CI` (library) | 8 · "Build the published packages" | the declaration build's toolchain. `unplugin-dts` needs a TypeScript with the **JavaScript Compiler API**; the library depends on **TypeScript 7**, whose only JS export is a version stub (`lib/version.cjs`). pnpm resolves the peer to the library's own TS 7 → the build throws. bun (in the fork's workspace) resolves it to the fork's TS 6.0.3 → the build works. **The build is not reproducible across installers.** |
| `Deploy Demo to GitHub Pages` | 5 · "Install dependencies" | the workflow installs **pnpm 9**; the lockfile is pnpm 10's and pnpm 9 refuses it: `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Reproduced exactly: pnpm 9 fails, pnpm 10 installs it cleanly. |
| `Benchmark & Vision Gate` | 3 · "Setup Node.js" | `cache: 'npm'` in a repository that has no npm lockfile. Its bundle audit then reads `dist/spacegraphjs.js`, which the **multi-entry build no longer produces**. |
| `Graph` (the fork) | 8 · "Graph gate" | reproduced exactly on a clean clone: the gate's "view controller + framework bindings" step cannot resolve `react` or `solid-js`. The library's `packages/react-spacegraph` and `packages/solid-spacegraph` are **not** in the fork's workspace list, so their devDependencies are never installed; locally they resolve because the developer's own `pnpm install` inside `spacegraphjs/` put them in the tree. **Past that step, one more failure waits**: the component suite's reduced-motion test asserts the camera jump finishes in under 400 ms, and it measured **437.9 ms** on a loaded runner (8 parallel workers). |

**Why this is the first task.** A reviewer looks at the badges before they read a word. Four red
workflows on a public repository is the loudest possible signal that the work is not ready — and it is
also *false*: the graph's own suites are green everywhere they run.

- [ ] **T8.1a Give the declaration build a compiler API**
  `spacegraphjs/package.json` gains `"@typescript/typescript6": "^6.0.2"` — the package the error
  message itself names, and a real package on the registry (verified: latest 6.0.2). It is additive:
  TypeScript 7 stays the compiler, TypeScript 6 provides the API the declaration emitter needs.
  Done when: a clean `pnpm install && pnpm run build:lib && pnpm run build:packages` succeeds on a
  fresh clone of the library.
  Verify: those three commands in a fresh clone. **Proven today**: the same clone fails without the
  dependency and succeeds with it. Note the deeper fix in T8.1d — the peer must not be resolved
  differently by different installers.

- [ ] **T8.1b Move the deploy workflow to pnpm 10**
  `spacegraphjs/.github/workflows/deploy-demo.yml`: `pnpm/action-setup@v4` with `version: 10`, the
  version the CI workflow already uses. The deploy is the one that drifted.
  Done when: the deploy's "Install dependencies" step passes.
  Verify: the run's step list through the Actions API.

- [ ] **T8.1c Retire the benchmark workflow**
  `benchmark.yml` is the pre-graph workflow: it installs a pnpm project with npm, caches on a missing
  npm lockfile, and audits a bundle name the build stopped producing. It is **deleted** unless someone
  wants the vision gate, and the vision gate's script (`verification/verify_demos.ts`, not in any
  current gate) is archived with the rest of `verification/` (T8.4).
  Done when: the library has one CI workflow and one deploy workflow, and no red badge.
  Verify: the Actions API lists exactly two workflows, and both are green on the next push.

- [ ] **T8.1d Make the fork's Graph gate green, and stop the installer from deciding**
  Two changes, both small:
  (1) `.github/workflows/graph.yml` installs the **library's own dependencies** before the gate
  (`pnpm install` inside `spacegraphjs/`, as the developer's local setup does), so the library's
  packages resolve their peers the same way in CI as on a desk;
  (2) the library's workspace declares its peer toolchain explicitly — the compiler API (T8.1a) and
  the framework devDependencies the binding tests need — so **no** installer resolves them by
  accident. Optionally, add `spacegraphjs/packages/react-spacegraph` and
  `spacegraphjs/packages/solid-spacegraph` to the fork's workspace list, which installs their
  devDependencies with the rest of the tree.
  Done when: the fork's `Graph` workflow is green on a push, and the same gate passes in a clean
  clone with both `bun install` and `pnpm install` in the library.
  Verify: `https://api.github.com/repos/autonull/opencode_spacegraph/actions/workflows/graph.yml/runs`
  — the newest run is `success`; and the clean-clone reproduction.

- [ ] **T8.1e The reduced-motion test asserts a clock, not a behaviour**
  `packages/session-graph/component-tests/graph-motion.spec.ts` requires the camera's jump to finish
  in under 400 ms. On a loaded CI runner it measured **437.9 ms** and the gate went red — a timing
  assertion on a shared machine is a flake generator, and the gate must not be one. The behaviour is
  "the camera **jumps** instead of gliding", and that is provable without a stopwatch: assert that
  the reduced-motion path is *faster than* the glide path (a relative comparison, which the suite
  already measures both of), and keep a generous absolute ceiling for the jump so a hang still fails.
  Done when: the test fails on a slow machine only if the jump stopped being a jump.
  Verify: the component suite passes on the loaded CI runner; the test still fails when the host
  stops honouring `prefers-reduced-motion` (check that by removing the branch).


**Done when (T8.1 as a whole):** all four workflows are green on a push, and the two causes above
are recorded in the library's `docs/host-integration.md` so the next person does not rediscover them.

### T8.2 The fork must install from a clean clone

**The failure, verbatim** (a fresh `git archive` of `dev` into an empty directory):

```
error: Workspace not found "spacegraphjs/packages/adapter"
    at package.json:51:7
```

The root `package.json` lists six `spacegraphjs` workspace paths; `packages/session-ui` and
`packages/session-graph` carry seven `workspace:*` edges to the library. The library is a **separate
repository**, gitignored at `spacegraphjs/` — and the workspaces require it *inside* the fork
directory, while the docs call it "the sibling `spacegraphjs` checkout" and never show the command.

Two modes are needed, and they are different things:

| Mode | For | How the library is resolved |
|---|---|---|
| **development** | changing the library and the host together | the checkout at `<fork>/spacegraphjs/`, workspace links, an install in both trees |
| **consumption** | a clone of the fork by a stranger, and the upstream PR | the **published** packages from npm (T10.2) |

- [ ] **T8.2a One command for the development mode**
  A script (`bun run graph:setup`) that clones the library into `spacegraphjs/` at a pinned tag,
  installs both trees, and prints the two commands that follow. The pin is what keeps the fork
  reproducible.
  Done when: a stranger runs one command in a fresh clone and gets a working tree.
  Verify: `git clone <fork> && cd <fork> && bun run graph:setup && bun run graph:verify` — green from
  a clean directory.

- [ ] **T8.2b Say the layout correctly in the README**
  `docs/spacegraph/README.md` states it unambiguously: *the library is a separate repository cloned
  **into** `spacegraphjs/` inside this repository; it is not vendored and it is not beside it.* The
  current word ("sibling") describes a layout the workspaces cannot use.
  Done when: the README's setup block is copy-pasteable and correct.
  Verify: follow the README in a clean directory; the install succeeds.

- [ ] **T8.2c The consumption mode is a branch, not a second package manager**
  The consumption mode is a **branch** of the fork in which the seven `workspace:*` edges become
  published version ranges and the root workspace list drops the six `spacegraphjs` paths. It is cut
  in T10.2 from the synced `dev`.
  Done when: `bun install` succeeds in a clean clone of that branch with **no** `spacegraphjs/`
  directory present.
  Verify: `git archive` the branch into an empty directory, `bun install`, `bun run typecheck` —
  green.

### T8.3 The library's remaining roadmap

Three items from TODO.2 §8 are still open. They are the library's own "shareable" work, not
OpenCode's.

- [ ] **T8.3a T6.11 — the budget CI**
  A harness that reports mount/dispose cycles, the pan/zoom frame time, the WebGL context count and
  the model-diff cost at 100/500/1k/5k nodes, emitted as JSON per tag, with `publint`, `attw` and
  bundle-size checks in the publish path. The fork already has the model-diff primitive
  (`diffRenderModels`) and the scale bench (`bun run graph:scale`); the library needs its own.
  Done when: a JSON report per release tag, and the workflow fails beyond the budget.
  Verify: `pnpm run bench:graph`; the workflow goes red on a deliberately oversized bundle.

- [ ] **T8.3b T6.13 — the embedder devtools**
  A dev-only overlay or API (`sg.debug()` or `?debug=1`) showing the renderer, the contract version,
  the capabilities, the node/edge/LOD counts, the frame time and the selection, with a matching panel
  in the host. It must be impossible to enable in production.
  Done when: the overlay appears only under the dev flag, and a screenshot is in `docs/spacegraph/`.

- [ ] **T8.3c T6.14 — the API docs and the release automation**
  Typedoc over the **published** surface — today's `typedoc.json` points at `src/index.ts` and
  `src/vision/index.ts`, which is not the surface any host imports — plus a tag → build → publish →
  docs workflow and a compatibility matrix (three renderers, the framework bindings, the browsers).
  Done when: a new host integrates from the generated docs, and the release is reproducible from a tag.

- [ ] **T8.3d The `vue-spacegraph` decision**
  The package's build is `vue-tsc --noEmit || echo 'Build step setup'` — a no-op that always succeeds.
  It is not published, it is not in the fork's workspace, and the library's README lists it as a
  "Vue 3 adapter". **Decision: bring it to contract parity or deprecate it explicitly.** The default
  here is *deprecate* — it is the only one of the three framework bindings with no consumer, and the
  library is framework-agnostic by decision (TODO.2).
  Done when: the package is either a real binding or an explicit deprecation in the README and the
  package map.

- [ ] **T8.3e The README must match the code**
  The package map lists `@spacegraphjs/cli` and `create-spacegraph` (not published),
  `vue-spacegraph` (a stub) and "React/Solid/Vue bindings" (the React and Solid packages keep only
  `GraphView`). Before the library is shown to a maintainer, its landing page must describe what the
  repository actually contains and what is installable.
  Done when: every row of the package map is either published or marked "not published", and the
  status section's claims are true.

### T8.4 Retire the ad-hoc scripts and the competing documents

The library's root carries `PLAN/` (a dozen plan files), `DESIGN.md` (66 kB), `PRODUCT.md`,
`QUICKSTART.md`, `ROADMAP.md`, `TEAM-BRIEFING.md`, `TODO.md`, and `verification/` (30+ one-off
capture scripts in TypeScript and Python). None of them is in a gate, and a public repository with
five competing narratives is one nobody can read.

- [ ] **T8.4a One landing document, one archive**
  `README.md` is the landing page. `PLAN/`, `PRODUCT.md`, `QUICKSTART.md`, `ROADMAP.md`,
  `TEAM-BRIEFING.md` and `verification/` move to `docs/archive/` (or are deleted), linked from the
  README. The fork's ADR log (`docs/spacegraph/decisions.md`) is the model.
  Done when: the repository root carries the README, the license, the contributing guide, the agent
  guide, and the code.
  Verify: `ls` the root; the README links the archive.

- [ ] **T8.4b The library's own `TODO.md` and `AGENTS.md`**
  The library's `TODO.md` is stale and must not contradict the fork's plan. Its `AGENTS.md` must
  state the same rules the fork's does about the contract, the framework-free core, and the
  `exports` map.
  Done when: neither file names a task that is done, and neither contradicts TODO.3.

### T8.5 The final capture set and the video

- [ ] **T8.5a T5.1 — the final image set**
  After G6 (the sync), refresh the captures deliberately (`bun run graph:capture --mode=compare`),
  **read every frame by eye**, and caption each one in `prototype.md`. The set is 31 frames today
  (01–31, including the second host's four). Nothing is added unless a change produced it.
  Done when: every frame is captioned and every frame shows what its name says.
  Verify: `--mode=verify` passes; the frames are inspected, not diffed (§6's rule).

- [ ] **T8.5b T5.2 — the video**
  `SPACEGRAPH.md` §7 asks for "a short animated GIF or video": expand a scoped map, zoom to a
  failure, inspect a node, return to the log. The Playwright runner already records video, and the
  capture harness drives the same flows. Produce `docs/spacegraph/demo.mp4` (and a GIF if the size is
  sane) with no provider and no model.
  Done when: the artifact exists, is linked from both READMEs, and shows the four moves in under a
  minute.
  Verify: open it; the frames are the canonical fixture.

### T8.6 The documents that drifted

The fork's docs quote numbers and commits from earlier passes. Measured today against the merge base
`d249607e90`:

| Document | Says | Is |
|---|---|---|
| `docs/spacegraph/README.md` → "Tested commit" | upstream `ba06ff9e0b`, merge `f802f5e707`, library `f7cf48a` | the **first** sync; the tree is now `0e5f745c3d` / upstream `d249607e90` / library `82c0f2e` |
| `docs/spacegraph/README.md` → setup | "do not run a full `pnpm install` there (it pulls the `n8n-bridge` workspace and the native `canvas` build)" | `n8n-bridge` was **removed** (TODO.2, T4.4) |
| `docs/spacegraph/README.md` → limitations | "the session-entry delta is unmeasured" | it **is** measured — `prototype.md` has the table, and that table is two syncs out of date (T9.7) |
| `docs/spacegraph/upstream-review.md` §5 | `session-ui/src/graph` +4,039 · `session-graph` +6,924 · `ui/i18n` +158 | **+6,126** · **+7,411** · **+173** |
| `docs/spacegraph/prototype.md` → entry delta | upstream `ba06ff9e0b` vs merge `f802f5e707` | two syncs out of date (T9.7) |
| `docs/spacegraph/prototype.md` → "Known limitations" | 20 items | re-read against the code (T6.5 changed the edge cases) |

- [ ] **T8.6a Re-measure every number the docs quote**
  The diff budget (T3.8) is re-audited against the **new** merge base after T9, and the per-file
  table is regenerated, not edited.
  Done when: `upstream-review.md` §5 carries the measured numbers and the file list.

- [ ] **T8.6b Fix the stale prose**
  The tested-commit lines, the n8n note, the entry-delta claim, and the limitations list.
  Done when: every "tested" line in the docs names the current commits.

- [ ] **T8.6c The docs index points at TODO.3**
  `docs/spacegraph/README.md` lists the plan files; TODO.2 becomes frozen and TODO.3 becomes the
  living plan.

### T8.7 Freeze the graph's code

- [ ] **T8.7a The freeze rule**
  From G5 onward the graph's code changes only for **upstream syncs** and **defects**. New features
  are refused. The only open feature work is what the evidence task's findings demand (T2.4's
  decisions) and the library's own roadmap (T8.3).
  Done when: the rule is in this plan and in the fork's contribution note.
  Verify: the next passes touch documentation, not the graph.

### T8.8 The detail surface is the reader's choice

**Why this task exists.** The author used the graph and found that clicking a node *interrupts* it:
the side panel takes 288 px of the canvas and the camera reframes the whole map to make room (the
fit trigger in `GraphView.tsx` lists `inspectorOpen()`). The detail is the one thing a reader opens
most, and it is the one thing that moves everything else. The fix is not to move the panel; it is to
stop the detail from having only one home.

This landed **before** the G5 freeze, deliberately: it is a finding from the author's own use of the
product, not a speculative feature, and it is the last shape change the graph gets.

- [x] **T8.8a The detail mode is a reader's choice, not the graph's**
  Four modes, persisted per session beside the other graph preferences: `off` (no detail surface),
  `card` (the selected node's own card carries a summary), `popover` (a floating panel anchored to
  the node, in screen space), `panel` (the side panel the graph always had). The toolbar offers the
  choice; the app persists it; the default is `panel`, so nothing changes for a reader who never
  touches it.
  Done when: the four modes are in the toolbar, in the persisted state, and in the graph's own
  vocabulary (`session-ui/graph`'s `DetailMode`).
  Verify: `cd packages/session-graph && bun test src` and the `graph-detail` component spec.

- [x] **T8.8b The map does not move when the detail opens**
  Only the `panel` mode takes layout width, and only it triggers a refit. The popover floats over
  the canvas and is dismissed with Escape without losing the selection; a second Escape clears it.
  Done when: selecting a node in the `popover` or `card` mode leaves the camera where it was.
  Verify: the `graph-detail` component spec.

- [x] **T8.8c A card says what the reader can read at that distance**
  A card's box never changes — the layout owns the geometry and the positions stay stable — so the
  **tier** (`far` | `mid` | `near`) changes the composition inside the box: a far card drops the
  summary it cannot show, a near card adds when and where. The tier is measured in screen pixels
  (the card's world width times the pixels per world unit), not in camera distance, and the
  thresholds are separate in and out so a card never flips on a boundary.
  Done when: the tier is in `session-ui/graph` and the card template reads it.
  Verify: `cd packages/session-ui && bun test src/graph/detail.test.ts`.

- [x] **T8.8d The generic capabilities go to the library, not the host**
  Two of them: a renderer can say **where a node is on the screen** (`GraphRenderer`'s optional
  `getNodeScreenPosition`, implemented by the SpaceGraph renderer through the core's projection and
  by the Cytoscape renderer through its own rendered position), and the SpaceGraph renderer now
  reports **hover** (`hoverChange`, which the Cytoscape renderer already reported). Three defects in
  the library were fixed on the way: a host-driven card resize **re-flows** its content instead of
  scaling it (a tier change would have blown the card up), a card hidden by `labelLod` now takes its
  **edges** with it, and the **accessibility mirror** paints the same nodes in place instead of
  replacing its list, so a model rebuild no longer moves the reader's keyboard focus to the body.
  Done when: the contract carries the optional method and both renderers implement it.
  Verify: `cd spacegraphjs && pnpm exec vitest run` and the two renderers' own suites.

**Gate G5 — closed.** Every workflow on both repositories is green; the library's roadmap items are
done or deliberately dropped; the image set is final; the docs are true; the code is frozen.

---

## 2. T9 — Synchronize with `dev`

**Facts measured today.** The merge base is `d249607e90` (upstream's previous tip, which the fork
merged as `098e601068`). Upstream has moved **24 commits / 150 files**. The fork's **193** changed files
overlap upstream's in **seven** files — the last two syncs had **zero** overlap, so this one is not
the free ride the last two were.

| Overlapping file | Ours | Theirs | The conflict |
|---|---|---|---|
| `packages/app/src/session/screen.tsx` | +92/−6 | +4/−1 | upstream changed the `useUsageExceededDialogs()` call; ours added the graph's mode branch. Different hunks, but this file holds the graph's mode switch — read it twice. |
| `packages/session-ui/src/timeline/projection.ts` | +10 | +31/−1 | upstream added the `provider.free-limit` error kind to `TimelineRow.Error`; ours added the `turnByMessageID` map (the graph's single source of turn ownership). Ours sits at ~250–320 and ~444, theirs at ~564–660 — **disjoint**. |
| `packages/ui/src/i18n/en.ts` | +173 | +3 | ours inserts the `ui.sessionGraph.*` block at ~282; theirs inserts the free-limit copy at ~75. Disjoint. |
| `package.json` | +11/−1 | +1/−1 | ours adds the workspace paths; theirs bumps the version `2.1.0` → `2.1.1`. |
| `packages/app/package.json` | +1 | +1/−1 | ours adds the graph dependency; theirs bumps the version. |
| `packages/session-ui/package.json` | +3 | +1/−1 | ours adds `spacegraphjs`; theirs bumps the version. |
| `bun.lock` | generated | generated | regenerate; keep **both** sides (the `spacegraphjs` workspace entries and the version bumps). |

**Strategy: merge, do not rebase.** TODO.2 §1 recorded why: 193 commits of history name their SHAs in
the docs, the commit messages and the log, and a rebase makes rollback harder. A clean branch for the
upstream PR is cut later (T10.2), never force-pushed.

- [ ] **T9.1 Back up both repositories**
  Push the fork and the library; tag the pre-sync state (`pre-sync-2026-10-21` on both, following the
  existing convention).
  Done when: `origin/dev` and `origin/main` hold the current tips and the tags exist on both.
  Verify: `git ls-remote origin refs/heads/dev refs/tags/pre-sync-2026-10-21` (both repositories).

- [ ] **T9.2 Re-measure at execution time**
  Fetch upstream and re-check the seven overlapping files and the commit count — upstream moves daily.
  Done when: the numbers in this section are re-verified and any difference is recorded in §9.
  Verify: `git fetch upstream dev --no-tags && git rev-list --left-right --count HEAD...upstream/dev`.

- [ ] **T9.3 Merge on a dedicated branch**
  ```
  git switch -c upstream-sync-1021
  git merge --no-ff upstream/dev -m "chore: sync upstream dev"
  ```
  The conflict policy is TODO.2 §1 T0.3's, unchanged: our new files are kept untouched; the shared
  additive files take upstream and re-apply our hunks; **no blanket `ours`/`theirs`**; anything
  semantically hard stops the merge and is recorded in §9 before a choice is made.
  Done when: the merge commit exists, `git status` is clean, and no file was resolved by discarding a
  side.
  Verify: `git log --oneline -1`; `git diff --check`; a read of the seven overlapping files.

- [x] **T9.4 Regenerate the lockfile**
  `bun install` at the root. The lockfile must keep the `spacegraphjs` workspace entries **and** the
  `2.1.1` version bumps.
  Done when: `bun install` is clean and `bun.lock` names the workspace entries and the bumped
  versions.
  Verify: `bun install && git diff --stat bun.lock`.
  **Done early (2026-10-21), because the install could not complete at all**: the lock still
  recorded the library's old `vite ^8.2.2` while the library asks for `^8.3.5`, and the three-day
  `minimumReleaseAge` blocked the new version — so `bun install --frozen-lockfile` failed, and the
  tree it left behind was the reason the app's unit suite and one typecheck failed. The lock was
  regenerated with the age policy relaxed once, and a frozen install now passes with the policy
  back on. The lock had also drifted from the fork's *own* manifests (`three` 0.185.1 was installed
  where `packages/session-graph` declares 0.186.1), so the regeneration moved the tree onto the
  version the manifests ask for. T9.4 still re-runs after the sync.

- [ ] **T9.5 Re-check the graph's protocol assumptions**
  Upstream added a **new error type** (`provider.free-limit`) and a new timeline row kind. The
  graph's model reads messages and turns, and an assistant error becomes an `error` node. Re-check
  that the new variant is mapped or explicitly ignored **with a test**, and that the
  `turnByMessageID` map (the graph's turn ownership) still agrees with upstream's notion of an
  execution — the free-limit error is attached to an assistant message, which is exactly the kind of
  message the ownership map classifies.
  Done when: the new variant is covered by a model test, or the model ignores it on purpose and says
  so.
  Verify: `cd packages/session-ui && bun test src/graph` plus a new case for the variant.

- [ ] **T9.6 Run the whole gate on the merged tree**
  ```
  bun install
  cd packages/session-ui && bun run typecheck && bun test src/graph
  cd packages/session-graph && bun run typecheck && bun test src && bun run test:components
  cd packages/app && bun run typecheck && bun run typecheck:e2e && bun run test:e2e -- e2e/graph/session-graph.spec.ts
  bun run graph:verify
  bun run lint:changed
  ```
  Done when: green, or every failure is proven pre-existing on upstream's own tree and recorded.
  Known environmental caveats, unchanged: `bun run check` is red here for reasons that have nothing
  to do with the graph (`@opencode/plugin-figma`'s `zstdCompressSync` under this checkout, `turbo`
  dying with SIGBUS); the app's `typecheck:e2e` is red on **four files that are byte-identical to
  upstream** and fail the same way on a bare upstream worktree.

- [ ] **T9.7 Re-measure the entry delta (T0.7, second run)**
  The table in `prototype.md` describes the 2026-10-19 sync. Build upstream's new tip and the merged
  tree and compare the session route's chunks and the lazy graph chunk.
  ```
  git worktree add /tmp/opencode/upstream-baseline upstream/dev
  cd /tmp/opencode/upstream-baseline && bun install && cd packages/app && bun run build
  cd packages/app && bun run build   # in the merged tree
  ```
  Done when: `prototype.md` shows upstream vs merged vs the previous baseline, so the *drift* is
  visible and not only the delta.
  Verify: the table and the build logs. Remove the worktree afterwards.

- [ ] **T9.8 Re-baseline the documentation**
  `prototype.md`'s "Tested revisions", `docs/spacegraph/README.md`'s "Tested commit" and the diff
  budget (T8.6a) name the merged SHA. The captures are refreshed **only if** the shell's rendering
  changed — compare upstream's images; if upstream did not touch the shell, the committed set stays.
  Done when: every "tested" line names the merge commit and the library SHA.
  Verify: `grep -rn "Tested commit\|Tested revisions" docs/spacegraph/`.

- [ ] **T9.9 Merge into `dev` and push**
  ```
  git switch dev && git merge --ff-only upstream-sync-1021
  git push origin dev
  ```
  Push with `--no-verify` if the pre-push hook's `bun run check` is still red for the environmental
  reasons above — and say so in the log.
  Done when: `dev` contains upstream and the fork's work; the branch and the tag stay on the remote.

**Gate G6 — synced.** The fork sits on upstream `dev`, the gate is green, the entry delta is
re-measured, and the docs name the merge.

---

## 3. T10 — Prepare the fork for sharing

### T10.1 Publish the library to npm

**Facts.** The registry is reachable and the names are **free**: `spacegraphjs`,
`@spacegraphjs/renderer`, `@spacegraphjs/adapter`, `@spacegraphjs/spacegraph-renderer`,
`@spacegraphjs/cytoscape-renderer` and `@spacegraphjs/svg-renderer` all return 404 today, and npm's
search finds no `spacegraph` package. There is **no credential** in this environment
(`npm whoami` → "need auth"), so the upload is one command away — and not one command away from here.

- [ ] **T10.1a Fix the versions before the release**
  The published artifacts must be final. The core is `8.4.0`; the contract package and the two
  interactive adapters are `0.3.0`; the adapter and the SVG renderer are `0.1.0`. The release is a
  **version bump plus a tag** — no behaviour change — so the versions move to `8.5.0` and
  `0.4.0`/`0.2.0`, and the tags move with the commit.
  Done when: every package's version and its tag agree, and the core's dependency on the contract
  names the new contract version.
  Verify: `script/library-entries.ts` and the manifests agree; `pnpm run test:exports` passes.

- [ ] **T10.1b Prove the tarballs one last time**
  `pnpm run test:publish` packs every package, extracts the tarballs into a `node_modules` **outside
  the repository**, and mounts both interactive adapters in Chromium. That check is the proof that
  what is published is consumable.
  Done when: the publish check is green on the release commit.
  Verify: `pnpm run test:publish`.

- [ ] **T10.1c Publish, in order**
  The contract first (`@spacegraphjs/renderer`), then the adapter, then the two interactive adapters
  and the SVG renderer, then the core last — the core depends on the contract.
  ```
  cd packages/renderer && npm publish --access public
  cd packages/adapter && npm publish --access public
  cd packages/spacegraph-renderer && npm publish --access public
  cd packages/cytoscape-renderer && npm publish --access public
  cd packages/svg-renderer && npm publish --access public
  cd ../.. && npm publish --access public
  ```
  The scope `@spacegraphjs` must be owned by the publishing account; if it is not, publish the five
  packages unscoped or under a scope that is.
  Done when: `npm view spacegraphjs version` and `npm view @spacegraphjs/renderer version` return the
  released versions, and `npm install spacegraphjs` resolves in an empty directory.
  Verify: that install, outside any workspace.

- [ ] **T10.1d Record what a consumer gets**
  A short "installing" section in the library's README: the exact `npm install` line, the contract
  version the host must speak, and the `SUPPORTED_CONTRACT_VERSIONS` negotiation.

### T10.2 The fork consumes the published packages

This is the task that makes the fork shareable: it removes the sibling checkout from the install
path.

- [ ] **T10.2a Cut the release branch**
  From the synced `dev` (G6), a branch — `session-graph`, following AGENTS.md's naming rule (at most
  three hyphenated words) — in which the seven `workspace:*` edges in
  `packages/session-ui/package.json` and `packages/session-graph/package.json` become the published
  ranges, and the root `package.json`'s workspace list drops the six `spacegraphjs` paths.
  Done when: the branch exists and is pushed.
  Verify: `git diff dev...session-graph -- package.json packages/session-ui/package.json packages/session-graph/package.json`.

- [ ] **T10.2b Regenerate the lockfile and re-run the gate**
  The gate must pass **without** the library checkout: `graph:verify`'s first step ("library build")
  is dropped from the release branch, and the library's own steps are removed from it — they belong to
  the library's CI, which T8.1 makes green. The host's suites, the capture verification and the app
  e2e stay.
  Done when: `bun install && bun run typecheck && bun test src/graph && bun run test:components` are
  green on the branch, with no `spacegraphjs/` directory present.
  Verify: the clean-directory install (T8.2c).

- [ ] **T10.2c The app e2e still intercepts the adapters' bundles**
  The e2e already intercepts the adapters' `dist` URLs; against the published packages the URLs are
  the same shape but the versions come from the registry. Check it rather than assume it.
  Done when: the graph e2e is green on the branch.
  Verify: `cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts`.

### T10.3 The hosted review build

**Facts.** `https://autonull.github.io/spacegraphjs7/` returns **404**. The workflow exists and runs
on every push to `main`, and every run failed at "Install dependencies" — cause known and fixed by
T8.1b (with the build behind it fixed by T8.1a). After those, the deploy should publish `index.html`,
`contract.html` and `second-host.html`; the demo build produces all three (verified today on a clean
checkout).

- [ ] **T10.3a Get the first green deploy**
  Push the T8.1 fixes to the library's `main` and watch the run through the Actions API. If the
  repository's Pages source is not "GitHub Actions", enable it (Settings → Pages) — the workflow
  cannot do it.
  Done when: the deploy run is `success` and the URL returns 200.
  Verify: `curl -s -o /dev/null -w "%{http_code}" https://autonull.github.io/spacegraphjs7/`; the
  run's step list.

- [ ] **T10.3b Check the deployed surfaces, not just the URL**
  The three pages must render with no console error at 1440×900 and 390×900: the contract demo, the
  second host (with its gallery and its layout picker), and the index.
  Done when: the deployed pages are opened and read.
  Verify: the demo's own Playwright suite against the deployed URL.

- [ ] **T10.3c Link the hosted build from both READMEs and the review packet**
  A maintainer must reach the URL from the first screen of the review packet.

### T10.4 The upstream issue / RFC

**Facts.** The text exists: `docs/spacegraph/upstream-pr.md` (the four-rung ladder) and
`docs/spacegraph/upstream-review.md` (the packet). There is **no `gh` CLI and no token** in this
environment, so the issue cannot be filed from here. TODO.2's T3.7 deferred it for a good reason —
the measurement (T2.2) did not exist. That reason still holds.

- [ ] **T10.4a Prepare the issue text so it is one paste**
  A single file, `docs/spacegraph/rfc.md`: the problem, the hypothesis, the **measured result** (the
  T2.2 table), what changed (the ladder), the flag and the rollback, the performance numbers, the
  security story, the maintenance story, and the exact review commands. It cites the two existing
  documents rather than duplicating them.
  Done when: the file exists and every claim in it has a number or a link behind it.

- [ ] **T10.4b File it, or hand it over with the reason**
  When T2.2 lands, the issue is filed by whoever holds a GitHub account, with the strongest
  screenshot and the measured result. If the result is negative, the issue says so — a negative
  result is publishable, and the library is the deliverable either way.
  Done when: the issue URL is in the README, or the deferral note names who files it and when.

- [ ] **T10.4c The fork's issue tracker**
  TODO.2's T6.9 mirrored the gates into GitHub issues and milestones and was deferred for the same
  reason. Do it in the same pass as T10.4b, with the same account. The label set is `graph`,
  `library`, `upstream`; the PR template (`.github/PULL_REQUEST_TEMPLATE/graph.md`) already exists and
  must be used by the first upstream PR.
  Done when: the milestones G5–G7 exist and the template is used.

### T10.5 The fork's public face

- [ ] **T10.5a The landing page says what the fork is**
  The fork's root `README.md` is upstream's README — a visitor to
  `github.com/autonull/opencode_spacegraph` sees OpenCode's README and nothing about the graph. Add a
  short banner at the top: what the fork is, that it is experimental and community-built, that the
  transcript remains the dependable baseline, and a link to `docs/spacegraph/`. Upstream's README
  stays below it.
  Done when: the first screen of the repository names the fork.
  Verify: the rendered README's first paragraph.

- [ ] **T10.5b One compelling screenshot**
  `SPACEGRAPH.md` §7 asks for it: the hybrid log with an expanded subgraph, recognizable OpenCode UI,
  meaningful labels, a reason to care. Today the capture set is a gallery; the *one* image is a new
  capture of the turn map open over the transcript.
  Done when: `docs/spacegraph/demo.png` exists and is the first image in both READMEs.

- [ ] **T10.5c The release note**
  A short document: what shipped, what is experimental, what is not supported, the flag and how to
  turn it on, the rollback (delete the flag), the known limitations, the tested commits, and the two
  repository URLs. It is what a reader forwards.
  Done when: it exists and the README links it.

- [ ] **T10.5d The limitation list is the honest one**
  `prototype.md` §"Known limitations" (20 items) must match the code, including what the library
  itself declares (`spacegraphjs/docs/limitations.md`): the mesh outline is a bounding box, the
  depth fade does not reach DOM cards, the layout engine does not know the screen, the perspective
  path's insets are an approximation, the force simulation costs two orders of magnitude more than
  the grid at scale, and the fit's legibility floor wins over the frame.

### T10.6 The shared state gets a branch and a tag

- [ ] **T10.6a The branch**
  `session-graph` (T10.2a) is the branch a reviewer reads and the branch an upstream PR comes from.
  It is cut from the synced `dev` and never force-pushed.
  Done when: the branch is on the remote and its README says what it is.

- [ ] **T10.6b The tag**
  A tag on the shared state, following the fork's convention (`graph-…-YYYY-MM-DD`) and the
  library's (`v8.5.0` and the five package tags). A tag marks the **tested** SHA.
  Done when: the tag points at the commit every gate passed on.

### T10.7 The stranger's path

One command, no provider, no npm account, no model:

```
git clone <fork> && cd <fork> && bun run graph:setup && bun run graph:dev
```

- [ ] **T10.7a Prove it from a clean directory**
  The path is executed from a fresh clone by someone who did not build it — or, failing that, by a
  script that does exactly what a stranger would do in a clean directory and reports every step.
  Done when: the demo renders the canonical session and the graph in a browser with no console error.
  Verify: the clean-clone run.

**Gate G7 — shareable.** One clone, one install, one URL, one document, one video, one npm release;
the upstream RFC is filed or handed over with a reason.

---

## 4. T2 — The evidence (carried, unchanged, and it alone gates the product claim)

TODO.2 §3 holds the protocol. It is carried here with its IDs so nothing is renumbered. **These need
people.** Everything else in this plan is preparation; these are the measurement.

- [ ] **T2.1 The internal dry run** — two people who did not build the UI attempt the five tasks
  cold, once per mode; record the path length, the dead ends and the missing affordances. The layout
  gallery (T7.5) is the affordance: a participant can be shown the same session in five shapes.
- [ ] **T2.2 The R7.3 protocol** — n ≥ 5, counterbalanced, the canonical fixture, no leading
  explanation; task success, time, wrong turns, interactions, preference (1–7) and quotes; the results
  table in `prototype.md`.
- [ ] **T2.4 The product decisions** — #10 naming, #14 representation, #15 depth, #16 file lens, from
  the data and the captures, not from preference.
- [ ] **T2.5 The stop rule** — if the graph does not beat the transcript on the five tasks, the
  product work stops, the finding is published, and the library is the deliverable.

**The stop rule governs this plan too.** If T2.2 is negative, G7 still stands — the library, the demo
and the review packet are the deliverable — but T10.4's issue says the result, and the fork ships as
a **companion**, not as a product bet.

**Gate G8 — validated** (TODO.2's G2). It gates the *product* claim, not the library.

---

## 5. Deferred and future seams

| ID | Item | Unblock condition | Seam already present |
|---|---|---|---|
| D1 | H6.5 inline row host | maintainer approval for a generic timeline slot | the turn-map overlay, the SVG `InlineGraph` |
| D2 | P8.4 host-neutral activity adapter | a real second host needs it | `GraphController` + the contract; the demo fixture |
| D3 | P8.8 incremental patches | profiling shows full-model diffs are too slow | `diffRenderModels`; the contract's `setModel` |
| D4 | cross-session graphs, recurring errors, comparing attempts | a validated single-session win | `data.sessionID`, stable ids, the SVG/JSON export |
| D5 | real 3D geometry, depth of field, production 3D | the protocol prefers `layered`/`depth-stack` | the depth seam; host-owned Z |
| D6 | **adopters of the published library** | the first real consumer outside the fork | the six packages, contract v3, the second host |
| D7 | **cross-host layout comparison** | a second host with a second vocabulary | the placement seam (T7.1), the second host's layout picker |

---

## 6. Verification matrix

| Check | Command | Owns |
|---|---|---|
| Sync integrity | `git rev-list --left-right --count HEAD...upstream/dev` | T9 |
| Model | `cd packages/session-ui && bun test src/graph` | ids, turns, levels, layout, representations |
| Graph package | `cd packages/session-graph && bun run typecheck && bun test src` | the render model, the registry, the inspector |
| Components | `cd packages/session-graph && bun run test:components` | the DOM contracts at 1440 / 1100 / 390 |
| App types | `cd packages/app && bun run typecheck && bun run typecheck:e2e` | the integration |
| App e2e | `cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts` | the mode, the live append, the fallbacks, the hash, the scroll |
| All graph steps | `bun run graph:verify` | the canonical gate |
| Captures | `bun run graph:capture --mode=compare` **then read them** | the visual acceptance — a deliberate refresh, never a per-change gate |
| Capture verify | `bun run graph:capture --mode=verify` | the routine gate: fresh renders into a temp dir, the committed set asserted, and no two frames of the zoom matrix alike |
| Scale budget | `bun run graph:scale` | the model/layout/render pipeline at 100, 1k and 5k messages, plus the tree and the force rows |
| Library suite | `cd spacegraphjs && npx vitest run` | the core and the packages |
| Library types | `cd spacegraphjs && npx tsc --noEmit -p tsconfig.json` | 0 errors for `src`, `test` and the five packages |
| Library build | `cd spacegraphjs && pnpm run build:lib && pnpm run build:packages` | the published artifacts |
| Published packages | `cd spacegraphjs && pnpm run test:publish` | the tarballs, in a clean consumer outside the monorepo |
| Second host | `cd spacegraphjs && pnpm exec playwright test --config playwright.demo.config.ts test/e2e/second-host.spec.ts` | a framework-free consumer outside OpenCode |
| Placement seam | `cd spacegraphjs && npx vitest run test/layout/` | the grid, the tree and the force placement behind one interface |
| Fit insets | `cd spacegraphjs && npx vitest run test/camera-fit.test.ts` | the frame inside the region the host's chrome leaves free |
| CI (library) | the Actions API on the public repository | T8.1 |
| CI (fork) | the Actions API on the public repository | T8.1d |
| Hosted demo | `curl -s -o /dev/null -w "%{http_code}" https://autonull.github.io/spacegraphjs7/` | T10.3 |
| npm | `npm view spacegraphjs version` | T10.1 |
| Clean-clone install | `git archive` into an empty directory, then `bun install` | T8.2, T10.2 |
| Lint | `bun run lint:changed` | the changed files |
| Repo check | `bun run check` | canonical, red for the known environmental reasons (T1.6) |
| Provider-free demo | `bun run graph:dev` | T6.1 |

**The capture set is not a per-change gate.** The committed images exist to inform and to show the
work; they are refreshed on purpose (T8.5a) and then read by eye. `--mode=compare` overwrites the
committed set, so running it after an unrelated change only produces noise to undo. The routine check
is `--mode=verify`. When a change really does alter the rendering, refresh the affected images and
*look* at them.

---

## 7. Decisions, risks, stop rules

### 7.1 Decisions this plan makes

| # | Decision | Reason |
|---|---|---|
| 1 | The library's CI is fixed **before** the sync | a red badge is the first thing a reviewer sees, and it is false |
| 2 | The fork ships **two modes**: a workspace link for development, published packages for consumption | the link is how the work is done; the published packages are how it is shared |
| 3 | The consumption mode is a **branch**, not a second package manager | one lockfile, one install, one gate |
| 4 | The declaration build gets `@typescript/typescript6` | TypeScript 7 has no JavaScript Compiler API; the error names the package; the fix is proven on a clean clone |
| 5 | The stale `benchmark.yml` is retired, not repaired | it audits a bundle the build stopped producing and installs a pnpm project with npm |
| 6 | `vue-spacegraph` is deprecated unless it reaches contract parity | it is the only framework binding with no consumer, and the library is framework-agnostic by decision |
| 7 | The graph's code is frozen at G5 | the remaining work is evidence, delivery and upstream syncs |
| 8 | The RFC is filed after the measurement, by whoever holds an account | an unmeasured claim is the wrong thing to put in front of a maintainer |
| 9 | The library's own suites leave the fork's gate when the fork consumes the published packages | the library's CI owns the library; the fork's gate owns the host |
| 10 | **The detail surface is the reader's choice, and the map does not move when it opens** | Clicking a node took 288 px of the canvas and reframed the camera — the one thing a reader opens most was the one thing that moved everything else (T8.8) |
| 11 | **The author's use of the product is the exemption to the freeze rule** | The freeze rule (§7.3 rule 4) says no graph features after G5. The author used the graph, found that the detail surface had one home and that the map was not yet a workspace, and asked for the work. It lands as one reviewed block in `SPACEGRAPH.TODO.4.md` (T11–T15, gates G9–G13), not as a drip |

### 7.2 Risks

| Risk | Likelihood | Mitigation | Fallback |
|---|---|---|---|
| Upstream's merge breaks a graph assumption | Medium | T9.5 re-checks the message and error variants; the model is fixture-driven | narrow the claim to the fixture's shape |
| The clean-clone install stays broken | Medium | T8.2a scripts the setup; T10.2 removes the sibling from the path | publish the packages first and cut the branch before the sync |
| The npm upload is not possible from here | **High** | T10.1c is one command and the order is written down | the fork ships as a two-repo setup and the library ships as a source checkout; the review packet says so |
| The hosted demo never goes green | Medium | the two causes are identified and the fixes are proven | the demo ships as `pnpm run dev:demo` and the review packet links the repository instead of a URL |
| The evidence never happens | **High** | T2 is scheduled with named participants and a protocol | publish the library and the negative note; the product claim stays explicitly unproven |
| The library's README outruns the code | Medium | T8.3e audits every row of the package map | ship the review packet as the only document a maintainer is asked to read |
| The diff grows while the docs quote old numbers | High | T8.6a regenerates the table from the merge base, and T9 re-audits after the sync | quote the number and the command that produced it, never a prose figure |
| Four red workflows become five | Low | T8.1d reproduces the fork's gate in a clean clone before it is trusted | freeze the workflows and run the gate locally, loudly |
| The library's install keeps differing per installer | Medium | T8.1d makes the peer toolchain explicit | pin the whole toolchain in one lockfile the CI installs |

### 7.3 Stop rules

1. Do not start T10 before T8 and T9 pass their gates. A share that does not install is not shared.
2. If T2.2 shows no advantage, stop the product work and publish the finding. The library, the demo
   and the review packet are still the deliverable; the RFC says so.
3. Do not rebase `dev`; do not force-push; do not delete the pre-sync tags.
4. Do not add graph features after G5. A feature that is not evidence-backed is a cost to the reviewer.
5. Do not publish a package whose tarball the publish check has not mounted.

---

## 8. Task map from TODO.2

| TODO.2 | TODO.3 |
|---|---|
| T2.1, T2.2, T2.4, T2.5 | carried (§4) |
| T3.7 (the ladder; the RFC deferred) | T10.4a, T10.4b |
| T3.8 (the diff budget) | T8.6a (re-audited), T9.8 |
| T4.2 (the upload) | T10.1a–T10.1d |
| T4.6 (CI) | T8.1a–T8.1d — the CI is red; this is the fix |
| T5.1 (the final image set) | T8.5a |
| T5.2 (the video) | T8.5b |
| T5.3 (the release docs) | T8.6, T10.5c |
| T5.4 (the budgets) | T9.7 |
| T5.5 (publish the fork and the RFC) | T10.1, T10.3, T10.4 |
| T5.6 (the final verification) | the gates G5–G7 |
| T6.2 (the hosted build) | T8.1b, T10.3a–T10.3c |
| T6.9 (the issue tracker) | T10.4c |
| T6.11 (the benchmark CI) | T8.3a |
| T6.13 (the devtools) | T8.3b |
| T6.14 (the API docs and the release automation) | T8.3c |
| T6.14 (`vue-spacegraph`'s fate) | T8.3d |
| T6.4 (the real-session corpus) | dropped in TODO.2's last pass |
| all of T1, T4.8–T4.14, T6.1, T6.5, T6.7, T6.8, T6.10, T6.12, T6.17–T6.20, T7.1–T7.6 | closed; cited, not repeated |

---

## 9. Log

Append-only. One entry per pass: date, task IDs, commands run, results, surprises, unverified items.

**2026-10-21 — TODO.3 created; the state measured, the blockers named.**
No code changed by this pass. What was measured:

- the fork's `dev` is `0e5f745c3d` (on `origin/dev`, 0/0) and **24 behind** upstream `dev` @
  `5c3891ec18` (fetched today); the library is `82c0f2e` = `origin/main`, clean;
- green today: `session-ui` graph **106**, `session-graph` unit **96**, `spacegraphjs` vitest **491**,
  the library's `tsc --noEmit` **0 errors**;
- **the fork does not install from a clean clone**: `bun install` fails with `Workspace not found
  "spacegraphjs/packages/adapter"` — the library is a separate, gitignored repository listed as a
  workspace, and two packages depend on it with seven `workspace:*` edges;
- **every workflow on both repositories is red**: the library's `CI` (fails at "Build the published
  packages"), `Deploy Demo` (fails at "Install dependencies") and `Benchmark` (fails at "Setup
  Node.js"), and the fork's `Graph` gate (fails at the gate step) — read through the unauthenticated
  GitHub API, which works for a public repository;
- **the two causes of the library's red CI were reproduced exactly** on a clean clone.
  `unplugin-dts` cannot use TypeScript 7 (whose only JavaScript export is a version stub), and the
  peer it resolves differs per installer — pnpm picks the library's TS 7 and the build throws, bun
  picks the fork's TS 6.0.3 and the build works, so the build is **not reproducible across
  installers**; the fix is `@typescript/typescript6`, verified to turn the failing build green. And
  `deploy-demo.yml` installs **pnpm 9**, which refuses the pnpm 10 lockfile with
  `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` — pnpm 10 installs it cleanly;
- **the fork's red gate was reproduced exactly** on a clean clone: the "view controller + framework
  bindings" step cannot resolve `react` or `solid-js`, because the library's two binding packages are
  **not** in the fork's workspace list and so their devDependencies are never installed — locally
  they resolve because the developer's own `pnpm install` inside `spacegraphjs/` put them in the tree.
  **With that fixed** (`pnpm install` in the library + `@typescript/typescript6`), the same clean
  clone ran the whole gate and reached the component suite: **49 of 50 passed**, and the one failure
  was the reduced-motion test's **clock** — the camera jump measured 437.9 ms against a 400 ms
  budget on a loaded runner with 8 workers — a timing assertion, not a behaviour, which is why T8.1e
  asks for a relative assertion instead;
- the **hosted demo has never deployed**: `https://autonull.github.io/spacegraphjs7/` returns 404,
  and every deploy run failed at the install step above;
- **nothing is published**: `spacegraphjs` and the five `@spacegraphjs/*` return 404 on the registry,
  the names are free, and there is no credential in this environment (`npm whoami` → "need auth");
  there is no `gh` CLI and no GitHub token, so the issue tracker and the RFC can be prepared but not
  filed;
- the **diff budget has drifted**: against the merge base `d249607e90`, `packages/app/src` is 21 files
  (+1057/−36 including the dev-only entry), `session-ui/src/graph` **+6,126** (the packet says +4,039),
  `packages/session-graph` **+7,411** (the packet says +6,924), `packages/ui/src/i18n/en.ts` **+173**
  (the packet says +158);
- the **sync is no longer free**: seven files overlap upstream's 150 changed files (the last two syncs
  had zero), and each one's hunks were read — the graph's hunks and upstream's free-limit hunks sit in
  different regions of the same files, so the merge should be clean apart from the generated lockfile;
- the **library's landing page outruns the code**: the package map lists a Vue binding whose build is
  a no-op and two packages that are not published.

Two index edits landed with this file: `SPACEGRAPH.TODO.2.md`'s status line now says it is frozen and
points here, and `docs/spacegraph/README.md`'s document list names this plan as the living one
(T8.6c, done early).

Unverified: the Actions *logs* are not readable without a token, so the failing steps were identified
from the step lists and then reproduced locally rather than read from the logs; the entry-delta table
is two syncs out of date and is not re-measured yet; the clean-clone gate run stopped at the
component suite (49/50), so the capture verification and the publish check after it have not been run
on that tree, and the motion test's 437.9 ms was measured once, on a loaded machine, not a
distribution.

**2026-10-21 — T8.8: the detail surface became the reader's choice.**
The author used the graph and found that clicking a node interrupts it: the side panel takes 288 px
and the camera reframes the whole map to make room. The detail is the thing a reader opens most, so
it should not be the thing that moves everything else.

What changed:

- the **detail mode** is a reader's choice — `off` | `card` | `popover` | `panel` — persisted per
  session beside the other graph preferences, offered in the toolbar, defaulting to `panel` so
  nothing changes for a reader who never touches it. The popover floats over the canvas and follows
  its node; the card mode puts a summary on the node itself; only the panel takes layout width and
  only the panel reframes the camera;
- the **card tier** (`far` | `mid` | `near`) is measured in screen pixels, not camera distance: the
  card's box never changes, so the tier changes the composition inside it. The thresholds are
  separate in and out, so a card never flips on a boundary;
- the **peek** answers "what is this?" under the pointer without changing the selection;
- the **library** grew the two generic capabilities the host needed: a renderer can say where a node
  is on the screen (`GraphRenderer.getNodeScreenPosition`, optional), and the SpaceGraph renderer now
  reports hover, which the Cytoscape renderer already reported. Two defects were fixed on the way:
  a host-driven card resize re-flows its content instead of scaling it, and a card hidden by
  `labelLod` takes its edges with it.

Two more defects surfaced while the change was being verified, both of them older than this pass:

- the **accessibility mirror replaced its whole list** whenever the model changed under the reader,
  so a model rebuild moved the keyboard focus to the body. The layer now paints the same nodes in
  place, and only rebuilds (and restores the focus) when the list's shape really changed.
- the **toolbar's back control** could be pushed onto a second row by one more control, and the
  host's floating header hint then covered it. The detail control is a compact menu for that reason.

Measured: `session-ui` graph **112** (+6), `session-graph` unit **97** (+1), the library's vitest
**529** (+2), the library's `tsc --noEmit` **0 errors** in the packages it owns; the new `graph-detail`
component spec **4 passed**; the session-graph component suite **54 passed**; the app's graph e2e
**27 passed**.

**The two failures this pass found were not the remote branch's, and the remote branch does not fix
them.** The upstream `dev` head is green on both `test` and `check` with the same manifests, the
same tsconfigs and the same lockfile resolutions, and none of its 24 commits touches the lockfile's
dependency resolutions, the app's test setup, or these packages. All three causes were local:

- the **install could not complete** — see T9.4 above;
- the **app's unit suite** failed on 36 files because Bun's automatic JSX runtime imports `jsxDEV`
  from `solid-js/jsx-dev-runtime`, which maps to solid-js's production build, where `jsxDEV` does
  not exist (only the `solid-js/h` runtime has it). The repository pins `bun@1.4.2` in
  `packageManager` and CI uses that; the machine that ran this pass had **1.4.3**, and Bun 1.4.2
  runs the same suite **775 passed, 0 failed**. The vite build is unaffected — `vite-plugin-solid`
  does its own transform;
- the **`plugin-browser` typecheck** resolved `node:zlib` by walking *out* of the repository, into a
  stray `/home/me/node_modules/@types/node@22.10.2` (a home-directory install), because neither
  that package nor the repository root declared `@types/node`. The root declares it now, so the
  resolution is deterministic: the whole repository typechecks **40/40**.
