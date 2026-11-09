# SpaceGraph for OpenCode — Development Plan (v33)

> **Goal:** Enable the paradigm shift, not just polish the prototype. Move the graph from a
> post-hoc viewer toward a live spatial surface for understanding and steering agent work, prove it
> in the fork, then make it installable without the fork.
>
> **Priority ladder (hard ordering, 2026-11-09):**
> 1. **Code** — foundation, paradigm capabilities, fork exit. Includes the minimal library boundary.
> 2. **Video work** — clip-based, assembled. **No music, no extra SFX.**
> 3. **Recruiting / human studies** — only after the code and video gates pass.
>
> Supersedes `SPACEGRAPH.TODO.32.md`.

**Directives:**

1. **Code before video; video before studies.** A lower tier never displaces a higher tier.
2. **SpaceGraphJS stays a separate repository.** Do not modify it for OpenCode's sake. Lift a
   capability into it only when it is genuinely generic and OpenCode actually needs it. Do not start
   Hermes Agent or Pi Agent work; only anticipate what they will need (recorded here, not built).
3. **No more hand-written API docs in SpaceGraphJS.** The code speaks; `pnpm run docs` (TypeDoc)
   generates the reference when needed.
4. **No new music, no extra SFX.** One voice and captions. No music bed, no transition stingers, no
   pitch/formant effects. The `demo-kidnapper.*` path is retired and not regenerated.
5. **Media stays gitignored.** Generated captures, narration, TTS cache, renders, and manifests live
   under `docs/spacegraph/video/` (gitignored). Attach renders to a PR/release; never commit them.
   The clip manifest and storyboard are tracked (they are sources, not media).
6. **Fixed lists, fixed sizes.** New asks go to TODO.34.
7. **Additive change, zero loss.** No file, feature, or branch is deleted, overwritten, merged, or
   force-pushed. Existing tests stay green unmodified. Explicit configs keep working.
8. **Consolidated verification.** Package-targeted commands during iteration; one root
   `bun run check`, one `dist/` rebuild, one component-suite run at each phase exit.
9. **Defer publish.**

---

## Status (2026-11-09, r0)

Inherits the r36 state of TODO.32: Phases 0′–6 complete; capture gate 64/64; component suite green;
plugin bundle 3/3; typecheck clean. The r35 demo video is rejected for sharing. This revision
replaces the "library enablement" framing with **paradigm enablement** and **fork exit**, and makes
the video clip-based.

---

## §A — Ground truth

### A.1 New and re-verified findings (read from the tree, 2026-11-09)

