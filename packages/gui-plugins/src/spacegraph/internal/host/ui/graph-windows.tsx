import type { JSX } from "solid-js"
import type { GraphWindowState } from "./GraphWindows"

/**
 * A kind of window over the map. The manager moves, resizes and stacks windows; it holds no
 * content. The *kinds* are the host's: this list is the registry that says which kinds exist and
 * what each one shows, so a new kind — the minimap, the equalizer — is one entry here.
 */
export type GraphWindowKind = {
  /** The kind's name; it rides with the window, so it survives a reload. */
  name: string
  /** The window's title. */
  title: (window: GraphWindowState) => string
  /** The window's body. */
  render: (window: GraphWindowState) => JSX.Element
}

/**
 * T12 — the first placement a window gets. A window lives in the canvas region, so the view knows
 * how much room there is; the host persists what the reader does with it afterwards.
 */
export function proposeWindow(
  kind: string,
  nodeID: string | undefined,
  options: { canvas: { width: number; height: number }; windows: readonly GraphWindowState[] },
): GraphWindowState {
  const size = options.canvas
  const windows = options.windows
  const width = Math.min(360, Math.max(240, size.width - 48))
  const height = Math.min(320, Math.max(160, size.height - 48))
  const offset = 24 + windows.length * 24

  return {
    id: `${kind}:${nodeID ?? windows.length}`,
    kind,
    nodeID,
    left: Math.max(0, Math.min(offset, Math.max(0, size.width - width))),
    top: Math.max(0, Math.min(offset, Math.max(0, size.height - height))),
    width,
    height,
    z: windows.reduce((highest, window) => Math.max(highest, window.z), 0) + 1,
  }
}

/** The kind a window names, or undefined when the host does not offer it. */
export function windowKind(kinds: readonly GraphWindowKind[], window: GraphWindowState) {
  return kinds.find((kind) => kind.name === window.kind)
}
