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
| Mobile layout, no page-wide horizontal scroll, light mode | Done | E (all 15 tabs, 3 viewports), V |
| No console errors; no undefined/NaN in UI or SVG | Done | E |
| Audio starts and stops cleanly; timers cleared on view change | Done | E |
| Safari (iOS/macOS) and Firefox | Not automatically tested | Browsers unavailable in the build environment; standard APIs only, with iPhone-specific fallbacks |
