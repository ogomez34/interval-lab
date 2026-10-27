let audioCtx = null;
let silentEl = null;
let activeSounds = 0;
let idleTimer = null;

// How long to keep the iOS silent helper element playing after the last
// scheduled sound ends. Long enough to cover gaps in sequenced notes
// (playSequence uses ~0.6s gaps) without constantly toggling it, but short
// enough that the page quickly lets go of the phone's audio session when idle.
const SILENT_IDLE_GRACE_MS = 1500;

// iOS Safari mutes pure Web Audio API sound while the hardware ring/silent
// switch is on. The workaround is a real (silent) <audio> element: only while
// it is actually playing does the page's audio session become "playback" and
// Web Audio becomes audible. We only need this helper on iOS.
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

export function ensureCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Mobile browsers (notably iOS Safari) only allow an AudioContext to be
// unlocked synchronously inside a direct user gesture (tap/click/keydown).
// Several sounds in this app are scheduled a little after the tap (e.g. via
// setTimeout for sequenced notes/chords), which is too late to unlock the
// context for the first time. So we eagerly create+resume the context and
// play a silent buffer on the very first gesture anywhere on the page,
// guaranteeing it's already running before any later, delayed sound plays.
//
// On iPhone there's a second, separate problem: pure Web Audio API sound is
// treated as "ambient" audio by iOS and gets silenced by the hardware
// ring/silent switch (this is why it only works with the switch off, or
// with Bluetooth headphones, which bypass the switch entirely). The fix is
// to also start a real, looping <audio> element - that upgrades the page's
// iOS audio session to the "playback" category, which ignores the silent
// switch for everything on the page, including our Web Audio sounds.
const SILENT_LOOP_SRC = 'data:audio/wav;base64,UklGRvQHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdAHAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

let unlocked = false;
function unlockAudio() {
  if (unlocked) return;
  unlocked = true;

  // Create + resume the Web Audio context inside this user gesture and play a
  // silent buffer through it. This "unlocks" the context for later,
  // programmatically scheduled sounds (sequenced notes/chords use setTimeout).
  const ctx = ensureCtx();
  const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = silent;
  source.connect(ctx.destination);
  source.start(0);

  if (!IS_IOS) return;

  // On iOS, create the silent helper element and start it once (then pause it)
  // inside this gesture. That "blesses" it for later programmatic play/pause,
  // which soundStarted()/soundEnded() use to hold the playback audio session
  // only while real sounds are active.
  silentEl = document.createElement('audio');
  silentEl.src = SILENT_LOOP_SRC;
  silentEl.loop = true;
  silentEl.volume = 0.001;
  silentEl.setAttribute('playsinline', '');
  silentEl.style.display = 'none';
  document.body.appendChild(silentEl);
  const p = silentEl.play();
  if (p && p.then) p.then(() => { silentEl.pause(); }).catch(() => {});
}
['touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach(evt => {
  document.addEventListener(evt, unlockAudio, { once: true, passive: true });
});

function ensureSilentPlaying() {
  if (!silentEl) return;
  const p = silentEl.play();
  if (p && p.catch) p.catch(() => {});
}

function pauseSilentEl() {
  if (silentEl) silentEl.pause();
}

function soundStarted() {
  activeSounds++;
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  ensureSilentPlaying();
}

function soundEnded() {
  activeSounds = Math.max(0, activeSounds - 1);
  if (activeSounds === 0) {
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (activeSounds === 0) pauseSilentEl();
    }, SILENT_IDLE_GRACE_MS);
  }
}

// Release the iPhone audio session when the page is hidden or closed. iOS
// keeps whatever audio session the page last held; if we don't suspend the
// context and pause the helper element here, other apps (YouTube, Music) can
// lose sound after this app has been used.
function releaseAudio() {
  if (audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(() => {});
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  pauseSilentEl();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') releaseAudio();
});
window.addEventListener('pagehide', releaseAudio);


