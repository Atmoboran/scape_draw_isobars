// Isobaren zeichnen – drawing the board on the canvas: sea, land and
// cities (Wetterlagen), the grid, the reference field, the player's lines,
// stations, loose ends and crossings. Colours from THEME.isobars / THEME.data,
// words from content/texts.de.js.
window.IsoRender = (() => {
  'use strict';
  const M = window.IsoModel;
  const { S } = M;
  const { EU, COAST, CITIES, geoToGrid } = window.IsoEurope;
  const IC = window.THEME.isobars, DATA = window.THEME.data, FONT = window.THEME.font;

  // G: layout of the board on the canvas (set by js/app.js).
  //   u: cell size at zoom 1 (sizes of text and marks); s: cell size on screen
  //   (positions); ox/oy: screen position of grid point (0, 0).
  // Zooming scales positions only, so labels and lines keep their size and
  // zooming in makes room for small-scale detail.
  let ctx = null, G = null;
  const px = x => G.ox + x * G.s;
  const py = y => G.oy + y * G.s;

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // a value in a pill (circles and pills belong to the CD shape vocabulary)
  function pill(text, x, y, fs, fill, stroke, color, lw) {
    ctx.font = '500 ' + fs + 'px ' + FONT;
    const tw = ctx.measureText(text).width, pw = tw + fs * 0.7, ph = fs * 1.45;
    roundRect(x - pw / 2, y - ph / 2, pw, ph, ph / 2);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = lw || 1.5; ctx.strokeStyle = stroke; ctx.stroke(); }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + fs * 0.04);
  }

  function tracePath(pts) {
    ctx.beginPath();
    ctx.moveTo(px(pts[0].x), py(pts[0].y));
    if (pts.length < 3) { for (let i = 1; i < pts.length; i++) ctx.lineTo(px(pts[i].x), py(pts[i].y)); return; }
    // quadratic curves through the midpoints: smooth even for the raw live stroke
    for (let k = 1; k < pts.length - 1; k++) {
      const mx = (pts[k].x + pts[k + 1].x) / 2, my = (pts[k].y + pts[k + 1].y) / 2;
      ctx.quadraticCurveTo(px(pts[k].x), py(pts[k].y), px(mx), py(my));
    }
    ctx.lineTo(px(pts[pts.length - 1].x), py(pts[pts.length - 1].y));
  }

  function pointAt(pts, frac) {
    const half = M.pathLength(pts) * frac;
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = M.dist(pts[i - 1], pts[i]);
      if (acc + d >= half) {
        const t = (half - acc) / d;
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
      }
      acc += d;
    }
    return pts[0];
  }
  // Where along a line to put its label: of a few candidates, the one
  // farthest from any station, so the tag never hides a number.
  function labelPoint(pts) {
    let best = null, bd = -1;
    [0.5, 0.35, 0.65, 0.2, 0.8].forEach(f => {
      const q = pointAt(pts, f);
      let d = Infinity;
      for (let n = 0; n < S.vals.length; n++) if (S.station[n]) d = Math.min(d, M.dist(q, { x: n % S.W, y: Math.floor(n / S.W) }));
      if (d > bd + 0.05) { bd = d; best = q; }
    });
    return best;
  }

  // Sea, land and a few cities under the grid, clipped to the board.
  function drawEurope(minF) {
    const s = G.s, u = G.u;
    ctx.save();
    ctx.beginPath(); ctx.rect(px(0), py(0), (S.W - 1) * s, (S.H - 1) * s); ctx.clip();
    ctx.fillStyle = IC.sea;
    ctx.fillRect(px(0), py(0), (S.W - 1) * s, (S.H - 1) * s);
    ctx.beginPath();
    COAST.forEach(poly => {
      poly.forEach((c, k) => {
        const q = geoToGrid(c.lon, c.lat);
        if (k) ctx.lineTo(px(q.x), py(q.y)); else ctx.moveTo(px(q.x), py(q.y));
      });
      ctx.closePath();
    });
    ctx.fillStyle = IC.land; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = IC.coast; ctx.stroke();
    const fs = Math.max(minF, u * 0.22);
    ctx.font = '500 ' + fs + 'px ' + FONT;
    ctx.textBaseline = 'middle';
    CITIES.forEach(c => {
      const q = geoToGrid(c[1], c[2]), x = px(q.x), y = py(q.y);
      ctx.fillStyle = IC.muted;
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      // labels sit right of the dot, or left of it near the eastern rim
      ctx.textAlign = c[3] ? 'right' : 'left';
      ctx.fillText(t('cities.' + c[0]), c[3] ? x - 4 : x + 4, y + fs * 0.75);
    });
    // scale bar: 500 km, true at 50°N (the map is stretched towards the pole)
    const KM_PER_CELL = EU.dlon * 111.2 * Math.cos(50 * Math.PI / 180);
    const bx0 = px(0.25), bx1 = px(0.25 + 500 / KM_PER_CELL), by0 = py(S.H - 1 - 0.3);
    ctx.strokeStyle = IC.ink; ctx.lineWidth = 2; ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(bx0, by0 - 4); ctx.lineTo(bx0, by0); ctx.lineTo(bx1, by0); ctx.lineTo(bx1, by0 - 4);
    ctx.stroke();
    ctx.fillStyle = IC.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(t('map.scaleBar'), bx0, by0 - 5);
    ctx.restore();
  }

  // ui: { drag, hover } – the stroke being drawn and the line under the eraser
  function draw(context, layout, ui) {
    ctx = context; G = layout;
    const s = G.s, u = G.u, m = M.mode();
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    const minF = window.SCAPE.minFont(ctx) || 12;   // canvas text never below ≈ 12 px on screen
    ctx.fillStyle = IC.land;
    ctx.fillRect(0, 0, G.w, G.h);

    if (m.europe) drawEurope(minF);

    // grid
    ctx.strokeStyle = m.europe ? IC.gridFaint : IC.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < S.W; i++) { ctx.moveTo(px(i), py(0)); ctx.lineTo(px(i), py(S.H - 1)); }
    for (let j = 0; j < S.H; j++) { ctx.moveTo(px(0), py(j)); ctx.lineTo(px(S.W - 1), py(j)); }
    ctx.stroke();
    ctx.strokeStyle = IC.rim; ctx.lineWidth = 2;
    ctx.strokeRect(px(0), py(0), (S.W - 1) * s, (S.H - 1) * s);

    // reference overlay: every isobar of the hidden field, dashed
    if (S.showRef) {
      ctx.save();
      ctx.setLineDash([u * 0.12, u * 0.1]); ctx.lineWidth = Math.max(1.5, u * 0.05); ctx.lineCap = 'round';
      const I = M.ivl(), vmin = Math.min(...S.vals), vmax = Math.max(...S.vals);
      for (let X = Math.ceil(vmin / I) * I; X < vmax; X += I) {
        ctx.strokeStyle = M.levelColor(X);
        ctx.beginPath();
        M.referenceLines(X).forEach(L => {
          L.pts.forEach((q, k) => { if (k) ctx.lineTo(px(q.x), py(q.y)); else ctx.moveTo(px(q.x), py(q.y)); });
        });
        ctx.stroke();
      }
      ctx.restore();
    }

    // the player's isobars
    const lw = Math.max(2.5, u * 0.085);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    S.lines.forEach(L => {
      const hot = ui.hover === L && S.tool === 'eraser';
      ctx.strokeStyle = M.levelColor(L.lvl);
      ctx.lineWidth = hot ? lw * 1.8 : lw;
      ctx.globalAlpha = hot ? 0.5 : 1;
      tracePath(L.pts); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    if (ui.drag && ui.drag.raw && ui.drag.raw.length > 1) {
      ctx.strokeStyle = M.levelColor(S.active); ctx.lineWidth = lw;
      tracePath(ui.drag.raw); ctx.stroke();
    }

    // stations and hidden grid points
    const fs = Math.max(minF, Math.min(16, u * 0.26));
    const hintLvl = (S.hintOn || m.hint) ? S.active : null;
    for (let n = 0; n < S.vals.length; n++) {
      const x = px(n % S.W), y = py(Math.floor(n / S.W));
      const txt = String(Math.round(S.vals[n]));
      if (S.station[n]) {
        let fill = IC.paper;
        if (hintLvl !== null) fill = S.vals[n] < hintLvl ? IC.below : IC.above;
        const wrong = S.result && S.result.wrong.has(n);
        pill(txt, x, y, fs, fill, wrong ? IC.wrong : IC.ink, IC.ink, wrong ? 3 : 1.5);
      } else if (S.showRef && s >= fs * 2.6) {   // hidden values only where they fit (zoom in on small screens)
        ctx.font = 'italic 500 ' + Math.max(minF, fs * 0.85) + 'px ' + FONT;
        ctx.fillStyle = IC.hidden; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, x, y);
      } else {
        ctx.beginPath(); ctx.arc(x, y, Math.max(1.6, u * 0.04), 0, Math.PI * 2);
        ctx.fillStyle = IC.dot; ctx.fill();
      }
    }

    // highs and lows of the true field: H blue, T red (the same in every app)
    if (S.showRef) {
      const hs = Math.max(minF * 1.6, u * 0.6);
      ctx.font = '500 ' + hs + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      M.extrema().forEach(e => {
        const x = px(e.x), y = py(e.y) - Math.max(u * 0.5, hs * 0.75), letter = e.high ? t('map.high') : t('map.low');
        ctx.lineWidth = 4; ctx.strokeStyle = IC.paper; ctx.strokeText(letter, x, y);
        ctx.fillStyle = e.high ? DATA.high : DATA.low; ctx.fillText(letter, x, y);
      });
    }

    // one label per line, along it where it hides no station
    if (!ui.drag) {
      S.lines.forEach(L => {
        if (M.pathLength(L.pts) < 1) return;
        const q = labelPoint(L.pts);
        pill(String(L.lvl), px(q.x), py(q.y), Math.max(minF, fs * 0.8), IC.land, M.levelColor(L.lvl), M.levelColor(L.lvl), 1.5);
      });
    }
    // loose ends: an isobar never stops in the middle of the field
    S.open.forEach(o => {
      ctx.beginPath(); ctx.arc(px(o.x), py(o.y), lw * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = IC.paper; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = M.levelColor(o.lvl); ctx.stroke();
    });
    // crossings: a red ✕
    S.crossings.forEach(c => {
      const r = lw * 1.4, x = px(c.x), y = py(c.y);
      ctx.beginPath(); ctx.arc(x, y, r * 1.25, 0, Math.PI * 2); ctx.fillStyle = IC.paper; ctx.fill();
      ctx.strokeStyle = IC.wrong; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.7); ctx.lineTo(x + r * 0.7, y + r * 0.7);
      ctx.moveTo(x + r * 0.7, y - r * 0.7); ctx.lineTo(x - r * 0.7, y + r * 0.7); ctx.stroke();
    });
  }

  return { draw };
})();
