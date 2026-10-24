import { Button } from "@opencode/ui/button"
import {
  buildGraph,
  nodeByID,
  openInTranscript,
  scopeToTurns,
  turnNodeID,
  type EqualizerRule,
  type GraphArrangement,
  type GraphSide,
  type SessionLineage,
} from "@opencode/session-ui/graph"
import { useData } from "@opencode/session-ui/context"
import { useMarkdown } from "@opencode/session-ui/context/markdown"
import { Markdown } from "@opencode/session-ui/markdown"
import { useLocation } from "@solidjs/router"
import { createMediaQuery } from "@solid-primitives/media"
import { ErrorBoundary, Suspense, createEffect, createMemo, createSignal, lazy, on, untrack } from "solid-js"
import { messageIdFromHash } from "@/session/message-id-from-hash"
import { graphPermalinkFromHash, graphPermalinkHash } from "@/session/graph/graph-permalink"
import { useLanguage } from "@/runtime/i18n/language"
import pkg from "../../../package.json"
import type { SessionModel } from "@/session/model"

// The graph surface, its renderer registry, and both adapters load on demand so none of them enters
// the session entry chunk. `GraphView` is the only thing imported from `@opencode/session-graph`.
const GraphView = lazy(() => import("@opencode/session-graph").then((mod) => ({ default: mod.GraphView })))

/**
 * The lazy map surface for one session (I4.2). It reads the session's own store, builds the pure graph
 * model, and hands only data and callbacks to `@opencode/session-graph`; it never imports an adapter.
 * A load or mount failure falls back to the transcript so the session never breaks.
 */
