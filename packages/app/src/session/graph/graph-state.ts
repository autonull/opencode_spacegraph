import { createMemo, type Accessor } from "solid-js"
import { type SetStoreFunction } from "solid-js/store"
import { Persistence } from "@/runtime/persistence/schema"
import { Schema } from "effect"
import {
  DETAIL_MODES,
  GRAPH_ARRANGEMENTS,
  GRAPH_MODES,
  GRAPH_SIDES,
  LAYOUTS,
} from "@opencode/session-ui/graph/vocabulary"

type SessionKeyReader = () => string
type SessionViewStore = {
  sessionView: Record<string, { scroll: Record<string, { x: number; y: number }>; graph?: SessionGraphState }>
}

export const sessionGraphSchema = Persistence.migrateField(
  Persistence.struct({
    map: Schema.optional(Schema.Boolean),
    sideBySide: Schema.optional(Schema.Boolean),
    arrangement: Schema.optional(Schema.Literals(GRAPH_ARRANGEMENTS)),
    arrangementSide: Schema.optional(Schema.Literals(GRAPH_SIDES)),
    split: Schema.optional(Schema.Finite),
    logTextScale: Schema.optional(Schema.Finite),
    pane: Persistence.optional(
      Persistence.struct({
        x: Schema.Finite,
        y: Schema.Finite,
        width: Schema.Finite,
        height: Schema.Finite,
      }),
    ),
    projection: Schema.optional(Schema.Literals(["2d", "3d"])),
    renderer: Schema.optional(Schema.Literals(["spacegraph", "cytoscape"])),
    selected: Schema.optional(Schema.String),
    layout: Schema.optional(Schema.Literals(LAYOUTS)),
    minimap: Schema.optional(Schema.Boolean),
    files: Schema.optional(Schema.Boolean),
    depth: Schema.optional(Schema.Literals(["flat", "layered", "depth-stack", "orbit"])),
    detailMode: Schema.optional(Schema.Literals(DETAIL_MODES)),
    detailFraming: Schema.optional(Schema.Literals(["off", "card"] as const)),
    peek: Schema.optional(Schema.Boolean),
    turnMap: Schema.optional(Schema.String),
    rules: Persistence.optional(
      Persistence.array(
        Persistence.struct({
          id: Schema.String,
          kind: Schema.optional(Schema.String),
          status: Schema.optional(Schema.String),
          scale: Schema.optional(Schema.Finite),
          hue: Schema.optional(Schema.Finite),
          muted: Schema.optional(Schema.Boolean),
          fadeAfter: Schema.optional(Schema.Finite),
        }),
      ),
    ),
    windows: Persistence.optional(
      Persistence.array(
        Persistence.struct({
          id: Schema.String,
          kind: Schema.String,
          nodeID: Schema.optional(Schema.String),
          left: Schema.Finite,
          top: Schema.Finite,
          width: Schema.Finite,
          height: Schema.Finite,
          z: Schema.Finite,
          pinned: Schema.optional(Schema.Boolean),
        }),
      ),
    ),
    followLog: Schema.optional(Schema.Boolean),
  }),
  Persistence.legacy({
    mode: Schema.optional(Schema.Literals(GRAPH_MODES)),
    map: Schema.optional(Schema.Boolean),
    sideBySide: Schema.optional(Schema.Boolean),
    layout: Schema.optional(Schema.Literals(LAYOUTS)),
    representation: Schema.optional(Schema.String),
  }),
  (value) => ({
    ...value,
    map: value.map ?? (value.mode === "graph" || value.mode === "hybrid"),
    sideBySide: value.sideBySide ?? value.mode === "hybrid",
    layout: value.layout ?? (value.representation === "ribbon" || value.representation === "matrix" ? value.representation : undefined),
  }),
)

export type SessionGraphState = typeof sessionGraphSchema.Type

export const sessionGraphDefaults: SessionGraphState = {
  map: false,
  sideBySide: false,
  arrangement: "stacked",
  arrangementSide: "start",
  split: 0.5,
  logTextScale: 1,
  pane: undefined,
  projection: "2d",
  renderer: undefined,
  selected: undefined,
  layout: "lanes",
  minimap: false,
  files: false,
  depth: "flat",
  detailMode: "panel",
  detailFraming: "off",
  peek: false,
  turnMap: undefined,
  rules: [],
  windows: [],
  followLog: false,
}

