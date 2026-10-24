import { KernelCodec } from "@spacegraphjs/kernel"
import type { GraphModel } from "./model"
import { graphModelToKernel } from "./view"

export const exportGraphJSON = (model: GraphModel): string =>
  KernelCodec.encode(graphModelToKernel(model))

export const exportGraphFilename = (goal?: string): string => {
  const slug = goal
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug ? `spacegraph-${slug}.json` : "spacegraph.json"
}
