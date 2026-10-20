# SpaceGraph demos — three surfaces, one index

A reviewer should be able to pick the right surface in one glance. They are not interchangeable:
one shows the **host**, one shows the **library**, one is the **test harness**.

| Surface | Command | Shows | Needs a provider? |
|---|---|---|---|
| [Host demo](#1-host-demo--the-opencode-app) | `bun run graph:dev` | The real OpenCode shell with the session graph | No |
| [Library contract demo](#2-library-contract-demo--the-library-alone) | `cd spacegraphjs && pnpm run dev:demo` → `/contract.html` | The SpaceGraphJS contract and adapters, without OpenCode | No |
| [Test harness](#3-test-harness--not-a-demo) | `bun run test:components` | Component tests | No |

The old Phase 0 spike (`screenshots/history/00-spike-spacegraph.png`) is retired. Storybook is a test
harness, not a demo: it exists to drive Playwright, and it is not a surface a maintainer should be
sent to.

---

## 1. Host demo — the OpenCode app

```bash
bun install        # once
bun run graph:dev  # then open http://localhost:3000
```

**What it is.** The real OpenCode shell — same routes, same layout, same components — booted
against a mock server (`script/graph-dev.ts`, port 4097) that serves the canonical fixture and
**no model provider**. The graph sits behind the `experimental.sessionGraph` setting, which the
demo turns on.

**Steps.** Open http://localhost:3000 → click **Session graph** under *Recent sessions* → click the
graph toggle in the session header (or press `Ctrl+Shift+G`). The demo page is served at `/`; the
shell's router knows no other path, so the demo is the app's own entry point with a different
module.

**Fixture.** `buildFixtureMessages()` from `packages/session-ui/src/graph/fixture.ts` — the same
session used by the captures and the component tests: an authentication-test failure, a file that
changes, a retry, and a failure chain.

**What it proves.**

- The graph is a view over existing session data: nothing is added to the protocol, the server, or
  storage.
- The transcript keeps working when the graph is closed, and the scroll position is restored.
- The failure state is contained: if the graph package fails to load, the transcript is unaffected.

**Screenshot.** `screenshots/01-log.png` → `02-graph-overview.png` → `04-graph-selected.png` →
`05-return-to-log.png`.

---

## 2. Library contract demo — the library alone

```bash
cd spacegraphjs
pnpm install --ignore-scripts --filter spacegraphjs   # first time only
pnpm run dev:demo     # then open http://localhost:5173/contract.html
```

**Hosted:** the same build is deployed to GitHub Pages on `main` and on release tags by
`spacegraphjs/.github/workflows/deploy-demo.yml` (`pnpm run build:demo` → `dist-demo/`). The URL is
referenced from the library README once the first deploy succeeds.

**What it is.** A host that is not OpenCode: it loads the published contract, builds a `RenderModel`
by hand, and mounts it through the adapters. No session vocabulary, no OpenCode import.

**Fixture.** A synthetic model defined in `spacegraphjs/demo/contract-demo.ts`.

**What it proves.**

- The contract is usable outside OpenCode: contract → render model → adapter → canvas.
- Both adapters (SpaceGraph WebGL and Cytoscape) and the static SVG renderer honour the same
  model.
- Capability differences are declared, not silently dropped.

**Screenshot.** `screenshots/09-contract-demo-light.png`, `10-contract-demo-dark.png`. These two are
the framing reference for the host captures: the same card grammar, the same dark surface.

---

## 3. Test harness — not a demo

```bash
cd packages/session-graph && bun run test:components   # Storybook-backed Playwright
cd packages/session-ui && bun test src/graph            # pure model
bun run graph:verify                                     # the whole gate
```

**What it is.** The Storybook stories that drive the component tests, plus the capture harness.
Stories exist to be asserted against; a story is not a presentation surface.

**Where the stories live.** `packages/session-graph/src/**/*.stories.tsx`. Each has a matching spec
in `packages/session-graph/component-tests/`.

**What it proves.** The DOM contracts at 1440 / 1100 / 390, the keyboard and screen-reader paths,
the adapter parity, and (T6.7) that hostile markup stays inert in both adapters.

---

## 4. Two opt-in surfaces in the host demo

Both are off unless you ask for them, and neither sends anything anywhere.

### The interaction counter (T2.3)

```
http://localhost:3000/?graphMetrics=1
```

A small readout appears in the corner of the session screen: the number of interactions so far, and
a **Reset** button for the next task. It counts the surface switches, the searches, the node
selections, the expansions, the returns to the transcript, the turn-map openings, and the camera
actions. The count stays in the browser — no telemetry, no network, no storage.

**Why it exists.** The usability protocol asks whether a task takes three interactions or fewer.
That is a measurement, not an estimate, and the dry run has to be able to cite the number.

**How to read it.** The total is the number the protocol wants. Hovering it breaks the total down
by action (`select 3 · search 1`), so a facilitator can see *where* the interactions went.

### The node permalink (T3.5)

```
http://localhost:3000/session/<id>#graph:file:src/auth/token.ts
```

The hash names one node of the map. The app opens the graph on it, selects it, and frames it; an
unknown node id falls back to the plain map. The inspector's copy button puts the same link on the
clipboard, so a decision or a failure can be shared instead of re-scrolled to.

The representation can be named too (`#graph:ribbon:turn:msg_user_1`). The representation comes
first because a node id may itself contain colons (`turn:msg_user_1`), so a trailing segment would
be ambiguous.

---

## Which one should I open?

| If you want to… | Open |
|---|---|
| See whether this is useful inside OpenCode | Host demo |
| Judge the library as a dependency | Library contract demo |
| Check that it is tested, not just demoed | `bun run graph:verify` |
| Measure the interactions of a task | Host demo with `?graphMetrics=1` |
| Share one node of a map | The `#graph:<node>` permalink |
