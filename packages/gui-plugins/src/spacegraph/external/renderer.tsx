import {
  Command,
  ComposerPill,
  createKeyed,
  MenuItem,
  Panel,
  SessionSurface,
  SettingsPage,
  Slot,
  Style,
  TitlebarItem,
  type MountedSession,
  type PanelTab,
  type Plugin,
  type SetupContext,
} from "@opencode/plugin/gui"
// oxlint-disable-next-line no-restricted-imports -- mirrors and restores host surface selection; the SDK's keyed providers have no equivalent for this session-scoped write
import { createEffect, createSignal, lazy, onCleanup, onMount, Show, Suspense, type ParentProps } from "solid-js"
// oxlint-disable-next-line no-restricted-imports -- internal graph vocabulary within the same plugin, not another built-in plugin
import { LAYOUTS, failures } from "../internal/graph"
import definition, { BUILTIN_LENSES, type BuiltinLensId } from ".."
import { createSpacegraph } from "../model"
import { GraphLoadBoundary } from "../graph-boundary"
import { createUiI18n, I18nContext } from "./i18n"
import hybridStyles from "../hybrid.css?inline"

// The graph render module is imported only when a graph surface is actually opened. A failed import
// is then contained by GraphLoadBoundary instead of breaking the built-in's startup and the app shell.
const MapSurface = lazy(() => import("../map-surface").then((mod) => ({ default: mod.MapSurface })))
const HybridSurface = lazy(() => import("../hybrid-surface").then((mod) => ({ default: mod.HybridSurface })))
const SideOverview = lazy(() => import("../side-overview").then((mod) => ({ default: mod.SideOverview })))
const TurnMapLayer = lazy(() => import("../turn-map-layer").then((mod) => ({ default: mod.TurnMapLayer })))
const MapDialog = lazy(() => import("./dialogs").then((mod) => ({ default: mod.MapDialog })))
const TurnMapDialog = lazy(() => import("./dialogs").then((mod) => ({ default: mod.TurnMapDialog })))

type Surfaces = SetupContext<typeof definition>["surfaces"]

