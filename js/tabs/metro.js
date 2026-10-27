import { $ } from '../music.js';
import { playClick } from '../audio.js';
import { info } from '../infobox.js';

// Common time signatures. `top` = beats per measure, `bottom` = note value
// that gets one beat (4 = quarter note, 8 = eighth note). Signatures whose
// top number is a multiple of 3 (and bottom is 8) are "compound" meters,
// where the felt pulse is a dotted quarter grouping three eighth notes.
const TIME_SIGNATURES = [
  { id: '2/4', top: 2, bottom: 4 },
  { id: '3/4', top: 3, bottom: 4 },
  { id: '4/4', top: 4, bottom: 4 },
  { id: '5/4', top: 5, bottom: 4 },
  { id: '6/8', top: 6, bottom: 8, compound: true },
  { id: '9/8', top: 9, bottom: 8, compound: true },
  { id: '12/8', top: 12, bottom: 8, compound: true },
];

const SUBDIVISIONS = [
  { id: 'none', factor: 1, label: '♩ Quarter notes (no subdivision)' },
  { id: 'eighths', factor: 2, label: '♫ Eighth notes (2 per beat)' },
  { id: 'triplets', factor: 3, label: '♫³ Eighth-note triplets (3 per beat)' },
  { id: 'sixteenths', factor: 4, label: '16th notes (4 per beat)' },
];

let metroInterval = null;
let metroTick = 0; // index within the bar, counted in the smallest audible unit
let metroBar = 1;
let metroRunning = false;

function currentSig() {
  return TIME_SIGNATURES.find(s => s.id === $('timeSig').value) || TIME_SIGNATURES[2];
}

function currentSubdivisionFactor() {
  const sig = currentSig();
  if (sig.compound) return 1; // compound meters already subdivide into eighths; keep it simple
  const sub = SUBDIVISIONS.find(s => s.id === $('subdivision').value) || SUBDIVISIONS[0];
  return sub.factor;
}

// How many audible ticks make up one bar, and which of those ticks are the
// "main beat" (bigger, possibly accented) versus a subdivision tick.
function tickPlan() {
  const sig = currentSig();
  if (sig.compound) {
    // e.g. 6/8 -> 6 eighth-note ticks, main pulse every 3rd (dotted-quarter feel)
    return { ticksPerBar: sig.top, mainEvery: 3, mainBeats: sig.top / 3 };
  }
  const factor = currentSubdivisionFactor();
  return { ticksPerBar: sig.top * factor, mainEvery: factor, mainBeats: sig.top };
}

export function renderMetro() {
  const sigOptions = TIME_SIGNATURES.map(s =>
    `<option value="${s.id}"${s.id === '4/4' ? ' selected' : ''}>${s.id}</option>`).join('');
  const subOptions = SUBDIVISIONS.map(s => `<option value="${s.id}">${s.label}</option>`).join('');

  return `
    <h2>⏱️ Metronome ${info('BPM, time signatures & note values', `
      <p>This is like a musical heartbeat — it clicks at a steady speed so you can play perfectly in time.</p>
      <p><b>BPM</b> stands for <b>Beats Per Minute</b> — how many clicks happen in one minute. Slower numbers (like 60) give you more time between notes; faster numbers (like 160) are quicker.</p>
      <p>A <b>time signature</b> like <b>4/4</b> is written as one number over another, just like on sheet music:</p>
      <ul>
        <li>The <b>top number</b> says how many beats are in each measure (called a <b>bar</b>) before it repeats.</li>
        <li>The <b>bottom number</b> says which note value counts as one beat — <b>4</b> means a <b>quarter note (♩)</b>, <b>8</b> means an <b>eighth note (♪)</b>.</li>
      </ul>
      <p><b>Simple meters</b> (like 3/4, 4/4) split each beat evenly in two. <b>Compound meters</b> (like 6/8, 9/8, 12/8) naturally feel like groups of three — that's why the subdivision picker is swapped out for them.</p>
      <p><b>Subdivision</b> adds extra clicks between the main beats so you can practise reading and playing smaller note values: eighth notes, eighth-note triplets, or sixteenth notes.</p>
    `)}</h2>

    <div class="mini-controls">
      <label>Speed (BPM)
        <input type="number" id="bpm" value="90" min="30" max="300" style="width:80px;">
      </label>
      <label>Time signature
        <select id="timeSig">${sigOptions}</select>
      </label>
      <label id="subdivisionWrap">Subdivision
        <select id="subdivision">${subOptions}</select>
      </label>
      <label><input type="checkbox" id="metroAccent" checked> Accent first beat</label>
    </div>

    <div class="metro-display" id="bpmDisplay">90</div>
    <div class="metro-position" id="metroPosition">Bar 1 • Beat 1</div>

    <div style="text-align:center;margin-bottom:20px;" id="beatLights"></div>

    <div class="actions">
      <button class="primary" id="metroStart">Start</button>
      <button class="secondary" id="metroStop">Stop</button>
    </div>
  `;
}

