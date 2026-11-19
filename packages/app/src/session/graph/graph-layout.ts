import { createRoot, createSignal } from "solid-js"

export type SessionGraphLayout = ReturnType<typeof createSessionGraphLayout>

const STORAGE_KEY = "opencode.global.dat:graph-surface"

type StoredLayout = { map?: boolean; sideBySide?: boolean }

function readStored(): Record<string, StoredLayout> {
  try {
    // SAFETY: a persisted layout is a plain JSON object of booleans; a bad value is caught and
    // replaced with an empty record, so only that shape is used below.
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, StoredLayout>
  } catch {
    return {}
  }
}

function createSessionGraphLayout(key: string) {
  // App-lifetime state: one root per session layout, with no owner to dispose it. The reader's
  // map/split choice survives a reload; the host's surface effect re-applies it on startup.
  const stored = readStored()[key] ?? {}

  return createRoot(() => {
    const persist = (next: StoredLayout) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readStored(), [key]: next }))
    }

    const [map, setMapValue] = createSignal(stored.map ?? false)
    const [sideBySide, setSideBySideValue] = createSignal(stored.sideBySide ?? false)

    const setMap = (value: boolean) => {
      setMapValue(value)
      persist({ map: value, sideBySide: sideBySide() })
    }

    const setSideBySide = (value: boolean) => {
      setSideBySideValue(value)
      persist({ map: map(), sideBySide: value })
    }

    return { map, sideBySide, setMap, setSideBySide }
  })!
}

const layouts = new Map<string, SessionGraphLayout>()

/** One graph layout per routed session, shared by the header toggle and the map surface. */
export function graphLayoutFor(key: string): SessionGraphLayout {
  let layout = layouts.get(key)
  if (!layout) {
    layout = createSessionGraphLayout(key)
    layouts.set(key, layout)
  }
  return layout
}
