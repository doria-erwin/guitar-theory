/* Views, part 1. Each view returns markup built from state S. */

const SCALE_GROUPS = [['Major & minor', ['major', 'minor', 'harmonic', 'melodic-classical', 'melodic-jazz']], ['Pentatonic & blues', ['majpent', 'minpent', 'majblues', 'minblues']], ['Modes of the major scale', ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']]];
const scaleSelect = (key, sel) => `<select data-set="${key}">${SCALE_GROUPS.map(([g, ids], gi) => `<optgroup label="${g}">${ids.filter((id, k) => !(gi === 2 && id === 'major')).map(id => `<option value="${id}"${id === sel ? ' selected' : ''}>${esc(T.getScale(id).name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
const chordSelect = (key, sel, ids) => { const cats = [...new Set(T.CHORDS.map(c => c.cat))]; return `<select data-set="${key}">${cats.map(cat => `<optgroup label="${cat}">${T.CHORDS.filter(c => c.cat === cat && (!ids || ids.includes(c.id))).map(c => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${esc(c.name)} (${esc(S.root + c.sym)})</option>`).join('')}</optgroup>`).join('')}</select>`; };
const tuningIsStdShape = () => { const t = tuning(); const d = t.midi.map((m, i) => m - T.TUNINGS[0].midi[i]); return d.every(x => x === d[0]); };

/* ---------- Fretboard explorer ---------- */
Views.fretboard = () => {
  const r = rootNote(); const hl = S.fbHighlight;
  let degrees, spelled, blue;
  if (hl === 'scale') { const sc = T.getScale(S.scale); degrees = sc.degrees; spelled = T.scaleNotes(r, sc); blue = sc.blue; }
  else if (hl === 'chord') { const c = T.getChord(S.chord); degrees = c.degrees; spelled = T.chordNotes(r, c); }
  else if (hl === 'root') { degrees = ['1']; spelled = [r]; }
  else { degrees = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7']; const pref = flatPref(); spelled = degrees.map(d => T.parseNote(T.pcName(r.pc + T.degreeSemis(d), pref))); spelled[0] = r; }
  currentSpelled = () => spelled;
  const markers = degreeMarkers(degrees, { spelled, blue, byInterval: hl === 'chord' && S.colorByInterval });
  const spell = speller(spelled);
  const what = hl === 'scale' ? `${S.root} ${T.getScale(S.scale).name}` : hl === 'chord' ? T.chordSymbol(r, S.chord) : hl === 'root' ? `every ${S.root}` : 'all twelve notes';
  return card('Fretboard explorer', `
    <div class="row">
      <label>Show <select data-set="fbHighlight">${opt([{ v: 'all', l: 'All notes' }, { v: 'root', l: 'Root only' }, { v: 'scale', l: 'A scale' }, { v: 'chord', l: 'A chord' }], hl)}</select></label>
      ${hl === 'scale' ? `<label>Scale ${scaleSelect('scale', S.scale)}</label>` : ''}
      ${hl === 'chord' ? `<label>Chord ${chordSelect('chord', S.chord)}</label><label class="chk"><input type="checkbox" data-set="colorByInterval" ${S.colorByInterval ? 'checked' : ''}> Colour by interval</label>` : ''}
    </div>
    <p class="lede">Showing ${esc(what)} in ${esc(tuning().name)}. Tap any dot to hear it; turn on “Other notes” to see every remaining note.</p>
    ${fretboardBlock('explore', markers, { spell, label: 'Fretboard showing ' + what })}
    ${legend(hl === 'chord' && S.colorByInterval)}`);
};
function legend(byInterval) {
  if (byInterval) return `<p class="legend"><i class="lg iv-1"></i>Root <i class="lg iv-3"></i>3rd <i class="lg iv-5"></i>5th <i class="lg iv-7"></i>7th <i class="lg iv-x"></i>2/4/6 and extensions</p>`;
  return `<p class="legend"><i class="lg root"></i>Root <i class="lg tone"></i>Scale or chord tone <i class="lg blue"></i>Blue note <i class="lg ghost"></i>Other notes</p>`;
}

/* ---------- Scales ---------- */
Views.scales = () => {
  const r = rootNote(), sc = T.getScale(S.scale), tun = tuning();
  const notes = T.scaleNotes(r, sc); currentSpelled = () => notes;
  const semis = sc.degrees.map(T.degreeSemis);
  const positions = T.scalePositions(r, sc.id, tun);
  if (S.pos !== 'all' && !positions.some(p => p.id === S.pos)) S.pos = 'all';
  const pos = positions.find(p => p.id === S.pos);
  const third = sc.degrees.find(d => d === '3' || d === '♭3'); const fifth = sc.degrees.find(d => /^[♭♯]?5$/.test(d));
  const ring = S.showChordTones ? ['1', third, fifth].filter(Boolean) : null;
  let markers, min = S.fbMin, max = S.fbMax;
  if (pos) { min = Math.max(0, pos.range[0] - 1); max = Math.min(24, Math.max(pos.range[1] + 1, min + 5)); markers = degreeMarkers(sc.degrees, { notes: pos.notes, spelled: notes, blue: sc.blue, ring }); }
  else markers = degreeMarkers(sc.degrees, { spelled: notes, blue: sc.blue, ring });
  const kinds = [...new Set(positions.map(p => p.kind))];
  const kindName = { '3NPS': 'Three notes per string', CAGED: 'CAGED positions', Box: 'Pentatonic boxes' };
  const idx = pos ? positions.indexOf(pos) : -1;
  const parent = sc.mode && sc.mode > 1 ? T.modeParent(r, sc.mode) : null;
  const rel = sc.id === 'major' ? `Relative minor: <b>${esc(T.relativeMinor(r).name)} minor</b> (same notes, tonic on degree 6).` : (sc.id === 'minor' || sc.id === 'aeolian') ? `Relative major: <b>${esc(T.relativeMajor(r).name)} major</b> (same notes, tonic on its degree 1).` : sc.id === 'minpent' ? `Same notes as <b>${esc(T.relativeMajor(r).name)} major pentatonic</b>.` : sc.id === 'majpent' ? `Same notes as <b>${esc(T.relativeMinor(r).name)} minor pentatonic</b>.` : '';
  const nonStd = !tuningIsStdShape();
  return card(`${esc(S.root)} ${esc(sc.name)}`, `
    <div class="row"><label>Scale ${scaleSelect('scale', S.scale)}</label>
      <button class="btn" type="button" data-act="playscale">Play ${pos ? 'this position' : 'one octave'}</button>
      ${sc.descending ? `<button class="btn ghost" type="button" data-act="playscale" data-dir="down">Play descending form</button>` : ''}</div>
    <dl class="facts">
      <dt>Formula</dt><dd class="formula">${sc.degrees.map(d => `<span class="${sc.char.includes(d) ? 'char' : ''}">${esc(d)}</span>`).join(' ')}</dd>
      <dt>Notes</dt><dd>${pills(notes, sc.degrees, { blue: sc.blue })}</dd>
      ${sc.descending ? `<dt>Descending</dt><dd>${esc(noteNames(T.scaleNotes(r, sc, 'down')).split(' ').reverse().join(' '))} <span class="muted">(natural minor)</span></dd>` : ''}
      <dt>Semitones from root</dt><dd>${semis.map(x => T.mod(x)).join(' · ')}</dd>
      <dt>Steps</dt><dd>${T.stepPattern(semis).join(' ')}</dd>
      <dt>Character</dt><dd>${sc.char.map(d => `<b class="char">${esc(d)}</b>`).join(', ')} ${sc.char.length === 1 ? 'gives' : 'give'} this scale its sound. ${esc(sc.uses)}</dd>
      ${parent ? `<dt>Mode of</dt><dd>${esc(T.MODE_NAMES[sc.mode - 1])} is mode ${sc.mode} of <b>${esc(parent.name)} major</b>: same notes, but ${esc(S.root)} is home. Starting ${esc(parent.name)} major on ${esc(S.root)} is not enough to hear it; the tonal centre must be ${esc(S.root)}.</dd>` : ''}
      ${rel ? `<dt>Related key</dt><dd>${rel}</dd>` : ''}
    </dl>
    <h3>Positions</h3>
    <div class="chips" role="group" aria-label="Scale positions"><button type="button" class="chip${!pos ? ' is-on' : ''}" data-act="pos" data-id="all">Whole neck</button>
      ${kinds.map(k => `<span class="chip-group">${kindName[k]}</span>` + positions.filter(p => p.kind === k).map(p => `<button type="button" class="chip${pos === p ? ' is-on' : ''}" data-act="pos" data-id="${p.id}">${esc(p.label.replace('3NPS pattern ', '').replace('CAGED ', '').replace('Box ', ''))}</button>`).join('')).join('')}</div>
    ${pos ? `<div class="pos-head"><button class="btn ghost" type="button" data-act="posstep" data-d="-1" aria-label="Previous position">‹</button><div><b>${esc(pos.label)}</b><br><span class="muted">${esc(pos.sub)} · frets ${pos.range[0]}–${pos.range[1]}</span></div><button class="btn ghost" type="button" data-act="posstep" data-d="1" aria-label="Next position">›</button></div>` : ''}
    <div class="row"><label class="chk"><input type="checkbox" data-set="showChordTones" ${S.showChordTones ? 'checked' : ''}> Ring the tonic chord tones (${['1', third, fifth].filter(Boolean).join(' ')})</label>
      ${pos ? `<span class="muted">Choose “Fingers” under Labels to see suggested fingering.</span>` : ''}</div>
    ${fretboardBlock('scale', markers, { min, max, fixedRange: !!pos, spell: speller(notes), label: S.root + ' ' + sc.name })}
    ${legend(false)}
    ${nonStd ? `<p class="note">Positions are recalculated for ${esc(tun.name)}. CAGED names describe standard-tuning chord shapes, so on detuned low strings the shapes are a guide rather than the textbook picture.</p>` : ''}
    ${sc.family === 'blues' ? `<p class="note">${esc(S.root)} ${esc(sc.name.toLowerCase())} has six notes. Its positions are the five ${sc.base === 'minpent' ? 'minor' : 'major'} pentatonic boxes with the blue note (${esc(sc.blue[0])}, purple) added inside each box.</p>` : ''}
    ${sc.degrees.length === 7 && sc.family !== 'diatonic' ? `<p class="note">${esc(sc.name)} is not a mode of the major scale. Its 3NPS patterns and CAGED-style windows are computed with the same rules as the major scale; harmonic minor’s augmented 2nd can put four notes on a string.</p>` : ''}`);
};
actions.pos = el => { S.pos = el.dataset.id; render(); };
actions.posstep = el => {
  const ps = T.scalePositions(rootNote(), S.scale, tuning()); const i = ps.findIndex(p => p.id === S.pos);
  const n = ps[(i + +el.dataset.d + ps.length) % ps.length]; S.pos = n.id; render();
};
actions.playscale = el => {
  const r = rootNote(), sc = T.getScale(S.scale), tun = tuning();
  const pos = T.scalePositions(r, sc.id, tun).find(p => p.id === S.pos);
  let midis;
  if (pos) midis = pos.notes.map(n => n.midi);
  else { let m = tun.midi[0]; while (T.mod(m - r.pc) !== 0) m++; const deg = el.dataset.dir === 'down' && sc.descending ? sc.descending : sc.degrees; midis = deg.map(d => m + T.mod(T.degreeSemis(d))).concat([m + 12]); }
  if (el.dataset.dir === 'down') midis = midis.slice().reverse();
  else if (pos) midis = midis.concat(midis.slice(0, -1).reverse());
  playNotesUp(midis, 0.26);
};

/* ---------- Intervals ---------- */
Views.intervals = () => {
  const r = rootNote(), tun = tuning();
  const row = T.INTERVALS.find(x => x.abbr === S.intRow) || T.INTERVALS[5];
  const target = T.degreeNote(r, row.degree);
  currentSpelled = () => [r, target];
  const markers = degreeMarkers(['1', row.degree], { spelled: [r, target], min: 0, max: 15 });
  const pairs = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]].map(([a, b]) => { const gap = tun.midi[b] - tun.midi[a]; const d = row.semis - gap; return `<li>String ${6 - a} → string ${6 - b}: ${d === 0 ? 'same fret' : Math.abs(d) + ' fret' + (Math.abs(d) === 1 ? '' : 's') + (d > 0 ? ' higher' : ' lower')}${gap !== 5 ? ` <span class="muted">(strings ${gap} semitones apart)</span>` : ''}</li>`; }).join('');
  const a = parseSafe(S.intA.n), b = parseSafe(S.intB.n);
  const res = T.intervalBetween(a, S.intA.o, b, S.intB.o);
  const same = T.INTERVALS.filter(x => x.semis === res.semis && x.abbr !== res.abbr).map(x => x.name);
  return card('Intervals', `
    <p class="lede">An interval is the distance between two notes. On one string, each fret is one semitone. The name comes from the letters (C to E is a 3rd, C to F♭ is a 4th) as well as the semitones.</p>
    ${table(['Interval', 'Symbol', 'Semitones', 'Frets on one string', `From ${esc(S.root)}`], T.INTERVALS.map(x => ({ attrs: ` class="${x.abbr === row.abbr ? 'is-sel' : ''}" data-act="introw" data-abbr="${x.abbr}" tabindex="0" role="button"`, cells: [esc(x.name), esc(x.abbr) + ' <span class="muted">(' + esc(x.degree) + ')</span>', x.semis, x.semis, esc(T.degreeNote(r, x.degree).name)] })), 'clicky')}
  `) + card(`${esc(row.name)}: ${esc(S.root)} → ${esc(target.name)}`, `
    <div class="row"><button class="btn" type="button" data-act="playint" data-a="${nearMidi(r.pc, 48)}" data-b="${nearMidi(r.pc, 48) + row.semis}">Play melodic</button><button class="btn ghost" type="button" data-act="playint" data-a="${nearMidi(r.pc, 48)}" data-b="${nearMidi(r.pc, 48) + row.semis}" data-h="1">Play together</button></div>
    <p>${row.semis} semitone${row.semis === 1 ? '' : 's'}. ${row.semis > 12 ? `Compound interval: an octave plus ${row.semis - 12}.` : ''} Shape across strings (${esc(tun.name)}):</p>
    <ul class="compact">${pairs}</ul>
    ${fretboardBlock('interval', markers, { min: 0, max: 15, fixedRange: true, spell: speller([r, target]) })}
    <p class="legend"><i class="lg root"></i>${esc(S.root)} <i class="lg tone"></i>${esc(target.name)}</p>`)
    + card('Interval calculator', `
    <p class="muted">Pick two spelled notes. Enharmonic spellings give different interval names for the same sound.</p>
    <div class="row">${notePicker('intA')}<span aria-hidden="true">→</span>${notePicker('intB')}<button class="btn" type="button" data-act="playint" data-a="${T.midiOf(a, S.intA.o)}" data-b="${T.midiOf(b, S.intB.o)}">Play</button></div>
    <p class="big">${esc(a.name)}${S.intA.o} to ${esc(b.name)}${S.intB.o}: <b>${esc(res.name)}</b> (${esc(res.abbr)}, ${res.semis} semitones${res.descending ? ', descending' : ''})</p>
    ${same.length ? `<p class="muted">Same number of semitones, different spelling: ${esc(same.join(', '))}.</p>` : ''}
    <p><button class="btn ghost" type="button" data-view="practice" data-act="noop">Practise naming intervals</button></p>`);
};
function parseSafe(n) { try { return T.parseNote(n); } catch (e) { return T.parseNote('C'); } }
function notePicker(key) {
  const v = S[key]; const p = parseSafe(v.n); const L = T.LETTERS[p.l]; const acc = p.a;
  return `<span class="picker"><select data-ch="pick" data-k="${key}" data-part="l" aria-label="Letter">${opt(T.LETTERS, L)}</select><select data-ch="pick" data-k="${key}" data-part="a" aria-label="Accidental">${opt([{ v: -2, l: '𝄫' }, { v: -1, l: '♭' }, { v: 0, l: '♮' }, { v: 1, l: '♯' }, { v: 2, l: '𝄪' }], acc)}</select><select data-ch="pick" data-k="${key}" data-part="o" aria-label="Octave">${opt([2, 3, 4, 5, 6], v.o)}</select></span>`;
}
actions.pick = el => {
  const k = el.dataset.k, part = el.dataset.part, p = parseSafe(S[k].n);
  if (part === 'o') S[k].o = +el.value;
  else { const l = part === 'l' ? T.LETTERS.indexOf(el.value) : p.l; const a = part === 'a' ? +el.value : p.a; S[k].n = T.makeNote(l, a).name; }
  render();
};
actions.introw = el => { S.intRow = el.dataset.abbr; render(); };
actions.playint = el => { const a = +el.dataset.a, b = +el.dataset.b; const c = Audio.ensure(); if (!c) return; const t = c.currentTime + 0.03; Audio.pluck(a, t); Audio.pluck(b, el.dataset.h ? t : t + 0.55); };
actions.noop = () => {};

/* ---------- Chord builder ---------- */
Views.builder = () => {
  const r = rootNote(), c = T.getChord(S.chord), tun = tuning();
  const notes = T.chordNotes(r, c); currentSpelled = () => notes;
  const scale = T.majorScale(r);
  const picked = c.degrees.map(d => T.parseDegree(d));
  const maxN = Math.max(...picked.map(p => p.n));
  const ladder = Array.from({ length: maxN > 7 ? 14 : 7 }, (_, i) => ({ n: i + 1, note: scale[i % 7] }));
  const used = new Set(picked.map(p => p.n));
  const step3 = c.degrees.map((d, i) => { const p = picked[i]; const plain = scale[(p.n - 1) % 7]; const res = notes[i]; return `<div class="tile is-res${d === '1' ? ' is-root' : ''}"><small>${esc(d)}</small><b>${esc(res.name)}</b>${p.alt ? `<em>${esc(plain.name)} ${p.alt < 0 ? '↓' : '↑'}${Math.abs(p.alt) > 1 ? ' ×2' : ''}</em>` : '<em>unchanged</em>'}</div>`; }).join('');
  const sem = c.degrees.map(T.degreeSemis);
  const semCells = Array.from({ length: 12 }, (_, i) => { const k = sem.findIndex(x => T.mod(x) === i); const nm = k >= 0 ? notes[k].name : T.pcName(r.pc + i, flatPref()); return `<div class="semi${k >= 0 ? ' is-on' : ''}${i === 0 ? ' is-root' : ''}"><small>${i}</small><b>${esc(nm)}</b>${k >= 0 ? `<em>${esc(c.degrees[k])}${sem[k] >= 12 ? ' (+12)' : ''}</em>` : ''}</div>`; }).join('');
  const markers = degreeMarkers(c.degrees, { spelled: notes, byInterval: S.colorByInterval });
  const voicings = T.chordVoicings(r, c.id, tun);
  const sym = T.chordSymbol(r, c);
  return card(`Build ${esc(sym)}`, `
    <div class="row"><label>Chord ${chordSelect('chord', S.chord)}</label><button class="btn" type="button" data-act="playchordtones">Play notes</button></div>
    <div class="result" aria-live="polite">${esc(sym)} = <b>${esc(notes.map(n => n.name).join(' – '))}</b> <span class="muted">formula ${esc(c.degrees.join(' '))}</span></div>
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
    <h3><span class="stepn">1</span> Write the major scale of ${esc(S.root)} and number it</h3>
    <div class="tiles">${ladder.map(x => `<div class="tile${used.has(x.n) ? ' is-pick' : ' is-dim'}"><small>${x.n}</small><b>${esc(x.note.name)}</b></div>`).join('')}</div>
    ${maxN > 7 ? '<p class="muted">Past 7 the scale repeats an octave higher: 9 = 2, 11 = 4, 13 = 6.</p>' : ''}
    <h3><span class="stepn">2</span> Pick the degrees in the formula: ${esc(c.degrees.map(d => T.parseDegree(d).n).join(', '))}</h3>
    <h3><span class="stepn">3</span> Apply the accidentals: ♭ lowers a half step (one fret), ♯ raises one</h3>
    <div class="tiles">${step3}</div>
    <p class="muted">Letters stay in order (one per degree), which is why ${esc(T.chordSymbol(T.parseNote('E'), '7s9'))} contains F𝄪 rather than G.</p>`)
    + card('The semitone method', `<p class="lede">Count frets up from the root: ${c.degrees.map((d, i) => `${esc(d)} = ${sem[i]}`).join(' · ')}.</p><div class="semis">${semCells}</div>`)
    + card(`${esc(sym)} on the fretboard`, `<div class="row"><label class="chk"><input type="checkbox" data-set="colorByInterval" ${S.colorByInterval ? 'checked' : ''}> Colour by interval</label></div>${fretboardBlock('builder', markers, { spell: speller(notes) })}${legend(S.colorByInterval)}<p class="muted">Pick one of each note on nearby strings to make your own voicing.</p>`)
    + card('Playable voicings', voicings.length ? `<div class="boxes">${voicings.map((v, i) => voicingCard(v, r, c, i)).join('')}</div>` : `<p class="note">No stored voicing for ${esc(sym)} in ${esc(tun.name)} passes the playability check. Use the fretboard map above to build one.</p>`)
    + card('Reference', details('Degree → semitones', table(['Degree', 'Semitones', 'Interval'], [['1', '0', 'Unison'], ['♭2 / ♭9', '1 (13)', 'Minor 2nd'], ['2 / 9', '2 (14)', 'Major 2nd'], ['♯2 / ♯9', '3 (15)', 'Augmented 2nd'], ['♭3', '3', 'Minor 3rd'], ['3', '4', 'Major 3rd'], ['4 / 11', '5 (17)', 'Perfect 4th'], ['♯4 / ♯11', '6 (18)', 'Augmented 4th'], ['♭5', '6', 'Diminished 5th'], ['5', '7', 'Perfect 5th'], ['♯5', '8', 'Augmented 5th'], ['♭6 / ♭13', '8 (20)', 'Minor 6th'], ['6 / 13', '9 (21)', 'Major 6th'], ['𝄫7', '9', 'Diminished 7th'], ['♭7', '10', 'Minor 7th'], ['7', '11', 'Major 7th']]))
      + details(`Chord formula library in ${esc(S.root)}`, table(['Chord', 'Symbol', 'Formula', 'Notes'], T.CHORDS.map(x => ({ attrs: ` data-act="pickchord" data-id="${x.id}" class="${x.id === c.id ? 'is-sel' : ''}" tabindex="0" role="button"`, cells: [esc(x.name), esc(T.chordSymbol(r, x)), esc(x.degrees.join(' ')), esc(noteNames(T.chordNotes(r, x)))] })), 'clicky'), true)
      + details(`Same formula, any key: ${esc(c.name)}`, table(['Key', 'Symbol', 'Notes'], T.CIRCLE.map(k => [esc(k), esc(T.chordSymbol(k, c)), esc(noteNames(T.chordNotes(k, c)))]))));
};
function voicingCard(v, r, c, i) {
  const spell = speller(T.chordNotes(r, c));
  const names = v.midi.map(m => m == null ? '' : spell(m));
  const tab = v.frets.map(f => f == null ? 'x' : f).join(' ');
  return `<figure class="vcard${i === 0 ? ' is-first' : ''}">${Render.chordBox(v, { showDegrees: true, notes: names, label: `${T.chordSymbol(r, c)} ${v.name}` })}<figcaption><b>${esc(v.name)}</b><span class="mono">${esc(tab)}</span><button class="btn small" type="button" data-act="strum" data-m="${v.midi.map(m => m == null ? '' : m).join(',')}">Play</button></figcaption></figure>`;
}
actions.pickchord = el => { S.chord = el.dataset.id; S.voicing = 0; render(); };
actions.strum = el => { const m = el.dataset.m.split(',').filter(x => x !== '').map(Number); Audio.strum(m); };
actions.playchordtones = () => { const r = rootNote(), c = T.getChord(S.chord); const base = nearMidi(r.pc, 48); playNotesUp(c.degrees.map(d => base + T.degreeSemis(d)), 0.3); };

/* ---------- Name a chord (reverse finder) ---------- */
Views.finder = () => {
  const sel = S.finder; const bass = S.finderBass;
  const res = T.identifyChord(sel, bass);
  const pcLabel = pc => T.pcName(pc, 'both');
  const nameRoot = pc => { const sh = T.pcName(pc, 'sharp'), fl = T.pcName(pc, 'flat'); return [5, 0, 7, 2, 9, 4, 11].includes(pc) ? sh : fl; };
  const markers = {}; const tun = tuning();
  T.fretboardNotes(tun).filter(c => c.f <= 12).forEach(c => { if (sel.includes(c.pc)) markers[c.s + ':' + c.f] = { cls: c.pc === bass ? 'root' : 'tone', label: nameRoot(c.pc) }; });
  actions.fbnoteHook = (el, { midi }) => { if (S.view !== 'finder') return false; toggleFinder(T.mod(midi)); Audio.pluck(midi); return true; };
  onCleanup(() => { actions.fbnoteHook = null; });
  const rows = res.slice(0, 12).map(m => {
    const root = T.parseNote(nameRoot(m.rootPc)); const notes = T.chordNotes(root, m.chord);
    const bassName = m.inversion ? notes.find(n => n.pc === m.bassPc) : null;
    const sym = T.chordSymbol(root, m.chord) + (bassName ? '/' + bassName.name : '');
    return [`<b>${esc(sym)}</b>`, esc(m.chord.name) + (m.omitted ? ' <span class="muted">(5th omitted)</span>' : '') + (m.inversion ? ' <span class="muted">(inversion)</span>' : ''), esc(m.chord.degrees.join(' ')), esc(noteNames(notes))];
  });
  const top = res[0];
  let steps = '';
  if (top) {
    const root = T.parseNote(nameRoot(top.rootPc)); const ms = T.majorScale(root); const notes = T.chordNotes(root, top.chord);
    steps = `<ol class="steps"><li>List the notes: <b>${esc(sel.map(pc => notes.find(n => n.pc === pc) || { name: nameRoot(pc) }).map(n => n.name).join(' – '))}</b></li><li>Try each note as the root; stack in 3rds. ${esc(root.name)} works.</li><li>Compare to ${esc(root.name)} major (${esc(noteNames(ms))}): ${notes.map((n, i) => `${esc(n.name)} = ${esc(top.chord.degrees[i])}`).join(' · ')}</li><li>${esc(top.chord.degrees.join(' '))} = <b>${esc(T.chordSymbol(root, top.chord))}</b></li></ol>`;
  }
  return card('Name a chord', `
    <p class="lede">Select the notes you hear or play, either with the buttons or by tapping the fretboard. Choose a bass note to get inversions and slash chords.</p>
    <div class="notebtns" role="group" aria-label="Notes">${range0(0, 11).map(pc => `<button type="button" class="nb${sel.includes(pc) ? ' is-on' : ''}" data-act="finder" data-pc="${pc}" aria-pressed="${sel.includes(pc)}">${esc(pcLabel(pc))}</button>`).join('')}</div>
    <div class="row"><label>Bass note <select data-ch="finderbass"><option value="">Lowest = root (any)</option>${sel.map(pc => `<option value="${pc}"${pc === bass ? ' selected' : ''}>${esc(pcLabel(pc))}</option>`).join('')}</select></label>
      <button class="btn ghost" type="button" data-act="finderclear">Clear</button>
      <span class="muted">Try:</span>${[['D F A C', [2, 5, 9, 0]], ['C E G A', [0, 4, 7, 9]], ['E G C', [4, 7, 0]], ['G B D F', [7, 11, 2, 5]], ['C E♭ G♭ A', [0, 3, 6, 9]]].map(([l, p]) => `<button class="btn small ghost" type="button" data-act="finderpreset" data-p="${p.join(',')}">${l}</button>`).join('')}</div>
    ${sel.length < 2 ? '<p class="empty">Select at least two notes to see chord names.</p>' : res.length ? `${table(['Name', 'Type', 'Formula', 'Spelled'], rows)}
      ${res.length > 1 ? `<p class="note">These notes fit more than one name. The chord’s function decides: the bass note, the key and what comes next. For example, C E G A is C6 over a C bass and Am7 over an A bass.</p>` : ''}${steps}` : `<p class="empty">No chord in the library uses exactly these notes. Try removing a note or adding the 5th.</p>`}
    ${fretboardBlock('finder', markers, { min: 0, max: 12, fixedRange: true, noGhost: true, label: 'Tap to toggle notes' })}`);
};
function toggleFinder(pc) { const i = S.finder.indexOf(pc); if (i >= 0) { S.finder.splice(i, 1); if (S.finderBass === pc) S.finderBass = null; } else S.finder.push(pc); render(); }
actions.finder = el => { toggleFinder(+el.dataset.pc); Audio.pluck(nearMidi(+el.dataset.pc, 52)); };
actions.finderclear = () => { S.finder = []; S.finderBass = null; render(); };
actions.finderpreset = el => { S.finder = el.dataset.p.split(',').map(Number); S.finderBass = S.finder[0]; render(); };
actions.finderbass = el => { S.finderBass = el.value === '' ? null : +el.value; render(); };

/* ---------- Chord shapes library ---------- */
Views.shapes = () => {
  const r = rootNote(), c = T.getChord(S.chord), tun = tuning();
  const vs = T.chordVoicings(r, c.id, tun);
  const openLib = T.OPEN.filter(o => ['maj', 'min', '7'].includes(o.chord) || ['F', 'B'].includes(o.openRoot));
  const stdTun = T.TUNINGS[0];
  const openCards = T.OPEN.map(o => { const v = T.chordVoicings(o.openRoot, o.chord, stdTun).find(x => x.kind === 'open'); return v ? `<figure class="vcard mini">${Render.chordBox(v, { label: o.name })}<figcaption><b>${esc(o.name.replace('Open ', ''))}</b><button class="btn small" type="button" data-act="strum" data-m="${v.midi.map(m => m == null ? '' : m).join(',')}">Play</button></figcaption></figure>` : ''; }).join('');
  const barre = ['maj', 'min'].map(q => T.chordVoicings(r, q, tun).filter(v => /barre/.test(v.name)).map(v => voicingCard(v, r, T.getChord(q), 1)).join('')).join('');
  return card(`${esc(T.chordSymbol(r, c))} shapes`, `
    <div class="row"><label>Chord ${chordSelect('chord', S.chord)}</label></div>
    <p class="lede">× = don’t play · ○ = open string · numbers = fingers · red = root. Every shape is checked: only chord tones, root in the bass, at most a four-fret stretch, fingers in fret order.</p>
    ${vs.length ? `<div class="boxes">${vs.map((v, i) => voicingCard(v, r, c, i)).join('')}</div>` : `<p class="note">No stored shape for this chord passes the checks in ${esc(tun.name)}.</p>`}
    ${!tuningIsStdShape() ? `<p class="note">${esc(tun.name)} changes some string intervals. Shapes that relied on the old interval were re-fretted or dropped if they became unplayable.</p>` : ''}`)
    + card(`Barre chords in ${esc(S.root)}: slide the shape, root fret = chord name`, barre ? `<div class="boxes">${barre}</div>` : '<p class="empty">No barre shapes in this tuning.</p>')
    + card('Open chord library (standard tuning)', `<div class="boxes">${openCards}</div>`);
};

/* ---------- Inversions ---------- */
const INV_CHORDS = ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'm7', 'm7b5', 'dim7'];
Views.inversions = () => {
  if (!INV_CHORDS.includes(S.invChord)) S.invChord = 'maj';
  const r = rootNote(), c = T.getChord(S.invChord), tun = tuning();
  const notes = T.chordNotes(r, c); currentSpelled = () => notes;
  const n = Math.min(4, notes.length); if (S.inv >= n) S.inv = 0;
  const order = T.inversionOrder(notes, S.inv); const degOrder = T.inversionOrder(c.degrees, S.inv);
  const sym = T.chordSymbol(r, c) + (S.inv ? '/' + order[0].name : '');
  const names = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];
  const vs = T.inversionVoicings(r, c.id, S.inv, tun);
  const cards = vs.map(v => {
    const frets = [null, null, null, null, null, null], fingers = [0, 0, 0, 0, 0, 0], degs = [null, null, null, null, null, null], midi = [null, null, null, null, null, null];
    const sorted = v.strings.map((s, k) => ({ s, f: v.frets[k] })).filter(x => x.f > 0).sort((a, b) => a.f - b.f || a.s - b.s);
    v.strings.forEach((s, k) => { frets[s] = v.frets[k]; degs[s] = v.degrees[k]; midi[s] = v.midi[k]; });
    let g = 0, last = null; sorted.forEach(x => { g = Math.min(4, g + 1); fingers[x.s] = g; last = x.f; });
    const box = { frets, fingers, degrees: degs, barre: null };
    const spell = speller(notes);
    return `<figure class="vcard">${Render.chordBox(box, { showDegrees: true, notes: midi.map(m => m == null ? '' : spell(m)), label: sym + ' on strings ' + v.strings.map(s => 6 - s).join('') })}<figcaption><b>Strings ${v.strings.map(s => 6 - s).reverse().join('-')}</b><span class="muted">${esc(v.voicing)}${v.stretch ? ', stretch' : ''}</span><button class="btn small" type="button" data-act="strum" data-m="${midi.map(m => m == null ? '' : m).join(',')}">Play</button></figcaption></figure>`;
  }).join('');
  return card('Chord inversions', `
    <div class="row"><label>Chord ${chordSelect('invChord', S.invChord, INV_CHORDS)}</label><button class="btn" type="button" data-act="invcompare">Compare all inversions</button></div>
    <div class="chips" role="group" aria-label="Inversion">${names.slice(0, n).map((nm, i) => `<button type="button" class="chip${i === S.inv ? ' is-on' : ''}" data-act="inv" data-i="${i}">${nm}</button>`).join('')}</div>
    <dl class="facts"><dt>Symbol</dt><dd class="big"><b>${esc(sym)}</b></dd><dt>Bass note</dt><dd>${esc(order[0].name)} (the ${esc(degOrder[0])})</dd><dt>Order, low to high</dt><dd>${pills(order, degOrder)}</dd>
      <dt>All inversions</dt><dd>${names.slice(0, n).map((nm, i) => `${nm}: ${esc(T.inversionOrder(notes, i).map(x => x.name).join(' '))}`).join('<br>')}</dd></dl>
    <p class="muted">Same chord tones, different bass. The chord name stays ${esc(T.chordSymbol(r, c))}; slash notation shows the bass. ${n === 4 ? 'Four-note voicings on adjacent strings are shown as close or drop-2 voicings, the playable forms guitarists use.' : 'Triads are shown in close position on each set of three adjacent strings.'}</p>`)
    + card('Voicings on adjacent string sets', cards ? `<div class="boxes">${cards}</div>` : '<p class="empty">No playable voicing found in this tuning.</p>');
};
actions.inv = el => { S.inv = +el.dataset.i; render(); };
actions.invcompare = () => {
  const r = rootNote(), c = T.getChord(S.invChord), tun = tuning(); const n = Math.min(4, c.degrees.length);
  const vs = range0(0, n - 1).map(i => T.inversionVoicings(r, c.id, i, tun)[0]).filter(Boolean);
  Audio.runSequence({ next: i => i < vs.length ? { dur: 1.1, fire: t => Audio.strum(vs[i].midi, t) } : null, onStep: i => status(['Root position', '1st inversion', '2nd inversion', '3rd inversion'][i]) });
};

