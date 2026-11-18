# SPACEGRAPH.TODO.42.md — Upstream `dev` synchronization plan

**Status:** planned, **not started** (2026-11-18). **Fallback only** — see `SPACEGRAPH.TODO.43.md` for the preferred plugin-only path, which avoids this merge. Resume in a fresh session.
**Extends:** `SPACEGRAPH.TODO.41.md` (r17, implemented and committed).
**Goal:** bring the fork onto the latest `anomalyco/opencode` `dev` without losing the SpaceGraph capability platform, fix the resulting issues, regenerate screenshots, and push to a **new origin branch** (never overwrite an existing branch in this phase).
**Push target (decided):** a new branch on `origin` (`autonull/opencode_spacegraph`), name `upstream-sync-r17` or `upstream-sync-<YYYYMMDD>`.

---

## 1. Measured state (2026-11-18, do not re-derive unless refs moved)

| Ref | Value | Relationship |
|-----|-------|--------------|
| `pr1-plugin-surface-apis` (current work) | `5b9000a2ef` | fork feature line; contains all of TODO.41 incl. r17; r17 commits: library `ba733d0`, outer `5b9000a2ef` |
| `upstream/dev` (fetched) | `0220248dc1` | 2,251 commits ahead of the work branch's merge base |
| merge base (`HEAD` ↔ `upstream/dev`) | `d249607e90` (2026-10-20) | old OpenCode tree |
| `origin/dev` | `4c33acdae1` | fork dev, ancestor of work branch (46 behind it) |
| `upstream-dev-sync` | `8d637bc2dd` | near-synced fork line, **254 ahead / 151 behind** `upstream/dev`; has TODO.40-era work but **none of TODO.41** |
| `clean-sync` | `a96542b199` | `origin/dev` + 1 |

**Direct merge cost (`git merge-tree --write-tree HEAD upstream/dev`): 917 conflicts**
- 860 add/add, 49 content, 7 modify/delete, 1 file-location.
- Add/add conflicts are concentrated in shared packages (`packages/gui-plugins` incl. `src/browser/i18n/*`, `packages/ui`, `packages/util`) that both lines added independently. A blanket `-X theirs` would silently discard fork SpaceGraph integration in those files. **Do not use `-X theirs` on the direct merge.**

**Why upstream is structurally different:** since `d249607e90`, upstream renamed/moved large trees (`packages/gui-extensions`, `packages/web`, `packages/console`, `packages/stats`, `services/www` → `packages/data`, `packages/stories`, `packages/gui-plugins`, …). The fork's integration seams were written against the old layout.

**Synced-line merge cost (`git merge-tree --write-tree upstream-dev-sync upstream/dev`): 10 conflicts** (disposition in §4). This is the reason the staged strategy below starts from `upstream-dev-sync`, not from the work branch.

**Separate library repo:** `spacegraphjs/` is a submodule (`url = https://github.com/autonull/spacegraphjs7`). On the work branch it is tracked as a plain directory; on `upstream-dev-sync` as a gitlink (`a5baca26fb`). Library `main` is **39 commits ahead** of `origin/main` (r17 tip `ba733d0`). It must be pushed separately (§6).

---

## 2. Decisions already made (fresh session should not re-litigate)

1. Stay synchronized with the latest OpenCode upstream `dev` — this is `SPACEGRAPH.md §11.2 (T9)`, not optional feature work.
2. **Push to a new origin branch only.** Do not push to `origin/dev`, `origin/pr1-plugin-surface-apis`, or `upstream/dev`.
3. Preserve **all of TODO.41**, including r17's live `VisionAssert` threading and DOM-card fog.
4. Use the staged strategy (§3). Do not attempt the 917-conflict direct merge.
5. After the sync, UI/UX work continues **aligned with `SPACEGRAPH.md`** (§8). Visual appeal is not the success criterion (§1.2); do not add pixel-hash evidence (r16 decision).

---

## 3. Strategy (why this order)

