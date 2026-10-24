import { expect, story } from "../../storybook/playwright/story"

// Phase 9 refinement: the interaction polish that makes the graph quicker than the transcript —
// keyboard-driven search (RF.10), breadcrumb fit-subtree (U3.11/RF.10), and the responsive inspector
// with a drag handle (RF.8). Each story mounts the real GraphView over the canonical fixture.

type RefineWindow = {
  __graphView?: {
    select: (id: string | undefined) => void
    selected: () => string | undefined
  }
}

const TOKEN_ID = "file:src/auth/token.ts"

story("search results navigate with the keyboard and select the highlighted node", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  // The `/` shortcut opens search from the canvas region without a pointer.
  await root.locator('[data-slot="graph-canvas-region"]').focus()
  await page.keyboard.press("/")

  const search = root.locator('[data-slot="graph-search"]')
  await expect(search).toBeVisible()

  const input = search.locator("input")
  await input.fill("token")
  await expect(search).toContainText(/results?/)

  // Arrow keys move the active option; Enter selects it. "token" lists edit, write, then the file.
  await expect(input).toHaveAttribute("aria-activedescendant", "graph-search-option-0")
  await input.press("ArrowDown")
  await expect(input).toHaveAttribute("aria-activedescendant", "graph-search-option-1")
  await input.press("ArrowDown")
  await expect(input).toHaveAttribute("aria-activedescendant", "graph-search-option-2")

  await input.press("Enter")
  await expect(search).toBeHidden()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as RefineWindow).__graphView!.selected()))
    .toBe(TOKEN_ID)

  // The inspector and breadcrumbs both reflect the search selection, not just the canvas.
  await expect(root.locator('[data-slot="graph-inspector"]')).toContainText("src/auth/token.ts")
  await expect(root.locator('[data-slot="graph-breadcrumbs"]')).toContainText("src/auth/token.ts")

  expect(errors).toEqual([])
})

story("a breadcrumb click selects the ancestor and fits its subtree", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const breadcrumbs = root.locator('[data-slot="graph-breadcrumbs"]')
  await expect(breadcrumbs).toContainText("Session")

  // The trail ends at the initial tool node; clicking the session root walks up and re-frames.
  await breadcrumbs.locator("button", { hasText: "Session" }).first().click()

  await expect
    .poll(() => page.evaluate(() => (window as unknown as RefineWindow).__graphView!.selected()))
    .toBe("session")
  await expect(root.locator('[data-slot="graph-inspector"]')).toContainText("Session")

  expect(errors).toEqual([])
})

story("execution dims cards outside the selected neighborhood (RF.10)", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  // The story selects a tool node at execution; its neighbours stay lit and the rest fade.
  const dimmed = host.locator('.html-node-container:has(div[style*="opacity:.3"])')
  await expect.poll(() => dimmed.count()).toBeGreaterThan(0)

  // Focus only applies at execution: at overview nothing is dimmed.
  await root.locator('[data-slot="graph-toolbar"] button', { hasText: "Overview" }).click()
  await expect.poll(() => dimmed.count()).toBe(0)

  expect(errors).toEqual([])
})

story("focus dimming applies when a node is selected after mount (RF.10)", async ({ mount, page }) => {
  const root = await mount("session-graph-view--no-selection")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  const dimmed = host.locator('.html-node-container:has(div[style*="opacity:.3"])')
  await expect.poll(() => dimmed.count()).toBe(0)

  // The app selects from search after mount, not through an initial prop.
  await page.evaluate(() => (window as unknown as RefineWindow).__graphView!.select("file:src/auth/token.ts"))
  await expect.poll(() => dimmed.count()).toBeGreaterThan(0)
})

story("the inspector is a resizable side panel on wide viewports", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const gutter = root.locator('[data-slot="graph-inspector-gutter"]')
  const handle = root.locator('[data-slot="graph-inspector-resize"]')

  await expect(gutter).toHaveAttribute("data-layout", "side")
  await expect(handle).toBeVisible()

  const before = await gutter.evaluate((element) => element.getBoundingClientRect().width)
  const box = await handle.boundingBox()

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 - 60, box!.y + box!.height / 2, { steps: 5 })
  await page.mouse.up()

  const after = await gutter.evaluate((element) => element.getBoundingClientRect().width)
  expect(after).toBeGreaterThan(before + 40)

  expect(errors).toEqual([])
})

