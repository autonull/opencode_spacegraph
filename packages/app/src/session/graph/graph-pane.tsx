import { Show, type JSX } from "solid-js"
import { SessionGraphPanel } from "./session-graph-panel"
import { SessionGraphView } from "./session-graph-view"
import { SessionTurnMapOverlay } from "./turn-map-overlay"
import { GraphMetricsReadout } from "./graph-metrics-readout"
import type { SessionModel } from "@/session/model"
import { Metrics } from "@opencode/session-ui/graph"

export type SessionGraphPaneProps = {
  session: SessionModel
  graph: ReturnType<SessionModel["layout"]["graph"]>
  graphEnabled: () => boolean
  timeline: ReturnType<typeof import("../timeline/interaction").createSessionTimelineInteraction>
  mapVisible: () => boolean
  splitVisible: () => boolean
  screen: ReturnType<typeof import("../screen-layout").createSessionScreenLayout>
  metricsEnabled: () => boolean
  transcript: JSX.Element
}

export function SessionGraphPane(props: SessionGraphPaneProps) {
  const {
    session,
    graph,
    graphEnabled,
    timeline,
    mapVisible,
    splitVisible,
    screen,
    metricsEnabled,
    transcript,
  } = props

  const revealInLog = (messageID: string, partID?: string) => {
    timeline.actions.revealMessage(messageID, partID)
  }

  const openGraphTranscript = (messageID: string, partID?: string) => {
    graph.setMap(false)
    revealInLog(messageID, partID)
  }

  const leaveGraph = () => {
    Metrics.count("mode-switch")
    graph.setMap(false)
  }

  return (
    <>
      <Show when={mapVisible()}>
        <SessionGraphPanel
          map={mapVisible()}
          sideBySide={splitVisible()}
          graph={() => (
            <SessionGraphView
              session={session}
              onBack={leaveGraph}
              onOpenTranscript={openGraphTranscript}
              onReveal={splitVisible() ? revealInLog : undefined}
              onSplitView={
                splitVisible()
                  ? undefined
                  : () => {
                      Metrics.count("mode-switch")
                      graph.setMap(true)
                      graph.setSideBySide(true)
                    }
              }
              activeMessageID={splitVisible() ? timeline.currentMessageId() : undefined}
              refitKey={splitVisible() ? "split" : "map"}
              arrangement={graph.arrangement()}
              onArrangementChange={graph.setArrangement}
              arrangementSide={graph.arrangementSide()}
              onArrangementSideChange={graph.setArrangementSide}
            />
          )}
          transcript={transcript}
          arrangement={graph.arrangement()}
          side={graph.arrangementSide()}
          split={graph.split()}
          onSplit={graph.setSplit}
          pane={graph.pane()}
          onPane={graph.setPane}
          logTextScale={graph.logTextScale()}
          onLogTextScale={graph.setLogTextScale}
          onClose={leaveGraph}
        />
      </Show>
      <Show when={graphEnabled() && graph.turnMap()}>
        {(turnID) => (
          <div class="absolute inset-y-0 start-0 z-40" style={{ width: screen.panel.width() }}>
            <SessionTurnMapOverlay
              session={session}
              turnID={turnID()}
              onClose={() => graph.setTurnMap(undefined)}
              onOpenFullGraph={(id) => {
                Metrics.count("expand")
                graph.setTurnMap(undefined)
                graph.setMap(true)
                graph.setSideBySide(false)
                graph.setSelected(id)
              }}
            />
          </div>
        )}
      </Show>
      <Show when={metricsEnabled()}>
        <GraphMetricsReadout />
      </Show>
    </>
  )
}