import type { JSX } from 'solid-js';

// Stub components for test fixture builds to avoid SSR template hoisting errors
export const GraphPeek = (): JSX.Element => null;
export const GraphPopover = (): JSX.Element => null;
export const GraphOverlayManager = (): JSX.Element => null;
export const GraphStatusBar = (): JSX.Element => null;
export const GraphPeekProps = {} as any;
export const GraphPopoverProps = {} as any;
export const GraphOverlayManagerProps = {} as any;
export const GraphStatusBarProps = {} as any;
export const POPOVER_WIDTH = 340;
export const POPOVER_MAX_HEIGHT = 420;
export const POPOVER_GAP = 16;