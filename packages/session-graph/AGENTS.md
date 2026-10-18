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
- Detail content is always readable in a conventional DOM panel with selectable text, never only on
  the canvas.
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

## Checks

- Typecheck: `bun run typecheck` from this directory.
- Unit tests: `bun test src` (never from the repository root).
- Component tests: `bun run test:components` (Storybook-backed Playwright).
