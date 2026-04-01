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
    const apiRuntime = await startApiServer({ port: 0, logger: () => {}, runtimeMode: "test" });
    const desktopRuntime = await startDesktopWebServer({ port: 0, logger: () => {}, runtimeMode: "test" });
    const fieldRuntime = await startFieldMobileServer({ port: 0, logger: () => {}, runtimeMode: "test" });
    runtimes.push(apiRuntime);
    runtimes.push(desktopRuntime);
    runtimes.push(fieldRuntime);
    runtimes.push(
      await startWorker({
        intervalMs: 25,
        runtimeMode: "test",
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
      { port: apiRuntime.server.address().port, healthPath: "/healthz", expected: "ok" },
      { port: desktopRuntime.server.address().port, healthPath: "/healthz", expected: "Desktop-web" },
      { port: fieldRuntime.server.address().port, healthPath: "/healthz", expected: "Field-mobile" }
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
