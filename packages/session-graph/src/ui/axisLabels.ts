import type { GraphNode, Representation } from "@opencode/session-ui/graph"
import { COMPACT_SIZE, PHASE_CATEGORIES, matrixColumn, nodeSize } from "@opencode/session-ui/graph"

export type AxisLabel = { id: string; label: string; x: number; y: number; role: "row" | "column" }

/** The gap between two axis captions. */
const GAP = 24

/** The distance between a row caption and the row it names. */
const ROW_X = -100

/** The distance above the content the column captions sit. */
const COLUMN_Y = -30

export type Translate = (key: string, params?: Record<string, string | number | boolean>) => string

/**
 * T1.11 — the row and column captions of the summary representations. The ribbon and the matrix
 * have no labels of their own, so the host names their axes: a row is a turn, a column is a phase
 * category. The node-link graph carries none of this — its lanes and bands already name it.
 *
 * `rows` are the rows the representation drew; `turnNumbers` are the session's turn numbers, so a
 * windowed map still says which turn it shows.
 */
export function buildAxisLabels(
  rows: GraphNode[][],
  representation: Representation,
  turnNumbers: ReadonlyMap<string, number>,
  t: Translate,
): AxisLabel[] | undefined {
  if (representation !== "ribbon" && representation !== "matrix") return undefined

  const labels: AxisLabel[] = []

  rows.forEach((nodes, rowIndex) => {
    const header = nodes.find((node) => node.kind === "turn" || node.kind === "session")
    const label = header
      ? header.kind === "session"
        ? t("ui.sessionGraph.axis.session")
        : t("ui.sessionGraph.axis.turn", { num: turnNumbers.get(header.id) ?? 0 })
      : ""

    if (!label) return

    labels.push({ id: `row:${rowIndex}`, label, x: ROW_X, y: rowIndex * (COMPACT_SIZE[1] + 20), role: "row" })
  })

  if (representation === "ribbon") {
    let cursor = 0

    for (const category of PHASE_CATEGORIES) {
      labels.push({ id: `col:${category}`, label: t(`ui.sessionGraph.phase.${category}`), x: cursor, y: COLUMN_Y, role: "column" })
      cursor += COMPACT_SIZE[0] + GAP
    }

    return labels
  }

  const columnWidth = new Map<number, number>()

  for (const nodes of rows) {
    for (const node of nodes) {
      const column = matrixColumn(node)
      columnWidth.set(column, Math.max(columnWidth.get(column) ?? COMPACT_SIZE[0], nodeSize(node)[0]))
    }
  }

  let x = 0

  columnWidth.forEach((width, column) => {
    const label =
      column === 0
        ? t("ui.sessionGraph.axis.turn")
        : column <= PHASE_CATEGORIES.length
          ? t(`ui.sessionGraph.phase.${PHASE_CATEGORIES[column - 1]}`)
          : t("ui.sessionGraph.axis.signals")

    labels.push({ id: `col:${column}`, label, x: x + width / 2, y: COLUMN_Y, role: "column" })
    x += width + GAP
  })

  return labels
}
