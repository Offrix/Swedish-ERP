import { isMainModule } from "../../../scripts/lib/repo.mjs";

export function startWorker({ intervalMs = Number(process.env.WORKER_INTERVAL_MS || 5000), logger = console.log } = {}) {
  logger(`worker started with heartbeat interval ${intervalMs}ms`);

  const timer = setInterval(() => {
    logger(`worker heartbeat ${new Date().toISOString()}`);
  }, intervalMs);

  return {
    intervalMs,
    stop() {
      clearInterval(timer);
      logger("worker stopped");
    }
  };
}

if (isMainModule(import.meta.url)) {
  const runtime = startWorker();
  process.on("SIGINT", () => {
    runtime.stop();
    process.exit(0);
  });
}
