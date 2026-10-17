# Integrate SpaceGraphJS into OpenCode

SpaceGraphJS: https://github.com/autonull/spacegraphjs7

The opportunity is larger than simply improving OpenCode's visual layout. A zoomable graph could change the fundamental interaction model from reading what an agent did to exploring how and why it did it.

The most interesting aspect is that OpenCode already has much of the underlying structure that such an interface would need. Its session model includes messages and typed parts for tool calls, files, reasoning, patches, snapshots, subtasks, and other events. These could become meaningful graph elements rather than merely sections in a sequential transcript.&#x20;

I'd pursue a prototype, with three qualifications.

## 1. The graph should expose relationships that the transcript hides

Imagine an OpenCode session as a navigable workspace.

User request

Implement authentication

AGENT EXECUTION

Explore code

Read files · Search

Subtask

Authentication design

Edit files

3 files modified

Run tests

1 failure · retry

Result and changes

Final diff · test results · summary

Illustrative structure, not a live rendering. The actual graph would connect related files, tool calls, decisions, retries, and results across the session.

The important distinction is that these relationships are not all the same kind of edge.

A useful graph would distinguish:

- Sequence: this happened after that.
- Causality: this tool call followed from a particular action or result.
- Provenance: this file was read, created, or modified during that work.
- Delegation: this agent or subtask was spawned by another.
- Evidence: this test result or error influenced a subsequent action.

Now consider questions users routinely have when working with coding agents:

- Why did the agent change this file?
- Which tool calls led to this failure?
- What did the subagent actually contribute?
- Which changes were made after the failing test?
- Where did the agent retry, backtrack, or change direction?

In a transcript, answering these questions means scrolling, searching, and reconstructing context mentally. In a graph, a user could navigate the relevant relationships directly.

That is the potential paradigm shift.

## 2. The crucial capability is semantic zoom, not just a large canvas

A conventional graph that lets you zoom and pan would be an interesting demo. A truly useful zoomable interface would make the meaning and granularity of the information change as you zoom.

Level 1 — Session overview

See the goal, major execution phases, parallel subtasks, failures, and final outcome. Most implementation details remain summarized.

Level 2 — Execution neighborhood

Zoom into a phase to inspect messages, tool calls, related files, error chains, and neighboring subtasks. Show connections relevant to the selected node.

Level 3 — Full detail

Inspect the actual output, command, reasoning summary, file diff, test failure, or approval request. Detailed content should be readable, not reduced to microscopic graph labels.

I would treat this as a hierarchy of representations rather than merely changing node sizes.

At a distance, several tool calls might collapse into a single Explore repository cluster. Closer in, the cluster expands into individual calls. Closer still, a selected call opens its full content.

This is where a zoomable user interface could deliver a real advantage in spatial efficiency: progressively reveal complexity rather than permanently displaying it or hiding it behind accordion after accordion.

A few principles would matter enormously:

- Stable spatial memory. Nodes should not rearrange dramatically whenever the agent emits a new event. Users need to remember where things are.
- Useful navigation. Search, minimap, breadcrumbs, focus mode, and a way to return to the current activity are essential.
- Persistent text readability. Zooming out should simplify representations, not leave every label visible at an unusable size.
- A conventional detail view. Source code, diffs, long output, and permission prompts still deserve ordinary panels with selectable text, keyboard access, and predictable controls.

The biggest design mistake would be equating a zoomable canvas with better usability. Zooming is the mechanism; reducing cognitive overhead is the objective.

My recommendation would be to prototype with SpaceGraphJS first, provided it can render the interaction model you want without substantial changes to its internals.

The reasoning is straightforward: the differentiating hypothesis is not that OpenCode needs a graph. It's that a zoomable spatial environment is a better way to explore complex agent activity. Starting with your own engine tests that hypothesis directly and produces a meaningful demonstration of the library at the same time.

I would keep Cytoscape.js as a benchmark, not necessarily as an alternative implementation to pursue in parallel. Compare the effort needed to build the same small but representative interaction in both.

