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
- Isobars are drawn at a fixed interval — 4 hPa, and 5 hPa on the Europe
  map as on DWD surface charts; the chips above the board list exactly the
  levels that must exist for this map (every multiple of the interval
  between the lowest and the highest station), each with its own fixed
  colour, so 1008 looks the same on every map.
- Drawing is freehand, with finger or mouse. When the finger lifts, the
  stroke is smoothed with a small Gaussian along its length (about 0.06
  cells at the current zoom): finger jitter goes, curves stay round, and a
  deliberate kink stays a kink — so what is shown is what is scored. An end that
  comes within 0.4 cells of the rim snaps onto it, an end that comes back
  near its own start closes the ring (rim snapping carries the line on in
  the direction it was heading where that reaches the rim, so it does not
  bend sharply into it), and an end near a loose end of
  another line of the same level joins the two. Starting a stroke on a loose
  end carries that line on (and switches to its level).
- The lowest isobar is selected when a map opens; the chips switch level.
- **One finger draws, two fingers move.** On a phone, two fingers moving
  together pan the zoomed map, and whatever the map cannot take — all of it
  at full view — scrolls the page, so the page can be scrolled over the
  board without switching tools. Only a clear spreading or pinching of the
  fingers (more than about 25 % change in their distance) switches the
  gesture to zooming; both fingers' moves are applied together once per
  frame, so a sideways move no longer jitters the zoom.
- **Zoom** for small-scale lines: pinch with two fingers, or Ctrl/Cmd +
  mouse wheel (or a trackpad pinch); there are no zoom buttons. When zoomed,
  two fingers (touch) or the right/middle mouse button (desktop) pan the map
  – a one-finger or left-button drag always draws, so it cannot pan. On
  desktop the plain wheel scrolls the page. Zoom scales positions only —
  labels, line widths and markers keep their size, so zooming in makes room
  for detail (the italic values of hidden grid points in „Wahres Feld“
  appear only where they fit, so on a phone you zoom in to read them) — and
  the stroke smoothing, snapping and tap distances shrink with the zoom,
  so small wiggles drawn zoomed in survive. A second finger landing
  mid-stroke cancels that stroke instead of leaving a stray line.
- Tap a line to delete it, or drag across lines with the **Radierer**;
  **Zurück** (or Ctrl/Cmd+Z) undoes either.
- Crossings are not blocked but marked live with a red ✕ — the drawing stays
  fluid, and the rule is still visible the moment it is broken. Loose ends
  inside the field are marked with a hollow ring.

## What the maps show

Every map is **surface pressure** (Bodendruck) in hPa, reduced to sea level
— the kind of chart the DWD publishes as its Bodenwetterkarte — not an
upper-air chart. Upper-air charts (typically 500 hPa, in geopotential
decametres, with isohypses instead of isobars) show troughs and ridges most
clearly; on the surface they appear as bulging isobars and low-pressure
channels. A line under the board states this for the current mode together
with the interval and the scale: on the Europe map one cell is about
390 km at 50°N (the map is stretched towards the pole), with a 500 km
scale bar; the tutorial is a practice field without a geographic scale.
The explainer section „Bodendruck oder Höhenkarte? Und welcher Maßstab?“
says the same for players.

## Scoring

There is no single correct drawing, so the game scores structure, not pixels.

- **Trennung (75 points).** For each level, every pair of stations with one
  below and one above that level must end up on opposite sides of the drawn
  lines. The level's lines are burnt into a raster of 16 pixels per cell
  (Bresenham, 8-connected) and a 4-connected flood fill, which cannot slip
  through such a line, labels the regions; every below/above pair sharing a
  region costs. A line that stops short leaves a gap the fill runs around,
  so it separates nothing. Stations on the wrong side get a red ring.
- **Glattheit (25 points).** Every line is sampled every 0.2 cells and the
  change in bending from one step to the next is added up (ignoring changes
  under 2°). Real isobars bend steadily, so a round ring or a wide even arc
  adds almost nothing, while a wobble, a zigzag or a kink adds a lot. The
  score is exp(−change per cell of line / 70°). Measured on drawn strokes:
  arcs and rings 97–100 %, a slightly shaky hand about 75 %, a very shaky
  one about 40 %, a single sharp kink about 75 %, a wavy line or zigzag
  near 0 %; the true-field isobars score 90–100 %.
- **Penalties.** Isobars never cross: every crossing (between two lines, or
  a line with itself) costs 15 points and marks the result as invalid. An
  isobar never ends in the middle of the field: every loose end costs 10. The **Tipp**, which colours stations red (below) or blue
  (above) relative to the selected level, costs 10 outside the tutorial.

The top verdict and three stars need a structurally correct map: every
level drawn, every station on the right side, no loose ends, no crossings.

After checking, **Wahres Feld** shows the model solution: the isobars of
the complete hidden field, traced by marching squares on a grid five times
finer than the board from the continuous field the map was built from, so
they come out as smooth curves rather than one straight piece per cell. It
also shows the hidden grid values and marks highs with a blue H and lows
with a red T (the SCAPE° pressure colours, `THEME.data.high/low`).
It does not count towards the score; it shows what was really going on
between the stations — the same gap every sparse observing network has.

## Modes

| Mode | What it is |
|---|---|
| Tutorial | 5×5 grid, 6 stations, one isobar, stations always coloured (red below, blue above), step-by-step prompts in the status line under the board |
| Wetterlagen | All of Europe with coastlines, 13×11 grid, 40–48 stations, eight Großwetterlagen |

### Wetterlagen: the whole of Europe

