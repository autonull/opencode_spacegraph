import { expect, test } from "bun:test"
import type { RenderTheme } from "@spacegraphjs/renderer"
import type { GraphNode } from "@opencode/session-ui/graph"
import { createBandTemplate, createCardTemplate } from "./cardTemplate"

const theme: RenderTheme = {
  background: "#101014",
  surface: "#1b1b22",
  surfaceMuted: "#2a2a33",
  text: "#f5f5f7",
  textMuted: "#a0a0aa",
  border: "#3a3a44",
  accent: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  edge: "#6b7280",
  edgeMuted: "#4b5563",
  selection: "#60a5fa",
  focus: "#93c5fd",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
}

const node = (partial: Partial<GraphNode> & Pick<GraphNode, "id" | "kind" | "label" | "status">): GraphNode =>
  partial as GraphNode

test("cards carry a kind glyph, status dot, and monospaced tool/file labels", () => {
  const render = createCardTemplate(theme)
  const tool = render(node({ id: "tool:1", kind: "tool", label: "read", status: "success", data: { name: "read" } }), "execution")

  expect(tool).toContain("<svg")
  expect(tool).toContain(theme.success)
  expect(tool).toContain("ui-monospace")

  const message = render(node({ id: "m:1", kind: "message", label: "hi", status: "neutral" }), "execution")
  expect(message).not.toContain("ui-monospace")
})

test("cards escape host content and never emit raw markup", () => {
  const html = createCardTemplate(theme)(
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
    data: { path: "src/auth/token.ts" },
  })

  // A far card drops the summary it cannot show.
  const far = createCardTemplate(theme, { tier: "far" })(tool, "execution")
  expect(far).toContain('data-tier="far"')
  expect(far).not.toContain("src/auth/token.ts")

  // A mid card carries the summary.
  const mid = createCardTemplate(theme, { tier: "mid" })(tool, "execution")
  expect(mid).toContain('data-tier="mid"')
  expect(mid).toContain("src/auth/token.ts")

  // A near card adds when and where.
  const near = createCardTemplate(theme, { tier: "near" })(tool, "execution")
  expect(near).toContain('data-tier="near"')
  expect(near).toContain("11:33")

  // The expanded node carries its detail whatever the reader's distance.
  const expanded = createCardTemplate(theme, { tier: "far", expanded: tool.id })(tool, "execution")
  expect(expanded).toContain('data-tier="near"')
})
