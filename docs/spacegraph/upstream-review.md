# SpaceGraph upstream review packet

**Target:** `anomalyco/opencode` `dev` branch
**Fork:** `dev` synced with upstream @ `ba06ff9e0b` (merge `f802f5e707`)
**Library:** `spacegraphjs` @ `5abf80d` (contract v2, depth spectrum)
**Status:** Experimental feature flag off by default; ready for maintainer review

---

## 1. The problem

OpenCode's transcript is the dependable baseline. As agent sessions grow (100+ messages, multiple tools, subagents, retries), answering investigative questions becomes expensive:

- Why did the agent change `src/auth/session.ts`?
- Which tool calls led to the failing test?
- What did the subagent contribute?
- What changed after the failing test?
- Where did the agent retry or change direction?

Linear scrolling through messages forces the user to reconstruct causal relationships mentally. The transcript shows *what happened*; the graph shows *how it connects*.

---

## 2. The hypothesis

> When agent activity becomes sufficiently complex, spatial navigation through relationships is more effective than linear navigation through messages.

**Success criteria (R7.3 protocol):**
- n ≥ 5 counterbalanced users
- 5 investigative tasks, once per mode (transcript vs graph)
- Measure: task success, time, wrong turns, interactions, preference (1–7)
- Protocol defined in `prototype.md` §"Evaluation protocol" — **not yet executed**

A negative result, honestly recorded, is a valid and publishable outcome. The library remains the deliverable regardless.

---

## 3. What changed (the diff)

### 3.1 Packages added (OpenCode monorepo)
| Package | Purpose | Lines | Tests |
|---|---|---|---|
| `packages/session-ui/src/graph/` | Pure graph model, levels, layout, selectors, representations | 3,487 | 74 unit |
| `packages/session-graph/` | Canvas, toolbar, inspector, breadcrumbs, search, minimap, a11y, turn-map overlay | 5,660 | 49 unit + 37 component |
| `packages/gui-extensions/src/session-map/` | Side panel SVG overview (opt-in) | 274 | — |

### 3.2 App integration (feature-flagged, off by default)
| File | Change |
|---|---|
| `packages/app/src/settings/model.tsx` | `experimental.sessionGraph` setting (default `false`) |
| `packages/app/src/session/header/session-graph-toggle.tsx` | Toggle hidden when flag off |
| `packages/app/src/session/commands/use-session-commands.tsx` | Graph commands disabled when flag off |
| `packages/app/src/session/screen.tsx` | Conditional graph mode branch; a `#graph:` permalink opens the graph |
| `packages/app/src/session/graph/` | Lazy wrapper + turn-map overlay + mode switch + the permalink format + the dry-run counter |
| `packages/app/src/settings/experimental/experimental.tsx` | Settings UI for the flag |

### 3.3 Library (SpaceGraphJS, sibling repo, not vendored)
| Package | Purpose |
|---|---|
| `@spacegraphjs/renderer` | Contract types + version negotiation (zero deps) |
| `@spacegraphjs/adapter` | Host-agnostic model → `RenderModel` pipeline + conformance suite (contract only) |
| `@spacegraphjs/spacegraph-renderer` | 2D + 3D WebGL adapter (Three.js) |
| `@spacegraphjs/cytoscape-renderer` | 2D Cytoscape.js adapter |
| `@spacegraphjs/svg-renderer` | Static SVG export + inline subgraph |
| `spacegraphjs` (core) | Layout, levels, zoom bands, a11y, navigation, control, builder |

### 3.4 Linkage
- OpenCode consumes `spacegraphjs/*` as source workspaces (gitignored sibling repo, pinned SHA)
- **Upstream adoption requires published packages** (T4.2) or a bundled companion package
- No protocol, server, or session-schema changes

---

## 4. Measured results

| Metric | Budget | Measured |
|---|---|---|
| Model build (300 msgs / 1201 nodes) | < 50 ms / 200 msgs | ~27 ms (guard ceiling 250 ms) |
| Lazy SpaceGraph chunk (gzip) | < 400 KB | 282 KB (incl. `three`) |
| Lazy Cytoscape chunk (gzip) | < 250 KB | 138 KB |
| Session entry delta (T0.7) | No measurable regression | +1.43 KB entry, -5.81 KB route, +37.55 KB lazy graph chunk |
| First graph paint / pan fps | < 500 ms / 60 fps | **Unmeasured** — no harness |

