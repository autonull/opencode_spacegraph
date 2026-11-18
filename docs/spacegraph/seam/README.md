# SessionSurface seam (reference only)

`0001-session-surfaces.patch` and its scripts document how the fork added `ctx.surfaces` to the host. They are not
part of the external plugin's release path and are not applied by Bun: the shipped plugin works on stock hosts through
the side Panel and dialogs. Keep this archive for reference when comparing against upstream, never as a build step.

**Use the clean patch instead:** `docs/spacegraph/upstream-session-surface.patch` is the generic, PR-shaped seam built
against clean `upstream/dev` for `SPACEGRAPH.TODO.43.md` Phases 0–1. This archive includes SpaceGraph-specific keys and
flag wiring and is stale relative to current HEAD; do not apply it to upstream.

```sh
docs/spacegraph/seam/apply.sh   # apply to a stock upstream checkout
docs/spacegraph/seam/revert.sh  # remove it again
```
