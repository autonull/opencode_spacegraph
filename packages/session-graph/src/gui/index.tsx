import { Plugin, SessionSurface, Command, Panel, PanelTab, Slot } from "@opencode/plugin/gui"
import type { MountedSession, SessionScreen, SessionRef } from "@opencode/plugin/gui"
import type { JSX } from "solid-js"
import { lazy, Suspense, createMemo, onCleanup, createSignal, createEffect } from "solid-js"
import { onIdle } from "@opencode/plugin/gui/builtin"
import { buildGraph, turnNodeID, nodeByID } from "@opencode/session-ui/graph"
import { usePlugin } from "@opencode/plugin/gui"
import type { SessionStatus } from "@opencode/client/promise"

// Lazy-load the heavy graph components so they don't enter the session entry chunk.
const GraphView = lazy(() => import("../ui/GraphView").then((mod) => ({ default: mod.GraphView })))
const TurnMapOverlay = lazy(() => import("../ui/TurnMapOverlay").then((mod) => ({ default: mod.TurnMapOverlay })))

// Shared model builder for graph surfaces
function useGraphModel(session: MountedSession) {
  const messages = session.server.data.session.message.list(session.id)
  const status = session.server.data.session.status(session.id)

  const sessionStatus: SessionStatus =
    status === "running" ? { type: "busy" } : { type: "idle" }

  return createMemo(() =>
    buildGraph({
      messages,
      status: sessionStatus,
      sessionID: session.id,
      lineage: undefined,
      snapshot: undefined,
      diffByTurn: undefined,
    }),
  )
}

// Wrapper component for TurnMapOverlay that builds the model from session data
function TurnMapOverlayWrapper(props: {
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
  onClose: () => void
}) {
  const ctx = usePlugin()
  const model = useGraphModel(props.session)

  // Get the active turn from the transcript
  const activeMessageID = props.screen.transcript?.activeMessageID() ?? model().activeTurn?.replace(/^turn:/, "")
  const activeTurn = createMemo(() => {
    const messageID = activeMessageID
    if (!messageID) return undefined
    const owner = model().turnByMessageID.get(messageID)
    if (!owner) return undefined
    return turnNodeID(owner)
  })

  const turnID = activeTurn() ?? model().activeTurn

  if (!turnID || !nodeByID(model(), turnID)) {
    return (
      <div class="flex h-full items-center justify-center px-6 text-center text-13-regular text-text-weak">
        {ctx.t("session.graph.turnMap.noTurn")}
      </div>
    )
  }

  return (
    <TurnMapOverlay
      model={model()}
      turnID={turnID}
      onClose={props.onClose}
      onOpenFullGraph={(turnID) => {
        ctx.surfaces.select("map", props.session as unknown as SessionRef)
      }}
    />
  )
}

// Map surface: full-screen graph view
function MapSurface(props: {
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
}) {
  const ctx = usePlugin()
  const model = useGraphModel(props.session)

  // Selection state - use a signal that syncs with the model
  const [selection, setSelection] = createSignal<string | undefined>()

  // Refit key changes when surface is entered
  const [refitKey] = createSignal(0)

  return (
    <Suspense fallback={<div data-slot="session-graph-loading" class="h-full w-full" />}>
      <GraphView
        model={model()}
        selection={selection()}
        onSelect={(id) => {
          setSelection(id)
        }}
        onBack={() => ctx.surfaces.select("transcript", props.session)}
        refitKey={String(refitKey())}
        arrangement={undefined}
        onArrangementChange={() => {}}
        onSplitView={() => ctx.surfaces.select("hybrid", props.session)}
      />
    </Suspense>
  )
}

