# SPACEGRAPH.TODO.5 — the map as a control plane (rev 2)

**Status:** rev 2, 2026-10-23. Supersedes the *architecture* of rev 1 while preserving its task and gate IDs. `SPACEGRAPH.md` is the design argument; `docs/spacegraph/prototype.md` the release write-up. Rev 2 keeps rev 1's thesis — the reader does not just see the system, they operate it — and replaces the implementation model that could not carry it.

**Conventions:** carried tasks keep their IDs (`T19`–`T28`, `G19`–`G28`). New work is `T29`–`T32`, `G29`–`G32`; new deferrals are `D23`+. Never renumber or reuse an ID. A task whose *capability* survives but whose *mechanism* was wrong stays in its slot and says so; a task whose capability is withdrawn gets a new deferral ID. Every task has a `Done when` and a `Verify` command.

**Testing philosophy (rev 2.3):** Test *behavior*, not implementation. Prefer:

- **Integration over unit**: one scenario test > five function tests. Use the real `buildGraph` + real fixture + real renderer adapter.
- **Golden fixtures over assertions**: commit fixture JSON + expected graph JSON; update with `bun test --update` when behavior intentionally changes.
- **Visual regression over DOM queries**: `graph:capture --mode=compare` catches regressions; `graph:capture --mode=verify` is the gate.
- **Property-based for pure functions**: `scopeModel`, `layoutGraph`, `byProximity` — generate random models, assert invariants (no dangling edges, stable IDs, budget respected).
- **Contract tests at boundaries only**: protocol schema, adapter interface, renderer capabilities. No internal mocks.
- **E2E for user flows**: "switch to review profile → click commit → see file" — one Playwright test per flow.
- **Manual for UX feel**: animation smoothness, tier cross-fade, empty-state helpfulness — verified by `bun run dev:live` before merge.

Avoid: per-function unit tests, snapshot tests of React output, testing private helpers, asserting exact node counts.

---

## 0. Why rev 1 could not be built

### 0.1 The six faults

| # | Fault | Evidence |
|---|-------|----------|
| 1 | **The input does not exist.** `buildGraph` takes messages, status, session and lineage — nothing about the workspace. Rev 1 adds eight domains that need filesystem, VCS, parser and process facts, never names the seam that supplies them, and then rules that seam out ("no layer depends on a running server"). In a client/server app the workspace services *are* the server. | `packages/session-ui/src/graph/build.ts:974` |
| 2 | **"Layer" is a fourth name for three axes that already exist.** The model separates *kind* (what a node is), *level* (when it is visible), *layout* (how it is arranged), and *lane* (where on the grid). Rev 1 makes `layers` 1:1 with kinds, duplicating `LEVELS.kindMinLevel` and `DEPTH`, and asks for a per-layer level table that must be kept in sync by hand. | `levels.ts:10`, `layout.ts:88` |
| 3 | **The join key is wrong.** Tool nodes carry `path`, but provenance is already normalized into `file` nodes with stable ids. The durable join is `file` (and `turn`) with `position` as *data*, never as identity. A tool node is an event; it disappears from the map at overview and means nothing outside one turn. | `model.ts:93`, `build.ts:819`–`838` |
| 4 | **The git layer is factually wrong.** `git log -1 -- <files>` is *the last commit touching those files*, which usually predates the session. A turn's edits are uncommitted working-tree changes; they are not a commit. The repo's VCS surface is also read-only — `info`, `base`, `branches`, `status`, `diff` — with no log and no checkout, and it is provider-neutral (git *and* hg), so "run `git checkout` via shell" bypasses the abstraction. | `packages/core/src/vcs.ts:38`, `packages/protocol/src/groups/vcs.ts:34` |
| 5 | **Control without policy.** Rev 1 gives node kinds actions that spawn shells, check out branches and kill processes on a click — outside the permission seam, outside the transcript, with no attribution. In a product whose safety story is "tool calls are permitted and recorded", that is a regression wearing a feature's clothes. | ADR-023 |
| 6 | **Purity against LSP.** Model build is pure, synchronous and browser-side. A 10k-node build that resolves LSP positions at <50 ms is not achievable, and "LSP runs in-process" is false in a web client. | `build.ts:974` |

### 0.2 The shape rev 2 builds

```
  session messages ─┐
  status, lineage ──┼──────────────────────────────┐
                    │                              │
                    │      ┌───────────────────────▼─────────────────────────────────┐
                    │      │  Workspace Index  (host, Location-scoped, cached)        │
                    │      │  fs tree · vcs status/branches/diff/base · packages      │
                    │      │  symbols (diff hunks, then tree-sitter) · issues         │
                    │      └───────────────────────┬─────────────────────────────────┘
                    │                              │ WorkspaceSnapshot
                    │                              │ plain JSON · versioned · per-source asOf
                    ▼                              ▼
                            buildGraph(input)  — pure, synchronous, no I/O
                                            │
                                            ▼
                                   GraphModel  (one vocabulary)
                                            │
                               scopeModel(model, lens)   ← the reader's composition
                                            │
                          RenderModel → renderer → cards, edges, actions
```

Three rules replace rev 1's eight:

1. **Session facts come from messages. Workspace facts come from the snapshot. Nothing comes from I/O during model build.**
2. **Domains qualify, levels filter, layouts arrange, actions operate.** Four axes, not eight layers.
3. **Every derived fact carries provenance and an `asOf`.** The map never asserts a fact it cannot attribute.

### 0.3 Two roots, one spine

The control plane has two roots because it answers two different questions:

```
 directories ◄─part-of─ package ◄─part-of─ directory ◄─part-of─ file ◄─writes─ tool ◄─part-of─ turn ◄─part-of─ session
                                                             │                                   │
                                                             ├─part-of─ symbol ─calls─ symbol     └─addresses─ issue
                                                             ├─part-of─ test ─covers─ symbol
                                                             └─touches─ commit ◄─points-at─ branch

 process ◄─produces─ tool          process ─listens-on─ port          file ─references─ process
```

(`A ◄─edge─ B` means `edge` points from B to A. All containment edges are child → parent.)

The session root says *what happened*; the directory/package roots say *what exists*. `file` is where they meet, and that is why the file node — not the tool — is the join key. Containment is `part-of`, so the hierarchy and tree layouts work with zero new geometry and the existing `parentIndex`/`childIndex` selectors work unchanged (`lookup.ts:37`, `:60`).

### 0.4 Gates and waves

| Wave | Gates | Outcome | Depends on |
|------|-------|---------|------------|
| **0 — foundation** | **G29** snapshot, **G30** domains, **G31** actions, **G32** evidence | the seam, the truth, the safety, the proof | — |
| **1 — the system on screen** | **G27** lens, **G19** directories | the reader composes a view and sees the project's skeleton | G29, G30 |
| **2 — the working tree** | **G20** history, **G22** packages, **G24** verification | what changed, where it lives, what proves it | G29 |
| **3 — what runs and what it means** | **G23** runtime, **G21** code | what is listening, what calls what | G29, G30 |
| **4 — the work** | **G25** issues, **G26** docs | why it is being done, where it is written down | G29 |
| **5 — navigation** | **G28** cross-domain navigation | one map, one search, one grammar | all |
| **6 — adaptive UI** | **G33** expand/collapse, continuous layout | smooth interaction, no layout thrash | G27, G30 |

