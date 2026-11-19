# SPACEGRAPH.TODO.44.md — Consolidation and parity plan

**Status (r6):** Fully green. Phases 0–10 are done; every gate and every package suite passes: root
`check` 57/57, `graph:verify` all steps, capture verify 31/31 + 2/2 + matrix, component 77/77,
`session-ui` graph 377/377, app graph e2e 44/44, `session-graph` 136/0, `gui-plugins` 1164/0,
`client` 262/0, `server` 136/0, app unit 2798/0, app browser 359/0, `core` 7576/0. Screenshots were
regenerated from the final code. Only sign-off (push + PR) remains, blocked on the owner. Supersedes
the delivery model of `SPACEGRAPH.TODO.43.md` and keeps its verified restore (`r22`–`r23`).
**Extends:** `SPACEGRAPH.TODO.43.md` (r22 restore, r23 wiring). Reference: `SPACEGRAPH.TODO.41.md`
(the capability manifest) and `SPACEGRAPH.md` §6/§9/§11.
**Goal:** one copy of every artefact, full functional parity with the pre-today fork, and two visual
frames that pre-today never captured. The fork stays a fork, synced to upstream `dev`.
**Principle:** *one owner per fact, one generated copy per artefact, and a gate that fails on drift.*
Delete what duplicates. Never keep two editable copies.
**Standing scope:** fork, not plugin-only. The SpaceGraph source stays in the fork. No upstream PR and no
repo pushes without explicit sign-off.

---

## Progress (r2)

| Phase | Status | Evidence |
|-------|--------|----------|
| 0 — Verification harness | Done | `test:components` 77/77; Tailwind `@source` now includes `session-graph/src`; security test asserts the escaped `title` |
| 1 — Delete rejected deliveries | Done | `spacegraph-gui-plugin/`, `packages/plugins/spacegraph/`, two bundle specs, the dead e2e util and 5 stubs removed; `bun.lock` cleaned |
| 2 — Regenerate and gate the copy | Done | 59 generated modules; `check:graph` added to the package and root `check`; parity 8/8; `model.ts` adapted to the canonical `buildGraph` API |
| 3 — One state owner | Done | app `graph-layout.ts` reduced to `map` / `sideBySide`; plugin `State` owns presentation state |
| 4 — Workspace snapshot | Done | the cached graph memo now lives in a persistent root, so a surface remount cannot lose the snapshot; frames `32`/`33` pass |
| 5 — Transcript reveal seam | Done | `SessionScreen.transcript` is provided by the host from the timeline interaction |
| 6 — Flag stub and dead app code | Done | capability gates read persisted plugin prefs; 5 dead app graph files and `graph-panel.css` deleted |
| 7 — Verification and parity | Done | root `check` 57/57, `graph:verify` all steps, capture verify 31/31 + 2/2 + matrix, no frame regressed |
| 8 — Hybrid composition | Done | arrangements and bridge were already plugin-owned; log text-size control and `hybrid.css` added |
| 9 — Side panel | Done | `Overview` panel tab renders the static SVG overview and reveals a message on pick |
| 10 — Reconcile `SPACEGRAPH.md` | Done | §5.1, §5.4, §6.3, §7.1, §9.4 and §11.4 now describe the fork |

**Re-verified (r3):** from clean `HEAD` on branch `pr1-plugin-surface-apis`, root `check` 57/57,
`graph:verify` all 16 steps (component 77/77, capture verify 31/31 + 2/2 + matrix), `session-graph`
unit 136 pass / 0 fail. No tracked source changed in r3; the fix was to clear a stale Vite cache (§12).

**Repaired (r5):** all 19 `session-ui` graph-model failures fixed at root cause (§12); the package is
377/377 and suite runtime fell from ~4 s to 0.5 s.

**Repaired (r6):** every remaining suite failure fixed at root cause (§12): `gui-plugins` 1164/0,
`client` 262/0, `server` 136/0, `core` 7576/0, app graph e2e 44/44. Final full gate set green: root
`check` 57/57, `graph:verify` all steps, capture verify 31/31 + 2/2 + matrix, component 77/77.
Screenshots regenerated from the final code and frame `02` visually verified.

---

## 1. What r22/r23 measured

