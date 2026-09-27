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
- Drawing is freehand, with finger or mouse. When the finger lifts, the
  stroke is simplified (Ramer–Douglas–Peucker) and rounded off (Chaikin
  corner cutting), so a shaky hand still gives a calm curve. An end that
  comes within 0.4 cells of the rim snaps onto it, an end that comes back
  near its own start closes the ring, and an end near a loose end of
  another line of the same level joins the two. Starting a stroke on a loose
  end carries that line on (and switches to its level).
- Tap a line to delete it, or drag across lines with the **Radierer**;
  **Zurück** (or Ctrl/Cmd+Z) undoes either.
- Crossings are not blocked but marked live with a red ✕ — the drawing stays
  fluid, and the rule is still visible the moment it is broken. Loose ends
  inside the field are marked with a hollow ring.

## Scoring

There is no single correct drawing, so the game scores structure, not pixels.

- **Trennung (60 points).** For each level, every pair of stations with one
  below and one above that level must end up on opposite sides of the drawn
  lines. The level's lines are burnt into a raster of 16 pixels per cell
  (Bresenham, 8-connected) and a 4-connected flood fill, which cannot slip
  through such a line, labels the regions; every below/above pair sharing a
  region costs. A line that stops short leaves a gap the fill runs around,
  so it separates nothing. Stations on the wrong side get a red ring.
- **Nähe zur Referenz (25 points).** Distance between the player's lines
  and the interpolated reference, measured both ways (points along the
  player's lines to the reference, and points along the reference to the
  player's lines), counting fully at 0 and not at all beyond 0.8 cells;
  combined as an F1 score and weighted by reference length.
- **Glattheit (15 points).** The turning angle along every line, sampled
  every 0.2 cells: gentle bends up to 20° are free, sharper kinks cost more
  and more up to 70°.
- **Penalties.** Isobars never cross: every crossing (between two lines, or
  a line with itself) costs 15 points and marks the result as invalid. An
  isobar never ends in the middle of the field: every loose end costs 10. The **Tipp**, which colours stations blue/red relative
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
| Sturm | 9×9 grid, a deep low with tightly packed rings — often two isobars between neighbouring grid points — 4–6 isobars, 2 minutes |
| Wetterlagen | Idealised Central European patterns: Westwetterlage, Hoch über Mitteleuropa, Sturmtief über der Nordsee, Omega-Lage, Trog |

The Wetterlagen are idealised pressure fields built to look like those
patterns, not real historical analyses; loading actual station data (for
example from the DWD) for well-known storms is the natural next step.

## Map generation

Each map is a sum of Gaussian highs and lows plus a background gradient,
rescaled so the steepest step between neighbouring grid points is a set
fraction of the 4 hPa interval — below one interval in most modes, up to
1.6 intervals in Sturm, which is what packs its rings so tightly. Every
value is kept at least 0.6 hPa from a level, so the rounded number on
screen never equals a level and never shows the wrong side of it. Stations
are a random subset, and the generator retries until the number of levels
matches a randomly chosen target for the mode and every level has at least
two stations on each side (falling back to the mode's range, then to any
count, so a new map is always produced). Best scores per mode are kept in
`localStorage`.

## Tech

- One self-contained `index.html`: canvas + plain JavaScript, no build step,
  no server, no dependencies beyond a Google Fonts stylesheet.
- State is a list of polylines (points plus level plus closed flag), not a
  pixel mask; the raster only exists for the moment of scoring. Undo stores
  snapshots of that list.
- Design: SCAPE° corporate design (Archivo, thick ink borders, poster-hero
  layout), mobile-first and optimised for touch, with a desktop view that is
  auto-detected and can be toggled by hand.
- `window.__isodraw` exposes the state, the evaluator and `solve()` (fills
  the board with the reference isobars) for automated checks.

Deployed like the other SCAPE° exhibits: GitHub Pages serving the `main`
branch root. Open `index.html` directly, or serve the folder with any static
file server.