The Wetterlagen mode shows each pattern over the whole continent rather
than a cut-out, so it can be recognised the way it appears on a real
weather chart. The board spans 26°W–40°E and 35–70°N on a 13×11 grid —
5.5° of longitude by 3.5° of latitude, about 390 km each way at 50°N —
drawn over a coastline (Natural Earth 1:50m land, clipped to the board,
simplified and embedded as about 12 KB of tenth-degree coordinates) with a
few cities for orientation. Stations sit mostly on land (weighted four to
one over sea points, the rest standing in for ships and buoys), and never
two side by side, so their labels stay readable on a phone.

The eight Großwetterlagen, named and abbreviated after Hess/Brezowsky:
Westlage (WZ), Hoch Mitteleuropa (HM), Trog Mitteleuropa (TrM), Omega-Lage,
Nordwestlage (NWz), Hoch Fennoskandien (HFa), Südwestlage (SWz) and a
Sturmtief über der Nordsee. Each is built from its pressure systems in real
hPa on 1013 — Islandtief, Azorenhoch, Russlandhoch, the trough reaching
from Scandinavia to the Mediterranean — placed by longitude and latitude,
with sizes in kilometres and optional rotation, so for example the TrM
trough runs between an Atlantic ridge and a Russian high just like on a
500 hPa chart. Every map jitters positions (±1.5° lon, ±1° lat), strengths
(±10 %) and sizes (±8 %) and adds a faint long wave, so no two are the
same while the pattern stays unmistakable. The values are not rescaled, so
pressures run from the low 980s to the upper 1030s and a map has six to
nine isobars. After checking, **Wahres Feld** draws every isobar of the
hidden field — not only the ones the stations call for — and marks its
highs and lows with H and T, so the whole Großwetterlage appears.

These are idealised fields, not historical analyses; loading real station
data (for example from the DWD) for well-known situations is the natural
next step.

## Map generation

Every map is built from a continuous pressure field: for the tutorial a
tilted plane with one gentle bump, rescaled so the step between
neighbouring grid points is 55–75 % of the 4 hPa interval; for Wetterlagen
the Großwetterlage's pressure systems in real hPa. The grid shows that field
at its points. Every station value is kept at least 0.6 hPa from a level,
so the rounded number on screen never equals a level and never shows the
wrong side of it; that small nudge is carried into the continuous field as
a gentle dent around the station (radius 0.85 cells, so it never reaches
the next grid point), so the field matches every shown value exactly and
the reference isobars keep clear of the stations. The tutorial only takes
maps whose stations need no nudge, so its model solution has no dents at
all. Hidden grid points keep their true value. Stations are a random
subset, and the generator retries until the number of levels fits and
every level has at least two stations on each side. Best scores per mode
are kept in `localStorage`.

## Tasks and Merke box

Three optional tasks unlock the "Merke" box (key insight: isobars join equal
pressure, never cross, never end in the field; rings round low values are
lows, round high values highs; tight lines mean strong wind):

| Task | Done when |
|---|---|
| Solve the tutorial | a tutorial check is structurally correct (every station on the right side, no loose end, no crossing) |
| Two stars on a Wetterlage | a Wetterlagen check scores at least 70 points |
| Find T and H | „Wahres Feld“ is switched on after checking a Wetterlagen map |

The score, stars and the best score per mode (in `localStorage`) stay – this
is the one game app among the SCAPE° exhibits.

## Run

Open `index.html` (double-click works, no build, no server, works offline),
or serve the folder with any static file server / GitHub Pages.

URL switches for staff:

- `?kiosk` – exhibit mode: after 3 minutes without touch the page starts
  again and the best scores of earlier visitors are cleared.

There is no staff panel. `window.__isodraw` exposes the state, the evaluator
and `solve()` (fills the board with the true-field isobars) for automated
checks.

## Files

```
index.html          structure only (data-t placeholders for every text)
css/kit.css         shared SCAPE° components (same in every app)
css/app.css         layout of this app
js/view.js          phone/desktop layout switch (loaded in <head>)
js/texts.js         fills the texts from content/
js/brand.js         fills logo and footer line from the theme
js/kit.js           fullscreen button, hint badge, info notes, tasks/Merke, kiosk mode
js/europe.js        coastline, cities and the eight Großwetterlagen (numbers only)
js/model.js         map generation, lines, snapping, scoring, reference field
js/render.js        drawing the board on the canvas
js/app.js           layout, zoom, drawing input, modes, tools, result, tasks
content/texts.de.js every visible text, incl. the Wetterlagen descriptions and city names
theme/              the design: font, palette, logo, colours (see theme/README.md)
```

State is a list of polylines (points plus level plus closed flag), not a
pixel mask; the raster only exists for the moment of scoring. Undo stores
snapshots of that list.

## Layout

Phone: mode, Wetterlage, level chips, the square board with a status line
and the map note below, tools, readout, Prüfen/Zurück/Neue Karte, result,
hint, tasks, Merke. Desktop (automatic from 1000 px, or via the
"Desktop-/Handy-Ansicht" toggle, remembered for this app only): the board on
the left, sized to the screen; everything else on the right. Longer
explanations sit in collapsible topics below; the footer names the sources
(Natural Earth coastline, Großwetterlagen after Hess/Brezowsky).

The board frame is square; the map keeps its own proportions inside it and
leaves a band at the top for the first-hint badge and the fullscreen button
(which therefore sits top right here). Canvas text is never smaller than
12 px on screen.

## Adapting

Design: `theme/` only (map colours in `THEME.isobars`, the level colours run
from red for low to blue for high pressure, matching T red / H blue).
Texts: `content/texts.de.js` only (lines marked `LOCAL` refer to the German
weather service DWD as the national reference). Founders Grotesk is used
when installed, otherwise the system fallback.
