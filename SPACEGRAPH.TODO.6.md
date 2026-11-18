# SPACEGRAPH.TODO.6 — the map as a control plane (rev 3)

**Status:** rev 3, 2026-10-23. Consolidates TODO.5 rev 2.2 with completed work removed and priorities adjusted. Preserves all original task/gate IDs (`T19`–`T33`, `G19`–`G33`, `D23`–`D28`). Never renumber or reuse an ID.

**Testing philosophy:** unchanged from TODO.5 §0 (integration over unit, golden fixtures, visual regression, property-based for pure functions, contract tests at boundaries, E2E for user flows, manual for UX feel).

---

## Completed (Foundation Wave 0 + partial capability gates)

| Task | Status | Notes |
|------|--------|-------|
| T29.1–T29.4 | ✅ Done | WorkspaceSnapshot schema, server endpoint, `buildGraph({snapshot})`, debounced refresh |
| T30.1–T30.3 | ✅ Done | Domains vocabulary, `scopeModel`, provenance surface |
| T31.1–T31.3 | ✅ Done | Action descriptors, closed registry per kind, capability filtering |
| T32.1 | ✅ Done | Golden fixture with all 8 derived kinds |
| T27.1 | ✅ Done | Domains menu in toolbar (Structure/Code/Runtime groups) |
| T19.1–T19.3 | ✅ Done | Directory nodes, cards, filesystem window component |
| T20.1–T20.2 | ✅ Done | Commit/branch nodes from snapshot, checkout action |
| T21.1 | ✅ Done | Diff-hunk symbols from turn diffs |
| T22.1–T22.3 | ✅ Done | Package nodes, config/doc file roles, dependencies as list |

---

## Remaining Work by Priority

### Priority 1: Runtime & Verification (Waves 2–3)
These have existing scaffolding in the snapshot/model and are the next highest-value features.

#### T23 — Runtime (G23)
| Subtask | Description | Verify |
|---------|-------------|--------|
| **T23.1** | Processes from observed facts: PTY/shell tools → `proc:<toolID>` nodes with `produces` tool→process. Port extractor registry (`Listening on :PORT`, `:PORT`) with `inferred` confidence. | Golden fixture: `bun run dev` yields process+port; PID reuse no fork |
| **T23.2** | Ports: `port:<number>`, `listens-on` process→port, conflict badge when two processes claim one port. | Visual: conflict badge on both cards |
| T23.3 | Containers → **deferred to D24** | — |

#### T24 — Verification (G24)
| Subtask | Description | Verify |
|---------|-------------|--------|
| **T24.1** | Test cases: extractor registry per runner (vitest, jest, pytest, go test). `test:<path>#<suite> › <name>`, `part-of` test→file, status/duration on card. | Golden fixture: vitest output → named tests with status |
| **T24.2** | Test runs: `testrun:<toolID>`, `produces` tool→run, `executes` run→test, summary card with totals. | Visual: runs group cases, summary card shows totals |
| **T24.3** | Coverage: only when report exists (lcov/json). `covers` test→symbol, `data.coverage` on symbols, preset `uncovered-larger`. | Golden fixture: no coverage = no covers edges; preset highlights uncovered |
| **T24.4** | Re-run: agent-mediated `test.rerun` operation (already in actions.ts). | E2E: action composes prompt, never spawns directly |

---

### Priority 2: Work & Docs (Waves 4)

#### T25 — Work (G25)
| Subtask | Description | Verify |
|---------|-------------|--------|
| **T25.1** | Issue references: extract `GH-123`, `#123`, `JIRA-789` from goal, user messages, branch names, commit messages. Without token: `issue:<provider>:<repo>#<n>` with `state: "referenced"`, no title. With token: snapshot enriches. Edge `addresses` turn→issue. | Golden fixture: ticket mentioned → node with URL, no network without token |
| **T25.2** | Checklists: `data.tasks` on issue node (not separate nodes), completed item links to closing turn via `addresses`. | Visual: checkboxes with turn links |

#### T26 — Docs (G26)
| Subtask | Description | Verify |
|---------|-------------|--------|
| **T26.1** | Doc files: `data.doc = true` by path policy (`*.md`, `docs/**`, `README*`). Doc badge in inspector. `references` from markdown links to files/symbols. | Golden fixture: README links → reference edges |
| **T26.2** | ADRs: `data.adr = { status, date, supersedes? }` parsed from `docs/adr/**`. `references` to superseded ADR. No `adr` kind. | Golden fixture: ADR supersedes chain walkable |
| T26.3 | Comments → **deferred to D25** | — |

---

### Priority 3: Navigation & Profiles (Waves 1, 5)

