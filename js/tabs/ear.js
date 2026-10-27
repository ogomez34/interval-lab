import { INTERVALS, CHORD_TYPES, EAR_STAGES, intervalDetail, $, randomChoice } from '../music.js';
import { playMidi, playSequence, playChord } from '../audio.js';
import { recordAttempt, getSetting, setSetting } from '../storage.js';

const EAR_CHORD_TYPE_NAMES = [
  'Major', 'Minor', 'Diminished', 'Augmented', 'Dominant 7', 'Major 7', 'Minor 7'
];
const EAR_CHORD_TYPES = Object.fromEntries(
  EAR_CHORD_TYPE_NAMES.map(name => [name, CHORD_TYPES[name]])
);

let earState = {
  mode: 'interval', // 'interval' | 'chord'
  score:0, streak:0, best:0, correct:0, total:0,
  current:null, answered:false,
  questionStartMs:0
};

export function renderEar() {
  const mode = getSetting('earMode', 'interval');
  const intervalSel = mode === 'interval' ? 'selected' : '';
  const chordSel = mode === 'chord' ? 'selected' : '';
  return `
    <h2>👂 Ear Training</h2>
    <p id="earIntro">Listen closely — two notes play, one after the other. Can you guess how far apart they are?</p>

    <div class="controls">
      <label>Mode
        <select id="earMode">
          <option value="interval" ${intervalSel}>Intervals</option>
          <option value="chord" ${chordSel}>Chords</option>
        </select>
      </label>
      <label id="earDirLabel">Direction
        <select id="earDir">
          <option value="up">Ascending</option>
          <option value="down">Descending</option>
          <option value="both">Both</option>
        </select>
      </label>
      <label id="earDiffLabel">Stage
        <select id="earStage"></select>
      </label>
    </div>

    <div class="stats">
      <span>Score: <b id="earScore">0</b></span>
      <span>Streak: <b id="earStreak">0</b></span>
      <span>Best streak: <b id="earBest">0</b></span>
      <span>Correct: <b id="earCorrect">0</b>/<b id="earTotal">0</b></span>
    </div>

    <div class="question">
      <div class="label">Question <span id="earTimerBadge" class="timer-badge" style="display:none;"></span></div>
      <div class="q" id="earQ">Press Start</div>
    </div>

    <div class="chord-list" id="earAnswers"></div>

    <div class="result" id="earResult"></div>

    <div class="actions">
      <button class="primary" id="earStart">Start / New</button>
      <button class="play-btn" id="earReplay" disabled>Replay</button>
      <button class="play-btn" id="earReplayRoot" disabled>Replay root only</button>
    </div>

    <p style="color:var(--muted);font-size:13px;margin-top:20px;">
      <b>Shortcuts:</b> <code>Enter</code> submit / next, <code>R</code> replay.
    </p>
  `;
}

function earIntervalName(semis) {
  if (semis === 12) return 'octave';
  return INTERVALS.find(i => i[0] === semis)[1];
}

const INTERVAL_REFERENCE_SONGS = {
  'minor 2nd': 'Jaws theme',
  'major 2nd': 'Happy Birthday',
  'minor 3rd': 'Smoke on the Water (riff)',
  'major 3rd': 'When the Saints Go Marching In',
  'perfect 4th': 'Here Comes the Bride',
  'tritone': 'The Simpsons theme',
  'perfect 5th': 'Twinkle Twinkle Little Star',
  'minor 6th': 'The Entertainer (Scott Joplin)',
  'major 6th': 'My Bonnie Lies Over the Ocean',
  'minor 7th': 'Somewhere (West Side Story)',
  'major 7th': 'Take On Me (chorus)',
  'octave': 'Somewhere Over the Rainbow'
};

function renderEarAnswers() {
  const container = $('earAnswers');
  container.innerHTML = '';

  if (earState.mode === 'interval') {
    const stage = $('earStage').value || 'stage1';
    const semis = EAR_STAGES[stage].semis;
    const labels = new Set();
    semis.forEach(s => labels.add(earIntervalName(s)));
    labels.forEach(name => {
      const btn = document.createElement('button');
      btn.className = 'chord-btn';
      btn.textContent = name;
      btn.dataset.answer = name;
      const song = INTERVAL_REFERENCE_SONGS[name];
      if (song) btn.title = `Reference song: ${song}`;
      btn.addEventListener('click', () => answerEar(name));
      container.appendChild(btn);
    });
  } else {
    Object.keys(EAR_CHORD_TYPES).forEach(name => {
      const btn = document.createElement('button');
      btn.className = 'chord-btn';
      btn.textContent = name;
      btn.dataset.answer = name;
      btn.addEventListener('click', () => answerEar(name));
      container.appendChild(btn);
    });
  }
}

