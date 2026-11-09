#!/usr/bin/env bun
/**
 * CLI utility to export a session graph to JSON.
 * Usage: bun run src/graph/export-cli.ts <session-file> [--output <file>]
 */

import { exportGraphJSON } from "./export"
import { buildGraph } from "./build"
import { readFileSync } from "fs"

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.error("Usage: bun run export-cli.ts <session-file> [--output <file>]")
    process.exit(1)
  }

  const sessionFile = args[0]
  let outputFile: string | undefined

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--output" && i + 1 < args.length) {
      outputFile = args[++i]
    }
  }

  try {
    // Read session data
    const sessionData = JSON.parse(readFileSync(sessionFile, "utf-8"))

    // Build graph
    const graph = buildGraph(sessionData)

    // Export
    const output = exportGraphJSON(graph)

    if (outputFile) {
      const fs = await import("fs")
      fs.writeFileSync(outputFile, output)
      console.log(`Exported to ${outputFile}`)
    } else {
      console.log(output)
    }
  } catch (error) {
    console.error("Export failed:", error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()