#### T27 — Lens Control (G27)
| Subtask | Description | Verify |
|---------|-------------|--------|
| **T27.2** | Profiles: named lens + default layout. `session` (lanes), `review` (session,history,directories,hierarchy), `code` (session,code,directories,force), `verify` (session,verification,runtime,timeline), `work` (session,work,history,lanes). Profile applies once; manual edit → `custom`. | E2E: profile applies domains+layout once, `custom` appears after edit |
| **T27.3** | Empty states & as-of legend: per-domain empty state with cause + primary action. Domains menu checkboxes show badges. Legend shows `asOf` and `missing`. | Visual: each empty state shows cause + action; legend shows ages |

#### T28 — Navigation (G28)
| Subtask | Description | Verify |
|---------|-------------|--------|
| **T28.1** | One search: extends over derived labels, paths, shas, issue numbers, symbol names. Results grouped by domain. `/` opens. | Visual: mixed-domain results, groups by domain |
| **T28.2** | One grammar: `g` + 2-letter mnemonic jumps to nearest node of kind (BFS, prefer containment). `Alt+↑/↓` walks `part-of`, `Alt+←/→` walks `sequence`. Mnemonics: `gp` parent, `gd` directory, `gy` symbol, `gc` commit, `gt` test, `gi` issue, `gr` process, `gb` branch, `gf` file. Help overlay generated from table. | Visual: help overlay matches table, all jumps work |

---

### Priority 4: Code Intelligence Upgrade (Wave 3)

#### T21 — Code (G21) — remaining
| Subtask | Description | Verify |
|---------|-------------|--------|
| **T21.2** | Parser upgrade: tree-sitter grammar registry (TypeScript first, WASM on server). Symbols gain `origin: "parser"`, signatures, definition ranges. `calls` edges only when parser proves them. Missing grammar ⇒ hunk symbols only, `missing` names language. | Golden fixture: TS yields definitions + call edge; Python without grammar degrades |
| **T21.3** | Open at range; find references: "Go to definition" → "Open at range". "Find references" runs existing `search` scoped to symbol name. Definition-level nav → **deferred to D27**. | E2E: open at range, find references work without LSP |

---

### Priority 5: Evidence & Performance (Cross-cutting)

#### T32 — Evidence (G32)
| Subtask | Description | Verify |
|---------|-------------|--------|
| **T32.2** | Degradation matrix as test table: every source has absence test (no repo, no grammar, no test output, no API token, truncated snapshot). Domain empty state is part of test. | Golden fixture: each row renders correct empty state + action |
| **T32.3** | Budgets: measured not asserted. `graph:scale` prints snapshot build, model build, `scopeModel`, render-model build. CI guard: `graph:scale --fail-if-slower`. | CI fails if budgets exceeded |

#### T20.3 — Tags (G20)
| Subtask | Description | Verify |
|---------|-------------|--------|
| T20.3 | Tag nodes → **deferred to D26** | — |

---

### Priority 6: Adaptive UI (Wave 6) — New in rev 2.2

#### T33 — Expand/Collapse & Continuous Layout (G33)
| Subtask | Description | Verify |
|---------|-------------|--------|
| **T33.1** | Interactive cluster state: per-node `expanded: boolean` in `GraphNode.data`, persisted per session. Click cluster chip toggles; model rebuilds with local `minLevel` override (collapsed=overview, expanded=execution). | Golden fixture: toggle persists reload; model rebuilds with overridden minLevel |
| **T33.2** | Continuous layout for hierarchy/tree: renderer receives `previousPositions`, animates 150–300ms (cubic-bezier). Opt-in per layout (`LayoutOptions.transition=true`, default for hierarchy/tree). Force stays discrete. | Visual regression: toggle directory animates smoothly, no thrash |
| **T33.3** | Progressive detail on zoom: combine level zoom + cluster state. At overview all collapsed; execution default expanded; detail all expanded. Card content cross-fades tiers continuously (opacity 120ms). | Visual check: zoom cross-fades tiers, no pop at boundaries |
| **T33.4** | Budget-aware continuous layout: budget evaluated at target positions. Nodes entering fade in; leaving fade out. Domain weights apply to target layout. | `graph:scale --transition` passes CI budget guard |

**Stop rule:** If continuous layout adds >50ms to model→render pipeline, it's off by default behind a flag.

---

## Infrastructure / Server Gaps (from TODO.5 notes)

