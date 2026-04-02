import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createApiServer } from "../../apps/api/src/server.mjs";
import { createExplicitDemoApiPlatform as createApiPlatform } from "../helpers/demo-platform.mjs";
import { DEMO_ADMIN_EMAIL } from "../../packages/domain-org-auth/src/index.mjs";
import { stopServer } from "../../scripts/lib/repo.mjs";

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";

test("Phase 13.5 API governs vertical pack enablement, deprecation and disabled field capture", async () => {
  let now = new Date("2026-04-02T06:00:00Z");
  const platform = createApiPlatform({
    clock: () => now
  });
  const server = createApiServer({
    platform,
    flags: enabledFlags()
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const sessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const root = await requestJson(baseUrl, "/", {
      token: sessionToken
    });
    assert.equal(root.routes.includes("/v1/projects/vertical-pack-governance"), true);

    const project = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-GOV-API-001",
        projectReferenceCode: "project-gov-api-001",
        displayName: "Governed Field Project",
        startsOn: "2026-04-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 150000
      }
    });
    const siblingProject = await requestJson(baseUrl, "/v1/projects", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectCode: "P-GOV-API-002",
        projectReferenceCode: "project-gov-api-002",
        displayName: "Sibling Governed Field Project",
        startsOn: "2026-04-01",
        status: "active",
        billingModelCode: "time_and_material",
        revenueRecognitionModelCode: "billing_equals_revenue",
        contractValueAmount: 80000
      }
    });

    await requestJson(baseUrl, `/v1/projects/${project.projectId}/vertical-pack-links`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        packType: "field",
        verticalRefs: {
          workModelCodes: ["work_order"]
        }
      }
    });

    const governanceDecision = await requestJson(baseUrl, "/v1/projects/vertical-pack-governance", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        packType: "field",
        status: "deprecated",
        effectiveFrom: "2026-04-02",
        sunsetAt: "2026-04-30",
        reasonCode: "pack_deprecated",
        evidenceRefs: ["governance-api-note-001"]
      }
    });
    assert.equal(governanceDecision.status, "deprecated");

    const governanceList = await requestJson(
      baseUrl,
      `/v1/projects/vertical-pack-governance?companyId=${COMPANY_ID}&packType=field`,
      {
        token: sessionToken
      }
    );
    assert.equal(governanceList.items.length, 1);
    assert.equal(governanceList.items[0].projectVerticalPackGovernanceDecisionId, governanceDecision.projectVerticalPackGovernanceDecisionId);

    const blockedLink = await requestJson(baseUrl, `/v1/projects/${siblingProject.projectId}/vertical-pack-links`, {
      method: "POST",
      token: sessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        packType: "field",
        verticalRefs: {
          workModelCodes: ["work_order"]
        }
      }
    });
    assert.equal(blockedLink.error, "project_vertical_pack_not_enabled");

    const activeWorkOrder = await requestJson(baseUrl, "/v1/field/work-orders", {
      method: "POST",
      token: sessionToken,
      expectedStatus: 201,
      body: {
        companyId: COMPANY_ID,
        projectId: project.projectId,
        displayName: "Allowed before sunset",
        description: "Deprecated but still operational",
        serviceTypeCode: "service",
        priorityCode: "high",
        laborRateAmount: 950
      }
    });
    assert.equal(activeWorkOrder.projectId, project.projectId);

    const workspace = await requestJson(
      baseUrl,
      `/v1/projects/${project.projectId}/workspace?companyId=${COMPANY_ID}&cutoffDate=2026-04-02`,
      {
        token: sessionToken
      }
    );
    assert.equal(workspace.warningCodes.includes("vertical_pack_deprecated"), true);
    assert.deepEqual(workspace.verticalPackGovernanceSummary.deprecatedPackTypes, ["field"]);

    now = new Date("2026-05-02T06:00:00Z");
    const sunsetSessionToken = await loginWithRequiredFactors({
      baseUrl,
      platform,
      companyId: COMPANY_ID,
      email: DEMO_ADMIN_EMAIL
    });

    const disabledWorkOrder = await requestJson(baseUrl, "/v1/field/work-orders", {
      method: "POST",
      token: sunsetSessionToken,
      expectedStatus: 409,
      body: {
        companyId: COMPANY_ID,
        projectId: project.projectId,
        displayName: "Blocked after sunset",
        description: "Disabled by sunset",
        serviceTypeCode: "service",
        priorityCode: "normal",
        laborRateAmount: 950
      }
    });
    assert.equal(disabledWorkOrder.error, "field_vertical_pack_disabled");
  } finally {
    await stopServer(server);
  }
});

function enabledFlags() {
  return {
    phase1AuthOnboardingEnabled: true,
    phase2DocumentArchiveEnabled: true,
    phase2CompanyInboxEnabled: true,
    phase2OcrReviewEnabled: true,
    phase3LedgerEnabled: true,
    phase4VatEnabled: true,
    phase5ArEnabled: true,
    phase6ApEnabled: true,
    phase7HrEnabled: true,
    phase7TimeEnabled: true,
    phase7AbsenceEnabled: true,
    phase8PayrollEnabled: true,
    phase9BenefitsEnabled: true,
    phase9TravelEnabled: true,
    phase9PensionEnabled: true,
    phase10ProjectsEnabled: true,
    phase10FieldEnabled: true
  };
}

async function loginWithRequiredFactors({ baseUrl, platform, companyId, email }) {
  const started = await requestJson(baseUrl, "/v1/auth/login", {
    method: "POST",
    body: {
      companyId,
      email
    }
  });
  await requestJson(baseUrl, "/v1/auth/mfa/totp/verify", {
    method: "POST",
    token: started.sessionToken,
    body: {
      code: platform.getTotpCodeForTesting({ companyId, email })
    }
  });
  if (started.session.requiredFactorCount > 1) {
    const bankIdStart = await requestJson(baseUrl, "/v1/auth/bankid/start", {
      method: "POST",
      token: started.sessionToken
    });
    await requestJson(baseUrl, "/v1/auth/bankid/collect", {
      method: "POST",
      token: started.sessionToken,
      body: {
        orderRef: bankIdStart.orderRef,
        completionToken: platform.getBankIdCompletionTokenForTesting(bankIdStart.orderRef)
      }
    });
  }
  return started.sessionToken;
}

async function requestJson(baseUrl, path, { method = "GET", body, token, expectedStatus = 200 } = {}) {
  const mutationIdempotencyKey = ["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())
    ? crypto.randomUUID()
    : null;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(mutationIdempotencyKey ? { "idempotency-key": mutationIdempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  assert.equal(
    response.status,
    expectedStatus,
    `Expected ${expectedStatus} for ${method} ${path}, got ${response.status}: ${JSON.stringify(payload)}`
  );
  return payload;
}