One caution: a 3D spatial model is not automatically superior to 2D. Depth, occlusion, perspective, and rotation can make relationships harder to read. SpaceGraphJS should be allowed to demonstrate an advantage, not be assumed to have one.

## 4. The low-effort prototype I would actually build

I agree with your assessment that this could produce an interesting result with relatively little effort. The important distinction is between a convincing prototype and a production-quality replacement.

I would scope the first experiment to one real OpenCode session.

1. Map the existing data. Turn messages, tool invocations, file changes, subtasks, and relevant results into graph nodes. Keep the existing session API and execution engine unchanged.
2. Make the graph an alternate view. Add a `Transcript | Graph` switch. The transcript remains the dependable baseline; the new canvas is an experiment, not a forced migration.
3. Implement three interactions. Zoom from session overview into individual work, select a node to inspect its details, and follow an edge to related activity. These are enough to test whether spatial navigation is useful.
4. Choose a representative session. Use one with file exploration, several edits, a test failure, a retry, and preferably a subtask. A simple successful interaction would not exercise the graph's real advantage.
5. Test actual investigative tasks. Ask users to find why a test failed, trace the changes to a particular file, and identify the work performed by a subtask. Compare success and time against the transcript.

The first version doesn't need a complete graph model of the entire software development process. It needs just enough structure to demonstrate that the relationships are valuable.

For the proof of concept, I would explicitly separate the graph data model from the rendering engine. Keep node IDs, event types, edge semantics, and expansion rules independent of SpaceGraphJS. This makes it possible to change the rendering implementation without rebuilding the integration with OpenCode.

## 5. What could make this much more than a better session viewer?

The more ambitious possibility is that an agent session becomes an explorable artifact rather than a disposable conversation.

A user could preserve a session graph, revisit a particular decision, compare two attempts, navigate from a changed file to the work that produced it, or start a new investigation from an earlier result.

Over time, the graph could potentially connect activity across sessions: recurring errors, files repeatedly changed by agents, related implementation efforts, and dependencies between tasks. Those are future possibilities, not capabilities the initial UI needs.

There is a product-design choice here, too. OpenCode's chronological transcript remains ideal for following a conversation. A graph is better suited to exploring structure, parallel activity, and provenance. Neither representation dominates every task.

That suggests the strongest product may be a dual representation of the same underlying work, with the graph providing capabilities that the transcript cannot easily provide.

## My overall assessment

| Dimension             | Assessment                                                                |
| --------------------- | ------------------------------------------------------------------------- |
| UX potential          | High, especially for long and complex sessions                            |
| Prototype feasibility | Promising, if scoped to a single session                                  |
| Implementation risk   | Moderate; mostly around interaction quality and data modeling             |
| SpaceGraphJS fit      | Particularly interesting for testing semantic zoom and rich spatial nodes |
| Main failure mode     | An impressive-looking graph that is harder to navigate than a transcript  |

The central hypothesis I would test is this:

> When agent activity becomes sufficiently complex, spatial navigation through relationships is more effective than linear navigation through messages.

That is a stronger claim than saying the current UI is cramped or difficult to read. It gives the project a clear success criterion.

And it makes OpenCode an unusually interesting proving ground for SpaceGraphJS: agent execution already generates a stream of events with relationships, dependencies, artifacts, and outcomes. Much of the challenge is deciding which relationships to expose and how to make them navigable.

----

# Development plan: an OpenCode spatial UI prototype

I would approach this as a small, independently runnable OpenCode fork with a demonstrable UX experiment, a screenshot-based verification loop, and a low-friction path for the OpenCode team to try it.

The hybrid idea is particularly valuable. It avoids asking users to abandon the familiar log before they understand what the graph offers.

The goal is not to build a new OpenCode. It is to make one compelling change to the existing OpenCode experience, demonstrate it working on real sessions, and make it easy for others to evaluate.

## 1. Design the hybrid as the first-class experience

