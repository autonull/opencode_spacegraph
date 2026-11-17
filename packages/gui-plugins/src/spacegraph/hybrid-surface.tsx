import { createMemo, type JSX } from "solid-js"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { SessionGraph } from "@opencode/session-graph"
import { LAYOUT_STRATEGIES } from "@opencode/session-ui/graph"
import type { DepthMode, DetailMode, GraphArrangement, GraphSide } from "@opencode/session-ui/graph"
import { GraphToolbarViewControls } from "@opencode/session-graph"
import { useI18n } from "@opencode/ui/context/i18n"


export function HybridSurface(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
  onOpenTranscript?: (id: string) => void
}) {
  const i18n = useI18n()
  const arrangement = createMemo(() => props.model.arrangement(props.session))
  const side = createMemo(() => props.model.side(props.session))
  const floating = createMemo(() => arrangement() === "floating")
  const stacked = createMemo(() => arrangement() === "stacked")

  const root = createMemo(() =>
    stacked() ? "relative flex size-full min-h-0 flex-col" : "relative flex size-full min-h-0",
  )

  const transcriptClass = createMemo(() => {
    if (floating()) return "size-full"

    return stacked() ? "min-h-0 flex-1" : "min-h-0 min-w-0 flex-1"
  })

  const mapClass = createMemo(() => {
    if (floating()) return `absolute top-4 bottom-4 w-2/5 overflow-hidden rounded-lg border border-v2-border-border-base bg-v2-background-bg-base shadow-lg ${side() === "start" ? "left-4" : "right-4"}`

    if (stacked()) return "h-1/3 shrink-0 border-t border-v2-border-border-base"

    return `w-2/5 shrink-0 border-v2-border-border-base ${side() === "start" ? "order-first border-r" : "order-last border-l"}`
  })

  const live = props.model.graph(props.session)
  const graph = createMemo(() => props.model.graphAt(props.session, live()))
  const timeTravel = () => props.model.timeTravelEnabled()
  const turnCount = () => live().turns.length
  const focused = () => props.model.focused(props.session)
  const preferredRenderer = () => props.model.renderer()
  const detailMode = () => props.model.detailMode(props.session)
  const neighborhoodMode = () => props.model.neighborhoodMode(props.session)
  const neighborhoodOpacity = () => props.model.neighborhoodOpacityMemo(props.session)

  // P3.1: Follow mode for live streaming
  const followMode = () => props.model.followMode(props.session)

  const setFollowMode = (mode: "off" | "turn" | "node" | "node+focus") =>
    props.model.setFollowMode(props.session, mode)

  // P0.2: Current lens for goal chips highlighting
  const currentLens = createMemo(() => props.model.lens(props.session))
  // P0.2: Handle goal chip selection - apply the corresponding lens
  const onSelectGoal = (goal: { lensId: string; surface?: string }) => {
    props.model.applyLensById(props.session, goal.lensId)
    // If the goal has a surface preference, switch to it
    if (goal.surface) {
      props.model.select(props.session, goal.surface === "transcript" ? "transcript" : `${props.model.ctx.id}.${goal.surface}`)
    }
  }

  const sessionTitle = props.session.server.data.session.get(props.session.id)?.title ?? "OpenCode Session"
  const testedCommit = "unknown"

  return (
    <div class={root()} data-slot="spacegraph-surface-hybrid" data-arrangement={arrangement()}>
      <div class={transcriptClass()}>{props.transcript}</div>
      <div class={mapClass()}>
        <SessionGraph
          surfaceLabel={i18n.t("surface.hybrid")}
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
          checkpoint={props.model.checkpointIndex(props.session, live())}
          turnCount={turnCount()}
          onCheckpoint={(index: number) => props.model.setCheckpoint(props.session, index, turnCount())}
          onSelect={(id: string | undefined) => props.model.focus(props.session, id)}
          onLayoutChange={(next: string) => {
            const layout = LAYOUT_STRATEGIES.find((candidate: string) => candidate === next)

            if (layout) props.model.setLayout(props.session, layout)
          }}
          onDepthChange={(next: DepthMode) => props.model.setDepth(props.session, next)}
          onDetailModeChange={(next: DetailMode) => props.model.setDetailMode(props.session, next)}
          arrangement={arrangement()}
          arrangementSide={side()}
          refitKey={arrangement()}
          onArrangementChange={(next: GraphArrangement) => props.model.setArrangement(props.session, next)}
          onArrangementSideChange={(next: GraphSide) => props.model.setSide(props.session, next)}
          preferredRenderer={preferredRenderer}
          endInset={props.model.endInset()}
          showSeeMapPrompt={false}
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
          sessionTitle={sessionTitle}
          testedCommit={testedCommit}
          // P1.3: Neighborhood focus mode
          neighborhoodOpacity={neighborhoodOpacity()}
          focus={neighborhoodMode()}
          onToggleFocus={() => props.model.toggleNeighborhoodMode(props.session)}
          // P3.1: Follow mode for live streaming
          followMode={followMode()}
          onFollowModeChange={setFollowMode}
        />
        <GraphToolbarViewControls
          i18n={i18n}
          onExport={(format: "svg" | "json" | "html", _model: unknown) => props.model.export(props.session, format)}
          renderModel={graph()}
          onCopyPermalink={() => props.model.copyPermalink(props.session)}
          // P0.2: Goal-based lens picker
          currentLens={currentLens()}
          onSelectGoal={onSelectGoal}
          flags={{ enabled: (key: string) => props.model.ctx.flags.enabled(key) }}
          // P3.1: Follow mode for live streaming
          followMode={followMode()}
          onFollowModeChange={setFollowMode}
        />
      </div>
    </div>
  )
}