| # | Fact | Evidence |
|---|---|---|
| 27 | **`spacegraphjs` is a gitlink with no `.gitmodules`.** `git submodule status` fails: "no submodule mapping found in .gitmodules for path 'spacegraphjs'". Local dev resolves through the root workspace, but a fresh clone cannot fetch the library. | `git ls-tree HEAD spacegraphjs` → `160000 commit 4465f41…`; `git submodule status`; root `package.json:46-47` |
| 28 | **The working tree is clean and tracked.** `git status --short` is empty; `SPACEGRAPH.md` and the TODO files are tracked on `upstream-dev-sync`. The §A.4 hard rules of TODO.32 stay in force, but the emergency posture can relax to normal review. | `git status --short` empty, 2026-11-09 |
| 29 | **Phase 7 library items are committed.** `ForceCore` convergence (`3eb35ca`), Barnes-Hut octree (`24ae7ab`), size-aware `SpectralLayout` post-pass (`1efe91a`) are in `spacegraphjs` at `4465f41`. | `git -C spacegraphjs log --oneline -8` |
| 30 | **Depth modes still tolerate 50% pixel diff.** `06-graph-3d`, `12-graph-hierarchy`, `18-graph-layered`, `19-graph-depth-stack` pass at 50% `maxDiffPercent`. Tolerance is a smoke alarm, not correctness. | `docs/spacegraph/capture-overrides.json` |
| 31 | **Demo narration is a control tour.** The 42 manifest entries each describe a UI mode ("Switch to Execution level…", "Timeline layout arranges nodes…"), not a reason to care. | `docs/spacegraph/demo-manifest.json` |
| 32 | **The live-capture flow is Windows-path flavored and beacon-timed.** `capture-live.spec.ts` hardcodes `C:/OpenCode/SessionGraph`; timing depends on a white-flash luma probe. | `packages/app/e2e/graph/capture-live.spec.ts:12,26-27`; `script/generate-demo-video.ts` `detectBeacon` |
| 33 | **The spacegraph plugin is already a GUI plugin.** It imports `@opencode/plugin/gui` (`SetupContext`, `MountedSession`) and reads synced data through `session.server.data.session.message.list(session.id)` / `.status(...)`. `server.data` is `Data` from `@opencode/client/solid`. | `packages/gui-plugins/src/spacegraph/model.ts:1-31`; `packages/plugin/src/gui/host-apis.ts:1,25` |
| 34 | **The fork dependency is the graph packages, not the data API.** `@opencode/session-ui/graph` (build/layout/selectors) is `private: true` and the graph module is a fork addition; `@opencode/session-graph` (host UI) is a fork package. They are bundled into the in-repo plugin. The GUI plugin API itself is in `packages/plugin`. | `packages/session-ui/package.json:2-4`; `packages/session-graph/package.json:3`; TODO.32 §A.4 |
| 35 | **The plugin API already anticipates a session map.** `TranscriptScreen` documents "A surface that draws a session map uses it to link a map node back to its message". | `packages/plugin/src/gui/host-apis.ts` (`TranscriptScreen`) |
| 36 | **`buildGraph` needs only messages + status.** The plugin calls `buildGraph({ messages, status })`; the workspace snapshot is optional enrichment. Both inputs are available from `server.data`. | `packages/gui-plugins/src/spacegraph/model.ts:22-29`; `packages/session-ui/src/graph/build.ts:8-10` |
| 37 | **`useGroupBadgeAnimation` and `GraphCanvas` are the reactive hot spots.** F10 lived in `packages/session-graph/src/ui/useGroupBadgeAnimation.ts`; F3 in `packages/session-graph/src/canvas/GraphCanvas.tsx`. | same paths |

### A.2 Scope guard

- Phase 9 is reliability and hygiene only.
- Phase 10 is the smallest set of paradigm prototypes that could change how people work; each has a
  kill criterion.
- Phase 11 is distribution, not features.
- Phase 12 is a boundary, not a build-out of the library.
- Phase 13 is one storyboard, one clip set, one output ladder.
- Nothing here reopens Vision/ONNX weights, publish, or 3D orbit as a product feature.

---

## §B — The paradigm shift, and the fork

### B.1 What we have demonstrated, and what we have not

The prototype demonstrates a **session viewer**: a map of what happened, openable after the fact.
That is a real improvement over a transcript, but it is not yet the paradigm shift. What we have only
begun to show:

| Demonstrated | Only begun |
|---|---|
| Overview/execution/detail levels | The map present **during** a run, shaping decisions |
| Causal edges and a "Why?" trace | The graph as the **primary navigation loop**, not a lookup |
| Delegation nodes | **Fractal drill-down** into a subagent's own graph |
| Deterministic append-only layout | **Spatial memory** across sessions and visits |
| Permalinks and PR-embedded SVG | The map **influencing** the model (graph-guided compaction) |
| Vision-closed loops in the library | The interface verifying and correcting itself in the host |

### B.2 The three shifts worth enabling

1. **Viewer → cockpit.** The map is present while the agent works. You watch structure form, click a
   failing branch, and intervene. The graph becomes the place you steer from, not the flight recorder
   you read afterward. *Enabler: live/incremental updates that do not destroy layout or camera.*
2. **Session → work memory.** "Where I left off" becomes a place, not a scroll position. Positions,
   selection, and level persist across visits and sessions because node IDs are stable.
   *Enabler: serialize/restore positions keyed by stable IDs.*
3. **Log → causal graph.** Navigation follows evidence, delegation, and provenance. The graph can
   answer "why" and "what changed after", and can drive what the model keeps (the "why") versus drops
   (the "what"). *Enabler: first-class trace navigation; a compaction spike measured on the fixture.*

### B.3 Why a fork, and how we leave it

