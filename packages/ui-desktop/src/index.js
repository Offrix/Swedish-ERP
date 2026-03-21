export function renderDesktopChrome({ surface, headline, subtitle, navItems = defaultNavItems(), cards = defaultCards() }) {
  return `<section class="workspace workspace-desktop" data-surface="${escapeHtml(surface)}">
  <div class="workspace-grid">
    <aside class="workspace-nav">
      <div class="workspace-kicker">Desktop-web</div>
      <h2>${escapeHtml(headline)}</h2>
      <p>${escapeHtml(subtitle)}</p>
      <nav class="workspace-list" aria-label="Desktop modules">
        ${navItems.map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join("")}
      </nav>
    </aside>
    <section class="workspace-panel" aria-label="Desktop overview">
      ${cards
        .map(
          (card) => `<div class="workspace-card">
        <strong>${escapeHtml(card.title)}</strong>
        <p>${escapeHtml(card.body)}</p>
      </div>`
        )
        .join("")}
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

function defaultNavItems() {
  return [
    { href: "/auth", label: "Auth" },
    { href: "/onboarding", label: "Onboarding" },
    { href: "#", label: "Inbox" },
    { href: "#", label: "Ledger" }
  ];
}

function defaultCards() {
  return [
    {
      title: "Guided desktop surface",
      body: "Auth, onboarding and dense workbenches live in the same desktop-web surface."
    },
    {
      title: "Server-owned rules",
      body: "Authorization, delegation and setup state are enforced in the API, not in the browser."
    }
  ];
}
