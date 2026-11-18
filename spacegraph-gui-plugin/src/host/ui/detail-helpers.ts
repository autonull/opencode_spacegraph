import {
  actionsFor,
  capabilitiesFromSnapshot,
  childIndex,
  fileRelations,
  filterActionsByCapabilities,
  nodeByID,
  openInTranscript,
  subagentContributions,
  why,
  type ActionSpec,
  type GraphEdge,
  type GraphNode,
  type GraphViewData,
} from "../../model"
import { childSessionID, count, filePath, fileRange, flag, forkedFrom, parentSessionID, strings, text } from "./node-data"
import { formatProvenance } from "./provenance"

export type DetailConnection = { edge: GraphEdge; other: GraphNode; direction: "in" | "out" }
export type DetailField = { label: string; value: string }
export type DetailLabels = {
  time: string
  path: string
  files: string
  agent: string
  childSession: string
  forkedFrom: string
  forkBoundary: string
  forkedBefore: string
  forkedThrough: string
  parentSession: string
  attempt: string
  exit: string
  source: string
  replayed: string
  replayedHint: string
  timeout: string
  yes: string
  openChildSession: string
  openForkedSession: string
  openParentSession: string
}

/** Incoming and outgoing edges, named on the other end. */
export function detailConnections(model: GraphViewData, node: GraphNode): DetailConnection[] {
  const relations = why(model, node.id)
  return [...relations.incoming, ...relations.outgoing].flatMap((edge) => {
    const other = nodeByID(model, edge.source === node.id ? edge.target : edge.source)
    if (!other || other.id === node.id) return []
    return [{ edge, other, direction: edge.source === node.id ? "out" : "in" }]
  })
}

/** The selectable field list of a node, built with the host's labels. */
export function detailFields(model: GraphViewData, node: GraphNode, now: number, labels: DetailLabels): DetailField[] {
  const data = node.data
  const forkBoundary = data?.forkBoundaryType === "before"
    ? labels.forkedBefore
    : data?.forkBoundaryType === "through"
      ? labels.forkedThrough
      : labels.forkBoundary
  const candidates: Array<[string, string | number | undefined]> = [
    [labels.time, node.time === undefined ? undefined : new Date(node.time).toLocaleTimeString()],
    [labels.path, text(data?.path)],
    [labels.files, count(data?.fileCount)],
    [labels.agent, text(data?.agent)],
    [labels.childSession, text(data?.childSessionID)],
    [labels.forkedFrom, text(data?.forkedFrom)],
    [forkBoundary, text(data?.forkBoundary)],
    [labels.parentSession, text(data?.parentSessionID)],
    [labels.attempt, count(data?.attempt)],
    [labels.exit, count(data?.exit)],
    [labels.source, formatProvenance(node.provenance, now)],
  ]
  return candidates.flatMap(([label, value]) => (value === undefined || value === "" ? [] : [{ label, value: String(value) }]))
}

/** The other session a node names: a delegated child, a fork source, or a parent. */
export function detailSessionLink(node: GraphNode, labels: DetailLabels): { id: string; label: string } | undefined {
  const child = childSessionID(node)
  if (child) return { id: child, label: labels.openChildSession }
  const forked = forkedFrom(node)
  if (forked) return { id: forked, label: labels.openForkedSession }
  const parent = parentSessionID(node)
  if (parent) return { id: parent, label: labels.openParentSession }
  return undefined
}

/** The opening message id a diff node's turn keys on. */
export function detailTurnFrom(model: GraphViewData, node: GraphNode): string | undefined {
  return node.turnID ? nodeByID(model, node.turnID)?.messageID : undefined
}

/** Capability-filtered actions for a node. */
export function detailActions(model: GraphViewData, node: GraphNode, capabilities?: string[]): ActionSpec[] {
  return filterActionsByCapabilities(actionsFor(node, model), capabilitiesFromSnapshot(capabilities ? { capabilities } : undefined))
}

/** Files under a directory node. */
export function detailFiles(model: GraphViewData, node: GraphNode): GraphNode[] {
  return (childIndex(model).get(node.id) ?? [])
    .map((id) => nodeByID(model, id))
    .filter((child): child is GraphNode => !!child && child.kind === "file")
}

/** Extra badges and sections a file node carries. */
export function detailFileBadges(model: GraphViewData, node: GraphNode): { config: boolean; doc: boolean; activity?: number } {
  const relation = fileRelations(model).get(node.id)
  return {
    config: node.data?.config === true,
    doc: node.data?.doc === true,
    activity: relation && relation.totalActivity > 0 ? relation.totalActivity : undefined,
  }
}

export function detailSubagentContribution(model: GraphViewData, node: GraphNode) {
  return subagentContributions(model).get(node.id)
}

export function detailFlags(node: GraphNode, labels: DetailLabels): DetailField[] {
  return [
    flag(node.data?.replayed) ? { label: labels.replayed, value: labels.replayedHint } : undefined,
    flag(node.data?.timeout) ? { label: labels.timeout, value: labels.yes } : undefined,
  ].filter((field): field is DetailField => !!field)
}

export function detailFileList(node: GraphNode): string[] {
  return strings(node.data?.files)
}

export function transcriptTarget(model: GraphViewData, node: GraphNode) {
  return openInTranscript(model, node.id)
}

export { filePath, fileRange }
