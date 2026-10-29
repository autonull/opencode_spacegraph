import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { gui } from "@opencode/plugin/gui/vite"
import { defineConfig } from "vite"

const repo = path.resolve(import.meta.dirname, "..")
const here = import.meta.dirname
const at = (...parts: string[]) => path.join(repo, ...parts)
const exact = (name: string, file: string) => ({ find: new RegExp(`^${name}$`), replacement: at(file) })

export default defineConfig({
  root: here,
  resolve: {
    alias: [
      exact("spacegraphjs", "spacegraphjs/src/index.ts"),
      exact("spacegraphjs/activity", "spacegraphjs/src/activity.ts"),
      exact("spacegraphjs/control", "spacegraphjs/src/control/index.ts"),
      exact("spacegraphjs/a11y", "spacegraphjs/src/a11y/index.ts"),
      exact("spacegraphjs/navigation", "spacegraphjs/src/navigation/index.ts"),
      exact("spacegraphjs/overlays", "spacegraphjs/src/overlays/index.ts"),
      exact("spacegraphjs/levels", "spacegraphjs/src/levels/index.ts"),
      exact("spacegraphjs/zoom", "spacegraphjs/src/zoom/index.ts"),
      exact("spacegraphjs/utils", "spacegraphjs/src/utils/index.ts"),
      exact("spacegraphjs/layout", "spacegraphjs/src/layout/index.ts"),
      exact("spacegraphjs/representations", "spacegraphjs/src/representations/index.ts"),
      exact("@opencode/session-graph", "packages/session-graph/src/index.ts"),
      exact("@opencode/session-ui/graph", "packages/session-ui/src/graph/index.ts"),
      exact("@opencode/gui-plugins/spacegraph", "packages/gui-plugins/src/spacegraph/index.ts"),
      exact("@opencode/gui-plugins/spacegraph/external", "packages/gui-plugins/src/spacegraph/external/renderer.tsx"),
      exact("@opencode/ui/icon", "packages/ui/src/icons/icon/icon.tsx"),
      exact("@opencode/ui/icon-button", "packages/ui/src/actions/icon-button/icon-button.tsx"),
      exact("@opencode/ui/segmented-control", "packages/ui/src/navigation/segmented-control/segmented-control.tsx"),
      {
        find: /^@opencode\/ui\/context\/i18n$/,
        replacement: at("packages/gui-plugins/src/spacegraph/external/i18n.ts"),
      },
      { find: /^onnxruntime-web.*$/, replacement: path.join(here, "stubs/onnx.ts") },
      { find: /^@spacegraphjs\/cytoscape-renderer$/, replacement: path.join(here, "stubs/cytoscape.ts") },
    ],
  },
  plugins: [
    tailwindcss(),
    gui({ entry: path.join(here, "gui.tsx"), outFile: path.join(here, "dist/gui-experimental.cjs") }),
  ],
})