Ordering is by *dependency*, not by value: G29 and G30 are prerequisites for every derived kind, and G31 is a prerequisite for every action. Build them before the domains, or each domain invents its own. G33 depends on G27 (lens control) and G30 (cluster state in model).

### 0.5 Disposition of rev 1

| Rev 1 | Rev 2 |
|-------|-------|
| T19.1–T19.3 directories | **kept** — baseline derives from touched files; the snapshot adds untouched ones |
| T20.1 commit per editing turn | **corrected** — commit nodes exist only for real commits; a turn's change is the existing `diff` node |
| T20.2 branch nodes | **kept** — from `vcs.branch.list`; checkout is a named operation, not a shell string |
| T20.3 tag nodes | **deferred** → D26 |
| T21.1 LSP symbol resolve | **corrected** — diff-hunk symbols first (`inferred`), tree-sitter second |
| T21.2 call graph | **kept** — only when the parser can prove it |
| T21.3 go-to-definition | **reshaped** — "open at range"; definition itself is deferred → D27 |
| T22.1–T22.2 packages, config | **kept** — config is a file role, not a kind |
| T22.3 external dependency nodes | **withdrawn** → D23 (a list in the package detail, not nodes) |
| T23.1–T23.2 processes, ports | **kept** — identity from the tool/PTY, not the PID |
| T23.3 containers | **deferred** → D24 |
| T24.1–T24.4 verification | **kept** — coverage only when a report exists; re-run becomes an agent action |
| T25.1–T25.2 issues | **kept** — local references first, API enrichment second |
| T26.1–T26.2 docs, ADRs | **kept** — file roles + frontmatter |
| T26.3 comment nodes | **withdrawn** → D25 |
| T27.1–T27.3 layers | **reshaped** — domains + profiles + empty states (the scope engine is T30.2) |
| T28.1–T28.2 navigation | **kept** — one `g` grammar, one search |
| T28.3 actions | **moved** to T31.2 (closed registry) |

---

## 1. Foundation

### T29 — the Workspace Snapshot (G29)

**Why.** Every derived kind needs facts the session does not carry. One typed input, produced behind one seam, keeps the model pure and the domains cheap.

#### T29.1 Protocol schema — **done** (2026-10-23)

`WorkspaceSnapshot` in `packages/protocol` (schema-only, so Client may read it without Core or Server):

```ts
type WorkspaceSnapshot = {
  version: 1
  revision: string                 // head sha + status digest; monotone per location
  root: string                     // project directory; every path below is root-relative
  scope: "session" | "directory"   // what this snapshot covers
  asOf: { tree?: number; vcs?: number; packages?: number; symbols?: number }
  truncated: boolean
  workspace: { name: string; path: string }
  directories: { path: string; parent?: string }[]
  packages: { path: string; name?: string; version?: string; private?: boolean; scripts?: string[] }[]
  files: { path: string; status?: "added" | "modified" | "deleted"; doc?: boolean; config?: boolean }[]
  head?: { branch?: string; sha?: string }
  base?: { sha: string }
  branches: { name: string; sha: string; upstream?: string; remote?: boolean }[]
  commits: { sha: string; short: string; message: string; author?: string; time?: number; files?: string[] }[]
  symbols: { path: string; name: string; qualified: string; kind: SymbolKind; range: Range; signature?: string; origin: "parser" | "hunk" }[]
  processes: { id: string; pid?: number; command: string; cwd?: string; ports: number[]; startedAt?: number }[]
  issues: { provider: string; repo?: string; number: string; title?: string; state?: string; url?: string }[]
  missing: { source: Source; reason: string }[]
  capabilities: string[]                 // e.g. "vcs.checkout", "issues.api", "symbols.parser"
}
```

**Done when:** the schema round-trips in a protocol test; every field a task below needs is present; no field requires a second request to interpret. `Source` and `SymbolKind` are small closed literals; `Range` is `{ start: { line, character }, end: { line, character } }`. Tests are **not** in the snapshot: test output is a session fact and enters through messages (T24).

**Verify:** `cd packages/protocol && bun test` (schema round-trip); `cd packages/client && bun run generate`.

**Landed:** `packages/protocol/src/workspace-snapshot.ts` (`Snapshot`, `Source`, `SymbolKind`, `Range`, scopes and every entry shape) plus `packages/protocol/test/workspace-snapshot.test.ts` (round-trip, absent optionals, version/source rejection). `WorkspaceSnapshot = Snapshot` is exported for consumers that prefer the plan's name.

#### T29.2 Server read model — **done** (2026-10-23)

One group, `server.graph`, one endpoint, `graph.workspace`, assembled from services that already exist:

- `FileSystem.Service` — tree, status, package.json reads (`packages/server/src/handlers/fs.ts` pattern)
- `Vcs.Service` — `info`, `base`, `branches`, `status`, `diff` (`packages/server/src/handlers/vcs.ts`)
- `Project.Service` — project root and name
- host-known processes (PTYs) only; tests stay in the session model, because test output is a tool result

Scopes are bounded: `scope=session` (default) takes the session's touched paths and their ancestors; `scope=directory` takes one directory (for the filesystem window); `scope=workspace` (opt-in, warns on >50k files) takes the full tree. Client sends `scope` + optional `paths` (for directory). Ignore rules come from the existing filesystem search. The read model is memoised per `(location, revision, scope)` and invalidated by the existing filesystem/VCS events. **No new persistence.**


**Done when:** one request returns a session-scoped snapshot for a fixture repo; a missing source appears in `missing` with a reason instead of failing the request.

**Verify:** `cd packages/server && bun test src/graph` (snapshot endpoint + symbol index).

**Landed:** `server.graph` / `graph.workspace` (`packages/protocol/src/groups/graph.ts`), handler `packages/server/src/handlers/graph.ts`, and `packages/server/src/graph/snapshot.ts` (`assembleSnapshot` pure; `collectWorkspaceSnapshot` reads `FileSystem`, `Vcs`, package manifests). `packages/server/src/graph/workspace.test.ts` covers ancestors, status, packages, revision stability, missing rows and a real repository request.

**Deviations from the text, to resolve before T20/T21:**

- The query takes `paths` as a comma-separated string for **both** `session` (touched files) and `directory` (one path). The server cannot know a session's touched files; the client owns them.
- The VCS surface (`info`, `base`, `branches`, `status`, `diff`) exposes no commit ids, so `branches`, `commits`, `head.sha` and `base.sha` stay empty and `missing` says so. T20 needs a new provider capability (`Vcs.history` or equivalent) or an explicit decision to drop those facts.
- Symbols, processes and issues are absent with a reason. T21.1 mints hunk symbols client-side, so the symbol snapshot is the parser upgrade (T21.2), not the baseline.
- Memoisation per `(location, revision, scope)` and event invalidation are **not** implemented yet; each request reads through. This is safe but violates the read-model note. Track as remaining work on T29.2.

#### T29.3 The model takes the snapshot — **done** (2026-10-23)

`buildGraph` becomes one object argument. The definition is in `build.ts:974`; the five call sites to update are `fixture.ts:255`, `packages/app/src/session/graph/session-graph-view.tsx:82`, `turn-map-overlay.tsx:29`, `packages/gui-extensions/src/session-map/panel.tsx:30`, and `packages/session-graph/script/scale-bench.ts:89` (plus stories):

