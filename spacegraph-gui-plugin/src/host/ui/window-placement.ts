import type { WindowState } from "@spacegraphjs/window-manager"

export type WindowKind = {
  name: string
  title: (window: WindowState) => string
  render: (window: WindowState) => unknown
}

/** The first placement a window gets, clamped to the canvas region and stacked above its peers. */
export function proposeWindow(
  kind: string,
  nodeID: string | undefined,
  options: { canvas: { width: number; height: number }; windows: readonly WindowState[] },
): WindowState {
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
export function windowKind(kinds: readonly WindowKind[], window: WindowState) {
  return kinds.find((kind) => kind.name === window.kind)
}

/** Screen positions of pinned windows' nodes, so a pinned window rides its node across a pan. */
export function pinnedAnchors(
  windows: readonly WindowState[],
  positionOf: (nodeID: string) => { x: number; y: number } | undefined,
): Map<string, { x: number; y: number }> {
  const anchors = new Map<string, { x: number; y: number }>()
  for (const window of windows) {
    if (!window.nodeID || !window.pinned) continue
    const position = positionOf(window.nodeID)
    if (position) anchors.set(window.nodeID, position)
  }
  return anchors
}
