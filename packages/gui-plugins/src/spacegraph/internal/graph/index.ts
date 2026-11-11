// Internal graph module - bundled from @opencode/session-ui/graph
// This replaces the private package dependency

export {
  diffNodeID,
  directoryNodeID,
  errorNodeID,
  fileNodeID,
  messageNodeID,
  normalizePath,
  phaseCategoryForTool,
  phaseCategoryOf,
  phaseNodeID,
  reasoningNodeID,
  resultNodeID,
  retryNodeID,
  subagentNodeID,
  subagentToolNodeID,
  textNodeID,
  toolNodeID,
  turnNodeID,
  type Confidence,
  type EdgeKind,
  type GraphEdge,
  type GraphViewData,
  type GraphNode,
  type GraphSnapshotMeta,
  type Provenance,
  type SnapshotSource,
  type WorkspaceSnapshot,
  type NodeKind,
  type NodeStatus,
  type PhaseCategory,
  type SessionLineage,
  type ZoomLevel,
} from "./model"

export {
  buildGraph,
  buildGraphIncremental,
  buildSessionKernel,
  buildWorkspaceKernel,
  workspaceDeriver,
  workspaceDerivers,
  WORKSPACE_STAGES,
  type BuildGraphInput,
  type BuildSessionInput,
  type IncrementalBuildGraphInput,
  type WorkspaceStage,
} from "./build"

export {
  IncrementalGraphBuilder,
  type IncrementalBuilderState,
} from "./incremental-builder"

export {
  TIME_TRAVEL_LIMIT,
  captureTimeTravel,
  graphAtCheckpoint,
  type TimeTravelSnapshot,
} from "./time-travel"

export {
  CARD_SIZE,
  COMPACT_SIZE,
  DETAIL_MODES,
  DOMAINS,
  GRAPH_ARRANGEMENTS,
  GRAPH_MODES,
  GRAPH_SIDES,
  LAYOUTS,
  LAYOUT_STRATEGIES,
  LAYOUT_INDENT_STEP,
  LAYOUT_PADDING,
  NODE_KINDS,
  NODE_SHAPE,
  NODE_STATUSES,
  PHASE_CATEGORIES,
  PHASE_LABELS,
  PROVENANCE_EDGE_KINDS,
  READ_EDGE_KINDS,
  STRUCTURAL_KINDS,
  SUMMARY_LAYOUTS,
  ZOOM_LEVELS,
  VOCABULARY_KEYS,
  isSummaryLayout,
  isLogLayout,
  isSummaryOrLogLayout,
  type DetailFraming,
  type Domain,
  type DetailMode,
  type DepthMode,
  type GraphArrangement,
  type GraphSide,
  type Layout,
  type LayoutStrategy,
  type SummaryLayout,
} from "./vocabulary"

export { nodeIndex, lookupNode, childIndex } from "./lookup"

export { scopeModel } from "./view"
export { collapseGroups } from "./collapse"
export {
  noteNodeID,
  withAnnotations,
  type Annotation,
  type Annotations,
} from "./annotations"

export {
  buildFixtureGraph,
  buildFixtureGraphWithSnapshot,
  buildFixtureMessages,
  buildFixtureSnapshot,
  buildInterruptedFixtureMessages,
  CHANGED_FILES,
  FIXTURE_BASE_TIME,
  fixtureMessages,
} from "./fixture"

export {
  ancestors,
  breadcrumbs,
  changedFiles,
  failures,
  fileRelations,
  incoming,
  neighbors,
  neighborStep,
  nodeByID,
  openInTranscript,
  outgoing,
  rankedSearch,
  search,
  searchText,
  sessionProgress,
  sessionOutline,
  subagentContributions,
  subagentSubgraph,
  subtree,
  turnSubgraph,
  unverifiedFiles,
  why,
  downstreamForks,
  evidenceFor,
  // Trace overlay types and functions
  classifyTrace,
  traceWhy,
  traceLedHere,
  traceRelated,
  traceDownstream,
  litNodeIds,
  stepLitNode,
  copyTraceAsOutline,
  isLit,
  isAnswer,
  isEdgeVisible,
  isAnswerEdge,
  type DownstreamFork,
  type DownstreamStep,
  type EvidenceGroup,
  type EvidenceItem,
  type EvidenceKind,
  type TraceKind,
  type TraceOverlay,
  type ChangedFile,
  type Subgraph,
  type TranscriptRef,
  type TurnStats,
} from "./selectors"

