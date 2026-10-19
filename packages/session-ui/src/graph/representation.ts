import type { ClusterBounds, GraphLayout, Position } from "./layout"
import { COMPACT_SIZE, nodeSize } from "./layout"
import { isVisibleAt } from "./levels"
import type { GraphModel, GraphNode, PhaseCategory } from "./model"
import { phaseCategoryOf } from "./model"

/**
 * Phase 10 representation seam (LE.7). `graph` is the node-link view (the layout strategies apply);
 * `ribbon` and `matrix` are summary representations of the same model. Each is a pure `model → layout`
 * function, so selection, the inspector, search, breadcrumbs, and the a11y mirror stay unchanged — the
 * representation only relocates the model's own nodes, and never invents ids.
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
 * LE.8 — the turn ribbon: one horizontal bar per turn, its phase clusters laid left-to-right as
 * segments. A turn that revisits a category keeps its distinct phase runs, so the ribbon shows the
 * real exploration/edit/verify rhythm instead of a single flattened bar.
 */
export function ribbonLayout(model: GraphModel, options: RepresentationLayoutOptions = {}): GraphLayout {
  const gap = options.gap ?? 24
  const rowGap = options.rowGap ?? 20
  const rowHeight = COMPACT_SIZE[1] + rowGap
  const positions = new Map<string, Position>()

  turnRows(model).forEach((nodes, index) => {
    let cursor = 0

    for (const node of nodes) {
      // Use the node's real footprint: a card (subagent, session root) is wider than a phase chip,
      // so a fixed compact stride would overlap its neighbour.
      const width = nodeSize(node)[0]
      positions.set(node.id, { x: cursor + width / 2, y: index * rowHeight, z: 0 })
      cursor += width + gap
    }
  })

  return { positions, clusters: new Map(), bounds: boundsOf(positions), strategy: "lanes" }
}

/**
 * LE.9 — the turn matrix: turns as rows and phase categories as columns, so "which phase dominated a
 * turn" and "where did verify happen" read at a glance. Each phase node lands in its
 * (turn, category) cell; a turn with two runs of one category fans them within the cell rather than
 * dropping one.
 */
export function matrixLayout(model: GraphModel, options: RepresentationLayoutOptions = {}): GraphLayout {
  const gap = options.gap ?? 24
  const rowGap = options.rowGap ?? 20
  const rowHeight = COMPACT_SIZE[1] + rowGap
  const positions = new Map<string, Position>()
  const rows = turnRows(model)

  // T1.11: a cell can hold several runs of one category. Give each occupant a real sub-column so
  // cells never overlap, and widen the category column to the widest occupied cell.
  const cells = new Map<string, GraphNode[]>()

  rows.forEach((nodes, row) => {
    for (const node of nodes) {
      const key = `${row}:${matrixColumn(node)}`
      cells.set(key, [...(cells.get(key) ?? []), node])
    }
  })

  const columnWidth = new Map<number, number>()

  for (const [key, nodes] of cells) {
    const column = Number(key.slice(key.indexOf(":") + 1))
    const cellWidth = nodes.reduce((total, node) => total + nodeSize(node)[0] + gap, 0) - gap
    columnWidth.set(column, Math.max(columnWidth.get(column) ?? COMPACT_SIZE[0], cellWidth))
  }

  const columnX = (column: number) => {
    let x = 0

    for (let index = 0; index < column; index++) x += (columnWidth.get(index) ?? COMPACT_SIZE[0]) + gap

    return x
  }

  for (const [key, nodes] of cells) {
    const separator = key.indexOf(":")
    const row = Number(key.slice(0, separator))
    const column = Number(key.slice(separator + 1))
    let cursor = columnX(column)

    for (const node of nodes) {
      const width = nodeSize(node)[0]
      positions.set(node.id, { x: cursor + width / 2, y: row * rowHeight, z: 0 })
      cursor += width + gap
    }
  }

  return { positions, clusters: new Map(), bounds: boundsOf(positions), strategy: "lanes" }
}

function matrixColumn(node: GraphNode) {
  if (node.kind === "session" || node.kind === "turn") return 0
  const category = node.kind === "phase" ? phaseCategoryOf(node) : undefined

  if (!category) return SIGNALS_COLUMN
  const index = PHASE_CATEGORIES.indexOf(category)

  return 1 + (index >= 0 ? index : SIGNALS_COLUMN - 1)
}

/**
 * Rows shared by the ribbon and the matrix: the session row first (the root and any node without an
 * owning turn), then one row per turn. Within a row the turn header leads, then the phase segments in
 * model order, then the remaining members — so a bar reads left-to-right in the order it happened.
 *
 * Only overview-visible nodes participate: a representation never renders a node below its level, and
 * a hidden node would otherwise consume a segment's width and push the fit bounds out.
 */
function turnRows(model: GraphModel): GraphNode[][] {
  const globalRow: GraphNode[] = []
  const byTurn = new Map<string, GraphNode[]>()

  for (const node of model.nodes) {
    if (!isVisibleAt(node, "overview")) continue
    const key = node.kind === "turn" ? node.id : node.turnID

    if (!key) {
      globalRow.push(node)
      continue
    }

    const bucket = byTurn.get(key)

    if (bucket) bucket.push(node)
    else byTurn.set(key, [node])
  }

  const rows: GraphNode[][] = []

  if (globalRow.length > 0) rows.push(turnOrder(globalRow))

  for (const turnID of model.turns) {
    const nodes = byTurn.get(turnID)

    if (nodes && nodes.length > 0) rows.push(turnOrder(nodes))
  }

  return rows
}

function turnOrder(nodes: GraphNode[]): GraphNode[] {
  const isHeader = (node: GraphNode) => node.kind === "session" || node.kind === "turn"

  return [
    ...nodes.filter(isHeader),
    ...nodes.filter((node) => node.kind === "phase"),
    ...nodes.filter((node) => !isHeader(node) && node.kind !== "phase"),
  ]
}

function boundsOf(positions: ReadonlyMap<string, Position>): ClusterBounds {
  const points = [...positions.values()]

  if (points.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }

  return {
    min: { x: Math.min(...points.map((point) => point.x)), y: Math.min(...points.map((point) => point.y)), z: 0 },
    max: { x: Math.max(...points.map((point) => point.x)), y: Math.max(...points.map((point) => point.y)), z: 0 },
  }
}

export { matrixColumn, PHASE_CATEGORIES, turnRows }
