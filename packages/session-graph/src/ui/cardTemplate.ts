import type { RenderTheme } from "@spacegraphjs/renderer"
import type {
  DetailTier,
  EqualizerRule,
  EqualizerRuleSet,
  GraphNode,
  NodeKind,
  PhaseCategory,
  Position,
  ZoomLevel,
} from "@opencode/session-ui/graph"
import { equalizerFade, equalizerMatch, isClusterExpanded, phaseCategoryOf } from "@opencode/session-ui/graph"
import { escapeHtml, type BandTemplate, type CardTemplate } from "../canvas/buildRenderModel"
import { text } from "./node-data"

/** Safe escapeHtml that handles undefined/null. */
const safeEscapeHtml = (value: string | undefined) => escapeHtml(value ?? "")
import type { TraceOverlay } from "./overlay"
import { formatAge, sourceLabel } from "./provenance"
import { GLYPH, GLYPH_GROUP, CATEGORY_HUE, KIND_HUE, MONO_KINDS } from "./cardConstants"

/**
 * RF.3 — the rich activity card. It is a host template (the render model stays neutral): a leading
 * kind glyph on a tinted chip, a single-line ellipsised label, a clamped summary, and status as a
 * corner dot rather than a full fill, so the graph is not a wall of green. Paths and tool names are
 * monospaced. Metrics are explicit 13px / `--line-height-compact`.
 */

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
  /** Diff stats for a file: additions and deletions. */
  diff: (additions: number, deletions: number) => string
  /** The header toggle's action on a group card. */
  collapseGroup: () => string
  expandGroup: () => string
  /** The copy button label. */
  copyButton: () => string
}

/** Group card state for fold/unfold progression. */
export type GroupCardState = "folded" | "summary" | "expanded"

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
  /** Trace overlay for focus+context highlighting. */
  trace?: TraceOverlay
  /** B1: the diff overlay for a parked view or a two-turn comparison. */
  diff?: { added: ReadonlySet<string>; removed: ReadonlySet<string>; changed: ReadonlySet<string> }
  /** B2: groups the reader has folded; their header toggle says "expand" instead. */
  collapsedGroups?: ReadonlySet<string>
  /** Current zoom band (overview | execution | detail) for group state determination. */
  band?: "overview" | "execution" | "detail"
  /** Depth fade: positions map to calculate z-based fade for DOM cards. */
  positions?: ReadonlyMap<string, Position>
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
 * Computes the emphasis level for a card based on all active overlays.
 * Precedence (highest to lowest): diff.removed → trace.dim → focus.dim → diff.changed/added → selected/active → depth fade.
 * Returns { style: string, emphasis: string } where emphasis is the data-emphasis value.
 */
