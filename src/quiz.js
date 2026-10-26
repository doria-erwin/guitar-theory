/* Tab quizzes: a short practice card at the top of each tab, built from that tab's current selections (root, scale, chord…).
   Each generator returns { prompt, choices: [{v, l}], right, explain, fb?, box?, play? }; the answer is hidden until the learner picks. */
const TQ = { q: null, ctx: null, view: null, picked: null };
const qScores = () => { const d = Store.get('gte.tabquiz', {}); return d && typeof d === 'object' ? d : {}; };
/* Pitch questions (any spelling is right): twelve buttons, each labelled with both spellings so no label implies a wrong letter. */
const twelve = (pref = 'both') => range0(0, 11).map(pc => ({ v: String(pc), l: T.pcName(pc, pref) }));
/* Spelling questions (the letter matters): the right note, its enharmonic twins and same-letter neighbours. Graded by name. */
function spelled(note, n = 6) {
  const pool = [T.spellWithLetter(note.l + 1, note.pc), T.spellWithLetter(note.l + 6, note.pc)].filter(x => Math.abs(x.a) <= 2).map(x => x.name)
    .concat([-1, 1].filter(d => Math.abs(note.a + d) <= 2).map(d => T.makeNote(note.l, note.a + d).name), [T.makeNote((note.l + 1) % 7, 0).name, T.makeNote((note.l + 6) % 7, 0).name]);
  return asChoices(uniq(pool).filter(x => x !== note.name), n, note.name);
}
const spellNote = n => ` The letter is ${esc(T.LETTERS[n.l])}, so it is written ${esc(n.name)}.`;
const asChoices = (list, n = 4, right) => (n ? choicesFrom(right, list.filter(x => x !== right), n) : list).map(x => ({ v: x, l: x }));
const uniq = a => [...new Set(a)];
const pickN = (right, pool, n = 4) => asChoices(uniq(pool), n, right);
/* Markers for a quiz fretboard: one '?' dot, optional plain dots, root dots unlabelled. */
function quizDots(target, others = [], roots = []) {
  const m = {}; others.forEach(k => { m[k] = { cls: 'tone', label: '' }; }); roots.forEach(k => { m[k] = { cls: 'root', label: '' }; });
  m[target] = { cls: 'blue', label: '?', ring: true }; return m;
}