/* ---------- Arpeggios ---------- */
const ARP_CHORDS = ['maj', 'min', 'maj7', 'm7', '7', 'dim', 'm7b5', 'dim7'];
Views.arpeggios = () => {
  if (!ARP_CHORDS.includes(S.arp)) S.arp = 'maj7';
  const r = rootNote(), c = T.getChord(S.arp), tun = tuning(); const notes = T.chordNotes(r, c); currentSpelled = () => notes;
  const ps = T.arpeggioPositions(r, c.id, tun);
  if (S.arpPos !== 'all' && !ps.some(p => p.id === S.arpPos)) S.arpPos = 'all';
  const pos = ps.find(p => p.id === S.arpPos);
  let markers, min = S.fbMin, max = S.fbMax;
  if (pos) { min = Math.max(0, pos.range[0] - 1); max = Math.min(24, Math.max(pos.range[1] + 1, min + 5)); markers = degreeMarkers(c.degrees, { notes: pos.notes, spelled: notes, byInterval: S.colorByInterval }); }
  else markers = degreeMarkers(c.degrees, { spelled: notes, byInterval: S.colorByInterval });
  return card(`${esc(T.chordSymbol(r, c))} arpeggio`, `
    <div class="row"><label>Quality <select data-set="arp">${opt(ARP_CHORDS.map(id => ({ v: id, l: T.getChord(id).name })), S.arp)}</select></label>
      <button class="btn" type="button" data-act="playarp">Play up and down</button>
      <label class="chk"><input type="checkbox" data-set="colorByInterval" ${S.colorByInterval ? 'checked' : ''}> Colour by interval</label></div>
    <dl class="facts"><dt>Formula</dt><dd class="formula">${esc(c.degrees.join(' '))}</dd><dt>Notes</dt><dd>${pills(notes, c.degrees)}</dd></dl>
    <div class="chips"><button type="button" class="chip${!pos ? ' is-on' : ''}" data-act="arppos" data-id="all">Whole neck</button>${ps.map(p => `<button type="button" class="chip${p === pos ? ' is-on' : ''}" data-act="arppos" data-id="${p.id}">${esc(p.label)}</button>`).join('')}</div>
    ${pos ? `<p class="muted">${esc(pos.label)} arpeggio, ${esc(pos.sub)}: the chord tones inside the matching CAGED scale position.</p>` : ''}
    ${fretboardBlock('arp', markers, { min, max, fixedRange: !!pos, spell: speller(notes) })}${legend(S.colorByInterval)}`)
    + card('Practice ideas', `<ol class="steps"><li>Play one position ascending and descending with a metronome at a slow tempo. Say the interval names as you go.</li><li>Start from the lowest 3rd instead of the root, so your ear stops depending on the root.</li><li>Connect two neighbouring positions by sliding on one string.</li><li>Play the arpeggio over its chord in a progression, then switch arpeggio exactly when the chord changes.</li></ol><p><button class="btn ghost" type="button" data-view="practice">Drill chord tones in Practice</button></p>`);
};
actions.arppos = el => { S.arpPos = el.dataset.id; render(); };
actions.playarp = () => {
  const r = rootNote(), c = T.getChord(S.arp); const pos = T.arpeggioPositions(r, c.id, tuning()).find(p => p.id === S.arpPos);
  let m = pos ? pos.notes.map(n => n.midi) : (() => { const b = nearMidi(r.pc, 45); return c.degrees.map(d => b + T.degreeSemis(d)).concat([b + 12]); })();
  playNotesUp(m.concat(m.slice(0, -1).reverse()), 0.22);
};