function newEarQ() {
  const mode = earState.mode;
  earState.answered = false;
  $('earResult').textContent = '';
  $('earResult').className = 'result';
  $('earReplay').disabled = false;
  $('earReplayRoot').disabled = false;
  clearEarTimerBadge();

  if (mode === 'interval') {
    const dirSetting = $('earDir').value;
    const direction = dirSetting === 'both' ? randomChoice([1,-1]) : (dirSetting === 'up' ? 1 : -1);
    const stage = $('earStage').value || 'stage1';
    const semis = randomChoice(EAR_STAGES[stage].semis);
    const rootMidi = 55 + Math.floor(Math.random() * 12);
    const targetMidi = rootMidi + direction * semis;
    earState.current = {
      mode: 'interval',
      rootMidi, targetMidi, semis, direction,
      name: earIntervalName(semis),
      intervalKey: `${direction === 1 ? 'up' : 'down'}:${semis}`
    };
    $('earQ').textContent = `Direction: ${direction === 1 ? 'Up' : 'Down'}`;
    setTimeout(() => playSequence([rootMidi, targetMidi], 0.7), 200);
  } else {
    const chordNames = Object.keys(EAR_CHORD_TYPES);
    const chordName = randomChoice(chordNames);
    const intervals = EAR_CHORD_TYPES[chordName];
    const rootMidi = 55 + Math.floor(Math.random() * 12);
    const midis = intervals.map(i => rootMidi + i);
    earState.current = {
      mode: 'chord',
      rootMidi, midis,
      name: chordName,
      intervalKey: `chord:${chordName}`
    };
    $('earQ').textContent = `Chord — what quality?`;
    setTimeout(() => {
      // Play root first, then full chord
      playMidi(rootMidi, 0.6);
      setTimeout(() => playChord(midis, 1.4), 700);
    }, 200);
  }

  earState.questionStartMs = Date.now();
}

function answerEar(guessName) {
  if (!earState.current || earState.answered) return;
  const elapsed = Date.now() - earState.questionStartMs;
  const correct = earState.current.name;
  const isCorrect = guessName === correct;
  const detail = earState.current.mode === 'interval'
    ? intervalDetail(earState.current.semis)
    : null;
  earState.total++;
  if (isCorrect) {
    earState.correct++;
    earState.streak++;
    earState.best = Math.max(earState.best, earState.streak);
    earState.score += 10;
    $('earResult').className = 'result good';
    $('earResult').innerHTML = detail
      ? `✓ Correct! <span class="note">${correct} — ${detail.sound}</span>`
      : `✓ Correct! <span class="note">${correct}</span>`;
  } else {
    earState.streak = 0;
    $('earResult').className = 'result bad';
    $('earResult').innerHTML = detail
      ? `✗ It was a <b>${correct}</b> — ${detail.quality}, ${detail.sound}. ${detail.song !== '—' ? `Think: <i>${detail.song}</i>.` : ''}`
      : `✗ It was a <b>${correct}</b>.`;
  }
  $('earScore').textContent = earState.score;
  $('earStreak').textContent = earState.streak;
  $('earBest').textContent = earState.best;
  $('earCorrect').textContent = earState.correct;
  $('earTotal').textContent = earState.total;

  recordAttempt(earState.current.intervalKey, isCorrect, elapsed);
  showEarTimerBadge(elapsed);
  earState.answered = true;
}

function showEarTimerBadge(ms) {
  const badge = $('earTimerBadge');
  badge.style.display = 'inline-block';
  const seconds = (ms / 1000).toFixed(1);
  let cls = 'timer-badge ';
  if (ms < 2500) cls += 'fast';
  else if (ms < 6000) cls += 'medium';
  else cls += 'slow';
  badge.className = cls;
  badge.textContent = `${seconds}s`;
}

function clearEarTimerBadge() {
  const badge = $('earTimerBadge');
  badge.style.display = 'none';
  badge.textContent = '';
}

function applyModeUI() {
  const isChord = earState.mode === 'chord';
  $('earDirLabel').style.display = isChord ? 'none' : 'flex';
  $('earDiffLabel').style.display = isChord ? 'none' : 'flex';
  $('earIntro').textContent = isChord
    ? 'A few notes play together — is it happy, sad, tense, or dreamy? Guess the chord quality!'
    : 'Listen closely — two notes play, one after the other. Can you guess how far apart they are?';
}

export function initEar() {
  earState.mode = getSetting('earMode', 'interval');

  // Stage select (guided path from the Learn tab).
  const stageSel = $('earStage');
  Object.entries(EAR_STAGES).forEach(([key, stage]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = stage.label;
    stageSel.appendChild(opt);
  });
  stageSel.value = getSetting('earStage', 'stage1');

  $('earMode').addEventListener('change', (e) => {
    earState.mode = e.target.value;
    setSetting('earMode', earState.mode);
    applyModeUI();
    renderEarAnswers();
    newEarQ();
  });

  $('earStart').addEventListener('click', newEarQ);
  $('earReplay').addEventListener('click', () => {
    if (!earState.current) return;
    if (earState.current.mode === 'chord') {
      playMidi(earState.current.rootMidi, 0.6);
      setTimeout(() => playChord(earState.current.midis, 1.4), 700);
    } else {
      playSequence([earState.current.rootMidi, earState.current.targetMidi], 0.7);
    }
  });
  $('earReplayRoot').addEventListener('click', () => {
    if (earState.current) playMidi(earState.current.rootMidi, 0.6);
  });

  $('earStage').addEventListener('change', (e) => {
    setSetting('earStage', e.target.value);
    renderEarAnswers();
    newEarQ();
  });
  $('earDir').addEventListener('change', () => { if (earState.current) newEarQ(); });

  // Shortcuts
  document.addEventListener('keydown', (e) => {
    const earTab = document.getElementById('ear');
    if (!earTab || !earTab.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (earState.answered) newEarQ();
    } else if (e.key === 'r' || e.key === 'R') {
      if (earState.current) {
        e.preventDefault();
        $('earReplay').click();
      }
    }
  });

  applyModeUI();
  renderEarAnswers();
}