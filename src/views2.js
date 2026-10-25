/* Views, part 2. */

/* Pick a sensible diagram for a chord: open shape first, then the lowest movable shape. */
function bestVoicing(root, chordId) {
  const vs = T.chordVoicings(root, chordId, tuning());
  return vs.find(v => v.kind === 'open') || vs.slice().sort((a, b) => Math.min(...a.frets.filter(f => f != null)) - Math.min(...b.frets.filter(f => f != null)))[0] || null;
}
function chordTile(sym, root, chordId, extra = '', idx) {
  const v = bestVoicing(root, chordId); const notes = T.chordNotes(root, chordId);
  return `<figure class="vcard chordtile" ${idx != null ? `data-idx="${idx}"` : ''}>${extra}<b class="sym">${esc(sym)}</b>${v ? Render.chordBox(v, { label: sym }) : '<div class="nobox muted">no shape</div>'}<figcaption><span class="muted">${esc(noteNames(notes))}</span>${v ? `<button class="btn small" type="button" data-act="strum" data-m="${v.midi.map(m => m == null ? '' : m).join(',')}">Play</button>` : ''}</figcaption></figure>`;
}
const chordIdFromSymbol = q => ({ Major: 'maj', Minor: 'min', Diminished: 'dim', Augmented: 'aug', 'Major 7': 'maj7', 'Dominant 7': '7', 'Minor 7': 'm7', 'Half-diminished 7': 'm7b5', 'Diminished 7': 'dim7', 'Minor-major 7': 'mmaj7' }[q] || 'maj');

/* ---------- Keys & circle of fifths ---------- */
const COF_KEYS = T.CIRCLE.map(k => { const sig = T.keySignature(k); const enh = { 'F♯': 'G♭', 'D♭': 'C♯', B: 'C♭' }[k]; return { major: k + (enh ? '/' + enh : ''), key: k, minor: T.relativeMinor(k).name + 'm', sig: sig.text, short: sig.count === 0 ? '0' : Math.abs(sig.count) + (sig.count > 0 ? '♯' : '♭') }; });
Views.keys = () => {
  const r = rootNote();
  let sel = COF_KEYS.findIndex(k => T.parseNote(k.key).pc === r.pc); if (sel < 0) sel = 0;
  const majorName = T.ROOTS.includes(S.root) && T.MAJOR_KEYS.includes(S.root) ? S.root : COF_KEYS[sel].key;
  const k = T.parseNote(majorName);
  const scale = T.majorScale(k); const sig = T.keySignature(k); const rel = T.relativeMinor(k);
  const par = T.scaleNotes(k, 'minor');
  const parSig = T.keySignature(T.relativeMajor(k));
  const dia = T.diatonicChords(k); const mdia = T.diatonicChords(rel, 'minor');
  const next = COF_KEYS[(sel + 1) % 12], prev = COF_KEYS[(sel + 11) % 12];
  const progs = T.PROGRESSIONS.filter(p => p.mode === 'major').slice(0, 7);
  const sigTable = (list) => table(['Key', 'Signature', 'Accidentals', 'Relative minor'], list.map(x => { const s = T.keySignature(x); return { attrs: ` data-act="setroot" data-r="${x}" tabindex="0" role="button" class="${x === majorName ? 'is-sel' : ''}"`, cells: [`<b>${esc(x)}</b>`, esc(s.text), esc(s.accidentals.join(' ') || '—'), esc(T.relativeMinor(x).name) + ' minor'] }; }), 'clicky');
  return card('Circle of fifths', `
    <div class="cof-layout"><div class="cof-wrap">${Render.circle(COF_KEYS, sel)}</div>
    <div>${learn('k-circle')}<p class="lede">Outer ring: major keys. Inner ring: relative minors. Clockwise is up a 5th and adds a sharp (or removes a flat). Counter-clockwise is up a 4th and adds a flat.</p>
      <dl class="facts"><dt>Key</dt><dd class="big"><b>${esc(majorName)} major</b> · ${esc(sig.text)}${sig.accidentals.length ? ': ' + esc(sig.accidentals.join(' ')) : ''}</dd>
      <dt>Scale</dt><dd>${pills(scale, ['1', '2', '3', '4', '5', '6', '7'])}</dd>
      <dt>Relative minor</dt><dd><b>${esc(rel.name)} minor</b>: same key signature, tonic on degree 6 (three frets below ${esc(majorName)}).</dd>
      <dt>Parallel minor</dt><dd><b>${esc(majorName)} minor</b>: same tonic, different notes (${esc(noteNames(par))}), ${esc(parSig.text)}.</dd>
      <dt>Neighbours</dt><dd>Clockwise: ${esc(next.major)} (dominant key). Counter-clockwise: ${esc(prev.major)} (subdominant key).</dd>
      ${sel === 6 || sel === 7 || sel === 5 ? `<dt>Enharmonic</dt><dd>${esc(COF_KEYS[sel].major)} are the same pitches spelled two ways.</dd>` : ''}</dl></div></div>
    ${T.MAJOR_KEYS.includes(S.root) ? '' : `<p class="note">${esc(S.root)} major is a theoretical key (its signature needs double sharps or more than seven sharps). The circle shows its enharmonic, ${esc(majorName)}.</p>`}`)
    + card(`Diatonic chords in ${esc(majorName)} major`, `${learn('k-diatonic')}<p class="muted">Pattern: Major · minor · minor · Major · Major · minor · diminished.</p>
      <div class="boxes">${dia.map(d => chordTile(d.triad.symbol, d.root, chordIdFromSymbol(d.triad.quality), `<span class="roman">${esc(d.roman)}</span>`)).join('')}</div>
      <h3>Seventh chords</h3><div class="boxes">${dia.map(d => chordTile(d.seventh.symbol, d.root, chordIdFromSymbol(d.seventh.quality), `<span class="roman">${esc(d.romanSeventh)}</span>`)).join('')}</div>
      ${details('Table view', table(['Degree', 'Chord', 'Quality', 'Notes', '7th chord', '7th notes'], dia.map(d => [esc(d.roman), esc(d.triad.symbol), esc(d.triad.quality), esc(noteNames(d.triad.notes)), esc(d.seventh.symbol), esc(noteNames(d.seventh.notes))])))}`)
    + card(`${esc(rel.name)} natural minor harmonized`, `${learn('k-minor')}<p class="muted">The relative minor uses the same seven chords starting from degree 6. Roman numerals are measured against ${esc(rel.name)} major, so ♭III means a major chord on the lowered 3rd.</p>
      ${table(['Degree', 'Chord', 'Quality', 'Notes', '7th chord'], mdia.map(d => [esc(d.roman), esc(d.triad.symbol), esc(d.triad.quality), esc(noteNames(d.triad.notes)), esc(d.seventh.symbol)]))}
      <p class="note">In minor keys the v chord is often made major (V or V7) by raising the 7th, which comes from harmonic minor: in ${esc(rel.name)} minor that is ${esc(T.chordSymbol(T.degreeNote(rel, '5'), '7'))}.</p>`)
    + card(`Modes of ${esc(majorName)} major`, learn('k-modes') + table(['Mode', 'Tonic', 'Formula', 'Feel', 'Notes'], T.MODE_NAMES.map((m, i) => { const sc = T.SCALES.find(x => x.mode === i + 1 && x.id !== 'minor'); const ton = scale[i]; return { attrs: ` data-act="gomode" data-scale="${sc.id}" data-r="${ton.name}" tabindex="0" role="button"`, cells: [`<b>${m}</b>`, esc(ton.name), esc(sc.degrees.join(' ')), esc(T.MODE_FEEL[i]), esc(noteNames(T.scaleNotes(ton, sc)))] }; }), 'clicky') + '<p class="muted">Each mode starts on the next degree of the major scale. Tap a row to open it in Scales.</p>')
    + card(`Common progressions in ${esc(majorName)}`, learn('k-progs') + table(['Progression', 'Chords', 'Genre'], progs.map(p => ({ attrs: ` data-act="goprog" data-id="${p.id}" tabindex="0" role="button"`, cells: [esc(p.name), esc(T.progressionChords(k, p).map(c => c.symbol).join(' – ')), esc(p.genre)] })), 'clicky'))
    + card('Key signatures and relative keys', learn('k-sigs') + details('Sharp keys', sigTable(['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯']) + '<p class="muted">Order of sharps: F C G D A E B</p>', true)
      + details('Flat keys', sigTable(['F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭']) + '<p class="muted">Order of flats: B E A D G C F</p>', true)
      + details('Relative major ↔ minor', table(['Major', '', 'Minor'], T.CIRCLE.map(x => [esc(x), '↔', esc(T.relativeMinor(x).name)])) + '<p class="muted">Relative minor = 6th degree, 3 frets below the major root.</p>')
      + details('Major scales in all 12 keys', table(['Key', '1', '2', '3', '4', '5', '6', '7'], T.CIRCLE.map(x => [`<b>${esc(x)}</b>`].concat(T.majorScale(x).map(n => esc(n.name))))) + '<p class="muted">Look up the root, then read off the degrees in a chord formula.</p>'));
};
actions.cof = el => { const k = COF_KEYS[+el.dataset.i]; S.root = k.key; render(); };
actions.setroot = el => { S.root = el.dataset.r; render(); };
actions.gomode = el => { S.root = T.ROOTS.includes(el.dataset.r) ? el.dataset.r : S.root; S.scale = el.dataset.scale; S.pos = 'all'; switchView('scales'); };
actions.goprog = el => { S.prog = el.dataset.id; switchView('progressions'); };

