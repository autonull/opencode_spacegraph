// Trace adapter: converts session-ui types to @spacegraphjs/trace types and delegates classification.

import type { GraphViewData, GraphNode, GraphEdge } from "./model";
import { nodeIndex, parentIndex, childIndex, sequenceIndex } from "./lookup";
import type {
  TraceConfig,
  TraceKind,
  TraceModel,
  TraceNode,
  TraceEdge,
  TraceOverlay,
  TraceTraversal,
  TraceVocabulary,
} from "@spacegraphjs/trace";
export type { TraceKind, TraceOverlay } from "@spacegraphjs/trace";
import {
  classifyTrace as traceClassifyTrace,
  traceWhy as traceTraceWhy,
  traceLedHere as traceTraceLedHere,
  traceRelated as traceTraceRelated,
  traceDownstream as traceTraceDownstream,
  litNodeIds as traceLitNodeIds,
  isLit as traceIsLit,
  isAnswer as traceIsAnswer,
  isEdgeVisible as traceIsEdgeVisible,
  isAnswerEdge as traceIsAnswerEdge,
  stepLitNode as traceStepLitNode,
  copyTraceAsOutline as traceCopyTraceAsOutline,
} from "@spacegraphjs/trace";

const provenanceEdgeKinds = new Set<GraphEdge["kind"]>([
  "writes",
  "reads",
  "produces",
  "evidence",
]);

const readEdgeKinds = new Set<GraphEdge["kind"]>(["reads", "searches", "references"]);

const downstreamEdgeKinds: Set<string> = new Set(["sequence", "produces", "writes"]);

function toTraceNode(node: GraphNode): TraceNode {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    summary: node.summary,
    status: node.status,
    turnID: node.turnID,
    messageID: node.messageID,
    partID: node.partID,
    toolID: node.toolID,
    time: node.time,
    derived: node.derived,
    minLevel: node.minLevel,
    clusterOf: node.clusterOf,
    data: node.data as Record<string, unknown> | undefined,
  };
}

function toTraceEdge(edge: GraphEdge): TraceEdge {
  return {
    id: edge.id,
    kind: edge.kind,
    source: edge.source,
    target: edge.target,
    confidence: edge.confidence,
    label: edge.label,
    data: edge.data as Record<string, unknown> | undefined,
  };
}

function toTraceModel(model: GraphViewData): TraceModel {
  return {
    root: model.root,
    nodes: model.nodes.map(toTraceNode),
    edges: model.edges.map(toTraceEdge),
    turns: model.turns,
    turnByMessageID: model.turnByMessageID,
    activeTurn: model.activeTurn,
  };
}

function createTraversal(model: TraceModel): TraceTraversal {
  const nodeIndexMap = nodeIndex(model as any);
  const parentIndexMap = parentIndex(model as any);
  const childIndexMap = childIndex(model as any);
  const sequenceIndexMap = sequenceIndex(model as any);

  return {
    incoming: (m: TraceModel, id: string) => m.edges.filter((e) => e.target === id),
    outgoing: (m: TraceModel, id: string) => m.edges.filter((e) => e.source === id),
    ancestors: (m: TraceModel, id: string) => {
      const result: TraceNode[] = [];
      const parents = parentIndexMap;
      const nodes = nodeIndexMap;
      let current = id;
      for (;;) {
        const parent = parents.get(current);
        if (!parent) break;
        const node = nodes.get(parent);
        if (!node) break;
        result.push(node);
        current = parent;
      }
      return result;
    },
    forwardChain: (m: TraceModel, id: string) => {
      const result: TraceNode[] = [];
      const seq = sequenceIndexMap;
      const nodes = nodeIndexMap;
      let current = id;
      for (;;) {
        const next = seq.next.get(current);
        if (!next) break;
        const node = nodes.get(next);
        if (!node) break;
        result.push(node);
        current = next;
      }
      return result;
    },
    downstreamChain: (m: TraceModel, id: string) => {
      const result: { node: TraceNode; edge: TraceEdge; confidence: string }[] = [];
      const seen = new Set([id]);
      const nodes = nodeIndexMap;
      const queue = [id];
      for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        for (const edge of m.edges) {
          if (edge.source !== current) continue;
          if (!downstreamEdgeKinds.has(edge.kind)) continue;
          if (seen.has(edge.target)) continue;
          const node = nodes.get(edge.target);
          if (!node) continue;
          seen.add(edge.target);
          queue.push(edge.target);
          result.push({ node, edge, confidence: edge.confidence ?? "explicit" });
        }
      }
      return result;
    },
    nodeIndex: () => nodeIndexMap,
    parentIndex: () => parentIndexMap,
    childIndex: () => childIndexMap,
    sequenceIndex: () => sequenceIndexMap,
  };
}

