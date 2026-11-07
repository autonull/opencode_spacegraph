# The Gate (`graph:verify`)

The canonical verification gate is `bun run graph:verify`. It runs:

1. **Library build** — `spacegraphjs` builds all packages (types + dist)
2. **Contract conformance** — shared renderer contract suite against both adapters (Vitest)
3. **Package boundaries** — no core → contract/Cytoscape imports (Vitest)
4. **View controller + framework bindings** — React/Solid bindings (Vitest)
5. **Overlay core** — scope, focus, diff (Vitest)
6. **Navigation core** — search, minimap (Vitest)
7. **Second host** — framework-free host outside OpenCode (Vitest)
8. **Contract package** — `@spacegraphjs/renderer` unit tests (bun)
9. **Model adapter** — `@spacegraphjs/adapter` tests (Vitest)
10. **Adapter performance budget** — `@spacegraphjs/adapter` performance tests (Vitest)
11. **SpaceGraph adapter** — `@spacegraphjs/spacegraph-renderer` tests (bun)
12. **SVG renderer** — `@spacegraphjs/svg-renderer` tests (bun)
13. **session-graph unit tests** — `packages/session-graph` `bun test src`
14. **session-ui graph unit tests** — `packages/session-ui` `bun test src/graph` (263 tests)
15. **session-graph component contract** — `bun run test:components` (Storybook-backed Playwright)
16. **App e2e graph** — `packages/app` `playwright test e2e/graph/session-graph.spec.ts e2e/graph/reactivity.spec.ts`
17. **App e2e side panels** — `packages/app` `playwright test e2e/regression/side-panels.spec.ts` (retired with note)
18. **Graph capture (verify, advisory)** — `bun run graph:capture --mode=verify` (pixel-diff, 0.1% threshold)
19. **Published packages** — clean consumer check (`test:publish`)
20. **Bundle size measurement** — reports gzip sizes of app dist and spacegraph-renderer dist
21. **Documentation truth check** — `bun run script/docs-graph.ts --check`

**CI pin:** The GitHub Actions workflow (`.github/workflows/graph.yml`) reads the SpaceGraphJS gitlink (`git ls-tree HEAD spacegraphjs`) at runtime. This ensures reproducible builds without hardcoded SHAs.