import { Location } from "@opencode/schema/location"
import { optional } from "@opencode/schema/schema"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"
import { Snapshot, SCOPES } from "../workspace-snapshot.js"
import { LocationQuery, locationQueryOpenApi } from "./location.js"

const WorkspaceQuery = Schema.Struct({
  ...LocationQuery.fields,
  scope: Schema.Literals(SCOPES).pipe(optional),
  /**
   * Comma-separated root-relative paths. Session scope treats them as the session's touched files;
   * directory scope takes the first as the directory to list. Workspace scope ignores them.
   */
  paths: optional(Schema.String),
}).annotate({ identifier: "WorkspaceSnapshot.Query" })

export const GraphGroup = HttpApiGroup.make("server.graph")
  .add(
    HttpApiEndpoint.get("graph.workspace", "/api/graph/workspace", {
      query: WorkspaceQuery,
      success: Location.response(Snapshot),
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "graph.workspace",
          summary: "Workspace snapshot",
          description:
            "Assemble the workspace facts the graph's derived domains read. Session scope covers the supplied touched paths and their ancestors, directory scope lists one directory, and workspace scope walks the tree up to a bounded file count. A source that cannot be read appears in `missing` with a reason instead of failing the request.",
        }),
      ),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "graph",
      description: "Location-scoped graph read models.",
    }),
  )
