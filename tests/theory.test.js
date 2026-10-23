// Run: node --test tests/
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