export function SessionGraphView(props: {
  session: SessionModel
  onBack: () => void
  onOpenTranscript: (messageID: string, partID?: string) => void
  /**
   * Reveals a node's message in the log without leaving the map. The hybrid's bridge: the reader
   * picks a node and the log moves to it. Absent when the map has the panel to itself.
   */
  onReveal?: (messageID: string, partID?: string) => void
  /** The message the log is reading, so the map can mark the turn it belongs to. */
  activeMessageID?: string
  /** Changes when the pane's shape changes, so the map frames its content for the new shape. */
  refitKey?: string
  /** The hybrid's geometry. The view only offers the choice; the host owns the arrangement. */
  arrangement?: GraphArrangement
  onArrangementChange?: (arrangement: GraphArrangement) => void
  arrangementSide?: GraphSide
  onArrangementSideChange?: (side: GraphSide) => void
  /** Puts the log beside the map; absent when the map already shares the panel with the log. */
  onSplitView?: () => void
}) {
  const language = useLanguage()
  const session = props.session
  const location = useLocation()
  // The desktop header toggles float over the panel's top-right (two 28px buttons, 12px inset);
  // reserve that width so the graph toolbar's renderer label and back control stay clickable.
  const isDesktop = createMediaQuery("(min-width: 768px)")
  const graph = session.layout.graph()
  // T6.5: opening another session is the transcript's own action, so the graph reuses it.
  const markdown = useMarkdown()
  const openSession = (sessionID: string) => markdown?.openSession?.(sessionID)

  // T6.5: where the session came from — a fork names the session it branched off, a child session
  // names its parent. The graph records the attribution; it draws no cross-session edge.
  const lineage = createMemo<SessionLineage | undefined>(() => {
    const info = session.data.info()
    const fork = info?.fork
    const parentID = info?.parentID

    if (!fork && !parentID) return undefined

    return {
      forkedFrom: fork ? { sessionID: fork.sessionID, boundary: fork.boundary } : undefined,
      parentSessionID: parentID,
    }
  })

  // T29.4: fetch the workspace snapshot (debounced ~250ms) and pass it to the model.
  // The model stays pure; the snapshot is fetched outside the model build.
  const data = useData()
  const snapshot = createMemo(() => {
    const source = data.snapshot
    const sessionID = data.sessionID

    if (!source || !sessionID) return undefined

    // Load session-scoped snapshot (covers touched files + ancestors)
    source.load("session")

    return source.get("session")
  })

  // T21.1: collect all loaded turn diffs for hunk symbol extraction.
  // The turnDiff cache loads diffs on demand; we pass what's already loaded.
  const diffByTurn = createMemo(() => {
    const source = data.turnDiff
    const sessionID = data.sessionID

    if (!source || !sessionID) return undefined

    return source.getAllLoaded()
  })

  // T3.6: the session id rides on the root node, so an exported map names its session.
  const fullModel = createMemo(() =>
    buildGraph({
      messages: session.history.messages(),
      status: session.data.status(),
      sessionID: session.data.info()?.id,
      lineage: lineage(),
      snapshot: snapshot(),
      diffByTurn: diffByTurn(),
    }),
  )

  // The scrubber moves across turn boundaries. The checkpoint is the last turn the map shows; at the
  // newest checkpoint the map is the live model itself, so a live append keeps the map current.
  const [checkpoint, setCheckpoint] = createSignal<number>()
  const lastCheckpoint = () => Math.max(0, fullModel().turns.length - 1)
  const activeCheckpoint = () => Math.min(checkpoint() ?? lastCheckpoint(), lastCheckpoint())
  const model = createMemo(() => {
    if (fullModel().turns.length === 0) return fullModel()
    const index = activeCheckpoint()
    if (index >= lastCheckpoint()) return fullModel()
    return scopeToTurns(fullModel(), new Set(fullModel().turns.slice(0, index + 1)))
  })

  // RF.8: the inspector's on-demand diffs read the same per-tab turn-diff cache the timeline uses,
  // scoped to the current session so the graph package never holds a session id.
  const diffSource = createMemo(() => {
    const source = data.turnDiff
    const sessionID = data.sessionID

    if (!source || !sessionID) return undefined

    return {
      get: (from: string) => source.get({ sessionID, from }),
      load: (from: string) => source.load({ sessionID, from }),
    }
  })

  // T3.5: a graph permalink names the node to frame and, optionally, the layout to show.
  const permalink = createMemo(() => graphPermalinkFromHash(location.hash))

  createEffect(() => {
    const target = permalink()

    if (!target?.layout) return
    graph.setLayout(target.layout)
  })

  // T15: the equalizer's rules, as the graph's own vocabulary. The store keeps the kind and the
  // status as plain strings, so they are read back into the rule type at the boundary.
  const rules = createMemo<EqualizerRule[]>(() =>
    graph.rules().map((rule) => ({
      ...rule,
      kind: rule.kind as EqualizerRule["kind"],
      status: rule.status as EqualizerRule["status"],
    })),
  )

  // The shareable link to the selected node, so a decision can be shared instead of re-scrolled to.
  const link = createMemo(() => {
    const id = graph.selected()

    if (!id) return undefined

    return `${window.location.origin}${window.location.pathname}${window.location.search}${graphPermalinkHash({
      nodeID: id,
      layout: graph.layout(),
    })}`
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

  // The turn the log is reading. The map marks it, so a reader in the hybrid sees where they are in
  // the session without leaving the log.
  const activeTurn = createMemo(() => {
    const messageID = props.activeMessageID
    if (!messageID) return undefined
    const owner = model().turnByMessageID.get(messageID)
    if (!owner) return undefined
    return turnNodeID(owner)
  })

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
      <div class="flex h-full w-full flex-col overflow-hidden">
        <div class="min-h-0 flex-1">
          <Suspense fallback={<div data-slot="session-graph-loading" class="h-full w-full" />}>
            <GraphView
          model={model()}
          projection={graph.projection()}
          checkpoint={activeCheckpoint()}
          turnCount={fullModel().turns.length}
          onCheckpoint={setCheckpoint}
          depth={graph.depth()}
          preferredRenderer={graph.renderer()}
          selection={graph.selected()}
          layout={graph.layout()}
          files={graph.files()}
          detailMode={graph.detailMode()}
          detailFraming={graph.detailFraming()}
          peek={graph.peek()}
          activeTurn={activeTurn()}
          followLog={graph.followLog()}
          refitKey={props.refitKey}
          arrangement={props.arrangement}
          onArrangementChange={props.onArrangementChange}
          arrangementSide={props.arrangementSide}
          onArrangementSideChange={props.onArrangementSideChange}
          diffSource={diffSource()}
          renderSummary={(node) =>
            node.kind === "message" || node.kind === "reasoning" ? (
              <Markdown text={node.summary ?? ""} class="text-12-regular text-text-base" />
            ) : undefined
          }
          onSelect={(id) => {
            graph.setSelected(id)
            if (!id || !props.onReveal) return
            const ref = openInTranscript(model(), id)
            if (!ref?.messageID) return
            props.onReveal(ref.messageID, ref.partID)
          }}
          onProjectionChange={(projection) => graph.setProjection(projection)}
          onDepthChange={(depth) => graph.setDepth(depth)}
          onLayoutChange={(layout) => graph.setLayout(layout)}
          onFilesChange={(files) => graph.setFiles(files)}
          onDetailModeChange={(mode) => graph.setDetailMode(mode)}
          onDetailFramingChange={(framing) => graph.setDetailFraming(framing)}
          onPeekChange={(peek) => graph.setPeek(peek)}
          // T12: the reader's windows over the map. The graph proposes the first placement; the app
          // keeps them per session, so a window survives a session switch.
          windows={graph.windows()}
          rules={rules()}
          onRulesChange={(next) => graph.setRules(next)}
          onWindowsChange={(windows) => graph.setWindows(windows)}
          onOpenWindow={(window) => {
            const current = graph.windows()
            if (current.some((open) => open.id === window.id)) return
            graph.setWindows([...current, window])
          }}
          onTurnMap={(turnID) => graph.setTurnMap(turnID)}
          onOpenTranscript={(id) => {
            const ref = openInTranscript(model(), id)

            if (!ref?.messageID) return
            // In the hybrid the log is right there: revealing it is the point, so the map stays.
            if (props.onReveal) {
              props.onReveal(ref.messageID, ref.partID)

              return
            }
            props.onBack()
            props.onOpenTranscript(ref.messageID, ref.partID)
          }}
          // T6.5: open the child session of a delegation, or the session a fork came from.
          onOpenSession={markdown?.openSession ? openSession : undefined}
          onBack={() => props.onBack()}
          onSplitView={props.onSplitView}
          endInset={isDesktop() ? "104px" : undefined}
          frame={permalink()?.nodeID}
          facetQuery={permalink()?.query}
          onCopyView={(query) => {
            const link = `${window.location.origin}${window.location.pathname}${window.location.search}${graphPermalinkHash({
              layout: graph.layout(),
              query,
            })}`
            navigator.clipboard?.writeText(link)
          }}
          link={link()}
          sessionTitle={session.data.info()?.title ?? "OpenCode Session"}
            testedCommit={pkg.version ?? "unknown"}
          />
          </Suspense>
        </div>
      </div>
    </ErrorBoundary>
  )
}
