# SPACEGRAPH.TODO.5 — the map as a control plane

**Status:** successor to `SPACEGRAPH.TODO.4.md` (the map as a workspace, 2026-10-22). `SPACEGRAPH.md` remains the design argument; `docs/spacegraph/prototype.md` remains the release write-up. **This file is the plan for what the map becomes once it is a *control plane* rather than a workspace**: the reader not only sees the system but *operates* it — git, symbols, runtime, tests, issues, docs — all as nodes in one graph, linked by the session's own activity.

**Conventions:** carried tasks keep their IDs (`T11`–`T18`); new work gets `T19`–`T28` and gates `G19`–`G28`. Never renumber or reuse an ID; superseded work gets a new ID. Every task has a `Done when` and a `Verify` command. Cite TODO.4 for the evidence; do not copy it.

---

## 0. Where we are (2026-10-22)

### 0.1 The graph today

| Layer | Node kinds | What it shows |
|-------|------------|---------------|
| **Session** (TODO.4) | `session`, `turn`, `phase`, `message`, `reasoning`, `tool`, `file`, `subagent`, `result`, `error`, `retry`, `compaction`, `notice`, `diff` | What happened in this session |
| **Git** (implicit) | — | `fork` lineage on session node only |
| **Symbols** | — | Not represented |
| **Project** | — | File paths only, no directory/package nodes |
| **Runtime** | — | Shell output only, no process/port nodes |
| **Tests** | — | Test output in `result` nodes only |
| **Issues** | — | Goal text on session node only |
| **Docs** | — | Not represented |

The session layer is **complete** (TODO.4 gates G9–G18 ✓). The other six layers are **absent** — the map shows *what happened*, not *what exists* or *what runs*.

### 0.2 The opportunity

The session is the **spine**. Every other domain connects to it:

```
turn:edit:token.ts  ──produces──→  file:token.ts
     │                              │
     │                              ├──contains──→  directory:src/auth
     │                              │
     └──at position 42:10──→  function:parseToken  ──calls──→  function:validateToken
                                                     │
                    commit:abc123  ──touches──→  file:token.ts  ──tests──→  test-case:refreshes token
                                                     │
                                           issue:GH-123  ──tracked-by──→  turn:edit:token.ts
```

The session's `tool` nodes are the **universal join key**: they carry `path`, `position`, `command`, `output` — the coordinates that reach into every other domain.

### 0.3 Design principles for the control plane

1. **Layers, not a flat list.** Each domain is a lens (session, git, symbols, project, runtime, tests, issues, docs). The reader toggles layers; the layout composes them.
2. **Derived, not stored.** Git commits, symbols, directories, processes — all computed from the session + workspace state on model build. No new persistence.
3. **Cross-layer edges are first-class.** The magic is `tool → symbol`, `commit → file`, `test → function`. These edges make the map navigable across domains.
4. **The session stays the dependable baseline.** TODO.4 invariants hold: no causality from adjacency, stable IDs, opt-in, reverts cleanly.
5. **Control = observation + action.** A node that represents a thing the reader can *act on* (checkout a branch, run a test, restart a process) gets a contextual action in its detail.

### 0.4 The gates

| Gate | Means | Tasks |
|------|-------|-------|
| **G19 — Directories** | directory nodes exist, nest under session, show in hierarchy layout | T19 |
| **G20 — Git commits & branches** | commit nodes per turn, branch nodes, checkout action | T20 |
| **G21 — Symbols (LSP)** | function/class nodes from LSP, call edges, go-to-definition | T21 |
| **G22 — Packages & config** | package.json → package nodes, config nodes, dependency graph | T22 |
| **G23 — Runtime processes** | process/port nodes from shell output, restart action | T23 |
| **G24 — Test cases** | test-case nodes from test output, coverage edges, run action | T24 |
| **G25 — Issues** | issue nodes from GH/GitLab, tracked-by edges, link action | T25 |
| **G26 — Docs & ADRs** | doc-file nodes, describes/references edges, open action | T26 |
| **G27 — Layer toggles** | toolbar controls which layers are visible, layout composes them | T27 |
| **G28 — Cross-layer navigation** | keyboard + mouse flows across layers, unified search | T28 |

