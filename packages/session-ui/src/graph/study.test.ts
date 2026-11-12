import { describe, expect, test } from "bun:test"
import {
  cohortEntry,
  emptyStudyCounters,
  formatStudy,
  isStudyCohort,
  MAX_STUDY_ANSWERS,
  normalizeStudyCounters,
  recordAnswer,
  recordInlineToggle,
  recordLensSwitch,
  recordSurfaceOpen,
  recordWhy,
  summarizeStudy,
} from "./study"

describe("study cohorts", () => {
  test("each cohort opens its first surface and lens", () => {
    expect(cohortEntry("reader-first")).toEqual({ surface: "transcript", lens: "reader" })
    expect(cohortEntry("map-first")).toEqual({ surface: "map", lens: "cartographer" })
    expect(cohortEntry("hybrid-first")).toEqual({ surface: "hybrid", lens: "navigator" })
  })

  test("only the three pre-registered cohorts validate", () => {
    expect(isStudyCohort("reader-first")).toBe(true)
    expect(isStudyCohort("map")).toBe(false)
    expect(isStudyCohort(undefined)).toBe(false)
  })
})

describe("study counters", () => {
  test("surface opens and lens switches count per name", () => {
    const counters = recordLensSwitch(
      recordSurfaceOpen(recordSurfaceOpen(recordSurfaceOpen(emptyStudyCounters(), "map"), "map"), "transcript"),
      "navigator",
    )

    expect(counters.surfaceOpens).toEqual({ map: 2, transcript: 1 })
    expect(counters.lensSwitches).toEqual({ navigator: 1 })
  })

  test("an inline toggle counts as an expand or a collapse", () => {
    const counters = recordInlineToggle(recordInlineToggle(recordInlineToggle(emptyStudyCounters(), true), true), false)

    expect(summarizeStudy(counters)).toMatchObject({ expands: 2, collapses: 1, expandRate: 2 / 3 })
  })

  test("why usage is a plain count", () => {
    expect(recordWhy(recordWhy(emptyStudyCounters())).why).toBe(2)
  })

  test("answers keep the newest entries and report a median", () => {
    const counters = recordAnswer(recordAnswer(recordAnswer(emptyStudyCounters(), "refresh", 9000), "refresh", 3000), "retry", 0)

    expect(counters.answers).toEqual([
      { label: "refresh", ms: 9000 },
      { label: "refresh", ms: 3000 },
    ])
    expect(summarizeStudy(counters)).toMatchObject({ answers: 2, medianAnswerMs: 6000 })
  })

  test("answers stop at the cap", () => {
    let counters = emptyStudyCounters()
    for (let index = 0; index < MAX_STUDY_ANSWERS + 5; index++) counters = recordAnswer(counters, "q", index + 1)

    expect(counters.answers).toHaveLength(MAX_STUDY_ANSWERS)
    expect(counters.answers.at(-1)).toEqual({ label: "q", ms: MAX_STUDY_ANSWERS + 5 })
  })

  test("the status line stays compact and readable", () => {
    const counters = recordAnswer(recordInlineToggle(recordSurfaceOpen(emptyStudyCounters(), "map"), true), "refresh", 4200)

    expect(formatStudy(counters)).toBe("Open 1 · Expand 1/1 · Why 0 · Lens 0 · Answer 4.2s")
  })

  test("persisted counters are validated once at the boundary", () => {
    expect(normalizeStudyCounters(undefined)).toEqual(emptyStudyCounters())
    expect(
      normalizeStudyCounters({
        surfaceOpens: { map: 2, bad: -1, other: "3" },
        lensSwitches: { reader: 1.8 },
        inlineExpands: 4.9,
        inlineCollapses: -2,
        why: "1",
        answers: [{ label: "q", ms: 1200 }, { label: "", ms: 5 }, { label: "bad", ms: 0 }, null, "x"],
      }),
    ).toEqual({
      version: 1,
      surfaceOpens: { map: 2 },
      lensSwitches: { reader: 1 },
      inlineExpands: 4,
      inlineCollapses: 0,
      why: 0,
      answers: [{ label: "q", ms: 1200 }],
    })
  })
})
