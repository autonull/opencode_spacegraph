import { For, createMemo, type Accessor, type JSX } from "solid-js"
import { SessionSurface, type MountedSession, type SessionScreen } from "@opencode/plugin/gui"
import { usePluginHost } from "@/runtime/plugin/host"
import {
  orderedSessionSurfaces,
  resolveSessionSurface,
  sessionSurfaceID,
  transcriptSurfaceID,
} from "@/runtime/plugin/surfaces"

/**
 * The session body: the selected plugin surface, or the app's own transcript-map pane while the built-in plugin has
 * not registered a surface yet. The transcript element is created once and moves with the selection.
 */
export function SessionSurfaceHost(props: {
  session: MountedSession
  screen: SessionScreen
  transcript: (active: Accessor<boolean>) => JSX.Element
  default: () => JSX.Element
}) {
  const host = usePluginHost()
  const surfaces = createMemo(() => orderedSessionSurfaces(host.items(SessionSurface).map((item) => item.value)))
  const surface = createMemo(() => resolveSessionSurface(surfaces(), sessionSurfaceID(props.session)))
  const custom = createMemo(() => (surface().id === transcriptSurfaceID ? undefined : surface()))
  const transcript = createMemo(() => props.transcript(() => true))
  const content = createMemo(() => {
    const selected = custom()

    if (!selected) return props.default()

    return selected.render({ session: props.session, screen: props.screen, transcript: transcript() })
  })

  return (
    <>
      {content()}
      <For each={custom()?.layers ?? []}>
        {(layer) => layer.render({ session: props.session, screen: props.screen, surface: custom() ?? surface() })}
      </For>
    </>
  )
}
