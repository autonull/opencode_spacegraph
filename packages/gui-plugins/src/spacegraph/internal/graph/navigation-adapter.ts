// Navigation adapter: provides session-ui typed navigation functions.

import type { GraphViewData, GraphNode } from "./model";
import { searchText } from "./selectors";
import { Navigation } from "spacegraphjs/navigation";

/** Search the model by query, returning session-ui typed nodes. */
export function search(model: GraphViewData, query: string): GraphNode[] {
    return Navigation.search(model as any, query, searchText) as unknown as GraphNode[];
}

/** Search the model by query with a custom rank function, returning session-ui typed nodes. */
export function searchBy(model: GraphViewData, query: string, rank: (node: GraphNode, needle: string) => number): GraphNode[] {
    return Navigation.searchBy(model as any, query, rank as any) as unknown as GraphNode[];
}