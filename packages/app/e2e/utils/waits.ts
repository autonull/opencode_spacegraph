import { expect, type Locator, type Page } from "@playwright/test"
import { sessionHref } from "./app"

export const APP_READY_TIMEOUT = 30_000

export async function expectAppVisible(locator: Locator) {
  await expect(locator).toBeVisible({ timeout: APP_READY_TIMEOUT })
}

export async function expectSessionTitle(page: Page, title: string) {
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    const trigger = page.locator('[data-slot="mobile-tabs-trigger"]')
    await expectAppVisible(trigger)
    await expect(trigger.locator('span[dir="auto"]')).toHaveText(title, { timeout: APP_READY_TIMEOUT })

    return
  }

  await expectAppVisible(page.getByRole("heading", { name: title }))
}

export async function expectSessionReady(page: Page, input: { server: string; sessionID: string; title: string }) {
  await expect(page).toHaveURL(sessionHref(input.sessionID, input.server))
  await expectSessionTitle(page, input.title)
}

export async function waitForGraphContent(page: Page): Promise<void> {
  // Wait for the graph canvas to be present and the renderer to signal readiness
  const canvasHost = page.locator('[data-slot="graph-canvas-host"]')
  await expect(canvasHost).toBeVisible({ timeout: APP_READY_TIMEOUT })
  // Wait for the graph to be fully rendered (data-graph-ready attribute)
  await expect(canvasHost).toHaveAttribute("data-graph-ready", "true", { timeout: APP_READY_TIMEOUT })
}
