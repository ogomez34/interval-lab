# Interval Lab

**Learn guitar theory through intervals — hear it, find it, play it.**

Interval Lab is a fork of [Notes Maker](https://github.com/ogomez34/notes-maker) rebuilt around one teaching idea: **everything in music is a distance, and on the guitar that distance is just frets.** A chord is stacked distances, a scale is a ladder of distances, a melody is a walk through distances. Learn the 12 distances and the whole instrument unlocks.

Static vanilla JS, ES modules, no build step — just `index.html`, CSS and `js/`.

## The method

> **Hear → sing → find → play.**

1. **Hear** — the Ear tab plays two notes; name the distance. Every interval is hooked to a reference song (Jaws, Here Comes the Bride…).
2. **Sing** — sing the interval back before you answer. Your voice is the slowest, most honest tuner you own.
3. **Find** — the Fretboard tab shows where each distance lives. Read the neck like a ruler with the Intervals/Degrees label modes, and hunt intervals against a root **drone**.
4. **Play** — Practice turns it into games: find every ♭3 from a root, or hear an interval and play it back on the neck.

## Where the theory comes from

The Learn tab teaches the origin of the system, not just the rules:

- **Pythagoras and the monochord** — the octave (2:1) and perfect 5th (3:2) that frame Western music.
- **Equal temperament** — why the octave is divided into 12 equal steps, and why every fret is one step.
- **The three interval families** — perfect (stable), imperfect (major/minor colours), dissonant (tension that resolves).
- **The 12-step ruler** — the full interval table with names, families and what each one sounds like.

## Features

### 🧭 Learn
- Theory-first course: origins, the interval table, the three families, and the 4-step method.
- A guided 5-stage path (perfect pillars → colours → steps → wide colours → full chromatic) with ✓ mastery markers driven by your real ear-training accuracy.

### 🎸 Fretboard
- The neck as an interval ruler — label modes: **Notes / Intervals / Nashville / Degrees** (scale degree + quality, e.g. `3 M3`).
- **Root drone** — hold the root in your ear while you explore.
- **Interval shape library** — pick any interval and see every practical move (same string, next string, two strings up) in your current tuning.
- **Octave twins** — the one-note shortcut, with fret-count lines drawn on the neck.
- Chord library with **interval degrees** labelled on every shape (`R · M3 · P5`).

### 👂 Ear
- Interval ear training with five guided stages (not a random all-interval dump), ascending/descending/both.
- Quality feedback on every answer: *"✗ It was a minor 6th — imperfect, dark, longing. Think: The Entertainer."*

### 🎯 Practice
- **Name the note / Name the interval / Hear and name** (text games with weak-spot drilling and per-interval stats).
- **Find the interval** — root lights up, tap every fret that makes the target interval.
- **Hear it, play it** — the app plays root + note; you play it back on the neck.
- **Find its octave twin** — the octave shape race.

### 📚 Reference
- The interval-focused system in one place: number map, counting, octave twins, chord recipes, Nashville numbers, circle of fifths.
- **Your interval heatmap** — every question you answer feeds a green/red map of the 12 intervals. Red means "it hears you".

### ⚙️ Settings (popup)
- Theme, presets, tuning (global), fretboard controls, notation (letters / fixed-Do solfège) and navigation layout.

## Relationship to Notes Maker

This project starts from `notes-maker` at commit `410b0c6` and deliberately removes the Piano tab and the note-memorisation framing to focus on interval hearing and fretboard shapes. The fretboard, audio engine, presets, notation switch and modal Settings are shared and kept in sync.

## File Structure

```
interval-lab/
├── index.html              # Main HTML file
├── build.py                # Single-file build script (inlines CSS + JS)
├── buildspec.yml           # AWS CodeBuild / ECR pipeline config
├── Dockerfile              # Container build for deployment
├── assets/                 # Mascot/icon SVGs
├── css/
│   ├── base.css            # Core styles, nav layout, responsive rules
│   ├── themes.css          # Theme definitions (dark, light, colorful)
│   ├── tabs.css            # Circle of fifths, tables, quiz widgets
│   └── fretboard.css       # Guitar fretboard visualization
└── js/
    ├── main.js             # Entry point: renders tabs, tab switching, cross-links
    ├── music.js            # Music theory data and utilities
    ├── audio.js            # Web Audio synthesis + iOS audio-session handling + drone
    ├── storage.js          # localStorage wrapper (stats, settings, presets)
    ├── theme.js            # Theme switching
    ├── presets.js          # Preset save/load system
    ├── infobox.js          # ⓘ info popups
    ├── navlayout.js        # Nav position + mobile style
    ├── circle.js           # Shared circle-of-fifths renderer
    ├── events.js           # Tiny pub/sub for cross-module re-renders
    └── tabs/
        ├── learn.js        # Learn tab: theory course + guided path
        ├── reference.js    # Reference tab (theory guide + heatmap)
        ├── practice.js     # Practice games (text + fretboard)
        ├── ear.js          # Ear training (staged intervals)
        ├── guitar.js       # Fretboard, drone, shape library, chords
        └── chords.js       # Chord library (inside the Fretboard tab)
```

## Development

```bash
python3 -m http.server 8001 --directory .
# open http://localhost:8001
```

No dependencies, no build. Deploys as a static site (Dockerfile and buildspec included for AWS).

## Browser Compatibility

Works in all modern browsers that support ES modules, CSS custom properties, Web Audio API and localStorage. Tested in headless Chrome/Brave.

## Data Storage

All data is stored locally in your browser via localStorage (theme, stats, settings, presets, visited tabs). No data is sent to any server.

## Version

**v0.1** — initial fork and interval rebuild

## License

Free to use for personal and educational purposes. Feel free to fork and modify.
