# When to Use SessionSurface vs Panel vs MobileView

The GUI plugin SDK provides several ways to contribute UI. Choose based on your use case:

## SessionSurface

**Use for:** Full-session-body views that replace the transcript entirely.

- Session map / graph visualization
- Custom timeline rendering
- Hybrid transcript + map compositions
- Any view where the transcript should stay mounted but hidden

**Characteristics:**
- One selected surface per session at a time
- Transcript element passed in, kept mounted across switches
- Optional layers for overlays (e.g., turn map)
- Ordered list with transcript always first
- Reactive `current(session)` and `select(id, session)` host API

```ts
ctx.add(SessionSurface, {
  id: "my-plugin.map",
  title: ctx.t("map"),
  icon: "map",
  order: 10,
  render: ({ session, screen, transcript }) => <Map transcript={transcript} />,
  layers: [{ id: "overlay", render: ({ surface }) => <Overlay surface={surface} /> }],
})
```

## Panel

**Use for:** Tabbed content in the side region.

- File tree, search, extensions, settings
- Multiple panels per session (tabbed)
- Content that complements the transcript, not replaces it

**Characteristics:**
- Tabbed UI in side region (left/right)
- Multiple panels can be open simultaneously
- Each panel has its own tab with title, icon, closable
- Mobile: appears in bottom tab bar

```ts
ctx.add(Panel, {
  id: "my-panel",
  region: "side",
  mobile: { title: ctx.t("panel"), icon: "file-tree", order: 10, kind: "menu" },
  list: (input) => input.open.includes("my-panel") ? [{ id: "main", title: ctx.t("panel") }] : [],
  render: (input) => <PanelContent session={input.session} screen={input.screen} />,
})
```

## MobileView

**Use for:** Mobile-only views that appear in the mobile tab switcher.

- Bottom sheets, drawers, full-screen mobile views
- Can be `kind: "surface"` to appear alongside tabs in the mobile switcher
- Can be `kind: "menu"` for launcher-style entries

```ts
ctx.add(MobileView, {
  id: "my-mobile",
  get title() { return ctx.t("mobile") },
  icon: "sidebar",
  kind: "surface", // appears in mobile tab switcher
  order: 20,
  render: ({ session, screen }) => <MobileContent session={session} />,
})
```

## Slot

**Use for:** Fixed-position inline content.

- Session header actions, composer pills, timeline rows
- Content that appears at a specific anchor point

```ts
ctx.add(Slot, {
  at: "session.panel.end",
  order: 10,
  render: ({ session, screen }) => <CustomAction session={session} />,
})
```

## Command

**Use for:** Keyboard shortcuts, command palette entries — no persistent UI.

```ts
ctx.add(Command, {
  id: "my-command",
  title: ctx.t("command"),
  bind: "mod+shift+m",
  section: "session",
  run: () => ctx.surfaces.select("my-plugin.map", ctx.sessions.current()!),
})
```

## Quick Decision Guide

```
Does it replace the entire session body (transcript)?
├── Yes → SessionSurface
└── No → Is it tabbed side content?
         ├── Yes → Panel
         ├── No → Is it mobile-only?
         │         ├── Yes → MobileView
         │         └── No → Is it fixed-position inline?
         │                   ├── Yes → Slot
         │                   └── No → Command (if just an action)
```

## Surface vs Panel: Key Difference

| Aspect | SessionSurface | Panel |
|--------|----------------|-------|
| Replaces transcript | Yes | No (side region) |
| Transcript mounted | Yes (hidden) | N/A |
| Multiple simultaneous | No (one selected) | Yes (tabs) |
| Mobile behavior | Custom | Tab bar entry |
| Layers/overlays | Supported | No |
| Use case | Map, custom timeline | File tree, search |