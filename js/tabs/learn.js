import { getVisitedTabs, getSetting, setSetting, loadStats, getIntervalAccuracy } from '../storage.js';
import { EAR_STAGES, INTERVAL_DETAILS, TUNINGS } from '../music.js';

// ---- Guided path ----
// Five stages, each adding a family of intervals on top of the last. A
// stage shows a ✓ once the player has answered at least 5 of its questions
// and is above 80% accuracy across that stage's intervals.
const PATH_STEPS = [
  { stage: 'stage1', icon: '🪜', title: 'Perfect pillars', desc: 'Octave, perfect 5th and perfect 4th — the stable frame everything else hangs on.' },
  { stage: 'stage2', icon: '🎨', title: 'The colours', desc: 'Major and minor 3rds — the two sounds that make music happy or sad.' },
  { stage: 'stage3', icon: '👣', title: 'Steps', desc: 'Major and minor 2nds — the tight, tense steps between neighbouring notes.' },
  { stage: 'stage4', icon: '🌈', title: 'Wide colours', desc: '6ths and 7ths — the wide, expressive jumps.' },
  { stage: 'stage5', icon: '🎯', title: 'Full chromatic', desc: 'The tritone and every last step of the 12-step ruler.' }
];

function stageAccuracy(stageKey) {
  const stats = loadStats();
  const semis = EAR_STAGES[stageKey].semis;
  let total = 0, accSum = 0;
  semis.forEach(s => {
    ['up', 'down'].forEach(dir => {
      const acc = getIntervalAccuracy(stats, `${dir}:${s}`);
      if (acc !== null) { total++; accSum += acc; }
    });
  });
  if (total === 0) return null;
  return accSum / total;
}

function renderPathSteps() {
  const visited = new Set(getVisitedTabs());
  return PATH_STEPS.map(step => {
    const acc = stageAccuracy(step.stage);
    const done = acc !== null && acc >= 0.8;
    const accText = acc === null ? 'Not started' : `${Math.round(acc * 100)}%`;
    return `
      <div class="path-step ${done ? 'done' : ''}" data-stage="${step.stage}">
        <span class="path-step-icon">${step.icon}</span>
        <span class="path-step-body">
          <span class="path-step-title">${step.title} ${done ? ' <span class="path-check">✓</span>' : ''}</span>
          <span class="path-step-desc">${step.desc}</span>
          <span class="path-step-status">${accText} · ${visited.has('ear') ? 'ear opened' : 'not opened yet'}</span>
          <span class="path-step-actions">
            <button type="button" class="play-btn stage-ear-btn" data-stage="${step.stage}">Ear drill →</button>
            <button type="button" class="play-btn stage-find-btn" data-stage="${step.stage}">Find on neck →</button>
          </span>
        </span>
      </div>
    `;
  }).join('');
}

