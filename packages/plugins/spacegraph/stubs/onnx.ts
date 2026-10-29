// The graph never reaches vision. Keep the ONNX runtime out of the bundle and fail loudly if a path ever does.

const unavailable = () => {
  throw new Error("onnxruntime-web is not bundled in the SpaceGraph plugin")
}

export const env = new Proxy({}, { get: unavailable })

export class InferenceSession {
  static create(): never {
    return unavailable()
  }

  run(): never {
    return unavailable()
  }
}

export class Tensor {
  constructor() {
    unavailable()
  }
}
