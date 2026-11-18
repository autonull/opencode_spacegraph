declare module "spacegraphjs/activity" {
  export interface SpaceGraphSpec {
    readonly nodes: readonly unknown[]
    readonly edges: readonly unknown[]
  }

  export interface SpaceGraphOptions {
    readonly render?: {
      readonly projection?: "orthographic" | "perspective"
      readonly depth?: string
      readonly renderMode?: "on-demand" | "continuous"
    }
  }

  export interface SpaceGraphInstance {
    render(): void
    fitView(): void
    dispose(): void
  }

  export const SpaceGraph: {
    create(container: HTMLElement, spec: SpaceGraphSpec, options?: SpaceGraphOptions): Promise<SpaceGraphInstance>
  }
}
