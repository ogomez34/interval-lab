import { CHORD_TYPES, SCALES, TUNINGS, $, rootNameToPc, mod12, intervalQShort } from '../music.js';
import { renderFretboardInto, drawShapeSVG, getCurrentTuning } from './guitar.js';
import { info } from '../infobox.js';
import { formatNoteForDisplay } from '../storage.js';
import { on } from '../events.js';

let currentChord = null;

export function renderChords() {
  return `
    <h2>🎵 Chord library ${info('How the chord library works', `
      <p>Pick a <b>Chord type</b> and <b>Root</b> in the controls at the top.</p>
      <p>The big fretboard shows <b>every place the chord's notes live</b> on the neck.</p>
      <p>The <b>shapes</b> below are real fingerings, checked against your <b>Tuning</b> — each card shows finger numbers and how many fingers you need, so you can find a shape that fits your hand.</p>
    `)}</h2>

    <div class="card" id="chordInfo">
      <p>Select a chord to see its notes.</p>
    </div>

    <p style="color:var(--muted);font-size:13px;">Every place the notes live (not a fingering):</p>
    <div class="fretboard-wrap">
      <div class="fretboard" id="chordFretboard"></div>
    </div>

    <h3>Playable shapes ${info('About the playable shapes', `
      <p>Hand-curated fingerings, verified against your selected <b>Tuning</b>. Dots are fretted notes with finger numbers (1 = index … 4 = pinky), ○ is an open string, ✕ is muted, and a thick line is a barre.</p>
      <p><b>Drop tunings</b> get the one-finger power chord on the bottom strings. <b>Standard E</b> gets the full E/A/D/C/G-shape family. Shapes are ordered from the open position up the neck.</p>
      <p>Chord types without curated fingerings fall back to generated voicings (marked as such).</p>
    `)}</h3>
    <div class="shape-grid" id="chordShapes"></div>
  `;
}

export function initChords() {
  const select = $('chordType');
  Object.keys(CHORD_TYPES).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => selectChord(select.value));
  // The chord library shares the main Root dropdown and the global tuning.
  $('rootNote').addEventListener('change', renderChordView);
  on('tuning-change', renderChordView);
  // Note names follow the notation + accidental preferences.
  on('accidental-pref-change', renderChordView);
  on('note-names-change', renderChordView);
  selectChord('Major');
}

function selectChord(name) {
  currentChord = name;
  const select = $('chordType');
  if (select) select.value = name;
  renderChordView();
}

function renderChordView() {
  if (!currentChord) return;
  const rootName = $('rootNote').value;
  const rootPc = rootNameToPc(rootName);
  const intervals = CHORD_TYPES[currentChord];
  const pcs = new Set(intervals.map(i => mod12(rootPc + i)));

  const noteNames = intervals.map(i => `${formatNoteForDisplay(mod12(rootPc + i))} (${intervalQShort(i)})`);

  $('chordInfo').innerHTML = `
    <p style="margin:0 0 8px 0;font-size:16px;"><b>${formatNoteForDisplay(rootPc)} ${currentChord}</b></p>
    <p style="margin:0;color:var(--muted);font-size:14px;">Notes & degrees: ${noteNames.join(' · ')}</p>
  `;

  renderFretboardInto($('chordFretboard'), {
    rootPc,
    scale: SCALES.chromatic,
    showAll: false,
    intervalOverlay: false,
    highlightPcs: pcs,
    noFlash: false
  });

  renderChordShapes(rootPc, intervals);
}

// ---- Hand-curated chord fingerings ----
// Each template is a movable finger pattern relative to the root note on
// `rootString` (-1 = muted string). `fingers` uses 1=index … 4=pinky,
// null = open/muted. `barre` is relative: { fret, fromString, toString }.
// The same template is verified against the selected tuning, so it only
// appears when it really makes the chord there.

