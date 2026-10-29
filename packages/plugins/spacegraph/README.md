# SpaceGraph GUI plugin

The graph feature from `packages/gui-plugins/src/spacegraph` packaged as an external `./gui-experimental` bundle.

```sh
bun run build   # writes dist/gui-experimental.cjs
bun test        # builds if needed; checks the manifest and evaluates the bundle with the real host
bun typecheck
```

## Loading it locally

The app reads a server plugin's `./gui-experimental` bundle. This package is GUI-only: its `exports` names only
`./gui-experimental`, so `Host.resolve` finds no `server`/`tui` entry and lists it for its GUI part.

1. Build.
2. Add this directory to the `plugins` list in the opencode config used by the app you are testing, for example:

   ```json
   { "plugins": ["./packages/plugins/spacegraph"] }
   ```

   A relative path is resolved from the config file's directory. `.opencode/plugins/` is auto-discovered too.
3. Reload the app window (or restart the server if the plugin list is not picked up).

The bundle requires only `effect`, `@opencode/plugin/gui`, `solid-js`, `solid-js/store` and `solid-js/web`, which the
app provides. It registers the side `Panel` map, commands, the settings page and the menu item; on hosts that expose
`ctx.surfaces` it also registers the map, hybrid and turn-map views.

## Publishing

`spacegraphjs` is bundled into `dist/gui-experimental.cjs`, so it is not a peer dependency. The only host module the
tarball depends on is `@opencode/plugin`.

```sh
npm pack          # runs `prepack`, then contains only dist/gui-experimental.cjs, README.md and package.json
npm publish --access public
```

Install the published package in the target app and list it by package name:

```json
{ "plugins": ["@autonull/opencode-plugin-spacegraph"] }
```

Verify `npm pack` contents and a scratch install (`npm install <tarball>`, then confirm the export resolves to
`dist/gui-experimental.cjs`) before retiring the built-in registration.
