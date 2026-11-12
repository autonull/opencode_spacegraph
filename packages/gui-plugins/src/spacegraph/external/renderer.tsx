import {
  Command,
  ComposerPill,
  createKeyed,
  MenuItem,
  Panel,
  SessionSurface,
  SettingsPage,
  Slot,
  TitlebarItem,
  type MountedSession,
  type PanelTab,
  type Plugin,
  type SetupContext,
} from "@opencode/plugin/gui"
import { createSignal, lazy, onCleanup, onMount, Show, Suspense, type ParentProps } from "solid-js"
import { LAYOUTS } from "../internal/graph"
import definition, { BUILTIN_LENSES, type BuiltinLensId } from ".."
import { createSpacegraph } from "../model"
import { MapSurface } from "../map-surface"
import { HybridSurface } from "../hybrid-surface"
import { TurnMapLayer } from "../turn-map-layer"
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

  const SpacegraphPanel = lazy(() => import("../panel"))
  const SpacegraphSettings = lazy(() => import("../settings"))

  const model = createSpacegraph(ctx)

  // Stock hosts may not expose session surfaces yet. When they do not, the map lives in the side panel and dialogs.
  // SAFETY: a stock host omits the property rather than giving it another type; every read below handles undefined.
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

  // Phase 17.3: restore last used surface when session becomes active
  const restoreSurface = (session: MountedSession) => {
    if (!surfaces()) return

    const storedSurface = model.surface(session)
    // Valid surfaces: transcript, ${ctx.id}.map, ${ctx.id}.hybrid
    const validSurfaces = ["transcript", `${ctx.id}.map`, `${ctx.id}.hybrid`]

    if (storedSurface && validSurfaces.includes(storedSurface)) {
      // Surface is stored, select it
      ctx.surfaces.select(storedSurface, session)
    } else {
      // No valid stored surface, default to transcript
      ctx.surfaces.select("transcript", session)
    }
  }

  // Restore surface on mount
  onMount(() => {
    const session = ctx.sessions.current()
    if (session) {
      // Small delay to let surfaces register
      setTimeout(() => restoreSurface(session), 0)
    }
  })

  // Phase 17.2: reveal from graph - switch to transcript surface first, then reveal
  const handleOpenTranscript = (messageId: string) => {
    const session = ctx.sessions.current()
    if (!session) return

    // If surfaces are available, switch to transcript surface first
    if (surfaces()) {
      select("transcript")
    }

    // Then reveal the message in the transcript
    const screen = ctx.screen.current()
    if (screen) {
      screen.transcript.reveal(messageId)
    }
  }

  // M5.2: failures are announced as a toast (no sound) once per newly seen failure node.
  const AttentionWatch = (props: { session: MountedSession }) => {
    const seen = new Set<string>()
    let primed = false
    createKeyed(
      () => (model.attentionEnabled() ? model.attention(props.session).ids.join("|") : ""),
      () => {
        if (!model.attentionEnabled()) return
        const signal = model.attention(props.session)
        if (!primed) {
          for (const id of signal.ids) seen.add(id)
          primed = true
          return
        }
        const fresh = signal.ids.filter((id) => !seen.has(id))
        if (fresh.length === 0) return
        for (const id of fresh) seen.add(id)
        ctx.toast.show({
          variant: "error",
          title: ctx.t("ui.sessionGraph.attention.toastTitle"),
          description: signal.latest?.label ?? ctx.t("ui.sessionGraph.attention.toastDescription"),
        })
      },
    )
    return null
  }

  // Phase 16.3: session.header slot - "Map this turn" toggle
  ctx.add(Slot, {
    at: "session.header",
    order: 30,
    render: (input: { session: import("@opencode/plugin/gui").MountedSession }) => {
      const signal = () => (model.attentionEnabled() ? model.attention(input.session) : undefined)
      return (
        <div class="flex items-center gap-2" data-slot="session-header-graph-toggle">
          <AttentionWatch session={input.session} />
          <button
            type="button"
            class="text-13-regular leading-[var(--line-height-compact)] text-v2-text-text-muted hover:text-v2-text-text-base transition-colors"
            onClick={() => select(`${ctx.id}.map`)}
            title={ctx.t("session.header.mapTurn.tooltip")}
            aria-label={ctx.t("session.header.mapTurn.tooltip")}
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M4 4h8v8H4V4zm1 1v6h6V5H5zm5 5H6v-1h4v1z" />
            </svg>
            <span>{ctx.t("session.header.mapTurn.label")}</span>
          </button>
          <Show when={(signal()?.count ?? 0) > 0}>
            <span
              data-slot="session-header-graph-failures"
              class="rounded-full bg-v2-state-bg-danger px-1.5 text-11-medium text-v2-state-fg-danger"
              title={ctx.t("ui.sessionGraph.attention.title")}
            >
              {signal()?.count}
            </span>
          </Show>
        </div>
      )
    },
  })

  const tab: PanelTab = {
    id: "map",
    get title() {
      return ctx.t("panel.title")
    },
    draggable: false,
    closable: "compact",
  }

  // Phase 16.3: ComposerPill - "Map this turn" action for active turn
  ctx.add(ComposerPill, {
    id: "map-turn",
    show: (input: { session: import("@opencode/plugin/gui").MountedSession }) => {
      const session = input.session
      if (!session) return undefined

      // Show only when there's an active turn to map
      // We can check if there are messages in the session
      const messages = session.server.data.session.message.list(session.id)
      if (!messages.length) return undefined

      const count = model.attentionEnabled() ? model.attention(session).count : 0

      return {
        label: count > 0 ? `${ctx.t("session.header.mapTurn.label")} (${count})` : ctx.t("session.header.mapTurn.label"),
        icon: "branch-out" as const,
        tone: count > 0 ? ("danger" as const) : ("success" as const),
        run: () => select(`${ctx.id}.map`),
      }
    },
  })

  // M5.2: a titlebar pill for a session with failures; the toast is the quieter channel.
  ctx.add(TitlebarItem, () => {
    if (!model.attentionEnabled()) return
    const session = ctx.sessions.current()
    if (!session) return
    const signal = model.attention(session)
    if (!signal.latest) return

    return {
      id: "graph-failures",
      label: ctx.plural("ui.sessionGraph.attention", signal.count),
      title: ctx.t("ui.sessionGraph.attention.titlebar"),
      icon: "outline-hexagonal-warning" as const,
      run: () => {
        model.focus(session, signal.latest?.nodeID)
        select(`${ctx.id}.map`)
      },
    }
  })

  const openMapDialog = (session: MountedSession, title: string) => {
    const screen = ctx.screen.current()

    if (!screen) {
      openPanel(session)

      return
    }

    ctx.dialogs.open(() => (
      <Scope>
        <MapDialog
          ctx={ctx}
          model={model}
          session={session}
          screen={screen}
          title={title}
          onOpenTranscript={handleOpenTranscript}
        />
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
          model={model}
          session={session}
          screen={screen}
          labels={{
            title: ctx.t("turnMap.title"),
            open: ctx.t("turnMap.open"),
            close: ctx.t("turnMap.close"),
            empty: ctx.t("turnMap.empty"),
          }}
          openFull={() => {
            dialog.close()
            openPanel(session)
          }}
          onOpenTranscript={handleOpenTranscript}
        />
      </Scope>
    ))
  }

  const [hash, setHash] = createSignal(location.hash)

  const linked = () => {
    const prefix = hash().startsWith("#spacegraph:") ? "#spacegraph:" : hash().startsWith("#graph:") ? "#graph:" : undefined

    if (!prefix) return undefined

    const value = hash().slice(prefix.length)
    const [head, ...rest] = value.split(":")
    // Check both layout strategies (node-link) and summary layouts (ribbon, matrix)
    const layout = LAYOUTS.find((candidate: string) => candidate === head)

    if (rest.length && layout) return { layout, node: rest.join(":") }

    return { node: value }
  }

  // Handle hash links on mount and on hashchange — avoid createKeyed/createEffect
  // which caused synchronous reactive loops (Maximum call stack size exceeded).
  const handleLink = () => {
    const session = ctx.sessions.current()
    if (!session) return

    const link = linked()
    if (link) {
      if (link.layout) model.setLayout(session, link.layout)
      model.focus(session, link.node)
      select(`${ctx.id}.map`)
    }
  }

  // Process initial hash on mount
  onMount(handleLink)

  // Process hash changes
  onMount(() => {
    const update = () => {
      setHash(location.hash)
      handleLink()
    }

    window.addEventListener("hashchange", update)
    onCleanup(() => window.removeEventListener("hashchange", update))
  })

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
            onSplitView={() => select(`${ctx.id}.hybrid`)}
            onOpenTranscript={handleOpenTranscript}
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
                onOpenTranscript={handleOpenTranscript}
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
      render: ({ session, screen, transcript }) => (
        <Scope>
          <HybridSurface
            model={model}
            session={session}
            screen={screen}
            transcript={transcript}
            onOpenTranscript={handleOpenTranscript}
          />
        </Scope>
      ),
    })

    // Phase 16.2: Graph transcript surface (flag-gated)
    if (surfaces() && ctx.flags.enabled("graph_surface_transcript")) {
      const GraphTranscriptSurface = lazy(() =>
        import("@opencode/session-graph/ui/GraphTranscriptSurface").then((m) => ({ default: m.GraphTranscriptSurface }))
      )
      ctx.add(SessionSurface, {
        id: `${ctx.id}.transcript-graph`,
        get title() {
          return ctx.t("surface.transcriptGraph")
        },
        order: 5,
        render: ({ session }) => (
          <Scope>
            <GraphTranscriptSurface
              model={model.graph(session)()}
              session={session}
              density={model.density()}
              notes={model.notes(session)}
              onNotesChange={(notes) => model.setNotes(session, notes)}
              pins={model.pins(session)}
              onPinsChange={(pins) => model.setPins(session, pins)}
              onOpenTranscript={handleOpenTranscript}
              onTurnExpand={(turnID) => {
                // Expand is handled by the inline graph toggle
              }}
              onTurnWhy={(turnID) => {
                // Open the why panel/popover for this turn
                model.focus(session, turnID)
                model.setDetailMode(session, "popover")
              }}
              onTurnExpandDelegation={(turnID) => {
                // Expand delegation - focus the turn and open detail
                model.focus(session, turnID)
                model.setDetailMode(session, "popover")
              }}
              onTurnSubagent={(turnID, subagentID) => {
                // Open subagent map
                model.focus(session, subagentID)
                model.setDetailMode(session, "popover")
              }}
              onTurnShare={(turnID, layout, nodeID) => {
                // Permalink copied - could show a toast
                const permalink = `#spacegraph:${layout}:${nodeID}`
                navigator.clipboard.writeText(permalink)
              }}
            />
          </Scope>
        ),
      })
    }
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
    if (!ctx.sessions.current() || !surfaces()) return undefined

    return {
      id: "transcript-graph",
      get title() {
        return ctx.t("command.transcriptGraph")
      },
      get group() {
        return ctx.t("command.group")
      },
      section: "session",
      run: () => select(`${ctx.id}.transcript-graph`),
    }
  })

  // graph.hybrid - toggle hybrid view (transcript + map)
  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session || !surfaces()) return undefined

    return {
      id: "graph.hybrid",
      get title() {
        return ctx.t("command.graph.hybrid")
      },
      get group() {
        return ctx.t("command.group")
      },
      section: "session",
      run: () => select(`${ctx.id}.hybrid`),
    }
  })

  // graph.toggle - toggle between transcript and map
  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session || !surfaces()) return undefined

    return {
      id: "graph.toggle",
      get title() {
        return ctx.t("command.graph.toggle")
      },
      get group() {
        return ctx.t("command.group")
      },
      section: "session",
      run: () => {
        const available = surfaces()
        if (!available) return
        const current = available.current(session)
        if (current === `${ctx.id}.map`) {
          select("transcript")
        } else {
          select(`${ctx.id}.map`)
        }
      },
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
    { id: "level", bind: "mod+l", title: "command.level", run: (session: MountedSession) => model.cycleLevel(session) },
    { id: "layout", bind: "mod+shift+l", title: "command.layout", run: (session: MountedSession) => model.cycleLayout(session) },
    { id: "arrangement", bind: "mod+a", title: "command.arrangement", run: (session: MountedSession) => model.cycleArrangement(session) },
    { id: "side", bind: "mod+s", title: "command.side", run: (session: MountedSession) => model.toggleSide(session) },
    { id: "search", bind: "mod+f", title: "command.search", run: (session: MountedSession) => select(`${ctx.id}.map`) },
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

  // Lens commands
  for (const lens of BUILTIN_LENSES) {
    ctx.add(Command, (): Command | undefined => {
      const session = ctx.sessions.current()

      if (!session) return undefined

      return {
        id: `lens.${lens.id}`,
        get title() {
          return ctx.t(`command.lens.${lens.id}`)
        },
        get group() {
          return ctx.t("command.group")
        },
        section: "session",
        run: () => applyLens(ctx, model, session, lens.id),
      }
    })
  }

  // Lens cycle commands
  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "lens.next",
      get title() {
        return ctx.t("command.lens.next")
      },
      get group() {
        return ctx.t("command.group")
      },
      section: "session",
      run: () => cycleLens(ctx, model, session, "next"),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    const session = ctx.sessions.current()

    if (!session) return undefined

    return {
      id: "lens.prev",
      get title() {
        return ctx.t("command.lens.prev")
      },
      get group() {
        return ctx.t("command.group")
      },
      section: "session",
      run: () => cycleLens(ctx, model, session, "prev"),
    }
  })

  // Helper functions for lens application
  function applyLens(
    ctx: SetupContext<typeof definition>,
    model: ReturnType<typeof createSpacegraph>,
    session: MountedSession,
    lensId: BuiltinLensId
  ) {
    const lensDef = BUILTIN_LENSES.find((l) => l.id === lensId)
    if (!lensDef) return

    const prefs = ctx.stores.prefs
    prefs.update((draft) => {
      const newSurfaces = { ...(draft.surfaces ?? {}) }
      if (lensDef.surface === "map" || lensDef.surface === "hybrid") {
        newSurfaces["map"] = {
          layout: lensDef.layout,
          depth: lensDef.depth,
          level: lensDef.level,
          detailMode: lensDef.detailMode,
          files: lensDef.files,
          trace: lensDef.trace ?? undefined,
          persist: true,
        }
        if (lensDef.surface === "hybrid") {
          newSurfaces["hybrid"] = {
            layout: lensDef.layout,
            depth: lensDef.depth,
            level: lensDef.level,
            detailMode: lensDef.detailMode,
            files: lensDef.files,
            trace: lensDef.trace ?? undefined,
            persist: true,
          }
        }
      }
      const newRenderer = { ...(draft.renderer ?? {}), strategy: lensDef.widgets ? "spacegraph" : "spacegraph" }
      const newWidgets = { ...(draft.widgets ?? {}), enabled: lensDef.widgets }
      const newDensity = { ...(draft.density ?? {}), profile: "comfortable" }
      
      draft.lens = lensId
      draft.surfaces = newSurfaces
      draft.renderer = newRenderer
      draft.widgets = newWidgets
      draft.density = newDensity
    })

    // Apply immediately to current session
    model.setLevel(session, lensDef.level)
    model.setLayout(session, lensDef.layout)
    model.setDepth(session, lensDef.depth)
    model.setDetailMode(session, lensDef.detailMode)
    model.setArrangement(session, lensDef.surface === "hybrid" ? "side" : "stacked")
  }

  function cycleLens(
    ctx: SetupContext<typeof definition>,
    model: ReturnType<typeof createSpacegraph>,
    session: MountedSession,
    direction: "next" | "prev"
  ) {
    const prefs = ctx.stores.prefs
    const currentLens = (prefs.value.lens ?? "navigator") as string
    const currentIndex = BUILTIN_LENSES.findIndex((l) => l.id === currentLens)
    const nextIndex = direction === "next"
      ? (currentIndex + 1) % BUILTIN_LENSES.length
      : (currentIndex - 1 + BUILTIN_LENSES.length) % BUILTIN_LENSES.length
    applyLens(ctx, model, session, BUILTIN_LENSES[nextIndex].id)
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
        const available = surfaces()

        if (!available) {
          openTurnMap(session)

          return
        }

        const opening = !model.turnMap(session)
        model.toggleTurnMap(session)

        if (opening && available.current(session) !== `${ctx.id}.map`) select(`${ctx.id}.map`)
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
          <SpacegraphPanel
            model={model}
            session={input.session}
            screen={input.screen}
            onOpenTranscript={handleOpenTranscript}
          />
        </Suspense>
      </Scope>
    ),
  })
}

export default setup
