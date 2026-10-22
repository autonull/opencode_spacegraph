import type { RenderTheme } from "@spacegraphjs/renderer"
import type { DetailTier, EqualizerRule, EqualizerRuleSet, GraphNode, NodeKind, ZoomLevel } from "@opencode/session-ui/graph"
import { equalizerFade, equalizerMatch, isClusterExpanded, phaseCategoryOf } from "@opencode/session-ui/graph"
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
  phase: 210,
  tool: 210,
}

function hue(node: GraphNode): number {
  const category = phaseCategoryOf(node)
  if (category && CATEGORY_HUE[category] !== undefined) return CATEGORY_HUE[category]
  return KIND_HUE[node.kind] ?? 210
}

/**
 * T15.3 — the one function that maps a node to its accent. The cards, the legend and the
 * equalizer's own preview all read it, so a rule can never make the picture and the key disagree.
 * A style rule sets the hue; a muted card keeps its hue and loses its voice.
 */
export function accentOf(node: GraphNode, rules?: EqualizerRuleSet) {
  return accentFor(node, equalizerMatch(rules ?? [], node))
}

/** The accent a node carries under the rule that matched it. */
function accentFor(node: GraphNode, rule: EqualizerRule | undefined) {
  const h = rule?.hue ?? hue(node)
  const muted = rule?.muted === true
  const lightness = muted ? 42 : 55
  const alpha = muted ? 0.1 : 0.16
  return { solid: `hsl(${h} 70% ${lightness}%)`, soft: `hsl(${h} 70% ${lightness}% / ${alpha})` }
}

/** The tint a kind's chip carries, so the legend and the cards cannot drift apart. */
export function kindAccent(kind: NodeKind, rules?: EqualizerRuleSet) {
  return accentOf({ id: kind, kind, label: kind, status: "neutral" } as GraphNode, rules)
}

/** The tint a phase category's chip carries. */
export function categoryAccent(category: string, rules?: EqualizerRuleSet) {
  const node = { id: category, kind: "phase", label: category, status: "neutral", data: { category } } as GraphNode

  return accentOf(node, rules)
}

/**
 * The colour a status dot carries, so the legend and the cards cannot drift apart. A neutral node
 * has no outcome to show, so the caller names the colour that says "nothing happened here" — the
 * cards use the border, the minimap a muted mark.
 */
export function statusAccent(theme: RenderTheme, status: GraphNode["status"], neutral = theme.border) {
  switch (status) {
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
      return neutral
  }
}

function statusColor(theme: RenderTheme, node: GraphNode) {
  return statusAccent(theme, node.status)
}

const MONO_KINDS = new Set<NodeKind>(["tool", "file", "diff"])

export type CardTemplateOptions = {
  /** How much a card says at the reader's current distance from it. */
  tier?: DetailTier
  /** The selected node: its card says so. */
  selected?: string
  /** A fact only the graph knows — a file's readers, say — for the kinds that have none of their own. */
  related?: (node: GraphNode) => string | undefined
  /** T15: the equalizer's rules. A style rule changes a card's accent; an age rule fades it. */
  rules?: EqualizerRuleSet
  /** T15: the clock the age rules read. */
  now?: number
}

const text = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : undefined)
const firstLine = (value: string) => value.split("\n", 1)[0]?.trim() ?? ""

/**
 * The tool's input as one line: the path it touched, the command it ran, the pattern it searched.
 * The tool's name is the label, so the input is the thing the card adds.
 */
function inputLine(node: GraphNode): string | undefined {
  const input = node.data?.input
  if (typeof input === "string") return firstLine(input) || undefined
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined
  const record = input as Record<string, unknown>
  for (const key of ["path", "filePath", "command", "pattern", "query", "url", "description"]) {
    const value = record[key]
    if (typeof value === "string" && value.length > 0) return firstLine(value) || undefined
  }
  return undefined
}

/** Who spoke: the role is not in the label, which is the text. */
function messageDetail(node: GraphNode): string | undefined {
  const role = text(node.data?.role)
  if (!role) return undefined
  return node.data?.steered === true ? `${role} · steered` : role
}

/** What the tool produced: the first line of its output, and how it ended. */
function resultDetail(node: GraphNode): string | undefined {
  const output = text(node.data?.output)
  const exit = node.data?.exit
  const parts = [
    output ? firstLine(output) || undefined : undefined,
    typeof exit === "number" && exit !== 0 ? `exit ${exit}` : undefined,
    node.data?.timeout === true ? "timed out" : undefined,
  ].filter((part): part is string => !!part)

  return parts.length > 0 ? parts.join(" · ") : undefined
}

/** The first file a diff touched: the label says how many, not which. */
function diffDetail(node: GraphNode): string | undefined {
  const files = node.data?.files
  if (!Array.isArray(files)) return undefined
  return files.find((file): file is string => typeof file === "string")
}

/**
 * T11.3 — the one thing a kind has that its label does not. A card that has nothing to add adds
 * no line: an empty line is worse than no line, and a line that repeats the label says nothing
 * either. The tier decides how much room the card has; the kind decides what fills it.
 */
