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

## Branch and workflow

Work stays on `agent-sandbox`. Push there. Never switch branches without asking Sir.

Write detailed commit messages. Use conventional commits for the title, for example `fix(viewer): ...` or `feat(backend): ...`. The body names what changed, why, what it fixes, and which issue it refs. One concern per commit.

## Product state

The solo Viewer works. A human opens `VECTOR.html`, picks a file, pans and zooms. The solo Viewer, the agent contract, and the Backend exist. Still missing: the agent-browser acceptance suite. Build it per the open issues below.

## Open issues

- #1 VECTOR build spec. The parent plan. 19 user stories. Read it first.
- #4 Agent contract. Stable hooks, console lines, `window.VECTOR` trio of render, reset, status.
- #6 Backend package. `npx vector diagram.mmd`, under 10 MB, zero deps, exits after serving.
- #7 Acceptance sweep. Full agent-browser suite plus offline check plus giant warn path.
- #8 Render the entire file, never cap, never crash. Progress feedback during long renders.
- #13 Viewer zoom default. Read the dossier below. Closest to done, still open.

Closed: #2 skeleton, #3 pan zoom reset, #5 giant guard, #10 CI, #11 size, #12 health.

## Issue 13 dossier

The default view must open body text at 14 to 16 px, cropped at top left. Fit stays behind the Fit button only. Zoom anchors under the cursor. Pan never loses the diagram. Same rule for every file.

History: `b5f0b36` set scale 1. `618c7038` set fit width capped at double. Both closed the issue and both reopen screenshots refuted. `600ef08` split default from Fit, fixed the zoom pivot with the canvas base term, and clamped pan. `d97a28f` extended the sampler to HTML labels.

Mermaid flowcharts emit zero svg `text` nodes. All labels are HTML inside `foreignObject`, so the sampler must read `.label`, `.nodeLabel`, and `.edgeLabel`. This is proven live. `test.1.mmd` now opens readable.

`test.2.mmd` still opens tiny. It is a generated flowchart with 8687 lines, about 1500 nodes, 4504 edges, 29 subgraphs, uniform default fonts. Prime suspect, unconfirmed: the sampler reads the first 60 matches in document order, which oversamples one corner of a giant DOM plus large container boxes. Fix direction is spread sampling across the whole document with oversized boxes skipped. Same 60 budget, same target, same clamp.

## Viewer architecture

All viewer logic lives in `VECTOR.html` in one `Viewer` object near the end of the file, past the inlined mermaid bundle. Never read the bundle wholesale. Key methods at `d97a28f`:

- `show` renders then calls `defaultView`.
- `defaultView` clears the transform, measures median label height, scales 15 over median clamped 0.1 to 8, anchors top left.
- `fitView` fits both measured dimensions and centers. The Fit button calls it.
- `resetView` is an alias of `defaultView`.
- `zoomAt` anchors on the measured canvas base so the node under the cursor stays put.
- `clampPan` keeps part of the diagram on stage.
- `measureMedianText` samples up to 60 visible label boxes in document order.

Stable hooks: `picker`, `canvas`, `zoom-in`, `zoom-out`, `reset-view`, `error-panel`. Keep every hook. No `window.VECTOR` exists yet. No structured console lines exist yet.

## Fixtures and CI

`testing/` is gitignored. Local copies drift between machines. `test.1.mmd` is 96 lines of shapes and arrows. `test.2.mmd` is the 485 KB generated giant. My local `test.1.mmd` fails mermaid parse near its `class` line while Sir's copy renders, so confirm fixtures before trusting proof.

CI runs three jobs on `main` and `agent-sandbox`: offline guarantee with no external refs, mermaid 12.1.0 pin marker, contract hooks plus `mermaid.initialize` present. Keep all three green.

## Agent contract

Every console line starts `[VECTOR] event=<name>` with `key=value` pairs after it. Locked names: `file-picked`, `file-read`, `file-rejected`, `render-start`, `render-done`, `render-failed`, `view-default`, `view-fit`, `error-shown`, `api-render`, `api-reset`, `api-status`, `fullscreen`. `window.VECTOR` carries three calls: `render` takes source text and returns the render promise, `reset` returns the readable default and returns status, `status` returns state, diagram presence, scale, position, and file. Stable hooks cover picker, canvas, all eleven buttons, readout, and error panel.

## Verification lessons

Drive the real page, not guesses. The picker accepts files through automation upload, or set its files with `DataTransfer` in `eval` and dispatch `change`. Prefer `eval -b` with base64 over stdin pipes. Read aggregate DOM stats such as counts and medians, never full dumps. Cap browser work: if two steps fail in a row, stop and replan. Never commit diagnosis write-ups or skill copies. `issue-*/` and `.skills/` stay gitignored.
