# Upstream contribution ladder (T3.7)

**Target:** `anomalyco/opencode`, `dev` branch.
**Fork:** `autonull/opencode_spacegraph`, `dev` @ `57c8829a86` (upstream `dev` merged at `f802f5e707`).
**Library:** `spacegraphjs` @ `4e5f733` (contract v2).

**What this is not.** The graph is not a replacement for the transcript. The transcript stays the
baseline; the graph is an opt-in, lazy, feature-flagged view of the same session data, and it is
derived on demand — no protocol, server, or storage change.

**Why a ladder.** A maintainer should be able to take the low-risk rung without taking the whole
experiment. Each rung below is independently reviewable, independently revertable, and answers one
question. The rungs are ordered by risk, not by enthusiasm.

---

## Rung 1 — The graph model (`packages/session-ui/src/graph/`)

**What it is.** A pure, synchronous model of a session: turns, messages, tools, files, subagents,
edges with explicit confidence, semantic levels, layouts, selectors. No DOM, no WebGL, no effects
during construction. It reads the same session data the timeline already has.

| | |
|---|---|
| **Files** | `packages/session-ui/src/graph/` — 13 files, +3,487 |
| **Also** | `packages/session-ui/src/timeline/projection.ts` (+10) publishes the message → owning-turn map, from the walk the timeline already does |
| **Tests** | 74 unit tests (`cd packages/session-ui && bun test src/graph`) |
| **Screenshots** | none needed — no UI in this rung |
| **Rollback** | delete the directory and the 10 added lines; nothing else references it |
| **Dependency** | none. No renderer, no library package. |

**Review question:** *Is the model a faithful, useful reading of a session, and is its vocabulary
(session semantics) correct — or should it live in the library instead?*

**What a reviewer should check**

- Stable ids: `turn:<opener>`, `msg:<id>`, `tool:<part>`, `file:<path>`. Positions are derived from
  ids, so streaming appends never move an existing node.
- Edges carry `confidence: explicit | structural | inferred`. Nothing infers causality from
  adjacency.
- Levels (`overview` / `execution` / `detail`) decide visibility; the DOM card budget decides how
  much is drawn as a card and how much degrades to a label.
- The model is a pure function of the session messages: same input, same output, no clock, no
  randomness.

---

## Rung 2 — The host package (`packages/session-graph/`)

**What it is.** The canvas, toolbar, inspector, breadcrumbs, search, minimap, accessibility mirror,
and the turn-map overlay. It imports the renderer **contract** only (`@spacegraphjs/renderer`); it
never imports a renderer backend.

| | |
|---|---|
| **Files** | `packages/session-graph/` — 57 files, +5,660 |
| **Tests** | 49 unit + 37 component (`bun test src`, `bun run test:components`) |
| **Screenshots** | `02-graph-overview.png`, `03-graph-execution.png`, `04-graph-selected.png`, `11-graph-timeline.png`, `12-graph-hierarchy.png`, `13-graph-narrow.png`, `15-graph-ribbon.png`, `16-graph-matrix.png`, `17-graph-files.png`, `18-graph-layered.png`, `19-graph-depth-stack.png`, `20`–`24` (zoom/pan matrix), `07`/`08` (Cytoscape parity) |
| **Rollback** | delete the package; no app file imports it until Rung 3 |
| **Dependency** | **the published SpaceGraphJS packages.** See "The one blocker" below. |

**Review question:** *Is the host UI worth its size — and would you rather see a smaller surface
(the inspector alone, or the side panel) than the whole canvas?*

**What a reviewer should check**

- Detail is always readable in a conventional DOM panel with selectable text, never only on canvas.
- The renderer owns geometry and camera; the host owns semantics and layout. There is no
  `if (renderer === "cytoscape")` branch in the host.
- Capability differences are declared in `RendererCapabilities` and surfaced by the toolbar, never
  silently dropped.
- The security contract: hostile markup in a label, summary or tool command stays inert in both
  adapters, the inspector and the SVG export (`docs/spacegraph/security.md`).

---

## Rung 3 — App wiring (feature-flagged, off by default)

**What it is.** A setting, a mode branch, commands, a header toggle, and the per-session graph
state. The graph chunk is lazy: it never loads unless the flag is on and the user opens the mode.