export type SessionGraphAccessors = {
  map: Accessor<boolean>
  sideBySide: Accessor<boolean>
  arrangement: Accessor<NonNullable<SessionGraphState["arrangement"]>>
  arrangementSide: Accessor<NonNullable<SessionGraphState["arrangementSide"]>>
  split: Accessor<number>
  logTextScale: Accessor<number>
  pane: Accessor<SessionGraphState["pane"]>
  projection: Accessor<NonNullable<SessionGraphState["projection"]>>
  renderer: Accessor<SessionGraphState["renderer"]>
  selected: Accessor<SessionGraphState["selected"]>
  turnMap: Accessor<SessionGraphState["turnMap"]>
  windows: Accessor<NonNullable<SessionGraphState["windows"]>>
  rules: Accessor<NonNullable<SessionGraphState["rules"]>>
  layout: Accessor<NonNullable<SessionGraphState["layout"]>>
  minimap: Accessor<NonNullable<SessionGraphState["minimap"]>>
  files: Accessor<NonNullable<SessionGraphState["files"]>>
  depth: Accessor<NonNullable<SessionGraphState["depth"]>>
  detailMode: Accessor<NonNullable<SessionGraphState["detailMode"]>>
  detailFraming: Accessor<NonNullable<SessionGraphState["detailFraming"]>>
  peek: Accessor<NonNullable<SessionGraphState["peek"]>>
  followLog: Accessor<NonNullable<SessionGraphState["followLog"]>>
  setMap: (map: boolean) => void
  setSideBySide: (sideBySide: boolean) => void
  setArrangement: (arrangement: NonNullable<SessionGraphState["arrangement"]>) => void
  setArrangementSide: (arrangementSide: NonNullable<SessionGraphState["arrangementSide"]>) => void
  setSplit: (split: number) => void
  setLogTextScale: (logTextScale: number) => void
  setPane: (pane: NonNullable<SessionGraphState["pane"]>) => void
  setLayout: (layout: NonNullable<SessionGraphState["layout"]>) => void
  setDepth: (depth: NonNullable<SessionGraphState["depth"]>) => void
  setDetailMode: (detailMode: NonNullable<SessionGraphState["detailMode"]>) => void
  setDetailFraming: (detailFraming: NonNullable<SessionGraphState["detailFraming"]>) => void
  setPeek: (peek: boolean) => void
  setFollowLog: (followLog: boolean) => void
  setMinimap: (minimap: boolean) => void
  setFiles: (files: boolean) => void
  setProjection: (projection: NonNullable<SessionGraphState["projection"]>) => void
  setRenderer: (renderer: NonNullable<SessionGraphState["renderer"]>) => void
  setSelected: (selected: string | undefined) => void
  setTurnMap: (turnMap: string | undefined) => void
  setWindows: (windows: NonNullable<SessionGraphState["windows"]>) => void
  setRules: (rules: NonNullable<SessionGraphState["rules"]>) => void
}

export function createSessionGraphState(
  store: SessionViewStore,
  setStore: SetStoreFunction<any>,
  touch: (sessionKey: string) => void,
  prune: (keep?: string) => void,
  keyReader: SessionKeyReader,
): SessionGraphAccessors {
  const state = () => store.sessionView[keyReader()]?.graph

  const write = (next: Partial<SessionGraphState>) => {
    const session = keyReader()
    touch(session)
    const current = store.sessionView[session]
    const merged: SessionGraphState = {
      ...sessionGraphDefaults,
      ...current?.graph,
      ...next,
    }

    if (!current) {
      setStore("sessionView", session, { scroll: {}, graph: merged })
      prune(session)

      return
    }

    setStore("sessionView", session, "graph", merged)
  }

  return {
    map: createMemo(() => state()?.map ?? false),
    sideBySide: createMemo(() => state()?.sideBySide ?? false),
    arrangement: createMemo(() => state()?.arrangement ?? "stacked"),
    arrangementSide: createMemo(() => state()?.arrangementSide ?? "start"),
    split: createMemo(() => state()?.split ?? 0.5),
    logTextScale: createMemo(() => state()?.logTextScale ?? 1),
    pane: createMemo(() => state()?.pane),
    projection: createMemo(() => state()?.projection ?? "2d"),
    renderer: createMemo(() => state()?.renderer),
    selected: createMemo(() => state()?.selected),
    turnMap: createMemo(() => state()?.turnMap),
    windows: createMemo(() => state()?.windows ?? []),
    rules: createMemo(() => state()?.rules ?? []),
    layout: createMemo(() => state()?.layout ?? "lanes"),
    minimap: createMemo(() => state()?.minimap ?? false),
    files: createMemo(() => state()?.files ?? false),
    depth: createMemo(() => state()?.depth ?? "flat"),
    detailMode: createMemo(() => state()?.detailMode ?? "panel"),
    detailFraming: createMemo(() => state()?.detailFraming ?? "off"),
    peek: createMemo(() => state()?.peek ?? false),
    followLog: createMemo(() => state()?.followLog ?? false),
    setMap(map: boolean) {
      write({ map })
    },
    setSideBySide(sideBySide: boolean) {
      write({ sideBySide })
    },
    setArrangement(arrangement: NonNullable<SessionGraphState["arrangement"]>) {
      write({ arrangement })
    },
    setArrangementSide(arrangementSide: NonNullable<SessionGraphState["arrangementSide"]>) {
      write({ arrangementSide })
    },
    setSplit(split: number) {
      write({ split })
    },
    setLogTextScale(logTextScale: number) {
      write({ logTextScale })
    },
    setPane(pane: NonNullable<SessionGraphState["pane"]>) {
      write({ pane })
    },
    setLayout(layout: NonNullable<SessionGraphState["layout"]>) {
      write({ layout })
    },
    setDepth(depth: NonNullable<SessionGraphState["depth"]>) {
      write({ depth })
    },
    setDetailMode(detailMode: NonNullable<SessionGraphState["detailMode"]>) {
      write({ detailMode })
    },
    setDetailFraming(detailFraming: NonNullable<SessionGraphState["detailFraming"]>) {
      write({ detailFraming })
    },
    setPeek(peek: boolean) {
      write({ peek })
    },
    setFollowLog(followLog: boolean) {
      write({ followLog })
    },
    setMinimap(minimap: boolean) {
      write({ minimap })
    },
    setFiles(files: boolean) {
      write({ files })
    },
    setProjection(projection: NonNullable<SessionGraphState["projection"]>) {
      write({ projection })
    },
    setRenderer(renderer: NonNullable<SessionGraphState["renderer"]>) {
      write({ renderer })
    },
    setSelected(selected: string | undefined) {
      write({ selected })
    },
    setTurnMap(turnMap: string | undefined) {
      write({ turnMap })
    },
    setWindows(windows: NonNullable<SessionGraphState["windows"]>) {
      write({ windows })
    },
    setRules(rules: NonNullable<SessionGraphState["rules"]>) {
      write({ rules })
    },
  }
}