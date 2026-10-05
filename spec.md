# VECTOR - Offline mmd renderer (rough plan, build held)

Status: rough. Recorded 2026-09-28. Build starts only when Sir says go.
Designed under the frontend-design skill at build time.
Renderer locks to mermaid stable 12.1.0 (Sir order R930). No upgrade promises.

## What it is

One solo self-contained HTML file. Double-click it, or open it in
Chrome, and it acts as a fully offline website. No server, no network,
no install.

## What it does

- File picker for any locally accessible file the logged-in user
  account can reach.
- If the picked file is an `.mmd` file, it renders the diagram with
  no size constraints, no matter how gigantic.
- Shows the rendered output only. The mermaid source stays hidden.
- Pan with drag, zoom with wheel or pinch, as far in or out as needed.
- Reset view button returns to fit-to-screen.

## How it holds together, roughly

- Single file means everything rides inside it. The mermaid library
  is inlined, not linked, so the page works with the network cable
  pulled.
- The picker is a plain file input. The user gesture grants access,
  the page reads the text, hands it to the inlined renderer.
- The renderer emits SVG. Pan and zoom ride on the SVG viewBox, so
  all 680 boxes stay sharp at any depth.
- Render failures show a plain error panel naming the failure,
  never a blank page.

## Look

- Dark coffee background with a styled grid drawn behind the diagram.
- Coffee-color oriented accents plus one supporting color.
- Serif font throughout the chrome around the diagram.
- Diagram node fills stay exactly as authored. The page never
  restyles diagram content.

## Non-goals for the rough cut

- No editing. No saving. Viewer only.
- No multi-file projects. One file per view.
- No server half. Fully offline, fully local.
