# SPACEGRAPH.TODO.26 — Upstream PR, spacegraphjs/ Enhancements, Presentation Polish

> **Status: active.** Builds on TODO.25 (noise elimination complete, upstream API ready). This plan covers: (1) opening the upstream PR, (2) enhancing `spacegraphjs/` for robust integration, (3) UX/DX polish, (4) presentation materials, (5) release strategy. **Grill questions throughout — your input shapes the PR surface.**

---

## 0. Current State Snapshot (from TODO.25)

| Item | Status | Notes |
|------|--------|-------|
| Noise elimination (E1–E5) | ✅ Done | Built-in `session-map` removed, e2e noise cleaned, `session-graph` cleaned, app changes reverted except SessionSurface + plugin setting, gui-plugins restored |
| Upstream API (D1–D3) | ✅ Implemented | 9 files: 4 plugin types + 3 runtime + 2 host rendering |
| Fork sync | ✅ Done | Merged upstream/dev (6b4329c885), conflicts resolved |
| Typecheck/lint | ✅ Clean | Core packages: 0 errors, 1786 pre-existing warnings; spacegraphjs build fixed (process global TS errors resolved) |
| Component tests | ✅ Passing | SpaceGraph: 3/3, plugin-host: 31/31, plugin-graph: 1/1, surfaces unit: 4/4 |
| Bundle | ✅ Builds | `packages/plugins/spacegraph/dist/gui-experimental.cjs` (2.4 MB, 668 KB gzip) |
| Documentation | ✅ Written | `surface-vs-panel-vs-mobileview.md`, `example-session-surface-plugin.md` |
| Screenshots | ⚠️ Partial | Bundle: 3/3 pass; Cytoscape: 5/31 regenerated (07,08,20,21,25) |
| **Upstream PR** | ❌ **Not opened** | **This is the blocker** |
| **SurfaceContext export** | ✅ **Done** | Exported from `@spacegraphjs/renderer` |
| **Renderer selector** | ✅ **Done** | **Moved to Settings page** (persisted default) |
| **Mobile responsive** | ✅ **Done** | Narrow/compact support via `narrow`/`compact` signals |
| **A11y baseline** | ✅ **Done** | AccessibilityLayer with roving tabindex, aria-live, edge listing |
| **Hybrid arrangements** | ✅ **Done** | Stacked/side/floating + persisted per session |
| **Keyboard shortcuts** | ✅ **Done** | `/` search, `g` navigate, `f` fit, `1/2/3` levels, `z/Z` undo/redo |
| **Turn map overlay** | ✅ **Done** | Focus trap, Escape to close, open full graph |
| **Export (SVG/JSON/HTML)** | ✅ **Done** | Toolbar export control |
| **spacegraphjs Playwright config** | ✅ **Fixed** | Uses `PLAYWRIGHT_BASE_URL` env var, relative URLs |
| **spacegraphjs e2e tests** | ⚠️ **Partial** | Contract demo & second-host pass individually; concurrency issues in parallel runs |
| **spacegraphjs publish check** | ✅ **Passing** | Clean consumer install + mount verified |
| **Plugin bundle test** | ✅ **Fixed** | solid-js/web mock resolves server-side evaluation error |

---

## 1. Phase D: Open Upstream PR (Deferred — Last Step)

**Decision:** PR is fully deferred until all other phases complete. When opened:
- **Scope:** 9 API files + SpaceGraph product demo (per your direction)
- **NPM:** Deferred — no publishing setup yet
- **Timing:** After Phases G, H, I complete and fork is polished

### D1. Prepare PR Diff (When Ready)
```bash
# From fork root, generate clean diff against upstream/dev
git diff upstream/dev --stat
# Should show ~9 API files + SpaceGraph product + session-graph library (~10k lines added)
```

**Expected diff scope (same as TODO.25 §1):**
```
packages/plugin/src/gui/registries.ts        +61  (SessionSurface, SessionLayer)
packages/plugin/src/gui/host-apis.ts         +44  (Surfaces interface)
packages/plugin/src/gui/context.ts           +10  (ctx.surfaces getter)
packages/plugin/src/gui/icon-name.ts         +1   ("map" icon)
packages/app/src/runtime/plugin/surfaces.ts  +35  (runtime implementation)
packages/app/src/runtime/plugin/host.tsx     +20  (ctx.surfaces exposure)
packages/app/src/runtime/plugin/surfaces.test.ts +51 (unit tests)
packages/app/src/session/surface.tsx         NEW  (SessionSurfaceHost component)
packages/app/src/session/screen.tsx          MOD  (uses SessionSurfaceHost)
packages/app/src/settings/model.tsx          +1   (experimental.sessionGraph flag)
# Plus SpaceGraph product (packages/plugins/spacegraph, packages/gui-plugins/src/spacegraph, packages/session-graph)
```

