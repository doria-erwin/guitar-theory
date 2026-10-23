/* Practice mode. Questions are generated from the theory engine; the answer is never rendered until the learner responds. */
const EXERCISES = [
  ['note', 'Find the note on the fretboard'], ['roots', 'Find all the roots'], ['interval', 'Identify the interval'], ['degree', 'Identify the scale degree'],
  ['tones', 'Identify chord tones'], ['chord', 'Identify the chord'], ['complete', 'Complete the major scale'], ['position', 'Recognise the scale position'],
  ['build', 'Build a chord from its formula'], ['relative', 'Relative major and minor']
];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const ROOTS_BY_LEVEL = { beginner: ['C', 'G', 'D', 'A', 'E', 'F'], intermediate: ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'B♭', 'E♭', 'A♭'], advanced: T.MAJOR_KEYS.slice() };
function choicesFrom(right, pool, n = 4) { const set = [right]; for (const p of shuffle(pool)) { if (set.length >= n) break; if (!set.includes(p)) set.push(p); } return shuffle(set); }

let P = { q: null, picked: null, sel: [], result: null };
function progress() { const d = Store.get('gte.practice', null); return d && typeof d === 'object' && d.stats ? d : { stats: {}, missed: [] }; }
function saveProgress(p) { Store.set('gte.practice', p); }

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
    const iv = rnd(pool); const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level]));
    const top = T.degreeNote(root, iv.degree); const oct = 4 + Math.floor((T.parseDegree(iv.degree).n - 1) / 7);
    const res = T.intervalBetween(root, 4, top, oct);
    const midiA = T.midiOf(root, 3), midiB = midiA + res.semis;
    return { kind: 'choice', prompt: `What interval is <b>${esc(root.name)}</b> up to <b>${esc(top.name)}</b>${res.compound ? ' (an octave or more above)' : ''}?`, audio: [midiA, midiB], right: res.name, choices: choicesFrom(res.name, pool.map(x => T.intervalBetween(root, 4, T.degreeNote(root, x.degree), 4 + Math.floor((T.parseDegree(x.degree).n - 1) / 7)).name)), explain: `${res.semis} semitones, ${res.number} letters (${esc(root.name)} to ${esc(top.name)}).`, spec: { ex: 'interval' } };
  },
  degree(level) {
    const sc = level === 'beginner' ? T.getScale('major') : level === 'intermediate' ? T.getScale(rnd(['major', 'minor'])) : T.getScale(rnd(['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'minor', 'locrian', 'harmonic']));
    const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const notes = T.scaleNotes(root, sc); const i = 1 + Math.floor(Math.random() * 6);
    return { kind: 'choice', prompt: `In <b>${esc(root.name)} ${esc(sc.name)}</b>, which degree is <b>${esc(notes[i].name)}</b>?`, right: sc.degrees[i], choices: choicesFrom(sc.degrees[i], sc.degrees.slice(1)), explain: `${esc(root.name)} ${esc(sc.name)}: ${esc(noteNames(notes))}.`, spec: { ex: 'degree' } };
  },
  tones(level) {
    const ids = level === 'beginner' ? ['maj', 'min'] : level === 'intermediate' ? ['7', 'maj7', 'm7', 'dim', 'aug'] : ['m7b5', 'dim7', '9', '13', '7s9', 'mmaj7', '7b9'];
    const c = T.getChord(rnd(ids)); const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const notes = T.chordNotes(root, c);
    const k = 1 + Math.floor(Math.random() * (notes.length - 1)); const deg = c.degrees[k];
    const pool = T.majorScale(root).concat(T.chordNotes(root, 'dim7'), T.chordNotes(root, '7s9')).map(n => n.name);
    return { kind: 'choice', prompt: `What is the <b>${esc(deg)}</b> of <b>${esc(T.chordSymbol(root, c))}</b>?`, right: notes[k].name, choices: choicesFrom(notes[k].name, pool), explain: `${esc(T.chordSymbol(root, c))} = ${esc(noteNames(notes))} (${esc(c.degrees.join(' '))}).`, spec: { ex: 'tones' } };
  },
  chord(level) {
    const ids = level === 'beginner' ? ['maj', 'min', 'dim', 'aug', 'sus4'] : level === 'intermediate' ? ['maj', 'min', '7', 'maj7', 'm7', 'm7b5', 'sus2', '6'] : ['m7b5', 'dim7', 'mmaj7', '9', 'maj9', 'm9', '7s9', '7b9', '13', '7sus4'];
    const c = T.getChord(rnd(ids)); const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const notes = T.chordNotes(root, c);
    const right = T.chordSymbol(root, c);
    return { kind: 'choice', prompt: `Which chord is <b>${esc(noteNames(notes))}</b>?`, audio: notes.map((n, i) => T.midiOf(n, 3) + (i && n.pc <= notes[0].pc ? 12 : 0)), chordAudio: true, right, choices: choicesFrom(right, ids.map(id => T.chordSymbol(root, id))), explain: `Root ${esc(root.name)}, formula ${esc(c.degrees.join(' '))}.`, spec: { ex: 'chord' } };
  },
  complete(level) {
    const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const ms = T.majorScale(root); const k = 1 + Math.floor(Math.random() * 6);
    const right = ms[k].name; const L = ms[k].l;
    const pool = [-1, 0, 1].map(a => T.makeNote(L, ms[k].a + a).name).concat([T.makeNote(L + 1, 0).name]);
    return { kind: 'choice', prompt: `Complete <b>${esc(root.name)} major</b>: ${ms.map((n, i) => i === k ? '<span class="blank">?</span>' : esc(n.name)).join(' ')}`, right, choices: choicesFrom(right, pool), explain: `Each letter appears once; the step pattern is W W H W W W H.`, spec: { ex: 'complete' } };
  },
  position(level) {
    const scId = level === 'beginner' ? 'minpent' : level === 'intermediate' ? rnd(['minpent', 'major']) : rnd(['major', 'minor', 'majpent']);
    const root = T.parseNote(rnd(['A', 'G', 'C', 'E', 'D'])); const ps = T.scalePositions(root, scId, T.TUNINGS[0]).filter(p => p.kind !== '3NPS' || level === 'advanced');
    const p = rnd(ps); const sc = T.getScale(scId);
    return { kind: 'choice', prompt: `This is ${esc(root.name)} ${esc(sc.name)}. Which position is it?`, pos: p, scId, root: root.name, right: p.label, choices: choicesFrom(p.label, ps.map(x => x.label)), explain: `${esc(p.label)}: ${esc(p.sub)}.`, spec: { ex: 'position' } };
  },
  build(level) {
    const ids = level === 'beginner' ? ['maj', 'min', 'sus2', 'sus4'] : level === 'intermediate' ? ['7', 'maj7', 'm7', 'm7b5', 'dim', 'aug'] : ['dim7', '9', 'm9', '13', '7s9', 'mmaj7', '69'];
    const c = T.getChord(rnd(ids)); const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); const right = noteNames(T.chordNotes(root, c));
    const wrong = ids.filter(id => id !== c.id).map(id => noteNames(T.chordNotes(root, id)));
    wrong.push(T.chordNotes(root, c).map(n => T.pcName(n.pc, n.a < 0 ? 'sharp' : 'flat')).join(' '));
    return { kind: 'choice', prompt: `Build <b>${esc(T.chordSymbol(root, c))}</b> (formula ${esc(c.degrees.join(' '))}).`, right, choices: choicesFrom(right, wrong), explain: `Major scale of ${esc(root.name)}: ${esc(noteNames(T.majorScale(root)))}. Spell with letters in order.`, spec: { ex: 'build' } };
  },
  relative(level) {
    const toMinor = Math.random() < 0.5; const k = rnd(ROOTS_BY_LEVEL[level]);
    if (toMinor) { const right = T.relativeMinor(k).name + ' minor'; return { kind: 'choice', prompt: `What is the relative minor of <b>${esc(k)} major</b>?`, right, choices: choicesFrom(right, T.MAJOR_KEYS.map(x => T.relativeMinor(x).name + ' minor').concat([k + ' minor'])), explain: 'Relative minor = 6th degree of the major scale (same key signature).', spec: { ex: 'relative' } }; }
    const m = T.relativeMinor(k); const right = k + ' major';
    return { kind: 'choice', prompt: `What is the relative major of <b>${esc(m.name)} minor</b>?`, right, choices: choicesFrom(right, T.MAJOR_KEYS.map(x => x + ' major').concat([m.name + ' major'])), explain: 'Relative major = ♭3 of the minor key (3 frets up).', spec: { ex: 'relative' } };
  }
};
function newQuestion() {
  const pr = progress(); const ex = S.practice.ex; const level = S.practice.level;
  const missed = pr.missed.filter(m => m.ex === ex && m.level === level);
  let q;
  if (missed.length && Math.random() < 0.4) { const m = missed[0]; q = m.q; q.retry = true; pr.missed = pr.missed.filter(x => x !== m); saveProgress(pr); }
  else q = GEN[ex](level);
  P = { q, picked: null, sel: [], result: null };
}
Views.practice = () => {
  if (!EXERCISES.some(e => e[0] === S.practice.ex)) S.practice.ex = 'note';
  if (!LEVELS.includes(S.practice.level)) S.practice.level = 'beginner';
  if (!P.q || P.q.spec.ex !== S.practice.ex || P.level !== S.practice.level) { newQuestion(); P.level = S.practice.level; }
  const pr = progress(); const st = pr.stats[S.practice.ex + ':' + S.practice.level] || { right: 0, total: 0 };
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
  if (P.result) body += `<div class="feedback ${P.result === 'right' ? 'ok' : 'bad'}" role="status"><b>${P.result === 'right' ? 'Correct.' : 'Not quite.'}</b> ${q.kind === 'choice' && P.result !== 'right' ? `Answer: <b>${esc(q.right)}</b>. ` : ''}${q.explain || ''}${P.result !== 'right' ? ' This one will come back for review.' : ''}</div><button class="btn primary" type="button" data-act="qnext">Next question</button>`;
  return card('Practice', `<div class="row"><label>Exercise <select data-ch="pex">${opt(EXERCISES.map(([v, l]) => ({ v, l })), S.practice.ex)}</select></label>
      <label>Level <select data-ch="plevel">${opt(LEVELS.map(l => ({ v: l, l: l[0].toUpperCase() + l.slice(1) })), S.practice.level)}</select></label></div>
    <p class="score">This exercise: <b>${st.right}/${st.total}</b>${st.total ? ` (${Math.round(st.right / st.total * 100)}%)` : ''} · All exercises: ${allR}/${allT} · Waiting for review: ${pr.missed.length}</p>
    <div class="question">${body}</div>
    <p><button class="btn ghost small" type="button" data-act="preset">Reset progress</button> <span class="muted">${Store.available ? 'Progress is saved in this browser.' : 'This browser blocks storage, so progress lasts only until you close the page.'}</span></p>`);
};
function finish(correct) {
  P.result = correct ? 'right' : 'wrong';
  const pr = progress(); const key = S.practice.ex + ':' + S.practice.level; const st = pr.stats[key] || { right: 0, total: 0 };
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
actions.plevel = el => { S.practice.level = el.value; P.q = null; render(); };
actions.preset = () => { if (window.confirm('Reset all practice scores and the review list?')) { Store.del('gte.practice'); P.q = null; render(); } };