**Evaluation protocol (R7.3):** Not yet executed. Requires human participants.

---

## 5. Diff budget audit (T3.8)

Re-audited 2026-10-19 against the merge base with upstream `dev` (`594af423e8`). Every edit inside
`packages/app/src` and the core packages is listed with the reason it cannot live elsewhere.

### 5.1 App integration (`packages/app/src`, 20 files, +916/−36)

Re-audited 2026-10-20 against the current upstream `dev` (`d249607e90`), so the numbers are the
fork's own work and not upstream's. The 2026-10-19 audit said 16 files, +689/−36; the files below
are what the permalink, the interaction counter and the T6.5 edge cases added.

| File | Δ | Why it cannot live elsewhere |
|---|---|---|
| `session/graph/session-graph-view.tsx` | +180 | Lazy wrapper that turns session messages into a graph model. It is the only app file that knows graph semantics exist; it imports the model package and hands plain data to `@opencode/session-graph`. |
| `session/graph/graph-permalink.ts` | +55 | The `#graph:<node>` link format. A URL format is an app concern (the hash is the app's), and the format must be read by the session screen, the graph view, and the transcript's hash handling — three app files, one module. |
| `session/graph/graph-permalink.test.ts` | +45 | The link format's test. It sits with the format it pins. |
| `session/graph/graph-metrics-readout.tsx` | +51 | The dry-run counter's readout. It is a dev-only affordance of the session screen, so it belongs to the app, not to the graph package. |
| `session/graph/turn-map-overlay.tsx` | +68 | Hybrid affordance: mounts the overlay for one turn over the transcript. App-side because it owns the transcript routing. |
| `session/screen.tsx` | +92/−6 | The transcript/graph branch. Routing belongs to the screen; a graph mode is a sibling of the timeline. It also opens the graph on a permalink and mounts the counter's readout. |
| `session/header/session-graph-toggle.tsx` | +61 | Header chrome for the mode switch. |
| `session/commands/use-session-commands.tsx` | +73/−24 | Command registration and keybinds (`mod+alt+t` for the turn map). |
| `session/use-session-hash-scroll.ts` | +5 | The transcript's hash handling ignores a graph permalink, so leaving the graph keeps the position the transcript restores. Three lines of glue in the file that owns the hash. |
| `settings/model.tsx` | +108/−4 | The `experimental.sessionGraph` setting, in the settings model that persists all settings. The bulk of the delta is the settings schema, not graph code. |
| `settings/experimental/experimental.tsx` | +17/−1 | The toggle in the experimental settings surface. |
| `settings/model.test.ts` | +3 | Test for the new setting's default. |
| `shell/state/layout.tsx` | +86 | Per-session graph state (mode, renderer, depth, representation, selection) in the persisted layout store. Persisted UI state belongs to the layout store. |
| `session/model.ts` | +1 | Exposes the graph state through the session model. |
| `session/session-layout.ts` | +1 | Same, one line. |
| `session/timeline/virtualizer.tsx` | +24/−1 | Restores the transcript scroll offset when the timeline is detached for graph mode and reattached. The virtualizer owns scroll position. |
| `session/timeline/interaction.ts` | +2 | Exposes the message at the top of the viewport, so the map panel can follow what the user reads. |
| `runtime/extension/mobile.tsx` | +17 | Mobile entry point (T1.4): narrow screens have no header slot for the toggle. |
| `runtime/extension/mounted-session.ts` | +17 | Binds the routed transcript into the extension SDK (see 5.3). |
| `runtime/i18n/en.ts` | +10 | Copy for the commands, the error states and the settings toggle. |

**No graph semantics leak into app-core files.** Only `session/graph/*.tsx` imports
`@opencode/session-ui/graph`; everything else touches the mode, the setting, the commands, the
scroll position, or the URL.

### 5.2 Dev-only demo (excluded from an upstream diff)

`entry.graph-dev.tsx` (+140), `graph-dev.html` (+20), `vite.config.ts` (+43/−18) implement
`bun run graph:dev`, the provider-free review demo. They are excluded from the upstream diff: the
demo is a review artifact, not product code.

### 5.3 Core packages (new packages, no upstream edits)

| Package | Δ | Note |
|---|---|---|
| `packages/session-ui/src/graph/` | +4,039 (18 files) | Pure model: ids, turns, levels, layout, selectors, representations. No DOM, no renderer dependency. |
| `packages/session-graph/` | +6,924 (69 files) | Host UI: canvas, toolbar, inspector, breadcrumbs, search, minimap, a11y, turn-map overlay. Imports the renderer contract only. |
| `packages/gui-extensions/src/session-map/` | +244 (5 files) | Side-panel overview, mounted as a built-in extension. The `TranscriptScreen` addition to the extension SDK (`+22`) gives a panel a way to link a map node back to its message. |
| `packages/ui/src/i18n/en.ts` | +158 | Shared UI copy for the graph surfaces. |
| `packages/session-ui/src/timeline/projection.ts` | +10 | Publishes the message → owning-turn map the graph reads, from the same walk the timeline already does. One source of truth for turn ownership. |

### 5.4 Accepted exceptions

- **New settings surface** (`experimental.tsx`, +17) — required for the feature flag.
- **Mobile entry** (`mobile.tsx`, +17) — the I4.10 decision: narrow screens get the toggle in the
  mobile tab bar instead of the header.
- **Transcript binding in the extension SDK** (+22) — a panel needs to reveal a message and to follow
  the user's position; the alternative is for the panel to reach into the timeline, which the SDK
  forbids.
- **Scroll-restore in the virtualizer** (+24) — the transcript must come back where the user left it
  (T1.5). The alternative is a wrapper that re-implements scroll tracking.

---

## 6. Feature flag and rollback

- **Flag:** `experimental.sessionGraph` (default `false`)
- **Rollback:** Flip flag to `false` → graph UI hidden, commands disabled, lazy chunk never loads
- **No migration needed:** Session data unchanged; graph is derived on demand
- **No schema changes:** Graph built from existing session messages + turn diffs

---

## 7. Performance and bundle numbers

| Chunk | Upstream `ba06ff9e0b` | Merged `f802f5e707` | Δ |
|---|---|---|---|
| App entry `index-*.js` | 654.66 KB (gzip 201.30) | 656.09 KB (gzip 201.62) | +1.43 KB |
| Session route `route-*.js` | 361.12 KB (gzip 109.18) | 355.31 KB (gzip 106.88) | -5.81 KB |
| Graph view `graph-*.js` (lazy) | — | 37.55 KB (gzip 11.82) | +37.55 KB (lazy only) |

The graph is a separate lazy chunk referenced from the route's import map. Initial-load delta is within bundler re-split noise (±6 KB).

---

## 8. Accessibility

- **Library layer:** `spacegraphjs/test/a11y.test.ts` — roving tabindex, Arrow/Home/End, Enter/Space, Escape, `aria-live` announcements
- **Browser traversal:** `packages/session-graph/component-tests/graph-a11y.spec.ts` — walks hidden mirror to node, activates with Enter, asserts inspector under both adapters
- **Reduced motion:** Emulated in capture spec; adapter camera animation has no dedicated assertion
- **Edges (T4.7, decided):** the mirror announces edges. The library layer takes the connections
  (`setEdges`) and lists them beside the nodes, and announces the ones of the selected node through
  the host's `edgeAnnouncer`. The host composes the connection text, so the announcement is
  localized; the edge kind itself is the model's own vocabulary and is not translated.

---

## 9. Security and escaping (T6.7)

**Attack surfaces tested:**
- Hostile file paths: `<script>`, `<img onerror>`, `javascript:` URLs
- Bidirectional overrides: `U+202E` (RTL override) in paths/labels
- Tool output containing markup

**Sanitization contract:**
| Surface | Sanitizer | Location |
|---|---|---|
| Card markup (`renderCard`) | `escapeHtml` | `packages/session-graph/src/canvas/buildRenderModel.ts:376` |
| Band markup (`renderBand`) | `escapeHtml` | Same |
| Axis labels | `escapeHtml` | Same |
| Inspector detail | Host-owned (OpenCode uses i18n + escaped strings) | `GraphInspector.tsx` |
| SVG export | `@spacegraphjs/svg-renderer` escapes all text nodes | `packages/svg-renderer/src/index.ts` |
| JSON round-trip | `serializeRenderModel`/`parseRenderModel` preserve strings | `@spacegraphjs/svg-renderer` |

The full contract, including what is deliberately *not* neutralized (`javascript:` URLs, bidi
overrides, raw text in the JSON export), is in **`docs/spacegraph/security.md`**.

**CSP expectations:**
- SpaceGraph adapter: `script-src 'self' 'unsafe-eval'` (Three.js compiles shaders at runtime),
  `style-src 'self' 'unsafe-inline'` (CSS3D cards), `img-src 'self' data: blob:`
- Cytoscape adapter: `script-src 'self'`, `style-src 'self' 'unsafe-inline'`
- SVG renderer: static markup, no script; safe under `default-src 'none'`

**Test coverage (T6.7):**
- `packages/session-graph/src/canvas/security.test.ts` — 13 unit tests: the escaping contract for
  cards, bands, axis captions, SVG export and the JSON round-trip.
- `packages/session-graph/component-tests/security.spec.ts` — end-to-end in the real adapters: a
  story whose label, summary and tool command carry hostile markup; asserts nothing executed, no
  payload element reached the DOM, and the payload is still readable as text — in the SpaceGraph
  canvas, in the Cytoscape overlay and in the inspector.

```bash
cd packages/session-graph && bun test src/canvas/security.test.ts
cd packages/session-graph && bun run test:components -- security
```

---

## 10. Maintenance ownership

| Area | Owner | Notes |
|---|---|---|
| Graph model (`session-ui/graph`) | OpenCode team | Pure TS, no renderer deps |
| Host UI (`session-graph`) | OpenCode team | Solid components, imports contract only |
| Library core (`spacegraphjs`) | SpaceGraphJS maintainers | Generic primitives, zero session vocabulary |
| Renderer adapters | SpaceGraphJS maintainers | Contract-bound, versioned independently |
| App integration | OpenCode team | Feature flag, lazy wrapper, commands |

**Bus factor:** SpaceGraphJS is a separate repo with its own maintainers. OpenCode fork pins SHA; upgrades are intentional.

---

## 11. Exact review commands

```bash
# Full verification gate (canonical)
bun run graph:verify

# Focused checks
cd packages/session-ui && bun test src/graph
cd packages/session-graph && bun run typecheck && bun test src && bun run test:components
cd packages/app && bun run test:e2e -- e2e/graph/session-graph.spec.ts
cd spacegraphjs && pnpm exec vitest run && bun run test:boundaries

# Provider-free demo (no model provider needed)
bun run graph:dev

# Regenerate and inspect screenshots
bun run graph:capture --mode=compare
```

---

## 12. Review questions for maintainers

1. **Is the hypothesis worth testing?** The R7.3 protocol is defined but not executed. A negative result ends the graph track as a product bet; the library remains.

2. **Is the diff budget acceptable?** The flag/settings work is only justified by a positive or promising R7.3 result. Without it, only the library and side panel (H6.5, approval-gated) remain.

3. **Is the library linkage acceptable?** Current: source workspace (gitignored sibling). Upstream options:
   - A. Publish packages to npm (T4.2) — cleanest adoption
   - B. Bundled companion package with contract + adapters — no source workspace
   - C. Extension panel only (H6.5) — minimal diff, no library dependency

4. **Are the known limitations acceptable?** See `prototype.md` §"Known limitations" (20 items, explicitly carried forward) and §"Edge cases" (the cases a real session produces that the fixture does not). The library's own limits — the mesh outline, the depth fade, the DOM card path — are declared in `spacegraphjs/docs/limitations.md`.

5. **Is the hybrid ladder the right adoption path?** Four rungs (T3.7):
   1. `session-ui` graph model + tests (pure, no UI)
   2. `session-graph` package + canvas + inspector, feature-flagged
   3. App wiring: setting, mode branch, commands, toggle
   4. Optional extension panel / hybrid affordance

---

## 13. Links

- **Prototype write-up:** `docs/spacegraph/prototype.md`
- **Visual review (per-image evidence):** `docs/spacegraph/visual-review.md`
- **Design argument:** `SPACEGRAPH.md`
- **Living plan:** `SPACEGRAPH.TODO.2.md`
- **Library docs:** `spacegraphjs/README.md`, `spacegraphjs/docs/host-integration.md`
- **Demo (library contract):** `spacegraphjs/demo/contract.html` (to be deployed via GitHub Pages)
- **Demo (second host):** `spacegraphjs/demo/second-host.html` — a framework-free consumer outside
  OpenCode; every generic module runs against a model of its own, and the library's CI proves it
- **Demo (OpenCode host):** `bun run graph:dev`