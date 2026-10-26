// Quiz audit: generates thousands of questions from every Practice exercise and every tab quiz (seeded, reproducible)
// and checks each one against an independent answer key built from the theory engine and the question text.
// Run: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/theory.js');
const { loadApp } = require('./harness.js');

const SEED = Number(process.env.QUIZ_SEED || 20261026);
const N = Number(process.env.QUIZ_N || 120); // questions per exercise/level (or per tab/mode/setting)

/* ---------- Independent answer key helpers ---------- */
const strip = s => String(s).replace(/<[^>]+>/g, '');
const NOTE = '[A-G](?:𝄪|𝄫|♯|♭)?';
const ACC = [-2, -1, 0, 1, 2];
const ALL_NOTES = []; for (let l = 0; l < 7; l++) for (const a of ACC) ALL_NOTES.push(T.makeNote(l, a));
/* Every chord symbol for every spelled root → { root, chord, pcs }. */
const SYM = {};
for (const r of ALL_NOTES) for (const c of T.CHORDS) { const s = T.chordSymbol(r, c); if (!SYM[s]) SYM[s] = { root: r, chord: c, pcs: new Set(T.chordPcs(r.pc, c)) }; }
/* Ascending interval from a up to b (b at or above a, within an octave unless compound). */
function ascending(a, b, compound) {
  const A = T.parseNote(a), B = T.parseNote(b);
  let o = 4; let r = T.intervalBetween(A, 4, B, o); if (r.descending) { o = 5; r = T.intervalBetween(A, 4, B, o); }
  if (compound && r.number < 8) { o += 1; r = T.intervalBetween(A, 4, B, o); }
  return r;
}
const IV = abbr => T.INTERVALS.find(x => x.abbr === abbr);
const ivLabel = s => s === 6 ? 'A4 / d5' : T.INTERVALS.find(x => x.semis === s && ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'].includes(x.abbr)).abbr;
const parseAbbr = a => { const m = a.match(/^(d|m|M|P|A)(\d+)$/); return m && { q: m[1], n: +m[2] }; };
const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
const romanFor = (i, quality) => { const R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']; const lower = quality === 'Minor' || quality === 'Diminished'; return (lower ? R[i].toLowerCase() : R[i]) + (quality === 'Diminished' ? '°' : quality === 'Augmented' ? '+' : ''); };

/* Generic checks for every multiple-choice question. Returns a list of problems. */
function generic(q) {
  const out = [];
  if (!q) return ['generator returned nothing'];
  const text = [q.prompt, q.explain, q.hint, ...(q.choices || []).map(c => typeof c === 'object' ? c.l : c)].join(' ');
  if (/undefined|NaN|\[object|null\b/.test(strip(text))) out.push('text contains undefined/NaN/null');
  if (/♭♭|♯♯|𝄫♭|𝄪♯|♭𝄫|♯𝄪/.test(text)) out.push('triple sharp or flat (not valid notation)');
  if (q.kind === 'tap' || q.kind === 'multi') return out;
  const vals = q.choices.map(c => typeof c === 'object' ? c.v : c);
  if (!vals.includes(q.right)) out.push(`right answer "${q.right}" missing from choices ${JSON.stringify(vals)}`);
  if (new Set(vals).size !== vals.length) out.push('duplicate choices ' + JSON.stringify(vals));
  if (vals.length < 2) out.push('fewer than two choices');
  const labels = q.choices.map(c => typeof c === 'object' ? c.l : c);
  if (new Set(labels).size !== labels.length) out.push('duplicate choice labels ' + JSON.stringify(labels));
  return out;
}
/* Exactly one choice satisfies isRight, and it is the marked answer. */
function exactlyOne(q, isRight) {
  const vals = q.choices.map(c => typeof c === 'object' ? c.v : c);
  const ok = vals.filter(isRight);
  if (ok.length !== 1 || ok[0] !== q.right) return [`expected exactly one correct choice (${q.right}); key accepts ${JSON.stringify(ok)} of ${JSON.stringify(vals)}`];
  return [];
}

/* ---------- Answer keys for Practice exercises ---------- */
const PRACTICE_KEYS = {
  note: q => { const name = strip(q.prompt).match(new RegExp(`Tap any (${NOTE}) `))[1]; return T.parseNote(name).pc === q.pc ? [] : ['tap target pc mismatch']; },
  roots: q => { const name = strip(q.prompt).match(new RegExp(`Tap every (${NOTE}) `))[1]; return T.parseNote(name).pc === q.pc ? [] : ['multi target pc mismatch']; },
  interval: q => {
    const m = q.prompt.match(new RegExp(`What interval is <b>(${NOTE})</b> up to <b>(${NOTE})</b>( \\(one octave or more higher\\))?\\?`));
    if (!m) return ['prompt not recognised'];
    const r = ascending(m[1], m[2], !!m[3]);
    const errs = exactlyOne(q, c => c === r.name);
    if (!strip(q.explain).startsWith(`${r.semis} semitones, ${r.number} letters`)) errs.push(`explanation "${strip(q.explain)}" does not match ${r.name} (${r.semis} semitones, ${r.number} letters)`);
    if (q.audio && q.audio[1] - q.audio[0] !== r.semis) errs.push('audio interval differs from the answer');
    return errs;
  },
  degree: q => {
    const m = strip(q.prompt).match(new RegExp(`^In (${NOTE}) (.+), which degree is (${NOTE})\\?$`)); if (!m) return ['prompt not recognised'];
    const sc = T.SCALES.find(s => s.name === m[2]); const notes = T.scaleNotes(m[1], sc); const i = notes.findIndex(n => n.name === m[3]);
    return i < 1 ? ['note not in scale'] : exactlyOne(q, c => c === sc.degrees[i]);
  },
  tones: q => {
    const m = strip(q.prompt).match(/^What is the (\S+) of (\S+)\?$/); if (!m) return ['prompt not recognised'];
    const s = SYM[m[2]]; const k = s.chord.degrees.indexOf(m[1]); const right = T.chordNotes(s.root, s.chord)[k].name;
    return exactlyOne(q, c => c === right);
  },
  chord: q => {
    const notes = strip(q.prompt).match(/^Which chord is (.+)\?$/)[1].split(' ').map(n => T.parseNote(n));
    const pcs = new Set(notes.map(n => n.pc));
    return exactlyOne(q, c => SYM[c] && sameSet(SYM[c].pcs, pcs) && SYM[c].root.name === notes[0].name);
  },
  complete: q => {
    const m = strip(q.prompt).match(new RegExp(`^Complete (${NOTE}) major: (.+)$`)); const k = m[2].split(' ').indexOf('?');
    const right = T.majorScale(m[1])[k].name; return exactlyOne(q, c => c === right);
  },
  position: q => { const sc = T.getScale(q.scId); const pcs = new Set(T.scaleNotes(q.root, sc).map(n => n.pc)); return q.pos.notes.every(n => pcs.has(T.mod(n.midi))) ? exactlyOne(q, c => c === q.pos.label) : ['position contains notes outside the scale']; },
  build: q => { const sym = strip(q.prompt).match(/^Build (\S+) \(/)[1]; const right = T.chordNotes(SYM[sym].root, SYM[sym].chord).map(n => n.name).join(' '); return exactlyOne(q, c => c === right); },
  relative: q => {
    const t = strip(q.prompt); let m = t.match(new RegExp(`relative minor of (${NOTE}) major`));
    if (m) { const r = T.relativeMinor(m[1]); return exactlyOne(q, c => T.parseNote(c.replace(' minor', '')).pc === r.pc).concat(q.right === r.name + ' minor' ? [] : ['wrong spelling']); }
    m = t.match(new RegExp(`relative major of (${NOTE}) minor`)); const r = T.relativeMajor(m[1]);
    return exactlyOne(q, c => T.parseNote(c.replace(' major', '')).pc === r.pc).concat(q.right === r.name + ' major' ? [] : ['wrong spelling']);
  },
  ivgroups: q => {
    const t = strip(q.prompt); let m;
    if ((m = t.match(/^Which interval is (\d+) semitones?\?$/))) return exactlyOne(q, c => c === ivLabel(+m[1]));
    if ((m = t.match(/^How many semitones is an? (\S+) /))) return exactlyOne(q, c => +c === IV(m[1]).semis);
    if ((m = t.match(new RegExp(`^What note is an? (\\S+) above (${NOTE})\\?$`)))) { const a = parseAbbr(m[1]); const x = T.intervalAbove(m[2], a.n, a.q); return exactlyOne(q, c => c === x.note.name); }
    if ((m = t.match(new RegExp(`^What interval is (${NOTE}) up to (${NOTE})( \\(one octave or more higher\\))?\\?$`)))) { const r = ascending(m[1], m[2], !!m[3]); const abbr = r.number === 1 && r.semis === 0 ? 'P1' : r.abbr; return exactlyOne(q, c => c === abbr); }
    return ['prompt not recognised: ' + t];
  },
  direction: q => {
    const m = strip(q.prompt).match(new RegExp(`(${NOTE})(\\d) → (${NOTE})(\\d)$`)); const r = T.intervalBetween(m[1], +m[2], m[3], +m[4]);
    const label = `${r.abbr} ${r.descending ? 'down' : 'up'} (${r.descending ? '−' : '+'}${r.semis})`;
    return exactlyOne(q, c => c === label);
  },
  ivinvert: q => {
    const t = strip(q.prompt); let m;
    if ((m = t.match(/^What is the inversion of (\S+) /))) return exactlyOne(q, c => c === T.invertInterval(m[1]).abbr);
    if ((m = t.match(/^(\S+) is (\d+) semitones\. How many semitones is its inversion\?$/))) return exactlyOne(q, c => +c === 12 - +m[2]);
    if ((m = t.match(new RegExp(`What is (${NOTE})(\\d) → (${NOTE})(\\d)\\?$`)))) { const r = T.intervalBetween(m[1], +m[2], m[3], +m[4]); const first = t.match(/is (\S+)\. Move/)[1]; return r.descending ? ['inversion question goes downward'] : exactlyOne(q, c => c === r.abbr).concat(r.abbr === T.invertInterval(first).abbr ? [] : ['not the inversion of the stated interval']); }
    return ['prompt not recognised: ' + t];
  },
  scalebuild: q => { const m = strip(q.prompt).match(new RegExp(`^Build (${NOTE}) (major|natural minor)\\.$`)); const right = T.scaleNotes(m[1], m[2] === 'major' ? 'major' : 'minor').map(n => n.name).join(' '); return exactlyOne(q, c => c === right); },
  triad: q => {
    const t = strip(q.prompt); let m; const Q = { Major: 'maj', Minor: 'min', Diminished: 'dim', Augmented: 'aug' };
    if ((m = t.match(/semitones ([\d–]+) from the root/))) return exactlyOne(q, c => T.getChord(Q[c]).degrees.map(T.degreeSemis).join('–') === m[1]);
    if ((m = t.match(/^Which triad is (\S+ \+ \S+) stacked/))) { const st = { Major: 'M3 + m3', Minor: 'm3 + M3', Diminished: 'm3 + m3', Augmented: 'M3 + M3' }; return exactlyOne(q, c => st[c] === m[1]); }
    if ((m = t.match(new RegExp(`^Spell (${NOTE}) (\\w+)\\.$`)))) { const id = Q[m[2][0].toUpperCase() + m[2].slice(1)]; const right = T.chordNotes(m[1], id).map(n => n.name).join(' '); return exactlyOne(q, c => c === right); }
    if ((m = t.match(/^(.+) \(low to high\) is (\S+) in which position\?$/))) { const s = SYM[m[2]]; const bass = m[1].split(' ')[0]; const k = T.chordNotes(s.root, s.chord).findIndex(n => n.name === bass); return exactlyOne(q, c => c === ['Root position', '1st inversion', '2nd inversion'][k]); }
    return ['prompt not recognised: ' + t];
  },
  family: q => {
    const t = strip(q.prompt); let m;
    if ((m = t.match(/degree (\d)\?$/))) { const minor = /natural minor/.test(t); const d = T.diatonicChords('C', minor ? 'minor' : 'major')[+m[1] - 1]; return exactlyOne(q, c => c === d.triad.quality); }
    m = t.match(new RegExp(`^In (${NOTE}) (major|minor), (?:what is the (\\S+) chord|which numeral is (\\S+))\\?$`)); if (!m) return ['prompt not recognised: ' + t];
    const dia = T.diatonicChords(m[1], m[2]); const romans = dia.map((d, i) => romanFor(i, d.triad.quality));
    if (m[3]) { const i = romans.indexOf(m[3]); return exactlyOne(q, c => c === dia[i].triad.symbol); }
    const i = dia.findIndex(d => d.triad.symbol === m[4]); return exactlyOne(q, c => c === romans[i]);
  },
  fbinterval: q => {
    const std = T.TUNINGS[0].midi; const keys = Object.keys(q.fb.markers); const r = keys.find(k => q.fb.markers[k].label === 'R'), t = keys.find(k => q.fb.markers[k].label === '?');
    const mid = k => { const [s, f] = k.split(':').map(Number); return std[s] + f; };
    const d = mid(t) - mid(r); const down = /below/.test(q.prompt);
    if ((d < 0) !== down || d === 0) return [`marked note is ${d} semitones from the root but the prompt says ${down ? 'below' : 'above'}`];
    return exactlyOne(q, c => c === ivLabel(Math.abs(d))).concat(q.audio[1] - q.audio[0] === d ? [] : ['audio differs from the diagram']);
  },
  quality: q => {
    const t = strip(q.prompt); let m;
    if ((m = t.match(/\((\S+)\) is (\d+) semitones?, how many semitones is an? .+ \((\S+)\)\?$/))) { const a = parseAbbr(m[3]), b = parseAbbr(m[1]); const sa = T.intervalAbove('C', a.n, a.q).semis; return exactlyOne(q, c => +c === sa).concat(T.intervalAbove('C', b.n, b.q).semis === +m[2] ? [] : ['stated size of the known interval is wrong']); }
    if ((m = t.match(new RegExp(`^What is the interval from (${NOTE}) up to (${NOTE})( \\(one octave or more higher\\))?\\?$`)))) { const r = ascending(m[1], m[2], !!m[3]); return exactlyOne(q, c => c === r.abbr); }
    if ((m = t.match(new RegExp(`^What note is an? .+ \\((\\S+)\\) above (${NOTE})\\?$`)))) { const a = parseAbbr(m[1]); const x = T.intervalAbove(m[2], a.n, a.q); return exactlyOne(q, c => c === x.note.name); }
    // Concept questions: every wrong option must carry its own explanation.
    const missing = q.choices.filter(c => c !== q.right && !(q.whyWrong && q.whyWrong[c]));
    return missing.length ? ['wrong options without explanation: ' + missing.join(' | ')] : [];
  }
};

/* ---------- Answer keys for the per-tab quizzes ---------- */
function tabKey(run, view, mode, q) {
  const S = run('S'); const t = strip(q.prompt); let m;
  const tun = run('tuning()'); const root = T.parseNote(S.root);
  const markerKey = () => Object.keys(q.fb.markers).find(k => q.fb.markers[k].label === '?');
  const midiAt = (k, tn) => { const [s, f] = k.split(':').map(Number); return (tn || tun).midi[s] + f; };
  const pcRight = pc => exactlyOne(q, c => T.parseNote(String(c).split('/')[0]).pc === pc || +c === pc && /^\d+$/.test(c));
  switch (view + ':' + mode) {
    case 'fretboard:note': return exactlyOne(q, c => +c === T.mod(midiAt(markerKey())));
    case 'fretboard:degree': return exactlyOne(q, c => IV(c).semis === T.mod(midiAt(markerKey()) - root.pc));
    case 'scales:note': { m = t.match(/what note is degree (\S+)\?$/); const sc = T.getScale(S.scale); const n = T.scaleNotes(root, sc)[sc.degrees.indexOf(m[1])]; return exactlyOne(q, c => c === n.name || (+c === n.pc && /^\d+$/.test(c))); }
    case 'scales:degree': { m = t.match(new RegExp(`which degree is (${NOTE})\\?$`)); const sc = T.getScale(S.scale); const i = T.scaleNotes(root, sc).findIndex(n => n.name === m[1]); return exactlyOne(q, c => c === sc.degrees[i]); }
    case 'scales:in': { m = t.match(new RegExp(`^Is (${NOTE}) in`)); const inSc = T.scaleNotes(root, S.scale).some(n => n.pc === T.parseNote(m[1]).pc); return exactlyOne(q, c => c === (inSc ? 'yes' : 'no')); }
    case 'intervals:semis': { m = t.match(/go up (\d+) semitones?/); return exactlyOne(q, c => +c === T.mod(root.pc + +m[1])); }
    case 'intervals:name': { m = t.match(/What note is an? (.+) above/); const iv = T.INTERVALS.find(x => x.name.replace(/ \(.*\)/, '') === m[1]); const n = T.degreeNote(root, iv.degree); return exactlyOne(q, c => c === n.name || (+c === n.pc && /^\d+$/.test(c))); }
    case 'intervals:count': { m = t.match(new RegExp(`up to (${NOTE})( \\(one octave higher\\))?\\?$`)); const r = ascending(root.name, m[1], !!m[2]); return exactlyOne(q, c => +c === r.semis); }
    case 'builder:tone': { m = t.match(/What is the (\S+) of (\S+)\?$/); const s = SYM[m[2]]; const n = T.chordNotes(s.root, s.chord)[s.chord.degrees.indexOf(m[1])]; return exactlyOne(q, c => c === n.name || (+c === n.pc && /^\d+$/.test(c))); }
    case 'builder:semis': { m = t.match(/is the (\S+)\?$/); const want = T.degreeSemis(m[1]); return exactlyOne(q, c => +c === want || (want > 12 && +c === want - 12)); }
    case 'builder:spell': { m = t.match(/^Spell (\S+) /); const right = T.chordNotes(SYM[m[1]].root, SYM[m[1]].chord).map(n => n.name).join(' '); return exactlyOne(q, c => c === right); }
    case 'finder:name': { const notes = t.match(/order: (.+)\. Name/)[1].split(' ').map(n => T.parseNote(n)); const pcs = new Set(notes.map(n => n.pc)); return exactlyOne(q, c => SYM[c] && sameSet(SYM[c].pcs, pcs)); }
    case 'shapes:root': case 'shapes:open': {
      const box = new Set(q.box.midi.filter(x => x != null).map(x => T.mod(x)));
      const roots = new Set(q.box.degrees.map((d, i) => d === '1' && q.box.midi[i] != null ? T.mod(q.box.midi[i]) : null).filter(x => x != null)); // red root dots
      return exactlyOne(q, c => { const s = SYM[c]; if (!s || (roots.size && !roots.has(s.root.pc))) return false; if (![...box].every(p => s.pcs.has(p))) return false; const fifth = T.mod(s.root.pc + 7); return [...s.pcs].every(p => box.has(p) || p === fifth); });
    }
    case 'inversions:which': { m = t.match(/voiced low to high as (.+)\. Which/); const s = SYM[t.match(/^(\S+) voiced/)[1]]; const k = T.chordNotes(s.root, s.chord).findIndex(n => n.name === m[1].split(' ')[0]); return exactlyOne(q, c => c === ['Root position', '1st inversion', '2nd inversion', '3rd inversion'][k]); }
    case 'inversions:bass': { m = t.match(/bass note of (\S+) in (\w+) (inversion|position)/); const s = SYM[m[1]]; const k = { root: 0, '1st': 1, '2nd': 2, '3rd': 3 }[m[2]]; const n = T.chordNotes(s.root, s.chord)[k]; return exactlyOne(q, c => c === n.name || (+c === n.pc && /^\d+$/.test(c))); }
    case 'arpeggios:tone': { const semi = T.mod(midiAt(markerKey()) - root.pc); return exactlyOne(q, c => T.mod(T.degreeSemis(c)) === semi); }
    case 'keys:roman': { m = t.match(new RegExp(`^In (${NOTE}) major, what is the (\\S+) chord\\?$`)); const d = T.diatonicChords(m[1]).find(x => x.roman === m[2]); return exactlyOne(q, c => c === d.triad.symbol); }
    case 'keys:which': { m = t.match(new RegExp(`^In (${NOTE}) major, which numeral is (\\S+)\\?$`)); const d = T.diatonicChords(m[1]).find(x => x.triad.symbol === m[2]); return exactlyOne(q, c => c === d.roman); }
    case 'keys:sig': { m = t.match(new RegExp(`in (${NOTE}) major\\?$`)); const s = T.keySignature(m[1]); const lab = s.count === 0 ? 'None' : Math.abs(s.count) + (s.count > 0 ? '♯' : '♭'); return exactlyOne(q, c => c === lab); }
    case 'progressions:gap': { const p = T.PROGRESSIONS.find(x => x.id === S.prog); const ch = T.progressionChords(root, p); const i = t.split(': ').slice(1).join(': ').split(' – ').findIndex(x => x.endsWith('?')); return exactlyOne(q, c => c === ch[i].symbol); }
    case 'rhythm:beats': { m = t.match(/a (.+) note last/); const nv = run('NOTE_VALUES').find(x => x[1].toLowerCase() === m[1]); const lab = String(nv[2]).replace('0.25', '¼').replace('0.75', '¾').replace('0.5', '½').replace('1.5', '1½'); return exactlyOne(q, c => c === lab); }
    case 'rhythm:name': return [];
    case 'techniques:sym': { m = q.prompt.match(/<b class="mono">(.+?)<\/b>/); const sym = m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); const techs = run('TECHNIQUES'); return exactlyOne(q, c => techs.some(x => x.name === c && x.sym === sym)); }
    case 'techniques:ear': return [];
    case 'harmony:sec': { m = t.match(/what is (V7\/\S+) \(/); const x = T.secondaryDominants(root).find(y => y.label === m[1]); return exactlyOne(q, c => c === x.symbol); }
    case 'harmony:borrow': { m = t.match(/which chord is (\S+) borrowed/); const x = T.borrowedChords(root).find(y => y.roman === m[1]); return exactlyOne(q, c => c === x.symbol); }
    case 'harmony:tri': { m = t.match(new RegExp(`for (${NOTE})7\\?`)); const s = T.tritoneSub(m[1]); return exactlyOne(q, c => c === s.root.name || (+c === s.root.pc && /^\d+$/.test(c))); }
    case 'basics:open': { m = t.match(/open string (\d)\?$/); return exactlyOne(q, c => +c === T.mod(T.TUNINGS[0].midi[6 - +m[1]])); }
    case 'basics:fret': return exactlyOne(q, c => +c === T.mod(midiAt(markerKey(), T.TUNINGS[0])));
    case 'basics:enh': { m = t.match(new RegExp(`name for (${NOTE})\\?$`)); const pc = T.parseNote(m[1]).pc; return exactlyOne(q, c => c !== m[1] && T.parseNote(c).pc === pc); }
  }
  return ['no answer key for ' + view + ':' + mode];
}

/* Question types whose explanation is meant to state the answer: it must contain the right answer text. */
const EXPLAIN_STATES_ANSWER = {
  practice: ['tones', 'build', 'scalebuild', 'direction', 'ivinvert', 'fbinterval', 'family'],
  tabs: ['scales:note', 'intervals:name', 'builder:tone', 'builder:semis', 'builder:spell', 'inversions:bass', 'harmony:sec', 'harmony:borrow', 'harmony:tri', 'keys:roman', 'keys:which', 'basics:enh']
};
function explainsAnswer(q) {
  const e = strip(q.explain || ''); const r = String(q.right);
  const forms = [r, r.replace(/ (up|down) \(.*\)$/, ''), r.replace(/ \/ .*/, '')];
  return forms.some(f => e.includes(f)) ? [] : [`explanation does not state the answer "${r}": ${e}`];
}

/* QUIZ_DUMP=1 prints one example per kind of problem (exercise + first error), to triage an audit run. */
function dump(label, problems) {
  if (!process.env.QUIZ_DUMP) return;
  const groups = {}; problems.forEach(p => { const k = p.split(':')[0].split(' ')[0] + ' | ' + p.split('→ ')[1].replace(/\d+|"[^"]*"|\[[^\]]*\]/g, '#').slice(0, 70); (groups[k] = groups[k] || []).push(p); });
  console.log(`\n=== ${label}: ${problems.length} problems ===`); Object.entries(groups).forEach(([k, v]) => console.log(`[${v.length}] ${k}\n      e.g. ${v[0].slice(0, 300)}`));
}

/* ---------- Tests ---------- */
test('Reported bug: "What interval is A up to C♯?" is a major 3rd (4 semitones, 3 letters)', () => {
  const r = ascending('A', 'C♯', false); assert.equal(r.name, 'Major 3rd'); assert.equal(r.semis, 4); assert.equal(r.number, 3);
  const { run } = loadApp(SEED);
  // Every Practice interval question whose prompt is A → C♯ must say Major 3rd.
  let seen = 0;
  for (let i = 0; i < 4000 && seen < 3; i++) { const q = run(`GEN.interval('${['beginner', 'intermediate', 'advanced'][i % 3]}')`); if (/<b>A<\/b> up to <b>C♯<\/b>\?/.test(q.prompt)) { seen++; assert.equal(q.right, 'Major 3rd'); assert.match(strip(q.explain), /^4 semitones, 3 letters/); } }
  assert.ok(seen > 0, 'generator never produced A → C♯; increase the sample');
});

test('Practice: every exercise, level and interval group produces valid, uniquely answerable questions', () => {
  const { run } = loadApp(SEED);
  const exercises = run('EXERCISES.map(e => e[0])'); const groups = run('GROUPS.map(g => g[0])');
  const problems = []; let count = 0;
  for (const ex of exercises) for (const level of ['beginner', 'intermediate', 'advanced']) for (const group of ex === 'ivgroups' ? groups : [null]) {
    run(`S.practice.ex = '${ex}'; S.practice.level = '${level}';` + (group ? ` S.practice.group = '${group}';` : ''));
    for (let i = 0; i < N; i++) {
      const q = run(`GEN['${ex}']('${level}')`); count++;
      const errs = generic(q).concat(q && PRACTICE_KEYS[ex] ? PRACTICE_KEYS[ex](q) : [`no answer key for ${ex}`], EXPLAIN_STATES_ANSWER.practice.includes(ex) && q.kind === 'choice' ? explainsAnswer(q) : []);
      if (errs.length) problems.push(`${ex}/${level}${group ? '/' + group : ''}: ${strip(q && q.prompt)} → ${errs.join('; ')}`);
    }
  }
  dump('practice', problems);
  assert.ok(count > 5000, 'sample too small: ' + count);
  assert.deepEqual([...new Set(problems)].slice(0, 15), [], `${problems.length} problems in ${count} questions`);
});

test('Tab quizzes: every tab, mode and setting produces valid, uniquely answerable questions', () => {
  const { run } = loadApp(SEED + 1);
  const views = run('Object.keys(QUIZ)'); const problems = []; let count = 0;
  const settings = [];
  for (const root of T.ROOTS) settings.push({ root });
  T.SCALES.forEach((sc, i) => settings.push({ root: T.ROOTS[i % T.ROOTS.length], scale: sc.id }));
  T.CHORDS.forEach((c, i) => settings.push({ root: T.ROOTS[(i * 5) % T.ROOTS.length], chord: c.id }));
  ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'm7', 'm7b5', 'dim7'].forEach((c, i) => settings.push({ root: T.ROOTS[(i * 3) % 17], invChord: c }));
  ['maj', 'min', 'maj7', 'm7', '7', 'dim', 'm7b5', 'dim7'].forEach((c, i) => settings.push({ root: T.ROOTS[(i * 7) % 17], arp: c }));
  T.PROGRESSIONS.forEach((p, i) => settings.push({ root: T.ROOTS[(i * 2) % 17], prog: p.id }));
  ['dropd', 'dstd'].forEach(id => settings.push({ root: 'E', tuning: id }));
  for (const view of views) for (const [mode] of run(`QUIZ['${view}'].modes`)) for (const st of settings) {
    run(`Object.assign(S, ${JSON.stringify(Object.assign({ tuning: 'std', scale: 'minpent', chord: 'm7', invChord: 'maj', arp: 'maj7', prog: 'pop' }, st))})`);
    for (let i = 0; i < Math.max(4, Math.round(N / 20)); i++) {
      const q = run(`QUIZ['${view}'].make('${mode}')`); count++;
      if (!q) { problems.push(`${view}:${mode} ${JSON.stringify(st)} → no question`); continue; }
      const errs = generic(q).concat(tabKey(run, view, mode, q), EXPLAIN_STATES_ANSWER.tabs.includes(view + ':' + mode) ? explainsAnswer(q) : []);
      if (errs.length) problems.push(`${view}:${mode} ${JSON.stringify(st)}: ${strip(q.prompt)} → ${errs.join('; ')}`);
    }
  }
  dump('tabs', problems);
  assert.ok(count > 3000, 'sample too small: ' + count);
  assert.deepEqual([...new Set(problems)].slice(0, 15), [], `${problems.length} problems in ${count} questions`);
});

test('Rhythm counting exercise: answer matches the bar and choices are distinct', () => {
  const { run } = loadApp(SEED + 2);
  for (let i = 0; i < 1000; i++) {
    const q = run('makeRhythmQ()');
    assert.equal(q.notes.reduce((a, b) => a + Math.abs(b), 0), 4, 'bar adds up to 4 beats');
    assert.equal(q.right, run(`countLabels(${JSON.stringify(q.notes)}).join(' ')`));
    assert.ok(q.choices.includes(q.right)); assert.equal(new Set(q.choices).size, q.choices.length);
  }
});

test('Scoring: right and wrong answers update stats and the review list; old keys are untouched', () => {
  const { run, store } = loadApp(SEED + 3);
  store['gte.practice'] = JSON.stringify({ stats: { 'note:beginner': { right: 3, total: 5 } }, missed: [] });
  run(`S.practice.ex = 'interval'; S.practice.level = 'intermediate'; newQuestion();`);
  run('actions.qpick({ dataset: { c: P.q.right } })');
  let pr = JSON.parse(store['gte.practice']);
  assert.deepEqual(pr.stats['interval:intermediate'], { right: 1, total: 1 });
  assert.deepEqual(pr.stats['note:beginner'], { right: 3, total: 5 });
  run('newQuestion(); actions.qpick({ dataset: { c: P.q.choices.find(c => c !== P.q.right) } })');
  pr = JSON.parse(store['gte.practice']);
  assert.deepEqual(pr.stats['interval:intermediate'], { right: 1, total: 2 });
  assert.equal(pr.missed.length, 1); assert.equal(run('P.result'), 'wrong');
  // A second pick after answering is ignored.
  run('actions.qpick({ dataset: { c: P.q.right } })'); assert.equal(JSON.parse(store['gte.practice']).stats['interval:intermediate'].total, 2);
});

test('Saved review questions from before the fix are dropped, scores are kept', () => {
  const { run, store } = loadApp(SEED + 4);
  const stale = { kind: 'choice', prompt: 'What interval is <b>A</b> up to <b>C♯</b>?', right: 'Minor 6th', choices: ['Minor 6th', 'Major 3rd'], explain: '8 semitones, 6 letters (A to C♯).', spec: { ex: 'interval' } };
  store['gte.practice'] = JSON.stringify({ stats: { 'interval:beginner': { right: 2, total: 4 } }, missed: [{ ex: 'interval', level: 'beginner', q: stale }, { ex: 'note', level: 'beginner', q: { kind: 'tap', prompt: 'Tap any <b>C</b>', pc: 0, lim: 5, spec: { ex: 'note', pc: 0, lim: 5 } } }] });
  for (let i = 0; i < 50; i++) { run(`S.practice.ex = 'interval'; S.practice.level = 'beginner'; newQuestion();`); assert.notEqual(run('P.q.right'), 'Minor 6th', 'stale question re-asked'); }
  const pr = JSON.parse(store['gte.practice']);
  assert.deepEqual(pr.stats['interval:beginner'], { right: 2, total: 4 });
  assert.ok(pr.missed.some(m => m.ex === 'note'), 'unaffected review questions are kept');
});
