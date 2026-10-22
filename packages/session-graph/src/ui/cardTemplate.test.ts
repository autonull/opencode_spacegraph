import { expect, test } from "bun:test"
import type { GraphNode } from "@opencode/session-ui/graph"
import { DARK_THEME as theme } from "../fixtures"
import { createBandTemplate, createCardTemplate, kindDetail, type CardCopy } from "./cardTemplate"

const copy: CardCopy = {
  steered: (role) => `${role} · steered`,
  exit: (code) => `exit ${code}`,
  timedOut: () => "timed out",
  replayed: () => "replayed",
  reads: (count) => `${count} reads`,
  writes: (count) => `${count} writes`,
}

const node = (partial: Partial<GraphNode> & Pick<GraphNode, "id" | "kind" | "label" | "status">): GraphNode =>
  partial as GraphNode

test("cards carry a kind glyph, status dot, and monospaced tool/file labels", () => {
  const render = createCardTemplate(theme, { copy })
  const tool = render(node({ id: "tool:1", kind: "tool", label: "read", status: "success", data: { name: "read" } }), "execution")

  expect(tool).toContain("<svg")
  expect(tool).toContain(theme.success)
  expect(tool).toContain("ui-monospace")

  const message = render(node({ id: "m:1", kind: "message", label: "hi", status: "neutral" }), "execution")
  expect(message).not.toContain("ui-monospace")
})

test("cards escape host content and never emit raw markup", () => {
  const html = createCardTemplate(theme, { copy })(
    node({ id: "tool:x", kind: "tool", label: '<script>alert("x")</script>', status: "failed" }),
    "execution",
  )

  expect(html).toContain("&lt;script&gt;")
  expect(html).not.toContain("<script>")
})

test("bands render a labelled clipped header with the member count", () => {
  const html = createBandTemplate(theme)(
    node({ id: "phase:t:explore:1", kind: "phase", label: "Explore", status: "neutral" }),
    5,
    { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 0 } },
  )

  expect(html).toContain("Explore")
  expect(html).toContain(">5<")
  expect(html).toContain("pointer-events:none")
})

// The tier is how much a card says at the reader's distance. The card's box never changes, so the
// tier changes the composition inside it.
test("card tiers", () => {
  const tool = node({
    id: "tool:1",
    kind: "tool",
    label: "read",
    status: "success",
    summary: "src/auth/token.ts",
    time: Date.UTC(2026, 0, 2, 11, 33, 30),
    data: { name: "read", input: { path: "src/auth/token.ts" } },
  })

  // A far card drops the summary it cannot show.
  const far = createCardTemplate(theme, { tier: "far", copy })(tool, "execution")
  expect(far).toContain('data-tier="far"')
  expect(far).not.toContain("src/auth/token.ts")

  // A mid card carries the summary.
  const mid = createCardTemplate(theme, { tier: "mid", copy })(tool, "execution")
  expect(mid).toContain('data-tier="mid"')
  expect(mid).toContain("src/auth/token.ts")

  // A near card adds what the tool touched.
  const near = createCardTemplate(theme, { tier: "near", copy })(tool, "execution")
  expect(near).toContain('data-tier="near"')
  expect(near).toContain("src/auth/token.ts")
})

