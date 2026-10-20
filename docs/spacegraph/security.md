# SpaceGraph security and sanitization contract

**Scope.** The session graph renders text that came from somewhere else: tool output, file paths,
model summaries, and shell commands. Some of that text contains markup. This document states who
sanitizes what, so a reviewer can check one claim instead of reading three packages.

**Status:** T6.7. Tests: `packages/session-graph/src/canvas/security.test.ts` (unit),
`packages/session-graph/component-tests/security.spec.ts` (end-to-end, both adapters).

---

## 1. Threat model

| Source | Untrusted? | Where it surfaces |
|---|---|---|
| Tool names, commands, output | Yes | Card label/summary, inspector |
| File paths | Yes | Card label, file rail, inspector, diff headers |
| Model-written summaries | Yes | Card summary, inspector, host-rendered Markdown |
| Session title, commit SHA | No | Export headers (escaped anyway) |

A hostile session can put `<script>`, `<img onerror=…>`, `javascript:` URLs or `U+202E` bidi
overrides into any of these.

## 2. The contract

1. **`RenderNode.label` and `RenderNode.summary` are plain text.** They are never markup. A host
   that injects them as HTML is the one at fault.
2. **`RenderNode.html` is host-sanitized markup.** The contract states: "Host-sanitized markup for
   `shape: card`. Never fetched or evaluated by the renderer." The renderer injects it with
   `innerHTML` (`spacegraphjs/src/nodes/HtmlNode.ts:122`,
   `spacegraphjs/packages/cytoscape-renderer/src/index.ts:266`), so escaping happens **before** the
   model is handed over, not inside the renderer.
3. **The library never evaluates content.** It does not fetch URLs from the model, does not run
   scripts, and does not interpret `data:` payloads.
4. **Tool payloads never reach the renderer.** `nodeData` in `buildRenderModel.ts` carries renderer
   affordances only (ids, opacity, cluster state). The inspector reads detail back from the model.

## 3. Who sanitizes what

| Surface | Sanitizer | Location |
|---|---|---|
| Card markup (default template) | `escapeHtml` | `packages/session-graph/src/canvas/buildRenderModel.ts:376` |
| Card markup (host template) | Host-provided `renderCard` must escape | `packages/session-graph/src/ui/cardTemplate.ts` |
| Swimlane band markup | `escapeHtml` | `buildRenderModel.ts:394` |
| Lane label markup | `escapeHtml` | `buildRenderModel.ts:211` |
| Axis (row/column) captions | `escapeHtml` | `buildRenderModel.ts:177` |
| Inspector text | Solid text interpolation (auto-escaped) | `packages/session-graph/src/ui/GraphInspector.tsx:147` |
| Diff patch text | DOM text nodes, selectable | `packages/session-graph/src/ui/GraphDiff.tsx` |
| SVG export text | `escapeXml` in the renderer | `spacegraphjs/packages/svg-renderer/src/index.ts:212` |
| Standalone HTML export | `escapeHtml` on title, theme values, commit and the JSON blob | `packages/session-graph/src/ui/GraphView.tsx:316` |
| JSON export | Raw by design — see §5 | `spacegraphjs/packages/svg-renderer/src/index.ts:78` |

`escapeHtml` escapes exactly the five HTML-special characters: `&`, `<`, `>`, `"`, `'`.

## 4. Content Security Policy expectations

| Renderer | Mechanism | CSP requirement |
|---|---|---|
| SpaceGraph (WebGL) | Three.js shader compilation, CSS3D card transforms | `script-src 'self' 'unsafe-eval'`; `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob:` |
| Cytoscape (canvas + DOM overlay) | Canvas labels, DOM card overlay | `script-src 'self'`; `style-src 'self' 'unsafe-inline'` |
| SVG export | Static markup, no script | None; safe under `default-src 'none'` when served from a file |

`'unsafe-eval'` is required by the SpaceGraph adapter only because Three.js compiles shaders at
runtime. A host that forbids it cannot use that adapter; the Cytoscape adapter has no such
requirement.

## 5. Known limits (deliberate)

- **`javascript:` URLs are not neutralized by escaping.** `escapeHtml("javascript:…")` returns the
  input unchanged, because a URL scheme is not markup. Any surface that turns text into a link must
  filter schemes itself. The graph currently has no link surface: paths and commands are rendered as
  text.
- **Bidi control characters are preserved.** `U+202E` is not markup; it is a display instruction
  that can disguise a file extension. The graph shows the path as the session recorded it. Hosts that
  display paths as links should also show them in a way that does not reorder.
- **The JSON export keeps raw text.** `serializeRenderModel` writes the label verbatim, including a
  closing `</script>` if the label had one. A host that inlines that JSON into a `<script>` element
  would break out of it. The built-in HTML export escapes the JSON for exactly this reason; a
  third-party host must do the same.

## 6. Tests

```bash
cd packages/session-graph && bun test src/canvas/security.test.ts   # escaping contract
cd packages/session-graph && bun run test:components -- security    # both adapters, end to end
```

The component test mounts a story whose label, summary and tool command contain hostile markup and
asserts that:

- the payload never executes (`window.__xss` stays undefined),
- no `script` or `img` element from the payload reaches the DOM,
- the payload is still readable as text, in the canvas and in the inspector,
- the same holds after switching to the Cytoscape adapter.