**Why the fork exists today.** The plugin is already a GUI plugin, and the GUI plugin host already
exposes the synced session data it needs (`server.data` from `@opencode/client/solid`). The fork is
needed because the graph's pure model (`@opencode/session-ui/graph`) and host UI
(`@opencode/session-graph`) are **private packages that live only in this fork** and are bundled into
the in-repo plugin. An upstream OpenCode cannot resolve them. The fork is also where we prototype data
needs (streaming deltas, file-diff enrichment) before proposing any host contract.

**The ideal.** A standalone GUI plugin that depends only on public APIs — `@opencode/plugin/gui`,
`@opencode/client/solid`, and its own rendering packages — installable on upstream OpenCode with no
fork. The plugin API already anticipates this: `TranscriptScreen` documents a surface that draws a
session map.

**The exit rule.** Fork only for what the plugin API cannot yet express. Track that delta in one
file. When the plugin can be installed on an upstream checkout and render a real session, the fork
demotes to a development harness. Do not fork to add UI.

### B.4 What "enabling" means concretely

A paradigm capability is enabled only when all three are true:
1. **An engineering enabler exists** — the data and renderer path can support it (live deltas, stable
   IDs, serialized positions, trace selectors).
2. **It has a demonstrable beat** — one clip shows the difference in under 20 seconds.
3. **It has a kill criterion** — a measured reason to stop if it does not pay off.

Phase 10 applies this test to each candidate. Capabilities that pass are kept; the rest are parked.

---

## Phase 9 — Foundation: reliability and hygiene (P0)

### 9.1 Reactive signal discipline

The two worst bugs were self-invalidating SolidJS effects: an effect that wrote a signal it read
(F10), and a camera effect that re-entered through `viewportChange` (F3). Both were found by capture
flakiness, not by a guard.

- [ ] **Document the rule** in `packages/session-graph/AGENTS.md`: an effect never writes a signal it
      reads; prefer `createMemo`; every timer/subscription registers `onCleanup`; extract pure
      reactive logic and unit-test it.
- [ ] **Audit the seed files** — `packages/session-graph/src/ui/useGroupBadgeAnimation.ts` and
      `packages/session-graph/src/canvas/GraphCanvas.tsx` — and record the result.
- [ ] **Add a dev-only guard** that logs once when an effect writes a signal during its own run. No
      production cost; no new dependency if Solid exposes a tracker.
- [ ] **Regression tests:** badge hook runs once per count change; depth applies once per projection
      change. Extend existing coverage; do not duplicate.

**Exit:** rule documented; guard fires on a deliberate test-only case; 92 unit + 55 component tests
green unmodified.

### 9.2 Repository and submodule hygiene

- [ ] **Resolve the gitlink** (§A.1 #27). Either add a proper `.gitmodules` (and document
      `git submodule update --init`), or record a documented vendored-workspace mode with the pinned
      commit `4465f41…`. Prefer the submodule if the library repo has a stable clone URL.
- [ ] **Fail loudly** in `script/graph-setup.ts` (or the setup doc) when `spacegraphjs/` is empty or
      the mapping is missing.
- [ ] **Verify** a fresh clone reaches a working library without guessing.

### 9.3 Depth-mode visual quality

- [ ] **Reproduce** the four overridden frames at head and grade the defect.
- [ ] **Fix in the renderer/host**, not by tolerance:
      - `18`/`19` — plane shear and card overlap: card-facing and depth fade.
      - `12` — hierarchy collapse to one column: sub-layout policy.
      - `06` — orbit plane shear: keep orbit experimental and label it.
- [ ] **Lower overrides to ≤10%**, delete stable ones. Keep at most one (the experimental orbit frame),
      with a written reason.

### 9.4 Capture determinism

- [ ] **Remove host paths** from `capture-live.spec.ts`; source `directory` from the fixture or env.
- [ ] **Do not widen the flaky filter.** If a known-flaky error still appears, file a new F-number.
- [ ] **Prefer a deterministic start signal** (DOM event or first-frame marker) over luma beacon
      detection; keep the luma fallback.

### 9.5 Verification (Phase 9 exit, once)

`cd packages/session-graph && bun run test && bun run test:components`;
`cd packages/app && bun run test:e2e:built -- e2e/graph/capture.spec.ts`; root `bun run check`.

---

## Phase 10 — Paradigm enablement in the fork (P0/P1)

Each item states its enabler, its demo beat, and its kill criterion. Only items that pass are kept.
Nothing here is lifted into SpaceGraphJS unless it is generic and OpenCode actually needs it.

