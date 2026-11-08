#!/usr/bin/env bun
/**
 * Demo Video Generator — v2 (live recording, mark-anchored, hook + cards)
 *
 * Pipeline:
 *   1. `packages/app/e2e/graph/capture-live.spec.ts` records one continuous
 *      1440x900 Playwright video of the whole demo flow and writes the
 *      wall-clock seconds of every frame capture to
 *      docs/spacegraph/video/marks.json.
 *   2. This script locates the white sync beacon (the first bright frames of
 *      the recording) to convert wall-clock marks into video-timeline seconds,
 *      so narration is anchored to what is actually on screen.
 *   3. It builds a hook montage (title card, 3D transition, force explosion,
 *      auto-zoom, trace overlay) from the same recording, mixes edge-tts
 *      narration at the real frame times, appends an end card, and renders
 *      demo.mp4, demo.webm and demo-kidnapper.mp4.
 *
 * Usage:
 *   bun run script/generate-demo-video.ts [--voice en-US-AndrewNeural]
 *       [--hook-secs 1.4] [--draft] [--no-hook] [--no-kidnapper]
 *
 * Prerequisites:
 *   cd packages/app && bun run test:e2e:built -- e2e/graph/capture-live.spec.ts -p graph-capture
 *   bun run script/copy-capture-video.ts
 *   python3 -m edge_tts
 */

import { $ } from "bun"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { resolve } from "path"

const VIDEO_DIR = resolve(import.meta.dir, "../docs/spacegraph/video")
const WORK_DIR = resolve(VIDEO_DIR, "work")
const MANIFEST_PATH = resolve(import.meta.dir, "../docs/spacegraph/demo-manifest.json")
const INPUT_VIDEO = resolve(VIDEO_DIR, "capture.webm")
const MARKS_PATH = resolve(VIDEO_DIR, "marks.json")
const FFMPEG = ["-hide_banner", "-nostdin", "-loglevel", "error", "-y"] as const
const FONT = "/usr/share/fonts/noto/NotoSans-Bold.ttf"
/** The sync beacon flashes for this long before the flow starts. */
const BEACON_SECONDS = 0.36
const TTS_RATE = "+10%"

interface ManifestEntry {
  frame: number
  file: string
  hold: number
  narration: string
}
interface MarkEntry {
  frame: string
  elapsed: number
}

// Run ffmpeg - defined early for Bun hoisting
async function run(args: string[]) {
  const proc = Bun.spawn(["ffmpeg", ...FFMPEG, ...args])
  const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()])
  if (code !== 0) throw new Error(`ffmpeg ${args.join(" ")}\n${stderr}`)
}

// Probe a media file
async function probe(file: string) {
  const out = await $`ffprobe -v error -select_streams v:0 -show_entries format=duration -show_entries stream=avg_frame_rate,w,h -of default=noprint_wrappers=1 ${file}`.quiet()
  const lines = Object.fromEntries(
    out.stdout
      .toString()
      .trim()
      .split("\n")
      .map((line) => {
        const [key, ...rest] = line.split("=")
        return [key, rest.join("=")]
      }),
  )
  const [num, den] = (lines.avg_frame_rate ?? "25/1").split("/")
  const fps = parseFloat(num) / parseFloat(den ?? "1")
  return {
    duration: parseFloat(lines.duration ?? "0"),
    fps: Number.isFinite(fps) && fps > 0 ? fps : 25,
    w: parseInt(lines.w ?? "1440", 10),
    h: parseInt(lines.h ?? "900", 10),
  }
}

/**
 * Video-timeline second where the sync beacon starts. The live test flashes a
 * fullscreen white div for BEACON_SECONDS right before the demo flow begins
 * and restarts the wall clock when it ends, so:
 *   videoTime(mark) = beaconVideoStart + BEACON_SECONDS + mark.elapsed
 * Detected as the first run of ≥5 bright frames in the recording head.
 */
async function detectBeacon(fps: number) {
  const stats = resolve(WORK_DIR, "beacon-stats.txt")
  const proc = Bun.spawn(["ffmpeg", ...FFMPEG, "-t", "30", "-i", INPUT_VIDEO, "-vf", `scale=96:96,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=${stats}`, "-f", "null", "-"])
  const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()])
  if (code !== 0) throw new Error(`ffmpeg beacon detection failed\n${stderr}`)
  const lines = readFileSync(stats, "utf8").split("\n")
  let index = 0
  let run = 0
  for (const line of lines) {
    const frameMatch = line.match(/^frame:(\d+)/)
    if (frameMatch) {
      index = parseInt(frameMatch[1], 10)
      continue
    }
    const luma = line.match(/lavfi\.signalstats\.YAVG=([\d.]+)/)
    if (!luma) continue
    if (parseFloat(luma[1]) > 200) {
      run += 1
      // 0.36 s flash ≈ 9 frames at 25 fps; five bright frames is a robust run.
      if (run >= 5) return index / fps + BEACON_SECONDS
    } else {
      run = 0
    }
  }
  console.warn("⚠  sync beacon not found — marks anchored at video t=0 (timing may drift)")
  return 0
}

