# SCAPE° — Isobaren zeichnen

A browser game about reading a weather map backwards: the board shows
measuring stations with their air pressure in hPa, and the player draws the
**isobars** — the lines of equal pressure — instead of colouring in areas.
The point is that an isobar lives *between* the numbers: somewhere between a
station at 1006 hPa and one at 1010 hPa the 1008 line has to pass. That is
contour interpolation, not painting by numbers.

## How it plays

- The field is a lattice of grid points. Some are stations (their value is
  shown), the rest are hidden and only revealed after checking.
- Isobars are drawn at a fixed interval of 4 hPa; the chips above the board
  list exactly the levels that must exist for this map (every multiple of
  4 hPa between the lowest and the highest station), each with its own fixed
  colour, so 1008 looks the same on every map.
- Drawing snaps to the midpoints of the edges between grid points, and a
  segment always joins two midpoints of the same cell — the same pieces a
  marching-squares contour is built from, so straight and diagonal runs look
  like real isobars rather than a staircase. Drag across the board to draw,
  drag back over the last piece to take it back, tap a piece to delete it,
  or switch to the **Radierer**. Starting on the loose end of an existing
  line continues that line (and switches to its level).
- The pen refuses anything that cannot be an isobar: two isobars touching or
  crossing, a line running through a point that already has one, or a line
  touching an edge and turning back instead of crossing it.

## Scoring

There is no single correct drawing, so the game scores structure, not pixels.

- **Trennung (60 points).** For each level, every pair of stations with one
  below and one above that level must end up on opposite sides of the drawn
  lines. Lines cut the lattice edges they pass through; a union-find over the
  grid points (plus the diagonal connections inside each cell that the
  segments leave open) gives the regions, and every below/above pair sharing
  a region costs. Stations on the wrong side get a red ring.
- **Nähe zur Referenz (25 points).** F1 score between the player's midpoints
  and the reference's, with one cell of tolerance.
- **Glattheit (15 points).** Every interior point of a line is a turn of 0°,
  45° or 90°; the penalty grows with the square of the angle.
- **Penalties.** An isobar never ends in the middle of the field: every open
  end costs 10 points (and a dangling end does not count as a cut, so it also
  separates nothing). The **Tipp**, which colours stations blue/red relative
  to the selected level, costs 10 outside the tutorial.

After checking, **Referenz einblenden** overlays the computer's isobars —
marching squares with linear interpolation on the complete hidden field —
and shows the hidden grid values, so the player can see *why* their drawing
differs.

## Modes

| Mode | What it is |
|---|---|
| Tutorial | 5×5 grid, 6 stations, one isobar, stations always coloured, step-by-step prompts |
| Klassisch | 7×7 grid, 16–20 stations, 2–4 isobars, no help |
| Sturm | 9×9 grid, a deep low with tightly packed rings, 3–5 isobars, 2 minutes |
| Wetterlagen | Idealised Central European patterns: Westwetterlage, Hoch über Mitteleuropa, Sturmtief über der Nordsee, Omega-Lage, Trog |

The Wetterlagen are idealised pressure fields built to look like those
patterns, not real historical analyses; loading actual station data (for
example from the DWD) for well-known storms is the natural next step.

## Map generation

Each map is a sum of Gaussian highs and lows plus a background gradient,
rescaled so the steepest step between neighbouring grid points stays below
the 4 hPa interval. That guarantees no edge is ever crossed by two isobars,
so one snap point per edge is always enough and the snapped reference is
itself a valid drawing. Every value is kept at least 0.6 hPa from a level,
so the rounded number on screen never equals a level and never shows the
wrong side of it. Stations are a random subset, and the generator retries
until the number of levels fits the mode and every level has at least two
stations on each side. Best scores per mode are kept in `localStorage`.

## Tech

- One self-contained `index.html`: canvas + plain JavaScript, no build step,
  no server, no dependencies beyond a Google Fonts stylesheet.
- State is a set of segments (pairs of edge midpoints with a level), not a
  pixel mask; undo stores snapshots of that set.
- Design: SCAPE° corporate design (Archivo, thick ink borders, poster-hero
  layout), mobile-first and optimised for touch, with a desktop view that is
  auto-detected and can be toggled by hand.
- `window.__isodraw` exposes the state, the evaluator and `solve()` (fills
  the board with the snapped reference) for automated checks.

Deployed like the other SCAPE° exhibits: GitHub Pages serving the `main`
branch root. Open `index.html` directly, or serve the folder with any static
file server.
