# Known Limitations (Honest, Not Lowered)

1. **Orthographic wheel zoom** keeps the point under the pointer in place
2. **Mesh selection outline** is axis-aligned `BoxHelper`, not silhouette; DOM cards use element outline
3. **Edge labels** avoid labels and DOM cards, not all geometry
4. **Global `SpaceGraph.instances`** remains as off-by-default dev handle
5. **`./activity` types stopgap** (`types/activity.d.ts`) — replace with generated declarations
6. **Toolbar `endInset`** clears floating header toggles; desktop-media-query-gated
7. **Two adapter-failure e2e cases** dev-only (built chunks hashed); component suite covers seam
8. **First paint / pan frame rate** unmeasured — no graph perf harness
9. **Swimlane bands** full-opacity under execution focus dimming (structure, not content)
10. **Lane gutter** is world-space (left of content, included in fit), not screen-fixed overlay
11. **Lanes overview** has dominant empty region (reserves execution width at overview)
12. **Empty-column exclusion** not implemented; fit frames content IDs
13. **Depth fade** is scene fog; DOM cards do not fade (HTML over canvas)
14. **Capture matrix** is one frame per layout/depth/projection/context combination, not cartesian product of all options
15. **Visual review** found legibility defects; tracked T1.1–T1.18, layout-variety T7
16. **Long sessions** drawn as recent 60 turns + banner; layout measures whole session
17. **Five layouts are not comparable kinds** — three grid policies, two different geometries; best is unmeasured
18. **Middle-drag orbit** does nothing in an orthographic view; there is no orbit to have