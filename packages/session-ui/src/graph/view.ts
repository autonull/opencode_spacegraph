import { deriveScope, Kernel } from "@spacegraphjs/kernel"
import type { Edge, Node } from "@spacegraphjs/kernel"
import type { JsonValue } from "@opencode/client/promise"
import type {
  Confidence,
  EdgeKind,
  GraphEdge,
  GraphViewData,
  GraphNode,
  GraphSnapshotMeta,
  Provenance,
} from "./model"
import { nodeDomain, type Domain, type NodeKind, type NodeStatus, type ZoomLevel } from "./vocabulary"

const HOST_KEY = "$host"

export type GraphViewMeta = {
  root: string
  workspaceRoot?: string
  snapshot?: GraphSnapshotMeta
  goal?: string
  turns: readonly string[]
  turnByMessageID: ReadonlyMap<string, string> | Readonly<Record<string, string>>
  activeTurn?: string
}

const hostFields = (node: GraphNode): Record<string, JsonValue> => {
  const fields: Record<string, JsonValue> = { status: node.status }
  if (node.summary !== undefined) fields.summary = node.summary
  if (node.turnID !== undefined) fields.turnID = node.turnID
  if (node.messageID !== undefined) fields.messageID = node.messageID
  if (node.partID !== undefined) fields.partID = node.partID
  if (node.toolID !== undefined) fields.toolID = node.toolID
  if (node.time !== undefined) fields.time = node.time
  if (node.derived !== undefined) fields.derived = node.derived
  if (node.minLevel !== undefined) fields.minLevel = node.minLevel
  if (node.clusterOf !== undefined) fields.clusterOf = [...node.clusterOf]
  if (node.domain !== undefined) fields.domain = node.domain
  if (node.provenance !== undefined)
    fields.provenance = {
      source: node.provenance.source,
      confidence: node.provenance.confidence,
      ...(node.provenance.asOf === undefined ? {} : { asOf: node.provenance.asOf }),
    }
  return fields
}

export const toKernelNode = (node: GraphNode): Node => ({
  id: node.id,
  kind: node.kind,
  label: node.label,
  data: { ...node.data, [HOST_KEY]: hostFields(node) },
})

export const toKernelEdge = (edge: GraphEdge): Edge => ({
  id: edge.id,
  kind: edge.kind,
  source: edge.source,
  target: edge.target,
  data: {
    confidence: edge.confidence,
    ...(edge.label === undefined ? {} : { label: edge.label }),
  },
})

export const graphModelToKernel = (model: GraphViewData, version = 0): Kernel =>
  new Kernel({
    nodes: model.nodes.map(toKernelNode),
    edges: model.edges.map(toKernelEdge),
    hyperedges: [],
    version,
  })

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined

const asStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === "string")
    ? [...value]
    : undefined

const asProvenance = (value: unknown): Provenance | undefined => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const source = asString(record.source)
  const confidence = asString(record.confidence)
  if (!source || !confidence) return undefined
  return {
    source: source as Provenance["source"],
    confidence: confidence as Provenance["confidence"],
    ...(asNumber(record.asOf) === undefined ? {} : { asOf: asNumber(record.asOf) }),
  }
}

