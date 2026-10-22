# Session graph (experimental)

> **Status: experimental prototype.** This is not a supported product surface. It is a companion
> artifact on `dev` for evaluating one hypothesis; the transcript remains the dependable baseline and
> the graph is an opt-in alternate view built entirely from existing session data.

![Session graph overview](./screenshots/02-graph-overview.png)

## Motivation

Agent sessions are linear transcripts, but agent work is not linear: files are read, edited, tested,
reverted, and retried across a session. When activity becomes complex, questions like "why did this
file change?", "which calls led to this failure?", and "where did the agent retry?" get expensive to
answer by scrolling. This prototype tests whether **spatial navigation through relationships** is more
effective than **linear navigation through messages** for those questions.

The graph adds no data: it is built from `SessionMessageInfo`, status, and turn diffs. No protocol,
server, or session-schema change. The transcript keeps working if the graph fails to load.

## Setup

Prerequisites: Bun, the sibling `spacegraphjs` checkout (gitignored here), and a Playwright Chromium.

```bash
bun install                      # links the spacegraphjs workspace packages
```

The library toolchain (for the `spacegraphjs` repo only) is `cd spacegraphjs && pnpm install
--ignore-scripts --filter spacegraphjs`; do not run a full `pnpm install` there (it pulls the
`n8n-bridge` workspace and the native `canvas` build).

## Reproduce

```bash
# Screenshots (writes docs/spacegraph/screenshots/); --mode=verify asserts without overwriting
bun run graph:capture --mode=compare

# One-command conformance gate: both adapters, package boundaries, all packages, suites, capture verify
bun run graph:verify

# The app, with the graph behind the header toggle (desktop) or the graph.toggle command
bun run dev
```

The non-OpenCode reference host (no OpenCode import) runs from the library repo:

```bash
cd spacegraphjs && pnpm run dev:demo   # then open /contract.html
```

All three surfaces — host demo, library demo, test harness — are indexed in
[demos.md](./demos.md).

## Tested commit

OpenCode `dev` synced with upstream `dev` `ba06ff9e0b` (merge `f802f5e707`); SpaceGraphJS code `f7cf48a`. See
[prototype.md](./prototype.md) for the full tested-revision table, measurements, and the per-pass log.

## Limitations

The authoritative list is in [prototype.md](./prototype.md) §"Known limitations". The headline items:

- 2D is the legible default; 3D is an explicit experiment.
- Mobile graph mode is desktop-gated for v1 (command-only on mobile).
- Renderer choice (SpaceGraphJS vs Cytoscape) is a prototype setting, not a toolbar control.
- The layout (lanes / timeline / hierarchy / tree / force / ribbon / matrix) and the depth treatment
  are switchable options behind one seam; the R7.3 usability protocol decides the winner and is
  **not yet executed**.
- First graph paint and pan frame rate are unmeasured; the session-entry delta is unmeasured.

## Verification

The canonical verification gate is `bun run graph:verify`, which runs:
- Contract conformance (both adapters)
- Package boundaries (no core → contract/Cytoscape imports)
- View controller + framework bindings
- Contract package unit tests
- SpaceGraph adapter tests
- Cytoscape adapter tests
- SVG renderer tests
- session-graph unit tests
- session-graph component contract tests (Storybook-backed Playwright)
- Capture verification

**Environmental note:** `bun run check` fails on this checkout in `@opencode/ai` (`zstdCompressSync` missing from `node:zlib`) because the checkout lives under a home directory, so `tsc`'s type-root walk-up finds a stray `~/node_modules/@types/node@22.10.2` that shadows the repo's `@types/node@24.12.2`. This is an environmental issue (checkout location), not a fork or merge regression — `bun run check` passes on bare upstream in a clean worktree. The accepted gate for this fork is `graph:verify` + per-package typechecks.

To regenerate and inspect screenshots:
```bash
bun run graph:capture --mode=compare
```

To verify committed captures without overwriting:
```bash
bun run graph:capture --mode=verify
```

## Documents

- [demos.md](./demos.md) — the three surfaces (host demo, library contract demo, test harness) and
  which one to open.
- [upstream-pr.md](./upstream-pr.md) — the upstream contribution ladder: four independently
  reviewable rungs, with the dependency blocker named.
- [upstream-review.md](./upstream-review.md) — the maintainer review packet: problem, hypothesis,
  diff budget, measurements, security, ownership, review commands.
- [security.md](./security.md) — the sanitization contract: who escapes what, and the CSP
  expectations per renderer.
- [decisions.md](./decisions.md) — the ADR log: every major choice, with its reason.
- [prototype.md](./prototype.md) — hypothesis, architecture, how to run, measurements, limitations,
  evaluation protocol, capability audit, and the dependency migration plan.
- `SPACEGRAPH.md` (design), `SPACEGRAPH.TODO.4.md` (the workspace plan: the card, windows, the
  mouse, the toolbar, the equalizer), `SPACEGRAPH.TODO.3.md` (the closing plan: wrap up, sync,
  share), `SPACEGRAPH.TODO.2.md` (the frozen build record), and `SPACEGRAPH.TODO.1.md` (frozen
  Phase 0–10 record) at the repo root.
- Library side: `spacegraphjs/AGENTS.md`, `docs/host-integration.md`, and `demo/contract.html`.