// T11.3 — the tier decides how much room the card has; the kind decides what fills it. A kind with
// nothing to add adds no line: an empty line is worse than no line.
test("a near card says what its kind has that its label does not", () => {
  const cases: { kind: GraphNode["kind"]; node: GraphNode; says?: string }[] = [
    {
      kind: "session",
      node: node({ id: "session", kind: "session", label: "Session", status: "neutral" }),
    },
    {
      kind: "turn",
      node: node({
        id: "turn:1",
        kind: "turn",
        label: "Fix the tests",
        status: "neutral",
        time: Date.UTC(2026, 0, 2, 11, 33, 30),
      }),
      says: "11:33",
    },
    {
      kind: "phase",
      node: node({ id: "phase:1", kind: "phase", label: "Explore", status: "neutral" }),
    },
    {
      kind: "message",
      node: node({ id: "msg:1", kind: "message", label: "Fix the tests", status: "neutral", data: { role: "user" } }),
      says: "user",
    },
    {
      kind: "reasoning",
      node: node({ id: "r:1", kind: "reasoning", label: "Let me look", status: "neutral" }),
    },
    {
      kind: "tool",
      node: node({
        id: "tool:1",
        kind: "tool",
        label: "read",
        status: "success",
        data: { name: "read", input: { path: "src/auth/token.ts" } },
      }),
      says: "src/auth/token.ts",
    },
    {
      kind: "file",
      node: node({
        id: "file:1",
        kind: "file",
        label: "src/auth/token.ts",
        status: "neutral",
        data: { path: "src/auth/token.ts" },
      }),
    },
    {
      kind: "subagent",
      node: node({
        id: "sub:1",
        kind: "subagent",
        label: "Authentication design",
        status: "success",
        data: { agent: "explore", childSessionID: "ses_child" },
      }),
      says: "explore",
    },
    {
      kind: "result",
      node: node({
        id: "result:1",
        kind: "result",
        label: "failed",
        status: "failed",
        data: { exit: 1, timeout: false, output: "FAIL auth refresh token" },
      }),
      says: "FAIL auth refresh token · exit 1",
    },
    {
      kind: "error",
      node: node({
        id: "error:1",
        kind: "error",
        label: "Expected refresh token",
        status: "failed",
        data: { type: "tool_error" },
      }),
      says: "tool_error",
    },
    {
      kind: "retry",
      node: node({ id: "retry:1", kind: "retry", label: "Retry #2", status: "neutral", data: { attempt: 2 } }),
    },
    {
      kind: "compaction",
      node: node({
        id: "c:1",
        kind: "compaction",
        label: "Compacted context",
        status: "neutral",
        data: { reason: "auto", replayed: true },
      }),
      says: "replayed",
    },
    {
      kind: "notice",
      node: node({
        id: "n:1",
        kind: "notice",
        label: "Authentication design",
        status: "neutral",
        data: { type: "synthetic", source: "subagent" },
      }),
      says: "subagent",
    },
    {
      kind: "diff",
      node: node({
        id: "diff:1",
        kind: "diff",
        label: "2 files changed",
        status: "neutral",
        data: { files: ["src/auth/guards.ts", "src/auth/session.ts"] },
      }),
      says: "src/auth/guards.ts",
    },
  ]

  for (const entry of cases) {
    const detail = kindDetail(entry.node, copy)
    if (entry.says === undefined) {
      expect(detail, entry.kind).toBeUndefined()
      // A kind with nothing to add shows no line at all: the card is the label, and nothing empty.
      const near = createCardTemplate(theme, { tier: "near", copy })(entry.node, "execution")
      expect(near, entry.kind).not.toContain("font-size:11px")
      continue
    }
    expect(detail, entry.kind).toContain(entry.says)
    const near = createCardTemplate(theme, { tier: "near", copy })(entry.node, "execution")
    expect(near, entry.kind).toContain(entry.says)
  }
})

// T11.5 — a selected card says so, in the theme's own selection colour.
test("the selected card carries the selection state", () => {
  const tool = node({ id: "tool:1", kind: "tool", label: "read", status: "success" })
  const other = node({ id: "tool:2", kind: "tool", label: "read", status: "success" })

  const selected = createCardTemplate(theme, { selected: tool.id, copy })(tool, "execution")
  expect(selected).toContain('data-selected="true"')
  expect(selected).toContain(theme.selection)

  const unselected = createCardTemplate(theme, { selected: tool.id, copy })(other, "execution")
  expect(unselected).not.toContain('data-selected="true"')
  expect(unselected).not.toContain(theme.selection)
})

// The hybrid marks the turn the reader is reading in the log, so the map says where they are
// without the reader having to pick it.
test("the active turn's card carries the active state", () => {
  const turn = node({ id: "turn:1", kind: "turn", label: "Fix the tests", status: "neutral" })
  const other = node({ id: "turn:2", kind: "turn", label: "Ship it", status: "neutral" })

  const active = createCardTemplate(theme, { active: turn.id, copy })(turn, "execution")
  expect(active).toContain('data-active="true"')
  expect(active).toContain(theme.accent)

  const inactive = createCardTemplate(theme, { active: turn.id, copy })(other, "execution")
  expect(inactive).not.toContain('data-active="true"')
})

// The host knows facts the node does not: a file's readers are in the graph's edges.
test("a host fact fills the line a kind cannot fill", () => {
  const file = node({
    id: "file:1",
    kind: "file",
    label: "src/auth/token.ts",
    status: "neutral",
    data: { path: "src/auth/token.ts" },
  })

  const near = createCardTemplate(theme, { tier: "near", copy, related: () => "2 reads · 1 write" })(file, "execution")
  expect(near).toContain("2 reads · 1 write")
})
