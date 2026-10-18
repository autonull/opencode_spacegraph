# SpaceGraph prototype — final write-up

Companion to `SPACEGRAPH.md` (design) and `SPACEGRAPH.TODO.1.md` (plan, with the full pass log in §0).
This is the release artifact for the prototype: what was built, how to run and reproduce it, what was
measured, and what remains open. `R7.1` (library docs) lives in the `spacegraphjs` repo
(`README.md`, `AGENTS.md`, `docs/host-integration.md`); the library change history is the `spacegraphjs`
git log.

## Hypothesis

> When agent activity becomes sufficiently complex, spatial navigation through relationships is more
> effective than linear navigation through messages.

The transcript stays the dependable baseline. The graph is an alternate, opt-in representation built
from existing session data. No protocol, server, or session-schema changes. Success is not "a graph
exists": it is that a user can answer questions the transcript makes expensive — why a file changed,
which calls led to a failure, what a subagent contributed, what changed after a failing test, and
where the agent retried or changed direction.

## Tested revisions

| Repository | Revision | Notes |
|---|---|---|
| OpenCode (`opencode` monorepo) | `dev` @ `484bd64944` + this docs pass | Branch `dev`; no `session-graph` branch, per the Phase 0 restart note |
| SpaceGraphJS (`spacegraphjs`, sibling repo, gitignored here) | code `189d345` (docs `3c87c3c`) | Branch `main`; the library change history is its git log. `189d345` cancels in-flight camera tweens on an explicit zoom/projection |

Linkage is "sibling git repo, pinned SHA, not vendored, not a submodule" (P0.2). `spacegraphjs/` is
gitignored in the OpenCode repo; its commits are recorded here by SHA.

## Architecture

Ports and adapters, with the SpaceGraphJS core kept pure:

```
Session messages + status + turn diffs
              │
              ▼
  @opencode/session-ui/graph      GraphModel + levels + layout + selectors (pure, tested)
              │  RenderModel (renderer-facing, stable IDs, absolute positions)
              ▼
  @spacegraphjs/renderer          contract types + version helper, zero deps
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
 [spacegraph] [cytoscape] [svg]
  2D + 3D      2D        static
     │        │        │
     └────────┴────────┘
              ▼
  @opencode/session-graph         canvas, toolbar, inspector, breadcrumbs, search, minimap, a11y
              │
              ▼
  packages/app                    per-session mode switch, lazy wrapper, toggle, commands
```

- **Model** — `packages/session-ui/src/graph/{model,levels,layout,selectors,fixture}.ts`. Pure and
  synchronous. `buildGraph` reuses the timeline projection's `turnByMessageID` (no second walk) to
  group steered prompts into one turn. It builds session/turn/phase/message/reasoning/tool/subagent/
  file/result/error/retry/diff/compaction/notice nodes and `part-of`/`sequence`/`delegates`/`reads`/
  `writes`/`searches`/`produces`/`references`/`compacts`/`evidence` edges. `inferred-cause` is never
  emitted from adjacency. `levels.ts` owns the semantic policy (§5.4); `layout.ts` assigns lanes,
  ordinals, and depths deterministically (append-only).
- **Contract + leaves** — `spacegraphjs/packages/{renderer,spacegraph-renderer,cytoscape-renderer,svg-renderer}`.
  The core never imports the contract; only the SpaceGraph adapter imports both.
- **Host UI** — `packages/session-graph` imports the contract, never a concrete backend. No
  `renderer === "cytoscape"` branch exists; differences are capability flags.
- **Integration** — `packages/app/src/session/graph/` (lazy wrapper) + `session/header/session-graph-toggle.tsx`
  + a mode branch in `screen.tsx` + a `graph` field on `sessionViewSchema`. This is the whole app diff.

## How to run

Reproduce the screenshots and prove conformance from the repo root:

```bash
bun run graph:capture --mode=compare   # regenerate all committed screenshots
bun run graph:capture --mode=verify    # assert the committed set without overwriting it
bun run graph:verify                   # contract conformance + boundaries + packages + suites + capture verify
```

Focused checks (never run tests from the repo root):

```bash
cd packages/session-ui && bun test src/graph
cd packages/session-graph && bun run typecheck && bun test src && bun run test:components
cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts
cd spacegraphjs && pnpm exec vitest run && bun run test:boundaries
```

