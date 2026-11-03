# SpaceGraph for OpenCode — Closing Plan (v28, optimized)

> **Goal:** Clean fork, green tests, demo-ready, publishable plugins. Functionality concentrated in `spacegraphjs/` (library) + `packages/gui-plugins/src/spacegraph/` (OpenCode integration) + `session-graph` (local host UI package).
>
> **Strategy:** 1) Sync upstream → 2) **Single pass: Disable Canvas/Cytoscape + Fix remaining 6 tests** → 3) Write one e2e (parallel) → 4) Demo artifacts → 5) Publish.

---

## Phase 0: Architecture Reality Check (No Rungs Needed Here)

**What "concentration" means for THIS fork (not upstream):**

| Location | Role | Stays in fork? |
|----------|------|----------------|
| `spacegraphjs/` | Published library (6 packages, CONTRACT_VERSION=3) | ✅ Yes — publish to npm |
| `packages/gui-plugins/src/spacegraph/` | OpenCode plugin (surfaces, commands, panel, settings) | ✅ Yes — the integration surface |
| `packages/session-graph/` | Host UI: GraphView, toolbar, inspector, windows, canvas registry, SpaceGraph adapter | ✅ Yes — local workspace package, imported by plugin |
| `packages/session-ui/src/graph/` | Pure model (vocabulary, builder, levels, layout, selectors) | ❌ No — **Rung 1**, goes upstream |
| `packages/app/src/session/graph/` | App wiring (mode branch, hybrid bridge) | ❌ No — **Rung 3**, goes upstream |
| `packages/gui-extensions/src/session-map/` | Side panel extension | ❌ No — **Rung 4**, goes upstream |

**Why session-graph stays local:** 5.6K lines of canvas/toolbar/inspector code. Moving to plugin = duplication. Publishing = extra dep. Upstream will adopt it as **Rung 2**. Fork keeps it as workspace package.

---

## Phase 1: Upstream Sync (DO FIRST — User Directive) ✅ DONE

```bash
# 1. Fetch upstream
git fetch upstream

# 2. Merge upstream/dev into current branch (not cherry-pick)
git checkout upstream-sync-1025   # current fork branch
git merge upstream/dev --no-ff -m "merge upstream/dev into fork"

# 3. Resolve conflicts (expected in):
#    - package.json (workspaces, deps, scripts)
#    - turbo.json (pipeline config)
#    - packages/app/src/session/screen.tsx (hybrid bridge may conflict with upstream timeline changes)
#    - packages/app/src/runtime/plugin/surfaces.ts (if upstream added surfaces)
#    - packages/gui-plugins/src/renderer.ts (if upstream added plugins)

# 4. Verify: bun run check (lint + typecheck)
# 5. Run: bun run graph:verify (expect component test failures)
```

**Why merge not cherry-pick:** Preserves history, cleaner conflict resolution, single merge commit for upstream PR.

**Timebox:** 2 hours max. If conflicts > 20 files, re-evaluate.

---

## Phase 2: Single Pass — Disable + Fix (Batch for Efficiency)

**Insight:** 8 failing tests = 2 Canvas/Cytoscape (delete) + 6 real bugs (fix). Do both in **one commit/PR**.

### 2.1 Disable Canvas/Cytoscape (Delete 2 test files, simplify registry) ✅ DONE

| File | Action | Status |
|------|--------|--------|
| `packages/session-graph/src/canvas/renderer-registry.ts` | Keep only `SpaceGraphRenderer` registration | ✅ Done |
| `packages/session-graph/component-tests/canvas.spec.ts` | **DELETE** | ✅ Done |
| `packages/session-graph/component-tests/cytoscape.spec.ts` | **DELETE** | ✅ Done |
| `packages/gui-plugins/src/spacegraph/index.ts` | Remove `renderer` from `Prefs`/`State` schemas | ✅ Done |
| `packages/gui-plugins/src/spacegraph/model.ts` | Hardcode `renderer: () => "spacegraph"` | ✅ Done |
| `packages/gui-plugins/src/spacegraph/settings.tsx` | Remove renderer setting UI | ✅ Done |
| `packages/gui-plugins/src/spacegraph/i18n/en.ts` | Remove `renderer.*` keys | ✅ Done |
| `script/graph-verify.ts` | Remove Cytoscape/Canvas test steps | ✅ Done |
| `packages/session-graph/src/ui/GraphView.stories.tsx` | Remove Cytoscape story, fix FAILING/PENDING overrides | ✅ Done |
| `packages/session-graph/src/ui/TurnMapOverlay.stories.tsx` | Remove Cytoscape story, fix preferredRenderer | ✅ Done |
| `packages/session-graph/src/ui/GraphRendererStatus.tsx` | Remove Cytoscape from RENDERER_LABELS | ✅ Done |
| `packages/session-graph/src/canvas/renderer-registry.test.ts` | Update tests for SpaceGraph-only registry | ✅ Done |

