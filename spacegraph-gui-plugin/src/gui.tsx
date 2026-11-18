import { Command, Panel, Plugin, SessionSurface, SettingsPage, Style } from "@opencode/plugin/gui"
import { HybridSurface } from "./host/hybrid-surface"
import { I18nProvider, type UiI18n } from "./host/i18n"
import { MapSurface } from "./host/map-surface"
import en from "./i18n/en"
import sessionGraphEn from "./i18n/session-graph"
import css from "./host/styles.css?inline"
import definition from "./plugin/declarations"
import { hostManifestEntries } from "./plugin/host-manifest"
import fullEn from "./plugin/i18n/en"
import { createSpacegraph } from "./plugin/model"
import { widgetCss } from "./host/widgets/styles"
import SpacegraphPanel from "./plugin/panel"
import SpacegraphSettings from "./plugin/settings"

export default Plugin.define({
  ...definition,
  i18n: { en: { ...fullEn, ...sessionGraphEn, ...en } },
  setup(ctx) {
    const model = createSpacegraph(ctx)
    const i18n: UiI18n = { t: (key, params) => ctx.t(key, params), plural: (key, count, params) => ctx.plural(key, count, params) }
    ctx.add(Style, `${css}\n${widgetCss}`)

    ctx.add(SessionSurface, {
      id: "spacegraph.map",
      title: ctx.t("spacegraph.surface.map"),
      icon: "split",
      order: 10,
      render: ({ session, screen, transcript }) => (
        <I18nProvider value={i18n}>
          <MapSurface session={session} screen={screen} transcript={transcript} model={model} />
        </I18nProvider>
      ),
    })

    ctx.add(SessionSurface, {
      id: "spacegraph.hybrid",
      title: ctx.t("spacegraph.surface.hybrid"),
      icon: "branch-out",
      order: 20,
      render: ({ session, screen, transcript }) => (
        <I18nProvider value={i18n}>
          <HybridSurface session={session} screen={screen} transcript={transcript} model={model} />
        </I18nProvider>
      ),
    })

    ctx.add(Command, {
      id: "open-map",
      title: ctx.t("spacegraph.command.openMap"),
      section: "session",
      run: () => {
        const session = ctx.sessions.current()
        if (session) model.select(session, "spacegraph.map")
      },
    })

    ctx.add(Panel, {
      id: "inspector",
      region: "side",
      list: () => [{ id: "inspector", title: ctx.t("spacegraph.panel.tab"), icon: "branch-out" }],
      render: (props) => (
        <I18nProvider value={i18n}>
          <SpacegraphPanel model={model} session={props.session} screen={props.screen} />
        </I18nProvider>
      ),
    })

    const manifest = hostManifestEntries()
    ctx.add(SettingsPage, {
      id: "spacegraph",
      title: ctx.t("spacegraph.panel.title"),
      icon: "branch-out",
      entries: manifest.flatMap((entry) =>
        entry.values.map((value) => ({ id: `${entry.id}.${value}`, title: `${entry.id}: ${value}` })),
      ),
      render: () => <SpacegraphSettings />,
    })
  },
})
