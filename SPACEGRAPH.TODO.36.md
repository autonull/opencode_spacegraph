# SpaceGraph: Usability, Usefulness & Communication Excellence (v36)

> **Status (2026-11-13):** v35 M0–M8 complete, M9 functional complete. v36 shifts from "feature delivery" to **"excellence in usability, usefulness, and communication."** All canonical checks green (53/53). 54 capture frames pass. Story-driven capture test records 8 frames demonstrating a coherent debugging narrative. Live demo video (35s) recorded. Remaining: environmental gates (benchmarks, listener-leak, video review, re-bless) + v36 excellence work.

---

## Purpose

v35 delivered **features**. v36 delivers **excellence** — making SpaceGraph:
1. **Immediately understandable** — a new user sees value in 30 seconds
2. **Genuinely useful** — solves real debugging/navigation problems better than alternatives
3. **Self-teaching** — the UI, recordings, and docs communicate possibilities without a manual

---

## Priority Order

| Order | Focus Area | Priority | Target |
|-------|------------|----------|--------|
| 1 | **Onboarding & First-Run Experience** | P0 | 30s to "aha!" moment |
| 2 | **Narrative Demo & Communication Material** | P0 | Shareable video + screenshots that teach |
| 3 | **Usability Polish** | P1 | Friction-free common workflows |
| 4 | **Usefulness Validation** | P1 | Real-user task success metrics |
| 5 | **Environmental Gates (from v35 M9)** | P0 gate | Benchmarks, listener-leak, video review, re-bless |
| 6 | **SpaceGraphJS Library Polish** | P2 | Upstream-ready components |

---

## 1. Onboarding & First-Run Experience (P0)

**Goal:** A developer opening SpaceGraph for the first time understands its value within 30 seconds without reading docs.

### 1.1 Empty State → Guided Discovery
- [ ] **Empty map state**: Show "Your session will appear as it runs" with a subtle animated placeholder graph (frame 43)
- [ ] **First-run coach marks**: 3-step overlay on first open — (1) "Press `Ctrl+Shift+M` to open map" (2) "Click any node to inspect" (3) "Type `/` to search"
- [ ] **Interactive tutorial**: A guided walkthrough session (separate from real sessions) that teaches: overview → execution → failure trace → palette search → share permalink
- [ ] **Keyboard shortcut hint bar**: Non-intrusive footer showing `Ctrl+Shift+M` (map), `/` (palette), `Esc` (close) on first 3 visits

### 1.2 Progressive Disclosure Done Right
- [ ] **Level selector always visible**: Overview/Execution/Detail as segmented control (not buried in menu)
- [ ] **Layout selector with previews**: Show thumbnail of each layout (dagre, grid, circular, timeline, hierarchy) on hover
- [ ] **Lens badges on toolbar**: Active lens shown as pill with count (e.g., "Cost: 42k tokens", "Attention: 1 failure")
- [ ] **Surface switcher in titlebar**: Map / Hybrid / Turn Map / Transcript as tabs, not menu items

### 1.3 Immediate Visual Feedback
- [ ] **Selection ripple**: Click a node → subtle pulse animation (respects `reducedMotion`)
- [ ] **Search highlight**: Palette results pulse in graph, not just list
- [ ] **Trace overlay entrance**: "Why?" trace animates in from inspector, not pop-in

---

## 2. Narrative Demo & Communication Material (P0)

**Goal:** Produce materials that *teach* SpaceGraph's value — not just list features.

### 2.1 Hero Demo Video (60–90s)
Using the story-driven capture test as foundation:
- [ ] **Storyboard & script**: 7-act structure (Problem → Open Map → Attention Badge → "Why?" Trace → Palette Search → Subagent Discovery → Share)
- [ ] **Smooth camera work**: `fit()` → `focusNode()` → layout transitions → zoom, no jump cuts
- [ ] **Cursor ring + click ripple**: All interactions visible
- [ ] **Narration**: 1–2 sentences per scene, −14 LUFS, captions
- [ ] **Output ladder**: 30s teaser (social), 90s full (docs), 3min deep-dive (YouTube)
- [ ] **Record on display machine**: 1920×1080 or 2560×1440, dark theme, 60fps, clean fonts

### 2.2 Static Communication Assets
- [ ] **Key frame gallery**: 8–10 annotated screenshots for README/landing page:
  1. Transcript overwhelm → "Open map" (Ctrl+Shift+M)
  2. Attention badge in header → "Something failed"
  3. "Why?" trace overlay → causal chain
  4. Palette NLQ "failed tools" → jump to node
  5. Hierarchy layout → subagent delegation
  6. File diff widget → wrong fix visible
  7. Green test pass → resolution confirmed
  8. Permalink copied → "Share with team"