| Fact | Evidence | Consequence |
|------|----------|-------------|
| The graph is reachable again | `data-graph-ready="true"`, `renderer="spacegraph"` in a real browser | The r22 restore alone was inert; r23 wired it |
| Main frames reach visual parity | fresh `02-graph-overview` matches the pre-upgrade frame; capture **29/31** | The look holds; two frames do not pass |
| Two frames never passed | `32 graph workspace code`, `33 graph workspace all`; pre-today plugin passed `snapshot: undefined` | A real parity gap, fixable now |
| The generated model copy is stale | `graph-parity.test.ts` 7 failures; `bun script/sync-graph.ts` is not run and `check:graph` is **not registered** in `packages/gui-plugins/package.json` | Drift is unguarded; the copy fails |
| A rejected delivery is still in-tree | `spacegraph-gui-plugin/` (213 source files, `@spacegraph/gui-plugin`) and `packages/plugins/spacegraph/` (11 files, `@autonull/opencode-plugin-spacegraph`), referenced by 3 app test files | Duplicate plugin and model; delete |
| App graph code is partly dead | `packages/app/src/session/graph` has 9 files; `graph-metrics-readout.tsx`, `session-graph-panel.tsx` and `session-graph-view.tsx` have **0 importers** | Dead source; delete |
| Two state stores describe the same facts | app `graph-layout.ts` (module-level) and plugin `State` session store (`gui-plugins/src/spacegraph/index.ts:229`: focus/level/layout/depth/arrangement/side/detailMode/turnMap/surface/checkpoint/trace/groups/notes/pins/queries/neighborhood/follow) | Pick one owner |
| Two i18n catalogs are **not** duplicates | app `packages/ui/src/i18n/en.ts` has 367 `ui.sessionGraph.*` keys used by `@opencode/session-graph` via `@opencode/ui/context/i18n`; plugin `i18n/en.ts` has 35 keys for plugin chrome | Keep both; do not merge |
| The plugin can read app contexts | `packages/gui-plugins/src/file/artifact-view.tsx:25` imports `@opencode/session-ui/context/markdown` | The plugin can call `useData()` directly |

Registered gates today: `bun run check` **58/58**, `session-graph` **136/136**, graph model **358
pass / 19 pre-existing fail**, app graph e2e **2/2**, capture **29/31**, `test:components`
**74/77** (was **0/77** before the r1 harness repair).

### 1.1 Doc-to-code audit of `SPACEGRAPH.md`

| Doc claim | Code today | Verdict |
|-----------|-----------|---------|
| §3.2 model package `session-ui/src/graph` | All named modules exist (`vocabulary`, `model`, `build`, `lookup`, `levels`, `layout`, `summary`, `selectors`, `fixture`) | Correct |
| §3.2 host modules `session-graph/src/ui` | All named modules exist (`GraphView`, `graph-camera`, `graph-selection`, `graph-anchors`, `graph-windows`, `cardTemplate`, `card-copy`, `node-data`, `GraphDetail`) | Correct |
| §4.1–4.5 node/edge/level/layout/selector semantics | Implemented and tested | Correct |
| §5.1 hybrid panel `app/src/session/graph/session-graph-panel.tsx` owns arrangements, log text size and the bridge | The file exists but has **0 importers**; the plugin's `HybridSurface` is a fixed 50/50 split with no arrangements, text-size slider or reveal bridge | **Stale doc + missing behaviour** |
| §5.2 turn-map overlay scoped to the panel | Wired in `session/screen.tsx` with `screen.panel.width()` | Correct |
| §5.3 inline SVG subgraph | `TurnMapInlineGraph` exists; not injected into timeline rows, as documented | Correct |
| §5.4 side panel `gui-extensions/session-map` compact SVG overview | No built-in side-panel extension; `gui-plugins/src/spacegraph/panel.tsx` is a full map panel | **Stale doc + missing surface** |
| §5.5 permalinks `#graph:<nodeID>` | `graph-permalink.ts` wired in `session/screen.tsx` | Correct |
| §7.1 `bun run graph:verify` as the full gate | It cannot pass (`test:components` 3 failures; capture 29/31) and its Storybook step predates the `packages/stories` harness | **Broken gate command** |
| §7.2 test commands | Correct commands, except the component step now needs the story roots (fixed r1) | Correct after r1 |
| §6.3/§9.4/§11.4 plugin-only delivery, fork source-free | Contradicts the authorised fork delivery | **Stale doc, to rewrite** |