### 10.1 Live map during a run (viewer → cockpit)

- [ ] **Enabler:** subscribe to session data changes and update the graph **incrementally** without
      resetting layout or camera. `buildGraph` is a pure transform over messages + status; memoize
      turns and reuse the append-only layout for unchanged IDs.
- [ ] **Demo beat:** watch a turn appear, expand its phase cluster, and see a failure flash while the
      agent is still working.
- [ ] **Kill:** if incremental update is unstable or slow on the 5,001-message fixture, fall back to
      periodic rebuild with a visible busy state and document the limit.

### 10.2 Causal navigation loop ("Why?")

- [ ] **Enabler:** make "Why?" the primary action on an error/retry; walk evidence edges; keep a
      breadcrumb of the chain; return to the start. Use the existing `forwardChain`/`why` selectors.
- [ ] **Demo beat:** click a failed test, follow the evidence chain to the tool call, then to the fix.
- [ ] **Kill:** if the chain is ambiguous on the canonical fixture, show the ambiguity instead of
      pretending; keep the trace as an inspection aid.

### 10.3 Fractal drill-down (overview → detail as a spatial move)

- [ ] **Enabler:** double-click a turn or subagent to enter its subgraph (use `turnSubgraph`), with a
      breadcrumb and a stable return. Preserve camera and selection across the move.
- [ ] **Demo beat:** enter a subagent's own map, inspect it, and return to the parent at the same
      place.
- [ ] **Kill:** if the subgraph loses the parent context and confuses, keep the trace and drop the
      drill-down.

### 10.4 Spatial memory across visits (spike)

- [ ] **Enabler:** persist positions and selection keyed by stable node IDs; restore on revisit.
      Use the library's `getPositions`/`serializePositions` (already shipped).
- [ ] **Demo beat:** leave a session, return, and land in the same place.
- [ ] **Kill:** if restore drifts on changed turns or costs too much, keep session-local memory only.

### 10.5 Graph-guided compaction (research spike)

- [ ] **Enabler:** use phases and edges to indicate what to keep ("why" nodes: errors, decisions,
      fixes) versus drop ("what" nodes: redundant reads/outputs). Prototype against the canonical
      fixture; do not ship without evidence.
- [ ] **Demo beat:** show a long session compacted while its decision spine stays navigable.
- [ ] **Kill:** if it does not beat baseline compaction on the fixture, park it and record the result.
      This is the one place the map influences the model, so it is worth one honest spike.

### 10.6 Shareable artifacts (finish what exists)

- [ ] **Enabler:** permalinks and PR-embedded SVG open the right node and level; keep them stable.
- [ ] **Demo beat:** paste a `#graph:<node>` link and land on the exact decision.
- [ ] **Kill:** none; this is already shipped, just verify.

### 10.7 Verification (Phase 10 exit, once)

Component suite, capture gate, `bun run check`. Record which paradigm items passed and which were
parked, with the measured reason.

---

## Phase 11 — Fork exit and plugin readiness (P0)

**Gate:** starts after Phase 10, because the paradigm prototypes reveal the real data needs. The goal
is a plugin that installs on upstream OpenCode without the fork.

### 11.1 Inventory the delta

- [ ] **Write `docs/spacegraph/fork-delta.md` (one page).** Every import of a fork-only package
      (`@opencode/session-ui/graph`, `@opencode/session-graph`) and every plugin-API gap that a real
      session exposes. This is the only place the fork's justification lives.

### 11.2 Package the graph for a plugin

- [ ] **Make the plugin depend only on public APIs** — `@opencode/plugin/gui`,
      `@opencode/client/solid`, and its own rendering packages. Bundle the pure model + host UI into
      the plugin package (or publish them), instead of resolving private monorepo packages.
- [ ] **No server changes** unless a real session proves one is unavoidable; if so, propose the
      smallest upstream change and document it.

### 11.3 Prove it on upstream

- [ ] **Install the plugin into an upstream/dev checkout** without the fork packages and render a
      real session. Capture one frame as evidence.
- [ ] **Exercise the paradigm beats** that passed Phase 10 on upstream, not just in the fork.

### 11.4 Record what still needs the fork

