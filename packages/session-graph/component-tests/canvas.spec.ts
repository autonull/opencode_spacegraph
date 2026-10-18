import { expect, story } from "../../storybook/playwright/story"

type CanvasWindow = {
  __sessionGraphCanvas?: {
    setRenderer: (id: "spacegraph" | "cytoscape") => void
    setSelection: (ids: string[]) => void
    ready?: { id: string; capabilities: { projections: readonly string[]; maxDomNodes: number }; fallback: boolean }
  }
}

story("mounts a renderer through the registry and switches backends", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-canvas")
  const host = root.locator('[data-slot="graph-canvas-host"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })
  await expect(host).toHaveAttribute("data-graph-renderer", "spacegraph")
  await expect(host.locator("canvas")).toBeVisible()

  // The fixture model reaches the renderer as DOM activity cards, not just a filled canvas.
  await expect(host).toContainText("src/auth/session.ts")

  const ready = await page.evaluate(() => (window as unknown as CanvasWindow).__sessionGraphCanvas?.ready)
  expect(ready?.id).toBe("spacegraph")
  expect(ready?.fallback).toBe(false)
  expect(ready?.capabilities.projections).toContain("3d")

  // Switching backends rebuilds the canvas once on the same model and disposes the old adapter.
  await page.evaluate(() => (window as unknown as CanvasWindow).__sessionGraphCanvas!.setRenderer("cytoscape"))
  await expect(host).toHaveAttribute("data-graph-renderer", "cytoscape", { timeout: 30_000 })
  await expect(host.locator("canvas").first()).toBeVisible()
  await expect(host).toContainText("src/auth/session.ts")

  // Programmatic selection syncs through the contract without throwing.
  await page.evaluate(() => (window as unknown as CanvasWindow).__sessionGraphCanvas!.setSelection(["tool:prt_tool_read_1"]))
  await expect(host.locator("canvas").first()).toBeVisible()

  expect(errors).toEqual([])
})
