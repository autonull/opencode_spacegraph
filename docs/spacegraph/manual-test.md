# Manual Test Script — SpaceGraph (T2.2 Evaluation)

> **Scope:** this is the evaluator's packet. Follow the setup, enable the feature, then run the five tasks
> verbatim from `SPACEGRAPH.md §10.1`. Counterbalance order (transcript-first / graph-first). Capture
> per-task fields below. The "limitations heads-up" list at the end sets expectations for rough edges.

---

## 0. Setup (two boot paths — verify both)

| Path | Command | What it tests |
|------|---------|---------------|
| **Mock** | `bun run graph:dev` | Canonical fixture, no credentials, no server |
| **Live** | `bun run dev:live /path/to/project` | Real server, real session, elected background server |

Both must reach a green canvas (`data-graph-ready="true"`) and show the toolbar.

### Enable the graph (one click)
1. Open the command palette (`⌘K` / `Ctrl+K`)
2. Type "Graph" → select **"Graph (experimental): Enable and open map"**
3. The header toggle **SessionGraphToggle** appears; the map opens in the session panel.

> This is the §4.1 discovery affordance. If the palette entry is missing, the feature is not discoverable — flag it.

---

## 1. Task Definitions (verbatim from `SPACEGRAPH.md §10.1`)

### Task A — Why did this file change?
**Setup:** Open a session with a failing test and a fix commit.  
**Action:** In the graph, find the file node (e.g., `src/auth/session.ts`). Open its detail (popover or window). Note the **Why** trace action.  
**Success:** The trace highlights the call chain that led to the change (test failure → edit → fix).

### Task B — Which calls led to this failure?
**Setup:** Session with a tool error (shell command exit code ≠ 0).  
**Action:** Select the error result node. Open **Led-here** trace.  
**Success:** The trace shows the assistant message → tool call → error chain.

### Task C — What did the subagent contribute?
**Setup:** Session with a delegation (subagent).  
**Action:** Find the subagent node. Open its detail. Note the "Subagent contributions" section (files, tools, nodes).  
**Success:** The inspector lists the subagent's file edits, tool calls, and nodes.

### Task D — What changed after the failing test?
**Setup:** Session where a test fails, then the agent edits and re-runs.  
**Action:** At the overview level, find the "Explore" phase cluster. Expand or frame the diff node after the retry.  
**Success:** The diff node shows the changed files; the inspector renders the patch.

### Task E — Where did the agent retry or change direction?
**Setup:** Session with a retry (assistant message with `outcome: "interrupted"` and a retry child).  
**Action:** Find the retry node (icon ⟳). Open detail. Note the attempt number and exit code.  
**Success:** The inspector shows `attempt: 2`, `exit: 0` (or the final outcome).

---

## 2. Counterbalanced Order

| Evaluator | Order |
|-----------|-------|
| 1 | Transcript-first: A→B→C→D→E in transcript, then repeat in graph |
| 2 | Graph-first: A→B→C→D→E in graph, then repeat in transcript |
| 3 | Transcript-first (different session) |
| 4 | Graph-first (different session) |

Each evaluator runs **all five tasks in both modes**. Record which mode was first.

---

## 3. Per-Task Capture Fields

| Field | Format |
|-------|--------|
| **Task** | A / B / C / D / E |
| **Mode** | `transcript` \| `graph` |
| **Success** | `yes` \| `partial` \| `no` |
| **Time (s)** | Stopwatch from task start to answer |
| **Wrong turns** | Count of dead-end clicks / backtracks |
| **Interactions** | Click sequence (e.g., "palette → graph → file node → popover → Why") |
| **Preference (1–7)** | 1 = strongly prefer transcript, 7 = strongly prefer graph |
| **Quotes** | Verbatim evaluator comments |

---

## 4. Reset Between Tasks

- Close all graph windows (`Escape` on each, or reload the page)
- Clear selection (click canvas background)
- Reset zoom to **Execution** level (toolbar → Layers → Level → Execution)
- If transcript mode: close graph panel, use transcript only

