import { createSignal } from "solid-js"
import type { SessionRef, SessionSurface } from "@opencode/plugin/gui"

/** The host's own surface: the session body the app renders without a plugin surface. */
export const transcriptSurfaceID = "transcript"

export function defaultSessionSurface(title: string): SessionSurface {
  return { id: transcriptSurfaceID, title, render: (input) => input.transcript }
}

const [selected, setSelected] = createSignal<Readonly<Record<string, string>>>({})

/** The surface a session has selected, keyed by `SessionRef.key` so routing away and back restores it. */
export function sessionSurfaceID(session: SessionRef) {
  return selected()[session.key] ?? transcriptSurfaceID
}

export function selectSessionSurface(id: string, session: SessionRef) {
  setSelected((current) => (current[session.key] === id ? current : { ...current, [session.key]: id }))
}

/** The host's transcript and the contributed surfaces, in display order. Contributed `transcript` entries are ignored. */
export function orderedSessionSurfaces(items: readonly SessionSurface[], transcriptTitle: string) {
  return [
    defaultSessionSurface(transcriptTitle),
    ...items
      .filter((item) => item.id !== transcriptSurfaceID)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  ]
}

/** The surface with `id`, or the host's transcript when it is gone. */
export function resolveSessionSurface(surfaces: readonly SessionSurface[], id: string) {
  return surfaces.find((surface) => surface.id === id) ?? surfaces[0]
}