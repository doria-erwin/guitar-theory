# Feature completeness checklist

Status key: **Done** = implemented and tested. **Done (approx.)** = implemented; the audio is a synthesized approximation.
Tests: **U** = engine unit test (`tests/theory.test.js`), **E** = browser test (`tests/e2e.py`, Chromium desktop 1280×900, iPhone 390×844 and 844×390), **V** = checked visually from screenshots.

## Sheet 1: Guitar Music Theory Cheat Sheet (23 sections)

| § | Section | Status | Where | Tested |
|---|---|---|---|---|
| 1 | Guitar basics | Done | Basics | E, V |
| 2 | Notes on the fretboard | Done | Fretboard (Show: All notes); Basics | U (every cell = tuning + fret, all tunings), E (drop D relabels) |
| 3 | Sharps & flats, enharmonics | Done | Basics; spelling engine everywhere | U (letter spelling, 𝄪/𝄫) |
| 4 | Intervals | Done | Intervals | U, E (calculator) |
| 5 | Rhythm & note values, time signatures | Done | Rhythm | E (metronome start/stop, beat light), V |
| 6 | Scales (major, natural/harmonic/melodic minor) | Done | Scales | U (formulas, positions), E |
| 7 | Pentatonic | Done | Scales → Major/Minor Pentatonic | U (box 1 reference shape) |
| 8 | Blues scale | Done | Scales → Minor/Major Blues | U (6 notes, 5 boxes), E (2 blue notes in box 1) |
| 9 | Minor pentatonic positions | Done | Scales → Minor Pentatonic → Box 1–5 | U, E |
| 10 | Modes from the major scale | Done | Keys & circle → Modes; Scales (each mode) | U (modes, parent keys) |
| 11 | Circle of fifths | Done | Keys & circle | E (tap segment updates key), V |
| 12 | Chord construction | Done | Chord builder | U, E |
| 13 | Open chords | Done | Chord shapes → Open chord library | U (textbook shapes) |
| 14 | Barre chords (E/A shape, major/minor) | Done | Chord shapes → Barre chords | U (playability, chord tones) |
| 15 | Arpeggios | Done | Arpeggios | U (only chord tones, all tones, 5 positions) |
| 16 | Inversions | Done | Inversions | U (bass note, tones), V |
| 17 | Power chords | Done | Chord shapes → Power chord (incl. drop-tuning one-finger) | U |
| 18 | Common progressions | Done | Progressions | U (spelling), E (playback highlight, stop) |
| 19 | Diatonic chords | Done | Keys & circle | U (C major triads/7ths, A minor) |
| 20 | Key signatures | Done | Keys & circle → Key signatures | U, E (E♭ = 3 flats, B♭ = 2 flats) |
| 21 | Relative keys | Done | Keys & circle; Practice → Relative | U |
| 22 | Advanced harmony | Done | Harmony | U (secondary dominants, tritone sub, borrowed chords) |
| 23 | Guitar techniques | Done (approx.) | Techniques | E (renders); demos checked by ear only |

## Sheet 2: Chord Building Cheat Sheet (9 sections)

| § | Section | Status | Where | Tested |
|---|---|---|---|---|
| 1 | The 3-step method | Done | Chord builder, steps 1–3 | U (all roots × all chords), E |
| 2 | The semitone method | Done | Chord builder → The semitone method | U |
| 3 | Degree → semitones | Done | Chord builder → Reference | U |
| 4 | Chord formula library | Done (31 types, all on the sheet plus extras) | Chord builder → Reference | U |
| 5 | Major scales in all 12 keys | Done | Keys & circle → Major scales in all 12 keys | U (14-key reference table) |
| 6 | Same formula, any key (incl. E7♯9 = F𝄪) | Done | Chord builder → Reference | U |
| 7 | Cm7 on the fretboard, A- and E-shape Cm7 | Done | Chord builder (root C, Minor 7) | U (x35343, 8 10 8 8 8 8), V |
| 8 | Guitar tips | Done | Basics → Guitar tips | E (renders) |
| 9 | Reverse it: name a chord | Done | Name a chord | U, E (C E G A → C6 and Am7) |

## Prompt requirements beyond the sheets

