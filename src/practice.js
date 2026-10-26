/* Practice mode. Questions are generated from the theory engine; the answer is never rendered until the learner responds. */
const EXERCISES = [
  ['note', 'Find the note on the fretboard'], ['roots', 'Find all the roots'], ['interval', 'Identify the interval'], ['degree', 'Identify the scale degree'],
  ['tones', 'Identify chord tones'], ['chord', 'Identify the chord'], ['complete', 'Complete the major scale'], ['position', 'Recognise the scale position'],
  ['build', 'Build a chord from its formula'], ['relative', 'Relative major and minor'],
  ['ivgroups', 'Interval memorization groups'], ['direction', 'Ascending and descending intervals'], ['ivinvert', 'Interval inversions'],
  ['scalebuild', 'Build a major or natural minor scale'], ['triad', 'Triad qualities and inversions'], ['family', 'Chord families (diatonic chords)'], ['fbinterval', 'Intervals on the fretboard']
];
/* Interval memorization groups, in the suggested learning order. */
const IV_SETS = { perfect: ['P1', 'P4', 'P5', 'P8'], major: ['M2', 'M3', 'M6', 'M7'], minor: ['m2', 'm3', 'm6', 'm7'], tritone: ['A4', 'd5'], mixed: ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'] };
const GROUPS = [['perfect', '1. Perfect: 0–5–7–12'], ['major', '2. Major: 2–4–9–11'], ['minor', '3. Minor: 1–3–8–10'], ['tritone', '4. Tritone: 6'], ['mixed', '5. Mixed']];
const GROUP_HINT = { perfect: 'Perfect anchors: P1 = 0, P4 = 5, P5 = 7, P8 = 12.', major: 'Major intervals: M2 = 2, M3 = 4, M6 = 9, M7 = 11.', minor: 'Minor = one semitone below major: m2 = 1, m3 = 3, m6 = 8, m7 = 10.', tritone: 'Tritone = 6 semitones. A4 if the letters are a 4th apart, d5 if they are a 5th apart.', mixed: 'Perfect 0–5–7–12 · major 2–4–9–11 · minor 1–3–8–10 · tritone 6.' };
const ivOf = a => T.INTERVALS.find(x => x.abbr === a);
const ivLabel = s => s === 6 ? 'A4 / d5' : T.INTERVALS.find(x => x.semis === s && IV_SETS.mixed.includes(x.abbr)).abbr;
const SEMI_LABELS = range0(0, 12).map(ivLabel);
const signedSemis = n => (n < 0 ? '−' : '+') + Math.abs(n);
/* Upper note and its octave for an ascending interval from root in octave 4. */
function ivTop(root, iv) { const x = T.noteAbove(root, 4, iv); return { top: x.note, o: x.octave }; }
/* Same-letter intervals are ambiguous without it: “D up to D” could be a unison or an octave. */
const octaveHint = number => number >= 8 ? ' (one octave or more higher)' : '';
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const ROOTS_BY_LEVEL = { beginner: ['C', 'G', 'D', 'A', 'E', 'F'], intermediate: ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'B♭', 'E♭', 'A♭'], advanced: T.MAJOR_KEYS.slice() };
/* A random root from the level's list for which every note the question shows can be written with at most a double ♯ or ♭
   (C♭ dim7 would need B♭♭♭). notesOf(root) returns every note used in the prompt, answer and choices. */
const writable = notes => notes.every(n => Math.abs(n.a) <= 2);
function rootFor(level, notesOf) { const ok = shuffle(ROOTS_BY_LEVEL[level]).find(r => writable(notesOf(T.parseNote(r)))); return T.parseNote(ok || 'C'); }
function choicesFrom(right, pool, n = 4) { const set = [right]; for (const p of shuffle(pool)) { if (set.length >= n) break; if (!set.includes(p)) set.push(p); } return shuffle(set); }

let P = { q: null, picked: null, sel: [], result: null };
/* Question version. Review questions saved by older generators in STALE_EX could carry wrong answers (the interval octave bug,
   ambiguous same-letter intervals, enharmonic relative keys), so they are dropped on load. Scores are never touched. */
const QV = 2, STALE_EX = ['interval', 'ivgroups', 'quality', 'relative'];
function progress() {
  const d = Store.get('gte.practice', null); if (!(d && typeof d === 'object' && d.stats)) return { stats: {}, missed: [] };
  if (!Array.isArray(d.missed)) d.missed = [];
  const kept = d.missed.filter(m => m && m.q && !(STALE_EX.includes(m.ex) && !(m.q.v >= QV)));
  if (kept.length !== d.missed.length) { d.missed = kept; saveProgress(d); }
  return d;
}
function saveProgress(p) { Store.set('gte.practice', p); }
/* Stats key; interval groups score each group separately. Existing keys (ex:level) are unchanged. */
const statKey = () => S.practice.ex + (S.practice.ex === 'ivgroups' ? '-' + S.practice.group : '') + ':' + S.practice.level;

