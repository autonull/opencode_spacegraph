import type { RenderTheme } from "@spacegraphjs/renderer"
import type { GraphNode, NodeKind, ZoomLevel } from "@opencode/session-ui/graph"
import { isClusterExpanded, phaseCategoryOf } from "@opencode/session-ui/graph"
import { escapeHtml, type BandTemplate, type CardTemplate } from "../canvas/buildRenderModel"

/**
 * RF.3 — the rich activity card. It is a host template (the render model stays neutral): a leading
 * kind glyph on a tinted chip, a single-line ellipsised label, a clamped summary, and status as a
 * corner dot rather than a full fill, so the graph is not a wall of green. Paths and tool names are
 * monospaced. Metrics are explicit 13px / `--line-height-compact`.
 */

const GLYPH: Record<NodeKind, string> = {
  session: "M8 1.5 9.9 6l4.6.3-3.6 2.9 1.2 4.4L8 11.2 3.9 13.6l1.2-4.4L1.5 6.3 6.1 6z",
  turn: "M4 3l8 5-8 5z",
  phase: "M2 4h12M2 8h12M2 12h12",
  message: "M2 3h12v8H6l-4 3z",
  reasoning: "M8 1.5a4 4 0 0 0-2.5 7.1V11h5V8.6A4 4 0 0 0 8 1.5zM6 12.5h4v2H6z",
  tool: "M9.5 2.5a3 3 0 0 0-4 4L2 10v2l2 2 3.5-3.5a3 3 0 0 0 4-4l-1.8 1.8-1.7-1.7z",
  file: "M4 1.5h5l3 3v10H4zM9 1.5V5h3",
  subagent: "M5.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2 13.5c0-2 1.6-3.5 3.5-3.5S9 11.5 9 13.5M11 7.5a1.6 1.6 0 1 0 0-3.2",
  result: "M3 8.5 6.5 12 13 4",
  error: "M8 2 1.5 13.5h13zM8 6v4M8 11.5v.5",
  retry: "M13 8a5 5 0 1 1-1.5-3.5M13 2v3h-3",
  compaction: "M2 4h12M4 8h8M6 12h4",
  notice: "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 7.5v4M8 4.5v.5",
  diff: "M4 2v12M12 2v12M4 5h4M4 10h4M9 13.5 12 13.5M10.5 12v3M9 2.5l3 0M10.5 1v3",
  approval: "M3 7.5 6.5 11 13 3.5",
}

const CATEGORY_HUE: Record<string, number> = {
  explore: 210,
  edit: 145,
  verify: 38,
  delegate: 275,
  result: 196,
}

const KIND_HUE: Partial<Record<NodeKind, number>> = {
  session: 265,
  turn: 220,
  message: 220,
  reasoning: 300,
  subagent: 275,
  file: 190,
  result: 196,
  diff: 160,
  error: 0,
  retry: 28,
  notice: 220,
  compaction: 220,
  approval: 145,
  phase: 210,
  tool: 210,
}

function hue(node: GraphNode): number {
  const category = phaseCategoryOf(node)
  if (category && CATEGORY_HUE[category] !== undefined) return CATEGORY_HUE[category]
  if (node.kind === "phase") return CATEGORY_HUE[String(node.data?.category)] ?? 210
  return KIND_HUE[node.kind] ?? 210
}

function accent(node: GraphNode) {
  const h = hue(node)
  return { solid: `hsl(${h} 70% 55%)`, soft: `hsl(${h} 70% 55% / 0.16)` }
}

function statusColor(theme: RenderTheme, node: GraphNode) {
  switch (node.status) {
    case "success":
      return theme.success
    case "failed":
      return theme.error
    case "interrupted":
      return theme.warning
    case "running":
    case "pending":
      return theme.accent
    default:
      return theme.border
  }
}

const MONO_KINDS = new Set<NodeKind>(["tool", "file", "diff"])

export function createCardTemplate(theme: RenderTheme): CardTemplate {
  return (node: GraphNode, level: ZoomLevel) => {
    const { solid, soft } = accent(node)
    const mono = MONO_KINDS.has(node.kind)
    // A derived cluster shows its member count while collapsed (overview chip); once expanded the
    // header is a plain labelled panel, so the count is dropped (RF.5/LE.2, §5.4).
    const count = node.derived && node.clusterOf && !isClusterExpanded(level) ? node.clusterOf.length : 0
    const badge = count ? `<span style="color:${theme.textMuted};font-weight:500"> ${count}</span>` : ""
    const labelFont = mono ? `ui-monospace,SFMono-Regular,Menlo,monospace` : `inherit`
    const status = statusColor(theme, node)
    const border = node.status === "neutral" || node.status === "success" ? theme.border : status
    const summary = node.summary
      ? `<span style="color:${theme.textMuted};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(node.summary)}</span>`
      : ""

    return `<div data-kind="${node.kind}" data-status="${node.status}" style="display:flex;align-items:center;gap:8px;height:100%;box-sizing:border-box;padding:8px 10px;background:${theme.surface};border:1px solid ${border};border-radius:8px;color:${theme.text};font-family:${theme.fontFamily};font-size:13px;line-height:var(--line-height-compact,16px)">
<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;flex:none;border-radius:7px;background:${soft};color:${solid}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${GLYPH[node.kind]}"/></svg></span>
<span style="min-width:0;flex:1;display:flex;flex-direction:column;justify-content:center;gap:1px">
<span style="display:flex;gap:4px;align-items:baseline;font-weight:600;font-family:${labelFont};white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(node.label)}</span>${badge}</span>
${summary}
</span>
<span style="flex:none;align-self:flex-start;width:8px;height:8px;border-radius:9999px;background:${status}"></span>
</div>`
  }
}

/**
 * RF.5 — a swimlane band behind the content: a rounded box tinted by the cluster's accent with a
 * clipped header carrying the label, the member count, and a status dot.
 */
export function createBandTemplate(theme: RenderTheme): BandTemplate {
  return (node: GraphNode, count: number, bounds) => {
    const { solid, soft } = accent(node)
    const label = escapeHtml(node.label.replace(/\s+/g, " ").trim().slice(0, 48))
    const width = Math.round(bounds.max.x - bounds.min.x + 56)
    const height = Math.round(bounds.max.y - bounds.min.y + 56)

    return `<div data-band="${node.kind}" style="width:${width}px;height:${height}px;box-sizing:border-box;border:1px solid ${solid};border-radius:14px;background:${soft};pointer-events:none;position:relative;font-family:${theme.fontFamily}">
<span style="position:absolute;top:6px;left:12px;display:inline-flex;align-items:center;gap:6px;max-width:calc(100% - 24px);padding:2px 8px;border-radius:9999px;background:${theme.surface};color:${theme.text};font-size:11px;font-weight:600;line-height:var(--line-height-compact,16px)">
<span style="width:6px;height:6px;border-radius:9999px;background:${solid}"></span>
<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
<span style="color:${theme.textMuted}">${count}</span>
</span>
</div>`
  }
}
