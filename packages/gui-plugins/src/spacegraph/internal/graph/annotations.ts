import type { GraphEdge, GraphNode, GraphViewData } from "./model"

/** C1 — a reader-authored note. Session-local until the app's line-comment store owns it. */
export type Annotation = {
  id: string
  /** The node the note annotates. */
  target: string
  body: string
  createdAt?: number
}

export type Annotations = Record<string, Annotation>

export const noteNodeID = (id: string) => `note:${id}`

/**
 * C1 — notes are nodes with one `annotates` edge, so search, export, layout, and scoping work
 * without a substrate change. The note inherits its target's turn, so scrubbing keeps it beside
 * the thing it is about and never strands it in another turn.
 */
export const withAnnotations = (model: GraphViewData, annotations: Annotations): GraphViewData => {
  const entries = Object.values(annotations)
  if (entries.length === 0) return model
  const nodes = new Map(model.nodes.map((node) => [node.id, node]))
  const noteNodes: GraphNode[] = []
  const noteEdges: GraphEdge[] = []

  for (const annotation of entries) {
    const target = nodes.get(annotation.target)
    if (!target) continue
    const id = noteNodeID(annotation.id)
    const turnID = target.kind === "turn" ? target.id : target.turnID
    noteNodes.push({
      id,
      kind: "note",
      label: annotation.body.split("\n")[0] || annotation.body,
      summary: annotation.body,
      status: "neutral",
      minLevel: "execution",
      ...(turnID === undefined ? {} : { turnID }),
      ...(annotation.createdAt === undefined ? {} : { time: annotation.createdAt }),
      data: { noteID: annotation.id, target: annotation.target },
    })
    noteEdges.push({
      id: `annotates:${annotation.id}`,
      kind: "annotates",
      source: id,
      target: annotation.target,
      confidence: "explicit",
    })
  }

  if (noteNodes.length === 0) return model

  return {
    ...model,
    nodes: [...model.nodes, ...noteNodes],
    edges: [...model.edges, ...noteEdges],
  }
}