const setup: Plugin.Setup<typeof definition> = (ctx) => {
  ctx.add(Style, hybridStyles)
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

  const select = (id: string, mounted?: MountedSession) => {
    const session = mounted ?? ctx.sessions.current()

    if (!session) return

    if (surfaces()) {
      model.select(session, id)

      return
    }

    openPanel(session)
  }

  // The header's map/split switches go straight through the host's surface registry. Mirror the
  // reactive selection into the plugin's session store so it can be restored after a reload;
  // `recordSurface` deliberately does not select, so this cannot loop.
  let restored = false
  createEffect(() => {
    const session = ctx.sessions.current()

    if (!session || !restored) return

    const current = ctx.surfaces.current(session)

    if (current === "transcript" || current === `${ctx.id}.map` || current === `${ctx.id}.hybrid`) {
      model.recordSurface(session, current)
    }
  })

  // Restore surface on mount. Contributed surfaces register asynchronously, so wait for the stored
  // id to appear in the reactive surface list instead of guessing a registration delay. Only start
  // mirroring the host selection once the stored choice has been applied, or the transcript default
  // would overwrite it first.
  onMount(() => {
    const session = ctx.sessions.current()
    const target = session ? model.surface(session) : undefined

    if (!session || !target || target === "transcript") {
      restored = true

      return
    }

    createEffect(() => {
      if (restored) return
      if (ctx.surfaces.list().some((surface) => surface.id === target)) {
        ctx.surfaces.select(target, session)
        restored = true
      }
    })
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
      screen.transcript?.reveal(messageId)
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

  // P0.1: Smart entry toast - offers graph view for hard sessions (attention, 50+ turns, failure chain)
  // When clicked, opens hybrid surface with investigator lens, auto-focuses first failure, and opens "Why?" trace
  const SmartEntryWatch = (props: { session: MountedSession }) => {
    const shown = new Set<string>()
    createKeyed(
      () => model.smartEntry(props.session) ? "show" : "hide",
      () => {
        if (!model.smartEntry(props.session)) return
        if (shown.has(props.session.id)) return
        shown.add(props.session.id)
        ctx.toast.show({
          variant: "default",
          title: ctx.t("ui.sessionGraph.smartEntry.toastTitle"),
          description: ctx.t("ui.sessionGraph.smartEntry.toastDescription"),
          actions: [
            {
              label: ctx.t("ui.sessionGraph.smartEntry.toastAction"),
              run: () => {
                model.applyLensById(props.session, "investigator")
                select(`${ctx.id}.hybrid`)
                // Auto-focus first failure and open "Why?" trace after surface mounts
                setTimeout(() => {
                  const graphModel = model.graph(props.session)()
                  const failureNodes = failures(graphModel)
                  if (failureNodes.length > 0) {
                    const firstFailure = failureNodes[0]
                    model.focus(props.session, firstFailure.node.id)
                    model.setTraceKind(props.session, "why")
                  }
                }, 100)
              },
            },
          ],
        })
      },
    )
    return null
  }

  // Phase 16.3: session.header slot - "Open this turn" toggle
  ctx.add(Slot, {
    at: "session.header",
    order: 30,
    render: (input: { session: import("@opencode/plugin/gui").MountedSession }) => {
      const signal = () => (model.attentionEnabled() ? model.attention(input.session) : undefined)
      return (
        <div class="flex items-center gap-2" data-slot="session-header-graph-toggle">
          <AttentionWatch session={input.session} />
          <SmartEntryWatch session={input.session} />
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
    fallback: true,
  }
  const overviewTab: PanelTab = {
    id: "overview",
    get title() {
      return ctx.t("panel.overview.title")
    },
    draggable: false,
    closable: "compact",
  }

  // Phase 16.3: ComposerPill - "Open this turn" action for active turn
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

    const dialog = ctx.dialogs.open(() => (
      <Scope>
        <GraphLoadBoundary
          t={ctx.t}
          onBack={() => {
            dialog.close()
            select("transcript")
          }}
        >
          <MapDialog
            ctx={ctx}
            model={model}
            session={session}
            screen={screen}
            title={title}
            onOpenTranscript={handleOpenTranscript}
          />
        </GraphLoadBoundary>
      </Scope>
    ))
  }

  const openTurnMap = (session: MountedSession) => {
    const screen = ctx.screen.current()

    if (!screen) return

    const dialog = ctx.dialogs.open(() => (
      <Scope>
        <GraphLoadBoundary
          t={ctx.t}
          onBack={() => {
            dialog.close()
            select("transcript")
          }}
        >
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
        </GraphLoadBoundary>
      </Scope>
    ))
  }

  const [hash, setHash] = createSignal(location.hash)
  // A view permalink carries its facet question as `#graph?kind:file`; the map mirrors it into the
  // graph's facet state so a shared link lands on the same filtered view.
  const viewQuery = () => (/^#graph\?(.+)$/.exec(hash())?.[1])

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
      return
    }

    // A message hash selects the turn that owns it while the map is open, so a link into the
    // transcript can be followed back to the same place on the graph.
    const messageID = /^#message-(.+)$/.exec(hash())?.[1]
    if (messageID) {
      const turnID = model.graph(session)().turnByMessageID.get(messageID)
      if (turnID) model.focus(session, `turn:${turnID}`)
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
          <GraphLoadBoundary t={ctx.t} onBack={() => select("transcript")}>
            <MapSurface
              ctx={ctx}
              model={model}
              session={session}
              screen={screen}
              onSplitView={() => select(`${ctx.id}.hybrid`, session)}
              onBack={() => select("transcript")}
              onOpenSession={(id: string) => {
                const match = /^(.*\/session\/)[^/?#]+([/?#].*)?$/.exec(location.pathname + location.search + location.hash)
                if (match) location.href = `${match[1]}${id}${match[2] ?? ""}`
              }}
              onTurnMap={() => {
                if (!model.turnMap(session)) model.toggleTurnMap(session)
              }}
              facetQuery={viewQuery()}
              onOpenTranscript={handleOpenTranscript}
            />
          </GraphLoadBoundary>
        </Scope>
      ),
      layers: [
        {
          id: "turn-map",
          render: ({ session, screen, surface }) => (
            <Scope>
              <GraphLoadBoundary t={ctx.t} onBack={() => model.closeTurnMap(session)} silent>
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
              </GraphLoadBoundary>
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
          <GraphLoadBoundary t={ctx.t} onBack={() => select("transcript")}>
            <HybridSurface
              ctx={ctx}
              model={model}
              session={session}
              screen={screen}
              transcript={transcript}
              onOpenTranscript={handleOpenTranscript}
            />
          </GraphLoadBoundary>
        </Scope>
      ),
    })

    // Phase 16.2: Graph transcript surface
    if (surfaces()) {
      const GraphTranscriptSurface = lazy(() =>
        import("@opencode/session-graph").then((m) => ({ default: m.GraphTranscriptSurface }))
      )
      ctx.add(SessionSurface, {
        id: `${ctx.id}.transcript-graph`,
        get title() {
          return ctx.t("surface.transcriptGraph")
        },
        order: 5,
        render: ({ session }) => (
          <Scope>
            <GraphLoadBoundary t={ctx.t} onBack={() => select("transcript")}>
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
                  // Open subagent graph
                  model.focus(session, subagentID)
                  model.setDetailMode(session, "popover")
                }}
                onTurnShare={(turnID, layout, nodeID) => {
                  // Permalink copied - could show a toast
                  const permalink = `#spacegraph:${layout}:${nodeID}`
                  navigator.clipboard.writeText(permalink)
                }}
              />
            </GraphLoadBoundary>
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
      run: () => {
        const available = surfaces()
        if (!available) return openMapDialog(session, ctx.t("surface.hybrid"))
        const current = available.current(session)
        if (current === `${ctx.id}.map`) {
          select(`${ctx.id}.hybrid`)
        } else {
          select(`${ctx.id}.map`)
        }
      },
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

  // graph.toggle - toggle between transcript and hybrid (Ctrl+Shift+G)
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
      bind: "ctrl+shift+g",
      section: "session",
      run: () => {
        const available = surfaces()
        if (!available) return
        const current = available.current(session)
        if (current === `${ctx.id}.hybrid`) {
          select("transcript")
        } else {
          select(`${ctx.id}.hybrid`)
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
    // P1.3: Neighborhood focus mode toggle
    { id: "focus.toggle", bind: "f", title: "command.focus.toggle", run: (session: MountedSession) => model.toggleNeighborhoodMode(session) },
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
    list: (input) => (input.open.includes("map") ? [tab, overviewTab] : []),
    render: (input) => (
      <Scope>
        <GraphLoadBoundary t={ctx.t} onBack={() => select("transcript")}>
          <Show
            when={input.tab.id === "overview"}
            fallback={
              <SpacegraphPanel
                model={model}
                session={input.session}
                screen={input.screen}
                onOpenTranscript={handleOpenTranscript}
              />
            }
          >
            <SideOverview
              model={model.graph(input.session)()}
              onPick={(nodeID) => {
                const node = model.graph(input.session)().nodes.find((entry) => entry.id === nodeID)
                if (node?.messageID) handleOpenTranscript(node.messageID)
              }}
              onOpenFull={() => model.select(input.session, `${ctx.id}.map`)}
            />
          </Show>
        </GraphLoadBoundary>
      </Scope>
    ),
  })
}

export default setup
