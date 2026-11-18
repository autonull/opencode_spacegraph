import { describe, expect, test } from "bun:test"
import { buildGraph } from "./build"
import { DEFAULT_GRAPH_LABELS, resolveGraphLabels } from "./labels"
import { buildFixtureMessages } from "./fixture"

describe("graph builder labels", () => {
  test("defaults are English and pluralize counts", () => {
    expect(DEFAULT_GRAPH_LABELS.session).toBe("Session")
    expect(DEFAULT_GRAPH_LABELS.filesChanged(1)).toBe("1 file changed")
    expect(DEFAULT_GRAPH_LABELS.filesChanged(3)).toBe("3 files changed")
  })

  test("partial overrides are additive", () => {
    const labels = resolveGraphLabels({ session: "Sitzung" })

    expect(labels.session).toBe("Sitzung")
    expect(labels.turn).toBe("Turn")
    expect(labels.compaction("completed")).toBe("Compaction completed")
  })

  test("buildGraph writes the host's labels without changing the defaults", () => {
    const input = { messages: buildFixtureMessages(), status: { type: "idle" } as const }
    const defaults = buildGraph(input)
    const localized = buildGraph({ ...input, labels: { session: "Sitzung" } })

    expect(defaults.nodes.find((node) => node.id === "session")?.label).toBe("Session")
    expect(localized.nodes.find((node) => node.id === "session")?.label).toBe("Sitzung")
  })
})
