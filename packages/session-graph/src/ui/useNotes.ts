import { useI18n } from "@opencode/ui/context/i18n"
import { createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { nodeByID, type GraphViewData, type GraphNode, type Annotations } from "@opencode/session-ui/graph"
import { noteData } from "./node-data"

export type UseNotesOptions = {
  model: () => GraphViewData
  selection: () => readonly string[]
  onAnnounce: (message: string) => void
}

export type UseNotesReturn = {
  notes: Annotations
  noteTarget: () => string | undefined
  editingNote: () => string | undefined
  openNoteComposer: () => void
  closeNoteComposer: () => void
  saveNote: (body: string) => void
  editNote: (node: GraphNode) => void
  deleteNote: (node: GraphNode) => void
  copyNote: (node: GraphNode) => void
}

export function useNotes(options: UseNotesOptions): UseNotesReturn {
  const i18n = useI18n()
  const [notes, setNotes] = createStore<Annotations>({})
  const [noteTarget, setNoteTarget] = createSignal<string>()
  const [editingNote, setEditingNote] = createSignal<string>()

  const openNoteComposer = () => {
    const id = options.selection()[0]
    if (!id) return
    const node = nodeByID(options.model(), id)
    if (!node) return
    if (node.kind === "note") {
      const data = noteData(node)
      if (!data) return
      setEditingNote(data.noteID)
      setNoteTarget(data.target)
      return
    }
    setEditingNote(undefined)
    setNoteTarget(id)
  }

  const closeNoteComposer = () => {
    setEditingNote(undefined)
    setNoteTarget(undefined)
  }

  const saveNote = (body: string) => {
    const target = noteTarget()
    if (!target) return
    const editing = editingNote()
    if (editing) {
      if (body.trim().length === 0) {
        setNotes(produce((all) => void delete all[editing]))
        options.onAnnounce(i18n.t("ui.sessionGraph.note.deleted"))
      } else {
        setNotes(editing, "body", body)
        options.onAnnounce(i18n.t("ui.sessionGraph.note.updated"))
      }
      closeNoteComposer()
      return
    }
    const id = crypto.randomUUID()
    setNotes(id, { id, target, body, createdAt: Date.now() })
    options.onAnnounce(i18n.t("ui.sessionGraph.note.added"))
    closeNoteComposer()
  }

  const editNote = (node: GraphNode) => {
    openNoteComposer()
  }

  const deleteNote = (node: GraphNode) => {
    const data = noteData(node)
    if (!data) return
    setNotes(produce((all) => void delete all[data.noteID]))
    options.onAnnounce(i18n.t("ui.sessionGraph.note.deleted"))
  }

  const copyNote = (node: GraphNode) => {
    const body = typeof node.summary === "string" ? node.summary : node.label
    navigator.clipboard?.writeText(body)
    options.onAnnounce(i18n.t("ui.sessionGraph.note.copied"))
  }

  return {
    notes,
    noteTarget,
    editingNote,
    openNoteComposer,
    closeNoteComposer,
    saveNote,
    editNote,
    deleteNote,
    copyNote,
  }
}