/**
 * Frame timing marks. Live run: wall-clock seconds per capture from marks.json.
 * Legacy fallback: cumulative manifest holds (no beacon offset applies).
 */
function loadTiming(manifest: ManifestEntry[]) {
  if (!existsSync(MARKS_PATH)) {
    console.warn("⚠  no marks.json — falling back to legacy manifest holds")
    let clock = 0
    return manifest.map((entry) => {
      const start = clock
      clock += entry.hold + 1.0
      return { frame: entry.frame, start }
    })
  }
  const marks: MarkEntry[] = JSON.parse(readFileSync(MARKS_PATH, "utf8"))
  return marks
    .map((mark) => ({
      frame: parseInt(mark.frame.match(/^(\d+)/)?.[1] ?? "0", 10),
      start: mark.elapsed,
    }))
    .filter((mark) => mark.frame > 0)
    .sort((a, b) => a.start - b.start)
}

/** Motion inside the hook happens between adjacent frame captures. */
function hookSlices(
  marks: { frame: number; videoStart: number }[],
  sliceSeconds: number,
): { label: string; from: number; len: number }[] {
  const byFrame = new Map(marks.map((mark) => [mark.frame, mark.videoStart]))
  const at = (frame: number) => byFrame.get(frame)
  const between = (prev: number, next: number) => {
    const from = at(prev)
    const to = at(next)
    return from !== undefined && to !== undefined ? { from, to } : null
  }
  const slice = (label: string, from: number, to: number, len: number, tail = false) => {
    // A tail slice ends at `to` (motion completes right at the capture mark);
    // otherwise it starts at `from` plus a short skip into the action window.
    const safeLen = Math.max(0.5, Math.min(len, to - from - 0.05))
    return {
      label,
      from: tail ? to - safeLen : from,
      len: safeLen,
    }
  }
  const specs: ({ label: string; win: { from: number; to: number }; len: number; tail?: boolean } | null)[] = [
    between(5, 6) && { label: "3d-orbit", win: between(5, 6)!, len: sliceSeconds, tail: true },
    between(28, 29) && { label: "force", win: between(28, 29)!, len: sliceSeconds },
    between(20, 21) && { label: "auto-zoom", win: between(20, 21)!, len: sliceSeconds * 0.85, tail: true },
    between(34, 36) && { label: "trace-overlay", win: between(34, 36)!, len: sliceSeconds, tail: true },
  ]
  return specs.filter((spec): spec is NonNullable<typeof spec> => spec !== null).map((spec) => slice(spec.label, spec.win.from + 0.2, spec.win.to, spec.len, spec.tail))
}

// ── building blocks ──────────────────────────────────────────────────────────

const ENCODE = (crf: number, preset: string) => [
  "-c:v",
  "libx264",
  "-preset",
  preset,
  "-crf",
  String(crf),
  "-pix_fmt",
  "yuv420p",
  "-r",
  "30",
  "-video_track_timescale",
  "90000",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-ar",
  "48000",
]
const SILENCE = (seconds: number) => [
  "-f",
  "lavfi",
  "-i",
  `anullsrc=r=48000:cl=stereo`,
  "-t",
  seconds.toFixed(3),
]

