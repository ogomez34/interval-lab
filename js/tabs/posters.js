// Posters tab — print-ready A4 practice posters (poster.html / poster.pdf).

export function renderPosters() {
  return `
    <h2>🖼️ Posters</h2>
    <p class="muted-intro">Print-ready A4 posters for the practice room. Page 1 = the 12 distances · page 2 = tetrachord, scale and chord shapes · page 3 = the full fretboard maps for Standard E and Drop C.</p>

    <div class="controls">
      <a class="play-btn" href="poster.html" target="_blank" rel="noopener">Open full size ↗</a>
      <a class="play-btn" href="poster.pdf" download>Download PDF ↓</a>
      <span class="poster-hint">Print the PDF at 100% on A4 — no scaling, no margins.</span>
    </div>

    <div class="poster-frame">
      <iframe src="poster.html" title="Practice posters" loading="lazy"></iframe>
    </div>
  `;
}

export function initPosters() {
  // Nothing interactive yet — the iframe previews the standalone poster page,
  // whose own print styles work when opened via the button above.
}
