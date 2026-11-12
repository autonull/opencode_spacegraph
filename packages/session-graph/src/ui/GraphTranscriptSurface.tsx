import { createSignal, createMemo, For, Show, onMount, type JSX } from "solid-js"
import { createVirtualizer } from "@tanstack/solid-virtual"
import { useI18n } from "@opencode/ui/context/i18n"
import type { GraphViewData } from "@opencode/session-ui/graph"
import { buildGraphIncremental, turnNodeID, turnSubgraph } from "@opencode/session-ui/graph"
import { GraphInline, type GraphInlineProps } from "./GraphInline"
import type { SessionGraphProps } from "./SessionGraph"
import { createReactiveTimelineProjection, TimelineRow, type ReasoningMode } from "@opencode/session-ui/timeline/projection"
import { createSessionTimelineRowRenderer } from "@opencode/session-ui/timeline/row"
import { createStore } from "solid-js/store"
import type { MountedSession } from "@opencode/plugin/gui"
import { buildTurnAffordances } from "./transcript-affordances"
import "./graph-transcript.css"

export type GraphTranscriptSurfaceProps = {
  /** The full session graph model */
  model: GraphViewData
  /** The mounted session to get messages from */
  session: MountedSession
  /** Called when user wants to expand a turn's inline graph */
  onTurnExpand?: (turnID: string) => void
  /** Called when user clicks "Why?" on a failed turn */
  onTurnWhy?: (turnID: string) => void
  /** Called when user clicks "Expand" on a delegation turn */
  onTurnExpandDelegation?: (turnID: string) => void
  /** Called when user clicks "Subagent" on a subagent turn */
  onTurnSubagent?: (turnID: string, subagentID: string) => void
  /** Called when user clicks "Share" */
  onTurnShare?: (turnID: string, layout: string, nodeID: string) => void
  /** Theme for the inline previews */
  previewTheme?: GraphInlineProps["previewTheme"]
  /** Maximum nodes in preview */
  previewLimit?: number
  /** M4: the density profile that scales the card budget. */
  density?: SessionGraphProps["density"]
  /** Height of expanded inline graph */
  inlineHeight?: number
  /** Optional renderNodeWidget for interactive graphs */
  renderNodeWidget?: SessionGraphProps["renderNodeWidget"]
  /** Optional renderNodeHTML for interactive graphs */
  renderNodeHTML?: SessionGraphProps["renderNodeHTML"]
  /** Optional renderCard for interactive graphs */
  renderCard?: SessionGraphProps["renderCard"]
  /** Optional renderSummary for interactive graphs */
  renderSummary?: SessionGraphProps["renderSummary"]
  /** Optional diffSource for interactive graphs */
  diffSource?: SessionGraphProps["diffSource"]
  /** Optional shared notes for interactive graphs */
  notes?: SessionGraphProps["notes"]
  onNotesChange?: SessionGraphProps["onNotesChange"]
  /** Optional shared pins for interactive graphs */
  pins?: SessionGraphProps["pins"]
  onPinsChange?: SessionGraphProps["onPinsChange"]
  /** Optional onOpenTranscript for interactive graphs */
  onOpenTranscript?: SessionGraphProps["onOpenTranscript"]
  /** Optional onOpenSession for interactive graphs */
  onOpenSession?: SessionGraphProps["onOpenSession"]
  /** Optional onActionNavigate for interactive graphs */
  onActionNavigate?: SessionGraphProps["onActionNavigate"]
  /** Optional onActionReveal for interactive graphs */
  onActionReveal?: SessionGraphProps["onActionReveal"]
  /** Optional onActionCopy for interactive graphs */
  onActionCopy?: SessionGraphProps["onActionCopy"]
  /** Optional onActionRun for interactive graphs */
  onActionRun?: SessionGraphProps["onActionRun"]
  /** Optional onBack for interactive graphs */
  onBack?: SessionGraphProps["onBack"]
  /** Optional onTurnMap for interactive graphs */
  onTurnMap?: SessionGraphProps["onTurnMap"]
  /** Optional onSplitView for interactive graphs */
  onSplitView?: SessionGraphProps["onSplitView"]
  /** Optional sessionTitle for interactive graphs */
  sessionTitle?: SessionGraphProps["sessionTitle"]
  /** Optional testedCommit for interactive graphs */
  testedCommit?: SessionGraphProps["testedCommit"]
  /** Optional endInset for interactive graphs */
  endInset?: SessionGraphProps["endInset"]
  /** Optional reducedMotion for interactive graphs */
  reducedMotion?: SessionGraphProps["reducedMotion"]
  /** Optional breakpoints for interactive graphs */
  breakpoints?: SessionGraphProps["breakpoints"]
}

