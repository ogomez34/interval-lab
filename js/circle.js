import { CIRCLE_MAJOR, CIRCLE_MINOR, CIRCLE_MAJOR_SOLFEGE, CIRCLE_MINOR_SOLFEGE,
  CIRCLE_THEME_COLORS, INTERVAL_LABELS, MAJOR_SCALE,
  noteNameToPc, polarToCartesian, describeArc, mod12 } from './music.js';
import { getNoteNames } from './storage.js';

// Shared circle-of-fifths renderer. Builds the whole SVG inside `container`.
//
// opts:
//   onSliceClick(index)      — called when a major or minor slice is tapped
//   highlight: { rootPc, dimOthers } — highlight I, IV, V and relative minor vi
//   labelMode:
//     'notes'     — letters on every slice (C, G, D… / Am, Em…)
//     'intervals' — the 12-step degree numbers instead of letters (1, ♭2, 2…)
//     'nashville' — only the 7 scale numbers (1–7); inner ring gets 2–, 3–, 6–
//   centerTop, centerBottom  — two short lines of center text
export function renderCircleOfFifths(container, opts = {}) {
  if (!container) return;
  const {
    onSliceClick = null,
    highlight = null,
    labelMode = 'notes',
    centerTop = 'Click a key',
    centerBottom = 'to see its notes'
  } = opts;

  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const colors = CIRCLE_THEME_COLORS[theme] || CIRCLE_THEME_COLORS.dark;
  const labelColor = theme === 'light' ? '#000' : '#fff';

  // Resolve highlight colours explicitly (Safari is unreliable with CSS
  // variables inside SVG — see drawOctaveLines in guitar.js).
  const cssVar = (name, fallback) =>
    (getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim() || fallback;
  const rootColor = cssVar('--root', '#e8a04b');
  const fourColor = cssVar('--good', '#7dc97a');
  const fiveColor = cssVar('--accent', '#f0a24a');
  const sixColor = cssVar('--nash-cell-border', '#6a7ab0');
  const bgColor = cssVar('--bg', '#121212');
  const mutedColor = cssVar('--muted', '#9a958c');
  const borderColor = cssVar('--border', '#3a3a40');

  // Which slices are I, IV, V and vi?
  let rootPc = null;
  let rootIdx = -1, ivIdx = -1, vIdx = -1, viIdx = -1, dimOthers = false;
  if (highlight && highlight.rootPc !== undefined) {
    rootPc = mod12(highlight.rootPc);
    rootIdx = CIRCLE_MAJOR.findIndex(n => noteNameToPc(n) === rootPc);
    ivIdx = (rootIdx + 11) % 12; // one step counterclockwise = the 4th
    vIdx = (rootIdx + 1) % 12;   // one step clockwise = the 5th
    viIdx = rootIdx;             // relative minor lives in the inner ring, same slice
    dimOthers = !!highlight.dimOthers;
  }

  const intervalOf = (i) => mod12(noteNameToPc(CIRCLE_MAJOR[i]) - rootPc);
  const isDiatonicMajor = (i) => MAJOR_SCALE.includes(intervalOf(i));
  const isDiatonicMinor = (i) => i === rootIdx || i === ivIdx || i === vIdx;

  const majorLabelFor = (i) => {
    if (!isDiatonicMajor(i)) return ''; // every view shows only the key's 7 slices
    if (labelMode === 'intervals') return INTERVAL_LABELS[intervalOf(i)].replace('b', '♭');
    if (labelMode === 'nashville') return String(MAJOR_SCALE.indexOf(intervalOf(i)) + 1);
    return getNoteNames() === 'solfege' ? CIRCLE_MAJOR_SOLFEGE[i] : CIRCLE_MAJOR[i];
  };

  const minorLabelFor = (i) => {
    if (!isDiatonicMinor(i)) return ''; // only the key's three minor chords are labelled
    if (labelMode === 'nashville') {
      if (i === ivIdx) return '2–';
      if (i === vIdx) return '3–';
      if (i === viIdx) return '6–';
      return '';
    }
    if (labelMode === 'intervals' && rootPc !== null) {
      // Inner ring shows the same 12-step ruler, relative to the Root.
      const minorPc = noteNameToPc(CIRCLE_MINOR[i].replace('m', ''));
      const interval = mod12(minorPc - rootPc);
      return INTERVAL_LABELS[interval].replace('b', '♭');
    }
    return getNoteNames() === 'solfege' ? CIRCLE_MINOR_SOLFEGE[i] : CIRCLE_MINOR[i];
  };

  const svgNS = 'http://www.w3.org/2000/svg';
  const cx = 200, cy = 200;
  const rOuter = 180, rMid = 110, rInner = 70;
  const rOuterLabel = 155, rMinorLabel = 90;

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 400');
  svg.setAttribute('class', 'circle-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Circle of fifths');

  const outer = document.createElementNS(svgNS, 'circle');
  outer.setAttribute('class', 'circle-outer');
  outer.setAttribute('cx', cx);
  outer.setAttribute('cy', cy);
  outer.setAttribute('r', rOuter);
  outer.style.stroke = borderColor; // Safari: resolve CSS vars explicitly in SVG
  svg.appendChild(outer);

  const inner = document.createElementNS(svgNS, 'circle');
  inner.setAttribute('class', 'circle-inner');
  inner.setAttribute('cx', cx);
  inner.setAttribute('cy', cy);
  inner.setAttribute('r', rMid);
  inner.style.stroke = borderColor;
  svg.appendChild(inner);

  const topText = document.createElementNS(svgNS, 'text');
  topText.setAttribute('class', 'center-label');
  topText.setAttribute('x', cx);
  topText.setAttribute('y', 190);
  topText.setAttribute('text-anchor', 'middle');
  topText.style.fill = mutedColor;
  topText.textContent = centerTop;
  svg.appendChild(topText);

  const bottomText = document.createElementNS(svgNS, 'text');
  bottomText.setAttribute('class', 'center-label');
  bottomText.setAttribute('x', cx);
  bottomText.setAttribute('y', 212);
  bottomText.setAttribute('text-anchor', 'middle');
  bottomText.style.fill = mutedColor;
  bottomText.textContent = centerBottom;
  svg.appendChild(bottomText);

  for (let i = 0; i < 12; i++) {
    const startAngle = i * 30;
    const endAngle = startAngle + 30;
    const midAngle = startAngle + 15;

    const isRoot = i === rootIdx;
    const isFour = i === ivIdx;
    const isFive = i === vIdx;
    const isSix = i === viIdx;

    // Dim the slices outside the key in every view, so the 7 in-key slices
    // (and the three minor chords) stand out.
    const dimmed = dimOthers && rootPc !== null && !isDiatonicMajor(i);

    const majorPath = document.createElementNS(svgNS, 'path');
    majorPath.setAttribute('d', describeArc(cx, cy, rOuter, rMid, startAngle, endAngle));
    majorPath.setAttribute('fill', colors[i]);
    majorPath.setAttribute('stroke', bgColor);
    majorPath.setAttribute('stroke-width', isRoot ? '3' : (isFour || isFive) ? '2.5' : '2');
    if (isRoot) majorPath.setAttribute('stroke', rootColor);
    else if (isFour) majorPath.setAttribute('stroke', fourColor);
    else if (isFive) majorPath.setAttribute('stroke', fiveColor);
    majorPath.classList.add('sector');
    if (isRoot) majorPath.classList.add('hl-root');
    if (isFour) majorPath.classList.add('hl-four');
    if (isFive) majorPath.classList.add('hl-five');
    if (dimmed) majorPath.classList.add('dimmed');
    if (onSliceClick) majorPath.addEventListener('click', () => onSliceClick(i));
    svg.appendChild(majorPath);

    const minorPath = document.createElementNS(svgNS, 'path');
    minorPath.setAttribute('d', describeArc(cx, cy, rMid, rInner, startAngle, endAngle));
    minorPath.setAttribute('fill', colors[i]);
    minorPath.setAttribute('fill-opacity', isDiatonicMinor(i) ? '0.75' : '0.35');
    minorPath.setAttribute('stroke', bgColor);
    minorPath.setAttribute('stroke-width', isSix ? '2.5' : '2');
    if (isSix) minorPath.setAttribute('stroke', sixColor);
    minorPath.classList.add('sector');
    if (isSix) minorPath.classList.add('hl-six');
    if (onSliceClick) minorPath.addEventListener('click', () => onSliceClick(i));
    svg.appendChild(minorPath);

    const majorPos = polarToCartesian(cx, cy, rOuterLabel, midAngle);
    const minorPos = polarToCartesian(cx, cy, rMinorLabel, midAngle);

    const majorText = document.createElementNS(svgNS, 'text');
    majorText.setAttribute('x', majorPos.x);
    majorText.setAttribute('y', majorPos.y + 6);
    majorText.setAttribute('text-anchor', 'middle');
    majorText.setAttribute('class', 'major-label');
    majorText.setAttribute('fill', labelColor);
    majorText.setAttribute('style', `fill:${labelColor};`);
    majorText.textContent = majorLabelFor(i);
    svg.appendChild(majorText);

    const minorText = document.createElementNS(svgNS, 'text');
    minorText.setAttribute('x', minorPos.x);
    minorText.setAttribute('y', minorPos.y + 5);
    minorText.setAttribute('text-anchor', 'middle');
    minorText.setAttribute('class', 'minor-label');
    minorText.setAttribute('fill', labelColor);
    minorText.setAttribute('style', `fill:${labelColor};`);
    minorText.textContent = minorLabelFor(i);
    svg.appendChild(minorText);
  }

  container.innerHTML = '';
  container.appendChild(svg);
}

// Returns the slice index (0-11) in CIRCLE_MAJOR for a pitch class.
export function circleIndexForPc(pc) {
  const p = mod12(pc);
  return CIRCLE_MAJOR.findIndex(n => noteNameToPc(n) === p);
}
