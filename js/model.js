// Isobaren zeichnen – the model: map generation, the player's lines and
// the scoring. No drawing and no DOM here.
//
//  The pressure field lives on a W × H lattice of grid points. Some are
//  stations (their value is shown), the rest are hidden and only used by
//  the reference. The player draws freehand; each finished stroke is
//  smoothed and snapped to the rim or closed into a ring. Scoring is
//  topological: for every level its lines are burnt into a fine raster and
//  a flood fill tells which stations share a region – a line that stops
//  short leaves a gap and separates nothing.
window.IsoModel = (() => {
  'use strict';
  const { EU, PRESETS, isLand } = window.IsoEurope;

  const RASTER = 16;       // raster pixels per cell for the region test
  const SNAP = 0.4;        // how close an end must be to the rim / a loose end to snap, in cells (at zoom 1)
  // The board's current zoom: snapping and smoothing distances shrink with
  // it, so small wiggles drawn zoomed in survive. Set by js/app.js.
  const view = { z: 1 };
  function snapR() { return SNAP / Math.sqrt(view.z); }

  // Tutorial: 5×5 grid, 6 stations, one isobar, stations always coloured.
  // Wetterlagen: the whole of Europe, 13×11 grid, 5-hPa steps as on DWD charts.
  const MODES = [
    { id: 'tutorial', W: 5, H: 5, stations: [6, 6], levels: [1, 1], grad: [0.55, 0.75], maxCross: 1, hint: true, time: 0 },
    { id: 'synoptic', W: 13, H: 11, stations: [40, 48], levels: [3, 9], maxCross: 3, hint: false, time: 0, interval: 5, europe: true }
  ];
  function ivl() { return mode().interval || 4; }

  // One fixed colour per pressure level, so 1008 looks the same on every map.
  function levelColor(X) {
    const L = window.THEME.isobars.levels;
    const k = Math.round((X - 984) / 4);
    return L[Math.max(0, Math.min(L.length - 1, k))];
  }

  // ---------- seeded RNG ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash32(a, b) {
    let h = Math.imul((a >>> 0) ^ Math.imul(b >>> 0, 0x85ebca6b), 0xc2b2ae35) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
    return h >>> 0;
  }
  function rr(rng, a, b) { return a + (b - a) * rng(); }
  function ri(rng, a, b) { return Math.floor(rr(rng, a, b + 1)); }

  // ---------- state ----------
  const S = {
    modeIdx: 0, preset: 0, seed: 1,
    W: 0, H: 0, vals: [], station: [], levels: [],
    E: [], C: [],
    lines: [],           // {lvl, pts:[{x,y}], closed}
    crossings: [], open: [],
    active: 0, tool: 'pen',
    undo: [], result: null, showRef: false, hintOn: false, hintUsed: false,
    timeLeft: 0, locked: false, timerId: null
  };

  function mode() { return MODES[S.modeIdx]; }


  // ---------- lattice (used by the reference) ----------
  function nodeIdx(i, j) { return j * S.W + i; }

  function buildLattice() {
    const W = S.W, H = S.H, E = [], C = [];
    let i, j;
    const nH = (W - 1) * H;
    for (j = 0; j < H; j++) for (i = 0; i < W - 1; i++) E.push({ a: nodeIdx(i, j), b: nodeIdx(i + 1, j) });
    for (j = 0; j < H - 1; j++) for (i = 0; i < W; i++) E.push({ a: nodeIdx(i, j), b: nodeIdx(i, j + 1) });
    for (j = 0; j < H - 1; j++) for (i = 0; i < W - 1; i++) {
      C.push({
        T: j * (W - 1) + i, B: (j + 1) * (W - 1) + i,
        L: nH + j * W + i, R: nH + j * W + i + 1,
        TL: nodeIdx(i, j), TR: nodeIdx(i + 1, j), BR: nodeIdx(i + 1, j + 1), BL: nodeIdx(i, j + 1)
      });
    }
    S.E = E; S.C = C;
  }

  // ---------- field generation ----------
  function generate() {
    const m = mode();
    S.W = m.W; S.H = m.H;
    buildLattice();
    const base = hash32(S.seed, S.modeIdx * 31 + S.preset);
    // Aim for a random number of isobars within the mode's range, so maps
    // differ in difficulty; relax to the whole range, then to any count,
    // so a new map is always produced and never mixed with the old one.
    // (Europe maps keep real pressure values, so their level count is set by the pattern)
    const want = m.europe ? null : ri(mulberry32(hash32(base, 0x9e3779b9)), m.levels[0], m.levels[1]);
    if (m.europe && !S.landMask) {
      S.landMask = [];
      for (let n = 0; n < m.W * m.H; n++) S.landMask.push(isLand(EU.lon0 + (n % m.W) * EU.dlon, EU.lat0 - Math.floor(n / m.W) * EU.dlat));
    }
    for (let attempt = 0; attempt < 3000; attempt++) {
      const rng = mulberry32(hash32(base, attempt));
      const range = attempt < 2000 ? m.levels : [1, 99];
      if (tryGenerate(rng, m, attempt < 1000 ? want : null, range)) { S.genAttempts = attempt + 1; return; }
    }
    S.genAttempts = -1;
  }

  // A Großwetterlage in real hPa: the preset's pressure systems, each nudged
  // a little (position, strength, size) so no two maps are identical.
  function europeField(rng) {
    const p = PRESETS[S.preset], KX = 111.2 * Math.cos(50 * Math.PI / 180), KY = 111.2;
    const comps = p.comps.map((c) => {
      const r = (c.rot || 0) * Math.PI / 180;
      return { x: (c.lon + rr(rng, -1.5, 1.5)) * KX, y: (c.lat + rr(rng, -1, 1)) * KY, amp: c.amp * rr(rng, 0.9, 1.1),
               sx: c.sx * rr(rng, 0.92, 1.08), sy: c.sy * rr(rng, 0.92, 1.08), cos: Math.cos(r), sin: Math.sin(r) };
    });
    const wave = { a: rr(rng, 0.5, 1.5), kx: rr(rng, 0.8, 1.6), ph: rr(rng, 0, 6.3) };
    // pressure at grid position (x, y), which may lie between grid points
    return function (gxp, gyp) {
      const lon = EU.lon0 + gxp * EU.dlon, lat = EU.lat0 - gyp * EU.dlat;
      const X = lon * KX, Y = lat * KY;
      let v = 1013 + wave.a * Math.sin(wave.kx * lon * Math.PI / 30 + wave.ph);
      for (let k = 0; k < comps.length; k++) {
        const c = comps[k], dx = X - c.x, dy = Y - c.y, u = (dx * c.cos + dy * c.sin) / c.sx, w = (-dx * c.sin + dy * c.cos) / c.sy;
        v += c.amp * Math.exp(-(u * u + w * w) / 2);
      }
      return v;
    };
  }

  // Tutorial field: a tilted plane plus one gentle bump, as a continuous
  // function of grid position (x, y), so the reference can be traced finely.
  function rawField(rng) {
    const W = S.W, H = S.H, ang = rr(rng, 0, Math.PI * 2), gx = Math.cos(ang), gy = Math.sin(ang);
    const c = { x: rr(rng, 0.2, 0.8), y: rr(rng, 0.2, 0.8), amp: rr(rng, -0.4, 0.4), sx: 0.3, sy: 0.3 };
    return function (gxp, gyp) {
      const x = gxp / (W - 1), y = gyp / (H - 1), dx = (x - c.x) / c.sx, dy = (y - c.y) / c.sy;
      return gx * x + gy * y + c.amp * Math.exp(-(dx * dx + dy * dy) / 2);
    };
  }

  function levelsCrossing(a, b) {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    let n = 0;
    const I = ivl();
    for (let X = Math.ceil(lo / I) * I; X < hi; X += I) if (X > lo) n++;
    return n;
  }

  function tryGenerate(rng, m, want, range) {
    const I = ivl();
    let i, k, N, fn;
    if (m.europe) {
      fn = europeField(rng);
    } else {
      const g = rawField(rng), f = [];
      for (i = 0; i < S.W * S.H; i++) f.push(g(i % S.W, Math.floor(i / S.W)));
      N = f.length;
      // Scale the steepest step between neighbours to a fraction of the
      // isobar interval: this sets how tightly the isobars may pack.
      let maxAdj = 0;
      for (k = 0; k < S.E.length; k++) maxAdj = Math.max(maxAdj, Math.abs(f[S.E[k].a] - f[S.E[k].b]));
      if (maxAdj < 1e-9) return false;
      const scale = rr(rng, m.grad[0], m.grad[1]) * I / maxAdj;
      let mean = 0;
      for (i = 0; i < N; i++) mean += f[i];
      mean /= N;
      const centre = rr(rng, 1006, 1020);
      fn = function (x, y) { return centre + (g(x, y) - mean) * scale; };
    }
    // the hidden truth is a continuous field; the grid shows it at the nodes
    const v = [];
    for (i = 0; i < S.W * S.H; i++) v.push(fn(i % S.W, Math.floor(i / S.W)));
    N = v.length;
    // Keep every value at least 0.6 hPa from any isobar level, so the rounded
    // number on screen can never equal a level and never flips sides.
    const raw = v.map((x) => { return Math.round(x * 10) / 10; });
    for (i = 0; i < N; i++) {
      const X = Math.round(v[i] / I) * I;
      if (Math.abs(v[i] - X) < 0.6) v[i] = v[i] >= X ? X + 0.6 + rng() * 0.2 : X - 0.6 - rng() * 0.2;
      v[i] = Math.round(v[i] * 10) / 10;
    }
    for (k = 0; k < S.E.length; k++) if (levelsCrossing(v[S.E[k].a], v[S.E[k].b]) > m.maxCross) return false;

    const nSt = ri(rng, m.stations[0], m.stations[1]);
    const order = [];
    for (i = 0; i < N; i++) order.push(i);
    if (m.europe) {
      // mostly land stations (plus the odd ship or buoy), weighted shuffle
      const key = order.map((n) => { return Math.pow(rng(), 1 / (S.landMask[n] ? 4 : 1)); });
      order.sort((a, b) => { return key[b] - key[a]; });
    } else {
      for (i = N - 1; i > 0; i--) { const r = Math.floor(rng() * (i + 1)), t = order[i]; order[i] = order[r]; order[r] = t; }
    }
    const station = new Array(N).fill(false);
    let placed = 0;
    for (i = 0; i < N && placed < nSt; i++) {
      const n0 = order[i], c0 = n0 % S.W;
      // on the dense Europe grid, two labels side by side would overlap
      if (m.europe && ((c0 > 0 && station[n0 - 1]) || (c0 < S.W - 1 && station[n0 + 1]))) continue;
      station[n0] = true; placed++;
    }

    let lo = Infinity, hi = -Infinity;
    for (i = 0; i < N; i++) if (station[i]) { lo = Math.min(lo, v[i]); hi = Math.max(hi, v[i]); }
    const levels = [];
    for (let L = Math.ceil(lo / I) * I; L < hi; L += I) if (L > lo) levels.push(L);
    if (levels.length < range[0] || levels.length > range[1]) return false;
    if (want && levels.length !== want) return false;
    for (k = 0; k < levels.length; k++) {
      let below = 0, above = 0;
      for (i = 0; i < N; i++) if (station[i]) { if (v[i] < levels[k]) below++; else above++; }
      if (below < 2 || above < 2) return false;
    }
    // Only stations need the nudge; hidden grid points keep their true value.
    // The station nudges are carried into the continuous field with a gentle
    // dent around each station (radius 0.85 cells, so it never reaches the
    // next grid point): the field then matches every shown value, and the
    // reference isobars keep clear of the stations without wobbling.
    const corr = [], W0 = S.W, base = fn;
    for (i = 0; i < N; i++) {
      if (!station[i]) v[i] = raw[i];
      corr.push(station[i] ? v[i] - base(i % W0, Math.floor(i / W0)) : 0);
      // the tutorial only takes maps whose stations need no nudge at all
      if (m.hint && Math.abs(corr[i]) > 0.06) return false;
    }
    fn = function (x, y) {
      let val = base(x, y);
      for (let jj = Math.floor(y); jj <= Math.ceil(y) && jj < S.H; jj++) for (let ii = Math.floor(x); ii <= Math.ceil(x) && ii < W0; ii++) {
        const c = corr[jj * W0 + ii]; if (!c) continue;
        const r2 = ((x - ii) * (x - ii) + (y - jj) * (y - jj)) / 0.7225;
        if (r2 < 1) val += c * (1 - r2) * (1 - r2) * (1 - r2);
      }
      return val;
    };
    S.vals = v; S.station = station; S.levels = levels;
    S.fieldFn = fn; S.fine = null; S.refCache = {};
    return true;
  }

  // ---------- geometry ----------
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function distPtSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
  }
  function distPtLine(p, pts) {
    let d = Infinity;
    for (let i = 1; i < pts.length; i++) d = Math.min(d, distPtSeg(p, pts[i - 1], pts[i]));
    return pts.length === 1 ? dist(p, pts[0]) : d;
  }
  function orient(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
  function intersect(a, b, c, d) {
    const d1 = orient(c, d, a), d2 = orient(c, d, b), d3 = orient(a, b, c), d4 = orient(a, b, d);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      const t = d1 / (d1 - d2);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    return null;
  }
  function pathLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; }

  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    const a = pts[0], b = pts[pts.length - 1];
    let dmax = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distPtSeg(pts[i], a, b);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax <= eps) return [a, b];
    const l = rdp(pts.slice(0, idx + 1), eps), r = rdp(pts.slice(idx), eps);
    return l.slice(0, -1).concat(r);
  }
  // Chaikin corner cutting; keeps both end points where they are.
  function chaikin(pts, iters) {
    for (let k = 0; k < iters && pts.length > 2; k++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        out.push({ x: 0.75 * p.x + 0.25 * q.x, y: 0.75 * p.y + 0.25 * q.y });
        out.push({ x: 0.25 * p.x + 0.75 * q.x, y: 0.25 * p.y + 0.75 * q.y });
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    return pts;
  }
  function resample(pts, step) {
    const out = [pts[0]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = dist(a, b);
      let t = step - carry;
      while (t <= L) { out.push({ x: a.x + (b.x - a.x) * t / L, y: a.y + (b.y - a.y) * t / L }); t += step; }
      carry = L - (t - step);
    }
    if (dist(out[out.length - 1], pts[pts.length - 1]) > 1e-6) out.push(pts[pts.length - 1]);
    return out;
  }

  function clampPt(p) {
    return { x: Math.max(0, Math.min(S.W - 1, p.x)), y: Math.max(0, Math.min(S.H - 1, p.y)) };
  }
  function borderDist(p) { return Math.min(p.x, S.W - 1 - p.x, p.y, S.H - 1 - p.y); }
  function onBorder(p) { return borderDist(p) < 1e-6; }
  // Carry a line straight on in the direction it was heading until it meets
  // the rim, if that happens within maxD -- no kink, unlike a projection.
  function extendToBorder(tail, maxD) {
    const p = tail[tail.length - 1], a = tail[0];
    const l = Math.hypot(p.x - a.x, p.y - a.y);
    let dx = p.x - a.x, dy = p.y - a.y;
    if (l < 0.05) return null;
    dx /= l; dy /= l;
    let t = Infinity;
    if (dx > 1e-9) t = Math.min(t, (S.W - 1 - p.x) / dx); else if (dx < -1e-9) t = Math.min(t, -p.x / dx);
    if (dy > 1e-9) t = Math.min(t, (S.H - 1 - p.y) / dy); else if (dy < -1e-9) t = Math.min(t, -p.y / dy);
    if (!(t <= maxD)) return null;
    const q = clampPt({ x: p.x + dx * t, y: p.y + dy * t });
    // land exactly on the rim
    const bd = [q.x, S.W - 1 - q.x, q.y, S.H - 1 - q.y], k = bd.indexOf(Math.min.apply(null, bd));
    if (k === 0) q.x = 0; else if (k === 1) q.x = S.W - 1; else if (k === 2) q.y = 0; else q.y = S.H - 1;
    return q;
  }
  function projectBorder(p) {
    const d = [p.x, S.W - 1 - p.x, p.y, S.H - 1 - p.y], k = d.indexOf(Math.min.apply(null, d));
    return k === 0 ? { x: 0, y: p.y } : k === 1 ? { x: S.W - 1, y: p.y } : k === 2 ? { x: p.x, y: 0 } : { x: p.x, y: S.H - 1 };
  }

  // ---------- lines ----------
  function looseEnds(except) {
    const out = [];
    S.lines.forEach((L) => {
      if (L === except || L.closed) return;
      const a = L.pts[0], b = L.pts[L.pts.length - 1];
      if (!onBorder(a)) out.push({ line: L, first: true, p: a });
      if (!onBorder(b)) out.push({ line: L, first: false, p: b });
    });
    return out;
  }
  function nearestLooseEnd(p, maxD, lvl, except) {
    let best = null, bd = maxD;
    looseEnds(except).forEach((e) => {
      if (lvl !== undefined && e.line.lvl !== lvl) return;
      const d = dist(p, e.p);
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  }

  // Snap a line's ends to the rim, close it into a ring, or join it to a
  // loose end of another line of the same level.
  function tidy(L) {
    for (let round = 0; round < 4 && !L.closed; round++) {
      let changed = false;
      const first = L.pts[0], last = L.pts[L.pts.length - 1];
      if (!onBorder(first) && !onBorder(last) && dist(first, last) < snapR() && pathLength(L.pts) > 1.2) {
        L.pts.push({ x: first.x, y: first.y }); L.closed = true; break;
      }
      for (let end = 0; end < 2; end++) {
        const isFirst = end === 0, p = isFirst ? L.pts[0] : L.pts[L.pts.length - 1];
        if (onBorder(p)) continue;
        const other = nearestLooseEnd(p, snapR(), L.lvl, L);
        if (other && dist(p, other.p) <= borderDist(p)) {
          const M = other.line, mp = M.pts.slice();
          if (isFirst) L.pts.reverse();
          if (!other.first) mp.reverse();
          L.pts = L.pts.concat(mp);
          S.lines.splice(S.lines.indexOf(M), 1);
          changed = true; break;
        }
        if (borderDist(p) < snapR()) {
          const q = extendToBorder(isFirst ? L.pts.slice(0, 6).reverse() : L.pts.slice(-6), snapR() * 1.8) || projectBorder(p);
          if (isFirst) L.pts.unshift(q); else L.pts.push(q);
          changed = true;
        }
      }
      if (!changed) break;
    }
  }

  function processStroke(raw) {
    // Smooth along the stroke with a small Gaussian (about 0.06 cells at the
    // current zoom): finger jitter goes, curves stay round, and a deliberate
    // kink stays a (slightly rounded) kink that the scoring will see.
    const step = 0.03 / view.z, q = resample(raw, step), n = q.length, sig = 2, K = 6;
    let out = [q[0]];
    for (let i = 1; i < n - 1; i++) {
      const reach = Math.min(K, i, n - 1 - i);
      let sx = 0, sy = 0, sw = 0;
      for (let k = -reach; k <= reach; k++) {
        const w = Math.exp(-k * k / (2 * sig * sig));
        sx += q[i + k].x * w; sy += q[i + k].y * w; sw += w;
      }
      out.push({ x: sx / sw, y: sy / sw });
    }
    if (n > 1) out.push(q[n - 1]);
    if (pathLength(out) > 0.2) out = resample(out, 0.1 / view.z);
    return out.map(clampPt);
  }

  function recompute() {
    // loose ends
    S.open = [];
    S.lines.forEach((L) => {
      if (L.closed) return;
      [L.pts[0], L.pts[L.pts.length - 1]].forEach((p) => { if (!onBorder(p)) S.open.push({ x: p.x, y: p.y, lvl: L.lvl }); });
    });
    // crossings between any two stretches of line (also a line with itself)
    const segs = [];
    S.lines.forEach((L, li) => {
      for (let i = 1; i < L.pts.length; i++) {
        const a = L.pts[i - 1], b = L.pts[i];
        segs.push({ li: li, i: i, a: a, b: b, n: L.pts.length, closed: L.closed,
          x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) });
      }
    });
    const out = [];
    for (let s = 0; s < segs.length; s++) {
      const A = segs[s];
      for (let t = s + 1; t < segs.length; t++) {
        const B = segs[t];
        if (B.x0 > A.x1 || B.x1 < A.x0 || B.y0 > A.y1 || B.y1 < A.y0) continue;
        if (A.li === B.li) {
          const gap = Math.abs(A.i - B.i);
          if (gap <= 1 || (A.closed && gap === A.n - 2)) continue;
        }
        const X = intersect(A.a, A.b, B.a, B.b);
        if (X && !out.some((o) => { return dist(o, X) < 0.15; })) out.push(X);
      }
    }
    S.crossings = out;
  }

  function snapshot() {
    return S.lines.map((L) => { return { lvl: L.lvl, closed: L.closed, pts: L.pts.map((p) => { return { x: p.x, y: p.y }; }) }; });
  }
  function restore(arr) { S.lines = arr; recompute(); }

  // ---------- evaluation ----------
  function regionLabels(X) {
    const gw = (S.W - 1) * RASTER + 1, gh = (S.H - 1) * RASTER + 1, blk = new Uint8Array(gw * gh);
    function plot(x, y) { if (x >= 0 && y >= 0 && x < gw && y < gh) blk[y * gw + x] = 1; }
    S.lines.forEach((L) => {
      if (L.lvl !== X) return;
      for (let i = 1; i < L.pts.length; i++) {
        // Bresenham: an 8-connected line that a 4-connected fill cannot leak through
        let x0 = Math.round(L.pts[i - 1].x * RASTER), y0 = Math.round(L.pts[i - 1].y * RASTER);
        const x1 = Math.round(L.pts[i].x * RASTER), y1 = Math.round(L.pts[i].y * RASTER);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
          plot(x0, y0);
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      }
    });
    const lab = new Int32Array(gw * gh).fill(-1), stack = [];
    let n = 0;
    for (let s = 0; s < gw * gh; s++) {
      if (blk[s] || lab[s] >= 0) continue;
      lab[s] = n; stack.push(s);
      while (stack.length) {
        const c = stack.pop(), cx = c % gw, cy = (c - cx) / gw;
        if (cx > 0 && !blk[c - 1] && lab[c - 1] < 0) { lab[c - 1] = n; stack.push(c - 1); }
        if (cx < gw - 1 && !blk[c + 1] && lab[c + 1] < 0) { lab[c + 1] = n; stack.push(c + 1); }
        if (cy > 0 && !blk[c - gw] && lab[c - gw] < 0) { lab[c - gw] = n; stack.push(c - gw); }
        if (cy < gh - 1 && !blk[c + gw] && lab[c + gw] < 0) { lab[c + gw] = n; stack.push(c + gw); }
      }
      n++;
    }
    return function (node) {
      const i = node % S.W, j = Math.floor(node / S.W), cx = i * RASTER, cy = j * RASTER;
      // a line drawn right over a station: take the nearest free pixel
      for (let r = 0; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < gw && y < gh && lab[y * gw + x] >= 0) return lab[y * gw + x];
      }
      return -1 - node;
    };
  }

  // The reference ("Wahres Feld"): marching squares on a grid five times
  // finer than the board, sampled from the continuous hidden field, so its
  // isobars come out as smooth curves rather than one straight piece per cell.
  const FINE = 5;
  function fineGrid() {
    if (S.fine) return S.fine;
    const w = (S.W - 1) * FINE + 1, h = (S.H - 1) * FINE + 1, v = new Float64Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) v[j * w + i] = S.fieldFn(i / FINE, j / FINE);
    return (S.fine = { w: w, h: h, v: v });
  }
  function referenceLines(X) {
    if (S.refCache[X]) return S.refCache[X];
    const F = fineGrid(), w = F.w, h = F.h, v = F.v, nH = (w - 1) * h, segs = [], byEdge = new Map();
    function pt(e) {
      let a, b;
      if (e < nH) { const j = Math.floor(e / (w - 1)), i = e % (w - 1); a = [i, j]; b = [i + 1, j]; }
      else { const e2 = e - nH, j2 = Math.floor(e2 / w), i2 = e2 % w; a = [i2, j2]; b = [i2, j2 + 1]; }
      const va = v[a[1] * w + a[0]], vb = v[b[1] * w + b[0]], t = (X - va) / (vb - va);
      return { x: (a[0] + (b[0] - a[0]) * t) / FINE, y: (a[1] + (b[1] - a[1]) * t) / FINE };
    }
    function add(e1, e2) {
      const k = segs.length;
      segs.push([e1, e2]);
      [e1, e2].forEach((e) => { if (!byEdge.has(e)) byEdge.set(e, []); byEdge.get(e).push(k); });
    }
    for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
      const tl = v[j * w + i], tr = v[j * w + i + 1], br = v[(j + 1) * w + i + 1], bl = v[(j + 1) * w + i];
      const T = j * (w - 1) + i, B = (j + 1) * (w - 1) + i, L = nH + j * w + i, Rr = L + 1;
      const cr = [];
      if ((tl - X) * (tr - X) < 0) cr.push(T);
      if ((tr - X) * (br - X) < 0) cr.push(Rr);
      if ((br - X) * (bl - X) < 0) cr.push(B);
      if ((bl - X) * (tl - X) < 0) cr.push(L);
      if (cr.length === 2) add(cr[0], cr[1]);
      else if (cr.length === 4) {
        if (((tl + tr + br + bl) / 4 - X) * (tl - X) > 0) { add(T, Rr); add(B, L); } else { add(T, L); add(B, Rr); }
      }
    }
    // chain the pieces into polylines
    const used = new Uint8Array(segs.length), out = [];
    function next(e) { const l = byEdge.get(e) || []; for (let q = 0; q < l.length; q++) if (!used[l[q]]) return l[q]; return -1; }
    for (let s0 = 0; s0 < segs.length; s0++) {
      if (used[s0]) continue;
      used[s0] = 1;
      const ids = [segs[s0][0], segs[s0][1]];
      for (let dir = 0; dir < 2; dir++) {
        for (;;) {
          const endE = ids[ids.length - 1], k = next(endE);
          if (k < 0) break;
          used[k] = 1;
          ids.push(segs[k][0] === endE ? segs[k][1] : segs[k][0]);
        }
        ids.reverse();
      }
      out.push({ lvl: X, pts: ids.map(pt), closed: ids.length > 3 && ids[0] === ids[ids.length - 1] });
    }
    return (S.refCache[X] = out);
  }

  // Highs and lows of the hidden field for "Wahres Feld": interior grid
  // points higher (lower) than all eight neighbours, and clearly above
  // (below) normal pressure.
  function extrema() {
    const out = [];
    for (let e = 0; e < S.vals.length; e++) {
      const i = e % S.W, j = Math.floor(e / S.W), v = S.vals[e];
      if (i === 0 || j === 0 || i === S.W - 1 || j === S.H - 1) continue;
      let isMax = true, isMin = true;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const nv = S.vals[e + dj * S.W + di];
        if (nv >= v) isMax = false;
        if (nv <= v) isMin = false;
      }
      if ((isMax && v > 1015) || (isMin && v < 1011)) out.push({ x: i, y: j, high: isMax });
    }
    return out;
  }

  function evaluate() {
    const N = S.vals.length, res = { levels: [], wrong: new Set(), open: S.open.slice(), crossings: S.crossings.slice() };
    let pairsTot = 0, pairsSep = 0;
    S.levels.forEach((X) => {
      const region = regionLabels(X), comp = {};
      let below = 0, above = 0, i;
      for (i = 0; i < N; i++) if (S.station[i]) {
        const r = region(i);
        comp[r] = comp[r] || { lo: [], hi: [] };
        if (S.vals[i] < X) { comp[r].lo.push(i); below++; } else { comp[r].hi.push(i); above++; }
      }
      let bad = 0, wrongHere = [];
      Object.keys(comp).forEach((r) => {
        const c = comp[r];
        bad += c.lo.length * c.hi.length;
        if (c.lo.length && c.hi.length) {
          // the minority side of a mixed region is what is "on the wrong side"
          const w = c.lo.length < c.hi.length ? c.lo : c.hi.length < c.lo.length ? c.hi : c.lo.concat(c.hi);
          wrongHere = wrongHere.concat(w);
        }
      });
      wrongHere.forEach((n) => { res.wrong.add(n); });
      const tot = below * above;
      pairsTot += tot; pairsSep += tot - bad;

      const mine = S.lines.filter((L) => { return L.lvl === X; });
      res.levels.push({ X: X, drawn: mine.length > 0, sep: tot ? 1 - bad / tot : 1, wrong: wrongHere.length, below: below, above: above });
    });
    res.sep = pairsTot ? pairsSep / pairsTot : 0;

    // smoothness: sample every line every 0.2 cells and add up how much
    // the bending changes from one step to the next. Real isobars bend
    // steadily, so a round ring or a wide even arc adds almost nothing,
    // while a wobble, a zigzag or a kink adds a lot. Per cell of line length,
    // 20 degrees of such change cost about a quarter of this criterion.
    let change = 0, length = 0;
    S.lines.forEach((L) => {
      let q = resample(L.pts, 0.2);
      if (L.closed && q.length > 4) q = q.slice(0, -1).concat(q.slice(1, 3));
      length += pathLength(L.pts);
      let prev = null;
      for (let i = 1; i < q.length - 1; i++) {
        const v1x = q[i].x - q[i - 1].x, v1y = q[i].y - q[i - 1].y, v2x = q[i + 1].x - q[i].x, v2y = q[i + 1].y - q[i].y;
        if (Math.hypot(v1x, v1y) < 0.05 || Math.hypot(v2x, v2y) < 0.05) continue;
        const th = Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y) * 180 / Math.PI;
        if (prev !== null) change += Math.max(0, Math.abs(th - prev) - 2);
        prev = th;
      }
    });
    res.smooth = S.lines.length === 0 || length === 0 ? 0 : Math.exp(-change / length / 70);

    let pts = 75 * res.sep + 25 * res.smooth;
    pts -= 10 * res.open.length + 15 * res.crossings.length;
    if (S.hintUsed && !mode().hint) pts -= 10;
    if (S.lines.length === 0) pts = 0;
    res.score = Math.max(0, Math.round(pts));
    // the top tier needs a structurally correct map
    res.valid = res.wrong.size === 0 && res.open.length === 0 && res.crossings.length === 0 &&
      S.levels.every((X) => { return S.lines.some((L) => { return L.lvl === X; }); });
    return res;
  }

  return {
    S, view, MODES, PRESETS, mode, ivl, levelColor, hash32, snapR, generate,
    dist, distPtLine, pathLength, clampPt, onBorder,
    nearestLooseEnd, tidy, processStroke, recompute, snapshot, restore,
    evaluate, referenceLines, extrema
  };
})();