export function renderLearn() {
  return `
    <h2>🧭 Interval Lab — the method</h2>
    <p class="lede">Everything in music is a <b>distance</b>. A chord is stacked distances, a scale is a ladder of distances, a melody is a walk through distances. On the guitar, distance is just <b>frets</b>. Learn the 12 distances and the whole instrument unlocks.</p>

    <section class="theory-block">
      <h3>Where this comes from</h3>
      <p>About 2,500 years ago, Pythagoras stretched a string over a wooden box — the <b>monochord</b> — and noticed something strange and beautiful: press the string exactly in the middle and it plays the same note an <b>octave</b> higher (a 2:1 length ratio). Press it at 2/3 of its length and it plays a <b>perfect 5th</b> (a 3:2 ratio).</p>
      <p>Those simple ratios are the origin of the Western scale system. The octave and the 5th became the <b>perfect</b> intervals — calm, strong, stable — and every other interval is measured against that frame.</p>
      <p>Modern guitars don't use those exact ancient ratios: we divide the octave into <b>12 equal steps</b> (equal temperament) so every key sounds the same and every fret is exactly one step. The old ideas survive in the <b>names</b> — perfect, major, minor — and in why some notes feel at rest while others want to move.</p>
    </section>

    <section class="theory-block">
      <h3>What is an interval, exactly?</h3>
      <p>An <b>interval</b> is the distance between two notes, measured in <b>semitones</b>. On the guitar, one fret = one semitone, so the fretboard is a physical ruler of all 12 distances:</p>
      <table class="interval-table">
        <tr><th>Frets</th><th>Name</th><th>Family</th><th>What it sounds like</th></tr>
        ${[0,1,2,3,4,5,6,7,8,9,10,11,12].map(s => {
          const d = INTERVAL_DETAILS[s];
          return `<tr><td><b>${s}</b></td><td>${d.name}</td><td>${d.quality}</td><td>${d.sound}</td></tr>`;
        }).join('')}
      </table>
      <p class="muted">The <b>octave</b> (12 frets) is the same note again — that is why the fretboard repeats every 12 frets and everything you learn here works everywhere on the neck.</p>
    </section>

    <section class="theory-block">
      <h3>The three families</h3>
      <p>Your ear already knows these groups — theory just gives them names:</p>
      <ul class="theory-list">
        <li><b>Perfect</b> (unison, 4th, 5th, octave): hollow, strong, stable. The frame of the building.</li>
        <li><b>Imperfect</b> (3rds, 6ths): the colours — major = bright, minor = dark. They make chords happy or sad.</li>
        <li><b>Dissonant</b> (2nds, 7ths, tritone): tension that wants to resolve. Melodies and blues live here.</li>
      </ul>
    </section>

    <section class="theory-block">
      <h3>The method: hear → sing → find → play</h3>
      <ol class="theory-list">
        <li><b>Hear</b> — the Ear tab plays two notes; name the distance. Hook each interval to its reference song (Jaws, Here Comes the Bride…).</li>
        <li><b>Sing</b> — sing the interval back before you answer. Your voice is the slowest, most honest tuner you own.</li>
        <li><b>Find</b> — the Fretboard tab shows where each distance lives. Set the labels to <b>Intervals</b> and read the neck like a ruler; turn on the <b>drone</b> and hunt each interval against it.</li>
        <li><b>Play</b> — Practice turns it into a game: find every ♭3 from a root, or hear an interval and play it back on the neck.</li>
      </ol>
    </section>

    <section class="theory-block">
      <h3>Tetrachords — the two-piece scale</h3>
      <p>A <b>tetrachord</b> is four notes spanning a perfect 4th. The ancient Greeks built their whole tuning system from these little ladders, and the modern diatonic scales are still just <b>two tetrachords joined by a gap</b> — a <b>whole step</b> whenever both tetrachords span a perfect 4th.</p>
      <p>The four <b>true</b> tetrachords (W = whole step, H = half step, A2 = augmented 2nd):</p>
      <ul class="theory-list">
        <li><b>Major</b> (W W H) — the bottom half of the major scale</li>
        <li><b>Minor</b> (W H W) — the bottom half of the natural minor</li>
        <li><b>Phrygian</b> (H W W) — the top half of the natural minor</li>
        <li><b>Harmonic</b> (H A2 H) — the top half of harmonic minor, that exotic Middle-Eastern leap</li>
      </ul>
      <p>Two <b>bonus</b> shapes that don't span a perfect 4th but are guitar/jazz favourites:</p>
      <ul class="theory-list">
        <li><b>Lydian</b> (W W W) — spans a tritone; bottom half of the Lydian scale</li>
        <li><b>Diminished</b> (H W H) — spans a major 3rd; building block of the diminished scale</li>
      </ul>
      <p>On guitar this is pure gold: the top note of any tetrachord sits on the next string — the <b>same fret</b> in standard tuning (perfect-4th string pairs), a fret or two away in other tunings. So scales become two identical little shapes — one on the low string, one on the next. Explore it on the <b>🎸 Fretboard</b> tab under <b>🪜 Tetrachords</b>.</p>
      <details class="ref-deeper">
        <summary>Where tetrachords come from</summary>
        <div class="ref-deeper-body">
          <p><b>“Tetrachord” is Greek for “four strings.”</b> The old lyres were tuned in perfect 4ths, and Greek theorists (starting with Pythagoras) built the whole system from these little ladders.</p>
          <p>They divided the perfect 4th into three <b>genera</b> (flavours):</p>
          <ul>
            <li><b>Diatonic</b> — tone, tone, semitone (our W W H)</li>
            <li><b>Chromatic</b> — semitone, semitone, minor 3rd</li>
            <li><b>Enharmonic</b> — quarter-tone, quarter-tone, major 3rd (too small for guitar frets)</li>
          </ul>
          <p>To reach the octave they stacked <b>two tetrachords with a whole tone between them</b> — the <i>disjunctive tone</i>. That's exactly the formula in the Scale builder: <b>lower + gap + upper = scale</b>. The medieval church modes kept the same building block and borrowed the Greek names; our modern major/minor system grew out of those modes centuries later. (More on the names in the <b>📚 Reference</b> tab.)</p>
        </div>
      </details>
    </section>

    <section class="theory-block">
      <h3>Deriving, not memorising</h3>
      <p>Everything on this site comes from <b>one idea</b>: <b>“1” is home — every other note is just steps counted from it.</b> You never memorise a scale or chord table; you <b>derive</b> it by walking the steps:</p>
      <ol class="derive-chain">
        <li><b>Pick 1</b> — any note, any string. C, F♯, doesn't matter.</li>
        <li><b>Count steps</b> → that gives you <b>intervals</b> (3 frets = minor 3rd).</li>
        <li><b>Four notes spanning a perfect 4th</b> → a <b>tetrachord</b> (W W H and friends).</li>
        <li><b>Lower tetrachord + gap + upper tetrachord</b> → a <b>scale</b>. No table needed.</li>
        <li><b>1st + 3rd note of each half</b> → the <b>7th chord</b> inside the scale.</li>
        <li><b>Stack perfect 5ths</b> → the <b>circle of fifths</b>, key signatures, everything.</li>
      </ol>
      <p class="muted">Try it right now: start on any note and walk <b>W W H W W W H</b>. You just derived a major scale. That's the whole trick — the rest is just names for the steps you already walked.</p>
      <p class="muted">Prefer to be walked through it? The <b>🎸 Fretboard</b> tab's <b>Scale builder</b> derives scales and chords for you, and <b>🎯 Practice</b> turns each step into a game.</p>
    </section>

    <section class="theory-block">
      <h3>Your path</h3>
      <p>Work the stages in order — each unlocks the next family. A stage shows <b>✓</b> when you have answered at least 5 of its questions and sit above 80% accuracy.</p>
      <div class="path-steps" id="pathSteps">${renderPathSteps()}</div>
    </section>

    <section class="theory-block">
      <h3>The 5-fret shortcut</h3>
      <p id="learnTuningTrick"></p>
      <p class="muted">Change the tuning in ⚙️ Settings and this explanation follows your tuning.</p>
    </section>
  `;
}