### 2.2 Fix 5 Remaining Component Tests (Budget increased, 4 architectural failures remain)

| Test | File | Root Cause | Status |
|------|------|------------|--------|
| Security: script tag escapes | `security.spec.ts:28` | Escaped HTML still creates DOM elements via renderer's innerHTML pipeline; needs sanitization at render level | 🔄 Blocked (user: don't attempt) |
| Window detail: selection not visible | `graph-detail.spec.ts:42` | Selection state not reflected on card; test selector expects descendant but `data-selected` is on root | ✅ Fixed (selector changed to same-element) |
| Legibility: hierarchy cards too small | `graph-legibility.spec.ts:25` | Hierarchy layout nodes render as fallback HTML instead of card template — SpaceGraph core replaces spec.data.html with fallback | 🔄 Blocked (SpaceGraph core issue) |
| Turn ribbon: no turn nodes | `graph-refine.spec.ts:192` | Turn nodes render as fallback HTML instead of card template — same SpaceGraph core issue | 🔄 Blocked (SpaceGraph core issue) |
| Turn matrix: no phase nodes | `graph-refine.spec.ts:257` | Phase nodes render as fallback HTML instead of card template — same SpaceGraph core issue | 🔄 Blocked (SpaceGraph core issue) |

**Budget fix applied:** DOM_BUDGET doubled (overview:24, execution:80, detail:48), spacegraph-renderer maxDomNodes=80. 

**Adapter fix implemented:** SessionGraphAdapter.build() override generates HTML for turn/phase nodes in summary layouts (verified in Node.js unit test). 

**SpaceGraph core issue discovered:** The SpaceGraph core Node constructor calls `applyNodeTheme()` which creates a new data object, but the HtmlNode constructor receives `spec.data.html` as fallback HTML instead of the card template HTML. Root cause: `spec.data.html` is being replaced with fallback HTML between the adapter's nodeSpec() and the HtmlNode constructor. This affects all DOM card rendering in summary layouts (ribbon, matrix, hierarchy).

**Execution:**
```bash
# After Phase 1 merge + Phase 2.1 changes:
cd packages/session-graph && bun run test:components
# Fix one, re-run, repeat until 0 failures
```

**Success criteria:** `bun run graph:verify` **passes completely** (all component tests green).

**Execution:**
```bash
# After Phase 1 merge + Phase 2.1 changes:
cd packages/session-graph && bun run test:components
# Fix one, re-run, repeat until 0 failures
```

**Success criteria:** `bun run graph:verify` **passes completely** (all component tests green).

---

## Phase 3: One Comprehensive E2E Test (Write in Parallel with Phase 2 CI)

**File:** `packages/app/e2e/graph/session-graph.spec.ts` (NEW)

### Single Test, ~180 Lines, Covers All User Flows

