import { createMemo } from "solid-js"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"
import type { SpacegraphModel } from "./model"
import { FullMap } from "./full-map"
import { Transcript } from "./transcript"

export function HybridSurface(props: {
  model: SpacegraphModel
  session: MountedSession
  screen: SessionScreen
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const arrangement = createMemo(() => props.model.arrangement(props.session))
  const side = createMemo(() => props.model.side(props.session))
  const floating = createMemo(() => arrangement() === "floating")
  const stacked = createMemo(() => arrangement() === "stacked")

  const root = createMemo(() =>
    stacked() ? "relative flex size-full min-h-0 flex-col" : "relative flex size-full min-h-0",
  )

  const transcript = createMemo(() => {
    if (floating()) return "size-full"

    return stacked() ? "min-h-0 flex-1" : "min-h-0 min-w-0 flex-1"
  })

  const map = createMemo(() => {
    if (floating()) return `absolute top-4 bottom-4 w-2/5 overflow-hidden rounded-lg border border-v2-border-border-base bg-v2-background-bg-base shadow-lg ${side() === "start" ? "left-4" : "right-4"}`

    if (stacked()) return "h-1/3 shrink-0 border-t border-v2-border-border-base"

    return `w-2/5 shrink-0 border-v2-border-border-base ${side() === "start" ? "order-first border-r" : "order-last border-l"}`
  })

  return (
    <div class={root()} data-slot="spacegraph-surface-hybrid" data-arrangement={arrangement()}>
      <div class={transcript()}>
        <Transcript session={props.session} screen={props.screen} t={props.t} />
      </div>
      <div class={map()}>
        <FullMap
          model={props.model}
          session={props.session}
          screen={props.screen}
          arrangement={arrangement()}
          arrangementSide={side()}
        />
      </div>
    </div>
  )
}
