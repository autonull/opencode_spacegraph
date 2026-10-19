import { Button } from "@opencode/ui/button"
import { buildGraph, nodeByID, openInTranscript, turnNodeID } from "@opencode/session-ui/graph"
import { useData } from "@opencode/session-ui/context"
import { Markdown } from "@opencode/session-ui/markdown"
import { useLocation } from "@solidjs/router"
import { createMediaQuery } from "@solid-primitives/media"
import { ErrorBoundary, Suspense, createEffect, createMemo, lazy, on, untrack, onMount, onCleanup } from "solid-js"
import { messageIdFromHash } from "@/session/message-id-from-hash"
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
  const location = useLocation()
  // The desktop header toggles float over the panel's top-right (two 28px buttons, 12px inset);
  // reserve that width so the graph toolbar's renderer label and back control stay clickable.
  const isDesktop = createMediaQuery("(min-width: 768px)")
  const graph = session.layout.graph()
  const model = createMemo(() => buildGraph(session.history.messages(), session.data.status()))
  // RF.8: the inspector's on-demand diffs read the same per-tab turn-diff cache the timeline uses,
  // scoped to the current session so the graph package never holds a session id.
  const data = useData()

  const diffSource = createMemo(() => {
    const source = data.turnDiff
    const sessionID = data.sessionID

    if (!source || !sessionID) return undefined

    return {
      get: (from: string) => source.get({ sessionID, from }),
      load: (from: string) => source.load({ sessionID, from }),
    }
  })

  // I4.7: while graph mode is active, a hash that targets a message selects its owning turn instead
  // of scrolling the hidden transcript. Only the hash drives this, so streaming model updates and a
  // manual node selection do not fight it.
  createEffect(
    on(
      () => location.hash,
      (hash) => {
        const messageID = messageIdFromHash(hash)

        if (!messageID) return
        const current = untrack(model)
        const owner = current.turnByMessageID.get(messageID)

        if (!owner) return
        const turnID = turnNodeID(owner)

        if (!nodeByID(current, turnID)) return
        graph.setSelected(turnID)
      },
    ),
  )

  // Dev-only test harness for e2e capture control (T1.15).
  if (import.meta.env.DEV) {
    onMount(() => {
      const harness = {
        select: (id: string | undefined) => graph.setSelected(id),
        zoomTo: (percent: number) => {
          // Will be implemented when we have direct renderer access
        },
        panTo: (nodeId: string) => graph.setSelected(nodeId),
      }

      // SAFETY: dev-only test harness for e2e capture control
      const w = window as { __sessionGraphView?: typeof harness }
      w.__sessionGraphView = harness
    })
    onCleanup(() => {
      if (import.meta.env.DEV) {
        // SAFETY: dev-only test harness cleanup
        const w2 = window as { __sessionGraphView?: unknown }
        w2.__sessionGraphView = undefined
      }
    })
  }

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
          depth={graph.depth()}
          preferredRenderer={graph.renderer()}
          selection={graph.selected()}
          strategy={graph.layout()}
          representation={graph.representation()}
          minimap={graph.minimap()}
          files={graph.files()}
          diffSource={diffSource()}
          renderSummary={(node) =>
            node.kind === "message" || node.kind === "reasoning" ? (
              <Markdown text={node.summary ?? ""} class="text-12-regular text-text-base" />
            ) : undefined
          }
          onSelect={(id) => graph.setSelected(id)}
          onProjectionChange={(projection) => graph.setProjection(projection)}
          onDepthChange={(depth) => graph.setDepth(depth)}
          onStrategyChange={(layout) => graph.setLayout(layout)}
          onRepresentationChange={(representation) => graph.setRepresentation(representation)}
          onMinimapChange={(minimap) => graph.setMinimap(minimap)}
          onFilesChange={(files) => graph.setFiles(files)}
          onTurnMap={(turnID) => graph.setTurnMap(turnID)}
          onOpenTranscript={(id) => {
            const ref = openInTranscript(model(), id)

            if (!ref?.messageID) return
            props.onBack()
            props.onOpenTranscript(ref.messageID, ref.partID)
          }}
          onBack={() => props.onBack()}
          endInset={isDesktop() ? "72px" : undefined}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
