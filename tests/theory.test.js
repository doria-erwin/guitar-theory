// Run: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/theory.js');
const names = a => a.map(n => n.name).join(' ');
const STD = T.TUNINGS[0];

test('1. C major = C D E F G A B', () => assert.equal(names(T.majorScale('C')), 'C D E F G A B'));
test('2. G major = G A B C D E F♯', () => assert.equal(names(T.majorScale('G')), 'G A B C D E F♯'));
test('3. A major = A B C♯ D E F♯ G♯', () => assert.equal(names(T.majorScale('A')), 'A B C♯ D E F♯ G♯'));
test('4. A minor pentatonic = A C D E G', () => assert.equal(names(T.scaleNotes('A', 'minpent')), 'A C D E G'));
test('5. A minor blues = A C D E♭ E G (six notes)', () => {
  const n = T.scaleNotes('A', 'minblues'); assert.equal(names(n), 'A C D E♭ E G'); assert.equal(new Set(n.map(x => x.pc)).size, 6);
});
test('6. Cm7 = C E♭ G B♭', () => assert.equal(names(T.chordNotes('C', 'm7')), 'C E♭ G B♭'));
test('7. Cmaj7 = C E G B', () => assert.equal(names(T.chordNotes('C', 'maj7')), 'C E G B'));
test('8. G7 = G B D F', () => assert.equal(names(T.chordNotes('G', '7')), 'G B D F'));
test('9. C major diatonic triads', () => {
  const d = T.diatonicChords('C');
  assert.deepEqual(d.map(x => x.triad.symbol), ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
  assert.deepEqual(d.map(x => x.roman), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
});
test('10. C major diatonic sevenths', () => {
  const d = T.diatonicChords('C');
  assert.deepEqual(d.map(x => x.seventh.symbol), ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7♭5']);
  assert.deepEqual(d.map(x => x.romanSeventh), ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
  assert.equal(names(d[6].seventh.notes), 'B D F A');
});
test('11. All roots transpose correctly (major scale reference table)', () => {
  const ref = {
    C: 'C D E F G A B', G: 'G A B C D E F♯', D: 'D E F♯ G A B C♯', A: 'A B C♯ D E F♯ G♯', E: 'E F♯ G♯ A B C♯ D♯', B: 'B C♯ D♯ E F♯ G♯ A♯',
    'F♯': 'F♯ G♯ A♯ B C♯ D♯ E♯', 'D♭': 'D♭ E♭ F G♭ A♭ B♭ C', 'A♭': 'A♭ B♭ C D♭ E♭ F G', 'E♭': 'E♭ F G A♭ B♭ C D', 'B♭': 'B♭ C D E♭ F G A', F: 'F G A B♭ C D E',
    'C♯': 'C♯ D♯ E♯ F♯ G♯ A♯ B♯', 'G♭': 'G♭ A♭ B♭ C♭ D♭ E♭ F'
  };
  for (const [k, v] of Object.entries(ref)) assert.equal(names(T.majorScale(k)), v, k);
  for (const r of T.ROOTS) {
    const ms = T.majorScale(r); const root = T.parseNote(r);
    assert.deepEqual(ms.map(n => T.mod(n.pc - root.pc)), [0, 2, 4, 5, 7, 9, 11], r);
    assert.equal(new Set(ms.map(n => n.l)).size, 7, 'seven distinct letters in ' + r);
    for (const c of T.CHORDS) {
      const notes = T.chordNotes(r, c.id);
      notes.forEach((n, i) => assert.equal(T.mod(n.pc - root.pc), T.mod(T.degreeSemis(c.degrees[i])), r + c.sym));
      assert.ok(notes.every(n => Math.abs(n.a) <= 2), 'no triple accidentals ' + r + c.sym);
    }
  }
  assert.equal(names(T.chordNotes('C', 'dim7')), 'C E♭ G♭ B𝄫');
  assert.equal(names(T.chordNotes('E', '7s9')), 'E G♯ B D F𝄪');
});
test('Same formula, any key (Chord sheet §6)', () => {
  assert.equal(names(T.chordNotes('A', 'm7')), 'A C E G');
  assert.equal(names(T.chordNotes('F♯', 'm7')), 'F♯ A C♯ E');
  assert.equal(names(T.chordNotes('B♭', 'm7')), 'B♭ D♭ F A♭');
  assert.equal(names(T.chordNotes('D', 'maj7')), 'D F♯ A C♯');
  assert.equal(names(T.chordNotes('B', 'm7b5')), 'B D F A');
  assert.equal(names(T.chordNotes('F', 'add9')), 'F A C G');
  assert.equal(names(T.chordNotes('A♭', 'sus4')), 'A♭ D♭ E♭');
});
test('Modes, parent keys, relative and parallel keys', () => {
  assert.equal(names(T.scaleNotes('D', 'dorian')), 'D E F G A B C');
  assert.equal(names(T.scaleNotes('E', 'phrygian')), 'E F G A B C D');
  assert.equal(names(T.scaleNotes('F', 'lydian')), 'F G A B C D E');
  assert.equal(names(T.scaleNotes('G', 'mixolydian')), 'G A B C D E F');
  assert.equal(names(T.scaleNotes('B', 'locrian')), 'B C D E F G A');
  assert.equal(T.modeParent('D', 2).name, 'C'); assert.equal(T.modeParent('F♯', 6).name, 'A');
  assert.equal(T.relativeMinor('E♭').name, 'C'); assert.equal(T.relativeMajor('F♯').name, 'A');
  assert.equal(names(T.scaleNotes('A', 'melodic-classical', 'down')), 'A B C D E F G');
  assert.equal(names(T.scaleNotes('A', 'harmonic')), 'A B C D E F G♯');
});
test('Key signatures', () => {
  assert.equal(T.keySignature('D').text, '2 sharps'); assert.deepEqual(T.keySignature('D').accidentals, ['F♯', 'C♯']);
  assert.deepEqual(T.keySignature('A♭').accidentals, ['B♭', 'E♭', 'A♭', 'D♭']);
  assert.equal(T.keySignature('C♭').count, -7); assert.equal(T.keySignature('C♯').count, 7);
});
test('Intervals spelled by letter', () => {
  assert.equal(T.intervalBetween('C', 4, 'D♯', 4).name, 'Augmented 2nd');
  assert.equal(T.intervalBetween('C', 4, 'E♭', 4).name, 'Minor 3rd');
  assert.equal(T.intervalBetween('C', 4, 'F♯', 4).name, 'Augmented 4th');
  assert.equal(T.intervalBetween('C', 4, 'G♭', 4).name, 'Diminished 5th');
  assert.equal(T.intervalBetween('C', 4, 'C', 5).name, 'Octave');
  assert.equal(T.intervalBetween('C', 4, 'A', 5).name, 'Major 13th');
  assert.equal(T.intervalBetween('C', 4, 'D♭', 5).abbr, 'm9');
  for (const iv of T.INTERVALS) { const n = T.degreeNote('C', iv.degree); const oct = 4 + Math.floor((T.parseDegree(iv.degree).n - 1) / 7); assert.equal(T.intervalBetween('C', 4, n, oct).semis, iv.semis, iv.name); }
});
test('Reverse chord finder lists ambiguity and inversions', () => {
  const r = T.identifyChord([9, 0, 4, 7]).map(m => T.pcName(m.rootPc) + m.chord.sym);
  assert.ok(r.includes('Am7') && r.includes('C6'));
  const d = T.identifyChord([2, 5, 9, 0]); assert.equal(T.pcName(d[0].rootPc) + d[0].chord.sym, 'Dm7');
  const slash = T.identifyChord([0, 4, 7], 4)[0]; assert.equal(slash.inversion, true); assert.equal(slash.rootPc, 0);
});
test('Progressions and advanced harmony', () => {
  assert.deepEqual(T.progressionChords('C', 'pop').map(c => c.symbol), ['C', 'G', 'Am', 'F']);
  assert.deepEqual(T.progressionChords('C', '251').map(c => c.symbol).slice(0, 3), ['Dm7', 'G7', 'Cmaj7']);
  assert.deepEqual(T.progressionChords('A', 'blues').map(c => c.symbol).join(' '), 'A7 A7 A7 A7 D7 D7 A7 A7 E7 D7 A7 E7');
  assert.deepEqual(T.progressionChords('E', 'mixo').map(c => c.symbol), ['E', 'D', 'A', 'E']);
  assert.equal(T.secondaryDominants('C').find(x => x.label === 'V7/V').symbol, 'D7');
  assert.equal(T.secondaryDominants('C').find(x => x.label === 'V7/vi').symbol, 'E7');
  assert.equal(T.tritoneSub('G').symbol, 'D♭7');
  assert.deepEqual(T.borrowedChords('C').map(x => x.symbol).slice(0, 4), ['E♭', 'Fm', 'A♭', 'B♭']);
  assert.deepEqual(T.diatonicChords('A', 'minor').map(x => x.triad.symbol), ['Am', 'B°', 'C', 'Dm', 'Em', 'F', 'G']);
});

const allTunings = T.TUNINGS.concat([T.customTuning(['D', 'A', 'D', 'G', 'A', 'D']), T.customTuning(['C', 'G', 'C', 'G', 'C', 'E'])]);
test('12. Every scale position contains only valid scale notes, all in range, no NaN', () => {
  for (const tun of allTunings) for (const r of T.ROOTS) for (const sc of T.SCALES) {
    const root = T.parseNote(r); const semis = sc.degrees.map(d => T.mod(T.degreeSemis(d)));
    const pos = T.scalePositions(r, sc.id, tun);
    assert.ok(pos.length >= 5, `${r} ${sc.id} ${tun.name}: ${pos.length} positions`);
    if (sc.degrees.length === 7) { assert.equal(pos.filter(p => p.kind === '3NPS').length, 7, `${r} ${sc.id} ${tun.name} 3NPS`); assert.equal(pos.filter(p => p.kind === 'CAGED').length, 5, `${r} ${sc.id} ${tun.name} CAGED`); }
    if (sc.family === 'pentatonic' || sc.family === 'blues') assert.equal(pos.filter(p => p.kind === 'Box').length, 5);
    for (const p of pos) {
      for (const n of p.notes) {
        assert.ok(Number.isInteger(n.f) && n.f >= 0 && n.f <= 24, `fret ${n.f}`);
        assert.equal(n.midi, tun.midi[n.s] + n.f);
        assert.ok(semis.includes(T.mod(n.midi - root.pc)), `${r} ${sc.id} ${p.label} has a non-scale note`);
        assert.ok(n.degree, 'degree label'); assert.ok(n.finger >= 0 && n.finger <= 4);
      }
      // no duplicate pitches and every scale degree present
      assert.equal(new Set(p.notes.map(n => n.midi)).size, p.notes.length, p.label + ' duplicate pitch');
      assert.ok(semis.every(x => p.notes.some(n => T.mod(n.midi - root.pc) === x)), `${r} ${sc.id} ${p.label} misses a degree`);
      // fingers rise along each string
      for (let s = 0; s < 6; s++) { const row = p.notes.filter(n => n.s === s && n.f > 0).sort((a, b) => a.f - b.f); for (let i = 1; i < row.length; i++) assert.ok(row[i].finger > row[i - 1].finger || row.length > 4, p.label + ' finger order'); }
    }
  }
});
test('Position systems: 7 3NPS, 5 CAGED, 5 boxes; blues = 6 notes over 5 boxes', () => {
  const g = T.scalePositions('G', 'major');
  assert.equal(g.filter(p => p.kind === '3NPS').length, 7); assert.equal(g.filter(p => p.kind === 'CAGED').length, 5);
  g.filter(p => p.kind === '3NPS').forEach(p => { for (let s = 0; s < 6; s++) assert.equal(p.notes.filter(n => n.s === s).length, 3); });
  const b = T.scalePositions('A', 'minblues');
  assert.equal(b.filter(p => p.kind === 'Box').length, 5);
  assert.equal(new Set(T.scaleNotes('A', 'minblues').map(n => n.pc)).size, 6);
  b.forEach(p => assert.ok(p.notes.some(n => n.blue)));
  // Known reference: A minor pentatonic box 1 at the 5th fret
  const box1 = T.scalePositions('A', 'minpent')[0];
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(s => box1.notes.filter(n => n.s === s).map(n => n.f)), [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]]);
  // Known reference: G major E-shape CAGED position, frets 2–5
  const e = g.find(p => p.shape === 'E shape');
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(s => e.notes.filter(n => n.s === s).map(n => n.f)), [[2, 3, 5], [2, 3, 5], [2, 4, 5], [2, 4, 5], [3, 5], [2, 3, 5]]);
});
test('13. Every chord voicing contains only chord tones, has the root in the bass, and is physically playable', () => {
  let count = 0;
  for (const tun of allTunings) for (const r of T.ROOTS) for (const c of T.CHORDS) {
    const root = T.parseNote(r); const pcs = T.chordPcs(root.pc, c);
    for (const v of T.chordVoicings(r, c.id, tun)) {
      count++;
      const sounding = v.frets.map((f, s) => f == null ? null : tun.midi[s] + f).filter(x => x != null);
      assert.ok(sounding.every(m => pcs.includes(T.mod(m))), `${r}${c.sym} ${v.name}`);
      assert.equal(T.mod(Math.min(...sounding)), root.pc, 'root in bass');
      assert.ok(T.physicallyValid(v.frets, v.fingers), `${r}${c.sym} ${v.name} ${v.frets}`);
    }
  }
  assert.ok(count > 2000, 'voicings generated: ' + count);
  for (const r of T.ROOTS) for (const id of ['maj', 'min', '7', 'm7', 'maj7', 'pow']) assert.ok(T.chordVoicings(r, id).length >= 2, r + id + ' has at least two standard-tuning voicings');
});
test('Open chord shapes are the textbook ones', () => {
  const get = (r, c) => T.chordVoicings(r, c).find(v => v.kind === 'open').frets.map(f => f == null ? 'x' : f).join('');
  assert.equal(get('C', 'maj'), 'x32010'); assert.equal(get('G', 'maj'), '320003'); assert.equal(get('D', 'maj'), 'xx0232');
  assert.equal(get('A', 'min'), 'x02210'); assert.equal(get('F', 'maj'), '133211'); assert.equal(get('B', '7'), 'x21202');
  // Chord sheet §7: A-shape Cm7 x35343 and E-shape Cm7 8 10 8 8 8 8
  const cm7 = T.chordVoicings('C', 'm7').map(v => v.frets.map(f => f == null ? 'x' : f).join(','));
  assert.ok(cm7.includes('x,3,5,3,4,3') && cm7.includes('8,10,8,8,8,8'));
});
test('Physical validator rejects impossible fingerings', () => {
  assert.equal(T.physicallyValid([1, 7, null, null, null, null], [1, 4, 0, 0, 0, 0]), false); // 6-fret stretch
  assert.equal(T.physicallyValid([3, 2, 0, 0, 0, 3], [1, 2, 0, 0, 0, 3]), false); // fingers against fret order
  assert.equal(T.physicallyValid([NaN, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]), false);
  assert.equal(T.physicallyValid([3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]), true);
});
test('Inversions: bass note and order', () => {
  assert.deepEqual(T.inversionOrder(T.chordNotes('C', 'maj'), 1).map(n => n.name), ['E', 'G', 'C']);
  assert.deepEqual(T.inversionOrder(T.chordNotes('C', 'maj'), 2).map(n => n.name), ['G', 'C', 'E']);
  for (const r of T.ROOTS) for (const c of ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'm7', 'm7b5']) {
    const tones = T.chordPcs(T.parseNote(r).pc, c).slice(0, 4);
    for (let inv = 0; inv < tones.length; inv++) {
      const vs = T.inversionVoicings(r, c, inv);
      assert.ok(vs.length >= 2, `${r}${c} inv ${inv}`);
      for (const v of vs) { assert.equal(T.mod(v.midi[0]), tones[inv], 'bass'); assert.ok(v.midi.every(m => tones.includes(T.mod(m)))); assert.equal(new Set(v.midi.map(m => T.mod(m))).size, tones.length); }
    }
  }
});
test('14 & 16. Fretboard notes match tuning + fret, and tuning changes update every note', () => {
  for (const tun of allTunings) {
    const cells = T.fretboardNotes(tun);
    assert.equal(cells.length, 6 * 25);
    cells.forEach(c => { assert.equal(c.midi, tun.midi[c.s] + c.f); assert.equal(c.pc, T.mod(tun.midi[c.s] + c.f)); assert.ok(!Number.isNaN(c.midi)); });
    tun.midi.forEach((m, s) => assert.equal(T.mod(m), T.parseNote(tun.names[s]).pc, tun.name + ' string ' + s));
  }
  // E standard reference: 5th fret of low E = A; 12th fret = octave
  assert.equal(T.pcName(T.fretboardNotes(STD).find(c => c.s === 0 && c.f === 5).pc), 'A');
  const dropD = T.TUNINGS.find(t => t.id === 'dropd');
  assert.equal(T.pcName(T.fretboardNotes(dropD).find(c => c.s === 0 && c.f === 2).pc), 'E');
  const ct = T.customTuning(['D', 'A', 'D', 'G', 'A', 'D']); assert.deepEqual(ct.midi, [38, 45, 50, 55, 57, 62]);
});
test('15. No NaN or out-of-range coordinates in any generated structure', () => {
  for (const r of T.ROOTS) for (const c of T.CHORDS) for (const v of T.chordVoicings(r, c.id)) v.frets.forEach(f => assert.ok(f == null || (Number.isInteger(f) && f >= 0 && f <= 24)));
});

