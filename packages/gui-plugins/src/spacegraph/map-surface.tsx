import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { SessionGraph } from "@opencode/session-graph"
import { createMemo } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import { LAYOUT_STRATEGIES } from "@opencode/session-ui/graph"
import type { DepthMode, DetailMode, GraphArrangement, GraphSide } from "@opencode/session-ui/graph"

export function MapSurface(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  onSplitView?: () => void
  onOpenTranscript?: (id: string) => void
}) {
  const i18n = useI18n()
  const live = props.model.graph(props.session)
  const graph = createMemo(() => props.model.graphAt(props.session, live()))
  const timeTravel = () => props.model.timeTravelEnabled()
  const turnCount = () => live().turns.length

  const focused = () => props.model.focused(props.session)
  const preferredRenderer = () => props.model.renderer()
  const detailMode = () => props.model.detailMode(props.session)
  const arrangement = () => props.model.arrangement(props.session)
  const arrangementSide = () => props.model.side(props.session)

  return (
    <div class="relative size-full min-h-0" data-slot="spacegraph-surface-map">
      <SessionGraph
        surfaceLabel={i18n.t("surface.map")}
        model={graph()}
        level={props.model.level(props.session)}
        density={props.model.density()}
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
        arrangement={arrangement()}
        arrangementSide={arrangementSide()}
        refitKey={arrangement()}
        onArrangementChange={(next: GraphArrangement) => props.model.setArrangement(props.session, next)}
        onArrangementSideChange={(next: GraphSide) => props.model.setSide(props.session, next)}
        onSplitView={props.onSplitView}
        preferredRenderer={preferredRenderer}
        enableCostLens={props.model.costLensEnabled()}
        enableCompactionAdvisor={props.model.compactionAdvisorEnabled()}
        chrome={true}
        shell="full"
        onOpenTranscript={props.onOpenTranscript}
        notes={props.model.notes(props.session)}
        onNotesChange={(notes) => props.model.setNotes(props.session, notes)}
        pins={props.model.pins(props.session)}
        onPinsChange={(pins) => props.model.setPins(props.session, pins)}
        savedQueries={props.model.savedQueries(props.session)}
        onSavedQueriesChange={(queries) => props.model.setSavedQueries(props.session, queries)}
        layouts={props.model.availableLayouts()}
        palette={props.model.paletteEnabled() ? props.model.paletteSources(props.session) : undefined}
        onPaletteAction={(entry) => props.model.runPaletteAction(props.session, entry.action?.id ?? "")}
        onPaletteLens={(entry) => entry.lens && props.model.applyLensById(props.session, entry.lens.id)}
        onPaletteSurface={(entry) => entry.surface && props.model.select(props.session, entry.surface.id)}
      />
    </div>
  )
}
