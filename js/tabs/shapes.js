// Tetrachord shapes & 3/2 scales — the htuch method.
// Adapted from https://github.com/htuch/tetrachords (MIT License).
// All-fourths maths + B-string skew, tetromino shapes (I/R/Z/J), and the
// 10-scale library built from four tetrachord building blocks.

import { mod12 } from '../music.js';
import { formatNoteForDisplay } from '../storage.js';
import { playSequence } from '../audio.js';
import { renderFretboardInto, getCurrentTuning } from './guitar.js';

// ---- data -------------------------------------------------------------

const TETRAS = {
  major:    { name: 'Major',    steps: [2, 2, 1], color: '#4a9eff', lower: ['1', '2', '3', '4'],       upper: ['5', '6', '7', '8'] },
  minor:    { name: 'Minor',    steps: [2, 1, 2], color: '#6cbf6c', lower: ['1', '2', '♭3', '4'],      upper: ['5', '6', '♭7', '8'] },
  harmonic: { name: 'Harmonic', steps: [1, 3, 1], color: '#9aa7b8', lower: ['1', '♭2', '3', '4'],      upper: ['5', '♭6', '7', '8'] },
  phrygian: { name: 'Phrygian', steps: [1, 2, 2], color: '#d98a4a', lower: ['1', '♭2', '♭3', '4'],     upper: ['5', '♭6', '♭7', '8'] },
};

// Number of notes that stay on the LOWER string before crossing to the next.
const SHAPE_SPLIT = { I: 4, Z: 2, R: 3, J: 1 };

const SCALES_UPSTREAM = [
  { name: 'Major',             lower: 'major',    upper: 'major',    opt: ['Z', 'J'] },
  { name: 'Mixolydian',        lower: 'major',    upper: 'minor',    opt: ['Z', 'J'] },
  { name: 'Natural minor',     lower: 'minor',    upper: 'phrygian', opt: ['R', 'Z'] },
  { name: 'Harmonic minor',    lower: 'minor',    upper: 'harmonic', opt: ['R', 'Z'] },
  { name: 'Melodic minor',     lower: 'minor',    upper: 'major',    opt: ['R', 'Z'] },
  { name: 'Dorian',            lower: 'minor',    upper: 'minor',    opt: ['R', 'R'] },
  { name: 'Phrygian',          lower: 'phrygian', upper: 'phrygian', opt: ['R', 'Z'] },
  { name: 'Phrygian dominant', lower: 'harmonic', upper: 'phrygian', opt: ['Z', 'Z'] },
  { name: 'Neapolitan minor',  lower: 'phrygian', upper: 'harmonic', opt: ['R', 'Z'] },
  { name: 'Double harmonic',   lower: 'harmonic', upper: 'harmonic', opt: ['Z', 'Z'] },
];

const cumsum = (steps) => steps.reduce((a, s) => { a.push(a[a.length - 1] + s); return a; }, [0]);
const tetraOffsets = (key) => cumsum(TETRAS[key].steps); // [0, a, a+b, 5]

function scaleSemis(row) {
  const L = tetraOffsets(row.lower);
  const U = tetraOffsets(row.upper);
  const start = L[3] + 2; // whole-step gap between the two tetrachords
  return [...L, ...U.map(s => start + s)];
}

function scaleHalfsteps(row) {
  const L = TETRAS[row.lower].steps.join('');
  const U = TETRAS[row.upper].steps.join('');
  return `${L}-2-${U}`;
}

function scaleIntervals(row) {
  const L = TETRAS[row.lower].lower;
  const U = TETRAS[row.upper].upper;
  return [...L, ...U].join(' ');
}

// ---- shape maths (all-fourths; B-string skew explained in the UI) ----

function shapeMarkers(tetraKey, shapeKey, anchor = { s: 0, f: 0 }) {
  const off = tetraOffsets(tetraKey);          // frets on one string
  const k = SHAPE_SPLIT[shapeKey];             // notes kept on the lower string
  const t = TETRAS[tetraKey];
  const markers = [];
  off.forEach((f, i) => {
    if (i < k) markers.push({ s: anchor.s, f: anchor.f + f, label: t.lower[i], root: i === 0 });
    else markers.push({ s: anchor.s + 1, f: anchor.f + f - 5, label: t.upper[i], root: false });
  });
  return markers;
}

function scaleOctaveMarkers(row) {
  // One octave = two strings: lower tetrachord at the root, upper tetrachord
  // at P5 (next string, +2 frets), each in its optimal shape.
  const lower = shapeMarkers(row.lower, row.opt[0], { s: 0, f: 0 });
  const upper = shapeMarkers(row.upper, row.opt[1], { s: 1, f: 2 });
  return { lower, upper };
}

