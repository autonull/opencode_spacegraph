// The engine's vision features load ONNX at runtime. The GUI plugin does not use
// vision, so the build replaces that optional dynamic import with an inert stub:
// inlining the real ONNX runtime would add ~70 MB to the single-file CJS bundle.
export const env: Record<string, unknown> = {}

export class InferenceSession {
  static create() {
    throw new Error("SpaceGraph vision is not bundled in the GUI plugin")
  }
}

export class Tensor {
  constructor(_data: unknown, _options?: unknown) {}
}