/**
 * GraphTranscriptSurface - a transcript surface that renders its own rows from the timeline projection
 * with per-turn graph affordances (Why, Expand, Subagent, Share).
 * This is the "own rows" surface mentioned in Phase 16.2.
 * Flag-gated: graph_surface_transcript
 */
export const GraphTranscriptSurface = (props: GraphTranscriptSurfaceProps) => {
  const [expandedTurns, setExpandedTurns] = createSignal<Set<string>>(new Set())
  const [expandedTurnGraphs, setExpandedTurnGraphs] = createSignal<Map<string, boolean>>(new Map())

  // Create disclosure store for row expansion state
  const [disclosureStore, setDisclosureStore] = createStore<Record<string, boolean | undefined>>({})
  const disclosure = {
    value: (key: string) => disclosureStore[key],
    set: (key: string, open: boolean) => setDisclosureStore(key, open),
  }

  // Get session messages and status from the server data
  const sessionMessages = createMemo(() => props.session.server.data.session.message.list(props.session.id))
  const sessionStatus = createMemo(() => props.session.server.data.session.status(props.session.id))

  // Convert string status to SessionStatus union type
  const sessionStatusTyped = createMemo(() => {
    const s: string = sessionStatus()
    if (s === "running") return { type: "busy" as const }
    if (s === "retry") return { type: "retry" as const, attempt: 1, message: "", next: Date.now() + 1000 }
    return { type: "idle" as const }
  })

  // Create timeline projection from session messages
  const timelineProjection = createMemo(() =>
    createReactiveTimelineProjection({
      sessionMessages,
      status: sessionStatusTyped,
      reasoningMode: () => "compact" as ReasoningMode,
      turnDiffs: () => true,
    })
  )

  // Build the graph model incrementally (same as other surfaces)
  const graphModel = createMemo(() => {
    const { graph: builtGraph } = buildGraphIncremental({
      messages: sessionMessages(),
      status: sessionStatusTyped(),
    })
    return builtGraph
  })

  // The affordances of every turn, built in one pass over the graph. Rows look up the map instead
  // of scanning the model per render, so a collapsed transcript does no per-row graph work.
  const turnAffordances = createMemo(() => buildTurnAffordances(graphModel()))

  const affordanceFor = (turnID: string) => turnAffordances().get(turnID) ?? {}

  // Get the turn's nodes for sharing
  const getTurnNodeForShare = (turnID: string): string | undefined => {
    const model = graphModel()
    const turnNode = model.nodes.find((n) => n.turnID === turnID)
    return turnNode?.id
  }

  const toggleTurnExpand = (turnID: string) => {
    setExpandedTurns((prev) => {
      const next = new Set(prev)
      if (next.has(turnID)) {
        next.delete(turnID)
        setExpandedTurnGraphs((prevGraphs) => {
          const nextGraphs = new Map(prevGraphs)
          nextGraphs.delete(turnID)
          return nextGraphs
        })
      } else {
        next.add(turnID)
      }
      return next
    })
  }

  const handleExpandChange = (turnID: string, expanded: boolean) => {
    setExpandedTurnGraphs((prev) => {
      const next = new Map(prev)
      next.set(turnID, expanded)
      return next
    })
  }

  const handleWhyClick = (turnID: string) => {
    props.onTurnWhy?.(turnID)
  }

  const handleExpandDelegationClick = (turnID: string) => {
    props.onTurnExpandDelegation?.(turnID)
  }

  const handleSubagentClick = (turnID: string, subagentID: string) => {
    props.onTurnSubagent?.(turnID, subagentID)
  }

  const handleShareClick = (turnID: string) => {
    const nodeID = getTurnNodeForShare(turnID)
    if (nodeID) {
      props.onTurnShare?.(turnID, "tree", nodeID)
    }
  }

  // Create the row renderer using session-ui's renderer
  const rowRenderer = createMemo(() =>
    createSessionTimelineRowRenderer({
      sessionID: () => props.session.id,
      status: sessionStatusTyped,
      projection: timelineProjection(),
      presentation: () => undefined,
      reasoningMode: () => "compact" as ReasoningMode,
      shellToolDefaultOpen: () => false,
      editToolDefaultOpen: () => false,
      disclosure: disclosure,
    })
  )

  const rows = createMemo(() => timelineProjection().rows())

  // One turn owns several timeline rows. The turn's map and affordances belong to the first row,
  // so a turn never mounts the same inline graph once per message.
  const turnStarts = createMemo(() => {
    const seen = new Set<string>()
    const starts = new Set<string>()

    for (const row of rows()) {
      if (seen.has(row.userMessageID)) continue
      seen.add(row.userMessageID)
      starts.add(TimelineRow.key(row))
    }

    return starts
  })

  // M4 — only the rows near the viewport mount. A collapsed transcript keeps a preview per visible
  // turn and no graph per row, so scrolling cost stays with the row renderer, not the graph.
  const [scrollElement, setScrollElement] = createSignal<HTMLDivElement>()
  // The virtualizer observes a connected element: measuring before insertion would read a 0×0 rect.
  let root!: HTMLDivElement
  onMount(() => setScrollElement(root))
  const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    get count() {
      return rows().length
    },
    getScrollElement: () => scrollElement() ?? null,
    estimateSize: () => 240,
    getItemKey: (index) => {
      const row = rows()[index]
      return row ? TimelineRow.key(row) : index
    },
    overscan: 3,
  })

  return (
    <div
      ref={root}
      class="graph-transcript-surface flex flex-col size-full min-h-0"
      data-slot="graph-transcript-surface"
    >
      <div style={{ position: "relative", width: "100%", height: `${virtualizer.getTotalSize()}px`, "flex-shrink": 0 }}>
        <For each={virtualizer.getVirtualItems()}>
          {(item) => (
            <Show when={rows()[item.index]}>
              {(row) => {
                const turnID = () => turnNodeID(row().userMessageID)
                const isTurnStart = () => turnStarts().has(TimelineRow.key(row()))

                return (
                  <div
                    data-index={item.index}
                    ref={(element) => queueMicrotask(() => virtualizer.measureElement(element))}
                    style={{
                      position: "absolute",
                      top: "0",
                      left: "0",
                      width: "100%",
                      transform: `translateY(${item.start}px)`,
                    }}
                  >
                    <GraphTranscriptRow
                      row={row()}
                      turnID={turnID()}
                      isTurnStart={isTurnStart()}
                      projection={timelineProjection()}
                      rowRenderer={rowRenderer()}
                      expanded={isTurnStart() && expandedTurns().has(turnID())}
                      graphExpanded={isTurnStart() && (expandedTurnGraphs().get(turnID()) ?? false)}
                      model={graphModel()}
                      hasAffordance={affordanceFor(turnID())}
                      onToggleExpand={toggleTurnExpand}
                      onExpandChange={handleExpandChange}
                      onWhyClick={handleWhyClick}
                      onExpandDelegationClick={handleExpandDelegationClick}
                      onSubagentClick={handleSubagentClick}
                      onShareClick={handleShareClick}
                      previewTheme={props.previewTheme}
                      previewLimit={props.previewLimit}
                      inlineHeight={props.inlineHeight}
                      density={props.density}
                      renderNodeWidget={props.renderNodeWidget}
                      renderNodeHTML={props.renderNodeHTML}
                      renderCard={props.renderCard}
                      renderSummary={props.renderSummary}
                      diffSource={props.diffSource}
                      notes={props.notes}
                      onNotesChange={props.onNotesChange}
                      pins={props.pins}
                      onPinsChange={props.onPinsChange}
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
                      reducedMotion={props.reducedMotion}
                      breakpoints={props.breakpoints}
                    />
                  </div>
                )
              }}
            </Show>
          )}
        </For>
      </div>
    </div>
  )
}

