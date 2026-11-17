#!/usr/bin/env bun
// CLI entry point for graph export: `bun run graph:export --pr`
// Pure pipeline: buildGraph -> layoutGraph -> buildRenderModel -> renderToSVG
// Outputs SVG sized for a PR body, with #graph:<node> permalinks

import { parseArgs } from "node:util"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { buildGraph, layoutGraph } from "@opencode/session-ui/graph"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { buildRenderModel } from "@opencode/session-graph"
import { renderToSVG } from "@spacegraphjs/svg-renderer"
import type { RenderTheme } from "@spacegraphjs/renderer"

const root = resolve(import.meta.dir, "..", "..", "..")

// Default theme for export
const DEFAULT_THEME: RenderTheme = {
  background: "#ffffff",
  surface: "#f8f9fa",
  surfaceMuted: "#e9ecef",
  border: "#dee2e6",
  text: "#212529",
  textMuted: "#6c757d",
  accent: "#0d6efd",
  success: "#198754",
  warning: "#ffc107",
  error: "#dc3545",
  edge: "#6c757d",
  edgeMuted: "#adb5bd",
  selection: "#0d6efd",
  focus: "#0d6efd",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  direction: "ltr",
}

function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      pr: { type: "boolean", default: false },
      output: { type: "string", default: "graph-pr-embed.svg" },
      node: { type: "string" },
      layout: { type: "string", default: "lanes" },
      level: { type: "string", default: "execution" },
    },
    allowPositionals: true,
  })

  const isPR = values.pr
  const outputFile = values.output
  const nodeId = values.node
  const layout = values.layout
  const level = values.level

  // Load session data - for now use fixture, in real usage this would load from a session
  const messages = buildFixtureMessages()
  const status = { type: "idle" as const }

  console.log("Building graph...")
  const graph = buildGraph({ messages, status })

  console.log("Laying out graph...")
  const laidOut = layoutGraph(graph, { strategy: layout as any })

  console.log("Building render model...")
  const renderModel = buildRenderModel(graph, {
    level: level as any,
    positions: laidOut.positions,
  })

  // Add permalink to node if specified
  if (nodeId) {
    const node = renderModel.nodes.find((n) => n.id === nodeId)
    if (node) {
      node.data ??= {}
      node.data.permalink = `#graph:${nodeId}`
    }
  }

  console.log("Rendering SVG...")
  const svg = renderToSVG(renderModel, {
    theme: DEFAULT_THEME,
    width: isPR ? 760 : 1200, // PR body width ~760px
    height: isPR ? 480 : 800,
    padding: 24,
  })

  // Ensure output directory exists
  const outputDir = join(root, "dist", "graph-exports")
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = join(outputDir, outputFile)
  writeFileSync(outputPath, svg)
  console.log(`SVG written to ${outputPath}`)

  if (isPR) {
    console.log("\n--- PR Embed Markdown ---")
    console.log(`![Session Graph](${outputPath})`)
    if (nodeId) {
      console.log(`[View node #graph:${nodeId}](#graph:${nodeId})`)
    }
    console.log("------------------------\n")
  }
}

main()