- [ ] **Animated GIFs** (2–3s loops) for each core workflow:
  - Open map → see failure → click "Why?"
  - Palette search → jump to node
  - Layout switch → hierarchy reveals subagent
  - Copy permalink → paste in chat
- [ ] **One-page "Why SpaceGraph?"** — problem/solution fit for 5 personas:
  - Debugging agent failures
  - Understanding delegation
  - Navigating large sessions
  - Sharing findings
  - Learning from past runs

### 2.3 In-App Teaching
- [ ] **Contextual tips**: "Press `/` to search" appears in empty search dialog
- [ ] **Feature discovery toasts**: "Try hierarchy layout for subagents" (once, dismissible)
- [ ] **Keyboard shortcut cheat sheet**: `?` key opens modal with all shortcuts

---

## 3. Usability Polish (P1)

**Goal:** Remove friction from the 5 core workflows identified in the narrative.

### 3.1 Workflow 1: "Something failed — what happened?"
- [ ] **Attention badge click** → opens map at failure, auto-fits, shows trace
- [ ] **One-click "Why?"** from any failed node (tool, result, message)
- [ ] **Trace overlay** shows: error → tool → cause → fix path, with collapse/expand
- [ ] **Keyboard**: `w` opens "Why?" on selected node

### 3.2 Workflow 2: "Find X in this session"
- [ ] **Palette opens instantly** (`/` key, <50ms p50)
- [ ] **NLQ understands**: "failed tools", "my edits", "subagents", "token.ts", "errors yesterday"
- [ ] **Results grouped**: Nodes / Actions / Saved Questions / Lenses / Surfaces
- [ ] **Recent searches** persist across sessions (20 max)
- [ ] **Keyboard**: `↑/↓` navigate, `Enter` select, `Esc` close

### 3.3 Workflow 3: "What did the subagent do?"
- [ ] **Hierarchy layout** as default for sessions with delegations
- [ ] **Subagent node** shows: description, outcome, child session link
- [ ] **Lineage panel** (fork/parent/children) always accessible from toolbar
- [ ] **Cross-session permalink**: `#graph:ses_child_xyz:file:foo.ts`

### 3.4 Workflow 4: "Show me the code change"
- [ ] **File node click** → diff widget opens in inspector (not modal)
- [ ] **Diff widget**: syntax highlighted, scrollable, copy button, "open in editor" link
- [ ] **Changed files rail**: toggle in toolbar, shows all modified files with status

### 3.5 Workflow 5: "Share this finding"
- [ ] **Copy permalink** (1 click): copies `#graph:ses_abc:tool:prt_xyz` to clipboard
- [ ] **Export options**: SVG / PNG / JSON / Permalink
- [ ] **Share modal**: "Copy link" + "Copy markdown" + "Copy for GitHub issue"

### 3.6 Cross-Cutting Polish
- [ ] **Toolbar never clips**: Overflow menu tested at 800px, 1024px, 1440px
- [ ] **Inspector resizable**: Drag handle, remembers width per surface
- [ ] **Canvas context menu**: Right-click → "Focus here", "Copy permalink", "Why?", "Open in new tab"
- [ ] **Zoom/pan indicators**: Subtle zoom % badge, mini-map in corner for large graphs
- [ ] **Loading states**: Skeleton cards while graph builds, not spinner

---

## 4. Usefulness Validation (P1)

**Goal:** Prove SpaceGraph solves real problems better than alternatives.

### 4.1 Task-Based Metrics (from v35 M7 study protocol)
- [ ] **Run the study**: Recruit ≥5 participants (protocol at `docs/spacegraph/study-protocol.md`)
- [ ] **Tasks**: Why did agent change X? What led to failure? What did subagent contribute? What changed after failure? Where did agent retry?
- [ ] **Measure**: Success rate, time, wrong turns, interaction rates, preference (1–7 Likert)
- [ ] **Threshold**: Cohen's d ≥ 0.5 on time AND success rate diff ≥ 20pp vs transcript

### 4.2 Dogfooding Counters (dev-only, already in `study.ts`)
- [ ] **Enable by default in dev**: Surface opens, lens switches, inline expands, "Why" clicks, timed answers
- [ ] **Weekly review**: Team reviews counters, identifies unused features
- [ ] **Kill unused**: If a feature has <5% engagement after 2 weeks, flag for removal

### 4.3 Real-World Session Analysis
- [ ] **Analyze 50+ real sessions**: What graphs do users actually open? What do they search? Where do they get stuck?
- [ ] **Heatmap of feature usage**: Toolbar clicks, palette queries, layout switches, lens toggles
- [ ] **Friction log**: Every "I wish I could..." from team dogfooding → backlog item

