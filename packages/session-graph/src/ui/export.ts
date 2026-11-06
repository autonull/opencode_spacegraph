import type { RenderModel, RenderTheme } from "@spacegraphjs/renderer"
import { renderToSVG, serializeRenderModel, type SvgOptions } from "@spacegraphjs/svg-renderer"
import { escapeHtml } from "../canvas/buildRenderModel"

/** The shapes a map can leave the browser in. */
export type ExportFormat = "svg" | "json" | "html"

export type ExportOptions = {
  theme: RenderTheme
  /** The session's title; the export names the session it came from. */
  sessionTitle?: string
  /** The commit the map was built from. */
  testedCommit?: string
  /** The export's timestamp; the caller owns the clock. */
  timestamp?: string
}

/**
 * T3.4 — the map leaves the browser as a file: the drawing (SVG), the data behind it (JSON), or a
 * page that carries both (HTML). The export is the map's own model, so it says the same things the
 * canvas says.
 */
export function exportGraph(format: ExportFormat, model: RenderModel, options: ExportOptions) {
  const timestamp = options.timestamp ?? new Date().toISOString()
  const sessionTitle = options.sessionTitle ?? "OpenCode Session"
  const testedCommit = options.testedCommit ?? "unknown"

  if (format === "svg") {
    const svg = renderToSVG(model, svgOptions(options.theme))
    download(new Blob([svg], { type: "image/svg+xml" }), `session-map-${timestamp}.svg`)
    return
  }

  if (format === "json") {
    const json = serializeRenderModel(model)
    download(new Blob([json], { type: "application/json" }), `session-map-${timestamp}.json`)
    return
  }

  const svg = renderToSVG(model, svgOptions(options.theme))
  const json = serializeRenderModel(model)

  download(new Blob([standaloneHtml(svg, json, options.theme, sessionTitle, testedCommit, timestamp)], { type: "text/html" }), `session-map-${timestamp}.html`)
}

function svgOptions(theme: RenderTheme): SvgOptions {
  return { theme, padding: 24 }
}

/** The exported page: the drawing, the session's name, and the data behind it. */
function standaloneHtml(
  svg: string,
  json: string,
  theme: RenderTheme,
  sessionTitle: string,
  testedCommit: string,
  timestamp: string,
) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(sessionTitle)} - Session Map</title>
  <style>
    body { margin: 0; font-family: ${escapeHtml(theme.fontFamily)}; background: ${escapeHtml(theme.background)}; color: ${escapeHtml(theme.text)}; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .meta { font-size: 13px; color: ${escapeHtml(theme.textMuted)}; margin-bottom: 24px; }
    .meta code { background: ${escapeHtml(theme.surfaceMuted)}; padding: 2px 6px; border-radius: 4px; }
    .graph-container { border: 1px solid ${escapeHtml(theme.border)}; border-radius: 8px; overflow: hidden; background: ${escapeHtml(theme.background)}; }
    .graph-container svg { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(sessionTitle)}</h1>
    <div class="meta">
      Exported: ${new Date(timestamp).toLocaleString()} | Commit: <code>${escapeHtml(testedCommit)}</code>
    </div>
    <div class="graph-container">
      ${svg}
    </div>
    <details style="margin-top: 24px;">
      <summary style="cursor: pointer; color: ${escapeHtml(theme.textMuted)};">Raw JSON data</summary>
      <pre style="background: ${escapeHtml(theme.surface)}; padding: 16px; border-radius: 8px; overflow: auto; font-size: 12px; max-height: 300px;">${escapeHtml(json)}</pre>
    </details>
  </div>
</body>
</html>`
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
