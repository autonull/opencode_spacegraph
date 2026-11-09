import { type RendererID } from "../canvas/renderer-registry"
import type { GraphViewProps } from "../GraphView"
import { createSignal } from "solid-js"

export function useTestHarness(
  props: GraphViewProps,
  selection: { selection: () => readonly string[]; select: (id: string | undefined) => void },
  setRendererID: (id: RendererID) => void,
) {
  const [groupMenu, setGroupMenu] = createSignal<{ id: string; x: number; y: number }>()

  if (props.testHarness) {
    props.testHarness.selected = () => selection.selection()[0]
    props.testHarness.select = (id: string | undefined) => selection.select(id)
    props.testHarness.setRenderer = (id: RendererID) => setRendererID(id)
    props.testHarness.searchOpen = () => false
    props.testHarness.setSearchOpen = () => {}
    props.testHarness.legendOpen = () => false
    props.testHarness.setLegendOpen = () => {}
    props.testHarness.galleryOpen = () => false
    props.testHarness.setGalleryOpen = () => {}
    props.testHarness.groupMenu = groupMenu
    props.testHarness.setGroupMenu = setGroupMenu
    props.testHarness.detailMode = () => "panel"
    props.testHarness.setDetailMode = () => {}
    props.testHarness.level = () => "overview"
    props.testHarness.setLevel = () => {}
  }

  return { groupMenu, setGroupMenu }
}