The non-OpenCode reference host runs from the library repo: `pnpm run dev:demo` (vite on 5173), then
`SG_DEMO_URL=… node_modules/.bin/playwright test test/e2e/contract-demo.spec.ts --workers=1`.

## Screenshots

Committed in `docs/spacegraph/screenshots/`, deterministic (viewport 1440×900, DPR 1, dark scheme,
en-US, reduced motion, clock-free fixture):

| File | Content |
|---|---|
| `00-spike-spacegraph.png` | P0.5 embed spike (predates chrome opt-in) |
| `01-log.png` | baseline transcript |
| `02-graph-overview.png` | SpaceGraphJS 2D overview, counted phase clusters |
| `03-graph-execution.png` | execution neighborhood with files and error/retry chain |
| `04-graph-selected.png` | selected node with inspector detail |
| `05-return-to-log.png` | transcript restored at the same position |
| `06-graph-3d.png` | 3D toggle, selection preserved |
| `07-cytoscape-overview.png` | Cytoscape adapter, same model |
| `08-cytoscape-selected.png` | Cytoscape adapter, selected |
| `09-contract-demo-light.png`, `10-contract-demo-dark.png` | non-OpenCode demo, light/dark (the L1.4 check) |

`02`/`03`/`04` come from the app's routed session (`packages/app/e2e/graph/capture.spec.ts`); `07`/`08`
come from the Storybook story (`packages/session-graph/component-tests/graph-capture.spec.ts`) because
the app has no renderer selector (renderer choice is a prototype setting, per §4.7).

## Renderer comparison (U3.6)

Both adapters consume the same `RenderModel` (same fixture, same `buildRenderModel`). The differences
are declared capabilities, not behavior:

| Aspect | SpaceGraphJS (`@spacegraphjs/spacegraph-renderer`) | Cytoscape (`@spacegraphjs/cytoscape-renderer`) |
|---|---|---|
| Projection | 2D orthographic + 3D perspective | 2D only (`setProjection('3d')` is a declared no-op) |
| Lazy chunk (built app) | core `activity-*.js` 1,039.6 KB min / 282.0 KB gzip (includes `three`) | `cytoscape.esm-*.js` 435.0 KB min / 137.9 KB gzip |
| HTML cards | CSS3D `HtmlNode`/`DOMNode`, cap 40 | clipped DOM overlay, cap 20 |
| Edge labels | CSS2D, constant screen size, decluttered | cytoscape labels |
| Cluster nodes | model nodes | model nodes (compound-free) |
| Minimap | host SVG (renderer-agnostic) | host SVG (renderer-agnostic) |
| Selection, click/drag, fit/focus, viewport | contract events | contract events |

Navigation for the five mission questions is identical in both (toolbar level, breadcrumbs, search,
inspector, edge-follow); the toolbar disables 3D with an explanation under Cytoscape. The default
renderer stays SpaceGraphJS because it is the only one with the 2D+3D story the hypothesis tests;
Cytoscape is the 2D fallback and benchmark and renders the same model with no host branch.

## Performance (V5.7)

| Metric | Budget (§9) | Measured |
|---|---|---|
| Model build, 300-message / 1201-node synthetic stream (`performance.test.ts`) | 200 msgs < 50 ms | ~27 ms (guard ceiling 250 ms) |
| Lazy SpaceGraphJS chunk (gzip, excluding `three`) | < 400 KB | core chunk 282.0 KB gzip incl. `three`; adapter 2.0 KB gzip |
| Lazy Cytoscape chunk (gzip) | < 250 KB | 137.9 KB |
| Session-graph UI chunk | — | 28.3 KB min / 8.8 KB gzip |
| Session entry delta | no measurable regression | **unmeasured** — the graph is lazy, so no graph module is in the entry; the P0.1 baseline was never captured |
| First graph paint / pan frame rate | < 500 ms / 60 fps | **unmeasured** — no graph perf harness; DOM/canvas readiness is asserted instead |

`packages/session-ui/src/graph/performance.test.ts` is the complexity guard: a 300-message, tool-heavy
stream must build and lay out under a generous ceiling, catching an accidental O(n²) join without
flaking under CI load. The two unmeasured rows are recorded, not lowered.

