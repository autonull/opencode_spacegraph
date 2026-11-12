import { SessionGraph } from "@opencode/session-graph"
import { createMemo } from "solid-js"
import { LAYOUT_STRATEGIES } from "@opencode/session-ui/graph"
import type { DepthMode, DetailMode, GraphArrangement, GraphSide, Annotations } from "@opencode/session-ui/graph"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"

export function FullMap(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  arrangement?: GraphArrangement
  arrangementSide?: GraphSide
  onSplitView?: () => void
}) {
  const live = props.model.graph(props.session)
  const graph = createMemo(() => props.model.graphAt(props.session, live()))
  const timeTravel = () => props.model.timeTravelEnabled()
  const turnCount = () => live().turns.length

  const focused = () => props.model.focused(props.session)
  const preferredRenderer = () => props.model.renderer()
  const detailMode = () => props.model.detailMode(props.session)

  // Shared state from model (Phase 17.2)
  const traceKind = () => props.model.traceKind(props.session)
  const traceSource = () => props.model.traceSource(props.session)
  const traceHistory = () => props.model.traceHistory(props.session)
  const traceHistoryIndex = () => props.model.traceHistoryIndex(props.session)
  const explicitlyCollapsedGroups = () => props.model.explicitlyCollapsedGroups(props.session)
  const notes = () => props.model.notes(props.session)

  return (
    <SessionGraph
      model={graph()}
      level={props.model.level(props.session)}
      layout={props.model.layout(props.session)}
      depth={props.model.depth(props.session)}
      detailMode={detailMode()}
      selection={focused()}
      frame={focused()}
      activeTurn={graph().activeTurn}
      liveModel={timeTravel() ? live() : undefined}
      checkpoint={timeTravel() ? props.model.checkpointIndex(props.session, live()) : undefined}
      turnCount={timeTravel() ? turnCount() : undefined}
      onCheckpoint={
        timeTravel() ? (index: number) => props.model.setCheckpoint(props.session, index, turnCount()) : undefined
      }
      onSelect={(id: string | undefined) => props.model.focus(props.session, id)}
      onLayoutChange={(next: string) => {
        const layout = LAYOUT_STRATEGIES.find((candidate: string) => candidate === next)

        if (layout) props.model.setLayout(props.session, layout)
      }}
      onDepthChange={(next: DepthMode) => props.model.setDepth(props.session, next)}
      onDetailModeChange={(next: DetailMode) => props.model.setDetailMode(props.session, next)}
      arrangement={props.model.arrangement(props.session)}
      arrangementSide={props.model.side(props.session)}
      refitKey={props.arrangement}
      onArrangementChange={(next: GraphArrangement) => props.model.setArrangement(props.session, next)}
      onArrangementSideChange={(next: GraphSide) => props.model.setSide(props.session, next)}
      onSplitView={props.onSplitView}
      preferredRenderer={preferredRenderer}
      enableCostLens={props.model.costLensEnabled()}
      chrome={true}
      shell="full"
      // Shared trace state
      traceKind={traceKind()}
      onTraceKindChange={(kind) => props.model.setTraceKind(props.session, kind)}
      traceSource={traceSource()}
      onTraceSourceChange={(source) => props.model.setTraceSource(props.session, source)}
      traceHistory={traceHistory()}
      onTraceHistoryChange={(history) => {
        // Note: trace history is updated via pushTraceHistory and setTraceHistoryIndex
      }}
      traceHistoryIndex={traceHistoryIndex()}
      onTraceHistoryIndexChange={(index) => props.model.setTraceHistoryIndex(props.session, index)}
      // Shared group collapse state
      explicitlyCollapsedGroups={explicitlyCollapsedGroups()}
      onExplicitlyCollapsedGroupsChange={(groups) => {
        // The model handles this via toggleExplicitlyCollapsedGroup
      }}
      // Shared notes state
      notes={notes()}
      onNotesChange={(notes: Annotations) => props.model.setNotes(props.session, notes)}
      pins={props.model.pins(props.session)}
      onPinsChange={(pins) => props.model.setPins(props.session, pins)}
    />
  )
}
