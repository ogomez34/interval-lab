import { SCALES, INTERVAL_LABELS, MAJOR_SCALE, TUNINGS,
  $, rootNameToPc, noteNameToPc,
  octaveShiftPairs, mod12, formatNoteName, intervalQShort, intervalDetail } from '../music.js';
import { playMidi, startDrone, stopDrone, dronePlaying } from '../audio.js';
import { info, infoEntry, updateInfo, showInfo } from '../infobox.js';
import { renderChords, initChords } from './chords.js';
import { refreshTuningTricks } from './learn.js';
import { on, emit } from '../events.js';
import { getSetting, setSetting, getNoteNames, formatNoteForDisplay } from '../storage.js';

const FRETS = 13;
const INLAY_SINGLE = [3, 5, 7, 9, 15, 17, 19, 21];
const INLAY_DOUBLE = [12, 24];
const LANDMARK_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];
const OCTAVE_FRETS = [12, 24];

let CURRENT_TUNING = TUNINGS.standardE;

// Fretboard label mode: "intervals" is the default — the whole app teaches
// distances. Notes stay one tap away in the info popup.
let labelModeState = 'intervals';
let tuningInfoId = null;

export function currentLabelMode() { return labelModeState; }
export function getCurrentTuning() { return CURRENT_TUNING; }

// Root dropdown values stay as letter pitch classes (logic), but the visible
// labels follow the notation setting.
function updateRootDropdownLabels() {
  const notation = getNoteNames();
  document.querySelectorAll('#rootNote option').forEach(opt => {
    opt.textContent = formatNoteName(noteNameToPc(opt.value), 'sharps', notation);
  });
}

function updateLabelControls() {
  const mode = currentLabelMode();
  document.querySelectorAll('#labelModeSwitch button').forEach(b => {
    b.classList.toggle('active', b.dataset.labelMode === mode);
  });
}

export function setLabelMode(mode) {
  labelModeState = mode;
  updateLabelControls();
  renderFretboard();
}

// The legend keeps the same colours in every mode; only the words change.
function updateLegendText(mode) {
  const degreeView = mode === 'nashville' || mode === 'degrees';
  $('legendNormal').innerHTML = `<span class="sw root"></span>${degreeView ? ' 1 — home' : ' Root'}`;
  $('legendScale').innerHTML = `<span class="sw scale"></span>${degreeView ? ' In scale (2, 3, 4…)' : ' In scale'}`;
  $('legendNormal2').innerHTML = `<span class="sw normal"></span>${degreeView ? ' Not in scale (-2, -3…)' : ' Not in scale'}`;
}

