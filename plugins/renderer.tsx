import {
  Command,
  createKeyed,
  MenuItem,
  Panel,
  SessionSurface,
  SettingsPage,
  type MountedSession,
  type PanelTab,
  type Plugin,
  type SetupContext,
} from "@opencode/plugin/gui"
import { createSignal, lazy, onCleanup, onMount, Suspense, type ParentProps } from "solid-js"
import { LAYOUT_STRATEGIES } from "@opencode/session-ui/graph"
import definition from "../packages/gui-plugins/src/spacegraph"
import { createSpacegraph } from "../packages/gui-plugins/src/spacegraph/model"
import { MapSurface } from "../packages/gui-plugins/src/spacegraph/map-surface"
import { HybridSurface } from "../packages/gui-plugins/src/spacegraph/hybrid-surface"
import { TurnMapLayer } from "../packages/gui-plugins/src/spacegraph/turn-map-layer"
import { MapDialog, TurnMapDialog } from "./dialogs"
import { createUiI18n, I18nContext } from "./i18n"

type Surfaces = SetupContext<typeof definition>["surfaces"]

const setup: Plugin.Setup<typeof definition> = (ctx) => {
  const i18n = createUiI18n({
    locale: () => ctx.locale.locale(),
    t: (key, params) => ctx.t(key, params),
    plural: (key, count, params) => ctx.plural(key, count, params),
  })

  const Scope = (props: ParentProps) => (
    <I18nContext.Provider value={i18n}>{props.children}</I18nContext.Provider>
  )

  const SpacegraphPanel = lazy(() => import("../packages/gui-plugins/src/spacegraph/panel"))
  const SpacegraphSettings = lazy(() => import("../packages/gui-plugins/src/spacegraph/settings"))

  const model = createSpacegraph(ctx)

  // Stock hosts may not expose session surfaces yet. When they do not, the map lives in the side panel and dialogs.
  const surfaces = () => (ctx as { surfaces?: Surfaces }).surfaces

  const openPanel = (session: MountedSession | undefined) => {
    if (session) ctx.layout.open(`${ctx.id}:map`, session, { tab: "select" })
  }

  const select = (id: string) => {
    const session = ctx.sessions.current()

    if (!session) return

    if (surfaces()) {
      model.select(session, id)
      return
    }

    openPanel(session)
  }

  const tab: PanelTab = {
    id: "map",
    get title() {
      return ctx.t("panel.title")
    },
    draggable: false,
    closable: "compact",
  }

  const openMapDialog = (session: MountedSession, title: string) => {
    const screen = ctx.screen.current()

    if (!screen) {
      openPanel(session)
      return
    }

    ctx.dialogs.open(() => (
      <Scope>
        <MapDialog ctx={ctx} model={model} session={session} screen={screen} title={title} />
      </Scope>
    ))
  }

  const openTurnMap = (session: MountedSession) => {
    const screen = ctx.screen.current()

    if (!screen) return

    const dialog = ctx.dialogs.open(() => (
      <Scope>
        <TurnMapDialog
          ctx={ctx}
          session={session}
          screen={screen}
          labels={{
            title: ctx.t("turnMap.title"),
            open: ctx.t("turnMap.open"),
            empty: ctx.t("turnMap.empty"),
          }}
          openFull={() => {
            dialog.close()
            openPanel(session)
          }}
        />
      </Scope>
    ))
  }

  const [hash, setHash] = createSignal(location.hash)
  onMount(() => {
    const update = () => setHash(location.hash)

    window.addEventListener("hashchange", update)
    onCleanup(() => window.removeEventListener("hashchange", update))
  })

  const linked = () => {
    const prefix = hash().startsWith("#spacegraph:") ? "#spacegraph:" : hash().startsWith("#graph:") ? "#graph:" : undefined

    if (!prefix) return undefined

    const value = hash().slice(prefix.length)
    const [head, ...rest] = value.split(":")
    const layout = LAYOUT_STRATEGIES.find((candidate) => candidate === head)

    if (rest.length && layout) return { layout, node: rest.join(":") }

    return { node: value }
  }

  createKeyed(
    () => {
      const session = ctx.sessions.current()

      return session ? `${session.key}\u0000${model.surface(session) ?? ""}\u0000${hash()}` : undefined
    },
    () => {
      const session = ctx.sessions.current()

      if (!session) return

      const link = linked()

      if (link) {
        if (link.layout) model.setLayout(session, link.layout)
        model.focus(session, link.node)
        select(`${ctx.id}.map`)

        return
      }

      const surface = model.surface(session)

      if (surface && surfaces()) surfaces()!.select(surface, session)
    },
  )

  if (surfaces()) {
    ctx.add(SessionSurface, {
      id: `${ctx.id}.map`,
      get title() {
        return ctx.t("surface.map")
      },
      order: 10,
      render: ({ session, screen, transcript }) => (
        <Scope>
          <MapSurface
            model={model}
            session={session}
            screen={screen}
            transcript={transcript}
            onSplitView={() => select(`${ctx.id}.hybrid`)}
          />
        </Scope>
      ),
      layers: [
        {
          id: "turn-map",
          render: ({ session, screen, surface }) => (
            <Scope>
              <TurnMapLayer
                model={model}
                session={session}
                screen={screen}
                surface={surface}
                openFull={() => select(`${ctx.id}.map`)}
                labels={{
                  title: ctx.t("turnMap.title"),
                  open: ctx.t("turnMap.open"),
                  close: ctx.t("turnMap.close"),
                  empty: ctx.t("turnMap.empty"),
                }}
              />
            </Scope>
          ),
        },
      ],
    })

    ctx.add(SessionSurface, {
      id: `${ctx.id}.hybrid`,
      get title() {
        return ctx.t("surface.hybrid")
      },
      order: 20,
      render: ({ session, screen }) => (
        <Scope>
          <HybridSurface model={model} session={session} screen={screen} t={ctx.t} />
        </Scope>
      ),
    })
  }

  ctx.add(Command, (): Command | undefined => {
    if (!ctx.sessions.current()) return undefined

    return {
      id: "map",
      get title() {
        return ctx.t("command.map")
      },
      get group() {
        return ctx.t("command.group")
      },
      bind: "mod+shift+m",
      section: "session",
      run: () => select(`${ctx.id}.map`),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "hybrid",
      get title() {
        return ctx.t("command.hybrid")
      },
      get group() {
        return ctx.t("command.group")
      },
      bind: "mod+shift+h",
      section: "session",
      run: () => (surfaces() ? select(`${ctx.id}.hybrid`) : openMapDialog(session, ctx.t("surface.hybrid"))),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    if (!ctx.sessions.current() || !surfaces()) return undefined

    return {
      id: "transcript",
      get title() {
        return ctx.t("command.transcript")
      },
      get group() {
        return ctx.t("command.group")
      },
      bind: "mod+shift+t",
      section: "session",
      run: () => select("transcript"),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "permalink",
      get title() {
        return ctx.t("command.permalink")
      },
      get group() {
        return ctx.t("command.group")
      },
      section: "session",
      run: () => {
        const node = model.focused(session)

        if (!node) return

        location.hash = `spacegraph:${model.layout(session)}:${node}`
        void ctx.system.copy(location.href)
      },
    }
  })

  for (const command of [
    { id: "level", bind: "mod+shift+k", title: "command.level", run: (session: MountedSession) => model.cycleLevel(session) },
    { id: "layout", bind: "mod+shift+l", title: "command.layout", run: (session: MountedSession) => model.cycleLayout(session) },
    { id: "arrangement", bind: "mod+shift+a", title: "command.arrangement", run: (session: MountedSession) => model.cycleArrangement(session) },
    { id: "side", bind: "mod+shift+s", title: "command.side", run: (session: MountedSession) => model.toggleSide(session) },
  ] as const) {
    ctx.add(Command, (): Command | undefined => {
      const session = ctx.sessions.current()

      if (!session) return undefined

      return {
        id: command.id,
        get title() {
          return ctx.t(command.title)
        },
        get group() {
          return ctx.t("command.group")
        },
        bind: command.bind,
        section: "session",
        run: () => command.run(session),
      }
    })
  }

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "turn-map",
      get title() {
        return ctx.t("command.turnMap")
      },
      get group() {
        return ctx.t("command.group")
      },
      bind: "mod+t",
      section: "session",
      run: () => {
        if (!surfaces()) {
          openTurnMap(session)
          return
        }

        const opening = !model.turnMap(session)
        model.toggleTurnMap(session)

        if (opening && surfaces()!.current(session) !== `${ctx.id}.map`) select(`${ctx.id}.map`)
      },
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "export-svg",
      get title() {
        return ctx.t("command.exportSvg")
      },
      get group() {
        return ctx.t("command.group")
      },
      run: () => model.export(session, "svg"),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "export-json",
      get title() {
        return ctx.t("command.exportJson")
      },
      get group() {
        return ctx.t("command.group")
      },
      run: () => model.export(session, "json"),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "export-html",
      get title() {
        return ctx.t("command.exportHtml")
      },
      get group() {
        return ctx.t("command.group")
      },
      run: () => model.export(session, "html"),
    }
  })

  ctx.add(SettingsPage, {
    id: `${ctx.id}.map`,
    get title() {
      return ctx.t("settings.title")
    },
    icon: "branch-out",
    entries: [
      {
        id: "map",
        get title() {
          return ctx.t("settings.title")
        },
        get description() {
          return ctx.t("settings.description")
        },
      },
    ],
    render: () => (
      <Scope>
        <Suspense>
          <SpacegraphSettings />
        </Suspense>
      </Scope>
    ),
  })

  ctx.add(MenuItem, {
    menu: "session.panel",
    id: "open",
    get title() {
      return ctx.t("menu.open")
    },
    icon: "branch-out",
    order: 31,
    run() {
      const session = ctx.sessions.current()

      if (session) openPanel(session)
    },
  })

  ctx.add(Panel, {
    id: "map",
    region: "side",
    mobile: {
      get title() {
        return ctx.t("panel.title")
      },
      order: 51,
      kind: "menu",
      icon: "branch-out",
    },
    list: (input) => (input.open.includes("map") ? [tab] : []),
    render: (input) => (
      <Scope>
        <Suspense>
          <SpacegraphPanel model={model} session={input.session} screen={input.screen} />
        </Suspense>
      </Scope>
    ),
  })
}

export default setup
