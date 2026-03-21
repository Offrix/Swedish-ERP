import http from "node:http";
import { isMainModule, stopServer } from "../../../scripts/lib/repo.mjs";

export function createApiServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/" || url.pathname === "/healthz" || url.pathname === "/readyz") {
      const payload =
        url.pathname === "/"
          ? {
              service: "api",
              status: "ok",
              routes: ["/healthz", "/readyz"]
            }
          : { status: "ok" };

      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(`${JSON.stringify(payload, null, 2)}\n`);
      return;
    }

    res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    res.end(`${JSON.stringify({ error: "not_found" }, null, 2)}\n`);
  });
}

export async function startApiServer({ port = Number(process.env.PORT || 3000), logger = console.log } = {}) {
  const server = createApiServer();
  await new Promise((resolve) => {
    server.listen(port, resolve);
  });
  logger(`api listening on http://localhost:${port}`);
  return {
    port,
    server,
    stop: () => stopServer(server)
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = await startApiServer();
  process.on("SIGINT", async () => {
    await runtime.stop();
    process.exit(0);
  });
}
