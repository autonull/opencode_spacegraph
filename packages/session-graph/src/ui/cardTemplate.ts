import type { RenderTheme } from "@spacegraphjs/renderer"
import type {
  DetailTier,
  EqualizerRule,
  EqualizerRuleSet,
  GraphNode,
  NodeKind,
  PhaseCategory,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import { equalizerFade, equalizerMatch, isClusterExpanded, phaseCategoryOf } from "@opencode/session-ui/graph"
import { escapeHtml, type BandTemplate, type CardTemplate } from "../canvas/buildRenderModel"
import { text } from "./node-data"

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
  directory: "M2 3h4l1.5 2H14v8H2z",
  subagent: "M5.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2 13.5c0-2 1.6-3.5 3.5-3.5S9 11.5 9 13.5M11 7.5a1.6 1.6 0 1 0 0-3.2",
  result: "M3 8.5 6.5 12 13 4",
  error: "M8 2 1.5 13.5h13zM8 6v4M8 11.5v.5",
  retry: "M13 8a5 5 0 1 1-1.5-3.5M13 2v3h-3",
  compaction: "M2 4h12M4 8h8M6 12h4",
  notice: "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 7.5v4M8 4.5v.5",
  diff: "M4 2v12M12 2v12M4 5h4M4 10h4M9 13.5 12 13.5M10.5 12v3M9 2.5l3 0M10.5 1v3",
  // T19-T26 derived kinds
  package: "M2 3h12v5H2zM6 3v5M10 3v5",
  commit: "M6 3v10M6 6h8M14 10v3M14 3v3",
  branch: "M4 1.5 8 6 4 10.5M8 6h8",
  symbol: "M8 2a4 4 0 0 1 4 4v4M12 14v3M2 10v3M8 6v8",
  test: "M8 2a6 6 0 0 1 6 6v3M2 8v3M8 14v3M14 8a6 6 0 0 1-6 6",
  "test-run": "M3 8.5 6.5 12 13 4",
  process: "M4 1.5h8v10H4zM8 1.5V5h4",
  port: "M4 4v8M12 4v8M4 8h8M8 12v3M8 1v3",
  issue: "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 7.5v4M8 4.5v.5M8 12.5v.5",
}

/** A small stack glyph for phase/group nodes to indicate they contain members. */
const GLYPH_GROUP = "M3 13.5V4.5M6 12.5V3.5M9 11.5V2.5M12 10.5V1.5"

/** The accent a phase category carries. Every category has one, so the legend cannot drift. */
const CATEGORY_HUE: Record<PhaseCategory, number> = {
  explore: 210,
  edit: 145,
  verify: 38,
  delegate: 275,
  result: 196,
}

/** The accent a kind carries when it does not belong to a phase. Every kind has one. */
const KIND_HUE: Record<NodeKind, number> = {
  session: 265,
  turn: 220,
  message: 220,
  reasoning: 300,
  subagent: 275,
  file: 190,
  directory: 45,
  result: 196,
  diff: 160,
  error: 0,
  retry: 28,
  notice: 220,
  compaction: 220,
  phase: 210,
  tool: 210,
  // T19-T26 derived kinds
  package: 45,
  commit: 28,
  branch: 28,
  symbol: 190,
  test: 38,
  "test-run": 38,
  process: 210,
  port: 210,
  issue: 0,
}

