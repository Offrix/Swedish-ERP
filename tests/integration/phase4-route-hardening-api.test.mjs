import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth } from "../helpers/api-helpers.mjs";

test("Phase 4.4 API requires idempotency keys on business mutations", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T11:00:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    const response = await fetch(`${baseUrl}/v1/trial/environments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        companyId: DEMO_IDS.companyId,
        label: "Idempotency smoke",
        seedScenarioCode: "trial_seed"
      })
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.error, "idempotency_key_required");
  } finally {
    await stopServer(server);
  }
});

test("Phase 4.4 API rejects non-object JSON payloads on business mutations", async () => {
  const platform = createExplicitDemoApiPlatform({
    clock: () => new Date("2026-03-30T11:05:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });
    const response = await fetch(`${baseUrl}/v1/trial/environments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
        "idempotency-key": "phase4-route-hardening-array"
      },
      body: JSON.stringify([])
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.error, "json_body_object_required");
  } finally {
    await stopServer(server);
  }
});
