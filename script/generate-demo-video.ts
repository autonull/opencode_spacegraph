#!/usr/bin/env bun
/**
 * Demo Video Generator — v3 (continuous takes, mark-anchored narration)
 *
 * The recording is the picture. A take runs at real speed from one continuous
 * Playwright recording; a mark names the moment a beat lands. The renderer
 * never extends the picture for the voice: narration is fitted to the measured
 * gap before the next mark, and a line that does not fit is sped up or cut.
 *
 * Modes:
 *   continuous (default) — use the recording as the body, mix narration at its
 *     marks, extract one still per mark. No freeze frames.
 *   padded — legacy slideshow path: one clip per mark, last frame frozen to fit
 *     the narration. Kept only to re-render the rejected cut.
 *   stills — extract one PNG per mark and exit.
 *
 * Usage:
 *   bun run script/generate-demo-video.ts \
 *     [--input docs/spacegraph/video/takes/chapter2.webm] \
 *     [--marks docs/spacegraph/video/marks-chapter2.json] \
 *     [--out docs/spacegraph/video/chapter2.mp4] \
 *     [--stills docs/spacegraph/video/stills/chapter2] \
 *     [--mode continuous|padded|stills] [--voice en-US-AndrewNeural] \
 *     [--hook-secs 1.4] [--draft] [--no-hook]
 *
 * Prerequisites:
 *   cd packages/app && GRAPH_CAPTURE_DEMO=1 bun run test:e2e:built -- e2e/graph/capture-chapter2.spec.ts -p graph-capture
 *   bun run script/copy-capture-video.ts --prefix graph-capture-chapter2 --dest takes/chapter2.webm
 *   python3 -m edge_tts
 */

import { $ } from "bun"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { basename, resolve } from "path"

const VIDEO_DIR = resolve(import.meta.dir, "../docs/spacegraph/video")
const WORK_DIR = resolve(VIDEO_DIR, "work")
const MANIFEST_PATH = resolve(import.meta.dir, "../docs/spacegraph/demo-manifest.json")
let INPUT_VIDEO = resolve(VIDEO_DIR, "capture.webm")
let MARKS_PATH = resolve(VIDEO_DIR, "marks.json")
let OUTPUT_VIDEO = resolve(VIDEO_DIR, "demo.mp4")
let STILLS_DIR: string | undefined
const FFMPEG = ["-hide_banner", "-nostdin", "-loglevel", "error", "-y"] as const
const FONT = "/usr/share/fonts/noto/NotoSans-Bold.ttf"
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
 * Video-timeline second where the sync beacon ends. The capture flashes a
 * fullscreen white div, removes it, then restarts its wall clock, so:
 *   videoTime(mark) = beaconEnd + mark.elapsed
 * Detected as the first dark frame after a run of ≥5 bright frames.
 *
 * First tries to detect a deterministic first-frame marker (red pixel at 0,0)
 * added by the test, falling back to the luma beacon detection.
 */
async function detectBeacon(fps: number) {
  // Try first-frame marker detection: red pixel at (0,0) in first few frames
  const markerTime = await detectFirstFrameMarker(fps)
  if (markerTime > 0) {
    console.log(`✅ First-frame marker detected at ${markerTime.toFixed(2)}s`)
    return markerTime
  }

  // Fallback: luma beacon detection (fullscreen white flash)
  console.log("⚠  First-frame marker not found, falling back to luma beacon detection")
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
      index = parseInt(frameMatch[1] ?? "0", 10)
      continue
    }
    const luma = line.match(/lavfi\.signalstats\.YAVG=([\d.]+)/)
    if (!luma) continue
    if (parseFloat(luma[1] ?? "0") > 200) {
      run += 1
      continue
    }
    // The flash is one short bright run; the first dark frame after it is the
    // end. The capture resets its clock when the beacon is removed, so anchor there.
    if (run >= 5) return index / fps
    run = 0
  }
  console.warn("⚠  sync beacon not found — marks anchored at video t=0 (timing may drift)")
  return 0
}

