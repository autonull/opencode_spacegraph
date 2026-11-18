import path from "path"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { FileSystem } from "@opencode/core/filesystem"
import { Location } from "@opencode/core/location"
import { Vcs } from "@opencode/core/vcs"
import { Api } from "../api"
import { collectWorkspaceSnapshot } from "../graph/snapshot"
import { response } from "../location"

export const GraphHandler = HttpApiBuilder.group(Api, "server.graph", (handlers) =>
  handlers.handle("graph.workspace", (ctx) =>
    response(
      Effect.gen(function* () {
        const fs = yield* FileSystem.Service
        const vcs = yield* Vcs.Service
        const location = yield* Location.Service
        const root = location.directory
        return yield* collectWorkspaceSnapshot({
          fs,
          vcs,
          root,
          workspaceName: path.basename(root),
          scope: ctx.query.scope ?? "session",
          paths: ctx.query.paths?.split(",").filter(Boolean) ?? [],
        })
      }),
    ),
  ),
)
