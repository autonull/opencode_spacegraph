# SPACEGRAPH.TODO.5 — the map as a control plane (rev 2)

**Status:** rev 2, 2026-10-23. Supersedes the *architecture* of rev 1 while preserving its task and gate IDs. `SPACEGRAPH.md` is the design argument; `docs/spacegraph/prototype.md` the release write-up. Rev 2 keeps rev 1's thesis — the reader does not just see the system, they operate it — and replaces the implementation model that could not carry it.

**Conventions:** carried tasks keep their IDs (`T19`–`T28`, `G19`–`G28`). New work is `T29`–`T32`, `G29`–`G32`; new deferrals are `D23`+. Never renumber or reuse an ID. A task whose *capability* survives but whose *mechanism* was wrong stays in its slot and says so; a task whose capability is withdrawn gets a new deferral ID. Every task has a `Done when` and a `Verify` command.

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
 workspace ◄─part-of─ package ◄─part-of─ directory ◄─part-of─ file ◄─writes─ tool ◄─part-of─ turn ◄─part-of─ session
                                                             │                                   │
                                                             ├─part-of─ symbol ─calls─ symbol     └─addresses─ issue
                                                             ├─part-of─ test ─covers─ symbol
                                                             └─touches─ commit ◄─points-at─ branch

 process ◄─produces─ tool          process ─listens-on─ port          file ─references─ process
```

(`A ◄─edge─ B` means `edge` points from B to A. All containment edges are child → parent.)

The session root says *what happened*; the workspace root says *what exists*. `file` is where they meet, and that is why the file node — not the tool — is the join key. Containment is `part-of`, so the hierarchy and tree layouts work with zero new geometry and the existing `parentIndex`/`childIndex` selectors work unchanged (`lookup.ts:37`, `:60`).

### 0.4 Gates and waves

| Wave | Gates | Outcome | Depends on |
|------|-------|---------|------------|
| **0 — foundation** | **G29** snapshot, **G30** domains, **G31** actions, **G32** evidence | the seam, the truth, the safety, the proof | — |
| **1 — the system on screen** | **G27** lens, **G19** directories | the reader composes a view and sees the project's skeleton | G29, G30 |
| **2 — the working tree** | **G20** history, **G22** packages, **G24** verification | what changed, where it lives, what proves it | G29 |
| **3 — what runs and what it means** | **G23** runtime, **G21** code | what is listening, what calls what | G29, G30 |
| **4 — the work** | **G25** issues, **G26** docs | why it is being done, where it is written down | G29 |
| **5 — navigation** | **G28** cross-domain navigation | one map, one search, one grammar | all |

Ordering is by *dependency*, not by value: G29 and G30 are prerequisites for every derived kind, and G31 is a prerequisite for every action. Build them before the domains, or each domain invents its own.

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

#### T29.1 Protocol schema — **new**

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
}
```

**Done when:** the schema round-trips in a protocol test; every field a task below needs is present; no field requires a second request to interpret. `Source` and `SymbolKind` are small closed literals; `Range` is `{ start: { line, character }, end: { line, character } }`. Tests are **not** in the snapshot: test output is a session fact and enters through messages (T24).

**Verify:** `cd packages/protocol && bun test src/graph`; `cd packages/client && bun run generate`.

#### T29.2 Server read model — **new**

One group, `server.graph`, one endpoint, `graph.workspace`, assembled from services that already exist:

- `FileSystem.Service` — tree, status, package.json reads (`packages/server/src/handlers/fs.ts` pattern)
- `Vcs.Service` — `info`, `base`, `branches`, `status`, `diff` (`packages/server/src/handlers/vcs.ts`)
- `Project.Service` — project root and name
- host-known processes (PTYs) only; tests stay in the session model, because test output is a tool result

Scopes are bounded: `scope=session` takes the session's touched paths and their ancestors; `scope=directory` takes one directory. Ignore rules come from the existing filesystem search. The read model is memoised per `(location, revision, scope)` and invalidated by the existing filesystem/VCS events. **No new persistence.**