// The fretboard controls now live in the Settings popup. This renders them
// into the #fretboardControls container so the ⓘ popups still register.
function renderFretboardControls() {
  return `
    <div class="settings-row">
      <label for="rootNote">Root</label>
      <select id="rootNote">
        <option value="C">C</option><option value="C#">C#</option><option value="D">D</option><option value="D#">D#</option>
        <option value="E">E</option><option value="F">F</option><option value="F#">F#</option><option value="G">G</option>
        <option value="G#">G#</option><option value="A">A</option><option value="A#">A#</option><option value="B">B</option>
      </select>
    </div>
    <div class="settings-row">
      <label for="scaleType">Scale</label>
      <select id="scaleType">
        <optgroup label="Common">
          <option value="major">Major</option>
          <option value="naturalMinor">Natural minor</option>
          <option value="minorPent">Minor pentatonic</option>
          <option value="majorPent">Major pentatonic</option>
          <option value="blues">Blues scale</option>
        </optgroup>
        <optgroup label="Modes">
          <option value="dorian">Dorian</option>
          <option value="phrygian">Phrygian</option>
          <option value="lydian">Lydian</option>
          <option value="mixolydian">Mixolydian</option>
          <option value="locrian">Locrian</option>
        </optgroup>
        <optgroup label="Minor variations">
          <option value="harmonicMinor">Harmonic minor</option>
          <option value="melodicMinor">Melodic minor</option>
        </optgroup>
      </select>
    </div>
    <div class="settings-row">
      <label for="chordType">Chord type</label>
      <select id="chordType"></select>
    </div>
    <div class="settings-row">
      <label>Labels</label>
      <div class="seg-switch" id="labelModeSwitch" role="radiogroup" aria-label="Fretboard labels">
        <button type="button" data-label-mode="notes">Notes ${info('Notes — letters', `
          <p>The fretboard shows each note's <b>letter name</b> — C, D, E…</p>
          <p>Tap any fret to see its note name in a popup, whatever the label mode.</p>
        `)}</button>
        <span class="seg-divider" aria-hidden="true"></span>
        <span class="seg-group">
          <button type="button" data-label-mode="intervals" class="active">Intervals ${info('Intervals — all 12 steps', `
            <p>Every note becomes a number: how many steps it is from the root. One fret = one step.</p>
            <p><b>1</b> is home. The full ruler is <b>1 ♭2 2 ♭3 3 4 ♭5 5 ♭6 6 ♭7 7</b> — all 12 steps.</p>
            <p>The selected scale's notes stay highlighted. Tick <b>Show every note/interval</b> to label all 12 frets.</p>
          `)}</button>
          <button type="button" data-label-mode="nashville">Nashville ${info('Nashville numbers — the scale\'s numbers', `
            <p>Numbers the notes of the selected scale — <b>1</b> is always home, no matter the key. A minor scale is numbered <b>1–7</b> too (never ♭3 ♭6 ♭7) — that's the Nashville way.</p>
            <p>Change the <b>Scale</b> or <b>Root</b> and the numbers change with it.</p>
            <p><b>Try this:</b> pick <b>Major</b> and spot the pattern <code>1 – 4 – 5</code> — the backbone of thousands of songs.</p>
            <p>Tick <b>Show every note/interval</b> to also label the notes outside the scale with a dash degree (<b>-2, -3, -5, -6, -7</b>) — left uncoloured. For the full guide, open 📚 Reference → Nashville numbers.</p>
          `)}</button>
          <button type="button" data-label-mode="degrees">Degrees ${info('Degrees — scale number + interval', `
            <p>The dual view teachers use: each scale note shows its <b>Nashville degree</b> and its <b>chromatic interval</b> together.</p>
            <p>In C major, the note E shows <b>3 M3</b>: scale degree 3, and a major 3rd from the root.</p>
            <p>This is the bridge between "where am I in the scale" and "what does this note do to the chord".</p>
          `)}</button>
        </span>
      </div>
    </div>
    <div class="settings-row">
      <label for="showAll">Show every note/interval</label>
      <input type="checkbox" id="showAll">
    </div>
  `;
}

// ---- Drone + interval shape library ----
function currentRootPc() { return rootNameToPc($('rootNote').value); }
function currentRootMidi() { return 48 + currentRootPc(); } // C3–B3 — audible, guitar-ish range

function populateIntervalShapeSelect() {
  const sel = $('intervalShapeSel');
  if (!sel || sel.options.length) return;
  for (let s = 1; s <= 12; s++) {
    const d = intervalDetail(s);
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `${d.short} · ${d.name}`;
    sel.appendChild(opt);
  }
}

// For a given tuning + root + interval, list every practical way to move that
// distance on the neck: same string, one string up, two strings up.
function intervalShapesFor(tuning, rootPc, semis) {
  const targetPc = mod12(rootPc + semis);
  const shapes = [];
  shapes.push({ label: 'Same string', move: `+${semis} fret${semis === 1 ? '' : 's'}` });
  for (let si = 0; si < tuning.strings.length - 1; si++) {
    const gap = tuning.strings[si + 1].midi - tuning.strings[si].midi;
    if (semis >= gap) {
      const shift = semis - gap;
      shapes.push({
        label: `${tuning.strings[si].name} → ${tuning.strings[si + 1].name}`,
        move: shift === 0 ? 'same fret on the higher string' : `+${shift} fret${shift === 1 ? '' : 's'} on the higher string`
      });
    }
  }
  for (let si = 0; si + 2 < tuning.strings.length; si++) {
    const gap = tuning.strings[si + 2].midi - tuning.strings[si].midi;
    if (semis >= gap) {
      const shift = semis - gap;
      shapes.push({
        label: `${tuning.strings[si].name} → ${tuning.strings[si + 2].name} (2 strings up)`,
        move: shift === 0 ? 'same fret' : `+${shift} frets`
      });
    }
  }
  return { semis, targetPc, shapes };
}