| Item | Description | Blocked By |
|------|-------------|------------|
| Snapshot memoization | Memoize per `(location, revision, scope)`, invalidate on FS/VCS events | T29.2 (noted as remaining) |
| VCS history capability | `Vcs.history` or equivalent to provide commit SHAs for `branches`, `commits`, `head.sha`, `base.sha` | T20/T21 (currently empty with `missing` reason) |
| Parser WASM packaging | Tree-sitter grammars packaged by server for T21.2 | T21.2 |

---

## Deferred (unchanged from TODO.5)

| ID | Item | Unblock Condition |
|----|------|-------------------|
| D16–D22 | Multi-session, cursors, time travel, AI summaries, plugin kinds, prompt export, 3D | Unchanged |
| D23 | External dependency *nodes* | Packaging lens proves nodes beat package detail list |
| D24 | Container nodes | `docker ps`/devcontainer source exists and is observed |
| D25 | Comment nodes | Reader task proves TODO/FIXME nodes beat search |
| D26 | Tag nodes | Release landmarks are a real navigation need |
| D27 | True go-to-definition (LSP plugin) | LSP provider exists server-side, worth the latency |
| D28 | Cross-session control plane | TODO.3 D4 |

---

## Verification Matrix (commands unchanged)

| Check | Command |
|-------|---------|
| Core model — build, scope, degrade, golden fixtures | `cd packages/session-ui && bun test src/graph` |
| Protocol — schema round-trip, client gen | `cd packages/protocol && bun test` && `cd packages/client && bun run generate` |
| Server — snapshot endpoint, symbol index | `cd packages/server && bun test src/graph` |
| Host UI — lens, actions, search, grammar | `cd packages/session-graph && bun run typecheck && bun test` |
| User flows — profile switch, commit→file, symbol→caller, issue→branch | `cd packages/app && bunx playwright test e2e/graph/flows.spec.ts` |
| Whole fork — lint, types, build | `bun run check` (repository root) |
| Visual regression — capture vs committed frames | `bun run graph:capture --mode=verify` |
| Performance — budgets guarded in CI | `bun run graph:scale` |

---

## Architectural Decisions (carried from TODO.5 rev 2)

| # | Decision | Reason |
|---|----------|--------|
| 33 | One snapshot input; no I/O in model build | Purity = testable, swappable renderer |
| 34 | Domains are a filter (`scopeModel`), not threaded axis | One pure function instead of eight parameters |
| 35 | Containment is `part-of` | Hierarchy/tree layouts and `parentIndex` already work |
| 36 | File node is join key, not tool | Tools are events, files are stable |
| 37 | A turn is not a commit | Turn changes are working-tree diff |
| 38 | Symbols degrade: hunk → parser → (never) LSP in model | No latency in build, no grammar packaging in client |
| 39 | Run actions are agent-mediated or capability-gated | Preserves permissions, attribution, transcript (ADR-023) |
| 40 | Profiles, not eight checkboxes | Reader picks a question; escape hatch stays |
| 41 | No new layout strategy | Five layouts already unranked; derived nodes ride existing grammar |
| 42 | Snapshots revision-bound, per-source stamped | Derived fact reader cannot date is a lie |
| 43 | Display list replaces dependency nodes | Node count must not scale with `node_modules` |
| 44 | Every kind touches six tables | Type system enforces five; make sixth explicit |
| 45 | Cluster state is local lens override | `scopeModel` filters; per-node `expanded` overrides `minLevel` |
| 46 | Continuous layout only for hierarchy/tree (opt-in) | Lanes/timeline grid-based; force physics-based |
| 47 | Card tier interpolation continuous, not level-gated | `detailTier(width)` drives cross-fade; no pop |

---

## Stop Rules (carried from TODO.5 rev 2)

1. No I/O in model build. Facts needing I/O enter through snapshot.
2. No new kind without all six tables in §3.2 of TODO.5.
3. No derived node without `provenance.source`; no derived edge without confidence.
4. No `run` action outside registry, without confirmation, or without attribution.
5. No edge kind that no selector, layout, or action consumes.
6. No domain without a profile, an empty state, and a degradation row.
7. If session-only model changes in any way, stop and diff the golden.
8. If continuous layout adds >50ms to model→render pipeline, off by default behind flag.

---

## Next Actions (immediate)

1. **T23.1** — Implement process/port extraction in `attachWorkspace` (snapshot already has `processes` array)
2. **T24.1** — Add test extractor registry in `build.ts` (pattern per runner, `inferred` confidence)
3. **T25.1** — Add issue reference extraction from messages/branches in `build.ts`
4. **T26.2** — Add ADR frontmatter parsing in `attachWorkspace`
5. **T27.2** — Add profile selector to toolbar (dropdown with 5 profiles)
6. **T27.3** — Add empty state components per domain in toolbar/legend

---