**Conclusion:** the graph and UI module tables are accurate; the delivery sections and the hybrid/side
panel sections are not. The plan must restore the missing surfaces *and* correct the doc.

---

## 2. Target architecture — one owner per fact

| Fact | Single owner | Generated copies | Fork patch |
|------|--------------|------------------|-----------|
| Graph model (nodes, edges, layout, selectors) | `packages/session-ui/src/graph` (95 files) | `gui-plugins/src/spacegraph/internal/graph` (58 files) by `script/sync-graph.ts` | Yes — the feature |
| Graph UI (view, panel, overlay, find, minimap, inspector, windows) | `packages/session-graph/src/ui` and `canvas` | none | Yes |
| Graph plugin registration (2 surfaces, panel, settings, header slot) | `packages/gui-plugins/src/spacegraph` | none | Yes |
| Graph presentation state (layout/depth/lens/turnMap/checkpoint/notes/pins) | plugin `State` (per session) + `Prefs` (global) | none | Yes |
| Which surface a session shows (`map`/`sideBySide`) | app (`session.layout.graph`, two booleans) | none | Yes, generic |
| Workspace snapshot data | app `createSnapshotCache` behind `SnapshotSource` | none | Yes, generic |
| Transcript viewport (`activeMessageID`, `reveal`) | app, behind optional `SessionScreen.transcript` | none | Yes, generic seam |
| Renderer library (`@spacegraphjs/*`) | `spacegraphjs/` (own repo) | none | No |
| Graph copy strings | app 367 keys (`session-graph` UI) + plugin 35 keys (plugin chrome) | none | Yes |

Delete: `spacegraph-gui-plugin/`, `packages/plugins/spacegraph/`, the 3 dead app graph files, the app's
rich `graph-layout.ts` fields, and the `graphFlagEnabled` stub.

Budget: the fork patch stays at the seam + model + plugin registration. No new copy is introduced.

---

## 2.5 Phase 0 — Make the verification gates runnable

`graph:verify` could not pass before this phase: the `packages/stories` harness did not serve
`session-graph` stories, so all 77 component tests timed out on an empty `#story-root`.

1. **Done (r1):** add `"session-graph"` to the story roots and the dependency-scan glob in
   `packages/stories/vite.config.ts`.
2. **Done (r1):** let `findStory` resolve a component id to its first story in
   `packages/stories/src/index-plugin.ts`, so the pre-today `mount("session-graph-view")` spelling works.
3. **Done (r2):** fixed the 3 failing component tests — the inspector resize (wide), bottom sheet
   height (narrow) and hostile-markup card assertion.
4. **Done (r2):** the Storybook step in `script/graph-verify.ts` now runs `packages/stories`
   (`bun run --cwd packages/session-graph test:components`); result 77/77.

**Gate:** `test:components` **77/77**.

---

## 3. Phase 1 — Delete the rejected deliveries

The plugin-only plan created two packages that duplicate the built-in plugin and the model.

1. Delete `spacegraph-gui-plugin/` (213 source files) and `packages/plugins/spacegraph/` (11 files).
2. Update the 3 references: `packages/app/component-tests/spacegraph-plugin.spec.ts`,
   `packages/app/component-tests/plugin-spacegraph.spec.ts`, `packages/app/e2e/utils/spacegraph.ts`.
   The installed-bundle gate tested the superseded delivery; the capture gate and
   `widget-behavior.spec.ts` cover the built-in plugin instead.
3. Delete the 5 orphaned stubs `packages/app/e2e/utils/stubs/spacegraphjs-{compare,controls,export,overlays,turn-map}.ts`;
   they have **no importers**.
4. Remove `spacegraph-gui-plugin` from any workspace/ignore list, and `.turbo` references die with the cache.

**Gate:** `bun run check`, `session-graph` `test`, app `test:e2e`, and capture `29/31` stay at baseline.

---

## 4. Phase 2 — Regenerate the model copy and gate the drift

1. Run `bun script/sync-graph.ts` from `packages/gui-plugins` to regenerate
   `src/spacegraph/internal/graph` from `packages/session-ui/src/graph`.