function renderIntervalShapes() {
  const container = $('intervalShapes');
  if (!container) return;
  const sel = $('intervalShapeSel');
  if (!sel) return;
  populateIntervalShapeSelect();
  const semis = parseInt(sel.value || '7');
  const rootPc = currentRootPc();
  const d = intervalDetail(semis);
  const { targetPc, shapes } = intervalShapesFor(CURRENT_TUNING, rootPc, semis);
  const moves = shapes.map(s => `<li><b>${s.label}</b> — ${s.move}</li>`).join('');
  container.innerHTML = `
    <h3>Find the <b>${d.short} · ${d.name}</b> from ${formatNoteForDisplay(rootPc)}</h3>
    <p class="muted">Target note: <b>${formatNoteForDisplay(targetPc)}</b> — ${d.sound}.</p>
    <ul class="theory-list">${moves}</ul>
  `;
}

function updateDroneButton() {
  const btn = $('droneBtn');
  if (!btn) return;
  btn.textContent = dronePlaying() ? '⏹ Stop drone' : '🔊 Drone root';
  btn.classList.toggle('secondary', dronePlaying());
}

export function renderGuitar() {
  const tuningInfo = infoEntry('Tuning & octave numbers', '');
  tuningInfoId = tuningInfo.id;
  return `
    <h2>🎸 Fretboard ${tuningInfo.html}</h2>

    <div class="legend">
      <span id="legendNormal"><span class="sw root"></span> Root</span>
      <span id="legendScale"><span class="sw scale"></span> In scale</span>
      <span id="legendNormal2"><span class="sw normal"></span> Not in scale</span>
    </div>

    <div class="fretboard-wrap">
      <div class="fretboard" id="fretboard"></div>
    </div>

    <div class="scale-practice-row">
      <button class="primary" id="droneBtn">🔊 Drone root</button>
      <select id="intervalShapeSel" aria-label="Interval shape to find"></select>
      <span class="sp-status" id="droneStatus">Hold the root in your ear while you hunt intervals.</span>
    </div>
    <div class="card interval-shape-card" id="intervalShapes"></div>

    <h2>🔁 Octave twins ${info('The one-note shortcut', `
      <p>Learn the notes on just your <b>two lowest strings</b> (6th and 5th). From any note there, jump <b>2 strings up</b> and add the frets written on the gold lines — it's the same note, every time.</p>
      <p>Usually that's <b>+2 frets</b>; crossing the <b>G→B</b> strings adds one more. Change the <b>Tuning</b> in Settings and the numbers on the lines update to match.</p>
      <p>Tap <b>any note</b> on the board to see that note's shape and fret counts — the root won't change.</p>
    `)}</h2>
    <div class="fretboard-wrap">
      <div class="fretboard" id="octaveFretboard"></div>
    </div>

    ${renderChords()}

    <p style="color:var(--muted);font-size:14px;">Want to test yourself? The interval games live in <b>🎯 Practice</b>.</p>
  `;
}

export function initGuitar() {
  const controlsEl = $('fretboardControls');
  if (controlsEl) controlsEl.innerHTML = renderFretboardControls();

  $('rootNote').addEventListener('change', () => {
    octaveDisplayPc = null; // the dropdown always prevails
    if (dronePlaying()) startDrone(currentRootMidi()); // keep the drone on the new root
    renderFretboard();
  });
  $('scaleType').addEventListener('change', renderFretboard);
  document.querySelectorAll('#labelModeSwitch button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.info-btn')) return; // ⓘ opens the info popup, not the mode
      setLabelMode(btn.dataset.labelMode);
    });
  });
  $('showAll').addEventListener('change', renderFretboard);

  // Drone + interval shape library
  $('intervalShapeSel').addEventListener('change', renderIntervalShapes);
  $('droneBtn').addEventListener('click', () => {
    toggleDrone(currentRootMidi());
    updateDroneButton();
    const status = $('droneStatus');
    if (status) {
      status.textContent = dronePlaying()
        ? `Drone: ${formatNoteForDisplay(currentRootPc())} — hunt intervals against it.`
        : 'Hold the root in your ear while you hunt intervals.';
    }
  });

  // Chord finder (shows the selected chord's interval degrees on the neck)
  initChords();

  // Cross-module re-render hooks (replaces the old window.__rerender* globals).
  on('accidental-pref-change', renderFretboard);
  on('note-names-change', () => {
    updateRootDropdownLabels();
    renderFretboard();
  });
  on('tab-visible', (tab) => {
    if (tab === 'guitar') renderFretboard();
    else {
      stopDrone();
      updateDroneButton();
    }
  });

  updateRootDropdownLabels();
  setTuning(getSetting('tuning', 'standardE'));
}