They are **sequential in value, parallel in implementation**: G19 (directories) is the foundation; G20–G26 can be built independently; G27–G28 integrate them.

---

## 1. T19 — Directory nodes: the project's skeleton

**Why first.** Every file node has a path → every file implies a directory. Directories are the *implicit parent* of files. Making them explicit gives the hierarchy layout its natural structure and the filesystem window its tree.

### T19.1 Derive directory nodes from file paths — **planned**

- Walk all `file` nodes, collect unique directory paths (`src/auth`, `src/auth/tokens`, `tests`)
- Create `directory` node per path: `id = "dir:" + path`, `label = basename(path)`, `data = { path, childCount }`
- `part-of` edges: file → directory, directory → parent directory (recursive to root)
- `minLevel = "overview"` — directories are structural, visible at all levels

**Done when:** every file has a directory parent; hierarchy layout shows dirs as lanes; directory cards show child count and session-touched indicator.

**Verify:** `packages/session-ui/src/graph/layout.test.ts` — directory nodes placed correctly; `packages/session-graph/component-tests/graph-refine.spec.ts` — directory cards render.

### T19.2 Directory cards: identity + summary + actions — **planned**

- Card shows: folder icon, name, `N files (M touched in session)`, session-touched badge
- Detail (popover/window): list child files with status, "Open in editor" action per file
- Equalizer rule preset: "directories as large" (scale 1.5), "untouched dirs dimmer" (fadeAfter)

**Done when:** directory card matches file card vocabulary; actions work; presets apply.

**Verify:** component test — directory card renders, shows touched count, preset changes size.

### T19.3 Filesystem window: project tree as a graph — **planned**

- New window kind `filesystem` (T12 manager, T14.3 pattern)
- Root = project directory; shows full directory tree (not just session-touched)
- Nodes: `directory` (from T19.1) + `file` (session + untouched from workspace scan)
- Edges: `contains` (directory → file/dir), `touched-in-session` (session → file, derived)
- Session-touched files highlighted; untouched files muted
- Click file → selects in main graph; double-click → opens in editor

**Done when:** filesystem window opens, shows full project tree, highlights session files, navigates to main graph.

**Verify:** component test — window opens, tree renders, click navigates; e2e — untouched files visible but muted.

---

## 2. T20 — Git layer: commits, branches, history

**Why.** The session already has `fork` lineage and turn sequence. Git commits are the *physical* counterpart to *logical* turns. Branches are the *persistence* of forks.

### T20.1 Commit nodes per editing turn — **planned**

- For each turn with `writes`/`produces` edges → create `commit` node
- `id = "commit:" + shortSHA` (run `git log --oneline -1 --format=%h -- <files>` per turn)
- `label = "commit " + shortSHA`, `summary = commit message`, `data = { sha, author, time, fileCount }`
- Edges: `produced-by` → turn, `touches` → file, `parent-of` → previous commit (git history)
- `minLevel = "execution"` — commits are turn-grained

**Done when:** each editing turn has a commit node; commit cards show message, files, author; git history walks via `parent-of`.

**Verify:** unit test — commit nodes created for fixture turns; component test — commit card shows SHA and message.

### T20.2 Branch nodes — **planned**

- Run `git branch -a --format="%(refname:short) %(objectname:short) %(upstream:short)"`
- Create `branch` node per local/remote branch: `id = "branch:" + name`, `label = name`, `data = { sha, upstream, isRemote }`
- Edges: `points-to` → commit, `tracks` → remote branch (if any)
- Current branch highlighted; session's fork branch marked
- Action: "Checkout" (runs `git checkout <branch>` via shell tool)

**Done when:** branches visible, current branch highlighted, checkout action works.

**Verify:** component test — branch nodes render; e2e — checkout opens shell with command.

### T20.3 Tag nodes (optional) — **planned**

- `git tag -l --format="%(refname:short) %(objectname:short)"` → `tag` nodes
- `points-to` → commit; label = tag name; `minLevel = "overview"`
- Useful for release landmarks in long sessions

**Done when:** tags appear at overview level.

**Verify:** unit test — tag nodes created from git output.

---

## 3. T21 — Symbol layer: code as a graph (LSP)

