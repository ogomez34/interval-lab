import { LEVELS, INTERVALS, LETTER_TO_SEMI, EAR_STAGES, intervalDetail, $, randomChoice, mod12, formatNoteName } from '../music.js';
import { playMidi, playSequence } from '../audio.js';
import {
  loadStats, recordAttempt, resetStats,
  getIntervalAccuracy, getAverageMs,
  getSetting, setSetting, formatNoteForDisplay
} from '../storage.js';
import { info } from '../infobox.js';
import { renderFretboardInto, getCurrentTuning } from './guitar.js';
import { on } from '../events.js';

const PFB_FRETS = 13;

let state = {
  score:0, streak:0, best:0, correct:0, total:0,
  current:null, answered:false,
  questionStartMs:0,
  weakSpotMode:false,
  mode: 'nameNote'
};

let fbState = { current: null, answered: false, correct: 0, total: 0 };
let revState = { targetPc: null, selected: new Set(), answered: false, correct: 0, total: 0 };
let twinState = { originMidi: null, targetKeys: new Set(), selected: new Set(), answered: false, correct: 0, total: 0, startMs: 0 };
let fiState = { rootPc: null, semis: null, selected: new Set(), answered: false, correct: 0, total: 0 };
let hpState = { rootPc: null, semis: null, rootMidi: 0, targetMidi: 0, selected: new Set(), answered: false, correct: 0, total: 0 };

const FB_MODES = ['findNote', 'findAll', 'octaveTwin', 'findInterval', 'hearPlay'];

export function renderPractice() {
  const weakSpotDefault = getSetting('weakSpotMode', false) ? 'checked' : '';
  const mode = getSetting('practiceMode', 'nameNote');
  const sel = (v) => mode === v ? 'selected' : '';
  const isFb = FB_MODES.includes(mode);
  return `
    <h2>🎯 Practice</h2>
    <p>Quick games to train your brain to spot notes fast. ${info('What is an "interval"?', `
      <p>An <b>interval</b> is just the gap between two notes. These games work with that gap: name the note on the other side of it, or name the gap itself.</p>
    `)}</p>

    <div class="controls">
      <label>Mode
        <select id="practiceMode">
          <option value="nameNote" ${sel('nameNote')}>Name the note (from an interval)</option>
          <option value="nameInterval" ${sel('nameInterval')}>Name the interval (from two notes)</option>
          <option value="hearAndName" ${sel('hearAndName')}>Hear a note, name it</option>
          <option value="findNote" ${sel('findNote')}>Find the note (on the guitar neck)</option>
          <option value="findAll" ${sel('findAll')}>Find them all (on the guitar neck)</option>
          <option value="findInterval" ${sel('findInterval')}>Find the interval (from a root)</option>
          <option value="hearPlay" ${sel('hearPlay')}>Hear it, play it (on the neck)</option>
          <option value="octaveTwin" ${sel('octaveTwin')}>Find its octave twin (timed)</option>
        </select>
      </label>
      <div id="textModeControls" style="display:${isFb ? 'none' : 'contents'};">
        <label>Level
          <select id="level">
            <option value="1">1 — Up, small intervals (2nd–4th)</option>
            <option value="2">2 — Up + down, small intervals</option>
            <option value="3">3 — Up + down, all intervals</option>
            <option value="4">4 — Up + down, all, sharps/flats</option>
          </select>
        </label>
        <label><input type="checkbox" id="soundOn" checked> Play sound on reveal</label>
        <label><input type="checkbox" id="weakSpot" ${weakSpotDefault}> Weak-spot drilling</label>
        <button class="secondary" id="resetBtn">Reset score</button>
      </div>
    </div>

    <div id="textGameArea" style="display:${isFb ? 'none' : 'block'};">
      <div class="stats">
        <span>Score: <b id="score">0</b></span>
        <span>Streak: <b id="streak">0</b></span>
        <span>Best streak: <b id="best">0</b></span>
        <span>Correct: <b id="correct">0</b>/<b id="total">0</b></span>
      </div>

      <div class="question">
        <div class="label">Question <span id="timerBadge" class="timer-badge" style="display:none;"></span></div>
        <div class="q" id="qText">Press Start</div>
      </div>

      <div class="answer-row">
        <input type="text" id="answerInput" placeholder="Your answer" autocomplete="off" spellcheck="false">
        <button class="primary" id="revealBtn">Reveal & Play</button>
      </div>

      <div class="result" id="result"></div>
      <div id="whyContainer"></div>

      <div class="actions">
        <button class="primary" id="startBtn">Start / New Question</button>
        <button class="play-btn" id="playBtn">Play / Replay</button>
        <button class="play-btn" id="whyBtn" style="display:none;">Why?</button>
      </div>

      <h2 style="margin-top:32px;">Your stats</h2>
      <p style="color:var(--muted);font-size:14px;">
        Tracked per interval and direction. Weak-spot mode weights questions toward your lowest-accuracy intervals.
        <button class="play-btn" id="clearStatsBtn" style="margin-left:8px;">Clear stats</button>
      </p>
      <div id="statsTable"></div>

      <p style="color:var(--muted);font-size:13px;margin-top:20px;">
        <b>Shortcuts:</b> <code>Enter</code> submit / next, <code>N</code> new question, <code>R</code> replay, <code>W</code> why.
      </p>
    </div>

    <div id="fbGameArea" style="display:${isFb ? 'block' : 'none'};">
      <div class="fretboard-wrap">
        <div class="fretboard" id="pfbFretboard"></div>
      </div>

      <div id="findNoteGame" style="display:${mode === 'findNote' ? 'block' : 'none'};">
        <p>A fret lights up — can you name the note?</p>
        <div class="mini-controls">
          <button class="primary" id="fbNewQ">New question</button>
          <button class="secondary" id="fbReveal">Reveal</button>
          <span id="fbStats" style="font-size:13px;color:var(--muted);"></span>
        </div>
        <div class="fb-question" id="fbQuestion">Press "New question" to start.</div>
      </div>

      <div id="findAllGame" style="display:${mode === 'findAll' ? 'block' : 'none'};">
        <p>We give you a note name — tap every fret on the neck that matches it, then reveal!</p>
        <div class="mini-controls">
          <button class="primary" id="revNewQ">New question</button>
          <button class="secondary" id="revReveal">Reveal</button>
          <span id="revStats" style="font-size:13px;color:var(--muted);"></span>
        </div>
        <div class="fb-question" id="revQuestion">Press "New question" to start.</div>
      </div>

      <div id="findIntervalGame" style="display:${mode === 'findInterval' ? 'block' : 'none'};">
        <p>A <b>root</b> lights up on the neck. Tap every fret that is the target <b>interval above it</b>, then reveal!</p>
        <div class="mini-controls">
          <button class="primary" id="fiNewQ">New question</button>
          <button class="secondary" id="fiReveal">Reveal</button>
          <span id="fiStats" style="font-size:13px;color:var(--muted);"></span>
        </div>
        <div class="fb-question" id="fiQuestion">Press "New question" to start.</div>
      </div>

      <div id="hearPlayGame" style="display:${mode === 'hearPlay' ? 'block' : 'none'};">
        <p>Listen: a root plays, then a second note. <b>Play it back</b> by tapping the right fret on the neck.</p>
        <div class="mini-controls">
          <button class="primary" id="hpNewQ">New question</button>
          <button class="play-btn" id="hpReplay">Replay</button>
          <button class="secondary" id="hpReveal">Reveal</button>
          <span id="hpStats" style="font-size:13px;color:var(--muted);"></span>
        </div>
        <div class="fb-question" id="hpQuestion">Press "New question" to start.</div>
      </div>

      <div id="twinGame" style="display:${mode === 'octaveTwin' ? 'block' : 'none'};">
        <p>A note lights up (highlighted ring) — click every other spot on the neck that's the <b>exact same note</b>, as fast as you can. ${info('What counts as a "twin"?', `
          <p>Two notes are twins when they're the same letter name, just a different octave — like C3 and C4. On the fretboard that usually means the shape "2 strings up + 2 frets up", but the exact frets depend on the tuning.</p>
          <p>This drill is the same "octave twins" idea from the Guitar tab, just turned into a race against the clock.</p>
        `)}</p>
        <div class="mini-controls">
          <button class="primary" id="twinNewQ">New question</button>
          <button class="secondary" id="twinReveal">Reveal</button>
          <span id="twinStats" style="font-size:13px;color:var(--muted);"></span>
        </div>
        <div class="fb-question" id="twinQuestion">Press "New question" to start.</div>
      </div>
    </div>
  `;
}