// ---- Fretboard ----

export function setTuning(key) {
  if (!TUNINGS[key]) return;
  CURRENT_TUNING = TUNINGS[key];
  const settingsSel = $('settingsTuning');
  if (settingsSel) settingsSel.value = key;
  setSetting('tuning', key);
  octaveDisplayPc = null; // the dropdown always prevails
  if (tuningInfoId) {
    const gaps = CURRENT_TUNING.strings.slice(1).map((s, i) => s.midi - CURRENT_TUNING.strings[i].midi);
    const gapText = gaps.map((g, i) =>
      `<b>${CURRENT_TUNING.strings[i].name.replace(/[0-9]/g, '')} → ${CURRENT_TUNING.strings[i + 1].name.replace(/[0-9]/g, '')}</b>: fret ${g}`
    ).join(' · ');
    updateInfo(tuningInfoId, 'Tuning & octave numbers', `
      <p><b>${CURRENT_TUNING.description}</b> (low to high).</p>
      <p><b>The tuning formula:</b> the next string's open note is the current string played at the fret that matches the gap between them. In standard tuning that's <b>fret 5</b> everywhere except <b>3rd → 2nd</b> string, which is <b>fret 4</b>.</p>
      <p>In this tuning: ${gapText}.</p>
      <p>That's the same trick players use to tune by ear — play the fret, match the next open string.</p>
      <p>The number is the octave — it says which copy of the note you're on. Go up 12 frets and the number goes up by 1 (C2 → C3 → C4…). The full table lives in 📚 Reference → octave numbers.</p>
    `);
  }
  renderFretboard();
  // Learn tab's bag of tricks has a tuning-aware row — keep it in sync.
  refreshTuningTricks();
  // Practice fretboard games follow the selected tuning too.
  emit('tuning-change', key);
}

function renderFretboard() {
  const rootName = $('rootNote').value;
  const rootPc = rootNameToPc(rootName);
  const scaleKey = $('scaleType').value;
  const scale = SCALES[scaleKey] || SCALES.major;
  const mode = currentLabelMode();
  const nashville = mode === 'nashville';
  const intervalOverlay = mode === 'intervals';
  const dualMode = mode === 'degrees';
  const showAll = $('showAll').checked;

  updateLabelControls();
  updateLegendText(mode);

  renderFretboardInto($('fretboard'), {
    rootPc,
    scale,
    showAll,
    intervalOverlay,
    nashvilleMode: nashville,
    dualMode,
    octaveTwinMode: false,
    noFlash: false,
    tuning: CURRENT_TUNING,
    cellInfoPopup: true
  });

  renderIntervalShapes();
  renderOctaveTwinBoard();
}

// Dedicated "Octave twins" board: shows one note's octave shape with the
// fret-count chains drawn on the board. It follows the Root dropdown until
// the player taps another note — then it previews that note instead, without
// changing the Root dropdown.
let octaveDisplayPc = null; // null = follow the Root dropdown