function shiftMarkers(markers) {
  const min = Math.min(...markers.map(m => m.f));
  return { markers: markers.map(m => ({ ...m, f: m.f - min })), min };
}

// ---- SVG --------------------------------------------------------------

function markersSvg(markerGroups, maxFret, stringCount) {
  const cell = 44;
  const pad = 30;
  const top = 26;
  const stringH = 58;
  const W = pad * 2 + (maxFret + 1) * cell;
  const H = top + stringCount * stringH + 26;
  let out = `<svg class="shape-svg" viewBox="0 0 ${W} ${H}" role="img">`;
  // frets
  for (let f = 0; f <= maxFret; f++) {
    const x = pad + f * cell;
    out += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + stringCount * stringH}" stroke="var(--fret-border)" stroke-width="1"/>`;
    out += `<text x="${x + cell / 2}" y="${top - 8}" text-anchor="middle" class="shape-fretnum">${f}</text>`;
  }
  // strings
  for (let s = 0; s < stringCount; s++) {
    const y = top + s * stringH + stringH / 2;
    out += `<line x1="${pad - 12}" y1="${y}" x2="${pad + (maxFret + 1) * cell}" y2="${y}" stroke="var(--fret-border)" stroke-width="${s === 0 ? 3 : 2}"/>`;
  }
  // markers
  for (const group of markerGroups) {
    const { markers } = shiftMarkers(group.markers);
    markers.forEach(m => {
      const cx = pad + m.f * cell + cell / 2;
      const cy = top + m.s * stringH + stringH / 2;
      const fill = group.color;
      out += `<circle cx="${cx}" cy="${cy}" r="15" fill="${fill}" ${m.root ? '' : 'fill-opacity="0.38"'}/>`;
      out += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" class="shape-note">${m.label}</text>`;
    });
  }
  out += '</svg>';
  return out;
}

function shapeSvg(tetraKey, shapeKey) {
  const t = TETRAS[tetraKey];
  const raw = shapeMarkers(tetraKey, shapeKey);
  const shifted = shiftMarkers(raw).markers;
  const maxFret = Math.max(...shifted.map(m => m.f), 3);
  return markersSvg([{ markers: shifted, color: t.color }], maxFret, 2);
}

function octaveSvg(row) {
  const { lower, upper } = scaleOctaveMarkers(row);
  const all = [...lower, ...upper];
  const shifted = shiftMarkers(all).markers;
  const maxFret = Math.max(...shifted.map(m => m.f), 5);
  const groups = [
    { markers: shifted.filter((m, i) => i < 4), color: TETRAS[row.lower].color },
    { markers: shifted.filter((m, i) => i >= 4), color: TETRAS[row.upper].color },
  ];
  return markersSvg(groups, maxFret, 3);
}

// ---- rendering ---------------------------------------------------------