// Plucked-string (guitar) voice using Karplus-Strong synthesis: a short burst
// of filtered noise is fed through a feedback delay sized to the pitch's
// wavelength, which naturally produces the comb-filtered decay of a real
// plucked string instead of a flat beep.
function renderPluckBuffer(ctx, freq, duration) {
  const sampleRate = ctx.sampleRate;
  const period = Math.max(2, Math.round(sampleRate / freq));
  const totalSamples = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
  const data = buffer.getChannelData(0);

  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;

  // Damping tuned so the string rings for roughly `duration` seconds.
  const damping = 0.994 + Math.min(0.0045, duration * 0.001);
  for (let n = 0; n < totalSamples; n++) {
    const idx = n % period;
    const next = ring[(idx + 1) % period];
    const avg = damping * 0.5 * (ring[idx] + next);
    data[n] = ring[idx];
    ring[idx] = avg;
  }

  // Soft fade-out so the buffer doesn't click when it ends.
  const fadeSamples = Math.min(totalSamples, Math.round(sampleRate * 0.03));
  for (let i = 0; i < fadeSamples; i++) {
    data[totalSamples - 1 - i] *= i / fadeSamples;
  }
  return buffer;
}

function playPluck(midi, duration) {
  const ctx = ensureCtx();
  soundStarted();
  const freq = midiToFreq(midi);
  const buffer = renderPluckBuffer(ctx, freq, duration + 0.2);

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // A gentle body resonance: lowpass to tame synth-y noise, a touch of
  // low-shelf warmth to suggest a guitar's soundbox.
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = Math.min(9000, freq * 10 + 1500);
  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowshelf';
  warmth.frequency.value = 220;
  warmth.gain.value = 4;

  const gain = ctx.createGain();
  gain.gain.value = 0.9;

  source.connect(body); body.connect(warmth); warmth.connect(gain); gain.connect(ctx.destination);
  source.start();
  setTimeout(soundEnded, (duration + 0.3) * 1000);
}

// Piano-like voice via additive synthesis: a handful of harmonics with a
// bright-then-dull lowpass sweep (mimics a hammer strike) and a two-stage
// percussive envelope (fast decay into a longer sustain/release).
function playPiano(midi, duration) {
  const ctx = ensureCtx();
  soundStarted();
  const freq = midiToFreq(midi);
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq * 10 + 2500, now);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 2, 400), now + duration * 0.6);
  filter.Q.value = 0.7;

  master.connect(filter); filter.connect(ctx.destination);

  const harmonics = [
    { mult: 1, gain: 1.0 },
    { mult: 2, gain: 0.45 },
    { mult: 3, gain: 0.18 },
    { mult: 4, gain: 0.09 },
  ];
  const oscillators = harmonics.map(h => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * h.mult;
    const g = ctx.createGain();
    g.gain.value = h.gain;
    osc.connect(g); g.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.3);
    return osc;
  });

  // Percussive envelope: near-instant attack, fast initial decay, slower tail.
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.5, now + 0.008);
  master.gain.exponentialRampToValueAtTime(0.14, now + duration * 0.35);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.25);

  setTimeout(soundEnded, (duration + 0.4) * 1000);
}

export function playMidi(midi, duration = 1.2, instrument = 'piano') {
  if (instrument === 'guitar') playPluck(midi, duration);
  else playPiano(midi, duration);
}

export function playSequence(midis, gap = 0.6, instrument = 'piano') {
  midis.forEach((m, i) => {
    setTimeout(() => playMidi(m, 0.5, instrument), i * gap * 1000);
  });
}

export function playChord(midis, duration = 1.4, instrument = 'piano') {
  midis.forEach(m => playMidi(m, duration, instrument));
}

// ---- Root drone ----
// A sustained reference pitch the player can leave running while they
// explore intervals on the fretboard. Loops a soft triangle wave with a
// slow attack/release so it never clicks.
let drone = null;
export function startDrone(midi, type = 'triangle') {
  stopDrone();
  const ctx = ensureCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = midiToFreq(midi);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.4);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start();
  drone = { osc, gain, ctx };
  soundStarted();
}
export function stopDrone() {
  if (!drone) return;
  const { osc, gain, ctx } = drone;
  drone = null;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value || 0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.stop(now + 0.35);
  setTimeout(soundEnded, 500);
}
export function dronePlaying() { return !!drone; }
export function toggleDrone(midi) {
  if (dronePlaying()) stopDrone(); else startDrone(midi);
}

// `isMain` distinguishes a main-beat tick from a quieter subdivision tick;
// `accent` further emphasises the first beat of the bar (e.g. downbeat).
export function playClick(isMain = true, accent = false) {
  const ctx = ensureCtx();
  soundStarted();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = accent ? 1500 : (isMain ? 1000 : 700);
  const peak = accent ? 0.25 : (isMain ? 0.18 : 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.08);
  setTimeout(soundEnded, 150);
}
