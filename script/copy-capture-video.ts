#!/usr/bin/env bun
/**
 * Copy capture video from test-results to docs/spacegraph/video/
 * Run after `bun run test:e2e:built -- e2e/graph/capture.spec.ts`
 */

import { readdirSync, copyFileSync, mkdirSync, existsSync, statSync } from "fs";
import { resolve, join } from "path";

const TEST_RESULTS_DIR = resolve(import.meta.dir, "../packages/app/e2e/test-results");
const VIDEO_DIR = resolve(import.meta.dir, "../docs/spacegraph/video");

function findCaptureVideo(): string | null {
  const dirs = readdirSync(TEST_RESULTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith("graph-capture-"))
    .sort((a, b) => statSync(join(TEST_RESULTS_DIR, b.name)).mtimeMs - statSync(join(TEST_RESULTS_DIR, a.name)).mtimeMs);

  if (dirs.length === 0) return null;

  const latestDir = join(TEST_RESULTS_DIR, dirs[0].name);
  const files = readdirSync(latestDir).filter(f => f.endsWith(".webm"));
  
  if (files.length === 0) return null;

  return join(latestDir, files[0]);
}

function main() {
  mkdirSync(VIDEO_DIR, { recursive: true });

  const videoPath = findCaptureVideo();
  
  if (!videoPath) {
    console.error("❌ No capture video found in test-results/");
    console.error("   Run: bun run test:e2e:built -- e2e/graph/capture.spec.ts");
    process.exit(1);
  }

  const destPath = resolve(VIDEO_DIR, "capture.webm");
  copyFileSync(videoPath, destPath);
  
  const stats = statSync(destPath);
  console.log(`✅ Copied capture video:`);
  console.log(`   From: ${videoPath}`);
  console.log(`   To:   ${destPath}`);
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

main();