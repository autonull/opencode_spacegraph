import { createRoot, createSignal } from "solid-js"
export type SessionGraphLayout = ReturnType<typeof createSessionGraphLayout>
function createSessionGraphLayout() {
  // App-lifetime state: one root per session layout, with no owner to dispose it.
  return createRoot(() => {
    const [map, setMap] = createSignal(false)
    const [sideBySide, setSideBySide] = createSignal(false)
    return { map, sideBySide, setMap, setSideBySide }
  })!
}
const layouts = new Map<string, SessionGraphLayout>()
/** One graph layout per routed session, shared by the header toggle and the map surface. */
export function graphLayoutFor(key: string): SessionGraphLayout {
  let layout = layouts.get(key)
  if (!layout) {
    layout = createSessionGraphLayout()
    layouts.set(key, layout)
  }
  return layout
}
