import { createStore } from "solid-js/store"
import { createSignal } from "solid-js"

export interface ManualPositions {
  positions: Record<string, [number, number, number]>
  sizes: Record<string, [number, number]>
}

export interface ManualPositionsState extends ManualPositions {
  history: ManualPositions[]
  future: ManualPositions[]
}

const MAX_HISTORY = 50

export function createManualPositions(initial?: ManualPositions) {
  const [manual, setManual] = createStore<ManualPositions>({
    positions: initial?.positions ?? {},
    sizes: initial?.sizes ?? {},
  })

  const [history, setHistory] = createSignal<ManualPositions[]>([])
  const [future, setFuture] = createSignal<ManualPositions[]>([])

  const captureManualState = () => ({
    positions: { ...manual.positions },
    sizes: { ...manual.sizes },
  })

  const pushHistory = () => {
    const captured = captureManualState()
    if (Object.keys(captured.positions).length > 0 || Object.keys(captured.sizes).length > 0) {
      setHistory((h: ManualPositions[]) => {
        const next = [...h, captured]
        if (next.length > MAX_HISTORY) next.shift()
        return next
      })
      setFuture([])
    }
  }

  const undoManual = () => {
    setHistory((h: ManualPositions[]) => {
      if (h.length === 0) return h
      const previous = h[h.length - 1]
      setFuture((f: ManualPositions[]) => {
        const next = [captureManualState(), ...f]
        if (next.length > MAX_HISTORY) next.pop()
        return next
      })
      setManual("positions", previous.positions)
      setManual("sizes", previous.sizes)
      return h.slice(0, -1)
    })
  }

  const redoManual = () => {
    setFuture((f: ManualPositions[]) => {
      if (f.length === 0) return f
      const next = f[0]
      setHistory((h: ManualPositions[]) => {
        const nextH = [...h, captureManualState()]
        if (nextH.length > MAX_HISTORY) nextH.shift()
        return nextH
      })
      setManual("positions", next.positions)
      setManual("sizes", next.sizes)
      return f.slice(1)
    })
  }

  const moveNodes = (nodes: readonly { id: string; position: [number, number, number] }[]) => {
    const hasChanges = nodes.some((n) => manual.positions[n.id] && manual.positions[n.id] !== n.position)
    if (hasChanges) pushHistory()
    for (const node of nodes) setManual("positions", node.id, node.position)
  }

  const resizeNode = (resize: { id: string; size: [number, number]; position: [number, number, number] }) => {
    const hasChanges = manual.positions[resize.id] && manual.positions[resize.id] !== resize.position
    if (hasChanges) pushHistory()
    setManual("positions", resize.id, resize.position)
    setManual("sizes", resize.id, resize.size)
  }

  return {
    manual,
    setManual,
    history,
    future,
    pushHistory,
    undoManual,
    redoManual,
    moveNodes,
    resizeNode,
  }
}