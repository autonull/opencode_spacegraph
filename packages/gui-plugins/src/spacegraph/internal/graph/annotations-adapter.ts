// Annotations adapter: delegates to @spacegraphjs/overlays with OpenCode-specific policy.

import type { GraphNode, GraphEdge, GraphViewData } from "./model";
import {
  withAnnotations as overlaysWithAnnotations,
  createDefaultNoteNodePolicy,
  type Annotation as OverlaysAnnotation,
  type Annotations as OverlaysAnnotations,
  type NoteNodePolicy,
} from "@spacegraphjs/overlays";

/** C1 — a reader-authored note. Session-local until the app's line-comment store owns it. */
export type Annotation = OverlaysAnnotation;

export type Annotations = OverlaysAnnotations;

export const noteNodeID = (id: string) => `note:${id}`;

/**
 * C1 — notes are nodes with one `annotates` edge, so search, export, layout, and scoping work
 * without a substrate change. The note inherits its target's turn, so scrubbing keeps it beside
 * the thing it is about and never strands it in another turn.
 * Delegates to @spacegraphjs/overlays with OpenCode-specific note node policy.
 */
export const withAnnotations = (model: GraphViewData, annotations: Annotations): GraphViewData => {
  const policy = createOpenCodeNoteNodePolicy();
    const result = overlaysWithAnnotations(model as any, annotations as any, policy);
    return {
    ...model,
        nodes: result.nodes as GraphNode[],
        edges: result.edges as GraphEdge[],
  };
};

/** OpenCode-specific note node policy. */
function createOpenCodeNoteNodePolicy(): NoteNodePolicy<string> {
  const basePolicy = createDefaultNoteNodePolicy<string>("note:");
    return {
    ...basePolicy,
    noteNodeID: (annotationID: string) => `note:${annotationID}`,
    createNoteNode: (
      annotation: Annotation,
      targetNode: { id: string; turnID?: string; kind: string },
      policy: NoteNodePolicy<string>,
    ) => {
      const turnID = targetNode.kind === "turn" ? targetNode.id : targetNode.turnID;
            return {
        id: policy.noteNodeID(annotation.id),
        kind: "note",
        label: annotation.body.split("\n")[0] || annotation.body,
        summary: annotation.body,
        status: "neutral",
        minLevel: "execution",
                ...(turnID === undefined ? {} : { turnID }),
                ...(annotation.createdAt === undefined ? {} : { time: annotation.createdAt }),
        data: { noteID: annotation.id, target: annotation.target },
      };
    },
  };
}