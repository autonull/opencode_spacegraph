import { Plugin, Style } from "@opencode/plugin/gui"
import definition from "@opencode/gui-plugins/spacegraph"
import setup from "@opencode/gui-plugins/spacegraph/external"
import css from "./style.css?inline"

export default Plugin.define({
  ...definition,
  setup(ctx) {
    ctx.add(Style, css)
    setup(ctx)
  },
})
