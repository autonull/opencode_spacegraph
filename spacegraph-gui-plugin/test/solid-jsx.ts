import { plugin } from "bun"

// Bun has no Solid compiler. Compile the imported TSX sources against Solid's hyperscript runtime so
// their JSX does not import the missing `solid-js/jsx-runtime` exports (the browser build uses
// vite-plugin-solid). Bun's transpiler emits hashed helper names without an import, so bind them here.
const transpiler = new Bun.Transpiler({
  loader: "tsx",
  tsconfig: { compilerOptions: { jsx: "react-jsx", jsxImportSource: "solid-js/h" } },
})

plugin({
  name: "spacegraph-plugin-solid-jsx",
  setup(build) {
    build.onLoad({ filter: /\.tsx$/ }, async (args) => {
      const transformed = transpiler.transformSync(await Bun.file(args.path).text())
      const contents = transformed
        .replace(/\bjsx_[a-z0-9]+(?=\s*\()/g, "jsx")
        .replace(/\bjsxs_[a-z0-9]+(?=\s*\()/g, "jsxs")
      return {
        contents: `import { jsx, jsxs, Fragment } from "solid-js/h/jsx-runtime";\n${contents}`,
        loader: "js",
      }
    })
  },
})