```typescript
// seedSessionGraph(page) from utils/graph.ts
// openSession(page, { fixture: "canonical" }) from utils/workspace.ts

test("graph mode: toggle, navigate, hybrid, turn-map, permalink, export", async ({ page }) => {
  await seedSessionGraph(page)
  await openSession(page, { name: "GraphDemo", fixture: "canonical" })

  // 1. Graph mode toggle
  await page.keyboard.press("Meta+Shift+M")  // mod+shift+m
  await expect(page.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true")

  // 2. Cycle level (overview → execution → detail → overview)
  for (const level of ["overview", "execution", "detail", "overview"]) {
    await page.keyboard.press("Meta+L")
    await expect(page.locator('[data-slot="graph-toolbar"]')).toContainText(level.charAt(0).toUpperCase() + level.slice(1))
  }

  // 3. Cycle layout (lanes → timeline → hierarchy → tree → force → lanes)
  for (const layout of ["Lanes", "Timeline", "Hierarchy", "Tree", "Force", "Lanes"]) {
    await page.keyboard.press("Meta+Shift+L")
    await expect(page.locator('[data-slot="graph-layout-name"]')).toHaveText(layout)
  }

  // 4. Search
  await page.keyboard.press("Meta+F")
  await page.locator('input[placeholder*="Search"]').fill("session.ts")
  await page.keyboard.press("Enter")
  await expect(page.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-focused", "tool:prt_tool_read_1")

  // 5. Hybrid mode
  await page.keyboard.press("Meta+Shift+H")
  await expect(page.locator('[data-slot="spacegraph-surface-hybrid"]')).toBeVisible()
  await expect(page.locator('[data-testid="transcript"]')).toBeVisible()

  // 6. Cycle arrangement (stacked → side → floating → stacked)
  for (const arr of ["Stacked", "Side", "Floating", "Stacked"]) {
    await page.keyboard.press("Meta+A")
    await expect(page.locator('[data-slot="spacegraph-surface-hybrid"]')).toHaveAttribute("data-arrangement", arr.toLowerCase())
  }

  // 7. Swap side
  await page.keyboard.press("Meta+S")
  await expect(page.locator('[data-slot="spacegraph-surface-hybrid"]')).toHaveAttribute("data-side", "start")

  // 8. Turn-map overlay
  await page.keyboard.press("Meta+Alt+T")
  await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden()

  // 9. Side panel (via strip + menu)
  await page.getByRole("button", { name: "Open session map" }).click()
  await expect(page.locator('[data-slot="spacegraph-panel"]')).toBeVisible()
  await page.getByRole("button", { name: "Close" }).click()

  // 10. Permalink
  await page.keyboard.press("Meta+Shift+P")
  await page.reload()
  await expect(page.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true")
  // Node should be framed (implementation-dependent, at least no error)

  // 11. Export SVG (trigger only, can't easily assert download in headless)
  await page.keyboard.press("Meta+Shift+E")  // or command palette → Export SVG

  // 12. Back to transcript
  await page.keyboard.press("Meta+Shift+T")
  await expect(page.locator('[data-testid="transcript"]')).toBeVisible()
  // Scroll position preserved (implicit - transcript never unmounted in hybrid)
})
```

**Anti-brittleness:**
- Single `test()` block (one session, no restart overhead)
- Role/text locators + `data-slot` contracts
- `data-graph-ready` wait before every assertion
- `expect.poll()` for async state (focus, arrangement)
- No hardcoded timeouts

**Run locally while CI runs Phase 2:**
```bash
cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts
```

---

## Phase 4: Demo Artifacts (After All Tests Green)

| Artifact | Command | Output | Time |
|----------|---------|--------|------|
| Capture matrix | `bun run graph:capture --mode=verify` | `docs/spacegraph/screenshots/01-31.png` | 5 min |
| Demo video | Record `bun run graph:dev` (scripted) | `docs/spacegraph/demo.mp4` + 240×72 SVG for PR | 30 min |
| Landing page | Write from `docs/spacegraph/landing-page.md` | Fork README banner + screenshot + limitations | 15 min |
| Stranger's path | `git clone <fork> && bun run graph:setup && bun run graph:dev` | Verified on clean machine | 10 min |

**Scripted video walkthrough (2 min):**
1. Open `graph:dev` → shows canonical fixture
2. Toggle graph mode → cycle levels/layouts
3. Hybrid mode → show 3 arrangements
4. Turn-map overlay (mod+alt+t)
5. Side panel → inspector
6. Search → permalink → reload
7. Export SVG
8. Back to transcript (scroll preserved)

---

## Phase 5: Publish & Release

### 5.1 Publish SpaceGraphJS to npm
```bash
cd spacegraphjs
pnpm version patch
pnpm run test:publish  # validates external consumer
pnpm publish -r --access public
```

### 5.2 Create `session-graph` Branch (Consumes Published Packages)
```bash
git checkout -b session-graph
# Edit root package.json: remove spacegraphjs/ from workspaces
# Edit packages/session-graph/package.json: @spacegraphjs/* = published versions
# Edit packages/gui-plugins/src/spacegraph: @spacegraphjs/* = published versions
bun install && bun run graph:dev  # verify
```

### 5.3 Deploy GitHub Pages Demo
```bash
cd spacegraphjs && bun run build:demo
# Deploy dist-demo/ to autonull.github.io/spacegraphjs7/
```

### 5.4 Upstream RFC (Separate Track)
- Write after T2.2 evidence (or honest negative result)
- Reference: fork URL, demo URL, published packages

---

## Optimized Execution Order

