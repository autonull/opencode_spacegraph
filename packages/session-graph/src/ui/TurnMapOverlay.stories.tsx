import { buildFixtureGraph, turnNodeID } from "@opencode/session-ui/graph"
import type { RenderTheme } from "@spacegraphjs/renderer"
import { createSignal } from "solid-js"
import { resolveGraphTheme } from "./theme"
import { TurnMapOverlay } from "./TurnMapOverlay"

const graph = buildFixtureGraph()
const TURN = turnNodeID("msg_user_1")

type Harness = {
  open: () => void
  close: () => void
  opened: () => boolean
  openedFull: () => string | undefined
}

const OverlayHarness = (props: { theme?: RenderTheme; limit?: number; open?: boolean; onOpenChange?: (open: boolean) => void }) => {
  const [open, setOpen] = createSignal(true)
  const [openedFull, setOpenedFull] = createSignal<string>()
  const turnMapHarness = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    opened: open,
    openedFull,
  }
  ;(window as unknown as { __turnMap?: Harness }).__turnMap = turnMapHarness
  // Keep alias for backward compatibility
  ;(window as unknown as { __graph?: typeof turnMapHarness }).__graph = turnMapHarness

  return (
    <div style={{ position: "relative", width: "1100px", height: "640px" }}>
      <div style={{ padding: "16px", "font-family": "system-ui, sans-serif" }}>Transcript stays here.</div>
      <TurnMapOverlay
        model={graph}
        turnID={TURN}
        theme={props.theme ?? resolveGraphTheme()}
        limit={props.limit}
        preferredRenderer={() => "spacegraph"}
        onClose={() => setOpen(false)}
        onOpenChange={(o) => setOpen(o)}
        onOpenFullGraph={(turnID) => setOpenedFull(turnID)}
        open={props.open ?? open()}
      />
    </div>
  )
}

export default {
  title: "OpenCode/Session graph/Turn map",
  id: "session-graph-turn-map",
  component: OverlayHarness,
  args: { limit: 7 },
}

export const Default = {}

export const SmallLimit = {
  args: { limit: 3 },
}
