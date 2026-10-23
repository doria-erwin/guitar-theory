/* SVG renderers. They return markup strings and never read global state; callers pass everything in. */
const Render = (() => {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];

  /**
   * Horizontal fretboard, high e on top.
   * opts: { tuning, min, max, markers: {"s:f": {cls, label, ring, title}}, ghost: fn(s,f)->label|null, clickable, id, compact }
   */
  function fretboard(opts) {
    const tun = opts.tuning; const min = Math.max(0, opts.min | 0); const max = Math.min(24, Math.max(min + 1, opts.max | 0));
    const fw = opts.compact ? 40 : 48, gap = opts.compact ? 26 : 30, left = 30, top = 22;
    const openW = min === 0 ? 40 : 0;
    const frets = max - (min === 0 ? 0 : min - 1);           // number of fret spaces drawn (excluding open column)
    const bodyFrets = min === 0 ? max : max - min + 1;
    const W = left + openW + bodyFrets * fw + 10, H = top + gap * 5 + 40;
    const nutX = left + openW;
    const xOf = f => f === 0 ? left + openW / 2 : nutX + (f - (min === 0 ? 1 : min) + 0.5) * fw;
    const yOf = s => top + (5 - s) * gap;   // s = 0 low E → bottom row
    let o = `<svg class="fb" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(opts.label || 'Guitar fretboard')}">`;
    o += `<rect class="fb-wood" x="${nutX}" y="${top - 12}" width="${bodyFrets * fw}" height="${gap * 5 + 24}" rx="3"/>`;
    for (let f = (min === 0 ? 1 : min); f <= max; f++) {
      const cx = xOf(f), cy = top + gap * 2.5;
      if (f === 12 || f === 24) o += `<circle class="fb-inlay" cx="${cx}" cy="${top + gap * 1.5}" r="5"/><circle class="fb-inlay" cx="${cx}" cy="${top + gap * 3.5}" r="5"/>`;
      else if (INLAYS.includes(f)) o += `<circle class="fb-inlay" cx="${cx}" cy="${cy}" r="5"/>`;
    }
    for (let f = (min === 0 ? 1 : min); f <= max; f++) { const x = nutX + (f - (min === 0 ? 1 : min) + 1) * fw; o += `<line class="fb-fret" x1="${x}" x2="${x}" y1="${top - 12}" y2="${top + gap * 5 + 12}"/>`; }
    o += `<line class="${min === 0 ? 'fb-nut' : 'fb-fret'}" x1="${nutX}" x2="${nutX}" y1="${top - 12}" y2="${top + gap * 5 + 12}"/>`;
    for (let s = 0; s < 6; s++) {
      const y = yOf(s);
      o += `<line class="fb-string" x1="${min === 0 ? left + 6 : nutX}" x2="${W - 10}" y1="${y}" y2="${y}" stroke-width="${(0.9 + (5 - (5 - s)) * 0.32).toFixed(2)}"/>`;
      o += `<text class="fb-open" x="${12}" y="${y + 4}">${esc(tun.names[s])}</text>`;
    }
    for (let f = (min === 0 ? 0 : min); f <= max; f++) o += `<text class="fb-num${INLAYS.includes(f) || f % 12 === 0 && f ? ' is-inlay' : ''}" x="${xOf(f)}" y="${top + gap * 5 + 30}">${f}</text>`;
    const r = opts.compact ? 10.5 : 12.5;
    for (let s = 0; s < 6; s++) for (let f = min; f <= max; f++) {
      const key = s + ':' + f, m = opts.markers && opts.markers[key];
      const x = xOf(f), y = yOf(s), midi = tun.midi[s] + f;
      const attrs = opts.clickable ? ` data-act="fbnote" data-s="${s}" data-f="${f}" data-midi="${midi}" tabindex="0" role="button"` : '';
      if (m) {
        const lab = String(m.label == null ? '' : m.label);
        const fs = lab.length >= 3 ? 8.5 : lab.length === 2 ? 10 : 11;
        o += `<g class="fb-dot ${m.cls || ''}"${attrs} aria-label="${esc(m.title || lab)}"><circle cx="${x}" cy="${y}" r="${r}"/>${m.ring ? `<circle class="fb-ring" cx="${x}" cy="${y}" r="${r + 3.5}"/>` : ''}<text x="${x}" y="${y + fs * 0.36}" font-size="${fs}">${esc(lab)}</text></g>`;
      } else if (opts.ghost) {
        const g = opts.ghost(s, f);
        if (g != null) o += `<g class="fb-dot ghost"${attrs} aria-label="${esc(g)}"><circle cx="${x}" cy="${y}" r="${r - 2}"/><text x="${x}" y="${y + 3.4}" font-size="9">${esc(g)}</text></g>`;
        else if (opts.clickable) o += `<rect class="fb-hit"${attrs} x="${x - fw / 2}" y="${y - gap / 2}" width="${fw}" height="${gap}" aria-label="string ${6 - s} fret ${f}"/>`;
      } else if (opts.clickable) o += `<rect class="fb-hit"${attrs} x="${x - fw / 2}" y="${y - gap / 2}" width="${fw}" height="${gap}" aria-label="string ${6 - s} fret ${f}"/>`;
    }
    return o + '</svg>';
  }

  /**
   * Vertical chord box (low E on the left), like a chord chart.
   * v: { frets[6] (null muted), fingers[6], barre, degrees[6] }  opts: { label, showDegrees, rootPc, tuning }
   */
  function chordBox(v, opts = {}) {
    const fretted = v.frets.filter(f => f != null && f > 0);
    const lo = fretted.length ? Math.min(...fretted) : 1, hi = fretted.length ? Math.max(...fretted) : 1;
    const start = hi <= 4 ? 1 : lo; const rows = Math.max(4, hi - start + 1);
    const sw = 22, rh = 26, left = 38, top = 34, W = left + sw * 5 + 30, H = top + rh * rows + 34;
    const xs = s => left + s * sw; const ys = f => top + (f - start + 0.5) * rh;
    let o = `<svg class="cbox" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opts.label || 'Chord diagram')}">`;
    o += start === 1 ? `<rect class="cb-nut" x="${left - 1}" y="${top - 5}" width="${sw * 5 + 2}" height="5"/>` : `<text class="cb-pos" x="${left - 12}" y="${top + rh * 0.62}">${start}fr</text>`;
    for (let i = 0; i <= rows; i++) o += `<line class="cb-line" x1="${left}" x2="${left + sw * 5}" y1="${top + i * rh}" y2="${top + i * rh}"/>`;
    for (let s = 0; s < 6; s++) o += `<line class="cb-line" x1="${xs(s)}" x2="${xs(s)}" y1="${top}" y2="${top + rows * rh}"/>`;
    v.frets.forEach((f, s) => { if (f == null) o += `<text class="cb-x" x="${xs(s)}" y="${top - 12}">×</text>`; else if (f === 0) o += `<circle class="cb-open${v.degrees && v.degrees[s] === '1' ? ' is-root' : ''}" cx="${xs(s)}" cy="${top - 16}" r="5"/>`; });
    if (v.barre && v.barre.to > v.barre.from) o += `<rect class="cb-barre" x="${xs(v.barre.from) - 9}" y="${ys(v.barre.fret) - 9}" width="${xs(v.barre.to) - xs(v.barre.from) + 18}" height="18" rx="9"/>`;
    v.frets.forEach((f, s) => {
      if (f == null || f === 0) return;
      const isRoot = v.degrees && v.degrees[s] === '1';
      const inBarre = v.barre && v.barre.fret === f && s >= v.barre.from && s <= v.barre.to && v.fingers[s] === v.barre.finger;
      if (!inBarre || isRoot || s === v.barre.from) o += `<circle class="cb-dot${isRoot ? ' is-root' : ''}" cx="${xs(s)}" cy="${ys(f)}" r="9"/>`;
      if (v.fingers[s] && (!inBarre || s === v.barre.from)) o += `<text class="cb-fing" x="${xs(s)}" y="${ys(f) + 3.8}">${v.fingers[s]}</text>`;
    });
    if (opts.showDegrees && v.degrees) v.degrees.forEach((d, s) => { if (d) o += `<text class="cb-deg${d === '1' ? ' is-root' : ''}" x="${xs(s)}" y="${top + rows * rh + 16}">${esc(d)}</text>`; });
    if (opts.notes) opts.notes.forEach((n, s) => { if (n) o += `<text class="cb-note" x="${xs(s)}" y="${top + rows * rh + 30}">${esc(n)}</text>`; });
    return o + '</svg>';
  }

  /* Circle of fifths. keys: [{major, minor, sig}] clockwise from C; selected index. */
  function circle(keys, sel) {
    const S = 340, c = S / 2, R1 = 160, R2 = 112, R3 = 68;
    const seg = (r0, r1, a0, a1) => { const p = (r, a) => [c + r * Math.sin(a), c - r * Math.cos(a)]; const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0); return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`; };
    let o = `<svg class="cof" viewBox="0 0 ${S} ${S}" role="group" aria-label="Circle of fifths">`;
    keys.forEach((k, i) => {
      const a0 = (i - 0.5) * Math.PI / 6, a1 = (i + 0.5) * Math.PI / 6, am = i * Math.PI / 6;
      const on = i === sel ? ' is-sel' : '';
      o += `<g class="cof-seg${on}" data-act="cof" data-i="${i}" tabindex="0" role="button" aria-label="${esc(k.major)} major, relative ${esc(k.minor)}, ${esc(k.sig)}">`;
      o += `<path class="cof-outer" d="${seg(R2, R1, a0, a1)}" style="--h:${(i * 30 + 200) % 360}"/>`;
      o += `<path class="cof-inner" d="${seg(R3, R2, a0, a1)}" style="--h:${(i * 30 + 200) % 360}"/>`;
      const tx = (r, dy = 0) => `x="${c + r * Math.sin(am)}" y="${c - r * Math.cos(am) + dy}"`;
      o += `<text class="cof-maj" ${tx(142, 6)}>${esc(k.major)}</text><text class="cof-sig" ${tx(124, 4)}>${esc(k.short)}</text><text class="cof-min" ${tx(90, 4)}>${esc(k.minor)}</text></g>`;
    });
    o += `<circle class="cof-hub" cx="${c}" cy="${c}" r="${R3 - 2}"/><text class="cof-hubt" x="${c}" y="${c - 4}">${esc(keys[sel].major)}</text><text class="cof-hubs" x="${c}" y="${c + 14}">${esc(keys[sel].sig)}</text>`;
    return o + '</svg>';
  }

  /* Note-value glyphs drawn as SVG so they render without music fonts. */
  function noteGlyph(kind) {
    const head = (filled, x = 12) => `<ellipse cx="${x}" cy="30" rx="6.5" ry="4.6" transform="rotate(-20 ${x} 30)" class="${filled ? 'ng-fill' : 'ng-hollow'}"/>`;
    const stem = (x = 18) => `<line x1="${x}" y1="30" x2="${x}" y2="6" class="ng-stem"/>`;
    const flag = (n, x = 18) => Array.from({ length: n }, (_, i) => `<path d="M${x},${6 + i * 6} q9,5 6,16" class="ng-flag"/>`).join('');
    const dot = '<circle cx="28" cy="29" r="2.2" class="ng-fill"/>';
    const map = {
      whole: head(false), half: head(false) + stem(), quarter: head(true) + stem(), eighth: head(true) + stem() + flag(1), sixteenth: head(true) + stem() + flag(2),
      'dotted-half': head(false) + stem() + dot, 'dotted-quarter': head(true) + stem() + dot, 'dotted-eighth': head(true) + stem() + flag(1) + dot,
      'rest-whole': '<rect x="6" y="16" width="16" height="5" class="ng-fill"/><line x1="2" x2="26" y1="16" y2="16" class="ng-stem"/>',
      'rest-half': '<rect x="6" y="19" width="16" height="5" class="ng-fill"/><line x1="2" x2="26" y1="24" y2="24" class="ng-stem"/>',
      'rest-quarter': '<path d="M12,6 l6,7 -5,6 6,7 q-7,-2 -5,6 q-8,-7 1,-7 l-5,-6 4,-6z" class="ng-fill"/>',
      'rest-eighth': '<circle cx="11" cy="14" r="3" class="ng-fill"/><path d="M11,16 q6,1 9,-4 L13,34" class="ng-stem"/>',
      'rest-sixteenth': '<circle cx="11" cy="12" r="2.6" class="ng-fill"/><circle cx="9" cy="20" r="2.6" class="ng-fill"/><path d="M11,14 q6,1 9,-4 L12,36 M9,22 q6,1 9,-4" class="ng-stem"/>'
    };
    return `<svg class="ng" viewBox="0 0 34 40" width="34" height="40" aria-hidden="true">${map[kind] || ''}</svg>`;
  }
  return { fretboard, chordBox, circle, noteGlyph, esc };
})();
