#!/usr/bin/env bun
// T6.3 — folded-vs-unfolded dividend measurement.
// Measures the node/edge reduction from collapsing groups on the 5k-message fixture.

import type { JsonValue, SessionMessageAssistantTool, SessionMessageInfo } from "@opencode/client/promise"
import { buildGraph } from "@opencode/session-ui/graph"
import { collapseGroups } from "@opencode/session-ui/graph"
import { scaleWindow, scopeToTurns } from "@opencode/session-ui/graph"

const SIZES = [100, 1_000, 5_000]
const MESSAGES_PER_TURN = 3

function tool(id: string, name: string, input: Record<string, JsonValue>): SessionMessageAssistantTool {
  return {
    type: "tool",
    id,
    name,
    state: { status: "completed", input, content: [{ type: "text", text: "ok" }] },
    time: { created: 1, completed: 2 },
  }
}

/** A session of `turns` executions, each with a read, an edit, and a shell call. */
function syntheticSession(turns: number): SessionMessageInfo[] {
  const messages: SessionMessageInfo[] = []

  for (let index = 0; index < turns; index++) {
    const path = `src/module${index % 40}/file${index}.ts`

    messages.push({ id: `u${index}`, type: "user", text: `task ${index}`, time: { created: index * 3 } })
    messages.push({
      id: `a${index}`,
      type: "assistant",
      agent: "build",
      model: { id: "m", providerID: "p" },
      time: { created: index * 3 + 1, completed: index * 3 + 2 },
      content: [
        { type: "text", text: `plan ${index}` },
        tool(`t${index}r`, "read", { path }),
        tool(`t${index}e`, "edit", { path }),
        tool(`t${index}s`, "shell", { command: `bun test ${index}` }),
      ],
    })
    messages.push({ id: `i${index}`, type: "idle", outcome: "succeeded", time: { created: index * 3 + 3 } })
  }

  return messages
}

type DividendRow = {
  messages: number
  totalTurns: number
  windowTurns: number
  windowHidden: number
  // Unfolded (execution/detail band): all groups expanded
  unfoldedNodes: number
  unfoldedEdges: number
  // Folded (overview band): all groups collapsed
  foldedNodes: number
  foldedEdges: number
  // Dividend
  nodeReduction: number
  nodeReductionPct: number
  edgeReduction: number
  edgeReductionPct: number
}

const rows: DividendRow[] = []

for (const messages of SIZES) {
  const turns = Math.ceil(messages / MESSAGES_PER_TURN)
  const stream = syntheticSession(turns)
  const status = { type: "idle" } as const

  // Build the full model
  const model = buildGraph({ messages: stream, status })

  // Apply the scale window (recent tail of TURN_WINDOW turns)
  const window = scaleWindow(model)
  const scoped = scopeToTurns(model, window.turns)

  // Unfolded: no collapsed groups (execution/detail band)
  const unfolded = scoped

  // Folded: collapse ALL groups that have members (overview band)
  // Find all group nodes that have clusterOf members
  const allGroupIds = new Set<string>()
  for (const node of scoped.nodes) {
    if (node.clusterOf && node.clusterOf.length > 0) {
      allGroupIds.add(node.id)
    }
  }
  const folded = collapseGroups(scoped, allGroupIds)

  const nodeReduction = unfolded.nodes.length - folded.nodes.length
  const nodeReductionPct = unfolded.nodes.length > 0
    ? ((nodeReduction / unfolded.nodes.length) * 100).toFixed(1)
    : "0.0"
  const edgeReduction = unfolded.edges.length - folded.edges.length
  const edgeReductionPct = unfolded.edges.length > 0
    ? ((edgeReduction / unfolded.edges.length) * 100).toFixed(1)
    : "0.0"

  rows.push({
    messages: stream.length,
    totalTurns: model.turns.length,
    windowTurns: window.turns.size,
    windowHidden: window.hidden,
    unfoldedNodes: unfolded.nodes.length,
    unfoldedEdges: unfolded.edges.length,
    foldedNodes: folded.nodes.length,
    foldedEdges: folded.edges.length,
    nodeReduction,
    nodeReductionPct: Number(nodeReductionPct),
    edgeReduction,
    edgeReductionPct: Number(edgeReductionPct),
  })
}

const head = [
  "messages",
  "totalTurns",
  "windowTurns",
  "windowHidden",
  "unfoldedNodes",
  "unfoldedEdges",
  "foldedNodes",
  "foldedEdges",
  "nodeReduction",
  "nodeReduction%",
  "edgeReduction",
  "edgeReduction%",
]

const body = rows.map((row) => [
  String(row.messages),
  String(row.totalTurns),
  String(row.windowTurns),
  String(row.windowHidden),
  String(row.unfoldedNodes),
  String(row.unfoldedEdges),
  String(row.foldedNodes),
  String(row.foldedEdges),
  String(row.nodeReduction),
  `${row.nodeReductionPct}%`,
  String(row.edgeReduction),
  `${row.edgeReductionPct}%`,
])

console.log("Folded-vs-Unfolded Dividend (5k-message fixture, TURN_WINDOW=60)")
console.log("=" .repeat(100))
console.log([head, ...body].map((row) => row.join(" | ")).join("\n"))

console.log("\nSummary:")
console.log("  The dividend is the reduction in drawn nodes/edges when groups are collapsed at overview band.")
console.log("  At execution/detail band, groups are expanded by default (no ambient folding).")
console.log("  Explicit user collapse is additional on top of ambient folding.")