- [ ] **If a gap remains** (e.g. a streaming delta or a file-diff field), record it in
      `fork-delta.md` as the only reason to keep the fork, with the upstream proposal. Do not add a
      compatibility shim or a second data path.

**Exit:** the plugin installs and renders a real session on upstream OpenCode; the fork delta is one
documented page; the fork is a development harness, not a requirement.

---

## Phase 12 — SpaceGraphJS boundary (P1)

SpaceGraphJS stays a separate repository. This phase is a boundary, not a build-out.

- [ ] **Pin and record** the library commit the fork consumes (`4465f41…`, or its successor). One
      gitlink bump per batch; host update in the same PR.
- [ ] **Lift only what is generic and needed.** If Phase 10 produced a genuinely host-neutral
      capability (e.g. an incremental-delta pattern), lift it to the library; otherwise keep it in the
      host. Do not touch the library for OpenCode-specific policy.
- [ ] **No hand-written API docs.** Keep `pnpm run docs` (TypeDoc) working; let the code speak.
- [ ] **Anticipate Hermes/Pi, do not build for them.** Record their likely needs in this plan's table
      below; do not add streaming contracts, third hosts, or dependent docs to the library.

**Anticipated dependent needs (recorded, not built):**

| Dependent need | What it likely requires | Build now? |
|---|---|---|
| Feed a live trace into a graph | A host-side delta loop; the library's append-only layout already fits | No — prove the pattern in OpenCode first |
| Keep stable spatial memory | `getPositions`/`serializePositions` (already shipped) | No — already available |
| Map a foreign trace to nodes/edges | `@spacegraphjs/adapter` `ModelAdapter` (already exists) | No — reuse |
| Host-owned detail UI | `@spacegraphjs/renderer` contract (already exists) | No — reuse |
| Streaming deltas as a first-class API | Maybe a `GraphFeed` concept | No — only if a second host actually asks |

**Exit:** library tests green; the fork consumes a pinned commit; no OpenCode-specific code or
hand-written API docs landed in the library.

---

## Phase 13 — Demo video, clip-based (P1)

**Gate:** start only after Phases 9–11 pass. **Audio: one voice and captions; no music, no SFX.**

### 13.1 Clips, not one continuous tour

- [ ] **Author a tracked clip manifest** `docs/spacegraph/demo/clips.json`: each clip has
      `{ id, title, purpose, captures, narration, optional titleCard }`. Media under
      `docs/spacegraph/video/` stays gitignored.
- [ ] **Record clips independently.** Each clip is a self-contained beat (≈8–20 s): a problem, a
      move, a payoff. Clips can be re-recorded without touching the others.
- [ ] **Assemble different cuts from the same clips.** The teaser, the social cut, and the full tour
      select subsets plus optional title screens and interstitials (text cards, a transcript-vs-graph
      diagram, a terminal snippet). Interstitials are content cards, not SFX.
- [ ] **Relax the script.** A clip needs a purpose and a payoff, not a literal question. Use a simple
      arc — problem → explore → act/verify — or topic buckets. Still avoid a layout tour; layout
      cycling is B-roll at most.

### 13.2 Capture and camera

- [ ] **Script the beats** through the renderer (`fit`, `focus`, `setViewport`, depth) so the camera
      moves on purpose.
- [ ] **No static holds** longer than ~0.5 s; pause during capture or apply a slow push-in/pan.
- [ ] **Show the input:** cursor ring / click ripple overlay, driven from the capture script.
- [ ] **Clean profile:** 1920×1080 or 2560×1440 downscaled, 60 fps, fixed dark theme, no dev banners,
      warnings, or notifications. `reducedMotion: false` only where a transition is the subject.
- [ ] **Keep transcript and map in frame** when the relationship is the point.

### 13.3 Audio and captions

- [ ] **One voice**, 1–2 sentences per clip, loudness-normalized to −14 LUFS.
- [ ] **No music bed. No transition SFX. No pitch/formant effects.** Remove the kidnapper branch from
      `script/generate-demo-video.ts`.
- [ ] **Burned-in captions or an SRT.** Captions are the accessibility floor.

### 13.4 Assembly and review

- [ ] **Assemble** with one script reading `clips.json`; insert title screens/interstitials; burn
      captions; mix one narration track.
- [ ] **Output ladder:** 30 s teaser (H.264 crf 18 + AV1/VP9), 90 s social, full tour (H.264 crf 20 +
      VP9).