export { reviewChanges, reviewModel, type ReviewChanges } from "./review"
export { PROFILE_PRESETS, applyProfile, type ProfileID, type ProfilePreset } from "./profiles"
export {
  applyFacets,
  composeScopes,
  DEFAULT_FACETS,
  facetCounts,
  facetsFromQuery,
  facetsToQuery,
  hasFacets,
  keepOnly,
  type FacetCount,
  type FacetCounts,
  type GraphFacets,
} from "./facets"
export { compileNLQ, formatNLQResult, parseNLQ } from "./nlq"
export {
  analyzeCompaction,
  filterByCompactionPriority,
  getCompactionSummary,
  type CompactionAnalysis,
  type CompactionNode,
  type CompactionPriority,
} from "./compaction"
export { ZOOM_RANK, zoomModel, type ZoomExpansion } from "./adaptive"
export { DEFAULT_BUDGET, applyNodeBudget, degreeBudget, type VisibilityBudget } from "./budget"
export { DOM_BUDGET } from "./dom-budget"
export { exportGraphFilename, exportGraphJSON } from "./export"

export {
  NAVIGATION_MNEMONICS,
  navigationHelp,
  navigationResults,
  navigationTargets,
  nextNavigationTarget,
  parseNavigation,
  type NavigationMnemonic,
} from "./navigation"

export { Metrics, type GraphAction, type GraphActionCounts, type GraphMetrics } from "./metrics"

export { byProximity, sessionOrder } from "./budget"

export {
  clusterCount,
  domBudget,
  edgesAtLevel,
  isClusterExpanded,
  isVisibleAt,
  labelMode,
  LEVEL_RANK,
  minLevelOf,
  nodesAtLevel,
  type LabelMode,
} from "./levels"

export {
  applySubLayouts,
  getSubLayoutPolicy,
  phaseSubLayout,
  errorSubLayout,
  fileSubLayout,
  subagentSubLayout,
  defaultSubLayout,
  type SubLayoutPolicy,
  type ClusterBounds,
} from "./sub-layout"

export {
  LANES,
  computeIncremental,
  interpolatePosition,
  laneAnchors,
  layoutGraph,
  nodeSize,
  type GraphLayout,
  type IncrementalLayout,
  type IncrementalLayoutOptions,
  type Lane,
  type LayoutMove,
  type LayoutOptions,
  type Position,
} from "./layout"

export {
  logLayout,
  logRows,
  matrixColumn,
  matrixLayout,
  ribbonLayout,
  summaryUnits,
  turnRows,
  type SummaryLayoutOptions,
} from "./summary"

export { scaleWindow, scopeToTurns, TURN_WINDOW, type ScaleWindow } from "./scale"

export {
  DETAIL_TIERS,
  DETAIL_TIER_WIDTH,
  detailTier,
  type DetailTier,
} from "./detail"

export {
  actionsFor,
  capabilitiesFromSnapshot,
  filterActionsByCapabilities,
  type ActionKind,
  type ActionSpec,
} from "./actions"

export {
  EQUALIZER_PRESETS,
  equalizerFade,
  equalizerMatch,
  equalizerScale,
  ruleMatches,
  type EqualizerRule,
  type EqualizerRuleSet,
} from "./equalizer"

// Timeline and message modules (dependencies of graph)
export {
  timelineCategories,
  timelinePresets,
  type TimelineCategory,
  type TimelinePlacement,
  type TimelineExpansion,
  type TimelineDetail,
  timelineCategory,
  timelineNoticePlacement,
  timelineNoticeRequired,
} from "./timeline/detail"

export {
  Timeline,
  type TimelineRowMap,
  type PartGroup,
  type PartRef,
} from "./timeline/projection"

export {
  currentToolError,
  currentToolFailed,
  currentToolOutput,
  currentToolInput,
  currentToolMetadata,
  shellResultFailed,
} from "./message/current-tool-state"