function hue(node: GraphNode): number {
  const category = phaseCategoryOf(node)
  if (category) return CATEGORY_HUE[category]
  return KIND_HUE[node.kind]
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

/** A stand-in node, so the legend can ask for a kind's or a category's accent without a model. */
const accentNode = (kind: NodeKind, data?: GraphNode["data"]): GraphNode => ({
  id: kind,
  kind,
  label: kind,
  status: "neutral",
  data,
})

/** The tint a kind's chip carries, so the legend and the cards cannot drift apart. */
export function kindAccent(kind: NodeKind, rules?: EqualizerRuleSet) {
  return accentOf(accentNode(kind), rules)
}

/** The tint a phase category's chip carries. */
export function categoryAccent(category: PhaseCategory, rules?: EqualizerRuleSet) {
  return accentOf(accentNode("phase", { category }), rules)
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

const MONO_KINDS = new Set<NodeKind>(["tool", "file", "diff"])

/** T30.3 — human-readable label for each snapshot source. */
export function sourceLabel(source: string): string {
  switch (source) {
    case "tree":
      return "filesystem"
    case "vcs":
      return "git"
    case "packages":
      return "packages"
    case "symbols":
      return "symbols"
    case "issues":
      return "issues"
    case "processes":
      return "processes"
    case "coverage":
      return "coverage"
    default:
      return source
  }
}

/** T30.3 — format a timestamp difference as a relative age string. */
export function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

/**
 * The card's own words. A card is canvas markup, so the host owns its language: the template never
 * hardcodes English. The host supplies the copy, and a card that has none says less rather than
 * saying it in one language only.
 */
export type CardCopy = {
  /** A prompt that was steered into a turn that was already running. */
  steered: (role: string) => string
  /** A command that ended with a non-zero code. */
  exit: (code: number) => string
  /** A command that ran out of time. */
  timedOut: () => string
  /** A compaction that replayed a provider's window. */
  replayed: () => string
  /** How many activities read a file. */
  reads: (count: number) => string
  /** How many activities wrote a file. */
  writes: (count: number) => string
}

export type CardTemplateOptions = {
  /** How much a card says at the reader's current distance from it. */
  tier?: DetailTier
  /** The selected node: its card says so. */
  selected?: string
  /** The turn the reader is reading in the log, when the two are side by side: its card says so. */
  active?: string
  /** A fact only the graph knows — a file's readers, say — for the kinds that have none of their own. */
  related?: (node: GraphNode) => string | undefined
  /** T15: the equalizer's rules. A style rule changes a card's accent; an age rule fades it. */
  rules?: EqualizerRuleSet
  /** T15: the clock the age rules read. */
  now?: number
  /** The card's words. The host supplies them; the template never hardcodes English. */
  copy: CardCopy
}

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
function messageDetail(node: GraphNode, copy: CardCopy | undefined): string | undefined {
  const role = text(node.data?.role)
  if (!role) return undefined
  return node.data?.steered === true ? (copy?.steered(role) ?? role) : role
}

/** What the tool produced: the first line of its output, and how it ended. */
function resultDetail(node: GraphNode, copy: CardCopy | undefined): string | undefined {
  const output = text(node.data?.output)
  const exit = node.data?.exit
  const parts = [
    output ? firstLine(output) || undefined : undefined,
    typeof exit === "number" && exit !== 0 ? copy?.exit(exit) : undefined,
    node.data?.timeout === true ? copy?.timedOut() : undefined,
  ].filter((part): part is string => !!part)

  return parts.length > 0 ? parts.join(" · ") : undefined
}

/** The first file a diff touched: the label says how many, not which. */
function diffDetail(node: GraphNode): string | undefined {
  const files = node.data?.files
  if (!Array.isArray(files)) return undefined
  return files.find((file): file is string => typeof file === "string")
}

/** Every file a diff touched, one per line: the closest card names them all. */
function diffFiles(node: GraphNode): string | undefined {
  const files = node.data?.files
  if (!Array.isArray(files)) return undefined
  const names = files.filter((file): file is string => typeof file === "string")
  return names.length > 0 ? names.join("\n") : undefined
}

/**
 * T17.5 — the kind's *content*: the payload, in the card's own lines. The closest card carries the
 * content in place of the summary and the fact: the box is fixed, so two lines of a smaller
 * payload line say more than one line of a summary and one line of a fact.
 */
export function kindContent(node: GraphNode, fact?: string, copy?: CardCopy): string | undefined {
  if (node.kind === "diff") return diffFiles(node)
  if (node.summary && fact) return `${fact}\n${node.summary}`
  return node.summary ?? fact
}

/**
 * T11.3 — the one thing a kind has that its label does not. A card that has nothing to add adds
 * no line: an empty line is worse than no line, and a line that repeats the label says nothing
 * either. The tier decides how much room the card has; the kind decides what fills it.
 */
export function kindDetail(node: GraphNode, copy?: CardCopy): string | undefined {
  switch (node.kind) {
    case "session":
      return text(node.data?.forkedFrom) ?? text(node.data?.parentSessionID)
    case "turn":
    case "phase":
      return node.time === undefined ? undefined : new Date(node.time).toLocaleTimeString()
    case "message":
      return messageDetail(node, copy)
    case "reasoning":
      return undefined
    case "tool":
      return inputLine(node)
    case "file":
      return undefined
    case "subagent":
      return text(node.data?.agent)
    case "result":
      return resultDetail(node, copy)
    case "error":
      return text(node.data?.type)
    case "retry":
      return undefined
    case "compaction":
      if (node.data?.replayed === true) return copy?.replayed()
      return text(node.data?.reason)
    case "notice":
      return text(node.data?.source) ?? text(node.data?.type)
    case "diff":
      return diffDetail(node)
  }
}

export function createCardTemplate(theme: RenderTheme, options: CardTemplateOptions): CardTemplate {
  return (node: GraphNode, level: ZoomLevel) => {
    const { solid, soft } = accentOf(node, options.rules)
    const mono = MONO_KINDS.has(node.kind)
    // A derived cluster shows its member count while collapsed (overview chip); once expanded the
    // header is a plain labelled panel, so the count is dropped (RF.5/LE.2, §5.4).
    const derivedCount = node.derived && node.clusterOf && !isClusterExpanded(level) ? node.clusterOf.length : 0
    // Phase/group nodes: show member count as a badge even when expanded (at execution/detail),
    // and include cluster members in data for potential hover preview.
    const isPhase = node.kind === "phase"
    const memberCount = isPhase && node.clusterOf ? node.clusterOf.length : 0
    const phaseBadge = memberCount > 0 ? `<span style="color:${theme.textMuted};font-weight:500;font-size:11px"> ${memberCount}</span>` : ""
    const derivedBadge = derivedCount ? `<span style="color:${theme.textMuted};font-weight:500"> ${derivedCount}</span>` : ""
    const labelFont = mono ? `ui-monospace,SFMono-Regular,Menlo,monospace` : `inherit`
    const status = statusAccent(theme, node.status)
    // T11.5 — a selected card says so. The selection is a theme token, so it follows the theme.
    const selected = options.selected === node.id
    const border = selected
      ? theme.selection
      : node.status === "neutral" || node.status === "success"
        ? theme.border
        : status
    const ring = selected ? `box-shadow:0 0 0 2px ${theme.selection}40;` : ""
    // The turn the reader is reading in the log says so with a stripe, not a ring: the selection owns
    // the ring, and two rings on one card would be one too many.
    const active = options.active === node.id
    const mark = active ? `box-shadow:inset 3px 0 0 ${theme.accent};` : ""
    const tier = options.tier ?? "mid"
    // The card's box never changes — the layout owns the geometry — so a tier changes what the card
    // says inside it, never where it sits.
    // T11.3 — the line a near card adds is its kind's own fact, and a kind with nothing to say
    // adds no line at all. The fact reads at the near band, so a mid card does not carry it.
    const fact =
      tier === "far" || tier === "mid" ? undefined : (options.related?.(node) ?? kindDetail(node, options.copy))
    // T17.5 — the closest card carries the payload itself, in the lines the box can hold.
    const content = tier === "closest" ? kindContent(node, fact, options.copy) : undefined
    const summary =
      tier !== "far" && !content && node.summary
        ? `<span style="color:${theme.textMuted};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(node.summary)}</span>`
        : ""
    const contentRow = content
      ? `<span style="color:${theme.textMuted};font-size:10px;white-space:pre-line;overflow:hidden">${escapeHtml(
          content.split("\n").slice(0, 2).join("\n"),
        )}</span>`
      : ""
    const detailRow =
      fact && !content
        ? `<span style="color:${theme.textMuted};font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(fact)}</span>`
        : ""
    // T15: an age rule fades the card. It never moves the map — the fade is the card's own voice.
    const fade = options.now === undefined ? 1 : equalizerFade(options.rules ?? [], node, options.now)

    // T30.3 — provenance badge on far tier: shows the source and age of derived facts
    const provenanceBadge = tier === "far" && node.provenance
      ? (() => {
          const { source, asOf } = node.provenance
          const age = asOf !== undefined && options.now !== undefined
            ? formatAge(options.now - asOf)
            : undefined
          const label = age ? `${sourceLabel(source)}, ${age}` : sourceLabel(source)
          return `<span style="flex:none;display:flex;align-items:center;gap:4px;font-size:10px;color:${theme.textMuted};padding:1px 4px;border-radius:3px;background:${theme.surfaceMuted}">${escapeHtml(label)}</span>`
        })()
      : ""

    // Phase/group node enhancements: distinct background, group glyph, member preview data
    const isGroupNode = isPhase
    const groupBg = isGroupNode ? `background:linear-gradient(180deg,${soft}00,${theme.surface});` : `background:${theme.surface};`
    const groupGlyph = isGroupNode ? GLYPH_GROUP : GLYPH[node.kind]
    const groupDataAttr = memberCount > 0 ? ` data-group-members="${escapeHtml(memberCount.toString())}"` : ""
    // At execution level and below, show a subtle expand indicator for phase nodes
    const expandIndicator = isGroupNode && level !== "overview"
      ? `<span style="flex:none;width:16px;height:16px;display:flex;align-items:center;justify-content:center;color:${theme.textMuted};opacity:0.5" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 6l3 3 3-3"/></svg></span>`
      : ""

    return `<div data-kind="${node.kind}" data-status="${node.status}" data-tier="${tier}"${selected ? ' data-selected="true"' : ""}${active ? ' data-active="true"' : ""}${groupDataAttr} style="display:flex;align-items:center;gap:8px;height:100%;box-sizing:border-box;padding:8px 10px;${groupBg}border:1px solid ${border};${ring}${mark}border-radius:8px;${fade === 1 ? "" : `opacity:${fade};`}color:${theme.text};font-family:${theme.fontFamily};font-size:13px;line-height:var(--line-height-compact,16px)">
<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;flex:none;border-radius:7px;background:${soft};color:${solid}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${groupGlyph}"/></svg></span>
<span style="min-width:0;flex:1;display:flex;flex-direction:column;justify-content:center;gap:1px">
<span style="display:flex;gap:4px;align-items:baseline;font-weight:600;font-family:${labelFont};white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(node.label)}</span>${isGroupNode ? phaseBadge : derivedBadge}</span>
${summary}
${contentRow}
${detailRow}
</span>
${expandIndicator}
${provenanceBadge}
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