function renderOctaveTwinBoard() {
  const container = $('octaveFretboard');
  if (!container) return;
  const rootPc = rootNameToPc($('rootNote').value);
  const displayPc = octaveDisplayPc !== null ? octaveDisplayPc : rootPc;

  renderFretboardInto(container, {
    rootPc: displayPc,
    scale: SCALES.chromatic,
    showAll: $('showAll').checked,
    intervalOverlay: currentLabelMode() === 'intervals',
    nashvilleMode: currentLabelMode() === 'nashville',
    dualMode: currentLabelMode() === 'degrees',
    highlightPcs: new Set([displayPc]),
    octaveTwinMode: false,
    noFlash: false,
    tuning: CURRENT_TUNING,
    cellInfoPopup: true,
    onCellClick: (cell, midi, pc) => {
      octaveDisplayPc = pc;
      renderOctaveTwinBoard();
    }
  });

  drawOctaveTwinLinks(container, displayPc);
  // Safety nets: redraw after the next frame and again shortly after, in case
  // the board was measured before the layout settled. The fret counts must be
  // visible on first view without any click.
  requestAnimationFrame(() => drawOctaveTwinLinks(container, displayPc));
  setTimeout(() => drawOctaveTwinLinks(container, displayPc), 250);
}

function drawOctaveTwinLinks(container, rootPc, originCell = null) {
  const cells = [...container.querySelectorAll('.fb-cell')]
    .filter(c => Number(c.dataset.pc) === rootPc);
  container.querySelectorAll('.fb-cell.octave-twin, .fb-cell.octave-origin')
    .forEach(c => c.classList.remove('octave-twin', 'octave-origin'));
  const oldSvg = container.querySelector('#octaveLinesSvg');
  if (oldSvg) oldSvg.remove();

  if (cells.length === 0) return;
  const origin = originCell && cells.includes(originCell)
    ? originCell
    : cells.reduce((a, b) => Number(a.dataset.midi) < Number(b.dataset.midi) ? a : b);
  origin.classList.add('octave-origin');
  cells.forEach(c => { if (c !== origin) c.classList.add('octave-twin'); });

  // Draw the two "2 strings up" chains (6→4→2 and 5→3→1) with the fret
  // count written on each hop — the formula, drawn right on the board.
  const pairs = octaveShiftPairs(CURRENT_TUNING);
  const cellAt = (si, fret) => cells.find(c =>
    Number(c.dataset.string) === si && Number(c.dataset.fret) === fret);
  const lowestOn = si => cells
    .filter(c => Number(c.dataset.string) === si)
    .sort((a, b) => Number(a.dataset.fret) - Number(b.dataset.fret))[0];

  const chainSegments = (i0) => {
    const i1 = i0 + 2;
    const c0 = lowestOn(i0);
    if (!c0) return [];
    const f0 = Number(c0.dataset.fret);
    const c1 = cellAt(i0 + 2, f0 + pairs[i0].fretShift);
    const c2 = c1 ? cellAt(i0 + 4, Number(c1.dataset.fret) + pairs[i1].fretShift) : null;
    const segs = [];
    if (c1) segs.push({ from: c0, to: c1, label: pairs[i0].fretShift === 0 ? 'same fret' : `+${pairs[i0].fretShift} frets` });
    if (c2) segs.push({ from: c1, to: c2, label: pairs[i1].fretShift === 0 ? 'same fret' : `+${pairs[i1].fretShift} frets` });
    return segs;
  };

  const segments = [...chainSegments(0), ...chainSegments(1)];
  if (segments.length) drawOctaveLines(container, segments);
}

