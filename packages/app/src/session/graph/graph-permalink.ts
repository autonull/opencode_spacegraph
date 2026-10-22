import type { Layout } from "@opencode/session-ui/graph/vocabulary"
import { LAYOUTS } from "@opencode/session-ui/graph/vocabulary"

/**
 * T3.5 — a link to one node of the session map.
 *
 * The hash form is `#graph:<nodeID>`, optionally naming the layout the reader should see
 * (`#graph:ribbon:<nodeID>`). The layout comes first because a node id may itself contain colons
 * (`turn:msg_1`), so a trailing segment would be ambiguous; no node id starts with a layout name,
 * so the split is unambiguous in both directions.
 */
export type GraphPermalink = {
  nodeID: string
  layout?: Layout
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

  if (!value.startsWith(PREFIX)) return undefined

  const rest = value.slice(PREFIX.length)

  if (!rest) return undefined

  const separator = rest.indexOf(":")

  if (separator > 0) {
    const head = rest.slice(0, separator)
    const layout = LAYOUTS.includes(head as Layout) ? (head as Layout) : LEGACY_LAYOUTS[head]

    if (layout) {
      const nodeID = rest.slice(separator + 1)

      if (nodeID) return { nodeID, layout }
    }
  }

  return { nodeID: rest }
}

/** The canonical hash for a permalink. The default layout is left out to keep the link short. */
export const graphPermalinkHash = (permalink: GraphPermalink) => {
  const layout = permalink.layout && permalink.layout !== "lanes" ? `${permalink.layout}:` : ""

  return `#${PREFIX}${layout}${permalink.nodeID}`
}