**Why.** The session edits *symbols* (functions, classes), not just files. LSP turns positions into semantic nodes. This is the "map the code" use case.

### T21.1 LSP integration: resolve symbols at tool positions — **planned**

- New `SymbolResolver` service in `@opencode/session-ui/graph` (pure, no DOM)
- Input: `tool` node with `data.input.path` + `data.input.position` (line/char from LSP)
- Calls LSP `textDocument/definition` → returns symbol location + kind
- Creates `symbol` node: `id = "symbol:" + file + ":" + name`, `kind = "function" | "class" | "interface" | "type"`, `label = name`, `data = { file, range, signature }`
- Edges: `defined-in` → file, `edited-by` → tool, `calls` → symbol (from LSP `callHierarchy/outgoingCalls`)

**Done when:** tool nodes at editable positions spawn symbol nodes; symbol cards show signature, file:line, callers.

**Verify:** unit test — SymbolResolver returns symbol for fixture tool; component test — symbol card renders.

### T21.2 Call graph edges — **planned**

- LSP `callHierarchy/outgoingCalls` + `incomingCalls` → `calls` / `called-by` edges between symbols
- `call-graph` layout strategy (force-directed) shows call topology
- Level: `overview` = classes, `execution` = functions, `detail` = calls

**Done when:** call graph renders in force layout; level filters calls.

**Verify:** component test — call edges exist; layout test — force layout places callers near callees.

### T21.3 Go-to-definition action — **planned**

- Symbol detail (popover/window): "Go to definition" → opens file at range in editor
- "Find references" → opens search results in graph (new search mode)

**Done when:** actions navigate to editor; search mode shows references.

**Verify:** e2e — symbol detail action opens file.

---

## 4. T22 — Package & config layer: workspace topology

**Why.** Monorepos have package boundaries, shared config, dependency graphs. The session crosses them; the map should show them.

### T22.1 Package nodes from package.json — **planned**

- Walk workspace for `package.json` files → create `package` nodes
- `id = "pkg:" + name`, `label = name`, `data = { path, version, private, scripts }`
- Edges: `contains` → directory, `depends-on` → package (from `dependencies`/`devDependencies`)
- `minLevel = "overview"` — packages are structural

**Done when:** packages visible in hierarchy layout; dependency edges show in force layout.

**Verify:** unit test — package nodes created from fixture workspace.

### T22.2 Config nodes — **planned**