export function renderFretboardInto(container, opts = {}) {
  const {
    rootPc = 0,
    scale = SCALES.chromatic,
    showAll = false,
    intervalOverlay = false,
    nashvilleMode = false,
    dualMode = false,
    highlightPcs = null,
    tuning = CURRENT_TUNING,
    cellInfoPopup = false
  } = opts;

  const scaleSet = new Set(scale.map(s => mod12(rootPc + s)));
  container.innerHTML = '';
  // Column sizing lives in css/fretboard.css (with a responsive override in
  // base.css) so it can shrink on small screens instead of being frozen by an
  // inline style.

  const corner = document.createElement('div');
  corner.className = 'fb-string-name';
  corner.style.background = 'transparent';
  corner.style.borderRight = '1px solid var(--fret-border)';
  container.appendChild(corner);

  for (let f = 0; f <= FRETS; f++) {
    const lab = document.createElement('div');
    let cls = 'fb-fretnum';
    if (f === 0) cls += ' nut';
    if (OCTAVE_FRETS.includes(f)) cls += ' octave';
    else if (LANDMARK_FRETS.includes(f)) cls += ' landmark';
    lab.className = cls;
    lab.textContent = f === 0 ? 'open' : f;
    container.appendChild(lab);
  }

  tuning.strings.forEach((s, si) => {
    const nameDiv = document.createElement('div');
    nameDiv.className = 'fb-string-name';
    nameDiv.textContent = s.name;
    container.appendChild(nameDiv);

    for (let f = 0; f <= FRETS; f++) {
      const midi = s.midi + f;
      const pc = mod12(midi);
      const interval = mod12(pc - rootPc);

      const cellWrap = document.createElement('div');
      cellWrap.className = 'fb-string';
      if (si === 0) cellWrap.classList.add('thick', 'thick2');
      else if (si === 1) cellWrap.classList.add('thick');
      else if (si === 2) cellWrap.classList.add('thick2');

      if (si === 3) {
        if (INLAY_DOUBLE.includes(f)) {
          const d1 = document.createElement('span');
          d1.className = 'fb-inlay double-top';
          cellWrap.appendChild(d1);
          const d2 = document.createElement('span');
          d2.className = 'fb-inlay double-bottom';
          cellWrap.appendChild(d2);
        } else if (INLAY_SINGLE.includes(f)) {
          const d = document.createElement('span');
          d.className = 'fb-inlay';
          cellWrap.appendChild(d);
        }
      }

      const cell = document.createElement('div');
      cell.className = 'fb-cell';
      cell.dataset.midi = midi;
      cell.dataset.pc = pc;
      cell.dataset.string = si;
      cell.dataset.fret = f;

      const isRoot = interval === 0;
      const inScale = scaleSet.has(pc);
      const inChord = highlightPcs && highlightPcs.has(pc);
      if (nashvilleMode) {
        // Nashville: number the notes of the selected scale, 1 is home.
        // It's the scale's own numbers — a minor scale is 1–7, not 1 ♭3 ♭6 ♭7.
        // "Show all notes" has no scale, so Nashville falls back to the major scale.
        // With "Show every note/interval", notes outside the scale get their
        // flat degree (♭2, ♭3, ♭5, ♭6, ♭7), left uncoloured.
        const numbering = scale === SCALES.chromatic ? MAJOR_SCALE : scale;
        const degreeIdx = numbering.indexOf(interval);
        if (degreeIdx >= 0) {
          const degree = String(degreeIdx + 1);
          if (interval === 0) cell.classList.add('root');
          else {
            cell.classList.add('scale');
          }
          cell.textContent = degree;
          cell.title = `${degree} (${formatNoteForDisplay(pc)})`;
        } else if (showAll) {
          // Nashville dash notation: flat degrees are -2, -3, -5, -6, -7.
          const degree = INTERVAL_LABELS[interval].replace('b', '-');
          cell.textContent = degree;
          cell.title = `${degree} (${formatNoteForDisplay(pc)})`;
        } else {
          cell.textContent = '';
          cell.title = `${formatNoteForDisplay(pc)}`;
        }
      } else {
        if (isRoot && !highlightPcs) cell.classList.add('root');
        else if (inScale && !highlightPcs) {
          cell.classList.add('scale');
        }
        if (inChord) cell.classList.add('root');

        let label = '';
        if (dualMode) {
          const numbering = scale === SCALES.chromatic ? MAJOR_SCALE : scale;
          const degreeIdx = numbering.indexOf(interval);
          const showIt = showAll || isRoot || inChord || (scale !== SCALES.chromatic && inScale);
          if (!showIt) {
            label = '';
          } else if (interval === 0) {
            label = 'R';
          } else if (degreeIdx >= 0) {
            label = `${degreeIdx + 1} ${intervalQShort(interval)}`;
          } else {
            label = `${INTERVAL_LABELS[interval].replace('b', '♭')} ${intervalQShort(interval)}`;
          }
          cell.title = `${formatNoteForDisplay(pc)} · ${intervalDetail(interval).name} from the root`;
        } else if (intervalOverlay) {
          const showIt = showAll || isRoot || inChord || (scale !== SCALES.chromatic && inScale);
          label = showIt ? INTERVAL_LABELS[interval].replace('b', '♭') : '';
          cell.title = `${formatNoteForDisplay(pc)} (string ${tuning.strings.length - si}, fret ${f})`;
        } else {
          const showName = showAll || isRoot || inChord || (scale !== SCALES.chromatic && inScale);
          label = showName ? formatNoteForDisplay(pc) : '';
          cell.title = `${formatNoteForDisplay(pc)} (string ${tuning.strings.length - si}, fret ${f})`;
        }
        cell.textContent = label;
      }

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        playMidi(midi, 1.2, 'guitar');
        if (!opts.noFlash) {
          cell.classList.add('correct-flash');
          setTimeout(() => cell.classList.remove('correct-flash'), 250);
        }
        if (opts.octaveTwinMode) {
          highlightOctaveTwins(container, midi, cell);
        }
        if (opts.cellInfoPopup) {
          const d = intervalDetail(interval);
          showInfo(formatNoteForDisplay(pc), `
            <p><b>${formatNoteForDisplay(pc)}</b> — string ${tuning.strings.length - si}, fret ${f}.</p>
            <p>From the root: <b>${intervalQShort(interval)} · ${d.name}</b> — ${interval} fret${interval === 1 ? '' : 's'} up.</p>
            <p>${d.quality} — ${d.sound}.${d.song !== '—' ? ` Reference song: <i>${d.song}</i>.` : ''}</p>
            ${dronePlaying() ? '<p class="muted">Drone is on — compare this note against the root.</p>' : '<p class="muted">Tip: turn on the 🔊 drone, then tap around to hear each interval against the root.</p>'}
          `);
        }
        if (opts.onCellClick) opts.onCellClick(cell, midi, pc);
      });

      cellWrap.appendChild(cell);
      container.appendChild(cellWrap);
    }
  });
}