/* ---------- Progressions ---------- */
let progState = { playing: false, idx: -1 };
Views.progressions = () => {
  const p = T.PROGRESSIONS.find(x => x.id === S.prog) || T.PROGRESSIONS[0];
  const r = rootNote(); const chords = T.progressionChords(r, p);
  onCleanup(() => { progState.playing = false; });
  return card('Chord progressions', `
    <div class="row"><label>Progression <select data-set="prog">${opt(T.PROGRESSIONS.map(x => ({ v: x.id, l: x.name + ' · ' + x.genre })), p.id)}</select></label></div>
    <p class="lede">Key: <b>${esc(S.root)} ${p.mode}</b>. Change the key with the root selector at the top.</p>
    <div class="row transport">
      <button class="btn primary" type="button" data-act="progplay">${progState.playing ? 'Stop' : 'Play'}</button>
      <label>Tempo <input type="range" min="40" max="200" value="${S.tempo}" data-live="tempo" aria-label="Tempo"> <output id="tempo-out">${S.tempo}</output> BPM</label>
      <label>Beats per chord <select data-set="beatsPerChord" data-num>${opt([1, 2, 3, 4, 6, 8], S.beatsPerChord)}</select></label>
      <label class="chk"><input type="checkbox" data-set="loop" ${S.loop ? 'checked' : ''}> Loop</label></div>
    ${learn('pr-roman')}
    <div class="romans">${chords.map((c, i) => `<span data-idx="${i}">${esc(c.roman)}</span>`).join('')}</div>
    <div class="boxes prog">${chords.map((c, i) => chordTile(c.symbol, c.root, c.chord.id, `<span class="roman">${esc(c.roman)}</span>`, i)).join('')}</div>
    ${p.id.startsWith('blues') ? '<p class="muted">Each chord box is one bar. Blues uses dominant 7th chords on I, IV and V.</p>' : ''}`)
    + card('All progressions in this key', table(['Progression', 'Chords', 'Genre'], T.PROGRESSIONS.map(x => ({ attrs: ` data-act="pickprog" data-id="${x.id}" tabindex="0" role="button" class="${x.id === p.id ? 'is-sel' : ''}"`, cells: [esc(x.name), esc(T.progressionChords(r, x).map(c => c.symbol).join(' – ')), esc(x.genre + (x.mode === 'minor' ? ' · ' + S.root + ' minor' : ''))] })), 'clicky'));
};
actions.pickprog = el => { Audio.stopAll(); progState.playing = false; S.prog = el.dataset.id; render(); };
actions.tempo = el => { S.tempo = +el.value; const o = document.getElementById('tempo-out'); if (o) o.textContent = S.tempo; save(); };
function markProg(i) { document.querySelectorAll('.prog .chordtile, .romans span').forEach(el => el.classList.toggle('is-now', +el.dataset.idx === i)); }
actions.progplay = el => {
  if (progState.playing) { Audio.stopAll(); progState.playing = false; el.textContent = 'Play'; markProg(-1); return; }
  const p = T.PROGRESSIONS.find(x => x.id === S.prog); const chords = T.progressionChords(rootNote(), p);
  const voic = chords.map(c => bestVoicing(c.root, c.chord.id));
  const bpc = S.beatsPerChord; const total = chords.length * bpc;
  progState.playing = true; el.textContent = 'Stop';
  const ok = Audio.runSequence({
    next: i => { if (!progState.playing) return null; if (i >= total && !S.loop) return null; const k = i % total; const ci = Math.floor(k / bpc); const beat = k % bpc; return { dur: 60 / S.tempo, ci, fire: t => { const v = voic[ci]; Audio.click(t, beat === 0 ? 1 : 0); if (v && (beat === 0 || beat === 2)) Audio.strum(v.midi, t, { velocity: beat === 0 ? 0.8 : 0.5 }); } }; },
    onStep: (i, step) => { if (i % bpc === 0) markProg(step.ci); },
    onEnd: () => { progState.playing = false; markProg(-1); const b = document.querySelector('[data-act="progplay"]'); if (b) b.textContent = 'Play'; }
  });
  if (!ok) { progState.playing = false; el.textContent = 'Play'; status('Audio is not available in this browser.'); }
};

