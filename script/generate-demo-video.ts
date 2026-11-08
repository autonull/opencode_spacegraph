#!/usr/bin/env bun
/**
 * Demo Video Generator (Live Recording Version)
 * Adds TTS narration to the live Playwright capture video.
 * 
 * Usage:
 *   bun run script/generate-demo-video.ts [--output demo.mp4] [--voice en-US-AndrewNeural]
 * 
 * Prerequisites:
 *   1. Run capture tests: bun run test:e2e:built -- e2e/graph/capture.spec.ts
 *   2. Copy video: bun run script/copy-capture-video.ts
 *   3. This script adds narration to docs/spacegraph/video/capture.webm
 */

import { $ } from "bun";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

const MANIFEST_PATH = resolve(import.meta.dir, "../docs/spacegraph/demo-manifest.json");
const INPUT_VIDEO = resolve(import.meta.dir, "../docs/spacegraph/video/capture.webm");
const OUTPUT_DIR = resolve(import.meta.dir, "../docs/spacegraph/video");

interface ManifestEntry {
  frame: number;
  file: string;
  hold: number;
  transition: number;
  narration: string;
}

async function generateDemoVideo(options: {
  output: string;
  voice: string;
  draft: boolean;
}) {
  const manifest: ManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  
  if (!existsSync(INPUT_VIDEO)) {
    console.error(`❌ Input video not found: ${INPUT_VIDEO}`);
    console.error("   Run: bun run script/copy-capture-video.ts");
    process.exit(1);
  }
  
  mkdirSync(OUTPUT_DIR, { recursive: true });
  
  console.log(`📹 Adding narration to live capture video...`);
  console.log(`🎙️  Voice: ${options.voice}`);
  console.log(`📁 Input: ${INPUT_VIDEO}`);
  console.log(`📁 Output: ${OUTPUT_DIR}/${options.output}`);
  
  // Step 1: Get input video duration and check for audio stream
  const durationOutput = await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${INPUT_VIDEO}`.quiet();
  const videoDuration = parseFloat(durationOutput.stdout.toString().trim());
  console.log(`\n📏 Input video duration: ${videoDuration.toFixed(1)}s (${(videoDuration/60).toFixed(1)} min)`);
  
  // Check if input video has audio stream
  const audioStreamOutput = await $`ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 ${INPUT_VIDEO}`.quiet();
  const hasAudio = audioStreamOutput.stdout.toString().trim().length > 0;
  console.log(`🔊 Input video has audio: ${hasAudio}`);
  
  // Step 2: Generate TTS audio for each frame's narration
  console.log("\n🔊 Generating narration audio segments...");
  const audioFiles: { file: string; startTime: number; duration: number }[] = [];
  
  // Calculate frame timestamps from manifest (cumulative)
  let currentTime = 0;
  const frameTimings: { frame: number; start: number; end: number; narration: string }[] = [];
  
  for (const entry of manifest) {
    const frameStart = currentTime;
    const frameEnd = currentTime + entry.hold + entry.transition;
    frameTimings.push({ frame: entry.frame, start: frameStart, end: frameEnd, narration: entry.narration });
    currentTime = frameEnd;
  }
  
  // Generate audio for each frame
  for (const timing of frameTimings) {
    const audioFile = resolve(OUTPUT_DIR, `narration-${timing.frame.toString().padStart(2, "0")}.mp3`);
    
    try {
      await $`python3 -m edge_tts --voice ${options.voice} --text "${timing.narration}" --write-media ${audioFile}`.quiet();
      
      // Get audio duration
      const durOutput = await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${audioFile}`.quiet();
      const audioDuration = parseFloat(durOutput.stdout.toString().trim());
      
      audioFiles.push({ file: audioFile, startTime: timing.start, duration: audioDuration });
      console.log(`  ✅ Frame ${timing.frame}: ${audioDuration.toFixed(1)}s at ${timing.start.toFixed(1)}s`);
    } catch (e) {
      console.error(`  ❌ Frame ${timing.frame} failed:`, e);
      throw e;
    }
  }
  
  // Step 3: Create a filter_complex to overlay narration at correct timestamps
  // We'll use ffmpeg's filter_complex to mix narration segments into the video
  console.log("\n🎬 Building ffmpeg filter complex...");
  
  let filterComplex = "";
  let inputIndex = 1; // 0 is the video, 1+ are audio files
  
  // Build filter for each narration segment
  const filterParts: string[] = [];
  
  for (let i = 0; i < audioFiles.length; i++) {
    const { file, startTime, duration } = audioFiles[i];
    // adelay expects milliseconds
    const delayMs = Math.round(startTime * 1000);
    filterParts.push(`[${inputIndex}:a]adelay=${delayMs}|${delayMs}[a${i}]`);
    inputIndex++;
  }
  
  // Mix all audio tracks together with the original video audio
  // First, mix all narration tracks
  if (audioFiles.length > 0) {
    const narrationInputs = audioFiles.map((_, i) => `[a${i}]`).join("");
    filterParts.push(`${narrationInputs}amix=inputs=${audioFiles.length}:duration=longest[narration]`);
    
    // Then mix with original video audio (if it exists) - lower original volume, keep narration clear
    if (hasAudio) {
      filterParts.push(`[0:a]volume=0.3[orig];[narration][orig]amix=inputs=2:duration=first[outa]`);
    } else {
      // No original audio, just use narration
      filterParts.push(`[narration]anull[outa]`);
    }
    filterComplex = filterParts.join(";");
  }
  
  console.log(`   Filter: ${filterComplex.slice(0, 100)}...`);
  
  // Step 4: Build ffmpeg command with all audio inputs
  const audioInputArgs = audioFiles.flatMap(f => ["-i", f.file]);
  const videoOutput = resolve(OUTPUT_DIR, options.output);
  
  const videoPreset = options.draft ? "ultrafast" : "medium";
  const videoCrf = options.draft ? "28" : "20";
  
  console.log("\n🎥 Rendering final video with narration...");
  
  if (audioFiles.length > 0) {
    await $`ffmpeg -y -i ${INPUT_VIDEO} ${audioInputArgs} \
      -filter_complex "${filterComplex}" \
      -map 0:v -map "[outa]" \
      -c:v libx264 -preset ${videoPreset} -crf ${videoCrf} -pix_fmt yuv420p \
      -c:a aac -b:a 128k \
      -shortest ${videoOutput}`.quiet();
  } else {
    // No narration, just copy
    await $`ffmpeg -y -i ${INPUT_VIDEO} -c copy ${videoOutput}`.quiet();
  }
  
  // Also generate WebM version
  const webmOutput = videoOutput.replace(/\.mp4$/, ".webm");
  const webmSpeed = options.draft ? "4" : "2";
  const webmCrf = options.draft ? "35" : "25";
  
  if (audioFiles.length > 0) {
    await $`ffmpeg -y -i ${INPUT_VIDEO} ${audioInputArgs} \
      -filter_complex "${filterComplex}" \
      -map 0:v -map "[outa]" \
      -c:v libvpx-vp9 -speed ${webmSpeed} -crf ${webmCrf} -pix_fmt yuva420p \
      -c:a libopus -b:a 128k \
      -shortest ${webmOutput}`.quiet();
  } else {
    await $`ffmpeg -y -i ${INPUT_VIDEO} -c copy ${webmOutput}`.quiet();
  }
  
  console.log(`\n✅ Video generated:`);
  console.log(`   MP4:  ${videoOutput}`);
  console.log(`   WebM: ${webmOutput}`);
  
  // Print stats
  const mp4Size = (await $`stat -c%s ${videoOutput}`.quiet()).stdout.toString().trim();
  const webmSize = (await $`stat -c%s ${webmOutput}`.quiet()).stdout.toString().trim();
  
  console.log(`\n📊 Stats:`);
  console.log(`   Duration: ${videoDuration.toFixed(1)}s (${(videoDuration/60).toFixed(1)} min)`);
  console.log(`   MP4 size:  ${(parseInt(mp4Size)/1024/1024).toFixed(1)} MB`);
  console.log(`   WebM size: ${(parseInt(webmSize)/1024/1024).toFixed(1)} MB`);
}

