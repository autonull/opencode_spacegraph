import { Show, onMount } from "solid-js"
import type { MountedSession, SessionScreen, SessionSurface } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { SessionGraph } from "@opencode/session-graph"
import { turnSubgraph } from "@opencode/session-ui/graph"
import type { GraphNode } from "@opencode/session-ui/graph"

export function TurnMapLayer(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  surface: SessionSurface
  labels: { title: string; open: string; close: string; empty: string }
  openFull: () => void
  onOpenTranscript?: (id: string) => void
}) {
  let panel: HTMLDivElement | undefined

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

  const graph = props.model.graph(props.session)

  const turn = () => {
    const messageID = props.screen.transcript.activeMessageID()

    return (messageID ? graph().turnByMessageID.get(messageID) : undefined) ?? graph().activeTurn
  }

  const roots = () => {
    const id = turn()
    return id ? turnSubgraph(graph(), id, 7).nodes : ([] as readonly GraphNode[])
  }

  return (
    <Show when={props.model.turnMap(props.session)}>
    <div
      class="absolute inset-0 z-10 flex items-center justify-center bg-v2-overlay-simple-overlay-scrim p-6"
      onKeyDown={keydown}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={props.labels.title}
        class="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border border-v2-border-border-base bg-v2-background-bg-base shadow-xl"
        data-slot="spacegraph-turn-map"
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
            chrome={false}
            shell="bare"
            reducedMotion={true}
            onOpenTranscript={props.onOpenTranscript}
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
    </Show>
  )
}
