# VECTOR - Offline mmd renderer (rough plan, build held)

Status: rough. Recorded 2026-09-28, revised and grilled 2026-10-05. Build starts only when Sir says go.
Designed under the frontend-design skill at build time.
Renderer uses the latest mermaid stable at build time, verified 12.1.0 on 2026-10-05. No promise to follow future mermaid releases.

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
- Works under agent-browser out of the box. Picker, canvas, reset button, and error panel each carry a stable hook for automation.
- Speaks to agents two ways. The picker takes file paths through automation upload. `window.VECTOR` takes source text, with render, reset, and status calls.
- Logs the full render story to structured console lines: file picked, render start, render done, and render errors with the failure named. Agents read the console to drive the viewer and to debug broken `.mmd` files.
- Warns before giant diagrams. The viewer reads the hardware, tunes its own node limit, and asks before rendering past it. Failures land in the error panel either way.

## How it holds together, roughly

- Single file means everything rides inside it. The mermaid library
  is inlined, not linked, so the page works with the network cable
  pulled.
- The picker is a plain file input. The user gesture grants access,
  the page reads the text, hands it to the inlined renderer.
- The renderer emits SVG. Pan and zoom ride on the SVG viewBox, so
  all 680 boxes stay sharp at any depth.
- Render failures show a plain error panel naming the failure,
  never a blank page. The same failure also goes to the console
  log, so agents see it through devtools.
- The console log mirrors what a human sees on screen. Every state
  change on the page appears as a console line an agent can read.
- Render-done means the diagram SVG sits in the page. Fit-to-screen
  lands after and gets its own console event.

## Distribution

- Solo `VECTOR.html` is the human artifact. Double-click and it runs.
  No server, no network, no install.
- The npm package is the full product. It carries a minuscule local
  backend, under 10 MB with zero dependencies, that reads the picked
  file and bakes its text into the served viewer. The backend never
  sits idle. It serves one view, then exits.
- `npx vector diagram.mmd` is the way in. One file per view.

## Look

- Dark coffee background with a styled grid drawn behind the diagram.
- Coffee-color oriented accents plus one supporting color.
- Serif font throughout the chrome around the diagram.
- Diagram node fills stay exactly as authored. The page never
  restyles diagram content.

## Non-goals for the rough cut

- No editing. No saving. Viewer only.
- No multi-file projects. One file per view.
- No server in the solo HTML. Fully offline, fully local.
