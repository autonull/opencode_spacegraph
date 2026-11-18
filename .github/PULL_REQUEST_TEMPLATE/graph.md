### Issue for this PR

Closes #

### Rung

_Which rung of the contribution ladder does this PR take? See `docs/spacegraph/upstream-pr.md`._

- [ ] Rung 1 — graph model (`packages/session-ui/src/graph/`)
- [ ] Rung 2 — host package (`packages/session-graph/`)
- [ ] Rung 3 — app wiring (feature-flagged)
- [ ] Rung 4 — hybrid affordance (panel / turn map)
- [ ] Library (`spacegraphjs`)
- [ ] Not graph-related

### Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / code improvement
- [ ] Documentation

### What does this PR do?

Please provide a description of the issue, the changes you made to fix it, and why they work.

**If you paste a large clearly AI generated description here your PR may be IGNORED or CLOSED!**

### Feature flag

- [ ] The change is behind `experimental.sessionGraph` (default `off`)
- [ ] Not flag-gated — explain why below
- [ ] Flag state after this PR: `on` / `off` / `unchanged`

### How did you verify your code works?

<!-- The graph gate, from the repository root: -->
```bash
bun run graph:verify
```

<!-- Focused checks, from the package directory: -->
```bash
cd packages/session-ui && bun test src/graph
cd packages/session-graph && bun run typecheck && bun test src && bun run test:components
cd packages/app && bun run typecheck && bun run test:e2e -- e2e/graph/session-graph.spec.ts
cd spacegraphjs && node_modules/.bin/vitest run
```

### Screenshots / recordings

_If this is a UI change, please include a screenshot or recording. Regenerate with
`bun run graph:capture --mode=compare` and inspect every changed image._

### Unverified behaviour

_List what this PR does not prove: unmeasured paths, skipped cases, known gaps. A reviewer should
not have to find them._

### Checklist

- [ ] I have tested my changes locally
- [ ] I have not included unrelated changes in this PR
- [ ] No graph semantics leaked outside `packages/app/src/session/graph/`
- [ ] Hostile markup in a label, summary or tool command stays inert
      (`cd packages/session-graph && bun run test:components -- security`)
