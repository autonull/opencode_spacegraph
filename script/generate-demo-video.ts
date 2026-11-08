#!/usr/bin/env bun
/**
 * Demo Video Generator
 * Generates a narrated demo video from the SpaceGraph capture frames.
 * 
 * Usage:
 *   bun run script/generate-demo-video.ts [--output demo.mp4] [--voice en-US-AndrewNeural]
 */

import { $ } from "bun";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";

const MANIFEST_PATH = resolve(import.meta.dir, "../docs/spacegraph/demo-manifest.json");
const SCREENSHOTS_DIR = resolve(import.meta.dir, "../docs/spacegraph/screenshots");
const OUTPUT_DIR = resolve(import.meta.dir, "../docs/spacegraph/demo-output");

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
  fps: number;
  draft: boolean;
}) {
  const manifest: ManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  
  mkdirSync(OUTPUT_DIR, { recursive: true });
  
  console.log(`📹 Generating demo video with ${manifest.length} frames...`);
  console.log(`🎙️  Voice: ${options.voice}`);
  console.log(`📁 Output: ${options.output}`);
  
  // Step 1: Generate TTS audio for each frame
  console.log("\n🔊 Generating narration audio...");
  const audioFiles: string[] = [];
  
  for (const entry of manifest) {
    const audioFile = resolve(OUTPUT_DIR, `frame-${entry.frame.toString().padStart(2, "0")}.wav`);
    audioFiles.push(audioFile);
    
    try {
      await $`python3 -m edge_tts --voice ${options.voice} --text "${entry.narration}" --write-media ${audioFile}`.quiet();
      console.log(`  ✅ Frame ${entry.frame}: "${entry.narration.slice(0, 50)}..."`);
    } catch (e) {
      console.error(`  ❌ Frame ${entry.frame} failed:`, e);
      throw e;
    }
  }
  
  // Step 2: Get audio durations and create frame sequence with precise timing
  console.log("\n🎬 Building video timeline...");
  
  const frameEntries: { file: string; duration: number }[] = [];
  
  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    const audioFile = audioFiles[i];
    
    // Get audio duration using ffprobe
    const durationOutput = await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${audioFile}`.quiet();
    const audioDuration = parseFloat(durationOutput.stdout.toString().trim());
    
    // Frame duration = max(hold, audioDuration) + transition (except last frame)
    const frameDuration = Math.max(entry.hold, audioDuration) + (i < manifest.length - 1 ? entry.transition : 0);
    
    const screenshotPath = resolve(SCREENSHOTS_DIR, entry.file);
    frameEntries.push({ file: screenshotPath, duration: frameDuration });
    
    console.log(`  Frame ${entry.frame}: ${frameDuration.toFixed(2)}s (hold: ${entry.hold}s, audio: ${audioDuration.toFixed(2)}s, transition: ${entry.transition}s)`);
  }
  
  // Step 3: Create ffmpeg concat file
  const concatFile = resolve(OUTPUT_DIR, "concat.txt");
  let concatContent = "";
  
  for (const { file, duration } of frameEntries) {
    concatContent += `file '${file.replace(/'/g, "'\\''")}'\n`;
    concatContent += `duration ${duration}\n`;
  }
  // Add last frame again (required by ffmpeg concat)
  concatContent += `file '${frameEntries[frameEntries.length - 1].file.replace(/'/g, "'\\''")}'\n`;
  
  writeFileSync(concatFile, concatContent);
  
  // Step 4: Concatenate audio files
  console.log("\n🔗 Concatenating audio...");
  const audioConcatFile = resolve(OUTPUT_DIR, "audio_concat.txt");
  writeFileSync(audioConcatFile, audioFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"));
  
  const combinedAudio = resolve(OUTPUT_DIR, "narration.wav");
  await $`ffmpeg -f concat -safe 0 -i ${audioConcatFile} -c copy ${combinedAudio}`.quiet();
  
  // Step 5: Generate video from frames with narration
  console.log("\n🎥 Rendering video...");
  
  const videoOutput = resolve(OUTPUT_DIR, options.output);
  
  const videoPreset = options.draft ? "ultrafast" : "medium";
  const videoCrf = options.draft ? "28" : "20";
  const webmSpeed = options.draft ? "4" : "2";
  const webmCrf = options.draft ? "35" : "25";
  
  await $`ffmpeg -y -f concat -safe 0 -i ${concatFile} -i ${combinedAudio} \
    -c:v libx264 -preset ${videoPreset} -crf ${videoCrf} -pix_fmt yuv420p -r ${options.fps} \
    -c:a aac -b:a 128k \
    -shortest ${videoOutput}`.quiet();
  
  // Also generate WebM version
  const webmOutput = videoOutput.replace(/\.mp4$/, ".webm");
  await $`ffmpeg -y -f concat -safe 0 -i ${concatFile} -i ${combinedAudio} \
    -c:v libvpx-vp9 -speed ${webmSpeed} -crf ${webmCrf} -pix_fmt yuva420p -r ${options.fps} \
    -c:a libopus -b:a 128k \
    -shortest ${webmOutput}`.quiet();
  
  console.log(`\n✅ Video generated:`);
  console.log(`   MP4:  ${videoOutput}`);
  console.log(`   WebM: ${webmOutput}`);
  
  // Print stats
  const mp4Size = (await $`stat -c%s ${videoOutput}`.quiet()).stdout.toString().trim();
  const webmSize = (await $`stat -c%s ${webmOutput}`.quiet()).stdout.toString().trim();
  
  const totalDuration = frameEntries.reduce((sum, f) => sum + f.duration, 0);
  console.log(`\n📊 Stats:`);
  console.log(`   Duration: ${totalDuration.toFixed(1)}s (${(totalDuration/60).toFixed(1)} min)`);
  console.log(`   MP4 size:  ${(parseInt(mp4Size)/1024/1024).toFixed(1)} MB`);
  console.log(`   WebM size: ${(parseInt(webmSize)/1024/1024).toFixed(1)} MB`);
}

// Parse arguments
const args = process.argv.slice(2);
const options = {
  output: "demo.mp4",
  voice: "en-US-AndrewNeural",
  fps: 30,
  draft: true, // Default to draft mode for speed
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output" && args[i + 1]) {
    options.output = args[i + 1];
    i++;
  } else if (args[i] === "--voice" && args[i + 1]) {
    options.voice = args[i + 1];
    i++;
  } else if (args[i] === "--fps" && args[i + 1]) {
    options.fps = parseInt(args[i + 1]);
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
  --fps <number>     Frame rate (default: 30)
  --draft            Fast draft mode (default: enabled)
  --no-draft         High quality mode (slower)
  --help, -h         Show this help

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