/* ---------- Rhythm ---------- */
const SIGS = {
  '2/4': { pulses: 2, groups: [1, 1], beatUnit: 'quarter', count: ['1', '2'], text: 'Two quarter-note beats: marches, polkas.' },
  '3/4': { pulses: 3, groups: [1, 1, 1], beatUnit: 'quarter', count: ['1', '2', '3'], text: 'Three quarter-note beats: waltz feel, counted 1-2-3.' },
  '4/4': { pulses: 4, groups: [1, 1, 1, 1], beatUnit: 'quarter', count: ['1', '2', '3', '4'], text: 'Common time: four quarter-note beats. Most pop and rock.' },
  '5/4': { pulses: 5, groups: [1, 1, 1, 1, 1], beatUnit: 'quarter', count: ['1', '2', '3', '4', '5'], text: 'Five quarter-note beats, often felt 3+2.' },
  '6/8': { pulses: 6, groups: [3, 3], beatUnit: 'dotted quarter', compound: true, count: ['1', '2', '3', '4', '5', '6'], text: 'Compound duple: six eighth notes in two groups of three. Felt in 2 (two dotted-quarter beats).' },
  '7/8': { pulses: 7, groups: [2, 2, 3], beatUnit: 'eighth', odd: true, count: ['1', '2', '3', '4', '5', '6', '7'], text: 'Seven eighth notes, here grouped 2+2+3. Tempo counts eighth notes.' },
  '9/8': { pulses: 9, groups: [3, 3, 3], beatUnit: 'dotted quarter', compound: true, count: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], text: 'Compound triple: three groups of three eighths.' },
  '12/8': { pulses: 12, groups: [3, 3, 3, 3], beatUnit: 'dotted quarter', compound: true, count: range0(1, 12).map(String), text: 'Compound quadruple: four groups of three. Slow blues and shuffles.' }
};
const NOTE_VALUES = [['whole', 'Whole', 4, 'rest-whole'], ['half', 'Half', 2, 'rest-half'], ['quarter', 'Quarter', 1, 'rest-quarter'], ['eighth', 'Eighth', 0.5, 'rest-eighth'], ['sixteenth', 'Sixteenth', 0.25, 'rest-sixteenth'], ['dotted-half', 'Dotted half', 3, null], ['dotted-quarter', 'Dotted quarter', 1.5, null], ['dotted-eighth', 'Dotted eighth', 0.75, null]];
const PATTERNS = [
  { id: 'q', name: 'Quarter notes', notes: [1, 1, 1, 1] }, { id: 'e', name: 'Eighth notes', notes: Array(8).fill(0.5) },
  { id: 's', name: 'Sixteenth notes', notes: Array(16).fill(0.25) }, { id: 'hq', name: 'Half + two quarters', notes: [2, 1, 1] },
  { id: 'dq', name: 'Dotted quarter + eighth', notes: [1.5, 0.5, 1.5, 0.5] }, { id: 'syn', name: 'Syncopation: eighth–quarter–eighth', notes: [0.5, 1, 0.5, 0.5, 1, 0.5] },
  { id: 'gal', name: 'Gallop: eighth + two sixteenths', notes: [0.5, 0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 0.25, 0.25] },
  { id: 'rest', name: 'With rests: quarter, quarter rest, two eighths, quarter', notes: [1, -1, 0.5, 0.5, 1] }
];
const glyphFor = v => { const a = Math.abs(v); const e = NOTE_VALUES.find(n => n[2] === a); if (!e) return ''; return Render.noteGlyph(v < 0 ? e[3] : e[0]); };
function countLabels(notes) { let t = 0; return notes.map(v => { const beat = Math.floor(t + 1e-6) + 1, frac = Math.round((t % 1) * 4) / 4; t += Math.abs(v); const syl = frac === 0 ? String(beat) : frac === 0.25 ? 'e' : frac === 0.5 ? '&' : 'a'; return v < 0 ? '(' + syl + ')' : syl; }); }
let rhythmQ = null;
Views.rhythm = () => {
  const sig = SIGS[S.met.sig] || SIGS['4/4'];
  onCleanup(() => { S.met.on = false; });
  if (!rhythmQ) rhythmQ = makeRhythmQ();
  const pulseDots = sig.groups.map((g, gi) => `<span class="grp">${range0(1, g).map(k => `<i class="pulse${k === 1 ? (gi === 0 ? ' acc2' : ' acc1') : ''}" data-p=""></i>`).join('')}</span>`).join('');
  let pi = 0; const dots = pulseDots.replace(/data-p=""/g, () => `data-p="${pi++}"`);
  return card('Note values', learn('r-values') + table(['Note', 'Rest', 'Name', 'Beats in 4/4', `Length at ${S.tempo} BPM`], NOTE_VALUES.map(([k, n, b, rest]) => [Render.noteGlyph(k), rest ? Render.noteGlyph(rest) : '<span class="muted">—</span>', esc(n), String(b).replace('0.5', '½').replace('0.25', '¼').replace('0.75', '¾').replace('1.5', '1½'), (b * 60 / S.tempo).toFixed(2) + ' s'])) + '<p class="muted">A dot adds half the note’s value: dotted quarter = 1 + ½ = 1½ beats.</p>')
    + card('Metronome', `${learn('r-meter')}
      <div class="row transport"><button class="btn primary" type="button" data-act="metro">${S.met.on ? 'Stop' : 'Start'}</button>
        <label>Tempo <input type="range" min="30" max="240" value="${S.tempo}" data-live="tempo" aria-label="Tempo"> <output id="tempo-out">${S.tempo}</output> BPM</label>
        <button class="btn ghost" type="button" data-act="tap">Tap tempo</button></div>
      <div class="row"><label>Time signature <select data-ch="sig">${opt(Object.keys(SIGS), S.met.sig)}</select></label>
        ${sig.compound || sig.odd ? '' : `<label>Subdivide <select data-ch="sub">${opt([{ v: 1, l: 'Beats only' }, { v: 2, l: 'Eighths' }, { v: 3, l: 'Triplets' }, { v: 4, l: 'Sixteenths' }], S.met.sub)}</select></label>`}</div>
      <p class="lede"><b>${esc(S.met.sig)}</b>: ${esc(sig.text)} Tempo counts the ${esc(sig.beatUnit)}.</p>
      <div class="beats" aria-hidden="true">${dots}</div>
      <p class="muted">Count: ${esc(sig.compound ? sig.groups.map((g, i) => range0(1, g).map(k => k === 1 ? `<${i * g + 1}>` : String(i * g + k)).join('-')).join('  ').replace(/[<>]/g, '') : sig.count.join('-'))}${sig.compound ? ' (accent the first of each group)' : ''}</p>`)
    + card('Rhythm examples in 4/4', `${learn('r-count')}<div class="patterns">${PATTERNS.map(p => `<div class="pat" data-pat="${p.id}"><div class="pat-notes">${p.notes.map((v, i) => `<span class="pn" data-i="${i}">${glyphFor(v)}<small>${esc(countLabels(p.notes)[i])}</small></span>`).join('')}</div><div class="pat-foot"><span>${esc(p.name)}</span><button class="btn small" type="button" data-act="playpat" data-id="${p.id}">Play</button></div></div>`).join('')}</div>
      <p class="muted">Counting: “1 e & a” splits a beat into sixteenths; “&” is the half-beat. Counts in brackets are rests.</p>`)
    + card('Counting exercise', rhythmQuestion());
};
function makeRhythmQ() {
  const cells = [[1], [0.5, 0.5], [0.25, 0.25, 0.25, 0.25], [1.5, 0.5], [0.5, 0.25, 0.25], [0.25, 0.25, 0.5], [2], [0.75, 0.25], [-1], [0.5, -0.5]];
  const bar = () => { let left = 4, out = []; while (left > 0) { const fit = cells.filter(c => c.reduce((a, b) => a + Math.abs(b), 0) <= left && !(c[0] === 1.5 && (4 - left) % 1)); const c = fit[Math.floor(Math.random() * fit.length)]; out = out.concat(c); left -= c.reduce((a, b) => a + Math.abs(b), 0); } return out; };
  const ans = bar(); const right = countLabels(ans).join(' ');
  const choices = new Set([right]); let guard = 0;
  while (choices.size < 4 && guard++ < 50) choices.add(countLabels(bar()).join(' '));
  return { notes: ans, right, choices: [...choices].sort(() => Math.random() - 0.5), picked: null };
}
function rhythmQuestion() {
  const q = rhythmQ;
  return `<p>Which count matches this bar?</p><div class="pat-notes big">${q.notes.map(v => `<span class="pn">${glyphFor(v)}</span>`).join('')}</div>
    <div class="choices">${q.choices.map(c => `<button class="choice${q.picked ? (c === q.right ? ' is-right' : c === q.picked ? ' is-wrong' : '') : ''}" type="button" data-act="rq" data-c="${esc(c)}" ${q.picked ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>
    ${q.picked ? `<p class="${q.picked === q.right ? 'ok' : 'bad'}">${q.picked === q.right ? 'Correct.' : 'Not quite. The answer is ' + esc(q.right) + '.'}</p><button class="btn" type="button" data-act="rqnext">Next bar</button>` : `<button class="btn ghost" type="button" data-act="rqplay">Hear it</button>`}`;
}
actions.rq = el => { rhythmQ.picked = el.dataset.c; render(); };
actions.rqnext = () => { rhythmQ = makeRhythmQ(); render(); };
actions.rqplay = () => playPattern(rhythmQ.notes, null);
actions.sig = el => { S.met.sig = el.value; if (S.met.on) { Audio.stopAll(); S.met.on = false; } render(); };
actions.sub = el => { S.met.sub = +el.value; if (S.met.on) { Audio.stopAll(); S.met.on = false; } render(); };
let taps = [];
actions.tap = () => { const now = performance.now(); taps = taps.filter(t => now - t < 2500); taps.push(now); if (taps.length >= 2) { const iv = taps.slice(1).map((t, i) => t - taps[i]); const avg = iv.reduce((a, b) => a + b, 0) / iv.length; S.tempo = Math.max(30, Math.min(240, Math.round(60000 / avg))); const o = document.getElementById('tempo-out'); if (o) o.textContent = S.tempo; const rg = document.querySelector('[data-live="tempo"]'); if (rg) rg.value = S.tempo; save(); } };
actions.metro = el => {
  if (S.met.on) { Audio.stopAll(); S.met.on = false; el.textContent = 'Start'; document.querySelectorAll('.pulse').forEach(p => p.classList.remove('is-now')); return; }
  const sig = SIGS[S.met.sig]; const sub = sig.compound || sig.odd ? 1 : S.met.sub;
  const starts = []; let acc = 0; sig.groups.forEach(g => { starts.push(acc); acc += g; });
  S.met.on = true; el.textContent = 'Stop';
  // pulse length: simple = beat/sub; compound = eighth = (dotted quarter)/3; 7/8 = eighth
  const ok = Audio.runSequence({
    next: i => {
      if (!S.met.on) return null;
      const per = sig.compound ? 60 / S.tempo / 3 : 60 / S.tempo / (sig.odd ? 1 : sub);
      const pulsesPerBar = sig.compound || sig.odd ? sig.pulses : sig.pulses * sub;
      const k = i % pulsesPerBar; const beatIdx = sig.compound || sig.odd ? k : Math.floor(k / sub); const onBeat = sig.compound || sig.odd ? true : k % sub === 0;
      const accent = k === 0 ? 2 : (sig.compound || sig.odd) ? (starts.includes(k) ? 1 : 0) : 0;
      return { dur: per, beatIdx, onBeat, fire: t => { if (onBeat || sub > 1) Audio.click(t, onBeat ? accent || (sig.compound || sig.odd ? 0 : (k === 0 ? 2 : 1)) : 0); } };
    },
    onStep: (i, step) => { if (step.onBeat) document.querySelectorAll('.pulse').forEach(p => p.classList.toggle('is-now', +p.dataset.p === step.beatIdx)); }
  });
  if (!ok) { S.met.on = false; el.textContent = 'Start'; status('Audio is not available in this browser.'); }
};
function playPattern(notes, patEl) {
  const beat = 60 / S.tempo; const ons = []; let t = 0; notes.forEach(v => { ons.push({ t, rest: v < 0, d: Math.abs(v) }); t += Math.abs(v); });
  const steps = []; for (let b = 0; b < 4; b++) steps.push({ t: b, click: true });
  const events = ons.map((o, i) => ({ t: o.t, i, rest: o.rest })).concat(steps).sort((a, b) => a.t - b.t);
  const c = Audio.ensure(); if (!c) return;
  Audio.runSequence({
    next: i => { if (i >= events.length) return null; const e = events[i]; const nextT = i + 1 < events.length ? events[i + 1].t : 4; return { dur: (nextT - e.t) * beat, e, fire: time => { if (e.click) Audio.click(time, e.t === 0 ? 1 : 0); else if (!e.rest) Audio.pluck(57, time, { length: 0.4, velocity: 0.7 }); } }; },
    onStep: (i, step) => { if (patEl && step.e.i != null) patEl.querySelectorAll('.pn').forEach(p => p.classList.toggle('is-now', +p.dataset.i === step.e.i)); },
    onEnd: () => { if (patEl) patEl.querySelectorAll('.pn').forEach(p => p.classList.remove('is-now')); }
  });
}
actions.playpat = el => { const p = PATTERNS.find(x => x.id === el.dataset.id); playPattern(p.notes, el.closest('.pat')); };

/* ---------- Techniques ---------- */
const TECHNIQUES = [
  { id: 'bend', name: 'Bend', sym: 'b', how: 'Push or pull the string across the fret to raise the pitch by a half or whole step. Use two or three fingers together and bend to pitch: check against the target note fretted normally.', tab: 'e|----------------|\nB|----------------|\nG|--7b9--7b9r7----|\nD|----------------|', demo: () => Audio.tone([{ t: 0, midi: 62 }, { t: 0.35, midi: 62 }, { t: 0.7, midi: 64 }, { t: 1.6, midi: 64 }], { cutoff: 2200 }) },
  { id: 'vib', name: 'Vibrato', sym: '~', how: 'Small, regular pitch movement on a held note. Rock vibrato comes from the wrist, rocking the string slightly up and down; classical vibrato moves along the string.', tab: 'e|----------------|\nB|--8~~~~~~~------|\nG|----------------|', demo: () => Audio.tone([{ t: 0, midi: 67 }, { t: 2, midi: 67 }], { vibrato: { rate: 5.5, depth: 0.45, delay: 0.25 }, cutoff: 2400 }) },
  { id: 'slide', name: 'Slide', sym: '/ \\', how: 'Pick once, then keep pressure while moving to another fret on the same string. / slides up, \\ slides down.', tab: 'e|----------------|\nB|----------------|\nG|--5/7---7\\5-----|', demo: () => Audio.tone([{ t: 0, midi: 60 }, { t: 0.4, midi: 60 }, { t: 0.6, midi: 62 }, { t: 1.1, midi: 62 }, { t: 1.3, midi: 60 }, { t: 1.8, midi: 60 }], { cutoff: 2000 }) },
  { id: 'hammer', name: 'Hammer-on', sym: 'h', how: 'Pick a note, then bring another finger down hard on a higher fret of the same string. Only the first note is picked.', tab: 'e|----------------|\nB|----------------|\nG|--5h7---5h7-----|', demo: () => Audio.tone([{ t: 0, midi: 60 }, { t: 0.45, midi: 62, jump: true }, { t: 0.9, midi: 60, jump: true }, { t: 1.35, midi: 62, jump: true }, { t: 1.9, midi: 62 }], { accents: [0.9], cutoff: 2000 }) },
  { id: 'pull', name: 'Pull-off', sym: 'p', how: 'With both fingers down, pick the higher note and flick the finger off sideways so the lower note sounds without a pick.', tab: 'e|----------------|\nB|----------------|\nG|--7p5---7p5-----|', demo: () => Audio.tone([{ t: 0, midi: 62 }, { t: 0.45, midi: 60, jump: true }, { t: 0.9, midi: 62, jump: true }, { t: 1.35, midi: 60, jump: true }, { t: 1.9, midi: 60 }], { accents: [0.9], cutoff: 2000 }) },
  { id: 'pm', name: 'Palm muting', sym: 'P.M.', how: 'Rest the edge of the picking hand lightly on the strings right at the bridge. Too far forward kills the pitch; too far back does nothing.', tab: '  P.M.---------|\nA|--------------|\nE|--0-0-0-0-0-0-|', demo: () => { const c = Audio.ensure(); if (!c) return; for (let i = 0; i < 8; i++) Audio.pluck(40, c.currentTime + 0.05 + i * 0.18, { muted: true, velocity: 0.9 }); } },
  { id: 'alt', name: 'Alternate picking', sym: '⊓ ∨', how: 'Strict down-up strokes: down on the beat, up on the off-beat, even when changing strings. Keep the motion small.', tab: '   ⊓ ∨ ⊓ ∨ ⊓ ∨ ⊓ ∨\ne|-5-5-8-8-5-5-8-8-|', demo: () => { const c = Audio.ensure(); if (!c) return; [69, 69, 72, 72, 69, 69, 72, 72].forEach((m, i) => Audio.pluck(m, c.currentTime + 0.05 + i * 0.16, { length: 0.3, velocity: i % 2 ? 0.55 : 0.85 })); } },
  { id: 'harm', name: 'Harmonics', sym: '<>', how: 'Touch the string lightly directly above the fret wire (not behind it) and pick. Natural harmonics sit at frets 12, 7 and 5: an octave, an octave + 5th, and two octaves above the open string.', tab: 'e|--<12>--<7>--<5>--|\nB|--<12>--<7>--<5>--|', demo: () => { const c = Audio.ensure(); if (!c) return; [76, 83, 88].forEach((m, i) => Audio.bell(m, c.currentTime + 0.05 + i * 0.7)); } },
  { id: 'legato', name: 'Legato', sym: '⌒', how: 'Smooth, connected playing: pick the first note on each string and sound the rest with hammer-ons and pull-offs.', tab: 'e|--5h7h8p7p5------|', demo: () => Audio.tone([{ t: 0, midi: 69 }, { t: 0.25, midi: 71, jump: true }, { t: 0.5, midi: 72, jump: true }, { t: 0.75, midi: 71, jump: true }, { t: 1, midi: 69, jump: true }, { t: 1.5, midi: 69 }], { cutoff: 2200 }) },
  { id: 'mute', name: 'String muting', sym: 'x', how: 'Silence strings you are not playing: the fretting hand rests lightly on them, the picking hand palm covers the low strings. Muted strums give a percussive “chuck”.', tab: 'e|--x-x-0-x-x-0-|\nB|--x-x-1-x-x-1-|\nG|--x-x-0-x-x-0-|', demo: () => { const c = Audio.ensure(); if (!c) return; [0, 0.2, 0.4, 0.8, 1.0, 1.2].forEach(t => Audio.noise(c.currentTime + 0.05 + t)); [0.6, 1.4].forEach(t => Audio.strum([48, 52, 55, 60, 64], c.currentTime + 0.05 + t)); } },
  { id: 'ear', name: 'Ear training', sym: '—', how: 'Learn to recognise intervals and chord qualities by sound. Sing the interval before you play it; name chords in songs you know.', tab: '', demo: null }
];
Views.techniques = () => card('Guitar techniques', `<p class="lede">Each demo is synthesized, so it is an approximation of the real technique: listen for the shape of the pitch and the attack, not the tone.</p>
  <div class="techs">${TECHNIQUES.map(t => `<article class="tech"><h3>${esc(t.name)} <span class="sym">${esc(t.sym)}</span></h3><p>${esc(t.how)}</p>${t.tab ? `<pre class="tab" aria-label="Tablature">${esc(t.tab)}</pre>` : ''}${t.demo ? `<button class="btn small" type="button" data-act="tech" data-id="${t.id}">Play approximation</button>` : `<button class="btn small" type="button" data-view="practice">Train intervals by ear</button>`}</article>`).join('')}</div>`);
actions.tech = el => { Audio.stopAll(); const t = TECHNIQUES.find(x => x.id === el.dataset.id); if (t && t.demo) t.demo(); };

/* ---------- Advanced harmony ---------- */
Views.harmony = () => {
  const r = rootNote(); const ext = ['9', 'maj9', 'm9', '11', 'm11', '13', '69', 'add9'];
  const alt = ['7b9', '7s9', '7b5', '7s5', '7s11', '7alt'];
  const dia = T.diatonicChords(r); const V = dia[4]; const sub = T.tritoneSub(V.root);
  const vNotes = T.chordNotes(V.root, '7');
  const row = id => { const c = T.getChord(id); return { attrs: ` data-act="harmplay" data-r="${r.name}" data-c="${id}" tabindex="0" role="button"`, cells: [esc(c.name), `<b>${esc(T.chordSymbol(r, c))}</b>`, esc(c.degrees.join(' ')), esc(noteNames(T.chordNotes(r, c)))] }; };
  return card(`Extended chords on ${esc(S.root)}`, learn('h-ext') + table(['Chord', 'Symbol', 'Formula', 'Notes'], ext.map(row), 'clicky') + `<p class="muted">Extensions keep stacking 3rds past the octave: 9 = 2, 11 = 4, 13 = 6 an octave up. A 13th chord usually omits the 11th; tap a row to hear it.</p>`)
    + card(`Altered dominants on ${esc(S.root)}`, learn('h-alt') + table(['Chord', 'Symbol', 'Formula', 'Notes'], alt.map(row), 'clicky') + `<p class="muted">Altering the 5th and 9th of a dominant adds tension that resolves strongly to the I chord a 5th below.</p>`)
    + card(`Secondary dominants in ${esc(S.root)} major`, `${learn('h-sec')}<p class="lede">The V7 of a chord other than I. It borrows the pull of a dominant to lead into that chord.</p>${table(['Function', 'Chord', 'Notes', 'Resolves to'], T.secondaryDominants(r).map(x => ({ attrs: ` data-act="resolve" data-a="${x.root.name}|7" data-b="${x.target}" tabindex="0" role="button"`, cells: [esc(x.label), `<b>${esc(x.symbol)}</b>`, esc(noteNames(x.notes)), esc(x.target)] })), 'clicky')}<p class="muted">Tap a row to hear the dominant resolve.</p>`)
    + card(`Modal interchange in ${esc(S.root)} major`, `${learn('h-borrow')}<p class="lede">Borrow chords from the parallel minor (${esc(S.root)} minor) for a darker colour.</p>${table(['Numeral', 'Chord', 'Notes'], T.borrowedChords(r).map(x => [esc(x.roman), `<b>${esc(x.symbol)}</b>`, esc(noteNames(x.notes))]))}`)
    + card('Tritone substitution', `${learn('h-tri')}<p>Replace ${esc(V.root.name)}7 (V7) with the dominant a tritone away: <b>${esc(sub.symbol)}</b>. Both share the same tritone, ${esc(vNotes[1].name)} and ${esc(vNotes[3].name)} (spelled ${esc(sub.notes[3].name)} and ${esc(sub.notes[1].name)} in ${esc(sub.symbol)}), which is why either resolves to ${esc(r.name)}.</p>
      <div class="row"><button class="btn" type="button" data-act="resolve" data-a="${V.root.name}|7" data-b="${r.name}">Hear ${esc(V.root.name)}7 → ${esc(r.name)}</button><button class="btn" type="button" data-act="resolve" data-a="${sub.root.name}|7" data-b="${r.name}">Hear ${esc(sub.symbol)} → ${esc(r.name)}</button></div>`)
    + card('Chord spelling rules', `${learn('h-spell')}<ol class="steps"><li>Build from the major scale of the root; each formula number is a scale degree.</li><li>Use every other letter: a chord stacked in 3rds uses alternate letters (C E G B D F A).</li><li>Alter the note, never the letter: ♭3 of E is G, ♯9 of E is F𝄪, 𝄫7 of C is B𝄫.</li><li>Numbers above 7 are an octave up: 9 = 2, 11 = 4, 13 = 6. A chord is a “9” only if a 7th is present; otherwise it is “add9”.</li><li>On guitar the 5th is the first note to drop. Keep the 3rd and 7th: they define the quality. The 11th is usually left out of 13th chords.</li><li>A bass note other than the root makes an inversion or slash chord, for example Cm7/E♭.</li></ol>
      <p class="muted">Common uses: add9, sus2/sus4 and extended chords add colour and tension without changing a chord’s function.</p>`);
};
actions.harmplay = el => { const v = bestVoicing(T.parseNote(el.dataset.r), el.dataset.c); if (v) Audio.strum(v.midi); else { const r = T.parseNote(el.dataset.r); const b = nearMidi(r.pc, 48); Audio.strum(T.getChord(el.dataset.c).degrees.map(d => b + T.degreeSemis(d))); } };
actions.resolve = el => {
  const [ar, ac] = el.dataset.a.split('|'); const tgt = el.dataset.b; const m = tgt.match(/^([A-G][♯♭𝄪𝄫]?)(m|°)?$/);
  const tq = m && m[2] === 'm' ? 'min' : m && m[2] === '°' ? 'dim' : 'maj';
  const v1 = bestVoicing(T.parseNote(ar), ac), v2 = bestVoicing(T.parseNote(m ? m[1] : tgt), tq);
  const c = Audio.ensure(); if (!c || !v1 || !v2) return; Audio.strum(v1.midi, c.currentTime + 0.05); Audio.strum(v2.midi, c.currentTime + 1.2);
};

/* ---------- Basics ---------- */
Views.basics = () => {
  const std = T.TUNINGS[0];
  const all = {}; T.fretboardNotes(std).filter(c => c.f <= 12).forEach(c => { const nat = [0, 2, 4, 5, 7, 9, 11].includes(c.pc); all[c.s + ':' + c.f] = { cls: nat ? 'tone' : 'ghost-dot', label: nat ? T.pcName(c.pc) : T.pcName(c.pc, 'sharp') }; });
  return card('Guitar basics', `<div class="two"><div><p class="lede">Standard tuning, from the thickest string (6) to the thinnest (1): <b>E A D G B E</b>.</p>
      ${table(['String', 'Note', 'Name'], [['6', 'E', 'Low E'], ['5', 'A', ''], ['4', 'D', ''], ['3', 'G', ''], ['2', 'B', ''], ['1', 'E', 'High e']])}</div>
      <div><ul class="compact"><li>Each fret = one semitone (half step).</li><li>12 frets = one octave: the 12th fret repeats the open string an octave higher.</li><li>Adjacent strings are a perfect 4th apart (5 frets), except G to B, a major 3rd (4 frets). This is why shapes shift by one fret when they cross onto the B string.</li><li>Diagrams in this app show high e on top, like tablature.</li></ul></div></div>`)
    + card('Notes on the fretboard (standard tuning)', `${learn('b-notes')}<p class="muted">Natural notes are blue; sharps/flats are grey (C♯ = D♭ and so on).</p><div class="fb-wrap"><div class="fb-scroll">${Render.fretboard({ tuning: std, min: 0, max: 12, markers: all, clickable: true, label: 'Every note, frets 0 to 12' })}</div></div><p><button class="btn ghost" type="button" data-view="fretboard">Open the full fretboard explorer</button></p>`)
    + card('Sharps, flats and enharmonics', `${learn('b-enh')}<p><b>Natural notes:</b> ${T.LETTERS.map(l => `<span class="key">${l}</span>`).join(' ')}</p><p><b>Sharp (♯)</b> raises a half step; <b>flat (♭)</b> lowers a half step.</p>
      <p><b>Enharmonic equivalents</b> sound the same but are spelled differently: A♯ = B♭, C♯ = D♭, D♯ = E♭, F♯ = G♭, G♯ = A♭.</p><p>There is no sharp or flat between <b>B–C</b> and <b>E–F</b>, so E♯ = F and C♭ = B. Which spelling is correct depends on the key: in F♯ major the 7th is E♯, not F.</p>
      <p class="muted">Double sharp (𝄪) raises two half steps, double flat (𝄫) lowers two: F𝄪 sounds as G, B𝄫 sounds as A.</p>`)
    + card('Guitar tips for chord building', `<ul class="compact"><li><b>Think in frets.</b> ♭3 = 3 frets above the root, 3 = 4, 5 = 7, ♭7 = 10, 7 = 11.</li><li><b>Fast shortcut:</b> from a known chord, change one note. Major → minor: lower the 3rd one fret. Major → 7: add the ♭7, two frets below the octave root.</li><li><b>Drop notes when needed:</b> the 5th can be left out of most chords; keep the 3rd and 7th.</li><li><b>Doubling is fine:</b> repeating the root or 5th doesn’t change the chord name.</li><li><b>Bass note ≠ root?</b> It’s an inversion or slash chord: Cm7/E♭ is Cm7 with E♭ in the bass.</li></ul>`)
    + card('Where each cheat-sheet section lives', `<p class="muted">Every numbered section of both reference sheets maps to a part of this app.</p>${table(['Sheet', '§', 'Topic', 'Open'], CHEAT_MAP.map(([sheet, n, topic, view]) => [sheet, n, esc(topic), `<button class="btn small ghost" type="button" data-view="${view}">${esc(NAV.find(x => x[0] === view)[1])}</button>`]))}`);
};
const CHEAT_MAP = [
  ['Theory', 1, 'Guitar basics', 'basics'], ['Theory', 2, 'Notes on the fretboard', 'fretboard'], ['Theory', 3, 'Sharps & flats', 'basics'], ['Theory', 4, 'Intervals', 'intervals'], ['Theory', 5, 'Rhythm & note values', 'rhythm'],
  ['Theory', 6, 'Scales (fretboard patterns)', 'scales'], ['Theory', 7, 'Pentatonic', 'scales'], ['Theory', 8, 'Blues scale', 'scales'], ['Theory', 9, 'Minor pentatonic positions', 'scales'], ['Theory', 10, 'Modes', 'keys'],
  ['Theory', 11, 'Circle of fifths', 'keys'], ['Theory', 12, 'Chord construction', 'builder'], ['Theory', 13, 'Open chords', 'shapes'], ['Theory', 14, 'Barre chords', 'shapes'], ['Theory', 15, 'Arpeggios', 'arpeggios'],
  ['Theory', 16, 'Inversions', 'inversions'], ['Theory', 17, 'Power chords', 'shapes'], ['Theory', 18, 'Common progressions', 'progressions'], ['Theory', 19, 'Diatonic chords', 'keys'], ['Theory', 20, 'Key signatures', 'keys'],
  ['Theory', 21, 'Relative keys', 'keys'], ['Theory', 22, 'Advanced harmony', 'harmony'], ['Theory', 23, 'Guitar techniques', 'techniques'],
  ['Chords', 1, 'The 3-step method', 'builder'], ['Chords', 2, 'The semitone method', 'builder'], ['Chords', 3, 'Degree → semitones', 'builder'], ['Chords', 4, 'Chord formula library', 'builder'], ['Chords', 5, 'Major scales in all 12 keys', 'keys'],
  ['Chords', 6, 'Same formula, any key', 'builder'], ['Chords', 7, 'Cm7 on the fretboard', 'builder'], ['Chords', 8, 'Guitar tips', 'basics'], ['Chords', 9, 'Reverse it: name a chord', 'finder']
];
