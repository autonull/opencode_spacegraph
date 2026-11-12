import { base64Encode } from "@opencode/util/encode"
import type { SessionMessageAssistant, SessionMessageInfo } from "@opencode/client/promise"
import type { Page } from "@playwright/test"
import { buildFixtureMessages } from "@opencode/session-ui/graph"
import { mockOpenCodeServer } from "../../e2e/utils/mock-server"
import { seedSessionGraph } from "../../e2e/utils/graph"

const directory = "C:/OpenCode/GraphPerf"

const sessionID = "ses_graph_perf"

const title = "Graph performance"

const model = { providerID: "opencode", modelID: "claude-opus-4-6" }

/** The graph canvas host, once the renderer has answered. */
export const canvas = '[data-slot="graph-canvas-host"][data-graph-ready="true"]'

/** The map surface the plugin contributes. */
export const map = '[data-slot="spacegraph-surface-map"]'

/** The transcript surface that renders its own rows and inline turn maps. */
export const transcript = '[data-slot="graph-transcript-surface"]'

/** The expand control of a turn's inline graph. */
export const inlineTrigger = `${transcript} .graph-inline-trigger`

export const palette = '[role="dialog"] [role="combobox"]'

export const paletteSelection = '[role="dialog"] [role="option"][aria-selected="true"]'

export type GraphSurface = "map" | "transcript"

type GraphSessionOptions = {
  /** The mocked server's origin: a production build is its own server. */
  server: string
  /** Roughly how many graph nodes the session should produce. */
  nodes?: number
  surface: GraphSurface
}

/**
 * Mocks one session for the graph benchmarks and returns its path. The graph is a contributed
 * session surface behind `experimental.sessionGraph`; every other graph flag is enabled through the
 * mocked config so a release build serves the transcript surface and its inline maps.
 */
export async function mockGraphSession(page: Page, options: GraphSessionOptions) {
  const messages = messagesFor(options.nodes ?? 0)

  await seedSessionGraph(page)
  await mockOpenCodeServer(page, {
    server: options.server,
    directory,
    project: project(),
    configEntries: [
      {
        type: "document",
        info: {
          experimental: {
            graph_surface_transcript: true,
            graph_node_widgets: true,
            graph_cost_lens: true,
          },
        },
      },
    ],
    sessions: [{ id: sessionID, title }],
    pageMessages: () => ({ items: messages }),
  })
  await page.addInitScript((general) => localStorage.setItem("settings.v3", JSON.stringify({ general })), {
    editToolPartsExpanded: false,
    shellToolPartsExpanded: false,
    showReasoningSummaries: false,
    timelineDetail: undefined,
  })

  return {
    path: `/server/${base64Encode(options.server)}/session/${sessionID}`,
    ready: options.surface === "map" ? map : transcript,
  }
}

/** Opens a graph surface from the command palette; the graph plugin owns the label. */
export async function openGraphSurface(page: Page, surface: GraphSurface) {
  const command = surface === "map" ? "Toggle session map" : "Show transcript (Graph)"

  await page.press("ControlOrMeta+Shift+P", { until: palette })
  await page.type(palette, command, { delay: 0 })
  await page.waitFor(paletteSelection, { text: command })
  await page.press("Enter")
  await page.waitFor(surface === "map" ? map : transcript, { timeout: 60_000 })
}

const TOOLS_PER_TURN = 20

/**
 * The canonical fixture for a small session, and a generated curve for a large one. Each tool call
 * becomes a tool node, a result node and its file node, so the request is approximate on purpose:
 * the benchmark measures the cost of drawing the session, not an exact node count.
 */
function messagesFor(nodes: number): SessionMessageInfo[] {
  if (nodes <= 100) return buildFixtureMessages()

  const tools = Math.ceil(nodes / 3)
  const turns = Math.ceil(tools / TOOLS_PER_TURN)
  const messages: SessionMessageInfo[] = []
  let clock = 1_700_000_000_000
  let toolIndex = 0

  for (let turn = 0; turn < turns; turn += 1) {
    const userID = `msg_user_${turn}`
    messages.push({ id: userID, type: "user", text: `Turn ${turn}: inspect the module`, time: { created: clock++ } })

    const count = Math.min(TOOLS_PER_TURN, tools - toolIndex)
    const content: SessionMessageAssistant["content"] = []

    for (let index = 0; index < count; index += 1) {
      const id = `prt_tool_${toolIndex}`
      const path = `src/module-${toolIndex % 40}/file-${toolIndex}.ts`

      content.push({
        type: "tool",
        id,
        name: "read",
        state: {
          status: "completed",
          input: { path },
          content: [{ type: "text", text: `export const value${toolIndex} = ${toolIndex}` }],
        },
        time: { created: clock, completed: clock + 100 },
      })
      toolIndex += 1
    }

    messages.push({
      id: `msg_assistant_${turn}`,
      type: "assistant",
      agent: "build",
      model,
      content,
      time: { created: clock++, completed: clock++ },
    } satisfies SessionMessageAssistant)
  }

  return messages
}

function project() {
  return { id: "proj_graph_perf", directory, canonical: directory }
}
