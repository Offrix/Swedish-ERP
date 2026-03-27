import { startApiServer } from "../apps/api/src/server.mjs";
import { startDesktopWebServer } from "../apps/desktop-web/src/server.mjs";
import { startFieldMobileServer } from "../apps/field-mobile/src/server.mjs";
import { startWorker } from "../apps/worker/src/worker.mjs";

const runtimeMode =
  process.env.ERP_RUNTIME_MODE ||
  process.env.RUNTIME_MODE ||
  process.env.APP_RUNTIME_MODE ||
  "test";

const runtimes = await Promise.all([
  startApiServer({
    port: Number(process.env.API_PORT || "4000"),
    runtimeMode,
    enforceExplicitRuntimeMode: true
  }),
  startDesktopWebServer({
    port: Number(process.env.DESKTOP_WEB_PORT || "4001"),
    runtimeMode,
    enforceExplicitRuntimeMode: true
  }),
  startFieldMobileServer({
    port: Number(process.env.FIELD_MOBILE_PORT || "4002"),
    runtimeMode,
    enforceExplicitRuntimeMode: true
  }),
  Promise.resolve(
    startWorker({
      intervalMs: Number(process.env.WORKER_INTERVAL_MS || "1000"),
      runtimeMode,
      enforceExplicitRuntimeMode: true
    })
  )
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