---

## 5. Documented Limitations (heads-up — these are *expected*, not bugs)

| # | Limitation | Workaround for evaluation |
|---|------------|---------------------------|
| 1 | **No mobile graph mode** — desktop only; narrow view shows a notice | Evaluate on desktop ≥ 1100px |
| 2 | **Permalink no-op when flag off** — `#graph:<node>` shows a notice instead of framing | Enable the flag first (palette one-click) |
| 3 | **Workspace lens absent on session-only servers** — the graph works, but no file-tree window | Expected; the session-only graph is the T2.2 hypothesis |
| 4 | **3D billboard toggle is progressive** — cards shear until toggled | Not evaluated; 3D is optional |
| 5 | **Cytoscape capture optional** — SVG/HTML/JSON export are primary | Test SVG/HTML/JSON export instead |
| 6 | **Reduced motion: camera snaps, doesn't glide** — the preference is honored, not the timing | Verify the preference disables animation, not the exact motion |
| 7 | **Band headers may touch member cards** — known layout gap (`LaneLayout.bandHeaderGap`) | Visual polish only; does not affect task success |
| 8 | **Peek hover can be intercepted by overlapping nodes** | Use popover/detail window for reliable inspection |

---

## 6. Smoke Checklist (one pass, in-app — ✅ before evaluator starts)

| Area | Check |
|------|-------|
| Mode persistence | Reload → graph mode, level, layout, detail mode restored |
| Hybrid arrangements | Stacked / side-by-side / floating — all three work |
| Reveal in log (both ways) | Graph node → "Open in transcript" → transcript highlights; transcript line → "Open in graph" → graph frames node |
| Turn map | `⌥⌘T` / `Alt+T` opens, `Escape` closes, focus returns to canvas |
| Permalink | Copy node link → cold load (new tab) → graph frames that node |
| Export | SVG / JSON / HTML all produce non-empty files |
| Search → Inspect | Toolbar search → type → click result → inspector shows node |
| Question verbs | Why / Led-here / Related / Compare all highlight traces |
| Notes | Create / edit / delete / copy note on a node |
| Equalizer preset | View → Equalizer → click "Errors larger" → rule appears |
| Minimap pan | View → Minimap → click overview → main camera pans |
| Zoom limits | Controls disable at renderer min/max; content stays addressable |
| Adapter fallback | Force Cytoscape → transcript still works, no crash |
| Workspace lens absent | On a server without `server.graph` → session-only graph renders |
| Keyboard-only | Tab order through toolbar, canvas, inspector, windows; no focus traps |
| Screen-reader labels | Nodes/edges have accessible names (`aria-label` or `role="img"`) |
| Reduced motion | `prefers-reduced-motion` honored (camera snaps, no glide) |
| i18n strings | All new keys present in `packages/ui/src/i18n/en.ts` |

---

## 7. Metrics (protocol counters — verify they increment)

Run these in the browser console during evaluation:

```js
// Mode switches
await fetch('/api/graph/metrics', { method: 'POST', body: JSON.stringify({ query: 'graphMetrics', flags: ['mode-switch'] }) })

// Window opens
await fetch('/api/graph/metrics', { method: 'POST', body: JSON.stringify({ query: 'graphMetrics', flags: ['window-open'] }) })

// Trace actions
await fetch('/api/graph/metrics', { method: 'POST', body: JSON.stringify({ query: 'graphMetrics', flags: ['trace-why', 'trace-led-here', 'trace-related'] }) })
```

Confirm the protocol's own `Metrics.count("...")` records what `SPACEGRAPH.md §6.2` asks for.

---

## 8. Gate: `t2.2-eval` Tag

When the smoke checklist is ✅ and both boot paths work, tag the branch:

```bash
git tag t2.2-eval
git push origin t2.2-eval
```

This freezes the evaluator's branch while engineering continues on `main`.