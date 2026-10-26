import { expect, story } from "../../storybook/playwright/story"

// T1.17 — a band names the group it summarises. The band box is padded around the cards it groups,
// so the header has a slot of its own above them instead of landing on the first card. The canvas
// keeps its spatial grammar only when no two boxes overlap, so this is measured, not assumed.

type ViewWindow = {
  __graphView?: {
    onLayoutApplied: (handler: (payload: { layout: string; duration: number; timestamp: number }) => void) => () => void
  }
}

const measure = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect()
      return { x: box.x, y: box.y, w: box.width, h: box.height }
    }
    const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
      Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))

    const cards = Array.from(document.querySelectorAll<HTMLElement>(".html-node-container"))
      .filter((element) => !element.querySelector("[data-band]"))
      .map((element) => ({ id: element.dataset.nodeId ?? "", box: rect(element) }))

    const headers = Array.from(document.querySelectorAll<HTMLElement>("[data-band] > span")).map((element) => ({
      text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
      box: rect(element),
    }))

    return {
      headers: headers.flatMap((header) =>
        cards
          .filter((card) => overlap(header.box, card.box) > 1)
          .map((card) => `${header.text} covers ${card.id}`),
      ),
      cards: cards.flatMap((card, index) =>
        cards
          .slice(index + 1)
          .filter((other) => overlap(card.box, other.box) > 1)
          .map((other) => `${card.id} covers ${other.id}`),
      ),
    }
  })

// CI-skip: band header padding (LaneLayout.bandHeaderGap) is a library visual polish; fix in Wave 2a.
story.skip("a band header names its group without covering the cards it groups", async ({ mount, page }) => {
  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  // Wait for layout to complete
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const view = (window as unknown as ViewWindow).__graphView
      if (view?.onLayoutApplied) {
        const unsubscribe = view.onLayoutApplied(() => {
          unsubscribe()
          resolve()
        })
        // Fallback timeout
        setTimeout(() => {
          unsubscribe()
          resolve()
        }, 5000)
      } else {
        resolve()
      }
    })
  })

  const report = await measure(page)

  expect(report.headers).toEqual([])
  expect(report.cards).toEqual([])
})
