#!/usr/bin/env bun
// Lint check for story.skip/story.fixme without issue URL annotation

import { globSync } from "glob"
import { readFileSync } from "fs"
import { join } from "path"

const root = join(import.meta.dir, "..")
const files = globSync("component-tests/**/*.spec.ts", { cwd: root })

let hasErrors = false

for (const file of files) {
  const content = readFileSync(join(root, file), "utf-8")
  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const skipMatch = line.match(/story\.(skip|fixme)\(/)

    if (skipMatch) {
      // Check if there's an annotation with issue URL in the next few lines
      let hasIssueAnnotation = false
      let hasUrl = false

      // Look ahead up to 10 lines for the annotation
      for (let j = i; j < Math.min(i + 15, lines.length); j++) {
        if (lines[j].includes("annotation:") && lines[j].includes("type:") && lines[j].includes("issue")) {
          hasIssueAnnotation = true
        }
        if (hasIssueAnnotation && lines[j].includes("url:") && lines[j].includes("http")) {
          hasUrl = true
          break
        }
        // Stop looking if we hit the closing paren of the story call
        if (lines[j].trim().startsWith("})") || lines[j].trim().startsWith("}")) {
          break
        }
      }

      if (!hasIssueAnnotation || !hasUrl) {
        console.error(`${file}:${i + 1}: story.${skipMatch[1]}() missing issue URL annotation`)
        console.error(`  Expected: { annotation: { type: "issue", description: "...", url: "https://..." } }`)
        hasErrors = true
      }
    }
  }
}

if (hasErrors) {
  process.exit(1)
} else {
  console.log("All story.skip/story.fixme have issue URLs")
}