/**
 * Detect the first-frame marker: a red pixel at (0,0) added by the test.
 * The marker appears in the first few frames of the recording.
 * Returns the video time (seconds) of the first frame containing the marker,
 * or 0 if not found.
 */
async function detectFirstFrameMarker(fps: number): Promise<number> {
  // Check first 2 seconds of video for red pixel at (0,0)
  const checkDuration = Math.min(2, 30) // cap at 30s but typically 2s is enough
  const stats = resolve(WORK_DIR, "marker-stats.txt")
  // Sample at 10fps to check for red pixel at top-left corner
  const proc = Bun.spawn([
    "ffmpeg", ...FFMPEG,
    "-t", String(checkDuration),
    "-i", INPUT_VIDEO,
    "-vf", `fps=10,crop=10:10:0:0,format=rgb24,signalstats,metadata=print:key=lavfi.signalstats.RED_MIN:file=${stats}`,
    "-f", "null", "-"
  ])
  const [code, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()])
  if (code !== 0) {
    console.warn(`ffmpeg marker detection failed: ${stderr}`)
    return 0
  }
  const lines = readFileSync(stats, "utf8").split("\n")
  let frameIndex = 0
  for (const line of lines) {
    const frameMatch = line.match(/^frame:(\d+)/)
    if (frameMatch) {
      frameIndex = parseInt(frameMatch[1] ?? "0", 10)
      continue
    }
    const redMin = line.match(/lavfi\.signalstats\.RED_MIN=([\d.]+)/)
    if (!redMin) continue
    // Red marker has high red value (255), low green/blue
    // We check RED_MIN > 200 in the 10x10 crop at (0,0)
    if (parseFloat(redMin[1] ?? "0") > 200) {
      return frameIndex / 10 // 10fps sampling
    }
  }
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
    .map((mark) => {
      // Match frame number from "NN-name.png" or "story-NN-name.png" format
      const match = mark.frame.match(/(?:^|story-)(\d+)/)
      return {
        frame: parseInt(match?.[1] ?? "0", 10),
        start: mark.elapsed,
      }
    })
    .filter((mark) => mark.frame > 0)
    .sort((a, b) => a.start - b.start)
}

/** Mark names stay strings: chapter takes name beats, they do not number them. */
function loadMarks() {
  if (!existsSync(MARKS_PATH)) {
    console.error(`❌ missing ${MARKS_PATH} — record the take first`)
    process.exit(1)
  }
  const marks: MarkEntry[] = JSON.parse(readFileSync(MARKS_PATH, "utf8"))
  return marks
    .map((mark) => ({ frame: mark.frame, start: mark.elapsed }))
    .sort((a, b) => a.start - b.start)
}

