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

The solo Viewer, the agent contract, the Backend, the acceptance suite, and the console API exist. Remaining: giant render performance.

## Open issues

- #1 VECTOR build spec. The parent plan. 19 user stories. Read it first.
- #8 Render the entire file, never cap, never crash. Progress feedback during long renders.

Closed: #2 skeleton, #3 pan zoom reset, #4 agent contract, #5 giant guard, #6 backend package, #7 acceptance sweep, #10 CI, #11 size, #12 health, #13 zoom default, #14 console API.

## Issue 13 dossier, closed

The default view opens body text at 14 to 16 px, cropped at top left. Fit stays behind the Fit button only. Zoom anchors under the cursor. Pan never loses the diagram. Same rule for every file.

History: `b5f0b36` set scale 1. `618c7038` set fit width capped at double. Both closed the issue and both reopen screenshots refuted. `600ef08` split default from Fit, fixed the zoom pivot with the canvas base term, and clamped pan. `d97a28f` extended the sampler to HTML labels. `ddd317f` spread sampling with oversize skip. `80e8fbf` found the true cause: mermaid squeezes the svg to stage width, so measurement now happens at authored size. The control deck, readout, keys, and console story landed after. Sir verified the console math live and closed the issue.

The default view must open body text at 14 to 16 px, cropped at top left. Fit stays behind the Fit button only. Zoom anchors under the cursor. Pan never loses the diagram. Same rule for every file.

History: `b5f0b36` set scale 1. `618c7038` set fit width capped at double. Both closed the issue and both reopen screenshots refuted. `600ef08` split default from Fit, fixed the zoom pivot with the canvas base term, and clamped pan. `d97a28f` extended the sampler to HTML labels.

Mermaid flowcharts emit zero svg `text` nodes. All labels are HTML inside `foreignObject`, so the sampler reads `.label`, `.nodeLabel`, and `.edgeLabel`, spread across the document with oversized boxes skipped. This is proven live.

## Viewer architecture

All viewer logic lives in `VECTOR.html` in one `Viewer` object near the end of the file, past the inlined mermaid bundle. Never read the bundle wholesale. Current methods:

- `show` renders then calls `defaultView`.
- `defaultView` normalizes the svg to authored size, measures median label height, scales 15 over median clamped 0.1 to 8, anchors top left.
- `fitView` fits both measured dimensions and centers. The Fit button calls it.
- `resetView` is an alias of `defaultView`. The Reset button calls it.
- `oneToOne` re-anchors stage center at scale 1. `panBy` roams with clamp. `toggleFullscreen` fills the screen.
- `zoomAt` anchors on the measured canvas base so the node under the cursor stays put.
- `clampPan` keeps part of the diagram on stage.
- `measureMedianText` samples up to 60 visible label boxes spread across the document.
- `confirmGiant` pauses sources over 50000 chars on a warn panel.
- `status` reports state, diagram, scale, position, and file.

Stable hooks: `picker`, `canvas`, pan arrows, zoom in and out, readout, Fit, Reset, true size, fullscreen, warn panel with proceed and cancel, error panel. `window.VECTOR` carries `help`, `render`, `reset`, `fit`, `zoom`, `pan`, and `status`.

## Fixtures and CI

`testing/` is gitignored. Local copies drift between machines. `test.1.mmd` is 96 lines of shapes and arrows. `test.2.mmd` is the 485 KB generated giant. My local `test.1.mmd` fails mermaid parse near its `class` line while Sir's copy renders, so confirm fixtures before trusting proof.

CI runs three jobs on `main` and `agent-sandbox`: offline guarantee with no external refs, mermaid 12.1.0 pin marker, contract hooks plus `mermaid.initialize` present. Keep all three green.

## Agent contract

Every console line starts `[VECTOR] event=<name>` with `key=value` pairs after it. Locked names: `file-picked`, `file-read`, `file-rejected`, `render-start`, `render-done`, `render-failed`, `view-default`, `view-fit`, `error-shown`, `warn-shown`, `warn-proceed`, `warn-cancel`, `api-render`, `api-reset`, `api-fit`, `api-zoom`, `api-pan`, `api-status`, `api-help`, `fullscreen`. Sources over 50000 chars pause on a warn panel with proceed and cancel hooks before rendering. `window.VECTOR` carries seven calls: `help` prints the console API, `render` takes source text and returns the render promise, `reset` returns the readable default and returns status, `fit` shows the whole diagram and returns status, `zoom` takes a factor about the center, `pan` takes pixel deltas, `status` returns state, diagram presence, scale, position, and file. Stable hooks cover picker, canvas, all ten buttons, readout, warn panel, and error panel. The suite lives in `tests/agent/suite.js` with fixtures in `tests/fixtures`, headless on isolated sessions, run with `node tests/agent/suite.js`. Agents driving the product load `skills/vector-driver/SKILL.md`.

## Verification lessons

Verify against the real page, not guesses. Browser work runs headless on isolated sessions under agent-browser's own Chromium, never the human window or profile, never headed. Kill leftover sessions when done and confirm zero agent processes. Prefer `eval -b` with base64 over stdin pipes. Read aggregate DOM stats such as counts and medians, never full dumps. Heavy renders run once per task announced first, never on a loop. The eval channel double encodes JSON strings, so unwrap repeatedly before comparing numbers. Never commit diagnosis write-ups or skill copies. `issue-*/` and `.skills/` stay gitignored.
