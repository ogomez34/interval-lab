// Reusable "ⓘ" info icon + popup. Call info(title, bodyHtml) wherever you
// want a tappable info button; it registers the content and returns the
// button's HTML. initInfoBox() wires up the single shared popup once.
const REGISTRY = {};
let counter = 0;

export function info(title, bodyHtml) {
  return infoEntry(title, bodyHtml).html;
}

// For dynamic entries: infoEntry() also returns the id, so the popup content
// can be replaced later with updateInfo() (e.g. when the tuning changes).
export function infoEntry(title, bodyHtml) {
  const id = 'info' + (counter++);
  REGISTRY[id] = { title, bodyHtml };
  const safeTitle = title.replace(/"/g, '&quot;');
  return {
    id,
    html: `<button type="button" class="info-btn" data-info-id="${id}" aria-label="More info about ${safeTitle}">ⓘ</button>`
  };
}

export function updateInfo(id, title, bodyHtml) {
  if (REGISTRY[id]) REGISTRY[id] = { title, bodyHtml };
}

export function initInfoBox() {
  const modal = document.getElementById('infoModal');
  const titleEl = document.getElementById('infoModalTitle');
  const bodyEl = document.getElementById('infoModalBody');
  const closeBtn = document.getElementById('infoModalClose');
  const backdrop = modal.querySelector('.info-modal-backdrop');

  function open(id) {
    const entry = REGISTRY[id];
    if (!entry) return;
    titleEl.textContent = entry.title;
    bodyEl.innerHTML = entry.bodyHtml;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    closeBtn.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.info-btn');
    if (btn) { open(btn.dataset.infoId); return; }
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
}