story("the inspector becomes a bottom sheet without a drag handle when narrow", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--narrow")
  await expect(root.locator('[data-slot="graph-canvas-host"]')).toHaveAttribute("data-graph-ready", "true", {
    timeout: 30_000,
  })

  const gutter = root.locator('[data-slot="graph-inspector-gutter"]')

  await expect(gutter).toHaveAttribute("data-layout", "sheet")
  await expect(root.locator('[data-slot="graph-inspector-resize"]')).toHaveCount(0)

  // The sheet sits at the bottom and still shows readable detail.
  const gutterBox = await gutter.boundingBox()
  const rootBox = await root.boundingBox()
  expect(gutterBox!.y).toBeGreaterThan(rootBox!.y + rootBox!.height / 2)
  await expect(root.locator('[data-slot="graph-inspector"]')).toContainText("Tool call")

  // LE.4: the sheet is a real sibling below the canvas, not an overlay, so the canvas is sized to the
  // area above it and never frames content behind the sheet.
  const canvasBox = await root.locator('[data-slot="graph-canvas-region"]').boundingBox()
  expect(canvasBox!.y + canvasBox!.height).toBeLessThanOrEqual(gutterBox!.y + 1)

  expect(errors).toEqual([])
})

// LE.8/LE.9: the ribbon and matrix are switchable layouts of the same model. The screenshot batch
// is their acceptance contract, but the wiring (the chooser, the level, the expand into the node-link
// map) is proven here deterministically.
story("the turn ribbon renders per-turn segments and expands into the graph", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--ribbon")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  await expect.poll(() => host.locator('[data-kind="turn"]').count()).toBeGreaterThan(0)
  await expect.poll(() => host.locator('[data-kind="phase"]').count()).toBeGreaterThan(0)

  const toolbar = root.locator('[data-slot="graph-toolbar"]')
  await expect(toolbar.locator('[data-slot="graph-layout-name"]')).toHaveText("Ribbon")
  // T17.1: the level means the same thing in every layout, so it is never disabled.
  await expect(toolbar.getByRole("button", { name: "Overview", exact: true })).toBeEnabled()

  // Selecting a segment offers the expand control, which opens the node-link map with the node selected.
  await page.evaluate(() => (window as unknown as RefineWindow).__graphView!.select("session"))
  await root.locator('[data-slot="graph-toolbar-view"] > summary').click()
  const expand = toolbar.getByRole("button", { name: "Open in graph", exact: true })
  await expect(expand).toBeVisible()
  await expand.click()

  await expect(toolbar.locator('[data-slot="graph-layout-name"]')).toHaveText("Lanes")
  await expect(toolbar.getByRole("button", { name: "Overview", exact: true })).toBeEnabled()
  await expect(root.locator('[data-slot="graph-inspector"]')).toContainText("Session")

  expect(errors).toEqual([])
})

// LE.12: the file-first lens. The rail lists the session's written files in order; selecting one
// selects the file node so the inspector names its writers, inverting the "why did this change?".
story("the changed-files rail lists written files and selects one on click", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  const toolbar = root.locator('[data-slot="graph-toolbar"]')
  await root.locator('[data-slot="graph-toolbar-view"] > summary').click()
  const toggle = toolbar.getByRole("button", { name: "Toggle changed files", exact: true })
  await expect(toggle).toHaveAttribute("aria-pressed", "false")
  await toggle.click()

  const rail = root.locator('[data-slot="graph-file-rail"]')
  await expect(rail).toBeVisible()
  await expect(rail).toContainText("src/auth/token.ts")

  await rail.locator('[data-slot="graph-file-rail-item"]', { hasText: "src/auth/token.ts" }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as RefineWindow).__graphView!.selected()))
    .toBe("file:src/auth/token.ts")
  await expect(root.locator('[data-slot="graph-inspector"]')).toContainText("src/auth/token.ts")

  expect(errors).toEqual([])
})

story("the turn matrix places phases in category columns", async ({ mount, page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  const root = await mount("session-graph-view--matrix")
  const host = root.locator('[data-slot="graph-canvas-host"]')
  await expect(host).toHaveAttribute("data-graph-ready", "true", { timeout: 30_000 })

  await expect.poll(() => host.locator('[data-kind="phase"]').count()).toBeGreaterThan(0)
  await expect(root.locator('[data-slot="graph-toolbar"]').locator('[data-slot="graph-layout-name"]')).toHaveText(
    "Matrix",
  )

  expect(errors).toEqual([])
})