2. Add the missing `"check:graph": "bun script/sync-graph.ts --check"` to
   `packages/gui-plugins/package.json`; run it before `test` (the script already documents that intent).
3. Add `bun run --cwd packages/gui-plugins check:graph` to the root `check` task so drift fails CI.
4. Confirm `graph-parity.test.ts` turns green; if a genuine gap remains, fix the source, not the copy.

**Gate:** `graph-parity.test.ts` **0 failures** (today 7); `check:graph` green.

---

## 5. Phase 3 — One state owner

The app and the plugin both describe graph presentation state.

1. Keep the app `session.layout.graph` to **two booleans**: `map` and `sideBySide` (surface choice only),
   with the minimal setter surface the screen already uses.
2. Delete the rich fields (`arrangement`, `arrangementSide`, `split`, `logTextScale`, `projection`,
   `renderer`, `selected`, `layout`, `depth`, `detailMode`, `detailFraming`, `peek`, `followLog`,
   `minimap`, `files`, `turnMap`, `rules`, `windows`) from `packages/app/src/session/graph/graph-layout.ts`.
3. Move every consumer of those fields to the plugin `State` store (`ctx.stores.session`) and `Prefs`
   (`ctx.stores.prefs`), which the host already persists per session and globally.
4. The plugin's `setLayout`/`setDepth`/`setTurnMap`/`setNotes`/`setPins` stay the only writers.

**Gate:** a graph layout change survives a session switch and a reload; `bun run check` green.

---

## 6. Phase 4 — Feed the workspace snapshot to the plugin

Frames `32`/`33` fail because the plugin's `useGraphModel` passes `snapshot: undefined`
(`packages/session-graph/src/gui/index.tsx`).

1. In the plugin's `useGraphModel`, call `useData()` from `@opencode/session-ui/context` (the plugin
   already imports `@opencode/session-ui/context/markdown`, so the context is available).
2. Load the session-scoped snapshot (`source.load("session")`) and pass
   `snapshot: source.get("session")` to `buildGraph`.
3. Keep the app's `SnapshotSource` provider (`createSnapshotCache` in `session-ui-provider.tsx`).
4. Delete the app-side `session-graph-view.tsx` snapshot memo, which nothing mounts.

**Gate:** capture `32 graph workspace code` and `33 graph workspace all` pass (**31/31**), which
pre-today never achieved.

---

## 7. Phase 5 — Restore the transcript reveal seam

The graph's "return to the log" cannot reveal a message: upstream dropped the transcript viewport API,
so `SessionScreen.transcript` is optional and nothing supplies it.

1. Keep the optional `TranscriptScreen` seam in `packages/plugin/src/gui/host-apis.ts` (done in r22).
2. In `packages/app/src/runtime/plugin/mounted-session.ts`, add `transcript` to the frozen `screen`
   object from the timeline interaction: `activeMessageID` from the timeline projection, `reveal` from
   `timeline.actions.revealMessage`.
3. The graph's `onBack` and turn-map overlay then reveal the message they name.
4. Fall back to the model's active turn when a host omits the seam (already implemented).

**Gate:** a graph node's "open in transcript" scrolls the log to that message in a browser test.

---

## 8. Phase 6 — Retire the flag stub and the dead app code

1. Replace `graphFlagEnabled = () => true` in `packages/gui-plugins/src/spacegraph/model.ts` with the
   plugin `prefs` gates (`prefs.capabilities.<name>`), which the host persists.
2. Delete the 3 dead app graph files `graph-metrics-readout.tsx`, `session-graph-panel.tsx` and
   `session-graph-view.tsx`. `graph-panel.css` is imported **only** by `session-graph-panel.tsx`, so it goes too.
3. Move the header toggle into the plugin as a `Slot` at `session.header`
   (`packages/app/src/session/timeline/message-timeline.tsx:614` already renders that slot).
   Keep the app-side toggle only if the slot cannot carry the keybind and tooltip.
4. Move the turn-map overlay into the plugin (`TurnMapOverlay` already exists at
   `packages/session-graph/src/ui/TurnMapOverlay.tsx`); delete `packages/app/src/session/graph/turn-map-overlay.tsx`.

**Gate:** the header toggle renders from the plugin; the overlay opens from the plugin; no app graph
source remains except the seam, `graph-permalink.ts`, `snapshot-cache.ts` and the two booleans.

