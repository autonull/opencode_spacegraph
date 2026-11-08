#!/usr/bin/env bun
/**
 * Copy and concatenate capture videos from test-results to docs/spacegraph/video/
 * Run after `bun run test:e2e:built -- e2e/graph/capture.spec.ts`
 */

import { readdirSync, copyFileSync, mkdirSync, existsSync, statSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { $ } from "bun";

const TEST_RESULTS_DIR = resolve(import.meta.dir, "../packages/app/e2e/test-results");
const VIDEO_DIR = resolve(import.meta.dir, "../docs/spacegraph/video");

function findCaptureVideos(): string[] {
  const dirs = readdirSync(TEST_RESULTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith("graph-capture-"))
    .sort((a, b) => {
      // Sort by frame number (01, 02, 03, etc.)
      const aMatch = a.name.match(/^graph-capture-(\d+)-/);
      const bMatch = b.name.match(/^graph-capture-(\d+)-/);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : 999;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 999;
      return aNum - bNum;
    });

  if (dirs.length === 0) return [];

  const videos: string[] = [];
  for (const dir of dirs) {
    const dirPath = join(TEST_RESULTS_DIR, dir.name);
    const files = readdirSync(dirPath).filter(f => f.endsWith(".webm"));
    if (files.length > 0) {
      videos.push(join(dirPath, files[0]));
    }
  }

  return videos;
}

async function main() {
  mkdirSync(VIDEO_DIR, { recursive: true });

  const videoPaths = findCaptureVideos();
  
  if (videoPaths.length === 0) {
    console.error("❌ No capture videos found in test-results/");
    console.error("   Run: bun run test:e2e:built -- e2e/graph/capture.spec.ts");
    process.exit(1);
  }

  console.log(`Found ${videoPaths.length} capture videos`);

  // Create concat file for ffmpeg
  const concatFile = resolve(VIDEO_DIR, "concat.txt");
  const concatContent = videoPaths.map(p => `file '${p}'`).join("\n");
  writeFileSync(concatFile, concatContent);

  const destPath = resolve(VIDEO_DIR, "capture.webm");

  // Concatenate videos using ffmpeg
  await $`ffmpeg -y -f concat -safe 0 -i ${concatFile} -c copy ${destPath}`.quiet();

  const stats = statSync(destPath);
  console.log(`✅ Concatenated capture video:`);
  console.log(`   From: ${videoPaths.length} individual test videos`);
  console.log(`   To:   ${destPath}`);
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

main();