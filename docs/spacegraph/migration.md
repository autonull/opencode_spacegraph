# Migration and deprecated aliases

The SpaceGraph extraction moved public names between packages and modules. This page records every
move, the alias that keeps the old name working, and the point where the alias is removed.

The repository policy is: a moved public SDK or plugin name keeps a deprecated alias until the next
minor. The library contracts in `spacegraphjs` do not follow this policy; they use hard breaks, as
[`SPACEGRAPH.md` §5](../../SPACEGRAPH.md#library-contract-versions-and-breaking-changes) records.

## `@opencode/session-graph`

| Old name | New home | Alias |
|---|---|---|
| `GraphViewProps` | `SessionGraphProps` from `./ui/SessionGraph` | `export type GraphViewProps = SessionGraphProps`, marked `@deprecated` |
| `GraphDetailProps` | `GraphDetailSurfaceProps` from `@spacegraphjs/overlays` | `export type { GraphDetailProps }` re-export, marked `@deprecated` |
| `GraphInspectorSheet` / `GraphInspectorSheetProps` | `GraphInspectorPanel` with `sheet={true}` | `GraphInspectorSheet` calls the panel; props are marked `@deprecated` |
| `reviewChanges` from `graph/selectors` | `graph/review` | selectors re-export `reviewChanges` and `ReviewChanges`, marked `@deprecated` |
| `GraphTranscriptSurface` root export | subpath `@opencode/session-graph/ui/GraphTranscriptSurface` | Root export removed because it pulls app-only timeline modules; import the subpath |

`GraphView` remains the full-chrome wrapper around `SessionGraph`. New code should compose
`SessionGraph` directly and pass `chrome`, `shell`, and `roots`; `GraphView` keeps the old behavior.

## `@opencode/session-ui/graph`

`reviewChanges` remains exported from the package root and from `review.ts`; the root export is the
supported path. The selectors re-export is the deprecated alias.

## Removal

The aliases above are removed in the next minor. `bun run check` and the graph test suites fail if a
public export disappears without its alias, so the removal is a deliberate edit, not drift.

## SDK proposals

Proposals that are recorded but not shipped live in
[`library-delta.md`](library-delta.md), with their status and the feature that needs them. They do not
enter this migration list until they ship.
