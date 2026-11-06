import type { RenderModel } from "@spacegraphjs/renderer"

const card = (label: string, detail: string) => `
  <div style="display:flex;flex-direction:column;gap:4px;padding:8px 10px;font-family:system-ui,sans-serif">
    <span style="font-size:12px;font-weight:600;color:#e8e8ef">${label}</span>
    <span style="font-size:11px;color:#9aa0b4">${detail}</span>
  </div>`

export const ADAPTER_MODEL: RenderModel = {
  nodes: [
    { id: "card-1", kind: "tool", label: "read", status: "success", shape: "card", html: card("read", "src/auth/session.ts"), position: [-240, 0, 0] },
    { id: "dot-1", kind: "error", label: "fail", status: "error", shape: "dot", position: [0, 0, 0] },
    { id: "badge-1", kind: "retry", label: "retry", status: "running", shape: "badge", position: [240, 0, 0] },
    { id: "card-2", kind: "file", label: "token.ts", status: "neutral", shape: "card", html: card("token.ts", "created"), position: [-240, 160, 0] },
    { id: "dot-2", kind: "result", label: "suite", status: "success", shape: "dot", position: [0, 160, 0] },
  ],
  edges: [
    { id: "e-reads", source: "card-1", target: "dot-1", kind: "produces", label: "reads", confidence: "explicit", directed: true },
    { id: "e-inferred", source: "dot-1", target: "badge-1", kind: "evidence", confidence: "inferred", style: "dashed" },
  ],
}
