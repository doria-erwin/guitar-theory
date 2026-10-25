/* Guitar Theory Engine — pure functions, no DOM. Works in browsers (window.Theory) and Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Theory = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const NAT = [0, 2, 4, 5, 7, 9, 11];
  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
  const ACC = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
  const mod = (n, m = 12) => ((n % m) + m) % m;

  /* ---------- Notes ---------- */
  function parseNote(str) {
    const s = String(str).trim();
    const l = LETTERS.indexOf(s[0] && s[0].toUpperCase());
    if (l < 0) throw new Error('Bad note: ' + str);
    let a = 0;
    for (const ch of s.slice(1)) {
      if (ch === '♯' || ch === '#') a += 1;
      else if (ch === '♭' || ch === 'b') a -= 1;
      else if (ch === '𝄪' || ch === 'x') a += 2;
      else if (ch === '𝄫') a -= 2;
    }
    return makeNote(l, a);
  }
  function makeNote(l, a) {
    const L = mod(l, 7);
    const acc = ACC[a] !== undefined ? ACC[a] : (a > 0 ? '♯'.repeat(a) : '♭'.repeat(-a));
    return { l: L, a, pc: mod(NAT[L] + a), name: LETTERS[L] + acc };
  }
  /* Spell pitch class pc using letter index l. */
  function spellWithLetter(l, pc) {
    let a = mod(pc - NAT[mod(l, 7)]); if (a > 6) a -= 12;
    return makeNote(l, a);
  }
  const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const COMMON_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  /* Spelling for an isolated pitch class (no key context). */
  function pcName(pc, pref) {
    pc = mod(pc);
    if (pref === 'flat') return FLAT_NAMES[pc];
    if (pref === 'sharp') return SHARP_NAMES[pc];
    if (pref === 'both') return SHARP_NAMES[pc] === FLAT_NAMES[pc] ? SHARP_NAMES[pc] : SHARP_NAMES[pc] + '/' + FLAT_NAMES[pc];
    return COMMON_NAMES[pc];
  }
  const ROOTS = ['C', 'C♯', 'D♭', 'D', 'D♯', 'E♭', 'E', 'F', 'F♯', 'G♭', 'G', 'G♯', 'A♭', 'A', 'A♯', 'B♭', 'B'];

  /* ---------- Degrees & intervals ---------- */
  function parseDegree(d) {
    const m = String(d).match(/^([#♯b♭𝄫𝄪x]*)(\d+)$/u);
    if (!m) throw new Error('Bad degree ' + d);
    let alt = 0;
    for (const ch of m[1]) { if (ch === '#' || ch === '♯') alt++; else if (ch === 'b' || ch === '♭') alt--; else if (ch === '𝄫') alt -= 2; else if (ch === '𝄪' || ch === 'x') alt += 2; }
    return { n: +m[2], alt };
  }
  function degreeSemis(d) {
    const { n, alt } = parseDegree(d);
    return MAJOR_STEPS[(n - 1) % 7] + 12 * Math.floor((n - 1) / 7) + alt;
  }
  /* 3-step method: letter from the major scale of the root, then apply the alteration. */
  function degreeNote(root, d) {
    const r = typeof root === 'string' ? parseNote(root) : root;
    const { n } = parseDegree(d);
    return spellWithLetter(r.l + n - 1, r.pc + degreeSemis(d));
  }
  function transpose(note, steps, semis) {
    const r = typeof note === 'string' ? parseNote(note) : note;
    return spellWithLetter(r.l + steps, r.pc + semis);
  }
  function majorScale(root) { return [1, 2, 3, 4, 5, 6, 7].map(n => degreeNote(root, String(n))); }

  const ORD = n => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  function midiOf(note, octave) { const n = typeof note === 'string' ? parseNote(note) : note; return (octave + 1) * 12 + NAT[n.l] + n.a; }
  /* Interval between two spelled notes with octave numbers. Name depends on letters, not just semitones. */
  function intervalBetween(n1, o1, n2, o2) {
    const a = typeof n1 === 'string' ? parseNote(n1) : n1, b = typeof n2 === 'string' ? parseNote(n2) : n2;
    let li = (b.l + 7 * o2) - (a.l + 7 * o1);
    let semis = midiOf(b, o2) - midiOf(a, o1);
    let descending = false;
    if (li < 0 || (li === 0 && semis < 0)) { li = -li; semis = -semis; descending = true; }
    return Object.assign(qualify(li + 1, semis), { descending });
  }
  function qualify(number, semis) {
    const simple = ((number - 1) % 7) + 1;
    const ref = MAJOR_STEPS[simple - 1] + 12 * Math.floor((number - 1) / 7);
    const delta = semis - ref;
    const perfect = [1, 4, 5].includes(simple);
    const Q = perfect ? { '-2': ['Doubly diminished', 'dd'], '-1': ['Diminished', 'd'], 0: ['Perfect', 'P'], 1: ['Augmented', 'A'], 2: ['Doubly augmented', 'AA'] }
      : { '-2': ['Diminished', 'd'], '-1': ['Minor', 'm'], 0: ['Major', 'M'], 1: ['Augmented', 'A'], 2: ['Doubly augmented', 'AA'] };
    const [q, qa] = Q[delta] || ['Unusual', '?'];
    const numName = number === 1 ? 'unison' : number === 8 ? 'octave' : ORD(number);
    const name = (number === 1 && q === 'Perfect') ? 'Unison' : (number === 8 && q === 'Perfect') ? 'Octave' : q + ' ' + numName;
    return { number, semis, quality: q, abbr: qa + number, name, simple, compound: number > 8 };
  }

  /* Invert a simple interval within the octave: numbers add to 9, qualities swap (M↔m, A↔d, P stays), semitones add to 12. */
  function invertInterval(iv) {
    const i = typeof iv === 'string' ? INTERVALS.find(x => x.abbr === iv) : iv;
    if (!i || i.semis > 12) return null;
    const r = qualify(9 - parseDegree(i.degree).n, 12 - i.semis);
    return INTERVALS.find(x => x.abbr === r.abbr) || Object.assign({ degree: null }, r);
  }

  const INTERVALS = [
    ['Unison', 'P1', '1', 0], ['Minor 2nd', 'm2', '♭2', 1], ['Major 2nd', 'M2', '2', 2], ['Augmented 2nd', 'A2', '♯2', 3], ['Minor 3rd', 'm3', '♭3', 3],
    ['Major 3rd', 'M3', '3', 4], ['Perfect 4th', 'P4', '4', 5], ['Augmented 4th (tritone)', 'A4', '♯4', 6], ['Diminished 5th (tritone)', 'd5', '♭5', 6],
    ['Perfect 5th', 'P5', '5', 7], ['Augmented 5th', 'A5', '♯5', 8], ['Minor 6th', 'm6', '♭6', 8], ['Major 6th', 'M6', '6', 9], ['Diminished 7th', 'd7', '𝄫7', 9], ['Minor 7th', 'm7', '♭7', 10],
    ['Major 7th', 'M7', '7', 11], ['Octave', 'P8', '8', 12], ['Minor 9th', 'm9', '♭9', 13], ['Major 9th', 'M9', '9', 14],
    ['Augmented 9th', 'A9', '♯9', 15], ['Minor 10th', 'm10', '♭10', 15], ['Major 10th', 'M10', '10', 16], ['Perfect 11th', 'P11', '11', 17],
    ['Augmented 11th', 'A11', '♯11', 18], ['Perfect 12th', 'P12', '12', 19], ['Minor 13th', 'm13', '♭13', 20], ['Major 13th', 'M13', '13', 21]
  ].map(([name, abbr, degree, semis]) => ({ name, abbr, degree, semis }));

  /* ---------- Scales ---------- */
  const SCALES = [
    { id: 'major', name: 'Major (Ionian)', degrees: ['1', '2', '3', '4', '5', '6', '7'], family: 'diatonic', char: ['3', '7'], mode: 1, uses: 'Pop, rock, country and classical. Every chord formula is measured against it.' },
    { id: 'minor', name: 'Natural Minor', degrees: ['1', '2', '♭3', '4', '5', '♭6', '♭7'], family: 'diatonic', char: ['♭3', '♭6'], mode: 6, uses: 'Rock, metal and ballads. Same notes as its relative major, different home note.' },
    { id: 'harmonic', name: 'Harmonic Minor', degrees: ['1', '2', '♭3', '4', '5', '♭6', '7'], family: 'minor-variant', char: ['♭6', '7'], uses: 'Neoclassical, flamenco and metal. The raised 7th gives minor keys a major V chord.' },
    { id: 'melodic-classical', name: 'Melodic Minor (classical)', degrees: ['1', '2', '♭3', '4', '5', '6', '7'], descending: ['1', '2', '♭3', '4', '5', '♭6', '♭7'], family: 'minor-variant', char: ['6', '7'], uses: 'Classical practice: raised 6 and 7 going up, natural minor coming down.' },
    { id: 'melodic-jazz', name: 'Melodic Minor (jazz)', degrees: ['1', '2', '♭3', '4', '5', '6', '7'], family: 'minor-variant', char: ['♭3', '7'], uses: 'Jazz practice: the ascending form in both directions. Source of the altered and Lydian dominant sounds.' },
    { id: 'majpent', name: 'Major Pentatonic', degrees: ['1', '2', '3', '5', '6'], family: 'pentatonic', char: ['3', '6'], uses: 'Country, pop and southern rock solos over major chords.' },
    { id: 'minpent', name: 'Minor Pentatonic', degrees: ['1', '♭3', '4', '5', '♭7'], family: 'pentatonic', char: ['♭3', '♭7'], uses: 'Rock and blues soloing. Usually the first scale guitarists learn.' },
    { id: 'majblues', name: 'Major Blues', degrees: ['1', '2', '♭3', '3', '5', '6'], family: 'blues', base: 'majpent', blue: ['♭3'], char: ['♭3'], uses: 'Major pentatonic plus the ♭3 blue note, often slid or bent up into the 3.' },
    { id: 'minblues', name: 'Minor Blues', degrees: ['1', '♭3', '4', '♭5', '5', '♭7'], family: 'blues', base: 'minpent', blue: ['♭5'], char: ['♭5'], uses: 'Minor pentatonic plus the ♭5 blue note. Blues, rock and funk.' },
    { id: 'dorian', name: 'Dorian', degrees: ['1', '2', '♭3', '4', '5', '6', '♭7'], family: 'diatonic', char: ['6'], mode: 2, uses: 'Minor with a bright 6th: funk, jazz, Santana-style rock.' },
    { id: 'phrygian', name: 'Phrygian', degrees: ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'], family: 'diatonic', char: ['♭2'], mode: 3, uses: 'Dark minor with a ♭2: metal and Spanish-flavoured music.' },
    { id: 'lydian', name: 'Lydian', degrees: ['1', '2', '3', '♯4', '5', '6', '7'], family: 'diatonic', char: ['♯4'], mode: 4, uses: 'Dreamy major with a ♯4: film scores and fusion.' },
    { id: 'mixolydian', name: 'Mixolydian', degrees: ['1', '2', '3', '4', '5', '6', '♭7'], family: 'diatonic', char: ['♭7'], mode: 5, uses: 'Major with a ♭7: blues-rock, jam bands, soloing over dominant 7 chords.' },
    { id: 'aeolian', name: 'Aeolian', degrees: ['1', '2', '♭3', '4', '5', '♭6', '♭7'], family: 'diatonic', char: ['♭6'], mode: 6, uses: 'The sixth mode of major. Identical to natural minor.' },
    { id: 'locrian', name: 'Locrian', degrees: ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'], family: 'diatonic', char: ['♭2', '♭5'], mode: 7, uses: 'Unstable. Used mostly over m7♭5 chords and in some metal.' }
  ];
  const MODE_NAMES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
  const MODE_FEEL = ['Major, bright', 'Minor, jazzy', 'Spanish, dark', 'Dreamy', 'Bluesy major', 'Natural minor', 'Unstable'];
  const getScale = id => SCALES.find(s => s.id === id) || SCALES[0];
  function scaleNotes(root, scale, dir) { const sc = typeof scale === 'string' ? getScale(scale) : scale; const deg = dir === 'down' && sc.descending ? sc.descending : sc.degrees; return deg.map(d => degreeNote(root, d)); }
  function stepPattern(semis) { return semis.map((s, i) => { const d = (i + 1 < semis.length ? semis[i + 1] : 12) - s; return d === 1 ? 'H' : d === 2 ? 'W' : d === 3 ? 'W+H' : String(d); }); }
  function modeParent(root, modeNum) {
    const r = typeof root === 'string' ? parseNote(root) : root;
    if (!modeNum || modeNum === 1) return r;
    return spellWithLetter(r.l - (modeNum - 1), r.pc - MAJOR_STEPS[modeNum - 1]);
  }

  /* ---------- Chords ---------- */
  const CHORDS = [
    { id: 'maj', name: 'Major', sym: '', degrees: ['1', '3', '5'], cat: 'Triads' },
    { id: 'min', name: 'Minor', sym: 'm', degrees: ['1', '♭3', '5'], cat: 'Triads' },
    { id: 'dim', name: 'Diminished', sym: '°', degrees: ['1', '♭3', '♭5'], cat: 'Triads' },
    { id: 'aug', name: 'Augmented', sym: '+', degrees: ['1', '3', '♯5'], cat: 'Triads' },
    { id: 'sus2', name: 'Suspended 2nd', sym: 'sus2', degrees: ['1', '2', '5'], cat: 'Triads' },
    { id: 'sus4', name: 'Suspended 4th', sym: 'sus4', degrees: ['1', '4', '5'], cat: 'Triads' },
    { id: 'pow', name: 'Power chord', sym: '5', degrees: ['1', '5'], cat: 'Triads' },
    { id: '6', name: 'Major 6', sym: '6', degrees: ['1', '3', '5', '6'], cat: 'Sixths & added' },
    { id: 'm6', name: 'Minor 6', sym: 'm6', degrees: ['1', '♭3', '5', '6'], cat: 'Sixths & added' },
    { id: 'add9', name: 'Add 9', sym: 'add9', degrees: ['1', '3', '5', '9'], cat: 'Sixths & added' },
    { id: 'madd9', name: 'Minor add 9', sym: 'm(add9)', degrees: ['1', '♭3', '5', '9'], cat: 'Sixths & added' },
    { id: '69', name: 'Six-nine', sym: '6/9', degrees: ['1', '3', '5', '6', '9'], cat: 'Sixths & added' },
    { id: '7', name: 'Dominant 7', sym: '7', degrees: ['1', '3', '5', '♭7'], cat: 'Sevenths' },
    { id: 'maj7', name: 'Major 7', sym: 'maj7', degrees: ['1', '3', '5', '7'], cat: 'Sevenths' },
    { id: 'm7', name: 'Minor 7', sym: 'm7', degrees: ['1', '♭3', '5', '♭7'], cat: 'Sevenths' },
    { id: 'mmaj7', name: 'Minor-major 7', sym: 'm(maj7)', degrees: ['1', '♭3', '5', '7'], cat: 'Sevenths' },
    { id: 'm7b5', name: 'Half-diminished 7', sym: 'm7♭5', degrees: ['1', '♭3', '♭5', '♭7'], cat: 'Sevenths', alias: 'ø7' },
    { id: 'dim7', name: 'Diminished 7', sym: '°7', degrees: ['1', '♭3', '♭5', '𝄫7'], cat: 'Sevenths', note: '𝄫7 (double flat) sounds the same as the 6th, but keeps the letter of a 7th: C°7 = C E♭ G♭ B𝄫.' },
    { id: '7sus4', name: 'Dominant 7 sus4', sym: '7sus4', degrees: ['1', '4', '5', '♭7'], cat: 'Sevenths' },
    { id: '9', name: 'Dominant 9', sym: '9', degrees: ['1', '3', '5', '♭7', '9'], cat: 'Extended' },
    { id: 'maj9', name: 'Major 9', sym: 'maj9', degrees: ['1', '3', '5', '7', '9'], cat: 'Extended' },
    { id: 'm9', name: 'Minor 9', sym: 'm9', degrees: ['1', '♭3', '5', '♭7', '9'], cat: 'Extended' },
    { id: '11', name: 'Dominant 11', sym: '11', degrees: ['1', '3', '5', '♭7', '9', '11'], cat: 'Extended', note: 'On guitar the 3rd is usually left out because it clashes with the 11th.' },
    { id: 'm11', name: 'Minor 11', sym: 'm11', degrees: ['1', '♭3', '5', '♭7', '9', '11'], cat: 'Extended' },
    { id: '13', name: 'Dominant 13', sym: '13', degrees: ['1', '3', '5', '♭7', '9', '13'], cat: 'Extended', note: 'The full stack (1 3 5 ♭7 9 11 13) also contains the 11th; it is normally omitted because it clashes with the 3rd.' },
    { id: '7b9', name: 'Dominant 7♭9', sym: '7♭9', degrees: ['1', '3', '5', '♭7', '♭9'], cat: 'Altered' },
    { id: '7s9', name: 'Dominant 7♯9', sym: '7♯9', degrees: ['1', '3', '5', '♭7', '♯9'], cat: 'Altered' },
    { id: '7b5', name: 'Dominant 7♭5', sym: '7♭5', degrees: ['1', '3', '♭5', '♭7'], cat: 'Altered' },
    { id: '7s5', name: 'Dominant 7♯5', sym: '7♯5', degrees: ['1', '3', '♯5', '♭7'], cat: 'Altered' },
    { id: '7s11', name: 'Dominant 7♯11', sym: '7♯11', degrees: ['1', '3', '5', '♭7', '♯11'], cat: 'Altered' },
    { id: '7alt', name: 'Altered dominant (one common choice)', sym: '7alt', degrees: ['1', '3', '♭7', '♯9', '♭13'], cat: 'Altered', note: '“Alt” means a dominant with any mix of ♭9, ♯9, ♭5/♯11 and ♯5/♭13 from the altered scale; this is one common choice.' }
  ];
  const getChord = id => CHORDS.find(c => c.id === id) || CHORDS[0];
  function chordNotes(root, chord) { const c = typeof chord === 'string' ? getChord(chord) : chord; return c.degrees.map(d => degreeNote(root, d)); }
  function chordSymbol(root, chord) { const r = typeof root === 'string' ? root : root.name; const c = typeof chord === 'string' ? getChord(chord) : chord; return r + c.sym; }
  function chordPcs(rootPc, chord) { const c = typeof chord === 'string' ? getChord(chord) : chord; return c.degrees.map(d => mod(rootPc + degreeSemis(d))); }

  /* Reverse chord finder: every root/formula pairing that matches the pitch classes. */
  function identifyChord(pcs, bassPc) {
    const set = [...new Set(pcs.map(p => mod(p)))];
    const out = [];
    if (set.length < 2) return out;
    for (const rootPc of set) {
      const rel = set.map(p => mod(p - rootPc)).sort((a, b) => a - b).join(',');
      for (const c of CHORDS) {
        const cs = [...new Set(c.degrees.map(d => mod(degreeSemis(d))))].sort((a, b) => a - b);
        if (cs.join(',') === rel) out.push({ rootPc, chord: c, exact: true });
        else if (c.degrees.length >= 4 && cs.includes(7) && cs.length - 1 === set.length && cs.filter(x => x !== 7).join(',') === rel) out.push({ rootPc, chord: c, exact: false, omitted: '5' });
      }
    }
    out.forEach(m => { m.bassPc = bassPc == null ? m.rootPc : mod(bassPc); m.inversion = m.bassPc !== m.rootPc; m.score = (m.exact ? 0 : 5) + (m.inversion ? 2 : 0) + (m.chord.cat === 'Altered' ? 1 : 0); });
    out.sort((a, b) => a.score - b.score);
    return out;
  }

  /* ---------- Keys ---------- */
  const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭'];
  const CIRCLE = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
  const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'], FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  function keySignature(root) {
    const notes = majorScale(root);
    const count = notes.reduce((t, n) => t + n.a, 0);
    const order = count >= 0 ? SHARP_ORDER : FLAT_ORDER;
    const accidentals = notes.filter(n => n.a !== 0).sort((a, b) => order.indexOf(LETTERS[a.l]) - order.indexOf(LETTERS[b.l])).map(n => n.name);
    const abs = Math.abs(count);
    return { count, type: count > 0 ? 'sharps' : count < 0 ? 'flats' : 'none', accidentals, text: count === 0 ? 'No sharps or flats' : abs + (count > 0 ? ' sharp' : ' flat') + (abs === 1 ? '' : 's') };
  }
  function relativeMinor(root) { return degreeNote(root, '6'); }
  function relativeMajor(minorRoot) { return degreeNote(minorRoot, '♭3'); }
  /* Whether accidentals in a context should default to flats. */
  function prefersFlats(root) { const r = typeof root === 'string' ? parseNote(root) : root; if (r.a < 0) return true; if (r.a > 0) return false; return keySignature(r).count < 0; }

  const TRIAD_Q = { '4,7': ['', 'Major'], '3,7': ['m', 'Minor'], '3,6': ['°', 'Diminished'], '4,8': ['+', 'Augmented'] };
  const SEV_Q = { '4,7,11': ['maj7', 'Major 7', 'maj7'], '4,7,10': ['7', 'Dominant 7', '7'], '3,7,10': ['m7', 'Minor 7', '7'], '3,6,10': ['m7♭5', 'Half-diminished 7', 'ø7'], '3,6,9': ['°7', 'Diminished 7', '°7'], '3,7,11': ['m(maj7)', 'Minor-major 7', '(maj7)'], '4,8,11': ['maj7♯5', 'Augmented major 7', '+maj7'] };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  /* Stack thirds inside a 7-note scale. */
  function diatonicChords(root, scaleId = 'major') {
    const sc = getScale(scaleId); const notes = scaleNotes(root, sc);
    if (notes.length !== 7) return [];
    const semis = sc.degrees.map(degreeSemis);
    return notes.map((n, i) => {
      const iv = k => mod(semis[(i + k) % 7] - semis[i]);
      const tri = TRIAD_Q[[iv(2), iv(4)].join(',')] || ['?', '?'];
      const sev = SEV_Q[[iv(2), iv(4), iv(6)].join(',')] || ['?', '?', '?'];
      const acc = sc.degrees[i].replace(/\d+/, '');
      const lower = tri[1] === 'Minor' || tri[1] === 'Diminished';
      const rn = lower ? ROMAN[i].toLowerCase() : ROMAN[i];
      return {
        degree: i + 1, root: n,
        roman: acc + rn + (tri[1] === 'Diminished' ? '°' : tri[1] === 'Augmented' ? '+' : ''),
        romanSeventh: acc + rn + sev[2],
        triad: { symbol: n.name + tri[0], quality: tri[1], notes: [0, 2, 4].map(k => notes[(i + k) % 7]) },
        seventh: { symbol: n.name + sev[0], quality: sev[1], notes: [0, 2, 4, 6].map(k => notes[(i + k) % 7]) }
      };
    });
  }

  /* ---------- Progressions: [degree from key tonic, chord id, roman label] ---------- */
  const PROGRESSIONS = [
    { id: 'pop', name: 'I–V–vi–IV', genre: 'Pop, rock', mode: 'major', steps: [['1', 'maj', 'I'], ['5', 'maj', 'V'], ['6', 'min', 'vi'], ['4', 'maj', 'IV']] },
    { id: '251', name: 'ii–V–I', genre: 'Jazz', mode: 'major', steps: [['2', 'm7', 'ii7'], ['5', '7', 'V7'], ['1', 'maj7', 'Imaj7'], ['1', 'maj7', 'Imaj7']] },
    { id: '50s', name: 'I–vi–IV–V', genre: '50s, pop', mode: 'major', steps: [['1', 'maj', 'I'], ['6', 'min', 'vi'], ['4', 'maj', 'IV'], ['5', 'maj', 'V']] },
    { id: 'ballad', name: 'vi–IV–I–V', genre: 'Pop ballad', mode: 'major', steps: [['6', 'min', 'vi'], ['4', 'maj', 'IV'], ['1', 'maj', 'I'], ['5', 'maj', 'V']] },
    { id: '145', name: 'I–IV–V', genre: 'Rock, folk', mode: 'major', steps: [['1', 'maj', 'I'], ['4', 'maj', 'IV'], ['5', 'maj', 'V'], ['1', 'maj', 'I']] },
    { id: 'blues', name: '12-bar blues', genre: 'Blues', mode: 'major', steps: [['1', '7', 'I7'], ['1', '7', 'I7'], ['1', '7', 'I7'], ['1', '7', 'I7'], ['4', '7', 'IV7'], ['4', '7', 'IV7'], ['1', '7', 'I7'], ['1', '7', 'I7'], ['5', '7', 'V7'], ['4', '7', 'IV7'], ['1', '7', 'I7'], ['5', '7', 'V7']] },
    { id: 'bluesqc', name: '12-bar blues, quick change', genre: 'Blues', mode: 'major', steps: [['1', '7', 'I7'], ['4', '7', 'IV7'], ['1', '7', 'I7'], ['1', '7', 'I7'], ['4', '7', 'IV7'], ['4', '7', 'IV7'], ['1', '7', 'I7'], ['1', '7', 'I7'], ['5', '7', 'V7'], ['4', '7', 'IV7'], ['1', '7', 'I7'], ['5', '7', 'V7']] },
    { id: '1625', name: 'I–vi–ii–V', genre: 'Jazz, pop', mode: 'major', steps: [['1', 'maj7', 'Imaj7'], ['6', 'm7', 'vi7'], ['2', 'm7', 'ii7'], ['5', '7', 'V7']] },
    { id: '3625', name: 'iii–vi–ii–V–I', genre: 'Jazz turnaround', mode: 'major', steps: [['3', 'm7', 'iii7'], ['6', 'm7', 'vi7'], ['2', 'm7', 'ii7'], ['5', '7', 'V7'], ['1', 'maj7', 'Imaj7']] },
    { id: '1465', name: 'I–IV–vi–V', genre: 'Pop', mode: 'major', steps: [['1', 'maj', 'I'], ['4', 'maj', 'IV'], ['6', 'min', 'vi'], ['5', 'maj', 'V']] },
    { id: 'mixo', name: 'I–♭VII–IV–I', genre: 'Classic rock (borrowed ♭VII)', mode: 'major', steps: [['1', 'maj', 'I'], ['♭7', 'maj', '♭VII'], ['4', 'maj', 'IV'], ['1', 'maj', 'I']] },
    { id: 'aeol', name: 'i–♭VI–♭VII–i', genre: 'Rock, metal (minor key)', mode: 'minor', steps: [['1', 'min', 'i'], ['♭6', 'maj', '♭VI'], ['♭7', 'maj', '♭VII'], ['1', 'min', 'i']] },
    { id: 'andalusian', name: 'i–♭VII–♭VI–V', genre: 'Flamenco, rock (minor key)', mode: 'minor', steps: [['1', 'min', 'i'], ['♭7', 'maj', '♭VII'], ['♭6', 'maj', '♭VI'], ['5', 'maj', 'V']] },
    { id: 'minor251', name: 'iiø7–V7♭9–i7', genre: 'Minor-key jazz', mode: 'minor', steps: [['2', 'm7b5', 'iiø7'], ['5', '7b9', 'V7♭9'], ['1', 'm7', 'i7'], ['1', 'm7', 'i7']] }
  ];
  function progressionChords(keyRoot, prog) {
    const p = typeof prog === 'string' ? PROGRESSIONS.find(x => x.id === prog) : prog;
    return p.steps.map(([deg, cid, roman]) => { const r = degreeNote(keyRoot, deg); return { roman, root: r, chord: getChord(cid), symbol: chordSymbol(r, cid), notes: chordNotes(r, cid) }; });
  }

  /* ---------- Tunings ---------- */
  const TUNINGS = [
    { id: 'std', name: 'E Standard', midi: [40, 45, 50, 55, 59, 64], names: ['E', 'A', 'D', 'G', 'B', 'E'] },
    { id: 'eb', name: 'E♭ Standard', midi: [39, 44, 49, 54, 58, 63], names: ['E♭', 'A♭', 'D♭', 'G♭', 'B♭', 'E♭'] },
    { id: 'dropd', name: 'Drop D', midi: [38, 45, 50, 55, 59, 64], names: ['D', 'A', 'D', 'G', 'B', 'E'] },
    { id: 'dstd', name: 'D Standard', midi: [38, 43, 48, 53, 57, 62], names: ['D', 'G', 'C', 'F', 'A', 'D'] },
    { id: 'dropcs', name: 'Drop C♯', midi: [37, 44, 49, 54, 58, 63], names: ['C♯', 'G♯', 'C♯', 'F♯', 'A♯', 'D♯'] },
    { id: 'dropc', name: 'Drop C', midi: [36, 43, 48, 53, 57, 62], names: ['C', 'G', 'C', 'F', 'A', 'D'] },
    { id: 'dropb', name: 'Drop B', midi: [35, 42, 47, 52, 56, 61], names: ['B', 'F♯', 'B', 'E', 'G♯', 'C♯'] }
  ];
  const STD = TUNINGS[0].midi;
  /* Custom tuning from six note names (low→high). Each string lands within 7 below to 4 above its standard pitch. */
  function customTuning(names) {
    const midi = names.map((nm, i) => { const pc = parseNote(nm).pc; let m = STD[i] - 7; while (mod(m) !== pc) m++; return m; });
    return { id: 'custom', name: 'Custom', midi, names: names.map(n => parseNote(n).name) };
  }
  const MAX_FRET = 24;
  function fretboardNotes(tuning, maxFret = MAX_FRET) {
    const out = [];
    for (let s = 0; s < 6; s++) for (let f = 0; f <= maxFret; f++) out.push({ s, f, midi: tuning.midi[s] + f, pc: mod(tuning.midi[s] + f) });
    return out;
  }

  /* ---------- Scale positions ---------- */
  function scalePitches(startMidi, rootPc, semisSet, count) {
    const out = []; let m = startMidi;
    while (out.length < count && m < startMidi + 90) { if (semisSet.includes(mod(m - rootPc))) out.push(m); m++; }
    return out;
  }
  /* n notes per string, ascending from startMidi. 3NPS (n=3) and pentatonic boxes (n=2). String 0 = low. */
  function walkPerString(tuning, startMidi, rootPc, semisSet, n) {
    return scalePitches(startMidi, rootPc, semisSet, 6 * n).map((p, i) => { const s = Math.floor(i / n); return { s, f: p - tuning.midi[s], midi: p }; });
  }
  /* Fret-window walk (CAGED): ascend through the scale, moving to the next string when a note leaves the window. */
  function walkWindow(tuning, lo, hi, rootPc, semisSet) {
    const out = []; let s = 0; let first = null;
    for (let f = lo; f <= hi; f++) if (semisSet.includes(mod(tuning.midi[0] + f - rootPc))) { first = f; break; }
    // reach one fret below the window only when nothing sits on its first two frets
    if (lo - 1 >= 0 && semisSet.includes(mod(tuning.midi[0] + lo - 1 - rootPc)) && (first === null || first > lo + 1)) first = lo - 1;
    if (first === null) return out;
    for (let m = tuning.midi[0] + first, guard = 0; guard < 60; guard++, m++) {
      if (!semisSet.includes(mod(m - rootPc))) continue;
      let f = m - tuning.midi[s];
      if (f > hi && s < 5) {
        const f2 = m - tuning.midi[s + 1];
        if (f2 >= Math.max(0, lo - 1)) { s++; f = f2; while (f > hi && s < 5) { s++; f = m - tuning.midi[s]; } }
        else if (f > hi + 1) continue; // unusual tunings: no playable spot for this pitch here
      }
      if (f > hi + 1 || f < 0) { if (s === 5) break; continue; }
      out.push({ s, f, midi: m });
    }
    return out;
  }
  function shiftValid(compute) {
    for (const off of [0, 12, -12, 24]) {
      const r = compute(off);
      if (r.length && r.every(n => n.f >= 0 && n.f <= MAX_FRET)) return r;
    }
    return null;
  }

  /* Place a CAGED window (offsets a..b from the 6th-string root fret) where every tone fits on the neck. */
  function placeWindow(tun, r6, a, b, rootPc, semis) {
    let lo0 = r6 + a; while (lo0 < 0) lo0 += 12; if (lo0 >= 13) lo0 -= 12;
    for (const off of [0, 12, -12]) {
      const lo = lo0 + off, hi = lo + (b - a);
      if (lo < 0 || hi > MAX_FRET) continue;
      const notes = walkWindow(tun, lo, hi, rootPc, semis);
      if (notes.length && notes.every(n => n.f >= 0 && n.f <= MAX_FRET) && semis.every(x => notes.some(n => mod(n.midi - rootPc) === x))) return { lo, hi, notes };
    }
    return null;
  }
  // Major-tonic CAGED windows, relative to the root's fret on the 6th string (standard-tuning geometry).
  const CAGED_MAJOR = [['E', -1, 2], ['D', 1, 5], ['C', 4, 7], ['A', 6, 10], ['G', 9, 12]];
  // Minor-tonic shapes reuse the relative major's windows (root 3 frets higher): Em←G, Dm←E, Cm←D, Am←C, Gm←A.
  const CAGED_MINOR = [['Em shape', 'G'], ['Dm shape', 'E'], ['Cm shape', 'D'], ['Am shape', 'C'], ['Gm shape', 'A']];
  function scalePositions(rootNote, scaleId, tuning) {
    const r = typeof rootNote === 'string' ? parseNote(rootNote) : rootNote;
    const sc = getScale(scaleId); const semis = sc.degrees.map(d => mod(degreeSemis(d)));
    const tun = tuning || TUNINGS[0];
    const label = midi => sc.degrees[semis.indexOf(mod(midi - r.pc))];
    const decorate = notes => notes.map(n => Object.assign({}, n, { degree: label(n.midi), blue: !!(sc.blue && sc.blue.includes(label(n.midi))) }));
    const out = [];
    const lowRootFret = mod(r.pc - tun.midi[0]);
    const r6 = mod(r.pc - (tun.midi[1] - 5)); // where the root sits on string 6 with standard intervals (anchored on string 5)
    if (sc.degrees.length === 7) {
      for (let k = 0; k < 7; k++) {
        let start = lowRootFret + semis[k]; if (start > 14) start -= 12;
        const notes = shiftValid(off => walkPerString(tun, tun.midi[0] + start + off, r.pc, semis, 3));
        if (notes) out.push({ id: '3nps' + k, kind: '3NPS', label: '3NPS pattern ' + (k + 1), sub: 'starts on degree ' + sc.degrees[k] + ' on the low string', notes: decorate(notes) });
      }
      const minorish = sc.degrees.includes('♭3') && !sc.degrees.includes('3');
      const shapes = minorish ? CAGED_MINOR.map(([nm, base]) => { const w = CAGED_MAJOR.find(x => x[0] === base); return [nm, w[1] + 3, w[2] + 3]; }) : CAGED_MAJOR.map(x => [x[0] + ' shape', x[1], x[2]]);
      shapes.forEach(([nm, a, b], i) => {
        const w = placeWindow(tun, r6, a, b, r.pc, semis); if (!w) return;
        const { lo, hi, notes } = w;
        out.push({ id: 'caged' + i, kind: 'CAGED', shape: nm, label: 'CAGED ' + nm, sub: (minorish ? 'built around the tonic minor chord shape' : 'built around the tonic major chord shape'), notes: decorate(notes), window: [lo, hi] });
      });
    }
    const pentId = sc.family === 'pentatonic' ? sc.id : sc.family === 'blues' ? sc.base : null;
    if (pentId) {
      const ps = getScale(pentId); const pSemis = ps.degrees.map(d => mod(degreeSemis(d)));
      for (let k = 0; k < 5; k++) {
        let start = lowRootFret + pSemis[k]; if (start > 14) start -= 12;
        let notes = shiftValid(off => walkPerString(tun, tun.midi[0] + start + off, r.pc, pSemis, 2));
        if (!notes) continue;
        if (sc.family === 'blues') {
          const lo = Math.min(...notes.map(n => n.f)), hi = Math.max(...notes.map(n => n.f));
          const blueSemis = sc.blue.map(d => mod(degreeSemis(d)));
          const seen = new Set(); const minM = notes[0].midi, maxM = notes[notes.length - 1].midi;
          for (let s = 0; s < 6; s++) for (let f = lo; f <= hi; f++) {
            const m = tun.midi[s] + f;
            if (blueSemis.includes(mod(m - r.pc)) && !seen.has(m) && m > minM && m < maxM) { seen.add(m); notes.push({ s, f, midi: m }); }
          }
          notes.sort((a, b) => a.midi - b.midi);
        }
        out.push({ id: 'box' + k, kind: 'Box', label: 'Box ' + (k + 1), sub: 'starts on degree ' + ps.degrees[k] + ' on the low string' + (sc.family === 'blues' ? '; blue note added inside the box' : ''), notes: decorate(notes) });
      }
    }
    out.forEach(p => {
      const fs = p.notes.map(n => n.f); p.range = [Math.min(...fs), Math.max(...fs)];
      p.notes.forEach(n => { n.finger = fingerFor(p, n); });
      // fingers must rise along each string (e.g. harmonic minor's 4-note strings)
      for (let s = 0; s < 6; s++) {
        const row = p.notes.filter(n => n.s === s && n.f > 0).sort((a, b) => a.f - b.f);
        for (let i = 1; i < row.length; i++) if (row[i].finger <= row[i - 1].finger) row[i].finger = Math.min(4, row[i - 1].finger + 1);
        for (let i = row.length - 2; i >= 0; i--) if (row[i].finger >= row[i + 1].finger) row[i].finger = Math.max(1, row[i + 1].finger - 1);
      }
    });
    return out;
  }
  /* Suggested fingering. 3NPS: per-string stretch rules. Boxes/CAGED: one finger per fret. */
  function fingerFor(pos, n) {
    if (n.f === 0) return 0;
    if (pos.kind === '3NPS') {
      const row = pos.notes.filter(x => x.s === n.s).map(x => x.f).sort((a, b) => a - b);
      if (row.length !== 3) return 1;
      const [a, b, c] = row;
      if (n.f === a) return 1; if (n.f === c) return 4;
      return (b - a === 1) ? 2 : (c - b === 1) ? 3 : 2;
    }
    // one finger per fret; on a string that reaches the 5th fret of a wide box the hand shifts up one fret
    const fretted = pos.notes.filter(x => x.f > 0).map(x => x.f);
    const lo = Math.min(...fretted);
    const rowMax = Math.max(...pos.notes.filter(x => x.s === n.s).map(x => x.f));
    const anchor = rowMax > lo + 3 ? lo + 1 : lo;
    return Math.max(1, Math.min(4, n.f - anchor + 1));
  }


  /* Arpeggio positions: the five CAGED windows of the tonic chord, walked with chord tones only. */
  function arpeggioPositions(rootNote, chordId, tuning) {
    const r = typeof rootNote === 'string' ? parseNote(rootNote) : rootNote;
    const tun = tuning || TUNINGS[0]; const c = getChord(chordId);
    const semis = [...new Set(c.degrees.map(d => mod(degreeSemis(d))))];
    const label = midi => c.degrees.find(d => mod(degreeSemis(d)) === mod(midi - r.pc));
    const minorish = c.degrees.includes('♭3');
    const r6 = mod(r.pc - (tun.midi[1] - 5));
    const shapes = minorish ? CAGED_MINOR.map(([nm, base]) => { const w = CAGED_MAJOR.find(x => x[0] === base); return [nm, w[1] + 3, w[2] + 3]; }) : CAGED_MAJOR.map(x => [x[0] + ' shape', x[1], x[2]]);
    const out = [];
    shapes.forEach(([nm, a, b], i) => {
      const w = placeWindow(tun, r6, a, b, r.pc, semis); if (!w) return;
      const { lo, hi } = w; const notes = w.notes.map(n => Object.assign(n, { degree: label(n.midi) }));
      const pos = { id: 'arp' + i, kind: 'CAGED', shape: nm, label: nm, sub: 'frets ' + lo + '–' + hi, notes, window: [lo, hi] };
      const fr = notes.filter(n => n.f > 0).map(n => n.f); const flo = Math.min(...fr);
      notes.forEach(n => { n.finger = n.f === 0 ? 0 : Math.max(1, Math.min(4, n.f - flo + 1)); });
      for (let s = 0; s < 6; s++) { const row = notes.filter(n => n.s === s && n.f > 0).sort((x, y) => x.f - y.f); for (let k = 1; k < row.length; k++) if (row[k].finger <= row[k - 1].finger) row[k].finger = Math.min(4, row[k - 1].finger + 1); }
      pos.range = [Math.min(...notes.map(n => n.f)), Math.max(...notes.map(n => n.f))];
      out.push(pos);
    });
    return out;
  }

  /* ---------- Chord voicings ---------- */
  // frets listed string 6 → 1, null = muted. Fingers: 0 = open/none.
  const OPEN = [
    ['C', 'maj', [null, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]], ['G', 'maj', [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]],
    ['D', 'maj', [null, null, 0, 2, 3, 2], [0, 0, 0, 1, 3, 2]], ['A', 'maj', [null, 0, 2, 2, 2, 0], [0, 0, 1, 2, 3, 0]],
    ['E', 'maj', [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]], ['F', 'maj', [1, 3, 3, 2, 1, 1], [1, 3, 4, 2, 1, 1]],
    ['A', 'min', [null, 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0]], ['E', 'min', [0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]],
    ['D', 'min', [null, null, 0, 2, 3, 1], [0, 0, 0, 2, 3, 1]],
    ['B', '7', [null, 2, 1, 2, 0, 2], [0, 2, 1, 3, 0, 4]], ['A', '7', [null, 0, 2, 0, 2, 0], [0, 0, 2, 0, 3, 0]],
    ['D', '7', [null, null, 0, 2, 1, 2], [0, 0, 0, 2, 1, 3]], ['E', '7', [0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]],
    ['G', '7', [3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]], ['C', '7', [null, 3, 2, 3, 1, 0], [0, 3, 2, 4, 1, 0]],
    ['A', 'm7', [null, 0, 2, 0, 1, 0], [0, 0, 2, 0, 1, 0]], ['E', 'm7', [0, 2, 2, 0, 3, 0], [0, 1, 2, 0, 3, 0]],
    ['D', 'm7', [null, null, 0, 2, 1, 1], [0, 0, 0, 2, 1, 1]], ['C', 'maj7', [null, 3, 2, 0, 0, 0], [0, 3, 2, 0, 0, 0]],
    ['F', 'maj7', [null, null, 3, 2, 1, 0], [0, 0, 3, 2, 1, 0]], ['A', 'maj7', [null, 0, 2, 1, 2, 0], [0, 0, 2, 1, 3, 0]],
    ['D', 'maj7', [null, null, 0, 2, 2, 2], [0, 0, 0, 1, 1, 1]], ['E', 'maj7', [0, 2, 1, 1, 0, 0], [0, 3, 1, 2, 0, 0]],
    ['A', 'sus2', [null, 0, 2, 2, 0, 0], [0, 0, 1, 2, 0, 0]], ['A', 'sus4', [null, 0, 2, 2, 3, 0], [0, 0, 1, 2, 3, 0]],
    ['D', 'sus2', [null, null, 0, 2, 3, 0], [0, 0, 0, 1, 3, 0]], ['D', 'sus4', [null, null, 0, 2, 3, 3], [0, 0, 0, 1, 3, 4]],
    ['E', 'sus4', [0, 2, 2, 2, 0, 0], [0, 2, 3, 4, 0, 0]], ['C', 'add9', [null, 3, 2, 0, 3, 3], [0, 2, 1, 0, 3, 4]],
    ['E', 'pow', [0, 2, 2, null, null, null], [0, 1, 2, 0, 0, 0]], ['A', 'pow', [null, 0, 2, 2, null, null], [0, 0, 1, 2, 0, 0]],
    ['D', 'pow', [null, null, 0, 2, 3, null], [0, 0, 0, 1, 3, 0]], ['A', 'm6', [null, 0, 2, 2, 1, 2], [0, 0, 2, 3, 1, 4]],
    ['C', '6', [null, 3, 2, 2, 1, 0], [0, 4, 2, 3, 1, 0]], ['E', '9', [0, 2, 0, 1, 0, 2], [0, 2, 0, 1, 0, 3]],
    ['D', 'dim', [null, null, 0, 1, 3, 1], [0, 0, 0, 1, 3, 2]].slice(0, 2).concat([[null, null, 0, 1, 3, 1], [0, 0, 0, 1, 3, 1]])
  ].map(([root, chord, frets, fingers]) => ({ name: 'Open ' + root + getChord(chord).sym, kind: 'open', openRoot: root, chord, frets, fingers }));
  const MOVABLE = [
    ['E-shape barre', 'maj', 0, [0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]], ['A-shape barre', 'maj', 1, [null, 0, 2, 2, 2, 0], [0, 1, 2, 3, 4, 1]],
    ['E-shape barre', 'min', 0, [0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]], ['A-shape barre', 'min', 1, [null, 0, 2, 2, 1, 0], [0, 1, 3, 4, 2, 1]],
    ['Root on 6th', 'pow', 0, [0, 2, 2, null, null, null], [1, 3, 4, 0, 0, 0]], ['Root on 5th', 'pow', 1, [null, 0, 2, 2, null, null], [0, 1, 3, 4, 0, 0]],
    ['Two-note, root on 6th', 'pow', 0, [0, 2, null, null, null, null], [1, 3, 0, 0, 0, 0]],
    ['One-finger (drop tunings)', 'pow', 0, [0, 0, 0, null, null, null], [1, 1, 1, 0, 0, 0]],
    ['E-shape', '7', 0, [0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1]], ['A-shape', '7', 1, [null, 0, 2, 0, 2, 0], [0, 1, 3, 1, 4, 1]],
    ['E-shape', 'm7', 0, [0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1]], ['A-shape', 'm7', 1, [null, 0, 2, 0, 1, 0], [0, 1, 3, 1, 2, 1]],
    ['Root on 6th', 'maj7', 0, [0, null, 1, 1, 0, null], [2, 0, 3, 4, 1, 0]], ['A-shape', 'maj7', 1, [null, 0, 2, 1, 2, 0], [0, 1, 3, 2, 4, 1]],
    ['A-shape', 'mmaj7', 1, [null, 0, 2, 1, 1, 0], [0, 1, 4, 2, 3, 1]],
    ['E-shape', 'sus4', 0, [0, 2, 2, 2, 0, 0], [1, 2, 3, 4, 1, 1]], ['A-shape', 'sus4', 1, [null, 0, 2, 2, 3, 0], [0, 1, 2, 3, 4, 1]],
    ['A-shape', 'sus2', 1, [null, 0, 2, 2, 0, 0], [0, 1, 3, 4, 1, 1]],
    ['E-shape', '7sus4', 0, [0, 2, 0, 2, 0, 0], [1, 3, 1, 4, 1, 1]], ['A-shape', '7sus4', 1, [null, 0, 2, 0, 3, 0], [0, 1, 3, 1, 4, 1]],
    ['A-shape', '6', 1, [null, 0, 2, 2, 2, 2], [0, 1, 3, 3, 3, 3]], ['A-shape', 'm6', 1, [null, 0, 2, 2, 1, 2], [0, 1, 3, 3, 2, 4]],
    ['Root on 5th', 'dim', 1, [null, 0, 1, 2, 1, null], [0, 1, 2, 4, 3, 0]],
    ['Root on 5th', 'dim7', 1, [null, 0, 1, -1, 1, null], [0, 2, 3, 1, 4, 0]], ['Root on 6th', 'dim7', 0, [0, null, -1, 0, -1, null], [2, 0, 1, 3, 1, 0]],
    ['Root on 5th', 'm7b5', 1, [null, 0, 1, 0, 1, null], [0, 1, 3, 2, 4, 0]], ['Root on 6th', 'm7b5', 0, [0, null, 0, 0, -1, null], [2, 0, 3, 4, 1, 0]],
    ['Root on 5th', 'aug', 1, [null, 0, -1, -2, -2, null], [0, 4, 3, 1, 2, 0]],
    ['Root on 5th', 'add9', 1, [null, 0, -1, null, 0, 0], [0, 2, 1, 0, 3, 4]],
    ['Root on 5th', 'madd9', 1, [null, 0, -2, null, 0, null], [0, 3, 1, 0, 4, 0]],
    ['Root on 5th', '69', 1, [null, 0, -1, -1, 0, 0], [0, 2, 1, 1, 3, 4]],
    ['Root on 5th', '9', 1, [null, 0, -1, 0, 0, 0], [0, 2, 1, 3, 3, 3]], ['Root on 5th', 'maj9', 1, [null, 0, -1, 1, 0, null], [0, 2, 1, 4, 3, 0]],
    ['Root on 5th', 'm9', 1, [null, 0, -2, 0, 0, 0], [0, 2, 1, 3, 3, 3]],
    ['Root on 5th (3rd omitted)', '11', 1, [null, 0, 0, 0, 0, null], [0, 1, 1, 1, 1, 0]],
    ['Root on 6th', 'm11', 0, [0, null, 0, 0, -2, null], [2, 0, 3, 4, 1, 0]],
    ['Root on 6th', '13', 0, [0, null, 0, 1, 2, null], [1, 0, 2, 3, 4, 0]], ['Root on 5th', '13', 1, [null, 0, -1, 0, 0, 2], [0, 2, 1, 3, 3, 4]],
    ['Root on 5th', '7s9', 1, [null, 0, -1, 0, 1, null], [0, 2, 1, 3, 4, 0]], ['Root on 5th', '7b9', 1, [null, 0, -1, 0, -1, null], [0, 3, 1, 4, 2, 0]],
    ['Root on 5th', '7b5', 1, [null, 0, 1, 0, 2, null], [0, 1, 2, 1, 3, 0]], ['Root on 6th', '7s5', 0, [0, null, 0, 1, 1, null], [1, 0, 2, 3, 4, 0]],
    ['Root on 6th', '7alt', 0, [0, null, 0, 1, 1, null], [1, 0, 2, 3, 4, 0]],
    ['Root on 5th', '7s11', 1, [null, 0, 1, 0, 2, 0], [0, 1, 2, 1, 3, 1]]
  ].map(([name, chord, rootString, frets, fingers]) => ({ name, kind: 'movable', chord, rootString, frets, fingers }));
  /* Physical sanity: fingers 1–4, fretted span ≤4, fingers ascend with fret, one finger per fret. */
  function physicallyValid(frets, fingers) {
    if (frets.some(f => f != null && (typeof f !== 'number' || Number.isNaN(f) || f < 0 || f > MAX_FRET))) return false;
    const used = frets.map((f, i) => ({ f, g: fingers[i] })).filter(x => x.f != null && x.f > 0);
    if (!used.length) return true;
    if (used.some(x => !(x.g >= 1 && x.g <= 4))) return false;
    const fs = used.map(x => x.f); if (Math.max(...fs) - Math.min(...fs) > 4) return false;
    for (const a of used) for (const b of used) { if (a.f < b.f && a.g >= b.g) return false; if (a.g === b.g && a.f !== b.f) return false; }
    return true;
  }
  /* Voicings for root + chord in a tuning. Each candidate is checked against the chord's tones and physical rules. */
  function chordVoicings(rootNote, chordId, tuning) {
    const r = typeof rootNote === 'string' ? parseNote(rootNote) : rootNote;
    const tun = tuning || TUNINGS[0]; const c = getChord(chordId);
    const pcs = chordPcs(r.pc, c);
    const shift = tun.midi[1] - STD[1];
    const out = [];
    const accept = (base, frets, fingers) => {
      const sound = frets.map((f, s) => f == null ? null : tun.midi[s] + f);
      const notes = sound.filter(x => x != null);
      if (notes.length < 2) return;
      if (!notes.every(m => pcs.includes(mod(m)))) return;
      if (mod(Math.min(...notes)) !== r.pc) return;
      const third = c.degrees.find(d => /^♭?3$/.test(d));
      if (third && c.id !== '11' && !notes.some(m => mod(m - r.pc) === mod(degreeSemis(third)))) return;
      if (!physicallyValid(frets, fingers)) return;
      const key = frets.join(','); if (out.some(v => v.frets.join(',') === key)) return;
      out.push(Object.assign({}, base, { frets, fingers, barre: detectBarre(frets, fingers), midi: sound, degrees: sound.map(m => m == null ? null : c.degrees.find(d => mod(degreeSemis(d)) === mod(m - r.pc))) }));
    };
    for (const v of OPEN) {
      if (v.chord !== c.id) continue;
      const fr = v.frets.slice(), fg = v.fingers.slice();
      for (let s = 0; s < 6; s++) { const d = (tun.midi[s] - STD[s]) - shift; if (!d || fr[s] == null) continue; fr[s] -= d; if (fr[s] < 0) { fr[s] = null; fg[s] = 0; } else if (v.frets[s] === 0) { fr[s] = null; fg[s] = 0; } }
      accept({ name: shift ? v.name.replace('Open ', '') + ' shape (open)' : v.name, kind: 'open' }, fr, fg);
    }
    for (const v of MOVABLE) {
      if (v.chord !== c.id) continue;
      const rootF = mod(r.pc - tun.midi[v.rootString]);
      const minOff = Math.min(...v.frets.filter(x => x != null));
      for (const base of [rootF, rootF + 12]) {
        if (base + minOff < 1) continue;
        const frets = v.frets.map(x => x == null ? null : x + base);
        if (Math.max(...frets.filter(x => x != null)) > 17) continue;
        const fr = frets.slice();
        for (let s = 0; s < 6; s++) { const d = (tun.midi[s] - STD[s]) - shift; if (d && fr[s] != null && !(v.chord === 'pow' && v.name.startsWith('One-finger'))) fr[s] -= d; }
        const low = Math.min(...fr.filter(x => x != null && x > 0));
        accept({ name: v.name + ', fret ' + low, kind: 'movable' }, fr, v.fingers);
        break;
      }
    }
    return out;
  }
  function detectBarre(frets, fingers) {
    const by = {};
    frets.forEach((f, s) => { if (f != null && f > 0 && fingers[s]) { const k = fingers[s] + ':' + f; (by[k] = by[k] || []).push(s); } });
    let best = null;
    Object.entries(by).forEach(([k, ss]) => { if (ss.length >= 2) { const [g, f] = k.split(':').map(Number); const from = Math.min(...ss), to = Math.max(...ss); if (!best || to - from > best.to - best.from) best = { finger: g, fret: f, from, to }; } });
    return best;
  }

  /* ---------- Inversions ---------- */
  const STRING_SETS = { 3: [[3, 4, 5], [2, 3, 4], [1, 2, 3], [0, 1, 2]], 4: [[2, 3, 4, 5], [1, 2, 3, 4], [0, 1, 2, 3]] };
  function inversionOrder(notes, inv) { return notes.slice(inv).concat(notes.slice(0, inv)); }
  /* Best voicing of an inversion on each adjacent string set: close for triads, close or drop-2 for sevenths. */
  function inversionVoicings(rootNote, chordId, inv, tuning) {
    const r = typeof rootNote === 'string' ? parseNote(rootNote) : rootNote;
    const tun = tuning || TUNINGS[0]; const c = getChord(chordId);
    const tones = c.degrees.slice(0, 4).map(d => mod(r.pc + degreeSemis(d)));
    const order = inversionOrder(tones, inv); const n = order.length;
    const drop2 = n === 4 ? [order[0], order[2], order[3], order[1]] : null;
    const results = [];
    for (const set of STRING_SETS[n] || []) {
      let best = null;
      for (let base = 0; base <= 14; base++) {
        const rec = (i, acc) => {
          if (i === set.length) {
            const midi = acc.map((f, k) => tun.midi[set[k]] + f);
            for (let k = 1; k < midi.length; k++) if (midi[k] <= midi[k - 1]) return;
            const seq = midi.map(m => mod(m));
            const fretted = acc.filter(f => f > 0); const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0; if (span > (n === 4 ? 4 : 3)) return;
            let voicing = null;
            if (seq.join() === order.join()) voicing = 'Close';
            else if (drop2 && seq.join() === drop2.join()) voicing = 'Drop 2';
            if (!voicing) return;
            const score = (voicing === 'Close' && n === 4 ? 1 : 0) * 50 + (span > 3 ? 30 : 0) + Math.min(...acc);
            if (!best || score < best.score) best = { strings: set, frets: acc.slice(), midi, voicing, score, stretch: span > 3, degrees: seq.map(p => c.degrees[tones.indexOf(p)]) };
            return;
          }
          for (let f = base; f <= base + 4 && f <= MAX_FRET; f++) { acc.push(f); rec(i + 1, acc); acc.pop(); }
        };
        rec(0, []);
      }
      if (best) results.push(best);
    }
    return results;
  }

  /* ---------- Advanced harmony ---------- */
  function secondaryDominants(keyRoot) {
    const dia = diatonicChords(keyRoot, 'major');
    return [2, 3, 4, 5, 6].map(i => { const t = dia[i - 1]; const root = transpose(t.root, 4, 7); return { label: 'V7/' + t.roman, target: t.triad.symbol, root, symbol: root.name + '7', notes: chordNotes(root, '7') }; });
  }
  /* Tritone substitute: dominant a diminished 5th away, spelled as the ♭II of the target (G7 → D♭7). */
  function tritoneSub(domRoot) { const r = typeof domRoot === 'string' ? parseNote(domRoot) : domRoot; const s = transpose(r, 4, 6); return { root: s, symbol: s.name + '7', notes: chordNotes(s, '7') }; }
  function borrowedChords(keyRoot) {
    return [['♭3', 'maj', '♭III'], ['4', 'min', 'iv'], ['♭6', 'maj', '♭VI'], ['♭7', 'maj', '♭VII'], ['2', 'dim', 'ii°'], ['5', 'min', 'v']].map(([d, c, rn]) => { const r = degreeNote(keyRoot, d); return { roman: rn, symbol: chordSymbol(r, c), notes: chordNotes(r, c) }; });
  }

  return {
    LETTERS, NAT, MAJOR_STEPS, ROOTS, SCALES, CHORDS, INTERVALS, TUNINGS, PROGRESSIONS, MAJOR_KEYS, CIRCLE, MODE_NAMES, MODE_FEEL, OPEN, MOVABLE, MAX_FRET, STRING_SETS, CAGED_MAJOR,
    mod, parseNote, makeNote, spellWithLetter, pcName, parseDegree, degreeSemis, degreeNote, transpose, majorScale, intervalBetween, qualify, invertInterval, midiOf,
    getScale, scaleNotes, stepPattern, modeParent, getChord, chordNotes, chordSymbol, chordPcs, identifyChord, keySignature, relativeMinor, relativeMajor,
    prefersFlats, diatonicChords, progressionChords, customTuning, scalePositions, arpeggioPositions, fretboardNotes, chordVoicings, physicallyValid, detectBarre,
    inversionOrder, inversionVoicings, secondaryDominants, tritoneSub, borrowedChords, walkWindow, walkPerString
  };
});
