import { Representations, type RepresentationConfig } from "spacegraphjs/representations"
import type { GraphLayout } from "./layout"
import { COMPACT_SIZE, nodeSize } from "./layout"
import { isVisibleAt } from "./levels"
import type { GraphModel, GraphNode, PhaseCategory } from "./model"
import { phaseCategoryOf } from "./model"

/**
 * Phase 10 representation seam (LE.7). `graph` is the node-link view (the layout strategies apply);
 * `ribbon` and `matrix` are summary representations of the same model. Each is a pure `model → layout`
 * function, so selection, the inspector, search, breadcrumbs, and the a11y mirror stay unchanged — the
 * representation only relocates the model's own nodes, and never invents ids.
 *
 * The summaries live in SpaceGraphJS; this module is the session's vocabulary for them.
 */
export type Representation = "graph" | "ribbon" | "matrix"

export const REPRESENTATIONS: Representation[] = ["graph", "ribbon", "matrix"]

/** Overview-first representations: they show the semantic overview regardless of the level control. */
export function representationLevel(representation: Representation) {
  return representation === "graph" ? undefined : "overview"
}

/** Matrix column order; a trailing `signals` column carries failures, retries, and delegations. */
const PHASE_CATEGORIES: PhaseCategory[] = ["explore", "edit", "verify", "delegate", "result"]

const SIGNALS_COLUMN = PHASE_CATEGORIES.length + 1

export type RepresentationLayoutOptions = {
  /** Horizontal distance between adjacent segments/cells. */
  gap?: number
  /** Vertical distance between rows. */
  rowGap?: number
}

/**
 * The session's summary vocabulary: which row a node belongs to, how a row is ordered, which column
 * it occupies, and which nodes take part. The library owns the packing.
 */
const SUMMARY: RepresentationConfig<GraphNode> = {
  nodeSizeFn: nodeSize,
  cellSize: COMPACT_SIZE,
  rowKeyFn: (node) => (node.kind === "turn" ? node.id : node.turnID),
  rowOrderFn: turnOrder,
  columnKeyFn: matrixColumn,
  levelFilter: (node) => isVisibleAt(node, "overview"),
  categoryMap: { 1: "explore", 2: "edit", 3: "verify", 4: "delegate", 5: "result" },
}

/**
 * LE.8 — the turn ribbon: one horizontal bar per turn, its phase clusters laid left-to-right as
 * segments. A turn that revisits a category keeps its distinct phase runs, so the ribbon shows the
 * real exploration/edit/verify rhythm instead of a single flattened bar.
 */
export function ribbonLayout(model: GraphModel, options: RepresentationLayoutOptions = {}): GraphLayout {
  return Representations.ribbonLayout(summary(model), SUMMARY, options)
}

/**
 * LE.9 — the turn matrix: turns as rows and phase categories as columns, so "which phase dominated a
 * turn" and "where did verify happen" read at a glance. Each phase node lands in its
 * (turn, category) cell; a turn with two runs of one category fans them within the cell rather than
 * dropping one.
 */
export function matrixLayout(model: GraphModel, options: RepresentationLayoutOptions = {}): GraphLayout {
  return Representations.matrixLayout(summary(model), SUMMARY, options)
}

/**
 * Rows shared by the ribbon and the matrix: the session row first (the root and any node without an
 * owning turn), then one row per turn. Within a row the turn header leads, then the phase segments in
 * model order, then the remaining members — so a bar reads left-to-right in the order it happened.
 *
 * Only overview-visible nodes participate: a representation never renders a node below its level, and
 * a hidden node would otherwise consume a segment's width and push the fit bounds out.
 */
export function turnRows(model: GraphModel): GraphNode[][] {
  return Representations.summaryRows(summary(model), SUMMARY)
}

/** The summary model: the model rows are the model's turns. */
function summary(model: GraphModel) {
  return { nodes: model.nodes, rows: model.turns }
}

function turnOrder(nodes: readonly GraphNode[]): GraphNode[] {
  const isHeader = (node: GraphNode) => node.kind === "session" || node.kind === "turn"

  return [
    ...nodes.filter(isHeader),
    ...nodes.filter((node) => node.kind === "phase"),
    ...nodes.filter((node) => !isHeader(node) && node.kind !== "phase"),
  ]
}

function matrixColumn(node: GraphNode) {
  if (node.kind === "session" || node.kind === "turn") return 0
  const category = node.kind === "phase" ? phaseCategoryOf(node) : undefined

  if (!category) return SIGNALS_COLUMN
  const index = PHASE_CATEGORIES.indexOf(category)

  return 1 + (index >= 0 ? index : SIGNALS_COLUMN - 1)
}

export { matrixColumn, PHASE_CATEGORIES }
