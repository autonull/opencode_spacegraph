// Collapse adapter: delegates group collapse to @spacegraphjs/kernel.

import type { GraphViewData as SessionGraphViewData, GraphNode as SessionGraphNode } from "./model";
import {
  collapseGroups as kernelCollapseGroups,
  isGroup as kernelIsGroup,
  getGroupIds as kernelGetGroupIds,
} from "@spacegraphjs/kernel";

// The kernel's collapse.ts imports GraphViewData/GraphNode from ./types (not sub-layout)
// types.ts has status: string (required), while sub-layout.ts has status?: string (optional)
// Use the types.ts version for compatibility with kernel's collapseGroups
type KernelGraphViewData = {
  root: string;
  nodes: readonly {
    id: string;
    kind: string;
    label: string;
    status: string;
    clusterOf?: string[];
  }[];
  edges: readonly {
    id: string;
    kind: string;
    source: string;
    target: string;
  }[];
  turns: readonly string[];
  turnByMessageID: Map<string, string>;
  activeTurn?: string;
};

type KernelGraphNode = {
  id: string;
  kind: string;
  label: string;
  status: string;
  clusterOf?: string[];
};

/** Collapse groups in the graph model. Delegates to @spacegraphjs/kernel. */
export const collapseGroups = (
  model: SessionGraphViewData,
  collapsed: ReadonlySet<string>,
): SessionGraphViewData => {
  return kernelCollapseGroups(model as unknown as KernelGraphViewData, collapsed) as unknown as SessionGraphViewData;
};

/** Check if a node is a group (has clusterOf members). Delegates to @spacegraphjs/kernel. */
export const isGroup = (node: SessionGraphNode): boolean => {
  return kernelIsGroup(node as unknown as KernelGraphNode);
};

/** Get all group node IDs from the model. Delegates to @spacegraphjs/kernel. */
export const getGroupIds = (model: SessionGraphViewData): readonly string[] => {
  return kernelGetGroupIds(model as unknown as KernelGraphViewData);
};