import { Icon } from "@opencode/ui/icon"
import { ResizeHandle } from "@opencode/ui/resize-handle"
import type { GraphArrangement, GraphMode, GraphSide } from "@opencode/session-ui/graph"
import { createMemo, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import "./graph-panel.css"

/**
 * The session panel's composition: the log, the map, and the geometry they meet under.
 *
 * The log's pane is the log's *home*. It is rendered in every mode that shows the log, and the map
 * is arranged around it with CSS order rather than by moving nodes — so entering or leaving the
 * hybrid never detaches the transcript, and the reader keeps their place in it. That is the whole
 * point of the hybrid: the log does not go away while the map is beside it.
 *
 * The arrangements are the same two surfaces under different geometry — the map beside the log, the
 * map above the log, the map floating over the log — and the reader picks one. Nothing about the
 * composition is hard-coded into the map: this panel owns the geometry, and the map pane is the
 * host's ordinary graph view.
 */

/** Neither pane shrinks past this: a map narrower than this cannot be read, and neither can a log. */
const MIN_MAP_PX = 240
const MIN_LOG_PX = 280

/** The floating pane's smallest box, as a fraction of the panel. */
const MIN_PANE_FRACTION = 0.2

/** The log's text size, as a scale on the theme's own sizes. */
const MIN_TEXT_SCALE = 0.8
const MAX_TEXT_SCALE = 1.4

export type GraphPaneBox = {
  /** The pane's origin, as a fraction of the panel. */
  x: number
  y: number
  width: number
  height: number
}

export const DEFAULT_PANE_BOX: GraphPaneBox = { x: 0.58, y: 0.04, width: 0.4, height: 0.56 }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export type SessionGraphPanelProps = {
  /** Which surfaces the panel holds. */
  mode: GraphMode
  /**
   * The map pane, as a factory: the map's chunk and the graph model are only built when the map is
   * actually on, so a reader who never opens it never pays for it.
   */
  graph: () => JSX.Element
  /** The log pane. */
  transcript: JSX.Element
  arrangement: GraphArrangement
  side: GraphSide
  /** The share of the split axis the map holds, as a fraction. */
  split: number
  onSplit: (split: number) => void
  pane: GraphPaneBox | undefined
  onPane: (pane: GraphPaneBox) => void
  /** How large the log's text is, as a scale on the theme's own sizes. */
  logTextScale: number
  onLogTextScale: (scale: number) => void
  onClose: () => void
}

export function SessionGraphPanel(props: SessionGraphPanelProps) {
  const language = useLanguage()
  let root!: HTMLDivElement
  let logPane: HTMLDivElement | undefined
  let mapPane: HTMLDivElement | undefined
  let dividerEl: HTMLDivElement | undefined
  const [size, setSize] = createSignal({ width: 0, height: 0 })

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }))
    })
    observer.observe(root)
    onCleanup(() => observer.disconnect())
  })

  // T18.4: focus management — F6 cycles focus between the log pane, the divider, and the map pane.
  const focusOrder = createMemo(() => {
    if (!hybrid()) return []
    const order: ("log" | "divider" | "map")[] = []
    if (props.mode !== "graph") order.push("log")
    if (hybrid() && !floating()) order.push("divider")
    if (props.mode !== "transcript") order.push("map")
    return order
  })

  const handleRootKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "F6") return
    event.preventDefault()
    const order = focusOrder()
    if (order.length === 0) return
    const active = document.activeElement
    let currentIndex = -1
    if (active === logPane) currentIndex = order.indexOf("log")
    else if (active === dividerEl) currentIndex = order.indexOf("divider")
    else if (active === mapPane || mapPane?.contains(active as Node)) currentIndex = order.indexOf("map")
    const nextIndex = (currentIndex + 1) % order.length
    const next = order[nextIndex]
    if (next === "log") logPane?.focus()
    else if (next === "divider") dividerEl?.focus()
    else if (next === "map") mapPane?.focus()
  }

  const hybrid = () => props.mode === "hybrid"
  const floating = () => hybrid() && props.arrangement === "floating"
  const beside = () => hybrid() && props.arrangement === "side"
  const mapFirst = () => props.side === "start"

  // The split axis: the height when the panes are stacked, the width when they are beside each
  // other. The map's share is the same fraction either way, so the reader's proportion survives a
  // change of arrangement.
  const axis = () => (beside() ? size().width : size().height)
  // The handle's own pixel minimums are the authority; this is only the safety net.
  const mapShare = () => clamp(props.split, 0.05, 0.95)
  const mapPixels = () => Math.round(axis() * mapShare())

  // The handle sits at the end of the first pane, so its size is that pane's size: the map when it
  // comes first, the log when it comes second.
  const firstPanePixels = () => (mapFirst() ? mapPixels() : Math.max(0, axis() - mapPixels()))
  const handleMin = () => (mapFirst() ? MIN_MAP_PX : MIN_LOG_PX)
  const handleMax = () => Math.max(handleMin(), axis() - (mapFirst() ? MIN_LOG_PX : MIN_MAP_PX))

  const resize = (pixels: number) => {
    const total = axis()
    if (total <= 0) return
    const share = mapFirst() ? pixels / total : 1 - pixels / total
    props.onSplit(clamp(share, 0.05, 0.95))
  }

  const box = createMemo<GraphPaneBox>(() => props.pane ?? DEFAULT_PANE_BOX)

  // A screen-space drag: the pointer's delta is the pane's delta, so nothing converts pixels to
  // world units. The pointer is captured, so the drag survives the pointer leaving the pane.
  const beginDrag = (event: PointerEvent, move: (event: PointerEvent) => void) => {
    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture(event.pointerId)

    const onMove = (moveEvent: PointerEvent) => move(moveEvent)
    const end = () => {
      handle.removeEventListener("pointermove", onMove)
      handle.removeEventListener("pointerup", end)
      handle.removeEventListener("pointercancel", end)
    }

    handle.addEventListener("pointermove", onMove)
    handle.addEventListener("pointerup", end)
    handle.addEventListener("pointercancel", end)
  }

  const movePane = (event: PointerEvent) => {
    const start = { x: event.clientX, y: event.clientY }
    const origin = box()

    beginDrag(event, (moveEvent) => {
      const { width, height } = size()
      const dx = width > 0 ? (moveEvent.clientX - start.x) / width : 0
      const dy = height > 0 ? (moveEvent.clientY - start.y) / height : 0
      props.onPane({
        ...origin,
        x: clamp(origin.x + dx, 0, 1 - origin.width),
        y: clamp(origin.y + dy, 0, 1 - origin.height),
      })
    })
  }

  const resizePane = (event: PointerEvent) => {
    const start = { x: event.clientX, y: event.clientY }
    const origin = box()

    beginDrag(event, (moveEvent) => {
      const { width, height } = size()
      const dx = width > 0 ? (moveEvent.clientX - start.x) / width : 0
      const dy = height > 0 ? (moveEvent.clientY - start.y) / height : 0
      props.onPane({
        x: origin.x,
        y: origin.y,
        width: clamp(origin.width + dx, MIN_PANE_FRACTION, 1 - origin.x),
        height: clamp(origin.height + dy, MIN_PANE_FRACTION, 1 - origin.y),
      })
    })
  }

  // T18.4: keyboard support for the divider — arrow keys resize, Home/End go to min/max.
  const handleDividerKeyDown = (event: KeyboardEvent) => {
    const total = axis()
    if (total <= 0) return
    const currentPixels = firstPanePixels()
    const step = total * 0.02 // 2% per key press
    const min = handleMin()
    const max = handleMax()

    let nextPixels: number | undefined
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextPixels = Math.min(max, currentPixels + step)
        break
      case "ArrowLeft":
      case "ArrowUp":
        nextPixels = Math.max(min, currentPixels - step)
        break
      case "Home":
        nextPixels = min
        break
      case "End":
        nextPixels = max
        break
    }
    if (nextPixels !== undefined) {
      event.preventDefault()
      const share = mapFirst() ? nextPixels / total : 1 - nextPixels / total
      props.onSplit(clamp(share, 0.05, 0.95))
      dividerEl?.focus()
    }
  }

  return (
    <div
      ref={root}
      data-slot="session-graph-panel"
      data-component="session-graph-panel"
      data-mode={props.mode}
      data-arrangement={props.arrangement}
      class="relative flex h-full min-h-0 overflow-hidden"
      classList={{
        "flex-row": beside(),
        "flex-col": !beside(),
      }}
      onKeyDown={handleRootKeyDown}
    >
      <Show when={props.mode !== "graph"}>
        <div
          ref={logPane}
          data-slot="session-graph-panel-log"
          class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          style={{ order: mapFirst() ? 2 : 0, "--text-scale": props.logTextScale }}
          tabIndex={0}
        >
          <Show when={hybrid()}>
            {/* The log's text size, at hand: in a split panel the log is narrow, and the reader
                wants it bigger or smaller without leaving the map to find a setting. */}
            <div
              data-slot="session-graph-panel-log-scale"
              class="flex h-7 shrink-0 items-center gap-2 border-b border-border-weaker-base px-2"
            >
              <span class="shrink-0 text-12-regular text-text-weak">
                {language.t("session.graph.hybrid.textSize")}
              </span>
              <input
                type="range"
                min={MIN_TEXT_SCALE}
                max={MAX_TEXT_SCALE}
                step="0.05"
                value={props.logTextScale}
                aria-label={language.t("session.graph.hybrid.textSize.aria")}
                class="h-1 w-32 shrink-0"
                onInput={(event) => props.onLogTextScale(Number(event.currentTarget.value))}
              />
              <span class="w-9 shrink-0 text-right text-12-regular tabular-nums text-text-weak">
                {Math.round(props.logTextScale * 100)}%
              </span>
            </div>
          </Show>
          <div class="min-h-0 flex-1">{props.transcript}</div>
        </div>
      </Show>
      <Show when={hybrid() && !floating()}>
        <div
          ref={dividerEl}
          data-slot="session-graph-panel-divider"
          class="relative z-10 shrink-0 bg-border-weaker-base"
          classList={{
            "h-px w-full": !beside(),
            "h-full w-px": beside(),
          }}
          role="separator"
          aria-orientation={beside() ? "horizontal" : "vertical"}
          aria-label={language.t("session.graph.hybrid.divider")}
          tabIndex={0}
          onKeyDown={handleDividerKeyDown}
        >
          <ResizeHandle
            direction={beside() ? "horizontal" : "vertical"}
            edge="end"
            size={firstPanePixels()}
            min={handleMin()}
            max={handleMax()}
            onResize={resize}
          />
        </div>
      </Show>
      <Show when={props.mode !== "transcript"}>
        <div
          ref={mapPane}
          data-slot="session-graph-panel-map"
          class="min-h-0 min-w-0 overflow-hidden"
          classList={{
            "absolute z-20 flex flex-col rounded-md border border-border-base bg-background-base shadow-lg":
              floating(),
            "relative": !floating(),
          }}
          style={
            floating()
              ? {
                  left: `${box().x * 100}%`,
                  top: `${box().y * 100}%`,
                  width: `${box().width * 100}%`,
                  height: `${box().height * 100}%`,
                }
              : {
                  // The map pane's height is a percentage, not a flex result: a pane sized by its
                  // content leaves the percentage heights inside it unresolved, and the map view
                  // would shrink to its content instead of filling the panel. Beside the log the
                  // pane fills the row; above it the pane holds the map's share of the height.
                  flex: hybrid() ? `0 0 ${mapShare() * 100}%` : "1 1 auto",
                  height: hybrid() && !beside() ? `${mapShare() * 100}%` : "100%",
                  order: mapFirst() ? 0 : 2,
                }
          }
          tabIndex={0}
        >
          <Show when={floating()}>
            <div
              data-slot="session-graph-panel-pane-bar"
              class="flex cursor-grab items-center gap-2 border-b border-border-weaker-base px-2 py-1 active:cursor-grabbing"
              onPointerDown={movePane}
            >
              <span class="min-w-0 flex-1 truncate text-12-medium text-text-strong">
                {language.t("session.graph.hybrid.pane.title")}
              </span>
              <button
                type="button"
                class="shrink-0 rounded-sm p-0.5 text-text-weak hover:bg-surface-base-hover hover:text-text-strong"
                aria-label={language.t("session.graph.hybrid.pane.close")}
                onClick={() => props.onClose()}
              >
                <Icon name="close" />
              </button>
            </div>
          </Show>
          <div
            class="min-h-0"
            classList={{
              "flex-1": floating(),
              "h-full": !floating(),
            }}
          >
            {props.graph()}
          </div>
          <Show when={floating()}>
            <div
              data-slot="session-graph-panel-pane-resize"
              class="absolute bottom-0 end-0 h-4 w-4 cursor-nwse-resize"
              onPointerDown={resizePane}
            />
          </Show>
        </div>
      </Show>
    </div>
  )
}
