import http from "node:http";
import { createAppShell } from "../../../packages/ui-core/src/index.js";
import { renderDesktopChrome } from "../../../packages/ui-desktop/src/index.js";
import { isMainModule, stopServer } from "../../../scripts/lib/repo.mjs";

export function createDesktopWebServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/" || url.pathname === "/healthz") {
      const html = createAppShell({
        title: "Swedish ERP - Desktop Web",
        body: renderDesktopChrome({
          surface: "desktop-web",
          headline: "Desktop-web baseline",
          subtitle: "Disjoint workspace for enterprise workflows."
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
