import http from "node:http";
import { createAppShell } from "../../../packages/ui-core/src/index.js";
import { renderMobileChrome } from "../../../packages/ui-mobile/src/index.js";
import { isMainModule, stopServer } from "../../../scripts/lib/repo.mjs";
import { resolveRuntimeModeProfile } from "../../../scripts/lib/runtime-mode.mjs";

export function createFieldMobileServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/" || url.pathname === "/healthz") {
      const html = createAppShell({
        title: "Swedish ERP - Field Mobile",
        body: renderMobileChrome({
          surface: "field-mobile",
          headline: "Idag i faltet",
          subtitle: "Dispatch, personalliggare, ROT/RUT, ATA, material, signatur och syncstatus i tumvanligt format.",
          syncBadge: "Offline-first aktivt for tillatna faltfloden",
          tabs: ["Idag", "Jobb", "Tid", "Personalliggare", "ROT/RUT", "ATA", "Material", "Signatur", "Profil"],
          quickActions: [
            { label: "Check in", tone: "primary" },
            { label: "Materialuttag", tone: "secondary" },
            { label: "Kundsignatur", tone: "secondary" },
            { label: "Personalliggare", tone: "secondary" }
          ],
          todayItems: [
            {
              title: "WO-2026-0001",
              meta: "07:00-11:00 - dispatch planerad",
              detail: "Install site equipment - Projekt P-ALPHA - signatur kravs",
              statusLabel: "Pending signatur",
              statusTone: "warning"
            },
            {
              title: "Truck-01 lager",
              meta: "12 artiklar redo pa bilen",
              detail: "Snabbvy over trucklager och materialavvikelser for dagens jobb.",
              statusLabel: "Synkad",
              statusTone: "success"
            },
            {
              title: "SITE-ALPHA-01",
              meta: "Personalliggare aktiv - kontrollkedja redo",
              detail: "Check-in, offlinekorrigeringar och export till kontrollkedja hanteras i samma bakre API.",
              statusLabel: "Personalliggare",
              statusTone: "info"
            }
          ],
          infoCards: [
            {
              title: "Offline state badges",
              body: "Pending, synced och conflict visas tydligt i mobilen innan nasta api-koppling."
            },
            {
              title: "Bottom actions",
              body: "Snabbknappar for check-in, material och signatur sitter nara tummen."
            },
            {
              title: "ROT/RUT och ATA",
              body: "Mobilen visar styrda ingangar for HUS-underlag, ATA-referenser och personalliggare, men backend bar hela regelverket."
            }
          ],
          footerNote: "Desktop-web bar hela domanlogiken. Mobilen ar en styrd faltvy ovanpa samma backend."
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

export async function startFieldMobileServer({
  port = Number(process.env.PORT || 3002),
  logger = console.log,
  runtimeMode = null,
  env = process.env,
  enforceExplicitRuntimeMode = true
} = {}) {
  const runtimeModeResolutionOptions = {
    runtimeMode,
    env,
    starter: "field-mobile",
    requireExplicit: enforceExplicitRuntimeMode
  };
  if (!enforceExplicitRuntimeMode) {
    runtimeModeResolutionOptions.fallbackMode = "test";
  }
  const runtimeModeProfile = resolveRuntimeModeProfile(runtimeModeResolutionOptions);
  const server = createFieldMobileServer();
  await new Promise((resolve) => {
    server.listen(port, resolve);
  });
  logger(`field-mobile listening on http://localhost:${port} (${runtimeModeProfile.environmentMode})`);
  return {
    port,
    server,
    runtimeModeProfile,
    stop: () => stopServer(server)
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = await startFieldMobileServer({
    enforceExplicitRuntimeMode: true
  });
  process.on("SIGINT", async () => {
    await runtime.stop();
    process.exit(0);
  });
}
