import { NODE_KINDS, NODE_STATUSES, DOMAINS, type NodeKind, type NodeStatus, type Domain } from "./vocabulary"
import type { GraphFacets } from "./facets"

const KIND_SYNONYMS: Record<NodeKind, string[]> = {
  session: ["session"],
  tool: ["tool", "tools"],
  file: ["file", "files"],
  directory: ["directory", "directories", "dir", "dirs"],
  error: ["error", "errors", "failure", "failures"],
  message: ["message", "messages"],
  reasoning: ["reasoning", "thought", "thoughts"],
  turn: ["turn", "turns"],
  phase: ["phase", "phases"],
  subagent: ["subagent", "subagents", "agent", "agents"],
  result: ["result", "results", "output"],
  retry: ["retry", "retries"],
  compaction: ["compaction", "compactions"],
  notice: ["notice", "notices"],
  diff: ["diff", "diffs"],
  package: ["package", "packages"],
  commit: ["commit", "commits"],
  branch: ["branch", "branches"],
  symbol: ["symbol", "symbols"],
  test: ["test", "tests"],
  "test-run": ["test run", "test runs"],
  process: ["process", "processes"],
  port: ["port", "ports"],
  issue: ["issue", "issues"],
  note: ["note", "notes"],
  "file-group": ["group", "groups"],
  "error-group": ["group", "groups"],
  "subagent-group": ["group", "groups"],
  "compaction-group": ["group", "groups"],
  "facet-group": ["group", "groups"],
}

const STATUS_SYNONYMS: Record<NodeStatus, string[]> = {
  pending: ["pending"],
  running: ["running", "active", "executing"],
  success: ["success", "succeeded", "passed", "ok", "done", "complete", "completed", "successful"],
  failed: ["failed", "failure", "error", "broken", "failing"],
  interrupted: ["interrupted", "cancelled", "canceled", "stopped"],
  neutral: ["neutral", "idle", "unknown"],
}

const DOMAIN_SYNONYMS: Record<Domain, string[]> = {
  session: ["session"],
  directories: ["directories", "directory", "dirs", "dir", "structure", "skeleton"],
  history: ["history", "git", "commits", "branches"],
  code: ["code", "symbols", "symbol", "definitions"],
  verification: ["verification", "verify", "tests", "test", "testing"],
  runtime: ["runtime", "process", "processes", "ports", "port"],
  work: ["work", "issues", "issue", "tasks", "task"],
}

const VERB_PREFIXES = ["show", "show me", "display", "filter", "filter for", "find", "find me", "get", "list", "list me"]

/**
 * Extra words the reader taught the compiler: a project says `bug` for an error, `ship` for a
 * success, or `repo` for history without changing the built-in grammar. Keys are the canonical
 * vocabulary values; an unknown key or value is ignored.
 */
export type NLQDictionaries = {
  kinds?: Partial<Record<NodeKind, readonly string[]>>
  statuses?: Partial<Record<NodeStatus, readonly string[]>>
  domains?: Partial<Record<Domain, readonly string[]>>
}

export type NLQOptions = {
  dictionaries?: NLQDictionaries
}

function normalize(input: string): string {
  return input.trim().toLowerCase()
}

/** The built-in synonyms plus the reader's words, one entry per canonical value. */
function mergeSynonyms<T extends string>(
  base: Record<T, readonly string[]>,
  extra: Partial<Record<T, readonly string[]>> | undefined,
  validValues: readonly T[],
): Record<T, readonly string[]> {
  if (!extra) return base

  const merged: Record<T, readonly string[]> = { ...base }
  for (const value of validValues) {
    const words = extra[value]
    if (words?.length) merged[value] = [...new Set([...(base[value] ?? []), ...words])]
  }
  return merged
}