function card(out: string, big: string, small: string, w: number, h: number, crf: number, preset: string) {
  return run([
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=${w}x${h}:d=2.6:r=30`,
    ...SILENCE(2.6),
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-vf",
    `drawtext=fontfile=${FONT}:text='${big}':fontcolor=white:fontsize=104:x=(w-text_w)/2:y=h/2-120,` +
      `drawtext=fontfile=${FONT}:text='${small}':fontcolor=0xbbbbbb:fontsize=40:x=(w-text_w)/2:y=h/2+40,` +
      `fade=t=in:st=0:d=0.4,fade=t=out:st=2.2:d=0.4`,
    "-t",
    "2.6",
    ...ENCODE(crf, preset),
    out,
  ])
}

function hookClip(out: string, from: number, len: number, w: number, h: number, crf: number, preset: string) {
  return run([
    // -ss before the input is a fast input-seek; -t on the output bounds it.
    "-ss",
    from.toFixed(3),
    "-i",
    INPUT_VIDEO,
    ...SILENCE(4),
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-vf",
    `fps=30,scale=${w}:${h},format=yuv420p`,
    "-t",
    len.toFixed(3),
    ...ENCODE(crf, preset),
    out,
  ])
}

/**
 * Builds the narrated body by first creating a single narration track with
 * proper silence between segments, then mixing it with the video.
 */
async function body(
  out: string,
  segments: { start: number; file: string }[],
  dims: { w: number; h: number; duration: number; fps: number },
  crf: number,
  preset: string,
  kidnapper: boolean,
) {
  const chain = kidnapper ? "rubberband=pitch=0.89:formant=1.12," : ""
  const silenceDur = 0.15 // 150ms gap between segments

  // Build narration as single track: segment + silence + segment + silence...
  const narrationParts: string[] = []
  let currentTime = 0
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const gap = seg.start - currentTime
    if (gap > 0.01) {
      narrationParts.push(`-f lavfi -i anullsrc=r=48000:cl=stereo -t ${gap.toFixed(3)}`)
    }
    narrationParts.push(`-i ${seg.file}`)
    // Get segment duration
    const durOut = await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${seg.file}`.quiet()
    const segDur = parseFloat(durOut.stdout.toString().trim())
    currentTime = seg.start + segDur + silenceDur
  }
  // Pad to video duration
  if (currentTime < dims.duration) {
    narrationParts.push(`-f lavfi -i anullsrc=r=48000:cl=stereo -t ${(dims.duration - currentTime).toFixed(3)}`)
  }

  const narrationInputs = narrationParts.flatMap(p => p.split(" "))
  const narrationCount = narrationParts.filter(p => p.startsWith("-i ")).length

  // Build filter: concat narration segments, apply kidnapper effect, then mix with video
  const narrationConcat = narrationCount > 1
    ? narrationParts.map((_, i) => `[${i}:a]`).join("") + `concat=n=${narrationCount}:v=0:a=1[narration]`
    : "[0:a]anull[narration]"

  const filter = `${narrationConcat};[narration]${chain}aformat=channel_layouts=stereo,aresample=48000[nar2];[1:v]fps=30,scale=${dims.w}:${dims.h},format=yuv420p,fade=t=out:st=${(dims.duration - 0.6).toFixed(2)}:d=0.6[vout];[nar2]anull[mix]`

  await run([
    ...narrationInputs,
    "-i", INPUT_VIDEO,
    "-filter_complex", filter,
    "-map", "[vout]",
    "-map", "[mix]",
    "-t", dims.duration.toFixed(3),
    ...ENCODE(crf, preset),
    out,
  ])
}

function concatList(files: string[], out: string) {
  const list = resolve(WORK_DIR, "concat.txt")
  writeFileSync(list, files.map((file) => `file '${file}'`).join("\n"))
  return run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out])
}