- `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `docker-compose.yml`, etc.
- `kind = "config"`, `label = filename`, `data = { path, type }`
- Edges: `governs` → directory, `extends` → config (from `extends` field)

**Done when:** config nodes appear, `extends` edges visible.

**Verify:** unit test — config nodes parsed from fixture.

### T22.3 Dependency nodes (external) — **planned**

- From `package.json` dependencies → `dependency` nodes
- `id = "dep:" + name`, `label = name@version`, `data = { version, registry }`
- Edges: `required-by` → package
- Highlight: outdated, vulnerable (from `npm audit` / `pnpm audit`)

**Done when:** dependency graph visible; outdated/vulnerable badges on cards.

**Verify:** component test — dependency cards show version badges.

---

## 5. T23 — Runtime layer: processes, ports, containers

**Why.** Shell tools start servers, databases, proxies. The session *runs* things; the map should show what's running.

### T23.1 Process nodes from shell output — **planned**

- Parse `shell` tool output for patterns: `Listening on :3000`, `PID 12345`, `server started`
- Create `process` node: `id = "proc:" + pid`, `label = command`, `data = { pid, command, ports, cwd, startTime }`
- Edges: `started-by` → tool, `listens-on` → port, `runs-in` → directory
- `minLevel = "detail"` — processes are runtime detail

**Done when:** shell commands that start servers create process nodes; cards show PID, ports, uptime.

**Verify:** unit test — parser extracts PID/port from fixture shell output.

### T23.2 Port nodes — **planned**

- From process `ports` → `port` nodes: `id = "port:" + number`, `label = ":" + number`
- Edges: `bound-by` → process, `proxies-to` → service (if known)
- Conflict detection: multiple processes on same port → warning badge

**Done when:** port nodes show binding process; conflicts highlighted.

**Verify:** component test — port conflict shows warning.

### T23.3 Container nodes (Docker/DevContainer) — **planned**

- Detect `.devcontainer/` or `docker-compose.yml` → `container` nodes
- `docker ps --format="..."` → running containers
- Edges: `runs` → process, `mounts` → directory, `exposes` → port

**Done when:** container hierarchy visible; mounted directories shown.

**Verify:** unit test — container nodes from docker output.

---

## 6. T24 — Test layer: cases, runs, coverage

**Why.** Tests are the verification layer. Test output is already in `result` nodes; structure it.

### T24.1 Test-case nodes from test output — **planned**

- Parse `tool:execute` output for test runners (vitest, jest, pytest, go test)
- Create `test-case` node per test: `id = "test:" + file + ":" + name`, `label = name`, `data = { file, suite, duration, status }`
- Edges: `belongs-to` → test-file, `covers` → symbol (from coverage), `executed-by` → tool
- `minLevel = "execution"` — tests are turn-grained

**Done when:** test cases visible; status badges (pass/fail/skip); duration on card.

**Verify:** unit test — parser extracts test cases from fixture vitest output.

### T24.2 Test-run nodes — **planned**

- Each `tool:execute` running tests → `test-run` node
- `id = "testrun:" + toolID`, `label = "vitest #42"`, `data = { runner, total, passed, failed, duration }`
- Edges: `executes` → test-case, `triggered-by` → tool

**Done when:** test runs group their cases; summary card shows totals.

**Verify:** component test — test-run card shows pass/fail counts.

### T24.3 Coverage edges — **planned**

- Parse coverage output (lcov, json) → `covers` edges: test-case → symbol/function
- Coverage heatmap: symbol nodes get `coverage` data (percent, covered lines)
- Equalizer preset: "uncovered symbols larger" (scale by 1/coverage)

**Done when:** symbols show coverage; preset highlights uncovered code.

**Verify:** component test — coverage edges exist; equalizer preset applies.

### T24.4 Re-run action — **planned**

- Test-case/detail: "Re-run" → spawns shell tool with `vitest run <test-name>`
- Test-run/detail: "Re-run failed" → `vitest run --reporter=verbose`

**Done when:** actions spawn correct shell commands.

**Verify:** e2e — re-run action creates new tool node.

---

## 7. T25 — Issue layer: GH/GitLab/Jira integration

**Why.** Sessions often address tickets. Linking them closes the loop: issue → session → code → test.

### T25.1 Issue nodes from references — **planned**

- Extract issue refs from: session goal, user messages, commit messages, branch names (`GH-123`, `#456`, `JIRA-789`)
- Fetch via API (GH/GitLab/Jira) → create `issue` node
- `id = "issue:" + source + ":" + number`, `label = "GH-123: Fix OAuth refresh"`, `data = { url, title, state, assignee, labels }`
- Edges: `tracked-by` → turn (session), `references` → file (from commit), `blocked-by` → issue

**Done when:** issues mentioned in session appear as nodes; detail shows title, state, link.

**Verify:** unit test — issue extraction from fixture messages; component test — issue card renders.

### T25.2 Task/sub-task nodes — **planned**

- From issue checklists, PR description tasks → `task` nodes
- `id = "task:" + issue + ":" + index`, `label = text`, `data = { checked, assignee }`
- Edges: `part-of` → issue, `completed-by` → turn

**Done when:** task checklist visible in issue detail; completion links to turn.

**Verify:** component test — task list renders with checkboxes.

---

## 8. T26 — Docs & ADR layer: knowledge as nodes

**Why.** Documentation, ADRs, inline comments — they explain *why*. The map should surface them.

### T26.1 Doc-file nodes — **planned**

- Detect `*.md`, `*.adoc`, `docs/**`, `ARCHITECTURE.md`, `README.md`
- `kind = "doc-file"`, `label = path`, `data = { path, headings }`
- Edges: `describes` → package/directory (from heading analysis), `references` → symbol (from code fences)

**Done when:** doc files appear in filesystem window; heading links navigate.

**Verify:** unit test — doc-file nodes created from fixture workspace.

### T26.2 ADR nodes — **planned**

