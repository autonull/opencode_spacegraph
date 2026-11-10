import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { SessionGraph } from "@opencode/session-graph"
import { LAYOUT_STRATEGIES } from "@opencode/session-ui/graph"
import type { DepthMode, DetailMode, GraphArrangement, GraphSide } from "@opencode/session-ui/graph"

export function MapSurface(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  onSplitView?: () => void
  onOpenTranscript?: (id: string) => void
}) {
  const graph = props.model.graph(props.session)

  const focused = () => props.model.focused(props.session)
  const preferredRenderer = () => props.model.renderer()
  const detailMode = () => props.model.detailMode(props.session)
  const arrangement = () => props.model.arrangement(props.session)
  const arrangementSide = () => props.model.side(props.session)

  return (
    <div class="relative size-full min-h-0" data-slot="spacegraph-surface-map">
      <SessionGraph
        model={graph()}
        level={props.model.level(props.session)}
        layout={props.model.layout(props.session)}
        depth={props.model.depth(props.session)}
        detailMode={detailMode()}
        selection={focused()}
        frame={focused()}
        activeTurn={graph().activeTurn}
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
        chrome={true}
        shell="full"
        onOpenTranscript={props.onOpenTranscript}
      />
    </div>
  )
}