I'd give the three views different jobs:

Log

The existing chronological conversation. No learning curve, no loss of familiar behavior.

Graph

The entire session as a navigable spatial map. Useful for understanding the overall execution, branches, failures, and artifacts.

Hybrid Log + Graph

The familiar log remains primary. Relevant messages can expand into small inline graphs, or open a larger graph popover/panel without losing their place in the conversation.

### What the hybrid should look like

Imagine an ordinary log entry:

User

Fix the authentication test failures.

Assistant

I'll inspect the failing tests and trace the affected code.

Execution graph

Embedded

Illustrative inline subgraph

Inspect tests

Fix code

Retest

Expand graph · inspect nodes · return to log

Conceptual mock-up, not an actual OpenCode screenshot. The graph should summarize a meaningful cluster of activity, not decorate every individual message.

The key design decision is progressive disclosure. A graph should appear where it answers a question: what happened during this tool sequence, how did this subtask unfold, or why did this attempt fail?

For the prototype, I'd implement only two hybrid interactions:

1. An expandable, compact graph attached to a meaningful group of log events.
2. A button to open that subgraph in a larger, navigable overlay, with a clear way back to the same log position.

That provides a bridge between the modes without having to redesign every log component.

## 2. Work in a separate clone, not your daily OpenCode checkout

I agree with your instinct. Use a dedicated clone of the upstream repository, keep the experiment on its own branch, and use your normal OpenCode installation to work on that clone.

This provides three advantages:

- You can use OpenCode to develop OpenCode without destabilizing your normal working environment.
- The result is a real, reproducible implementation against upstream code, not a standalone mock-up that has to be integrated later.
- You can develop automated browser checks alongside the feature from the beginning.

OpenCode's web application lives in `packages/app`, and its development instructions describe running the web UI separately from the backend. The app also has an existing end-to-end testing setup using Playwright.&#x20;

### Keep the experimental footprint small

I would avoid modifying the backend or session data model initially. OpenCode already represents messages as structured information with typed parts, including tool calls, patches, subtasks, and execution-related events. The first graph can be derived from those existing structures.

The implementation should live predominantly in the frontend, with a small, isolated graph adapter.

## 3. Files to investigate and likely files to modify

Before touching code, have your OpenCode agent trace the current session rendering path. Component names and file organization can change, so verify them in the checked-out revision rather than blindly applying a list of filenames.

These are the areas I'd inspect first:

| Area               | Likely location                                            | Purpose                                                   |
| ------------------ | ---------------------------------------------------------- | --------------------------------------------------------- |
| Session page       | `packages/app/src/pages/session/`                          | Find the page that owns the conversation and its viewport |
| Message rendering  | Session components under `packages/app/src/`               | Identify message boundaries and tool-output components    |
| Session data       | Session hooks and state/store modules                      | Access messages, parts, and updates                       |
| Graph adapter      | New `packages/app/src/components/session-graph/` directory | Convert existing session data into graph nodes and edges  |
| Graph canvas       | New component in that directory                            | Encapsulate SpaceGraphJS and its lifecycle                |
| Hybrid integration | Session page or a small wrapper component                  | Render inline graphs and expanded subgraphs               |
| Browser tests      | Existing Playwright configuration and E2E test directory   | Verify interaction and capture screenshots                |

The proposed graph directory is a suggestion, not a claim that it already exists.

### Keep the architecture deliberately simple

OpenCode session state

Messages · parts · tool calls · files · subtasks

Pure graph adapter

Stable IDs · node types · edges · summaries

Graph renderer

SpaceGraphJS · layout · zoom · selection

Existing log and detail components

Full message · command output · diff · file references

The adapter should be a pure TypeScript module wherever possible. That allows you to test graph construction without starting a browser or a backend.

Use existing message IDs and part IDs for stable node identity. Don't generate new random IDs every time the session state updates. Stable identity is essential to preventing layout jitter and preserving selection.

I would also keep the first graph model intentionally modest:

