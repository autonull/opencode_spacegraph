import { expect, story } from "../../stories/playwright/story"

// T6.7 — the renderers inject host card markup with `innerHTML`, so the escaping in the render model
// is the only barrier between a tool output that contains markup and the page. This story proves it
// end to end in both adapters.

type ViewWindow = {
  __graphView?: {
    setRenderer: (id: "spacegraph" | "cytoscape") => void
  }
}

story("keeps hostile markup inert in the canvas and the inspector", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--hostile")
  const host = root.locator('[data-slot="graph-canvas-host"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  // Nothing in the payload ran.
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()

  // No element from the payload reached the DOM.
  await expect(host.locator("script")).toHaveCount(0)
  await expect(host.locator("img")).toHaveCount(0)

  // The payload is still readable, as text.
  await expect(host.locator(".html-node-container").filter({ hasText: "<script>" })).toHaveCount(1)

  // The inspector shows the same label as text, never as markup.
  const inspector = root.locator('[data-slot="graph-inspector"]')
  await expect(inspector).toContainText("<script>")
  await expect(inspector.locator("script")).toHaveCount(0)

  // The Cytoscape adapter injects the same card markup, so it needs the same proof.
  await page.evaluate(() => (window as unknown as ViewWindow).__graphView!.setRenderer("cytoscape"))
  await expect(host).toHaveAttribute("data-graph-renderer", "cytoscape", { timeout: 30_000 })

  const cards = host.locator('[data-slot="cytoscape-card"]')
  await expect(cards.filter({ hasText: "<script>" })).toHaveCount(1)
  await expect(cards.locator("script")).toHaveCount(0)
  await expect(cards.locator("img")).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()

  expect(errors).toEqual([])
})