export function initMetro() {
  $('metroStart').addEventListener('click', startMetro);
  $('metroStop').addEventListener('click', stopMetro);
  $('bpm').addEventListener('input', () => {
    updateBpmDisplay();
    if (metroRunning) { stopMetro(); startMetro(); }
  });
  $('timeSig').addEventListener('change', () => {
    applyCompoundVisibility();
    renderBeatLights();
    resetPosition();
    if (metroRunning) { stopMetro(); startMetro(); }
  });
  $('subdivision').addEventListener('change', () => {
    renderBeatLights();
    resetPosition();
    if (metroRunning) { stopMetro(); startMetro(); }
  });
  // If the user backgrounds the app while the metronome is running, stop it.
  // The audio context is suspended when the page is hidden, so leaving the
  // interval running would just produce silent ticks after returning.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && metroRunning) stopMetro();
  });
  applyCompoundVisibility();
  renderBeatLights();
  updateBpmDisplay();
  updatePositionDisplay();
}

// Expose BPM for other modules (e.g. scale practice)
export function getBpm() {
  const el = $('bpm');
  return el ? parseInt(el.value) : 90;
}

function applyCompoundVisibility() {
  const compound = currentSig().compound;
  const wrap = $('subdivisionWrap');
  if (wrap) wrap.style.display = compound ? 'none' : '';
}

function resetPosition() {
  metroTick = 0;
  metroBar = 1;
  updatePositionDisplay();
}

function renderBeatLights() {
  const { ticksPerBar, mainEvery } = tickPlan();
  const container = $('beatLights');
  container.innerHTML = '';
  for (let i = 0; i < ticksPerBar; i++) {
    const isMain = i % mainEvery === 0;
    const dot = document.createElement('span');
    dot.className = 'metro-beat' + (isMain ? ' main' : ' sub') + (i === 0 ? ' accent' : '');
    dot.dataset.tick = i;
    container.appendChild(dot);
  }
}

function updateBpmDisplay() {
  $('bpmDisplay').textContent = $('bpm').value;
}

function updatePositionDisplay() {
  const { mainEvery } = tickPlan();
  const beatNumber = Math.floor(metroTick / mainEvery) + 1;
  $('metroPosition').textContent = `Bar ${metroBar} • Beat ${beatNumber}`;
}

function tick() {
  const { ticksPerBar, mainEvery } = tickPlan();
  const accentOn = $('metroAccent').checked;
  const isMain = metroTick % mainEvery === 0;
  const isAccent = metroTick === 0 && accentOn;

  playClick(isMain, isAccent);

  document.querySelectorAll('.metro-beat').forEach(dot => {
    dot.classList.toggle('active', parseInt(dot.dataset.tick) === metroTick);
  });
  updatePositionDisplay();

  metroTick = (metroTick + 1) % ticksPerBar;
  if (metroTick === 0) metroBar++;
}

function startMetro() {
  if (metroRunning) return;
  metroRunning = true;
  metroTick = 0;
  metroBar = 1;
  const bpm = parseInt($('bpm').value);
  const { mainEvery } = tickPlan();
  // BPM always drives the felt main beat (a dotted quarter in compound meters,
  // the chosen beat unit in simple meters); subdivisions/compound eighths are
  // derived from that so musicians can keep tapping along at the same tempo.
  const mainBeatMs = 60000 / bpm;
  const intervalMs = mainBeatMs / mainEvery;
  tick();
  metroInterval = setInterval(tick, intervalMs);
}

function stopMetro() {
  metroRunning = false;
  if (metroInterval) clearInterval(metroInterval);
  metroInterval = null;
  document.querySelectorAll('.metro-beat').forEach(d => d.classList.remove('active'));
}
