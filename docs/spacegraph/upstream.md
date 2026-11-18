# Upstream Readiness

## Five-Rung Contribution Ladder

| Rung | Scope | Diff | Risk | Review Question |
|------|-------|------|------|-----------------|
| 1 | `session-ui/graph` (pure model + tests) | +3,487 lines | None — no UI, no deps | Is the model correct and reusable? |
| 2 | `session-graph` package (canvas, UI, contract only) | +5,660 lines | Low — feature-flagged, lazy | Does the host UI work and stay isolated? |
| 3 | App wiring (flag, settings, mode, toggle, commands) | +689/−36 in `app/src` | Low — off by default | Is the integration clean and reversible? |
| 4 | Hybrid affordance (turn-map, side panel) | +274 in app integration | Medium — new SDK surface | Does the hybrid add value without disruption? |
| 5 (optional) | Protocol/server workspace snapshot | ~900 lines | Medium — new HTTP endpoint | Is the workspace lens worth the protocol cost? |

**Rung-selection rule:** A maintainer may take rungs 1–4 and never take rung 5; the graph still works as a session-only graph. Rung 5 adds the workspace lens (files and symbols from the workspace that aren't in the session) via a new HTTP endpoint. The `snapshot-cache` degrades gracefully when the endpoint is unavailable, so rung 5 is truly optional.

**Blocker:** Library packages must be published to npm (or bundled) before upstream can adopt. The fork now includes `.gitmodules` for the `spacegraphjs` submodule (pointing to `https://github.com/autonull/spacegraphjs7.git`). A fresh clone can run `git submodule update --init` to materialize the submodule.

## Upstream Contribution Areas

| Area | Scope |
|------|-------|
| `packages/app/src/session/graph` | Graph pane, settings, state, view — no graph semantics outside `session/graph/*.tsx`. |
| `packages/app/src/session/header/session-graph-toggle.tsx` | Toolbar toggle. |
| `packages/app/src/shell/screen.tsx` | Mode branch. |
| `packages/app` dev-only demo | `bun run graph:dev`; excluded from upstream diff. |
| `packages/session-ui/src/graph/` | Pure model package: model, layout, selectors, vocabulary, session-builder, workspace test. |
| `packages/session-graph/` | Host package: canvas, toolbar, inspector, breadcrumbs, search, minimap, a11y; imports renderer contract only. |

Per-file justification in `docs/spacegraph/upstream-review.md` §5.

## Review Packet

- `docs/spacegraph/upstream-review.md` — problem, hypothesis, measured results, contribution areas, flag/rollback, bundle, a11y, security, ownership, review commands, 12 review questions
- `docs/spacegraph/decisions.md` — 20 ADRs (naming, representation, depth, file lens, flag, contract bumps, etc.)
- `docs/spacegraph/security.md` — sanitization contract, CSP expectations, deliberate non-goals
- `docs/spacegraph/demos.md` — three demo surfaces, which to open
- `docs/spacegraph/prototype.md` — release write-up with all measurements