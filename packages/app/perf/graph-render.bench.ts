// Drawing a session map at scale: 500, 2,000 and 5,000 nodes, at 1440×900. A run changes the
// semantic level, so it measures the adapter's filter, the card budget and the renderer's redraw
// together; the camera must stay where the reader left it.
import { bench, web } from "@hona/strobe"
import { cached } from "./fixtures/mock"
import { canvas, map, mockGraphSession, openGraphSurface } from "./fixtures/graph"

const layers = '[data-slot="graph-toolbar-layers"] > summary'

const level = (name: string) => `[data-slot="graph-layers-level"] button:has-text("${name}")`

export default bench({
  // The plan's curve; `--params all` is the same three sizes.
  params: { nodes: { run: [500, 2_000, 5_000], more: [] } },

  targets: {
    web: web({
      expect: { title: "OpenCode" },
      viewport: { width: 1440, height: 900 },
      async prepare(ctx) {
        const page = cached(ctx)

        return mockGraphSession(page, {
          server: new URL(ctx.url).origin,
          nodes: ctx.params.nodes,
          surface: "map",
        })
      },
      url: ({ prepared }) => prepared.path,
    }),
  },

  async setup({ page }) {
    await page.waitFor('[data-component="composer-editor"]', { timeout: 60_000 })
    await openGraphSurface(page, "map")
    await page.waitFor(canvas, { timeout: 60_000 })
    await page.idle()
  },

  cases: {
    "draw in detail": {
      primary: "main.work",
      metrics: ["run.duration"],
      async run({ page }) {
        await page.click(layers)
        await page.click(level("Detail"), { until: canvas })
        await page.idle()
      },
      async reset({ page }) {
        await page.click(layers)
        await page.click(level("Execution"), { until: canvas })
        await page.idle()
      },
    },
    "draw the overview": {
      primary: "main.work",
      metrics: ["run.duration"],
      async run({ page }) {
        await page.click(layers)
        await page.click(level("Overview"), { until: canvas })
        await page.idle()
      },
      async reset({ page }) {
        await page.click(layers)
        await page.click(level("Execution"), { until: canvas })
        await page.idle()
      },
    },
  },
})
