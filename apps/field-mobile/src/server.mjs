import http from "node:http";
import { createAppShell } from "../../../packages/ui-core/src/index.js";
import { renderMobileChrome } from "../../../packages/ui-mobile/src/index.js";
import { isMainModule, stopServer } from "../../../scripts/lib/repo.mjs";

export function createFieldMobileServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/" || url.pathname === "/healthz") {
      const html = createAppShell({
        title: "Swedish ERP - Field Mobile",
        body: renderMobileChrome({
          surface: "field-mobile",
          headline: "Field-mobile baseline",
          subtitle: "Thumb-friendly surface for work on site."
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

export async function startFieldMobileServer({ port = Number(process.env.PORT || 3002), logger = console.log } = {}) {
  const server = createFieldMobileServer();
  await new Promise((resolve) => {
    server.listen(port, resolve);
  });
  logger(`field-mobile listening on http://localhost:${port}`);
  return {
    port,
    server,
    stop: () => stopServer(server)
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = await startFieldMobileServer();
  process.on("SIGINT", async () => {
    await runtime.stop();
    process.exit(0);
  });
}