test('Arpeggio positions contain only chord tones and every tone', () => {
  for (const tun of allTunings) for (const r of T.ROOTS) for (const c of ['maj', 'min', 'maj7', 'm7', '7', 'dim', 'dim7', 'm7b5']) {
    const pcs = T.chordPcs(T.parseNote(r).pc, c); const ps = T.arpeggioPositions(r, c, tun);
    assert.equal(ps.length, 5, r + c);
    for (const p of ps) { assert.ok(p.notes.every(n => pcs.includes(T.mod(n.midi)) && n.f >= 0 && n.f <= 24 && n.degree)); assert.ok(pcs.every(x => p.notes.some(n => T.mod(n.midi) === x)), r + c + p.label); }
  }
});

/* ---------- Learning-layer facts (Tips & Tricks, new Practice drills) ---------- */
const SIMPLE = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
test('Interval groups: semitone counts 0–5–7–12, 2–4–9–11, 1–3–8–10, tritone 6', () => {
  const s = a => T.INTERVALS.find(x => x.abbr === a).semis;
  assert.deepEqual(['P1', 'P4', 'P5', 'P8'].map(s), [0, 5, 7, 12]);
  assert.deepEqual(['M2', 'M3', 'M6', 'M7'].map(s), [2, 4, 9, 11]);
  assert.deepEqual(['m2', 'm3', 'm6', 'm7'].map(s), [1, 3, 8, 10]);
  assert.deepEqual(['A4', 'd5'].map(s), [6, 6]);
  for (const [M, m] of [['M2', 'm2'], ['M3', 'm3'], ['M6', 'm6'], ['M7', 'm7']]) assert.equal(s(M) - s(m), 1);
});
test('Interval inversions: numbers add to 9, qualities swap, semitones add to 12', () => {
  const swap = { M: 'm', m: 'M', P: 'P', A: 'd', d: 'A' };
  for (const a of SIMPLE.concat(['A2', 'A5', 'd7'])) {
    const i = T.INTERVALS.find(x => x.abbr === a), v = T.invertInterval(a);
    assert.equal(i.semis + v.semis, 12, a);
    const n = +a.slice(1), q = a[0];
    assert.equal(v.abbr, swap[q] + (9 - n), a);
  }
  assert.equal(T.invertInterval('M3').abbr, 'm6'); assert.equal(T.invertInterval('d5').abbr, 'A4'); assert.equal(T.invertInterval('P4').abbr, 'P5');
});
test('Direction is separate from quality; inversion moves one note an octave', () => {
  const iv = (a, o1, b, o2) => { const r = T.intervalBetween(a, o1, b, o2); return r.abbr + (r.descending ? ' down ' : ' up ') + r.semis; };
  assert.equal(iv('C', 4, 'E', 4), 'M3 up 4'); assert.equal(iv('C', 4, 'G', 4), 'P5 up 7');
  assert.equal(iv('E', 4, 'C', 4), 'M3 down 4'); assert.equal(iv('C', 4, 'A', 3), 'm3 down 3'); assert.equal(iv('G', 4, 'C', 4), 'P5 down 7');
  assert.equal(iv('E', 4, 'C', 5), 'm6 up 8');
  assert.equal(iv('C', 4, 'F♯', 4), 'A4 up 6'); assert.equal(iv('C', 4, 'G♭', 4), 'd5 up 6');
  for (const r of T.ROOTS) for (const a of SIMPLE) { const i = T.INTERVALS.find(x => x.abbr === a); const top = T.degreeNote(r, i.degree); const o = a === 'P8' ? 5 : 4 + (top.l < T.parseNote(r).l ? 1 : 0); assert.equal(T.intervalBetween(top, o, r, 4).abbr, a, r + a); }
});
test('Natural minor = major with 3, 6, 7 lowered; triad semitones', () => {
  for (const r of T.ROOTS) {
    const M = T.scaleNotes(r, 'major'), m = T.scaleNotes(r, 'minor');
    [0, 1, 3, 4].forEach(i => assert.equal(m[i].name, M[i].name));
    [2, 5, 6].forEach(i => { assert.equal(m[i].l, M[i].l); assert.equal(T.mod(M[i].pc - m[i].pc), 1); });
  }
  const semis = id => T.getChord(id).degrees.map(T.degreeSemis).join('-');
  assert.equal(semis('maj'), '0-4-7'); assert.equal(semis('min'), '0-3-7'); assert.equal(semis('dim'), '0-3-6'); assert.equal(semis('aug'), '0-4-8');
});
test('Chord families: major I ii iii IV V vi vii°, natural minor i ii° III iv v VI VII', () => {
  const q = (k, s) => T.diatonicChords(k, s).map(d => d.triad.quality[0] + d.triad.quality[1]).join(' ');
  for (const k of T.MAJOR_KEYS) assert.equal(q(k, 'major'), 'Ma Mi Mi Ma Ma Mi Di', k);
  for (const k of ['A', 'E', 'B', 'F♯', 'C♯', 'D', 'G', 'C', 'F', 'B♭', 'E♭']) assert.equal(q(k, 'minor'), 'Mi Di Ma Mi Mi Ma Ma', k);
  assert.equal(T.diatonicChords('C')[4].triad.symbol, 'G');
});
test('Octave shapes in standard tuning: +2 frets two strings up, +3 when crossing G–B', () => {
  const m = STD.midi;
  assert.deepEqual([[0, 2], [1, 3], [2, 4], [3, 5]].map(([a, b]) => 12 - (m[b] - m[a])), [2, 2, 3, 3]);
  assert.equal(m[4] - m[3], 4); [[0, 1], [1, 2], [2, 3], [4, 5]].forEach(([a, b]) => assert.equal(m[b] - m[a], 5));
});

