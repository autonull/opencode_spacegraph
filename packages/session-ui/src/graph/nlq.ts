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
  success: ["success", "succeeded", "passed", "ok", "done", "complete", "completed"],
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

function normalize(input: string): string {
  return input.trim().toLowerCase()
}

function matchSynonyms<T extends string>(
  tokens: string[],
  synonyms: Record<T, string[]>,
  validValues: readonly T[],
): T[] {
  const matched: T[] = []
  const tokenSet = new Set(tokens)

  for (const canonical of validValues) {
    const alts = synonyms[canonical]
    if (!alts) continue
    for (const alt of alts) {
      // Match exact token or token starting with synonym (for stems like "successful" -> "success")
      // But not arbitrary substring (to avoid "ok" matching "token.ts")
      if (tokenSet.has(alt) || tokens.some((t) => t === alt || t.startsWith(alt + "") && t.length > alt.length)) {
        matched.push(canonical)
        break
      }
    }
  }

  return [...new Set(matched)]
}

function extractFreeText(tokens: string[], consumed: Set<string>): string {
  return tokens.filter((t) => !consumed.has(t)).join(" ")
}

export function compileNLQ(input: string): GraphFacets {
  const normalized = normalize(input)
  const tokens = normalized.split(/\s+/).filter(Boolean)

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

  const kindMatches = matchSynonyms(remainingTokens, KIND_SYNONYMS, NODE_KINDS)
  for (const k of kindMatches) {
    kinds.add(k)
    for (const token of remainingTokens) {
      if (Object.values(KIND_SYNONYMS).flat().includes(token) || KIND_SYNONYMS[k]?.includes(token)) {
        consumed.add(token)
      }
    }
  }

  const statusMatches = matchSynonyms(remainingTokens, STATUS_SYNONYMS, NODE_STATUSES)
  for (const s of statusMatches) {
    statuses.add(s)
    for (const token of remainingTokens) {
      if (Object.values(STATUS_SYNONYMS).flat().includes(token) || STATUS_SYNONYMS[s]?.includes(token)) {
        consumed.add(token)
      }
    }
  }

  const domainMatches = matchSynonyms(remainingTokens, DOMAIN_SYNONYMS, DOMAINS)
  for (const d of domainMatches) {
    domains.add(d)
    for (const token of remainingTokens) {
      if (Object.values(DOMAIN_SYNONYMS).flat().includes(token) || DOMAIN_SYNONYMS[d]?.includes(token)) {
        consumed.add(token)
      }
    }
  }

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

export function parseNLQ(input: string): { facets: GraphFacets; queryString: string } {
  const facets = compileNLQ(input)
  const queryString = formatNLQResult(facets)
  return { facets, queryString }
}