export const toGraphNode = (node: Node): GraphNode => {
  const all = node.data ?? {}
  const host =
    typeof all[HOST_KEY] === "object" && all[HOST_KEY] !== null && !Array.isArray(all[HOST_KEY])
      ? (all[HOST_KEY] as Record<string, unknown>)
      : {}
  const data = Object.fromEntries(Object.entries(all).filter(([key]) => key !== HOST_KEY))
  return {
    id: node.id,
    kind: node.kind as NodeKind,
    label: node.label,
    status: (asString(host.status) as NodeStatus | undefined) ?? "neutral",
    ...(asString(host.summary) === undefined ? {} : { summary: asString(host.summary)! }),
    ...(asString(host.turnID) === undefined ? {} : { turnID: asString(host.turnID)! }),
    ...(asString(host.messageID) === undefined ? {} : { messageID: asString(host.messageID)! }),
    ...(asString(host.partID) === undefined ? {} : { partID: asString(host.partID)! }),
    ...(asString(host.toolID) === undefined ? {} : { toolID: asString(host.toolID)! }),
    ...(asNumber(host.time) === undefined ? {} : { time: asNumber(host.time)! }),
    ...(asBoolean(host.derived) === undefined ? {} : { derived: asBoolean(host.derived)! }),
    ...(asString(host.minLevel) === undefined
      ? {}
      : { minLevel: asString(host.minLevel) as ZoomLevel }),
    ...(asStringArray(host.clusterOf) === undefined
      ? {}
      : { clusterOf: asStringArray(host.clusterOf)! }),
    ...(asString(host.domain) === undefined ? {} : { domain: asString(host.domain) as Domain }),
    ...(asProvenance(host.provenance) === undefined
      ? {}
      : { provenance: asProvenance(host.provenance)! }),
    ...(Object.keys(data).length === 0 ? {} : { data: data as Record<string, JsonValue> }),
  }
}

export const toGraphEdge = (edge: Edge): GraphEdge => ({
  id: edge.id,
  kind: edge.kind as EdgeKind,
  source: edge.source,
  target: edge.target,
  confidence: (asString(edge.data?.confidence) as Confidence | undefined) ?? "explicit",
  ...(asString(edge.data?.label) === undefined ? {} : { label: asString(edge.data?.label)! }),
})

export const graphViewMeta = (model: GraphViewData): GraphViewMeta => ({
  root: model.root,
  ...(model.workspaceRoot === undefined ? {} : { workspaceRoot: model.workspaceRoot }),
  ...(model.snapshot === undefined ? {} : { snapshot: model.snapshot }),
  ...(model.goal === undefined ? {} : { goal: model.goal }),
  turns: model.turns,
  turnByMessageID: model.turnByMessageID,
  ...(model.activeTurn === undefined ? {} : { activeTurn: model.activeTurn }),
})

export const toGraphView = (kernel: Kernel, meta: GraphViewMeta): GraphViewData => ({
  root: meta.root,
  ...(meta.workspaceRoot === undefined ? {} : { workspaceRoot: meta.workspaceRoot }),
  ...(meta.snapshot === undefined ? {} : { snapshot: meta.snapshot }),
  ...(meta.goal === undefined ? {} : { goal: meta.goal }),
  nodes: kernel.nodes.map(toGraphNode),
  edges: kernel.edges.map(toGraphEdge),
  turns: [...meta.turns],
  turnByMessageID:
    meta.turnByMessageID instanceof Map
      ? new Map(meta.turnByMessageID)
      : new Map(Object.entries(meta.turnByMessageID)),
  ...(meta.activeTurn === undefined ? {} : { activeTurn: meta.activeTurn }),
})

export const scopeModel = (model: GraphViewData, lens: ReadonlySet<Domain>): GraphViewData => {
  const domains = new Set(lens)
  domains.add("session")
  const scoped = deriveScope(graphModelToKernel(model), (node) =>
    domains.has(nodeDomain(toGraphNode(node))),
  )
  const view = toGraphView(scoped, graphViewMeta(model))
  const kept = new Set(view.nodes.map((node) => node.id))
  return {
    ...view,
    turns: view.turns.filter((turn) => kept.has(turn)),
    activeTurn:
      view.activeTurn !== undefined && kept.has(view.activeTurn) ? view.activeTurn : undefined,
  }
}

export const createGraphViewCache = () => {
  const cache = new Map<number, { kernel: Kernel; view: GraphViewData }>()
  return (kernel: Kernel, meta: GraphViewMeta): GraphViewData => {
    const cached = cache.get(kernel.version)
    if (cached && cached.kernel === kernel) return cached.view
    const view = toGraphView(kernel, meta)
    cache.set(kernel.version, { kernel, view })
    return view
  }
}
