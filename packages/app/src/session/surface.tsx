import { For, Show, createEffect, createMemo, on, onCleanup, untrack, type Accessor, type JSX } from "solid-js"
import { IconButton } from "@opencode/ui/icon-button"
import { Icon } from "@opencode/ui/icon"
import { Menu } from "@opencode/ui/menu"
import { Tooltip } from "@opencode/ui/tooltip"
import { SessionSurface, type MountedSession, type SessionScreen } from "@opencode/plugin/gui"
import { useLanguage } from "@/runtime/i18n/language"
import { usePluginHost } from "@/runtime/plugin/host"
import {
  orderedSessionSurfaces,
  resolveSessionSurface,
  sessionSurfaceID,
  selectSessionSurface,
  transcriptSurfaceID,
} from "@/runtime/plugin/surfaces"

function contributed(host: ReturnType<typeof usePluginHost>, transcriptTitle: string) {
  return orderedSessionSurfaces(
    host.items(SessionSurface).map((item) => item.value),
    transcriptTitle,
  )
}

/** Renders the selected session surface, keeping the transcript mounted while surfaces switch. */
export function SessionSurfaceHost(props: {
  session: MountedSession
  screen: SessionScreen
  transcript: (active: Accessor<boolean>) => JSX.Element
}) {
  const host = usePluginHost()
  const language = useLanguage()

  const surfaces = createMemo(() => contributed(host, language.t("session.surface.transcript")))
  const surface = createMemo(() => resolveSessionSurface(surfaces(), sessionSurfaceID(props.session)))
  const custom = createMemo(() => (surface().id === transcriptSurfaceID ? undefined : surface()))
  // Construct the transcript once: reading `custom` here would rebuild the element on every surface switch, so the
  // virtualizer and scroll position would be lost. The `active` accessor still reads the current value when called.
  const transcript = createMemo(() => untrack(() => props.transcript(() => !custom())))
  const scroll = new Map<Element, { top: number; left: number }>()

  createEffect(() => {
    const node = transcript()

    if (!(node instanceof Element)) return

    const record = (event: Event) => {
      if (!(event.target instanceof Element)) return
      scroll.set(event.target, { top: event.target.scrollTop, left: event.target.scrollLeft })
    }

    node.addEventListener("scroll", record, true)
    onCleanup(() => node.removeEventListener("scroll", record, true))
  })

  // Moving the transcript between surfaces resets its scroll containers, so restore the positions they reported.
  createEffect(
    on(
      () => surface().id,
      () => {
        const entries = [...scroll]

        if (!entries.length) return

        requestAnimationFrame(() => {
          for (const [element, position] of entries) {
            element.scrollTop = position.top
            element.scrollLeft = position.left
          }
        })
      },
      { defer: true },
    ),
  )

  const content = createMemo(() =>
    custom()?.render({ session: props.session, screen: props.screen, transcript: transcript() }),
  )

  return (
    <>
      {/* Kept in one stable container: moving the live transcript between branches of a Show makes Solid reconcile a
          node that is an ancestor of its new parent, and destroys the timeline's scroll position. */}
      <div data-slot="session-graph-panel-log" style={{ display: "contents" }}>
        <div data-slot="session-transcript" style={{ display: custom() ? "none" : "contents" }}>
          {transcript()}
        </div>
      </div>
      <Show when={custom()}>
        <div class="flex h-full min-h-0 flex-col">{content()}</div>
      </Show>
      <For each={custom()?.layers ?? []}>
        {(layer) => layer.render({ session: props.session, screen: props.screen, surface: custom()! })}
      </For>
    </>
  )
}

/** Picks the host transcript or a surface a plugin contributed to the session. */
export function SessionSurfacePicker(props: { session: MountedSession }) {
  const host = usePluginHost()
  const language = useLanguage()
  const surfaces = createMemo(() => contributed(host, language.t("session.surface.transcript")))
  const current = () => sessionSurfaceID(props.session)

  return (
    <Show when={surfaces().length > 1}>
      <Tooltip value={language.t("session.view.select")}>
        <Menu gutter={6} placement="bottom-end">
          <Menu.Trigger
            as={IconButton}
            type="button"
            icon={<Icon name="dot-grid" />}
            variant="ghost-muted"
            size="large"
            aria-label={language.t("session.view.select")}
          />
          <Menu.Portal>
            <Menu.Content style={{ "min-width": "180px" }}>
              <Menu.RadioGroup value={current()} onChange={(id) => selectSessionSurface(id, props.session)}>
                <For each={surfaces()}>
                  {(surface) => (
                    <Menu.RadioItem value={surface.id} closeOnSelect>
                      {surface.title}
                    </Menu.RadioItem>
                  )}
                </For>
              </Menu.RadioGroup>
            </Menu.Content>
          </Menu.Portal>
        </Menu>
      </Tooltip>
    </Show>
  )
}
