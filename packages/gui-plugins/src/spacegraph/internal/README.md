# Internal spacegraph modules

`graph/` is **generated** from `packages/session-ui/src/graph` (plus the timeline and message modules
the builders import) into a single bundle for the plugin and story builds. Never edit it by hand:
edit the `session-ui` source, then run `bun run sync:graph` from `packages/gui-plugins`.

- `bun run check:graph` fails when the copy drifts. `bun test` runs it before the suite.
- `src/spacegraph/graph-parity.test.ts` proves the copy exports, builds, selects, reviews, and lays
  out the canonical fixture identically to `session-ui`.
- The vendored copy is exempt from the GUI plugin's `no-restricted-imports` rule: it is library code,
  not plugin source.
