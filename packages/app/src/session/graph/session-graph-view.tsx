import { Button } from "@opencode/ui/button"
import { buildGraph, openInTranscript } from "@opencode/session-ui/graph"
import { ErrorBoundary, Suspense, createMemo, lazy } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import type { SessionModel } from "@/session/model"

// The graph surface, its renderer registry, and both adapters load on demand so none of them enters
// the session entry chunk. `GraphView` is the only thing imported from `@opencode/session-graph`.
const GraphView = lazy(() => import("@opencode/session-graph").then((mod) => ({ default: mod.GraphView })))

/**
 * Lazy graph mode for one session (I4.2). It reads the session's own store, builds the pure graph
 * model, and hands only data and callbacks to `@opencode/session-graph`; it never imports an adapter.
 * A load or mount failure falls back to the transcript so the session never breaks.
 */
export function SessionGraphView(props: {
  session: SessionModel
  onBack: () => void
  onOpenTranscript: (messageID: string, partID?: string) => void
}) {
  const language = useLanguage()
  const session = props.session
  const graph = session.layout.graph()
  const model = createMemo(() => buildGraph(session.history.messages(), session.data.status()))

  return (
    <ErrorBoundary
      fallback={
        <div
          data-slot="session-graph-error"
          class="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <div class="flex flex-col items-center gap-1">
            <div class="text-14-medium text-text">{language.t("session.graph.error")}</div>
            <div class="text-13-regular text-text-weak max-w-md">{language.t("session.graph.error.description")}</div>
          </div>
          <Button variant="neutral" size="normal" onClick={() => props.onBack()}>
            {language.t("session.graph.back")}
          </Button>
        </div>
      }
    >
      <Suspense fallback={<div data-slot="session-graph-loading" class="h-full w-full" />}>
        <GraphView
          model={model()}
          projection={graph.projection()}
          preferredRenderer={graph.renderer()}
          selection={graph.selected()}
          onSelect={(id) => graph.setSelected(id)}
          onProjectionChange={(projection) => graph.setProjection(projection)}
          onOpenTranscript={(id) => {
            const ref = openInTranscript(model(), id)

            if (!ref?.messageID) return
            props.onBack()
            props.onOpenTranscript(ref.messageID, ref.partID)
          }}
          onBack={() => props.onBack()}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