interface GraphTranscriptRowProps {
  row: TimelineRow.TimelineRow
  /** The graph's turn node for this row's turn, not the raw user message id. */
  turnID: string
  /** The turn's first timeline row owns its affordances and inline map. */
  isTurnStart: boolean
  projection: ReturnType<typeof createReactiveTimelineProjection>
  rowRenderer: ReturnType<typeof createSessionTimelineRowRenderer>
  expanded: boolean
  graphExpanded: boolean
  model: GraphViewData
  hasAffordance: { why?: boolean; expand?: boolean; subagent?: boolean }
  onToggleExpand: (turnID: string) => void
  onExpandChange: (turnID: string, expanded: boolean) => void
  onWhyClick: (turnID: string) => void
  onExpandDelegationClick: (turnID: string) => void
  onSubagentClick: (turnID: string, subagentID: string) => void
  onShareClick: (turnID: string) => void
  previewTheme?: GraphInlineProps["previewTheme"]
  previewLimit?: number
  inlineHeight?: number
  density?: GraphInlineProps["density"]
  renderNodeWidget?: SessionGraphProps["renderNodeWidget"]
  renderNodeHTML?: SessionGraphProps["renderNodeHTML"]
  renderCard?: SessionGraphProps["renderCard"]
  renderSummary?: SessionGraphProps["renderSummary"]
  diffSource?: SessionGraphProps["diffSource"]
  notes?: SessionGraphProps["notes"]
  onNotesChange?: SessionGraphProps["onNotesChange"]
  pins?: SessionGraphProps["pins"]
  onPinsChange?: SessionGraphProps["onPinsChange"]
  onOpenTranscript?: SessionGraphProps["onOpenTranscript"]
  onOpenSession?: SessionGraphProps["onOpenSession"]
  onActionNavigate?: SessionGraphProps["onActionNavigate"]
  onActionReveal?: SessionGraphProps["onActionReveal"]
  onActionCopy?: SessionGraphProps["onActionCopy"]
  onActionRun?: SessionGraphProps["onActionRun"]
  onBack?: SessionGraphProps["onBack"]
  onTurnMap?: SessionGraphProps["onTurnMap"]
  onSplitView?: SessionGraphProps["onSplitView"]
  sessionTitle?: SessionGraphProps["sessionTitle"]
  testedCommit?: SessionGraphProps["testedCommit"]
  endInset?: SessionGraphProps["endInset"]
  reducedMotion?: SessionGraphProps["reducedMotion"]
  breakpoints?: SessionGraphProps["breakpoints"]
}

