import { SessionGraph } from "./SessionGraph"

/**
 * The graph surface (U3.8): toolbar, breadcrumbs, canvas, and inspector in one flex column that
 * fills the session panel. It owns semantic level, projection, and selection; the canvas owns
 * rendering. Detail always renders in the DOM inspector, never only on the canvas.
 * 
 * This is now a thin wrapper around SessionGraph with full chrome enabled.
 */
export const GraphView = (props: import("./SessionGraph").SessionGraphProps) => {
  return (
    <SessionGraph
      {...props}
      chrome={true}
      shell="full"
    />
  )
}