const QUIZ = {
  fretboard: {
    title: 'Name the note', modes: [['note', 'Note name'], ['degree', 'Interval from root']],
    ctx: () => [S.root, S.tuning, S.custom.join(), S.fbMin, S.fbMax].join('|'),
    make(mode) {
      const tun = tuning(), r = rootNote(); const s = Math.floor(Math.random() * 6), f = S.fbMin + Math.floor(Math.random() * (S.fbMax - S.fbMin + 1));
      const midi = tun.midi[s] + f, pc = T.mod(midi), semi = T.mod(pc - r.pc);
      const fb = { min: S.fbMin, max: S.fbMax, markers: quizDots(s + ':' + f) };
      const where = `string ${6 - s} (${esc(tun.names[s])}), fret ${f}`;
      if (mode === 'degree') {
        const ivs = T.INTERVALS.filter(x => x.semis < 12 && !['A2', 'A5', 'd7', 'A4'].includes(x.abbr)); const iv = ivs.find(x => x.semis === semi);
        return { prompt: `The marked note is on ${where}. What interval is it above <b>${esc(S.root)}</b>?`, fb, play: [midi], right: iv.abbr, choices: ivs.map(x => ({ v: x.abbr, l: x.abbr })), explain: `It is ${esc(T.pcName(pc, flatPref()))}, ${semi} semitones above ${esc(S.root)}: ${esc(iv.name)}.` };
      }
      return { prompt: `What note is on ${where}?`, fb, play: [midi], right: String(pc), choices: twelve(), explain: `Open ${esc(tun.names[s])} + ${f} fret${f === 1 ? '' : 's'} = ${esc(T.pcName(pc, 'both'))}.` };
    }
  },
  scales: {
    title: 'Scale degrees', modes: [['note', 'Degree → note'], ['degree', 'Note → degree'], ['in', 'In or out?']],
    ctx: () => S.root + '|' + S.scale,
    make(mode) {
      const r = rootNote(), sc = T.getScale(S.scale), notes = T.scaleNotes(r, sc); const i = 1 + Math.floor(Math.random() * (notes.length - 1));
      const name = `${esc(S.root)} ${esc(sc.name)}`, explain = `${name}: ${esc(noteNames(notes))} (${esc(sc.degrees.join(' '))}).`;
      if (mode === 'degree') return { prompt: `In <b>${name}</b>, which degree is <b>${esc(notes[i].name)}</b>?`, play: [nearMidi(r.pc, 52), nearMidi(r.pc, 52) + T.mod(T.degreeSemis(sc.degrees[i]))], right: sc.degrees[i], choices: asChoices(sc.degrees.slice(1), 0), explain };
      if (mode === 'in') {
        const inPcs = notes.map(n => n.pc); const pc = Math.random() < 0.5 ? rnd(inPcs.slice(1)) : rnd(range0(0, 11).filter(p => !inPcs.includes(p)));
        const nm = (notes.find(n => n.pc === pc) || { name: T.pcName(pc, flatPref()) }).name; const yes = inPcs.includes(pc);
        return { prompt: `Is <b>${esc(nm)}</b> in <b>${name}</b>?`, right: yes ? 'yes' : 'no', choices: [{ v: 'yes', l: 'Yes, it is in the scale' }, { v: 'no', l: 'No, it is outside' }], explain };
      }
      return { prompt: `In <b>${name}</b>, what note is degree <b>${esc(sc.degrees[i])}</b>?`, right: notes[i].name, choices: spelled(notes[i]), explain: explain + spellNote(notes[i]) };
    }
  },
  intervals: {
    title: 'Count the semitones', modes: [['semis', 'Semitones → note'], ['name', 'Interval → note'], ['count', 'Note → semitones']],
    ctx: () => S.root,
    make(mode) {
      const r = rootNote(); const iv = rnd(T.INTERVALS.filter(x => x.semis > 0 && x.semis <= 12 && (mode !== 'semis' || !['A2', 'A5', 'd7', 'A4'].includes(x.abbr))));
      const top = T.degreeNote(r, iv.degree), base = nearMidi(r.pc, 48), play = [base, base + iv.semis];
      const explain = `${iv.semis} semitone${iv.semis === 1 ? '' : 's'} = ${esc(iv.name)} (${esc(iv.abbr)}): <b>${esc(S.root)} → ${esc(top.name)}</b>.`;
      if (mode === 'name') return { prompt: `What note is ${/^[AEIOU]/.test(iv.name) ? 'an' : 'a'} <b>${esc(iv.name.replace(/ \(.*\)/, ''))}</b> above <b>${esc(S.root)}</b>?`, play, right: top.name, choices: spelled(top), explain: explain + spellNote(top) };
      if (mode === 'count') return { prompt: `How many semitones from <b>${esc(S.root)}</b> up to <b>${esc(top.name)}</b>${iv.semis === 12 ? ' (one octave higher)' : ''}?`, play, right: String(iv.semis), choices: range0(1, 12).map(n => ({ v: String(n), l: String(n) })), explain };
      return { prompt: `Start on <b>${esc(S.root)}</b> and go up <b>${iv.semis} semitone${iv.semis === 1 ? '' : 's'}</b>. Which note do you land on?`, play, right: String(top.pc), choices: twelve(), explain };
    }
  },
  builder: {
    title: 'Chord tones', modes: [['tone', 'Degree → note'], ['semis', 'Degree → semitones'], ['spell', 'Spell the chord']],
    ctx: () => S.root + '|' + S.chord,
    make(mode) {
      const r = rootNote(), c = T.getChord(S.chord), notes = T.chordNotes(r, c), sym = T.chordSymbol(r, c); const k = 1 + Math.floor(Math.random() * (notes.length - 1)); const d = c.degrees[k];
      const explain = `${esc(sym)} = ${esc(noteNames(notes))} (${esc(c.degrees.join(' '))}).`;
      if (mode === 'semis') return { prompt: `How many semitones above the root is the <b>${esc(d)}</b>?`, right: String(T.degreeSemis(d)), choices: uniq(c.degrees.slice(1).map(T.degreeSemis).concat(range0(1, 11))).filter(n => !(T.degreeSemis(d) > 12 && n === T.degreeSemis(d) - 12)).slice(0, 8).sort((a, b) => a - b).map(n => ({ v: String(n), l: String(n) })), explain: `${esc(d)} = ${T.degreeSemis(d)} semitones${T.degreeSemis(d) > 12 ? ` (an octave + ${T.degreeSemis(d) - 12}: extensions are counted above the octave)` : ''}. ${explain}` };
      if (mode === 'spell') {
        const right = noteNames(notes); const sameSize = T.CHORDS.filter(x => x.id !== c.id && x.degrees.length === c.degrees.length); const wrong = (sameSize.length >= 3 ? sameSize : T.CHORDS.filter(x => x.id !== c.id && Math.abs(x.degrees.length - c.degrees.length) <= 1)).map(x => noteNames(T.chordNotes(r, x)));
        return { prompt: `Spell <b>${esc(sym)}</b> (formula ${esc(c.degrees.join(' '))}).`, right, choices: pickN(right, wrong.filter(w => w !== right)), explain };
      }
      return { prompt: `What is the <b>${esc(d)}</b> of <b>${esc(sym)}</b>?`, right: notes[k].name, choices: spelled(notes[k]), explain: explain + spellNote(notes[k]) };
    }
  },
  finder: {
    title: 'Name the chord', modes: [['name', 'Notes → name']],
    ctx: () => S.root,
    make() {
      const ids = ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', '7', 'maj7', 'm7', 'm7b5', 'dim7', '6', 'm6'];
      const c = T.getChord(rnd(ids)), root = T.parseNote(rnd(ROOTS_BY_LEVEL.intermediate)), notes = T.chordNotes(root, c), right = T.chordSymbol(root, c);
      const shown = shuffle(notes);
      return { prompt: `These notes are in no particular order: <b>${esc(noteNames(shown))}</b>. Name the chord.`, play: notes.map((n, i) => T.midiOf(n, 3) + (i && n.pc <= notes[0].pc ? 12 : 0)), chord: true, right, choices: pickN(right, ids.filter(i => i !== c.id).map(i => T.chordSymbol(root, i))), explain: `Stacked in 3rds from ${esc(root.name)}: ${esc(noteNames(notes))} = ${esc(c.degrees.join(' '))}.` };
    }
  },
  shapes: {
    title: 'Read the chord box', modes: [['root', 'Shapes in this key'], ['open', 'Open chords']],
    ctx: () => [S.root, S.tuning, S.custom.join()].join('|'),
    make(mode) {
      if (mode === 'open') {
        const o = rnd(T.OPEN); const v = T.chordVoicings(o.openRoot, o.chord, T.TUNINGS[0]).find(x => x.kind === 'open'); const right = T.chordSymbol(o.openRoot, o.chord);
        if (!v) return null;
        return { prompt: 'Which open chord is this (standard tuning)?', box: v, play: v.midi, chord: true, right, choices: pickN(right, T.OPEN.map(x => T.chordSymbol(x.openRoot, x.chord))), explain: `${esc(o.name)}: ${esc(v.frets.map(f => f == null ? 'x' : f).join(' '))}.` };
      }
      const r = rootNote(), ids = ['maj', 'min', '7', 'maj7', 'm7', 'pow', 'sus4', 'm7b5'].filter(id => T.chordVoicings(r, id, tuning()).length);
      const id = rnd(ids), v = rnd(T.chordVoicings(r, id, tuning())), right = T.chordSymbol(r, id);
      return { prompt: `This shape has its root on <b>${esc(S.root)}</b> (red dots). Which chord is it?`, box: v, play: v.midi, chord: true, right, choices: pickN(right, ids.map(i => T.chordSymbol(r, i))), explain: `${esc(right)} = ${esc(noteNames(T.chordNotes(r, id)))}, ${esc(v.name)}.` };
    }
  },
  inversions: {
    title: 'Spot the inversion', modes: [['which', 'Notes → inversion'], ['bass', 'Inversion → bass note']],
    ctx: () => S.root + '|' + S.invChord,
    make(mode) {
      const r = rootNote(), c = T.getChord(S.invChord), notes = T.chordNotes(r, c), sym = T.chordSymbol(r, c); const n = Math.min(4, notes.length);
      const names = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'].slice(0, n); const i = Math.floor(Math.random() * n); const order = T.inversionOrder(notes, i);
      const explain = `${esc(names[i])} puts the ${esc(T.inversionOrder(c.degrees, i)[0])} (${esc(order[0].name)}) in the bass: ${esc(sym)}${i ? '/' + esc(order[0].name) : ''}.`;
      if (mode === 'bass') return { prompt: `What is the bass note of <b>${esc(sym)}</b> in <b>${esc(names[i].toLowerCase())}</b>?`, right: order[0].name, choices: spelled(order[0]), explain };
      return { prompt: `<b>${esc(sym)}</b> voiced low to high as <b>${esc(noteNames(order))}</b>. Which inversion is it?`, right: names[i], choices: asChoices(names, 0), explain };
    }
  },
  arpeggios: {
    title: 'Which chord tone?', modes: [['tone', 'Marked dot → degree']],
    ctx: () => [S.root, S.arp, S.tuning, S.custom.join()].join('|'),
    make() {
      const r = rootNote(), c = T.getChord(S.arp), ps = T.arpeggioPositions(r, c.id, tuning()); if (!ps.length) return null;
      const p = rnd(ps); const cand = p.notes.filter(x => x.degree !== '1'); const t = rnd(cand); const fs = p.notes.map(x => x.f);
      const fb = { min: Math.max(0, Math.min(...fs) - 1), max: Math.min(24, Math.max(...fs) + 1), markers: quizDots(t.s + ':' + t.f, cand.map(x => x.s + ':' + x.f), p.notes.filter(x => x.degree === '1').map(x => x.s + ':' + x.f)) };
      return { prompt: `${esc(T.chordSymbol(r, c))} arpeggio, ${esc(p.label)}. Red dots are the root. Which chord tone is marked “?”`, fb, play: [t.midi], right: t.degree, choices: asChoices(c.degrees.slice(1), 0), explain: `That note is ${esc(T.chordNotes(r, c)[c.degrees.indexOf(t.degree)].name)}, the ${esc(t.degree)} of ${esc(T.chordSymbol(r, c))}.` };
    }
  },
  keys: {
    title: 'Keys and diatonic chords', modes: [['roman', 'Numeral → chord'], ['which', 'Chord → numeral'], ['sig', 'Key signatures']],
    ctx: () => S.root,
    make(mode) {
      if (mode === 'sig') {
        const k = rnd(T.MAJOR_KEYS); const sig = T.keySignature(k); const lab = s => s.count === 0 ? 'None' : Math.abs(s.count) + (s.count > 0 ? '♯' : '♭');
        return { prompt: `How many sharps or flats in <b>${esc(k)} major</b>?`, right: lab(sig), choices: pickN(lab(sig), T.MAJOR_KEYS.map(x => lab(T.keySignature(x)))), explain: `${esc(k)} major: ${esc(sig.text)}${sig.accidentals.length ? ' (' + esc(sig.accidentals.join(' ')) + ')' : ''}. Relative minor: ${esc(T.relativeMinor(k).name)} minor.` };
      }
      const k = T.MAJOR_KEYS.includes(S.root) ? T.parseNote(S.root) : T.parseNote(COF_KEYS.find(x => T.parseNote(x.key).pc === rootNote().pc).key);
      const dia = T.diatonicChords(k); const d = rnd(dia); const explain = `${esc(k.name)} major: ${dia.map(x => esc(x.roman) + ' ' + esc(x.triad.symbol)).join(' · ')}.`;
      if (mode === 'which') return { prompt: `In <b>${esc(k.name)} major</b>, which numeral is <b>${esc(d.triad.symbol)}</b>?`, right: d.roman, choices: asChoices(dia.map(x => x.roman), 0), explain };
      return { prompt: `In <b>${esc(k.name)} major</b>, what is the <b>${esc(d.roman)}</b> chord?`, right: d.triad.symbol, choices: asChoices(dia.map(x => x.triad.symbol), 0), explain };
    }
  },
  progressions: {
    title: 'Fill the gap', modes: [['gap', 'Missing chord']],
    ctx: () => S.root + '|' + S.prog,
    make() {
      const p = T.PROGRESSIONS.find(x => x.id === S.prog) || T.PROGRESSIONS[0]; const ch = T.progressionChords(rootNote(), p); const i = Math.floor(Math.random() * ch.length);
      const pool = T.PROGRESSIONS.flatMap(x => T.progressionChords(rootNote(), x).map(c => c.symbol));
      return { prompt: `${esc(p.name)} in ${esc(S.root)} ${p.mode}: ${ch.map((c, j) => j === i ? `<span class="blank">${esc(c.roman)}?</span>` : esc(c.symbol)).join(' – ')}`, right: ch[i].symbol, choices: pickN(ch[i].symbol, pool), explain: `${esc(ch.map(c => c.roman).join(' – '))} = ${esc(ch.map(c => c.symbol).join(' – '))}.` };
    }
  },
  rhythm: {
    title: 'Note values', modes: [['beats', 'Note → beats'], ['name', 'Symbol → name']],
    ctx: () => '',
    make(mode) {
      const nv = rnd(NOTE_VALUES), rest = mode === 'name' && nv[3] && Math.random() < 0.4; const beatLab = b => String(b).replace('0.25', '¼').replace('0.75', '¾').replace('0.5', '½').replace('1.5', '1½');
      if (mode === 'name') { const right = nv[1] + (rest ? ' rest' : ' note'); return { prompt: `<span class="pat-notes big">${Render.noteGlyph(rest ? nv[3] : nv[0])}</span> What is this?`, right, choices: pickN(right, NOTE_VALUES.map(x => x[1] + ' note').concat(NOTE_VALUES.filter(x => x[3]).map(x => x[1] + ' rest'))), explain: `${esc(right)}: ${beatLab(nv[2])} beat${nv[2] === 1 ? '' : 's'} in 4/4.` }; }
      return { prompt: `<span class="pat-notes big">${Render.noteGlyph(nv[0])}</span> How many beats does a <b>${esc(nv[1].toLowerCase())}</b> note last in 4/4?`, right: beatLab(nv[2]), choices: NOTE_VALUES.map(x => x[2]).sort((a, b) => a - b).map(b => ({ v: beatLab(b), l: beatLab(b) })), explain: nv[0].startsWith('dotted') ? 'A dot adds half the value.' : 'Each smaller value is half the one before.' };
    }
  },
  techniques: {
    title: 'Name the technique', modes: [['sym', 'Symbol → technique'], ['ear', 'By ear']],
    ctx: () => '',
    make(mode) {
      const list = TECHNIQUES.filter(t => mode === 'ear' ? t.demo : t.sym !== '—'); const t = rnd(list);
      const choices = pickN(t.name, list.map(x => x.name));
      if (mode === 'ear') return { prompt: 'Press <b>Hear it</b>. Which technique is this approximation of?', play: t.demo, right: t.name, choices, explain: esc(t.how) };
      return { prompt: `In tab, what does <b class="mono">${esc(t.sym)}</b> mean?${t.tab ? `<pre class="tab">${esc(t.tab)}</pre>` : ''}`, right: t.name, choices, explain: esc(t.how) };
    }
  },
  harmony: {
    title: 'Harmony in this key', modes: [['sec', 'Secondary dominants'], ['borrow', 'Borrowed chords'], ['tri', 'Tritone subs']],
    ctx: () => S.root,
    make(mode) {
      const r = rootNote();
      if (mode === 'borrow') { const b = T.borrowedChords(r); const x = rnd(b); return { prompt: `In <b>${esc(S.root)} major</b>, which chord is <b>${esc(x.roman)}</b> borrowed from ${esc(S.root)} minor?`, right: x.symbol, choices: pickN(x.symbol, b.map(y => y.symbol).concat(T.diatonicChords(r).map(y => y.triad.symbol))), explain: `${esc(x.roman)} = ${esc(x.symbol)} (${esc(noteNames(x.notes))}).` }; }
      if (mode === 'tri') { const d = T.parseNote(rnd(ROOTS_BY_LEVEL.intermediate)); const s = T.tritoneSub(d); return { prompt: `What is the tritone substitute for <b>${esc(d.name)}7</b>? (Its root note.)`, right: s.root.name, choices: spelled(s.root), explain: `${esc(s.symbol)}: a tritone (6 semitones) from ${esc(d.name)}, sharing the 3rd and ♭7.` }; }
      const sd = T.secondaryDominants(r); const x = rnd(sd);
      return { prompt: `In <b>${esc(S.root)} major</b>, what is <b>${esc(x.label)}</b> (the dominant that leads to ${esc(x.target)})?`, right: x.symbol, choices: pickN(x.symbol, sd.map(y => y.symbol).concat(T.diatonicChords(r).map(y => y.root.name + '7'))), explain: `${esc(x.symbol)} is a 5th above ${esc(x.target)}: ${esc(noteNames(x.notes))}.` };
    }
  },
  basics: {
    title: 'Fretboard basics', modes: [['enh', 'Enharmonics'], ['open', 'Open strings'], ['fret', 'Frets 0–12']],
    ctx: () => '',
    make(mode) {
      const std = T.TUNINGS[0];
      if (mode === 'open') { const s = Math.floor(Math.random() * 6); return { prompt: `Standard tuning: what note is open string <b>${6 - s}</b>?`, play: [std.midi[s]], right: String(T.mod(std.midi[s])), choices: twelve('sharp'), explain: 'From string 6 to 1: E A D G B E.' }; }
      if (mode === 'fret') { const s = Math.floor(Math.random() * 6), f = Math.floor(Math.random() * 13), midi = std.midi[s] + f; return { prompt: `Standard tuning: what note is on string <b>${6 - s}</b>, fret <b>${f}</b>?`, fb: { min: 0, max: 12, tuning: std, markers: quizDots(s + ':' + f) }, play: [midi], right: String(T.mod(midi)), choices: twelve('sharp'), explain: `Open ${esc(std.names[s])} + ${f} = ${esc(T.pcName(midi, 'both'))}.` }; }
      const pc = rnd([1, 3, 6, 8, 10, 0, 4, 5, 11]); const nm = rnd([T.pcName(pc, 'sharp'), T.pcName(pc, 'flat')]);
      const right = { 'E♯': 'F', 'B♯': 'C', 'C♭': 'B', 'F♭': 'E' }[nm] || (nm.includes('♯') ? T.pcName(pc, 'flat') : nm.includes('♭') ? T.pcName(pc, 'sharp') : { C: 'B♯', E: 'F♭', F: 'E♯', B: 'C♭' }[nm]);
      const pool = range0(0, 11).flatMap(p => [T.pcName(p, 'sharp'), T.pcName(p, 'flat')]).concat(['E♯', 'B♯', 'C♭', 'F♭']).filter(x => x !== nm);
      return { prompt: `What is another name for <b>${esc(nm)}</b>?`, right, choices: pickN(right, pool), explain: `${esc(nm)} and ${esc(right)} are the same pitch.` };
    }
  }
};

