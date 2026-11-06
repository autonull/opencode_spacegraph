/**
 * @opencode/session-graph - SpaceGraphJS type adapters
 * Converts session-ui graph types to spacegraphjs generic types.
 */

import type { GraphViewData as SGViewData, GraphNode as SGNode, GraphEdge as SGEdge } from "@opencode/session-ui/graph";
import type { GraphViewData as SGJSViewData, GraphNode as SGJSNode, GraphEdge as SGJSEdge } from "@spacegraphjs/shared";

/** Converts session-ui graph types to spacegraphjs generic types. */
export function toSGJSViewData(data: SGViewData): SGJSViewData {
  return {
    nodes: data.nodes.map(toSGJSNode),
    edges: data.edges.map(toSGJSEdge),
  };
}

function toSGJSNode(node: SGNode): SGJSNode {
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    status: node.status,
    summary: node.summary,
    provenance: node.provenance
      ? {
          ...node.provenance,
          source: String(node.provenance.source),
        }
      : undefined,
    data: node.data as Record<string, unknown>,
    interactive: true,
  };
}

function toSGJSEdge(edge: SGEdge): SGJSEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.kind,
    confidence: edge.confidence,
    label: edge.label,
    data: edge.data as Record<string, unknown> | undefined,
  };
}

/** Converts i18n functions to spacegraphjs I18n type. */
export function createI18nAdapter(i18n: { t: (key: string) => string; plural: (key: string, count: number, params?: Record<string, string | number>) => string }) {
  return {
    t: (key: string) => i18n.t(key),
    plural: (key: string, count: number, params?: Record<string, string | number>) => i18n.plural(key, count, params),
  };
}

/** Batch adapter for toolbar — converts all props at once. */
export function adaptToolbarProps(props: {
  model: SGViewData;
  i18n: { t: (key: string) => string; plural: (key: string, count: number, params?: Record<string, string | number>) => string };
  // Add other props as needed
}): {
  model: SGJSViewData;
  t: (key: string) => string;
  plural: (key: string, count: number, params?: Record<string, string | number>) => string;
} {
  return {
    model: toSGJSViewData(props.model),
    t: props.i18n.t,
    plural: props.i18n.plural,
  };
}