- [ ] **Review gate:** watch-through with ≥3 people outside the project; ask "would you try this /
      what did it do?". Iterate the clips, not the encode.
- [ ] **Media stays gitignored;** attach renders to the PR/release or a static page.

**Exit:** all clips execute without flakiness; cuts assemble from the manifest; captions present;
loudness normalized; no music/SFX tracks; review notes recorded.

---

## Phase 14 — Human studies (P2, gated)

**Gate:** start only after Phase 13's review gate passes.

### 14.1 Readiness checklist

- [ ] Clips reviewed by ≥3 outsiders; notes recorded.
- [ ] Canonical fixture documented with expected answers to the five §1 questions.
- [ ] Consent, task scripts, and counterbalancing pre-authored.
- [ ] Analysis plan committed: success, time, wrong turns, interactions, preference.
- [ ] Stop rule pre-registered: n ≥ 5, counterbalanced, effect-size threshold.
- [ ] Both outcomes pre-authored: win → RFC with hybrid-as-entry; loss → publish the negative result,
      keep the library and the host-integration guide.

### 14.2 T2.2 execution

- [ ] Run n ≥ 5 on the canonical fixture.
- [ ] Report honestly, including a null result.
- [ ] Disposition: promote hybrid-as-entry, or park the graph behind the transcript with the evidence
      recorded.

---

## Phase 15 — Close-out

### 15.1 Verification matrix

| After | Command |
|---|---|
| 9 | `cd packages/session-graph && bun run test && bun run test:components`; `cd packages/app && bun run test:e2e:built -- e2e/graph/capture.spec.ts`; root `bun run check` |
| 10 | component suite; capture gate; `bun run check`; paradigm pass/park recorded |
| 11 | plugin installed on upstream; real session rendered; `fork-delta.md` complete |
| 12 | `cd spacegraphjs && pnpm test && pnpm run test:boundaries && pnpm run test:vision && pnpm run build`; root `bun run check` |
| 13 | clip manifest assembles all cuts; review gate passed |
| 14 | study recorded; disposition written |
| all | root `bun run check` |

### 15.2 Definition of done

- [ ] 9: signal rule documented and guarded; gitlink resolved and reproducible; depth overrides
      ≤10% (at most one intentional); capture deterministic.
- [ ] 10: at least the live map and the causal loop demonstrated; fractal drill-down and spatial
      memory attempted; graph-guided compaction spiked with an honest result.
- [ ] 11: plugin installs on upstream without the fork; delta documented.
- [ ] 12: library separate, pinned, auto-documented; nothing OpenCode-specific added; dependent needs
      recorded only.
- [ ] 13: clip manifest; assembled cuts; captions; one voice; no music/SFX; review gate passed.
- [ ] 14: study run and recorded, or re-deferred with the gate restated.
- [ ] 15: `SPACEGRAPH.md` references TODO.33; TODO.32 marked superseded; both tracked on the mainline.

### 15.3 Risks

| Risk | Mitigation |
|---|---|
| Paradigm phase becomes a feature spree | each item has a demo beat and a kill criterion; only passers are kept |
| Incremental live update destabilizes layout | append-only layout + stable IDs; fall back to periodic rebuild with a busy state |
| Fork exit is attempted before the data needs are known | Phase 11 starts after Phase 10; `fork-delta.md` is the single justification |
| Fork remains because of one hidden gap | record the gap and propose the smallest upstream change; no shim, no second data path |
| Library gets OpenCode-specific code | Phase 12 boundary: lift only generic, needed capabilities; no hand-written docs |
| Video drifts into a polish loop | fixed clip manifest + review gate; re-record clips, not the whole video |
| Studies start early under pressure | Phase 14 gate is explicit; a broken demo yields noise, not evidence |
| Scope creep into Vision/ONNX/publish | §A.2 guard; fixed lists; new asks go to TODO.34 |
| Media sneaks back into git | `.gitignore` covers `docs/spacegraph/video/`; PR checklist requires attach-not-commit |

### 15.4 Revision log

