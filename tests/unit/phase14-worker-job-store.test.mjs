import test from "node:test";
import assert from "node:assert/strict";
import { resolveWorkerJobStore } from "../../apps/worker/src/worker.mjs";

test("Phase 14 worker resolves memory store without Postgres configuration", () => {
  const messages = [];
  const store = resolveWorkerJobStore({
    env: {
      WORKER_JOB_STORE: "memory"
    },
    logger: (message) => messages.push(message)
  });

  assert.equal(store.kind, "memory");
  assert.equal(messages.includes("worker using in-memory async job store"), true);
});
