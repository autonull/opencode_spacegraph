import type { MountedSession, SessionScreen, SetupContext } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { SessionGraph } from "@opencode/session-graph"
import { Markdown } from "@opencode/session-ui/markdown"
import type { GraphWindowState } from "@opencode/session-graph"
import { createMemo, createSignal } from "solid-js"
import { useI18n } from "@opencode/ui/context/i18n"
import { LAYOUTS } from "@opencode/session-ui/graph"
import type { DepthMode, DetailMode, GraphArrangement, GraphSide } from "@opencode/session-ui/graph"
import { createHostWidgetRegistry } from "./widget-host"

export function MapSurface(props: {
  ctx: SetupContext<typeof import("./index").default>
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  onSplitView?: () => void
  onBack?: () => void
  onTurnMap?: () => void
  onOpenSession?: (sessionID: string) => void
  facetQuery?: string
  onOpenTranscript?: (id: string) => void
}) {
  const i18n = useI18n()
  const live = props.model.graph(props.session)
  const graph = createMemo(() => props.model.graphAt(props.session, live()))
  const widgetRegistry = createHostWidgetRegistry({
    ctx: props.ctx,
    model: props.model,
    session: props.session,
    screen: props.screen,
    graph,
  })
  const timeTravel = () => props.model.timeTravelEnabled()
  const turnCount = () => live().turns.length
  // Graph windows are host state. Own them here so the map's compare/node/legend windows can open.
  const [windows, setWindows] = createSignal<GraphWindowState[]>([])

  const focused = () => props.model.focused(props.session)
  const preferredRenderer = () => props.model.renderer()
  const detailMode = () => props.model.detailMode(props.session)
  const arrangement = () => props.model.arrangement(props.session)
  const arrangementSide = () => props.model.side(props.session)
  const neighborhoodMode = () => props.model.neighborhoodMode(props.session)
  const neighborhoodOpacity = () => props.model.neighborhoodOpacityMemo(props.session)

  // P3.1: Follow mode for live streaming
  const followMode = () => props.model.followMode(props.session)

  const setFollowMode = (mode: "off" | "turn" | "node" | "node+focus") =>
    props.model.setFollowMode(props.session, mode)

  const sessionTitle = props.session.server.data.session.get(props.session.id)?.title ?? "OpenCode Session"
  const testedCommit = "unknown"

  return (
    <div class="relative size-full min-h-0" data-slot="spacegraph-surface-map">
      <SessionGraph
        surfaceLabel={i18n.t("surface.map")}
        model={graph()}
        level={props.model.level(props.session)}
        facetQuery={props.facetQuery}
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
          const layout = LAYOUTS.find((candidate: string) => candidate === next)

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
        onBack={props.onBack}
        onTurnMap={props.onTurnMap}
        onOpenSession={props.onOpenSession}
        windows={windows()}
        onOpenWindow={(window: GraphWindowState) => setWindows((current) => [...current, window])}
        onWindowsChange={setWindows}
        renderSummary={(node) =>
          node.kind === "message" || node.kind === "reasoning" ? (
            <Markdown text={node.summary ?? ""} class="text-12-regular text-text-base" />
          ) : undefined
        }
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
        // P3.6: host widget descriptors; the same prefs gate as the panel and hybrid surfaces.
        widgetRegistry={widgetRegistry}
      />
    </div>
  )
}
