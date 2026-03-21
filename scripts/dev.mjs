import { startApiServer } from "../apps/api/src/server.mjs";
import { startDesktopWebServer } from "../apps/desktop-web/src/server.mjs";
import { startFieldMobileServer } from "../apps/field-mobile/src/server.mjs";
import { startWorker } from "../apps/worker/src/worker.mjs";

const runtimes = await Promise.all([
  startApiServer({ port: Number(process.env.API_PORT || "4000") }),
  startDesktopWebServer({ port: Number(process.env.DESKTOP_WEB_PORT || "4001") }),
  startFieldMobileServer({ port: Number(process.env.FIELD_MOBILE_PORT || "4002") }),
  Promise.resolve(startWorker({ intervalMs: Number(process.env.WORKER_INTERVAL_MS || "1000") }))
]);

const shutdown = async () => {
  await Promise.all(
    runtimes.map(async (runtime) => {
      if (typeof runtime.stop === "function") {
        await runtime.stop();
      }
    })
  );
};

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});
