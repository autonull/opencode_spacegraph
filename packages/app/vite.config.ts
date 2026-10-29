import { sentryVitePlugin } from "@sentry/vite-plugin"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import desktopPlugin, { channel } from "./vite.js"
import { icons } from "./vite.icons"
import { serviceWorker } from "./vite.pwa"

const sentry =
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        telemetry: false,
        release: {
          name: process.env.SENTRY_RELEASE ?? process.env.VITE_SENTRY_RELEASE,
        },
        sourcemaps: {
          assets: "./dist/**",
          filesToDeleteAfterUpload: "./dist/**/*.map",
        },
      })
    : false

import { searchForWorkspaceRoot } from "vite"
import path from "node:path"

const workspaceRoot = searchForWorkspaceRoot(process.cwd())
const spacegraphjsRoot = path.resolve(workspaceRoot, "spacegraphjs")

export default defineConfig({
  plugins: [
    desktopPlugin,
    icons(channel),
    serviceWorker(fileURLToPath(new URL("./dist", import.meta.url))),
    sentry,
    // The graph demo mounts the real shell, and the shell's router only knows its own routes, so the
    // demo's page is served at `/` instead of at `/graph-dev.html`.
    ...(process.env.VITE_OPENCODE_GRAPH_DEV === "1"
      ? [
          {
            name: "opencode-graph-dev-entry",
            configureServer(server: import("vite").ViteDevServer) {
              server.middlewares.use((req, _res, next) => {
                if (req.url === "/" || req.url === "/index.html") req.url = "/graph-dev.html"
                next()
              })
            },
          },
        ]
      : []),
  ],
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 3000,
    fs: {
      allow: [workspaceRoot, spacegraphjsRoot],
    },
  },
  build: (() => {
    const base: import("vite").BuildOptions = {
      assetsDir: "_assets",
      target: "esnext",
      sourcemap: true,
    }

    if (process.env.VITE_OPENCODE_TEST_FIXTURES === "1") {
      base.rolldownOptions = {
        input: [
          "index.html",
          "e2e/utils/settings-wsl.html",
          "e2e/utils/app-direction.html",
          "e2e/utils/windows-menu.html",
          "graph-dev.html",
        ],
      }
    }

    if (process.env.VITE_OPENCODE_GRAPH_DEV === "1") {
      base.rolldownOptions = {
        input: ["graph-dev.html"],
      }
    }

    return base
  })(),
})
