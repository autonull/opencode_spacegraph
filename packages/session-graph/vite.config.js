import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import solid from "vite-plugin-solid";
export default defineConfig({
    plugins: [
        solid(),
        dts({ insertTypesEntry: true, tsconfigPath: "./tsconfig.json" }),
    ],
    build: {
        lib: {
            entry: "./src/index.ts",
            name: "SessionGraph",
            fileName: "index",
            formats: ["es"],
        },
        rollupOptions: {
            external: [
                "solid-js",
                "effect",
                "@opencode/session-ui",
                "@opencode/ui",
                "@spacegraphjs/adapter",
                "@spacegraphjs/cytoscape-renderer",
                "@spacegraphjs/renderer",
                "@spacegraphjs/spacegraph-renderer",
                "@spacegraphjs/svg-renderer",
                "spacegraphjs",
            ],
            output: {
                globals: { "solid-js": "Solid" },
            },
        },
    },
});
