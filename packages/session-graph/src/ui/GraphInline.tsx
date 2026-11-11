import { lazy, Suspense, createSignal, createEffect } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphViewData, GraphNode } from "@opencode/session-ui/graph"
import { turnSubgraph } from "@opencode/session-ui/graph"
import { TurnMapInlineGraph, type TurnMapInlineGraphProps } from "./TurnMapInlineGraph"
import type { SessionGraphProps } from "./SessionGraph"

/**
 * Static inline preview (L1): wraps TurnMapInlineGraph with a theme and fixed size.
 * Used in the transcript row to show a compact turn map.
 */
export interface GraphPreviewProps extends Omit<TurnMapInlineGraphProps, "model" | "turnID"> {
  model: GraphViewData
  turnID: string
}

export const GraphPreview = (props: GraphPreviewProps) => {
  const i18n = useI18n()
  const width = props.width ?? 320
  const height = props.height ?? 200

  return (
    <div
      class="graph-inline-preview"
      style={{ width: `${width}px`, height: `${height}px`, "flex-shrink": 0 }}
      role="img"
      aria-label={props.ariaLabel ?? i18n.t("ui.sessionGraph.inline.label")}
    >
      <TurnMapInlineGraph
        model={props.model}
        turnID={props.turnID}
        theme={props.theme}
        limit={props.limit}
        width={width}
        height={height}
        ariaLabel={props.ariaLabel}
      />
    </div>
  )
}

/**
 * Interactive inline graph (L2): lazy-mounts SessionGraph on expand.
 * Shows GraphPreview until the interactive graph is ready.
 * Props:
 * - model: the full session graph model
 * - turnID: the turn to scope to (uses roots prop on SessionGraph)
 * - shell: "bare" removes demo banner and applies min-h-0 layout
 * - chrome: false to hide all chrome (toolbar, inspector, etc.)
 * - height: explicit height for the inline box (required for WebGL mount)
 * - The inline instance reads spatial memory but never writes it (`spatialMemoryOwner={false}`)
 * - reducedMotion: respect reduced motion preference
 */
export interface GraphInlineProps {
  model: GraphViewData
  turnID: string
  /** Initial state: collapsed (preview only) or expanded (interactive). Default: false. */
  defaultExpanded?: boolean
  /** Explicit height for the inline box. Required for WebGL mount. Default: 320. */
  height?: number
  /** Maximum nodes in the preview. Default: 5. */
  limit?: number
  /** Theme override for the preview SVG. */
  previewTheme?: TurnMapInlineGraphProps["theme"]
  /** Accessible label for the preview. */
  previewAriaLabel?: string
  /** Called when expansion state changes. */
  onExpandChange?: (expanded: boolean) => void
  /** Optional renderNodeWidget for the interactive graph. */
  renderNodeWidget?: SessionGraphProps["renderNodeWidget"]
  /** Optional renderNodeHTML for the interactive graph. */
  renderNodeHTML?: SessionGraphProps["renderNodeHTML"]
  /** Optional renderCard for the interactive graph. */
  renderCard?: SessionGraphProps["renderCard"]
  /** Optional renderSummary for the interactive graph. */
  renderSummary?: SessionGraphProps["renderSummary"]
  /** Optional diffSource for the interactive graph. */
  diffSource?: SessionGraphProps["diffSource"]
  /** Optional shared notes for the interactive graph. */
  notes?: SessionGraphProps["notes"]
  onNotesChange?: SessionGraphProps["onNotesChange"]
  /** Optional shared pins for the interactive graph. */
  pins?: SessionGraphProps["pins"]
  onPinsChange?: SessionGraphProps["onPinsChange"]
  /** Optional layout for the interactive graph. Default: "tree". */
  layout?: SessionGraphProps["layout"]
  /** Optional depth for the interactive graph. Default: "flat". */
  depth?: SessionGraphProps["depth"]
  /** Optional detailMode for the interactive graph. Default: "popover". */
  detailMode?: SessionGraphProps["detailMode"]
  /** Optional level for the interactive graph. Default: "execution". */
  level?: SessionGraphProps["level"]
  /** Optional projection for the interactive graph. */
  projection?: SessionGraphProps["projection"]
  /** Optional onSelect for the interactive graph. */
  onSelect?: SessionGraphProps["onSelect"]
  /** Optional onOpenTranscript for the interactive graph. */
  onOpenTranscript?: SessionGraphProps["onOpenTranscript"]
  /** Optional onOpenSession for the interactive graph. */
  onOpenSession?: SessionGraphProps["onOpenSession"]
  /** Optional onActionNavigate for the interactive graph. */
  onActionNavigate?: SessionGraphProps["onActionNavigate"]
  /** Optional onActionReveal for the interactive graph. */
  onActionReveal?: SessionGraphProps["onActionReveal"]
  /** Optional onActionCopy for the interactive graph. */
  onActionCopy?: SessionGraphProps["onActionCopy"]
  /** Optional onActionRun for the interactive graph. */
  onActionRun?: SessionGraphProps["onActionRun"]
  /** Optional onBack for the interactive graph. */
  onBack?: SessionGraphProps["onBack"]
  /** Optional onTurnMap for the interactive graph. */
  onTurnMap?: SessionGraphProps["onTurnMap"]
  /** Optional onSplitView for the interactive graph. */
  onSplitView?: SessionGraphProps["onSplitView"]
  /** Optional sessionTitle for the interactive graph. */
  sessionTitle?: SessionGraphProps["sessionTitle"]
  /** Optional testedCommit for the interactive graph. */
  testedCommit?: SessionGraphProps["testedCommit"]
  /** Optional endInset for the interactive graph. */
  endInset?: SessionGraphProps["endInset"]
  /** Optional reducedMotion for the interactive graph. */
  reducedMotion?: SessionGraphProps["reducedMotion"]
  /** Optional breakpoints for the interactive graph. */
  breakpoints?: SessionGraphProps["breakpoints"]
}