function emphasis(
  node: GraphNode,
  options: CardTemplateOptions,
  combinedFade: number,
  trace: TraceOverlay | undefined,
  diffKind: string | undefined,
  isLitNode: boolean,
  isAnswerNode: boolean,
  selected: boolean,
  active: boolean,
): { style: string; emphasis: string } {
  // diff.removed - highest priority
  if (diffKind === "removed") {
    return { style: "opacity:0.45;", emphasis: "dim" }
  }
  // trace.dim - node is not in answer or context
  if (trace && !isLitNode) {
    return { style: "opacity:0.35;", emphasis: "dim" }
  }
  // focus.dim - will be implemented in batch 1.3 (focus dimming)
  // For now, check if node is in focus neighborhood (selected + 1-hop neighbors)
  // This is a placeholder - the actual focus logic will be added in batch 1.3
  // diff.changed/added
  if (diffKind === "changed" || diffKind === "added") {
    return { style: "", emphasis: "changed" }
  }
  // selected/active
  if (selected || active) {
    return { style: "", emphasis: selected ? "selected" : "active" }
  }
  // depth fade (combinedFade includes equalizer fade * depth fade)
  // Skip at overview level (tier "far") where depth fade is not meaningful
  if (combinedFade !== 1 && options.tier !== "far") {
    return { style: `opacity:${combinedFade};`, emphasis: "depth" }
  }
  // No emphasis
  return { style: "", emphasis: "none" }
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

/** Generate a simple lane sparkline for a group node. */
function laneSparkline(node: GraphNode, options: CardTemplateOptions): string {
  const clusterOf = node.clusterOf
  if (!clusterOf || clusterOf.length === 0) return ""

  // Count members by lane (approximate from positions if available)
  // For now, return a simple visual indicator
  const lanes = Math.min(4, clusterOf.length)
  const dots = "●".repeat(lanes)
  return `<span style="font-size:10px;line-height:1;letter-spacing:1px">${dots}</span>`
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
        ? `<span style="color:${theme.textMuted};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeEscapeHtml(node.summary)}</span>`
        : ""
    const contentRow = content
      ? `<span style="color:${theme.textMuted};font-size:10px;white-space:pre-line;overflow:hidden">${safeEscapeHtml(
          content.split("\n").slice(0, 2).join("\n"),
        )}</span>`
      : ""
    const detailRow =
      fact && !content
        ? `<span style="color:${theme.textMuted};font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeEscapeHtml(fact)}</span>`
        : ""
    // T15: an age rule fades the card. It never moves the map — the fade is the card's own voice.
    const fade = options.now === undefined ? 1 : equalizerFade(options.rules ?? [], node, options.now)

    // Depth fade: fade cards based on their z-position (distance from camera).
    // Only applies when positions map is provided and not in 2D/flat mode.
    const depthFade = options.positions
      ? (() => {
          const pos = options.positions!.get(node.id)
          if (!pos) return 1
          // Position is { x, y, z } from spacegraphjs/layout
          const z = (pos as { x: number; y: number; z: number }).z
          // Fade starts at z=500, fully faded at z=2000 (arbitrary world units)
          // This gives a subtle depth cue without making distant cards unreadable.
          const fadeStart = 500
          const fadeEnd = 2000
          if (z <= fadeStart) return 1
          if (z >= fadeEnd) return 0.3
          return 1 - (z - fadeStart) / (fadeEnd - fadeStart) * 0.7
        })()
      : 1
    const combinedFade = fade * depthFade

    // T30.3 — provenance badge on far tier: shows the source and age of derived facts
    const provenanceBadge = tier === "far" && node.provenance
      ? (() => {
          const { source, asOf } = node.provenance
          const age = asOf !== undefined && options.now !== undefined
            ? formatAge(options.now - asOf)
            : undefined
          const label = age ? `${sourceLabel(source)}, ${age}` : sourceLabel(source)
          return `<span style="flex:none;display:flex;align-items:center;gap:4px;font-size:10px;color:${theme.textMuted};padding:1px 4px;border-radius:3px;background:${theme.surfaceMuted}">${safeEscapeHtml(label)}</span>`
        })()
      : ""

    // Phase/group node enhancements: distinct background, group glyph, member preview data
    const isGroupNode = isPhase || node.kind === "error-group" || node.kind === "file-group" || node.kind === "subagent-group"
    const hasCluster = node.clusterOf && node.clusterOf.length > 0
    const groupBg = isGroupNode ? `background:linear-gradient(180deg,${soft}00,${theme.surface});` : `background:${theme.surface};`
    const groupGlyph = isGroupNode ? GLYPH_GROUP : GLYPH[node.kind]
    const groupDataAttr = hasCluster ? ` data-group-members="${safeEscapeHtml(node.clusterOf!.length.toString())}"` : ""

    // Determine group card state: folded (overview), summary (execution+explicit collapse), expanded (execution/detail+not collapsed)
    // Only applies to group nodes with cluster members. Use band if provided, otherwise fall back to level.
    const band = options.band ?? (level as "overview" | "execution" | "detail") ?? "overview"
    const explicitlyCollapsed = hasCluster && options.collapsedGroups?.has(node.id) === true
    const groupState: GroupCardState =
      hasCluster
        ? band === "overview"
          ? "folded"
          : explicitlyCollapsed
            ? "summary"
            : "expanded"
        : "expanded"

    // At execution level and below, the group header folds the group. The chevron points the way the
    // members will go, and the header is the only part of a group card that carries the action.
    const groupToggle = isGroupNode && band !== "overview"
      ? `<button type="button" data-group-toggle="${explicitlyCollapsed ? "expand" : "collapse"}" aria-label="${safeEscapeHtml(explicitlyCollapsed ? options.copy?.expandGroup?.() : options.copy?.collapseGroup?.())}" aria-expanded="${!explicitlyCollapsed}" style="flex:none;width:20px;height:20px;display:flex;align-items:center;justify-content:center;padding:0;border:0;background:transparent;color:${theme.textMuted};cursor:pointer"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="transform:rotate(${explicitlyCollapsed ? -90 : 0}deg)"><path d="M5 6l3 3 3-3"/></svg></button>`
      : ""

    // Trace overlay: lit/dim classification for focus+context highlighting
    const trace = options.trace
    const isLitNode = trace ? (trace.answerIds.has(node.id) || trace.contextIds.has(node.id)) : true
    const isAnswerNode = trace ? trace.answerIds.has(node.id) : false
    const traceAttrs = trace
      ? ` data-trace="${isAnswerNode ? "answer" : isLitNode ? "context" : "dim"}"`
      : ""

    // Diff overlay: added, changed, and removed ghosts classify the card; positions never move.
    const diff = options.diff
    const diffKind = diff
      ? diff.removed.has(node.id)
        ? "removed"
        : diff.added.has(node.id)
          ? "added"
          : diff.changed.has(node.id)
            ? "changed"
            : undefined
      : undefined
    const diffAttrs = diffKind ? ` data-diff="${diffKind}"` : ""

    // V116: hover-only copy icon for cards with copyable content
    const copyText = copyableContent(node)
    const copyButton = copyText
      ? `<button type="button" class="card-copy-btn" aria-label="${safeEscapeHtml(options.copy?.copyButton?.())}" data-copy-text="${safeEscapeHtml(copyText)}" style="flex:none;width:20px;height:20px;display:flex;align-items:center;justify-content:center;padding:0;border:0;background:transparent;color:${theme.textMuted};cursor:pointer;opacity:0;transition:opacity 0.15s;margin-left:auto;"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>`
      : ""

    // Group summary row for "summary" state: shows lane sparkline + status accent
    const groupSummaryRow = isGroupNode && groupState === "summary"
      ? `<span style="display:flex;align-items:center;gap:6px;min-width:0;font-size:11px;color:${theme.textMuted};line-height:16px">
<span style="display:flex;gap:2px">${laneSparkline(node, options)}</span>
<span style="flex:none;width:8px;height:8px;border-radius:9999px;background:${status}"></span>
</span>`
      : ""

    // One emphasis resolver: computes the single emphasis level and style
    const { style: emphasisStyle, emphasis: emphasisLevel } = emphasis(
      node,
      options,
      combinedFade,
      trace,
      diffKind,
      isLitNode,
      isAnswerNode,
      selected,
      active,
    )

    // For folded state at overview, show only the label and member count (no summary/content/detail)
    const showFullContent = groupState !== "folded"
    const summaryContent = showFullContent ? summary : ""
    const contentRowContent = showFullContent ? contentRow : ""
    const detailRowContent = showFullContent ? detailRow : ""
    const groupSummaryContent = groupState === "summary" ? groupSummaryRow : ""

    return `<div data-kind="${node.kind}" data-status="${node.status}" data-tier="${tier}" data-emphasis="${emphasisLevel}" data-group-state="${groupState}"${selected ? ' data-selected="true"' : ""}${active ? ' data-active="true"' : ""}${groupDataAttr}${traceAttrs}${diffAttrs} style="display:flex;align-items:center;gap:8px;height:100%;box-sizing:border-box;padding:8px 10px;${groupBg}border:1px solid ${border};${ring}${mark}border-radius:8px;${emphasisStyle}color:${theme.text};font-family:${theme.fontFamily};font-size:13px;line-height:var(--line-height-compact,16px)">
<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;flex:none;border-radius:7px;background:${soft};color:${solid}"><svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${groupGlyph}"/></svg></span>
<span style="min-width:0;flex:1;display:flex;flex-direction:column;justify-content:center;gap:1px">
<span style="display:flex;gap:4px;align-items:baseline;font-weight:600;font-family:${labelFont};white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="overflow:hidden;text-overflow:ellipsis">${safeEscapeHtml(node.label)}</span>${isGroupNode ? phaseBadge : derivedBadge}</span>
${summaryContent}
${contentRowContent}
${detailRowContent}
${groupSummaryContent}
</span>
${groupToggle}
${provenanceBadge}
${copyButton}
<span style="flex:none;align-self:flex-start;width:8px;height:8px;border-radius:9999px;background:${status}"></span>
</div>`
  }
}

