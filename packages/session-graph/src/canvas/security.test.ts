import { describe, expect, test } from "bun:test"
import type { GraphViewData, GraphNode } from "@opencode/session-ui/graph"
import { buildRenderModel, escapeHtml } from "./buildRenderModel"
import { parseRenderModel, renderToSVG, serializeRenderModel } from "@spacegraphjs/svg-renderer"

/**
 * T6.7 — hostile content must stay inert.
 *
 * The contract: `RenderNode.label`/`summary` are plain text, `RenderNode.html` is host-sanitized
 * markup, and the library never evaluates either. The SpaceGraph adapter injects `html` with
 * `innerHTML`, so the escaping at card/band/axis generation time is the only barrier between a
 * tool output that contains markup and the page.
 */

const ATTACK = {
  script: "<script>window.__xss = 1</script>",
  imgOnError: '<img src=x onerror="window.__xss = 1">',
  svgOnLoad: "<svg onload=window.__xss=1>",
  iframe: '<iframe src="javascript:window.__xss=1"></iframe>',
  javascriptUrl: "javascript:window.__xss=1",
  quotes: 'a"b\'c',
  ampersand: "a & b",
  rtl: "normal\u202Ereversed",
}

function hostileModel(): GraphViewData {
  const nodes: GraphNode[] = [
    { id: "session", kind: "session", label: "Session", status: "neutral", minLevel: "overview" },
    { id: "turn", kind: "turn", label: "Turn 1", status: "success", minLevel: "overview" },
    {
      id: "tool:hostile",
      kind: "tool",
      label: ATTACK.script,
      summary: ATTACK.imgOnError,
      status: "success",
      turnID: "turn",
      minLevel: "execution",
      data: { name: "shell", command: ATTACK.javascriptUrl },
    },
  ]

  return {
    root: "session",
    nodes,
    edges: [
      { id: "e1", kind: "part-of", source: "turn", target: "session", confidence: "structural" },
      { id: "e2", kind: "sequence", source: "tool:hostile", target: "turn", confidence: "explicit" },
    ],
    turns: ["turn"],
    turnByMessageID: new Map(),
  }
}

const POSITIONS = new Map([
  ["session", { x: 0, y: 0, z: 0 }],
  ["turn", { x: 240, y: 0, z: 0 }],
  ["tool:hostile", { x: 480, y: 0, z: 0 }],
])

describe("escapeHtml", () => {
  test("escapes the five HTML-special characters", () => {
    expect(escapeHtml(ATTACK.script)).toBe("&lt;script&gt;window.__xss = 1&lt;/script&gt;")
    expect(escapeHtml(ATTACK.quotes)).toBe("a&quot;b&#39;c")
    expect(escapeHtml(ATTACK.ampersand)).toBe("a &amp; b")
  })

  test("leaves ordinary text untouched", () => {
    expect(escapeHtml("src/auth/session.ts")).toBe("src/auth/session.ts")
  })

  test("keeps bidi control characters, which are not markup", () => {
    expect(escapeHtml(ATTACK.rtl)).toBe(ATTACK.rtl)
  })

  test("does not rewrite URL schemes", () => {
    // Scheme filtering belongs to the surface that turns text into a link; escaping must not
    // pretend to handle it.
    expect(escapeHtml(ATTACK.javascriptUrl)).toBe(ATTACK.javascriptUrl)
  })
})

describe("buildRenderModel sanitization", () => {
  test("card markup carries escaped label and summary", () => {
    const model = buildRenderModel(hostileModel(), { level: "execution", positions: POSITIONS })
    const card = model.nodes.find((node) => node.id === "tool:hostile")

    expect(card?.html).toBeDefined()
    expect(card!.html).not.toContain("<script")
    expect(card!.html).not.toContain("<img")
    expect(card!.html).toContain("&lt;script&gt;")
    expect(card!.html).toContain("&lt;img")
  })

  test("labels stay plain text in the render model", () => {
    const model = buildRenderModel(hostileModel(), { level: "execution", positions: POSITIONS })
    const card = model.nodes.find((node) => node.id === "tool:hostile")

    // The label is text, not markup: a host that injects it as HTML is the one at fault.
    expect(card?.label).toBe(ATTACK.script)
    expect(card?.summary).toBe(ATTACK.imgOnError)
  })

  test("band markup escapes the band label", () => {
    const model = hostileModel()
    model.nodes[1].label = ATTACK.script

    const rendered = buildRenderModel(model, { level: "execution", positions: POSITIONS, bands: true })
    const band = rendered.nodes.find((node) => node.id === "band:turn")

    expect(band?.html).toBeDefined()
    expect(band!.html).not.toContain("<script")
    expect(band!.html).toContain("&lt;script&gt;")
  })

  test("axis label markup escapes the caption", () => {
    const rendered = buildRenderModel(hostileModel(), {
      level: "overview",
      positions: POSITIONS,
      axisLabels: [{ id: "row-1", label: ATTACK.script, x: 0, y: 0, role: "row" }],
    })
    const axis = rendered.nodes.find((node) => node.data?.axis)

    expect(axis?.html).toBeDefined()
    expect(axis!.html).not.toContain("<script")
    expect(axis!.html).toContain("&lt;script&gt;")
  })

  test("the render model carries affordances, not tool payloads", () => {
    const model = buildRenderModel(hostileModel(), { level: "execution", positions: POSITIONS })
    const card = model.nodes.find((node) => node.id === "tool:hostile")

    // Tool output never reaches the renderer: the inspector reads it back from the model.
    expect(card?.data?.command).toBeUndefined()
  })
})

describe("SVG export sanitization", () => {
  const svg = renderToSVG(buildRenderModel(hostileModel(), { level: "execution", positions: POSITIONS }))

  test("escapes node text", () => {
    expect(svg).not.toContain("<script")
    expect(svg).toContain("&lt;script&gt;")
  })

  test("emits no executable markup", () => {
    expect(svg).not.toMatch(/<script/i)
    expect(svg).not.toMatch(/\son\w+\s*=/i)
    expect(svg).not.toMatch(/javascript:/i)
  })
})

describe("JSON export sanitization", () => {
  test("round-trips strings without double escaping", () => {
    const model = buildRenderModel(hostileModel(), { level: "execution", positions: POSITIONS })
    const parsed = parseRenderModel(serializeRenderModel(model))
    const card = parsed?.nodes.find((node) => node.id === "tool:hostile")
    const original = model.nodes.find((node) => node.id === "tool:hostile")

    expect(card?.label).toBe(original?.label)
    expect(card?.summary).toBe(original?.summary)
    expect(card?.html).toBe(original?.html)
  })

  test("keeps raw text, so hosts must escape before embedding", () => {
    const model = buildRenderModel(hostileModel(), { level: "execution", positions: POSITIONS })
    const json = serializeRenderModel(model)

    // The JSON keeps the label verbatim, including a closing script tag: a host that inlines it
    // into a <script> element breaks out. The export path escapes it for HTML (GraphView).
    expect(json).toContain("</script>")
    expect(escapeHtml(json)).not.toContain("</script>")
    expect(escapeHtml(json)).toContain("&lt;/script&gt;")
  })
})
