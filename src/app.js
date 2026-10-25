/* App core: one state object, one delegated event listener per event type, views render from state. */
const T = Theory, esc = Render.esc;

const Store = (() => {
  let ok = false;
  try { const k = '__gte'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); ok = true; } catch (e) { ok = false; }
  const mem = {};
  return {
    get available() { return ok; },
    get(k, d) { try { const v = ok ? window.localStorage.getItem(k) : mem[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { const s = JSON.stringify(v); try { if (ok) window.localStorage.setItem(k, s); else mem[k] = s; } catch (e) { mem[k] = s; } },
    del(k) { try { if (ok) window.localStorage.removeItem(k); delete mem[k]; } catch (e) { delete mem[k]; } }
  };
})();

const DEFAULTS = {
  view: 'scales', root: 'A', tuning: 'std', custom: ['E', 'A', 'D', 'G', 'B', 'E'], labels: 'degree', theme: 'dark',
  fbMin: 0, fbMax: 15, showRoots: true, showGhost: false, showMarkers: true, colorByInterval: true,
  fbHighlight: 'scale', scale: 'minpent', pos: 'all', showChordTones: false,
  chord: 'm7', voicing: 0, finder: [], finderBass: null, invChord: 'maj', inv: 0,
  arp: 'maj7', arpPos: 'all', prog: 'pop', tempo: 90, beatsPerChord: 4, loop: true, met: { sig: '4/4', sub: 1, on: false },
  intA: { n: 'C', o: 4 }, intB: { n: 'E', o: 4 }, intRow: 'M3', cof: 0,
  practice: { ex: 'note', level: 'beginner' }, quizOpen: true, quizMode: {}
};
const VALID = {
  view: ['fretboard', 'intervals', 'scales', 'builder', 'finder', 'shapes', 'inversions', 'arpeggios', 'keys', 'progressions', 'rhythm', 'techniques', 'harmony', 'tips', 'practice', 'basics'],
  labels: ['degree', 'note', 'finger', 'none'], theme: ['dark', 'light']
};
/* Load persisted settings, replacing anything invalid with defaults so the UI never shows undefined/NaN. */
function loadState() {
  const saved = Store.get('gte.settings', {}) || {};
  const s = JSON.parse(JSON.stringify(DEFAULTS));
  for (const k of Object.keys(DEFAULTS)) if (saved[k] !== undefined && typeof saved[k] === typeof DEFAULTS[k]) s[k] = saved[k];
  if (!VALID.view.includes(s.view)) s.view = DEFAULTS.view;
  if (!T.ROOTS.includes(s.root)) s.root = DEFAULTS.root;
  if (!VALID.labels.includes(s.labels)) s.labels = 'degree';
  if (saved.theme === undefined) { try { s.theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch (e) { /* keep default */ } }
  if (!VALID.theme.includes(s.theme)) s.theme = 'dark';
  if (s.tuning !== 'custom' && !T.TUNINGS.some(t => t.id === s.tuning)) s.tuning = 'std';
  try { if (!Array.isArray(s.custom) || s.custom.length !== 6) throw 0; s.custom.forEach(n => T.parseNote(n)); } catch (e) { s.custom = DEFAULTS.custom.slice(); }
  if (!T.SCALES.some(x => x.id === s.scale)) s.scale = DEFAULTS.scale;
  if (!T.CHORDS.some(x => x.id === s.chord)) s.chord = DEFAULTS.chord;
  if (!T.PROGRESSIONS.some(x => x.id === s.prog)) s.prog = DEFAULTS.prog;
  const clampInt = (v, a, b, d) => Number.isFinite(v) ? Math.min(b, Math.max(a, Math.round(v))) : d;
  s.fbMin = clampInt(s.fbMin, 0, 23, 0); s.fbMax = clampInt(s.fbMax, s.fbMin + 1, 24, 15);
  s.tempo = clampInt(s.tempo, 30, 260, 90); s.cof = clampInt(s.cof, 0, 11, 0); s.inv = clampInt(s.inv, 0, 3, 0); s.voicing = clampInt(s.voicing, 0, 20, 0);
  s.beatsPerChord = clampInt(s.beatsPerChord, 1, 8, 4);
  if (!s.met || typeof s.met !== 'object') s.met = Object.assign({}, DEFAULTS.met);
  s.met.on = false;
  if (!s.quizMode || typeof s.quizMode !== 'object' || Array.isArray(s.quizMode)) s.quizMode = {};
  if (!Array.isArray(s.finder)) s.finder = [];
  s.finder = s.finder.filter(x => Number.isInteger(x) && x >= 0 && x < 12);
  if (!(s.finderBass === null || (Number.isInteger(s.finderBass) && s.finder.includes(s.finderBass)))) s.finderBass = null;
  return s;
}
let S = loadState();
const save = () => { const c = Object.assign({}, S); delete c.met; c.met = Object.assign({}, S.met, { on: false }); Store.set('gte.settings', c); };

/* ---------- Derived helpers ---------- */
const tuning = () => S.tuning === 'custom' ? T.customTuning(S.custom) : (T.TUNINGS.find(t => t.id === S.tuning) || T.TUNINGS[0]);
const rootNote = () => T.parseNote(S.root);
const flatPref = () => T.prefersFlats(S.root) ? 'flat' : 'sharp';
const noteNames = arr => arr.map(n => n.name).join(' ');
/* Spelling context: pc → spelled name, falls back to the key's sharp/flat preference. */
function speller(spelled) { const m = {}; (spelled || []).forEach(n => { m[n.pc] = n.name; }); const pref = flatPref(); return pc => m[T.mod(pc)] || T.pcName(pc, pref); }
const octaveName = midi => Math.floor(midi / 12) - 1;
const DEG_CLASS = d => { const n = T.parseDegree(d).n; const s = ((n - 1) % 7) + 1; return s === 1 ? 'iv-1' : s === 3 ? 'iv-3' : s === 5 ? 'iv-5' : s === 7 ? 'iv-7' : 'iv-x'; };

/* Build fretboard markers for a set of degrees over the current root, honouring the global toggles. */
function degreeMarkers(degrees, opts = {}) {
  const tun = tuning(), r = rootNote(), spell = speller(opts.spelled || degrees.map(d => T.degreeNote(r, d)));
  const map = {}; const semis = degrees.map(d => T.mod(T.degreeSemis(d)));
  const lim = opts.notes ? null : [opts.min != null ? opts.min : S.fbMin, opts.max != null ? opts.max : S.fbMax];
  const cells = opts.notes || T.fretboardNotes(tun).filter(c => c.f >= lim[0] && c.f <= lim[1]);
  cells.forEach(c => {
    const pc = T.mod(tun.midi[c.s] + c.f); const i = semis.indexOf(T.mod(pc - r.pc)); if (i < 0) return;
    const d = c.degree || degrees[i]; const isRoot = T.mod(pc - r.pc) === 0;
    if (isRoot && !S.showRoots) return;
    let cls = isRoot ? 'root' : (opts.blue && opts.blue.includes(d)) || c.blue ? 'blue' : 'tone';
    if (opts.byInterval && !isRoot) cls = DEG_CLASS(d);
    const label = S.labels === 'note' ? spell(pc) : S.labels === 'finger' ? (c.finger != null ? (c.finger || 'o') : d) : S.labels === 'none' ? '' : d;
    map[c.s + ':' + c.f] = { cls, label, ring: opts.ring && opts.ring.includes(d), title: spell(pc) + ' (' + d + '), string ' + (6 - c.s) + ' fret ' + c.f };
  });
  return map;
}
function ghostFn(spell) { return S.showGhost ? (s, f) => spell(tuning().midi[s] + f) : null; }

/* Fretboard block with its toolbar; id keeps horizontal scroll position across re-renders. */
function fretboardBlock(id, markers, opts = {}) {
  const tun = tuning(); const min = opts.min != null ? opts.min : S.fbMin, max = opts.max != null ? opts.max : S.fbMax;
  const spell = opts.spell || speller([]);
  const svg = Render.fretboard({ tuning: tun, min, max, markers, ghost: opts.noGhost ? null : ghostFn(spell), clickable: true, label: opts.label, compact: opts.compact });
  return `<div class="fb-wrap" data-fbid="${id}"><div class="fb-scroll" id="fbs-${id}">${svg}</div>${opts.noTools ? '' : fbTools(opts)}</div>`;
}
function fbTools(opts) {
  const range = opts.fixedRange ? '' : `<label>Frets <select data-set="fbMin" data-num>${opt(range0(0, 23), S.fbMin)}</select> to <select data-set="fbMax" data-num>${opt(range0(1, 24).filter(x => x > S.fbMin), S.fbMax)}</select></label>`;
  return `<div class="fb-tools">${range}
    <label class="chk"><input type="checkbox" data-set="showRoots" ${S.showRoots ? 'checked' : ''}> Roots</label>
    <label class="chk"><input type="checkbox" data-set="showGhost" ${S.showGhost ? 'checked' : ''}> Other notes</label>
    <button class="btn ghost" data-act="fullscreen" type="button">Full screen</button></div>`;
}
const range0 = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
function opt(list, sel, label) { return list.map(v => { const val = typeof v === 'object' ? v.v : v, lab = typeof v === 'object' ? v.l : (label ? label(v) : v); return `<option value="${esc(val)}"${String(val) === String(sel) ? ' selected' : ''}>${esc(lab)}</option>`; }).join(''); }
const pills = (notes, degrees, opts = {}) => `<div class="pills">${notes.map((n, i) => `<button type="button" class="pill${degrees && degrees[i] === '1' ? ' is-root' : ''}${opts.blue && opts.blue.includes(degrees[i]) ? ' is-blue' : ''}" data-act="playpc" data-pc="${n.pc}"><b>${esc(n.name)}</b>${degrees ? `<small>${esc(degrees[i])}</small>` : ''}</button>`).join('')}</div>`;
const card = (title, body, cls = '') => `<section class="card ${cls}">${title ? `<h2>${title}</h2>` : ''}${body}</section>`;
const details = (summary, body, open) => `<details class="fold"${open ? ' open' : ''}><summary>${summary}</summary><div class="fold-body">${body}</div></details>`;
function table(head, rows, cls = '') { return `<div class="tbl-wrap"><table class="${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr${r.attrs || ''}>${(r.cells || r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }

/* Playback helpers */
function nearMidi(pc, base = 52) { let m = base; while (T.mod(m) !== T.mod(pc)) m++; return m; }
function playNotesUp(midis, step = 0.32, onStep) {
  const list = midis.slice();
  Audio.runSequence({ next: i => i < list.length ? { dur: step, fire: t => Audio.pluck(list[i], t, { length: 1 }) } : null, onStep });
}
function status(msg) { const el = document.getElementById('status'); if (el) el.textContent = msg; }

/* ---------- Navigation & render ---------- */
const NAV = [
  ['fretboard', 'Fretboard'], ['intervals', 'Intervals'], ['scales', 'Scales'], ['builder', 'Chord builder'], ['finder', 'Name a chord'],
  ['shapes', 'Chord shapes'], ['inversions', 'Inversions'], ['arpeggios', 'Arpeggios'], ['keys', 'Keys & circle'], ['progressions', 'Progressions'],
  ['rhythm', 'Rhythm'], ['techniques', 'Techniques'], ['harmony', 'Harmony'], ['tips', 'Tips & Tricks'], ['practice', 'Practice'], ['basics', 'Basics']
];
const Views = {};
let cleanup = [];
function onCleanup(fn) { cleanup.push(fn); }
function render(keepScroll = true) {
  const scroll = {};
  if (keepScroll) document.querySelectorAll('.fb-scroll').forEach(el => { scroll[el.id] = el.scrollLeft; });
  document.documentElement.dataset.theme = S.theme;
  const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = S.theme === 'light' ? '#f2efe9' : '#16191f';
  renderChrome();
  const main = document.getElementById('view');
  const v = Views[S.view] || Views.scales;
  try { main.innerHTML = v(); }
  catch (err) { console.error(err); main.innerHTML = card('This section failed to draw', `<p>${esc(err.message)}</p><p class="muted">Your settings were kept. Try another root or tuning, or <button class="btn" data-act="reset-settings">reset settings</button>.</p>`, 'err'); }
  Object.entries(scroll).forEach(([id, x]) => { const el = document.getElementById(id); if (el) el.scrollLeft = x; });
  save();
}
function renderChrome() {
  const nav = document.getElementById('nav');
  nav.innerHTML = NAV.map(([id, label]) => `<button type="button" role="tab" aria-selected="${S.view === id}" class="tab${S.view === id ? ' is-on' : ''}" data-view="${id}">${label}</button>`).join('');
  const fl = document.getElementById('navfab-label'); if (fl) fl.textContent = (NAV.find(x => x[0] === S.view) || NAV[1])[1];
  const on = nav.querySelector('.is-on'); if (on && on.scrollIntoView && !renderChrome.done) { on.scrollIntoView({ block: 'nearest', inline: 'center' }); renderChrome.done = true; }
  const tun = tuning();
  document.getElementById('globals').innerHTML = `
    <label>Key / root <select data-set="root" aria-label="Root note">${opt(T.ROOTS, S.root)}</select></label>
    <label>Tuning <select data-set="tuning">${opt(T.TUNINGS.map(t => ({ v: t.id, l: t.name })).concat([{ v: 'custom', l: 'Custom…' }]), S.tuning)}</select></label>
    <label>Labels <select data-set="labels">${opt([{ v: 'degree', l: 'Intervals' }, { v: 'note', l: 'Note names' }, { v: 'finger', l: 'Fingers' }, { v: 'none', l: 'Dots only' }], S.labels)}</select></label>
    <button type="button" class="btn ghost" data-act="theme" aria-label="Switch to ${S.theme === 'dark' ? 'light' : 'dark'} mode">${S.theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
    ${S.tuning === 'custom' ? `<div class="custom-tun" role="group" aria-label="Custom tuning, low to high">${S.custom.map((n, i) => `<select data-custom="${i}" aria-label="String ${6 - i}">${opt(T.ROOTS, T.ROOTS.includes(n) ? n : T.pcName(T.parseNote(n).pc))}</select>`).join('')}<span class="muted">low → high</span></div>` : ''}
    <span class="tun-readout muted">${esc(tun.names.join(' '))}</span>`;
}

/* ---------- Events (delegated once) ---------- */
const actions = {};
function setVal(key, raw, isNum) {
  let v = raw;
  if (isNum) { v = Number(raw); if (!Number.isFinite(v)) return; }
  if (key === 'fbMin' && v >= S.fbMax) S.fbMax = Math.min(24, v + 1);
  if (key === 'fbMax' && v <= S.fbMin) return;
  if (key === 'scale') S.pos = 'all';
  if (key === 'chord') S.voicing = 0;
  if (key === 'invChord') S.inv = 0;
  if (key === 'root' || key === 'tuning') { S.voicing = 0; }
  S[key] = v;
}
function bind() {
  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-view]');
    if (tab) { switchView(tab.dataset.view); return; }
    const a = e.target.closest('[data-act]');
    if (a && actions[a.dataset.act]) { Audio.ensure(); actions[a.dataset.act](a, e); }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act][tabindex]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } if (e.key === 'Escape') { setNavOpen(false); const f = document.querySelector('.fb-wrap.is-full'); if (f) f.classList.remove('is-full'); } });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.set) { setVal(t.dataset.set, t.type === 'checkbox' ? t.checked : t.value, t.hasAttribute('data-num')); render(); return; }
    if (t.dataset.custom != null) { S.custom[+t.dataset.custom] = t.value; render(); return; }
    if (t.dataset.ch && actions[t.dataset.ch]) actions[t.dataset.ch](t, e);
  });
  document.addEventListener('input', e => { const t = e.target; if (t.dataset.live && actions[t.dataset.live]) actions[t.dataset.live](t, e); });
}
function switchView(id) {
  if (!VALID.view.includes(id)) return;
  setNavOpen(false);
  cleanup.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }); cleanup = [];
  Audio.stopAll(); S.met.on = false;
  S.view = id; render(false); window.scrollTo({ top: 0 });
  status('');
}
/* Phones and tablets: the tab bar becomes a floating button that opens the section list. */
function setNavOpen(open) {
  const app = document.getElementById('app'), fab = document.querySelector('.navfab'); if (!app) return;
  app.classList.toggle('nav-open', open); if (fab) fab.setAttribute('aria-expanded', String(open));
  if (open) { const on = document.querySelector('#nav .is-on'); if (on) on.focus({ preventScroll: true }); }
}
actions.navtoggle = () => setNavOpen(!document.getElementById('app').classList.contains('nav-open'));
actions.navclose = () => setNavOpen(false);
actions.theme = () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; render(); };
actions['reset-settings'] = () => { Store.del('gte.settings'); S = loadState(); render(false); };
actions.fbnote = el => {
  const midi = +el.dataset.midi, s = +el.dataset.s, f = +el.dataset.f;
  if (!Number.isFinite(midi)) return;
  if (actions.fbnoteHook && actions.fbnoteHook(el, { midi, s, f })) return;
  Audio.pluck(midi);
  const r = rootNote(); const semi = T.mod(midi - r.pc);
  const ctxNotes = currentSpelled();
  const name = speller(ctxNotes)(midi);
  const iv = T.INTERVALS.find(x => x.semis === semi);
  status(`${name}${octaveName(midi)} · string ${6 - s}, fret ${f} · ${iv ? iv.abbr + ' above ' + S.root : ''}`);
};
actions.playpc = el => { const pc = +el.dataset.pc; Audio.pluck(nearMidi(pc, 52)); };
actions.fullscreen = el => {
  const w = el.closest('.fb-wrap'); if (!w) return;
  const sc = w.querySelector('.fb-scroll');
  if (w.classList.contains('is-full')) { w.classList.remove('is-full'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); return; }
  if (sc.requestFullscreen && !/iPhone|iPod/.test(navigator.userAgent)) { w.requestFullscreen().then(() => w.classList.add('is-full')).catch(() => w.classList.add('is-full')); }
  else w.classList.add('is-full'); // iPhone Safari has no element fullscreen; use an overlay
};
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.querySelectorAll('.fb-wrap.is-full').forEach(w => w.classList.remove('is-full')); });
let currentSpelled = () => [];

/* ---------- Boot ---------- */
function boot() {
  const bootMsg = document.getElementById('boot'); if (bootMsg) bootMsg.remove();
  document.getElementById('app').hidden = false;
  if (!Audio.supported) document.getElementById('audio-note').hidden = false;
  if (!Store.available) document.getElementById('store-note').hidden = false;
  bind(); render(false);
}
window.addEventListener('error', e => {
  const b = document.getElementById('errbar');
  if (b) { b.hidden = false; b.querySelector('span').textContent = 'Something went wrong: ' + (e.message || 'unknown error') + '. The rest of the app should keep working.'; }
});
