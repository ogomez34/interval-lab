import {
  loadPresets, savePreset, deletePreset,
  getAccidentalPref, setAccidentalPref,
  getSetting, setSetting, getNoteNames
} from './storage.js';
import { $, TUNINGS } from './music.js';
import { currentLabelMode, setLabelMode, setTuning } from './tabs/guitar.js';
import { emit } from './events.js';

// Things a preset captures, mapped to the DOM ids that hold their values.
// The guitar label mode is module state (not a DOM input) and is handled
// separately as two booleans: guitarNashville / guitarInterval.
const DOM_FIELD_IDS = {
  tuning: 'settingsTuning',
  guitarRoot: 'rootNote',
  guitarScale: 'scaleType',
  guitarShowAll: 'showAll',
  practiceMode: 'practiceMode',
  practiceLevel: 'level',
  weakSpotMode: 'weakSpot',
  earStage: 'earStage',
  earDir: 'earDir',
  noteNames: 'noteNames'
};

export function initPresets() {
  refreshPresetDropdown();

  $('presetLoad').addEventListener('click', loadSelectedPreset);
  $('presetSaveAs').addEventListener('click', saveCurrentAsPreset);
  $('presetDelete').addEventListener('click', deleteSelectedPreset);

  // Tuning setting (synced with the Guitar tab picker)
  const tuningSel = $('settingsTuning');
  Object.keys(TUNINGS).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = TUNINGS[key].label;
    tuningSel.appendChild(opt);
  });
  tuningSel.value = getSetting('tuning', 'standardE');
  tuningSel.addEventListener('change', (e) => setTuning(e.target.value));

  // Note-name notation (letters vs fixed-Do solfège)
  $('noteNames').value = getNoteNames();
  $('noteNames').addEventListener('change', (e) => {
    setSetting('noteNames', e.target.value);
    emit('note-names-change');
  });

  // Accidental preference dropdown
  const pref = getAccidentalPref();
  $('accidentalPref').value = pref;
  $('accidentalPref').addEventListener('change', (e) => {
    setAccidentalPref(e.target.value);
    emit('accidental-pref-change');
  });
}

function refreshPresetDropdown() {
  const presets = loadPresets();
  const sel = $('presetSelect');
  const currentValue = sel.value;
  sel.innerHTML = '<option value="">— none —</option>';
  Object.keys(presets).sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  if (presets[currentValue]) sel.value = currentValue;
}

function collectCurrentState() {
  const state = {};
  Object.entries(DOM_FIELD_IDS).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el && 'value' in el) {
      state[key] = el.type === 'checkbox' ? el.checked : el.value;
    }
  });
  state.guitarNashville = currentLabelMode() === 'nashville';
  state.guitarInterval = currentLabelMode() === 'intervals';
  state.theme = document.documentElement.getAttribute('data-theme') || 'dark';
  return state;
}

function applyState(state) {
  // Ignore internal metadata
  Object.keys(state).forEach(key => {
    if (key.startsWith('_')) return;
    const val = state[key];

    // Guitar label mode is handled after the DOM fields (it re-renders the
    // fretboard), and theme is applied last (it triggers other re-renders).
    if (key === 'guitarNashville' || key === 'guitarInterval' || key === 'theme') return;

    const id = DOM_FIELD_IDS[key];
    if (!id) return;
    const el = document.getElementById(id);
    if (!el || !('value' in el)) return;

    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val;

    // Fire change events so tabs re-render.
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  if ('guitarNashville' in state || 'guitarInterval' in state) {
    setLabelMode(
      state.guitarNashville ? 'nashville'
        : state.guitarInterval ? 'intervals'
        : 'notes'
    );
  }

  if (state.theme) {
    const themeBtn = document.querySelector(`#themeSwitch button[data-theme-btn="${state.theme}"]`);
    if (themeBtn) themeBtn.click();
  }
}

function loadSelectedPreset() {
  const name = $('presetSelect').value;
  if (!name) return;
  const presets = loadPresets();
  const state = presets[name];
  if (!state) return;
  applyState(state);
}

function saveCurrentAsPreset() {
  const name = prompt('Name this preset:');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  const state = collectCurrentState();
  savePreset(trimmed, state);
  refreshPresetDropdown();
  $('presetSelect').value = trimmed;
}

function deleteSelectedPreset() {
  const name = $('presetSelect').value;
  if (!name) return;
  if (!confirm(`Delete preset "${name}"?`)) return;
  deletePreset(name);
  refreshPresetDropdown();
}
