# @opencode/session-graph

Alternate, opt-in spatial view of a session. The transcript stays the dependable baseline; the graph
is built entirely from existing session data with no protocol, server, or storage changes.

## Mission constraints

- The graph answers questions the transcript makes expensive: why a file changed, which calls led to
  a failure, what a subagent contributed, what changed after a failing test, and where the agent
  retried or changed direction. Success is that those questions get cheaper, not that a graph exists.
- Never infer causality from adjacency. Edges carry `confidence: "explicit" | "structural" |
  "inferred"` and the UI labels the difference.
- The graph model is pure and synchronous. No DOM, no WebGL, no effects during model construction.
- Stable IDs produce stable positions and stable selection across streaming updates. Streaming text
  appends nodes; it never rebuilds the graph or re-lays-out existing nodes.
- Detail content is always readable as selectable DOM text, never painted into the canvas. Where it
  appears is the reader's choice — the side panel, the popover beside the node, or the node's own
  card. A card carries a summary for a reader who has zoomed in; the panel and the popover carry the
  full record. A surface that takes layout width must not reframe the map when it opens.
- The transcript keeps working if this package fails to load.

## Boundaries

- Session semantics and layout policy live here and in `@opencode/session-ui/graph`, not in a
  renderer. This package imports the shared renderer contract, never a concrete renderer backend.
- Generic graph capabilities belong in SpaceGraphJS (`spacegraphjs`), not here. If a capability is
  generic, add it to the library first; do not special-case a renderer in this host.
- Do not add `if (renderer === "cytoscape")` branches. Differences belong in the adapter or in
  capability flags surfaced by the toolbar.

## Conventions

- Follow `packages/app/AGENTS.md` for localization and typography; user-visible strings use i18n
  keys, and 13px text uses `--line-height-compact`.
- New DOM surfaces carry `data-component`/`data-slot` and accessible names.

## Reactive-Boundary Rule (ADR-21)

**Any extracted props/builder module must type intermediates as accessors (`() => T`), never as raw values,
unless the value is provably creation-time-constant.**

The `buildCanvasRegionProps` function (and any similar builder) receives accessors from the component
and must pass them through unchanged. Storing the result of calling an accessor (e.g. `renderModel:
input.renderModel()`) breaks the Solid getter chain and causes the canvas to render stale data.

- Correct: `renderModel: input.renderModel` (passes the accessor function)
- Incorrect: `renderModel: input.renderModel()` (calls once at mount, stores plain value)

This rule is enforced by:
1. The `GraphCanvasRegionProps` type requiring `renderModel: () => RenderModel` (not `RenderModel`)
2. A unit test in `src/ui/GraphCanvasRegionProps.test.ts` verifying the accessor is tracked

## Reactive Signal Discipline (ADR-23)

The two worst bugs in this package were self-invalidating SolidJS effects:

- **F10** — `useGroupBadgeAnimation`: an effect wrote `animatedGroups` signal that it read via `setAnimatedGroups`, causing an infinite loop on every model change.
- **F3** — `GraphCanvas`: a `viewportChange` effect wrote host signals that re-entered through `onViewportChange`, creating a camera feedback loop.

**Rule:** An effect never writes a signal it reads. Prefer `createMemo` for derived state. Every timer/subscription registers `onCleanup`. Extract pure reactive logic and unit-test it in isolation.

**Dev-only guard:** A development-mode tracker logs once when an effect writes a signal during its own run. No production cost; uses Solid's internal tracker if available.

**Regression tests:**
- `useGroupBadgeAnimation` runs once per count change (not per effect re-run)
- Depth applies once per projection change (not per viewport report)

These extend existing coverage; do not duplicate tests.

## Checks

- Typecheck: `bun run typecheck` from this directory.
- Unit tests: `bun test src` (never from the repository root).
- Component tests: `bun run test:components` (Storybook-backed Playwright).

## Accessibility Projection Contract (ADR-22)

The screen-reader tree (`GraphA11y`) must always reflect the **drawn** node set — not the full model — so that keyboard and screen-reader users navigate exactly what the canvas shows.

- The `GraphA11y` component receives `model={props.ordered}` from `GraphOverlayManager`, where `ordered` is the `createOrderedModel` output filtered to `contentIDs` (nodes actually rendered).
- This ensures the a11y list updates on every render when the drawn set changes (level toggle, facet filter, group collapse, selection).
- Roving tabindex (`tabindex="0"` on one item, `-1` on others) tracks the selected node; arrow keys move selection; `Enter` opens the inspector; `Escape` clears.
- `aria-activedescendant` mirrors the selected node ID.
- Component test `graph-a11y-toggle.spec.ts` asserts the a11y item count matches the drawn node count after a level toggle.
- Future extraction work must preserve this projection invariant: the a11y model source must be the ordered/drawn model, never the full session model.
