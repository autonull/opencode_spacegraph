// Scrolling the graph transcript surface with no inline graph expanded: only the visible rows
// mount, and no row builds a turn graph. The run compares against the host timeline's own scroll
// cost through the shared budget (transcript scroll regression < 3%). At 1440×900, canonical
// fixture.
import { bench, web } from "@hona/strobe"
import { cached } from "./fixtures/mock"
import { mockGraphSession, openGraphSurface, transcript } from "./fixtures/graph"

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
    "scroll the graph transcript": {
      primary: "main.busy",
      metrics: ["main.work", "frames.dropped.pct"],
      async run({ page }) {
        await page.scroll(transcript, { by: 3_000, speed: 3_000 })
        await page.scroll(transcript, { by: -3_000, speed: 3_000 })
      },
      async reset({ page }) {
        await page.eval((selector) => {
          const element = document.querySelector(selector)

          if (element) element.scrollTop = 0
        }, transcript)
        await page.idle()
      },
    },
  },
})