/**
 * V116 — micro-actions: hover-only copy icon for cards that have copyable content.
 * Returns the text to copy for a given node kind, or undefined if none.
 */
const COPYABLE_FIELD: Partial<Record<NodeKind, string>> = {
  file: "path",
  directory: "path",
  symbol: "qualified",
  commit: "sha",
  branch: "name",
  package: "name",
  process: "command",
  issue: "url",
}

export function copyableContent(node: GraphNode): string | undefined {
  const field = COPYABLE_FIELD[node.kind]
  if (field) return node.data?.[field] as string | undefined

  if (node.kind === "tool") {
    const input = node.data?.input
    if (typeof input === "string") return input
    if (input && typeof input === "object") {
      return (input as Record<string, unknown>).path as string | undefined
    }
    return undefined
  }

  if (node.kind === "port") return String(node.data?.port ?? "")

  return undefined
}
export function createBandTemplate(
  theme: RenderTheme,
  rules?: EqualizerRuleSet,
  options?: { copy?: CardCopy; collapsedGroups?: ReadonlySet<string>; band?: "overview" | "execution" | "detail" },
): BandTemplate {
  return (node: GraphNode, count: number, _bounds) => {
    const { solid, soft } = accentOf(node, rules)
    const label = safeEscapeHtml((node.label ?? "").replace(/\s+/g, " ").trim().slice(0, 48))
    const band = options?.band ?? "overview"
    const collapsed = options?.collapsedGroups?.has(node.id) === true

    // Determine band state: folded (overview), summary (execution+explicit collapse), expanded (execution/detail+not collapsed)
    const bandState: "folded" | "summary" | "expanded" =
      band === "overview"
        ? "folded"
        : collapsed
          ? "summary"
          : "expanded"

    const copy = options?.copy
    const toggle = copy
      ? `<button type="button" data-group-toggle="${collapsed ? "expand" : "collapse"}" aria-label="${safeEscapeHtml(collapsed ? copy.expandGroup?.() : copy.collapseGroup?.())}" aria-expanded="${!collapsed}" style="flex:none;width:20px;height:20px;display:flex;align-items:center;justify-content:center;padding:0;border:0;background:transparent;color:${theme.textMuted};cursor:pointer;pointer-events:auto"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="transform:rotate(${collapsed ? -90 : 0}deg)"><path d="M5 6l3 3 3-3"/></svg></button>`
      : ""

    // Summary row for summary state: shows lane sparkline + status accent
    const summaryRow = bandState === "summary"
      ? `<div style="position:absolute;bottom:8px;left:10px;right:10px;display:flex;align-items:center;gap:6px;min-width:0;pointer-events:none;font-size:10px;color:${theme.textMuted}">
<span style="display:flex;gap:1px">${"●".repeat(Math.min(4, count))}</span>
<span style="flex:none;width:6px;height:6px;border-radius:9999px;background:${solid}"></span>
</div>`
      : ""

    const ariaLabel = safeEscapeHtml(`${label}, ${count} members, ${bandState}`)
    return `<div data-band="${node.kind}" data-group-members="${count}" data-band-state="${bandState}" data-cluster-id="${safeEscapeHtml(node.id)}" role="group" aria-label="${ariaLabel}" tabindex="0" style="width:100%;height:100%;box-sizing:border-box;border:1px solid ${solid};border-radius:16px;background:${soft};pointer-events:auto;position:relative;overflow:hidden;cursor:grab;font-family:${theme.fontFamily};outline:none">
<div style="position:absolute;top:8px;left:10px;right:10px;display:flex;align-items:center;gap:6px;min-width:0;pointer-events:none">
<span style="flex:none;width:6px;height:6px;border-radius:9999px;background:${solid}"></span>
<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${theme.text};font-size:11px;font-weight:600;line-height:16px;letter-spacing:.04em;text-transform:uppercase">${label}</span>
<span style="flex:none;color:${theme.textMuted};font-size:11px;font-weight:600;line-height:16px">${count}</span>
${toggle}
</div>
${summaryRow}
</div>`
  }
}