```
upstream-dev-sync  ──merge──▶  upstream/dev        (10 conflicts, easy)
        │                            │
        └── new branch "upstream-sync-r17"
                    │
                    └── overlay TODO.41 fork delta from pr1-plugin-surface-apis
                                │
                                └── fix → verify → regenerate screenshots → push new origin branch
```

Start from the near-synced line so the 2,251 upstream commits arrive through a small, well-understood conflict set. Then port only the TODO.41 fork delta on top. This avoids re-resolving the 917 conflicts caused by the fork's duplicated upstream files.

---

## 4. Step-by-step procedure

### Step 0 — Freeze and confirm (read-only)
```sh
cd /home/me/opencode_spacegraph
git fetch upstream dev
git fetch origin
git status --short --branch            # must be clean on pr1-plugin-surface-apis
git log -1 --format='%h %ci %s' upstream/dev
git merge-tree --write-tree upstream-dev-sync upstream/dev > /tmp/sync-conflicts.txt || true
grep -c '^CONFLICT' /tmp/sync-conflicts.txt   # expect ~10; if much larger, stop and re-plan
```
Record the upstream tip SHA in the plan/PR body.

### Step 1 — Worktree on the synced line
Create a worktree (do not disturb the current session's branch):
```sh
git worktree add /home/me/opencode_spacegraph/.worktrees/upstream-sync-r17 upstream-dev-sync
```
Open the fresh session in that worktree. Keep `pr1-plugin-surface-apis` intact as the donor of the TODO.41 delta.

### Step 2 — Merge latest upstream/dev into the new branch
```sh
cd /home/me/opencode_spacegraph/.worktrees/upstream-sync-r17
git merge --no-ff upstream/dev -m "chore: sync upstream dev (anomalyco @ <SHA>)"
```
Resolve the 10 conflicts by this disposition table:

| Conflict | Disposition |
|----------|-------------|
| `bun.lock` | Take upstream's lockfile, then regenerate with `bun install` after the overlay (Step 5). |
| `packages/schema/src/config/flag.ts` | Keep upstream's version as base; re-apply the fork's `graph_*` flags / `all_flags` bridge from `pr1-plugin-surface-apis` (P0.5). This is a small, explicit edit — verify against `test/manifest.test.ts` and `GRAPH_FLAG_AXES`. |
| 7 × `packages/data/app/**` (`language.tsx`, `data-path.ts`, `language.ts`, `locale.ts`, `middleware.ts`, `sitemap.xml.ts`, `stats-cache.ts`, `og.test.ts`) — "deleted in upstream-dev-sync, modified in upstream/dev" | Keep upstream's files (`git checkout --theirs -- <paths>`). These are upstream data-app files that the older sync line deleted; the fork has no SpaceGraph content in them. |

Commit the merge only after `git diff --check` is clean and no `<<<<<<<` markers remain:
```sh
grep -rln '^<<<<<<<' --exclude-dir=node_modules . | head
```

### Step 3 — Port the TODO.41 fork delta
Enumerate the donor files, then overlay them from `pr1-plugin-surface-apis`. Use explicit path groups, **never** a whole-tree checkout:

```sh
DONOR=pr1-plugin-surface-apis
git checkout "$DONOR" -- \
  spacegraphjs \
  packages/session-graph \
  packages/gui-plugins/src/spacegraph \
  packages/session-ui/src/graph \
  packages/app/e2e/graph \
  packages/app/src/ui/graph \
  packages/storybook/.storybook \
  docs/spacegraph \
  SPACEGRAPH.md SPACEGRAPH.TODO.*.md \
  script/app-matrix.ts script/capture-graph-demo.ts script/graph-verify.ts \
  script/graph-setup.ts script/docs-graph.ts script/generate-demo-video.ts \
  .github/workflows/graph.yml
```
Verify the overlay brought the r17 markers:
```sh
test -f SPACEGRAPH.TODO.41.md && grep -q 'Status:.*implemented (r17)' SPACEGRAPH.TODO.41.md
grep -q sceneFadeDensity spacegraphjs/src/plugins/LODPlugin.ts
grep -q 'global: options.global' spacegraphjs/packages/spacegraph-renderer/src/index.ts
test -f packages/app/e2e/graph/widget-behavior.spec.ts
```

**Do not overlay** `package.json`, `bun.lock`, `packages/app/src/runtime/**`, `packages/session-ui/src/context/**`, i18n, theme CSS, or other shared upstream seams. Those are reconciled in Step 4.

### Step 4 — Reconcile shared integration seams (manual, smallest possible edits)
Re-apply only the fork's *SpaceGraph-specific* hunks to upstream's versions of these files (compare with `git diff "$DONOR" -- <file>`):

- root `package.json` — workspace entries (`spacegraphjs`, `spacegraphjs/packages/*`, `packages/gui-plugins`) and graph scripts (`graph:capture`, `graph:verify`, `graph:scale`, `graph:dev`, `graph:setup`); **keep upstream's versions/deps elsewhere**.
- `packages/gui-plugins/package.json` and plugin registration surfaces — the `spacegraph.map` / `spacegraph.hybrid` / panel registrations and `@spacegraphjs/*` deps.
- `packages/app/package.json`, `packages/session-ui/package.json`, `packages/session-graph/package.json` — only `@spacegraphjs/*` deps and script entries.
- `packages/app/src/runtime/plugin/*` and `packages/app/src/shell/...` — only the mapping to plugin-provided graph surfaces (compare against donor; do not revert upstream refactors).
- `packages/schema/src/config/flag.ts` — `graph_*` flags (from Step 2).
- `packages/storybook/.storybook/main.ts` — only graph story globs; keep upstream's `optimizeDeps`/aliases (the component-tests skill documents why).

Rule for every seam: **upstream wins on structure; fork wins only on SpaceGraph-specific lines.** If a fork hunk cannot be applied without reverting an upstream refactor, leave it out and record it as a gap to fix in Step 6.

### Step 5 — Dependencies and library build
```sh
bun install                                   # regenerates bun.lock for the new tree
cd spacegraphjs && pnpm install --frozen-lockfile
pnpm run build:lib && pnpm run build:packages  # dist is gitignored; needed by host tests
pnpm run write:exports                         # only if export map changed (it should not)
```
Decide explicitly whether `spacegraphjs/` stays a **plain directory** (work-branch convention, simpler for `graph:setup`/`graph:dev`) or a **gitlink** (upstream-dev-sync convention). Recommended: keep it a plain directory for this sync; note the choice in the PR body so it can be revisited.

### Step 6 — Fix all issues (the "fix all issues" part of the request)
Run, in order, and repair every failure that is caused by the sync (not pre-existing):

```sh
# from repo root
bun run check                         # oxlint + ast-grep + typecheck (canonical)
bun run graph:verify                  # full graph gate
# from packages
cd packages/session-ui && bun test src/graph
cd packages/session-graph && bun run typecheck && bun test src && bun run test:components
cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts
cd spacegraphjs && pnpm exec vitest run --maxWorkers=4 && bun run test:boundaries \
  && pnpm run test:publish && pnpm run test:publish:second-host \
  && pnpm run test:explorer && pnpm run test:capture-matrix
```
Known non-defects to **not** chase (record in PR body):
- `session-graph.spec.ts` has 30 pre-existing keeper failures (`SPACEGRAPH.TODO.41.md` r13 clarification).
- Full library vitest can time out an entry/SSR/vision file under high worker load; rerun with `--maxWorkers=4`.
- Cold Storybook runs can print optimize-deps reloads; judge the component suite on a warm cache (see `component-tests` skill).

### Step 7 — Regenerate screenshots
Only after Step 6 is green:
```sh
cd /home/me/opencode_spacegraph
bun run graph:capture --mode=compare     # writes frames into docs/spacegraph/screenshots/
bun run graph:capture --mode=verify      # assert the committed set and hashes
```
Commit regenerated PNGs and the derived matrix/app reports together with the sync. Do **not** add new pixel-hash gates (r16 decision).

### Step 8 — Commit and push to a NEW origin branch
```sh
git add -A
git commit -m "chore: sync upstream dev (anomalyco @ <SHA>) and port SpaceGraph platform"
git push -u origin HEAD:upstream-sync-r17     # NEW branch only
```
Then push the library repo separately:
```sh
cd /home/me/opencode_spacegraph/spacegraphjs
git push origin main                         # r17 tip ba733d0, 39 commits ahead
```
Open a PR targeting `origin/dev` only after the new branch is verified; do not target `upstream/dev` directly.

---

## 5. Rollback / safety

- All work happens in a worktree on a new branch; `pr1-plugin-surface-apis` and `upstream-dev-sync` remain untouched.
- If Step 3's overlay produces an unmanageable number of conflicts, abort with `git merge --abort` (or delete the worktree) and re-plan — do not force.
- Never use `git push --force`, never reset a shared branch, never `git commit`/`git push` to `upstream/*`.

---

## 6. Fresh-session handoff checklist

1. Read this file and `SPACEGRAPH.TODO.41.md` r16/r17 clarifications first.
2. Re-run the read-only `git fetch` + `merge-tree` counts in Step 0; if upstream moved, update §1 and the disposition table.
3. Confirm push target is still a **new origin branch**.
4. Follow Steps 1–8 in order; do not skip the verification gates.
5. Report: upstream SHA synced, conflict count resolved, which fork seams could not be ported cleanly, gate results, new branch name, library push status.

---

## 7. UI/UX continuation (after the sync, aligned with `SPACEGRAPH.md`)

The sync restores a clean upstream base; the next phase is UI/UX work against the actual product purpose:

- **`SPACEGRAPH.md §1.2`:** success = measured task performance on the five investigative questions, **not visual appeal**. Any UI/UX change should be justified by a task, not by a screenshot.
- **`§1.3` dimensions:** cognitive load, onboarding, orientation, exploration, delight. The hybrid is the ergonomic bridge (transcript stays familiar; graph answers a question). Prefer changes that reduce orientation cost (stable layout, minimap, breadcrumbs, zoom) over decorative motion.
- **`§1.5` semantic zoom / `§1.6` dual representation:** UI work must preserve the level/ladder seams (library owns mechanism, host owns policy — `TODO.41` rules 1 and 3).
- **`§5` hybrid experience:** split view, turn-map overlay (`mod+alt+t`), inline subgraph, side panel, permalinks (`#graph:<nodeID>`). New UI should extend these rather than add a competing mode.
- **`§10` evidence gap:** the product claim stays gated on the unrun n ≥ 5 study. Do not declare a winning configuration or change an OpenCode default; keep every capability switchable, URL-encodable, and capturable (`TODO.41` rule 2).
- **`TODO.41` r16:** visual-appeal pixel frames are not evidence; functional/DOM assertions are. Reuse `widget-behavior.spec.ts` / `canvas.spec.ts` patterns for new UI contracts.
- **`§11.1` engineering wrap-up:** after the sync, revisit T8.1–T8.7 (CI green, clean-clone installability, docs re-baseline, demo video, code freeze) before feature work.

Candidate first UI/UX items to evaluate after the sync (not decided here):
1. Re-check card legibility and fog on the real surface now that DOM-card fog (r17) and the debug instance exist.
2. Verify the hybrid split still answers the five questions after upstream's session/timeline refactor.
3. Re-measure the entry delta and the performance numbers in `SPACEGRAPH.md §7.3` against the new merge base (T8.6).

---

## Revision log

- **r0 (2026-11-18):** Plan written only; no sync started. Recorded measured branch topology (2,251 behind, 917 direct-merge conflicts, 10 conflicts from `upstream-dev-sync`), staged strategy, seam disposition, verification gates, new-branch push target, and UI/UX continuation criteria. User decision: plan now, execute in a fresh session.