| | |
|---|---|
| **Files** | 16 files under `packages/app/src`, +689/−36 (see `upstream-review.md` §5 for the per-file table) |
| **Tests** | 16 Playwright e2e tests (`packages/app/e2e/graph/session-graph.spec.ts`), app typecheck |
| **Screenshots** | `01-log.png` → `02-graph-overview.png` → `04-graph-selected.png` → `05-return-to-log.png` (the round trip), `13-graph-narrow.png` (mobile entry) |
| **Rollback** | set `experimental.sessionGraph` to `false`. The UI disappears, the commands disable, the lazy chunk never loads. No data migration, no schema change. |
| **Dependency** | Rung 2 |

**Review question:** *Is this acceptable app surface for an experimental feature — and is the
off-by-default flag the right gate, or should it be an extension instead?*

**What a reviewer should check**

- `experimental.sessionGraph` defaults to `false`; every graph code path is behind it.
- The transcript keeps working if the graph package fails to load: the failure renders an error
  panel inside the graph view, not a broken session.
- Leaving graph mode restores the transcript scroll position (T1.5).
- Bundle: the graph is a separate lazy chunk (+37.55 kB, 11.82 kB gzip); the session entry delta is
  +1.43 kB and the route delta is −5.81 kB, i.e. bundler re-split noise.

---

## Rung 4 — The hybrid affordance (optional)

**What it is.** The low-risk adoption path: a side-panel overview, and a turn-map overlay that opens
a scoped map of one turn over the transcript without losing the scroll position.

| | |
|---|---|
| **Files** | `packages/gui-extensions/src/session-map/` (+274) and the `TranscriptScreen` addition to the extension SDK (+22) |
| **Tests** | component tests for the turn-map overlay (`component-tests/turn-map.spec.ts`) |
| **Screenshots** | `22-graph-turn-1.png`, `23-graph-turn-2.png`, `24-graph-failure-chain.png` |
| **Rollback** | remove the built-in extension registration; the SDK addition is additive and optional |
| **Dependency** | Rung 2, or the published library packages directly |

**Review question:** *Is a scoped, single-turn map enough on its own — and does the hybrid work
better than the full graph, or is it just smaller?*

**What a reviewer should check**

- `TranscriptScreen` gives a panel a way to reveal a message and to follow the user's position
  without reaching into the timeline. It is the only SDK change, and it is additive.
- The overlay traps focus, closes on Escape, restores focus, and scrolls the page underneath
  unchanged.

---

## The one blocker: the library linkage

OpenCode currently consumes `spacegraphjs/*` as **source workspaces** in a gitignored sibling
checkout. Upstream cannot take Rung 2 or Rung 4 in that form. Three options, in the maintainer's
order of preference:

| Option | What it means | Cost |
|---|---|---|
| **A. Publish the packages** | `@spacegraphjs/renderer`, `-adapter`, `-spacegraph-renderer`, `-cytoscape-renderer`, `-svg-renderer` on npm with semver tags | The library becomes a public dependency with its own release cadence (T4.2) |
| **B. One bundled companion package** | A single package with the contract and the adapters, built from source, published | Less granular, but one dependency and one version to track |
| **C. Extension panel only** | Take Rung 4 with a locally bundled renderer | No dependency, but the canvas work (Rung 2) is deferred |

**Rung 1 has no such blocker** and is the only rung that can be merged today without a dependency
decision.

---

## Order of work

1. **Open the issue/RFC** with the strongest screenshot (`04-graph-selected.png`), the hypothesis, the
   measured result, and this ladder. Do not open the large PR first.
2. **Take Rung 1** if the model is accepted — it is pure, dependency-free, and testable on its own.
3. **Decide the library question** (A, B, or C). Rung 2 and Rung 4 depend on it.
4. **Take Rung 3** only after a measurement says the graph earns app surface (T2.2).

## RFC status

**Deferred, with reason.** No RFC has been posted yet: the evaluation protocol (R7.3) has not been
executed, so the RFC would carry an unmeasured claim. The plan sequences it behind T2.2 (see
`SPACEGRAPH.TODO.2.md` §3). When the measurement exists, this document plus
`docs/spacegraph/upstream-review.md` is the source for the issue text.

## Review commands

```bash
# Rung 1
cd packages/session-ui && bun test src/graph

# Rung 2
cd packages/session-graph && bun run typecheck && bun test src && bun run test:components

# Rung 3
cd packages/app && bun run typecheck && bun run test:e2e -- e2e/graph/session-graph.spec.ts

# Everything
bun run graph:verify

# The demo, without a model provider
bun run graph:dev
```
