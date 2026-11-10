# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: component-tests/graph-states.spec.ts >> shows the empty state when the session has no activity
- Location: component-tests/graph-states.spec.ts:6:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/?id=session-graph-view--empty", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test"
  2  | import type { Locator } from "@playwright/test"
  3  | 
  4  | export { expect }
  5  | 
  6  | /**
  7  |  * The dev server URL of a source module, in the form Vite rewrites imports to. A different spelling, such as
  8  |  * `/@fs//Users/...`, loads a second instance of the module, whose contexts the rest of the page never provides.
  9  |  */
  10 | export const sourceURL = (url: URL) => `/@fs${url.pathname}`
  11 | 
  12 | export const story = test.extend<{
  13 |   mount: (
  14 |     id: string,
  15 |     options?: { args?: Record<string, string | boolean>; globals?: Record<string, string> },
  16 |   ) => Promise<Locator>
  17 | }>({
  18 |   mount: async ({ page }, use) => {
  19 |     await use(async (id, options) => {
  20 |       const query = new URLSearchParams({ id })
  21 |       if (options?.args) {
  22 |         query.set(
  23 |           "args",
  24 |           Object.entries(options.args)
  25 |             .map(([key, value]) => `${key}:${value}`)
  26 |             .join(";"),
  27 |         )
  28 |       }
  29 |       if (options?.globals) {
  30 |         query.set(
  31 |           "globals",
  32 |           Object.entries(options.globals)
  33 |             .map(([key, value]) => `${key}:${value}`)
  34 |             .join(";"),
  35 |         )
  36 |       }
> 37 |       await page.goto(`/?${query}`)
     |                  ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  38 |       const root = page.locator("#story-root")
  39 |       await expect(root).toBeVisible({ timeout: 30_000 })
  40 |       return root
  41 |     })
  42 |   },
  43 | })
  44 | 
```