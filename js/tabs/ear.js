import { INTERVALS, EAR_STAGES, intervalDetail, $, randomChoice } from '../music.js';
import { playMidi, playSequence } from '../audio.js';
import { recordAttempt, getSetting, setSetting } from '../storage.js';

let earState = {
  score:0, streak:0, best:0, correct:0, total:0,
  current:null, answered:false,
  questionStartMs:0
};

export function renderEar() {
  return `
    <h2>👂 Ear Training</h2>
    <p>Listen closely — two notes play, one after the other. Can you guess how far apart they are?</p>

    <div class="controls">
      <label>Direction
        <select id="earDir">
          <option value="up">Ascending</option>
          <option value="down">Descending</option>
          <option value="both">Both</option>
        </select>
      </label>
      <label>Stage
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
      <b>Shortcuts:</b> <code>Enter</code> next, <code>R</code> replay.
    </p>
  `;
}

function earIntervalName(semis) {
  if (semis === 12) return 'octave';
  return INTERVALS.find(i => i[0] === semis)[1];
}

function renderEarAnswers() {
  const container = $('earAnswers');
  container.innerHTML = '';
  const stage = $('earStage').value || 'stage1';
  const semis = EAR_STAGES[stage].semis;
  const labels = new Set();
  semis.forEach(s => labels.add(earIntervalName(s)));
  labels.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'chord-btn';
    btn.textContent = name;
    btn.dataset.answer = name;
    const song = intervalDetail(semisForName(name)).song;
    if (song && song !== '—') btn.title = `Reference song: ${song}`;
    btn.addEventListener('click', () => answerEar(name));
    container.appendChild(btn);
  });
}

function semisForName(name) {
  const found = INTERVALS.find(i => i[1] === name);
  return found ? found[0] : 12;
}

function newEarQ() {
  earState.answered = false;
  $('earResult').textContent = '';
  $('earResult').className = 'result';
  $('earReplay').disabled = false;
  $('earReplayRoot').disabled = false;
  clearEarTimerBadge();

  const dirSetting = $('earDir').value;
  const direction = dirSetting === 'both' ? randomChoice([1,-1]) : (dirSetting === 'up' ? 1 : -1);
  const stage = $('earStage').value || 'stage1';
  const semis = randomChoice(EAR_STAGES[stage].semis);
  const rootMidi = 55 + Math.floor(Math.random() * 12);
  const targetMidi = rootMidi + direction * semis;
  earState.current = {
    rootMidi, targetMidi, semis, direction,
    name: earIntervalName(semis),
    intervalKey: `${direction === 1 ? 'up' : 'down'}:${semis}`
  };
  $('earQ').textContent = `Direction: ${direction === 1 ? 'Up' : 'Down'}`;
  setTimeout(() => playSequence([rootMidi, targetMidi], 0.7), 200);

  earState.questionStartMs = Date.now();
}

function answerEar(guessName) {
  if (!earState.current || earState.answered) return;
  const elapsed = Date.now() - earState.questionStartMs;
  const correct = earState.current.name;
  const isCorrect = guessName === correct;
  const detail = intervalDetail(earState.current.semis);
  earState.total++;
  if (isCorrect) {
    earState.correct++;
    earState.streak++;
    earState.best = Math.max(earState.best, earState.streak);
    earState.score += 10;
    $('earResult').className = 'result good';
    $('earResult').innerHTML = `✓ Correct! <span class="note">${correct} — ${detail.sound}</span>`;
  } else {
    earState.streak = 0;
    $('earResult').className = 'result bad';
    $('earResult').innerHTML = `✗ It was a <b>${correct}</b> — ${detail.quality}, ${detail.sound}. ${detail.song !== '—' ? `Think: <i>${detail.song}</i>.` : ''}`;
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

export function initEar() {
  // Stage select (guided path from the Learn tab).
  const stageSel = $('earStage');
  Object.entries(EAR_STAGES).forEach(([key, stage]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = stage.label;
    stageSel.appendChild(opt);
  });
  stageSel.value = getSetting('earStage', 'stage1');

  $('earStart').addEventListener('click', newEarQ);
  $('earReplay').addEventListener('click', () => {
    if (earState.current) playSequence([earState.current.rootMidi, earState.current.targetMidi], 0.7);
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

  renderEarAnswers();
}
