// Lets the user move the main nav (top/bottom/left/right) and choose a
// compact (☰ dropdown) or always-visible style on small screens.
const POS_KEY = 'nm_nav_pos';
const MOBILE_KEY = 'nm_nav_mobile';

export function initNavLayout() {
  const nav = document.getElementById('mainNav');
  const toggle = document.getElementById('navToggle');
  const posSelect = document.getElementById('navPosition');
  const mobileSelect = document.getElementById('navMobileStyle');

  const savedPos = localStorage.getItem(POS_KEY) || 'top';
  const savedMobile = localStorage.getItem(MOBILE_KEY) || 'dropdown';

  apply(savedPos, savedMobile);
  posSelect.value = savedPos;
  mobileSelect.value = savedMobile;

  posSelect.addEventListener('change', () => {
    apply(posSelect.value, mobileSelect.value);
    localStorage.setItem(POS_KEY, posSelect.value);
  });
  mobileSelect.addEventListener('change', () => {
    apply(posSelect.value, mobileSelect.value);
    localStorage.setItem(MOBILE_KEY, mobileSelect.value);
  });

  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('button[data-tab]')) nav.classList.remove('open');
  });
  document.addEventListener('click', (e) => {
    if (!nav.classList.contains('open')) return;
    if (nav.contains(e.target) || toggle.contains(e.target)) return;
    nav.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') nav.classList.remove('open');
  });

  function apply(pos, mobile) {
    document.body.dataset.navPos = pos;
    document.body.dataset.navMobile = mobile;
  }
}
