# SPACEGRAPH.TODO.44.md — Consolidation and parity plan

**Status:** Plan written only; no execution. Supersedes the delivery model of `SPACEGRAPH.TODO.43.md`
and keeps its verified restore (`r22`–`r23`).
**Extends:** `SPACEGRAPH.TODO.43.md` (r22 restore, r23 wiring). Reference: `SPACEGRAPH.TODO.41.md`
(the capability manifest) and `SPACEGRAPH.md` §6/§9/§11.
**Goal:** one copy of every artefact, full functional parity with the pre-today fork, and two visual
frames that pre-today never captured. The fork stays a fork, synced to upstream `dev`.
**Principle:** *one owner per fact, one generated copy per artefact, and a gate that fails on drift.*
Delete what duplicates. Never keep two editable copies.
**Standing scope:** fork, not plugin-only. The SpaceGraph source stays in the fork. No upstream PR and no
repo pushes without explicit sign-off.

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
pass / 19 pre-existing fail**, app graph e2e **2/2**, capture **29/31**.

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
4. Root `check`, `session-graph`, `gui-plugins`, app unit and app graph e2e are green.
5. Capture is **31/31**, and every frame matches or improves on its pre-upgrade counterpart.
6. `graph-parity.test.ts` is green; the 19 pre-existing model failures are fixed or documented.
7. This plan and `SPACEGRAPH.md` record the result. No PR and no pushes without sign-off.

---

## 12. Fresh-session handoff checklist

1. Read `SPACEGRAPH.TODO.43.md` r22/r23 and this file.
2. The fork base is upstream `dev` plus the `SessionSurface` seam, the model in `session-ui/src/graph`,
   and the built-in plugin in `gui-plugins/src/spacegraph`.
3. `bun run check` is 58/58; capture is 29/31 with `32`/`33` failing on the plugin's missing snapshot.
4. Start at Phase 1 (delete the rejected deliveries), then Phase 2 (regenerate the copy and gate it).
5. Phases 3–6 are independent after Phase 2; Phase 7 runs last.
6. Safety ref: `backup/plugin-r21-pre-restore` and `backup/plugin-r17-pre-sync` stay until the work lands.

---

## Revision log

- **r0 (2026-11-18):** Plan written only. Records the r22/r23 measurements, names one owner per fact,
  and orders the consolidation: delete the rejected deliveries, regenerate and gate the model copy, collapse
  to one state owner, feed the snapshot to the plugin for the two missing frames, restore the transcript
  reveal seam, retire the flag stub and dead app code, then verify against the pre-upgrade screenshots.
  No execution.
