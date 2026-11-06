import { onCleanup } from "solid-js"
import { onIdle } from "@opencode/plugin/gui/builtin"
import type { Plugin } from "@opencode/plugin/gui"
import setup from "./external/renderer"
import type definition from "./index"

/** The built-in adds only the idle preload to the setup the external bundle also ships. */
const builtin: Plugin.Setup<typeof definition> = (ctx) => {
  onCleanup(onIdle(() => void import("./panel")))
  setup(ctx)
}

export default builtin