function matchSynonyms<T extends string>(
  tokens: string[],
  synonyms: Record<T, readonly string[]>,
  validValues: readonly T[],
  options?: { exactOnly?: boolean; returnMatchedTokens?: boolean }
): { matches: T[]; matchedTokens: string[] } {
  const matched: T[] = []
  const matchedTokens: string[] = []
  const tokenSet = new Set(tokens)

  for (const canonical of validValues) {
    const alts = synonyms[canonical]
    if (!alts) continue
    for (const alt of alts) {
      let tokenMatched = false
      for (const t of tokens) {
        if (options?.exactOnly) {
          if (t === alt) {
            tokenMatched = true
            matchedTokens.push(t)
          }
        } else {
          // Match exact token or token starting with synonym (for stems like "successful" -> "success")
          // But not arbitrary substring (to avoid "ok" matching "token.ts")
          if (t === alt || (t.startsWith(alt) && t.length > alt.length)) {
            tokenMatched = true
            matchedTokens.push(t)
          }
        }
      }
      if (tokenMatched || tokenSet.has(alt)) {
        matched.push(canonical)
        if (tokenSet.has(alt)) matchedTokens.push(alt)
        break
      }
    }
  }

  return { matches: [...new Set(matched)], matchedTokens: [...new Set(matchedTokens)] }
}

function extractFreeText(tokens: string[], consumed: Set<string>): string {
  return tokens.filter((t) => !consumed.has(t)).join(" ")
}

export function compileNLQ(input: string, options: NLQOptions = {}): GraphFacets {
  const normalized = normalize(input)
  const tokens = normalized.split(/\s+/).filter(Boolean)
  const kindSynonyms = mergeSynonyms(KIND_SYNONYMS, options.dictionaries?.kinds, NODE_KINDS)
  const statusSynonyms = mergeSynonyms(STATUS_SYNONYMS, options.dictionaries?.statuses, NODE_STATUSES)
  const domainSynonyms = mergeSynonyms(DOMAIN_SYNONYMS, options.dictionaries?.domains, DOMAINS)

  let remainingTokens = [...tokens]

  for (const prefix of VERB_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      remainingTokens = normalized.slice(prefix.length).trim().split(/\s+/).filter(Boolean)
      break
    }
  }

  const consumed = new Set<string>()
  const kinds = new Set<NodeKind>()
  const statuses = new Set<NodeStatus>()
  const domains = new Set<Domain>(["session"])

  const { matches: kindMatches, matchedTokens: kindTokens } = matchSynonyms(remainingTokens, kindSynonyms, NODE_KINDS)
  for (const k of kindMatches) kinds.add(k)
  for (const t of kindTokens) consumed.add(t)

  const { matches: statusMatches, matchedTokens: statusTokens } = matchSynonyms(remainingTokens, statusSynonyms, NODE_STATUSES, { exactOnly: true })
  for (const s of statusMatches) statuses.add(s)
  for (const t of statusTokens) consumed.add(t)

  const { matches: domainMatches, matchedTokens: domainTokens } = matchSynonyms(remainingTokens, domainSynonyms, DOMAINS)
  for (const d of domainMatches) domains.add(d)
  for (const t of domainTokens) consumed.add(t)

  const query = extractFreeText(remainingTokens, consumed)

  return {
    query,
    kinds,
    statuses,
    domains,
  }
}

export function formatNLQResult(facets: GraphFacets): string {
  const parts: string[] = []

  if (facets.query) parts.push(facets.query)
  if (facets.kinds.size > 0) parts.push(`kind:${[...facets.kinds].join(",")}`)
  if (facets.statuses.size > 0) parts.push(`status:${[...facets.statuses].join(",")}`)
  if (facets.domains.size > 0 && facets.domains.size < DOMAINS.length) {
    parts.push(`domain:${[...facets.domains].join(",")}`)
  }

  return parts.join(" ")
}

export function parseNLQ(input: string, options: NLQOptions = {}): { facets: GraphFacets; queryString: string } {
  const facets = compileNLQ(input, options)
  const queryString = formatNLQResult(facets)
  return { facets, queryString }
}