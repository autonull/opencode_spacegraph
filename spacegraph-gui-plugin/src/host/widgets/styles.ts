import composer from "./composer-node-widget.css?inline"
import shared from "./node-widgets.css?inline"
import subagent from "./subagent-node-widget.css?inline"

/** Widget CSS is contributed once through the plugin's `Style` registration. */
export const widgetCss = `${shared}\n${composer}\n${subagent}`