function createVocabulary(): TraceVocabulary {
  return {
    provenanceEdgeKinds,
    readEdgeKinds,
    downstreamEdgeKinds,
  };
}

function createConfig(model: GraphViewData): TraceConfig {
  const traceModel = toTraceModel(model);
  return {
    model: traceModel,
    traversal: createTraversal(traceModel),
    vocabulary: createVocabulary(),
  };
}

/** Classify a trace overlay over the model using @spacegraphjs/trace. */
export function classifyTrace(model: GraphViewData, kind: TraceKind, from: string): TraceOverlay {
  const config = createConfig(model);
  return traceClassifyTrace(config, kind, from);
}

/** Build a trace overlay for "Why?" — the edges that point at the node, its ancestors, and sequence predecessor. */
export function traceWhy(model: GraphViewData, from: string): TraceOverlay {
  const config = createConfig(model);
  return traceTraceWhy(config, from);
}

/** Build a trace overlay for "What led here?" — the forward chain in the turn's sequence. */
export function traceLedHere(model: GraphViewData, from: string): TraceOverlay {
  const config = createConfig(model);
  return traceTraceLedHere(config, from);
}

/** Build a trace overlay for "Related" — incoming and outgoing neighbors. */
export function traceRelated(model: GraphViewData, from: string): TraceOverlay {
  const config = createConfig(model);
  return traceTraceRelated(config, from);
}

/** Build a trace overlay for "Downstream impact" — follow sequence/produces/writes edges forward. */
export function traceDownstream(model: GraphViewData, from: string): TraceOverlay {
  const config = createConfig(model);
  return traceTraceDownstream(config, from);
}

/** Get all lit node IDs (answer + context) for a trace overlay. */
export function litNodeIds(overlay: TraceOverlay): ReadonlySet<string> {
  return traceLitNodeIds(overlay);
}

/** Check if a node is lit (answer or context) in a trace overlay. */
export function isLit(overlay: TraceOverlay, nodeId: string): boolean {
  return traceIsLit(overlay, nodeId);
}

/** Check if a node is an answer node in a trace overlay. */
export function isAnswer(overlay: TraceOverlay, nodeId: string): boolean {
  return traceIsAnswer(overlay, nodeId);
}

/** Check if an edge is visible in a trace overlay. */
export function isEdgeVisible(overlay: TraceOverlay, edgeId: string): boolean {
  return traceIsEdgeVisible(overlay, edgeId);
}

/** Check if an edge is an answer edge in a trace overlay. */
export function isAnswerEdge(overlay: TraceOverlay, edgeId: string): boolean {
  return traceIsAnswerEdge(overlay, edgeId);
}

/** Step through lit nodes in a trace overlay. */
export function stepLitNode(
  overlay: TraceOverlay,
  current: string | undefined,
  direction: 1 | -1,
): string | undefined {
  return traceStepLitNode(overlay, current, direction);
}

/** Copy a trace overlay as a markdown outline using breadcrumbs for each lit node. */
export function copyTraceAsOutline(
  model: GraphViewData,
  overlay: TraceOverlay,
  breadcrumbs: (model: GraphViewData, id: string) => GraphNode[],
): string {
  return traceCopyTraceAsOutline(
    toTraceModel(model),
    overlay,
    (m: TraceModel, id: string) => breadcrumbs(model, id).map(toTraceNode),
  );
}