function getAllIntervalKeysForLevel(level) {
  const cfg = LEVELS[level];
  const keys = [];
  for (const dir of cfg.directions) {
    for (const semis of cfg.semis) {
      keys.push({ dir, semis, key: `${dir === 1 ? 'up' : 'down'}:${semis}` });
    }
  }
  return keys;
}

function pickWeightedInterval(level, stats) {
  const candidates = getAllIntervalKeysForLevel(level);
  const weights = candidates.map(c => {
    const acc = getIntervalAccuracy(stats, c.key);
    if (acc === null) return 3;
    return Math.max(1, (1 - acc) * 5 + 1);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function pickUniformInterval(level) {
  const cfg = LEVELS[level];
  const direction = randomChoice(cfg.directions);
  const semis = randomChoice(cfg.semis);
  return { dir: direction, semis, key: `${direction === 1 ? 'up' : 'down'}:${semis}` };
}

function makeQuestion() {
  const level = parseInt($('level').value);
  const stats = loadStats();
  const chosen = state.weakSpotMode
    ? pickWeightedInterval(level, stats)
    : pickUniformInterval(level);

  const { dir: direction, semis } = chosen;

  const startName = randomChoice(Object.keys(LETTER_TO_SEMI));
  const startPc = LETTER_TO_SEMI[startName];
  const startMidi = 60 + startPc;
  const targetMidi = startMidi + direction * semis;
  const targetPc = mod12(targetMidi);
  const startDisplay = formatNoteForDisplay(startPc);
  const targetDisplay = formatNoteForDisplay(targetPc);
  const intervalName = INTERVALS.find(i => i[0] === semis)[1];
  const dirWord = direction === 1 ? 'Up' : 'Down';

  if (state.mode === 'nameNote') {
    return {
      kind: 'nameNote',
      text: `${dirWord} a ${intervalName} from ${startDisplay}?`,
      answer: targetDisplay,
      targetPc, startPc, targetMidi, startMidi,
      intervalKey: chosen.key,
      hint: 'Type the note name',
      direction, semis, startName, intervalName
    };
  }

  if (state.mode === 'nameInterval') {
    return {
      kind: 'nameInterval',
      text: `What interval is ${startDisplay} → ${targetDisplay} (${dirWord.toLowerCase()})?`,
      answer: intervalName,
      targetPc, startPc, targetMidi, startMidi,
      intervalKey: chosen.key,
      hint: 'Type the interval',
      direction, semis, startName, intervalName
    };
  }

  return {
    kind: 'hearAndName',
    text: `Listen. What note is played after ${startDisplay}?`,
    answer: targetDisplay,
    targetPc, startPc, targetMidi, startMidi,
    intervalKey: chosen.key,
    hint: 'Type the note name',
    playsAudio: true,
    direction, semis, startName, intervalName
  };
}

function showTimerBadge(ms) {
  const badge = $('timerBadge');
  badge.style.display = 'inline-block';
  const seconds = (ms / 1000).toFixed(1);
  let cls = 'timer-badge ';
  if (ms < 2500) cls += 'fast';
  else if (ms < 6000) cls += 'medium';
  else cls += 'slow';
  badge.className = cls;
  badge.textContent = `${seconds}s`;
}

function clearTimerBadge() {
  const badge = $('timerBadge');
  badge.style.display = 'none';
  badge.textContent = '';
}

function playCurrentAudio() {
  if (!state.current) return;
  if (state.current.playsAudio) {
    playSequence([state.current.startMidi, state.current.targetMidi], 0.8);
  } else {
    playMidi(state.current.targetMidi);
  }
}

function newQuestion() {
  state.current = makeQuestion();
  state.answered = false;
  $('qText').textContent = state.current.text;
  $('answerInput').value = '';
  $('answerInput').placeholder = state.current.hint;
  $('answerInput').focus();
  $('result').textContent = '';
  $('result').className = 'result';
  $('whyContainer').innerHTML = '';
  $('whyBtn').style.display = 'none';
  $('playBtn').disabled = false;
  clearTimerBadge();
  if (state.current.playsAudio) setTimeout(playCurrentAudio, 250);
  state.questionStartMs = Date.now();
}

// Normalize a typed answer: case, unicode accidentals, and whitespace.
function normalizeAnswerInput(s) {
  return s.trim().toLowerCase()
    .replace('♯','#').replace('♭','b')
    .replace(/\s+/g,' ');
}

// Every spelling a typed note answer could reasonably use: letters and
// fixed-Do solfège, sharps and flats.
function acceptedNoteAnswers(pc) {
  const set = new Set();
  for (const notation of ['letters', 'solfege']) {
    for (const pref of ['sharps', 'flats', 'both']) {
      set.add(normalizeAnswerInput(formatNoteName(pc, pref, notation)));
    }
  }
  return set;
}

function checkAnswer(userRaw, correctRaw, kind) {
  const norm = normalizeAnswerInput;
  const user = norm(userRaw);
  if (kind === 'nameInterval') {
    const compact = s => s.replace(/\s+/g,'');
    return compact(user) === compact(norm(correctRaw));
  }
  // Note answers accept letters or solfège, sharp or flat spelling.
  const q = state.current;
  return acceptedNoteAnswers(q.targetPc).has(user);
}

function reveal() {
  if (!state.current || state.answered) return;
  const elapsed = Date.now() - state.questionStartMs;
  const user = $('answerInput').value;
  const correct = state.current.answer;
  const isCorrect = user && checkAnswer(user, correct, state.current.kind);

  state.total++;
  if (isCorrect) {
    state.correct++;
    state.streak++;
    state.best = Math.max(state.best, state.streak);
    state.score += 10 + Math.min(state.streak, 10);
    $('result').className = 'result good';
    $('result').innerHTML = `✓ Correct! <span class="note">Answer: ${correct}</span>`;
  } else {
    state.streak = 0;
    $('result').className = 'result bad';
    $('result').innerHTML = `✗ ${user ? 'Not quite.' : 'Skipped.'} <span class="note">Answer: ${correct}</span>`;
    $('whyBtn').style.display = 'inline-block';
  }

  recordAttempt(state.current.intervalKey, isCorrect, elapsed);
  showTimerBadge(elapsed);
  updateStats();
  renderStatsTable();

  if ($('soundOn').checked) playMidi(state.current.targetMidi);
  state.answered = true;
}

function showWhy() {
  if (!state.current) return;
  const q = state.current;

  // Build the "why" steps for nameNote / hearAndName
  const LETTER_TO_NUM = { C:1, D:2, E:3, F:4, G:5, A:6, B:7 };
  const NUM_TO_LETTER = { 1:'C', 2:'D', 3:'E', 4:'F', 5:'G', 6:'A', 7:'B' };
  const semis = q.semis;
  const dirSign = q.direction === 1 ? '+' : '−';
  const startNum = LETTER_TO_NUM[q.startName];
  // Convert semitone distance to scale-step distance (diatonic steps)
  // This is approximate — a proper version would use interval-name→steps table.
  const INTERVAL_STEPS = {
    1: 1, // minor 2nd = 1 step
    2: 1, // major 2nd = 1 step
    3: 2, // minor 3rd = 2 steps
    4: 2, // major 3rd = 2 steps
    5: 3, // perfect 4th = 3 steps
    6: 3, // tritone = 3 steps (approx)
    7: 4, // perfect 5th = 4 steps
    8: 5, // minor 6th = 5 steps
    9: 5, // major 6th = 5 steps
    10: 6, // minor 7th = 6 steps
    11: 6, // major 7th = 6 steps
    12: 7  // octave = 7 steps
  };
  const steps = INTERVAL_STEPS[semis] || 0;
  const rawTargetNum = dirSign === '+' ? startNum + steps : startNum - steps;
  // Wrap into 1..7
  let wrapped = ((rawTargetNum - 1) % 7 + 7) % 7 + 1;
  const targetLetter = NUM_TO_LETTER[wrapped];

  const container = $('whyContainer');
  const dirWord = q.direction === 1 ? 'up' : 'down';
  const startDisplay = formatNoteForDisplay(q.startPc);
  const targetLetterDisplay = formatNoteForDisplay(LETTER_TO_SEMI[targetLetter]);

  container.innerHTML = `
    <div class="why-box">
      <div><b>Why "${q.answer}"?</b></div>
      <span class="step">Start on ${startDisplay} = number ${startNum}</span>
      <span class="step">Interval: ${q.intervalName} = ${steps} scale step${steps === 1 ? '' : 's'} ${dirWord}</span>
      <span class="step">${startNum} ${dirSign} ${steps} = ${rawTargetNum} → wrap to ${wrapped}</span>
      <span class="step">Number ${wrapped} = <b>${targetLetterDisplay}</b></span>
      <span class="step">Sharp/flat adjustments (if any) give: <span class="result">${q.answer}</span></span>
    </div>
  `;
}

function updateStats() {
  $('score').textContent = state.score;
  $('streak').textContent = state.streak;
  $('best').textContent = state.best;
  $('correct').textContent = state.correct;
  $('total').textContent = state.total;
}

function resetScore() {
  state.score = 0;
  state.streak = 0;
  state.best = 0;
  state.correct = 0;
  state.total = 0;
  state.current = null;
  state.answered = false;
  updateStats();
  $('qText').textContent = 'Press Start';
  $('result').textContent = '';
  $('result').className = 'result';
  $('answerInput').value = '';
  $('whyContainer').innerHTML = '';
  $('whyBtn').style.display = 'none';
  $('playBtn').disabled = true;
  clearTimerBadge();
}

function renderStatsTable() {
  const container = $('statsTable');
  if (!container) return;
  const stats = loadStats();
  const keys = Object.keys(stats).sort((a, b) => {
    const accA = getIntervalAccuracy(stats, a) ?? 0;
    const accB = getIntervalAccuracy(stats, b) ?? 0;
    return accA - accB;
  });

  if (keys.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-size:14px;font-style:italic;">No data yet. Answer some questions to see your stats.</p>';
    return;
  }

  let html = '<table><tr><th>Item</th><th>Direction</th><th>Correct</th><th>Accuracy</th><th>Avg time</th></tr>';
  keys.forEach(k => {
    const s = stats[k];
    const [dirKey, semisStr] = k.split(':');
    let label, dirLabel;
    if (dirKey === 'chord') {
      label = `Chord: ${semisStr}`;
      dirLabel = '—';
    } else {
      const semis = parseInt(semisStr);
      label = INTERVALS.find(i => i[0] === semis)?.[1] || `${semis} semitones`;
      dirLabel = dirKey === 'up' ? '↑' : '↓';
    }
    const acc = getIntervalAccuracy(stats, k);
    const avgMs = getAverageMs(stats, k);
    const accPct = Math.round(acc * 100);
    let accColor = 'var(--text)';
    if (acc < 0.5) accColor = 'var(--bad)';
    else if (acc < 0.75) accColor = 'var(--accent)';
    else accColor = 'var(--good)';
    html += `<tr>
      <td>${label}</td>
      <td>${dirLabel}</td>
      <td>${s.correct}/${s.attempts}</td>
      <td style="color:${accColor};font-weight:600;">${accPct}%</td>
      <td>${(avgMs / 1000).toFixed(1)}s</td>
    </tr>`;
  });
  html += '</table>';
  container.innerHTML = html;
}

export function initPractice() {
  state.weakSpotMode = getSetting('weakSpotMode', false);
  state.mode = getSetting('practiceMode', 'nameNote');

  $('startBtn').addEventListener('click', newQuestion);
  $('revealBtn').addEventListener('click', reveal);
  $('resetBtn').addEventListener('click', resetScore);
  $('playBtn').addEventListener('click', playCurrentAudio);
  $('whyBtn').addEventListener('click', showWhy);

  $('weakSpot').addEventListener('change', (e) => {
    state.weakSpotMode = e.target.checked;
    setSetting('weakSpotMode', state.weakSpotMode);
  });

  $('practiceMode').addEventListener('change', (e) => {
    state.mode = e.target.value;
    setSetting('practiceMode', state.mode);
    applyModeVisibility();
    if (FB_MODES.includes(state.mode)) {
      ensurePfbFretboard();
    } else {
      resetScore();
      newQuestion();
    }
  });

  $('fbNewQ').addEventListener('click', newFretQ);
  $('fbReveal').addEventListener('click', revealFret);
  $('revNewQ').addEventListener('click', newRevQ);
  $('revReveal').addEventListener('click', revealRev);
  $('fiNewQ').addEventListener('click', newFindIntervalQ);
  $('fiReveal').addEventListener('click', revealFindInterval);
  $('hpNewQ').addEventListener('click', newHearPlayQ);
  $('hpReplay').addEventListener('click', () => {
    if (hpState.rootMidi) playSequence([hpState.rootMidi, hpState.targetMidi], 0.8, 'guitar');
  });
  $('hpReveal').addEventListener('click', revealHearPlay);
  $('twinNewQ').addEventListener('click', newTwinQ);
  $('twinReveal').addEventListener('click', revealTwin);
  $('pfbFretboard').addEventListener('click', (e) => {
    if (state.mode === 'findAll') handleReverseClick(e);
    else if (state.mode === 'findInterval') handleFindIntervalClick(e);
    else if (state.mode === 'hearPlay') handleHearPlayClick(e);
    else if (state.mode === 'octaveTwin') handleTwinClick(e);
  });

  $('clearStatsBtn').addEventListener('click', () => {
    if (confirm('Clear all practice stats? This cannot be undone.')) {
      resetStats();
      renderStatsTable();
    }
  });

  $('answerInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (state.answered) newQuestion();
      else reveal();
    }
  });

  $('level').addEventListener('change', () => { resetScore(); newQuestion(); });

  document.addEventListener('keydown', (e) => {
    const practiceTab = document.getElementById('practice');
    if (!practiceTab || !practiceTab.classList.contains('active')) return;
    const inInput = document.activeElement && document.activeElement.id === 'answerInput';

    if (e.key === 'n' || e.key === 'N') {
      if (!inInput) { e.preventDefault(); newQuestion(); }
    } else if (e.key === 'r' || e.key === 'R') {
      if (!inInput && state.current) { e.preventDefault(); playCurrentAudio(); }
    } else if (e.key === 'w' || e.key === 'W') {
      if (!inInput && state.current && state.answered) { e.preventDefault(); showWhy(); }
    }
  });

  applyModeVisibility();
  if (FB_MODES.includes(state.mode)) {
    ensurePfbFretboard();
  } else {
    newQuestion();
  }
  renderStatsTable();

  // Re-render the active question when the accidental preference changes.
  on('accidental-pref-change', () => {
    if (state.current) newQuestion();
  });

  // Fretboard games follow the Guitar tab's tuning picker.
  on('tuning-change', () => {
    if (FB_MODES.includes(state.mode)) {
      ensurePfbFretboard();
    }
  });

  // Questions re-render when the notation (letters / solfège) changes.
  on('note-names-change', () => {
    if (FB_MODES.includes(state.mode)) {
      ensurePfbFretboard();
    } else if (state.current) {
      newQuestion();
    }
  });
}

// ---- Mode visibility (text quizzes vs fretboard games) ----

function applyModeVisibility() {
  const isFb = FB_MODES.includes(state.mode);
  $('textModeControls').style.display = isFb ? 'none' : 'contents';
  $('textGameArea').style.display = isFb ? 'none' : 'block';
  $('fbGameArea').style.display = isFb ? 'block' : 'none';
  $('findNoteGame').style.display = state.mode === 'findNote' ? 'block' : 'none';
  $('findAllGame').style.display = state.mode === 'findAll' ? 'block' : 'none';
  $('findIntervalGame').style.display = state.mode === 'findInterval' ? 'block' : 'none';
  $('hearPlayGame').style.display = state.mode === 'hearPlay' ? 'block' : 'none';
  $('twinGame').style.display = state.mode === 'octaveTwin' ? 'block' : 'none';
}

// ---- Fretboard games: note / interval / hear-and-play / octave twins ----

function ensurePfbFretboard() {
  renderFretboardInto($('pfbFretboard'), { tuning: getCurrentTuning(), noFlash: false });
  fbState.correct = 0; fbState.total = 0;
  revState.correct = 0; revState.total = 0;
  fiState.correct = 0; fiState.total = 0;
  hpState.correct = 0; hpState.total = 0;
  twinState.correct = 0; twinState.total = 0;
  $('fbStats').textContent = '';
  $('revStats').textContent = '';
  $('fiStats').textContent = '';
  $('hpStats').textContent = '';
  $('twinStats').textContent = '';
  if (state.mode === 'findNote') newFretQ();
  else if (state.mode === 'findAll') newRevQ();
  else if (state.mode === 'findInterval') newFindIntervalQ();
  else if (state.mode === 'hearPlay') newHearPlayQ();
  else newTwinQ();
}

function clearQuizTargets() {
  document.querySelectorAll('#pfbFretboard .fb-cell.quiz-target').forEach(c => c.classList.remove('quiz-target'));
}

function newFretQ() {
  const tuning = getCurrentTuning();
  const si = Math.floor(Math.random() * tuning.strings.length);
  const fr = Math.floor(Math.random() * (PFB_FRETS + 1));
  const midi = tuning.strings[si].midi + fr;
  const pc = mod12(midi);
  fbState.current = { si, fr, midi, pc, answered: false };
  clearQuizTargets();
  const cell = document.querySelector(`#pfbFretboard .fb-cell[data-string="${si}"][data-fret="${fr}"]`);
  if (cell) cell.classList.add('quiz-target');

  const stringLabel = tuning.strings[si].name;
  $('fbQuestion').innerHTML = `String <b>${stringLabel}</b>, fret <b>${fr}</b>. What note?<br>
    <input type="text" id="fbAnswer" placeholder="e.g. ${formatNoteForDisplay(9)}, ${formatNoteForDisplay(3)}" autocomplete="off" spellcheck="false" style="margin-top:10px;font-size:16px;text-align:center;">
    <div id="fbResult" style="margin-top:10px;font-size:15px;"></div>`;
  document.getElementById('fbAnswer').focus();
  document.getElementById('fbAnswer').addEventListener('keydown', e => {
    if (e.key === 'Enter') revealFret();
  });
  fbState.answered = false;
}

function revealFret() {
  if (!fbState.current || fbState.answered) return;
  const input = document.getElementById('fbAnswer');
  const user = input ? normalizeAnswerInput(input.value) : '';
  const correctName = formatNoteForDisplay(fbState.current.pc);
  const isCorrect = acceptedNoteAnswers(fbState.current.pc).has(user);
  fbState.total++;
  if (isCorrect) fbState.correct++;
  const res = document.getElementById('fbResult');
  if (res) {
    res.innerHTML = isCorrect
      ? `<span style="color:var(--good)">✓ Correct! ${correctName}</span>`
      : `<span style="color:var(--bad)">✗ Answer: ${correctName}</span>`;
  }
  $('fbStats').textContent = `Score: ${fbState.correct}/${fbState.total}`;
  playMidi(fbState.current.midi, 1.2, 'guitar');
  fbState.answered = true;
}

function newRevQ() {
  const pc = Math.floor(Math.random() * 12);
  revState.targetPc = pc;
  revState.selected = new Set();
  revState.answered = false;
  clearQuizTargets();
  document.querySelectorAll('#pfbFretboard .fb-cell.correct-flash, #pfbFretboard .fb-cell.wrong-flash, #pfbFretboard .fb-cell.quiz-correct').forEach(c => {
    c.classList.remove('correct-flash', 'wrong-flash', 'quiz-correct');
  });
  const name = formatNoteForDisplay(pc);
  $('revQuestion').innerHTML = `Click every <b>${name}</b> on the fretboard. Then press Reveal.`;
}

function handleReverseClick(e) {
  const cell = e.target.closest('.fb-cell');
  if (!cell) return;
  if (revState.targetPc === null || revState.answered) return;
  const pc = parseInt(cell.dataset.pc);
  if (pc === revState.targetPc) {
    revState.selected.add(`${cell.dataset.string}-${cell.dataset.fret}`);
    cell.classList.add('correct-flash', 'quiz-correct');
  } else {
    cell.classList.add('wrong-flash');
    setTimeout(() => cell.classList.remove('wrong-flash'), 400);
  }
}

function revealRev() {
  if (revState.targetPc === null || revState.answered) return;
  revState.total++;
  const allCells = document.querySelectorAll('#pfbFretboard .fb-cell');
  const targets = [];
  allCells.forEach(c => {
    if (parseInt(c.dataset.pc) === revState.targetPc) targets.push(c);
  });
  const targetKeys = new Set(targets.map(c => `${c.dataset.string}-${c.dataset.fret}`));
  let correctCount = 0;
  revState.selected.forEach(k => { if (targetKeys.has(k)) correctCount++; });
  const perfect = correctCount === targetKeys.size && revState.selected.size === targetKeys.size;
  if (perfect) revState.correct++;

  allCells.forEach(c => {
    const key = `${c.dataset.string}-${c.dataset.fret}`;
    if (targetKeys.has(key)) c.classList.add('correct-flash', 'quiz-correct');
    else if (revState.selected.has(key)) c.classList.add('wrong-flash');
  });

  const name = formatNoteForDisplay(revState.targetPc);
  $('revQuestion').innerHTML = perfect
    ? `<span style="color:var(--good)">✓ Perfect! All ${targetKeys.size} ${name} positions found.</span>`
    : `Found ${correctCount}/${targetKeys.size}.`;
  $('revStats').textContent = `Perfect rounds: ${revState.correct}/${revState.total}`;
  revState.answered = true;
}

// ---- Fretboard game: "Find the interval" (from a root) ----

function currentStageSemis() {
  const stage = getSetting('earStage', 'stage1');
  return EAR_STAGES[stage] ? EAR_STAGES[stage].semis : EAR_STAGES.stage1.semis;
}

function newFindIntervalQ() {
  const rootPc = Math.floor(Math.random() * 12);
  const semis = randomChoice(currentStageSemis());
  fiState.rootPc = rootPc;
  fiState.semis = semis;
  fiState.selected = new Set();
  fiState.answered = false;
  clearQuizTargets();
  document.querySelectorAll('#pfbFretboard .fb-cell.correct-flash, #pfbFretboard .fb-cell.wrong-flash, #pfbFretboard .fb-cell.quiz-correct').forEach(c => {
    c.classList.remove('correct-flash', 'wrong-flash', 'quiz-correct');
  });
  document.querySelectorAll('#pfbFretboard .fb-cell').forEach(c => {
    if (parseInt(c.dataset.pc) === rootPc) c.classList.add('quiz-target');
  });
  const d = intervalDetail(semis);
  $('fiQuestion').innerHTML = `Root: <b>${formatNoteForDisplay(rootPc)}</b> (lit up). Tap every <b>${d.short} · ${d.name}</b> above it, then reveal.`;
}

function handleFindIntervalClick(e) {
  const cell = e.target.closest('.fb-cell');
  if (!cell) return;
  if (fiState.rootPc === null || fiState.answered) return;
  const pc = parseInt(cell.dataset.pc);
  const targetPc = mod12(fiState.rootPc + fiState.semis);
  if (pc === targetPc) {
    fiState.selected.add(`${cell.dataset.string}-${cell.dataset.fret}`);
    cell.classList.add('correct-flash', 'quiz-correct');
  } else {
    cell.classList.add('wrong-flash');
    setTimeout(() => cell.classList.remove('wrong-flash'), 400);
  }
}

function revealFindInterval() {
  if (fiState.rootPc === null || fiState.answered) return;
  fiState.total++;
  const d = intervalDetail(fiState.semis);
  const targetPc = mod12(fiState.rootPc + fiState.semis);
  const allCells = document.querySelectorAll('#pfbFretboard .fb-cell');
  const targets = [];
  allCells.forEach(c => {
    if (parseInt(c.dataset.pc) === targetPc) targets.push(c);
  });
  const targetKeys = new Set(targets.map(c => `${c.dataset.string}-${c.dataset.fret}`));
  let correctCount = 0;
  fiState.selected.forEach(k => { if (targetKeys.has(k)) correctCount++; });
  const perfect = correctCount === targetKeys.size && fiState.selected.size === targetKeys.size;
  if (perfect) fiState.correct++;

  allCells.forEach(c => {
    const key = `${c.dataset.string}-${c.dataset.fret}`;
    if (targetKeys.has(key)) c.classList.add('correct-flash', 'quiz-correct');
    else if (fiState.selected.has(key)) c.classList.add('wrong-flash');
  });

  $('fiQuestion').innerHTML = perfect
    ? `<span style="color:var(--good)">✓ Perfect! ${d.name} (${d.short}) — ${d.sound}.</span>`
    : `Found ${correctCount}/${targetKeys.size}. ${d.name} = ${fiState.semis} frets from ${formatNoteForDisplay(fiState.rootPc)}.`;
  $('fiStats').textContent = `Perfect rounds: ${fiState.correct}/${fiState.total}`;
  fiState.answered = true;
}

// ---- Fretboard game: "Hear it, play it" ----

function newHearPlayQ() {
  const rootPc = Math.floor(Math.random() * 12);
  const semis = randomChoice(currentStageSemis());
  const rootMidi = 55 + Math.floor(Math.random() * 12);
  hpState.rootPc = mod12(rootMidi);
  hpState.semis = semis;
  hpState.rootMidi = rootMidi;
  hpState.targetMidi = rootMidi + semis;
  hpState.selected = new Set();
  hpState.answered = false;
  clearQuizTargets();
  document.querySelectorAll('#pfbFretboard .fb-cell.correct-flash, #pfbFretboard .fb-cell.wrong-flash, #pfbFretboard .fb-cell.quiz-correct').forEach(c => {
    c.classList.remove('correct-flash', 'wrong-flash', 'quiz-correct');
  });
  document.querySelectorAll('#pfbFretboard .fb-cell').forEach(c => {
    if (parseInt(c.dataset.pc) === hpState.rootPc) c.classList.add('quiz-target');
  });
  const d = intervalDetail(semis);
  $('hpQuestion').innerHTML = `Root <b>${formatNoteForDisplay(hpState.rootPc)}</b> is lit. Listen, then tap the note that makes a <b>${d.name}</b> above it.`;
  setTimeout(() => playSequence([rootMidi, rootMidi + semis], 0.8, 'guitar'), 250);
}

function handleHearPlayClick(e) {
  const cell = e.target.closest('.fb-cell');
  if (!cell) return;
  if (hpState.rootPc === null || hpState.answered) return;
  const pc = parseInt(cell.dataset.pc);
  const targetPc = mod12(hpState.rootPc + hpState.semis);
  if (pc === targetPc) {
    hpState.selected.add(`${cell.dataset.string}-${cell.dataset.fret}`);
    cell.classList.add('correct-flash', 'quiz-correct');
  } else {
    cell.classList.add('wrong-flash');
    setTimeout(() => cell.classList.remove('wrong-flash'), 400);
  }
}

function revealHearPlay() {
  if (hpState.rootPc === null || hpState.answered) return;
  hpState.total++;
  const d = intervalDetail(hpState.semis);
  const targetPc = mod12(hpState.rootPc + hpState.semis);
  const allCells = document.querySelectorAll('#pfbFretboard .fb-cell');
  const targets = [];
  allCells.forEach(c => {
    if (parseInt(c.dataset.pc) === targetPc) targets.push(c);
  });
  const targetKeys = new Set(targets.map(c => `${c.dataset.string}-${c.dataset.fret}`));
  let correctCount = 0;
  hpState.selected.forEach(k => { if (targetKeys.has(k)) correctCount++; });
  const perfect = correctCount === targetKeys.size && hpState.selected.size === targetKeys.size;
  if (perfect) hpState.correct++;

  allCells.forEach(c => {
    const key = `${c.dataset.string}-${c.dataset.fret}`;
    if (targetKeys.has(key)) c.classList.add('correct-flash', 'quiz-correct');
    else if (hpState.selected.has(key)) c.classList.add('wrong-flash');
  });

  $('hpQuestion').innerHTML = perfect
    ? `<span style="color:var(--good)">✓ Perfect! ${d.name} (${d.short}) — ${d.sound}.</span>`
    : `Found ${correctCount}/${targetKeys.size}. ${d.name} = ${hpState.semis} frets above ${formatNoteForDisplay(hpState.rootPc)}.`;
  $('hpStats').textContent = `Perfect rounds: ${hpState.correct}/${hpState.total}`;
  playSequence([hpState.rootMidi, hpState.targetMidi], 0.8, 'guitar');
  hpState.answered = true;
}

// ---- Fretboard game: "Find its octave twin" (timed) ----

function newTwinQ() {
  const strings = getCurrentTuning().strings;
  let si, fr, originMidi, targetKeys;
  // Retry until the picked note actually has at least one octave twin visible on the neck.
  do {
    si = Math.floor(Math.random() * strings.length);
    fr = Math.floor(Math.random() * (PFB_FRETS + 1));
    originMidi = strings[si].midi + fr;
    targetKeys = new Set();
    strings.forEach((s, sj) => {
      for (let f = 0; f <= PFB_FRETS; f++) {
        const midi = s.midi + f;
        const diff = midi - originMidi;
        if (diff !== 0 && diff % 12 === 0) targetKeys.add(`${sj}-${f}`);
      }
    });
  } while (targetKeys.size === 0);

  twinState.originMidi = originMidi;
  twinState.targetKeys = targetKeys;
  twinState.selected = new Set();
  twinState.answered = false;
  twinState.startMs = Date.now();

  clearQuizTargets();
  document.querySelectorAll('#pfbFretboard .fb-cell.correct-flash, #pfbFretboard .fb-cell.wrong-flash, #pfbFretboard .fb-cell.quiz-correct').forEach(c => {
    c.classList.remove('correct-flash', 'wrong-flash', 'quiz-correct');
  });
  const originCell = document.querySelector(`#pfbFretboard .fb-cell[data-string="${si}"][data-fret="${fr}"]`);
  if (originCell) originCell.classList.add('quiz-target');
  playMidi(originMidi, 1.0, 'guitar');

  const n = targetKeys.size;
  $('twinQuestion').innerHTML = `Find ${n === 1 ? 'its' : `all ${n}`} octave twin${n === 1 ? '' : 's'} on the neck, then press Reveal.`;
}

function handleTwinClick(e) {
  const cell = e.target.closest('.fb-cell');
  if (!cell) return;
  if (twinState.originMidi === null || twinState.answered) return;
  const key = `${cell.dataset.string}-${cell.dataset.fret}`;
  if (twinState.targetKeys.has(key)) {
    twinState.selected.add(key);
    cell.classList.add('correct-flash', 'quiz-correct');
  } else {
    cell.classList.add('wrong-flash');
    setTimeout(() => cell.classList.remove('wrong-flash'), 400);
  }
}

function revealTwin() {
  if (twinState.originMidi === null || twinState.answered) return;
  const elapsedMs = Date.now() - twinState.startMs;
  twinState.total++;
  let correctCount = 0;
  twinState.selected.forEach(k => { if (twinState.targetKeys.has(k)) correctCount++; });
  const perfect = correctCount === twinState.targetKeys.size && twinState.selected.size === twinState.targetKeys.size;
  if (perfect) twinState.correct++;

  document.querySelectorAll('#pfbFretboard .fb-cell').forEach(c => {
    const key = `${c.dataset.string}-${c.dataset.fret}`;
    if (twinState.targetKeys.has(key)) c.classList.add('correct-flash', 'quiz-correct');
    else if (twinState.selected.has(key)) c.classList.add('wrong-flash');
  });

  const seconds = (elapsedMs / 1000).toFixed(1);
  let speedCls = 'timer-badge ';
  if (elapsedMs < 3000) speedCls += 'fast';
  else if (elapsedMs < 7000) speedCls += 'medium';
  else speedCls += 'slow';

  $('twinQuestion').innerHTML = (perfect
    ? `<span style="color:var(--good)">✓ Perfect! All ${twinState.targetKeys.size} found.</span>`
    : `Found ${correctCount}/${twinState.targetKeys.size}.`)
    + ` <span class="${speedCls}">${seconds}s</span>`;
  $('twinStats').textContent = `Perfect rounds: ${twinState.correct}/${twinState.total}`;
  twinState.answered = true;
}
