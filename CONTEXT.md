# VECTOR

Offline viewer for `.mmd` diagrams. One self-contained HTML file plus an npm package.

## Language

**Viewer**:
The page a human or agent opens to see a diagram.
_Avoid_: App, renderer

**Diagram**:
The rendered output of one `.mmd` file.
_Avoid_: Graph, chart

**Source**:
The text of the picked file. It stays hidden. Only the diagram shows.
_Avoid_: Code, input

**Render-done**:
The state where the diagram SVG sits in the page.
_Avoid_: Loaded, finished

**Stable hook**:
A permanent selector on a viewer control that automation targets.
_Avoid_: Test id, hook

**Backend**:
The tiny local server inside the npm package. It reads the picked file and feeds its text to the viewer, then exits.
_Avoid_: Server, daemon