```ts
buildGraph({
  messages, status,
  sessionID?, lineage?,
  snapshot?,          // absent ⇒ today's model, byte-identical
  diffByTurn?,        // FileDiff.Info[] per turn, from the timeline's turn-diff cache
})
```

The per-turn patches already exist in the app: `packages/app/src/session/timeline/turn-diffs.ts` caches `FileDiffInfo[]` per finished turn, and `FileDiff.Info.patch` carries the unified diff the symbol extractor reads. The panel passes the loaded turns in; the model never fetches.

Absent snapshot must produce the **existing** model exactly — the session layer does not depend on the control plane. With a snapshot, `GraphModel` gains `workspaceRoot?: string` beside `root`, so selectors and the filesystem window can start from the workspace; `root` stays literal `session`. Add the architecture test: `session-ui/src/graph` imports no `node:*`, no `@opencode/core`, no `@opencode/server`.

**Done when:** the graph without a snapshot is byte-identical to today (golden test); with a snapshot, derived nodes appear and the session nodes are unchanged.

**Verify:** Golden fixture test — session-only model byte-identical; with snapshot, derived nodes appear, session nodes unchanged. `cd packages/session-ui && bun test src/graph`.

**Landed:** `buildGraph({ messages, status, sessionID?, lineage?, snapshot? })` (all call sites and tests updated). `GraphModel` gains optional `workspaceRoot` and `snapshot: { revision, asOf, missing }`; absent fields are not added, so the session-only model is unchanged. `packages/session-ui/src/graph/model.golden.json` pins that model (`UPDATE_GOLDEN=1 bun test src/graph/workspace.test.ts` rewrites it). Directories are derived from the union of session-touched files and snapshot files, with `part-of` file→directory and directory→parent edges (T19.1's baseline).

**Deviation:** `diffByTurn` is **not** in the input yet. It has no consumer until T21.1 mints hunk symbols, and an accepted-but-unused field is dead weight. Add it with `symbolsFromHunk`.

#### T29.4 Refresh and staleness — **done** (2026-10-23)

The host fetches the snapshot outside the model build, debounced (~250 ms), and never during a layout. A refetch rebuilds the model; positions for session nodes never move, and derived nodes place relative to their anchor (the `previous` map already in `layoutGraph`). The model exposes `snapshot: { revision, asOf, missing }` so the inspector and the legend can say how old a fact is and what is absent.

**Done when:** editing a file outside the session refreshes the derived facts without moving a session node; a failed source shows as absent, not as an empty graph.

**Verify:** `bun run dev:live` — edit file outside session, verify derived facts refresh without moving session nodes.

---

### T30 — domains, provenance, scoping (G30)

#### T30.1 Domain vocabulary — **done** (2026-10-23)

One table, one field, no new axis at the layout boundary:

```ts
export const DOMAINS = ["session", "directories", "history", "code", "verification", "runtime", "work"] as const
export type Domain = (typeof DOMAINS)[number]

export const DOMAIN_OF_KIND: Record<NodeKind, Domain> = { /* exhaustive */ }

export function nodeDomain(node: GraphNode): Domain   // node.domain ?? DOMAIN_OF_KIND[node.kind]
```

`GraphNode` gains optional `domain` (used only for snapshot-only files, which are directory-domain rather than session) and optional `provenance: { source: Source; asOf?: number; confidence: Confidence }`. Edges already carry confidence; derived edges get their provenance from the source.

**Done when:** every kind has a domain; `DOMAIN_OF_KIND` is exhaustive by type; no component branches on a kind to decide a domain.

**Verify:** Golden fixture — every kind has domain; DOMAIN_OF_KIND exhaustive. `cd packages/session-ui && bun test src/graph`.

**Landed:** `DOMAINS`, `Domain`, exhaustive `DOMAIN_OF_KIND` and `nodeDomain` in `vocabulary.ts`; `GraphNode.domain` and `GraphNode.provenance` (`{ source, asOf?, confidence }`) on the model. `directory` is the first non-session kind. `provenance` is defined but not populated yet — T30.3 owns that surface.

#### T30.2 `scopeModel` — **done** (2026-10-23)

The lens is a **pure filter over the model**, so levels, layout, summary, budget and selectors need no signature changes:

```ts
scopeModel(model: GraphModel, lens: ReadonlySet<Domain>): GraphModel
```

It drops nodes outside the lens, drops edges whose endpoints are not both present, preserves `part-of` order, and keeps `turns`, `activeTurn`, `goal`, `root`, `workspaceRoot` and `snapshot`. Session is always in the lens; the function enforces it rather than trusting the caller. A dropped directory costs a file its parent, which the existing layout already tolerates (`layout.ts:120` falls back to the file's owner turn).

**Done when:** every existing graph function returns the same result on a session-only lens as on today's model; cross-domain edges never dangle.

**Verify:** Golden fixture — session-only lens = today's model; cross-domain edges never dangle. `cd packages/session-ui && bun test src/graph`.

**Landed:** `scope.ts`. Enforces session, filters nodes by `nodeDomain`, drops edges with a missing endpoint, and filters `turns`/`activeTurn` to retained nodes. `packages/session-ui/src/graph/scope.test.ts` covers the session-only equality, enforcement, directory lens and a dangling-edge fixture.

#### T30.3 Provenance in the surface — **done** (2026-10-23)

Every derived node and edge says where it came from and when: a source glyph on the card's far tier, a "from `<source>`, `<age>`" line in the inspector, and one legend entry per source. `missing` rows appear as absences with their reason, never as an empty domain. The model already carries `confidence`; the existing `CONFIDENCE_KEY` copy distinguishes explicit from inferred, so a hunk symbol never reads like a parsed one.

**Done when:** no derived node renders without a source; the inspector says how old each derived fact is.

**Verify:** Visual check — provenance badge on card far tier, inspector shows "from <source>, <age>". `graph:capture --mode=compare`.

---

### T31 — actions and attribution (G31)

#### T31.1 Action descriptors — **new**

Actions are data, resolved by the host. The model never executes:

```ts
type ActionKind = "navigate" | "reveal" | "copy" | "run"
type ActionSpec = {
  id: string                    // closed registry id, e.g. "vcs.checkout"
  kind: ActionKind
  labelKey: string              // i18n
  target?: { node?: string; file?: string; range?: Range; url?: string; text?: string }
  operation?: { id: string; params: Record<string, JsonValue> }   // run only
}
function actionsFor(node: GraphNode, model: GraphModel): ActionSpec[]
```

`navigate`, `reveal` and `copy` are local and free. `run` is the only one with side effects, and it is closed:

| Operation | Route | Reversible |
|-----------|-------|------------|
| `vcs.diff`, `vcs.branch.list` | existing protocol | yes |
| `vcs.checkout` | **new provider capability** (git and hg), then a protocol route | yes, with confirmation |
| `test.rerun`, `process.restart`, `process.stop`, `package.install`, `package.script` | **agent-mediated**: the map composes a prompt for the reader to send | by the agent, recorded |

The graph never builds a shell string. An operation is a named entry with typed params, so it can be validated, localized, confirmed and recorded. Agent-mediated operations land in the transcript with the session's own permission flow and attribution — the control plane composes work for the agent instead of bypassing it (ADR-023 stays true).

**Done when:** every action in T31.2 resolves to a descriptor; no component calls `spawn`/`exec`/`fetch` for an action; run actions require confirmation and are attributable.

**Verify:** E2E flow — navigate, reveal, agent-mediated run all work. `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts`.

#### T31.2 Action registry per kind — **moved from T28.3**

| Kind | Actions |
|------|---------|
| `directory` | Reveal, Open in editor, New file here |
| `file` | Open at range, Show history, Show callers, **Show blame**, **Compare to base**, Run tests (agent), Copy path |
| `package` | Open `package.json`, Run script (agent), Show dependencies |
| `commit` | View diff, Copy sha, Open on host, **Cherry-pick (agent)** |
| `branch` | Checkout (confirmed), Copy name, **Create PR (agent)** |
| `symbol` | Open at range, Find references (search), **Show callers**, Ask agent to rename |
| `test` | Re-run (agent), **Debug (agent)**, Open file |
| `test-run` | Re-run failed (agent), Copy summary |
| `process` | View logs, Restart (agent), Stop (confirmed, agent), **Attach debugger (agent)** |
| `port` | Open in browser, Copy URL, **Proxy to localhost** |
| `issue` | Open in browser, Ask agent to start work, Copy reference, **Create branch (agent)** |
| `session`/`turn`/`tool`/`diff` | today's actions, unchanged |


**Done when:** the table is the only place actions are named; each kind's detail matches it.

**Verify:** Same as above — covered by flow test.

#### T31.3 Capability announcements — **new**

The snapshot and the server advertise what they can do (`vcs.checkout`, `issues.api`, `symbols.parser`). The toolbar and the detail hide actions the host cannot honour; a missing capability says why. This replaces rev 1's silent "graceful degradation" with a visible one.

**Done when:** an older server or a non-git project shows no dead actions.

**Verify:** Visual check — dead actions hidden, missing capability explained. `graph:capture --mode=compare`.

---

### T32 — evidence (G32)

#### T32.1 Golden snapshot fixture — **new**

One fixture repo + one canonical session, committed as JSON, exercised by every domain test. The session fixture already exists (`fixture.ts`); the snapshot fixture is new. Determinism: no timestamps in assertions, no absolute paths.

**Done when:** one command rebuilds the fixture; tests fail on an unintended model change.

**Verify:** `cd packages/session-ui && bun test src/graph` (fixture rebuild command works).

#### T32.2 The degradation matrix — **new**

Every source has a test for its absence: no repo, no grammar, no test output, no API token, truncated snapshot. The domain's empty state is part of the test, not an afterthought.

**Done when:** the matrix in §3.4 is a test table, and each row passes.

**Verify:** Golden fixture — each degradation row renders correct empty state + action. `cd packages/session-ui && bun test src/graph`.

#### T32.3 Budgets — **new**

Measured, not asserted: snapshot build, model build with snapshot, `scopeModel`, render-model build. The scale bench grows a snapshot variant.

**Done when:** §3.3 numbers are printed by `graph:scale` and guarded in CI.

**Verify:** `bun run graph:scale` prints numbers; CI fails if budgets exceeded.

---


### T33 — adaptive expand/collapse & continuous layout (G33)

**Why.** Levels are coarse (3 steps). Readers want to expand a single directory, collapse a noisy turn, or watch the map reflow smoothly as nodes enter/leave — without a full layout recompute.

#### T33.1 Interactive cluster state — **new**

Each derived cluster (`phase`, `directory`, `package`, `test-run`) gains a per-node `expanded: boolean` in `GraphNode.data`, persisted per session. Clicking the cluster's chip toggles it; the model rebuilds with that node's `minLevel` overridden locally (collapsed = `overview`, expanded = `execution`). The `scopeModel` already filters — this is a *local lens override*.

```ts
// In GraphNode.data
clusterState?: { expanded: boolean; overriddenMinLevel?: ZoomLevel }
```

**Done when:** clicking a phase chip at execution collapses it to a counted chip; clicking again expands; state survives reload.

**Verify:** Golden fixture — toggle state persists reload; model rebuilds with overridden minLevel. `cd packages/session-ui && bun test src/graph`.

#### T33.2 Continuous layout for hierarchy/tree — **new**

The `hierarchy` and `tree` strategies (`spacegraphjs/layout`) already compute positions incrementally via `previous` map. Add a **transition mode**: when the model changes (cluster toggle, node add/remove, domain toggle), the renderer receives `previousPositions` and animates nodes to new positions over 150–300 ms (easing: cubic-bezier(0.2, 0, 0, 1)). Nodes that didn't move don't animate.

- **Opt-in per layout**: `LayoutOptions.transition = true` (default for hierarchy/tree; off for lanes/timeline/force).
- **Force layout** stays discrete (physics is already iterative; add `force: { continuous: true }` later if needed).

**Done when:** toggling a directory in hierarchy layout animates children into/out of view; no layout thrash.

**Verify:** Visual regression — toggle directory in hierarchy layout animates smoothly. `graph:capture --mode=compare`.

#### T33.3 Progressive detail on zoom (semantic zoom + cluster) — **new**

Combine level zoom with cluster state: at `overview`, all clusters collapsed. At `execution`, clusters default expanded but reader can collapse any. At `detail`, all expanded. The renderer interpolates card content tiers (far → mid → near → closest) **continuously** during zoom, not just at level boundaries.

- `detailTier(width)` already has hysteresis; use it as the interpolation driver.
- Card content cross-fades between tiers (opacity transition 120 ms).

**Done when:** zooming a card smoothly reveals summary → detail → content; no pop at level boundaries.

**Verify:** Visual check — zoom card cross-fades tiers, no pop at boundaries. `graph:capture --mode=compare`.

#### T33.4 Budget-aware continuous layout — **new**

Continuous layout must respect the DOM card budget (`byProximity`). During transition, budget is evaluated at **target positions**, not current. Nodes entering budget fade in; nodes leaving fade out. The `weights` per domain (§3.3) apply to the target layout.

**Done when:** animating a domain toggle doesn't exceed budget; cards fade smoothly.

**Verify:** `bun run graph:scale --transition` passes CI budget guard.

---

### Integration with existing tasks

| Task | Touch point |
|------|-------------|
| T19.2 (directory cards) | Directory chips get expand/collapse toggle |
| T20.2 (branches) | Branch clusters collapsible |
| T21.2 (call graph) | Call clusters in force layout — future |
| T27.1 (Domains menu) | Domain toggle uses continuous layout if hierarchy/tree |
| T30.2 (`scopeModel`) | Cluster state is a *local* override, not a lens change |

---

### Risk & stop rule

| Risk | Mitigation |
|------|------------|
| Animation jank on 10k nodes | Only animate nodes within viewport + 1 screen; use `requestAnimationFrame` + `will-change: transform` |
| Layout thrash on rapid toggles | Debounce model rebuild (100 ms); batch cluster toggles |
| Force layout can't be continuous | Keep force discrete; only hierarchy/tree/lanes get transitions |

**Stop rule:** If continuous layout adds >50 ms to model→render pipeline, it's off by default behind a flag.


## 2. Capability gates

### T19 — directories (G19)

**T19.1 derive from touched files** — baseline, no snapshot: every file path implies its ancestors; `dir:` ids; `part-of` file→directory and directory→directory; label is the basename. **Done when** every session file has a directory parent in the hierarchy. **Verify:** Golden fixture — every session file has directory parent. `cd packages/session-ui && bun test src/graph`.

**T19.2 directory cards and actions** — folder glyph, `N files (M touched)`, session-touched badge, child list in the detail with per-file status and "Open at range". Equalizer presets: `directories-as-large`, `untouched-dimmer` (uses `provenance.source`). **Done when** the card reads with the same grammar as a file card. **Verify:** Visual check — directory card matches file card grammar, presets apply. `graph:capture --mode=compare`.

**T19.3 filesystem window** — new `filesystem` window kind (`graph-windows.tsx:9`), rooted at the `workspace` node, lazily loading `scope=directory`. Untouched files are workspace-domain, muted; touched files keep their session domain and are bright. Click selects in the main graph; double-click opens. **Done when** the window opens on a 20k-file repo without loading the tree eagerly. **Verify:** E2E — filesystem window opens 20k repo lazily, click selects in main graph. `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts`.

### T20 — history (G20)

**T20.1 real commits, not per-turn commits** — *rev 1 text withdrawn.* Commit nodes come from (a) `base`..`head`, (b) commits the session actually made (a successful `git commit`/`hg commit` tool call and the sha its output names), (c) `head` itself. A turn's change is its existing `diff` node plus `file.status`; no commit is invented. Edges: `touches` commit→file, derived transitively to directories at query time. ID: `commit:<full sha>`. **Done when** a session with no commits shows a base/head commit and no per-turn fiction. **Verify:** Golden fixture — no per-turn commits; real commits from base..head + session commits. `cd packages/session-ui && bun test src/graph`.

**T20.2 branches** — from `vcs.branch.list` and `head`; `branch:<ref>`; `points-at` branch→commit; the current branch and the base branch marked. Checkout is `vcs.checkout` (T31.1), disabled until the capability exists. **Done when** branches render and the action is capability-gated. **Verify:** Visual check — directory card matches file card grammar, presets apply. `graph:capture --mode=compare`.

**T20.3 tags** — **deferred** → D26.

### T21 — code (G21)

**T21.1 diff-hunk symbols first** — *rev 1's LSP mechanism withdrawn.* Parse the turn's `FileDiff.Info.patch` (`packages/schema/src/file-diff.ts`, cached per turn by `packages/app/src/session/timeline/turn-diffs.ts`) for hunk headers (`@@ … @@ <context>`); mint `symbol:<path>#<qualified>` with `data.kind`, `provenance.confidence = "inferred"`, `origin: "hunk"`, and the range the hunk names. Edge cases: anonymous/arrow functions → `symbol:<path>#<line>:<col>` with `kind: "function"`, `origin: "hunk:anon"`; class methods without class in context → nearest preceding `class`/`interface` in patch; deleted functions → `symbol` with `status: "deleted"`, `data.deleted = true`; no function name in hunk (property changes) → skip. No new dependency, no latency, works for every language git understands. **Done when** an edit to a named function in a fixture patch produces one symbol node; anonymous/deleted cases handled. **Verify:** Golden fixture — named function → symbol; anonymous/deleted/no-name handled. `cd packages/session-ui && bun test src/graph`.


**T21.2 parser upgrade and calls** — a grammar registry (`tree-sitter-typescript` first, opt-in per language, WASM packaged by the server). Symbols become `origin: "parser"`, gain signatures and definition ranges; `calls` edges only when the parser proves them. Missing grammar ⇒ hunk symbols only and `missing` names the language. **Done when** a TypeScript fixture yields definitions and one call edge; a Python file without a grammar degrades. **Verify:** Golden fixture — TS yields definitions + call edge; Python without grammar degrades. `cd packages/server && bun test src/graph`.

**T21.3 open at range; find references** — "Go to definition" becomes "Open at range" (the honest capability). "Find references" runs the existing `search` scoped to a symbol name and opens results in a window. Definition-level navigation is deferred → D27. **Done when** both actions work without an LSP. **Verify:** E2E — open at range, find references work. `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts`.

### T22 — packages (G22)

**T22.1 package nodes** — from `package.json` files in the snapshot; `pkg:<path>` (not `<name>`, which can repeat in a monorepo); label is the name; `part-of` directory→package and workspace→package; `data.scripts` feeds the "run script" action. **Done when** a monorepo fixture shows two packages with distinct ids and correct parents. **Verify:** Golden fixture — monorepo shows distinct pkg ids, correct parents. `cd packages/session-ui && bun test src/graph`.

**T22.2 config is a file role** — `tsconfig.json`, `eslint.config.*`, CI files: `file` kind with `data.config = true`, a config badge, and `references` from the governed directory. No `config` kind, no `governs` edge — the file already belongs to the directory. **Done when** config files are distinguishable and actions are file actions. **Verify:** Visual check — directory card matches file card grammar, presets apply. `graph:capture --mode=compare`.

**T22.3 dependencies are a list, not nodes** — *rev 1 nodes withdrawn* → D23. The package detail lists `dependencies`/`devDependencies` with version and outdated/vulnerable marks from the snapshot; no node per dependency. **Done when** the list renders and never scales with dependency count. **Verify:** Visual check — dependency list renders, no node per dep. `graph:capture --mode=compare`.

### T23 — runtime (G23)

**T23.1 processes from observed facts** — a running `SessionMessageShell` or a PTY the host knows; `proc:<toolID>` (or `proc:pty:<id>`), **not** `pid:`; `data.pid` for display. `produces` tool→process. Ports from a line-extractor registry (`Listening on :3000`, `:PORT`), each extractor naming its pattern and `inferred` confidence. **Done when** a fixture's `bun run dev` yields one process with one port; a PID reuse does not fork a node. **Verify:** Golden fixture — bun dev yields process+port; PID reuse no fork. `cd packages/session-ui && bun test src/graph`.

**T23.2 ports** — `port:<number>`, `listens-on` process→port, conflict badge when two processes claim one. **Done when** a conflict is visible on both cards. **Verify:** Visual check — port conflict badge on both cards. `graph:capture --mode=compare`.

**T23.3 containers** — **deferred** → D24.

### T24 — verification (G24)

**T24.1 test cases** — extractor registry per runner (vitest, jest, pytest, go test), each declaring its pattern and `inferred` confidence; `test:<path>#<suite> › <name>`; `part-of` test→file; status/duration on the card. **Done when** a fixture vitest output yields named tests with status. **Verify:** Golden fixture — vitest output → named tests with status. `cd packages/session-ui && bun test src/graph`.

**T24.2 runs** — `testrun:<toolID>`; `produces` tool→run; `executes` run→test; summary card with totals. **Done when** runs group their cases. **Verify:** Visual check — runs group cases, summary card shows totals. `graph:capture --mode=compare`.

**T24.3 coverage** — only when a coverage report exists (lcov/json in the snapshot or a tool output). `covers` test→symbol; `data.coverage` on symbols; preset `uncovered-larger`. **Done when** a repo without coverage has no `covers` edges. **Verify:** Golden fixture — no coverage = no covers edges; preset highlights uncovered. `cd packages/session-ui && bun test src/graph`.

**T24.4 re-run** — the agent-mediated `test.rerun` operation (T31.1): the card composes a prompt naming the test, the reader sends it, the transcript records it. **Done when** the action never spawns directly. **Verify:** E2E — open at range, find references work. `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts`.

### T25 — work (G25)

**T25.1 references first, API second** — extract `GH-123`, `#123`, `JIRA-789` from the goal, user messages, branch names and commit messages. Without a token, the node is `issue:<provider>:<repo>#<n>` with `state: "referenced"` and no title; with a token, the snapshot enriches title/state/labels. Edge `addresses` turn→issue. **Done when** a session that names a ticket shows the node with a URL and no network call when the token is absent. **Verify:** Golden fixture — ticket mentioned → node with URL, no network without token. `cd packages/session-ui && bun test src/graph`.

**T25.2 checklists** — issue checklists become `data.tasks` on the issue node, not separate nodes; a completed item links to the turn that closed it via `addresses`. **Done when** the detail renders checkboxes with turn links. **Verify:** Visual check — checklist checkboxes link to closing turns. `graph:capture --mode=compare`.

### T26 — docs (G26)

**T26.1 doc files are files** — `data.doc = true` by path policy (`*.md`, `docs/**`, `README*`); doc badge; `references` from markdown links to files and symbols. **Done when** a README's links produce reference edges. **Verify:** Golden fixture — README links → reference edges; ADR supersedes chain walkable. `cd packages/session-ui && bun test src/graph`.

**T26.2 ADRs are frontmatter** — `data.adr = { status, date, supersedes? }` parsed from `docs/adr/**`; `references` to the superseded ADR. No `adr` kind. **Done when** the supersedes chain is walkable. **Verify:** Golden fixture — README links → reference edges; ADR supersedes chain walkable. `cd packages/session-ui && bun test src/graph`.

**T26.3 comments** — **withdrawn** → D25.

### T27 — the lens control (G27)

**T27.1 the Domains menu** — **reshaped from rev 1's T27.2 (Layers menu).** "Show → Domains" lists the six domains in groups, with checkboxes; `session` is pinned at the top and cannot be turned off. Groups: **Structure** (directories, history), **Code** (code, verification), **Runtime** (runtime, work). Each checkbox shows an empty-state badge when its domain has no data ("no repo", "no parser", "no tests"). The engine is T30.1–T30.2. Turning a domain off scopes the model; it never rebuilds the session model. Selection persists per session beside the equalizer rules. **Done when** the menu edits the lens, badges reflect data presence, and the choice survives a reload. **Verify:** E2E — Domains menu toggles lens, badges show, choice survives reload. `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts`.
**T27.2 profiles** — a profile is a named lens, not a checkbox set. The product question picks the view:

| Profile | Domains | Default layout | Answers |
|---------|---------|----------------|---------|
| `session` (default) | session | lanes | what happened |
| `review` | session, history, directories | hierarchy | what changed and where it lives |
| `code` | session, code, directories | force | what this touches and what calls it |
| `verify` | session, verification, runtime | timeline | what ran, what passed, what listens |
| `work` | session, work, history | lanes | which ticket, branch, commit |

A profile applies its layout **once** when chosen; a later manual layout choice is the reader's and is not overridden. Editing a domain checkbox makes the profile `custom`. The menu is the escape hatch; the profile is the front door. **Done when** choosing a profile applies domains and layout once, and `custom` appears after a manual domain edit. **Verify:** E2E — profile applies domains+layout once, custom appears after edit. `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts`.

**T27.3 empty states and the as-of legend** — every domain without facts says why and offers the one primary action that would change it:

| Missing | Empty state shows | One-click action |
|---------|-------------------|------------------|
| no repo | "Not a git/hg repository" | `git init` (via `vcs.init` capability) |
| no parser | "No grammar for `.ts` — showing hunk symbols only" | "Install TypeScript grammar" → triggers server WASM fetch |
| no test output | "No tests run this session" | "Run tests" → agent prompt `vitest run` |
| no issue token | "GitHub token not configured" | "Add token" → opens settings |
| truncated snapshot | "Showing 500 of 12,000 files" | "Load full project" → `scope=workspace` |

The Domains menu checkboxes show these badges inline. The legend shows the snapshot's `asOf` and `missing`. `session` never has an empty state. **Done when** each domain's empty state names its cause and offers its primary action. **Verify:** Visual check — each empty state shows cause + primary action. `graph:capture --mode=compare`.


### T28 — navigation (G28)

**T28.1 one search** — the existing `search()` extends over derived labels, paths, shas, issue numbers and symbol names; results group by domain; `/` opens it. **Done when** one query returns mixed-domain results. **Verify:** Visual check — mixed-domain results, groups by domain. `graph:capture --mode=compare`.

**T28.2 one grammar** — `g` + a **2-letter mnemonic** jumps to the nearest node of that kind reachable from the selection (breadth-first, preferring containment over typed edges); when several are equally near, a picker lists them. `Alt+↑/↓` walks `part-of`; `Alt+←/→` walks `sequence`. Mnemonics: `g p` parent, `g d` directory, `g y` symbol, `g c` commit, `g t` test, `g i` issue, `g r` process, `g b` branch, `g f` file. The help overlay is generated from this table — single source of truth. **Done when** the overlay matches the table and all jumps work. **Verify:** Visual check — help overlay generated from kind/edge tables, all jumps work. `graph:capture --mode=compare`.

**T28.3 actions** → T31.2.

---

## 3. Cross-cutting

### 3.1 Node and edge vocabulary (the single source)

| Kind | Domain | `minLevel` | Lane | Depth | ID |
|------|--------|-----------|------|-------|----|
| `package` | directories | overview | artifacts | 1 | `pkg:<path>` |
| `directory` | directories | overview | artifacts | 2 | `dir:<path>` |
| `symbol` | code | execution | artifacts | 3 | `symbol:<path>#<qualified>` |
| `commit` | history | execution | artifacts | 3 | `commit:<sha>` |
| `branch` | history | execution | artifacts | 2 | `branch:<ref>` |
| `test` | verification | execution | verify | 3 | `test:<path>#<suite> › <name>` |
| `test-run` | verification | execution | verify | 2 | `testrun:<toolID>` |
| `process` | runtime | detail | verify | 3 | `proc:<toolID>` / `proc:pty:<id>` |
| `port` | runtime | detail | verify | 4 | `port:<number>` |
| `issue` | work | overview | prompt | 1 | `issue:<provider>:<repo>#<n>` |

| New edge | Source → Target | Confidence |
|----------|-----------------|------------|
| `calls` | symbol → symbol | explicit (parser) / inferred (hunk) |
| `covers` | test → symbol | inferred |
| `executes` | test-run → test | explicit |
| `touches` | commit → file | explicit |
| `points-at` | branch → commit | explicit |
| `addresses` | turn → issue | explicit |
| `listens-on` | process → port | inferred |

Reused: `part-of` for all containment (file→dir, dir→dir, dir→package, package→directories, symbol→file, test→file); `produces` for tool→process and tool→test-run; `references` for markdown links, process cwd, and ADR supersession. No `contains`, `defines`, `belongs-to`, `documents`, `started-by`, `runs-in` — each of those is the inverse of an edge that already exists.

### 3.2 The tables a new kind must touch

Adding a kind without all six is not a kind, it is a bug:

1. `NODE_KINDS` and `DOMAIN_OF_KIND` (`vocabulary.ts:16`)
2. `LEVELS.kindMinLevel` (`levels.ts:12`)
3. `DEPTH` and `laneOf` (`layout.ts:88`, `:159`)
4. `KIND_KEY` — i18n, exhaustive (`session-graph/src/ui/vocabulary.ts:93`)
5. `cardTemplate.ts` — glyph, accent, the one fact the label omits
6. `GraphDetail.tsx` — a body section and its actions

Two rules ride along. A derived label is **untrusted text** — a commit message, an issue title, a path from disk — so it goes through the card sanitizer like every other string (ADR-012, `docs/spacegraph/security.md`). And a new card's accessible name comes from the same `KIND_KEY` copy, while its actions are reachable from the detail and from the keyboard; the map's a11y module already owns the roving tabindex.

### 3.3 Budgets

| Operation | Budget | Why |
|-----------|--------|-----|
| Snapshot, session scope, 20k-file repo | ≤ 200 ms p95, ≤ 2 MB | session scope is ~touched files only; 20k repo → ~500 files |
| Model build, 10k nodes + snapshot | ≤ 60 ms | 10k nodes + snapshot is mostly array maps; profile in CI |
| `scopeModel`, 10k nodes | ≤ 2 ms | one filter pass; 10k nodes = 0.5 ms in V8 |
| Layout, unchanged | today's numbers | no new geometry |
| Force layout | **disabled by default**; on demand only | 9 s at 20k is unacceptable; only when reader chooses "Force" |

Add CI guard: `graph:scale --fail-if-slower` with thresholds.


Card budget becomes a **weight per domain**, not a share that must sum to 100: `byProximity(model, positions, centre, weights?)` gains an optional fourth argument that multiplies distance by `1/weight`, and `buildRenderModel` caps cards per non-session domain (≤ 8 at execution). Session keeps the majority by construction, not by arithmetic.

### 3.4 Degradation matrix

| Source absent | Map shows |
|---------------|-----------|
| snapshot | session model exactly; derived domains hidden with a reason |
| repo | history domain empty ("not a repository"); base/head/branches gone |
| parser grammar | hunk symbols only, `missing` names the language |
| test output | verification domain from `result` exit status only; no test nodes |
| coverage report | no `covers` edges; coverage marks absent, not zero |
| issue token | reference nodes with `state: "referenced"`, no title |
| tree (truncated) | touched-scope directories only; filesystem window says "partial" |

### 3.5 Level semantics

Levels do not vary by domain. `kindMinLevel` is the single table: packages, directories and issues at overview; commits, branches, symbols, tests and runs at execution; processes and ports at detail. The domain filter runs *before* the level filter, so turning a domain off is cheaper than lowering the level.

### 3.6 Integration seams (new files)

| Seam | Location | Purpose |
|------|----------|---------|
| `server.graph.workspace` endpoint | `packages/server/src/handlers/graph.ts` (new) | Single snapshot fetch |
| `buildGraph({ snapshot, diffByTurn })` | `packages/session-ui/src/graph/build.ts` | Pure model over snapshot |
| `scopeModel(model, lens)` | `packages/session-ui/src/graph/scope.ts` (new) | Lens filter without rebuild |
| `actionsFor(node, model)` | `packages/session-ui/src/graph/actions.ts` (new) | Closed action registry |
| `symbolsFromHunk(patch)` | `packages/session-ui/src/graph/symbols.ts` (new) | Pure hunk→symbol extractor |
| `symbolsFromTreeSitter(grammar, source)` | `packages/server/src/graph/symbols.ts` (new) | Server-side parser (WASM) |
| `vcs.checkout` capability | `packages/protocol/src/groups/vcs.ts` + provider | Safe branch switching |
| `graph.workspace` capability announce | Snapshot `capabilities: string[]` | UI hides dead actions |

---

## 4. Verification matrix


| Check | Command |
|-------|---------|
| **Core model** — build, scope, degrade, golden fixtures | `cd packages/session-ui && bun test src/graph` |
| **Protocol** — schema round-trip, client gen | `cd packages/protocol && bun test` && `cd packages/client && bun run generate` |
| **Server** — snapshot endpoint, symbol index | `cd packages/server && bun test src/graph` |
| **Host UI** — lens, actions, search, grammar | `cd packages/session-graph && bun run typecheck && bun test` |
| **User flows** — profile switch, commit→file, symbol→caller, issue→branch | `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts` |
| **Whole fork** — lint, types, build | `bun run check` (repository root) |
| **Visual regression** — capture vs committed frames | `bun run graph:capture --mode=verify` |
| **Performance** — budgets guarded in CI | `bun run graph:scale` |

---

## 5. Deferred and future seams


| ID | Item | Unblock | Seam |
|----|------|---------|------|
| D16–D22 | carried from rev 1 (multi-session, cursors, time travel, AI summaries, plugin kinds, prompt export, 3D) | unchanged | unchanged |
| D23 | External dependency *nodes* | a packaging lens proves nodes beat the package detail list | `data.dependencies` |
| D24 | Container nodes | a `docker ps`/devcontainer source exists and is observed | runtime extractor registry |
| D25 | Comment nodes | a reader task proves TODO/FIXME nodes beat search | symbol ranges |
| D26 | Tag nodes | release landmarks are a real navigation need | `points-at` |
| D27 | True go-to-definition (LSP plugin) | an LSP provider exists server-side and is worth the latency | `symbol.range`, `ActionSpec` |
| D28 | Cross-session control plane | TODO.3 D4 | `workspace` root, stable ids |

---

## 6. Decisions, risks, stop rules

### 6.1 Decisions added by rev 2

| # | Decision | Reason |
|---|----------|--------|
| 33 | **One snapshot input; no I/O in model build** | purity is the reason the model is testable and the renderer is swappable |
| 34 | **Domains are a filter (`scopeModel`), not an axis in every signature** | one pure function instead of eight threaded parameters |
| 35 | **Containment is `part-of`** | hierarchy/tree layouts and `parentIndex` already work; no second structural edge |
| 36 | **The file node is the join key, not the tool** | tools are events, files are stable and already normalized |
| 37 | **A turn is not a commit** | turn changes are working-tree diff; commits only exist when made |
| 38 | **Symbols degrade: hunk → parser → (never) LSP in the model** | no latency in the build, no grammar packaging in the client |
| 39 | **Run actions are agent-mediated or capability-gated** | preserves permissions, attribution and the transcript (ADR-023) |
| 40 | **Profiles, not eight checkboxes** | the reader picks a question; the escape hatch stays |
| 41 | **No new layout strategy** | five layouts are already unranked; derived nodes ride the existing grammar |
| 42 | **Snapshots are revision-bound and per-source stamped** | a derived fact the reader cannot date is a lie |
| 43 | **A display list replaces dependency nodes** | node count must not scale with `node_modules` |
| 44 | **Every kind touches six tables** | the type system already enforces five of them; make the sixth explicit |
| 45 | **Cluster state is local lens override, not model mutation** | `scopeModel` already filters; per-node `expanded` overrides `minLevel` without rebuilding session model |
| 46 | **Continuous layout only for hierarchy/tree (opt-in)** | lanes/timeline are grid-based; force is physics-based; transitions would thrash |
| 47 | **Card tier interpolation is continuous, not level-gated** | `detailTier(width)` drives cross-fade; no pop at level boundaries |

### 6.2 Risks

| Risk | Likelihood | Mitigation | Fallback |
|------|------------|------------|----------|
| Snapshot request latency on big repos | Medium | session-scope paths, memoised read model, debounced refetch | session-only lens still works |
| Parser grammars are a packaging burden | High | hunk symbols ship first and independently | `missing` names the language |
| Derived nodes clutter the session view | High | domains default off; profiles; per-domain card cap | `session` profile is byte-identical |
| Git model mismatch (hg, detached HEAD, worktrees) | Medium | provider-neutral fields; `base` may be null; no invented commits | history domain empty with a reason |
| Action misuse | Medium | closed registry, confirmation, agent mediation | copy-command only |
| Snapshot and session disagree (file changed outside) | High | `asOf` on every derived node, visible in the inspector | refresh control |
| Derived text is untrusted (commit messages, issue titles, paths) | Medium | one sanitizer, already the card contract | strip to plain text |
| Protocol churn | Medium | one additive group; generated client; version field | feature-flag off |
| Path normalization (case, symlinks, Windows) | Medium | one root + one normalizer, already in `normalizePath` | unmatched path stays session-only |
| Continuous layout jank on 10k nodes | Medium | viewport-only animation; `will-change: transform`; RAF batching | hierarchy/tree transitions off by default |
| Layout thrash on rapid cluster toggles | Medium | debounce model rebuild (100 ms); batch toggles | single toggle per frame |
| Force layout can't be continuous | High | physics is discrete; only hierarchy/tree get transitions | force stays discrete |
| Card tier cross-fade pop at boundaries | Low | `detailTier` hysteresis + opacity transition (120 ms) | snap to tier |

### 6.3 Stop rules

1. No I/O in model build. A fact that needs I/O enters through the snapshot.
2. No new kind without all six tables in §3.2.
3. No derived node without `provenance.source`; no derived edge without a confidence.
4. No `run` action outside the registry, without confirmation, or without attribution.
5. No edge kind that no selector, layout or action consumes.
6. No domain without a profile, an empty state, and a degradation row.
7. If the session-only model changes in any way, the work is wrong — stop and diff the golden.
8. If continuous layout adds >50 ms to model→render pipeline, it's off by default behind a flag.

### 6.4 Architectural questions to resolve before implementation

| # | Question | Proposed resolution |
|---|----------|---------------------|
| 1 | **Where does `diffByTurn` come from for the turn-map overlay?** | `buildGraph` accepts optional `diffByTurn: Map<turnID, FileDiffInfo[]>`. Turn-map passes only its turn; full graph passes all loaded turns from the timeline's `turnDiffCache`. |
| 2 | **How does the server know which turns are "loaded" for `diffByTurn`?** | The panel collects `turnDiffCache.get({ sessionID, from: turn.id })` for each turn in the model and passes the map — no new RPC needed. |

---

## 7. Log

**2026-10-22 — TODO.5 created.** Seven domains added as layers over the session model, joined by tool nodes. Control-plane vision stated.

**2026-10-23 — TODO.5 rev 2: re-architected.** Rev 1 was unbuildable: it added domains the model had no input for, made "layer" a duplicate of kind/level, joined on tool nodes instead of files, asserted per-turn commits that git does not have, and gave cards direct shell access. Rev 2 replaces the eight layers with four axes (domain, level, layout, action), adds one input (`WorkspaceSnapshot`) behind one seam (`server.graph.workspace`), makes the model pure over it, filters with one `scopeModel`, and routes every side effect through a closed action registry — agent-mediated where the transcript must record it. Capability IDs T19–T28 and G19–G28 are preserved; T29–T32 and G29–G32 are the foundation; withdrawn work is deferred as D23–D28. Unverified: parser packaging cost, snapshot latency on very large monorepos, and the hunk-symbol hit rate across languages — T32 measures all three.

**2026-10-23 — TODO.5 rev 2.1: design review applied.** Removed `workspace` domain (directories/packages are roots); added `directories` domain and grouped Domains menu (Structure/Code/Runtime); expanded action registry with blame, compare, cherry-pick, PR, debug, proxy, branch creation; documented hunk-symbol edge cases (anonymous, deleted, no-name); added three snapshot scopes (session/directory/workspace); made empty states actionable with primary actions; tightened budgets (200ms/60ms/2ms); disabled force layout by default; added integration seams table; documented two architectural questions on `diffByTurn` sourcing.

**2026-10-23 — TODO.5 rev 2.2: adaptive expand/collapse + continuous layout (T33/G33).** Added wave 6 for adaptive UI. Cluster state as local lens override (per-node `expanded` overriding `minLevel`). Continuous transitions for hierarchy/tree layouts (opt-in, 150–300 ms, cubic-bezier). Card tier interpolation on zoom (cross-fade, no level-boundary pop). Budget-aware animation (target-position budget eval, fade in/out). Stop rule: >50 ms pipeline overhead = off by default.

**2026-10-23 — T29.1 and T29.2 done (foundation wave 0, first half).** The snapshot schema is one versioned, per-source-stamped struct in Protocol. The server read model is one location-scoped endpoint assembled from `FileSystem`, `Vcs` and package manifests; absence is a `missing` row. Two plan gaps surfaced and are recorded on T29.2: the client must supply session paths, and the VCS surface cannot supply commit ids. Memoisation and event invalidation remain open.

**2026-10-23 — T29.3, T30.1 and T30.2 done (model foundation).** `buildGraph` is one object input; all call sites and tests moved. A snapshot adds directory nodes (`dir:` + `part-of`) and a `workspaceRoot`/`snapshot` summary to the model, while the session-only model is pinned by `model.golden.json`. Domains and `scopeModel` now exist: session is enforced, edges never dangle, and the lens is a pure filter. `diffByTurn` is deliberately deferred to T21.1. Next: T31 actions and T32 evidence before the capability tasks in wave 1.
**2026-10-23 — T29.4 done (snapshot refresh).** The host now fetches the workspace snapshot outside the model build, debounced via an in-memory cache keyed by scope. The snapshot cache lives in the tab's state (like `turnDiffCache`), loads session-scoped snapshots on demand, and passes them to `buildGraph`. The model stays pure; derived nodes appear without moving session nodes. The `snapshot` field in `GraphModel` carries `revision`, `asOf`, and `missing` for the inspector and legend. Next: T31 actions and T32 evidence.
**2026-10-23 — T30.3 done (provenance surface).** Every derived node now carries `provenance: { source, asOf?, confidence }` (directory nodes from the filesystem source). The card template shows a provenance badge on the far tier (e.g., "filesystem, 2m"). The inspector displays a "Source" field with "from <source>, <age>". The legend lists active sources with their ages and missing sources with their reasons. Next: T31 actions and T32 evidence before the capability tasks in wave 1.