export function kindDetail(node: GraphNode): string | undefined {
  switch (node.kind) {
    case "session":
      return text(node.data?.forkedFrom) ?? text(node.data?.parentSessionID)
    case "turn":
    case "phase":
      return node.time === undefined ? undefined : new Date(node.time).toLocaleTimeString()
    case "message":
      return messageDetail(node)
    case "reasoning":
      return undefined
    case "tool":
      return inputLine(node)
    case "file":
      return undefined
    case "subagent":
      return text(node.data?.agent)
    case "result":
      return resultDetail(node)
    case "error":
      return text(node.data?.type)
    case "retry":
      return undefined
    case "compaction":
      return node.data?.replayed === true ? "replayed" : text(node.data?.reason)
    case "notice":
      return text(node.data?.source) ?? text(node.data?.type)
    case "diff":
      return diffDetail(node)
  }
}

export function createCardTemplate(theme: RenderTheme, options: CardTemplateOptions = {}): CardTemplate {
  return (node: GraphNode, level: ZoomLevel) => {
    const { solid, soft } = accentOf(node, options.rules)
    const mono = MONO_KINDS.has(node.kind)
    // A derived cluster shows its member count while collapsed (overview chip); once expanded the
    // header is a plain labelled panel, so the count is dropped (RF.5/LE.2, §5.4).
    const count = node.derived && node.clusterOf && !isClusterExpanded(level) ? node.clusterOf.length : 0
    const badge = count ? `<span style="color:${theme.textMuted};font-weight:500"> ${count}</span>` : ""
    const labelFont = mono ? `ui-monospace,SFMono-Regular,Menlo,monospace` : `inherit`
    const status = statusColor(theme, node)
    // T11.5 — a selected card says so. The selection is a theme token, so it follows the theme.
    const selected = options.selected === node.id
    const border = selected ? theme.selection : node.status === "neutral" || node.status === "success" ? theme.border : status
    const ring = selected ? `box-shadow:0 0 0 2px ${theme.selection}40;` : ""
    const tier = options.tier ?? "mid"
    // The card's box never changes — the layout owns the geometry — so a tier changes what the card
    // says inside it, never where it sits.
    const summary =
      tier !== "far" && node.summary
        ? `<span style="color:${theme.textMuted};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(node.summary)}</span>`
        : ""
    // T11.3 — the line a near card adds is its kind's own fact, and a kind with nothing to say
    // adds no line at all.
    const detail = tier === "near" ? (options.related?.(node) ?? kindDetail(node)) : undefined
    const detailRow = detail
      ? `<span style="color:${theme.textMuted};font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(detail)}</span>`
      : ""
    // T15: an age rule fades the card. It never moves the map — the fade is the card's own voice.
    const fade = options.now === undefined ? 1 : equalizerFade(options.rules ?? [], node, options.now)

    return `<div data-kind="${node.kind}" data-status="${node.status}" data-tier="${tier}"${selected ? ' data-selected="true"' : ""} style="display:flex;align-items:center;gap:8px;height:100%;box-sizing:border-box;padding:8px 10px;background:${theme.surface};border:1px solid ${border};${ring}border-radius:8px;${fade === 1 ? "" : `opacity:${fade};`}color:${theme.text};font-family:${theme.fontFamily};font-size:13px;line-height:var(--line-height-compact,16px)">
<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;flex:none;border-radius:7px;background:${soft};color:${solid}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${GLYPH[node.kind]}"/></svg></span>
<span style="min-width:0;flex:1;display:flex;flex-direction:column;justify-content:center;gap:1px">
<span style="display:flex;gap:4px;align-items:baseline;font-weight:600;font-family:${labelFont};white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(node.label)}</span>${badge}</span>
${summary}
${detailRow}
</span>
<span style="flex:none;align-self:flex-start;width:8px;height:8px;border-radius:9999px;background:${status}"></span>
</div>`
  }
}

/**
 * RF.5 — a swimlane band behind the content: a rounded box tinted by the cluster's accent with a
 * clipped header carrying the label, the member count, and a status dot.
 *
 * T1.17: the box is sized around the cards it groups and padded, so the header sits in the band's
 * own strip — clear of the cards — instead of on top of the first one. The header's line height is
 * fixed because its height is geometry, not typography.
 */
export function createBandTemplate(theme: RenderTheme, rules?: EqualizerRuleSet): BandTemplate {
  return (node: GraphNode, count: number, bounds) => {
    const { solid, soft } = accentOf(node, rules)
    const label = escapeHtml(node.label.replace(/\s+/g, " ").trim().slice(0, 48))
    const width = Math.round(bounds.max.x - bounds.min.x)
    const height = Math.round(bounds.max.y - bounds.min.y)

    return `<div data-band="${node.kind}" style="width:${width}px;height:${height}px;box-sizing:border-box;border:1px solid ${solid};border-radius:14px;background:${soft};pointer-events:none;position:relative;font-family:${theme.fontFamily}">
<span style="position:absolute;bottom:2px;left:8px;display:inline-flex;align-items:center;gap:6px;max-width:calc(100% - 16px);padding:2px 8px;border-radius:9999px;background:${theme.surface};color:${theme.text};font-size:11px;font-weight:600;line-height:16px">
<span style="width:6px;height:6px;border-radius:9999px;background:${solid}"></span>
<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
<span style="color:${theme.textMuted}">${count}</span>
</span>
</div>`
  }
}
