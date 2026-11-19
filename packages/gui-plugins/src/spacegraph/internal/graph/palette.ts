import type { GraphNode, GraphViewData } from "./model"
import type { SavedQuery } from "./saved-queries"
import { rankedSearch } from "./selectors"

/**
 * One command surface over the map: nodes, actions, lenses, surfaces, and saved questions. The
 * builders are data, the host runs the choice; the palette never executes a graph action itself.
 */
export type PaletteAction = {
  id: string
  label: string
  detail?: string
  keywords?: readonly string[]
}

export type PaletteLens = {
  id: string
  label: string
  description?: string
}

export type PaletteSurface = {
  id: string
  label: string
}

export type PaletteSources = {
  actions?: readonly PaletteAction[]
  lenses?: readonly PaletteLens[]
  surfaces?: readonly PaletteSurface[]
  savedQueries?: readonly SavedQuery[]
}

export type PaletteEntryKind = "node" | "action" | "lens" | "surface" | "saved-query"

export type PaletteEntry = {
  id: string
  kind: PaletteEntryKind
  label: string
  detail?: string
  /** Higher sorts first inside a group. */
  score: number
  node?: GraphNode
  action?: PaletteAction
  lens?: PaletteLens
  surface?: PaletteSurface
  savedQuery?: SavedQuery
}

export const PALETTE_GROUP_ORDER: readonly PaletteEntryKind[] = [
  "node",
  "action",
  "saved-query",
  "lens",
  "surface",
]

/** How many node hits a palette shows before the reader narrows the query. */
export const PALETTE_NODE_LIMIT = 20

type Match = { score: number; detail?: string }

function matchText(query: string, value: string | undefined, base: number): Match | undefined {
  if (!value) return undefined
  const haystack = value.toLowerCase()
  const needle = query.toLowerCase()
  const index = haystack.indexOf(needle)
  if (index < 0) return undefined
  const boundary = index === 0 || /\s|-|_|:|\//.test(haystack[index - 1] ?? "")
  return { score: base + (index === 0 ? 20 : 0) + (boundary ? 10 : 0) }
}

function matchEntry(
  query: string,
  input: { label: string; detail?: string; keywords?: readonly string[] },
  base: number,
): Match | undefined {
  const words = input.keywords?.join(" ")
  return (
    matchText(query, input.label, base + 20) ??
    matchText(query, words, base) ??
    matchText(query, input.detail, base - 10)
  )
}

/**
 * The rows the palette shows for a query. An empty query shows the commands a reader can run
 * without naming a node; a typed query also ranks the nodes it names.
 */
export function paletteEntries(
  model: GraphViewData,
  query: string,
  sources: PaletteSources = {},
  nodeLimit = PALETTE_NODE_LIMIT,
): PaletteEntry[] {
  const needle = query.trim()
  const entries: PaletteEntry[] = []

  if (needle) {
    rankedSearch(model, needle)
      .slice(0, nodeLimit)
      .forEach((node, index) => {
        entries.push({
          id: node.id,
          kind: "node",
          label: node.label,
          detail: node.summary,
          score: 100 - index,
          node,
        })
      })
  }

  for (const action of sources.actions ?? []) {
    const match = needle ? matchEntry(needle, action, 60) : { score: 60 }
    if (match) entries.push({ id: `action:${action.id}`, kind: "action", label: action.label, detail: action.detail, score: match.score, action })
  }

  for (const saved of sources.savedQueries ?? []) {
    const match = needle ? matchEntry(needle, { label: saved.label, keywords: [saved.query] }, 50) : { score: 70 }
    if (match) entries.push({ id: `saved:${saved.query}`, kind: "saved-query", label: saved.label, detail: saved.query, score: match.score, savedQuery: saved })
  }

  for (const lens of sources.lenses ?? []) {
    const match = needle ? matchEntry(needle, { label: lens.label, detail: lens.description }, 40) : { score: 50 }
    if (match) entries.push({ id: `lens:${lens.id}`, kind: "lens", label: lens.label, detail: lens.description, score: match.score, lens })
  }

  for (const surface of sources.surfaces ?? []) {
    const match = needle ? matchEntry(needle, { label: surface.label }, 30) : { score: 40 }
    if (match) entries.push({ id: `surface:${surface.id}`, kind: "surface", label: surface.label, score: match.score, surface })
  }

  return entries.sort((a, b) => {
    const group = PALETTE_GROUP_ORDER.indexOf(a.kind) - PALETTE_GROUP_ORDER.indexOf(b.kind)
    return group !== 0 ? group : b.score - a.score
  })
}

/** The entries of one kind, in rank order; the palette renders one section per non-empty group. */
export function paletteGroup(entries: readonly PaletteEntry[], kind: PaletteEntryKind): PaletteEntry[] {
  return entries.filter((entry) => entry.kind === kind)
}