- Detect `adr/**`, `docs/adr/**`, `*.adr.md` with YAML frontmatter
- `kind = "adr"`, `label = title`, `data = { status, date, supersedes, tags }`
- Edges: `decides` → pattern/package, `supersedes` → adr

**Done when:** ADR graph visible; supersedes chain walkable.

**Verify:** unit test — ADR nodes parsed from fixture.

### T26.3 Comment nodes (inline) — **planned**

- LSP `textDocument/documentHighlight` or parse `// TODO`, `// FIXME`, `/// doc`
- `kind = "comment"`, `label = text`, `data = { file, line, type: "todo"|"fixme"|"doc" }`
- Edges: `annotates` → symbol/function

**Done when:** TODO/FIXME comments appear as nodes on symbols.

**Verify:** unit test — comment nodes extracted from fixture source.

---

## 9. T27 — Layer toggles: the reader chooses their view

**Why.** Eight layers is too much at once. The toolbar must let the reader compose their map.

### T27.1 Layer vocabulary — **planned**

```typescript
// session-ui/src/graph/vocabulary.ts
export const GRAPH_LAYERS = [
  "session",      // always on (baseline)
  "directories",  // T19
  "git",          // T20
  "symbols",      // T21
  "packages",     // T22
  "runtime",      // T23
  "tests",        // T24
  "issues",       // T25
  "docs",         // T26
] as const

export type GraphLayer = (typeof GRAPH_LAYERS)[number]
```

**Done when:** layer types defined; session layer always on.

**Verify:** typecheck passes.

### T27.2 Toolbar: Layers menu — **planned**

- **Show** menu → **Layers** submenu (checkbox per layer, session disabled)
- Persisted per session in graph state (`layers: GraphLayer[]`)
- Default: `["session", "directories", "git"]` — the structural trilogy

**Done when:** Layers menu toggles visibility; state persists.

**Verify:** component test — menu toggles layers; persistence test — reload restores selection.

### T27.3 Layout composes visible layers — **planned**

- `layoutGraph(model, { layers })` filters nodes by `layerOf(node)` ∈ `layers`
- Layout strategies receive filtered model; cross-layer edges preserved if both ends visible
- `hierarchy` layout: directories as lanes, packages as super-lanes
- `force` layout: all visible nodes, cross-layer edges as springs

**Done when:** toggling layers re-lays-out; cross-layer edges work.

**Verify:** layout test — hierarchy with directories+packages; force with symbols+calls.

---

## 10. T28 — Cross-layer navigation: one map, one search, one keyboard

**Why.** The control plane fails if layers are silos. Navigation must flow across them.

### T28.1 Unified search across layers — **planned**

- Search input queries: node labels (all layers), file paths, symbol names, issue numbers, commit SHAs
- Results grouped by layer; "Jump to" selects node in graph
- Keyboard: `/` opens search, `↑/↓` navigates results, `Enter` selects

**Done when:** search finds nodes in all visible layers; selection works.

**Verify:** component test — search returns mixed-layer results; e2e — keyboard flow works.

### T28.2 Cross-layer keyboard shortcuts — **planned**

| Key | Action |
|-----|--------|
| `g d` | Go to directory of selected file |
| `g s` | Go to symbol at cursor (from tool position) |
| `g c` | Go to commit that touched selected file |
| `g t` | Go to test covering selected symbol |
| `g i` | Go to issue tracking selected turn |
| `g r` | Go to runtime process on selected port |
| `Alt+↑/↓` | Traverse `part-of` / `contains` hierarchy |
| `Alt+←/→` | Traverse `sequence` / `calls` edges |

**Done when:** shortcuts navigate across layers; help overlay shows them.

**Verify:** component test — shortcut handlers fire; e2e — cross-layer jumps work.

### T28.3 Contextual actions per node kind — **planned**

