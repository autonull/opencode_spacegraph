import { buildGraph, nodeByID } from "@opencode/session-ui/graph"
import { Button } from "@opencode/ui/button"
import { ErrorBoundary, Suspense, createMemo, lazy } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import type { SessionModel } from "@/session/model"

// The hybrid turn map (H6.2) mounts the lazy graph package over the transcript; nothing here pulls a
// renderer or adapter into the session entry chunk.
const TurnMapOverlay = lazy(() => import("@opencode/session-graph").then((mod) => ({ default: mod.TurnMapOverlay })))

/** Opens the overlay for the session's live turn; the wrapper resolves it from the model. */
export const TURN_MAP_ACTIVE = "active"

/**
 * The hybrid turn map for one session (H6.2): a compact execution subgraph of a single turn opened
 * over the transcript, so the reader keeps their place. A load or mount failure returns to the log
 * rather than breaking the session.
 */
export function SessionTurnMapOverlay(props: {
  session: SessionModel
  turnID: string
  onClose: () => void
  onOpenFullGraph: (turnID: string) => void
}) {
  const language = useLanguage()
  const model = createMemo(() => buildGraph(props.session.history.messages(), props.session.data.status()))

  // A stored turn can outlive the model (a reload after history changes); fall back to the live turn.
  const turnID = () => {
    if (nodeByID(model(), props.turnID)) return props.turnID

    return model().activeTurn ?? model().turns.at(-1) ?? props.turnID
  }

  return (
    <ErrorBoundary
      fallback={
        <div
          data-slot="session-turn-map-error"
          class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-background-base/80 p-6 text-center"
        >
          <div class="flex flex-col items-center gap-1">
            <div class="text-14-medium text-text">{language.t("session.graph.turnMap.error")}</div>
            <div class="text-13-regular text-text-weak max-w-md">
              {language.t("session.graph.turnMap.error.description")}
            </div>
          </div>
          <Button variant="neutral" size="normal" onClick={() => props.onClose()}>
            {language.t("session.graph.back")}
          </Button>
        </div>
      }
    >
      <Suspense fallback={null}>
        <TurnMapOverlay
          model={model()}
          turnID={turnID()}
          onClose={() => props.onClose()}
          onOpenFullGraph={(id) => props.onOpenFullGraph(id)}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