function newQuiz(view, mode) {
  const g = QUIZ[view]; let q = null;
  for (let k = 0; k < 6; k++) { q = g.make(mode); if (q && !(TQ.q && TQ.q.prompt === q.prompt)) break; }
  Object.assign(TQ, { q, ctx: g.ctx() + '|' + mode, view, picked: null });
}
/* The quiz card for the current tab; regenerates when the tab's selections change. */
function tabQuiz(view) {
  const g = QUIZ[view]; if (!g) return '';
  const modes = g.modes; let mode = S.quizMode[view]; if (!modes.some(m => m[0] === mode)) mode = modes[0][0];
  const sc = qScores()[view] || { right: 0, total: 0, streak: 0 };
  const head = `<div class="tq-head"><h2>Practice: ${esc(g.title)}</h2><span class="score">${sc.right}/${sc.total}${sc.streak > 1 ? ` · streak ${sc.streak}` : ''}</span><button class="btn ghost small" type="button" data-act="tqtoggle" aria-expanded="${S.quizOpen}">${S.quizOpen ? 'Hide' : 'Show'}</button></div>`;
  if (!S.quizOpen) return `<section class="card tq is-closed">${head}</section>`;
  if (TQ.view !== view || TQ.ctx !== g.ctx() + '|' + mode || !TQ.q) newQuiz(view, mode);
  const q = TQ.q; const done = TQ.picked != null;
  if (!q) return `<section class="card tq">${head}<p class="empty">No question fits this selection. Try another root or tuning.</p></section>`;
  let body = modes.length > 1 ? `<div class="chips" role="group" aria-label="Question type">${modes.map(([id, l]) => `<button type="button" class="chip${id === mode ? ' is-on' : ''}" data-act="tqmode" data-m="${id}">${esc(l)}</button>`).join('')}</div>` : '';
  body += `<div class="prompt">${q.prompt}</div>`;
  if (q.fb) body += `<div class="fb-wrap"><div class="fb-scroll">${Render.fretboard({ tuning: q.fb.tuning || tuning(), min: q.fb.min, max: q.fb.max, markers: q.fb.markers, label: 'Quiz fretboard' })}</div></div>`;
  if (q.box) body += `<div class="boxes"><figure class="vcard">${Render.chordBox(Object.assign({}, q.box, { degrees: q.box.degrees && q.box.degrees.map(d => d === '1' ? '1' : null) }), { label: 'Chord to identify' })}</figure></div>`;
  if (q.play) body += `<button class="btn ghost" type="button" data-act="tqplay">Hear it</button>`;
  body += `<div class="choices${q.choices.length > 6 ? ' many' : ''}">${q.choices.map(c => `<button type="button" class="choice${done ? (c.v === q.right ? ' is-right' : c.v === TQ.picked ? ' is-wrong' : '') : ''}" data-act="tqpick" data-c="${esc(c.v)}" ${done ? 'disabled' : ''}>${esc(c.l)}</button>`).join('')}</div>`;
  if (done) body += `<div class="feedback ${TQ.picked === q.right ? 'ok' : 'bad'}" role="status"><b>${TQ.picked === q.right ? 'Correct.' : 'Not quite.'}</b> ${q.explain || ''}</div><button class="btn primary" type="button" data-act="tqnext">Next question</button>`;
  return `<section class="card tq">${head}${body}</section>`;
}
actions.tqpick = el => {
  if (TQ.picked != null || !TQ.q) return; TQ.picked = el.dataset.c; const ok = TQ.picked === TQ.q.right;
  const all = qScores(); const sc = all[TQ.view] || { right: 0, total: 0, streak: 0 };
  sc.total++; if (ok) { sc.right++; sc.streak = (sc.streak || 0) + 1; } else sc.streak = 0; all[TQ.view] = sc; Store.set('gte.tabquiz', all);
  render();
};
actions.tqnext = () => { const mode = TQ.ctx.split('|').pop(); newQuiz(S.view, mode); render(); };
actions.tqmode = el => { S.quizMode[S.view] = el.dataset.m; render(); };
actions.tqtoggle = () => { S.quizOpen = !S.quizOpen; render(); };
actions.tqplay = () => {
  const q = TQ.q; if (!q || !q.play) return; if (typeof q.play === 'function') { Audio.stopAll(); q.play(); return; }
  const c = Audio.ensure(); if (!c) return;
  if (q.chord) Audio.strum(q.play, c.currentTime + 0.03, { spread: 0.05 }); else q.play.forEach((m, i) => Audio.pluck(m, c.currentTime + 0.03 + i * 0.55));
};
/* Wrap every tab view so its quiz renders first. Practice already is a quiz. */
Object.keys(QUIZ).forEach(id => { const v = Views[id]; Views[id] = () => { const main = v(); return tabQuiz(id) + main; }; });
