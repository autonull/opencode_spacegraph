// Pixel diff utility for graph screenshot verification
// Uses pixelmatch for image comparison with configurable threshold

import { readFileSync } from "node:fs"
import { PNG } from "pngjs"
import pixelmatch from "pixelmatch"

export interface PixelDiffOptions {
  /** Threshold for pixel difference (0-1). Default 0.1% = 0.001 */
  threshold?: number
  /** Maximum allowed percentage of differing pixels (0-100). Default 0.1% */
  maxDiffPercent?: number
  /** Include anti-aliasing in diff. Default true */
  includeAA?: number
  /** Color difference threshold (0-255). Default 16 */
  alpha?: number
}

export interface PixelDiffResult {
  identical: boolean
  diffPixels: number
  totalPixels: number
  diffPercent: number
  diffImage?: Buffer
}

/**
 * Compare two PNG images and return diff statistics.
 * @param img1Path - Path to first image (baseline/committed)
 * @param img2Path - Path to second image (freshly captured)
 * @param options - Comparison options
 * @returns Diff result with statistics and optional diff image
 */
export function compareImages(
  img1Path: string,
  img2Path: string,
  options: PixelDiffOptions = {}
): PixelDiffResult {
  const {
    threshold = 0.1,
    maxDiffPercent = 0.1,
    includeAA = 0.1,
    alpha = 16,
  } = options

  const img1 = PNG.sync.read(readFileSync(img1Path))
  const img2 = PNG.sync.read(readFileSync(img2Path))

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return {
      identical: false,
      diffPixels: -1,
      totalPixels: img1.width * img1.height,
      diffPercent: 100,
      diffImage: undefined,
    }
  }

  const diff = new PNG({ width: img1.width, height: img1.height })
  const diffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
    threshold,
    includeAA,
    alpha,
    diffColor: [255, 0, 0],
    diffColorAlt: [255, 255, 0],
  })

  const totalPixels = img1.width * img1.height
  const diffPercent = (diffPixels / totalPixels) * 100
  const identical = diffPercent <= maxDiffPercent

  return {
    identical,
    diffPixels,
    totalPixels,
    diffPercent,
    diffImage: PNG.sync.write(diff),
  }
}

/**
 * Compare a directory of fresh captures against the committed screenshots.
 * @param freshDir - Directory with freshly captured screenshots
 * @param committedDir - Directory with committed/reference screenshots
 * @param options - Comparison options
 * @returns Array of results for each compared frame
 */
export function compareDirectories(
  freshDir: string,
  committedDir: string,
  options: PixelDiffOptions = {}
): Array<{ frame: string; result: PixelDiffResult }> {
  const { readdirSync, existsSync, statSync } = require("node:fs")
  const { join } = require("node:path")

  const results: Array<{ frame: string; result: PixelDiffResult }> = []

  const freshFiles = readdirSync(freshDir).filter((f: string) => f.endsWith(".png"))

  for (const file of freshFiles) {
    const freshPath = join(freshDir, file)
    const committedPath = join(committedDir, file)

    if (!existsSync(committedPath)) {
      results.push({
        frame: file,
        result: {
          identical: false,
          diffPixels: -1,
          totalPixels: 0,
          diffPercent: 100,
          diffImage: undefined,
        },
      })
      continue
    }

    const result = compareImages(committedPath, freshPath, options)
    results.push({ frame: file, result })
  }

  return results
}

/**
 * Format diff result for console output.
 */
export function formatDiffResult(frame: string, result: PixelDiffResult): string {
  if (result.diffPixels === -1) {
    return `  ❌ ${frame}: MISSING or DIMENSION MISMATCH`
  }
  if (result.identical) {
    return `  ✅ ${frame}: ${result.diffPercent.toFixed(3)}% diff (${result.diffPixels}/${result.totalPixels} px)`
  }
  return `  ❌ ${frame}: ${result.diffPercent.toFixed(3)}% diff (${result.diffPixels}/${result.totalPixels} px) EXCEEDS THRESHOLD`
}