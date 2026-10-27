import { emit } from './events.js';

const THEME_KEY = 'notesMakerTheme';

export function setTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  document.querySelectorAll('#themeSwitch button').forEach(b => {
    b.classList.toggle('active', b.dataset.themeBtn === name);
  });
  try { localStorage.setItem(THEME_KEY, name); } catch(e) {}
  emit('theme-change', name);
}

export function initTheme() {
  document.querySelectorAll('#themeSwitch button').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.themeBtn));
  });
  let saved = 'dark';
  try { saved = localStorage.getItem(THEME_KEY) || 'dark'; } catch(e) {}
  setTheme(saved);
}