- Nodes for messages, tool calls, subtasks, files, and important results.
- Sequence edges derived from the actual event ordering.
- File and subtask relationships only when supported by the data.
- Summaries for clusters, with full details loaded from the existing session state.

Don't imply causality just because two events are adjacent. Distinguishing known relationships from inferred ones will become important if this prototype evolves into an explanation or debugging tool.

## 4. SpaceGraphJS integration: isolate the experiment

SpaceGraphJS is an interesting choice here because its project explicitly targets zoomable interfaces. Its repository includes a quickstart, demos, tests, and verification-oriented tooling.&#x20;

I would integrate it as a dependency rather than copy library source into OpenCode.

Before building the complete feature, perform one small compatibility spike:

1. Install SpaceGraphJS and its required rendering dependency using the package manager and versions compatible with the current OpenCode build.
2. Render a handful of nodes inside the actual session page.
3. Verify pointer interaction, resizing, cleanup when switching sessions, and hot-module reload.
4. Capture a screenshot and confirm the graph remains legible at the target viewport.
5. Check bundle-size impact and whether the graph can be loaded lazily.

If the spike reveals a major compatibility problem, revisit the rendering choice then. Don't spend days abstracting a renderer before the experiment has earned that complexity.

A key implementation detail: the graph canvas should have a clear lifecycle. It should initialize once for a given container, update from new session data, resize when its container changes, and dispose its resources when unmounted. Avoid rebuilding the entire graph every time a token or tool result arrives.

## 5. Playwright should be part of the development loop from day one

Your screenshot-first approach is exactly right. Screenshots make this kind of UI experiment much easier to evaluate than source code or a verbal description.

OpenCode already documents Playwright-based E2E testing, including starting the Vite development server and configuring the API backend. Reuse that infrastructure rather than creating a second test system.

I would make the first milestone a repeatable screenshot command.

### The testing architecture

Deterministic session fixture

Known messages, tool calls, edits, failures, and subtasks

Playwright browser

Open the local web UI and exercise real controls

Screenshots and assertions

Log, hybrid, graph, expanded graph, and return navigation

Review

Inspect screenshots, check failures, and manually explore the UX

### Build the fixture before the graph

A live OpenCode session is useful for final validation, but it is a poor primary test fixture. Model output varies, tool execution takes time, and your screenshot can change unexpectedly.

Instead, use a deterministic fixture representing a realistic session. Ideally, construct it from sanitized examples of actual session data so the graph adapter is tested against the real schema.

If the app's existing E2E setup makes injecting a fixture difficult, create a small development-only fixture route or a test-only data provider. Keep it disabled in production builds and avoid introducing test shortcuts into normal session behavior.

### First screenshot suite

I would target these five screenshots:

01 — Baseline log

Proves the existing interface still works and gives you a reference for comparison.

02 — Hybrid log

Tests whether the inline graph feels native to the conversation instead of like a bolted-on widget.

03 — Full graph

Tests spatial composition, node legibility, edge clarity, and overall visual appeal.

04 — Selected node

Proves the graph can reveal useful detail without requiring the user to leave the visualization.

05 — Return to log

Verifies the hybrid's key promise: exploration does not disorient the user or lose their place.

These images are visual references, not screenshots of your implementation. The real Playwright captures are what you should use to judge progress and publish the result.

### Add assertions, not just screenshots

Screenshots catch visual regressions, but they do not prove functionality. Add assertions that verify:

- The mode switch changes views correctly.
- Expanding an inline graph reveals the expected nodes.
- Selecting a node opens the correct details.
- Closing the overlay restores the original log position.
- Switching sessions doesn't leave stale graph state.
- Resizing the browser doesn't break the canvas.
- The console has no unexpected runtime errors.

Use stable test IDs for the new controls. Keep screenshots at a fixed viewport, use a consistent theme, and wait for fonts and graph layout to settle before capturing. Avoid arbitrary sleeps when you can wait for a known UI state.

