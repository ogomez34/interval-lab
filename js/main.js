import { initTheme } from './theme.js';
import { emit } from './events.js';
import { renderLearn, initLearn, refreshLearnPath } from './tabs/learn.js';
import { renderReference, initReference } from './tabs/reference.js';
import { renderPractice, initPractice } from './tabs/practice.js';
import { renderEar, initEar } from './tabs/ear.js';
import { renderGuitar, initGuitar } from './tabs/guitar.js';
import { renderMetro, initMetro } from './tabs/metro.js';
import { initPresets } from './presets.js';
import { initInfoBox } from './infobox.js';
import { initNavLayout } from './navlayout.js';
import { markTabVisited } from './storage.js';

// ---- Populate tab content ----
document.getElementById('learn').innerHTML = renderLearn();
document.getElementById('ref').innerHTML = renderReference();
document.getElementById('practice').innerHTML = renderPractice();
document.getElementById('ear').innerHTML = renderEar();
document.getElementById('guitar').innerHTML = renderGuitar();
document.getElementById('metro').innerHTML = renderMetro();

// ---- Initialize each tab ----
initLearn();
initReference();
initPractice();
initEar();
initGuitar();
initMetro();
initPresets();
initInfoBox();
initNavLayout();

// ---- Tab switching (single nav, shared by all layout positions) ----
const navButtons = document.querySelectorAll('nav button[data-tab]');
const tabPanels = document.querySelectorAll('.tab');

// Settings is a popup, not a tab.
const settingsModal = document.getElementById('settingsModal');
const settingsCloseBtn = document.getElementById('settingsModalClose');
function openSettingsModal() {
  settingsModal.hidden = false;
  document.body.classList.add('modal-open');
  settingsCloseBtn.focus();
}
function closeSettingsModal() {
  settingsModal.hidden = true;
  document.body.classList.remove('modal-open');
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === 'settings') {
      openSettingsModal();
      return;
    }
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    tabPanels.forEach(t => t.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    markTabVisited(tab);
    refreshLearnPath();
    // Let each tab handle its own "now visible" redraws. The Guitar tab
    // re-renders its fretboard here because it was built while hidden, so
    // its octave-twin lines measured at 0×0.
    emit('tab-visible', tab);
  });
});

settingsCloseBtn.addEventListener('click', closeSettingsModal);
settingsModal.querySelector('.info-modal-backdrop').addEventListener('click', closeSettingsModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !settingsModal.hidden) closeSettingsModal();
});

// ---- Cross-links into Reference ----
document.addEventListener('click', (e) => {
  const link = e.target.closest('.ref-link');
  if (!link) return;
  e.preventDefault();
  const anchor = link.dataset.refAnchor;
  document.querySelector('nav button[data-tab="ref"]').click();
  requestAnimationFrame(() => {
    const target = document.getElementById(anchor);
    if (!target) return;
    const details = target.closest('details');
    if (details) details.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ---- Theme ----
initTheme();
