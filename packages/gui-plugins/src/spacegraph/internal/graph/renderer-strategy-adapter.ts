// Renderer strategy adapter: delegates to @spacegraphjs/adapter with OpenCode-specific thresholds.

import {
  chooseRendererStrategy as adapterChooseRendererStrategy,
  canvasRendererFor as adapterCanvasRendererFor,
  DEFAULT_RENDERER_STRATEGY_THRESHOLDS,
  type RendererStrategy as AdapterRendererStrategy,
  type RendererStrategyOptions as AdapterRendererStrategyOptions,
} from "@spacegraphjs/adapter";

/**
 * Renderer breadth policy (§19.12). The thresholds are a contract, not a claim: the registry today
 * exposes only the WebGL renderer, so a host that asks for a wider renderer gets SpaceGraph until
 * that renderer is registered. Inline previews are always the static SVG path.
 * Delegates to @spacegraphjs/adapter.
 */
export type RendererStrategy = AdapterRendererStrategy;

export const RENDERER_STRATEGY_THRESHOLDS = DEFAULT_RENDERER_STRATEGY_THRESHOLDS;

export type RendererStrategyOptions = AdapterRendererStrategyOptions;

/**
 * The renderer a surface should ask for. The fallback is always SpaceGraph, so asking for a
 * renderer that is not registered never leaves the map blank.
 * Delegates to @spacegraphjs/adapter.
 */
export function chooseRendererStrategy(nodeCount: number, options: RendererStrategyOptions = {}): RendererStrategy {
  return adapterChooseRendererStrategy(nodeCount, options);
}

/** Map the policy onto the renderer ids the canvas registry can mount. Delegates to @spacegraphjs/adapter. */
export function canvasRendererFor(strategy: RendererStrategy): "spacegraph" {
  return adapterCanvasRendererFor(strategy);
}