const SHAPE_TEMPLATES = [
  // Major
  { name: 'E-shape major', type: 'Major', rootString: 0,
    rel: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 0, fromString: 0, toString: 5 } },
  { name: 'A-shape major', type: 'Major', rootString: 1,
    rel: [-1, 0, 2, 2, 2, 0], fingers: [null, 1, 3, 4, 2, 1], barre: { fret: 0, fromString: 1, toString: 5 } },
  { name: 'D-shape major', type: 'Major', rootString: 2,
    rel: [-1, -1, 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2], barre: null },
  { name: 'C-shape major (open)', type: 'Major', rootString: 1,
    rel: [-1, 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null], barre: null },
  { name: 'G-shape major (open)', type: 'Major', rootString: 0,
    rel: [3, 2, 0, 0, 0, 3], fingers: [2, 1, null, null, null, 3], barre: null },
  // Minor
  { name: 'E-shape minor', type: 'Minor', rootString: 0,
    rel: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 0, fromString: 0, toString: 5 } },
  { name: 'A-shape minor', type: 'Minor', rootString: 1,
    rel: [-1, 0, 2, 2, 1, 0], fingers: [null, 1, 3, 4, 2, 1], barre: { fret: 0, fromString: 1, toString: 5 } },
  { name: 'D-shape minor', type: 'Minor', rootString: 2,
    rel: [-1, -1, 0, 2, 3, 1], fingers: [null, null, null, 1, 3, 2], barre: null },
  // Dominant 7
  { name: 'E-shape 7th', type: 'Dominant 7', rootString: 0,
    rel: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1], barre: { fret: 0, fromString: 0, toString: 5 } },
  { name: 'A-shape 7th', type: 'Dominant 7', rootString: 1,
    rel: [-1, 0, 2, 0, 2, 0], fingers: [null, 1, 3, 1, 4, 1], barre: { fret: 0, fromString: 1, toString: 5 } },
  { name: 'D-shape 7th', type: 'Dominant 7', rootString: 2,
    rel: [-1, -1, 0, 2, 1, 2], fingers: [null, null, null, 1, 2, 3], barre: null },
  // Major 7
  { name: 'E-shape maj7', type: 'Major 7', rootString: 0,
    rel: [0, 2, 1, 1, 0, 0], fingers: [null, 2, 1, 1, null, null], barre: null },
  { name: 'A-shape maj7', type: 'Major 7', rootString: 1,
    rel: [-1, 0, 2, 1, 2, 0], fingers: [null, null, 2, 1, 3, null], barre: null },
  // Minor 7
  { name: 'E-shape min7', type: 'Minor 7', rootString: 0,
    rel: [0, 2, 0, 0, 0, 0], fingers: [null, 2, null, null, null, null], barre: null },
  { name: 'A-shape min7', type: 'Minor 7', rootString: 1,
    rel: [-1, 0, 2, 0, 1, 0], fingers: [null, null, 2, null, 1, null], barre: null },
  // Power chords
  { name: 'Power (E form)', type: 'Power (5)', rootString: 0,
    rel: [0, 2, 2, -1, -1, -1], fingers: [null, 1, 3, null, null, null], barre: null },
  { name: 'Power (A form)', type: 'Power (5)', rootString: 1,
    rel: [-1, 0, 2, 2, -1, -1], fingers: [null, null, 1, 3, null, null], barre: null },
  { name: 'Drop power (1 finger)', type: 'Power (5)', rootString: 0,
    rel: [0, 0, -1, -1, -1, -1], fingers: [1, 1, null, null, null, null], barre: null }
];

function matchTemplate(tpl, tuning, rootPc, intervals) {
  const strings = tuning.strings;
  const chordSet = new Set(intervals.map(i => mod12(rootPc + i)));
  const uniqueTones = [...chordSet];
  const maxMissing = uniqueTones.length > 3 ? 1 : 0; // 4-note chords may drop the 5th

  const results = [];
  for (let rootFret = 0; rootFret <= 12; rootFret++) {
    if (mod12(strings[tpl.rootString].midi + rootFret) !== rootPc) continue;

    const frets = tpl.rel.map(r => (r < 0 ? -1 : r + rootFret));
    const playedPcs = new Set();
    let extraNote = false;
    frets.forEach((f, s) => {
      if (f < 0) return;
      const p = mod12(strings[s].midi + f);
      if (!chordSet.has(p)) extraNote = true;
      playedPcs.add(p);
    });
    if (extraNote) continue;

    const missing = uniqueTones.filter(p => !playedPcs.has(p)).length;
    if (missing > maxMissing) continue;

    const barres = tpl.barre
      ? [{ fret: rootFret + tpl.barre.fret, fromString: tpl.barre.fromString, toString: tpl.barre.toString }]
      : [];

    results.push({ name: `${tpl.name} · fret ${rootFret}`, frets, fingers: tpl.fingers, barres, rootFret });
  }
  return results;
}

