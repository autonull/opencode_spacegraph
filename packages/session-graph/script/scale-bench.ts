#!/usr/bin/env bun
// T6.6 — the scale budget. Measures the graph pipeline on synthetic sessions of 100, 1,000 and
// 5,000 messages: the model build, the layout, the render-model build, the diff between two
// consecutive render models, and the whole cost of one streamed update.
//
//   bun run graph:scale            the table
//   bun run graph:scale -- --json  the same numbers as JSON
//
// The numbers answer one question with data instead of speculation: does the host need incremental
// patches (the P8.8 seam), or is a full rebuild per streamed message cheap enough?
import { parseArgs } from "node:util"
import type { JsonValue, SessionMessageAssistantTool, SessionMessageInfo } from "@opencode/client/promise"
import { buildGraph } from "@opencode/session-ui/graph"
import { diffRenderModels } from "@spacegraphjs/adapter"
import { buildRenderModel } from "../src/canvas/buildRenderModel"
import { layoutGraph } from "@opencode/session-ui/graph"

const { values } = parseArgs({ args: Bun.argv.slice(2), options: { json: { type: "boolean" } } })

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

function timed<T>(run: () => T): { value: T; ms: number } {
  const start = performance.now()
  const value = run()

  return { value, ms: performance.now() - start }
}

type Row = {
  messages: number
  nodes: number
  edges: number
  modelMs: number
  layoutMs: number
  treeMs: number
  forceMs: number
  renderMs: number
  diffMs: number
  updateMs: number
  changedNodes: number
}

const rows: Row[] = []

for (const messages of SIZES) {
  const turns = Math.ceil(messages / MESSAGES_PER_TURN)
  const stream = syntheticSession(turns)
  const status = { type: "idle" } as const

  // Warm the walk so the first measurement is not dominated by JIT.
  buildGraph({ messages: stream, status: status })

  const built = timed(() => buildGraph({ messages: stream, status: status }))
  const model = built.value
  const laid = timed(() => layoutGraph(model))
  const layout = laid.value
  // The two free geometries: a tree and a force simulation place the same model in other shapes.
  const treed = timed(() => layoutGraph(model, { strategy: "tree" }))
  const forced = timed(() => layoutGraph(model, { strategy: "force" }))
  const rendered = timed(() =>
    buildRenderModel(model, { level: "execution", positions: layout.positions, bands: true }),
  )
  const render = rendered.value

  // One streamed message: the host rebuilds the model, the layout, and the render model, then the
  // renderer is handed the whole thing. The diff says how much of it actually moved.
  const extended = [
    ...stream,
    { id: "u_next", type: "user", text: "next", time: { created: 9999 } } as SessionMessageInfo,
  ]
  const update = timed(() => {
    const nextModel = buildGraph({ messages: extended, status: status })
    const nextLayout = layoutGraph(nextModel)
    const nextRender = buildRenderModel(nextModel, {
      level: "execution",
      positions: nextLayout.positions,
      bands: true,
    })

    return diffRenderModels(render, nextRender)
  })
  const diffed = timed(() => diffRenderModels(render, render))

  rows.push({
    messages: stream.length,
    nodes: model.nodes.length,
    edges: model.edges.length,
    modelMs: built.ms,
    layoutMs: laid.ms,
    treeMs: treed.ms,
    forceMs: forced.ms,
    renderMs: rendered.ms,
    diffMs: diffed.ms,
    updateMs: update.ms,
    changedNodes: update.value.added.length + update.value.changed.length + update.value.removed.length,
  })
}

if (values.json) {
  console.log(JSON.stringify(rows, null, 2))
} else {
  const head = [
    "messages",
    "nodes",
    "edges",
    "model",
    "layout",
    "tree",
    "force",
    "render",
    "diff",
    "update",
    "changed",
  ]
  const body = rows.map((row) => [
    String(row.messages),
    String(row.nodes),
    String(row.edges),
    `${row.modelMs.toFixed(1)}ms`,
    `${row.layoutMs.toFixed(1)}ms`,
    `${row.treeMs.toFixed(1)}ms`,
    `${row.forceMs.toFixed(1)}ms`,
    `${row.renderMs.toFixed(1)}ms`,
    `${row.diffMs.toFixed(1)}ms`,
    `${row.updateMs.toFixed(1)}ms`,
    String(row.changedNodes),
  ])

  console.log([head, ...body].map((row) => row.join(" | ")).join("\n"))
}
