export function renderMobileChrome({
  surface,
  headline,
  subtitle,
  syncBadge = null,
  tabs = [],
  quickActions = [],
  todayItems = [],
  infoCards = [],
  footerNote = null
}) {
  return `<section class="workspace workspace-mobile" data-surface="${escapeHtml(surface)}">
  <style>
    .mobile-stack {
      display: grid;
      gap: 16px;
    }
    .mobile-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(17, 24, 39, 0.08);
      color: #1f2937;
      font-size: 13px;
      font-weight: 600;
    }
    .mobile-tab-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .mobile-tab {
      display: inline-flex;
      align-items: center;
      min-height: 42px;
      padding: 0 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(17, 24, 39, 0.08);
      font-size: 14px;
      font-weight: 600;
    }
    .mobile-action--secondary {
      background: #475467;
    }
    .mobile-today-list {
      display: grid;
      gap: 12px;
    }
    .mobile-today-card {
      padding: 16px;
      border-radius: 18px;
      background: linear-gradient(180deg, #ffffff 0%, #f7f7f4 100%);
      border: 1px solid rgba(17, 24, 39, 0.08);
      display: grid;
      gap: 8px;
    }
    .mobile-today-meta {
      color: #475467;
      font-size: 13px;
    }
    .mobile-today-status {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .mobile-today-status--warning {
      background: #fff4d6;
      color: #9a6700;
    }
    .mobile-today-status--success {
      background: #dcfae6;
      color: #067647;
    }
    .mobile-footer-note {
      color: #475467;
      font-size: 13px;
      line-height: 1.5;
    }
  </style>
  <div class="mobile-stack">
    <div class="mobile-hero">
      <div class="workspace-kicker">Field-mobile</div>
      <h2>${escapeHtml(headline)}</h2>
      <p>${escapeHtml(subtitle)}</p>
      ${syncBadge ? `<div class="mobile-badge">Offline state badge - ${escapeHtml(syncBadge)}</div>` : ""}
    </div>
    ${
      tabs.length
        ? `<div class="mobile-card"><strong>Flikar</strong><div class="mobile-tab-list">${tabs
            .map((tab) => `<span class="mobile-tab">${escapeHtml(tab)}</span>`)
            .join("")}</div></div>`
        : ""
    }
    ${
      quickActions.length
        ? `<div class="mobile-actions" aria-label="Quick actions">${quickActions
            .map(
              (action) =>
                `<button type="button" class="${action.tone === "secondary" ? "mobile-action--secondary" : ""}">${escapeHtml(action.label)}</button>`
            )
            .join("")}</div>`
        : ""
    }
    ${
      todayItems.length
        ? `<div class="mobile-card"><strong>Idag</strong><div class="mobile-today-list">${todayItems
            .map(
              (item) => `<article class="mobile-today-card">
  <strong>${escapeHtml(item.title)}</strong>
  <div class="mobile-today-meta">${escapeHtml(item.meta)}</div>
  <p>${escapeHtml(item.detail)}</p>
  <span class="mobile-today-status mobile-today-status--${escapeHtml(item.statusTone || "warning")}">${escapeHtml(item.statusLabel)}</span>
</article>`
            )
            .join("")}</div></div>`
        : ""
    }
    ${infoCards.map((card) => `<div class="mobile-card"><strong>${escapeHtml(card.title)}</strong><p>${escapeHtml(card.body)}</p></div>`).join("")}
    ${footerNote ? `<div class="mobile-footer-note">${escapeHtml(footerNote)}</div>` : ""}
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