// Parse arguments
const args = process.argv.slice(2);
const options = {
  output: "demo.mp4",
  voice: "en-US-AndrewNeural",
  draft: true, // Default to draft mode for speed
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output" && args[i + 1]) {
    options.output = args[i + 1];
    i++;
  } else if (args[i] === "--voice" && args[i + 1]) {
    options.voice = args[i + 1];
    i++;
  } else if (args[i] === "--draft") {
    options.draft = true;
  } else if (args[i] === "--no-draft") {
    options.draft = false;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
Usage: bun run script/generate-demo-video.ts [options]

Options:
  --output <file>    Output video filename (default: demo.mp4)
  --voice <voice>    TTS voice (default: en-US-AndrewNeural)
  --draft            Fast draft mode (default: enabled)
  --no-draft         High quality mode (slower)
  --help, -h         Show this help

Prerequisites:
  1. bun run test:e2e:built -- e2e/graph/capture.spec.ts
  2. bun run script/copy-capture-video.ts
  3. bun run script/generate-demo-video.ts

Available voices (run: python3 -m edge_tts --list-voices):
  en-US-AndrewNeural     Male, Warm, Confident
  en-US-AriaNeural       Female, Positive, Confident
  en-US-BrianNeural      Male, Approachable, Casual
  en-US-EmmaNeural       Female, Cheerful, Clear
  ... and many more
`);
    process.exit(0);
  }
}

await generateDemoVideo(options);