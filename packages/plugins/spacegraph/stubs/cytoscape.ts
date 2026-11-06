// The external build ships only the SpaceGraph renderer. The registry falls back to this stub, which fails like a
// missing WebGL context so the existing error state shows instead.

export class CytoscapeRenderer {
  constructor() {
    throw new Error("The Cytoscape renderer is not bundled in the SpaceGraph plugin")
  }
}
