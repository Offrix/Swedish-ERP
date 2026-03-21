export function createAppShell({ title, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: linear-gradient(180deg, #f7f7f4 0%, #ece8df 100%);
        color: #1f2328;
      }
      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      .shell {
        background: rgba(255, 255, 255, 0.84);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(16, 24, 40, 0.08);
        overflow: hidden;
      }
      .shell-header {
        padding: 20px 24px 12px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      }
      .shell-header h1 {
        margin: 0;
        font-size: 20px;
        line-height: 1.2;
      }
      .shell-header p {
        margin: 8px 0 0;
        color: #5b6472;
      }
      .shell-body {
        padding: 24px;
      }
      .workspace {
        display: grid;
        gap: 20px;
      }
      .workspace-grid {
        display: grid;
        grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
        gap: 20px;
      }
      .workspace-nav,
      .workspace-panel,
      .mobile-card,
      .mobile-hero {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 20px;
        padding: 18px;
      }
      .workspace-kicker {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #6b7280;
        margin-bottom: 8px;
      }
      .workspace-nav h2,
      .mobile-hero h2 {
        margin: 0;
        font-size: 24px;
        line-height: 1.2;
      }
      .workspace-nav p,
      .workspace-card p,
      .mobile-hero p,
      .mobile-card p {
        color: #5b6472;
        line-height: 1.5;
      }
      .workspace-list {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }
      .workspace-list a {
        color: inherit;
        text-decoration: none;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.03);
      }
      .workspace-panel {
        display: grid;
        gap: 16px;
      }
      .workspace-card {
        padding: 18px;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffffff 0%, #f7f7f4 100%);
        border: 1px solid rgba(0, 0, 0, 0.06);
      }
      .workspace-card strong,
      .mobile-card strong {
        display: block;
        margin-bottom: 8px;
      }
      .mobile-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .mobile-actions button {
        appearance: none;
        border: 0;
        border-radius: 16px;
        min-height: 56px;
        padding: 12px;
        background: #111827;
        color: #fff;
        font: inherit;
      }
      @media (max-width: 760px) {
        .workspace-grid {
          grid-template-columns: 1fr;
        }
        .mobile-actions {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="shell">
        <div class="shell-header">
          <h1>${escapeHtml(title)}</h1>
          <p>Swedish ERP baseline shell</p>
        </div>
        <div class="shell-body">${body}</div>
      </div>
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
