/**
 * M7 experiment plumbing: cohorts, local counters, and the five canonical questions. Everything
 * here is local and deterministic; the host owns persistence and never sends these numbers
 * anywhere.
 */
export const STUDY_COHORTS = ["reader-first", "map-first", "hybrid-first"] as const
export type StudyCohort = (typeof STUDY_COHORTS)[number]

export const DEFAULT_STUDY_COHORT: StudyCohort = "hybrid-first"

export type CohortEntry = {
  surface: "transcript" | "map" | "hybrid"
  lens: "reader" | "cartographer" | "navigator"
}

/** The first surface and lens a participant sees for a cohort. */
export function cohortEntry(cohort: StudyCohort): CohortEntry {
  if (cohort === "reader-first") return { surface: "transcript", lens: "reader" }
  if (cohort === "map-first") return { surface: "map", lens: "cartographer" }
  return { surface: "hybrid", lens: "navigator" }
}

export function isStudyCohort(value: unknown): value is StudyCohort {
  return typeof value === "string" && (STUDY_COHORTS as readonly string[]).includes(value)
}

export type StudyTask = {
  id: string
  question: string
  expected: string
}

/** The five §1 questions, answered against `buildFixtureGraph()`. */
export const STUDY_TASKS: readonly StudyTask[] = [
  {
    id: "why-session",
    question: "Why did the agent change `src/auth/session.ts`?",
    expected:
      "The suite failed with `FAIL auth refresh token` after the session edit; the retry error names the expected stored refresh token, so the token handling changed to store it.",
  },
  {
    id: "led-to-failure",
    question: "Which tool calls led to the failing test?",
    expected:
      "The verify phase ran `bun test src/auth/session.test.ts` (pass) and then `bun test` (fail), after the earlier read, subagent, edit, write, and patch tools.",
  },
  {
    id: "subagent",
    question: "What did the subagent contribute?",
    expected:
      "The explore subagent (`ses_child_auth`) reported that session tokens refresh through the store.",
  },
  {
    id: "after-failure",
    question: "Which changes were made after the failing test?",
    expected:
      "An edit to `src/auth/session.test.ts` fixed the refresh path, the suite then passed 3/3, and a second turn added refresh coverage (4/4).",
  },
  {
    id: "direction-change",
    question: "Where did the agent retry or change direction?",
    expected:
      "Retry #2 followed the `Expected refresh token to be stored` error, then the corrective edit switched from the session change to the test's refresh path.",
  },
]

/** Newest answers win; the cap keeps the per-session store small. */
export const MAX_STUDY_ANSWERS = 50

export type StudyAnswer = { label: string; ms: number }

export type StudyCounters = {
  version: 1
  surfaceOpens: Record<string, number>
  lensSwitches: Record<string, number>
  inlineExpands: number
  inlineCollapses: number
  why: number
  answers: StudyAnswer[]
}

export function emptyStudyCounters(): StudyCounters {
  return {
    version: 1,
    surfaceOpens: {},
    lensSwitches: {},
    inlineExpands: 0,
    inlineCollapses: 0,
    why: 0,
    answers: [],
  }
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0
}

function counts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  const next: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value)) {
    const amount = count(entry)
    if (amount > 0) next[key] = amount
  }
  return next
}

/** Validates the persisted counters at the session-store boundary. */
export function normalizeStudyCounters(value: unknown): StudyCounters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyStudyCounters()

  const answers = "answers" in value && Array.isArray(value.answers) ? value.answers : []
  return {
    version: 1,
    surfaceOpens: counts("surfaceOpens" in value ? value.surfaceOpens : undefined),
    lensSwitches: counts("lensSwitches" in value ? value.lensSwitches : undefined),
    inlineExpands: count("inlineExpands" in value ? value.inlineExpands : undefined),
    inlineCollapses: count("inlineCollapses" in value ? value.inlineCollapses : undefined),
    why: count("why" in value ? value.why : undefined),
    answers: answers.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return []
      const label = "label" in entry && typeof entry.label === "string" ? entry.label.trim() : ""
      const ms = "ms" in entry ? count(entry.ms) : 0
      return label && ms > 0 ? [{ label, ms }] : []
    }).slice(-MAX_STUDY_ANSWERS),
  }
}

function bump(values: Record<string, number>, key: string): Record<string, number> {
  return { ...values, [key]: (values[key] ?? 0) + 1 }
}

export function recordSurfaceOpen(counters: StudyCounters, surface: string): StudyCounters {
  return { ...counters, surfaceOpens: bump(counters.surfaceOpens, surface) }
}

export function recordLensSwitch(counters: StudyCounters, lens: string): StudyCounters {
  return { ...counters, lensSwitches: bump(counters.lensSwitches, lens) }
}

export function recordInlineToggle(counters: StudyCounters, expanded: boolean): StudyCounters {
  return expanded
    ? { ...counters, inlineExpands: counters.inlineExpands + 1 }
    : { ...counters, inlineCollapses: counters.inlineCollapses + 1 }
}

export function recordWhy(counters: StudyCounters): StudyCounters {
  return { ...counters, why: counters.why + 1 }
}

export function recordAnswer(counters: StudyCounters, label: string, ms: number): StudyCounters {
  const trimmed = label.trim()
  if (!trimmed || !Number.isFinite(ms) || ms <= 0) return counters

  return {
    ...counters,
    answers: [...counters.answers, { label: trimmed, ms: Math.round(ms) }].slice(-MAX_STUDY_ANSWERS),
  }
}

export type StudySummary = {
  opens: number
  expands: number
  collapses: number
  /** Share of inline toggles that opened a map; 0 before the first toggle. */
  expandRate: number
  why: number
  lensSwitches: number
  answers: number
  medianAnswerMs: number
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2) : sorted[middle]!
}

export function summarizeStudy(counters: StudyCounters): StudySummary {
  const toggles = counters.inlineExpands + counters.inlineCollapses
  return {
    opens: Object.values(counters.surfaceOpens).reduce((sum, value) => sum + value, 0),
    expands: counters.inlineExpands,
    collapses: counters.inlineCollapses,
    expandRate: toggles === 0 ? 0 : counters.inlineExpands / toggles,
    why: counters.why,
    lensSwitches: Object.values(counters.lensSwitches).reduce((sum, value) => sum + value, 0),
    answers: counters.answers.length,
    medianAnswerMs: median(counters.answers.map((answer) => answer.ms)),
  }
}

/** One compact line for the development status readout. */
export function formatStudy(counters: StudyCounters): string {
  const summary = summarizeStudy(counters)
  const seconds = Math.round(summary.medianAnswerMs / 100) / 10
  return `Open ${summary.opens} · Expand ${summary.expands}/${summary.expands + summary.collapses} · Why ${summary.why} · Lens ${summary.lensSwitches} · Answer ${summary.answers ? `${seconds}s` : "—"}`
}