**Done when:** one request returns a session-scoped snapshot for a fixture repo; a missing source appears in `missing` with a reason instead of failing the request.

**Verify:** `cd packages/server && bun test src/graph`; `bun run typecheck`.

#### T29.3 The model takes the snapshot — **new**

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

**Verify:** `cd packages/session-ui && bun test src/graph`; `cd packages/session-graph && bun test src/canvas/buildRenderModel.test.ts`.

#### T29.4 Refresh and staleness — **new**

The host fetches the snapshot outside the model build, debounced (~250 ms), and never during a layout. A refetch rebuilds the model; positions for session nodes never move, and derived nodes place relative to their anchor (the `previous` map already in `layoutGraph`). The model exposes `snapshot: { revision, asOf, missing }` so the inspector and the legend can say how old a fact is and what is absent.

**Done when:** editing a file outside the session refreshes the derived facts without moving a session node; a failed source shows as absent, not as an empty graph.

**Verify:** component test — refetch keeps session positions; manual: `bun run dev:live`.

---

### T30 — domains, provenance, scoping (G30)

#### T30.1 Domain vocabulary — **reshaped from T27.1**

One table, one field, no new axis at the layout boundary:

```ts
export const DOMAINS = ["session", "workspace", "history", "code", "verification", "runtime", "work"] as const
export type Domain = (typeof DOMAINS)[number]

export const DOMAIN_OF_KIND: Record<NodeKind, Domain> = { /* exhaustive */ }

export function nodeDomain(node: GraphNode): Domain   // node.domain ?? DOMAIN_OF_KIND[node.kind]
```

`GraphNode` gains optional `domain` (used only for snapshot-only files, which are workspace rather than session) and optional `provenance: { source: Source; asOf?: number; confidence: Confidence }`. Edges already carry confidence; derived edges get their provenance from the source.

**Done when:** every kind has a domain; `DOMAIN_OF_KIND` is exhaustive by type; no component branches on a kind to decide a domain.

**Verify:** `cd packages/session-ui && bun test src/graph/domains.test.ts`.

#### T30.2 `scopeModel` — **reshaped from T27.3**

The lens is a **pure filter over the model**, so levels, layout, summary, budget and selectors need no signature changes:

```ts
scopeModel(model: GraphModel, lens: ReadonlySet<Domain>): GraphModel
```

