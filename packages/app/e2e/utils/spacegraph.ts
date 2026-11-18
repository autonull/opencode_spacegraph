import { readFileSync } from "node:fs"
import type { Page } from "@playwright/test"
import { sessionHref } from "./app"
import { mockWorkspace } from "./workspace"

// The committed third-party bundle and the canonical session it renders, shared by the graph e2e specs.
const bundle = readFileSync(
  new URL("../../../../spacegraph-gui-plugin/dist/gui-experimental.cjs", import.meta.url),
  "utf8",
)
const messages = JSON.parse(
  readFileSync(new URL("../../component-tests/fixtures/spacegraph-messages.json", import.meta.url), "utf8"),
)

/** Opens a session in the web app with the SpaceGraph GUI plugin installed. */
export async function openPluginSession(page: Page, input: { widgets?: boolean } = {}) {
  await page.route("**/spacegraph-gui-experimental.cjs", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: bundle }),
  )

  const workspace = await mockWorkspace(page, {
    name: "SpaceGraph",
    pageMessages: () => ({ items: messages }),
    seed: {
      tabs: [],
      ...(input.widgets
        ? { storage: { "opencode.global.dat:plugin.spacegraph.prefs": { widgets: { enabled: true } } } }
        : {}),
    },
  })
  const session = workspace.sessions[0]!

  await page.goto(
    `/e2e/utils/spacegraph.html?${new URLSearchParams({ server: workspace.server, path: sessionHref(session.id, "sidecar") })}`,
  )

  return { ...workspace, session }
}

/** Switches the session to a surface contributed by the installed plugin. */
export async function selectSurface(page: Page, title: string) {
  await page.getByRole("button", { name: "Session view" }).click()
  await page.getByRole("menuitemradio", { name: title, exact: true }).click()
}