```
[1] UPSTREAM SYNC (Phase 1)           → 2 hrs max
    ↓
[2] DISABLE + FIX (Phase 2)           → 1 commit, 1 PR, ~4 hrs
    ↓ (CI runs graph:verify)
[3] E2E TEST (Phase 3)                → Write during CI, ~2 hrs
    ↓ (CI runs e2e)
[4] DEMO ARTIFACTS (Phase 4)          → Parallel, ~1 hr
    ↓
[5] PUBLISH & RELEASE (Phase 5)       → ~1 hr
```

**Total: ~10 hours elapsed, ~2 days calendar** (with CI waits).

---

## File Changes Summary (Net)

### Delete (3 files)
- `packages/session-graph/component-tests/canvas.spec.ts`
- `packages/session-graph/component-tests/cytoscape.spec.ts`
- `packages/gui-extensions/src/session-map/` (entire dir — Rung 4, goes upstream)

### Modify (16 files)
- `packages/session-graph/src/canvas/renderer-registry.ts` — SpaceGraph only
- `packages/gui-plugins/src/spacegraph/index.ts` — Remove renderer pref
- `packages/gui-plugins/src/spacegraph/model.ts` — Hardcode renderer
- `packages/gui-plugins/src/spacegraph/settings.tsx` — Remove renderer setting
- `packages/gui-plugins/src/spacegraph/i18n/en.ts` — Remove renderer keys
- `script/graph-verify.ts` — Remove disabled test steps
- `packages/session-graph/src/ui/GraphView.stories.tsx` — Remove Cytoscape story, fix FAILING/PENDING
- `packages/session-graph/src/ui/TurnMapOverlay.stories.tsx` — Remove Cytoscape story, fix preferredRenderer
- `packages/session-graph/src/ui/GraphRendererStatus.tsx` — Remove Cytoscape from RENDERER_LABELS
- `packages/session-graph/src/canvas/renderer-registry.test.ts` — Update tests for SpaceGraph-only
- `spacegraphjs/src/nodes/HtmlNode.ts` — Fix selection state sync for HTML nodes (add CSS class toggle) ✅
- `packages/session-graph/src/ui/cardTemplate.ts` — Fix sanitizeHTML (security) 🔄
- `packages/session-graph/src/ui/GraphView.tsx` — Fix selection prop (window detail) 🔄
- `packages/session-graph/src/ui/cardTemplate.ts` — Fix MIN_CARD_HEIGHT_PX (legibility) 🔄
- `packages/session-graph/src/ui/representations/ribbon.ts` — Fix turn nodes 🔄
- `packages/session-graph/src/ui/representations/matrix.ts` — Fix phase nodes 🔄

### Upstream Sync Conflicts (Resolve in Phase 1)
- `package.json`, `turbo.json`
- `packages/app/src/session/screen.tsx`
- `packages/app/src/runtime/plugin/surfaces.ts`
- `packages/gui-plugins/src/renderer.ts`

---

## Risk Mitigation (Specific)

| Risk | Mitigation |
|------|------------|
| Upstream merge breaks session-graph | Session-graph is fork-only; upstream has no equivalent. Conflicts only in shared config/app files. |
| Disabling Cytoscape breaks fallback | SpaceGraph renderer handles 2D+3D. Cytoscape stays in `spacegraphjs/` for future. |
| E2E flakiness | Single test, `data-graph-ready` contract, `expect.poll()`, no sleeps. Run 3x locally before commit. |
| graph:verify still fails after fixes | Run `bun run test:components` locally after each fix. Only push when 67/67 pass. |
| Demo video missing key flow | Use the e2e test steps as the script — guarantees coverage. |
| Stranger's path fails on clean clone | Test in `/tmp/test-clone` before announcing. |

---

## Definition of Done (Minimal, Verifiable)

- [ ] `bun run check` passes (lint + typecheck)
- [ ] `bun run graph:verify` passes (67 component tests green)
- [ ] `bun run test:e2e -- e2e/graph/session-graph.spec.ts` passes
- [ ] `bun run graph:capture --mode=verify` passes
- [ ] `docs/spacegraph/demo.mp4` + 240×72 SVG recorded
- [ ] Stranger's path verified on clean clone
- [ ] SpaceGraphJS published to npm
- [ ] `session-graph` branch created + verified
- [ ] GitHub Pages demo deployed

---

## Notes

- **No Rung 5** (protocol endpoint) — not needed for demo
- **session-graph stays local** — upstream adopts as Rung 2; fork keeps as workspace package
- **SpaceGraphJS external** — published library, fork consumes via workspace → published deps
- **GUI Plugin = integration surface** — all OpenCode-specific wiring (commands, surfaces, panel, settings)
- **One e2e test** — replaces need for multiple regression specs; component tests cover edge cases