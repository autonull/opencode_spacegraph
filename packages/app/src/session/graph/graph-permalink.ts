import type { Representation } from "@opencode/session-ui/graph"

/**
 * T3.5 — a link to one node of the session map.
 *
 * The hash form is `#graph:<nodeID>`, optionally naming the representation the reader should see
 * (`#graph:ribbon:<nodeID>`). The representation comes first because a node id may itself contain
 * colons (`turn:msg_1`), so a trailing segment would be ambiguous; no node id starts with a
 * representation name, so the split is unambiguous in both directions.
 */
export type GraphPermalink = {
  nodeID: string
  representation?: Representation
}

const PREFIX = "graph:"

const REPRESENTATIONS: readonly Representation[] = ["graph", "ribbon", "matrix"]

/** Reads a graph permalink out of a location hash; undefined for any other hash. */
export const graphPermalinkFromHash = (hash: string): GraphPermalink | undefined => {
  const value = hash.startsWith("#") ? hash.slice(1) : hash

  if (!value.startsWith(PREFIX)) return undefined

  const rest = value.slice(PREFIX.length)

  if (!rest) return undefined

  const separator = rest.indexOf(":")

  if (separator > 0) {
    const head = rest.slice(0, separator)

    // SAFETY: `REPRESENTATIONS` holds the only strings a representation can be, so a match is one.
    if (REPRESENTATIONS.includes(head as Representation)) {
      const nodeID = rest.slice(separator + 1)

      if (nodeID) {
        // SAFETY: the same check that admitted the head admitted it as a representation.
        return { nodeID, representation: head as Representation }
      }
    }
  }

  return { nodeID: rest }
}

/** The canonical hash for a permalink. The default representation is left out to keep the link short. */
export const graphPermalinkHash = (permalink: GraphPermalink) => {
  const representation =
    permalink.representation && permalink.representation !== "graph" ? `${permalink.representation}:` : ""

  return `#${PREFIX}${representation}${permalink.nodeID}`
}