// Lights up every other cell on the neck that is the exact same note (an
// octave or two away) as the one just clicked, so the "octave twin" shape
// can be seen directly instead of memorized from a diagram. Also draws
// dashed connecting lines from the clicked note to each twin.
function highlightOctaveTwins(container, originMidi, originCell) {
  container.querySelectorAll('.fb-cell.octave-twin, .fb-cell.octave-origin')
    .forEach(c => c.classList.remove('octave-twin', 'octave-origin'));
  const oldSvg = container.querySelector('#octaveLinesSvg');
  if (oldSvg) oldSvg.remove();

  originCell.classList.add('octave-origin');
  const twinCells = [];
  container.querySelectorAll('.fb-cell').forEach(c => {
    const midi = Number(c.dataset.midi);
    const diff = midi - originMidi;
    if (diff !== 0 && diff % 12 === 0) {
      c.classList.add('octave-twin');
      twinCells.push(c);
    }
  });
  if (twinCells.length === 0) return;
  drawOctaveLines(container, twinCells.map(c => ({ from: originCell, to: c })));
}

// Draws dashed lines between pairs of fretboard cells, with an optional
// label written on each hop (e.g. "+2 frets", "same fret").
function drawOctaveLines(container, segments) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const containerRect = container.getBoundingClientRect();
  // The Guitar tab may still be hidden (or mid-layout); drawing with 0-size
  // measurements would produce invisible lines and labels. Skip and let the
  // visibility hook redraw once the tab is actually on screen.
  if (!containerRect.width || !containerRect.height) return;
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('id', 'octaveLinesSvg');
  svg.setAttribute('width', container.scrollWidth);
  svg.setAttribute('height', container.scrollHeight);
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '5';

  // Resolve theme colours once so the SVG lines/labels are visible even in
  // browsers that don't apply CSS variables inside SVG (older Safari).
  const rootColor = getComputedStyle(document.documentElement).getPropertyValue('--root').trim() || '#c98a3a';
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#121212';

  segments.forEach(seg => {
    const r1 = seg.from.getBoundingClientRect();
    const r2 = seg.to.getBoundingClientRect();
    const x1 = r1.left - containerRect.left + r1.width / 2;
    const y1 = r1.top - containerRect.top + r1.height / 2;
    const x2 = r2.left - containerRect.left + r2.width / 2;
    const y2 = r2.top - containerRect.top + r2.height / 2;

    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '4 3');
    line.setAttribute('stroke', rootColor);
    line.setAttribute('stroke-opacity', '0.7');
    svg.appendChild(line);

    if (seg.label) {
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', (x1 + x2) / 2);
      text.setAttribute('y', (y1 + y2) / 2 - 6);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', '700');
      text.setAttribute('fill', rootColor);
      text.setAttribute('stroke', bgColor);
      text.setAttribute('stroke-width', '3px');
      text.setAttribute('paint-order', 'stroke');
      text.textContent = seg.label;
      svg.appendChild(text);
    }
  });

  container.insertBefore(svg, container.firstChild);
}

