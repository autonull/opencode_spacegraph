#!/usr/bin/env bun
/**
 * Copy the recording produced by `e2e/graph/capture-live.spec.ts` into
 * docs/spacegraph/video/ for demo generation. The live test records one
 * continuous 1440x900 video and writes marks.json (capture timestamps) straight
 * to docs/spacegraph/video/, so only the video needs copying here.
 *
 * Legacy fallback: if the per-frame capture suites were run instead, their
 * clips are concatenated in frame order (generate-demo-video then warns that
 * timing falls back to the manifest holds).
 *
 * Run after: cd packages/app && bun run test:e2e:built -- e2e/graph/capture-live.spec.ts -p graph-capture
 */

import { readdirSync, copyFileSync, mkdirSync, statSync, writeFileSync } from "fs"
import { resolve, join } from "path"
import { $ } from "bun"

const TEST_RESULTS_DIR = resolve(import.meta.dir, "../packages/app/e2e/test-results")
const VIDEO_DIR = resolve(import.meta.dir, "../docs/spacegraph/video")
const DEST = resolve(VIDEO_DIR, "capture.webm")

function firstVideoIn(dirName: string): string | null {
  const dirPath = join(TEST_RESULTS_DIR, dirName)
  const files = readdirSync(dirPath).filter((file) => file.endsWith(".webm"))
  return files.length > 0 ? join(dirPath, files[0]) : null
}

async function main() {
  mkdirSync(VIDEO_DIR, { recursive: true })

  const liveDir = readdirSync(TEST_RESULTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("graph-capture-live"))
    .map((entry) => entry.name)[0]

  if (liveDir) {
    const live = firstVideoIn(liveDir)
    if (live) {
      copyFileSync(live, DEST)
      const size = statSync(DEST).size / 1024 / 1024
      console.log(`✅ live recording → docs/spacegraph/video/capture.webm (${size.toFixed(1)} MB)`)
      return
    }
  }

  const legacy = readdirSync(TEST_RESULTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^graph-capture-\d+-/.test(entry.name))
    .sort(
      (a, b) =>
        (parseInt(a.name.match(/^graph-capture-(\d+)-/)?.[1] ?? "999", 10) || 999) -
        (parseInt(b.name.match(/^graph-capture-(\d+)-/)?.[1] ?? "999", 10) || 999),
    )
    .flatMap((entry) => {
      const video = firstVideoIn(entry.name)
      return video ? [video] : []
    })
  if (legacy.length === 0) {
    console.error("❌ no capture videos in packages/app/e2e/test-results/")
    console.error("   Run the capture-live spec (or the legacy capture suites) first.")
    process.exit(1)
  }
  console.warn(`⚠  no live recording; concatenating ${legacy.length} legacy per-frame clips`)
  const concatFile = resolve(VIDEO_DIR, "concat.txt")
  writeFileSync(concatFile, legacy.map((path) => `file '${path}'`).join("\n"))
  await $`ffmpeg -y -f concat -safe 0 -i ${concatFile} -c copy ${DEST}`.quiet()
  const size = statSync(DEST).size / 1024 / 1024
  console.log(`✅ legacy concat → docs/spacegraph/video/capture.webm (${size.toFixed(1)} MB)`)
}

main()