function currentTuning() {
  return TUNINGS[getSetting('tuning', 'standardE')] || TUNINGS.standardE;
}

function tuningTrickHTML() {
  const t = currentTuning();
  const gaps = [];
  for (let i = 0; i < 5; i++) {
    const gap = t.strings[i + 1].midi - t.strings[i].midi;
    gaps.push(`${t.strings[i].name.replace(/[0-9]/g, '')}→${t.strings[i + 1].name.replace(/[0-9]/g, '')}: <b>${gap} frets</b>`);
  }
  return `In <b>${t.label}</b>, each string's open note lives on the string below at ${gaps.join(', ')}. In standard tuning most gaps are 5 frets (a perfect 4th) — the 3rd→2nd strings drop to 4 (a major 3rd), which is why every cross-string shape bends by one fret there.`;
}

export function refreshTuningTricks() {
  const el = document.getElementById('learnTuningTrick');
  if (el) el.innerHTML = tuningTrickHTML();
}

export function refreshLearnPath() {
  const container = document.getElementById('pathSteps');
  if (container) container.innerHTML = renderPathSteps();
}

function goToTab(tab) {
  const btn = document.querySelector(`nav button[data-tab="${tab}"]`);
  if (btn) btn.click();
}

export function initLearn() {
  refreshTuningTricks();

  // Delegation on the document: refreshLearnPath() re-renders the path
  // (replacing its children) whenever a tab is opened, so listeners attached
  // directly to the stage buttons would be lost on the very first tab switch.
  document.addEventListener('click', (e) => {
    const earBtn = e.target.closest('.stage-ear-btn');
    if (earBtn) {
      setSetting('earStage', earBtn.dataset.stage);
      goToTab('ear');
      return;
    }
    const findBtn = e.target.closest('.stage-find-btn');
    if (findBtn) {
      setSetting('earStage', findBtn.dataset.stage);
      setSetting('practiceMode', 'findInterval');
      goToTab('practice');
      return;
    }
    // Clicking the stage card itself (not one of its buttons) opens the
    // default drill for that stage: the ear trainer.
    const step = e.target.closest('#pathSteps .path-step');
    if (step && !e.target.closest('button')) {
      setSetting('earStage', step.dataset.stage);
      goToTab('ear');
    }
  });
}