/* ---------- Interval qualities ---------- */
test('Interval families: 1 4 5 8 = d P A (no d1); 2 3 6 7 = d m M A; one semitone per step', () => {
  assert.deepEqual(T.qualitiesFor(1), ['P', 'A']);
  for (const n of [4, 5, 8]) assert.deepEqual(T.qualitiesFor(n), ['d', 'P', 'A']);
  for (const n of [2, 3, 6, 7]) assert.deepEqual(T.qualitiesFor(n), ['d', 'm', 'M', 'A']);
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) { const s = T.qualitiesFor(n).map(q => T.intervalAbove('C', n, q).semis); s.slice(1).forEach((x, i) => assert.equal(x - s[i], 1, 'step ' + n)); }
  assert.equal(T.intervalAbove('C', 3, 'P'), null); assert.equal(T.intervalAbove('C', 5, 'M'), null); assert.equal(T.intervalAbove('C', 1, 'd'), null);
});
test('Interval qualities: spelling matches the interval calculator for every root, number and quality', () => {
  let checked = 0;
  for (const r of T.ROOTS) for (let n = 1; n <= 8; n++) for (const q of T.qualitiesFor(n)) {
    const x = T.intervalAbove(r, n, q); if (!x) continue;
    const root = T.parseNote(r); assert.equal(x.note.l, (root.l + n - 1) % 7, `${r} ${q}${n} letter`);
    const o = [4, 5].find(o2 => T.midiOf(x.note, o2) - T.midiOf(root, 4) === x.semis);
    assert.ok(o, `${r} ${q}${n} octave`);
    const res = T.intervalBetween(root, 4, x.note, o); assert.equal(res.abbr, q + n, `${r} → ${x.note.name}`); assert.equal(res.semis, x.semis); checked++;
  }
  assert.ok(checked > 400);
});
test('Interval qualities: examples, enharmonic pairs, and accidentals that do not match the quality', () => {
  const nm = (r, n, q) => T.intervalAbove(r, n, q).note.name;
  assert.equal(nm('C', 2, 'A'), 'D♯'); assert.equal(nm('C', 3, 'm'), 'E♭'); assert.equal(nm('C', 4, 'A'), 'F♯'); assert.equal(nm('C', 5, 'd'), 'G♭');
  assert.equal(T.intervalAbove('C', 2, 'A').semis, T.intervalAbove('C', 3, 'm').semis);
  assert.equal(T.intervalAbove('C', 4, 'A').semis, 6); assert.equal(T.intervalAbove('C', 5, 'd').semis, 6);
  assert.equal(nm('D♭', 4, 'A'), 'G'); assert.equal(nm('C♯', 5, 'd'), 'G'); // augmented without ♯, diminished without ♭
  assert.equal(nm('C', 3, 'd'), 'E𝄫'); assert.equal(nm('C♯', 5, 'A'), 'G𝄪'); assert.equal(nm('C', 7, 'd'), 'B𝄫');
  assert.equal(T.intervalAbove('A♯', 3, 'A'), null); // would need a triple sharp
  assert.equal(T.intervalAbove('C', 8, 'A').semis, 13); assert.equal(nm('C', 8, 'd'), 'C♭');
});