---

## 5. Environmental Gates (from v35 M9) — P0 Gate

| Gate | Status | Owner | Target |
|------|--------|-------|--------|
| **Benchmarks** | ⏳ Needs display machine | — | `strobe bench` on 1366×768+ headed Chromium; record numbers vs `origin/dev` |
| **Listener-leak check** | ⏳ Manual e2e | — | 30-min session: no dead controls, no global listener leaks, no duplicate DOM ids |
| **Video review (M7.6)** | ⏳ Needs demo video | — | ≥3 outsider reviews with recorded notes; pass/fail per `study-protocol.md` |
| **Capture re-bless** | ⏳ Reference env | — | Re-bless 4 frames (01-log, 13-narrow, 34-surfaces, 38-hybrid) on reference machine |

> **Note:** These block graduation. v36 work proceeds in parallel but cannot ship until gates pass.

---

## 6. SpaceGraphJS Library Polish (P2)

**Goal:** Make upstream components production-ready for external consumers.

- [ ] **Renderer package**: Export `SpaceGraphRenderer`, `SVGRenderer`, `CanvasRenderer` with stable API
- [ ] **Layout package**: `dagre`, `grid`, `circular`, `force`, `hierarchy` as pure functions
- [ ] **Kernel package**: `SpatialIndex2D`, `Viewport`, `Camera` with TypeScript types
- [ ] **Adapter package**: `GraphNode`, `GraphEdge`, `GraphModel` schema + validators
- [ ] **Demo app**: Second host (`spacegraphjs/demo/second-host/`) demonstrating embedding
- [ ] **Versioning**: Semver with `CONTRACT_VERSION` policy (no deprecations, delete-don't-deprecate)
- [ ] **Docs**: API reference, embedding guide, migration guide, breaking-change policy

---

## Non-Negotiables (Carried from v35)

1. One `SessionGraph` code path; surfaces compose it and never fork rendering.
2. New behavior starts flag-gated; a capability is available only when its flag and preference agree.
3. Never add work to the host timeline. Inline graphs stay static until expanded.
4. Every capability has a measured pass/park result. No capability ships on intuition alone.
5. Test each behavior at one layer only. Do not duplicate pure-model tests in the bundled copy.
6. Do not add a second active checklist. Completed work moves to the revision log; remaining work stays here.

---

## Revision Log

- **r0 (2026-11-13):** Created v36. Shift from feature delivery to excellence in usability, usefulness, and communication. Absorbs v35 M9 environmental gates as P0 blockers. Adds onboarding, demo materials, usability polish, usefulness validation, and library polish tracks.

---

## Absorption Map from v35

| v35 Item | v36 Location |
|----------|--------------|
| M9 Benchmarks | §5 Environmental Gates |
| M9 Listener-leak check | §5 Environmental Gates |
| M9 Video review (M7.6) | §5 Environmental Gates |
| M9 Capture re-bless | §5 Environmental Gates |
| M7 Study protocol | §4.1 Task-Based Metrics |
| M7 Local counters | §4.2 Dogfooding Counters |
| Capture story test | §2.1 Hero Demo Video |
| Live demo video | §2.1 Hero Demo Video |
| Frame captures | §2.2 Static Communication Assets |

---

## Kill/Park Register (v36 Additions)

| Capability | Decision | Evidence |
|------------|----------|----------|
| Model picker widget | **Park** | SDK exposes no model catalog; duplicates host composer |
| Permission summary widget | **Park** | Graph carries no permission request; duplicates host dock |
| Compaction advisor | **Park** | 0/46 nodes dropped, 0 tokens saved on canonical fixture |
| Radial/spectral/cluster/geo layouts | **Park** | Need live graph / non-deterministic / no geo data |
| Heat sizing (cost lens) | **Park** | Forces relayout; optional future work |
| Cytoscape renderer | **Park** | Only when factory + contract version registered |

---

## Open Decisions

| Decision | Needed By | Default If Unresolved |
|----------|-----------|----------------------|
| Study recruitment & execution | §4.1 (P1) | Run with internal team first; external if resources allow |
| Demo video production quality bar | §2.1 (P0) | 1920×1080, 60fps, clean narration; re-record until smooth |
| First-run tutorial scope | §1.1 (P0) | 3-step coach marks + interactive tutorial session |
| Keyboard shortcut discoverability | §1.3 (P0) | `?` key cheat sheet + footer hints on first 3 visits |
| Flag graduation order | Post video review | Delete only proven defaults after M7.6 passes |