## 6. Make screenshot generation a permanent project capability

This is the part I would invest in beyond the immediate demo. Not a large test framework—just a reliable command that lets you ask OpenCode to improve the UI, capture the result, and inspect it repeatedly.

Add a small project-specific setup, for example:

```
opencode-spacegraph/
├── packages/app/
│   └── src/
│       └── components/
│           └── session-graph/
│               ├── graph-model.ts
│               ├── graph-view.tsx
│               ├── inline-graph.tsx
│               └── graph-overlay.tsx
├── packages/app/e2e/
│   └── session-graph.spec.ts
├── docs/
│   ├── prototype.md
│   └── screenshots/
│       ├── log.png
│       ├── hybrid.png
│       └── graph.png
└── scripts/
    └── capture-graph-demo.ts
```

These are proposed additions; follow the repository's actual conventions when implementing them.

I would give the screenshot command three modes:

- `baseline` — capture the original or graph-disabled log.
- `demo` — load the deterministic fixture and capture the hybrid and graph views.
- `verify` — run the relevant browser assertions and fail if a core interaction breaks.

Keep generated screenshots out of ordinary commits unless they are useful documentation or release artifacts. The script itself should be committed.

A useful rule for future development is: no UI change is considered complete until its relevant screenshot has been inspected. Automated image comparison can come later; during the prototype phase, actual images and a few assertions will catch most of the important issues.

## 7. How I would use OpenCode to build this project

Because you use OpenCode daily, I would make it part of the development workflow rather than simply the product being modified.

Give the agent a narrow task at each stage. Avoid one enormous request to redesign the interface, integrate the graph library, write tests, and publish the result.

Task 1 — Reconnaissance

Read-only

Locate the session page, message list, tool renderers, app-level tests, and existing screenshot utilities. Return the precise integration points and a minimal file-change plan.

Task 2 — Graph spike

Install the library, render a small graph in a development-only surface, and verify its lifecycle and browser compatibility. Capture the first screenshot before integrating real session data.

Task 3 — Session adapter and hybrid

Build the graph from actual session data. Add the inline graph, expansion control, and return navigation while leaving the original log intact.

Task 4 — Screenshot verification

Write the Playwright test, generate all five screenshots, inspect them, fix visual defects, and rerun the suite.

### The most useful project instruction

Add a concise `AGENTS.md` at the clone root or in the relevant scope, following the existing repository's conventions. It should tell the coding agent:

- This is an experimental UI feature; don't refactor unrelated areas.
- Keep graph construction independent of the rendering library.
- Preserve the existing log and all normal session operations.
- Run the graph-specific Playwright test after UI changes.
- Capture screenshots and inspect them before declaring visual work complete.
- Report the changed files, verification commands, and any unverified behavior.

This turns your own development process into the beginning of the long-term automated workflow you described.

One practical detail: don't let an agent repeatedly launch independent development servers or modify the test configuration without understanding it. Establish one known-good command for the frontend and one for browser verification, then reuse them throughout the project.

### The smallest useful release package

1. A public fork or companion repository. Keep the branch easy to inspect and clearly identify it as an experimental, community-built prototype, not an official OpenCode feature.
2. One compelling screenshot. Show the hybrid log with an expanded subgraph, recognizable OpenCode UI, meaningful labels, and a clear reason to care.
3. A short animated GIF or video. Demonstrate expanding an inline graph, zooming into an event, inspecting a node, and returning to the log. This conveys the idea better than several static screenshots.
4. A concise README. Explain the motivation, show the images, provide setup instructions, list the tested commit and known limitations, and give the exact command to run the demo.
5. A reproducible demo. Let another developer launch the UI against a deterministic fixture without configuring a model provider or executing an actual coding task.

----

Since SpaceGraphJS is our project, and is still under active development, we've cloned it as a linked repository in `spacegraphjs/`.  We can eventually link it as a separate dependency, but for now, freely make improvements and necessary changes to SpaceGraphJS.