const GraphTranscriptRow = (props: GraphTranscriptRowProps) => {
  const i18n = useI18n()
  const turnID = props.turnID
  const [isRowFocused, setIsRowFocused] = createSignal(false)
  const [chipTabIndex, setChipTabIndex] = createSignal(-1)

  // Roving tabindex: chips are only in tab order when row is focused
  const handleRowFocus = () => {
    setIsRowFocused(true)
    setChipTabIndex(0)
  }

  const handleRowBlur = () => {
    setIsRowFocused(false)
    setChipTabIndex(-1)
  }

  const handleChipKeyDown = (e: KeyboardEvent, index: number, total: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      setChipTabIndex((index + 1) % total)
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      setChipTabIndex((index - 1 + total) % total)
    } else if (e.key === "Home") {
      e.preventDefault()
      setChipTabIndex(0)
    } else if (e.key === "End") {
      e.preventDefault()
      setChipTabIndex(total - 1)
    } else if (e.key === "Escape") {
      // Return focus to row
      const rowEl = document.querySelector(`[data-turn-id="${turnID}"]`) as HTMLElement
      rowEl?.focus()
    }
  }

  const affordanceChips = () => {
    const chips: JSX.Element[] = []

    if (props.hasAffordance.why) {
      chips.push(
        <button
          type="button"
          class="graph-affordance-chip"
          onClick={() => props.onWhyClick(turnID)}
          title={i18n.t("ui.sessionGraph.transcript.why.tooltip")}
          tabIndex={chipTabIndex() === 0 && isRowFocused() ? 0 : -1}
          onKeyDown={(e) => handleChipKeyDown(e, 0, chips.length)}
        >
          <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM7 5v3h2v-3H7zm0 5h2v2H7v-2z" />
          </svg>
          <span>{i18n.t("ui.sessionGraph.transcript.why.label")}</span>
        </button>
      )
    }

    if (props.hasAffordance.expand) {
      chips.push(
        <button
          type="button"
          class="graph-affordance-chip"
          onClick={() => props.onExpandDelegationClick(turnID)}
          title={i18n.t("ui.sessionGraph.transcript.expand.tooltip")}
          tabIndex={chipTabIndex() === chips.length && isRowFocused() ? 0 : -1}
          onKeyDown={(e) => handleChipKeyDown(e, chips.length, chips.length + 1)}
        >
          <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4 4h8v8H4V4zm1 1v6h6V5H5zm5 5H6v-1h4v1z" />
          </svg>
          <span>{i18n.t("ui.sessionGraph.transcript.expand.label")}</span>
        </button>
      )
    }

    if (props.hasAffordance.subagent) {
      chips.push(
        <button
          type="button"
          class="graph-affordance-chip"
          onClick={() => {
            // Find subagent turn ID from the graph
            const model = props.model
            const turnNode = model.nodes.find((n) => n.turnID === turnID)
            if (turnNode) {
              const subgraph = turnSubgraph(model, turnID, 7)
              const subagentNode = subgraph.nodes.find((n) => n.kind === "subagent")
              if (subagentNode) {
                props.onSubagentClick(turnID, subagentNode.id)
              }
            }
          }}
          title={i18n.t("ui.sessionGraph.transcript.subagent.tooltip")}
          tabIndex={chipTabIndex() === chips.length && isRowFocused() ? 0 : -1}
          onKeyDown={(e) => handleChipKeyDown(e, chips.length, chips.length + 1)}
        >
          <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM8 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm0 8a5 5 0 0 1 5-5h-2a3 3 0 0 0-6 0H3a5 5 0 0 1 5 5z" />
          </svg>
          <span>{i18n.t("ui.sessionGraph.transcript.subagent.label")}</span>
        </button>
      )
    }

    // Always show share chip
    chips.push(
      <button
        type="button"
        class="graph-affordance-chip"
        onClick={() => handleShareClick()}
        title={i18n.t("ui.sessionGraph.transcript.share.tooltip")}
        tabIndex={chipTabIndex() === chips.length && isRowFocused() ? 0 : -1}
        onKeyDown={(e) => handleChipKeyDown(e, chips.length, chips.length + 1)}
      >
        <svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M4 4h8v8H4V4zm1 1v6h6V5H5zm5 5H6v-1h4v1z" />
        </svg>
        <span>{i18n.t("ui.sessionGraph.transcript.share.label")}</span>
      </button>
    )

    return chips
  }

  const handleShareClick = () => {
    props.onShareClick(turnID)
  }

  // Use the row renderer from session-ui to render the actual row
  // The Row component takes { row: Accessor<TimelineRow>, onSizeChange?: () => void }
  const renderedRow = (
    <props.rowRenderer.Row
      row={() => props.row}
      onSizeChange={undefined}
    />
  )

  return (
    <div
      class="graph-transcript-row"
      data-turn-id={turnID}
      tabIndex={0}
      onFocus={handleRowFocus}
      onBlur={handleRowBlur}
    >
      {renderedRow}

      {/* Graph affordance chips - the turn's first row owns them, so a turn never repeats a chip */}
      <Show when={props.isTurnStart && (props.hasAffordance.why || props.hasAffordance.expand || props.hasAffordance.subagent)}>
        <div class="graph-affordance-bar" role="group" aria-label={i18n.t("ui.sessionGraph.transcript.affordances.label")}>
          {affordanceChips()}
          <button
            type="button"
            class="graph-affordance-toggle"
            onClick={() => props.onToggleExpand(turnID)}
            aria-expanded={props.expanded}
            aria-controls={`graph-inline-${turnID}`}
          >
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d={props.expanded ? "M4 9l4 4 6-6" : "M4 7l4-4 6 6"} stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </Show>

      {/* Expanded inline graph - one per turn, after its first row */}
      <Show when={props.isTurnStart && props.expanded}>
        <div id={`graph-inline-${turnID}`} class="graph-inline-container">
          <GraphInline
            model={props.model}
            turnID={turnID}
            defaultExpanded={true}
            height={props.inlineHeight ?? 320}
            limit={props.previewLimit}
            previewTheme={props.previewTheme}
            onExpandChange={(expanded) => props.onExpandChange(turnID, expanded)}
            density={props.density}
            renderNodeWidget={props.renderNodeWidget}
            renderNodeHTML={props.renderNodeHTML}
            renderCard={props.renderCard}
            renderSummary={props.renderSummary}
            diffSource={props.diffSource}
            notes={props.notes}
            onNotesChange={props.onNotesChange}
            pins={props.pins}
            onPinsChange={props.onPinsChange}
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
          />
        </div>
      </Show>
    </div>
  )
}