---

## 9. Phase 7 — Verification and parity

1. Run the full gate set: root `bun run check`, `session-graph` `test`, `gui-plugins` `test`,
   app `test:unit`, app graph e2e (`widget-behavior.spec.ts` and `session-graph.spec.ts`).
2. Run `bun run graph:capture --mode=verify` and require **31/31** frames (today 29/31).
3. Compare every fresh frame against the pre-upgrade set:
   `git archive backup/plugin-r17-pre-sync docs/spacegraph/screenshots` to a temp dir, then compare
   the 31 frames in order (`02`, `03`, `04`, `06`, `11`–`38`, `43`).
4. Exceed parity: the 2 workspace frames and the 7 parity tests now pass, and the 19 pre-existing model
   test failures are triaged (fix a real bug or record why the fixture differs).
5. Record the results in this plan's revision log and in `SPACEGRAPH.md` §6/§9.

**Gate:** every gate green; the capture set complete; no frame regressed against the pre-upgrade set.

---

## 9.1 Phase 8 — Restore the hybrid composition (§5.1)

`SPACEGRAPH.md` §5.1 promises a hybrid where the log is the map's home, with `stacked`/`side`/`floating`
arrangements, a log text-size control, and a bridge that reveals a picked node in the log. Today the plugin's
`HybridSurface` is a fixed 50/50 split with no arrangements, no text-size slider and no bridge, and the app's
`session-graph-panel.tsx` that implements them has **0 importers**.

1. Choose one owner: the plugin's `HybridSurface` (surfaces are plugin-owned) and record it in the doc.
2. Keep the transcript mounted in one stable container and compose it with CSS order, never by re-parenting.
3. Add the three arrangements, the log text-size control and the bridge (`onOpenTranscript` from a picked node,
   using the Phase 5 reveal seam).
4. Delete `packages/app/src/session/graph/session-graph-panel.tsx` and `graph-panel.css`.
5. Add an e2e test: each arrangement renders the log and the map; a picked node reveals its message.

**Gate:** the hybrid e2e passes for `stacked`, `side` and `floating`; the log keeps its scroll position.

---

## 9.2 Phase 9 — Restore the side panel (§5.4)

§5.4 promises a compact SVG overview in the side panel. Today the plugin contributes a full map `Panel`, and
the `gui-extensions/session-map` package no longer exists.

1. Add a compact overview to the plugin's panel: `nodesAtLevel("overview")` + `layoutGraph` + the static SVG
   renderer, highlighting the active turn and revealing a message on pick.
2. Register it as its own `PanelTab` so the panel keeps the full map beside it.
3. Update §5.4 to name the plugin's panel, not `gui-extensions/session-map`.

**Gate:** the side strip `+` menu opens the compact overview; picking a node reveals its message.

---

## 9.3 Phase 10 — Reconcile `SPACEGRAPH.md`

The design doc is the project's argument; it must match the code.

1. Rewrite §5.1 (hybrid owner), §5.4 (side panel owner) and §7.1 (`graph:verify` steps).
2. Rewrite §6.3/§9.4/§11.4: the delivery is a **fork** synced to upstream `dev`, not a plugin-only bundle;
   the `SessionSurface` seam is the only generic host change.
3. Keep §3.2/§4.0/§4.1–4.5 unchanged; the audit found them correct.
4. Add the r22/r23 result (capture 29/31 → 31/31 after Phase 4) to §7.1 and remove the superseded claims.

**Gate:** every command and package named in `SPACEGRAPH.md` exists and passes, or the doc says it is deferred.

---

## 10. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Deleting the external packages removes the installed-bundle gate | The capture and e2e gates exercise the built-in plugin in a real browser; record the decision |
| Moving the toggle to a plugin `Slot` loses the keybind/tooltip | Keep the app toggle if the slot cannot carry them; that is one small host seam, not duplication |
| `useData()` in the plugin couples it to the app context | It is a public `@opencode/session-ui` context the plugin already consumes; keep the optional fallback |
| The model copy drifts again | `check:graph` in the root `check` task fails CI on drift |
| A layout change is lost on reload | The plugin `Store.session` is host-persisted; test the reload path |
| Turn-diff symbols need a new host API | Try the plugin's `useData().turnDiff` first; add a host seam only if the context cannot serve it |
| Upstream moves the seam again | Keep the seam patch rebaseable and record it in `docs/spacegraph/upstream-session-surface.patch` |

