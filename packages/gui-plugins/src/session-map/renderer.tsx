import { lazy, onCleanup, Suspense } from "solid-js"
import { MenuItem, Panel, type PanelTab, type Plugin } from "@opencode/plugin/gui"
import { onIdle } from "@opencode/plugin/gui/builtin"
import type definition from "./index"
import { createSessionMap } from "./model"

const setup: Plugin.Setup<typeof definition> = (ctx) => {
  const SessionMapPanel = lazy(() => import("./panel"))
  // Compile the panel while the app idles, so the first open renders at once.
  onCleanup(onIdle(() => void SessionMapPanel.preload()))

  const layout = ctx.layout
  const sessions = ctx.sessions
  const map = createSessionMap(ctx)

  // One tab object for every session, so neither strip updates nor a session switch remount its trigger.
  const tab: PanelTab = {
    id: "main",
    get title() {
      return ctx.t("tab.title")
    },
    draggable: false,
    closable: "compact",
  }

  ctx.add(MenuItem, {
    menu: "session.panel",
    id: "open",
    get title() {
      return ctx.t("menu.open")
    },
    icon: "branch-out",
    order: 30,
    run() {
      const session = sessions.current()

      if (!session) return
      layout.open("session-map:main", session, { tab: "select" })
    },
  })

  ctx.add(Panel, {
    id: "main",
    region: "side",
    mobile: {
      get title() {
        return ctx.t("tab.title")
      },
      order: 50,
      kind: "menu",
      icon: "branch-out",
    },
    list: (input) => (input.open.includes("main") ? [tab] : []),
    render: (props) => (
      <Suspense>
        <SessionMapPanel map={map} session={props.session} screen={props.screen} />
      </Suspense>
    ),
  })
}

export default setup
