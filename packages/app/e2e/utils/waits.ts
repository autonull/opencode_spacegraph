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

  // Session title is in the tab strip as a link with data-slot="tab-link"
  await expectAppVisible(page.locator('[data-slot="tab-link"]').getByText(title, { exact: true }))
}

export async function expectSessionReady(page: Page, input: { server: string; sessionID: string; title: string }) {
  await expect(page).toHaveURL(sessionHref(input.sessionID, input.server))
  await expectSessionTitle(page, input.title)
}