// Hybrid surface: transcript + graph side by side
function HybridSurface(props: {
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
}) {
  const ctx = usePlugin()
  const model = useGraphModel(props.session)

  const [selection, setSelection] = createSignal<string | undefined>()
  const [refitKey] = createSignal(0)
  const [activeMessageID, setActiveMessageID] = createSignal<string | undefined>()

  // Get active message from transcript
  createEffect(() => {
    const id = props.screen.transcript?.activeMessageID() ?? model().activeTurn?.replace(/^turn:/, "")
    if (id) {
      setActiveMessageID(id)
    }
  })

  // Compute active turn from active message
  const activeTurn = createMemo(() => {
    const messageID = activeMessageID()
    if (!messageID) return undefined
    const owner = model().turnByMessageID.get(messageID)
    if (!owner) return undefined
    return turnNodeID(owner)
  })

  return (
    <div class="flex h-full flex-col overflow-hidden">
      <div class="flex h-full flex-1 overflow-hidden">
        <div class="flex h-full w-full">
          {/* Transcript on the left */}
          <div class="flex h-full flex-1 min-w-0 overflow-hidden" style={{ "min-width": "280px" }}>
            {props.transcript}
          </div>
          {/* Graph on the right */}
          <div class="flex h-full w-full min-w-0 overflow-hidden" style={{ "min-width": "240px", width: "50%" }}>
            <Suspense fallback={<div data-slot="session-graph-loading" class="h-full w-full" />}>
              <GraphView
                model={model()}
                selection={selection()}
                onSelect={(id) => setSelection(id)}
                onBack={() => ctx.surfaces.select("transcript", props.session)}
                refitKey={String(refitKey())}
                arrangement="side"
                activeTurn={activeTurn()}
                followLog={true}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Plugin.define({
  setup(ctx) {
    // Preload the graph chunks while the app idles, so the first open renders at once.
    onCleanup(onIdle(() => void GraphView.preload()))
    onCleanup(onIdle(() => void TurnMapOverlay.preload()))

    // Register the map surface (full map view)
    ctx.add(SessionSurface, {
      id: "map",
      title: ctx.t("session.graph.surface.map"),
      icon: "branch",
      order: 10,
      render({ session, screen, transcript }: { session: MountedSession; screen: SessionScreen; transcript: JSX.Element }) {
        return (
          <MapSurface session={session} screen={screen} transcript={transcript} />
        )
      },
    })

    // Register the hybrid surface (map + transcript side by side)
    ctx.add(SessionSurface, {
      id: "hybrid",
      title: ctx.t("session.graph.surface.hybrid"),
      icon: "split",
      order: 20,
      render({ session, screen, transcript }: { session: MountedSession; screen: SessionScreen; transcript: JSX.Element }) {
        return (
          <HybridSurface session={session} screen={screen} transcript={transcript} />
        )
      },
    })

    // Register the transcript-graph surface (transcript with inline graph overlay)
    ctx.add(SessionSurface, {
      id: "transcript-graph",
      title: ctx.t("session.graph.surface.transcriptGraph"),
      icon: "grid-plus",
      order: 30,
      render({ session, screen, transcript }: { session: MountedSession; screen: SessionScreen; transcript: JSX.Element }) {
        return (
          <Suspense fallback={<div data-slot="session-graph-loading" class="h-full w-full" />}>
            <TurnMapOverlayWrapper
              session={session}
              screen={screen}
              transcript={transcript}
              onClose={() => ctx.surfaces.select("transcript", session)}
            />
          </Suspense>
        )
      },
    })

    // Register the graph toggle command
    ctx.add(Command, {
      id: "toggle-graph",
      title: ctx.t("session.graph.command.toggle"),
      description: ctx.t("session.graph.command.toggle.description"),
      group: ctx.t("command.group.session"),
      section: "session",
      bind: "mod+shift+g",
      run() {
        const session = ctx.sessions.current()
        if (!session) return
        const current = ctx.surfaces.current(session)
        const next = current === "transcript" ? "hybrid" : "transcript"
        ctx.surfaces.select(next, session)
      },
    })

    // Register the hybrid toggle command
    ctx.add(Command, {
      id: "toggle-hybrid",
      title: ctx.t("session.graph.command.toggleHybrid"),
      description: ctx.t("session.graph.command.toggleHybrid.description"),
      group: ctx.t("command.group.session"),
      section: "session",
      bind: "mod+shift+h",
      run() {
        const session = ctx.sessions.current()
        if (!session) return
        const current = ctx.surfaces.current(session)
        const next = current === "hybrid" ? "map" : "hybrid"
        ctx.surfaces.select(next, session)
      },
    })

    // Register the side panel for the session map overview
    const mapTab: PanelTab = {
      id: "map",
      get title() {
        return ctx.t("session.graph.panel.map.title")
      },
      draggable: false,
      closable: "compact",
    }

    ctx.add(Panel, {
      id: "map",
      region: "side",
      mobile: {
        get title() {
          return ctx.t("session.graph.panel.map.title")
        },
        order: 50,
        kind: "menu",
        icon: "branch",
      },
      list: (input: { session: MountedSession; screen: SessionScreen; open: readonly string[] }) =>
        input.open.includes("map") ? [mapTab] : [],
      render: (props: { tab: PanelTab; session: MountedSession; screen: SessionScreen }) => (
        <Suspense fallback={<div data-slot="session-graph-loading" class="h-full w-full" />}>
          <div class="flex h-full items-center justify-center px-6 text-center text-13-regular text-text-weak">
            {ctx.t("session.graph.panel.map.comingSoon")}
          </div>
        </Suspense>
      ),
    })

    // Register a slot contribution for the session header
    ctx.add(Slot, {
      at: "session.header",
      order: 100,
      render() {
        const session = ctx.sessions.current()
        if (!session) return null
        const current = ctx.surfaces.current(session)
        const isGraph = current !== "transcript"

        return (
          <button
            class="flex h-8 items-center gap-1.5 rounded-sm px-2 text-12-medium transition-colors hover:bg-v2-background-bg-deep"
            onClick={() => {
              const next = isGraph ? "transcript" : "hybrid"
              ctx.surfaces.select(next, session)
            }}
            aria-pressed={isGraph}
            aria-label={isGraph ? ctx.t("session.graph.close") : ctx.t("session.graph.open")}
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={2}>
              <rect x={3} y={3} width={7} height={7} rx={1}></rect>
              <rect x={14} y={3} width={7} height={7} rx={1}></rect>
              <rect x={3} y={14} width={7} height={7} rx={1}></rect>
              <rect x={14} y={14} width={7} height={7} rx={1}></rect>
            </svg>
            <span class="hidden sm:inline">{isGraph ? ctx.t("session.graph.close") : ctx.t("session.graph.open")}</span>
          </button>
        )
      },
    })
  },
})