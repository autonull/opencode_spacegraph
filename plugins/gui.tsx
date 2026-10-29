import { Plugin, Style } from "@opencode/plugin/gui"
import definition from "../packages/gui-plugins/src/spacegraph"
import setup from "./renderer"
import css from "./style.css?inline"

export default Plugin.define({
  ...definition,
  setup(ctx) {
    ctx.add(Style, css)
    setup(ctx)
  },
})
