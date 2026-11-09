#!/usr/bin/env bun
/**
 * Copy clip recordings produced by `e2e/graph/capture-clips.spec.ts` into
 * docs/spacegraph/video/clips/ for demo assembly.
 *
 * Run after: cd packages/app && bun run test:e2e:built -- e2e/graph/capture-clips.spec.ts -p graph-capture
 */

import { readdirSync, copyFileSync, mkdirSync, statSync, writeFileSync, existsSync } from "fs"
import { resolve, join } from "path"
import { $ } from "bun"

const TEST_RESULTS_DIR = resolve(import.meta.dir, "../packages/app/e2e/test-results")
const CLIPS_DIR = resolve(import.meta.dir, "../docs/spacegraph/video/clips")

const CLIP_TEST_DIRS = [
  "graph-capture-clips-clip-why-this-failed-graph-capture",
  "graph-capture-clips-clip-live-while-it-runs-graph-capture",
  "graph-capture-clips-clip-drill-into-subagent-graph-capture",
  "graph-capture-clips-clip-share-the-decision-graph-capture",
]

const CLIP_NAMES = [
  "why-this-failed",
  "live-while-it-runs",
  "drill-into-subagent",
  "share-the-decision",
]

function firstVideoIn(dirName: string): string | null {
  const dirPath = join(TEST_RESULTS_DIR, dirName)
  if (!existsSync(dirPath)) return null
  const files = readdirSync(dirPath).filter((file) => file.endsWith(".webm"))
  return files.length > 0 ? join(dirPath, files[0]) : null
}

async function main() {
  mkdirSync(CLIPS_DIR, { recursive: true })

  const clipVideos: Record<string, string> = {}

  for (let i = 0; i < CLIP_TEST_DIRS.length; i++) {
    const testDir = CLIP_TEST_DIRS[i]
    const clipName = CLIP_NAMES[i]
    
    const video = firstVideoIn(testDir)
    if (!video) {
      console.warn(`⚠  No video found for clip: ${clipName} (dir: ${testDir})`)
      continue
    }

    const dest = resolve(CLIPS_DIR, `${clipName}.webm`)
    copyFileSync(video, dest)
    const size = statSync(dest).size / 1024 / 1024
    clipVideos[clipName] = dest
    console.log(`✅ ${clipName} → ${dest} (${size.toFixed(1)} MB)`)
  }

  if (Object.keys(clipVideos).length === 0) {
    console.error("❌ No clip videos copied")
    process.exit(1)
  }

  // Write a manifest of copied clips
  const manifestPath = resolve(CLIPS_DIR, "manifest.json")
  writeFileSync(manifestPath, JSON.stringify(clipVideos, null, 2))
  console.log(`\n📋 Manifest written to ${manifestPath}`)
}

main()