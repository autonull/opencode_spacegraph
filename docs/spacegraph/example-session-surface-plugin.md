# Example: Minimal Plugin Contributing a SessionSurface

This example demonstrates how to create a plugin that contributes a `SessionSurface` — a full-session-body view like a map, timeline, or custom visualization.

## Plugin Structure

```
my-session-map/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── index.ts          # Plugin entry point
│   ├── map-surface.tsx   # The surface component
│   └── style.css         # Styles (optional)
└── README.md
```

## Package.json

```json
{
  "name": "@myorg/opencode-plugin-session-map",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.cjs",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "vite build",
    "prepack": "bun run build"
  },
  "peerDependencies": {
    "@opencode/plugin": "*",
    "solid-js": "^1.8.0"
  },
  "devDependencies": {
    "@opencode/plugin": "workspace:*",
    "solid-js": "^1.8.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

## Plugin Entry Point (src/index.ts)

```ts
import { Plugin, SessionSurface } from "@opencode/plugin/gui"
import { MapSurface } from "./map-surface"
import css from "./style.css?inline"

export default Plugin.define({
  id: "my-session-map",
  name: "My Session Map",
  description: "A custom session surface showing a session map",
  setup(ctx) {
    ctx.add(SessionSurface, {
      id: "my-session-map.map",
      title: ctx.t("surface.title"),
      icon: "map",
      order: 10,
      render: ({ session, screen, transcript }) => (
        <MapSurface session={session} screen={screen} transcript={transcript} />
      ),
    })
  },
})
```

## Surface Component (src/map-surface.tsx)

```tsx
import { createMemo, JSX } from "solid-js"
import type { MountedSession, SessionScreen } from "@opencode/plugin/gui"

interface MapSurfaceProps {
  session: MountedSession
  screen: SessionScreen
  transcript: JSX.Element
}

export function MapSurface({ session, screen, transcript }: MapSurfaceProps) {
  // Derive graph data from the session
  const graphData = createMemo(() => {
    const messages = session.server.data.session.message.list()
    // Build your graph model from messages...
    return { nodes: [], edges: [] }
  })

  return (
    <div class="map-surface" data-slot="my-session-map-surface">
      {/* Your map visualization */}
      <div class="map-canvas">
        {/* Render nodes/edges from graphData */}
      </div>

      {/* The transcript is passed in — keep it mounted even if hidden */}
      <Show when={false}>
        {transcript}
      </Show>
    </div>
  )
}
```

## Key Points

1. **Surface ID**: Must be unique. Convention: `${pluginId}.${surfaceName}`. The host reserves `transcript`.

2. **Icon**: Use the `map` icon (added to `@opencode/plugin/gui` icon catalog) or any other catalog icon.

3. **Transcript**: The host passes a pre-mounted transcript element. **Must keep it mounted** (e.g., with `visibility: hidden` or `Show when={false}`) so its virtualizer and scroll position survive surface switches.

4. **Order**: Surfaces list in ascending `order`. Default is 0. The transcript is always first.

5. **Layers**: Optional overlays rendered above the surface body (e.g., a turn map). Same input + `surface` reference.

```ts
ctx.add(SessionSurface, {
  id: "my-session-map.map",
  title: ctx.t("surface.title"),
  icon: "map",
  order: 10,
  render: ({ session, screen, transcript }) => <MapSurface ... />,
  layers: [
    {
      id: "turn-map",
      render: ({ session, screen, surface }) => <TurnMapLayer ... />,
    },
  ],
})
```

## When to Use SessionSurface vs Panel vs MobileView

| Use Case | API | Reason |
|----------|-----|--------|
| Full-session-body replacement (map, custom timeline, hybrid view) | `SessionSurface` | Owns the entire session body; transcript stays mounted |
| Side panel with tabs (file tree, search, extensions) | `Panel` | Tabbed UI in side region; multiple panels per session |
| Mobile-only view (bottom sheet, drawer) | `MobileView.kind: "surface"` | Appears in mobile tab switcher alongside tabs |
| Small inline content (status, badges) | `Slot` | Fixed positions in header, composer, etc. |
| Commands only (no UI) | `Command` | Keyboard shortcuts, palette entries |

## Registering the Plugin

Add to your opencode config:

```json
{
  "plugins": {
    "my-session-map": {
      "enabled": true
    }
  }
}
```

Or install as a third-party plugin bundle (`.gui-experimental` file) through the Extensions UI.