async function renderWebm(input: string, out: string, draft: boolean) {
  return run([
    "-i",
    input,
    "-c:v",
    "libvpx-vp9",
    "-speed",
    draft ? "6" : "3",
    "-crf",
    draft ? "35" : "28",
    "-b:v",
    "0",
    "-pix_fmt",
    "yuv420p",
    "-row-mt",
    "1",
    "-c:a",
    "libopus",
    "-b:a",
    "128k",
    out,
  ])
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const flag = (name: string) => args.includes(name)
  const opt = (name: string) => {
    const index = args.indexOf(name)
    return index >= 0 ? args[index + 1] : undefined
  }
  const voice = opt("--voice") ?? "en-US-AndrewNeural"
  const sliceSeconds = parseFloat(opt("--hook-secs") ?? "1.4")
  const draft = flag("--draft")
  const skipHook = flag("--no-hook")
  const skipKidnapper = flag("--no-kidnapper")
  const crf = draft ? 28 : 20
  const preset = draft ? "ultrafast" : "medium"

  if (!existsSync(INPUT_VIDEO)) {
    console.error(`❌ missing ${INPUT_VIDEO} — record the live demo first`)
    process.exit(1)
  }
  await Bun.$`mkdir -p ${WORK_DIR}/tts`.quiet()
  const manifest: ManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  const dims = await probe(INPUT_VIDEO)
  console.log(`📹 ${INPUT_VIDEO} — ${dims.w}x${dims.h}, ${dims.duration.toFixed(1)}s @ ${dims.fps}fps`)
  // The cards match whatever the recording actually renders at.
  const W = dims.w
  const H = dims.h

  const beacon = await detectBeacon(dims.fps)
  const timing = loadTiming(manifest)
  const marks = timing.map((entry) => ({
    frame: entry.frame,
    videoStart: Math.max(0, entry.start + beacon),
  }))
  const byFrame = new Map(marks.map((mark) => [mark.frame, mark.videoStart]))

  // ── narration TTS (cached by text hash so re-runs skip synthesis) ───
  console.log("\n🎙️  Generating narration segments…")
  const segments: { start: number; file: string }[] = []
  for (const entry of manifest) {
    const start = byFrame.get(entry.frame)
    if (start === undefined) {
      console.warn(`  ⚠  frame ${entry.frame}: no mark — narration skipped`)
      continue
    }
    const cacheDir = resolve(WORK_DIR, "tts")
    const hashKey = Buffer.from(`${voice}|${TTS_RATE}|${entry.narration}`).toString("base64url").slice(0, 24)
    const audio = resolve(cacheDir, `${String(entry.frame).padStart(2, "0")}-${hashKey}.mp3`)
    if (!existsSync(audio)) {
      await Bun.$`python3 -m edge_tts --rate ${TTS_RATE} --voice ${voice} --text ${entry.narration} --write-media ${audio}`.quiet()
    }
    segments.push({ start, file: audio })
  }
  console.log(`  ✅ ${segments.length} segments ready`)

  // ── narrated body ──
  console.log("\n🎬 Rendering narrated body…")
  const bodyPath = resolve(WORK_DIR, "body.mp4")
  const kidnapperBodyPath = resolve(WORK_DIR, "body-kidnapper.mp4")
  await body(bodyPath, segments, { ...dims, w: W, h: H }, crf, preset, false)
  if (!skipKidnapper)
    await body(kidnapperBodyPath, segments, { ...dims, w: W, h: H }, crf, preset, true)

  // ── hook + cards ──
  const parts = [bodyPath]
  if (!skipHook) {
    console.log("✂️  Building hook montage…")
    const titlePath = resolve(WORK_DIR, "title-card.mp4")
    const endPath = resolve(WORK_DIR, "end-card.mp4")
    await card(titlePath, "SessionGraph", "your session, mapped as it runs", W, H, crf, preset)
    await card(endPath, "SessionGraph", "map it with Ctrl+Shift+M", W, H, crf, preset)
    const slices = hookSlices(marks, sliceSeconds)
    const slicePaths: string[] = []
    for (const spec of slices) {
      const path = resolve(WORK_DIR, `hook-${spec.label}.mp4`)
      await hookClip(path, spec.from, spec.len, W, H, crf, preset)
      slicePaths.push(path)
    }
    parts.unshift(titlePath, ...slicePaths)
    parts.push(endPath)
  }

  // ── final ──
  console.log("\n🧩 Concatenating…")
  const finalPath = resolve(VIDEO_DIR, "demo.mp4")
  await concatList(parts, finalPath)
  const finalSize = await Bun.$`stat -c%s ${finalPath}`.text()
  console.log(`✅ demo.mp4 — ${(parseInt(finalSize.trim()) / 1024 / 1024).toFixed(1)} MB`)

  if (!draft) {
    console.log("🌐 Rendering demo.webm…")
    await renderWebm(finalPath, resolve(VIDEO_DIR, "demo.webm"), draft)
    if (!skipKidnapper) {
      console.log("🗣️  Concatenating kidnapper cut…")
      const kidnapperParts = [...parts]
      const bodyIndex = kidnapperParts.indexOf(bodyPath)
      kidnapperParts[bodyIndex] = kidnapperBodyPath
      const kidnapperPath = resolve(VIDEO_DIR, "demo-kidnapper.mp4")
      const kidnapperWestPath = resolve(VIDEO_DIR, "demo-kidnapper.webm")
      await concatList(kidnapperParts, kidnapperPath)
      console.log("🌐 Rendering demo-kidnapper.webm…")
      await renderWebm(kidnapperPath, kidnapperWestPath, draft)
      console.log(`✅ demo-kidnapper.mp4 + demo-kidnapper.webm`)
    }
    console.log(`✅ demo.webm`)
  }

  console.log(`\n📊 body length ${dims.duration.toFixed(1)}s (${(dims.duration / 60).toFixed(1)} min)`)
  console.log(`   intermediate files under ${WORK_DIR} (delete freely, rebuilt on re-run)`)
}

main()
