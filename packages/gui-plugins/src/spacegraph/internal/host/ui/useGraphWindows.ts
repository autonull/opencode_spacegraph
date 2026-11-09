import { type Accessor } from "solid-js"
import { proposeWindow } from "./graph-utils"

export interface UseGraphWindowsInput {
  canvasSize: Accessor<{ width: number; height: number }>
  windows: Accessor<readonly any[]>
  onOpenWindow: (window: any) => void
}

export interface UseGraphWindowsReturn {
  openWindow: (kind: string, nodeID?: string) => any
}

export function useGraphWindows(input: UseGraphWindowsInput): UseGraphWindowsReturn {
  const { canvasSize, windows, onOpenWindow } = input

  const openWindow = (kind: string, nodeID?: string) => {
    const window = proposeWindow(kind, nodeID, {
      canvas: canvasSize(),
      windows: windows(),
    })
    onOpenWindow(window)
    return window
  }

  return { openWindow }
}