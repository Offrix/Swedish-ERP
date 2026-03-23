import test from "node:test";
import assert from "node:assert/strict";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createApiPlatform } from "../../apps/api/src/platform.mjs";
import { DEMO_ADMIN_EMAIL, DEMO_IDS } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";
import { loginWithStrongAuth, requestJson } from "../helpers/api-helpers.mjs";

test("Phase 13.3 flow exposes automation routes and keeps human override in control", async () => {
  const platform = createApiPlatform({
    clock: () => new Date("2026-03-22T22:20:00Z")
  });
  const server = createApiServer({ platform });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const root = await requestJson(baseUrl, "/");
    assert.equal(root.routes.includes("/v1/automation/posting-suggestions"), true);
    assert.equal(root.routes.includes("/v1/automation/decisions/:decisionId/override"), true);

    const adminToken = await loginWithStrongAuth({
      baseUrl,
      platform,
      companyId: DEMO_IDS.companyId,
      email: DEMO_ADMIN_EMAIL
    });

    await requestJson(baseUrl, "/v1/automation/rule-packs", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        rulePackId: "phase13-3-e2e-pack",
        domain: "automation",
        jurisdiction: "SE",
        effectiveFrom: "2026-01-01",
        version: "1",
        semanticChangeSummary: "E2E automation pack",
        machineReadableRules: {
          when: [{ field: "documentType", equals: "supplier_invoice" }],
          then: { route: "review_queue" }
        }
      }
    });

    const decision = await requestJson(baseUrl, "/v1/automation/posting-suggestions", {
      method: "POST",
      token: adminToken,
      expectedStatus: 201,
      body: {
        companyId: DEMO_IDS.companyId,
        sourceObjectType: "supplier_invoice",
        sourceObjectId: "phase13-3-e2e-source",
        rulePackId: "phase13-3-e2e-pack",
        evidence: { documentType: "supplier_invoice" }
      }
    });
    assert.equal(decision.outputs.safeToPost, false);
    assert.equal(decision.explanation.length > 0, true);

    const overridden = await requestJson(baseUrl, `/v1/automation/decisions/${decision.decisionId}/override`, {
      method: "POST",
      token: adminToken,
      body: {
        companyId: DEMO_IDS.companyId,
        actorId: DEMO_IDS.userId,
        overrideReasonCode: "human_review_complete"
      }
    });
    assert.equal(overridden.state, "manual_override");

    const listed = await requestJson(baseUrl, `/v1/automation/decisions?companyId=${DEMO_IDS.companyId}`, {
      token: adminToken
    });
    assert.equal(listed.items.some((item) => item.decisionId === decision.decisionId), true);
  } finally {
    await stopServer(server);
  }
});
