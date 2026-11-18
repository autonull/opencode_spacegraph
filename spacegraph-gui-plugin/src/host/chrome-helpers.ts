import type { WindowState } from "@spacegraphjs/window-manager"

/** Cycles a host option list, wrapping at the end and tolerating an unknown current value. */
export function nextValue<T>(values: readonly T[], current: T): T {
  return values[(values.indexOf(current) + 1) % values.length] ?? current
}

/**
 * Focus an inspector window for a node: raise one that is already open instead of stacking a duplicate.
 * Kept pure so the window policy can be tested without mounting the chrome.
 */
export function openInspectorWindow(windows: readonly WindowState[], nodeID: string): WindowState[] {
  const top = windows.reduce((max, window) => Math.max(max, window.z), 0)
  const existing = windows.find((window) => window.kind === "inspector" && window.nodeID === nodeID)
  if (existing) return windows.map((window) => (window === existing ? { ...window, z: top + 1 } : window))
  return [...windows, {
    id: `inspector-${nodeID}`,
    kind: "inspector",
    nodeID,
    left: 24 + top * 24,
    top: 24 + top * 24,
    width: 360,
    height: 320,
    z: top + 1,
  }]
}