const GEN = {
  note(level) {
    const lim = level === 'beginner' ? 5 : level === 'intermediate' ? 12 : 15;
    const pcs = level === 'beginner' ? [0, 2, 4, 5, 7, 9, 11] : range0(0, 11);
    const pc = rnd(pcs); const name = level === 'advanced' && ![0, 2, 4, 5, 7, 9, 11].includes(pc) ? rnd([T.pcName(pc, 'sharp'), T.pcName(pc, 'flat')]) : T.pcName(pc, rnd(['sharp', 'flat']));
    return { kind: 'tap', prompt: `Tap any <b>${esc(name)}</b> between frets 0 and ${lim}.`, pc, lim, answerText: name, spec: { ex: 'note', pc, lim } };
  },
  roots(level) {
    const lim = level === 'beginner' ? 5 : 12; const pc = rnd(level === 'beginner' ? [0, 2, 4, 5, 7, 9, 11] : range0(0, 11));
    const name = T.pcName(pc, rnd(['sharp', 'flat']));
    return { kind: 'multi', prompt: `Tap <b>every ${esc(name)}</b> between frets 0 and ${lim}, then check.`, pc, lim, answerText: name, spec: { ex: 'roots', pc, lim } };
  },
  interval(level) {
    const pool = level === 'beginner' ? T.INTERVALS.filter(x => ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'P8'].includes(x.abbr)) : level === 'intermediate' ? T.INTERVALS.filter(x => x.semis <= 12 && !['A2', 'A5', 'd7'].includes(x.abbr)) : T.INTERVALS;
    const iv = rnd(pool); const root = rootFor(level, r => [T.degreeNote(r, iv.degree)]);
    const { note: top, interval: res } = T.noteAbove(root, 4, iv);
    const midiA = T.midiOf(root, 3), midiB = midiA + res.semis;
    return { kind: 'choice', prompt: `What interval is <b>${esc(root.name)}</b> up to <b>${esc(top.name)}</b>${octaveHint(res.number)}?`, audio: [midiA, midiB], right: res.name, choices: choicesFrom(res.name, pool.map(x => T.noteAbove(root, 4, x).interval.name)), explain: `${res.semis} semitones, ${res.number} letters (${esc(root.name)} to ${esc(top.name)}).`, hint: 'Count letters for the number (C D E = 3rd), then semitones for the quality.', spec: { ex: 'interval' } };
  },
  degree(level) {
    const sc = level === 'beginner' ? T.getScale('major') : level === 'intermediate' ? T.getScale(rnd(['major', 'minor'])) : T.getScale(rnd(['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian', 'harmonic']));
    const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const notes = T.scaleNotes(root, sc); const i = 1 + Math.floor(Math.random() * 6);
    return { kind: 'choice', prompt: `In <b>${esc(root.name)} ${esc(sc.name)}</b>, which degree is <b>${esc(notes[i].name)}</b>?`, right: sc.degrees[i], choices: choicesFrom(sc.degrees[i], sc.degrees.slice(1)), explain: `${esc(root.name)} ${esc(sc.name)}: ${esc(noteNames(notes))}.`, hint: 'Count letters up from the root: the root is 1. Check sharps or flats against the formula.', spec: { ex: 'degree' } };
  },
  tones(level) {
    const ids = level === 'beginner' ? ['maj', 'min'] : level === 'intermediate' ? ['7', 'maj7', 'm7', 'dim', 'aug'] : ['m7b5', 'dim7', '9', '13', '7s9', 'mmaj7', '7b9'];
    const c = T.getChord(rnd(ids)); const root = rootFor(level, r => T.chordNotes(r, c).concat(T.majorScale(r), T.chordNotes(r, 'dim7'), T.chordNotes(r, '7s9'))); const notes = T.chordNotes(root, c);
    const k = 1 + Math.floor(Math.random() * (notes.length - 1)); const deg = c.degrees[k];
    const pool = T.majorScale(root).concat(T.chordNotes(root, 'dim7'), T.chordNotes(root, '7s9')).map(n => n.name);
    return { kind: 'choice', prompt: `What is the <b>${esc(deg)}</b> of <b>${esc(T.chordSymbol(root, c))}</b>?`, right: notes[k].name, choices: choicesFrom(notes[k].name, pool), explain: `${esc(T.chordSymbol(root, c))} = ${esc(noteNames(notes))} (${esc(c.degrees.join(' '))}).`, hint: 'Write the major scale of the root, take that degree, then apply any ♭ or ♯ from the formula.', spec: { ex: 'tones' } };
  },
  chord(level) {
    const ids = level === 'beginner' ? ['maj', 'min', 'dim', 'aug', 'sus4'] : level === 'intermediate' ? ['maj', 'min', '7', 'maj7', 'm7', 'm7b5', 'sus2', '6'] : ['m7b5', 'dim7', 'mmaj7', '9', 'maj9', 'm9', '7s9', '7b9', '13', '7sus4'];
    const c = T.getChord(rnd(ids)); const root = rootFor(level, r => T.chordNotes(r, c)); const notes = T.chordNotes(root, c);
    const right = T.chordSymbol(root, c);
    return { kind: 'choice', prompt: `Which chord is <b>${esc(noteNames(notes))}</b>?`, audio: notes.map((n, i) => T.midiOf(n, 3) + (i && n.pc <= notes[0].pc ? 12 : 0)), chordAudio: true, right, choices: choicesFrom(right, ids.map(id => T.chordSymbol(root, id))), explain: `Root ${esc(root.name)}, formula ${esc(c.degrees.join(' '))}.`, hint: 'The first note is the root. Measure the 3rd (3 or 4 semitones) and the 5th, then any 7th.', spec: { ex: 'chord' } };
  },
  complete(level) {
    const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const ms = T.majorScale(root); const k = 1 + Math.floor(Math.random() * 6);
    const right = ms[k].name; const L = ms[k].l;
    const pool = [-1, 0, 1].map(a => T.makeNote(L, ms[k].a + a).name).concat([T.makeNote(L + 1, 0).name]);
    return { kind: 'choice', prompt: `Complete <b>${esc(root.name)} major</b>: ${ms.map((n, i) => i === k ? '<span class="blank">?</span>' : esc(n.name)).join(' ')}`, right, choices: choicesFrom(right, pool), explain: `Each letter appears once; the step pattern is W W H W W W H.`, hint: 'Each letter appears once. Steps: W W H W W W H.', spec: { ex: 'complete' } };
  },
  position(level) {
    const scId = level === 'beginner' ? 'minpent' : level === 'intermediate' ? rnd(['minpent', 'major']) : rnd(['major', 'minor', 'majpent']);
    const root = T.parseNote(rnd(['A', 'G', 'C', 'E', 'D'])); const ps = T.scalePositions(root, scId, T.TUNINGS[0]).filter(p => p.kind !== '3NPS' || level === 'advanced');
    const p = rnd(ps); const sc = T.getScale(scId);
    return { kind: 'choice', prompt: `This is ${esc(root.name)} ${esc(sc.name)}. Which position is it?`, pos: p, scId, root: root.name, right: p.label, choices: choicesFrom(p.label, ps.map(x => x.label)), explain: `${esc(p.label)}: ${esc(p.sub)}.`, spec: { ex: 'position' } };
  },
  build(level) {
    const ids = level === 'beginner' ? ['maj', 'min', 'sus2', 'sus4'] : level === 'intermediate' ? ['7', 'maj7', 'm7', 'm7b5', 'dim', 'aug'] : ['dim7', '9', 'm9', '13', '7s9', 'mmaj7', '69'];
    const c = T.getChord(rnd(ids)); const root = rootFor(level, r => ids.flatMap(id => T.chordNotes(r, id))); const right = noteNames(T.chordNotes(root, c));
    const wrong = ids.filter(id => id !== c.id).map(id => noteNames(T.chordNotes(root, id)));
    wrong.push(T.chordNotes(root, c).map(n => T.pcName(n.pc, n.a < 0 ? 'sharp' : 'flat')).join(' '));
    return { kind: 'choice', prompt: `Build <b>${esc(T.chordSymbol(root, c))}</b> (formula ${esc(c.degrees.join(' '))}).`, right, choices: choicesFrom(right, wrong), explain: `Major scale of ${esc(root.name)}: ${esc(noteNames(T.majorScale(root)))}. Degrees ${esc(c.degrees.join(' '))}, spelled with letters in order: ${esc(right)}.`, hint: 'Write the major scale of the root, pick the formula degrees, then apply ♭ and ♯.', spec: { ex: 'build' } };
  },
  ivgroups(level) {
    const group = IV_SETS[S.practice.group] ? S.practice.group : 'perfect'; const set = IV_SETS[group]; const iv = ivOf(rnd(set));
    const types = ['toName', 'toSemis'].concat(level !== 'beginner' ? ['fromRoot'] : []).concat(level === 'advanced' || group === 'tritone' ? ['spelled'] : []);
    const type = rnd(types); const spec = { ex: 'ivgroups', group }; const hint = GROUP_HINT[group];
    const near = s => uniq([s].concat(set.map(a => ivOf(a).semis), [s - 1, s + 1, s + 2, s - 2].filter(x => x >= 0 && x <= 12)));
    const explain = `${esc(iv.abbr)} (${esc(iv.name.replace(/ \(tritone\)/, ''))}) = ${iv.semis} semitones. ${esc(GROUP_HINT[group])}`;
    if (type === 'toSemis') return { kind: 'choice', prompt: `How many semitones is a <b>${esc(iv.abbr)}</b> (${esc(iv.name.replace(/ \(tritone\)/, ''))})?`, right: String(iv.semis), choices: (level === 'beginner' ? choicesFrom(iv.semis, near(iv.semis)) : range0(0, 12)).map(String), explain, hint, spec };
    const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const { top, o } = ivTop(root, iv); const audio = [T.midiOf(root, 3), T.midiOf(root, 3) + iv.semis];
    if (type === 'fromRoot') {
      const pool = set.map(a => T.degreeNote(root, ivOf(a).degree).name).concat(IV_SETS.mixed.map(a => T.degreeNote(root, ivOf(a).degree).name));
      const alt = T.pcName(top.pc, top.a > 0 || top.name.includes('♯') ? 'flat' : 'sharp'); if (alt !== top.name) pool.unshift(alt);
      return { kind: 'choice', prompt: `What note is a <b>${esc(iv.abbr)}</b> above <b>${esc(root.name)}</b>?`, audio, right: top.name, choices: choicesFrom(top.name, uniq(pool)), explain: `${esc(root.name)} + ${iv.semis} semitones, ${T.parseDegree(iv.degree).n === 8 ? 'same letter' : 'counting ' + T.parseDegree(iv.degree).n + ' letters'} = ${esc(top.name)}. ${explain}`, hint, spec };
    }
    if (type === 'spelled') return { kind: 'choice', prompt: `What interval is <b>${esc(root.name)}</b> up to <b>${esc(top.name)}</b>${octaveHint(T.parseDegree(iv.degree).n)}?`, audio, right: iv.abbr, choices: choicesFrom(iv.abbr, iv.semis === 6 ? ['A4', 'd5', 'P4', 'P5'] : set.concat(IV_SETS.mixed)), explain: `${esc(root.name)}–${esc(top.name)}: ${T.parseDegree(iv.degree).n} letters and ${iv.semis} semitones = ${esc(iv.abbr)}${o > 4 ? ' (the octave above)' : ''}.`, hint, spec };
    const right = ivLabel(iv.semis);
    return { kind: 'choice', prompt: `Which interval is <b>${iv.semis} semitone${iv.semis === 1 ? '' : 's'}</b>?`, right, choices: level === 'beginner' ? choicesFrom(right, uniq(set.map(a => ivLabel(ivOf(a).semis)).concat(SEMI_LABELS))) : SEMI_LABELS.slice(), explain, hint, spec };
  },
  direction(level) {
    const pool = level === 'beginner' ? ['M2', 'm3', 'M3', 'P4', 'P5', 'P8'] : IV_SETS.mixed.filter(a => a !== 'P1');
    const iv = ivOf(rnd(pool)); const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const { top, o } = ivTop(root, iv); const down = Math.random() < 0.5;
    const [a, ao, b, bo] = down ? [top, o, root, 4] : [root, 4, top, o]; const res = T.intervalBetween(a, ao, b, bo); const inv = T.invertInterval(iv);
    const lab = (abbr, s, d) => `${abbr} ${d ? 'down' : 'up'} (${signedSemis(d ? -s : s)})`;
    const right = lab(res.abbr, res.semis, res.descending);
    const wrong = [lab(res.abbr, res.semis, !res.descending), lab(inv.abbr, inv.semis, res.descending), lab(inv.abbr, inv.semis, !res.descending)].concat(pool.map(x => lab(x, ivOf(x).semis, res.descending)));
    return { kind: 'choice', prompt: `Name the interval and its direction: <b>${esc(a.name)}${ao} → ${esc(b.name)}${bo}</b>`, audio: [T.midiOf(a, ao), T.midiOf(b, bo)], right, choices: choicesFrom(right, uniq(wrong).filter(x => x !== right)), explain: `${esc(a.name)}${ao} ${res.descending ? 'down' : 'up'} to ${esc(b.name)}${bo}: ${T.parseDegree(iv.degree).n} letters, ${res.semis} semitones = ${esc(res.abbr)}. Direction does not change the quality. Its inversion would be ${esc(inv.abbr)} (${inv.semis}).`, hint: 'Count letters for the number and semitones for the quality. Then note whether the second note is higher or lower.', spec: { ex: 'direction' } };
  },
  ivinvert(level) {
    const pool = level === 'beginner' ? ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'm7', 'M7'] : level === 'intermediate' ? IV_SETS.mixed : IV_SETS.mixed.concat(['A2', 'A5', 'd7']);
    const iv = ivOf(rnd(pool)); const inv = T.invertInterval(iv); const hint = 'Numbers add to 9, qualities swap (M↔m, A↔d, P stays P), semitones add to 12.';
    const explain = `${esc(iv.abbr)} (${iv.semis}) ↔ ${esc(inv.abbr)} (${inv.semis}): ${T.parseDegree(iv.degree).n} + ${9 - T.parseDegree(iv.degree).n} = 9 and ${iv.semis} + ${inv.semis} = 12.`;
    const type = level === 'beginner' ? 'name' : rnd(level === 'advanced' ? ['name', 'semis', 'notes'] : ['name', 'semis']);
    if (type === 'semis') return { kind: 'choice', prompt: `<b>${esc(iv.abbr)}</b> is ${iv.semis} semitones. How many semitones is its inversion?`, right: String(inv.semis), choices: range0(0, 12).map(String), explain, hint, spec: { ex: 'ivinvert' } };
    if (type === 'notes') {
      const root = rootFor(level, r => [T.degreeNote(r, iv.degree)]); const { top, o } = ivTop(root, iv); const res = T.intervalBetween(top, o, root, 5);
      return { kind: 'choice', prompt: `<b>${esc(root.name)}4 → ${esc(top.name)}${o}</b> is ${esc(iv.abbr)}. Move ${esc(root.name)} up an octave. What is <b>${esc(top.name)}${o} → ${esc(root.name)}5</b>?`, audio: [T.midiOf(top, o), T.midiOf(root, 5)], right: res.abbr, choices: choicesFrom(res.abbr, pool.map(a => T.invertInterval(a).abbr).concat([iv.abbr])), explain, hint, spec: { ex: 'ivinvert' } };
    }
    return { kind: 'choice', prompt: `What is the inversion of <b>${esc(iv.abbr)}</b> (${esc(iv.name.replace(/ \(tritone\)/, ''))})?`, right: inv.abbr, choices: choicesFrom(inv.abbr, pool.map(a => T.invertInterval(a).abbr).concat([iv.abbr])), explain, hint, spec: { ex: 'ivinvert' } };
  },
  scalebuild(level) {
    const id = level === 'beginner' ? 'major' : rnd(['major', 'minor']);
    const root = T.parseNote(rnd(id === 'major' ? ROOTS_BY_LEVEL[level] : level === 'advanced' ? MINOR_KEYS : ['A', 'E', 'B', 'D', 'G', 'C', 'F'])); const other = id === 'major' ? 'minor' : 'major'; const notes = T.scaleNotes(root, id); const right = noteNames(notes);
    const respell = notes.map(n => T.pcName(n.pc, T.prefersFlats(root.name) ? 'sharp' : 'flat')).join(' ');
    const wrong = [noteNames(T.scaleNotes(root, other)), noteNames(T.scaleNotes(root, id === 'major' ? 'lydian' : 'harmonic')), noteNames(T.scaleNotes(root, id === 'major' ? 'mixolydian' : 'dorian')), respell].filter(x => x !== right);
    const name = id === 'major' ? 'major' : 'natural minor';
    return { kind: 'choice', prompt: `Build <b>${esc(root.name)} ${name}</b>.`, right, choices: choicesFrom(right, wrong), explain: id === 'major' ? `W W H W W W H from ${esc(root.name)}, one letter each: ${esc(right)}.` : `${esc(root.name)} major is ${esc(noteNames(T.scaleNotes(root, 'major')))}; lower 3, 6 and 7: ${esc(right)}.`, hint: id === 'major' ? 'Steps W W H W W W H; use every letter once.' : 'Natural minor = 1 2 ♭3 4 5 ♭6 ♭7: the major scale with 3, 6 and 7 lowered.', spec: { ex: 'scalebuild' } };
  },
  triad(level) {
    const Q = [['maj', 'Major', 'M3 + m3'], ['min', 'Minor', 'm3 + M3'], ['dim', 'Diminished', 'm3 + m3'], ['aug', 'Augmented', 'M3 + M3']]; const names = Q.map(q => q[1]);
    const [id, name, stack] = rnd(Q); const c = T.getChord(id); const hint = 'Major 0–4–7 (M3+m3) · minor 0–3–7 (m3+M3) · diminished 0–3–6 (m3+m3) · augmented 0–4–8 (M3+M3).';
    const types = ['stack', 'semis'].concat(level !== 'beginner' ? ['spell'] : []).concat(level === 'advanced' ? ['inv'] : []); const type = rnd(types);
    const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const notes = T.chordNotes(root, c);
    if (type === 'spell') { const right = noteNames(notes); return { kind: 'choice', prompt: `Spell <b>${esc(root.name)} ${name.toLowerCase()}</b>.`, right, choices: choicesFrom(right, Q.map(q => noteNames(T.chordNotes(root, q[0])))), explain: `${esc(T.chordSymbol(root, c))} = ${esc(c.degrees.join(' '))} = ${esc(right)}.`, hint, spec: { ex: 'triad' } }; }
    if (type === 'inv') { const k = Math.floor(Math.random() * 3); const lab = ['Root position', '1st inversion', '2nd inversion']; const order = T.inversionOrder(notes, k); return { kind: 'choice', prompt: `<b>${esc(noteNames(order))}</b> (low to high) is ${esc(T.chordSymbol(root, c))} in which position?`, audio: (() => { let prev = -1; return order.map(n => { let m = T.midiOf(n, 3); while (m <= prev) m += 12; prev = m; return m; }); })(), chordAudio: true, right: lab[k], choices: lab.slice(), explain: `The bass note ${esc(order[0].name)} is the ${['root', '3rd', '5th'][k]}.`, hint: 'Find the bass (lowest) note and ask which chord tone it is: root, 3rd or 5th.', spec: { ex: 'triad' } }; }
    if (type === 'semis') return { kind: 'choice', prompt: `Which triad has semitones <b>${c.degrees.map(T.degreeSemis).join('–')}</b> from the root?`, right: name, choices: names.slice(), explain: `${name}: ${esc(c.degrees.join('–'))} = ${c.degrees.map(T.degreeSemis).join('–')}, for example ${esc(noteNames(notes))}.`, hint, spec: { ex: 'triad' } };
    return { kind: 'choice', prompt: `Which triad is <b>${stack}</b> stacked from the root?`, right: name, choices: names.slice(), explain: `${stack} = ${name.toLowerCase()} (${c.degrees.map(T.degreeSemis).join('–')}).`, hint, spec: { ex: 'triad' } };
  },
  family(level) {
    const minor = level === 'advanced' && Math.random() < 0.5; const key = T.parseNote(rnd(minor ? MINOR_KEYS.slice(0, 12) : ROOTS_BY_LEVEL[level]));
    const dia = T.diatonicChords(key, minor ? 'minor' : 'major'); const i = Math.floor(Math.random() * 7); const d = dia[i]; const rn = romanFor(i, d.triad.quality);
    const keyName = `${esc(key.name)} ${minor ? 'minor' : 'major'}`; const all = dia.map((x, j) => `${romanFor(j, x.triad.quality)} ${x.triad.symbol}`).join(' · ');
    const hint = minor ? 'Natural minor: i ii° III iv v VI VII.' : 'Major key: I ii iii IV V vi vii° (1, 4, 5 major · 2, 3, 6 minor · 7 diminished).';
    const type = level === 'beginner' ? rnd(['chord', 'roman']) : rnd(['chord', 'roman', 'quality']);
    if (type === 'quality') { const right = d.triad.quality; return { kind: 'choice', prompt: `In any ${minor ? 'natural minor' : 'major'} key, what quality is the chord on degree <b>${i + 1}</b>?`, right, choices: ['Major', 'Minor', 'Diminished'], explain: `Degree ${i + 1} = ${esc(rn)}, a ${esc(right.toLowerCase())} chord (${esc(right)}). ${esc(hint)}`, hint, spec: { ex: 'family' } }; }
    if (type === 'roman') return { kind: 'choice', prompt: `In <b>${keyName}</b>, which numeral is <b>${esc(d.triad.symbol)}</b>?`, right: rn, choices: dia.map((x, j) => romanFor(j, x.triad.quality)), explain: `${keyName}: ${esc(all)}.`, hint, spec: { ex: 'family' } };
    return { kind: 'choice', prompt: `In <b>${keyName}</b>, what is the <b>${esc(rn)}</b> chord?`, right: d.triad.symbol, choices: choicesFrom(d.triad.symbol, dia.map(x => x.triad.symbol).concat([T.chordSymbol(d.root, d.triad.quality === 'Major' ? 'min' : 'maj')])), explain: `${keyName}: ${esc(all)}.`, hint, spec: { ex: 'family' } };
  },
  fbinterval(level) {
    const tun = T.TUNINGS[0]; const lim = level === 'beginner' ? 7 : 12;
    const pool = level === 'beginner' ? ['m3', 'M3', 'P4', 'P5', 'P8'] : IV_SETS.mixed.filter(a => a !== 'P1' && a !== 'd5');
    let down = level === 'advanced' && Math.random() < 0.5; let tries = 0, s, f, s2, f2, iv;
    do {
      iv = ivOf(rnd(pool)); s = Math.floor(Math.random() * 6); f = 1 + Math.floor(Math.random() * lim);
      const opts = [0, 1, 2].map(k => down ? s - k : s + k).filter(x => x >= 0 && x < 6).map(x => ({ s2: x, f2: f + (down ? -iv.semis : iv.semis) - (tun.midi[x] - tun.midi[s]) })).filter(x => x.f2 >= 0 && x.f2 <= lim + 3 && !(x.s2 === s && x.f2 === f));
      if (opts.length) ({ s2, f2 } = rnd(opts));
    } while (s2 == null && ++tries < 50);
    if (s2 == null) { s2 = s; f2 = f + iv.semis; down = false; }
    const m = {}; m[s + ':' + f] = { cls: 'root', label: 'R' }; m[s2 + ':' + f2] = { cls: 'blue', label: '?', ring: true };
    const right = ivLabel(iv.semis); const crossGB = Math.min(s, s2) <= 3 && Math.max(s, s2) >= 4;
    return { kind: 'choice', prompt: `The red dot is the root. What interval is the <b>?</b> note ${down ? '<b>below</b>' : 'above'} it?`, fb: { min: Math.max(0, Math.min(f, f2) - 1), max: Math.max(f, f2) + 1, markers: m }, audio: [tun.midi[s] + f, tun.midi[s2] + f2], right, choices: SEMI_LABELS.slice(1), explain: `String ${6 - s} fret ${f} → string ${6 - s2} fret ${f2}: ${iv.semis} semitones ${down ? 'down' : 'up'} = ${esc(right)}.${crossGB && s !== s2 ? ' This shape crosses the G–B pair, which is 4 semitones apart instead of 5.' : ''}`, hint: 'Same string: count frets. Each string up adds 5 semitones (4 from G to B).', spec: { ex: 'fbinterval' } };
  },
  relative(level) {
    const toMinor = Math.random() < 0.5; const k = rnd(ROOTS_BY_LEVEL[level]);
    const notTwin = (right, suffix) => x => x === right || T.parseNote(x.replace(suffix, '')).pc !== T.parseNote(right.replace(suffix, '')).pc;
    if (toMinor) { const right = T.relativeMinor(k).name + ' minor'; return { kind: 'choice', prompt: `What is the relative minor of <b>${esc(k)} major</b>?`, right, choices: choicesFrom(right, T.MAJOR_KEYS.map(x => T.relativeMinor(x).name + ' minor').concat([k + ' minor']).filter(notTwin(right, ' minor'))), explain: 'Relative minor = 6th degree of the major scale (same key signature).', spec: { ex: 'relative' } }; }
    const m = T.relativeMinor(k); const right = k + ' major';
    return { kind: 'choice', prompt: `What is the relative major of <b>${esc(m.name)} minor</b>?`, right, choices: choicesFrom(right, T.MAJOR_KEYS.map(x => x + ' major').concat([m.name + ' major']).filter(notTwin(right, ' major'))), explain: 'Relative major = ♭3 of the minor key (3 frets up).', spec: { ex: 'relative' } };
  }
};
function newQuestion() {
  const pr = progress(); const ex = S.practice.ex; const level = S.practice.level;
  const missed = pr.missed.filter(m => m.ex === ex && m.level === level && (ex !== 'ivgroups' || (m.q.spec && m.q.spec.group) === S.practice.group));
  let q;
  if (missed.length && Math.random() < 0.4) { const m = missed[0]; q = m.q; q.retry = true; pr.missed = pr.missed.filter(x => x !== m); saveProgress(pr); }
  else { q = GEN[ex](level); q.v = QV; }
  P = { q, picked: null, sel: [], result: null, hint: false };
}
Views.practice = () => {
  if (!EXERCISES.some(e => e[0] === S.practice.ex)) S.practice.ex = 'note';
  if (!LEVELS.includes(S.practice.level)) S.practice.level = 'beginner';
  if (!IV_SETS[S.practice.group]) S.practice.group = 'perfect';
  if (!P.q || P.q.spec.ex !== S.practice.ex || P.level !== S.practice.level || (S.practice.ex === 'ivgroups' && P.q.spec.group !== S.practice.group)) { newQuestion(); P.level = S.practice.level; }
  const pr = progress(); const st = pr.stats[statKey()] || { right: 0, total: 0 };
  const allR = Object.values(pr.stats).reduce((a, s) => a + s.right, 0), allT = Object.values(pr.stats).reduce((a, s) => a + s.total, 0);
  const q = P.q;
  actions.fbnoteHook = (el, { midi, s, f }) => {
    if (S.view !== 'practice' || !(q.kind === 'tap' || q.kind === 'multi') || P.result) return false;
    Audio.pluck(midi);
    if (q.kind === 'tap') { P.picked = { s, f, midi }; finish(T.mod(midi) === q.pc && f <= q.lim); }
    else { const k = s + ':' + f; P.sel = P.sel.includes(k) ? P.sel.filter(x => x !== k) : P.sel.concat([k]); render(); }
    return true;
  };
  onCleanup(() => { actions.fbnoteHook = null; });
  let body = `<p class="prompt">${q.retry ? '<span class="tag">Review</span> ' : ''}${q.prompt}</p>`;
  if (q.audio) body += `<button class="btn ghost" type="button" data-act="qplay">Hear it</button>`;
  if (q.hint && !P.result) body += P.hint ? `<p class="hint" role="status"><b>Hint:</b> ${esc(q.hint)}</p>` : ` <button class="btn ghost" type="button" data-act="qhint">Show hint</button>`;
  if (q.fb) body += `<div class="fb-wrap"><div class="fb-scroll">${Render.fretboard({ tuning: T.TUNINGS[0], min: q.fb.min, max: q.fb.max, markers: q.fb.markers, label: 'Fretboard question (standard tuning)' })}</div></div>`;
  if (q.pos) {
    const sc = T.getScale(q.scId); const m = {}; q.pos.notes.forEach(n => { m[n.s + ':' + n.f] = { cls: n.degree === '1' ? 'root' : 'tone', label: n.degree }; });
    body += `<div class="fb-wrap"><div class="fb-scroll">${Render.fretboard({ tuning: T.TUNINGS[0], min: Math.max(0, q.pos.range[0] - 1), max: q.pos.range[1] + 1, markers: m, label: 'Scale position to identify' })}</div></div>`;
  }
  if (q.kind === 'choice') body += `<div class="choices">${q.choices.map(c => `<button type="button" class="choice${P.result ? (c === q.right ? ' is-right' : c === P.picked ? ' is-wrong' : '') : ''}" data-act="qpick" data-c="${esc(c)}" ${P.result ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>`;
  if (q.kind === 'tap' || q.kind === 'multi') {
    const tun = T.TUNINGS[0]; const m = {};
    if (q.kind === 'multi') P.sel.forEach(k => { const [s, f] = k.split(':').map(Number); m[k] = { cls: P.result ? (T.mod(tun.midi[s] + f) === q.pc ? 'root' : 'wrong') : 'tone', label: '?' }; });
    if (P.result) { T.fretboardNotes(tun).filter(c => c.f <= q.lim && c.pc === q.pc).forEach(c => { const k = c.s + ':' + c.f; m[k] = { cls: 'root', label: q.answerText, ring: q.kind === 'tap' && P.picked && P.picked.s === c.s && P.picked.f === c.f }; }); if (q.kind === 'tap' && P.picked && !(T.mod(P.picked.midi) === q.pc)) m[P.picked.s + ':' + P.picked.f] = { cls: 'wrong', label: T.pcName(P.picked.midi) }; }
    body += `<p class="muted">Standard tuning, frets 0–${q.lim}.</p><div class="fb-wrap"><div class="fb-scroll">${Render.fretboard({ tuning: tun, min: 0, max: q.lim, markers: m, clickable: !P.result, label: 'Tap the fretboard to answer' })}</div></div>`;
    if (q.kind === 'multi' && !P.result) body += `<button class="btn primary" type="button" data-act="qcheck">Check (${P.sel.length} selected)</button>`;
  }
  if (P.result) body += `<div class="feedback ${P.result === 'right' ? 'ok' : 'bad'}" role="status"><b>${P.result === 'right' ? 'Correct.' : 'Not quite.'}</b> ${q.kind === 'choice' && P.result !== 'right' ? `Answer: <b>${esc(q.right)}</b>. ` : ''}${q.whyWrong && P.result !== 'right' && q.whyWrong[P.picked] ? `<span class="why">Your answer: ${q.whyWrong[P.picked]}</span> ` : ''}${q.explain || ''}${P.result !== 'right' ? ' This one will come back for review.' : ''}</div><button class="btn primary" type="button" data-act="qnext">Next question</button>`;
  return card('Practice', `<div class="row"><label>Exercise <select data-ch="pex">${opt(EXERCISES.map(([v, l]) => ({ v, l })), S.practice.ex)}</select></label>
      ${S.practice.ex === 'ivgroups' ? `<label>Group <select data-ch="pgroup">${opt(GROUPS.map(([v, l]) => ({ v, l })), S.practice.group)}</select></label>` : ''}
      <label>Level <select data-ch="plevel">${opt(LEVELS.map(l => ({ v: l, l: l[0].toUpperCase() + l.slice(1) })), S.practice.level)}</select></label></div>
    <p class="score">This exercise: <b>${st.right}/${st.total}</b>${st.total ? ` (${Math.round(st.right / st.total * 100)}%)` : ''} · All exercises: ${allR}/${allT} · Waiting for review: ${pr.missed.length}</p>
    <div class="question">${body}</div>
    <p><button class="btn ghost small" type="button" data-act="preset">Reset progress</button> <span class="muted">${Store.available ? 'Progress is saved in this browser.' : 'This browser blocks storage, so progress lasts only until you close the page.'}</span></p>`);
};
function finish(correct) {
  P.result = correct ? 'right' : 'wrong';
  const pr = progress(); const key = statKey(); const st = pr.stats[key] || { right: 0, total: 0 };
  st.total++; if (correct) st.right++; pr.stats[key] = st;
  if (!correct && P.q.kind === 'choice' && pr.missed.length < 30) pr.missed.push({ ex: S.practice.ex, level: S.practice.level, q: Object.assign({}, P.q, { retry: false }) });
  if (!correct && P.q.kind !== 'choice' && pr.missed.length < 30) pr.missed.push({ ex: S.practice.ex, level: S.practice.level, q: Object.assign({}, P.q, { retry: false }) });
  saveProgress(pr); render();
}
actions.qpick = el => { if (P.result) return; P.picked = el.dataset.c; finish(P.picked === P.q.right); };
actions.qcheck = () => { if (P.result) return; const tun = T.TUNINGS[0]; const want = T.fretboardNotes(tun).filter(c => c.f <= P.q.lim && c.pc === P.q.pc).map(c => c.s + ':' + c.f); finish(want.length === P.sel.length && want.every(k => P.sel.includes(k))); };
actions.qnext = () => { newQuestion(); P.level = S.practice.level; render(); };
actions.qplay = () => { const q = P.q; if (!q.audio) return; const c = Audio.ensure(); if (!c) return; if (q.chordAudio) Audio.strum(q.audio, c.currentTime + 0.03, { spread: 0.05 }); else { Audio.pluck(q.audio[0], c.currentTime + 0.03); Audio.pluck(q.audio[1], c.currentTime + 0.6); } };
actions.pex = el => { S.practice.ex = el.value; P.q = null; render(); };
actions.pgroup = el => { S.practice.group = el.value; P.q = null; render(); };
actions.qhint = () => { P.hint = true; render(); };
actions.plevel = el => { S.practice.level = el.value; P.q = null; render(); };
actions.preset = () => { if (window.confirm('Reset all practice scores and the review list?')) { Store.del('gte.practice'); P.q = null; render(); } };