/* ---------- Interval identification audit ---------- */
test('A → C / C♯ / C𝄪 / C♭ / D / D♯ / E♭: letters give the number, semitones give the quality', () => {
  const iv = (b, o2 = 5) => { const r = T.intervalBetween('A', 4, b, o2); return `${r.name} ${r.semis} ${r.descending ? 'down' : 'up'}`; };
  assert.equal(iv('C'), 'Minor 3rd 3 up'); assert.equal(iv('C♯'), 'Major 3rd 4 up'); assert.equal(iv('C𝄪'), 'Augmented 3rd 5 up'); assert.equal(iv('C♭'), 'Diminished 3rd 2 up');
  assert.equal(iv('D'), 'Perfect 4th 5 up'); assert.equal(iv('D♯'), 'Augmented 4th 6 up'); assert.equal(iv('E♭'), 'Diminished 5th 6 up');
  // Enharmonic notes give different names: C♯ (M3) and D♭ (d4) are both 4 semitones above A.
  assert.equal(T.intervalBetween('A', 4, 'D♭', 5).name, 'Diminished 4th'); assert.equal(T.intervalBetween('A', 4, 'D♭', 5).semis, 4);
});
test('noteAbove: the upper note is always above the root, for every root and every interval (the A → C♯ bug)', () => {
  const x = T.noteAbove('A', 4, 'M3'); assert.equal(x.note.name + x.octave, 'C♯5'); assert.equal(x.interval.name, 'Major 3rd');
  for (const r of T.ROOTS.concat(['C♭', 'B♯', 'E♯', 'F♭'])) for (const i of T.INTERVALS) {
    const y = T.noteAbove(r, 4, i);
    assert.ok(Number.isInteger(y.octave), `${r} ${i.abbr} octave`);
    assert.equal(y.interval.descending, false, `${r} ${i.abbr} goes down`);
    assert.equal(y.interval.abbr, i.abbr, `${r} + ${i.abbr} → ${y.note.name}${y.octave} = ${y.interval.abbr}`);
    assert.equal(y.midi - T.midiOf(r, 4), i.semis);
  }
});
test('Every quality from every spelled root (single and double accidentals), up and down', () => {
  const ROOTS = []; for (let l = 0; l < 7; l++) for (const a of [-2, -1, 0, 1, 2]) ROOTS.push(T.makeNote(l, a));
  let n = 0;
  for (const r of ROOTS) for (let num = 1; num <= 8; num++) for (const q of T.qualitiesFor(num)) {
    const x = T.intervalAbove(r, num, q); if (!x) continue;
    const o = [4, 5].find(o2 => T.midiOf(x.note, o2) - T.midiOf(r, 4) === x.semis);
    const up = T.intervalBetween(r, 4, x.note, o), down = T.intervalBetween(x.note, o, r, 4);
    assert.equal(up.abbr, q + num); assert.equal(up.descending, false);
    assert.equal(down.abbr, q + num, `${x.note.name}${o} down to ${r.name}4`); assert.equal(down.semis, x.semis);
    assert.equal(down.descending, x.semis > 0 || num > 1);
    n++;
  }
  assert.ok(n > 750, 'combinations checked: ' + n);
});
test('Compound intervals: 9th–13th from every root, letters and semitones agree', () => {
  for (const r of T.ROOTS) for (const i of T.INTERVALS.filter(x => x.semis > 12)) {
    const y = T.noteAbove(r, 3, i); assert.equal(y.interval.abbr, i.abbr); assert.equal(y.interval.compound, true); assert.equal(y.interval.number, T.parseDegree(i.degree).n);
  }
});
