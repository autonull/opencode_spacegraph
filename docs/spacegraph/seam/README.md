# SessionSurface seam (reference only)

`0001-session-surfaces.patch` and its scripts document how the fork added `ctx.surfaces` to the host. They are not
part of the external plugin's release path and are not applied by Bun: the shipped plugin works on stock hosts through
the side Panel and dialogs. Keep this archive for reference when comparing against upstream, never as a build step.

```sh
docs/spacegraph/seam/apply.sh   # apply to a stock upstream checkout
docs/spacegraph/seam/revert.sh  # remove it again
```
