import { Command, SessionSurface, type Plugin } from "@opencode/plugin/gui"
import type definition from "./index"
import { createSpacegraph } from "./model"
import { MapSurface } from "./map-surface"
import { HybridSurface } from "./hybrid-surface"

const setup: Plugin.Setup<typeof definition> = (ctx) => {
  const model = createSpacegraph(ctx)
  const select = (id: string) => {
    const session = ctx.sessions.current()

    if (session) ctx.surfaces.select(id, session)
  }

  ctx.add(SessionSurface, {
    id: `${ctx.id}.map`,
    title: ctx.t("surface.map"),
    order: 10,
    render: ({ session, screen, transcript }) => (
      <MapSurface model={model} session={session} screen={screen} transcript={transcript} />
    ),
  })

  ctx.add(SessionSurface, {
    id: `${ctx.id}.hybrid`,
    title: ctx.t("surface.hybrid"),
    order: 20,
    render: ({ session, screen, transcript }) => (
      <HybridSurface model={model} session={session} screen={screen} transcript={transcript} />
    ),
  })

  ctx.add(Command, (): Command | undefined => {
    if (!ctx.sessions.current()) return undefined

    return {
      id: "map",
      title: ctx.t("command.map"),
      group: ctx.t("command.group"),
      run: () => select(`${ctx.id}.map`),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    if (!ctx.sessions.current()) return undefined

    return {
      id: "hybrid",
      title: ctx.t("command.hybrid"),
      group: ctx.t("command.group"),
      run: () => select(`${ctx.id}.hybrid`),
    }
  })

  ctx.add(Command, (): Command | undefined => {
    if (!ctx.sessions.current()) return undefined

    return {
      id: "transcript",
      title: ctx.t("command.transcript"),
      group: ctx.t("command.group"),
      run: () => select("transcript"),
    }
  })
}

export default setup