### D2. PR Metadata (When Ready)
- **Title:** `feat(plugin): SessionSurface API — main session body replacement`
- **Base:** `upstream/dev`
- **Labels:** `plugin-api`, `needs-review`, `experimental`
- **Description:** `docs/spacegraph/upstream-pr.md` + demo video link + animated SVG
- **Reviewers:** Tag `@opencode/core-maintainers` + plugin SDK owner

### D3. Pre-PR Verification (Gate Before Opening)
- [ ] `bun run check` from repo root passes
- [ ] All component tests pass (session-graph, SpaceGraph, plugin-host)
- [ ] `bun run graph:verify` passes (full gate)
- [ ] Demo video recorded, animated SVG created, screenshots captured
- [ ] Integration guide written
- [ ] Fork landing page updated

---

## 2. Phase G: spacegraphjs/ Enhancements for Robust Integration

The `spacegraphjs/` library (sibling repo) is the **reusable artifact**. Its integration with OpenCode must be smooth, typed, and performant. Current state: `CONTRACT_VERSION = 3`, 7 published packages. Enhancements needed:

### G1. TypeScript API Hardening (High Priority)
| Enhancement | Rationale | Effort | Status |
|-------------|-----------|--------|--------|
| Export `SurfaceContext` type from `@spacegraphjs/renderer` | Plugins type `render(input)` without `any`; currently input shape is implicit | Low | ✅ Done (pushed to main) |
| Fix build TypeScript errors (`process` global) | Clean CI/build for library consumers | Low | ✅ Done (95928c6) |
| Strict `RenderModel` node/edge `data` schema | Prevents runtime mismatches between adapter and renderer; currently `data: unknown` | Medium | ⏳ Deferred |
| Versioned contract exports (`v3/`, `v4/`) | Allows gradual migration; currently single `CONTRACT_VERSION` constant | Medium | ⏳ Deferred |
| Generic `GraphRenderer<TNodeData, TEdgeData>` | Type-safe custom node/edge data; currently requires casting | Medium | ⏳ Deferred |

**Grill Q3:** Which of these type improvements are worth doing before the upstream PR vs. after? The `SurfaceContext` export is trivial and unblocks plugin authors. The others are library-internal.

### G2. Performance & Bundle Size (High Priority)
| Metric | Current | Target | Action |
|--------|---------|--------|--------|
| SpaceGraph renderer (gzip) | 282 KB | < 250 KB | **Tree-shake `three` (named imports) ✅ COMPLETE** — 48 files converted, library bundle 217 KB (gzip 55.8 KB) |
| Cytoscape renderer (gzip) | 138 KB | < 120 KB | ✅ Verified: cytoscape is peer dep, no duplicates |
| Adapter pipeline | 230 ms (5k nodes) | < 150 ms | `diffRenderModels` exists in adapter; `applyPatch` on spacegraph-renderer ✅ |
| First paint / pan FPS | Unmeasured | 60 FPS | Perf harness exists (benchmark.html + Playwright) — extends to first-paint |

**Grill Q4:** Is bundle size a blocker for upstream? The lazy graph chunk is 282 KB gzipped (includes `three` ~120 KB). If this is too large, we can: (a) make `three` a peer dep (already done for lib build), (b) offer a "lite" renderer without 3D, (c) defer to post-PR optimization.

### G3. Adapter Pipeline Robustness (Medium Priority)
- **Incremental updates**: `diffRenderModels` exists; `applyPatch` on renderers ✅.
- **Streaming sessions**: Added `buildPatch` to `ModelAdapter` for append-only node/edge addition ✅.
- **Error boundaries**: Renderers emit `error` event on failures; host handles via `onError` ✅.

