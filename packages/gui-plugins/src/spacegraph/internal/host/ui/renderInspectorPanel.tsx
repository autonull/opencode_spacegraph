import { Show } from "solid-js"
import type { JSX } from "solid-js"
import { GraphInspectorPanel } from "./GraphInspectorPanel"
import type { GraphViewData } from "@opencode/session-ui/graph"
import type { GraphNode } from "@opencode/session-ui/graph"
import type { GraphDiffSource } from "./GraphDiff"
import type { UseGraphAnnotationsReturn } from "./useGraphAnnotations"
import type { GraphSelection } from "./graph-selection"

export type RenderInspectorPanelProps = {
  i18n: ReturnType<typeof import("@opencode/ui/context/i18n").useI18n>
  model: () => GraphViewData
  selectedNode: () => GraphNode | undefined
  annotations: UseGraphAnnotationsReturn
  diffSource: GraphDiffSource | undefined
  renderSummary: ((node: GraphNode) => JSX.Element | undefined) | undefined
  link: string | undefined
  onCopyView: () => void
  onSelect: GraphSelection["select"]
  onOpenTranscript: ((id: string) => void) | undefined
  onOpenSession: ((sessionID: string) => void) | undefined
  openInTranscript: (id: string) => void
  sheet?: boolean
  title?: string
  onClose?: () => void
}

export function renderInspectorPanel(props: RenderInspectorPanelProps): JSX.Element {
  const {
    i18n,
    model,
    selectedNode,
    annotations,
    diffSource,
    renderSummary,
    link,
    onCopyView,
    onSelect,
    onOpenTranscript,
    onOpenSession,
    openInTranscript,
    sheet,
    title,
    onClose,
  } = props

  const node = selectedNode()
  return (
    <Show when={node} keyed fallback={<GraphInspectorPanel sheet={sheet} title={title} onClose={onClose} i18n={i18n} model={model()} node={undefined} diffSource={diffSource} renderSummary={renderSummary} link={link} onCopyView={onCopyView} onSelect={onSelect} onOpenTranscript={onOpenTranscript ? openInTranscript : undefined} onOpenSession={onOpenSession} traceKind={annotations.traceKind()} onTraceWhy={annotations.traceWhy} onTraceLedHere={annotations.traceLedHere} onTraceRelated={annotations.traceRelated} onTraceDownstream={annotations.traceDownstream} onTraceBack={annotations.traceBack} onTraceForward={annotations.traceForward} onClearTrace={annotations.clearTrace} onCopyTraceOutline={annotations.copyTraceOutline} onEditNote={annotations.editNote} onDeleteNote={annotations.deleteNote} onCopyNote={annotations.copyNote} traceHistory={annotations.traceHistory()} />}>
      {(node) => (
        <GraphInspectorPanel
          sheet={sheet}
          title={title}
          onClose={onClose}
          i18n={i18n}
          model={model()}
          node={node}
          diffSource={diffSource}
          renderSummary={renderSummary}
          link={link}
          onCopyView={onCopyView}
          onSelect={onSelect}
          onOpenTranscript={onOpenTranscript ? openInTranscript : undefined}
          onOpenSession={onOpenSession}
          traceKind={annotations.traceKind()}
          onTraceWhy={annotations.traceWhy}
          onTraceLedHere={annotations.traceLedHere}
          onTraceRelated={annotations.traceRelated}
          onTraceDownstream={annotations.traceDownstream}
          onTraceBack={annotations.traceBack}
          onTraceForward={annotations.traceForward}
          onClearTrace={annotations.clearTrace}
          onCopyTraceOutline={annotations.copyTraceOutline}
          onEditNote={annotations.editNote}
          onDeleteNote={annotations.deleteNote}
          onCopyNote={annotations.copyNote}
          traceHistory={annotations.traceHistory()}
        />
      )}
    </Show>
  )
}