/**
 * Lazy-loaded SessionGraph to avoid loading WebGL until expanded.
 */
const LazySessionGraph = lazy(() => import("./SessionGraph").then((mod) => ({ default: mod.SessionGraph })))

/**
 * GraphInline - a collapsible inline graph that shows a static preview (L1)
 * and lazily mounts an interactive SessionGraph (L2) on expand.
 */
export const GraphInline = (props: GraphInlineProps) => {
  const i18n = useI18n()
  const [expanded, setExpanded] = createSignal(props.defaultExpanded ?? false)
  const [sessionGraphReady, setSessionGraphReady] = createSignal(false)

  const height = props.height ?? 320
  const heightPx = `${height}px`

  // Build the turn-scoped roots for SessionGraph
  const buildRoots = (): readonly GraphNode[] => {
    const { nodes } = turnSubgraph(props.model, props.turnID, 7)
    return nodes
  }

  // Sync expanded state with onExpandChange callback
  createEffect(() => {
    props.onExpandChange?.(expanded())
  })

  const handleToggle = () => {
    setExpanded((prev) => !prev)
  }

  const handleSessionGraphReady = () => {
    setSessionGraphReady(true)
  }

  // Preview content (L1)
  const preview = (
    <GraphPreview
      model={props.model}
      turnID={props.turnID}
      width={320}
      height={height}
      limit={props.limit}
      theme={props.previewTheme}
      ariaLabel={props.previewAriaLabel}
    />
  )

  // Interactive content (L2) - only rendered when expanded
  const interactive = expanded() ? (
    <Suspense fallback={<div style={{ height: heightPx }} class="flex items-center justify-center" role="status" aria-label={i18n.t("ui.sessionGraph.inline.loading")} />}>
      <div style={{ height: heightPx, width: "100%" }}>
        <LazySessionGraph
          model={props.model}
          roots={buildRoots()}
          shell="bare"
          chrome={false}
          layout={props.layout ?? "tree"}
          depth={props.depth ?? "flat"}
          detailMode={props.detailMode ?? "popover"}
          level={props.level ?? "execution"}
          projection={props.projection}
          renderNodeWidget={props.renderNodeWidget}
          renderNodeHTML={props.renderNodeHTML}
          renderCard={props.renderCard}
          renderSummary={props.renderSummary}
          diffSource={props.diffSource}
          notes={props.notes}
          onNotesChange={props.onNotesChange}
          pins={props.pins}
          onPinsChange={props.onPinsChange}
          onSelect={props.onSelect}
          onOpenTranscript={props.onOpenTranscript}
          onOpenSession={props.onOpenSession}
          onActionNavigate={props.onActionNavigate}
          onActionReveal={props.onActionReveal}
          onActionCopy={props.onActionCopy}
          onActionRun={props.onActionRun}
          onBack={props.onBack}
          onTurnMap={props.onTurnMap}
          onSplitView={props.onSplitView}
          sessionTitle={props.sessionTitle}
          testedCommit={props.testedCommit}
          endInset={props.endInset}
          reducedMotion={props.reducedMotion ?? true}
          breakpoints={props.breakpoints}
          spatialMemoryOwner={false}
          maxDrillDepth={1}
          onRendererMounted={handleSessionGraphReady}
        />
      </div>
    </Suspense>
  ) : null

  return (
    <div class="graph-inline" data-slot="graph-inline">
      <div
        class="graph-inline-trigger"
        role="button"
        tabIndex={0}
        aria-expanded={expanded()}
        aria-controls="graph-inline-content"
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleToggle()
          }
        }}
      >
        <span class="graph-inline-trigger-label">
          {expanded() ? i18n.t("ui.sessionGraph.inline.collapse") : i18n.t("ui.sessionGraph.inline.expand")}
        </span>
      </div>
      <div id="graph-inline-content" class="graph-inline-content" role="region" aria-label={i18n.t("ui.sessionGraph.inline.region")}>
        {expanded() && !sessionGraphReady ? (
          // Show preview as placeholder while SessionGraph loads
          <div style={{ height: heightPx }} class="graph-inline-placeholder">
            {preview}
          </div>
        ) : (
          // Show either preview (collapsed) or interactive graph (expanded & ready)
          expanded() ? interactive : preview
        )}
      </div>
    </div>
  )
}