# The Mouse Map

The graph is read with the mouse, so the mouse map is a contract of the library, not of the host:

| Gesture | Does |
|---------|------|
| Right button + drag | Pan the view (the view follows the cursor) |
| Left button + drag on the background | Pan the view — over the background the left button has nothing else to do |
| Wheel | Zoom about the point under the pointer |
| Middle click on a node | Frame that node (auto-zoom, half a second) |
| Middle button + drag | Orbit (3D only; an orthographic view has no orbit) |
| Left click on a node | Select it; the detail appears where the reader asked for it — on the node, beside it, or in the panel |
| Left drag on a node | Move it |
| Shift + drag on the background | Box-select |

The library owns the map; a host that draws cards over the canvas inherits it. Two rules keep a card readable: a control inside a card takes the mouse (the card does not drag out from under the reader, and its background still drags it), and a card draws its hover as an outline, so hovering never moves the controls under the reader's finger. A host that wants the left button to mean only "the nodes" turns the background pan off (`input.interaction.enableBackgroundPan`).