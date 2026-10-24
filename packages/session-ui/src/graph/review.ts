import { diffKernels } from "@spacegraphjs/kernel"
import type { GraphModel } from "./model"
import { graphModelToKernel, graphViewMeta, toGraphView } from "./view"

export type ReviewChanges = {
  added: readonly string[]
  removed: readonly string[]
  changed: readonly string[]
}

export const reviewChanges = (before: GraphModel, after: GraphModel): ReviewChanges => {
  const diff = diffKernels(graphModelToKernel(before), graphModelToKernel(after))
  return {
    added: diff.nodes.added.map((node) => node.id),
    removed: diff.nodes.removed.map((node) => node.id),
    changed: diff.nodes.changed.map((change) => change.id),
  }
}

export const reviewModel = (before: GraphModel, after: GraphModel): GraphModel => {
  const beforeKernel = graphModelToKernel(before)
  const afterKernel = graphModelToKernel(after)
  const diff = diffKernels(beforeKernel, afterKernel)
  const ids = new Set<string>()
  for (const node of diff.nodes.added) ids.add(node.id)
  for (const change of diff.nodes.changed) ids.add(change.id)
  for (const edge of diff.edges.added) {
    ids.add(edge.source)
    ids.add(edge.target)
  }
  for (const change of diff.edges.changed) {
    ids.add(change.after.source)
    ids.add(change.after.target)
  }
  return toGraphView(afterKernel.subgraph(ids), graphViewMeta(after))
}
