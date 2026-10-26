import { GraphIconButton } from "./GraphIconButton"
import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal, onCleanup, onMount } from "solid-js"
import { type GraphViewData } from "@opencode/session-ui/graph"

export type GraphTimeControlProps = {
  checkpoint?: number
  turnCount?: number
  onCheckpoint?: (index: number) => void
  model?: GraphViewData
}

export const GraphTimeControl = (props: GraphTimeControlProps) => {
  const i18n = useI18n()
  const [timeOpen, setTimeOpen] = createSignal<boolean>()
  const offLive = () =>
    props.checkpoint !== undefined && props.turnCount !== undefined && props.checkpoint < props.turnCount - 1
  const timeShown = () => timeOpen() ?? offLive()

  let rootEl!: HTMLDivElement
  onMount(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string }>).detail
      if (detail?.name !== "facets") return
      const menu = rootEl?.querySelector<HTMLDetailsElement>('[data-slot="graph-toolbar-facets"]')
      if (menu) menu.open = true
    }
    window.addEventListener("graph:command", handleCommand)
    onCleanup(() => window.removeEventListener("graph:command", handleCommand))
  })

  const turnStatuses = () =>
    (props.model?.turns ?? []).map((id) => props.model?.nodes.find((node) => node.id === id))

  return (
    <Show when={props.onCheckpoint && (props.turnCount ?? 0) > 1}>
      <GraphIconButton
        label={i18n.t("ui.sessionGraph.time.toggle")}
        icon="outline-rotate-clockwise"
        pressed={timeShown()}
        slot="graph-time-toggle"
        onClick={() => setTimeOpen(!timeShown())}
      />
      <Show when={timeShown()}>
        <label
          data-slot="session-graph-scrubber"
          class="flex min-w-40 items-center gap-2 text-12-regular text-text-weak"
        >
          <div class="relative flex min-w-24 flex-1 items-center">
            <input
              type="range"
              min="1"
              max={props.turnCount}
              step="1"
              value={(props.checkpoint ?? 0) + 1}
              aria-label={i18n.t("ui.sessionGraph.time.aria")}
              class="h-1 w-full"
              onInput={(event) => props.onCheckpoint?.(Number(event.currentTarget.value) - 1)}
            />
            <div data-slot="graph-time-ticks" class="pointer-events-none absolute inset-x-0 top-2 flex justify-between">
              {turnStatuses().map((node) => (
                <span
                  data-slot="graph-time-tick"
                  data-status={node?.status ?? "neutral"}
                  title={node?.label}
                  class="h-1 w-px bg-border-weaker-base"
                  classList={{ "bg-[var(--border-critical-selected)]": node?.status === "failed" }}
                />
              ))}
            </div>
          </div>
          <output class="shrink-0 tabular-nums">
            {i18n.t("ui.sessionGraph.time.value", {
              current: String((props.checkpoint ?? 0) + 1),
              total: String(props.turnCount),
            })}
          </output>
        </label>
      </Show>
    </Show>
  )
}

import { Show } from "solid-js"