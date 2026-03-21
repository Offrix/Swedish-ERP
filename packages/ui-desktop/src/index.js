export function renderDesktopChrome({ surface, headline, subtitle }) {
  return `<section class="workspace workspace-desktop" data-surface="${escapeHtml(surface)}">
  <div class="workspace-grid">
    <aside class="workspace-nav">
      <div class="workspace-kicker">Desktop-web</div>
      <h2>${escapeHtml(headline)}</h2>
      <p>${escapeHtml(subtitle)}</p>
      <nav class="workspace-list" aria-label="Desktop modules">
        <a href="#">Inbox</a>
        <a href="#">Ledger</a>
        <a href="#">AP</a>
        <a href="#">AR</a>
      </nav>
    </aside>
    <section class="workspace-panel" aria-label="Desktop overview">
      <div class="workspace-card">
        <strong>Baseline ready</strong>
        <p>This surface is intentionally small and can be expanded without changing root config.</p>
      </div>
      <div class="workspace-card">
        <strong>Next step</strong>
        <p>Attach real routes, data loading and role-specific views when the platform shell exists.</p>
      </div>
    </section>
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