| Kind | Actions (in detail popover/window) |
|------|-----------------------------------|
| `directory` | Open in editor, Reveal in filesystem, New file here |
| `file` | Open in editor, Show history, Run tests, Show callers |
| `commit` | Checkout, Cherry-pick, View diff, Open in GitHub |
| `branch` | Checkout, Merge, Delete, Push |
| `symbol` | Go to definition, Find references, Rename (LSP) |
| `package` | Open package.json, Install, Run script |
| `process` | Restart, Kill, View logs, Open port in browser |
| `port` | Open in browser, Kill process, Proxy |
| `test-case` | Re-run, Debug, Open file |
| `issue` | Open in browser, Create branch, Add comment |
| `adr` | Open in editor, Create new ADR |

**Done when:** each kind's detail shows relevant actions; actions execute correctly.

**Verify:** component test — action buttons present; e2e — actions spawn correct commands.

---

## 11. Cross-cutting concerns

### 11.1 Node identity stability

| Kind | ID strategy | Stability |
|------|-------------|-----------|
| `directory` | `dir:` + normalized path | Stable (path-based) |
| `commit` | `commit:` + short SHA | Stable (git object) |
| `branch` | `branch:` + name | Stable (ref name) |
| `symbol` | `symbol:` + file + `:` + name + `:` + line | Semi-stable (line shifts) — use LSP `definition` URI |
| `package` | `pkg:` + name | Stable (package name) |
| `process` | `proc:` + PID | Ephemeral (PID reuse) — include start time |
| `test-case` | `test:` + file + `:` + name | Stable (test name) |
| `issue` | `issue:` + source + `:` + number | Stable (external ID) |

**Rule:** IDs must be stable across model rebuilds. Ephemeral kinds (process) get `data.ephemeral = true`; layout excludes them from position stability guarantees.

### 11.2 Card budget across layers

- Each layer gets a **budget share** (configurable in equalizer)
- Default: session 50%, directories 20%, git 10%, symbols 10%, others 10%
- Proximity budget (T17.5) applies *within* each layer's share
- Equalizer preset: "focus on code" → symbols 50%, session 30%

### 11.3 Level semantics per layer

| Layer | overview | execution | detail |
|-------|----------|-----------|--------|
| session | session, turns | phases, tools | reasoning, diffs |
| directories | top-level dirs | subdirs | all dirs |
| git | tags, current branch | commits per turn | all commits, remote branches |
| symbols | classes, interfaces | functions | calls, references |
| packages | top-level packages | sub-packages | all packages, deps |
| runtime | — | running processes | all processes, ports |
| tests | test files | test suites | test cases, coverage |
| issues | open issues | issues in session | all issues, tasks |
| docs | README, ARCHITECTURE | ADRs | all docs, comments |

### 11.4 Performance budgets

| Operation | Budget |
|-----------|--------|
| Model build (all layers) | < 200ms for 10k nodes |
| LSP symbol resolve (per tool) | < 50ms (cached) |
| Git log parse | < 100ms |
| Test output parse | < 50ms |
| Layout (force, 5k nodes) | < 500ms |

---

## 12. Verification matrix

| Check | Command | Owns |
|-------|---------|------|
| Session model (baseline) | `cd packages/session-ui && bun test src/graph` | ids, turns, levels, layout, tiers |
| Directory nodes | `cd packages/session-ui && bun test src/graph/directory.test.ts` | T19 |
| Git layer | `cd packages/session-ui && bun test src/graph/git.test.ts` | T20 |
| Symbol layer | `cd packages/session-ui && bun test src/graph/symbol.test.ts` | T21 |
| Package layer | `cd packages/session-ui && bun test src/graph/package.test.ts` | T22 |
| Runtime layer | `cd packages/session-ui && bun test src/graph/runtime.test.ts` | T23 |
| Test layer | `cd packages/session-ui && bun test src/graph/test.test.ts` | T24 |
| Issue layer | `cd packages/session-ui && bun test src/graph/issue.test.ts` | T25 |
| Docs layer | `cd packages/session-ui && bun test src/graph/docs.test.ts` | T26 |
| Layer toggles | `cd packages/session-graph && bun test src/ui/layers.test.ts` | T27 |
| Cross-layer nav | `cd packages/session-graph && bun run test:components` — layer tests | T28 |
| Full integration | `cd packages/app && bunx playwright test e2e/graph/control-plane.spec.ts` | All |
| Whole fork | `bun run check` from repository root | lint and types |
| Visual record | `bun run graph:capture --mode=verify` | committed frames |

