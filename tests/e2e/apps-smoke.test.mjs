import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../../apps/api/src/server.mjs";
import { startDesktopWebServer } from "../../apps/desktop-web/src/server.mjs";
import { startFieldMobileServer } from "../../apps/field-mobile/src/server.mjs";
import { startWorker } from "../../apps/worker/src/worker.mjs";

test("app baselines expose green health checks and worker heartbeats", async () => {
  const runtimes = [];
  let heartbeatSeen = false;

  try {
    runtimes.push(await startApiServer({ port: 4300, logger: () => {} }));
    runtimes.push(await startDesktopWebServer({ port: 4301, logger: () => {} }));
    runtimes.push(await startFieldMobileServer({ port: 4302, logger: () => {} }));
    runtimes.push(
      startWorker({
        intervalMs: 25,
        logger: (message) => {
          if (message.includes("worker heartbeat")) {
            heartbeatSeen = true;
          }
        }
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(heartbeatSeen, true);

    for (const service of [
      { port: 4300, healthPath: "/healthz", expected: "ok" },
      { port: 4301, healthPath: "/healthz", expected: "Desktop-web" },
      { port: 4302, healthPath: "/healthz", expected: "Field-mobile" }
    ]) {
      const response = await fetch(`http://127.0.0.1:${service.port}${service.healthPath}`);
      const body = await response.text();
      assert.equal(response.status, 200);
      assert.match(body, new RegExp(service.expected));
    }
  } finally {
    for (const runtime of runtimes.reverse()) {
      if (typeof runtime.stop === "function") {
        await runtime.stop();
      }
    }
  }
});
