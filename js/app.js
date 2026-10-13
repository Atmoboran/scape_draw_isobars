// Isobaren zeichnen – board layout, zoom, drawing input and the page
// around the board (modes, Wetterlagen, level chips, tools, readout,
// result, tasks). Model in js/model.js, drawing in js/render.js, words in
// content/texts.de.js.
(() => {
  'use strict';
  const M = window.IsoModel;
  const { S, PRESETS } = M;
  const $ = id => document.getElementById(id);

  // ================================================================
  //  Layout and zoom
  // ================================================================
  const frame = $('stage-frame');
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const PAD = 0.62;        // board margin, in cells
  const TOP = 48;          // room above the map for the first-hint badge and the fullscreen button
  const ZMAX = 5;
  // u: cell size at zoom 1; s: cell size on screen; ox/oy: grid point (0, 0)
  const G = { s: 40, u: 40, ox: 0, oy: 0, ox0: 0, oy0: 0, w: 0, h: 0, dpr: 1, z: 1, tx: 0, ty: 0 };
  let drag = null, hover = null;

  // The map fits into the frame (square on the page, the whole screen in
  // fullscreen) and keeps its own proportions.
  function layout() {
    const w = frame.clientWidth, h = frame.clientHeight;
    if (!w || !h) return;
    const cols = S.W - 1 + 2 * PAD, rows = S.H - 1 + 2 * PAD;
    const s = Math.min(w / cols, (h - TOP) / rows);
    G.u = s; G.w = w; G.h = h;
    G.ox0 = (w - cols * s) / 2 + PAD * s;
    G.oy0 = TOP + (h - TOP - rows * s) / 2 + PAD * s;
    G.dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(w * G.dpr); canvas.height = Math.round(h * G.dpr);
    applyView();
  }

  function applyView() {
    G.z = Math.max(1, Math.min(ZMAX, G.z));
    G.tx = Math.min(0, Math.max(G.w * (1 - G.z), G.tx));
    G.ty = Math.min(0, Math.max(G.h * (1 - G.z), G.ty));
    G.s = G.u * G.z; G.ox = G.tx + G.ox0 * G.z; G.oy = G.ty + G.oy0 * G.z;
    M.view.z = G.z;
  }
  // zoom by factor f keeping the point under (cx, cy) (stage pixels) in place
  function zoomAt(cx, cy, f) {
    const bx = (cx - G.tx) / G.z, by = (cy - G.ty) / G.z;
    G.z = Math.max(1, Math.min(ZMAX, G.z * f));
    G.tx = cx - bx * G.z; G.ty = cy - by * G.z;
    applyView(); draw();
  }
  function resetView() { G.z = 1; G.tx = 0; G.ty = 0; applyView(); }

  function draw() { window.IsoRender.draw(ctx, G, { drag, hover }); }

  // ================================================================
  //  Input
  // ================================================================
  const badge = SCAPE.badge(frame);
  let interacted = false;
  function showFirstHint() {
    if (interacted) return;
    badge.show(M.mode().id === 'tutorial' ? t('badge.tutorial', S.active) : t('badge.synoptic'));
  }

  function toBoard(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left - G.ox) / G.s, y: (ev.clientY - r.top - G.oy) / G.s };
  }
  function lineNear(p, maxD) {
    let best = null, bd = maxD;
    S.lines.forEach(L => { const d = M.distPtLine(p, L.pts); if (d < bd) { bd = d; best = L; } });
    return best;
  }

  let flashMsg = null, flashTimer = 0;
  function flash(msg) {
    flashMsg = msg;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashMsg = null; updateStatusLine(); }, 1600);
    updateStatusLine();
  }

  function edited() {
    if (S.result) { S.result = null; S.showRef = false; $('result').hidden = true; renderLevels(); }
  }

  function eraseAt(p) {
    const r = 0.25 / G.z;
    let L = lineNear(p, r), changed = false;
    while (L) { S.lines.splice(S.lines.indexOf(L), 1); changed = true; L = lineNear(p, r); }
    return changed;
  }

  // One finger draws. Two fingers move: they pan the zoomed map, and
  // whatever the map cannot take (all of it at full view) scrolls the page.
  // Only a clear spreading or pinching of the fingers switches to zooming.
  // With a mouse: Ctrl + wheel zooms, the right or middle button pans.
  const touches = new Map();
  let gest = null, pan = null, gestureHold = false, gestRaf = 0;
  function capture(ev) { try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ } }
  function stageXY(ev) { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
  function twoFingers() {
    const pts = Array.from(touches.values()).slice(0, 2);
    return { c: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }, d: Math.max(10, M.dist(pts[0], pts[1])) };
  }
  function gestureFrame() {
    gestRaf = 0;
    if (!gest || touches.size < 2) return;
    const st = twoFingers();
    if (!gest.mode) {
      if (Math.abs(Math.log(st.d / gest.d0)) > 0.22) gest.mode = 'zoom';
      else if (M.dist(st.c, gest.c0) > 8) gest.mode = 'pan';
    }
    if (gest.mode === 'pan') {
      const dx = st.c.x - gest.last.x, dy = st.c.y - gest.last.y, ty0 = G.ty;
      G.tx += dx; G.ty += dy;
      applyView();
      const rest = dy - (G.ty - ty0);
      if (Math.abs(rest) > 0.01) window.scrollBy(0, -rest);
      draw();
    } else if (gest.mode === 'zoom') {
      const r = canvas.getBoundingClientRect(), cx = st.c.x - r.left, cy = st.c.y - r.top;
      if (!gest.anchor) gest.anchor = { bx: (cx - G.tx) / G.z, by: (cy - G.ty) / G.z, z0: G.z, d0: st.d };
      G.z = Math.max(1, Math.min(ZMAX, gest.anchor.z0 * st.d / gest.anchor.d0));
      G.tx = cx - gest.anchor.bx * G.z; G.ty = cy - gest.anchor.by * G.z;
      applyView(); draw();
    }
    gest.last = st.c;
  }

  canvas.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    // touches are tracked in viewport coordinates, which stay put when the page scrolls
    if (ev.pointerType !== 'mouse') touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    // a second finger turns the touch into a move/zoom gesture; the stroke
    // the first finger had begun is dropped
    if (touches.size === 2) {
      if (drag) { M.restore(drag.before); drag = null; }
      const st = twoFingers();
      gest = { c0: st.c, d0: st.d, last: st.c, mode: null, anchor: null };
      gestureHold = true;
      draw(); return;
    }
    if (touches.size > 2 || gestureHold) return;
    // mouse: right or middle button pans
    if (ev.pointerType === 'mouse' && (ev.button === 1 || ev.button === 2)) {
      capture(ev);
      pan = { id: ev.pointerId, p0: stageXY(ev), tx0: G.tx, ty0: G.ty };
      return;
    }
    if (S.locked) return;
    if (!interacted) { interacted = true; badge.hide(); }
    capture(ev);
    const p = toBoard(ev);
    drag = { id: ev.pointerId, p0: p, moved: false, changed: false, before: M.snapshot(), raw: null, cont: null };
    if (S.tool === 'pen') {
      // Starting on a loose end carries that line on, whatever its level.
      const e = M.nearestLooseEnd(p, M.snapR());
      if (e) {
        drag.cont = e.line;
        if (e.first) e.line.pts.reverse();
        if (e.line.lvl !== S.active) { S.active = e.line.lvl; renderLevels(); }
        const endP = e.line.pts[e.line.pts.length - 1];
        drag.raw = [{ x: endP.x, y: endP.y }];
      } else {
        drag.raw = [M.clampPt(p)];
      }
    } else if (eraseAt(p)) {
      drag.changed = true; M.recompute();
    }
    draw();
  });

  canvas.addEventListener('pointermove', ev => {
    if (touches.has(ev.pointerId)) touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (gest) {
      // both fingers report separately; handle them together once per frame
      if (!gestRaf) gestRaf = requestAnimationFrame(gestureFrame);
      return;
    }
    if (pan && pan.id === ev.pointerId) {
      const q0 = stageXY(ev);
      G.tx = pan.tx0 + q0.x - pan.p0.x; G.ty = pan.ty0 + q0.y - pan.p0.y;
      applyView(); draw();
      return;
    }
    const p = toBoard(ev);
    if (!drag || drag.id !== ev.pointerId) {
      if (ev.pointerType === 'mouse' && S.tool === 'eraser' && !S.locked) {
        const h = lineNear(p, 0.25 / G.z);
        if (h !== hover) { hover = h; draw(); }
      }
      return;
    }
    if (M.dist(p, drag.p0) > 0.12 / G.z) drag.moved = true;
    if (S.tool === 'eraser') {
      if (eraseAt(p)) { drag.changed = true; M.recompute(); edited(); }
    } else {
      const q = M.clampPt(p), last = drag.raw[drag.raw.length - 1];
      if (M.dist(q, last) > 0.04 / G.z) drag.raw.push(q);
    }
    draw();
  });

  function endDrag(ev) {
    if (!drag || drag.id !== ev.pointerId) return;
    if (S.tool === 'pen') {
      if (!drag.moved && !drag.cont) {
        // a tap on a line removes it (undo brings it back)
        const L = lineNear(drag.p0, 0.22 / G.z);
        if (L) { S.lines.splice(S.lines.indexOf(L), 1); drag.changed = true; }
      } else if (drag.raw.length > 1) {
        const pts = M.processStroke(drag.raw);
        let line;
        if (drag.cont) {
          line = drag.cont;
          line.pts = line.pts.concat(pts.slice(1));
        } else if (M.pathLength(pts) > 0.25) {
          line = { lvl: S.active, pts, closed: false };
          S.lines.push(line);
        }
        if (line) { M.tidy(line); drag.changed = true; }
      }
    }
    if (drag.changed) {
      S.undo.push(drag.before); if (S.undo.length > 200) S.undo.shift();
      M.recompute(); edited();
      if (S.crossings.length) flash(t('status.noCrossing'));
    }
    drag = null;
    draw(); updateStatus();
  }
  function pointerEnd(ev) {
    touches.delete(ev.pointerId);
    if (gest && touches.size < 2) gest = null;
    if (touches.size === 0) gestureHold = false;
    if (pan && pan.id === ev.pointerId) { pan = null; return; }
    endDrag(ev);
  }
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('contextmenu', ev => ev.preventDefault());
  // Ctrl (or Cmd) + mouse wheel – and a trackpad pinch, which browsers
  // report the same way – zooms; the plain wheel scrolls the page as usual.
  canvas.addEventListener('wheel', ev => {
    if (!ev.ctrlKey && !ev.metaKey) return;
    ev.preventDefault();
    const q = stageXY(ev);
    zoomAt(q.x, q.y, Math.exp(-ev.deltaY * 0.0015));
  }, { passive: false });
  canvas.addEventListener('pointerleave', () => { if (!drag && hover) { hover = null; draw(); } });

  // ================================================================
  //  Page around the board
  // ================================================================
  const tasks = SCAPE.tasks($('iso-tasks'));
  function taskDone(id) { if (tasks.done(id)) $('task-status').textContent = t('tasks.done.' + id); }

  const bestKey = m => 'isoBest_' + m.id;
  function getBest(m) { try { const v = localStorage.getItem(bestKey(m)); return v === null ? null : +v; } catch (e) { return null; } }
  function setBest(m, v) { try { localStorage.setItem(bestKey(m), String(v)); } catch (e) { /* private mode */ } }

  function renderModes() {
    const row = $('mode-row');
    row.innerHTML = '';
    M.MODES.forEach((m, idx) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn';
      b.setAttribute('aria-pressed', String(idx === S.modeIdx));
      const name = document.createElement('span');
      name.textContent = t('modes.' + m.id);
      const sub = document.createElement('span'); sub.className = 'sub';
      const best = getBest(m);
      sub.textContent = best === null ? t('modes.noBest') : t('modes.best', best);
      const wrap = document.createElement('span');
      wrap.append(name, sub);
      b.appendChild(wrap);
      b.addEventListener('click', () => { if (S.modeIdx !== idx) { S.modeIdx = idx; newMap(false); } });
      row.appendChild(b);
    });
  }

  function renderLevels() {
    const row = $('level-row');
    row.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'level-label'; label.textContent = t('levels.label');
    row.appendChild(label);
    S.levels.forEach(X => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'level-chip';
      b.setAttribute('aria-pressed', String(X === S.active));
      b.setAttribute('aria-label', t('levels.aria', X));
      b.style.setProperty('--c', M.levelColor(X));
      b.textContent = X;
      if (S.result) {
        const lr = S.result.levels.find(l => l.X === X);
        const st = document.createElement('span'); st.className = 'st';
        st.textContent = lr.sep >= 0.999 ? '✓' : '✗';
        b.appendChild(st);
      }
      b.addEventListener('click', () => { S.active = X; renderLevels(); showFirstHint(); updateStatusLine(); draw(); });
      row.appendChild(b);
    });
  }

  // the line under the board: what to do next, or what went wrong
  function updateStatusLine() {
    let txt = '', cls = '';
    const r = S.result;
    if (flashMsg) { txt = flashMsg; cls = 'warn'; }
    else if (S.locked && S.timeLeft <= 0 && M.mode().time) { txt = t('status.timeUp'); cls = 'warn'; }
    else if (r) {
      const top = r.valid && r.score >= 90;
      txt = top ? t('status.great') : r.wrong.size ? t('status.wrongSide') : t('status.seeTruth');
      cls = top ? 'good' : '';
    }
    else if (S.crossings.length) { txt = t('status.crossing'); cls = 'warn'; }
    else if (M.mode().id === 'tutorial') {
      const X = S.active;
      if (!S.lines.length) txt = t('status.tutorialStart', X);
      else if (S.open.length) txt = t('status.tutorialOpen');
      else if (M.evaluate().sep < 0.999) txt = t('status.tutorialMixed');
      else { txt = t('status.tutorialDone'); cls = 'good'; }
    } else if (!S.lines.length) {
      txt = t('status.synopticStart');
    } else {
      txt = t('status.synopticDraw', S.active, M.ivl());
    }
    const el = $('status');
    el.textContent = txt;
    el.className = 'readout status' + (cls ? ' ' + cls : '');
  }

  function setPressed(id, on) { $(id).setAttribute('aria-pressed', String(!!on)); }

  function updateStatus() {
    $('ro-stations').textContent = S.station.filter(Boolean).length;
    const drawn = new Set(S.lines.map(L => L.lvl));
    $('ro-levels').textContent = t('readout.levelsOf', S.levels.filter(X => drawn.has(X)).length, S.levels.length);
    $('ro-open').textContent = t('readout.openValue', S.open.length, S.crossings.length);
    $('ro-open').classList.toggle('bad', S.open.length + S.crossings.length > 0);
    $('btn-undo').disabled = !S.undo.length || S.locked;
    $('tool-clear').disabled = !S.lines.length || S.locked;
    const hintBtn = $('tool-hint'), m = M.mode();
    setPressed('tool-hint', S.hintOn || m.hint);
    hintBtn.disabled = m.hint || S.locked;
    $('tool-hint-label').textContent = t('tools.hint');
    $('tool-hint-sub').textContent = m.hint ? t('tools.hintAlways') : S.hintOn ? t('tools.hintOn') : t('tools.hintCost');
    setPressed('tool-pen', S.tool === 'pen');
    setPressed('tool-eraser', S.tool === 'eraser');
    $('tool-pen').disabled = S.locked; $('tool-eraser').disabled = S.locked;
    updateStatusLine();
  }

  function renderNote() {
    const m = M.mode();
    const coarse = matchMedia('(pointer: coarse)').matches;
    $('map-note').innerHTML = t('mapNote.pressure', M.ivl()) + ' · ' +
      (m.europe ? t('mapNote.scaleEurope') : t('mapNote.scalePractice')) + ' · ' +
      (coarse ? t('mapNote.touch') : t('mapNote.mouse'));
    canvas.setAttribute('aria-label', m.europe ? t('stageAria.synoptic') : t('stageAria.tutorial'));
  }

  function renderPreset() {
    const syn = M.mode().id === 'synoptic';
    $('preset-row').hidden = !syn;
    if (!syn) { $('preset-note').hidden = true; $('preset-info').setAttribute('aria-expanded', 'false'); }
    if (syn) {
      const p = PRESETS[S.preset];
      $('preset-title').textContent = t('presets.' + p.id + '.title');
      $('preset-count').textContent = t('presets.count', S.preset + 1, PRESETS.length, t('presets.' + p.id + '.code'));
      $('preset-note').innerHTML = t('presets.' + p.id + '.desc');
    }
  }

  function stopTimer() { if (S.timerId) { clearInterval(S.timerId); S.timerId = null; } }
  function startTimer() {
    stopTimer();
    if (!M.mode().time) return;
    S.timeLeft = M.mode().time;
    S.timerId = setInterval(() => {
      if (S.result || S.locked) return;
      S.timeLeft--;
      if (S.timeLeft <= 0) { stopTimer(); runCheck(true); }
      updateStatus();
    }, 1000);
  }

  function newMap(reseed) {
    if (reseed) S.seed = M.hash32(S.seed, Date.now() & 0x7fffffff);
    M.generate();
    S.lines = []; S.undo = []; S.result = null; S.showRef = false;
    S.hintOn = false; S.hintUsed = false; S.locked = false; S.tool = 'pen';
    S.active = S.levels[0];
    resetView();
    renderNote();
    M.recompute();
    $('result').hidden = true;
    layout();
    renderModes(); renderPreset(); renderLevels();
    startTimer();
    showFirstHint();
    updateStatus(); draw();
  }

  function runCheck(timeUp) {
    const r = M.evaluate();
    S.result = r;
    if (timeUp) { S.locked = true; stopTimer(); }
    const m = M.mode(), best = getBest(m);
    if (best === null || r.score > best) { setBest(m, r.score); renderModes(); }

    $('res-score').textContent = r.score;
    const tier = r.valid && r.score >= 90 ? 3 : r.score >= 70 ? 2 : r.score >= 40 ? 1 : 0;
    $('res-stars').textContent = ['☆☆☆', '★☆☆', '★★☆', '★★★'][tier];
    $('res-stars').setAttribute('aria-label', t('result.starsAria', tier));
    $('res-verdict').textContent = r.crossings.length ? t('result.invalid') : tier === 3 ? t('result.top') :
      r.score >= 70 && r.wrong.size ? t('result.almost', r.wrong.size) :
      r.score >= 70 ? t('result.good') : r.score >= 40 ? t('result.onTheWay') : t('result.again');
    [['sep', r.sep], ['smooth', r.smooth]].forEach(([k, v]) => {
      $('res-' + k).textContent = t('result.percent', Math.round(v * 100));
      $('bar-' + k).style.width = Math.round(v * 100) + '%';
    });
    const pen = [];
    if (r.crossings.length) pen.push(t('result.penCrossings', r.crossings.length));
    if (r.open.length) pen.push(t('result.penOpen', r.open.length));
    if (S.hintUsed && !m.hint) pen.push(t('result.penHint'));
    if (timeUp) pen.push(t('result.penTime'));
    $('res-pen').textContent = pen.join(' · ');
    const ul = $('res-levels');
    ul.innerHTML = '';
    r.levels.forEach(l => {
      const li = document.createElement('li');
      const lv = document.createElement('span'); lv.className = 'lv';
      const dot = document.createElement('span'); dot.className = 'dot'; dot.style.setProperty('--c', M.levelColor(l.X));
      lv.append(dot, ' ' + t('result.level', l.X));
      const tx = document.createElement('span');
      if (!l.drawn) tx.innerHTML = t('result.missing', l.below, l.above);
      else if (l.sep >= 0.999) tx.innerHTML = t('result.separated', l.below + l.above);
      else tx.innerHTML = t('result.partly', Math.round(l.sep * 100), l.wrong);
      li.append(lv, tx); ul.appendChild(li);
    });
    setPressed('btn-ref', false);
    $('btn-retry').textContent = S.locked ? t('result.newMap') : t('result.retry');
    $('result').hidden = false;
    // tasks
    if (m.id === 'tutorial' && r.valid) taskDone('tutorial');
    if (m.id === 'synoptic' && r.score >= 70) taskDone('score');
    renderLevels(); updateStatus(); draw();
    $('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('btn-check').addEventListener('click', () => { if (!S.locked) runCheck(false); });
  $('btn-undo').addEventListener('click', () => {
    if (!S.undo.length || S.locked) return;
    M.restore(S.undo.pop()); edited(); updateStatus(); draw();
  });
  $('btn-new').addEventListener('click', () => newMap(true));
  $('tool-pen').addEventListener('click', () => { S.tool = 'pen'; hover = null; updateStatus(); draw(); });
  $('tool-eraser').addEventListener('click', () => { S.tool = 'eraser'; updateStatus(); draw(); });
  $('tool-hint').addEventListener('click', () => {
    if (M.mode().hint) return;
    S.hintOn = !S.hintOn;
    if (S.hintOn) S.hintUsed = true;
    updateStatus(); draw();
  });
  $('tool-clear').addEventListener('click', () => {
    if (!S.lines.length || S.locked) return;
    S.undo.push(M.snapshot()); S.lines = []; M.recompute(); edited(); updateStatus(); draw();
  });
  $('btn-ref').addEventListener('click', () => {
    S.showRef = !S.showRef;
    setPressed('btn-ref', S.showRef);
    if (S.showRef && M.mode().id === 'synoptic') taskDone('truth');
    draw();
  });
  $('btn-retry').addEventListener('click', () => {
    if (S.locked) { newMap(true); return; }
    edited(); updateStatus(); draw();
    frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('preset-prev').addEventListener('click', () => { S.preset = (S.preset + PRESETS.length - 1) % PRESETS.length; newMap(false); });
  $('preset-next').addEventListener('click', () => { S.preset = (S.preset + 1) % PRESETS.length; newMap(false); });

  document.addEventListener('keydown', ev => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) {
      ev.preventDefault(); $('btn-undo').click();
    }
  });

  // Kiosk mode (?kiosk): after 3 minutes without touch the kit restarts the
  // page; the best scores of earlier visitors go with it.
  SCAPE.onIdle = () => {
    M.MODES.forEach(m => { try { localStorage.removeItem(bestKey(m)); } catch (e) { /* private mode */ } });
    location.replace(location.pathname + location.search);
  };

  // relayout on resize, view switch (js/view.js fires resize) and fullscreen
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { layout(); draw(); });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

  // Hook for automated checks: fills the board with the reference isobars.
  window.__isodraw = {
    state: S,
    solve() {
      S.lines = [];
      S.levels.forEach(X => { S.lines = S.lines.concat(M.referenceLines(X)); });
      M.recompute(); edited(); updateStatus(); draw();
    },
    evaluate: M.evaluate, recompute: M.recompute,
    view: () => ({ z: +G.z.toFixed(2), tx: Math.round(G.tx), ty: Math.round(G.ty) })
  };

  S.seed = Date.now() >>> 0;
  newMap(false);
})();
