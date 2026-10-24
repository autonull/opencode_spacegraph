import { Representations, type RepresentationConfig } from "spacegraphjs/representations"
import type { GraphLayout } from "./layout"
import { nodeSize } from "./layout"
import { isClusterExpanded, isVisibleAt } from "./levels"
import { nodeIndex } from "./lookup"
import type { GraphViewData, GraphNode, PhaseCategory, ZoomLevel } from "./model"
import { phaseCategoryOf } from "./model"
import { COMPACT_SIZE, PHASE_CATEGORIES } from "./vocabulary"

/**
 * T17.1/T17.2 — the session's summary layouts: the turn ribbon and the turn matrix.
 *
 * They are host-level geometry, like the node-link strategies, and they honour the level the same
 * way: a row is made of the level's units, and a derived cluster yields to its members once those
 * members are visible. The library owns the packing; this module owns the session's vocabulary.
 */
export type SummaryLayoutOptions = {
  /** Horizontal distance between adjacent segments/cells. */
  gap?: number
  /** Vertical distance between rows. */
  rowGap?: number
  /** The grain the rows are made of. Absent means the overview. */
  level?: ZoomLevel
}

/** Matrix column order; a trailing `signals` column carries failures, retries, and delegations. */
const SIGNALS_COLUMN = PHASE_CATEGORIES.length + 1

/** The matrix's labelled columns, in order. */
const CATEGORY_MAP: Readonly<Record<number, string>> = {
  1: "explore",
  2: "edit",
  3: "verify",
  4: "delegate",
  5: "result",
}

/**
 * LE.8 — the turn ribbon: one horizontal bar per turn, its phase clusters laid left-to-right as
 * segments. A turn that revisits a category keeps its distinct phase runs, so the ribbon shows the
 * real exploration/edit/verify rhythm instead of a single flattened bar.
 */
export function ribbonLayout(model: GraphViewData, options: SummaryLayoutOptions = {}): GraphLayout {
  return Representations.ribbonLayout(summary(model), config(model, options.level), options)
}

/**
 * LE.9 — the turn matrix: turns as rows and phase categories as columns, so "which phase dominated a
 * turn" and "where did verify happen" read at a glance. Each phase node lands in its
 * (turn, category) cell; a turn with two runs of one category fans them within the cell rather than
 * dropping one.
 */
export function matrixLayout(model: GraphViewData, options: SummaryLayoutOptions = {}): GraphLayout {
  return Representations.matrixLayout(summary(model), config(model, options.level), options)
}

/**
 * Rows shared by the ribbon and the matrix: the session row first (the root and any node without an
 * owning turn), then one row per turn. Within a row the turn header leads, then the phase segments in
 * model order, then the remaining members — so a bar reads left-to-right in the order it happened.
 */
export function turnRows(model: GraphViewData, level: ZoomLevel = "overview"): GraphNode[][] {
  return Representations.summaryRows(summary(model), config(model, level))
}

/**
 * T17.2 — the nodes a summary draws at a level: the ones the level makes visible, with a derived
 * cluster yielding to its members once those members are visible. A row never counts the same work
 * twice, so a phase stands for its work at the overview and the work stands for itself below it.
 */
export function summaryUnits(model: GraphViewData, level: ZoomLevel): Set<string> {
  const nodes = nodeIndex(model)
  const units = new Set<string>()

  for (const node of model.nodes) {
    if (!isVisibleAt(node, level)) continue
    if (yieldsToMembers(node, nodes, level)) continue
    units.add(node.id)
  }

  return units
}

/**
 * The matrix's column for a node: the phase's category, which a member inherits from the cluster
 * that stands for it. A node with no category — a failure, a retry — takes the trailing signals
 * column.
 */
export function matrixColumn(model: GraphViewData, node: GraphNode) {
  if (node.kind === "session" || node.kind === "turn") return 0
  const category = clusterCategories(model).get(node.id) ?? phaseCategoryOf(node)

  if (!category) return SIGNALS_COLUMN
  const index = PHASE_CATEGORIES.indexOf(category)

  return 1 + (index >= 0 ? index : SIGNALS_COLUMN - 1)
}

/** The summary model: the model rows are the model's turns. */
function summary(model: GraphViewData) {
  return { nodes: model.nodes, rows: model.turns }
}

/** The session's summary vocabulary: which row a node belongs to, how a row is ordered, which column
 *  it occupies, and which nodes take part. The library owns the packing. */
function config(model: GraphViewData, level: ZoomLevel | undefined): RepresentationConfig<GraphNode> {
  const units = summaryUnits(model, level ?? "overview")

  return {
    nodeSizeFn: nodeSize,
    cellSize: COMPACT_SIZE,
    rowKeyFn: (node) => (node.kind === "turn" ? node.id : node.turnID),
    rowOrderFn: turnOrder,
    columnKeyFn: (node) => matrixColumn(model, node),
    levelFilter: (node) => units.has(node.id),
    categoryMap: CATEGORY_MAP,
  }
}

function turnOrder(nodes: readonly GraphNode[]): GraphNode[] {
  const isHeader = (node: GraphNode) => node.kind === "session" || node.kind === "turn"

  return [
    ...nodes.filter(isHeader),
    ...nodes.filter((node) => node.kind === "phase"),
    ...nodes.filter((node) => !isHeader(node) && node.kind !== "phase"),
  ]
}

/** Whether a derived cluster stands back for its members, because the level now draws them. */
function yieldsToMembers(node: GraphNode, nodes: ReadonlyMap<string, GraphNode>, level: ZoomLevel) {
  if (node.kind !== "phase") return false
  // At the overview the phase stands for its work; below it the work stands for itself.
  if (!isClusterExpanded(level)) return false

  return (node.clusterOf ?? []).some((id) => {
    const member = nodes.get(id)

    return member ? isVisibleAt(member, level) : false
  })
}

/**
 * The category each member inherits from the cluster that stands for it. The model carries the
 * membership on the cluster, so the map is built once per model.
 */
const CLUSTER_CATEGORIES = new WeakMap<readonly GraphNode[], ReadonlyMap<string, PhaseCategory>>()

function clusterCategories(model: GraphViewData): ReadonlyMap<string, PhaseCategory> {
  const cached = CLUSTER_CATEGORIES.get(model.nodes)

  if (cached) return cached

  const categories = new Map<string, PhaseCategory>()

  for (const node of model.nodes) {
    if (node.kind !== "phase") continue
    const category = phaseCategoryOf(node)
    if (!category) continue
    for (const member of node.clusterOf ?? []) categories.set(member, category)
  }

  CLUSTER_CATEGORIES.set(model.nodes, categories)

  return categories
}

/**
 * T17.3 — the log layout: a vertical reading order, one block per turn, the activity nested under it,
 * the sequence drawn as a spine. This is the transcript's shape as a map layout.
 *
 * At overview: a turn is one card (the turn header).
 * At execution: the turn's tools, files, messages in the order they happened.
 * At detail: + reasoning, diffs, compactions.
 *
 * The log layout drops the lanes — a turn's nodes in one column in the order they happened,
 * the phases as depth, the sequence as a spine.
 */
export function logLayout(model: GraphViewData, options: SummaryLayoutOptions = {}): GraphLayout {
  return Representations.logLayout(summary(model), config(model, options.level), options)
}

/**
 * T17.3 — the nodes the log layout draws at a level: the session row, then one row per turn with
 * the turn's nodes in session order (the order they happened).
 */
export function logRows(model: GraphViewData, level: ZoomLevel = "overview"): GraphNode[][] {
  return Representations.logRows(summary(model), config(model, level))
}
