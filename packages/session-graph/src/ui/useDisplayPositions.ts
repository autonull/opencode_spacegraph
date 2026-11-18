import { createMemo } from "solid-js"
import type { GraphLayout, Position } from "@opencode/session-ui/graph"

export function useDisplayPositions(
  geometry: () => GraphLayout | undefined,
  manual: { positions: Record<string, [number, number, number]> },
) {
  return createMemo(() => {
    const base = geometry()?.positions
    if (!base) return new Map<string, Position>()
    const positions = manual.positions ?? {}
    if (Object.keys(positions).length === 0) return base

    const result = new Map(base)
    for (const [id, position] of Object.entries(positions)) {
      result.set(id, { x: position[0], y: position[1], z: position[2] })
    }
    return result
  })
}