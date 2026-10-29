/**
 * Human-readable label for each source type.
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