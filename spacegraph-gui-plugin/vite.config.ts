import { fileURLToPath } from "node:url"
import { gui } from "@opencode/plugin/gui/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: gui({ entry: "src/gui.tsx", outFile: "dist/gui-experimental.cjs" }),
  resolve: {
    alias: {
      "onnxruntime-web": fileURLToPath(new URL("./src/onnx-stub.ts", import.meta.url)),
    },
  },
})
