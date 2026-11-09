import { type Accessor } from "solid-js"
import { type ExportFormat, exportGraph } from "../export"
import { type RenderModel } from "@spacegraphjs/renderer"

export interface UseGraphExportInput {
  theme: Accessor<any>
  sessionTitle: string | undefined
  testedCommit: string | undefined
  selection: () => readonly string[]
  ordered: Accessor<RenderModel>
}

export interface UseGraphExportReturn {
  handleExport: (format: ExportFormat, model: RenderModel) => void
  exportSelection: () => void
}

export function useGraphExport(input: UseGraphExportInput): UseGraphExportReturn {
  const { theme, sessionTitle, testedCommit, selection, ordered } = input

  const handleExport = (format: ExportFormat, model: RenderModel) =>
    exportGraph(format, model, {
      theme: theme(),
      sessionTitle,
      testedCommit,
    })

  const exportSelection = () => {
    const ids = new Set(selection())
    if (ids.size === 0) return
    const model = ordered()
    handleExport("json", {
      ...model,
      nodes: model.nodes.filter((node) => ids.has(node.id)),
      edges: model.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    })
  }

  return {
    handleExport,
    exportSelection,
  }
}