function renderChordShapes(rootPc, intervals) {
  const container = $('chordShapes');
  if (!container) return;
  container.innerHTML = '';

  const tuning = getCurrentTuning() || TUNINGS.standardE;

  // 1. Hand-curated fingerings that match the chord in the selected tuning.
  let curated = [];
  for (const tpl of SHAPE_TEMPLATES) {
    if (tpl.type !== currentChord) continue;
    curated = curated.concat(matchTemplate(tpl, tuning, rootPc, intervals));
  }

  // 2. Fallback: generated voicings for chords without curated fingerings.
  if (!curated.length) {
    curated = generateChordShapes(tuning, rootPc, intervals).slice(0, 4).map(g => ({ ...g, generated: true }));
  }

  if (!curated.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:13px;">No compact shape found for this chord in this tuning.</p>';
    return;
  }

  // Sort by lowest played fret (open position first), cap at 5.
  const lowestFret = sh => Math.min(...sh.frets.filter(f => f >= 0));
  curated.sort((a, b) => lowestFret(a) - lowestFret(b) || a.name.localeCompare(b.name));
  curated = curated.slice(0, 5);

  curated.forEach(shape => {
    const card = document.createElement('div');
    card.className = 'shape-card';
    const noteList = shape.frets.map((f, s) => {
      if (f < 0) return null;
      const pc = mod12(tuning.strings[s].midi + f);
      return `${formatNoteForDisplay(pc)} (${intervalQShort(mod12(pc - rootPc))})`;
    }).filter(Boolean).join(' · ');

    const usedFingers = new Set(shape.fingers.filter(Boolean));
    const openStrings = shape.frets.filter(f => f === 0).length;
    const playability = shape.generated
      ? 'generated · check comfort'
      : `${shape.barres.length ? 'barre · ' : ''}${usedFingers.size} finger${usedFingers.size === 1 ? '' : 's'}${openStrings && lowestFret(shape) === 0 ? ' · open' : ''}`;

    card.innerHTML = `
      <div class="shape-name">${shape.name}</div>
      ${drawShapeSVG({ frets: shape.frets, fingers: shape.fingers, barres: shape.barres || [] })}
      <div class="shape-desc">${tuning.label} · ${playability}<br>Notes: ${noteList}</div>
    `;
    container.appendChild(card);
  });
}

// ---- Generated fallback (any chord, compact voicings in the given tuning) ----

function generateChordShapes(tuning, rootPc, intervals) {
  const strings = tuning.strings;
  const stringPcs = strings.map(s => mod12(s.midi));
  const uniqueTones = [...new Set(intervals.map(i => mod12(rootPc + i)))];
  const chordSet = new Set(uniqueTones);
  const minPlayed = Math.max(2, Math.min(3, uniqueTones.length));
  const maxMissing = uniqueTones.length > 3 ? 1 : 0;

  const found = [];
  const seen = new Set();
  for (const rootString of [0, 1, 2]) {
    for (let fret = 0; fret <= 12; fret++) {
      if (mod12(stringPcs[rootString] + fret) !== rootPc) continue;
      const frets = Array(6).fill(-1);
      frets[rootString] = fret;
      for (let s = 0; s < 6; s++) {
        if (s === rootString) continue;
        let chosen = -1;
        for (let f = Math.max(0, fret - 1); f <= fret + 4; f++) {
          if (chordSet.has(mod12(stringPcs[s] + f))) { chosen = f; break; }
        }
        if (chosen === -1 && chordSet.has(stringPcs[s])) chosen = 0;
        frets[s] = chosen;
      }
      const played = frets.filter(f => f >= 0);
      if (played.length < minPlayed) continue;
      if (Math.max(...played) - Math.min(...played) > 4) continue;
      const playedPcs = new Set();
      frets.forEach((f, s) => { if (f >= 0) playedPcs.add(mod12(stringPcs[s] + f)); });
      if (uniqueTones.filter(p => !playedPcs.has(p)).length > maxMissing) continue;
      const key = frets.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ name: `Generated · fret ${fret}`, frets, fingers: Array(6).fill(null), barres: [], rootFret: fret });
    }
  }
  return found;
}