---

## 13. Deferred and future seams

| ID | Item | Unblock condition | Seam already present |
|----|------|-------------------|---------------------|
| D16 | Multi-session graph (cross-session edges) | TODO.3 D4 | session lineage, fork edges |
| D17 | Collaborative cursors (other readers' selections) | Real-time sync | selection protocol |
| D18 | Time-travel slider (session history as animation) | Streaming model | model versions |
| D19 | AI-generated summaries per layer | LLM integration | node summaries |
| D20 | Custom node kinds via plugin | Plugin API | window kinds registry |
| D21 | Export subgraph as context for prompt | SDK | `serializeRenderModel` |
| D22 | 3D layout for call graphs (force-3d) | WebGL renderer depth | `orbit` projection |

---

## 14. Decisions, risks, stop rules

### 14.1 Decisions this plan makes

| # | Decision | Reason |
|---|----------|--------|
| 22 | **Layers, not a flat list** — each domain is a lens with its own vocabulary | eight domains × 3 levels × 5 layouts = too many combinations; layers compose |
| 23 | **Derived, not stored** — git, symbols, runtime computed on model build | no migration, no sync, no persistence complexity |
| 24 | **Session tools are the join key** — `tool` nodes carry path/position/command/output | already exist, already link to transcript, already have data |
| 25 | **Cross-layer edges are explicit** — `edited-by`, `covers`, `touches`, `tracked-by` | makes navigation predictable; layout can use them as springs |
| 26 | **Directory nodes from file paths** — zero new data source | every file implies a directory; hierarchy layout already wants parents |
| 27 | **LSP for symbols** — not regex/parsing | only LSP knows true definitions/references across languages |
| 28 | **Shell output parsing for runtime** — no agent/daemon required | works today; `tool:execute` output already has PID/port |
| 29 | **Test parsing per runner** — not a universal format | vitest/jest/pytest/go test have different output; parse what we use |
| 30 | **Issue extraction from text + API** — not webhook | session is local; API fetch on demand; no server needed |
| 31 | **Layer toggles in Show menu** — not a new toolbar axis | follows T14 organization; layers are "what it says" not "how drawn" |
| 32 | **Ephemeral kinds excluded from position stability** — process/port nodes | PID reuse breaks stability; layout treats them as transient |

### 14.2 Risks

| Risk | Likelihood | Mitigation | Fallback |
|------|------------|------------|----------|
| LSP integration adds latency to model build | Medium | cache symbol resolutions per file+position; async, non-blocking | symbols layer off by default |
| Git log parse on large repos | Low | limit to session-touched files; background worker | git layer off by default |
| Too many nodes → layout slow | Medium | budget per layer; level culling; force layout only on demand | hierarchy/timeline as default |
| Cross-layer edges create visual clutter | Medium | edge filtering per layer; "focus mode" hides cross-layer | show only same-layer edges |
| Symbol IDs shift on edit | Medium | LSP definition URI stable; fallback to name+file | re-resolve on model rebuild |
| External API (GH/GitLab) fails | Medium | graceful degradation: show local refs only, no detail | issue layer shows extracted refs only |
| Layer toggles confuse readers | Low | sensible defaults (3 layers on); progressive disclosure | hide Layers menu until >3 layers |

### 14.3 Stop rules

1. Do not add a layer without a **pure selector** in `@opencode/session-ui/graph` that builds its nodes from session + workspace.
2. Do not add a node kind without a **card template** (identity + summary + actions).
3. Do not add a layer without a **budget share** in the equalizer.
4. Do not add cross-layer edges without a **layout strategy** that uses them.
5. If model build exceeds 200ms, the slowest layer becomes opt-in (off by default).
6. No layer depends on a running server (LSP runs in-process; git is CLI; test output is in session).

---

## 15. Log

Append-only. One entry per pass: date, task IDs, commands run, results, surprises, unverified items.

**2026-10-22 — TODO.5 created.** The session layer is complete (TODO.4). This plan adds seven domains (directories, git, symbols, packages, runtime, tests, issues, docs) as layers, linked by cross-layer edges from the session's tool nodes. The control plane vision: one map where the reader sees the system, navigates it, and operates it.