| Requirement | Status | Notes |
|---|---|---|
| Tunings: E, E♭, Drop D, D, Drop C♯, Drop C, Drop B, custom | Done | U, E |
| 7 3NPS, 5 CAGED, 5 boxes; navigation; fingers; chord rings | Done | U (counts for every root, scale and tuning), E |
| Practice: 10 exercises, 3 levels, feedback, score, review, saved, reset | Done | E (answer hidden before submit, score, persistence) |
| Mobile layout, no page-wide horizontal scroll, light mode | Done | E (all 16 tabs, 3 viewports), V |
| No console errors; no undefined/NaN in UI or SVG | Done | E |
| Audio starts and stops cleanly; timers cleared on view change | Done | E |
| Safari (iOS/macOS) and Firefox | Not automatically tested | Browsers unavailable in the build environment; standard APIs only, with iPhone-specific fallbacks |

## Learning companion additions

| Requirement | Status | Where | Tested |
|---|---|---|---|
| Tips & Tricks tab, 9 sections in learning order | Done | Tips & Tricks | E (opens, every section expands, links jump to sections), V |
| Interval groups 0–5–7–12 / 2–4–9–11 / 1–3–8–10 / tritone | Done | Tips & Tricks §1; Practice → Interval memorization groups | U (semitone counts), E |
| Ascending vs descending | Done | Tips & Tricks §3; Intervals calculator; Practice → Ascending and descending | U (C4→E4 M3 +4 … G4→C4 P5 −7, all roots), E |
| Interval inversions | Done | Tips & Tricks §4; Practice → Interval inversions; `T.invertInterval` | U (numbers add to 9, qualities swap, semitones add to 12) |
| Major / natural minor construction | Done | Tips & Tricks §5; Practice → Build a scale | U (minor = major with ♭3 ♭6 ♭7, all roots) |
| Triads and triad inversions | Done | Tips & Tricks §6; Practice → Triad qualities | U (0-4-7, 0-3-7, 0-3-6, 0-4-8) |
| Major and natural minor chord families | Done | Tips & Tricks §7; Practice → Chord families | U (qualities in every major key and 11 minor keys) |
| Fretboard shortcuts, octave shapes, G–B exception | Done | Tips & Tricks §8; Practice → Intervals on the fretboard | U (octave offsets 2,2,3,3; string gaps) |
| What / Why / Where / How / Tip on every tab and main section | Done | All tabs | E (every tab has an intro; panels expand; no undefined/NaN with roots A, E♭, F♯) |
| Practice hints | Done | Practice → Show hint | E |
| Existing settings and practice progress kept | Done | — | E (pre-seeded settings and stats survive reload and new drills) |
| Interval qualities: two families, explorer, fretboard, enharmonic intervals | Done | Intervals → Interval qualities explorer, Why interval qualities exist; `T.intervalAbove`, `T.qualitiesFor` | U (every root × number × quality agrees with the interval calculator; one semitone per step; no d1; C–D♯/C–E♭, C–F♯/C–G♭; D♭→G = A4, C♯→G = d5), E (explorer: result, ladder and fretboard distance for 7 roots × all numbers × qualities) |
| Interval quality reference tables (perfect, major/minor, every name 0–13) | Done | Intervals → Why interval qualities exist | E |
| Interval quality drills with per-answer explanations | Done | Practice → Interval qualities | E (every wrong choice has an explanation; 3 levels; old scores kept) |

## Quiz audit

| Check | Status | Tested |
|---|---|---|
| Every Practice exercise (all levels and interval groups) and every tab quiz (all modes, all roots, scales, chords, inversions, arpeggios, progressions, two tunings) has its answer among unique choices, exactly one correct choice by an independent answer key, writable spellings (no triple ♯/♭), and explanations that state the answer | Done | `tests/quiz.test.js` (seeded; 8 seeds × ~33,000 questions clean); browser checks |
| Interval naming uses letters for the number and semitones for the quality, ascending and descending, enharmonic spellings, compounds | Done | U (every quality from 35 spelled roots, up and down; 9th–13th; A → C / C♯ / C𝄪 / C♭ / D / D♯ / E♭) |
| Saved data compatibility | Done | Review questions saved by the old interval generators are dropped on load; scores and settings are kept (U, E) |
