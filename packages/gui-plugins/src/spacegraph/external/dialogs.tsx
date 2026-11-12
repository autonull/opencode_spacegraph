// Fallbacks for hosts that do not provide `ctx.surfaces`. The map and the hybrid arrangement open as dialogs there;
// the side Panel remains the primary map.

import { Show, onMount, createMemo } from "solid-js"
import type { JSX } from "solid-js"
import type { MountedSession, SessionScreen, SetupContext } from "@opencode/plugin/gui"
import definition from ".."
import { SessionGraph } from "@opencode/session-graph"
import { LAYOUT_STRATEGIES } from "@opencode/session-ui/graph"
import { turnSubgraph } from "@opencode/session-ui/graph"
import type { GraphNode } from "@opencode/session-ui/graph"
import type { SpacegraphModel } from "../model"

type Ctx = SetupContext<typeof definition>

export function MapDialog(props: {
  ctx: Ctx
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  title: string
  onOpenTranscript?: (id: string) => void
}): JSX.Element {
  const live = props.model.graph(props.session)
  const graph = createMemo(() => props.model.graphAt(props.session, live()))
  const timeTravel = () => props.model.timeTravelEnabled()
  const turnCount = () => live().turns.length

  const focused = () => props.model.focused(props.session)
  const preferredRenderer = () => props.model.renderer()
  const detailMode = () => props.model.detailMode(props.session)
  const arrangement = () => props.model.arrangement(props.session)
  const arrangementSide = () => props.model.side(props.session)

  return (
    <props.ctx.ui.Dialog title={props.title} size="x-large">
      <div class="h-[min(64vh,560px)] min-h-0">
        <SessionGraph
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
          checkpoint={timeTravel() ? props.model.checkpointIndex(props.session, live()) : undefined}
          turnCount={timeTravel() ? turnCount() : undefined}
          onCheckpoint={
            timeTravel() ? (index: number) => props.model.setCheckpoint(props.session, index, turnCount()) : undefined
          }
          onSelect={(id: string | undefined) => props.model.focus(props.session, id)}
          onLayoutChange={(next: string) => {
            const layout = LAYOUT_STRATEGIES.find((candidate: string) => candidate === next)

            if (layout) props.model.setLayout(props.session, layout)
          }}
          onDepthChange={(next: import("@opencode/session-ui/graph").DepthMode) => props.model.setDepth(props.session, next)}
          onDetailModeChange={(next: import("@opencode/session-ui/graph").DetailMode) => props.model.setDetailMode(props.session, next)}
          arrangement={arrangement()}
          arrangementSide={arrangementSide()}
          refitKey={arrangement()}
          onArrangementChange={(next: import("@opencode/session-ui/graph").GraphArrangement) => props.model.setArrangement(props.session, next)}
          onArrangementSideChange={(next: import("@opencode/session-ui/graph").GraphSide) => props.model.setSide(props.session, next)}
          preferredRenderer={preferredRenderer}
          enableCostLens={props.model.costLensEnabled()}
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
        />
      </div>
    </props.ctx.ui.Dialog>
  )
}

export function TurnMapDialog(props: {
  ctx: Ctx
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  labels: { title: string; open: string; close: string; empty: string }
  openFull: () => void
  onOpenTranscript?: (id: string) => void
}): JSX.Element {
  const live = props.model.graph(props.session)
  const graph = createMemo(() => props.model.graphAt(props.session, live()))

  const turn = createMemo(() => {
    const messageID = props.screen.transcript.activeMessageID()

    return (messageID ? graph().turnByMessageID.get(messageID) : undefined) ?? graph().activeTurn
  })

  const roots = createMemo(() => {
    const id = turn()
    return id ? turnSubgraph(graph(), id, 7).nodes : ([] as readonly GraphNode[])
  })

  const close = () => props.model.closeTurnMap(props.session)

  const openFull = () => {
    close()
    props.openFull()
  }

  onMount(() => panel?.querySelector<HTMLElement>("button")?.focus())

  const keydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      close()

      return
    }

    if (event.key !== "Tab" || !panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    )

    const first = focusable.item(0)
    const last = focusable.item(focusable.length - 1)

    if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  let panel: HTMLDivElement | undefined

  return (
    <Show when={props.model.turnMap(props.session)}>
    <props.ctx.ui.Dialog
      title={props.labels.title}
      size="normal"
      footer={
        <props.ctx.ui.Button variant="ghost" onClick={openFull}>
          {props.labels.open}
        </props.ctx.ui.Button>
      }
    >
      <div class="flex flex-col gap-2">
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={props.labels.title}
          class="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border border-v2-border-border-base bg-v2-background-bg-base shadow-xl"
          data-slot="spacegraph-turn-map"
          onKeyDown={keydown}
        >
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-v2-border-border-base px-4 py-3">
            <span class="text-13-medium text-text-base">{props.labels.title}</span>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-13-regular text-text-weak hover:bg-v2-overlay-simple-overlay-hover hover:text-text-base"
              onClick={close}
            >
              {props.labels.close}
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-hidden p-4" data-scrollable style="height: 320px;">
            <SessionGraph
              model={graph()}
              roots={roots()}
              layout="tree"
              depth="flat"
              detailMode="popover"
              level="execution"
              density={props.model.density()}
              chrome={false}
              shell="bare"
              reducedMotion={true}
              spatialMemoryOwner={false}
              maxDrillDepth={1}
              onOpenTranscript={props.onOpenTranscript}
              notes={props.model.notes(props.session)}
              onNotesChange={(notes) => props.model.setNotes(props.session, notes)}
              pins={props.model.pins(props.session)}
              onPinsChange={(pins) => props.model.setPins(props.session, pins)}
            />
          </div>
          <div class="flex shrink-0 justify-end border-t border-v2-border-border-base px-4 py-3">
            <button
              type="button"
              class="rounded-md border border-v2-border-border-base px-3 py-1.5 text-13-regular text-text-base hover:bg-v2-overlay-simple-overlay-hover"
              onClick={openFull}
            >
              {props.labels.open}
            </button>
          </div>
        </div>
      </div>
    </props.ctx.ui.Dialog>
    </Show>
  )
}
