import type { Locator, Page } from "@playwright/test"
import { expect, story } from "../../storybook/playwright/story"

type A11yWindow = {
  __graphA11y?: {
    selected: () => string | undefined
    setRenderer: (id: "spacegraph" | "cytoscape") => void
  }
}

const TOKEN_ID = "file:src/auth/token.ts"

const focusItem = (page: Page, id: string) =>
  page.evaluate((id) => {
    document.querySelector<HTMLElement>(`[data-slot="graph-a11y"] li[data-id="${id}"]`)?.focus()
  }, id)

const activeId = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.id)

const selected = (page: Page) => page.evaluate(() => (window as unknown as A11yWindow).__graphA11y!.selected())

/**
 * Walks the hidden node list with the arrow keys to the target, activates it with Enter, and asserts
 * the inspector shows that node. Traversal, not a programmatic focus, is the real user path.
 */
const inspectByKeyboard = async (page: Page, ids: readonly string[], inspector: Locator) => {
  await focusItem(page, ids[0]!)
  await page.keyboard.press("Home")
  for (let step = 0; step < ids.indexOf(TOKEN_ID); step++) await page.keyboard.press("ArrowDown")
  expect(await activeId(page)).toBe(TOKEN_ID)
  await page.keyboard.press("Enter")
  await expect.poll(() => selected(page)).toBe(TOKEN_ID)
  await expect(inspector).toContainText("File")
  await expect(inspector).toContainText("src/auth/token.ts")
}

story("drives selection and inspection from the keyboard mirror in both renderers", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-a11y")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  const inspector = root.locator('[data-slot="graph-inspector"]')
  const mirror = root.locator('[data-slot="graph-a11y"]')

  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  // The canvas region points at keyboard instructions; the mirror is a labelled group.
  const region = root.locator('[data-slot="graph-canvas-region"]')
  const instructions = root.locator('[data-slot="graph-a11y-instructions"]')
  await expect(instructions).toBeAttached()
  await expect(instructions).not.toBeEmpty()
  await expect(region).toHaveAttribute("aria-describedby", (await instructions.getAttribute("id"))!)
  await expect(mirror).toHaveAttribute("role", "group")
  await expect(mirror).toHaveAttribute("aria-label", "Graph contents")

  // One ordered item per rendered node, with a single roving tabindex.
  const ids = await mirror.locator("li").evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.id!))
  expect(ids.length).toBeGreaterThan(2)
  expect(ids).toContain(TOKEN_ID)
  await expect(mirror.locator('li[tabindex="0"]')).toHaveCount(1)

  // Arrow navigation moves the roving focus one node at a time.
  await focusItem(page, ids[0]!)
  await page.keyboard.press("ArrowDown")
  expect(await activeId(page)).toBe(ids[1])

  // Enter selects and inspects; Escape clears and returns the inspector to its empty state.
  await inspectByKeyboard(page, ids, inspector)
  await page.keyboard.press("Escape")
  await expect.poll(() => selected(page)).toBeUndefined()
  await expect(inspector).toContainText("Select a node to see its details")

  // The same mirror selects and inspects over the second renderer.
  await page.evaluate(() => (window as unknown as A11yWindow).__graphA11y!.setRenderer("cytoscape"))
  await expect(host).toHaveAttribute("data-graph-renderer", "cytoscape", { timeout: 30_000 })
  await inspectByKeyboard(page, ids, inspector)

  expect(errors).toEqual([])
})
