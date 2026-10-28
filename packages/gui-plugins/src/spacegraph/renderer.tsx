import { createSignal, lazy, onCleanup, onMount, Suspense } from "solid-js"
import {
  Command,
  createKeyed,
  MenuItem,
  Panel,
  SessionSurface,
  SettingsPage,
  type PanelTab,
  type Plugin,
} from "@opencode/plugin/gui"
import { onIdle } from "@opencode/plugin/gui/builtin"
import { LAYOUT_STRATEGIES } from "@opencode/session-ui/graph"
import type definition from "./index"
import { createSpacegraph } from "./model"
import { MapSurface } from "./map-surface"
import { HybridSurface } from "./hybrid-surface"
import { TurnMapLayer } from "./turn-map-layer"

const setup: Plugin.Setup<typeof definition> = (ctx) => {
  const SpacegraphPanel = lazy(() => import("./panel"))
  const SpacegraphSettings = lazy(() => import("./settings"))
  onCleanup(onIdle(() => void SpacegraphPanel.preload()))

  const model = createSpacegraph(ctx)

  const tab: PanelTab = {
    id: "map",
    get title() {
      return ctx.t("panel.title")
    },
    draggable: false,
    closable: "compact",
  }

  const select = (id: string) => {
    const session = ctx.sessions.current()

    if (session) model.select(session, id)
  }

  const [hash, setHash] = createSignal(location.hash)
  onMount(() => {
    const update = () => setHash(location.hash)

    window.addEventListener("hashchange", update)
    onCleanup(() => window.removeEventListener("hashchange", update))
  })

  const linked = () => {
    const value = hash().startsWith("#graph:") ? hash().slice("#graph:".length) : undefined

    if (!value) return undefined

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
        ctx.surfaces.select(`${ctx.id}.map`, session)

        return
      }

      const surface = model.surface(session)

      if (surface) ctx.surfaces.select(surface, session)
    },
  )

  ctx.add(SessionSurface, {
    id: `${ctx.id}.map`,
    title: ctx.t("surface.map"),
    order: 10,
    render: ({ session, screen, transcript }) => (
      <MapSurface model={model} session={session} screen={screen} transcript={transcript} />
    ),
    layers: [
      {
        id: "turn-map",
        render: ({ session, screen, surface }) => (
          <TurnMapLayer model={model} session={session} screen={screen} surface={surface} />
        ),
      },
    ],
  })

  ctx.add(SessionSurface, {
    id: `${ctx.id}.hybrid`,
    title: ctx.t("surface.hybrid"),
    order: 20,
    render: ({ session, screen, transcript }) => (
      <HybridSurface model={model} session={session} screen={screen} transcript={transcript} />
    ),
  })

  ctx.add(Command, (): Command | undefined => {
    if (!ctx.sessions.current()) return undefined

    return {
      id: "map",
      title: ctx.t("command.map"),
      group: ctx.t("command.group"),
      run: () => select(`${ctx.id}.map`),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    if (!ctx.sessions.current()) return undefined

    return {
      id: "hybrid",
      title: ctx.t("command.hybrid"),
      group: ctx.t("command.group"),
      run: () => select(`${ctx.id}.hybrid`),
    }
  })


  ctx.add(SettingsPage, {
    id: `${ctx.id}.map`,
    title: ctx.t("settings.title"),
    icon: "branch-out",
    entries: [{ id: "map", title: ctx.t("settings.title"), description: ctx.t("settings.description") }],
    render: () => (
      <Suspense>
        <SpacegraphSettings />
      </Suspense>
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

      if (session) ctx.layout.open(`${ctx.id}:map`, session, { tab: "select" })
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
      <Suspense>
        <SpacegraphPanel model={model} session={input.session} screen={input.screen} />
      </Suspense>
    ),
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()
    const node = session ? model.focused(session) : undefined

    if (!session || !node) return undefined

    return {
      id: "permalink",
      title: ctx.t("command.permalink"),
      group: ctx.t("command.group"),
      run: () => {
        location.hash = `graph:${model.layout(session)}:${node}`
        void ctx.system.copy(location.href)
      },
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "export",
      title: ctx.t("command.export"),
      group: ctx.t("command.group"),
      run: async () => {
        const { buildGraph } = await import("@opencode/session-ui/graph")

        const status =
          session.server.data.session.status(session.id) === "running" ? { type: "busy" as const } : { type: "idle" as const }

        const graph = buildGraph({ messages: session.server.data.session.message.list(session.id), status })

        await ctx.system.save({
          name: `spacegraph-${session.id}.json`,
          content: JSON.stringify(
            { root: graph.root, nodes: graph.nodes, edges: graph.edges, turns: graph.turns },
            null,
            2,
          ),
        })
      },
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "export-svg",
      title: ctx.t("command.exportSvg"),
      group: ctx.t("command.group"),
      run: async () => {
        ctx.surfaces.select(`${ctx.id}.map`, session)
        await new Promise((resolve) => requestAnimationFrame(resolve))
        await new Promise((resolve) => requestAnimationFrame(resolve))

        const svg = document.querySelector('[data-slot="spacegraph-map"] svg')

        if (!(svg instanceof SVGSVGElement)) return

        const clone = svg.cloneNode(true)

        if (!(clone instanceof SVGSVGElement)) return
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
        clone.setAttribute("width", "1200")
        clone.setAttribute("height", "800")

        await ctx.system.save({
          name: `spacegraph-${session.id}.svg`,
          content: new XMLSerializer().serializeToString(clone),
        })
      },
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "export-html",
      title: ctx.t("command.exportHtml"),
      group: ctx.t("command.group"),
      run: async () => {
        ctx.surfaces.select(`${ctx.id}.map`, session)
        await new Promise((resolve) => requestAnimationFrame(resolve))
        await new Promise((resolve) => requestAnimationFrame(resolve))

        const svg = document.querySelector('[data-slot="spacegraph-map"] svg')

        if (!(svg instanceof SVGSVGElement)) return

        const markup = new XMLSerializer().serializeToString(svg)
        const content = `<!doctype html><html><head><meta charset="utf-8"><title>Spacegraph</title><style>body{margin:0;background:#111;color:#eee}svg{display:block;width:100vw;height:100vh}</style></head><body>${markup}</body></html>`

        await ctx.system.save({ name: `spacegraph-${session.id}.html`, content })
      },
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "level",
      title: ctx.t("command.level"),
      group: ctx.t("command.group"),
      run: () => model.cycleLevel(session),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "layout",
      title: ctx.t("command.layout"),
      group: ctx.t("command.group"),
      run: () => model.cycleLayout(session),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "arrangement",
      title: ctx.t("command.arrangement"),
      group: ctx.t("command.group"),
      run: () => model.cycleArrangement(session),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "side",
      title: ctx.t("command.side"),
      group: ctx.t("command.group"),
      run: () => model.toggleSide(session),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "turn-map",
      title: ctx.t("command.turnMap"),
      group: ctx.t("command.group"),
      run: () => {
        const opening = !model.turnMap(session)

        model.toggleTurnMap(session)

        if (opening && ctx.surfaces.current(session) !== `${ctx.id}.map`) {
          ctx.surfaces.select(`${ctx.id}.map`, session)
        }
      },
    }
  })

  ctx.add(Command, (): Command | undefined => {
    if (!ctx.sessions.current()) return undefined

    return {
      id: "transcript",
      title: ctx.t("command.transcript"),
      group: ctx.t("command.group"),
      run: () => select("transcript"),
    }
  })
}

export default setup
