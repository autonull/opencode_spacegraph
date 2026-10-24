import type { Provenance } from "@opencode/session-ui/graph"

/**
 * T30.3 — human-readable label for each snapshot source.
 */
export function sourceLabel(source: string): string {
  switch (source) {
    case "tree":
      return "filesystem"
    case "vcs":
      return "git"
    case "packages":
      return "packages"
    case "symbols":
      return "symbols"
    case "issues":
      return "issues"
    case "processes":
      return "processes"
    case "coverage":
      return "coverage"
    default:
      return source
  }
}

/**
 * T30.3 — format a timestamp difference as a relative age string.
 */
export function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

/**
 * T30.3 — format provenance for display in the inspector.
 */
export function formatProvenance(
  provenance: Provenance | undefined,
  now: number,
): string | undefined {
  if (!provenance) return undefined
  const { source, asOf } = provenance
  const age = asOf !== undefined ? formatAge(now - asOf) : undefined
  return age ? `${sourceLabel(source)}, ${age}` : sourceLabel(source)
}