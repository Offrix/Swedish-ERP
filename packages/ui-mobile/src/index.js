export function renderMobileChrome({ surface, headline, subtitle }) {
  return `<section class="workspace workspace-mobile" data-surface="${escapeHtml(surface)}">
  <div class="mobile-hero">
    <div class="workspace-kicker">Field-mobile</div>
    <h2>${escapeHtml(headline)}</h2>
    <p>${escapeHtml(subtitle)}</p>
  </div>
  <div class="mobile-actions" aria-label="Quick actions">
    <button type="button">Check in</button>
    <button type="button">Add time</button>
    <button type="button">Upload photo</button>
  </div>
  <div class="mobile-card">
    <strong>Offline first</strong>
    <p>Designed as the starting point for a thumb-friendly workflow shell.</p>
  </div>
</section>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
