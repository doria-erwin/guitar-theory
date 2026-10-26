/* Interval qualities: the two families (Dim → Perfect → Aug, Dim → Minor → Major → Aug), an explorer on the Intervals tab,
   reference tables, and a Practice exercise. All spellings come from T.intervalAbove, so letters and accidentals are always right. */
const ORDINAL = ['', 'unison (1st)', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave (8th)'];
const ORD_SHORT = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const Q_SHORT = { d: 'Dim', m: 'Min', M: 'Maj', P: 'Perfect', A: 'Aug' };
const FAMILY_TEXT = { perfect: 'Dim → Perfect → Aug', major: 'Dim → Minor → Major → Aug' };
const an = ord => /^8/.test(ord) ? 'an' : 'a';
const article = name => /^[AEIOU8]/i.test(name) ? 'an' : 'a';
const letterSpan = (r, n) => T.LETTERS.concat(T.LETTERS).slice(r.l, r.l + n).join(' ');
const ivAbove = (r, n, q) => T.intervalAbove(r, n, q);

/* One family as a row of steps, each one fret apart. Clicking a step selects that number and quality. */
function familyLadder(r, number, selQ, selN) {
  const fam = T.intervalFamily(number);
  const steps = T.qualitiesFor(number).map(q => ({ q, x: ivAbove(r, number, q) }));
  return `<div class="ladder" role="group" aria-label="${esc(ORD_SHORT[number])} qualities">${steps.map((st, i) => {
    const on = number === selN && st.q === selQ;
    const body = st.x ? `<b>${esc(st.x.abbr)}</b><span>${esc(T.QUALITY_NAMES[st.q])}</span><em>${esc(st.x.note.name)} · ${st.x.semis} st</em>` : `<b>${esc(st.q + number)}</b><span>${esc(T.QUALITY_NAMES[st.q])}</span><em>needs a triple ♯/♭</em>`;
    return (i ? `<i class="step" aria-hidden="true">+1</i>` : '') + `<button type="button" class="rung${on ? ' is-on' : ''}${st.x ? '' : ' is-na'}" data-act="iqpick" data-n="${number}" data-q="${st.q}" aria-pressed="${on}">${body}</button>`;
  }).join('')}</div><p class="muted ladder-cap">${esc(ORD_SHORT[number])}: <b>${esc(FAMILY_TEXT[fam])}</b>${number === 1 ? ' (no diminished unison: it would be smaller than zero semitones)' : ''}</p>`;
}

function qualityExplorer() {
  const r = rootNote(); const n = S.iqNum; const valid = T.qualitiesFor(n);
  if (!valid.includes(S.iqQual)) S.iqQual = valid.includes('M') ? 'M' : 'P';
  let x = ivAbove(r, n, S.iqQual);
  if (!x) { S.iqQual = valid.find(q => ivAbove(r, n, q)); x = ivAbove(r, n, S.iqQual); }
  const fam = T.intervalFamily(n);
  const all = valid.map(q => ivAbove(r, n, q)).filter(Boolean);
  /* Same sound, other names: every quality of numbers 1–8 above this root with the same semitone count. */
  const enh = [];
  for (let k = 1; k <= 8; k++) T.qualitiesFor(k).forEach(q => { const y = ivAbove(r, k, q); if (y && y.semis === x.semis && y.abbr !== x.abbr) enh.push(y); });
  /* Fretboard: root on the 5th string (6th if it fits better), every quality of this number on the same string. */
  const tun = tuning(); const s = 1; const f = T.mod(r.pc - tun.midi[s]);
  const markers = {}; markers[s + ':' + f] = { cls: 'root', label: r.name, title: `${r.name} (root), string ${6 - s} fret ${f}` };
  /* A 0-semitone interval (P1, d2) shares the root's fret: ring the root instead of covering it. */
  all.forEach(y => { if (y.semis === 0) { if (y.abbr === x.abbr) markers[s + ':' + f].ring = true; return; } markers[s + ':' + (f + y.semis)] = { cls: y.abbr === x.abbr ? 'blue' : 'tone', label: y.abbr, ring: y.abbr === x.abbr, title: `${y.note.name}: ${y.name}, fret ${f + y.semis}` }; });
  const lo = Math.max(0, f - 1), hi = Math.min(24, f + Math.max(...all.map(y => y.semis)) + 1);
  const base = nearMidi(r.pc, 48);
  /* Semitone ruler: 0 to 13 frets, with this number's qualities placed on it. */
  const ruler = range0(0, 13).map(k => { const y = all.find(z => z.semis === k); return `<div class="semi${k === 0 ? ' is-root' : ''}${y ? ' is-on' : ''}${y && y.abbr === x.abbr ? ' is-sel' : ''}"><small>${k}</small><b>${k === 0 ? esc(r.name) : y ? esc(y.note.name) : '·'}</b>${y ? `<em>${esc(y.abbr)}</em>` : ''}</div>`; }).join('');
  const otherN = fam === 'perfect' ? 3 : 5;
  return card('Interval qualities explorer', `
    ${learn('iq-explorer')}
    <div class="row">
      <label>Root <select data-set="root" aria-label="Root note">${opt(T.ROOTS, S.root)}</select></label>
      <label>Interval number <select data-set="iqNum" data-num>${opt(range0(1, 8).map(k => ({ v: k, l: ORDINAL[k] })), n)}</select></label>
    </div>
    <div class="chips" role="group" aria-label="Quality">${valid.map(q => `<button type="button" class="chip${q === S.iqQual ? ' is-on' : ''}" data-act="iqpick" data-n="${n}" data-q="${q}"${ivAbove(r, n, q) ? '' : ' disabled'}>${esc(Q_SHORT[q])}</button>`).join('')}</div>
    <div class="result" aria-live="polite">${esc(r.name)} → <b>${esc(x.note.name)}</b>: <b>${esc(x.name)}</b> (${esc(x.abbr)}), ${x.semis} semitone${x.semis === 1 ? '' : 's'} = ${x.semis} fret${x.semis === 1 ? '' : 's'}</div>
    <p class="muted">Number: ${esc(letterSpan(r, n))} = ${n} letter${n === 1 ? '' : 's'}${n === 8 ? ' (the same letter again)' : ''}. Quality: ${x.semis} semitones, where a ${fam === 'perfect' ? 'perfect' : 'major'} ${esc(ORD_SHORT[n])} is ${ivAbove(r, n, fam === 'perfect' ? 'P' : 'M') ? ivAbove(r, n, fam === 'perfect' ? 'P' : 'M').semis : '—'}.</p>
    <div class="row"><button class="btn" type="button" data-act="playint" data-a="${base}" data-b="${base + x.semis}">Play melodic</button><button class="btn ghost" type="button" data-act="playint" data-a="${base}" data-b="${base + x.semis}" data-h="1">Play together</button></div>
    <h3>The two families</h3>
    <div class="ladders"><div>${familyLadder(r, fam === 'perfect' ? n : otherN, S.iqQual, n)}</div><div>${familyLadder(r, fam === 'major' ? n : 3, S.iqQual, n)}</div></div>
    <p class="muted">Each “+1” step is one semitone: one fret. There is nothing between minor and major: they are neighbours.</p>
    <h3>Semitones from ${esc(r.name)} (frets on one string)</h3><div class="semis iq-ruler">${ruler}</div>
    <h3>On the fretboard</h3><p class="muted">Every ${esc(ORD_SHORT[n])} above ${esc(r.name)} on string ${6 - s}. Change the quality and the target moves one fret; the letter stays ${esc(T.LETTERS[x.note.l])}.${x.semis === 0 ? ` ${esc(x.abbr)} is 0 semitones, so it is the same fret as the root (ringed).` : ''}</p>
    ${fretboardBlock('iq', markers, { min: lo, max: Math.max(hi, lo + 4), fixedRange: true, noTools: true, spell: speller([r].concat(all.map(y => y.note))), label: `${ORD_SHORT[n]} qualities above ${r.name}` })}
    ${enh.length ? `<div class="note"><b>Same sound, different name.</b> ${x.semis} semitones above ${esc(r.name)} is also ${enh.map(y => `<b>${esc(y.abbr)}</b> (${esc(r.name)} → ${esc(y.note.name)}, ${esc(y.name.toLowerCase())})`).join(' and ')}. These are <i>enharmonic</i> intervals: the same fret, different letters. The letter decides the name, and the name shows the note’s job in the scale or chord.</div>` : ''}`, 'iq-card');
}

function qualityLesson() {
  const C = T.parseNote('C');
  const cell = (n, q) => { const x = ivAbove(C, n, q); return x ? `${esc(x.abbr)} · ${x.semis} <span class="muted">(C→${esc(x.note.name)})</span>` : '—'; };
  const perfRows = [1, 4, 5, 8].map(n => [`<b>${esc(ORD_SHORT[n])}</b>`, n === 1 ? '<span class="muted">not used</span>' : cell(n, 'd'), cell(n, 'P'), cell(n, 'A')]);
  const majRows = [2, 3, 6, 7].map(n => [`<b>${esc(ORD_SHORT[n])}</b>`, cell(n, 'd'), cell(n, 'm'), cell(n, 'M'), cell(n, 'A')]);
  const bySemi = range0(0, 13).map(k => { const list = []; for (let n = 1; n <= 8; n++) T.qualitiesFor(n).forEach(q => { const x = ivAbove(C, n, q); if (x && x.semis === k) list.push(x); }); return list; });
  const COMMON = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
  const allRows = bySemi.map((list, k) => [String(k), list.filter(x => COMMON.includes(x.abbr)).map(x => `<b>${esc(x.abbr)}</b> C→${esc(x.note.name)}`).join(', ') || '—', list.filter(x => !COMMON.includes(x.abbr)).map(x => `${esc(x.abbr)} C→${esc(x.note.name)}`).join(', ') || '—']);
  const pairs = [['C', 'D♯'], ['C', 'E♭'], ['C', 'F♯'], ['C', 'G♭']].map(([a, b]) => { const r = T.intervalBetween(a, 4, b, 4); return [`${a} → ${b}`, `<b>${esc(r.name)}</b> (${esc(r.abbr)})`, String(r.semis), `${a}–${b[0]}: ${r.number} letters`, playBtn(T.midiOf(a, 4), T.midiOf(b, 4))]; });
  return card('Why interval qualities exist', `
    ${learn('iq-why')}
    ${fold('iq:1', '<span class="stepn">1</span>Number and quality are two different things', `<p>Every interval name has two parts. The <b>number</b> counts letter names, including the first: C to E is C D E = a <b>3rd</b>. The <b>quality</b> (minor, major…) comes from the exact number of <b>semitones</b> (frets): C to E is 4 semitones, so it is a <b>major</b> 3rd.</p><p>So “3rd” does not mean 3 semitones. A 3rd can be 2, 3, 4 or 5 semitones depending on its quality, and 3 semitones can be a 3rd or a 2nd depending on the letters.</p>`)}
    ${fold('iq:2', '<span class="stepn">2</span>The two families', `<div class="fam-cards"><div class="trick"><b>Perfect family: 1st, 4th, 5th, 8th</b><p class="seq big">Dim → Perfect → Aug</p><ul class="compact"><li>Perfect is the normal size (P4 = 5, P5 = 7).</li><li>Diminished = 1 semitone smaller. Augmented = 1 semitone larger.</li><li>These intervals are never called major or minor.</li><li>Unison: a diminished unison would be smaller than zero, so it is not used. An augmented unison (C → C♯, 1 semitone) does exist.</li></ul></div>
      <div class="trick"><b>Major/minor family: 2nd, 3rd, 6th, 7th</b><p class="seq big">Dim → Minor → Major → Aug</p><ul class="compact"><li>Major is the size found in the major scale (M3 = 4, M6 = 9).</li><li>Minor = 1 semitone smaller than major.</li><li>Diminished = 1 semitone smaller than minor. Augmented = 1 semitone larger than major.</li><li>Minor and major are next to each other: there is <b>no quality between them</b>.</li><li>These intervals are never called perfect.</li></ul></div></div>
      <p>Each step in both families is exactly one semitone: one fret on the guitar.</p>`, true)}
    ${fold('iq:3', '<span class="stepn">3</span>Same sound, different name', `${table(['Notes', 'Interval', 'Semitones', 'Letters', ''], pairs)}<p>On a normally tuned guitar C–D♯ and C–E♭ are the <b>same fret</b>, and so are C–F♯ and C–G♭. They sound identical when played alone. The names differ because the letters differ, and the letter tells you what job the note is doing:</p><ul class="compact"><li><b>E♭</b> is the minor 3rd of C: it is the note that makes C minor (C E♭ G).</li><li><b>D♯</b> is a raised 2nd: it usually leads up to E, as in a melody C D D♯ E.</li><li><b>F♯</b> is the raised 4th of C Lydian, or the leading note into G.</li><li><b>G♭</b> is the lowered 5th of C diminished (C E♭ G♭) and the “blue” ♭5 in blues.</li></ul>`)}
    ${fold('iq:4', '<span class="stepn">4</span>Why augmented and diminished are needed', `<p>Scales and chords use each letter in order: one A, one B, one C… This rule keeps every note’s job readable (the 3rd is always some kind of E over C, the 5th always some kind of G). Sometimes a note has to be raised or lowered past minor or major, or past perfect, and the letter must stay. That is when augmented and diminished names appear:</p>
      ${table(['Where', 'Notes', 'Interval', 'Why that name'], [
        ['A harmonic minor', 'A B C D E F G♯', `F → G♯: <b>${esc(T.intervalBetween('F', 4, 'G♯', 4).abbr)}</b> (3 st)`, 'G♯ is the 7th degree, so it keeps the letter G. A♭ would skip G and repeat A.'],
        ['C augmented chord', 'C E G♯', `C → G♯: <b>${esc(T.intervalBetween('C', 4, 'G♯', 4).abbr)}</b> (8 st)`, 'The chord’s 5th is raised. Calling it A♭ (m6) would hide that it is a 5th.'],
        ['B diminished chord', 'B D F', `B → F: <b>${esc(T.intervalBetween('B', 3, 'F', 4).abbr)}</b> (6 st)`, 'The vii° chord of C major. Its 5th is one semitone smaller than perfect.'],
        ['C diminished 7th', 'C E♭ G♭ B𝄫', `C → B𝄫: <b>${esc(T.intervalBetween('C', 4, 'B𝄫', 4).abbr)}</b> (9 st)`, 'It sounds like a major 6th (A), but it is the chord’s 7th, so it uses the letter B.'],
        ['F Lydian / C major', 'F G A B', `F → B: <b>${esc(T.intervalBetween('F', 4, 'B', 4).abbr)}</b> (6 st)`, 'The raised 4th gives Lydian its bright sound.'],
        ['A blues scale', 'A C D E♭ E G', `A → E♭: <b>${esc(T.intervalBetween('A', 3, 'E♭', 4).abbr)}</b> (6 st)`, 'The blue note sits between the 4th and the 5th, written as a lowered 5th.']])}
      <p class="note"><b>Augmented does not always mean ♯, and diminished does not always mean ♭.</b> The quality describes the distance, not the symbol. D♭ → G is an augmented 4th with a natural G; C♯ → G is a diminished 5th with a natural G; E → B♭ is a diminished 5th and B♭ → E is an augmented 4th.</p>
      <p class="note"><b>Intervals are not chords.</b> An augmented or diminished <i>interval</i> is the distance between two notes. An augmented or diminished <i>chord</i> is a three-note chord: the augmented triad (1 3 ♯5) contains an augmented 5th, and the diminished triad (1 ♭3 ♭5) contains a diminished 5th.</p>`)}
    ${fold('iq:5', '<span class="stepn">5</span>How guitarists use this', `<ul class="compact"><li><b>Chord quality:</b> the 3rd decides major or minor. Lower a major 3rd by one fret and the chord becomes minor.</li><li><b>Power chords</b> are a perfect 5th: no 3rd, so neither major nor minor.</li><li><b>Solos:</b> the minor 3rd is the sound of minor pentatonic; bending it a quarter-tone toward the major 3rd is the classic blues bend. The ♭5 (diminished 5th) is the blue note.</li><li><b>Altered chords:</b> 7♯5 and 7♭5 chords raise or lower the 5th by one fret; 7♯9 (the “Hendrix chord”) contains an augmented 9th that sounds like a minor 3rd on top of a major 3rd.</li><li><b>Neoclassical and metal:</b> the augmented 2nd of harmonic minor (3 frets on one string) gives the exotic leap.</li><li><b>Diminished 7th chords:</b> the shape repeats every 3 frets because every interval inside is 3 semitones.</li></ul>`)}
    ${fold('iq:6', 'Reference: perfect family', table(['Number', 'Diminished', 'Perfect', 'Augmented'], perfRows) + '<p class="muted">Each cell: name · semitones (example from C).</p>')}
    ${fold('iq:7', 'Reference: major/minor family', table(['Number', 'Diminished', 'Minor', 'Major', 'Augmented'], majRows) + '<p class="muted">Each cell: name · semitones (example from C). Interval numbers count letters; semitones count frets.</p>')}
    ${fold('iq:8', 'Reference: every name for 0–13 semitones', table(['Semitones', 'Common names', 'Less common enharmonic names'], allRows) + '<p class="muted">Rare names such as d2 (C→D𝄫, 0 semitones) or A7 (C→B♯, 12 semitones) appear mainly when a scale or chord forces the letter. The 0–12 cheat sheet above lists the everyday names.</p>')}`, 'iq-why-card');
}
actions.iqpick = el => { S.iqNum = +el.dataset.n; S.iqQual = el.dataset.q; render(); const c = document.querySelector('.iq-card .result'); if (c) status(c.textContent); };
actions.goiq = () => { switchView('intervals'); const c = document.querySelector('.iq-card'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); };

Object.assign(LEARN, {
  'iq-explorer': { what: 'Pick a root, an interval number and a quality to see the exact note, its semitones and where it sits on the neck.', why: 'Seeing every quality of one number side by side shows that each quality is just one fret away from the next.', where: 'Building chords (3rds and 7ths), altering chords (♭5, ♯5), reading scale formulas.', how: r => { const a = ivAbove(r, 3, 'M'), b = ivAbove(r, 3, 'm'); return `${esc(r.name)} → ${esc(a.note.name)} is a major 3rd (4 frets). Move it down one fret to ${esc(b.note.name)}: same letter, now a minor 3rd (3 frets).`; }, tip: 'Remember two patterns: Dim → Perfect → Aug for 1, 4, 5, 8 and Dim → Minor → Major → Aug for 2, 3, 6, 7.', see: [['tip:reference', 'Interval reference']] },
  'iq-why': { what: 'Interval qualities say exactly how big an interval is, while the number says which letter it lands on.', why: 'Two intervals can sound the same but do different jobs. The name tells you which note of the scale or chord you are playing.', where: 'Chord spelling, scale formulas, analysing progressions and melodies, reading charts.', how: () => 'Count letters for the number, count semitones for the quality, then read the quality off the family ladder.', tip: 'Learn it in the order below: number vs quality, the two families, same sound different name, then why we need augmented and diminished.', see: [] }
});

/* ---------- Practice: interval qualities (added to the existing Practice tab) ---------- */
EXERCISES.push(['quality', 'Interval qualities (Dim / Min / Maj / Perfect / Aug)']);
const QCONCEPTS = [
  () => ({ prompt: 'Which interval family contains <b>minor and major</b>?', right: '2nds, 3rds, 6ths and 7ths', whyWrong: { 'Unisons, 4ths, 5ths and octaves': 'Those are the perfect family: Dim → Perfect → Aug. They are never called major or minor.', 'All intervals': '4ths, 5ths, unisons and octaves are never major or minor.', 'Only 3rds': '2nds, 6ths and 7ths are also major or minor (M2, m6, m7…).' }, explain: 'Major/minor family = 2, 3, 6, 7: Dim → Minor → Major → Aug.' }),
  () => { const n = rnd([2, 3, 4, 5, 6, 7]); const perf = T.intervalFamily(n) === 'perfect'; const right = perf ? 'Diminished, Perfect, Augmented' : 'Diminished, Minor, Major, Augmented';
    return { prompt: `Which qualities can a <b>${ORD_SHORT[n]}</b> have?`, right, whyWrong: { 'Diminished, Perfect, Augmented': `A ${ORD_SHORT[n]} is in the major/minor family, so it is never “perfect”.`, 'Diminished, Minor, Major, Augmented': `A ${ORD_SHORT[n]} is in the perfect family, so it is never major or minor.`, 'Minor and Major only': 'Every number can also be diminished or augmented when a scale or chord needs it.', 'Perfect only': 'Perfect is only the normal size; diminished and augmented exist one semitone either side.' }, explain: `${ORD_SHORT[n]}: ${FAMILY_TEXT[T.intervalFamily(n)]}.` }; },
  () => ({ prompt: 'Why are <b>C–D♯</b> and <b>C–E♭</b> different interval names?', right: 'The letters differ: C–D is a 2nd, C–E is a 3rd', whyWrong: { 'They are different numbers of semitones': 'Both are 3 semitones: the same fret on the guitar.', 'D♯ is a higher pitch than E♭': 'On a guitar (equal temperament) they are exactly the same pitch.', 'One goes up and the other goes down': 'Both go up from C. Direction is separate from the name.' }, explain: 'C–D♯ = augmented 2nd, C–E♭ = minor 3rd: same 3 semitones, different letters, different jobs.' }),
  () => ({ prompt: 'Why do we use <b>augmented and diminished</b> intervals?', right: 'So every note keeps its correct letter in a scale or chord', whyWrong: { 'To describe notes that are out of tune': 'They are perfectly in tune; on guitar they are ordinary frets.', 'Because they sound different from major and minor intervals': 'Enharmonic intervals sound the same (A2 = m3 on the guitar). The name shows the job, not a new sound.', 'Augmented always means ♯ and diminished always means ♭': 'Not true: D♭ → G is an augmented 4th with a natural G.' }, explain: 'Example: A harmonic minor uses G♯ (its 7th degree), so F → G♯ is an augmented 2nd, not a minor 3rd.' }),
  () => ({ prompt: 'Is there an interval quality <b>between minor and major</b>?', right: 'No, they are one semitone apart', whyWrong: { 'Yes, perfect': 'Perfect belongs only to unisons, 4ths, 5ths and octaves.', 'Yes, diminished': 'Diminished is one semitone smaller than minor, not between minor and major.', 'Yes, augmented': 'Augmented is one semitone larger than major.' }, explain: 'Dim → Minor → Major → Aug: every step is one fret.' }),
  () => ({ prompt: 'Does an <b>augmented</b> interval always end on a note with a ♯?', right: 'No: D♭ → G is an augmented 4th with a natural G', whyWrong: { 'Yes, augmented means sharp': 'The quality is about distance, not the symbol. D♭ → G is 6 semitones over 4 letters = A4.', 'Only on the guitar': 'Interval names are the same on every instrument.', 'Only in minor keys': 'Augmented intervals appear in major keys too (F → B in C major is A4).' }, explain: 'Augmented = one semitone larger than perfect or major, whatever accidental that needs.' }),
  () => ({ prompt: 'How is a <b>diminished interval</b> different from a <b>diminished chord</b>?', right: 'The interval is two notes; the chord is three notes (1 ♭3 ♭5)', whyWrong: { 'They are the same thing': 'A diminished chord contains a diminished 5th, but it also has a minor 3rd.', 'A diminished chord has only two notes': 'A diminished triad has three notes, e.g. B D F.', 'Diminished intervals are always 6 semitones': 'Only the diminished 5th (and A4) is 6; a d3 is 2, a d7 is 9.' }, explain: 'B diminished = B D F. Inside it, B → F is a diminished 5th.' })
];
GEN.quality = level => {
  const types = ['step', 'concept'].concat(level !== 'beginner' ? ['name'] : []).concat(level === 'advanced' ? ['build'] : []);
  const type = rnd(types); const spec = { ex: 'quality' };
  const hint = 'Perfect family (1 4 5 8): Dim → Perfect → Aug. Major/minor family (2 3 6 7): Dim → Minor → Major → Aug. Each step is one semitone.';
  if (type === 'concept') { const c = rnd(QCONCEPTS)(); const choices = shuffle([c.right].concat(Object.keys(c.whyWrong).filter(k => k !== c.right))).slice(0, 4); if (!choices.includes(c.right)) choices[0] = c.right; return { kind: 'choice', prompt: c.prompt, right: c.right, choices: shuffle(choices), explain: c.explain, whyWrong: c.whyWrong, hint, spec }; }
  if (type === 'step') {
    const n = rnd(level === 'beginner' ? [3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8]); const C = T.parseNote('C'); const qs = T.qualitiesFor(n);
    const baseQ = T.intervalFamily(n) === 'perfect' ? 'P' : rnd(['M', 'm']); const askQ = rnd(qs.filter(q => q !== baseQ && (level !== 'beginner' || Math.abs(T.intervalAbove(C, n, q).semis - T.intervalAbove(C, n, baseQ).semis) === 1)));
    const b = T.intervalAbove(C, n, baseQ), a = T.intervalAbove(C, n, askQ); const right = String(a.semis);
    const whyWrong = {}; range0(Math.max(0, a.semis - 3), a.semis + 3).forEach(k => { if (String(k) === right) return; const other = qs.map(q => T.intervalAbove(C, n, q)).find(y => y.semis === k); whyWrong[String(k)] = other ? `${k} semitones is the ${other.name.toLowerCase()} (${other.abbr}), not the ${a.name.toLowerCase()}.` : `No ${ORD_SHORT[n]} in the ${T.intervalFamily(n) === 'perfect' ? 'perfect' : 'major/minor'} family is ${k} semitones.`; });
    const d = a.semis - b.semis;
    return { kind: 'choice', prompt: `If ${article(b.name)} <b>${esc(b.name.toLowerCase())}</b> (${esc(b.abbr)}) is <b>${b.semis}</b> semitone${b.semis === 1 ? '' : 's'}, how many semitones is ${article(a.name)} <b>${esc(a.name.toLowerCase())}</b> (${esc(a.abbr)})?`, right, choices: choicesFrom(right, Object.keys(whyWrong)), explain: `${esc(FAMILY_TEXT[T.intervalFamily(n)])}: ${esc(a.abbr)} is ${Math.abs(d)} step${Math.abs(d) === 1 ? '' : 's'} ${d > 0 ? 'larger' : 'smaller'} than ${esc(b.abbr)}, so ${b.semis} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${a.semis}. From C: ${esc(b.note.name)} → ${esc(a.note.name)}.`, whyWrong, hint, spec };
  }
  const root = T.parseNote(rnd(ROOTS_BY_LEVEL[level])); let n, q, x, tries = 0;
  do { n = 2 + Math.floor(Math.random() * 7); q = rnd(T.qualitiesFor(n)); x = T.intervalAbove(root, n, q); } while ((!x || (level === 'intermediate' && Math.abs(x.note.a) > 1)) && ++tries < 50);
  const same = []; for (let k = 1; k <= 8; k++) T.qualitiesFor(k).forEach(qq => { const y = T.intervalAbove(root, k, qq); if (y && y.semis === x.semis && y.abbr !== x.abbr) same.push(y); });
  if (type === 'name') {
    const pool = T.qualitiesFor(n).map(qq => T.intervalAbove(root, n, qq)).filter(Boolean).concat(same); const whyWrong = {};
    pool.forEach(y => { if (y.abbr === x.abbr) return; whyWrong[y.abbr] = y.number !== n ? `${y.abbr} has the same ${x.semis} semitones, but it would be spelled ${esc(y.note.name)} (letters ${esc(letterSpan(root, y.number))}).` : `${y.abbr} would be ${y.semis} semitones (${esc(y.note.name)}); ${esc(root.name)} → ${esc(x.note.name)} is ${x.semis}.`; });
    return { kind: 'choice', prompt: `What is the interval from <b>${esc(root.name)}</b> up to <b>${esc(x.note.name)}</b>?`, audio: [T.midiOf(root, 3), T.midiOf(root, 3) + x.semis], right: x.abbr, choices: choicesFrom(x.abbr, Object.keys(whyWrong)), explain: `Letters ${esc(letterSpan(root, n))} = ${ORD_SHORT[n]}; ${x.semis} semitones = ${esc(x.name.toLowerCase())}.`, whyWrong, hint: 'Count letters first (the number), then semitones (the quality).', spec };
  }
  const whyWrong = {}; const alt = T.pcName(x.note.pc, x.note.a > 0 ? 'flat' : 'sharp');
  if (alt !== x.note.name) whyWrong[alt] = `${esc(alt)} is the same fret, but its letter makes it a different interval${same.find(y => y.note.name === alt) ? ' (' + esc(same.find(y => y.note.name === alt).abbr) + ')' : ''}.`;
  same.forEach(y => { if (y.note.name !== x.note.name) whyWrong[y.note.name] = `${esc(y.note.name)} sounds the same but would be the ${esc(y.name.toLowerCase())}.`; });
  T.qualitiesFor(n).forEach(qq => { const y = T.intervalAbove(root, n, qq); if (y && y.note.name !== x.note.name) whyWrong[y.note.name] = `${esc(y.note.name)} is the ${esc(y.name.toLowerCase())} (${y.semis} semitones).`; });
  return { kind: 'choice', prompt: `What note is ${article(x.name)} <b>${esc(x.name.toLowerCase())}</b> (${esc(x.abbr)}) above <b>${esc(root.name)}</b>?`, audio: [T.midiOf(root, 3), T.midiOf(root, 3) + x.semis], right: x.note.name, choices: choicesFrom(x.note.name, Object.keys(whyWrong)), explain: `${an(ORD_SHORT[n]) === 'an' ? 'An' : 'A'} ${esc(ORD_SHORT[n])} uses the letter ${esc(T.LETTERS[x.note.l])} (${esc(letterSpan(root, n))}); ${x.semis} semitones above ${esc(root.name)} on that letter is ${esc(x.note.name)}.`, whyWrong, hint: 'Find the letter first by counting, then add ♯ or ♭ until the semitones match.', spec };
};
