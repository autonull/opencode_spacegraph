import type { Layout } from "@opencode/session-ui/graph/vocabulary"
import { LAYOUTS } from "@opencode/session-ui/graph/vocabulary"

/**
 * T3.5 — a link to one node of the session map.
 *
 * The hash form is `#graph:<nodeID>`, optionally naming the layout the reader should see
 * (`#graph:ribbon:<nodeID>`), and optionally carrying the facet question (`?q=...`). The layout
 * comes first because a node id may itself contain colons (`turn:msg_1`), so a trailing segment
 * would be ambiguous; no node id starts with a layout name, so the split is unambiguous in both
 * directions. A view link may have no node at all: `#graph?q=kind:file`.
 */
export type GraphPermalink = {
  nodeID?: string
  layout?: Layout
  /** A2: the facet question, in the same grammar the facet popover edits. */
  query?: string
}

const PREFIX = "graph:"

/**
 * T17.1 — the old links named a representation, and "graph" was its default. The node-link map is
 * the lanes layout now, so the old name still opens the same map.
 */
const LEGACY_LAYOUTS: Record<string, Layout> = { graph: "lanes" }

/** Reads a graph permalink out of a location hash; undefined for any other hash. */
export const graphPermalinkFromHash = (hash: string): GraphPermalink | undefined => {
  const value = hash.startsWith("#") ? hash.slice(1) : hash

  // A view link may open the map without naming a node: `#graph?q=...`.
  if (value === "graph" || value.startsWith("graph?")) {
    const query = value.slice("graph?".length)
    return query ? { query } : undefined
  }

  if (!value.startsWith(PREFIX)) return undefined

  const rest = value.slice(PREFIX.length)
  const queryAt = rest.indexOf("?")
  const path = queryAt >= 0 ? rest.slice(0, queryAt) : rest
  const query = queryAt >= 0 ? rest.slice(queryAt + 1) : undefined

  if (!path) return query ? { query } : undefined

  const separator = path.indexOf(":")

  if (separator > 0) {
    const head = path.slice(0, separator)
    const layout = LAYOUTS.includes(head as Layout) ? (head as Layout) : LEGACY_LAYOUTS[head]

    if (layout) {
      const nodeID = path.slice(separator + 1)

      if (nodeID) return { nodeID, layout, ...(query ? { query } : {}) }
      return { layout, ...(query ? { query } : {}) }
    }
  }

  // A view link may name only the layout, with no node: `#graph:matrix?q=...`.
  if (query && LAYOUTS.includes(path as Layout)) return { layout: path as Layout, query }

  return { nodeID: path, ...(query ? { query } : {}) }
}

/** The canonical hash for a permalink. The default layout is left out to keep the link short. */
export const graphPermalinkHash = (permalink: GraphPermalink) => {
  const layout =
    permalink.layout && permalink.layout !== "lanes"
      ? `${permalink.layout}${permalink.nodeID ? ":" : ""}`
      : ""
  const query = permalink.query ? `?${permalink.query}` : ""

  return `#${PREFIX}${layout}${permalink.nodeID ?? ""}${query}`
}