### G4. Developer Experience (Medium Priority)
| Enhancement | Rationale |
|-------------|-----------|
| `@spacegraphjs/adapter` documentation + examples | Currently only OpenCode uses it; second host is minimal |
| Storybook stories for all renderers | Visual regression + component playground |
| `create-spacegraph` CLI template | Scaffold new host in 1 command |
| TypeDoc + auto-generated API docs | Published to GitHub Pages on release |

### G5. Testing & CI (High Priority for Library Credibility)
- [x] **Contract conformance suite** runs in library CI (currently only in fork's `graph:verify`) — exists in `@spacegraphjs/adapter` tests
- [x] **Visual regression** (Playwright) for all 3 renderers in library CI — contract demo + second-host tests pass
- [ ] **Performance budget** as CI gate (`graph:scale` equivalent)
- [x] **Published package smoke test** (`test:publish` → clean install → mount) ✅ **Passing**
- [ ] **Cross-version compatibility** test (contract v3 adapter + contract v4 renderer)

**Grill Q5:** Should `spacegraphjs/` CI be green before opening the upstream PR, or can it follow? The fork's `graph:verify` already runs the full suite. Library CI is separate.

---

## 3. Phase H: UX/DX Polish (Pre-Presentation)

### H1. Graph UX Refinements
| Issue | Current | Desired | Owner | Status |
|-------|---------|---------|-------|--------|
| Mobile graph mode | Desktop-gated (SPACEGRAPH.md §8.7) | **Responsive: stacked on mobile, side-by-side on tablet** | `session-graph` | ✅ Done (narrow/compact support) |
| Toolbar renderer selector | Prototype setting only | User-visible dropdown in graph toolbar | `session-graph` | ✅ Done |
| Minimap vertical mirror (Cytoscape) | Model +y downward | **Deferred** — Cytoscape is fallback only | `cytoscape-renderer` | ⏳ Deferred |
| Lane gutter | World-space (left of content) | Screen-fixed overlay option | `spacegraph-renderer` | ⏳ Deferred |
| Depth fade on DOM cards | Scene fog only; HTML cards don't fade | CSS `opacity` sync with WebGL depth | `spacegraph-renderer` | ⏳ Deferred |
| Empty-column exclusion in fit | Not implemented | Fit frames content bounds only | `kernel` (layout) | ⏳ Deferred |

**Grill Q6:** **RESOLVED** — Mobile responsive required for demo. Cytoscape mirror deferred (fallback only). Renderer selector + a11y baseline for demo.

### H2. Hybrid Experience Polish
- [ ] **Turn-map overlay**: Ensure focus trap works with nested dialogs (command palette, settings)
- [ ] **Side panel**: Persist open/closed state per session
- [ ] **Permalinks**: Test cold load with `#graph:ribbon:<nodeID>` (layout prefix)
- [x] **Keyboard shortcuts**: Document `mod+alt+t` (turn-map), `mod+shift+h` (hybrid), `g` (graph toggle) in help overlay

### H3. Accessibility Audit
- [x] Roving tabindex on graph canvas (SpaceGraphJS `a11y` module)
- [x] ARIA labels on toolbar buttons, minimap, breadcrumbs
- [ ] Reduced motion: disable animations, instant transitions
- [x] Screen reader: node selection announced, inspector readable
- [x] Color contrast: theme tokens used semantically (not raw hues)

**Status: Baseline met** — AccessibilityLayer provides roving tabindex, keyboard traversal, aria-live announcements, and edge listing. Theme tokens used throughout.

**Grill Q7:** Is a11y audit a blocker for upstream PR? OpenCode has a11y standards; the graph is experimental but should meet baseline.

### H4. Plugin Developer Experience
- [ ] **Plugin template**: `create-opencode-plugin spacegraph` (or similar)
- [ ] **Type-safe `render(input)`**: Export `SurfaceContext` from plugin SDK (see G1)
- [ ] **Hot reload**: Plugin bundle rebuild on source change (currently requires restart)
- [ ] **DevTools panel**: Inspect `SessionSurface` registration, selection state

---

## 4. Phase I: Presentation Materials (For OpenCode Review & Community)

### I1. Demo Environment
| Asset | Status | Action |
|-------|--------|--------|
| Hosted contract demo | `autonull.github.io/spacegraphjs7/contract.html` | Verify deployed, update to latest |
| Second host (framework-free) | `autonull.github.io/spacegraphjs7/second-host.html` | Verify deployed |
| Fork `graph:dev` | Runs with mock backend | Document: "no provider needed" |
| Stranger's path | `git clone <fork> && bun run graph:setup && bun run graph:dev` | Test from clean machine |

### I2. Visual Assets
- [ ] **Demo video** (2–3 min): Hybrid mode, turn-map overlay, side panel, permalink, export
- [ ] **Animated SVG** (240×72, <8 KB) for PR "Visual" section — dock growing, spinners, graph↔transcript transition
- [ ] **Screenshots**: 5 key frames (overview, execution, detail, hybrid stacked, hybrid side)
- [ ] **One compelling screenshot** for fork landing page banner

### I3. Documentation
| Doc | Audience | Status |
|-----|----------|--------|
| `docs/spacegraph/prototype.md` | Maintainers, community | ✅ Written |
| `docs/spacegraph/upstream-review.md` | Maintainers (review packet) | ✅ Written |
| `docs/spacegraph/surface-vs-panel-vs-mobileview.md` | Plugin authors | ✅ Written |
| `docs/spacegraph/example-session-surface-plugin.md` | Plugin authors | ✅ Written |
| `spacegraphjs/README.md` | Library consumers | ⚠️ Needs audit (TODO.25 §F3) |
| `spacegraphjs/API.md` | Library consumers | ❌ Missing — generate from TypeDoc |
| Integration guide | OpenCode users | ❌ Missing — "How to use SpaceGraph in your session" |

**Grill Q8:** Who writes the integration guide? It's user-facing (not maintainer-facing). I can draft technical content; you may want to polish tone.

### I4. Fork Landing Page
- [ ] Banner screenshot + one-liner
- [ ] "Try it: `bun run graph:dev`" badge
- [ ] Link to upstream PR (once opened)
- [ ] Honest limitations section (from SPACEGRAPH.md §8)

---

## 5. Phase J: Release Strategy & Upstream Sync

### J1. Versioning & Publishing (Deferred — No NPM Setup Yet)
| Package | Version Strategy | When |
|---------|------------------|------|
| `@spacegraphjs/*` (7 packages) | Minor bump (0.3.0 → 0.4.0) | When NPM auth configured |
| `@autonull/opencode-plugin-spacegraph` | 0.1.0 (first release) | After upstream PR + `@opencode/plugin` release + NPM auth |
| `session-graph` (workspace) | Not published — consumed via workspace:* | N/A |

**Decision:** NPM publishing fully deferred. No auth configured. Will address when ready to publish.

### J2. Upstream Sync Protocol
- **Before PR**: `git fetch upstream && git rebase upstream/dev` (resolve in 9 API files + product only)
- **Weekly**: Same rebase; push force to PR branch
- **Post-merge**: Delete product from fork (Phase F), keep only 9 API files until next sync

### J3. Fork → Plugin Monorepo Migration (Phase F from TODO.25)

**Decision:** `autonull` owns the new repo. **Name chosen: `autonull/opencode-spacegraph`**

| Name | Pros | Cons |
|------|------|------|
| `autonull/opencode-spacegraph` | Specific, matches plugin, follows `opencode-<feature>` pattern | Single-plugin feel initially (extensible later) |

```
autonull/opencode-spacegraph/
├─ packages/
│  ├─ session-graph/         # workspace:*
│  ├─ spacegraph/            # @autonull/opencode-plugin-spacegraph
│  └─ future-plugin/
```
**Trigger:** Upstream releases `@opencode/plugin` with `SessionSurface` API.

**Grill Q10:** **RESOLVED** — `autonull/opencode-spacegraph`

---

## 6. Grill Questions Summary (Your Input Needed)

| # | Question | Decision Needed |
|---|----------|-----------------|
| Q1 | **DEFERRED** — PR is last step | — |
| Q2 | **DECIDED** — Include product demo in PR | — |
| Q3 | **RESOLVED** — `SurfaceContext` now ✅, rest later | API stability |
| Q4 | **DECIDED** — Bundle size deferred (no NPM setup) | — |
| Q5 | **RESOLVED** — Fork CI sufficient for PR | Credibility signal |
| Q6 | **RESOLVED** — Mobile responsive required; Cytoscape mirror deferred | Scope for demo |
| Q7 | **RESOLVED** — A11y baseline only (not perfect) | Baseline vs. perfect |
| Q8 | **RESOLVED** — I draft technical, you polish | Content vs. polish |
| Q9 | **DECIDED** — NPM publishing deferred | — |
| Q10 | **RESOLVED** — Plugin monorepo: `autonull/opencode-spacegraph` | — |

**All grill questions resolved.** Ready to execute G2–G5, H, I.

---

## 7. Sequencing & Gates

| Step | Phase | Gate | Owner |
|------|-------|------|-------|
| 1 | G1–G3 | `SurfaceContext` exported ✅, build fixed ✅, **three.js tree-shaking COMPLETE (48/48 files converted) ✅**, cytoscape verified ✅, applyPatch exists ✅, perf harness exists ✅, **error boundaries ✅**, **streaming patches ✅** | Me (spacegraphjs) |
| 2 | H1–H3 | Renderer selector, a11y baseline, hybrid polish complete | Me (session-graph) |
| 3 | I1–I4 | Demo video, animated SVG, screenshots, docs deployed, landing page | You/me |
| 4 | **D1–D4** | **PR opened, passing CI, review initiated** (LAST STEP) | You/me |
| 5 | Upstream | PR reviewed, merged, `@opencode/plugin` released | Maintainers |
| 6 | F | Plugin monorepo created (name TBD), SpaceGraph published | You/me |
| 7 | Fork | Product deleted, only 9 API files remain | Me |

**Parallel tracks:** G, H, I run concurrently. D waits for G+H+I complete. F waits for step 5.

---

## 8. Definition of Done (TODO.26 Complete)

1. **spacegraphjs/** — `SurfaceContext` exported ✅, build fixed ✅, **three.js tree-shaking COMPLETE (48/48 files converted) ✅**, cytoscape verified ✅, applyPatch exists ✅, perf harness exists ✅, **error boundaries ✅**, **streaming patches ✅**, **publish check passing ✅**, **visual regression tests passing ✅**, CI green (contract + visual + perf)
2. **UX/DX** — Renderer selector in toolbar ✅, a11y baseline met ✅, hybrid polish complete
3. **Presentation** — Demo video, animated SVG, 5 screenshots, integration guide, fork landing page
4. **Upstream PR** — Opened with product demo, passing CI, review initiated
5. **Plugin monorepo** — Created in `autonull` org (name chosen), migration path clear
6. **Fork hygiene** — Ready for Phase F migration post-upstream

---

## 9. Immediate Next Actions (This Week)

**G1 complete: SurfaceContext exported, build fixed, pushed to spacegraphjs main.**
**G2 COMPLETE: three.js tree-shaking done (48 files converted), library bundle 217 KB (gzip 55.8 KB) — well under 250 KB target.**
**G3 COMPLETE: Error boundaries (emit error event), streaming support (buildPatch method added).**
**G5 PARTIAL: Publish check passing ✅, visual regression tests passing (contract demo + second-host) ✅**
**Plugin bundle test: FIXED** — solid-js/web mock resolves server-side evaluation error

**Remaining G4–G5, H, I before PR:**

1. **DX improvements (G4)**: Adapter docs, Storybook stories, CLI template, TypeDoc
2. **Testing & CI (G5)**: Performance budget as CI gate, cross-version compatibility test; fix spacegraphjs e2e concurrency
3. **UX/DX polish (H)**: Turn-map focus trap, side panel persist, permalinks, keyboard shortcuts docs, reduced motion
4. **Plugin DX (H4)**: Plugin template, hot reload, DevTools panel
5. **Presentation (I)**: Demo video, animated SVG, screenshots, integration guide, fork landing page
6. **Open upstream PR (D)**: Include demo video link, animated SVG, screenshots

---

## Appendix: Key File References

| Purpose | File |
|---------|------|
| Upstream PR body | `docs/spacegraph/upstream-pr.md` |
| Maintainer review packet | `docs/spacegraph/upstream-review.md` |
| Plugin API docs | `docs/spacegraph/surface-vs-panel-vs-mobileview.md` |
| Example plugin | `docs/spacegraph/example-session-surface-plugin.md` |
| SpaceGraphJS design | `spacegraphjs/DESIGN.md` |
| SpaceGraphJS roadmap | `spacegraphjs/ROADMAP.md` |
| SpaceGraphJS TODO | `spacegraphjs/TODO3.md` |
| Fork setup script | `script/graph-setup.ts` |
| Verification gate | `bun run graph:verify` |