It drops nodes outside the lens, drops edges whose endpoints are not both present, preserves `part-of` order, and keeps `turns`, `activeTurn`, `goal`, `root`, `workspaceRoot` and `snapshot`. Session is always in the lens; the function enforces it rather than trusting the caller. A dropped directory costs a file its parent, which the existing layout already tolerates (`layout.ts:120` falls back to the file's owner turn).

**Done when:** every existing graph function returns the same result on a session-only lens as on today's model; cross-domain edges never dangle.

**Verify:** `cd packages/session-ui && bun test src/graph`; `bun test src/graph/scope.test.ts`.

#### T30.3 Provenance in the surface — **new**

Every derived node and edge says where it came from and when: a source glyph on the card's far tier, a "from `<source>`, `<age>`" line in the inspector, and one legend entry per source. `missing` rows appear as absences with their reason, never as an empty domain. The model already carries `confidence`; the existing `CONFIDENCE_KEY` copy distinguishes explicit from inferred, so a hunk symbol never reads like a parsed one.

**Done when:** no derived node renders without a source; the inspector says how old each derived fact is.

**Verify:** component test — provenance line for one node per domain; visual check against `graph:capture`.

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

**Verify:** `cd packages/session-ui && bun test src/graph/actions.test.ts`; `cd packages/session-graph && bun run test:components`.

#### T31.2 Action registry per kind — **moved from T28.3**

| Kind | Actions |
|------|---------|
| `workspace` | Reveal, Open terminal here |
| `directory` | Reveal, Open in editor, New file here |
| `file` | Open at range, Show history, Show callers, Run tests (agent), Copy path |
| `package` | Open `package.json`, Run script (agent), Show dependencies |
| `commit` | View diff, Copy sha, Open on host |
| `branch` | Checkout (confirmed), Copy name |
| `symbol` | Open at range, Find references (search), Ask agent to rename |
| `test` | Re-run (agent), Open file |
| `test-run` | Re-run failed (agent), Copy summary |
| `process` | View logs, Restart (agent), Stop (confirmed, agent) |
| `port` | Open in browser, Copy URL |
| `issue` | Open in browser, Ask agent to start work, Copy reference |
| `session`/`turn`/`tool`/`diff` | today's actions, unchanged |

**Done when:** the table is the only place actions are named; each kind's detail matches it.

**Verify:** component test — action set per kind; e2e — one `navigate`, one `reveal`, one agent-mediated run.

#### T31.3 Capability announcements — **new**

The snapshot and the server advertise what they can do (`vcs.checkout`, `issues.api`, `symbols.parser`). The toolbar and the detail hide actions the host cannot honour; a missing capability says why. This replaces rev 1's silent "graceful degradation" with a visible one.

**Done when:** an older server or a non-git project shows no dead actions.

**Verify:** component test with a reduced-capability fixture.

---

### T32 — evidence (G32)

#### T32.1 Golden snapshot fixture — **new**

One fixture repo + one canonical session, committed as JSON, exercised by every domain test. The session fixture already exists (`fixture.ts`); the snapshot fixture is new. Determinism: no timestamps in assertions, no absolute paths.

**Done when:** one command rebuilds the fixture; tests fail on an unintended model change.

**Verify:** `cd packages/session-ui && bun test src/graph`.

#### T32.2 The degradation matrix — **new**

Every source has a test for its absence: no repo, no grammar, no test output, no API token, truncated snapshot. The domain's empty state is part of the test, not an afterthought.

**Done when:** the matrix in §3.4 is a test table, and each row passes.

**Verify:** `cd packages/session-ui && bun test src/graph/degrade.test.ts`.

#### T32.3 Budgets — **new**

Measured, not asserted: snapshot build, model build with snapshot, `scopeModel`, render-model build. The scale bench grows a snapshot variant.

**Done when:** §3.3 numbers are printed by `graph:scale` and guarded in CI.

**Verify:** `bun run graph:scale`; `cd packages/session-ui && bun test src/graph/performance.test.ts`.

---

## 2. Capability gates

### T19 — directories (G19)

**T19.1 derive from touched files** — baseline, no snapshot: every file path implies its ancestors; `dir:` ids; `part-of` file→directory and directory→directory; label is the basename. **Done when** every session file has a directory parent in the hierarchy. **Verify:** `bun test src/graph/directory.test.ts`.

**T19.2 directory cards and actions** — folder glyph, `N files (M touched)`, session-touched badge, child list in the detail with per-file status and "Open at range". Equalizer presets: `directories-as-large`, `untouched-dimmer` (uses `provenance.source`). **Done when** the card reads with the same grammar as a file card. **Verify:** component test.

**T19.3 filesystem window** — new `filesystem` window kind (`graph-windows.tsx:9`), rooted at the `workspace` node, lazily loading `scope=directory`. Untouched files are workspace-domain, muted; touched files keep their session domain and are bright. Click selects in the main graph; double-click opens. **Done when** the window opens on a 20k-file repo without loading the tree eagerly. **Verify:** component test + e2e.

### T20 — history (G20)

**T20.1 real commits, not per-turn commits** — *rev 1 text withdrawn.* Commit nodes come from (a) `base`..`head`, (b) commits the session actually made (a successful `git commit`/`hg commit` tool call and the sha its output names), (c) `head` itself. A turn's change is its existing `diff` node plus `file.status`; no commit is invented. Edges: `touches` commit→file, derived transitively to directories at query time. ID: `commit:<full sha>`. **Done when** a session with no commits shows a base/head commit and no per-turn fiction. **Verify:** `bun test src/graph/history.test.ts`.

**T20.2 branches** — from `vcs.branch.list` and `head`; `branch:<ref>`; `points-at` branch→commit; the current branch and the base branch marked. Checkout is `vcs.checkout` (T31.1), disabled until the capability exists. **Done when** branches render and the action is capability-gated. **Verify:** component test.

**T20.3 tags** — **deferred** → D26.

### T21 — code (G21)

**T21.1 diff-hunk symbols first** — *rev 1's LSP mechanism withdrawn.* Parse the turn's `FileDiff.Info.patch` (`packages/schema/src/file-diff.ts`, cached per turn by `packages/app/src/session/timeline/turn-diffs.ts`) for hunk headers (`@@ … @@ <context>`); mint `symbol:<path>#<qualified>` with `data.kind`, `provenance.confidence = "inferred"`, `origin: "hunk"`, and the range the hunk names. No new dependency, no latency, works for every language git understands. **Done when** an edit to a named function in a fixture patch produces one symbol node. **Verify:** `bun test src/graph/code.test.ts`.

**T21.2 parser upgrade and calls** — a grammar registry (`tree-sitter-typescript` first, opt-in per language, WASM packaged by the server). Symbols become `origin: "parser"`, gain signatures and definition ranges; `calls` edges only when the parser proves them. Missing grammar ⇒ hunk symbols only and `missing` names the language. **Done when** a TypeScript fixture yields definitions and one call edge; a Python file without a grammar degrades. **Verify:** `cd packages/server && bun test src/graph/symbols.test.ts`.

**T21.3 open at range; find references** — "Go to definition" becomes "Open at range" (the honest capability). "Find references" runs the existing `search` scoped to a symbol name and opens results in a window. Definition-level navigation is deferred → D27. **Done when** both actions work without an LSP. **Verify:** `cd packages/app && bunx playwright test e2e/graph/control-plane.spec.ts`.

### T22 — packages (G22)

**T22.1 package nodes** — from `package.json` files in the snapshot; `pkg:<path>` (not `<name>`, which can repeat in a monorepo); label is the name; `part-of` directory→package and workspace→package; `data.scripts` feeds the "run script" action. **Done when** a monorepo fixture shows two packages with distinct ids and correct parents. **Verify:** `bun test src/graph/packages.test.ts`.

**T22.2 config is a file role** — `tsconfig.json`, `eslint.config.*`, CI files: `file` kind with `data.config = true`, a config badge, and `references` from the governed directory. No `config` kind, no `governs` edge — the file already belongs to the directory. **Done when** config files are distinguishable and actions are file actions. **Verify:** component test.

**T22.3 dependencies are a list, not nodes** — *rev 1 nodes withdrawn* → D23. The package detail lists `dependencies`/`devDependencies` with version and outdated/vulnerable marks from the snapshot; no node per dependency. **Done when** the list renders and never scales with dependency count. **Verify:** component test.

### T23 — runtime (G23)

**T23.1 processes from observed facts** — a running `SessionMessageShell` or a PTY the host knows; `proc:<toolID>` (or `proc:pty:<id>`), **not** `pid:`; `data.pid` for display. `produces` tool→process. Ports from a line-extractor registry (`Listening on :3000`, `:PORT`), each extractor naming its pattern and `inferred` confidence. **Done when** a fixture's `bun run dev` yields one process with one port; a PID reuse does not fork a node. **Verify:** `bun test src/graph/runtime.test.ts`.

**T23.2 ports** — `port:<number>`, `listens-on` process→port, conflict badge when two processes claim one. **Done when** a conflict is visible on both cards. **Verify:** component test.

**T23.3 containers** — **deferred** → D24.

### T24 — verification (G24)

**T24.1 test cases** — extractor registry per runner (vitest, jest, pytest, go test), each declaring its pattern and `inferred` confidence; `test:<path>#<suite> › <name>`; `part-of` test→file; status/duration on the card. **Done when** a fixture vitest output yields named tests with status. **Verify:** `bun test src/graph/verification.test.ts`.

**T24.2 runs** — `testrun:<toolID>`; `produces` tool→run; `executes` run→test; summary card with totals. **Done when** runs group their cases. **Verify:** component test.

**T24.3 coverage** — only when a coverage report exists (lcov/json in the snapshot or a tool output). `covers` test→symbol; `data.coverage` on symbols; preset `uncovered-larger`. **Done when** a repo without coverage has no `covers` edges. **Verify:** `bun test src/graph/coverage.test.ts`.

**T24.4 re-run** — the agent-mediated `test.rerun` operation (T31.1): the card composes a prompt naming the test, the reader sends it, the transcript records it. **Done when** the action never spawns directly. **Verify:** `cd packages/app && bunx playwright test e2e/graph/control-plane.spec.ts`.

### T25 — work (G25)

**T25.1 references first, API second** — extract `GH-123`, `#123`, `JIRA-789` from the goal, user messages, branch names and commit messages. Without a token, the node is `issue:<provider>:<repo>#<n>` with `state: "referenced"` and no title; with a token, the snapshot enriches title/state/labels. Edge `addresses` turn→issue. **Done when** a session that names a ticket shows the node with a URL and no network call when the token is absent. **Verify:** `bun test src/graph/work.test.ts`.

**T25.2 checklists** — issue checklists become `data.tasks` on the issue node, not separate nodes; a completed item links to the turn that closed it via `addresses`. **Done when** the detail renders checkboxes with turn links. **Verify:** component test.

### T26 — docs (G26)

**T26.1 doc files are files** — `data.doc = true` by path policy (`*.md`, `docs/**`, `README*`); doc badge; `references` from markdown links to files and symbols. **Done when** a README's links produce reference edges. **Verify:** `bun test src/graph/docs.test.ts`.

**T26.2 ADRs are frontmatter** — `data.adr = { status, date, supersedes? }` parsed from `docs/adr/**`; `references` to the superseded ADR. No `adr` kind. **Done when** the supersedes chain is walkable. **Verify:** `bun test src/graph/docs.test.ts`.

**T26.3 comments** — **withdrawn** → D25.

### T27 — the lens control (G27)

**T27.1 the Domains menu** — **reshaped from rev 1's T27.2 (Layers menu).** "Show → Domains" lists the seven domains with checkboxes; `session` is pinned and cannot be turned off. The engine is T30.1–T30.2. Turning a domain off scopes the model; it never rebuilds the session model. Selection persists per session beside the equalizer rules. **Done when** the menu edits the lens and the choice survives a reload. **Verify:** component test — toggle and persistence.

**T27.2 profiles** — a profile is a named lens, not a checkbox set. The product question picks the view:

| Profile | Domains | Default layout | Answers |
|---------|---------|----------------|---------|
| `session` (default) | session | lanes | what happened |
| `review` | session, workspace, history | hierarchy | what changed and where it lives |
| `code` | session, code, workspace | force | what this touches and what calls it |
| `verify` | session, verification, runtime | timeline | what ran, what passed, what listens |
| `work` | session, work, history | lanes | which ticket, branch, commit |

A profile applies its layout **once** when chosen; a later manual layout choice is the reader's and is not overridden. Editing a domain checkbox makes the profile `custom`. The menu is the escape hatch; the profile is the front door. **Done when** choosing a profile applies domains and layout once, and `custom` appears after a manual domain edit. **Verify:** component test.

**T27.3 empty states and the as-of legend** — every domain without facts says why (no repo, no parser, no test output, truncated snapshot) and offers the one action that would change it (refresh, open the folder, add a token). The legend shows the snapshot's `asOf` and `missing`. `session` never has an empty state. **Done when** each domain's empty state names its cause. **Verify:** `cd packages/session-graph && bun run typecheck && bun run test:components`.

### T28 — navigation (G28)

**T28.1 one search** — the existing `search()` extends over derived labels, paths, shas, issue numbers and symbol names; results group by domain; `/` opens it. **Done when** one query returns mixed-domain results. **Verify:** component test.

**T28.2 one grammar** — rev 1's table (`g d`, `g s`, …) becomes a rule: `g` + a **target kind** letter jumps to the nearest node of that kind reachable from the selection, breadth-first and preferring containment over typed edges; when several are equally near, a picker lists them. `Alt+↑/↓` walks `part-of`; `Alt+←/→` walks `sequence`. Letters: `p` parent, `d` directory, `s` symbol, `c` commit, `t` test, `i` issue, `r` process, `b` branch. **Done when** the help overlay is generated from the kind/edge tables, not hand-written. **Verify:** component test.

**T28.3 actions** → T31.2.

---

## 3. Cross-cutting

### 3.1 Node and edge vocabulary (the single source)

| Kind | Domain | `minLevel` | Lane | Depth | ID |
|------|--------|-----------|------|-------|----|
| `workspace` | workspace | overview | artifacts | 0 | `workspace` |
| `package` | workspace | overview | artifacts | 1 | `pkg:<path>` |
| `directory` | workspace | overview | artifacts | 2 | `dir:<path>` |
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

Reused: `part-of` for all containment (file→dir, dir→dir, dir→package, package→workspace, symbol→file, test→file); `produces` for tool→process and tool→test-run; `references` for markdown links, process cwd, and ADR supersession. No `contains`, `defines`, `belongs-to`, `documents`, `started-by`, `runs-in` — each of those is the inverse of an edge that already exists.

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
| Snapshot, session scope, 20k-file repo | ≤ 400 ms p95, ≤ 2 MB | one request, bounded by touched paths |
| Model build, 10k nodes + snapshot | ≤ 100 ms | arrays, no I/O |
| `scopeModel`, 10k nodes | ≤ 5 ms | one pass |
| Layout, unchanged | today's numbers | no new geometry |
| Force layout | on demand only | existing 60-turn window |

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

Levels do not vary by domain. `kindMinLevel` is the single table: `workspace`, packages, directories and issues at overview; commits, branches, symbols, tests and runs at execution; processes and ports at detail. The domain filter runs *before* the level filter, so turning a domain off is cheaper than lowering the level.

---

## 4. Verification matrix

| Check | Command |
|-------|---------|
| Domain vocabulary, scope, degrade, directories, history, code, packages, verification, work, docs | `cd packages/session-ui && bun test src/graph` |
| Snapshot schema | `cd packages/protocol && bun test src/graph` |
| Snapshot read model, symbol index | `cd packages/server && bun test src/graph` |
| Client generation (after any protocol change) | `cd packages/client && bun run generate` |
| Lens, actions, search, grammar | `cd packages/session-graph && bun run typecheck && bun test src && bun run test:components` |
| Control-plane e2e | `cd packages/app && bunx playwright test e2e/graph/control-plane.spec.ts` |
| Whole fork | `bun run check` (repository root) |
| Visual record | `bun run graph:capture --mode=verify` |
| Performance | `bun run graph:scale` |

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

### 6.3 Stop rules

1. No I/O in model build. A fact that needs I/O enters through the snapshot.
2. No new kind without all six tables in §3.2.
3. No derived node without `provenance.source`; no derived edge without a confidence.
4. No `run` action outside the registry, without confirmation, or without attribution.
5. No edge kind that no selector, layout or action consumes.
6. No domain without a profile, an empty state, and a degradation row.
7. If the session-only model changes in any way, the work is wrong — stop and diff the golden.

---

## 7. Log

**2026-10-22 — TODO.5 created.** Seven domains added as layers over the session model, joined by tool nodes. Control-plane vision stated.

**2026-10-23 — TODO.5 rev 2: re-architected.** Rev 1 was unbuildable: it added domains the model had no input for, made "layer" a duplicate of kind/level, joined on tool nodes instead of files, asserted per-turn commits that git does not have, and gave cards direct shell access. Rev 2 replaces the eight layers with four axes (domain, level, layout, action), adds one input (`WorkspaceSnapshot`) behind one seam (`server.graph.workspace`), makes the model pure over it, filters with one `scopeModel`, and routes every side effect through a closed action registry — agent-mediated where the transcript must record it. Capability IDs T19–T28 and G19–G28 are preserved; T29–T32 and G29–G32 are the foundation; withdrawn work is deferred as D23–D28. Unverified: parser packaging cost, snapshot latency on very large monorepos, and the hunk-symbol hit rate across languages — T32 measures all three.