## Accessibility (V5.8)

- Library layer: `spacegraphjs/test/a11y.test.ts` (jsdom) — roving tabindex, Arrow/Home/End skipping
  non-interactive items, Enter/Space, Escape, and the `aria-live` announcement.
- Browser traversal against **both** adapters: `packages/session-graph/component-tests/graph-a11y.spec.ts`
  walks the hidden mirror to a node, activates it with Enter, and asserts the inspector under
  SpaceGraphJS and after switching to Cytoscape.
- The app has no dedicated axe/automated suite; the keyboard path is exercised through the component
  suite and the app e2e. Reduced motion is emulated in the capture spec; the adapter camera animation
  has no dedicated reduced-motion assertion.

## Cross-environment (V5.9)

| Environment | Result |
|---|---|
| Web dev (`bun run test:e2e -- e2e/graph/session-graph.spec.ts`) | 10 pass |
| Built web (`PLAYWRIGHT_BUILD=1`, same spec) | 9 pass, 1 skipped (the dev-only module-load fallback, whose chunk URL is hashed) |
| Storybook component suite (`bun run test:components`) | 15 pass |
| Non-OpenCode demo (`test/e2e/contract-demo.spec.ts`, library repo) | 5 pass |
| Desktop shell | **not run** in this environment |
| SpaceGraphJS demo pages (`test/e2e/hardening.spec.ts`) | **not run** in this environment |

Known caveat: WebGL under headless Chromium uses SwiftShader; the capture waits on the preserved
drawing buffer rather than a frame count, and DOM assertions are preferred where a pixel is not the
contract.

## Hybrid log + graph (Phase 6)

Progressive disclosure over the transcript: a compact subgraph of one turn opens over the log, so the
reader never loses their place. Nothing injects into timeline rows.

- **H6.1 host decision.** `packages/app/src/session/graph/turn-map-overlay.tsx` mounts the library
  `TurnMapOverlay` lazily inside the session panel's relative container (`screen.panel.ref`), so it
  covers the panel in either mode while the transcript underneath stays mounted (scroll preserved for
  free). Opened from the graph toolbar's "Open turn map" control (visible while a turn is selected)
  and the `graph.turnmap` command (`mod+alt+t`). No `session-timeline-row.tsx` edit.
- **H6.2 overlay.** `packages/session-graph/src/ui/TurnMapOverlay.tsx` — a focus-trapped dialog
  (`role="dialog"`, `aria-modal`) showing the turn's execution-level subgraph (turn + highest-signal
  `part-of` children, capped at seven) through `GraphCanvas`, the shared `GraphInspector`, and "Open
  full graph". Escape closes and returns focus. Backed by the pure `turnSubgraph(model, turnID, limit)`
  selector (`inferred-cause` never appears).
- **H6.4 inline subgraph.** `packages/session-graph/src/ui/TurnMapInlineGraph.tsx` is a thin,
  non-interactive wrapper over `@spacegraphjs/svg-renderer`'s `InlineGraph` (five-node turn subset).
  Not injected into the timeline.
- **H6.3 side panel.** `packages/gui-extensions/src/session-map/` — a `Panel` (region `"side"`, with a
  `Store.session` `{ focused }`) that draws a compact SVG overview of the session's turns and phase
  clusters from `@opencode/session-ui/graph` (`layoutGraph` + `nodesAtLevel("overview")`), opened from
  the side strip's `+` menu (a `session.panel` `MenuItem`). It needs the new generic SDK surface
  `SessionScreen.transcript` (`TranscriptScreen.activeMessageID()`/`reveal()`), which the app binds from
  the timeline; the map highlights the transcript's active turn (then the last pick, then the model's
  `activeTurn`) and reveals a message when its node is picked. **H6.5 inline row host — deferred,
  approval-gated** (the only item that exceeds the core diff budget).
- **H6.7 flag.** The hybrid is off by default; the overlay opens only on explicit action.
- **H6.6 tests.** `component-tests/turn-map.spec.ts` (5 cases); app e2e cases for the overlay
  (`e2e/graph/session-graph.spec.ts`) and the side-panel synchronization
  (`e2e/regression/side-panels.spec.ts`).

