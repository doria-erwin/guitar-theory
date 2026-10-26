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
| Intervals | Unison to 13th, semitones, string-to-string shapes, interval qualities explorer (root, number 1st–8th, valid qualities only, both families Dim → Perfect → Aug and Dim → Minor → Major → Aug, fret ruler, fretboard), why qualities exist, quality reference tables, letter-aware calculator (C–D♯ vs C–E♭) |
| Scales | 14 scales; formula, notes, semitones, steps, character notes, mode parent, relative key; 7 three-notes-per-string patterns, 5 CAGED positions, 5 pentatonic boxes (blues = boxes + blue note); suggested fingering; tonic-chord rings; playback |
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
| Tips & Tricks | Learning reference in order: interval groups (0–5–7–12, 2–4–9–11, 1–3–8–10, tritone), full interval reference, ascending vs descending, interval inversions, major/minor scale patterns, triads, chord families, fretboard shortcuts (octave and interval shapes, power chords), 20 quick tips; each section links to its tool and Practice drill |
| Practice | 18 exercise types × 3 levels (interval groups, direction, inversions, scale building, triads, chord families, fretboard intervals and interval qualities added; quality questions explain each wrong answer), hints, instant feedback, scores, review of missed questions, reset |
| Basics | Strings and tuning, every note frets 0–12, sharps/flats/enharmonics, tips, and a map from every cheat-sheet section to its tab |

Every tab opens with a short “About this tab” explanation (what it is, why it matters, where it’s used, how it works, a tip), and the main sections inside each tab have their own “What is this?” panel. Every tab except Tips & Tricks and Practice also opens with a short quiz built from that tab's current selections. Example: on Intervals, pick a root and it asks where a random number of semitones up lands. Each quiz has its own question types, a score and a streak, and a Hide button.

## Source layout

```
src/theory.js            music theory engine (pure functions; runs in browser and Node)
src/audio.js             Web Audio: plucked strings, lookahead scheduler, metronome, technique demos
src/render.js            SVG renderers: fretboard, chord box, circle of fifths, note glyphs
src/app.js               state, persistence, helpers, delegated events, boot and error handling
src/views.js, views2.js  one render function per tab
src/practice.js          practice generators and scoring
src/quiz.js              per-tab quiz card (questions built from each tab's current root/scale/chord)
src/learn.js             explanations for every tab and section, and the Tips & Tricks tab
src/qualities.js         interval qualities: explorer, lesson and tables on the Intervals tab, and its Practice exercise
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
node --test tests/*.test.js        # 39 engine tests + quiz audit (thousands of seeded questions)
python3 tests/e2e.py               # browser tests (pip install playwright; playwright install chromium)
```

The engine tests check every root (17 spellings) against every scale and chord, and every tuning (7 presets plus 2 custom) against every scale position and chord voicing.