export function renderShapes() {
  const tetraCards = Object.entries(TETRAS).map(([key, t]) => `
    <div class="tetra-card">
      <span class="tetra-dot" style="background:${t.color}"></span>
      <b>${t.name}</b>
      <span class="muted">${t.steps.join(' ')}</span>
      <span class="muted">${t.lower.join(' ')} · ${t.upper.join(' ')}</span>
    </div>`).join('');

  const scaleRows = SCALES_UPSTREAM.map((r, i) => `
    <tr>
      <td><b>${r.name}</b></td>
      <td>${TETRAS[r.lower].name}</td>
      <td>${TETRAS[r.upper].name}</td>
      <td class="muted">${scaleHalfsteps(r)}</td>
      <td class="muted">${scaleIntervals(r)}</td>
      <td>${r.opt[0]}-shape + ${r.opt[1]}-shape</td>
      <td><button type="button" class="secondary" data-open-scale="${i}">Open</button></td>
    </tr>`).join('');

  return `
    <h2>🧩 Tetrachord shapes</h2>
    <p class="muted-intro">The <b>htuch method</b>: four little ladders snap together like Tetris pieces to build every scale, and each ladder has just <b>four shapes</b> on two strings. Learn one building block and you can derive the whole neck.</p>

    <section class="theory-block">
      <h3>1 · The four building blocks</h3>
      <div class="tetra-cards">${tetraCards}</div>
    </section>

    <section class="theory-block">
      <h3>2 · The four shapes — I, R, Z, J</h3>
      <p>Each tetrachord crosses two strings in four ways, named after Tetris pieces. The <b>filled</b> note is the root. R is just a truncated I; J is I's tail on the next string.</p>
      <label>Tetrachord
        <select id="shapeTetra">
          ${Object.keys(TETRAS).map(k => `<option value="${k}">${TETRAS[k].name}</option>`).join('')}
        </select>
      </label>
      <div class="shape-grid" id="shapeViewer"></div>
      <p class="muted">Shapes assume all-fourths string pairs. On the <b>G→B pair</b>, shift every note on the upper string <b>+1 fret</b> — that's the standard-tuning "B-string skew".</p>
    </section>

    <section class="theory-block">
      <h3>3 · The scale library — two tetrachords snapped together</h3>
      <p>Seven-note scales are <b>lower tetrachord + whole step + upper tetrachord</b>. Only the name→pair mapping is worth remembering — and the names make it easy: Phrygian = two Phrygian tetrachords, harmonic minor = minor + harmonic.</p>
      <div class="table-scroll">
      <table>
        <tr><th>Scale / mode</th><th>Lower</th><th>Upper</th><th>Halfsteps</th><th>Intervals</th><th>Optimal shapes</th><th></th></tr>
        ${scaleRows}
      </table>
      </div>
    </section>

    <section class="theory-block">
      <h3>4 · Explorer — the scale on the whole neck</h3>
      <div class="settings-row">
        <label>Scale
          <select id="explorerScale">
            ${SCALES_UPSTREAM.map((r, i) => `<option value="${i}">${r.name}</option>`).join('')}
          </select>
        </label>
        <label>Root
          <select id="explorerRoot">${[...Array(12)].map((_, pc) => `<option value="${pc}">${formatNoteForDisplay(pc)}</option>`).join('')}</select>
        </label>
        <button type="button" class="play-btn" id="explorerPlay">▶ Play scale</button>
      </div>
      <p id="explorerFormula"></p>
      <p class="muted">One octave = two strings: lower tetrachord (${'<b>coloured</b>'}) on the low string, upper tetrachord at the P5 — next string, +2 frets. Repeat the pair over the three string pairs and you cover three octaves.</p>
      <div class="octave-box" id="explorerOctave"></div>
      <div class="fretboard-wrap">
        <div class="fretboard" id="explorerBoard"></div>
      </div>
    </section>

    <p class="muted">Method adapted from <a href="https://github.com/htuch/tetrachords" target="_blank" rel="noopener">htuch/tetrachords</a> (MIT License).</p>
  `;
}

function renderShapeViewer() {
  const key = document.getElementById('shapeTetra').value;
  const el = document.getElementById('shapeViewer');
  if (!el) return;
  el.innerHTML = ['I', 'R', 'Z', 'J'].map(shape => `
    <figure class="shape-fig">
      ${shapeSvg(key, shape)}
      <figcaption>${shape}-shape</figcaption>
    </figure>`).join('');
}

function renderExplorer() {
  const scaleEl = document.getElementById('explorerScale');
  const rootEl = document.getElementById('explorerRoot');
  if (!scaleEl || !rootEl) return;
  const row = SCALES_UPSTREAM[parseInt(scaleEl.value, 10)];
  const rootPc = parseInt(rootEl.value, 10);
  const semis = scaleSemis(row);

  const formula = document.getElementById('explorerFormula');
  if (formula) {
    const L = TETRAS[row.lower];
    const U = TETRAS[row.upper];
    formula.innerHTML = `<b>${row.name}</b> in ${formatNoteForDisplay(rootPc)}: <b>${L.name}</b> (${L.steps.join(' ')}) + <b>W</b> + <b>${U.name}</b> (${U.steps.join(' ')}) — optimal shapes <b>${row.opt[0]}-shape + ${row.opt[1]}-shape</b>.`;
  }

  const octave = document.getElementById('explorerOctave');
  if (octave) octave.innerHTML = octaveSvg(row);

  const board = document.getElementById('explorerBoard');
  if (board) {
    renderFretboardInto(board, {
      rootPc,
      scale: semis,
      showAll: false,
      intervalOverlay: true,
      tuning: getCurrentTuning(),
    });
  }
}

export function initShapes() {
  document.getElementById('shapeTetra').addEventListener('change', renderShapeViewer);
  document.getElementById('explorerScale').addEventListener('change', renderExplorer);
  document.getElementById('explorerRoot').addEventListener('change', renderExplorer);
  document.getElementById('explorerPlay').addEventListener('click', () => {
    const row = SCALES_UPSTREAM[parseInt(document.getElementById('explorerScale').value, 10)];
    const rootPc = parseInt(document.getElementById('explorerRoot').value, 10);
    const semis = scaleSemis(row);
    const midis = [...semis, 12, ...semis.map(s => s + 12)].map(s => 48 + mod12(rootPc + s));
    playSequence(midis, 0.32, 'guitar');
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-scale]');
    if (!btn) return;
    const sel = document.getElementById('explorerScale');
    sel.value = btn.dataset.openScale;
    renderExplorer();
    document.getElementById('explorerScale').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  renderShapeViewer();
  renderExplorer();
}