async function durationOf(file: string) {
  const out = await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${file}`.quiet()
  return parseFloat(out.stdout.toString().trim())
}

/**
 * A take has no spare time. Fit the narration into the window before the next
 * mark: speed it up (up to 1.6×) before trimming it. The picture never waits.
 */
async function fitNarration(file: string, window: number) {
  const duration = await durationOf(file)
  if (!Number.isFinite(duration) || duration <= window) return file
  const tempo = Math.min(1.6, duration / window)
  const out = resolve(WORK_DIR, "narration", `${basename(file).replace(/\.\w+$/, "")}-fit.m4a`)
  mkdirSync(resolve(WORK_DIR, "narration"), { recursive: true })
  await run([
    "-i", file,
    "-filter:a", `atempo=${tempo.toFixed(3)}`,
    "-t", window.toFixed(3),
    "-c:a", "aac", "-b:a", "128k",
    out,
  ])
  console.log(`  ✂️  ${basename(file)} ${duration.toFixed(2)}s → ${window.toFixed(2)}s (${tempo.toFixed(2)}×)`)
  return out
}

/** One still per mark, taken from the same take as the cut. */
async function extractStills(marks: { frame: string | number; videoStart: number }[], dir: string) {
  mkdirSync(dir, { recursive: true })
  for (const mark of marks) {
    const name = String(mark.frame).replace(/\.png$/, "")
    await run([
      "-ss", mark.videoStart.toFixed(3),
      "-i", INPUT_VIDEO,
      "-frames:v", "1",
      resolve(dir, `${name}.png`),
    ])
  }
  console.log(`  🖼️  ${marks.length} stills → ${dir}`)
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
  videoPath = INPUT_VIDEO,
) {
  const silenceDur = 0.15 // 150ms gap between segments

  // Each entry is exactly one ffmpeg input. Silences are bounded at the input
  // (`-t` before `-i`), so concat cannot stall on an endless lavfi source.
  const audioInputs: string[][] = []
  let currentTime = 0
  for (const seg of segments) {
    const gap = seg.start - currentTime
    if (gap > 0.01) {
      audioInputs.push(["-f", "lavfi", "-t", gap.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo"])
    }
    audioInputs.push(["-i", seg.file])
    const durOut = await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${seg.file}`.quiet()
    const segDur = parseFloat(durOut.stdout.toString().trim())
    currentTime = seg.start + segDur + silenceDur
  }
  if (audioInputs.length === 0) {
    audioInputs.push(["-f", "lavfi", "-t", dims.duration.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo"])
    currentTime = dims.duration
  }
  if (currentTime < dims.duration) {
    audioInputs.push(["-f", "lavfi", "-t", (dims.duration - currentTime).toFixed(3), "-i", "anullsrc=r=48000:cl=stereo"])
  }

  const videoInput = audioInputs.length
  // edge-tts emits 24 kHz mono; concat needs one sample rate and layout for every segment.
  const normalize = audioInputs
    .map((_, i) => `[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`)
    .join(";")
  const labels = audioInputs.map((_, i) => `[a${i}]`).join("")
  const narrationConcat =
    audioInputs.length > 1
      ? `${normalize};${labels}concat=n=${audioInputs.length}:v=0:a=1[narration]`
      : "[0:a]anull[narration]"

  const filter = `${narrationConcat};[narration]aformat=channel_layouts=stereo,aresample=48000[nar2];[${videoInput}:v]fps=30,scale=${dims.w}:${dims.h},format=yuv420p,fade=t=out:st=${(dims.duration - 0.6).toFixed(2)}:d=0.6[vout];[nar2]anull[mix]`

  await run([
    ...audioInputs.flat(),
    "-i", videoPath,
    "-filter_complex", filter,
    "-map", "[vout]",
    "-map", "[mix]",
    "-t", dims.duration.toFixed(3),
    ...ENCODE(crf, preset),
    out,
  ])
}

/**
 * Turns the live recording into one clip per frame, paced so the narration for
 * that frame fits: keep the real interaction for its window, then freeze the
 * last frame for the remainder. Returns the clips in order and the narration
 * start times on the new timeline.
 */
async function renderFrameClips(
  marks: { frame: string | number; videoStart: number }[],
  audioByFrame: Map<string, string>,
  dims: { w: number; h: number; duration: number; fps: number },
  crf: number,
  preset: string,
) {
  const clipDir = resolve(WORK_DIR, "frames")
  mkdirSync(clipDir, { recursive: true })
  const clips: string[] = []
  const segments: { start: number; file: string }[] = []
  let clock = 0

  for (const [i, mark] of marks.entries()) {
    const from = mark.videoStart
    const until = marks[i + 1]?.videoStart ?? dims.duration
    // Keep the action that happened before the next capture; cap very long gaps.
    const window = Math.max(0.5, Math.min(until - from, 6))
    const audio = audioByFrame.get(String(mark.frame))
    const narr = audio
      ? parseFloat(
          (
            await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${audio}`.quiet()
          ).stdout
            .toString()
            .trim(),
        )
      : 0
    const target = Math.max(window + 0.25, narr + 0.5)
    const pad = Math.max(0, target - window)
    const clip = resolve(clipDir, `${String(i).padStart(2, "0")}.mp4`)

    await run([
      "-ss", from.toFixed(3),
      "-t", window.toFixed(3),
      "-i", INPUT_VIDEO,
      "-an",
      "-vf", `fps=30,scale=${dims.w}:${dims.h},format=yuv420p,tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}`,
      "-t", target.toFixed(3),
      ...ENCODE(crf, preset),
      clip,
    ])
    clips.push(clip)
    if (audio) segments.push({ start: clock + 0.1, file: audio })
    clock += target
  }

  const list = resolve(WORK_DIR, "frames.txt")
  writeFileSync(list, clips.map((file) => `file '${file}'`).join("\n"))
  const bodyVideo = resolve(WORK_DIR, "body-video.mp4")
  await run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", bodyVideo])

  return { bodyVideo, segments, duration: clock }
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
  const mode = opt("--mode") ?? "continuous"
  if (!["continuous", "padded", "stills"].includes(mode)) {
    console.error(`❌ unknown --mode ${mode} (continuous|padded|stills)`)
    process.exit(1)
  }
  INPUT_VIDEO = opt("--input") ? resolve(opt("--input")!) : INPUT_VIDEO
  MARKS_PATH = opt("--marks") ? resolve(opt("--marks")!) : MARKS_PATH
  OUTPUT_VIDEO = opt("--out") ? resolve(opt("--out")!) : OUTPUT_VIDEO
  STILLS_DIR = opt("--stills") ? resolve(opt("--stills")!) : STILLS_DIR
  const crf = draft ? 28 : 20
  const preset = draft ? "ultrafast" : "medium"

  if (!existsSync(INPUT_VIDEO)) {
    console.error(`❌ missing ${INPUT_VIDEO} — record the take first`)
    process.exit(1)
  }
  await Bun.$`mkdir -p ${WORK_DIR}/tts`.quiet()
  const manifest: ManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  const dims = await probe(INPUT_VIDEO)
  console.log(`📹 ${INPUT_VIDEO} — ${dims.w}x${dims.h}, ${dims.duration.toFixed(1)}s @ ${dims.fps}fps`)
  // The cards match whatever the recording actually renders at.
  const W = dims.w
  const H = dims.h

  const continuous = mode !== "padded"
  const beacon = await detectBeacon(dims.fps)
  const timing = continuous ? loadMarks() : loadTiming(manifest)
  const marks = timing.map((entry) => ({
    frame: entry.frame,
    videoStart: Math.max(0, entry.start + beacon),
  }))
  const byFrame = new Map(marks.map((mark) => [mark.frame, mark.videoStart]))

  if (mode === "stills") {
    await extractStills(marks, STILLS_DIR ?? resolve(VIDEO_DIR, "stills"))
    return
  }

  // ── narration TTS (cached by text hash so re-runs skip synthesis) ───
  console.log("\n🎙️  Generating narration segments…")
  const audioByFrame = new Map<string, string>()
  for (const entry of manifest) {
    const key = continuous ? entry.file : String(entry.frame)
    const start = byFrame.get(key)
    if (start === undefined) {
      console.warn(`  ⚠  ${key}: no mark — narration skipped`)
      continue
    }
    const cacheDir = resolve(WORK_DIR, "tts")
    const hashInput = `${entry.frame}|${voice}|${TTS_RATE}|${entry.narration}`
    const hashKey = Buffer.from(hashInput).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "").slice(0, 32)
    console.log(`  [DEBUG] Frame ${entry.frame}: hashKey=${hashKey}`)
    const audio = resolve(cacheDir, `${continuous ? key.replace(/\.png$/, "") : String(entry.frame).padStart(2, "0")}-${hashKey}.mp3`)
    if (!existsSync(audio) || (await Bun.file(audio).stat()).size === 0) {
      const textFile = resolve(cacheDir, `${String(entry.frame).padStart(2, "0")}-${hashKey}.txt`)
      writeFileSync(textFile, entry.narration)
      // Use shell to ensure proper environment and stderr capture
      const cmd = `python3 -m edge_tts --rate ${TTS_RATE} --voice ${voice} --file ${textFile} --write-media ${audio} 2>&1`
      // Retry with exponential backoff for transient network failures
      let lastError = ""
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`  [DEBUG] Running (attempt ${attempt}): ${cmd}`)
        const proc = Bun.spawn(["bash", "-c", cmd], { cwd: process.cwd() })
        const [code, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text()])
        console.log(`  [DEBUG] Exit code: ${code}, stdout length: ${stdout.length}`)
        if (code === 0 && (await Bun.file(audio).stat()).size > 0) break
        lastError = stdout || `empty output file (${(await Bun.file(audio).stat()).size} bytes)`
        if (attempt < 3) {
          const delay = Math.min(1000 * 2 ** attempt, 10000)
          console.log(`  [DEBUG] Attempt ${attempt} failed, retrying in ${delay}ms...`)
          await new Promise((r) => setTimeout(r, delay))
        }
      }
      if (lastError) throw new Error(`edge_tts failed after 3 attempts: ${lastError}`)
    }
    // Delay between requests to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500))
    audioByFrame.set(key, audio)
  }
  console.log(`  ✅ ${audioByFrame.size} segments ready`)

  const bodyPath = resolve(WORK_DIR, "body.mp4")
  let duration: number
  if (continuous) {
    // The take is the picture. Fit each narration line into the gap before the
    // next mark; never hold a frame so a line can finish.
    console.log("\n🎬 Rendering continuous take…")
    const segments: { start: number; file: string }[] = []
    for (const [i, mark] of marks.entries()) {
      const audio = audioByFrame.get(String(mark.frame))
      if (!audio) continue
      const end = marks[i + 1]?.videoStart ?? dims.duration
      const window = Math.max(0.4, end - mark.videoStart - 0.25)
      segments.push({ start: mark.videoStart + 0.1, file: await fitNarration(audio, window) })
    }
    duration = dims.duration
    await body(bodyPath, segments, { ...dims, duration }, crf, preset, INPUT_VIDEO)
    console.log(`  ✅ ${segments.length} narration lines over ${duration.toFixed(1)}s of motion`)
  } else {
    console.log("\n🎬 Rendering padded frame clips (legacy)…")
    const paced = await renderFrameClips(marks, audioByFrame, { ...dims, w: W, h: H }, crf, preset)
    duration = paced.duration
    await body(bodyPath, paced.segments, { ...dims, duration }, crf, preset, paced.bodyVideo)
    console.log(`  ✅ ${paced.segments.length} clips, ${duration.toFixed(1)}s body`)
  }

  if (STILLS_DIR) await extractStills(marks, STILLS_DIR)

  // ── hook + cards ──
  const numbered = marks.filter((mark): mark is { frame: number; videoStart: number } => typeof mark.frame === "number")
  const canHook = numbered.length === marks.length
  const parts = [bodyPath]
  if (!skipHook && !canHook) console.log("⏭️  hook needs numbered frames; skipped for this named take")
  if (!skipHook && canHook) {
    console.log("✂️  Building hook montage…")
    const titlePath = resolve(WORK_DIR, "title-card.mp4")
    const endPath = resolve(WORK_DIR, "end-card.mp4")
    await card(titlePath, "SessionGraph", "your session as it runs", W, H, crf, preset)
    await card(endPath, "SessionGraph", "Ctrl+Shift+M", W, H, crf, preset)
    const slices = hookSlices(numbered, sliceSeconds)
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
  const finalPath = OUTPUT_VIDEO
  await concatList(parts, finalPath)
  const finalSize = await Bun.$`stat -c%s ${finalPath}`.text()
  console.log(`✅ ${finalPath} — ${(parseInt(finalSize.trim()) / 1024 / 1024).toFixed(1)} MB`)

  // Webm render removed per v36: mp4 only
  // if (!draft) {
  //   console.log("🌐 Rendering demo.webm…")
  //   await renderWebm(finalPath, resolve(VIDEO_DIR, "demo.webm"), draft)
  //   console.log(`✅ demo.webm`)
  // }

  console.log(`\n📊 body length ${duration.toFixed(1)}s (${(duration / 60).toFixed(1)} min)`)
  console.log(`   intermediate files under ${WORK_DIR} (delete freely, rebuilt on re-run)`)
}

main()