## Portability (Phase 8)

Library-side work that lets a second host reuse the boundary without OpenCode (see
`spacegraphjs/docs/host-integration.md`):

- **Contract version negotiation** (P8.7) — `negotiateContract` in `@spacegraphjs/renderer`; the host
  registry rejects an unsupported declared version and falls through.
- **Static export** (P8.3) — `serializeRenderModel`/`parseRenderModel` in `@spacegraphjs/svg-renderer`
  beside `renderToSVG`.
- **Text direction** (P8.9) — `renderToSVG` emits `direction="rtl"`; both adapters set `dir` on cards;
  the host bridge reads `document.documentElement.dir`. Coordinates are never mirrored.
- **Second-host fixture** (P8.6) — `spacegraphjs/demo/activity-host.ts`, exercised by the shared
  conformance suite and the demo.
- **Host integration guide** (P8.5) — `spacegraphjs/docs/host-integration.md`.
- **Reference demo** (L1.29) — `spacegraphjs/demo/contract.html` + `demo/contract-demo.ts`: one
  synthetic activity stream through all three leaves, using `LaneLayout` and the `GraphController`
  (selection, trail, zoom bands, search), with no OpenCode import and no session vocabulary.
- **Framework-agnostic view controller** (P8.1) — `spacegraphjs/control` (`GraphController`): selection,
  focus, navigation trail, zoom bands, search, and connections over a minimal structural model, bound to
  any renderer through a minimal structural surface. The library demo is driven by it, and OpenCode's
  `GraphView` routes selection and breadcrumbs through it (it stays unbound from the renderer, because
  `GraphCanvas` remains the single renderer-event mediator).
- **Framework bindings** (P8.2) — `react-spacegraph` and `solid-spacegraph` wrap `GraphBinding` (the
  framework-agnostic mount/update/dispose policy in `spacegraphjs/control`) over the contract, not core
  internals.
- **Deferred by design:** P8.4 (host-neutral activity adapter) and P8.8 (incremental `RenderModelPatch`).

## Library capability audit (R7.6)

Each generic module added for this work, with its consumers and any gap. No session-specific naming or
data assumptions appear in the library.

| Capability | Module | Consumers | Gap |
|---|---|---|---|
| Renderer contract | `@spacegraphjs/renderer` | both adapters, OpenCode registry, conformance suite | none |
| SpaceGraph adapter | `@spacegraphjs/spacegraph-renderer` | OpenCode, library demo | node remodelling recreates a node on type change (by design) |
| Cytoscape adapter | `@spacegraphjs/cytoscape-renderer` | OpenCode fallback, library demo | 3D is a declared no-op; minimap is host-side |
| Static SVG renderer | `@spacegraphjs/svg-renderer` | OpenCode inline subgraph, library demo | `InlineGraph` is not exercised in a browser beyond the demo |
| Zoom bands | `spacegraphjs/zoom` | library demo; host policy in `levels.ts` | band→level wiring is host-owned |
| Lane layout | `spacegraphjs/layout` | library demo; host layout in `layout.ts` | `TimelineLayout`/`HierarchicalLayout` are not refactored onto it |
| Accessibility layer | `spacegraphjs/a11y` | OpenCode a11y mirror, library demo | node list only; edges are not announced |
| Navigation trail | `spacegraphjs/navigation` | `GraphController`, OpenCode `GraphView`, library demo | — |
| View controller | `spacegraphjs/control` | OpenCode `GraphView` (selection), library demo | OpenCode search stays host-owned (uses the richer tool-input selector) |
| DOM mount | `spacegraphjs` `DOMNode` | SpaceGraph adapter | — |
| Minimap | host SVG (`GraphMinimap.tsx`) | OpenCode | vertical mirror under Cytoscape (documented) |

## Known limitations

Carry these forward explicitly; none is silently lowered.

1. **Orthographic wheel zoom scales the frustum about the target**, not the pointer (L1.12).
2. **The mesh focus/selection outline is an axis-aligned `BoxHelper`**, not a silhouette (L1.11/RF.6);
   DOM cards are outlined on the element with the resolved theme colours instead.
3. **Edge labels avoid labels and DOM cards, but not all geometry**; `declutterLabels` measures label
   and card rects only (L1.17).