- **r0 (2026-11-09):** Initial TODO.33. Supersedes TODO.32 on the priority ladder.
  - Reframed around **paradigm enablement**, not library enablement: viewer → cockpit, session →
    work memory, log → causal graph (Phase 10).
  - Added the **fork question** and **fork exit** (Phase 11): the plugin is already a GUI plugin; the
    fork exists because the graph packages are private. Exit when the plugin installs upstream.
  - **SpaceGraphJS stays separate**; no hand-written API docs; no Hermes/Pi work, only anticipated
    needs recorded (Phase 12).
  - Video is now **clip-based and assembled**, with title screens/interstitials and a relaxed,
    purpose-driven script (Phase 13). **No music, no extra SFX**; kidnapper voice retired.
  - New findings: gitlink without `.gitmodules` (#27), plugin already on the GUI API (#33), fork
    dependency is the graph packages (#34), plugin API anticipates a map (#35).

---

## Continuous improvement focus (carried forward)

### Immediate (Phase 9)
- [ ] Signal discipline: rule, audit, dev guard, regression tests
- [ ] Gitlink/submodule hygiene: decide, record, verify on fresh clone
- [ ] Depth modes: fix, lower overrides, delete stable ones
- [ ] Capture determinism: no host paths, no silent flake widening, robust start signal

### Next (Phases 10–11)
- [ ] Live map during a run (incremental, append-only)
- [ ] Causal navigation loop ("Why?")
- [ ] Fractal drill-down with breadcrumb
- [ ] Spatial memory across visits (spike)
- [ ] Graph-guided compaction (research spike, honest kill)
- [ ] Fork-delta inventory and plugin install on upstream

### Then (Phase 12)
- [ ] Library boundary: pinned commit, generic lifts only, auto-docs

### Then (Phase 13)
- [ ] Clip manifest; independent clips; assembled cuts; title screens
- [ ] One voice + captions; **no music, no SFX**
- [ ] Review gate with ≥3 outsiders

### Last (Phase 14)
- [ ] Readiness checklist
- [ ] T2.2 study run and disposition

### Parked
- Publish/release: deferred indefinitely — explicit user decision required
- Vision ONNX real weights; cross-session memory beyond the 10.4 spike; fractal ZUI beyond the 10.3
  drill-down; hybrid scroll e2e; Vision CI integration
- Hermes Agent / Pi Agent work: not started; needs recorded in Phase 12
- Grant Workspace dual-loader code fix: lives in that repo

---

## Known failures / debt

| ID | Area | Status | Note |
|---|---|---|---|
| F3 | e2e/capture depth | **FIXED (r35)** | keep the regression test; guard in 9.1 |
| F10 | plugin bundle badge loop | **FIXED (r35)** | seed file for 9.1 audit |
| — | depth overrides | **OPEN** | 4 frames at 50% tolerance → Phase 9.3 |
| — | gitlink without `.gitmodules` | **OPEN** | → Phase 9.2 |
| — | fork dependency on private graph packages | **OPEN** | → Phase 11 |
| — | demo is a tour, not a story | **OPEN** | → Phase 13 |
| F5 | `graph:verify` step 96 | likely fixed | confirm on the sync branch during Phase 9.5 |

---

## References

- `SPACEGRAPH.TODO.32.md` — superseded; its r35/r36 history is authoritative for what was fixed.
- `SPACEGRAPH.md` — design, §1 questions, §5/§16 plugin path.
- `packages/gui-plugins/src/spacegraph/model.ts` — plugin data access through `server.data`.
- `packages/plugin/src/gui/host-apis.ts` — GUI plugin API (`MountedSession`, `TranscriptScreen`).
- `packages/session-ui/src/graph/build.ts` — `buildGraph` input (messages + status).
- `docs/spacegraph/capture-overrides.json` — temporary pixel-diff debt (9.3).
- `docs/spacegraph/demo-manifest.json` — current narration, to be replaced by clips.
- `script/generate-demo-video.ts` — v2 generator; becomes a clip assembler; kidnapper branch removed.
- `packages/app/e2e/graph/capture-live.spec.ts` — live capture; remove host paths (9.4).
- `packages/session-graph/src/ui/useGroupBadgeAnimation.ts` — F10 seed (9.1).
- `packages/session-graph/src/canvas/GraphCanvas.tsx` — F3 seed (9.1).
- `spacegraphjs/` — separate repository; pinned commit `4465f41…`; no OpenCode-specific code.