---

## 11. Definition of done

1. One editable model (`session-ui/src/graph`), one generated copy, and a green `check:graph` gate.
2. No rejected delivery in the tree: `spacegraph-gui-plugin/` and `packages/plugins/spacegraph/` are gone.
3. App graph source is only the seam, `graph-permalink.ts`, `snapshot-cache.ts` and the two booleans.
4. Root `check`, `session-graph` unit **136/136**, `test:components` **77/77**, `gui-plugins`, app
   unit and app graph e2e are green.
5. Capture is **31/31**, and every frame matches or improves on its pre-upgrade counterpart.
6. `graph-parity.test.ts` is green; the 19 pre-existing model failures are fixed or documented.
7. `bun run graph:verify` runs every step and passes end to end.
8. `SPACEGRAPH.md` matches the code: the hybrid (§5.1), the side panel (§5.4), the delivery (§6.3/§9.4/§11.4)
   and the gate commands (§7.1) are correct.
9. This plan records the result. No PR and no pushes without sign-off.

---

## 12. Fresh-session handoff

The plan is complete. Use this section as the sign-off runbook, not as a to-do list.

1. Gates to re-run before sign-off: root `bun run check`, `bun run graph:verify`,
   `bun run graph:capture --mode=verify`, `packages/session-graph` `test:components`.
2. The fork base is upstream `dev` plus the `SessionSurface` seam, the model in
   `packages/session-ui/src/graph`, the generated copy in `gui-plugins/src/spacegraph/internal/graph`
   and the built-in plugin in `gui-plugins/src/spacegraph`.
3. Safety refs `backup/plugin-r21-pre-restore` and `backup/plugin-r17-pre-sync` are no longer needed
   for the consolidation, but keep them until the fork branch is pushed.
4. Do not push or open a PR without explicit sign-off.

### Remaining work (not on the critical path)

None of these blocks sign-off on the consolidation itself. Do them only after explicit sign-off.

- **Sign-off only (blocked on the owner):** push fork branch `pr1-plugin-surface-apis` and submit the
  upstream `SessionSurface` PR. This plan never authorises either action; §12.4 and §11.9 still hold.
- **Resolved in r5/r6 (details below):** every failure is fixed at root cause, not by relaxing
  assertions. `session-ui` graph 377/377, `session-graph` 136/0, `gui-plugins` 1164/0, `client`
  262/0, `server` 136/0, app unit 2798/0, app browser 359/0, `core` 7576/0, app graph e2e 44/44.
  The earlier 2287/53, 136/32, 358/19, 1152/1 and 12/32 figures were stale, non-canonical or
  environment-dependent and are discarded.
- **Environment notes (not committed):** a stale Vite dep cache originally resolved
  `@tanstack/virtual-core` 3.13.2; `session-graph` now uses the catalog 3.13.37, matching the app and
  the patched virtual-core. In r3 a stale `packages/app/node_modules/.vite` cache produced `504
  Outdated Optimize Dep` and left frames `02`/`03` at `data-graph-ready="false"`; `rm -rf
  packages/app/node_modules/.vite` and re-running made all 31 capture frames pass (the two frames are
  cold-start flaky until Vite finishes pre-bundling). The Vite 8 / rolldown `[PARSE_ERROR]` on
  `ui/src/components/file-icon.tsx` during dependency scan is benign — dependency pre-bundling is
  skipped and the app still loads. The `spacegraphjs` matrix step needs a Playwright headless-shell
  binary; one is linked locally outside the repo. In r6 two more environment leaks were contained in
  test harnesses: `SHELL=/usr/bin/fish` made `core`'s shell tests fail (filtered in `core/script/test.ts`),
  and the developer's `auth.json` was imported into `server` test databases and triggered a real
  Copilot network call (server tests now run under an isolated home in `server/script/test.ts`).
  Neither was a production defect.

### Repairs (r5)

All 19 r4 failures were fixed at root cause. `packages/session-ui/src/graph` is the single editable
source; `bun script/sync-graph.ts` regenerated the plugin copy and `check:graph` is clean.