export function drawShapeSVG(shape) {
  // Compute fret range to show
  const fretted = shape.frets.filter(f => f > 0);
  const minFret = fretted.length ? Math.min(...fretted) : 1;
  const maxFret = fretted.length ? Math.max(...fretted) : 4;
  // Show 4-5 frets starting at minFret (or 1 if open)
  const startFret = minFret > 1 ? minFret : 1;
  const numFretsShown = Math.max(4, maxFret - startFret + 1);

  const width = 110;
  const height = 130;
  const padTop = 22;
  const padBottom = 12;
  const padLeft = 12;
  const padRight = 12;
  const stringSpacing = (width - padLeft - padRight) / 5;
  const fretSpacing = (height - padTop - padBottom) / numFretsShown;

  let svg = `<svg class="shape-svg" viewBox="0 0 ${width} ${height}">`;

  // Draw nut (thick line) at top if startFret === 1
  const topY = padTop;
  if (startFret === 1) {
    svg += `<line class="nut-line" x1="${padLeft}" y1="${topY}" x2="${width - padRight}" y2="${topY}" />`;
  } else {
    // Show fret number
    svg += `<text class="fret-number" x="${padLeft - 2}" y="${topY + fretSpacing / 2 + 3}" text-anchor="end">${startFret}</text>`;
  }

  // Fret lines
  for (let i = 0; i <= numFretsShown; i++) {
    const y = topY + i * fretSpacing;
    svg += `<line class="fret-line" x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" />`;
  }

  // String lines (6 strings, index 0 = low E on the left)
  for (let s = 0; s < 6; s++) {
    const x = padLeft + s * stringSpacing;
    svg += `<line class="string-line" x1="${x}" y1="${topY}" x2="${x}" y2="${topY + numFretsShown * fretSpacing}" />`;
  }

  // Open / muted markers above the nut
  for (let s = 0; s < 6; s++) {
    const x = padLeft + s * stringSpacing;
    const fretVal = shape.frets[s];
    if (fretVal === -1) {
      svg += `<text class="muted-x" x="${x}" y="${topY - 8}">✕</text>`;
    } else if (fretVal === 0) {
      svg += `<circle class="open-circle" cx="${x}" cy="${topY - 10}" r="4" />`;
    }
  }

  // Barres first (so finger dots sit on top)
  if (shape.barres) {
    shape.barres.forEach(b => {
      const fromX = padLeft + b.fromString * stringSpacing;
      const toX = padLeft + b.toString * stringSpacing;
      const y = topY + (b.fret - startFret + 0.5) * fretSpacing;
      svg += `<line class="barre-line" x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}" />`;
    });
  }

  // Finger dots
  for (let s = 0; s < 6; s++) {
    const fretVal = shape.frets[s];
    if (fretVal <= 0) continue;
    const finger = shape.fingers?.[s];
    const x = padLeft + s * stringSpacing;
    const y = topY + (fretVal - startFret + 0.5) * fretSpacing;
    svg += `<circle class="finger-dot" cx="${x}" cy="${y}" r="7" />`;
    if (finger) {
      svg += `<text class="finger-label" x="${x}" y="${y}">${finger}</text>`;
    }
  }

  svg += `</svg>`;
  return svg;
}
