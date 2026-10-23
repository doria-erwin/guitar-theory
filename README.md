# Guitar Theory Explorer

An interactive guitar music-theory reference and practice app. One HTML file, no internet, no backend.

## Open it

**`index.html` is the whole app.** Open it in Safari, Chrome, Firefox or Edge.

- **iPhone / iPad:** save the file to the Files app, then tap it in Files (it opens in Safari's viewer) or share it to Safari. Chat and mail apps that only *preview* HTML do not run JavaScript; they show the page's fallback notice and a short reference table instead. No web page can override that, so use a real browser.
- **Computer:** double-click `index.html`.
- Sound starts after your first tap (browser rule). On iPhone, the ring/silent switch mutes web audio.

Settings and practice scores are saved in the browser (localStorage). If storage is blocked (private mode, some previews), the app still works and says that progress lasts only for the session.

## What's inside

| Tab | What it does |
|---|---|
| Fretboard | Frets 0–24, any tuning, all notes / root / a scale / a chord; colour by interval; tap to hear; full-screen |
| Scales | 14 scales; formula, notes, semitones, steps, character notes, mode parent, relative key; 7 three-notes-per-string patterns, 5 CAGED positions, 5 pentatonic boxes (blues = boxes + blue note); suggested fingering; tonic-chord rings; playback |
| Intervals | Unison to 13th, semitones, string-to-string shapes, letter-aware calculator (C–D♯ vs C–E♭) |
| Chord builder | 31 chord types; the 3-step method and semitone method shown step by step; chord tones on the neck; checked voicings; formula library, degree→semitone table, same formula in all 12 keys |
| Name a chord | Pick notes (buttons or fretboard) and a bass note; lists every matching name, slash chords, and explains ambiguity |
| Chord shapes | Open, barre, power, 7th, extended and altered shapes with fingers, barres, mutes, roots, playback |
| Inversions | Root/1st/2nd/3rd, slash symbols, close and drop-2 voicings on each string set, compare by ear |
| Arpeggios | 8 qualities × 5 CAGED positions, up/down playback, practice ideas |
| Keys & circle | Interactive circle of fifths, signatures, relative and parallel keys, diatonic triads and 7ths with diagrams, minor harmonization, modes, progressions, all-key tables |
| Progressions | 14 progressions in any key, tempo, beats per chord, loop, current chord highlighted |
| Rhythm | Note values and rests, 8 time signatures with correct grouping (6/8 in two, 7/8 as 2+2+3), metronome with accents and subdivisions, tap tempo, playable examples, counting quiz |
| Techniques | 11 techniques with notation, tab and synthesized demos (labelled as approximations) |
| Harmony | 9/11/13, alterations, secondary dominants, modal interchange, tritone substitution, spelling rules |
| Practice | 10 exercise types × 3 levels, instant feedback, scores, review of missed questions, reset |
| Basics | Strings and tuning, every note frets 0–12, sharps/flats/enharmonics, tips, and a map from every cheat-sheet section to its tab |

## Source layout

```
src/theory.js            music theory engine (pure functions; runs in browser and Node)
src/audio.js             Web Audio: plucked strings, lookahead scheduler, metronome, technique demos
src/render.js            SVG renderers: fretboard, chord box, circle of fifths, note glyphs
src/app.js               state, persistence, helpers, delegated events, boot and error handling
src/views.js, views2.js  one render function per tab
src/practice.js          practice generators and scoring
src/styles.css           dark and light themes
src/index.template.html  page shell and no-JavaScript fallback
build.js                 inlines everything into dist/index.html
tests/theory.test.js     engine tests (Node built-in test runner)
tests/e2e.py             browser tests (Playwright)
```

Scales, chords, progressions and tunings are data tables in `theory.js`. Positions, voicings, inversions and diatonic chords are computed from them, never hard-coded per key.

## Build and test

```
node build.js                      # writes dist/index.html
node --test tests/theory.test.js   # 26 engine tests
python3 tests/e2e.py               # browser tests (pip install playwright; playwright install chromium)
```

The engine tests check every root (17 spellings) against every scale and chord, and every tuning (7 presets plus 2 custom) against every scale position and chord voicing.
