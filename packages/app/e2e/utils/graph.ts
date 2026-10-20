import type { Page } from "@playwright/test"

// The session graph sits behind `experimental.sessionGraph`, which the app reads from its `settings.v3`
// storage key. The timeline harness rewrites that key on every navigation, so the flag is merged into
// whatever is written instead of being written once: a reload keeps the graph available.
export async function seedSessionGraph(page: Page) {
  await page.addInitScript(() => {
    const key = "settings.v3"
    const write = Storage.prototype.setItem

    const merge = (value: string) => {
      const current = JSON.parse(value)

      return JSON.stringify({
        ...current,
        experimental: { ...(current.experimental ?? {}), sessionGraph: true },
      })
    }

    Storage.prototype.setItem = function (name: string, value: string) {
      if (name !== key) {
        write.call(this, name, value)

        return
      }

      write.call(this, name, merge(value))
    }

    // The harness may write the key after this script, but it may not write it at all.
    const stored = localStorage.getItem(key)

    localStorage.setItem(key, stored ? merge(stored) : JSON.stringify({ experimental: { sessionGraph: true } }))
  })
}
