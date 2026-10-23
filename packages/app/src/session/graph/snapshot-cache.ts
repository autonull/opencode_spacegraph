import { type Accessor } from "solid-js"
import { createStore } from "solid-js/store"
import type { WorkspaceSnapshot } from "@opencode/client/promise"
import type { ServerSDK } from "@/runtime/server/client"

/**
 * One tab's in-memory cache of the workspace snapshot. The snapshot is versioned and
 * invalidated by the server's revision, so we cache by revision and scope. A failed load
 * leaves the snapshot unloaded so the next request retries.
 */
export function createSnapshotCache(
  serverSDK: ServerSDK,
  directory: Accessor<string>,
  sessionID: Accessor<string | undefined>,
) {
  const [snapshots, setSnapshots] = createStore<Record<string, WorkspaceSnapshot | undefined>>({})
  const loading = new Set<string>()

  const key = (scope: "session" | "directory" | "workspace", paths?: string) =>
    `${directory()}/${scope}/${paths ?? ""}`

  const fetchSnapshot = async (scope: "session" | "directory" | "workspace", paths?: string): Promise<WorkspaceSnapshot> => {
    return serverSDK.api.server.graph.workspace({
      location: { directory: directory() },
      scope,
      paths,
    })
  }

  return {
    get: (scope: "session" | "directory" | "workspace", paths?: string) => {
      const k = key(scope, paths)
      return snapshots[k]
    },
    load: (scope: "session" | "directory" | "workspace", paths?: string) => {
      const k = key(scope, paths)

      if (snapshots[k] || loading.has(k)) return
      loading.add(k)

      void fetchSnapshot(scope, paths)
        .then(
          (value) => setSnapshots(k, value),
          () => undefined,
        )
        .finally(() => loading.delete(k))
    },
  }
}