4. **`SpaceGraph.instances`/`options.global` remain** as an off-by-default developer handle for the
   vision/inspection helpers; graph semantics no longer consult it (L1.30 literal step deferred).
5. **The `./activity` `types` condition is a hand-authored stopgap** (`spacegraphjs/types/activity.d.ts`);
   replace with generated declarations once the library source is clean (L1.1).
6. **The graph toolbar renders in the app with an `endInset`** to clear the floating header toggles; the
   reserve is desktop-media-query-gated.
7. **Mobile graph mode is desktop-gated for v1** (I4.10 decision). The header toggle is desktop-only; on
   mobile the graph is reachable only through the `graph.toggle` command.
8. **The minimap orientation is vertically mirrored under Cytoscape** (the Cytoscape canvas draws
   model +y downward); it is correct under the default renderer.
9. **Two adapter-failure app e2e cases are dev-only** (the built chunks are hashed); the component
   suite keeps seam-based coverage. The same applies to the lazy-wrapper load-failure case.
10. **First graph paint and pan frame rate have no harness**, and the session-entry delta is unmeasured.
11. **The renderer selector is not in the app toolbar**; renderer choice is a prototype setting, and
    the Cytoscape captures come from the Storybook story.
12. **The session layout strategies compute their own cursors in `session-ui`**; folding them onto the
    generic `spacegraphjs/layout/LaneLayout` needs that primitive to support variable item sizes and
    per-lane cursors first (RF.2 library-first cleanup).
13. **Vector swimlane bands stay full-opacity under execution focus dimming** (they are structure, not
    content, and are `interactive: false`).

## Evaluation protocol (R7.3)

**Status: protocol defined; not executed** (requires human participants, which this environment cannot
provide). Execute before deciding to continue the graph track.

Protocol:

1. Recruit a small set (n ≥ 5) of OpenCode users familiar with the transcript but not the graph.
2. Use the canonical fixture session (§7) for every participant; give no leading explanation of the
   graph beyond "this is an alternate view of the same session".
3. For each participant, counterbalance order: run the five investigative tasks once with the
   transcript and once with the graph. Record task success, time to completion, wrong turns, and which
   node/edge or message they used.
4. Tasks: (a) why did the agent change `src/auth/session.ts`? (b) which tool calls led to the failing
   test? (c) what did the subagent contribute? (d) which changes were made after the failing test?
   (e) where did the agent retry or change direction?
5. Collect a subjective preference and free-text quotes; record the decision on continuing.

Results: _pending_. Record task success, completion times, wrong turns, and quotes here, then update
the go/no-go decision at the end of this section.

## Dependency migration plan (R7.5)

The prototype consumes `spacegraphjs` and its renderer packages from source via Bun workspaces. The
step after the prototype:

1. Build `dist` (ESM + `.d.ts`) for `spacegraphjs`, `@spacegraphjs/renderer`,
   `@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`, and
   `@spacegraphjs/svg-renderer`; point each `package.json` `main`/`module`/`types`/`exports` at
   `dist` and add a `build` script (deferred while source-consumed, R7.5/L1.34).
2. Remove `spacegraphjs` and the four packages from the OpenCode root `workspaces.packages`; replace
   the `workspace:*` dependencies of `packages/session-graph` with versioned ranges (`^7`, and a
   matching `CONTRACT_VERSION`).
3. Drop the `./activity` `types` stopgap once the library source typechecks clean; regenerate the
   declarations from `dist`.
4. Re-run `bun run graph:verify` (contract conformance + boundaries + packages + suites + capture
   verify) and the built e2e before declaring the migration done.
5. Keep `CONTRACT_VERSION` and the version-negotiation path (P8.7) so a host and adapter can be
   upgraded independently.

## Verification summary

One command produces every image and one command proves both adapters still honor the contract:

- `bun run graph:capture --mode=baseline|demo|compare|verify` writes to `docs/spacegraph/screenshots/`
  (`verify` renders into a temp dir and asserts the committed set).
- `bun run graph:verify` runs the headless contract suite against both adapters, the package boundary
  test, the four leaf/contract packages, the session-graph unit and component suites, and the capture
  verify pass.

See the plan's §0 progress log for the per-pass measurements and the §8 verification matrix for the
per-check commands.