| Fix | Root cause | Failures resolved |
|-----|-----------|-------------------|
| `facetsFromQuery()` returns the full `GraphFacets` shape | Parser dropped the six P2.1 semantic fields set by `DEFAULT_FACETS` | 2 facet round-trips |
| `layoutGraph()` defaults to `lanes`, not `force` | `layout.ts` fell back to force for an omitted strategy, breaking append-only, provenance anchoring, turn bands, overview sizing and scale stability; force is also intentionally O(n²) | 10 layout + build cost (11) |
| Regenerate `hierarchy`/`tree`/`force` golden entries | Those three predated the SpaceGraphJS library migration; the other six keys already matched | layout golden |
| Restore `recordUsage()` in `session-builder.ts` | Commit `17dd1f0947` dropped the usage projection while the cost lens stayed wired into production | 2 cost lens + narrative usage (3) |
| Restore `lastWriteAt`/`lastVerifiedAt` in `unverifiedFiles()` | Same commit replaced passing-verify-run logic with read-edges-only | narrative trust lens |
| Compaction baseline 47/926 → 43/803 | Canonical fixture lost the `prt_tool_todo_1` todowrite step; all other fixture goldens are consistent with 43 nodes | compaction measurement |

No assertion was relaxed to hide a defect. The committed screenshot set was regenerated with
`bun run graph:capture --mode=demo`; frames `02` and `32` were visually verified to render the graph,
toolbar, lanes, edges and workspace view.

### Repairs (r6)

All remaining suite failures were fixed at root cause; none was skipped or weakened.

| Area | Fix | Result |
|------|-----|--------|
| `client` 261/1 | Registered `server.graph` in `protocol/client.ts` `groupNames`; regenerated the SDK and updated the two callers from `["server.graph"]` to `.graph` | 262/0; `check:generated` clean after commit |
| `gui-plugins` 1152/1 + 1 error | Preloaded the Solid JSX shim and browser `solid-js/web` build; corrected the capability fake in the model test; asserted the terminal test's intentional `console.error` instead of letting it escape | 1164/0 |
| `server` 131/5 | Isolated test databases under a temporary HOME/XDG tree so the developer's Copilot credential is never imported | 136/0 |
| `core` timeout | Filtered the developer's `SHELL` from the test environment; fish is a denied shell and broke the POSIX shell tests | 7576/0 in ~190 s |
| app graph e2e 12/32 → 44/44 | Repaired plugin-owned surface wiring (hybrid, turn map, renderer dialogs, lineage, layout choices, log text tokens, note reveal, collapse callbacks), restored the metrics readout and persisted surface choice, loaded the graph module lazily behind an error boundary so the transcript keeps working when it fails, made the card budget react to camera rest, and stabilized two geometry tests by waiting for the camera fit to settle | 44/44 |

Source fixes span `packages/protocol`, `packages/client`, `packages/core/script`, `packages/server/script`,
`packages/gui-plugins`, `packages/session-graph` and `packages/app`. The generated graph copy was
regenerated with `bun script/sync-graph.ts`; `check:graph` and root `check` are clean.

---

## Revision log

- **r0 (2026-11-18):** Plan written only. Records the r22/r23 measurements, names one owner per fact,
  and orders the consolidation: delete the rejected deliveries, regenerate and gate the model copy, collapse
  to one state owner, feed the snapshot to the plugin for the two missing frames, restore the transcript
  reveal seam, retire the flag stub and dead app code, then verify against the pre-upgrade screenshots.
  No execution.

- **r1 (2026-11-18):** Verified the plan against the tree and `SPACEGRAPH.md`. Found and fixed two
  verification-harness defects that made the component gate unrunnable: `packages/stories/vite.config.ts` omitted
  `session-graph` from its story roots and dependency scan, and `findStory` did not accept a component id. Result:
  `test:components` **0/77 → 74/77**; the 3 remaining failures are the inspector resize, the narrow bottom-sheet
  height and the hostile-markup card. Added the doc-to-code audit (§1.1) and three missing phases: repair the
  verification harness (Phase 0), restore the hybrid composition (Phase 8), restore the side panel (Phase 9) and
  reconcile `SPACEGRAPH.md` (Phase 10). Confirmed §3.2/§4.0 module maps are correct, §5.1/§5.4 name orphaned
  app modules, §6.3/§9.4/§11.4 still describe plugin-only delivery, and §7.1's `graph:verify` cannot pass.
  No consolidation executed.

