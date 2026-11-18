// @refresh reload

// Dev-only entry for provider-free graph demo
// This entry point mounts the real app shell with the canonical session fixture
// and NO_PROVIDER so reviewers can evaluate the graph without a model provider.
// Guarded by import.meta.env.DEV — not included in production builds.

import "@/runtime/polyfills"
import { render } from "solid-js/web"
import { AppBaseProviders, AppInterface } from "@/app"
import { loadInitialLocale } from "@/runtime/i18n/language"
import { PlatformProvider } from "@/runtime/platform/platform"
import { createWebPlatform } from "@/runtime/platform/web"
import { isStandalone, PwaRoutePersistence, restorePwaRoute } from "@/runtime/platform/pwa"
import { KeyboardInsets } from "@/runtime/platform/keyboard"
import en from "@/runtime/i18n/en"
import zh from "@/runtime/i18n/zh"
import { authFromToken } from "@/runtime/server/api"
import pkg from "../package.json"
import { ServerConnection } from "@/runtime/server/registry"
import { buildFixtureMessages } from "@opencode/session-ui/graph"

const getLocale = () => {
  if (typeof navigator === "undefined") return "en" as const
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]

  for (const language of languages) {
    if (!language) continue

    if (language.toLowerCase().startsWith("zh")) return "zh" as const
  }

  return "en" as const
}

const getRootNotFoundError = () => {
  const key = "error.dev.rootNotFound" as const
  const locale = getLocale()

  return locale === "zh" ? (zh[key] ?? en[key]) : en[key]
}

const root = document.getElementById("root")

if (!(root instanceof HTMLElement) && import.meta.env.DEV) {
  throw new Error(getRootNotFoundError())
}

const clearAuthToken = () => {
  const params = new URLSearchParams(location.search)

  if (!params.has("auth_token")) return
  params.delete("auth_token")
  history.replaceState(null, "", location.pathname + (params.size ? `?${params}` : "") + location.hash)
}

const web = createWebPlatform(pkg.version)

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"), { once: true })
}

// SAFETY: window is a global object; we're adding a dev-only property for the mock server
const win = window as any

win.__GRAPH_FIXTURE_MESSAGES__ = buildFixtureMessages()

// The graph sits behind `experimental.sessionGraph`, which the app reads from its `settings.v3`
// storage key. The demo exists to show the graph, so the key is seeded here: the app rewrites the
// key while it starts, so the flag is merged into every write instead of being written once.
const enableSessionGraph = () => {
  const key = "settings.v3"
  const write = Storage.prototype.setItem

  const merge = (value: string) => {
    const current = JSON.parse(value)

    return JSON.stringify({
      ...current,
      experimental: { ...(current.experimental ?? {}), sessionGraph: true },
    })
  }

  Storage.prototype.setItem = function (name: string, value: string) {
    if (name !== key) {
      write.call(this, name, value)

      return
    }

    write.call(this, name, merge(value))
  }

  const stored = localStorage.getItem(key)

  localStorage.setItem(key, stored ? merge(stored) : JSON.stringify({ experimental: { sessionGraph: true } }))
}

enableSessionGraph()

if (root instanceof HTMLElement && root.dataset.opencodeMounted === undefined) {
  // Lazy chunks can import the entry chunk back under a distinct URL, so claim the root before async startup.
  root.dataset.opencodeMounted = ""
  void loadInitialLocale().then((locale) => {
    const auth = authFromToken(new URLSearchParams(location.search).get("auth_token"))
    clearAuthToken()
    const standalone = isStandalone()
    root.dataset.standalone = String(standalone)

    if (standalone) restorePwaRoute()

    const server: ServerConnection.Http | undefined = web.currentServerUrl
      ? {
          type: "http",
          authToken: !!auth,
          http: {
            url: web.currentServerUrl,
            ...auth,
          },
        }
      : undefined

    render(
      () => (
        <PlatformProvider value={web.platform}>
          <AppBaseProviders locale={locale}>
            <AppInterface
              canonicalLocalServer={server ? ServerConnection.key(server) : undefined}
              servers={server ? [server] : []}
            >
              <KeyboardInsets />
              {standalone && <PwaRoutePersistence />}
            </AppInterface>
          </AppBaseProviders>
        </PlatformProvider>
      ),
      root,
    )
  })
}