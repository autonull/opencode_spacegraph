// One inline turn map on the graph transcript surface: the static preview is already drawn, so a
// run pays the lazy SessionGraph chunk, the WebGL mount and the first frame. At 1440×900, canonical
// fixture (46 nodes).
import { bench, web } from "@hona/strobe"
import { cached } from "./fixtures/mock"
import { mockGraphSession, openGraphSurface, transcript } from "./fixtures/graph"

const inlineCanvas = `${transcript} .graph-inline-container [data-slot="graph-canvas-host"][data-graph-ready="true"]`

export default bench({
  targets: {
    web: web({
      expect: { title: "OpenCode" },
      viewport: { width: 1440, height: 900 },
      async prepare(ctx) {
        const page = cached(ctx)

        return mockGraphSession(page, {
          server: new URL(ctx.url).origin,
          surface: "transcript",
        })
      },
      url: ({ prepared }) => prepared.path,
    }),
  },

  async setup({ page }) {
    await page.waitFor('[data-component="composer-editor"]', { timeout: 60_000 })
    await openGraphSurface(page, "transcript")
    await page.idle()
  },

  cases: {
    "expand a turn map": {
      primary: "main.work",
      metrics: ["run.duration"],
      async run({ page }) {
        await page.click(`${transcript} .graph-affordance-toggle`, { until: inlineCanvas, timeout: 60_000 })
        await page.idle()
      },
      // A fresh document guarantees a collapsed row and a cold lazy chunk on the next run.
      async reset({ page, prepared }) {
        await page.goto(prepared.path, { until: '[data-component="composer-editor"]', timeout: 60_000 })
        await openGraphSurface(page, "transcript")
        await page.idle()
      },
    },
  },
})
