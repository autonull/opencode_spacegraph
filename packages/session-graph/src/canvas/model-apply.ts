import type { RenderModel } from "@spacegraphjs/renderer"

/**
 * M4 — an update can ride the renderer's incremental path only when nothing existing changes place
 * or identity. A streaming append qualifies; a level, layout, or projection change does not. The
 * patch path never asks the camera to fit, so an append must not move the reader's view.
 */
export function canPatchRenderModel(prev: RenderModel | null | undefined, next: RenderModel): boolean {
  if (!prev) return false

  const prevNodeIds = new Set(prev.nodes.map((node) => node.id))
  const nextNodeIds = new Set(next.nodes.map((node) => node.id))

  for (const id of prevNodeIds) {
    if (!nextNodeIds.has(id)) return false
  }

  const prevNodes = new Map(prev.nodes.map((node) => [node.id, node]))

  for (const nextNode of next.nodes) {
    const prevNode = prevNodes.get(nextNode.id)
    if (!prevNode) continue
    if (prevNode.kind !== nextNode.kind) return false
    if (prevNode.shape !== nextNode.shape) return false
    if (
      prevNode.position[0] !== nextNode.position[0] ||
      prevNode.position[1] !== nextNode.position[1] ||
      prevNode.position[2] !== nextNode.position[2]
    ) {
      return false
    }
  }

  const prevEdgeIds = new Set(prev.edges.map((edge) => edge.id))
  const nextEdgeIds = new Set(next.edges.map((edge) => edge.id))

  for (const id of prevEdgeIds) {
    if (!nextEdgeIds.has(id)) return false
  }

  return true
}

/** Which renderer call a model update takes: the incremental patch, or a full rebuild. */
export function modelUpdatePath(
  prev: RenderModel | null | undefined,
  next: RenderModel,
  hasApplyPatch: boolean,
): "patch" | "set" {
  return hasApplyPatch && canPatchRenderModel(prev, next) ? "patch" : "set"
}
