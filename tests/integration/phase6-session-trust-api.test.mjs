import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import {
  DEMO_APPROVER_EMAIL,
  DEMO_IDS,
  createOrgAuthPlatform
} from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

test("Phase 6.2 API exposes challenge center and device trust lifecycle", async () => {
  const platform = createOrgAuthPlatform({
    clock: () => new Date("2026-03-27T13:00:00Z"),
    bootstrapScenarioCode: "test_default_demo"
  });
  const server = createApiServer({
    platform,
    flags: {
      phase1AuthOnboardingEnabled: true
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const login = await requestJson(`${baseUrl}/v1/auth/login`, {
      method: "POST",
      body: {
        companyId: DEMO_IDS.companyId,
        email: DEMO_APPROVER_EMAIL
      }
    });
    const afterTotp = await requestJson(`${baseUrl}/v1/auth/mfa/totp/verify`, {
      method: "POST",
      token: login.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_APPROVER_EMAIL
        }),
        deviceFingerprint: "device:totp:approver-api"
      }
    });
    assert.equal(afterTotp.session.status, "active");

    const createdChallenge = await requestJson(`${baseUrl}/v1/auth/challenges`, {
      method: "POST",
      token: login.sessionToken,
      body: {
        factorType: "totp",
        actionClass: "support_case_operate"
      }
    });
    assert.equal(createdChallenge.factorType, "totp");
    assert.equal(createdChallenge.actionClass, "support_case_operate");

    const pendingChallenges = await requestJson(`${baseUrl}/v1/auth/challenges?status=pending`, {
      token: login.sessionToken
    });
    const pendingChallenge = pendingChallenges.items.find((item) => item.challengeId === createdChallenge.challengeId);
    assert.ok(pendingChallenge);
    assert.equal(pendingChallenge.actionClass, "support_case_operate");
    assert.equal(pendingChallenge.trustRequired, "mfa");
    assert.equal(pendingChallenge.completedAt, null);

    const completedChallenge = await requestJson(`${baseUrl}/v1/auth/challenges/${createdChallenge.challengeId}/complete`, {
      method: "POST",
      token: login.sessionToken,
      body: {
        code: platform.getTotpCodeForTesting({
          companyId: DEMO_IDS.companyId,
          email: DEMO_APPROVER_EMAIL
        }),
        deviceFingerprint: "device:totp:approver-api"
      }
    });
    assert.equal(completedChallenge.receipt.actionClass, "support_case_operate");
    assert.equal(typeof completedChallenge.session.freshTrustByActionClass.support_case_operate, "string");

    const allChallenges = await requestJson(`${baseUrl}/v1/auth/challenges`, {
      token: login.sessionToken
    });
    const consumedChallenge = allChallenges.items.find((item) => item.challengeId === createdChallenge.challengeId);
    assert.ok(consumedChallenge);
    assert.equal(consumedChallenge.actionClass, "support_case_operate");
    assert.equal(consumedChallenge.trustRequired, "mfa");
    assert.equal(typeof consumedChallenge.completedAt, "string");

    const devices = await requestJson(`${baseUrl}/v1/auth/devices`, {
      token: login.sessionToken
    });
    assert.equal(devices.items.length >= 1, true);

    const revoked = await requestJson(`${baseUrl}/v1/auth/devices/${devices.items[0].deviceTrustRecordId}/revoke`, {
      method: "POST",
      token: login.sessionToken
    });
    assert.equal(revoked.deviceTrustRecord.status, "revoked");

    const trusted = await requestJson(`${baseUrl}/v1/auth/devices/${devices.items[0].deviceTrustRecordId}/trust`, {
      method: "POST",
      token: login.sessionToken,
      body: {
        trustedUntil: "2026-05-02T00:00:00.000Z"
      }
    });
    assert.equal(trusted.deviceTrustRecord.status, "trusted");
    assert.equal(trusted.deviceTrustRecord.trustedUntil, "2026-05-02T00:00:00.000Z");
  } finally {
    await stopServer(server);
  }
});

async function requestJson(url, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase()) ? crypto.randomUUID() : null;
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus);
  return payload;
}
