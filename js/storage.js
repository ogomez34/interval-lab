// Simple localStorage wrapper for practice stats + settings + presets.

const STATS_KEY = 'notesMakerStats_v1';
const SETTINGS_KEY = 'notesMakerSettings_v1';
const PRESETS_KEY = 'notesMakerPresets_v1';

// ---------- Stats ----------

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

export function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
}

export function recordAttempt(intervalKey, isCorrect, elapsedMs) {
  const stats = loadStats();
  if (!stats[intervalKey]) {
    stats[intervalKey] = { correct: 0, wrong: 0, totalMs: 0, attempts: 0 };
  }
  const s = stats[intervalKey];
  s.attempts++;
  s.totalMs += elapsedMs;
  if (isCorrect) s.correct++; else s.wrong++;
  saveStats(stats);
  return stats;
}

export function resetStats() {
  try { localStorage.removeItem(STATS_KEY); } catch (e) {}
}

export function getIntervalAccuracy(stats, intervalKey) {
  const s = stats[intervalKey];
  if (!s || s.attempts === 0) return null;
  return s.correct / s.attempts;
}

export function getAverageMs(stats, intervalKey) {
  const s = stats[intervalKey];
  if (!s || s.attempts === 0) return null;
  return Math.round(s.totalMs / s.attempts);
}

// ---------- Settings ----------

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
}

export function getSetting(key, defaultValue) {
  const s = loadSettings();
  return key in s ? s[key] : defaultValue;
}

export function setSetting(key, value) {
  const s = loadSettings();
  s[key] = value;
  saveSettings(s);
}

// ---------- Presets ----------

export function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

export function savePresets(presets) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch (e) {}
}

export function savePreset(name, data) {
  const presets = loadPresets();
  presets[name] = { ...data, _savedAt: Date.now() };
  savePresets(presets);
  return presets;
}

export function deletePreset(name) {
  const presets = loadPresets();
  delete presets[name];
  savePresets(presets);
  return presets;
}

// ---------- Visited tabs (for the "Start here" path) ----------

const VISITED_KEY = 'notesMakerVisitedTabs_v1';

export function getVisitedTabs() {
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

export function markTabVisited(tab) {
  const visited = new Set(getVisitedTabs());
  visited.add(tab);
  try { localStorage.setItem(VISITED_KEY, JSON.stringify([...visited])); } catch (e) {}
}

// ---------- Accidental preference ----------

export function getAccidentalPref() {
  return getSetting('accidentalPref', 'both');
}

export function setAccidentalPref(pref) {
  setSetting('accidentalPref', pref);
}

// Format a pitch class using the user's preference.
// pc: 0-11. Returns string.
import { formatPcWithPref, formatNoteName } from './music.js';

export function formatPc(pc) {
  return formatPcWithPref(pc, getAccidentalPref());
}

// ---------- Note-name notation (letters vs fixed-Do solfège) ----------

export function getNoteNames() {
  return getSetting('noteNames', 'letters');
}

// Format a pitch class for display using the user's notation + accidental
// preferences. Used by every interactive surface (fretboard, piano, circle,
// chords, practice).
export function formatNoteForDisplay(pc) {
  return formatNoteName(pc, getAccidentalPref(), getNoteNames());
}