- **r2 (2026-11-18):** Executed the plan through Phase 10. Fixed the harness defect (missing
  `session-graph` Tailwind source) and the hostile-markup card assertion; deleted both rejected
  plugin trees and their dead tests; regenerated and gated the graph copy and adapted `model.ts` to
  the canonical `buildGraph` API; collapsed app graph state to the two surface booleans; fixed the
  persistent graph memo so the workspace snapshot reaches frames `32`/`33`; provided the host
  transcript seam; replaced the flag stub with persisted prefs; added the hybrid text-size control
  and the side overview tab; reconciled `SPACEGRAPH.md`; removed stale app-matrix wiring from the
  capture script. Results: root `check` 57/57, `graph:verify` all steps, capture verify 31/31,
  component 77/77, parity 8/8. Pre-existing test debt recorded in §12. No push or PR.

- **r3 (2026-11-18):** Independent re-verification of clean `HEAD`; no tracked source changed. First
  `graph:verify` run failed only in the capture e2e step: stale `packages/app/node_modules/.vite`
  produced `504 Outdated Optimize Dep` and left frames `02`/`03` at `data-graph-ready="false"`.
  Clearing that cache (regenerable, not committed) and re-running made every gate pass: root `check`
  57/57, `graph:verify` all 16 steps (`test:components` 77/77, capture verify 31/31 + 2/2 + matrix),
  `session-graph` unit 136 pass / 0 fail. Closed the two stale Phase 0 "Remaining" markers, corrected
  the stale `session-graph` 136/32 debt figure to 136/0, recorded the Vite-cache finding in §12, and
  sharpened §12's remaining-work list (sign-off is blocked on the owner; debt is separate work).
  No push or PR.

- **r4 (2026-11-19):** Triaged the pre-existing test debt; no code changed. Confirmed
  `session-ui/src/graph` was untouched by r2, so its 19 failures predate the consolidation: 2 real
  facet round-trip bugs, 1 build-cost regression candidate (2524 ms vs 250 ms) and 16 fixture/layout
  expectation drift cases. Corrected stale figures: app unit/browser are 2798/0 and 359/0 (not
  2287/53); `session-graph` 136/0 (not 136/32). Triage table added to §12. No push or PR.

- **r5 (2026-11-19):** Fixed every failure triaged in r4. Root causes: `facetsFromQuery()` dropped the
  P2.1 semantic fields; `layoutGraph()` defaulted to the O(n²) force strategy instead of lanes, which
  broke ten layout assertions and the build-cost guard; `recordUsage()` and the rich `unverifiedFiles()`
  rule were dropped by commit `17dd1f0947` while the cost lens stayed wired into production; three
  golden entries predated the SpaceGraphJS migration; the compaction baseline still locked the
  removed todowrite fixture step. All fixes are in `packages/session-ui/src/graph`, regenerated into
  the plugin copy (`check:graph` clean). `session-ui` graph model is 377/377 and runtime fell from
  ~4 s to 0.5 s. Full gates re-run green: root `check` 57/57, `graph:verify` all steps, capture verify
  31/31 + 2/2 + matrix, component 77/77, parity 8/8. Regenerated the committed screenshot set and
  visually verified frames `02` and `32`. No push or PR.

- **r6 (2026-11-19):** Fixed every remaining suite failure. Registered `server.graph` in the SDK codegen
  map and regenerated the client (262/0); repaired the gui-plugins test environment and capability fake
  (1164/0); isolated server tests from the developer's credentials (136/0); filtered `SHELL` from core's
  test environment (7576/0); and repaired the app graph e2e from 12/32 to 44/44, including lazy loading
  the graph module so the transcript keeps working when it fails, camera-following card budget, plugin
  surface wiring, the metrics readout and two geometry-test stabilizations. Final verification: root
  `check` 57/57, `graph:verify` all steps, capture verify 31/31 + 2/2 + matrix, component 77/77, app
  graph e2e 44/44, `session-graph` 136/0, `gui-plugins` 1164/0, `client` 262/0, `server` 136/0, app
  unit 2798/0, app browser 359/0, `core` 7576/0. Screenshots regenerated from the final code. No push
  or PR.
