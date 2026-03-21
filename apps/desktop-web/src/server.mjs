import http from "node:http";
import { createAppShell } from "../../../packages/ui-core/src/index.js";
import { renderDesktopChrome } from "../../../packages/ui-desktop/src/index.js";
import { isMainModule, stopServer } from "../../../scripts/lib/repo.mjs";

export function createDesktopWebServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/" || url.pathname === "/healthz" || url.pathname === "/auth" || url.pathname === "/onboarding") {
      const view =
        url.pathname === "/auth"
          ? {
              headline: "Identity and strong auth",
              subtitle: "Login, session revocation, TOTP, passkeys and BankID live behind the same desktop shell.",
              cards: [
                {
                  title: "Admins require MFA",
                  body: "FAS 1 enforces stronger auth for admins before protected actions can run."
                },
                {
                  title: "Audit every auth event",
                  body: "Login starts, factor verification, logout and revocation are server-side audit events."
                }
              ]
            }
          : url.pathname === "/onboarding"
            ? {
                headline: "Company onboarding wizard",
                subtitle: "Company profile, registrations, chart template, VAT setup and periods are guided inside desktop-web.",
                cards: [
                  {
                    title: "Resumable setup",
                    body: "Onboarding keeps checklist state and can be resumed without rebuilding the company draft."
                  },
                  {
                    title: "No domain logic in UI",
                    body: "Desktop-web only hosts the guided flow. The API owns checklist state and validations."
                  }
                ]
              }
            : {
                headline: "Desktop-web baseline",
                subtitle: "Disjoint workspace for enterprise workflows.",
                cards: [
                  {
                    title: "FAS 1 entrypoints",
                    body: "Use Auth and Onboarding inside this same desktop-web surface; no split desktop variants exist."
                  },
                  {
                    title: "Guided plus dense",
                    body: "The same app can host guided startsidor and keyboard-first operator workbenches."
                  }
                ]
              };

      const html = createAppShell({
        title: "Swedish ERP - Desktop Web",
        body: renderDesktopChrome({
          surface: "desktop-web",
          headline: view.headline,
          subtitle: view.subtitle,
          cards: view.cards
        })
      });

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  });
}

export async function startDesktopWebServer({ port = Number(process.env.PORT || 3001), logger = console.log } = {}) {
  const server = createDesktopWebServer();
  await new Promise((resolve) => {
    server.listen(port, resolve);
  });
  logger(`desktop-web listening on http://localhost:${port}`);
  return {
    port,
    server,
    stop: () => stopServer(server)
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = await startDesktopWebServer();
  process.on("SIGINT", async () => {
    await runtime.stop();
    process.exit(0);
  });
}
